// Vérifications croisées du contenu : tout ce qu'un schéma seul ne peut pas voir
// (une sortie vers une carte qui n'existe pas, un objet dont l'image n'a pas été dessinée...).
// Utilisé par `npm run check` (Node) et au démarrage du jeu.

import { PLAYER, PORTRAIT_MODES, START, TILE } from '../config';
import type { CharacterDef, DialogueDef, MapData, PropDef, TilesetCatalog } from './types';

/** Ce que `npm run art` a produit : clés d'images, animations par planche, tuiles par jeu de tuiles. */
export interface Catalog {
  textures: Set<string>;
  animations: Map<string, Set<string>>;
  tiles: Map<string, Set<string>>;
  /** Numéros de tuiles qui existent (hors trous) et numéros bloquants, par jeu de tuiles. */
  tileNumbers: Map<string, Set<number>>;
  solid: Map<string, Set<number>>;
}

interface ManifestLike {
  spritesheets: { key: string; animations: Record<string, unknown> }[];
  tilesets: { key: string; tiles: Record<string, number>; solid: number[] }[];
  images: { key: string }[];
}

export function catalogFrom(m: ManifestLike): Catalog {
  return {
    textures: new Set([...m.spritesheets, ...m.tilesets, ...m.images].map((a) => a.key)),
    animations: new Map(m.spritesheets.map((s) => [s.key, new Set(Object.keys(s.animations))])),
    tiles: new Map(m.tilesets.map((t) => [t.key, new Set(Object.keys(t.tiles))])),
    tileNumbers: new Map(m.tilesets.map((t) => [t.key, new Set(Object.values(t.tiles))])),
    solid: new Map(m.tilesets.map((t) => [t.key, new Set(t.solid)])),
  };
}

/** Détails posés au hasard : leurs images doivent être dessinées. */
export function validateTilesCatalog(catalogs: Record<string, TilesetCatalog>, cat: Catalog): string[] {
  const errors: string[] = [];
  for (const [set, c] of Object.entries(catalogs)) {
    if (!cat.tiles.has(set)) errors.push(`tiles.json : aucun jeu de tuiles '${set}' n'a été dessiné dans art/`);
    for (const [name, d] of Object.entries(c.decals)) {
      for (const img of d.images) if (!cat.textures.has(img)) errors.push(`tiles.json [${set}] détails '${name}' : image '${img}' non dessinée`);
    }
  }
  return errors;
}

/**
 * Cartes au format interne (issues de Tiled) : tout ce que le schéma ne voit pas.
 * `propsByType` : objets de props.json, indexés par le type que porte un objet de carte.
 */
export function validateMaps(
  maps: Record<string, MapData>,
  propsByType: Record<string, PropDef>,
  dialogues: Record<string, DialogueDef>,
  cat: Catalog,
): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  if (!maps[START.map]?.spawns[START.spawn]) err(`config.ts START : point '${START.spawn}' introuvable sur la carte '${START.map}'`);
  for (const [key, m] of Object.entries(maps)) {
    const where = `Carte ${key}`;
    const numbers = cat.tileNumbers.get(m.tileset);
    const solid = cat.solid.get(m.tileset);
    if (!numbers || !solid) {
      err(`${where} : jeu de tuiles '${m.tileset}' inconnu (aucun n'a été dessiné dans art/)`);
      continue;
    }
    const W = m.width * TILE;
    const H = m.height * TILE;
    const ground = m.layers.ground;
    if (!ground) {
      err(`${where} : calque 'ground' manquant`);
      continue;
    }
    ground.forEach((n, i) => {
      const at = `(${i % m.width}, ${Math.floor(i / m.width)})`;
      if (n < 0) err(`${where} : case vide du sol en ${at} : le sol doit être peint partout`);
      else if (!numbers.has(n)) err(`${where} : tuile n°${n} en ${at} absente du jeu de tuiles '${m.tileset}' (retirée de art/ ?)`);
    });
    const solidAt = (px: number, py: number) => solid.has(ground[Math.floor(py / TILE) * m.width + Math.floor(px / TILE)]);

    for (const o of m.objects) {
      const at = `${where} : objet « ${o.type} » en (${o.x}, ${o.y})`;
      if (!propsByType[o.type]) err(`${at} : absent de props.json`);
      if (o.x < 0 || o.y < 0 || o.x > W || o.y > H) err(`${at} : hors de la carte`);
      if (o.interact && !dialogues[o.interact]) err(`${at} : dialogue '${o.interact}' introuvable`);
    }
    for (const [name, s] of Object.entries(m.spawns)) {
      const at = `${where} : point '${name}' en (${s.x}, ${s.y})`;
      if (s.x < 0 || s.y < 0 || s.x >= W || s.y >= H) err(`${at} : hors de la carte`);
      else if (solidAt(s.x, s.y)) err(`${at} : posé sur une case bloquante (${Math.floor(s.x / TILE)}, ${Math.floor(s.y / TILE)})`);
      // arrivé dans une sortie qu'il prendrait en avançant, le joueur repartirait aussitôt
      for (const e of m.exits) {
        const inside = s.x >= e.x && s.x < e.x + e.w && s.y - 3 >= e.y && s.y - 3 < e.y + e.h;
        if (inside && (e.facing === undefined || e.facing === s.facing)) {
          err(`${at} : dans la sortie en (${e.x}, ${e.y}) : le joueur repartirait aussitôt (donner à la sortie un 'facing' opposé à celui du point)`);
        }
      }
    }
    for (const e of m.exits) {
      const at = `${where} : sortie en (${e.x}, ${e.y})`;
      if (e.x < 0 || e.y < 0 || e.x + e.w > W || e.y + e.h > H) err(`${at} : hors de la carte`);
      else {
        // une sortie est inutilisable si toutes les cases qu'elle recouvre sont bloquantes
        let walkable = false;
        for (let ty = Math.floor(e.y / TILE); ty < Math.ceil((e.y + e.h) / TILE); ty++) {
          for (let tx = Math.floor(e.x / TILE); tx < Math.ceil((e.x + e.w) / TILE); tx++) {
            if (!solid.has(ground[ty * m.width + tx])) walkable = true;
          }
        }
        if (!walkable) err(`${at} : sur des cases bloquantes, on ne pourra jamais y marcher`);
      }
      const target = maps[e.to];
      if (!target) err(`${at} : carte '${e.to}' inconnue`);
      else if (!target.spawns[e.spawn]) err(`${at} : point '${e.spawn}' absent de la carte '${e.to}'`);
    }
  }
  return errors;
}

export interface Content {
  tiles: Record<string, TilesetCatalog>;
  props: Record<string, PropDef>;
  maps: Record<string, MapData>;
  characters: Record<string, CharacterDef>;
  dialogues: Record<string, DialogueDef>;
}

const DIRECTIONS = ['down', 'up', 'left', 'right'];

/** Noms que les objets de props.json ne peuvent pas prendre : ce sont d'autres types de Tiled. */
const RESERVED_TYPES = ['Spawn', 'Exit', 'Facing'];

/** Renvoie la liste des problèmes trouvés (vide si tout va bien). */
export function validateContent(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  const addAll = (msgs: string[]) => errors.push(...msgs);

  // Joueur
  for (const state of ['idle', 'walk']) {
    for (const dir of DIRECTIONS) {
      if (!cat.animations.get(PLAYER.skin)?.has(`${state}-${dir}`)) err(`Sprite '${PLAYER.skin}' : animation '${state}-${dir}' manquante`);
    }
  }

  // Objets (la clé de props.json est le type d'un objet de carte)
  for (const [key, p] of Object.entries(c.props)) {
    if (RESERVED_TYPES.includes(key)) err(`props.json '${key}' : nom réservé (types d'objets de Tiled : ${RESERVED_TYPES.join(', ')})`);
    if (!cat.textures.has(p.image)) err(`props.json '${key}' : image '${p.image}' non dessinée`);
    if (p.anim && !cat.animations.get(p.image)?.has(p.anim)) err(`props.json '${key}' : animation '${p.anim}' absente de '${p.image}'`);
    if (p.interact && !c.dialogues[p.interact]) err(`props.json '${key}' : dialogue '${p.interact}' introuvable`);
  }

  // Personnages et dialogues
  for (const [key, ch] of Object.entries(c.characters)) {
    for (const { size } of PORTRAIT_MODES) {
      if (!cat.animations.has(`portrait-${ch.portrait}-${size}`)) err(`characters.json '${key}' : portrait 'portrait-${ch.portrait}-${size}' non dessiné`);
    }
  }
  for (const [id, d] of Object.entries(c.dialogues)) {
    d.lines.forEach((line, i) => {
      const who = c.characters[line.speaker];
      if (!who) return err(`dialogues.json '${id}' ligne ${i + 1} : personnage '${line.speaker}' inconnu`);
      for (const { size } of PORTRAIT_MODES) {
        if (!cat.animations.get(`portrait-${who.portrait}-${size}`)?.has(line.expression)) {
          err(`dialogues.json '${id}' ligne ${i + 1} : expression '${line.expression}' absente du portrait ${who.portrait} (${size} px)`);
        }
      }
    });
  }

  // Cartes (issues de Tiled) et catalogue des tuiles
  addAll(validateTilesCatalog(c.tiles, cat));
  addAll(validateMaps(c.maps, c.props, c.dialogues, cat));
  return errors;
}
