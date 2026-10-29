// Éléments d'interface : cadre en bois et parchemin (étiré en 9 parties), flèche "suite", touches E et Espace.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { palette as portrait } from '../portraits/xeros';
import { outline } from '../items/lib';

const palette = {
  ...world,
  a: '#ecdfbd', // parchemin
  A: '#d8c79d',
  // peau du portrait de Xéros (s S D), pour le pictogramme des deux mains
  '1': portrait.s,
  '2': portrait.S,
  '3': portrait.D,
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
 * Touche Espace, même facture que la touche E mais en barre large, marquée du signe ␣ :
 * affichée sur l'encoche visée quand Xéros tient la hache.
 */
function keySpace(): Canvas {
  return Canvas.from([
    '.ooooooooooooooooo.',
    'oaaaaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaaaaao',
    'oaaaaaaaaaaaaaaaaao',
    'oaaaoaaaaaaaaaoaaao',
    'oaaaoaaaaaaaaaoaaao',
    'oaaaoooooooooooaaao',
    'oaaaaaaaaaaaaaaaaao',
    'oAAAAAAAAAAAAAAAAAo',
    '.ooooooooooooooooo.',
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

// ---------- Mains ----------

/** Main gauche ouverte vue de face (pouce à droite), paume vers nous, doigts écartés : silhouette seule. */
const HAND = [
  '................',
  '................',
  '.......FF.......',
  '....FF.FF.FF....',
  '....FF.FF.FF....',
  '....FF.FF.FF....',
  '.FF.FF.FF.FF.FF.',
  '.FF.FF.FF.FF.FF.',
  '..FFFF.FF.FF.FF.',
  '..FFFFFFFFFFFF..',
  '..FFFFFFFFFFFF..',
  '..FFFFFFFFFFF...',
  '...FFFFFFFFF....',
  '...FFFFFFFFF....',
  '....FFFFFF......',
  '................',
];

const flip = (c: Canvas): Canvas => {
  for (const row of c.px) row.reverse();
  return c;
};

/**
 * Main vide, posée en fond de case (`thumbRight` = main gauche) : aplat de torchis (D), contour et sillons
 * entre les doigts un cran plus sombres (E), sans contour brun. Peu de contraste avec le creux de parchemin,
 * pour qu'un objet posé dans la case ressorte nettement.
 */
function emptyHand(thumbRight: boolean): Canvas {
  const c = Canvas.from(HAND);
  if (!thumbRight) flip(c);
  c.recolor({ F: 'D' });
  return c.outline('E');
}

/** Petite main gauche du pictogramme (pouce à droite) : trois doigts et le pouce, sur 7 colonnes. */
const SMALL_HAND = [
  '.......',
  '.......',
  '...F...',
  '...F.F.',
  '.F.F.F.',
  '.F.F.F.',
  '.F.F.F.',
  '.FFFFF.',
  '.FFFFFF',
  '.FFFFFF',
  '.FFFFFF',
  '..FFFF.',
  '..FFF..',
  '..FFF..',
  '.......',
  '.......',
];

/**
 * Pictogramme « deux mains » : la main gauche et la main droite côte à côte, pouces tournés l'un vers l'autre.
 * En peau, avec le contour des objets : c'est une information (main prise par l'objet à deux mains), pas un fond.
 */
function bothHands(): Canvas {
  const left = Canvas.from(SMALL_HAND);
  const right = flip(Canvas.from(SMALL_HAND));
  const c = new Canvas(16, 16);
  c.stamp(left.toGrid(), 0, 0).stamp(right.toGrid(), 9, 0);
  // modelé : peau claire (1) ; ombre (2) sous chaque doigt et chaque paume, et sur le bord droit de la paume
  const filled = (x: number, y: number) => c.get(x, y) !== EMPTY;
  const shade: [number, number][] = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!filled(x, y)) continue;
    const edge = !filled(x, y + 1) || (y >= 8 && !filled(x + 1, y));
    if (edge) shade.push([x, y]);
  }
  c.recolor({ F: '1' });
  for (const [x, y] of shade) c.set(x, y, '2');
  return outline(c, '3');
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [img('ui-box', box()), img('ui-next', next()), img('ui-key-e', keyE()), img('ui-key-space', keySpace()), img('ui-slot', slot(false)), img('ui-slot-active', slot(true)), img('ui-hand-left', emptyHand(true)), img('ui-hand-right', emptyHand(false)), img('ui-hands-both', bothHands())];
