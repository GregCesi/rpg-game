// Transforme les sources de art/ en PNG + manifeste TypeScript dans src/generated/.
// Usage : npm run art            (génère)
//         npm run art -- --preview  (génère aussi des aperçus agrandis x4 dans .art-preview/)

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { sources } from '../art/index';
import type { Grid, Palette } from '../art/lib/canvas';

const OUT = 'src/generated';
const PREVIEW = '.art-preview';
const COLS = 8;
const withPreview = process.argv.includes('--preview');

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}

function check(grid: Grid, w: number, h: number, palette: Palette, where: string) {
  if (grid.length !== h) throw new Error(`${where} : ${grid.length} lignes au lieu de ${h}`);
  grid.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${where} ligne ${y} : ${row.length} colonnes au lieu de ${w}`);
    for (const ch of row) {
      if (ch !== '.' && !(ch in palette)) throw new Error(`${where} ligne ${y} : couleur '${ch}' absente de la palette`);
    }
  });
}

function blit(png: PNG, grid: Grid, ox: number, oy: number, palette: Palette) {
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const i = ((oy + y) * png.width + ox + x) * 4;
      png.data.set(hexToRgba(palette[ch]), i);
    });
  });
}

function sheet(cells: Grid[], w: number, h: number, palette: Palette): PNG {
  const cols = Math.min(COLS, cells.length);
  const rows = Math.ceil(cells.length / cols);
  const png = new PNG({ width: cols * w, height: rows * h });
  png.data.fill(0);
  cells.forEach((g, i) => blit(png, g, (i % cols) * w, Math.floor(i / cols) * h, palette));
  return png;
}

function scaled(src: PNG, k: number): PNG {
  const out = new PNG({ width: src.width * k, height: src.height * k });
  // fond damier discret pour voir la transparence
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const i = (y * out.width + x) * 4;
    const dark = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
    out.data.set(dark ? [200, 200, 200, 255] : [230, 230, 230, 255], i);
  }
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const s = (Math.floor(y / k) * src.width + Math.floor(x / k)) * 4;
    const a = src.data[s + 3] / 255;
    const i = (y * out.width + x) * 4;
    for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(src.data[s + c] * a + out.data[i + c] * (1 - a));
  }
  return out;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
if (withPreview) mkdirSync(PREVIEW, { recursive: true });

const imports: string[] = [];
const catalog = {
  spritesheets: [] as { key: string; animations: Record<string, unknown> }[],
  tilesets: [] as { key: string; tiles: Record<string, number> }[],
  images: [] as { key: string }[],
};
const spritesheets: string[] = [];
const tilesets: string[] = [];
const images: string[] = [];

for (const src of sources) {
  let png: PNG;
  const id = src.name.replace(/[^a-zA-Z0-9]/g, '_');

  if (src.kind === 'spritesheet') {
    const cells: Grid[] = [];
    const anims: Record<string, { frames: number[]; frameRate: number; repeat: number }> = {};
    for (const [anim, def] of Object.entries(src.animations)) {
      anims[anim] = { frames: [], frameRate: def.frameRate, repeat: def.repeat };
      def.frames.forEach((g, f) => {
        check(g, src.frameW, src.frameH, src.palette, `${src.name}/${anim}[${f}]`);
        anims[anim].frames.push(cells.length);
        cells.push(g);
      });
    }
    png = sheet(cells, src.frameW, src.frameH, src.palette);
    catalog.spritesheets.push({ key: src.name, animations: anims });
    spritesheets.push(
      `  { key: '${src.name}', url: ${id}, frameWidth: ${src.frameW}, frameHeight: ${src.frameH}, animations: ${JSON.stringify(anims)} },`,
    );
  } else if (src.kind === 'tileset') {
    const names = Object.keys(src.tiles);
    names.forEach((n) => check(src.tiles[n], src.tileSize, src.tileSize, src.palette, `${src.name}/${n}`));
    png = sheet(names.map((n) => src.tiles[n]), src.tileSize, src.tileSize, src.palette);
    const index = Object.fromEntries(names.map((n, i) => [n, i]));
    catalog.tilesets.push({ key: src.name, tiles: index });
    tilesets.push(`  { key: '${src.name}', url: ${id}, tileSize: ${src.tileSize}, tiles: ${JSON.stringify(index)} },`);
  } else {
    const w = src.grid[0].length;
    const h = src.grid.length;
    check(src.grid, w, h, src.palette, src.name);
    png = sheet([src.grid], w, h, src.palette);
    catalog.images.push({ key: src.name });
    images.push(`  { key: '${src.name}', url: ${id}, width: ${w}, height: ${h} },`);
  }

  writeFileSync(join(OUT, `${src.name}.png`), PNG.sync.write(png));
  imports.push(`import ${id} from './${src.name}.png';`);
  if (withPreview) writeFileSync(join(PREVIEW, `${src.name}.png`), PNG.sync.write(scaled(png, 4)));
}

const manifest = `// GÉNÉRÉ par tools/build-art.ts à partir de art/. Ne pas modifier à la main.
${imports.join('\n')}

export interface SpriteSheetAsset {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, { frames: number[]; frameRate: number; repeat: number }>;
}
export interface TilesetAsset { key: string; url: string; tileSize: number; tiles: Record<string, number> }
export interface ImageAsset { key: string; url: string; width: number; height: number }

export const spritesheets: SpriteSheetAsset[] = [
${spritesheets.join('\n')}
];

export const tilesets: TilesetAsset[] = [
${tilesets.join('\n')}
];

export const images: ImageAsset[] = [
${images.join('\n')}
];
`;
writeFileSync(join(OUT, 'assets.ts'), manifest);
// Même catalogue sans les images, lisible par Node (npm run check)
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(catalog, null, 2));
console.log(`art : ${sources.length} sources -> ${OUT}${withPreview ? ` (+ aperçus dans ${PREVIEW})` : ''}`);
