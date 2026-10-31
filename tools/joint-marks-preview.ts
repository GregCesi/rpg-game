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

// Le mi-bois (`joint-halving-normal-<aspect>-<dessus>-<masque>`) : .art-preview/joint-halving.png, x4. Par aspect et par
// dessus, une rangée : les quatre angles d'une maison (sud-ouest 3, nord-ouest 6, nord-est 12, sud-est 9), une croix (15) et un
// T (7), composés comme le moteur les pose (buildView : chaque pièce de 2 m centrée sur son emprise, bas de l'image au bord sud ;
// puis le croisement, colonne 0 sur celle de la nord-sud, rangée 0 sur celle de l'est-ouest). Xéros à gauche ; en dessous,
// les mêmes sans le croisement, pour voir ce qu'il recouvre.
{
  const CM = 5;
  const HALVING_SHOWN = [3, 6, 12, 9, 15, 7];
  type Placed = { grid: Grid; x: number; y: number; bottom: number };
  // une pièce de bois posée comme buildView : emprise en cm (x, y, largeur, profondeur)
  const place = (p: WoodPiece, bx: number, by: number, bw: number, bd: number): Placed => {
    const g = composeWood(p).toGrid();
    const x = Math.round((bx + bw / 2) / CM - g[0].length / 2);
    const bottom = Math.round((by + bd) / CM);
    return { grid: g, x, y: bottom - g.length, bottom };
  };
  const L = 200;
  const D = 30;
  /** Les deux pièces et le croisement d'un masque ; la nord-sud d'emprise x 0..30, l'est-ouest d'emprise y 0..30 (cm). */
  const scene = (beam: boolean, top: 'ew' | 'ns', mask: number, overlay: boolean): Item[] => {
    const N = mask & 1, E = mask & 2, S = mask & 4, W = mask & 8;
    const ex = W && E ? -85 : W ? D - L : 0;
    const ny = N && S ? -85 : N ? D - L : 0;
    const ew = place(P('normal', 'ew', L, beam), ex, 0, L, D);
    const ns = place(P('normal', 'ns', L, beam), 0, ny, D, L);
    // la profondeur : la plus au sud devant (à égalité, la nord-sud)
    const order = ew.bottom > ns.bottom ? [ns, ew] : [ew, ns];
    const items: Item[] = order.map((q) => ({ grid: q.grid, x: q.x, y: q.y, palette: pal }));
    if (overlay) {
      const key = `joint-halving-normal-${beam ? 'beam' : 'round'}-${top}-${mask}`;
      items.push({ grid: find(key), x: ns.x, y: ew.y, palette: world });
    }
    return items;
  };
  const CELL_W = 2 * L / CM + 8;
  const CELL_H = 2 * L / CM + 8;
  const rowsSpec: { beam: boolean; top: 'ew' | 'ns' }[] = [];
  for (const beam of [false, true]) for (const top of ['ew', 'ns'] as const) rowsSpec.push({ beam, top });
  const W0 = 40;
  const BW = W0 + HALVING_SHOWN.length * CELL_W + 4;
  const BH = rowsSpec.length * CELL_H + 8;
  const make = (overlay: boolean) => {
    const b = new Board(BW, BH, grassOf(sources));
    rowsSpec.forEach((r, k) => {
      const oy = 4 + k * CELL_H;
      b.blit(X, xerosPal, 2, oy + 20);
      HALVING_SHOWN.forEach((mask, i) => {
        const items = scene(r.beam, r.top, mask, overlay);
        const minX = Math.min(...items.map((q) => q.x));
        const minY = Math.min(...items.map((q) => q.y));
        for (const q of items) b.blit(q.grid, q.palette, W0 + i * CELL_W + (q.x - minX), oy + (q.y - minY));
      });
    });
    return b.toPng();
  };
  const up = (small: PNG, k: number) => {
    const big = new PNG({ width: small.width * k, height: small.height * k });
    for (let yy = 0; yy < big.height; yy++) for (let xx = 0; xx < big.width; xx++) {
      const s = (Math.floor(yy / k) * small.width + Math.floor(xx / k)) * 4;
      big.data.set(small.data.subarray(s, s + 4), (yy * big.width + xx) * 4);
    }
    return big;
  };
  writeFileSync('.art-preview/joint-halving.png', PNG.sync.write(up(make(true), 4)));
  // zoom, par aspect et dessus : une fenêtre de 26 × 26 px autour de chaque croisement, avec (en haut) puis sans lui, x8
  const Z = 26;
  for (const r of rowsSpec) {
    const zb = new Board((Z + 2) * HALVING_SHOWN.length, (Z + 2) * 2, grassOf(sources));
    HALVING_SHOWN.forEach((mask, i) => [true, false].forEach((ov, o) => {
      const items = scene(r.beam, r.top, mask, ov);
      const cell = new Board(Z, Z, grassOf(sources));
      const ref = scene(r.beam, r.top, mask, true).at(-1)!;
      for (const q of items) cell.blit(q.grid, q.palette, q.x - ref.x + 8, q.y - ref.y + 8);
      zb.paste(cell, i * (Z + 2), o * (Z + 2));
    }));
    writeFileSync(`.art-preview/joint-halving-zoom-${r.beam ? 'beam' : 'round'}-${r.top}.png`, PNG.sync.write(up(zb.toPng(), 8)));
  }
  writeFileSync('.art-preview/joint-halving-under.png', PNG.sync.write(up(make(false), 4)));
  console.log('.art-preview/joint-halving.png');
}
