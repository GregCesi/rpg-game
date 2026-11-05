// Planche du menton du forgeron, essai 5 (chantier « forgeron », essai hors jeu) : npx tsx tools/essai-forgeron-menton.ts
// écrit .art-preview/forgeron-menton.png. Grégoire a choisi la tête T1 « le rectangle » de l'essai 4 et ne demande que le
// menton (art/proposals/forgeron-tetes.ts, `head('T1', facing, chin)`) : M0 (T1 telle quelle), M1, M2, M3.
//   1. x8 : les têtes seules, de face puis de profil, M0 à M3 ;
//   2. x4 : le corps entier, de face et de profil, M0 à M3, Xéros à côté ;
//   3. x1 sur l'herbe : les mêmes, avec Xéros et la mère.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import * as tetes from '../art/proposals/forgeron-tetes';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const PANEL: Rgb = [123, 133, 68]; // l'herbe g
const GOLD: Rgb = [245, 215, 120];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const ROSE: Rgb = [240, 140, 140];
const GAP = 20;
const PAD = 16;

function frame(name: string, anim: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-menton : pas de planche « ${name} »`);
  return { grid: s.animations[anim].frames[0], pal: s.palette };
}

const crop = (g: Grid, x0: number, y0: number, w: number, h: number): Grid =>
  g.slice(y0, y0 + h).map((row) => row.slice(x0, x0 + w));

interface Fig { grid: Grid; pal: Palette; label: string }
interface Row { title: string; figs: Fig[]; k: number; fw: number; fh: number; ground?: boolean }

const rowW = (r: Row) => r.figs.length * (r.fw * r.k + GAP);
const rowH = (r: Row) => 12 + 8 + r.fh * r.k + (r.figs.some((f) => f.label) ? 14 : 4) + GAP;

const NAMES: Record<tetes.Chin, string> = { M0: 'M0 T1 ACTUELLE', M1: 'M1 LA BOSSE', M2: 'M2 EN AVANT', M3: 'M3 FORT' };
const sz = (c: tetes.Chin, f: tetes.HeadFacing) => { const s = tetes.headSize('T1', f, c); return `${s.w}X${s.h}`; };
const fig = (c: tetes.Chin, f: tetes.HeadFacing, label = ''): Fig => ({ grid: tetes.head('T1', f, c), pal: tetes.palette, label });
const xd = frame('xeros', 'idle-down');
const xr = frame('xeros', 'idle-right');
const md = frame('mother', 'idle-down');

const rows: Row[] = [
  {
    title: 'LES TETES SEULES, DE FACE (X8)', k: 8, fw: 22, fh: 19,
    figs: tetes.CHINS.map((c): Fig => ({ grid: crop(tetes.head('T1', 'down', c), 5, 6, 22, 19), pal: tetes.palette, label: `${NAMES[c]} ${sz(c, 'down')}` })),
  },
  {
    title: 'LES TETES SEULES, DE PROFIL (X8)', k: 8, fw: 22, fh: 19,
    figs: tetes.CHINS.map((c): Fig => ({ grid: crop(tetes.head('T1', 'right', c), 6, 6, 22, 19), pal: tetes.palette, label: `${NAMES[c]} ${sz(c, 'right')}` })),
  },
  {
    title: 'LE CORPS ENTIER, DE FACE ET DE PROFIL, A COTE DE XEROS (X4)', k: 4, fw: 32, fh: 48, ground: true,
    figs: [...tetes.CHINS.flatMap((c) => [fig(c, 'down', c), fig(c, 'right', c)]), { ...xd, label: 'XEROS' }, { ...xr, label: 'XEROS' }],
  },
  {
    title: 'A LA TAILLE DU JEU (X1), SUR L\'HERBE, AVEC XEROS ET LA MERE', k: 1, fw: 32, fh: 48,
    figs: [...tetes.CHINS.flatMap((c) => [fig(c, 'down'), fig(c, 'right'), { ...xd, label: '' }]), { ...md, label: '' },
      fig('M2', 'down'), { ...md, label: '' }, fig('M3', 'down'), { ...xr, label: '' }],
  },
];

const head = [
  'LE FORGERON, ESSAI 5 : LE MENTON DE T1 (ART/PROPOSALS/FORGERON-TETES.TS, HEAD(T1, FACING, CHIN))',
  `TETE L X H, CONTOUR COMPRIS, DU SOMMET AU MENTON : ${tetes.CHINS.map((c) => `${c} ${sz(c, 'down')}`).join(' ; ')}`,
  'M0 : T1 DE L\'ESSAI 4 ; M1 : MEME SILHOUETTE, LUMIERE, FOSSETTE, OMBRE ; M2 ET M3 : LE BAS DESCEND D\'UNE RANGEE',
  'TOUT LE RESTE DE T1 EST IDENTIQUE (SEULES LES RANGEES Y=20 A 23 CHANGENT) ; POINTILLE ROSE : LE SOL (Y=46)',
];

const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map(rowW));
const height = PAD + head.length * 12 + 12 + rows.reduce((s, r) => s + rowH(r), 0);
const sheet = new Sheet(width, height, BG);
head.forEach((h, i) => sheet.text(h, PAD, PAD + i * 12, i === 0 ? GOLD : GREY, T));
let y = PAD + head.length * 12 + 12;
for (const r of rows) {
  sheet.text(r.title, PAD, y, GOLD, T);
  const oy = y + 20;
  const fw = r.fw * r.k, fh = r.fh * r.k;
  sheet.rect(PAD - 4, oy - 4, rowW(r) - GAP + 8, fh + 8, PANEL);
  r.figs.forEach((f, i) => {
    const ox = PAD + i * (fw + GAP);
    sheet.blit(f.grid, f.pal, ox, oy, r.k);
    if (f.label) sheet.text(f.label, ox, oy + fh + 4, WHITE, T);
  });
  if (r.ground) {
    const end = PAD + rowW(r) - GAP;
    for (let i = PAD - 4; i < end + 4; i += 8) sheet.rect(i, oy + 46 * r.k, 4, 1, ROSE);
  }
  y += rowH(r);
}
const out = join(ROOT, '.art-preview', 'forgeron-menton.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-forgeron-menton : ${out}`);
