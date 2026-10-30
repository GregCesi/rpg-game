// timber.png de npm run art:preview : le bois d'œuvre de l'arbre normal (art/world/timber.ts), assemblé comme le jeu
// l'assemble (`composeTimber`, placements de src/world/timberShape.ts), à côté de Xéros pour l'échelle.
// Est-ouest puis nord-sud, une rangée chacune : les rondins de 30, 95, 170, 300 et 500 cm ; un rondin de 300 cm entaillé
// à 170 cm (un tiers, deux tiers), puis les mêmes encoches aux images 1 à 3 du roulement ; les 4 images du roulement
// d'un rondin de 170 cm ; les étapes de l'équarrissage d'une pièce de 300 cm (f1, f2, f3, poutre). Enfin la poutre de
// 95 cm des deux sens, la poutre portée (de face, de dos, de profil) et son icône.

import type { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource } from '../../art/lib/types';
import { composeTimber } from '../../art/world/timber';
import type { TimberAxis } from '../../src/world/timberShape';
import { Board, grassOf } from './composite-previews';

interface Cell { grid: Grid; palette: Palette }

export function timberPreview(sources: ArtSource[]): PNG | undefined {
  const find = (name: string) => sources.find((s) => s.name === name);
  const body = find('xeros');
  const palette = (find('normal-felled-log') as { palette: Palette } | undefined)?.palette;
  if (!palette || body?.kind !== 'spritesheet') return undefined;
  const xeros: Cell = { grid: body.animations['idle-down'].frames[0], palette: body.palette };
  const cell = (axis: TimberAxis, look: Parameters<typeof composeTimber>[1], cm: number, frame = 0, notch?: { cm: number; depth: 1 | 2 }): Cell => ({
    grid: composeTimber(axis, look, cm, frame, notch).toGrid(),
    palette,
  });
  const image = (name: string): Cell[] => {
    const s = find(name);
    if (s?.kind === 'image') return [{ grid: s.grid, palette: s.palette }];
    if (s?.kind === 'spritesheet') return Object.values(s.animations).map((a) => ({ grid: a.frames[0], palette: s.palette }));
    return [];
  };

  const rows: Cell[][] = [];
  for (const axis of ['ew', 'ns'] as const) {
    rows.push([xeros, ...[30, 95, 170, 300, 500].map((cm) => cell(axis, 'round', cm))]);
    rows.push([
      xeros,
      cell(axis, 'round', 300, 0, { cm: 170, depth: 1 }),
      cell(axis, 'round', 300, 0, { cm: 170, depth: 2 }),
      ...[1, 2, 3].flatMap((k) => [cell(axis, 'round', 170, k, { cm: 95, depth: 1 }), cell(axis, 'round', 170, k, { cm: 95, depth: 2 })]),
    ]);
    rows.push([xeros, ...[0, 1, 2, 3].map((k) => cell(axis, 'round', 170, k))]);
    rows.push([xeros, ...(['round', 'f1', 'f2', 'f3', 'beam'] as const).map((l) => cell(axis, l, 300))]);
  }
  rows.push([xeros, ...image('normal-beam'), ...image('normal-beam-ns'), ...image('held-normal-beam'), ...image('item-normal-beam')]);

  const pad = 6;
  const rowW = (cells: Cell[]) => cells.reduce((a, c) => a + c.grid[0].length + pad, pad);
  const rowH = (cells: Cell[]) => Math.max(...cells.map((c) => c.grid.length)) + 2 * pad;
  const width = Math.max(...rows.map(rowW));
  const total = rows.reduce((a, r) => a + rowH(r) + 4, 0);
  const board = new Board(width, total, grassOf(sources));
  let y = 0;
  for (const cells of rows) {
    const h = rowH(cells);
    let x = pad;
    for (const c of cells) {
      // bas des cases aligné sur le sol de la rangée
      board.blit(c.grid, c.palette, x, y + h - pad - c.grid.length);
      x += c.grid[0].length + pad;
    }
    y += h;
    for (let X = 0; X < width; X++) board.dot(X, y + 1, [60, 70, 30]);
    y += 4;
  }
  return board.toPng();
}
