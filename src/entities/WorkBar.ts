import Phaser from 'phaser';
import { DEBUG, UI, WORK_BAR, ZOOM } from '../config';
import type { Actor } from './Actor';

/**
 * La jauge d'un travail en cours (systems/work.ts, la passe sur un rail) : au-dessus de la tête de Xéros, dans le monde, elle se remplit
 * de 0 à 100 % (pièces de art/ui/work-bar.ts, posées selon son contrat : WORK_BAR de config.ts).
 */
export class WorkBar {
  private readonly frame: Phaser.GameObjects.Image;
  private readonly fill: Phaser.GameObjects.Image;
  /** ?debug : la force lue, l'énergie du coup, la part enlevée par coup, au-dessus de la jauge. */
  private readonly debug?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.frame = scene.add.image(0, 0, 'ui-work-frame').setOrigin(0).setVisible(false);
    this.fill = scene.add.image(0, 0, 'ui-work-fill').setOrigin(0).setVisible(false);
    if (DEBUG) {
      this.debug = scene.add
        .text(0, 0, '', { fontFamily: UI.font, fontSize: '6px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 2 })
        .setOrigin(0.5, 1)
        .setResolution(ZOOM)
        .setVisible(false);
    }
  }

  /** ?debug : le texte au-dessus de la jauge (rien sans ?debug). */
  info(text: string): void {
    this.debug?.setText(text);
  }

  /** Le texte de ?debug affiché (vide sans ?debug) : lu par les tests. */
  get infoText(): string {
    return this.debug?.text ?? '';
  }

  /** Montre la jauge au-dessus de `actor`, remplie de `fraction` (0 à 1). */
  show(actor: Actor, fraction: number): void {
    const x = Math.round(actor.x + WORK_BAR.dx);
    const y = Math.round(actor.y + WORK_BAR.dy);
    const depth = actor.depth + 0.06;
    this.frame.setPosition(x, y).setDepth(depth).setVisible(true);
    const w = Math.round(WORK_BAR.inner.w * Math.min(1, Math.max(0, fraction)));
    this.fill
      .setPosition(x + WORK_BAR.inner.x, y + WORK_BAR.inner.y)
      .setDepth(depth + 0.001)
      .setCrop(0, 0, w, WORK_BAR.inner.h)
      .setVisible(w > 0);
    this.debug?.setPosition(Math.round(actor.x), y - 1).setDepth(depth + 0.002).setVisible(true);
  }

  hide(): void {
    this.frame.setVisible(false);
    this.fill.setVisible(false);
    this.debug?.setVisible(false);
  }
}
