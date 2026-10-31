// Les murs de pierre montés par calcul (chantier « pierre », puis « mode construction ») : un mur à graine fixe, fait des
// dessins mêmes des pierres du jeu (art/items/stones.ts, images au sol, ombre retirée). Sorti de tools/essai-murs.ts (l'essai
// validé par Grégoire), qui s'en sert toujours ; le morceau de solin (art/world/sill-walls.ts) aussi.
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

import { Canvas, EMPTY, flipX, rng, type Grid } from './canvas';
import stones, { castShadow } from '../items/stones';

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

export const MORTAR = 'n'; // mortier de terre, sur la face
const MORTAR_TOP = 'u'; // le même au soleil, sur le dessus du mur
const MORTAR_DARK = 'e'; // contour du mortier côté lumière

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

/** Une image au sol du jeu, ombre comprise. */
export function gameImage(name: string): Grid {
  const s = stones.find((x) => x.name === name);
  if (!s || s.kind !== 'image') throw new Error(`walls : image ${name} absente d'art/items/stones.ts`);
  return s.grid;
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

// Les pierres brutes : la face commence sous le dessus, à la dernière rangée claire (l'arête qui prend le jour).
export const ROUGH: Piece[] = [
  { label: 'grosse a', image: 'big-rough-stone-ground', crop: 3 },
  { label: 'grosse b', image: 'big-rough-stone-ground-b', crop: 3 },
  { label: 'moyenne a', image: 'rough-stone-ground', crop: 2 },
  { label: 'moyenne b', image: 'rough-stone-ground-b', crop: 2 },
  { label: 'petite a', image: 'small-rough-stone-ground', crop: 1 },
  { label: 'petite b', image: 'small-rough-stone-ground-b', crop: 1 },
].map((p) => ({ ...p, full: bodyOf(gameImage(p.image)) }));
const BIG = ROUGH.slice(0, 2), MEDIUM = ROUGH.slice(2, 4), SMALL = ROUGH.slice(4, 6);

// Les moellons : couchés en long (panneresses : l'image est-ouest), ou en boutisse (le bout, l'image nord-sud du 40 cm).
export const RUBBLE: Piece[] = [
  { label: 'moellon 30', image: 'short-rubble-stone-ground', crop: 2 },
  { label: 'moellon 40', image: 'rubble-stone-ground', crop: 2 },
  { label: 'moellon 50', image: 'long-rubble-stone-ground', crop: 2 },
].map((p) => ({ ...p, full: bodyOf(gameImage(p.image)) }));
export const HEADER: Piece = (() => {
  const full = bodyOf(gameImage('rubble-stone-ground-ns'));
  return { label: 'boutisse 40', image: 'rubble-stone-ground-ns', full, crop: full.length - 4 };
})();
/** Les moellons couchés en long dans un mur vu en long (leur vue nord-sud) : on n'en voit que le dessus. */
const RUBBLE_NS: Grid[] = ['short-rubble-stone-ground-ns', 'rubble-stone-ground-ns', 'long-rubble-stone-ground-ns'].map((k) => bodyOf(gameImage(k)));

/** Ce qui a été posé, pour une planche. */
export type Used = Map<string, { piece: Piece; n: number }>;
const count = (used: Used, p: Piece) => {
  const e = used.get(p.image) ?? { piece: { ...p, turned: false, full: bodyOf(gameImage(p.image)) }, n: 0 };
  e.n++;
  used.set(p.image, e);
};

/** Le mur en chantier : les pierres posées (et qui occupe chaque pixel), le mortier, le contour, l'ombre. */
class Wall {
  readonly top: number; // rangée du contour arrière du dessus
  readonly faceTop: number; // première rangée de la face
  readonly ground: number; // rangée du bas (le contour du pied)
  readonly W: number;
  readonly c: Canvas;
  readonly owner: number[][];
  private n = 0;
  constructor(size: WallSize, topRows: number) {
    this.W = size.length;
    this.top = 0;
    this.faceTop = topRows;
    this.ground = topRows + size.face - 1;
    this.c = new Canvas(this.W, this.ground + 1);
    this.owner = Array.from({ length: this.c.h }, () => Array(this.W).fill(-1));
  }
  put(g: Grid, x: number, y: number): void {
    const id = this.n++;
    g.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === EMPTY) return;
      this.c.set(x + i, y + j, ch);
      this.owner[y + j][x + i] = id;
    }));
  }
  /** x permis pour une pierre de largeur w : collée à un bout du mur, ou assez loin pour que le mortier ferme le bord. */
  xsFor(w: number): number[] {
    const W = this.W;
    return Array.from({ length: W - w + 1 }, (_, x) => x).filter((x) => (x === 0 || x >= 2) && (x + w === W || x + w <= W - 2));
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
      const near = Math.min(...stoneTop.slice(Math.max(0, x - 3), x + 4));
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

// ---------- le mur brut ----------

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

const sizeOf = (p: Piece) => (BIG.includes(p) ? 'big' : MEDIUM.includes(p) ? 'medium' : 'small') as Stone['size'];

/** Toutes les manières de poser chaque pierre brute (à plat, retournée, debout, de travers, en biais). */
const STONE_VARIANTS: Stone[] = (() => {
  const out: Stone[] = [];
  for (const p of ROUGH) {
    const size = sizeOf(p);
    for (const q of [p, turn(p)]) {
      out.push({ g: face(q), base: p, size, how: 'flat' });
      const m = inner(face(q));
      if (size === 'big') out.push({ g: reoutline(transpose(m)), base: p, size, how: 'upright' });
      if (size === 'medium') {
        out.push({ g: reoutline(transpose(m)), base: p, size, how: 'across' });
        out.push({ g: reoutline(skew(m, q === p)), base: p, size, how: 'tilted' });
      }
    }
  }
  return out;
})();

/**
 * Les pierres de calage : des morceaux rognés des petites et des moyennes (un rectangle de leur matière, 1 à 3 pixels de
 * large sur 1 à 2 de haut, avec un contour neuf) : leurs taches et cassures, en plus petit. Les plus grands d'abord.
 */
const BITS: Stone[] = (() => {
  const seen = new Set<string>();
  const out: Stone[] = [];
  for (const p of [...SMALL, ...MEDIUM]) {
    const m = inner(face(p));
    for (let h = 2; h >= 1; h--) for (let w = 3; w >= 1; w--) for (let y = 0; y + h <= m.length; y++) for (let x = 0; x + w <= m[0].length; x++) {
      const sub = m.slice(y, y + h).map((r) => r.slice(x, x + w));
      if (sub.some((r) => r.includes(EMPTY))) continue;
      const key = sub.join('/');
      if (seen.has(key) || new Set(sub.join('')).size < 2 && w * h > 1) continue;
      seen.add(key);
      out.push({ g: reoutline(sub), base: SMALL.includes(p) ? p : SMALL[MEDIUM.indexOf(p)], size: 'bit', how: 'trimmed' });
    }
  }
  return out;
})();

/** Les pierres entières de l'assise haute (le dessin complet : leur dessus fait le dessus du mur), retournées ou non. */
const CAPS: (Stone & { crop: number })[] = ROUGH.flatMap((p) => [p, turn(p)].map((q) => ({ g: q.full, base: p, size: sizeOf(p), how: 'cap' as const, crop: q.crop })));

/** Éclats de taille calés dans un joint, pris au dessin des éclats du jeu (sans contour : ils sont noyés dans la terre). */
const CHIP_BITS: Grid[] = [['!;'], ['+;'], ['=;'], ['.!', '!;'], ['!'], ['+']];

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
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) {
      if (g[j][i] === EMPTY) continue;
      const px = x + i, py = y + j;
      if (px < 0 || px >= this.W || py < minY || py > this.ground) return false;
      const k = this.kind[py][px];
      if (k === 3) continue;
      if (k === 2 || (k === 1 && !isEdge(g, i, j))) return false;
    }
    return true;
  }
  /** Part du pourtour de la pierre qui touche déjà quelque chose (pierre, sol, bout du mur) : plus c'est serré, mieux c'est. */
  snug(g: Grid, x: number, y: number): number {
    let n = 0, all = 0;
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[0].length; i++) {
      if (g[j][i] === EMPTY) continue;
      for (const [dx, dy] of N4) {
        if (cell(g, i + dx, j + dy) !== EMPTY) continue;
        all++;
        const px = x + i + dx, py = y + j + dy;
        if (py > this.ground || px < 0 || px >= this.W || (this.kind[py]?.[px] ?? 0) > 0 || this.kind[y + j][x + i] > 0) n++;
      }
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
      if (ch === EMPTY || py < 0 || py >= this.faceTop) return;
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

/**
 * Le mur brut, à graine fixe. Les pierres se serrent : deux voisines mettent leur contour l'une sur l'autre (joint d'un
 * pixel) ou côte à côte (deux pixels), la terre ne reste que dans ce qu'aucune pierre ne comble. Pas de rangée :
 *   1. les grosses, au pied et jusqu'à mi-hauteur : à plat sur leur lit, retournées, ou dressées (debout, sur deux hauteurs
 *      de pierre) ; chacune là où elle repose le plus serrée, les plus basses d'abord. Une face basse (moins de 12 px, le
 *      solin) n'en prend qu'une au plus : elles y tiennent mal, et l'assise haute les remplace ;
 *   2. le dessus, s'il est profond : des rangs de pierres entières, du nord au sud, chacun recouvert par le suivant ;
 *   3. l'assise haute : des pierres entières (le dessin complet, leur dessus fait le dessus du mur), serrées de gauche à droite ;
 *   4. le milieu : moyennes à plat, de travers (un quart de tour) ou en biais d'un pixel, chacune là où elle touche le plus ;
 *   5. les petites entières, puis les petites rognées (morceaux de leurs dessins) dans tous les vides où elles tiennent ;
 *   6. des éclats dans les derniers trous de terre.
 */
export function roughWall(seed: number, size: WallSize = ESSAY_ROUGH): { grid: Grid; used: Used; stats: RoughStats } {
  const r = rng(Math.imul(seed, 0x9e3779b1) ^ 0x5bd1e995);
  const wall = new RoughWall(size, size.top);
  const W = wall.W;
  const used: Used = new Map();
  const stats: RoughStats = { big: 0, medium: 0, small: 0, trimmed: 0, chips: 0, upright: 0, across: 0, tilted: 0, cover: 0 };
  const all = STONE_VARIANTS;
  const placed: { s: Stone; x: number; y: number }[] = [];
  /** Deux fois le même dessin, posé de la même façon, à moins de 14 px (moins sur un mur court) : on le verrait. Deux pierres dressées côte à côte non plus. */
  const near = Math.min(14, Math.round(W * 0.45));
  const twin = (s: Stone, x: number) => placed.some((p) =>
    Math.abs(p.x - x) < near && ((p.s.base === s.base && p.s.how === s.how && s.how !== 'trimmed') || (s.how === 'upright' && p.s.how === 'upright')));
  const put = (s: Stone, x: number, y: number) => {
    placed.push({ s, x, y });
    wall.putStone(s.g, x, y);
    count(used, s.base);
    if (s.how === 'trimmed') stats.trimmed++;
    else stats[s.size as 'big' | 'medium' | 'small']++;
    if (s.how === 'upright') stats.upright++;
    if (s.how === 'across') stats.across++;
    if (s.how === 'tilted') stats.tilted++;
  };
  /** Pose la meilleure des pierres `from` (la plus serrée, plus `bias`), si l'une tient ; dit si elle a posé. */
  const best = (from: Stone[], ok: (s: Stone, x: number, y: number) => boolean, bias: (s: Stone, x: number, y: number) => number) => {
    let out: { s: Stone; x: number; y: number; v: number } | undefined;
    for (const s of from) {
      const w = s.g[0].length;
      for (const x of wall.xsFor(w)) for (let y = wall.faceTop; y + s.g.length - 1 <= wall.ground; y++) {
        if (!ok(s, x, y) || !wall.fitsStone(s.g, x, y)) continue;
        const v = wall.snug(s.g, x, y) + bias(s, x, y) + r() * 0.15 - (twin(s, x) ? 0.6 : 0);
        if (!out || v > out.v) out = { s, x, y, v };
      }
    }
    if (out) put(out.s, out.x, out.y);
    return !!out;
  };
  const bottomOf = (s: Stone, y: number) => y + s.g.length - 1;
  const low = size.face < 12;

  // 1. les grosses : 4 ou 5, dont une ou deux dressées, posées sur ce qui est dessous (sur une face basse, une au plus)
  const bigs = all.filter((s) => s.size === 'big');
  const nBig = low ? (r() < 0.5 ? 1 : 0) : 3 + (r() < 0.5 ? 1 : 0);
  for (let k = 0; k < nBig; k++) {
    const pool = bigs.filter((s) => (s.how === 'upright' ? stats.upright < 2 : true));
    // une pierre sur trois tirée parmi les dressées, pour qu'il y en ait toujours
    const from = !low && (k === 1 || (k === 3 && r() < 0.5)) ? pool.filter((s) => s.how === 'upright') : pool;
    best(from, (s, _x, y) => bottomOf(s, y) >= wall.ground - 6 && wall.snug(s.g, _x, y) > 0.2,
      (s, _x, y) => 0.12 * (bottomOf(s, y) - wall.ground));
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
      const c = CAPS.map((s) => ({ s, k: w[s.size] + r() + (seen(s) ? 2 : 0) })).sort((a, b) => a.k - b.k)[0].s;
      const cw = c.g[0].length;
      const px = Math.max(0, Math.min(x, W - cw));
      cur.push({ x: px, s: c });
      // à la fin du rang, la dernière pierre se serre contre le bout du mur, quitte à passer sur sa voisine
      wall.putBehind(c.g, px, y0, Math.max(3, c.crop + 1), row, rowOf);
      count(used, c.base);
      stats[c.size as 'big' | 'medium' | 'small']++;
      x = px + cw - (r() < 0.6 ? 1 : 0);
    }
    prev = cur;
  });
  // 3. l'assise haute, serrée de gauche à droite : dessin entier, la face au ras de celle du mur ou un pixel plus bas
  const caps = CAPS;
  for (let x = 0; x < W - 3;) {
    let done = false;
    // surtout des moyennes et des petites en haut (les grosses sont au pied), une grosse de temps en temps
    const w = { medium: 0, small: 0.45, big: 0.7, bit: 1 };
    const order = caps.map((c) => ({ c, k: w[c.size] + r() })).sort((a, b) => a.k - b.k).map((o) => o.c);
    for (const c of order) {
      const crop = c.crop;
      for (const dx of [0, -1, 1]) {
        const px = x + dx, y = wall.faceTop - crop + (r() < 0.35 ? 1 : 0);
        if (!wall.xsFor(c.g[0].length).includes(px) || !wall.fitsStone(c.g, px, y) || twin(c, px)) continue;
        put(c, px, y);
        x = px + c.g[0].length - (r() < 0.6 ? 1 : 0);
        done = true;
        break;
      }
      if (done) break;
    }
    if (!done) x++;
  }
  // 4. le milieu : moyennes (et une grosse si elle tient), à plat, de travers, en biais
  const mids = all.filter((s) => s.size === 'medium' || s.size === 'big');
  for (let k = 0; k < 6; k++) if (!best(mids, (s, x, y) => wall.snug(s.g, x, y) > 0.35, (s) => (s.size === 'big' ? 0.1 : 0) + (s.how !== 'flat' ? 0.15 : 0))) break;
  // 5. les petites entières, puis rognées, partout où elles tiennent bien calées
  const smalls = all.filter((s) => s.size === 'small');
  for (let k = 0; k < 20; k++) if (!best(smalls, (s, x, y) => wall.snug(s.g, x, y) > 0.4, () => 0)) break;
  for (let k = 0; k < 60; k++) if (!best(BITS, (s, x, y) => wall.snug(s.g, x, y) > 0.45, (s) => 0.02 * s.g.length * s.g[0].length)) break;
  // 6. les éclats, dans les trous de terre qui restent (là où ils ne couvrent que du vide, sous le dessus du mur)
  for (let k = 0; k < 40; k++) {
    let done = false;
    for (const g of CHIP_BITS) {
      for (let y = wall.faceTop + 1; y + g.length <= wall.ground && !done; y++) for (let x = 1; x + g[0].length < W - 1 && !done; x++) {
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
  if (stats.chips) used.set('stone-chips', { piece: { label: 'eclats', image: 'stone-chips', full: bodyOf(gameImage('stone-chips')), crop: 0 }, n: stats.chips });
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

function course(W: number, r: () => number, prev: Course | undefined, prev2: Course | undefined, first: boolean): Course {
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
        const opts = [...RUBBLE, ...RUBBLE, HEADER];
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

/** Le dessus d'un moellon couché (son dessin sans sa face ni son contour du bas) : ce qu'on en voit sous le rang suivant. */
const topOf = (g: Grid, faceRows = 3) => g.slice(0, g.length - faceRows);

/**
 * Le dessus profond du mur taillé, derrière l'assise haute (rangées 0 à `until` - 1). Vu de face (`ew`) : un rang de moellons
 * couchés en long (leur dessus : le contour arrière et deux rangées), joints décalés. Vu en long (`ns`) : deux files de
 * moellons couchés dans le sens du mur (leur vue nord-sud, dessus seul), un pixel de mortier entre les deux, chaque moellon
 * posé contre le précédent (contour commun ou un pixel de mortier), les joints d'une file décalés de ceux de l'autre.
 */
function dressedTop(wall: Wall, r: () => number, axis: 'ew' | 'ns', until: number, used: Used): void {
  const W = wall.W;
  const stamp = (g: Grid, x: number, y: number) => g.forEach((row, j) => [...row].forEach((ch, i) => {
    const px = x + i, py = y + j;
    if (ch === EMPTY || py < 0 || py >= until || px < 0 || px >= W) return;
    wall.c.set(px, py, ch);
    wall.owner[py][px] = 9999;
  }));
  if (axis === 'ew') {
    for (let x = r() < 0.5 ? 0 : -3; x < W - 2;) {
      const p = RUBBLE[Math.floor(r() * RUBBLE.length)];
      const q = r() < 0.4 ? turn(p) : p;
      const g = q.full.slice(0, 3);
      const px = x < 0 ? x : Math.min(x, W - g[0].length);
      stamp(g, px, 0);
      count(used, p);
      x = px + g[0].length - 1 + (r() < 0.3 ? 1 : 0);
    }
    return;
  }
  // deux files : la première contre le bord ouest, la seconde contre le bord est, un pixel de mortier entre elles
  const colW = RUBBLE_NS[0][0].length;
  const files = [0, W - colW];
  files.forEach((x0, f) => {
    let y = f === 0 ? 0 : -(2 + Math.floor(r() * 3));
    while (y < until) {
      const k = Math.floor(r() * RUBBLE_NS.length);
      const full = RUBBLE_NS[k];
      const p: Piece = { label: '', image: '', full, crop: 0 };
      const g = topOf(r() < 0.4 ? turn(p).full : full);
      stamp(g, x0, y);
      count(used, RUBBLE[k]);
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
 * éclats du jeu) calés là où le mortier fait un vide.
 */
export function dressedWall(seed: number, size: WallSize = ESSAY_DRESSED): { grid: Grid; used: Used } {
  const r = rng(Math.imul(seed, 0x85ebca6b) ^ 0xc2b2ae35);
  const wall = new Wall(size, size.top);
  const W = wall.W;
  const courses = Math.round(size.face / COURSE);
  const deep = size.top >= 5;
  const used: Used = new Map();
  const cs: Course[] = [];
  for (let ci = 0; ci < courses; ci++) cs.push(course(W, r, cs[ci - 1], cs[ci - 2], ci === 0));
  if (deep) dressedTop(wall, r, size.axis ?? 'ew', wall.faceTop - 1, used);
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
      let bottom = Math.min(...sky.slice(x, x + w)) - 1;
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
      const head = cap && deep && p.image === HEADER.image ? p.full.slice(0, p.full.length - 4) : [p.full[0], p.full[1]];
      const g = notch(cap ? [...head, ...fc] : fc, r, { top: !cap, bottom: ci > 0, left: x > 0, right: x + w < W });
      put.push({ x, y: bottom - g.length + 1, g });
      count(used, p);
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
  for (let n = 0; n < 60 && placed.length < 3 && spots.length; n++) {
    const [x, y, g] = spots[Math.floor(r() * spots.length)];
    if (placed.some(([px, py]) => Math.abs(px - x) < 6 && Math.abs(py - y) < 4)) continue;
    wall.c.stamp(g, x, y);
    placed.push([x, y]);
  }
  if (placed.length) {
    const chipsImage = bodyOf(gameImage('stone-chips'));
    used.set('stone-chips', { piece: { label: 'eclats', image: 'stone-chips', full: chipsImage, crop: 0 }, n: placed.length });
  }
  return { grid: wall.finish(), used };
}
