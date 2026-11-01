// Traduit les cartes Tiled (tiled/maps/*.tmj) vers le format interne du jeu (MapSchema) dans src/generated/maps.ts.
// Le jeu ne lit jamais Tiled : tout ce qui est faux dans un .tmj est signalé ici, avec la carte, l'objet et sa position.
// Usage : npm run maps   (lancé par npm run check ; suppose que npm run art a généré tiled/tilesets/)

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { TILE } from '../src/config';
import { MapSchema, WoodPieceSchema } from '../src/content/types';
import propsJson from '../src/content/props.json';
import type { Exit, MapData, MapObject, MapPlan, Npc, Parcel, Spawn } from '../src/content/types';
import { WoodAgeSchema } from '../src/content/types';
import parcelsJson from '../src/content/parcels.json';
import { TmjSchema, TsjSchema } from './lib/tiled-schema';
import type { Tmj, TmjObject, Tsj } from './lib/tiled-schema';

const MAPS_DIR = 'tiled/maps';
/** Le monde : les zones assemblées côte à côte (fichier « world » de Tiled, ouvert par Monde > Charger un monde). */
const WORLD_FILE = 'tiled/maps/monde.world';
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

/** Propriétés d'un objet ou d'une carte, par nom (les valeurs sont contrôlées par l'appelant). */
/** Les propriétés Tiled d'une pièce de bois : ses réglages (WoodPieceSchema), chacun facultatif. */
const WOOD_FIELDS = ['size', 'length', 'shape', 'axis', 'hewn'];

/**
 * Les réglages d'une pièce de bois posée dans Tiled : ceux de props.json complétés par ses propriétés (`size`, `length`, `shape`,
 * `axis`, `hewn` ; du texte, les nombres en chiffres). Aucune propriété : undefined (le jeu prend ceux de props.json). Une propriété
 * sur un objet qui n'est pas une pièce de bois, ou des réglages qui ne tiennent pas : une erreur.
 */
function readWood(key: string, props: Map<string, unknown>, oerr: (m: string) => void): MapObject['wood'] {
  const given = WOOD_FIELDS.filter((k) => props.get(k) !== undefined && props.get(k) !== '');
  if (!given.length) return undefined;
  const base = (propsJson as Record<string, { wood?: object }>)[key]?.wood;
  if (!base) {
    oerr(`propriétés ${given.join(', ')} : seule une pièce de bois en a`);
    return undefined;
  }
  const raw: Record<string, unknown> = { ...base };
  for (const k of given) {
    const v = props.get(k);
    raw[k] = k === 'length' || k === 'hewn' ? Number(v) : v;
  }
  const r = WoodPieceSchema.safeParse(raw);
  if (!r.success) {
    oerr(`réglages de bois invalides : ${z.prettifyError(r.error)}`);
    return undefined;
  }
  return r.data;
}

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
  const npcs: Npc[] = [];
  const parcels: Parcel[] = [];
  const plans: MapPlan[] = [];

  // deux tilesets dont les numéros se chevauchent : l'un a grossi depuis la dernière sauvegarde de la carte dans Tiled
  const sorted = [...uses].sort((a, b) => a.firstgid - b.firstgid);
  sorted.slice(0, -1).forEach((u, i) => {
    const span = u.kind === 'atlas' ? u.count : Math.max(-1, ...u.tiles.keys()) + 1;
    if (u.firstgid + span > sorted[i + 1].firstgid) {
      err(`tilesets '${u.key}' et '${sorted[i + 1].key}' se chevauchent : '${u.key}' a changé depuis la dernière sauvegarde de la carte, la rouvrir et l'enregistrer dans Tiled`);
    }
  });

  for (const layer of tmj.layers) {
    if (layer.type !== 'imagelayer' && layer.type !== 'group' && (layer.offsetx !== 0 || layer.offsety !== 0)) {
      err(`calque '${layer.name}' décalé de (${layer.offsetx}, ${layer.offsety}) : le décalage de calque n'est pas géré, le remettre à 0`);
    }
    if (layer.type === 'tilelayer') {
      if (layers[layer.name]) {
        err(`calque de tuiles '${layer.name}' en double`);
        continue;
      }
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
    const cls = o.type || o.class || '';
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
      if (o.point || o.gid !== undefined || o.width <= 0 || o.height <= 0) return oerr('une sortie est un rectangle (outil « Insérer un rectangle »)');
      const to = text('to');
      const spawn = text('spawn');
      if (!to) oerr("champ 'to' (carte d'arrivée) manquant");
      if (!spawn) oerr("champ 'spawn' (point d'arrivée) manquant");
      if (to && spawn) exits.push({ x: o.x, y: o.y, w: o.width, h: o.height, to, spawn, ...(facing() ? { facing: facing() } : {}) });
    } else if (cls === 'Npc') {
      only(['character', 'facing', 'dialogue']);
      if (!o.point) return oerr('un personnage est un point (outil « Insérer un point ») : ses pieds');
      const character = text('character');
      const dialogue = text('dialogue');
      if (!character) oerr("champ 'character' (clé de characters.json) manquant");
      if (!dialogue) oerr("champ 'dialogue' (clé de dialogues.json) manquant");
      if (character && dialogue) npcs.push({ x: o.x, y: o.y, character, dialogue, ...(facing() ? { facing: facing() } : {}) });
    } else if (cls === 'Parcel') {
      only(['use']);
      if (o.point || o.gid !== undefined || o.width <= 0 || o.height <= 0) return oerr('une parcelle est un rectangle (outil « Insérer un rectangle »)');
      const use = text('use');
      if (!use) return oerr("champ 'use' (destination, clé de src/content/parcels.json) manquant");
      if (!(parcelsJson as Record<string, unknown>)[use]) return oerr(`destination '${use}' inconnue (attendues : ${Object.keys(parcelsJson).join(', ')})`);
      parcels.push({ x: o.x, y: o.y, w: o.width, h: o.height, use, ...(o.name ? { name: o.name } : {}) });
    } else if (cls === 'Plan') {
      only(['plan', 'age']);
      if (o.gid !== undefined) return oerr('un plan posé est un rectangle ou un point (son coin nord-ouest)');
      const plan = text('plan');
      const age = text('age');
      if (!plan) return oerr("champ 'plan' (un plan de src/content/plans/, sans .json) manquant");
      if (!existsSync(`src/content/plans/${plan}.json`)) return oerr(`plan '${plan}' introuvable (src/content/plans/${plan}.json)`);
      if (age !== undefined && !WoodAgeSchema.safeParse(age).success) return oerr(`âge '${age}' inconnu (attendus : ${WoodAgeSchema.options.join(', ')})`);
      plans.push({ id: o.id, x: o.x, y: o.y, plan, ...(age ? { age: age as MapPlan['age'] } : {}) });
    } else {
      only(['interact', 'age', ...WOOD_FIELDS]);
      if (o.gid === undefined) return oerr("objet sans image : type inconnu (attendus : Spawn, Exit, Npc, ou un objet posé depuis le tileset 'props')");
      if (o.gid > 0x0fffffff || (o.gid & FLIP_BITS) !== 0) return oerr('image retournée ou pivotée, non gérée');
      const u = owner(o.gid);
      if (!u || u.kind !== 'collection') return oerr(`l'image vient de '${u?.key ?? '?'}' : un objet se pose depuis le tileset d'images (props)`);
      const tile = u.tiles.get(o.gid - u.firstgid);
      const key = tile && (tile.type || tile.class);
      if (!tile || !key) return oerr(`image n°${o.gid - u.firstgid} inconnue dans '${u.key}' : relancer npm run art`);
      if (cls && cls !== key) return oerr(`type « ${cls} » mais l'image est celle de « ${key} »`);
      if (o.width !== tile.imagewidth || o.height !== tile.imageheight) {
        return oerr(`taille ${o.width}x${o.height} au lieu de ${tile.imagewidth}x${tile.imageheight} : redimensionner un objet n'est pas géré`);
      }
      const interact = text('interact');
      const wood = readWood(key, props, oerr);
      const age = text('age');
      if (age !== undefined && !WoodAgeSchema.safeParse(age).success) return oerr(`âge '${age}' inconnu (attendus : ${WoodAgeSchema.options.join(', ')})`);
      if (age && !(propsJson as Record<string, { aged?: boolean }>)[key]?.aged) return oerr(`propriété 'age' : seul un objet de bois travaillé (\`aged\` de props.json) en a`);
      objects.push({ id: o.id, type: key, x: o.x, y: o.y, ...(interact ? { interact } : {}), ...(wood ? { wood } : {}), ...(age ? { age: age as MapObject['age'] } : {}) });
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
    npcs,
    parcels,
    plans,
  });
  if (!map.success) {
    err(`format interne invalide :\n${indent(z.prettifyError(map.error))}`);
    return undefined;
  }
  return map.data;
}

/** Le fichier « world » de Tiled : une carte par zone, sa place en pixels. */
const WorldFileSchema = z.object({
  type: z.literal('world'),
  maps: z.array(z.object({ fileName: z.string(), x: z.number(), y: z.number(), width: z.number(), height: z.number() })),
});

/**
 * Lit le monde (WORLD_FILE) : chaque zone qu'il nomme reçoit sa place (`world` de la carte). Refusé avec un message : une carte
 * inconnue, une place hors de la grille des tuiles, une taille qui n'est pas celle du .tmj, deux zones qui se recouvrent. Sans fichier,
 * aucune carte n'est une zone.
 */
function readWorld(maps: Record<string, MapData>, errors: string[]): void {
  if (!existsSync(WORLD_FILE)) return;
  const err = (m: string): void => {
    errors.push(`Monde (${WORLD_FILE}) : ${m}`);
  };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(WORLD_FILE, 'utf8'));
  } catch (e) {
    return err(`JSON illisible (${(e as Error).message})`);
  }
  const r = WorldFileSchema.safeParse(raw);
  if (!r.success) return err(`format inattendu :\n${indent(z.prettifyError(r.error))}`);
  const placed: { id: string; x: number; y: number; w: number; h: number }[] = [];
  for (const z0 of r.data.maps) {
    const id = basename(z0.fileName, '.tmj');
    const m = maps[id];
    if (!m) {
      err(`zone '${z0.fileName}' : aucune carte ${MAPS_DIR}/${id}.tmj`);
      continue;
    }
    if (m.world) {
      err(`zone '${id}' nommée deux fois`);
      continue;
    }
    if (z0.x % TILE || z0.y % TILE) err(`zone '${id}' en (${z0.x}, ${z0.y}) : hors de la grille des tuiles (${TILE} px)`);
    if (z0.width !== m.width * TILE || z0.height !== m.height * TILE) {
      err(`zone '${id}' : ${z0.width}x${z0.height} px dans le monde, la carte fait ${m.width * TILE}x${m.height * TILE} px (rouvrir le monde dans Tiled)`);
    }
    const box = { id, x: z0.x, y: z0.y, w: m.width * TILE, h: m.height * TILE };
    const over = placed.find((b) => b.x < box.x + box.w && box.x < b.x + b.w && b.y < box.y + box.h && box.y < b.y + b.h);
    if (over) err(`zones '${over.id}' et '${id}' se recouvrent`);
    placed.push(box);
    m.world = { x: z0.x, y: z0.y };
  }
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
  readWorld(maps, errors);
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
