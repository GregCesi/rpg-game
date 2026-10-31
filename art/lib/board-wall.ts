// Le bardage de planches debout, à toutes les tailles : le pan de bardage, le pignon et la porte charretière de la grange
// (art/world/barn.ts) et les parois de l'étal (art/world/stall.ts). Un même bois et un même dessin, paramétrés par le panneau :
// sa forme, ses lisses, la largeur de ses planches.
//
// Le bois : la planche fendue, dans la rampe du bois travaillé (BOARD_WOOD : ^ * %, creux &, joints @ ; art/palette.ts
// `woodAges`), la même que toutes les pièces de bois : son âge (neuf, patiné, vieux) se tire au build, il n'a plus de teinte à lui.
// Ce qui le distingue des poteaux et des portes : ses couvre-joints, ses joints, son fil en long, son bas mouillé. Vu du dehors, des planches debout de 30 cm
// (6 px) jointives ; sur chaque joint un couvre-joint de 2 px (son bord ouest d'un trait sombre, sa face claire, son flanc est
// à l'ombre). Chaque panneau porte le couvre-joint de son bord ouest (le trait sombre de ce bord est le contour) et pas celui
// de l'est. Vu du dedans (le dehors retourné) : les planches, leurs joints, les lisses chevillées. Contour d'un pixel : K en
// haut et à gauche, OUTLINE (o) en bas et à droite. De chant : `edgeView`.

import { Canvas, rng } from './canvas';

/**
 * Teintes de la planche, du plus clair au plus sombre : lumière, bois, ombre, creux (le bas mouillé, l'ombre d'une lisse), joint ;
 * `edge` le contour côté lumière (K, comme tout le bois).
 */
export const BOARD_WOOD = { hi: '^', mid: '*', lo: '%', deep: '&', joint: '@', edge: 'K' };
const RAMP = [BOARD_WOOD.hi, BOARD_WOOD.mid, BOARD_WOOD.lo, BOARD_WOOD.deep, BOARD_WOOD.joint];
/** Un cran plus sombre (le bas des planches mouillé). */
export const darker = (k: string) => {
  const i = RAMP.indexOf(k);
  return i < 0 ? k : RAMP[Math.min(RAMP.length - 1, i + 1)];
};

/** Largeur d'une planche avec son couvre-joint : 30 cm, 6 px. */
export const PITCH = 6;

/** Fil d'une planche : par colonne, des tirets [période, longueur, décalage] ; un nœud (rangée) ou non. */
export interface Plank { grain: [number, number, number][]; knot?: number }

export function planksOf(seed: number, count: number, rows: number): Plank[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({
    grain: Array.from({ length: PITCH }, () => [14 + Math.floor(r() * 10), 2 + Math.floor(r() * 3), Math.floor(r() * 24)] as [number, number, number]),
    knot: r() < 0.5 ? 6 + Math.floor(r() * Math.max(1, rows - 16)) : undefined,
  }));
}

/** Ce qu'on dessine d'un panneau de planches debout : sa forme, ses lisses, ses rangées mouillées. */
export interface Panel {
  w: number;
  h: number;
  /** Le pixel (x, y) est-il dans le panneau ? */
  inside: (x: number, y: number) => boolean;
  /** Les lisses du dedans, rangées [haut, bas] (sur la face du dehors, leurs chevilles traversent les couvre-joints). */
  rails: [number, number][];
  /** Rangées du bas assombries (l'eau du sol), comptées depuis la dernière rangée de bois. */
  wet: number;
  seed: number;
  /**
   * Largeur de chaque planche vue du dehors, couvre-joint compris, d'ouest en est (5 à 8 px). Par défaut, toutes de PITCH :
   * un panneau dont la largeur n'est pas un multiple de 6 px (l'étal : 32 px) prend quelques planches de 25 ou 35 cm.
   */
  widths?: number[];
}

/** Le contour d'un pixel : `edge` en haut et à gauche, OUTLINE en bas et à droite (comme la porte de la cabane). */
export function outline(c: Canvas, inside: (x: number, y: number) => boolean, edge = BOARD_WOOD.edge) {
  const out: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x + 1, y) || !inside(x, y + 1)) out.push([x, y, 'o']);
    else if (!inside(x - 1, y) || !inside(x, y - 1)) out.push([x, y, edge]);
  }
  for (const [x, y, k] of out) c.set(x, y, k);
}

/** La dernière rangée de bois de la colonne x (au-dessus du contour du bas). */
function lastRow(p: Panel, x: number): number {
  let y = p.h - 1;
  while (y > 0 && !p.inside(x, y)) y--;
  return y - 1;
}

/** Début (colonne du couvre-joint) de chaque planche vue du dehors, et la planche d'avant la première (pour le dedans). */
function starts(p: Panel): number[] {
  const ws = p.widths ?? Array.from({ length: Math.ceil(p.w / PITCH) + 1 }, () => PITCH);
  const s: number[] = [];
  let x = 0;
  for (const w of ws) { s.push(x); x += w; }
  s.push(x);
  return s;
}

/** La colonne `o` du dehors : sa planche `i` et sa place `q` dans la planche (0 : le bord ouest du couvre-joint). */
function seg(s: number[], o: number): { i: number; q: number } {
  let i = 0;
  while (i + 1 < s.length && s[i + 1] <= o) i++;
  return { i, q: o - s[i] };
}

/** Le fil d'une colonne de planche : les planches de plus de 6 px reprennent les tirets des premières colonnes. */
const grainAt = (pl: Plank, q: number) => pl.grain[q % PITCH];

/**
 * Le bardage vu du dehors : colonne x, q sa place dans la planche : q = 0 le bord ouest du couvre-joint (un trait sombre ; au
 * bord du module, le contour), q = 1 sa face au soleil, q = 2 son flanc est à l'ombre, q ≥ 3 la planche, son fil et ses
 * nœuds. Les têtes de chevilles sur les couvre-joints, à la hauteur des lisses.
 */
export function boardsOutside(p: Panel): Canvas {
  const c = new Canvas(p.w, p.h);
  const s = starts(p);
  const planks = planksOf(p.seed, p.widths ? p.widths.length : Math.ceil(p.w / PITCH), p.h);
  for (let x = 0; x < p.w; x++) {
    const { i, q } = seg(s, x);
    const pl = planks[i];
    const bottom = lastRow(p, x);
    for (let y = 0; y < p.h; y++) {
      if (!p.inside(x, y)) continue;
      let k: string;
      if (q === 0) k = BOARD_WOOD.joint;
      else if (q === 1) k = BOARD_WOOD.hi;
      else if (q === 2) k = BOARD_WOOD.lo;
      else {
        k = BOARD_WOOD.mid;
        const [per, len, ph] = grainAt(pl, q);
        if (q !== 3 && (y + ph) % per < len) k = BOARD_WOOD.lo;
        if (pl.knot !== undefined && (q === 4) && (y === pl.knot || y === pl.knot + 1)) k = BOARD_WOOD.lo;
        if (pl.knot !== undefined && q === 5 && y === pl.knot) k = BOARD_WOOD.lo;
      }
      if (q === 1 && p.rails.some(([a, b]) => y === ((a + b) >> 1))) k = BOARD_WOOD.joint;
      if (y > bottom - p.wet) k = darker(k);
      c.set(x, y, k);
    }
  }
  outline(c, p.inside);
  return c;
}

/**
 * Le bardage vu du dedans (le dehors retourné) : les planches jointives (joint d'un pixel sous chaque couvre-joint du dehors),
 * leur bord ouest à l'écran au soleil, le fil ; les lisses en travers (bord du haut clair, bas à l'ombre, l'ombre portée sur
 * les planches dessous), une cheville par planche au milieu de chaque lisse.
 */
export function boardsInside(p: Panel): Canvas {
  const c = new Canvas(p.w, p.h);
  const s = starts(p);
  const planks = planksOf(p.seed + 1, (p.widths ? p.widths.length : Math.ceil(p.w / PITCH)) + 1, p.h);
  // les joints vus du dedans : sous le milieu des couvre-joints du dehors (colonne q = 1), retournés
  const joint = (x: number) => { const o = p.w - 1 - x; return o > 1 && seg(s, o).q === 1; };
  // la planche du dedans d'une colonne et sa place (0 au bord est de la planche, à droite) : elle court du milieu d'un
  // couvre-joint du dehors au suivant
  const place = (x: number) => {
    const o = p.w - 1 - x;
    const { i, q } = seg(s, o);
    const k = q < 2 ? i - 1 : i;
    const start = k < 0 ? -PITCH : s[k];
    return { plank: k + 1, q: o - (start + 2) };
  };
  for (let x = 0; x < p.w; x++) {
    const bottom = lastRow(p, x);
    const { plank, q } = place(x);
    const pl = planks[plank];
    for (let y = 0; y < p.h; y++) {
      if (!p.inside(x, y)) continue;
      let k: string;
      if (joint(x)) k = BOARD_WOOD.joint;
      else if (joint(x - 1)) k = BOARD_WOOD.hi;
      else {
        k = BOARD_WOOD.mid;
        const [per, len, ph] = grainAt(pl, q);
        if (q % 2 === 1 && (y + ph) % per < len) k = BOARD_WOOD.lo;
        if (pl.knot !== undefined && q === 2 && (y === pl.knot || y === pl.knot + 1)) k = BOARD_WOOD.lo;
      }
      if (y > bottom - p.wet) k = darker(k);
      c.set(x, y, k);
    }
  }
  // les lisses : sur toute la largeur du panneau
  for (const [a, b] of p.rails) {
    for (let x = 0; x < p.w; x++) {
      if (!p.inside(x, a) || !p.inside(x, b)) continue;
      c.set(x, a, BOARD_WOOD.hi);
      for (let y = a + 1; y < b; y++) c.set(x, y, BOARD_WOOD.mid);
      c.set(x, b, BOARD_WOOD.lo);
      if (p.inside(x, b + 1) && !joint(x)) c.set(x, b + 1, BOARD_WOOD.lo);
    }
    // une cheville par planche, au milieu de la lisse
    for (let x = 0; x < p.w; x++) if (place(x).q === 2 && p.inside(x, a) && p.inside(x, b)) c.set(x, (a + b) >> 1, BOARD_WOOD.joint);
  }
  outline(c, p.inside);
  return c;
}

/** L'ombre portée d'un panneau posé au sol : une rangée sous lui, sur toute sa largeur (elle se raccorde au module voisin). */
export function withShadow(c: Canvas): Canvas {
  const s = new Canvas(c.w, c.h + 1).stamp(c.toGrid(), 0, 0);
  for (let x = 0; x < c.w; x++) s.set(x, c.h, 'x');
  return s;
}

// =====================================================================================================================
// Vues de chant
// =====================================================================================================================

/**
 * Un panneau de chant (r1 : la face du dehors à l'ouest ; r3 : à l'est). Rangées 0 à `depth` − 1 : le dessus, sa profondeur
 * en raccourci (le bout des planches au soleil, une planche toutes les 3 rangées) ; puis le chant jusqu'au sol. La planche :
 * contour, bois (1 px, agrandi au plancher de lisibilité), contour ; côté dehors une colonne de plus (couvre-joints, ou
 * traverses et écharpe de la porte, sur `outer`), côté dedans une colonne de plus (lisses, barre) sur les rangées de `inner`.
 * `pins` : les gonds, une rangée au-dessus du haut et au-dessous du bas de la planche. Image : 5 colonnes de silhouette, et
 * l'ombre portée dessous (décalée d'un pixel vers l'est) si `shadow`.
 */
export interface Edge { rows: number; depth: number; outer: [number, number]; inner: [number, number][]; pins?: boolean; shadow: boolean }

export function edgeView(e: Edge, outsideWest: boolean): Canvas {
  const H = e.rows;
  const c = new Canvas(6, H + (e.shadow ? 1 : 0));
  const wood = (y: number) => (y < e.depth ? (y % 3 === 0 ? BOARD_WOOD.hi : BOARD_WOOD.mid) : (y + 4) % 13 < 3 ? BOARD_WOOD.lo : BOARD_WOOD.mid);
  const top = e.pins ? 1 : 0;
  const bottom = e.pins ? H - 2 : H - 1;
  const inInner = (y: number) => e.inner.some(([a, b]) => y >= a && y <= b);
  const inOuter = (y: number) => y >= e.outer[0] && y <= e.outer[1];
  // colonnes : dehors, contour lumière/ombre de la planche, bois, contour, dedans
  const [outCol, inCol] = outsideWest ? [0, 4] : [4, 0];
  const plank = 1; // la planche, colonnes 1 à 3
  const has = (x: number, y: number) => {
    if (x >= plank && x <= plank + 2) return y >= top && y <= bottom;
    if (x === outCol) return inOuter(y);
    if (x === inCol) return inInner(y);
    return false;
  };
  for (let y = 0; y < H; y++) {
    if (!has(2, y)) continue;
    c.set(2, y, wood(y));
    // la colonne lumière (ouest) et ombre (est) de la planche, en bois là où le dehors ou le dedans la recouvre
    c.set(1, y, BOARD_WOOD.mid).set(3, y, BOARD_WOOD.lo);
    if (inOuter(y)) c.set(outCol, y, outsideWest ? BOARD_WOOD.hi : BOARD_WOOD.lo);
    if (inInner(y)) c.set(inCol, y, outsideWest ? BOARD_WOOD.lo : BOARD_WOOD.hi);
  }
  outline(c, has);
  // les gonds : un bout de bois rond au-dessus et au-dessous de la planche
  if (e.pins) c.set(2, 0, BOARD_WOOD.edge).set(2, H - 1, 'o');
  if (e.shadow) for (let x = 1; x < 6; x++) if (has(x - 1, H - 1) || has(x - 1, H - 2) || x === 5) c.set(x, H, 'x');
  return c;
}
