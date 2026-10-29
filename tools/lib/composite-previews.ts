// Aperçus composés de npm run art:preview : ce que le jeu assemble à partir de plusieurs images.
// - xeros-<geste>-<outil>.png : chaque geste (use, chop...) du corps avec l'outil posé sur la main, image par image,
//   une rangée par direction (bas, haut, droite, gauche). Les poses viennent de src/content/gestures.json,
//   comme dans le jeu (entities/ToolUse.ts) : l'aperçu montre exactement ce que l'on verra.
// - item-bar.png : maquette de la barre d'objets (8 cases, la 2e active, quelques icônes).

import { PNG } from 'pngjs';
import { flipX } from '../../art/lib/canvas';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../../art/lib/types';
import type { Gesture } from '../../src/content/types';

const SCALE = 4;

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}

/** Image en pixels du jeu, posée sur l'herbe, agrandie ×SCALE à l'écriture. */
class Board {
  private readonly px: [number, number, number][];

  constructor(
    readonly w: number,
    readonly h: number,
    grass: { grid: Grid; palette: Palette } | undefined,
  ) {
    this.px = Array.from({ length: w * h }, (_, i) => {
      if (!grass) return [120, 133, 68];
      const x = i % w;
      const y = Math.floor(i / w);
      const [r, g, b] = hexToRgba(grass.palette[grass.grid[y % grass.grid.length][x % grass.grid[0].length]]);
      return [r, g, b];
    });
  }

  blit(grid: Grid, palette: Palette, ox: number, oy: number): void {
    grid.forEach((line, y) =>
      [...line].forEach((ch, x) => {
        if (ch === '.') return;
        const X = ox + x;
        const Y = oy + y;
        if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
        const [r, g, b, a8] = hexToRgba(palette[ch]);
        const a = a8 / 255;
        const p = this.px[Y * this.w + X];
        p[0] = Math.round(r * a + p[0] * (1 - a));
        p[1] = Math.round(g * a + p[1] * (1 - a));
        p[2] = Math.round(b * a + p[2] * (1 - a));
      }),
    );
  }

  toPng(): PNG {
    const png = new PNG({ width: this.w * SCALE, height: this.h * SCALE });
    for (let Y = 0; Y < png.height; Y++) {
      for (let X = 0; X < png.width; X++) {
        const p = this.px[Math.floor(Y / SCALE) * this.w + Math.floor(X / SCALE)];
        png.data.set([p[0], p[1], p[2], 255], (Y * png.width + X) * 4);
      }
    }
    return png;
  }
}

function grassOf(sources: ArtSource[]): { grid: Grid; palette: Palette } | undefined {
  const world = sources.find((s) => s.kind === 'tileset' && s.name === 'world');
  if (world?.kind !== 'tileset' || !world.tiles.grass) return undefined;
  return { grid: world.tiles.grass, palette: world.palette };
}

/**
 * Le geste `name` du personnage `body` avec la planche d'outil `tool` (animations `<geste>-down/up/right`,
 * prise du manche au centre). Même calcul que ToolUse : main = pieds + (dx, dy) ; à gauche, tout est retourné.
 */
export function gesturePreview(sources: ArtSource[], body: SpriteSheetSource, tool: SpriteSheetSource, name: string, gesture: Gesture): PNG {
  const fw = body.frameW;
  const fh = body.frameH;
  const cw = fw + 24;
  const ch = fh + 24;
  const steps = gesture.poses.down.length;
  const board = new Board(cw * steps, ch * 4, grassOf(sources));
  (['down', 'up', 'right', 'left'] as const).forEach((dir, row) => {
    const left = dir === 'left';
    const src = left ? 'right' : dir;
    const frames = body.animations[`${name}-${dir}`]?.frames ?? [];
    const tools = tool.animations[`${name}-${src}`]?.frames ?? [];
    for (let step = 0; step < steps; step++) {
      const pose = gesture.poses[src][step];
      let tg = tools[step];
      if (!tg || !frames[step]) continue;
      if (left) tg = flipX(tg);
      const bx = step * cw + 12;
      const by = row * ch + 18;
      // prise du manche au centre (arrondie vers le bas) ; retournée, elle passe d'une colonne à gauche
      const gx = Math.floor(tool.frameW / 2) - (left ? 1 : 0);
      const gy = Math.floor(tool.frameH / 2);
      const hx = left ? fw - 1 - (fw / 2 + pose.dx) : fw / 2 + pose.dx;
      const tx = bx + hx - gx;
      const ty = by + fh + pose.dy - gy;
      if (pose.behind) board.blit(tg, tool.palette, tx, ty);
      board.blit(frames[step], body.palette, bx, by);
      if (!pose.behind) board.blit(tg, tool.palette, tx, ty);
    }
  });
  return board.toPng();
}

/** Les deux mains comme dans HudScene : une branche dans la main gauche, une pierre dans la droite, la droite active. */
export function handsPreview(sources: ArtSource[]): PNG | undefined {
  const image = (name: string) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'image' ? s : undefined;
  };
  const slot = image('ui-slot');
  const active = image('ui-slot-active');
  if (!slot || !active) return undefined;
  const size = slot.grid[0].length;
  const gap = 4;
  const icons = ['item-branch', 'item-stone'];
  const board = new Board(2 * size + gap + 16, size + 16, grassOf(sources));
  icons.forEach((key, i) => {
    const x = 8 + i * (size + gap);
    const s = i === 1 ? active : slot;
    board.blit(s.grid, s.palette, x, 8);
    const icon = image(key);
    // icône centrée dans la case, comme dans HudScene
    if (icon) board.blit(icon.grid, icon.palette, x + (size - icon.grid[0].length) / 2, 8 + (size - icon.grid.length) / 2);
  });
  return board.toPng();
}
