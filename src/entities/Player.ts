import Phaser from 'phaser';
import { AIM, PLAYER } from '../config';
import { aimProbe, facingToward, type Point } from '../world/aim';
import { SPEEDS } from '../systems/speeds';
import { PlayerInput } from '../input/PlayerInput';
import { Actor } from './Actor';
import { Breath } from './Breath';
import { Hold } from './Hold';
import { Stamina } from './Stamina';
import { Strength } from './Strength';
import { ToolUse } from './ToolUse';

/** Le joueur = un Actor piloté par le clavier, avec les composants du geste d'outil et de ce qu'il tient (Hold). */
export class Player {
  readonly actor: Actor;
  readonly input: PlayerInput;
  readonly tools: ToolUse;
  readonly hold: Hold;
  /** La force : ce qu'il porte, à quelle vitesse il marche chargé, ce qu'il fait rouler. */
  readonly strength = new Strength();
  /** L'endurance : la fatigue de la journée (courir, porter, pousser et les gestes y puisent). */
  readonly stamina = new Stamina();
  /** Essoufflé, il souffle : la bouffée près de sa bouche. */
  readonly breath: Breath;
  /** Il court à cette image (lu par systems/effort.ts, qui en fait payer la course). */
  running = false;
  /** Maj est pressée mais Xéros est épuisé (plafond vide) : lu par la scène pour le dire. Fatigué ou à bout de souffle, il marche sans message. */
  runRefused = false;
  /**
   * Il marche discrètement (Alt maintenu, à pas lents : une part de la marche, `sneak` de systems/speeds.ts) : l'état que liront les
   * créatures (systems/creatures.ts : discret, il approche plus près). Vrai tant que la touche est tenue, même à l'arrêt.
   */
  sneaking = false;
  /** Il pousse une bille qui roule (posé par systems/roll.ts à chaque image) : posture `push`. */
  pushing = false;
  /** Direction demandée au dernier tour (0,0 si immobile). */
  dir = new Phaser.Math.Vector2(0, 0);
  /**
   * Les pieds à l'image d'avant (relevés au début de `update`, après la physique) : ce qui se déclenche en passant se teste sur le
   * chemin depuis là (world/crossing.ts), pas à la position de l'instant.
   */
  from?: { x: number; y: number };
  private feet?: { x: number; y: number };
  /**
   * Le point du monde sous le curseur, posé par la scène à chaque image (src/world/aim.ts) ; undefined sans souris (au clavier seul, il
   * vise devant lui) ou quand le curseur ne compte pas (le mode construction).
   */
  cursor?: Point;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.actor = new Actor(scene, x, y, PLAYER.skin);
    this.input = new PlayerInput(scene);
    this.tools = new ToolUse(scene, this.actor);
    this.hold = new Hold(scene, this.actor, () => this.tools.busy);
    this.breath = new Breath(scene, this.actor);
  }

  /** enabled = false pendant un dialogue : le joueur reste immobile. */
  update(enabled = true): void {
    this.from = this.feet;
    this.feet = { x: this.actor.x, y: this.actor.y };
    this.running = false;
    this.runRefused = false;
    this.breath.update(this.stamina.winded && !this.stamina.infinite);
    // pendant un geste, le corps reste sur place et garde son animation
    if (this.tools.busy) {
      this.dir.set(0, 0);
      return;
    }
    if (!enabled) {
      this.dir.set(0, 0);
      this.actor.move(this.dir, SPEEDS.walk, PLAYER.walkCadence);
      return;
    }
    const { dir, running, sneaking } = this.input.read();
    this.dir = dir;
    this.sneaking = sneaking;
    // à l'arrêt, il se tourne vers le curseur ; en marchant, il regarde où il va (Actor.move)
    if (dir.lengthSq() === 0) this.faceCursor();
    this.actor.stance = this.pushing ? 'push' : this.hold.stance;
    // au-delà de ce qu'il porte sans peine, il ne court pas et marche de moins en moins vite (Strength) ; la marche
    // portée garde sa cadence de dessin, accélérée ou ralentie d'autant (sans dépasser une foulée vive).
    // Fatigué (sous le seuil de stamina.json), il marche moins vite et ne court plus.
    const factor = this.strength.walkFactor() * this.stamina.walkFactor();
    // discret : la même part de la marche d'alors (chargé, fatigué), la cadence du dessin ralentie d'autant
    const part = sneaking ? SPEEDS.sneak : 1;
    if (this.hold.loaded) this.actor.move(dir, SPEEDS.walk * factor * part, Math.max(PLAYER.carryCadence, (SPEEDS.walk * factor) / PLAYER.carryStride));
    else if (running && this.strength.canRun() && this.stamina.canRun()) {
      this.actor.move(dir, SPEEDS.run * factor, PLAYER.walkCadence);
      this.running = dir.lengthSq() > 0;
    } else {
      this.runRefused = running && this.strength.canRun() && this.stamina.empty && dir.lengthSq() > 0;
      this.actor.move(dir, SPEEDS.walk * factor * part, PLAYER.walkCadence);
    }
  }

  /** Le point d'où Xéros regarde : un peu au-dessus de ses pieds. */
  get eye(): Point {
    return { x: this.actor.x, y: this.actor.y - 6 };
  }

  /**
   * Le point qu'il vise (src/world/aim.ts) : sous le curseur s'il est à portée (`AIM.reach`), sinon à `distance` px dans la direction du
   * curseur ; sans curseur, à `distance` px devant lui.
   */
  probe(distance: number): Phaser.Math.Vector2 {
    const p = aimProbe(this.eye, this.cursor, this.actor.facing, AIM.reach, distance);
    return new Phaser.Math.Vector2(p.x, p.y);
  }

  /** Se tourner vers le curseur, dans la plus proche de ses directions de dessin (à l'arrêt, et au moment de toute action). */
  faceCursor(): void {
    const c = this.cursor;
    if (!c) return;
    const f = facingToward(c.x - this.eye.x, c.y - this.eye.y, this.actor.facing);
    if (f !== this.actor.facing) this.actor.face(f);
  }
}
