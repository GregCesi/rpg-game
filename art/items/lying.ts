// Les vues au sol d'un objet couché (outil posé, piquet) : règle D, docs/STYLE.md section 8. Chaque vue est dessinée à
// part (sa grille de matières, sans contour), puis reçoit son contour d'un pixel (teinte sombre de la matière au nord et à
// l'ouest, OUTLINE au sud et à l'est : la lumière reste en haut à gauche quel que soit le sens) et son ombre portée.
// Une vue nord-sud a la silhouette de la vue est-ouest inversée : sa grille, les dimensions de l'autre échangées.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import { outline } from './lib';

/**
 * Ombre d'une vue est-ouest : une rangée sous la silhouette, décalée d'un pixel vers l'est (comme les vues 0 des outils).
 */
function shadowBelow(c: Canvas): Grid {
  const g = c.toGrid();
  const last = g[g.length - 1];
  return [...g, [...last].map((_, x) => (x > 0 && last[x - 1] !== EMPTY ? 'x' : EMPTY)).join('')];
}

/**
 * Ombre d'une vue nord-sud : la silhouette décalée d'un pixel vers le sud et l'est, là où le sol est libre (une colonne le
 * long du flanc est, la rangée sous le bout sud). Ajoute une colonne et une rangée à l'image.
 */
function shadowSouthEast(c: Canvas): Grid {
  const out = new Canvas(c.w + 1, c.h + 1).stamp(c.toGrid(), 0, 0);
  for (let y = 1; y < out.h; y++) for (let x = 1; x < out.w; x++) {
    if (out.get(x, y) === EMPTY && c.get(x - 1, y - 1) !== EMPTY) out.set(x, y, 'x');
  }
  return out.toGrid();
}

/**
 * Une vue au sol : `inner` (matières, '.' vide, sans contour), son contour (`dark` : teinte du contour côté lumière) et son
 * ombre. `crosswise` : vue nord-sud (ombre au sud-est), sinon est-ouest (ombre sous elle).
 */
export function lyingView(inner: Grid, dark: string | ((k: string) => string), crosswise: boolean): Grid {
  const c = new Canvas(inner[0].length + 2, inner.length + 2).stamp(inner, 1, 1);
  outline(c, dark);
  return crosswise ? shadowSouthEast(c) : shadowBelow(c);
}
