import type Phaser from 'phaser';
import { PUT_DOWN, TILE } from '../config';
import { items, piles, props } from '../content';
import type { Facing, PileDef } from '../content/types';
import type { Player } from '../entities/Player';
import { changeObject, changeSpawned, dropItem, game, held, release, setPileCount, spawnObject, startPile, take, type Held } from '../state';
import { footprint, pieceImage, pileBox, type Box, type GameMap, type PlacedPile, type PlacedProp } from '../world/GameMap';

/** Ce qu'a donné « poser devant soi » : rien en main, pas de place libre devant, ou posé. */
export type PutDownResult = 'empty' | 'blocked' | 'done';

/** Genre de tas où s'entrepose ce qu'on tient (`pile` de items.json, ou du `take` de props.json), s'il en a un. */
function pileOf(what: Held): string | undefined {
  return 'item' in what ? items[what.item].pile : props[what.prop].take?.pile;
}

/**
 * Coin haut gauche d'une boîte de fw × fh qui touche presque la collision `b` de Xéros (écart `PUT_DOWN.gap`), du côté
 * `facing`, centrée sur lui.
 */
function frontCorner(b: Phaser.Physics.Arcade.Body, facing: Facing, fw: number, fh: number): [number, number] {
  const g = PUT_DOWN.gap;
  const corners: Record<Facing, [number, number]> = {
    down: [b.center.x - fw / 2, b.bottom + g],
    up: [b.center.x - fw / 2, b.top - g - fh],
    right: [b.right + g, b.center.y - fh / 2],
    left: [b.left - g - fw, b.center.y - fh / 2],
  };
  return corners[facing];
}

const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Les mains de Xéros sur la carte : prendre un objet du monde (la bille), poser ou lâcher devant soi ce qu'on tient,
 * entreposer en tas et reprendre d'un tas. Ce qui a un genre de tas (piles.json) se pose toujours en tas : sur le tas du
 * même genre devant soi s'il n'est pas plein, sinon en commençant un tas d'une pièce à une place libre.
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
   * Reprend une pièce d'un tas dans les mains (la pièce ordinaire du genre : la bille, la branche) ; le tas rétrécit,
   * et disparaît à la dernière. Renvoie false si les mains ne sont pas libres.
   */
  takeFromPile(p: PlacedPile): boolean {
    const piece = p.def.piece;
    const hands = 'item' in piece ? items[piece.item].hands : props[piece.prop].take!.hands;
    if (!take(game, { ...piece }, hands)) return false;
    const last = p.pile.count === 1;
    setPileCount(game, this.map.def.id, p.pile.id, p.pile.count - 1);
    if (last) this.map.removePile(p);
    else this.map.refreshPile(p);
    return true;
  }

  /**
   * Pose devant Xéros ce que tient la main active (ou les deux mains), à une place libre seulement :
   * en tas s'il a un genre de tas, sinon un objet possédable au sol, un objet du monde sur la carte (objet né, à sa nouvelle place).
   */
  putDown(player: Player): PutDownResult {
    const what = held(game);
    if (!what) return 'empty';
    const pile = pileOf(what);
    if (pile) return this.putOnPile(player, pile);
    const spot = 'item' in what ? this.groundSpot(player) : this.propSpot(player, what);
    if (!spot) return 'blocked';
    release(game);
    const mapId = this.map.def.id;
    if ('item' in what) this.map.placeGround(dropItem(game, mapId, what.item, spot.x, spot.y));
    else this.map.placeProp(spawnObject(game, mapId, what.prop, spot.x, spot.y, !!what.flip), { flip: what.flip, spawned: true });
    return 'done';
  }

  /**
   * Pose en tas du genre `pile` : sur le tas du même genre devant Xéros s'il n'a pas atteint son maximum (et si sa forme
   * suivante tient à une place libre), sinon commence un tas d'une pièce à une place libre devant lui.
   */
  private putOnPile(player: Player, pile: string): PutDownResult {
    const def = piles[pile];
    const mapId = this.map.def.id;
    const front = this.pileInFront(player, def);
    if (front && front.pile.pile === pile && front.pile.count < def.layouts.length) {
      const grown = pileBox(def, front.pile.count + 1, front.pile.x, front.pile.y, this.pieceHeight(def));
      if (!this.map.areaFree(grown, this.others, front.parts)) return 'blocked';
      // le tas qui grandit vers Xéros : il recule d'autant, si sa place derrière lui est libre
      if (!this.stepBack(player, grown)) return 'blocked';
      release(game);
      setPileCount(game, mapId, front.pile.id, front.pile.count + 1);
      this.map.refreshPile(front);
      return 'done';
    }
    const spot = this.newPileSpot(player, def, !!front);
    if (!spot) return 'blocked';
    release(game);
    this.map.placePile(startPile(game, mapId, pile, spot.x, spot.y));
    return 'done';
  }

  /**
   * Si la boîte `box` (le tas à sa forme suivante) mord sur Xéros, il recule à l'opposé de son regard juste assez pour
   * garder l'écart de pose. Renvoie false si sa place en reculant n'est pas libre (rien n'a bougé).
   */
  private stepBack(player: Player, box: Box): boolean {
    const b = player.actor.body;
    const body: Box = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    const g = PUT_DOWN.gap;
    const near: Box = { left: box.left - g, top: box.top - g, right: box.right + g, bottom: box.bottom + g };
    if (!overlaps(near, body)) return true;
    const moves: Record<Facing, [number, number]> = {
      down: [0, Math.min(0, near.top - body.bottom)],
      up: [0, Math.max(0, near.bottom - body.top)],
      right: [Math.min(0, near.left - body.right), 0],
      left: [Math.max(0, near.right - body.left), 0],
    };
    const [dx, dy] = moves[player.actor.facing];
    const moved: Box = { left: body.left + dx, top: body.top + dy, right: body.right + dx, bottom: body.bottom + dy };
    if (overlaps(near, moved) || !this.map.areaFree(moved, this.others)) return false;
    // le sprite et sa collision bougent ensemble (Body.reset recalerait la collision sur l'origine du sprite)
    player.actor.setPosition(player.actor.x + dx, player.actor.y + dy);
    for (const v of [b.position, b.prev, b.prevFrame]) v.set(v.x + dx, v.y + dy);
    b.updateCenter();
    return true;
  }

  private pieceHeight(def: PileDef): number {
    return (this.scene.textures.get(pieceImage(def)).getSourceImage() as HTMLImageElement).height;
  }

  /** Point au sol d'un tas d'une pièce posé juste devant Xéros, décalé de `shift` px sur le côté (perpendiculairement à son regard). */
  private pileSpotAt(player: Player, def: PileDef, shift: number): { x: number; y: number; box: Box } {
    const f = pileBox(def, 1, 0, 0, this.pieceHeight(def));
    const facing = player.actor.facing;
    const [l, t] = frontCorner(player.actor.body, facing, f.right - f.left, f.bottom - f.top);
    const side = facing === 'up' || facing === 'down';
    const x = Math.round(l - f.left + (side ? shift : 0));
    const y = Math.round(t - f.top + (side ? 0 : shift));
    return { x, y, box: { left: x + f.left, top: y + f.top, right: x + f.right, bottom: y + f.bottom } };
  }

  /** Le tas (de n'importe quel genre) qui occupe la place devant Xéros, s'il y en a un. */
  private pileInFront(player: Player, def: PileDef): PlacedPile | undefined {
    const { box } = this.pileSpotAt(player, def, 0);
    return this.map.piles.find((p) => overlaps(p.box, box));
  }

  /**
   * Point au sol d'un nouveau tas d'une pièce : juste devant Xéros si la place est libre ; si un tas l'occupe (plein ou
   * d'un autre genre), la première place libre à côté, en glissant sur le côté jusqu'à une case. undefined sinon.
   */
  private newPileSpot(player: Player, def: PileDef, besidePile: boolean): { x: number; y: number } | undefined {
    const bodies = [...this.others, player.actor.body];
    const shifts = [0];
    if (besidePile) for (let d = 1; d <= TILE; d++) shifts.push(-d, d);
    for (const shift of shifts) {
      const spot = this.pileSpotAt(player, def, shift);
      if (this.map.areaFree(spot.box, bodies)) return spot;
    }
    return undefined;
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
    const b = player.actor.body;
    const [l, t] = frontCorner(b, player.actor.facing, f.right - f.left, f.bottom - f.top);
    const x = Math.round(l - f.left);
    const y = Math.round(t - f.top + h);
    const box: Box = { left: x + f.left, top: y - h + f.top, right: x + f.right, bottom: y - h + f.bottom };
    return this.map.areaFree(box, [...this.others, b]) ? { x, y } : undefined;
  }
}
