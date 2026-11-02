// Planche de contrôle du raccord de l'abattage à la chute (hors jeu, non déclarée dans art/index.ts) : pour chaque arbre et
// chaque côté, `-stage-6`, `-stage-7` (`-left-stage-6`, `-left-stage-7` pour la chute à gauche), puis les
// premières images de la chute (le raccord, 10°, 45°), posées comme le jeu les pose (`fall.x`, `fall.left.x` de props.json,
// bas aligné) : même pied, même cadre. Une ligne d'images entières à x3, puis le pied de près à x8, un repère au pied.
// Écrit aussi, pour chaque passage, le nombre de pixels qui changent sous la coupe (la souche) : 0 attendu tant que la
// souche n'est pas posée.
// Usage : npx tsx art/world/fall-lead-preview.ts  (écrit .art-preview/raccord-chute.png) ; ONLY=big-tree SIDE=left OUT=x.png :
// une seule ligne, pour regarder de près

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { Sheet, type Rgb } from '../../tools/lib/audit-preview';
import stages from './work-stages';
import big from './big-felled';
import pollard from './big-pollard';
import normalFall from './normal-fall';
import { BIG, NORMAL, POLLARD, type Standing } from './felling';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const props = JSON.parse(readFileSync(join(ROOT, 'src/content/props.json'), 'utf8'));
const sources = [...stages, ...big, ...pollard, ...normalFall] as ArtSource[];
const imageOf = (name: string): Grid => {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'image') throw new Error(`raccord : image ${name} absente`);
  return s.grid;
};
const sheetOf = (name: string): SpriteSheetSource => {
  const s = sources.find((x) => x.name === name);
  if (!s || s.kind !== 'spritesheet') throw new Error(`raccord : planche ${name} absente`);
  return s;
};

const BG: Rgb = [62, 66, 40];
const GRASS: Rgb = [123, 133, 68];
const GOLD: Rgb = [233, 200, 120];
const WHITE: Rgb = [235, 230, 210];
const MARK: Rgb = [230, 60, 60];
const K = 3;
const Z = 8;
const GAP = 10;

interface Row { title: string; cells: { label: string; grid: Grid }[]; foot: [number, number]; win: [number, number]; notes: string[] }

const rows: Row[] = [];
for (const t of [NORMAL, BIG, POLLARD] as Standing[]) {
  if (process.env.ONLY && process.env.ONLY !== t.key) continue;
  for (const left of [false, true]) {
    if (process.env.SIDE && (process.env.SIDE === 'left') !== left) continue;
    const h = props[t.key].harvest;
    const f = left ? h.fall.left : h.fall;
    const sheet = sheetOf(f.image);
    const frames = sheet.animations.fall.frames;
    const W = sheet.frameW;
    const H = sheet.frameH;
    const off = -f.x; // colonne de la planche où tombe le coin gauche de l'image de l'arbre
    const place = (g: Grid) => new Canvas(W, H).stamp(g, off, H - g.length).toGrid();
    const st = left ? `${t.key}-left` : t.key;
    const cells = [
      { label: 'stage-6', grid: place(imageOf(`${st}-stage-6`)) },
      { label: 'stage-7', grid: place(imageOf(`${st}-stage-7`)) },
      ...frames.slice(0, 4).map((g, i) => ({ label: `chute ${i}`, grid: g })),
    ];
    const footX = off + t.foot[0];
    const footY = H - t.h + t.foot[1];
    // fenêtre : l'arbre et ce qui penche du côté de la chute
    const win: [number, number] = left ? [Math.max(0, off - 60), Math.min(W, off + t.w + 10)] : [Math.max(0, off - 10), Math.min(W, off + t.w + 60)];
    // sous la coupe (le plancher de l'entaille et dessous), d'une image à la suivante : ce qui change
    const notes: string[] = [];
    const floorY = H - t.h + t.floor;
    for (let i = 1; i < cells.length - 1; i++) {
      const a = cells[i].grid, b = cells[i + 1].grid;
      let n = 0;
      for (let y = floorY; y < H; y++) for (let x = footX - 12; x < footX + 12; x++) {
        const p = a[y][x], q = b[y][x];
        const solid = (k: string) => k !== EMPTY && k !== 'x';
        if (solid(p) || solid(q)) if (p !== q) n++;
      }
      notes.push(`${cells[i].label}>${cells[i + 1].label}: ${n}`);
    }
    rows.push({ title: `${t.key} ${left ? 'vers la gauche' : 'vers la droite'} (${f.image}, x ${f.x})`, cells, foot: [footX, footY], win, notes });
    console.log(`${t.key}${left ? ' gauche' : ''} : pixels qui changent sous la coupe, ${notes.join(', ')}`);
  }
}

const ZW = 36, ZH = 40; // fenêtre du pied de près
const rowH = (r: Row) => 34 + Math.max(...r.cells.map((c) => c.grid.length)) * K + 24 + ZH * Z + 40;
const width = Math.max(...rows.map((r) => r.cells.length * ((r.win[1] - r.win[0]) * K + GAP)), ...rows.map((r) => r.cells.length * (ZW * Z + GAP))) + 2 * GAP;
const height = rows.reduce((s, r) => s + rowH(r), GAP);
const out = new Sheet(width, height, BG);
let y = GAP;
for (const r of rows) {
  out.text(r.title, GAP, y, GOLD, 3);
  out.text(r.notes.join('  '), GAP + 900, y, WHITE, 2);
  y += 30;
  const ww = r.win[1] - r.win[0];
  const hh = r.cells[0].grid.length;
  r.cells.forEach((c, i) => {
    const x = GAP + i * (ww * K + GAP);
    out.rect(x, y, ww * K, hh * K, GRASS);
    out.blit(c.grid.map((row) => row.slice(r.win[0], r.win[1])), world, x, y, K);
    out.rect(x + (r.foot[0] - r.win[0]) * K, y + (r.foot[1] + 2) * K, K, 3 * K, MARK);
    out.text(c.label, x, y + hh * K + 6, WHITE, 2);
  });
  y += hh * K + 24;
  // de près : le pied
  const x0 = r.foot[0] - ZW / 2, y0 = r.foot[1] - ZH + 6;
  r.cells.forEach((c, i) => {
    const x = GAP + i * (ZW * Z + GAP);
    out.rect(x, y, ZW * Z, ZH * Z, GRASS);
    out.blit(c.grid.slice(y0, y0 + ZH).map((row) => row.slice(x0, x0 + ZW)), world, x, y, Z);
    out.rect(x + (ZW / 2) * Z, y + (ZH - 4) * Z, 1, 4 * Z, MARK);
    out.rect(x + (ZW / 2) * Z - 1, y + (ZH - 4) * Z, 1, 4 * Z, MARK);
  });
  y += ZH * Z + 40;
}
const dir = join(ROOT, '.art-preview');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, process.env.OUT ?? 'raccord-chute.png'), PNG.sync.write(out.png));
console.log(`planche : ${join(dir, process.env.OUT ?? 'raccord-chute.png')} (${width} × ${height})`);
