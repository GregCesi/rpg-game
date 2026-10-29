// La corde de chanvre : le rouleau (`rope-coil`, objet du monde), le lien coupé dedans (`rope-tie`, objet possédable)
// et leurs icônes. Fiches : docs/objets/rope-coil.md, docs/objets/rope-tie.md.
//
// Matière : le chanvre, rampe J O C de la palette (ajoutée pour la corde), et X, le plus sombre : contour côté lumière
// (haut, gauche) et creux du rouleau ; OUTLINE en bas et à droite. Plus jaune et plus saturé que le lin de la tunique de
// Xéros : la corde se lit quand elle pend à sa main.
// Une corde fait environ 1,5 cm : moins de 3 cm, elle se dessine sur un pixel, pour qu'elle existe.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { capsule, outline } from './lib';

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
 * Le lien lové en une petite boucle lâche, comme posé par terre, les deux bouts croisés en bas : l'un s'en va vers la
 * droite, l'autre, court, pend dessous. Corde de 2 px pour l'icône : côté lumière clair (J), côté ombre (C), torsade d'un cran plus
 * sombre un pixel sur trois ; le bout qui passe dessus est dessiné en dernier.
 */
function tieIcon(): Canvas {
  const c = new Canvas(16, 16);
  const cx = 7.5, cy = 6.5, rx = 5.2, ry = 3.9;
  const at = (deg: number): [number, number] => [cx + rx * Math.cos((deg * Math.PI) / 180), cy + ry * Math.sin((deg * Math.PI) / 180)];
  const paint = (_: number, across: number) => (across < -0.25 ? 'J' : across < 0.45 ? 'O' : 'C');
  const path = (pts: [number, number][]) => {
    for (let i = 0; i + 1 < pts.length; i++) capsule(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.95, paint);
  };
  // premier bout : de la droite, couché, il passe sous le croisement, puis fait le tour de la boucle par la gauche et le haut
  const loop: [number, number][] = [[14.3, 11.2], [10.4, 10.6]];
  for (let d = 105; d <= 420; d += 15) loop.push(at(d));
  path(loop);
  // torsade
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const k = c.get(x, y);
    if ((x + 2 * y) % 4 === 0 && k !== EMPTY) c.set(x, y, ({ J: 'O', O: 'C', C: 'C' } as Record<string, string>)[k] ?? k);
  }
  // second bout : il descend du flanc droit, croise le premier par-dessus et pend, court, dessous
  path([at(420), [8.4, 11], [7, 12.9]]);
  return outline(c, 'X');
}

// ---------- Lien seul au sol ----------

/**
 * Le lien posé seul par terre (un tas de branches lié qui n'a encore aucune branche, `tie.alone` de piles.json) : 2 m
 * de corde lâchés en une boucle lâche, à plat, d'environ 55 × 35 cm (11 × 7 px : à plat, le sol se voit sans
 * raccourci), les deux bouts croisés en bas à droite, l'un traîne vers l'est, l'autre vers le sud-ouest. Corde d'un
 * pixel : J du côté de la lumière, O, C du côté de l'ombre. Ombre portée sous le bas et la droite.
 */
const TIE_LOOP: string[] = [
  '................',
  '.....#####......',
  '...##.....##....',
  '..#.........#...',
  '..#..........#..',
  '...#.........#..',
  '....##......#...',
  '......####.#....',
  '..........#.....',
  '.........#.###..',
  '........#.......',
  '................',
  '................',
];

function tieAlone(): Canvas {
  const c = new Canvas(TIE_LOOP[0].length, TIE_LOOP.length);
  const cx = 8, cy = 4.5;
  TIE_LOOP.forEach((row, y) => [...row].forEach((k, x) => {
    if (k !== '#') return;
    const d = (x - cx) / 6 + (y - cy) / 3.5;
    c.set(x, y, d < -0.45 ? 'J' : d < 0.55 ? 'O' : 'C');
  }));
  outline(c, 'X');
  // ombre : sous chaque contour du bas, un pixel plus bas et à droite
  const shade: [number, number][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.get(x, y) === 'o' && c.get(x + 1, y + 1) === EMPTY && c.get(x, y + 1) === EMPTY) shade.push([x + 1, y + 1]);
  for (const [x, y] of shade) c.set(x, y, 'x');
  return c;
}

// ---------- Lien sous un tas ----------

/**
 * Le lien passé sous un tas, couché au sol, dont on ne voit que les deux bouts qui dépassent, en deux images que le jeu
 * accroche au tas (`tie.north`, `tie.south` de piles.json, `tieImages` de src/world/pileShape.ts) : derrière (au nord)
 * la boucle de la corde doublée, devant (au sud) le nœud lâche et les deux bouts qui s'écartent. Le milieu de la corde
 * est sous les branches : chaque image est coupée net du côté du tas (pas de contour de ce côté), la corde y file sous
 * la branche. Brins de la boucle aux colonnes 2 à 6, ceux du nœud aux colonnes 3 et 5. Contour X côté lumière, OUTLINE
 * en bas et à droite, ombre portée sous les bouts du sud.
 */
const TIE_NORTH_STUB = [
  '...JJ.....',
  '..J..O....',
  '..J..C....',
  '...J.O....',
  '...O..C...',
  '...J..O...',
  '...O..C...', // sous la branche
  '...J..O...',
];
const TIE_SOUTH_STUB = [
  '...O.C....',
  '...J.O....', // sous la branche
  '...J.O....',
  '...OJC....',
  '...JOC....',
  '..J...O...',
  '..O....OC.',
  '.O........',
];

/** Rangées de `c` de `from` à `to` (exclu). */
const rows = (c: Canvas, from: number, to: number) => Canvas.from(c.toGrid().slice(from, to));

/** Le bout nord (10 × 7) : la boucle ; sa dernière rangée file sous la branche du nord. */
export function tieNorth(): Canvas {
  const c = new Canvas(10, TIE_NORTH_STUB.length + 2);
  c.stamp(TIE_NORTH_STUB, 0, 1);
  outline(c, 'X');
  return rows(c, 0, TIE_NORTH_STUB.length);
}

/** Le bout sud (10 × 8) : sa première rangée sort de sous la branche du sud ; puis le nœud, les bouts, l'ombre. */
export function tieSouth(): Canvas {
  const c = new Canvas(10, TIE_SOUTH_STUB.length + 2);
  c.stamp(TIE_SOUTH_STUB, 0, 0);
  outline(c, 'X');
  const shade: [number, number][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.get(x, y) === 'o' && c.get(x + 1, y + 1) === EMPTY && c.get(x, y + 1) === EMPTY) shade.push([x + 1, y + 1]);
  for (const [x, y] of shade) c.set(x, y, 'x');
  return rows(c, 1, c.h);
}

export default [img('rope-coil', ropeCoil()), img('rope-tie-ground', Canvas.from(TIE_GROUND)), img('item-rope-coil', coilIcon()), img('item-rope-tie', tieIcon()), img('pile-branch-tie-alone', tieAlone())];
