// Objets lumineux : lanterne posée au sol, torche murale, bougie de table.
// Les lueurs sont faites par le jeu (champ `light` de props.json) : aucun halo n'est peint ici.
// La flamme est la source de lumière : elle reste claire et ne prend pas de contour.

import { Canvas, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';

const palette = world;

/** Teinte la plus sombre de la rampe de chaque matière, pour le contour côté lumière. */
const darkest: Record<string, string> = {
  R: 'Z', r: 'Z', z: 'Z', Z: 'Z', // fer
  M: 'K', m: 'K', N: 'K', K: 'K', // bois
  Y: 'P', t: 'P', T: 'P', P: 'P', // étoupe, verre ambré
  a: 'E', d: 'E', D: 'E', E: 'E', // cire
  U: 'e', u: 'e', n: 'e', e: 'e', // terre cuite
};

/**
 * Contour d'un pixel selon le guide : `OUTLINE` en bas et à droite ; en haut et à gauche,
 * la teinte la plus sombre de la matière voisine.
 */
function litOutline(c: Canvas): Canvas {
  const before = c.toGrid();
  const at = (i: number, j: number) => (i >= 0 && j >= 0 && i < c.w && j < c.h ? before[j][i] : '.');
  const was = (i: number, j: number) => at(i, j) !== '.';
  c.outline('o');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (was(x, y) || c.get(x, y) !== 'o') continue;
    if (!was(x, y - 1) && was(x, y + 1)) c.set(x, y, darkest[at(x, y + 1)] ?? 'o');
    else if (!was(x - 1, y) && was(x + 1, y) && was(x + 1, y + 1)) c.set(x, y, darkest[at(x + 1, y)] ?? 'o');
  }
  return c;
}

/** Ombre portée translucide sous la base, décalée vers la droite, sans recouvrir l'objet. */
function groundShadow(c: Canvas, x: number, y: number, w: number, h: number): Canvas {
  return c.within('.', (c) => c.rect(x, y, w, h, 'x'));
}

// ---------- Lanterne ----------

/**
 * Lanterne de corne et de fer posée au sol (15 × 15 × 30 cm, cylindre debout). Gabarit : 3 × 7,5 px à la taille
 * réelle, agrandie au plancher de lisibilité (6 px de large, jusqu'à 15 de haut) : 6 × 14. Anneau de portage, chapeau
 * de fer, deux montants, vitres de corne ambrée éclairées par la flamme de la bougie (h, H), socle. Image 10 × 17.
 */
function lantern(): Canvas {
  const c = new Canvas(10, 17);
  c.stamp([
    '.rr.',
    'RrzZ',
    'zzZZ',
    'rYtZ',
    'rhtZ',
    'rHTZ',
    'rYTZ',
    'rtTZ',
    'RrzZ',
    'zzZZ',
  ], 3, 3);
  litOutline(c);
  // anneau de portage, fin, sans contour
  c.set(4, 0, 'Z').set(5, 0, 'Z').set(3, 1, 'Z').set(6, 1, 'Z');
  groundShadow(c, 4, 14, 5, 2);
  return c;
}

// ---------- Torche murale ----------

/** Flamme de torche, une variante par image d'animation (i : bord, h : corps, H : cœur). */
const torchFlames: Grid[] = [
  [
    '...i...',
    '..ii...',
    '..ihi..',
    '.ihhi..',
    '.ihHhi.',
    '.ihHHi.',
    'ihHHHhi',
    'ihHHHhi',
    '.ihHhi.',
  ],
  [
    '....i..',
    '...ii..',
    '...ihi.',
    '..ihhi.',
    '.ihHhi.',
    '.ihHHhi',
    'ihHHHhi',
    'ihHHHhi',
    '.ihHhi.',
  ],
  [
    '..i....',
    '.......',
    '..ihi..',
    '.ihhi..',
    '.ihHhhi',
    'ihHHHhi',
    'ihHHHhi',
    'ihHHHhi',
    '.ihHhi.',
  ],
];

/** Torche fixée au mur : platine et collier de fer, manche de bois, tête d'étoupe, flamme. 16x32. */
function wallTorch(frame: number): Canvas {
  const c = new Canvas(16, 32);
  const oy = 4;
  // platine de fer contre le mur, coins abattus, bord clair à gauche et en haut, sombre à droite et en bas
  c.polygon([[6, oy + 15], [10, oy + 15], [11, oy + 16], [11, oy + 23], [10, oy + 24], [6, oy + 24], [5, oy + 23], [5, oy + 16]], 'z');
  c.within('z', (c) => {
    c.rect(5, oy + 15, 1, 3, 'r').rect(5, oy + 15, 6, 1, 'r');
    c.rect(10, oy + 16, 1, 8, 'Z').rect(6, oy + 23, 5, 1, 'Z');
  });
  // manche de bois, qui dépasse sous la platine
  c.rect(7, oy + 12, 2, 15, 'M').rect(8, oy + 12, 1, 15, 'N');
  c.set(8, oy + 26, '.').set(7, oy + 26, 'N');
  // collier qui tient le manche
  c.rect(6, oy + 18, 4, 2, 'Z').rect(6, oy + 18, 3, 1, 'z');
  // tête d'étoupe enroulée en cône sur le manche, bande de corde, haut noirci
  c.polygon([[4.5, oy + 7], [11.5, oy + 7], [10, oy + 13], [6, oy + 13]], 't');
  c.within('t', (c) => {
    c.polygon([[4.5, oy + 7], [6.5, oy + 7], [7, oy + 13], [6, oy + 13]], 'Y');
    c.polygon([[9.5, oy + 7], [11.5, oy + 7], [10, oy + 13], [9, oy + 13]], 'T');
    c.line(5, oy + 9, 10, oy + 10, 'T');
    c.rect(0, oy + 12, 16, 1, 'P');
  });
  c.rect(5, oy + 7, 6, 1, 'N');
  litOutline(c);
  c.stamp(torchFlames[frame], 4, oy - 1);
  return c;
}

// ---------- Bougie ----------

/** Flamme minuscule de la bougie, 2 px de large. */
const candleFlames: Grid[] = [
  ['h.', 'Hh', 'aH'],
  ['.h', 'hH', 'Ha'],
  ['h.', 'h.', 'Hh', 'aH'],
];

/**
 * Chandelle de suif sur son plat de terre cuite (8 × 8 × 20 cm, cylindre debout). Gabarit : 1,6 × 4,8 px à la taille
 * réelle, agrandie au plancher de lisibilité : 6 px de large (le plat), jusqu'à 18 de haut. Image 8 × 15.
 */
function candle(frame: number): Canvas {
  const c = new Canvas(8, 15);
  c.stamp([
    '.ad.',
    '.ad.',
    '.ad.',
    '.ad.',
    '.aD.',
    'UuuU',
    'nnne',
  ], 2, 5);
  litOutline(c);
  c.set(3, 4, 'K'); // mèche
  const f = candleFlames[frame];
  c.stamp(f, 3, 4 - f.length);
  groundShadow(c, 3, 13, 5, 1);
  return c;
}

const burn = (name: string, w: number, h: number, draw: (f: number) => Canvas): SpriteSheetSource => ({
  kind: 'spritesheet',
  name,
  frameW: w,
  frameH: h,
  palette,
  // même cadence que la cheminée et le poêle
  animations: { burn: { frames: [0, 1, 2].map((f) => draw(f).toGrid()), frameRate: 7, repeat: -1 } },
});

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [img('lantern', lantern()), burn('wall-torch', 16, 32, wallTorch), burn('candle', 8, 15, candle)];
