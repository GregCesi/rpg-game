// Planche des trois têtes du portrait du forgeron (chantier « forgeron », essai 4, hors jeu) :
// npx tsx tools/essai-forgeron-tete-portrait.ts écrit .art-preview/forgeron-tetes-portrait.png. Le dessin :
// art/proposals/forgeron-tetes-portraits.ts ; pour comparer, l'essai 3 C rasé (art/proposals/forgeron-portraits.ts).
//
//   1. en x3 : T1, T2, T3, l'essai 3 C, Xéros, la mère ; chaque légende donne la largeur et la hauteur du visage en px ;
//   2. à la taille du jeu (x1) : les mêmes.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import { portrait as essai3 } from '../art/proposals/forgeron-portraits';
import { faceSize, portrait, type HeadVersion } from '../art/proposals/forgeron-tetes-portraits';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const PANEL: Rgb = [74, 66, 56];
const GOLD: Rgb = [245, 215, 120];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];

interface Fig { grid: Grid; pal: Palette; label: string; size: string }

function frame(name: string, label: string): Fig {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-tete-portrait : pas de planche « ${name} »`);
  return { grid: s.animations.neutral.frames[0], pal: s.palette, label, size: '' };
}

const NAMES: Record<HeadVersion, string> = { T1: 'T1 LE RECTANGLE', T2: 'T2 L ECU', T3: 'T3 LA LAME' };
const head = (v: HeadVersion): Fig => {
  const { w, h } = faceSize(v);
  return { ...portrait(v), label: NAMES[v], size: `VISAGE ${w} X ${h}` };
};
// L'essai 3 C : visage de 12,5 px de demi-largeur (25 px), du haut du front dégagé (rangée 18 au milieu) au menton (45).
const oldC = (): Fig => {
  const p = essai3('C', false);
  let top = 0;
  while (top < 64 && !'slcSD'.includes(p.grid[top][32])) top++;
  return { ...p, label: 'ESSAI 3 C', size: `VISAGE 25 X ${45 - top}` };
};

const figs = (): Fig[] => [head('T1'), head('T2'), head('T3'), oldC(), frame('portrait-xeros-64', 'XEROS'),
  frame('portrait-mother-64', 'LA MERE')];

interface Row { title: string; figs: Fig[]; k: number }
const rows: Row[] = [
  { title: 'TROIS TETES, LES CHEVEUX DE C, RASE AVEC LA MOUSTACHE (X3)', k: 3, figs: figs() },
  { title: 'A LA TAILLE DU JEU (X1)', k: 1, figs: figs().map((f) => ({ ...f, label: '', size: '' })) },
];

const GAP = 20;
const PAD = 16;
const top = [
  'LE FORGERON DU VILLAGE - LA TETE DU PORTRAIT, ESSAI 4 (ART/PROPOSALS/FORGERON-TETES-PORTRAITS.TS)',
  'VISAGE : LARGEUR X HAUTEUR EN PX, DE LA LIGNE DES CHEVEUX AU MENTON',
];
const rowW = (r: Row) => r.figs.length * (64 * r.k + GAP);
const rowH = (r: Row) => 20 + 64 * r.k + (r.k > 1 ? 30 : 6) + GAP;
const width = PAD * 2 + Math.max(...top.map((h) => textWidth(h, T)), ...rows.map(rowW), ...rows.map((r) => textWidth(r.title, T)));
const height = PAD + top.length * 12 + 12 + rows.reduce((s, r) => s + rowH(r), 0);
const sheet = new Sheet(width, height, BG);
top.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));

let y = PAD + top.length * 12 + 12;
for (const r of rows) {
  sheet.text(r.title, PAD, y, GOLD, T);
  const oy = y + 20;
  const fw = 64 * r.k;
  sheet.rect(PAD - 4, oy - 4, rowW(r) - GAP + 8, fw + 8, PANEL);
  r.figs.forEach((f, i) => {
    const ox = PAD + i * (fw + GAP);
    sheet.blit(f.grid, f.pal, ox, oy, r.k);
    if (f.label) sheet.text(f.label, ox, oy + fw + 6, WHITE, T);
    if (f.size) sheet.text(f.size, ox, oy + fw + 18, GREY, T);
  });
  y += rowH(r);
}

const out = join(ROOT, '.art-preview', 'forgeron-tetes-portrait.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-forgeron-tete-portrait -> ${out}`);
