// Planche des portraits du forgeron (chantier « forgeron », essai hors jeu) : npx tsx tools/essai-forgeron-portrait.ts écrit
// .art-preview/forgeron-portrait.png. Le dessin : art/proposals/forgeron-portraits.ts (une tête par variante du sprite,
// art/proposals/forgeron-colosse.ts).
//
//   1. rasé, moustache (x2) : A, B, C, puis Xéros et la mère ;
//   2. barbe de quelques jours (x2) : A, B, C, puis Xéros et la mère ;
//   3. à la taille du jeu (x1) : les six, Xéros et la mère.
// Avec FORGERON_PORTRAIT_X4=<chemin>, écrit aussi les six en x4 à ce chemin (pour regarder de près pendant le dessin).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import { portrait, type Variant } from '../art/proposals/forgeron-portraits';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const PANEL: Rgb = [74, 66, 56];
const GOLD: Rgb = [245, 215, 120];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];

interface Fig { grid: Grid; pal: Palette; label: string }

function frame(name: string, label: string): Fig {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-portrait : pas de planche « ${name} »`);
  return { grid: s.animations.neutral.frames[0], pal: s.palette, label };
}

const NAMES: Record<Variant, string> = { A: 'A LE CHENE', B: 'B LE BOEUF', C: 'C LE GEANT' };
const smith = (v: Variant, stub: boolean, label = NAMES[v]): Fig => ({ ...portrait(v, stub), label });
const xeros = (label = 'XEROS') => frame('portrait-xeros-64', label);
const mother = (label = 'LA MERE') => frame('portrait-mother-64', label);

interface Row { title: string; figs: Fig[]; k: number }
const rows: Row[] = [
  { title: 'RASE, MOUSTACHE (X2)', k: 2, figs: [smith('A', false), smith('B', false), smith('C', false), xeros(), mother()] },
  { title: 'BARBE DE QUELQUES JOURS, MOUSTACHE GARDEE (X2)', k: 2, figs: [smith('A', true), smith('B', true), smith('C', true), xeros(), mother()] },
  {
    title: 'A LA TAILLE DU JEU (X1) : RASE A B C, BARBE A B C, XEROS, LA MERE', k: 1,
    figs: [smith('A', false, ''), smith('B', false, ''), smith('C', false, ''), smith('A', true, ''), smith('B', true, ''),
      smith('C', true, ''), xeros(''), mother('')],
  },
];

const GAP = 20;
const PAD = 16;
const head = [
  'LE FORGERON DU VILLAGE - PORTRAITS 64 PX (ART/PROPOSALS/FORGERON-PORTRAITS.TS)',
  'UNE TETE PAR VARIANTE DU SPRITE (FORGERON-COLOSSE.TS) ; A RECOMMANDEE',
];
const rowW = (r: Row) => r.figs.length * (64 * r.k + GAP);
const rowH = (r: Row) => 20 + 64 * r.k + (r.k > 1 ? 18 : 6) + GAP;
const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map(rowW), ...rows.map((r) => textWidth(r.title, T)));
const height = PAD + head.length * 12 + 12 + rows.reduce((s, r) => s + rowH(r), 0);
const sheet = new Sheet(width, height, BG);
head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));

let y = PAD + head.length * 12 + 12;
for (const r of rows) {
  sheet.text(r.title, PAD, y, GOLD, T);
  const oy = y + 20;
  const fw = 64 * r.k;
  sheet.rect(PAD - 4, oy - 4, rowW(r) - GAP + 8, fw + 8, PANEL);
  r.figs.forEach((f, i) => {
    const ox = PAD + i * (fw + GAP);
    sheet.blit(f.grid, f.pal, ox, oy, r.k);
    if (f.label) sheet.text(f.label, ox, oy + fw + 6, WHITE, T);
  });
  y += rowH(r);
}

const out = join(ROOT, '.art-preview', 'forgeron-portrait.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-forgeron-portrait -> ${out}`);

// Vue de près, pour le dessin.
const x4 = process.env.FORGERON_PORTRAIT_X4;
if (x4) {
  const K = 4;
  const figs = [smith('A', false), smith('B', false), smith('C', false), xeros(), smith('A', true), smith('B', true), smith('C', true), mother()];
  const s = new Sheet(PAD * 2 + 4 * (64 * K + GAP), PAD * 2 + 2 * (64 * K + GAP), PANEL);
  figs.forEach((f, i) => s.blit(f.grid, f.pal, PAD + (i % 4) * (64 * K + GAP), PAD + Math.floor(i / 4) * (64 * K + GAP), K));
  writeFileSync(x4, PNG.sync.write(s.png));
  console.log(`  x4 -> ${x4}`);
}
