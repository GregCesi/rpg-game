// L'état de la partie : tout ce qui change pendant qu'on joue (les mains, monde modifié, objets au sol).
// Un objet à nous, décrit avec Zod et indépendant de Phaser : la sauvegarde consistera à l'écrire.
// Les cartes décrivent le monde au début de la partie ; GameState dit seulement ce qui a changé.

import { z } from 'zod';

const id = z.string().min(1);

/**
 * Ce que tient une main : un objet possédable (`item`, clé de items.json), ou un objet du monde pris sur une carte
 * (`prop`, clé de props.json : la bille ; `flip` : sa version couchée vers la gauche). Pas de besace : les mains sont tout l'inventaire.
 */
export const HeldSchema = z.union([z.strictObject({ item: id }), z.strictObject({ prop: id, flip: z.boolean().optional() })]);

/** Une main : 0 = la gauche, 1 = la droite. */
export const HandSchema = z.union([z.literal(0), z.literal(1)]);

/**
 * Un objet de carte changé : il est devenu `type` (clé de props.json), posé en (x, y) (coin bas gauche) ; `type` absent = disparu.
 * `flip` : image retournée (ce qui est tombé vers la gauche).
 */
export const WorldChangeSchema = z.strictObject({ type: id.optional(), x: z.number(), y: z.number(), flip: z.boolean().optional() });

/** Place d'un objet né dans la chaîne de ce qui est né avec lui (les pièces de l'arbre couché, bout à bout). */
export const ChainSchema = z.strictObject({
  /** Identifiant du premier objet né de la chaîne. */
  group: z.number().int().nonnegative(),
  index: z.number().int().nonnegative(),
  size: z.number().int().positive(),
});

/**
 * Un objet né pendant la partie (une pièce de l'arbre couché) : identifiant propre, type de props.json, coin bas gauche,
 * image retournée, place dans sa chaîne.
 */
export const SpawnedSchema = z.strictObject({
  id: z.number().int().nonnegative(),
  type: id,
  x: z.number(),
  y: z.number(),
  flip: z.boolean().optional(),
  chain: ChainSchema.optional(),
  /** Coups déjà reçus (profondeur de l'encoche d'une pièce de tronc) : l'entaille se retrouve au retour sur la carte. */
  hits: z.number().int().positive().optional(),
});

/** Un objet possédable posé au sol : (x, y) = son point au sol. */
export const GroundItemSchema = z.strictObject({ id: z.number().int().nonnegative(), item: id, x: z.number(), y: z.number() });

/**
 * Un tas posé pendant la partie : un seul objet du monde, son genre (`pile`, clé de piles.json), son point au sol (x, y :
 * l'origine du repère de ses places) et ses places prises (`places`, identifiants de piles.json).
 */
export const PileSchema = z.strictObject({
  id: z.number().int().nonnegative(),
  pile: id,
  x: z.number(),
  y: z.number(),
  places: z.array(id).min(1),
});

/** Ce qui a changé sur une carte. */
export const MapStateSchema = z.strictObject({
  /** Par identifiant d'objet Tiled. */
  changes: z.record(z.string(), WorldChangeSchema),
  ground: z.array(GroundItemSchema),
  /** Objets nés sur cette carte, tels qu'ils sont maintenant (un objet né récolté change ici, ou disparaît de la liste). */
  spawned: z.array(SpawnedSchema),
  /** Tas posés sur cette carte ; un tas vidé disparaît de la liste. */
  piles: z.array(PileSchema),
});

export const GameStateSchema = z.strictObject({
  /** Ce que tient chaque main (gauche, droite), `null` = libre. */
  hands: z.tuple([HeldSchema.nullable(), HeldSchema.nullable()]),
  /** Ce que Xéros tient à deux mains (la hache, une bille) ; les deux cases de `hands` sont alors libres. */
  both: HeldSchema.nullable(),
  /** Main active : celle qui utilise (Espace) et qui lâche (Q). */
  active: HandSchema,
  /** Par identifiant de carte. */
  maps: z.record(id, MapStateSchema),
  /** Prochain identifiant d'objet au sol (unique dans toute la partie). */
  nextGroundId: z.number().int().nonnegative(),
  /** Prochain identifiant d'objet né (unique dans toute la partie, distinct des identifiants Tiled). */
  nextSpawnId: z.number().int().nonnegative(),
  /** Prochain identifiant de tas (unique dans toute la partie). */
  nextPileId: z.number().int().nonnegative(),
});

export type Held = z.infer<typeof HeldSchema>;
export type Hand = z.infer<typeof HandSchema>;
export type WorldChange = z.infer<typeof WorldChangeSchema>;
export type GroundItem = z.infer<typeof GroundItemSchema>;
export type Spawned = z.infer<typeof SpawnedSchema>;
export type Chain = z.infer<typeof ChainSchema>;
export type Pile = z.infer<typeof PileSchema>;
export type MapState = z.infer<typeof MapStateSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

/** Une partie qui commence : mains vides, monde tel que les cartes le décrivent. */
export function newGame(): GameState {
  return { hands: [null, null], both: null, active: 1, maps: {}, nextGroundId: 0, nextSpawnId: 0, nextPileId: 0 };
}

/** Ce qui a changé sur une carte (créé vide au premier besoin). */
export function mapState(s: GameState, mapId: string): MapState {
  return (s.maps[mapId] ??= { changes: {}, ground: [], spawned: [], piles: [] });
}

/** Ce que tient la main active (ou les deux mains), ou undefined. */
export function held(s: GameState): Held | undefined {
  return s.both ?? s.hands[s.active] ?? undefined;
}

/** L'objet possédable que tient la main active (ou les deux mains) : ce qu'Espace utilise. Un objet du monde porté n'en est pas un. */
export function heldItem(s: GameState): string | undefined {
  const h = held(s);
  return h && 'item' in h ? h.item : undefined;
}

/** Les mains peuvent prendre un objet qui demande `hands` mains : les deux libres pour 2, une libre pour 1. */
export function canTake(s: GameState, hands: 1 | 2): boolean {
  if (s.both) return false;
  return hands === 2 ? !s.hands[0] && !s.hands[1] : !s.hands[0] || !s.hands[1];
}

/**
 * Prend un objet : à deux mains si `hands` = 2, sinon dans la main active si elle est libre, ou dans l'autre.
 * Renvoie false si les mains ne sont pas libres (rien n'est changé).
 */
export function take(s: GameState, what: Held, hands: 1 | 2): boolean {
  if (!canTake(s, hands)) return false;
  if (hands === 2) s.both = what;
  else s.hands[s.hands[s.active] ? ((1 - s.active) as Hand) : s.active] = what;
  return true;
}

/** Lâche ce que tient la main active (ou les deux mains) ; renvoie ce qui a été lâché. */
export function release(s: GameState): Held | undefined {
  const what = held(s);
  if (s.both) s.both = null;
  else s.hands[s.active] = null;
  return what;
}

/** Change de main active. */
export function switchHand(s: GameState): void {
  s.active = (1 - s.active) as Hand;
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
export function spawnObject(s: GameState, mapId: string, type: string, x: number, y: number, flip: boolean, chain?: Chain): Spawned {
  const o = { id: s.nextSpawnId++, type, x, y, ...(flip ? { flip } : {}), ...(chain ? { chain } : {}) };
  mapState(s, mapId).spawned.push(o);
  return o;
}

/** Un objet né a changé : il devient `type` en (x, y), ou disparaît (`type` absent). Il garde sa place dans sa chaîne. */
export function changeSpawned(s: GameState, mapId: string, spawnId: number, change: WorldChange): void {
  const m = mapState(s, mapId);
  const i = m.spawned.findIndex((o) => o.id === spawnId);
  if (i < 0) return;
  if (!change.type) m.spawned.splice(i, 1);
  else {
    // nouvel objet : sa place dans la chaîne reste, ses coups repartent de zéro
    const chain = m.spawned[i].chain;
    m.spawned[i] = { id: spawnId, type: change.type, x: change.x, y: change.y, ...(change.flip ? { flip: true } : {}), ...(chain ? { chain } : {}) };
  }
}

/** Coups reçus par un objet né (profondeur d'une encoche). */
export function setSpawnedHits(s: GameState, mapId: string, spawnId: number, hits: number): void {
  const o = mapState(s, mapId).spawned.find((x) => x.id === spawnId);
  if (o) o.hits = hits;
}

/** Commence un tas d'une pièce, posée à la place `place` ; renvoie ce qui a été noté. */
export function startPile(s: GameState, mapId: string, pile: string, x: number, y: number, place: string): Pile {
  const p = { id: s.nextPileId++, pile, x, y, places: [place] };
  mapState(s, mapId).piles.push(p);
  return p;
}

/** Une pièce est posée à la place `place` d'un tas. */
export function fillPlace(s: GameState, mapId: string, pileId: number, place: string): void {
  const p = mapState(s, mapId).piles.find((q) => q.id === pileId);
  if (p && !p.places.includes(place)) p.places.push(place);
}

/** La pièce de la place `place` est reprise ; sans pièce, le tas disparaît de la carte. */
export function emptyPlace(s: GameState, mapId: string, pileId: number, place: string): void {
  const m = mapState(s, mapId);
  const i = m.piles.findIndex((q) => q.id === pileId);
  if (i < 0) return;
  m.piles[i].places = m.piles[i].places.filter((q) => q !== place);
  if (!m.piles[i].places.length) m.piles.splice(i, 1);
}
