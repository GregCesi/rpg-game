// PROPOSITION (hors jeu, jamais chargée par le jeu) : ce que les bâtiments de la place se partagent (CADRAGE-village.md, section 13).
// Deux modules les dessinent (pixel-artist) :
//   - art/proposals/place-nord.ts : les quarts nord (la boutique et l'étal de la ferme du riche, la boutique du bûcheron, la boutique
//     abandonnée du menuisier) et le panneau des nouvelles ;
//   - art/proposals/place-sud.ts : les quarts sud (le dépôt et l'étal de la ferme rivale, la mercière, la tailleuse et le frère du
//     forgeron).
// Chacun exporte `BUILDINGS: PlaceBuilding[]` et `PIECES: VillagePiece[]` ; tools/essai-place.ts les monte en planches
// (.art-preview/place-ensemble.png, place-batiments-dehors.png, place-batiments-dedans.png, place-pieces.png).
// Le modèle est celui des maisons du village (art/proposals/village-types.ts, village-maisons-bois-lib.ts, village-maisons-pierre*.ts).

import type { Palette } from '../lib/canvas';
import type { Scene } from '../lib/volumes';
import type { VillagePiece } from './village-types';

export type PlaceBuildingId =
  | 'p-ferme-riche' // quart nord-ouest : la boutique, l'étal luxueux, la réserve
  | 'p-bucheron' // huitième nord-est, côté rue du nord : le magasin et le chantier de vente
  | 'p-menuisier' // huitième nord-est, côté rue de l'est : la boutique abandonnée
  | 'p-ferme-rivale' // huitième sud-est, côté rue du sud : le dépôt et l'étal de légumes
  | 'p-merciere' // huitième sud-est, côté rue de l'est : la mercière, logis à l'étage
  | 'p-tailleuse' // quart sud-ouest : la tailleuse et le frère du forgeron, logis à l'étage
  | 'p-panneau'; // le panneau des nouvelles, au centre

/** Le titre court et qui y vit et travaille (écrit sous chaque bâtiment) ; la parcelle du plan (village-plan-data.ts). */
export const PLACE_META: Record<PlaceBuildingId, { title: string; who: string; parcel: string; module: 'nord' | 'sud' }> = {
  'p-ferme-riche': { title: 'La boutique de la ferme du riche', who: 'Le commis de la ferme et sa femme (logés derrière la boutique)', parcel: 'no', module: 'nord' },
  'p-bucheron': { title: 'La boutique du bûcheron', who: 'Le bûcheron y vend son bois (il vit dans sa cabane en lisière)', parcel: 'ne-n', module: 'nord' },
  'p-menuisier': { title: "La boutique abandonnée de l'ancien menuisier", who: 'Personne : fermée depuis sa mort', parcel: 'ne-e', module: 'nord' },
  'p-ferme-rivale': { title: "Le dépôt et l'étal de la ferme rivale", who: "Les filles de la ferme rivale vendent ; personne n'y dort", parcel: 'se-s', module: 'sud' },
  'p-merciere': { title: 'La mercière', who: 'La mercière, sœur du coq, veuve, et sa fille', parcel: 'se-e', module: 'sud' },
  'p-tailleuse': { title: 'La tailleuse et le frère du forgeron', who: "La tailleuse et son mari (le cuir, l'équipement d'aventure)", parcel: 'so', module: 'sud' },
  'p-panneau': { title: 'Le panneau des nouvelles', who: 'Au centre de la place', parcel: 'place', module: 'nord' },
};

export interface PlaceBuilding {
  id: PlaceBuildingId;
  /** L'emprise, débords compris (px, est-ouest × nord-sud) ; l'origine des scènes est son coin nord-ouest. */
  size: [number, number];
  /** Où le poser dans la zone village (px) : le coin nord-ouest de `size`, d'après les emprises de village-plan-data.ts. */
  at: [number, number];
  levels: 1 | 2;
  palette: Palette;
  /** Dehors, toit posé, marchandises en place. */
  outside(o: [number, number], frame?: number): Scene;
  /** Dedans, toit effacé, mur sud coupé ; `level` 1 : l'étage. Un étal ou un abri ouvert : sa vue toit effacé. */
  inside(o: [number, number], level?: 0 | 1, frame?: number): Scene;
  pieces: string[];
}

export type { VillagePiece };
