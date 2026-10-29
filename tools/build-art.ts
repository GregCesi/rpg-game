// Transforme les sources de art/ en PNG + manifeste TypeScript dans src/generated/,
// et en tilesets pour Tiled (.tsj + PNG) dans tiled/tilesets/.
// Usage : npm run art            (génère)
//         npm run art -- --preview  (génère aussi des aperçus agrandis x4 dans .art-preview/)
//
// Le numéro d'une tuile vient de art/tile-registry.json (voir tools/lib/registry.ts) : il ne change jamais.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { z } from 'zod';
import { sources } from '../art/index';
import type { Grid, Palette } from '../art/lib/canvas';
import propsJson from '../src/content/props.json';
import tilesCatalogJson from '../src/content/tiles.json';
import { GestureSchema, PropDefSchema, TilesetCatalogSchema } from '../src/content/types';
import type { DecalSet } from '../src/content/types';
import { loadRegistry, reconcile, saveRegistry } from './lib/registry';
import { projectFile, propsTsj, tilesetTsj } from './lib/tiled-files';
import type { PropTile } from './lib/tiled-files';
import { buildCollectionBoard } from './lib/collection-board';
import { gesturePreview, itemBarPreview } from './lib/composite-previews';
import gesturesJson from '../src/content/gestures.json';

const OUT = 'src/generated';
const PREVIEW = '.art-preview';
const TILED = 'tiled/tilesets';
const PROJECT = 'tiled/xeros.tiled-project';
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

/** Planche de cellules (null = cellule vide), `cols` colonnes. */
function sheet(cells: (Grid | null)[], w: number, h: number, palette: Palette, cols = Math.min(COLS, cells.length)): PNG {
  const rows = Math.ceil(cells.length / cols);
  const png = new PNG({ width: cols * w, height: rows * h });
  png.data.fill(0);
  cells.forEach((g, i) => g && blit(png, g, (i % cols) * w, Math.floor(i / cols) * h, palette));
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

function parse<T extends z.ZodType>(file: string, schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`${file} ne respecte pas son format :\n${z.prettifyError(r.error)}`);
  return r.data;
}

// src/generated/maps.ts est produit par build-maps (npm run maps) : on le garde, seul le reste est régénéré ici.
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f !== 'maps.ts') rmSync(join(OUT, f), { recursive: true, force: true });
rmSync(TILED, { recursive: true, force: true });
mkdirSync(join(TILED, 'images'), { recursive: true });
if (withPreview) mkdirSync(PREVIEW, { recursive: true });

const registry = loadRegistry();
const catalogs = parse('tiles.json', z.record(z.string(), TilesetCatalogSchema), tilesCatalogJson);
const propDefs = parse('props.json', z.record(z.string(), PropDefSchema), propsJson);

const imports: string[] = [];
const catalog = {
  spritesheets: [] as { key: string; animations: Record<string, unknown> }[],
  tilesets: [] as { key: string; tiles: Record<string, number>; count: number; solid: number[]; decals: Record<number, DecalSet> }[],
  images: [] as { key: string }[],
};
const spritesheets: string[] = [];
const tilesets: string[] = [];
const images: string[] = [];
const notes: string[] = [];
/** Première image de chaque image fixe ou planche animée : ce que Tiled montre pour un objet. */
const firstFrames = new Map<string, { grid: Grid; w: number; h: number; palette: Palette }>();

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
    firstFrames.set(src.name, { grid: cells[0], w: src.frameW, h: src.frameH, palette: src.palette });
    catalog.spritesheets.push({ key: src.name, animations: anims });
    spritesheets.push(
      `  { key: '${src.name}', url: ${id}, frameWidth: ${src.frameW}, frameHeight: ${src.frameH}, animations: ${JSON.stringify(anims)} },`,
    );
  } else if (src.kind === 'tileset') {
    const names = Object.keys(src.tiles);
    names.forEach((n) => check(src.tiles[n], src.tileSize, src.tileSize, src.palette, `${src.name}/${n}`));
    const { slots, added, retired } = reconcile(registry, src.name, names);
    for (const n of added) notes.push(`tuile '${n}' (${src.name}) : nouveau numéro ${slots.indexOf(n)}`);
    for (const n of retired) notes.push(`ATTENTION tuile '${n}' (${src.name}) retirée de art/ : son numéro ${registry[src.name].indexOf(n)} reste réservé (trou)`);

    png = sheet(slots.map((n) => (n === null ? null : src.tiles[n])), src.tileSize, src.tileSize, src.palette, COLS);
    const index = Object.fromEntries(slots.flatMap((n, i) => (n === null ? [] : [[n, i]])));

    // propriétés de tuile : celles du catalogue + celles des terrains (famille de 16 tuiles)
    const cat = catalogs[src.name] ?? TilesetCatalogSchema.parse({});
    const solid = new Set(Object.entries(cat.tiles).flatMap(([n, t]) => (t.solid ? [n] : [])));
    const decalOf = new Map<string, string>();
    for (const [n, t] of Object.entries(cat.tiles)) {
      if (!(n in index)) throw new Error(`tiles.json [${src.name}] : tuile '${n}' absente de art/`);
      if (t.decals) {
        if (!cat.decals[t.decals]) throw new Error(`tiles.json [${src.name}] tuile '${n}' : ensemble de détails '${t.decals}' inconnu`);
        decalOf.set(n, t.decals);
      }
    }
    for (const [terrain, def] of Object.entries(cat.terrains)) {
      for (let m = 0; m < 16; m++) if (def.solid) solid.add(`${terrain}-${m}`);
    }
    const tsj = tilesetTsj({
      name: src.name,
      tileSize: src.tileSize,
      columns: COLS,
      imageFile: `${src.name}.png`,
      imageWidth: png.width,
      imageHeight: png.height,
      slots,
      solid,
      decals: decalOf,
      terrains: cat.terrains,
    });
    writeFileSync(join(TILED, `${src.name}.tsj`), JSON.stringify(tsj, null, 2) + '\n');
    writeFileSync(join(TILED, `${src.name}.png`), PNG.sync.write(png));

    const entry = {
      key: src.name,
      tiles: index,
      count: slots.length,
      solid: [...solid].filter((n) => n in index).map((n) => index[n]).sort((a, b) => a - b),
      decals: Object.fromEntries([...decalOf].map(([n, d]) => [index[n], cat.decals[d]])),
    };
    catalog.tilesets.push(entry);
    tilesets.push(
      `  { key: '${src.name}', url: ${id}, tileSize: ${src.tileSize}, tiles: ${JSON.stringify(index)}, solid: ${JSON.stringify(entry.solid)}, decals: ${JSON.stringify(entry.decals)} },`,
    );
  } else {
    const w = src.grid[0].length;
    const h = src.grid.length;
    check(src.grid, w, h, src.palette, src.name);
    png = sheet([src.grid], w, h, src.palette);
    firstFrames.set(src.name, { grid: src.grid, w, h, palette: src.palette });
    catalog.images.push({ key: src.name });
    images.push(`  { key: '${src.name}', url: ${id}, width: ${w}, height: ${h} },`);
  }

  writeFileSync(join(OUT, `${src.name}.png`), PNG.sync.write(png));
  imports.push(`import ${id} from './${src.name}.png';`);
  if (withPreview) writeFileSync(join(PREVIEW, `${src.name}.png`), PNG.sync.write(scaled(png, 4)));
}

// Tileset « collection d'images » des objets : une tuile par entrée de props.json, numérotée par le registre.
// Un objet dont l'image n'est pas dessinée est ignoré ici ; `npm run check` le signale.
const propNames = Object.entries(propDefs).filter(([, p]) => firstFrames.has(p.image)).map(([key]) => key);
const propSlots = reconcile(registry, 'props', propNames);
for (const n of propSlots.added) notes.push(`objet '${n}' : nouveau numéro ${registry.props.indexOf(n)}`);
for (const n of propSlots.retired) notes.push(`ATTENTION objet '${n}' retiré de props.json : son numéro ${registry.props.indexOf(n)} reste réservé`);
const propTiles: PropTile[] = [];
propSlots.slots.forEach((name, id) => {
  if (name === null) return;
  const def = propDefs[name];
  const f = firstFrames.get(def.image)!;
  const file = `images/${def.image}.png`;
  writeFileSync(join(TILED, file), PNG.sync.write(sheet([f.grid], f.w, f.h, f.palette)));
  propTiles.push({ id, key: name, image: file, width: f.w, height: f.h });
});
writeFileSync(join(TILED, 'props.tsj'), JSON.stringify(propsTsj(propTiles), null, 2) + '\n');
// Fichier projet committé : il liste les types d'objets (objets de props.json, Spawn, Exit) que Tiled propose.
writeFileSync(PROJECT, JSON.stringify(projectFile(propTiles), null, 2) + '\n');

if (saveRegistry(registry)) notes.push('art/tile-registry.json modifié : à committer');
for (const n of notes) console.log(`art : ${n}`);

const manifest = `// GÉNÉRÉ par tools/build-art.ts à partir de art/. Ne pas modifier à la main.
${imports.join('\n')}

export interface SpriteSheetAsset {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, { frames: number[]; frameRate: number; repeat: number }>;
}
export interface TilesetAsset {
  key: string;
  url: string;
  tileSize: number;
  /** Nom de tuile -> numéro. */
  tiles: Record<string, number>;
  /** Numéros des tuiles bloquantes. */
  solid: number[];
  /** Numéro de tuile -> détails posés au hasard dessus. */
  decals: Record<number, { images: string[]; chance: number }>;
}
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
if (withPreview) {
  writeFileSync(join(PREVIEW, 'collection.png'), PNG.sync.write(buildCollectionBoard(sources)));
  // aperçus composés : le geste use-* avec chaque outil en main (planches tool-*), et la barre d'objets
  const gesture = parse('gestures.json', z.record(z.string(), GestureSchema), gesturesJson).use;
  const body = sources.find((s) => s.kind === 'spritesheet' && s.name === 'xeros');
  for (const tool of sources) {
    if (!gesture || body?.kind !== 'spritesheet' || tool.kind !== 'spritesheet' || !tool.name.startsWith('tool-')) continue;
    const png = gesturePreview(sources, body, tool, gesture);
    writeFileSync(join(PREVIEW, `xeros-use-${tool.name.slice('tool-'.length)}.png`), PNG.sync.write(png));
  }
  const bar = itemBarPreview(sources);
  if (bar) writeFileSync(join(PREVIEW, 'item-bar.png'), PNG.sync.write(bar));
}
console.log(`art : ${sources.length} sources -> ${OUT} + ${TILED}${withPreview ? ` (+ aperçus dans ${PREVIEW})` : ''}`);
