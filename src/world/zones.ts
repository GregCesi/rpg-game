// Les zones du monde, sans Phaser (chantier « monde », CONCEPTION « Le monde ») : le monde est fait de cartes Tiled assemblées côte à
// côte (tiled/maps/monde.world) ; chaque zone sait sa place (`world` de la carte, en pixels). On passe de l'une à sa voisine en marchant
// hors du bord, à la position correspondante : ici, qui est la voisine, où l'on arrive, et ce qu'on voit d'elle par-delà le bord.
import { TILE } from '../config';
import type { MapData } from '../content/types';

/** Une zone et son rectangle dans le monde (px). */
export interface Zone {
  map: MapData;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Les côtés d'une carte. */
export type Side = 'west' | 'east' | 'north' | 'south';

/** Le rectangle d'une carte dans le monde, si elle en est une zone. */
function zoneOf(map: MapData): Zone | undefined {
  return map.world && { map, x: map.world.x, y: map.world.y, w: map.width * TILE, h: map.height * TILE };
}

/** Toutes les zones du monde. */
function zonesOf(maps: Record<string, MapData>): Zone[] {
  return Object.values(maps).flatMap((m) => {
    const z = zoneOf(m);
    return z ? [z] : [];
  });
}

/** La zone qui contient le point du monde (wx, wy), s'il y en a une. */
function zoneAt(maps: Record<string, MapData>, wx: number, wy: number): Zone | undefined {
  return zonesOf(maps).find((z) => wx >= z.x && wx < z.x + z.w && wy >= z.y && wy < z.y + z.h);
}

/**
 * Les zones dont le rectangle recoupe celui de `map` élargi de `margin` px (ses voisines, coins compris), avec leur décalage dans le
 * repère de `map` (`dx`, `dy` : où tombe leur coin haut gauche).
 */
export function neighborsOf(maps: Record<string, MapData>, map: MapData, margin: number): (Zone & { dx: number; dy: number })[] {
  const me = zoneOf(map);
  if (!me) return [];
  return zonesOf(maps)
    .filter((z) => z.map.id !== map.id)
    .filter((z) => z.x < me.x + me.w + margin && me.x - margin < z.x + z.w && z.y < me.y + me.h + margin && me.y - margin < z.y + z.h)
    .map((z) => ({ ...z, dx: z.x - me.x, dy: z.y - me.y }));
}

/**
 * Le monde continue-t-il au-delà de ce côté de la carte, entre `from` et `to` le long du bord (px de la carte) ? Vrai si une zone
 * touche ce bord à ses deux bouts et en son milieu (un arbre qui tombe par-dessus le bord, la caméra qui montre la voisine).
 */
function continues(maps: Record<string, MapData>, map: MapData, side: Side, from = 0, to = 1): boolean {
  const me = zoneOf(map);
  if (!me) return false;
  const probe = (t: number): [number, number] => {
    if (side === 'west') return [me.x - 1, me.y + t];
    if (side === 'east') return [me.x + me.w, me.y + t];
    if (side === 'north') return [me.x + t, me.y - 1];
    return [me.x + t, me.y + me.h];
  };
  const len = side === 'west' || side === 'east' ? me.h : me.w;
  const a = Math.max(0, Math.min(len - 1, from));
  const b = Math.max(0, Math.min(len - 1, to));
  return [a, (a + b) / 2, b].every((t) => !!zoneAt(maps, ...probe(t)));
}

/** Les côtés de la carte où le monde continue sur toute leur longueur : là, Xéros passe le bord et la caméra montre la voisine. */
export function openSides(maps: Record<string, MapData>, map: MapData): Record<Side, boolean> {
  const z = zoneOf(map);
  const open = (side: Side) => !!z && continues(maps, map, side, 0, (side === 'west' || side === 'east' ? z.h : z.w) - 1);
  return { west: open('west'), east: open('east'), north: open('north'), south: open('south') };
}

/**
 * Le passage d'un bord : les pieds de Xéros en (x, y) dans la carte, sortis de la carte (le milieu de ses pieds est passé de l'autre
 * côté). Renvoie la carte voisine et la position correspondante dans son repère (le même point du monde), ou undefined s'il n'est pas
 * sorti, ou si rien n'est de l'autre côté (le bord du monde).
 */
export function crossing(maps: Record<string, MapData>, map: MapData, x: number, y: number): { map: MapData; x: number; y: number } | undefined {
  const me = zoneOf(map);
  if (!me) return undefined;
  if (x >= 0 && x < me.w && y >= 0 && y < me.h) return undefined;
  const wx = me.x + x;
  const wy = me.y + y;
  const to = zoneAt(maps, wx, wy);
  if (!to || to.map.id === map.id) return undefined;
  return { map: to.map, x: wx - to.x, y: wy - to.y };
}
