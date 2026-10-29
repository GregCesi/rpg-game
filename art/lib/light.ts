// Éclairage d'un dessin décrit par matières (STYLE, sections 2 et 3).
//
// Un dessin qui doit tourner (outil en main, art/lib/held.ts) ne porte pas ses ombres : il dit seulement,
// pixel par pixel, de quelle matière il est fait (fer, fil de la lame, bois, cuir...). On le tourne d'abord,
// puis on l'éclaire ici : la lumière vient toujours du haut à gauche, quelle que soit l'orientation.
//
// La forme du volume se lit sur sa silhouette : un pixel qui a du vide en haut à gauche est sur une face
// tournée vers la lumière, un pixel qui a du vide en bas à droite est dans l'ombre. Le contour est posé
// après, lui aussi selon l'orientation finale.

import { Canvas, EMPTY, type Grid } from './canvas';

/** Rampe d'une matière : teinte éclairée, teinte de la face moyenne, teinte d'ombre, contour côté lumière. */
export interface Material {
  light: string;
  base: string;
  shade: string;
  /** Teinte la plus sombre de la matière : contour en haut et à gauche (STYLE, section 3). */
  dark: string;
}

/** Caractère de zone du dessin -> matière. Plusieurs zones peuvent partager une matière. */
export type Materials = Record<string, Material>;

// Direction de la lumière, du pixel vers la source : vers le haut à gauche. Le haut l'emporte un peu
// sur la gauche, pour départager un volume couché sur l'autre diagonale (STYLE : « le haut et la gauche »).
const LX = -1;
const LY = -1.25;
/** Rayon du voisinage qui lit la forme : 2 px suffit pour un manche de 2 px comme pour un fer de 6. */
const R = 2;
/** Au-delà de ce score, la face est éclairée ; en deçà de son opposé, elle est dans l'ombre. */
const T = 0.2;

/**
 * Score d'orientation d'un pixel : positif s'il fait face à la lumière (vide du côté de la source),
 * négatif s'il lui tourne le dos. Chaque voisin vide compte, pondéré par sa proximité.
 */
function facing(c: Canvas, x: number, y: number): number {
  let d = 0;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const r2 = dx * dx + dy * dy;
    if (r2 === 0 || r2 > R * R) continue;
    if (c.get(x + dx, y + dy) !== EMPTY) continue;
    d += (dx * LX + dy * LY) / (r2 * Math.sqrt(r2));
  }
  return d;
}

/**
 * Éclaire un dessin de zones : chaque pixel prend la teinte claire, moyenne ou d'ombre de sa matière
 * selon la face qu'il présente à la lumière, puis le dessin reçoit son contour d'un pixel.
 * Le dessin doit laisser un pixel de marge pour le contour.
 */
export function lightUp(zones: Grid, materials: Materials): Grid {
  const src = Canvas.from(zones);
  const out = new Canvas(src.w, src.h);
  // niveau de chaque pixel : 1 éclairé, 0 face moyenne, -1 ombre
  const level: number[][] = Array.from({ length: src.h }, () => Array(src.w).fill(0));
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const z = src.get(x, y);
    if (z === EMPTY) continue;
    if (!materials[z]) throw new Error(`light : zone « ${z} » sans matière`);
    if (x === 0 || y === 0 || x === src.w - 1 || y === src.h - 1) {
      throw new Error(`light : le dessin touche le bord en (${x}, ${y}), il faut un pixel de marge pour le contour`);
    }
    const d = facing(src, x, y);
    level[y][x] = d > T ? 1 : d < -T ? -1 : 0;
  }
  // pas de pixel isolé (STYLE, section 5) : un pixel dont aucun voisin de même matière ne partage le niveau
  // prend le niveau le plus courant autour de lui
  const fixed = level.map((row) => [...row]);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const m = materials[src.get(x, y)];
    if (!m) continue;
    const around: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && materials[src.get(x + dx, y + dy)] === m) around.push(level[y + dy][x + dx]);
    }
    if (around.length < 2 || around.includes(level[y][x])) continue;
    const count = (l: number) => around.filter((a) => a === l).length;
    fixed[y][x] = [1, 0, -1].reduce((best, l) => (count(l) > count(best) ? l : best));
  }
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const m = materials[src.get(x, y)];
    if (m) out.set(x, y, fixed[y][x] > 0 ? m.light : fixed[y][x] < 0 ? m.shade : m.base);
  }
  // contour : OUTLINE en bas et à droite, teinte la plus sombre de la matière voisine en haut et à gauche
  const add: [number, number, string][] = [];
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    if (src.get(x, y) !== EMPTY) continue;
    const filled = (dx: number, dy: number) => src.get(x + dx, y + dy) !== EMPTY;
    if (filled(-1, 0) || filled(0, -1)) add.push([x, y, 'o']);
    else if (filled(1, 0)) add.push([x, y, materials[src.get(x + 1, y)].dark]);
    else if (filled(0, 1)) add.push([x, y, materials[src.get(x, y + 1)].dark]);
  }
  for (const [x, y, k] of add) out.set(x, y, k);
  return out.toGrid();
}
