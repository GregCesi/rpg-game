// La cabane de bûcheron en rondins du normal (chantier « cabane en rondins ») : la porte en planches et le pan de toit en
// planches (fiches docs/objets/plank-door.md, plank-roof.md). Les murs sont les rondins eux-mêmes (wood-pieces.ts).
//
// Gabarit (docs/STYLE.md, section 8), 5 cm par pixel, lumière nord-ouest, contour d'un pixel : K en haut et à gauche (le contour
// de tout le bois), OUTLINE (o) en bas et à droite.
//
// Le bois : le bois travaillé de tout le jeu, la rampe des âges (^ lumière, * bois, % ombre, & creux, @ joint ; art/palette.ts
// `woodAges`), tirée neuve ici, patinée et vieille au build : la porte et le pan d'une cabane ont l'âge de ses rondins. Ils s'en
// distinguent par la forme : planches, joints, traverses, écharpe, chevilles.
//
// - La porte (`plank-door`, 100 × 6 × 210 cm, debout, quatre vues ; 2,10 m depuis le chantier « hauteurs » : du seuil au linteau
//   de la 8e assise de 30 cm) : cinq planches fendues debout, le bord éclairé de chaque planche en ^, le fil en tirets %, joints
//   entre planches en @, têtes de chevilles en @. Face : 20 × 44 px (42 de haut, le dessus de 6 cm tient dans le contour, plus
//   les deux bouts de pivot d'un pixel), l'ombre portée en dessous. De chant : 4 × 52 px (le chant agrandi au plancher de
//   lisibilité, 3 px, plus la traverse et l'écharpe ; le dessus de 1 m en raccourci, 10 rangées).
// - Le pan de toit (`plank-roof`, 480 × 200 × 100 cm, pièce `ground` et `roof`), dessiné par art/lib/plank-roof.ts (commun avec
//   le grand pan de la grange, art/world/barn.ts), dans la même rampe. Pas de rangées vides sous lui,
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
// La porte de 2,10 m (cabin.ts, `plank-door`, allongée de 2 px)
// =====================================================================================================================

const DOOR_PLANKS: [number, number][] = [[1, 3], [5, 7], [9, 10], [12, 14], [16, 18]];
const DOOR_JOINTS = [4, 8, 11, 15];
/** La porte : rangées 1 à 42 (42 rangées, 2,10 m) ; les traverses à la même distance du haut et du bas qu'à 2 m. */
const DOOR_TOP = 1;
const DOOR_BOTTOM = 42;
const RAILS: [number, number][] = [[6, 8], [34, 36]];
const DOOR_GRAIN: [number, number, number, number][] = [
  [2, 11, 4, 0], [6, 13, 5, 6], [7, 9, 3, 2], [10, 12, 4, 8], [13, 10, 4, 3], [17, 14, 5, 9], [18, 11, 3, 5],
];
const DOOR_KNOTS: [number, number][] = [[13, 22], [6, 28]];
const SHORT_TOP = new Set([9, 10, 16, 17, 18]);

function doorFace(inside: boolean): Canvas {
  const H = DOOR_BOTTOM + 3;
  const c = new Canvas(21, H);
  const W = 20;
  const pivot = inside ? 17 : 2;
  const top = (x: number) => (SHORT_TOP.has(inside ? W - 1 - x : x) ? DOOR_TOP + 1 : DOOR_TOP);
  const inDoor = (x: number, y: number) => x >= 0 && x < W && y >= top(x) && y <= DOOR_BOTTOM;
  for (let x = 1; x < W - 1; x++) {
    const src = inside ? W - 1 - x : x;
    for (let y = top(x); y <= DOOR_BOTTOM; y++) {
      let k: string;
      if (DOOR_JOINTS.includes(src)) k = '@';
      else {
        const first = DOOR_PLANKS.some(([a, b]) => src === (inside ? b : a));
        k = first ? '^' : '*';
        const g = DOOR_GRAIN.find(([gx]) => gx === src);
        if (g && !first && (y + g[3]) % g[1] < g[2]) k = '%';
        if (!inside && DOOR_KNOTS.some(([kx, ky]) => kx === src && (y === ky || y === ky + 1))) k = '%';
      }
      c.set(x, y, k);
    }
  }
  if (!inside) {
    for (const [a, b] of DOOR_PLANKS) for (const [r0, r1] of RAILS) c.set(Math.floor((a + b) / 2), (r0 + r1) >> 1, '@');
  } else {
    const y0 = RAILS[0][1] + 1;
    const y1 = RAILS[1][0] - 1;
    for (let y = y0; y <= y1; y++) {
      const cx = Math.round(3 + ((15 - 3) * (y - y0)) / (y1 - y0));
      c.set(cx - 1, y, '^').set(cx, y, '*').set(cx + 1, y, '%');
      if (cx + 2 < W - 1) c.set(cx + 2, y, '&');
    }
    for (const [r0, r1] of RAILS) {
      for (let x = 1; x < W - 1; x++) {
        c.set(x, r0, '^');
        for (let y = r0 + 1; y < r1; y++) c.set(x, y, '*');
        c.set(x, r1, '%');
        if (c.get(x, r1 + 1) !== '@') c.set(x, r1 + 1, '&');
      }
      for (const [a, b] of DOOR_PLANKS) c.set(W - 1 - Math.floor((a + b) / 2), (r0 + r1) >> 1, '@');
    }
    c.set(3, y0 + 1, '@').set(15, y1 - 1, '@');
  }
  outline(c, W, H, inDoor);
  c.set(pivot, DOOR_TOP - 1, 'K').set(pivot, DOOR_BOTTOM + 1, 'o');
  for (let x = 2; x <= W; x++) c.set(x, DOOR_BOTTOM + 2, 'x');
  return c;
}

function doorEdge(outsideWest: boolean): Canvas {
  const TOPS = 10;
  const H = TOPS + DOOR_BOTTOM; // 52
  const c = new Canvas(5, H + 1);
  const BRACE: [number, number] = [TOPS + RAILS[0][0] - DOOR_TOP, TOPS + RAILS[1][1] - DOOR_TOP];
  const plank = outsideWest ? 0 : 1;
  const back = outsideWest ? 3 : 0;
  const braced = (y: number) => y >= BRACE[0] && y <= BRACE[1];
  for (let y = 0; y < H; y++) {
    const wood = y < TOPS ? (y % 4 < 2 ? '^' : '*') : (y + 3) % 11 < 3 ? '%' : '*';
    if (y === 0) {
      for (let x = plank; x < plank + 3; x++) c.set(x, y, x === plank + 2 ? 'o' : 'K');
      continue;
    }
    if (y === H - 1) {
      for (let x = plank; x < plank + 3; x++) c.set(x, y, 'o');
      if (braced(y)) c.set(back, y, 'o');
      continue;
    }
    if (outsideWest) {
      c.set(0, y, 'K').set(1, y, wood);
      if (braced(y)) c.set(2, y, y === BRACE[0] ? '*' : '%').set(3, y, 'o');
      else c.set(2, y, 'o');
      if (y === BRACE[1] + 1) c.set(2, y, 'o');
    } else {
      if (braced(y)) c.set(0, y, 'K').set(1, y, y === BRACE[0] ? '^' : '*');
      else c.set(1, y, 'K');
      c.set(2, y, wood).set(3, y, 'o');
    }
  }
  if (outsideWest) { c.set(2, BRACE[0] - 1, 'o'); c.set(3, BRACE[0], 'o'); c.set(3, BRACE[1] + 1, 'o'); }
  else { c.set(0, BRACE[0], 'K'); c.set(1, BRACE[0] - 1, 'K'); c.set(0, BRACE[1] + 1, 'o'); c.set(1, BRACE[1] + 1, 'o'); }
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
