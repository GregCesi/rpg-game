// Outils tenus en main pendant le geste use-* de Xéros : une planche tool-<objet> par outil
// (art/lib/held.ts pour le format). Ajouter un outil = ses deux dessins (diag, upright) et une ligne ici.

import { heldToolSheet } from '../lib/held';
import { USE_FRAME_RATE, USE_POSES } from '../characters/xeros';
import { axeArt, toolPalette } from './tools';

export default [heldToolSheet('axe', axeArt(), toolPalette, USE_POSES, USE_FRAME_RATE)];
