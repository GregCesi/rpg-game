// La pièce de bois, sans Phaser : sa définition complète tirée de ses réglages (diamètre, longueur, forme, faces, sens, coupe,
// coin), pour que tout le reste du jeu (prendre, poser, rouler, pivoter, peser, entasser) la traite comme n'importe quel objet de
// props.json. Une seule clé d'objet, `wood-piece` ; le reste est dans ses réglages (GameState) et dans wood.json.

import { props as propDefs } from '../content';
import { CONTOUR_CM } from '../content/gabarit';
import type { PropDef, WoodPiece } from '../content/types';
import { facesOf, lookDef, lookOf, sizeOf, woodBody, WOOD } from './woodShape';

/** La clé de la pièce de bois dans props.json. */
export const WOOD_PIECE = 'wood-piece';

/** La définition de props.json de la pièce de bois (ses réglages par défaut, son image dans Tiled). */
export function woodBase(): PropDef {
  return propDefs[WOOD_PIECE];
}

/** Les réglages d'une pièce : les siens, sinon ceux par défaut de props.json (une pièce posée dans Tiled sans propriétés). */
export function woodOf(base: PropDef, wood?: WoodPiece): WoodPiece {
  return structuredClone(wood ?? base.wood!);
}

/**
 * Dimensions réelles d'une pièce (cm, contour compris : le tronc de 55 cm fait 65 cm), comme `dims` de props.json : un cylindre
 * couché pour la pièce ronde, une boîte couchée pour la demi (face plate en haut), le quart et la pièce équarrie. Le quartier, un
 * quart de rond posé sur un rayon, se mesure sans contour : sa section est le rayon de la bille dans les deux sens (27,5 × 27,5 cm
 * pour le gros, 20 × 8 px à 1 m est-ouest, 6 × 16 px nord-sud, chiffres de Grégoire, 30 octobre 2026) ; la boîte contour compris
 * (37,5 cm) le donnerait aussi épais qu'une demi-bille.
 */
export function woodDims(piece: WoodPiece): PropDef['dims'] {
  const d = sizeOf(piece.size).diameter;
  const look = lookOf(piece);
  if (look === 'quarter') {
    const r = d / 2;
    return piece.axis === 'ew' ? { w: piece.length, d: r, h: r, shape: 'box' } : { w: r, d: piece.length, h: r, shape: 'box' };
  }
  const across = piece.shape === 'quarter' ? d / 2 : look === 'beam' ? WOOD.hew.beam : d;
  const high = piece.shape === 'round' ? (look === 'beam' ? WOOD.hew.beam : d) : d / 2;
  const [w, dd] = piece.axis === 'ew' ? [piece.length, across + CONTOUR_CM] : [across + CONTOUR_CM, piece.length];
  if (look === 'round') return { w, d: dd, h: d + CONTOUR_CM, shape: 'cylinder', axis: piece.axis };
  return { w, d: dd, h: Math.round(high + CONTOUR_CM), shape: 'box' };
}

/**
 * La définition d'une pièce de bois d'après ses réglages : nom et genre de son aspect (la bille, le rondin, la demi-bille, le
 * quartier, la poutre), dimensions, collision, prise à deux mains (icône et vue portée de son aspect ; son tas se calcule,
 * world/woodPile.ts), roulement
 * (ronde, sans face dressée), pivot. `base` : l'entrée `wood-piece` de props.json.
 */
export function woodDef(base: PropDef, piece: WoodPiece): PropDef {
  const look = lookOf(piece);
  const l = lookDef(piece.size, look);
  return {
    ...base,
    name: l.name,
    gender: l.gender,
    dims: woodDims(piece),
    body: woodBody(piece.size, look, piece.axis, piece.length),
    bodies: undefined,
    take: { hands: 2, icon: l.icon, hold: { stance: 'carry', image: l.held } },
    ...(look === 'round' ? { roll: { axis: piece.axis, sheet: sizeOf(piece.size).sheet } } : { roll: undefined }),
    turn: { into: WOOD_PIECE },
    wood: piece,
  };
}

/** La définition d'un objet de props.json, celle de ses réglages pour une pièce de bois. */
export function defOf(type: string, wood?: WoodPiece): PropDef {
  const base = propDefs[type];
  return base.wood ? woodDef(base, woodOf(base, wood)) : base;
}

/** Faces dressées d'une pièce, et si c'est une poutre (4 faces). */
export function hewnFaces(piece: WoodPiece): { faces: number; beam: boolean } {
  const faces = facesOf(piece);
  return { faces, beam: faces >= WOOD.hew.faces };
}

/** Le nom d'une pièce avec sa première lettre en capitale (« Bille », « Rondin ») : pour commencer un message. */
export function capitalName(piece: WoodPiece): string {
  const name = lookDef(piece.size, lookOf(piece)).name;
  return name[0].toUpperCase() + name.slice(1);
}
