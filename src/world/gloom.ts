// La pénombre du sous-bois (chantier « monde ») : de plus en plus sombre en s'enfonçant vers l'ouest, d'une zone à l'autre sans
// marche, parce qu'elle se calcule au mètre du monde (`gloom` de world.json) et non par carte. Posée au-dessus de tout, comme la
// pénombre d'un intérieur ; les lueurs restent par-dessus.
import type Phaser from 'phaser';
import { DEPTH, GLOOM } from '../config';
import { world } from '../content';
import { CM_PER_PX } from '../content/gabarit';

/** La pénombre au point x du monde (px depuis le bord ouest) : interpolée entre deux paliers de world.json ; rien au-delà du dernier. */
export function gloomAt(wx: number): number {
  const m = (wx * CM_PER_PX) / 100;
  const stops = world.gloom;
  if (m <= stops[0].x) return stops[0].alpha;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (m <= b.x) return a.alpha + ((b.alpha - a.alpha) * (m - a.x)) / (b.x - a.x || 1);
  }
  return 0;
}

/**
 * Dessine la pénombre sur le rectangle [x0, x1[ × [y0, y1[ de la carte (px), la carte ayant son bord ouest en `worldX` dans le monde :
 * des bandes verticales de `GLOOM.strip` px, chacune de la pénombre de son milieu. Rien si le rectangle est hors du sous-bois.
 */
export function drawGloom(scene: Phaser.Scene, worldX: number, r: { x0: number; y0: number; x1: number; y1: number }): Phaser.GameObjects.Graphics | undefined {
  const g = scene.add.graphics().setDepth(DEPTH.ambient);
  let any = false;
  for (let x = r.x0; x < r.x1; x += GLOOM.strip) {
    const w = Math.min(GLOOM.strip, r.x1 - x);
    const a = gloomAt(worldX + x + w / 2);
    if (a <= 0) continue;
    g.fillStyle(GLOOM.color, a).fillRect(x, r.y0, w, r.y1 - r.y0);
    any = true;
  }
  if (any) return g;
  g.destroy();
  return undefined;
}
