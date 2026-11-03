// Essai de la tempête (chantier « la tempête ») : npx tsx tools/essai-tempete.ts écrit .art-preview/tempete.png.
//
// Pose la proposition de dessin art/proposals/tempete.ts (le chicot, la galette de racines et son trou), hors du jeu, pour que
// Grégoire la valide avant toute intégration. Agrandi x4 (le détail x8), sur la grille des cases (32 px du jeu, 1,60 m), avec
// Xéros pour l'échelle et, pour comparaison, l'arbre normal du jeu tel qu'il est (debout, souche, couché : les images de
// src/generated/, lues sans y toucher ; lancer `npm run art` si elles manquent). Sous chaque dessin : ses dimensions réelles,
// la taille attendue par le gabarit (src/content/gabarit.ts) et la taille dessinée (silhouette, contour compris, ombre exclue).
//   1. debout : Xéros, l'arbre normal, le chicot, la souche ;
//   2. la galette : vue est-ouest (l'arbre couché vers l'est), vue de face (couché vers le nord), le trou, l'arbre couché actuel ;
//   3. l'ensemble : le trou, la galette posée contre le pied du tronc couché vers l'est, Xéros à côté ;
//   4. le détail x8 : la cassure du chicot, la galette.
// Ne touche ni au jeu ni à src/generated/.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import {
  DIMS, MATTER, PROFILE, SNAG_FOOT, UPROOTED, crown, palette as pal, rootHole, rootPlateEast, rootPlateFace, snag, snagLying,
} from '../art/proposals/tempete';
import { expectedSize, silhouette, type Dims } from '../src/content/gabarit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 4;
const PAD = 16;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const GRID: Rgb = [110, 120, 60];
const BAND: Rgb = [96, 104, 54];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** Une image du jeu (src/generated/<clé>.png) en grille et palette, pour la poser comme les dessins. */
function generated(key: string): { grid: Grid; palette: Palette } {
  const file = join(ROOT, 'src', 'generated', `${key}.png`);
  if (!existsSync(file)) throw new Error(`essai-tempete : ${file} manque (lancer npm run art)`);
  const png = PNG.sync.read(readFileSync(file));
  const palette: Palette = {};
  const codes = new Map<string, string>();
  const grid: Grid = [];
  for (let y = 0; y < png.height; y++) {
    let line = '';
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const a = png.data[i + 3];
      if (!a) { line += '.'; continue; }
      const hex = '#' + [0, 1, 2].map((k) => png.data[i + k].toString(16).padStart(2, '0')).join('') + (a < 255 ? a.toString(16).padStart(2, '0') : '');
      if (!codes.has(hex)) {
        const ch = String.fromCharCode(0x100 + codes.size);
        codes.set(hex, ch);
        palette[ch] = hex;
      }
      line += codes.get(hex);
    }
    grid.push(line);
  }
  return { grid, palette };
}

const sizeOf = (g: Grid, p: Palette) => { const s = silhouette(g, p); return `${s.w}X${s.h} px`; };
const expected = (d: Dims) => { const e = expectedSize(d); return `${fmt(e.w)}X${fmt(e.h)}`; };
const dimsText = (d: Dims) => `${d.w}X${d.d}X${d.h} cm`;

type Cell = { w: number; art: number; below: number; draw: (s: Sheet, x: number, ground: number) => void };

/** Une image posée par le bas de sa silhouette sur la ligne de sol, ses lignes de texte dessous. */
function cell(g: Grid, p: Palette, lines: string[], k = K): Cell {
  const sil = silhouette(g, p);
  const artW = g[0].length * k;
  return {
    w: Math.max(artW, ...lines.map((l) => textWidth(l, T))) + 2 * PAD,
    art: (sil.y + sil.h) * k,
    below: lines.length * 12 + 12,
    draw: (s, x, ground) => {
      s.blit(g, p, x + PAD, ground - (sil.y + sil.h) * k, k);
      lines.forEach((l, i) => s.text(l, x + PAD, ground + 10 + i * 12, i === 0 ? WHITE : GREY, T));
    },
  };
}

const xg = xeros.animations['idle-down'].frames[0];
const xerosCell = (k = K) => cell(xg, xeros.palette, ['xeros', '1,60 m', sizeOf(xg, xeros.palette)], k);

const tree = generated('normal-tree');
const stump = generated('normal-tree-stump');
const felled = generated('normal-felled-tree');
const snagG = snag();
const crownG = crown();
const snagLyingG = snagLying();
const fmt2 = (n: number) => n.toFixed(3).replace('.', ',');

/**
 * Le chicot debout et sa cime couchée à côté, vers l'est : la cassure de la cime à 2 px à l'est du pied du chicot, son tronc
 * posé au sol au niveau du pied (l'axe du tronc couché, rangée 9,5 de l'image couchée, à 4 px au nord du pied).
 */
function snagScene(k: number): Cell {
  const cx0 = Math.min(...PROFILE) - 3; // première colonne de la cime dans son image
  const sil = silhouette(snagG, pal);
  const w = snagG[0].length + 140 - cx0 + 2;
  return {
    w: w * k + 2 * PAD,
    art: (SNAG_FOOT[1] + 2) * k,
    below: 4 * 12 + 12,
    draw: (s, x, ground) => {
      const oy = ground - (SNAG_FOOT[1] + 1) * k;
      const crownX = x + PAD + (SNAG_FOOT[0] + 4 - cx0) * k;
      const crownY = oy + (SNAG_FOOT[1] - 12) * k;
      s.blit(crownG, pal, crownX, crownY, k);
      s.blit(snagG, pal, x + PAD, oy, k);
      void sil;
      const lines = [
        'chicot debout + sa cime couchee vers l est (proposes)',
        `chicot ${dimsText(DIMS.snag)} : attendu ${expected(DIMS.snag)}, dessine ${sizeOf(snagG, pal)}`,
        `cime : ${fmt(MATTER.crown.len)} m (${fmt(MATTER.crown.boleLen)} m de tronc + le houppier), dessinee ${sizeOf(crownG, pal)}`,
        'la cime = l image de l arbre couche du jeu, coupee par le profil de la cassure',
      ];
      lines.forEach((l, i) => s.text(l, x + PAD, ground + 10 + i * 12, i === 0 ? WHITE : GREY, T));
    },
  };
}

/** La preuve : chicot couché et cime remis bout à bout (3 px d'écart), au-dessus de l'arbre couché du jeu, mêmes repères. */
function proof(k: number): Cell {
  const gap = 3;
  const lines = [
    'preuve : chicot couche + cime, cassure contre cassure (ecartes de 3 px pour voir la cassure),',
    'au-dessus de l arbre couche du jeu (normal-felled-tree) : meme longueur, 50 px + 90 px = 140 px (7 m)',
    `bois vert ${MATTER.density} kg/m3, tronc de 30 cm (${fmt2(MATTER.section)} m2) :`,
    `chicot 2,5 m : ${fmt2(MATTER.snag.vol)} m3, ${Math.round(MATTER.snag.kg)} kg  /  cime : ${fmt(MATTER.crown.boleLen)} m de tronc ${fmt2(MATTER.crown.vol)} m3 + houppier ${Math.round(MATTER.crownMass)} kg = ${Math.round(MATTER.crown.kg)} kg`,
    `somme ${Math.round(MATTER.snag.kg + MATTER.crown.kg)} kg = souche 0,4 m ${Math.round(MATTER.whole.stumpKg)} kg + arbre couche ${MATTER.whole.felledKg} kg (piece de 580 cm + houppier)`,
  ];
  return {
    w: (140 + gap + 4) * k + 2 * PAD,
    art: 48 * k,
    below: lines.length * 12 + 12,
    draw: (s, x, ground) => {
      const ox = x + PAD, top = ground - 48 * k;
      s.blit(snagLyingG, pal, ox, top, k);
      s.blit(crownG, pal, ox + gap * k, top, k);
      s.blit(felled.grid, felled.palette, ox, top + 24 * k, k);
      // repères : le pied, la cassure (au plus bas et au plus haut), la pointe
      const tick = (px: number, c: Rgb) => s.rect(ox + px * k, top - 6, 2, 48 * k + 6, c);
      tick(0, GOLD); tick(140, GOLD);
      tick(Math.min(...PROFILE), WHITE); tick(Math.max(...PROFILE), WHITE);
      lines.forEach((l, i) => s.text(l, x + PAD, ground + 10 + i * 12, i < 2 ? WHITE : GREY, T));
    },
  };
}
const plateE = rootPlateEast();
const plateF = rootPlateFace();
const hole = rootHole();

/** L'ensemble : le trou, l'arbre couché vers l'est, la galette sur son pied ; Xéros debout au sud-ouest du trou. */
function ensemble(k: number): Cell {
  const [hx, hy] = UPROOTED.hole, [px, py] = UPROOTED.plate;
  const minX = Math.min(hx, px) - 2, minY = Math.min(hy, py) - 2;
  const w = 140 - minX + 2, h = 26 - minY;
  const xw = 16; // Xéros, à gauche de l'ensemble
  return {
    w: (w + xw) * k + 2 * PAD,
    art: (h + 8) * k,
    below: 36,
    draw: (s, x, ground) => {
      const ox = x + PAD + xw * k - minX * k, oy = ground - 8 * k - (h + minY) * k;
      s.blit(hole, pal, ox + hx * k, oy + hy * k, k);
      s.blit(felled.grid, felled.palette, ox, oy, k);
      s.blit(plateE, pal, ox + px * k, oy + py * k, k);
      s.blit(xg, xeros.palette, x + PAD - 8 * k, ground - 46 * k, k);
      s.text('l arbre deracine, couche vers l est : trou + galette + normal-felled-tree', x + PAD, ground + 10, WHITE, T);
      s.text('la galette remplace le bout scie ; le trou a l ouest, sous sa base', x + PAD, ground + 22, GREY, T);
    },
  };
}

/** Un morceau d'image agrandi (le détail). */
function crop(g: Grid, x0: number, y0: number, w: number, h: number): Grid {
  return g.slice(y0, y0 + h).map((r) => [...r].slice(x0, x0 + w).join(''));
}

type Row = { title: string; cells: Cell[] };

const rows: Row[] = [
  {
    title: '1. le chicot : l arbre normal casse debout a 2,5 m, sa cime couchee a l est',
    cells: [
      xerosCell(),
      cell(tree.grid, tree.palette, ['arbre normal (jeu)', '190X190X700 cm', sizeOf(tree.grid, tree.palette)]),
      cell(stump.grid, stump.palette, ['souche (jeu)', '60X55X40 cm', sizeOf(stump.grid, stump.palette)]),
      snagScene(K),
    ],
  },
  { title: '1 bis. chicot + cime = l arbre normal', cells: [proof(K)] },
  {
    title: '2. la galette de racines et son trou',
    cells: [
      xerosCell(),
      cell(plateE, pal, ['galette, vue est-ouest', 'arbre couche vers l est', 'motte 170, racines 225X180 cm', 'attendu 8+17+8=33X40', `dessine ${sizeOf(plateE, pal)}`]),
      cell(plateF, pal, ['galette, vue de face', 'arbre couche vers le nord', dimsText(DIMS.plateFace), `attendu ${expected(DIMS.plateFace)}`, `dessine ${sizeOf(plateF, pal)}`]),
      cell(hole, pal, ['trou (a plat)', `${DIMS.hole.w}X${DIMS.hole.d} cm`, `attendu ${expected(DIMS.hole)}`, `dessine ${sizeOf(hole, pal)}`]),
      cell(felled.grid, felled.palette, ['arbre couche (jeu)', 'normal-felled-tree', sizeOf(felled.grid, felled.palette)]),
    ],
  },
  { title: '3. l ensemble', cells: [ensemble(K)] },
  {
    title: '4. detail x8',
    cells: [
      cell(crop(snagG, 4, 0, 16, 30), pal, ['cassure du chicot'], 8),
      cell(crop(crownG, 44, 3, 30, 14), pal, ['cassure de la cime'], 8),
      cell(plateE, pal, ['galette est-ouest'], 8),
      cell(plateF, pal, ['galette de face'], 8),
      cell(hole, pal, ['trou'], 8),
    ],
  },
];

const art = (r: Row) => Math.max(...r.cells.map((c) => c.art));
const below = (r: Row) => Math.max(...r.cells.map((c) => c.below));
const rowH = (r: Row) => 30 + art(r) + below(r) + 14;
const width = Math.max(...rows.map((r) => r.cells.reduce((s, c) => s + c.w, 0))) + 2 * PAD;
const height = rows.reduce((s, r) => s + rowH(r), 10);
const sheet = new Sheet(width, height, GRASS);
for (let x = 0; x < width; x += 32 * K) sheet.rect(x, 0, 1, height, GRID);
for (let y = 0; y < height; y += 32 * K) sheet.rect(0, y, width, 1, GRID);
let y = 10;
for (const r of rows) {
  sheet.text(r.title, PAD, y, GOLD, 3);
  const ground = y + 30 + art(r);
  let x = PAD;
  for (const c of r.cells) { c.draw(sheet, x, ground); x += c.w; }
  y += rowH(r);
  sheet.rect(0, y - 6, width, 2, BAND);
}
const out = join(ROOT, '.art-preview', 'tempete.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(sheet.png));
console.log(`essai-tempete -> ${out}`);
console.log(`chicot ${sizeOf(snagG, pal)} (attendu ${expected(DIMS.snag)}) ; galette est ${sizeOf(plateE, pal)} ; face ${sizeOf(plateF, pal)} (attendu ${expected(DIMS.plateFace)}) ; trou ${sizeOf(hole, pal)} (attendu ${expected(DIMS.hole)})`);
