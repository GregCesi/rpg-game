// Les transformations faites face à un poste du sol (docs/COMMANDES.md, F) : puiser de l'eau, le seau vide en main, face à l'étang.
// Tout vient des données : le terrain de la case visée offre un poste (`station` de tiles.json : l'eau, l'étang) ; une transformation
// de transforms.json s'y fait au geste quand son poste est celui-là, que son geste est réel (pas `soon`), qu'elle ne demande pas
// d'outil et que ce que tient la main est sa seule entrée tenue (le reste est pris au poste : `raw`, l'eau). F l'applique (le système
// des transformations, systems/transform.ts : ce qui entre disparaît, ce qui sort revient dans la main) et l'horloge avance de sa
// durée (`minutes`).

import { INTERACT } from '../config';
import { transforms } from '../content';
import type { Player } from '../entities/Player';
import type { Held } from '../state';
import type { GameMap } from '../world/GameMap';
import { fits } from './transform';

/** La transformation que la main qui tient `held` ferait au poste devant Xéros, et où (le point visé) ; undefined s'il n'y en a pas. */
export function drawAt(player: Player, map: GameMap, held: Held | null): { id: string; x: number; y: number } | undefined {
  if (!held) return undefined;
  const p = player.probe(INTERACT.reach);
  const station = map.stationAt(p.x, p.y);
  if (!station) return undefined;
  for (const [id, t] of Object.entries(transforms)) {
    if (t.station !== station || t.gesture === 'soon' || t.tools.length) continue;
    const parts = t.inputs.filter((part) => !part.raw);
    if (parts.length !== 1 || parts[0].count !== 1 || !fits(parts[0], held)) continue;
    return { id, x: Math.round(p.x), y: Math.round(p.y) };
  }
  return undefined;
}
