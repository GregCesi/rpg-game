// Traduit les cartes Tiled (tiled/maps/*.tmj) vers le format interne du jeu (MapSchema) dans src/generated/maps.ts.
// Le jeu ne lit jamais Tiled : tout ce qui est faux dans un .tmj est signalé ici, avec la carte, l'objet et sa position.
// Usage : npm run maps   (lancé par npm run check ; suppose que npm run art a généré tiled/tilesets/)

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { TILE } from '../src/config';
import { MapSchema } from '../src/content/types';
import type { Exit, MapData, MapObject, Spawn } from '../src/content/types';
import { TmjSchema, TsjSchema } from './lib/tiled-schema';
import type { Tmj, TmjObject, Tsj } from './lib/tiled-schema';

const MAPS_DIR = 'tiled/maps';
const OUT = 'src/generated/maps.ts';
const FACINGS = ['down', 'up', 'left', 'right'];
/** Bits de retournement / rotation que Tiled range dans les bits de poids fort d'un gid. */
const FLIP_BITS = 0xf0000000;
/** Au-delà, on arrête de lister les cases fautives d'un calque. */
const MAX_PER_LAYER = 8;

interface TilesetUse {
  firstgid: number;
  key: string;
  kind: 'atlas' | 'collection';
  count: number;
  tiles: Map<number, Tsj['tiles'][number]>;
}

const round = (n: number) => Math.round(n * 10) / 10;
const indent = (s: string) => s.replace(/^/gm, '    ');

function readTileset(mapPath: string, firstgid: number, source: string, err: (m: string) => void): TilesetUse | undefined {
  const path = resolve(dirname(mapPath), source);
  const key = basename(source, '.tsj');
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    err(`tileset '${source}' introuvable ou illisible : lancer npm run art, ou référencer un .tsj de tiled/tilesets/ (pas de .tsx, pas de tileset intégré)`);
    return undefined;
  }
  const r = TsjSchema.safeParse(raw);
  if (!r.success) {
    err(`tileset '${source}' : format inattendu :\n${indent(z.prettifyError(r.error))}`);
    return undefined;
  }
  return {
    firstgid,
    key,
    kind: r.data.image ? 'atlas' : 'collection',
    count: r.data.tilecount,
    tiles: new Map(r.data.tiles.map((t) => [t.id, t])),
  };
}

/** Valeur d'une propriété Tiled, en vérifiant son type. */
function readProps(list: { name: string; type?: string; value?: unknown }[] | undefined) {
  return new Map((list ?? []).map((p) => [p.name, p.value]));
}

function convert(id: string, path: string, errors: string[]): MapData | undefined {
  const start = errors.length;
  const err = (m: string) => errors.push(`Carte ${id} : ${m}`);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    err(`JSON illisible (${(e as Error).message})`);
    return undefined;
  }
  const parsed = TmjSchema.safeParse(raw);
  if (!parsed.success) {
    err(`format Tiled inattendu :\n${indent(z.prettifyError(parsed.error))}`);
    return undefined;
  }
  const tmj: Tmj = parsed.data;

  if (tmj.orientation !== 'orthogonal') err(`orientation '${tmj.orientation}' non gérée (orthogonale seulement)`);
  if (tmj.infinite) err("carte infinie non gérée : décocher « Infinie » dans Carte > Propriétés de la carte");
  if (tmj.tilewidth !== TILE || tmj.tileheight !== TILE) err(`tuiles de ${tmj.tilewidth}x${tmj.tileheight} px au lieu de ${TILE}x${TILE}`);

  // Tilesets référencés : un seul jeu de tuiles (planche) pour le sol, plus la collection des objets
  const uses: TilesetUse[] = [];
  for (const ref of tmj.tilesets) {
    if (!ref.source) {
      err('tileset intégré à la carte : référencer les .tsj générés de tiled/tilesets/');
      continue;
    }
    const u = readTileset(path, ref.firstgid, ref.source, err);
    if (u) uses.push(u);
  }
  const atlases = uses.filter((u) => u.kind === 'atlas');
  if (atlases.length !== 1) {
    err(`doit référencer exactement un jeu de tuiles (planche d'images) pour le sol, pas ${atlases.length}${atlases.length ? ` (${atlases.map((a) => a.key).join(', ')})` : ''}`);
    return undefined;
  }
  const atlas = atlases[0];
  const byGid = [...uses].sort((a, b) => b.firstgid - a.firstgid);
  const owner = (gid: number) => byGid.find((u) => u.firstgid <= gid);

  // Propriétés de la carte
  const mapProps = readProps(tmj.properties);
  const name = mapProps.get('name');
  const ambient = mapProps.get('ambient');
  if (typeof name !== 'string' || !name) err("propriété personnalisée 'name' (texte) manquante : c'est le nom affiché de la carte");
  if (ambient !== undefined && typeof ambient !== 'number') err("propriété 'ambient' : un nombre entre 0 et 1 est attendu");
  for (const k of mapProps.keys()) if (k !== 'name' && k !== 'ambient') err(`propriété de carte inconnue '${k}' (attendues : name, ambient)`);

  const layers: Record<string, number[]> = {};
  const objects: MapObject[] = [];
  const spawns: Record<string, Spawn> = {};
  const exits: Exit[] = [];

  for (const layer of tmj.layers) {
    if (layer.type === 'tilelayer') {
      if (layer.name !== 'ground') {
        err(`calque de tuiles '${layer.name}' inconnu : seul 'ground' est géré pour l'instant`);
        continue;
      }
      if (typeof layer.data === 'string') {
        err(`calque '${layer.name}' encodé en base64 : choisir CSV dans Carte > Propriétés de la carte > Format de couche de tuiles`);
        continue;
      }
      if (layer.width !== tmj.width || layer.height !== tmj.height || layer.data.length !== tmj.width * tmj.height) {
        err(`calque '${layer.name}' : ${layer.width}x${layer.height} (${layer.data.length} cases) pour une carte de ${tmj.width}x${tmj.height}`);
        continue;
      }
      let bad = 0;
      const report = (m: string) => {
        if (bad++ < MAX_PER_LAYER) err(m);
      };
      layers[layer.name] = layer.data.map((gid, i) => {
        if (gid === 0) return -1;
        const at = `(${i % tmj.width}, ${Math.floor(i / tmj.width)})`;
        if (gid > 0x0fffffff || (gid & FLIP_BITS) !== 0) {
          report(`calque '${layer.name}' : tuile retournée ou pivotée en ${at}, non gérée`);
          return -1;
        }
        const u = owner(gid);
        if (u !== atlas) {
          report(`calque '${layer.name}' : tuile du tileset '${u?.key ?? '?'}' en ${at} (le sol n'accepte que '${atlas.key}')`);
          return -1;
        }
        const local = gid - atlas.firstgid;
        if (local >= atlas.count) {
          report(`calque '${layer.name}' : tuile n°${local} en ${at} hors du tileset '${atlas.key}' (${atlas.count} tuiles)`);
          return -1;
        }
        return local;
      });
      if (bad > MAX_PER_LAYER) err(`calque '${layer.name}' : ${bad - MAX_PER_LAYER} autre(s) tuile(s) fautive(s) non listée(s)`);
    } else if (layer.type === 'objectgroup') {
      for (const o of layer.objects) readObject(o);
    } else {
      err(`calque '${layer.name}' de type '${layer.type}' non géré`);
    }
  }
  if (!layers.ground) err("calque de tuiles 'ground' manquant");

  function readObject(o: TmjObject) {
    const cls = o.type ?? o.class ?? '';
    const label = `${cls ? `« ${cls} »` : 'objet'}${o.name ? ` '${o.name}'` : ''} (n°${o.id}) en (${round(o.x)}, ${round(o.y)})`;
    const oerr = (m: string) => err(`${label} : ${m}`);
    if (o.ellipse || o.polygon || o.polyline || o.text) return oerr('forme non gérée (point, rectangle ou objet-tuile seulement)');
    if (o.rotation !== 0) return oerr('rotation non gérée');
    const props = readProps(o.properties);
    const text = (key: string) => {
      const v = props.get(key);
      if (v === undefined || v === '') return undefined;
      if (typeof v !== 'string') oerr(`propriété '${key}' : du texte est attendu`);
      return typeof v === 'string' ? v : undefined;
    };
    const only = (allowed: string[]) => {
      for (const k of props.keys()) if (!allowed.includes(k)) oerr(`propriété inconnue '${k}' (attendues : ${allowed.join(', ')})`);
    };
    const facing = () => {
      const f = text('facing');
      if (f !== undefined && !FACINGS.includes(f)) oerr(`facing '${f}' invalide (${FACINGS.join(', ')})`);
      return f !== undefined && FACINGS.includes(f) ? (f as Spawn['facing']) : undefined;
    };

    if (cls === 'Spawn') {
      only(['facing']);
      if (!o.point) return oerr('un point d\'apparition est un point (outil « Insérer un point »)');
      if (!o.name) return oerr("un point d'apparition doit avoir un nom : c'est son identifiant");
      if (spawns[o.name]) return oerr('nom déjà pris par un autre point de la carte');
      spawns[o.name] = { x: o.x, y: o.y, ...(facing() ? { facing: facing() } : {}) };
    } else if (cls === 'Exit') {
      only(['to', 'spawn', 'facing']);
      if (o.point || o.width <= 0 || o.height <= 0) return oerr('une sortie est un rectangle (outil « Insérer un rectangle »)');
      const to = text('to');
      const spawn = text('spawn');
      if (!to) oerr("champ 'to' (carte d'arrivée) manquant");
      if (!spawn) oerr("champ 'spawn' (point d'arrivée) manquant");
      if (to && spawn) exits.push({ x: o.x, y: o.y, w: o.width, h: o.height, to, spawn, ...(facing() ? { facing: facing() } : {}) });
    } else {
      only(['interact']);
      if (o.gid === undefined) return oerr("objet sans image : type inconnu (attendus : Spawn, Exit, ou un objet posé depuis le tileset 'props')");
      if (o.gid > 0x0fffffff || (o.gid & FLIP_BITS) !== 0) return oerr('image retournée ou pivotée, non gérée');
      const u = owner(o.gid);
      if (!u || u.kind !== 'collection') return oerr(`l'image vient de '${u?.key ?? '?'}' : un objet se pose depuis le tileset d'images (props)`);
      const tile = u.tiles.get(o.gid - u.firstgid);
      const key = tile && (tile.type ?? tile.class);
      if (!tile || !key) return oerr(`image n°${o.gid - u.firstgid} inconnue dans '${u.key}' : relancer npm run art`);
      if (cls && cls !== key) return oerr(`type « ${cls} » mais l'image est celle de « ${key} »`);
      if (o.width !== tile.imagewidth || o.height !== tile.imageheight) {
        return oerr(`taille ${o.width}x${o.height} au lieu de ${tile.imagewidth}x${tile.imageheight} : redimensionner un objet n'est pas géré`);
      }
      const interact = text('interact');
      objects.push({ type: key, x: o.x, y: o.y, ...(interact ? { interact } : {}) });
    }
  }

  if (errors.length > start) return undefined;
  const map = MapSchema.safeParse({
    id,
    name,
    tileset: atlas.key,
    ...(typeof ambient === 'number' ? { ambient } : {}),
    width: tmj.width,
    height: tmj.height,
    layers,
    objects,
    spawns,
    exits,
  });
  if (!map.success) {
    err(`format interne invalide :\n${indent(z.prettifyError(map.error))}`);
    return undefined;
  }
  return map.data;
}

function main() {
  const files = readdirSync(MAPS_DIR).filter((f) => f.endsWith('.tmj')).sort();
  if (!files.length) {
    console.error(`\n✗ aucune carte .tmj dans ${MAPS_DIR}\n`);
    process.exit(1);
  }
  const errors: string[] = [];
  const maps: Record<string, MapData> = {};
  for (const f of files) {
    const id = basename(f, '.tmj');
    const m = convert(id, join(MAPS_DIR, f), errors);
    if (m) maps[id] = m;
  }
  if (errors.length) {
    console.error(`\n✗ ${errors.length} problème(s) dans les cartes Tiled :`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error('');
    process.exit(1);
  }
  const rows = Object.entries(maps).map(([id, m]) => `  ${JSON.stringify(id)}: ${JSON.stringify(m)},`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    `// GÉNÉRÉ par tools/build-maps.ts à partir de tiled/maps/*.tmj. Ne pas modifier à la main.
import type { MapData } from '../content/types';

export const maps: Record<string, MapData> = {
${rows.join('\n')}
};
`,
  );
  console.log(`cartes : ${files.length} .tmj -> ${OUT}`);
}

main();
