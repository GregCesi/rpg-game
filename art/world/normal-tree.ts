// PROVISOIRE (à remplacer par le dessin de l'arbre debout et de la souche).
import { Canvas } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { shadedOutline, groundShadow, type Vec } from './big-tree';
import { bark } from './wood';
import { NORMAL_WOOD } from './wood';
import { CROWN_BOTTOM, CROWN_TOP, FOOT, STUMP_SIZE, TREE_H, TREE_W, TRUNK_X0 } from './normal-geometry';

export function treeBody(_light: Vec = [-Math.SQRT1_2, -Math.SQRT1_2]): Canvas {
  const c = new Canvas(TREE_W, TREE_H);
  for (let y = CROWN_BOTTOM; y <= FOOT[1]; y++) for (let x = 0; x < 6; x++) c.set(TRUNK_X0 + x, y, bark(y, (x + 0.5) / 6, NORMAL_WOOD));
  c.ellipse(24, (CROWN_TOP + CROWN_BOTTOM) / 2, 18, (CROWN_BOTTOM - CROWN_TOP) / 2, 'l');
  return c;
}
export function standingTree(): Canvas {
  const c = shadedOutline(treeBody());
  groundShadow(c, FOOT[0] + 2, FOOT[1] + 0.5, 9, 2.5);
  return c;
}
export function stumpBody(): Canvas {
  const c = new Canvas(STUMP_SIZE[0], STUMP_SIZE[1]);
  for (let y = 12; y <= 19; y++) for (let x = 0; x < 6; x++) c.set(9 + x, y, bark(y, (x + 0.5) / 6, NORMAL_WOOD));
  return c;
}
export function stump(): Canvas {
  return shadedOutline(stumpBody());
}
const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });
export default [img('normal-tree', standingTree()), img('normal-tree-stump', stump())];
