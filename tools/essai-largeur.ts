// Aperçu de l'essai de largeur de Xéros (chantier « largeur », étape 1) : .art-preview/essai-largeur.png, en x4.
// Xéros de face, de profil et de dos à 18 px (le dessin actuel), 14 px et 12 px (tools/lib/essai-largeur.ts), à côté
// du seau, de la jarre, d'une bille du gros arbre, du billot, de la tuile de porte (`doorway`, 22 px d'ouverture) et
// d'un cadre de porte de 22 px × 1,80 m où se tient chaque version. Tous posés sur la même ligne de sol.
// Usage : npm run art:essai. N'écrit rien dans src/generated.

import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import { sources } from '../art/index';
import xeros18 from './lib/xeros-18px';
import xeros from '../art/characters/xeros';
import { interiorTiles } from '../art/interior/house';
import { world } from '../art/palette';
import { silhouette } from '../src/content/gabarit';
import { Sheet } from './lib/audit-preview';
import { essaiFrame, type View } from './lib/essai-largeur';

const K = 4;
const GAP = 6; // écart entre deux cellules, en px du jeu
const GRASS: [number, number, number] = [0x7b, 0x85, 0x44];
const WHITE: [number, number, number] = [250, 245, 225];
const PALE: [number, number, number] = [225, 225, 200];

interface Cell { grid: Grid; palette: Palette; label: string; group?: string }

const VIEWS: [View, string][] = [['down', 'FACE'], ['right', 'PROFIL'], ['up', 'DOS']];
const current = (v: View): Grid => xeros18.animations[`idle-${v}`].frames[0];
const frame = (w: 18 | 14 | 12, v: View) => (w === 18 ? current(v) : essaiFrame(w, v));

function image(name: string): { grid: Grid; palette: Palette } {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind === 'tileset') throw new Error(`image introuvable : ${name}`);
  return { grid: s.kind === 'image' ? s.grid : Object.values(s.animations)[0].frames[0], palette: s.palette };
}

// Cadre de porte vu de face : ouverture de 22 px (1,10 m) sur 36 px (1,80 m), montants et linteau de 3 px.
const OPEN_W = 22;
const OPEN_H = 36;
function doorFrame(): Grid {
  const w = OPEN_W + 6;
  const rows: string[] = [];
  rows.push('o'.repeat(w), 'o' + 'M'.repeat(w - 2) + 'o', 'o' + 'N'.repeat(w - 2) + 'o');
  for (let y = 0; y < OPEN_H; y++) rows.push('oMm' + '.'.repeat(OPEN_W) + 'mNo');
  return rows;
}

/** Le cadre de porte avec une version de Xéros de face dedans. */
function doorWith(w: 18 | 14 | 12): Grid {
  const door = doorFrame();
  const fig = frame(w, 'down');
  const out = door.map((r) => [...r]);
  // pieds de Xéros (rangée 45) sur la dernière rangée du cadre ; centre de la frame (x = 16) au centre de l'ouverture
  const dy = door.length - 1 - 45;
  const dx = 3 + OPEN_W / 2 - 16;
  fig.forEach((row, y) => [...row].forEach((ch, x) => {
    const yy = y + dy, xx = x + dx;
    if (ch === '.' || yy < 0 || yy >= out.length || xx < 0 || xx >= out[0].length) return;
    if (out[yy][xx] === '.' || ch !== 'x') out[yy][xx] = ch;
  }));
  return out.map((r) => r.join(''));
}

const doorPalette: Palette = { ...world, ...xeros.palette, M: world.M, m: world.m, N: world.N };

const tile = interiorTiles.tiles.doorway;

const groups: { title: string; cells: Cell[] }[] = [
  ...([18, 14, 12] as const).map((w) => ({
    title: `${w} PX = ${w * 5} CM`,
    cells: VIEWS.map(([v, label]) => ({ grid: frame(w, v), palette: xeros.palette, label })),
  })),
  {
    title: 'OBJETS',
    cells: [
      { ...image('bucket'), label: 'SEAU' },
      { ...image('jar'), label: 'JARRE' },
      { ...image('big-felled-log'), label: 'BILLE' },
      { ...image('chopping-block'), label: 'BILLOT' },
      { grid: tile, palette: interiorTiles.palette, label: 'DOORWAY' },
    ],
  },
  {
    title: 'PORTE 22 PX X 1,80 M',
    cells: ([18, 14, 12] as const).map((w) => ({ grid: doorWith(w), palette: doorPalette, label: `${w}` })),
  },
];

// Mise en page : cellules recadrées sur leur silhouette (ombre comprise), bas sur la ligne de sol.
const bounds = (c: Cell) => {
  // l'ombre compte pour le recadrage : on prend tout pixel non vide
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  c.grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  const sil = silhouette(c.grid, c.palette);
  return { x0, x1, y0, y1, bottom: sil.y + sil.h - 1 };
};

const TITLE_H = 14; // px du jeu au-dessus, pour les titres
const LABEL_H = 10;
const tallest = Math.max(...groups.flatMap((g) => g.cells.map((c) => { const b = bounds(c); return b.bottom - b.y0 + 1; })));
const below = Math.max(...groups.flatMap((g) => g.cells.map((c) => { const b = bounds(c); return b.y1 - b.bottom; })));
const ground = TITLE_H + tallest; // rangée du sol (bas des silhouettes)
const heightPx = ground + below + LABEL_H + 4;

let widthPx = GAP;
const placed: { cell: Cell; x: number; b: ReturnType<typeof bounds> }[] = [];
const titles: { text: string; x: number; w: number }[] = [];
for (const g of groups) {
  const start = widthPx;
  for (const cell of g.cells) {
    const b = bounds(cell);
    const w = Math.max(b.x1 - b.x0 + 1, 12);
    placed.push({ cell, x: widthPx + Math.floor((w - (b.x1 - b.x0 + 1)) / 2), b });
    widthPx += w + GAP;
  }
  titles.push({ text: g.title, x: start, w: widthPx - start - GAP });
  widthPx += GAP * 2;
}

const sheet = new Sheet(widthPx * K, heightPx * K, GRASS);
// ligne de sol, un pixel d'écran sous les pieds
sheet.rect(0, (ground + 1) * K, widthPx * K, 1, [96, 104, 56]);
for (const t of titles) {
  sheet.text(t.text, t.x * K, 3 * K, WHITE, 2);
  sheet.rect(t.x * K, 10 * K, t.w * K, 2, WHITE);
}
for (const p of placed) {
  sheet.blit(p.cell.grid, p.cell.palette, (p.x - p.b.x0) * K, (ground - p.b.bottom) * K, K);
  sheet.text(p.cell.label, p.x * K, (ground + below + 3) * K, PALE, 2);
}

mkdirSync('.art-preview', { recursive: true });
writeFileSync('.art-preview/essai-largeur.png', PNG.sync.write(sheet.png));
console.log(`✓ .art-preview/essai-largeur.png (${widthPx * K} × ${heightPx * K})`);
