// Planches finales de la place resserrée du village (chantier « village », CADRAGE-village.md section 14 ; hors jeu : rien ici n'entre
// dans le jeu) : npx tsx tools/essai-place.ts [ensemble|dehors|dedans|pieces] écrit (sans argument : tout)
//   .art-preview/place-ensemble.png           LA planche : la place entière à la vraie échelle (x1), comme le jeu la montre (le sol de
//                                             village.tmj, le rond de 20 m et la terre battue jusqu'aux façades, les ruelles du plan,
//                                             les bâtiments des trois modules, les étals et le centre dans une seule scène, les arbres
//                                             de la carte qui restent, des Xéros) : à gauche la solution 1 au sud, à droite la
//                                             solution 2 ; dessous, les vues de départ du jeu (palier 3 : 427 × 240 px du monde) en x2 :
//                                             au milieu de la place, devant chaque boutique ; pour les trois boutiques du sud, la
//                                             solution 1 et la solution 2 (la boutique fondue) côte à côte ;
//   .art-preview/place-batiments-dehors.png   chaque bâtiment dehors (solution 1 au sud), x2, Xéros, titre, qui y vit, matières ; le
//                                             centre en une case ;
//   .art-preview/place-batiments-dedans.png   les intérieurs, toit effacé, x2 ; le rez et l'étage côte à côte ;
//   .art-preview/place-pieces.png             les pièces nouvelles des trois modules, toutes leurs vues, x4, par famille (coupée en
//                                             place-pieces-1.png, -2.png… au-delà de 8 000 px de haut).
//
// Rien n'est redessiné ici : l'outil MONTE les exports des trois modules (art/proposals/place-nord.ts, place-sud.ts, place-centre.ts),
// rendus par le `render` de l'essai de la maison de Xéros (art/proposals/maison-xeros.ts).
//
// Le centre a été composé avant que le sud ait reculé ses bâtiments et posé ses étals : l'outil le raccorde (`fitCentre`). Une chose du
// centre dont l'emprise touche, à 30 cm près, ce que dessinent les modules nord et sud (murs, appentis, étals, marchandises, et le sol
// que leurs toits cachent à l'écran), ou qui reste dans la rue de l'ouest ou de l'est, est poussée vers le rond jusqu'à la place libre
// la plus proche (hors des passages réservés des rues, du panneau, du tour de 3 m du banc, de la place de Xéros devant chaque
// boutique, du houppier du tilleul, des autres choses ; à défaut, à côté) ; sinon elle est retirée. La console et la planche du dehors disent ce qui a bougé. Une seule série de
// linge et de jardinières : celle des bâtiments (le linge entre deux fenêtres d'étage, les jardinières aux appuis) ; la corde à linge
// sur poteaux du centre est retirée. Le panneau des nouvelles va où `RESERVED` du centre le dit (au sud-ouest du tilleul).

import { mkdirSync, readFileSync, renameSync, existsSync, writeFileSync } from 'node:fs';
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
import * as Centre from '../art/proposals/place-centre';
import { PIECE_MODELS, PIECE_USERS } from '../art/proposals/place-sud-pieces';
import { PLACE_META, type PlaceBuilding, type PlaceBuildingId, type VillagePiece } from '../art/proposals/place-types';
import { WAYS, type Rect } from '../art/proposals/village-plan-data';
import { fontWidth, write as writeText, wrap } from '../art/proposals/village-plan-font';
import { blank, rect, toPng, type Img, type RGBA } from './lib/world-render';
import { expectedSize, silhouette, TOLERANCE, type Dims } from '../src/content/gabarit';
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
const ORANGE: RGBA = [235, 150, 70, 255];
const VIEW_W = 427, VIEW_H = 240;
const [CX, CY] = Nord.ROND.center, R = Nord.ROND.radius;

// =====================================================================================================================
// Les bâtiments des modules nord et sud, posés dans la zone
// =====================================================================================================================

type Sol = 1 | 2;
const NORD_IDS: PlaceBuildingId[] = ['p-ferme-riche', 'p-bucheron', 'p-menuisier'];
const SUD_IDS: PlaceBuildingId[] = ['p-tailleuse', 'p-merciere', 'p-ferme-rivale'];
const nordOf = (id: PlaceBuildingId) => Nord.BUILDINGS.find((b) => b.id === id)!;
const sudOf = (id: PlaceBuildingId, sol: Sol = 1) => (sol === 1 ? Sud.BUILDINGS : Sud.BUILDINGS_S2).find((b) => b.id === id)!;
const isNord = (id: PlaceBuildingId) => id === 'p-panneau' || NORD_IDS.includes(id);
const ofId = (id: PlaceBuildingId, sol: Sol = 1): PlaceBuilding => (isNord(id) ? Nord.BUILDINGS.find((b) => b.id === id)! : sudOf(id, sol));
const add2 = (p: [number, number], at: [number, number]): [number, number] => [p[0] + at[0], p[1] + at[1]];
const shift = (r: Rect, d: [number, number]): Rect => [r[0] + d[0], r[1] + d[1], r[2] + d[0], r[3] + d[1]];
const inR = (r: Rect, x: number, y: number) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3];
const meets = (a: Rect, b: Rect, m = 0) => a[0] < b[2] + m && a[2] + m > b[0] && a[1] < b[3] + m && a[3] + m > b[1];

/** Le panneau : place-nord.ts le dessine à `PANNEAU`, le centre lui réserve sa place au sud-ouest du tilleul. */
const PANNEAU_RES = Centre.RESERVED[0].rect;
const PANNEAU = Nord.BUILDINGS.find((b) => b.id === 'p-panneau')!;
const PANNEAU_AT: [number, number] = [PANNEAU.at[0] + PANNEAU_RES[0] - Nord.PANNEAU[0], PANNEAU.at[1] + PANNEAU_RES[1] - Nord.PANNEAU[1]];

/** Un bâtiment dehors, posé à sa place de la zone (le nord : image 1 de ses animations, comme son outil). */
function outsideOf(id: PlaceBuildingId, sol: Sol = 1): Scene {
  if (id === 'p-panneau') return PANNEAU.outside(PANNEAU_AT, 1);
  const b = ofId(id, sol);
  return b.outside(b.at, isNord(id) ? 1 : 0);
}

/** Ce que les modules nord et sud occupent au sol (px de la zone) : l'emprise de chaque face (sauf le sol plat) et de chaque image. */
function sceneRects(sc: Scene): Rect[] {
  const out: Rect[] = [];
  for (const q of sc.quads) {
    const cs = [q.o, [q.o[0] + q.u[0], q.o[1] + q.u[1], q.o[2] + q.u[2]], [q.o[0] + q.v[0], q.o[1] + q.v[1], q.o[2] + q.v[2]],
      [q.o[0] + q.u[0] + q.v[0], q.o[1] + q.u[1] + q.v[1], q.o[2] + q.u[2] + q.v[2]]];
    if (cs.every((c) => c[2] < 0.5) && q.n[2] > 0.9) continue;
    out.push([Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])) + 0.01, Math.max(...cs.map((c) => c[1])) + 0.01]);
  }
  for (const b of sc.boards) {
    const r = boardRect(b);
    if (r) out.push([r[0], r[3] - 8, r[2], r[3]]);
  }
  return out;
}
/** L'emprise d'une image : ses colonnes peintes (sauf l'ombre), son pied (la profondeur de sa dernière rangée). */
function boardRect(b: Board): Rect | null {
  let x0 = Infinity, x1 = -Infinity;
  b.grid.forEach((row) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === 'x' || !b.pal[ch]) return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1);
  }));
  if (x0 === Infinity) return null;
  const d = b.depth(b.grid.length - 1);
  return [b.x + x0, d - 1, b.x + x1, d];
}

// =====================================================================================================================
// Le centre, raccordé aux étals du sud
// =====================================================================================================================

/**
 * Ce qui gêne le centre : ce que dessinent le nord (sans le panneau, qu'on déplace) et le sud, dans les deux solutions, rendu sur un sol
 * témoin (magenta). Un pixel du sol qui n'est plus du sol (même dans l'ombre) est occupé : un mur, un étal, une marchandise, ou un toit
 * qui le cache à l'écran (CADRAGE 14.2 : un bâtiment cache le sol au nord de lui sur la hauteur de son avant-toit). Une chose posée là
 * serait dessous, ou invisible.
 */
const MASK_FRAME: Rect = [2600, 1600, 4050, 2800];
const TEST = '#ff00ff';
const MASKS: Layer[] = ([1, 2] as Sol[]).map((sol) => render(
  { quads: [...NORD_IDS, ...SUD_IDS].flatMap((id) => outsideOf(id, sol).quads), boards: [...NORD_IDS, ...SUD_IDS].flatMap((id) => outsideOf(id, sol).boards) },
  MASK_FRAME, { grass: () => TEST, floor: () => TEST },
));
/** Le tilleul et son banc, pour ce qu'on pousse : son houppier cache le sol au nord du tronc. */
const TREE_MASK: Layer = render(merge2(Centre.CENTRE.slice(1, 3).map((c) => c.scene(c.at))), MASK_FRAME, { grass: () => TEST, floor: () => TEST });
function merge2(scs: Scene[]): Scene { return { quads: scs.flatMap((s) => s.quads), boards: scs.flatMap((s) => s.boards) }; }
function taken(x: number, y: number, tree = false): boolean {
  for (const m of tree ? [...MASKS, TREE_MASK] : MASKS) {
    const X = Math.floor(x) - m.x, Y = Math.floor(y) - m.y;
    if (X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue;
    const q = (Y * m.w + X) * 4, r = m.rgba[q], g = m.rgba[q + 1], b = m.rgba[q + 2];
    if (!(g < 40 && Math.abs(r - b) < 40 && r > 50)) return true;
  }
  return false;
}
const MARGIN = 6; // 30 cm
/** Jusqu'où l'on cherche une place (px) : 8 m ; les grandes choses (une charrette, l'abreuvoir) jusqu'à 14 m. */
const reachOf = (r: Rect) => ((r[2] - r[0]) * (r[3] - r[1]) > 600 ? 280 : 160);
const PASSAGES = Centre.RESERVED.map((r) => r.rect);
/**
 * Les rues de l'ouest et de l'est, entre les façades du nord et les étals du sud (hors du rond, où `RESERVED` ne les protège pas) :
 * aucune chose du centre n'y reste.
 */
const STREETS: Rect[] = [[2640, 2076, 3110, 2128], [3460, 2068, 4000, 2114]];
/** Ce que les choses poussées laissent libre en plus : la place de Xéros devant chaque boutique (1,40 m), le devant de l'étal du riche. */
const xerosRoom = (p: [number, number]): Rect => [p[0] - 14, p[1] - 20, p[0] + 14, p[1] + 8];
const STALL = Nord.FOOTPRINTS['étal luxueux'];
const KEEP_FREE: Rect[] = [
  xerosRoom([CX + 28, CY + 54]), // Xéros au milieu de la place (MIDDLE)
  [STALL[0], STALL[3], STALL[1], STALL[3] + 30],
  ...NORD_IDS.map((id) => xerosRoom(Nord.SHOW[id]!.xeros)),
  ...SUD_IDS.flatMap((id) => [...Sud.NOTES[id]!.xeros.map((p) => xerosRoom(add2(p, Sud.BUILDINGS.find((b) => b.id === id)!.at))),
    ...Sud.S2_SHOPS[id]!.map((s) => xerosRoom(add2(s.door, Sud.BUILDINGS_S2.find((b) => b.id === id)!.at)))]),
];
/** Le tour du banc (3 m autour de son bord) : ce qui est poussé vers le rond ne doit pas y entrer. */
const TOUR = 25 + 60;
const distToRect = (r: Rect, x: number, y: number) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - y, 0, y - r[3]));

/** L'emprise d'une chose du centre posée en `at` : ses faces, ses images (du coin nord-ouest au pied). */
function itemRect(it: Centre.CentreItem, at: [number, number]): Rect {
  const sc = it.scene(at);
  let r: Rect = [at[0], at[1], at[0] + 1, at[1] + 1];
  for (const q of sceneRects(sc)) r = [Math.min(r[0], q[0]), Math.min(r[1], q[1]), Math.max(r[2], q[2]), Math.max(r[3], q[3])];
  for (const b of sc.boards) {
    const br = boardRect(b);
    if (br) r = [Math.min(r[0], br[0]), r[1], Math.max(r[2], br[2]), Math.max(r[3], br[3])];
  }
  return r;
}

interface Fitted { items: Centre.CentreItem[]; ats: [number, number][]; moved: string[]; removed: string[] }
const FR: Record<string, string> = {
  barrel: 'tonneau', sack: 'sac', crate: 'caisse', jar: 'jarre', basket: 'panier', cageot: 'cageot', 'flower-pot': 'pot d’œillets',
  'flower-pot-yellow': 'pot de soucis', bucket: 'seau', 'bucket-water': 'seau d’eau', stool: 'tabouret',
};
const nameOf = (it: Centre.CentreItem) => it.label || FR[it.key] || it.key;
function fitCentre(): Fitted {
  const C = Centre.CENTRE;
  // les choses posées au même coin (les caisses empilées) bougent ensemble
  const groups: { idx: number[]; at: [number, number]; r: Rect; fixed: boolean }[] = [];
  C.forEach((it, i) => {
    if (i === 0) return; // l'ombre du houppier : elle suit le tilleul
    const g = groups.find((x) => x.at[0] === it.at[0] && x.at[1] === it.at[1]);
    if (g) { g.idx.push(i); const r = itemRect(it, it.at); g.r = [Math.min(g.r[0], r[0]), Math.min(g.r[1], r[1]), Math.max(g.r[2], r[2]), Math.max(g.r[3], r[3])]; return; }
    groups.push({ idx: [i], at: it.at, r: itemRect(it, it.at), fixed: i <= 2 });
  });
  const moved: string[] = [], removed: string[] = [];
  const dropped = new Set<number>();
  const offset = new Map<number, [number, number]>();
  const hits = (r: Rect, tree = false) => {
    for (let y = Math.floor(r[1]) - MARGIN; y < Math.ceil(r[3]) + MARGIN; y++) for (let x = Math.floor(r[0]) - MARGIN; x < Math.ceil(r[2]) + MARGIN; x++) if (taken(x, y, tree)) return true;
    return false;
  };
  // une seule série de linge : celle des bâtiments
  for (const g of groups) if (g.idx.some((i) => C[i].key === 'laundry-line')) {
    g.idx.forEach((i) => dropped.add(i));
    removed.push(`la corde à linge sur poteaux (${g.at[0]}, ${g.at[1]}) : le linge des bâtiments, entre deux fenêtres d’étage, suffit`);
  }
  // ce qui ne gêne rien reste ; le reste se place ensuite, le plus grand d'abord (l'abreuvoir, les charrettes, les bancs)
  const final = new Set(groups.filter((g) => !g.idx.some((i) => dropped.has(i)) && (g.fixed || (!hits(g.r) && !STREETS.some((t) => meets(g.r, t))))));
  const area = (r: Rect) => (r[2] - r[0]) * (r[3] - r[1]);
  const todo = groups.filter((g) => !final.has(g) && !g.idx.some((i) => dropped.has(i))).sort((a, b) => area(b.r) - area(a.r));
  for (const g of todo) {
    const names = [...new Set(g.idx.map((i) => nameOf(C[i])))].join(' et ');
    // la plus petite poussée qui trouve une place libre sans s'éloigner du centre du rond
    const mx = (g.r[0] + g.r[2]) / 2, my = (g.r[1] + g.r[3]) / 2, d0 = Math.hypot(CX - mx, CY - my);
    const cands: [number, number][] = [], REACH = reachOf(g.r);
    for (let dy = -REACH; dy <= REACH; dy += 2) for (let dx = -REACH; dx <= REACH; dx += 2) {
      if (Math.hypot(dx, dy) > REACH) continue;
      cands.push([dx, dy]);
    }
    // vers le rond d'abord ; à défaut (l'abreuvoir coincé entre la rue du sud et les étals), à côté, au plus près
    const away = (d: [number, number]) => (Math.hypot(CX - mx - d[0], CY - my - d[1]) > d0 + 0.5 ? 1 : 0);
    cands.sort((a, b) => away(a) - away(b) || Math.hypot(...a) - Math.hypot(...b));
    let done = false;
    for (const d of cands) {
      const r = shift(g.r, d);
      if (hits(r, true) || [...PASSAGES, ...KEEP_FREE, ...STREETS].some((p) => meets(r, p)) || distToRect(r, CX, CY) < TOUR) continue;
      if ([...final].some((o) => meets(r, o.r, 2))) continue;
      final.add(g);
      g.r = r; g.idx.forEach((i) => offset.set(i, d));
      moved.push(`${names} (${g.at[0]}, ${g.at[1]}) poussé de ${fmtM(Math.hypot(...d))} m ${away(d) ? 'à côté' : 'vers le rond'}`);
      done = true;
      break;
    }
    if (!done) {
      g.idx.forEach((i) => dropped.add(i));
      removed.push(`${names} (${g.at[0]}, ${g.at[1]}) : pas de place libre vers le rond`);
    }
  }
  const items: Centre.CentreItem[] = [], ats: [number, number][] = [];
  C.forEach((it, i) => {
    if (dropped.has(i)) return;
    items.push(it); ats.push(add2(it.at, offset.get(i) ?? [0, 0]));
  });
  return { items, ats, moved, removed };
}
const fmtM = (px: number) => String(Math.round(px * 0.05 * 100) / 100).replace('.', ',');
const FIT = fitCentre();
/** Le centre raccordé, en une scène (l'ombre du houppier d'abord). */
function centreScene(): Scene {
  const scs = FIT.items.map((it, i) => it.scene(FIT.ats[i]));
  return { quads: scs.flatMap((s) => s.quads), boards: scs.flatMap((s) => s.boards) };
}
const CENTRE_RECTS: Rect[] = FIT.items.slice(1).map((it, i) => itemRect(it, FIT.ats[i + 1]));

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
// Le sol : village.tmj, le rond et la terre battue jusqu'aux façades, les ruelles du plan
// =====================================================================================================================

const MAP = maps['village'];
const REG = (registry as unknown as { world: string[] }).world;
const GRASS = ['grass', 'grass2', 'grass3', 'grass4', 'grass5', 'grass6'];
const FLOOR = ['floor', 'floor2', 'floor3', 'floor4'];
const tileColor = (t: Grid, pal: Palette, x: number, y: number) => pal[t[((y % 32) + 32) % 32][((x % 32) + 32) % 32]];
const yard15 = worldTiles.tiles['yard-15'];

const NEW_WAYS: Rect[] = WAYS.filter((w) => w.zone === 'village' && w.fate === 'new').map((w) => w.rect);
/** La terre battue à la case (la tuile `yard` du jeu, raccordée) : les ruelles nouvelles, les cours du nord, le rond. */
const TILE_DIRT: Rect[] = [...NEW_WAYS, ...Nord.NORD_YARDS.map((r) => r as Rect)];
const inRond = (x: number, y: number) => Math.hypot(x - CX, y - CY) < R;
/** La terre battue au pixel : du rond aux façades du sud (PLACE_SUD_DIRT), les cours des bâtiments du sud. */
const PIXEL_DIRT: Rect[] = [...Sud.PLACE_SUD_DIRT, ...SUD_IDS.flatMap((id) => Sud.NOTES[id]!.yards.map((r) => shift(r, sudOf(id).at)))];

function mapTile(cx: number, cy: number): string {
  if (cx < 0 || cy < 0 || cx >= MAP.width || cy >= MAP.height) return GRASS[Math.floor(hash(5, cx, cy) * GRASS.length)];
  const n = MAP.layers.ground[cy * MAP.width + cx];
  return n >= 0 ? REG[n] : GRASS[0];
}
const isNewDirt = (cx: number, cy: number) => { const X = cx * 32 + 16, Y = cy * 32 + 16; return inRond(X, Y) || TILE_DIRT.some((r) => inR(r, X, Y)); };
const isDirt = (cx: number, cy: number) => isNewDirt(cx, cy) || mapTile(cx, cy).startsWith('yard');
const tileCache = new Map<number, Grid>();
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
  if (inRond(x, y) || PIXEL_DIRT.some((r) => inR(r, x, y))) return tileColor(yard15, worldTiles.palette, x, y);
  return tileColor(tileAt(Math.floor(x / 32), Math.floor(y / 32)), worldTiles.palette, x, y);
}
function floorTile(x: number, y: number): string {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  return tileColor(interiorTiles.tiles[FLOOR[Math.floor(hash(6, cx, cy) * FLOOR.length)]], interiorTiles.palette, x, y);
}

// =====================================================================================================================
// Les arbres et buissons de la carte qui restent
// =====================================================================================================================

const TAKEN: Rect[] = [
  ...[...NORD_IDS.map((id) => nordOf(id)), ...SUD_IDS.map((id) => sudOf(id))].map((b) => [b.at[0], b.at[1], b.at[0] + b.size[0], b.at[1] + b.size[1]] as Rect),
  ...TILE_DIRT, ...PIXEL_DIRT, ...CENTRE_RECTS, ...PASSAGES,
];
const props = propsJson as unknown as Record<string, { image: string }>;
function mapObjects(frame: Rect): { kept: Board[]; gone: string[]; keptNames: string[] } {
  const kept: Board[] = [], gone: string[] = [], keptNames: string[] = [];
  for (const o of MAP.objects) {
    const p = props[o.type];
    if (!p) continue;
    const g = generated(p.image);
    if (o.x + g.w < frame[0] || o.x > frame[2] || o.y - g.h > frame[3] || o.y < frame[1]) continue;
    const fx = o.x + g.w / 2;
    const foot: Rect = [fx - 16, o.y - 12, fx + 16, o.y];
    const hit = TAKEN.some((r) => meets(foot, r)) || Math.hypot(Math.max(Math.abs(fx - CX) - 16, 0), Math.max(Math.abs(o.y - 6 - CY) - 6, 0)) < R;
    if (hit) { gone.push(`${o.type} (${o.x}, ${o.y})`); continue; }
    keptNames.push(`${o.type} (${o.x}, ${o.y})`);
    kept.push({ grid: g.grid, pal: g.pal, x: o.x, y: o.y - g.h, depth: () => o.y });
  }
  return { kept, gone, keptNames };
}

// =====================================================================================================================
// La planche : des blocs rangés en lignes
// =====================================================================================================================

const S = 2, LH = 24;
interface Line { s: string; c: RGBA }
interface Block { title: Line[]; notes: Line[]; w: number; h: number; draw: (img: Img, x: number, y: number) => void }

const glyphOf = (ch: string) => { const im = blank(8, 14, [0, 0, 0, 255]); writeText(im, ch, 1, 1, 1, WHITE, null); return Buffer.from(im.data).toString('base64'); };
const QMARK = glyphOf('?');
const missing = new Set<string>();
function say(img: Img, s: string, x: number, y: number, sc: number, c: RGBA, halo: RGBA | null = null): void {
  for (const ch of new Set(s)) if (ch !== '?' && ch !== ' ' && glyphOf(ch) === QMARK) missing.add(ch);
  writeText(img, s, x, y, sc, c, halo);
}
function blitLayer(img: Img, l: Layer, ox: number, oy: number, k: number, crop?: Rect): void {
  const [x0, y0, x1, y1] = crop ?? [0, 0, l.w, l.h];
  for (let y = Math.max(0, y0); y < Math.min(l.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(l.w, x1); x++) {
    const q = (y * l.w + x) * 4;
    rect(img, ox + (x - x0) * k, oy + (y - y0) * k, k, k, [l.rgba[q], l.rgba[q + 1], l.rgba[q + 2], 255]);
  }
}
function blitGrid(img: Img, grid: Grid, pal: Palette, ox: number, oy: number, k: number): void {
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !pal[ch]) return;
    const h = pal[ch].replace('#', '');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    const a = h.length === 8 ? n(6) / 255 : 1;
    if (a >= 1) { rect(img, ox + x * k, oy + y * k, k, k, [n(0), n(2), n(4), 255]); return; }
    for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) {
      const X = ox + x * k + xx, Y = oy + y * k + yy;
      if (X < 0 || Y < 0 || X >= img.w || Y >= img.h) continue;
      const q = (Y * img.w + X) * 4;
      for (let c = 0; c < 3; c++) img.data[q + c] = img.data[q + c] * (1 - a) + n(c * 2) * a;
    }
  }));
}
function dashed(img: Img, x: number, y: number, w: number, h: number, c: RGBA, t = 2, step = 10): void {
  const on = Math.ceil(step / 2);
  for (let n = 0; n < w; n += step) { rect(img, x + n, y, Math.min(on, w - n), t, c); rect(img, x + n, y + h - t, Math.min(on, w - n), t, c); }
  for (let n = 0; n < h; n += step) { rect(img, x, y + n, t, Math.min(on, h - n), c); rect(img, x + w - t, y + n, t, Math.min(on, h - n), c); }
}
function lines(s: string, w: number, c: RGBA, sc = S): Line[] {
  return wrap(s, Math.max(20, Math.floor(w / (6 * sc)))).map((x) => ({ s: x, c }));
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

// =====================================================================================================================
// 1. L'ensemble
// =====================================================================================================================

/** Le cadre de la place (px de la zone village). */
const FRAME: Rect = [2640, 1650, 4000, 2750];

/** Où se tient Xéros pour chaque vue : la solution 1 et, pour le sud, la solution 2 (devant la porte de la boutique). */
interface Spot { name: string; at: [number, number]; s2?: { id: PlaceBuildingId; shop: number; at: [number, number] } }
const sudSpot = (id: PlaceBuildingId, k: number) => add2(Sud.NOTES[id]!.xeros[k], sudOf(id).at);
const doorOf = (id: PlaceBuildingId, shop: number) => add2(Sud.S2_SHOPS[id]![shop].door, sudOf(id, 2).at);
const MIDDLE: [number, number] = [CX + 28, CY + 54];
const SPOTS: Spot[] = [
  { name: 'Au milieu de la place, au sud-est du tilleul et de son banc rond (le panneau à gauche, l’abreuvoir et la ferme rivale devant) : ce que voit le joueur qui arrive sur la place', at: MIDDLE },
  { name: 'Devant l’étal luxueux de la ferme du riche, sur le rond (la boutique derrière, le logis-réserve à gauche sur la rue de l’ouest)', at: Nord.SHOW['p-ferme-riche']!.xeros },
  { name: 'Devant la boutique du bûcheron, dans le recoin nord-est (ses tas, son comptoir sur billots)', at: Nord.SHOW['p-bucheron']!.xeros },
  { name: 'Devant la boutique abandonnée, sur la rue de l’est (la future menuiserie de la mère)', at: Nord.SHOW['p-menuisier']!.xeros },
  { name: 'La tailleuse, côté vêtements : sur la rue de l’ouest, devant ses étals', at: sudSpot('p-tailleuse', 0), s2: { id: 'p-tailleuse', shop: 0, at: doorOf('p-tailleuse', 0) } },
  { name: 'Le frère du forgeron, côté cuir et armes : dans le recoin sud-ouest, sur le bord du rond', at: sudSpot('p-tailleuse', 1), s2: { id: 'p-tailleuse', shop: 1, at: doorOf('p-tailleuse', 1) } },
  { name: 'La mercière : sur la rue de l’est, devant son étal long', at: sudSpot('p-merciere', 0), s2: { id: 'p-merciere', shop: 0, at: doorOf('p-merciere', 0) } },
  { name: 'La ferme rivale : dans le recoin sud-est, devant le grand étal de légumes', at: sudSpot('p-ferme-rivale', 0), s2: { id: 'p-ferme-rivale', shop: 0, at: doorOf('p-ferme-rivale', 0) } },
];

/** Toute la place dans une scène : les bâtiments (le sud dans la solution `sol`), le panneau, le centre, les arbres, les Xéros. */
function placeScene(sol: Sol, people: [number, number][], replace?: { id: PlaceBuildingId; scene: Scene }): Scene {
  const ids: PlaceBuildingId[] = [...NORD_IDS, 'p-panneau', ...SUD_IDS];
  const c = centreScene();
  const objs = mapObjects(FRAME);
  const bs = ids.map((id) => (replace && replace.id === id ? replace.scene : outsideOf(id, sol)));
  // l'ombre du houppier passe avant toutes les autres images (place-centre.ts)
  return { quads: [...c.quads, ...bs.flatMap((s) => s.quads)], boards: [...c.boards, ...bs.flatMap((s) => s.boards), ...objs.kept, ...people.map((p) => xerosAt(p[0], p[1]))] };
}
const peopleOf = (sol: Sol): [number, number][] => SPOTS.map((s) => (sol === 2 && s.s2 ? s.s2.at : s.at));

function ensemble(): void {
  const objs = mapObjects(FRAME);
  console.log(`  arbres et buissons gardés : ${objs.keptNames.join(', ') || 'aucun'}`);
  console.log(`  chassés (sous un bâtiment, une cour, un étal, une ruelle, le rond) : ${objs.gone.join(', ')}`);
  const L1 = render(placeScene(1, peopleOf(1)), FRAME, { grass: ground, floor: ground });
  const L2 = render(placeScene(2, peopleOf(2)), FRAME, { grass: ground, floor: ground });

  const PAD = 24, GAP = 30, K = 2, vw = VIEW_W * K, vh = VIEW_H * K;
  const fw = FRAME[2] - FRAME[0], fh = FRAME[3] - FRAME[1];
  const W = 2 * fw + GAP + 2 * PAD;
  const head = [
    'La place resserrée du village, comme dans le jeu (essai hors jeu, CADRAGE-village.md section 14)',
    `En haut, x1 (1 px = 5 cm, comme le jeu) : zone village, x ${FRAME[0]}-${FRAME[2]}, y ${FRAME[1]}-${FRAME[3]} (68 x 55 m). À gauche, la solution 1 au sud (l’appentis bas et les étals en avant) ; à droite, la solution 2 (la façade sans appentis, la boutique meublée dedans). Le sol de village.tmj, le rond de 20 m et la terre battue jusqu’aux façades, les ruelles du plan ; les sept bâtiments, leurs étals, le panneau et le centre (le tilleul, le banc rond, l’abreuvoir, les charrettes, ce qui remplit) dans une seule scène ; les arbres de la carte qui restent ; Xéros aux huit places des vues (à droite, devant la porte des boutiques du sud). En pointillé or : les vues de départ.`,
    'Dessous, x2 : la vue de départ du jeu (palier 3 : 427 x 240 px du monde, 21,35 x 12 m), centrée sur Xéros. Pour les trois boutiques du sud : à gauche la solution 1, à droite la solution 2, Xéros devant la porte, la boutique fondue à 0,35 (toit et mur nord de la pièce, comme une fenêtre au volet ouvert).',
  ];
  const hl = head.flatMap((h, i) => lines(h, W - 2 * PAD, i === 0 ? GOLD : GREY));
  const top = PAD + hl.length * LH + 16;
  const capOf = (s: string, w: number) => lines(s, w, WHITE);
  // les vues : d'abord le milieu et le nord, trois par rangée ; puis le sud, deux par rangée (solution 1, solution 2)
  const nordViews = SPOTS.filter((s) => !s.s2), sudViews = SPOTS.filter((s) => s.s2);
  const per = Math.max(1, Math.floor((W - 2 * PAD + GAP) / (vw + GAP)));
  const capH = (texts: string[], w: number) => Math.max(...texts.map((t) => capOf(t, w).length)) * LH + 8;
  const nRows = Math.ceil(nordViews.length / per);
  const capN = capH(nordViews.map((v, i) => `${i + 1}. ${v.name}`), vw);
  const capS = capH(sudViews.flatMap((v, i) => [`${nordViews.length + i + 1}. ${v.name}`]), 2 * vw + GAP) + LH;
  const y0 = top + LH + fh + 40;
  const yS = y0 + nRows * (capN + vh + GAP);
  const H = yS + sudViews.length * (capS + vh + GAP) + PAD;
  const img = blank(W, H, BG);
  hl.forEach((ln, i) => say(img, ln.s, PAD, PAD + i * LH, S, ln.c));
  const ox = [PAD, PAD + fw + GAP];
  say(img, 'Solution 1 au sud : l’appentis bas, les étals en avant', ox[0], top, S, GOLD);
  say(img, 'Solution 2 au sud : la façade sans appentis, la boutique dedans', ox[1], top, S, GOLD);
  blitLayer(img, L1, ox[0], top + LH, 1);
  blitLayer(img, L2, ox[1], top + LH, 1);
  const X = (k: number, x: number) => ox[k] + x - FRAME[0], Y = (y: number) => top + LH + y - FRAME[1];
  // les cadres des vues
  SPOTS.forEach((v, i) => {
    for (const k of [0, 1]) {
      const at = k === 1 && v.s2 ? v.s2.at : v.at;
      const fx = Math.round(at[0] - VIEW_W / 2), fy = Math.round(at[1] - VIEW_H / 2);
      const cx0 = Math.max(fx, FRAME[0]), cy0 = Math.max(fy, FRAME[1]), cx1 = Math.min(fx + VIEW_W, FRAME[2]), cy1 = Math.min(fy + VIEW_H, FRAME[3]);
      dashed(img, X(k, cx0), Y(cy0), cx1 - cx0, cy1 - cy0, GOLD, 1, 6);
      say(img, String(i + 1), X(k, cx0) + 4, Y(cy0) + 3, 1, GOLD, [30, 24, 16, 255]);
    }
  });
  const crop = (l: Layer, at: [number, number]): Rect => { const fx = Math.round(at[0] - VIEW_W / 2) - l.x, fy = Math.round(at[1] - VIEW_H / 2) - l.y; return [fx, fy, fx + VIEW_W, fy + VIEW_H]; };
  nordViews.forEach((v, i) => {
    const col = i % per, row = Math.floor(i / per);
    const x = PAD + col * (vw + GAP), y = y0 + row * (capN + vh + GAP);
    capOf(`${i + 1}. ${v.name}`, vw).forEach((ln, j) => say(img, ln.s, x, y + j * LH, S, ln.c));
    blitLayer(img, L1, x, y + capN, K, crop(L1, v.at));
  });
  sudViews.forEach((v, i) => {
    const y = yS + i * (capS + vh + GAP);
    const cl = capOf(`${nordViews.length + i + 1}. ${v.name}`, 2 * vw + GAP);
    cl.forEach((ln, j) => say(img, ln.s, PAD, y + j * LH, S, ln.c));
    const yc = y + capS - LH - 4;
    say(img, 'Solution 1 : l’appentis, les étals devant', PAD, yc, S, GOLD);
    say(img, `Solution 2 : Xéros devant la porte de ${Sud.S2_SHOPS[v.s2!.id]![v.s2!.shop].name}, fondue`, PAD + vw + GAP, yc, S, GOLD);
    blitLayer(img, L1, PAD, y + capS, K, crop(L1, v.at));
    const fl = fondu(v.s2!.id, v.s2!.shop, L2);
    blitLayer(img, fl, PAD + vw + GAP, y + capS, K, crop(fl, v.s2!.at));
  });
  save(img, 'place-ensemble.png');
}

/** La place de la solution 2, la boutique `shop` de `id` fondue comme le jeu (s2Reveal, fadeHoles), sur la vue de la porte. */
function fondu(id: PlaceBuildingId, shop: number, full: Layer): Layer {
  const b = sudOf(id, 2), r = Sud.s2Reveal(id, b.at, 0);
  const door = doorOf(id, shop);
  const bd: Bounds = [Math.round(door[0] - VIEW_W / 2), Math.round(door[1] - VIEW_H / 2), Math.round(door[0] - VIEW_W / 2) + VIEW_W, Math.round(door[1] - VIEW_H / 2) + VIEW_H];
  const fps = Sud.FOOTPRINTS[id]!.map((f) => shift(f, b.at));
  const fl = (x: number, y: number) => (fps.some((f) => inR(f, x, y)) ? floorTile(x, y) : ground(x, y));
  const bare = render(placeScene(2, peopleOf(2), { id, scene: r.bare }), bd, { grass: fl, floor: fl });
  return Sud.fadeHoles(full, bare, [r.holes[shop]]);
}

// =====================================================================================================================
// 2. Dehors
// =====================================================================================================================

/** Les matières et la couverture du nord (tools/essai-place-nord.ts). */
const NORD_NOTES: Partial<Record<PlaceBuildingId, string>> = {
  'p-ferme-riche': 'La boutique au rond et le logis-réserve sur la rue de l’ouest, à étage : pierre enduite, pierre de taille, cordon, laves, deux vitraux ; l’étal sous l’auvent rayé guède et garance : deux comptoirs sculptés en équerre, présentoirs, claies, pots en pyramide, meules',
  'p-bucheron': 'La boutique au rond, à étage : rez de bardage, trois devantures à volet-tablette, avant-toit, râtelier d’outils ; étage de pan de bois chaulé (le neveu et sa femme) ; les tas qui débordent sur le recoin, le comptoir sur billots',
  'p-menuisier': 'Pan de bois vieux, chaux écaillée, bardeaux troués, volets cloués, enseigne tombée et potence vide, herbe haute, planches oubliées : la future menuiserie de la mère',
  'p-panneau': 'Deux poteaux, le tableau de planches, un toit de bardeaux, les feuillets ; la pierre au pied pour monter lire. Posé où le centre le réserve : au sud-ouest du tilleul, face au sud',
};
const titleOf = (id: PlaceBuildingId) => (isNord(id) ? PLACE_META[id].title : Sud.NOTES[id]!.title);
const whoOf = (id: PlaceBuildingId) => (id === 'p-panneau' ? 'Au centre de la place, au sud-ouest du tilleul' : isNord(id) ? Nord.WHO[id] ?? PLACE_META[id].who : Sud.NOTES[id]!.who);

function outsideBlock(id: PlaceBuildingId): Block {
  const K = 2;
  const xs: [number, number][] = id === 'p-panneau' ? [[PANNEAU_RES[0] - 8, PANNEAU_RES[3] + 14]] : isNord(id) ? [Nord.SHOW[id]!.xeros] : Sud.NOTES[id]!.xeros.map((p) => add2(p, sudOf(id).at));
  const sc0 = outsideOf(id);
  const scene: Scene = { ...sc0, boards: [...sc0.boards, ...xs.map(([x, y]) => xerosAt(x, y))], floor: undefined };
  const b = id === 'p-panneau' ? { at: PANNEAU_AT, size: PANNEAU.size } : ofId(id);
  const m = b.size[0] < 100 ? 64 : 16;
  const bb = bounds(scene, [m, m, m, m]);
  const bd: Bounds = [Math.min(bb[0], b.at[0] - m), Math.min(bb[1], b.at[1] - m), Math.max(bb[2], b.at[0] + b.size[0] + m), Math.max(bb[3], b.at[1] + b.size[1] + m)];
  const l = render(scene, bd, { grass: ground, floor: ground });
  const w = Math.max(l.w * K, 560);
  const mat = isNord(id) ? [NORD_NOTES[id] ?? ''] : Sud.NOTES[id]!.lines;
  return {
    title: [{ s: titleOf(id), c: GOLD }, ...lines(whoOf(id), w, WHITE)],
    notes: [
      ...mat.flatMap((s) => lines(s, w, GREY)),
      ...lines(`Emprise ${fmt(b.size[0] * 0.05)} x ${fmt(b.size[1] * 0.05)} m (débords, étals et cour compris) ; posé en (${b.at[0]}, ${b.at[1]}) de la zone village${isNord(id) ? '' : ' ; solution 1'}`, w, DIM),
    ],
    w, h: l.h * K,
    draw: (img, x, y) => blitLayer(img, l, x, y, K),
  };
}

function centreBlock(): Block {
  const K = 2;
  const sc = centreScene();
  const xs: [number, number][] = [MIDDLE, [CX - 120, CY + 30]];
  const scene: Scene = { ...sc, boards: [...sc.boards, ...xs.map(([x, y]) => xerosAt(x, y))] };
  const bd = bounds(scene, [16, 16, 16, 16]);
  const l = render(scene, bd, { grass: ground, floor: ground });
  const w = l.w * K;
  const ring = (img: Img, ox: number, oy: number) => {
    for (let a = 0; a < 900; a++) {
      if (a % 6 > 2) continue;
      const t = (a / 900) * Math.PI * 2, X = Math.round(CX + Math.cos(t) * R - bd[0]), Y = Math.round(CY + Math.sin(t) * R - bd[1]);
      if (X >= 0 && Y >= 0 && X < l.w && Y < l.h) rect(img, ox + X * K, oy + Y * K, K, K, [240, 230, 200, 255]);
    }
  };
  return {
    title: [{ s: 'Le centre de la place (place-centre.ts), raccordé aux étals du sud', c: GOLD }, ...lines('Le tilleul et le banc rond, l’échelle de la cueillette ; l’abreuvoir à la bouche de la rue du sud ; la charrette de bûches au nord-est, la charrette à bras au sud-ouest ; la paille, les tonneaux, les cageots, les sacs, les bancs, les pots', w, WHITE)],
    notes: [
      ...lines('Seul, sans les bâtiments (ils sont sur l’ensemble) ; le pointillé : le bord du rond de 20 m', w, DIM),
      ...[...FIT.moved.map((s) => `Déplacé : ${s}`), ...FIT.removed.map((s) => `Retiré : ${s}`)].flatMap((s) => lines(s, w, ORANGE)),
    ],
    w, h: l.h * K,
    draw: (img, x, y) => { blitLayer(img, l, x, y, K); ring(img, x, y); },
  };
}

// =====================================================================================================================
// 3. Dedans
// =====================================================================================================================

function insideLayer(id: PlaceBuildingId, level: 0 | 1): Layer {
  const b = ofId(id);
  const sc0 = b.inside(b.at, level, isNord(id) ? 1 : 0);
  let xp: [number, number] | undefined;
  if (isNord(id)) xp = Nord.SHOW[id]!.inXeros;
  else { const n = Sud.NOTES[id]!, p = level ? n.inXeros1 : n.inXeros0; xp = p ? add2(p, b.at) : undefined; }
  // à l'étage, Xéros se tient sur le plancher (2,85 m : 57 px), relevé comme tout ce qui y est posé
  const sc: Scene = { ...sc0, boards: [...sc0.boards, ...(xp ? [xerosAt(xp[0], xp[1], level ? 57 : 0)] : [])] };
  const bd = bounds(sc, [12, 12, 12, 12]);
  const fps = isNord(id) ? [] : Sud.FOOTPRINTS[id]!.map((f) => shift(f, b.at));
  const fl = sc.floor;
  const floorFn = (x: number, y: number) => ((fl && x >= fl[0] && x < fl[1] && y >= fl[2] && y < fl[3]) || fps.some((f) => inR(f, x, y)) ? floorTile(x, y) : ground(x, y));
  return render(sc, bd, { grass: isNord(id) ? ground : floorFn, floor: floorFn });
}

function insideBlock(id: PlaceBuildingId): Block {
  const K = 2, b = ofId(id);
  const levels: (0 | 1)[] = b.levels === 2 ? [0, 1] : [0];
  const ls = levels.map((lv) => insideLayer(id, lv));
  const GAP = 24;
  const w = Math.max(ls.reduce((s, l) => s + l.w * K + GAP, 0) - GAP, 560);
  const hh = Math.max(...ls.map((l) => l.h * K));
  return {
    title: [{ s: `${titleOf(id)} : le dedans`, c: GOLD }, ...lines(whoOf(id), w, WHITE)],
    notes: [
      ...(b.levels === 2 ? lines('À gauche le rez-de-chaussée, à droite l’étage (le rez omis, l’escalier dans la pénombre sous la trémie)', w, GREY) : []),
      ...(isNord(id) ? [] : Sud.NOTES[id]!.inside).flatMap((s) => lines(s, w, GREY)),
      ...lines('Toit effacé, mur sud coupé à 70 cm comme le jeu ; Xéros dedans pour l’échelle', w, DIM),
    ],
    w, h: hh,
    draw: (img, x, y) => { let cx = x; for (const l of ls) { blitLayer(img, l, cx, y + hh - l.h * K, K); cx += l.w * K + GAP; } },
  };
}

// =====================================================================================================================
// 4. Les pièces
// =====================================================================================================================

type Mod = 'nord' | 'sud' | 'centre';
interface P { p: VillagePiece; mod: Mod }
const ALL_PIECES: P[] = [
  ...Nord.PIECES.map((p) => ({ p, mod: 'nord' as Mod })),
  ...Sud.PIECES.map((p) => ({ p, mod: 'sud' as Mod })),
  ...Centre.PIECES.map((p) => ({ p, mod: 'centre' as Mod })),
];
/** Ce qui fait double emploi (une seule série de linge et de jardinières : celle des bâtiments, `window-laundry`, `flower-box`). */
const DUPLICATES = new Set(['laundry-line', 'laundry-line-high', 'window-box']);

const inList = (l: string[]) => (k: string, m: Mod) => m !== 'centre' && l.some((x) => k === x || k.startsWith(`${x}-s`));
const FAMILIES: { name: string; test: (k: string, m: Mod) => boolean }[] = [
  { name: 'Étals et comptoirs', test: inList(['luxury-counter', 'plank-counter', 'rough-stall', 'haberdashery-stall', 'shop-counter', 'cloth-table', 'saddler-bench', 'scale', 'price-slate']) },
  { name: 'Présentoirs', test: inList(['tiered-display', 'shop-shelves', 'cheese-rack', 'tool-rack', 'wood-rack', 'haberdashery-cabinet', 'ribbon-rack', 'clothes-rack', 'dress-form', 'hat-stand', 'gear-rack', 'knife-display', 'armor-form', 'shield-stand', 'weapon-rack', 'saddle-stand', 'leather-hides']) },
  { name: 'Marchandises', test: inList(['honey-pot', 'wax-cake', 'spice-box', 'honey-pyramid', 'cheese-stack', 'wax-stack', 'candle-bunch', 'shingle-bundle', 'vegetable-crate', 'vegetable-basket', 'egg-basket', 'bread-basket', 'apple-basket', 'pumpkin-pile']) },
  { name: 'Enseignes', test: inList(['hanging-sign']) },
  { name: 'Murs, toits, appentis et galerie (et ce qui s’y accroche)', test: inList(['striped-awning', 'shop-lean-to', 'clapboard-wall', 'timber-gallery', 'yard-fence', 'flower-box', 'window-laundry', 'leaning-ladder']) },
  { name: 'Le centre et ce qui remplit', test: (_k, m) => m === 'centre' },
  { name: 'La boutique abandonnée', test: inList(['nailed-shutter', 'fallen-sign', 'sign-bracket', 'tall-weeds', 'shingle-roof-damaged', 'unfinished-chair']) },
  { name: 'Le panneau des nouvelles', test: inList(['notice-board', 'notice-sheet']) },
];

const FAMILY_OF = (key: string, mod: Mod): string => {
  for (const f of FAMILIES) if (f.test(key, mod)) return f.name;
  return 'Autres';
};

/** La taille attendue d'une vue nord (tools/essai-place-nord.ts, d'après PIECE_INFO). */
function expectedNord(p: VillagePiece, v: number): [number, number] | null {
  const info = Nord.PIECE_INFO[p.key], { w, d, h } = p.dims;
  const [W, D] = v % 2 ? [d / 5, w / 5] : [w / 5, d / 5], H = h / 5;
  if (info.form === 'pan') return null;
  if (info.form === 'flat') return [Math.round(W), Math.round(D + H)];
  if (info.k === 1) return [Math.round(W), Math.round(H + D)];
  return [Math.round(W), Math.round(H + D / 2)];
}
/** La taille attendue d'une vue du centre (tools/essai-place-centre.ts). */
function expectedCentre(key: string, d: { w: number; d: number; h: number }, v: number) {
  if (key === 'barrel-lying') return expectedSize(v % 2 ? { w: d.d, d: d.w, h: d.h, shape: 'cylinder', axis: 'ns' } : { ...d, shape: 'cylinder', axis: 'ew' });
  const dd = v % 2 ? { w: d.d, d: d.w, h: d.h } : d;
  const cyl = key.startsWith('flower-pot') ? { shape: 'cylinder', axis: 'up' } : { shape: 'box' };
  return expectedSize({ ...dd, ...cyl } as Dims);
}
const CENTRE_FREE = new Set(['hand-cart', 'two-wheel-cart', 'leaning-ladder', 'linden-tree', 'round-bench']);

const shortTitle = (id: PlaceBuildingId) => titleOf(id).replace(/^La |^Le /, '').replace(/^l’|^l'/, '').toLowerCase();
const EXTRA_USERS: Record<string, PlaceBuildingId[]> = { 'hanging-sign-s2': ['p-merciere'], 'hanging-sign-s3': ['p-tailleuse'], 'hanging-sign-s4': ['p-tailleuse'] };
const ALL_B: PlaceBuilding[] = [...Nord.BUILDINGS, ...Sud.BUILDINGS];
const ORDER: PlaceBuildingId[] = ['p-ferme-riche', 'p-bucheron', 'p-menuisier', 'p-panneau', 'p-tailleuse', 'p-merciere', 'p-ferme-rivale'];
const offGauge: string[] = [];
function usersOf(key: string, mod: Mod): string[] {
  const ids = new Set<PlaceBuildingId>([
    ...(EXTRA_USERS[key] ?? []),
    ...ALL_B.filter((b) => b.pieces.includes(key)).map((b) => b.id),
    ...((Nord.PIECE_USES[key] ?? []) as PlaceBuildingId[]),
    ...((PIECE_USERS[key] ?? []) as PlaceBuildingId[]),
  ]);
  const out = ORDER.filter((id) => ids.has(id)).map(shortTitle);
  if (mod === 'centre' || FIT.items.some((it) => it.key === key)) out.push('le centre de la place');
  return [...new Set(out)];
}

function pieceBlock({ p, mod }: P): Block {
  const K = 4, GAP = 6, views = p.views();
  const H = Math.max(XS.y + XS.h, ...views.map((v) => v.grid.length));
  const W = views.reduce((a, v) => a + v.grid[0].length + GAP, 0) + XS.w;
  const w = W * K, tw = Math.max(w, 520);
  const sym = ['', 'une vue (ronde)', 'deux vues (symétrique)', '', 'quatre vues, R0 à R3'][views.length] ?? `${views.length} vues`;
  let note: string;
  const checks: Line[] = [];
  if (mod === 'nord') {
    const info = Nord.PIECE_INFO[p.key];
    note = info.note;
    const cs = views.map((v, r) => {
      const s = silhouette(v.grid, v.pal), e = expectedNord(p, r);
      const ok = !e || (Math.abs(s.w - e[0]) <= 2 && Math.abs(s.h - e[1]) <= 2);
      return { s: `R${r} ${s.w}x${s.h}${e ? ` (gabarit ${e[0]}x${e[1]})` : ' (pan de toit)'}`, ok };
    });
    checks.push({ s: cs.map((c) => c.s).join(', '), c: cs.every((c) => c.ok) ? GREEN : RED });
    if (!cs.every((c) => c.ok)) offGauge.push(`${p.key} : ${cs.filter((c) => !c.ok).map((c) => c.s).join(', ')}`);
  } else if (mod === 'sud') {
    const m = PIECE_MODELS.find((x) => x.key === p.key)!;
    note = m.note;
    const dims = { ...p.dims, shape: 'box' as const, ground: m.ground };
    const cs = views.map((v, r) => {
      const s = silhouette(v.grid, v.pal);
      const e = expectedSize(r % 2 ? { ...dims, w: p.dims.d, d: p.dims.w } : dims);
      const ok = Math.abs(s.w - e.w) <= TOLERANCE + (e.wMax - e.w) && Math.abs(s.h - e.h) <= TOLERANCE + (e.hMax - e.h);
      return { s: `R${r} ${s.w}x${s.h} (gabarit ${Math.round(e.w)}x${Math.round(e.h)})`, ok };
    });
    checks.push({ s: cs.map((c) => c.s).join(', '), c: cs.every((c) => c.ok) ? GREEN : m.form ? GOLD : RED });
    if (!m.form && cs.some((c) => !c.ok)) offGauge.push(`${p.key} : ${cs.filter((c) => !c.ok).map((c) => c.s).join(', ')}`);
    if (m.form && cs.some((c) => !c.ok)) checks.push(...lines(`Forme : ${m.form}`, tw, GOLD));
  } else {
    note = Centre.PIECE_NOTES[p.key] ?? '';
    const cs = views.map((v, r) => {
      const s = silhouette(v.grid, v.pal), e = expectedCentre(p.key, p.dims, r);
      const ok = Math.abs(s.w - e.w) <= TOLERANCE + 0.5 && Math.abs(s.h - e.h) <= TOLERANCE + 0.5;
      return { s: `R${r} ${s.w}x${s.h} (gabarit ${Math.round(e.w)}x${Math.round(e.h)})`, ok };
    });
    const free = CENTRE_FREE.has(p.key);
    checks.push({ s: cs.map((c) => c.s).join(', '), c: cs.every((c) => c.ok) ? GREEN : free ? GOLD : RED });
    if (!free && cs.some((c) => !c.ok)) offGauge.push(`${p.key} : ${cs.filter((c) => !c.ok).map((c) => c.s).join(', ')}`);
    if (free && cs.some((c) => !c.ok)) checks.push(...lines('Forme : la vraie projection d’un objet ouvert ou penché (une charrette de côté est plus basse que sa boîte, l’échelle penche, le houppier déborde)', tw, GOLD));
  }
  const users = usersOf(p.key, mod);
  return {
    title: [...lines(p.name, tw, GOLD), { s: `${p.key} (module ${mod})`, c: DIM }],
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
  const kept = ALL_PIECES.filter((x) => !DUPLICATES.has(x.p.key));
  const names = [...FAMILIES.map((f) => f.name), 'Autres'];
  const MAX = 2600, PAD = 24;
  const groups = names.map((name) => ({ name, items: kept.filter((x) => FAMILY_OF(x.p.key, x.mod) === name) })).filter((g) => g.items.length);
  const head = (n?: string) => [
    `La place resserrée : les pièces nouvelles des trois modules (nord, sud, centre), x4${n ? ` (${n})` : ''} (essai hors jeu)`,
    'Toutes leurs vues R0 à R3 selon leur symétrie, Xéros à droite (1,60 m) ; dessous : le nom, la clé et le module, les dimensions (est-ouest x nord-sud x hauteur), ce qui la distingue, les bâtiments qui s’en servent, la taille de chaque vue et celle du gabarit (docs/STYLE.md section 8 ; vert : juste à 2 px, or : forme expliquée, rouge : hors gabarit). Une seule série de linge et de jardinières : celle des bâtiments.',
  ];
  // les blocs d'un groupe, faits une fois
  const blocks = groups.map((g) => ({ name: g.name, blocks: g.items.map(pieceBlock) }));
  const blocksOf = (gs: typeof blocks) => gs.flatMap((g) => [banner(g.name, MAX - 2 * PAD), ...g.blocks]);
  // découpe en planches de 8 000 px au plus, groupe par groupe
  const parts: (typeof blocks)[] = [];
  let cur: typeof blocks = [];
  for (const g of blocks) {
    const tryH = sheet(blocksOf([...cur, g]), head('x'), MAX).h;
    if (cur.length && tryH > 8000) { parts.push(cur); cur = [g]; } else cur.push(g);
  }
  if (cur.length) parts.push(cur);
  const out = parts.length === 1 ? ['place-pieces.png'] : parts.map((_, i) => `place-pieces-${i + 1}.png`);
  parts.forEach((p, i) => save(sheet(blocksOf(p), head(parts.length > 1 ? `${i + 1} sur ${parts.length}` : undefined), MAX), out[i]));
  // les anciennes planches de pièces qui ne sont plus produites : à la poubelle
  for (const f of ['place-pieces.png', ...Array.from({ length: 9 }, (_, i) => `place-pieces-${i + 1}.png`)]) {
    if (out.includes(f)) continue;
    const src = join(ROOT, '.art-preview', f);
    if (!existsSync(src)) continue;
    const dst = join(ROOT, '.poubelle/.art-preview', f);
    mkdirSync(dirname(dst), { recursive: true });
    renameSync(src, dst);
    console.log(`  ${f} n’est plus produite : déplacée dans .poubelle/.art-preview/`);
  }
}

// =====================================================================================================================

function main(): void {
  const only = process.argv[2];
  console.log(`  centre : ${FIT.moved.length} déplacé(s), ${FIT.removed.length} retiré(s)`);
  for (const s of FIT.moved) console.log(`    déplacé : ${s}`);
  for (const s of FIT.removed) console.log(`    retiré : ${s}`);
  if (process.env.PLACE_DEBUG) FIT.items.slice(1).forEach((it, i) => console.log(`    ${nameOf(it)} ${CENTRE_RECTS[i].map(Math.round).join(' ')}`));
  if (!only || only === 'ensemble') ensemble();
  if (!only || only === 'dehors') save(sheet([...ORDER.map(outsideBlock), centreBlock()], [
    'La place resserrée : les bâtiments dehors (essai hors jeu)',
    'x2 ; 5 cm par px, projection du jeu (x, y - z) ; chaque bâtiment à sa place de la zone village, sur le sol de village.tmj, le rond et la terre battue ; le sud dans la solution 1 ; Xéros pour l’échelle ; dessous : les matières et la couverture ; en dernier, le centre de la place',
  ], 2800), 'place-batiments-dehors.png');
  if (!only || only === 'dedans') save(sheet(ORDER.filter((id) => id !== 'p-panneau').map(insideBlock), [
    'La place resserrée : les bâtiments dedans (essai hors jeu)',
    'x2 ; toits effacés, mur sud coupé comme le jeu, meubles du jeu et pièces nouvelles à leur place ; le rez et l’étage côte à côte',
  ], 2800), 'place-batiments-dedans.png');
  if (!only || only === 'pieces') piecesSheets();
  if (offGauge.length) console.log(`  hors gabarit (rouge) :\n    ${offGauge.join('\n    ')}`);
  if (missing.size) console.log(`  ATTENTION, signes absents de la police (écrits « ? ») : ${[...missing].join(' ')}`);
}
main();
