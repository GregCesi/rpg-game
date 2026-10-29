// La corde de chanvre : le rouleau (`rope-coil`, objet du monde), le lien coupé dedans (`rope-tie`, objet possédable)
// et leurs icônes. Fiches : docs/objets/rope-coil.md, docs/objets/rope-tie.md.
//
// Matière : le chanvre, rampe J O C de la palette (ajoutée pour la corde), et X, le plus sombre : contour côté lumière
// (haut, gauche) et creux du rouleau ; OUTLINE en bas et à droite. Plus jaune et plus saturé que le lin de la tunique de
// Xéros : la corde se lit quand elle pend à sa main.
// Une corde fait environ 1,5 cm : moins de 3 cm, elle se dessine sur un pixel, pour qu'elle existe.

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { outline } from './lib';

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

// ---------- Rouleau au sol ----------
// Cylindre debout de Ø 30 × 10 cm (gabarit : 6 × 5 px, contour compris). Le dessus : un anneau de corde lovée, le
// creux sombre au milieu ; la tranche au sud, une rangée où l'on voit les tours (O, C). Ombre portée décalée à droite.

/** Le rouleau seul, sans ombre (6 × 5) : aussi posé sur le billot (art/world/house.ts). */
export const ROPE_COIL: string[] = [
  '.XXXX.',
  'XJXXOo',
  'XJJOOo',
  'XOCOCo',
  '.oooo.',
];

function ropeCoil(): Canvas {
  const c = new Canvas(7, 6);
  c.stamp(ROPE_COIL, 0, 0);
  // ombre : sous le rouleau, décalée d'un pixel vers la droite
  c.set(5, 4, 'x');
  for (let x = 2; x <= 5; x++) c.set(x, 5, 'x');
  return c;
}

// ---------- Lien au sol ----------
// 2 m de corde pliés en écheveau, couché est-ouest : environ 50 × 15 cm. Les brins couchés côte à côte, les boucles
// arrondies aux deux bouts, un tour serré au milieu (C) qui tient le tout. Le jeu le pose bas milieu sur son point au
// sol, comme branch-ground : le bas de l'image est la rangée de l'ombre.

const TIE_GROUND: string[] = [
  '.XXXXXXXX..',
  'XJJJOCJJJOo',
  'XOOCOCOCOOo',
  '.oooooooooo',
  '..xxxxxxxx.',
];

// ---------- Icônes 16×16 ----------
// Pas d'ombre (le jeu l'ajoute quand l'objet est posé).

/**
 * Le rouleau de trois quarts, plus grand qu'au sol : sur le dessus, les tours de corde en anneaux (clairs, séparés par
 * une rainure), le creux sombre au milieu ; sur la tranche au sud, le tour du dehors, torsadé (traits en biais), éclairé
 * à gauche, dans l'ombre à droite. Le bout de la corde pend sur la tranche, à droite.
 */
function coilIcon(): Canvas {
  const c = new Canvas(16, 16);
  const cx = 7.5, top = 6, rx = 6.5, ry = 3.7, side = 3;
  // tranche
  c.rect(Math.round(cx - rx), Math.round(top), rx * 2, side, 'O');
  c.ellipse(cx, top + side, rx, ry, 'O');
  c.within('O', (c) => {
    c.rect(0, 0, 4, 16, 'J');
    c.rect(11, 0, 5, 16, 'C');
  });
  // torsade du tour du dehors : un trait en biais tous les trois pixels
  const twist = new Canvas(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 3 === 0) twist.set(x, y, 'x');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (twist.get(x, y) !== 'x') continue;
    const k = c.get(x, y);
    if (k !== '.') c.set(x, y, ({ J: 'O', O: 'C', C: 'X' } as Record<string, string>)[k] ?? k);
  }
  // dessus : deux tours de corde, une rainure entre eux, le creux
  c.ellipse(cx, top, rx, ry, 'J');
  c.ellipse(cx + 0.2, top + 0.2, rx - 1.5, ry - 0.9, 'O');
  c.ellipse(cx + 0.2, top + 0.2, rx - 2.4, ry - 1.5, 'J');
  c.ellipse(cx + 0.4, top + 0.3, rx - 4.2, ry - 2.5, 'X');
  // côté ombre du dessus (bas à droite) : un cran plus sombre
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - top) / ry;
    if (u * u + v * v <= 1 && u + v * 0.6 > 0.55 && c.get(x, y) === 'J') c.set(x, y, 'O');
  }
  // le bout de la corde, qui pend sur la tranche à droite
  c.set(13, 9, 'J').set(14, 10, 'O').set(14, 11, 'O');
  return outline(c, 'X');
}

/**
 * L'écheveau noué : la corde lovée en une longue boucle de plusieurs brins (le creux au milieu laisse voir le fond),
 * serrée en son milieu par quelques tours (C), dont sortent les deux bouts qui pendent.
 */
function tieIcon(): Canvas {
  return Canvas.from([
    '................',
    '................',
    '................',
    '..XXXXX..XXXX...',
    '.XJJJJJXXJJJJo..',
    'XJOooooJOoooOOo.',
    'XJOOOOOJCOOOOCo.',
    '.oCCCCCJCCCCCo..',
    '..ooooXJOoooo...',
    '......XJoOo.....',
    '.....XJooXOo....',
    '.....XJo..XOo...',
    '......o....o....',
    '................',
    '................',
    '................',
  ]);
}

// ---------- Lien sous un tas ----------

/**
 * Le lien passé sous un tas, couché au sol, dans une image `w` × `h` : la corde doublée, ses deux brins côte à côte
 * (colonnes `x` et `x + 2`) du nord (rangée `top`, la boucle) au sud (rangée `knot`, le nœud lâche), puis les deux
 * bouts qui s'écartent devant. Torsade : un pixel sur trois un cran plus sombre. Contour X côté lumière.
 */
export function tieUnder(w: number, h: number, x: number, top: number, knot: number): Canvas {
  const c = new Canvas(w, h);
  const twist = (y: number) => ((y % 3) + 3) % 3 === 0;
  for (let y = top + 1; y < knot; y++) {
    c.set(x, y, twist(y) ? 'O' : 'J');
    c.set(x + 2, y, twist(y + 1) ? 'C' : 'O');
  }
  // la boucle au nord
  c.set(x + 1, top, 'J');
  // le nœud lâche : les brins se croisent
  c.set(x, knot, 'O').set(x + 1, knot, 'J').set(x + 2, knot, 'O').set(x + 1, knot + 1, 'O');
  // les deux bouts, qui s'écartent devant
  c.set(x - 1, knot + 2, 'J').set(x - 2, knot + 3, 'O');
  c.set(x + 3, knot + 2, 'O').set(x + 4, knot + 3, 'O').set(x + 4, knot + 4, 'C');
  return outline(c, 'X');
}

export default [img('rope-coil', ropeCoil()), img('rope-tie-ground', Canvas.from(TIE_GROUND)), img('item-rope-coil', coilIcon()), img('item-rope-tie', tieIcon())];
