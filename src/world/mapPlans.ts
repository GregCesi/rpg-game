// Les plans du bac à sable posés depuis Tiled (objets `Plan` d'une carte : la cabane du chasseur, les étals de la place, les granges des
// fermes ; chantier « monde ») : à la première visite d'une carte (ou de sa bande, vue d'une voisine), leurs pièces entrent dans
// `builds` de GameState, avec leurs assemblages, exactement comme si on les avait posés d'un clic en mode construction. Ensuite elles
// sont des pièces posées comme les autres (on entre dans la cabane, on ouvre sa porte, le mode construction les retire).
import { CM_PER_PX } from '../content/gabarit';
import { buildPlans } from '../content/buildPlans';
import type { MapData } from '../content/types';
import { game, seedPiles, seedPlans } from '../state';
import { planPieces } from './build';
import { openPlaces } from './places';
import { pileDefOf, shapeOf } from './pileShape';

/**
 * Pose sur la carte les plans et les tas de bois de Tiled qui n'y sont pas encore (un tas : ses `count` premières places, couche par
 * couche, comme on l'aurait monté pièce à pièce) ; renvoie le nombre de plans et de tas posés.
 */
export function seedMap(def: MapData): number {
  const piles = seedPiles(game, def.id, def.piles, (p) => {
    const shape = shapeOf(pileDefOf({ wood: p.wood }), !!p.turned);
    const taken = [shape.start];
    while (taken.length < p.count) {
      const next = openPlaces(shape, taken).sort((a, b) => shape.places[a].layer - shape.places[b].layer)[0];
      if (!next) break;
      taken.push(next);
    }
    return { wood: p.wood, x: p.x, y: p.y, places: taken, ...(p.turned ? { turned: true } : {}) };
  });
  if (!def.plans.length) return piles;
  return piles + seedPlans(game, def.id, def.plans, (o) => {
    const p = def.plans.find((q) => q.id === o.id)!;
    const plan = buildPlans[p.plan];
    if (!plan) return undefined;
    const at = { x: Math.round(p.x * CM_PER_PX), y: Math.round(p.y * CM_PER_PX), z: 0 };
    return { pieces: planPieces({ ...plan, ...(p.age ? { age: p.age } : {}) }, at), joints: plan.joints ?? [] };
  });
}
