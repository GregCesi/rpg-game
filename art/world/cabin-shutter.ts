// Le volet de cabane (`cabin-shutter`, chantier « hauteurs », variante B du CADRAGE-hauteurs.md, retenue par Grégoire) : le volet
// de la fenêtre de la cabane en rondins, sur deux assises de 30 cm (60 × 60 cm). Même facture que le volet en planches
// (art/world/cabin-closing.ts, `plank-shutter`, 60 × 40, qui reste celui des fenêtres de la maison) : trois planches debout dans la
// rampe du bois travaillé (^ * %, l'ombre des traverses &, joints et têtes de chevilles @ ; art/palette.ts `woodAges`, le patiné
// et le vieux tirés au build pour un objet `aged`), contour K en haut et à gauche, OUTLINE (o) en bas et à droite. Lumière
// nord-ouest. Validé par Grégoire le 5 novembre 2026 (planche .art-preview/volet-cabane.png ; fiche docs/objets/cabin-shutter.md).
//
// Gabarit (docs/STYLE.md, section 8), 5 cm par pixel, boîte debout à quatre vues (`views: four`, `dims` 60 × 4 × 60, `box`) :
// - De face (r0 le dehors, r2 le dedans) : W × (H + D/2) = 12 × (12 + 0,4) → 12 × 12 px, le dessus de 4 cm dans le contour ; plus
//   la colonne des gonds de bois (un pixel, à gauche vu du dehors, à droite vu du dedans) : image et silhouette 13 × 12.
//   r0 : trois planches (15, 20 et 15 cm), les têtes de chevilles des deux traverses, un tiret de fil et un nœud sur la grande
//   planche du milieu (6 rangées libres entre les traverses). r2 : les deux traverses (10 cm, en haut et en bas), leur ombre
//   portée sur les planches, leurs chevilles.
// - De chant (r1 le dehors à l'ouest, r3 le dehors à l'est) : la planche de 4 cm agrandie au plancher de lisibilité (un pixel de
//   bois entre ses contours, plus la traverse du côté du dedans) : 4 px ; de haut H + W/2 = 12 + 6 = 18 px (le dessus de 60 cm en
//   raccourci sur 6 rangées) : 4 × 18.
// Pas d'ombre portée : il est accroché au mur, à hauteur de fenêtre (comme le volet de 40).
//
// Ouvert (`cabin-shutter-open`, comme `plank-shutter-open` : `swing` à charnière de côté, `image: cabin-shutter`) : les mêmes
// quatre images ; ouvrir, c'est tourner d'un quart vers le dehors autour du gond (world/build.ts `swung`), la vue suivante.

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

/** Contour d'une forme : `o` si le voisin de droite ou du dessous est dehors, sinon `K` si celui de gauche ou du dessus l'est. */
function outline(c: Canvas, w: number, h: number, inside: (x: number, y: number) => boolean): void {
  const out: [number, number, string][] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x + 1, y) || !inside(x, y + 1)) out.push([x, y, 'o']);
    else if (!inside(x - 1, y) || !inside(x, y - 1)) out.push([x, y, 'K']);
  }
  for (const [x, y, k] of out) c.set(x, y, k);
}

// =====================================================================================================================
// Les faces
// =====================================================================================================================

const SW = 12; // 60 cm
const SH = 12; // 60 cm, le dessus de 4 cm dans le contour
/** Joints entre planches (colonnes du dessin du dehors). */
const JOINTS = [4, 8];
/** Les trois planches, colonnes de bois entre les contours : 15, 20, 15 cm (la première colonne de chacune au soleil). */
const PLANKS: [number, number][] = [[1, 3], [5, 7], [9, 10]];
/** Les traverses du dedans, 10 cm chacune, en haut et en bas ; leurs chevilles traversent sur leur rangée du bas. */
const RAILS: [number, number][] = [[1, 2], [9, 10]];
/** Le fil de la planche du milieu (dehors), entre les traverses : colonne, première et dernière rangée. */
const GRAIN: [number, number, number] = [6, 4, 6];
/** Un nœud (dehors) : deux pixels sombres sur la planche de droite, sous le fil de celle du milieu. */
const KNOT: [number, number] = [10, 6];

function plankTone(src: number, inside: boolean): string {
  if (JOINTS.includes(src)) return '@';
  return PLANKS.some(([a, b]) => src === (inside ? b : a)) ? '^' : '*';
}

/**
 * Face du volet : `inside` faux, le dehors (r0) : les trois planches, les têtes de chevilles des traverses, les gonds à gauche ;
 * vrai, le dedans (r2, retourné : les gonds à droite) : les deux traverses chevillées. Image 13 × 12.
 */
function face(inside: boolean): Canvas {
  const c = new Canvas(SW + 1, SH);
  const ox = inside ? 0 : 1; // le volet dans l'image : la colonne des gonds à gauche au dehors, à droite au dedans
  const inShape = (x: number, y: number) => x >= ox && x < ox + SW && y >= 0 && y < SH;
  for (let x = 1; x < SW - 1; x++) {
    const src = inside ? SW - 1 - x : x;
    for (let y = 1; y < SH - 1; y++) c.set(ox + x, y, plankTone(src, inside));
  }
  if (!inside) {
    for (const [a, b] of PLANKS) for (const [, r1] of RAILS) c.set(ox + Math.floor((a + b) / 2), r1, '@');
    const [gx, y0, y1] = GRAIN;
    for (let y = y0; y <= y1; y++) c.set(ox + gx, y, '%');
    c.set(ox + KNOT[0], KNOT[1], '%').set(ox + KNOT[0], KNOT[1] + 1, '%');
  } else {
    // les traverses : le bord du haut au soleil, son ombre portée sur les planches dessous ; les chevilles sur leur rangée du bas
    for (const [r0, r1] of RAILS) {
      for (let x = 1; x < SW - 1; x++) {
        c.set(ox + x, r0, '^').set(ox + x, r1, '*');
        if (r1 + 1 < SH - 1 && c.get(ox + x, r1 + 1) !== '@') c.set(ox + x, r1 + 1, '&');
      }
      for (const [a, b] of PLANKS) c.set(ox + SW - 1 - Math.floor((a + b) / 2), r1, '@');
    }
  }
  outline(c, SW + 1, SH, inShape);
  // les gonds de bois : deux tourillons qui dépassent du bord, à la hauteur des traverses
  const hx = inside ? SW : 0;
  for (const [r0] of RAILS) c.set(hx, r0 + 1, inside ? 'o' : 'K');
  return c;
}

// =====================================================================================================================
// Le chant
// =====================================================================================================================

const TOPS = 6; // le dessus de 60 cm en raccourci
const EH = TOPS + SH; // 18
/** La traverse du dedans, vue de chant : de la rangée 2 (sous le bord du dessus) à la rangée 16 (au-dessus du bas). */
const EDGE_RAIL: [number, number] = [2, 16];

/**
 * Le volet de chant (r1 : le dehors à l'ouest ; r3 : à l'est). Rangées 0 à 5 : le dessus, sa largeur en raccourci ; puis le chant
 * sur 12 rangées. La planche, agrandie à un pixel de bois entre ses contours ; du côté du dedans, une colonne de plus sur les
 * rangées de la traverse. Le dessus en ^ et *, le chant en *, le fil en tirets %. Image 4 × 18, sans ombre portée.
 */
function edge(outsideWest: boolean): Canvas {
  const c = new Canvas(4, EH);
  const rail = EDGE_RAIL;
  const railed = (y: number) => y >= rail[0] && y <= rail[1];
  const pl = outsideWest ? 0 : 1; // première colonne de la planche (contour, bois, contour)
  const back = outsideWest ? 3 : 0;
  for (let y = 0; y < EH; y++) {
    const wood = y < TOPS ? (y % 3 === 0 ? '*' : '^') : (y + 2) % 9 < 3 ? '%' : '*';
    if (y === 0) { c.set(pl, 0, 'K').set(pl + 1, 0, 'K').set(pl + 2, 0, 'o'); continue; }
    if (y === EH - 1) {
      for (let x = pl; x < pl + 3; x++) c.set(x, y, 'o');
      if (railed(y)) c.set(back, y, 'o');
      continue;
    }
    if (outsideWest) {
      c.set(0, y, 'K').set(1, y, wood);
      if (railed(y)) c.set(2, y, y === rail[0] ? '*' : '%').set(3, y, 'o');
      else c.set(2, y, 'o');
    } else {
      if (railed(y)) c.set(0, y, 'K').set(1, y, y === rail[0] ? '^' : '*');
      else c.set(1, y, 'K');
      c.set(2, y, wood).set(3, y, 'o');
    }
  }
  // le contour du haut et du bas de la traverse
  if (outsideWest) { c.set(2, rail[0] - 1, 'o'); c.set(3, rail[0], 'o'); c.set(3, rail[1] + 1, 'o'); if (rail[1] + 1 < EH - 1) c.set(2, rail[1] + 1, 'o'); }
  else { c.set(0, rail[0], 'K'); c.set(1, rail[0] - 1, 'K'); c.set(0, rail[1] + 1, 'o'); c.set(1, rail[1] + 1, 'o'); }
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('cabin-shutter', face(false)),
  img('cabin-shutter-r1', edge(true)),
  img('cabin-shutter-r2', face(true)),
  img('cabin-shutter-r3', edge(false)),
];
