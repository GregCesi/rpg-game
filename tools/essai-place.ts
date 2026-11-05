// Planches finales de la place du village (chantier « village », CADRAGE-village.md section 13 ; hors jeu : rien ici n'entre dans le
// jeu) : npx tsx tools/essai-place.ts [ensemble|dehors|dedans|pieces] écrit (sans argument : tout)
//   .art-preview/place-ensemble.png           toute la place à la vraie échelle (x1), comme le jeu la montre : le sol de village.tmj, les
//                                             ruelles nouvelles du plan en terre battue, les sept bâtiments des deux modules dans une
//                                             seule scène à leur place, les arbres et buissons de la carte qui restent, quelques Xéros ;
//                                             dessous, quatre vues de départ du jeu (palier 3 : 427 × 240 px du monde) agrandies x2 ;
//   .art-preview/place-batiments-dehors.png   chaque bâtiment (et le panneau) dehors, x2, Xéros à côté, titre, qui y vit, matières ;
//   .art-preview/place-batiments-dedans.png   les intérieurs, toit effacé, x2 ; la mercière et la tailleuse : le rez et l'étage ;
//   .art-preview/place-pieces.png             toutes les pièces nouvelles des deux modules, toutes leurs vues, x4, par famille
//                                             (coupée en place-pieces-1.png et -2.png au-delà de 8 000 px de haut).
//
// Rien n'est redessiné ici : l'outil MONTE les exports des deux modules (art/proposals/place-nord.ts, art/proposals/place-sud.ts et
// place-sud-pieces.ts), rendus par le `render` de l'essai de la maison de Xéros (art/proposals/maison-xeros.ts). Ce qui vient des deux
// outils de contrôle (tools/essai-place-nord.ts, tools/essai-place-sud.ts) : la place de Xéros, les cours, les notes, le gabarit.
// Le sol de la carte est lu dans src/generated/maps (village.tmj traduit), ses objets (arbres, buissons) aussi, leurs images dans
// src/generated (posées coin bas gauche, comme le jeu et tools/lib/world-render.ts).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import type { Board, Scene } from '../art/lib/volumes';
import { sources } from '../art/index';
import worldTiles from '../art/world/tiles';
import { interiorTiles } from '../art/interior/house';
import registry from '../art/tile-registry.json';
import { bounds, hash, render, type Bounds, type Layer } from '../art/proposals/maison-xeros';
import * as Nord from '../art/proposals/place-nord';
import * as Sud from '../art/proposals/place-sud';
import { PIECES as SUD_PIECES, PIECE_MODELS, PIECE_USERS } from '../art/proposals/place-sud-pieces';
import { PLACE_META, type PlaceBuilding, type PlaceBuildingId, type VillagePiece } from '../art/proposals/place-types';
import { PARCELS, WAYS, type Rect } from '../art/proposals/village-plan-data';
import { fontWidth, write as writeText, wrap } from '../art/proposals/village-plan-font';
import { blank, rect, toPng, type Img, type RGBA } from './lib/world-render';
import { expectedSize, silhouette, TOLERANCE } from '../src/content/gabarit';
import { maps } from '../src/generated/maps';
import propsJson from '../src/content/props.json';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: RGBA = [58, 52, 44, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const GREY: RGBA = [205, 200, 185, 255];
const GOLD: RGBA = [245, 215, 120, 255];
const DIM: RGBA = [150, 142, 124, 255];
const RED: RGBA = [230, 120, 100, 255];
const GREEN: RGBA = [150, 210, 130, 255];
const VIEW_W = 427, VIEW_H = 240;

// =====================================================================================================================
// Les bâtiments des deux modules
// =====================================================================================================================

const ALL: PlaceBuilding[] = [...Nord.BUILDINGS, ...Sud.BUILDINGS];
const ORDER: PlaceBuildingId[] = ['p-ferme-riche', 'p-bucheron', 'p-menuisier', 'p-panneau', 'p-ferme-rivale', 'p-merciere', 'p-tailleuse'];
const of = (id: PlaceBuildingId): PlaceBuilding => {
  const b = ALL.find((x) => x.id === id);
  if (!b) throw new Error(`essai-place : pas de bâtiment « ${id} »`);
  return b;
};
const isNord = (id: PlaceBuildingId) => PLACE_META[id].module === 'nord';
const add2 = (p: [number, number], at: [number, number]): [number, number] => [p[0] + at[0], p[1] + at[1]];
const shift = (r: Rect, at: [number, number]): Rect => [r[0] + at[0], r[1] + at[1], r[2] + at[0], r[3] + at[1]];

/** Les matières et la couverture des bâtiments du nord (reprises de tools/essai-place-nord.ts) ; le sud porte les siennes (NOTES). */
const NORD_NOTES: Partial<Record<PlaceBuildingId, string>> = {
  'p-ferme-riche': 'Boutique de pierre enduite, angles et baies de pierre de taille, laves, vitrail ; étal sous l’auvent de toile rayée guède et garance ; réserve au fond',
  'p-bucheron': 'Magasin de poteaux et de bardage, ouvert au sud, bardeaux ; appentis des fagots ; chantier de vente : les tas du jeu, le comptoir sur billots',
  'p-menuisier': 'Pan de bois vieux, chaux écaillée, bardeaux troués, volets cloués, enseigne tombée et potence vide, herbe haute',
  'p-panneau': 'Deux poteaux, le tableau de planches, un toit de bardeaux, les feuillets ; la pierre au pied pour monter lire',
};

/** Xéros dedans, quand le module le pose dehors (la ferme du riche : dans la rue, à 2142) : dans la boutique, devant le comptoir. */
const IN_XEROS: Partial<Record<PlaceBuildingId, [number, number]>> = { 'p-ferme-riche': [2830, 2014] };

/** Ce que chaque bâtiment montre : Xéros dehors et dedans (px de la zone), ses cours (px de la zone, au pixel ou à la case). */
interface Show { xeros: [number, number][]; in0?: [number, number]; in1?: [number, number]; tileYards: Rect[]; pixelYards: Rect[]; lines: string[]; inside: string[] }
function showOf(id: PlaceBuildingId): Show {
  const b = of(id);
  if (isNord(id)) {
    const s = Nord.SHOW[id]!;
    return { xeros: [s.xeros], in0: IN_XEROS[id] ?? s.inXeros, tileYards: s.yards, pixelYards: [], lines: [NORD_NOTES[id] ?? ''], inside: [] };
  }
  const n = Sud.NOTES[id]!;
  return {
    xeros: n.xeros.map((p) => add2(p, b.at)),
    in0: n.inXeros0 ? add2(n.inXeros0, b.at) : undefined,
    in1: n.inXeros1 ? add2(n.inXeros1, b.at) : undefined,
    tileYards: [],
    pixelYards: n.yards.map((r) => shift(r, b.at)),
    lines: n.lines,
    inside: n.inside,
  };
}
const SHOWS = new Map(ORDER.map((id) => [id, showOf(id)]));

// =====================================================================================================================
// Les images du jeu
// =====================================================================================================================

const byName = new Map(sources.map((s) => [s.name, s]));
function frameOf(name: string): { grid: Grid; pal: Palette } {
  const s = byName.get(name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-place : pas de planche « ${name} »`);
  return { grid: s.animations['idle-down'].frames[0], pal: s.palette };
}
const XEROS = frameOf('xeros');
const XS = silhouette(XEROS.grid, XEROS.pal);
/** Xéros, les pieds au milieu en (x, y) de la scène ; `lift` : relevé d'autant (l'étage). */
function xerosAt(x: number, y: number, lift = 0): Board {
  return { grid: XEROS.grid, pal: XEROS.pal, x: Math.round(x - XS.x - XS.w / 2), y: Math.round(y - (XS.y + XS.h)) - lift, depth: () => y };
}

/** Une image de src/generated en planche de la scène : posée coin bas gauche en (x, y), son ombre (alpha < 1) en `x`. */
const pngCache = new Map<string, { grid: Grid; pal: Palette; w: number; h: number }>();
function generated(key: string): { grid: Grid; pal: Palette; w: number; h: number } {
  let r = pngCache.get(key);
  if (r) return r;
  const p = PNG.sync.read(readFileSync(join(ROOT, 'src/generated', `${key}.png`)));
  const pal: Palette = { x: '#000000' };
  const codes = new Map<string, string>();
  let next = 0x100;
  const grid: string[] = [];
  for (let y = 0; y < p.height; y++) {
    let row = '';
    for (let x = 0; x < p.width; x++) {
      const q = (y * p.width + x) * 4, a = p.data[q + 3];
      if (a === 0) { row += '.'; continue; }
      if (a < 200) { row += 'x'; continue; }
      const hx = '#' + [0, 1, 2].map((k) => p.data[q + k].toString(16).padStart(2, '0')).join('');
      let c = codes.get(hx);
      if (!c) { c = String.fromCodePoint(next++); codes.set(hx, c); pal[c] = hx; }
      row += c;
    }
    grid.push(row);
  }
  r = { grid, pal, w: p.width, h: p.height };
  pngCache.set(key, r);
  return r;
}

// =====================================================================================================================
// Le sol de la place : village.tmj, plus les ruelles nouvelles et les cours
// =====================================================================================================================

const MAP = maps['village'];
const REG = (registry as unknown as { world: string[] }).world;
const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tileColor = (t: Grid, pal: Palette, x: number, y: number) => pal[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
const yard15 = worldTiles.tiles['yard-15'];

const NEW_WAYS: Rect[] = WAYS.filter((w) => w.zone === 'village' && w.fate === 'new').map((w) => w.rect);
/** La terre battue à la case : les ruelles nouvelles et les cours des bâtiments du nord (comme tools/essai-place-nord.ts). */
const NEW_DIRT: Rect[] = [...NEW_WAYS, ...ORDER.flatMap((id) => SHOWS.get(id)!.tileYards)];
/** La terre battue au pixel : les cours des bâtiments du sud (comme tools/essai-place-sud.ts). */
const PIXEL_DIRT: Rect[] = ORDER.flatMap((id) => SHOWS.get(id)!.pixelYards);
const inR = (r: Rect, x: number, y: number) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3];

function mapTile(cx: number, cy: number): string {
  if (cx < 0 || cy < 0 || cx >= MAP.width || cy >= MAP.height) return GRASS[Math.floor(hash(5, cx, cy) * GRASS.length)];
  const n = MAP.layers.ground[cy * MAP.width + cx];
  return n >= 0 ? REG[n] : GRASS[0];
}
const isNewDirt = (cx: number, cy: number) => NEW_DIRT.some((r) => inR(r, cx * 32 + 16, cy * 32 + 16));
const isDirt = (cx: number, cy: number) => isNewDirt(cx, cy) || mapTile(cx, cy).startsWith('yard');
const tileCache = new Map<number, Grid>();
/** La tuile d'une case : celle de la carte, sauf la terre battue nouvelle et ses voisines, raccordées de nouveau (`yard-<masque>`). */
function tileAt(cx: number, cy: number): Grid {
  const key = cx * 100003 + cy;
  let t = tileCache.get(key);
  if (t) return t;
  const name = mapTile(cx, cy);
  const touched = isNewDirt(cx, cy) || (name.startsWith('yard') && [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => isNewDirt(cx + dx, cy + dy)));
  if (touched) {
    const m = (isDirt(cx, cy - 1) ? 1 : 0) | (isDirt(cx + 1, cy) ? 2 : 0) | (isDirt(cx, cy + 1) ? 4 : 0) | (isDirt(cx - 1, cy) ? 8 : 0);
    t = worldTiles.tiles[`yard-${m}`];
  } else t = worldTiles.tiles[name] ?? worldTiles.tiles.grass;
  tileCache.set(key, t);
  return t;
}
/** Le sol de la zone village au pixel (px de la zone). */
function ground(x: number, y: number): string {
  if (PIXEL_DIRT.some((r) => inR(r, x, y))) return tileColor(yard15, worldTiles.palette, x, y);
  return tileColor(tileAt(Math.floor(x / 32), Math.floor(y / 32)), worldTiles.palette, x, y);
}
function floorTile(x: number, y: number): string {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  return tileColor(interiorTiles.tiles[FLOOR[Math.floor(hash(6, cx, cy) * FLOOR.length)]], interiorTiles.palette, x, y);
}

// =====================================================================================================================
// Les arbres et buissons de la carte qui restent
// =====================================================================================================================

/** Ce qui chasse un arbre : un bâtiment (son emprise, cour comprise), une cour, une ruelle nouvelle, une emprise du plan. */
const PLACE_PARCELS = ['no', 'ne-n', 'ne-e', 'se-s', 'se-e', 'so'];
const TAKEN: Rect[] = [
  ...ALL.map((b) => [b.at[0], b.at[1], b.at[0] + b.size[0], b.at[1] + b.size[1]] as Rect),
  ...NEW_DIRT, ...PIXEL_DIRT,
  ...PARCELS.filter((p) => PLACE_PARCELS.includes(p.id)).flatMap((p) => [...(p.buildings ?? []), ...(p.yards ?? [])]),
];
const props = propsJson as unknown as Record<string, { image: string }>;
/** Les objets de la carte dans le cadre, gardés ou chassés (le pied : 32 px de large, 12 de profondeur, au milieu du bas de l'image). */
function mapObjects(frame: Rect): { kept: Board[]; gone: string[]; keptNames: string[] } {
  const kept: Board[] = [], gone: string[] = [], keptNames: string[] = [];
  for (const o of MAP.objects) {
    const p = props[o.type];
    if (!p) continue;
    const g = generated(p.image);
    if (o.x + g.w < frame[0] || o.x > frame[2] || o.y - g.h > frame[3] || o.y < frame[1]) continue;
    const fx = o.x + g.w / 2;
    const foot: Rect = [fx - 16, o.y - 12, fx + 16, o.y];
    const hit = TAKEN.some((r) => foot[0] < r[2] && foot[2] > r[0] && foot[1] < r[3] && foot[3] > r[1]);
    if (hit) { gone.push(`${o.type} (${o.x}, ${o.y})`); continue; }
    keptNames.push(`${o.type} (${o.x}, ${o.y})`);
    kept.push({ grid: g.grid, pal: g.pal, x: o.x, y: o.y - g.h, depth: () => o.y });
  }
  return { kept, gone, keptNames };
}

// =====================================================================================================================
// La planche : des blocs rangés en lignes (comme tools/essai-village-maisons.ts)
// =====================================================================================================================

const S = 2, LH = 24;
interface Line { s: string; c: RGBA }
interface Block { title: Line[]; notes: Line[]; w: number; h: number; draw: (img: Img, x: number, y: number) => void }

/** Les signes que la police n'a pas (elle les écrit « ? ») : signalés sur la console, pour les corriger. */
const glyphOf = (ch: string) => { const im = blank(8, 14, [0, 0, 0, 255]); writeText(im, ch, 1, 1, 1, WHITE, null); return Buffer.from(im.data).toString('base64'); };
const QMARK = glyphOf('?');
const missing = new Set<string>();
function say(img: Img, s: string, x: number, y: number, sc: number, c: RGBA, halo: RGBA | null = null): void {
  for (const ch of new Set(s)) if (ch !== '?' && ch !== ' ' && glyphOf(ch) === QMARK) missing.add(ch);
  writeText(img, s, x, y, sc, c, halo === null ? null : halo);
}

function blitLayer(img: Img, l: Layer, ox: number, oy: number, k: number, crop?: Rect): void {
  const [x0, y0, x1, y1] = crop ?? [0, 0, l.w, l.h];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const q = (y * l.w + x) * 4;
    rect(img, ox + (x - x0) * k, oy + (y - y0) * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2], 255]);
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
/** Un cadre en pointillé d'un trait de `t` px. */
function dashed(img: Img, x: number, y: number, w: number, h: number, c: RGBA, t = 2, step = 10): void {
  const on = Math.ceil(step / 2);
  for (let n = 0; n < w; n += step) { rect(img, x + n, y, Math.min(on, w - n), t, c); rect(img, x + n, y + h - t, Math.min(on, w - n), t, c); }
  for (let n = 0; n < h; n += step) { rect(img, x, y + n, t, Math.min(on, h - n), c); rect(img, x + w - t, y + n, t, Math.min(on, h - n), c); }
}
function lines(s: string, w: number, c: RGBA): Line[] {
  return wrap(s, Math.max(20, Math.floor(w / (6 * S)))).map((x) => ({ s: x, c }));
}
function sheet(blocks: Block[], head: string[], maxW: number): Img {
  const PAD = 24, GAP = 40;
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
  hl.forEach((l, i) => say(img, l.s, PAD, PAD + i * LH, S, l.c));
  let y = PAD + hl.length * LH + 16;
  rows.forEach((r, ri) => {
    let x = PAD;
    const th = Math.max(...r.map((b) => b.title.length)) * LH + 8, ih = Math.max(...r.map((b) => b.h));
    for (const b of r) {
      b.title.forEach((l, i) => say(img, l.s, x, y + i * LH, S, l.c));
      b.draw(img, x, y + th + ih - b.h);
      b.notes.forEach((l, i) => say(img, l.s, x, y + th + ih + 10 + i * LH, S, l.c));
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
  console.log(`essai-place -> ${out} (${img.w} x ${img.h})`);
}
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const merge = (scenes: Scene[], extra: Board[] = []): Scene => ({
  quads: scenes.flatMap((s) => s.quads),
  boards: [...scenes.flatMap((s) => s.boards), ...extra],
});

// =====================================================================================================================
// 1. L'ensemble : la place x1, puis les vues de départ du jeu x2
// =====================================================================================================================

/** Le cadre de la place (px de la zone village) : les quatre quarts entiers et un peu des rues autour. */
const FRAME: Rect = [2600, 1400, 4000, 2850];

/** Les Xéros de la place, et les vues de départ du jeu centrées sur l'un d'eux. */
const PEOPLE: { at: [number, number]; view?: string }[] = [
  { at: [3290, 2140], view: 'Au milieu de la place, à côté du panneau des nouvelles : ce que voit le joueur qui arrive sur la place' },
  { at: add2(Sud.NOTES['p-ferme-rivale']!.xeros[0], of('p-ferme-rivale').at), view: 'Devant l’étal de légumes de la ferme rivale (huitième sud-est, côté rue du sud)' },
  { at: Nord.SHOW['p-ferme-riche']!.xeros, view: 'Devant la boutique de la ferme du riche, sur la rue de l’ouest (son étal sous l’auvent rayé, à droite)' },
  { at: add2(Sud.NOTES['p-tailleuse']!.xeros[0], of('p-tailleuse').at), view: 'Dans la cour de la tailleuse et du frère du forgeron (quart sud-ouest)' },
  { at: Nord.SHOW['p-bucheron']!.xeros },
  { at: add2(Sud.NOTES['p-merciere']!.xeros[0], of('p-merciere').at) },
];

/** Les petits noms posés au sol (px de la zone) : discrets, en x1. */
const LABELS: { s: string; at: [number, number] }[] = [
  { s: 'ferme du riche', at: [2830, 2062] },
  { s: 'bûcheron', at: [3470, 1868] },
  { s: 'ancien menuisier', at: [3790, 2062] },
  { s: 'panneau', at: [3312, 2090] },
  { s: 'ferme rivale', at: [3470, 2730] },
  { s: 'mercière', at: [3820, 2190] },
  { s: 'tailleuse', at: [2850, 2190] },
];

function ensemble(): void {
  const scenes = ORDER.map((id) => { const b = of(id); return { ...b.outside(b.at, isNord(id) ? 1 : 0), floor: undefined }; });
  const objs = mapObjects(FRAME);
  const scene = merge(scenes, [...objs.kept, ...PEOPLE.map((p) => xerosAt(p.at[0], p.at[1]))]);
  const l = render(scene, FRAME, { grass: ground, floor: ground });
  console.log(`  arbres et buissons gardés : ${objs.keptNames.join(', ')}`);
  console.log(`  chassés (sous un bâtiment, une cour, une ruelle) : ${objs.gone.join(', ')}`);

  const PAD = 24, GAP = 40, K = 2;
  const views = PEOPLE.filter((p) => p.view);
  const head = [
    'La place du village, comme dans le jeu (essai hors jeu)',
    'En haut, x1 (1 px = 5 cm, comme le jeu) : zone village, x 2600-4000, y 1400-2850 (70 x 72,5 m). Le sol de village.tmj (l’herbe, les rues, la place ronde), les ruelles nouvelles du plan en terre battue, les sept bâtiments des deux modules dans une seule scène, les arbres de la carte qui restent, six Xéros ; en pointillé, les quatre vues du bas.',
    'En bas, x2 : la vue de départ du jeu (palier 3 : 427 x 240 px du monde, 21,35 x 12 m), centrée sur Xéros.',
  ];
  const vw = VIEW_W * K, vh = VIEW_H * K;
  const W = Math.max(l.w + 2 * PAD, 2 * vw + GAP + 2 * PAD);
  const hl = head.flatMap((h, i) => lines(h, W - 2 * PAD, i === 0 ? GOLD : GREY));
  const top = PAD + hl.length * LH + 16;
  const vy0 = top + l.h + 40;
  const capLines = views.map((v, i) => lines(`${i + 1}. ${v.view}`, vw, WHITE));
  const capH = Math.max(...capLines.map((c) => c.length)) * LH + 8;
  const rowsV = Math.ceil(views.length / 2);
  const H = vy0 + rowsV * (capH + vh + GAP) + PAD;
  const img = blank(W, H, BG);
  hl.forEach((ln, i) => say(img, ln.s, PAD, PAD + i * LH, S, ln.c));
  const ox = Math.round((W - l.w) / 2);
  blitLayer(img, l, ox, top, 1);
  const X = (x: number) => ox + x - FRAME[0], Y = (y: number) => top + y - FRAME[1];
  for (const lb of LABELS) say(img, lb.s, Math.round(X(lb.at[0]) - fontWidth(lb.s, 1) / 2), Y(lb.at[1]), 1, [235, 228, 205, 255], [30, 24, 16, 255]);
  views.forEach((v, i) => {
    const fx = Math.round(v.at[0] - VIEW_W / 2), fy = Math.round(v.at[1] - VIEW_H / 2);
    dashed(img, X(fx), Y(fy), VIEW_W, VIEW_H, GOLD, 1, 6);
    say(img, String(i + 1), X(fx) + 4, Y(fy) + 3, 1, GOLD, [30, 24, 16, 255]);
  });
  views.forEach((v, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = Math.round((W - (2 * vw + GAP)) / 2) + col * (vw + GAP), y = vy0 + row * (capH + vh + GAP);
    capLines[i].forEach((ln, j) => say(img, ln.s, x, y + j * LH, S, ln.c));
    const fx = Math.round(v.at[0] - VIEW_W / 2) - FRAME[0], fy = Math.round(v.at[1] - VIEW_H / 2) - FRAME[1];
    blitLayer(img, l, x, y + capH, K, [fx, fy, fx + VIEW_W, fy + VIEW_H]);
  });
  save(img, 'place-ensemble.png');
}

// =====================================================================================================================
// 2. Dehors
// =====================================================================================================================

function outsideBlock(id: PlaceBuildingId): Block {
  const K = 2, b = of(id), meta = PLACE_META[id], sh = SHOWS.get(id)!;
  const sc = b.outside(b.at, isNord(id) ? 1 : 0);
  const scene: Scene = { ...sc, boards: [...sc.boards, ...sh.xeros.map(([x, y]) => xerosAt(x, y))], floor: undefined };
  // le panneau, tout petit, se montre avec un peu de la place autour
  const m = b.size[0] < 100 ? 64 : 16;
  const bb = bounds(scene, [m, m, m, m]);
  const bd: Bounds = [Math.min(bb[0], b.at[0] - m), Math.min(bb[1], b.at[1] - m), Math.max(bb[2], b.at[0] + b.size[0] + m), Math.max(bb[3], b.at[1] + b.size[1] + m)];
  const l = render(scene, bd, { grass: ground, floor: ground });
  const w = Math.max(l.w * K, 560);
  return {
    title: [{ s: meta.title, c: GOLD }, ...lines(meta.who, w, WHITE)],
    notes: [
      ...sh.lines.flatMap((s) => lines(s, w, GREY)),
      ...lines(`Emprise ${fmt(b.size[0] * 0.05)} x ${fmt(b.size[1] * 0.05)} m (débords et cour compris) ; posé en (${b.at[0]}, ${b.at[1]}) de la zone village ; parcelle ${meta.parcel}`, w, DIM),
    ],
    w, h: l.h * K,
    draw: (img, x, y) => blitLayer(img, l, x, y, K),
  };
}

// =====================================================================================================================
// 3. Dedans
// =====================================================================================================================

function insideLayer(id: PlaceBuildingId, level: 0 | 1): Layer {
  const b = of(id), sh = SHOWS.get(id)!;
  const sc0 = isNord(id) ? b.inside(b.at, 0, 1) : b.inside(b.at, level, 0);
  const xp = level ? sh.in1 : sh.in0;
  // à l'étage, Xéros se tient sur le plancher (2,85 m : 57 px), relevé comme tout ce qui y est posé (tools/essai-place-sud.ts)
  const sc: Scene = { ...sc0, boards: [...sc0.boards, ...(xp ? [xerosAt(xp[0], xp[1], level ? 57 : 0)] : [])] };
  const bd = bounds(sc, [12, 12, 12, 12]);
  const fl = sc.floor;
  return render(sc, bd, { grass: ground, floor: (x, y) => (fl && x >= fl[0] && x < fl[1] && y >= fl[2] && y < fl[3] ? floorTile(x, y) : ground(x, y)) });
}

function insideBlock(id: PlaceBuildingId): Block {
  const K = 2, b = of(id), meta = PLACE_META[id], sh = SHOWS.get(id)!;
  const levels: (0 | 1)[] = b.levels === 2 ? [0, 1] : [0];
  const ls = levels.map((lv) => insideLayer(id, lv));
  const GAP = 24;
  const w = Math.max(ls.reduce((s, l) => s + l.w * K + GAP, 0) - GAP, 560);
  const hh = Math.max(...ls.map((l) => l.h * K));
  const cut = isNord(id) ? 'Toit effacé, mur sud coupé à 70 cm comme le jeu ; l’étal et les abris : leur vue toit effacé ; Xéros dedans pour l’échelle' : 'Toit effacé, mur sud coupé à 70 cm comme le jeu ; Xéros dedans pour l’échelle';
  return {
    title: [{ s: `${meta.title} : le dedans`, c: GOLD }, ...lines(meta.who, w, WHITE)],
    notes: [
      ...(b.levels === 2 ? lines('À gauche le rez-de-chaussée, à droite l’étage (le rez omis, l’escalier dans la pénombre sous la trémie)', w, GREY) : []),
      ...sh.inside.flatMap((s) => lines(s, w, GREY)),
      ...lines(cut, w, DIM),
    ],
    w, h: hh,
    draw: (img, x, y) => {
      let cx = x;
      for (const l of ls) { blitLayer(img, l, cx, y + hh - l.h * K, K); cx += l.w * K + GAP; }
    },
  };
}

// =====================================================================================================================
// 4. Les pièces
// =====================================================================================================================

const FAMILIES: { name: string; keys: string[] }[] = [
  { name: 'Étals et comptoirs', keys: ['luxury-counter', 'plank-counter', 'rough-stall', 'rough-stall-s1', 'shop-counter', 'shop-flap', 'shop-flap-open', 'scale', 'price-slate'] },
  { name: 'Présentoirs et meubles de boutique', keys: ['tiered-display', 'shop-shelves', 'cheese-rack', 'wood-rack', 'haberdashery-cabinet', 'ribbon-rack', 'clothes-rack', 'dress-form', 'gear-rack', 'knife-display', 'saddler-bench', 'leather-hides'] },
  { name: 'Marchandises', keys: ['honey-pot', 'wax-cake', 'spice-box', 'vegetable-crate', 'vegetable-crate-s1', 'vegetable-crate-s2', 'vegetable-basket'] },
  { name: 'Enseignes', keys: ['hanging-sign', 'hanging-sign-s1', 'hanging-sign-s2', 'hanging-sign-s3', 'hanging-sign-s4'] },
  { name: 'Murs, toits et galerie', keys: ['striped-awning', 'plank-awning-poles', 'clapboard-wall', 'timber-gallery', 'yard-gate', 'yard-fence'] },
  { name: 'Le menuisier abandonné', keys: ['nailed-shutter', 'fallen-sign', 'sign-bracket', 'tall-weeds', 'shingle-roof-damaged', 'unfinished-chair'] },
  { name: 'Le panneau des nouvelles', keys: ['notice-board', 'notice-sheet'] },
];

/** La taille attendue d'une vue nord (reprise de tools/essai-place-nord.ts, d'après PIECE_INFO). */
function expectedNord(p: VillagePiece, v: number): [number, number] | null {
  const info = Nord.PIECE_INFO[p.key], { w, d, h } = p.dims;
  const [W, D] = v % 2 ? [d / 5, w / 5] : [w / 5, d / 5], H = h / 5;
  if (info.form === 'pan') return null;
  if (info.form === 'flat') return [Math.round(W), Math.round(D + H)];
  if (info.k === 1) return [Math.round(W), Math.round(H + D)];
  return [Math.round(W), Math.round(H + D / 2)];
}

const shortTitle = (id: PlaceBuildingId) => PLACE_META[id].title.replace(/^La |^Le /, '').replace(/^l’|^l'/, '');
/** Les enseignes du sud sont dessinées par le module nord : leurs bâtiments ne les listent pas (`pieces`), leur nom le dit. */
const EXTRA_USERS: Record<string, PlaceBuildingId[]> = { 'hanging-sign-s2': ['p-merciere'], 'hanging-sign-s3': ['p-tailleuse'], 'hanging-sign-s4': ['p-tailleuse'] };
const offGauge: string[] = [];
function usersOf(key: string): string[] {
  const ids = new Set<PlaceBuildingId>([
    ...(EXTRA_USERS[key] ?? []),
    ...ALL.filter((b) => b.pieces.includes(key)).map((b) => b.id),
    ...((Nord.PIECE_USES[key] ?? []) as PlaceBuildingId[]),
    ...((PIECE_USERS[key] ?? []) as PlaceBuildingId[]),
  ]);
  return ORDER.filter((id) => ids.has(id)).map((id) => shortTitle(id).toLowerCase());
}

function pieceBlock(p: VillagePiece, nord: boolean): Block {
  const K = 4, GAP = 6, views = p.views();
  const H = Math.max(XS.y + XS.h, ...views.map((v) => v.grid.length));
  const W = views.reduce((a, v) => a + v.grid[0].length + GAP, 0) + XS.w;
  const w = W * K, tw = Math.max(w, 520);
  const sym = ['', 'une vue (ronde)', 'deux vues (symétrique)', '', 'quatre vues, R0 à R3'][views.length] ?? `${views.length} vues`;
  let note: string, checks: Line[];
  if (nord) {
    const info = Nord.PIECE_INFO[p.key];
    note = info.note;
    const cs = views.map((v, r) => {
      const s = silhouette(v.grid, v.pal), e = expectedNord(p, r);
      const ok = !e || (Math.abs(s.w - e[0]) <= 2 && Math.abs(s.h - e[1]) <= 2);
      return { s: `R${r} ${s.w}x${s.h}${e ? ` (gabarit ${e[0]}x${e[1]})` : ' (pan de toit)'}`, ok };
    });
    checks = [{ s: cs.map((c) => c.s).join(', '), c: cs.every((c) => c.ok) ? GREEN : RED }];
    if (!cs.every((c) => c.ok)) offGauge.push(`${p.key} : ${cs.filter((c) => !c.ok).map((c) => c.s).join(', ')}`);
  } else {
    const k = SUD_PIECES.indexOf(p), m = PIECE_MODELS[k];
    note = m.note;
    const dims = { ...p.dims, shape: 'box' as const, ground: m.ground };
    const cs = views.map((v, r) => {
      const s = silhouette(v.grid, v.pal);
      const e = expectedSize(r % 2 ? { ...dims, w: p.dims.d, d: p.dims.w } : dims);
      const ok = Math.abs(s.w - e.w) <= TOLERANCE + (e.wMax - e.w) && Math.abs(s.h - e.h) <= TOLERANCE + (e.hMax - e.h);
      return { s: `R${r} ${s.w}x${s.h} (gabarit ${Math.round(e.w)}x${Math.round(e.h)})`, ok };
    });
    checks = [{ s: cs.map((c) => c.s).join(', '), c: cs.every((c) => c.ok) ? GREEN : m.form ? GOLD : RED }];
    if (!m.form && cs.some((c) => !c.ok)) offGauge.push(`${p.key} : ${cs.filter((c) => !c.ok).map((c) => c.s).join(', ')}`);
    if (m.form && cs.some((c) => !c.ok)) checks.push(...lines(`Forme : ${m.form}`, tw, GOLD));
  }
  const users = usersOf(p.key);
  return {
    title: [...lines(p.name, tw, GOLD), { s: p.key, c: DIM }],
    notes: [
      ...lines(`${p.dims.w} x ${p.dims.d} x ${p.dims.h} cm ; ${sym}`, tw, WHITE),
      ...lines(note, tw, GREY),
      ...lines(users.length ? `Pour ${users.join(', ')}` : 'Pour aucun bâtiment posé', tw, GREY),
      ...checks.flatMap((c) => lines(c.s, tw, c.c)),
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

function banner(s: string, w: number): Block {
  return { title: [], notes: [], w, h: LH + 12, draw: (img, x, y) => { say(img, s, x, y, 3, GOLD); rect(img, x, y + LH + 14, w, 2, GOLD); } };
}

function piecesSheets(): void {
  const all: { p: VillagePiece; nord: boolean }[] = [...Nord.PIECES.map((p) => ({ p, nord: true })), ...SUD_PIECES.map((p) => ({ p, nord: false }))];
  const known = new Set(FAMILIES.flatMap((f) => f.keys));
  const lost = all.filter((x) => !known.has(x.p.key)).map((x) => x.p.key);
  const fams = lost.length ? [...FAMILIES, { name: 'Autres', keys: lost }] : FAMILIES;
  const MAX = 2600, PAD = 24;
  const groups = fams.map((f) => ({
    name: f.name,
    blocks: f.keys.map((k) => all.find((x) => x.p.key === k)).filter((x): x is { p: VillagePiece; nord: boolean } => !!x).map((x) => pieceBlock(x.p, x.nord)),
  }));
  const head = (n?: string) => [
    `La place du village : les pièces nouvelles des deux modules, x4${n ? ` (${n})` : ''} (essai hors jeu)`,
    'Toutes leurs vues R0 à R3 selon leur symétrie, Xéros à droite (1,60 m) ; dessous : le nom, la clé, les dimensions (est-ouest x nord-sud x hauteur), ce qui la distingue, les bâtiments qui s’en servent, la taille de chaque vue et celle du gabarit (docs/STYLE.md section 8 ; vert : juste à 2 px, or : forme expliquée, rouge : hors gabarit)',
  ];
  const blocksOf = (gs: typeof groups) => gs.flatMap((g) => [banner(g.name, MAX - 2 * PAD), ...g.blocks]);
  const one = sheet(blocksOf(groups), head(), MAX);
  if (one.h <= 8000) { save(one, 'place-pieces.png'); return; }
  let best = 1, bestD = Infinity;
  for (let k = 1; k < groups.length; k++) {
    const a = sheet(blocksOf(groups.slice(0, k)), head(), MAX).h, b = sheet(blocksOf(groups.slice(k)), head(), MAX).h;
    if (Math.max(a, b) < bestD) { bestD = Math.max(a, b); best = k; }
  }
  save(sheet(blocksOf(groups.slice(0, best)), head('1 sur 2'), MAX), 'place-pieces-1.png');
  save(sheet(blocksOf(groups.slice(best)), head('2 sur 2'), MAX), 'place-pieces-2.png');
}

// =====================================================================================================================

function main(): void {
  const only = process.argv[2];
  if (!only || only === 'ensemble') ensemble();
  if (!only || only === 'dehors') save(sheet(ORDER.map(outsideBlock), [
    'La place du village : les bâtiments dehors (essai hors jeu)',
    'x2 ; 5 cm par px, projection du jeu (x, y - z) ; chaque bâtiment à sa place de la zone village, sur le sol de village.tmj et les ruelles nouvelles (terre battue) ; Xéros pour l’échelle ; dessous : les matières et la couverture',
  ], 2800), 'place-batiments-dehors.png');
  if (!only || only === 'dedans') save(sheet(ORDER.filter((id) => id !== 'p-panneau').map(insideBlock), [
    'La place du village : les bâtiments dedans (essai hors jeu)',
    'x2 ; toits effacés, mur sud coupé comme le jeu, meubles du jeu et pièces nouvelles à leur place ; la mercière et la tailleuse : le rez et l’étage côte à côte',
  ], 2800), 'place-batiments-dedans.png');
  if (!only || only === 'pieces') piecesSheets();
  if (offGauge.length) console.log(`  hors gabarit (rouge) :\n    ${offGauge.join('\n    ')}`);
  if (missing.size) console.log(`  ATTENTION, signes absents de la police (écrits « ? ») : ${[...missing].join(' ')}`);
}
main();
