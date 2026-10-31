// L'aperçu des âges du bois (.art-preview/bois-ages.png, docs/CONCEPTION.md « L'âge du bois ») : chaque pièce de bois dans les
// trois âges, côte à côte, neuf, patiné, vieux, à côté de Xéros : la pièce de bois sous chaque aspect de chaque diamètre (couchée
// est-ouest, 2 m ; debout, 1,80 m, pour ce qui se dresse), puis chaque objet de bois (`aged` de props.json, items.json) dans sa vue 0.
// D'une colonne à l'autre, seule la teinte change ; d'une rangée à l'autre, la forme et la texture.

import type { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource } from '../../art/lib/types';
import { composeWood } from '../../art/world/wood-pieces';
import { agedPalette } from '../../art/world/wood';
import { world } from '../../art/palette';
import type { ItemDef, PropDef, WoodAge, WoodLook } from '../../src/content/types';
import { agedKey, WOOD, woodOfLook } from '../../src/world/woodShape';
import { Board, grassOf } from './composite-previews';

const AGES: WoodAge[] = ['new', 'worn', 'old'];

interface Cell { grid: Grid; palette: Palette }

export function agesPreview(sources: ArtSource[], props: Record<string, PropDef>, items: Record<string, ItemDef>): PNG | undefined {
  const find = (name: string) => sources.find((s) => s.name === name);
  const body = find('xeros');
  if (body?.kind !== 'spritesheet') return undefined;
  const xeros: Cell = { grid: body.animations['idle-down'].frames[0], palette: body.palette };
  const image = (name: string): Cell | undefined => {
    const s = find(name);
    if (s?.kind === 'image') return { grid: s.grid, palette: s.palette };
    if (s?.kind === 'spritesheet') return { grid: Object.values(s.animations)[0].frames[0], palette: s.palette };
    return undefined;
  };
  const rows: Cell[][] = [];
  // la pièce de bois : chaque aspect de chaque diamètre, peint de la rampe de chaque âge
  for (const [size, def] of Object.entries(WOOD.sizes)) {
    for (const look of Object.keys(def.looks) as WoodLook[]) {
      const grids = [composeWood(woodOfLook(size, look, 200, 'ew')).toGrid()];
      if (def.looks[look]!.up && (look === 'beam' || look === 'peeled')) grids.push(composeWood(woodOfLook(size, look, 180, 'up')).toGrid());
      for (const grid of grids) rows.push([xeros, ...AGES.map((age) => ({ grid, palette: agedPalette(world, age) }))]);
    }
  }
  // les objets de bois, leur image de chaque âge (tirée au build)
  const bases = [...Object.values(props).filter((d) => d.aged && !d.wood).map((d) => d.image), ...Object.values(items).filter((d) => d.aged).map((d) => d.ground ?? d.icon)];
  for (const base of bases) {
    const cells = AGES.map((age) => image(agedKey(base, age)));
    if (cells.every((c) => c)) rows.push([xeros, ...(cells as Cell[])]);
  }
  const pad = 6;
  const w = (c: Cell) => c.grid[0].length;
  const h = (c: Cell) => c.grid.length;
  const rowW = (cells: Cell[]) => cells.reduce((a, c) => a + w(c) + pad, pad);
  const rowH = (cells: Cell[]) => Math.max(...cells.map(h)) + 2 * pad;
  const width = Math.max(...rows.map(rowW));
  const board = new Board(width, rows.reduce((a, r) => a + rowH(r) + 2, 0), grassOf(sources));
  let y = 0;
  for (const cells of rows) {
    const rh = rowH(cells);
    let x = pad;
    for (const c of cells) {
      board.blit(c.grid, c.palette, x, y + rh - pad - h(c));
      x += w(c) + pad;
    }
    y += rh;
    for (let X = 0; X < width; X++) board.dot(X, y + 1, [60, 70, 30]);
    y += 2;
  }
  return board.toPng();
}
