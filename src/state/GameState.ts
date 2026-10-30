// L'état de la partie : tout ce qui change pendant qu'on joue (les mains, monde modifié, objets au sol).
// Un objet à nous, décrit avec Zod et indépendant de Phaser : la sauvegarde l'écrit tel quel (save.ts).
// Les cartes décrivent le monde au début de la partie ; GameState dit seulement ce qui a changé.

import { z } from 'zod';
import { stamina } from '../content';
import { CornerSchema, PileWoodSchema, WoodPieceSchema, type WoodPiece } from '../content/types';
import { turnedWood } from '../world/woodShape';

const id = z.string().min(1);

/** Longueur restante, en centimètres, d'une quantité mesurée (le rouleau de corde, `length` de props.json). */
const length = z.number().int().nonnegative().optional();

/**
 * Ce que tient une main : un objet possédable (`item`, clé de items.json), ou un objet du monde pris sur une carte
 * (`prop`, clé de props.json ; `flip` : sa version couchée vers la gauche ; `turned` : tournée nord-sud, R, pour le tas qu'elle
 * commencera (le fagot) ; `length` : sa longueur restante, le rouleau de corde ; `wood` : les réglages d'une pièce de bois, dont
 * le sens où elle sera posée, que R change). Pas de besace : les mains sont tout l'inventaire.
 */
export const HeldSchema = z.union([
  z.strictObject({ item: id }),
  z.strictObject({ prop: id, flip: z.boolean().optional(), turned: z.boolean().optional(), length, wood: WoodPieceSchema.optional() }),
]);

/** Une main : 0 = la gauche, 1 = la droite. */
export const HandSchema = z.union([z.literal(0), z.literal(1)]);

/**
 * Un objet de carte changé : il est devenu `type` (clé de props.json), posé en (x, y) (coin bas gauche) ; `type` absent = disparu.
 * `flip` : image retournée (ce qui est tombé vers la gauche) ; `length` : longueur restante de ce qu'il est ou porte (le
 * rouleau, le billot qui porte le rouleau).
 */
export const WorldChangeSchema = z.strictObject({
  type: id.optional(),
  x: z.number(),
  y: z.number(),
  flip: z.boolean().optional(),
  length,
  /** Les réglages de la pièce de bois qu'il est (diamètre, longueur, forme, faces, sens, coupe commencée, coin planté). */
  wood: WoodPieceSchema.optional(),
});

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
  /** Longueur restante de ce qu'il est ou porte (le rouleau posé, le billot qui porte le rouleau). */
  length,
  /** Les réglages de la pièce de bois qu'il est. */
  wood: WoodPieceSchema.optional(),
});

/** Un objet possédable posé au sol : (x, y) = son point au sol. */
export const GroundItemSchema = z.strictObject({ id: z.number().int().nonnegative(), item: id, x: z.number(), y: z.number() });

/**
 * Un tas posé pendant la partie : un seul objet du monde, ce qu'il entrepose, son point au sol (x, y : l'origine du repère de
 * ses places), ses places prises (`places`), son sens (`turned` : nord-sud, la forme `turned`), fixé par sa première pièce, et
 * son lien (`tie` : le lien qui le ceinture par-dessous, `tie` du genre dans piles.json). Ce qu'il entrepose : un genre écrit
 * (`pile`, clé de piles.json : branches, fagots), ou une pièce de bois (`wood` : diamètre, forme, longueur, faces ; sa forme se
 * calcule, world/woodPile.ts) ; l'un ou l'autre. Un tas lié peut n'avoir aucune pièce : le lien seul, par terre.
 */
export const PileSchema = z
  .strictObject({
    id: z.number().int().nonnegative(),
    pile: id.optional(),
    wood: PileWoodSchema.optional(),
    x: z.number(),
    y: z.number(),
    places: z.array(id),
    turned: z.boolean().optional(),
    tie: z.boolean().optional(),
  })
  .refine((p) => p.places.length > 0 || p.tie, { message: 'un tas sans pièce ni lien' })
  .refine((p) => !p.pile !== !p.wood, { message: "un tas entrepose un genre ('pile') ou une pièce de bois ('wood'), l'un ou l'autre" });

/**
 * Un chantier posé sur une carte : le plan (`plan`, clé de plans.json), le point au sol du piquet nord-ouest (x, y), les coins où
 * un piquet est planté (`stakes`), s'il est né (`born` : les quatre piquets plantés, l'emprise libre) et les pièces posées
 * (`placed` : place du plan -> identifiant de l'objet né qui la montre). Avant sa naissance, le tracé n'a que ses piquets.
 */
export const SiteSchema = z.strictObject({
  id: z.number().int().nonnegative(),
  plan: id,
  x: z.number(),
  y: z.number(),
  stakes: z.array(CornerSchema),
  born: z.boolean(),
  placed: z.record(id, z.number().int().nonnegative()),
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
  /** Chantiers posés sur cette carte (un tracé de piquets, ou un chantier né). */
  sites: z.array(SiteSchema),
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
  /** Endurance de Xéros : la fatigue de la journée, de 0 (épuisé) au maximum de stamina.json (le sommeil la remplit). */
  stamina: z.number().nonnegative(),
  /** Numéro du jour : 1 au départ, +1 à chaque nuit (il servira au temps et aux saisons). */
  day: z.number().int().positive(),
  /** Les plans que Xéros connaît (clés de plans.json) : appris sur la planchette de la mère. */
  knownPlans: z.array(id),
  /** Prochain identifiant de chantier (unique dans toute la partie). */
  nextSiteId: z.number().int().nonnegative(),
});

export type Held = z.infer<typeof HeldSchema>;
export type Hand = z.infer<typeof HandSchema>;
export type WorldChange = z.infer<typeof WorldChangeSchema>;
export type GroundItem = z.infer<typeof GroundItemSchema>;
export type Spawned = z.infer<typeof SpawnedSchema>;
export type Chain = z.infer<typeof ChainSchema>;
export type Pile = z.infer<typeof PileSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type MapState = z.infer<typeof MapStateSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

/**
 * Compteur de changements, hors du schéma : chaque fonction qui modifie la partie l'avance, et la sauvegarde automatique
 * (systems/autosave.ts) écrit la partie quand il a bougé. Ne jamais modifier GameState sans passer par ces fonctions.
 */
let revision = 0;

/** Numéro du dernier changement de la partie. */
export function revisionOf(): number {
  return revision;
}

/** Une partie qui commence : mains vides, monde tel que les cartes le décrivent. */
export function newGame(): GameState {
  return { hands: [null, null], both: null, active: 1, maps: {}, nextGroundId: 0, nextSpawnId: 0, nextPileId: 0, stamina: stamina.max, day: 1, knownPlans: [], nextSiteId: 0 };
}

/** Ce qui a changé sur une carte (créé vide au premier besoin). */
export function mapState(s: GameState, mapId: string): MapState {
  return (s.maps[mapId] ??= { changes: {}, ground: [], spawned: [], piles: [], sites: [] });
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
  revision++;
  return true;
}

/**
 * La règle unique de la main active : quand elle se vide et que l'autre main tient un objet, la main active passe sur l'autre
 * (comme Tab). Appelée par chaque fonction qui vide une main (`release`, `clearHeld`) : poser, lâcher, planter un piquet ou le
 * coin, utiliser un lien, tout geste qui consomme ou libère l'objet tenu y passe. Les deux mains vides : rien ne change.
 */
function followHeld(s: GameState): void {
  if (!s.both && !s.hands[s.active] && s.hands[1 - s.active]) s.active = (1 - s.active) as Hand;
}

/** Lâche ce que tient la main active (ou les deux mains) ; renvoie ce qui a été lâché. */
export function release(s: GameState): Held | undefined {
  const what = held(s);
  if (s.both) s.both = null;
  else s.hands[s.active] = null;
  followHeld(s);
  revision++;
  return what;
}

/**
 * Tourne l'objet du monde que tient Xéros entre est-ouest et nord-sud : la pièce de bois change de sens d'un quart de tour dans le
 * sens des aiguilles d'une montre (la face debout d'un quartier suit, `turnedWood`), le reste (le fagot)
 * est noté tourné ; sans objet du monde en main, rien.
 */
export function turnHeld(s: GameState): void {
  const h = held(s);
  if (!h || !('prop' in h)) return;
  if (h.wood) h.wood = turnedWood(h.wood);
  else if (h.turned) delete h.turned;
  else h.turned = true;
  revision++;
}

/** L'endurance de Xéros vaut `value` (bornée de 0 au maximum). */
export function setStamina(s: GameState, value: number): void {
  s.stamina = Math.min(stamina.max, Math.max(0, value));
  revision++;
}

/** Une nuit de sommeil : l'endurance est pleine, le jour suivant commence. */
export function sleep(s: GameState): void {
  s.stamina = stamina.max;
  s.day++;
  revision++;
}

/** Ce que tient la main `slot` devient `what` (la branche taillée devient un piquet, dans la même main). */
export function replaceHeld(s: GameState, slot: Hand, what: Held): void {
  s.hands[slot] = what;
  revision++;
}

/** Change de main active. */
export function switchHand(s: GameState): void {
  s.active = (1 - s.active) as Hand;
  revision++;
}

/** Note qu'un objet de carte est devenu un autre (ou a disparu, `type` absent). */
export function changeObject(s: GameState, mapId: string, objectId: number, change: WorldChange): void {
  mapState(s, mapId).changes[objectId] = change;
  revision++;
}

/** Pose un objet possédable au sol ; renvoie ce qui a été posé. */
export function dropItem(s: GameState, mapId: string, item: string, x: number, y: number): GroundItem {
  const g = { id: s.nextGroundId++, item, x, y };
  mapState(s, mapId).ground.push(g);
  revision++;
  return g;
}

/** Retire un objet du sol (ramassé). */
export function removeGroundItem(s: GameState, mapId: string, groundId: number): void {
  const m = mapState(s, mapId);
  m.ground = m.ground.filter((g) => g.id !== groundId);
  revision++;
}

/** Ce qu'un objet né porte avec lui : retourné, sa chaîne, sa longueur restante (le rouleau), ses réglages de pièce de bois. */
export interface SpawnOpts {
  flip?: boolean;
  chain?: Chain;
  length?: number;
  wood?: WoodPiece;
}

/** Fait naître un objet sur une carte ; renvoie ce qui a été noté. */
export function spawnObject(s: GameState, mapId: string, type: string, x: number, y: number, opts: SpawnOpts = {}): Spawned {
  const { flip, chain, length, wood } = opts;
  const o = {
    id: s.nextSpawnId++,
    type,
    x,
    y,
    ...(flip ? { flip } : {}),
    ...(chain ? { chain } : {}),
    ...(length !== undefined ? { length } : {}),
    ...(wood ? { wood: structuredClone(wood) } : {}),
  };
  mapState(s, mapId).spawned.push(o);
  revision++;
  return o;
}

/** Un objet né a changé : il devient `type` en (x, y), ou disparaît (`type` absent). Il garde sa place dans sa chaîne. */
export function changeSpawned(s: GameState, mapId: string, spawnId: number, change: WorldChange): void {
  const m = mapState(s, mapId);
  const i = m.spawned.findIndex((o) => o.id === spawnId);
  if (i < 0) return;
  if (!change.type) m.spawned.splice(i, 1);
  else {
    // nouvel objet : sa place dans la chaîne reste
    const chain = m.spawned[i].chain;
    m.spawned[i] = {
      id: spawnId,
      type: change.type,
      x: change.x,
      y: change.y,
      ...(change.flip ? { flip: true } : {}),
      ...(chain ? { chain } : {}),
      ...(change.length !== undefined ? { length: change.length } : {}),
      ...(change.wood ? { wood: structuredClone(change.wood) } : {}),
    };
  }
  revision++;
}

/**
 * La pièce de bois (objet né, ou objet de carte changé) a de nouveaux réglages (une coupe commencée, un coup de doloire, le coin
 * planté, un coup de masse) ; sa place et son type ne changent pas.
 */
export function setWood(s: GameState, mapId: string, id: number, spawned: boolean, wood: WoodPiece): void {
  const m = mapState(s, mapId);
  const o = spawned ? m.spawned.find((x) => x.id === id) : m.changes[id];
  if (o) o.wood = structuredClone(wood);
  revision++;
}

/** Une pièce est posée à la place `place` d'un tas. */
export function fillPlace(s: GameState, mapId: string, pileId: number, place: string): void {
  const p = mapState(s, mapId).piles.find((q) => q.id === pileId);
  if (p && !p.places.includes(place)) p.places.push(place);
  revision++;
}

/** La pièce de la place `place` est reprise ; sans pièce ni lien, le tas disparaît de la carte. */
export function emptyPlace(s: GameState, mapId: string, pileId: number, place: string): void {
  const m = mapState(s, mapId);
  const i = m.piles.findIndex((q) => q.id === pileId);
  if (i < 0) return;
  m.piles[i].places = m.piles[i].places.filter((q) => q !== place);
  if (!m.piles[i].places.length && !m.piles[i].tie) m.piles.splice(i, 1);
  revision++;
}

/**
 * Pose un tas : ce qu'il entrepose (`pile` ou `wood`), point au sol, places prises, sens et lien (un tas né de deux pièces
 * identiques, un lien seul par terre, un fagot dénoué en branches, un tas noué en fagot) ; renvoie ce qui a été noté.
 */
export function addPile(s: GameState, mapId: string, pile: Omit<Pile, 'id'>): Pile {
  const p: Pile = {
    id: s.nextPileId++,
    ...(pile.pile ? { pile: pile.pile } : {}),
    ...(pile.wood ? { wood: { ...pile.wood } } : {}),
    x: pile.x,
    y: pile.y,
    places: [...pile.places],
    ...(pile.turned ? { turned: true } : {}),
    ...(pile.tie ? { tie: true } : {}),
  };
  mapState(s, mapId).piles.push(p);
  revision++;
  return p;
}

/** Retire un tas entier de la carte (noué en fagot, fagot dénoué). */
export function removePile(s: GameState, mapId: string, pileId: number): void {
  const m = mapState(s, mapId);
  m.piles = m.piles.filter((q) => q.id !== pileId);
  revision++;
}

/** Le lien passe sous le tas (`tie` = true), ou en est repris (false) : sans pièce ni lien, le tas disparaît. */
export function setPileTie(s: GameState, mapId: string, pileId: number, tie: boolean): void {
  const m = mapState(s, mapId);
  const i = m.piles.findIndex((q) => q.id === pileId);
  if (i < 0) return;
  if (tie) m.piles[i].tie = true;
  else delete m.piles[i].tie;
  if (!m.piles[i].places.length && !m.piles[i].tie) m.piles.splice(i, 1);
  revision++;
}

/** Xéros apprend un plan ; renvoie false s'il le connaissait déjà. */
export function learnPlan(s: GameState, plan: string): boolean {
  if (s.knownPlans.includes(plan)) return false;
  s.knownPlans.push(plan);
  revision++;
  return true;
}

/** Commence un chantier : le premier piquet (le coin nord-ouest) est planté en (x, y) ; renvoie ce qui a été noté. */
export function startSite(s: GameState, mapId: string, plan: string, x: number, y: number): Site {
  const site: Site = { id: s.nextSiteId++, plan, x, y, stakes: ['nw'], born: false, placed: {} };
  mapState(s, mapId).sites.push(site);
  revision++;
  return site;
}

/** Un piquet est planté à ce coin du tracé ; au quatrième, le chantier naît (`born`). */
export function plantSiteStake(s: GameState, mapId: string, siteId: number, corner: Site['stakes'][number]): void {
  const site = mapState(s, mapId).sites.find((q) => q.id === siteId);
  if (site && !site.stakes.includes(corner)) site.stakes.push(corner);
  if (site && site.stakes.length === 4) site.born = true;
  revision++;
}

/** Le piquet de ce coin est repris ou arraché ; un tracé qui n'a plus de piquet disparaît (un chantier né reste). */
export function pullSiteStake(s: GameState, mapId: string, siteId: number, corner: Site['stakes'][number]): void {
  const m = mapState(s, mapId);
  const i = m.sites.findIndex((q) => q.id === siteId);
  if (i < 0) return;
  m.sites[i].stakes = m.sites[i].stakes.filter((c) => c !== corner);
  if (!m.sites[i].born && !m.sites[i].stakes.length) m.sites.splice(i, 1);
  revision++;
}

/** Une pièce est posée à la place `place` du plan du chantier : `spawnId`, l'objet né qui la montre. */
export function placeSitePiece(s: GameState, mapId: string, siteId: number, place: string, spawnId: number): void {
  const site = mapState(s, mapId).sites.find((q) => q.id === siteId);
  if (site) site.placed[place] = spawnId;
  revision++;
}

/** Efface un chantier de la carte (outils de test) ; ses pièces posées, objets nés, sont à retirer par l'appelant. */
export function removeSite(s: GameState, mapId: string, siteId: number): void {
  const m = mapState(s, mapId);
  m.sites = m.sites.filter((q) => q.id !== siteId);
  revision++;
}

/** Les mains lâchent ce qu'elles tiennent (`both`, ou la main 0 ou 1) : sauvegarde d'un objet devenu trop lourd, posé au sol par la scène. */
export function clearHeld(s: GameState, slot: 'both' | Hand): void {
  if (slot === 'both') s.both = null;
  else s.hands[slot] = null;
  followHeld(s);
  revision++;
}

/** Vide les deux mains : ce qu'elles tenaient disparaît (outils de test, ?dieu). */
export function emptyHands(s: GameState): void {
  s.hands = [null, null];
  s.both = null;
  revision++;
}

/** Remet une carte dans son état d'origine : ses changements, objets au sol, objets nés et tas sont oubliés. */
export function resetMap(s: GameState, mapId: string): void {
  delete s.maps[mapId];
  revision++;
}

/** Remplace toute la partie par `next` (une sauvegarde relue, ou une partie neuve) : l'objet `s` reste le même. */
export function replaceState(s: GameState, next: GameState): void {
  Object.assign(s, structuredClone(next));
  revision++;
}
