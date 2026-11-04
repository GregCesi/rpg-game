// Le terrain du tunnel en gradins et son rendu dans la projection du jeu (chantier « relief », HORS JEU ; CADRAGE.md 13.0).
// Planches : npx tsx tools/essai-relief-gradins.ts. Dessins : art/proposals/relief-gradins.ts ; matières reprises du jeu :
// art/world/relief.ts (bank, lane, faces), art/world/tiles.ts (herbe, chemin, eau, sol de forêt).
//
// Le monde est en pixels du jeu (5 cm) : x vers l'est (x = case × 32, la carte tiled/maps/ferme.tmj), y vers le sud depuis l'axe
// du chemin (rangées 65-66), h la hauteur. La projection du jeu : un point (x, y, h) se dessine en colonne x, rangée y − h.
// Le rendu marche du nord au sud dans chaque colonne : un dessus se peint sur sa rangée ; quand la hauteur tombe (une face
// tournée vers le sud), les rangées sautées sont la face, en vraie grandeur. Une face tournée vers le nord ne se voit pas.
//
// La forme (13.0, 13.1) : le chemin plat de 2,5 m (50 px) ; de chaque côté quatre marches de 1,25 m (25 px) et trois gradins
// de 50 cm (10 px), le dessus à 5 m (100 px), l'ouverture de 5,5 m (110 px). En long (CADRAGE 10.1) : la ferme à l'est ; la face
// de terre de la bouche est à la case 58 ; côté ferme, le dessus plat jusqu'à 8,75 m de l'axe puis une pente plantée jusqu'au sol de
// la ferme ; au nord et au sud de la bouche, deux rampes plantées montent de la ferme au dessus (question 32) ; la rivière, cases
// 42 à 47 : la masse la traverse sur 8,75 m de chaque côté de l'axe, l'eau s'arrête contre ses deux faces ; côté plateau, cases 42 à
// 4,5, le chemin monte de 0 à 5 m et le trou s'aplatit : les quatre marches gardent leur place et rapetissent ensemble.

import { Canvas, type Grid, type Palette } from '../lib/canvas';
import { world } from '../palette';
import { bankTile, faceEarth, faceWet, lane, pathLane } from '../world/relief';
import tileset from '../world/tiles';
import { hash } from '../world/relief';
import { cut, cutBefore, cutVariant, CUT_VARIANTS, PLANTS, riser, roots, STEP, tread, type PlantKey } from './relief-gradins';

export type Rgb = [number, number, number];

// ---------- la forme ----------

export const COL = 32;
/** La face de la bouche est, la rivière, le bout ouest du chemin creux (px). */
export const XF = 58 * COL;
export const XR0 = 42 * COL;
export const XR1 = 47 * COL;
export const XW = 4.5 * COL;
/** Le bord du dessus (le haut de la marche 4) et la largeur de la masse (px depuis l'axe). */
export const EDGE = STEP.half + 3 * STEP.tread; // 55
export const TOP = STEP.count * STEP.rise; // 100
export const MASS = 175; // 8,75 m : 6 m de dessus au-delà du bord du trou (question 33)
export const SLOPE = 100; // la pente plantée de côté ferme, 5 m
export const MOUTH = 95; // la face de la bouche, de part et d'autre de l'axe
export const RAMP = 200; // les rampes de la ferme au dessus, 10 m
export const FARM_PATH = 30;

export type Kind = 'path' | 'tread' | 'top' | 'slope' | 'grass' | 'farmpath' | 'water' | 'forest' | 'cut';
export interface Ground { h: number; kind: Kind; k?: number; base?: number }

/** La hauteur du chemin (px). */
export function pathH(x: number): number {
  if (x >= XR0) return 0;
  if (x <= XW) return TOP;
  return (TOP * (XR0 - x)) / (XR0 - XW);
}

/** Le terrain en (x, y) ; `cutSouth` : la masse sud tranchée au ras du chemin (ce que voit le joueur dans le trou). */
export function ground(x: number, y: number, cutSouth = false): Ground {
  const g = solid(x, y);
  // la masse sud tranchée au ras du chemin : seulement là où il y a de la masse (l'eau, l'herbe de la ferme restent)
  if (cutSouth && x < XF && y > STEP.half && g.h > pathH(x) + 0.5) return { h: pathH(x), kind: 'cut' };
  return g;
}

function solid(x: number, y: number): Ground {
  const a = Math.abs(y);
  const hp = pathH(x);
  const d = 1 - hp / TOP;
  // la ferme, à l'est de la face de la bouche
  if (x >= XF) {
    const ramp = TOP * Math.max(0, 1 - (x - XF) / RAMP);
    const outer = a <= MASS ? TOP : TOP * Math.max(0, 1 - (a - MASS) / SLOPE);
    const h = a > MOUTH ? Math.min(ramp, outer) : 0;
    if (h > 0.5) return { h, kind: 'slope' };
    return { h: 0, kind: a <= FARM_PATH ? 'farmpath' : 'grass' };
  }
  // le plateau, au-delà du bout ouest du chemin creux
  if (x <= XW) return { h: TOP, kind: a <= FARM_PATH ? 'farmpath' : 'forest' };
  // dans la masse : le trou en gradins
  if (a <= STEP.half) return { h: hp, kind: 'path' };
  if (a <= EDGE) {
    const k = Math.ceil((a - STEP.half) / STEP.tread);
    return { h: hp + STEP.rise * k * d, kind: 'tread', k, base: hp + STEP.rise * (k - 1) * d };
  }
  // le dessus, puis ce qui l'entoure selon le tronçon
  if (x < XR0) return { h: TOP, kind: a > EDGE + 40 ? 'forest' : 'top' };
  if (a <= MASS) return { h: TOP, kind: 'top' };
  if (x < XR1) return { h: 0, kind: 'water' };
  const h = TOP * Math.max(0, 1 - (a - MASS) / SLOPE);
  return h > 0.5 ? { h, kind: 'slope' } : { h: 0, kind: 'grass' };
}

// ---------- les matières ----------

const G = (c: Canvas) => c.toGrid();
const banks = [0, 1, 2, 3].map((k) => G(bankTile(k)));
const treads = [0, 1, 2, 3, 4, 5].map((k) => G(tread(k)));
const risers = [0, 1, 2, 3].map((k) => G(riser(k)));
const cuts = Array.from({ length: CUT_VARIANTS }, (_, k) => G(cut(k)));
const cutsBefore = [0, 1, 2].map((k) => G(cutBefore(k)));

/** Pour la planche 5 (avant / après) : `before` rend la terre en coupe, sa pénombre et le fantôme comme avant les corrections. */
export const MODE = { before: false };
const lanesN = [0, 2, 3, 4].map((v) => G(lane(14, v)));
const lanesS = [0, 2, 3, 4].map((v) => G(lane(11, v)));
const faces = [0, 1, 2].map((k) => G(faceEarth(k)));
const wets = [0, 1].map((k) => G(faceWet(k)));
const T = tileset.tiles as Record<string, Grid>;
const grasses = ['grass', 'grass2', 'grass3', 'grass'].map((k) => T[k]);
const forests = ['forest', 'forest2', 'forest3', 'forest4'].map((k) => T[k]);
const water = T['water-15'];
const pathN = G(pathLane(14, 'w', T['path-14']));
const pathS = G(pathLane(11, 'w', T['path-11']));
const rootsArt = [0, 1, 2, 3].map((k) => G(roots(k)));

const md = (n: number, m: number) => ((n % m) + m) % m;
const pick = <T,>(list: T[], i: number, j: number, s: number) => list[Math.floor(hash(i, j, s) * list.length)];

/** Le signe de la palette `world` d'un dessus en (x, y). */
function topChar(x: number, y: number, g: Ground): string {
  const tx = Math.floor(x / COL);
  const ty = Math.floor(y / COL);
  switch (g.kind) {
    case 'path': {
      const t = pick(y < 0 ? lanesN : lanesS, tx, 0, y < 0 ? 71 : 72);
      return t[y < 0 ? y + STEP.half : y + 6][md(x, COL)];
    }
    case 'tread': {
      const k = g.k ?? 1;
      const t = pick(treads, Math.floor(x / 64), k * (y < 0 ? 1 : -1), 73);
      const far = STEP.half + STEP.tread * k;
      // rangée 0 : contre la marche du dessus ; rangée 9 : l'arête sur la marche du dessous
      const row = y < 0 ? y + far : far - y - 1;
      return t[Math.max(0, Math.min(STEP.tread - 1, row))][md(x, 64)];
    }
    case 'top':
    case 'slope':
      return pick(banks, tx, ty, 74)[md(y, COL)][md(x, COL)];
    case 'grass':
      return pick(grasses, tx, ty, 75)[md(y, COL)][md(x, COL)];
    case 'forest':
      return pick(forests, tx, ty, 76)[md(y, COL)][md(x, COL)];
    case 'water':
      return water[md(y, COL)][md(x, COL)];
    case 'farmpath': {
      if (x >= XF && x < XF + COL) return (y < 0 ? pathN : pathS)[md(y, COL)][md(x, COL)];
      return T[y < 0 ? 'path-14' : 'path-11'][md(y, COL)][md(x, COL)];
    }
    case 'cut':
      if (MODE.before) return pick(cutsBefore, tx, ty, 77)[md(y, COL)][md(x, COL)];
      return cuts[cutVariant(tx, ty)][md(y, COL)][md(x, COL)];
  }
}

/** Les racines posées sur les contremarches, sous les arbres : clé `côté:marche` -> colonnes. */
export type RootMap = Map<string, { x: number; k: number }[]>;

/** Le signe d'une face tournée vers le sud, en (x, yFace), à la hauteur hf ; le dessus au-dessus d'elle est `top`. */
function faceChar(x: number, yFace: number, hf: number, top: Ground, below: Ground, rootMap: RootMap): string {
  const hTop = top.h;
  if (top.kind === 'tread' || (top.kind === 'top' && Math.abs(yFace) <= EDGE + 1) || (top.kind === 'path' && below.kind !== 'path')) {
    // une contremarche : rangée 0 sous l'arête, la dernière au pied ; plus courte, elle garde son haut et son pied
    const span = Math.max(1, hTop - below.h);
    const fromTop = hTop - hf;
    const row = fromTop < span - 3 ? Math.min(STEP.rise - 4, Math.floor(fromTop)) : STEP.rise - 1 - Math.floor(hf - below.h);
    const side = yFace < 0 ? 'n' : 's';
    const k = top.kind === 'tread' ? top.k ?? 1 : 4;
    for (const r of rootMap.get(`${side}:${k}`) ?? []) {
      const i = x - r.x + 7;
      if (i < 0 || i >= 14) continue;
      const ch = rootsArt[r.k][Math.max(0, Math.min(STEP.rise - 1, row))][i];
      if (ch !== '.') return ch;
    }
    return pick(risers, Math.floor(x / 64), k * (yFace < 0 ? 1 : -1), 78)[Math.max(0, Math.min(STEP.rise - 1, row))][md(x, 64)];
  }
  // une grande face de terre (la pente côté rivière, le flanc d'une rampe) : la face du jeu, son pied en bas
  const wet = below.kind === 'water';
  const f = wet ? wets[Math.floor(hash(Math.floor(x / 64), 0, 79) * 2)] : faces[Math.floor(hash(Math.floor(x / 64), 1, 80) * 3)];
  const row = 99 - Math.min(99, Math.max(0, Math.floor(hf - below.h)));
  return f[row][md(x, 64)];
}

// ---------- le rendu ----------

const PAL = new Map(Object.entries(world as Record<string, string>).map(([k, v]) => [k, v]));
export function rgbOf(ch: string): [number, number, number, number] {
  const hex = (PAL.get(ch) ?? '#ff00ff').replace('#', '');
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), hex.length === 8 ? n(6) : 255];
}

/** Une image posée : RGBA, et le point du pied. */
export interface Sprite { w: number; h: number; rgba: Uint8Array; footX: number; footY: number }
export function spriteOf(grid: Grid, palette: Palette, footX: number, footY: number): Sprite {
  const h = grid.length;
  const w = grid[0].length;
  const rgba = new Uint8Array(w * h * 4);
  grid.forEach((line, y) => [...line].forEach((ch, x) => {
    if (ch === '.') return;
    const hex = palette[ch].replace('#', '');
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    rgba.set([n(0), n(2), n(4), hex.length === 8 ? n(6) : 255], (y * w + x) * 4);
  }));
  return { w, h, rgba, footX, footY };
}

/** Ce qui est posé : une image (clé), son pied (x, y) au sol à la hauteur h ; `ghost` : du côté sud, en fantôme. */
export interface Placed { key: string; x: number; y: number; h: number; ghost?: boolean }

/** Un cadre rendu : couleurs, profondeur (y du point vu), hauteur, nature (0 vide, 1 terrain, 2 plante, 3 Xéros). */
export class Raster {
  readonly rgb: Float32Array;
  readonly dep: Float32Array;
  readonly hgt: Float32Array;
  readonly what: Uint8Array;
  readonly kind: (Kind | 'face' | '')[];
  constructor(readonly w: number, readonly h: number, readonly x0: number, readonly r0: number) {
    this.rgb = new Float32Array(w * h * 3);
    this.dep = new Float32Array(w * h).fill(-1e9);
    this.hgt = new Float32Array(w * h);
    this.what = new Uint8Array(w * h);
    this.kind = new Array(w * h).fill('');
  }
  put(i: number, c: Rgb | [number, number, number, number], a = 1) {
    for (let k = 0; k < 3; k++) this.rgb[i * 3 + k] = c[k] * a + this.rgb[i * 3 + k] * (1 - a);
  }
}

export interface RenderOpts {
  x0: number; w: number; r0: number; h: number;
  cutSouth?: boolean;
  /** Ne garder que le terrain au sud de cette ligne (le fantôme). */
  southOnly?: number;
  ymin?: number; ymax?: number;
}

/** Le terrain seul, dans la projection du jeu. */
export function renderTerrain(o: RenderOpts, rootMap: RootMap): Raster {
  const R = new Raster(o.w, o.h, o.x0, o.r0);
  const ymin = o.ymin ?? -500;
  const ymax = o.ymax ?? 500;
  for (let i = 0; i < o.w; i++) {
    const x = o.x0 + i;
    let prev: Ground | null = null;
    let prevRow = -1e9;
    for (let y = ymin; y <= ymax; y++) {
      const g = ground(x, y + 0.5, o.cutSouth);
      if (o.southOnly !== undefined && y < o.southOnly) { prev = g; prevRow = Math.round(y - g.h); continue; }
      const row = Math.round(y - g.h);
      // la face tournée vers le sud : les rangées sautées
      // une pente (rampe, pente plantée) qui descend d'un ou deux pixels par pas : c'est encore son dessus, pas une face
      const gentle = prev && prev.kind === 'slope' && row - prevRow <= 3;
      if (prev && row > prevRow + 1 && gentle) {
        for (let r = prevRow + 1; r < row; r++) {
          const j = r - o.r0;
          if (j < 0 || j >= o.h) continue;
          const p = j * o.w + i;
          R.put(p, rgbOf(topChar(x, y, prev)));
          R.dep[p] = y; R.hgt[p] = prev.h; R.what[p] = 1; R.kind[p] = 'slope';
        }
      } else if (prev && row > prevRow + 1) {
        for (let r = prevRow + 1; r < row; r++) {
          const hf = y - r;
          const j = r - o.r0;
          if (j < 0 || j >= o.h) continue;
          const p = j * o.w + i;
          R.put(p, rgbOf(faceChar(x, y, hf, prev, g, rootMap)));
          R.dep[p] = y; R.hgt[p] = hf; R.what[p] = 1; R.kind[p] = 'face';
        }
      }
      const from = prev && row < prevRow - 1 ? row : row;
      const to = prev && row < prevRow - 1 ? prevRow - 1 : row;
      for (let r = from; r <= to; r++) {
        const j = r - o.r0;
        if (j < 0 || j >= o.h) continue;
        const p = j * o.w + i;
        R.put(p, rgbOf(topChar(x, y, g)));
        R.dep[p] = y; R.hgt[p] = g.h; R.what[p] = 1; R.kind[p] = g.kind;
      }
      prev = g;
      prevRow = row;
    }
  }
  return R;
}

/** Pose les images (triées du nord au sud), cachées par le terrain qui est devant elles (`depth`) ; `alpha` : en fantôme. */
export function drawSprites(R: Raster, things: Placed[], sprite: (key: string) => Sprite, depth = true) {
  for (const p of [...things].sort((a, b) => a.y - b.y || a.h - b.h)) {
    const img = sprite(p.key);
    const sx0 = Math.round(p.x) - img.footX - R.x0;
    const sy0 = Math.round(p.y - p.h) - img.footY - R.r0;
    const isX = p.key.startsWith('xeros');
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
      const o = (j * img.w + i) * 4;
      const a = img.rgba[o + 3];
      if (!a) continue;
      const x = sx0 + i;
      const y = sy0 + j;
      if (x < 0 || y < 0 || x >= R.w || y >= R.h) continue;
      const k = y * R.w + x;
      if (depth && R.what[k] === 1 && R.dep[k] > p.y + 0.5) continue;
      R.put(k, [img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]], a / 255);
      if (a === 255) { R.what[k] = isX ? 3 : 2; R.dep[k] = Math.max(R.dep[k], p.y); R.hgt[k] = p.h; }
    }
  }
}

// ---------- la pénombre ----------

export const GLOOM: Rgb = [0x0b, 0x16, 0x11];
export const GLOOM_MAX = 0.3;
/** La lumière du dehors entre par la bouche est sur 3,5 m. */
export const MOUTH_LIGHT = 70;

/**
 * La pénombre d'un pixel du trou : forte au fond, nulle sur le dessus ; le sol n'en reçoit que `floor` ; s'éclaircit vers la bouche.
 * La terre en coupe (correction 1) reçoit partout, sur toute sa largeur, la pénombre du sol du chemin à la même colonne x (t = 1,
 * × `floor`) : elle est le plan de coupe, au niveau du sol, pas une partie du trou ; avant, seules ses rangées à moins de
 * EDGE + 2 px de l'axe la recevaient entière, ce qui faisait la bande sombre sous le chemin.
 */
export function applyGloom(R: Raster, floor: number, plants = 0.55) {
  for (let k = 0; k < R.w * R.h; k++) {
    if (!R.what[k]) continue;
    const x = R.x0 + (k % R.w);
    if (x >= XF) continue;
    const y = R.dep[k];
    const isCut = R.what[k] === 1 && R.kind[k] === 'cut' && !MODE.before;
    if (Math.abs(y) > EDGE + 2 && R.what[k] === 1 && !isCut) continue;
    const hp = pathH(x);
    const depth = TOP - hp;
    if (depth < 1) continue;
    const t = Math.max(0, Math.min(1, 1 - (R.hgt[k] - hp) / depth));
    const mouth = Math.min(1, (XF - x) / MOUTH_LIGHT);
    let a = GLOOM_MAX * Math.sqrt(t) * mouth * (depth / TOP);
    if (R.what[k] === 2) a *= plants;
    if (R.what[k] === 3) a *= 0.5;
    if (R.kind[k] === 'path' || isCut) a *= floor;
    R.put(k, GLOOM, a);
  }
}

// ---------- ce qui pousse ----------

/** Les clés des grands arbres du jeu (images de src/generated). */
export const BIG = ['big-tree', 'normal-tree'] as const;

/**
 * Une rangée d'arbres et de buissons sur chaque gradin, des deux côtés, de x0 à x1 : noisetiers, jeunes frênes, buissons longs,
 * églantiers, alignés au milieu du gradin, serrés (les houppiers se touchent). Les grands arbres sur le dessus, au bord du trou et
 * plus loin. Le tirage est fixe (graine).
 */
export function plantRows(x0: number, x1: number, seed: number): { things: Placed[]; roots: RootMap } {
  const things: Placed[] = [];
  const rootMap: RootMap = new Map();
  const seq: PlantKey[] = ['gradin-hazel', 'gradin-bush', 'gradin-ash', 'gradin-hazel', 'gradin-briar', 'gradin-ash', 'gradin-bush', 'gradin-hazel', 'gradin-ash'];
  const width: Record<string, number> = { 'gradin-hazel': 40, 'gradin-ash': 30, 'gradin-bush': 28, 'gradin-briar': 18 };
  for (const side of [-1, 1]) for (let k = 1; k <= 3; k++) {
    let x = x0 + Math.floor(hash(k, side, seed) * 30);
    let n = Math.floor(hash(k, side, seed + 1) * seq.length);
    while (x < x1) {
      const key = seq[n % seq.length];
      const w = width[key];
      const px = x + w / 2;
      const y = side * (STEP.half + STEP.tread * (k - 1) + 5);
      const hp = pathH(px);
      if (hp < TOP - 4) {
        const d = 1 - hp / TOP;
        things.push({ key, x: px, y, h: hp + STEP.rise * k * d, ghost: side > 0 });
        if (key === 'gradin-hazel' || key === 'gradin-ash') {
          const id = `${side < 0 ? 'n' : 's'}:${k}`;
          if (!rootMap.has(id)) rootMap.set(id, []);
          rootMap.get(id)!.push({ x: Math.round(px), k: Math.floor(hash(px, k, seed + 2) * 4) });
        }
      }
      x += w - 4 + Math.floor(hash(x, k * side, seed + 3) * 12);
      n++;
    }
  }
  // les grands arbres du dessus, au bord du trou puis un peu plus loin
  for (const side of [-1, 1]) for (const [lane, step] of [[EDGE + 18, 88], [EDGE + 80, 130]] as [number, number][]) {
    let x = x0 + Math.floor(hash(lane, side, seed + 4) * step);
    while (x < x1) {
      const y = side * (lane + Math.floor(hash(x, side, seed + 5) * 14));
      const key = BIG[Math.floor(hash(x, lane, seed + 6) * 2)];
      const g = ground(x, y);
      if (g.kind === 'top' || g.kind === 'forest') things.push({ key, x, y, h: g.h, ghost: side > 0 });
      x += step - 15 + Math.floor(hash(x, lane, seed + 7) * 30);
    }
  }
  return { things, roots: rootMap };
}

export { PLANTS };
