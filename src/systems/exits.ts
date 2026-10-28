import { TILE } from '../config';
import type { ExitDef } from '../content/types';
import type { Player } from '../entities/Player';

/**
 * Sortie que Xéros est en train de prendre : ses pieds sont dans la case de la sortie
 * et il avance dans la direction qu'elle indique (on ne sort pas en reculant ni en longeant le mur).
 */
export function findExit(player: Player, exits: readonly ExitDef[] = []): ExitDef | undefined {
  const { actor, dir } = player;
  if (dir.lengthSq() === 0) return undefined;
  const tx = Math.floor(actor.x / TILE);
  const ty = Math.floor((actor.y - 3) / TILE);
  return exits.find((e) => e.x === tx && e.y === ty && e.facing === actor.facing);
}
