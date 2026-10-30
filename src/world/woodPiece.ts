// La pièce de bois, sans Phaser : sa définition complète tirée de ses réglages (diamètre, longueur, forme, faces, sens, coupe,
// coin), pour que tout le reste du jeu (prendre, poser, rouler, pivoter, peser, entasser) la traite comme n'importe quel objet de
// props.json. Une seule clé d'objet, `wood-piece` ; le reste est dans ses réglages (GameState) et dans wood.json.

import { props as propDefs } from '../content';
import { CM_PER_PX, CONTOUR_CM } from '../content/gabarit';
import type { PropDef, WoodPiece } from '../content/types';
import { facesOf, lookDef, lookOf, sizeOf, upOf, woodBody, WOOD } from './woodShape';

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
 * couché pour la pièce ronde, une boîte couchée pour la demi (face plate en haut), le quart (27,5 × 27,5 cm de bois, 37,5 cm contour
 * compris : environ 20 × 11 px à 1 m est-ouest, 8 × 17 px nord-sud) et la pièce équarrie.
 */
export function woodDims(piece: WoodPiece): PropDef['dims'] {
  const d = sizeOf(piece.size).diameter;
  const look = lookOf(piece);
  // debout (règle D étendue, STYLE.md section 8) : à l'écran, l'épaisseur de la même pièce couchée est-ouest (`up.w` px) ; sa
  // longueur en hauteur
  if (piece.axis === 'up') {
    const s = upOf(piece.size, look).w * CM_PER_PX;
    return { w: s, d: s, h: piece.length, shape: look === 'beam' ? 'box' : 'cylinder', ...(look === 'beam' ? {} : { axis: 'up' as const }) };
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
  // dressée (un poteau), la pièce ne se prend ni ne roule ni ne pivote : elle porte le bâtiment
  if (piece.axis === 'up') {
    return {
      ...base,
      name: upOf(piece.size, look).name,
      gender: 'm',
      dims: woodDims(piece),
      body: woodBody(piece.size, look, 'up', piece.length),
      bodies: undefined,
      take: undefined,
      roll: undefined,
      turn: undefined,
      wood: piece,
    };
  }
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

/**
 * La pièce de bois dressée à partir d'une pièce (un poteau de chantier) : son diamètre, sa longueur et ses faces dressées ; ni coupe,
 * ni coin, ni face de quartier. C'est ce qu'un chantier garde de la poutre posée et ce qu'il dessine.
 */
export function uprightOf(piece: WoodPiece): WoodPiece {
  return { size: piece.size, length: piece.length, shape: 'round', ...(piece.hewn ? { hewn: piece.hewn } : {}), axis: 'up' };
}
