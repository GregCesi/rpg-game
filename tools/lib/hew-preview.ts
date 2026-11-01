// equarrissage.png de npm run art:preview : la passe de doloire (systems/wood.ts, sur le rail de systems/rail.ts), Xéros à trois
// moments de la passe sur une pièce de 3 m couchée est-ouest. En haut, la première face, partie du bout ouest : Xéros au nord de la
// pièce, le dessus dressé (l'aspect f1) jusqu'au fer, rond au-delà ; en bas, la deuxième face au retour, partie du bout est (f2
// derrière lui, f1 devant). La pièce est assemblée comme le jeu l'assemble (`composeWood`, la face entamée de `dressed`), Xéros et la
// doloire posés comme ToolUse les pose (pieds + `dx`, `dy` du geste `chop`), aux places du jeu : ses pieds 7 px au-dessus du bas de
// l'image de la pièce, le fer (`strike.down` = -1) sur la colonne où s'arrête la face dressée.

import type { PNG } from 'pngjs';
import type { ArtSource } from '../../art/lib/types';
import { composeWood } from '../../art/world/wood-pieces';
import gesturesJson from '../../src/content/gestures.json';
import type { WoodPiece } from '../../src/content/types';
import { CM_PER_PX } from '../../src/content/gabarit';
import { WOOD } from '../../src/world/woodShape';
import { Board, grassOf } from './composite-previews';

const LENGTH = 300;
/** Où en est la passe à chaque moment (part de la longueur dressée), et l'image du geste `chop` montrée. */
const MOMENTS = [
  { part: 0.2, frame: gesturesJson.chop.impact },
  { part: 0.55, frame: 2 },
  { part: 0.9, frame: gesturesJson.chop.impact },
];

export function hewPreview(sources: ArtSource[]): PNG | undefined {
  const body = sources.find((s) => s.name === 'xeros');
  const tool = sources.find((s) => s.name === `tool-${WOOD.hew.tool}`);
  const sheet = sources.find((s) => s.name === WOOD.sizes.normal?.sheet);
  if (body?.kind !== 'spritesheet' || tool?.kind !== 'spritesheet' || sheet?.kind !== 'spritesheet') return undefined;
  const chop = gesturesJson.chop;
  const strike = chop.strike.down;
  const fw = body.frameW;
  const fh = body.frameH;
  const rows: { faces: number; from: 'start' | 'end' }[] = [
    { faces: 0, from: 'start' },
    { faces: 1, from: 'end' },
  ];
  const sample = composeWood({ size: 'normal', length: LENGTH, shape: 'round', axis: 'ew' }).toGrid();
  const cw = sample[0].length + 24;
  const ch = fh + 16;
  const board = new Board(cw * MOMENTS.length, ch * rows.length, grassOf(sources));
  rows.forEach((row, r) => {
    MOMENTS.forEach((m, i) => {
      const dressed = Math.round(LENGTH * m.part);
      const piece: WoodPiece = {
        size: 'normal',
        length: LENGTH,
        shape: 'round',
        axis: 'ew',
        ...(row.faces ? { hewn: row.faces * WOOD.hew.perFace } : {}),
        dressed: { from: row.from, length: dressed },
      };
      const grid = composeWood(piece).toGrid();
      // la pièce : son coin bas gauche en (px, py) ; le fer sur la colonne où s'arrête la face dressée
      const px = i * cw + 12;
      const py = r * ch + ch - 4;
      const col = Math.round((row.from === 'start' ? dressed : LENGTH - dressed) / CM_PER_PX);
      const feet = { x: px + col - strike, y: py - 7 };
      const pose: { dx: number; dy: number; behind?: boolean; ahead?: number } = chop.poses.down[m.frame];
      const frame = body.animations['chop-down'].frames[m.frame];
      const tg = tool.animations['chop-down'].frames[m.frame];
      const bx = feet.x - fw / 2;
      const by = feet.y - fh;
      const tx = feet.x + pose.dx - Math.floor(tool.frameW / 2);
      const ty = feet.y + pose.dy - Math.floor(tool.frameH / 2);
      // l'ordre du jeu : derrière le corps, le corps, la pièce (plus au sud que les pieds), et l'outil s'il passe devant elle (`ahead`)
      const ahead = pose.ahead ?? 0;
      if (pose.behind) board.blit(tg, tool.palette, tx, ty);
      board.blit(frame, body.palette, bx, by);
      if (!pose.behind && ahead < 7) board.blit(tg, tool.palette, tx, ty);
      board.blit(grid, sheet.palette, px, py - grid.length);
      if (ahead >= 7) board.blit(tg, tool.palette, tx, ty);
    });
  });
  return board.toPng();
}
