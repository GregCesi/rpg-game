import { piles, props } from '../content';
import { addPile, changeObject, changeSpawned, game, removePile } from '../state';
import { groundCenter, type Action, type GameMap, type PlacedPile, type PlacedProp } from '../world/GameMap';
import { shapeOf } from '../world/pileShape';
import type { HandsSystem } from './hands';

/** Genre de tas dont le lien noue l'objet `prop` (le fagot : `tie.into` des branches), s'il y en a un. */
function bundleOf(prop: string): string | undefined {
  return Object.keys(piles).find((k) => piles[k].tie?.into === prop);
}

/** Le genre de tas que le tas `p` redevient dénoué (un tas de fagots : les branches), si ses pièces se dénouent. */
function untiesInto(p: PlacedPile): string | undefined {
  const piece = p.def.piece;
  return 'prop' in piece ? bundleOf(piece.prop) : undefined;
}

/**
 * Nouer et dénouer, avec E maintenu (systems/longPress.ts fait la différence avec E court). Un tas plein et lié (`tie` de
 * piles.json) se noue : il devient l'objet de `tie.into` (le fagot), posé seul à sa place, un tas d'une pièce de son
 * genre. Un fagot seul (un tas d'une pièce, ou posé hors d'un tas) se dénoue : il redevient le tas plein de son genre,
 * avec son lien, à sa place. Tout passe par GameState. Ne lit pas le clavier : la scène dit quoi et quand.
 */
export class KnotSystem {
  constructor(
    private readonly map: GameMap,
    private readonly hands: HandsSystem,
  ) {}

  /** E maintenu a un sens devant cette cible : un tas qui se lie (nouer), un fagot (dénouer). */
  holds(a: Action): boolean {
    if (a.kind === 'pile' || a.kind === 'tie') return !!a.pile.def.tie || !!untiesInto(a.pile);
    if (a.kind === 'take') return !!bundleOf(a.prop.type);
    return false;
  }

  /** E maintenu devant `a` : noue ou dénoue. Renvoie le message à dire si rien ne s'est fait, sinon undefined. */
  act(a: Action): string | undefined {
    if (game.both || game.hands[0] || game.hands[1]) return 'Les mains pleines.';
    if (a.kind === 'take') return this.untieProp(a.prop);
    if (a.kind !== 'pile' && a.kind !== 'tie') return undefined;
    if (a.pile.def.tie) return this.tie(a.pile);
    return this.untiePile(a.pile);
  }

  /** Noue un tas plein et lié : il devient un tas d'une pièce de `tie.into` (un fagot seul), centré à sa place, dans son sens. */
  private tie(p: PlacedPile): string | undefined {
    const tie = p.def.tie!;
    if (!p.pile.tie) return 'Il faut un lien.';
    if (p.pile.places.length < Object.keys(p.def.places).length) return 'Pas assez de branches.';
    const genre = props[tie.into].take!.pile!;
    const turned = !!p.pile.turned;
    const def = shapeOf(piles[genre], turned);
    const b = def.places[def.start].body!;
    const [cx, cy] = groundCenter(p.def);
    const x = Math.round(p.pile.x + cx - (b.x + b.w / 2));
    const y = Math.round(p.pile.y + cy - (b.y + b.h / 2));
    if (!this.hands.pileFree(genre, turned, x, y, [def.start], p)) return 'Pas la place ici.';
    this.replacePile(p, { pile: genre, x, y, places: [def.start], ...(turned ? { turned } : {}) });
    return undefined;
  }

  /** Dénoue un fagot seul d'un tas : le tas plein de branches et son lien, centré sur le fagot. */
  private untiePile(p: PlacedPile): string | undefined {
    if (p.pile.places.length > 1) return 'Un seul fagot à la fois.';
    const b = p.def.places[p.pile.places[0]].body!;
    return this.untie(p.pile.x + b.x + b.w / 2, p.pile.y + b.y + b.h / 2, untiesInto(p)!, !!p.pile.turned, p);
  }

  /** Dénoue un fagot posé hors d'un tas (outils de test) : il quitte la carte, le tas plein de branches prend sa place. */
  private untieProp(prop: PlacedProp): string | undefined {
    const box = prop.box ?? { left: prop.baseX, right: prop.baseX, top: prop.baseY, bottom: prop.baseY };
    return this.untie((box.left + box.right) / 2, (box.top + box.bottom) / 2, bundleOf(prop.type)!, false, undefined, prop);
  }

  /**
   * Pose le tas plein et lié du genre `genre`, dans le sens `turned`, son emprise au sol centrée sur (cx, cy), à la place du tas
   * `own` ou de l'objet `prop` qu'il remplace ; sans la place, rien ne change.
   */
  private untie(cx: number, cy: number, genre: string, turned: boolean, own?: PlacedPile, prop?: PlacedProp): string | undefined {
    const def = shapeOf(piles[genre], turned);
    const [gx, gy] = groundCenter(def);
    const x = Math.round(cx - gx);
    const y = Math.round(cy - gy);
    const places = Object.keys(def.places);
    if (!this.hands.pileFree(genre, turned, x, y, places, own, prop)) return 'Pas la place ici.';
    const pile = { pile: genre, x, y, places, tie: true, ...(turned ? { turned } : {}) };
    if (own) return this.replacePile(own, pile);
    const p = prop!;
    if (p.spawned) changeSpawned(game, this.map.def.id, p.id, { x: p.x, y: p.y });
    else changeObject(game, this.map.def.id, p.id, { x: p.x, y: p.y });
    this.map.removeProp(p);
    this.map.placePile(addPile(game, this.map.def.id, pile));
    return undefined;
  }

  /** Le tas `old` est remplacé par `pile`, dans GameState et à l'écran. */
  private replacePile(old: PlacedPile, pile: Parameters<typeof addPile>[2]): undefined {
    const mapId = this.map.def.id;
    removePile(game, mapId, old.pile.id);
    this.map.removePile(old);
    this.map.placePile(addPile(game, mapId, pile));
    return undefined;
  }
}
