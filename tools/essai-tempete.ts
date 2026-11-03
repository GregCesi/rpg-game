// Planche de la tempête (chantier « la tempête ») : npx tsx tools/essai-tempete.ts écrit .art-preview/tempete.png.
//
// Pose les dessins du jeu (art/world/storm.ts : le chicot, sa cime, la galette de racines et son trou, toutes leurs vues),
// tirés de leur seule source. Agrandi x4 (le détail x8), sur la grille des cases (32 px du jeu, 1,60 m), avec
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
import { CROWN_AT, DIMS, MATTER, PROFILE, SNAG_TOP_AT, UPROOTED, palette as pal, snagLying, views } from '../art/world/storm';
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
const dimsText = (d: Dims) => `${d.w}X${d.d}X${d.h} cm${d.shape === 'cylinder' ? ' cyl' : ''}`;

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
const snagG = views.snag();
const [crownG, crownR1, crownR2, crownR3] = views.snagTop;
const [plateE, plateR1, plateW, plateF] = views.plate;
const hole = views.hole();
const snagLyingG = snagLying();
const fmt2 = (n: number) => n.toFixed(3).replace('.', ',');

/** Le chicot debout et sa cime couchée à côté, vers l'est, posés par leurs coins bas gauches (SNAG_TOP_AT). */
function snagScene(k: number): Cell {
  const sh = snagG.length, ch = crownG.length;
  const [dx, dy] = SNAG_TOP_AT;
  const w = dx + crownG[0].length;
  const top = Math.min(0, sh + dy - ch);
  const bottom = Math.max(sh, sh + dy);
  return {
    w: w * k + 2 * PAD,
    art: (bottom - top) * k,
    below: 4 * 12 + 12,
    draw: (s, x, ground) => {
      const by = ground - (bottom - sh) * k; // le bas de l'image du chicot
      s.blit(snagG, pal, x + PAD, by - sh * k, k);
      s.blit(crownG, pal, x + PAD + dx * k, by + dy * k - ch * k, k);
      const lines = [
        `normal-snag + normal-snag-top, cime posee a (${dx}, ${dy}) du chicot (coins bas gauches)`,
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
    'au-dessus de l arbre couche du jeu (normal-felled-tree) : meme longueur, 140 px (7 m)',
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
      s.blit(crownG, pal, ox + (gap + CROWN_AT[0]) * k, top + CROWN_AT[1] * k, k);
      s.blit(felled.grid, felled.palette, ox, top + 24 * k, k);
      const tick = (px: number, c: Rgb) => s.rect(ox + px * k, top - 6, 2, 48 * k + 6, c);
      tick(0, GOLD); tick(140, GOLD);
      tick(Math.min(...PROFILE), WHITE); tick(Math.max(...PROFILE), WHITE);
      lines.forEach((l, i) => s.text(l, x + PAD, ground + 10 + i * 12, i < 2 ? WHITE : GREY, T));
    },
  };
}

/** L'ensemble : le trou, l'arbre couché vers l'est, la galette sur son pied (UPROOTED) ; Xéros debout au sud-ouest du trou. */
function ensemble(k: number): Cell {
  const [hx, hy] = UPROOTED.holeTop, [px, py] = UPROOTED.plateTop;
  const minX = Math.min(hx, px) - 2, minY = Math.min(hy, py) - 2;
  const w = 140 - minX + 2, h = 26 - minY;
  const xw = 16;
  return {
    w: (w + xw) * k + 2 * PAD,
    art: (h + 8) * k,
    below: 48,
    draw: (s, x, ground) => {
      const ox = x + PAD + xw * k - minX * k, oy = ground - 8 * k - (h + minY) * k;
      s.blit(hole, pal, ox + hx * k, oy + hy * k, k);
      s.blit(felled.grid, felled.palette, ox, oy, k);
      s.blit(plateE, pal, ox + px * k, oy + py * k, k);
      s.blit(xg, xeros.palette, x + PAD - 8 * k, ground - 46 * k, k);
      s.text('l arbre deracine, couche vers l est : uprooted-hole + root-plate + normal-felled-tree', x + PAD, ground + 10, WHITE, T);
      s.text(`coins bas gauches par rapport a l arbre couche : galette (${UPROOTED.plate.join(', ')}), trou (${UPROOTED.hole.join(', ')})`, x + PAD, ground + 22, GREY, T);
      s.text('la galette cache le bout scie ; le trou a l ouest, sous sa base', x + PAD, ground + 34, GREY, T);
    },
  };
}

/** Un morceau d'image agrandi (le détail). */
function crop(g: Grid, x0: number, y0: number, w: number, h: number): Grid {
  return g.slice(y0, y0 + h).map((r) => [...r].slice(x0, x0 + w).join(''));
}

const faceSwap = { ...DIMS.plate, w: DIMS.plate.d, d: DIMS.plate.w };

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
    title: '1 ter. normal-snag-top, ses quatre vues (couchee, regle D)',
    cells: [
      cell(crownG, pal, ['base : vers l est', sizeOf(crownG, pal)]),
      cell(crownR1, pal, ['r1 : vers le sud', sizeOf(crownR1, pal)]),
      cell(crownR2, pal, ['r2 : vers l ouest', sizeOf(crownR2, pal)]),
      cell(crownR3, pal, ['r3 : vers le nord', sizeOf(crownR3, pal)]),
      xerosCell(),
    ],
  },
  {
    title: '2. root-plate, ses quatre vues, et uprooted-hole',
    cells: [
      xerosCell(),
      cell(plateE, pal, ['base : arbre couche', 'vers l est (profil)', dimsText(DIMS.plate), `attendu ${expected(DIMS.plate)}`, `dessine ${sizeOf(plateE, pal)}`]),
      cell(plateR1, pal, ['r1 : couche vers', 'le sud (le dessus)', dimsText(faceSwap), `attendu ${expected(faceSwap)}`, `dessine ${sizeOf(plateR1, pal)}`]),
      cell(plateW, pal, ['r2 : couche vers', 'l ouest (profil)', dimsText(DIMS.plate), `attendu ${expected(DIMS.plate)}`, `dessine ${sizeOf(plateW, pal)}`]),
      cell(plateF, pal, ['r3 : couche vers', 'le nord (de face)', dimsText(faceSwap), `attendu ${expected(faceSwap)}`, `dessine ${sizeOf(plateF, pal)}`]),
      cell(hole, pal, ['trou (a plat)', `${DIMS.hole.w}X${DIMS.hole.d} cm`, `attendu ${expected(DIMS.hole)}`, `dessine ${sizeOf(hole, pal)}`]),
    ],
  },
  { title: '3. l ensemble', cells: [ensemble(K)] },
  {
    title: '4. detail x8',
    cells: [
      cell(crop(snagG, 4, 0, 16, 26), pal, ['cassure du chicot'], 8),
      cell(crop(crownG, 0, 0, 22, crownG.length), pal, ['cassure de la cime'], 8),
      cell(plateE, pal, ['profil (base)'], 8),
      cell(plateR1, pal, ['dessus (r1)'], 8),
      cell(plateW, pal, ['profil (r2)'], 8),
      cell(plateF, pal, ['de face (r3)'], 8),
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
const size = (g: Grid) => `${g[0].length}x${g.length} (silhouette ${sizeOf(g, pal)})`;
console.log(`normal-snag ${size(snagG)} ; normal-snag-top ${views.snagTop.map(size).join(' / ')}`);
console.log(`root-plate ${views.plate.map(size).join(' / ')} ; uprooted-hole ${size(hole)}`);
console.log(`UPROOTED plate ${UPROOTED.plate} hole ${UPROOTED.hole} ; SNAG_TOP_AT ${SNAG_TOP_AT}`);
