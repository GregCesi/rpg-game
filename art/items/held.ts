// Outils tenus en main pendant les gestes use-*, chop-* et maul-* de Xéros : une planche tool-<objet> par outil
// (art/lib/held.ts pour le format). Ajouter un outil = ses cinq dessins (de profil, pour use : diag, upright ; par la
// tranche, pour chop et maul : flat, flatDiag, flatEnd) et une ligne ici.

import { heldToolSheet } from '../lib/held';
import { CHOP_FRAME_RATE, CHOP_POSES, MAUL_FRAME_RATE, MAUL_POSES, USE_FRAME_RATE, USE_POSES } from '../characters/xeros';
import { broadaxeArt } from './broadaxe';
import { hatchetArt } from './hatchet';
import { maulArt } from './splitting-tools';
import { axeArt, toolPalette } from './tools';

export default [
  heldToolSheet('axe', axeArt(), toolPalette, {
    use: { poses: USE_POSES, frameRate: USE_FRAME_RATE },
    chop: { poses: CHOP_POSES, frameRate: CHOP_FRAME_RATE },
    // la hache ne sert pas au geste de la masse : images tirées pour que la planche ait tous les gestes
    maul: { poses: MAUL_POSES, frameRate: MAUL_FRAME_RATE },
  }),
  // la masse de bûcheron : use et chop pour que la planche ait tous les gestes ; elle sert au geste maul
  heldToolSheet('maul', maulArt(), toolPalette, {
    use: { poses: USE_POSES, frameRate: USE_FRAME_RATE },
    chop: { poses: CHOP_POSES, frameRate: CHOP_FRAME_RATE },
    maul: { poses: MAUL_POSES, frameRate: MAUL_FRAME_RATE },
  }),
  // la hachette (docs/objets/hatchet.md) : elle sert au geste chop (tailler la pointe d'un piquet) ; use et maul pour
  // que la planche ait tous les gestes
  heldToolSheet('hatchet', hatchetArt(), toolPalette, {
    use: { poses: USE_POSES, frameRate: USE_FRAME_RATE },
    chop: { poses: CHOP_POSES, frameRate: CHOP_FRAME_RATE },
    maul: { poses: MAUL_POSES, frameRate: MAUL_FRAME_RATE },
  }),
  // la doloire (docs/objets/broadaxe.md) : elle sert au geste chop (dresser la face d'un rondin couché) ; use et maul
  // pour que la planche ait tous les gestes
  heldToolSheet('broadaxe', broadaxeArt(), toolPalette, {
    use: { poses: USE_POSES, frameRate: USE_FRAME_RATE },
    chop: { poses: CHOP_POSES, frameRate: CHOP_FRAME_RATE },
    maul: { poses: MAUL_POSES, frameRate: MAUL_FRAME_RATE },
  }),
];
