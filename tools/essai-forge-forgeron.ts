// Planche du forgeron (chantier « forge », essai hors jeu) : npx tsx tools/essai-forge-forgeron.ts écrit
// .art-preview/forge-forgeron.png. Le dessin : art/proposals/forgeron.ts.
//
//   1. cheveux lâchés, rasé : de face, de profil, de dos, x4, avec Xéros de face et de profil, pieds sur la même ligne ;
//   2. cheveux attachés à la nuque, rasé : les mêmes vues ;
//   3. barbe courte : lâchés et attachés, de face et de profil ;
//   4. x2 et à la taille du jeu (x1), tous côte à côte avec Xéros et la mère ; en tête de planche, l'essai 1 en x1 pour comparer ;
//   5. le portrait 64 px (x2), rasé et avec la barbe courte, à côté de ceux de Xéros et de la mère.
// Repères en pointillé sur les figures x4 : le sommet du forgeron (y=8, 1,90 m), celui de Xéros (y=14, 1,60 m), le sol (y=46).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import * as smithArt from '../art/proposals/forgeron';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const PANEL: Rgb = [123, 133, 68]; // l'herbe g, pour juger les couleurs sur le sol du jeu
const GOLD: Rgb = [245, 215, 120];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const CYAN: Rgb = [140, 220, 235];
const ROSE: Rgb = [240, 140, 140];

function frame(name: string, anim: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forge-forgeron : pas de planche « ${name} »`);
  return { grid: s.animations[anim].frames[0], pal: s.palette };
}

/** Taille de la silhouette (pixels opaques hors ombre `x`). */
function measure(grid: Grid): { w: number; h: number } {
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === 'x') return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

interface Fig { grid: Grid; pal: Palette; label: string }
const smith = (f: smithArt.Facing, hair: smithArt.Hair, beard: boolean, label: string): Fig =>
  ({ grid: smithArt.smith(f, hair, beard), pal: smithArt.palette, label });
const xeros = (anim: string, label: string): Fig => ({ ...frame('xeros', anim), label });
const mother = (anim: string, label: string): Fig => ({ ...frame('mother', anim), label });

const K = 4;
const GAP = 20;
const PAD = 16;

interface Row { title: string; figs: Fig[]; k: number; marks: boolean }

const old = (f: smithArt.Facing, hair: smithArt.Hair, beard: boolean): Fig =>
  ({ grid: smithArt.essai1.smith(f, hair, beard), pal: smithArt.essai1.palette, label: '' });

const rows: Row[] = [
  {
    title: 'ESSAI 1, POUR COMPARER (X1)', k: 1, marks: false,
    figs: [
      old('down', 'loose', false), old('right', 'loose', false), old('up', 'loose', false),
      old('down', 'tied', false), old('right', 'tied', false), old('up', 'tied', false),
      old('down', 'loose', true), old('right', 'tied', true),
      xeros('idle-down', ''), xeros('idle-right', ''), mother('idle-down', ''), mother('idle-right', ''),
    ],
  },
  {
    title: 'CHEVEUX LACHES, RASE (X4)', k: K, marks: true,
    figs: [
      smith('down', 'loose', false, 'FACE'), smith('right', 'loose', false, 'PROFIL'), smith('up', 'loose', false, 'DOS'),
      xeros('idle-down', 'XEROS'), xeros('idle-right', 'XEROS'),
    ],
  },
  {
    title: 'CHEVEUX ATTACHES A LA NUQUE, RASE (X4)', k: K, marks: true,
    figs: [
      smith('down', 'tied', false, 'FACE'), smith('right', 'tied', false, 'PROFIL'), smith('up', 'tied', false, 'DOS'),
      xeros('idle-down', 'XEROS'), xeros('idle-right', 'XEROS'),
    ],
  },
  {
    title: 'BARBE COURTE (X4)', k: K, marks: true,
    figs: [
      smith('down', 'loose', true, 'LACHES'), smith('right', 'loose', true, 'LACHES'),
      smith('down', 'tied', true, 'ATTACHES'), smith('right', 'tied', true, 'ATTACHES'),
      xeros('idle-down', 'XEROS'),
    ],
  },
  {
    title: 'A LA TAILLE DU JEU (X2), AVEC XEROS ET LA MERE', k: 2, marks: false,
    figs: [
      smith('down', 'loose', false, ''), smith('right', 'loose', false, ''), smith('up', 'loose', false, ''),
      smith('down', 'tied', false, ''), smith('right', 'tied', false, ''), smith('up', 'tied', false, ''),
      smith('down', 'loose', true, ''), smith('right', 'tied', true, ''),
      xeros('idle-down', ''), xeros('idle-right', ''), mother('idle-down', ''), mother('idle-right', ''),
    ],
  },
  {
    title: 'ESSAI 2 (X1)', k: 1, marks: false,
    figs: [
      smith('down', 'loose', false, ''), smith('right', 'loose', false, ''), smith('up', 'loose', false, ''),
      smith('down', 'tied', false, ''), smith('right', 'tied', false, ''), smith('up', 'tied', false, ''),
      smith('down', 'loose', true, ''), smith('right', 'tied', true, ''),
      xeros('idle-down', ''), xeros('idle-right', ''), mother('idle-down', ''), mother('idle-right', ''),
    ],
  },
];

const portrait = smithArt.portrait();
const portraitBeard = smithArt.portrait(true);

const m = measure(smithArt.smith('down', 'loose', false));
const ms = measure(smithArt.smith('right', 'loose', false));
const mx = measure(frame('xeros', 'idle-down').grid);
const head = [
  'LE FORGERON DU VILLAGE - ESSAI (ART/PROPOSALS/FORGERON.TS)',
  `FORGERON DE FACE : ${m.w} X ${m.h} PX (ATTENDU 18 X 38 : 1,90 M) ; DE PROFIL : ${ms.w} X ${ms.h} PX ; XEROS : ${mx.w} X ${mx.h} PX (1,60 M)`,
  'POINTILLES : JAUNE, SOMMET DU FORGERON (Y=8) ; CYAN, SOMMET DE XEROS (Y=14) ; ROSE, LE SOL (Y=46)',
];

const rowW = (r: Row) => r.figs.length * (32 * r.k + GAP);
const rowH = (r: Row) => 12 + 8 + 48 * r.k + (r.marks ? 14 : 4) + GAP;
const portraitW = 4 * (64 * 2 + GAP);
const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map(rowW), rowW(rows[0]) + 120, portraitW);
const height = PAD + head.length * 12 + 12 + rows.reduce((s, r) => s + rowH(r), 0) + (portrait ? 64 * 2 + 40 : 0);
const sheet = new Sheet(width, height, BG);
head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));

let y = PAD + head.length * 12 + 12;
for (const r of rows) {
  sheet.text(r.title, PAD, y, GOLD, T);
  const oy = y + 20;
  const fw = 32 * r.k, fh = 48 * r.k;
  sheet.rect(PAD - 4, oy - 4, rowW(r) - GAP + 8, fh + 8, PANEL);
  r.figs.forEach((f, i) => {
    const ox = PAD + i * (fw + GAP);
    sheet.blit(f.grid, f.pal, ox, oy, r.k);
    if (f.label) sheet.text(f.label, ox, oy + fh + 4, WHITE, T);
  });
  if (r.marks) {
    const end = PAD + rowW(r) - GAP;
    const dash = (yy: number, c: Rgb) => { for (let i = PAD - 4; i < end + 4; i += 8) sheet.rect(i, yy, 4, 1, c); };
    dash(oy + 8 * r.k - 1, GOLD);
    dash(oy + 14 * r.k - 1, CYAN);
    dash(oy + 46 * r.k, ROSE);
  }
  y += rowH(r);
}
if (portrait) {
  sheet.text('PORTRAIT 64 PX (X2) : RASE, BARBE COURTE ; XEROS ET LA MERE', PAD, y, GOLD, T);
  const oy = y + 20;
  const px = frame('portrait-xeros-64', 'neutral');
  const pm = frame('portrait-mother-64', 'neutral');
  [portrait, portraitBeard, { grid: px.grid, pal: px.pal }, { grid: pm.grid, pal: pm.pal }]
    .forEach((p, i) => sheet.blit(p.grid, p.pal, PAD + i * (128 + GAP), oy, 2));
}

const out = join(ROOT, '.art-preview', 'forge-forgeron.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-forge-forgeron : face ${m.w} x ${m.h}, profil ${ms.w} x ${ms.h} -> ${out}`);
