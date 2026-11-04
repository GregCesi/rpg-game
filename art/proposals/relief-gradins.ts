// Essais de dessins du tunnel en gradins (chantier « relief », CADRAGE.md section 13, surtout 13.0) : HORS JEU, rien n'entre
// dans le jeu. Planches : npx tsx tools/essai-relief-gradins.ts (.art-preview/relief-gradins-*.png).
//
// Les mesures de 13.0, à 5 cm par pixel : quatre marches de 1,25 m (25 px) de chaque côté, trois gradins plantés de 50 cm
// (10 px) et le dessus à 5 m (100 px) ; le chemin plat de 2,5 m (50 px) ; l'ouverture du haut 5,5 m (110 px).
// Le jeu voit tout depuis le sud : un dessus (le gradin, le chemin) se voit à plat, en vraie grandeur (10 px pour 50 cm) ; une
// contremarche tournée vers le sud se voit en vraie grandeur (25 px pour 1,25 m).
//
// Ce fichier ne dessine que des MATIÈRES et des PLANTES, dans la palette `world`, lumière en haut à gauche :
//   - `tread(k)`     64 × 10 : le dessus d'un gradin (herbe sombre, terre, litière), raccord libre en largeur ;
//   - `riser(k)`     64 × 25 : la contremarche de 1,25 m (terre, mottes, coulures), avec ce qui pend du gradin du dessus
//                    (herbe, lierre, racines fines) et la terre tombée au pied ; raccord libre en largeur ;
//   - `roots(k)`     14 × 25 : les racines d'un arbre du gradin, qui descendent la contremarche sous lui (posées par-dessus) ;
//   - `cut(k)`       32 × 32, k de 0 à 7 (CUT_VARIANTS) : la terre en coupe (la masse sud tranchée au ras du chemin), vue de
//                    dessus ; bord commun de 5 px (CUT_FRAME) : toute variante se raccorde à toute autre ; tirage par case :
//                    `cutVariant(tx, ty)` ;
//   - `hazel()`      le noisetier (cépée, 3,8 m), `ash()` le jeune frêne (4,2 m), `bushLong()` / `bushLongNs()` le buisson
//                    long (deux vues : est-ouest 30 × 23, nord-sud vu par le bout 12 × 32 dans une image 14 × 40),
//                    `briar()` l'églantier (une vue). `cutBefore`, `bushLongNsBefore` : l'état d'avant, pour la planche 5. Terrain sans contour, plantes avec contour (STYLE 3).
// Le sol clair du chemin, le dessus planté (`bank`), les faces, les grands arbres et Xéros sont ceux du jeu, repris tels quels.

import { Canvas, EMPTY, rng } from '../lib/canvas';
import { hash } from '../world/relief';
import { despeckle, groundShadow, shadedOutline, type Vec } from '../world/big-tree';
import { bark, type Wood } from '../world/wood';

// ---------- bruits (les mêmes que art/world/relief.ts) ----------

const smooth = (t: number) => t * t * (3 - 2 * t);
/** Bruit de valeur lisse, périodique (px × py), sur une maille de `cx` × `cy` px ; de 0 à 1. */
export function pnoise(x: number, y: number, px: number, py: number, cx: number, cy: number, seed: number): number {
  const nx = Math.max(1, Math.round(px / cx));
  const ny = Math.max(1, Math.round(py / cy));
  const fx = (((x / px) * nx) % nx + nx) % nx;
  const fy = (((y / py) * ny) % ny + ny) % ny;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const v = (i: number, j: number) => hash(((i % nx) + nx) % nx, ((j % ny) + ny) % ny, seed);
  const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
  const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
  return a + (b - a) * ty;
}

// ---------- mesures ----------

/** En pixels (5 cm) : le demi-chemin, la profondeur d'un gradin, la hauteur d'une marche, le nombre de marches. */
export const STEP = { half: 25, tread: 10, rise: 25, count: 4 } as const;
export const TREAD_W = 64;
export const RISER_W = 64;

// ---------- 1. le dessus du gradin ----------

/**
 * Le dessus d'un gradin, vu de dessus (64 × 10 : 3,2 m de long, 50 cm de profondeur). Au nord (rangées 0-1), la terre tombée de
 * la marche du dessus (`e`, `9`) ; au milieu, terre sombre (`3`, creux `5`), litière (`2`, `9`) et plaques d'herbe (`v`, éclairée `g`
 * en haut à gauche, `V` en bas à droite, brins `G`), un peu de mousse (`8`, `6`) ; au sud (rangées 8-9), l'arête où l'herbe pousse
 * plus dru, au jour, avant de pendre sur la marche du dessous (c'est la contremarche qui porte ce qui pend).
 */
export function tread(k: number): Canvas {
  const W = TREAD_W;
  const H = STEP.tread;
  const seed = 31000 + k * 53;
  const c = new Canvas(W, H, '3');
  const n = (s: number, cx: number, cy: number) => (x: number, y: number) => pnoise(x, y, W, 20, cx, cy, seed + s);
  const soil = n(1, 7, 4);
  const grass = (x: number, y: number) => n(2, 9, 5)(x, y) * 0.7 + n(3, 4, 3)(x, y) * 0.3 + (y >= 7 ? 0.18 : 0) - (y <= 1 ? 0.25 : 0);
  const g2 = (x: number, y: number) => hash(Math.floor(x / 2), y, seed + 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = soil(x, y);
    const g = g2(x, y);
    c.set(x, y, s < 0.32 ? (g < 0.6 ? '5' : '3') : s > 0.64 ? (g < 0.55 ? '2' : '9') : g > 0.88 ? '2' : '3');
  }
  // la terre tombée de la marche du dessus, contre son pied
  for (let x = 0; x < W; x++) {
    const d = 1 + Math.floor(pnoise(x, 0, W, 20, 6, 20, seed + 5) * 2.4);
    for (let y = 0; y < d; y++) c.set(x, y, hash(Math.floor(x / 2), y, seed + 6) < 0.55 ? 'e' : '9');
  }
  // l'herbe en plaques
  const GR = 0.56;
  const isG = (x: number, y: number) => y >= 0 && y < H && grass(((x % W) + W) % W, y) > GR;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isG(x, y)) continue;
    const lit = !isG(x - 1, y - 1) || !isG(x, y - 1);
    const dark = !isG(x + 1, y + 1) && y < H - 1;
    c.set(x, y, lit ? (g2(x + 5, y) < 0.45 ? 'g' : 'v') : dark ? 'V' : 'v');
  }
  // des brins plus clairs, par paires
  const r = rng(seed + 7);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(r() * W);
    const y = 3 + Math.floor(r() * 5);
    if (c.get(x, y) === 'v' && c.get(x, y - 1) !== EMPTY) c.set(x, y - 1, 'G').set(x, y, 'g');
  }
  // un peu de mousse sur la terre
  for (let y = 2; y < H - 1; y++) for (let x = 0; x < W; x++) {
    if (pnoise(x, y, W, 20, 5, 3, seed + 8) > 0.74 && 'e9325'.includes(c.get(x, y))) c.set(x, y, hash(x, y, seed + 9) < 0.35 ? '6' : '8');
  }
  return c;
}

// ---------- 2. la contremarche ----------

/**
 * La contremarche de 1,25 m, tournée vers le sud (64 × 25). Terre très sombre (`3`), coulures (`5`), mottes éclairées sur leur
 * arête du haut (`e`) ; en haut, ce qui pend de l'arête du gradin du dessus : l'herbe et la broussaille (`l`, `k`, `L`, 1 à 5 px),
 * un ou deux rideaux de lierre plus longs, des racines fines (`N`, arête `m`, pointe `K`) ; au pied, la terre tombée (`2`, `9`, `e`).
 */
export function riser(k: number): Canvas {
  const W = RISER_W;
  const H = STEP.rise;
  const seed = 32000 + k * 61;
  const r = rng(seed);
  const c = new Canvas(W, H, '3');
  const soil = (x: number, y: number) => pnoise(x, y, W, 50, 8, 12, seed + 1) * 0.6 + pnoise(x, y, W, 50, 4, 6, seed + 2) * 0.4;
  const clod = (x: number, y: number) => pnoise(x, y, W, 50, 7, 5, seed + 3);
  const g2 = (x: number, y: number) => hash(Math.floor(x / 2), Math.floor(y / 3), seed + 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = soil(x, y);
    let ch = s < 0.37 ? '5' : g2(x, y) < 0.12 ? '5' : '3';
    const cl = clod(x, y);
    if (cl > 0.63 && clod(x, y - 1) <= 0.63 && s > 0.3) ch = 'e';
    else if (cl <= 0.63 && clod(x, y - 1) > 0.63) ch = '5';
    c.set(x, y, ch);
  }
  // un peu de mousse, surtout en haut (l'humidité sous l'arête)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const m = pnoise(x, y, W, 50, 9, 6, seed + 5) + (y < 8 ? (8 - y) / 40 : 0);
    if (m > 0.72) c.set(x, y, pnoise(x - 1, y - 1, W, 50, 9, 6, seed + 5) < 0.72 ? '6' : '8');
  }
  // la terre tombée au pied, en petit cône inégal
  for (let x = 0; x < W; x++) {
    const cone = 1 + Math.floor(pnoise(x, 0, W, 50, 11, 50, seed + 6) * 3.2);
    for (let d = 0; d < cone; d++) {
      const g = hash(Math.floor(x / 2), d, seed + 7);
      c.set(x, H - 1 - d, d === cone - 1 ? (g < 0.6 ? 'e' : '9') : g < 0.45 ? '2' : '9');
    }
  }
  // des bouts de racine qui sortent de la terre
  for (let i = 0; i < 3; i++) {
    const x = 4 + Math.floor(r() * (W - 8));
    const y = 10 + Math.floor(r() * 8);
    const sd = r() < 0.5 ? -1 : 1;
    c.set(x, y, 'N').set(x + sd, y, 'N').set(x + 2 * sd, y + 1, 'K').set(x, y - 1, 'm');
  }
  // les racines fines qui pendent de l'arête
  for (let i = 0; i < 4; i++) {
    let x = 3 + r() * (W - 6);
    const len = 6 + Math.floor(r() * 14);
    let drift = 0;
    for (let j = 0; j < len; j++) {
      drift = Math.max(-0.8, Math.min(0.8, drift + (r() - 0.5) * 0.6));
      x += drift * 0.3;
      const px = ((Math.round(x) % W) + W) % W;
      c.set(px, j, j >= len - 1 ? 'K' : 'N');
      if (j % 4 === 1 && j < len - 2) c.set((px + W - 1) % W, j, 'm');
    }
  }
  // l'herbe et la broussaille qui pendent de l'arête (1 à 5 px)
  for (let x = 0; x < W; x++) {
    const len = 1 + Math.floor(pnoise(x, 0, W, 50, 5, 50, seed + 8) * 4) + (hash(Math.floor(x / 3), 1, seed + 9) < 0.15 ? 2 : 0);
    for (let y = 0; y < len; y++) {
      const g = hash(x, y, seed + 10);
      c.set(x, y, y === 0 ? (g < 0.5 ? 'L' : 'l') : y === len - 1 ? 'k' : g < 0.5 ? 'l' : 'k');
    }
  }
  // un ou deux rideaux de lierre, plus longs
  const curtains = 1 + (k % 2);
  for (let i = 0; i < curtains; i++) {
    const x0 = Math.floor(r() * W);
    const wd = 2 + Math.floor(r() * 3);
    const len = 9 + Math.floor(r() * 10);
    for (let y = 0; y < len; y++) {
      const w = Math.max(1, wd - (y > len - 4 ? 1 : 0) - (y > len - 2 ? 1 : 0));
      for (let j = 0; j < w; j++) {
        const x = (x0 + j + Math.floor(y / 8)) % W;
        const g = hash(x, y, seed + 11);
        c.set(x, y, j === 0 && g < 0.6 ? 'L' : y >= len - 1 ? 'k' : g < 0.55 ? 'l' : 'k');
      }
      if (y % 4 === 2) c.set((x0 + W - 1 + Math.floor(y / 8)) % W, y, 'L');
    }
  }
  return c;
}

/**
 * Les racines d'un arbre du gradin, qui passent l'arête et descendent la contremarche sous lui (14 × 25, fond transparent) :
 * deux grosses (2 px, arête au jour `m` à gauche, `N`, pointe `K`) qui s'écartent en descendant, et trois ou quatre fines.
 */
export function roots(k: number): Canvas {
  const W = 14;
  const H = STEP.rise;
  const r = rng(33000 + k * 17);
  const c = new Canvas(W, H);
  const thick: [number, number, number][] = [[6, -0.18, 13 + Math.floor(r() * 6)], [8, 0.2, 9 + Math.floor(r() * 7)]];
  for (const [x0, slope, len] of thick) {
    for (let y = 0; y < len; y++) {
      const x = Math.round(x0 + slope * y + Math.sin(y * 0.6 + k) * 0.4);
      const tip = y >= len - 2;
      c.set(x, y, tip ? 'K' : 'm').set(x + 1, y, tip ? EMPTY : 'N');
    }
  }
  for (let i = 0; i < 3 + (k % 2); i++) {
    let x = 4 + r() * 6;
    const dx = (r() - 0.5) * 0.7;
    const len = 5 + Math.floor(r() * 14);
    for (let y = 1; y < len; y++) {
      x += dx;
      c.set(Math.round(x), y, y >= len - 1 ? 'K' : 'N');
    }
  }
  return c;
}

// ---------- 3. la terre en coupe ----------

/** Le nombre de variantes de la terre en coupe, et les graines du tirage par case (`cutVariant`). */
export const CUT_VARIANTS = 8;
export const CUT_SEED = 77;
/** Le cadre commun : sur ses CUT_FRAME px de bord, toutes les variantes ont la même terre (raccord entre variantes). */
export const CUT_FRAME = 5;

/**
 * La masse sud tranchée au ras du chemin, vue de dessus (32 × 32), variante `k` de 0 à CUT_VARIANTS - 1 : la tranche d'une terre
 * pleine, plus claire et plus plate que les faces (`e`, taches `9`, `n`), un trait léger en biais (`9`, la convention d'une coupe :
 * (x + y) multiple de 8, en coordonnées du monde, donc continu d'une case à l'autre), des racines tranchées (anneau `N`, cœur
 * `m`), des cailloux de calcaire tranchés (`=`, `;`), selon la variante une poche de gravier (`n`, `;`) ou une grosse racine.
 * Sans contour. Raccord : la terre de fond est un mélange de deux bruits périodiques sur 32 px, l'un commun à toutes les variantes,
 * l'autre propre à chacune ; au bord (CUT_FRAME px), le commun l'emporte : n'importe quelle variante se raccorde à n'importe quelle
 * autre, dans les deux sens ; au milieu, chacune a sa terre. Les détails restent à 3 px du bord.
 */
export function cut(k: number): Canvas {
  const T = 32;
  const seed = 34000 + k * 71;
  const r = rng(seed);
  const c = new Canvas(T, T, 'e');
  const common = (x: number, y: number) => pnoise(x, y, T, T, 8, 8, 34001) * 0.6 + pnoise(x, y, T, T, 4, 4, 34002) * 0.4;
  const own = (x: number, y: number) => pnoise(x, y, T, T, 8, 8, seed + 1) * 0.55 + pnoise(x, y, T, T, 4, 4, seed + 2) * 0.3 + pnoise(x, y, T, T, 16, 16, seed + 3) * 0.15;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const d = Math.min(x, T - 1 - x, y, T - 1 - y);
    const w = smooth(Math.min(1, d / CUT_FRAME));
    const v = common(x, y) * (1 - w) + own(x, y) * w;
    const hatch = (((x + y) % 8) + 8) % 8 === 0;
    c.set(x, y, v < 0.3 ? '9' : v > 0.68 ? 'n' : hatch ? '9' : 'e');
  }
  // une poche de gravier (variantes paires) : des petits éclats clairs serrés
  if (k % 2 === 0) {
    const gx = 6 + Math.floor(r() * 16);
    const gy = 6 + Math.floor(r() * 16);
    for (let i = 0; i < 9; i++) {
      const x = gx + Math.floor((r() - 0.5) * 9);
      const y = gy + Math.floor((r() - 0.5) * 6);
      c.set(x, y, r() < 0.5 ? 'n' : ';');
    }
  }
  // racines tranchées : un petit anneau d'écorce et un cœur clair (2 à 4)
  const nRoots = 2 + (k % 3);
  for (let i = 0; i < nRoots; i++) {
    const x = 3 + Math.floor(r() * 25);
    const y = 3 + Math.floor(r() * 25);
    const big = r() < 0.35 || (k % 4 === 1 && i === 0);
    c.set(x, y, 'm').set(x + 1, y, 'N').set(x, y + 1, 'N').set(x + 1, y + 1, 'K');
    if (big) c.set(x - 1, y, 'N').set(x, y - 1, 'N').set(x + 1, y - 1, 'N').set(x - 1, y + 1, 'N').set(x + 2, y, 'K').set(x + 2, y + 1, 'K').set(x, y + 2, 'K').set(x + 1, y + 2, 'K');
  }
  // une racine coupée en long (variantes 3 et 7) : un trait d'écorce en biais
  if (k % 4 === 3) {
    const x0 = 6 + Math.floor(r() * 14);
    const y0 = 6 + Math.floor(r() * 14);
    for (let i = 0; i < 7; i++) c.set(x0 + i, y0 + Math.floor(i / 2), i === 6 ? 'K' : 'N').set(x0 + i, y0 + Math.floor(i / 2) - 1, i % 2 ? 'm' : 'N');
  }
  // cailloux tranchés (1 à 3)
  const nStones = 1 + ((k * 5) % 3);
  for (let i = 0; i < nStones; i++) {
    const x = 3 + Math.floor(r() * 24);
    const y = 3 + Math.floor(r() * 25);
    c.set(x, y, '=').set(x + 1, y, '=').set(x + 2, y, ';').set(x, y + 1, '=').set(x + 1, y + 1, ';').set(x + 2, y + 1, ';');
  }
  return c;
}

/**
 * Le tirage de la variante de terre en coupe d'une case (tx, ty) (cases de 32 px du monde) : v = ⌊hash(tx, ty, 77) × 8⌋ ; tant
 * que v est égal au tirage brut de la case de gauche (⌊hash(tx − 1, ty, 77) × 8⌋) ou à celui de la case du dessus
 * (⌊hash(tx, ty − 1, 77) × 8⌋), v = (v + 1) mod 8. `hash` est celui d'art/world/relief.ts.
 */
export function cutVariant(tx: number, ty: number): number {
  const raw = (i: number, j: number) => Math.floor(hash(i, j, CUT_SEED) * CUT_VARIANTS);
  let v = raw(tx, ty);
  const left = raw(tx - 1, ty);
  const up = raw(tx, ty - 1);
  while (v === left || v === up) v = (v + 1) % CUT_VARIANTS;
  return v;
}

/** AVANT (planche 5 seulement) : l'ancienne terre en coupe, trois variantes sans bord commun. */
export function cutBefore(k: number): Canvas {
  const T = 32;
  const seed = 34000 + k * 71;
  const r = rng(seed);
  const c = new Canvas(T, T, 'e');
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const v = pnoise(x, y, T, T, 8, 8, seed + 1) * 0.6 + pnoise(x, y, T, T, 4, 4, seed + 2) * 0.4;
    const hatch = (((x + y) % 8) + 8) % 8 === 0;
    c.set(x, y, v < 0.3 ? '9' : v > 0.68 ? 'n' : hatch ? '9' : 'e');
  }
  for (let i = 0; i < 3; i++) {
    const x = 2 + Math.floor(r() * 27);
    const y = 2 + Math.floor(r() * 27);
    const big = r() < 0.4;
    c.set(x, y, 'm').set(x + 1, y, 'N').set(x, y + 1, 'N').set(x + 1, y + 1, 'K');
    if (big) c.set(x - 1, y, 'N').set(x, y - 1, 'N').set(x + 1, y - 1, 'N').set(x - 1, y + 1, 'N').set(x + 2, y, 'K').set(x + 2, y + 1, 'K').set(x, y + 2, 'K').set(x + 1, y + 2, 'K');
  }
  for (let i = 0; i < 2; i++) {
    const x = 2 + Math.floor(r() * 26);
    const y = 2 + Math.floor(r() * 26);
    c.set(x, y, '=').set(x + 1, y, '=').set(x + 2, y, ';').set(x, y + 1, '=').set(x + 1, y + 1, ';').set(x + 2, y + 1, ';');
  }
  return c;
}

// ---------- 4. les plantes des gradins ----------

/** Écorce lisse et grise des jeunes bois (noisetier, frêne) : la rampe du bois grisé (A B Q, K dans l'ombre), un cran sous la perche. */
const STEM_RAMP = { M: 'A', m: 'B', N: 'Q', K: 'K' };
const stemWood = (d: number): Wood => ({ diameter: d, furrows: [[Math.max(0, d - 2), 19, 2, 5]], endA: 1, ramp: STEM_RAMP });

interface Mass { cx: number; cy: number; rx: number; ry: number; seed: number; dim: number }
interface Stem { pts: Vec[]; d: number }
interface TreeSpec {
  w: number;
  h: number;
  foot: Vec;
  stems: Stem[];
  masses: Mass[];
  /** Centre et demi-axes du houppier entier (l'éclairage d'ensemble). */
  crown: [Vec, Vec];
  /** Taille des grappes de feuilles (px). */
  cell: Vec;
  /** Part de trous dans le feuillage (0 : plein). */
  holes: number;
  /** Penche la rampe vers le clair (feuillage léger du frêne). */
  bright: number;
  seed: number;
  shadow: [number, number];
}

/** Un tronc ou une tige, de son pied vers le haut, en écorce lisse ; le pied s'évase d'un pixel de chaque côté. */
function drawStem(c: Canvas, s: Stem, flare: boolean) {
  const wood = stemWood(s.d);
  for (let i = 0; i + 1 < s.pts.length; i++) {
    const [x0, y0] = s.pts[i];
    const [x1, y1] = s.pts[i + 1];
    for (let y = Math.round(y0); y >= Math.round(y1); y--) {
      const t = y0 === y1 ? 0 : (y0 - y) / (y0 - y1);
      const xc = x0 + (x1 - x0) * t;
      const fl = flare && i === 0 && y0 - y < 2 ? 1 : 0;
      const xa = Math.round(xc - s.d / 2) - fl;
      const xb = Math.round(xc - s.d / 2) + s.d - 1 + fl;
      for (let x = xa; x <= xb; x++) c.set(x, y, bark(y, (x + 0.5 - xa) / (xb - xa + 1), wood));
    }
  }
}

/** Silhouette festonnée d'une masse de feuillage. */
function massShape(w: number, h: number, m: Mass): Canvas {
  const s = new Canvas(w, h);
  const r = rng(m.seed);
  s.ellipse(m.cx, m.cy, m.rx * 0.84, m.ry * 0.84, 'l');
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = ((i + r() * 0.5) / n) * Math.PI * 2;
    const b = Math.min(m.rx, m.ry) * (0.28 + r() * 0.12);
    s.ellipse(m.cx + Math.cos(a) * m.rx * 0.76, m.cy + Math.sin(a) * m.ry * 0.76, b, b * 0.85, 'l');
  }
  return s;
}

/** Bouche les trous fermés (vides qu'on n'atteint pas depuis le bord) au-dessus de la rangée `below`. */
function fillHoles(c: Canvas, col: string, below = c.h) {
  const out = new Set<number>();
  const stack: Vec[] = [];
  for (let x = 0; x < c.w; x++) stack.push([x, 0], [x, c.h - 1]);
  for (let y = 0; y < c.h; y++) stack.push([0, y], [c.w - 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= c.w || y >= c.h || c.get(x, y) !== EMPTY || out.has(y * c.w + x)) continue;
    out.add(y * c.w + x);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (let y = 0; y < below; y++) for (let x = 0; x < c.w; x++) if (c.get(x, y) === EMPTY && !out.has(y * c.w + x)) c.set(x, y, col);
}

/** Un petit arbre droit : tiges en écorce lisse, houppier en masses découpées en grappes (rampe k l L j), contour, ombre. */
function smallTree(t: TreeSpec): Canvas {
  const c = new Canvas(t.w, t.h);
  const [lx, ly] = [-Math.SQRT1_2, -Math.SQRT1_2];
  for (const s of t.stems) drawStem(c, s, true);
  const ramp = ['k', 'l', 'L', 'j'];
  const [cc, cr] = t.crown;
  const crownBottom = Math.max(...t.masses.map((m) => m.cy + m.ry));
  for (const m of t.masses) {
    const shape = massShape(t.w, t.h, m);
    const r = rng(m.seed * 31);
    const sites: Vec[] = [];
    for (let gy = m.cy - m.ry - 3; gy <= m.cy + m.ry + 3; gy += t.cell[1]) {
      for (let gx = m.cx - m.rx - 3; gx <= m.cx + m.rx + 3; gx += t.cell[0]) sites.push([gx + (r() - 0.5) * 3, gy + (r() - 0.5) * 2.5]);
    }
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
      if (shape.get(x, y) === EMPTY) continue;
      // des trous dans le feuillage léger : on voit les branches et le fond au travers
      if (t.holes > 0 && pnoise(x, y, t.w, t.h, 4, 4, t.seed + m.seed) > 1 - t.holes && Math.hypot((x - m.cx) / m.rx, (y - m.cy) / m.ry) > 0.35) continue;
      const px = x + 0.5;
      const py = y + 0.5;
      let best = sites[0];
      let bd = Infinity;
      for (const s of sites) {
        const d = (s[0] - px) ** 2 + (s[1] - py) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
      const vm = ((best[0] - m.cx) / m.rx) * lx + ((best[1] - m.cy) / m.ry) * ly;
      const vc = ((best[0] - cc[0]) / cr[0]) * lx + ((best[1] - cc[1]) / cr[1]) * ly;
      const v = 0.6 * vm + 0.35 * vc - m.dim + t.bright;
      let i = v > 0.38 ? 3 : v > 0.05 ? 2 : v > -0.45 ? 1 : 0;
      const local = (px - best[0]) * lx + (py - best[1]) * ly;
      if (local < -1.5 && i > 0) i--;
      c.set(x, y, ramp[i]);
    }
  }
  if (t.holes === 0) fillHoles(c, 'k', Math.floor(crownBottom) - 2);
  const out = shadedOutline(despeckleEdges(despeckle(c, 'KQ'), 'KQ'));
  groundShadow(out, t.foot[0] + 1.5, t.foot[1] + 0.5, t.shadow[0], t.shadow[1]);
  return out;
}

/** Comme `despeckle`, mais aussi au bord de la silhouette. */
function despeckleEdges(c: Canvas, keep = ''): Canvas {
  const fix: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const p = c.get(x, y);
    if (p === EMPTY || keep.includes(p)) continue;
    const ns = [c.get(x + 1, y), c.get(x - 1, y), c.get(x, y + 1), c.get(x, y - 1)].filter((n) => n !== EMPTY);
    if (!ns.length || ns.includes(p)) continue;
    const count: Record<string, number> = {};
    for (const n of ns) count[n] = (count[n] ?? 0) + 1;
    fix.push([x, y, Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]]);
  }
  for (const [x, y, col] of fix) c.px[y][x] = col;
  return c;
}

/**
 * Le noisetier (cépée), 2,2 m de houppier, 1,5 m de profondeur, 3,8 m de haut : trois tiges droites de 10 cm et une plus fine qui sortent d'une
 * souche de 20 cm et montent d'aplomb, à peine écartées (une cépée serrée sur son gradin) ; un houppier
 * large et bombé, plein, en six masses, sa base à 1,5 m. Gabarit : 44 × (76 + 15) = 44 × 91.
 */
export function hazel(): Canvas {
  const foot: Vec = [25, 94];
  const [fx, fy] = foot;
  return smallTree({
    w: 52, h: 100, foot, seed: 35100, cell: [5, 4.5], holes: 0, bright: 0.02, shadow: [10, 2.4],
    stems: [
      { d: 2, pts: [[fx - 4, fy - 1], [fx - 5, fy - 30], [fx - 7, fy - 52]] },
      { d: 2, pts: [[fx, fy - 1], [fx, fy - 34], [fx, fy - 58]] },
      { d: 2, pts: [[fx + 4, fy - 1], [fx + 5, fy - 28], [fx + 7, fy - 50]] },
      { d: 1, pts: [[fx - 2, fy - 2], [fx - 2, fy - 24], [fx - 3, fy - 42]] },
    ],
    masses: [
      { cx: 22.6, cy: 15, rx: 9.7, ry: 10, seed: 51, dim: 0 },
      { cx: 31.9, cy: 18, rx: 8.8, ry: 10, seed: 52, dim: 0.02 },
      { cx: 15.1, cy: 30, rx: 8.8, ry: 11, seed: 53, dim: 0.03 },
      { cx: 26.8, cy: 31, rx: 11.4, ry: 12, seed: 54, dim: 0.04 },
      { cx: 37.8, cy: 36, rx: 7.9, ry: 10, seed: 55, dim: 0.08 },
      { cx: 21.0, cy: 47, rx: 10.6, ry: 10, seed: 56, dim: 0.12 },
      { cx: 32.7, cy: 51, rx: 8.8, ry: 9, seed: 57, dim: 0.16 },
    ],
    crown: [[26, 33], [22, 24]],
  });
}

/**
 * Le jeune frêne, 1,6 m de houppier, 1,4 m de profondeur, 4,2 m de haut : un seul tronc droit de 15 cm (3 px d'écorce lisse et
 * grise), nu sur 1,8 m ; un houppier haut et clair, ovale, en cinq masses aérées (le feuillage du frêne est léger : on voit les
 * branches au travers), plus clair que le noisetier. Gabarit : 32 × (84 + 14) = 32 × 98.
 */
export function ash(): Canvas {
  const foot: Vec = [19, 102];
  const [fx, fy] = foot;
  return smallTree({
    w: 38, h: 108, foot, seed: 35200, cell: [4, 3.5], holes: 0.2, bright: 0.12, shadow: [7, 2],
    stems: [
      { d: 3, pts: [[fx, fy - 1], [fx, fy - 86]] },
      { d: 1, pts: [[fx + 1, fy - 48], [fx + 7, fy - 62]] },
      { d: 1, pts: [[fx - 1, fy - 58], [fx - 7, fy - 72]] },
    ],
    masses: [
      { cx: 19, cy: 16, rx: 9, ry: 10, seed: 61, dim: 0 },
      { cx: 12, cy: 30, rx: 8, ry: 10, seed: 62, dim: 0.03 },
      { cx: 25, cy: 33, rx: 9, ry: 11, seed: 63, dim: 0.05 },
      { cx: 15, cy: 47, rx: 9, ry: 10, seed: 64, dim: 0.09 },
      { cx: 25, cy: 53, rx: 8, ry: 9, seed: 65, dim: 0.13 },
    ],
    crown: [[19, 35], [15, 28]],
  });
}

/** Un buisson en touffes rondes (comme `bush` du jeu) : chaque touffe éclairée en haut à gauche, un liseré d'ombre en bas à droite. */
function puffs(w: number, h: number, list: ([number, number, number] | [number, number, number, number])[], center: Vec, flowers: number, seed: number): Canvas {
  const c = new Canvas(w, h);
  const ramp = ['k', 'l', 'L', 'j'];
  for (const [cx, cy, r, fy = 0.85] of list) {
    const v = (-(cx - center[0]) / (w * 0.35) - (cy - center[1]) / (h * 0.25)) * 0.5;
    const base = v > -0.45 ? 1 : 0;
    const top = v > 0.25 ? 3 : v > -0.45 ? 2 : 1;
    const own = new Canvas(w, h).ellipse(cx, cy, r, r * fy, ramp[base]);
    own.within(ramp[base], (o) => o.ellipse(cx - 0.9, cy - 1, r * 0.62, r * fy * 0.61, ramp[top]));
    if (top === 3) own.within('j', (o) => o.ellipse(cx + 0.6, cy + 0.4, r * 0.5, r * fy * 0.5, 'L'));
    const rim: Vec[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (own.get(x, y) !== EMPTY && (own.get(x + 1, y) === EMPTY || own.get(x, y + 1) === EMPTY)) rim.push([x, y]);
    }
    for (const [x, y] of rim) own.set(x, y, ramp[Math.max(0, ramp.indexOf(own.get(x, y)) - 1)]);
    c.stamp(own.toGrid(), 0, 0);
  }
  despeckle(c);
  // des fleurs pâles d'églantier (`a`, cœur `b`), par deux pixels, sur le côté au jour
  const r = rng(seed);
  for (let i = 0; i < flowers; i++) {
    const x = 2 + Math.floor(r() * (w - 5));
    const y = 2 + Math.floor(r() * (h * 0.6));
    if ('Llj'.includes(c.get(x, y)) && 'Llj'.includes(c.get(x + 1, y))) c.set(x, y, 'a').set(x + 1, y, 'b');
  }
  return c;
}

/**
 * Le buisson long du gradin (prunellier, cornouiller) : 1,5 m le long du gradin, 50 cm de profondeur (tout le gradin), 90 cm de
 * haut. Symétrique (deux vues) : est-ouest 30 × (18 + 5) = 30 × 23 ; nord-sud (tourné d'un quart de tour, ou vu par son bout)
 * 10 × (18 + 15) = 10 × 33.
 */
export function bushLong(): Canvas {
  const w = 32;
  const h = 28;
  const list: [number, number, number][] = [
    [10, 7, 4], [18, 6, 4.5], [6, 13, 4.5], [12, 11, 5.5], [19, 10, 5.5], [25, 13, 5], [9, 19, 5], [16, 18, 6], [23, 19, 5], [27, 19, 3.5],
  ];
  const c = shadedOutline(puffs(w, h, list, [15, 15], 0, 1));
  groundShadow(c, 17, 24.5, 14, 2.2);
  return c;
}

/**
 * Le buisson long vu par son bout (nord-sud) : 50 cm de large, 1,5 m de long qui s'en va vers le nord, 90 cm de haut ; gabarit
 * 10 × (18 + 15) = 10 × 33 (largeur et profondeur échangées). Deux parties qui se lisent : en bas, le bout sud, une touffe ronde et
 * large (la face de 90 cm, 18 px), à l'ombre en bas, avec les tiges et le creux sombre au pied ; au-dessus, le dos du buisson qui
 * file vers le nord (15 px), vu de dessus : des touffes qui se chevauchent, éclairées (le dessus prend la lumière), un peu plus
 * petites et plus sombres vers le fond, la silhouette bosselée des deux côtés, quelques brindilles qui dépassent.
 */
export function bushLongNs(): Canvas {
  const w = 14;
  const h = 40;
  const ramp = ['k', 'l', 'L', 'j'];
  const c = new Canvas(w, h);
  // le dos : un long coussin de feuilles vu de dessus, de la rangée 4 (le bout nord, arrondi) à la rangée 22, 9 px de large ;
  // ses flancs à peine bosselés ; des grappes de feuilles (cellules de 3 × 2,5 px), chacune claire en haut à gauche
  const X0 = 3;
  const X1 = 11;
  const Y0 = 4;
  const Y1 = 22;
  const rr = (X1 - X0) / 2;
  const cx = (X0 + X1) / 2;
  // la forme du coussin, puis des touffes rondes serrées dedans, posées du nord au sud (la plus proche passe devant), le fond
  // entre elles sombre
  const mask = new Canvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + 0.5;
    const py = y + 0.5;
    // les flancs à peine bosselés, vers l'intérieur seulement (la largeur reste celle du gabarit)
    const bump = pnoise(0, py, 1, 40, 1, 2.5, 36101) ** 2 * 2.6;
    const bumpR = pnoise(0, py, 1, 40, 1, 2.5, 36102) ** 2 * 2.6;
    if (px < X0 - 1 + bump || px > X1 + 1 - bumpR || py > Y1) continue;
    if (py < Y0 + rr * 0.6 && ((px - cx) / rr) ** 2 + ((py - (Y0 + rr * 0.6)) / (rr * 0.6)) ** 2 > 1) continue;
    mask.set(x, y, 'k');
  }
  const back: [number, number, number, number][] = [];
  for (let j = 0, y = Y0 + 1.5; y <= Y1 + 1; j++, y += 2.7) {
    const o = j % 2 ? 0.9 : -0.6;
    back.push([4.8 + o, y, 2.8, 0.72], [9 + o, y + 0.6, 2.8, 0.72]);
    if (j % 2 === 0) back.push([7 + o, y + 1.4, 2.4, 0.7]);
  }
  const tufts = puffs(w, h, back, [7, 8], 0, 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (mask.get(x, y) === EMPTY) continue;
    const p = tufts.get(x, y);
    // le dos prend la lumière : un cran de plus sur sa moitié gauche
    const i = p === EMPTY ? 0 : Math.min(3, ramp.indexOf(p) + (x < 7 && y > Y0 + 1 ? 1 : 0));
    c.set(x, y, ramp[i]);
  }
  // le bout sud : une touffe ronde et pleine, face à nous, plus sombre que le dos (elle tourne le dos au ciel), et deux plus
  // petites au pied ; la ligne où elle passe devant le dos, un liseré d'ombre
  const end: [number, number, number][] = [[7, 24.2, 3.1], [4.9, 26.2, 2.7], [9.1, 26.4, 2.7], [7, 27.5, 3.4], [5.3, 30, 2.5], [8.7, 30, 2.5], [7, 30.5, 3]];
  const face = puffs(w, h, end, [4, 18], 0, 5);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = face.get(x, y);
    if (p === EMPTY) continue;
    const i = ramp.indexOf(p);
    face.set(x, y, ramp[Math.max(0, Math.min(y >= 31 ? 1 : y >= 27 ? 2 : 3, i - (y >= 31 ? 1 : 0)))]);
  }
  for (let x = 0; x < w; x++) for (let y = 15; y < 26; y++) {
    if (face.get(x, y) !== EMPTY) { if (c.get(x, y - 1) !== EMPTY) c.set(x, y - 1, 'k'); break; }
  }
  c.stamp(face.toGrid(), 0, 0);
  // le pied : le creux sombre sous les branches, deux tiges
  for (const [x, y] of [[6, 32], [7, 32], [8, 32]] as Vec[]) if (c.get(x, y) !== EMPTY) c.set(x, y, 'K');
  c.set(5, 33, 'N').set(9, 33, 'N');
  const out = shadedOutline(despeckleEdges(c, 'KN'));
  groundShadow(out, 7.5, 34.5, 6, 1.6);
  // l'ombre au sol le long du flanc est (la lumière vient du nord-ouest) : elle file vers le nord sur toute la longueur du
  // buisson, c'est ce qui dit qu'il est long et couché dans ce sens
  for (let y = 9; y < 35; y++) {
    let e = -1;
    for (let x = w - 1; x >= 0; x--) if (out.get(x, y) !== EMPTY && out.get(x, y) !== 'x') { e = x; break; }
    if (e < 0) continue;
    const n = y < 13 ? 1 : 2;
    for (let i = 1; i <= n; i++) if (out.get(e + i, y) === EMPTY) out.set(e + i, y, 'x');
  }
  return out;
}

/** AVANT (planche 5 seulement) : l'ancien buisson long nord-sud, en colonne de touffes égales. */
export function bushLongNsBefore(): Canvas {

  const w = 14;
  const h = 38;
  const list: [number, number, number][] = [
    [7, 6, 3.4], [6.5, 11, 3.6], [7.5, 15, 3.6], [6.5, 20, 3.8], [7.5, 24, 3.8], [6.5, 28, 3.6], [7, 30, 3.8],
  ];
  const c = shadedOutline(puffs(w, h, list, [7, 18], 0, 2));
  groundShadow(c, 8, 34.5, 6, 1.8);
  return c;
}

/** L'églantier : une touffe ronde et basse, 90 × 50 × 70 cm, quelques fleurs pâles. Une vue (round) : 18 × (14 + 5) = 18 × 19. */
export function briar(): Canvas {
  const w = 22;
  const h = 22;
  const list: [number, number, number][] = [[8, 5, 3.6], [13, 4, 3.4], [7, 9, 4], [12, 8, 4.5], [16, 11, 4], [9, 13, 4.5], [14, 14, 4.2]];
  const c = shadedOutline(puffs(w, h, list, [11, 11], 4, 3));
  groundShadow(c, 12, 18.5, 8, 1.8);
  return c;
}

/** Les plantes, leurs dimensions (cm) et leur symétrie (`views` de props.json, CLAUDE.md « toutes ses vues »). */
export const PLANTS = {
  'gradin-hazel': { name: 'noisetier', views: 'round', dims: { w: 220, d: 150, h: 380, shape: 'box' }, draw: hazel, foot: [25, 94] as Vec },
  'gradin-ash': { name: 'jeune frene', views: 'round', dims: { w: 160, d: 140, h: 420, shape: 'box' }, draw: ash, foot: [19, 102] as Vec },
  'gradin-bush': { name: 'buisson long', views: 'symmetric', dims: { w: 150, d: 50, h: 90, shape: 'box' }, draw: bushLong, foot: [16, 24] as Vec },
  'gradin-bush-ns': { name: 'buisson long, nord-sud', views: 'symmetric', dims: { w: 50, d: 150, h: 90, shape: 'box' }, draw: bushLongNs, foot: [7, 33] as Vec },
  'gradin-briar': { name: 'eglantier', views: 'round', dims: { w: 90, d: 50, h: 70, shape: 'box' }, draw: briar, foot: [11, 18] as Vec },
} as const;
export type PlantKey = keyof typeof PLANTS;
