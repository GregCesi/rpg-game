// Tas (src/content/piles.json) : les images des pièces de tas, place par place.
//
// Le jeu affiche un tas couche par couche, du bas vers le haut ; dans une couche, de l'arrière vers l'avant.
// Une pièce du dessus est donc toujours peinte par-dessus les pièces du sol.
//
// Billes : pas de dessin ici. Toutes les places du tas de billes affichent la bille au sol de la coupe
// (`wood-big-round-100`, art/world/wood-pieces.ts, 21x16 ; tournée, `wood-big-round-100-ns`, 14x21), si bien qu'une bille reprise puis
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
import { branch, finishBranch, branchBody, branchBodyNS, finishBranchNS, BASE, type Branch } from '../items/branch';
import { tieEast, tieNorth, tieSouth, tieWest } from '../items/rope';


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

// ---------- Branches, tas tourné (nord-sud) ----------
// Les mêmes branches, couchées nord-sud (règle D : chacune garde sa longueur), dessinées pour ce sens (`branchBodyNS`) :
// images de NS_W × NS_H, la tige aux colonnes NS_C0 (dessus éclairé) et NS_C0 + 1 (flanc), la branche à partir de la rangée
// x0 + 1 de son entrée de BRANCHES. Le côté du gros bout de l'est-ouest passe au nord (`thickLeft` : gros bout au nord), si
// bien que le tête-bêche suit (le gros bout alterne au nord et au sud d'une place à la voisine). Les rameaux couchés partent
// vers l'est, sous la branche voisine posée après elle ; les autres se dressent vers l'ouest. Places (piles.json, `turned`
// de `branches`) : au sol x 0, 3, 6, 9 (3 px d'une branche à l'autre d'ouest en est, comme du nord au sud en est-ouest),
// y 0 ; une couche monte de 3,5 px comme en est-ouest (y −4, −7, −11), au milieu de ses deux porteuses (x 2, 5, 8 ; 3, 6 ;
// 5). Collision au sol : 3 px de large (la tige et son contour est) sur la longueur de la branche.
export const NS_W = 13;
export const NS_H = 32;
export const NS_C0 = 5;
const branchesNS = Object.entries(BRANCHES).map(([p, b]) =>
  img(`pile-branch-${p}-ns`, finishBranchNS(branchBodyNS(b, b.x0 + 1, NS_W, NS_H, NS_C0, b.thickLeft, 1), p.startsWith('g'))),
);

// ---------- Branche au sol ----------
// Une branche tombée d'une récolte, seule, couchée est-ouest : le jeu la pose bas milieu sur son point au sol
// (`ground` de src/content/items.json). Pas de rameau fourchu vers le bas : il sortirait de l'image. Les rangées vides
// du haut sont retirées ; le bas de l'image est la rangée sous l'ombre.
const GROUND_BRANCH: Branch = { len: 25, thickLeft: true, thick: 11, seed: 51, twigs: [{ at: 0.42, up: true, len: 6, fork: true }, { at: 0.68, up: false, len: 5 }] };

function groundBranch(r2 = false): Canvas {
  const c = finishBranch(branchBody({ ...GROUND_BRANCH, thickLeft: !r2 }, 3), BASE + 1);
  let top = 0;
  while (c.px[top].every((k) => k === EMPTY)) top++;
  return Canvas.from(c.toGrid().slice(top));
}

// Ses trois autres vues (`views: four` d'items.json), un quart de tour de plus à chaque fois dans le sens des aiguilles d'une
// montre, chacune dessinée dans son sens, à la taille de la vue 0 (27 × 9, règle D) :
// - r1 (9 × 27) : le gros bout au nord, les rameaux couchés (au sud en est-ouest) partent vers l'ouest ;
// - r2 (27 × 9) : le gros bout à l'est, sa face cassée dans l'ombre (u) ;
// - r3 (9 × 27) : le gros bout au sud, sa face cassée visible (U u), les rameaux couchés vers l'est.
// Nord-sud, l'ombre est la silhouette décalée d'un pixel vers l'est et vers le sud ; le bas de l'image est sa dernière rangée.
function groundBranchNS(thickTop: boolean): Canvas {
  const c = finishBranchNS(branchBodyNS(GROUND_BRANCH, 2, 13, GROUND_BRANCH.len + 5, 5, thickTop, thickTop ? -1 : 1), true);
  return crop(c);
}

/** Recadre sur ce qui est dessiné (ombre comprise). */
function crop(c: Canvas): Canvas {
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.px[y][x] !== EMPTY) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return Canvas.from(c.toGrid().slice(y0, y1 + 1).map((row) => row.slice(x0, x1 + 1)));
}

// ---------- Lien sous le tas ----------
// Le lien (rope-tie, art/items/rope.ts) passé du nord au sud sous le tas de branches, sous toutes les branches ; on
// n'en voit que les deux bouts, deux images que le jeu accroche à la taille réelle du tas (`tieImages`,
// src/world/pileShape.ts ; `tie.north`, `tie.south` de piles.json) :
// - `pile-branch-tie-north`, la boucle (10 × 7), le bas de l'image au bord nord de la collision de la branche du sol la
//   plus au nord (dy 0) : sa dernière rangée est sous le contour du haut de cette branche, la boucle dépasse derrière
//   sur 5 rangées. Sur un tas de plusieurs couches, les branches du dessus la cachent en partie, c'est voulu.
// - `pile-branch-tie-south`, le nœud et ses deux bouts (10 × 8, l'ombre comprise), sa première rangée sur le contour
//   du bas de la branche du sol la plus au sud (le bas de l'image à dy 7 du bord sud de sa collision).
// Colonnes : x 11 pour les deux, les brins sur les colonnes 13 à 17 du tas, au milieu des branches.

// ---------- Lien seul ----------
// Le lien seul par terre (rope-tie dans un tas qui n'a encore aucune branche) : `tie.alone` de piles.json, posé au
// milieu de l'emprise au sol du tas (les corps des branches du sol : colonnes 0 à 29, rangées −14 à −2), le centre de
// la boucle vers (15, −8).

export default [
  ...branches,
  ...branchesNS,
  img('branch-ground', groundBranch()),
  img('branch-ground-r1', groundBranchNS(true)),
  img('branch-ground-r2', groundBranch(true)),
  img('branch-ground-r3', groundBranchNS(false)),
  img('pile-branch-tie-north', tieNorth()),
  img('pile-branch-tie-south', tieSouth()),
  img('pile-branch-tie-west', tieWest()),
  img('pile-branch-tie-east', tieEast()),
];
