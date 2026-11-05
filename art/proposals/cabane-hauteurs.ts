// PROPOSITION hors jeu (chantier « hauteurs », CADRAGE-hauteurs.md section 3, la cabane à 7 assises de 30 cm) : deux dessins pour
// tools/essai-hauteurs.ts. Rien ici n'entre dans le jeu (pas déclaré dans art/index.ts).
//
// - La porte en planches à 2,10 m (`plank-door`, 100 × 6 × 210 cm, au lieu de 200) : le dessin de art/world/cabin.ts allongé de
//   2 px. Face : 20 × 44 px de silhouette (42 de haut, le dessus de 6 cm dans le contour, plus les deux bouts de pivot), image
//   21 × 45 avec l'ombre portée. La traverse du haut reste à 25 cm du haut, celle du bas à 30 cm du bas (comme la porte de 2 m) ; les
//   nœuds et le fil suivent. De chant : 4 × 52 px (10 rangées de dessus, 1 m en raccourci, puis 42 de chant), image 5 × 53.
// - Le volet de cabane (`cabin-shutter`, 60 × 4 × 60 cm, variante B retenue par Grégoire) : son dessin définitif est dans
//   art/proposals/cabin-shutter.ts (prêt à intégrer) ; il est repris ici pour la planche de tools/essai-hauteurs.ts.
//
// Gabarit (docs/STYLE.md section 8) : boîtes debout, face sud W × (H + D/2) : porte 20 × (42 + 0,6) → 20 × 42 (+ 2 pivots) ; volet
// 12 × (12 + 0,4) → 12 × 12 (+ les gonds d'une colonne). Bois : la rampe des âges (^ * % & @), contour K en haut et à gauche, o en
// bas et à droite.

import { Canvas } from '../lib/canvas';
import type { Grid } from '../lib/canvas';
import cabinShutter from './cabin-shutter';

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

/** Les dessins proposés, par clé (les vues r0 à r3, comme dans le jeu), en grilles de la palette `world` (rampe des âges). */
export const proposals: Record<string, Grid> = {
  'plank-door': doorFace(false).toGrid(),
  'plank-door-r1': doorEdge(true).toGrid(),
  'plank-door-r2': doorFace(true).toGrid(),
  'plank-door-r3': doorEdge(false).toGrid(),
  // le volet de cabane retenu (variante B) : le dessin définitif, art/proposals/cabin-shutter.ts
  ...Object.fromEntries(cabinShutter.map((s) => [s.name, s.grid])),
};
