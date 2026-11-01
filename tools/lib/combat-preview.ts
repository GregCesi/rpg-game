// Aperçu combat.png (npm run art:preview ; docs/CONCEPTION.md, « Le combat ») : Xéros à trois moments de chaque geste de combat
// (armé, première frappe avec sa traînée ou son éclat, après), avec chaque arme (la taille et le coup vertical) et à mains nues (les
// deux directs), dans les quatre directions ; puis chaque arme dans ses huit angles. Même calcul que le jeu (entities/ToolUse.ts,
// `placeFight`) : les poses de COMBAT_POSES, l'image de l'angle de l'arme posée par son centre sur la main droite, la traînée et
// l'éclat par leur centre ; vers la gauche, les images de l'arme, de la traînée et de l'éclat sont retournées et dx opposé (le corps,
// lui, a ses images dessinées).

import type { PNG } from 'pngjs';
import { flipX, type Grid, type Palette } from '../../art/lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../../art/lib/types';
import { weaponFrame, type CombatPoses } from '../../src/world/strike';
import { Board, grassOf } from './composite-previews';

const DIRS = ['down', 'up', 'right', 'left'] as const;

/**
 * `weapons` : les planches `weapon-<…>` ; `poses` : COMBAT_POSES ; `armed` : les gestes joués avec une arme, `bare` : à mains nues.
 * Une rangée par arme et par geste armé, puis une par geste à mains nues ; colonnes : pour chaque direction, l'armé, la frappe, l'après.
 */
export function combatPreview(sources: ArtSource[], body: SpriteSheetSource, weapons: SpriteSheetSource[], poses: Record<string, CombatPoses>, armed: string[], bare: string[]): PNG {
  const fw = body.frameW;
  const fh = body.frameH;
  const cw = fw + 28;
  const ch = fh + 28;
  const rows: { gesture: string; weapon?: SpriteSheetSource }[] = [...weapons.flatMap((w) => armed.map((g) => ({ gesture: g, weapon: w }))), ...bare.map((g) => ({ gesture: g }))];
  const image = (name: string) => sources.find((s) => s.kind === 'image' && s.name === name) as { grid: Grid; palette: Palette } | undefined;
  const angle = 40;
  const board = new Board(Math.max(cw * 3 * DIRS.length, angle * 8 * weapons.length), ch * rows.length + angle + 8, grassOf(sources));
  rows.forEach(({ gesture, weapon }, row) => {
    DIRS.forEach((dir, di) => {
      const left = dir === 'left';
      const frames = poses[gesture][dir];
      const bodyFrames = body.animations[`${gesture}-${dir}`]?.frames ?? [];
      const first = frames.findIndex((f) => f.strike);
      [first - 1, first, Math.min(frames.length - 1, first + 1)].forEach((step, mi) => {
        const f = frames[step];
        if (!f || !bodyFrames[step]) return;
        const bx = (di * 3 + mi) * cw + 14;
        const by = row * ch + 20;
        // un point de pose (depuis les pieds) dans la case, une image posée par son centre (retournée vers la gauche)
        const put = (g: Grid, pal: Palette, dx: number, dy: number) => {
          const w = g[0].length;
          const h = g.length;
          const grid = left ? flipX(g) : g;
          const hx = left ? fw - 1 - (fw / 2 + dx) : fw / 2 + dx;
          board.blit(grid, pal, Math.round(bx + hx - (Math.floor(w / 2) - (left ? 1 : 0))), Math.round(by + fh + dy - Math.floor(h / 2)));
        };
        const sword = weapon && f.weapon ? weapon.animations.angles.frames[weaponFrame(f.weapon.angle)] : undefined;
        const smear = f.smear && weapon ? image(`fx-smear-${weapon.name.replace(/^weapon-/, '')}-${f.smear.image}`) : undefined;
        const grip = f.grip && weapon ? image(f.grip.image) : undefined;
        if (smear && f.smear!.behind) put(smear.grid, smear.palette, f.smear!.dx, f.smear!.dy);
        if (sword && f.weapon!.behind) put(sword, weapon!.palette, f.right.dx, f.right.dy);
        board.blit(bodyFrames[step], body.palette, bx, by);
        if (grip) put(grip.grid, grip.palette, f.grip!.dx, f.grip!.dy);
        if (sword && !f.weapon!.behind) put(sword, weapon!.palette, f.right.dx, f.right.dy);
        if (smear && !f.smear!.behind) put(smear.grid, smear.palette, f.smear!.dx, f.smear!.dy);
        const spark = f.spark ? image(f.spark.image) : undefined;
        if (spark) put(spark.grid, spark.palette, f.spark!.dx, f.spark!.dy);
      });
    });
  });
  // les huit angles de chaque arme, centrés dans leur case (0 = est, puis un huitième de tour de plus dans le sens trigonométrique)
  weapons.forEach((w, wi) => {
    w.animations.angles.frames.forEach((a, k) => {
      board.blit(a, w.palette, (wi * 8 + k) * angle + angle / 2 - w.frameW / 2, rows.length * ch + 4 + angle / 2 - w.frameH / 2);
    });
  });
  return board.toPng();
}
