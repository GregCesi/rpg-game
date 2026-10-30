// La pièce de bois : un seul objet du monde (`wood-piece`), décrit par ses réglages (diamètre, longueur, forme, faces
// dressées, sens, encoche, coin planté), dont l'image s'assemble à sa longueur à partir de parties dessinées une fois par
// diamètre et par aspect. Contrat : src/world/woodShape.ts (tailles, placements, `composeOps`) et la géométrie de
// src/content/wood.json. Le jeu assemble à la volée avec les mêmes opérations que `composeWood` ci-dessous.
//
// Quatre planches, une par diamètre et par sens : `wood-big`, `wood-big-ns`, `wood-normal`, `wood-normal-ns`. Chaque partie
// est calée en haut à gauche d'un cadre commun. Animations :
// - `<aspect>-start`, `<aspect>-mid`, `<aspect>-end` (gros : round, half, quarter ; normal : round, f1, f2, f3, beam) ; le
//   rond a 4 images (le roulement, un tour), les autres une ;
// - `notch1`, `notch2` : la bande d'encoche de la coupe à la cognée (un tiers, deux tiers), 4 images comme le rond ;
// - gros seulement, pour le rond et la demi-bille (les aspects qui se fendent) : `wedge-<aspect>-start|end` (le bout où
//   le coin est planté, 3 images : le coin sort de 3, 2 puis 1 px, il s'enfonce à chaque coup ; le jeu prend l'image
//   min(2, ⌊3 × coups / coups totaux⌋)), `crack-<aspect>-start|mid|end` (la fente seule, transparente ailleurs),
//   `open-<aspect>-start|mid|end` (le bois grand ouvert du dernier coup de masse) ;
// - gros seulement : `quarter-rev-start|mid|end`, le quartier retourné (une image), posé à la place de `quarter-<partie>`
//   (mêmes placements, même cadre, même ombre) pour ranger les quartiers tête-bêche dans un tas.
//
// Méthode : chaque aspect se dessine d'un tenant sur une pièce de référence (bout de départ, deux milieux, bout d'arrivée),
// avec une écorce et des fibres périodiques sur `tile` (24 px) le long de la pièce ; les parties en sont découpées. Un
// garde-fou vérifie que les deux milieux de la référence sont identiques : le milieu se répète sans couture.
//
// Matières : art/world/wood.ts (écorce M m N K en travers, lumière en haut à gauche, face de coupe Y t T cerclée de N).
// - Gros (`BIG_WOOD`, 11 px d'écorce, 55 cm) : comme les anciennes billes (big-felled.ts, roll.ts) : est-ouest 16 rangées
//   (contour, 11 d'écorce, contour, 3 d'ombre), bouts en ovale de 5 × 11 (face de coupe à l'ouest, écorce enroulée à
//   l'est) ; nord-sud 14 colonnes, le rond du fond, le dessus d'écorce à ½, la face de coupe de 11 × 7 au sud. L'anneau
//   d'écorce fait 22 rangées (deux fois la face visible), six couloirs de sillons de 4 à 6 px, périodiques sur 24 px ;
//   4 images = un tour, l'anneau tourne d'un quart par image (vers le bas en est-ouest, vers la droite en nord-sud), la
//   lumière reste en place ; la fente de la face de coupe nord-sud tourne d'un quart de tour par image.
// - Demi-bille : posée face plate en haut (bois frais de la fente, fibres en long, pas de cerne), un liseré d'écorce au
//   bord nord, le dos d'écorce dessous ; à l'ouest, le bout en demi-lune de bois de bout ; nord-sud, la demi-lune au sud.
// - Quartier : comme la demi-bille, plus bas (est-ouest) ou plus étroit (nord-sud, la fente à l'est, le cœur dans l'angle).
// - Quartier retourné : le même quartier après un demi-tour sur son axe long : le dos d'écorce dessus, les deux faces
//   fendues dessous en V, l'arête du cœur au sol. Est-ouest : l'écorce sur cinq rangées, la face fendue sud du V dans
//   l'ombre (T, fibres t) sur trois ; à l'ouest, le bout en quart de rond pointe en bas. Nord-sud : le dos d'écorce vu
//   de dessus (éclairé à l'ouest), le bout lointain arrondi, au sud le quart de rond pointe en bas, le cœur à la pointe.
// - Normal (`NORMAL_WOOD`, 6 px d'écorce) : les dessins du rondin et de la poutre de l'ancien art/world/timber.ts, repris
//   tels quels (bouts au pixel, faces dressées f1 à f3, poutre).
// - Coin de fendage : la tête de fer (2 px de large, la rampe 2 3 0 de tools.ts) qui sort de 3, 2 ou 1 px du bout (le
//   pixel d'entrée fixe ; là où le fer s'est retiré, les images 1 et 2 portent la fente elle-même) ; fente : un
//   trait K qui court sur le dessus (rond : la rangée éclairée ; demi : le milieu de la face plate ; nord-sud : la crête)
//   et descend la face de coupe du bout du coin ; grand ouvert : la fente bâille sur toute la longueur, la lèvre en bois
//   frais, et traverse les deux bouts.
//
// Images tirées d'ici par `composeWood` : les pièces de 1 m des tas (`wood-big-round-100`, `-ns`, `wood-normal-round-100`,
// `-ns`, `wood-big-quarter-100`, `-ns`), l'image de l'objet dans Tiled (`wood-piece`, la bille du gros, 1 m, est-ouest)
// et deux images de contrôle du quartier retourné de 1 m (`wood-big-quarter-rev-100`, `-ns`).

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { toolPalette } from '../items/tools';
import { despeckle, shadedOutline } from './big-tree';
import { barkTone, DARKER, faceTone, logEnd, paintFace } from './wood';
import {
  WOOD, composeOps, framesOf, lookDef, lookOf, sizeOf, woodSize, type ComposeOpts, type WoodAxis,
} from '../../src/world/woodShape';
import type { WoodPiece } from '../../src/content/types';

const mod = (a: number, n: number) => ((a % n) + n) % n;
const TILE = 24;
for (const s of Object.values(WOOD.sizes)) if (s.tile !== TILE) throw new Error('wood-pieces : écorce et fibres périodiques sur 24 px (tile)');

type Part = 'start' | 'mid' | 'end';
const PARTS: Part[] = ['start', 'mid', 'end'];

// ---------- Écorce qui roule ----------

/** Anneau d'écorce : rangées de texture sur tout le tour ; couloirs de sillons (rangée, tirets [début, longueur] sur 24 px). */
interface Ring { size: number; diameter: number; furrows: [number, [number, number][]][] }

/**
 * Gros : 22 rangées (deux fois les 11 visibles). Couloirs 2, 5, 8 visibles à l'image 0 (ceux de BIG_WOOD), 12, 15, 18 sur
 * la face cachée ; deux tirets de 4 à 6 px par période, placés pour ne jamais s'aligner d'un couloir à l'autre.
 */
const BIG_RING: Ring = {
  size: 22,
  diameter: 11,
  furrows: [
    [2, [[1, 5], [13, 6]]],
    [5, [[7, 6], [19, 4]]],
    [8, [[3, 5], [15, 5]]],
    [12, [[10, 6], [21, 5]]],
    [15, [[4, 4], [16, 6]]],
    [18, [[9, 5], [20, 4]]],
  ],
};

/** Normal : l'anneau de 12 rangées de l'ancien timber.ts (couloirs 1, 4, 7, 10). */
const NORMAL_RING: Ring = {
  size: 12,
  diameter: 6,
  furrows: [
    [1, [[0, 4], [13, 5]]],
    [4, [[6, 5], [18, 4]]],
    [7, [[3, 4], [15, 5]]],
    [10, [[9, 5], [21, 4]]],
  ],
};

/** Décalage de l'anneau à l'image k : un quart de tour par image. */
const shiftAt = (ring: Ring, k: number) => Math.round((k * ring.size) / 4);

/** Le pixel (`along` le long de la pièce, rangée visible `v` en travers, 0 côté lumière) est-il dans un sillon à l'image k ? */
function furrow(ring: Ring, along: number, v: number, k: number): boolean {
  const row = mod(v - shiftAt(ring, k), ring.size);
  const a = mod(Math.floor(along), TILE);
  return ring.furrows.some(([r, dashes]) => dashes.some(([s, n]) => {
    const pos = mod(a - s, TILE);
    if (pos >= n) return false;
    return row === mod(r + (pos >= Math.ceil(n / 2) ? 1 : 0), ring.size);
  }));
}

/** Écorce : la rampe en travers (`s` de 0, côté lumière, à 1), creusée d'un cran par les sillons. */
function barkS(ring: Ring, along: number, s: number, k: number): string {
  const b = barkTone(s);
  return furrow(ring, along, Math.floor(s * ring.diameter), k) ? DARKER[b] : b;
}

/** Écorce sur la rangée visible `v` (0 à diamètre − 1). */
const barkV = (ring: Ring, along: number, v: number, k: number, plain = false): string =>
  plain ? barkTone((v + 0.5) / ring.diameter) : barkS(ring, along, (v + 0.5) / ring.diameter, k);

// ---------- Bois frais de la fente (face plate) ----------

/** Couloirs de fibres de la face plate, en travers : tirets [début, longueur] sur 24 px. */
const SPLIT_LANES: [number, number][][] = [
  [[2, 5], [14, 4]],
  [[8, 2], [19, 2]],
  [[5, 6], [17, 3]],
  [[0, 2], [11, 2]],
  [[9, 5], [21, 3]],
];

/**
 * Bois frais d'une face plate vue de dessus : `along` le long de la pièce, `across` en travers (0 côté lumière). Fond t,
 * le bord côté lumière en Y ; un couloir sur deux des fibres éclairées (Y), l'autre des fibres arrachées (T), jamais de cerne.
 */
function splitWood(along: number, across: number): string {
  if (across === 0) return 'Y';
  const a = mod(Math.floor(along), TILE);
  const hit = SPLIT_LANES[across % SPLIT_LANES.length].some(([s, n]) => mod(a - s, TILE) < n);
  if (!hit) return 't';
  return across % 2 === 1 ? 'Y' : 'T';
}

// ---------- Ombres ----------

/** Ombre au sol est-ouest : deux rangées pleines sous le corps (colonnes 2 à x1), la dernière plus courte (4 à x1 − 1). */
function ewShadowRows(c: Canvas, y: number, rows: number, x1: number) {
  for (let r = 0; r < rows - 1; r++) for (let X = 2; X <= x1; X++) if (c.get(X, y + r) === EMPTY) c.set(X, y + r, 'x');
  for (let X = 4; X <= x1 - 1; X++) if (c.get(X, y + rows - 1) === EMPTY) c.set(X, y + rows - 1, 'x');
}

/** Ombre nord-sud : le corps décalé d'un pixel à droite et de deux vers le bas, à partir de la rangée `from`. */
function nsShadow(c: Canvas, from: number) {
  const body = Canvas.from(c.toGrid());
  for (let Y = from; Y < c.h; Y++) for (let X = 2; X < c.w; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    const q = body.get(X - 1, Y - 2);
    if (q !== EMPTY && q !== 'x') c.set(X, Y, 'x');
  }
}

// =====================================================================================================================
// Gros bois
// =====================================================================================================================

/**
 * Bille est-ouest de n px (image n + 1 × 16), à l'image k : écorce de 11 rangées (1 à 11), bouts en ovale (5 × 11 : face
 * de coupe à l'ouest, vers la lumière ; écorce enroulée à l'est), contour (0 et 12), ombre (13, 14 pleines jusqu'au contour
 * droit, 15 plus courte).
 */
function bigRoundEW(n: number, k: number): Canvas {
  const D = 11;
  const len = n - 2;
  const c = new Canvas(n + 1, 16);
  for (let Y = 1; Y <= D; Y++) for (let X = 1; X <= len; X++) c.set(X, Y, barkV(BIG_RING, X, Y - 1, k));
  logEnd(c, 1, 'left', 1 + D / 2, true, D / 2, 2.5);
  logEnd(c, len + 1, 'right', 1 + D / 2, false, D / 2, 2.5);
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  ewShadowRows(c, 13, 3, n - 1);
  return c;
}

/** Fente de la face de coupe nord-sud : angle à l'image 0 (vers le haut à gauche), un quart de tour par image. */
const CRACK0 = (-3 * Math.PI) / 4;

/**
 * Bille nord-sud de h rangées (14 colonnes), à l'image k : le rond du fond (centre rangée 4,5), le dessus d'écorce, la face
 * de coupe de 11 × 7 (centre rangée h − 6,5) et sa fente qui tourne, contour, ombre. Les sillons courent le long de la
 * pièce (rangées) et défilent vers la droite.
 */
function bigRoundNS(h: number, k: number): Canvas {
  const w = 14, cx = 6.5, back = 4.5, front = h - 6.5, rx = 5.5, ry = 3.5;
  const c = new Canvas(w, h);
  const inDisk = (X: number, Y: number, cy: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const body = Math.abs(X + 0.5 - cx) <= rx && Y + 0.5 >= back && Y + 0.5 <= front;
    if (!body && !inDisk(X, Y, back)) continue;
    const s = (X + 0.5 - (cx - rx)) / (2 * rx);
    let q = barkS(BIG_RING, Y, s, k);
    // bord du bout lointain : sans sillon
    if (Y + 0.5 < back && !inDisk(X, Y - 1.5, back)) q = barkTone(s) === 'K' ? 'K' : 'N';
    c.set(X, Y, q);
  }
  paintFace(c, cx, front, rx, ry, { all: true });
  const th = CRACK0 + (k * Math.PI) / 2;
  for (let t = 0.3; t <= 0.95; t += 0.05) {
    const X = Math.floor(cx + t * rx * Math.cos(th));
    const Y = Math.floor(front + t * ry * Math.sin(th));
    if (((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - front) / ry) ** 2 <= 1) c.set(X, Y, 'N');
  }
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  nsShadow(c, 7);
  return c;
}

/**
 * Pièce est-ouest face plate en haut (demi-bille, quartier), image `w` × `h` : bois de X = 1 à w − 3. Rangée 1 : le liseré
 * d'écorce du bord nord ; 2 à `top` : la face plate (bois frais) ; `top` + 1 à `bottom` : le dos d'écorce (la moitié ombrée
 * de la bille), dont les bouts s'arrondissent ; à l'ouest, le bout en demi-lune de bois de bout, éclairé.
 */
function flatEW(w: number, h: number, top: number, bottom: number, endA: number): Canvas {
  const c = new Canvas(w, h);
  const x1 = w - 3;
  const back = bottom - top;
  for (let X = 1; X <= x1; X++) for (let Y = 1; Y <= bottom; Y++) {
    if (Y === 1) c.set(X, Y, 'M');
    else if (Y <= top) c.set(X, Y, splitWood(X, Y - 2));
    else c.set(X, Y, barkS(BIG_RING, X, 0.42 + (0.58 * (Y - top - 0.5)) / back, 0));
  }
  const ry = back + 0.5;
  const cy = top + 0.5;
  const inside = (X: number, Y: number, ox: number) => ((X + 0.5 - ox) / endA) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = top + 1; Y <= bottom; Y++) for (let X = 1; X <= x1; X++) {
    const left = X + 0.5 - 1 < endA, right = x1 + 1 - (X + 0.5) < endA;
    if (left && !inside(X, Y, 1 + endA)) c.px[Y][X] = EMPTY;
    else if (right && !inside(X, Y, x1 + 1 - endA)) c.px[Y][X] = EMPTY;
  }
  // bout ouest : la demi-lune de bois de bout sous la face plate, cerclée d'écorce
  const ox = 1 + endA;
  for (let Y = top + 1; Y <= bottom; Y++) for (let X = 1; X < 1 + 2 * endA; X++) {
    if (!inside(X, Y, ox) || c.get(X, Y) === EMPTY) continue;
    const rim = !inside(X - 1, Y, ox) || !inside(X, Y + 1, ox);
    let q = faceTone((X + 0.5 - ox) / endA, (Y + 0.5 - cy) / ry, rim, false, false);
    // l'arête avec la face plate, au-dessus : un cran plus sombre, pour que le bout se lise sous le dessus clair
    if (Y === top + 1 && !rim) q = ({ Y: 't', t: 'T' } as Record<string, string>)[q] ?? q;
    c.set(X, Y, q);
  }
  // bout est : l'écorce qui s'enroule, un cran plus sombre sur son bord
  for (let Y = top + 1; Y <= bottom; Y++) {
    let X = x1;
    while (X > 0 && c.get(X, Y) === EMPTY) X--;
    if (X > 0) c.set(X, Y, DARKER[c.get(X, Y)] ?? c.get(X, Y));
  }
  despeckle(c, 'KYTtNM');
  shadedOutline(c);
  ewShadowRows(c, bottom + 2, h - bottom - 2, x1 + 1);
  return c;
}

/** Bout coupé tourné vers le sud d'une demi-bille nord-sud : la demi-lune de bois de bout, son arête un cran plus sombre. */
function southEnd(c: Canvas, cx: number, cy: number, rx: number, ry: number) {
  const inside = (X: number, Y: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = Math.floor(cy); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    if (!inside(X, Y)) continue;
    const rim = !inside(X, Y + 1) || !inside(X - 1, Y) || !inside(X + 1, Y);
    let k = faceTone((X + 0.5 - cx) / rx, (Y + 0.5 - cy) / ry, rim, false, true);
    if (Y === Math.floor(cy)) k = ({ Y: 't', t: 'T' } as Record<string, string>)[k] ?? k;
    c.set(X, Y, k);
  }
}

/** Bout d'un quartier nord-sud, au pixel : le quart de disque, le cœur dans l'angle haut droit (contre la fente). */
const QUARTER_END = ['NTttT', 'NYtTT', '.NYtT', '..NtT', '...NN'];

/**
 * Pièce nord-sud face plate en haut, image `w` × `h` : face plate de X = 1 à `x1`, rangées 1 à h − 9 (fibres en long,
 * liseré d'écorce à gauche, et à droite pour la demi-bille), puis le bout coupé au sud. `quarter` : à droite, la fente,
 * sans écorce ; le bout est un quart de disque.
 */
function flatNS(w: number, h: number, x1: number, quarter: boolean): Canvas {
  const c = new Canvas(w, h);
  const y1 = h - 9;
  for (let Y = 1; Y <= y1; Y++) for (let X = 1; X <= x1; X++) {
    if (X === 1) c.set(X, Y, 'M');
    else if (X === x1 && !quarter) c.set(X, Y, 'm');
    else c.set(X, Y, splitWood(Y, X - 2));
  }
  if (quarter) c.stamp(QUARTER_END, 1, y1 + 1);
  else southEnd(c, (x1 + 2) / 2, y1 + 1, x1 / 2, 5.4);
  despeckle(c, 'KYTtNM');
  shadedOutline(c);
  nsShadow(c, 3);
  return c;
}

// ---------- Le quartier retourné ----------

/**
 * Bois frais d'une face fendue tournée vers le bas (le V sous le quartier retourné), dans l'ombre : fond T, des fibres
 * d'un cran plus claires (t) sur les deux rangées du haut, l'arête du cœur toute en T.
 */
function shadedSplit(along: number, across: number): string {
  const a = mod(Math.floor(along), TILE);
  const hit = SPLIT_LANES[(across + 1) % SPLIT_LANES.length].some(([s, n]) => mod(a - s, TILE) < n);
  return hit && across < 2 ? 't' : 'T';
}

/**
 * Quartier retourné est-ouest (le quartier tête-bêche des tas), image `w` × 12, même cadre que le quartier : bois de X = 1
 * à w − 3, rangées 1 à 8. Rangées 1 à 5 : le dos d'écorce dessus (le haut éclairé, le bas de l'arrondi dans l'ombre) ;
 * 6 à 8 : la face fendue sud du V, dans l'ombre, l'arête du cœur au sol. Les bouts sont larges en haut et se pincent vers
 * l'arête en bas ; à l'ouest, le bout coupé : le quart de rond pointe en bas, cerclé de N, le cœur (T) vers la pointe.
 */
function quarterRevEW(w: number): Canvas {
  const c = new Canvas(w, 12);
  const x1 = w - 3;
  // bout ouest (colonnes 1 à 4) : le quart de rond retourné, vu en raccourci : large en haut sous l'arrondi d'écorce,
  // pincé en bas vers la pointe (le cœur), cerclé de N ; « . » : hors de la pièce
  const WEST = ['', '.NNN', 'NYYN', 'NYtN', 'NYtN', '.NtN', '.NTN', '..NN', '...N'];
  // bout est : la silhouette arrondie en haut, pincée en bas (retrait par rangée ; la partie d'arrivée n'a que deux
  // colonnes de bois)
  const EAST = [0, 1, 0, 0, 0, 0, 0, 1, 1];
  const BARK_S = [0, 0.05, 0.2, 0.4, 0.6, 0.85];
  for (let Y = 1; Y <= 8; Y++) for (let X = 1; X <= x1 - EAST[Y]; X++) {
    const w = WEST[Y][X - 1];
    if (w === '.') continue;
    c.set(X, Y, w ?? (Y <= 5 ? barkS(BIG_RING, X, BARK_S[Y], 0) : shadedSplit(X, Y - 6)));
  }
  // bout est : le dernier pixel de chaque rangée un cran plus sombre (l'écorce et la fente qui tournent)
  const DARK: Record<string, string> = { ...DARKER, Y: 't', t: 'T' };
  for (let Y = 1; Y <= 8; Y++) {
    const X = x1 - EAST[Y];
    c.set(X, Y, DARK[c.get(X, Y)] ?? c.get(X, Y));
  }
  despeckle(c, 'KYTtNM');
  shadedOutline(c);
  ewShadowRows(c, 10, 2, x1 + 1);
  return c;
}

/** Bout sud d'un quartier retourné nord-sud, au pixel : le quart de rond pointe en bas, le cœur (T) à la pointe. */
const QUARTER_REV_END = ['MNNNN', 'NYYtN', 'NYttN', '.NtT.', '..N..'];

/**
 * Quartier retourné nord-sud, image 8 × `h` (le cadre du quartier) : le dos d'écorce vu de dessus, de X = 1 à 5 (éclairé
 * à l'ouest, dans l'ombre à l'est, les sillons en long), le bout lointain arrondi, puis le bout coupé au sud.
 */
function quarterRevNS(h: number): Canvas {
  const c = new Canvas(8, h);
  const y1 = h - 9;
  const S = [0, 0.08, 0.24, 0.42, 0.6, 0.8];
  for (let Y = 1; Y <= y1; Y++) for (let X = 1; X <= 5; X++) {
    if (Y === 1 && (X === 1 || X === 5)) continue;
    c.set(X, Y, Y === 1 ? (X === 4 ? 'N' : 'm') : barkS(BIG_RING, Y, S[X], 0));
  }
  c.stamp(QUARTER_REV_END, 1, y1 + 1);
  despeckle(c, 'KYTtNM');
  shadedOutline(c);
  nsShadow(c, 3);
  return c;
}

// ---------- Le coin et la fente ----------

/**
 * La tête du coin de fendage (2 px de large) qui sort de `out` px du bout (3, 2, 1 : le coin s'enfonce à chaque coup),
 * entrée en (x, y), dans la direction `dir` : fer clair (2) côté lumière, fer (3) de l'autre, le bout de la tête et le
 * pixel d'entrée sombres (0, 3). Le pixel d'entrée ne bouge pas : seule la part qui dépasse raccourcit.
 */
function wedgeHead(c: Canvas, x: number, y: number, dir: [number, number], out = 3): [number, number][] {
  const side: [number, number] = dir[0] !== 0 ? [0, 1] : [1, 0];
  const px: [number, number][] = [];
  for (let k = 0; k <= out; k++) {
    const X = x + dir[0] * k, Y = y + dir[1] * k;
    const tip = k === out;
    // presque entré (out = 1) : le pixel d'entrée reste clair, pour que la tête se lise encore comme du fer
    const dark = tip || (k === 0 && out > 1);
    c.set(X, Y, dark ? '3' : '2');
    c.set(X + side[0], Y + side[1], dark ? '0' : '3');
    px.push([X, Y], [X + side[0], Y + side[1]]);
  }
  return px;
}

/** Écart en travers d'une fente le long de la pièce : périodique sur 24 px, des paliers de 3 à 6 px. */
const JOG = [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0];
const jog = (along: number) => JOG[mod(along, TILE)];

/** Ce qu'il faut pour fendre un aspect dans un sens : où planter le coin aux deux bouts, et le tracé de sa fente. */
interface SplitDraw {
  /** La pièce de référence (image 0). */
  base: Canvas;
  /** Tête du coin au bout de départ et au bout d'arrivée : point d'entrée et direction. */
  wedge: Record<'start' | 'end', { at: [number, number]; dir: [number, number] }>;
  /** La fente le long de la pièce : les pixels, dans l'ordre. */
  along: [number, number][];
  /** La fente sur la face de coupe visible (bout de départ en est-ouest, d'arrivée en nord-sud). */
  face: [number, number][];
  /** Côté de la lèvre (bois frais) quand la fente bâille : décalage en travers. */
  lip: [number, number];
  /** Pixels du contour où la fente ouverte entaille la silhouette. */
  notches: [number, number][];
}

/** Un pixel du corps (ni vide, ni ombre, ni contour du bas) ? */
const solid = (c: Canvas, X: number, Y: number) => {
  const q = c.get(X, Y);
  return q !== EMPTY && q !== 'x' && q !== 'o';
};

// =====================================================================================================================
// Pièce de référence et parties
// =====================================================================================================================

interface SheetParts {
  axis: WoodAxis;
  frame: { w: number; h: number };
  /** Animations : nom -> images (chaque image : la partie seule, calée en haut à gauche). */
  anims: Record<string, Grid[]>;
}

/** Longueur (px, le long de la pièce) de la référence : départ, deux milieux, arrivée. */
const refTotal = (start: number, end: number) => start + 2 * TILE + end;

/** Les pixels [from, from + size[ le long de la pièce (colonnes en est-ouest, rangées en nord-sud). */
function slice(c: Canvas, axis: WoodAxis, from: number, size: number): Grid {
  const g = c.toGrid();
  return axis === 'ew' ? g.map((r) => r.slice(from, from + size)) : g.slice(from, from + size);
}

/** Les trois parties d'une pièce de référence, avec le garde-fou du milieu périodique. */
function cut3(c: Canvas, axis: WoodAxis, start: number, end: number, what: string): Record<Part, Grid> {
  const total = axis === 'ew' ? c.w : c.h;
  const mid = slice(c, axis, start, TILE);
  const mid2 = slice(c, axis, start + TILE, TILE);
  if (mid.join('|') !== mid2.join('|')) throw new Error(`wood-pieces : ${what}, le milieu n'est pas périodique sur ${TILE} px`);
  return { start: slice(c, axis, 0, start), mid, end: slice(c, axis, total - end, end) };
}

/** Ne garde d'un canevas que les pixels qui diffèrent de `base` (la fente seule). */
function diff(c: Canvas, base: Canvas): Canvas {
  const out = new Canvas(c.w, c.h);
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) if (c.px[Y][X] !== base.px[Y][X]) out.px[Y][X] = c.px[Y][X];
  return out;
}

/** Fente : `pts` en K sur le corps, sauf sur les pixels de `skip` (le fer du coin). */
function drawCrack(c: Canvas, pts: [number, number][], skip: [number, number][] = []) {
  const no = new Set(skip.map(([x, y]) => `${x},${y}`));
  for (const [X, Y] of pts) if (solid(c, X, Y) && !no.has(`${X},${Y}`)) c.set(X, Y, 'K');
}

/** Fente grande ouverte : le trait K, la lèvre de bois frais à côté (t, T au bord du corps), les entailles du contour. */
function drawOpen(c: Canvas, sd: SplitDraw) {
  const pts = [...sd.along, ...sd.face];
  const lips: [number, number][] = pts.map(([X, Y]) => [X + sd.lip[0], Y + sd.lip[1]]);
  const key = new Set(pts.map(([x, y]) => `${x},${y}`));
  lips.forEach(([X, Y]) => {
    if (!solid(c, X, Y) || key.has(`${X},${Y}`)) return;
    // la lèvre, un cran plus sombre par endroits (périodique : X + Y suit la pièce à un écart près)
    c.set(X, Y, mod(X + Y, 8) === 2 ? 'T' : 't');
  });
  for (const [X, Y] of pts) if (solid(c, X, Y)) c.set(X, Y, 'K');
  for (const [X, Y] of sd.notches) c.set(X, Y, 'K');
}

/**
 * Tracés du fendage du gros bois, sur une pièce de référence de longueur `total` (px le long de la pièce), pour le rond
 * et la demi-bille, est-ouest et nord-sud.
 */
function bigSplitDraw(look: 'round' | 'half', axis: WoodAxis, total: number): SplitDraw {
  if (axis === 'ew') {
    const n = total - 1;
    if (look === 'round') {
      const base = bigRoundEW(n, 0);
      // la fente : sur le dessus éclairé (rangée 3), du bout ouest au bout est ; sur la face de coupe ouest, la colonne 3
      const along: [number, number][] = [];
      for (let X = 4; X <= n - 3; X++) along.push([X, 3 + jog(X)]);
      const face: [number, number][] = [];
      for (let Y = 1; Y <= 11; Y++) face.push([Y >= 10 ? 2 : 3, Y]);
      return {
        base, along, face, lip: [0, -1],
        wedge: { start: { at: [3, 6], dir: [-1, 0] }, end: { at: [n - 3, 6], dir: [1, 0] } },
        notches: [[n - 2, 3 + jog(n - 2)], [n - 1, 3 + jog(n - 2)]],
      };
    }
    const base = flatEW(n + 1, 16, 5, 11, 2.5);
    // la fente : au milieu de la face plate (rangée 3), puis elle descend la demi-lune du bout ouest
    const along: [number, number][] = [];
    for (let X = 2; X <= n - 2; X++) along.push([X, 3 + jog(X)]);
    const face: [number, number][] = [];
    for (let Y = 6; Y <= 11; Y++) face.push([Y >= 9 ? 3 : 2, Y]);
    return {
      base, along, face, lip: [0, 1],
      wedge: { start: { at: [3, 3], dir: [-1, 0] }, end: { at: [n - 3, 3], dir: [1, 0] } },
      notches: [[0, 3], [n - 1, 3 + jog(n - 1)]],
    };
  }
  const h = total;
  if (look === 'round') {
    const base = bigRoundNS(h, 0);
    // la fente : sur la crête (colonne 6), du rond du fond au haut de la face ; sur la face de coupe sud, la colonne 6
    const along: [number, number][] = [];
    for (let Y = 2; Y <= h - 11; Y++) along.push([6 + jog(Y), Y]);
    const face: [number, number][] = [];
    for (let Y = h - 10; Y <= h - 4; Y++) face.push([Y === h - 8 ? 7 : 6, Y]);
    return {
      base, along, face, lip: [1, 0],
      wedge: { start: { at: [6, 3], dir: [0, -1] }, end: { at: [6, h - 7], dir: [0, 1] } },
      notches: [[6, 0], [6, 1]],
    };
  }
  const base = flatNS(14, h, 11, false);
  const along: [number, number][] = [];
  for (let Y = 1; Y <= h - 9; Y++) along.push([6 + jog(Y), Y]);
  const face: [number, number][] = [];
  for (let Y = h - 8; Y <= h - 4; Y++) face.push([Y === h - 6 ? 7 : 6, Y]);
  return {
    base, along, face, lip: [1, 0],
    wedge: { start: { at: [6, 3], dir: [0, -1] }, end: { at: [6, h - 8], dir: [0, 1] } },
    notches: [[6, 0], [7, 0]],
  };
}

/** Ce qui dépasse du coin de fendage, image par image (le jeu prend l'image min(2, ⌊3 × coups / coups totaux⌋)). */
const WEDGE_OUT = [3, 2, 1];

/** Les parties d'un aspect qui se fend : `wedge-…-start|end`, `crack-…-start|mid|end`, `open-…-start|mid|end`. */
function splitParts(look: 'round' | 'half', axis: WoodAxis, anims: Record<string, Grid[]>) {
  const g = lookDef('big', look)[axis];
  const total = refTotal(g.start, g.end);
  const sd = bigSplitDraw(look, axis, total);
  // le coin, à chaque bout, à trois profondeurs : il sort de 3, 2, puis 1 px (images 0, 1, 2). Les images 1 et 2 ne
  // viennent qu'après un coup, la fente déjà ouverte depuis ce bout : là où le fer de l'image 0 s'est retiré, elles
  // portent elles-mêmes la fente (la couche `crack-…` épargne tout le fer de l'image 0)
  const crackPts = new Set([...sd.along, ...sd.face].map(([x, y]) => `${x},${y}`));
  const fers: Record<'start' | 'end', [number, number][]> = { start: [], end: [] };
  for (const end of ['start', 'end'] as const) {
    anims[`wedge-${look}-${end}`] = WEDGE_OUT.map((out, i) => {
      const c = Canvas.from(sd.base.toGrid());
      const px = wedgeHead(c, sd.wedge[end].at[0], sd.wedge[end].at[1], sd.wedge[end].dir, out);
      if (i === 0) fers[end] = px;
      const held = new Set(px.map(([x, y]) => `${x},${y}`));
      for (const [X, Y] of fers[end]) {
        if (!held.has(`${X},${Y}`) && crackPts.has(`${X},${Y}`) && solid(c, X, Y)) c.set(X, Y, 'K');
      }
      return cut3(c, axis, g.start, g.end, `wedge-${look}-${axis}-${i}`)[end];
    });
  }
  // la fente seule (le fer des deux bouts épargné, celui de l'image 0, qui couvre les deux autres : elle passe sous la
  // tête du coin)
  const cracked = Canvas.from(sd.base.toGrid());
  drawCrack(cracked, [...sd.along, ...sd.face], [...fers.start, ...fers.end]);
  const crack = cut3(diff(cracked, sd.base), axis, g.start, g.end, `crack-${look}-${axis}`);
  // grand ouvert
  const open = Canvas.from(sd.base.toGrid());
  drawOpen(open, sd);
  const op = cut3(open, axis, g.start, g.end, `open-${look}-${axis}`);
  for (const part of PARTS) {
    anims[`crack-${look}-${part}`] = [crack[part]];
    anims[`open-${look}-${part}`] = [op[part]];
  }
}

// ---------- Encoches du gros ----------
// Est-ouest : bande de 7 colonnes (notch.ew.w), la colonne 5 (notch.ew.at) est la première à l'est de la coupe ; la
// saignée (K) en colonne 4, le flanc ouest de l'entaille en bois frais (Y t T) qui descend vers elle. Image 0 : sur le
// dessus, la silhouette se creuse ; image 1 : la pièce a roulé d'un quart vers le sud, l'entaille est sur la face qu'on
// voit ; image 2 : dessous, presque rien ; image 3 : au nord, la silhouette s'ébrèche à peine.
const SH = ['x', 'x', 'x'];
const ewBand = (rows: string[]): Grid => [...rows, ...SH.map(() => 'xxxxxxx')];
const EW_PLAIN = ['KKKKKKK', 'MMMMMMM', 'MMMMMMM', 'MMMMMMM', 'mmmmmmm', 'mmmmmmm', 'mmmmmmm', 'mmmmmmm', 'mmmmmmm', 'NNNNNNN', 'NNNNNNN', 'KKKKKKK', 'ooooooo'];
const ewWith = (edits: Record<number, string>): Grid => ewBand(EW_PLAIN.map((r, i) => edits[i] ?? r));
const BIG_EW_NOTCH: Record<1 | 2, Grid[]> = {
  1: [
    ewWith({ 0: 'KK...KK', 1: 'MKYYtKM', 2: 'MMYtTKM', 3: 'MMMtTKM', 4: 'mmmmTKm' }),
    ewWith({ 4: 'mmYYtKm', 5: 'mmmYtKm', 6: 'mmmtTKm', 7: 'mmmmTKm' }),
    ewWith({ 10: 'NNNKKNN', 11: 'KKKKKKK' }),
    ewWith({ 0: 'KKK.KKK', 1: 'MMKKKMM' }),
  ],
  2: [
    ewWith({ 0: 'K....KK', 1: 'MK...KM', 2: 'MKYYtKM', 3: 'MMYYtKM', 4: 'mmmYtKm', 5: 'mmmtTKm', 6: 'mmmmTKm', 7: 'mmmmmKm' }),
    ewWith({ 3: 'MYYYtKM', 4: 'mmYYtKm', 5: 'mmYttKm', 6: 'mmmtTKm', 7: 'mmmtTKm', 8: 'mmmmTKm', 9: 'NNNNNKN' }),
    ewWith({ 9: 'NNNNKKN', 10: 'NNKKKKN', 11: 'KK.KKKK', 12: 'oo.oooo' }),
    ewWith({ 0: 'KK..KKK', 1: 'MKK.KMM', 2: 'MMKKKMM' }),
  ],
};

// Nord-sud : bande de 4 rangées (notch.ns.h), la rangée 2 (notch.ns.at) est la première au sud de la coupe. Image 0 :
// la saignée en travers du dessus, son flanc nord (tourné vers nous) en bois frais, le fond en K ; à deux tiers, les côtés
// de la silhouette s'ébrèchent. Image 1 : sur le flanc est ; image 2 : dessous ; image 3 : sur le flanc ouest.
const NS_PLAIN = 'KMMMmmmmmNNKox';
const BIG_NS_NOTCH: Record<1 | 2, Grid[]> = {
  1: [
    ['KMMYYYttmNNKox', 'KMYtttTTTNNKox', 'KMNKKKKKKNNKox', NS_PLAIN],
    ['KMMMmmmYYtNKox', 'KMMMmmmmtTKKox', 'KMMMmmmmmKNKox', NS_PLAIN],
    [NS_PLAIN, NS_PLAIN, 'KMMMmmmmmNKKox', NS_PLAIN],
    ['KYYttmmmmNNKox', 'KttKKmmmmNNKox', 'KKKMmmmmmNNKox', NS_PLAIN],
  ],
  2: [
    ['KYYYYYttttNNox', '.KYtttTTTTTo.x', '.KKKKKKKKKKo.x', NS_PLAIN],
    ['KMMMmmYYttTTox', 'KMMMmmmYtTTo.x', 'KMMMmmmmKKKo.x', NS_PLAIN],
    [NS_PLAIN, NS_PLAIN, 'KMMMNKKKKNNKox', NS_PLAIN],
    ['KYYYttmmmNNKox', '.KttTKmmmNNKox', '.KKKKmmmmNNKox', NS_PLAIN],
  ],
};

/** Les planches du gros bois. */
function bigSheet(axis: WoodAxis): SheetParts {
  const anims: Record<string, Grid[]> = {};
  const looks = ['round', 'half', 'quarter'] as const;
  for (const look of looks) {
    const g = lookDef('big', look)[axis];
    const total = refTotal(g.start, g.end);
    const frames = [...Array(framesOf(look)).keys()].map((k) => {
      let c: Canvas;
      if (axis === 'ew') {
        const n = total - 1;
        c = look === 'round' ? bigRoundEW(n, k) : look === 'half' ? flatEW(n + 1, 16, 5, 11, 2.5) : flatEW(n + 1, 12, 3, 8, 1.75);
      } else {
        c = look === 'round' ? bigRoundNS(total, k) : look === 'half' ? flatNS(14, total, 11, false) : flatNS(8, total, 5, true);
      }
      return cut3(c, axis, g.start, g.end, `${look}-${axis}-${k}`);
    });
    for (const part of PARTS) anims[`${look}-${part}`] = frames.map((p) => p[part]);
  }
  // le quartier retourné (tête-bêche dans les tas) : les mêmes cotes que le quartier
  const q = lookDef('big', 'quarter')[axis];
  const qTotal = refTotal(q.start, q.end);
  const rev = cut3(axis === 'ew' ? quarterRevEW(qTotal) : quarterRevNS(qTotal), axis, q.start, q.end, `quarter-rev-${axis}`);
  for (const part of PARTS) anims[`quarter-rev-${part}`] = [rev[part]];
  for (const d of [1, 2] as const) anims[`notch${d}`] = (axis === 'ew' ? BIG_EW_NOTCH : BIG_NS_NOTCH)[d];
  for (const look of ['round', 'half'] as const) splitParts(look, axis, anims);
  return { axis, frame: frameOf('big', axis), anims };
}

// =====================================================================================================================
// Bois normal (les dessins de l'ancien timber.ts)
// =====================================================================================================================

type NormalLook = 'round' | 'f1' | 'f2' | 'f3' | 'beam';
const NORMAL_LOOKS: NormalLook[] = ['round', 'f1', 'f2', 'f3', 'beam'];
const NEW = lookDef('normal', 'round').ew;
const NNS = lookDef('normal', 'round').ns;
for (const l of NORMAL_LOOKS) {
  const g = lookDef('normal', l);
  if (JSON.stringify([g.ew.h, g.ew.start, g.ew.end, g.ns.w, g.ns.extra, g.ns.back, g.ns.start, g.ns.end])
    !== JSON.stringify([10, 5, 4, 9, 7, 3, 5, 8])) throw new Error(`wood-pieces : géométrie du normal « ${l} » hors des dessins`);
}
const ND = 6;

/** Fil du bois dressé : tirets [début, longueur] d'un cran plus sombres, sur 24 px, par couloir. */
const GRAIN: Record<string, [number, number][]> = {
  a: [[3, 4], [16, 3]],
  b: [[10, 4], [21, 3]],
  c: [[6, 3], [18, 4]],
};
const HEWN_DARKER: Record<string, string> = { Y: 't', t: 'T', T: 'T' };
function grain(along: number, lane: keyof typeof GRAIN, base: string): string {
  const a = mod(along, TILE);
  return GRAIN[lane].some(([s, n]) => mod(a - s, TILE) < n) ? HEWN_DARKER[base] : base;
}

const nBark = (along: number, v: number, k: number, plain = false) => barkV(NORMAL_RING, along, v, k, plain);

// Est-ouest : rangées 0 contour du haut, 1-6 corps, 7 contour du bas (au sol), 8-9 ombre ; bouts au pixel.
const N_EW_START: Record<NormalLook, Grid> = {
  round: ['..KKK', '.KNNM', 'KNYtN', 'KNYtN', 'KNtTN', 'KNttN', '.oNNN', '..ooo'],
  f1: ['..KKK', '.KNNM', 'KNYtN', 'KNYtT', 'KNtTT', 'KNttT', '.oNNT', '..ooo'],
  f2: ['.KKKK', 'KNNNM', 'KYYtN', 'KYYtT', 'KYtTT', 'KtttT', '.oNNT', '..ooo'],
  f3: ['.KKKK', 'KYYYt', 'KYYtt', 'KYYtT', 'KYtTT', 'KtttT', '.oNNT', '..ooo'],
  beam: ['.KKKK', 'KYYYt', 'KYttt', 'KYtTT', 'KttTT', 'KtTTT', 'KtTTT', '.oooo'],
};
const N_EW_END: Record<NormalLook, Grid> = {
  round: ['K...', 'mo..', 'Mmo.', 'mNo.', 'mNo.', 'NKo.', 'Ko..', 'o...'],
  f1: ['K...', 'mo..', 'Mmo.', 'tTo.', 'tTo.', 'tTo.', 'TTo.', 'oo..'],
  f2: ['KK..', 'MNo.', 'MNo.', 'tTo.', 'tTo.', 'tTo.', 'TTo.', 'oo..'],
  f3: ['KK..', 'YTo.', 'YTo.', 'tTo.', 'tTo.', 'tTo.', 'TTo.', 'oo..'],
  beam: ['KK..', 'YTo.', 'YTo.', 'tTo.', 'tTo.', 'tTo.', 'TTo.', 'oo..'],
};

function nEwColumn(look: NormalLook, along: number, k: number): string[] {
  const col = ['K'];
  for (let v = 0; v < ND; v++) {
    const row = v + 1;
    if (look === 'round') col.push(nBark(along, v, k));
    else if (row <= 2) col.push(look === 'f1' || look === 'f2' ? nBark(along, v, 0) : row === 2 ? grain(along, 'c', 'Y') : 'Y');
    else col.push(row === 6 ? 'T' : row === 5 ? grain(along, 'b', 't') : 't');
  }
  col.push('o');
  return col;
}

function nEwFull(look: NormalLook, n: number, k: number): Canvas {
  const c = new Canvas(n + 1, NEW.h);
  for (let X = 0; X < n; X++) nEwColumn(look, X, k).forEach((q, Y) => c.set(X, Y, q));
  const put = (g: Grid, x0: number) => g.forEach((row, Y) => [...row].forEach((q, i) => { c.px[Y][x0 + i] = q; }));
  put(N_EW_START[look], 0);
  put(N_EW_END[look], n + 1 - NEW.end);
  for (let X = 2; X <= n; X++) if (c.get(X, 8) === EMPTY) c.set(X, 8, 'x');
  for (let X = 4; X <= n - 1; X++) if (c.get(X, 9) === EMPTY) c.set(X, 9, 'x');
  return c;
}

// Nord-sud : 9 colonnes (8 de corps et une d'ombre) ; bout nord (5 rangées), dessus, face de bout au sud.
const N_NS_START: Record<NormalLook, Grid> = {
  round: ['..KKKK...', '.KNNNNo..', 'KNNNNNNo.', 'KMMmmNNo.', 'KMMmmNNo.'],
  f1: ['..KKKK...', '.KYNNNo..', '.KYNNNNo.', '.KYmmNNo.', '.KYmmNNo.'],
  f2: ['..KKKK...', '.KYNNTo..', '.KYNNTo..', '.KYmmTo..', '.KYmmTo..'],
  f3: ['..KKKK...', '.KYYYto..', '.KYYYto..', '.KYYYto..', '.KYYYto..'],
  beam: ['..KKKK...', '.KYYYto..', '.KYYYto..', '.KYYYto..', '.KYYYto..'],
};
const N_NS_END: Record<Exclude<NormalLook, 'round'>, Grid> = {
  f1: ['.KYmmNNo.', '.KYNNNNo.', '.KYYttNo.', '.KYtTtNo.', '.otNNNo..', '..oooo...', '.........', '.........'],
  f2: ['.KYmmTo..', '.KYNNTo..', '.KYYtTo..', '.KYtTTo..', '.otNNTo..', '..oooo...', '.........', '.........'],
  f3: ['.KYYYto..', '.KtttTo..', '.KYtTTo..', '.KttTTo..', '.otNNTo..', '..oooo...', '.........', '.........'],
  beam: ['.KYYYto..', '.KtttTo..', '.KYtTTo..', '.KttTTo..', '.KtTTTo..', '..oooo...', '.........', '.........'],
};

function nNsRow(look: NormalLook, along: number, k: number): string {
  const b = (col: number, kk: number) => nBark(along, col - 1, kk);
  switch (look) {
    case 'round': return `K${[1, 2, 3, 4, 5, 6].map((c) => b(c, k)).join('')}o.`;
    case 'f1': return `.KY${[3, 4, 5, 6].map((c) => b(c, 0)).join('')}o.`;
    case 'f2': return `.KY${[3, 4].map((c) => b(c, 0)).join('')}To..`;
    default: return `.KY${grain(along, 'a', 'Y')}${grain(along, 'b', 'Y')}to..`;
  }
}

function nNsRound(h: number, k: number): Canvas {
  const cx = 4, back = NNS.back, front = h - 5, rx = 3, ry = 2;
  const c = new Canvas(NNS.w, h);
  const inDisk = (X: number, Y: number, cy: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < NNS.w; X++) {
    const body = Math.abs(X + 0.5 - cx) <= rx && Y + 0.5 >= back && Y + 0.5 <= front;
    if (!body && !inDisk(X, Y, back)) continue;
    const plain = Y >= front - 3 || Y < NNS.start;
    let q = nBark(Y, X - 1, plain ? 0 : k, plain);
    if (Y + 0.5 < back && !inDisk(X, Y - 1.5, back)) q = q === 'K' ? 'K' : 'N';
    c.set(X, Y, q);
  }
  paintFace(c, cx, front, rx, ry, { all: true });
  const th = CRACK0 + (k * Math.PI) / 2;
  for (let t = 0.3; t <= 0.95; t += 0.05) {
    const X = Math.floor(cx + t * rx * Math.cos(th));
    const Y = Math.floor(front + t * ry * Math.sin(th));
    if (((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - front) / ry) ** 2 <= 1) c.set(X, Y, 'N');
  }
  despeckle(c, 'KYTtNMm');
  return shadedOutline(c);
}

function nNsFull(look: NormalLook, h: number, k: number): Canvas {
  let c: Canvas;
  if (look === 'round') {
    c = nNsRound(h, k);
    N_NS_START.round.forEach((row, Y) => [...row].forEach((q, X) => (c.px[Y][X] = q)));
    for (let Y = NNS.start; Y < h - NNS.end; Y++) [...nNsRow('round', Y, k)].forEach((q, X) => (c.px[Y][X] = q));
  } else {
    c = new Canvas(NNS.w, h);
    for (let Y = 0; Y < h; Y++) [...nNsRow(look, Y, k)].forEach((q, X) => c.set(X, Y, q));
    N_NS_START[look].forEach((row, Y) => [...row].forEach((q, X) => (c.px[Y][X] = q)));
    N_NS_END[look].forEach((row, i) => [...row].forEach((q, X) => (c.px[h - NNS.end + i][X] = q)));
  }
  nsShadow(c, NNS.back + 2);
  return c;
}

const N_EW_NOTCH: Record<1 | 2, Grid[]> = {
  1: [
    ['K...K', 'MKNKM', 'MYtKM', 'mmTKm', 'mmmmm', 'NNNNN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KKKKK', 'MMMMM', 'MMMMM', 'mYtKm', 'mmTKm', 'NNNKN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KKKKK', 'MMMMM', 'MMMMM', 'mmmmm', 'mmmmm', 'NNNNN', 'NNKKN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KK.KK', 'MKKKM', 'MMMMM', 'mmmmm', 'mmmmm', 'NNNNN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
  ],
  2: [
    ['....K', 'K..KM', 'MKNKM', 'mYtKm', 'mmTKm', 'NNNKN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KKKKK', 'MMMMM', 'MYtKM', 'mYtKm', 'mmTKm', 'NNTKN', 'NNNKN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KKKKK', 'MMMMM', 'MMMMM', 'mmmmm', 'mmmmm', 'NNKKN', 'NKKKN', 'oo.oo', 'xxxxx', 'xxxxx'],
    ['K..KK', 'MK.KM', 'MMKMM', 'mmmmm', 'mmmmm', 'NNNNN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
  ],
};
const N_NS_NOTCH: Record<1 | 2, Grid[]> = {
  1: [
    ['KMYYttNox', 'KMtTTTNox', 'KNKKKKNox'],
    ['KMMmYtNox', 'KMMmtKNox', 'KMMmmKNox'],
    ['KMMmmNNox', 'KMMmmNNox', 'KMMmmNNox'],
    ['KYtmmNNox', 'KtKmmNNox', 'KKMmmNNox'],
  ],
  2: [
    ['KYYYttNox', '.KtTTTo.x', '.KKKKKo.x'],
    ['KMMYttTox', 'KMMmtTo.x', 'KMMmKKo.x'],
    ['KMMmmNNox', 'KMMmmNNox', 'KMNKKNNox'],
    ['KYttmNNox', '.KtTmNNox', '.KKKmNNox'],
  ],
};

function normalSheet(axis: WoodAxis): SheetParts {
  const anims: Record<string, Grid[]> = {};
  for (const look of NORMAL_LOOKS) {
    const g = lookDef('normal', look)[axis];
    const total = refTotal(g.start, g.end);
    const frames = [...Array(framesOf(look)).keys()].map((k) => {
      const c = axis === 'ew' ? nEwFull(look, total - 1, k) : nNsFull(look, total, k);
      return cut3(c, axis, g.start, g.end, `normal-${look}-${axis}-${k}`);
    });
    for (const part of PARTS) anims[`${look}-${part}`] = frames.map((p) => p[part]);
  }
  for (const d of [1, 2] as const) anims[`notch${d}`] = (axis === 'ew' ? N_EW_NOTCH : N_NS_NOTCH)[d];
  return { axis, frame: frameOf('normal', axis), anims };
}

// =====================================================================================================================
// Planches et assemblage
// =====================================================================================================================

/** Cadre commun d'une planche : assez grand pour la plus grande partie et la bande d'encoche. */
function frameOf(size: string, axis: WoodAxis): { w: number; h: number } {
  const s = sizeOf(size);
  const looks = Object.values(s.looks);
  if (axis === 'ew') {
    return { w: Math.max(TILE, s.notch.ew.w, ...looks.flatMap((l) => [l!.ew.start, l!.ew.end])), h: Math.max(...looks.map((l) => l!.ew.h)) };
  }
  return { w: Math.max(...looks.map((l) => l!.ns.w)), h: Math.max(TILE, s.notch.ns.h, ...looks.flatMap((l) => [l!.ns.start, l!.ns.end])) };
}

const SHEETS: Record<string, Record<WoodAxis, SheetParts>> = {
  big: { ew: bigSheet('ew'), ns: bigSheet('ns') },
  normal: { ew: normalSheet('ew'), ns: normalSheet('ns') },
};

/**
 * L'image d'une pièce, exactement comme le jeu l'assemble (`composeOps`) : une partie pose les pixels [0, size[ de son
 * image le long de la pièce à `at` (seulement ceux qui tombent dans `clip` s'il est donné), le travers entier ; `clear`
 * efface la bande. `reversed` : le quartier retourné, `quarter-rev-<partie>` à la place de `quarter-<partie>`.
 */
export function composeWood(piece: WoodPiece, opts: ComposeOpts = {}, reversed = false): Canvas {
  const { w, h } = woodSize(piece.size, lookOf(piece), piece.axis, piece.length);
  const c = new Canvas(w, h);
  const sheet = SHEETS[piece.size]?.[piece.axis];
  if (!sheet) throw new Error(`wood-pieces : pas de planche pour « ${piece.size} »`);
  const ew = piece.axis === 'ew';
  for (const op of composeOps(piece, opts)) {
    if (op.kind === 'clear') {
      for (let i = op.at; i < op.at + op.size; i++) {
        if (ew) for (let Y = 0; Y < h; Y++) c.set(i, Y, EMPTY);
        else for (let X = 0; X < w; X++) c.set(X, i, EMPTY);
      }
      continue;
    }
    // le quartier retourné se pose aux places du quartier (mêmes placements)
    const anim = reversed ? op.anim.replace(/^quarter-/, 'quarter-rev-') : op.anim;
    const frames = sheet.anims[anim];
    if (!frames) throw new Error(`wood-pieces : partie « ${anim} » absente de la planche ${piece.size}-${piece.axis}`);
    const part = frames[op.frame];
    for (let i = 0; i < op.size; i++) {
      const at = op.at + i;
      if (op.clip && (at < op.clip[0] || at >= op.clip[1])) continue;
      if (ew) part.forEach((row, Y) => { const q = row[i]; if (q !== undefined && q !== EMPTY) c.set(at, Y, q); });
      else [...(part[i] ?? '')].forEach((q, X) => { if (q !== EMPTY) c.set(X, at, q); });
    }
  }
  return c;
}

/** Une planche : chaque partie calée en haut à gauche du cadre. */
function sheetSource(size: string, sp: SheetParts): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const [name, frames] of Object.entries(sp.anims)) {
    animations[name] = { frames: frames.map((g) => new Canvas(sp.frame.w, sp.frame.h).stamp(g, 0, 0).toGrid()), frameRate: 1, repeat: 0 };
  }
  return {
    kind: 'spritesheet',
    name: `${sizeOf(size).sheet}${sp.axis === 'ns' ? '-ns' : ''}`,
    frameW: sp.frame.w,
    frameH: sp.frame.h,
    // le fer du coin de fendage (2 3 0) vient de la palette des outils, qui reprend toute la palette `world`
    palette: size === 'big' ? toolPalette : world,
    animations,
  };
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });
const piece = (size: string, shape: WoodPiece['shape'], axis: WoodAxis, length = 100): WoodPiece => ({ size, shape, axis, length });

export default [
  sheetSource('big', SHEETS.big.ew),
  sheetSource('big', SHEETS.big.ns),
  sheetSource('normal', SHEETS.normal.ew),
  sheetSource('normal', SHEETS.normal.ns),
  img('wood-big-round-100', composeWood(piece('big', 'round', 'ew'))),
  img('wood-big-round-100-ns', composeWood(piece('big', 'round', 'ns'))),
  img('wood-normal-round-100', composeWood(piece('normal', 'round', 'ew'))),
  img('wood-normal-round-100-ns', composeWood(piece('normal', 'round', 'ns'))),
  img('wood-big-quarter-100', composeWood(piece('big', 'quarter', 'ew'))),
  img('wood-big-quarter-100-ns', composeWood(piece('big', 'quarter', 'ns'))),
  img('wood-big-quarter-rev-100', composeWood(piece('big', 'quarter', 'ew'), {}, true)),
  img('wood-big-quarter-rev-100-ns', composeWood(piece('big', 'quarter', 'ns'), {}, true)),
  img('wood-piece', composeWood(piece('big', 'round', 'ew'))),
];

