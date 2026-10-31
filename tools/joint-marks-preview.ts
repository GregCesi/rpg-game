// Aperçu des marques d'assemblage (art/world/joints.ts) : npx tsx tools/joint-marks-preview.ts → .art-preview/joint-marks.png.
// Par diamètre et par sens : la pièce de 2 m (ronde, et la poutre pour le normal), puis la même de 4 m avec la marque posée à la
// jonction comme le moteur la pose (est-ouest : colonne du milieu de la marque sur la colonne de la jonction, bas sur bas ;
// nord-sud et debout : rangée du milieu sur la rangée de la jonction, colonne 0 sur colonne 0) ; enfin la cheville
// (`joint-peg`) sur la face d'une sablière. Xéros à gauche pour l'échelle.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { sources } from '../art/index';
import type { Grid } from '../art/lib/canvas';
import { composeWood } from '../art/world/wood-pieces';
import { world } from '../art/palette';
import type { WoodPiece } from '../src/content/types';
import { Board, grassOf } from './lib/composite-previews';

const find = (name: string): Grid => {
  const s = sources.find((q) => q.name === name);
  if (!s) throw new Error(`absent : ${name}`);
  if (s.kind === 'image') return s.grid;
  if (s.kind === 'spritesheet') return s.animations['idle-down'].frames[0];
  throw new Error(name);
};
const xeros = sources.find((s) => s.name === 'xeros')!;
const xerosPal = xeros.kind === 'spritesheet' ? xeros.palette : world;
const pal = (sources.find((s) => s.name === 'wood-big') as { palette: Record<string, string> }).palette;

type Item = { grid: Grid; x: number; y: number; palette: Record<string, string> };
const rows: Item[][] = [];
const P = (size: string, axis: WoodPiece['axis'], length: number, beam = false): WoodPiece =>
  ({ size, shape: 'round', axis, length, ...(beam ? { hewn: 12 } : {}) });

function withMark(p: WoodPiece, mark: string): Item[] {
  const g = composeWood(p).toGrid();
  const m = find(mark);
  const items: Item[] = [{ grid: g, x: 0, y: 0, palette: pal }];
  if (p.axis === 'ew') {
    const jx = Math.floor(g[0].length / 2);
    items.push({ grid: m, x: jx - Math.floor(m[0].length / 2), y: g.length - m.length, palette: world });
  } else {
    // la jonction : au milieu de la longueur du bois (le corps de la pièce, sous la tête du poteau)
    const jy = Math.floor(g.length / 2);
    items.push({ grid: m, x: 0, y: jy - Math.floor(m.length / 2), palette: world });
  }
  return items;
}

for (const size of ['big', 'normal', 'pole']) {
  for (const axis of ['ew', 'ns'] as const) {
    const looks = size === 'normal' ? [false, true] : [false];
    for (const beam of looks) {
      rows.push([
        { grid: composeWood(P(size, axis, 200, beam)).toGrid(), x: 0, y: 0, palette: pal },
        ...withMark(P(size, axis, 400, beam), `joint-scarf-${size}-${axis}`).map((i) => ({ ...i, x: i.x + 60 })),
      ]);
    }
  }
}
for (const beam of [false, true]) {
  rows.push([
    { grid: composeWood(P('normal', 'up', 200, beam)).toGrid(), x: 0, y: 0, palette: pal },
    ...withMark(P('normal', 'up', 400, beam), 'joint-scarf-normal-up').map((i) => ({ ...i, x: i.x + 60 })),
  ]);
}
// la cheville sur la face d'une sablière (poutre et rond) : au droit d'un poteau
for (const beam of [false, true]) {
  const g = composeWood(P('normal', 'ew', 200, beam)).toGrid();
  rows.push([{ grid: g, x: 0, y: 0, palette: pal }, { grid: find('joint-peg'), x: 19, y: 3, palette: world }]);
}

// mise en page : Xéros à gauche de chaque rangée ns/ew groupée en colonnes
const X = find('xeros');
const gap = 4;
const blocks = rows.map((items) => ({
  items,
  w: Math.max(...items.map((i) => i.x + i.grid[0].length)),
  h: Math.max(...items.map((i) => i.y + i.grid.length)),
}));
// rangées horizontales : les est-ouest et chevilles empilées, les nord-sud et debout côte à côte
const tall = blocks.filter((b) => b.h > 30);
const flat = blocks.filter((b) => b.h <= 30);
const W = Math.max(40 + Math.max(...flat.map((b) => b.w)), 40 + tall.reduce((s, b) => s + b.w + gap, 0)) + 8;
const H = flat.reduce((s, b) => s + b.h + gap, 0) + Math.max(...tall.map((b) => b.h)) + 16;
const board = new Board(W, H, grassOf(sources));
let y = 4;
board.blit(X, xerosPal, 2, 0);
for (const b of flat) {
  for (const i of b.items) board.blit(i.grid, i.palette, 40 + i.x, y + i.y);
  y += b.h + gap;
}
y += 8;
board.blit(X, xerosPal, 2, y + 10);
let x = 40;
for (const b of tall) {
  for (const i of b.items) board.blit(i.grid, i.palette, x + i.x, y + i.y);
  x += b.w + gap;
}
mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/joint-marks.png', PNG.sync.write(board.toPng()));
console.log('.art-preview/joint-marks.png', W, H);

// zoom : chaque jonction marquée, fenêtre de 31 × 31 px autour, agrandie (x4 × 3)
const zooms: { items: Item[]; cx: number; cy: number }[] = [];
for (const b of blocks) {
  if (b.items.length < 2) continue;
  const m = b.items[b.items.length - 1];
  zooms.push({ items: b.items, cx: m.x + Math.floor(m.grid[0].length / 2), cy: m.y + Math.floor(m.grid.length / 2) });
}
const Z = 31;
const PER = 4;
const zb = new Board((Z + 2) * PER, (Z + 2) * Math.ceil(zooms.length / PER), grassOf(sources));
zooms.forEach((z, k) => {
  const cell = new Board(Z, Z, grassOf(sources));
  for (const i of z.items.slice(-2)) cell.blit(i.grid, i.palette, i.x - z.cx + 15, i.y - z.cy + 15);
  zb.paste(cell, (k % PER) * (Z + 2), Math.floor(k / PER) * (Z + 2));
});
const K = 2;
const small = zb.toPng();
const big = new PNG({ width: small.width * K, height: small.height * K });
for (let yy = 0; yy < big.height; yy++) for (let xx = 0; xx < big.width; xx++) {
  const s = (Math.floor(yy / K) * small.width + Math.floor(xx / K)) * 4;
  big.data.set(small.data.subarray(s, s + 4), (yy * big.width + xx) * 4);
}
writeFileSync('.art-preview/joint-marks-zoom.png', PNG.sync.write(big));
