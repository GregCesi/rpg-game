// La forme d'un tas, sans Phaser : le genre de tas dans son sens, son lien, ce qui le fait bloquer. Les places elles-mêmes
// (ouvertes, reprises, visées, ordre d'affichage) sont le moteur commun aux tas et aux chantiers : world/places.ts, repris ici
// sous les noms d'avant. Utilisé par le jeu (GameMap, systems/hands.ts) et par l'aperçu (npm run art:preview).
import type { PileDef } from '../content/types';

export { drawOrder, freePieces, openPlaces, placeAim, placeOpen, topPieces } from './places';
export { placeStates as pileStates } from './places';

/** La forme du tas dans son sens : celle du genre, ou, tourné, celle de `turned` (ses places, son départ, son ordre). */
export function shapeOf(def: PileDef, turned: boolean): PileDef {
  return turned && def.turned ? { ...def, ...def.turned, turned: undefined } : def;
}

/**
 * Le dessin du lien d'un tas lié aux places `taken` (repère du tas, coin bas gauche) : sans pièce au sol, sa boucle seule
 * (`alone`) ; sinon ses deux bouts, `north` derrière la pièce au sol la plus au nord, `south` devant la plus au sud.
 * Vide si le genre n'a pas de lien.
 */
export function tieImages(def: PileDef, taken: readonly string[]): { image: string; x: number; y: number }[] {
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
export function pileBlocks(def: PileDef, taken: readonly string[]): boolean {
  return taken.length >= def.blockFrom;
}
