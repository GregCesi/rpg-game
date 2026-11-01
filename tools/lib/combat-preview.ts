// Aperçu combat.png (npm run art:preview ; docs/CONCEPTION.md, « Le combat ») : Xéros à trois moments de chaque geste d'attaque
// (armé, coup, retour), avec chaque arme, dans les quatre directions ; puis chaque arme dans ses huit angles. Même calcul que le jeu
// (entities/ToolUse.ts) : l'image de l'angle de la pose (gestures.json, `weaponFrame`) posée par son centre sur la main, pieds +
// (dx, dy) ; à gauche, tout est retourné. Une rangée par arme et par geste ; la dernière rangée, les angles.

import type { PNG } from 'pngjs';
import { flipX } from '../../art/lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../../art/lib/types';
import type { Gesture } from '../../src/content/types';
import { weaponFrame } from '../../src/world/strike';
import { Board, grassOf } from './composite-previews';

const DIRS = ['down', 'up', 'right', 'left'] as const;

/**
 * `weapons` : les planches `weapon-<…>` ; `used` : les gestes que jouent les attaques de combat.json, dans l'ordre.
 * Colonnes : pour chaque direction, l'image armée (juste avant l'impact), l'impact, la dernière.
 */
export function combatPreview(sources: ArtSource[], body: SpriteSheetSource, weapons: SpriteSheetSource[], gestures: Record<string, Gesture>, used: string[]): PNG {
  const fw = body.frameW;
  const fh = body.frameH;
  const cw = fw + 28;
  const ch = fh + 28;
  const moments = (g: Gesture) => [Math.max(0, g.impact - 1), g.impact, g.poses.down.length - 1];
  const rows = weapons.length * used.length;
  const angle = 40; // une case d'angle : le centre de l'image d'arme
  const board = new Board(Math.max(cw * 3 * DIRS.length, angle * 8 * weapons.length), ch * rows + angle + 8, grassOf(sources));
  weapons.forEach((w, wi) => {
    const angles = w.animations.angles.frames;
    used.forEach((name, gi) => {
      const g = gestures[name];
      const row = wi * used.length + gi;
      DIRS.forEach((dir, di) => {
        const left = dir === 'left';
        const src = left ? 'right' : dir;
        const frames = body.animations[`${name}-${dir}`]?.frames ?? [];
        moments(g).forEach((step, mi) => {
          const pose = g.poses[src][step];
          if (!frames[step] || !pose) return;
          let wg = angles[weaponFrame(pose.angle)];
          if (left) wg = flipX(wg);
          const bx = (di * 3 + mi) * cw + 14;
          const by = row * ch + 20;
          const gx = w.frameW / 2 - (left ? 1 : 0);
          const gy = w.frameH / 2;
          const hx = left ? fw - 1 - (fw / 2 + pose.dx) : fw / 2 + pose.dx;
          const tx = bx + hx - gx;
          const ty = by + fh + pose.dy - gy;
          if (pose.behind) board.blit(wg, w.palette, tx, ty);
          board.blit(frames[step], body.palette, bx, by);
          if (!pose.behind) board.blit(wg, w.palette, tx, ty);
        });
      });
    });
    // les huit angles, centrés dans leur case (0 = est, puis un huitième de tour de plus dans le sens trigonométrique)
    angles.forEach((a, k) => {
      const x = (wi * 8 + k) * angle + angle / 2 - w.frameW / 2;
      const y = rows * ch + 4 + angle / 2 - w.frameH / 2;
      board.blit(a, w.palette, x, y);
    });
  });
  return board.toPng();
}
