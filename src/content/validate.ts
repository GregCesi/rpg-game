// Vérifications croisées du contenu : tout ce qu'un schéma seul ne peut pas voir
// (une sortie vers une carte qui n'existe pas, un objet dont l'image n'a pas été dessinée...).
// Utilisé par `npm run check` (Node) et au démarrage du jeu.

import { PLAYER, PORTRAIT_SIZE, START, TILE } from '../config';
import { CM_PER_PX, TOLERANCE, expectedSize } from './gabarit';
import { itemMass, naturalFactor, propMass, type MassCatalog } from './mass';
import { ageableImages, crosswise, variantImage, viewImages } from './views';
import { agedKey, framesOf, lookOf, WEDGE_FRAMES, woodSheets } from '../world/woodShape';
import { formImage } from '../world/natural';
import { partMass, partName } from '../world/transform';
import { woodDims } from '../world/woodPiece';
import { planProblems } from '../world/build';
import { openSides } from '../world/zones';
import { WEAPON_ANGLES } from '../world/strike';
import type { CombatPoses } from '../world/strike';
import { calibrationJob, gameJobs, planOf, swingerOf } from '../world/workPlan';
import { JointTypeSchema } from './types';
import type { BuildPlan, CombatDef, Facing, Views, CharacterDef, Hold, HoldPoses, DialogueDef, Gesture, ItemDef, MapData, PileDef, PlanDef, PropDef, Strength, TilesetCatalog, WoodDef, WoodLook, WoodPiece, Matter, Rock, TransformDef, WorkDef } from './types';

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
  /** Silhouettes de pièces de bois assemblées à plusieurs longueurs (build-art) : le gabarit de la demi-bille, du quartier, de la poutre. */
  woodSilhouettes: readonly { piece: WoodPiece; w: number; h: number }[];
  tiles: Map<string, Set<string>>;
  /** Numéros de tuiles qui existent (hors trous) et numéros bloquants, par jeu de tuiles. */
  tileNumbers: Map<string, Set<number>>;
  solid: Map<string, Set<number>>;
}

interface ManifestLike {
  spritesheets: { key: string; frameWidth: number; frameHeight: number; animations: Record<string, { frames: unknown[] }>; silhouette: { w: number; h: number } }[];
  tilesets: { key: string; tiles: Record<string, number>; solid: number[] }[];
  images: { key: string; width: number; height: number; silhouette: { w: number; h: number } }[];
  woodSilhouettes?: readonly { piece: WoodPiece; w: number; h: number }[];
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
    woodSilhouettes: m.woodSilhouettes ?? [],
    frameCounts: new Map(m.spritesheets.map((s) => [s.key, new Map(Object.entries(s.animations).map(([k, a]) => [k, a.frames.length]))])),
    tiles: new Map(m.tilesets.map((t) => [t.key, new Set(Object.keys(t.tiles))])),
    tileNumbers: new Map(m.tilesets.map((t) => [t.key, new Set(Object.values(t.tiles))])),
    solid: new Map(m.tilesets.map((t) => [t.key, new Set(t.solid)])),
  };
}

/** Détails posés au hasard : leurs images doivent être dessinées. */
function validateTilesCatalog(catalogs: Record<string, TilesetCatalog>, cat: Catalog): string[] {
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
function validateMaps(
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
    // une zone du monde : là où le monde continue, un arbre peut tomber par-dessus le bord (chantier « monde »)
    const open = openSides(maps, m);

    for (const o of m.objects) {
      const at = `${where} : objet « ${o.type} » n°${o.id} en (${o.x}, ${o.y})`;
      if (!propsByType[o.type]) err(`${at} : absent de props.json`);
      else for (const side of ['droite', 'gauche'] as const) {
        const box = fallExtent(propsByType, o.type, side === 'gauche', cat);
        if (!box) continue;
        const [x0, x1] = [o.x + box[0], o.x + box[1]];
        if ((x0 < 0 && !open.west) || (x1 > W && !open.east)) err(`${at} : pas la place de tomber à ${side} dans la carte (la chute et l'arbre couché vont de x = ${x0} à ${x1}, la carte fait ${W} px de large)`);
      }
      if (o.x < 0 || o.y < 0 || o.x > W || o.y > H) err(`${at} : hors de la carte`);
      if (o.interact && !dialogues[o.interact]) err(`${at} : dialogue '${o.interact}' introuvable`);
    }
    for (const p of m.parcels) {
      const at = `${where} : parcelle « ${p.name ?? p.use} » en (${p.x}, ${p.y})`;
      if (p.x < 0 || p.y < 0 || p.x + p.w > W || p.y + p.h > H) err(`${at} : sort de la carte`);
    }
    for (const p of m.plans) {
      const at = `${where} : plan « ${p.plan} » (objet n°${p.id}) en (${p.x}, ${p.y})`;
      if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) err(`${at} : hors de la carte`);
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
  wood: WoodDef;
  matters: Record<string, Matter>;
  rocks: Record<string, Rock>;
  transforms: Record<string, TransformDef>;
  combat: CombatDef;
  /** Le travail (work.json) : les coups, la matière, les points de calage. */
  work: WorkDef;
  /** Le temps (time.json) : les paliers de la vitesse du temps. */
  time?: { speeds: readonly number[]; dieuSpeed: number };
  /**
   * Les poses des gestes de combat (src/generated/combatPoses.ts), passées par qui les a (npm run check, le jeu) : validate.ts ne les
   * importe pas, car build-art, qui les écrit, l'utilise avant de les avoir écrites (sur un dossier neuf, elles n'existent pas encore).
   * Absentes : leur vérification est sautée.
   */
  combatPoses?: Record<string, CombatPoses>;
  /**
   * Le catalogue du mode construction (src/build/catalog.ts), passé par qui l'a (npm run check, le jeu) : le contenu ne dépend pas du
   * jeu (règle d'architecture, .dependency-cruiser.cjs). Absent : sa vérification est sautée.
   */
  buildCatalog?: { entries: readonly { id: string; name: string; thumb: string }[]; looksOf: (size: string) => readonly string[] };
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
  if (h.convert) {
    const k = h.convert;
    if (!h.tool) err("'convert' : il faut l'outil qui taille ('tool')");
    for (const [from, into] of Object.entries(k.from)) {
      if (!c.items[from]) err(`'convert' : '${from}' (ce qu'on taille) absent de items.json`);
      if (!c.items[into]) err(`'convert' : '${into}' (ce qu'il devient) absent de items.json`);
    }
    if (c.items[h.tool ?? '']?.hands === 2) err("'convert' : l'outil se tient à une main (l'autre tient ce qu'on taille)");
    if (h.hits !== 1) err("'convert' : un seul coup");
    if (h.becomes !== undefined || h.drops.length || h.spawns.length || h.fall) err("'convert' : sans 'becomes', 'drops', 'spawns' ni 'fall'");
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
 * Ce qui naît d'une chute (l'arbre couché) a sa version couchée vers la gauche, `<image>-left`, de la même taille, dessinée et
 * non retournée ; la pièce de bois, jamais retournée (elle est posée en miroir), n'en a pas.
 */
function validateFallLeft(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const born = new Set<string>();
  for (const p of Object.values(c.props)) if (p.harvest?.fall) for (const sp of p.harvest.spawns) born.add(sp.type);
  for (const key of born) {
    const p = c.props[key];
    if (!p || p.wood) continue;
    const img = `${p.image}-left`;
    const size = cat.sizes.get(img);
    const base = cat.sizes.get(p.image);
    if (!size) errors.push(`props.json '${key}' : image couchée vers la gauche '${img}' non dessinée`);
    else if (base && (size.w !== base.w || size.h !== base.h)) errors.push(`props.json '${key}' : '${img}' fait ${size.w}×${size.h}, '${p.image}' ${base.w}×${base.h} (même taille attendue)`);
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
  // les pièces de bois assemblées : est-ouest, leur silhouette a la taille de leurs dimensions (woodDims), à toute longueur ;
  // nord-sud, celle de la même pièce est-ouest, inversée, à 1 px près (règle D : une pièce tournée garde sa taille)
  for (const { piece, w, h } of cat.woodSilhouettes) {
    if (piece.axis === 'ns') {
      const twin = cat.woodSilhouettes.find(
        (o) => o.piece.axis === 'ew' && o.piece.size === piece.size && o.piece.length === piece.length && lookOf(o.piece) === lookOf(piece) && o.piece.shape === piece.shape && o.piece.point === piece.point,
      );
      if (twin && (Math.abs(w - twin.h) > 1 || Math.abs(h - twin.w) > 1)) {
        errors.push(`pièce de bois ${piece.size} ${lookOf(piece)}${piece.point ? ` pointe en bas` : ''} nord-sud de ${piece.length} cm : ${w} × ${h} px, attendu ${twin.h} × ${twin.w} (l'est-ouest inversé, règle D, à 1 px près)`);
      }
      continue;
    }
    // debout (règle D étendue, STYLE.md section 8) : la largeur à l'écran est l'épaisseur de la même pièce couchée est-ouest, à 1 px près
    if (piece.axis === 'up') {
      const lying = cat.woodSilhouettes.find(
        (o) => o.piece.axis === 'ew' && o.piece.size === piece.size && o.piece.length === piece.length && lookOf(o.piece) === lookOf(piece) && o.piece.shape === piece.shape,
      );
      if (lying && Math.abs(w - lying.h) > 1) {
        errors.push(`pièce de bois ${piece.size} ${lookOf(piece)} debout de ${piece.length} cm : ${w} px de large, attendu ${lying.h} (l'épaisseur de la même pièce couchée est-ouest, règle D étendue, à 1 px près)`);
      }
    }
    // les faces dressées en cours (f1 à f3) sont entre le rond et la poutre : pas de forme de base, seul leur nord-sud se contrôle
    if (['f1', 'f2', 'f3'].includes(lookOf(piece))) continue;
    const want = expectedSize(woodDims(piece));
    const ok = (n: number, lo: number, hi: number) => n >= lo - TOLERANCE && n <= hi + TOLERANCE;
    if (ok(w, want.w, want.wMax) && ok(h, want.h, want.hMax)) continue;
    const f = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
    errors.push(
      `pièce de bois ${piece.size} ${lookOf(piece)}${piece.point ? ` pointe en bas` : ''} ${piece.axis} de ${piece.length} cm hors gabarit : attendu ${f(want.w)} × ${f(want.h)} px, dessiné ${w} × ${h} px (tolérance ${TOLERANCE} px)`,
    );
  }
  // un objet possédable qui a ses dimensions : son image au sol (vue 0) les suit, comme un objet du monde ; ses vues nord-sud et son
  // demi-tour se vérifient avec toutes ses vues (règle D)
  for (const [key, it] of Object.entries(c.items)) {
    // l'image au sol suit le gabarit ; l'icône (16 px, la case de main) n'est pas à l'échelle
    if (!it.dims || !it.ground) continue;
    const image = it.ground;
    const drawn = cat.silhouettes.get(image);
    if (!drawn) continue;
    const want = expectedSize(it.dims);
    const within = (n: number, lo: number, hi: number) => n >= lo - TOLERANCE && n <= hi + TOLERANCE;
    if (within(drawn.w, want.w, want.wMax) && within(drawn.h, want.h, want.hMax)) continue;
    const f = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
    errors.push(`items.json '${key}' (image '${image}') hors gabarit : attendu ${f(want.w)} × ${f(want.h)} px (${it.dims.w} × ${it.dims.d} × ${it.dims.h} cm, ${it.dims.shape}), dessiné ${drawn.w} × ${drawn.h} px (tolérance ${TOLERANCE} px)`);
  }
  for (const [key, p] of Object.entries(c.props)) {
    // l'ombre portée se calcule sur l'emprise au sol d'une couverture : une pièce de toit vue à l'échelle du sol
    if (p.shadow && !(p.roof && p.dims.ground)) errors.push(`props.json '${key}' : 'shadow' est l'ombre d'une couverture, pièce 'roof' avec 'dims.ground'`);
    // ce qui s'ouvre et se ferme : son autre état existe, le nomme en retour, un seul des deux est l'ouvert, mêmes vues
    if (p.swing) {
      const o = c.props[p.swing.into];
      const at = `props.json '${key}' : 'swing'`;
      if (!o) errors.push(`${at} : l'objet '${p.swing.into}' n'existe pas`);
      else if (o.swing?.into !== key) errors.push(`${at} : '${p.swing.into}' doit le nommer en retour ('swing.into' : '${key}')`);
      else if (!!o.swing.open === !!p.swing.open) errors.push(`${at} : un seul des deux états est l'ouvert ('open')`);
      else if (o.swing.hinge !== p.swing.hinge || o.views !== p.views) errors.push(`${at} : les deux états tournent sur le même gond et ont les mêmes vues`);
      else if (p.swing.hinge === 'side' && (o.dims.w !== p.dims.w || o.dims.d !== p.dims.d || o.dims.h !== p.dims.h)) errors.push(`${at} : un battant sur le côté garde ses dimensions ouvert`);
      else if (p.swing.hinge === 'double' && (o.dims.w !== p.dims.w || o.dims.h !== p.dims.h)) errors.push(`${at} : deux battants gardent la largeur et la hauteur ouverts`);
      else if (!!o.swing.passage !== !!p.swing.passage) errors.push(`${at} : les deux états d'une porte sont un passage ('passage')`);
      // ouverts, les deux battants laissent le passage libre : pas de collision
      else if (p.swing.passage && p.swing.open && p.swing.hinge === 'double' && (p.body || p.bodies)) errors.push(`${at} : ouverts, les deux battants laissent le passage libre (pas de 'body')`);
    }
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

/**
 * Objets d'avant la règle « toutes les faces » (docs/STYLE.md section 8) qui n'ont pas encore toutes leurs vues : la raison. Le
 * build passe, mais `npm run check` dit à chaque fois combien d'objets et de dessins restent (`viewsTodo`). Un objet sort de la
 * liste dès que ses vues sont dessinées (validate.ts le demande) ; un objet nouveau ne s'y ajoute pas : il naît avec ses vues.
 */
export const VIEWS_TODO: Record<string, string> = {
  // les meubles : au chantier de la maison
  bed: 'meuble : au chantier de la maison',
  pallet: 'meuble : au chantier de la maison',
  chest: 'meuble : au chantier de la maison',
  table: 'meuble : au chantier de la maison',
  crate: 'meuble : au chantier de la maison',
  workbench: 'meuble : au chantier de la maison',
  worktable: 'meuble : au chantier de la maison',
  'hay-bale': 'meuble : au chantier de la maison',
  stove: 'meuble : au chantier de la maison',
  'wall-torch': 'meuble (torche au mur) : au chantier de la maison',
  // les objets fixés dans le monde : leurs vues serviront à les poser tournés dans Tiled
  cottage: 'objet fixé du monde : pour le poser tourné dans Tiled',
  well: 'objet fixé du monde : pour le poser tourné dans Tiled',
  fireplace: 'objet fixé du monde : pour le poser tourné dans Tiled',
  woodpile: 'objet fixé du monde (ancien tas de décor) : pour le poser tourné dans Tiled',
  'chopping-block-axe': 'objet fixé du monde (la hache plantée) : pour le poser tourné dans Tiled',
  'plan-tablet': 'objet fixé du monde (sur la table de la mère) : pour la poser tournée dans Tiled',
  'big-felled-tree': 'arbre couché : ses chutes vers le nord et le sud (le demi-tour est -left)',
  'big-pollard-felled-tree': 'arbre couché : ses chutes vers le nord et le sud (le demi-tour est -left)',
  'normal-felled-tree': 'arbre couché : ses chutes vers le nord et le sud (le demi-tour est -left)',
  'shed-plate-north': "abri construit : pour un plan orienté autrement",
  'shed-plate-south': "abri construit : pour un plan orienté autrement",
  'shed-plate-side': "abri construit : pour un plan orienté autrement",
  'shed-rafter': "abri construit : pour un plan orienté autrement",
  'shed-roof': "abri construit : pour un plan orienté autrement",
  // la pioche : ses données de coup existent (le rocher), pas encore ses dessins
  pickaxe: "outil au travail (le rocher), pas encore dessiné au sol ni en main : son image au sol, ses vues et sa planche tool-pickaxe (pixel-artist)",
  hoe: "outil pas encore en jeu : son image au sol et ses vues avec son chantier",
  sickle: "outil pas encore en jeu : son image au sol et ses vues avec son chantier",
  'watering-can': "outil pas encore en jeu : son image au sol et ses vues avec son chantier",
  'fishing-rod': "outil pas encore en jeu : son image au sol et ses vues avec son chantier",
  sword: "arme pas encore en jeu : son image au sol et ses vues avec son chantier",
};

/**
 * Un objet et ses vues : où il est (props.json, items.json), sa symétrie, ses images (vue 0 d'abord), celles qui manquent, et
 * celles qui sont dessinées mais pas à leur taille (`wrong` : le message ; elles sont à redessiner).
 */
interface ObjectViews {
  at: string;
  key: string;
  views: Views;
  images: string[];
  missing: string[];
  wrong: { image: string; message: string }[];
}

/**
 * Les vues de chaque objet de props.json et items.json (un objet possédable : son image au sol, sinon son icône s'il est rond).
 * Couché, ses vues nord-sud ont la silhouette de l'est-ouest inversée, et son demi-tour la même, à 1 px près (règle D) ; debout,
 * chaque vue de côté suit le gabarit de ses dimensions vues de ce côté (largeur et profondeur échangées).
 */
function objectViews(c: Content, cat: Catalog): ObjectViews[] {
  const has = (k: string) => cat.textures.has(k);
  const f = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
  const entries: { at: string; key: string; views: Views; lying: boolean; base: string; dims?: PropDef['dims'] }[] = [
    ...Object.entries(c.props).map(([key, p]) => ({ at: `props.json '${key}'`, key, views: p.views, lying: !!p.lying, base: p.image, dims: p.dims })),
    // sans image au sol, un objet rond se montre par son icône ; un autre n'a encore aucune de ses vues au sol
    ...Object.entries(c.items).map(([key, it]) => ({ at: `items.json '${key}'`, key, views: it.views, lying: !!it.lying, base: it.ground ?? (it.views === 'round' ? it.icon : `${key}-ground`), dims: it.dims })),
  ];
  // la seconde forme d'une matière naturelle (`natural.forms` 2) a toutes ses vues aussi, à la même règle que la première
  for (const [key, d] of [...Object.entries(c.props), ...Object.entries(c.items)] as [string, PropDef | ItemDef][]) {
    if (d.natural?.forms !== 2) continue;
    const base = 'image' in d ? d.image : (d.ground ?? d.icon);
    const at = `${'image' in d ? 'props' : 'items'}.json '${key}' seconde forme`;
    entries.push({ at, key: `${key}#b`, views: d.views, lying: !!d.lying, base: formImage(base, { form: 1, size: 100 }), dims: d.dims });
  }
  // chaque tirage d'un élément calculé (`variants`, le morceau de solin) a toutes ses vues aussi, à la même règle que le premier
  for (const [key, p] of Object.entries(c.props)) {
    for (let k = 1; k < (p.variants ?? 0); k++) {
      entries.push({ at: `props.json '${key}' tirage ${k}`, key: `${key}#s${k}`, views: p.views, lying: !!p.lying, base: variantImage(p.image, k), dims: p.dims });
    }
  }
  return entries.map((e) => {
    const images = viewImages(e.base, e.views, has);
    const wrong: ObjectViews['wrong'] = [];
    const base = cat.silhouettes.get(images[0]);
    images.forEach((img, k) => {
      const s = cat.silhouettes.get(img);
      if (!s || !base || k === 0) return;
      const cross = crosswise(e.views, k);
      if (e.lying) {
        const [w, h] = cross ? [base.h, base.w] : [base.w, base.h];
        if (Math.abs(s.w - w) > 1 || Math.abs(s.h - h) > 1) {
          wrong.push({ image: img, message: `vue '${img}' de ${s.w} × ${s.h} px, attendu ${w} × ${h} (${cross ? "l'image tournée d'un quart de tour, dimensions inversées" : "l'image retournée, mêmes dimensions"}, règle D, à 1 px près)` });
        }
      } else if (e.dims && cross && !EXCEPTIONS[e.key]) {
        const want = expectedSize({ ...e.dims, w: e.dims.d, d: e.dims.w });
        const within = (n: number, lo: number, hi: number) => n >= lo - TOLERANCE && n <= hi + TOLERANCE;
        if (!within(s.w, want.w, want.wMax) || !within(s.h, want.h, want.hMax)) {
          wrong.push({ image: img, message: `vue de côté '${img}' hors gabarit : attendu ${f(want.w)} × ${f(want.h)} px (largeur et profondeur échangées), dessiné ${s.w} × ${s.h} px` });
        }
      }
    });
    return { at: e.at, key: e.key, views: e.views, images, missing: images.filter((k) => !has(k)), wrong };
  });
}

/** Toutes les faces : chaque objet a les vues de sa symétrie, à leur taille ; sinon il est dans VIEWS_TODO. */
function validateViews(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(VIEWS_TODO)) if (!c.props[key] && !c.items[key]) errors.push(`validate.ts VIEWS_TODO : '${key}' absent de props.json et d'items.json`);
  for (const o of objectViews(c, cat)) {
    const todo = VIEWS_TODO[o.key];
    if (todo) {
      if (!o.missing.length && !o.wrong.length) errors.push(`validate.ts VIEWS_TODO : '${o.key}' a maintenant toutes ses vues : le retirer de la liste`);
      continue;
    }
    if (o.missing.length) errors.push(`${o.at} (${o.views}) : vue${o.missing.length > 1 ? 's' : ''} non dessinée${o.missing.length > 1 ? 's' : ''} : ${o.missing.map((k) => `'${k}'`).join(', ')}`);
    for (const w of o.wrong) errors.push(`${o.at} : ${w.message}`);
  }
  return errors;
}

/** Ce qui reste de VIEWS_TODO : chaque objet et ses dessins manquants ou à reprendre, et le total (une image partagée compte une fois). */
export function viewsTodo(c: Content, cat: Catalog): { objects: { key: string; missing: string[]; reason: string }[]; drawings: number } {
  const objects = objectViews(c, cat)
    .filter((o) => VIEWS_TODO[o.key] && (o.missing.length || o.wrong.length))
    .map((o) => ({ key: o.key, missing: [...o.missing, ...o.wrong.map((w) => w.image)], reason: VIEWS_TODO[o.key] }));
  return { objects, drawings: new Set(objects.flatMap((o) => o.missing)).size };
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
    } else if ('wood' in piece) {
      err(`${at} : un tas de bois ne s'écrit pas dans piles.json, sa forme se calcule d'après sa première pièce (src/world/woodPile.ts)`);
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
    for (const [part, t] of Object.entries({ north: tie.north, south: tie.south, alone: tie.alone, west: tie.west, east: tie.east })) {
      if (t && !cat.textures.has(t.image)) err(`${at} ${part} : image '${t.image}' non dessinée`);
    }
    if (pile.turned && !(tie.west && tie.east)) err(`${at} : un genre lié qui se tourne a les deux bouts de son lien nord-sud ('west', 'east')`);
    if (!pile.turned && (tie.west || tie.east)) err(`${at} : 'west' et 'east' sont le lien du tas tourné, et ce genre ne se tourne pas`);
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
        if (accepts.wood) {
          // une poutre : la pièce du plan a sa section et sa longueur ; trop lourde à porter, elle se dresse avec de l'aide
          const w = accepts.wood;
          const wd = c.wood;
          if (w.section !== wd.hew.beam) errors.push(`${pw} : section de ${w.section} cm, la poutre de wood.json fait ${wd.hew.beam} cm`);
          if (w.length % wd.grid !== 0 || w.length < wd.min) errors.push(`${pw} : longueur de ${w.length} cm hors de la grille de ${wd.grid} cm (au moins ${wd.min} cm)`);
          // le poteau tient sur ses dés sans déborder (dessinés à 5 cm par pixel, comme la pièce debout)
          const post = woodDims({ size: Object.keys(c.wood.sizes).find((k) => c.wood.sizes[k].looks.beam?.up) ?? '', length: w.length, shape: 'round', hewn: c.wood.hew.faces * c.wood.hew.perFace, axis: 'up' });
          for (const o of place.on) {
            const under = plan.steps.flatMap((st) => Object.entries(st.places)).find(([k]) => k === o)?.[1];
            const dims = under && c.props[under.piece]?.dims;
            if (under && dims && (place.at[0] < under.at[0] || place.at[0] + post.w > under.at[0] + dims.w)) errors.push(`${pw} : le poteau (${post.w} cm de large, en x ${place.at[0]}) déborde de son dé '${o}' (${dims.w} cm, en x ${under.at[0]})`);
          }
          // ce qu'on voit est ce qu'on a posé : la pièce de bois elle-même, dressée (`upright`), pas un dessin à part
          if (place.piece !== 'wood-piece') errors.push(`${pw} : une poutre est la pièce de bois ('wood-piece'), pas '${place.piece}'`);
          if (place.orientation !== 'upright') errors.push(`${pw} : une poutre se dresse (orientation 'upright') ; les autres sens viendront avec leur étape`);
          if (!Object.values(wd.sizes).some((sz) => sz.looks.beam?.up)) errors.push(`${pw} : aucun bois n'a de poutre debout ('up' de son aspect 'beam', wood.json)`);
        } else if (accepts.prop) {
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
 * Le bois (wood.json, world/woodShape.ts) : chaque diamètre a ses deux planches de parties (`<sheet>` est-ouest, `<sheet>-ns`
 * nord-sud), chaque aspect en trois parties (le rond en 4 images de roulement), les deux bandes d'encoche (4 images), et pour un
 * aspect qui se fend son coin planté à chaque bout, sa fente et son bois ouvert ; chaque aspect a son icône et sa vue portée ; les
 * outils sont des outils ; les longueurs sont sur la grille. La pièce de bois de props.json (`wood`) n'a que ses réglages par
 * défaut : sa collision, sa prise, son roulement se tirent de ses réglages (world/woodPiece.ts) ; une récolte qui donne du bois
 * (`harvest.wood`) devient cette pièce.
 */
function validateWood(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(`wood.json : ${msg}`);
  const W = c.wood;
  if (W.min % W.grid) err(`'min' est un multiple de 'grid' (${W.grid} cm)`);
  if (W.cut.hits !== 3) err(`'cut.hits' : 3 coups (un tiers, deux tiers, coupé : les bandes notch1 et notch2)`);
  for (const tool of [W.cut.tool, W.hew.tool, W.split.wedge, W.split.maul]) if (c.items[tool]?.kind !== 'tool') err(`'${tool}' n'est pas un outil de items.json`);
  if (c.items[W.split.wedge]?.hands === 2) err(`le coin '${W.split.wedge}' se tient à une main (il se plante et quitte la main)`);
  for (const [key, size] of Object.entries(W.sizes)) {
    const at = `diamètre '${key}'`;
    // la face entamée (`dressed`) pose les parties de l'aspect suivant par-dessus celles de l'aspect en cours : même géométrie
    const hewing = (['round', 'f1', 'f2', 'f3', 'beam'] as const).filter((l) => size.looks[l]);
    for (const l of hewing.slice(1)) {
      const a = size.looks[hewing[0]]!;
      const b = size.looks[l]!;
      if (JSON.stringify([a.ew, a.ns]) !== JSON.stringify([b.ew, b.ns])) err(`${at} : l'aspect '${l}' n'a pas la géométrie (ew, ns) de '${hewing[0]}' : une face entamée ne s'y poserait pas`);
    }
    for (const sheet of [size.sheet, `${size.sheet}-ns`]) {
      const anims = cat.frameCounts.get(sheet);
      const want = (anim: string, n: number) => {
        const got = anims?.get(anim);
        if (got === undefined) err(`${at} : planche '${sheet}' : animation '${anim}' non dessinée`);
        else if (got !== n) err(`${at} : planche '${sheet}' : '${anim}' a ${got} images, il en faut ${n}`);
      };
      // le quartier : pointe en l'air (sa position posé) et pointe en bas (un sur deux dans une rangée de tas)
      for (const look of Object.keys(size.looks) as WoodLook[]) {
        for (const drawn of look === 'quarter' ? ['quarter', 'quarter-down'] : [look]) for (const part of ['start', 'mid', 'end']) want(`${drawn}-${part}`, framesOf(look));
      }
      for (const notch of ['notch1', 'notch2']) want(notch, 4);
      for (const [look, rule] of Object.entries(size.split)) {
        if (!size.looks[look as WoodLook]) err(`${at} : 'split' d'un aspect '${look}' qu'il n'a pas`);
        if (!size.looks[rule.into]) err(`${at} : 'split.${look}' devient '${rule.into}', un aspect qu'il n'a pas`);
        for (const part of ['start', 'end']) want(`wedge-${look}-${part}`, WEDGE_FRAMES);
        for (const part of ['start', 'mid', 'end']) {
          want(`crack-${look}-${part}`, 1);
          want(`open-${look}-${part}`, 1);
        }
      }
    }
    // les aspects qui se dressent (poteau) : une planche `<sheet>-up`, trois parties d'une image chacun ; le pied est posé sur un dé
    for (const [look, l] of Object.entries(size.looks)) {
      if (!l.up) continue;
      const anims = cat.frameCounts.get(`${size.sheet}-up`);
      for (const part of ['start', 'mid', 'end']) {
        const got = anims?.get(`${look}-${part}`);
        if (got !== 1) err(`${at} : planche '${size.sheet}-up' : '${look}-${part}' ${got === undefined ? 'non dessinée' : `a ${got} images, il en faut 1`}`);
      }
      if (l.up.start + l.up.end > l.up.extra + W.min / 5) err(`${at} '${look}' up : la tête et le pied (${l.up.start + l.up.end} rangées) dépassent la plus courte pièce`);
    }
    for (const [look, l] of Object.entries(size.looks)) {
      if (!cat.textures.has(l.icon)) err(`${at} '${look}' : icône '${l.icon}' non dessinée`);
      errors.push(...validateHold(`wood.json ${at} '${look}'`, { stance: 'carry', image: l.held }, 2, cat));
    }
  }
  for (const [key, p] of Object.entries(c.props)) {
    const at = `props.json '${key}'`;
    if (p.wood) {
      if (!W.sizes[p.wood.size]?.looks[p.wood.shape]) err(`${at} : réglages par défaut d'un bois qui n'existe pas ('${p.wood.size}', '${p.wood.shape}')`);
      if (p.mass !== 'wood') errors.push(`${at} : la pièce de bois a '"mass": "wood"' (calculée par ses réglages)`);
      if (p.take || p.roll || p.turn || p.body || p.bodies || p.harvest) errors.push(`${at} : sa prise, son roulement, son pivot et sa collision se tirent de ses réglages (world/woodPiece.ts) : ni 'take', 'roll', 'turn', 'body', 'bodies' ni 'harvest'`);
    } else if (p.roll || p.mass === 'wood') errors.push(`${at} : seule la pièce de bois ('wood') roule ou a '"mass": "wood"'`);
    const h = p.harvest;
    if (h?.wood) {
      if (!h.becomes || !c.props[h.becomes]?.wood) errors.push(`${at} : 'harvest.wood' : il devient une pièce de bois ('becomes' : l'objet de props.json qui a 'wood')`);
      if (!W.sizes[h.wood.size]) errors.push(`${at} : 'harvest.wood' : diamètre '${h.wood.size}' introuvable dans wood.json`);
      if (h.wood.length % W.grid || h.wood.length < W.min) errors.push(`${at} : 'harvest.wood' : longueur ${h.wood.length} cm hors de la grille (multiple de ${W.grid}, au moins ${W.min})`);
    } else if (h?.becomes && c.props[h.becomes]?.wood) errors.push(`${at} : il devient une pièce de bois : son diamètre et sa longueur ('harvest.wood')`);
  }
  return errors;
}

/**
 * Objets de bois qui ne prennent pas l'âge du bois, avec leur raison : du bois vert, brut, qu'on ne travaille pas (l'âge est celui du
 * bois mis à nu). Un objet de bois travaillé ne s'ajoute pas ici : il est `aged`.
 */
const RAW_WOOD: Record<string, string> = {
  'wattle-rod': 'baguette de coudrier verte, avec son écorce, tressée telle quelle',
};

/**
 * Le combat (combat.json, docs/CONCEPTION.md « Le combat ») : chaque attaque joue un geste qui existe ; chaque famille a des postures
 * dont les suites nomment des attaques, et sa dernière posture convient à tout (Espace a toujours une attaque) ; chaque arme
 * (`weapon` de items.json) nomme une famille, a sa planche `weapon-<…>` en huit angles et une masse ; chaque cible (`target` de
 * props.json) a les éclats de sa matière (`fx-<matter>`), et des points de vie infinis tant que rien ne garde les blessures.
 */
function validateCombat(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  for (const [key, a] of Object.entries(c.combat.attacks)) {
    // un geste de combat : ses images dans la planche du corps, dans les quatre directions (art/characters/xeros-combat.ts)
    for (const dir of DIRECTIONS) {
      if (!cat.animations.get(PLAYER.skin)?.has(`${a.gesture}-${dir}`)) err(`combat.json attaque '${key}' : animation '${a.gesture}-${dir}' absente de la planche '${PLAYER.skin}'`);
    }
  }
  // les poses de chaque geste de combat (art/characters/xeros-combat.ts, tirées par build-art) : autant d'images que l'animation du
  // corps dans chaque direction, au moins une image de frappe, la traînée et l'éclat dessinés
  const combatPoses = c.combatPoses ?? {};
  for (const g of c.combatPoses ? new Set(Object.values(c.combat.attacks).map((a) => a.gesture)) : []) {
    const poses = combatPoses[g];
    if (!poses) { err(`combat.json geste '${g}' : pas de poses (COMBAT_POSES, art/characters/xeros-combat.ts)`); continue; }
    for (const dir of DIRECTIONS) {
      const frames = poses[dir as Facing] ?? [];
      const n = cat.frameCounts.get(PLAYER.skin)?.get(`${g}-${dir}`);
      if (n !== undefined && n !== frames.length) err(`combat.json geste '${g}' ${dir} : ${frames.length} poses pour ${n} images dans '${PLAYER.skin}-${g}-${dir}'`);
      for (const f of frames) {
        for (const img of [f.spark?.image, f.grip?.image]) if (img && !cat.textures.has(img)) err(`combat.json geste '${g}' ${dir} : image '${img}' non dessinée`);
        // la traînée, tirée pour chaque arme qui joue ce geste, à sa longueur
        if (!f.smear) continue;
        for (const [key, it] of Object.entries(c.items)) {
          const fam = it.weapon && c.combat.families[it.weapon.family];
          const plays = fam && fam.stances.some((st) => st.chain.some((a) => c.combat.attacks[a]?.gesture === g));
          const img = `fx-smear-${key}-${f.smear.image}`;
          if (plays && !cat.textures.has(img)) err(`combat.json geste '${g}' ${dir} : traînée '${img}' non dessinée (l'arme '${key}' à sa longueur)`);
        }
      }
    }
  }
  // où frappe chaque geste, au sol (`sweeps`) : un par geste d'attaque, autant d'images que ses poses, des images actives qui existent
  for (const g of new Set(Object.values(c.combat.attacks).map((a) => a.gesture))) {
    const sw = c.combat.sweeps[g];
    if (!sw) { err(`combat.json geste '${g}' : pas de zone de coup ('sweeps')`); continue; }
    const n = combatPoses[g]?.down.length;
    if (n !== undefined && sw.frames.length !== n) err(`combat.json sweeps '${g}' : ${sw.frames.length} images pour ${n} poses`);
    for (const k of sw.active) if (k >= sw.frames.length) err(`combat.json sweeps '${g}' : image active ${k} au-delà des ${sw.frames.length} images`);
  }
  for (const g of Object.keys(c.combat.sweeps)) if (!Object.values(c.combat.attacks).some((a) => a.gesture === g)) err(`combat.json sweeps '${g}' : aucune attaque ne joue ce geste`);
  if (!c.combat.families[c.combat.unarmed.family]) err(`combat.json main nue : famille '${c.combat.unarmed.family}' inconnue`);
  if (!c.combat.unarmed.fist) err("combat.json main nue : 'fist: true' (sa lame est le bras)");
  for (const [key, f] of Object.entries(c.combat.families)) {
    f.stances.forEach((s, i) => {
      for (const a of s.chain) if (!c.combat.attacks[a]) err(`combat.json famille '${key}' posture '${s.name}' : attaque '${a}' inconnue`);
      const last = i === f.stances.length - 1;
      if (last && (s.when.other !== undefined && s.when.other !== 'any' || s.when.both !== undefined)) {
        err(`combat.json famille '${key}' : la dernière posture ('${s.name}') doit convenir à tout ('when' vide), pour qu'Espace ait toujours une attaque`);
      }
    });
  }
  for (const [key, it] of Object.entries(c.items)) {
    const w = it.weapon;
    if (!w) continue;
    const at = `items.json '${key}' arme`;
    if (!c.combat.families[w.family]) err(`${at} : famille '${w.family}' absente de combat.json`);
    if (w.fist) err(`${at} : 'fist' est réservé à la main nue (combat.json, 'unarmed')`);
    if (!w.image) { err(`${at} : sa planche 'weapon-<…>' manque ('image')`); continue; }
    if (!w.image.startsWith('weapon-')) err(`${at} : sa planche doit s'appeler 'weapon-<…>' (art/lib/weapon.ts), pas '${w.image}'`);
    const n = cat.frameCounts.get(w.image)?.get('angles');
    if (n === undefined) err(`${at} : planche '${w.image}' et son animation 'angles' non dessinées (art/items/weapons.ts)`);
    else if (n !== WEAPON_ANGLES) err(`${at} : '${w.image}' a ${n} angles pour ${WEAPON_ANGLES}`);
    if (it.mass === undefined) err(`${at} : pas de masse (les dégâts et le prix d'un coup s'en calculent)`);
  }
  for (const [key, p] of Object.entries(c.props)) {
    const t = p.target;
    if (!t) continue;
    if (t.hp !== 'infinite') err(`props.json '${key}' cible : des points de vie finis (${t.hp}) ne sont pas encore gardés par la partie ; 'infinite' en attendant (CONCEPTION, « Le combat »)`);
    if (!cat.textures.has(`fx-${t.matter}`)) err(`props.json '${key}' cible : éclats 'fx-${t.matter}' non dessinés (art/world/fx.ts)`);
  }
  return errors;
}

/**
 * Ce qui n'a pas à être au catalogue du mode construction, avec sa raison (effets, interface). Aujourd'hui rien : tout objet de
 * props.json et d'items.json y est ; ce qui ne se pose pas (un effet, une image d'interface) n'est de toute façon pas un objet.
 */
const CATALOG_EXCLUDED: Record<string, string> = {};

/**
 * Les dessins qui manquent encore à un objet qui a la capacité (à faire avec le pixel-artist, docs/AUDIT.md « Normalisation ») :
 * `ground` l'image au sol, `tool` la planche en main d'un outil qui frappe. Chacun avec sa raison ; un objet dessiné en sort.
 */
const DRAWINGS_TODO: Record<string, { ground?: string; tool?: string }> = {
  pickaxe: { ground: 'pas encore dessinée au sol', tool: 'ses cinq dessins en main (le rocher se travaille déjà au coup)' },
  stone: { ground: 'pierre ancienne, à redessiner au sol (ou remplacée par les pierres brutes)' },
  'iron-ore': { ground: 'pas encore dessiné au sol (la chaîne du fer est à venir)' },
  ...Object.fromEntries(['wheat', 'seeds', 'berries', 'mushroom', 'egg', 'apple', 'wool'].map((k) => [k, { ground: 'objet ancien, à redessiner un objet à la fois' }])),
  ...Object.fromEntries(['hoe', 'sickle', 'watering-can', 'fishing-rod', 'sword'].map((k) => [k, { ground: 'pas encore en jeu : son image au sol avec son chantier' }])),
};

/**
 * Les métiers qui restent à dire (CONCEPTION « Les matières » : chaque objet dit qui le fait) ; à décider avec Grégoire. Le naturel
 * (arbre, rocher, buisson) aura le sien (la nature, ou le cueilleur) ; les meubles et les lumières, celui qui les fabrique.
 */
const TRADE_TODO = new Set([
  'big-tree', 'big-pollard', 'big-tree-stump', 'normal-tree', 'big-felled-tree', 'big-pollard-felled-tree', 'wood-piece', 'normal-tree-stump',
  'rock', 'bush', 'bush-berries', 'rock-rubble', 'cottage', 'woodpile', 'chopping-block', 'chopping-block-rope', 'rope-coil', 'faggot',
  'chopping-block-axe', 'fireplace', 'worktable', 'workbench', 'stove', 'bed', 'pallet', 'sack', 'jar', 'sunpatch', 'lantern', 'wall-torch',
  'candle', 'barrel', 'crate', 'hay-bale', 'chest', 'table', 'stool', 'shed-plate-north', 'shed-plate-south', 'shed-plate-side', 'shed-rafter',
  'shed-roof', 'maul-ground', 'splitting-wedge-ground', 'well', 'planted-stake', 'plan-tablet', 'hatchet-ground', 'broadaxe-ground',
  'stone', 'iron-ore', 'wheat', 'seeds', 'berries', 'mushroom', 'egg', 'apple', 'wool', 'pickaxe', 'hoe', 'sickle', 'watering-can', 'fishing-rod', 'sword',
]);

/**
 * Les capacités (docs/AUDIT.md, « Normalisation ») : une capacité est un champ des données, et l'objet qui l'a a tout ce qu'elle
 * demande. Une arme a sa planche et sa famille ; un outil qui frappe (`work`) a sa planche en main et sert à un travail ; ce qui
 * s'empile a son genre de tas, qui le prend et le compte, et le nomme (`pile`) ; un objet posé au sol a son image au sol et ses `dims` ;
 * tout objet a son métier (TRADE_TODO : ceux qui restent à dire). Les dessins qui manquent encore : DRAWINGS_TODO, avec leur raison.
 */
function validateCapabilities(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  for (const k of Object.keys(DRAWINGS_TODO)) if (!c.items[k]) err(`validate.ts DRAWINGS_TODO : '${k}' absent d'items.json`);
  for (const k of TRADE_TODO) if (!c.items[k] && !c.props[k]) err(`validate.ts TRADE_TODO : '${k}' n'est pas un objet du contenu`);
  // où sert chaque outil : une récolte, le bois, une transformation, le tracé d'un chantier
  const jobs = new Set<string>([c.wood.cut.tool, c.wood.split.maul, c.wood.split.wedge, c.wood.hew.tool]);
  for (const p of Object.values(c.props)) if (p.harvest) for (const t of [p.harvest.tool, ...Object.keys(p.harvest.also)]) if (t) jobs.add(t);
  for (const t of Object.values(c.transforms)) for (const tool of t.tools) jobs.add(tool);
  for (const p of Object.values(c.plans)) jobs.add(p.stake);
  // ce que prend chaque genre de tas
  const genreOf = new Map<string, string>();
  for (const [g, d] of Object.entries(c.piles)) {
    const key = 'item' in d.piece ? d.piece.item : 'prop' in d.piece ? d.piece.prop : undefined;
    if (key) genreOf.set(key, g);
    if (!d.count) err(`piles.json '${g}' : un tas compte ses pièces ('count': true)`);
    if ('prop' in d.piece && !c.props[d.piece.prop]?.take) err(`piles.json '${g}' : sa pièce '${d.piece.prop}' ne se prend pas ('take')`);
  }
  for (const [k, it] of Object.entries(c.items)) {
    const at = `items.json '${k}'`;
    const todo = DRAWINGS_TODO[k] ?? {};
    if (it.weapon && !cat.textures.has(it.weapon.image ?? `weapon-${k}`)) err(`${at} : une arme a sa planche '${it.weapon.image ?? `weapon-${k}`}' (pixel-artist)`);
    if (it.weapon && !c.combat.families[it.weapon.family]) err(`${at} : famille d'arme '${it.weapon.family}' absente de combat.json`);
    if (it.work && !todo.tool && !cat.textures.has(`tool-${k}`)) err(`${at} : un outil qui frappe ('work') a sa planche en main 'tool-${k}' (art/items/held.ts, pixel-artist), ou DRAWINGS_TODO`);
    if (it.work && !jobs.has(k)) err(`${at} : un outil qui frappe ('work') sert à un travail (une récolte, le bois, une transformation)`);
    if (it.kind === 'tool' && !jobs.has(k) && !todo.ground) err(`${at} : un outil qui ne sert à aucun travail`);
    if (it.pile && genreOf.get(k) !== it.pile) err(`${at} : 'pile' nomme '${it.pile}', dont la pièce n'est pas cet objet (piles.json)`);
    if (genreOf.has(k) && it.pile !== genreOf.get(k)) err(`${at} : le genre de tas '${genreOf.get(k)}' le prend ; il le nomme ('pile')`);
    if (!it.ground && !todo.ground) err(`${at} : un objet qu'on pose a son image au sol ('ground', pixel-artist), ou DRAWINGS_TODO`);
    if (it.ground && todo.ground) err(`validate.ts DRAWINGS_TODO : '${k}' a son image au sol, à retirer de la liste`);
    if (!it.dims) err(`${at} : un objet portable a ses dimensions ('dims') : le gabarit de son image au sol et sa physique de coup en découlent (world/heft.ts)`);
    if (it.work && todo.tool && cat.textures.has(`tool-${k}`)) err(`validate.ts DRAWINGS_TODO : '${k}' a sa planche en main, à retirer de la liste`);
  }
  for (const [k, d] of [...Object.entries(c.items), ...Object.entries(c.props)]) {
    if (!d.trade && !TRADE_TODO.has(k)) err(`'${k}' : son métier ('trade', CONCEPTION « Les matières »), ou TRADE_TODO`);
    if (d.trade && TRADE_TODO.has(k)) err(`validate.ts TRADE_TODO : '${k}' a son métier, à retirer de la liste`);
  }
  return errors;
}

/**
 * Le catalogue du mode construction (src/build/catalog.ts) a tout : chaque objet de props.json (sauf la pièce de bois, présente par
 * ses réglages) et d'items.json, chaque diamètre et aspect de la pièce de bois, chaque assemblage ; chaque entrée a un nom (la
 * recherche se fait sur le nom et la clé), une famille et une vignette dessinée. Un oubli est une erreur, sauf dans CATALOG_EXCLUDED.
 */
function validateCatalog(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  if (!c.buildCatalog) return errors;
  const { entries, looksOf } = c.buildCatalog;
  const ids = new Set(entries.map((e) => e.id));
  const want: [string, string][] = [
    ...Object.entries(c.props).filter(([, d]) => !d.wood).map(([k]) => [`prop:${k}`, `props.json '${k}'`] as [string, string]),
    ...Object.keys(c.items).map((k) => [`item:${k}`, `items.json '${k}'`] as [string, string]),
    ...Object.keys(c.wood.sizes).flatMap((size) => looksOf(size).map((look) => [`wood:${size}:${look}`, `wood.json '${size}' '${look}'`] as [string, string])),
    ...JointTypeSchema.options.map((j) => [`joint:${j}`, `assemblage '${j}'`] as [string, string]),
  ];
  for (const key of Object.keys(CATALOG_EXCLUDED)) if (!want.some(([id]) => id.endsWith(`:${key}`))) errors.push(`validate.ts CATALOG_EXCLUDED : '${key}' n'est pas un objet du contenu`);
  for (const [id, at] of want) {
    const key = id.slice(id.indexOf(':') + 1);
    if (!ids.has(id) && !CATALOG_EXCLUDED[key]) errors.push(`${at} : absent du catalogue du mode construction (src/build/catalog.ts), ou dans CATALOG_EXCLUDED avec sa raison`);
  }
  for (const e of entries) {
    if (!e.name.trim()) errors.push(`catalogue '${e.id}' : sans nom, introuvable par la recherche`);
    if (!cat.textures.has(e.thumb)) errors.push(`catalogue '${e.id}' : vignette '${e.thumb}' non dessinée`);
  }
  return errors;
}

/**
 * L'âge du bois (docs/CONCEPTION.md, « L'âge du bois ») : toute pièce de bois a ses trois âges. Un objet de bois (masse de matière
 * bois, ou la pièce de bois) est `aged`, sauf le bois brut de RAW_WOOD ; chaque image d'un objet `aged` (vues, tirages, formes) a son
 * patiné et son vieux ; chaque planche de la pièce de bois aussi.
 */
function validateAges(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const later = ['worn', 'old'] as const;
  const missing = (key: string) => later.filter((a) => !cat.textures.has(agedKey(key, a))).map((a) => agedKey(key, a));
  const isWood = (mass: unknown) => mass === 'wood' || (typeof mass === 'object' && mass !== null && 'matter' in mass && (mass as { matter: string }).matter === 'wood');
  for (const key of Object.keys(RAW_WOOD)) if (!c.props[key] && !c.items[key]) errors.push(`validate.ts RAW_WOOD : '${key}' absent de props.json et d'items.json`);
  const entries: [string, string, PropDef | ItemDef][] = [
    ...Object.entries(c.props).map(([k, d]) => [`props.json '${k}'`, k, d] as [string, string, PropDef]),
    ...Object.entries(c.items).map(([k, d]) => [`items.json '${k}'`, k, d] as [string, string, ItemDef]),
  ];
  // le bois se reconnaît à sa matière (la masse de bois) ou à son métier (le menuisier, le charpentier ne font que du bois), jamais à sa clé
  const woodTrades = ['joiner', 'carpenter'];
  for (const [at, key, d] of entries) {
    if ((isWood(d.mass) || woodTrades.includes(d.trade ?? '')) && !d.aged && !RAW_WOOD[key]) errors.push(`${at} : un objet de bois prend l'âge du bois ('"aged": true', ses images à trois âges), ou va dans RAW_WOOD avec sa raison`);
    if (d.aged && RAW_WOOD[key]) errors.push(`${at} : 'aged' et dans RAW_WOOD : l'un ou l'autre`);
    if (!d.aged) continue;
    const images = ageableImages({ ...d, image: 'image' in d ? d.image : undefined, ground: 'ground' in d ? d.ground : undefined, icon: 'icon' in d ? d.icon : undefined, variants: 'variants' in d ? d.variants : undefined });
    for (const img of images) {
      if (!cat.textures.has(img)) continue; // l'image neuve manquante est dite par validateViews
      const lost = missing(img);
      if (lost.length) errors.push(`${at} : '${img}' n'a pas ses trois âges (${lost.join(', ')} non tirées : le bois travaillé de son dessin doit être dans la rampe woodAges, art/palette.ts)`);
    }
  }
  for (const sheet of woodSheets()) {
    if (!cat.textures.has(sheet)) continue;
    const lost = missing(sheet);
    if (lost.length) errors.push(`wood.json : planche '${sheet}' sans ses trois âges (${lost.join(', ')})`);
  }
  return errors;
}

/**
 * Masses : tout objet qu'on prend, pose ou roule a une masse (items.json : un nombre ; props.json : un nombre, `"wood"` pour la
 * pièce de bois, `"stone"`, ou `{ "pile": genre }`) ; la pose « pousser » de Xéros existe.
 */
function validateMasses(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  for (const [key, it] of Object.entries(c.items)) if (it.mass === undefined) err(`items.json '${key}' : pas de masse ('mass', en kg) : tout objet possédable en a une`);
  for (const [key, p] of Object.entries(c.props)) {
    const at = `props.json '${key}'`;
    const weighs = !!p.take || !!p.roll;
    if (weighs && p.mass === undefined) err(`${at} : pas de masse ('mass') : tout objet qu'on prend ou qu'on roule en a une`);
    if (p.mass === 'stone' && p.dims.shape !== 'box') err(`${at} : 'mass: "stone"' est le calcul d'une pierre en boîte (dims.shape 'box')`);
    if (typeof p.mass === 'object' && 'pile' in p.mass && !c.piles[p.mass.pile]) err(`${at} : masse d'un tas '${p.mass.pile}' introuvable dans piles.json`);
    if (p.mass !== undefined && p.length && typeof p.mass !== 'number') err(`${at} : un objet à longueur mesurée a une masse saisie (celle de sa longueur neuve)`);
    if (p.mass !== undefined) {
      try {
        propMass(key, undefined, c);
      } catch (e) {
        err(`${at} : ${(e as Error).message}`);
      }
    }
    if (p.turn && !c.props[p.turn.into]) err(`${at} : 'turn' vers '${p.turn.into}' introuvable dans props.json`);
  }
  // la pose « pousser » de Xéros : une attente et une marche, dans les 4 directions
  for (const state of ['idle', 'walk']) {
    for (const dir of DIRECTIONS) {
      if (!cat.animations.get(PLAYER.skin)?.has(`push-${state}-${dir}`)) err(`Sprite '${PLAYER.skin}' : animation 'push-${state}-${dir}' manquante (pose pousser)`);
    }
  }
  return errors;
}

/**
 * Les matières : chaque masse par la matière en nomme une de matters.json, et un objet possédable pesé ainsi a ses dimensions ;
 * le bois vert de matters.json est celui de wood.json (une seule densité du bois). Une matière naturelle a la taille de la
 * seconde forme dessinée (validateViews) et ne pèse jamais plus que ce qu'on porte à sa plus grande taille, si elle se prend.
 */
function validateMatters(c: Content): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  if (c.matters.wood && c.matters.wood.density !== c.wood.density) err(`matters.json 'wood' : ${c.matters.wood.density} kg/m³, wood.json ${c.wood.density} (une seule densité du bois vert)`);
  const named = [...Object.entries(c.props).map(([k, d]) => [`props.json '${k}'`, d.mass] as const), ...Object.entries(c.items).map(([k, d]) => [`items.json '${k}'`, d.mass] as const)];
  for (const [at, m] of named) if (m && typeof m === 'object' && 'matter' in m && !c.matters[m.matter]) err(`${at} : matière '${m.matter}' absente de matters.json`);
  // les roches : une matière qui a sa roche la nomme dans rocks.json, une pierre qui dit sa roche est de la matière d'une roche
  for (const [k, m] of Object.entries(c.matters)) if (m.rock && !c.rocks[m.rock]) err(`matters.json '${k}' : roche '${m.rock}' absente de rocks.json`);
  for (const [at, m] of named) {
    if (!m || typeof m !== 'object' || !('matter' in m) || !m.rock) continue;
    if (!c.rocks[m.rock]) err(`${at} : roche '${m.rock}' absente de rocks.json`);
    else if (!c.matters[m.matter]?.rock) err(`${at} : la matière '${m.matter}' n'est pas une pierre (pas de roche dans matters.json), elle ne prend pas de roche`);
  }
  for (const [key, it] of Object.entries(c.items)) {
    if (it.mass && typeof it.mass === 'object' && !it.dims) err(`items.json '${key}' : une masse par la matière demande ses dimensions ('dims')`);
    if (it.natural && it.mass !== undefined && it.dims) {
      try {
        const big = itemMass(key, c, { form: 0, size: 100 + it.natural.vary });
        if (big > c.strength.carry) err(`items.json '${key}' : à sa plus grande taille (+${it.natural.vary} %), ${Math.round(big)} kg, plus que Xéros ne porte (${c.strength.carry} kg)`);
      } catch (e) {
        err(`items.json '${key}' : ${(e as Error).message}`);
      }
    }
  }
  for (const [key, p] of Object.entries(c.props)) {
    if (!p.natural || !p.take) continue;
    const big = propMass(key, undefined, c, undefined, { form: 0, size: 100 + p.natural.vary });
    if (big > c.strength.carry) err(`props.json '${key}' : à sa plus grande taille (+${p.natural.vary} %), ${Math.round(big)} kg, plus que Xéros ne porte (${c.strength.carry} kg)`);
  }
  return errors;
}

/**
 * Les transformations (transforms.json) : ce qui entre et ce qui sort existe (objet possédable, objet du monde, diamètre et aspect
 * de bois, matière), les outils sont des outils, le déchet laissé au sol est un objet du monde, chaque objet nommé dit son métier,
 * et tailler retire de la matière : la sortie à sa plus grande taille pèse au plus l'entrée à sa plus petite (une matière naturelle
 * varie de ± `vary` %).
 */
function validateTransforms(c: Content): string[] {
  const errors: string[] = [];
  const cat: MassCatalog = c;
  for (const [id, t] of Object.entries(c.transforms)) {
    const at = `transforms.json '${id}'`;
    const err = (msg: string) => errors.push(`${at} : ${msg}`);
    const known = (part: (typeof t.inputs)[number], side: string): boolean => {
      if (part.item && !c.items[part.item]) return err(`${side} '${part.item}' absente d'items.json`), false;
      if (part.prop && !c.props[part.prop]) return err(`${side} '${part.prop}' absente de props.json`), false;
      if (part.raw && !c.matters[part.raw]) return err(`${side} : matière '${part.raw}' absente de matters.json`), false;
      if (part.raw && side === 'sortie') return err("une matière prise au poste ('raw') n'est qu'une entrée"), false;
      if (part.wood) {
        const size = c.wood.sizes[part.wood.size];
        if (!size) return err(`${side} : diamètre de bois '${part.wood.size}' absent de wood.json`), false;
        const look = lookOf({ shape: part.wood.shape, hewn: part.wood.hewn });
        if (!size.looks[look]) return err(`${side} : le diamètre '${part.wood.size}' n'a pas d'aspect '${look}' (wood.json)`), false;
      }
      const def = part.item ? c.items[part.item] : part.prop ? c.props[part.prop] : undefined;
      if (def && !def.trade) err(`${side} '${part.item ?? part.prop}' : son métier n'est pas dit ('trade')`);
      return true;
    };
    const okIn = t.inputs.map((p) => known(p, 'entrée')).every(Boolean);
    const okOut = t.outputs.map((p) => known(p, 'sortie')).every(Boolean);
    if (!t.inputs.some((p) => !p.raw) && !t.inputs.some((p) => p.raw)) err('aucune entrée');
    for (const tool of t.tools) if (c.items[tool]?.kind !== 'tool') err(`outil '${tool}' absent d'items.json ou qui n'est pas un outil`);
    if (t.waste?.prop && !c.props[t.waste.prop]) err(`déchet '${t.waste.prop}' absent de props.json`);
    if (!okIn || !okOut) continue;
    // la plus petite entrée, la plus grande sortie
    const vary = (p: (typeof t.inputs)[number], sign: 1 | -1) => {
      const d = p.item ? c.items[p.item] : p.prop ? c.props[p.prop] : undefined;
      return d?.natural ? naturalFactor({ form: 0, size: 100 + sign * d.natural.vary }) : 1;
    };
    try {
      const input = t.inputs.reduce((sum, p) => sum + partMass(p, cat) * p.count * vary(p, -1), 0);
      const output = t.outputs.reduce((sum, p) => sum + partMass(p, cat) * p.count * vary(p, 1), 0);
      if (output > input + 1e-6) {
        const names = (parts: typeof t.inputs) => parts.map((p) => partName(p, c)).join(' + ');
        err(`la sortie (${names(t.outputs)}, jusqu'à ${Math.round(output * 10) / 10} kg) pèse plus que l'entrée (${names(t.inputs)}, dès ${Math.round(input * 10) / 10} kg) : tailler retire de la matière`);
      }
    } catch (e) {
      err((e as Error).message);
    }
  }
  return errors;
}

/**
 * Les plans du bac à sable (src/content/plans/<nom>.json) : un nom de fichier en kebab-case, et chaque pièce existe dans le contenu,
 * dans un sens qu'elle a, sur la grille (`planProblems`, world/build.ts).
 */
export function validateBuildPlans(plans: Record<string, BuildPlan>): string[] {
  const errors: string[] = [];
  for (const [key, plan] of Object.entries(plans)) {
    if (!KEBAB_CASE.test(key)) errors.push(`plans/${key}.json : le nom doit être en kebab-case (minuscules sans accent, chiffres, tirets)`);
    for (const p of planProblems(plan)) errors.push(`plans/${key}.json : ${p}`);
  }
  return errors;
}

/** Renvoie la liste des problèmes trouvés (vide si tout va bien). */
/**
 * Le tableau de bord du travail (docs/CONCEPTION.md, « Le travail ») : la durée de chaque travail du jeu pour Xéros d'aujourd'hui,
 * calculée de ses coups (world/workPlan.ts), affichée par `npm run check` sans être imposée.
 */
export function workDurations(): { name: string; strokes: number; pauses: number; minutes: number; ceiling: number }[] {
  const { swinger, max } = swingerOf('xeros');
  return gameJobs().map(({ name, job }) => {
    const p = planOf(job, swinger, max);
    return { name, strokes: p.strokes, pauses: p.pauses, minutes: p.seconds / 60, ceiling: p.ceiling };
  });
}

/** Les points de calage du travail (work.json, `calibration`) : chacun doit tenir sa durée, à `tolerance` près. */
function validateWork(c: Pick<Content, 'work' | 'items' | 'props' | 'strength' | 'wood'>, cat: Catalog): string[] {
  const errors: string[] = [];
  if (c.strength.swing.humanMax < c.strength.swing.torque) errors.push("strength.json swing : 'humanMax' sous le couple de Xéros");
  for (const r of Object.values(c.work.references)) if (r.torque > c.strength.swing.humanMax) errors.push(`work.json references : un couple (${r.torque}) au-delà du plafond humain`);
  // les outils du bois (wood.json : couper, fendre, équarrir) se travaillent au coup ; les coups nommés existent
  for (const k of [c.wood.cut.tool, c.wood.split.maul, c.wood.hew.tool]) if (!c.items[k]?.work) errors.push(`items.json '${k}' : un outil au travail sans 'work'`);
  for (const [kind, st] of Object.entries(c.work.jobs)) if (!c.work.strokes[st]) errors.push(`work.json jobs '${kind}' : coup '${st}' absent de 'strokes'`);
  for (const [k, it] of Object.entries(c.items))
    for (const [kind, st] of Object.entries(it.work?.strokes ?? {})) {
      if (!(kind in c.work.jobs)) errors.push(`items.json '${k}' work.strokes : genre de travail '${kind}' inconnu (jobs de work.json)`);
      if (!c.work.strokes[st]) errors.push(`items.json '${k}' work.strokes : coup '${st}' absent de work.json`);
    }
  for (const [k, p] of Object.entries(c.props)) {
    const h = p.harvest;
    if (h?.work && !h.tool) errors.push(`props.json '${k}' : une récolte travaillée au coup ('work') demande un outil`);
    for (const t of h?.work ? [h.tool, ...Object.keys(h.also)] : []) if (t && !c.items[t]?.work) errors.push(`props.json '${k}' : l'outil '${t}' n'a pas de 'work' (items.json)`);
  }
  if (errors.length) return errors;
  // les étapes visibles : croissantes, et dessinées pour chaque vue de l'objet (son image et sa vue `-left`, s'il en a une)
  for (const [k, p] of Object.entries(c.props)) {
    const st = p.harvest?.stages;
    if (!st) continue;
    if (!p.harvest!.work) errors.push(`props.json '${k}' : des étapes ('stages') sans matière ('work')`);
    if (st.some((t, i) => i > 0 && t <= st[i - 1])) errors.push(`props.json '${k}' : les étapes ('stages') doivent croître`);
    // l'arbre debout se frappe des deux côtés : ses étapes pour la gauche aussi (`<image>-left-stage-<n>`)
    for (const base of [p.image, ...(cat.textures.has(`${p.image}-left`) || p.harvest!.fall ? [`${p.image}-left`] : [])])
      st.forEach((_, i) => {
        if (!cat.textures.has(`${base}-stage-${i + 1}`)) errors.push(`props.json '${k}' : image d'étape '${base}-stage-${i + 1}' introuvable (pixel-artist)`);
      });
  }
  for (const cal of c.work.calibration) {
    if (cal.who !== 'xeros' && !c.work.references[cal.who]) {
      errors.push(`work.json, calage « ${cal.name} » : '${cal.who}' n'est ni xeros ni une référence`);
      continue;
    }
    const { swinger, max } = swingerOf(cal.who);
    const minutes = planOf(calibrationJob(cal), swinger, max).seconds / 60;
    if (Math.abs(minutes - cal.minutes) > cal.minutes * c.work.tolerance)
      errors.push(`work.json, calage « ${cal.name} » : ${minutes.toFixed(1)} min calculées pour ${cal.minutes} min (à ${Math.round(c.work.tolerance * 100)} % près)`);
  }
  return errors;
}

export function validateContent(c: Content, cat: Catalog): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  const addAll = (msgs: string[]) => errors.push(...msgs);

  // le travail : les outils, les récoltes au coup, les points de calage
  addAll(validateWork(c, cat));

  // le temps : la plaquette du cadran (art/ui/clock.ts) a la place de cinq crans ; le palier de ?dieu au-dessus de ceux du joueur
  if (c.time && c.time.speeds.length > 5) err(`time.json : ${c.time.speeds.length} paliers, la plaquette du cadran n'a que cinq crans`);
  if (c.time && c.time.dieuSpeed <= Math.max(...c.time.speeds)) err(`time.json : 'dieuSpeed' (${c.time.dieuSpeed}) doit dépasser les paliers du joueur`);

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
      if (g.phases && g.phases.length !== poses.length) err(`gestures.json '${name}' ${dir} : ${g.phases.length} temps (phases) pour ${poses.length} poses`);
      if (g.phases && g.phases[g.impact] !== 'impact') err(`gestures.json '${name}' : l'image d'impact ${g.impact} n'est pas le temps 'impact' de phases`);
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
    // un morceau de mur qui se raccorde (le solin) : couché à quatre vues (est-ouest, nord-sud), plus long qu'épais
    if (p.wall && (p.views !== 'four' || !p.lying || p.dims.shape !== 'box' || p.dims.w <= p.dims.d)) err(`props.json '${key}' : 'wall' demande un morceau couché à quatre vues ('four', 'lying'), une boîte plus longue qu'épaisse`);
  }

  // Gabarit : taille de chaque objet d'après ses dimensions réelles
  addAll(validateGabarit(c, cat));
  addAll(validateViews(c, cat));

  // Ce qui naît d'une chute : sa version couchée vers la gauche
  addAll(validateFallLeft(c, cat));

  // Objets possédables
  for (const [key, it] of Object.entries(c.items)) {
    if (it.hold) addAll(validateHold(`items.json '${key}'`, it.hold, it.hands, cat));
    if (!KEBAB_CASE.test(key)) err(`items.json '${key}' : la clé doit être un identifiant anglais en kebab-case`);
    if (!cat.textures.has(it.icon)) err(`items.json '${key}' : icône '${it.icon}' non dessinée`);
    if (it.ground && !cat.textures.has(it.ground)) err(`items.json '${key}' : image au sol '${it.ground}' non dessinée`);
  }

  // Masses, roulement, pose pousser
  addAll(validateMasses(c, cat));

  // Les matières (densités, matière naturelle) et les transformations (entrées, sorties, outils, déchet, métier, masses)
  addAll(validateMatters(c));
  addAll(validateTransforms(c));

  // Le bois : planches de parties de chaque diamètre et aspect, icônes, vues portées, outils, grille
  addAll(validateWood(c, cat));
  addAll(validateAges(c, cat));

  // Le combat : attaques, familles et postures, armes, cibles
  addAll(validateCombat(c, cat));

  // Le catalogue du mode construction : tout y est, avec un nom et une vignette
  addAll(validateCatalog(c, cat));

  // Les capacités : chacune a tout ce qu'elle demande
  addAll(validateCapabilities(c, cat));

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
