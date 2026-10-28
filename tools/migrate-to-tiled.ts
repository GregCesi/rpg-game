// Migration UNIQUE : convertit src/content/maps/*.json (ancien format : une lettre par case) en cartes Tiled
// tiled/maps/*.tmj, en résolvant le sol avec la logique de l'ancien GameMap (raccords automatiques,
// variantes au hasard, cycles) pour que le rendu soit identique.
// Usage : npx tsx tools/migrate-to-tiled.ts      (après npm run art)
// Ce script dépend de l'ancien format : il est supprimé avec lui.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PROPS_FIRSTGID } from './lib/tiled-files';
import { maps, props, tiles } from '../src/content/index';
import { TILE } from '../src/config';

/** Hachage stable d'une position (copie de l'ancien GameMap). */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

interface PropTileInfo {
  id: number;
  type: string;
  imagewidth: number;
  imageheight: number;
}
const manifest = JSON.parse(readFileSync('src/generated/manifest.json', 'utf8')) as { tilesets: { key: string; tiles: Record<string, number> }[] };
const propsTsj = JSON.parse(readFileSync('tiled/tilesets/props.tsj', 'utf8')) as { tiles: PropTileInfo[] };

type Prop = { name: string; type: string; value: string | number };
const prop = (name: string, value: string | number, propertytype?: string): Prop => ({
  name,
  type: typeof value === 'number' ? 'float' : 'string',
  ...(propertytype ? { propertytype } : {}),
  value,
});

mkdirSync('tiled/maps', { recursive: true });

for (const [id, def] of Object.entries(maps)) {
  const setKey = def.tileset ?? 'world';
  const legend = tiles[setKey];
  const index = manifest.tilesets.find((t) => t.key === setKey)!.tiles;
  const rows = def.ground.length;
  const cols = def.ground[0].length;

  // Sol : même résolution que l'ancien GameMap
  const ground = def.ground.map((row, y) =>
    [...row].map((ch, x) => {
      const t = legend[ch];
      let name: string;
      if (t.autotile) {
        const same = (dx: number, dy: number) => {
          const n = def.ground[y + dy]?.[x + dx];
          return n === undefined || n === ch || (t.connects ?? '').includes(n);
        };
        const mask = (same(0, -1) ? 1 : 0) | (same(1, 0) ? 2 : 0) | (same(0, 1) ? 4 : 0) | (same(-1, 0) ? 8 : 0);
        name = `${t.autotile}-${mask}`;
      } else if (t.cycle) {
        name = t.tiles[x % t.tiles.length];
      } else {
        name = t.tiles[hash(x, y) % t.tiles.length];
      }
      return index[name] + 1; // gid Tiled = numéro + 1 (firstgid 1)
    }),
  );

  let nextId = 1;
  const base = () => ({ id: nextId++, rotation: 0, visible: true });

  // Objets : coin bas gauche de l'image, en pixels (convention des objets-tuiles de Tiled)
  const objects: object[] = [];
  def.props.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const p = props[ch];
      const tile = propsTsj.tiles.find((t) => t.type === p.name)!;
      const left = p.align === 'left';
      objects.push({
        ...base(),
        name: '',
        type: p.name,
        x: left ? x * TILE : x * TILE + TILE / 2 - tile.imagewidth / 2,
        y: y * TILE + TILE,
        width: tile.imagewidth,
        height: tile.imageheight,
        gid: PROPS_FIRSTGID + tile.id,
      });
    }),
  );

  // Zones : points d'apparition (même position qu'avant : pieds en bas de la case) et sorties (une case)
  const zones: object[] = [];
  for (const [name, s] of Object.entries(def.spawns)) {
    const properties: Prop[] = s.facing ? [prop('facing', s.facing, 'Facing')] : [];
    zones.push({
      ...base(),
      name,
      type: 'Spawn',
      point: true,
      x: s.x * TILE + TILE / 2,
      y: s.y * TILE + TILE - 4,
      width: 0,
      height: 0,
      ...(properties.length ? { properties } : {}),
    });
  }
  for (const e of def.exits ?? []) {
    zones.push({
      ...base(),
      name: `vers ${e.to}`,
      type: 'Exit',
      x: e.x * TILE,
      y: e.y * TILE,
      width: TILE,
      height: TILE,
      properties: [prop('to', e.to), prop('spawn', e.spawn), prop('facing', e.facing, 'Facing')],
    });
  }

  const layer = { opacity: 1, visible: true, x: 0, y: 0 };
  const tmj = {
    type: 'map',
    version: '1.10',
    tiledversion: '1.11.0',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: cols,
    height: rows,
    tilewidth: TILE,
    tileheight: TILE,
    nextlayerid: 4,
    nextobjectid: nextId,
    properties: [prop('name', def.name), ...(def.ambient ? [prop('ambient', def.ambient)] : [])],
    tilesets: [
      { firstgid: 1, source: `../tilesets/${setKey}.tsj` },
      { firstgid: PROPS_FIRSTGID, source: '../tilesets/props.tsj' },
    ],
    layers: [
      { id: 1, name: 'ground', type: 'tilelayer', width: cols, height: rows, ...layer, data: '__DATA__' },
      { id: 2, name: 'objects', type: 'objectgroup', draworder: 'topdown', ...layer, objects },
      { id: 3, name: 'zones', type: 'objectgroup', draworder: 'topdown', ...layer, objects: zones },
    ],
  };
  // le sol, une ligne de la carte par ligne du fichier : lisible et diffable
  const dataText = '[\n' + ground.map((r) => '        ' + r.join(',')).join(',\n') + '\n      ]';
  const text = JSON.stringify(tmj, null, 2).replace('"__DATA__"', dataText);
  writeFileSync(`tiled/maps/${id}.tmj`, text + '\n');
  console.log(`migré : ${id} (${cols}x${rows}, ${objects.length} objets, ${zones.length} zones)`);
}
