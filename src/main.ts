import Phaser from 'phaser';
import '@fontsource/pixelify-sans/latin-400.css';
import { DEBUG, UI, VIEW, ZOOM } from './config';
import { BootScene } from './scenes/BootScene';
import { DialogueScene } from './scenes/DialogueScene';
import { WorldScene } from './scenes/WorldScene';

async function start() {
  // La police doit être chargée avant que Phaser ne dessine le moindre texte.
  try {
    await document.fonts.load(`12px ${UI.font}`);
  } catch {
    // police indisponible : le texte s'affichera avec la police de secours
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW.width * ZOOM,
    height: VIEW.height * ZOOM,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#14110d',
    physics: { default: 'arcade', arcade: { debug: DEBUG } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, WorldScene, DialogueScene],
  });

  // Accès depuis la console du navigateur pour déboguer.
  (window as unknown as { game: Phaser.Game }).game = game;
}

start();
