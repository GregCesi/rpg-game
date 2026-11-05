// La pièce de bois, sans Phaser : sa définition complète tirée de ses réglages (diamètre, longueur, forme, faces, sens, coupe,
// coin), pour que tout le reste du jeu (prendre, poser, rouler, pivoter, peser, entasser) la traite comme n'importe quel objet de
// props.json. Une seule clé d'objet, `wood-piece` ; le reste est dans ses réglages (GameState) et dans wood.json.

import { props as propDefs } from '../content';
import { CM_PER_PX, CONTOUR_CM } from '../content/gabarit';
import type { PropDef, WoodPiece } from '../content/types';
import { facesOf, lookDef, lookOf, rectOf, rollsLook, sizeOf, upOf, woodBody, woodTraits, WOOD } from './woodShape';

/** La clé de la pièce de bois dans props.json. */
export const WOOD_PIECE = 'wood-piece';


/** Les réglages d'une pièce : les siens, sinon ceux par défaut de props.json (une pièce posée dans Tiled sans propriétés). */
export function woodOf(base: PropDef, wood?: WoodPiece): WoodPiece {
  return structuredClone(wood ?? base.wood!);
}

/**
 * La section vraie d'une pièce couchée (cm) : sa largeur en travers et sa hauteur. La planche, la latte : leur largeur à plat, leur
 * épaisseur (leur section rectangulaire, rectOf) ; le quartier repose écorce en bas, pointe en l'air : ses deux faces fendues à 45°,
 * d/√2 de large, d/2 de haut ; la demi-bille écorce en bas, face plate en l'air : d de large, d/2 de haut ; la poutre, son équarri.
 */
export function woodSection(piece: WoodPiece): { across: number; high: number } {
  const d = sizeOf(piece.size).diameter;
  const look = lookOf(piece);
  const rect = lookDef(piece.size, look).section.shape === 'rect' ? rectOf(piece.size, look) : undefined;
  const across = rect ? rect.wide : piece.shape === 'quarter' ? d / Math.SQRT2 : look === 'beam' ? WOOD.hew.beam : d;
  const high = rect ? rect.thick : piece.shape === 'round' ? (look === 'beam' ? WOOD.hew.beam : d) : d / 2;
  return { across, high };
}

/**
 * Dimensions d'une pièce (cm), comme `dims` de props.json : un cylindre couché pour la pièce ronde, une boîte couchée pour la demi,
 * le quart et la pièce équarrie. **La hauteur est la vraie** (la section : une bille du normal 30 cm, une poutre 20, une planche 3 ;
 * chantier « hauteurs ») : elle porte ce qui est posé dessus, fait les couches des tas, les dessus qui se marchent. L'emprise en
 * travers garde encore le contour du dessin (10 cm : un pixel de chaque côté ; chantier « emprises » à venir). Le dessin d'une pièce
 * est plus grand que sa hauteur de son contour (`woodDrawnDims`) : deux pièces posées l'une sur l'autre se recouvrent de 2 px.
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
  const { across, high } = woodSection(piece);
  const [w, dd] = piece.axis === 'ew' ? [piece.length, across + CONTOUR_CM] : [across + CONTOUR_CM, piece.length];
  if (rollsLook(look)) return { w, d: dd, h: d, shape: 'cylinder', axis: piece.axis };
  return { w, d: dd, h: Math.round(high), shape: 'box' };
}

/**
 * Les dimensions du dessin d'une pièce (cm), pour le seul gabarit : celles de `woodDims`, la hauteur d'une pièce couchée contour
 * compris (le tronc de 55 cm se dessine sur 65 ; 20 × 11 px pour le quart à 1 m est-ouest). Jamais pour la physique.
 */
export function woodDrawnDims(piece: WoodPiece): PropDef['dims'] {
  const dims = woodDims(piece);
  if (piece.axis === 'up') return dims;
  const look = lookOf(piece);
  if (rollsLook(look)) return { ...dims, h: dims.h + CONTOUR_CM };
  return { ...dims, h: Math.round(woodSection(piece).high + CONTOUR_CM) };
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
    ...(rollsLook(look) ? { roll: { axis: piece.axis, sheet: sizeOf(piece.size).sheet } } : { roll: undefined }),
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
  return { size: piece.size, length: piece.length, shape: 'round', ...(piece.hewn ? { hewn: piece.hewn } : {}), ...woodTraits(piece), axis: 'up' };
}
