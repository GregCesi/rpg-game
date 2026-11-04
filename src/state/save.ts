// La sauvegarde : la partie (GameState) écrite dans le navigateur (localStorage), avec la carte et la position de Xéros.
// Sans Phaser. Le format porte un numéro de version et se relit par son schéma Zod : une sauvegarde abîmée, d'une autre
// version, ou qui nomme un contenu disparu (carte, objet, tas) n'est jamais chargée ; on le dit et la partie repart à neuf.
// La future sauvegarde au cagibi passera par ces mêmes fonctions.

import { z } from 'zod';
import { health, items, maps, piles, plans, props, stamina, time, wood } from '../content';
import { FacingSchema, type WoodPiece } from '../content/types';
import { refMissing } from '../world/build';
import { parseInteriorId } from '../world/interior';
import { kindOf, pileDefOf } from '../world/pileShape';
import { dressedLook, lookOf } from '../world/woodShape';
import { GameStateSchema, type GameState, type Held } from './GameState';

/** Clé de la sauvegarde dans localStorage. */
const SAVE_KEY = 'xeros-partie';
/** Une sauvegarde illisible est mise de côté ici avant d'être remplacée, pour pouvoir l'examiner. */
const DAMAGED_KEY = 'xeros-partie-abimee';
/** Version du format : à augmenter quand GameState ou ce fichier changent d'une façon que l'ancien format ne lit plus. */
// 17 (chantier « monde ») : la ferme agrandie en zone du monde (ses objets ont bougé), les plans posés depuis Tiled (`seeded`).
// 28 (chantier « commandes ») : plus de main active (`active` retiré : chaque clic dit sa main).
// 29 (chantier « lapins ») : les garennes de chaque carte (`warrens` : membres, points de vie des blessés, naissances).
// 30 (chantier « maison-2 ») : la maison de Xéros refaite (le solin de toute longueur, `length` d'une pièce posée ; la baie de porte,
// les seuils, la cheminée où l'on cuisine) : une partie d'avant garderait l'ancienne maison, posée une fois (accord de Grégoire : une
// partie neuve).
// 31 (chantier « sangliers ») : la vie de Xéros (`health`) ; une partie d'avant la reçoit pleine.
export const SAVE_VERSION = 31;

/** Où est Xéros : la carte, ses pieds (x, y), sa direction. */
const WhereSchema = z.strictObject({ map: z.string().min(1), x: z.number(), y: z.number(), facing: FacingSchema });

const SaveSchema = z.strictObject({
  version: z.literal(SAVE_VERSION),
  /** Date de l'écriture (ISO), pour s'y retrouver en examinant une sauvegarde. */
  savedAt: z.string(),
  where: WhereSchema,
  state: GameStateSchema,
});

export type Where = z.infer<typeof WhereSchema>;
type Save = z.infer<typeof SaveSchema>;

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
 * Met une sauvegarde d'un format plus ancien au format actuel, si on sait le faire (sinon elle est rendue telle quelle et refusée
 * plus loin, avec un message et une partie neuve). On ne sait relire que depuis la version 17 (le chantier « monde » : les parties
 * d'avant ont été refusées une fois pour toutes, leurs conversions retirées à l'audit du 2 novembre 2026).
 * 17 -> 18 : l'horloge (`withClock`) ; 18 -> 19 : l'endurance en trois niveaux (`threeLevels`) ; 19 -> 20 : le plafond au réveil
 * (`withWoke`) ; 20 -> 21 : les travaux interrompus, vides ; 21 -> 22 : le travail par la matière (`workByMatter`) ; 22 -> 23 : le côté
 * de l'entaille (`side`), facultatif ; 23 -> 24 : la place d'un objet né dans sa « chaîne » (`chain`), jamais lue, n'existe plus ;
 * 24 -> 25 : le nombre de branches d'un fagot (`bundle`), facultatif ; 25 -> 26 : celui d'un fagot posé seul (`bundle` d'un objet né),
 * facultatif ; 26 -> 27 : le tas de branches plein passe de 10 à 12, un fagot sans nombre (le plein d'alors) reçoit `bundle: 10`
 * (`withOldFullBundle`) ; 27 -> 28 : la main active n'existe plus (`active` retiré, `withoutActive`) ; 28 -> 29 : les garennes
 * (`warrens` de chaque carte), vides : elles se peuplent à la prochaine visite ; 30 -> 31 : la vie de Xéros (`health`), pleine
 * (`withHealth`).
 */
export function upgrade(data: unknown): unknown {
  let d = data as { version?: unknown; state?: unknown } | null;
  if (d?.version === 17 && d.state && typeof d.state === 'object') d = { ...d, version: 18, state: withClock(d.state as { day?: number }) };
  if (d?.version === 18 && d.state && typeof d.state === 'object') d = { ...d, version: 19, state: threeLevels(d.state as { stamina?: number }) };
  if (d?.version === 19 && d.state && typeof d.state === 'object') d = { ...d, version: 20, state: withWoke(d.state as { stamina?: { ceiling?: number } }) };
  if (d?.version === 20 && d.state && typeof d.state === 'object') d = { ...d, version: 21 };
  if (d?.version === 21 && d.state && typeof d.state === 'object') d = { ...d, version: 22, state: workByMatter(d.state as { maps?: Record<string, { work?: unknown }> }) };
  if (d?.version === 22 && d.state && typeof d.state === 'object') d = { ...d, version: 23 };
  if (d?.version === 23 && d.state && typeof d.state === 'object') d = { ...d, version: 24, state: withoutChain(d.state as { maps?: Record<string, { spawned?: object[] }> }) };
  // 24 -> 25 : le nombre de branches d'un fagot (`bundle` d'un tas de fagots, d'un fagot tenu), facultatif : un fagot plein
  if (d?.version === 24 && d.state && typeof d.state === 'object') d = { ...d, version: 25 };
  // 25 -> 26 : le nombre de branches d'un fagot posé seul (`bundle` d'un objet né), facultatif : sans lui, le fagot plein
  if (d?.version === 25 && d.state && typeof d.state === 'object') d = { ...d, version: 26 };
  // 26 -> 27 : le tas de branches plein passe de 10 à 12 branches ; un fagot sans nombre était plein, il en avait 10
  if (d?.version === 26 && d.state && typeof d.state === 'object') d = { ...d, version: 27, state: withOldFullBundle(d.state as OldBundles) };
  // 27 -> 28 : la main active n'existe plus (chaque clic dit sa main)
  if (d?.version === 27 && d.state && typeof d.state === 'object') d = { ...d, version: 28, state: withoutActive(d.state as object) };
  // 28 -> 29 : les garennes de chaque carte (`warrens`, une valeur par défaut du schéma : vides)
  if (d?.version === 28 && d.state && typeof d.state === 'object') d = { ...d, version: 29 };
  // 30 -> 31 : la vie de Xéros, pleine (la partie de la version 29 n'est pas relue : la maison refaite de la version 30 demande une partie neuve)
  if (d?.version === 30 && d.state && typeof d.state === 'object') d = { ...d, version: 31, state: withHealth(d.state as object) };
  return d;
}

/** 30 -> 31 : la vie de Xéros, pleine. */
function withHealth(state: object): object {
  return { ...state, health: health.max };
}

/** 27 -> 28 : `active` retiré de la partie. */
function withoutActive(state: object): object {
  return Object.fromEntries(Object.entries(state).filter(([k]) => k !== 'active'));
}

type OldBundles = { hands?: unknown[]; both?: unknown; maps?: Record<string, { piles?: { pile?: string; bundle?: number }[]; spawned?: { type?: string; bundle?: number }[] }> };

/**
 * 26 -> 27 : un fagot sans nombre de branches était le fagot plein du tas de branches d'alors (10 places ; 12 depuis) : il reçoit
 * `bundle: 10`, partout où il est (tas de fagots, objet né, mains), pour garder ses branches (la matière se conserve).
 */
function withOldFullBundle(state: OldBundles): object {
  const OLD_FULL = 10;
  const fagot = Object.values(piles).find((g) => g.tie?.into)?.tie?.into;
  const genre = fagot ? props[fagot]?.take?.pile : undefined;
  if (!fagot || !genre) return state;
  const held = (h: unknown) => (h && typeof h === 'object' && (h as { prop?: string }).prop === fagot && !(h as { bundle?: number }).bundle ? { ...h, bundle: OLD_FULL } : h);
  const maps = Object.fromEntries(
    Object.entries(state.maps ?? {}).map(([id, m]) => [
      id,
      {
        ...m,
        ...(m.piles ? { piles: m.piles.map((p) => (p.pile === genre && !p.bundle ? { ...p, bundle: OLD_FULL } : p)) } : {}),
        ...(m.spawned ? { spawned: m.spawned.map((o) => (o.type === fagot && !o.bundle ? { ...o, bundle: OLD_FULL } : o)) } : {}),
      },
    ]),
  );
  return { ...state, maps, ...(state.hands ? { hands: state.hands.map(held) } : {}), ...(state.both !== undefined ? { both: held(state.both) } : {}) };
}

/** 23 -> 24 : `chain` retiré des objets nés de chaque carte. */
function withoutChain(state: { maps?: Record<string, { spawned?: object[] }> }): object {
  const maps = Object.fromEntries(
    Object.entries(state.maps ?? {}).map(([id, m]) => [id, { ...m, spawned: (m.spawned ?? []).map((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'chain'))) }]),
  );
  return { ...state, maps };
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
  const look = size.looks[lookOf(w)];
  if (!look) return `la forme « ${lookOf(w)} » du bois « ${w.size} »`;
  const next = dressedLook(w);
  if (next && !size.looks[next]) return `la forme « ${next} » du bois « ${w.size} » (la face entamée)`;
  return w.axis === 'up' && !look.up ? `la forme « ${lookOf(w)} » du bois « ${w.size} » debout` : undefined;
}

/**
 * Le premier contenu nommé par la sauvegarde qui n'existe plus (carte, objet, genre ou place de tas), décrit en
 * français, ou undefined. Le contenu a pu changer depuis l'écriture ; sans ce contrôle, la carte planterait au chargement.
 */
/** Une carte de Tiled, ou l'intérieur d'un bâtiment d'une carte de Tiled (`interieur:<carte>:<x>,<y>`, chantier « intérieurs »). */
function mapKnown(id: string): boolean {
  return !!maps[id] || !!maps[parseInteriorId(id)?.host ?? ''];
}

function missingContent(save: Save): string | undefined {
  const { state, where } = save;
  if (!mapKnown(where.map)) return `la carte « ${where.map} »`;
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
    if (!mapKnown(mapId)) return `la carte « ${mapId} »`;
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
    // une garenne gardée nomme une garenne de Tiled (`warrens` de la carte, par identifiant d'objet)
    for (const id of Object.keys(m.warrens)) if (maps[mapId] && !maps[mapId].warrens.some((g) => String(g.id) === id)) return `la garenne n°${id} de « ${mapId} »`;
    for (const o of m.spawned) if (!props[o.type]) return `l'objet « ${o.type} »`;
    for (const w of [...Object.values(m.changes), ...m.spawned].flatMap((o) => (o.wood ? [o.wood] : []))) {
      const missing = woodMissing(w);
      if (missing) return missing;
    }
    for (const g of m.ground) if (!items[g.item]) return `l'objet « ${g.item} »`;
    for (const b of m.builds) {
      const missing = refMissing(b.piece);
      if (missing) return missing;
    }
    for (const j of m.joints) if (!m.builds.some((b) => b.id === j.a) || !m.builds.some((b) => b.id === j.b)) return `une pièce de l'assemblage ${j.id}`;
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

/**
 * Version 17 -> 18 : l'horloge (docs/CONCEPTION.md, « Le temps ») : le compteur de jours `day` devient `clock`, le même jour, à l'heure
 * du lever (time.json).
 */
function withClock(state: { day?: number }): unknown {
  const { day, ...rest } = state;
  return { ...rest, clock: { day: typeof day === 'number' && day >= 1 ? day : 1, minute: time.wakeHour * 60 } };
}

/**
 * Version 18 -> 19 : l'endurance en trois niveaux (docs/CONCEPTION.md, « Le temps ») : la jauge d'avant devient le plafond du jour et
 * le souffle ; le maximum est celui du départ.
 */
function threeLevels(state: { stamina?: number }): unknown {
  const max = stamina.max.start;
  const v = typeof state.stamina === 'number' ? Math.min(max, Math.max(0, state.stamina)) : max;
  return { ...state, stamina: { breath: v, ceiling: v, max } };
}

/**
 * Version 19 -> 20 : le plafond au réveil (`woke`), qui dit la nuit venue si la journée a entraîné Xéros ; une partie d'avant le prend
 * égal au plafond d'aujourd'hui (la journée commence là).
 */
function withWoke(state: { stamina?: { ceiling?: number } }): unknown {
  const st = state.stamina;
  return st && typeof st === 'object' ? { ...state, stamina: { ...st, woke: typeof st.ceiling === 'number' ? st.ceiling : stamina.max.start } } : state;
}

/**
 * Version 21 -> 22 : un travail interrompu garde la part de sa matière enlevée (`done`, docs/CONCEPTION.md, « Le travail ») et plus ses
 * minutes faites : la durée découle maintenant des coups, les minutes d'avant ne disent plus où l'on en est. Les travaux commencés
 * repartent de zéro (les encoches et les coins plantés, dans les réglages des pièces, restent).
 */
function workByMatter(state: { maps?: Record<string, { work?: unknown }> }): unknown {
  const maps = Object.fromEntries(Object.entries(state.maps ?? {}).map(([id, m]) => [id, { ...m, work: {} }]));
  return { ...state, maps };
}
