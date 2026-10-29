// Tas (src/content/piles.json) : une image par place, dessinée pour cette position.
//
// Le jeu affiche un tas couche par couche, du bas vers le haut ; dans une couche, de l'arrière vers l'avant.
// Une pièce du dessus est donc toujours peinte par-dessus les pièces du sol. Ici, aucune ne doit être coupée : une
// pièce du dessus est plus haute et plus au sud que ses porteuses, elle est vraiment devant elles à l'écran.
//
// Billes : la bille de l'atelier (`felled-log`, 1 m, 55 cm de diamètre, 13 rangées de haut avec ses contours),
// trois au sol côte à côte du nord au sud (11 px, 55 cm, de l'une à l'autre), deux dans les creux, une au sommet.
// Une bille posée dans un creux monte de 9,5 px (55 cm × √3 / 2) au-dessus du milieu de ses porteuses. Chaque bille a
// ses propres fentes d'écorce ; celles du dessus n'ont pas d'ombre au sol mais une ombre de contact de deux rangées,
// peinte sur leurs porteuses (toujours présentes), qui creuse le joint.
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
import felled from './felled';
import { branch, finishBranch, branchBody, BASE, type Branch } from '../items/branch';

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

// ---------- Billes ----------

/** Rangées de la bille de l'atelier : contour du haut (0), écorce (1 à 11), contour du bas (12), ombre (13 à 15). */
const LOG_SOLID = 13;

function baseLog(): Canvas {
  const src = (felled as ImageSource[]).find((s) => s.name === 'felled-log');
  if (!src) throw new Error('piles : felled-log introuvable');
  const c = Canvas.from(src.grid);
  // écorce nue, sans les fentes d'origine : dessus clair (M) jusqu'à la rangée 3, flanc (m) de 4 à 9
  for (let y = 3; y <= 9; y++) for (let x = 4; x <= 14; x++) c.set(x, y, y === 3 ? 'M' : 'm');
  // coins arrondis : au tas, les bouts se voient en rond, la bille ne se lit plus comme une caisse
  c.set(1, 0, EMPTY).set(0, 1, EMPTY).set(1, 1, 'K').set(0, 11, EMPTY).set(1, 11, 'K').set(1, 12, EMPTY);
  c.set(17, 0, EMPTY).set(18, 1, EMPTY).set(17, 1, 'o').set(18, 11, EMPTY).set(17, 11, 'o').set(17, 12, EMPTY);
  return c;
}

/** Fentes d'écorce : [rangée, x de départ, longueur]. Rangée 3 : fente claire (m) dans le dessus, ailleurs sombre (N). */
type Crack = [number, number, number];
const LOG_CRACKS: Record<string, Crack[]> = {
  g0: [[3, 7, 4], [6, 4, 4], [8, 10, 4]],
  g1: [[3, 5, 3], [3, 11, 3], [7, 7, 5]],
  g2: [[3, 9, 4], [5, 4, 3], [8, 8, 5]],
  u01: [[3, 4, 4], [6, 9, 5]],
  u12: [[3, 8, 5], [5, 5, 3], [8, 11, 3]],
  top: [[3, 6, 3], [7, 4, 4], [6, 11, 4]],
};

function log(place: string, upper: boolean): Canvas {
  const c = baseLog();
  for (const [y, x, n] of LOG_CRACKS[place]) c.within(y === 3 ? 'M' : 'm', (c) => c.line(x, y, x + n - 1, y, y === 3 ? 'm' : 'N'));
  if (!upper) return c;
  // dessus : pas d'ombre au sol, une ombre de contact de deux rangées sur les porteuses
  const out = new Canvas(c.w, LOG_SOLID + 2);
  for (let y = 0; y < LOG_SOLID; y++) for (let x = 0; x < c.w; x++) out.px[y][x] = c.get(x, y);
  for (const y of [LOG_SOLID, LOG_SOLID + 1]) for (let x = 3; x <= 16; x++) out.set(x, y, 'x');
  return out;
}

const logs = [
  ...['g0', 'g1', 'g2'].map((p) => img(`pile-log-${p}`, log(p, false))),
  ...['u01', 'u12', 'top'].map((p) => img(`pile-log-${p}`, log(p, true))),
];

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

export default [...logs, ...branches, img('branch-ground', groundBranch())];
