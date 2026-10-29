// Planche .art-preview/collection.png : les images de art/collection.ts groupées par lot, posées sur leur sol,
// avec Xéros à côté de chaque groupe pour l'échelle. Les icônes y figurent à leur taille puis agrandies ×2.

import { PNG } from 'pngjs';
import { families } from '../../art/collection';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource } from '../../art/lib/types';

const SCALE = 2;
const WIDTH = 360; // largeur d'un groupe, en pixels du jeu
const GAP = 8;

interface Img { frames: Grid[]; palette: Palette }

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}

export function buildCollectionBoard(sources: ArtSource[]): PNG {
  const images = new Map<string, Img>();
  const tiles = new Map<string, { grid: Grid; palette: Palette }>();
  for (const s of sources) {
    if (s.kind === 'image') images.set(s.name, { frames: [s.grid], palette: s.palette });
    else if (s.kind === 'spritesheet') {
      const first = Object.values(s.animations)[0];
      images.set(s.name, { frames: first.frames, palette: s.palette });
    } else if (s.tileSize === 32) {
      for (const [n, g] of Object.entries(s.tiles)) tiles.set(`${s.name}/${n}`, { grid: g, palette: s.palette });
    }
  }
  const xeros = images.get('xeros')!;

  // chaque groupe : liste de pièces {image, échelle}, posées de gauche à droite avec retour à la ligne
  type Piece = { grid: Grid; palette: Palette; k: number };
  const groups = families.map((f) => {
    const pieces: Piece[] = [{ grid: xeros.frames[0], palette: xeros.palette, k: 1 }];
    for (const key of f.keys) {
      const img = images.get(key);
      if (!img) continue;
      const frames = f.allFrames?.includes(key) ? img.frames : [img.frames[0]];
      for (const g of frames) pieces.push({ grid: g, palette: img.palette, k: 1 });
    }
    for (const key of f.icons ?? []) {
      const img = images.get(key);
      if (img) pieces.push({ grid: img.frames[0], palette: img.palette, k: 1 }, { grid: img.frames[0], palette: img.palette, k: 2 });
    }
    // retour à la ligne
    const rows: { piece: Piece; x: number }[][] = [[]];
    let x = GAP;
    for (const p of pieces) {
      const w = p.grid[0].length * p.k;
      if (x + w + GAP > WIDTH) { rows.push([]); x = GAP; }
      rows[rows.length - 1].push({ piece: p, x });
      x += w + GAP;
    }
    const heights = rows.map((r) => Math.max(...r.map((c) => c.piece.grid.length * c.piece.k)) + GAP);
    return { f, rows, heights, height: heights.reduce((a, b) => a + b, GAP) };
  });

  const totalH = groups.reduce((a, g) => a + g.height + 4, 0);
  const png = new PNG({ width: WIDTH * SCALE, height: totalH * SCALE });
  png.data.fill(0);
  const put = (px: number, py: number, rgba: [number, number, number, number]) => {
    for (let dy = 0; dy < SCALE; dy++) for (let dx = 0; dx < SCALE; dx++) {
      const X = px * SCALE + dx;
      const Y = py * SCALE + dy;
      if (X < 0 || Y < 0 || X >= png.width || Y >= png.height) continue;
      const i = (Y * png.width + X) * 4;
      const a = rgba[3] / 255;
      for (let c = 0; c < 3; c++) png.data[i + c] = Math.round(rgba[c] * a + png.data[i + c] * (1 - a));
      png.data[i + 3] = 255;
    }
  };

  let oy = 0;
  for (const g of groups) {
    const groundTile = tiles.get(g.f.ground === 'grass' ? 'world/grass' : 'interior/floor');
    for (let y = 0; y < g.height; y++) for (let x = 0; x < WIDTH; x++) {
      if (groundTile) {
        const ch = groundTile.grid[y % 32][x % 32];
        put(x, oy + y, hexToRgba(groundTile.palette[ch]));
      } else put(x, oy + y, [120, 110, 80, 255]);
    }
    let ry = oy + GAP;
    g.rows.forEach((row, i) => {
      const base = ry + g.heights[i] - GAP; // pieds posés sur cette ligne
      for (const { piece, x } of row) {
        const h = piece.grid.length * piece.k;
        piece.grid.forEach((line, y) => [...line].forEach((ch, xx) => {
          if (ch === '.') return;
          const rgba = hexToRgba(piece.palette[ch]);
          for (let dy = 0; dy < piece.k; dy++) for (let dx = 0; dx < piece.k; dx++) put(x + xx * piece.k + dx, base - h + y * piece.k + dy, rgba);
        }));
      }
      ry += g.heights[i];
    });
    // séparateur
    for (let x = 0; x < WIDTH; x++) put(x, oy + g.height, [30, 20, 15, 255]);
    oy += g.height + 4;
  }
  return png;
}
