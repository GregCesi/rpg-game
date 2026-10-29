import Phaser from 'phaser';
import { DEPTH, INTERACT } from '../config';
import type { Player } from '../entities/Player';
import type { Interactable } from '../world/GameMap';

/**
 * Repère ce qui est devant Xéros (objet, personnage, objet au sol), affiche l'invite (touche E) au-dessus,
 * et signale quand le joueur appuie sur E. Ne sait pas ce que fait la cible : c'est la scène qui décide.
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
   * Renvoie l'objet utilisé si le joueur vient d'appuyer sur la touche d'action devant lui.
   */
  update(time: number, active: boolean): Interactable | undefined {
    // Toujours lue, même inactif : sinon un appui fait pendant un dialogue ressortirait juste après.
    const pressed = this.player.input.handsPressed();
    this.setTarget(active ? this.nearest() : undefined);
    if (!this.target) return undefined;
    const bob = Math.round((Math.sin(time / 220) + 1) / 2) * 2;
    this.prompt.setPosition(this.target.x, this.target.top + 4 - bob);
    return pressed && time >= this.lockedUntil ? this.target : undefined;
  }

  /** Ignore la touche d'action pendant `ms` : l'appui qui ferme un dialogue ne doit pas en rouvrir un. */
  lock(ms: number): void {
    this.lockedUntil = this.scene.time.now + ms;
  }

  /** Objet le plus proche du point que regarde Xéros, s'il est à portée. */
  private nearest(): Interactable | undefined {
    const probe = this.player.probe(INTERACT.reach);
    let best: Interactable | undefined;
    let bestD = INTERACT.radius;
    for (const it of this.items()) {
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
