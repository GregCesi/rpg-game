// Planche du menton du portrait du forgeron, essai 5 (chantier « forgeron », essai hors jeu) :
// npx tsx tools/essai-forgeron-menton-portrait.ts écrit .art-preview/forgeron-menton-portrait.png. Le dessin :
// art/proposals/forgeron-tetes-portraits.ts, `portrait('T1', chin)` : M0 (T1 de l'essai 4), M1, M2, M3.
//   1. en x3 : M0 à M3, Xéros, la mère ; la légende donne la taille du visage ;
//   2. à la taille du jeu (x1) : les mêmes.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import { faceSize, portrait, type ChinVersion } from '../art/proposals/forgeron-tetes-portraits';
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
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-menton-portrait : pas de planche « ${name} »`);
  return { grid: s.animations.neutral.frames[0], pal: s.palette, label, size: '' };
}

const CHINS: ChinVersion[] = ['M0', 'M1', 'M2', 'M3'];
const NAMES: Record<ChinVersion, string> = { M0: 'M0 T1 ACTUELLE', M1: 'M1 LA BOSSE', M2: 'M2 EN AVANT', M3: 'M3 FORT' };
const head = (c: ChinVersion): Fig => {
  const { w, h } = faceSize('T1', c);
  return { ...portrait('T1', c), label: NAMES[c], size: `VISAGE ${w} X ${h}` };
};
const figs = (): Fig[] => [...CHINS.map(head), frame('portrait-xeros-64', 'XEROS'), frame('portrait-mother-64', 'LA MERE')];

interface Row { title: string; figs: Fig[]; k: number }
const rows: Row[] = [
  { title: 'LE MENTON DE T1 : SAILLANT, UN PEU PLUS POINTU, LA FOSSETTE (X3)', k: 3, figs: figs() },
  { title: 'A LA TAILLE DU JEU (X1)', k: 1, figs: figs().map((f) => ({ ...f, label: '', size: '' })) },
];

const GAP = 20;
const PAD = 16;
const top = [
  'LE FORGERON DU VILLAGE - LE MENTON DU PORTRAIT, ESSAI 5 (ART/PROPOSALS/FORGERON-TETES-PORTRAITS.TS)',
  'VISAGE : LARGEUR X HAUTEUR EN PX, DE LA LIGNE DES CHEVEUX AU MENTON ; AU-DESSUS DE LA BOUCHE, RIEN NE CHANGE',
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

const out = join(ROOT, '.art-preview', 'forgeron-menton-portrait.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-forgeron-menton-portrait -> ${out}`);
