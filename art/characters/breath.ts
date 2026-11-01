// Xéros essoufflé (chantier « le temps ») : quand son souffle est vide, l'effort attend et Xéros souffle. Pas de nouvelle
// animation du corps : une planche `fx-breath` de petites bouffées claires que le jeu pose près de sa bouche, par-dessus
// lui, tant que le souffle est vide (et un instant après, le temps qu'il revienne au-dessus de zéro).
//
// Planche : 4 images de 10 × 8, animation `puff`, en boucle (repeat −1), 6 images/s : une expiration toutes les 0,67 s, le
// rythme d'un homme qui halète. La bouffée sort de la bouche (le pixel (0, 4) de l'image), grossit, s'éloigne vers l'avant
// en montant un peu, puis se défait (dernière image à moitié transparente).
//
// ACCROCHES (le coin haut-gauche de l'image, en px depuis les pieds de Xéros, c'est-à-dire l'origine (0,5 ; 1) de son
// sprite de 32 × 48) :
// - right : (+5, −26), sans miroir : la bouche de profil est au pixel (21, 26) de sa frame, sous le nez ;
// - left  : (−15, −26), l’image en miroir (flipX) : la bouche est au pixel (10, 26) ;
// - down  : (+4, −26), sans miroir : la bouffée sort au coin droit de la mâchoire (pixel (20, 26)) et part sur le côté ;
//   vers le spectateur, elle couvrirait le menton et la poitrine et ne se lirait plus ;
// - up    : (+4, −26), sans miroir, comme down : de dos, la bouche est cachée, la bouffée sort à côté de la tête.
// Le rebond de la marche (1 px) n'est pas à suivre : c'est de l'air, il traîne un peu derrière la tête.
// Profondeur : juste au-dessus de Xéros. Aucune image ne touche sa tête dans aucune direction (vérifié sur l'aperçu
// .art-preview/xeros-souffle.png, fait par art/ui/stamina-bar-preview.ts).
//
// Couleurs : comme la fumée des cheminées (`smoke`, art/world/house.ts), sans contour : c'est de l'air, pas un objet. Deux
// teintes pour un petit volume éclairé en haut à gauche : le crème des fleurs (a de la palette du monde) en lumière, le gris
// de la fumée à l'ombre ; la bouffée qui se défait, ce gris à moitié transparent.

import type { Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { world } from '../palette';

export const palette = {
  // signes en chiffres : la planche se pose sur Xéros, dont la palette prend les lettres
  '1': world.a, // crème : la lumière de la bouffée
  '2': '#d9d2c6', // gris de la fumée (smoke, house.ts) : son ombre
  '3': '#d9d2c680', // la bouffée qui se défait
};

export const BREATH = { w: 10, h: 8, frameRate: 6 };

/** Coin haut-gauche de l'image depuis les pieds, et miroir, par direction. */
export const BREATH_ANCHORS: Record<'down' | 'up' | 'right' | 'left', { dx: number; dy: number; flipX: boolean }> = {
  down: { dx: 4, dy: -26, flipX: false },
  up: { dx: 4, dy: -26, flipX: false },
  right: { dx: 5, dy: -26, flipX: false },
  left: { dx: -15, dy: -26, flipX: true },
};

const FRAMES: Grid[] = [
  // la bouffée sort
  ['..........', '..........', '..........', '.11.......', '.12.......', '..........', '..........', '..........'],
  // elle grossit
  ['..........', '..........', '...11.....', '..1112....', '..1222....', '...22.....', '..........', '..........'],
  // elle s'éloigne en montant
  ['..........', '.....11...', '....11112.', '....12222.', '.....222..', '..........', '..........', '..........'],
  // elle se défait
  ['......33..', '.....3333.', '......33..', '..........', '..........', '..........', '..........', '..........'],
];

const breath: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'fx-breath',
  frameW: BREATH.w,
  frameH: BREATH.h,
  palette,
  animations: { puff: { frames: FRAMES, frameRate: BREATH.frameRate, repeat: -1 } },
};

export default [breath];
