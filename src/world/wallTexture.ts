// Le dessin d'un tronçon de mur (world/wallRuns.ts), monté dans le navigateur par l'algorithme des murs (world/walls.ts) avec les
// dessins des pierres que build-art a écrits (src/generated/wallStones.ts), puis peint dans une texture de Phaser. Une texture par
// tronçon différent (manière, sens, longueur, bouts, graine), gardée tant que le jeu tourne.

import type Phaser from 'phaser';
import { wallPalette, wallStones } from '../generated/wallStones';
import { runKey, type WallRun } from './wallRuns';
import { wallKit, type WallKit } from './walls';

let kit: WallKit | undefined;

/** L'algorithme des murs, nourri des pierres du jeu (une fois). */
function theKit(): WallKit {
  return (kit ??= wallKit((name) => {
    const g = wallStones[name];
    if (!g) throw new Error(`Mur : la pierre « ${name} » manque dans src/generated/wallStones.ts (npm run art)`);
    return g;
  }));
}

/** Une couleur de la palette (`#rrggbb` ou `#rrggbbaa`) en octets. */
function rgba(hex: string): [number, number, number, number] {
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return [n(1), n(3), n(5), hex.length === 9 ? n(7) : 255];
}

/** Clé de la texture du tronçon, peinte au premier besoin. */
export function wallTexture(scene: Phaser.Scene, run: WallRun): string {
  const key = runKey(run);
  if (scene.textures.exists(key)) return key;
  const grid = theKit().run({ kind: run.kind, axis: run.axis, pieces: run.pieces.length, start: run.start, end: run.end, seed: run.seed });
  const h = grid.length;
  const w = grid[0].length;
  const canvas = scene.textures.createCanvas(key, w, h)!;
  const ctx = canvas.getContext();
  const img = ctx.createImageData(w, h);
  grid.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === undefined) continue;
      const c = wallPalette[ch];
      if (!c) throw new Error(`Mur : couleur « ${ch} » absente de la palette des pierres`);
      img.data.set(rgba(c), (y * w + x) * 4);
    }
  });
  ctx.putImageData(img, 0, 0);
  canvas.refresh();
  return key;
}
