import type Phaser from 'phaser';
import { DEPTH, INTERACT, PUT_DOWN } from '../config';
import { items, piles, props } from '../content';
import type { Facing } from '../content/types';
import type { Player } from '../entities/Player';
import { changeObject, changeSpawned, dropItem, emptyPlace, fillPlace, game, held, release, spawnObject, startPile, take, type Held } from '../state';
import { footprint, type Box, type GameMap, type PlacedPile, type PlacedProp } from '../world/GameMap';
import { openPlaces, placeAim } from '../world/pileShape';

/** Ce qu'a donné « poser devant soi » : rien en main, pas de place libre devant, ou posé. */
export type PutDownResult = 'empty' | 'blocked' | 'done';

/** Où ira la pièce qu'on pose en tas : une place d'un tas posé, ou la première place d'un nouveau tas, au point (x, y). */
type PileTarget = { pile: PlacedPile; place: string } | { genre: string; x: number; y: number; place: string };

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
 * construire un tas pièce par pièce et en reprendre. Ce qui a un genre de tas (piles.json) se pose toujours en tas : à la
 * place disponible d'un tas du même genre la plus proche du point que regarde Xéros (le creux quand il est au centre
 * entre deux pièces, le sol à côté quand il est décalé), sinon à la première place d'un nouveau tas, devant lui. Une
 * prévisualisation en transparence montre la pièce là où elle ira.
 * Les objets pris quittent la carte, ceux qu'on pose y reviennent à leur nouvelle place : tout est noté dans GameState.
 * Ramasser un objet au sol et récolter restent ailleurs (WorldScene, harvest.ts). Ne lit pas le clavier.
 */
export class HandsSystem {
  /** La pièce en transparence, à la place où ira ce qu'on tient. */
  private readonly ghost: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    /** Corps où l'on ne pose rien (les personnages). */
    private readonly others: Phaser.Physics.Arcade.Body[],
  ) {
    this.ghost = scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 1).setAlpha(0.5).setVisible(false);
  }

  /**
   * À appeler à chaque image : montre en transparence la pièce de ce qu'on tient, à la place exacte où elle ira si on
   * la pose, s'il s'entrepose en tas. `active` = false pendant un geste, un dialogue ou un changement de carte.
   */
  updatePreview(player: Player, active: boolean): void {
    const what = held(game);
    const genre = what && pileOf(what);
    const t = active && genre ? this.pileTarget(player, genre) : undefined;
    if (!t) {
      this.ghost.setVisible(false);
      return;
    }
    const def = piles['pile' in t ? t.pile.pile.pile : t.genre];
    const q = def.places[t.place];
    const [x, y] = 'pile' in t ? [t.pile.pile.x, t.pile.pile.y] : [t.x, t.y];
    // par-dessus le tas qu'il complète ; un nouveau tas, à sa propre profondeur
    const depth = 'pile' in t ? t.pile.depth + 0.999 : y + q.y;
    this.ghost.setTexture(q.image).setPosition(x + q.x, y + q.y).setDepth(Math.min(depth, DEPTH.prompt - 1)).setVisible(true);
  }

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
   * Reprend la pièce de la place `place` d'un tas (la pièce ordinaire du genre : la bille, la branche) ; le tas disparaît
   * à la dernière. Renvoie false si les mains ne sont pas libres.
   */
  takeFromPile(p: PlacedPile, place: string): boolean {
    const piece = p.def.piece;
    const hands = 'item' in piece ? items[piece.item].hands : props[piece.prop].take!.hands;
    if (!take(game, { ...piece }, hands)) return false;
    emptyPlace(game, this.map.def.id, p.pile.id, place);
    if (!p.pile.places.length) this.map.removePile(p);
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

  /** Pose en tas du genre `genre`, à la place que montre la prévisualisation ; sans place, rien ne bouge. */
  private putOnPile(player: Player, genre: string): PutDownResult {
    const t = this.pileTarget(player, genre);
    if (!t) return 'blocked';
    release(game);
    const mapId = this.map.def.id;
    if ('pile' in t) {
      fillPlace(game, mapId, t.pile.pile.id, t.place);
      this.map.refreshPile(t.pile);
    } else this.map.placePile(startPile(game, mapId, genre, t.x, t.y, t.place));
    this.ghost.setVisible(false);
    return 'done';
  }

  /**
   * La place où ira une pièce du genre `genre` : parmi les places disponibles des tas de ce genre (libres, portées, et,
   * au sol, à une place libre), celle dont le point visé est le plus près du point que regarde Xéros, à portée ; sinon
   * la première place (`start`) d'un nouveau tas, sa pièce au sol juste devant lui, si la place est libre.
   */
  private pileTarget(player: Player, genre: string): PileTarget | undefined {
    const probe = player.probe(INTERACT.reach);
    const bodies = [...this.others, player.actor.body];
    let best: PileTarget | undefined;
    let bestD: number = INTERACT.radius;
    for (const p of this.map.piles) {
      if (p.pile.pile !== genre) continue;
      for (const place of openPlaces(p.def, p.pile.places)) {
        const [ax, ay] = placeAim(p.def, place);
        const d = Math.hypot(p.pile.x + ax - probe.x, p.pile.y + ay - probe.y);
        if (d >= bestD) continue;
        const body = p.def.places[place].body;
        if (body && !this.groundFree(this.boxAt(body, p.pile.x, p.pile.y), bodies, p)) continue;
        best = { pile: p, place };
        bestD = d;
      }
    }
    if (best) return best;
    const def = piles[genre];
    const body = def.places[def.start].body!;
    const [l, t] = frontCorner(player.actor.body, player.actor.facing, body.w, body.h);
    const x = Math.round(l - body.x);
    const y = Math.round(t - body.y);
    return this.groundFree(this.boxAt(body, x, y), bodies) ? { genre, x, y, place: def.start } : undefined;
  }

  /** Une collision de place (repère du tas) dans le repère de la carte, pour un tas dont le point est (x, y). */
  private boxAt(b: { x: number; y: number; w: number; h: number }, x: number, y: number): Box {
    return { left: x + b.x, top: y + b.y, right: x + b.x + b.w, bottom: y + b.y + b.h };
  }

  /**
   * Une pièce au sol tiendrait là : place libre (carte, cases bloquantes, objets, `bodies`), et sur aucune pièce au sol
   * d'un tas, même d'un tas qui ne bloque pas encore le passage. Les collisions du tas `own` ne comptent pas : ses
   * places sont faites pour aller ensemble.
   */
  private groundFree(box: Box, bodies: Phaser.Physics.Arcade.Body[], own?: PlacedPile): boolean {
    if (!this.map.areaFree(box, bodies, own?.zones)) return false;
    return !this.map.piles.some(
      (p) =>
        p !== own &&
        p.pile.places.some((id) => {
          const b = p.def.places[id].body;
          return !!b && overlaps(box, this.boxAt(b, p.pile.x, p.pile.y));
        }),
    );
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
