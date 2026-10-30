import type Phaser from 'phaser';
import { DEPTH } from '../config';

/**
 * Des fantômes : des images en transparence qui montrent où ira une pièce (la pièce d'un tas qu'on va poser, les places de
 * l'étape en cours d'un chantier). Un petit lot d'images réutilisées, créées au besoin ; commun aux tas et aux chantiers.
 */
export class Ghosts {
  private readonly images: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    /** Opacité par défaut. */
    private readonly alpha = 0.5,
  ) {}

  /** Montre le fantôme n° `i` : l'image `key` (son image `frame` pour une planche), son coin bas gauche en (x, y), à la profondeur `depth`. */
  show(i: number, key: string, x: number, y: number, depth: number, alpha = this.alpha, frame?: string): void {
    while (this.images.length <= i) this.images.push(this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 1).setVisible(false));
    this.images[i].setTexture(key, frame).setPosition(x, y).setDepth(Math.min(depth, DEPTH.prompt - 1)).setAlpha(alpha).setVisible(true);
  }

  /** Cache les fantômes à partir du n° `from` (0 : tous). */
  hideFrom(from: number): void {
    for (let i = from; i < this.images.length; i++) this.images[i].setVisible(false);
  }

  /** Détruit toutes les images (le chantier change de carte, ou disparaît). */
  destroy(): void {
    for (const g of this.images) g.destroy();
    this.images.length = 0;
  }
}
