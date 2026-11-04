// L'aperçu de la petite carte depuis le vrai module (src/world/minimap.ts, posé comme le fait systems/minimap.ts : le disque, le cadre
// de art/ui/minimap.ts, le point de Xéros) : trois lieux (devant la maison de Xéros, sur le chemin du village, sur la place du village),
// à chaque cran de MINIMAP, d'une partie neuve. `npm run art:carte` → .art-preview/petite-carte.png, agrandie ×2 (un pixel du canevas
// = 2 × 2 px de la planche).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { MINIMAP, ZOOM } from '../src/config';
import { maps } from '../src/content';
import { newGame } from '../src/state/GameState';
import { drawWindow, emptyGrid, packColor, paintZone, worldCell, ZONES } from '../src/world/minimap';
import { buildPlans } from './lib/build-plans';
import { blank, put, text, toPng, type Img, type RGBA } from './lib/world-render';

const plans = buildPlans();
const game = newGame();
const grid = emptyGrid();
for (const m of ZONES) paintZone(grid, m, game.maps[m.id], plans);

const readPng = (path: string): Img => {
  const p = PNG.sync.read(readFileSync(path));
  return { w: p.width, h: p.height, data: p.data };
};

/** Colle `src` agrandie `k` fois (plus proche voisin), en mêlant l'alpha. */
function blitK(dst: Img, src: Img, x: number, y: number, k: number): void {
  for (let j = 0; j < src.h * k; j++)
    for (let i = 0; i < src.w * k; i++) {
      const s = (Math.floor(j / k) * src.w + Math.floor(i / k)) * 4;
      const a = src.data[s + 3];
      if (!a) continue;
      put(dst, x + i, y + j, [src.data[s], src.data[s + 1], src.data[s + 2], 255]);
    }
}

/** La petite carte d'un lieu à un cran, en px du canevas (le HUD × ZOOM). */
function minimap(cx: number, cy: number, step: (typeof MINIMAP.steps)[number], facing: string): Img {
  const frame = readPng(`src/generated/ui-minimap-frame-${step.inner}.png`);
  const dot = readPng(`src/generated/ui-minimap-dot-${facing}.png`);
  const border = (frame.w - step.inner) / 2;
  const img = blank(frame.w * ZOOM, frame.h * ZOOM, [0, 0, 0, 0]);
  const size = step.inner * ZOOM;
  const px = new Uint32Array(size * size);
  drawWindow(grid, cx, cy, size, step.px, packColor(MINIMAP.outside), px);
  const win: Img = { w: size, h: size, data: new Uint8Array(px.buffer) as unknown as Buffer };
  blitK(img, win, border * ZOOM, border * ZOOM, 1);
  blitK(img, frame, 0, 0, ZOOM);
  const mid = border + (step.inner - 1) / 2;
  const c = (dot.w - 1) / 2;
  blitK(img, dot, (mid - c) * ZOOM, (mid - c) * ZOOM, ZOOM);
  return img;
}


const PLACES = [
  { name: 'Devant la maison de Xeros', map: 'ferme', x: 3200, y: 1700, facing: 'down' },
  { name: 'Sur le chemin du village', map: 'chemin', x: 2000, y: 2012, facing: 'right' },
  { name: 'Sur la place du village', map: 'village', x: 3290, y: 2300, facing: 'up' },
].filter((p) => maps[p.map]?.world);

const K = 2;
const INK: RGBA = [250, 236, 200, 255];
const BG: RGBA = [40, 31, 24, 255];
const cells = PLACES.map((p) => MINIMAP.steps.map((s) => minimap(worldCell(maps[p.map], p.x, p.y).x, worldCell(maps[p.map], p.x, p.y).y, s, p.facing)));
const colW = MINIMAP.steps.map((_, i) => Math.max(...cells.map((r) => r[i].w)) * K + 30);
const rowH = Math.max(...cells.flat().map((m) => m.h)) * K + 40;
const img = blank(colW.reduce((a, b) => a + b, 0) + 230, rowH * PLACES.length + 60, BG);
text(img, 'Petite carte du jeu (src/world/minimap.ts), planche x2 : 1 px du canevas = 2 x 2', 10, 10, 2, INK);
let x = 230;
MINIMAP.steps.forEach((s, i) => {
  const n = (s.inner * ZOOM) / s.px;
  text(img, `cran ${i + 1} : ${s.px} px par case, ${n} cases (${Math.round((n * 1.6) / 2)} m)`, x, 36, 1, INK);
  x += colW[i];
});
PLACES.forEach((p, r) => {
  const y = 60 + r * rowH;
  text(img, p.name, 10, y + 20, 1, INK);
  let cx = 230;
  cells[r].forEach((c, i) => {
    blitK(img, c, cx, y, K);
    cx += colW[i];
  });
});
mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/petite-carte.png', toPng(img));
console.log('.art-preview/petite-carte.png');
