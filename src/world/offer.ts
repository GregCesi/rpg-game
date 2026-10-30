// Ce qu'on apporte à une place (tas ou chantier), d'après ce que tient la main : sa clé et, s'il s'entrepose, ce qu'entrepose son
// tas. Sans Phaser. Le moteur de places (places.ts) compare cette offre à ce que la place accepte.
import { items, props } from '../content';
import type { Held } from '../state';
import { kindKey, type PileKind } from './pileShape';
import type { Offer } from './places';
import { pileWoodOf } from './woodPile';

/**
 * Ce qu'entreposerait en tas ce qu'on tient, s'il va en tas : un genre écrit (`pile` de items.json, ou du `take` de props.json),
 * ou une pièce de bois (world/woodPile.ts : sans coupe ni coin, pas plus lourde que ce que porte Xéros).
 */
export function pileOf(what: Held): PileKind | undefined {
  if ('item' in what) return items[what.item].pile ? { pile: items[what.item].pile! } : undefined;
  if (what.wood) {
    const wood = pileWoodOf(what.wood);
    return wood && { wood };
  }
  const pile = props[what.prop].take?.pile;
  return pile ? { pile } : undefined;
}

/** Ce que présente ce qu'on tient : sa clé (objet possédable ou objet du monde), ce qu'entreposerait son tas (`kindKey`) et, pour une pièce de bois, ses réglages. */
export function offerOf(what: Held | undefined): Offer | undefined {
  if (!what) return undefined;
  const kind = pileOf(what);
  return { genre: kind && kindKey(kind), ...('item' in what ? { item: what.item } : { prop: what.prop, wood: what.wood }) };
}
