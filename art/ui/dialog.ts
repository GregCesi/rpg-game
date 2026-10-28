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

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [img('ui-box', box()), img('ui-next', next()), img('ui-key-e', keyE())];
