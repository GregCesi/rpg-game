// Proposition (chantier « le temps ») : la barre d'endurance à trois niveaux, qui remplacerait la jauge verticale de
// art/ui/stamina.ts. Hors jeu : rien ici ne se déclare dans art/index.ts.
//
// Une barre horizontale, posée au-dessus des deux cases de main, son bout gauche sur le bord gauche de la case G :
// - le cadre (bois de la même facture que `ui-slot` et `ui-stamina-frame` : contour, biseau clair M en haut et à gauche,
//   sombre N en bas et à droite, liseré de creux N) enferme le **maximum** ; il s'allonge vers la droite quand le maximum
//   monte (1 px pour 2 points à l'échelle `maxRef` = 100 : creux de 50 px, cadre de 56 px, à peu près la largeur des deux
//   cases et de leur écart, 52 px) ;
// - du plafond au maximum, « perdu pour aujourd'hui » : le creux de bois sombre (N K), barré de hachures K qui descendent
//   vers la droite, comme une part condamnée ;
// - du souffle au plafond, « essoufflé, revient » : le torchis (d D E), pâle et mat, la place que le souffle va reprendre ;
// - le souffle : le feuillage vif (j L l), ou le rouge des baies (6 7 8) quand le plafond passe sous 15 % du maximum.
//
// Pourquoi horizontale : la longueur dit le maximum, et une barre couchée s'allonge sans grandir le HUD en hauteur ni le
// faire monter dans la vue ; à 100 points elle a la largeur des deux cases, ce qui la lie à elles d'un coup d'œil, et
// les trois parts se lisent de gauche à droite comme une phrase (ce qu'il reste, ce qui revient, ce qui est perdu).
// Une jauge debout de 50 px et plus dépasserait de loin les cases (24 px) et mangerait la vue sur le côté.
//
// Dimensions : hauteur 10 px (creux de 4 px en y = 3), largeur 6 + round(50 · max / maxRef) px. Rendu : une image entière
// par état (le jeu pourrait aussi la monter en trois rognages sur le creux, comme aujourd'hui).

import { Canvas, type Grid, type Palette } from '../lib/canvas';
import { world } from '../palette';

const palette: Palette = {
  ...world,
  // rouge des baies (art/world/rocks-bushes.ts, comme ui-stamina-fill-low) : éclairé, franc, d'ombre
  '6': '#d27a52',
  '7': '#a8453a',
  '8': '#74303a',
};

/** Pixels de creux pour 1 point, à l'échelle `maxRef` : 50 px pour `maxRef` points. */
const INNER_AT_REF = 50;
/** Épaisseur du cadre de chaque côté (contour, biseau, liseré de creux). */
const BORDER = 3;
/** Hauteur du creux. */
const INNER_H = 4;
/** Seuil de fatigue : part du maximum sous laquelle le plafond fait rougir le souffle. */
const TIRED = 0.15;
/** Pas des hachures de la part perdue. */
const HATCH = 3;

export const STAMINA_BAR_H = INNER_H + 2 * BORDER;

/** Une part du creux : [éclairé, franc, ombre], rangée du haut éclairée, rangée du bas à l'ombre, première colonne éclairée. */
function band(c: Canvas, x0: number, x1: number, [light, mid, dark]: [string, string, string]): void {
  if (x1 <= x0) return;
  const y = BORDER;
  c.rect(x0, y, x1 - x0, INNER_H, mid);
  c.rect(x0, y, x1 - x0, 1, light);
  c.rect(x0, y + INNER_H - 1, x1 - x0, 1, dark);
  c.rect(x0, y, 1, INNER_H - 1, light);
}

export function staminaBar(souffle: number, plafond: number, max: number, maxRef = 100): { grid: Grid; palette: Palette } {
  const scale = INNER_AT_REF / maxRef;
  const iw = Math.max(1, Math.round(max * scale));
  const ceil = Math.min(Math.max(plafond, 0), max);
  const breath = Math.min(Math.max(souffle, 0), ceil);
  // un niveau non nul garde au moins un pixel ; souffle ≤ plafond ≤ maximum en pixels aussi
  const px = (v: number): number => (v <= 0 ? 0 : Math.max(1, Math.round(v * scale)));
  const pc = Math.min(px(ceil), iw);
  const pb = Math.min(px(breath), pc);

  const w = iw + 2 * BORDER;
  const h = STAMINA_BAR_H;
  const c = new Canvas(w, h, 'o');
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) c.set(x, y, '.');
  c.rect(1, 1, w - 2, h - 2, 'm');
  c.rect(1, 1, w - 2, 1, 'M').rect(1, 1, 1, h - 2, 'M');
  c.rect(1, h - 2, w - 2, 1, 'N').rect(w - 2, 1, 1, h - 2, 'N');
  // creux : bord sombre en haut et à gauche (ombre du cadre), le bois moyen en bas et à droite (comme ui-stamina-frame)
  c.rect(2, 2, w - 4, h - 4, 'N');
  c.rect(3, 3, w - 5, h - 5, 'm');

  const x0 = BORDER;
  // perdu pour aujourd'hui : bois sombre, ombre du cadre en haut, hachures K descendant vers la droite
  c.rect(x0 + pc, BORDER, iw - pc, INNER_H, 'N');
  c.rect(x0 + pc, BORDER, iw - pc, 1, 'K');
  for (let x = x0 + pc; x < x0 + iw; x++) {
    for (let r = 1; r < INNER_H; r++) if ((x - r) % HATCH === 0) c.set(x, BORDER + r, 'K');
  }
  // essoufflé, revient : torchis
  band(c, x0 + pb, x0 + pc, ['d', 'D', 'E']);
  // le souffle
  const tired = ceil < TIRED * max;
  band(c, x0, x0 + pb, tired ? ['6', '7', '8'] : ['j', 'L', 'l']);

  return { grid: c.toGrid(), palette };
}
