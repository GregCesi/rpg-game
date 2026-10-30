// Les masses : tout objet qu'on prend, pose ou roule a une masse en kg (validate.ts l'exige). Sans Phaser.
// - saisie (`mass` : un nombre dans items.json ou props.json) ;
// - calculée pour la pièce de bois (`"mass": "wood"`) : la section de son bois (ronde, demi, quart, moins ce que la doloire a ôté)
//   × sa longueur × la densité du bois vert de wood.json, d'après ses réglages ;
// - calculée pour la pierre : volume de la boîte de `dims` × densité de la pierre (`"mass": "stone"`) ;
// - calculée pour un fagot : la somme des branches d'un tas plein de son genre plus son lien (`{ "pile": genre }`) ;
// - au prorata de sa longueur pour une quantité mesurée (le rouleau de corde : 1 kg les 10 m).

import { items as itemDefs, piles as pileDefs, props as propDefs, wood as woodDef } from './index';
import type { Dims } from './gabarit';
import type { ItemDef, PileDef, PropDef, WoodPiece } from './types';

/** Densité de la pierre, kg/m³ : une seule constante pour toutes les pierres (celle du bois est dans wood.json). */
export const STONE_DENSITY = 2600;

/** Ce qu'il faut du contenu pour peser : mêmes tables que `src/content/index.ts` (validate.ts passe les siennes). */
export interface MassCatalog {
  props: Record<string, PropDef>;
  items: Record<string, ItemDef>;
  piles: Record<string, PileDef>;
}

const CONTENT: MassCatalog = { props: propDefs, items: itemDefs, piles: pileDefs };

/** Ce qu'on peut tenir : un objet possédable (`item`) ou un objet du monde pris (`prop`, avec sa longueur s'il en a une). */
export type Weighed = { item: string } | { prop: string; length?: number; wood?: WoodPiece };

/**
 * Section du bois d'une pièce (m²) : le rond de son diamètre, la moitié pour une demi, le quart pour un quart ; la pièce qu'on
 * équarrit perd à chaque face finie un quart de ce qui sépare son rond du carré de la poutre (`hew.beam` de côté).
 */
export function woodSection(piece: WoodPiece): number {
  const size = woodDef.sizes[piece.size];
  if (!size) throw new Error(`wood.json : diamètre « ${piece.size} » inconnu`);
  const round = Math.PI * (size.diameter / 200) ** 2;
  if (piece.shape === 'half') return round / 2;
  if (piece.shape === 'quarter') return round / 4;
  const hew = woodDef.hew;
  const faces = Math.min(hew.faces, Math.floor((piece.hewn ?? 0) / hew.perFace));
  return round - (faces / hew.faces) * (round - (hew.beam / 100) ** 2);
}

/** Masse d'une pièce de bois, en kg : sa section × sa longueur × la densité du bois vert (214 kg la bille de 1 m du gros). */
export function woodMass(piece: WoodPiece): number {
  return woodSection(piece) * (piece.length / 100) * woodDef.density;
}

/** Masse d'une pierre de ces dimensions (la boîte de ses `dims`, contour compris), en kg : 30 × 30 × 15 cm donne 35 kg. */
export function stoneMass(d: Dims): number {
  return (d.w / 100) * (d.d / 100) * (d.h / 100) * STONE_DENSITY;
}

/** Nombre de places d'un genre de tas (son maximum). */
const capacity = (g: PileDef) => Object.keys(g.places).length;

/** Masse de la pièce reprise d'un tas : un objet possédable, un objet du monde à sa longueur neuve, ou une pièce de bois. */
export function pieceMass(piece: PileDef['piece'], cat: MassCatalog = CONTENT): number {
  if ('item' in piece) return itemMass(piece.item, cat);
  if ('prop' in piece) return propMass(piece.prop, undefined, cat);
  return woodMass({ ...piece.wood, axis: 'ew' });
}

/** Masse d'un objet possédable, en kg. */
export function itemMass(key: string, cat: MassCatalog = CONTENT): number {
  const m = cat.items[key]?.mass;
  if (m === undefined) throw new Error(`items.json '${key}' : pas de masse`);
  return m;
}

/**
 * Masse d'un objet du monde, en kg. `length` : la longueur restante d'une quantité mesurée (le rouleau : sa masse est celle de sa
 * longueur neuve, au prorata) ; `wood` : les réglages d'une pièce de bois (absents : ceux de props.json). Plante, avec un message,
 * si l'objet n'a pas de masse ou si elle ne se calcule pas.
 */
export function propMass(key: string, length?: number, cat: MassCatalog = CONTENT, wood?: WoodPiece): number {
  const def = cat.props[key];
  const m = def?.mass;
  if (m === undefined) throw new Error(`props.json '${key}' : pas de masse`);
  if (m === 'wood') {
    const piece = wood ?? def.wood;
    if (!piece) throw new Error(`props.json '${key}' : 'mass: "wood"' sans réglages de pièce de bois ('wood')`);
    return woodMass(piece);
  }
  let kg: number;
  if (m === 'stone') kg = stoneMass(def.dims);
  else if (typeof m === 'number') kg = m;
  else {
    const g = cat.piles[m.pile];
    kg = capacity(g) * pieceMass(g.piece, cat) + (g.tie ? itemMass(g.tie.item, cat) : 0);
  }
  return def.length && length !== undefined ? (kg * length) / def.length.start : kg;
}

/** Masse de ce que tient une main (ou les deux mains), en kg. */
export function heldMass(h: Weighed | null | undefined, cat: MassCatalog = CONTENT): number {
  if (!h) return 0;
  return 'item' in h ? itemMass(h.item, cat) : propMass(h.prop, h.length, cat, h.wood);
}
