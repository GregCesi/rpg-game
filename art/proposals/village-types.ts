// PROPOSITION (hors jeu, jamais chargée par le jeu) : ce que les maisons du chantier « village » se partagent (CADRAGE-village.md,
// travail 2). Deux modules les dessinent (pixel-artist) :
//   - art/proposals/village-maisons-bois.ts : les maisons de pan de bois, de torchis, de planches (h1, h3, h4, h5, h6, h7, h11) ;
//   - art/proposals/village-maisons-pierre.ts : les maisons de pierre et à étage (h2, h8, h9, h10).
// Chacun exporte `HOUSES: VillageHouse[]` et `PIECES: VillagePiece[]` ; tools/essai-village-maisons.ts les monte en planches
// (.art-preview/village-maisons-dehors.png, village-maisons-dedans.png, village-rue.png, village-pieces.png).
//
// Le modèle est celui de la maison de Xéros (art/lib/volumes.ts, art/proposals/maison-xeros.ts) : des volumes dont chaque face a sa
// matière au pixel, projetés comme le jeu (x, y − z), 5 cm par pixel. Une maison ne dessine jamais à la main ce qui se calcule.

import type { Grid, Palette } from '../lib/canvas';
import type { Scene } from '../lib/volumes';

export type HouseId =
  | 'h1-couvreur'
  | 'h2-tisserand'
  | 'h3-vieux'
  | 'h4-berger'
  | 'h5-journaliers'
  | 'h6-charpentier'
  | 'h7-laboureur'
  | 'h8-meunier'
  | 'h9-forgeron'
  | 'h10-maquignon'
  | 'h11-guerisseuse';

/** Le foyer écrit sous chaque maison sur les planches (court), et la parcelle du plan (art/proposals/village-plan-data.ts). */
export const HOUSE_META: Record<HouseId, { foyer: string; parcel: string; module: 'bois' | 'pierre' }> = {
  'h1-couvreur': { foyer: 'Le couvreur, sa femme, six enfants, la grand-mère', parcel: 's2-e1', module: 'bois' },
  'h2-tisserand': { foyer: 'Le tisserand et sa femme (sans enfants)', parcel: 's2-o2', module: 'pierre' },
  'h3-vieux': { foyer: "Les vieux : l'ancien bouvier et la fileuse", parcel: 's2-o3', module: 'bois' },
  'h4-berger': { foyer: 'Le berger, seul avec ses chiens', parcel: 's3-e2', module: 'bois' },
  'h5-journaliers': { foyer: 'Deux familles de journaliers', parcel: 'r2-1', module: 'bois' },
  'h6-charpentier': { foyer: 'Le charpentier et sa famille (pas à plaindre)', parcel: 's2-o1', module: 'bois' },
  'h7-laboureur': { foyer: 'Le laboureur, ses bœufs (pas à plaindre)', parcel: 'o-s1', module: 'bois' },
  'h8-meunier': { foyer: 'Le meunier et sa famille (aisés)', parcel: 'aise-o1', module: 'pierre' },
  'h9-forgeron': { foyer: 'Le forgeron, célibataire', parcel: 'o-n2', module: 'pierre' },
  'h10-maquignon': { foyer: 'Le maquignon et sa famille (aisés)', parcel: 'aise-o2', module: 'pierre' },
  'h11-guerisseuse': { foyer: 'La guérisseuse, seule, côté forêt', parcel: 'guerisseuse', module: 'bois' },
};

/** Une image du jeu ou de l'essai : sa grille et sa palette. */
export interface Img { grid: Grid; pal: Palette }

export interface VillageHouse {
  id: HouseId;
  /** L'emprise hors œuvre, débords de toit compris (px, est-ouest × nord-sud) ; l'origine des scènes est son coin nord-ouest. */
  size: [number, number];
  /** Le nombre de niveaux qui se visitent (2 : un étage). */
  levels: 1 | 2;
  /** La palette de ses matières (une maison peut avoir son âge de bois : sa palette le porte). */
  palette: Palette;
  /** La maison vue de dehors, toit posé, posée à l'origine `o` (px de la scène) ; `frame` : l'image du feu, de la fumée. */
  outside(o: [number, number], frame?: number): Scene;
  /** Le dedans, toit effacé, le mur sud coupé (comme le jeu), les meubles à leur place ; `level` 1 : l'étage, le rez sous lui omis. */
  inside(o: [number, number], level?: 0 | 1, frame?: number): Scene;
  /** Les clés des pièces nouvelles qu'elle demande (`PIECES`). */
  pieces: string[];
}

/** Une pièce nouvelle, montrée seule en x4 (village-pieces.png) : ses vues R0 à R3 selon sa symétrie. */
export interface VillagePiece {
  key: string;
  /** Le nom français, écrit sous la pièce. */
  name: string;
  /** Dimensions réelles (cm) : w est-ouest, d nord-sud, h hauteur, posée en R0. */
  dims: { w: number; d: number; h: number };
  /** Les maisons qui s'en servent. */
  houses: HouseId[];
  /** Ses vues dessinées, dans l'ordre R0, R1, R2, R3 (une, deux ou quatre selon sa symétrie). */
  views(): Img[];
}
