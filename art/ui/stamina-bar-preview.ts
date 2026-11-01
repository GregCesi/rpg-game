// Aperçu (hors jeu, non déclaré dans art/index.ts) de la barre d'endurance en pièces et de Xéros essoufflé.
// Usage : npx tsx tools/preview-module.ts art/ui/stamina-bar-preview.ts .art-preview
// - `barre-endurance-montage` : la barre recomposée avec les pièces de stamina-bar.ts selon son contrat de pose, à
//   plusieurs états, l'une sous l'autre. Chaque état est comparé, pixel pour pixel, à la barre de la proposition validée
//   (art/proposals/barre-endurance.ts) : une différence arrête le script.
// - `xeros-souffle` : Xéros au repos dans ses quatre directions, avec la bouffée de `fx-breath` posée à ses accroches,
//   une rangée par image de la bouffée.

import { Canvas, flipX, type Grid, type Palette } from '../lib/canvas';
import type { ArtSource, ImageSource } from '../lib/types';
import { staminaBar } from '../proposals/barre-endurance';
import pieces, { BAR, palette } from './stamina-bar';
import breathSheets, { BREATH_ANCHORS, palette as breathPalette } from '../characters/breath';
import xeros from '../characters/xeros';

const grid = (name: string): Grid => {
  const s = pieces.find((p) => p.name === name);
  if (!s) throw new Error(`aperçu : pièce '${name}' absente`);
  return s.grid;
};

/** La barre montée comme le fera le HUD (contrat de stamina-bar.ts). */
function assemble(breath: number, ceiling: number, max: number): Canvas {
  const iw = Math.max(1, Math.round(max * BAR.pxPerPoint));
  const px = (v: number): number => (v <= 0 ? 0 : Math.max(1, Math.round(v * BAR.pxPerPoint)));
  const ceil = Math.min(Math.max(ceiling, 0), max);
  const pc = Math.min(px(ceil), iw);
  const pb = Math.min(px(Math.min(Math.max(breath, 0), ceil)), pc);
  const c = new Canvas(iw + 2 * BAR.end, BAR.h);
  const { x: ix, y: iy } = BAR.inner;
  c.stamp(grid('ui-bar-left'), 0, 0);
  for (let x = 0; x < iw; x++) c.stamp(grid('ui-bar-mid'), ix + x, 0);
  c.stamp(grid('ui-bar-right'), ix + iw, 0);
  // perdu en tuile sur tout le creux, motif calé sur le début du creux
  const lost = grid('ui-bar-lost');
  for (let x = 0; x < iw; x++) c.stamp(lost.map((row) => row[x % BAR.hatch]), ix + x, iy);
  const part = (from: number, to: number, key: string) => {
    for (let x = from; x < to; x++) c.stamp(grid(x === from ? `${key}-edge` : key), ix + x, iy);
  };
  part(pb, pc, 'ui-bar-back');
  part(0, pb, ceil < 0.15 * max ? 'ui-bar-breath-low' : 'ui-bar-breath');
  return c;
}

/** États montrés : [souffle, plafond, maximum]. */
const STATES: [number, number, number][] = [
  [100, 100, 100], // au lever
  [70, 100, 100], // un effort : le souffle baisse, le plafond tient
  [0, 62, 100], // essoufflé : tout le plafond revient
  [30, 45, 100], // l'après-midi
  [9, 12, 100], // fatigué : le souffle rougit
  [1, 1, 100], // un point
  [55, 80, 130], // maximum monté (3e jour) : la barre s'allonge
  [40, 60, 64], // maximum bas
];

function montage(): ImageSource {
  const bars = STATES.map(([b, c, m]) => {
    const got = assemble(b, c, m).toGrid();
    const want = staminaBar(b, c, m).grid;
    if (got.join('\n') !== want.join('\n')) {
      throw new Error(`aperçu : la barre en pièces diffère de la proposition à ${b}/${c}/${m}\n${got.join('\n')}\n---\n${want.join('\n')}`);
    }
    return got;
  });
  const w = Math.max(...bars.map((g) => g[0].length));
  const c = new Canvas(w, bars.length * (BAR.h + 4) - 4);
  bars.forEach((g, i) => c.stamp(g, 0, i * (BAR.h + 4)));
  return { kind: 'image', name: 'barre-endurance-montage', palette, grid: c.toGrid() };
}

function breathing(): ImageSource {
  if (xeros.kind !== 'spritesheet') throw new Error('aperçu : xeros n’est pas une planche');
  const puff = breathSheets[0].animations.puff.frames;
  const dirs = ['down', 'right', 'left', 'up'] as const;
  const FW = 40;
  const c = new Canvas(dirs.length * FW, puff.length * 40);
  puff.forEach((frame, row) => {
    dirs.forEach((dir, col) => {
      const ox = col * FW + 4;
      const oy = row * 40 - 10;
      c.stamp(xeros.animations[`idle-${dir}`].frames[0], ox, oy);
      const a = BREATH_ANCHORS[dir];
      // les pieds : (16, 48) dans la frame de 32 × 48
      c.stamp(a.flipX ? flipX(frame) : frame, ox + 16 + a.dx, oy + 48 + a.dy);
    });
  });
  const pal: Palette = { ...xeros.palette, ...breathPalette };
  return { kind: 'image', name: 'xeros-souffle', palette: pal, grid: c.toGrid() };
}

export default [montage(), breathing()] satisfies ArtSource[];
