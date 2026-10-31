// Entrer dans un bâtiment et en sortir (chantier « intérieurs », CONCEPTION « Les intérieurs »). Dehors : les bâtiments posés en mode
// construction (world/interior.ts, recalculés quand une pièce change) ; Xéros qui marche dans le passage d'une porte ouverte (ou d'une
// ouverture sans porte), tourné vers le dedans, entre : la scène passe à la carte de l'intérieur (world/interiorMap.ts), par le même
// fondu qu'une sortie de Tiled. Dedans : le même passage, tourné vers le dehors, le ramène devant la porte.

import { maps } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { Facing } from '../content/types';
import type { Player } from '../entities/Player';
import { game, mapState } from '../state';
import { tilesets } from '../generated/assets';
import type { GameMap } from '../world/GameMap';
import { buildingsOf, interiorId, parseInteriorId, type Building, type Rect } from '../world/interior';
import { interiorOf, type InteriorMap } from '../world/interiorMap';

/** Où va Xéros : la carte et la position de ses pieds (px). */
export interface Passage {
  mapId: string;
  at: { x: number; y: number; facing: Facing };
}

/** Les pieds (le point de collision, 3 px au-dessus, comme les sorties de Tiled) dans un rectangle en cm. */
function feetIn(player: Player, r: Rect): boolean {
  const x = player.actor.x * CM_PER_PX;
  const y = (player.actor.y - 3) * CM_PER_PX;
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.d;
}

/** Les numéros de tuile de l'intérieur : la terre battue (ses quatre variantes) et le vide. */
function interiorTiles(): { floor: number[]; void: number } {
  const t = tilesets.find((q) => q.key === 'interior')!.tiles;
  return { floor: ['floor', 'floor2', 'floor3', 'floor4'].map((k) => t[k]), void: t.void };
}

/**
 * L'intérieur nommé par un identifiant de carte (`interieur:<carte>:<x>,<y>`), calculé des pièces posées de la carte du dehors telles
 * que GameState les garde ; rien si ce n'est pas un intérieur ou si le bâtiment n'est plus là.
 */
export function resolveInterior(id: string): InteriorMap | undefined {
  const r = parseInteriorId(id);
  if (!r || !maps[r.host]) return undefined;
  const st = mapState(game, r.host);
  const b = buildingsOf(st.builds).find((q) => q.key === r.key);
  return b && interiorOf(r.host, b, st.joints, interiorTiles());
}

export class Interiors {
  private cache?: { version: number; buildings: Building[] };

  constructor(
    private readonly map: GameMap,
    /** L'intérieur où l'on est, ou rien dehors. */
    private readonly interior?: InteriorMap,
  ) {}

  /** Les bâtiments de la carte (dehors), recalculés après chaque pose ou retrait de pièce. */
  buildings(): Building[] {
    if (this.interior) return [];
    if (this.cache?.version !== this.map.buildsVersion) {
      this.cache = { version: this.map.buildsVersion, buildings: buildingsOf(mapState(game, this.map.def.id).builds) };
    }
    return this.cache.buildings;
  }

  /** Une entrée ou une sortie prise à cette image (Xéros avance, ses pieds dans le passage, tourné vers où il va), sinon rien. */
  update(player: Player): Passage | undefined {
    if (player.dir.lengthSq() === 0) return undefined;
    const facing = player.actor.facing;
    if (this.interior) {
      const e = this.interior.exits.find((x) => x.facing === facing && feetIn(player, x.zone));
      return e && { mapId: this.interior.host, at: e.to };
    }
    for (const b of this.buildings()) {
      const i = b.entrances.findIndex((e) => e.open && e.facing === facing && feetIn(player, e.zone));
      if (i < 0) continue;
      const it = resolveInterior(interiorId(this.map.def.id, b.key));
      if (it) return { mapId: it.def.id, at: it.arrivals[i] };
    }
    return undefined;
  }
}
