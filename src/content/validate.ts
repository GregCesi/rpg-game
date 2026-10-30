// Vérifications croisées du contenu : tout ce qu'un schéma seul ne peut pas voir
// (une sortie vers une carte qui n'existe pas, un objet dont l'image n'a pas été dessinée...).
// Utilisé par `npm run check` (Node) et au démarrage du jeu.

import { PLAYER, PORTRAIT_SIZE, START, TILE } from '../config';
import { CM_PER_PX, TOLERANCE, expectedSize } from './gabarit';
import { propMass } from './mass';
import type { CharacterDef, Hold, HoldPoses, DialogueDef, Gesture, ItemDef, MapData, PileDef, PlanDef, PropDef, Strength, TilesetCatalog } from './types';

const DIRECTIONS = ['down', 'up', 'left', 'right'];

/** Ce que `npm run art` a produit : clés d'images, animations par planche, tuiles par jeu de tuiles. */
export interface Catalog {
  textures: Set<string>;
  animations: Map<string, Set<string>>;
  /** Nombre d'images de chaque animation, par planche. */
  frameCounts: Map<string, Map<string, number>>;
  /** Taille d'une image (d'une image de planche pour une planche animée), en pixels. */
  sizes: Map<string, { w: number; h: number }>;
  /** Silhouette d'une image (de la première image pour une planche) : pixels opaques, contour compris, sans l'ombre. */
  silhouettes: Map<string, { w: number; h: number }>;
  tiles: Map<string, Set<string>>;
  /** Numéros de tuiles qui existent (hors trous) et numéros bloquants, par jeu de tuiles. */
  tileNumbers: Map<string, Set<number>>;
  solid: Map<string, Set<number>>;
}

interface ManifestLike {
  spritesheets: { key: string; frameWidth: number; frameHeight: number; animations: Record<string, { frames: unknown[] }>; silhouette: { w: number; h: number } }[];
  tilesets: { key: string; tiles: Record<string, number>; solid: number[] }[];
  images: { key: string; width: number; height: number; silhouette: { w: number; h: number } }[];
}

export function catalogFrom(m: ManifestLike): Catalog {
  return {
    textures: new Set([...m.spritesheets, ...m.tilesets, ...m.images].map((a) => a.key)),
    animations: new Map(m.spritesheets.map((s) => [s.key, new Set(Object.keys(s.animations))])),
    sizes: new Map([
      ...m.spritesheets.map((s) => [s.key, { w: s.frameWidth, h: s.frameHeight }] as const),
      ...m.images.map((i) => [i.key, { w: i.width, h: i.height }] as const),
    ]),
    silhouettes: new Map([...m.spritesheets, ...m.images].map((a) => [a.key, { w: a.silhouette.w, h: a.silhouette.h }] as const)),
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
  piles: Record<string, PileDef>;
  plans: Record<string, PlanDef>;
  strength: Strength;
  gestures: Record<string, Gesture>;
  hold: HoldPoses;
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
  for (const other of Object.keys(h.also)) {
    if (!h.tool) err(`'also' : il faut d'abord l'outil principal ('tool')`);
    if (c.items[other]?.kind !== 'tool') err(`'also' : '${other}' n'est pas un outil de items.json`);
    if (other === h.tool) err(`'also' : '${other}' est déjà l'outil principal`);
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
  for (const tool of Object.keys(h.refuse)) if (!c.items[tool]) err(`'refuse' : outil '${tool}' absent de items.json`);
  if (h.plant) {
    if (!h.tool) err("'plant' : il faut l'outil qu'on plante ('tool')");
    if (h.becomes === undefined) err("'plant' : l'objet devient autre chose une fois l'outil planté ('becomes')");
    if (h.hits !== 1) err("'plant' : un seul coup (l'outil se plante d'un coup)");
    if (c.items[h.tool ?? '']?.hands === 2) err("'plant' : l'outil planté se tient à une main");
  }
  if (h.staged) {
    if (!h.tool) err("'staged' : il faut un outil ('tool')");
    if (h.hits < 2) err("'staged' : au moins deux coups");
    if (h.notch) err("'staged' avec 'notch' : une seule façon de montrer les coups");
    // une image par coup, de la taille de l'objet : rien ne saute quand la fente s'allonge
    const base = cat.sizes.get(p.image);
    for (let k = 1; k <= h.hits; k++) {
      const size = cat.sizes.get(`${p.image}-n${k}`);
      if (!size) err(`étape ${k} : image '${p.image}-n${k}' non dessinée`);
      else if (base && (size.w !== base.w || size.h !== base.h)) err(`étape ${k} : '${p.image}-n${k}' fait ${size.w}×${size.h}, '${p.image}' ${base.w}×${base.h} (même taille attendue)`);
    }
  }
  if (h.convert) {
    const k = h.convert;
    if (!h.tool) err("'convert' : il faut l'outil qui taille ('tool')");
    if (!c.items[k.from]) err(`'convert' : '${k.from}' (from) absent de items.json`);
    if (!c.items[k.into]) err(`'convert' : '${k.into}' (into) absent de items.json`);
    if (c.items[h.tool ?? '']?.hands === 2) err("'convert' : l'outil se tient à une main (l'autre tient ce qu'on taille)");
    if (h.hits !== 1) err("'convert' : un seul coup");
    if (h.becomes !== undefined || h.drops.length || h.spawns.length || h.fall || h.plant || h.staged || h.notch) err("'convert' : sans 'becomes', 'drops', 'spawns', 'fall', 'plant', 'staged' ni 'notch'");
  }
  h.drops.forEach((d, i) => {
    if (!c.items[d.item]) err(`objet lâché n°${i + 1} : '${d.item}' absent de items.json`);
    if (d.min > d.max) err(`objet lâché '${d.item}' : min (${d.min}) plus grand que max (${d.max})`);
  });
  return errors;
}

/**
 * Longueur, objets qu'on pose dessus et objets portés (le rouleau de corde, le billot qui le porte) : la pièce coupée
 * existe, l'objet porté a une longueur et se prend, le porteur redevient l'objet qui l'accepte, et la coupe se fait à
 * l'outil, sans rien d'autre de la récolte.
 */
function validateRope(key: string, p: PropDef, c: Content): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(`props.json '${key}' : ${msg}`);
  if (p.length) {
    if (!c.items[p.length.piece]) err(`length : pièce '${p.length.piece}' absente de items.json`);
    if (p.length.cut > p.length.start) err(`length : 'cut' (${p.length.cut}) plus long que 'start' (${p.length.start})`);
  }
  for (const [held, becomes] of Object.entries(p.rest ?? {})) {
    const h = c.props[held];
    const b = c.props[becomes];
    if (!h?.take) err(`rest : '${held}' n'est pas un objet de props.json qui se prend`);
    else if (h.take.hands !== 1) err(`rest : '${held}' se tient à deux mains (on pose ce que tient la main active)`);
    if (!b) err(`rest : '${becomes}' absent de props.json`);
    else if (b.bears?.prop !== held || b.bears.empty !== key) err(`rest : '${becomes}' doit avoir "bears": {"prop": "${held}", "empty": "${key}"}`);
  }
  if (p.bears) {
    const borne = c.props[p.bears.prop];
    if (!borne?.length) err(`bears : '${p.bears.prop}' n'a pas de longueur ('length')`);
    if (!borne?.take) err(`bears : '${p.bears.prop}' ne se prend pas (pas de 'take')`);
    if (!c.props[p.bears.empty]) err(`bears : '${p.bears.empty}' (empty) absent de props.json`);
    const h = p.harvest;
    if (!h?.tool) err("bears : il faut un 'harvest' avec un outil pour couper ce qu'il porte");
    else if (h.becomes || h.drops.length || h.spawns.length || h.fall) err("bears : sa récolte coupe ce qu'il porte, sans 'becomes', 'drops', 'spawns' ni 'fall'");
    if (p.take || p.interact) err(`bears : avec '${p.take ? 'take' : 'interact'}' (E reprend ce qu'il porte)`);
  }
  if (p.teaches) {
    if (!c.plans[p.teaches]) err(`teaches : plan '${p.teaches}' absent de plans.json`);
    if (p.take || p.interact || p.harvest) err(`teaches : avec '${p.take ? 'take' : p.interact ? 'interact' : 'harvest'}' (E ne peut faire qu'une chose)`);
  }
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

/**
 * Objets dessinés avant le gabarit (docs/STYLE.md section 8) et qui ne le respectent pas : taille de leur silhouette
 * au moment où ils ont été listés. On ne les redessine pas pour l'instant ; un objet ne s'ajoute pas ici, il se dessine
 * à la bonne taille. Redessiné, il sort de la liste (validate.ts le demande dès que son image change).
 */
export const EXCEPTIONS: Record<string, { w: number; h: number }> = {
  // taille dessinée ; en commentaire, la taille attendue (de la taille réelle au plancher de lisibilité) et l'écart
  // (dessiné − attendu, hors de cette plage, largeur × hauteur)
  'big-pollard': { w: 54, h: 79 }, // attendu 54 × 86 : 0 × -7 px ; tête stylisée, choix de Grégoire
};

/** Gabarit : la silhouette de l'image d'un objet a la taille que donnent ses dimensions réelles, à TOLERANCE px près. */
function validateGabarit(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(EXCEPTIONS)) if (!c.props[key]) errors.push(`validate.ts EXCEPTIONS : '${key}' absent de props.json`);
  for (const [key, p] of Object.entries(c.props)) {
    // l'ombre portée se calcule sur l'emprise au sol d'une couverture : une pièce de toit vue à l'échelle du sol
    if (p.shadow && !(p.roof && p.dims.ground)) errors.push(`props.json '${key}' : 'shadow' est l'ombre d'une couverture, pièce 'roof' avec 'dims.ground'`);
    const drawn = cat.silhouettes.get(p.image);
    if (!drawn) continue; // image non dessinée : signalé ailleurs
    const want = expectedSize(p.dims);
    // entre la taille réelle et l'agrandissement au plancher de lisibilité, à TOLERANCE px près
    const within = (n: number, lo: number, hi: number) => n >= lo - TOLERANCE && n <= hi + TOLERANCE;
    const fits = within(drawn.w, want.w, want.wMax) && within(drawn.h, want.h, want.hMax);
    const f = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
    const range = (lo: number, hi: number) => (hi > lo ? `${f(lo)} à ${f(hi)}` : f(lo));
    const sizes = `attendu ${range(want.w, want.wMax)} × ${range(want.h, want.hMax)} px (${p.dims.w} × ${p.dims.d} × ${p.dims.h} cm, ${p.dims.shape}${p.dims.axis ? ` ${p.dims.axis}` : ''}, ${CM_PER_PX} cm par pixel), dessiné ${drawn.w} × ${drawn.h} px`;
    const at = `props.json '${key}' (image '${p.image}') hors gabarit`;
    const ex = EXCEPTIONS[key];
    if (!ex) {
      if (!fits) errors.push(`${at} : ${sizes} (tolérance ${TOLERANCE} px)`);
    } else if (fits) errors.push(`validate.ts EXCEPTIONS : '${key}' respecte maintenant le gabarit (${sizes}) : le retirer de la liste`);
    else if (ex.w !== drawn.w || ex.h !== drawn.h) {
      errors.push(`${at} : son image a changé depuis son entrée dans EXCEPTIONS (${ex.w} × ${ex.h}) ; un dessin repris suit le gabarit : ${sizes}`);
    }
  }
  return errors;
}

/** Un objet tenu : sa posture va avec ses mains (une main : `hand` ; deux : `shoulder` ou `carry`), sa planche a ses trois vues. */
function validateHold(at: string, h: Hold, hands: 1 | 2, cat: Catalog): string[] {
  const errors: string[] = [];
  if ((h.stance === 'hand') !== (hands === 1)) errors.push(`${at} : posture '${h.stance}' pour un objet à ${hands} main${hands > 1 ? 's' : ''}`);
  if (h.image) {
    for (const dir of ['down', 'up', 'right']) {
      if (!cat.animations.get(h.image)?.has(dir)) errors.push(`${at} : animation '${dir}' absente de la planche '${h.image}' (ou planche non dessinée)`);
    }
  }
  return errors;
}

/** Une forme de tas (celle du genre, ou sa forme tournée) : départ au sol, images, collisions au sol, porteuses. */
function validatePileShape(at: string, shape: { start: string; places: PileDef['places'] }, blockFrom: number, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  const start = shape.places[shape.start];
  if (!start) err(`${at} : place de départ '${shape.start}' introuvable`);
  else if (start.layer !== 0) err(`${at} : la place de départ '${shape.start}' doit être au sol (couche 0)`);
  if (blockFrom > Object.keys(shape.places).length) err(`${at} : 'blockFrom' (${blockFrom}) au-delà du nombre de places`);
  for (const [id, q] of Object.entries(shape.places)) {
    const pa = `${at} place '${id}'`;
    if (!cat.textures.has(q.image)) err(`${pa} : image '${q.image}' non dessinée`);
    if (![q.x, q.y].every(Number.isInteger)) err(`${pa} : position au pixel entier attendue`);
    if (q.layer === 0) {
      if (!q.body) err(`${pa} : une place au sol a sa collision ('body')`);
      if (q.on.length) err(`${pa} : une place au sol n'est portée par rien ('on' vide)`);
    } else {
      if (q.body) err(`${pa} : seule une place au sol a une collision ('body') : celle du dessus repose sur ses porteuses`);
      if (!q.on.length) err(`${pa} : une place de la couche ${q.layer} est portée par des places ('on')`);
      for (const o of q.on) {
        const under = shape.places[o];
        if (!under) err(`${pa} : place porteuse '${o}' introuvable`);
        else if (under.layer !== q.layer - 1) err(`${pa} : sa porteuse '${o}' est en couche ${under.layer}, pas ${q.layer - 1}`);
      }
    }
  }
  return errors;
}

/**
 * Genres de tas : la pièce reprise existe, se prend dans les mains et s'entrepose dans ce genre ; chaque place a son
 * image dessinée, une collision au sol si elle est au sol, des places qui la portent dans la couche juste en dessous
 * sinon ; la première place d'un nouveau tas est au sol ; les objets qui disent s'entreposer ici le peuvent.
 */
function validatePiles(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  for (const [key, pile] of Object.entries(c.piles)) {
    const at = `piles.json '${key}'`;
    if (!KEBAB_CASE.test(key)) err(`${at} : la clé doit être un identifiant anglais en kebab-case`);
    const piece = pile.piece;
    if ('item' in piece) {
      const it = c.items[piece.item];
      if (!it) err(`${at} : objet possédable '${piece.item}' introuvable dans items.json`);
      else if (it.pile !== key) err(`${at} : '${piece.item}' (items.json) doit avoir "pile": "${key}" pour s'y entreposer`);
    } else {
      const p = c.props[piece.prop];
      if (!p) err(`${at} : objet '${piece.prop}' introuvable dans props.json`);
      else if (!p.take) err(`${at} : '${piece.prop}' (props.json) ne se prend pas (pas de 'take')`);
      else if (p.take.pile !== key) err(`${at} : '${piece.prop}' (props.json) doit avoir "pile": "${key}" dans 'take' pour s'y entreposer`);
    }
    // la forme du genre, et sa forme tournée s'il en a une : mêmes règles
    const shapes: [string, { start: string; places: PileDef['places'] }][] = [[at, pile]];
    if (pile.turned) shapes.push([`${at} turned`, pile.turned]);
    for (const [where, shape] of shapes) errors.push(...validatePileShape(where, shape, pile.blockFrom, cat));
  }
  // le lien (les branches) : un objet possédable à une main qui ne s'entrepose pas, dessiné sous le tas ; le tas noué
  // devient un objet qui se prend à deux mains et s'entrepose dans un autre genre (le fagot), d'un seul genre qui le noue
  for (const [key, pile] of Object.entries(c.piles)) {
    const tie = pile.tie;
    if (!tie) continue;
    const at = `piles.json '${key}' tie`;
    const it = c.items[tie.item];
    if (!it) err(`${at} : objet possédable '${tie.item}' introuvable dans items.json`);
    else if (it.hands !== 1 || it.pile) err(`${at} : '${tie.item}' doit se tenir à une main et ne pas s'entreposer (pas de 'pile')`);
    for (const [part, t] of Object.entries({ north: tie.north, south: tie.south, alone: tie.alone })) {
      if (!cat.textures.has(t.image)) err(`${at} ${part} : image '${t.image}' non dessinée`);
    }
    if (pile.turned) err(`${at} : un genre lié ne se tourne pas (le lien n'a pas de forme tournée)`);
    const into = c.props[tie.into];
    if (!into) err(`${at} : objet '${tie.into}' (into) introuvable dans props.json`);
    else if (!into.take?.pile || !c.piles[into.take.pile]) err(`${at} : '${tie.into}' doit se prendre et s'entreposer dans un tas ('take' avec 'pile')`);
    else if (into.take.pile === key) err(`${at} : '${tie.into}' ne peut pas s'entreposer dans le tas qui le noue`);
    const others = Object.keys(c.piles).filter((k) => k !== key && c.piles[k].tie?.item === tie.item);
    if (others.length) err(`${at} : '${tie.item}' lie déjà le genre '${others[0]}' (un lien, un genre)`);
    const intoOthers = Object.keys(c.piles).filter((k) => k !== key && c.piles[k].tie?.into === tie.into);
    if (intoOthers.length) err(`${at} : '${tie.into}' se dénouerait aussi en '${intoOthers[0]}'`);
  }
  const member = (at: string, pile: string | undefined) => {
    if (pile && !c.piles[pile]) err(`${at} : genre de tas '${pile}' introuvable dans piles.json`);
  };
  for (const [key, it] of Object.entries(c.items)) member(`items.json '${key}'`, it.pile);
  for (const [key, p] of Object.entries(c.props)) member(`props.json '${key}' take`, p.take?.pile);
  return errors;
}

/**
 * Plans de bâtiment : un coin pour chaque angle de l'emprise, des places aux noms uniques, des places qui reposent sur des places
 * d'étapes d'avant. Une étape ouverte (sans `soon`) est jouable : ses pièces existent, ce qu'elle accepte se prend et se porte,
 * chaque place dit quoi apporter ; les étapes « à venir » (`soon`) sont déclarées, leurs pièces seront vérifiées quand elles
 * s'ouvriront. Une pièce de toit ne bloque pas le passage.
 */
function validatePlans(c: Content): string[] {
  const errors: string[] = [];
  for (const [key, plan] of Object.entries(c.plans)) {
    const at = `plans.json '${key}'`;
    const err = (msg: string) => errors.push(`${at} : ${msg}`);
    if (!KEBAB_CASE.test(key)) err('la clé doit être un identifiant anglais en kebab-case');
    const stake = c.items[plan.stake];
    if (!stake) err(`piquet '${plan.stake}' absent de items.json`);
    else if (stake.hands !== 1) err(`piquet '${plan.stake}' : il se tient à une main`);
    if (!c.props[plan.planted]) err(`piquet planté '${plan.planted}' absent de props.json`);
    else if (c.props[plan.planted].take || c.props[plan.planted].body || c.props[plan.planted].bodies) err(`piquet planté '${plan.planted}' : ni 'take' ni collision (il se plante, il ne gêne pas)`);
    const { w, d } = plan.footprint;
    const want = { nw: [0, 0], ne: [w, 0], se: [w, d], sw: [0, d] };
    for (const [corner, xy] of Object.entries(want)) {
      const got = plan.corners[corner as keyof typeof want];
      if (got[0] !== xy[0] || got[1] !== xy[1]) err(`coin '${corner}' en (${got}) : l'emprise de ${w} × ${d} cm le met en (${xy})`);
    }
    const earlier = new Set<string>();
    const cornersUsed = new Set<string>();
    let sawSoon = false;
    plan.steps.forEach((step, i) => {
      const where = `${at} étape ${i + 1} (« ${step.name} »)`;
      if (step.soon) sawSoon = true;
      else if (sawSoon) errors.push(`${where} : ouverte après une étape à venir (les étapes ouvertes viennent d'abord)`);
      const here = new Set<string>();
      for (const [id, place] of Object.entries(step.places)) {
        const pw = `${where}, place '${id}'`;
        if (earlier.has(id) || here.has(id)) errors.push(`${pw} : nom déjà pris dans ce plan`);
        here.add(id);
        for (const o of place.on) if (!earlier.has(o)) errors.push(`${pw} : repose sur '${o}', qui n'est pas une place d'une étape d'avant`);
        if (place.corner) {
          if (cornersUsed.has(place.corner)) errors.push(`${pw} : le coin '${place.corner}' est déjà celui d'une autre place`);
          cornersUsed.add(place.corner);
        }
        if (step.soon) continue;
        const piece = c.props[place.piece];
        if (!piece) errors.push(`${pw} : pièce '${place.piece}' absente de props.json`);
        else if (piece.roof && (piece.body || piece.bodies)) errors.push(`${pw} : une pièce de toit ('roof') ne bloque pas le passage`);
        const accepts = place.accepts ?? step.accepts;
        if (!accepts) {
          errors.push(`${pw} : rien n'est dit de la pièce à apporter ('accepts', sur la place ou sur l'étape)`);
          continue;
        }
        if (accepts.prop) {
          const held = c.props[accepts.prop];
          if (!held) errors.push(`${pw} : '${accepts.prop}' (accepts) absent de props.json`);
          else if (!held.take) errors.push(`${pw} : '${accepts.prop}' (accepts) ne se prend pas (pas de 'take')`);
          else if (propMass(accepts.prop, undefined, c) > c.strength.carry) errors.push(`${pw} : '${accepts.prop}' pèse plus que Xéros ne porte (${c.strength.carry} kg)`);
        } else if (!c.items[accepts.item!]) errors.push(`${pw} : '${accepts.item}' (accepts) absent de items.json`);
      }
      for (const id of here) earlier.add(id);
    });
    if (plan.steps.every((s) => s.soon)) err('aucune étape ouverte : le chantier ne peut pas commencer');
    if (!plan.steps[0].soon && Object.values(plan.steps[0].places).some((p) => p.on.length)) err('la première étape se pose sur le sol : ses places ne reposent sur rien');
  }
  return errors;
}

/**
 * Masses et roulement : tout objet qu'on prend, pose ou roule a une masse (items.json : un nombre ; props.json : un nombre,
 * `"wood"` pour une pièce de bois cylindrique, ou `{ "pile": genre }`) ; ce qui roule est un cylindre couché, a sa collision,
 * sa planche de roulement (animation `roll` de 4 images, de la taille de l'objet), et l'objet ordinaire qu'il devient (`into`).
 */
function validateMasses(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  for (const [key, it] of Object.entries(c.items)) if (it.mass === undefined) err(`items.json '${key}' : pas de masse ('mass', en kg) : tout objet possédable en a une`);
  for (const [key, p] of Object.entries(c.props)) {
    const at = `props.json '${key}'`;
    const weighs = !!p.take || !!p.roll;
    if (weighs && p.mass === undefined) err(`${at} : pas de masse ('mass') : tout objet qu'on prend ou qu'on roule en a une`);
    if (p.mass === 'wood' && !(p.dims.shape === 'cylinder')) err(`${at} : 'mass: "wood"' est le calcul d'une pièce de bois cylindrique (dims.shape 'cylinder')`);
    if (p.mass === 'stone' && p.dims.shape !== 'box') err(`${at} : 'mass: "stone"' est le calcul d'une pierre en boîte (dims.shape 'box')`);
    if (typeof p.mass === 'object' && 'pile' in p.mass && !c.piles[p.mass.pile]) err(`${at} : masse d'un tas '${p.mass.pile}' introuvable dans piles.json`);
    if (typeof p.mass === 'object' && 'share' in p.mass && c.props[p.mass.of]?.mass !== 'wood') err(`${at} : masse en part de '${p.mass.of}', qui doit être une pièce de bois ('mass: "wood"')`);
    if (p.mass !== undefined && p.length && typeof p.mass !== 'number') err(`${at} : un objet à longueur mesurée a une masse saisie (celle de sa longueur neuve)`);
    if (p.mass !== undefined) {
      try {
        propMass(key, undefined, c);
      } catch (e) {
        err(`${at} : ${(e as Error).message}`);
      }
    }
    if (p.turn) {
      const t = c.props[p.turn.into];
      if (!t) err(`${at} : 'turn' vers '${p.turn.into}' introuvable dans props.json`);
      else if (!p.roll || !t.roll || t.roll.axis === p.roll.axis) err(`${at} : 'turn' vers '${p.turn.into}' : il doit rouler et être couché dans l'autre sens`);
      else if (!t.turn || t.turn.into === undefined) err(`${at} : '${p.turn.into}' doit pouvoir se retourner à son tour ('turn')`);
    }
    const r = p.roll;
    if (!r) continue;
    if (p.dims.shape !== 'cylinder' || p.dims.axis !== r.axis) err(`${at} : 'roll' d'axe '${r.axis}' demande des dims de cylindre couché '${r.axis}'`);
    if (!p.body && !p.bodies) err(`${at} : un objet qui roule a sa collision ('body')`);
    const frames = cat.frameCounts.get(r.sheet)?.get('roll');
    if (frames === undefined) err(`${at} : planche de roulement '${r.sheet}' (animation 'roll') non dessinée`);
    else if (frames !== 4) err(`${at} : planche '${r.sheet}' : 'roll' a ${frames} images, il en faut 4 (un tour)`);
    // l'objet ordinaire (lui-même, ou celui qu'il devient) a la taille des images de la planche : rien ne saute quand il roule
    const ordinary = r.into ? c.props[r.into] : p;
    if (!ordinary) err(`${at} : 'into' '${r.into}' introuvable dans props.json`);
    else {
      if (r.into && (ordinary.roll?.into || ordinary.roll?.axis !== r.axis || ordinary.roll?.sheet !== r.sheet)) {
        err(`${at} : 'into' '${r.into}' doit être l'objet ordinaire du même roulement (même axe et même planche, sans 'into')`);
      }
      const a = cat.sizes.get(r.sheet);
      const b = cat.sizes.get(ordinary.image);
      if (a && b && (a.w !== b.w || a.h !== b.h)) err(`${at} : planche '${r.sheet}' (${a.w} × ${a.h}) de taille différente de l'image '${ordinary.image}' (${b.w} × ${b.h})`);
    }
  }
  // la pose « pousser » de Xéros : une attente et une marche, dans les 4 directions
  for (const state of ['idle', 'walk']) {
    for (const dir of DIRECTIONS) {
      if (!cat.animations.get(PLAYER.skin)?.has(`push-${state}-${dir}`)) err(`Sprite '${PLAYER.skin}' : animation 'push-${state}-${dir}' manquante (pose pousser)`);
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

  // Objets tenus : pour chaque posture, une animation `<posture>-<état>-<direction>` du corps (bras pendants : `<état>-<direction>`),
  // autant d'images que de points d'accroche dans hold.json
  for (const [stance, motions] of Object.entries(c.hold)) {
    for (const state of ['idle', 'walk'] as const) {
      for (const dir of DIRECTIONS) {
        const anim = `${stance === 'hand' ? '' : `${stance}-`}${state}-${dir}`;
        const frames = cat.frameCounts.get(PLAYER.skin)?.get(anim);
        const points = motions[state][dir === 'left' ? 'right' : (dir as 'down' | 'up' | 'right')];
        if (frames === undefined) err(`hold.json '${stance}' : animation '${anim}' manquante dans le sprite '${PLAYER.skin}'`);
        else if (frames !== points.length) err(`hold.json '${stance}' ${state} ${dir} : ${points.length} points d'accroche pour ${frames} images dans '${PLAYER.skin}-${anim}'`);
      }
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
    if (!KEBAB_CASE.test(key)) err(`props.json '${key}' : la clé doit être un identifiant anglais en kebab-case (minuscules sans accent, chiffres, tirets : 'big-tree', 'tall-fence')`);
    if (!cat.textures.has(p.image)) err(`props.json '${key}' : image '${p.image}' non dessinée`);
    if (p.anim && !cat.animations.get(p.image)?.has(p.anim)) err(`props.json '${key}' : animation '${p.anim}' absente de '${p.image}'`);
    if (p.interact && !c.dialogues[p.interact]) err(`props.json '${key}' : dialogue '${p.interact}' introuvable`);
    if (p.harvest) addAll(validateHarvest(key, p, c, cat));
    if (p.take) addAll(validateHold(`props.json '${key}' take`, p.take.hold, p.take.hands, cat));
    if (p.take && !cat.textures.has(p.take.icon)) err(`props.json '${key}' : icône '${p.take.icon}' non dessinée`);
    // E sur l'objet : le prendre, le récolter à la main ou ouvrir son dialogue, pas deux à la fois (une récolte à l'outil se fait avec Espace)
    if (p.take && ((p.harvest && !p.harvest.tool) || p.interact)) err(`props.json '${key}' : 'take' avec '${p.harvest ? 'harvest' : 'interact'}' (E ne peut faire qu'une chose)`);
    addAll(validateRope(key, p, c));
  }

  // Gabarit : taille de chaque objet d'après ses dimensions réelles
  addAll(validateGabarit(c, cat));

  // Pièces de tronc couché : une image par état de l'encoche et du bout gauche, de la taille de la pièce (voir `notch`)
  addAll(validateTrunk(c, cat));

  // Objets possédables
  for (const [key, it] of Object.entries(c.items)) {
    if (it.hold) addAll(validateHold(`items.json '${key}'`, it.hold, it.hands, cat));
    if (!KEBAB_CASE.test(key)) err(`items.json '${key}' : la clé doit être un identifiant anglais en kebab-case`);
    if (!cat.textures.has(it.icon)) err(`items.json '${key}' : icône '${it.icon}' non dessinée`);
    if (it.ground && !cat.textures.has(it.ground)) err(`items.json '${key}' : image au sol '${it.ground}' non dessinée`);
  }

  // Masses, roulement, pose pousser
  addAll(validateMasses(c, cat));

  // Tas : genres, pièces, formes
  addAll(validatePiles(c, cat));

  // Plans de bâtiment : emprise, étapes du chantier, places
  addAll(validatePlans(c));

  // Interface : la jauge de E maintenu (de vide à plein) et les chiffres du nombre de pièces d'un tas
  if (!cat.animations.get('ui-gauge')?.has('fill')) err("Interface : planche 'ui-gauge' et son animation 'fill' non dessinées (jauge de E maintenu)");
  for (const d of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'm', 'comma']) {
    if (!cat.textures.has(`ui-digit-${d}`)) err(`Interface : signe 'ui-digit-${d}' non dessiné (nombre de pièces d'un tas, longueur du rouleau)`);
  }

  // Personnages et dialogues
  for (const [key, ch] of Object.entries(c.characters)) {
    if (!cat.animations.has(`portrait-${ch.portrait}-${PORTRAIT_SIZE}`)) err(`characters.json '${key}' : portrait 'portrait-${ch.portrait}-${PORTRAIT_SIZE}' non dessiné`);
  }
  for (const [id, d] of Object.entries(c.dialogues)) {
    d.lines.forEach((line, i) => {
      if (line.choices && i < d.lines.length - 1) err(`dialogues.json '${id}' ligne ${i + 1} : des choix ne se proposent qu'à la dernière ligne`);
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
