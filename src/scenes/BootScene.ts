import Phaser from 'phaser';
import { START } from '../config';
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
    this.makeGlow();
    this.scene.start('world', { mapId: START.map, spawn: START.spawn });
    this.scene.launch('hud');
  }

  /** Halo radial pour les lueurs de feu (effet de lumière, pas du pixel art : généré ici). */
  private makeGlow(): void {
    const size = 128;
    const tex = this.textures.createCanvas('glow', size, size)!;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
