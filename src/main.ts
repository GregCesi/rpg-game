import Phaser from 'phaser';
import '@fontsource/pixelify-sans/latin-400.css';
import { DEBUG, UI, VIEW, ZOOM } from './config';
import * as content from './content';
import { catalogFrom, validateContent } from './content/validate';
import * as assets from './generated/assets';
import { BootScene } from './scenes/BootScene';
import { DialogueScene } from './scenes/DialogueScene';
import { WorldScene } from './scenes/WorldScene';

async function start() {
  // Même vérification que `npm run check` : en dev, une erreur de contenu s'affiche à l'écran au lieu d'un plantage obscur.
  const problems = validateContent(content, catalogFrom(assets));
  if (problems.length) {
    const pre = document.createElement('pre');
    pre.style.cssText = 'color:#f3d9b0;background:#14110d;padding:16px;white-space:pre-wrap;font:13px monospace';
    pre.textContent = `Contenu invalide (${problems.length}) :\n\n- ${problems.join('\n- ')}`;
    document.body.replaceChildren(pre);
    throw new Error('Contenu invalide, voir la page');
  }

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
