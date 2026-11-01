// Passer d'une zone du monde à sa voisine en marchant hors du bord (chantier « monde », CONCEPTION « Le monde »). Les zones sont des
// cartes de Tiled assemblées (tiled/maps/monde.world) ; world/zones.ts dit qui est la voisine et où l'on arrive. Ici : les bornes de
// la marche (un bord ouvert laisse passer les pieds de Xéros un peu au-delà ; le bord du monde l'arrête), celles de la caméra (elle
// montre la bande des voisines, world/zoneBand.ts), et le moment du passage.
import { TILE, ZONES } from '../config';
import { maps } from '../content';
import type { MapData } from '../content/types';
import type { Player } from '../entities/Player';
import { crossing, openSides, type Side } from '../world/zones';

/** Un rectangle en px dans le repère de la carte. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class ZoneCrossing {
  /** Les côtés de la carte où le monde continue. */
  readonly open: Record<Side, boolean>;

  constructor(private readonly map: MapData) {
    this.open = openSides(maps, map);
  }

  /** La carte est-elle une zone du monde ? */
  get isZone(): boolean {
    return !!this.map.world;
  }

  /** La carte agrandie de `ex` px (et `ey`) sur ses côtés ouverts. */
  private grown(ex: number, ey: number): Rect {
    const w = this.map.width * TILE;
    const h = this.map.height * TILE;
    const l = this.open.west ? ex : 0;
    const t = this.open.north ? ey : 0;
    return { x: -l, y: -t, w: w + l + (this.open.east ? ex : 0), h: h + t + (this.open.south ? ey : 0) };
  }

  /** Où marchent les pieds : la carte, et un peu au-delà d'un bord ouvert, le temps que le milieu des pieds le passe. */
  get walkBounds(): Rect {
    return this.grown(ZONES.edge, ZONES.edge);
  }

  /** Où va la caméra : la carte et la bande des voisines au-delà de chaque bord ouvert. */
  get cameraBounds(): Rect {
    return this.grown(ZONES.band.x * TILE, ZONES.band.y * TILE);
  }

  /** Xéros vient de passer un bord ouvert : la voisine et l'arrivée (ses pieds au même point du monde), sinon rien. */
  update(player: Player): { map: MapData; x: number; y: number } | undefined {
    if (!this.isZone || player.dir.lengthSq() === 0) return undefined;
    return crossing(maps, this.map, player.actor.x, player.actor.y);
  }
}
