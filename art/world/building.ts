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

// ---------- Sablières ----------

/** Bois équarri d'un dessus, tourné vers la lumière : un cran plus clair que la face (t -> Y, T -> t), écorce gardée. */
const LIGHTER: Record<string, string> = { t: 'Y', T: 't' };
const topTone = (along: number, wane?: 'lit' | 'shade') => {
  const k = hewnTone(along, 0, 1, wane);
  return LIGHTER[k] ?? k;
};

/**
 * Sablière est-ouest (`shed-plate-north`, `shed-plate-south`), boîte de 320 × 15 × 15 cm : silhouette 64 × 5 px collée en
 * haut de l'image, `below` rangées vides dessous (la hauteur qui la sépare du sol, bas de l'image au sol). Rangée 0 : le
 * contour du haut (N) ; rangée 1 : le dessus, bois clair (Y, fil en t) ; rangées 2 et 3 : la face sud (t, fil en T),
 * l'écorce de l'arête du haut par endroits ; rangée 4 : le contour du bas. Contour gauche N, droit OUTLINE ; aux bouts, rien
 * (ils sont sur les poteaux). `phase` : une autre pièce du même bois.
 */
function shedPlateEW(below: number, phase: number): Canvas {
  const W = 64;
  const c = new Canvas(W, 5 + below);
  for (let x = 0; x < W; x++) {
    const a = x + phase;
    const edge = x === 0 ? 'N' : x === W - 1 ? 'o' : null;
    c.set(x, 0, x === W - 1 ? 'o' : 'N');
    c.set(x, 1, edge ?? topTone(a));
    c.set(x, 2, edge ?? hewnTone(a + 17, 0, 1, 'lit'));
    c.set(x, 3, edge ?? hewnTone(a + 41, 0, 1));
    c.set(x, 4, 'o');
  }
  return c;
}

/**
 * Sablière de côté (`shed-plate-side`), nord-sud, en pente de la tête d'un poteau haut à celle d'un poteau bas : pièce
 * `ground`, silhouette 3 × 75 px (3 de large ; 64 de long au sol plus 11 d'épaisseur et de pente), puis 38 rangées
 * vides. Rangée 0 : le contour du haut ; rangées 1 à 70 : le dessus, une bande de bois clair (fil vertical, flache par
 * endroits) entre le contour gauche N et OUTLINE ; rangée 71 : l'arête du bout ; rangées 72 et 73 : la face de coupe
 * au sud (bois de bout, Y sur t, comme le dessus des poteaux) ; rangée 74 : le contour du bas.
 */
function shedPlateSide(): Canvas {
  const sil = 75;
  const c = new Canvas(3, sil + 38);
  c.set(0, 0, 'N').set(1, 0, 'N').set(2, 0, 'o');
  for (let y = 1; y < sil - 4; y++) c.set(0, y, 'N').set(1, y, topTone(y + 5, 'lit')).set(2, y, 'o');
  c.set(0, sil - 4, 'N').set(1, sil - 4, 'T').set(2, sil - 4, 'o');
  c.set(0, sil - 3, 'N').set(1, sil - 3, 'Y').set(2, sil - 3, 'o');
  c.set(0, sil - 2, 'N').set(1, sil - 2, 't').set(2, sil - 2, 'o');
  for (let x = 0; x < 3; x++) c.set(x, sil - 1, 'o');
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [
  img('footing-stone', footingStone()),
  img('shed-post-high', shedPost(44, 12)),
  img('shed-post-low', shedPost(36, 30)),
  img('shed-plate-north', shedPlateEW(46, 0)),
  img('shed-plate-south', shedPlateEW(39, 23)),
  img('shed-plate-side', shedPlateSide()),
];
