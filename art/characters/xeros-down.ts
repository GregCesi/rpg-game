// Xéros renversé par une charge, dans le jeu (chantier « sangliers ») : le geste validé par Grégoire (art/characters/xeros-knockdown.ts,
// planche .art-preview/sangliers-xeros-renverse.png de tools/essai-sangliers-c.ts), sans un pixel changé, rangé en planche.
//
// La planche `xeros-down` : frames de 64 × 48, les pieds de Xéros debout en (32, 45) comme dans sa planche de 32 × 48 posée au milieu ;
// une animation par direction où il regardait (`xeros-down-right`, `-left` en miroir, `-down`, `-up`) : percuté, en l'air, deux
// images de glissade, à terre (1,5 s au sol en tout), assis, à genoux, debout ; chaque image garde sa durée. Il tombe toujours à
// l'opposé de la bête : la scène choisit l'animation d'après le sens de la charge (systems/knockdown.ts) et le fait glisser.

import { flipX } from '../lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../lib/types';
import { FH, FW, knockdown, palette } from './xeros-knockdown';

function downSheet(): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const dir of ['right', 'down', 'up'] as const) {
    const a = knockdown[dir];
    animations[dir] = { frames: a.frames, frameRate: 1, repeat: 0, durations: a.ms };
    if (dir === 'right') animations.left = { frames: a.frames.map(flipX), frameRate: 1, repeat: 0, durations: a.ms };
  }
  return { kind: 'spritesheet', name: 'xeros-down', frameW: FW, frameH: FH, palette, animations };
}

const sources: ArtSource[] = [downSheet()];
export default sources;
