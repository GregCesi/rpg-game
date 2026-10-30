// Ce qu'on apporte à une place (tas ou chantier), d'après ce que tient la main : sa clé et, s'il s'entrepose, son genre de tas.
// Sans Phaser. Le moteur de places (places.ts) compare cette offre à ce que la place accepte.
import { items, props } from '../content';
import type { Held } from '../state';
import type { Offer } from './places';
import { woodPile } from './woodPiece';

/**
 * Genre de tas où s'entrepose ce qu'on tient (`pile` de items.json, ou du `take` de props.json), s'il en a un. Une pièce de bois
 * va au tas dont la pièce a son diamètre, sa forme et sa longueur (pour l'instant 1 m), sans face dressée.
 */
export function pileOf(what: Held): string | undefined {
  if ('item' in what) return items[what.item].pile;
  if (what.wood) return woodPile(what.wood);
  return props[what.prop].take?.pile;
}

/** Ce que présente ce qu'on tient : sa clé (objet possédable ou objet du monde) et son genre de tas. */
export function offerOf(what: Held | undefined): Offer | undefined {
  if (!what) return undefined;
  return { genre: pileOf(what), ...('item' in what ? { item: what.item } : { prop: what.prop }) };
}
