import type { Exit } from '../content/types';
import type { Player } from '../entities/Player';
import { crossed, type Point } from '../world/crossing';

/** Sortie dont le rectangle contient les pieds (x, y), quelle que soit la direction : le point de collision, 3 px au-dessus. */
export function exitAt(x: number, y: number, exits: readonly Exit[] = []): Exit | undefined {
  const py = y - 3;
  return exits.find((e) => x >= e.x && x < e.x + e.w && py >= e.y && py < e.y + e.h);
}

/** Sortie que les pieds ont franchie en allant de `from` (l'image d'avant) à `to` (world/crossing.ts), quelle que soit la direction. */
export function exitCrossed(from: Point | undefined, to: Point, exits: readonly Exit[] = []): Exit | undefined {
  return exits.find((e) => crossed(from, to, (x, y) => exitAt(x, y, [e]) !== undefined));
}

/**
 * Sortie que Xéros est en train de prendre : ses pieds sont passés dans le rectangle de la sortie depuis l'image d'avant (pas
 * seulement dedans à l'instant : un jeu qui rame fait plusieurs pas par image) et, si elle indique une direction, il avance dans cette
 * direction (on ne sort pas en reculant ni en longeant le mur).
 */
export function findExit(player: Player, exits: readonly Exit[] = []): Exit | undefined {
  const { actor, dir } = player;
  if (dir.lengthSq() === 0) return undefined;
  const e = exitCrossed(player.from, { x: actor.x, y: actor.y }, exits);
  return e && (e.facing === undefined || e.facing === actor.facing) ? e : undefined;
}
