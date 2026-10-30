// Billes de l'arbre normal (contrat : art/world/normal-geometry.ts) : la bille seule `normal-felled-log`, couchée
// est-ouest (celle du tas et du sol), et la même bille couchée nord-sud `normal-felled-log-ns` (tas tourné), vue par
// le bout. Mêmes constructions que les billes du gros arbre (art/world/big-felled.ts, `felledLog`, `felledLogNS`),
// à l'échelle du normal : 95 cm de long (19 px contour compris), 30 cm de diamètre d'écorce (6 px, 8 px contour
// compris = 40 cm), « de la grosseur d'un bras ». Matière commune `NORMAL_WOOD` (art/world/wood.ts) : deux couloirs de
// sillons, bouts en ovales de 4 px de large ; une face si étroite n'a pas de cerne (paintFace le retire sous 7 px).
// La bille portée et l'icône (art/items/carried.ts, art/items/resources.ts) partent de ces dessins.
// Les pièces de bois du jeu sont désormais assemblées par art/world/wood-pieces.ts (`composeWood`) : ce fichier ne garde
// que les constructions d'origine, dont la bille portée part encore.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { despeckle, shadedOutline } from './big-tree';
import { NORMAL_WOOD, bark, logByTheEnd, logEnd } from './wood';
import { DIAMETER, SEC } from './normal-geometry';

/** Bois entre les deux contours des bouts : 17 px (19 px contour compris, 95 cm, comme une pièce du tronc couché). */
export const LOG_LEN = SEC - 2;
/** Rayon du tronc à l'écran (6 px d'écorce). */
const R = DIAMETER / 2;

/**
 * Bille seule est-ouest : 17 px de bois entre deux contours, 6 de diamètre (8 contour compris). L'écorce commune en
 * travers (lumière en haut : 2 M, 2 m, 1 N, 1 K), les sillons en long sur deux couloirs, les coins arrondis par les
 * ovales des bouts (4 px de large, 8 de haut contour compris), la face de coupe au bout gauche, vers la lumière,
 * l'écorce enroulée au bout droit. Ombre au sol sur deux rangées, décalée vers la droite, qui s'arrête au bord droit du
 * corps (colonne LOG_LEN + 1) sans le dépasser, comme celle du gros.
 * Dans l'image (après découpe, 20 × 10) : corps colonnes 0 à 18, rangées 0 à 7 (le bas du corps, au sol, en rangée 7),
 * ombre rangées 8 et 9.
 */
export function normalFelledLog(): Canvas {
  const c = new Canvas(LOG_LEN + 4, DIAMETER + 6);
  for (let Y = 1; Y <= DIAMETER; Y++) for (let X = 1; X <= LOG_LEN; X++) c.set(X, Y, bark(X + 30, (Y - 1 + 0.5) / DIAMETER, NORMAL_WOOD));
  const cy = 1 + R;
  logEnd(c, 1, 'left', cy, true, R, NORMAL_WOOD.endA);
  logEnd(c, LOG_LEN + 1, 'right', cy, false, R, NORMAL_WOOD.endA);
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  const bottom = DIAMETER + 1; // rangée du contour du bas
  for (let X = 2; X <= LOG_LEN + 1; X++) if (c.get(X, bottom + 1) === EMPTY) c.set(X, bottom + 1, 'x');
  for (let X = 4; X <= LOG_LEN; X++) if (c.get(X, bottom + 2) === EMPTY) c.set(X, bottom + 2, 'x');
  return c;
}

/**
 * La même bille couchée nord-sud, vue par le bout (`logByTheEnd`) : 8 px de large (6 d'écorce et le contour) ; du
 * nord au sud, le contour, le rond du fond, le dessus d'écorce sur 9 px entre les deux ronds (19 × ½ = 9,5), la face
 * de coupe ovale de 6 × 4 px (Ø × 7/11 ≈ 3,8), le contour : 15 px de silhouette (gabarit : 5,1 + 9,5 ≈ 14,6).
 * Écorce éclairée à gauche, sillons dans le sens de la bille. L'ombre au sol, le corps décalé d'un pixel à droite et
 * de deux vers le bas, tombe le long du flanc droit (colonne 8) et sous la face (rangées 15 et 16).
 */
export const LOG_NS = { w: 9, h: 17, cx: 4, back: 3, front: 12, rx: 3, ry: 2 } as const;
export function normalFelledLogNS(): Canvas {
  const { w, h, cx, back, front, rx, ry } = LOG_NS;
  const c = logByTheEnd(new Canvas(w, h), cx, back, front, rx, ry, NORMAL_WOOD);
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  const body = Canvas.from(c.toGrid());
  for (let Y = 0; Y < h; Y++) for (let X = 2; X < w; X++) {
    if (c.get(X, Y) !== EMPTY || body.get(X - 1, Y - 2) === EMPTY) continue;
    if (Y < back + 2) continue;
    c.set(X, Y, 'x');
  }
  return c;
}

export default [] as ImageSource[];
