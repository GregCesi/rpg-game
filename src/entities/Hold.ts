import Phaser from 'phaser';
import { hold } from '../content';
import type { HoldPoint, Stance } from '../content/types';
import type { Actor } from './Actor';

/**
 * Ce qui se voit d'un objet tenu : sa planche `held-<…>` (vues `down`, `up`, `right`), ou une texture assemblée dont les images
 * s'appellent `down`, `up`, `right` (`texture` : la pièce de bois portée, à sa longueur), sinon son icône.
 */
export interface Look {
  image?: string;
  texture?: string;
  icon: string;
}

/** Ce que tient le personnage : un objet par main, ou un seul à deux mains, dans sa posture (`shoulder`, `carry`). */
export type Holding = { left?: Look; right?: Look } | { both: Look; stance: Exclude<Stance, 'hand'> };

type Hand = 'left' | 'right';

/**
 * Composant attaché à un Actor : ce qu'il tient se voit sur lui à l'attente et à la marche, dans les 4 directions.
 * Le corps prend la posture de l'objet (bras pendants, `shoulder-*` pour la hache sur l'épaule, `carry-*` pour la bille
 * portée devant lui) et chaque image d'objet est posée par son centre au point d'accroche de hold.json, image par image,
 * comme l'outil d'un geste ; vers la gauche, le miroir de la droite, mains échangées. Caché pendant un geste (`hidden`).
 * Un nouvel objet tenu = sa planche et son `hold` dans items.json ou props.json : rien à changer ici.
 */
export class Hold {
  /** Image de la main gauche de l'Actor, de la droite (et de l'objet tenu à deux mains). */
  private readonly images: Record<Hand, Phaser.GameObjects.Image>;
  private holding: Holding = {};

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly actor: Actor,
    /** Vrai pendant un geste : l'outil du geste remplace ce qui est tenu. */
    private readonly hidden: () => boolean,
  ) {
    const image = () => scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.images = { left: image(), right: image() };
    // après la physique, juste avant l'affichage : le corps est à sa place de l'image
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.place, this);
    actor.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.place, this);
      this.images.left.destroy();
      this.images.right.destroy();
    });
  }

  /** Posture du corps que lui donne ce qu'il tient : `shoulder`, `carry`, ou vide (bras pendants). */
  get stance(): string {
    return 'both' in this.holding ? this.holding.stance : '';
  }

  /** Vrai quand il porte devant lui à deux mains (la bille) : il marche lentement et n'utilise rien. */
  get loaded(): boolean {
    return 'both' in this.holding && this.holding.stance === 'carry';
  }

  set(holding: Holding): void {
    this.holding = holding;
    const stance = 'both' in holding ? holding.stance : '';
    const changed = stance !== this.actor.stance;
    this.actor.stance = stance;
    // la nouvelle posture tout de suite, sans attendre un pas ; pas pendant un geste (la hache reçue du billot) :
    // sa fin rend la main et reprend la posture
    if (changed && !this.hidden()) this.actor.play(`${this.actor.skin}-${stance ? `${stance}-` : ''}${this.actor.motion}-${this.actor.facing}`, true);
  }

  private place(): void {
    const h = this.holding;
    const off = this.hidden();
    const left = this.actor.facing === 'left';
    const dir = left ? 'right' : (this.actor.facing as 'down' | 'up' | 'right');
    const frame = (n: number) => Math.min((this.actor.anims.currentFrame?.index ?? 1) - 1, n - 1);
    if ('both' in h) {
      const points = hold[h.stance][this.actor.motion][dir];
      this.show(this.images.right, off ? undefined : h.both, points[frame(points.length)], dir, left);
      this.images.left.setVisible(false);
      return;
    }
    const points = hold.hand[this.actor.motion][dir];
    const pair = points[frame(points.length)];
    for (const hand of ['left', 'right'] as const) {
      // vers la gauche, la main côté spectateur est l'autre : on prend le point de l'autre main, en miroir
      const other: Hand = hand === 'left' ? 'right' : 'left';
      this.show(this.images[hand], off ? undefined : h[hand], pair[left ? other : hand], dir, left);
    }
  }

  private show(image: Phaser.GameObjects.Image, look: Look | undefined, p: HoldPoint, dir: string, left: boolean): void {
    image.setVisible(!!look);
    if (!look) return;
    if (look.texture) image.setTexture(look.texture, dir);
    else if (look.image) image.setTexture(look.image, this.scene.anims.get(`${look.image}-${dir}`).frames[0].frame.name);
    else image.setTexture(look.icon);
    image
      .setFlipX(left)
      // point d'accroche au centre de l'image (arrondi vers le bas), comme la prise d'un outil
      .setOrigin(Math.floor(image.width / 2) / image.width, Math.floor(image.height / 2) / image.height)
      .setPosition(Math.round(this.actor.x + (left ? -p.dx : p.dx)), Math.round(this.actor.y + p.dy))
      .setDepth(this.actor.y + (p.behind ? -0.01 : 0.01));
  }
}
