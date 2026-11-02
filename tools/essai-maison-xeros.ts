// Essai de la maison de Xéros refaite à la vraie taille (une chaumière bâtie comme la grange) : npx tsx tools/essai-maison-xeros.ts
// écrit .art-preview/essai-maison-xeros.png. Hors jeu : rien ici n'entre dans le jeu, les dessins sont dans
// art/proposals/maison-xeros.ts (le modèle en volumes, ses matières, son rendu dans la projection du jeu).
//
// La planche, x3, en quatre rangées :
//   1. une travée de 1,60 m dans ses quatre étapes : palançons, clayonnage, torchis, chaux ;
//   2. le toit dans ses étapes, sur les murs finis : chevrons, lattes, une couche de chaume, chaume plein, faîtage de terre ;
//   3. la maison finie : le sud (porte, fenêtre au volet ouvert), le même toit effacé (comme en jeu quand Xéros passe dessous),
//      le nord (fenêtre au volet fermé), l'ouest (le pignon, son trou de fumée) ; Xéros et la mère devant ;
//   4. l'intérieur vu du dessus, sans toit, le mur sud coupé à 70 cm : le foyer et son feu, la terre battue, les meubles du jeu.

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
  FIRE, PAL, PALLET_NS, TABLE_NS, ashes, bayScene, bounds, fadeRoof, hash, houseScene, placed, render,
  type Board, type Bounds, type HouseOpts, type Layer, type Scene,
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

interface Block { title: string[]; layer: Layer; notes: string[] }

function shot(sc: Scene, m: [number, number, number, number], bd?: Bounds): Layer {
  return render(sc, bd ?? bounds(sc, m), tiles);
}

function blit(sheet: Sheet, l: Layer, ox: number, oy: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    sheet.rect(ox + x * K, oy + y * K, K, K, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2]]);
  }
}

function sheetOf(rows: Block[][], head: string[]): Sheet {
  const PAD = 16, GAP = 28;
  const bw = (b: Block) => Math.max(b.layer.w * K, ...[...b.title, ...b.notes].map((l) => textWidth(l, T)));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length * 12 + 8 + b.layer.h * K + b.notes.length * 12 + 12)) + GAP);
  const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map((r) => r.reduce((s, b) => s + bw(b) + GAP, 0)));
  const height = PAD + head.length * 12 + 12 + rowH.reduce((a, b) => a + b, 0);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));
  let y = PAD + head.length * 12 + 12;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length * 12 + 8)), ih = Math.max(...r.map((b) => b.layer.h * K));
    for (const b of r) {
      b.title.forEach((l, i) => sheet.text(l, x, y + i * 12, i === 0 ? GOLD : WHITE, T));
      blit(sheet, b.layer, x, y + th + ih - b.layer.h * K);
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
    out.push({ title: [BAY_NAMES[st], 'TRAVEE DE 1,60 M'], layer: l, notes: [BAY_NOTES[st], BAY_NOTES2[st]] });
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
    layer: shot(ext({ rot: 0, wall: 4, roof: r }), [0, 0, 0, 0], bd),
    notes: [ROOF_NOTES[r]],
  }));
}

// ---------- 3. la maison finie ----------

function finished(): Block[] {
  const S = { rot: 0, wall: 4, roof: 5 } as const;
  const bd = houseBounds(0, [24, 24, 30, 14]);
  const people = () => [who('mother', 22, 117), who('xeros', 72, 112)];
  const south = ext(S); south.boards.push(...people());
  const southL = shot(south, [0, 0, 0, 0], bd);
  overlay(southL, smoke(-14, -66, -1, [0, 128, -86]));
  const bare = ext({ ...S, roof: 0 }); bare.boards.push(...people());
  const faded = fadeRoof(southL, shot(bare, [0, 0, 0, 0], bd));

  const bdN = houseBounds(2, [24, 24, 30, 14]);
  const north = ext({ ...S, rot: 2 }); north.boards.push(who('xeros', 104, 114));
  const northL = shot(north, [0, 0, 0, 0], bdN);
  overlay(northL, smoke(138, -66, 1, [0, 128, -86]));

  const west = ext({ ...S, rot: 1 }); west.boards.push(who('mother', 30, 136), who('xeros', 92, 132));
  const westL = shot(west, [20, 16, 26, 12]);
  overlay(westL, smoke(60, -2, 1));

  return [
    { title: ['SUD : LA PORTE, LA FENETRE (VOLET OUVERT)', 'EMPRISE 6,90 X 5,30 M, FAITE A 6,30 M'], layer: southL,
      notes: [`IMAGE ${southL.w}X${southL.h} PX`, 'L AVANT-TOIT CACHE LE MUR AU-DESSUS DE 1,40 M', 'LA FUMEE SORT DU PIGNON OUEST'] },
    { title: ['SUD, TOIT EFFACE (XEROS DESSOUS)', 'COMME LE JEU : LE TOIT A 35 %'], layer: faded,
      notes: ['PORTE 0,90 X 1,80 M, FENETRE 0,50 X 0,40', 'APPUI A 1 M, SEUIL DE CALCAIRE'] },
    { title: ['NORD : LA FENETRE (VOLET FERME)', 'LE VERSANT NORD'], layer: northL, notes: [`IMAGE ${northL.w}X${northL.h} PX`] },
    { title: ['OUEST : LE PIGNON (PROPOSITION)', 'TORCHIS CHAULE, TROU DE FUMEE'], layer: westL,
      notes: [`IMAGE ${westL.w}X${westL.h} PX`, 'LE TOIT FUIT VERS L EST (VUE DE COTE)', 'TROU TRIANGULAIRE DE 50 X 40 CM, RIVE DE 20 CM'] },
  ];
}

// ---------- 4. l'intérieur ----------

function interior(): Block[] {
  const sc = ext({ rot: 0, wall: 4, roof: 0, cut: true });
  const B = sc.boards;
  // le foyer au milieu (320, 240 cm) : les cendres, un cercle de pierres brutes du jeu (Ø 1 m), le feu
  const ash = ashes(7);
  B.push(placed(ash, PAL, 57, 55, 0, 38));
  const ring: Board[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.2, name = ['small-rough-stone-ground', 'rough-stone-ground', 'small-rough-stone-ground-b', 'rough-stone-ground-b'][k % 4];
    const g = gameImage(name), cx = 64 + Math.cos(a) * 8.2, cy = 48 + Math.sin(a) * 8.2;
    ring.push(at({ grid: g, pal: stonePalette }, cx - g[0].length / 2 + 0.5, cy + 3));
  }
  B.push(...ring, placed(FIRE, PAL, 58, 51, 0, 50));
  // les meubles du jeu à leur place (cm / 5)
  B.push(at(img('bed'), 93, 45)); // lit de la mère, angle nord-est
  B.push(at(img('chest'), 85, 56)); // le coffre à son pied
  B.push(at({ grid: PALLET_NS, pal: PAL }, 5, 45)); // paillasse de Xéros, nord-sud, le long du mur ouest
  B.push(at({ grid: TABLE_NS, pal: { ...PAL, ...img('table').pal } }, 105, 91)); // table nord-sud, mur est, au sud
  B.push(at(img('stool'), 97, 66), at(img('stool'), 97, 82));
  B.push(at(img('sack'), 5, 64), at(img('jar'), 6, 81)); // contre le mur ouest, au sud
  B.push(at(img('bucket'), 28, 91)); // le seau près de la porte
  B.push(at(img('faggot'), 27, 53)); // la place du fagot, à l'ouest du foyer
  B.push(who('mother', 92, 84), who('xeros', 44, 74));
  const l = shot(sc, [10, 10, 10, 10]);
  return [{
    title: ['L INTERIEUR, SANS TOIT, LE MUR SUD COUPE A 70 CM', '6,20 X 4,60 M ENTRE LES MURS (28 M2), SOL DE TERRE BATTUE'],
    layer: l,
    notes: [`IMAGE ${l.w}X${l.h} PX`, 'FOYER AU MILIEU (PIERRES EN CERCLE, 1 M), LE FAGOT A SA PLACE',
      'LIT ET COFFRE AU NORD-EST, PAILLASSE A L OUEST, TABLE A L EST',
      'PAILLASSE ET TABLE NORD-SUD : VUES PROPOSEES ICI (ELLES MANQUENT AU JEU)'],
  }];
}

function main() {
  const head = [
    'ESSAI : LA MAISON DE XEROS, CHAUMIERE EN PAN DE BOIS (X3, 5 CM PAR PIXEL, PROJECTION DU JEU : (X, Y - Z))',
    'SOLIN DE PIERRES BRUTES 40 CM, TRAVERSE BASSE, POTEAUX TOUS LES 1,60 M, SABLIERES ; TORCHIS CHAULE ; CHAUME DE SEIGLE A 50 DEGRES',
  ];
  const rows = [bays(), roofs(), finished(), interior()];
  const out = join(ROOT, '.art-preview', 'essai-maison-xeros.png');
  mkdirSync(dirname(out), { recursive: true });
  const sheet = sheetOf(rows, head);
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-maison-xeros -> ${out} (${sheet.w} x ${sheet.h})`);
}

main();
