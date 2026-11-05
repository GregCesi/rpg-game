// Planches des maisons de bois du village (chantier « village », hors jeu : rien ici n'entre dans le jeu) :
// npx tsx tools/essai-village-bois.ts écrit
//   .art-preview/village-bois-dehors.png  chaque maison dehors, toit posé, x2, Xéros à côté ; en pointillé or, le cadre du jeu au
//                                         palier 3 (427 × 240 px du monde) centré sur Xéros ; le foyer écrit dessous ;
//   .art-preview/village-bois-dedans.png  chaque intérieur, toit effacé, le mur sud coupé à 70 cm comme le jeu, meubles en place, x2 ;
//   .art-preview/village-bois-pieces.png  chaque pièce nouvelle, toutes ses vues, x4, Xéros à côté, son nom et son gabarit dessous.
// Argument facultatif : dehors, dedans ou pieces (une seule planche) ; puis des clés de maison (h1 h3…) pour n'en rendre que certaines.
// Les dessins sont dans art/proposals/village-maisons-bois*.ts ; le rendu est celui de l'essai de la maison de Xéros
// (art/proposals/maison-xeros.ts `render` : les faces, le contour, l'ombre sous l'avant-toit et l'ombre portée du jeu).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { hash, render, bounds, type Bounds, type Layer } from '../art/proposals/maison-xeros';
import type { Board, Scene } from '../art/lib/volumes';
import { HOUSES, PIECES, SMOKE, axesOrigin, piecePalette, HOUSE_META } from '../art/proposals/village-maisons-bois';
import { PIECE_FORM } from '../art/proposals/village-maisons-bois-pieces';
import type { HouseId } from '../art/proposals/village-types';
import { expectedSize, silhouette } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const GOLD: Rgb = [245, 215, 120];

// ---------- les images du jeu ----------

function frame(name: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-village-bois : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
function image(name: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'image') throw new Error(`essai-village-bois : pas d'image « ${name} »`);
  return { grid: s.grid, pal: s.palette };
}
/** Un personnage, les pieds au milieu en (x, y). */
function who(name: string, x: number, y: number): Board {
  const f = frame(name), s = silhouette(f.grid, f.pal);
  return { grid: f.grid, pal: f.pal, x: Math.round(x - s.x - s.w / 2), y: Math.round(y - (s.y + s.h)), depth: () => y };
}

// ---------- le sol ----------

const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
type Rect = [number, number, number, number];
/** L'herbe, et la terre battue du jeu (`yard`, raccordée à l'herbe par ses bords) dans les rectangles donnés (cases alignées sur 32 px). */
function groundOf(yards: Rect[]): (x: number, y: number) => string {
  const isYard = (cx: number, cy: number) => yards.some((r) => cx * 32 + 16 >= r[0] && cx * 32 + 16 < r[1] && cy * 32 + 16 >= r[2] && cy * 32 + 16 < r[3]);
  return (x, y) => {
    const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
    const lx = ((x % 32) + 32) % 32, ly = ((y % 32) + 32) % 32;
    let t: Grid;
    if (isYard(cx, cy)) {
      const m = (isYard(cx, cy - 1) ? 1 : 0) | (isYard(cx + 1, cy) ? 2 : 0) | (isYard(cx, cy + 1) ? 4 : 0) | (isYard(cx - 1, cy) ? 8 : 0);
      t = worldTiles.tiles[`yard-${m}`];
    } else t = worldTiles.tiles[GRASS[Math.floor(hash(5, cx, cy) * GRASS.length)]];
    return worldTiles.palette[t[ly][lx]];
  };
}
function floorTile(x: number, y: number): string {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  const t = interiorTiles.tiles[FLOOR[Math.floor(hash(6, cx, cy) * FLOOR.length)]];
  return interiorTiles.palette[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
}

// ---------- la fumée : des bouffées translucides, par-dessus (le jeu la fait vivre) ----------

function smokeOver(l: Layer, pts: [number, number][]): void {
  const sm = image('smoke');
  for (const [x0, y0] of pts) for (let k = 0; k < 6; k++) {
    const px = x0 - 4 + k * 2 + (k % 2), py = y0 - 8 - k * 6, a = 0.5 - k * 0.07;
    sm.grid.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      const X = Math.round(px) + i - l.x, Y = Math.round(py) + j - l.y;
      if (X < 0 || Y < 0 || X >= l.w || Y >= l.h) return;
      const c = sm.pal[ch].replace('#', ''), q = (Y * l.w + X) * 4;
      for (let n = 0; n < 3; n++) l.rgba[q + n] = l.rgba[q + n] * (1 - a) + parseInt(c.slice(n * 2, n * 2 + 2), 16) * a;
    }));
  }
}

// ---------- la planche ----------

interface Block { title: string[]; w: number; h: number; draw: (sh: Sheet, x: number, y: number) => void; notes: string[] }

function blitLayer(sheet: Sheet, l: Layer, ox: number, oy: number, k: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    sheet.rect(ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2]]);
  }
}
function sheetOf(rows: Block[][], head: string[]): Sheet {
  const PAD = 16, GAP = 28;
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length * 12 + 8)) + Math.max(...r.map((b) => b.h)) + Math.max(...r.map((b) => b.notes.length * 12)) + 12 + GAP);
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
function write(sheet: Sheet, name: string): void {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-village-bois -> ${out} (${sheet.w} x ${sheet.h})`);
}

// =====================================================================================================================
// Ce que la planche sait de chaque maison (repère de ses axes, px)
// =====================================================================================================================

interface Show {
  title: string; notes: string[];
  /** Xéros dehors, dedans (repère des axes). */
  xeros: [number, number]; inXeros: [number, number];
  /** La rue ou la cour en terre battue (repère des axes, px). */
  yards: Rect[];
}
const SHOW: Record<string, Show> = {
  'h1-couvreur': {
    title: 'H1 LE COUVREUR : LA LONGUE MAISON, FAITAGE NORD-SUD LE LONG DE LA RUE (A L OUEST)',
    notes: ['axes 4,80 x 11,20 m, chaume a 50 deg ; le pignon sud au premier plan, la facade et la porte a l ouest sur la rue', 'le trou de fumee au faite au-dessus du foyer ; l appentis de planches a l est (bottes, echelle)'],
    xeros: [-30, 150], inXeros: [70, 140], yards: [[-100, -20, -60, 300]],
  },
  'h3-vieux': {
    title: 'H3 LES VIEUX : LA CHAUMIERE MINUSCULE, BOIS VIEUX, CHAUX ECAILLEE, CHAUME MOUSSU',
    notes: ['axes 4,80 x 3,20 m, murs de 2,40 m, chaume a 50 deg en 6 m ; le buche ra l ouest, le banc au soleil', 'le trou de fumee du pignon ouest (le foyer contre lui) ; la rue a l est'],
    xeros: [40, 92], inXeros: [70, 40], yards: [[110, 200, -40, 140]],
  },
  'h4-berger': {
    title: 'H4 LE BERGER : LA CABANE DE PLANCHES SOUS SON APPENTIS DE BARDEAUX',
    notes: ['axes 3,20 x 2,40 m sur des des ; mur sud 1,65 m, mur nord 2,75 m, bardeaux a 25 deg', 'le tuyau du poele sort par le mur est ; le parc a claies, la niche'],
    xeros: [20, 76], inXeros: [30, 34], yards: [],
  },
  'h5-journaliers': {
    title: 'H5 LES JOURNALIERS : LA MAISON DOUBLE, TORCHIS BRUT, CHAUME EN UNE COUCHE',
    notes: ['axes 9,60 x 3,20 m, deux logis de 4,80 x 3,20 separes par une cloison pleine ; murs de 2,40 m', 'deux portes, deux fenetres, deux foyers au sol contre la cloison, deux trous de fumee'],
    xeros: [96, 86], inXeros: [40, 40], yards: [[-40, 240, 90, 140]],
  },
  'h6-charpentier': {
    title: 'H6 LE CHARPENTIER : LE PIGNON SUR LA RUE (A L EST), LES CROIX, LA PORTE D ATELIER, LES BARDEAUX',
    notes: ['axes 9,60 x 4,80 m, bardeaux a 45 deg, le toit avance de 80 cm sur la rue ; la cheminee du jeu dans la salle', 'la porte d atelier a deux battants et une croix de saint-andre sur le sud (le cote vu du jeu), une autre au pignon est'],
    xeros: [170, 124], inXeros: [100, 60], yards: [[200, 300, -60, 160], [-40, 300, 110, 150]],
  },
  'h7-laboureur': {
    title: 'H7 LE LABOUREUR : LA LONGERE, LE LOGIS ET L ETABLE SOUS UN TOIT',
    notes: ['axes 16 x 6,40 m, chaume a 45 deg ; l etable en pierre brute jusqu a 1,20 m, le refend de pierre, la cheminee', 'la cour au sud : la porte d etable, le fumier, la charrue sous l avant-toit ; la gerbiere au pignon est'],
    xeros: [140, 160], inXeros: [90, 80], yards: [[-40, 360, 140, 220]],
  },
  'h11-guerisseuse': {
    title: 'H11 LA GUERISSEUSE : LA CHAUMIERE BASSE A CROUPES, SUR PERCHES',
    notes: ['axes 4,80 x 3,20 m, murs de 2 m ; le chaume a quatre pans deborde de 1,20 m et descend a 1,50 m', 'releve en auvent devant la porte et la fenetre ; les herbes qui sechent, le plessis, les ruches'],
    xeros: [70, 100], inXeros: [30, 40], yards: [],
  },
};

const ORIGIN: [number, number] = [0, 0];

function outsideBlock(i: number): Block {
  const h = HOUSES[i], s = SHOW[h.id], k = 2;
  const ax = axesOrigin(h.id, ORIGIN);
  const xx = ax[0] + s.xeros[0], xy = ax[1] + s.xeros[1];
  const sc = h.outside(ORIGIN, 1);
  const scene: Scene = { ...sc, boards: [...sc.boards, who('xeros', xx, xy)] };
  const b = bounds(scene, [24, 24, 24, 24]);
  const fx = Math.round(xx - 213.5), fy = Math.round(xy - 120);
  const bd: Bounds = [Math.min(b[0], fx - 8), Math.min(b[1], fy - 8), Math.max(b[2], fx + 435), Math.max(b[3], fy + 248)];
  const yards = s.yards.map((r) => [r[0] + ax[0], r[1] + ax[0], r[2] + ax[1], r[3] + ax[1]] as Rect);
  const g = groundOf(yards);
  const l = render(scene, bd, { grass: g, floor: g });
  smokeOver(l, SMOKE[h.id]!(ORIGIN));
  const meta = HOUSE_META[h.id as HouseId];
  return {
    title: [s.title, `FOYER : ${meta.foyer} ; PARCELLE ${meta.parcel} ; EMPRISE ${h.size[0] * 5 / 100} X ${h.size[1] * 5 / 100} M`],
    notes: s.notes,
    w: l.w * k, h: l.h * k,
    draw: (sh, x, y) => {
      blitLayer(sh, l, x, y, k);
      const X0 = x + (fx - bd[0]) * k, Y0 = y + (fy - bd[1]) * k, W = 427 * k, H = 240 * k;
      for (let n = 0; n < W; n += 10) { sh.rect(X0 + n, Y0, 5, 2, GOLD); sh.rect(X0 + n, Y0 + H - 2, 5, 2, GOLD); }
      for (let n = 0; n < H; n += 10) { sh.rect(X0, Y0 + n, 2, 5, GOLD); sh.rect(X0 + W - 2, Y0 + n, 2, 5, GOLD); }
      sh.text('CADRE DU JEU', X0 + 6, Y0 + 6, GOLD, T);
    },
  };
}

function insideBlock(i: number): Block {
  const h = HOUSES[i], s = SHOW[h.id], k = 2;
  const ax = axesOrigin(h.id, ORIGIN);
  const sc = h.inside(ORIGIN, 0, 1);
  const scene: Scene = { ...sc, boards: [...sc.boards, who('xeros', ax[0] + s.inXeros[0], ax[1] + s.inXeros[1])] };
  const bd = bounds(scene, [16, 16, 16, 16]);
  const g = groundOf([]);
  const fl = scene.floor;
  const l = render(scene, bd, { grass: g, floor: (x, y) => (fl && x >= fl[0] && x < fl[1] && y >= fl[2] && y < fl[3] ? floorTile(x, y) : g(x, y)) });
  return {
    title: [s.title.split(' : ')[0] + ' : LE DEDANS', `${HOUSE_META[h.id as HouseId].foyer.toUpperCase()}`],
    notes: [], w: l.w * k, h: l.h * k, draw: (sh, x, y) => blitLayer(sh, l, x, y, k),
  };
}

// ---------- les pièces ----------

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const REPORT: string[] = [];
function pieceBlock(p: (typeof PIECES)[number]): Block {
  const K = 4, xg = frame('xeros'), views = p.views(), f = PIECE_FORM[p.key] ?? {};
  const all = [{ g: xg.grid, pal: xg.pal }, ...views.map((v) => ({ g: v.grid, pal: v.pal }))];
  const gap = 6;
  const w = all.reduce((s, it) => s + it.g[0].length * K + gap * K, 0) - gap * K;
  const h = Math.max(...all.map((it) => it.g.length)) * K;
  const notes: string[] = [`${p.dims.w} X ${p.dims.d} X ${p.dims.h} CM ; ${['', 'UNE VUE (RONDE)', 'DEUX VUES (SYMETRIQUE)', '', 'QUATRE VUES R0 A R3'][views.length]}`];
  views.forEach((v, n) => {
    const sil = silhouette(v.grid, piecePalette);
    const odd = n % 2 === 1 && views.length > 1;
    const base = { w: p.dims.w, d: p.dims.d, h: p.dims.h, shape: 'box' as const, ground: f.ground };
    let e = expectedSize(odd && !f.lying ? { ...base, w: p.dims.d, d: p.dims.w } : base);
    if (odd && f.lying) { const e0 = expectedSize(base); e = { w: e0.h, h: e0.w, wMax: e0.hMax, hMax: e0.wMax }; }
    const ok = Math.abs(sil.w - e.w) <= 2 && Math.abs(sil.h - e.h) <= 2;
    const floor = !ok && e.wMax > e.w && sil.w <= e.wMax + 2;
    let verdict = ok ? 'OK' : floor ? 'PLANCHER' : 'HORS TOLERANCE';
    if (!ok && f.gable && odd) verdict = 'DE CHANT : UN TRIANGLE';
    if (!ok && f.pan && n === 2) verdict = 'DE DOS : SA TRANCHE';
    if (!ok && f.pan && odd) verdict = 'DE COTE : LE BISEAU AU FAITE';
    if (!ok && f.whole) verdict = 'TOIT ENTIER';
    if (!ok && verdict === 'HORS TOLERANCE' && f.note && Math.abs(sil.w - e.w) <= 2) verdict = 'FORME (VOIR NOTE)';
    notes.push(`R${n} : ATTENDU ${fmt(e.w)}X${fmt(e.h)}, DESSINE ${sil.w}X${sil.h} ${verdict}`);
    REPORT.push(`${p.key} r${n} : attendu ${fmt(e.w)}x${fmt(e.h)}, dessiné ${sil.w}x${sil.h} ${verdict}`);
  });
  if (f.note) notes.push(`NOTE : ${f.note}`);
  if (f.whole) notes.push('NOTE : un toit entier ; le jeu le voudra en quatre pans (deux trapezes, deux triangles)');
  return {
    title: [`${p.name.toUpperCase()} (${p.key.toUpperCase()})`, `POUR ${p.houses.map((x) => x.split('-')[0].toUpperCase()).join(', ')}`],
    notes, w, h: h + 4,
    draw: (sh, x, y) => {
      let cx = x;
      for (const it of all) { sh.blit(it.g, it.pal, cx, y + h - it.g.length * K, K); cx += it.g[0].length * K + gap * K; }
      sh.rect(x, y + h + 1, w, 1, [110, 104, 90]);
    },
  };
}

// =====================================================================================================================

function rowsOf<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

function main(): void {
  const only = process.argv[2];
  const keys = process.argv.slice(3);
  const idx = HOUSES.map((_, i) => i).filter((i) => !keys.length || keys.some((k) => HOUSES[i].id.startsWith(k + '-')));
  if (!only || only === 'dehors') write(sheetOf(rowsOf(idx.map(outsideBlock), 2), [
    'LES MAISONS DE BOIS DU VILLAGE, DEHORS (ESSAI HORS JEU, ART/PROPOSALS/VILLAGE-MAISONS-BOIS.TS)',
    'x2 ; 5 cm par px, projection du jeu (x, y - z) ; pointille or : le cadre du jeu au palier 3 (427 x 240 px) centre sur xeros',
    'le modele en volumes de la maison de xeros : meme solin, meme ossature, memes remplissages, meme chaume, memes images du jeu',
  ]), 'village-bois-dehors.png');
  if (!only || only === 'dedans') write(sheetOf(rowsOf(idx.map(insideBlock), 3), [
    'LES MAISONS DE BOIS DU VILLAGE, DEDANS (ESSAI HORS JEU)',
    'x2 ; toits effaces, le mur sud et les cloisons est-ouest coupes a 70 cm comme le jeu ; meubles du jeu et pieces nouvelles a leur place',
  ]), 'village-bois-dedans.png');
  if (!only || only === 'pieces') {
    write(sheetOf(rowsOf(PIECES.map(pieceBlock), 3), [
      'LES MAISONS DE BOIS DU VILLAGE : LES PIECES NOUVELLES, X4 (ESSAI HORS JEU)',
      'xeros a gauche (1,60 m) ; vues r0 a r3 selon la symetrie ; gabarit : pieces de batiment W x (H + D), meubles W x (H + D/2), ombre exclue',
      'couchee (echelle) : regle D, la vue nord-sud a les dimensions de l est-ouest inversees',
    ]), 'village-bois-pieces.png');
    for (const l of REPORT) console.log(`  ${l}`);
  }
}
main();
