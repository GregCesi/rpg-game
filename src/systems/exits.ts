import type { Exit } from '../content/types';
import type { Player } from '../entities/Player';

/** Sortie dont le rectangle contient les pieds (x, y), quelle que soit la direction : le point de collision, 3 px au-dessus. */
export function exitAt(x: number, y: number, exits: readonly Exit[] = []): Exit | undefined {
  const py = y - 3;
  return exits.find((e) => x >= e.x && x < e.x + e.w && py >= e.y && py < e.y + e.h);
}

/**
 * Sortie que Xéros est en train de prendre : ses pieds sont dans le rectangle de la sortie
 * et, si elle indique une direction, il avance dans cette direction (on ne sort pas en reculant ni en longeant le mur).
 */
export function findExit(player: Player, exits: readonly Exit[] = []): Exit | undefined {
  const { actor, dir } = player;
  if (dir.lengthSq() === 0) return undefined;
  const e = exitAt(actor.x, actor.y, exits);
  return e && (e.facing === undefined || e.facing === actor.facing) ? e : undefined;
}
