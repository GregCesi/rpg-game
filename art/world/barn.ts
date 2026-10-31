// La grange de ferme en bois (chantier « bâtiments ») : le bardage, la porte charretière, le pignon et le grand pan de toit.
// L'ossature (poteaux, sablières, entraits, poinçons, faîtage) est faite des pièces de bois du jeu (wood-pieces.ts) : rien ici.
//
// Gabarit (docs/STYLE.md, section 8), 5 cm par pixel, lumière nord-ouest, contour d'un pixel comme la porte de la cabane
// (cabin.ts) : la teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas et à droite. Quatre vues chacun :
// r0 la face du dehors au sud, r1 la face du dehors à l'ouest (de chant), r2 la face du dedans (on la voit du dedans, depuis le
// sud : le dessin du dehors retourné), r3 la face du dehors à l'est (de chant).
//
// Le bois et le dessin du bardage sont dans art/lib/board-wall.ts (communs avec l'étal). Le bois : la planche fendue, dans la
// rampe du bois travaillé (^ * % & @, art/palette.ts `woodAges`), la même que les poteaux, les sablières et le toit : un bâtiment
// est d'un seul âge (neuf, patiné, vieux, tirés au build). Le bardage se lit comme un remplissage entre les poteaux par sa forme
// (planches debout, couvre-joints, joints, bas mouillé), jamais par sa teinte.
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
// - La porte charretière ouverte (`cart-door-open`, 240 × 120 × 312 cm) : chaque battant a tourné d'un quart vers le dehors
//   autour de son gond ; les deux, perpendiculaires au mur aux deux bouts de l'ouverture, sortent de 1,20 m ; le passage entre
//   eux est vide. Les mêmes battants que la porte fermée (cartDoorFace, edgeView), sans redessin. r0 (sortis au sud) : deux
//   chants de 5 × 74 px aux deux bords de l'image (48 px), la fente devant, le gond du haut au fond ; r2 (au nord) : de même,
//   le chant côté gond devant, son gond du bas dessous. La face du dehors de chaque battant regarde loin du passage (traverses
//   et écharpe de ce côté, les crochets du dedans vers le passage). r1 (sortis à l'ouest) et r3 (à l'est) : 24 × 87 px, les
//   deux battants de face coiffés de leur dessus (2 rangées), l'un derrière l'autre, 22 rangées d'écart ; devant, la face du dehors, derrière la face du dedans
//   (crochets, barre retirée), le gond côté mur (à l'est en r1, à l'ouest en r3).
// - Le pignon (`board-gable`, 520 × 6 × 220 cm, posé de 40 à 560 cm le long du mur de bout) : le même bardage, coupé en
//   pentagone (deux petits côtés verticaux de 30 cm, 6 px, aux bouts, puis les deux rampants jusqu'au sommet) ; il pose sur la
//   sablière, sans ombre portée. Face : 104 × 45 px. Du dedans : deux lisses. De chant : 5 × 97 px (le gabarit de sa boîte,
//   H + W/10 : le profil mince, le dessus de 5,20 m en raccourci).
// - Le grand pan de toit (`plank-roof-large`, 960 × 340 × 260 cm, pièce `ground` et `roof`) : le dessin du pan de la cabane
//   (art/lib/plank-roof.ts) à ses dimensions : r0 192 × 120, r2 192 × 17 de silhouette dans une image de 192 × 68, r1 et r3
//   68 × 244 (parallélogrammes). Sur ce long pan (4,30 m de pente), une rangée de chevilles de plus sur chaque panne, aux tiers.

import { BOARD_WOOD, boardsInside, boardsOutside, darker, edgeView, PITCH, planksOf, withShadow, type Edge, type Panel } from '../lib/board-wall';
import { Canvas } from '../lib/canvas';
import { roofEW, roofNS, type RoofDims } from '../lib/plank-roof';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

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

/** `bar` : la barre de fermeture dans ses crochets (le dedans, porte fermée) ; ouverte, la barre est retirée, les crochets restent. */
function cartDoorFace(inside: boolean, bar = true): Canvas {
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
    for (let x = 1; bar && x < DOOR_W - 1; x++) {
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
    if (inside && bar && y >= BAR[0] && y <= BAR[1] && x > 0 && x < DOOR_W - 1) continue;
    c.set(x, y, k);
  }
  if (inside && bar) { c.set(0, BAR[0], BOARD_WOOD.edge); c.set(DOOR_W - 1, BAR[0], 'o'); }
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
// Porte charretière ouverte
// =====================================================================================================================

/** Les deux battants ouverts sortent de 1,20 m vers le dehors : 12 rangées de dessus en raccourci (r0, r2), 22 rangées d'écart
 * entre le battant de devant et celui de derrière (r1, r3 : 2,40 m moins l'épaisseur d'un battant, en raccourci). */
const OPEN_DEPTH = 12;
const OPEN_GAP = 22;
/** Rangées des battants (du haut au bas), sans les gonds. */
const LEAF_ROWS = DOOR_BOTTOM - DOOR_TOP + 1;

/**
 * Un battant ouvert vu de chant (r0, r2), perpendiculaire au mur : le dessus de 1,20 m en raccourci, puis son chant jusqu'au sol.
 * `outsideWest` : sa face du dehors regarde l'ouest (les traverses et l'écharpe de ce côté, les crochets de l'autre).
 * `hingeFar` : le gond au fond (r0, au nord : on voit le chant de la fente ; le gond du haut dépasse au-dessus du fond du dessus) ;
 * sinon le gond devant (r2 : on voit le chant côté gond, son gond du bas dépasse sous lui).
 */
function openLeafEdge(outsideWest: boolean, hingeFar: boolean): Canvas {
  const top = (y: number) => y - DOOR_TOP; // rangée de la face, comptée depuis le haut du battant
  // l'écart en rangées d'une colonne du battant (0 au gond, 23 à la fente), comptée depuis le fond du dessus
  const shift = (l: number) => (hingeFar ? l : LEAF - 1 - l) / 2;
  // les crochets (la barre retirée) : chaque taquet, vu de chant, glisse en raccourci selon sa place sur le battant
  const hooks = [HOOKS[0], HOOKS[1]]; // les crochets du battant de gauche, colonnes depuis le gond (ceux de droite en sont le reflet)
  const inner: [number, number][] = [];
  for (const hx of hooks) for (const [y0, y1] of [[BAR[0] - 3, BAR[0] - 1], [BAR[1] + 1, BAR[1] + 3]]) {
    const s = [shift(hx), shift(hx + 2)];
    inner.push([top(y0) + Math.floor(Math.min(...s)), top(y1) + Math.ceil(Math.max(...s))]);
  }
  const e: Edge = {
    rows: LEAF_ROWS + OPEN_DEPTH, depth: OPEN_DEPTH, shadow: true, inner,
    outer: [top(DOOR_RAILS[0][0]), top(DOOR_RAILS[1][1]) + OPEN_DEPTH],
  };
  const v = edgeView(e, outsideWest);
  const c = new Canvas(v.w, v.h + 1);
  if (hingeFar) {
    c.stamp(v.toGrid(), 0, 1);
    c.set(2, 0, BOARD_WOOD.edge); // le gond du haut, au fond
  } else {
    c.stamp(v.toGrid(), 0, 0);
    c.set(2, v.h - 1, 'o').set(3, v.h, 'x'); // le gond du bas, devant, et son ombre
  }
  return c;
}

/** r0 (battants sortis au sud) et r2 (au nord) : deux battants de chant aux deux bouts de l'ouverture, le passage vide entre eux. */
function cartDoorOpenEdges(hingeFar: boolean): Canvas {
  const west = openLeafEdge(true, hingeFar);
  const east = openLeafEdge(false, hingeFar);
  return new Canvas(DOOR_W, west.h).stamp(west.toGrid(), 0, 0).stamp(east.toGrid(), DOOR_W - 5, 0);
}

/** Les colonnes [x0, x0 + w[ d'une image. */
const crop = (c: Canvas, x0: number, w: number) => new Canvas(w, c.h).stamp(c.toGrid().map((r) => r.slice(x0, x0 + w)), 0, 0);

/**
 * r1 (battants sortis à l'ouest, le mur à l'est) et r3 (à l'est, le mur à l'ouest) : les deux battants de face, l'un derrière
 * l'autre. Le battant de devant (au sud) montre sa face du dehors, celui de derrière sa face du dedans (crochets, barre retirée),
 * le gond côté mur : à droite en r1, à gauche en r3. Chacun est le battant de la porte fermée tel quel (même lumière, même côté).
 */
function cartDoorOpenFaces(wallEast: boolean): Canvas {
  const x0 = wallEast ? LEAF : 0;
  const front = withTop(crop(cartDoorFace(false), x0, LEAF));
  const back = withTop(crop(cartDoorFace(true, false), x0, LEAF));
  return new Canvas(LEAF, front.h + OPEN_GAP).stamp(back.toGrid(), 0, 0).stamp(front.toGrid(), 0, OPEN_GAP);
}

/**
 * Un battant vu de face, coiffé de son dessus : 20 cm d'épaisseur en raccourci, 2 rangées (le contour, puis le bout des planches
 * au soleil) ; l'arête entre le dessus et la face, un trait d'ombre. Le gond du haut dépasse au-dessus. C'est ce dessus clair
 * qui détache le battant de devant de celui de derrière.
 */
function withTop(face: Canvas): Canvas {
  const w = face.w;
  const c = new Canvas(w, face.h + 2).stamp(face.toGrid(), 0, 2);
  for (let x = 0; x < w; x++) {
    const last = x === w - 1;
    c.set(x, 0, face.get(x, 0)); // le gond, remonté au-dessus du dessus
    c.set(x, 1, last ? 'o' : BOARD_WOOD.edge);
    c.set(x, 2, last ? 'o' : x === 0 ? BOARD_WOOD.edge : x % PITCH === 0 ? BOARD_WOOD.mid : BOARD_WOOD.hi);
    if (x > 0 && !last) c.set(x, 3, BOARD_WOOD.lo);
  }
  return c;
}

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
  img('cart-door-open', cartDoorOpenEdges(true)),
  img('cart-door-open-r1', cartDoorOpenFaces(true)),
  img('cart-door-open-r2', cartDoorOpenEdges(false)),
  img('cart-door-open-r3', cartDoorOpenFaces(false)),
  img('board-gable', boardsOutside(gablePanel(23))),
  img('board-gable-r1', edgeView(GABLE_EDGE, true)),
  img('board-gable-r2', boardsInside(gablePanel(23))),
  img('board-gable-r3', edgeView(GABLE_EDGE, false)),
  img('plank-roof-large', roofNS(LARGE_ROOF, 'south', 161)),
  img('plank-roof-large-r1', roofEW(LARGE_ROOF, 'west', 171)),
  img('plank-roof-large-r2', roofNS(LARGE_ROOF, 'north', 167)),
  img('plank-roof-large-r3', roofEW(LARGE_ROOF, 'east', 173)),
];
