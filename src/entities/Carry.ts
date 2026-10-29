import Phaser from 'phaser';
import { carry, props } from '../content';
import { footprint } from '../world/GameMap';
import type { Actor } from './Actor';

/**
 * Composant attaché à un Actor : porter à deux mains un objet du monde (la bille). Le corps prend la posture `carry`
 * (animations `carry-idle-*`, `carry-walk-*`) et l'image de l'objet est posée sur ses mains, image par image, au point
 * d'accroche de carry.json (la gauche en miroir de la droite) : devant le corps, ou derrière lui de dos (`behind`).
 * Le point de l'objet tenu est `grip` de son `take` (props.json), sinon le centre de sa collision.
 * Un nouvel objet portable n'a besoin que de son image : rien à changer ici.
 */
export class Carry {
  private readonly image: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    private readonly actor: Actor,
  ) {
    this.image = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    // après la physique, juste avant l'affichage : le corps est à sa place de l'image
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.place, this);
    actor.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.place, this);
      this.image.destroy();
    });
  }

  /** Vrai quand il porte : il marche lentement et n'utilise rien. */
  get busy(): boolean {
    return this.image.visible;
  }

  /** Porte l'objet `type` de props.json (`flip` : sa version couchée vers la gauche), ou plus rien (undefined). */
  hold(what: { type: string; flip?: boolean } | undefined): void {
    const stance = what ? 'carry' : '';
    const changed = stance !== this.actor.stance;
    this.actor.stance = stance;
    this.image.setVisible(!!what);
    if (what) {
      const def = props[what.type];
      this.image.setTexture(what.flip ? `${def.image}-left` : def.image);
      const { width: w, height: h } = this.image;
      const box = footprint(def, w, h, !!what.flip);
      const [gx, gy] = def.take?.grip ?? (box ? [(box.left + box.right) / 2, (box.top + box.bottom) / 2] : [w / 2, h / 2]);
      this.image.setOrigin(Math.floor(gx) / w, Math.floor(gy) / h);
    }
    // la nouvelle posture tout de suite, sans attendre un pas ; seulement si elle change : un geste en cours (la hache
    // reçue du billot pendant le geste) ne doit pas être interrompu, sa fin rend la main
    if (changed) this.actor.play(`${this.actor.skin}-${stance ? `${stance}-` : ''}${this.actor.motion}-${this.actor.facing}`, true);
  }

  private place(): void {
    if (!this.image.visible) return;
    const left = this.actor.facing === 'left';
    const dir = left ? 'right' : (this.actor.facing as 'down' | 'up' | 'right');
    const poses = carry[this.actor.motion][dir];
    const step = Math.min((this.actor.anims.currentFrame?.index ?? 1) - 1, poses.length - 1);
    const pose = poses[step];
    this.image
      .setPosition(Math.round(this.actor.x + (left ? -pose.dx : pose.dx)), Math.round(this.actor.y + pose.dy))
      .setDepth(this.actor.y + (pose.behind ? -0.01 : 0.01));
  }
}
