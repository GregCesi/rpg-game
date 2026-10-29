import Phaser from 'phaser';
import { PLAYER } from '../config';
import { PlayerInput } from '../input/PlayerInput';
import { Actor } from './Actor';
import { Hold } from './Hold';
import { ToolUse } from './ToolUse';

/** Le joueur = un Actor piloté par le clavier, avec les composants du geste d'outil et de ce qu'il tient (Hold). */
export class Player {
  readonly actor: Actor;
  readonly input: PlayerInput;
  readonly tools: ToolUse;
  readonly hold: Hold;
  /** Direction demandée au dernier tour (0,0 si immobile). */
  dir = new Phaser.Math.Vector2(0, 0);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.actor = new Actor(scene, x, y, PLAYER.skin);
    this.input = new PlayerInput(scene);
    this.tools = new ToolUse(scene, this.actor);
    this.hold = new Hold(scene, this.actor, () => this.tools.busy);
  }

  /** enabled = false pendant un dialogue : le joueur reste immobile. */
  update(enabled = true): void {
    // pendant un geste, le corps reste sur place et garde son animation
    if (this.tools.busy) {
      this.dir.set(0, 0);
      return;
    }
    if (!enabled) {
      this.dir.set(0, 0);
      this.actor.move(this.dir, PLAYER.walkSpeed);
      return;
    }
    const { dir, running } = this.input.read();
    this.dir = dir;
    // chargé, il marche lentement et ne court pas (l'animation carry-walk a déjà sa cadence lente)
    if (this.hold.loaded) this.actor.move(dir, PLAYER.carrySpeed);
    else this.actor.move(dir, running ? PLAYER.runSpeed : PLAYER.walkSpeed, PLAYER.walkSpeed);
  }

  /** Point au sol juste devant Xéros, là où il "regarde". */
  probe(distance: number): Phaser.Math.Vector2 {
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.actor.facing];
    return new Phaser.Math.Vector2(this.actor.x + d[0] * distance, this.actor.y - 6 + d[1] * distance);
  }
}
