import type { Exit } from '../content/types';
import type { Player } from '../entities/Player';

/**
 * Sortie que Xéros est en train de prendre : ses pieds sont dans le rectangle de la sortie
 * et, si elle indique une direction, il avance dans cette direction (on ne sort pas en reculant ni en longeant le mur).
 */
export function findExit(player: Player, exits: readonly Exit[] = []): Exit | undefined {
  const { actor, dir } = player;
  if (dir.lengthSq() === 0) return undefined;
  const px = actor.x;
  const py = actor.y - 3;
  return exits.find(
    (e) => px >= e.x && px < e.x + e.w && py >= e.y && py < e.y + e.h && (e.facing === undefined || e.facing === actor.facing),
  );
}
