// Planche d'essai du relief, façon B « la falaise peinte » (chantier « relief ») : npx tsx tools/essai-relief-b.ts écrit
// .art-preview/relief-b.png.
//
// La scène de 36 × 22 cases (le plateau à l'ouest, la falaise, la rivière coupée par le lit sec, la rive est), dessinée par
// art/proposals/relief-b.ts, avec les arbres et Xéros du jeu (src/generated/, lus sans y toucher ; art/characters/xeros.ts) :
//   1. la scène x2, sa grille de cases discrète, les numéros de colonnes et de rangées ;
//   2. le détail x4 de l'entrée du lit sec (la falaise, la coupure de l'eau, Xéros en bas) ;
//   3. les 4 images du miroitement x8, aux deux coupures.
// Ne touche ni au jeu ni à src/generated/.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { world } from '../art/palette';
import { COLS, ROWS, T, TREES, XEROS, bedLevel, scene, wallHeight } from '../art/proposals/relief-b';
import { Sheet, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: Rgb = [46, 52, 40];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];
const PAD = 24;

function generated(key: string): { grid: Grid; palette: Palette } {
  const file = join(ROOT, 'src', 'generated', `${key}.png`);
  if (!existsSync(file)) throw new Error(`essai-relief-b : ${file} manque (lancer npm run art)`);
  const png = PNG.sync.read(readFileSync(file));
  const palette: Palette = {};
  const codes = new Map<string, string>();
  const grid: Grid = [];
  for (let y = 0; y < png.height; y++) {
    let line = '';
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const a = png.data[i + 3];
      if (!a) { line += '.'; continue; }
      const hex = '#' + [0, 1, 2].map((k) => png.data[i + k].toString(16).padStart(2, '0')).join('') + (a < 255 ? a.toString(16).padStart(2, '0') : '');
      if (!codes.has(hex)) {
        const ch = String.fromCharCode(0x100 + codes.size);
        codes.set(hex, ch);
        palette[ch] = hex;
      }
      line += codes.get(hex);
    }
    grid.push(line);
  }
  return { grid, palette };
}

/** Pieds des arbres dans leur image (props.json, `tree.foot`). */
const FOOT: Record<string, [number, number]> = { 'normal-tree': [24, 161], 'big-tree': [33, 153] };
const FOOT_Y = 26; // les pieds dans la case

type Layer = { grid: Grid; palette: Palette; x: number; y: number };

function layers(frame: number): Layer[] {
  const objs: (Layer & { foot: number })[] = [];
  for (const t of TREES) {
    const g = generated(t.key);
    const [fx, fy] = FOOT[t.key];
    const foot = t.r * T + FOOT_Y;
    objs.push({ ...g, x: t.c * T + 16 - fx, y: foot - fy, foot });
  }
  for (const p of XEROS) {
    const foot = p.r * T + FOOT_Y;
    objs.push({ grid: xeros.animations[p.pose].frames[0], palette: xeros.palette, x: p.c * T, y: foot - 45, foot });
  }
  objs.sort((a, b) => a.foot - b.foot);
  return [{ grid: scene(frame), palette: world, x: 0, y: 0 }, ...objs];
}

const rgbOf = (hex: string): [Rgb, number] => {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [[n(0), n(2), n(4)], h.length === 8 ? n(6) / 255 : 1];
};

/** Pose la scène (ou le morceau `crop` en px du monde) sur la planche, agrandie de k. */
function draw(s: Sheet, ls: Layer[], ox: number, oy: number, k: number, crop = { x: 0, y: 0, w: COLS * T, h: ROWS * T }) {
  for (const l of ls) {
    l.grid.forEach((row, gy) => {
      const wy = l.y + gy;
      if (wy < crop.y || wy >= crop.y + crop.h) return;
      [...row].forEach((ch, gx) => {
        const wx = l.x + gx;
        if (ch === '.' || wx < crop.x || wx >= crop.x + crop.w) return;
        const [c, a] = rgbOf(l.palette[ch]);
        for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) s.dot(ox + (wx - crop.x) * k + i, oy + (wy - crop.y) * k + j, c, a);
      });
    });
  }
}

/** Grille de cases discrète sur un morceau posé. */
function grid(s: Sheet, ox: number, oy: number, k: number, crop: { x: number; y: number; w: number; h: number }, a = 0.18) {
  for (let x = Math.ceil(crop.x / T) * T; x <= crop.x + crop.w; x += T) for (let y = 0; y < crop.h * k; y++) s.dot(ox + (x - crop.x) * k, oy + y, [0, 0, 0], a);
  for (let y = Math.ceil(crop.y / T) * T; y <= crop.y + crop.h; y += T) for (let x = 0; x < crop.w * k; x++) s.dot(ox + x, oy + (y - crop.y) * k, [0, 0, 0], a);
}

// ---------- mise en page ----------

const K1 = 2, K2 = 4, K3 = 8;
const full = { x: 0, y: 0, w: COLS * T, h: ROWS * T };
const detail = { x: 19 * T, y: 5 * T, w: 12 * T, h: 11 * T };
const cuts = [
  { name: 'coupure nord (rangee 7 / lit)', crop: { x: 22 * T, y: 8 * T - 10, w: 56, h: 16 } },
  { name: 'coupure sud (lit / rangee 14)', crop: { x: 22 * T, y: 14 * T - 8, w: 56, h: 14 } },
];
const legend = [
  'B - LA FALAISE PEINTE : le monde reste plat a l ecran, la hauteur est peinte par des tuiles (rien n est decale)',
  'colonne 21 : face est de la falaise en raccourci (3 m -> 30 px), crete claire a gauche, pied mouille a droite ; ombre sur l eau vers l est',
  `paroi nord du lit : face sud en vraie grandeur sous la crete, 60 px (3 m) a l entree -> 0 en haut de la pente (${wallHeight(400)} px a la colonne 12)`,
  'paroi sud : seulement sa crete, un rebord qui s amincit ; fond du lit : terre tassee claire, galets, barres de galets nord-sud (la montee)',
  `pente : fond du lit a 0 m colonnes 21-26, ${String(bedLevel(12)).replace('.', ',')} m colonne 12, 3 m colonne 3 (10 %) ; riviere coupee net aux rangees 7 et 14, miroitement (4 images)`,
  'xeros : en bas (29,11), sur la pente (12,11), en haut (1,11), au bord de l eau (27,17) face a la falaise',
];

const sceneW = full.w * K1, sceneH = full.h * K1;
const detW = detail.w * K2, detH = detail.h * K2;
const cutW = cuts[0].crop.w * K3;
const width = Math.max(sceneW, detW + 2 * PAD + 4 * (cutW + 12)) + 2 * PAD + 30;
const yScene = 60;
const yLegend = yScene + sceneH + 30;
const yDetail = yLegend + legend.length * 16 + 40;
const height = yDetail + Math.max(detH, cuts.length * (cuts[0].crop.h * K3 + 50)) + 40;
const sheet = new Sheet(width, height, BG);

sheet.text('B - la falaise peinte', PAD, 16, GOLD, 5);
const sx = PAD + 30;
draw(sheet, layers(0), sx, yScene, K1);
grid(sheet, sx, yScene, K1, full);
for (let c = 0; c < COLS; c++) sheet.text(String(c), sx + c * T * K1 + 24, yScene - 14, GREY, 2);
for (let r = 0; r < ROWS; r++) sheet.text(String(r), PAD, yScene + r * T * K1 + 26, GREY, 2);
legend.forEach((l, i) => sheet.text(l, sx, yLegend + i * 16, i === 0 ? WHITE : GREY, 2));

sheet.text('detail x4 : l entree du lit sec (colonnes 19 a 30, rangees 5 a 15)', sx, yDetail - 18, WHITE, 2);
draw(sheet, layers(0), sx, yDetail, K2, detail);
grid(sheet, sx, yDetail, K2, detail, 0.12);

const cx0 = sx + detW + 2 * PAD;
sheet.text('miroitement x8, images 1 a 4', cx0, yDetail - 18, WHITE, 2);
cuts.forEach((cut, n) => {
  const y = yDetail + n * (cut.crop.h * K3 + 50);
  sheet.text(cut.name, cx0, y + 4, GREY, 2);
  for (let f = 0; f < 4; f++) {
    const x = cx0 + f * (cutW + 12);
    draw(sheet, [{ grid: scene(f), palette: world, x: 0, y: 0 }], x, y + 20, K3, cut.crop);
    sheet.text(String(f + 1), x, y + 24 + cut.crop.h * K3, GOLD, 2);
  }
});

const out = join(ROOT, '.art-preview', 'relief-b.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-relief-b -> ${out} (${width} x ${height})`);
console.log('hauteur de paroi par colonne :', Array.from({ length: 19 }, (_, i) => `${i + 3}:${wallHeight((i + 3) * T + 16)}`).join(' '));
