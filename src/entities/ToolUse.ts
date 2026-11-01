import Phaser from 'phaser';
import { gestures } from '../content';
import type { Pose } from '../content/types';
import type { Actor } from './Actor';
import { weaponFrame } from '../world/strike';

/**
 * Une attaque (systems/combat.ts) : `weapon`, la planche de l'arme (`weapon-<…>`, un dessin en huit angles : l'image de l'angle de
 * chaque pose est posée sur la main) ; `durations`, la durée de chaque image du geste en ms (armer, frapper, récupérer), à la place
 * de la cadence du geste.
 */
export interface SwingOptions {
  weapon?: string;
  durations?: number[];
}


/**
 * Composant attaché à un Actor : un geste d'outil (clé de gestures.json : `use` de côté, `chop` de haut en bas),
 * soit l'animation `<geste>-<direction>` du corps, avec l'outil en main posé image par image : l'animation
 * `<geste>-<direction>` de la planche `tool-<objet>` (la gauche = la droite retournée), placée sur la main d'après gestures.json.
 * Sans planche ou sans cette animation pour l'objet tenu, le geste se joue les mains vides.
 * Un nouvel outil = une nouvelle planche, rien à changer ici. Une attaque (systems/combat.ts) joue le même geste avec l'arme : sa
 * planche `weapon-<…>` en huit angles, l'image de l'angle de chaque pose (gestures.json) posée sur la main, et ses propres durées.
 */
export class ToolUse {
  /** Vrai pendant le geste : le personnage ne marche pas. */
  busy = false;
  private readonly tool: Phaser.GameObjects.Image;
  /** Geste en cours et animation de l'outil (sans la direction), ex. 'chop' et 'tool-axe-chop'. */
  private gesture = 'use';
  private toolAnim?: string;
  /** Arrête le geste en cours sans son `onDone` (une passe sur un rail interrompue par Échap) ; absent hors d'un geste. */
  private stop?: () => void;
  /** Planche de l'arme du geste en cours (une attaque), à la place de la planche d'outil. */
  private weapon?: string;

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
  swing(gesture: string, item: string | undefined, onImpact: () => void, onDone: () => void, opts: SwingOptions = {}): void {
    const g = gestures[gesture];
    const dir = this.actor.facing === 'left' ? 'right' : this.actor.facing;
    const anim = `tool-${item}-${gesture}`;
    this.gesture = gesture;
    this.weapon = opts.weapon && this.scene.textures.exists(opts.weapon) ? opts.weapon : undefined;
    this.toolAnim = !this.weapon && item && this.scene.anims.exists(`${anim}-${dir}`) ? anim : undefined;
    this.busy = true;
    this.actor.body.setVelocity(0, 0);
    this.actor.anims.timeScale = 1;
    this.tool.setVisible(!!this.toolAnim || !!this.weapon);
    if (this.weapon) this.tool.setTexture(this.weapon);
    else if (this.toolAnim) this.tool.setTexture(`tool-${item}`);

    const key = this.timed(`${this.actor.skin}-${gesture}-${this.actor.facing}`, opts.durations);
    const onFrame = (_a: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      if (frame.index - 1 === g.impact) onImpact();
    };
    const end = () => {
      this.actor.off(Phaser.Animations.Events.ANIMATION_UPDATE, onFrame);
      this.actor.off(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key, complete);
      this.stop = undefined;
      this.tool.setVisible(false);
      this.busy = false;
      this.actor.face(this.actor.facing);
    };
    const complete = () => {
      end();
      onDone();
    };
    this.stop = end;
    this.actor.on(Phaser.Animations.Events.ANIMATION_UPDATE, onFrame);
    this.actor.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key, complete);
    this.actor.play(key);
    this.place();
  }

  /** Interrompt le geste en cours, là où il en est : ni impact ni `onDone` ; le corps reprend sa pose. Sans geste, rien. */
  cancel(): void {
    this.stop?.();
  }

  /**
   * L'animation du corps `key` jouée à d'autres durées (ms par image) : une copie, créée à la première demande et gardée (une par
   * arme et par attaque : les durées dépendent de l'arme). Sans durées, `key` telle quelle.
   */
  private timed(key: string, durations?: number[]): string {
    if (!durations) return key;
    const timedKey = `${key}@${durations.join('-')}`;
    if (this.scene.anims.exists(timedKey)) return timedKey;
    const base = this.scene.anims.get(key);
    // une image par milliseconde, plus sa durée propre (Phaser ajoute `duration` au temps d'une image)
    this.scene.anims.create({
      key: timedKey,
      frames: base.frames.map((f, i) => ({ key: f.textureKey, frame: f.textureFrame, duration: Math.max(0, (durations[i] ?? 1) - 1) })),
      frameRate: 1000,
      repeat: 0,
    });
    return timedKey;
  }

  /** Pose l'outil (ou l'arme) sur la main, pour l'image en cours du geste. */
  private place(): void {
    if (!this.busy || !this.tool.visible || (!this.toolAnim && !this.weapon)) return;
    const step = (this.actor.anims.currentFrame?.index ?? 1) - 1;
    const left = this.actor.facing === 'left';
    const dir = left ? 'right' : (this.actor.facing as 'down' | 'up' | 'right');
    const pose: Pose = gestures[this.gesture].poses[dir][step];
    // l'arme : l'image de l'angle de la pose dans sa planche de huit ; l'outil : l'image du geste dans la sienne
    const frame = this.weapon
      ? this.scene.anims.get(`${this.weapon}-angles`).frames[weaponFrame(pose.angle)].frame
      : this.scene.anims.get(`${this.toolAnim}-${dir}`).frames[step].frame;
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
