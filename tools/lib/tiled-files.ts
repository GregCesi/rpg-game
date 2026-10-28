// Construit les fichiers que Tiled lit : tilesets (.tsj) et, plus loin, le fichier projet.
// Tout ce qui sort d'ici est GÉNÉRÉ par build-art : on ne l'édite jamais, ni à la main ni dans Tiled.

import type { TerrainDef } from '../../src/content/types';

export const GENERATED_NOTE =
  "GÉNÉRÉ par tools/build-art.ts à partir de art/ et de src/content/. Ne pas éditer, ni à la main ni dans Tiled : npm run art le réécrit.";

/** Un jeu de tuiles ne peut pas dépasser ça : le tileset des objets commence à PROPS_FIRSTGID dans les cartes. */
export const TILESET_MAX = 1000;
export const PROPS_FIRSTGID = TILESET_MAX + 1;

const TILED_VERSION = { version: '1.10', tiledversion: '1.11.0' };
const OTHER_COLOR = '#9e9e9e';

/** Directions des arêtes, dans l'ordre des bits du masque (N=1 E=2 S=4 O=8) et indice dans un wangid. */
const EDGE_INDEX = [0, 2, 4, 6];

/**
 * Identifiant Wang d'une tuile de raccord automatique. Ordre de Tiled : haut, haut-droite, droite, bas-droite,
 * bas, bas-gauche, gauche, haut-gauche. Les coins valent 0 (jeu d'arêtes) ; chaque arête vaut 1 (le terrain)
 * si le voisin est du même terrain, 2 (« autre ») sinon : jamais 0, qui veut dire « indifférent » pour Tiled.
 */
export function wangId(mask: number): number[] {
  const id = [0, 0, 0, 0, 0, 0, 0, 0];
  EDGE_INDEX.forEach((at, bit) => {
    id[at] = mask & (1 << bit) ? 1 : 2;
  });
  return id;
}

export interface TilesetExport {
  name: string;
  tileSize: number;
  columns: number;
  imageFile: string;
  imageWidth: number;
  imageHeight: number;
  /** Une entrée par numéro de tuile : son nom, ou null pour un trou. */
  slots: (string | null)[];
  solid: ReadonlySet<string>;
  /** Nom de tuile -> nom de l'ensemble de détails posés dessus. */
  decals: ReadonlyMap<string, string>;
  terrains: Record<string, TerrainDef>;
}

type Prop = { name: string; type: string; value: string | boolean | number };

function wangSet(t: TilesetExport, terrain: string, def: TerrainDef) {
  const idOf = (mask: number) => {
    const id = t.slots.indexOf(`${terrain}-${mask}`);
    if (id < 0) throw new Error(`Jeu de tuiles '${t.name}', terrain '${terrain}' : tuile '${terrain}-${mask}' absente de art/`);
    return id;
  };
  const wangtiles = Array.from({ length: 16 }, (_, mask) => ({ tileid: idOf(mask), wangid: wangId(mask) }));
  const seen = new Map<string, number>();
  for (const w of wangtiles) {
    const k = w.wangid.join(',');
    if (seen.has(k)) throw new Error(`Jeu de tuiles '${t.name}', terrain '${terrain}' : les tuiles n°${seen.get(k)} et n°${w.tileid} ont le même wangid [${k}]`);
    seen.set(k, w.tileid);
  }
  return {
    name: terrain,
    type: 'edge',
    tile: idOf(15),
    colors: [
      { name: terrain, color: def.color, probability: 1, tile: idOf(15) },
      { name: 'autre', color: OTHER_COLOR, probability: 1, tile: idOf(0) },
    ],
    wangtiles,
  };
}

export function tilesetTsj(t: TilesetExport) {
  if (t.slots.length > TILESET_MAX) throw new Error(`Jeu de tuiles '${t.name}' : ${t.slots.length} tuiles, la limite est ${TILESET_MAX}`);
  const terrainOf = (name: string) => Object.keys(t.terrains).find((k) => new RegExp(`^${k}-\\d+$`).test(name));
  const tiles = t.slots.flatMap((name, id) => {
    if (name === null) return [];
    const properties: Prop[] = [];
    if (t.solid.has(name)) properties.push({ name: 'solid', type: 'bool', value: true });
    const d = t.decals.get(name);
    if (d) properties.push({ name: 'decals', type: 'string', value: d });
    const terrain = terrainOf(name);
    if (terrain) properties.push({ name: 'terrain', type: 'string', value: terrain });
    return [{ id, type: name, ...(properties.length ? { properties } : {}) }];
  });
  return {
    _generated: GENERATED_NOTE,
    type: 'tileset',
    ...TILED_VERSION,
    name: t.name,
    tilewidth: t.tileSize,
    tileheight: t.tileSize,
    margin: 0,
    spacing: 0,
    columns: t.columns,
    tilecount: t.slots.length,
    image: t.imageFile,
    imagewidth: t.imageWidth,
    imageheight: t.imageHeight,
    properties: [{ name: 'generated', type: 'string', value: GENERATED_NOTE }],
    tiles,
    wangsets: Object.entries(t.terrains).map(([terrain, def]) => wangSet(t, terrain, def)),
  };
}

/** Un objet de props.json vu par Tiled : une image par objet, son type est sa clé. */
export interface PropTile {
  id: number;
  key: string;
  /** Chemin de l'image, relatif au .tsj. */
  image: string;
  width: number;
  height: number;
}

export function propsTsj(tiles: PropTile[]) {
  return {
    _generated: GENERATED_NOTE,
    type: 'tileset',
    ...TILED_VERSION,
    name: 'props',
    tilewidth: Math.max(1, ...tiles.map((p) => p.width)),
    tileheight: Math.max(1, ...tiles.map((p) => p.height)),
    margin: 0,
    spacing: 0,
    columns: 0,
    tilecount: tiles.length,
    objectalignment: 'bottomleft',
    properties: [{ name: 'generated', type: 'string', value: GENERATED_NOTE }],
    tiles: tiles.map((p) => ({ id: p.id, type: p.key, image: p.image, imagewidth: p.width, imageheight: p.height })),
  };
}
