import Phaser from 'phaser';
import { PLAYER } from '../config';
import { PlayerInput } from '../input/PlayerInput';
import { Actor } from './Actor';

/** Le joueur = un Actor piloté par le clavier. */
export class Player {
  readonly actor: Actor;
  private input: PlayerInput;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.actor = new Actor(scene, x, y, PLAYER.skin);
    this.input = new PlayerInput(scene);
  }

  update(): void {
    const { dir, running } = this.input.read();
    this.actor.move(dir, running ? PLAYER.runSpeed : PLAYER.walkSpeed, PLAYER.walkSpeed);
  }
}
