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
import { Sheet, textWidth, type Rgb } from './audit-preview';

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

/** L'échelle de l'aperçu court : 6 pixels d'écran par pixel du jeu. */
const SHORT_K = 6;
/** La hauteur de l'aperçu court, au plus (Grégoire doit le lire sans le réduire). */
export const SHORT_MAX_H = 1500;
const AGE_NAMES: Record<WoodAge, string> = { new: 'NEUF', worn: 'PATINÉ', old: 'VIEUX' };

/**
 * L'aperçu court des âges (.art-preview/bois-ages-court.png), compact et grand (x6), en trois colonnes NEUF, PATINÉ, VIEUX :
 * 1. une poutre, une planche, un rondin écorcé et un rondin avec écorce, couchés (1 m), à côté de Xéros ;
 * 2. un pan de bardage, la porte, un pan de toit ;
 * 3. la cabane entière dans les trois âges (`cabins` : ses captures dans le jeu, neuve, patinée, vieille ; npm run test:cabane),
 *    réduite pour que le tout tienne dans SHORT_MAX_H px de haut.
 */
export function agesShortPreview(sources: ArtSource[], cabins: PNG[]): PNG | undefined {
  const find = (name: string) => sources.find((s) => s.name === name);
  const body = find('xeros');
  if (body?.kind !== 'spritesheet') return undefined;
  const xeros = body.animations['idle-down'].frames[0];
  const K = SHORT_K;
  const BG: Rgb = [38, 33, 26];
  const INK: Rgb = [243, 217, 176];
  const DIM: Rgb = [185, 169, 138];
  const imageOf = (name: string): Cell | undefined => {
    const s = find(name);
    return s?.kind === 'image' ? { grid: s.grid, palette: s.palette } : undefined;
  };
  // 1. les quatre pièces couchées, d'un mètre, l'une sous l'autre
  const logs = [woodOfLook('normal', 'beam', 100, 'ew'), woodOfLook('big', 'plank', 100, 'ew'), woodOfLook('normal', 'peeled', 100, 'ew'), woodOfLook('normal', 'round', 100, 'ew')].map((p) => composeWood(p).toGrid());
  const XR: [number, number] = [14, 45]; // les rangées de Xéros (sa silhouette : 32 px, 1,60 m)
  const XC = [10, 21]; // ses colonnes
  const gap = 3;
  const logsH = logs.reduce((a, g) => a + g.length, 0) + gap * (logs.length - 1);
  const row1 = { w: XC[1] - XC[0] + 1 + 6 + Math.max(...logs.map((g) => g[0].length)), h: Math.max(XR[1] - XR[0] + 1, logsH) };
  // 2. le bardage, la porte, le pan de toit, bas alignés
  const parts2 = ['board-wall', 'plank-door', 'plank-roof'];
  const sized2 = parts2.map((n) => imageOf(n)!);
  const row2 = { w: sized2.reduce((a, c) => a + c.grid[0].length, 0) + 6 * (parts2.length - 1), h: Math.max(...sized2.map((c) => c.grid.length)) };
  // les colonnes et les rangées, en pixels d'écran
  const M = 24;
  const T = 4; // les titres : glyphes de 3 × 5, agrandis 4 fois
  const t = 2; // les légendes
  const head = M + 5 * T + 16;
  const cap = 5 * t + 10;
  const h1 = cap + row1.h * K + 20;
  const h2 = cap + row2.h * K + 20;
  const h3max = SHORT_MAX_H - head - h1 - h2 - cap - M;
  // agrandie d'un nombre entier de fois (au moins 1), pour garder des pixels nets ; réduite seulement si elle ne tient pas
  const fit = (c: PNG) => (c.height <= h3max ? Math.floor(h3max / c.height) : h3max / c.height);
  const cabinH = Math.min(h3max, ...cabins.map((c) => Math.round(c.height * fit(c))));
  const scaleOf = (c: PNG) => cabinH / c.height;
  const colW = Math.max(row1.w * K, row2.w * K, ...cabins.map((c) => Math.round(c.width * scaleOf(c))), textWidth('PATINE', T));
  const W = 2 * M + 3 * colW + 2 * M;
  const H = head + h1 + h2 + (cabins.length ? cap + cabinH : 0) + M;
  const sheet = new Sheet(W, Math.min(H, SHORT_MAX_H), BG);
  const label = (s: string, x: number, y: number, c: Rgb, k: number) => {
    sheet.text(s, x, y, c, k);
    // l'accent aigu, que la petite police n'a pas
    [...s].forEach((ch, n) => {
      if (!/[ÉéÈè]/.test(ch)) return;
      sheet.rect(x + (n * 4 + 2) * k, y - 3 * k, k, k, c);
      sheet.rect(x + (n * 4 + 1) * k, y - 2 * k, k, k, c);
    });
  };
  const colX = (i: number) => 2 * M + i * (colW + M);
  AGES.forEach((age, i) => label(AGE_NAMES[age], colX(i) + Math.round((colW - textWidth(AGE_NAMES[age], T)) / 2), M, INK, T));
  let y = head;
  // 1
  label('1. POUTRE, PLANCHE, RONDIN ÉCORCÉ, RONDIN AVEC ÉCORCE (1 M), À CÔTÉ DE XÉROS', 2 * M, y, DIM, t);
  y += cap;
  AGES.forEach((age, i) => {
    const pal = agedPalette(world, age);
    const x0 = colX(i);
    const floor = y + row1.h * K;
    sheet.blit(xeros, body.palette, x0 - XC[0] * K, floor - (XR[1] + 1) * K, K, XR);
    let yy = floor - logsH * K;
    for (const g of logs) {
      sheet.blit(g, pal, x0 + (XC[1] - XC[0] + 1 + 6) * K, yy, K);
      yy += (g.length + gap) * K;
    }
  });
  y += h1 - cap;
  // 2
  label('2. PAN DE BARDAGE, PORTE EN PLANCHES, PAN DE TOIT', 2 * M, y, DIM, t);
  y += cap;
  AGES.forEach((age, i) => {
    let x = colX(i);
    const floor = y + row2.h * K;
    for (const n of parts2) {
      const c = imageOf(agedKey(n, age))!;
      sheet.blit(c.grid, c.palette, x, floor - c.grid.length * K, K);
      x += (c.grid[0].length + 6) * K;
    }
  });
  y += h2 - cap;
  // 3
  if (cabins.length) {
    label('3. LA CABANE ENTIÈRE', 2 * M, y, DIM, t);
    y += cap;
    cabins.forEach((c, i) => {
      const s = scaleOf(c);
      const w = Math.round(c.width * s);
      const x0 = colX(i) + Math.round((colW - w) / 2);
      for (let Y = 0; Y < cabinH; Y++) for (let X = 0; X < w; X++) {
        const sx = Math.min(c.width - 1, Math.floor(X / s));
        const sy = Math.min(c.height - 1, Math.floor(Y / s));
        const o = (sy * c.width + sx) * 4;
        sheet.dot(x0 + X, y + Y, [c.data[o], c.data[o + 1], c.data[o + 2]]);
      }
    });
  }
  return sheet.png;
}
