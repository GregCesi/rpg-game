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

/** Seau en bois cerclé de fer, à moitié plein. */
function bucket(): Canvas {
  const c = new Canvas(32, 32);
  // anse
  for (let a = 0; a <= 20; a++) {
    const t = Math.PI + (a / 20) * Math.PI;
    c.set(Math.round(16 + Math.cos(t) * 8.5), Math.round(15 + Math.sin(t) * 8), 'z');
  }
  // corps : douelles
  c.polygon([[7.5, 15], [24.5, 15], [23, 28], [9, 28]], 'm');
  c.within('m', (c) => {
    for (const x of [11, 14, 17, 20]) c.line(x, 15, x - (x - 16) * 0.12, 28, 'N');
    c.polygon([[7.5, 15], [10, 15], [10.5, 28], [9, 28]], 'M');
    c.polygon([[22, 15], [24.5, 15], [23, 28], [21.5, 28]], 'N');
    // cerclages de fer
    c.rect(0, 18, 32, 1, 'r').rect(0, 25, 32, 1, 'r');
    c.rect(0, 19, 32, 1, 'z').rect(0, 26, 32, 1, 'z');
  });
  // ouverture : bord en bois et eau
  c.ellipse(16, 15, 8.5, 2.6, 'M');
  c.ellipse(16, 15.3, 7, 1.8, 'w');
  c.set(13, 15, 'W').set(14, 15, 'W');
  c.outline('o');
  groundShadow(c, 16, 28.5, 10, 2);
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('big-tree', standingTree()), img('bucket', bucket())];
