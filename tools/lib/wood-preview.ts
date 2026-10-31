// bois.png de npm run art:preview : la pièce de bois (art/world/wood-pieces.ts), assemblée comme le jeu l'assemble
// (`composeWood`, opérations de src/world/woodShape.ts), à côté de Xéros pour l'échelle. Pour chaque diamètre de wood.json, est-ouest
// puis nord-sud : les pièces rondes de 60 cm, 1 m, 2 m et 4 m ; les 4 images du roulement d'une pièce de 1 m et l'encoche d'une coupe
// (un tiers, deux tiers) à 1 m du bout d'une pièce de 2 m ; chaque aspect à 1 m puis à 3 m ; pour ce qui se fend, depuis chaque bout,
// le coin planté, la fente après un et deux coups, le bois ouvert du dernier, et les deux morceaux posés comme le jeu les pose
// (`split` de wood.json, `splitPieces` : les quartiers faces debout opposées) ; le quartier dans ses quatre positions (face debout au
// nord, à l'est, au sud, à l'ouest : un tour de R), à 1 m et 2 m ; debout (le poteau), chaque aspect qui se dresse couché est-ouest et nord-sud à 1 m puis debout à 1 m, 1,80 m et 3 m. Enfin les vues portées (de face, de dos, de profil à 1 m) et l'icône de chaque aspect.

import type { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource } from '../../art/lib/types';
import { composeWood } from '../../art/world/wood-pieces';
import type { End, WoodLook, WoodPiece } from '../../src/content/types';
import { shapeOfLook, splitPieces, WOOD } from '../../src/world/woodShape';
import { Board, grassOf } from './composite-previews';

interface Placed { grid: Grid; x: number; y: number }
interface Cell { items: Placed[]; palette: Palette; w: number; h: number }

/** Faces dressées de chaque aspect. */
const FACES: Record<WoodLook, number> = { round: 0, half: 0, quarter: 0, plank: 0, f1: 1, f2: 2, f3: 3, beam: 4 };

export function woodPreview(sources: ArtSource[]): PNG | undefined {
  const find = (name: string) => sources.find((s) => s.name === name);
  const body = find('xeros');
  const sheet = find(Object.values(WOOD.sizes)[0].sheet);
  if (body?.kind !== 'spritesheet' || sheet?.kind !== 'spritesheet') return undefined;
  // la palette des planches du gros (`world` et le fer du coin) dessine toutes les pièces
  const palette = sheet.palette;
  const one = (grid: Grid, pal: Palette = palette): Cell => ({ items: [{ grid, x: 0, y: 0 }], palette: pal, w: grid[0].length, h: grid.length });
  const xeros = one(body.animations['idle-down'].frames[0], body.palette);
  const piece = (size: string, axis: WoodPiece['axis'], length: number, look: WoodLook = 'round', more: Partial<WoodPiece> = {}): WoodPiece => {
    const shape = shapeOfLook(look);
    return { size, length, shape, axis, ...(FACES[look] ? { hewn: FACES[look] * WOOD.hew.perFace } : {}), ...more };
  };
  const cell = (p: WoodPiece, frame = 0, open = false) => one(composeWood(p, { frame, open }).toGrid());
  /** Des pièces posées dans un repère local (coin bas gauche de chacune), ramenées en case. */
  const group = (parts: { p: WoodPiece; x: number; y: number }[]): Cell => {
    const items = parts.map(({ p, x, y }) => {
      const grid = composeWood(p).toGrid();
      return { grid, x, y: y - grid.length };
    });
    const x0 = Math.min(...items.map((i) => i.x));
    const y0 = Math.min(...items.map((i) => i.y));
    const w = Math.max(...items.map((i) => i.x + i.grid[0].length)) - x0;
    const h = Math.max(...items.map((i) => i.y + i.grid.length)) - y0;
    return { items: items.map((i) => ({ ...i, x: i.x - x0, y: i.y - y0 })), palette, w, h };
  };

  const rows: Cell[][] = [];
  for (const [size, def] of Object.entries(WOOD.sizes)) {
    const looks = Object.keys(def.looks) as WoodLook[];
    for (const axis of ['ew', 'ns'] as const) {
      const ends: End[] = axis === 'ew' ? ['west', 'east'] : ['north', 'south'];
      rows.push([xeros, ...[60, 100, 200, 400].map((cm) => cell(piece(size, axis, cm)))]);
      rows.push([
        xeros,
        ...[0, 1, 2, 3].map((k) => cell(piece(size, axis, 100), k)),
        ...[1, 2].map((hits) => cell(piece(size, axis, 200, 'round', { notch: { at: 100, hits } }))),
      ]);
      rows.push([xeros, ...looks.map((l) => cell(piece(size, axis, 100, l))), ...looks.map((l) => cell(piece(size, axis, 300, l)))]);
      for (const look of Object.keys(def.split)) {
        for (const end of ends) {
          const p = piece(size, axis, 100, look as WoodLook);
          const halves = group(splitPieces(p).map(({ piece: q, dx, dy }) => ({ p: q, x: dx, y: dy })));
          rows.push([xeros, ...[0, 1, 2].map((hits) => cell({ ...p, wedge: { end, hits } })), cell({ ...p, wedge: { end, hits: 2 } }, 0, true), halves]);
        }
      }
    }
    // le quartier dans ses quatre positions, un quart de tour à chaque fois (R) : face debout au nord, à l'est, au sud, à l'ouest
    if (def.looks.quarter) {
      for (const cm of [100, 200]) {
        rows.push([xeros, ...(['north', 'east', 'south', 'west'] as const).map((face) => cell(piece(size, face === 'north' || face === 'south' ? 'ew' : 'ns', cm, 'quarter', { face })))]);
      }
    }
    // debout (le poteau) : chaque aspect qui se dresse, couché est-ouest et nord-sud (1 m) à côté du même debout (1 m, 1,80 m, 3 m)
    for (const look of looks) {
      if (!def.looks[look]!.up) continue;
      rows.push([
        xeros,
        ...(['ew', 'ns'] as const).map((axis) => cell(piece(size, axis, 100, look))),
        ...[100, 180, 300].map((cm) => cell(piece(size, 'up', cm, look))),
      ]);
    }
    const held: Cell[] = [];
    for (const look of looks) {
      const l = def.looks[look]!;
      const h = find(l.held);
      if (h?.kind === 'spritesheet') for (const v of ['down', 'up', 'right']) held.push(one(h.animations[v].frames[0], h.palette));
      const icon = find(l.icon);
      if (icon?.kind === 'image') held.push(one(icon.grid, icon.palette));
    }
    rows.push([xeros, ...held]);
  }

  const pad = 6;
  const rowW = (cells: Cell[]) => cells.reduce((a, c) => a + c.w + pad, pad);
  const rowH = (cells: Cell[]) => Math.max(...cells.map((c) => c.h)) + 2 * pad;
  const width = Math.max(...rows.map(rowW));
  const total = rows.reduce((a, r) => a + rowH(r) + 4, 0);
  const board = new Board(width, total, grassOf(sources));
  let y = 0;
  for (const cells of rows) {
    const h = rowH(cells);
    let x = pad;
    for (const c of cells) {
      // bas des cases aligné sur le sol de la rangée
      for (const i of c.items) board.blit(i.grid, c.palette, x + i.x, y + h - pad - c.h + i.y);
      x += c.w + pad;
    }
    y += h;
    for (let X = 0; X < width; X++) board.dot(X, y + 1, [60, 70, 30]);
    y += 4;
  }
  return board.toPng();
}
