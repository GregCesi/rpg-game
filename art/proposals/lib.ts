// Outils communs des propositions de la pierre (art/proposals/) : contour, ombre portée, recadrage.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import { outline } from '../items/lib';

/** Une matière dessinée sans contour reçoit son contour d'un pixel : `dark` en haut et à gauche, OUTLINE en bas et à droite. */
export function withOutline(inner: Grid, dark: string): Grid {
  const c = new Canvas(inner[0].length + 2, inner.length + 2).stamp(inner, 1, 1);
  return outline(c, dark).toGrid();
}

/** Ombre portée : la silhouette décalée d'un pixel vers le sud-est, là où le sol est libre. Ajoute une colonne et une rangée. */
export function castShadow(g: Grid): Grid {
  const c = new Canvas(g[0].length + 1, g.length + 1).stamp(g, 0, 0);
  for (let y = 1; y < c.h; y++) for (let x = 1; x < c.w; x++) {
    const src = g[y - 1]?.[x - 1] ?? EMPTY;
    if (c.get(x, y) === EMPTY && src !== EMPTY && src !== 'x') c.set(x, y, 'x');
  }
  return c.toGrid();
}

/** Le dessin sans son ombre, recadré sur la silhouette. */
export function bodyOf(g: Grid): Grid {
  const rows = g.map((r) => r.replace(/x/g, EMPTY));
  const filled = (r: string) => /[^.]/.test(r);
  const y0 = rows.findIndex(filled);
  const y1 = rows.length - 1 - [...rows].reverse().findIndex(filled);
  const kept = rows.slice(y0, y1 + 1);
  const x0 = Math.min(...kept.filter(filled).map((r) => r.search(/[^.]/)));
  const x1 = Math.max(...kept.filter(filled).map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  return kept.map((r) => r.slice(x0, x1 + 1));
}
