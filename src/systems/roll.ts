import type Phaser from 'phaser';
import { PLAYER, ROLL } from '../config';
import { propMass } from '../content/mass';
import type { Facing } from '../content/types';
import type { Player } from '../entities/Player';
import { changeObject, changeSpawned, game } from '../state';
import { stateOf, timberLook, type GameMap, type PlacedProp } from '../world/GameMap';
import { EXHAUSTED } from './effort';

/** Écart (px) sous lequel Xéros touche une bille, et recouvrement minimal (px) le long d'elle pour la pousser. */
const TOUCH = { gap: 1.5, overlap: 2 };
/** Tous les combien de pixels roulés la position est notée dans GameState (elle l'est aussi à l'arrêt et à la fermeture). */
const SAVE_EVERY = 24;

const STEP: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/**
 * Faire rouler une bille couchée (`roll` de props.json) : Xéros marche contre elle, face à elle, les deux mains libres ; au
 * bout de `ROLL.startMs` de poussée continue, elle avance au pixel, Xéros collé à elle, et s'arrête dès qu'il arrête de
 * pousser (pas d'élan : c'est de l'herbe). Elle ne roule que perpendiculairement à son axe (est-ouest : vers le nord ou le
 * sud ; nord-sud : vers l'est ou l'ouest), à la vitesse de marche × (1 − masse / force de roulement), bornée (`ROLL`,
 * `Strength.rollFactor`) ; au-delà de la force de roulement (strength.json), rien ne bouge : c'est le calcul qui décide.
 * Elle a son propre corps de collision : elle s'arrête contre tout ce qui bloque (murs, objets, eau, arbres, tas, autres
 * billes, personnages). Sa position est notée au pixel dans GameState. Les messages ne se disent qu'une fois par contact.
 */
export class RollSystem {
  private target?: PlacedProp;
  private dir?: Facing;
  /** Poussée continue (ms) ; la bille roule à `ROLL.startMs`. */
  private charge = 0;
  /** Pixels de roulement pas encore faits (la vitesse n'est pas un nombre entier de pixels par image). */
  private acc = 0;
  /** Le message de ce contact est déjà dit. */
  private told = false;
  /** Pixels roulés depuis la dernière écriture dans GameState. */
  private unsaved = 0;

  constructor(
    private readonly map: GameMap,
    /** Corps où une bille ne passe pas (les personnages). */
    private readonly others: Phaser.Physics.Arcade.Body[],
    private readonly notice: (text: string) => void,
    /** Pousser a vidé la jauge : la scène fait trembler la jauge. */
    private readonly exhausted: () => void,
  ) {}

  /** À appeler après `Player.update`, à chaque image. `active` = false pendant un geste, un dialogue ou un changement de carte. */
  update(player: Player, delta: number, active: boolean): void {
    const dir = active && !player.tools.busy && player.dir.lengthSq() > 0 ? player.actor.facing : undefined;
    const target = dir && this.touching(player, dir);
    if (!dir || !target) return this.stop(player);
    if (target !== this.target || dir !== this.dir) {
      this.commit();
      this.target = target;
      this.dir = dir;
      this.charge = 0;
      this.acc = 0;
      this.told = false;
    }
    const roll = target.def.roll!;
    const why = this.refusal(player, target, dir);
    if (why) {
      if (!this.told) (why === EXHAUSTED ? this.exhausted() : this.notice(why));
      this.told = true;
      this.charge = 0;
      player.pushing = false;
      return;
    }
    // il pousse : penché contre la bille d'abord, puis il avance avec elle
    player.pushing = true;
    this.charge += delta;
    player.actor.stance = 'push';
    const none = player.dir.clone().set(0, 0);
    if (this.charge < ROLL.startMs) return player.actor.move(none, 0);
    const mass = propMass(target.type, target.length, undefined, target.hewn);
    const speed = PLAYER.walkSpeed * player.strength.rollFactor(mass);
    // pousser puise dans la jauge, proportionnellement à la masse (stamina.json)
    player.stamina.drain(player.stamina.pushRate(mass), delta);
    const moved = this.advance(this.become(target, roll.into), dir, speed, delta);
    const [sx, sy] = STEP[dir];
    player.actor.move(moved ? none.set(sx, sy) : none, speed, PLAYER.walkSpeed);
  }

  /** Écrit la position de la bille en cours dans GameState (à l'arrêt, à la fermeture de la page). */
  flush(): void {
    this.commit();
  }

  /**
   * Pourquoi la pièce ne roule pas, ou undefined : la poutre (carrée), le rondin dont une face est dressée ou qu'on est en train
   * de couper, le sens de l'axe, les mains prises, trop lourde. Les messages s'accordent au nom (`gender` : le rondin, la bille).
   */
  private refusal(player: Player, p: PlacedProp, dir: Facing): string | undefined {
    const m = p.def.gender === 'm';
    if (p.def.timber && !p.def.roll) return 'Elle ne roule pas : elle est carrée.';
    if (p.def.timber && timberLook(p.def, p.hewn) !== 'round') return 'Il ne roule plus : une face est dressée.';
    if (p.notch) return "Finis d'abord la coupe.";
    const across = p.def.roll!.axis === 'ew' ? dir === 'up' || dir === 'down' : dir === 'left' || dir === 'right';
    if (!across) return m ? 'Il ne roule pas dans ce sens.' : 'Elle ne roule pas dans ce sens.';
    if (game.both || game.hands[0] || game.hands[1]) return "Pose d'abord ce que tu tiens.";
    if (!player.strength.canRoll(propMass(p.type, p.length, undefined, p.hewn))) return m ? 'Trop lourd, il ne bouge pas.' : 'Trop lourde, elle ne bouge pas.';
    if (player.stamina.empty) return EXHAUSTED;
    return undefined;
  }

  /**
   * La bille roulante que touche Xéros en poussant vers `dir` (celle qu'il recouvre le plus), s'il y en a une ; une pièce de bois
   * d'œuvre compte aussi, même si elle ne roule pas (la poutre : elle le dit).
   */
  touching(player: Player, dir: Facing): PlacedProp | undefined {
    const b = player.actor.body;
    let best: PlacedProp | undefined;
    let bestOverlap = TOUCH.overlap - 1e-6;
    for (const p of this.map.props) {
      const k = p.box;
      if (!(p.def.roll || p.def.timber) || !k || !p.image.visible) continue;
      const vertical = dir === 'up' || dir === 'down';
      const gap = dir === 'down' ? k.top - b.bottom : dir === 'up' ? b.top - k.bottom : dir === 'right' ? k.left - b.right : b.left - k.right;
      const overlap = vertical ? Math.min(b.right, k.right) - Math.max(b.left, k.left) : Math.min(b.bottom, k.bottom) - Math.max(b.top, k.top);
      if (gap < -1 || gap > TOUCH.gap || overlap <= bestOverlap) continue;
      best = p;
      bestOverlap = overlap;
    }
    return best;
  }

  /** La pièce du tronc devient la bille ronde qui roule (`into`), à la même place ; l'objet ordinaire reste lui-même. */
  private become(p: PlacedProp, into?: string): PlacedProp {
    if (!into) return p;
    const next = this.map.convertProp(p, into);
    this.target = next;
    this.record(next);
    return next;
  }

  /** Fait avancer la bille de `speed` px/s pendant `delta` ms, au pixel, jusqu'à ce qu'elle bute. Vrai si elle a bougé. */
  private advance(p: PlacedProp, dir: Facing, speed: number, delta: number): boolean {
    const [sx, sy] = STEP[dir];
    this.acc += (speed * delta) / 1000;
    const steps = Math.floor(this.acc);
    this.acc -= steps;
    let moved = 0;
    for (let i = 0; i < steps; i++) {
      if (!this.free(p, sx, sy)) {
        this.acc = 0;
        break;
      }
      this.map.moveProp(p, sx, sy);
      moved++;
    }
    this.unsaved += moved;
    if (this.unsaved >= SAVE_EVERY || (steps > 0 && moved < steps)) this.commit();
    return moved > 0 || steps === 0;
  }

  /** La bille, décalée d'un pixel, tient sur du sol libre (carte, cases, objets, tas, personnages) hors d'elle-même. */
  private free(p: PlacedProp, sx: number, sy: number): boolean {
    const k = p.box!;
    const zones = p.parts.filter((q) => q.type === 'Zone');
    return this.map.areaFree({ left: k.left + sx, top: k.top + sy, right: k.right + sx, bottom: k.bottom + sy }, this.others, zones);
  }

  /** L'arrêt : plus de poussée, la position est notée, la posture rendue. */
  private stop(player: Player): void {
    this.commit();
    this.target = undefined;
    this.dir = undefined;
    this.charge = 0;
    this.acc = 0;
    player.pushing = false;
  }

  /** Note la position de la bille dans GameState, au pixel. */
  private commit(): void {
    if (!this.target || !this.unsaved) return;
    this.unsaved = 0;
    this.record(this.target);
  }

  private record(p: PlacedProp): void {
    const change = stateOf(p);
    if (p.spawned) changeSpawned(game, this.map.def.id, p.id, change);
    else changeObject(game, this.map.def.id, p.id, change);
  }
}
