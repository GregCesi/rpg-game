// Planche de contrôle de la petite carte du HUD, art/ui/minimap.ts (chantier « petite carte ») :
// npx tsx tools/essai-petite-carte-cadre.ts écrit .art-preview/petite-carte-cadre.png (et -detail.png).
// En haut : les cadres du jeu (une fenêtre par diamètre de MINIMAP.steps, aujourd'hui 81 et 63) agrandis ×4 sur l'herbe, avec dans
// la fenêtre un remplissage d'essai en aplats (forêt profonde, herbe, chemin, eau, chaume) et le point de Xéros au centre, posés
// selon le contrat de pose ; à droite, au même ×4, le cadran de l'heure et Xéros (première image) pour l'échelle. En bas : le
// point de Xéros liseré dans ses quatre sens, ×8, sur la forêt profonde, l'herbe, le chemin, le chaume et l'eau, chaque fond avec
// Xéros à ×8 ; puis les cadres à la taille de l'écran (×2), pour juger la lecture réelle.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { Canvas, rng } from '../art/lib/canvas';
import { DOT_CENTER, FRAME_BORDER, FRAME_PALETTE, FRAME_SIZES, minimapFrame, playerDot, type Facing } from '../art/ui/minimap';

type RGBA = [number, number, number, number];
const hex = (h: string): RGBA => {
  const v = h.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16), v.length > 6 ? parseInt(v.slice(6, 8), 16) : 255];
};

const BG = hex('#7b8544');
const W = 1900;
const H = 1460;
const out = new PNG({ width: W, height: H });
for (let i = 0; i < out.data.length; i += 4) [out.data[i], out.data[i + 1], out.data[i + 2], out.data[i + 3]] = BG;

function put(x: number, y: number, c: RGBA): void {
  if (x < 0 || y < 0 || x >= W || y >= H || c[3] === 0) return;
  const i = (y * W + x) << 2;
  const a = c[3] / 255;
  for (let k = 0; k < 3; k++) out.data[i + k] = Math.round(c[k] * a + out.data[i + k] * (1 - a));
}

function drawCanvas(cv: Canvas, ox: number, oy: number, s: number): void {
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    const k = cv.get(x, y);
    if (k === '.') continue;
    const col = FRAME_PALETTE[k];
    if (!col) throw new Error(`couleur inconnue « ${k} »`);
    const c = hex(col);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) put(ox + x * s + i, oy + y * s + j, c);
  }
}

function drawPng(file: string, ox: number, oy: number, s: number, crop?: [number, number, number, number]): void {
  const p = PNG.sync.read(readFileSync(file));
  const [cx, cy, cw, ch] = crop ?? [0, 0, p.width, p.height];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((cy + y) * p.width + cx + x) << 2;
    const c: RGBA = [p.data[si], p.data[si + 1], p.data[si + 2], p.data[si + 3]];
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) put(ox + x * s + i, oy + y * s + j, c);
  }
}

function rect(x: number, y: number, w: number, h: number, c: RGBA): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c);
}

/** Un remplissage d'essai de la carte (disque de diamètre inner + 2 : le cadre en mord le bord) : aplats, un pixel par case. */
function mapFill(inner: number): Canvas {
  const size = inner + 2 * FRAME_BORDER;
  const c = new Canvas(size, size);
  const c0 = (size - 1) / 2;
  const r = inner / 2 + 1;
  const rand = rng(inner);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (Math.hypot(x - c0, y - c0) > r) continue;
    const u = (x - c0) / inner; // -0,5 à 0,5
    const v = (y - c0) / inner;
    let k = 'g';
    if (u < -0.15 && v < -0.05) k = rand() < 0.55 ? 'k' : 'l'; // un bois au nord-ouest
    if (u < -0.05 && v > -0.12 && v < 0.06) k = '4'; // la forêt profonde, jusqu'au centre
    if (Math.abs(v - 0.08 - 0.25 * u) < 0.03) k = 'u'; // un chemin
    if (Math.abs(u - 0.18) < 0.025 && v > 0.08) k = 'u'; // une branche du chemin vers le sud
    if (Math.hypot(u - 0.24, v + 0.22) < 0.1) k = 'w'; // une mare
    if (u > -0.1 && u < 0.04 && v > 0.16 && v < 0.27) k = 't'; // un toit de chaume
    if (inner > 70 && u > -0.02 && u < 0.09 && v > -0.05 && v < 0.05) k = 't'; // un toit de chaume sous le point (grand cadre)
    if (inner < 70 && u > -0.1 && u < 0.1 && v > -0.1 && v < 0.06) k = '4'; // la forêt profonde sous le point (petit cadre)
    if (u > 0.28 && v > 0.12 && v < 0.3 && rand() < 0.12) k = 'k'; // quelques arbres isolés
    c.set(x, y, k);
  }
  return c;
}

const FACINGS: Facing[] = ['up', 'right', 'down', 'left'];
const sizes = FRAME_SIZES;

// --- en haut : les cadres ×4 ---
let x = 16;
const top = 16;
for (const [i, inner] of sizes.entries()) {
  const size = inner + 2 * FRAME_BORDER;
  drawCanvas(mapFill(inner), x, top, 4);
  const c0 = FRAME_BORDER + (inner - 1) / 2; // le centre de la fenêtre (contrat de pose)
  drawCanvas(minimapFrame(inner), x, top, 4);
  drawCanvas(playerDot(FACINGS[i]), x + (c0 - DOT_CENTER) * 4, top + (c0 - DOT_CENTER) * 4, 4);
  x += size * 4 + 24;
}

// --- l'échelle : le cadran (×4) et Xéros (×4) ---
const gen = 'src/generated';
drawPng(`${gen}/ui-clock-sky-day.png`, x, top, 4);
drawPng(`${gen}/ui-clock-hill.png`, x, top, 4);
drawPng(`${gen}/ui-clock-ring.png`, x, top, 4);
drawPng(`${gen}/xeros.png`, x, top + 23 * 4 + 16, 4, [0, 0, 32, 48]);

// --- en bas : le point de Xéros liseré ×8 sur cinq fonds, avec Xéros ×8 sur chacun ---
const grounds = ['4', 'g', 'u', 't', 'w'];
let y = top + (FRAME_SIZES[0] + 2 * FRAME_BORDER) * 4 + 24;
const cell = 9 * 8 + 8;
const gw = 4 * cell + 32 * 8 + 16;
const gh = 48 * 8 + 16;
let bx = 16;
for (const g of grounds) {
  if (bx + gw > W) { bx = 16; y += gh + 12; }
  rect(bx, y, gw, gh, hex(FRAME_PALETTE[g]));
  FACINGS.forEach((f, i) => drawCanvas(playerDot(f), bx + 8 + i * cell, y + 8, 8));
  drawPng('src/generated/xeros.png', bx + 8 + 4 * cell, y + 8, 8, [0, 0, 32, 48]);
  bx += gw + 12;
}
y += gh + 12;

// --- à la taille de l'écran (×2) ---
let sx = 16;
const sy = y;
for (const [i, inner] of sizes.entries()) {
  const size = inner + 2 * FRAME_BORDER;
  drawCanvas(mapFill(inner), sx, sy, 2);
  const c0 = FRAME_BORDER + (inner - 1) / 2;
  drawCanvas(minimapFrame(inner), sx, sy, 2);
  drawCanvas(playerDot(FACINGS[(i + 2) % 4]), sx + (c0 - DOT_CENTER) * 2, sy + (c0 - DOT_CENTER) * 2, 2);
  sx += size * 2 + 16;
}
drawPng(`${gen}/ui-clock-sky-day.png`, sx, sy, 2);
drawPng(`${gen}/ui-clock-hill.png`, sx, sy, 2);
drawPng(`${gen}/ui-clock-ring.png`, sx, sy, 2);
drawPng(`${gen}/xeros.png`, sx + 60, sy, 2, [0, 0, 32, 48]);

mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/petite-carte-cadre.png', PNG.sync.write(out));
console.log('  ✓ .art-preview/petite-carte-cadre.png');

// --- le détail : le cadre de 63 entier, ×10, sur son remplissage, pour juger les pixels ---
{
  const inner = 63;
  const size = inner + 2 * FRAME_BORDER;
  const S = 10;
  const dw = size * S + 20;
  const d = new PNG({ width: dw, height: dw });
  for (let i = 0; i < d.data.length; i += 4) [d.data[i], d.data[i + 1], d.data[i + 2], d.data[i + 3]] = BG;
  const c0 = FRAME_BORDER + (inner - 1) / 2;
  const layers: [Canvas, number][] = [[mapFill(inner), 0], [minimapFrame(inner), 0], [playerDot('up'), c0 - DOT_CENTER]];
  for (const [L, o] of layers) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const k = L.get(x, y);
    if (k === '.') continue;
    const c = hex(FRAME_PALETTE[k]);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const di = (((10 + (y + o) * S + j) * dw) + 10 + (x + o) * S + i) << 2;
      d.data[di] = c[0]; d.data[di + 1] = c[1]; d.data[di + 2] = c[2];
    }
  }
  writeFileSync('.art-preview/petite-carte-cadre-detail.png', PNG.sync.write(d));
  console.log('  ✓ .art-preview/petite-carte-cadre-detail.png');
}
