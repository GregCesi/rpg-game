// La pièce de bois : un seul objet du monde (`wood-piece`), décrit par ses réglages (diamètre, longueur, forme, faces
// dressées, sens, encoche, coin planté), dont l'image s'assemble à sa longueur à partir de parties dessinées une fois par
// diamètre et par aspect. Contrat : src/world/woodShape.ts (tailles, placements, `composeOps`) et la géométrie de
// src/content/wood.json. Le jeu assemble à la volée avec les mêmes opérations que `composeWood` ci-dessous.
//
// Cinq planches, une par diamètre et par sens : `wood-big`, `wood-big-ns`, `wood-normal`, `wood-normal-ns`, et debout (le poteau,
// le normal seulement) `wood-normal-up` (rond, f1, f2, f3, poutre : `<aspect>-start|mid|end`, une image chacune, `normalUpSheet`).
// Chaque partie est calée en haut à gauche d'un cadre commun. Animations :
// - `<aspect>-start`, `<aspect>-mid`, `<aspect>-end` (gros : round, half ; normal : round, f1, f2, f3, beam) ; le rond a
//   4 images (le roulement, un tour), les autres une ;
// - gros seulement, le quartier : une partie par côté de sa face fendue debout (une image chacune), `quarter-north|south-
//   start|mid|end` dans la planche est-ouest, `quarter-east|west-start|mid|end` dans la planche nord-sud ;
// - `notch1`, `notch2` : la bande d'encoche de la coupe à la cognée (un tiers, deux tiers), 4 images comme le rond ;
// - gros seulement, pour le rond et la demi-bille (les aspects qui se fendent) : `wedge-<aspect>-start|end` (le bout où
//   le coin est planté, 3 images : le coin sort de 3, 2 puis 1 px, il s'enfonce à chaque coup ; le jeu prend l'image
//   min(2, ⌊3 × coups / coups totaux⌋)), `crack-<aspect>-start|mid|end` (la fente seule, transparente ailleurs),
//   `open-<aspect>-start|mid|end` (le bois grand ouvert du dernier coup de masse) ;
//
// Méthode : chaque aspect se dessine d'un tenant sur une pièce de référence (bout de départ, deux milieux, bout d'arrivée),
// avec une écorce et des fibres périodiques sur `tile` (24 px) le long de la pièce ; les parties en sont découpées. Un
// garde-fou vérifie que les deux milieux de la référence sont identiques : le milieu se répète sans couture.
//
// Matières : art/world/wood.ts (écorce M m N K en travers, lumière en haut à gauche, face de coupe Y t T cerclée de N).
// - Gros (`BIG_WOOD`, 11 px d'écorce, 55 cm) : comme les anciennes billes (big-felled.ts, roll.ts) : est-ouest 16 rangées
//   (contour, 11 d'écorce, contour, 3 d'ombre), bouts en ovale de 5 × 11 (face de coupe à l'ouest, écorce enroulée à
//   l'est) ; nord-sud (règle D, docs/STYLE.md section 8 : l'est-ouest tourné, 13 × n px) 14 colonnes, l'écorce de 11
//   colonnes éclairée à l'ouest, le bout lointain au nord (ovale de 11 × 5, l'écorce qui s'enroule), la face de coupe au
//   sud (bande de 11 × 5), l'ombre au sud et à l'est. L'anneau
//   d'écorce fait 22 rangées (deux fois la face visible), six couloirs de sillons de 4 à 6 px, périodiques sur 24 px ;
//   4 images = un tour, l'anneau tourne d'un quart par image (vers le bas en est-ouest, vers la droite en nord-sud), la
//   lumière reste en place ; la fente de la face de coupe nord-sud tourne d'un quart de tour par image.
// - Demi-bille : posée face plate en haut (bois frais de la fente, fibres en long, pas de cerne), un liseré d'écorce au
//   bord nord, le dos d'écorce dessous ; à l'ouest, le bout en demi-lune de bois de bout ; nord-sud (13 × n), le liseré
//   éclairé à l'ouest, un liseré d'écorce dans l'ombre à l'est, la demi-lune de 11 × 5 au sud.
// - Quartier : un quart de rond couché sur un rayon (section de 37,5 × 37,5 cm contour compris, 6 px de bois dans les deux
//   sens), une face fendue au sol, l'autre debout du côté `face`, l'écorce qui descend en arrondi de l'autre. Est-ouest
//   (20 × 11 px à 1 m) : face au sud, trois rangées d'écorce dessus et la face fendue claire sur 6 rangées (cernes en long,
//   cœur au sol) ; face au nord, l'arête en haut et tout le dos d'écorce ; à l'ouest, la part de tarte du bout. Nord-sud
//   (11 × 20 px à 1 m, règle D) : le dessus d'écorce en long sur six colonnes, la face debout du côté dit sur trois (claire
//   à l'ouest, dans l'ombre à l'est), au sud la part de tarte claire de 9 × 4, le cœur en bas du côté de la face, le bout
//   nord arrondi du côté de l'écorce (`quarterGroundNS`). Deux quartiers faces debout l'une contre l'autre (split.half de
//   wood.json) reforment la demi-bille.
// - Normal (`NORMAL_WOOD`, 6 px d'écorce) : est-ouest, les dessins du rondin et de la poutre de l'ancien
//   art/world/timber.ts, repris tels quels (bouts au pixel, faces dressées f1 à f3, poutre) ; nord-sud (8 × n, règle D),
//   dessinés en vue de dessus (`nNsFull`), les faces dressées tournées avec la pièce, bouts en ovale de 6 × 4.
// - Encoches nord-sud : la bande est-ouest transposée (`nsNotch`), en rangées.
// - Coin de fendage : la tête de fer (2 px de large, la rampe 2 3 0 de tools.ts) qui sort de 3, 2 ou 1 px du bout (le
//   pixel d'entrée fixe ; là où le fer s'est retiré, les images 1 et 2 portent la fente elle-même) ; fente : un
//   trait K qui court sur le dessus (rond : la rangée éclairée ; demi : le milieu de la face plate ; nord-sud : la crête)
//   et descend la face de coupe du bout du coin ; grand ouvert : la fente bâille sur toute la longueur, la lèvre en bois
//   frais, et traverse les deux bouts.
//
// Images tirées d'ici par `composeWood` : les pièces de 1 m des tas (`wood-big-round-100`, `-ns`, `wood-normal-round-100`,
// `-ns`), l'image de l'objet dans Tiled (`wood-piece`, la bille du gros, 1 m, est-ouest ; `wood-piece-ns`, la même nord-sud) et quatre images de contrôle du
// quartier de 1 m, une par côté de sa face debout (`wood-big-quarter-north-100`, `-south-100`, `-east-100-ns`, `-west-100-ns`).
// `quarterEW`, `quarterNS` et `pie` servent aussi à la vue portée et à l'icône du quartier (items/carried.ts, resources.ts) :
// `quarterNS` est l'ancien quartier nord-sud (9 colonnes), gardé pour la vue portée ; au sol, c'est `quarterGroundNS`.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { toolPalette } from '../items/tools';
import { despeckle, shadedOutline } from './big-tree';
import { barkTone, DARKER, faceTone, logEnd } from './wood';
import {
  WOOD, composeOps, framesOf, lookDef, lookOf, sizeOf, woodSize, type ComposeOpts, type WoodAxis,
} from '../../src/world/woodShape';
import type { WoodPiece } from '../../src/content/types';

const mod = (a: number, n: number) => ((a % n) + n) % n;
const TILE = 24;
for (const s of Object.values(WOOD.sizes)) if (s.tile !== TILE) throw new Error('wood-pieces : écorce et fibres périodiques sur 24 px (tile)');

type Part = 'start' | 'mid' | 'end';
/** Les sens couchés (le debout, `up`, a sa planche à part : `normalUpSheet`). */
type LyingAxis = Exclude<WoodAxis, 'up'>;
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

/** Ombre nord-sud (ancienne vue portée du quartier) : le corps décalé d'un pixel à droite et de deux vers le bas, à partir de la rangée `from`. */
function nsShadow(c: Canvas, from: number) {
  const body = Canvas.from(c.toGrid());
  for (let Y = from; Y < c.h; Y++) for (let X = 2; X < c.w; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    const q = body.get(X - 1, Y - 2);
    if (q !== EMPTY && q !== 'x') c.set(X, Y, 'x');
  }
}

/**
 * Ombre au sol d'une pièce nord-sud (règle D) : sous son bout sud et le long de son flanc est, le corps décalé d'un pixel à
 * droite et de deux vers le bas ; `wide` 2 : une seconde colonne, plus courte (décalée de deux à droite, trois vers le bas),
 * comme la dernière rangée, plus courte, de l'ombre est-ouest.
 */
function nsGroundShadow(c: Canvas, wide: 1 | 2) {
  const body = Canvas.from(c.toGrid());
  const shifts: [number, number][] = wide === 1 ? [[1, 2]] : [[1, 2], [2, 3]];
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    if (shifts.some(([dx, dy]) => { const q = body.get(X - dx, Y - dy); return q !== EMPTY && q !== 'x'; })) c.set(X, Y, 'x');
  }
}

/** Côtés dressés (plats) de la section d'une pièce : ouest, est, dessus, dessous. */
interface Section { w: boolean; e: boolean; top: boolean; bottom: boolean }
const ROUND_SECTION: Section = { w: false, e: false, top: false, bottom: false };

/**
 * Le pixel (X, Y) est-il dans le bout de section `sec` centré en (cx, cy), demi-axes rx (en travers) et ry (le long de la
 * pièce, la moitié du diamètre : le bout en raccourci) ? Ovale là où deux côtés ronds se rencontrent, coin carré ailleurs.
 */
function inSection(sec: Section, cx: number, cy: number, rx: number, ry: number, X: number, Y: number): boolean {
  const u = (X + 0.5 - cx) / rx, v = (Y + 0.5 - cy) / ry;
  if (Math.abs(u) > 1 || Math.abs(v) > 1) return false;
  const side = u < 0 ? sec.w : sec.e;
  const end = v < 0 ? sec.top : sec.bottom;
  return side || end ? true : u * u + v * v <= 1;
}

/**
 * Face de coupe d'un bout sud (la bande au sud d'une pièce nord-sud, la section en raccourci) : bois de bout éclairé en haut à
 * gauche, cerclé d'écorce (N) sur ses côtés ronds, le bois dressé (t) sur ses côtés plats, le cœur.
 */
function southFace(c: Canvas, sec: Section, cx: number, cy: number, rx: number, ry: number, rings: boolean) {
  const inside = (X: number, Y: number) => inSection(sec, cx, cy, rx, ry, X, Y);
  const out: [number, number, string][] = [];
  for (let Y = Math.floor(cy - ry); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    if (!inside(X, Y)) continue;
    const u = (X + 0.5 - cx) / rx, v = (Y + 0.5 - cy) / ry;
    // le bord : un voisin hors de la section ; côté rond, l'écorce ; côté plat, le bois dressé
    const roundRim = (!inside(X - 1, Y) && !sec.w) || (!inside(X + 1, Y) && !sec.e) || (!inside(X, Y - 1) && !sec.top) || (!inside(X, Y + 1) && !sec.bottom);
    const flatRim = !roundRim && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => !inside(X + dx, Y + dy));
    out.push([X, Y, roundRim ? 'N' : flatRim ? (u + v < 0 ? 'Y' : 't') : faceTone(u, v, false, false, rings)]);
  }
  for (const [X, Y, q] of out) c.set(X, Y, q);
}

/**
 * Pièce ronde ou dressée couchée nord-sud (règle D), sans contour ni ombre : silhouette de `W` colonnes sur h − 2 rangées
 * (contour compris), le dessus `top(X, Y)` (colonnes 1 à W − 2) entre ses deux bouts, des ovales de `ry` rangées (la section en
 * raccourci, comme les bouts de l'est-ouest) : au nord, le bout lointain, l'écorce qui s'enroule (un cran plus sombre sur son
 * bord) ; au sud, la face de coupe. Rend aussi le centre de la face sud.
 */
function nsLog(W: number, h: number, ry: number, sec: Section, top: (X: number, Y: number) => string, rings: boolean): { c: Canvas; front: number } {
  const n = h - 2;
  const c = new Canvas(W + 1, h);
  const cx = W / 2, rx = (W - 2) / 2;
  const back = 1 + ry, front = n - 1 - ry;
  for (let Y = 1; Y <= n - 2; Y++) for (let X = 1; X <= W - 2; X++) {
    if (Y + 0.5 < back && !inSection(sec, cx, back, rx, ry, X, Y)) continue;
    if (Y + 0.5 > front && !inSection(sec, cx, front, rx, ry, X, Y)) continue;
    c.set(X, Y, top(X, Y));
  }
  // bout nord : l'écorce qui s'enroule, plus sombre sur le pourtour
  const edge: [number, number][] = [];
  for (let Y = 1; Y + 0.5 < back; Y++) for (let X = 1; X <= W - 2; X++) {
    if (c.get(X, Y) !== EMPTY && c.get(X, Y - 1) === EMPTY) edge.push([X, Y]);
  }
  for (const [X, Y] of edge) c.px[Y][X] = DARKER[c.px[Y][X]] ?? c.px[Y][X];
  southFace(c, sec, cx, front, rx, ry, rings);
  return { c, front };
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
 * Bille nord-sud (règle D : la bille est-ouest tournée, 13 × n px) de h = n + 2 rangées (14 colonnes), à l'image k : l'écorce
 * de 11 colonnes, éclairée à l'ouest, les sillons le long de la pièce (ils défilent vers l'est quand elle roule) ; au nord, le
 * bout lointain en ovale de 11 × 5, l'écorce qui s'enroule ; au sud, la face de coupe, une bande de 11 × 5 (centre rangée
 * n − 3,5), et sa fente qui tourne d'un quart de tour par image ; contour, ombre au sud et à l'est.
 */
function bigRoundNS(h: number, k: number): Canvas {
  const rx = 5.5, ry = 2.5, cx = 6.5;
  const { c, front } = nsLog(13, h, ry, ROUND_SECTION, (X, Y) => barkS(BIG_RING, Y, (X - 0.5) / 11, k), true);
  const th = CRACK0 + (k * Math.PI) / 2;
  for (let t = 0.3; t <= 0.95; t += 0.05) {
    const X = Math.floor(cx + t * rx * Math.cos(th));
    const Y = Math.floor(front + t * ry * Math.sin(th));
    if (((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - front) / ry) ** 2 <= 0.8) c.set(X, Y, 'T');
  }
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  nsGroundShadow(c, 1);
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

/** Première rangée de la demi-lune d'une demi-bille nord-sud de h rangées : la bande du bout sud fait 5 rangées. */
const halfMoonNS = (h: number) => h - 8;

/**
 * Demi-bille nord-sud (règle D : 13 × n px, comme l'est-ouest tournée), image 14 × h (h = n + 2) : posée face plate en haut, la
 * face plate de bois frais (fibres en long) de la colonne 2 à 10, le liseré d'écorce à l'ouest, du côté de la lumière (comme
 * celui du nord en est-ouest) ; au nord, le bout lointain droit (le dos d'écorce est dessous) ; au sud, la demi-lune de bois de
 * bout, 11 × 5, son arête sombre sous la face plate, cerclée d'écorce ; à l'est, un liseré d'écorce dans l'ombre (le dos qui
 * descend). Contour, ombre au sud et à l'est.
 */
function halfNS(h: number): Canvas {
  const c = new Canvas(14, h);
  const y1 = halfMoonNS(h);
  for (let Y = 1; Y < y1; Y++) for (let X = 1; X <= 11; X++) c.set(X, Y, X === 1 ? 'M' : X === 11 ? 'N' : splitWood(Y, X - 2));
  // le bout nord : le bord de la face plate, un cran plus sombre (la fibre tranchée)
  for (let X = 2; X <= 10; X++) c.set(X, 1, ({ Y: 't', t: 'T' } as Record<string, string>)[c.get(X, 1)] ?? c.get(X, 1));
  c.set(1, 1, 'm');
  c.set(11, 1, 'K');
  southEnd(c, 6.5, y1, 5.5, 5);
  // l'arête entre la face plate et la demi-lune : le bois de bout s'y lit sous le dessus clair
  for (let X = 2; X <= 10; X++) if (c.get(X, y1) !== 'N') c.set(X, y1, 'T');
  despeckle(c, 'KYTtNM');
  shadedOutline(c);
  nsGroundShadow(c, 1);
  return c;
}

// ---------- Le quartier ----------
// Un quart de rond couché sur un de ses rayons : une face fendue au sol, l'autre debout d'un côté (`face`), l'écorce qui
// descend en arrondi de l'autre. Au gabarit contour compris, comme les autres pièces : section de 37,5 × 37,5 cm (le rayon
// de la bille, 27,5 cm, et le contour), 6 px de bois dans les deux sens : la face debout fait 6 rangées en est-ouest (face
// sud) comme la part de tarte du bout sud en nord-sud. 1 m : 20 × 11 px est-ouest, 8 × 18 px nord-sud.

type QuarterFace = 'north' | 'south' | 'east' | 'west';

/**
 * La part de tarte au pixel, par taille de boîte (`<w>x<h>`) et par coin du cœur (`br` en bas à droite, `bl` en bas à
 * gauche) : l'arc d'écorce (N) en face du cœur, le bois de bout clair (Y), un cerne (t), le cœur (T) dans l'angle droit
 * entre la face debout et la face au sol. « . » : hors de la part.
 */
const PIES: Record<string, Record<'bl' | 'br', string[]>> = {
  // le bout sud d'un quartier nord-sud (et la vue portée par le bout) : la face qui fait lire la pièce couchée, claire
  '6x6': {
    br: ['...NNN', '..NYYY', '.NYYtt', 'NYYtYY', 'NYtYYT', 'NYtYTT'],
    bl: ['NNN...', 'YYYN..', 'ttYYN.', 'YYtYYN', 'TYYtYN', 'TTYtYN'],
  },
  // le bout ouest d'un quartier est-ouest, sur toute sa hauteur (dessus et face)
  '4x9': {
    br: ['..NN', '..NY', '.NYY', '.NYt', 'NYYt', 'NYtY', 'NYtY', 'NtYT', 'NtTT'],
    bl: ['NN..', 'YN..', 'YYN.', 'tYN.', 'tYYN', 'YtYN', 'YtYN', 'TYtN', 'TTtN'],
  },
  // l'icône
  '5x5': {
    br: ['...NN', '.NNYY', 'NYYYt', 'NYYtT', 'NYtTT'],
    bl: ['NN...', 'YYNN.', 'tYYYN', 'TtYYN', 'TTtYN'],
  },
};

/**
 * Bois de bout en part de tarte dans la boîte (x0, y0, w, h), le cœur dans le coin `corner` (`PIES`). Chaque pixel de la
 * boîte hors de la part est passé à `outside` (effacé : la silhouette s'arrondit), sinon laissé tel quel.
 */
export function pie(c: Canvas, x0: number, y0: number, w: number, h: number, corner: 'bl' | 'br', outside?: (X: number, Y: number) => void) {
  const rows = PIES[`${w}x${h}`]?.[corner];
  if (!rows) throw new Error(`wood-pieces : pas de part de tarte de ${w} × ${h}`);
  rows.forEach((row, i) => [...row].forEach((q, j) => {
    if (q === '.') outside?.(x0 + j, y0 + i);
    else c.set(x0 + j, y0 + i, q);
  }));
}

/**
 * Face fendue debout tournée vers le sud (quartier est-ouest, `quarter-south`), rangée `row` de 0 (sous l'écorce) à 5 (le
 * cœur, au sol) : bois frais clair (Y), deux cernes en long (t, des tirets T sur le second), le cœur en T.
 */
function standingFace(along: number, row: number): string {
  const a = mod(Math.floor(along), TILE);
  const lane = (i: number) => SPLIT_LANES[i].some(([s, n]) => mod(a - s, TILE) < n);
  switch (row) {
    case 0: return lane(1) ? 't' : 'Y';
    case 1: return lane(0) ? 'Y' : 't';
    case 2: return lane(3) ? 't' : 'Y';
    case 3: return lane(2) ? 't' : 'Y';
    case 4: return lane(4) ? 'T' : 't';
    default: return lane(2) ? 't' : 'T';
  }
}

/** Écorce du dessus d'un quartier est-ouest face au sud, rangées 1 à 3 : l'arrondi qui fuit vers le nord, éclairé à l'arête. */
const SOUTH_TOP = [0, 0.4, 0.2, 0.08];
/** Écorce du quartier est-ouest face debout au nord (le dos tourné vers nous), rangées 1 à 9 : l'arête éclairée en haut. */
const NORTH_BARK = [0, 0.03, 0.12, 0.22, 0.33, 0.44, 0.55, 0.66, 0.78, 0.9];

/**
 * Quartier est-ouest, image `w` × 13 : bois de X = 1 à w − 3, rangées 1 à 9 (contour 0 et 10, ombre 11 et 12).
 * - `south` : la face debout au sud, vers nous : trois rangées d'écorce dessus (l'arrondi qui descend vers le nord, vu
 *   par son haut), puis la face fendue claire sur 6 rangées (cernes en long, le cœur au sol). À l'ouest, le bout : la
 *   part de tarte, le cœur en bas à droite contre la face, l'arc en haut à gauche (la silhouette s'y arrondit) ; à
 *   l'est, l'arrondi d'écorce répond, un cran plus sombre.
 * - `north` : la face debout au nord, cachée : on voit l'arête en haut et tout le dos d'écorce qui descend vers nous
 *   (éclairé en haut, dans l'ombre au pied). À l'ouest, la part de tarte, le cœur en bas à gauche, l'arc en haut à droite
 *   contre l'écorce ; à l'est, l'écorce qui s'enroule, un cran plus sombre, l'arrondi au pied.
 */
export function quarterEW(w: number, face: 'north' | 'south'): Canvas {
  const c = new Canvas(w, 13);
  const x1 = w - 3;
  for (let X = 1; X <= x1; X++) for (let Y = 1; Y <= 9; Y++) {
    if (face === 'south') c.set(X, Y, Y <= 3 ? barkS(BIG_RING, X, SOUTH_TOP[Y], 0) : standingFace(X, Y - 4));
    else c.set(X, Y, barkS(BIG_RING, X, NORTH_BARK[Y], 0));
  }
  const DARK: Record<string, string> = { ...DARKER, Y: 't', t: 'T' };
  if (face === 'south') {
    pie(c, 1, 1, 4, 9, 'br', (X, Y) => { c.px[Y][X] = EMPTY; });
    // est : l'arrondi du haut
    for (const Y of [1, 2, 3]) c.px[Y][x1] = EMPTY;
  } else {
    pie(c, 1, 1, 4, 9, 'bl');
    // est : l'écorce s'enroule au pied
    for (const Y of [8, 9]) c.px[Y][x1] = EMPTY;
  }
  // bout est : le dernier pixel de chaque rangée un cran plus sombre
  for (let Y = 1; Y <= 9; Y++) {
    let X = x1;
    while (X > 0 && c.get(X, Y) === EMPTY) X--;
    if (X > 4) c.set(X, Y, DARK[c.get(X, Y)] ?? c.get(X, Y));
  }
  shadedOutline(c);
  ewShadowRows(c, 11, 2, x1 + 1);
  return c;
}

/** Écorce du dessus d'un quartier nord-sud, colonnes 1 à 6 (`null` : le liseré de la face debout). */
const NS_TOP: Record<'east' | 'west', (number | null)[]> = {
  // face à l'est : l'écorce monte de l'ouest (éclairée) vers l'arête, à l'est le liseré de la face, dans l'ombre
  east: [0, 0.05, 0.12, 0.22, 0.35, 0.5, null],
  // face à l'ouest : le liseré de la face, éclairé, à l'arête ; l'écorce descend vers l'est, dans l'ombre
  west: [0, null, 0.2, 0.4, 0.6, 0.76, 0.9],
};

/**
 * Quartier nord-sud, image 9 × `h` : bois de X = 1 à 6, le dessus vu de dessus (l'écorce en long, le liseré de la face
 * debout du côté dit, la fibre en long), puis le bout sud : la part de tarte de 6 × 6, claire, le cœur en bas du côté de
 * la face debout, l'arc d'écorce de l'autre côté. Le bout nord, plus haut d'une demi-longueur, s'arrondit du côté de
 * l'écorce.
 */
export function quarterNS(h: number, face: 'east' | 'west'): Canvas {
  const c = new Canvas(9, h);
  const yN = h - 9;
  const corner = face === 'east' ? 'br' : 'bl';
  // la part de tarte, pour savoir où l'arc coupe chaque colonne
  const probe = new Canvas(9, 6);
  for (let Y = 0; Y < 6; Y++) for (let X = 1; X <= 6; X++) probe.set(X, Y, 'Y');
  pie(probe, 1, 0, 6, 6, corner, (X, Y) => { probe.px[Y][X] = EMPTY; });
  // le bout nord, plus haut d'une demi-longueur : l'arc un peu moins marqué, sans pointe d'arête
  const top = (X: number) => { let r = 0; while (r < 6 && probe.get(X, r) === EMPTY) r++; return 1 + Math.max(0, r - 1); };
  for (let X = 1; X <= 6; X++) for (let Y = top(X); Y < yN + 6; Y++) {
    const s = NS_TOP[face][X];
    if (s === null) {
      const fiber = SPLIT_LANES[1].some(([a, n]) => mod(Y - a, TILE) < n);
      c.set(X, Y, face === 'east' ? (fiber ? 't' : 'T') : (fiber ? 't' : 'Y'));
    } else c.set(X, Y, barkS(BIG_RING, Y, s, 0));
  }
  pie(c, 1, yN, 6, 6, corner);
  shadedOutline(c);
  nsShadow(c, 3);
  return c;
}

/**
 * La part de tarte d'un quartier nord-sud au sol, en raccourci (la section vue par son bout, 9 × 4 : le bout de 4 × 9 de
 * l'est-ouest tourné) : le cœur dans le coin bas `corner` (contre la face debout et le sol), l'arc d'écorce en face. Rend le
 * masque de la part, dans la boîte (0 à w − 1, 0 à h − 1).
 */
function pieMask(w: number, h: number, corner: 'bl' | 'br') {
  return (i: number, j: number) => {
    if (i < 0 || i >= w || j < 0 || j >= h) return false;
    const u = corner === 'br' ? (w - (i + 0.5)) / w : (i + 0.5) / w;
    const v = (h - (j + 0.5)) / h;
    return u * u + v * v <= 1;
  };
}

/** Peint la part de tarte (`pieMask`) en (x0, y0) : l'arc en N, le bois de bout clair (Y), un cerne (t), le cœur (T). */
function pieBand(c: Canvas, x0: number, y0: number, w: number, h: number, corner: 'bl' | 'br') {
  const inside = pieMask(w, h, corner);
  const back = corner === 'br' ? -1 : 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!inside(i, j)) continue;
    const u = corner === 'br' ? (w - (i + 0.5)) / w : (i + 0.5) / w;
    const v = (h - (j + 0.5)) / h;
    const r = Math.hypot(u, v);
    const rim = !inside(i + back, j) || !inside(i, j - 1);
    c.set(x0 + i, y0 + j, rim ? 'N' : r < 0.3 ? 'T' : r >= 0.55 && r < 0.75 ? 't' : 'Y');
  }
}

/** Écorce du dessus d'un quartier nord-sud au sol, colonnes 1 à 9 (`null` : la face fendue debout, vue en raccourci). */
const NS_GROUND_TOP: Record<'east' | 'west', (number | null)[]> = {
  // face à l'est : l'écorce monte du sol, à l'ouest (éclairée), vers l'arête ; à l'est, la face debout, dans l'ombre
  east: [0, 0.03, 0.1, 0.18, 0.3, 0.42, 0.55, null, null, null],
  // face à l'ouest : la face debout, éclairée ; de l'arête, l'écorce descend vers l'est, dans l'ombre
  west: [0, null, null, null, 0.35, 0.5, 0.62, 0.74, 0.86, 0.96],
};

/**
 * Quartier nord-sud au sol (règle D : 11 × n px, le quartier est-ouest tourné), image 13 × h (h = n + 2) : bois de X = 1 à 9.
 * Le dessus vu de dessus : l'écorce en long (six colonnes, de l'arête au sol) et la face fendue debout du côté dit (trois
 * colonnes : sa hauteur en raccourci, fibres en long ; claire à l'ouest, dans l'ombre à l'est). Au sud, la part de tarte claire
 * (9 × 4), le cœur en bas du côté de la face debout, l'arc d'écorce de l'autre ; au nord, le bout lointain prend l'arc de la
 * même section (la silhouette s'y arrondit du côté de l'écorce). Contour, ombre au sud et à l'est.
 */
function quarterGroundNS(h: number, face: 'east' | 'west'): Canvas {
  const n = h - 2;
  const c = new Canvas(13, h);
  const corner = face === 'east' ? 'br' : 'bl';
  const PH = 4;
  const yS = n - 1 - PH;
  const inPie = pieMask(9, PH, corner);
  for (let X = 1; X <= 9; X++) for (let Y = 1; Y <= n - 2; Y++) {
    if (Y <= PH && !inPie(X - 1, Y - 1)) continue;
    const s = NS_GROUND_TOP[face][X];
    if (s !== null) { c.set(X, Y, barkS(BIG_RING, Y, s, 0)); continue; }
    // la face debout : trois colonnes, la plus proche de l'arête d'abord
    const i = face === 'east' ? X - 7 : 3 - X;
    const lane = (k: number) => SPLIT_LANES[k].some(([a, m]) => mod(Y - a, TILE) < m);
    const q = face === 'east'
      ? (i === 0 ? (lane(1) ? 'T' : 't') : i === 1 ? (lane(2) ? 'T' : 't') : 'T')
      : (i === 0 ? 'Y' : i === 1 ? (lane(1) ? 't' : 'Y') : (lane(3) ? 'T' : 't'));
    c.set(X, Y, q);
  }
  // bout nord : l'écorce qui s'enroule, un cran plus sombre sur son bord
  const edge: [number, number][] = [];
  for (let Y = 1; Y <= PH; Y++) for (let X = 1; X <= 9; X++) {
    if (c.get(X, Y) !== EMPTY && c.get(X, Y - 1) === EMPTY && NS_GROUND_TOP[face][X] !== null) edge.push([X, Y]);
  }
  for (const [X, Y] of edge) c.px[Y][X] = DARKER[c.px[Y][X]] ?? c.px[Y][X];
  pieBand(c, 1, yS, 9, PH, corner);
  shadedOutline(c);
  nsGroundShadow(c, 2);
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
function bigSplitDraw(look: 'round' | 'half', axis: LyingAxis, total: number): SplitDraw {
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
  // nord-sud (h = n + 2 rangées) : la fente court sur la crête (colonne 6), du bout nord à la face de coupe, puis descend la
  // bande du bout sud ; le coin est planté au milieu du bout, il sort vers le nord ou vers le sud
  const h = total;
  const n = h - 2;
  if (look === 'round') {
    const base = bigRoundNS(h, 0);
    const along: [number, number][] = [];
    for (let Y = 2; Y <= n - 7; Y++) along.push([6 + jog(Y), Y]);
    const face: [number, number][] = [];
    for (let Y = n - 6; Y <= n - 2; Y++) face.push([Y === n - 4 ? 7 : 6, Y]);
    return {
      base, along, face, lip: [1, 0],
      wedge: { start: { at: [6, 3], dir: [0, -1] }, end: { at: [6, n - 4], dir: [0, 1] } },
      notches: [[6 + jog(0), 0], [6 + jog(1), 1]],
    };
  }
  const base = halfNS(h);
  const y1 = halfMoonNS(h);
  const along: [number, number][] = [];
  for (let Y = 1; Y < y1; Y++) along.push([6 + jog(Y), Y]);
  const face: [number, number][] = [];
  for (let Y = y1; Y <= n - 2; Y++) face.push([Y === y1 + 2 ? 7 : 6, Y]);
  return {
    base, along, face, lip: [1, 0],
    wedge: { start: { at: [6, 3], dir: [0, -1] }, end: { at: [6, y1 - 1], dir: [0, 1] } },
    notches: [[6 + jog(0), 0], [6, n - 1]],
  };
}

/** Ce qui dépasse du coin de fendage, image par image (le jeu prend l'image min(2, ⌊3 × coups / coups totaux⌋)). */
const WEDGE_OUT = [3, 2, 1];

/** Les parties d'un aspect qui se fend : `wedge-…-start|end`, `crack-…-start|mid|end`, `open-…-start|mid|end`. */
function splitParts(look: 'round' | 'half', axis: LyingAxis, anims: Record<string, Grid[]>) {
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

// Nord-sud (règle D) : la même bande, en rangées (notch.ew.w rangées, la coupe à la rangée notch.ew.at), la pièce tournée :
// l'entaille est-ouest transposée (le haut éclairé devient l'ouest éclairé, le flanc ouest de l'entaille son flanc nord, tourné
// vers nous, en bois frais). Image 0 : sur le flanc ouest, la silhouette s'y creuse ; image 1 : la pièce a roulé d'un quart vers
// l'est, l'entaille est sur le dessus qu'on voit ; image 2 : sur le flanc est ; image 3 : à peine, à l'ouest.
const transposeBand = (g: Grid, w: number): Grid =>
  [...Array(g[0].length).keys()].map((x) => [...Array(w).keys()].map((y) => g[y]?.[x] ?? EMPTY).join(''));
const nsNotch = (ew: Record<1 | 2, Grid[]>, w: number): Record<1 | 2, Grid[]> =>
  ({ 1: ew[1].map((g) => transposeBand(g, w)), 2: ew[2].map((g) => transposeBand(g, w)) });

/** Les planches du gros bois. */
function bigSheet(axis: LyingAxis): SheetParts {
  const anims: Record<string, Grid[]> = {};
  for (const look of ['round', 'half'] as const) {
    const g = lookDef('big', look)[axis];
    const total = refTotal(g.start, g.end);
    const frames = [...Array(framesOf(look)).keys()].map((k) => {
      let c: Canvas;
      if (axis === 'ew') c = look === 'round' ? bigRoundEW(total - 1, k) : flatEW(total, 16, 5, 11, 2.5);
      else c = look === 'round' ? bigRoundNS(total, k) : halfNS(total);
      return cut3(c, axis, g.start, g.end, `${look}-${axis}-${k}`);
    });
    for (const part of PARTS) anims[`${look}-${part}`] = frames.map((p) => p[part]);
  }
  // le quartier : une partie par côté de sa face debout (nord et sud en est-ouest, est et ouest en nord-sud), mêmes cotes
  const q = lookDef('big', 'quarter')[axis];
  const qTotal = refTotal(q.start, q.end);
  for (const face of (axis === 'ew' ? ['north', 'south'] : ['east', 'west']) as QuarterFace[]) {
    const c = axis === 'ew' ? quarterEW(qTotal, face as 'north' | 'south') : quarterGroundNS(qTotal, face as 'east' | 'west');
    const parts = cut3(c, axis, q.start, q.end, `quarter-${face}-${axis}`);
    for (const part of PARTS) anims[`quarter-${face}-${part}`] = [parts[part]];
  }
  for (const d of [1, 2] as const) anims[`notch${d}`] = (axis === 'ew' ? BIG_EW_NOTCH : nsNotch(BIG_EW_NOTCH, lookDef('big', 'round').ns.w))[d];
  for (const look of ['round', 'half'] as const) splitParts(look, axis, anims);
  return { axis, frame: frameOf('big', axis), anims };
}

// =====================================================================================================================
// Bois normal (les dessins de l'ancien timber.ts)
// =====================================================================================================================

type NormalLook = 'round' | 'f1' | 'f2' | 'f3' | 'beam';
const NORMAL_LOOKS: NormalLook[] = ['round', 'f1', 'f2', 'f3', 'beam'];
const NEW = lookDef('normal', 'round').ew;
for (const l of NORMAL_LOOKS) {
  const g = lookDef('normal', l);
  if (JSON.stringify([g.ew.h, g.ew.start, g.ew.end])
    !== JSON.stringify([10, 5, 4])) throw new Error(`wood-pieces : géométrie du normal « ${l} » hors des dessins`);
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

// Nord-sud (règle D : 8 × n px, l'est-ouest tourné), image 10 × (n + 2) : corps de 6 colonnes (1 à 6), bouts en ovale de
// 6 × 4 (la section en raccourci, comme les bouts de 4 × 6 de l'est-ouest) : au nord le bout lointain, au sud la face de coupe.
// Une pièce tournée d'un quart de tour garde ses faces dressées : celle du sud en est-ouest (f1) est à l'ouest en nord-sud, la
// seconde (f2) à l'est, la troisième (f3) dessus, la poutre a aussi le dessous dressé. Faces dressées : bois clair à l'ouest
// (Y, fil t, trois colonnes : la face qui fait lire la pièce, comme celle du sud en est-ouest), dans l'ombre à l'est (T), le
// dessus clair au fil en long ; un côté dressé a son coin de section carré.
const N_SECTIONS: Record<NormalLook, Section> = {
  round: ROUND_SECTION,
  f1: { w: true, e: false, top: false, bottom: false },
  f2: { w: true, e: true, top: false, bottom: false },
  f3: { w: true, e: true, top: true, bottom: false },
  beam: { w: true, e: true, top: true, bottom: true },
};

/** Le dessus d'une pièce normale nord-sud, colonne X (1 à 6), rangée Y (le long de la pièce). */
function nNsTop(look: NormalLook, X: number, Y: number, k: number): string {
  const bark = (s: number) => barkS(NORMAL_RING, Y, s, 0);
  switch (look) {
    case 'round': return nBark(Y, X - 1, k);
    case 'f1': return X === 1 ? 'Y' : X === 2 ? grain(Y, 'c', 'Y') : X === 3 ? grain(Y, 'a', 't') : bark([0.5, 0.75, 0.95][X - 4]);
    case 'f2': return X === 1 ? 'Y' : X === 2 ? grain(Y, 'c', 'Y') : X === 3 ? grain(Y, 'a', 't') : X === 6 ? 'T' : bark([0.5, 0.8][X - 4]);
    default: return X === 1 ? 't' : X === 6 ? 'T' : X === 5 ? grain(Y, 'b', 't') : grain(Y, X === 3 ? 'c' : 'a', 'Y');
  }
}

function nNsFull(look: NormalLook, h: number, k: number): Canvas {
  const { c, front } = nsLog(8, h, 2, N_SECTIONS[look], (X, Y) => nNsTop(look, X, Y, k), false);
  if (look === 'round') {
    const cx = 4, rx = 3, ry = 2;
    const th = CRACK0 + (k * Math.PI) / 2;
    for (let t = 0.3; t <= 0.95; t += 0.05) {
      const X = Math.floor(cx + t * rx * Math.cos(th));
      const Y = Math.floor(front + t * ry * Math.sin(th));
      if (((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - front) / ry) ** 2 <= 0.7) c.set(X, Y, 'T');
    }
  }
  shadedOutline(c);
  nsGroundShadow(c, 2);
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
function normalSheet(axis: LyingAxis): SheetParts {
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
  for (const d of [1, 2] as const) anims[`notch${d}`] = (axis === 'ew' ? N_EW_NOTCH : nsNotch(N_EW_NOTCH, lookDef('normal', 'round').ns.w))[d];
  return { axis, frame: frameOf('normal', axis), anims };
}

// ---------- Debout (le poteau, `axis: 'up'`) ----------
// Règle D étendue : debout, une pièce garde la largeur de l'épaisseur de la même pièce couchée est-ouest, 8 colonnes contour
// compris pour les cinq aspects. C'est la couchée est-ouest redressée : sa colonne (contour du haut, dessus en rangées 1-2, flanc en
// 3-6, contour du bas : `nEwColumn`) devient la rangée du poteau, de gauche (côté lumière) à droite ; mêmes teintes, même écorce
// (anneau `NORMAL_RING`, sillons le long de la pièce, périodiques sur 24 px), même fil (`grain`). Rond : l'écorce sur 6 colonnes
// (M M m m N N) ; poutre et f3 : le dessus clair (Y, fil c) à gauche, le flanc (t, fil b) puis T à droite, contour N à gauche ;
// f1, f2 : la face dressée claire à gauche (comme le flanc dressé de la couchée), l'écorce à droite, et pour f2 la seconde face dans
// l'ombre (T) au bord droit. La tête (`start`, avec 3 rangées de corps) : le bois de bout vu de dessus, `up.extra` = 4 rangées contour
// compris (8 × 4 : la section en raccourci), Y clair en haut à gauche, un cerne t autour du cœur T, cerclé de N sur les côtés ronds
// (le contour du haut et de gauche, l'écorce à droite et devant) ; la rangée sous la tête un cran plus sombre (l'arête) ; coins
// carrés du côté des faces dressées. Le pied (`end`) : le contour du bas, carré si la face sud est dressée (f3, poutre), arrondi
// sinon. Pas d'ombre : le dé la porte. Les `lift` rangées sous le pied restent vides.

/** Le bois en travers d'une pièce debout, colonne `i` (0 à 5, 0 à gauche, côté lumière), rangée `Y` (le long de la pièce). */
function nUpColumn(look: NormalLook, i: number, Y: number): string {
  const bark = (v: number) => nBark(Y, v, 0);
  switch (look) {
    // la face dressée claire à gauche, l'écorce à droite (ses rangées d'ombre)
    case 'f1': return i === 0 ? 'Y' : i === 1 ? grain(Y, 'c', 'Y') : i === 2 ? grain(Y, 'a', 't') : i === 3 ? grain(Y, 'b', 't') : bark(i);
    case 'f2': return i === 0 ? 'Y' : i === 1 ? grain(Y, 'c', 'Y') : i === 2 ? grain(Y, 'a', 't') : i === 5 ? 'T' : bark(i);
    // rond, f3, poutre : la colonne de la couchée est-ouest, redressée
    default: return nEwColumn(look, Y, 0)[i + 1];
  }
}

/** La tête vue de dessus, rangées de bois (sous le contour du haut), colonnes de bois de gauche à droite (6 × 3). */
const N_UP_HEAD: Record<NormalLook, Grid> = {
  round: ['YYYYtN', 'YtTTtN', 'NtttNN'],
  f1: ['YYYYtN', 'YtTTtN', 'YtttNN'],
  f2: ['YYYYtt', 'YtTTtt', 'YtttNt'],
  f3: ['YYYYtt', 'YtTTtt', 'YtttTt'],
  beam: ['YYYYtt', 'YtTTtt', 'ttttTT'],
};
/** Coins carrés (faces dressées) : en haut à gauche, en haut à droite, en bas. */
const N_UP_SQUARE: Record<NormalLook, { tl: boolean; tr: boolean; bottom: boolean }> = {
  round: { tl: false, tr: false, bottom: false },
  f1: { tl: true, tr: false, bottom: false },
  f2: { tl: true, tr: true, bottom: false },
  f3: { tl: true, tr: true, bottom: true },
  beam: { tl: true, tr: true, bottom: true },
};

/** Pièce normale debout de `total` rangées (sa silhouette, sans les rangées vides du dé). */
function nUpFull(look: NormalLook, total: number): Canvas {
  const u = lookDef('normal', look).up!;
  const W = u.w;
  const c = new Canvas(W, total);
  const head = N_UP_HEAD[look];
  for (let Y = 1; Y <= total - 2; Y++) for (let X = 1; X <= W - 2; X++) {
    const r = Y - 1;
    if (r < head.length) { c.set(X, Y, head[r][X - 1]); continue; }
    let q = nUpColumn(look, X - 1, Y);
    // le bord avant de la tête, un cran plus sombre : l'écorce (l'anneau qui cercle le bois de bout), l'arête d'une face dressée
    if (r === head.length) q = DARKER[q] ?? HEWN_DARKER[q] ?? q;
    c.set(X, Y, q);
  }
  shadedOutline(c);
  const sq = N_UP_SQUARE[look];
  if (sq.tl) c.set(0, 0, 'N');
  if (sq.tr) c.set(W - 1, 0, 'o');
  if (sq.bottom) { c.set(0, total - 1, 'o'); c.set(W - 1, total - 1, 'o'); }
  return c;
}

function normalUpSheet(): SheetParts {
  const anims: Record<string, Grid[]> = {};
  for (const look of NORMAL_LOOKS) {
    const u = lookDef('normal', look).up;
    if (!u) throw new Error(`wood-pieces : le normal « ${look} » n'a pas de géométrie debout (up)`);
    if (u.w !== 8 || u.extra !== N_UP_HEAD[look].length + 1 || u.start !== u.extra + 3 || u.end !== 4) {
      throw new Error(`wood-pieces : géométrie debout du normal « ${look} » hors des dessins`);
    }
    const parts = cut3(nUpFull(look, refTotal(u.start, u.end)), 'up', u.start, u.end, `normal-${look}-up`);
    for (const part of PARTS) anims[`${look}-${part}`] = [parts[part]];
  }
  return { axis: 'up', frame: frameOf('normal', 'up'), anims };
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
  if (axis === 'up') {
    const ups = looks.flatMap((l) => (l!.up ? [l!.up] : []));
    return { w: Math.max(...ups.map((u) => u.w)), h: Math.max(TILE, ...ups.flatMap((u) => [u.start, u.end])) };
  }
  return { w: Math.max(...looks.map((l) => l!.ns.w)), h: Math.max(TILE, s.notch.ew.w, ...looks.flatMap((l) => [l!.ns.start, l!.ns.end])) };
}

/** Les planches par diamètre et par sens ; debout (`up`), seulement le normal (le gros ne se dresse pas). */
const SHEETS: Record<string, Partial<Record<WoodAxis, SheetParts>>> = {
  big: { ew: bigSheet('ew'), ns: bigSheet('ns') },
  normal: { ew: normalSheet('ew'), ns: normalSheet('ns'), up: normalUpSheet() },
};

/**
 * L'image d'une pièce, exactement comme le jeu l'assemble (`composeOps`) : une partie pose les pixels [0, size[ de son
 * image le long de la pièce à `at` (seulement ceux qui tombent dans `clip` s'il est donné), le travers entier ; `clear`
 * efface la bande. Le quartier prend les parties du côté de sa face debout (`face`, sinon sud en est-ouest, est en nord-sud).
 */
export function composeWood(piece: WoodPiece, opts: ComposeOpts = {}): Canvas {
  const { w, h } = woodSize(piece.size, lookOf(piece), piece.axis, piece.length);
  const c = new Canvas(w, h);
  const sheet = SHEETS[piece.size]?.[piece.axis];
  if (!sheet) throw new Error(`wood-pieces : pas de planche pour « ${piece.size} » (${piece.axis})`);
  const ew = piece.axis === 'ew';
  for (const op of composeOps(piece, opts)) {
    if (op.kind === 'clear') {
      for (let i = op.at; i < op.at + op.size; i++) {
        if (ew) for (let Y = 0; Y < h; Y++) c.set(i, Y, EMPTY);
        else for (let X = 0; X < w; X++) c.set(X, i, EMPTY);
      }
      continue;
    }
    const frames = sheet.anims[op.anim];
    if (!frames) throw new Error(`wood-pieces : partie « ${op.anim} » absente de la planche ${piece.size}-${piece.axis}`);
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
    name: `${sizeOf(size).sheet}${sp.axis === 'ew' ? '' : `-${sp.axis}`}`,
    frameW: sp.frame.w,
    frameH: sp.frame.h,
    // le fer du coin de fendage (2 3 0) vient de la palette des outils, qui reprend toute la palette `world`
    palette: size === 'big' ? toolPalette : world,
    animations,
  };
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });
const piece = (size: string, shape: WoodPiece['shape'], axis: WoodAxis, length = 100, face?: WoodPiece['face']): WoodPiece =>
  ({ size, shape, axis, length, ...(face ? { face } : {}) });

export default [
  sheetSource('big', SHEETS.big.ew!),
  sheetSource('big', SHEETS.big.ns!),
  sheetSource('normal', SHEETS.normal.ew!),
  sheetSource('normal', SHEETS.normal.ns!),
  sheetSource('normal', SHEETS.normal.up!),
  img('wood-normal-beam-300-up', composeWood({ size: 'normal', shape: 'round', axis: 'up', length: 300, hewn: WOOD.hew.faces * WOOD.hew.perFace })),
  img('wood-big-round-100', composeWood(piece('big', 'round', 'ew'))),
  img('wood-big-round-100-ns', composeWood(piece('big', 'round', 'ns'))),
  img('wood-normal-round-100', composeWood(piece('normal', 'round', 'ew'))),
  img('wood-normal-round-100-ns', composeWood(piece('normal', 'round', 'ns'))),
  img('wood-big-quarter-north-100', composeWood(piece('big', 'quarter', 'ew', 100, 'north'))),
  img('wood-big-quarter-south-100', composeWood(piece('big', 'quarter', 'ew', 100, 'south'))),
  img('wood-big-quarter-east-100-ns', composeWood(piece('big', 'quarter', 'ns', 100, 'east'))),
  img('wood-big-quarter-west-100-ns', composeWood(piece('big', 'quarter', 'ns', 100, 'west'))),
  img('wood-piece', composeWood(piece('big', 'round', 'ew'))),
  img('wood-piece-ns', composeWood(piece('big', 'round', 'ns'))),
];

