// Aperçu (hors jeu, non déclaré dans art/index.ts) de la jauge de travail, montée selon le contrat de work-bar.ts.
// Usage : npx tsx art/ui/work-bar-preview.ts → .art-preview/jauge-travail.png (×4)
// Trois colonnes (0 %, 40 %, 100 %) ; rangées : Xéros au repos sur l'herbe, Xéros au geste `chop` (hache levée, de face) sur
// l'herbe, puis les deux mêmes sur la terre du chemin ; une dernière rangée, `maul` (fendre) de face à la hache, sur l'herbe.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Grid } from '../lib/canvas';
import type { SpriteSheetSource, TilesetSource } from '../lib/types';
import { sources } from '../index';
import gestures from '../../src/content/gestures.json';
import { Board } from '../../tools/lib/composite-previews';
import pieces, { WORK_BAR, palette } from './work-bar';

const sheet = (name: string) => sources.find((s) => s.name === name) as SpriteSheetSource;
const xeros = sheet('xeros');
const axe = sheet('tool-axe');
const tiles = sources.find((s) => s.kind === 'tileset' && s.name === 'world') as TilesetSource;
const grid = (name: string): Grid => pieces.find((p) => p.name === name)!.grid;

const CW = 40;
const CH = 80;
const FEET = { x: 20, y: 72 }; // pieds de Xéros dans une case
const LEVELS = [0, 0.4, 1];
type Row = { ground: string; pose?: { gesture: 'chop' | 'maul'; step: number } };
const ROWS: Row[] = [
  { ground: 'grass' },
  { ground: 'grass', pose: { gesture: 'chop', step: 0 } },
  { ground: 'path-15' },
  { ground: 'path-15', pose: { gesture: 'chop', step: 0 } },
  { ground: 'grass', pose: { gesture: 'maul', step: 0 } },
];

const board = new Board(CW * LEVELS.length, CH * ROWS.length, { grid: tiles.tiles.grass, palette: tiles.palette });
ROWS.forEach((row, r) => {
  LEVELS.forEach((p, col) => {
    const ox = col * CW;
    const oy = r * CH;
    const t = tiles.tiles[row.ground];
    for (let y = 0; y < CH; y += 32) for (let x = 0; x < CW; x += 32) board.blit(t.map((l) => l.slice(0, CW - x)).slice(0, CH - y), tiles.palette, ox + x, oy + y);
    const fx = ox + FEET.x;
    const fy = oy + FEET.y;
    const bx = fx - xeros.frameW / 2;
    const by = fy - xeros.frameH;
    if (row.pose) {
      const { gesture, step } = row.pose;
      const pose = (gestures as Record<string, { poses: Record<string, { dx: number; dy: number; behind?: boolean }[]> }>)[gesture].poses.down[step];
      const tg = axe.animations[`${gesture}-down`].frames[step];
      const tx = fx + pose.dx - Math.floor(axe.frameW / 2);
      const ty = fy + pose.dy - Math.floor(axe.frameH / 2);
      if (pose.behind) board.blit(tg, axe.palette, tx, ty);
      board.blit(xeros.animations[`${gesture}-down`].frames[step], xeros.palette, bx, by);
      if (!pose.behind) board.blit(tg, axe.palette, tx, ty);
    } else {
      board.blit(xeros.animations['idle-down'].frames[0], xeros.palette, bx, by);
    }
    const jx = fx + WORK_BAR.offset.x;
    const jy = fy + WORK_BAR.offset.y;
    board.blit(grid('ui-work-frame'), palette, jx, jy);
    const w = Math.round(p * WORK_BAR.inner.w);
    if (w > 0) board.blit(grid('ui-work-fill').map((l) => l.slice(0, w)), palette, jx + WORK_BAR.inner.x, jy + WORK_BAR.inner.y);
  });
});

const out = resolve('.art-preview');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'jauge-travail.png'), (await import('pngjs')).PNG.sync.write(board.toPng()));
console.log('écrit .art-preview/jauge-travail.png');
