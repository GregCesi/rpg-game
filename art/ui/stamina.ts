// Jauge d'endurance (la fatigue de la journée), posée par le HUD à côté des deux cases de main, verticale.
//
// Quatre images fixes :
// - `ui-stamina-frame` : 12 × 42 px, cadre de bois de la même facture que `ui-slot` (contour, biseau clair en haut
//   et à gauche, sombre en bas et à droite, liseré de creux N), creux transparent.
// - `ui-stamina-fill` : 6 × 36 px, le remplissage vert (feuillage j L l).
// - `ui-stamina-fill-low` : 6 × 36 px, le même en rouge brique (sous 15 % : fatigué).
// - `ui-stamina-back` : 6 × 36 px, le fond du creux (bois sombre N K, comme le creux de `ui-gauge`), à poser sous le
//   remplissage, dans le creux : sans lui, la part vide laisse voir l'herbe, sur laquelle le vert se perd.
//
// Intérieur du cadre (où se pose le remplissage) : x = 3, y = 3, w = 6, h = 36.
// Le HUD rogne le remplissage par le haut : le bas reste plein. Le motif ne dépend pas de la hauteur totale : colonnes
// éclairées à gauche, sombres à droite, et un liseré clair toutes les 6 rangées (la rangée 0 en est une).

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

const palette = {
  ...world,
  // rouge des baies (art/world/rocks-bushes.ts) : éclairé, franc, d'ombre
  '6': '#d27a52',
  '7': '#a8453a',
  '8': '#74303a',
};

export const STAMINA_FRAME = { w: 12, h: 42 };
export const STAMINA_INNER = { x: 3, y: 3, w: 6, h: 36 };

/** Cadre : même construction que `slot` (dialog.ts), étirée en hauteur, creux vide. */
function frame(): Canvas {
  const { w, h } = STAMINA_FRAME;
  const c = new Canvas(w, h, 'o');
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) c.set(x, y, '.');
  c.rect(1, 1, w - 2, h - 2, 'm');
  c.rect(1, 1, w - 2, 1, 'M').rect(1, 1, 1, h - 2, 'M');
  c.rect(1, h - 2, w - 2, 1, 'N').rect(w - 2, 1, 1, h - 2, 'N');
  // creux : bord sombre en haut et à gauche (ombre du cadre), le bois moyen en bas et à droite
  c.rect(2, 2, w - 4, h - 4, 'N');
  c.rect(3, 3, w - 5, h - 5, 'm');
  const { x, y, w: iw, h: ih } = STAMINA_INNER;
  c.rect(x, y, iw, ih, '.');
  return c;
}

/** Pas des liserés clairs du remplissage. */
const BAND = 6;

/** Remplissage : [éclairé, franc, ombre] ; colonne de gauche éclairée, deux de droite à l'ombre, liseré toutes les 6 rangées. */
function fill([light, mid, dark]: [string, string, string]): Canvas {
  const { w, h } = STAMINA_INNER;
  const c = new Canvas(w, h, mid);
  c.rect(0, 0, 1, h, light);
  c.rect(w - 2, 0, 2, h, dark);
  for (let y = 0; y < h; y += BAND) c.rect(0, y, w - 1, 1, light);
  return c;
}

/** Fond du creux : ombre du cadre en haut (K), bois sombre (N) dessous. */
function back(): Canvas {
  const { w, h } = STAMINA_INNER;
  return new Canvas(w, h, 'K').rect(0, 1, w, h - 1, 'N').rect(0, 1, 1, h - 1, 'K');
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [img('ui-stamina-frame', frame()), img('ui-stamina-back', back()), img('ui-stamina-fill', fill(['j', 'L', 'l'])), img('ui-stamina-fill-low', fill(['6', '7', '8']))];
