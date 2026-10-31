// La grange de ferme en bois (chantier « bâtiments ») : le bardage, la porte charretière, le pignon et le grand pan de toit.
// L'ossature (poteaux, sablières, entraits, poinçons, faîtage) est faite des pièces de bois du jeu (wood-pieces.ts) : rien ici.
//
// Gabarit (docs/STYLE.md, section 8), 5 cm par pixel, lumière nord-ouest, contour d'un pixel comme la porte de la cabane
// (cabin.ts) : la teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas et à droite. Quatre vues chacun :
// r0 la face du dehors au sud, r1 la face du dehors à l'ouest (de chant), r2 la face du dedans (on la voit du dedans, depuis le
// sud : le dessin du dehors retourné), r3 la face du dehors à l'est (de chant).
//
// Le bois : la planche fendue, comme la porte de la cabane, mais un peu plus vieille (rampe BOARD_WOOD : M m N, joints K) que le
// bois équarri frais des poteaux et des sablières (Y t T) : le bardage se lit comme un remplissage entre les poteaux, qui gardent
// leur jaune de bois neuf ; le toit, plus exposé encore, est le bois grisé (S A B Q).
//
// - Le pan de bardage (`board-wall`, 120 × 6 × 312 cm) : un module qui se pose côte à côte, deux par travée de 2,40 m. Quatre
//   planches debout de 30 cm (6 px), jointives ; sur chaque joint un couvre-joint de 2 px (son bord ouest d'un trait sombre, sa
//   face claire, son flanc est à l'ombre). Chaque module porte le couvre-joint de son bord ouest (le trait sombre de ce bord est
//   le contour) et pas celui de l'est : deux modules côte à côte font un seul mur, le couvre-joint de l'un recouvrant le joint
//   au bord de l'autre. Le bas des planches plus sombre (l'eau du sol). Face : 24 × 63 px, l'ombre portée dessous sur toute la
//   largeur (elle se raccorde d'un module à l'autre). Du dedans : les planches et deux lisses (à 1 m et à 2,20 m), chevillées
//   (une cheville par planche ; les couvre-joints du dehors sont chevillés à la même hauteur). De chant : 5 × 75 px (le dessus de
//   1,20 m en raccourci, 12 rangées ; la planche agrandie à 1 px de bois entre ses contours, le couvre-joint d'un côté, les
//   lisses de l'autre).
// - La porte charretière (`cart-door`, 240 × 6 × 312 cm) : deux battants de 1,20 m, chacun de quatre planches, deux traverses
//   et une écharpe du bas côté gond au haut côté fente (un A à eux deux), sur la face du dehors ; la fente au milieu ; de gros
//   gonds de bois (deux pixels) qui dépassent en haut et en bas aux bords extérieurs. Face : 48 × 63 px (61 rangées de porte,
//   les gonds dessus et dessous). Du dedans : les planches, les têtes des chevilles des traverses, la barre de fermeture en
//   travers dans ses deux paires de crochets. De chant : 5 × 87 px (le dessus de 2,40 m, 24 rangées).
// - Le pignon (`board-gable`, 520 × 6 × 220 cm, posé de 40 à 560 cm le long du mur de bout) : le même bardage, coupé en
//   pentagone (deux petits côtés verticaux de 30 cm, 6 px, aux bouts, puis les deux rampants jusqu'au sommet) ; il pose sur la
//   sablière, sans ombre portée. Face : 104 × 45 px. Du dedans : deux lisses. De chant : 5 × 97 px (le gabarit de sa boîte,
//   H + W/10 : le profil mince, le dessus de 5,20 m en raccourci).
// - Le grand pan de toit (`plank-roof-large`, 960 × 340 × 260 cm, pièce `ground` et `roof`) : le dessin du pan de la cabane
//   (art/lib/plank-roof.ts) à ses dimensions : r0 192 × 120, r2 192 × 17 de silhouette dans une image de 192 × 68, r1 et r3
//   68 × 244 (parallélogrammes). Sur ce long pan (4,30 m de pente), une rangée de chevilles de plus sur chaque panne, aux tiers.

import { Canvas, rng } from '../lib/canvas';
import { roofEW, roofNS, type RoofDims } from '../lib/plank-roof';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

// =====================================================================================================================
// Le bois du bardage
// =====================================================================================================================

/** Teintes de la planche, du plus clair au plus sombre : lumière, bois, ombre, joint ; `edge` le contour côté lumière. */
const BOARD_WOOD = { hi: 'M', mid: 'm', lo: 'N', joint: 'K', edge: 'K' };
const RAMP = [BOARD_WOOD.hi, BOARD_WOOD.mid, BOARD_WOOD.lo, BOARD_WOOD.joint];
/** Un cran plus sombre (le bas des planches mouillé). */
const darker = (k: string) => {
  const i = RAMP.indexOf(k);
  return i < 0 ? k : RAMP[Math.min(RAMP.length - 1, i + 1)];
};

/** Largeur d'une planche avec son couvre-joint : 30 cm, 6 px. */
const PITCH = 6;

/** Fil d'une planche : par colonne, des tirets [période, longueur, décalage] ; un nœud (rangée) ou non. */
interface Plank { grain: [number, number, number][]; knot?: number }

function planksOf(seed: number, count: number, rows: number): Plank[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({
    grain: Array.from({ length: PITCH }, () => [14 + Math.floor(r() * 10), 2 + Math.floor(r() * 3), Math.floor(r() * 24)] as [number, number, number]),
    knot: r() < 0.5 ? 6 + Math.floor(r() * Math.max(1, rows - 16)) : undefined,
  }));
}

/** Ce qu'on dessine d'un panneau de planches debout : sa forme, ses lisses, ses rangées mouillées. */
interface Panel {
  w: number;
  h: number;
  /** Le pixel (x, y) est-il dans le panneau ? */
  inside: (x: number, y: number) => boolean;
  /** Les lisses du dedans, rangées [haut, bas] (sur la face du dehors, leurs chevilles traversent les couvre-joints). */
  rails: [number, number][];
  /** Rangées du bas assombries (l'eau du sol), comptées depuis la dernière rangée de bois. */
  wet: number;
  seed: number;
}

/** Le contour d'un pixel : `edge` en haut et à gauche, OUTLINE en bas et à droite (comme la porte de la cabane). */
function outline(c: Canvas, inside: (x: number, y: number) => boolean, edge = BOARD_WOOD.edge) {
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

/**
 * Le bardage vu du dehors : colonne x, q = x mod 6 : q = 0 le bord ouest du couvre-joint (un trait sombre ; au bord du module,
 * le contour), q = 1 sa face au soleil, q = 2 son flanc est à l'ombre, q = 3 à 5 la planche, son fil et ses nœuds. Les têtes
 * de chevilles sur les couvre-joints, à la hauteur des lisses.
 */
function boardsOutside(p: Panel): Canvas {
  const c = new Canvas(p.w, p.h);
  const planks = planksOf(p.seed, Math.ceil(p.w / PITCH), p.h);
  for (let x = 0; x < p.w; x++) {
    const q = x % PITCH;
    const pl = planks[Math.floor(x / PITCH)];
    const bottom = lastRow(p, x);
    for (let y = 0; y < p.h; y++) {
      if (!p.inside(x, y)) continue;
      let k: string;
      if (q === 0) k = BOARD_WOOD.joint;
      else if (q === 1) k = BOARD_WOOD.hi;
      else if (q === 2) k = BOARD_WOOD.lo;
      else {
        k = BOARD_WOOD.mid;
        const [per, len, ph] = pl.grain[q];
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
function boardsInside(p: Panel): Canvas {
  const c = new Canvas(p.w, p.h);
  const planks = planksOf(p.seed + 1, Math.ceil(p.w / PITCH) + 1, p.h);
  // les joints vus du dedans : sous le milieu des couvre-joints du dehors (colonne 6k + 1), retournés
  const joint = (x: number) => (p.w - 1 - x) % PITCH === 1 && p.w - 1 - x > 1;
  const plankAt = (x: number) => Math.floor((p.w - 1 - x + PITCH - 2) / PITCH);
  for (let x = 0; x < p.w; x++) {
    const bottom = lastRow(p, x);
    const pl = planks[plankAt(x)];
    const q = (p.w - 1 - x + PITCH - 2) % PITCH; // 0 au bord est de la planche (à droite), 5 au bord ouest
    for (let y = 0; y < p.h; y++) {
      if (!p.inside(x, y)) continue;
      let k: string;
      if (joint(x)) k = BOARD_WOOD.joint;
      else if (joint(x - 1)) k = BOARD_WOOD.hi;
      else {
        k = BOARD_WOOD.mid;
        const [per, len, ph] = pl.grain[q];
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
    for (let x = 0; x < p.w; x++) if ((p.w - 1 - x + PITCH - 2) % PITCH === 2 && p.inside(x, a) && p.inside(x, b)) c.set(x, (a + b) >> 1, BOARD_WOOD.joint);
  }
  outline(c, p.inside);
  return c;
}

/** L'ombre portée d'un panneau posé au sol : une rangée sous lui, sur toute sa largeur (elle se raccorde au module voisin). */
function withShadow(c: Canvas): Canvas {
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
interface Edge { rows: number; depth: number; outer: [number, number]; inner: [number, number][]; pins?: boolean; shadow: boolean }

function edgeView(e: Edge, outsideWest: boolean): Canvas {
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

// =====================================================================================================================
// Pan de bardage
// =====================================================================================================================

const WALL_W = 24;
const WALL_H = 63;
/** Les lisses du dedans : à 2,20 m et à 1 m du sol (15 cm chacune). */
const WALL_RAILS: [number, number][] = [[17, 19], [41, 43]];
const wallPanel = (seed: number): Panel => ({
  w: WALL_W, h: WALL_H, inside: (x, y) => x >= 0 && x < WALL_W && y >= 0 && y < WALL_H, rails: WALL_RAILS, wet: 3, seed,
});
const WALL_EDGE: Edge = { rows: WALL_H + 12, depth: 12, outer: [0, WALL_H + 12 - 3], inner: WALL_RAILS.map(([a, b]) => [a, b + 12]), shadow: true };

// =====================================================================================================================
// Porte charretière
// =====================================================================================================================

const DOOR_W = 48;
/** Le haut des battants (rangée 1) et le bas (rangée 61) ; les gonds dépassent d'un pixel dessus et dessous. */
const DOOR_TOP = 1;
const DOOR_BOTTOM = 61;
/** Les traverses du dehors, 20 cm chacune. */
const DOOR_RAILS: [number, number][] = [[6, 9], [52, 55]];
/** La barre de fermeture du dedans, à 1,50 m du sol, et ses crochets (deux par battant). */
const BAR: [number, number] = [30, 33];
const HOOKS = [3, 14, 31, 42];

/** Le battant de gauche, colonnes 0 à 23 ; celui de droite en est le reflet (les joints et l'écharpe), la lumière restant à l'ouest. */
const LEAF = 24;
/** Joints du battant de gauche (du bord du gond, 0, à la fente, 23) : quatre planches. */
const LEAF_JOINTS = [6, 12, 18];

function cartDoorFace(inside: boolean): Canvas {
  const c = new Canvas(DOOR_W, DOOR_BOTTOM + 3);
  const inDoor = (x: number, y: number) => x >= 0 && x < DOOR_W && y >= DOOR_TOP && y <= DOOR_BOTTOM;
  const planks = planksOf(inside ? 91 : 83, 8, DOOR_BOTTOM);
  // la colonne dans son battant, comptée depuis le gond (0) vers la fente (23)
  const local = (x: number) => (x < LEAF ? x : DOOR_W - 1 - x);
  const plankOf = (x: number) => (x < LEAF ? 0 : 4) + LEAF_JOINTS.filter((j) => local(x) > j).length;
  for (let x = 0; x < DOOR_W; x++) {
    const l = local(x);
    const pl = planks[plankOf(x)];
    for (let y = DOOR_TOP; y <= DOOR_BOTTOM; y++) {
      let k: string;
      if (LEAF_JOINTS.includes(l)) k = BOARD_WOOD.joint;
      else if (c.get(x - 1, y) === BOARD_WOOD.joint || LEAF_JOINTS.includes(local(x - 1)) && x - 1 >= 0 && (x - 1 < LEAF) === (x < LEAF)) k = BOARD_WOOD.hi;
      else {
        k = BOARD_WOOD.mid;
        const [per, len, ph] = pl.grain[(l % PITCH)];
        if (l % 2 === 0 && (y + ph) % per < len) k = BOARD_WOOD.lo;
        if (pl.knot !== undefined && l % PITCH === 3 && (y === pl.knot || y === pl.knot + 1)) k = BOARD_WOOD.lo;
      }
      if (y > DOOR_BOTTOM - 1 - 3) k = darker(k);
      c.set(x, y, k);
    }
  }
  if (!inside) {
    // l'écharpe : du bas côté gond au haut côté fente, entre les traverses, 3 px de large, son ombre à l'est
    const y0 = DOOR_RAILS[0][1] + 1;
    const y1 = DOOR_RAILS[1][0] - 1;
    for (let y = y0; y <= y1; y++) {
      const t = (y1 - y) / (y1 - y0); // 0 en bas, 1 en haut
      const lx = Math.round(3 + (19 - 3) * t); // milieu de l'écharpe, colonne dans le battant de gauche
      for (const left of [true, false]) {
        const cx = left ? lx : DOOR_W - 1 - lx;
        c.set(cx - 1, y, BOARD_WOOD.hi).set(cx, y, BOARD_WOOD.mid).set(cx + 1, y, BOARD_WOOD.lo);
        if (c.get(cx + 2, y) !== BOARD_WOOD.hi || left) c.set(cx + 2, y, BOARD_WOOD.joint);
      }
    }
    // les traverses : le bord du haut au soleil, le bas à l'ombre, l'ombre portée dessous ; la fente les coupe
    for (const [a, b] of DOOR_RAILS) {
      for (let x = 0; x < DOOR_W; x++) {
        c.set(x, a, BOARD_WOOD.hi);
        for (let y = a + 1; y < b; y++) c.set(x, y, BOARD_WOOD.mid);
        c.set(x, b, BOARD_WOOD.lo);
        if (b + 1 <= DOOR_BOTTOM) c.set(x, b + 1, BOARD_WOOD.joint);
      }
      // les chevilles, une par planche
      for (let x = 0; x < DOOR_W; x++) if (local(x) % PITCH === 3) c.set(x, (a + b + 1) >> 1, BOARD_WOOD.joint);
    }
    // les chevilles de l'écharpe, à ses deux bouts
    for (const [lx, y] of [[4, y1 - 1], [18, y0 + 1]] as [number, number][]) c.set(lx, y, BOARD_WOOD.joint).set(DOOR_W - 1 - lx, y, BOARD_WOOD.joint);
  } else {
    // les têtes des chevilles des traverses (qui traversent les planches)
    for (const [a, b] of DOOR_RAILS) for (let x = 0; x < DOOR_W; x++) if (local(x) % PITCH === 3) c.set(x, (a + b + 1) >> 1, BOARD_WOOD.joint);
    // les crochets de la barre : un taquet de bois de 3 × 3 px au-dessus et au-dessous d'elle, deux par battant, au milieu
    // d'une planche ; le bord du haut et le flanc ouest au soleil, le flanc est et le dessous à l'ombre
    for (const hx of HOOKS) {
      for (const [y0, y1] of [[BAR[0] - 3, BAR[0] - 1], [BAR[1] + 1, BAR[1] + 3]]) {
        for (let y = y0; y <= y1; y++) c.set(hx, y, BOARD_WOOD.hi).set(hx + 1, y, BOARD_WOOD.mid).set(hx + 2, y, BOARD_WOOD.lo);
        c.set(hx, y0, BOARD_WOOD.hi).set(hx + 1, y0, BOARD_WOOD.hi).set(hx + 2, y0, BOARD_WOOD.mid);
        c.set(hx + 3, y0 + 1, BOARD_WOOD.joint).set(hx + 3, y1, BOARD_WOOD.joint); // l'ombre du taquet à l'est
        c.set(hx + 1, y0 + 1, BOARD_WOOD.joint); // sa cheville
      }
      for (let x = hx; x <= hx + 3; x++) c.set(x, BAR[1] + 4, BOARD_WOOD.joint);
    }
    // la barre, d'un bord à l'autre par-dessus la fente
    for (let x = 1; x < DOOR_W - 1; x++) {
      c.set(x, BAR[0], BOARD_WOOD.hi);
      for (let y = BAR[0] + 1; y < BAR[1]; y++) c.set(x, y, (x + 3) % 11 < 3 ? BOARD_WOOD.lo : BOARD_WOOD.mid);
      c.set(x, BAR[1], BOARD_WOOD.lo);
      // son ombre portée sur les planches, sauf sous les taquets
      if (!HOOKS.some((hx) => x >= hx && x <= hx + 2)) c.set(x, BAR[1] + 1, BOARD_WOOD.joint);
    }
  }
  // le contour : chaque battant le sien (la fente au milieu : le bord est du battant de gauche, le bord ouest de celui de droite)
  const leafOf = (x: number) => (x < LEAF ? 0 : 1);
  const out: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < DOOR_W; x++) {
    if (!inDoor(x, y)) continue;
    const same = (x2: number, y2: number) => inDoor(x2, y2) && leafOf(x2) === leafOf(x);
    if (!same(x + 1, y) || !same(x, y + 1)) out.push([x, y, 'o']);
    else if (!same(x - 1, y) || !same(x, y - 1)) out.push([x, y, BOARD_WOOD.edge]);
  }
  for (const [x, y, k] of out) {
    // la barre passe par-dessus la fente : elle garde son bois
    if (inside && y >= BAR[0] && y <= BAR[1] && x > 0 && x < DOOR_W - 1) continue;
    c.set(x, y, k);
  }
  if (inside) { c.set(0, BAR[0], BOARD_WOOD.edge); c.set(DOOR_W - 1, BAR[0], 'o'); }
  // les gonds : de gros pivots de bois (10 cm, 2 px) qui dépassent en haut et en bas, aux bords extérieurs
  for (const gx of [1, DOOR_W - 3]) {
    c.set(gx, DOOR_TOP - 1, BOARD_WOOD.edge).set(gx + 1, DOOR_TOP - 1, 'o');
    c.set(gx, DOOR_BOTTOM + 1, 'o').set(gx + 1, DOOR_BOTTOM + 1, 'o');
  }
  for (let x = 1; x < DOOR_W; x++) c.set(x, DOOR_BOTTOM + 2, 'x');
  return c;
}

const DOOR_EDGE: Edge = {
  rows: DOOR_BOTTOM + 2 + 24, depth: DOOR_TOP + 24, pins: true, shadow: true,
  outer: [DOOR_RAILS[0][0], DOOR_RAILS[1][1] + 24], inner: [[BAR[0] - 2, BAR[1] + 2 + 24]],
};

// =====================================================================================================================
// Pignon
// =====================================================================================================================

const GABLE_W = 104;
const GABLE_H = 45;
/** Hauteur du bout (30 cm : le rampant à 40 cm du bord de la grange) et du sommet (2,20 m), en rangées au-dessus de la base. */
const GABLE_END = 6;
const GABLE_PEAK = 44;
/** La première rangée du pignon à la colonne x : un pentagone, deux petits côtés verticaux, deux rampants jusqu'au sommet. */
const gableTop = (x: number) => {
  const h = Math.round(GABLE_END + (GABLE_PEAK - GABLE_END) * (1 - Math.abs(x + 0.5 - GABLE_W / 2) / (GABLE_W / 2)));
  return GABLE_H - 1 - h;
};
const GABLE_RAILS: [number, number][] = [[14, 16], [30, 32]];
const gablePanel = (seed: number): Panel => ({
  w: GABLE_W, h: GABLE_H, inside: (x, y) => x >= 0 && x < GABLE_W && y < GABLE_H && y >= gableTop(x), rails: GABLE_RAILS, wet: 0, seed,
});
/** De chant : le dessus de 5,20 m en raccourci (52 rangées) sur les 45 de la face. */
const GABLE_EDGE: Edge = { rows: GABLE_H + 52, depth: 52, outer: [1, GABLE_H + 52 - 2], inner: GABLE_RAILS.map(([a, b]) => [a + 20, b + 52]), shadow: false };

// =====================================================================================================================
// Grand pan de toit
// =====================================================================================================================

const LARGE_ROOF: RoofDims = { w: 960, d: 340, h: 260 };

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('board-wall', withShadow(boardsOutside(wallPanel(11)))),
  img('board-wall-r1', edgeView(WALL_EDGE, true)),
  img('board-wall-r2', withShadow(boardsInside(wallPanel(11)))),
  img('board-wall-r3', edgeView(WALL_EDGE, false)),
  img('cart-door', cartDoorFace(false)),
  img('cart-door-r1', edgeView(DOOR_EDGE, true)),
  img('cart-door-r2', cartDoorFace(true)),
  img('cart-door-r3', edgeView(DOOR_EDGE, false)),
  img('board-gable', boardsOutside(gablePanel(23))),
  img('board-gable-r1', edgeView(GABLE_EDGE, true)),
  img('board-gable-r2', boardsInside(gablePanel(23))),
  img('board-gable-r3', edgeView(GABLE_EDGE, false)),
  img('plank-roof-large', roofNS(LARGE_ROOF, 'south', 161)),
  img('plank-roof-large-r1', roofEW(LARGE_ROOF, 'west', 171)),
  img('plank-roof-large-r2', roofNS(LARGE_ROOF, 'north', 167)),
  img('plank-roof-large-r3', roofEW(LARGE_ROOF, 'east', 173)),
];
