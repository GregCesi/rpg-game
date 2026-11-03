import Phaser from 'phaser';
import { DEPTH, INTERACT } from '../config';
import type { Player } from '../entities/Player';
import type { Action, Interactable } from '../world/GameMap';

/** Ce que fait E, sans les mains : parler (la paillasse, « Dormir ? », est un dialogue), ouvrir ou fermer, lire la planchette. */
const E_KINDS: readonly Action['kind'][] = ['talk', 'swing', 'learn'];

/** Ce qui est visé : par E (`talk`, `swing`, `learn`), ou par un clic (tout le reste : prendre, poser sur, une place de chantier). */
export const isEAction = (a: Action): boolean => E_KINDS.includes(a.kind);

/**
 * Repère ce que vise Xéros (sous le curseur à portée, sinon dans sa direction : src/world/aim.ts) : pour E, ce qui se fait sans les
 * mains (l'invite « touche E » au-dessus) ; pour les clics, ce que les mains prennent ou sur quoi elles posent (`handTarget`). Signale
 * quand le joueur appuie sur E. Ne sait pas ce que fait la cible : c'est la scène qui décide.
 */
export class InteractionSystem {
  private target?: Interactable;
  private lockedUntil = 0;
  private readonly prompt: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    /** Les cibles possibles en ce moment : la liste change quand un objet est récolté ou ramassé. */
    private readonly items: () => readonly Interactable[],
  ) {
    this.prompt = scene.add.image(0, 0, 'ui-key-e').setOrigin(0.5, 1).setDepth(DEPTH.prompt).setVisible(false);
  }

  /**
   * À appeler à chaque image. `active` = false pendant un dialogue ou un changement de carte.
   * `pressed` : le joueur vient d'appuyer sur E ; `target` : ce que E viserait, s'il y a quelque chose.
   */
  update(time: number, active: boolean): { pressed: boolean; target?: Interactable } {
    // Toujours lue, même inactif : sinon un appui fait pendant un dialogue ressortirait juste après.
    const pressed = this.player.input.handsPressed() && active && time >= this.lockedUntil;
    this.setTarget(active ? this.nearest(isEAction) : undefined);
    if (this.target) {
      const bob = Math.round((Math.sin(time / 220) + 1) / 2) * 2;
      this.prompt.setPosition(this.target.x, this.target.top + 4 - bob);
    }
    return { pressed, target: this.target };
  }

  /** Ce que vise un clic (prendre, reprendre, poser sur, une place de chantier) : le plus proche du point visé, à portée. */
  handTarget(): Interactable | undefined {
    return this.nearest((a) => !isEAction(a));
  }

  /** E et les clics sont ignorés en ce moment (juste après un dialogue, un travail). */
  get locked(): boolean {
    return this.scene.time.now < this.lockedUntil;
  }

  /** Ignore E et les clics pendant `ms` : l'appui qui ferme un dialogue ne doit pas en rouvrir un. */
  lock(ms: number): void {
    this.lockedUntil = this.scene.time.now + ms;
  }

  /** Objet le plus proche du point que vise Xéros, s'il est à portée, parmi ceux que `keep` garde. */
  private nearest(keep: (a: Action) => boolean): Interactable | undefined {
    const probe = this.player.probe(INTERACT.reach);
    let best: Interactable | undefined;
    let bestD = INTERACT.radius;
    for (const it of this.items()) {
      if (!keep(it.action)) continue;
      const d = Phaser.Math.Distance.Between(probe.x, probe.y, it.x, it.y);
      if (d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  private setTarget(t: Interactable | undefined): void {
    if (t === this.target) return;
    this.target = t;
    this.prompt.setVisible(!!t);
  }
}
