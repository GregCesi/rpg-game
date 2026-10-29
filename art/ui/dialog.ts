// Éléments d'interface : cadre en bois et parchemin (étiré en 9 parties), flèche "suite", touche E.

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

const palette = {
  ...world,
  a: '#ecdfbd', // parchemin
  A: '#d8c79d',
};

/** Cadre 24x24, bordure de 8 px : se découpe en 9 parties (coins fixes, bords et centre étirés). */
function box(): Canvas {
  const c = new Canvas(24, 24, 'o');
  for (const [x, y] of [[0, 0], [23, 0], [0, 23], [23, 23]]) c.set(x, y, '.');
  c.rect(1, 1, 22, 22, 'm');
  c.rect(1, 1, 22, 1, 'M').rect(1, 1, 1, 22, 'M');
  c.rect(1, 22, 22, 1, 'N').rect(22, 1, 1, 22, 'N');
  c.rect(4, 4, 16, 16, 'N');
  c.rect(5, 5, 14, 14, 'a');
  c.rect(5, 5, 14, 1, 'A');
  for (const [x, y] of [[2, 2], [21, 2], [2, 21], [21, 21]]) c.set(x, y, 'R');
  return c;
}

/** Petite flèche qui invite à passer à la suite. */
function next(): Canvas {
  return Canvas.from([
    'ooooooooo',
    'oNNNNNNNo',
    '.oNNNNNo.',
    '..oNNNo..',
    '...oNo...',
    '....o....',
  ]);
}

/** Touche "E" affichée au-dessus d'un objet avec lequel on peut interagir. */
function keyE(): Canvas {
  return Canvas.from([
    '.ooooooooo.',
    'oaaaaaaaaao',
    'oaaoooooaao',
    'oaaoaaaaaao',
    'oaaooooaaao',
    'oaaoaaaaaao',
    'oaaoooooaao',
    'oaaaaaaaaao',
    'oAAAAAAAAAo',
    '.ooooooooo.',
  ]);
}

/**
 * Case de la barre d'objets, 24x24 : cadre de bois, creux de parchemin de 18x18 où l'icône 16x16
 * se pose en (4, 4), avec un pixel de marge tout autour. Huit cases côte à côte font 192 px.
 * `active` : la case de l'objet en main, cadre doré et fond plus clair.
 */
function slot(active: boolean): Canvas {
  const [light, mid, dark, hollow] = active ? ['H', 'b', 'h', 'a'] : ['M', 'm', 'N', 'A'];
  const c = new Canvas(24, 24, 'o');
  for (const [x, y] of [[0, 0], [23, 0], [0, 23], [23, 23]]) c.set(x, y, '.');
  c.rect(1, 1, 22, 22, mid);
  c.rect(1, 1, 22, 1, light).rect(1, 1, 1, 22, light);
  c.rect(1, 22, 22, 1, dark).rect(22, 1, 1, 22, dark);
  // creux : bord sombre en haut et à gauche (ombre du cadre), clair en bas et à droite
  c.rect(2, 2, 20, 20, 'N');
  c.rect(3, 3, 19, 19, mid);
  c.rect(3, 3, 18, 18, hollow);
  c.rect(3, 3, 18, 1, active ? 'A' : 'D').rect(3, 3, 1, 18, active ? 'A' : 'D');
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [img('ui-box', box()), img('ui-next', next()), img('ui-key-e', keyE()), img('ui-slot', slot(false)), img('ui-slot-active', slot(true))];
