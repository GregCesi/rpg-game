// Essai du lapin (chantier « lapins ») : npx tsx tools/essai-lapins.ts écrit .art-preview/lapins.png.
//
// Pose côte à côte la version du jeu (art/world/rabbit.ts) et les propositions de dessin du lapin (art/proposals/lapins-a.ts, lapins-b.ts, lapins-c.ts : celles qui
// existent), pour que Grégoire choisisse avant toute intégration. Une bande par proposition, son titre et son parti pris :
//   1. trois rangées, une par direction (profil, de face, de dos) : Xéros pour l'échelle, puis chaque pose image par image ;
//   2. le lapin mort : ses quatre vues au sol, en main sur Xéros (de face, de dos, de profil), son icône 16 × 16, l'entrée de
//      garenne, les touffes de poil (fx-fur) ;
//   3. une petite scène à l'échelle du jeu (x2 et x3, les zooms usuels de la caméra) : Xéros, des lapins dans plusieurs poses,
//      la garenne, un lapin mort, sur l'herbe ; c'est là qu'on juge s'il se lit.
// Tout le reste est agrandi x6. Le contrat d'un module est dans art/world/rabbit-types.ts. Ne touche ni au jeu ni à
// src/generated/.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { flipX, rng, type Grid, type Palette } from '../art/lib/canvas';
import xeros from '../art/characters/xeros';
import { HAND_POINTS } from '../art/characters/xeros';
import { world } from '../art/palette';
import { checkColors } from '../art/world/rabbit-lib';
import { RABBIT_DIRS, RABBIT_POSES, type RabbitDir, type RabbitProposal } from '../art/world/rabbit-types';
import { rabbitArt } from '../art/world/rabbit';
import { Sheet, textWidth, type Rgb } from './lib/audit-preview';

const PROPOSALS = ['a', 'b', 'c'];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = 6;
const PAD = 14;
const T = 2;
const GRASS: Rgb = [123, 133, 68];
const BAND: Rgb = [96, 104, 54];
const WHITE: Rgb = [255, 255, 255];
const GREY: Rgb = [220, 220, 205];
const GOLD: Rgb = [245, 215, 120];

const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;

/** Xéros à l'attente, dans la direction donnée. */
const xerosFrame = (dir: RabbitDir) => xeros.animations[`idle-${dir}`].frames[0];

type Cell = { w: number; h: number; draw: (s: Sheet, x: number, top: number) => void };

function images(gs: Grid[], pal: Palette, label: string, gap = 2, k = K): Cell {
  const w = Math.max(gs.reduce((s, g) => s + g[0].length, 0) * k + (gs.length - 1) * gap * k, textWidth(label, T));
  const artH = Math.max(...gs.map((g) => g.length)) * k;
  return {
    w: w + PAD,
    h: artH + 22,
    draw: (s, x, top) => {
      let gx = x;
      for (const g of gs) {
        // les frames du lapin ont toutes la même hauteur : on les aligne par le bas
        s.blit(g, pal, gx, top + artH - g.length * k, k);
        gx += (g[0].length + gap) * k;
      }
      s.text(label, x, top + artH + 6, GREY, T);
    },
  };
}

/** Xéros entier (32 × 48, rangées 12 à 47) à l'échelle K. */
function xerosCell(dir: RabbitDir, label = 'xeros'): Cell {
  const g = xerosFrame(dir).slice(12);
  return images([g], xeros.palette, label);
}

/** Xéros tenant le lapin mort (main droite). */
function holdingCell(p: RabbitProposal, dir: RabbitDir): Cell {
  const held = p.held[dir];
  const pt = HAND_POINTS[dir].idle.right;
  const c = Math.floor(held.length / 2);
  const ox = 16 + pt.dx - c, oy = 48 + pt.dy - c;
  const W = 32, Hh = 48 - 12;
  return {
    w: W * K + PAD,
    h: Hh * K + 22,
    draw: (s, x, top) => {
      const put = (g: Grid, pal: Palette, gx: number, gy: number) => s.blit(g, pal, x + gx * K, top + (gy - 12) * K, K);
      if (pt.behind) put(held, p.palette, ox, oy);
      put(xerosFrame(dir).slice(12), xeros.palette, 0, 12);
      if (!pt.behind) put(held, p.palette, ox, oy);
      s.text(`en main ${dir}`, x, top + Hh * K + 6, GREY, T);
    },
  };
}

/** Petite scène à l'échelle `k` : herbe, Xéros, lapins, garenne, lapin mort. */
function sceneCell(p: RabbitProposal, k: number): Cell {
  const W = 120, H = 56;
  return {
    w: W * k + PAD,
    h: H * k + 22,
    draw: (s, x, top) => {
      // herbe tachetée
      const r = rng(7);
      const tufts: Rgb[] = [hex(world.G), hex(world.v), hex(world.y)];
      for (let i = 0; i < 260; i++) {
        const tx = Math.floor(r() * W), ty = Math.floor(r() * H);
        s.rect(x + tx * k, top + ty * k, k, k, tufts[Math.floor(r() * tufts.length)]);
      }
      const put = (g: Grid, pal: Palette, gx: number, gy: number) => s.blit(g, pal, x + gx * k, top + gy * k, k);
      put(p.hole, p.palette, 86, 10);
      put(p.hole, p.palette, 100, 20);
      put(xerosFrame('right'), xeros.palette, 4, 6);
      const R = (pose: keyof RabbitProposal['poses'], dir: RabbitDir, i = 0, mirror = false) => {
        const g = p.poses[pose][dir][i];
        return mirror ? flipX(g) : g;
      };
      put(R('graze', 'right'), p.palette, 44, 30);
      put(R('sit', 'right', 0, true), p.palette, 62, 36);
      put(R('alert', 'right'), p.palette, 54, 14);
      put(R('graze', 'down'), p.palette, 74, 32);
      put(R('run', 'right', 1), p.palette, 92, 36);
      put(R('run', 'up', 0), p.palette, 70, 6);
      put(R('sit', 'down'), p.palette, 30, 38);
      put(p.dead, p.palette, 36, 22);
      s.text(`a l echelle du jeu x${k}`, x, top + H * k + 6, GOLD, T);
    },
  };
}

function rowOf(cells: Cell[]) {
  return { cells, w: cells.reduce((s, c) => s + c.w, 0), h: Math.max(...cells.map((c) => c.h)) };
}

function band(p: RabbitProposal) {
  for (const pose of RABBIT_POSES) for (const d of RABBIT_DIRS) p.poses[pose][d].forEach((g, i) => checkColors(`${pose}-${d}-${i}`, g, p.palette));
  const names: Record<RabbitDir, string> = { right: 'profil (right ; left en miroir)', down: 'de face (down)', up: 'de dos (up)' };
  const rows = RABBIT_DIRS.slice().sort((a, b) => (a === 'right' ? -1 : b === 'right' ? 1 : a === 'down' ? -1 : 1)).map((d) => ({
    title: names[d],
    ...rowOf([
      xerosCell(d),
      ...RABBIT_POSES.map((pose) => images(p.poses[pose][d], p.palette, `${pose} ${p.poses[pose][d].length} im.`, 1)),
    ]),
  }));
  rows.push({
    title: 'mort : au sol (ground, r1, r2, r3), en main, icone, garenne, touffes fx-fur',
    ...rowOf([
      images(p.deadGround, p.palette, 'au sol 4 vues', 3),
      holdingCell(p, 'down'),
      holdingCell(p, 'right'),
      holdingCell(p, 'up'),
      images([p.held.down, p.held.right, p.held.up], p.palette, 'held seul', 1),
      images([p.icon], p.palette, 'icone x6'),
      images([p.icon], p.palette, 'x2', 0, 2),
      images([p.hole], p.palette, 'garenne 10X8'),
      images(p.fur, p.palette, 'fx-fur', 1),
    ]),
  });
  rows.push({ title: 'scene', ...rowOf([sceneCell(p, 2), sceneCell(p, 3)]) });
  return rows;
}

async function main() {
  // la version du jeu d'abord (art/world/rabbit.ts), puis les propositions d'origine
  const proposals: RabbitProposal[] = [rabbitArt];
  for (const id of PROPOSALS) {
    const file = join(ROOT, 'art', 'proposals', `lapins-${id}.ts`);
    if (!existsSync(file)) continue;
    proposals.push((await import(pathToFileURL(file).href)).default as RabbitProposal);
  }
  if (!proposals.length) throw new Error('essai-lapins : aucune proposition dans art/proposals/ (lapins-a.ts…)');
  const bands = proposals.map((p) => ({ p, rows: band(p) }));
  const width = Math.max(...bands.flatMap((b) => b.rows.map((r) => r.w)), ...proposals.map((p) => textWidth(p.note, T))) + 2 * PAD;
  const height = bands.reduce((s, b) => s + 60 + b.rows.reduce((t, r) => t + r.h + 22, 0) + 20, 10);
  const sheet = new Sheet(width, height, GRASS);
  let y = 10;
  for (const { p, rows } of bands) {
    sheet.text(`${p.id} : ${p.title}`, PAD, y, GOLD, 4);
    sheet.text(p.note, PAD, y + 28, GOLD, T);
    y += 60;
    for (const r of rows) {
      sheet.text(r.title, PAD, y, WHITE, T);
      y += 18;
      let x = PAD;
      for (const c of r.cells) { c.draw(sheet, x, y + r.h - c.h); x += c.w; }
      y += r.h + 4;
    }
    sheet.rect(0, y + 6, width, 3, BAND);
    y += 20;
  }
  const out = join(ROOT, '.art-preview', 'lapins.png');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(sheet.png));
  console.log(`essai-lapins : ${proposals.map((p) => p.id).join(', ')} -> ${out}`);
}

await main();
