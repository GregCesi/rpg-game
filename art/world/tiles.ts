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
  for (let i = 0; i < 70; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.55 ? 'v' : 'G');
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(r() * (T - 2));
    const y = 2 + Math.floor(r() * (T - 3));
    c.set(x, y, 'v');
    c.set(x, y - 1, 'v');
    c.set(x + 1, y - 2, r() < 0.3 ? 'y' : 'G');
  }
  return c;
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

function path(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'u');
  for (let i = 0; i < 90; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'n' : 'U');
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * (T - 2));
    const y = Math.floor(r() * (T - 2));
    c.rect(x, y, 2, 2, 'r').set(x, y, 'R').set(x + 1, y + 1, 'z');
  }
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

function water(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'w');
  for (let i = 0; i < 30; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), 'q');
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(r() * (T - 5));
    const y = Math.floor(r() * T);
    c.rect(x, y, 3 + Math.floor(r() * 3), 1, 'W');
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
  flowers: flowers(10).toGrid(),
  flowers2: flowers(11).toGrid(),
  path: path(20).toGrid(),
  path2: path(21).toGrid(),
  field: field(30).toGrid(),
  water: water(40).toGrid(),
  water2: water(41).toGrid(),
};
for (let m = 0; m < 16; m++) tiles[`fence-${m}`] = fence(m).toGrid();

const tileset: TilesetSource = {
  kind: 'tileset',
  name: 'world',
  tileSize: T,
  palette: world,
  tiles,
};

export default tileset;
