// Planche des têtes du forgeron, essai 4 (chantier « forgeron », essai hors jeu) : npx tsx tools/essai-forgeron-tete.ts écrit
// .art-preview/forgeron-tetes.png. Le dessin : art/proposals/forgeron-tetes.ts (l'essai 3, art/proposals/forgeron-colosse.ts,
// pour comparer).
//   1. x4 : T1, T2, T3 de face et de profil, l'essai 3 (C de face), Xéros de face ; repères en pointillé : sommet du forgeron
//      (y=7), sommet de Xéros (y=14), le sol (y=46) ;
//   2. x1 sur l'herbe : les mêmes, avec Xéros et la mère ;
//   3. x8 : les têtes seules (recadrées au-dessus des épaules), de face : T1, T2, T3, l'essai 3.
// Légendes : la taille de chaque tête (largeur × hauteur, contour compris, du sommet au menton).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import * as colosse from '../art/proposals/forgeron-colosse';
import * as tetes from '../art/proposals/forgeron-tetes';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 2;
const BG: Rgb = [58, 52, 44];
const PANEL: Rgb = [123, 133, 68]; // l'herbe g
const GOLD: Rgb = [245, 215, 120];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const CYAN: Rgb = [140, 220, 235];
const ROSE: Rgb = [240, 140, 140];
const GAP = 20;
const PAD = 16;

function frame(name: string, anim: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-tete : pas de planche « ${name} »`);
  return { grid: s.animations[anim].frames[0], pal: s.palette };
}

/** Recadre une image : colonnes [x0, x0 + w[, rangées [y0, y0 + h[. */
const crop = (g: Grid, x0: number, y0: number, w: number, h: number): Grid =>
  g.slice(y0, y0 + h).map((row) => row.slice(x0, x0 + w));

interface Fig { grid: Grid; pal: Palette; label: string }
interface Row { title: string; figs: Fig[]; k: number; marks: boolean; fw: number; fh: number }

const rowW = (r: Row) => r.figs.length * (r.fw * r.k + GAP);
const rowH = (r: Row) => 12 + 8 + r.fh * r.k + (r.figs.some((f) => f.label) ? 14 : 4) + GAP;

function render(file: string, head: string[], rows: Row[]): void {
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
    if (r.marks) {
      const end = PAD + rowW(r) - GAP;
      const dash = (yy: number, c: Rgb) => { for (let i = PAD - 4; i < end + 4; i += 8) sheet.rect(i, yy, 4, 1, c); };
      dash(oy + 7 * r.k - 1, GOLD);
      dash(oy + 14 * r.k - 1, CYAN);
      dash(oy + 46 * r.k, ROSE);
    }
    y += rowH(r);
  }
  const out = join(ROOT, '.art-preview', file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-forgeron-tete : ${out}`);
}

const versions: tetes.Version[] = ['T1', 'T2', 'T3'];
const NAMES: Record<tetes.Version, string> = { T1: 'T1 RECTANGLE', T2: 'T2 ECU', T3: 'T3 LAME' };
const sz = (v: tetes.Version, f: tetes.HeadFacing) => { const s = tetes.headSize(v, f); return `${s.w}X${s.h}`; };

/** La tête de l'essai 3 (C de face) : sa matière de y=8 à 21, contour compris. */
const essai3 = colosse.smith('C', 'down', 'loose');
const ESSAI3_SIZE = (() => {
  const m = colosse.SPECS['C-down-loose'].slice(0, 14);
  const x0 = Math.min(...m.map(([x]) => x)), x1 = Math.max(...m.map(([x, s]) => x + s.length - 1));
  return `${x1 - x0 + 3}X15`;
})();

const fig = (v: tetes.Version, f: tetes.HeadFacing, label = ''): Fig => ({ grid: tetes.head(v, f), pal: tetes.palette, label });
const xd = frame('xeros', 'idle-down');
const md = frame('mother', 'idle-down');

const allFigs = (labels: boolean): Fig[] => [
  ...versions.flatMap((v) => [
    fig(v, 'down', labels ? `${v} ${sz(v, 'down')}` : ''),
    fig(v, 'right', labels ? `${v} ${sz(v, 'right')}` : ''),
  ]),
  { grid: essai3, pal: colosse.palette, label: labels ? `ESSAI3 ${ESSAI3_SIZE}` : '' },
  { ...xd, label: labels ? 'XEROS' : '' },
];

render('forgeron-tetes.png', [
  'LE FORGERON, ESSAI 4 : TROIS TETES SUR LE CORPS DE C (ART/PROPOSALS/FORGERON-TETES.TS)',
  `TETES DE FACE (L X H, CONTOUR COMPRIS, DU SOMMET AU MENTON) : ${versions.map((v) => `${NAMES[v]} ${sz(v, 'down')}`).join(' ; ')} ; ESSAI 3 C ${ESSAI3_SIZE}`,
  `DE PROFIL : ${versions.map((v) => `${v} ${sz(v, 'right')}`).join(' ; ')} ; COIFFURE COMPRISE ; VISAGE DE PEAU : T1 9X11, T2 7 A 11 X 11, T3 8X12`,
  'POINTILLES : JAUNE, SOMMET DU FORGERON (Y=7) ; CYAN, SOMMET DE XEROS (Y=14) ; ROSE, LE SOL (Y=46)',
], [
  {
    title: 'T1, T2, T3 DE FACE ET DE PROFIL, L\'ESSAI 3 (C), XEROS (X4)', k: 4, marks: true, fw: 32, fh: 48,
    figs: allFigs(true),
  },
  {
    title: 'A LA TAILLE DU JEU (X1), SUR L\'HERBE, AVEC XEROS ET LA MERE', k: 1, marks: false, fw: 32, fh: 48,
    figs: [...allFigs(false), { ...md, label: '' }, fig('T1', 'down'), { ...xd, label: '' }, fig('T2', 'down'),
      { ...md, label: '' }, fig('T3', 'down')],
  },
  {
    title: 'LES TETES SEULES, DE FACE (X8)', k: 8, marks: false, fw: 22, fh: 18,
    figs: [
      ...versions.map((v): Fig => ({ grid: crop(tetes.head(v, 'down'), 5, 6, 22, 18), pal: tetes.palette, label: `${v} ${sz(v, 'down')}` })),
      { grid: crop(essai3, 5, 6, 22, 18), pal: colosse.palette, label: `ESSAI3 ${ESSAI3_SIZE}` },
    ],
  },
  {
    title: 'LES TETES SEULES, DE PROFIL (X8)', k: 8, marks: false, fw: 22, fh: 18,
    figs: versions.map((v): Fig => ({ grid: crop(tetes.head(v, 'right'), 6, 6, 22, 18), pal: tetes.palette, label: `${v} ${sz(v, 'right')}` })),
  },
]);
