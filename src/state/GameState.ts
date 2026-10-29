// L'état de la partie : tout ce qui change pendant qu'on joue (inventaire, monde modifié, objets au sol).
// Un objet à nous, décrit avec Zod et indépendant de Phaser : la sauvegarde consistera à l'écrire.
// Les cartes décrivent le monde au début de la partie ; GameState dit seulement ce qui a changé.

import { z } from 'zod';
import type { ItemDef } from '../content/types';

const id = z.string().min(1);

/** Nombre de cases de la barre d'objets : c'est tout l'inventaire pour l'instant. */
export const SLOTS = 8;

/** Une case occupée : `count` exemplaires de l'objet `item` (clé de items.json). */
export const SlotSchema = z.strictObject({ item: id, count: z.number().int().positive() });

/**
 * Un objet de carte changé : il est devenu `type` (clé de props.json), posé en (x, y) (coin bas gauche) ; `type` absent = disparu.
 * `flip` : image retournée (ce qui est tombé vers la gauche).
 */
export const WorldChangeSchema = z.strictObject({ type: id.optional(), x: z.number(), y: z.number(), flip: z.boolean().optional() });

/** Un objet né pendant la partie (une pièce de l'arbre couché) : identifiant propre, type de props.json, coin bas gauche, image retournée. */
export const SpawnedSchema = z.strictObject({ id: z.number().int().nonnegative(), type: id, x: z.number(), y: z.number(), flip: z.boolean().optional() });

/** Un objet possédable posé au sol : (x, y) = son point au sol. */
export const GroundItemSchema = z.strictObject({ id: z.number().int().nonnegative(), item: id, x: z.number(), y: z.number() });

/** Ce qui a changé sur une carte. */
export const MapStateSchema = z.strictObject({
  /** Par identifiant d'objet Tiled. */
  changes: z.record(z.string(), WorldChangeSchema),
  ground: z.array(GroundItemSchema),
  /** Objets nés sur cette carte, tels qu'ils sont maintenant (un objet né récolté change ici, ou disparaît de la liste). */
  spawned: z.array(SpawnedSchema),
});

export const GameStateSchema = z.strictObject({
  /** Cases de la barre, `null` = vide. */
  inventory: z.array(SlotSchema.nullable()).length(SLOTS),
  /** Case active : l'objet en main. */
  active: z.number().int().min(0).max(SLOTS - 1),
  /** Par identifiant de carte. */
  maps: z.record(id, MapStateSchema),
  /** Prochain identifiant d'objet au sol (unique dans toute la partie). */
  nextGroundId: z.number().int().nonnegative(),
  /** Prochain identifiant d'objet né (unique dans toute la partie, distinct des identifiants Tiled). */
  nextSpawnId: z.number().int().nonnegative(),
});

export type Slot = z.infer<typeof SlotSchema>;
export type WorldChange = z.infer<typeof WorldChangeSchema>;
export type GroundItem = z.infer<typeof GroundItemSchema>;
export type Spawned = z.infer<typeof SpawnedSchema>;
export type MapState = z.infer<typeof MapStateSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

/** Une partie qui commence : inventaire vide, monde tel que les cartes le décrivent. */
export function newGame(): GameState {
  return { inventory: Array.from({ length: SLOTS }, () => null), active: 0, maps: {}, nextGroundId: 0, nextSpawnId: 0 };
}

/** Ce qui a changé sur une carte (créé vide au premier besoin). */
export function mapState(s: GameState, mapId: string): MapState {
  return (s.maps[mapId] ??= { changes: {}, ground: [], spawned: [] });
}

/** Objet en main (case active), ou undefined. */
export function held(s: GameState): Slot | undefined {
  return s.inventory[s.active] ?? undefined;
}

/**
 * Range un exemplaire de `item` : d'abord sur une pile du même objet qui a de la place, sinon dans la première case vide.
 * Renvoie false si l'inventaire est plein (rien n'est changé).
 */
export function addItem(s: GameState, item: string, def: ItemDef): boolean {
  const pile = s.inventory.find((c) => c?.item === item && c.count < def.stack);
  if (pile) {
    pile.count++;
    return true;
  }
  const free = s.inventory.indexOf(null);
  if (free < 0) return false;
  s.inventory[free] = { item, count: 1 };
  return true;
}

/** Note qu'un objet de carte est devenu un autre (ou a disparu, `type` absent). */
export function changeObject(s: GameState, mapId: string, objectId: number, change: WorldChange): void {
  mapState(s, mapId).changes[objectId] = change;
}

/** Pose un objet possédable au sol ; renvoie ce qui a été posé. */
export function dropItem(s: GameState, mapId: string, item: string, x: number, y: number): GroundItem {
  const g = { id: s.nextGroundId++, item, x, y };
  mapState(s, mapId).ground.push(g);
  return g;
}

/** Retire un objet du sol (ramassé). */
export function removeGroundItem(s: GameState, mapId: string, groundId: number): void {
  const m = mapState(s, mapId);
  m.ground = m.ground.filter((g) => g.id !== groundId);
}

/** Fait naître un objet sur une carte ; renvoie ce qui a été noté. */
export function spawnObject(s: GameState, mapId: string, type: string, x: number, y: number, flip: boolean): Spawned {
  const o = { id: s.nextSpawnId++, type, x, y, ...(flip ? { flip } : {}) };
  mapState(s, mapId).spawned.push(o);
  return o;
}

/** Un objet né a changé : il devient `type` en (x, y), ou disparaît (`type` absent). */
export function changeSpawned(s: GameState, mapId: string, spawnId: number, change: WorldChange): void {
  const m = mapState(s, mapId);
  const i = m.spawned.findIndex((o) => o.id === spawnId);
  if (i < 0) return;
  if (!change.type) m.spawned.splice(i, 1);
  else m.spawned[i] = { id: spawnId, type: change.type, x: change.x, y: change.y, ...(change.flip ? { flip: true } : {}) };
}
