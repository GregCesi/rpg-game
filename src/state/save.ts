// La sauvegarde : la partie (GameState) écrite dans le navigateur (localStorage), avec la carte et la position de Xéros.
// Sans Phaser. Le format porte un numéro de version et se relit par son schéma Zod : une sauvegarde abîmée, d'une autre
// version, ou qui nomme un contenu disparu (carte, objet, tas) n'est jamais chargée ; on le dit et la partie repart à neuf.
// La future sauvegarde au cagibi passera par ces mêmes fonctions.

import { z } from 'zod';
import { items, maps, piles, plans, props, stamina, wood } from '../content';
import { FacingSchema, type End, type PileWood, type WoodPiece } from '../content/types';
import { kindOf, pileDefOf } from '../world/pileShape';
import { lookOf } from '../world/woodShape';
import { GameStateSchema, type GameState, type Held } from './GameState';

/** Clé de la sauvegarde dans localStorage. */
export const SAVE_KEY = 'xeros-partie';
/** Une sauvegarde illisible est mise de côté ici avant d'être remplacée, pour pouvoir l'examiner. */
const DAMAGED_KEY = 'xeros-partie-abimee';
/** Version du format : à augmenter quand GameState ou ce fichier changent d'une façon que l'ancien format ne lit plus. */
export const SAVE_VERSION = 9;

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
 * Version 6 -> 7 : la pièce de bois (voir `woodPiecesFromKeys`).
 * Version 7 -> 8 : les tas de bois se calculent d'après leur pièce (voir `woodPilesFromGenres`).
 * Version 8 -> 9 : un chantier garde la pièce de bois d'où vient chacune de ses pièces posées (`pieces`) : les chantiers anciens n'en ont aucune.
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
  if (d?.version === 6 && d.state && typeof d.state === 'object') d = { ...d, version: 7, state: woodPiecesFromKeys(d.state as V6State) };
  if (d?.version === 7 && d.state && typeof d.state === 'object') d = { ...d, version: 8, state: woodPilesFromGenres(d.state as V7State) };
  if (d?.version === 8 && d.state && typeof d.state === 'object') d = { ...d, version: 9, state: sitesWithPieces(d.state as V8State) };
  return d;
}

/** Ce que la conversion 8 -> 9 lit d'une partie : les chantiers de chaque carte. */
type V8State = { maps?: Record<string, { sites?: object[] }> };

/** 8 -> 9 : chaque chantier reçoit ses `pieces`, vides (les dés et les poteaux d'avant n'ont pas de pièce d'origine). */
function sitesWithPieces(state: V8State): V8State {
  const maps = Object.fromEntries(Object.entries(state.maps ?? {}).map(([id, m]) => [id, { ...m, sites: (m.sites ?? []).map((site) => ({ pieces: {}, ...site })) }]));
  return { ...state, maps };
}

/** Ce que la conversion 7 -> 8 lit d'une partie : les tas de chaque carte. */
type V7State = { maps?: Record<string, { piles?: { pile?: string; places?: string[] }[] }> };

/**
 * Les anciens genres de tas de bois de piles.json (des pièces de 1 m) et la pièce de bois qu'ils entreposent. Les billes gardent
 * leurs places (la pyramide calculée a les mêmes : g0 g1 g2, u01 u12, top) ; les quartiers passent de la pyramide aux rangées
 * tête-bêche : les pièces du sol restent, celles des creux montent sur la pièce de gauche (u01 -> l1-0, u12 -> l1-1, top -> l2-0).
 */
const OLD_WOOD_PILES: Record<string, { wood: PileWood; places?: Record<string, string> }> = {
  'big-logs': { wood: { size: 'big', shape: 'round', length: 100 } },
  'normal-logs': { wood: { size: 'normal', shape: 'round', length: 100 } },
  'big-quarters': { wood: { size: 'big', shape: 'quarter', length: 100 }, places: { u01: 'l1-0', u12: 'l1-1', top: 'l2-0' } },
};

/** Version 7 -> 8 : un tas d'un ancien genre de bois (big-logs, normal-logs, big-quarters) entrepose la pièce de bois équivalente. */
function woodPilesFromGenres(state: V7State): V7State {
  const maps = Object.fromEntries(
    Object.entries(state.maps ?? {}).map(([id, m]) => [
      id,
      {
        ...m,
        piles: (m.piles ?? []).map((p) => {
          const old = p.pile ? OLD_WOOD_PILES[p.pile] : undefined;
          if (!old) return p;
          const { pile: _genre, ...rest } = p;
          return { ...rest, wood: { ...old.wood }, places: (p.places ?? []).map((q) => old.places?.[q] ?? q) };
        }),
      },
    ]),
  );
  return { ...state, maps };
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

/** Ce que la conversion 6 -> 7 lit d'une partie : les objets de carte changés, les objets nés, ce que tiennent les mains. */
type V6Piece = { type?: string; x: number; y: number; flip?: boolean; chain?: unknown; hits?: number; length?: number; notch?: unknown; hewn?: number; wood?: WoodPiece };
type V6Held = { prop?: string; item?: string; turned?: boolean; flip?: boolean; length?: number; hewn?: number; wood?: WoodPiece } | null;
type V6State = { hands?: V6Held[]; both?: V6Held; maps?: Record<string, { changes?: Record<string, V6Piece>; spawned?: V6Piece[] }> };

/** Une longueur ancienne (au décimètre, ou 95 cm) ramenée sur la grille de wood.json, jamais sous la plus courte pièce. */
const onGrid = (cm: number) => Math.max(wood.min, Math.round(cm / wood.grid) * wood.grid);

/**
 * Les anciennes clés de bois et la pièce de bois qu'elles deviennent : diamètre, forme, sens, faces, bout du coin planté, et
 * décalage du coin bas gauche de la pièce dans l'image d'avant (couchée vers la droite, vers la gauche) : la 4e bille du gros et
 * sa tête ébranchée (53 × 30 px) portaient la bille à 9 px du bord gauche, 9 px au-dessus du bas.
 */
const OLD_WOOD: Record<string, { size: string; shape: WoodPiece['shape']; axis: WoodPiece['axis']; hewn?: number; end?: End; at?: { right: [number, number]; left: [number, number] } }> = {
  ...Object.fromEntries(
    ['big-felled-section-1', 'big-felled-section-2', 'big-felled-section-3', 'big-felled-log-1', 'big-felled-log-2', 'big-felled-log-3', 'big-felled-log'].map((k) => [k, { size: 'big', shape: 'round', axis: 'ew' }]),
  ),
  ...Object.fromEntries(['big-felled-crown', 'big-felled-head', 'big-felled-log-4'].map((k) => [k, { size: 'big', shape: 'round', axis: 'ew', at: { right: [9, -9], left: [25, -9] } }])),
  'big-felled-log-ns': { size: 'big', shape: 'round', axis: 'ns' },
  'big-wedged-log': { size: 'big', shape: 'round', axis: 'ew', end: 'west' },
  'big-wedged-log-east': { size: 'big', shape: 'round', axis: 'ew', end: 'east' },
  'big-wedged-log-ns': { size: 'big', shape: 'round', axis: 'ns', end: 'south' },
  'big-wedged-log-ns-north': { size: 'big', shape: 'round', axis: 'ns', end: 'north' },
  'big-half-log': { size: 'big', shape: 'half', axis: 'ew' },
  'big-half-log-ns': { size: 'big', shape: 'half', axis: 'ns' },
  'big-wedged-half-log': { size: 'big', shape: 'half', axis: 'ew', end: 'west' },
  'big-wedged-half-log-east': { size: 'big', shape: 'half', axis: 'ew', end: 'east' },
  'big-wedged-half-log-ns': { size: 'big', shape: 'half', axis: 'ns', end: 'south' },
  'big-wedged-half-log-ns-north': { size: 'big', shape: 'half', axis: 'ns', end: 'north' },
  'big-quarter-log': { size: 'big', shape: 'quarter', axis: 'ew' },
  'big-quarter-log-ns': { size: 'big', shape: 'quarter', axis: 'ns' },
  'normal-felled-log': { size: 'normal', shape: 'round', axis: 'ew' },
  'normal-felled-log-ns': { size: 'normal', shape: 'round', axis: 'ns' },
  'normal-beam': { size: 'normal', shape: 'round', axis: 'ew', hewn: 12 },
  'normal-beam-ns': { size: 'normal', shape: 'round', axis: 'ns', hewn: 12 },
};

/**
 * Version 6 -> 7 : la pièce de bois. Chaque ancienne clé de bois (sections et billes du gros, tête, houppier, bille coin planté,
 * demi-billes, quartiers, rondins, poutres) devient une pièce de bois `wood-piece` équivalente, à la même place : 1 m pour les
 * pièces de 95 cm, la longueur d'un rondin ramenée sur la grille de 20 cm ; les coups de doloire restent ; le coin planté reste
 * planté avec ses coups ; une coupe commencée (encoche) est perdue, comme les branches d'un houppier pas encore ébranché. Ce que
 * tiennent les mains suit (la bille tournée devient la pièce nord-sud). Les tas gardent leurs genres et leurs places.
 */
function woodPiecesFromKeys(state: V6State): V6State {
  const piece = (o: V6Piece): V6Piece => {
    const old = o.type ? OLD_WOOD[o.type] : undefined;
    const { hits, notch: _n, hewn, ...rest } = o;
    if (!old) return rest;
    const [dx, dy] = old.at ? (o.flip ? old.at.left : old.at.right) : [0, 0];
    const { flip: _f, chain: _c, length, ...kept } = rest;
    const faces = old.hewn ?? hewn;
    const w: WoodPiece = {
      size: old.size,
      length: onGrid(old.size === 'normal' && length !== undefined ? length : 100),
      shape: old.shape,
      axis: old.axis,
      ...(faces ? { hewn: faces } : {}),
      ...(old.end ? { wedge: { end: old.end, hits: hits ?? 0 } } : {}),
    };
    return { ...kept, type: 'wood-piece', x: o.x + dx, y: o.y + dy, wood: w };
  };
  const held = (h: V6Held | undefined): V6Held => {
    const old = h?.prop ? OLD_WOOD[h.prop] : undefined;
    if (!h || !old) return h ?? null;
    const faces = old.hewn ?? h.hewn;
    const axis = h.turned || old.axis === 'ns' ? 'ns' : 'ew';
    const length = onGrid(old.size === 'normal' && h.length !== undefined ? h.length : 100);
    return { prop: 'wood-piece', wood: { size: old.size, length, shape: old.shape, axis, ...(faces ? { hewn: faces } : {}) } };
  };
  const maps = Object.fromEntries(
    Object.entries(state.maps ?? {}).map(([id, m]) => [
      id,
      { ...m, changes: Object.fromEntries(Object.entries(m.changes ?? {}).map(([k, c]) => [k, piece(c)])), spawned: (m.spawned ?? []).map(piece) },
    ]),
  );
  return { ...state, hands: (state.hands ?? []).map((h) => held(h)), both: held(state.both), maps };
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

/** Le bois que nomment les réglages d'une pièce, s'il n'existe plus (diamètre, ou aspect de ce diamètre), décrit en français. */
function woodMissing(w: WoodPiece): string | undefined {
  const size = wood.sizes[w.size];
  if (!size) return `le bois « ${w.size} »`;
  return size.looks[lookOf(w)] ? undefined : `la forme « ${lookOf(w)} » du bois « ${w.size} »`;
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
    if (h.wood) return woodMissing(h.wood);
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
      for (const w of Object.values(site.pieces)) {
        const missing = woodMissing(w);
        if (missing) return missing;
      }
    }
    for (const c of Object.values(m.changes)) if (c.type && !props[c.type]) return `l'objet « ${c.type} »`;
    for (const o of m.spawned) if (!props[o.type]) return `l'objet « ${o.type} »`;
    for (const w of [...Object.values(m.changes), ...m.spawned].flatMap((o) => (o.wood ? [o.wood] : []))) {
      const missing = woodMissing(w);
      if (missing) return missing;
    }
    for (const g of m.ground) if (!items[g.item]) return `l'objet « ${g.item} »`;
    for (const p of m.piles) {
      const missing = p.wood ? woodMissing({ ...p.wood, axis: 'ew' }) : piles[p.pile!] ? undefined : `le tas « ${p.pile} »`;
      if (missing) return missing;
      const def = pileDefOf(kindOf(p));
      const name = p.pile ?? def.name;
      const places = (p.turned && def.turned ? def.turned : def).places;
      const bad = p.places.find((q) => !places[q]);
      if (bad) return `la place « ${bad} » du tas « ${name} »`;
      if (p.tie && !def.tie) return `le lien du tas « ${name} »`;
    }
  }
  return undefined;
}
