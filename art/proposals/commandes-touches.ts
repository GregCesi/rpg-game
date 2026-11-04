// Propositions du chantier « commandes v2 » (hors jeu) : les touches affichées au-dessus de ce que Xéros a devant lui.
// Planche : npx tsx tools/essai-commandes.ts -> .art-preview/commandes-touches.png.
//
// Même facture que l'invite du jeu `ui-key-e` (art/ui/dialog.ts, keyE) : 11 × 10 px, contour `o` (OUTLINE) aux coins
// arrondis, parchemin `a`, sa rangée d'ombre `A` en bas, la lettre de 5 × 5 px en `o`. Rien ici n'est déclaré dans
// art/index.ts : ce sont des essais que Grégoire choisit avant toute intégration.

import { Canvas, type Grid } from '../lib/canvas';
import { palette as dialog } from '../ui/dialog';

/** La palette des touches : celle du dialogue (parchemin a A), qui contient le monde (o, H, b, N, K, E, D). */
export const palette = dialog;

/** Les lettres et signes de 5 × 5 px, posés dans la touche en (3, 2). */
export const LETTERS: Record<string, string[]> = {
  // E du jeu, tel quel
  E: ['#####', '#....', '####.', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....'],
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  // Q (la même place que le A sur un clavier QWERTY)
  Q: ['.###.', '#...#', '#...#', '#..#.', '.##.#'],
  // signe « poser » : une flèche qui descend sur le sol (7 rangées : il prend tout le parchemin, de la rangée 1 à 7)
  down: ['..#..', '..#..', '#.#.#', '.###.', '..#..', '.....', '#####'],
};

/**
 * Une touche de 11 × 10 px. `fill` : nombre de rangées du parchemin (8 : les 7 de `a` et l'ombre `A`) passées à l'or,
 * de bas en haut (l'or du remplissage est celui de la jauge `ui-gauge` : H, et b pour la rangée d'ombre). `pale` : la
 * touche secondaire, en retrait (parchemin dans l'ombre, lettre en bois sombre).
 */
export function key(letter: string, opts: { fill?: number; pale?: boolean } = {}): Grid {
  const { fill = 0, pale = false } = opts;
  const c = new Canvas(11, 10, 'o');
  for (const [x, y] of [[0, 0], [10, 0], [0, 9], [10, 9]]) c.set(x, y, '.');
  c.rect(1, 1, 9, 7, pale ? 'A' : 'a');
  c.rect(1, 8, 9, 1, pale ? 'E' : 'A');
  // remplissage : la rangée 8 (l'ombre) d'abord, puis vers le haut
  for (let i = 0; i < fill; i++) {
    const y = 8 - i;
    c.rect(1, y, 9, 1, y === 8 ? 'b' : 'H');
  }
  const ink = pale ? 'N' : 'o';
  const rows = LETTERS[letter];
  const y0 = rows.length > 5 ? 1 : 2;
  rows.forEach((row, y) => [...row].forEach((k, x) => { if (k === '#') c.set(3 + x, y0 + y, ink); }));
  return c.toGrid();
}

/** Lettres de 3 × 5 px de la petite touche (même dessin que les chiffres du tas, art/ui/dialog.ts). */
const SMALL: Record<string, string[]> = {
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
};

/** Petite touche secondaire, 7 × 9 px : même parchemin, lettre de 3 × 5. */
export function smallKey(letter: string): Grid {
  const c = new Canvas(7, 9, 'o');
  for (const [x, y] of [[0, 0], [6, 0], [0, 8], [6, 8]]) c.set(x, y, '.');
  c.rect(1, 1, 5, 6, 'a');
  c.rect(1, 7, 5, 1, 'A');
  SMALL[letter].forEach((row, y) => [...row].forEach((k, x) => { if (k === '#') c.set(2 + x, 2 + y, 'o'); }));
  return c.toGrid();
}

/** Nombre d'étapes de remplissage de la touche (b) : 0 (vide) à 8 (pleine), une rangée par étape. */
export const FILL_STEPS = 9;

/**
 * Jauge à la largeur de la touche (a, variante) : 11 × 4 px, même facture que `ui-gauge` (cadre `o` aux coins ouverts,
 * creux N sur K, l'or H sur b), 9 colonnes de creux. `k` de 0 à 8.
 */
export function narrowGauge(k: number): Grid {
  const c = new Canvas(11, 4, 'o');
  for (const [x, y] of [[0, 0], [10, 0], [0, 3], [10, 3]]) c.set(x, y, '.');
  c.rect(1, 1, 9, 1, 'N').rect(1, 2, 9, 1, 'K');
  const n = Math.round((9 * k) / 8);
  c.rect(1, 1, n, 1, 'H').rect(1, 2, n, 1, 'b');
  return c.toGrid();
}

/** La jauge du jeu, `ui-gauge` (14 × 4), recopiée de art/ui/dialog.ts pour la poser sous la touche. */
export function gameGauge(k: number): Grid {
  const c = new Canvas(14, 4, 'o');
  for (const [x, y] of [[0, 0], [13, 0], [0, 3], [13, 3]]) c.set(x, y, '.');
  c.rect(1, 1, 12, 1, 'N').rect(1, 2, 12, 1, 'K');
  const n = Math.round((12 * k) / 8);
  c.rect(1, 1, n, 1, 'H').rect(1, 2, n, 1, 'b');
  return c.toGrid();
}

/** Assemble des images sur une seule grille (les cases transparentes ne recouvrent rien). */
export function compose(w: number, h: number, parts: [Grid, number, number][]): Grid {
  const c = new Canvas(w, h);
  for (const [g, x, y] of parts) c.stamp(g, x, y);
  return c.toGrid();
}

/** E maintenu (a) : la touche E, la jauge du jeu (14 px) centrée 1 px dessous. */
export const heldGaugeWide = (k: number) => compose(14, 15, [[key('E'), 1, 0], [gameGauge(k), 0, 11]]);
/** E maintenu (a') : la touche E, une jauge à sa largeur (11 px) 1 px dessous. */
export const heldGaugeNarrow = (k: number) => compose(11, 15, [[key('E'), 0, 0], [narrowGauge(k), 0, 11]]);
/** E maintenu (b) : la touche qui se remplit elle-même. */
export const heldFill = (k: number) => key('E', { fill: k });

/** Deux touches : les dispositions proposées, E (agir sans outil) et F (travailler). */
export const pairs: { id: string; title: string; grid: Grid }[] = [
  { id: '1', title: '1 cote a cote, 1 px', grid: compose(23, 10, [[key('E'), 0, 0], [key('F'), 12, 0]]) },
  { id: '2', title: '2 F principale, E petite', grid: compose(19, 10, [[key('F'), 0, 0], [smallKey('E'), 12, 1]]) },
  { id: '3', title: '3 F principale, E pale', grid: compose(23, 10, [[key('F'), 0, 0], [key('E', { pale: true }), 12, 0]]) },
  { id: '4', title: '4 empilees', grid: compose(11, 21, [[key('E'), 0, 0], [key('F'), 0, 11]]) },
];

// ---------- E qu'on peut aussi maintenir ----------

/** Double bord : un second cadre autour de la touche (anneau de parchemin, contour), 13 × 12. */
function doubleEdge(): Grid {
  const c = new Canvas(13, 12, 'o');
  for (const [x, y] of [[0, 0], [12, 0], [0, 11], [12, 11]]) c.set(x, y, '.');
  c.rect(1, 1, 11, 9, 'a').rect(1, 10, 11, 1, 'A');
  c.stamp(key('E'), 1, 1);
  return c.toGrid();
}

/** Trois points sous la touche : trois grains de parchemin cerclés de contour, 1 px sous elle. */
function threeDots(): Grid {
  const dot = ['ooo', 'oao', 'ooo'];
  return compose(11, 14, [[key('E'), 0, 0], [dot, 0, 11], [dot, 4, 11], [dot, 8, 11]]);
}

/** Petit arc : une anse de parchemin posée sur la touche, comme une poignée qu'on tient. */
function arc(): Grid {
  const handle = ['...ooooo...', '.ooaaaaaoo.', 'oaaoooooaao', 'oao.....oao'];
  return compose(11, 13, [[handle, 0, 0], [key('E'), 0, 3]]);
}

/** La jauge vide sous la touche : elle annonce celle qui se remplira. */
const emptyGauge = () => heldGaugeNarrow(0);

export const holdMarks: { id: string; title: string; grid: Grid }[] = [
  { id: 'h1', title: 'h1 double bord', grid: doubleEdge() },
  { id: 'h2', title: 'h2 trois points', grid: threeDots() },
  { id: 'h3', title: 'h3 anse', grid: arc() },
  { id: 'h4', title: 'h4 jauge vide', grid: emptyGauge() },
];
