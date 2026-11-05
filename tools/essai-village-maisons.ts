// Planches finales des maisons du village (chantier « village », hors jeu : rien ici n'entre dans le jeu) :
// npx tsx tools/essai-village-maisons.ts [dehors|dedans|rue|pieces] écrit (sans argument : tout)
//   .art-preview/village-maisons-dehors.png  les onze maisons dehors, toit posé, x2, chacune dans le cadre de la vue de départ du jeu
//                                            (palier 3 : 427 × 240 px du monde, tracé en or), Xéros à côté, le foyer écrit dessous ;
//   .art-preview/village-maisons-dedans.png  les intérieurs, toit effacé, mur sud coupé, meubles en place, x2 ; h8 et h10 : le rez et
//                                            l'étage côte à côte ;
//   .art-preview/village-rue.png             la rue du sud, deuxième tronçon (de la ruelle de l'ouest à celle de l'est, de la ruelle du
//                                            milieu à celle du bord), x2 : les maisons à leur place du plan, en une seule scène ;
//   .art-preview/village-pieces[-1|-2].png   toutes les pièces nouvelles, toutes leurs vues, x4, à côté de Xéros, par famille.
//
// Rien n'est redessiné ici : l'outil MONTE les exports des deux modules (art/proposals/village-maisons-bois.ts,
// art/proposals/village-maisons-pierre.ts), rendus par le `render` de l'essai de la maison de Xéros (art/proposals/maison-xeros.ts),
// qui sait lire les palettes des deux (le module de pierre écrit ses couleurs hors du monde en #rrggbb). Le texte est écrit avec la
// police à accents des aperçus du village (art/proposals/village-plan-font.ts). Ce qui vient des deux outils de contrôle
// (tools/essai-village-bois.ts, tools/essai-village-pierre.ts) : la place de Xéros et des cours de chaque maison.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Grid, Palette } from '../art/lib/canvas';
import type { Board, Scene } from '../art/lib/volumes';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import { bounds, hash, render, type Bounds, type Layer } from '../art/proposals/maison-xeros';
import * as Bois from '../art/proposals/village-maisons-bois';
import * as Pierre from '../art/proposals/village-maisons-pierre';
import { HOUSE_META, type HouseId, type VillageHouse, type VillagePiece } from '../art/proposals/village-types';
import { PARCELS, WAYS, type Rect } from '../art/proposals/village-plan-data';
import { fontWidth, write as writeText, wrap } from '../art/proposals/village-plan-font';
import { blank, rect, toPng, type Img, type RGBA } from './lib/world-render';
import { silhouette } from '../src/content/gabarit';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: RGBA = [58, 52, 44, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const GREY: RGBA = [205, 200, 185, 255];
const GOLD: RGBA = [245, 215, 120, 255];
const DIM: RGBA = [150, 142, 124, 255];
const VIEW_W = 427, VIEW_H = 240;

// =====================================================================================================================
// Les maisons : ce que la planche écrit (le tableau 3.1 du cadrage) et où se tient Xéros
// =====================================================================================================================

const ORDER: HouseId[] = ['h1-couvreur', 'h2-tisserand', 'h3-vieux', 'h4-berger', 'h5-journaliers', 'h6-charpentier', 'h7-laboureur', 'h8-meunier', 'h9-forgeron', 'h10-maquignon', 'h11-guerisseuse'];

/** Le nom court, le rang, la forme ; murs ; couverture (CADRAGE-village.md, tableau de la section 3.1). */
const TABLE: Record<HouseId, { name: string; line: string; floor: string }> = {
  'h1-couvreur': { name: 'Le couvreur', line: 'Longue maison et appentis ; pan de bois, torchis chaulé ; chaume épais, très soigné', floor: '49 m²' },
  'h2-tisserand': { name: 'Le tisserand', line: 'Maison-bloc ; pierre brute à la terre ; bardeaux', floor: '33 m²' },
  'h3-vieux': { name: 'Les vieux', line: 'Chaumière et appentis ; pan de bois vieux, chaux écaillée ; chaume vieux, moussu', floor: '15 m²' },
  'h4-berger': { name: 'Le berger', line: 'Cabane en appentis ; planches debout ; bardeaux, une pente', floor: '8 m²' },
  'h5-journaliers': { name: 'Les journaliers', line: 'Maison double ; pan de bois, torchis brut ; chaume en une couche', floor: '2 x 15 m²' },
  'h6-charpentier': { name: 'Le charpentier', line: 'Pignon sur rue ; pan de bois chaulé, croix de Saint-André ; bardeaux', floor: '46 m²' },
  'h7-laboureur': { name: 'Le laboureur', line: 'Longère (logis et étable) ; torchis chaulé sur solin haut, étable en pierre brute ; chaume', floor: '102 m², dont 51 d’étable' },
  'h8-meunier': { name: 'Le meunier', line: 'Maison-bloc à étage, cour fermée ; moellons enduits, pierre taillée aux angles et aux baies ; laves', floor: '2 x 69 m²' },
  'h9-forgeron': { name: 'Le forgeron', line: 'Maison-bloc ; pierre brute à la chaux ; tuiles plates', floor: '48 m²' },
  'h10-maquignon': { name: 'Le maquignon', line: 'Pignon sur rue à étage en encorbellement ; rez de pierre brute, étage en colombage serré ; tuiles plates', floor: '83 + 97 m²' },
  'h11-guerisseuse': { name: 'La guérisseuse', line: 'Chaumière basse à croupes ; perches et torchis brut ; chaume à quatre pans', floor: '15 m²' },
};

/**
 * Les maisons de bois : Xéros dehors et dedans, les cours en terre battue, dans le repère des axes de chaque maison (repris tels
 * quels de tools/essai-village-bois.ts, `SHOW`). Les maisons de pierre portent les leurs (`HOUSE_NOTES` : Xéros, le centre du cadre).
 */
const BOIS_SHOW: Partial<Record<HouseId, { xeros: [number, number]; inXeros: [number, number]; yards: Rect[] }>> = {
  'h1-couvreur': { xeros: [-30, 150], inXeros: [70, 140], yards: [[-100, -20, -60, 300]] },
  'h3-vieux': { xeros: [40, 92], inXeros: [70, 40], yards: [[110, 200, -40, 140]] },
  'h4-berger': { xeros: [20, 76], inXeros: [30, 34], yards: [] },
  'h5-journaliers': { xeros: [96, 86], inXeros: [40, 40], yards: [[-40, 240, 90, 140]] },
  'h6-charpentier': { xeros: [170, 124], inXeros: [100, 60], yards: [[200, 300, -60, 160], [-40, 300, 110, 150]] },
  'h7-laboureur': { xeros: [140, 160], inXeros: [90, 80], yards: [[-40, 360, 140, 220]] },
  'h11-guerisseuse': { xeros: [70, 100], inXeros: [30, 40], yards: [] },
};

const ALL: VillageHouse[] = [...Bois.HOUSES, ...Pierre.HOUSES];
const houseOf = (id: HouseId): VillageHouse => {
  const h = ALL.find((x) => x.id === id);
  if (!h) throw new Error(`essai-village-maisons : pas de maison « ${id} »`);
  return h;
};
const isBois = (id: HouseId) => HOUSE_META[id].module === 'bois';
const short = (id: HouseId) => id.split('-')[0];

// =====================================================================================================================
// Les images du jeu, le sol
// =====================================================================================================================

const byName = new Map(sources.map((s) => [s.name, s]));
function frameOf(name: string): { grid: Grid; pal: Palette } {
  const s = byName.get(name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-village-maisons : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
function imageOf(name: string): { grid: Grid; pal: Palette } {
  const s = byName.get(name);
  if (!s || s.kind !== 'image') throw new Error(`essai-village-maisons : pas d'image « ${name} »`);
  return { grid: s.grid, pal: s.palette };
}
const XEROS = frameOf('xeros');
const XS = silhouette(XEROS.grid, XEROS.pal);
/** Xéros, les pieds au milieu en (x, y) de la scène. */
function xerosAt(x: number, y: number): Board {
  return { grid: XEROS.grid, pal: XEROS.pal, x: Math.round(x - XS.x - XS.w / 2), y: Math.round(y - (XS.y + XS.h)), depth: () => y };
}

const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tileColor = (t: Grid, pal: Palette, x: number, y: number) => pal[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];

/**
 * Le sol : l'herbe du jeu, la terre battue (`yard`, raccordée à l'herbe par ses bords) sur les cases dont le centre tombe dans une
 * cour ou une voie, et les rangs du potager (`field`) au pixel dans les jardins.
 */
function groundOf(yards: Rect[], gardens: Rect[] = []): (x: number, y: number) => string {
  const isYard = (cx: number, cy: number) => yards.some((r) => cx * 32 + 16 >= r[0] && cx * 32 + 16 < r[2] && cy * 32 + 16 >= r[1] && cy * 32 + 16 < r[3]);
  const cache = new Map<number, Grid>();
  return (x, y) => {
    if (gardens.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3])) {
      const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
      return tileColor(worldTiles.tiles[hash(9, cx, cy) < 0.5 ? 'field' : 'field2'], worldTiles.palette, x, y);
    }
    const cx = Math.floor(x / 32), cy = Math.floor(y / 32), key = cx * 100003 + cy;
    let t = cache.get(key);
    if (!t) {
      if (isYard(cx, cy)) {
        const m = (isYard(cx, cy - 1) ? 1 : 0) | (isYard(cx + 1, cy) ? 2 : 0) | (isYard(cx, cy + 1) ? 4 : 0) | (isYard(cx - 1, cy) ? 8 : 0);
        t = worldTiles.tiles[`yard-${m}`];
      } else t = worldTiles.tiles[GRASS[Math.floor(hash(5, cx, cy) * GRASS.length)]];
      cache.set(key, t);
    }
    return tileColor(t, worldTiles.palette, x, y);
  };
}
function floorTile(x: number, y: number): string {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  return tileColor(interiorTiles.tiles[FLOOR[Math.floor(hash(6, cx, cy) * FLOOR.length)]], interiorTiles.palette, x, y);
}

/** La fumée : des bouffées translucides par-dessus (le jeu la fait vivre), comme tools/essai-village-bois.ts. */
function smokeOver(l: Layer, pts: [number, number][]): void {
  const sm = imageOf('smoke');
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

// =====================================================================================================================
// La planche : des blocs (une image, un titre dessus, des notes dessous) rangés en lignes
// =====================================================================================================================

const S = 2; // la police en x2 : 12 px par lettre, 24 par ligne
const LH = 24;
interface Line { s: string; c: RGBA }
interface Block { title: Line[]; notes: Line[]; w: number; h: number; draw: (img: Img, x: number, y: number) => void }

function blitLayer(img: Img, l: Layer, ox: number, oy: number, k: number): void {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const q = (y * l.w + x) * 4;
    rect(img, ox + x * k, oy + y * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2], 255]);
  }
}
function blitGrid(img: Img, grid: Grid, pal: Palette, ox: number, oy: number, k: number): void {
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    const h = pal[ch].replace('#', '');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    rect(img, ox + x * k, oy + y * k, k, k, [n(0), n(2), n(4), h.length === 8 ? n(6) : 255]);
  }));
}
/** Un cadre en pointillé (or), d'un trait de 2 px. */
function dashed(img: Img, x: number, y: number, w: number, h: number, c: RGBA): void {
  for (let n = 0; n < w; n += 10) { rect(img, x + n, y, Math.min(5, w - n), 2, c); rect(img, x + n, y + h - 2, Math.min(5, w - n), 2, c); }
  for (let n = 0; n < h; n += 10) { rect(img, x, y + n, 2, Math.min(5, h - n), c); rect(img, x + w - 2, y + n, 2, Math.min(5, h - n), c); }
}
/** Les lignes d'un texte coupé à la largeur `w` (px de la planche). */
function lines(s: string, w: number, c: RGBA): Line[] {
  return wrap(s, Math.max(20, Math.floor(w / (6 * S)))).map((x) => ({ s: x, c }));
}

/** Range les blocs en lignes d'au plus `maxW` px, dans l'ordre ; écrit l'en-tête. */
function sheet(blocks: Block[], head: string[], maxW: number): Img {
  const PAD = 24, GAP = 40;
  // la largeur d'un bloc : son image ou son plus long texte
  const bw = (b: Block) => Math.max(b.w, ...[...b.title, ...b.notes].map((l) => fontWidth(l.s, S)));
  const rows: Block[][] = [];
  for (const b of blocks) {
    const r = rows[rows.length - 1];
    if (r && r.reduce((s, x) => s + bw(x) + GAP, 0) + bw(b) <= maxW - 2 * PAD) r.push(b);
    else rows.push([b]);
  }
  const hl = head.flatMap((h, i) => lines(h, maxW - 2 * PAD, i === 0 ? GOLD : GREY));
  const rowH = rows.map((r) => Math.max(...r.map((b) => b.title.length)) * LH + 8 + Math.max(...r.map((b) => b.h)) + 10 + Math.max(...r.map((b) => b.notes.length)) * LH + GAP);
  const W = Math.max(...rows.map((r) => PAD * 2 + r.reduce((s, b) => s + bw(b) + GAP, 0) - GAP), ...hl.map((l) => PAD * 2 + fontWidth(l.s, S)));
  const H = PAD + hl.length * LH + 16 + rowH.reduce((a, b) => a + b, 0);
  const img = blank(W, H, BG);
  hl.forEach((l, i) => writeText(img, l.s, PAD, PAD + i * LH, S, l.c, null));
  let y = PAD + hl.length * LH + 16;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length)) * LH + 8, ih = Math.max(...r.map((b) => b.h));
    for (const b of r) {
      b.title.forEach((l, i) => writeText(img, l.s, x, y + i * LH, S, l.c, null));
      b.draw(img, x, y + th + ih - b.h);
      b.notes.forEach((l, i) => writeText(img, l.s, x, y + th + ih + 10 + i * LH, S, l.c, null));
      x += bw(b) + GAP;
    }
    y += rowH[ri];
  });
  return img;
}

function save(img: Img, name: string): void {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, toPng(img));
  console.log(`essai-village-maisons -> ${out} (${img.w} x ${img.h})`);
}

// =====================================================================================================================
// 1. Dehors
// =====================================================================================================================

const O: [number, number] = [0, 0];

/** La scène de dehors d'une maison posée en O, avec Xéros, le centre du cadre du jeu, les cours, la fumée. */
function outsideScene(id: HouseId): { scene: Scene; frame: [number, number]; yards: Rect[]; smoke: [number, number][] } {
  const h = houseOf(id);
  if (isBois(id)) {
    const s = BOIS_SHOW[id]!, ax = Bois.axesOrigin(id, O);
    const xx = ax[0] + s.xeros[0], xy = ax[1] + s.xeros[1];
    const sc = h.outside(O, 1);
    return {
      scene: { ...sc, boards: [...sc.boards, xerosAt(xx, xy)], floor: undefined },
      frame: [xx, xy],
      yards: s.yards.map((r) => [r[0] + ax[0], r[2] + ax[1], r[1] + ax[0], r[3] + ax[1]] as Rect),
      smoke: Bois.SMOKE[id]?.(O) ?? [],
    };
  }
  const n = Pierre.HOUSE_NOTES[id];
  const sc = h.outside(O, 0);
  const fl = sc.floor;
  return {
    scene: { ...sc, boards: [...sc.boards, xerosAt(n.xeros[0], n.xeros[1])], floor: undefined },
    frame: n.frame,
    yards: fl ? [[fl[0], fl[2], fl[1], fl[3]]] : [],
    smoke: [],
  };
}

function outsideBlock(id: HouseId): Block {
  const K = 2, h = houseOf(id), meta = HOUSE_META[id], t = TABLE[id];
  const { scene, frame, yards, smoke } = outsideScene(id);
  const fx = Math.round(frame[0] - VIEW_W / 2), fy = Math.round(frame[1] - VIEW_H / 2);
  const b = bounds(scene, [12, 12, 12, 12]);
  const bd: Bounds = [Math.min(b[0], fx - 6), Math.min(b[1], fy - 6), Math.max(b[2], fx + VIEW_W + 6), Math.max(b[3], fy + VIEW_H + 6)];
  // la terre battue des cours de pierre (le module la donne au pixel) : au pixel, pas à la case
  const pierreYard = !isBois(id);
  const g = groundOf(pierreYard ? [] : yards);
  const yardPx = (x: number, y: number) => yards.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]);
  const yard15 = worldTiles.tiles['yard-15'];
  const ground = pierreYard ? (x: number, y: number) => (yardPx(x, y) ? tileColor(yard15, worldTiles.palette, x, y) : g(x, y)) : g;
  const l = render(scene, bd, { grass: ground, floor: ground });
  smokeOver(l, smoke);
  const w = l.w * K;
  return {
    title: [{ s: `${short(id).toUpperCase()} - ${t.name}`, c: GOLD }, ...lines(meta.foyer, w, WHITE)],
    notes: [
      ...lines(t.line, w, GREY),
      ...lines(`Au sol ${t.floor} dans œuvre ; emprise ${fmt(h.size[0] * 0.05)} x ${fmt(h.size[1] * 0.05)} m, débords compris ; parcelle ${meta.parcel}`, w, DIM),
    ],
    w, h: l.h * K,
    draw: (img, x, y) => {
      blitLayer(img, l, x, y, K);
      const X0 = x + (fx - bd[0]) * K, Y0 = y + (fy - bd[1]) * K;
      dashed(img, X0, Y0, VIEW_W * K, VIEW_H * K, GOLD);
      writeText(img, 'cadre du jeu', X0 + 8, Y0 + 6, 1, GOLD);
    },
  };
}
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

// =====================================================================================================================
// 2. Dedans
// =====================================================================================================================

function insideLayer(id: HouseId, level: 0 | 1): Layer {
  const h = houseOf(id);
  let sc: Scene;
  if (isBois(id)) {
    const s = BOIS_SHOW[id]!, ax = Bois.axesOrigin(id, O);
    const sc0 = h.inside(O, 0, 1);
    sc = { ...sc0, boards: [...sc0.boards, xerosAt(ax[0] + s.inXeros[0], ax[1] + s.inXeros[1])] };
  } else sc = h.inside(O, level, 0);
  const bd = bounds(sc, [12, 12, 12, 12]);
  const g = groundOf([]), fl = sc.floor;
  return render(sc, bd, { grass: g, floor: (x, y) => (fl && x >= fl[0] && x < fl[1] && y >= fl[2] && y < fl[3] ? floorTile(x, y) : g(x, y)) });
}

function insideBlock(id: HouseId): Block {
  const K = 2, h = houseOf(id), t = TABLE[id];
  const levels: (0 | 1)[] = h.levels === 2 ? [0, 1] : [0];
  const ls = levels.map((lv) => insideLayer(id, lv));
  const GAP = 24;
  // Xéros à côté pour l'échelle, à droite du dernier niveau, debout sur sa ligne de base (les maisons de pierre ne le posent pas dedans)
  const xw = isBois(id) ? 0 : (XS.w + 6) * K;
  const w = ls.reduce((s, l) => s + l.w * K + GAP, 0) - GAP + xw;
  const hh = Math.max(...ls.map((l) => l.h * K));
  const cap = (lv: 0 | 1) => (h.levels === 2 ? (lv ? 'l’étage (le rez omis)' : 'le rez-de-chaussée') : '');
  return {
    title: [{ s: `${short(id).toUpperCase()} - ${t.name} : le dedans`, c: GOLD }, ...lines(HOUSE_META[id].foyer, w, WHITE)],
    notes: [
      ...(h.levels === 2 ? [{ s: `à gauche ${cap(0)}, à droite ${cap(1)}`, c: GREY }] : []),
      ...lines(isBois(id) ? 'Toit effacé, mur sud et cloisons est-ouest coupés à 70 cm comme le jeu' : 'Toit effacé, mur sud coupé comme le jeu ; Xéros à droite pour l’échelle', w, DIM),
    ],
    w, h: hh,
    draw: (img, x, y) => {
      let cx = x;
      for (const l of ls) { blitLayer(img, l, cx, y + hh - l.h * K, K); cx += l.w * K + GAP; }
      if (xw) blitGrid(img, XEROS.grid, XEROS.pal, cx - GAP + 6 * K - XS.x * K, y + hh - (XS.y + XS.h) * K - 12 * K, K);
    },
  };
}

// =====================================================================================================================
// 3. La rue du sud, deuxième tronçon
// =====================================================================================================================

/** Le cadre de la rue (px de la zone village) : de la ruelle de l'ouest à celle de l'est, de la ruelle du milieu à celle du bord. */
const STREET: Rect = [2624, 3392, 4000, 4000];
const parcel = (id: string) => {
  const p = PARCELS.find((x) => x.id === id);
  if (!p) throw new Error(`essai-village-maisons : pas de parcelle « ${id} »`);
  return p;
};
const rectOf = (id: string): Rect => {
  const s = parcel(id).shape;
  if (!('rect' in s)) throw new Error(`essai-village-maisons : la parcelle « ${id} » n'est pas un rectangle`);
  return s.rect;
};

function streetImage(): { img: Img; notes: string[] } {
  const K = 2, notes: string[] = [];
  const scenes: Scene[] = [], yards: Rect[] = [], smoke: [number, number][] = [];
  for (const p of PARCELS.filter((q) => q.zone === 'village' && q.house)) {
    const r = rectOf(p.id);
    if (r[0] < STREET[0] || r[2] > STREET[2] || r[1] < STREET[1] || r[3] > STREET[3]) continue;
    const id = p.house as HouseId, h = houseOf(id);
    // l'emprise de tous ses bâtiments (le couvreur a son appentis en second bâtiment) : la maison centrée dessus
    const bs = p.buildings ?? [r];
    const u: Rect = [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
    const o: [number, number] = [Math.round((u[0] + u[2]) / 2 - h.size[0] / 2), Math.round((u[1] + u[3]) / 2 - h.size[1] / 2)];
    const sc = h.outside(o, 1);
    if (!isBois(id) && sc.floor) yards.push([sc.floor[0], sc.floor[2], sc.floor[1], sc.floor[3]]);
    scenes.push({ ...sc, floor: undefined });
    if (isBois(id)) smoke.push(...(Bois.SMOKE[id]?.(o) ?? []));
    notes.push(`${short(id)} (${p.id}) : emprise du plan ${u[0]}-${u[2]} x ${u[1]}-${u[3]}, scène ${o[0]}-${o[0] + h.size[0]} x ${o[1]}-${o[1] + h.size[1]}`);
  }
  // trois Xéros : dans la rue devant le tisserand, devant les vieux, et dans la ruelle du milieu
  const people: Board[] = [xerosAt(3300, 3640), xerosAt(3330, 3884), xerosAt(2960, 3436)];
  const scene: Scene = { quads: scenes.flatMap((s) => s.quads), boards: [...scenes.flatMap((s) => s.boards), ...people] };
  const b = bounds(scene, [0, 0, 0, 0]);
  const bd: Bounds = [STREET[0], Math.min(STREET[1], b[1] - 8), STREET[2], STREET[3]];
  const ways = WAYS.filter((w) => w.zone === 'village').map((w) => w.rect);
  // les jardins en lanières : un potager par maison de l'ouest, des rangs de terre, un liseré d'herbe entre eux
  const gj = rectOf('s2-jardins');
  const gardens: Rect[] = ['s2-o1', 's2-o2', 's2-o3'].map((id) => { const r = rectOf(id); return [gj[0] + 24, r[1] + 16, gj[2] - 16, r[3] - 16]; });
  const g = groundOf(ways, gardens);
  const yard15 = worldTiles.tiles['yard-15'];
  const ground = (x: number, y: number) => (yards.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]) ? tileColor(yard15, worldTiles.palette, x, y) : g(x, y));
  const l = render(scene, bd, { grass: ground, floor: ground });
  smokeOver(l, smoke);

  // la planche : un titre, l'image x2, les noms au sol
  const PAD = 24, HEAD = 4 * LH + 16, FOOT = 3 * LH + 16;
  const img = blank(l.w * K + PAD * 2, l.h * K + PAD * 2 + HEAD + FOOT, BG);
  const X = (x: number) => PAD + (x - bd[0]) * K, Y = (y: number) => PAD + HEAD + (y - bd[1]) * K;
  writeText(img, 'La rue du sud, deuxième tronçon : le charpentier, le tisserand, les vieux à l’ouest, le couvreur à l’est', PAD, PAD, S, GOLD, null);
  writeText(img, 'x2 ; zone village, x 2624-4000, y 3392-4000 (69 x 30 m), de la ruelle de l’ouest à celle de l’est, de la ruelle du milieu à celle du bord', PAD, PAD + LH, S, GREY, null);
  writeText(img, 'Chaque maison centrée sur l’emprise de ses bâtiments du plan (art/proposals/village-plan-data.ts), toutes rendues en une seule scène', PAD, PAD + 2 * LH, S, GREY, null);
  writeText(img, 'La rue et les ruelles en terre battue (la tuile yard du jeu), les potagers en lanières à l’ouest, l’herbe ailleurs ; trois Xéros pour l’échelle', PAD, PAD + 3 * LH, S, GREY, null);
  blitLayer(img, l, PAD, PAD + HEAD, K);

  // le tonnelier : sa parcelle laissée vide, un contour léger
  const tn = rectOf('s2-e2');
  dashed(img, X(tn[0]) + 6, Y(tn[1]) + 6, (tn[2] - tn[0]) * K - 12, (tn[3] - tn[1]) * K - 12, [235, 225, 190, 255]);
  const label = (s: string, x: number, y: number, sc: number, c: RGBA, center = true) =>
    writeText(img, s, Math.round(center ? x - fontWidth(s, sc) / 2 : x), Math.round(y), sc, c);
  const tc = [(tn[0] + tn[2]) / 2, (tn[1] + tn[3]) / 2];
  label('Le tonnelier', X(tc[0]), Y(tc[1]) - 30, 2, WHITE);
  label('(pas encore de maison)', X(tc[0]), Y(tc[1]) + 2, 1, GREY);
  label('le tonnelier, sa femme', X(tc[0]), Y(tc[1]) + 18, 1, GREY);
  label('et leur fils', X(tc[0]), Y(tc[1]) + 32, 1, GREY);

  // les noms des foyers au sol devant chaque parcelle : dans la rue pour ceux de l'ouest, au sud de la maison pour le couvreur
  const front: Record<string, [number, number]> = { 's2-o1': [3312, 3520], 's2-o2': [3312, 3676], 's2-o3': [3312, 3800] };
  for (const [pid, [x, y]] of Object.entries(front)) {
    const id = parcel(pid).house as HouseId;
    label(TABLE[id].name, X(x), Y(y), 2, WHITE);
    wrap(HOUSE_META[id].foyer, 30).forEach((s, i) => label(s, X(x), Y(y) + 26 + i * 13, 1, GREY));
  }
  label(TABLE['h1-couvreur'].name, X(3477), Y(3800), 2, WHITE);
  wrap(HOUSE_META['h1-couvreur'].foyer, 40).forEach((s, i) => label(s, X(3477), Y(3800) + 26 + i * 13, 1, GREY));
  label('jardins', X(2784), Y(3460), 1, GREY);

  // les noms des voies
  label('rue du sud', X(3312), Y(3960), 1, GOLD);
  label('ruelle du milieu', X(3150), Y(3418), 1, GOLD);
  label('ruelle du bord', X(3150), Y(3962), 1, GOLD);
  label('ruelle', X(2656), Y(3700), 1, GOLD);
  label('de l’ouest', X(2656), Y(3714), 1, GOLD);
  label('ruelle', X(3968), Y(3700), 1, GOLD);
  label('de l’est', X(3968), Y(3714), 1, GOLD);

  const fy = PAD + HEAD + l.h * K + 12;
  writeText(img, 'Ce qui n’est pas posé : les cours de terre battue devant les portes (les parcelles de l’ouest n’en ont pas la place entre deux maisons),', PAD, fy, S, DIM, null);
  writeText(img, 'les clôtures, les arbres gardés des jardins (le plan les garde : à poser à l’intégration). Le tonnelier n’a pas de maison dessinée.', PAD, fy + LH, S, DIM, null);
  return { img, notes };
}

// =====================================================================================================================
// 4. Les pièces
// =====================================================================================================================

/** Les noms des pièces de bois, avec leurs accents (le module les écrit pour la police sans accents des planches de contrôle). */
const NAMES: Record<string, string> = {
  'thatch-smoke-hole': 'Chaume percé d’un trou de fumée (une travée)', 'thatch-bundle-stack': 'Bottes de chaume rangées',
  ladder: 'Échelle du couvreur (couchée)', 'lime-panel-flaking': 'Remplissage chaulé écaillé', 'small-table': 'Petite table',
  'board-wall-low': 'Pan de bardage bas', 'shingle-shed-roof-low': 'Appentis de bardeaux bas (25°)', 'daub-gable': 'Pignon en torchis brut (3,20 m)',
  'lime-cross-panel': 'Remplissage chaulé à croix de Saint-André', 'lime-gable-cross': 'Pignon chaulé à croix (4,80 m)',
  'twin-plank-door': 'Porte d’atelier à deux battants', manger: 'Mangeoire et râtelier', 'stable-door': 'Porte d’étable coupée en deux',
  'lime-gable-loft': 'Pignon chaulé à gerbière (6,40 m)', 'thatch-hip-roof': 'Chaume à croupes (quatre pans)', 'pole-post': 'Perche debout (poteau rond)',
  'pot-hook': 'Crémaillère sur trépied', 'herb-shelf': 'Étagère à pots', 'herb-bundles': 'Bouquets d’herbes pendus',
  plessis: 'Plessis (clôture tressée)',
};
const FAMILIES: { name: string; keys: string[] }[] = [
  { name: 'Toits, souches, appentis', keys: ['thatch-smoke-hole', 'thatch-roof-mossy', 'thatch-hip-roof', 'shingle-shed-roof-low', 'lean-to-stable', 'gable-chimney', 'weathervane'] },
  { name: 'Murs, pignons, remplissages, charpente', keys: ['lime-panel-flaking', 'lime-cross-panel', 'close-stud-panel', 'board-wall-low', 'daub-gable', 'lime-gable-cross', 'lime-gable-loft', 'rendered-wall', 'courtyard-wall', 'plank-partition', 'pole-post', 'jetty-joist', 'wooden-stair'] },
  { name: 'Portes et baies', keys: ['twin-plank-door', 'stable-door', 'strap-door', 'porch-gate', 'oiled-cloth-window', 'window-grille'] },
  { name: 'Meubles et outils du dedans', keys: ['cradle', 'small-table', 'chair', 'iron-bound-chest', 'spinning-wheel', 'loom', 'yarn-winder', 'herb-shelf', 'herb-bundles', 'pot-hook', 'cauldron', 'mortar', 'sawhorse', 'manger', 'horse-stall'] },
  { name: 'Dehors', keys: ['thatch-bundle-stack', 'ladder', 'plough', 'dung-heap', 'hurdle', 'dog-kennel', 'plessis', 'skep', 'water-trough', 'tether-ring', 'boot-scraper'] },
];

function pieceBlock(p: VillagePiece): Block {
  const K = 4, GAP = 6, views = p.views();
  const H = Math.max(XS.y + XS.h, ...views.map((v) => v.grid.length));
  const W = views.reduce((a, v) => a + v.grid[0].length + GAP, 0) + XS.w;
  const w = W * K, tw = Math.max(w, 480);
  const nv = views.length, sym = ['', 'une vue (ronde)', 'deux vues (symétrique)', '', 'quatre vues, R0 à R3'][nv] ?? `${nv} vues`;
  return {
    title: [...lines(NAMES[p.key] ?? p.name, tw, GOLD), { s: p.key, c: DIM }],
    notes: [
      ...lines(`${p.dims.w} x ${p.dims.d} x ${p.dims.h} cm ; ${sym}`, tw, WHITE),
      ...lines(`Pour ${p.houses.map((h) => `${short(h)} (${TABLE[h].name.toLowerCase()})`).join(', ')}`, tw, GREY),
      ...lines(views.map((v, r) => `R${r} ${v.grid[0].length}x${v.grid.length} px`).join(', '), tw, DIM),
    ],
    w: tw, h: H * K + 4,
    draw: (img, x, y) => {
      let cx = x;
      for (const v of views) { blitGrid(img, v.grid, v.pal, cx, y + (H - v.grid.length) * K, K); cx += (v.grid[0].length + GAP) * K; }
      blitGrid(img, XEROS.grid, XEROS.pal, cx - XS.x * K, y + (H - (XS.y + XS.h)) * K, K);
      rect(img, x, y + H * K + 2, w, 2, [110, 104, 90, 255]);
    },
  };
}

/** Un bandeau de famille : un bloc sans image, de toute la largeur. */
function banner(s: string, w: number): Block {
  return { title: [], notes: [], w, h: LH + 12, draw: (img, x, y) => { writeText(img, s, x, y, 3, GOLD, null); rect(img, x, y + LH + 14, w, 2, GOLD); } };
}

function piecesSheets(): void {
  const all = [...Bois.PIECES, ...Pierre.PIECES];
  const known = new Set(FAMILIES.flatMap((f) => f.keys));
  const lost = all.filter((p) => !known.has(p.key)).map((p) => p.key);
  const fams = lost.length ? [...FAMILIES, { name: 'Autres', keys: lost }] : FAMILIES;
  const MAX = 2600, PAD = 24;
  const groups = fams.map((f) => ({ name: f.name, blocks: f.keys.map((k) => all.find((p) => p.key === k)).filter((p): p is VillagePiece => !!p).map(pieceBlock) }));
  const head = (n?: string) => [
    `Les maisons du village : les pièces nouvelles, x4${n ? ` (${n})` : ''} (essai hors jeu)`,
    'Toutes leurs vues R0 à R3 selon leur symétrie, Xéros à droite (1,60 m) ; le nom, les dimensions (est-ouest x nord-sud x hauteur) et les maisons qui s’en servent dessous ; le gabarit de chaque vue est vérifié sur les planches de contrôle des deux modules (village-bois-pieces.png, village-pierre-pieces.png)',
  ];
  const blocksOf = (gs: typeof groups) => gs.flatMap((g) => [banner(g.name, MAX - 2 * PAD), ...g.blocks]);
  const one = sheet(blocksOf(groups), head(), MAX);
  if (one.h <= 8000) { save(one, 'village-pieces.png'); return; }
  // trop haute : deux fichiers, coupés entre deux familles au plus près de la moitié
  let best = 1, bestD = Infinity;
  for (let k = 1; k < groups.length; k++) {
    const a = sheet(blocksOf(groups.slice(0, k)), head(), MAX).h, b = sheet(blocksOf(groups.slice(k)), head(), MAX).h;
    if (Math.max(a, b) < bestD) { bestD = Math.max(a, b); best = k; }
  }
  save(sheet(blocksOf(groups.slice(0, best)), head('1 sur 2'), MAX), 'village-pieces-1.png');
  save(sheet(blocksOf(groups.slice(best)), head('2 sur 2'), MAX), 'village-pieces-2.png');
}

// =====================================================================================================================

function main(): void {
  const only = process.argv[2];
  if (!only || only === 'dehors') save(sheet(ORDER.map(outsideBlock), [
    'Les maisons du village, dehors : les onze maisons d’habitation (essai hors jeu)',
    'x2 ; 5 cm par px, projection du jeu (x, y - z) ; en pointillé or, la vue de départ du jeu au palier 3 (427 x 240 px du monde, 21,35 x 12 m) ; Xéros à côté pour l’échelle ; une maison plus haute que le cadre se montre entière',
  ], 2600), 'village-maisons-dehors.png');
  if (!only || only === 'dedans') save(sheet(ORDER.map(insideBlock), [
    'Les maisons du village, dedans (essai hors jeu)',
    'x2 ; toits effacés, mur sud coupé comme le jeu, meubles du jeu et pièces nouvelles à leur place ; le meunier et le maquignon : le rez et l’étage côte à côte',
  ], 2600), 'village-maisons-dedans.png');
  if (!only || only === 'rue') {
    const r = streetImage();
    save(r.img, 'village-rue.png');
    for (const n of r.notes) console.log(`  ${n}`);
  }
  if (!only || only === 'pieces') piecesSheets();
}
main();
