// Aperçu du solin en tronçons, par le moteur du jeu (npm run art:preview -> .art-preview/solin-rectangle.png) : pour chaque manière,
// un rectangle de 4 × 3 morceaux (deux tronçons est-ouest de 4, au nord et au sud, deux tronçons nord-sud de 3 entre eux), une porte
// dans le mur sud (un morceau absent : deux têtes), puis un tronçon droit de 3 et un morceau seul ; Xéros devant la porte. Les
// tronçons, leurs bouts et leur place viennent de world/wallRuns.ts (comme en jeu), leurs dessins de world/walls.ts, chaque morceau
// à sa profondeur (world/build.ts) ; agrandi x4, sur l'herbe et la grille des cases.

import { PNG } from 'pngjs';
import xeros from '../../art/characters/xeros';
import stones, { stonePalette } from '../../art/items/stones';
import type { Grid } from '../../art/lib/canvas';
import { CM_PER_PX } from '../../src/content/gabarit';
import { depthsOf, type BuildPiece } from '../../src/world/build';
import { runLayout, wallRuns } from '../../src/world/wallRuns';
import { wallKit } from '../../src/world/walls';

const K = 4;
const GRASS = [123, 133, 68];
const LINE = [110, 120, 60];

/** Une couleur de palette en octets. */
function rgba(hex: string): number[] {
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return [n(1), n(3), n(5), hex.length === 9 ? n(7) : 255];
}

/** Les morceaux d'un rectangle de 4 × 3 avec une porte au sud, à partir du coin (x, y) en cm. */
function enclosure(prop: string, x: number, y: number, first: number): BuildPiece[] {
  const out: BuildPiece[] = [];
  let id = first;
  const at = (dx: number, dy: number, view: number) => out.push({ id: id++, piece: { prop }, x: x + dx, y: y + dy, z: 0, view });
  for (let i = 0; i < 4; i++) at(i * 160, 0, 0);
  for (let i = 0; i < 4; i++) if (i !== 1) at(i * 160, 530, 0);
  for (let j = 0; j < 3; j++) {
    at(0, 50 + j * 160, 1);
    at(590, 50 + j * 160, 1);
  }
  return out;
}

export function sillPreview(): PNG {
  const kit = wallKit((name) => {
    const s = stones.find((x) => x.name === name);
    if (s?.kind !== 'image') throw new Error(`sill-preview : pierre ${name} absente`);
    return s.grid;
  });
  const pieces: BuildPiece[] = [];
  const kinds = ['rough-sill-wall', 'dressed-sill-wall'];
  kinds.forEach((prop, k) => {
    const ox = 100 + k * 1000;
    pieces.push(...enclosure(prop, ox, 100, pieces.length + 1));
    for (let i = 0; i < 3; i++) pieces.push({ id: pieces.length + 1, piece: { prop }, x: ox + i * 160, y: 900, z: 0, view: 0 });
    pieces.push({ id: pieces.length + 1, piece: { prop }, x: ox + 600, y: 900, z: 0, view: 0 });
  });
  const W = Math.ceil(2100 / CM_PER_PX);
  const H = Math.ceil(1060 / CM_PER_PX);
  const png = new PNG({ width: W * K, height: H * K });
  const put = (x: number, y: number, c: number[]) => {
    if (x < 0 || y < 0 || x >= W || y >= H || !c[3]) return;
    for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
      const o = ((y * K + j) * W * K + x * K + i) * 4;
      const a = c[3] / 255;
      for (let ch = 0; ch < 3; ch++) png.data[o + ch] = Math.round(png.data[o + ch] * (1 - a) + c[ch] * a);
      png.data[o + 3] = 255;
    }
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, [...(x % 32 === 0 || y % 32 === 0 ? LINE : GRASS), 255]);
  // chaque morceau : sa part du dessin de son tronçon, dans l'ordre des profondeurs
  const depth = depthsOf(pieces);
  const draws: { depth: number; draw: () => void }[] = [];
  for (const run of wallRuns(pieces)) {
    const grid = kit.run({ kind: run.kind, axis: run.axis, pieces: run.pieces.length, start: run.start, end: run.end, seed: run.seed });
    const lay = runLayout(run, grid[0].length, grid.length);
    run.pieces.forEach((p, i) => {
      const c = lay.crops[i];
      draws.push({
        depth: depth.get(p.id)!,
        draw: () => {
          for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) {
            const ch = grid[y][x];
            if (ch && ch !== '.') put(lay.x + x, lay.y - grid.length + y, rgba(stonePalette[ch as keyof typeof stonePalette]));
          }
        },
      });
    });
  }
  // Xéros devant la porte de chaque rectangle
  const body: Grid = xeros.animations['idle-down'].frames[0];
  for (const k of [0, 1]) {
    const fx = (100 + k * 1000 + 160 + 80) / CM_PER_PX - body[0].length / 2;
    const fy = (100 + 580 + 60) / CM_PER_PX;
    draws.push({
      depth: fy,
      draw: () => body.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && put(fx + x, fy - body.length + y, rgba((xeros.palette as Record<string, string>)[ch])))),
    });
  }
  for (const d of draws.sort((a, b) => a.depth - b.depth)) d.draw();
  return png;
}
