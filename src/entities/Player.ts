import Phaser from 'phaser';
import { PLAYER } from '../config';
import { PlayerInput } from '../input/PlayerInput';
import { Actor } from './Actor';

/** Le joueur = un Actor piloté par le clavier. */
export class Player {
  readonly actor: Actor;
  readonly input: PlayerInput;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.actor = new Actor(scene, x, y, PLAYER.skin);
    this.input = new PlayerInput(scene);
  }

  /** enabled = false pendant un dialogue : le joueur reste immobile. */
  update(enabled = true): void {
    if (!enabled) {
      this.actor.move(new Phaser.Math.Vector2(0, 0), PLAYER.walkSpeed);
      return;
    }
    const { dir, running } = this.input.read();
    this.actor.move(dir, running ? PLAYER.runSpeed : PLAYER.walkSpeed, PLAYER.walkSpeed);
  }

  /** Point au sol juste devant Xéros, là où il "regarde". */
  probe(distance: number): Phaser.Math.Vector2 {
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.actor.facing];
    return new Phaser.Math.Vector2(this.actor.x + d[0] * distance, this.actor.y - 6 + d[1] * distance);
  }
}
