// Pièces de bâtiment : dés, poteaux, sablières, chevrons, couvertures ; l'abri à bois d'abord.
// Chaque pièce suit le gabarit (docs/STYLE.md, section 8) ; sa silhouette est collée en haut à gauche de l'image
// (x = 0, y = 0), l'ombre portée `x` en dessous et à droite, hors silhouette.
// Lumière nord-ouest ; contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas
// et à droite.

import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { hewnTone } from './wood';

const palette = { ...world };

// ---------- Dé de pierre ----------

/**
 * Dé de pierre (`footing-stone`), boîte de 30 × 30 × 15 cm : silhouette 6 × 6 px, dessus en 3 rangées (contour du
 * haut et deux rangées de pierre claire R r, où se pose le pied du poteau), face sud en 3 rangées (z Z, puis le
 * contour du bas). Coin nord-est émoussé. Ombre portée sous la base, décalée à droite.
 */
function footingStone(): Canvas {
  return Canvas.from([
    'ZZZZZ..',
    'ZRRRro.',
    'ZRRrro.',
    'ZzzzZox',
    'ZzzZZox',
    'oooooox',
    '.xxxxxx',
  ]);
}

// ---------- Poteaux ----------

/** Rangées vides sous un poteau, dans son image : la hauteur du dé (15 cm) sur lequel il se dresse. */
const FOOTING_ROWS = 3;

/**
 * Poteau équarri de 15 × 15 cm (`shed-post-high`, `shed-post-low`), boîte debout : silhouette 3 × `sil` px, à la
 * taille réelle (sans plancher de lisibilité). Rangée 0 : le contour du haut ; rangée 1 : le dessus, bois de bout
 * éclairé (Y) ; puis la face sud, une colonne de bois équarri (fil vertical, plaques d'écorce par endroits, `phase`
 * pour que deux poteaux diffèrent) entre le contour gauche (N, la teinte la plus sombre du bois de coupe) et OUTLINE à
 * droite ; dernière rangée : le contour du bas, le pied, posé sur la rangée du haut du dé. Sous lui, FOOTING_ROWS
 * rangées vides. Pas d'ombre portée : le dé la porte.
 */
function shedPost(sil: number, phase: number): Canvas {
  const c = new Canvas(3, sil + FOOTING_ROWS);
  c.set(0, 0, 'N').set(1, 0, 'N').set(2, 0, 'o');
  c.set(0, 1, 'N').set(1, 1, 'Y').set(2, 1, 'o');
  for (let y = 2; y < sil - 1; y++) c.set(0, y, 'N').set(1, y, hewnTone(y + phase, 0, 1, 'lit')).set(2, y, 'o');
  for (let x = 0; x < 3; x++) c.set(x, sil - 1, 'o');
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [
  img('footing-stone', footingStone()),
  img('shed-post-high', shedPost(44, 12)),
  img('shed-post-low', shedPost(36, 30)),
];
