// fendage.png de npm run art:preview : toute la suite du fendage, à côté de Xéros pour l'échelle, posée comme le jeu la pose.
// Une rangée par sens (est-ouest, puis nord-sud) : la bille, le coin planté, les trois fentes, les deux demi-billes (là où
// naissent `becomes` et `spawns` de la bille), la demi-bille coin planté, ses trois fentes, les deux quartiers. Puis une
// rangée des outils (icônes, au sol), du quartier en main, et le tas plein de quartiers, est-ouest et nord-sud.
// Rien n'est dessiné à part ici : tout se lit dans props.json (`harvest` : `becomes`, `at`, `spawns`), piles.json et art/.

import type { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource, ImageSource } from '../../art/lib/types';
import type { PileDef, PropDef } from '../../src/content/types';
import { drawOrder, shapeOf } from '../../src/world/pileShape';
import { Board, grassOf } from './composite-previews';

interface Placed { grid: Grid; palette: Palette; x: number; y: number }
interface Cell { items: Placed[]; w: number; h: number }

/** Les deux sens : la bille de départ (grosse bille ordinaire) et sa bille coin planté dans props.json. */
const ROWS = [
  { log: 'big-felled-log', wedged: 'big-wedged-log' },
  { log: 'big-felled-log-ns', wedged: 'big-wedged-log-ns' },
] as const;

export function fendagePreview(sources: ArtSource[], props: Record<string, PropDef>, piles: Record<string, PileDef>): PNG | undefined {
  const image = (name: string | undefined) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'image' ? s : undefined;
  };
  const body = sources.find((x) => x.name === 'xeros');
  const xeros = body?.kind === 'spritesheet' ? { grid: body.animations['idle-down'].frames[0], palette: body.palette } : undefined;
  const pad = 6;

  const single = (src: { grid: Grid; palette: Palette }): Cell => ({ items: [{ ...src, x: 0, y: 0 }], w: src.grid[0].length, h: src.grid.length });
  /** Des images posées dans un repère local (bas du parent en y = 0), ramenées en case : coin haut gauche de l'ensemble. */
  const group = (parts: { src: ImageSource; x: number; y: number }[]): Cell => {
    const items = parts.map((p) => ({ grid: p.src.grid, palette: p.src.palette, x: p.x, y: p.y - p.src.grid.length }));
    const x0 = Math.min(...items.map((i) => i.x));
    const y0 = Math.min(...items.map((i) => i.y));
    const x1 = Math.max(...items.map((i) => i.x + i.grid[0].length));
    const y1 = Math.max(...items.map((i) => i.y + i.grid.length));
    return { items: items.map((i) => ({ ...i, x: i.x - x0, y: i.y - y0 })), w: x1 - x0, h: y1 - y0 };
  };
  /** Ce que donne la fin du fendage de `type` : `becomes` à `at`, puis les `spawns`, comme `finish` de systems/harvest.ts. */
  const result = (type: string | undefined): Cell | undefined => {
    const h = type ? props[type]?.harvest : undefined;
    if (!h?.becomes) return undefined;
    const [ax, ay] = h.at ?? [0, 0];
    const spots = [{ type: h.becomes, x: ax, y: ay }, ...h.spawns];
    const parts = spots.map((s) => ({ src: image(props[s.type]?.image), x: s.x, y: s.y }));
    return parts.every((p) => p.src) ? group(parts as { src: ImageSource; x: number; y: number }[]) : undefined;
  };

  const rows: Cell[][] = [];
  for (const r of ROWS) {
    const cells: (Cell | undefined)[] = [];
    if (xeros) cells.push(single(xeros));
    const log = image(props[r.log]?.image);
    cells.push(log && single(log));
    // la bille, coin planté : l'image de base puis les trois fentes
    const wedged = props[r.wedged];
    for (const suffix of ['', '-n1', '-n2', '-n3']) {
      const s = image(wedged && `${wedged.image}${suffix}`);
      cells.push(s && single(s));
    }
    cells.push(result(r.wedged));
    // la demi-bille (même sens que la bille), coin planté, trois fentes, puis les quartiers
    const half = props[r.wedged]?.harvest?.becomes;
    const halfWedged = half ? props[half]?.harvest?.becomes : undefined;
    const wh = halfWedged ? props[halfWedged] : undefined;
    for (const suffix of ['', '-n1', '-n2', '-n3']) {
      const s = image(wh && `${wh.image}${suffix}`);
      cells.push(s && single(s));
    }
    cells.push(result(halfWedged));
    const shown = cells.filter((c): c is Cell => !!c);
    if (shown.length > 1) rows.push(shown);
  }

  // les outils, le quartier en main, les tas pleins de quartiers
  const tools: Cell[] = [];
  if (xeros) tools.push(single(xeros));
  for (const name of ['item-maul', 'maul-ground', 'item-splitting-wedge', 'splitting-wedge-ground', 'item-big-quarter-log']) {
    const s = image(name);
    if (s) tools.push(single(s));
  }
  const held = sources.find((x) => x.name === 'held-big-quarter-log');
  if (held?.kind === 'spritesheet') for (const anim of ['down', 'up', 'right']) tools.push(single({ grid: held.animations[anim].frames[0], palette: held.palette }));
  const quarters = piles['big-quarters'];
  if (quarters) {
    for (const turned of [false, true]) {
      const shape = shapeOf(quarters, turned);
      const items = drawOrder(shape, Object.keys(shape.places)).map((id) => {
        const q = shape.places[id];
        return { src: image(q.image), x: q.x, y: q.y };
      });
      if (items.every((i) => i.src)) tools.push(group(items as { src: ImageSource; x: number; y: number }[]));
    }
  }
  if (tools.length > 1) rows.push(tools);
  if (!rows.length) return undefined;

  const rowW = (cells: Cell[]) => cells.reduce((a, c) => a + c.w + pad, pad);
  const rowH = (cells: Cell[]) => Math.max(...cells.map((c) => c.h)) + 2 * pad;
  const width = Math.max(...rows.map(rowW));
  const total = rows.reduce((a, cells) => a + rowH(cells) + 4, 0);
  const board = new Board(width, total, grassOf(sources));
  let y = 0;
  for (const cells of rows) {
    const h = rowH(cells);
    let x = pad;
    for (const c of cells) {
      // bas des cases aligné sur le sol de la rangée
      const top = y + h - pad - c.h;
      for (const it of c.items) board.blit(it.grid, it.palette, x + it.x, top + it.y);
      x += c.w + pad;
    }
    y += h;
    for (let X = 0; X < width; X++) board.dot(X, y + 1, [60, 70, 30]);
    y += 4;
  }
  return board.toPng();
}
