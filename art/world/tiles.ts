// Tuiles 32x32 du monde, générées par code avec une graine fixe : le rendu est stable d'un build à l'autre.
// Les clôtures existent en 16 variantes (une par combinaison de voisins N/E/S/O) : la carte n'écrit que 'F',
// le chargeur de carte choisit la bonne variante.

import { Canvas, rng } from '../lib/canvas';
import type { TilesetSource } from '../lib/types';
import { world } from '../palette';

const T = 32;

function grass(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'g');
  for (let i = 0; i < 22; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'v' : 'G');
  // touffes : trois brins, pointes claires, ombre au pied
  const tufts = 2 + Math.floor(r() * 3);
  for (let i = 0; i < tufts; i++) {
    const x = 2 + Math.floor(r() * (T - 4));
    const y = 3 + Math.floor(r() * (T - 5));
    c.set(x - 1, y + 1, 'V').set(x, y + 1, 'V').set(x + 1, y + 1, 'V');
    c.set(x - 1, y, 'G').set(x - 1, y - 1, 'y');
    c.set(x, y, 'G').set(x, y - 1, 'G').set(x, y - 2, 'y');
    c.set(x + 1, y, 'G').set(x + 1, y - 1, 'y');
  }
  return c;
}

/**
 * Bord irrégulier : profondeur (en px) d'une bordure le long d'un côté, qui ondule.
 * Périodique sur 32 px : deux tuiles voisines se raccordent sans marche.
 */
function edgeDepth(i: number, phase: number, base: number): number {
  const a = (i / T) * Math.PI * 2;
  return base + Math.round(Math.sin(a * 2 + phase) * 1.2 + Math.sin(a * 5 + phase * 3) * 0.8);
}

/**
 * Pose une bordure d'herbe sur les côtés où la tuile n'a pas de voisin identique.
 * mask : N=1, E=2, S=4, O=8 (bit à 1 = voisin identique de ce côté).
 */
function grassBorder(c: Canvas, mask: number, seed: number, rim: string, base = 3) {
  const g = grass(seed + 500);
  const sides: [number, (i: number, d: number) => [number, number]][] = [
    [1, (i, d) => [i, d]],
    [2, (i, d) => [T - 1 - d, i]],
    [4, (i, d) => [i, T - 1 - d]],
    [8, (i, d) => [d, i]],
  ];
  for (const [bit, at] of sides) {
    if (mask & bit) continue;
    for (let i = 0; i < T; i++) {
      const depth = edgeDepth(i, bit, base);
      for (let d = 0; d < depth; d++) {
        const [x, y] = at(i, d);
        c.set(x, y, g.get(x, y));
      }
      const [x, y] = at(i, depth);
      c.set(x, y, rim);
    }
  }
}

function flowers(seed: number): Canvas {
  const r = rng(seed);
  const c = grass(seed + 1);
  for (let i = 0; i < 5; i++) {
    const x = 3 + Math.floor(r() * (T - 6));
    const y = 3 + Math.floor(r() * (T - 6));
    const petal = r() < 0.5 ? 'a' : 'c';
    c.set(x - 1, y, petal).set(x + 1, y, petal).set(x, y - 1, petal).set(x, y + 1, petal);
    c.set(x, y, 'b');
    c.set(x, y + 2, 'v');
  }
  return c;
}

function path(seed: number, mask = 15): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'u');
  for (let i = 0; i < 45; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'n' : 'U');
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(r() * (T - 2));
    const y = Math.floor(r() * (T - 2));
    c.set(x, y, 'R').set(x + 1, y, 'r').set(x, y + 1, 'z').set(x + 1, y + 1, 'e');
  }
  grassBorder(c, mask, seed, 'e');
  return c;
}

function field(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'f');
  for (let y = 0; y < T; y++) {
    const band = y % 8;
    if (band < 2) c.rect(0, y, T, 1, 'F');
    else if (band === 7) c.rect(0, y, T, 1, 'N');
  }
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'n' : 'F');
  return c;
}

function water(seed: number, mask = 15): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'w');
  for (let i = 0; i < 20; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), 'q');
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * (T - 5));
    const y = Math.floor(r() * T);
    c.rect(x, y, 3 + Math.floor(r() * 3), 1, 'W');
  }
  // berge : un liseré de terre, puis l'eau plus sombre au pied de la berge
  const bank = new Canvas(T, T, '.');
  grassBorder(bank, mask, seed, 'n', 3);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const b = bank.get(x, y);
    if (b === '.') continue;
    c.set(x, y, b);
  }
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (c.get(x, y) !== 'n') continue;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const n = c.get(x + dx, y + dy);
      if (n === 'w' || n === 'W' || n === 'q') c.set(x + dx, y + dy, 'q');
    }
  }
  return c;
}

// Masque de voisinage : N=1, E=2, S=4, O=8.
function fence(mask: number): Canvas {
  const c = grass(900 + mask);
  const cx = 16;
  // rails horizontaux (deux traverses)
  const hRail = (x0: number, x1: number) => {
    for (const y0 of [11, 19]) {
      c.rect(x0, y0, x1 - x0, 1, 'o');
      c.rect(x0, y0 + 1, x1 - x0, 2, 'M');
      c.rect(x0, y0 + 3, x1 - x0, 1, 'm');
      c.rect(x0, y0 + 4, x1 - x0, 1, 'o');
      c.rect(x0, y0 + 5, x1 - x0, 1, 'v');
    }
  };
  // rail vertical
  const vRail = (y0: number, y1: number) => {
    c.rect(cx - 2, y0, 1, y1 - y0, 'o');
    c.rect(cx - 1, y0, 1, y1 - y0, 'M');
    c.rect(cx, y0, 1, y1 - y0, 'm');
    c.rect(cx + 1, y0, 1, y1 - y0, 'o');
    c.rect(cx + 2, y0, 1, y1 - y0, 'v');
  };
  if (mask & 8) hRail(0, cx);
  if (mask & 2) hRail(cx, T);
  if (mask & 1) vRail(0, cx);
  if (mask & 4) vRail(cx, T);
  // poteau
  c.rect(cx - 4, 7, 8, 21, 'o');
  c.rect(cx - 3, 8, 6, 19, 'm');
  c.rect(cx - 3, 8, 2, 19, 'M');
  c.rect(cx + 2, 8, 1, 19, 'N');
  c.rect(cx - 3, 8, 6, 2, 'M');
  c.rect(cx - 4, 28, 8, 1, 'v');
  return c;
}

const tiles: TilesetSource['tiles'] = {
  grass: grass(1).toGrid(),
  grass2: grass(2).toGrid(),
  grass3: grass(3).toGrid(),
  grass4: grass(4).toGrid(),
  grass5: grass(5).toGrid(),
  grass6: grass(6).toGrid(),
  flowers: flowers(10).toGrid(),
  flowers2: flowers(11).toGrid(),
  field: field(30).toGrid(),
};
for (let m = 0; m < 16; m++) {
  tiles[`fence-${m}`] = fence(m).toGrid();
  tiles[`path-${m}`] = path(20 + m, m).toGrid();
  tiles[`water-${m}`] = water(40 + m, m).toGrid();
}

const tileset: TilesetSource = {
  kind: 'tileset',
  name: 'world',
  tileSize: T,
  palette: world,
  tiles,
};

export default tileset;
