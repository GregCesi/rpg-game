// La sauvegarde : la partie (GameState) écrite dans le navigateur (localStorage), avec la carte et la position de Xéros.
// Sans Phaser. Le format porte un numéro de version et se relit par son schéma Zod : une sauvegarde abîmée, d'une autre
// version, ou qui nomme un contenu disparu (carte, objet, tas) n'est jamais chargée ; on le dit et la partie repart à neuf.
// La future sauvegarde au cagibi passera par ces mêmes fonctions.

import { z } from 'zod';
import { items, maps, piles, props } from '../content';
import { FacingSchema } from '../content/types';
import { GameStateSchema, type GameState, type Held } from './GameState';

/** Clé de la sauvegarde dans localStorage. */
export const SAVE_KEY = 'xeros-partie';
/** Une sauvegarde illisible est mise de côté ici avant d'être remplacée, pour pouvoir l'examiner. */
const DAMAGED_KEY = 'xeros-partie-abimee';
/** Version du format : à augmenter quand GameState ou ce fichier changent d'une façon que l'ancien format ne lit plus. */
export const SAVE_VERSION = 2;

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
  for (const [mapId, m] of Object.entries(state.maps)) {
    if (!maps[mapId]) return `la carte « ${mapId} »`;
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
