import type Phaser from 'phaser';
import { propMass } from '../content/mass';
import type { Facing } from '../content/types';
import type { Player } from '../entities/Player';
import { changeObject, changeSpawned, game } from '../state';
import { propFootprint, propSize, stateOf, type Box, type GameMap, type Interactable, type PlacedProp } from '../world/GameMap';
import { defOf } from '../world/woodPiece';
import { turnedWood } from '../world/woodShape';
import type { RollSystem } from './roll';

const SIDES: Facing[] = ['down', 'up', 'left', 'right'];

/**
 * Pivoter une bille couchée (`turn` de props.json) : Xéros, les deux mains libres, au contact d'une bille de n'importe quel
 * côté, maintient R (la jauge de systems/longPress.ts, `TURN_PRESS`) ; la bille fait un quart de tour autour du centre de sa
 * collision (est-ouest <-> nord-sud). La nouvelle emprise doit être libre (carte, objets, tas, personnages) ; Xéros, qu'elle
 * pourrait toucher du bout, est repoussé d'autant s'il y a la place, sinon rien ne bouge. Le prix en endurance est
 * proportionnel à la masse : la scène le paie. Ne lit pas le clavier.
 */
export class TurnSystem {
  constructor(
    private readonly map: GameMap,
    private readonly roll: RollSystem,
    /** Corps où une bille ne passe pas (les personnages). */
    private readonly others: Phaser.Physics.Arcade.Body[],
    private readonly scene: Phaser.Scene,
  ) {}

  /** La bille qui peut pivoter sous la main de Xéros : mains libres, au contact (le côté qu'il regarde d'abord). */
  target(player: Player): Interactable | undefined {
    if (game.both || game.hands[0] || game.hands[1]) return undefined;
    for (const side of [player.actor.facing, ...SIDES.filter((s) => s !== player.actor.facing)]) {
      const p = this.roll.touching(player, side);
      if (p?.def.turn) return { x: p.baseX, y: p.baseY, top: p.top, action: { kind: 'turn', prop: p } };
    }
    return undefined;
  }

  /** Masse de la bille visée, en kg. */
  mass(p: PlacedProp): number {
    return propMass(p.type, p.length, undefined, p.wood);
  }

  /** Fait pivoter `p`. Renvoie le message à dire si elle n'a pas la place, sinon undefined. */
  act(player: Player, p: PlacedProp): string | undefined {
    if (p.wood?.notch) return "Finis d'abord la coupe.";
    if (p.wood?.wedge) return 'Le coin est planté : finis de la fendre.';
    const into = p.def.turn!.into;
    // la pièce de bois garde tous ses réglages, seul son sens change (le rondin de 3 m tourné reste un rondin de 3 m)
    const wood = p.wood && turnedWood(p.wood);
    const def = defOf(into, wood);
    const img = propSize(this.scene, def);
    const nb = propFootprint(this.scene, def)!;
    const ob = p.box!;
    const cx = (ob.left + ob.right) / 2;
    const cy = (ob.top + ob.bottom) / 2;
    const x = Math.round(cx - (nb.left + nb.right) / 2);
    const top = Math.round(cy - (nb.top + nb.bottom) / 2);
    const box: Box = { left: x + nb.left, right: x + nb.right, top: top + nb.top, bottom: top + nb.bottom };
    const own = p.parts.filter((q): q is Phaser.GameObjects.Zone => q.type === 'Zone');
    const nope = 'Pas la place pour la tourner.';
    if (!this.map.areaFree(box, this.others, own)) return nope;
    const push = this.pushAway(player, box);
    if (push === null) return nope;

    const spawned = { spawned: p.spawned, chain: p.chain, length: p.length, wood };
    this.map.removeProp(p);
    const placed = this.map.placeProp({ id: p.id, type: into, x, y: top + img.h }, spawned);
    const change = stateOf(placed);
    if (p.spawned) changeSpawned(game, this.map.def.id, p.id, change);
    else changeObject(game, this.map.def.id, p.id, change);
    if (push) player.actor.body.reset(player.actor.x + push.dx, player.actor.y + push.dy);
    this.puff((box.left + box.right) / 2, box.bottom);
    return undefined;
  }

  /**
   * Si la nouvelle emprise recouvre Xéros : de combien le repousser (sur l'axe où elle le recouvre le moins), à condition que
   * la place où il se retrouve soit libre. Rien à faire : undefined. Pas la place : null.
   */
  private pushAway(player: Player, nb: Box): { dx: number; dy: number } | null | undefined {
    const b = player.actor.body;
    if (!(b.left < nb.right && b.right > nb.left && b.top < nb.bottom && b.bottom > nb.top)) return undefined;
    const east = (b.left + b.right) / 2 > (nb.left + nb.right) / 2;
    const south = (b.top + b.bottom) / 2 > (nb.top + nb.bottom) / 2;
    const ox = east ? nb.right - b.left : -(b.right - nb.left);
    const oy = south ? nb.bottom - b.top : -(b.bottom - nb.top);
    const move = Math.abs(ox) <= Math.abs(oy) ? { dx: ox, dy: 0 } : { dx: 0, dy: oy };
    const moved: Box = { left: b.left + move.dx, right: b.right + move.dx, top: b.top + move.dy, bottom: b.bottom + move.dy };
    return this.map.areaFree(moved, this.others) ? move : null;
  }

  /** Un petit nuage de poussière au pied de la bille (la fumée des cheminées, teintée de terre : aucun dessin nouveau). */
  private puff(x: number, y: number): void {
    const dust = this.scene.add
      .particles(x, y, 'smoke', {
        speed: { min: 8, max: 26 },
        lifespan: 500,
        scale: { start: 0.5, end: 1.3 },
        alpha: { start: 0.55, end: 0 },
        tint: 0xb89a6a,
        emitting: false,
      })
      .setDepth(y + 1);
    dust.explode(7);
    this.scene.time.delayedCall(700, () => dust.destroy());
  }
}
