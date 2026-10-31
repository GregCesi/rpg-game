// Le groupe pierre (chantier « briques ») : la petite et la grosse pierre brute ramassées dans les champs ou sur la berge,
// le moellon (la grosse pierre dégrossie au têtu), la pierre de taille (le moellon dressé au ciseau) et les éclats de
// taille qui restent au sol. Pour chacune : l'image au sol, l'icône 16 × 16 et la planche portée `held-*` (posture `carry`,
// à deux mains devant le ventre, comme la pierre plate d'art/world/implantation.ts).
//
// Le naturel est irrégulier, le travaillé est régulier à la mesure du travail :
// - pierre brute : silhouette irrégulière, facettes (dessus clair R r, pente est z, face sud z Z), un éclat ; deux formes
//   dessinées (la seconde : `-b`), même taille à 1 px près ;
// - moellon : à peu près un parallélépipède, mais bosselé : arêtes cassées (coins rognés), faces mouchetées z Z ;
// - pierre de taille : un rectangle net, arêtes vives (coins pleins), dessus en pierre fraîche (1, plus claire), face sud
//   R r avec les traits du layage (r, des tirets réguliers).
//
// Échelle du jeu (5 cm par pixel, gabarit de docs/STYLE.md section 8 : boîte W × (H + D/2), contour compris, ombre
// exclue), lumière en haut à gauche, contour d'un pixel (Z côté lumière, OUTLINE en bas et à droite), ombre portée `x`
// décalée d'un pixel vers le sud-est, hors silhouette.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { sheet } from './carried';
import { outline } from './lib';

/**
 * Palette du groupe pierre : celle du monde, plus la pierre fraîchement taillée (la face dressée au ciseau, pas encore
 * grisée par le temps) : la pierre claire R éclaircie et tirée vers le jaune, comme veut la palette pour les lumières.
 */
export const stonePalette = {
  ...world,
  '1': '#cec6b1', // pierre fraîche, au soleil (R éclairci vers le jaune)
};

/** Contour côté lumière : la teinte la plus sombre de la pierre. */
const DARK = 'Z';

/** Ombre portée : la silhouette décalée d'un pixel vers le sud-est, là où le sol est libre. Ajoute une colonne et une rangée. */
export function castShadow(g: Grid): Grid {
  const c = new Canvas(g[0].length + 1, g.length + 1).stamp(g, 0, 0);
  for (let y = 1; y < c.h; y++) for (let x = 1; x < c.w; x++) {
    const src = g[y - 1]?.[x - 1] ?? EMPTY;
    if (c.get(x, y) === EMPTY && src !== EMPTY && src !== 'x') c.set(x, y, 'x');
  }
  return c.toGrid();
}

/** Une pierre naturelle : ses matières (sans contour) reçoivent leur contour d'un pixel, coins arrondis. */
function natural(inner: Grid): Grid {
  const c = new Canvas(inner[0].length + 2, inner.length + 2).stamp(inner, 1, 1);
  return outline(c, DARK).toGrid();
}

/**
 * Une pierre taillée, arêtes vives : contour d'un pixel jusqu'aux coins (Z en haut et à gauche, OUTLINE en bas et à
 * droite ; le coin haut droit et le coin bas gauche en OUTLINE). `chip` : coins rognés (arêtes cassées du moellon).
 */
function squared(inner: Grid, chipped: [number, number][] = []): Grid {
  const w = inner[0].length + 2, h = inner.length + 2;
  const c = new Canvas(w, h).stamp(inner, 1, 1);
  for (let x = 0; x < w; x++) { c.set(x, 0, x === w - 1 ? 'o' : DARK); c.set(x, h - 1, 'o'); }
  for (let y = 1; y < h - 1; y++) { c.set(0, y, DARK); c.set(w - 1, y, 'o'); }
  for (const [x, y] of chipped) c.set(x, y, EMPTY);
  return c.toGrid();
}

/** Le dessin sans son ombre, recadré sur la silhouette. */
function body(g: Grid): Grid {
  const rows = g.map((r) => r.replace(/x/g, EMPTY)).filter((r) => /[^.]/.test(r));
  const x0 = Math.min(...rows.map((r) => r.search(/[^.]/)));
  const x1 = Math.max(...rows.map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  return rows.map((r) => r.slice(x0, x1 + 1));
}

// ---------- Pierre brute ----------
// Petite (26 × 22 × 19 cm : gabarit 5,2 × (3,8 + 2,2) = 5 × 6) : A 6 × 6, B 5 × 7. Grosse (45 × 34 × 27 cm : 9 × (5,4 +
// 3,4) = 9 × 9) : A et B 9 × 9. Dessus clair en facettes (R au sommet, r sur la pente ouest, z sur la pente est), face sud
// en z, Z vers la droite et le pied ; un éclat (R ou r) sur la face.

const ROUGH: Record<'a' | 'b', Grid> = {
  a: [
    'RRr.',
    'RRrz',
    'zzzZ',
    'zzZ.',
  ],
  b: [
    'RR.',
    'RRr',
    'rrz',
    'zzZ',
    'zZZ',
  ],
};

const BIG_ROUGH: Record<'a' | 'b', Grid> = {
  a: [
    'RRRr...',
    'RRRRrr.',
    'rRRRrrz',
    'rrrrrzz',
    'zzzzzzZ',
    'zzRrzZZ',
    '.zzzZZZ',
  ],
  b: [
    '..RRRr.',
    '.RRRRRr',
    'rRRRRrz',
    'zrrrrzz',
    'zzzzzZZ',
    'zzzzZZZ',
    'zzZZZ..',
  ],
};

// ---------- Moellon ----------
// 40 × 20 × 20 cm, couché : est-ouest 8 × 6 (dessus d'une rangée, face sud de trois), nord-sud 6 × 8 (règle D : le dessus
// long de quatre rangées, le bout en bande de deux au sud). Arêtes cassées : coins rognés ; faces bosselées, mouchetées.

const RUBBLE_EW: Grid = squared([
  'RRrRRr',
  'zrzzzZ',
  'zzZzzZ',
  'zzzZZZ',
], [[0, 0], [7, 0], [0, 5], [7, 5], [6, 0]]);

const RUBBLE_NS: Grid = squared([
  'RRrr',
  'RrRr',
  'rRRz',
  'rrrz',
  'zzzZ',
  'zZzZ',
], [[0, 0], [5, 0], [0, 7], [5, 7], [5, 1]]);

// ---------- Pierre de taille ----------
// 40 × 20 × 15 cm, couchée : est-ouest 8 × 5 (dessus de pierre fraîche, une rangée ; face sud de deux, layage), nord-sud
// 5 × 8 (dessus de quatre rangées, le bout de deux). Rectangle net, coins pleins.

const ASHLAR_EW: Grid = squared([
  '11111R',
  'RrRrRr',
  'rrrrrz',
]);

const ASHLAR_NS: Grid = squared([
  '111',
  '111',
  '11R',
  '1RR',
  'RrR',
  'rrz',
]);

// ---------- Éclats de taille ----------
// À plat sur le sol (40 × 30 cm : 8 × 6), sous les personnages : quelques éclats (dessus clair R, tranche z au sud,
// contour o) et la poussière de pierre (r, grains voulus).

const CHIPS: Grid = [
  '.RZ..r..',
  'Rzo..RR.',
  '.o.r.zzo',
  'r.RR..o.',
  '..zzo..r',
  '.r.o.r..',
];

// ---------- Icônes ----------
// Plus grandes que sur la carte, pour la case : la même pierre, mêmes facettes, sans ombre (le jeu l'ajoute).

const ICON_INNER: Record<string, Grid> = {
  'rough-stone': [
    'RRRRr...',
    'RRRRRrr.',
    'RRRRRrrz',
    'rRRRrrzz',
    'rrrrrzzz',
    'zzzzzzzZ',
    'zzRRrzZZ',
    'zzzrzZZ.',
    '.zzzZZ..',
  ],
  'big-rough-stone': [
    'RRRRRRr.....',
    'RRRRRRRrrr..',
    'rRRRRRRRrrrz',
    'rRRRRRRrrrzz',
    'rrrRRRrrrzzz',
    'rrrrrrrrzzzz',
    'zzzzzzzzzzzZ',
    'zzzzzzzzzZZZ',
    'zzzRRrzzzZZZ',
    'zzzzRrzzZZZZ',
    '.zzzzzzZZZZZ',
    '..zzzzZZZZ..',
  ],
};

const RUBBLE_ICON: Grid = squared([
  'RRRrRRRRrRR',
  'RrRRRRrRRrr',
  'zzrzzzzzzzZ',
  'zzzzZzzzzZZ',
  'zZzzzzzZzZZ',
  'zzzzzzZzZZZ',
], [[0, 0], [12, 0], [0, 7], [12, 7], [11, 0], [12, 1], [1, 7]]);

const ASHLAR_ICON: Grid = squared([
  '11111111111',
  '1111111111R',
  'RrRrRrRrRrR',
  'RrRrRrRrRrR',
  'rrrrrrrrrrz',
]);

/** Une icône 16 × 16 : le dessin centré, un peu bas (la pierre est posée). */
function icon(g: Grid): Grid {
  const c = new Canvas(16, 16);
  c.stamp(g, Math.floor((16 - g[0].length) / 2), 16 - 3 - g.length);
  return c.toGrid();
}

// ---------- Portée ----------
// À deux mains devant le ventre (posture `carry`, CARRY_HANDS de art/characters/xeros.ts) : le jeu pose le centre de
// l'image sur les mains ; les mains tiennent la pierre par-dessous, sa dernière rangée sous la prise (comme la pierre
// plate). Une pierre brute se voit pareille de tous côtés ; le moellon et la pierre de taille, portés en travers du
// ventre, montrent leur long de face et de dos, leur bout de profil (leur vue nord-sud). De dos, le corps la cache.

const HELD = 15;
const HC = Math.floor(HELD / 2);

function carried(g: Grid): Grid {
  const c = new Canvas(HELD, HELD);
  c.stamp(g, HC - Math.floor(g[0].length / 2), HC + 2 - g.length);
  return c.toGrid();
}

const held = (name: string, front: Grid, side: Grid): SpriteSheetSource =>
  sheet(name, HELD, stonePalette, { down: carried(front), up: carried(front), right: carried(side) });

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: stonePalette, grid });

const roughA = natural(ROUGH.a), roughB = natural(ROUGH.b);
const bigA = natural(BIG_ROUGH.a), bigB = natural(BIG_ROUGH.b);

const sources = [
  img('rough-stone-ground', castShadow(roughA)),
  img('rough-stone-ground-b', castShadow(roughB)),
  img('item-rough-stone', icon(natural(ICON_INNER['rough-stone']))),
  held('held-rough-stone', roughA, roughA),
  img('big-rough-stone-ground', castShadow(bigA)),
  img('big-rough-stone-ground-b', castShadow(bigB)),
  img('item-big-rough-stone', icon(natural(ICON_INNER['big-rough-stone']))),
  held('held-big-rough-stone', bigA, bigA),
  img('rubble-stone-ground', castShadow(RUBBLE_EW)),
  img('rubble-stone-ground-ns', castShadow(RUBBLE_NS)),
  img('item-rubble-stone', icon(RUBBLE_ICON)),
  held('held-rubble-stone', body(RUBBLE_EW), body(RUBBLE_NS)),
  img('ashlar-ground', castShadow(ASHLAR_EW)),
  img('ashlar-ground-ns', castShadow(ASHLAR_NS)),
  img('item-ashlar', icon(ASHLAR_ICON)),
  held('held-ashlar', ASHLAR_EW, ASHLAR_NS),
  img('stone-chips', CHIPS),
];

export default sources;
