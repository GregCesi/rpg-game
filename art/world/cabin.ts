// La cabane de bûcheron en rondins du normal (chantier « cabane en rondins ») : la porte en planches et le pan de toit en
// planches (fiches docs/objets/plank-door.md, plank-roof.md). Les murs sont les rondins eux-mêmes (wood-pieces.ts).
//
// Gabarit (docs/STYLE.md, section 8), 5 cm par pixel, lumière nord-ouest, contour d'un pixel : la teinte la plus sombre de la
// matière en haut et à gauche, OUTLINE (o) en bas et à droite.
//
// - La porte (`plank-door`, 100 × 6 × 200 cm, debout, quatre vues) : neuve, de bois fendu frais, le bois de la planche fendue
//   (wood-pieces.ts, `plankEW` : Y t T, contour N) ; joints entre planches en P, la teinte la plus sombre du bois frais (Y t T P),
//   plus lisible que T sur t. Face : 20 × 42 px (40 de haut, le dessus de 6 cm tient dans le contour, plus les deux bouts de
//   pivot d'un pixel), l'ombre portée en dessous. De chant : 4 × 50 px (le chant agrandi au plancher de lisibilité, 3 px, plus la
//   traverse et l'écharpe ; le dessus de 1 m en raccourci, 10 rangées).
// - Le pan de toit (`plank-roof`, 480 × 200 × 100 cm, pièce `ground` et `roof`), dessiné par art/lib/plank-roof.ts (commun avec
//   le grand pan de la grange, art/world/barn.ts) : bois brut grisé (rampe S A B Q, K pour les joints : un toit au soleil et à
//   la pluie ; le bois frais Y t T se confondrait avec le chaume). Pas de rangées vides sous lui,
//   pas d'ombre peinte (le jeu la calcule). Le bas de l'image est le bord sud de son emprise, à la hauteur de sa base (la rive
//   basse posée sur le rondin de rive) : projection (x, y, z) -> (x, y − z), pente de 20 px (1 m) sur 40 px (2 m) au sol.
//   - r0 (rive basse au sud) : 96 × 60, le faîtage en haut (rangée 0), la rive basse en bas.
//   - r2 (rive basse au nord) : le pan fuit vers le nord, raccourci : 96 × 21 px de silhouette (la rive en haut, le faîtage en
//     bas), puis 19 rangées vides (le pignon sous le faîtage, jusqu'au bord sud de l'emprise à la hauteur de la base) : image
//     96 × 40. Posé au nord d'un r0, son faîtage tombe sur la rangée 0 du r0 (le r0, plus au sud, est dessiné par-dessus).
//   - r1 (rive basse à l'ouest), r3 (à l'est) : 40 × 116, un parallélogramme (la rive basse rangées 20 à 115, le faîtage
//   rangées 0 à 95) ; côte à côte, un r1 à l'ouest et un r3 à l'est font un toit à deux versants, le faîtage au milieu.

import { Canvas } from '../lib/canvas';
import { roofEW, roofNS, type RoofDims } from '../lib/plank-roof';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

// =====================================================================================================================
// Pan de toit en planches : le dessin commun de art/lib/plank-roof.ts, aux dimensions du pan de la cabane
// =====================================================================================================================

const ROOF: RoofDims = { w: 480, d: 200, h: 100 };

// =====================================================================================================================
// Porte en planches
// =====================================================================================================================

/** Les cinq planches de la face, colonnes [début, fin] entre le contour (0) et le contour (19) ; joints entre elles. */
const DOOR_PLANKS: [number, number][] = [[1, 3], [5, 7], [9, 10], [12, 14], [16, 18]];
const DOOR_JOINTS = [4, 8, 11, 15];
/** Rangées des traverses (au dos), 15 cm chacune ; leurs chevilles traversent sur la rangée du milieu. */
const RAILS: [number, number][] = [[6, 8], [32, 34]];
/** Le haut de la porte (rangée 1) et le bas (rangée 40) : 40 rangées, 2 m. Les pivots dépassent d'un pixel dessus et dessous. */
const DOOR_TOP = 1;
const DOOR_BOTTOM = 40;

/** Fil d'une planche de porte, tirets verticaux [colonne, période, longueur, décalage]. */
const DOOR_GRAIN: [number, number, number, number][] = [
  [2, 11, 4, 0], [6, 13, 5, 6], [7, 9, 3, 2], [10, 12, 4, 8], [13, 10, 4, 3], [17, 14, 5, 9], [18, 11, 3, 5],
];
/** Nœuds de la face du dehors : [colonne, rangée] du coin haut-gauche d'un bloc de 1 × 2. */
const DOOR_KNOTS: [number, number][] = [[13, 21], [6, 27]];
/** Planches un pixel plus courtes en haut (le haut usé, les planches fendues pas toutes égales). */
const SHORT_TOP = new Set([9, 10, 16, 17, 18]);

/**
 * Face de la porte : `inside` faux, la face du dehors (r0) : cinq planches debout, le fil, deux nœuds, les têtes de chevilles
 * des traverses (deux rangées de points), le pivot à gauche ; vrai, la face du dedans (r2, la porte retournée : le pivot à
 * droite) : les planches, les deux traverses (bord du haut éclairé, ombre portée dessous) et l'écharpe en Z, du bas côté pivot
 * au haut côté loquet. Image 21 × 43 : silhouette 20 × 42, l'ombre portée sur la dernière rangée, décalée d'un pixel vers l'est.
 */
function doorFace(inside: boolean): Canvas {
  const c = new Canvas(21, 43);
  const W = 20;
  const pivot = inside ? 17 : 2;
  const top = (x: number) => (SHORT_TOP.has(inside ? W - 1 - x : x) ? DOOR_TOP + 1 : DOOR_TOP);
  const inDoor = (x: number, y: number) => x >= 0 && x < W && y >= top(x) && y <= DOOR_BOTTOM;
  // les planches
  for (let x = 1; x < W - 1; x++) {
    const src = inside ? W - 1 - x : x; // la face du dedans montre les mêmes planches, retournées
    for (let y = top(x); y <= DOOR_BOTTOM; y++) {
      let k: string;
      if (DOOR_JOINTS.includes(src)) k = 'P';
      else {
        // le bord éclairé de chaque planche, à gauche à l'écran (sur la face retournée, son autre bord)
        const first = DOOR_PLANKS.some(([a, b]) => src === (inside ? b : a));
        k = first ? 'Y' : 't';
        const g = DOOR_GRAIN.find(([gx]) => gx === src);
        if (g && !first && (y + g[3]) % g[1] < g[2]) k = 'T';
        if (!inside && DOOR_KNOTS.some(([kx, ky]) => kx === src && (y === ky || y === ky + 1))) k = 'T';
      }
      c.set(x, y, k);
    }
  }
  if (!inside) {
    // les têtes de chevilles : une par planche, sur la rangée du milieu de chaque traverse
    for (const [a, b] of DOOR_PLANKS) for (const [r0, r1] of RAILS) c.set(Math.floor((a + b) / 2), (r0 + r1) >> 1, 'N');
  } else {
    // l'écharpe : du bas, côté pivot (droite), au haut, côté loquet (gauche), entre les traverses ; 3 px de large
    const y0 = RAILS[0][1] + 1;
    const y1 = RAILS[1][0] - 1;
    for (let y = y0; y <= y1; y++) {
      const cx = Math.round(3 + ((15 - 3) * (y - y0)) / (y1 - y0));
      c.set(cx - 1, y, 'Y').set(cx, y, 't').set(cx + 1, y, 'T');
      if (cx + 2 < W - 1) c.set(cx + 2, y, 'P'); // son ombre sur les planches, côté est
    }
    // les traverses, sur toute la largeur : le bord du haut au soleil, le bas à l'ombre, l'ombre portée sur les planches
    for (const [r0, r1] of RAILS) {
      for (let x = 1; x < W - 1; x++) {
        c.set(x, r0, 'Y');
        for (let y = r0 + 1; y < r1; y++) c.set(x, y, 't');
        c.set(x, r1, 'T');
        if (c.get(x, r1 + 1) !== 'P') c.set(x, r1 + 1, 'T');
      }
      // les chevilles, une par planche, au milieu de la traverse
      for (const [a, b] of DOOR_PLANKS) c.set(W - 1 - Math.floor((a + b) / 2), (r0 + r1) >> 1, 'N');
    }
    // les chevilles de l'écharpe, à ses deux bouts
    c.set(3, y0 + 1, 'N').set(15, y1 - 1, 'N');
  }
  // le contour : N en haut et à gauche, OUTLINE en bas et à droite
  const out: [number, number, string][] = [];
  for (let y = 0; y < 43; y++) for (let x = 0; x < W; x++) {
    if (!inDoor(x, y)) continue;
    if (!inDoor(x + 1, y) || !inDoor(x, y + 1)) out.push([x, y, 'o']);
    else if (!inDoor(x - 1, y) || !inDoor(x, y - 1)) out.push([x, y, 'N']);
  }
  for (const [x, y, k] of out) c.set(x, y, k);
  // les pivots : un bout de bois rond qui dépasse en haut (dans le linteau) et en bas (dans le seuil)
  c.set(pivot, DOOR_TOP - 1, 'N').set(pivot, DOOR_BOTTOM + 1, 'o');
  // l'ombre portée
  for (let x = 2; x <= W; x++) c.set(x, DOOR_BOTTOM + 2, 'x');
  return c;
}

/**
 * La porte de chant (r1 : la face du dehors à l'ouest ; r3 : à l'est). Rangées 0 à 9 : le dessus de la porte, 1 m en raccourci,
 * le bout des planches au soleil ; 10 à 49 : le chant, 2 m. La planche (3 cm, agrandie à 1 px de bois entre ses contours) sur
 * toute la hauteur ; du côté du dedans, la traverse du haut, l'écharpe et la traverse du bas, d'un tenant (de chant, l'écharpe
 * couvre la hauteur entre les traverses), un pixel de plus. Image 5 × 51 : silhouette 4 × 50, l'ombre portée dessous.
 */
function doorEdge(outsideWest: boolean): Canvas {
  const c = new Canvas(5, 51);
  const H = 50;
  const TOPS = 10;
  const BRACE: [number, number] = [TOPS + RAILS[0][0] - DOOR_TOP, TOPS + RAILS[1][1] - DOOR_TOP];
  const plank = outsideWest ? 0 : 1; // première colonne de la planche (contour, bois, contour)
  const back = outsideWest ? 3 : 0; // la colonne de plus, côté dedans, à la hauteur de la traverse et de l'écharpe
  const braced = (y: number) => y >= BRACE[0] && y <= BRACE[1];
  for (let y = 0; y < H; y++) {
    const wood = y < TOPS ? (y % 4 < 2 ? 'Y' : 't') : (y + 3) % 11 < 3 ? 'T' : 't';
    if (y === 0) {
      for (let x = plank; x < plank + 3; x++) c.set(x, y, x === plank + 2 ? 'o' : 'N');
      continue;
    }
    if (y === H - 1) {
      for (let x = plank; x < plank + 3; x++) c.set(x, y, 'o');
      if (braced(y)) c.set(back, y, 'o');
      continue;
    }
    if (outsideWest) {
      c.set(0, y, 'N').set(1, y, wood);
      if (braced(y)) c.set(2, y, y === BRACE[0] ? 't' : 'T').set(3, y, 'o');
      else c.set(2, y, 'o');
      if (y === BRACE[1] + 1) c.set(2, y, 'o');
    } else {
      if (braced(y)) c.set(0, y, 'N').set(1, y, y === BRACE[0] ? 'Y' : 't');
      else c.set(1, y, 'N');
      c.set(2, y, wood).set(3, y, 'o');
    }
  }
  // le contour du haut et du bas de la traverse, côté dedans
  if (outsideWest) { c.set(2, BRACE[0] - 1, 'o'); c.set(3, BRACE[0], 'o'); c.set(3, BRACE[1] + 1, 'o'); }
  else { c.set(0, BRACE[0], 'N'); c.set(1, BRACE[0] - 1, 'N'); c.set(0, BRACE[1] + 1, 'o'); c.set(1, BRACE[1] + 1, 'o'); }
  for (let x = 1; x <= 4; x++) if (c.get(x - 1, H - 1) !== '.' || x === 4) c.set(x, H, 'x');
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('plank-door', doorFace(false)),
  img('plank-door-r1', doorEdge(true)),
  img('plank-door-r2', doorFace(true)),
  img('plank-door-r3', doorEdge(false)),
  img('plank-roof', roofNS(ROOF, 'south', 61)),
  img('plank-roof-r1', roofEW(ROOF, 'west', 71)),
  img('plank-roof-r2', roofNS(ROOF, 'north', 67)),
  img('plank-roof-r3', roofEW(ROOF, 'east', 73)),
];
