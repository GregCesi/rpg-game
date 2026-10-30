// Les masses : tout objet qu'on prend, pose ou roule a une masse en kg (validate.ts l'exige). Sans Phaser.
// - saisie (`mass` : un nombre dans items.json ou props.json) ;
// - calculée pour le bois : volume du tronc tiré de `dims` × densité du bois vert (`"mass": "wood"`) ;
// - calculée pour la pierre : volume de la boîte de `dims` × densité de la pierre (`"mass": "stone"`) ;
// - une part d'un autre objet de bois (`{ "share": 0.25, "of": "big-felled-log" }` : le quartier, un quart de la bille) ;
// - calculée pour un fagot : la somme des branches d'un tas plein de son genre plus son lien (`{ "pile": genre }`) ;
// - au prorata de sa longueur pour une quantité mesurée (le rouleau de corde : 1 kg les 10 m).

import { items as itemDefs, piles as pileDefs, props as propDefs } from './index';
import { CONTOUR_CM } from './gabarit';
import type { Dims } from './gabarit';
import type { ItemDef, PileDef, PropDef } from './types';

/** Densité du bois vert, kg/m³ : une seule constante pour toutes les pièces de bois. */
export const WOOD_DENSITY = 900;

/** Densité de la pierre, kg/m³ : une seule constante pour toutes les pierres, à côté de celle du bois. */
export const STONE_DENSITY = 2600;

/** Ce qu'il faut du contenu pour peser : mêmes tables que `src/content/index.ts` (validate.ts passe les siennes). */
export interface MassCatalog {
  props: Record<string, PropDef>;
  items: Record<string, ItemDef>;
  piles: Record<string, PileDef>;
}

const CONTENT: MassCatalog = { props: propDefs, items: itemDefs, piles: pileDefs };

/** Ce qu'on peut tenir : un objet possédable (`item`) ou un objet du monde pris (`prop`, avec sa longueur s'il en a une). */
export type Weighed = { item: string } | { prop: string; length?: number };

/**
 * Pièce de bois cylindrique couchée (ou debout) : sa longueur, et le diamètre de son tronc, c'est-à-dire de ses dimensions
 * moins le contour d'un pixel de chaque côté (la bille de 65 cm contour compris est un tronc de 55 cm).
 */
export function woodShape(d: Dims): { length: number; diameter: number } {
  const [length, a, b] = d.axis === 'ew' ? [d.w, d.d, d.h] : d.axis === 'ns' ? [d.d, d.w, d.h] : [d.h, d.w, d.d];
  return { length, diameter: Math.min(a, b) - CONTOUR_CM };
}

/** Masse d'une pièce de bois cylindrique de ces dimensions, en kg. */
export function woodMass(d: Dims): number {
  const { length, diameter } = woodShape(d);
  return Math.PI * (diameter / 200) ** 2 * (length / 100) * WOOD_DENSITY;
}

/** Masse d'une pierre de ces dimensions (la boîte de ses `dims`, contour compris), en kg : 30 × 30 × 15 cm donne 35 kg. */
export function stoneMass(d: Dims): number {
  return (d.w / 100) * (d.d / 100) * (d.h / 100) * STONE_DENSITY;
}

/** Nombre de places d'un genre de tas (son maximum). */
const capacity = (g: PileDef) => Object.keys(g.places).length;

/** Masse de la pièce reprise d'un tas : un objet possédable ou un objet du monde, à sa longueur neuve. */
function pieceMass(piece: PileDef['piece'], cat: MassCatalog): number {
  return 'item' in piece ? itemMass(piece.item, cat) : propMass(piece.prop, undefined, cat);
}

/** Masse d'un objet possédable, en kg. */
export function itemMass(key: string, cat: MassCatalog = CONTENT): number {
  const m = cat.items[key]?.mass;
  if (m === undefined) throw new Error(`items.json '${key}' : pas de masse`);
  return m;
}

/**
 * Masse d'un objet du monde, en kg. `length` : la longueur restante d'une quantité mesurée (le rouleau : sa masse est celle
 * de sa longueur neuve, au prorata). Plante, avec un message, si l'objet n'a pas de masse ou si elle ne se calcule pas.
 */
export function propMass(key: string, length?: number, cat: MassCatalog = CONTENT): number {
  const def = cat.props[key];
  const m = def?.mass;
  if (m === undefined) throw new Error(`props.json '${key}' : pas de masse`);
  let kg: number;
  if (m === 'wood') kg = woodMass(def.dims);
  else if (m === 'stone') kg = stoneMass(def.dims);
  else if (typeof m === 'number') kg = m;
  else if ('share' in m) kg = m.share * propMass(m.of, undefined, cat);
  else {
    const g = cat.piles[m.pile];
    kg = capacity(g) * pieceMass(g.piece, cat) + (g.tie ? itemMass(g.tie.item, cat) : 0);
  }
  return def.length && length !== undefined ? (kg * length) / def.length.start : kg;
}

/** Masse de ce que tient une main (ou les deux mains), en kg. */
export function heldMass(h: Weighed | null | undefined, cat: MassCatalog = CONTENT): number {
  if (!h) return 0;
  return 'item' in h ? itemMass(h.item, cat) : propMass(h.prop, h.length, cat);
}
