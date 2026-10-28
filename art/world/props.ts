// Objets posés sur la carte (arbres, rochers, buissons). Chaque image a son point d'ancrage en bas au centre.

import { Canvas, rng, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

/** Ombre portée : ne remplit que les pixels encore vides. */
function groundShadow(c: Canvas, cx: number, cy: number, rx: number, ry: number) {
  const s = new Canvas(c.w, c.h).ellipse(cx, cy, rx, ry, 'x');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (s.get(x, y) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  }
}

/** Masse de feuillage : grappes sombres en bas à droite, claires en haut à gauche. */
function foliage(c: Canvas, cx: number, cy: number, rx: number, ry: number, seed: number, blob: number) {
  const r = rng(seed);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    c.ellipse(cx + Math.cos(a) * rx * 0.8, cy + Math.sin(a) * ry * 0.8, blob, blob * 0.85, 'l');
  }
  c.ellipse(cx, cy, rx * 0.85, ry * 0.85, 'l');
  const clusters: { x: number; y: number; shade: string }[] = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.8;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const v = (x - cx) * 0.5 + (y - cy);
    clusters.push({ x, y, shade: v > ry * 0.35 ? 'k' : v < -ry * 0.3 ? 'j' : 'L' });
  }
  const order = ['k', 'L', 'j'];
  clusters.sort((p, q) => order.indexOf(p.shade) - order.indexOf(q.shade));
  for (const { x, y, shade } of clusters) {
    const size = shade === 'j' ? blob * 0.45 : blob * 0.6;
    c.ellipse(x, y, size, size * 0.8, shade);
  }
}

function tree(seed: number): Canvas {
  const c = new Canvas(64, 96);
  // tronc
  c.rect(27, 62, 10, 26, 'm');
  c.rect(28, 62, 2, 26, 'M');
  c.rect(35, 62, 2, 26, 'N');
  c.rect(24, 85, 16, 3, 'm');
  c.rect(25, 85, 3, 3, 'M');
  foliage(c, 32, 39, 24, 24, seed, 9);
  c.outline('o');
  groundShadow(c, 32, 89, 17, 4);
  return c;
}

function rock(): Canvas {
  const c = new Canvas(32, 32);
  c.ellipse(16, 21, 11, 8, 'r');
  c.ellipse(18, 24, 9, 5, 'z');
  c.ellipse(16, 21, 9, 6, 'r');
  c.ellipse(13, 18, 5, 3, 'R');
  c.set(20, 20, 'z').set(21, 21, 'z');
  c.outline('o');
  groundShadow(c, 16, 29, 11, 2.5);
  return c;
}

function bush(seed: number): Canvas {
  const c = new Canvas(32, 32);
  foliage(c, 16, 18, 10, 8, seed, 5);
  c.outline('o');
  groundShadow(c, 16, 28, 11, 2.5);
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [img('tree', tree(7)), img('rock', rock()), img('bush', bush(3))];
