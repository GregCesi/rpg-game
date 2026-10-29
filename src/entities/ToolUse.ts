import Phaser from 'phaser';
import { gestures } from '../content';
import type { Pose } from '../content/types';
import type { Actor } from './Actor';


/**
 * Composant attaché à un Actor : un geste d'outil (clé de gestures.json : `use` de côté, `chop` de haut en bas),
 * soit l'animation `<geste>-<direction>` du corps, avec l'outil en main posé image par image : l'animation
 * `<geste>-<direction>` de la planche `tool-<objet>` (la gauche = la droite retournée), placée sur la main d'après gestures.json.
 * Sans planche ou sans cette animation pour l'objet tenu, le geste se joue les mains vides.
 * Un nouvel outil = une nouvelle planche, rien à changer ici.
 */
export class ToolUse {
  /** Vrai pendant le geste : le personnage ne marche pas. */
  busy = false;
  private readonly tool: Phaser.GameObjects.Image;
  /** Geste en cours et animation de l'outil (sans la direction), ex. 'chop' et 'tool-axe-chop'. */
  private gesture = 'use';
  private toolAnim?: string;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly actor: Actor,
  ) {
    this.tool = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    actor.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.place());
    actor.once(Phaser.GameObjects.Events.DESTROY, () => this.tool.destroy());
  }

  /**
   * Joue le geste `gesture` (clé de gestures.json) avec l'objet `item` en main (undefined = mains nues).
   * `onImpact` est appelé à l'image où le coup porte, `onDone` à la fin du geste.
   */
  swing(gesture: string, item: string | undefined, onImpact: () => void, onDone: () => void): void {
    const g = gestures[gesture];
    const dir = this.actor.facing === 'left' ? 'right' : this.actor.facing;
    const anim = `tool-${item}-${gesture}`;
    this.gesture = gesture;
    this.toolAnim = item && this.scene.anims.exists(`${anim}-${dir}`) ? anim : undefined;
    this.busy = true;
    this.actor.body.setVelocity(0, 0);
    this.actor.anims.timeScale = 1;
    this.tool.setVisible(!!this.toolAnim);
    if (this.toolAnim) this.tool.setTexture(`tool-${item}`);

    const key = `${this.actor.skin}-${gesture}-${this.actor.facing}`;
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
    if (!this.busy || !this.tool.visible || !this.toolAnim) return;
    const step = (this.actor.anims.currentFrame?.index ?? 1) - 1;
    const left = this.actor.facing === 'left';
    const dir = left ? 'right' : (this.actor.facing as 'down' | 'up' | 'right');
    const pose: Pose = gestures[this.gesture].poses[dir][step];
    const frame = this.scene.anims.get(`${this.toolAnim}-${dir}`).frames[step].frame;
    this.tool
      .setFrame(frame.name)
      .setFlipX(left)
      // prise du manche au centre de l'image d'outil (arrondie vers le bas), posée sur la main
      .setOrigin(Math.floor(this.tool.width / 2) / this.tool.width, Math.floor(this.tool.height / 2) / this.tool.height)
      .setPosition(this.actor.x + (left ? -pose.dx : pose.dx), this.actor.y + pose.dy)
      // derrière le corps, devant lui, ou devant ce qui est frappé au sud des pieds (`ahead`)
      .setDepth(this.actor.y + (pose.behind ? -0.01 : Math.max(0.01, pose.ahead)));
  }
}
