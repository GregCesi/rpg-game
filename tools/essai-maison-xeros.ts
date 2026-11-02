// Essai de la maison de Xéros refaite à la vraie taille (une chaumière bâtie comme la grange) : npx tsx tools/essai-maison-xeros.ts
// écrit .art-preview/essai-maison-xeros.png. Hors jeu : rien ici n'entre dans le jeu, les dessins sont dans
// art/proposals/maison-xeros.ts (le modèle en volumes, ses matières, son rendu dans la projection du jeu).
//
// La planche, x3 :
//   1. une travée de 1,60 m dans ses quatre étapes : palançons, clayonnage, torchis, chaux (la première maison, validée) ;
//   2. le toit dans ses étapes, sur les murs finis : chevrons, lattes, une couche de chaume, chaume plein, faîtage de terre (idem) ;
//   puis la maison agrandie (PLAN_LONG, 12,80 × 6,40 m entre axes, demande de Grégoire du 2 novembre) :
//   3. le plan vu de dessus, coté en mètres : poteaux, cloisons, portes, fenêtres, meubles, pièces ;
//   4. la façade sud finie à 45° (proposée) et à 50° (pour comparer), Xéros et la mère devant ; la vue de l'ouest (x2) ;
//   5. l'intérieur vu du dessus, sans toit, le mur sud et la cloison est-ouest coupés à 70 cm : les pièces, le foyer, les meubles.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { stonePalette } from '../art/items/stones';
import { gameImage } from '../art/lib/walls';
import {
  BENCH, FIRE, LONG_FURNISH, LONG_HEARTH, PAL, PALLET_NS, PLAN_LONG, ashes, bayScene, bounds, doorsOf, hash, houseScene, placed, render,
  type Board, type Bounds, type HouseOpts, type Layer, type Plan, type Scene,
} from '../art/proposals/maison-xeros';
import { silhouette } from '../src/content/gabarit';
import { PNG } from 'pngjs';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 3;
const T = 2;
const BG: Rgb = [58, 52, 44];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const GOLD: Rgb = [245, 215, 120];

// ---------- les images du jeu ----------

function img(name: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'image') throw new Error(`essai-maison-xeros : pas d'image « ${name} »`);
  return { grid: s.grid, pal: s.palette };
}
function frame(name: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-maison-xeros : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
const hexOf = (pal: Palette, k: string) => pal[k];
const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tiles = {
  grass: (x: number, y: number) => {
    const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
    const t = worldTiles.tiles[GRASS[Math.floor(hash(5, cx, cy) * GRASS.length)]];
    return hexOf(worldTiles.palette, t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]);
  },
  floor: (x: number, y: number) => {
    const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
    const t = interiorTiles.tiles[FLOOR[Math.floor(hash(6, cx, cy) * FLOOR.length)]];
    return hexOf(interiorTiles.palette, t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]);
  },
};

/** Un objet posé au sol : sa silhouette (ombre exclue) calée à gauche sur x, son bas sur le bord sud y. */
function at(o: { grid: Grid; pal: Palette }, x: number, y: number): Board {
  const s = silhouette(o.grid, o.pal);
  return { grid: o.grid, pal: o.pal, x: Math.round(x - s.x), y: Math.round(y - (s.y + s.h)), depth: () => y };
}
/** Un personnage, les pieds au milieu en (x, y). */
function who(name: string, x: number, y: number): Board {
  const f = frame(name), s = silhouette(f.grid, f.pal);
  return { grid: f.grid, pal: f.pal, x: Math.round(x - s.x - s.w / 2), y: Math.round(y - (s.y + s.h)), depth: () => y };
}

// ---------- la fumée : des bouffées translucides, par-dessus (le jeu la fait vivre) ----------

interface Puff { x: number; y: number; a: number }
function overlay(l: Layer, puffs: Puff[]): void {
  const sm = img('smoke');
  for (const p of puffs) sm.grid.forEach((row, j) => [...row].forEach((k, i) => {
    if (k === '.') return;
    const X = Math.round(p.x) + i - l.x, Y = Math.round(p.y) + j - l.y;
    if (X < 0 || Y < 0 || X >= l.w || Y >= l.h) return;
    const c = sm.pal[k].replace('#', ''), q = (Y * l.w + X) * 4;
    for (let n = 0; n < 3; n++) l.rgba[q + n] = l.rgba[q + n] * (1 - p.a) + parseInt(c.slice(n * 2, n * 2 + 2), 16) * p.a;
  }));
}
/** La fumée qui sort du trou du pignon ouest (en (x, y) à l'écran) et monte en dérivant ; un voile plus léger au-dessus du faîte. */
function smoke(x: number, y: number, dir: 1 | -1, ridge?: [number, number, number]): Puff[] {
  const out: Puff[] = [];
  for (let k = 0; k < 7; k++) out.push({ x: x + dir * (k * 2.2 + (k % 2)) - 3, y: y - k * 6, a: 0.55 - k * 0.06 });
  if (ridge) for (let k = 0; k < 4; k++) out.push({ x: ridge[0] + k * ((ridge[1] - ridge[0]) / 4) + 6, y: ridge[2] - 6 - (k % 2) * 3, a: 0.16 });
  return out;
}

// ---------- la planche ----------

interface Block { title: string[]; w: number; h: number; draw: (sh: Sheet, x: number, y: number) => void; notes: string[] }
/** Un rendu, agrandi k fois, comme bloc. */
const lay = (l: Layer, k = K) => ({ w: l.w * k, h: l.h * k, draw: (sh: Sheet, x: number, y: number) => blit(sh, l, x, y, k) });

function shot(sc: Scene, m: [number, number, number, number], bd?: Bounds): Layer {
  return render(sc, bd ?? bounds(sc, m), tiles);
}

function blit(sheet: Sheet, l: Layer, ox: number, oy: number, k = K): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    sheet.rect(ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2]]);
  }
}

function sheetOf(rows: Block[][], head: string[]): Sheet {
  const PAD = 16, GAP = 28;
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length * 12 + 8 + b.h + b.notes.length * 12 + 12)) + GAP);
  const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map((r) => r.reduce((s, b) => s + bw(b) + GAP, 0)));
  const height = PAD + head.length * 12 + 12 + rowH.reduce((a, b) => a + b, 0);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));
  let y = PAD + head.length * 12 + 12;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length * 12 + 8)), ih = Math.max(...r.map((b) => b.h));
    for (const b of r) {
      b.title.forEach((l, i) => sheet.text(l, x, y + i * 12, i === 0 ? GOLD : WHITE, T));
      b.draw(sheet, x, y + th + ih - b.h);
      b.notes.forEach((l, i) => sheet.text(l, x, y + th + ih + 6 + i * 12, i === 0 ? WHITE : GREY, T));
      x += bw(b) + GAP;
    }
    y += rowH[ri];
  });
  return sheet;
}

// ---------- 1. la travée ----------

const BAY_NAMES = ['', '1. PALANCONS', '2. CLAYONNAGE', '3. TORCHIS', '4. CHAUX'];
const BAY_NOTES = [
  '',
  'BATONS FENDUS TOUS LES 30 CM, DANS',
  'BAGUETTES DE NOISETIER TRESSEES',
  'TERRE ET PAILLE PLAQUEES DES DEUX',
  'BADIGEON BLANC CASSE SUR LE TORCHIS,',
];
const BAY_NOTES2 = ['', 'LES ENCOCHES DES DEUX TRAVERSES', 'DEVANT, DERRIERE LES PALANCONS', 'COTES, A FLEUR DU BOIS', 'LE BOIS APPARENT, TERRE AU PIED'];
function bays(): Block[] {
  const out: Block[] = [];
  for (const st of [1, 2, 3, 4] as const) {
    const sc = bayScene(st);
    if (st === 4) sc.boards.push(who('xeros', 44, 104));
    const l = shot(sc, [6, 6, st === 4 ? 20 : 6, 6], st === 4 ? undefined : undefined);
    out.push({ title: [BAY_NAMES[st], 'TRAVEE DE 1,60 M'], ...lay(l), notes: [BAY_NOTES[st], BAY_NOTES2[st]] });
  }
  return out;
}

// ---------- 2. le toit ----------

const ROOF_NAMES = ['', 'A. CHEVRONS', 'B. LATTES', 'C. UNE COUCHE DE CHAUME', 'D. CHAUME PLEIN', 'E. FAITAGE DE TERRE'];
const ROOF_NOTES = [
  '',
  'PERCHES DE 10 CM, TOUS LES 40, CROISEES AU FAITE',
  'FENDUES, TOUS LES 30 CM LE LONG DE LA PENTE',
  'SEIGLE POSE DE BAS EN HAUT, RANG PAR RANG',
  '40 CM DE PAILLE, EGOUT COUPE D APLOMB',
  'TERRE SUR LE FAITE, L HERBE Y PREND',
];

const ext = (o: HouseOpts) => houseScene(o, img);
/** Le cadre commun des vues de la maison (le même pour les étapes et le toit effacé). */
function houseBounds(rot: HouseOpts['rot'], m: [number, number, number, number]): Bounds {
  return bounds(ext({ rot, wall: 4, roof: 5 }), m);
}

function roofs(): Block[] {
  const bd = houseBounds(0, [8, 8, 8, 8]);
  return ([1, 2, 3, 4, 5] as const).map((r) => ({
    title: [ROOF_NAMES[r], 'PENTE 50 DEGRES'],
    ...lay(shot(ext({ rot: 0, wall: 4, roof: r }), [0, 0, 0, 0], bd)),
    notes: [ROOF_NOTES[r]],
  }));
}

// ---------- 3. la maison agrandie : le plan coté ----------

const PLC = {
  bg: [234, 226, 206] as Rgb, floor: [214, 198, 168] as Rgb, solin: [178, 172, 158] as Rgb, solinEdge: [128, 120, 106] as Rgb,
  lime: [250, 246, 236] as Rgb, timber: [118, 90, 62] as Rgb, post: [74, 54, 38] as Rgb, win: [146, 178, 192] as Rgb,
  furn: [222, 204, 168] as Rgb, furnEdge: [118, 90, 62] as Rgb, text: [62, 48, 36] as Rgb, cote: [158, 64, 44] as Rgb,
  ash: [150, 144, 136] as Rgb, fire: [214, 120, 52] as Rgb, stone: [120, 114, 104] as Rgb,
};

/** Le plan vu de dessus, coté en mètres : solin, ossature, cloisons, portes (et leur battement), fenêtres, meubles, pièces. */
function planBlock(plan: Plan): Block {
  const S = 4, M = 96, L = plan.L, D = plan.D;
  const W = M + (L + 10) * S + 60, H = M + (D + 10) * S + 56;
  const fmt = (px: number) => (px * 5 / 100).toFixed(2).replace('.', ',');
  const draw = (sh: Sheet, ox: number, oy: number) => {
    const X = (x: number) => ox + M + Math.round((x + 5) * S), Y = (y: number) => oy + M + Math.round((y + 5) * S);
    const box = (x0: number, y0: number, x1: number, y1: number, c: Rgb) => sh.rect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0), c);
    const frame = (x0: number, y0: number, x1: number, y1: number, c: Rgb) => sh.outline(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0), c);
    const label = (t: string, x: number, y: number, c = PLC.text, k = 2) => sh.text(t, Math.round(x - textWidth(t, k) / 2), Math.round(y - 2.5 * k), c, k);
    sh.rect(ox, oy, W, H, PLC.bg);
    // le solin (tour et cloisons), le sol de terre battue
    box(-5, -5, L + 5, D + 5, PLC.solin); frame(-5, -5, L + 5, D + 5, PLC.solinEdge);
    box(5, 5, L - 5, D - 5, PLC.floor);
    const parts = plan.walls.filter((w) => !w.side);
    for (const w of parts) {
      const a0 = w.posts[0] + 5, a1 = w.posts[w.posts.length - 1] - 5;
      if (w.ew) box(a0, w.c - 5, a1, w.c + 5, PLC.solin); else box(w.c - 5, a0, w.c + 5, a1, PLC.solin);
    }
    const doors = doorsOf(plan);
    for (const d of doors) {
      const c = d.entry ? PLC.solinEdge : PLC.floor;
      if (d.w.ew) box(d.m - d.half, d.w.c - 5, d.m + d.half, d.w.c + 5, c); else box(d.w.c - 5, d.m - d.half, d.w.c + 5, d.m + d.half, c);
    }
    // les murs : le pan chaulé entre deux traits de bois (traverse et sablière), les poteaux
    for (const w of plan.walls) {
      const a0 = w.posts[0] - 2, a1 = w.posts[w.posts.length - 1] + 2;
      const band = (b0: number, b1: number, c: Rgb) => (w.ew ? box(b0, w.c - 2, b1, w.c + 2, c) : box(w.c - 2, b0, w.c + 2, b1, c));
      band(a0, a1, PLC.timber);
      band(a0 + 0.5, a1 - 0.5, PLC.timber);
      if (w.ew) box(a0, w.c - 1.25, a1, w.c + 1.25, PLC.lime); else box(w.c - 1.25, a0, w.c + 1.25, a1, PLC.lime);
      w.bays.forEach((b, k) => {
        const m = (w.posts[k] + w.posts[k + 1]) / 2;
        if (b === 'window') band(m - 5, m + 5, PLC.win);
        if (b === 'door' || b === 'inner-door') {
          const h = (b === 'door' ? plan.doorW : plan.innerDoorW) / 2;
          band(m - h, m + h, PLC.floor);
          // le battant ouvert d'un quart, vers le dedans de la pièce qu'il ferme, et son arc
          const dir = b === 'door' ? -w.out : w.c < L / 2 ? -1 : 1, r = 2 * h;
          for (let q = 0; q <= 60; q++) {
            const t = (q / 60) * Math.PI / 2;
            const [px, py] = w.ew ? [m - h + r * Math.cos(t), w.c + dir * r * Math.sin(t)] : [w.c + dir * r * Math.sin(t), m - h + r * Math.cos(t)];
            sh.rect(X(px), Y(py), 2, 2, PLC.timber);
          }
          if (w.ew) box(m - h, Math.min(w.c, w.c + dir * r), m - h + 1, Math.max(w.c, w.c + dir * r), PLC.timber);
          else box(Math.min(w.c, w.c + dir * r), m - h, Math.max(w.c, w.c + dir * r), m - h + 1, PLC.timber);
          const tx = w.ew ? X(m) : X(w.c + (w.c < L / 2 ? -1 : 1) * 0) , ty = w.ew ? Y(w.c + (b === 'door' ? 9 : 0)) : Y(m);
          label(fmt(2 * h), tx + (w.ew ? 0 : (w.c < L / 2 ? -26 : 26)), ty + (w.ew ? 0 : 0), PLC.cote);
        }
      });
      w.posts.forEach((p) => (w.ew ? box(p - 2, w.c - 2, p + 2, w.c + 2, PLC.post) : box(w.c - 2, p - 2, w.c + 2, p + 2, PLC.post)));
    }
    // les meubles
    for (const f of LONG_FURNISH.filter((f) => f.plan !== false)) {
      const [x0, y0, x1, y1] = f.at;
      box(x0, y0, x1, y1, PLC.furn); frame(x0, y0, x1, y1, PLC.furnEdge);
      const k = textWidth(f.label, 2) < (x1 - x0) * S - 4 ? 2 : 1;
      label(f.label, (X(x0) + X(x1)) / 2, (Y(y0) + Y(y1)) / 2, PLC.text, k);
    }
    frame(223, 8, 251, 32, PLC.furnEdge);
    label('OUTILS', X(237), Y(27), PLC.text, 2); label('CORDE', X(237), Y(31) + 2, PLC.text, 1);
    // le foyer
    const [hx, hy, hr] = LONG_HEARTH;
    for (let j = -hr; j <= hr; j += 0.25) for (let i = -hr; i <= hr; i += 0.25) {
      const d = Math.hypot(i, j);
      if (d <= hr) sh.rect(X(hx + i), Y(hy + j), 1, 1, d > hr - 2 ? PLC.stone : d < 3 ? PLC.fire : PLC.ash);
    }
    label('FOYER 1 M', X(hx), Y(hy + hr + 4), PLC.text);
    // les pièces
    label('CHAMBRE', X(48), Y(23)); label('DE LA MERE', X(48), Y(27)); label('3,20 X 3,20', X(48), Y(33), PLC.cote);
    label('COIN', X(42), Y(94)); label('DE XEROS', X(42), Y(98)); label('3,20 X 3,20', X(42), Y(104), PLC.cote);
    label('SALLE COMMUNE', X(128), Y(96)); label('6,40 X 6,40', X(128), Y(102), PLC.cote);
    label('RESERVE', X(222), Y(52)); label('3,20 X 6,40', X(222), Y(58), PLC.cote);
    // les cotes : les travées le long du mur nord et du mur ouest, puis le tout entre axes, puis l'emprise du solin
    const top = Y(-5) - 18, left = X(-5) - 18;
    const xs = plan.walls.find((w) => w.side === 'N')!.posts, ys = plan.walls.find((w) => w.side === 'W')!.posts;
    sh.rect(X(0), top, X(L) - X(0), 1, PLC.cote);
    xs.forEach((x, i) => { sh.rect(X(x), top - 4, 1, 9, PLC.cote); if (i) label(fmt(x - xs[i - 1]), (X(x) + X(xs[i - 1])) / 2, top - 9, PLC.cote); });
    sh.rect(X(0), top - 30, X(L) - X(0), 1, PLC.cote); sh.rect(X(0), top - 34, 1, 9, PLC.cote); sh.rect(X(L), top - 34, 1, 9, PLC.cote);
    label(`${fmt(L)} ENTRE AXES`, (X(0) + X(L)) / 2, top - 39, PLC.cote);
    sh.rect(left, Y(0), 1, Y(D) - Y(0), PLC.cote);
    ys.forEach((y, i) => { sh.rect(left - 4, Y(y), 9, 1, PLC.cote); if (i) label(fmt(y - ys[i - 1]), left - 22, (Y(y) + Y(ys[i - 1])) / 2, PLC.cote); });
    sh.rect(left - 40, Y(0), 1, Y(D) - Y(0), PLC.cote); sh.rect(left - 44, Y(0), 9, 1, PLC.cote); sh.rect(left - 44, Y(D), 9, 1, PLC.cote);
    label(fmt(D), left - 58, (Y(0) + Y(D)) / 2, PLC.cote);
    sh.rect(X(-5), Y(D + 5) + 30, X(L + 5) - X(-5), 1, PLC.cote);
    sh.rect(X(-5), Y(D + 5) + 26, 1, 9, PLC.cote); sh.rect(X(L + 5), Y(D + 5) + 26, 1, 9, PLC.cote);
    label(`EMPRISE DU SOLIN ${fmt(L + 10)} X ${fmt(D + 10)}`, (X(-5) + X(L + 5)) / 2, Y(D + 5) + 40, PLC.cote);
    // le nord
    const nx = X(L + 5) + 30, ny = Y(-5) - 10;
    sh.rect(nx, ny, 2, 24, PLC.text); for (let k = 0; k < 6; k++) sh.rect(nx - k, ny + k, 2 + 2 * k, 1, PLC.text);
    label('N', nx + 1, ny - 10);
  };
  return {
    title: ['LE PLAN : 12,80 X 6,40 M ENTRE LES AXES DES POTEAUX (8 TRAVEES DE 1,60 SUR 4)', 'COTES EN METRES ; CLOISONS EN PAN DE BOIS SUR LA MEME GRILLE'],
    w: W, h: H, draw,
    notes: ['FENETRES 0,50 X 0,40, APPUI A 0,80 ; PORTE D ENTREE 0,90 X 1,80, PORTES INTERIEURES 0,80 X 1,80',
      'SOLS LIBRES ENTRE SOLINS : CHAMBRE ET COIN 2,70 X 2,70, SALLE 5,90 X 5,90, RESERVE 2,70 X 5,90',
      'TABLE CONTRE LE SOLIN NORD (Y 30-120), BANC DESSOUS : 1,15 M DE PASSAGE JUSQU AU FOYER'],
  };
}

// ---------- 4. la maison agrandie : les façades ----------

const LONG = (o: Omit<HouseOpts, 'plan'>) => ext({ ...o, plan: PLAN_LONG });

function facades(): Block[][] {
  const P = PLAN_LONG, H2 = P.D / 2;
  const view = (pitch: number) => {
    const sc = LONG({ rot: 0, wall: 4, roof: 5, pitch });
    sc.boards.push(who('mother', 92, P.D + 20), who('xeros', 130, P.D + 16));
    const l = shot(sc, [24, 24, 34, 14]);
    const ridgeY = H2 - (52 + H2 * Math.tan((pitch * Math.PI) / 180) + 16);
    overlay(l, smoke(-14, ridgeY + 22, -1, [0, P.L, ridgeY - 4]));
    return l;
  };
  const s45 = view(45), s50 = view(50);
  const w = LONG({ rot: 1, wall: 4, roof: 5 });
  w.boards.push(who('mother', 40, P.D / 2 + 2 + P.L / 2 + 22), who('xeros', 100, P.D / 2 + 2 + P.L / 2 + 16));
  const wl = shot(w, [20, 16, 26, 12]);
  const hz = Math.round(52 + H2 - 13.2);
  overlay(wl, smoke(P.L / 2 + 2, P.D / 2 + 2 + P.L / 2 - hz - 4, 1));
  const z45 = (52 + H2 + 15.6) * 5 / 100, z50 = (52 + H2 * Math.tan((50 * Math.PI) / 180) + 15.6) * 5 / 100;
  const m = (v: number) => v.toFixed(2).replace('.', ',');
  return [[
    { title: ['SUD, PENTE 45 DEGRES (PROPOSEE)', `FAITE DU CHAUME A ${m(z45)} M`], ...lay(s45),
      notes: [`IMAGE ${s45.w}X${s45.h} PX`, 'TROIS FENETRES AU SUD, LA PORTE D ENTREE AU MILIEU', 'APPUI A 0,80 : LES FENETRES SOUS L EGOUT'] },
    { title: ['SUD, PENTE 50 DEGRES (POUR COMPARER)', `FAITE DU CHAUME A ${m(z50)} M`], ...lay(s50),
      notes: [`IMAGE ${s50.w}X${s50.h} PX`, 'LE TOIT PESE SUR LES MURS'] },
  ], [
    { title: ['OUEST, PENTE 45 DEGRES (X2)', 'LE PIGNON, SON TROU DE FUMEE'], ...lay(wl, 2),
      notes: [`IMAGE ${wl.w}X${wl.h} PX`, 'LE TOIT FUIT VERS L EST SUR 13 M (VUE DE COTE)'] },
  ]];
}

// ---------- 5. la maison agrandie : l'intérieur ----------

function interior(): Block[] {
  const sc = LONG({ rot: 0, wall: 4, roof: 0, cut: true });
  const B = sc.boards;
  // le foyer au milieu de la salle : les cendres, un cercle de pierres brutes du jeu (Ø 1 m), le feu
  const [hx, hy] = LONG_HEARTH;
  B.push(placed(ashes(7), PAL, hx - 7, hy + 7, 0, hy - 10));
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.2, name = ['small-rough-stone-ground', 'rough-stone-ground', 'small-rough-stone-ground-b', 'rough-stone-ground-b'][k % 4];
    const g = gameImage(name), cx = hx + Math.cos(a) * 8.2, cy = hy + Math.sin(a) * 8.2;
    B.push(at({ grid: g, pal: stonePalette }, cx - g[0].length / 2 + 0.5, cy + 3));
  }
  B.push(placed(FIRE, PAL, hx - 6, hy + 3, 0, hy + 2));
  // les meubles et les objets du jeu à leur place
  const tablePal = { ...PAL, ...img('table').pal };
  for (const f of LONG_FURNISH) {
    const o = f.image === 'PALLET_NS' ? { grid: PALLET_NS, pal: PAL } : f.image === 'BENCH' ? { grid: BENCH, pal: tablePal } : img(f.image);
    B.push(at(o, f.at[0], f.at[3]));
  }
  // la mère assise sur le banc, tournée vers le foyer ; Xéros dans la salle
  B.push(who('mother', 158, 37), who('xeros', 112, 92));
  const l = shot(sc, [10, 10, 10, 10]);
  return [{
    title: ['L INTERIEUR, SANS TOIT, LE MUR SUD ET LA CLOISON EST-OUEST COUPES A 70 CM', 'LES QUATRE PIECES, LE FOYER, LES MEUBLES ET LES OUTILS DU JEU'],
    ...lay(l),
    notes: [`IMAGE ${l.w}X${l.h} PX`, 'CHAMBRE (NORD-OUEST) : LIT, COFFRE ; COIN DE XEROS (SUD-OUEST) : PAILLASSE',
      'SALLE : FOYER, FAGOT, TABLE, BANC (NOUVEAU) ; RESERVE (EST) : BILLOT, OUTILS, CORDE, BUCHES, SACS, JARRE, SEAU',
      'LA MERE EST DEBOUT (PAS D IMAGE ASSISE) : SA PLACE EST SUR LE BANC'],
  }];
}

function main() {
  const head = [
    'ESSAI : LA MAISON DE XEROS, CHAUMIERE EN PAN DE BOIS (X3, 5 CM PAR PIXEL, PROJECTION DU JEU : (X, Y - Z))',
    'SOLIN DE PIERRES BRUTES 40 CM, TRAVERSE BASSE, POTEAUX TOUS LES 1,60 M, SABLIERES ; TORCHIS CHAULE ; CHAUME DE SEIGLE A 50 DEGRES',
  ];
  const rows = [bays(), roofs(), [planBlock(PLAN_LONG)], ...facades(), interior()];
  const out = join(ROOT, '.art-preview', 'essai-maison-xeros.png');
  mkdirSync(dirname(out), { recursive: true });
  const sheet = sheetOf(rows, head);
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-maison-xeros -> ${out} (${sheet.w} x ${sheet.h})`);
}

main();
