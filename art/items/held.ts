// Outils tenus en main pendant les gestes use-* et chop-* de Xéros : une planche tool-<objet> par outil
// (art/lib/held.ts pour le format). Ajouter un outil = ses cinq dessins (vus de côté : diag, upright ; vus du
// dessus : flat, flatDiag, flatEnd) et une ligne ici.

import { heldToolSheet } from '../lib/held';
import { CHOP_FRAME_RATE, CHOP_POSES, USE_FRAME_RATE, USE_POSES } from '../characters/xeros';
import { axeArt, toolPalette } from './tools';

export default [
  heldToolSheet('axe', axeArt(), toolPalette, {
    use: { poses: USE_POSES, frameRate: USE_FRAME_RATE },
    chop: { poses: CHOP_POSES, frameRate: CHOP_FRAME_RATE },
  }),
];
