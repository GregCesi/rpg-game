// Planche de la proposition A du relief (chantier « relief », essai hors jeu) : npx tsx tools/essai-relief-a.ts écrit
// .art-preview/relief-a.png.
//
// « A, le plateau soulevé » : la scène de 36 × 22 cases (art/proposals/relief-a-scene.ts) dans la vraie projection du jeu, x2,
// sur sa grille de cases (celle de l'écran, donc du sol à 0 m) ; dessous, le détail x4 de l'entrée du lit sec (la falaise, la
// coupure de l'eau, Xéros en bas), puis les quatre images du miroitement x8, aux deux coupures.
// Les arbres sont ceux du jeu (src/generated/, lus sans y toucher ; lancer `npm run art` s'ils manquent), Xéros aussi
// (art/characters/xeros.ts). Ne touche ni au jeu ni à src/generated/.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { world } from '../art/palette';
import { SHIMMER_FRAMES } from '../art/proposals/relief-a';
import { COLS, H, ROWS, TOP, TREES, W, XEROS, bedZ, heightAt, render, type Placed } from '../art/proposals/relief-a-scene';
import { Sheet, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: Rgb = [40, 44, 36];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [215, 215, 200];
const GOLD: Rgb = [245, 215, 120];
const LINE: Rgb = [255, 250, 230];

/** Une image du jeu (src/generated/<clé>.png) en grille et palette. */
function generated(key: string): { grid: Grid; palette: Palette } {
  const file = join(ROOT, 'src', 'generated', `${key}.png`);
  if (!existsSync(file)) throw new Error(`essai-relief-a : ${file} manque (lancer npm run art)`);
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
      if (!codes.has(hex)) { const ch = String.fromCharCode(0x100 + codes.size); codes.set(hex, ch); palette[ch] = hex; }
      line += codes.get(hex);
    }
    grid.push(line);
  }
  return { grid, palette };
}

const images = new Map<string, { grid: Grid; palette: Palette }>();
const imageOf = (key: string) => {
  if (key === 'xeros') return { grid: xeros.animations['idle-down'].frames[0], palette: xeros.palette };
  if (key === 'xeros-left') return { grid: xeros.animations['idle-left'].frames[0], palette: xeros.palette };
  if (!images.has(key)) images.set(key, generated(key));
  return images.get(key)!;
};

/** Le pied à l'écran : le sol du monde soulevé de sa hauteur. */
const screenOf = (p: Placed) => ({ x: p.x, y: p.y - heightAt(p.x, p.y) });

/** La scène à l'échelle 1 (W × H), image `f` du miroitement : le terrain, son ombre portée, puis les arbres et Xéros du nord au sud. */
function scene(f: number): Sheet {
  const s = new Sheet(W, H, BG);
  const r = render(f);
  s.blit(r.grid, world, 0, 0, 1);
  const shadow: Rgb = [0x2b, 0x1a, 0x10];
  for (let i = 0; i < W * H; i++) if (r.shadow[i]) s.dot(i % W, Math.floor(i / W), shadow, 0x40 / 255);
  for (const p of [...TREES, ...XEROS].sort((a, b) => a.y - b.y)) {
    const img = imageOf(p.key);
    const at = screenOf(p);
    if (p.key.startsWith('xeros')) s.blit(img.grid, img.palette, at.x - 16, at.y - 45, 1);
    else s.blit(img.grid, img.palette, at.x - Math.floor(img.grid[0].length / 2), at.y + 7 - img.grid.length, 1);
  }
  return s;
}

/** Copie agrandie d'un morceau d'une planche dans une autre. */
function copy(src: Sheet, sx: number, sy: number, w: number, h: number, dst: Sheet, dx: number, dy: number, k: number) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((sy + y) * src.w + sx + x) * 4;
    const c: Rgb = [src.png.data[i], src.png.data[i + 1], src.png.data[i + 2]];
    dst.rect(dx + x * k, dy + y * k, k, k, c);
  }
}

const frames = Array.from({ length: SHIMMER_FRAMES }, (_, f) => scene(f));

// ---------- mise en page ----------

const PAD = 24;
const K = 2;
const MX = 40; // marge des numéros de rangée
const sceneTop = 80;
const sceneH = H * K;
const sceneW = W * K;
const legendTop = sceneTop + sceneH + 30;
const LEGEND = [
  '1  le plateau, 3 m plus haut : son sol, ses arbres et Xeros sont dessines 60 px plus haut (z / 5 cm)',
  '2  la falaise est vue par la tranche : une levre de roche de 2 a 4 px (la derniere colonne a l ombre), le pied mouille (eau sombre',
  '   contre la roche, ecume cassee) et l ombre portee sur l eau, calculee comme celle des toits (SHADOW : 0,25 z vers l est) : 15 px',
  '3  la paroi nord du lit regarde le sud : vue en vraie grandeur, 60 px a l entree, 0 en haut de la pente (3 m - le fond du lit)',
  '4  le bord avant du plateau sud, en surplomb : la crete claire, des touffes qui pendent ; il cache le pied de la paroi sud',
  '5  le lit sec, nouvelle tuile (terre tassee, sable, galets) : chaque colonne soulevee de son fond, de 0 a 60 px sur 30 m (10 %) ;',
  '   la trace du chemin s y perd en montant, puis un sentier sur le plateau',
  '6  la riviere coupee net au bord du lit, des deux cotes : le miroitement (4 images, detail plus bas)',
  '7  Xeros : en bas (0 m), sur la pente (1,5 m), en haut (3 m), et au bord de l eau face a la falaise',
];
const detail = { x: 600, y: 150, w: 360, h: 330, k: 4 };
const detailTop = legendTop + LEGEND.length * 16 + 40;
const cuts = [
  { name: 'coupure nord (bord nord du lit)', x: 704, y: 247, w: 56, h: 14 },
  { name: 'coupure sud (bord sud du lit)', x: 704, y: 441, w: 56, h: 14 },
];
const SK = 8;
const shimmerTop = detailTop + 30 + detail.h * detail.k + 40;
const shimmerRowH = 30 + cuts[0].h * SK + 20;
const width = Math.max(MX + sceneW + 2 * PAD, PAD + SHIMMER_FRAMES * (cuts[0].w * SK + 24) + PAD);
const height = shimmerTop + cuts.length * shimmerRowH + 20;
const sheet = new Sheet(width, height, BG);

sheet.text('A - le plateau souleve', PAD, 16, GOLD, 5);
sheet.text(`scene de ${COLS} X ${ROWS} cases (32 px = 1,60 m), x2, vraie projection du jeu ; grille : les cases au sol a 0 m (l ecran)`, PAD, 50, GREY, 2);

// la scène et sa grille
const ox = PAD + MX;
copy(frames[0], 0, 0, W, H, sheet, ox, sceneTop, K);
for (let c = 0; c <= COLS; c++) for (let y = 0; y < sceneH; y++) sheet.dot(ox + c * 32 * K, sceneTop + y, LINE, 0.16);
for (let r = 0; r <= ROWS; r++) for (let x = 0; x < sceneW; x++) sheet.dot(ox + x, sceneTop + r * 32 * K, LINE, 0.16);
for (let c = 0; c < COLS; c++) sheet.text(String(c), ox + c * 32 * K + 26, sceneTop - 14, GREY, 2);
for (let r = 0; r < ROWS; r++) sheet.text(String(r), PAD, sceneTop + r * 32 * K + 28, GREY, 2);

/** Un repère numéroté sur la scène, au point (x, y) de l'écran du jeu. */
function mark(n: number, x: number, y: number) {
  const px = ox + x * K, py = sceneTop + y * K;
  sheet.rect(px - 9, py - 9, 18, 18, [30, 26, 20]);
  sheet.outline(px - 9, py - 9, 18, 18, GOLD);
  sheet.text(String(n), px - 3, py - 5, GOLD, 2);
}
mark(1, 300, 120);
mark(2, 690, 560);
mark(3, 330, 222);
mark(4, 250, 400);
mark(5, 520, 300);
mark(6, 790, 268);
for (const p of XEROS) { const s = screenOf(p); mark(7, s.x + 16, s.y - 28); }

LEGEND.forEach((l, i) => sheet.text(l, PAD, legendTop + i * 16, i % 1 === 0 && !l.startsWith('  ') ? WHITE : GREY, 2));

// le détail x4 de l'entrée du lit
sheet.text(`detail x4 : l entree du lit sec (colonnes ${Math.floor(detail.x / 32)} a ${Math.floor((detail.x + detail.w) / 32)}), la falaise, les coupures, Xeros en bas`, PAD, detailTop, GOLD, 3);
copy(frames[0], detail.x, detail.y, detail.w, detail.h, sheet, PAD, detailTop + 30, detail.k);
const notes = [
  `fond du lit : ${bedZ(704)} px a la colonne 22, ${bedZ(400)} px sous Xeros (colonne 12), ${bedZ(96)} px a la colonne 3`,
  `paroi nord : ${TOP - bedZ(703)} px a l entree (3 m)`,
  'la face est de la falaise ne se voit pas (verticale, vue de dessus) :',
  'la levre claire, la derniere colonne sombre, l eau sombre au pied, l ecume,',
  'l ombre portee de 15 px font le bord',
];
notes.forEach((l, i) => sheet.text(l, PAD + detail.w * detail.k + 24, detailTop + 40 + i * 16, GREY, 2));

// le miroitement, ses quatre images x8
cuts.forEach((c, j) => {
  const y0 = shimmerTop + j * shimmerRowH;
  sheet.text(`miroitement x8, ${c.name} : les ${SHIMMER_FRAMES} images (de gauche a droite)`, PAD, y0, GOLD, 3);
  for (let f = 0; f < SHIMMER_FRAMES; f++) copy(frames[f], c.x, c.y, c.w, c.h, sheet, PAD + f * (c.w * SK + 24), y0 + 30, SK);
});

const out = join(ROOT, '.art-preview', 'relief-a.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
// la scène seule, à l'échelle 1, pour la comparer à la planche B
writeFileSync(join(ROOT, '.art-preview', 'relief-a-scene.png'), PNG.sync.write(frames[0].png));
console.log(`essai-relief-a -> ${out} (${width} x ${height})`);
