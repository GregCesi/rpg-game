// Éclats d'impact : une planche fx-<matière> par matière frappée (bois, pierre, feuillage).
// Chaque planche tient 4 images de 8×8 : quatre variantes d'un petit éclat de 2 à 5 px, pas une animation.
// Le jeu en fait des particules qui jaillissent du point d'impact et retombent, une variante au hasard chacune.
// L'animation `chips` ne sert qu'à déclarer les images.
//
// Les éclats sont décrits en zones de matière et éclairés par art/lib/light.ts : lumière en haut à gauche,
// contour d'un pixel (teinte la plus sombre en haut et à gauche, OUTLINE en bas et à droite). Le contour les
// détache de l'herbe, d'un tronc comme d'un rocher, même quand la matière est proche du fond.

import type { Grid } from '../lib/canvas';
import { lightUp, type Materials } from '../lib/light';
import type { SpriteSheetSource } from '../lib/types';
import { world } from '../palette';

const materials: Materials = {
  // bois frais sous l'écorce : la même rampe que la coupe du billot (Y t T), qui tranche sur le brun du tronc
  w: { light: 'Y', base: 't', shade: 'T', dark: 'P' },
  // écorce, sur un bord du copeau
  b: { light: 'm', base: 'm', shade: 'N', dark: 'K' },
  // pierre
  s: { light: 'R', base: 'r', shade: 'z', dark: 'Z' },
  // feuille : le vert le plus clair en lumière, pour ne pas se fondre dans l'herbe
  l: { light: 'j', base: 'L', shade: 'l', dark: 'k' },
};

/** Variantes en zones, centrées sur le pixel (4, 4) à peu près ; un pixel de marge pour le contour. */
const VARIANTS: Record<'wood' | 'stone' | 'leaves', Grid[]> = {
  // copeaux : lamelles fines, en biais, l'une encore bordée d'écorce
  wood: [
    ['........', '........', '........', '....ww..', '...ww...', '........', '........', '........'],
    ['........', '........', '........', '..www...', '....w...', '........', '........', '........'],
    ['........', '........', '........', '...www..', '..bb....', '........', '........', '........'],
    ['........', '........', '........', '...ww...', '........', '........', '........', '........'],
  ],
  // éclats de pierre : morceaux anguleux, à facettes
  stone: [
    ['........', '........', '........', '...ss...', '...ss...', '........', '........', '........'],
    ['........', '........', '........', '...ss...', '....s...', '........', '........', '........'],
    ['........', '........', '........', '...ss...', '..sss...', '........', '........', '........'],
    ['........', '........', '........', '....s...', '...s....', '........', '........', '........'],
  ],
  // feuilles : petites feuilles en biais, une plus ronde, un fragment
  leaves: [
    ['........', '........', '........', '....l...', '...ll...', '...l....', '........', '........'],
    ['........', '........', '........', '...ll...', '..lll...', '........', '........', '........'],
    ['........', '........', '........', '...ll...', '....l...', '........', '........', '........'],
    ['........', '........', '........', '...ll...', '........', '........', '........', '........'],
  ],
};

const sheet = (kind: keyof typeof VARIANTS): SpriteSheetSource => ({
  kind: 'spritesheet',
  name: `fx-${kind}`,
  frameW: 8,
  frameH: 8,
  palette: world,
  animations: { chips: { frames: VARIANTS[kind].map((g) => lightUp(g, materials)), frameRate: 1, repeat: 0 } },
});

export default [sheet('wood'), sheet('stone'), sheet('leaves')];
