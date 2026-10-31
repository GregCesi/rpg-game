// Contrat commun des propositions de dessin de la pierre (chantier « pierre ») : ce qu'un module art/proposals/pierre-<x>.ts
// exporte (par défaut, un `StoneProposal`), pour que tools/essai-pierre.ts le pose sur la planche .art-preview/essai-pierre.png
// à côté des autres. Rien de art/proposals/ ne se déclare dans art/index.ts : le jeu ne charge pas ces dessins.
//
// Échelle et règles : celles du jeu (docs/STYLE.md) : 5 cm par pixel, gabarit de la section 8 (boîte : W × (H + D/2), contour
// compris, ombre exclue), lumière en haut à gauche, contour d'un pixel (la teinte la plus sombre de la roche en haut et à gauche,
// OUTLINE `o` en bas et à droite), ombre portée `x` au sud-est, couleurs prises dans la rampe de la roche (roches.ts), plus
// OUTLINE, `x` et la terre (u U n e, d D E) pour le mortier.
//
// Les images au sol (`rough`, `rubble`, `chips`) sont des grilles complètes, ombre portée comprise, recadrées au plus près.
// Les morceaux du muret (`wall`) sont des grilles nues, sans contour ni ombre : le script les assemble, met le mortier dans les
// joints, puis pose le contour et l'ombre du mur entier.

import type { Grid, Palette } from '../lib/canvas';
import type { Rock } from './roches';

/** Les trois longueurs de moellon, en cm. */
export type RubbleLength = 30 | 40 | 50;
export const RUBBLE_LENGTHS: RubbleLength[] = [30, 40, 50];

/** Hauteur d'une assise du muret, en pixels du jeu (20 cm), joint compris. */
export const COURSE_PX = 4;
/** Rangées du dessus d'une pierre de l'assise haute, sans le contour (le mur a 25 cm d'épaisseur : 25 × ½ / 5 = 2,5 ; deux rangées de pierre et la rangée du contour au fond). */
export const WALL_TOP_PX = 2;

/** Les objets de l'essai, leurs mesures (cm) et leur masse (kg), communes à toutes les propositions. */
export const OBJECTS = {
  medium: { name: 'pierre brute moyenne', w: 26, d: 22, h: 19, kg: 14.6 },
  big: { name: 'grosse pierre brute', w: 45, d: 34, h: 27, kg: 55.5 },
  rubble: {
    30: { name: 'moellon 30 cm', w: 30, d: 22, h: 20, kg: 26.9 },
    40: { name: 'moellon 40 cm', w: 40, d: 22, h: 20, kg: 35.9 },
    50: { name: 'moellon 50 cm', w: 50, d: 22, h: 20, kg: 44.9 },
  },
  chips: { name: 'eclats', w: 40, d: 30, kg: 19.6 },
} as const;

/** Le muret : ce que le module dessine pour que le script le monte. */
export interface WallKit {
  /** Clé de palette du mortier de terre (le fond des joints). */
  mortar: string;
  /** Clé de palette du contour côté lumière du mur entier (en haut et à gauche). */
  dark: string;
  /**
   * La face de parement d'un moellon dans le mur (sa face sud, vue de face) : largeur `length / 5 - 1` px (le pixel qui
   * manque est le joint vertical, à droite), hauteur `height` (4 : la pierre remplit l'assise et touche celle du dessous ;
   * 3 : un joint de mortier d'un pixel reste dessous). `variant` (0, 1, 2…) : une autre pierre de la même longueur.
   * Pas de contour : les pixels '.' laissent voir le mortier (coins abattus).
   */
  face(length: RubbleLength, height: 3 | 4, variant: number): Grid;
  /**
   * Le dessus d'une pierre de l'assise haute, posé juste au-dessus de sa face : largeur `length / 5 - 1`, hauteur
   * WALL_TOP_PX. Pas de contour ; '.' permis (bord arrière irrégulier).
   */
  top(length: RubbleLength, variant: number): Grid;
  /** Un éclat calé dans un joint (une à quelques cases, posé là où il ne couvre que du mortier). */
  chip: Grid;
}

export interface StoneProposal {
  /** « A », « B », « C » : le titre de la bande. */
  id: string;
  /** Le parti pris, en une ligne (écrite sous la bande). */
  stance: string;
  /** La roche dont la proposition prend ses couleurs. */
  rock: Rock;
  /** Palette des grilles (en général `world`, qui contient la rampe du calcaire). */
  palette: Palette;
  /** Pierre brute de carrière, deux formes par taille (la b : une autre cassure, pas la a retournée). */
  rough: { medium: [Grid, Grid]; big: [Grid, Grid] };
  /** Moellon couché : est-ouest (6, 8, 10 × 6 px) et nord-sud (6 × 6, 8, 10 px), vraie face dessinée. */
  rubble: Record<RubbleLength, { ew: Grid; ns: Grid }>;
  /** Éclats de taille, à plat, sans ombre (environ 8 × 6 px). */
  chips: Grid;
  wall: WallKit;
}
