// La barre d'endurance à trois niveaux (chantier « le temps », docs/CONCEPTION.md « Le temps »), en pièces que le HUD
// assemble à l'exécution. Mêmes dessins que la proposition validée par Grégoire (art/proposals/barre-endurance.ts) :
// art/ui/stamina-bar-preview.ts recompose la barre avec ces pièces et vérifie qu'elle est identique, pixel pour pixel, à
// celle de la proposition, à plusieurs états.
//
// CONTRAT DE POSE (coordonnées en px du jeu, depuis le coin haut-gauche du cadre, (0, 0)) :
// - Hauteur : 10 px pour toutes les pièces du cadre ; le creux fait 4 px de haut.
// - Creux de `iw` px : iw = max(1, round(max × 0,5)) — 1 px pour 2 points à l'échelle de 100 (creux de 50 px à 100).
// - Cadre : `ui-bar-left` (3 × 10) en x = 0 ; `ui-bar-mid` (1 × 10) répété de x = 3 à x = 3 + iw − 1 ; `ui-bar-right`
//   (3 × 10) en x = 3 + iw. Largeur totale : iw + 6. Le creux du milieu (rangées 3 à 6) est transparent.
// - Le creux commence en (x, y) = (3, 3), fait iw × 4. Un niveau v en px : 0 si v ≤ 0, sinon max(1, round(v × 0,5)) ;
//   pc = min(px(plafond), iw) ; pb = min(px(souffle), pc).
// - Ordre de pose dans le creux (toutes les colonnes font 4 px de haut, posées en y = 3) :
//   1. `ui-bar-lost` (3 × 4) en tuile sur tout le creux, de x = 3 à 3 + iw (motif calé sur le début du creux : sa colonne i
//      tombe là où (x − 3) mod 3 = i ; poser la tuile depuis x = 3 sans décalage, et la part du dessus la recouvre) ;
//   2. le « revient » : `ui-bar-back-edge` en x = 3 + pb, puis `ui-bar-back` répété jusqu'à x = 3 + pc − 1 (si pc > pb) ;
//   3. le souffle : `ui-bar-breath-edge` en x = 3, puis `ui-bar-breath` répété jusqu'à x = 3 + pb − 1 (si pb > 0) ;
//      fatigué (plafond < 15 % du maximum, `tired` de stamina.json) : `ui-bar-breath-low-edge` et `ui-bar-breath-low`.
//   La première colonne de chaque part est la colonne `-edge` (la lumière à gauche) ; une part d'un seul px n'est que son bord.
// - Souffle vide : la barre clignote par l'alpha (le jeu) ; rien à dessiner. Conseil : faire clignoter la part « revient »
//   (le torchis, qui occupe alors tout le plafond) plutôt que le cadre, c'est elle qui dit « attends ».
//
// Couleurs : cadre en bois de la même facture que `ui-slot` (o M m N), perdu en bois sombre hachuré (N K), revient en
// torchis (d D E), souffle en feuillage (j L l) ou en rouge des baies (6 7 8, comme ui-stamina-fill-low).

import { Canvas, type Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';

export const palette: Palette = {
  ...world,
  // rouge des baies (art/world/rocks-bushes.ts, comme ui-stamina-fill-low) : éclairé, franc, d'ombre
  '6': '#d27a52',
  '7': '#a8453a',
  '8': '#74303a',
};

/** Contrat de pose, en px (voir l'en-tête). */
export const BAR = {
  /** Hauteur du cadre. */
  h: 10,
  /** Largeur des bouts gauche et droit. */
  end: 3,
  /** Coin haut-gauche du creux depuis le coin du cadre. */
  inner: { x: 3, y: 3, h: 4 },
  /** Px de creux pour un point : 1 px pour 2 points. */
  pxPerPoint: 0.5,
  /** Pas du motif de la part perdue (largeur de `ui-bar-lost`). */
  hatch: 3,
} as const;

/** Le bout gauche : contour, biseau clair M, ombre du cadre N sur le bord du creux. */
function left(): Canvas {
  return Canvas.from([
    '.oo',
    'oMM',
    'oMN',
    'oMN',
    'oMN',
    'oMN',
    'oMN',
    'oMN',
    'oNN',
    '.oo',
  ]);
}

/** Une colonne du milieu : contour, biseau M, ombre N, creux transparent, liseré m, ombre N, contour. */
function mid(): Canvas {
  return Canvas.from(['o', 'M', 'N', '.', '.', '.', '.', 'm', 'N', 'o']);
}

/** Le bout droit : le bois moyen m qui ferme le creux, l'ombre N du biseau, le contour. */
function right(): Canvas {
  return Canvas.from([
    'oo.',
    'MNo',
    'NNo',
    'mNo',
    'mNo',
    'mNo',
    'mNo',
    'mNo',
    'NNo',
    'oo.',
  ]);
}

/** Une colonne de part : rangée du haut éclairée, deux franches, rangée du bas à l'ombre ; le bord, éclairé sur trois. */
function column([light, base, dark]: [string, string, string], edge: boolean): Canvas {
  return Canvas.from(edge ? [light, light, light, dark] : [light, base, base, dark]);
}

/** La part perdue : bois sombre N, ombre du cadre K en haut, hachures K qui descendent vers la droite, pas de 3. */
function lost(): Canvas {
  return Canvas.from(['KKK', 'NKN', 'NNK', 'KNN']);
}

const BREATH: [string, string, string] = ['j', 'L', 'l'];
const BREATH_LOW: [string, string, string] = ['6', '7', '8'];
const BACK: [string, string, string] = ['d', 'D', 'E'];

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [
  img('ui-bar-left', left()),
  img('ui-bar-mid', mid()),
  img('ui-bar-right', right()),
  img('ui-bar-breath', column(BREATH, false)),
  img('ui-bar-breath-edge', column(BREATH, true)),
  img('ui-bar-breath-low', column(BREATH_LOW, false)),
  img('ui-bar-breath-low-edge', column(BREATH_LOW, true)),
  img('ui-bar-back', column(BACK, false)),
  img('ui-bar-back-edge', column(BACK, true)),
  img('ui-bar-lost', lost()),
] satisfies ImageSource[];
