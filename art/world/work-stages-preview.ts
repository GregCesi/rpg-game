// Planche de contrôle des étapes du travail (hors jeu, non déclarée dans art/index.ts) : chaque objet, son image de départ
// puis toutes ses étapes, à x3, sur l'herbe, chaque image dans le cadre de son image (liseré clair) : la taille et l'origine
// doivent être celles de l'image de départ.
// Usage : npx tsx art/world/work-stages-preview.ts  (écrit .art-preview/etapes-travail.png)

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { Sheet, type Rgb } from '../../tools/lib/audit-preview';
import normalTree from './normal-tree';
import props from './props';
import pollard from './big-pollard';
import fellable, { STAGE_GROUPS } from './trees';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// K, ONLY (début des clés à montrer) et OUT (nom du fichier) : pour regarder de près une partie de la planche
const K = Number(process.env.K ?? 3);
const BG: Rgb = [62, 66, 40];
const GRASS: Rgb = [123, 133, 68];
const FRAME: Rgb = [170, 178, 110];
const GOLD: Rgb = [233, 200, 120];
const WHITE: Rgb = [235, 230, 210];

const bases = [...normalTree, ...props, ...pollard, ...fellable].filter((s): s is ImageSource => s.kind === 'image');
const baseOf = (key: string) => {
  const s = bases.find((b) => b.name === key);
  if (!s) throw new Error(`planche : image de départ « ${key} » absente`);
  return s;
};

const GAP = 12;
const rows = STAGE_GROUPS.filter((g) => !process.env.ONLY || g.base.startsWith(process.env.ONLY)).map((g) => {
  const imgs = [baseOf(g.base), ...g.stages];
  const w = imgs[0].grid[0].length;
  const h = imgs[0].grid.length;
  for (const s of imgs) {
    if (s.grid[0].length !== w || s.grid.length !== h) throw new Error(`planche : ${s.name} fait ${s.grid[0].length} × ${s.grid.length}, ${g.base} ${w} × ${h}`);
  }
  return { g, imgs, w, h };
});

const width = Math.max(...rows.map((r) => r.imgs.length * (r.w * K + GAP))) + 2 * GAP;
const height = rows.reduce((s, r) => s + 40 + r.h * K + 34, GAP);
const sheet = new Sheet(width, height, BG);
let y = GAP;
for (const r of rows) {
  sheet.text(`${r.g.base} - ${r.w} x ${r.h} px`, GAP, y, GOLD, 4);
  y += 32;
  r.imgs.forEach((s, i) => {
    const x = GAP + i * (r.w * K + GAP);
    sheet.rect(x - 2, y - 2, r.w * K + 4, r.h * K + 4, GRASS);
    sheet.outline(x - 2, y - 2, r.w * K + 4, r.h * K + 4, FRAME);
    sheet.blit(s.grid, world, x, y, K);
    sheet.text(i === 0 ? 'depart' : `stage-${i}`, x, y + r.h * K + 8, WHITE, 3);
  });
  y += r.h * K + 42;
}
const out = join(ROOT, '.art-preview');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, process.env.OUT ?? 'etapes-travail.png'), PNG.sync.write(sheet.png));
console.log(`planche : ${join(out, process.env.OUT ?? 'etapes-travail.png')} (${width} × ${height})`);
