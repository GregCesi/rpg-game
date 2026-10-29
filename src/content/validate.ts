// Vérifications croisées du contenu : tout ce qu'un schéma seul ne peut pas voir
// (une sortie vers une carte qui n'existe pas, un objet dont l'image n'a pas été dessinée...).
// Utilisé par `npm run check` (Node) et au démarrage du jeu.

import { PLAYER, PORTRAIT_SIZE, START, TILE } from '../config';
import type { Carry, CharacterDef, DialogueDef, Gesture, ItemDef, MapData, PropDef, TilesetCatalog } from './types';

const DIRECTIONS = ['down', 'up', 'left', 'right'];

/** Ce que `npm run art` a produit : clés d'images, animations par planche, tuiles par jeu de tuiles. */
export interface Catalog {
  textures: Set<string>;
  animations: Map<string, Set<string>>;
  /** Nombre d'images de chaque animation, par planche. */
  frameCounts: Map<string, Map<string, number>>;
  /** Taille d'une image (d'une image de planche pour une planche animée), en pixels. */
  sizes: Map<string, { w: number; h: number }>;
  tiles: Map<string, Set<string>>;
  /** Numéros de tuiles qui existent (hors trous) et numéros bloquants, par jeu de tuiles. */
  tileNumbers: Map<string, Set<number>>;
  solid: Map<string, Set<number>>;
}

interface ManifestLike {
  spritesheets: { key: string; frameWidth: number; frameHeight: number; animations: Record<string, { frames: unknown[] }> }[];
  tilesets: { key: string; tiles: Record<string, number>; solid: number[] }[];
  images: { key: string; width: number; height: number }[];
}

export function catalogFrom(m: ManifestLike): Catalog {
  return {
    textures: new Set([...m.spritesheets, ...m.tilesets, ...m.images].map((a) => a.key)),
    animations: new Map(m.spritesheets.map((s) => [s.key, new Set(Object.keys(s.animations))])),
    sizes: new Map([
      ...m.spritesheets.map((s) => [s.key, { w: s.frameWidth, h: s.frameHeight }] as const),
      ...m.images.map((i) => [i.key, { w: i.width, h: i.height }] as const),
    ]),
    frameCounts: new Map(m.spritesheets.map((s) => [s.key, new Map(Object.entries(s.animations).map(([k, a]) => [k, a.frames.length]))])),
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
 * Emprise horizontale d'une chute, par rapport au coin bas gauche de l'objet : [x début, x fin (exclu)], la chute
 * et tout ce qui naît (l'arbre couché) compris, vers la droite ou retournée autour du pied vers la gauche.
 * undefined si l'objet ne tombe pas ou si une image manque (signalé ailleurs).
 */
function fallExtent(props: Record<string, PropDef>, type: string, left: boolean, cat: Catalog): [number, number] | undefined {
  const h = props[type]?.harvest;
  if (!h?.fall) return undefined;
  const foot = h.fall.foot;
  // la chute de chaque côté a sa planche ; ce qui naît vers la gauche est posé en miroir autour du pied
  const frame = left ? h.fall.left : h.fall;
  const frameSize = cat.sizes.get(frame.image);
  if (!frameSize) return undefined;
  let box: [number, number] = [frame.x, frame.x + frameSize.w];
  for (const sp of h.spawns) {
    const image = props[sp.type]?.image;
    const size = image ? cat.sizes.get(image) : undefined;
    if (!size) return undefined;
    // [x, x + w[ devient [2 × foot − (x + w − 1), 2 × foot − x + 1[
    const x0 = left ? 2 * foot - (sp.x + size.w - 1) : sp.x;
    box = [Math.min(box[0], x0), Math.max(box[1], x0 + size.w)];
  }
  return box;
}

/**
 * Cartes au format interne (issues de Tiled) : tout ce que le schéma ne voit pas.
 * `propsByType` : objets de props.json, indexés par le type que porte un objet de carte.
 */
export function validateMaps(
  maps: Record<string, MapData>,
  propsByType: Record<string, PropDef>,
  dialogues: Record<string, DialogueDef>,
  characters: Record<string, CharacterDef>,
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
      const at = `${where} : objet « ${o.type} » n°${o.id} en (${o.x}, ${o.y})`;
      if (!propsByType[o.type]) err(`${at} : absent de props.json`);
      else for (const side of ['droite', 'gauche'] as const) {
        const box = fallExtent(propsByType, o.type, side === 'gauche', cat);
        if (!box) continue;
        const [x0, x1] = [o.x + box[0], o.x + box[1]];
        if (x0 < 0 || x1 > W) err(`${at} : pas la place de tomber à ${side} dans la carte (la chute et l'arbre couché vont de x = ${x0} à ${x1}, la carte fait ${W} px de large)`);
      }
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
    for (const n of m.npcs) {
      const at = `${where} : personnage « ${n.character} » en (${n.x}, ${n.y})`;
      if (!characters[n.character]) err(`${at} : absent de characters.json`);
      else {
        // le sprite d'un personnage a la clé du personnage ; un PNJ immobile n'a besoin que des animations idle
        for (const dir of DIRECTIONS) {
          if (!cat.animations.get(n.character)?.has(`idle-${dir}`)) err(`${at} : animation 'idle-${dir}' manquante dans le sprite '${n.character}'`);
        }
      }
      if (!dialogues[n.dialogue]) err(`${at} : dialogue '${n.dialogue}' introuvable`);
      if (n.x < 0 || n.y < 0 || n.x >= W || n.y >= H) err(`${at} : hors de la carte`);
      else if (solidAt(n.x, n.y)) err(`${at} : posé sur une case bloquante (${Math.floor(n.x / TILE)}, ${Math.floor(n.y / TILE)})`);
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
  items: Record<string, ItemDef>;
  gestures: Record<string, Gesture>;
  carry: Carry;
  maps: Record<string, MapData>;
  characters: Record<string, CharacterDef>;
  dialogues: Record<string, DialogueDef>;
}

/** Clés de props.json : minuscules ASCII, chiffres, tirets. Les majuscules sont réservées aux types de Tiled (Spawn, Exit, Facing). */
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Récolte d'un objet de props.json : outil, chute, remplaçant et objets lâchés doivent exister. */
function validateHarvest(key: string, p: PropDef, c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(`props.json '${key}' récolte : ${msg}`);
  const h = p.harvest!;
  if (h.tool) {
    const tool = c.items[h.tool];
    if (!tool) err(`outil '${h.tool}' absent de items.json`);
    else if (tool.kind !== 'tool') err(`'${h.tool}' n'est pas un outil (kind '${tool.kind}' dans items.json)`);
  }
  if (h.impact && !cat.textures.has(`fx-${h.impact}`)) err(`éclats : planche 'fx-${h.impact}' non dessinée`);
  for (const image of h.fall ? [h.fall.image, h.fall.left.image] : []) {
    if (!cat.animations.get(image)?.has(h.fall!.anim)) err(`chute : animation '${h.fall!.anim}' absente de la planche '${image}' (ou planche non dessinée)`);
  }
  if (h.becomes !== undefined) {
    if (!c.props[h.becomes]) err(`'becomes' : objet '${h.becomes}' absent de props.json`);
    else if (h.becomes === key) err("'becomes' : l'objet ne peut pas devenir lui-même");
  }
  if (h.at && h.becomes === undefined) err("'at' sans 'becomes' : il n'y a rien à placer");
  if (!c.gestures[h.gesture]) err(`geste '${h.gesture}' absent de gestures.json`);
  for (const sp of h.spawns) {
    if (!c.props[sp.type]) err(`objet né '${sp.type}' absent de props.json`);
  }
  h.drops.forEach((d, i) => {
    if (!c.items[d.item]) err(`objet lâché n°${i + 1} : '${d.item}' absent de items.json`);
    if (d.min > d.max) err(`objet lâché '${d.item}' : min (${d.min}) plus grand que max (${d.max})`);
  });
  return errors;
}

/**
 * Images d'état des pièces de tronc couché (`notch`) : `-n1`... par profondeur et `-cut-right` pour celles qui ont une encoche ;
 * `-cut-left` (et `-cut-left-n1`...) pour celles qui ne sont pas les premières de leur chaîne. Toutes de la taille de la pièce.
 */
function validateTrunk(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const isTrunk = (t: string) => {
    const h = c.props[t]?.harvest;
    return !!h && (h.notch || (!!h.becomes && !!c.props[h.becomes]?.harvest?.notch));
  };
  // pièces qui ont une voisine à gauche : nées après la première d'une chaîne, et ce qu'elles deviennent en restant du tronc
  const later = new Set<string>();
  for (const p of Object.values(c.props)) for (const sp of p.harvest?.spawns.slice(1) ?? []) later.add(sp.type);
  for (const t of [...later]) {
    const next = c.props[t]?.harvest?.becomes;
    if (next && isTrunk(next)) later.add(next);
  }
  // ce qui naît d'une chute (et ce que ça devient) a aussi sa version couchée vers la gauche : `<image>-left` + suffixe d'état
  const born = new Set<string>();
  for (const p of Object.values(c.props)) if (p.harvest?.fall) for (const sp of p.harvest.spawns) born.add(sp.type);
  for (const t of [...born]) {
    const next = c.props[t]?.harvest?.becomes;
    if (next) born.add(next);
  }
  const sizeErr = (key: string, img: string, base: { w: number; h: number } | undefined, what: string) => {
    const size = cat.sizes.get(img);
    if (!size) errors.push(`props.json '${key}' : ${what} '${img}' non dessinée`);
    else if (base && (size.w !== base.w || size.h !== base.h)) {
      errors.push(`props.json '${key}' : '${img}' fait ${size.w}×${size.h}, '${c.props[key].image}' ${base.w}×${base.h} (même taille attendue)`);
    }
  };
  for (const key of born) {
    const p = c.props[key];
    if (p) sizeErr(key, `${p.image}-left`, cat.sizes.get(p.image), 'image couchée vers la gauche');
  }
  for (const [key, p] of Object.entries(c.props)) {
    if (!isTrunk(key)) continue;
    const h = p.harvest!;
    const depths = h.notch ? Array.from({ length: h.hits - 1 }, (_, i) => `-n${i + 1}`) : [];
    const lefts = later.has(key) ? ['-cut-left', ...depths.map((d) => `-cut-left${d}`)] : [];
    const base = cat.sizes.get(p.image);
    for (const suffix of [...depths, ...(h.notch ? ['-cut-right'] : []), ...lefts]) {
      sizeErr(key, `${p.image}${suffix}`, base, "image d'état");
      if (born.has(key)) sizeErr(key, `${p.image}-left${suffix}`, base, "image d'état couchée vers la gauche");
    }
    if (h.notch && h.becomes) {
      const log = c.props[h.becomes] && cat.sizes.get(c.props[h.becomes].image);
      if (log && base && (log.w !== base.w || log.h !== base.h || h.at)) {
        errors.push(`props.json '${key}' : sa bille '${h.becomes}' doit avoir la taille et la place exactes de la pièce (${base.w}×${base.h}, sans 'at')`);
      }
    }
  }
  return errors;
}

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

  // Gestes du joueur : une animation `<geste>-<direction>` par direction, autant d'images que de poses de l'outil
  for (const [name, g] of Object.entries(c.gestures)) {
    for (const dir of DIRECTIONS) {
      const anim = `${name}-${dir}`;
      const frames = cat.frameCounts.get(PLAYER.skin)?.get(anim);
      // la gauche reprend les poses de la droite, en miroir
      const poses = g.poses[dir === 'left' ? 'right' : (dir as 'down' | 'up' | 'right')];
      if (frames === undefined) err(`gestures.json '${name}' : animation '${anim}' manquante dans le sprite '${PLAYER.skin}'`);
      else if (frames !== poses.length) err(`gestures.json '${name}' ${dir} : ${poses.length} poses d'outil pour ${frames} images dans '${PLAYER.skin}-${anim}'`);
      if (g.impact >= poses.length) err(`gestures.json '${name}' ${dir} : image d'impact ${g.impact} au-delà des ${poses.length} poses`);
    }
  }

  // Porter : une animation `carry-<état>-<direction>` par direction, autant d'images que de points d'accroche
  for (const state of ['idle', 'walk'] as const) {
    for (const dir of DIRECTIONS) {
      const anim = `carry-${state}-${dir}`;
      const frames = cat.frameCounts.get(PLAYER.skin)?.get(anim);
      const poses = c.carry[state][dir === 'left' ? 'right' : (dir as 'down' | 'up' | 'right')];
      if (frames === undefined) err(`carry.json : animation '${anim}' manquante dans le sprite '${PLAYER.skin}'`);
      else if (frames !== poses.length) err(`carry.json ${state} ${dir} : ${poses.length} points d'accroche pour ${frames} images dans '${PLAYER.skin}-${anim}'`);
    }
  }

  // Outils en main : chaque planche tool-<objet> a, pour chaque geste, une animation par direction (la gauche est le miroir
  // de la droite), avec autant d'images que de poses
  for (const [sheet, anims] of cat.frameCounts) {
    if (!sheet.startsWith('tool-')) continue;
    for (const [name, g] of Object.entries(c.gestures)) {
      for (const dir of ['down', 'up', 'right'] as const) {
        const n = anims.get(`${name}-${dir}`);
        if (n === undefined) err(`Planche '${sheet}' : animation '${name}-${dir}' manquante (geste '${name}' de gestures.json)`);
        else if (n !== g.poses[dir].length) err(`Planche '${sheet}' : '${name}-${dir}' a ${n} images pour ${g.poses[dir].length} poses dans gestures.json`);
      }
    }
  }

  // Objets (la clé de props.json est le type d'un objet de carte)
  for (const [key, p] of Object.entries(c.props)) {
    if (!KEBAB_CASE.test(key)) err(`props.json '${key}' : la clé doit être un identifiant anglais en kebab-case (minuscules sans accent, chiffres, tirets : 'tree', 'tall-fence')`);
    if (!cat.textures.has(p.image)) err(`props.json '${key}' : image '${p.image}' non dessinée`);
    if (p.anim && !cat.animations.get(p.image)?.has(p.anim)) err(`props.json '${key}' : animation '${p.anim}' absente de '${p.image}'`);
    if (p.interact && !c.dialogues[p.interact]) err(`props.json '${key}' : dialogue '${p.interact}' introuvable`);
    if (p.harvest) addAll(validateHarvest(key, p, c, cat));
    // E sur l'objet : le prendre, le récolter ou ouvrir son dialogue, pas deux à la fois
    if (p.take && (p.harvest || p.interact)) err(`props.json '${key}' : 'take' avec '${p.harvest ? 'harvest' : 'interact'}' (E ne peut faire qu'une chose)`);
  }

  // Pièces de tronc couché : une image par état de l'encoche et du bout gauche, de la taille de la pièce (voir `notch`)
  addAll(validateTrunk(c, cat));

  // Objets possédables
  for (const [key, it] of Object.entries(c.items)) {
    if (!KEBAB_CASE.test(key)) err(`items.json '${key}' : la clé doit être un identifiant anglais en kebab-case`);
    if (!cat.textures.has(it.icon)) err(`items.json '${key}' : icône '${it.icon}' non dessinée`);
  }

  // Personnages et dialogues
  for (const [key, ch] of Object.entries(c.characters)) {
    if (!cat.animations.has(`portrait-${ch.portrait}-${PORTRAIT_SIZE}`)) err(`characters.json '${key}' : portrait 'portrait-${ch.portrait}-${PORTRAIT_SIZE}' non dessiné`);
  }
  for (const [id, d] of Object.entries(c.dialogues)) {
    d.lines.forEach((line, i) => {
      const who = c.characters[line.speaker];
      if (!who) return err(`dialogues.json '${id}' ligne ${i + 1} : personnage '${line.speaker}' inconnu`);
      if (!cat.animations.get(`portrait-${who.portrait}-${PORTRAIT_SIZE}`)?.has(line.expression)) {
        err(`dialogues.json '${id}' ligne ${i + 1} : expression '${line.expression}' absente du portrait ${who.portrait} (${PORTRAIT_SIZE} px)`);
      }
    });
  }

  // Cartes (issues de Tiled) et catalogue des tuiles
  addAll(validateTilesCatalog(c.tiles, cat));
  addAll(validateMaps(c.maps, c.props, c.dialogues, c.characters, cat));
  return errors;
}
