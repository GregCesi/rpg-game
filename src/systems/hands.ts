import type Phaser from 'phaser';
import { INTERACT, PUT_DOWN } from '../config';
import { items, piles, props } from '../content';
import type { Facing, PropDef } from '../content/types';
import type { Player } from '../entities/Player';
import {
  addPile,
  changeObject,
  changeSpawned,
  dropItem,
  emptyPlace,
  fillPlace,
  game,
  held,
  release,
  setPileTie,
  spawnObject,
  startPile,
  take,
  turnHeld,
  type Held,
} from '../state';
import { propFootprint, propSize, type Box, type GameMap, type PlacedPile, type PlacedProp } from '../world/GameMap';
import { pileOf } from '../world/offer';
import { accepts, nearestOpenPlace, openPlaces, placeAim } from '../world/places';
import { shapeOf, tieImages } from '../world/pileShape';
import { Ghosts } from './ghost';

/** Ce qu'a donné « poser devant soi » : rien en main, pas de place libre devant, ou posé. */
export type PutDownResult = 'empty' | 'blocked' | 'done';

/**
 * Où ira la pièce qu'on pose en tas : une place d'un tas posé (dans le sens du tas), ou la première place d'un nouveau
 * tas au point (x, y), dans le sens de ce qu'on tient (`turned`).
 */
type PileTarget = { pile: PlacedPile; place: string } | { genre: string; x: number; y: number; place: string; turned: boolean };

/**
 * La forme nord-sud (tournée) de l'objet ordinaire de son genre de tas : celle qui roule nord-sud (la bille), ou marquée
 * `turned` dans son `take` (le quartier, qui ne roule pas).
 */
const isTurnedForm = (d: PropDef) => d.roll?.axis === 'ns' || !!d.take?.turned;

/**
 * L'objet du monde que devient ce qu'on tient une fois posé hors d'un tas : lui-même, ou, pour un rondin tourné (R), le même
 * couché dans l'autre sens (`turn` de props.json).
 */
function laidType(what: Extract<Held, { prop: string }>): string {
  const def = props[what.prop];
  return what.turned && def.timber && def.turn ? def.turn.into : what.prop;
}

/** Ce qu'on tient est tourné nord-sud (R). */
const turnedOf = (what: Held) => 'prop' in what && !!what.turned;

/** Genre de tas que lie ce qu'on tient (le lien : `tie.item` d'un genre de piles.json), s'il en lie un. */
function tieOf(what: Held): string | undefined {
  return 'item' in what ? Object.keys(piles).find((k) => piles[k].tie?.item === what.item) : undefined;
}

/** Où ira le lien qu'on pose : sous un tas posé qui n'en a pas, ou par terre, en (x, y), où il commence un tas. */
type TieTarget = { pile: PlacedPile } | { genre: string; x: number; y: number };

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
  private readonly ghost: Ghosts;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    /** Corps où l'on ne pose rien (les personnages). */
    private readonly others: Phaser.Physics.Arcade.Body[],
  ) {
    this.ghost = new Ghosts(scene);
  }

  /**
   * À appeler à chaque image : montre en transparence la pièce de ce qu'on tient, à la place exacte où elle ira si on
   * la pose, s'il s'entrepose en tas. `active` = false pendant un geste, un dialogue ou un changement de carte.
   */
  updatePreview(player: Player, active: boolean): void {
    const what = held(game);
    const tied = active && what ? tieOf(what) : undefined;
    if (tied) return this.tiePreview(player, tied);
    const genre = what && pileOf(what);
    const t = active && genre ? this.pileTarget(player, genre, turnedOf(what)) : undefined;
    if (!t) {
      this.ghost.hideFrom(0);
      return;
    }
    const def = 'pile' in t ? t.pile.def : shapeOf(piles[t.genre], t.turned);
    const q = def.places[t.place];
    const [x, y] = 'pile' in t ? [t.pile.pile.x, t.pile.pile.y] : [t.x, t.y];
    // par-dessus le tas qu'il complète ; un nouveau tas, à sa propre profondeur
    const depth = 'pile' in t ? t.pile.depth + 0.999 : y + q.y;
    this.ghost.show(0, q.image, x + q.x, y + q.y, depth);
  }

  /**
   * Prend un objet du monde dans les mains (les deux s'il le demande) : il quitte la carte et GameState l'oublie là
   * (objet né retiré, objet de Tiled noté disparu). Renvoie false si les mains ne sont pas libres.
   */
  takeProp(p: PlacedProp): boolean {
    // ce qui a une longueur (le rouleau, le rondin) l'emporte avec lui, et le rondin ses faces dressées
    const length = p.def.length || (p.def.timber && p.length !== undefined) ? { length: p.length ?? p.def.length!.start } : {};
    const hewn = p.hewn ? { hewn: p.hewn } : {};
    // une bille ou un quartier posé nord-sud est, dans les mains, la pièce ordinaire tournée (R)
    const pile = isTurnedForm(p.def) ? p.def.take!.pile : undefined;
    const piece = pile ? piles[pile].piece : undefined;
    const what: Held =
      piece && 'prop' in piece ? { prop: piece.prop, turned: true, ...length, ...hewn } : { prop: p.type, ...(p.flip ? { flip: true } : {}), ...length, ...hewn };
    if (!take(game, what, p.def.take!.hands)) return false;
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
    // une bille reprise d'un tas nord-sud reste tournée
    if (!take(game, 'prop' in piece && p.pile.turned ? { ...piece, turned: true } : { ...piece }, hands)) return false;
    emptyPlace(game, this.map.def.id, p.pile.id, place);
    if (!p.pile.places.length && !p.pile.tie) this.map.removePile(p);
    else this.map.refreshPile(p);
    return true;
  }

  /** Reprend le lien d'un tas qui n'a plus de pièce : le tas disparaît. Renvoie false si aucune main n'est libre. */
  takeTie(p: PlacedPile): boolean {
    const item = p.def.tie!.item;
    if (!take(game, { item }, items[item].hands)) return false;
    setPileTie(game, this.map.def.id, p.pile.id, false);
    this.map.removePile(p);
    return true;
  }

  /**
   * Pose ce que tient la main active sur l'objet `p` (le rouleau sur le billot) : il devient l'objet de son `rest` qui
   * le porte, avec sa longueur. Renvoie false si la main active ne tient pas ce qu'il accepte.
   */
  rest(p: PlacedProp): boolean {
    const what = game.both ? undefined : game.hands[game.active];
    const becomes = what && 'prop' in what ? p.def.rest?.[what.prop] : undefined;
    if (!what || !('prop' in what) || !becomes) return false;
    release(game);
    this.replace(p, becomes, what.length ?? props[what.prop].length?.start);
    return true;
  }

  /**
   * Reprend ce que porte l'objet `p` (le rouleau sur le billot), avec sa longueur : il redevient `bears.empty`.
   * Renvoie false si les mains ne sont pas libres.
   */
  unload(p: PlacedProp): boolean {
    const { prop, empty } = p.def.bears!;
    const def = props[prop];
    if (!take(game, { prop, ...(p.length !== undefined ? { length: p.length } : {}) }, def.take!.hands)) return false;
    this.replace(p, empty, undefined);
    return true;
  }

  /** L'objet `p` devient `type`, à la même place, avec sa longueur (`length`) : à l'écran et dans GameState. */
  private replace(p: PlacedProp, type: string, length: number | undefined): void {
    const { x, y } = p;
    this.map.removeProp(p);
    this.map.placeProp({ id: p.id, type, x, y }, { spawned: p.spawned, length });
    const change = { type, x, y, ...(length !== undefined ? { length } : {}) };
    if (p.spawned) changeSpawned(game, this.map.def.id, p.id, change);
    else changeObject(game, this.map.def.id, p.id, change);
  }

  /**
   * Pose devant Xéros ce que tient la main active (ou les deux mains), à une place libre seulement :
   * en tas s'il a un genre de tas, sinon un objet possédable au sol, un objet du monde sur la carte (objet né, à sa nouvelle place).
   */
  putDown(player: Player): PutDownResult {
    const what = held(game);
    if (!what) return 'empty';
    const tied = tieOf(what);
    if (tied) return this.putTie(player, tied);
    const pile = pileOf(what);
    if (pile) return this.putOnPile(player, pile, turnedOf(what));
    const laid = 'item' in what ? undefined : { ...what, prop: laidType(what) };
    const spot = laid ? this.propSpot(player, laid) : this.groundSpot(player);
    if (!spot) return 'blocked';
    release(game);
    const mapId = this.map.def.id;
    if (!laid) this.map.placeGround(dropItem(game, mapId, (what as { item: string }).item, spot.x, spot.y));
    else {
      const o = spawnObject(game, mapId, laid.prop, spot.x, spot.y, !!laid.flip, undefined, laid.length, laid.hewn);
      this.map.placeProp(o, { flip: laid.flip, spawned: true, length: laid.length, hewn: laid.hewn });
    }
    return 'done';
  }

  /**
   * Tourne ce qu'on tient entre est-ouest et nord-sud (R), si son genre de tas a une forme tournée (`turned` de
   * piles.json : la bille). Renvoie false si ce qu'on tient ne se tourne pas.
   */
  turn(): boolean {
    const what = held(game);
    const genre = what && pileOf(what);
    // un rondin qui ne va pas au tas se tourne quand même : il sera posé dans l'autre sens
    const timber = !!what && 'prop' in what && !!props[what.prop].timber && !!props[what.prop].turn;
    if (!what || !('prop' in what) || !((genre && piles[genre].turned) || timber)) return false;
    turnHeld(game);
    return true;
  }

  /**
   * Pose au sol devant Xéros ce qu'il tient et ne peut plus porter (une sauvegarde d'avant les masses) : devant lui s'il y a la
   * place, sinon sur lui. Une bille tournée devient la bille nord-sud posée. Ne touche pas aux mains : l'appelant les vide.
   */
  layDown(player: Player, what: Held): void {
    const mapId = this.map.def.id;
    const feet = { x: Math.round(player.actor.x), y: Math.round(player.actor.y) };
    if ('item' in what) {
      const spot = this.groundSpot(player) ?? feet;
      this.map.placeGround(dropItem(game, mapId, what.item, spot.x, spot.y));
      return;
    }
    const ns = what.turned && !props[what.prop].timber ? Object.keys(props).find((k) => isTurnedForm(props[k]) && props[k].take?.pile === props[what.prop].take?.pile) : undefined;
    const type = ns ?? laidType(what);
    const spot = this.propSpot(player, { prop: type, length: what.length }) ?? feet;
    const o = spawnObject(game, mapId, type, spot.x, spot.y, false, undefined, what.length, what.hewn);
    this.map.placeProp(o, { spawned: true, length: what.length, hewn: what.hewn });
  }

  /**
   * Outils de test (?dieu) : pose devant Xéros un objet du monde de props.json, comme on poserait une bille (objet né,
   * noté dans GameState). Renvoie false s'il n'y a pas la place.
   */
  placeInFront(player: Player, type: string, length?: number): boolean {
    const spot = this.propSpot(player, { prop: type, length });
    if (!spot) return false;
    this.map.placeProp(spawnObject(game, this.map.def.id, type, spot.x, spot.y, false, undefined, length), { spawned: true, length });
    return true;
  }

  /**
   * Outils de test (?dieu) : met `count` exemplaires de `what` (un objet possédable, mis au sol ; un objet du monde, posé comme
   * si on le posait) sur une rangée devant Xéros, en commençant à sa gauche. Renvoie combien ont trouvé une place.
   */
  supplyAround(player: Player, what: string, count: number): number {
    const b = player.actor.body;
    const mapId = this.map.def.id;
    let placed = 0;
    for (let i = 0; i < count * 4 && placed < count; i++) {
      // une rangée devant lui, puis la suivante un peu plus loin
      const row = Math.floor(i / 6);
      const x = Math.round(b.center.x + ((i % 6) - 2.5) * 10);
      const y = Math.round(b.bottom + 12 + row * 14);
      if (what in items) {
        if (!this.map.areaFree({ left: x - 4, top: y - 6, right: x + 4, bottom: y }, this.others)) continue;
        this.map.placeGround(dropItem(game, mapId, what, x, y));
      } else {
        const size = this.scene.textures.getFrame(props[what].image);
        const box: Box = { left: x, top: y - size.height, right: x + size.width, bottom: y };
        if (!this.map.areaFree(box, [...this.others, b])) continue;
        this.map.placeProp(spawnObject(game, mapId, what, x, y, false), { spawned: true });
      }
      placed++;
    }
    return placed;
  }

  /**
   * Outils de test (?dieu) : un tas du genre `genre` de `count` pièces devant Xéros, dans le sens `turned`, toute son
   * emprise au sol devant lui. Les places sont prises comme on les prendrait à la main, la couche du bas d'abord, une place au sol seulement si elle est
   * libre ; `tie` : avec son lien dessous (`count` peut alors être 0, le lien seul). Renvoie le nombre de pièces posées
   * (-1 : pas la place).
   */
  pileInFront(player: Player, genre: string, count: number, turned: boolean, tie: boolean): number {
    const def = shapeOf(piles[genre], turned);
    const bodies = [...this.others, player.actor.body];
    // toute l'emprise au sol du tas devant Xéros, pas seulement sa première pièce : les autres places au sol ne
    // tombent pas sur lui
    const ground = Object.values(def.places).flatMap((q) => (q.body ? [q.body] : []));
    const left = Math.min(...ground.map((b) => b.x));
    const top = Math.min(...ground.map((b) => b.y));
    const w = Math.max(...ground.map((b) => b.x + b.w)) - left;
    const h = Math.max(...ground.map((b) => b.y + b.h)) - top;
    const [l, t] = frontCorner(player.actor.body, player.actor.facing, w, h);
    const spot = { x: Math.round(l - left), y: Math.round(t - top) };
    if (!this.groundFree(this.boxAt(def.places[def.start].body!, spot.x, spot.y), bodies)) return -1;
    const taken = count > 0 ? [def.start] : [];
    while (taken.length < count) {
      const next = openPlaces(def, taken)
        .filter((q) => {
          const b = def.places[q].body;
          return !b || this.groundFree(this.boxAt(b, spot.x, spot.y), bodies);
        })
        .sort((a, b) => def.places[a].layer - def.places[b].layer)[0];
      if (!next) break;
      taken.push(next);
    }
    this.map.placePile(addPile(game, this.map.def.id, { pile: genre, x: spot.x, y: spot.y, places: taken, turned, tie: tie && !!def.tie }));
    return taken.length;
  }

  /**
   * Un tas du genre `genre` tiendrait au sol en (x, y) avec les pièces `places` : leurs places au sol (forme `turned`)
   * sont libres (personnages compris, Xéros non : il est collé à ce qu'il noue, et le tas le repousse d'un pixel au
   * besoin), hors de ce qu'il remplace : le tas `own`, ou l'objet `prop` (un fagot posé hors d'un tas). Pour nouer et
   * dénouer (systems/knot.ts).
   */
  pileFree(genre: string, turned: boolean, x: number, y: number, places: string[], own?: PlacedPile, prop?: PlacedProp): boolean {
    const def = shapeOf(piles[genre], turned);
    const bodies = this.others;
    const ignore = [...(own?.zones ?? []), ...(prop?.parts ?? [])];
    return places.every((q) => {
      const b = def.places[q].body;
      return !b || this.groundFree(this.boxAt(b, x, y), bodies, own, ignore);
    });
  }

  /**
   * Pose le lien (`tieOf`) : sous le tas visé, ou par terre devant Xéros, où il commence un tas du genre `genre` qui
   * n'a encore aucune pièce. Sans place, rien ne bouge.
   */
  private putTie(player: Player, genre: string): PutDownResult {
    const t = this.tieTarget(player, genre);
    if (!t) return 'blocked';
    release(game);
    const mapId = this.map.def.id;
    if ('pile' in t) {
      setPileTie(game, mapId, t.pile.pile.id, true);
      this.map.refreshPile(t.pile);
    } else this.map.placePile(addPile(game, mapId, { pile: genre, x: t.x, y: t.y, places: [], tie: true }));
    this.ghost.hideFrom(0);
    return 'done';
  }

  /**
   * Où ira le lien : sous le tas du genre `genre` sans lien dont une pièce est la plus près du point que regarde Xéros,
   * à portée ; sinon par terre, la première place d'un nouveau tas juste devant lui, si elle est libre.
   */
  private tieTarget(player: Player, genre: string): TieTarget | undefined {
    const probe = player.probe(INTERACT.reach);
    let best: PlacedPile | undefined;
    let bestD: number = INTERACT.radius;
    for (const p of this.map.piles) {
      if (p.pile.pile !== genre || p.pile.tie) continue;
      for (const place of p.pile.places) {
        const [ax, ay] = placeAim(p.def, place);
        const d = Math.hypot(p.pile.x + ax - probe.x, p.pile.y + ay - probe.y);
        if (d < bestD) {
          best = p;
          bestD = d;
        }
      }
    }
    if (best) return { pile: best };
    const spot = this.newPileSpot(player, genre, false);
    return spot && { genre, ...spot };
  }

  /** Le lien en transparence, là où il ira : sous le tas visé, ou par terre devant Xéros. */
  private tiePreview(player: Player, genre: string): void {
    const t = this.tieTarget(player, genre);
    if (!t) {
      this.ghost.hideFrom(0);
      return;
    }
    // sous un tas, son bout de devant, là où il dépassera ; par terre, la boucle du lien seul
    const tie = 'pile' in t ? tieImages(t.pile.def, t.pile.pile.places)[1] : piles[genre].tie!.alone;
    const [x, y] = 'pile' in t ? [t.pile.pile.x, t.pile.pile.y] : [t.x, t.y];
    // sous les pièces du tas visé ; par terre, à sa propre profondeur
    const depth = 'pile' in t ? t.pile.depth : y + tie.y;
    this.ghost.show(0, tie.image, x + tie.x, y + tie.y, depth);
  }

  /**
   * Pose en tas du genre `genre`, à la place que montre la prévisualisation ; sans place, rien ne bouge. Sur un tas
   * posé, la pièce prend le sens du tas ; un nouveau tas prend le sens de ce qu'on tient (`turned`).
   */
  private putOnPile(player: Player, genre: string, turned: boolean): PutDownResult {
    const t = this.pileTarget(player, genre, turned);
    if (!t) return 'blocked';
    release(game);
    const mapId = this.map.def.id;
    if ('pile' in t) {
      fillPlace(game, mapId, t.pile.pile.id, t.place);
      this.map.refreshPile(t.pile);
    } else this.map.placePile(startPile(game, mapId, genre, t.x, t.y, t.place, t.turned));
    this.ghost.hideFrom(0);
    return 'done';
  }

  /**
   * La place où ira une pièce du genre `genre` : parmi les places disponibles des tas de ce genre (libres, portées, et,
   * au sol, à une place libre), celle dont le point visé est le plus près du point que regarde Xéros, à portée, quel
   * que soit le sens de ce qu'on tient (la pièce s'aligne sur le tas) ; sinon la première place (`start`) d'un nouveau
   * tas dans le sens `turned`, sa pièce au sol juste devant lui, si la place est libre.
   */
  private pileTarget(player: Player, genre: string, turned: boolean): PileTarget | undefined {
    const probe = player.probe(INTERACT.reach);
    const bodies = [...this.others, player.actor.body];
    let best: PileTarget | undefined;
    let bestD: number = INTERACT.radius;
    for (const p of this.map.piles) {
      if (!accepts({ genre: p.pile.pile }, { genre })) continue;
      const hit = nearestOpenPlace(p.def, p.pile.places, [p.pile.x, p.pile.y], probe, bestD, (place) => {
        const body = p.def.places[place].body;
        return !body || this.groundFree(this.boxAt(body, p.pile.x, p.pile.y), bodies, p);
      });
      if (!hit) continue;
      best = { pile: p, place: hit.place };
      bestD = hit.d;
    }
    if (best) return best;
    const spot = this.newPileSpot(player, genre, turned);
    return spot && { genre, ...spot, place: shapeOf(piles[genre], turned).start, turned };
  }

  /** Point (x, y) d'un nouveau tas du genre `genre`, sa première pièce au sol juste devant Xéros, si la place est libre. */
  private newPileSpot(player: Player, genre: string, turned: boolean): { x: number; y: number } | undefined {
    const def = shapeOf(piles[genre], turned);
    const body = def.places[def.start].body!;
    const [l, t] = frontCorner(player.actor.body, player.actor.facing, body.w, body.h);
    const x = Math.round(l - body.x);
    const y = Math.round(t - body.y);
    return this.groundFree(this.boxAt(body, x, y), [...this.others, player.actor.body]) ? { x, y } : undefined;
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
  private groundFree(box: Box, bodies: Phaser.Physics.Arcade.Body[], own?: PlacedPile, ignore: readonly Phaser.GameObjects.GameObject[] = own?.zones ?? []): boolean {
    if (!this.map.areaFree(box, bodies, ignore)) return false;
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
    // le bois d'œuvre a la taille de sa longueur
    const { w, h } = propSize(this.scene, def, { flip, length: what.length });
    const f = propFootprint(this.scene, def, { flip, length: what.length }) ?? { left: 0, top: 0, right: w, bottom: h };
    const b = player.actor.body;
    const [l, t] = frontCorner(b, player.actor.facing, f.right - f.left, f.bottom - f.top);
    const x = Math.round(l - f.left);
    const y = Math.round(t - f.top + h);
    const box: Box = { left: x + f.left, top: y - h + f.top, right: x + f.right, bottom: y - h + f.bottom };
    return this.map.areaFree(box, [...this.others, b]) ? { x, y } : undefined;
  }
}
