// Icônes d'objets 16×16 : outils de paysan et armes (inventaire, objet posé au sol).
// Pas d'ombre portée : le jeu l'ajoute quand l'objet est posé.
// Tous les manches vont en diagonale, du bas à gauche vers le haut à droite : l'inventaire se lit d'un coup d'œil.
// Contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite.

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { darkest, outline } from './lib';

const S = 16;

const palette = {
  ...world,
  // fer forgé, usé : dérivé de la pierre (R r z Z), refroidi d'un cran
  '1': '#d6d3c4', // fil de la lame, arête éclairée (R éclairci)
  '2': '#a7a69c', // fer clair
  '3': '#7d7e7a', // fer
  '4': '#504b46', // fer dans l'ombre, contour côté lumière (Z tiré vers le brun-violet)
  // rouille, comme le minerai de fer
  '5': '#a65a34',
  '6': '#7a4430',
  // cuir de la poignée, dérivé du bois sombre (N K) réchauffé
  '7': '#80523a',
  '8': '#5a3627',
  // bouchon de la ligne de pêche : rouge des fleurs (c) et son ombre
  '9': '#8a3f36',
};

/** Teinte la plus sombre de chaque matière, pour le contour côté lumière. */
const dark = darkest({
  M: 'K', m: 'K', N: 'K', K: 'K', U: 'N', u: 'N', n: 'N', e: 'K',
  '1': '4', '2': '4', '3': '4', '4': '4', '5': '6', '6': '6',
  '7': '8', '8': '8', c: '9', '9': '9', a: 'E', d: 'E',
}, 'o');

/** Peint en coordonnées locales : `a` le long du manche (vers le haut à droite), `b` en travers (vers le haut à gauche). */
function local(c: Canvas, ox: number, oy: number, paint: (a: number, b: number) => string | null) {
  const r = Math.SQRT1_2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5 - ox, py = y + 0.5 - oy;
    const a = (px - py) * r, b = (-px - py) * r;
    const k = paint(a, b);
    if (k) c.set(x, y, k);
  }
}

/**
 * Manche de deux pixels en escalier sur la diagonale x + y = s (pixel de gauche) :
 * de la ligne y0 (bas) à y1 (haut). `light` à gauche, `shade` à droite.
 */
function shaft(c: Canvas, s: number, y0: number, y1: number, light: string, shade: string) {
  for (let y = y1; y <= y0; y++) c.set(s - y, y, light).set(s - y + 1, y, shade);
}

/**
 * Garde : barre de deux pixels en escalier sur l'anti-diagonale, de (x, y) vers le bas à droite, `n` pixels de long.
 * `top` sur le flanc haut-droit (éclairé), `bottom` sur le flanc bas-gauche, `end` au bout côté ombre.
 */
function crossbar(c: Canvas, x: number, y: number, n: number, top: string, bottom: string, end: string) {
  for (let k = 0; k < n; k++) c.set(x + k, y + k, bottom).set(x + k + 1, y + k, top);
  c.set(x + n, y + n - 1, end);
}

// ---------- Hache ----------

/** Hache de bûcheron : fer au tranchant évasé tourné vers le haut à gauche, talon court, manche usé. */
function axe(): Canvas {
  const c = new Canvas(S, S);
  shaft(c, 15, 14, 3, 'M', 'm');
  c.within('M', (c) => c.set(2, 13, 'm').set(3, 12, 'm')); // poignée patinée par la main
  c.set(13, 2, 'N').set(12, 2, 'm');
  // fer : axe local centré sur l'œil du manche ; étroit au collet, évasé au tranchant
  local(c, 10.5, 6, (a, b) => {
    if (b < -2.0) return null;
    const w = b < 1.2 ? 1.2 : 1.2 + (b - 1.2) * 0.75;
    if (Math.abs(a) > w) return null;
    const edge = 5.4 - 0.06 * a * a;
    if (b > edge) return null;
    if (b > edge - 1.2) return '1';
    if (b < -0.9) return '4';
    if (a < -w + 1.0) return '4';
    return b > 2.6 ? '2' : '3';
  });
  return outline(c, dark);
}

// ---------- Pioche ----------

/** Pioche : fer arqué à deux pointes, posé en travers au bout du manche. */
function pickaxe(): Canvas {
  const c = new Canvas(S, S);
  shaft(c, 15, 14, 4, 'M', 'm');
  c.within('M', (c) => c.set(2, 13, 'm').set(3, 12, 'm'));
  local(c, 11, 5, (a, b) => {
    const t = b / 6.2; // -1 .. 1 d'une pointe à l'autre
    if (Math.abs(t) > 1) return null;
    const mid = 1.6 * (1 - t * t) - 0.6; // l'arc se bombe vers le haut à droite
    const half = 1.2 * (1 - Math.abs(t) ** 1.6) + 0.15;
    const d = a - mid;
    if (Math.abs(d) > half) return null;
    if (d > half - 0.9) return Math.abs(t) > 0.75 ? '2' : '1';
    if (d < -half + 0.9 && half > 0.7) return '4';
    return '3';
  });
  return outline(c, dark);
}

// ---------- Houe ----------

/** Houe : lame plate qui pend à angle aigu au bout du manche, plus large au tranchant. */
function hoe(): Canvas {
  const c = new Canvas(S, S);
  shaft(c, 15, 14, 3, 'M', 'm');
  c.within('M', (c) => c.set(2, 13, 'm').set(3, 12, 'm'));
  // douille de fer qui coiffe le bout du manche
  c.set(13, 2, '3').set(14, 2, '4').set(13, 3, '4').set(14, 3, '4');
  // lame : trapèze vu de face, sous la douille
  c.stamp([
    '.23.',
    '.234',
    '.234',
    '2334',
    '1111',
  ], 11, 4);
  c.set(13, 5, '5').set(13, 6, '6').set(14, 6, '6'); // rouille
  return outline(c, dark);
}

// ---------- Faucille ----------

/** Faucille : court manche de bois, lame en croissant qui monte puis retombe vers la droite. */
function sickle(): Canvas {
  const c = new Canvas(S, S);
  // lame : croissant entre deux cercles
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5, py = y + 0.5;
    const outer = Math.hypot(px - 8.6, py - 8.2);
    const inner = Math.hypot(px - 9.8, py - 9.6);
    if (outer > 6.2 || inner < 4.9) continue;
    if (py > 9.6 && px < 9) continue; // le croissant s'ouvre en bas à gauche, vers le manche
    if (py > 12.5) continue;
    c.set(x, y, inner < 6.0 ? '1' : outer > 5.2 ? '3' : '2');
  }
  c.set(6, 7, '.');
  shaft(c, 15, 14, 9, 'M', 'm');
  c.set(5, 9, '4').set(6, 9, '4').set(6, 8, '4'); // virole
  return outline(c, dark);
}

// ---------- Arrosoir ----------

/** Arrosoir de fer cabossé : panse ronde à gauche, bec en diagonale vers le haut à droite, anse au-dessus. */
function wateringCan(): Canvas {
  const c = new Canvas(S, S);
  // bec : du bas de la panse vers le haut à droite, pomme au bout
  shaft(c, 19, 11, 7, '2', '3');
  c.stamp(['.12', '123', '.34'], 12, 3);
  // panse : dessus en ellipse (ouverture sombre), face avant claire à gauche, sombre à droite
  c.stamp([
    '.122223.',
    '22244233',
    '23333344',
    '21333344',
    '21333344',
    '21444344',
    '21322344',
    '21333344',
    '.665554.',
  ], 1, 6);
  const out = outline(c, dark);
  // anse en arc, tirée après le contour pour garder le jour dessous
  out.line(2, 4, 2, 4, '4').line(3, 3, 6, 3, '4').set(7, 4, '4');
  out.set(3, 2, '3').set(4, 2, '3').set(5, 2, '3').set(6, 2, '3').set(2, 3, '3').set(7, 3, '4').set(8, 4, 'o');
  return out;
}

// ---------- Canne à pêche ----------

/** Canne à pêche : perche de bois effilée, poignée entourée de ficelle, fil qui pend du bout avec son bouchon. */
function fishingRod(): Canvas {
  const c = new Canvas(S, S);
  shaft(c, 15, 14, 9, 'M', 'm');
  c.line(7, 7, 13, 1, 'm');
  c.within('Mm', (c) => c.set(2, 13, 'n').set(3, 12, 'n').set(3, 13, 'e').set(4, 12, 'e'));
  // bouchon
  c.rect(13, 8, 2, 2, 'c').set(14, 9, '9').set(13, 8, 'a');
  const out = outline(c, dark);
  // fil : sans contour, tiré après
  out.line(14, 1, 14, 7, 'd');
  return out;
}

// ---------- Épée ----------

/** Épée courte : lame de fer simple à arête claire, garde droite, poignée de cuir, pommeau rond. */
function sword(): Canvas {
  const c = new Canvas(S, S);
  // lame, pointe en haut à droite
  shaft(c, 15, 8, 2, '2', '3');
  for (let y = 3; y <= 8; y++) c.set(15 - y, y, '1');
  c.set(14, 1, '2');
  // poignée de cuir
  shaft(c, 15, 12, 9, '7', '8');
  // garde droite, en travers de la diagonale
  crossbar(c, 4, 6, 5, '2', '3', '4');
  // pommeau
  c.rect(2, 13, 2, 2, '3').set(2, 13, '2').set(3, 14, '4');
  return outline(c, dark);
}

// ---------- Épée de bois ----------

/** Épée d'entraînement : lame de bois épaisse au bout arrondi, garde clouée, poignée entourée de ficelle. */
function woodenSword(): Canvas {
  const c = new Canvas(S, S);
  for (let y = 3; y <= 9; y++) c.set(15 - y - 1, y, 'U').set(15 - y, y, 'u').set(15 - y + 1, y, 'n');
  c.set(11, 3, '.').set(13, 2, 'u').set(12, 2, 'U'); // bout arrondi
  // poignée entourée de ficelle : tours clairs et sombres
  shaft(c, 15, 13, 10, 'd', 'D');
  c.set(4, 11, 'E').set(5, 11, 'E').set(2, 13, 'E').set(3, 13, 'E');
  // garde : traverse clouée
  crossbar(c, 3, 7, 5, 'u', 'n', 'e');
  c.set(6, 9, 'e'); // clou
  return outline(c, dark);
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [
  img('item-axe', axe()),
  img('item-pickaxe', pickaxe()),
  img('item-hoe', hoe()),
  img('item-sickle', sickle()),
  img('item-watering-can', wateringCan()),
  img('item-fishing-rod', fishingRod()),
  img('item-sword', sword()),
  img('item-wooden-sword', woodenSword()),
];
