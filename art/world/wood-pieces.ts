// La pièce de bois : un seul objet du monde (`wood-piece`), décrit par ses réglages (diamètre, longueur, forme, faces
// dressées, sens, encoche, coin planté, pointe du quartier), dont l'image s'assemble à sa longueur à partir de parties tirées une
// fois par diamètre et par aspect. Contrat : src/world/woodShape.ts (tailles, placements, `composeOps`) et la géométrie de
// src/content/wood.json. Le jeu assemble à la volée avec les mêmes opérations que `composeWood` ci-dessous.
//
// Les vues couchées ne sont plus dessinées à la main : chaque aspect a sa section dans wood.json (`section` : forme, écorce, cœur,
// face sur laquelle il repose, faces dressées), et art/world/wood-section.ts en calcule chaque vue, est-ouest et nord-sud, à la
// taille de la règle D, avec les matières de art/world/wood-skin.ts (le pixel-artist règle couleurs et textures, pas les formes).
// Ici, on tire de ces vues calculées une pièce de référence par aspect (bout de départ, deux milieux, bout d'arrivée), et on la
// découpe en parties ; un garde-fou vérifie que les deux milieux sont identiques (le milieu se répète sans couture).
//
// Sept planches, une par diamètre et par sens : `wood-big`, `wood-big-ns`, `wood-normal`, `wood-normal-ns`, `wood-pole`,
// `wood-pole-ns`, et debout (le poteau, le normal seulement) `wood-normal-up` (rond, f1, f2, f3, poutre : `<aspect>-start|mid|end`,
// une image chacune, `normalUpSheet`, encore dessiné à la main). Chaque partie est calée en haut à gauche d'un cadre commun.
// Animations :
// - `<aspect>-start`, `<aspect>-mid`, `<aspect>-end` (gros : round, half, quarter, plank ; normal : round, f1, f2, f3, beam ;
//   perche : round) ; le rond a 4 images (le roulement, un tour : l'anneau d'écorce tourne d'un quart, la fente du bout aussi), les
//   autres une ; le quartier a aussi `quarter-down-…`, pointe en bas (un sur deux dans une rangée de tas) ;
// - `notch1`, `notch2` : la bande d'encoche de la coupe à la cognée (un tiers, deux tiers), 4 images comme le rond ;
// - gros seulement, pour le rond et la demi-bille (les aspects qui se fendent) : `wedge-<aspect>-start|end` (le bout où le coin est
//   planté, 3 images : le coin sort de 3, 2 puis 1 px), `crack-<aspect>-start|mid|end` (la fente seule, transparente ailleurs),
//   `open-<aspect>-start|mid|end` (le bois grand ouvert du dernier coup de masse). La fente suit le plan de fente de la section :
//   vertical, par le cœur (le travers a = 0), sur le dessus et sur la face de coupe ; le coin est planté sur ce plan.
//
// Images tirées d'ici par `composeWood` : les pièces de 1 m des tas (`wood-big-round-100`, `-ns`, `wood-normal-round-100`, `-ns`),
// l'image de l'objet dans Tiled (`wood-piece`, la bille du gros, 1 m, est-ouest ; `wood-piece-ns`) et le quartier de 1 m pointe en
// l'air et pointe en bas (`wood-big-quarter-100`, `-down-100`, et leurs `-ns`).

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { toolPalette } from '../items/tools';
import { shadedOutline } from './big-tree';
import { DARKER } from './wood';
import { barkV, grain, NORMAL_RING, TILE, WOOD_DARKER } from './wood-skin';
import { lyingView, type LyingView } from './wood-section';
import { CM_PER_PX, RACCOURCI } from '../../src/content/gabarit';
import {
  WOOD, composeOps, framesOf, lookDef, lookOf, sizeOf, woodSize, type ComposeOpts, type WoodAxis,
} from '../../src/world/woodShape';
import type { WoodLook, WoodPiece } from '../../src/content/types';

const mod = (a: number, n: number) => ((a % n) + n) % n;
for (const s of Object.values(WOOD.sizes)) if (s.tile !== TILE) throw new Error('wood-pieces : écorce et fibres périodiques sur 24 px (tile)');

type Part = 'start' | 'mid' | 'end';
/** Les sens couchés (le debout, `up`, a sa planche à part : `normalUpSheet`). */
type LyingAxis = Exclude<WoodAxis, 'up'>;
const PARTS: Part[] = ['start', 'mid', 'end'];

/** La vue calculée d'un aspect, sur une pièce de `total` px le long de l'axe (est-ouest : n + 1 colonnes ; nord-sud : n + 2 rangées). */
const lying = (size: string, look: WoodLook, axis: LyingAxis, total: number, k = 0, point?: WoodPiece['point']): LyingView =>
  lyingView(size, look, axis, total, k, point);

/** La pièce couchée, calculée (vue portée en long, aperçus). `total` : n + 1 colonnes est-ouest, n + 2 rangées nord-sud. */
export const lyingCanvas = (size: string, look: WoodLook, axis: LyingAxis, total: number, k = 0, point?: WoodPiece['point']): Canvas =>
  lying(size, look, axis, total, k, point).c;

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
 * Tracés du fendage du gros bois, sur une pièce de référence de longueur `total`, pour le rond et la demi-bille, est-ouest et
 * nord-sud. Tout se tire de la section : la fente suit le plan de fente (vertical, par le cœur : a = 0), sur le dessus de la pièce
 * puis sur sa face de coupe ; le coin est planté sur ce plan, au bout de départ (ouest, nord) ou d'arrivée (est, sud).
 */
function bigSplitDraw(look: 'round' | 'half', axis: LyingAxis, total: number): SplitDraw {
  const v = lying('big', look, axis, total);
  const base = v.c;
  const g = v.geom;
  const ztop = g.zmax;
  const pix = (a: number, z: number, along: number): [number, number] => {
    const [x, y] = v.project(a, z, along);
    return [Math.floor(x), Math.floor(y)];
  };
  // la face de coupe : le plan de fente, du dessus au sol, au bout `along`
  const facePts = (along: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let z = ztop; z >= 0; z -= 0.5) {
      const [X, Y] = pix(0, z, along);
      if (v.roles[Y]?.[X] === 'e' && !out.some(([x, y]) => x === X && y === Y)) out.push([X, Y]);
    }
    return out;
  };
  if (axis === 'ew') {
    const n = total - 1;
    const Yc = pix(0, ztop, 0)[1];
    const along: [number, number][] = [];
    for (let X = 0; X <= n; X++) {
      const Y = Yc + jog(X);
      if (v.roles[Y]?.[X] && v.roles[Y][X] !== EMPTY && v.roles[Y][X] !== 'e') along.push([X, Y]);
    }
    const face = facePts(0);
    // le coin : sur le plan de fente, assez loin du bord pour que sa tête tienne dans l'image (3 px)
    const zw = Math.min(ztop, Math.max(ztop / 2, (2 * CM_PER_PX) / RACCOURCI));
    const [sx, sy] = pix(0, zw, 0);
    const [ex, ey] = pix(0, zw, v.lin);
    const xs = along.map(([X]) => X);
    return {
      base, along, face, lip: look === 'round' ? [0, -1] : [0, 1],
      wedge: { start: { at: [Math.max(3, sx), sy], dir: [-1, 0] }, end: { at: [Math.min(n - 3, ex), ey], dir: [1, 0] } },
      notches: [[Math.min(...xs) - 1, Yc + jog(Math.min(...xs))], [Math.max(...xs) + 1, Yc + jog(Math.max(...xs))]],
    };
  }
  // nord-sud : la fente court sur la crête, du bout nord à la face de coupe sud, puis descend la face
  const h = total;
  const n = h - 2;
  const Xc = pix(0, ztop, 0)[0];
  const along: [number, number][] = [];
  for (let Y = 0; Y < h; Y++) {
    const X = Xc + jog(Y);
    if (v.roles[Y]?.[X] && v.roles[Y][X] !== EMPTY && v.roles[Y][X] !== 'e') along.push([X, Y]);
  }
  const face = facePts(v.lin);
  const [, ey] = pix(0, ztop / 2, v.lin);
  const ys = along.map(([, Y]) => Y);
  return {
    base, along, face, lip: [1, 0],
    wedge: { start: { at: [Xc, Math.max(3, Math.min(...ys) + 2)], dir: [0, -1] }, end: { at: [Xc, Math.min(n - 2, ey)], dir: [0, 1] } },
    notches: [[Xc + jog(0), Math.min(...ys) - 1], [Xc + jog(1), Math.min(...ys)]],
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

/** Les planches du gros bois : chaque aspect calculé depuis sa section ; le quartier pointe en l'air et pointe en bas. */
function bigSheet(axis: LyingAxis): SheetParts {
  const anims: Record<string, Grid[]> = {};
  for (const look of ['round', 'half', 'quarter', 'plank'] as const) {
    const g = lookDef('big', look)[axis];
    const total = refTotal(g.start, g.end);
    for (const point of look === 'quarter' ? [undefined, 'down' as const] : [undefined]) {
      const frames = [...Array(framesOf(look)).keys()].map((k) => cut3(lying('big', look, axis, total, k, point).c, axis, g.start, g.end, `${look}-${axis}-${k}`));
      for (const part of PARTS) anims[`${look}${point ? `-${point}` : ''}-${part}`] = frames.map((p) => p[part]);
    }
  }
  for (const d of [1, 2] as const) anims[`notch${d}`] = (axis === 'ew' ? BIG_EW_NOTCH : nsNotch(BIG_EW_NOTCH, lookDef('big', 'round').ns.w))[d];
  for (const look of ['round', 'half'] as const) splitParts(look, axis, anims);
  return { axis, frame: frameOf('big', axis), anims };
}


// =====================================================================================================================
// Bois normal
// =====================================================================================================================

type NormalLook = 'round' | 'f1' | 'f2' | 'f3' | 'beam';
const NORMAL_LOOKS: NormalLook[] = ['round', 'f1', 'f2', 'f3', 'beam'];
const ND = 6;
const HEWN_DARKER = WOOD_DARKER;
const nBark = (along: number, v: number, k: number, plain = false) => barkV(NORMAL_RING, along, v, k, plain);

/** La colonne d'une pièce normale est-ouest d'avant le calcul (contour, dessus, flanc, contour) : sert encore au poteau debout. */

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
    const frames = [...Array(framesOf(look)).keys()].map((k) => cut3(lying('normal', look, axis, total, k).c, axis, g.start, g.end, `normal-${look}-${axis}-${k}`));
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
// La perche (`pole`) : la vue se calcule comme les autres ; restent ses encoches
// =====================================================================================================================


// La coupe à la cognée : bande de 3 colonnes (notch.ew.w), la coupe à la colonne 2 (notch.ew.at), la saignée (K) en colonne 1, le
// flanc ouest de l'entaille en bois frais (Y t). Mêmes images que le gros et le normal : dessus, face sud, dessous, nord.
const POLE_EW_NOTCH: Record<1 | 2, Grid[]> = {
  1: [
    ['K.K', 'YKS', 'AAA', 'BBB', 'ooo', 'xxx'],
    ['KKK', 'SSS', 'YKA', 'BBB', 'ooo', 'xxx'],
    ['KKK', 'SSS', 'AAA', 'BKB', 'ooo', 'xxx'],
    ['K.K', 'SKS', 'AAA', 'BBB', 'ooo', 'xxx'],
  ],
  2: [
    ['...', 'K.K', 'YKA', 'BBB', 'ooo', 'xxx'],
    ['KKK', 'YKS', 'tKA', 'BKB', 'ooo', 'xxx'],
    ['KKK', 'SSS', 'AKA', 'KKK', 'o.o', 'xxx'],
    ['K.K', 'SKS', 'AKA', 'BBB', 'ooo', 'xxx'],
  ],
};

function poleSheet(axis: LyingAxis): SheetParts {
  const anims: Record<string, Grid[]> = {};
  const g = lookDef('pole', 'round')[axis];
  const total = refTotal(g.start, g.end);
  const frames = [...Array(framesOf('round')).keys()].map((k) => cut3(lying('pole', 'round', axis, total, k).c, axis, g.start, g.end, `pole-round-${axis}-${k}`));
  for (const part of PARTS) anims[`round-${part}`] = frames.map((p) => p[part]);
  for (const d of [1, 2] as const) anims[`notch${d}`] = (axis === 'ew' ? POLE_EW_NOTCH : nsNotch(POLE_EW_NOTCH, lookDef('pole', 'round').ns.w))[d];
  return { axis, frame: frameOf('pole', axis), anims };
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
  pole: { ew: poleSheet('ew'), ns: poleSheet('ns') },
};

/**
 * L'image d'une pièce, exactement comme le jeu l'assemble (`composeOps`) : une partie pose les pixels [0, size[ de son
 * image le long de la pièce à `at` (seulement ceux qui tombent dans `clip` s'il est donné), le travers entier ; `clear`
 * efface la bande. Le quartier prend les parties de sa pointe (`quarter-…`, ou `quarter-down-…` pointe en bas).
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
const piece = (size: string, shape: WoodPiece['shape'], axis: WoodAxis, length = 100, point?: WoodPiece['point']): WoodPiece =>
  ({ size, shape, axis, length, ...(point ? { point } : {}) });

export default [
  sheetSource('big', SHEETS.big.ew!),
  sheetSource('big', SHEETS.big.ns!),
  sheetSource('normal', SHEETS.normal.ew!),
  sheetSource('normal', SHEETS.normal.ns!),
  sheetSource('normal', SHEETS.normal.up!),
  sheetSource('pole', SHEETS.pole.ew!),
  sheetSource('pole', SHEETS.pole.ns!),
  img('wood-normal-beam-300-up', composeWood({ size: 'normal', shape: 'round', axis: 'up', length: 300, hewn: WOOD.hew.faces * WOOD.hew.perFace })),
  img('wood-big-round-100', composeWood(piece('big', 'round', 'ew'))),
  img('wood-big-round-100-ns', composeWood(piece('big', 'round', 'ns'))),
  img('wood-normal-round-100', composeWood(piece('normal', 'round', 'ew'))),
  img('wood-normal-round-100-ns', composeWood(piece('normal', 'round', 'ns'))),
  img('wood-pole-round-100', composeWood(piece('pole', 'round', 'ew'))),
  img('wood-pole-round-100-ns', composeWood(piece('pole', 'round', 'ns'))),
  img('wood-big-plank-100', composeWood(piece('big', 'plank', 'ew'))),
  img('wood-big-plank-100-ns', composeWood(piece('big', 'plank', 'ns'))),
  img('wood-big-quarter-100', composeWood(piece('big', 'quarter', 'ew'))),
  img('wood-big-quarter-down-100', composeWood(piece('big', 'quarter', 'ew', 100, 'down'))),
  img('wood-big-quarter-100-ns', composeWood(piece('big', 'quarter', 'ns'))),
  img('wood-big-quarter-down-100-ns', composeWood(piece('big', 'quarter', 'ns', 100, 'down'))),
  img('wood-piece', composeWood(piece('big', 'round', 'ew'))),
  img('wood-piece-ns', composeWood(piece('big', 'round', 'ns'))),
];
