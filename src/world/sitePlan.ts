// Un plan sur la carte, sans Phaser : où tombe chaque place d'un chantier, laquelle est ouverte, où il en est. Le chantier
// (GameState : `Site`) donne le piquet nord-ouest ; le plan (plans.json) dit le reste, en centimètres. Les places d'un plan sont
// des places du moteur commun (places.ts) : leur couche est l'étape, leurs porteuses le `on` du plan.
import { props } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { Accept, Corner, PlanDef, PlanPlace, PlanStep } from '../content/types';
import type { Site } from '../state';
import { openPlaces, type PlaceSet } from './places';
import { woodDims } from './woodPiece';
import { BEAM_SIZE, WOOD } from './woodShape';

/** Une place du plan avec son étape. */
export interface PlanSlot {
  id: string;
  place: PlanPlace;
  /** Numéro de l'étape (à partir de 0). */
  step: number;
}

/** Toutes les places d'un plan, étape par étape, dans l'ordre du chantier. */
export function planSlots(plan: PlanDef): PlanSlot[] {
  return plan.steps.flatMap((s, step) => Object.entries(s.places).map(([id, place]) => ({ id, place, step })));
}

/** Coin bas gauche de l'image de la pièce d'une place, sur la carte (px) : le piquet nord-ouest du chantier plus `at` (cm). */
export function placeCorner(site: Pick<Site, 'x' | 'y'>, place: PlanPlace): { x: number; y: number } {
  return { x: Math.round(site.x + place.at[0] / CM_PER_PX), y: Math.round(site.y + place.at[1] / CM_PER_PX) };
}

/**
 * L'emprise au sol d'une place (cm) : celle de son objet (`dims` de props.json), sauf une place qui demande une poutre
 * (`accepts.wood`) : la pièce de bois y est dressée (`axis: 'up'`), son emprise est celle de la pièce debout (`woodDims`).
 */
export function placeDims(place: PlanPlace, step?: PlanStep): { w: number; d: number } {
  const beam = (place.accepts ?? step?.accepts)?.wood;
  if (!beam) return props[place.piece].dims;
  const { w, d } = woodDims({ size: BEAM_SIZE, length: beam.length, shape: 'round', hewn: WOOD.hew.faces * WOOD.hew.perFace, axis: 'up' });
  return { w, d };
}

/** Le point au sol visé pour poser une pièce : le milieu de son emprise au-dessus de son coin bas gauche. */
export function placeGround(site: Pick<Site, 'x' | 'y'>, place: PlanPlace, step?: PlanStep): { x: number; y: number } {
  const { x, y } = placeCorner(site, place);
  const dims = placeDims(place, step);
  return { x: x + dims.w / CM_PER_PX / 2, y: y - dims.d / CM_PER_PX / 2 };
}

/** Le point au sol d'un coin du tracé, sur la carte (px). */
export function cornerPoint(site: Pick<Site, 'x' | 'y'>, plan: PlanDef, corner: Corner): { x: number; y: number } {
  const [cx, cy] = plan.corners[corner];
  return { x: site.x + cx / CM_PER_PX, y: site.y + cy / CM_PER_PX };
}

/** L'emprise du chantier sur la carte (px) : le rectangle entre les axes des coins. */
export function footprintBox(site: Pick<Site, 'x' | 'y'>, plan: PlanDef): { left: number; top: number; right: number; bottom: number } {
  return { left: site.x, top: site.y, right: site.x + plan.footprint.w / CM_PER_PX, bottom: site.y + plan.footprint.d / CM_PER_PX };
}

/** Le plan comme ensemble de places du moteur commun : couche = étape, porteuses = `on`, point visé = le milieu de l'emprise de la pièce. */
export function planSet(site: Pick<Site, 'x' | 'y'>, plan: PlanDef): PlaceSet {
  const places: PlaceSet['places'] = {};
  for (const { id, place, step } of planSlots(plan)) {
    const at = placeCorner(site, place);
    const aim = placeGround(site, place, plan.steps[step]);
    places[id] = { layer: step, on: place.on, x: at.x, y: at.y, aim: [aim.x, aim.y] };
  }
  return { places };
}

/** Où en est le chantier : l'étape en cours (la première dont une place n'est pas posée), combien de places y sont posées. */
export interface Progress {
  /** Numéro de l'étape en cours, ou -1 si tout est posé. */
  step: number;
  name: string;
  done: number;
  total: number;
  /** L'étape est « à venir » : on voit ses places, on ne peut pas les remplir. */
  soon: boolean;
}

export function progress(site: Pick<Site, 'placed'>, plan: PlanDef): Progress {
  const i = plan.steps.findIndex((s) => Object.keys(s.places).some((id) => !(id in site.placed)));
  if (i < 0) return { step: -1, name: '', done: 0, total: 0, soon: false };
  const step = plan.steps[i];
  const ids = Object.keys(step.places);
  return { step: i, name: step.name, done: ids.filter((id) => id in site.placed).length, total: ids.length, soon: !!step.soon };
}

/** La ligne d'état près du chantier : « Abri à bois : dés, 2 sur 4 », ou « Abri à bois : terminé ». */
export function statusLine(site: Pick<Site, 'placed'>, plan: PlanDef): string {
  const name = plan.name[0].toUpperCase() + plan.name.slice(1);
  const p = progress(site, plan);
  return p.step < 0 ? `${name} : terminé` : `${name} : ${p.name}, ${p.done} sur ${p.total}`;
}

/** Les places de l'étape en cours que le moteur ouvre (celles qui les portent sont posées, elles ne le sont pas). */
export function openSlots(site: Pick<Site, 'x' | 'y' | 'placed'>, plan: PlanDef): PlanSlot[] {
  const p = progress(site, plan);
  if (p.step < 0) return [];
  const open = new Set(openPlaces(planSet(site, plan), Object.keys(site.placed)));
  return planSlots(plan).filter((s) => s.step === p.step && open.has(s.id));
}

/** Ce qu'accepte une place : le sien, sinon celui de son étape. */
export function acceptOf(step: PlanStep, place: PlanPlace): Accept | undefined {
  return place.accepts ?? step.accepts;
}
