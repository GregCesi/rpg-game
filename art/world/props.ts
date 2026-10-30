// Objets posés sur la carte (arbre, seau ; rochers et buissons dans rocks-bushes.ts). Chaque image a son point d'ancrage en bas au centre.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { standingTree } from './big-tree';

/** Ombre portée : ne remplit que les pixels encore vides. */
function groundShadow(c: Canvas, cx: number, cy: number, rx: number, ry: number) {
  const s = new Canvas(c.w, c.h).ellipse(cx, cy, rx, ry, 'x');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (s.get(x, y) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  }
}

/**
 * Seau en bois cerclé de fer, à moitié plein d'eau. Gabarit : cylindre debout de Ø 30 cm, 30 cm de haut, soit 6 × 9 px
 * contour compris (corps 6 rangées, ouverture en ovale 6 × 3), plus l'anse en arceau qui dépasse de deux rangées
 * (10 cm) : 6 × 11. Dessiné à la taille exacte, pixel par pixel (à cette taille, une primitive arrondie ne tombe
 * jamais juste). Image 32 × 32 gardée (même ancrage sur les cartes) : le seau occupe les colonnes 13 à 18, du rang 18 (anse) au rang 28 (fond).
 * Contour : K (bois le plus sombre) en haut et à gauche, `o` en bas et à droite ; l'anse est un fil de fer (z).
 */
const BUCKET = [
  '..zz..', // anse : un fil de fer en arceau, accroché aux deux oreilles
  '.z..z.',
  'zKKKKz', // bord arrière de l'ouverture
  'KWwwwo', // l'eau (reflet à gauche, vers la lumière)
  'KMMMNo', // bord avant de l'ouverture
  'KrrzZo', // cercle de fer
  'KMmmNo', // douelles
  'KMmNNo',
  'KrrzZo', // cercle de fer
  'KMmNNo',
  '.oooo.', // fond
];

function bucket(): Canvas {
  const c = new Canvas(32, 32);
  c.stamp(BUCKET, 13, 18);
  groundShadow(c, 17, 29, 4, 1.2);
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('big-tree', standingTree()), img('bucket', bucket())];
