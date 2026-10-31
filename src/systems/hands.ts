import type Phaser from 'phaser';
import { INTERACT, PUT_DOWN } from '../config';
import { items, piles, props } from '../content';
import { crosswise, viewCount } from '../content/views';
import type { Facing, WoodPiece } from '../content/types';
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
  removeGroundItem,
  setPileTie,
  spawnObject,
  take,
  turnHeld,
  type Held,
} from '../state';
import { groundBox, propFootprint, propSize, type Box, type GameMap, type PlacedGround, type PlacedPile, type PlacedProp } from '../world/GameMap';
import { pileOf } from '../world/offer';
import { defOf, WOOD_PIECE } from '../world/woodPiece';
import { nearestOpenPlace, openPlaces, placeAim } from '../world/places';
import { kindOf, pileDefOf, sameKind, shapeOf, tieImages, type PileKind, type PileShape } from '../world/pileShape';
import { woodTexture } from '../world/woodTexture';
import { formImage, naturalFor, naturalGround } from '../world/natural';
import { Ghosts } from './ghost';

/** Ce qu'a donné « poser devant soi » : rien en main, pas de place libre devant, ou posé. */
export type PutDownResult = 'empty' | 'blocked' | 'done';

/** Une pièce seule au sol, qui peut commencer un tas : un objet du monde posé (la pièce de bois, le fagot), ou un objet possédable (la branche). */
type Lone = { prop: PlacedProp } | { ground: PlacedGround };

/**
 * Où ira ce qu'on pose (E, Q) : le seul chemin de pose, pour tout ce qu'on porte.
 * - `pile` : à une place d'un tas commencé qui entrepose la même chose (dans le sens du tas) ;
 * - `join` : contre une pièce identique seule au sol : un tas naît, qui prend tout de cette première pièce (sa place `lonePlace`,
 *   son sens), et la pièce posée va à la place `place` ;
 * - `tie` : le lien sous un tas qui n'en a pas ; `tie-alone` : le lien par terre, où il commence un tas sans pièce ;
 * - `lay` : seul, au sol, devant Xéros (un objet du monde à son coin bas gauche, un objet possédable à son point au sol).
 */
type Drop =
  | { kind: 'pile'; pile: PlacedPile; place: string }
  | { kind: 'join'; lone: Lone; pile: PileKind; x: number; y: number; turned: boolean; lonePlace: string; place: string }
  | { kind: 'tie'; pile: PlacedPile }
  | { kind: 'tie-alone'; genre: string; x: number; y: number }
  | { kind: 'lay'; x: number; y: number };

/** Genre de tas que lie ce qu'on tient (le lien : `tie.item` d'un genre de piles.json), s'il en lie un. */
function tieOf(what: Held): string | undefined {
  return 'item' in what ? Object.keys(piles).find((k) => piles[k].tie?.item === what.item) : undefined;
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
 * Les mains de Xéros sur la carte : prendre un objet du monde (la bille), poser ou lâcher devant soi ce qu'on tient, construire un
 * tas pièce par pièce et en reprendre. Poser n'a qu'un chemin, pour tout ce qu'on porte (`dropTarget`, `put`) : à la place
 * disponible d'un tas qui entrepose la même chose, la plus proche du point que regarde Xéros (le creux quand il est au centre entre
 * deux pièces, le sol à côté quand il est décalé) ; contre une pièce identique seule au sol, où un tas naît ; le lien sous un tas
 * ou par terre ; sinon seul, au sol devant lui. Un fantôme en transparence montre où et dans quel sens il ira (R le tourne) ; sans
 * place, rien ne bouge (« Pas la place ici. »). Les objets pris quittent la carte, ceux qu'on pose y reviennent à leur nouvelle
 * place : tout est noté dans GameState. Ramasser un objet au sol et récolter restent ailleurs (WorldScene, harvest.ts). Ne lit pas
 * le clavier.
 */
export class HandsSystem {
  /** Ce qu'on tient, en transparence, là où il ira. */
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
   * À appeler à chaque image : montre en transparence ce qu'on tient, à la place exacte où il ira si on le pose, dans son sens.
   * `active` = false pendant un geste, un dialogue, un changement de carte, ou quand E vise autre chose (E agirait sur la cible).
   */
  updatePreview(player: Player, active: boolean): void {
    const what = held(game);
    const t = active && what ? this.dropTarget(player, what) : undefined;
    if (!what || !t) return this.ghost.hideFrom(0);
    const g = this.ghostOf(what, t);
    this.ghost.show(0, g.key, g.x, g.y, g.depth, undefined, g.frame);
  }

  /**
   * Prend un objet du monde dans les mains (les deux s'il le demande) : il quitte la carte et GameState l'oublie là
   * (objet né retiré, objet de Tiled noté disparu). Renvoie false si les mains ne sont pas libres.
   */
  takeProp(p: PlacedProp): boolean {
    // ce qui a une longueur (le rouleau) l'emporte avec lui ; la pièce de bois, tous ses réglages, son sens compris
    const length = p.def.length ? { length: p.length ?? p.def.length.start } : {};
    const what: Held = p.wood
      ? { prop: p.type, wood: structuredClone(p.wood) }
      : { prop: p.type, ...(p.flip ? { flip: true } : {}), ...length, ...(p.natural ? { natural: { ...p.natural } } : {}) };
    if (!take(game, what, p.def.take!.hands)) return false;
    const mapId = this.map.def.id;
    if (p.spawned) changeSpawned(game, mapId, p.id, { x: p.x, y: p.y });
    else changeObject(game, mapId, p.id, { x: p.x, y: p.y });
    this.map.removeProp(p);
    return true;
  }

  /**
   * Reprend la pièce de la place `place` d'un tas (la pièce ordinaire du genre : la bille, la branche) ; le tas disparaît
   * à la dernière. Renvoie false si les mains ne sont pas libres.
   */
  takeFromPile(p: PlacedPile, place: string): boolean {
    const piece = p.def.piece;
    // une matière naturelle reprise d'un tas a la forme dessinée à sa place (`-b` : la seconde) et la taille type : le tas range des
    // pièces semblables, il ne garde pas la taille de chacune
    const image = p.def.places[place].image ?? '';
    const form = { natural: { form: (/-b(-|$)/.test(image) ? 1 : 0) as 0 | 1, size: 100 } };
    // une pièce reprise d'un tas nord-sud reste tournée
    const what: Held =
      'item' in piece
        ? { ...piece, ...(p.pile.turned ? { view: 1 } : {}), ...(items[piece.item].natural ? form : {}) }
        : 'wood' in piece
          ? { prop: WOOD_PIECE, wood: structuredClone(p.def.places[place].wood) ?? { ...piece.wood, axis: p.pile.turned ? 'ns' : 'ew' } }
          : { ...piece, ...(p.pile.turned ? { turned: true } : {}), ...(props[piece.prop].natural ? form : {}) };
    const hands = 'item' in piece ? items[piece.item].hands : 'wood' in piece ? 2 : props[piece.prop].take!.hands;
    if (!take(game, what, hands)) return false;
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

  /** Pose devant Xéros ce que tient la main active (ou les deux mains), là où le montre le fantôme : le seul chemin de pose. */
  putDown(player: Player): PutDownResult {
    const what = held(game);
    if (!what) return 'empty';
    const t = this.dropTarget(player, what);
    if (!t) return 'blocked';
    release(game);
    this.put(what, t);
    this.ghost.hideFrom(0);
    return 'done';
  }

  /**
   * Tourne ce qu'on tient d'un quart de tour (R) : une pièce de bois (elle sera posée dans l'autre sens, seule ou en tas), un objet
   * possédable qui a plusieurs vues (`views` : la branche, le piquet, le lien, les outils), ou ce dont le genre de tas a une forme
   * tournée (`turned` de piles.json : le fagot). Renvoie false si ce qu'on tient ne se tourne pas (un objet rond).
   */
  turn(): boolean {
    const what = held(game);
    const kind = what && pileOf(what);
    const turns = what && ('item' in what ? viewCount(items[what.item].views) > 1 : what.wood || (kind && pileDefOf(kind).turned));
    if (!turns) return false;
    turnHeld(game);
    return true;
  }

  /**
   * Pose au sol ce qu'il tient et ne peut plus porter (une sauvegarde d'avant les masses) : seul, devant lui s'il y a la place,
   * sinon à ses pieds. Ne touche pas aux mains : l'appelant les vide.
   */
  layDown(player: Player, what: Held): void {
    const feet = { x: Math.round(player.actor.x), y: Math.round(player.actor.y) };
    this.put(what, { kind: 'lay', ...(this.laySpot(player, what) ?? feet) });
  }

  /**
   * Outils de test (?dieu) : pose devant Xéros un objet du monde de props.json, seul, comme on le poserait (objet né, noté dans
   * GameState), avec sa longueur (le rouleau) ou ses réglages (la pièce de bois). Renvoie false s'il n'y a pas la place.
   */
  placeInFront(player: Player, type: string, length?: number, wood?: WoodPiece): boolean {
    const natural = naturalFor(props[type]);
    return this.layHeld(player, { prop: type, ...(length !== undefined ? { length } : {}), ...(wood ? { wood } : {}), ...(natural ? { natural } : {}) });
  }

  /**
   * Pose seul devant Xéros (ou à la place libre la plus proche à côté) ce qui n'est dans aucune main : ce que sort une transformation
   * (systems/transform.ts), un objet des outils de test. Renvoie false s'il n'y a pas la place.
   */
  layHeld(player: Player, what: Held): boolean {
    const spot = this.laySpot(player, what);
    if (!spot) return false;
    this.put(what, { kind: 'lay', ...spot });
    return true;
  }

  /**
   * Outils de test (?dieu) : met `count` exemplaires de `what` (un objet possédable, mis au sol ; un objet du monde, posé comme
   * si on le posait) sur une rangée devant Xéros, en commençant à sa gauche. Renvoie combien ont trouvé une place.
   */
  supplyAround(player: Player, what: string, count: number): number {
    const b = player.actor.body;
    let placed = 0;
    for (let i = 0; i < count * 4 && placed < count; i++) {
      // une rangée devant lui, puis la suivante un peu plus loin
      const row = Math.floor(i / 6);
      const x = Math.round(b.center.x + ((i % 6) - 2.5) * 10);
      const y = Math.round(b.bottom + 12 + row * 14);
      const natural = naturalFor(what in items ? items[what] : props[what]);
      const held: Held = what in items ? { item: what, ...(natural ? { natural } : {}) } : { prop: what, ...(natural ? { natural } : {}) };
      if (!this.map.areaFree(this.layBox(held, x, y), what in items ? this.others : [...this.others, b])) continue;
      this.put(held, { kind: 'lay', x, y });
      placed++;
    }
    return placed;
  }

  /**
   * Outils de test (?dieu) : un tas de `count` pièces de `kind` (un genre écrit, ou une pièce de bois) devant Xéros, dans le sens
   * `turned`, toute son emprise au sol devant lui. Les places sont prises comme on les prendrait à la main, la couche du bas
   * d'abord, une place au sol seulement si elle est libre ; `tie` : avec son lien dessous (`count` peut alors être 0, le lien
   * seul). Renvoie le nombre de pièces posées (-1 : pas la place).
   */
  pileInFront(player: Player, kind: PileKind, count: number, turned: boolean, tie: boolean): number {
    const def = shapeOf(pileDefOf(kind), turned);
    const bodies = [...this.others, player.actor.body];
    // toute l'emprise au sol du tas devant Xéros, pas seulement sa première pièce : les autres places au sol ne
    // tombent pas sur lui
    const ground = groundBox(def);
    const [l, t] = frontCorner(player.actor.body, player.actor.facing, ground.right - ground.left, ground.bottom - ground.top);
    const spot = { x: Math.round(l - ground.left), y: Math.round(t - ground.top) };
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
    this.map.placePile(addPile(game, this.map.def.id, { ...kind, x: spot.x, y: spot.y, places: taken, turned, tie: tie && !!def.tie }));
    return taken.length;
  }

  /**
   * Un tas du genre écrit `genre` tiendrait au sol en (x, y) avec les pièces `places` : leurs places au sol (forme `turned`)
   * sont libres (personnages compris, Xéros non : il est collé à ce qu'il noue, et le tas le repousse d'un pixel au
   * besoin), hors de ce qu'il remplace : le tas `own`, ou l'objet `prop` (un fagot posé hors d'un tas). Pour nouer et
   * dénouer (systems/knot.ts).
   */
  pileFree(genre: string, turned: boolean, x: number, y: number, places: string[], own?: PlacedPile, prop?: PlacedProp): boolean {
    const def = shapeOf(pileDefOf({ pile: genre }), turned);
    const ignore = [...(own?.zones ?? []), ...(prop?.parts ?? [])];
    return places.every((q) => {
      const b = def.places[q].body;
      return !b || this.groundFree(this.boxAt(b, x, y), this.others, own, ignore);
    });
  }

  /**
   * Où ira ce qu'on tient si on le pose maintenant (voir `Drop`), ou undefined s'il n'y a pas la place. Le lien va sous le tas de
   * son genre sans lien le plus proche, sinon par terre ; ce qui va en tas va à la place la plus proche du point que regarde Xéros,
   * à portée, parmi celles des tas qui entreposent la même chose et celles d'un tas qui naîtrait d'une pièce identique seule au
   * sol ; sinon tout se pose seul, devant lui.
   */
  private dropTarget(player: Player, what: Held): Drop | undefined {
    const tied = tieOf(what);
    if (tied) return this.tieTarget(player, tied);
    const kind = pileOf(what);
    const near = kind && this.nearestPlace(player, kind);
    if (near) return near;
    const spot = this.laySpot(player, what);
    return spot && { kind: 'lay', ...spot };
  }

  /**
   * La place la plus proche du point que regarde Xéros, à portée, où ira une pièce de `kind` : une place disponible d'un tas qui
   * entrepose la même chose (libre, portée, et au sol, à une place libre ; la pièce prend le sens du tas), ou la place voisine
   * d'une pièce identique seule au sol, dans le tas qui naîtrait d'elle (dans son sens, elle à l'une de ses places au sol).
   */
  private nearestPlace(player: Player, kind: PileKind): Drop | undefined {
    const probe = player.probe(INTERACT.reach);
    const bodies = [...this.others, player.actor.body];
    let best: Drop | undefined;
    let bestD: number = INTERACT.radius;
    for (const p of this.map.piles) {
      if (!sameKind(kindOf(p.pile), kind)) continue;
      const hit = nearestOpenPlace(p.def, p.pile.places, [p.pile.x, p.pile.y], probe, bestD, (place) => {
        const body = p.def.places[place].body;
        return !body || this.groundFree(this.boxAt(body, p.pile.x, p.pile.y), bodies, p);
      });
      if (!hit) continue;
      best = { kind: 'pile', pile: p, place: hit.place };
      bestD = hit.d;
    }
    for (const lone of this.lonePieces(kind)) {
      const def = shapeOf(pileDefOf(kind), lone.turned);
      const ignore = 'prop' in lone.lone ? lone.lone.prop.parts : [];
      for (const [lonePlace, q] of Object.entries(def.places)) {
        if (q.layer > 0) continue;
        // le tas dont la place `lonePlace` tombe exactement sur la pièce seule
        const x = lone.x - q.x;
        const y = lone.y - q.y;
        const hit = nearestOpenPlace(def, [lonePlace], [x, y], probe, bestD, (place) => {
          const body = def.places[place].body;
          return !body || this.groundFree(this.boxAt(body, x, y), bodies, undefined, ignore);
        });
        if (!hit) continue;
        best = { kind: 'join', lone: lone.lone, pile: kind, x, y, turned: lone.turned, lonePlace, place: hit.place };
        bestD = hit.d;
      }
    }
    return best;
  }

  /**
   * Les pièces seules au sol identiques à `kind` (même genre, ou pièce de bois identique qui va en tas), avec le coin bas gauche de
   * leur image (une place de tas s'y posera exactement) et leur sens.
   */
  private lonePieces(kind: PileKind): { lone: Lone; x: number; y: number; turned: boolean }[] {
    const out: { lone: Lone; x: number; y: number; turned: boolean }[] = [];
    for (const p of this.map.props) {
      if (!p.def.take || !p.image.visible) continue;
      const k = pileOf(p.wood ? { prop: p.type, wood: p.wood } : { prop: p.type });
      if (k && sameKind(k, kind)) out.push({ lone: { prop: p }, x: p.x, y: p.y, turned: p.wood?.axis === 'ns' });
    }
    for (const g of this.map.ground) {
      const k = pileOf({ item: g.item.item });
      if (!k || !sameKind(k, kind) || !g.image.visible) continue;
      // un objet au sol est posé par le milieu du bas de son image ; couché nord-sud, il commence un tas tourné
      const turned = crosswise(items[g.item.item].views, g.item.view ?? 0);
      if (turned && !pileDefOf(kind).turned) continue;
      out.push({ lone: { ground: g }, x: Math.round(g.item.x - g.image.width / 2), y: g.item.y, turned });
    }
    return out;
  }

  /** Pose `what` (déjà sorti des mains) là où le dit `t`, dans GameState et à l'écran. */
  private put(what: Held, t: Drop): void {
    const mapId = this.map.def.id;
    if (t.kind === 'pile') {
      fillPlace(game, mapId, t.pile.pile.id, t.place);
      this.map.refreshPile(t.pile);
    } else if (t.kind === 'join') {
      // la pièce seule quitte la carte : elle devient la première pièce du tas, à la même place
      if ('prop' in t.lone) {
        const p = t.lone.prop;
        if (p.spawned) changeSpawned(game, mapId, p.id, { x: p.x, y: p.y });
        else changeObject(game, mapId, p.id, { x: p.x, y: p.y });
        this.map.removeProp(p);
      } else {
        removeGroundItem(game, mapId, t.lone.ground.item.id);
        this.map.removeGround(t.lone.ground);
      }
      this.map.placePile(addPile(game, mapId, { ...t.pile, x: t.x, y: t.y, places: [t.lonePlace, t.place], ...(t.turned ? { turned: true } : {}) }));
    } else if (t.kind === 'tie') {
      setPileTie(game, mapId, t.pile.pile.id, true);
      this.map.refreshPile(t.pile);
    } else if (t.kind === 'tie-alone') {
      this.map.placePile(addPile(game, mapId, { pile: t.genre, x: t.x, y: t.y, places: [], tie: true }));
    } else if ('item' in what) {
      this.map.placeGround(dropItem(game, mapId, what.item, t.x, t.y, what.view, what.natural));
    } else {
      const o = spawnObject(game, mapId, what.prop, t.x, t.y, { flip: !!what.flip, length: what.length, wood: what.wood, natural: what.natural });
      this.map.placeProp(o, { flip: what.flip, spawned: true, length: what.length, wood: what.wood, natural: what.natural });
    }
  }

  /** Le fantôme de `what` posé là où le dit `t` : image (et image de planche), coin bas gauche, profondeur. */
  private ghostOf(what: Held, t: Drop): { key: string; frame?: string; x: number; y: number; depth: number } {
    if (t.kind === 'pile' || t.kind === 'join') {
      const def = t.kind === 'pile' ? t.pile.def : shapeOf(pileDefOf(t.pile), t.turned);
      const q = def.places[t.place];
      const [x, y] = t.kind === 'pile' ? [t.pile.pile.x, t.pile.pile.y] : [t.x, t.y];
      // par-dessus le tas qu'il complète ; à côté de la pièce seule, à sa propre profondeur
      const depth = t.kind === 'pile' ? t.pile.depth + 0.999 : y + q.y + 0.5;
      return { key: this.map.placeImage(q), frame: q.wood ? '0' : undefined, x: x + q.x, y: y + q.y, depth };
    }
    if (t.kind === 'tie' || t.kind === 'tie-alone') {
      // sous un tas, son bout de devant, là où il dépassera ; par terre, la boucle du lien seul
      const tie = t.kind === 'tie' ? tieImages(t.pile.def, t.pile.pile.places, !!t.pile.pile.turned, (k) => this.scene.textures.getFrame(k).width)[1] : piles[t.genre].tie!.alone;
      const [x, y] = t.kind === 'tie' ? [t.pile.pile.x, t.pile.pile.y] : [t.x, t.y];
      return { key: tie.image, x: x + tie.x, y: y + tie.y, depth: t.kind === 'tie' ? t.pile.depth : y + tie.y };
    }
    if ('item' in what) {
      const key = naturalGround(items[what.item], what.view, what.natural, (k) => this.scene.textures.exists(k));
      return { key, x: t.x - this.scene.textures.getFrame(key).width / 2, y: t.y, depth: t.y };
    }
    if (what.wood) return { key: woodTexture(this.scene, what.wood), frame: '0', x: t.x, y: t.y, depth: t.y };
    const image = formImage(props[what.prop].image, what.natural);
    return { key: what.flip ? `${image}-left` : image, x: t.x, y: t.y, depth: t.y };
  }

  /**
   * Où va le lien : sous le tas du genre `genre` sans lien dont une pièce est la plus près du point que regarde Xéros, à portée ;
   * sinon par terre, là où commencerait un tas de ce genre juste devant lui, si la place est libre.
   */
  private tieTarget(player: Player, genre: string): Drop | undefined {
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
    if (best) return { kind: 'tie', pile: best };
    const def = piles[genre] as PileShape;
    const body = def.places[def.start].body!;
    const [l, t] = frontCorner(player.actor.body, player.actor.facing, body.w, body.h);
    const x = Math.round(l - body.x);
    const y = Math.round(t - body.y);
    return this.groundFree(this.boxAt(body, x, y), [...this.others, player.actor.body]) ? { kind: 'tie-alone', genre, x, y } : undefined;
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

  /**
   * Où poser `what` seul devant Xéros (voir `layFront`) ; si la place juste devant lui est prise (un tas d'autre chose, une pièce),
   * la plus proche à côté, en glissant de `PUT_DOWN.step` px en travers puis en s'éloignant, au plus `PUT_DOWN.reach` px ; libre
   * de la carte, des cases bloquantes, des objets, des personnages (de Xéros aussi pour un objet du monde) ; sinon undefined.
   */
  private laySpot(player: Player, what: Held): { x: number; y: number } | undefined {
    const [x0, y0] = this.layFront(player, what);
    const [sx, sy] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[player.actor.facing];
    const bodies = 'item' in what ? this.others : [...this.others, player.actor.body];
    const { step, reach } = PUT_DOWN;
    for (let away = 0; away <= reach; away += step) {
      for (let side = 0; side <= reach; side += step) {
        for (const s of side ? [-side, side] : [0]) {
          const x = x0 + sx * away + Math.abs(sy) * s;
          const y = y0 + sy * away + Math.abs(sx) * s;
          if (this.map.areaFree(this.layBox(what, x, y), bodies)) return { x, y };
        }
      }
    }
    return undefined;
  }

  /**
   * La place de `what` posé juste devant Xéros : un objet possédable, son point au sol (milieu du bas de son image, dans sa vue),
   * son image presque collée à la collision de Xéros ; un objet du monde (dans le sens où il est tenu), le coin bas gauche de son
   * image, sa collision presque collée à celle de Xéros ; du côté où il regarde, centré sur lui.
   */
  private layFront(player: Player, what: Held): [number, number] {
    const b = player.actor.body;
    if ('item' in what) {
      const { w, h } = this.itemSize(what);
      const [l, t] = frontCorner(b, player.actor.facing, w, h);
      return [Math.round(l + w / 2), Math.round(t + h)];
    }
    const { f, h } = this.footprint(what);
    const [l, t] = frontCorner(b, player.actor.facing, f.right - f.left, f.bottom - f.top);
    return [Math.round(l - f.left), Math.round(t - f.top + h)];
  }

  /** L'emprise au sol de `what` posé seul en (x, y) : l'image d'un objet possédable dans sa vue, la collision d'un objet du monde. */
  private layBox(what: Held, x: number, y: number): Box {
    if ('item' in what) {
      const { w, h } = this.itemSize(what);
      return { left: x - w / 2, top: y - h, right: x + w / 2, bottom: y };
    }
    const { f, h } = this.footprint(what);
    return { left: x + f.left, top: y - h + f.top, right: x + f.right, bottom: y - h + f.bottom };
  }

  /** La taille de l'image au sol d'un objet possédable, dans sa vue. */
  private itemSize(what: Extract<Held, { item: string }>): { w: number; h: number } {
    const f = this.scene.textures.getFrame(naturalGround(items[what.item], what.view, what.natural, (k) => this.scene.textures.exists(k)));
    return { w: f.width, h: f.height };
  }

  /** La collision d'un objet du monde dans son image (la pièce de bois à la taille de ses réglages), et la hauteur de l'image. */
  private footprint(what: Extract<Held, { prop: string }>): { f: Box; h: number } {
    const def = defOf(what.prop, what.wood);
    const flip = !!what.flip;
    const { w, h } = propSize(this.scene, def, { flip });
    return { f: propFootprint(this.scene, def, { flip }) ?? { left: 0, top: 0, right: w, bottom: h }, h };
  }
}
