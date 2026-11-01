// Planche de contrôle du cadran (hors jeu, non déclarée dans art/index.ts).
// Usage : npx tsx tools/preview-module.ts art/ui/clock-preview.ts .art-preview  → .art-preview/cadran.png
// Le cadran y est recomposé à partir des seules pièces de clock.ts et de leur contrat (`clockLayout`), à 6 h, 7 h, 13 h,
// 19 h 30, 21 h, 23 h et 3 h (une rangée par heure) ; en colonnes : sans vitesse (Jour 3), avec la vitesse x5, avec x20 au
// jour 12, sans vitesse au jour 123, et à droite le dessin de l'essai validé (art/proposals/horloge-temps.ts, piste A).
// Sans vitesse, au jour 3, la recomposition est comparée pixel pour pixel à l'essai : une différence arrête le script.

import { Canvas, type Grid, type Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { clockA } from '../proposals/horloge-temps';
import pieces, { clockLayout, palette } from './clock';
import digits, { palette as hud } from './dialog';

const all = [...pieces, ...(digits as ImageSource[]).filter((s) => s.kind === 'image')] as ImageSource[];
const piece = (key: string): ImageSource => {
  const s = all.find((p) => p.name === key);
  if (!s) throw new Error(`cadran : pièce '${key}' absente`);
  return s;
};
const width = (key: string) => piece(key).grid[0].length;

/** Le parchemin des signes du HUD (un peu plus chaud que le `a` du monde) : un signe à part sur la planche. */
const HUD_A = '¤';

/** Le cadran monté comme le fera le HUD. `mark` : le parchemin des signes reçoit HUD_A (sinon `a`, pour comparer à l'essai). */
function assemble(day: number, min: number, speed: number, mark: boolean): Canvas {
  const { parts, w, h } = clockLayout(day, min, speed, width);
  const c = new Canvas(w, h);
  for (const p of parts) {
    const src = piece(p.key);
    const isGlyph = p.key.startsWith('ui-digit-');
    const grid: Grid = isGlyph && mark ? src.grid.map((r) => r.replace(/a/g, HUD_A)) : src.grid;
    for (let i = 0; i < (p.repeat ?? 1); i++) c.stamp(grid, p.x + i, p.y);
  }
  return c;
}

const TIMES = [6 * 60, 7 * 60, 13 * 60, 19 * 60 + 30, 21 * 60, 23 * 60, 3 * 60];
const COLS: { day: number; speed: number }[] = [
  { day: 3, speed: 1 },
  { day: 3, speed: 5 },
  { day: 12, speed: 20 },
  { day: 123, speed: 1 },
];

for (const min of TIMES) {
  const got = assemble(3, min, 1, false).toGrid();
  const want = clockA(3, min).toGrid();
  if (got.join('\n') !== want.join('\n')) {
    throw new Error(`cadran : la recomposition diffère de l'essai à ${min} min\n${got.join('\n')}\n---\n${want.join('\n')}`);
  }
}

const CW = 66;
const RH = 34;
const sheet = new Canvas((COLS.length + 1) * CW, TIMES.length * RH);
TIMES.forEach((min, r) => {
  COLS.forEach(({ day, speed }, k) => sheet.stamp(assemble(day, min, speed, true).toGrid(), k * CW, r * RH));
  sheet.stamp(clockA(3, min).toGrid(), COLS.length * CW, r * RH);
});

const pal: Palette = { ...palette, [HUD_A]: hud.a };

export default [{ kind: 'image', name: 'cadran', palette: pal, grid: sheet.toGrid() } satisfies ImageSource];
