// La sauvegarde : la partie (GameState) écrite dans le navigateur (localStorage), avec la carte et la position de Xéros.
// Sans Phaser. Le format porte un numéro de version et se relit par son schéma Zod : une sauvegarde abîmée, d'une autre
// version, ou qui nomme un contenu disparu (carte, objet, tas) n'est jamais chargée ; on le dit et la partie repart à neuf.
// La future sauvegarde au cagibi passera par ces mêmes fonctions.

import { z } from 'zod';
import { items, maps, piles, plans, props, stamina } from '../content';
import { FacingSchema } from '../content/types';
import { GameStateSchema, type GameState, type Held } from './GameState';

/** Clé de la sauvegarde dans localStorage. */
export const SAVE_KEY = 'xeros-partie';
/** Une sauvegarde illisible est mise de côté ici avant d'être remplacée, pour pouvoir l'examiner. */
const DAMAGED_KEY = 'xeros-partie-abimee';
/** Version du format : à augmenter quand GameState ou ce fichier changent d'une façon que l'ancien format ne lit plus. */
export const SAVE_VERSION = 6;

/** Où est Xéros : la carte, ses pieds (x, y), sa direction. */
export const WhereSchema = z.strictObject({ map: z.string().min(1), x: z.number(), y: z.number(), facing: FacingSchema });

export const SaveSchema = z.strictObject({
  version: z.literal(SAVE_VERSION),
  /** Date de l'écriture (ISO), pour s'y retrouver en examinant une sauvegarde. */
  savedAt: z.string(),
  where: WhereSchema,
  state: GameStateSchema,
});

export type Where = z.infer<typeof WhereSchema>;
export type Save = z.infer<typeof SaveSchema>;

/** Ce qu'a donné la lecture : une sauvegarde, rien (première partie), ou un problème à dire au joueur. */
export type ReadResult = { save: Save } | { none: true } | { problem: string };

/** Le stockage du navigateur, s'il existe et répond (navigation privée stricte, stockage bloqué : undefined). */
function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Lit la sauvegarde. Ne plante jamais : tout ce qui ne va pas devient un `problem` en français. */
export function readSave(): ReadResult {
  const raw = storage()?.getItem(SAVE_KEY);
  if (raw == null) return { none: true };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return damaged(raw, 'Sauvegarde abîmée (illisible)');
  }
  data = upgrade(data);
  const version = (data as { version?: unknown } | null)?.version;
  if (version !== SAVE_VERSION) {
    return damaged(raw, `Sauvegarde d'une autre version (${typeof version === 'number' ? version : 'sans numéro'}, attendue ${SAVE_VERSION})`);
  }
  const r = SaveSchema.safeParse(data);
  if (!r.success) {
    console.warn(`Sauvegarde refusée :\n${z.prettifyError(r.error)}`);
    return damaged(raw, 'Sauvegarde abîmée (format inattendu)');
  }
  const missing = missingContent(r.data);
  if (missing) return damaged(raw, `Sauvegarde périmée (${missing} n'existe plus)`);
  return { save: r.data };
}

/**
 * Met une sauvegarde d'un format plus ancien au format actuel, si on sait le faire (sinon elle est rendue telle quelle et
 * refusée plus loin). Version 2 -> 3 : l'endurance et le jour apparaissent, jauge pleine et jour 1. Version 3 -> 4 : le
 * fendage (coups reçus par un objet de carte changé, bille coin planté, demi-billes, quartiers, tas de quartiers) n'ajoute que
 * des champs facultatifs et des clés de contenu : une partie de la version 3 se relit telle quelle, seul le numéro change.
 * Version 4 -> 5 : les chantiers (`sites` de chaque carte, `knownPlans`, `nextSiteId`) apparaissent : aucun plan connu, aucun chantier.
 * Version 5 -> 6 : le bois d'œuvre (équarrissage). L'arbre normal ne se couche plus en sections à encoches fixes : ses sections,
 * son houppier, sa tête ébranchée et ses billes numérotées deviennent des rondins de 95 cm (`normal-felled-log`) à la même place
 * (la 5e bille, sous le houppier ou dans la tête, là où elle était dessinée ; les entailles commencées et les branches du houppier
 * sont perdues) ; une bille numérotée tenue en main devient la bille ordinaire.
 */
function upgrade(data: unknown): unknown {
  let d = data as { version?: unknown; state?: unknown } | null;
  if (d?.version === 2 && d.state && typeof d.state === 'object') {
    d = { ...d, version: 3, state: { ...d.state, stamina: stamina.max, day: 1 } };
  }
  if (d?.version === 3) d = { ...d, version: 4 };
  if (d?.version === 4 && d.state && typeof d.state === 'object') {
    const state = d.state as { maps?: Record<string, object> };
    const maps = Object.fromEntries(Object.entries(state.maps ?? {}).map(([id, m]) => [id, { ...m, sites: [] }]));
    d = { ...d, version: 5, state: { ...d.state, maps, knownPlans: [], nextSiteId: 0 } };
  }
  if (d?.version === 5 && d.state && typeof d.state === 'object') d = { ...d, version: 6, state: normalPiecesToLogs(d.state as V5State) };
  return d;
}

/** Ce que la conversion 5 -> 6 lit d'une partie : seulement ce qui peut nommer une pièce de l'arbre normal. */
type V5Piece = { type?: string; x: number; y: number; flip?: boolean; chain?: unknown; hits?: number; length?: number };
type V5Held = { prop?: string } | null;
type V5State = { hands?: V5Held[]; both?: V5Held; maps?: Record<string, { changes?: Record<string, V5Piece>; spawned?: V5Piece[] }> };

/**
 * Les pièces de l'arbre normal d'avant le bois d'œuvre, et où était dessinée leur bille dans leur image (décalage du coin bas
 * gauche du rondin de 95 cm, couché vers la droite et vers la gauche) : les sections et les billes 1 à 4 avaient l'image du
 * rondin ; le houppier, la tête et la bille 5 (85 × 22 px) portaient la 5e bille à 21 px du bord, 6 px au-dessus du bas.
 */
const OLD_NORMAL: Record<string, { right: [number, number]; left: [number, number] }> = {
  ...Object.fromEntries(
    [1, 2, 3, 4].flatMap((k) => [`normal-felled-section-${k}`, `normal-felled-log-${k}`]).map((t) => [t, { right: [0, 0] as [number, number], left: [0, 0] as [number, number] }]),
  ),
  ...Object.fromEntries(
    ['normal-felled-crown', 'normal-felled-head', 'normal-felled-log-5'].map((t) => [t, { right: [21, -6] as [number, number], left: [45, -6] as [number, number] }]),
  ),
};

function normalPiecesToLogs(state: V5State): V5State {
  const piece = (o: V5Piece): V5Piece => {
    const old = o.type && OLD_NORMAL[o.type];
    if (!old) return o;
    const [dx, dy] = o.flip ? old.left : old.right;
    const { flip: _f, chain: _c, hits: _h, ...rest } = o;
    return { ...rest, type: 'normal-felled-log', x: o.x + dx, y: o.y + dy, length: 95 };
  };
  const held = (h: V5Held | undefined) => (h && h.prop && /^normal-felled-log-\d$/.test(h.prop) ? { ...h, prop: 'normal-felled-log' } : h);
  const maps = Object.fromEntries(
    Object.entries(state.maps ?? {}).map(([id, m]) => [
      id,
      { ...m, changes: Object.fromEntries(Object.entries(m.changes ?? {}).map(([k, c]) => [k, piece(c)])), spawned: (m.spawned ?? []).map(piece) },
    ]),
  );
  return { ...state, hands: (state.hands ?? []).map((h) => held(h) ?? null), both: held(state.both) ?? null, maps };
}

/** Écrit la partie et la position de Xéros. Un stockage plein ou bloqué ne plante pas le jeu : on le note en console. */
export function writeSave(state: GameState, where: Where): void {
  const save: Save = { version: SAVE_VERSION, savedAt: new Date().toISOString(), where, state };
  try {
    storage()?.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    console.warn('Sauvegarde impossible :', e);
  }
}

/** Efface la sauvegarde (?reset, réinitialiser la partie). */
export function clearSave(): void {
  try {
    storage()?.removeItem(SAVE_KEY);
  } catch {
    // stockage bloqué : rien à effacer
  }
}

/** Met de côté une sauvegarde refusée (DAMAGED_KEY) et renvoie le message à afficher. */
function damaged(raw: string, why: string): ReadResult {
  console.warn(`${why} : mise de côté dans localStorage['${DAMAGED_KEY}'].`);
  try {
    storage()?.setItem(DAMAGED_KEY, raw);
  } catch {
    // tant pis : la partie neuve commence quand même
  }
  return { problem: `${why} : nouvelle partie.` };
}

/**
 * Le premier contenu nommé par la sauvegarde qui n'existe plus (carte, objet, genre ou place de tas), décrit en
 * français, ou undefined. Le contenu a pu changer depuis l'écriture ; sans ce contrôle, la carte planterait au chargement.
 */
function missingContent(save: Save): string | undefined {
  const { state, where } = save;
  if (!maps[where.map]) return `la carte « ${where.map} »`;
  const heldMissing = (h: Held | null): string | undefined => {
    if (!h) return undefined;
    if ('item' in h) return items[h.item] ? undefined : `l'objet « ${h.item} »`;
    return props[h.prop]?.take ? undefined : `l'objet « ${h.prop} »`;
  };
  for (const h of [...state.hands, state.both]) {
    const m = heldMissing(h);
    if (m) return m;
  }
  for (const plan of state.knownPlans) if (!plans[plan]) return `le plan « ${plan} »`;
  for (const [mapId, m] of Object.entries(state.maps)) {
    if (!maps[mapId]) return `la carte « ${mapId} »`;
    for (const site of m.sites) {
      const def = plans[site.plan];
      if (!def) return `le plan « ${site.plan} »`;
      const places = def.steps.flatMap((st) => Object.keys(st.places));
      const bad = Object.keys(site.placed).find((q) => !places.includes(q));
      if (bad) return `la place « ${bad} » du plan « ${site.plan} »`;
    }
    for (const c of Object.values(m.changes)) if (c.type && !props[c.type]) return `l'objet « ${c.type} »`;
    for (const o of m.spawned) if (!props[o.type]) return `l'objet « ${o.type} »`;
    for (const g of m.ground) if (!items[g.item]) return `l'objet « ${g.item} »`;
    for (const p of m.piles) {
      const def = piles[p.pile];
      if (!def) return `le tas « ${p.pile} »`;
      const places = (p.turned && def.turned ? def.turned : def).places;
      const bad = p.places.find((q) => !places[q]);
      if (bad) return `la place « ${bad} » du tas « ${p.pile} »`;
      if (p.tie && !def.tie) return `le lien du tas « ${p.pile} »`;
    }
  }
  return undefined;
}
