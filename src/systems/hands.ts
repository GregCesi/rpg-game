import type Phaser from 'phaser';
import { PUT_DOWN } from '../config';
import { props } from '../content';
import type { Player } from '../entities/Player';
import { changeObject, changeSpawned, dropItem, game, held, release, spawnObject, take, type Held } from '../state';
import { footprint, type Box, type GameMap, type PlacedProp } from '../world/GameMap';

/** Ce qu'a donné « poser devant soi » : rien en main, pas de place libre devant, ou posé. */
export type PutDownResult = 'empty' | 'blocked' | 'done';

/**
 * Les mains de Xéros sur la carte : prendre un objet du monde (la bille), poser ou lâcher devant soi ce qu'on tient.
 * Les objets pris quittent la carte, ceux qu'on pose y reviennent à leur nouvelle place : tout est noté dans GameState.
 * Ramasser un objet au sol et récolter restent ailleurs (WorldScene, harvest.ts). Ne lit pas le clavier.
 */
export class HandsSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    /** Corps où l'on ne pose rien (les personnages). */
    private readonly others: Phaser.Physics.Arcade.Body[],
  ) {}

  /**
   * Prend un objet du monde dans les mains (les deux s'il le demande) : il quitte la carte et GameState l'oublie là
   * (objet né retiré, objet de Tiled noté disparu). Renvoie false si les mains ne sont pas libres.
   */
  takeProp(p: PlacedProp): boolean {
    if (!take(game, { prop: p.type, ...(p.flip ? { flip: true } : {}) }, p.def.take!.hands)) return false;
    const mapId = this.map.def.id;
    if (p.spawned) changeSpawned(game, mapId, p.id, { x: p.x, y: p.y });
    else changeObject(game, mapId, p.id, { x: p.x, y: p.y });
    this.map.removeProp(p);
    // la voisine d'un tronc couché montre sa face de coupe
    this.map.refreshTrunk();
    return true;
  }

  /**
   * Pose devant Xéros ce que tient la main active (ou les deux mains), à une place libre seulement :
   * un objet possédable au sol, un objet du monde sur la carte (objet né, à sa nouvelle place).
   */
  putDown(player: Player): PutDownResult {
    const what = held(game);
    if (!what) return 'empty';
    const spot = 'item' in what ? this.groundSpot(player) : this.propSpot(player, what);
    if (!spot) return 'blocked';
    release(game);
    const mapId = this.map.def.id;
    if ('item' in what) this.map.placeGround(dropItem(game, mapId, what.item, spot.x, spot.y));
    else this.map.placeProp(spawnObject(game, mapId, what.prop, spot.x, spot.y, !!what.flip), { flip: what.flip, spawned: true });
    return 'done';
  }

  /** Point au sol juste devant Xéros pour un objet possédable, s'il est libre (un petit carré autour). */
  private groundSpot(player: Player): { x: number; y: number } | undefined {
    const b = player.actor.body;
    const [sx, sy] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[player.actor.facing];
    // juste au-delà de sa collision, du côté où il regarde ; (x, y) = le point au sol, en bas de l'icône
    const x = Math.round(b.center.x + sx * (b.width / 2 + PUT_DOWN.gap + 4));
    const y = Math.round(b.center.y + sy * (b.height / 2 + PUT_DOWN.gap + 4) + 3);
    const free = this.map.areaFree({ left: x - 4, top: y - 6, right: x + 4, bottom: y }, this.others);
    return free ? { x, y } : undefined;
  }

  /**
   * Coin bas gauche où poser l'objet du monde `what` pour que sa collision touche presque celle de Xéros, du côté où il
   * regarde, centrée sur lui ; undefined si la place n'est pas libre (carte, cases bloquantes, objets, personnages).
   */
  private propSpot(player: Player, what: Extract<Held, { prop: string }>): { x: number; y: number } | undefined {
    const def = props[what.prop];
    const flip = !!what.flip;
    const { width: w, height: h } = this.scene.textures.get(flip ? `${def.image}-left` : def.image).getSourceImage() as HTMLImageElement;
    const f = footprint(def, w, h, flip) ?? { left: 0, top: 0, right: w, bottom: h };
    const fw = f.right - f.left;
    const fh = f.bottom - f.top;
    const b = player.actor.body;
    const g = PUT_DOWN.gap;
    // coin haut gauche de sa collision, dans la carte
    const [l, t] = {
      down: [b.center.x - fw / 2, b.bottom + g],
      up: [b.center.x - fw / 2, b.top - g - fh],
      right: [b.right + g, b.center.y - fh / 2],
      left: [b.left - g - fw, b.center.y - fh / 2],
    }[player.actor.facing];
    const x = Math.round(l - f.left);
    const y = Math.round(t - f.top + h);
    const box: Box = { left: x + f.left, top: y - h + f.top, right: x + f.right, bottom: y - h + f.bottom };
    return this.map.areaFree(box, [...this.others, b]) ? { x, y } : undefined;
  }
}
