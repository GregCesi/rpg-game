import Phaser from 'phaser';
import { images, spritesheets, tilesets } from '../generated/assets';

/** Charge tout ce que produit `npm run art` et déclare les animations. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    for (const s of spritesheets) {
      this.load.spritesheet(s.key, s.url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
    }
    for (const t of tilesets) this.load.image(t.key, t.url);
    for (const i of images) this.load.image(i.key, i.url);
  }

  create(): void {
    for (const s of spritesheets) {
      for (const [name, a] of Object.entries(s.animations)) {
        this.anims.create({
          key: `${s.key}-${name}`,
          frames: a.frames.map((frame) => ({ key: s.key, frame })),
          frameRate: a.frameRate,
          repeat: a.repeat,
        });
      }
    }
    this.scene.start('world', { mapId: 'ferme' });
  }
}
