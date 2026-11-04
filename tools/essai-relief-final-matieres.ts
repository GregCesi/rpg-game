// Planche des matières et objets définitifs du chemin creux (chantier « relief », hors jeu) :
//   npx tsx tools/essai-relief-final-matieres.ts  ->  .art-preview/relief-final-1-matieres.png
// Chaque dessin seul, nommé, à x1 et x4 ; les tuiles bank en 3 × 3 (raccord), le terrain lane avec ses masques et son raccord au
// chemin, les faces avec leurs variantes côte à côte, le miroitement en 4 images. Vérifie aussi la taille de chaque objet au
// gabarit (src/content/gabarit.ts). Dessins : art/proposals/relief-final.ts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import xeros from '../art/characters/xeros';
import type { Canvas, Grid } from '../art/lib/canvas';
import { world } from '../art/palette';
import {
  bankTile, curtain, faceEarth, facePlanted, facePlantedEdge, faceWet, lane, lip, overhang, pathLane, PROPS, rakedEast, rakedWest, rotate, shimmer, waterCut,
} from '../art/proposals/relief-final';
import tileset from '../art/world/tiles';
import { expectedSize, silhouette, type Dims } from '../src/content/gabarit';
import { Sheet, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG: Rgb = [40, 44, 36];
const GOLD: Rgb = [245, 215, 120];
const GREY: Rgb = [215, 215, 200];
const RED: Rgb = [240, 90, 70];
const XG = xeros.animations['idle-down'].frames[0];

const s = new Sheet(1900, 3100, BG);
const PAD = 24;
s.text('1 - matieres et objets du chemin creux (definitifs, a valider)', PAD, 14, GOLD, 4);
const g = (c: Canvas | Grid) => (Array.isArray(c) ? c : c.toGrid());
const put = (c: Canvas | Grid, x: number, y: number, k: number) => s.blit(g(c), world, x, y, k);
const label = (t: string, x: number, y: number, c: Rgb = GREY) => s.text(t, x, y, c, 2);

// --- bank : 3 × 3 au hasard des variantes, x1 et x4 ; chaque variante seule
let y = 60;
label('bank-0..3 (32 x 32) : chaque variante, puis 3 x 3 au hasard (raccord), x1 et x4', PAD, y, GOLD);
y += 20;
const banks = [0, 1, 2, 3].map((k) => bankTile(k));
banks.forEach((b, k) => { put(b, PAD + k * 140, y, 4); label(`bank-${k}`, PAD + k * 140, y + 132); });
const order = [[0, 2, 1], [3, 1, 0], [2, 0, 3]];
const bx = PAD + 4 * 140 + 20;
order.forEach((row, j) => row.forEach((k, i) => put(banks[k], bx + i * 32, y + j * 32, 1)));
order.forEach((row, j) => row.forEach((k, i) => put(banks[k], bx + 120 + i * 128, y + j * 128, 4)));
s.blit(XG, xeros.palette, bx + 30, y + 40, 1, [14, 45]);
s.blit(XG, xeros.palette, bx + 120 + 140, y + 90, 4, [14, 45]);
y += 3 * 128 + 30;

// --- faces sud : earth 0..2 côte à côte, wet 0..1, lip 0..1 posée dessus ; x1 et x4
label('relief-face-earth-0..2 (64 x 100) cote a cote, puis relief-face-wet-0..1 ; relief-lip-0..1 (64 x 12) posee sur l arete (rangee 4)', PAD, y, GOLD);
y += 20;
const faces = [faceEarth(0), faceEarth(1), faceEarth(2), faceWet(0), faceWet(1)];
const lips = [lip(0), lip(1)];
const fy = y + 8;
faces.forEach((f, i) => { put(f, PAD + i * 64, fy, 1); put(lips[i % 2], PAD + i * 64, fy - 4, 1); });
s.blit(XG, xeros.palette, PAD + 30, fy + 100 - 46, 1, [14, 45]);
// x4 : trois faces sèches et une mouillée, avec la lèvre
const fx4 = PAD + 5 * 64 + 30;
[faces[0], faces[1], faces[3]].forEach((f, i) => { put(f, fx4 + i * 256, fy, 4); put(lips[i % 2], fx4 + i * 256, fy - 16, 4); });
s.blit(XG, xeros.palette, fx4 + 80, fy + 400 - 184, 4, [14, 45]);
label('earth-0', fx4, fy + 410); label('earth-1', fx4 + 256, fy + 410); label('wet-0', fx4 + 512, fy + 410);
// la face coupée par le haut : 40 px (2 m) et 20 px (1 m), avec la lèvre
label('coupees : 2 m, 1 m', PAD, fy + 120);
[40, 20].forEach((hh, i) => {
  const f = faces[1].toGrid().slice(100 - hh);
  put(f, PAD + i * 80, fy + 140 + (40 - hh), 1);
  put(lips[i], PAD + i * 80, fy + 140 + (40 - hh) - 4, 1);
});
// les lèvres seules x4
put(lips[0], PAD, fy + 210, 4); put(lips[1], PAD + 270, fy + 210, 4);
label('lip-0, lip-1 (x4)', PAD, fy + 264);
y = fy + 440;

// --- le flanc planté (correction de Grégoire, 4 nov.) : earth | planted-edge | planted 0 | planted 1 | planted 0, raccordés
label('relief-face-planted-0..1 et relief-face-planted-edge-0..1 (64 x 100) : earth-0 | edge-0 | planted-0 | planted-1 | planted-0 ; puis edge-1, x1 et x4', PAD, y, GOLD);
y += 20;
{
  const py = y + 8;
  const row = [faceEarth(0), facePlantedEdge(0), facePlanted(0), facePlanted(1), facePlanted(0)];
  row.forEach((f, i) => { put(f, PAD + i * 64, py, 1); put(lips[i % 2], PAD + i * 64, py - 4, 1); });
  put(facePlantedEdge(1), PAD, py + 120, 1); put(facePlanted(1), PAD + 64, py + 120, 1);
  label('edge-1 | planted-1', PAD, py + 226);
  s.blit(XG, xeros.palette, PAD + 150, py + 100 - 46, 1, [14, 45]);
  const px4 = PAD + 5 * 64 + 30;
  [facePlantedEdge(0), facePlanted(0), facePlanted(1)].forEach((f, i) => { put(f, px4 + i * 256, py, 4); put(lips[i % 2], px4 + i * 256, py - 16, 4); });
  s.blit(XG, xeros.palette, px4 + 330, py + 400 - 184, 4, [14, 45]);
  label('edge-0', px4, py + 410); label('planted-0', px4 + 256, py + 410); label('planted-1', px4 + 512, py + 410);
  y = py + 440;
}

// --- raked
label('relief-face-raked-0..1 (24 x 64 : 12 de face + 12 de lierre sur l eau) et relief-face-raked-west-0..1 (12 x 64), x1 et x4, empiles 2 fois', PAD, y, GOLD);
y += 20;
const water = (x: number, yy: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = tileset.tiles['water-15'][j % 32][i % 32];
    const hex = (world as Record<string, string>)[ch];
    s.rect(x + i * k, yy + j * k, k, k, [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16)) as Rgb);
  }
};
const rk = [rakedEast(0), rakedEast(1)];
const rw = [rakedWest(0), rakedWest(1)];
water(PAD, y, 60, 128, 1);
rk.forEach((c, i) => { put(c, PAD + i * 30, y, 1); put(c, PAD + i * 30, y + 64, 1); });
rw.forEach((c, i) => { put(c, PAD + 70 + i * 16, y, 1); put(c, PAD + 70 + i * 16, y + 64, 1); });
water(PAD + 120, y, 30, 128, 4);
water(PAD + 250, y, 30, 64, 4);
rk.forEach((c, i) => { put(c, PAD + 120 + i * 130, y, 4); });
put(rk[0], PAD + 120, y + 256, 4);
rw.forEach((c, i) => { put(c, PAD + 400 + i * 60, y, 4); put(c, PAD + 400 + i * 60, y + 256, 4); });
label('east-0 / east-1 (x4)', PAD + 120, y + 516); label('west-0 / west-1', PAD + 400, y + 516);
y += 540;

// --- lane : 16 masques, intérieur, raccord au chemin
label('lane-<mask> (16) et lane-<mask>-2..4 ; path-lane-w / path-lane-e (le chemin qui touche le couloir) ; x2', PAD, y, GOLD);
y += 20;
for (let m = 0; m < 16; m++) { put(lane(m), PAD + m * 70, y, 2); label(String(m), PAD + m * 70, y + 68); }
y += 90;
[2, 3, 4].forEach((v, i) => put(lane(14, v), PAD + i * 70, y, 2));
label('14-2  14-3  14-4', PAD, y + 68);
// un bout de couloir de 6 tuiles sur 2, raccordé au chemin des deux côtés (x2)
const strip: [string, Grid][][] = [];
const pt = tileset.tiles;
const rowA: [string, Grid][] = [['path', pt['path-10']], ['ple', pathLane(10, 'e', pt['path-10']).toGrid()]];
const rowB: [string, Grid][] = [['grass', pt.grass], ['grass', pt.grass2]];
for (let i = 0; i < 6; i++) rowA.push(['l', lane(14, i % 4 ? (i % 4) + 1 : 0).toGrid()]);
for (let i = 0; i < 6; i++) rowB.push(['l', lane(i === 0 ? 3 : i === 5 ? 9 : 11, (i + 2) % 4 ? ((i + 2) % 4) + 1 : 0).toGrid()]);
rowA.push(['plw', pathLane(10, 'w', pt['path-10']).toGrid()], ['path', pt['path-10']]);
rowB.push(['grass', pt.grass3], ['grass', pt.grass]);
strip.push(rowA, rowB);
const sx0 = PAD + 260;
strip.forEach((row, j) => row.forEach(([, t], i) => put(t, sx0 + i * 64, y - 30 + j * 64, 2)));
s.blit(XG, xeros.palette, sx0 + 4 * 64, y - 30 + 20, 2, [14, 45]);
label('plateau  <- path | path-lane-e | lane ... lane | path-lane-w | path ->  ferme   (rangee du haut ; rangee du bas : le couloir se ferme)', sx0, y + 104);
y += 140;

// --- objets
label('objets (x1 a gauche, x2 ou x4 a droite) ; ligne rouge : la rangee d enracinement (la crete du talus)', PAD, y, GOLD);
y += 20;
const objs: [string, Canvas][] = [['lane-curtain', curtain()], ['lane-overhang-1', overhang(1)], ['lane-overhang-2', overhang(2)], ['lane-overhang-3', overhang(3)]];
let ox = PAD;
const sizes: string[] = [];
for (const [name, c] of objs) {
  put(c, ox, y, 1);
  const root = PROPS[name as keyof typeof PROPS].root;
  for (let i = 0; i < c.w; i += 2) s.dot(ox + i, y + root, RED);
  label(name, ox, y + c.h + 6);
  s.blit(XG, xeros.palette, ox + c.w + 4, y + c.h - 46, 1, [14, 45]);
  ox += c.w + 30;
}
y += 110;
put(objs[0][1], PAD, y, 2);
s.blit(XG, xeros.palette, PAD + 470, y + 168 - 92, 2, [14, 45]);
put(objs[1][1], PAD + 520, y, 2);
put(objs[2][1], PAD + 860, y, 2);
put(objs[3][1], PAD + 1130, y, 2);
y += 180;
// water-cut et shimmer
label('water-cut (32 x 4) et ses vues r1 r2 r3 ; shimmer (32 x 3), 4 images, et shimmer-ns ; x4, sur l eau', PAD, y, GOLD);
y += 20;
water(PAD, y, 330, 70, 1);
const wc = waterCut();
put(wc, PAD + 4, y + 4, 4); put(rotate(wc, 2), PAD + 140, y + 4, 4);
put(rotate(wc, 1), PAD + 280, y + 4, 2); put(rotate(wc, 3), PAD + 300, y + 4, 2);
for (let f = 0; f < 4; f++) {
  water(PAD + 360 + f * 150, y, 140, 30, 1);
  put(shimmer(f), PAD + 362 + f * 150, y + 6, 4);
  put(waterCut(), PAD + 362 + f * 150, y - 10 + 6, 4);
  label(`image ${f}`, PAD + 362 + f * 150, y + 32);
}
// le miroitement en longueur, x2, 4 segments raccordés
for (let f = 0; f < 4; f++) {
  water(PAD + 360, y + 50 + f * 14, 256, 12, 1);
  for (let i = 0; i < 4; i++) { put(waterCut(), PAD + 360 + i * 64, y + 50 + f * 14, 2); put(shimmer(f), PAD + 360 + i * 64, y + 50 + f * 14 + 8, 2); }
}
y += 120;

// --- gabarit
label('gabarit : dims (cm) -> taille attendue (px) / dessinee (silhouette, contour compris)', PAD, y, GOLD);
y += 20;
const all: [string, Canvas][] = [...objs, ['water-cut', wc], ['shimmer', shimmer(1)]];
for (const [name, c] of all) {
  const p = PROPS[name as keyof typeof PROPS];
  const e = expectedSize(p.dims as unknown as Dims);
  const sil = silhouette(c.toGrid(), world);
  const ok = Math.abs(sil.w - e.w) <= 2 && Math.abs(sil.h - e.h) <= 2;
  const line = `${name} : ${p.dims.w} x ${p.dims.d} x ${p.dims.h} cm ${p.dims.shape} -> ${e.w.toFixed(0)} x ${e.h.toFixed(0)} / ${sil.w} x ${sil.h} ${ok ? 'ok' : 'ECART'}`;
  sizes.push(line);
  label(line, PAD, y, ok ? GREY : RED);
  y += 16;
}
console.log(sizes.join('\n'));
const out = join(ROOT, '.art-preview', 'relief-final-1-matieres.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(s.png));
console.log(`-> ${out} (y final ${y})`);
