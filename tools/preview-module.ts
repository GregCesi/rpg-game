// Aperçu d'un module de dessin seul, sans lancer tout le build d'art : agrandit chaque image (x4) sur de l'herbe.
// Usage : npx tsx tools/preview-module.ts <module d'art, ex. art/world/normal-tree.ts> <dossier de sortie> [clé ...]
// Écrit <dossier>/<clé>.png (une image) ou <clé>-<animation>.png (une planche : toutes ses images côte à côte).
// Sert quand plusieurs dessinateurs travaillent en même temps : chacun voit son
// module sans dépendre des autres (le vrai aperçu, `npm run art:preview`, importe tout art/).

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import type { Grid, Palette } from '../art/lib/canvas';
import type { ArtSource } from '../art/lib/types';

const K = 4;
const GRASS = '#7b8544';

function rgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}

/** Dessine des grilles côte à côte (4 px d'écart) sur de l'herbe, agrandies de K. */
function draw(grids: Grid[], palette: Palette): PNG {
  const w = grids.reduce((s, g) => s + g[0].length + 4, 4);
  const h = Math.max(...grids.map((g) => g.length)) + 8;
  const png = new PNG({ width: w * K, height: h * K });
  const put = (x: number, y: number, c: [number, number, number, number]) => {
    for (let dy = 0; dy < K; dy++) for (let dx = 0; dx < K; dx++) {
      const i = ((y * K + dy) * png.width + x * K + dx) * 4;
      png.data.set(c, i);
    }
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(x, y, rgba(GRASS));
  let ox = 4;
  for (const g of grids) {
    g.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const c = rgba(palette[ch]);
      if (c[3] === 255) put(ox + x, 4 + y, c);
      else {
        const g0 = rgba(GRASS);
        put(ox + x, 4 + y, [0, 1, 2].map((i) => Math.round(g0[i] * (1 - c[3] / 255) + c[i] * (c[3] / 255))).concat(255) as [number, number, number, number]);
      }
    }));
    ox += g[0].length + 4;
  }
  return png;
}

const [mod, out, ...only] = process.argv.slice(2);
if (!mod || !out) throw new Error('usage : tsx tools/preview-module.ts <module> <dossier> [clé ...]');
const sources = ((await import(pathToFileURL(resolve(mod)).href)).default) as ArtSource[];
mkdirSync(out, { recursive: true });
for (const s of sources) {
  if (only.length && !only.includes(s.name)) continue;
  if (s.kind === 'image') {
    writeFileSync(`${out}/${s.name}.png`, PNG.sync.write(draw([s.grid], s.palette)));
  } else if (s.kind === 'spritesheet') {
    for (const [anim, a] of Object.entries(s.animations)) {
      writeFileSync(`${out}/${s.name}-${anim}.png`, PNG.sync.write(draw(a.frames, s.palette)));
    }
  }
}
console.log(`${sources.length} sources, aperçus dans ${out}`);
