// La forme d'un tas, sans Phaser : ce qu'il entrepose (un genre écrit dans piles.json, ou une pièce de bois dont la forme se
// calcule, world/woodPile.ts), sa forme dans son sens, son lien, ce qui le fait bloquer. Les places elles-mêmes (ouvertes,
// reprises, visées, ordre d'affichage) sont le moteur commun aux tas et aux chantiers : world/places.ts, repris ici sous les noms
// d'avant. Utilisé par le jeu (GameMap, systems/hands.ts) et par l'aperçu (npm run art:preview).
import { piles } from '../content';
import type { PileWood } from '../content/types';
import { sameWood, woodPileDef, type PileShape } from './woodPile';
import { woodKey } from './woodShape';

export { drawOrder, freePieces, openPlaces, placeAim, placeOpen, topPieces } from './places';
export { placeStates as pileStates } from './places';
export type { PileShape, ShapePlace } from './woodPile';

/** Ce qu'entrepose un tas : un genre écrit (`pile`, clé de piles.json) ou une pièce de bois (`wood`). Les mêmes champs que dans GameState. */
export type PileKind = { pile: string; wood?: undefined } | { wood: PileWood; pile?: undefined };

/** Ce qu'entrepose un tas de GameState (ses champs `pile` ou `wood`). */
export function kindOf(p: { pile?: string; wood?: PileWood }): PileKind {
  return p.wood ? { wood: p.wood } : { pile: p.pile! };
}

/** Deux tas entreposent la même chose : le même genre, ou des pièces de bois identiques. */
export function sameKind(a: PileKind, b: PileKind): boolean {
  if (a.wood || b.wood) return !!a.wood && !!b.wood && sameWood(a.wood, b.wood);
  return a.pile === b.pile;
}

/** Une clé qui nomme ce qu'entrepose un tas (le genre, ou la pièce de bois) : ce qu'on offre à une place qui accepte un genre. */
export function kindKey(k: PileKind): string {
  return k.wood ? woodKey({ ...k.wood, axis: 'ew' }) : k.pile!;
}

/** Le genre de tas de ce qu'il entrepose : celui de piles.json, ou celui calculé pour la pièce de bois. */
export function pileDefOf(k: PileKind): PileShape {
  return k.wood ? woodPileDef(k.wood) : (piles[k.pile!] as PileShape);
}

/** La forme du tas dans son sens : celle du genre, ou, tourné, celle de `turned` (ses places, son départ, son ordre). */
export function shapeOf(def: PileShape, turned: boolean): PileShape {
  return turned && def.turned ? { ...def, ...def.turned, turned: undefined } : def;
}

/**
 * Le dessin du lien d'un tas lié aux places `taken` (repère du tas, coin bas gauche) : sans pièce au sol, sa boucle seule
 * (`alone`) ; sinon ses deux bouts, `north` derrière la pièce au sol la plus au nord, `south` devant la plus au sud.
 * Vide si le genre n'a pas de lien.
 */
export function tieImages(def: PileShape, taken: readonly string[]): { image: string; x: number; y: number }[] {
  const tie = def.tie;
  if (!tie) return [];
  const bodies = taken.flatMap((id) => (def.places[id].body ? [def.places[id].body!] : []));
  if (!bodies.length) return [tie.alone];
  const north = Math.min(...bodies.map((b) => b.y));
  const south = Math.max(...bodies.map((b) => b.y + b.h));
  return [
    { image: tie.north.image, x: tie.north.x, y: north + tie.north.dy },
    { image: tie.south.image, x: tie.south.x, y: south + tie.south.dy },
  ];
}

/** Le tas bloque le passage : il a au moins `blockFrom` pièces. */
export function pileBlocks(def: PileShape, taken: readonly string[]): boolean {
  return taken.length >= def.blockFrom;
}
