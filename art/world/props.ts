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
 * Seau en bois cerclé de fer. Gabarit : cylindre debout de Ø 30 cm, 30 cm de haut, soit 6 × 9 px
 * contour compris (corps 6 rangées, ouverture en ovale 6 × 3), plus l'anse en arceau qui dépasse de deux rangées
 * (10 cm) : 6 × 11. Dessiné à la taille exacte, pixel par pixel (à cette taille, une primitive arrondie ne tombe
 * jamais juste). Image 32 × 32 gardée (même ancrage sur les cartes) : le seau occupe les colonnes 13 à 18, du rang 18 (anse) au rang 28 (fond).
 * Contour : K (bois le plus sombre) en haut et à gauche, `o` en bas et à droite ; l'anse est un fil de fer (z).
 * Vide (`bucket`), on voit le fond de l'ouverture : la paroi gauche dans l'ombre du bord, la droite qui prend le jour.
 * Plein (`bucket-water`, art/items/earth.ts), l'eau affleure sous le bord, un reflet de ciel à gauche, vers la lumière.
 */
export const BUCKET = [
  '..zz..', // anse : un fil de fer en arceau, accroché aux deux oreilles
  '.z..z.',
  'zKKKKz', // bord arrière de l'ouverture
  'KKKNmo', // le dedans, vide (plein : l'eau, BUCKET_WATER)
  'KMMMNo', // bord avant de l'ouverture
  'KrrzZo', // cercle de fer
  'KMmmNo', // douelles
  'KMmNNo',
  'KrrzZo', // cercle de fer
  'KMmNNo',
  '.oooo.', // fond
];
/** La rangée du dedans quand le seau est plein : l'eau sous le bord, le reflet à gauche. */
export const BUCKET_WATER = 'KWWwqo';

/** Le seau sur la carte, vide ou plein (`full`). */
export function bucket(full = false): Canvas {
  const c = new Canvas(32, 32);
  c.stamp(full ? BUCKET.map((r, i) => (i === 3 ? BUCKET_WATER : r)) : BUCKET, 13, 18);
  groundShadow(c, 17, 29, 4, 1.2);
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('big-tree', standingTree()), img('bucket', bucket())];
