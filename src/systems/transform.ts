// La transformation « magique » (docs/CONCEPTION.md, « Les matières ») : en attendant que son geste soit codé, une transformation de
// transforms.json s'applique d'un coup, depuis les outils de test (?dieu, « Transformer »), à ce que Xéros tient ou vise. Ce qui
// entre se cherche dans ses mains, puis au sol près de lui (`TRANSFORM.near`), le plus près du point qu'il regarde d'abord ; la
// matière prise au poste (l'eau de l'étang, l'argile de la berge) est donnée, le poste et les outils ne sont pas vérifiés : c'est le
// geste qui les demandera. Ce qui entre disparaît ; ce qui sort va dans la main libérée s'il y tient, sinon au sol à côté ; le
// déchet reste au sol s'il a un objet (`waste.prop` : les éclats), sinon il disparaît. Tout passe par GameState.

import { INTERACT, TRANSFORM } from '../config';
import { items, matters, props, transforms } from '../content';
import { heldMass } from '../content/mass';
import type { Player } from '../entities/Player';
import type { TransformPart, WoodPiece } from '../content/types';
import { canTake, changeObject, changeSpawned, clearHeld, game, removeGroundItem, take, type Hand, type Held } from '../state';
import type { GameMap, PlacedGround, PlacedProp } from '../world/GameMap';
import { kilos, naturalFor } from '../world/natural';
import { partName, partWood } from '../world/transform';
import { defOf, WOOD_PIECE } from '../world/woodPiece';
import type { HandsSystem } from './hands';

/** Une chose qui peut entrer : tenue (dans une main, ou les deux), au sol (objet possédable) ou posée (objet du monde). */
type Source = { hand: Hand | 'both'; held: Held } | { ground: PlacedGround } | { prop: PlacedProp };

/** Ce que tient ou présente une source, comme on le tiendrait. */
function heldOf(s: Source): Held {
  if ('hand' in s) return s.held;
  if ('ground' in s) return { item: s.ground.item.item, ...(s.ground.item.natural ? { natural: s.ground.item.natural } : {}) };
  const p = s.prop;
  return { prop: p.type, ...(p.wood ? { wood: p.wood } : {}), ...(p.natural ? { natural: p.natural } : {}), ...(p.length !== undefined ? { length: p.length } : {}) };
}

/** La pièce de bois d'une entrée convient : même diamètre, même forme, mêmes coups de doloire ; ni coupe en cours, ni coin, ni debout. */
function woodFits(part: NonNullable<TransformPart['wood']>, w: WoodPiece): boolean {
  if (w.notch || w.wedge || w.axis === 'up') return false;
  if (part.length !== undefined && part.length !== w.length) return false;
  return w.size === part.size && w.shape === part.shape && (w.hewn ?? 0) === (part.hewn ?? 0);
}

/** Une source est ce que demande l'entrée `part`. */
function fits(part: TransformPart, h: Held): boolean {
  if (part.item) return 'item' in h && h.item === part.item;
  if (part.prop) return 'prop' in h && h.prop === part.prop && !h.wood;
  if (part.wood) return 'prop' in h && !!h.wood && woodFits(part.wood, h.wood);
  return false;
}

/** Ce que tient Xéros, chaque main à part : la main active d'abord. */
function handSources(): Source[] {
  if (game.both) return [{ hand: 'both', held: game.both }];
  const out: Source[] = [];
  for (const slot of [game.active, (1 - game.active) as Hand]) {
    const h = game.hands[slot];
    if (h) out.push({ hand: slot, held: h });
  }
  return out;
}

const NAMES = { items, props, matters };

/** Les transformations des outils de test : chercher, retirer, faire naître. Ne lit pas le clavier. */
export class TransformSystem {
  constructor(
    private readonly map: GameMap,
    private readonly hands: HandsSystem,
  ) {}

  /** Ce qui est au sol près de Xéros, le plus près du point qu'il regarde d'abord. */
  private nearSources(player: Player): Source[] {
    const probe = player.probe(INTERACT.reach);
    const feet = { x: player.actor.x, y: player.actor.y };
    const out: { s: Source; d: number }[] = [];
    for (const g of this.map.ground) {
      if (Math.hypot(g.item.x - feet.x, g.item.y - feet.y) > TRANSFORM.near) continue;
      out.push({ s: { ground: g }, d: Math.hypot(g.item.x - probe.x, g.item.y - probe.y) });
    }
    for (const p of this.map.props) {
      if (!p.image.visible || Math.hypot(p.baseX - feet.x, p.baseY - feet.y) > TRANSFORM.near) continue;
      out.push({ s: { prop: p }, d: Math.hypot(p.aimX - probe.x, p.aimY - probe.y) });
    }
    return out.sort((a, b) => a.d - b.d).map((o) => o.s);
  }

  /**
   * Applique la transformation `id` d'un coup. Renvoie ce qu'il faut dire : ce qui est sorti et le déchet, ou ce qui manque (rien
   * n'est alors changé).
   */
  apply(player: Player, id: string): string {
    const t = transforms[id];
    if (!t) return `Transformation « ${id} » inconnue.`;
    // les entrées : d'abord dans les mains, puis au sol près de lui
    const pool = [...handSources(), ...this.nearSources(player)];
    const used: Source[] = [];
    const missing: string[] = [];
    for (const part of t.inputs) {
      if (part.raw) continue;
      for (let k = 0; k < part.count; k++) {
        const s = pool.find((q) => !used.includes(q) && fits(part, heldOf(q)));
        if (s) used.push(s);
        else missing.push(partName({ ...part, count: 1 }, NAMES));
      }
    }
    if (missing.length) return `Il manque : ${[...new Set(missing)].join(', ')}.`;

    // la longueur d'une pièce de bois qui sort sans longueur à elle : celle de la pièce qui entre
    const inWood = used.map(heldOf).find((h): h is Extract<Held, { prop: string }> => 'prop' in h && !!h.wood)?.wood;
    const outputs: Held[] = t.outputs.flatMap((part) => Array.from({ length: part.count }, () => this.made(part, inWood)));

    // ce qui entre disparaît ; une main libérée reçoit la première sortie qui y tient
    const kgIn = used.reduce((s, q) => s + heldMass(heldOf(q)), 0) + t.inputs.reduce((s, p) => s + (p.kg ?? 0), 0);
    const freed = used.some((q) => 'hand' in q);
    for (const q of used) this.remove(q);
    const kgOut = outputs.reduce((s, h) => s + heldMass(h), 0);
    let inHand = false;
    for (const h of outputs) {
      const hands = 'item' in h ? items[h.item].hands : defOf(h.prop, h.wood).take?.hands;
      if (freed && !inHand && hands && canTake(game, hands) && heldMass(h) <= player.strength.carry && take(game, h, hands)) {
        inHand = true;
        continue;
      }
      // sans place libre à côté, à ses pieds : rien de ce qui sort ne se perd
      if (!this.hands.layHeld(player, h)) this.hands.layDown(player, h);
    }
    if (t.waste?.prop) this.hands.layHeld(player, { prop: t.waste.prop });

    const said = t.outputs.map((p) => partName(p, NAMES)).join(', ');
    const waste = t.waste ? ` ; ${t.waste.name} : ${kilos(Math.max(0, kgIn - kgOut))}${t.waste.prop ? ', au sol' : ''}` : '';
    return `${said[0].toUpperCase()}${said.slice(1)} : ${kilos(kgOut)}${waste}.`;
  }

  /** Ce qui sort, comme on le tiendrait : un objet possédable ou du monde (naturel : sa forme et sa taille tirées), une pièce de bois. */
  private made(part: TransformPart, inWood: WoodPiece | undefined): Held {
    if (part.item) {
      const natural = naturalFor(items[part.item]);
      return { item: part.item, ...(natural ? { natural } : {}) };
    }
    if (part.prop) {
      const natural = naturalFor(props[part.prop]);
      return { prop: part.prop, ...(natural ? { natural } : {}) };
    }
    return { prop: WOOD_PIECE, wood: { ...partWood(part, inWood?.length), axis: inWood?.axis === 'ns' ? 'ns' : 'ew' } };
  }

  /** Retire une entrée : de la main (ou des deux), du sol, ou de la carte (GameState et écran). */
  private remove(s: Source): void {
    const mapId = this.map.def.id;
    if ('hand' in s) return clearHeld(game, s.hand);
    if ('ground' in s) {
      removeGroundItem(game, mapId, s.ground.item.id);
      this.map.removeGround(s.ground);
      return;
    }
    const p = s.prop;
    if (p.spawned) changeSpawned(game, mapId, p.id, { x: p.x, y: p.y });
    else changeObject(game, mapId, p.id, { x: p.x, y: p.y });
    this.map.removeProp(p);
  }
}
