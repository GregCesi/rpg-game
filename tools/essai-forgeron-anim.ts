// Planche des animations du forgeron (chantier « forgeron », essai hors jeu : rien ne change dans le jeu). Usage :
//   npx tsx tools/essai-forgeron-anim.ts  →  .art-preview/forgeron-anim.png et .art-preview/forgeron-anim-<nom>.gif (x4)
//
// Les dessins : art/proposals/forgeron-final.ts (les vues fixes corrigées, `portraitFinal('neutral' | 'smile')`),
// art/proposals/forgeron-final-v1.ts (les vues d'avant la correction, pour comparer), art/proposals/forgeron-anim.ts (les
// animations, au format d'une planche du jeu). Une seule planche :
//   1. le dos et le profil, avant / après la correction (x4) ;
//   2. chaque animation image par image (x4), étiquetée avec sa cadence ; puis toutes en x1 à côté de Xéros ;
//   3. le travail à l'enclume derrière l'enclume du jeu (l'enclume sur son billot, art/world/forge.ts), x4 ;
//   4. les deux portraits, neutre et souriant, en x3 et en x1, à côté de celui de Xéros.
// Les GIF (un par animation, x4, sur l'herbe ; le travail derrière l'enclume) sont écrits par ImageMagick (`magick`) s'il est
// installé ; sinon, la planche seule.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import { animations, palette, usedColors, NEW_COLORS, ANVIL_TABLE_Y } from '../art/proposals/forgeron-anim';
import { palette as finalPalette, portraitFinal, smithFinal } from '../art/proposals/forgeron-final';
import { smithFinal as smithV1 } from '../art/proposals/forgeron-final-v1';
import { anvilOnBlockModel, PAL as FORGE_PAL, view } from '../art/world/forge';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const OUT = '.art-preview/forgeron-anim.png';
const T = 2;
const BG: Rgb = [58, 52, 44];
const GRASS: Rgb = [123, 133, 68];
const FLOOR: Rgb = [185, 161, 120]; // la terre battue (I)
const PANEL: Rgb = [74, 66, 56];
const GOLD: Rgb = [245, 215, 120];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [205, 200, 185];
const PAD = 16;
const GAP = 16;
const LINE = 12;

function sheetOf(name: string) {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`essai-forgeron-anim : pas de planche « ${name} »`);
  return s;
}
const xeros = sheetOf('xeros');
const xerosPortrait = sheetOf('portrait-xeros-64');

/** L'enclume sur son billot, comme dans la forge : le forgeron juste au nord du billot (ses pieds 13 px au nord du bord sud). */
const ANVIL = view(anvilOnBlockModel, 0, false);
const anvilAt = () => ({ x: 16 - Math.round(ANVIL[0].length / 2), y: 45 + 13 - ANVIL.length });

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

/** Les animations par rangée de la planche (x4). */
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

const rows: Row[] = [
  {
    title: 'LES VUES CORRIGEES (X4) : LE DOS ET LE PROFIL, AVANT / APRES',
    k: 4, fw: 32, fh: 48, bg: GRASS, gap: GAP,
    figs: [
      { grid: smithV1('up'), pal: finalPalette, label: 'DOS AVANT' },
      { grid: smithFinal('up'), pal: finalPalette, label: 'DOS APRES' },
      { grid: smithV1('right'), pal: finalPalette, label: 'PROFIL AVANT' },
      { grid: smithFinal('right'), pal: finalPalette, label: 'PROFIL APRES' },
      { grid: smithFinal('down'), pal: finalPalette, label: 'FACE (INCHANGEE)' },
    ],
  },
  ...GROUPS.map((g): Row => ({
    title: g.map((key) => `${key.toUpperCase()} : ${NOTE[key]} (${rate(key)})`).join(' / '),
    k: 4, fw: 32, fh: 48, bg: GRASS, gap: GAP,
    figs: g.flatMap((key) => animations[key].frames.map((grid, i) => ({ grid, pal: palette, label: `${DIR[key.split('-')[1]]} ${i + 1}` }))),
  })),
  {
    title: `WORK-DOWN DERRIERE L'ENCLUME DU JEU (X4) : LE FER SUR LA TABLE (Y=${ANVIL_TABLE_Y} DANS SA FRAME)`,
    k: 4, fw: 32, fh: 64, bg: FLOOR, gap: GAP,
    figs: animations['work-down'].frames.map((grid, i) => ({ grid, pal: palette, label: `${i + 1}`, anvil: true })),
  },
  {
    title: 'A LA TAILLE DU JEU (X1) : CHAQUE ANIMATION, PUIS XEROS (ATTENTE, MARCHE)',
    k: 1, fw: 32, fh: 48, bg: GRASS, gap: 2,
    figs: [
      ...ANIMS.flatMap(({ key }) => animations[key].frames.map((grid) => ({ grid, pal: palette }))),
      ...['idle-down', 'idle-right', 'idle-up', 'walk-down', 'walk-right'].flatMap((a) => xeros.animations[a].frames.map((grid) => ({ grid, pal: xeros.palette }))),
    ],
  },
  {
    title: 'A LA TAILLE DU JEU (X2), LE FORGERON A COTE DE XEROS',
    k: 2, fw: 32, fh: 48, bg: GRASS, gap: 4,
    figs: [
      ...['idle-down', 'walk-right', 'talk-down'].map((a) => ({ grid: animations[a].frames[0], pal: palette })),
      ...['idle-down', 'walk-right'].map((a) => ({ grid: xeros.animations[a].frames[0], pal: xeros.palette })),
    ],
  },
  {
    title: 'LES PORTRAITS 64 PX (X3) : NEUTRE, SOURIANT, ET XEROS',
    k: 3, fw: 64, fh: 64, bg: PANEL, gap: GAP,
    figs: [
      { ...portraitFinal('neutral'), label: 'NEUTRE' },
      { ...portraitFinal('smile'), label: 'SOURIANT' },
      { grid: xerosPortrait.animations.neutral.frames[0], pal: xerosPortrait.palette, label: 'XEROS' },
    ],
  },
  {
    title: 'LES PORTRAITS A LA TAILLE DU JEU (X1)',
    k: 1, fw: 64, fh: 64, bg: PANEL, gap: GAP,
    figs: [
      { ...portraitFinal('neutral') },
      { ...portraitFinal('smile') },
      { grid: xerosPortrait.animations.neutral.frames[0], pal: xerosPortrait.palette },
    ],
  },
];

const rowW = (r: Row) => r.figs.length * (r.fw * r.k + r.gap) - r.gap;
const rowH = (r: Row) => LINE + 8 + r.fh * r.k + (r.figs.some((f) => f.label) ? 18 : 6) + GAP;

const used = usedColors();
const added = used.filter((c) => (NEW_COLORS as readonly string[]).includes(c));
const head = [
  'LE FORGERON : SES ANIMATIONS (ART/PROPOSALS/FORGERON-ANIM.TS), LE DOS ET LE PROFIL CORRIGES, LE PORTRAIT SOURIANT',
  'FRAME 32 X 48, PIEDS A Y=45 ; LA GAUCHE EST LA DROITE RETOURNEE ; LE MARTEAU ET LA PINCE DESSINES DANS LE CORPS',
  `COULEURS : ${used.length} (${used.join(' ')}) ; AJOUTEES, TIREES DE LA PALETTE DU JEU : ${added.join(' ')}`,
  'AJOUTEES : LE FER DU MARTEAU ET DE LA PINCE (LA RAMPE IRON), LE MANCHE (WOODAGES.NEW), LE FER ROUGE ET L\'ETINCELLE (LE FEU DE LA FORGE)',
  'LA GAUCHE (IDLE-LEFT, WALK-LEFT, TALK-LEFT) EST LA DROITE RETOURNEE : PAS MONTREE',
];

/** Une image du forgeron sur son fond, agrandie k fois (le travail : derrière l'enclume). */
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
  head.forEach((h, i) => sheet.text(h, PAD, PAD + i * LINE, i === 0 ? GOLD : GREY, T));
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
}

/** Un GIF x4 par animation (ImageMagick), sur l'herbe ; le travail sur la terre battue, derrière l'enclume. */
function writeGifs(): void {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' });
  } catch {
    console.log('  (pas de magick : pas de GIF)');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'forgeron-anim-'));
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
      const out = `.art-preview/forgeron-anim-${key}.gif`;
      execFileSync('magick', [...args, out]);
      console.log(`  ✓ ${out}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

writeSheet();
writeGifs();
