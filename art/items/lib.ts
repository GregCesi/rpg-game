// Outils communs aux icônes d'objets 16×16 (ressources, outils, armes).

import { Canvas, EMPTY } from '../lib/canvas';

/** Contour : `dark` sur les bords haut et gauche (côté lumière), OUTLINE en bas et à droite. */
export function outline(c: Canvas, dark: string | ((k: string) => string)): Canvas {
  const darkOf = typeof dark === 'string' ? () => dark : dark;
  const add: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== EMPTY) continue;
    const filled = (dx: number, dy: number) => c.get(x + dx, y + dy) !== EMPTY;
    const shadowSide = filled(-1, 0) || filled(0, -1);
    if (shadowSide) add.push([x, y, 'o']);
    else if (filled(1, 0)) add.push([x, y, darkOf(c.get(x + 1, y))]);
    else if (filled(0, 1)) add.push([x, y, darkOf(c.get(x, y + 1))]);
  }
  for (const [x, y, k] of add) c.px[y][x] = k;
  return c;
}

/** Remplit un segment épais (capsule), et renvoie pour chaque pixel la position le long de l'axe et en travers. */
export function capsule(
  c: Canvas, x0: number, y0: number, x1: number, y1: number, r: number,
  paint: (along: number, across: number) => string | null,
) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  // normale tournée vers le haut-gauche (côté lumière) : across < 0
  let nx = -uy, ny = ux;
  if (nx + ny > 0) { nx = -nx; ny = -ny; }
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const px = x + 0.5 - x0, py = y + 0.5 - y0;
    const t = Math.max(0, Math.min(len, px * ux + py * uy));
    const qx = px - t * ux, qy = py - t * uy;
    if (Math.hypot(qx, qy) > r) continue;
    const across = -(px * nx + py * ny); // > 0 : côté ombre
    const k = paint(t / len, across / r);
    if (k) c.set(x, y, k);
  }
}

/** Matière d'un pixel -> sa teinte la plus sombre, pour le contour côté lumière. */
export const darkest = (map: Record<string, string>, fallback: string) => (k: string) => map[k] ?? fallback;

/** Boule ombrée : clair en haut à gauche, sombre en bas à droite (`ramp` du plus clair au plus sombre). */
export function ball(c: Canvas, cx: number, cy: number, rx: number, ry: number, ramp: [string, string, string]) {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const d = dx + dy * 1.1;
    c.set(x, y, d < -0.55 ? ramp[0] : d < 0.55 ? ramp[1] : ramp[2]);
  }
}
