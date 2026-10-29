// Tas (src/content/piles.json) : les images des pièces de tas, place par place.
//
// Le jeu affiche un tas couche par couche, du bas vers le haut ; dans une couche, de l'arrière vers l'avant.
// Une pièce du dessus est donc toujours peinte par-dessus les pièces du sol.
//
// Billes : pas de dessin ici. Toutes les places du tas de billes affichent la bille au sol de la coupe
// (`felled-log`, art/world/felled.ts, 20x16 ; tournée, `felled-log-ns`, 14x21), si bien qu'une bille reprise puis
// reposée garde son aspect. Les positions dans piles.json font le reste. Au sol, la profondeur compte 5 cm par pixel,
// comme la largeur : trois billes est-ouest à 11 px (55 cm, leur diamètre) l'une de l'autre du nord au sud, la bille
// de devant ne cachant que le contour et la rangée d'écorce sombre du bas de celle de derrière. Une bille d'un creux
// monte de 9,5 px (55 cm × √3/2, la hauteur comptée comme Xéros) au-dessus du milieu de ses porteuses : entre elle et
// la bille de devant reste une fente sombre, le bas de la bille de derrière, sous son ombre de contact. Tournées
// (nord-sud), les billes sont côte à côte à 12 px (11 et un contour commun) ; une bille du creux monte de 6 px, ce qui
// fait se toucher les faces de coupe (ovales de 11 × 7) en triangle.
//
// Branches : la branche sèche (dessin commun dans art/items/branch.ts, comme branch-ground, held-branch et
// item-branch), couchée est-ouest. 22 à 28 px (1,1 à 1,4 m) ;
// gros bout de 2 px (10 cm), cassé net en bois clair, puis une tige d'1 px vers la pointe, des rameaux. Tête-bêche :
// le gros bout change de côté d'une place à la voisine et d'une couche à l'autre. Au sol, 3 px (15 cm) d'une
// branche à l'autre ; une couche monte de 3 px. Les rameaux qui partent vers le bas de l'image sont couchés vers
// le sud (sous la branche de devant, qui les cache) ; ceux qui partent vers le haut se dressent.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { branch, finishBranch, branchBody, BASE, type Branch } from '../items/branch';

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

// ---------- Branches ----------

/** Places des branches : longueur, côté du gros bout (tête-bêche), rameaux, décalage du gros bout dans l'image. */
export const BRANCHES: Record<string, Branch & { x0: number }> = {
  g0: { len: 26, thickLeft: true, thick: 11, x0: 2, seed: 11, twigs: [{ at: 0.4, up: true, len: 6, fork: true }, { at: 0.7, up: false, len: 5 }] },
  g1: { len: 24, thickLeft: false, thick: 10, x0: 5, seed: 12, twigs: [{ at: 0.4, up: false, len: 5, fork: true }, { at: 0.6, up: true, len: 6 }] },
  g2: { len: 28, thickLeft: true, thick: 12, x0: 0, seed: 13, twigs: [{ at: 0.45, up: true, len: 5 }, { at: 0.7, up: false, len: 5, fork: true }] },
  g3: { len: 25, thickLeft: false, thick: 10, x0: 4, seed: 14, twigs: [{ at: 0.35, up: false, len: 6 }, { at: 0.55, up: true, len: 6, fork: true }] },
  'l1-0': { len: 25, thickLeft: false, thick: 11, x0: 2, seed: 21, twigs: [{ at: 0.45, up: true, len: 6, fork: true }, { at: 0.7, up: false, len: 4 }] },
  'l1-1': { len: 23, thickLeft: true, thick: 10, x0: 4, seed: 22, twigs: [{ at: 0.4, up: false, len: 5 }, { at: 0.65, up: true, len: 5, fork: true }] },
  'l1-2': { len: 27, thickLeft: false, thick: 11, x0: 1, seed: 23, twigs: [{ at: 0.4, up: true, len: 5 }, { at: 0.7, up: false, len: 5, fork: true }] },
  'l2-0': { len: 24, thickLeft: true, thick: 10, x0: 4, seed: 31, twigs: [{ at: 0.45, up: true, len: 6, fork: true }, { at: 0.75, up: false, len: 4 }] },
  'l2-1': { len: 25, thickLeft: false, thick: 11, x0: 2, seed: 32, twigs: [{ at: 0.4, up: false, len: 5 }, { at: 0.6, up: true, len: 6, fork: true }] },
  'l3-0': { len: 22, thickLeft: true, thick: 9, x0: 5, seed: 41, twigs: [{ at: 0.4, up: true, len: 6, fork: true }, { at: 0.7, up: false, len: 4 }] },
};

const branches = Object.entries(BRANCHES).map(([p, b]) => img(`pile-branch-${p}`, branch(b, b.x0, p.startsWith('g'))));

// ---------- Branche au sol ----------
// Une branche tombée d'une récolte, seule, couchée est-ouest : le jeu la pose bas milieu sur son point au sol
// (`ground` de src/content/items.json). Pas de rameau fourchu vers le bas : il sortirait de l'image. Les rangées vides
// du haut sont retirées ; le bas de l'image est la rangée sous l'ombre.
const GROUND_BRANCH: Branch = { len: 25, thickLeft: true, thick: 11, seed: 51, twigs: [{ at: 0.42, up: true, len: 6, fork: true }, { at: 0.68, up: false, len: 5 }] };

function groundBranch(): Canvas {
  const c = finishBranch(branchBody(GROUND_BRANCH, 3), BASE + 1);
  let top = 0;
  while (c.px[top].every((k) => k === EMPTY)) top++;
  return Canvas.from(c.toGrid().slice(top));
}

export default [...branches, img('branch-ground', groundBranch())];
