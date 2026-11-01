// Le mannequin d'entraînement (`training-dummy`, fiche docs/objets/training-dummy.md) : une perche plantée, une botte de
// chaume liée debout dessus par deux tours de corde, les épis en haut. Une seule vue (`round`) ; le jeu le fait trembler et
// pencher sous les coups (pas de dessin d'animation).
//
// Gabarit (docs/STYLE.md, section 8) : cylindre debout de Ø 30 cm, 170 cm hors de terre : 6 × (34 + 3) = 6 × 37 px,
// silhouette contour compris, ombre exclue. Dessiné à la taille exacte, pixel par pixel :
// - la botte (120 × Ø 30 cm, de 50 cm à 1,70 m) : les rangées 0 à 26, le dessus (les épis, Ø/2 = 3 rangées) puis le corps
//   (24 rangées) ; les brins debout, en couloirs (Y au jour, t, T à l'ombre), contour P côté lumière, OUTLINE à droite ;
// - deux liens (la corde de art/items/rope.ts : J O C, X pour son contour), rangées 8 et 19, qui pincent la botte d'un
//   pixel de chaque côté ; le nœud, un pixel de corde qui dépasse à droite du lien du bas ;
// - la perche (Ø 12 cm), de 0 à 50 cm sous la botte : les rangées 27 à 36. Comme le poteau du panneau (art/world/signpost.ts),
//   agrandie à 4 px contour compris (2,4 px à la taille réelle) pour que la lumière s'y lise : son écorce lisse de perche
//   (`POLE_WOOD` de art/world/wood.ts : S A B, Q pour son contour côté lumière), dans l'ombre de la botte sous elle ; une
//   touffe d'herbe à son pied.
// Ombre portée au pied, décalée vers la droite (`x`).

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

/**
 * Le mannequin, 6 colonnes × 37 rangées. Chaume : P contour côté lumière et creux, Y t T ; corde : X J O C ; perche : Q S A B ;
 * herbe : g G v ; OUTLINE : o.
 */
const DUMMY: string[] = [
  // les épis : des pointes qui dépassent, le dessus de la botte en ovale
  '.P..P.',
  'PYPtPo',
  'PYYtTo',
  // le corps de la botte
  'PYYtTo',
  'PYtYTo',
  'PYYtTo',
  'PYYTto',
  'PYtYTo',
  // premier lien, qui pince la botte
  '.XJOo.',
  'PYYtTo',
  'PYtYTo',
  'PYYtPo',
  'PYYtTo',
  'PYtYTo',
  'PYYTto',
  'PYYtTo',
  'PYtYTo',
  'PYYtTo',
  'PYYtPo',
  // second lien, le nœud à droite
  '.XJOCo',
  'PYYtTo',
  'PYtYTo',
  'PYYtTo',
  'PYYTto',
  'PtYtTo',
  'PtTtPo',
  // le pied de la botte, coupé, la perche dessous
  '.oBBo.',
  '.QBBo.',
  '.QABo.',
  '.QSAo.',
  '.QSAo.',
  '.QABo.',
  '.QSAo.',
  '.QSAo.',
  '.QABo.',
  'GQSAoG',
  'vgSAgv',
];

const W = 9;
const H = DUMMY.length + 1;
const X0 = 1;

function dummy(): Canvas {
  const c = new Canvas(W, H).stamp(DUMMY, X0, 0);
  // l'ombre portée, au pied, couchée vers la droite
  const foot = DUMMY.length - 1;
  for (let x = X0 + 6; x <= X0 + 7; x++) c.set(x, foot, 'x');
  for (let x = X0 + 1; x <= X0 + 7; x++) c.set(x, foot + 1, 'x');
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('training-dummy', dummy())];
