// couches.png de npm run art:preview : tout ce qui est couché (`lying` de props.json et items.json, la règle D de docs/STYLE.md
// section 8), dans toutes ses vues, côte à côte, à côté de Xéros pour l'échelle : une rangée par objet, sa vue 0 puis un quart de
// tour de plus à chaque fois (R). Puis la pièce de bois, chaque diamètre et chaque aspect, est-ouest puis nord-sud, à 60 cm, 1 m
// et 4 m, avec sa collision en liseré : la pièce tournée doit être la même pièce, image et collision inversées.

import type { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource } from '../../art/lib/types';
import { composeWood } from '../../art/world/wood-pieces';
import { viewImages } from '../../src/content/views';
import type { ItemDef, PropDef, WoodLook, WoodPiece } from '../../src/content/types';
import { WOOD, woodBody, lookOf, shapeOfLook } from '../../src/world/woodShape';
import { Board, grassOf } from './composite-previews';

interface Cell { grid: Grid; palette: Palette; body?: { w: number; h: number; bottom: number } }

/** Faces dressées de chaque aspect. */
const FACES: Record<WoodLook, number> = { round: 0, half: 0, quarter: 0, plank: 0, f1: 1, f2: 2, f3: 3, beam: 4 };

export function lyingPreview(sources: ArtSource[], props: Record<string, PropDef>, items: Record<string, ItemDef>): PNG | undefined {
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
  const has = (k: string) => !!find(k);
  const rows: Cell[][] = [];
  // les objets couchés, dans leurs vues (une image manquante est sautée : VIEWS_TODO la compte)
  const lying = [
    ...Object.values(props).filter((p) => p.lying && !p.wood).map((p) => viewImages(p.image, p.views, has)),
    ...Object.values(items).filter((it) => it.lying && it.ground).map((it) => viewImages(it.ground!, it.views, has)),
  ];
  const seen = new Set<string>();
  for (const views of lying) {
    if (seen.has(views[0])) continue;
    seen.add(views[0]);
    rows.push([xeros, ...views.flatMap((v) => image(v) ?? [])]);
  }
  // la pièce de bois : est-ouest puis nord-sud, avec sa collision
  const sheet = find(Object.values(WOOD.sizes)[0].sheet);
  const palette = sheet?.kind === 'spritesheet' ? sheet.palette : xeros.palette;
  for (const [size, def] of Object.entries(WOOD.sizes)) {
    for (const look of Object.keys(def.looks) as WoodLook[]) {
      const shape = shapeOfLook(look);
      const cells: Cell[] = [xeros];
      for (const length of [60, 100, 400]) {
        for (const axis of ['ew', 'ns'] as const) {
          const p: WoodPiece = { size, shape, axis, length, ...(FACES[look] ? { hewn: FACES[look] * WOOD.hew.perFace } : {}) };
          cells.push({ grid: composeWood(p).toGrid(), palette, body: woodBody(size, lookOf(p), axis, length) });
        }
      }
      rows.push(cells);
    }
  }
  const pad = 6;
  const w = (c: Cell) => c.grid[0].length;
  const h = (c: Cell) => c.grid.length;
  const rowW = (cells: Cell[]) => cells.reduce((a, c) => a + w(c) + pad, pad);
  const rowH = (cells: Cell[]) => Math.max(...cells.map(h)) + 2 * pad;
  const width = Math.max(...rows.map(rowW));
  const board = new Board(width, rows.reduce((a, r) => a + rowH(r) + 4, 0), grassOf(sources));
  let y = 0;
  for (const cells of rows) {
    const rh = rowH(cells);
    let x = pad;
    for (const c of cells) {
      // bas des images sur le sol de la rangée ; la collision centrée en bas, `bottom` px au-dessus du bas
      const top = y + rh - pad - h(c);
      board.blit(c.grid, c.palette, x, top);
      if (c.body) {
        const left = x + Math.floor((w(c) - c.body.w) / 2);
        const bottom = top + h(c) - c.body.bottom;
        board.outline(left, bottom - c.body.h, left + c.body.w, bottom, [200, 40, 40]);
      }
      x += w(c) + pad;
    }
    y += rh;
    for (let X = 0; X < width; X++) board.dot(X, y + 1, [60, 70, 30]);
    y += 4;
  }
  return board.toPng();
}
