// Contrat commun des propositions de dessin du lapin (chantier « lapins », fiches docs/objets/rabbit.md, dead-rabbit.md,
// warren-hole.md) : ce qu'un module art/proposals/lapins-<x>.ts exporte par défaut (un `RabbitProposal`), pour que
// tools/essai-lapins.ts le pose sur la planche .art-preview/lapins.png à côté des autres. Rien de art/proposals/ ne se déclare
// dans art/index.ts : le jeu ne charge pas ces dessins.
//
// Pensé pour l'intégration sans redessiner : chaque champ est déjà une image finie à la forme d'une planche du jeu.
// - `poses[pose][direction]` : les images de la planche `rabbit`, animation `<pose>-<direction>` (left = miroir de right),
//   toutes de FRAME.w × FRAME.h, les pieds sur la rangée FRAME.ground, l'ombre portée dessous ; `rates` : images par seconde.
// - `deadGround` : `dead-rabbit-ground`, `-r1`, `-r2`, `-r3` (images recadrées, ombre comprise) ; `dead` : l'image `dead-right`
//   de la planche (la première vue au sol, posée dans la frame).
// - `held` : la planche `held-dead-rabbit` (art/items/carried.ts `sheet`), images carrées HELD_SIZE, la prise au centre.
// - `icon` : `item-dead-rabbit`, 16 × 16, sans ombre. `hole` : `warren-hole`, recadré, sans ombre (à plat). `fur` : la planche
//   `fx-fur`, 4 images de 8 × 8 (art/world/fx.ts).
// Toutes les grilles d'une proposition partagent sa `palette` (dérivée de art/palette.ts : `world` plus la robe du lapin).
//
// Échelle et règles : celles du jeu (docs/STYLE.md) : 5 cm par pixel, sans agrandissement (consigne de Grégoire), lumière en
// haut à gauche, contour d'un pixel (le plus sombre de la robe en haut et à gauche, OUTLINE `o` en bas et à droite), ombre `x`.

import type { Grid, Palette } from '../lib/canvas';

export type RabbitPose = 'graze' | 'sit' | 'hop' | 'alert' | 'run' | 'thump';
export type RabbitDir = 'down' | 'up' | 'right';
export const RABBIT_POSES: RabbitPose[] = ['graze', 'sit', 'hop', 'alert', 'run', 'thump'];
export const RABBIT_DIRS: RabbitDir[] = ['down', 'up', 'right'];

/** Frame de la planche `rabbit` : 14 × 14, pieds sur la rangée 11, ombre sur la 12 (de quoi loger un bond de 2 px). */
export const FRAME = { w: 14, h: 14, ground: 11 } as const;
/** Image carrée de la planche `held-dead-rabbit` (impaire : le centre est la prise de la main). */
export const HELD_SIZE = 21;

export interface RabbitProposal {
  /** « A », « B », « C ». */
  id: string;
  /** Titre court de la bande. */
  title: string;
  /** Le parti pris, en une ligne. */
  note: string;
  palette: Palette;
  poses: Record<RabbitPose, Record<RabbitDir, Grid[]>>;
  rates: Record<RabbitPose, number>;
  dead: Grid;
  deadGround: [Grid, Grid, Grid, Grid];
  held: Record<'down' | 'up' | 'right', Grid>;
  icon: Grid;
  hole: Grid;
  fur: Grid[];
}
