// Construit les fichiers que Tiled lit : tilesets (.tsj) et fichier projet.
// Tout ce qui sort d'ici est GÉNÉRÉ par build-art : on ne l'édite jamais, ni à la main ni dans Tiled.

import type { TerrainDef } from '../../src/content/types';

export const GENERATED_NOTE =
  "GÉNÉRÉ par tools/build-art.ts à partir de art/ et de src/content/. Ne pas éditer, ni à la main ni dans Tiled : npm run art le réécrit.";

/**
 * Un jeu de tuiles ne dépasse pas ça. Les cartes créées par l'esquisse placent le tileset des objets juste
 * au-dessus (PROPS_FIRSTGID), donc un jeu de tuiles qui grossit ne peut pas le recouvrir. Ensuite c'est le
 * `firstgid` écrit dans chaque .tmj qui fait foi (build-maps détecte les chevauchements).
 */
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
  const terrainOf = (name: string) =>
    Object.keys(t.terrains).find((k) => name.startsWith(`${k}-`) && /^\d+$/.test(name.slice(k.length + 1)) && Number(name.slice(k.length + 1)) < 16);
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

const DIRECTIONS = ['down', 'up', 'left', 'right'];

type Member = { name: string; type: string; propertyType?: string; value: string };

function objectClass(id: number, name: string, color: string, members: Member[]) {
  return { id, name, type: 'class', color, drawFill: true, members, useAs: ['object'] };
}

/**
 * Fichier projet Tiled : les types d'objets que Tiled propose dans l'éditeur de propriétés.
 *   - une classe par objet de props.json (son nom = la clé du catalogue), avec les champs surchargeables ;
 *   - `Spawn` : point d'apparition, son nom est son identifiant ;
 *   - `Exit` : rectangle qui mène vers une autre carte ;
 *   - `Npc` : point où se tient un personnage non joueur (ses pieds).
 * Un champ laissé vide n'est pas surchargé (le jeu prend la valeur de props.json, ou rien).
 */
export function projectFile(propKeys: { id: number; key: string; wood?: boolean }[]) {
  const facing = { id: 1, name: 'Facing', type: 'enum', storageType: 'string', valuesAsFlags: false, values: ['', ...DIRECTIONS] };
  const text = (name: string): Member => ({ name, type: 'string', value: '' });
  const direction: Member = { name: 'facing', type: 'string', propertyType: 'Facing', value: '' };
  return {
    _generated: GENERATED_NOTE,
    automappingRulesFile: '',
    commands: [],
    extensionsPath: 'extensions',
    folders: ['maps', 'tilesets'],
    objectTypesFile: '',
    propertyTypes: [
      facing,
      objectClass(2, 'Spawn', '#3fa34d', [direction]),
      objectClass(3, 'Exit', '#d9534f', [text('to'), text('spawn'), direction]),
      objectClass(4, 'Npc', '#4a78c2', [text('character'), direction, text('dialogue')]),
      // numéros à partir de 100 : ceux du registre des objets, donc stables
      // la pièce de bois : ses réglages (wood.json : diamètre `big`/`normal`, longueur en cm, forme `round`/`half`/`quarter`,
      // sens `ew`/`ns`, coups de doloire), vides : ceux de props.json
      ...propKeys.map((p) =>
        objectClass(100 + p.id, p.key, '#a08060', [text('interact'), ...(p.wood ? ['size', 'length', 'shape', 'axis', 'hewn'].map(text) : [])]),
      ),
    ],
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
  /** C'est la pièce de bois : Tiled propose ses réglages. */
  wood?: boolean;
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
