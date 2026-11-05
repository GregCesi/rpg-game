// Planche de la carrure du forgeron (chantier « forgeron », essai hors jeu : rien ne change dans le jeu). Usage :
//   npx tsx tools/essai-forgeron-carrure.ts  →  .art-preview/forgeron-carrure.png et .art-preview/forgeron-carrure-<nom>.gif (x4)
//
// Retour de Grégoire : le forgeron était trop large (28 px de face, 1,40 m d'épaule à épaule ; 21 px de profil, 1,05 m de
// torse). Les dessins : art/proposals/forgeron-final-v2.ts et forgeron-anim-v1.ts (avant), art/proposals/forgeron-final.ts et
// forgeron-anim.ts (après, la carrure réduite). Une seule planche :
//   1. les mesures de chaque vue, avant / après, en px et en cm (contour compris, ombre exclue) ;
//   2. chaque vue fixe avant / après (x4), à côté de Xéros et de la mère ;
//   3. chaque animation après, image par image (x4) ; le travail derrière l'enclume du jeu ;
//   4. tout en x1, puis en x2, à côté de Xéros et de la mère.
// Les GIF x4 (ImageMagick, `magick`) : un par animation, sur l'herbe ; le travail sur la terre battue, derrière l'enclume.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import { animations, palette } from '../art/proposals/forgeron-anim';
import { animations as animationsV1 } from '../art/proposals/forgeron-anim-v1';
import { bounds, palette as finalPalette, smithFinal, type Facing } from '../art/proposals/forgeron-final';
import { smithFinal as smithBefore } from '../art/proposals/forgeron-final-v2';
import { anvilOnBlockModel, PAL as FORGE_PAL, view } from '../art/world/forge';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const OUT = '.art-preview/forgeron-carrure.png';
const T = 2;
const BG: Rgb = [58, 52, 44];
const GRASS: Rgb = [123, 133, 68];
const FLOOR: Rgb = [185, 161, 120];
const GOLD: Rgb = [245, 215, 120];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const PAD = 16;
const GAP = 16;
const LINE = 12;

function sheetOf(name: string) {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-carrure : pas de planche « ${name} »`);
  return s;
}
const xeros = sheetOf('xeros');
const mother = sheetOf('mother');

const ANVIL = view(anvilOnBlockModel, 0, false);
const anvilAt = () => ({ x: 16 - Math.round(ANVIL[0].length / 2), y: 45 + 13 - ANVIL.length });

/** Largeur d'une image, contour compris, ombre exclue, sur les rangées y0 à y1. */
function width(g: Grid, y0 = 0, y1 = g.length - 1): number {
  let x0 = 99, x1 = -1;
  g.forEach((row, y) => {
    if (y < y0 || y > y1) return;
    [...row].forEach((ch, x) => { if (ch !== '.' && ch !== 'x') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } });
  });
  return x1 - x0 + 1;
}
const cm = (px: number) => `${px * 5} CM`;
const NAMES: Record<Facing, string> = { down: 'FACE', up: 'DOS', right: 'PROFIL' };

/** Les mesures : de face et de dos, la plus grande largeur ; de profil, le torse et le bras (y=23 à 33), puis sans les
 * pointes des cheveux (y=25 à 33), puis tout (la tête et les bottes comprises, inchangées). */
function measures(): string[] {
  const out: string[] = [];
  for (const f of ['down', 'up', 'right'] as Facing[]) {
    const a = smithBefore(f), b = smithFinal(f);
    const h = bounds(b).y1 - bounds(b).y0 + 1;
    if (f !== 'right') {
      out.push(`${NAMES[f]} : AVANT ${width(a)} PX (${cm(width(a))}), APRES ${width(b)} PX (${cm(width(b))}) ; HAUTEUR ${h} PX (${cm(h)})`);
    } else {
      out.push(`PROFIL, LE TORSE ET LE BRAS (Y=23 A 33, POINTES DES CHEVEUX COMPRISES) : AVANT ${width(a, 23, 33)} PX (${cm(width(a, 23, 33))}), APRES ${width(b, 23, 33)} PX (${cm(width(b, 23, 33))})`);
      out.push(`PROFIL, LE TORSE ET LE BRAS SANS LES CHEVEUX (Y=25 A 33) : AVANT ${width(a, 25, 33)} PX (${cm(width(a, 25, 33))}), APRES ${width(b, 25, 33)} PX (${cm(width(b, 25, 33))}) ; LES BOTTES (INCHANGEES) ${width(b, 41, 45)} PX`);
      out.push(`PROFIL, TOUT (LA TETE, INCHANGEE, DE LA NUQUE AU NEZ) : AVANT ${width(a)} PX, APRES ${width(b)} PX ; HAUTEUR ${h} PX (${cm(h)})`);
    }
  }
  // les animations : la plus grande largeur de chaque, avant / après
  const keys = Object.keys(animations).filter((k) => !k.endsWith('-left'));
  out.push('ANIMATIONS, LA PLUS GRANDE LARGEUR (AVANT > APRES) : ' + keys.map((k) => {
    const w = (fr: Grid[]) => Math.max(...fr.map((g) => width(g, 0, 45)));
    return `${k.toUpperCase()} ${w(animationsV1[k].frames)}>${w(animations[k].frames)}`;
  }).join(', '));
  return out;
}

interface Fig { grid: Grid; pal: Palette; label?: string; anvil?: boolean }
interface Row { title: string; figs: Fig[]; k: number; fw: number; fh: number; bg: Rgb; gap: number }

const ANIMS: { key: string; note: string }[] = [
  { key: 'idle-down', note: 'RESPIRATION' },
  { key: 'idle-up', note: 'RESPIRATION' },
  { key: 'idle-right', note: 'RESPIRATION' },
  { key: 'walk-down', note: 'CONTACT, PASSAGE...' },
  { key: 'walk-up', note: 'IDEM' },
  { key: 'walk-right', note: 'CONTACT, PASSAGE...' },
  { key: 'work-down', note: 'LEVE, ABATTU, COUP (ETINCELLE), REBOND, RETOUR' },
  { key: 'talk-down', note: 'LE POING SUR LA HANCHE' },
  { key: 'talk-up', note: 'IDEM' },
  { key: 'talk-right', note: 'LES MAINS LIBRES' },
];
const GROUPS: string[][] = [
  ['idle-down', 'idle-up', 'idle-right'],
  ['walk-down', 'walk-up'],
  ['walk-right', 'talk-right'],
  ['work-down'],
  ['talk-down', 'talk-up'],
];
const NOTE: Record<string, string> = Object.fromEntries(ANIMS.map((a) => [a.key, a.note]));
const DIR: Record<string, string> = { down: 'FACE', up: 'DOS', right: 'PROFIL' };
const rate = (key: string) => {
  const a = animations[key];
  return a.durations ? `DUREES ${a.durations.join(', ')} MS` : `${a.frameRate} IMAGE${a.frameRate > 1 ? 'S' : ''}/S`;
};

const XEROS: Fig = { grid: xeros.animations['idle-down'].frames[0], pal: xeros.palette, label: 'XEROS' };
const MOTHER: Fig = { grid: mother.animations['idle-down'].frames[0], pal: mother.palette, label: 'LA MERE' };

const rows: Row[] = [
  {
    title: 'LES VUES FIXES (X4), AVANT / APRES, A COTE DE XEROS ET DE LA MERE',
    k: 4, fw: 32, fh: 48, bg: GRASS, gap: GAP,
    figs: [
      ...(['down', 'up', 'right'] as Facing[]).flatMap((f) => [
        { grid: smithBefore(f), pal: finalPalette, label: `${NAMES[f]} AVANT` },
        { grid: smithFinal(f), pal: finalPalette, label: `${NAMES[f]} APRES` },
      ]),
      XEROS,
      MOTHER,
    ],
  },
  ...GROUPS.map((g): Row => ({
    title: 'APRES : ' + g.map((key) => `${key.toUpperCase()} : ${NOTE[key]} (${rate(key)})`).join(' / '),
    k: 4, fw: 32, fh: 48, bg: GRASS, gap: GAP,
    figs: g.flatMap((key) => animations[key].frames.map((grid, i) => ({ grid, pal: palette, label: `${DIR[key.split('-')[1]]} ${i + 1}` }))),
  })),
  {
    title: "APRES : WORK-DOWN DERRIERE L'ENCLUME DU JEU (X4)",
    k: 4, fw: 32, fh: 64, bg: FLOOR, gap: GAP,
    figs: animations['work-down'].frames.map((grid, i) => ({ grid, pal: palette, label: `${i + 1}`, anvil: true })),
  },
  {
    title: 'A LA TAILLE DU JEU (X1) : CHAQUE ANIMATION APRES, PUIS XEROS ET LA MERE',
    k: 1, fw: 32, fh: 48, bg: GRASS, gap: 2,
    figs: [
      ...ANIMS.flatMap(({ key }) => animations[key].frames.map((grid) => ({ grid, pal: palette }))),
      ...['idle-down', 'idle-right', 'idle-up', 'walk-down', 'walk-right'].flatMap((a) => xeros.animations[a].frames.map((grid) => ({ grid, pal: xeros.palette }))),
      ...['idle-down', 'idle-right', 'idle-up'].map((a) => ({ grid: mother.animations[a].frames[0], pal: mother.palette })),
    ],
  },
  {
    title: 'A LA TAILLE DU JEU (X2) : AVANT (FACE, PROFIL), APRES (FACE, PROFIL, DOS), XEROS, LA MERE',
    k: 2, fw: 32, fh: 48, bg: GRASS, gap: 4,
    figs: [
      { grid: smithBefore('down'), pal: finalPalette },
      { grid: smithBefore('right'), pal: finalPalette },
      ...['idle-down', 'walk-right', 'idle-up'].map((a) => ({ grid: animations[a].frames[0], pal: palette })),
      { grid: XEROS.grid, pal: XEROS.pal },
      { grid: xeros.animations['idle-right'].frames[0], pal: xeros.palette },
      { grid: MOTHER.grid, pal: MOTHER.pal },
    ],
  },
];

const rowW = (r: Row) => r.figs.length * (r.fw * r.k + r.gap) - r.gap;
const rowH = (r: Row) => LINE + 8 + r.fh * r.k + (r.figs.some((f) => f.label) ? 18 : 6) + GAP;

const head = [
  'LE FORGERON, LA CARRURE REDUITE (ART/PROPOSALS/FORGERON-FINAL.TS, FORGERON-ANIM.TS) ; AVANT : FORGERON-FINAL-V2.TS, FORGERON-ANIM-V1.TS',
  'MESURES CONTOUR COMPRIS, OMBRE EXCLUE, 5 CM PAR PIXEL (STYLE.MD SECTION 8) ; LA TETE, LES CHEVEUX, LE PORTRAIT ET LA HAUTEUR NE CHANGENT PAS',
  ...measures(),
];

function drawFig(sheet: Sheet, f: Fig, ox: number, oy: number, k: number): void {
  sheet.blit(f.grid, f.pal, ox, oy, k);
  if (f.anvil) {
    const a = anvilAt();
    sheet.blit(ANVIL, FORGE_PAL, ox + a.x * k, oy + a.y * k, k);
  }
}

function writeSheet(): void {
  const width = PAD * 2 + Math.max(...head.map((h) => textWidth(h, T)), ...rows.map(rowW), ...rows.map((r) => textWidth(r.title, T)));
  const height = PAD + head.length * LINE + LINE + rows.reduce((s, r) => s + rowH(r), 0);
  const sheet = new Sheet(width, height, BG);
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * LINE, i === 0 ? GOLD : i < 2 ? GREY : WHITE, T));
  let y = PAD + head.length * LINE + LINE;
  for (const r of rows) {
    sheet.text(r.title, PAD, y, GOLD, T);
    const oy = y + LINE + 8;
    const fw = r.fw * r.k, fh = r.fh * r.k;
    sheet.rect(PAD - 4, oy - 4, rowW(r) + 8, fh + 8, r.bg);
    r.figs.forEach((f, i) => {
      const ox = PAD + i * (fw + r.gap);
      drawFig(sheet, f, ox, oy, r.k);
      if (f.label) sheet.text(f.label, ox, oy + fh + 6, WHITE, T);
    });
    y += rowH(r);
  }
  mkdirSync('.art-preview', { recursive: true });
  writeFileSync(OUT, PNG.sync.write(sheet.png));
  console.log(`  ✓ ${OUT} (${width} × ${height})`);
  head.slice(2).forEach((h) => console.log('    ' + h));
}

function writeGifs(): void {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' });
  } catch {
    console.log('  (pas de magick : pas de GIF)');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'forgeron-carrure-'));
  try {
    const k = 4;
    for (const { key } of ANIMS) {
      const a = animations[key];
      const work = key === 'work-down';
      const fh = work ? 64 : 48;
      const args: string[] = ['-loop', '0'];
      a.frames.forEach((grid, i) => {
        const s = new Sheet(32 * k, fh * k, work ? FLOOR : GRASS);
        drawFig(s, { grid, pal: palette, anvil: work }, 0, 0, k);
        const f = join(dir, `${key}-${i}.png`);
        writeFileSync(f, PNG.sync.write(s.png));
        const ms = a.durations?.[i] ?? 1000 / a.frameRate;
        args.push('-delay', String(Math.round(ms / 10)), f);
      });
      const out = `.art-preview/forgeron-carrure-${key}.gif`;
      execFileSync('magick', [...args, out]);
      console.log(`  ✓ ${out}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

writeSheet();
writeGifs();
