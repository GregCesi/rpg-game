import Phaser from 'phaser';
import { RELIEF, VIEW } from '../config';
import type { MapData } from '../content/types';
import type { Player } from '../entities/Player';
import { worldHeight } from '../world/terrainView';

/**
 * Jusqu'où, au sud de Xéros, ce qui est plus haut que lui peut le cacher (px du monde) : la masse sud d'un chemin creux, ses plantes et
 * les grands arbres de son dessus, qui montent de 5 m (100 px) et de leur hauteur (jusqu'à 170 px) dans l'écran (120 px sous lui).
 */
const SOUTH = 400;
/** Plus haut que le sol de Xéros de tant (cm), le terrain au sud le cache. */
const HIDES = 100;

/**
 * Sous la voûte (chantier « relief », CADRAGE.md 12.4 et 13) : quand Xéros est dans un creux dont le bord sud le cache (le terrain juste
 * au sud de lui est plus haut que lui de HIDES cm), la masse sud est tranchée au ras du chemin : la terre en coupe (les images `cut` de
 * world/terrainView.ts) apparaît, et ce qui la surmonte s'efface comme un toit, à RELIEF.lane, sur la largeur de l'écran autour de lui
 * seulement : les bandes du terrain qui passent devant et ce qui est posé plus haut que lui (les plantes des gradins sud, les grands
 * arbres du dessus), et les pièces de la voûte (`vault` de props.json). Xéros reste net. Le fondu dure RELIEF.fadeMs.
 */
export class LaneFade {
  private readonly faded = new Set<Phaser.GameObjects.Image>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly def: MapData,
  ) {}

  /** Xéros est-il caché par le bord sud d'un creux ? */
  hidden(x: number, y: number): boolean {
    const h = worldHeight(this.def, x, y);
    for (let k = 8; k <= 48; k += 8) if (worldHeight(this.def, x, y + k) - h > HIDES) return true;
    return false;
  }

  update(player: Player, delta: number): void {
    const a = player.actor;
    const want = new Set<Phaser.GameObjects.Image>();
    if (this.hidden(a.x, a.y)) {
      const half = VIEW.width / 2 + 32;
      const h = worldHeight(this.def, a.x, a.y);
      for (const obj of this.scene.children.list) {
        const o = obj as Phaser.GameObjects.Image;
        if (o === (a as unknown) || typeof o.setAlpha !== 'function' || typeof o.depth !== 'number') continue;
        if (o.depth <= a.y || o.depth > a.y + SOUTH) continue;
        const left = o.x - (o.originX ?? 0.5) * (o.displayWidth ?? 0);
        const right = left + (o.displayWidth ?? 0);
        if (right < a.x - half || left > a.x + half) continue;
        const terrain = o.getData?.('noLift') && typeof o.texture?.key === 'string' && o.texture.key.startsWith('terrain:');
        // posé plus haut que lui sur le bord (sa hauteur au pied), une pièce de la voûte (`vault` de props.json), ou une bande du terrain
        // qui passe devant
        if (terrain || o.getData?.('vault') || worldHeight(this.def, o.x + (0.5 - (o.originX ?? 0.5)) * (o.displayWidth ?? 0), o.depth) - h > HIDES / 2) want.add(o);
      }
    }
    const step = (1 - RELIEF.lane) * (delta / RELIEF.fadeMs);
    // la terre en coupe (world/terrainView.ts) : la masse sud tranchée au ras du chemin apparaît pendant que ce qui la surmonte s'efface
    const under = this.hidden(a.x, a.y);
    const half = VIEW.width / 2 + 32;
    const show = delta / RELIEF.fadeMs;
    for (const obj of this.scene.children.list) {
      const o = obj as Phaser.GameObjects.Image;
      if (!o.getData?.('cut')) continue;
      const near = under && o.x + o.displayWidth >= a.x - half && o.x <= a.x + half;
      o.setAlpha(near ? Math.min(1, o.alpha + show) : Math.max(0, o.alpha - show));
    }
    for (const o of want) {
      this.faded.add(o);
      o.setAlpha(Math.max(RELIEF.lane, o.alpha - step));
    }
    for (const o of [...this.faded]) {
      if (want.has(o)) continue;
      if (!o.active) {
        this.faded.delete(o);
        continue;
      }
      o.setAlpha(Math.min(1, o.alpha + step));
      if (o.alpha >= 1) this.faded.delete(o);
    }
  }
}
