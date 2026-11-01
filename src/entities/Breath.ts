import Phaser from 'phaser';
import { BREATH } from '../config';
import type { Actor } from './Actor';

/**
 * Composant du joueur : Xéros essoufflé souffle (docs/CONCEPTION.md, « Le temps ») ; tant que `on`, une bouffée (`fx-breath-puff`, en
 * boucle) sort près de sa bouche, juste au-dessus de lui, aux accroches de BREATH (config.ts). Le signe visible qu'un effort attend
 * son souffle, sans message.
 */
export class Breath {
  private readonly puff: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, private readonly actor: Actor) {
    this.puff = scene.add.sprite(0, 0, 'fx-breath').setOrigin(0).setVisible(false);
    actor.once(Phaser.GameObjects.Events.DESTROY, () => this.puff.destroy());
  }

  /** À chaque image : montre la bouffée (`on`) à sa place, ou la cache. */
  update(on: boolean): void {
    if (!on) {
      if (this.puff.visible) this.puff.stop().setVisible(false);
      return;
    }
    const a = BREATH[this.actor.facing];
    if (!this.puff.visible) this.puff.setVisible(true).play('fx-breath-puff');
    this.puff.setPosition(Math.round(this.actor.x + a.dx), Math.round(this.actor.y + a.dy)).setFlipX(a.flipX).setDepth(this.actor.depth + 0.05);
  }
}
