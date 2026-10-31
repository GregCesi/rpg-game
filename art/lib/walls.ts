// Les murs de pierre montés par calcul : l'algorithme vit dans src/world/walls.ts (pur, partagé avec le jeu, qui monte le
// dessin d'un tronçon de mur à la pose) ; ici, son kit nourri des dessins des pierres d'art/items/stones.ts (images au sol,
// ombre comprise), pour le morceau de solin (art/world/sill-walls.ts) et l'essai des murs (tools/essai-murs.ts).

import type { Grid } from './canvas';
import stones from '../items/stones';
import { wallKit } from '../../src/world/walls';

export { bodyOf, MORTAR, ESSAY_DRESSED, ESSAY_ROUGH, type Piece, type RoughStats, type RunSpec, type Used, type WallSize } from '../../src/world/walls';

/** Une image au sol du jeu, ombre comprise. */
export function gameImage(name: string): Grid {
  const s = stones.find((x) => x.name === name);
  if (!s || s.kind !== 'image') throw new Error(`walls : image ${name} absente d'art/items/stones.ts`);
  return s.grid;
}

/** Le kit des murs d'art/ (les pierres d'art/items/stones.ts). */
export const walls = wallKit(gameImage);

export const roughWall = walls.roughWall;
export const dressedWall = walls.dressedWall;
export const ROUGH = walls.pieces.rough;
export const RUBBLE = walls.pieces.rubble;
export const HEADER = walls.pieces.header;
