// La cabane de bûcheron en rondins, ce qui la ferme (chantier « bâtiments ») : le pignon en planches au-dessus du dernier
// rondin d'un mur de bout, et le volet de la fenêtre du mur est. Même bois, mêmes joints et même convention de vues que la
// porte en planches (cabin.ts, `plank-door`) : planches fendues fraîches Y t T, joints P, têtes de chevilles N, contour N en
// haut et à gauche, OUTLINE (o) en bas et à droite. Lumière nord-ouest.
//
// Gabarit (docs/STYLE.md, section 8), 5 cm par pixel, boîtes debout à quatre vues :
// - Le pignon (`plank-gable`, 260 × 6 × 60 cm) : de face 52 × 13 px (12 de haut, le dessus de 6 cm tient dans le contour,
//   plus un pixel), un pentagone : deux petits côtés de 2 px aux bouts, deux rampants jusqu'au sommet au milieu (pente de
//   50 cm sur 1,30 m). Onze planches debout de 15 à 20 cm, celle du milieu sous le faîte. r0 (le dehors) : les têtes de
//   chevilles le long du bas (chevillé sur le rondin) ; r2 (le dedans) : une traverse chevillée. De chant (r1, r3) : 4 × 38 px
//   (la planche agrandie au plancher de lisibilité, 3 px, plus la traverse ; 260 cm en raccourci, 26 rangées, plus 12 de haut).
//   Pas d'ombre portée : il est posé sur un rondin, en hauteur, comme le pan de toit.
// - Le volet (`plank-shutter`, 60 × 4 × 40 cm) : de face 13 × 8 px (12 de volet, plus les gonds de bois d'un pixel côté
//   gauche vu du dehors), trois planches debout ; r0 (dehors) : les têtes de chevilles des traverses ; r2 (dedans) : les deux
//   traverses. De chant (r1, r3) : 4 × 14 px (la planche et les traverses ; 60 cm en raccourci, 6 rangées,
//   plus 8 de haut). Pas d'ombre portée : il est accroché au mur, à hauteur de fenêtre.

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

/** Contour d'une forme : `o` si le voisin de droite ou du dessous est dehors, sinon `N` si celui de gauche ou du dessus l'est. */
function outline(c: Canvas, w: number, h: number, inside: (x: number, y: number) => boolean): void {
  const out: [number, number, string][] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x + 1, y) || !inside(x, y + 1)) out.push([x, y, 'o']);
    else if (!inside(x - 1, y) || !inside(x, y - 1)) out.push([x, y, 'N']);
  }
  for (const [x, y, k] of out) c.set(x, y, k);
}

/**
 * Teinte d'une planche debout : `src` la colonne dans le dessin du dehors (la face du dedans montre les mêmes planches,
 * retournées), le bord éclairé à gauche à l'écran, le fil en tirets T, les joints en P.
 */
function plankTone(src: number, y: number, inside: boolean, planks: [number, number][], joints: number[], grain: [number, number, number, number][]): string {
  if (joints.includes(src)) return 'P';
  const first = planks.some(([a, b]) => src === (inside ? b : a));
  if (first) return 'Y';
  const g = grain.find(([gx]) => gx === src);
  if (g && (y + g[3]) % g[1] < g[2]) return 'T';
  return 't';
}

// =====================================================================================================================
// Pignon en planches
// =====================================================================================================================

const GW = 52; // 260 cm
const GH = 13; // 60 cm, plus le dessus dans le contour
/** Le haut du pignon à la colonne x : rangée 10 aux bouts (les petits côtés), 0 au faîte (colonnes 25 et 26). */
const gableTop = (x: number) => Math.round(10 - (10 * Math.min(x, GW - 1 - x)) / 25);
/** Joints entre planches (colonnes du dessin du dehors) : planches de 3 à 4 px, celle du milieu (24 à 27) sous le faîte. */
const GABLE_JOINTS = [4, 9, 14, 19, 23, 28, 32, 37, 42, 47];
const GABLE_PLANKS: [number, number][] = [[1, 3], [5, 8], [10, 13], [15, 18], [20, 22], [24, 27], [29, 31], [33, 36], [38, 41], [43, 46], [48, 50]];
/** Fil : [colonne, période, longueur, décalage]. */
const GABLE_GRAIN: [number, number, number, number][] = [
  [7, 9, 3, 1], [12, 11, 3, 6], [17, 8, 3, 4], [26, 10, 4, 3], [35, 9, 3, 7], [40, 11, 3, 2], [45, 8, 3, 5],
];
/** La traverse du dedans : rangées 6 à 8 (15 cm), entre les colonnes où le rampant passe au-dessus. */
const G_RAIL: [number, number] = [6, 8];
const G_RAIL_X: [number, number] = [12, 39];

function gableFace(inside: boolean): Canvas {
  const c = new Canvas(GW, GH);
  const inShape = (x: number, y: number) => x >= 0 && x < GW && y >= gableTop(x) && y < GH;
  for (let x = 1; x < GW - 1; x++) {
    const src = inside ? GW - 1 - x : x;
    for (let y = gableTop(x); y < GH; y++) c.set(x, y, plankTone(src, y, inside, GABLE_PLANKS, GABLE_JOINTS, GABLE_GRAIN));
  }
  if (!inside) {
    // un nœud, sur la grande planche à droite du faîte
    c.set(34, 6, 'T').set(34, 7, 'T');
    // les têtes de chevilles le long du bas, une par planche assez haute, dans le rondin qui le porte
    for (const [a, b] of GABLE_PLANKS) {
      const m = Math.floor((a + b) / 2);
      if (gableTop(m) <= 8) c.set(m, 10, 'N');
    }
  } else {
    // la traverse : le bord du haut au soleil, le bas à l'ombre, son ombre portée sur les planches
    const [r0, r1] = G_RAIL;
    for (let x = G_RAIL_X[0]; x <= G_RAIL_X[1]; x++) {
      c.set(x, r0, 'Y');
      for (let y = r0 + 1; y < r1; y++) c.set(x, y, 't');
      c.set(x, r1, 'T');
      if (c.get(x, r1 + 1) !== 'P') c.set(x, r1 + 1, 'T');
    }
    // ses bouts coupés : le gauche au soleil, le droit à l'ombre
    for (let y = r0; y <= r1; y++) c.set(G_RAIL_X[1], y, 'T');
    // ses chevilles, une par planche qu'elle croise
    for (const [a, b] of GABLE_PLANKS) {
      const m = GW - 1 - Math.floor((a + b) / 2);
      if (m > G_RAIL_X[0] && m < G_RAIL_X[1]) c.set(m, (r0 + r1) >> 1, 'N');
    }
  }
  outline(c, GW, GH, inShape);
  return c;
}

// =====================================================================================================================
// Volet en planches
// =====================================================================================================================

const SW = 12; // 60 cm
const SH = 8; // 40 cm, le dessus de 4 cm dans le contour
const SHUTTER_JOINTS = [4, 8];
const SHUTTER_PLANKS: [number, number][] = [[1, 3], [5, 7], [9, 10]];
/** Pas de fil : sur 6 rangées de planche, ses tirets se mêleraient aux chevilles. */
const SHUTTER_GRAIN: [number, number, number, number][] = [];
/** Les traverses du dedans : 10 cm chacune, en haut et en bas ; leurs chevilles traversent sur leur rangée du bas. */
const S_RAILS: [number, number][] = [[1, 2], [5, 6]];

/**
 * Face du volet : `inside` faux, le dehors (r0) : trois planches, les têtes de chevilles des traverses, les gonds à gauche ;
 * vrai, le dedans (r2, retourné : les gonds à droite) : les deux traverses chevillées.
 * Image 13 × 8 : le volet 12 × 8, plus la colonne des gonds.
 */
function shutterFace(inside: boolean): Canvas {
  const c = new Canvas(SW + 1, SH);
  const ox = inside ? 0 : 1; // décalage du volet dans l'image : la colonne des gonds à gauche au dehors, à droite au dedans
  const inShape = (x: number, y: number) => x >= ox && x < ox + SW && y >= 0 && y < SH;
  for (let x = 1; x < SW - 1; x++) {
    const src = inside ? SW - 1 - x : x;
    for (let y = 1; y < SH - 1; y++) c.set(ox + x, y, plankTone(src, y, inside, SHUTTER_PLANKS, SHUTTER_JOINTS, SHUTTER_GRAIN));
  }
  if (!inside) {
    for (const [a, b] of SHUTTER_PLANKS) for (const [, r1] of S_RAILS) c.set(ox + Math.floor((a + b) / 2), r1, 'N');
  } else {
    // les traverses : le bord du haut au soleil, son ombre portée sur les planches dessous ; les chevilles sur leur rangée du bas
    // (l'écharpe, sur les deux rangées entre elles, ne se lisait pas : un escalier de pixels)
    for (const [r0, r1] of S_RAILS) {
      for (let x = 1; x < SW - 1; x++) {
        c.set(ox + x, r0, 'Y').set(ox + x, r1, 't');
        if (r1 + 1 < SH - 1 && c.get(ox + x, r1 + 1) !== 'P') c.set(ox + x, r1 + 1, 'T');
      }
      for (const [a, b] of SHUTTER_PLANKS) c.set(ox + SW - 1 - Math.floor((a + b) / 2), r1, 'N');
    }
  }
  outline(c, SW + 1, SH, inShape);
  // les gonds de bois : deux tourillons qui dépassent du bord, à la hauteur des traverses
  const hx = inside ? SW : 0;
  for (const [r0] of S_RAILS) c.set(hx, r0 + 1, inside ? 'o' : 'N');
  return c;
}

// =====================================================================================================================
// Les vues de chant, communes aux deux
// =====================================================================================================================

/**
 * Une planche de chant (r1 : le dehors à l'ouest ; r3 : à l'est). Rangées 0 à `tops` − 1 : le dessus, la largeur en
 * raccourci ; puis le chant sur la hauteur. La planche, agrandie à un pixel de bois entre ses contours, sur toute la hauteur ;
 * du côté du dedans, une colonne de plus sur les rangées des traverses (`rail`). `topTone` : le bois du dessus, rangée par
 * rangée ; le chant : t, le fil en tirets T. Image 4 × `h`, sans ombre portée.
 */
function edge(outsideWest: boolean, h: number, tops: number, rail: [number, number], topTone: (y: number) => string): Canvas {
  const c = new Canvas(4, h);
  const railed = (y: number) => y >= rail[0] && y <= rail[1];
  const pl = outsideWest ? 0 : 1; // première colonne de la planche (contour, bois, contour)
  const back = outsideWest ? 3 : 0;
  for (let y = 0; y < h; y++) {
    const wood = y < tops ? topTone(y) : (y + 2) % 9 < 3 ? 'T' : 't';
    if (y === 0) { c.set(pl, 0, 'N').set(pl + 1, 0, 'N').set(pl + 2, 0, 'o'); continue; }
    if (y === h - 1) {
      for (let x = pl; x < pl + 3; x++) c.set(x, y, 'o');
      if (railed(y)) c.set(back, y, 'o');
      continue;
    }
    if (outsideWest) {
      c.set(0, y, 'N').set(1, y, wood);
      if (railed(y)) c.set(2, y, y === rail[0] ? 't' : 'T').set(3, y, 'o');
      else c.set(2, y, 'o');
    } else {
      if (railed(y)) c.set(0, y, 'N').set(1, y, y === rail[0] ? 'Y' : 't');
      else c.set(1, y, 'N');
      c.set(2, y, wood).set(3, y, 'o');
    }
  }
  // le contour du haut et du bas de la traverse
  if (outsideWest) { c.set(2, rail[0] - 1, 'o'); c.set(3, rail[0], 'o'); c.set(3, rail[1] + 1, 'o'); if (rail[1] + 1 < h - 1) c.set(2, rail[1] + 1, 'o'); }
  else { c.set(0, rail[0], 'N'); c.set(1, rail[0] - 1, 'N'); c.set(0, rail[1] + 1, 'o'); c.set(1, rail[1] + 1, 'o'); }
  return c;
}

/**
 * Le pignon de chant : 38 rangées, le dessus en raccourci sur 26 (le rampant nord qui monte au faîte, au soleil, puis le
 * rampant sud qui redescend, un cran plus sombre : le bout des planches coupées en biais), le chant sur 12. La traverse du
 * dedans (à 20 cm du bas, de 40 à 220 cm de long) : rangées 12 à 30.
 */
const gableEdge = (outsideWest: boolean) =>
  edge(outsideWest, 38, 26, [12, 30], (y) => (y === 13 ? 'Y' : y < 13 ? ((y + 1) % 5 < 3 ? 'Y' : 't') : (y % 5 < 3 ? 't' : 'T')));

/** Le volet de chant : 14 rangées, le dessus (60 cm) en raccourci sur 6, le chant sur 8 ; les deux traverses, rangées 2 à 12. */
const shutterEdge = (outsideWest: boolean) => edge(outsideWest, 14, 6, [2, 12], (y) => (y % 3 === 0 ? 't' : 'Y'));

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('plank-gable', gableFace(false)),
  img('plank-gable-r1', gableEdge(true)),
  img('plank-gable-r2', gableFace(true)),
  img('plank-gable-r3', gableEdge(false)),
  img('plank-shutter', shutterFace(false)),
  img('plank-shutter-r1', shutterEdge(true)),
  img('plank-shutter-r2', shutterFace(true)),
  img('plank-shutter-r3', shutterEdge(false)),
];
