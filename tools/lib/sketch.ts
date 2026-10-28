// Esquisse d'une carte : une grille de lettres (sol, objets) + points d'apparition + sorties, convertie en carte Tiled.
// L'esquisse ne sert qu'à la naissance d'une carte : une fois le .tmj écrit, c'est lui qui fait foi (voir tools/sketch.ts).
// La logique est celle du script de migration des cartes à lettres (commit 0ebd78e) : raccords automatiques,
// variantes au hasard stables, cycles, ancrage des objets.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { TILE } from '../../src/config';
import { FacingSchema } from '../../src/content/types';
import { PROPS_FIRSTGID } from './tiled-files';

const MAPS_DIR = 'tiled/maps';
const letter = z.string().length(1);
const id = z.string().min(1);
const tile = z.number().int().nonnegative();

/** Une lettre de sol : des tuiles (variantes au hasard, ou en cycle), ou une famille de terrain à raccord automatique. */
const GroundEntrySchema = z
  .strictObject({
    tiles: z.array(id).min(1).optional(),
    /** Famille de 16 tuiles `<terrain>-<masque>` (voir `terrains` de src/content/tiles.json). */
    terrain: id.optional(),
    /** Tuiles prises dans l'ordre selon la colonne au lieu du hasard : motifs réguliers (poteaux d'un mur). */
    cycle: z.boolean().optional(),
    /** Autres lettres de sol avec lesquelles ce terrain se relie (ex. une cloison qui rejoint un mur épais). */
    connects: z.string().optional(),
  })
  .refine((e) => (e.tiles === undefined) !== (e.terrain === undefined), { message: "une lettre de sol a soit 'tiles', soit 'terrain'" });

/**
 * Légende des lettres (tiled/sketch-legend.json) : lettre de sol -> tuiles ou terrain, par jeu de tuiles ;
 * lettre d'objet -> clé de props.json (et ancrage : 'center' = image centrée sur la case, 'left' = coin bas gauche sur la case).
 */
export const SketchLegendSchema = z.strictObject({
  ground: z.record(id, z.record(letter, GroundEntrySchema)),
  props: z.record(letter, z.union([id, z.strictObject({ prop: id, anchor: z.enum(['center', 'left']) })])),
});

/** Une esquisse : l'ancien format de carte (une lettre par case), coordonnées de point et de sortie en cases. */
export const SketchSchema = z.strictObject({
  /** Facultatif : l'identifiant de la carte est le nom du fichier. S'il est donné, il doit y correspondre. */
  id: id.optional(),
  name: id,
  /** Jeu de tuiles du sol. Défaut : 'world'. */
  tileset: id.optional(),
  ambient: z.number().min(0).max(1).optional(),
  ground: z.array(z.string().min(1)).min(1),
  /** Objets, même taille que le sol. '.' = rien. */
  props: z.array(z.string()),
  spawns: z.record(id, z.strictObject({ x: tile, y: tile, facing: FacingSchema.optional() })),
  exits: z.array(z.strictObject({ x: tile, y: tile, facing: FacingSchema, to: id, spawn: id })).optional(),
});

export type SketchLegend = z.infer<typeof SketchLegendSchema>;
export type Sketch = z.infer<typeof SketchSchema>;

/** Ce que `npm run art` a produit et dont l'esquisse a besoin. */
export interface SketchContext {
  /** Nom de tuile -> numéro, par jeu de tuiles. */
  tileIndex: Record<string, Record<string, number>>;
  /** Clé de props.json -> numéro et taille de l'image dans le tileset des objets. */
  propTiles: Record<string, { id: number; width: number; height: number }>;
}

export function loadContext(): SketchContext {
  const read = (path: string) => {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      throw new Error(`${path} introuvable : lancer npm run art`);
    }
  };
  const manifest = read('src/generated/manifest.json') as { tilesets: { key: string; tiles: Record<string, number> }[] };
  const props = read('tiled/tilesets/props.tsj') as { tiles: { id: number; type: string; imagewidth: number; imageheight: number }[] };
  return {
    tileIndex: Object.fromEntries(manifest.tilesets.map((t) => [t.key, t.tiles])),
    propTiles: Object.fromEntries(props.tiles.map((t) => [t.type, { id: t.id, width: t.imagewidth, height: t.imageheight }])),
  };
}

/** L'esquisse ne sert qu'à la naissance d'une carte : si le .tmj existe, on le dit (le .tmj fait foi). */
export function existingMapError(mapId: string, mapsDir = MAPS_DIR): string | undefined {
  const path = join(mapsDir, `${mapId}.tmj`);
  return existsSync(path)
    ? `${path} existe déjà : l'esquisse ne sert qu'à la naissance d'une carte, ensuite le .tmj fait foi. Modifier la carte dans Tiled, ou supprimer ce fichier pour repartir de l'esquisse.`
    : undefined;
}

/** Hachage stable d'une position (celui de l'ancien GameMap, repris tel quel pour que les variantes soient les mêmes). */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

type Prop = { name: string; type: string; value: string | number };
const prop = (name: string, value: string | number, propertytype?: string): Prop => ({
  name,
  type: typeof value === 'number' ? 'float' : 'string',
  ...(propertytype ? { propertytype } : {}),
  value,
});

/** Au-delà, on arrête de lister les cases fautives d'une même sorte. */
const MAX_PER_KIND = 8;

/** Convertit une esquisse en carte Tiled (objet JSON du .tmj) ; renvoie les problèmes trouvés, avec lettre et position. */
export function sketchToTmj(mapId: string, sketch: Sketch, legend: SketchLegend, ctx: SketchContext): { tmj?: object; errors: string[] } {
  const errors: string[] = [];
  const err = (m: string) => errors.push(`Esquisse ${mapId} : ${m}`);
  const counts = new Map<string, number>();
  /** Signale une case fautive, au plus MAX_PER_KIND fois par sorte. */
  const errCell = (kind: string, m: string) => {
    const n = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, n);
    if (n <= MAX_PER_KIND) err(m);
    else if (n === MAX_PER_KIND + 1) err(`d'autres ${kind} fautives ne sont pas listées`);
  };

  if (sketch.id && sketch.id !== mapId) err(`son champ id vaut '${sketch.id}' alors que le fichier s'appelle '${mapId}.json'`);
  const setKey = sketch.tileset ?? 'world';
  const index = ctx.tileIndex[setKey];
  const entries = legend.ground[setKey];
  if (!index) err(`jeu de tuiles '${setKey}' inconnu (dessiné dans art/ ?)`);
  if (!entries) err(`aucune légende de sol pour le jeu de tuiles '${setKey}' dans tiled/sketch-legend.json`);
  if (!index || !entries) return { errors };

  const rows = sketch.ground.length;
  const cols = sketch.ground[0].length;
  sketch.ground.forEach((row, y) => {
    if (row.length !== cols) err(`ligne ${y} du sol : ${row.length} cases au lieu de ${cols}`);
  });
  if (sketch.props.length !== rows) err(`la couche objets fait ${sketch.props.length} lignes au lieu de ${rows}`);
  sketch.props.forEach((row, y) => {
    if (row.length !== cols) err(`ligne ${y} des objets : ${row.length} cases au lieu de ${cols}`);
  });
  if (errors.length) return { errors };

  // La légende de ce jeu de tuiles doit pointer vers des tuiles qui existent
  for (const [ch, e] of Object.entries(entries)) {
    const names = e.terrain ? Array.from({ length: 16 }, (_, m) => `${e.terrain}-${m}`) : (e.tiles ?? []);
    for (const n of names) if (!(n in index)) err(`légende du sol '${ch}' (${setKey}) : tuile '${n}' absente du jeu de tuiles`);
  }

  // Sol : même résolution que l'ancien GameMap
  const ground = sketch.ground.map((row, y) =>
    [...row].map((ch, x) => {
      const t = entries[ch];
      if (!t) {
        errCell('lettres de sol', `lettre de sol '${ch}' inconnue en (${x}, ${y}) (légende '${setKey}' : ${Object.keys(entries).join(' ')})`);
        return 0;
      }
      let name: string;
      if (t.terrain) {
        // hors de la carte compte comme identique : un chemin qui sort de l'écran n'a pas de bordure
        const same = (dx: number, dy: number) => {
          const n = sketch.ground[y + dy]?.[x + dx];
          return n === undefined || n === ch || (t.connects ?? '').includes(n);
        };
        const mask = (same(0, -1) ? 1 : 0) | (same(1, 0) ? 2 : 0) | (same(0, 1) ? 4 : 0) | (same(-1, 0) ? 8 : 0);
        name = `${t.terrain}-${mask}`;
      } else if (t.cycle) {
        name = t.tiles![x % t.tiles!.length];
      } else {
        name = t.tiles![hash(x, y) % t.tiles!.length];
      }
      return (index[name] ?? -1) + 1; // gid Tiled = numéro + 1 (firstgid 1)
    }),
  );

  let nextId = 1;
  const base = () => ({ id: nextId++, rotation: 0, visible: true });

  // Objets : coin bas gauche de l'image, en pixels (convention des objets-tuiles de Tiled)
  const objects: object[] = [];
  sketch.props.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const entry = legend.props[ch];
      if (!entry) return errCell("lettres d'objet", `lettre d'objet '${ch}' inconnue en (${x}, ${y}) (légende : ${Object.keys(legend.props).join(' ')})`);
      const key = typeof entry === 'string' ? entry : entry.prop;
      const anchorLeft = typeof entry !== 'string' && entry.anchor === 'left';
      const info = ctx.propTiles[key];
      if (!info) return errCell("lettres d'objet", `lettre d'objet '${ch}' en (${x}, ${y}) : objet '${key}' absent de props.json (ou image non dessinée)`);
      objects.push({
        ...base(),
        name: '',
        type: key,
        x: anchorLeft ? x * TILE : x * TILE + TILE / 2 - info.width / 2,
        y: y * TILE + TILE,
        width: info.width,
        height: info.height,
        gid: PROPS_FIRSTGID + info.id,
      });
    }),
  );

  // Zones : points d'apparition (pieds en bas de la case) et sorties (une case)
  const zones: object[] = [];
  for (const [name, s] of Object.entries(sketch.spawns)) {
    if (s.x >= cols || s.y >= rows) err(`point '${name}' en (${s.x}, ${s.y}) hors de la carte (${cols}x${rows})`);
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
  for (const e of sketch.exits ?? []) {
    if (e.x >= cols || e.y >= rows) err(`sortie en (${e.x}, ${e.y}) hors de la carte (${cols}x${rows})`);
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
  if (errors.length) return { errors };

  const layer = { opacity: 1, visible: true, x: 0, y: 0 };
  return {
    errors,
    tmj: {
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
      properties: [prop('name', sketch.name), ...(sketch.ambient ? [prop('ambient', sketch.ambient)] : [])],
      tilesets: [
        { firstgid: 1, source: `../tilesets/${setKey}.tsj` },
        { firstgid: PROPS_FIRSTGID, source: '../tilesets/props.tsj' },
      ],
      layers: [
        { id: 1, name: 'ground', type: 'tilelayer', width: cols, height: rows, ...layer, data: ground.flat() },
        { id: 2, name: 'objects', type: 'objectgroup', draworder: 'topdown', ...layer, objects },
        { id: 3, name: 'zones', type: 'objectgroup', draworder: 'topdown', ...layer, objects: zones },
      ],
    },
  };
}

/** Texte du .tmj : le sol à raison d'une ligne de la carte par ligne du fichier (lisible et diffable). */
export function serializeTmj(tmj: { width: number; layers: { name: string; data?: number[] }[] }): string {
  const ground = tmj.layers.find((l) => l.name === 'ground')!.data!;
  const rows: number[][] = [];
  for (let i = 0; i < ground.length; i += tmj.width) rows.push(ground.slice(i, i + tmj.width));
  const text = JSON.stringify({ ...tmj, layers: tmj.layers.map((l) => (l.name === 'ground' ? { ...l, data: '__DATA__' } : l)) }, null, 2);
  const dataText = '[\n' + rows.map((r) => '        ' + r.join(',')).join(',\n') + '\n      ]';
  return text.replace('"__DATA__"', dataText) + '\n';
}
