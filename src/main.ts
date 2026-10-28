import Phaser from 'phaser';
import { DEBUG, VIEW } from './config';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#14110d',
  physics: { default: 'arcade', arcade: { debug: DEBUG } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, WorldScene],
});

// Accès depuis la console du navigateur pour déboguer.
(window as unknown as { game: Phaser.Game }).game = game;
