// Les masses : tout objet qu'on prend, pose ou roule a une masse en kg (validate.ts l'exige). Sans Phaser.
// - saisie (`mass` : un nombre dans items.json ou props.json) ;
// - calculée pour la pièce de bois (`"mass": "wood"`) : la section de son bois (ronde, demi, quart, moins ce que la doloire a ôté)
//   × sa longueur × la densité du bois vert de wood.json, d'après ses réglages ;
// - calculée pour la pierre : volume de la boîte de `dims` × densité de la pierre (`"mass": "stone"`) ;
// - calculée par sa matière (`"mass": { "matter": …, "fill": … }`, matters.json) : le volume de ses `dims` × la part qu'occupe la
//   matière × sa densité ; une matière naturelle (`natural`) pèse au cube de sa taille tirée (GameState) ;
// - calculée pour un fagot : la somme des branches d'un tas plein de son genre plus son lien (`{ "pile": genre }`) ;
// - au prorata de sa longueur pour une quantité mesurée (le rouleau de corde : 1 kg les 10 m).

import { items as itemDefs, matters as matterDefs, piles as pileDefs, props as propDefs, wood as woodDef } from './index';
import type { Dims } from './gabarit';
import type { ItemDef, Matter, MatterMass, Natural, PileDef, PropDef, WoodPiece } from './types';

/** Densité de la pierre, kg/m³ : celle de matters.json, une seule pour toutes les pierres (celle du bois est dans wood.json). */
export const STONE_DENSITY = matterDefs.stone.density;

/** Ce qu'il faut du contenu pour peser : mêmes tables que `src/content/index.ts` (validate.ts passe les siennes). */
export interface MassCatalog {
  props: Record<string, PropDef>;
  items: Record<string, ItemDef>;
  piles: Record<string, PileDef>;
  matters: Record<string, Matter>;
}

const CONTENT: MassCatalog = { props: propDefs, items: itemDefs, piles: pileDefs, matters: matterDefs };

/**
 * Ce qu'on peut tenir : un objet possédable (`item`) ou un objet du monde pris (`prop`, avec sa longueur s'il en a une, ses
 * réglages de pièce de bois) ; l'un ou l'autre, avec sa taille s'il est naturel (`natural`).
 */
export type Weighed = { item: string; natural?: Natural } | { prop: string; length?: number; wood?: WoodPiece; natural?: Natural };

/** Volume (m³) de dimensions réelles : une boîte, w × d × h ; un cylindre, π r² × sa longueur (son diamètre est sa hauteur) ; à plat, sans volume. */
export function dimsVolume(d: Dims): number {
  const [w, dd, h] = [d.w / 100, d.d / 100, d.h / 100];
  if (d.shape === 'cylinder') {
    const [len, dia] = d.axis === 'ew' ? [w, h] : d.axis === 'ns' ? [dd, h] : [h, w];
    return Math.PI * (dia / 2) ** 2 * len;
  }
  return w * dd * h;
}

/** Masse (kg) par la matière : le volume des `dims` × la part qu'occupe la matière × sa densité (matters.json). */
export function matterMass(d: Dims, m: MatterMass, cat: MassCatalog = CONTENT): number {
  const matter = cat.matters[m.matter];
  if (!matter) throw new Error(`matière « ${m.matter} » absente de matters.json`);
  return dimsVolume(d) * (m.fill ?? 1) * matter.density;
}

/** Ce que pèse un exemplaire naturel par rapport à la taille type : le cube de sa taille (110 % de taille : 1,33 fois plus lourd). */
export const naturalFactor = (n: Natural | undefined) => (n ? (n.size / 100) ** 3 : 1);

/**
 * Section du bois d'une pièce (m²) : le rond de son diamètre, la moitié pour une demi, le quart pour un quart, l'épaisseur × la
 * largeur pour une planche (`plank` de wood.json) ; la pièce qu'on
 * équarrit perd à chaque face finie un quart de ce qui sépare son rond du carré de la poutre (`hew.beam` de côté).
 */
export function woodSection(piece: WoodPiece): number {
  const size = woodDef.sizes[piece.size];
  if (!size) throw new Error(`wood.json : diamètre « ${piece.size} » inconnu`);
  const round = Math.PI * (size.diameter / 200) ** 2;
  if (piece.shape === 'half') return round / 2;
  if (piece.shape === 'quarter') return round / 4;
  if (piece.shape === 'plank') return (woodDef.plank.thick / 100) * (woodDef.plank.wide / 100);
  const hew = woodDef.hew;
  const faces = Math.min(hew.faces, Math.floor((piece.hewn ?? 0) / hew.perFace));
  return round - (faces / hew.faces) * (round - (hew.beam / 100) ** 2);
}

/** Masse d'une pièce de bois, en kg : sa section × sa longueur × la densité du bois vert (214 kg la bille de 1 m du gros). */
export function woodMass(piece: WoodPiece): number {
  return woodSection(piece) * (piece.length / 100) * woodDef.density;
}

/** Masse d'une pierre de ces dimensions (la boîte de ses `dims`, contour compris), en kg : 40 × 40 × 15 cm donne 62 kg. */
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

/** Masse d'un objet possédable, en kg (`natural` : sa taille tirée, s'il est naturel). */
export function itemMass(key: string, cat: MassCatalog = CONTENT, natural?: Natural): number {
  const it = cat.items[key];
  const m = it?.mass;
  if (m === undefined) throw new Error(`items.json '${key}' : pas de masse`);
  if (typeof m === 'number') return m * naturalFactor(natural);
  if (!it.dims) throw new Error(`items.json '${key}' : une masse par la matière demande ses dimensions ('dims')`);
  return matterMass(it.dims, m, cat) * naturalFactor(natural);
}

/**
 * Masse d'un objet du monde, en kg. `length` : la longueur restante d'une quantité mesurée (le rouleau : sa masse est celle de sa
 * longueur neuve, au prorata) ; `wood` : les réglages d'une pièce de bois (absents : ceux de props.json). Plante, avec un message,
 * si l'objet n'a pas de masse ou si elle ne se calcule pas.
 */
export function propMass(key: string, length?: number, cat: MassCatalog = CONTENT, wood?: WoodPiece, natural?: Natural): number {
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
  else if ('matter' in m) kg = matterMass(def.dims, m, cat) * naturalFactor(natural);
  else {
    const g = cat.piles[m.pile];
    kg = capacity(g) * pieceMass(g.piece, cat) + (g.tie ? itemMass(g.tie.item, cat) : 0);
  }
  return def.length && length !== undefined ? (kg * length) / def.length.start : kg;
}

/** Masse de ce que tient une main (ou les deux mains), en kg. */
export function heldMass(h: Weighed | null | undefined, cat: MassCatalog = CONTENT): number {
  if (!h) return 0;
  return 'item' in h ? itemMass(h.item, cat, h.natural) : propMass(h.prop, h.length, cat, h.wood, h.natural);
}
