// Les murs de pierre montés par calcul (chantier « pierre », puis « mode construction ») : du code pur (ni Phaser, ni art/),
// partagé par le dessin (art/lib/walls.ts, le morceau de solin art/world/sill-walls.ts, l'essai tools/essai-murs.ts) et par le jeu,
// qui monte le dessin d'un tronçon de mur à la pose, dans le navigateur (world/wallTexture.ts). Les dessins des pierres sont des
// données qu'on lui passe (`wallKit(image)` : les images au sol du jeu, ombre comprise, en caractères de `stonePalette`) :
// art/ les tire d'art/items/stones.ts, le jeu de src/generated/wallStones.ts (écrit par build-art d'après `WALL_STONES`).
//   1. le mur brut : les pierres brutes (manière C) serrées, la pierre couvre l'essentiel de la face : grosses au pied (à plat
//      sur leur lit ou dressées sur deux hauteurs), moyennes à plat, de travers ou en biais, petites entières ou rognées et
//      éclats dans les vides ; joints de 1 à 2 px contours compris, la terre seulement dans les joints ;
//   2. le mur taillé : les moellons (manière B) des trois longueurs mêlées, quelques boutisses (le bout du moellon, sa vue
//      nord-sud), assises à peu près régulières, joints décalés, joints fins (le contour seul, ou un pixel de mortier).
// Une pierre dans le mur montre sa face sud : le dessin du jeu sans les rangées de son dessus (sauf la dernière, l'arête
// éclairée). Les pierres de l'assise haute gardent leur dessin entier : leur dessus fait le dessus du mur.
//
// Taille du mur (`WallSize`) : sa longueur `length` (px), la hauteur de sa face `face` (px), les rangées de son dessus `top`
// (px). L'essai (80 cm de face) n'a au-dessus de sa face que le dessus de l'assise haute (2 ou 3 rangées). Quand le dessus
// est plus profond (le solin : 50 cm d'épaisseur, 5 rangées en raccourci), des rangs de pierres de dessus se posent derrière
// l'assise haute, du nord au sud, chacun recouvert par le suivant : on ne voit de chacune que son dessus. `axis: 'ns'` : le mur
// vu en long (vue nord-sud, règle D) : le dessus court sur toute la hauteur de l'image, la face est le bout du mur, au sud ;
// le mur taillé y couche ses moellons en long, en deux files (leur vue nord-sud).
//
// Le tronçon (`run`) : plusieurs morceaux de solin de 1,60 m montés d'un seul tenant (les pierres et les assises traversent les
// jonctions), ses deux bouts dessinés selon ce qu'ils touchent : tête de mur, angle, ou contre un autre mur. Le mur est monté
// sur toute sa longueur, fenêtre de 32 px après fenêtre (le calcul reste linéaire) ; un bout qui vient contre un autre mur est
// monté plus long puis coupé : ses pierres vont jusqu'au bord, sans contour.

import { Canvas, EMPTY, castShadow, flipX, rng, type Grid } from './gridCanvas';

/** Les images des pierres dont l'algorithme se sert (images au sol du jeu, ombre comprise, palette `stonePalette`). */
export const WALL_STONES: readonly string[] = [
  'big-rough-stone-ground', 'big-rough-stone-ground-b',
  'rough-stone-ground', 'rough-stone-ground-b',
  'small-rough-stone-ground', 'small-rough-stone-ground-b',
  'short-rubble-stone-ground', 'rubble-stone-ground', 'long-rubble-stone-ground',
  'short-rubble-stone-ground-ns', 'rubble-stone-ground-ns', 'long-rubble-stone-ground-ns',
  'stone-chips',
];

/** Taille d'un mur, en pixels du jeu. */
export interface WallSize {
  /** Longueur (largeur de l'image). */
  length: number;
  /** Hauteur de la face sud. */
  face: number;
  /** Rangées du dessus, au-dessus de la face. */
  top: number;
  /** Le mur vu en long (vue nord-sud) : le dessus est fait de pierres couchées dans ce sens. */
  axis?: 'ew' | 'ns';
}

export type WallKind = 'rough' | 'dressed';
/**
 * Un bout de tronçon : `head` tête de mur finie ; `abut` contre le flanc d'un tronçon perpendiculaire ; `corner-<côté>` ce
 * tronçon possède le carré d'angle, un tronçon perpendiculaire en part vers ce côté (`n`, `s` sur un est-ouest ; `e`, `w` sur
 * un nord-sud).
 */
export type RunEnd = 'head' | 'abut' | 'corner-n' | 'corner-s' | 'corner-e' | 'corner-w';
/** Un tronçon : `pieces` morceaux de 1,60 m ; `start` le bout ouest (ou nord), `end` le bout est (ou sud). */
export interface RunSpec { kind: WallKind; axis: 'ew' | 'ns'; pieces: number; start: RunEnd; end: RunEnd; seed: number }

export const MORTAR = 'n'; // mortier de terre, sur la face
const MORTAR_TOP = 'u'; // le même au soleil, sur le dessus du mur
const MORTAR_DARK = 'e'; // contour du mortier côté lumière

/** Longueur d'un morceau de solin (1,60 m), profondeur de son dessus (50 cm en raccourci), hauteur de sa face (40 cm). */
export const PIECE_PX = 32;
const SILL_TOP = 5;
const SILL_FACE = 8;
/** Largeur du mur nord-sud à l'écran (règle D : dessus et face de l'est-ouest, tournés) : le carré d'angle se dessine sur elle. */
export const NS_WIDTH = SILL_TOP + SILL_FACE;
/** Ce qu'on monte en plus au bout qui vient contre un autre mur, puis qu'on coupe. */
const ABUT_MARGIN = 6;

/** Le dessin sans son ombre, recadré sur la silhouette. */
export function bodyOf(g: Grid): Grid {
  const rows = g.map((r) => r.replace(/x/g, EMPTY));
  const filled = (r: string) => /[^.]/.test(r);
  const y0 = rows.findIndex(filled);
  const y1 = rows.length - 1 - [...rows].reverse().findIndex(filled);
  const kept = rows.slice(y0, y1 + 1);
  const x0 = Math.min(...kept.filter(filled).map((r) => r.search(/[^.]/)));
  const x1 = Math.max(...kept.filter(filled).map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  return kept.map((r) => r.slice(x0, x1 + 1));
}

/** Une pierre du jeu prête à maçonner : son image au sol (pour une planche), son dessin entier, sa face dans le mur. */
export interface Piece {
  /** Libellé de la planche. */
  label: string;
  /** Image au sol du jeu (ombre comprise). */
  image: string;
  /** Le dessin sans ombre. */
  full: Grid;
  /** Rangée du dessin où commence ce qui se voit dans le mur (l'arête éclairée du dessus, puis la face sud). */
  crop: number;
  turned?: boolean;
}

const face = (p: Piece) => p.full.slice(p.crop);

/**
 * La pierre retournée bout pour bout (miroir est-ouest), rééclairée : la lumière reste en haut à gauche. Le contour qui
 * touche le vide en bas ou à droite redevient OUTLINE, celui de gauche ou du haut `~` ; l'ombre `;` passée à l'ouest
 * redevient face `=`, et la colonne de face qui touche le nouveau flanc est passe à l'ombre `;`.
 */
function turn(p: Piece): Piece {
  const g = flipX(p.full).map((r) => [...r]);
  const h = g.length, w = g[0].length;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? EMPTY : g[y][x]);
  const src = g.map((r) => [...r]);
  const was = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? EMPTY : src[y][x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = was(x, y);
    if (c === EMPTY) continue;
    const edgeR = was(x + 1, y) === EMPTY || was(x, y + 1) === EMPTY;
    const edgeL = was(x - 1, y) === EMPTY || was(x, y - 1) === EMPTY;
    if ((c === 'o' || c === '~') && (edgeR || edgeL)) g[y][x] = edgeR ? 'o' : '~';
    else if (c === ';') g[y][x] = '=';
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (src[y][x] === EMPTY || g[y][x] === 'o' || g[y][x] === '~') continue;
    // l'éclat blanc passé contre le flanc est (à l'ombre) s'y éteint aussi
    if (at(x + 1, y) === 'o' && '=DR!'.includes(g[y][x])) g[y][x] = ';';
  }
  return { ...p, full: g.map((r) => r.join('')), turned: true };
}

/** Ce qui a été posé, pour une planche. */
export type Used = Map<string, { piece: Piece; n: number }>;

/** Le mur en chantier : les pierres posées (et qui occupe chaque pixel), le mortier, le contour, l'ombre. */
class Wall {
  readonly top: number; // rangée du contour arrière du dessus
  readonly faceTop: number; // première rangée de la face
  readonly ground: number; // rangée du bas (le contour du pied)
  readonly W: number;
  readonly c: Canvas;
  readonly owner: number[][];
  constructor(size: WallSize, topRows: number) {
    this.W = size.length;
    this.top = 0;
    this.faceTop = topRows;
    this.ground = topRows + size.face - 1;
    this.c = new Canvas(this.W, this.ground + 1);
    this.owner = Array.from({ length: this.c.h }, () => Array(this.W).fill(-1));
  }
  /** x permis pour une pierre de largeur w : collée à un bout du mur, ou assez loin pour que le mortier ferme le bord. */
  okX(x: number, w: number): boolean {
    const W = this.W;
    return x >= 0 && x + w <= W && (x === 0 || x >= 2) && (x + w === W || x + w <= W - 2);
  }
  /**
   * Le mortier dans tout ce qui reste du mur (x de 1 à W - 2, jusqu'à la rangée au-dessus du pied), clair sur le dessus du
   * mur (`u`), puis le contour autour du mortier seul (les pierres ont le leur) : `e` en haut et à gauche, OUTLINE en bas et à droite.
   */
  finish(): Grid {
    const W = this.W;
    // le haut du mortier, colonne par colonne : pas au-dessus d'une pierre de l'assise haute (son dessus fait le dessus du
    // mur) ; entre deux pierres, un pixel sous la plus haute de ses voisines (à 3 colonnes près)
    const stoneTop = Array.from({ length: W }, (_, x) => {
      for (let y = 0; y <= this.faceTop + 2; y++) if (this.owner[y][x] >= 0) return y;
      return Infinity;
    });
    const mt = stoneTop.map((t, x) => {
      if (Number.isFinite(t)) return t;
      let near = Infinity;
      for (let i = Math.max(0, x - 3); i < Math.min(W, x + 4); i++) near = Math.min(near, stoneTop[i]);
      return Number.isFinite(near) ? Math.max(this.top + 1, near + 1) : this.top + 1;
    });
    for (let x = 1; x < W - 1; x++) for (let y = mt[x]; y < this.ground; y++) {
      if (this.c.get(x, y) !== EMPTY) continue;
      this.c.set(x, y, y < this.faceTop ? MORTAR_TOP : MORTAR);
    }
    const isM = (x: number, y: number) => { const k = this.c.get(x, y); return k === MORTAR || k === MORTAR_TOP; };
    const add: [number, number, string][] = [];
    for (let y = 0; y < this.c.h; y++) for (let x = 0; x < W; x++) {
      if (this.c.get(x, y) !== EMPTY) continue;
      if (isM(x - 1, y) || isM(x, y - 1)) add.push([x, y, 'o']);
      else if (isM(x + 1, y) || isM(x, y + 1)) add.push([x, y, MORTAR_DARK]);
    }
    for (const [x, y, k] of add) this.c.set(x, y, k);
    return castShadow(this.c.toGrid());
  }
}

// ---------- le mur brut : outils ----------

const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const cell = (g: Grid, x: number, y: number) => g[y]?.[x] ?? EMPTY;

/** Pixel de contour d'un dessin : `o` ou `~` qui touche le vide (une fissure `~` à l'intérieur n'en est pas un). */
const isEdge = (g: Grid, x: number, y: number) =>
  (g[y][x] === 'o' || g[y][x] === '~') && N4.some(([dx, dy]) => cell(g, x + dx, y + dy) === EMPTY);

/** La matière d'une pierre sans son contour (taches, cassures, fissures intérieures gardées). */
function inner(g: Grid): Grid {
  const out = g.map((row, y) => [...row].map((ch, x) => (ch !== EMPTY && isEdge(g, x, y) ? EMPTY : ch)).join(''));
  return bodyOf(out.map((r) => r.replace(/x/g, EMPTY)));
}

/** Une matière reçoit un contour d'un pixel (coins arrondis) : `~` en haut et à gauche, OUTLINE en bas et à droite. */
function reoutline(m: Grid): Grid {
  const c = new Canvas(m[0].length + 2, m.length + 2).stamp(m, 1, 1);
  const add: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== EMPTY) continue;
    if (c.get(x - 1, y) !== EMPTY || c.get(x, y - 1) !== EMPTY) add.push([x, y, 'o']);
    else if (c.get(x + 1, y) !== EMPTY || c.get(x, y + 1) !== EMPTY) add.push([x, y, '~']);
  }
  for (const [x, y, k] of add) c.set(x, y, k);
  return c.toGrid();
}

/**
 * Pierre dressée ou couchée de travers : sa face transposée (lignes et colonnes échangées). La transposition garde la lumière
 * en haut à gauche (l'arête éclairée du haut passe à gauche, le flanc est à l'ombre passe en bas) : un quart de tour de la
 * pierre, vu du même côté.
 */
const transpose = (m: Grid): Grid => Array.from({ length: m[0].length }, (_, x) => m.map((r) => r[x]).join(''));

/** Pierre posée en biais d'un pixel : la moitié haute de sa face décalée d'un pixel (vers l'est si `east`). */
function skew(m: Grid, east: boolean): Grid {
  const h = m.length;
  return m.map((r, j) => ((j < h / 2) === east ? EMPTY + r : r + EMPTY));
}

/** Ce qui se pose dans le mur brut : un dessin, sa pierre d'origine, sa sorte. */
interface Stone {
  g: Grid;
  base: Piece;
  size: 'big' | 'medium' | 'small' | 'bit';
  how: 'flat' | 'upright' | 'across' | 'tilted' | 'cap' | 'trimmed';
}

/** Éclats de taille calés dans un joint, pris au dessin des éclats du jeu (sans contour : ils sont noyés dans la terre). */
const CHIP_BITS: Grid[] = [['!;'], ['+;'], ['=;'], ['.!', '!;'], ['!'], ['+']];

/** Les tables des pierres, calculées une fois par kit d'après leurs dessins. */
interface Tables {
  image: (name: string) => Grid;
  ROUGH: Piece[];
  BIG: Piece[];
  MEDIUM: Piece[];
  SMALL: Piece[];
  RUBBLE: Piece[];
  HEADER: Piece;
  RUBBLE_NS: Grid[];
  STONE_VARIANTS: Stone[];
  BITS: Stone[];
  CAPS: (Stone & { crop: number })[];
  CHIPS: Grid;
}

function tables(image: (name: string) => Grid): Tables {
  // Les pierres brutes : la face commence sous le dessus, à la dernière rangée claire (l'arête qui prend le jour).
  const ROUGH: Piece[] = [
    { label: 'grosse a', image: 'big-rough-stone-ground', crop: 3 },
    { label: 'grosse b', image: 'big-rough-stone-ground-b', crop: 3 },
    { label: 'moyenne a', image: 'rough-stone-ground', crop: 2 },
    { label: 'moyenne b', image: 'rough-stone-ground-b', crop: 2 },
    { label: 'petite a', image: 'small-rough-stone-ground', crop: 1 },
    { label: 'petite b', image: 'small-rough-stone-ground-b', crop: 1 },
  ].map((p) => ({ ...p, full: bodyOf(image(p.image)) }));
  const BIG = ROUGH.slice(0, 2), MEDIUM = ROUGH.slice(2, 4), SMALL = ROUGH.slice(4, 6);
  // Les moellons : couchés en long (panneresses : l'image est-ouest), ou en boutisse (le bout, l'image nord-sud du 40 cm).
  const RUBBLE: Piece[] = [
    { label: 'moellon 30', image: 'short-rubble-stone-ground', crop: 2 },
    { label: 'moellon 40', image: 'rubble-stone-ground', crop: 2 },
    { label: 'moellon 50', image: 'long-rubble-stone-ground', crop: 2 },
  ].map((p) => ({ ...p, full: bodyOf(image(p.image)) }));
  const headerFull = bodyOf(image('rubble-stone-ground-ns'));
  const HEADER: Piece = { label: 'boutisse 40', image: 'rubble-stone-ground-ns', full: headerFull, crop: headerFull.length - 4 };
  /** Les moellons couchés en long dans un mur vu en long (leur vue nord-sud) : on n'en voit que le dessus. */
  const RUBBLE_NS = ['short-rubble-stone-ground-ns', 'rubble-stone-ground-ns', 'long-rubble-stone-ground-ns'].map((k) => bodyOf(image(k)));
  const sizeOf = (p: Piece) => (BIG.includes(p) ? 'big' : MEDIUM.includes(p) ? 'medium' : 'small') as Stone['size'];
  /** Toutes les manières de poser chaque pierre brute (à plat, retournée, debout, de travers, en biais). */
  const STONE_VARIANTS: Stone[] = [];
  for (const p of ROUGH) {
    const size = sizeOf(p);
    for (const q of [p, turn(p)]) {
      STONE_VARIANTS.push({ g: face(q), base: p, size, how: 'flat' });
      const m = inner(face(q));
      if (size === 'big') STONE_VARIANTS.push({ g: reoutline(transpose(m)), base: p, size, how: 'upright' });
      if (size === 'medium') {
        STONE_VARIANTS.push({ g: reoutline(transpose(m)), base: p, size, how: 'across' });
        STONE_VARIANTS.push({ g: reoutline(skew(m, q === p)), base: p, size, how: 'tilted' });
      }
    }
  }
  /**
   * Les pierres de calage : des morceaux rognés des petites et des moyennes (un rectangle de leur matière, 1 à 3 pixels de
   * large sur 1 à 2 de haut, avec un contour neuf) : leurs taches et cassures, en plus petit. Les plus grands d'abord.
   */
  const BITS: Stone[] = [];
  const seen = new Set<string>();
  for (const p of [...SMALL, ...MEDIUM]) {
    const m = inner(face(p));
    for (let h = 2; h >= 1; h--) for (let w = 3; w >= 1; w--) for (let y = 0; y + h <= m.length; y++) for (let x = 0; x + w <= m[0].length; x++) {
      const sub = m.slice(y, y + h).map((r) => r.slice(x, x + w));
      if (sub.some((r) => r.includes(EMPTY))) continue;
      const key = sub.join('/');
      if (seen.has(key) || new Set(sub.join('')).size < 2 && w * h > 1) continue;
      seen.add(key);
      BITS.push({ g: reoutline(sub), base: SMALL.includes(p) ? p : SMALL[MEDIUM.indexOf(p)], size: 'bit', how: 'trimmed' });
    }
  }
  /** Les pierres entières de l'assise haute (le dessin complet : leur dessus fait le dessus du mur), retournées ou non. */
  const CAPS = ROUGH.flatMap((p) => [p, turn(p)].map((q) => ({ g: q.full, base: p, size: sizeOf(p), how: 'cap' as const, crop: q.crop })));
  return { image, ROUGH, BIG, MEDIUM, SMALL, RUBBLE, HEADER, RUBBLE_NS, STONE_VARIANTS, BITS, CAPS, CHIPS: bodyOf(image('stone-chips')) };
}

function count(t: Tables, used: Used, p: Piece): void {
  const e = used.get(p.image) ?? { piece: { ...p, turned: false, full: bodyOf(t.image(p.image)) }, n: 0 };
  e.n++;
  used.set(p.image, e);
}

/**
 * Les deux bouts d'un mur, pour le tronçon : `head` (tête ou angle : le bout est fini, ses pierres d'about sont choisies) ou
 * `free` (le bout sera coupé : rien de particulier). Sans eux, le mur de l'essai, tel que validé.
 */
interface Ends { left: 'head' | 'free'; right: 'head' | 'free' }

/**
 * La forme d'un dessin, calculée une fois : ses pixels pleins (i, j, contour ou non) et son pourtour (le voisin vide de chaque
 * pixel plein, et ce pixel : i + dx, j + dy, i, j), pour poser vite (fitsStone, snug).
 */
const SHAPES = new WeakMap<Grid, { cells: number[]; rim: number[] }>();
function shapeOf(g: Grid): { cells: number[]; rim: number[] } {
  let s = SHAPES.get(g);
  if (s) return s;
  s = { cells: [], rim: [] };
  for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) {
    if (g[j][i] === EMPTY) continue;
    s.cells.push(i, j, isEdge(g, i, j) ? 1 : 0);
    for (const [dx, dy] of N4) if (cell(g, i + dx, j + dy) === EMPTY) s.rim.push(i + dx, j + dy, i, j);
  }
  SHAPES.set(g, s);
  return s;
}

/**
 * Le mur brut en chantier : en plus du mur, pour chaque pixel, ce qui l'occupe (0 rien, 1 contour d'une pierre, 2 sa
 * matière, 3 une pierre du dessus, derrière l'assise haute, que la suivante recouvre). Deux pierres voisines peuvent mettre
 * leur contour l'une sur l'autre (joint d'un pixel) ou côte à côte (deux pixels), jamais leur matière.
 */
class RoughWall extends Wall {
  readonly kind: number[][];
  private ids = 0;
  constructor(size: WallSize, topRows: number) {
    super(size, topRows);
    this.kind = Array.from({ length: this.c.h }, () => Array(this.W).fill(0));
  }
  fitsStone(g: Grid, x: number, y: number, minY = this.top): boolean {
    const { cells } = shapeOf(g);
    for (let k = 0; k < cells.length; k += 3) {
      const px = x + cells[k], py = y + cells[k + 1];
      if (px < 0 || px >= this.W || py < minY || py > this.ground) return false;
      const kd = this.kind[py][px];
      if (kd === 3) continue;
      if (kd === 2 || (kd === 1 && !cells[k + 2])) return false;
    }
    return true;
  }
  /** Part du pourtour de la pierre qui touche déjà quelque chose (pierre, sol, bout du mur) : plus c'est serré, mieux c'est. */
  snug(g: Grid, x: number, y: number): number {
    const { rim } = shapeOf(g);
    let n = 0;
    const all = rim.length / 4;
    for (let k = 0; k < rim.length; k += 4) {
      const px = x + rim[k], py = y + rim[k + 1];
      if (py > this.ground || px < 0 || px >= this.W || (this.kind[py]?.[px] ?? 0) > 0 || this.kind[y + rim[k + 3]][x + rim[k + 2]] > 0) n++;
    }
    return all ? n / all : 0;
  }
  putStone(g: Grid, x: number, y: number): void {
    const id = this.ids++;
    g.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === EMPTY) return;
      const px = x + i, py = y + j, edge = isEdge(g, i, j);
      const was = this.kind[py][px];
      // deux contours l'un sur l'autre : le plus sombre (l'ombre) l'emporte
      if (!(edge && was === 1 && this.c.get(px, py) === 'o')) this.c.set(px, py, ch);
      this.kind[py][px] = was === 3 ? (edge ? 1 : 2) : Math.max(was, edge ? 1 : 2);
      this.owner[py][px] = id;
    }));
  }
  /**
   * Une pierre du dessus, derrière l'assise haute : son dessin sur ses `rows` premières rangées (son dessus, jusqu'à l'arête
   * éclairée ; le reste est caché par le rang suivant ou noyé dans le mortier) ; elle recouvre les rangs plus au nord. Dans un même rang,
   * deux contours l'un sur l'autre : l'ombre l'emporte.
   */
  putBehind(g: Grid, x: number, y: number, rows: number, row: number, rowOf: number[][]): void {
    const id = this.ids++;
    g.slice(0, rows).forEach((line, j) => [...line].forEach((ch, i) => {
      const px = x + i, py = y + j;
      if (ch === EMPTY || py < 0 || py >= this.faceTop || px < 0 || px >= this.W) return;
      if (rowOf[py][px] === row && this.c.get(px, py) === 'o' && isEdge(g, i, j)) return;
      this.c.set(px, py, ch);
      this.kind[py][px] = 3;
      this.owner[py][px] = id;
      rowOf[py][px] = row;
    }));
  }
}

/** Ce qui a été posé dans le mur brut. */
export interface RoughStats { big: number; medium: number; small: number; trimmed: number; chips: number; upright: number; across: number; tilted: number; cover: number }

/** Taille du mur de l'essai (tools/essai-murs.ts) : 1,60 m de long, 80 cm de face. */
export const ESSAY_ROUGH: WallSize = { length: 32, face: 16, top: 3 };
export const ESSAY_DRESSED: WallSize = { length: 32, face: 16, top: 2 };

/** Les fenêtres de calcul d'un mur : un mur court d'une seule (l'essai, le morceau seul), un long de 32 px en 32 px. */
function windows(W: number): [number, number][] {
  if (W <= 40) return [[0, W]];
  const out: [number, number][] = [];
  for (let x0 = 0; x0 < W; x0 += PIECE_PX) out.push([x0, Math.min(W, x0 + PIECE_PX)]);
  // la dernière fenêtre trop étroite rejoint la précédente
  if (out.length > 1 && out[out.length - 1][1] - out[out.length - 1][0] < 16) out[out.length - 2][1] = out.pop()![1];
  return out;
}

/**
 * Le mur brut, à graine fixe. Les pierres se serrent : deux voisines mettent leur contour l'une sur l'autre (joint d'un
 * pixel) ou côte à côte (deux pixels), la terre ne reste que dans ce qu'aucune pierre ne comble. Pas de rangée :
 *   0. (tronçon) à chaque bout fini, une pierre d'about : grosse ou moyenne, à plat, au pied, son flanc le plus droit au bout ;
 *   1. les grosses, au pied et jusqu'à mi-hauteur : à plat sur leur lit, retournées, ou dressées (debout, sur deux hauteurs
 *      de pierre) ; chacune là où elle repose le plus serrée, les plus basses d'abord. Une face basse (moins de 12 px, le
 *      solin) n'en prend qu'une au plus : elles y tiennent mal, et l'assise haute les remplace ;
 *   2. le dessus, s'il est profond : des rangs de pierres entières, du nord au sud, chacun recouvert par le suivant ;
 *   3. l'assise haute : des pierres entières (le dessin complet, leur dessus fait le dessus du mur), serrées de gauche à droite ;
 *   4. le milieu : moyennes à plat, de travers (un quart de tour) ou en biais d'un pixel, chacune là où elle touche le plus ;
 *   5. les petites entières, puis les petites rognées (morceaux de leurs dessins) dans tous les vides où elles tiennent ;
 *   6. des éclats dans les derniers trous de terre.
 * Les étapes 1, 4, 5 et 6 se font fenêtre par fenêtre (32 px ; une pierre peut déborder sur la voisine) : autant de pierres
 * par mètre sur un long mur que sur un court, en un temps proportionnel à la longueur.
 */
function roughWall(t: Tables, seed: number, size: WallSize, ends?: Ends): { grid: Grid; used: Used; stats: RoughStats } {
  const r = rng(Math.imul(seed, 0x9e3779b1) ^ 0x5bd1e995);
  const wall = new RoughWall(size, size.top);
  const W = wall.W;
  const used: Used = new Map();
  const stats: RoughStats = { big: 0, medium: 0, small: 0, trimmed: 0, chips: 0, upright: 0, across: 0, tilted: 0, cover: 0 };
  const all = t.STONE_VARIANTS;
  const placed: { s: Stone; x: number; y: number }[] = [];
  /** Deux fois le même dessin, posé de la même façon, à moins de 14 px (moins sur un mur court) : on le verrait. Deux pierres dressées côte à côte non plus. */
  const near = Math.min(14, Math.round(W * 0.45));
  const twin = (s: Stone, x: number) => placed.some((p) =>
    Math.abs(p.x - x) < near && ((p.s.base === s.base && p.s.how === s.how && s.how !== 'trimmed') || (s.how === 'upright' && p.s.how === 'upright')));
  const put = (s: Stone, x: number, y: number) => {
    placed.push({ s, x, y });
    wall.putStone(s.g, x, y);
    count(t, used, s.base);
    if (s.how === 'trimmed') stats.trimmed++;
    else stats[s.size as 'big' | 'medium' | 'small']++;
    if (s.how === 'upright') stats.upright++;
    if (s.how === 'across') stats.across++;
    if (s.how === 'tilted') stats.tilted++;
  };
  const wins = windows(W);
  let win = wins[0];
  /** Pose la meilleure des pierres `from` (la plus serrée, plus `bias`), si l'une tient ; dit si elle a posé. */
  const best = (from: Stone[], ok: (s: Stone, x: number, y: number, snug: number) => boolean, bias: (s: Stone, x: number, y: number) => number) => {
    let out: { s: Stone; x: number; y: number; v: number } | undefined;
    const [x0, x1] = win;
    for (const s of from) {
      const w = s.g[0].length;
      for (let x = Math.max(0, x0 - (x0 ? 4 : 0)); x < x1 && x <= W - w; x++) {
        if (!wall.okX(x, w)) continue;
        for (let y = wall.faceTop; y + s.g.length - 1 <= wall.ground; y++) {
          if (!wall.fitsStone(s.g, x, y)) continue;
          const sn = wall.snug(s.g, x, y);
          if (!ok(s, x, y, sn)) continue;
          const v = sn + bias(s, x, y) + r() * 0.15 - (twin(s, x) ? 0.6 : 0);
          if (!out || v > out.v) out = { s, x, y, v };
        }
      }
    }
    if (out) put(out.s, out.x, out.y);
    return !!out;
  };
  const bottomOf = (s: Stone, y: number) => y + s.g.length - 1;
  const low = size.face < 12;

  // 0. les pierres d'about des bouts finis (tronçon) : la plus droite du côté du bout, grosse de préférence, au pied
  if (ends) for (const side of ['left', 'right'] as const) {
    if (ends[side] !== 'head') continue;
    const outer = (g: Grid) => g.filter((row) => row[side === 'left' ? 0 : row.length - 1] !== EMPTY).length / g.length;
    const cands = all.filter((s) => s.how === 'flat' && (s.size === 'big' || s.size === 'medium') && s.g.length <= size.face)
      .map((s) => ({ s, k: outer(s.g) + (s.size === 'big' ? 0.3 : 0) + r() * 0.3 }))
      .sort((a, b) => b.k - a.k);
    for (const { s } of cands) {
      const x = side === 'left' ? 0 : W - s.g[0].length, y = wall.ground - s.g.length + 1;
      if (!wall.fitsStone(s.g, x, y)) continue;
      put(s, x, y);
      break;
    }
  }
  // 1. les grosses : 4 ou 5, dont une ou deux dressées, posées sur ce qui est dessous (sur une face basse, une au plus)
  const bigs = all.filter((s) => s.size === 'big');
  for (const w of wins) {
    win = w;
    const nBig = low ? (r() < 0.5 ? 1 : 0) : 3 + (r() < 0.5 ? 1 : 0);
    const up0 = stats.upright;
    for (let k = 0; k < nBig; k++) {
      const pool = bigs.filter((s) => (s.how === 'upright' ? stats.upright - up0 < 2 : true));
      // une pierre sur trois tirée parmi les dressées, pour qu'il y en ait toujours
      const from = !low && (k === 1 || (k === 3 && r() < 0.5)) ? pool.filter((s) => s.how === 'upright') : pool;
      best(from, (s, _x, y, sn) => bottomOf(s, y) >= wall.ground - 6 && sn > 0.2,
        (s, _x, y) => 0.12 * (bottomOf(s, y) - wall.ground));
    }
  }
  // 2. le dessus profond : des rangs de pierres entières derrière l'assise haute, du nord (rangée 0) au sud, tous les 3
  // pixels à peu près (le dessus d'une moyenne) ; de chacune on ne voit que le dessus, jusqu'à son arête éclairée : sa face
  // est contre la pierre suivante, au même niveau, cachée
  // (le dernier rang finit sous le haut de l'assise haute, qui le recouvre : pas de bande de mortier entre les deux)
  const backRows: number[] = [];
  if (size.top >= 5) {
    const span = wall.faceTop - 3, n = Math.ceil(span / 3) + 1;
    for (let i = 0; i < n; i++) backRows.push(Math.round((i * span) / (n - 1)));
  }
  const rowOf = Array.from({ length: wall.c.h }, () => Array(W).fill(-1));
  // pas deux fois le même dessin côte à côte, ni juste au nord (à 4 px près) : la répétition se verrait sur un long dessus
  let prev: { x: number; s: Stone }[] = [];
  backRows.forEach((y0, row) => {
    const cur: { x: number; s: Stone }[] = [];
    for (let x = row % 2 === 0 ? 0 : -2; x < W - 1;) {
      // des moyennes et des petites, une grosse de temps en temps
      const w = { medium: 0, small: 0.35, big: 0.8, bit: 1 };
      const seen = (s: Stone) => cur.at(-1)?.s.base === s.base || prev.some((p) => p.s.base === s.base && Math.abs(p.x - x) <= 4);
      const c = t.CAPS.map((s) => ({ s, k: w[s.size] + r() + (seen(s) ? 2 : 0) })).sort((a, b) => a.k - b.k)[0].s;
      const cw = c.g[0].length;
      const px = Math.max(0, Math.min(x, W - cw));
      cur.push({ x: px, s: c });
      // à la fin du rang, la dernière pierre se serre contre le bout du mur, quitte à passer sur sa voisine
      wall.putBehind(c.g, px, y0, Math.max(3, c.crop + 1), row, rowOf);
      count(t, used, c.base);
      stats[c.size as 'big' | 'medium' | 'small']++;
      x = px + cw - (r() < 0.6 ? 1 : 0);
    }
    prev = cur;
  });
  // 3. l'assise haute, serrée de gauche à droite : dessin entier, la face au ras de celle du mur ou un pixel plus bas
  const caps = t.CAPS;
  for (let x = 0; x < W - 3;) {
    let done = false;
    // surtout des moyennes et des petites en haut (les grosses sont au pied), une grosse de temps en temps
    const w = { medium: 0, small: 0.45, big: 0.7, bit: 1 };
    const order = caps.map((c) => ({ c, k: w[c.size] + r() })).sort((a, b) => a.k - b.k).map((o) => o.c);
    for (const c of order) {
      const crop = c.crop;
      for (const dx of [0, -1, 1]) {
        const px = x + dx, y = wall.faceTop - crop + (r() < 0.35 ? 1 : 0);
        if (!wall.okX(px, c.g[0].length) || !wall.fitsStone(c.g, px, y) || twin(c, px)) continue;
        put(c, px, y);
        x = px + c.g[0].length - (r() < 0.6 ? 1 : 0);
        done = true;
        break;
      }
      if (done) break;
    }
    if (!done) x++;
  }
  for (const w of wins) {
    win = w;
    // 4. le milieu : moyennes (et une grosse si elle tient), à plat, de travers, en biais
    const mids = all.filter((s) => s.size === 'medium' || s.size === 'big');
    for (let k = 0; k < 6; k++) if (!best(mids, (_s, _x, _y, sn) => sn > 0.35, (s) => (s.size === 'big' ? 0.1 : 0) + (s.how !== 'flat' ? 0.15 : 0))) break;
    // 5. les petites entières, puis rognées, partout où elles tiennent bien calées
    const smalls = all.filter((s) => s.size === 'small');
    for (let k = 0; k < 20; k++) if (!best(smalls, (_s, _x, _y, sn) => sn > 0.4, () => 0)) break;
    for (let k = 0; k < 60; k++) if (!best(t.BITS, (_s, _x, _y, sn) => sn > 0.45, (s) => 0.02 * s.g.length * s.g[0].length)) break;
  }
  // 6. les éclats, dans les trous de terre qui restent (là où ils ne couvrent que du vide, sous le dessus du mur)
  for (const [x0, x1] of wins) for (let k = 0; k < 40; k++) {
    let done = false;
    for (const g of CHIP_BITS) {
      for (let y = wall.faceTop + 1; y + g.length <= wall.ground && !done; y++) for (let x = Math.max(1, x0); x < x1 && x + g[0].length < W - 1 && !done; x++) {
        let ok = true;
        for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) if (g[j][i] !== EMPTY && wall.kind[y + j][x + i] !== 0) ok = false;
        // un éclat seulement dans un trou de 2 pixels au moins de large ou de haut, pas sur la ligne d'un joint
        const room = [[-1, 0], [g[0].length, 0]].filter(([dx]) => wall.kind[y][x + dx] === 0).length + (wall.kind[y - 1]?.[x] === 0 ? 1 : 0) + (wall.kind[y + g.length]?.[x] === 0 ? 1 : 0);
        if (!ok || room < 1 || r() < 0.5) continue;
        wall.c.stamp(g, x, y);
        g.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== EMPTY) wall.kind[y + j][x + i] = 2; }));
        stats.chips++;
        done = true;
      }
      if (done) break;
    }
    if (!done) break;
  }
  // la terre dans les joints : là où deux contours sont côte à côte (l'ombre d'une pierre, puis le contour clair de la
  // voisine), le contour clair devient souvent de la terre : un joint de deux pixels, contour et terre
  const earthy: [number, number][] = [];
  for (let y = wall.faceTop; y < wall.ground; y++) for (let x = 1; x < W - 1; x++) {
    if (wall.c.get(x, y) !== '~' || wall.kind[y][x] !== 1) continue;
    const o = wall.owner[y][x];
    const shadowed = ([[-1, 0], [0, -1]] as const).some(([dx, dy]) => wall.c.get(x + dx, y + dy) === 'o' && wall.owner[y + dy][x + dx] !== o);
    if (shadowed && r() < 0.7) earthy.push([x, y]);
  }
  for (const [x, y] of earthy) { wall.c.set(x, y, MORTAR); wall.kind[y][x] = 0; }
  if (stats.chips) used.set('stone-chips', { piece: { label: 'eclats', image: 'stone-chips', full: t.CHIPS, crop: 0 }, n: stats.chips });
  const grid = wall.finish();
  // part de la surface du mur couverte par la pierre (contours compris), le reste est la terre des joints
  let stone = 0, earth = 0;
  wall.c.px.forEach((row, y) => row.forEach((ch, x) => { if (ch === MORTAR || ch === MORTAR_TOP) earth++; else if (wall.kind[y][x] > 0) stone++; }));
  stats.cover = stone / (stone + earth);
  return { grid, used, stats };
}

// ---------- le mur taillé ----------

/**
 * La face d'un moellon dans le mur : ses coins abattus laissent voir le mortier (les quatre coins de la face, ou les deux du
 * bas dans l'assise haute), et une fois sur trois son contour du bas devient un pixel de mortier : le joint de lit n'est pas
 * un trait continu, comme dans la brique.
 */
function notch(g: Grid, r: () => number, o: { top: boolean; bottom: boolean; left: boolean; right: boolean }): Grid {
  const rows = g.map((row) => [...row]);
  const h = rows.length, w = rows[0].length;
  if (o.top && o.left) rows[0][0] = EMPTY;
  if (o.top && o.right) rows[0][w - 1] = EMPTY;
  if (o.bottom && o.left) rows[h - 1][0] = EMPTY;
  if (o.bottom && o.right) rows[h - 1][w - 1] = EMPTY;
  if (o.bottom && r() < 0.33) for (let x = 1; x < w - 1; x++) rows[h - 1][x] = MORTAR;
  return rows.map((row) => row.join(''));
}

const COURSE = 4; // 20 cm, la hauteur d'un moellon : l'assise, joint compris

/** Une assise : les pierres de gauche à droite (largeur de leur dessin) et le joint qui suit chacune (0 : contour commun, 1 : un pixel de mortier). */
interface Course { pieces: Piece[]; joints: number[]; xs: number[] }

function layout(pieces: Piece[], joints: number[]): number[] {
  const xs: number[] = [];
  let x = 0;
  pieces.forEach((p, i) => { xs.push(x); x += p.full[0].length - 1 + joints[i]; });
  return xs;
}
/** Abscisses des joints verticaux d'une assise (la colonne du contour commun, ou la colonne de mortier). */
const jointXs = (c: Course) => c.xs.slice(1).map((x, i) => x - (c.joints[i] === 1 ? 1 : 0));

/**
 * Une assise d'un mur court (l'essai, le morceau seul) : tirée entière, recommencée tant que ses joints ne sont pas décalés
 * de ceux des deux assises du dessous. `chainRight` (tronçon) : le bout est fini aussi, la boutisse y alterne d'une assise à
 * l'autre comme au bout ouest.
 */
function course(t: Tables, W: number, r: () => number, prev: Course | undefined, prev2: Course | undefined, first: boolean, chainRight: boolean): Course {
  const HEADER = t.HEADER;
  const lastHeader = chainRight ? (first ? r() < 0.5 : !(prev?.pieces.at(-1) === HEADER)) : false;
  for (let tries = 0; ; tries++) {
    const pieces: Piece[] = [];
    const joints: number[] = [];
    let x = 0;
    // un bout du mur sur deux commence par une boutisse, en alternance d'une assise à l'autre (le chaînage des angles)
    const headerFirst = first ? r() < 0.5 : !(prev?.pieces[0] === HEADER);
    while (x < W) {
      const left = W - x;
      let p: Piece;
      if (pieces.length === 0 && headerFirst) p = HEADER;
      else {
        const opts = [...t.RUBBLE, ...t.RUBBLE, HEADER];
        p = opts[Math.floor(r() * opts.length)];
      }
      const w = p.full[0].length;
      if (w > left) break;
      pieces.push(p);
      const j = r() < 0.3 ? 1 : 0;
      joints.push(j);
      x += w - 1 + j;
      if (x + 1 === W) break; // la dernière pierre ferme le mur : son contour droit sur la dernière colonne
    }
    if (!pieces.length) continue;
    const end = layout(pieces, joints).at(-1)! + pieces.at(-1)!.full[0].length;
    if (end !== W) continue;
    if (chainRight && tries < 500 && (pieces.at(-1) === HEADER) !== lastHeader) continue;
    const c: Course = { pieces, joints, xs: layout(pieces, joints) };
    const lens = new Set(pieces.map((p) => p.image));
    if (lens.size < 2 && tries < 500) continue;
    if (pieces.filter((p) => p === HEADER).length > 2 && tries < 500) continue;
    const j = jointXs(c);
    const near = prev ? jointXs(prev) : [];
    const far = prev2 ? jointXs(prev2) : [];
    if (tries < 2000 && !j.every((a) => near.every((b) => Math.abs(a - b) >= 2) && far.every((b) => Math.abs(a - b) >= 1))) continue;
    return c;
  }
}

/**
 * Une assise d'un long mur (le tronçon) : pierre après pierre, chacune tirée parmi celles dont le joint tombe à 10 cm au moins
 * des joints de l'assise du dessous (5 cm de celle d'en dessous encore), et qui laissent de quoi finir l'assise juste au bout ;
 * une boutisse par 80 cm au plus ; le chaînage aux deux bouts comme dans l'assise courte.
 */
function longCourse(t: Tables, W: number, r: () => number, prev: Course | undefined, prev2: Course | undefined, first: boolean, chainRight: boolean): Course {
  const HEADER = t.HEADER;
  const near = prev ? jointXs(prev) : [];
  const far = prev2 ? jointXs(prev2) : [];
  const headerFirst = first ? r() < 0.5 : !(prev?.pieces[0] === HEADER);
  const lastHeader = chainRight ? (first ? r() < 0.5 : !(prev?.pieces.at(-1) === HEADER)) : undefined;
  const maxHeaders = Math.max(2, Math.round(W / 16));
  const hw = HEADER.full[0].length;
  const widths = [...new Set([...t.RUBBLE, HEADER].map((p) => p.full[0].length))];
  const minAdv = Math.min(...widths) - 1;
  /** Peut-on finir l'assise sur `rem` colonnes (la dernière pierre au ras du bout) ? */
  const closeable = (rem: number): boolean => {
    if (lastHeader === true) return rem === hw || rem >= hw + minAdv;
    if (lastHeader === false) return t.RUBBLE.some((p) => p.full[0].length === rem) || rem >= Math.max(...widths) + 1;
    return widths.includes(rem) || rem >= Math.max(...widths) + 1;
  };
  for (let tries = 0; ; tries++) {
    const pieces: Piece[] = [];
    const joints: number[] = [];
    let x = 0, headers = 0;
    let ok = true;
    while (x < W) {
      const rem = W - x;
      const opts: { p: Piece; j: number; v: number }[] = [];
      const pool = pieces.length === 0 && headerFirst ? [HEADER] : [...t.RUBBLE, ...t.RUBBLE, HEADER];
      for (const p of pool) for (const j of [0, 1]) {
        const w = p.full[0].length;
        if (w > rem) continue;
        if (p === HEADER && headers >= maxHeaders && !(pieces.length === 0 && headerFirst)) continue;
        if (w === rem) {
          if (j) continue;
          if (lastHeader !== undefined && (p === HEADER) !== lastHeader) continue;
          opts.push({ p, j, v: r() + 0.5 });
          continue;
        }
        const next = rem - (w - 1 + j);
        if (!closeable(next)) continue;
        const jx = x + w - 1;
        const staggered = near.every((b) => Math.abs(jx - b) >= 2) && far.every((b) => Math.abs(jx - b) >= 1);
        if (!staggered && tries < 20) continue;
        opts.push({ p, j, v: r() + (j ? -0.4 : 0) + (staggered ? 0 : -2) });
      }
      if (!opts.length) { ok = false; break; }
      const pick = opts.reduce((a, b) => (b.v > a.v ? b : a));
      pieces.push(pick.p);
      joints.push(pick.j);
      if (pick.p === HEADER) headers++;
      if (pick.p.full[0].length === rem) break;
      x += pick.p.full[0].length - 1 + pick.j;
    }
    if (!ok && tries < 40) continue;
    return { pieces, joints, xs: layout(pieces, joints) };
  }
}

/** Le dessus d'un moellon couché (son dessin sans sa face ni son contour du bas) : ce qu'on en voit sous le rang suivant. */
const topOf = (g: Grid, faceRows = 3) => g.slice(0, g.length - faceRows);

/**
 * Le dessus profond du mur taillé, derrière l'assise haute (rangées 0 à `until` - 1). Vu de face (`ew`) : un rang de moellons
 * couchés en long (leur dessus : le contour arrière et deux rangées), joints décalés. Vu en long (`ns`) : deux files de
 * moellons couchés dans le sens du mur (leur vue nord-sud, dessus seul), un pixel de mortier entre les deux, chaque moellon
 * posé contre le précédent (contour commun ou un pixel de mortier), les joints d'une file décalés de ceux de l'autre.
 */
function dressedTop(t: Tables, wall: Wall, r: () => number, axis: 'ew' | 'ns', until: number, used: Used): void {
  const W = wall.W;
  const stamp = (g: Grid, x: number, y: number) => g.forEach((row, j) => [...row].forEach((ch, i) => {
    const px = x + i, py = y + j;
    if (ch === EMPTY || py < 0 || py >= until || px < 0 || px >= W) return;
    wall.c.set(px, py, ch);
    wall.owner[py][px] = 9999;
  }));
  if (axis === 'ew') {
    for (let x = r() < 0.5 ? 0 : -3; x < W - 2;) {
      const p = t.RUBBLE[Math.floor(r() * t.RUBBLE.length)];
      const q = r() < 0.4 ? turn(p) : p;
      const g = q.full.slice(0, 3);
      const px = x < 0 ? x : Math.min(x, W - g[0].length);
      stamp(g, px, 0);
      count(t, used, p);
      x = px + g[0].length - 1 + (r() < 0.3 ? 1 : 0);
    }
    return;
  }
  // deux files : la première contre le bord ouest, la seconde contre le bord est, un pixel de mortier entre elles
  const colW = t.RUBBLE_NS[0][0].length;
  const files = [0, W - colW];
  files.forEach((x0, f) => {
    let y = f === 0 ? 0 : -(2 + Math.floor(r() * 3));
    while (y < until) {
      const k = Math.floor(r() * t.RUBBLE_NS.length);
      const full = t.RUBBLE_NS[k];
      const p: Piece = { label: '', image: '', full, crop: 0 };
      const g = topOf(r() < 0.4 ? turn(p).full : full);
      stamp(g, x0, y);
      count(t, used, t.RUBBLE[k]);
      y += g.length - 1 + (r() < 0.25 ? 1 : 0);
    }
  });
  // le mortier entre les deux files (au soleil), sous le contour du bout nord
  for (let x = colW; x < W - colW; x++) for (let y = 1; y < until; y++) if (wall.c.get(x, y) === EMPTY) {
    wall.c.set(x, y, MORTAR_TOP);
    wall.owner[y][x] = 9999;
  }
}

/**
 * Le mur taillé, à graine fixe : des assises de 20 cm, de bas en haut. Dans chaque assise, les moellons des trois longueurs
 * mêlés et une ou deux boutisses ; un bout du mur sur deux commence par une boutisse, en alternance (le chaînage). Joint
 * vertical : le contour commun de deux pierres (une fois sur trois, un pixel de mortier), décalé d'au moins 10 cm de ceux de
 * l'assise du dessous. Joint de lit : le contour du bas de la pierre du dessus, posé sur l'arête éclairée de celle du dessous ;
 * une pierre sur quatre environ est plus basse d'un pixel (un pixel de mortier dessus). L'assise haute garde le dessin entier
 * (le dessus du moellon fait le dessus du mur) ; sur un dessus profond (le solin), la boutisse y montre tout son long dessus
 * (elle traverse le mur), et un rang de dessus (`dressedTop`) se pose derrière. Puis quelques éclats (pris au dessin des
 * éclats du jeu) calés là où le mortier fait un vide (trois par 1,60 m).
 */
function dressedWall(t: Tables, seed: number, size: WallSize, ends?: Ends): { grid: Grid; used: Used } {
  const r = rng(Math.imul(seed, 0x85ebca6b) ^ 0xc2b2ae35);
  const wall = new Wall(size, size.top);
  const W = wall.W;
  const courses = Math.round(size.face / COURSE);
  const deep = size.top >= 5;
  const used: Used = new Map();
  const cs: Course[] = [];
  const chainRight = ends?.right === 'head';
  const build = W > 40 ? longCourse : course;
  for (let ci = 0; ci < courses; ci++) cs.push(build(t, W, r, cs[ci - 1], cs[ci - 2], ci === 0, chainRight));
  if (deep) dressedTop(t, wall, r, size.axis ?? 'ew', wall.faceTop - 1, used);
  // le haut de ce qui est posé, colonne par colonne : chaque pierre repose sur le plus haut de ce qu'elle couvre
  const sky = Array(W).fill(wall.ground + 1);
  cs.forEach((c, ci) => {
    const cap = ci === courses - 1;
    const target = wall.ground - COURSE * (ci + 1) + 1; // première rangée de l'assise, si tout était au cordeau
    const put: { x: number; y: number; g: Grid }[] = [];
    c.pieces.forEach((p0, i) => {
      const p = r() < 0.4 ? turn(p0) : p0;
      const x = c.xs[i], w = p.full[0].length;
      // elle repose sur le plus haut de ce qu'elle couvre ; une fois sur cinq, sur un lit de mortier d'un pixel, s'il reste la
      // place d'une face de 4 rangées
      let bottom = wall.ground + 1;
      for (let k = x; k < x + w; k++) bottom = Math.min(bottom, sky[k]);
      bottom--;
      if (ci > 0 && r() < 0.2 && bottom - 1 - target + 1 >= 4) bottom--;
      // hauteur de la face : ce qui ramène son haut à la ligne de l'assise (3 à 5 rangées, 4 d'ordinaire) ; une fois sur
      // cinq, un pixel plus basse (du mortier au-dessus, la pierre du dessus repose sur ses voisines)
      let h = Math.max(3, Math.min(5, bottom - target + 1));
      if (!cap && h > 3 && r() < 0.2) h--;
      if (cap) h = Math.min(h, bottom - 2 + 1); // le dessus de l'assise haute reste dans l'image
      const fc = p.full.slice(p.full.length - h);
      // l'assise haute : le contour arrière et la rangée de dessus du dessin, puis la face (la boutisse ne montre de son long
      // dessus que l'épaisseur du mur : sur un dessus profond, tout son dessus)
      // (ni au pied du mur ni à ses deux bouts, qui restent pleins)
      const head = cap && deep && p.image === t.HEADER.image ? p.full.slice(0, p.full.length - 4) : [p.full[0], p.full[1]];
      const g = notch(cap ? [...head, ...fc] : fc, r, { top: !cap, bottom: ci > 0, left: x > 0, right: x + w < W });
      put.push({ x, y: bottom - g.length + 1, g });
      count(t, used, p);
    });
    // de droite à gauche : le contour de la pierre de gauche (OUTLINE, l'ombre) reste dans le joint commun
    for (let i = put.length - 1; i >= 0; i--) {
      const { x, y, g } = put[i];
      g.forEach((row, j) => [...row].forEach((ch, k) => {
        if (ch === EMPTY || y + j < 0) return;
        wall.c.set(x + k, y + j, ch);
        wall.owner[y + j][x + k] = ci * 100 + i;
        sky[x + k] = Math.min(sky[x + k], y + j);
      }));
    }
    // joints verticaux : le contour commun (OUTLINE), une fois sur quatre un pixel de mortier à sa place ; le joint ouvert
    // (une colonne de plus) garde le contour de la pierre de gauche et met un pixel de mortier à la place de celui de droite
    for (let i = 1; i < put.length; i++) {
      const open = c.joints[i - 1] === 1;
      if (!open && r() >= 0.25) continue;
      const jx = put[i].x;
      const y0 = Math.max(put[i].y, put[i - 1].y) + (cap ? 2 : 0), y1 = Math.min(put[i].y + put[i].g.length, put[i - 1].y + put[i - 1].g.length) - 1;
      for (let y = y0 + 1; y < y1; y++) if ('o~'.includes(wall.c.get(jx, y))) wall.c.set(jx, y, MORTAR);
    }
  });
  // éclats : fragments du dessin des éclats du jeu, là où le mortier fait un vide d'au moins leur taille
  const chips: Grid[] = [['!;'], ['+;'], ['.!', '!;']];
  const spots: [number, number, Grid][] = [];
  for (const g of chips) for (let y = wall.faceTop; y + g.length < wall.ground; y++) for (let x = 2; x + g[0].length < W - 2; x++) {
    let ok = true;
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) if (g[j][i] !== EMPTY && wall.c.get(x + i, y + j) !== EMPTY) ok = false;
    if (ok) spots.push([x, y, g]);
  }
  const placed: [number, number][] = [];
  const most = 3 * Math.max(1, Math.round(W / PIECE_PX));
  for (let n = 0; n < 20 * most && placed.length < most && spots.length; n++) {
    const [x, y, g] = spots[Math.floor(r() * spots.length)];
    if (placed.some(([px, py]) => Math.abs(px - x) < 6 && Math.abs(py - y) < 4)) continue;
    wall.c.stamp(g, x, y);
    placed.push([x, y]);
  }
  if (placed.length) used.set('stone-chips', { piece: { label: 'eclats', image: 'stone-chips', full: t.CHIPS, crop: 0 }, n: placed.length });
  return { grid: wall.finish(), used };
}

// ---------- le tronçon ----------

/** Une grille recopiée (colonnes x0 à x1 exclu, rangées y0 à y1 exclu). */
const crop = (g: Grid, x0: number, x1: number, y0: number, y1: number): Grid => g.slice(y0, y1).map((r) => r.slice(x0, x1));

/** Colle `g` dans `dst` en (x, y), pixel vide compris (le carré d'angle remplace ce qui était là). */
function paste(dst: string[][], g: Grid, x: number, y: number): void {
  g.forEach((row, j) => [...row].forEach((ch, i) => {
    if (dst[y + j]?.[x + i] !== undefined) dst[y + j][x + i] = ch;
  }));
}

const isOutline = (ch: string) => ch === 'o' || ch === '~' || ch === MORTAR_DARK;

/** L'algorithme des murs, nourri des dessins des pierres. */
export interface WallKit {
  /** Le dessin d'un tronçon (contrat : en-tête de ce fichier et `run` ci-dessous). */
  run(spec: RunSpec): Grid;
  /** Le mur brut d'une taille donnée (l'essai par défaut). */
  roughWall(seed: number, size?: WallSize): { grid: Grid; used: Used; stats: RoughStats };
  /** Le mur taillé d'une taille donnée (l'essai par défaut). */
  dressedWall(seed: number, size?: WallSize): { grid: Grid; used: Used };
  /** Les pierres du kit, pour les planches (tools/essai-murs.ts). */
  pieces: { rough: readonly Piece[]; rubble: readonly Piece[]; header: Piece };
}

/**
 * Le kit des murs : `image(nom)` rend l'image au sol du jeu d'une pierre de `WALL_STONES` (ombre comprise). Les tables (pierres,
 * leurs manières de poser, les morceaux de calage) se calculent une fois ici.
 */
export function wallKit(image: (name: string) => Grid): WallKit {
  const t = tables(image);
  const build = (kind: WallKind, seed: number, size: WallSize, ends?: Ends) =>
    (kind === 'rough' ? roughWall(t, seed, size, ends) : dressedWall(t, seed, size, ends)).grid;

  /**
   * Le dessus du mur nord-sud, `rows` rangées, pris au milieu d'un mur nord-sud monté pour l'occasion (sans contour au nord
   * ni au sud) ou à son bout nord (`north` : le contour arrière en rangée 0). 13 colonnes, plus celle de l'ombre.
   */
  const nsTop = (kind: WallKind, seed: number, rows: number, north: boolean): Grid => {
    const skip = north ? 0 : 6;
    const g = build(kind, seed, { length: NS_WIDTH, face: SILL_FACE, top: rows + skip + 12, axis: 'ns' });
    return crop(g, 0, NS_WIDTH + 1, skip, skip + rows);
  };

  /**
   * Le tronçon est-ouest : largeur 32 × pieces + 1, hauteur 13 + 1. Monté d'un tenant ; un bout `abut` est monté 6 px plus
   * long puis coupé. Le carré d'angle (`corner-n`, `corner-s`) se dessine sur les 13 colonnes de son bout (la largeur du mur
   * nord-sud à l'écran, règle D) : le dessus du mur nord-sud y passe, il croise le dessus de l'est-ouest ; `corner-s`
   * (le mur nord-sud part vers le sud, sous lui à l'écran) : sur toute la hauteur de l'image, rangée d'ombre comprise (le
   * mur nord-sud commence à la rangée suivante) ; `corner-n` (il arrive du nord) : sur les 5 rangées du dessus, la face reste,
   * finie comme une tête (chaînage).
   */
  const runEW = (spec: RunSpec): Grid => {
    const W = PIECE_PX * spec.pieces;
    const mL = spec.start === 'abut' ? ABUT_MARGIN : 0, mR = spec.end === 'abut' ? ABUT_MARGIN : 0;
    const ends: Ends = { left: mL ? 'free' : 'head', right: mR ? 'free' : 'head' };
    const g = build(spec.kind, spec.seed, { length: W + mL + mR, face: SILL_FACE, top: SILL_TOP, axis: 'ew' }, ends);
    const out = crop(g, mL, mL + W + 1, 0, g.length).map((r) => [...r]);
    const H = out.length; // 14
    ([['start', 0], ['end', 1]] as const).forEach(([which, k]) => {
      const e = spec[which];
      if (e !== 'corner-n' && e !== 'corner-s') return;
      const x = k === 0 ? 0 : W - NS_WIDTH;
      const sub = spec.seed * 7 + 13 + k;
      if (e === 'corner-s') {
        // le dessus nord-sud depuis le bord nord du mur, jusqu'à la dernière rangée de l'image ; au bout est, son ombre aussi
        const top = nsTop(spec.kind, sub, H, true);
        paste(out, k === 0 ? crop(top, 0, NS_WIDTH, 0, H) : top, x, 0);
      } else {
        paste(out, crop(nsTop(spec.kind, sub, SILL_TOP, false), 0, NS_WIDTH, 0, SILL_TOP), x, 0);
      }
    });
    return out.map((r) => r.join(''));
  };

  /**
   * Le tronçon nord-sud (règle D) : largeur 13 + 1, hauteur 32 × pieces + 1, rangée r = le sol à r px du bout nord. Le dessus
   * court sur toute la longueur ; la bande de bout (la face de 40 cm, 8 rangées) n'est qu'au bout sud, s'il est une tête ou un
   * angle. Un bout `abut` est monté plus long puis coupé. Un angle au bout sud (`corner-e`, `corner-w`) : la bande de bout est la
   * face du mur est-ouest qui en part (même rangées à l'écran) : son contour de ce côté s'efface, la face continue. Un angle au
   * bout nord se dessine comme une tête (le mur est-ouest qui en part dépasse de 4 rangées au nord : à éviter, voir `run`).
   */
  const runNS = (spec: RunSpec): Grid => {
    const L = PIECE_PX * spec.pieces;
    const mN = spec.start === 'abut' ? ABUT_MARGIN : 0;
    const band = spec.end !== 'abut';
    const top = band ? L - SILL_FACE + mN : L + mN + 12;
    const g = build(spec.kind, spec.seed, { length: NS_WIDTH, face: SILL_FACE, top, axis: 'ns' });
    const out = crop(g, 0, NS_WIDTH + 1, mN, mN + L + 1).map((r) => [...r]);
    if (spec.end === 'corner-e' || spec.end === 'corner-w') {
      const east = spec.end === 'corner-e';
      const edge = east ? NS_WIDTH - 1 : 0, inside = east ? NS_WIDTH - 2 : 1;
      for (let y = L - SILL_FACE; y < L; y++) {
        if (isOutline(out[y][edge])) out[y][edge] = isOutline(out[y][inside]) ? MORTAR : out[y][inside];
        if (east && out[y][NS_WIDTH] === 'x') out[y][NS_WIDTH] = out[y][edge];
      }
    }
    return out.map((r) => r.join(''));
  };

  return {
    /**
     * Le dessin d'un tronçon de `pieces` morceaux de 1,60 m, d'un seul tenant, déterministe (même graine, même dessin).
     * Est-ouest : 32 × pieces + 1 sur 14 (colonne c = le sol à c px du bout ouest, bas de l'image au bord sud, ombre comprise).
     * Nord-sud : 14 sur 32 × pieces + 1. Qui possède l'angle : de préférence le tronçon est-ouest (`corner-s` au nord de
     * l'enceinte, `corner-n` au sud) ; le nord-sud qui en part est `abut` de ce côté, son image calée sur le bord extérieur du
     * carré d'angle (ses 13 colonnes au ras du bout du mur est-ouest).
     */
    run(spec: RunSpec): Grid {
      if (spec.pieces < 1) throw new Error(`Mur : un tronçon de ${spec.pieces} morceau`);
      return spec.axis === 'ew' ? runEW(spec) : runNS(spec);
    },
    roughWall: (seed, size = ESSAY_ROUGH) => roughWall(t, seed, size),
    dressedWall: (seed, size = ESSAY_DRESSED) => dressedWall(t, seed, size),
    pieces: { rough: t.ROUGH, rubble: t.RUBBLE, header: t.HEADER },
  };
}
