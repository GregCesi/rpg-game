// La prise de vue des planches du chemin creux (chantier « relief », hors jeu) : le terrain rendu par une scène
// (art/proposals/relief-*-scene.ts), ce qui est posé, l'ombre, la pénombre du couloir, l'effacement du bord sud autour de Xéros.
// Commun à tools/essai-relief-final.ts et tools/essai-relief-final-corrections.ts.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import xeros from '../../art/characters/xeros';
import { world } from '../../art/palette';
import { hood } from '../../art/proposals/relief-creux3';
import * as fin from '../../art/proposals/relief-final-scene';
import { Sheet, type Rgb } from './audit-preview';

const { OY, RAKE, SH, TOP, W, XE, Z, floorZ, wallZ } = fin;
type Placed = fin.Placed;
type Rendered = fin.Rendered;

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BG: Rgb = [40, 44, 36];
export const FADE = 0.2;
export const GLOOM_MAX = 0.3;
export const GLOOM: Rgb = [0x0b, 0x16, 0x11];
const SHADOW: Rgb = [0x2b, 0x1a, 0x10];
const SHADOW_A = 0x40 / 255;
export const VW = 427;
export const VH = 240;

interface Img { w: number; h: number; rgba: Uint8Array; footX: number; footY: number }

function fromGrid(grid: Grid, palette: Palette, footX: number, footY: number): Img {
  const h = grid.length;
  const w = grid[0].length;
  const rgba = new Uint8Array(w * h * 4);
  grid.forEach((line, y) => [...line].forEach((ch, x) => {
    if (ch === '.') return;
    const hex = palette[ch].replace('#', '');
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    rgba.set([n(0), n(2), n(4), hex.length === 8 ? n(6) : 255], (y * w + x) * 4);
  }));
  return { w, h, rgba, footX, footY };
}

const FEET: Record<string, [number, number]> = {
  'big-tree': [33, 153], 'normal-tree': [24, 161], bush: [16, 28], 'bush-berries': [16, 28], 'decal-fern': [16, 16], 'decal-tufts': [16, 16],
};
const images = new Map<string, Img>();
export function imageOf(key: string): Img {
  if (images.has(key)) return images.get(key)!;
  let img: Img;
  if (key.startsWith('xeros-')) img = fromGrid(xeros.animations[`idle-${key.slice(6)}`].frames[0], xeros.palette, 16, 45);
  else if (key.startsWith('hood:')) {
    const [, seed, w, h, body] = key.split(':').map(Number);
    img = fromGrid(hood(w, h, body, seed).toGrid(), world, Math.floor(w / 2), h - 1);
  } else if (fin.OBJECTS[key]) {
    const o = fin.OBJECTS[key];
    img = fromGrid(o.grid, world, Math.floor(o.grid[0].length / 2), o.root);
  } else {
    const file = join(ROOT, 'src', 'generated', `${key}.png`);
    if (!existsSync(file)) throw new Error(`relief-final-shot : ${file} manque (lancer npm run art)`);
    const png = PNG.sync.read(readFileSync(file));
    const [fx, fy] = FEET[key] ?? [Math.floor(png.width / 2), png.height - 1];
    img = { w: png.width, h: png.height, rgba: new Uint8Array(png.data), footX: fx, footY: fy };
  }
  images.set(key, img);
  return img;
}

const hexRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const PAL = new Map(Object.entries(world).map(([k, v]) => [k, hexRgb(v)]));

/** Ce qu'une scène doit fournir (relief-creux4-scene, relief-final-scene, relief-final-v1-scene). */
export interface SceneModule {
  terrain(cut: boolean): fin.Terrain;
  render(t: fin.Terrain): Rendered;
  plants(t: fin.Terrain): Placed[];
  xerosAt(t: fin.Terrain, p: fin.Pose): Placed;
}

/**
 * Une scène : le terrain complet, le terrain sans le bord sud, ce qui est posé ; `floorGloom` : la part de la pénombre que reçoit
 * le sol du couloir (1 : toute, l'état validé ; FLOOR_GLOOM : la correction).
 */
export interface Scene { name: string; full: fin.Terrain; fullR: Rendered; cutR: Rendered; things: Placed[]; floorGloom: number; mod: SceneModule }
export function scene(name: string, mod: SceneModule, floorGloom = 1): Scene {
  const full = mod.terrain(false);
  return { name, full, fullR: mod.render(full), cutR: mod.render(mod.terrain(true)), things: mod.plants(full), floorGloom, mod };
}

/** L'ombre des feuillages de la voûte sur le couloir (colonne par colonne), en plus de la pénombre : forte sous le rideau. */
function vaultShade(sc: Scene): Float32Array {
  const shade = new Float32Array(W);
  for (const p of sc.things) {
    const isHood = p.key.startsWith('hood:');
    if (!isHood && !fin.OBJECTS[p.key]) continue;
    const w = imageOf(p.key).w;
    const strong = p.x > 1740;
    for (let x = Math.round(p.x - w / 2 + 8); x < p.x + w / 2 - 8; x++) {
      if (x < 0 || x >= W) continue;
      const edge = Math.min(x - (p.x - w / 2 + 8), p.x + w / 2 - 8 - x);
      shade[x] = Math.max(shade[x], (strong ? 0.75 : 0.16) * Math.min(1, edge / 20));
    }
  }
  return shade;
}

export interface Layer { sheet: Sheet; veil: Uint8Array; veg: Uint8Array }

function compose(sc: Scene, r: Rendered, xs: Placed[], fadeOn: boolean): Layer {
  const s = new Sheet(W, SH, BG);
  for (let y = 0; y < SH; y++) for (let x = 0; x < W; x++) {
    const ch = r.grid[y][x];
    if (ch !== '.') s.dot(x, y, PAL.get(ch) ?? [255, 0, 255]);
  }
  for (let i = 0; i < W * SH; i++) if (r.shadow[i]) s.dot(i % W, Math.floor(i / W), SHADOW, SHADOW_A);
  const veg = new Uint8Array(W * SH);
  const gl = Float32Array.from(r.gloom);
  const veil = new Uint8Array(W * SH * 4);
  const shade = vaultShade(sc);
  const xRects = xs.map((p) => ({ x0: p.x - 7, x1: p.x + 7, y0: p.y - p.z + OY - 33, y1: p.y - p.z + OY, foot: p.y }));
  for (const p of [...sc.things, ...xs].sort((a, b) => a.y - b.y || a.z - b.z)) {
    const img = imageOf(p.key);
    const isX = p.key.startsWith('xeros');
    const sx0 = Math.round(p.x) - img.footX;
    const sy0 = Math.round(p.y) - p.z + OY - img.footY + (p.hang ?? 0);
    const lx = p.lx ?? 0;
    const ly = p.ly ?? 0;
    const faded = fadeOn && p.vault && xRects.some((q) => q.foot < p.y && q.x1 > sx0 + Math.min(0, lx) && q.x0 < sx0 + img.w + Math.max(0, lx) && q.y1 > sy0 && q.y0 < sy0 + img.h + Math.max(0, ly));
    const xg = isX ? Math.max(0, wallZ(p.x) - floorZ(p.x)) / TOP : 0;
    for (let j = 0; j < img.h; j++) {
      const f = img.footY ? (Math.max(0, img.footY - j) / img.footY) ** 1.6 : 0;
      const ox = Math.round(lx * f);
      const oy = Math.round(ly * f);
      for (let i = 0; i < img.w; i++) {
        const o = (j * img.w + i) * 4;
        const a = img.rgba[o + 3];
        if (!a) continue;
        const x = sx0 + i + ox;
        const y = sy0 + j + oy;
        if (x < 0 || y < 0 || x >= W || y >= SH) continue;
        const k = y * W + x;
        if (!p.hang && r.dep[k] > p.y) continue;
        if (faded) {
          if (a === 255) veil.set([img.rgba[o], img.rgba[o + 1], img.rgba[o + 2], 255], k * 4);
          continue;
        }
        s.dot(x, y, [img.rgba[o], img.rgba[o + 1], img.rgba[o + 2]], a / 255);
        if (a === 255) { veg[k] = isX ? 2 : 1; gl[k] = isX ? xg : 0; }
      }
    }
  }
  for (let k = 0; k < W * SH; k++) {
    if (veg[k] === 1 || gl[k] <= 0) continue;
    const x = k % W;
    // le sol du couloir (ce que montre le pixel est le sol, pas Xéros) ne reçoit que `floorGloom` de la pénombre
    const onFloor = veg[k] === 0 && r.zone[k] === Z.FLOOR;
    const a = Math.min(0.85, GLOOM_MAX * Math.sqrt(gl[k]) + (veg[k] === 2 ? 0 : shade[x]));
    s.dot(x, Math.floor(k / W), GLOOM, onFloor ? a * sc.floorGloom : a);
  }
  return { sheet: s, veil, veg };
}

/** Le terrain avec Xéros aux poses données ; dans le couloir, le bord sud s'efface autour de lui (FADE). */
export function shot(sc: Scene, poses: fin.Pose[]): Layer {
  const xs = poses.map((p) => sc.mod.xerosAt(sc.full, p));
  const inside = xs.some((p) => p.x < XE - 30 && sc.full.zone[p.y * W + p.x] === Z.FLOOR);
  const piece = (x: number) => xs.some((p) => Math.abs(x - p.x) < VW / 2 + RAKE);
  const a = compose(sc, sc.fullR, xs, inside);
  if (inside) {
    const b = compose(sc, sc.cutR, xs, true);
    for (let k = 0; k < W * SH; k++) {
      const behind = sc.cutR.zone[k] === Z.FLOOR || sc.cutR.zone[k] === Z.NBANK;
      if (!(sc.fullR.dep[k] > sc.cutR.dep[k] + 1 && behind && piece(k % W))) continue;
      const o = k * 4;
      a.sheet.dot(k % W, Math.floor(k / W), [b.sheet.png.data[o], b.sheet.png.data[o + 1], b.sheet.png.data[o + 2]], 1 - FADE);
    }
  }
  for (let k = 0; k < W * SH; k++) if (a.veil[k * 4 + 3]) a.sheet.dot(k % W, Math.floor(k / W), [a.veil[k * 4], a.veil[k * 4 + 1], a.veil[k * 4 + 2]], FADE);
  return a;
}

/** Copie un cadre de `src` dans `dst`, agrandi `k` fois. */
export function copy(src: Sheet, sx0: number, sy0: number, w: number, h: number, dst: Sheet, dx: number, dy: number, k: number) {
  const sx = Math.round(sx0);
  const sy = Math.round(sy0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ax = sx + x;
    const ay = sy + y;
    let c: Rgb = BG;
    if (ax >= 0 && ay >= 0 && ax < src.w && ay < src.h) { const i = (ay * src.w + ax) * 4; c = [src.png.data[i], src.png.data[i + 1], src.png.data[i + 2]]; }
    dst.rect(dx + x * k, dy + y * k, k, k, c);
  }
}

export function save(sheet: Sheet, name: string, who: string) {
  const out = join(ROOT, '.art-preview', name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`${who} -> ${out} (${sheet.w} x ${sheet.h})`);
}
