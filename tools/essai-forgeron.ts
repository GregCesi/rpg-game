// Planches du forgeron, essai 3 « le colosse » (chantier « forgeron », essai hors jeu) : npx tsx tools/essai-forgeron.ts écrit
// .art-preview/forgeron-variantes.png et .art-preview/forgeron-vues.png. Le dessin : art/proposals/forgeron-colosse.ts.
//
// forgeron-variantes.png :
//   1. A, B, C de face, x4, avec Xéros et la mère de face, pieds sur la même ligne ; repères en pointillé : sommet du forgeron
//      (y=7, 1,95 m), sommet de Xéros (y=14, 1,60 m), le sol (y=46) ;
//   2. la même rangée en x1, sur l'herbe du jeu ;
//   3. l'essai 2 (art/proposals/forgeron.ts : face, profil, dos) en x1, avec Xéros et la mère, pour comparer ;
//   en tête, la taille mesurée de chaque silhouette.
// forgeron-vues.png :
//   1. A de face, de profil, de dos, cheveux lâchés puis attachés, x4, avec Xéros de face ;
//   2. tout en x2 avec Xéros et la mère.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import * as colosse from '../art/proposals/forgeron-colosse';
import * as essai2 from '../art/proposals/forgeron';
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
const GAP = 20;
const PAD = 16;

function frame(name: string, anim: string): { grid: Grid; pal: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron : pas de planche « ${name} »`);
  return { grid: s.animations[anim].frames[0], pal: s.palette };
}

/** Taille de la silhouette (pixels opaques hors ombre `x`), et son sommet. */
function measure(grid: Grid): { w: number; h: number; top: number } {
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === 'x') return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, top: y0 };
}

interface Fig { grid: Grid; pal: Palette; label: string }
const smith = (v: colosse.Variant, f: colosse.Facing, hair: colosse.Hair, label = ''): Fig =>
  ({ grid: colosse.smith(v, f, hair), pal: colosse.palette, label });
const xeros = (anim: string, label = ''): Fig => ({ ...frame('xeros', anim), label });
const mother = (anim: string, label = ''): Fig => ({ ...frame('mother', anim), label });
const old = (f: essai2.Facing, label = ''): Fig => ({ grid: essai2.smith(f, 'loose', false), pal: essai2.palette, label });

interface Row { title: string; figs: Fig[]; k: number; marks: boolean }

const rowW = (r: Row) => r.figs.length * (32 * r.k + GAP);
const rowH = (r: Row) => 12 + 8 + 48 * r.k + (r.marks || r.figs.some((f) => f.label) ? 14 : 4) + GAP;

function render(file: string, head: string[], rows: Row[]): void {
  const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map(rowW));
  const height = PAD + head.length * 12 + 12 + rows.reduce((s, r) => s + rowH(r), 0);
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
      dash(oy + 7 * r.k - 1, GOLD);
      dash(oy + 14 * r.k - 1, CYAN);
      dash(oy + 46 * r.k, ROSE);
    }
    y += rowH(r);
  }
  const out = join(ROOT, '.art-preview', file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-forgeron : ${out}`);
}

const size = (g: Grid) => { const m = measure(g); return `${m.w} X ${m.h}`; };
const variants: colosse.Variant[] = ['A', 'B', 'C'];
const NAMES: Record<colosse.Variant, string> = { A: 'A LE CHENE', B: 'B LE BOEUF', C: 'C LE GEANT' };
const xd = frame('xeros', 'idle-down').grid;
const md = frame('mother', 'idle-down').grid;

// ---------- forgeron-variantes.png ----------
render('forgeron-variantes.png', [
  'LE FORGERON DU VILLAGE - ESSAI 3, LE COLOSSE (ART/PROPOSALS/FORGERON-COLOSSE.TS) - FRAME 32 X 48',
  `SILHOUETTES DE FACE (LARGEUR X HAUTEUR, CONTOUR COMPRIS, OMBRE EXCLUE) : ${variants.map((v) => `${v} ${size(colosse.smith(v, 'down', 'loose'))}`).join(' ; ')}`,
  `XEROS ${size(xd)} (1,60 M) ; LA MERE ${size(md)} ; ESSAI 2 ${size(essai2.smith('down', 'loose', false))} ; ATTENDU : 39 PX DE HAUT (1,95 M), 24 A 28 DE LARGE`,
  'POINTILLES : JAUNE, SOMMET DU FORGERON (Y=7) ; CYAN, SOMMET DE XEROS (Y=14) ; ROSE, LE SOL (Y=46)',
], [
  {
    title: 'DE FACE, CHEVEUX LACHES, RASE, MOUSTACHE (X4)', k: 4, marks: true,
    figs: [...variants.map((v) => smith(v, 'down', 'loose', NAMES[v])), xeros('idle-down', 'XEROS'), mother('idle-down', 'LA MERE')],
  },
  {
    title: 'A LA TAILLE DU JEU (X1), SUR L\'HERBE', k: 1, marks: false,
    figs: [...variants.map((v) => smith(v, 'down', 'loose')), xeros('idle-down'), mother('idle-down'),
      smith('A', 'down', 'loose'), xeros('idle-down'), smith('B', 'down', 'loose'), mother('idle-down'), smith('C', 'down', 'loose')],
  },
  {
    title: 'ESSAI 2, POUR COMPARER (X1) : FACE, PROFIL, DOS ; XEROS ET LA MERE', k: 1, marks: false,
    figs: [old('down'), old('right'), old('up'), xeros('idle-down'), xeros('idle-right'), mother('idle-down'), mother('idle-right'),
      smith('A', 'down', 'loose')],
  },
]);

// ---------- forgeron-vues.png ----------
const views: [colosse.Facing, string][] = [['down', 'FACE'], ['right', 'PROFIL'], ['up', 'DOS']];
const hairs: [colosse.Hair, string][] = [['loose', 'LACHES'], ['tied', 'ATTACHES']];
render('forgeron-vues.png', [
  'LE FORGERON, VARIANTE A (LE CHENE) : FACE, PROFIL, DOS ; CHEVEUX LACHES ET ATTACHES',
  `SILHOUETTES : ${views.map(([f, n]) => `${n} ${size(colosse.smith('A', f, 'loose'))}`).join(' ; ')} ; XEROS ${size(xd)}`,
  'POINTILLES : JAUNE, SOMMET DU FORGERON (Y=7) ; CYAN, SOMMET DE XEROS (Y=14) ; ROSE, LE SOL (Y=46)',
], [
  ...hairs.map(([hair, hn]): Row => ({
    title: `CHEVEUX ${hn} (X4)`, k: 4, marks: true,
    figs: [...views.map(([f, n]) => smith('A', f, hair, n)), xeros('idle-down', 'XEROS')],
  })),
  {
    title: 'X2, AVEC XEROS ET LA MERE', k: 2, marks: false,
    figs: [
      ...hairs.flatMap(([hair]) => views.map(([f]) => smith('A', f, hair))),
      xeros('idle-down'), xeros('idle-right'), xeros('idle-up'), mother('idle-down'), mother('idle-right'),
    ],
  },
]);
