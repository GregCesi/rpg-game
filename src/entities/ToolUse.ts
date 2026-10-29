import Phaser from 'phaser';
import { gestures } from '../content';
import type { Pose } from '../content/types';
import type { Actor } from './Actor';

/** Le geste d'outil : clé dans gestures.json, et préfixe des animations du corps (`use-down`...). */
const GESTURE = 'use';
/** Images par direction dans une planche d'outil `tool-<objet>` : down, up, right, dans cet ordre. */
const ORDER = ['down', 'up', 'right'] as const;

/**
 * Composant attaché à un Actor : le geste d'outil (animation `use-<direction>` du corps), avec l'outil en main
 * posé image par image (planche `tool-<objet>`, place de la main dans gestures.json). Sans planche pour l'objet tenu,
 * le geste se joue les mains vides. Un nouvel outil = une nouvelle planche, rien à changer ici.
 */
export class ToolUse {
  /** Vrai pendant le geste : le personnage ne marche pas. */
  busy = false;
  private readonly tool: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly actor: Actor,
  ) {
    this.tool = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    actor.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.place());
    actor.once(Phaser.GameObjects.Events.DESTROY, () => this.tool.destroy());
  }

  /**
   * Joue le geste avec l'objet `item` en main (undefined = mains nues).
   * `onImpact` est appelé à l'image où le coup porte, `onDone` à la fin du geste.
   */
  swing(item: string | undefined, onImpact: () => void, onDone: () => void): void {
    const g = gestures[GESTURE];
    const sheet = item && this.scene.textures.exists(`tool-${item}`) ? `tool-${item}` : undefined;
    this.busy = true;
    this.actor.body.setVelocity(0, 0);
    this.actor.anims.timeScale = 1;
    this.tool.setVisible(!!sheet);
    if (sheet) this.tool.setTexture(sheet, 0);

    const key = `${this.actor.skin}-${GESTURE}-${this.actor.facing}`;
    const onFrame = (_a: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      if (frame.index - 1 === g.impact) onImpact();
    };
    this.actor.on(Phaser.Animations.Events.ANIMATION_UPDATE, onFrame);
    this.actor.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key, () => {
      this.actor.off(Phaser.Animations.Events.ANIMATION_UPDATE, onFrame);
      this.tool.setVisible(false);
      this.busy = false;
      this.actor.face(this.actor.facing);
      onDone();
    });
    this.actor.play(key);
    this.place();
  }

  /** Pose l'outil sur la main, pour l'image en cours du geste. */
  private place(): void {
    if (!this.busy || !this.tool.visible) return;
    const step = (this.actor.anims.currentFrame?.index ?? 1) - 1;
    const left = this.actor.facing === 'left';
    const dir = left ? 'right' : (this.actor.facing as (typeof ORDER)[number]);
    const poses = gestures[GESTURE].poses[dir];
    const pose: Pose = poses[step];
    this.tool
      .setFrame(ORDER.indexOf(dir) * poses.length + step)
      .setFlipX(left)
      // prise du manche au centre de l'image d'outil (arrondie vers le bas), posée sur la main
      .setOrigin(Math.floor(this.tool.width / 2) / this.tool.width, Math.floor(this.tool.height / 2) / this.tool.height)
      .setPosition(this.actor.x + (left ? -pose.dx : pose.dx), this.actor.y + pose.dy)
      .setDepth(this.actor.y + (pose.behind ? -0.01 : 0.01));
  }
}
