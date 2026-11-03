// Où se tient Xéros pour travailler, et où tombe le fer (chantier « maison-2 », Grégoire : le fer frappe là où il travaille, du côté
// de Xéros, pour tout outil et toute matière) : tiré de la portée réelle de l'outil (items.json, `work` : `length` − `grip`, de la main
// au tranchant) et de la main à l'image d'impact du geste (gestures.json), jamais d'un nombre écrit pour un outil. Sans Phaser.

import { gestures, items } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { Gesture } from '../content/types';

/** La portée de l'outil (px) : de la main qui le tient au tranchant ; 0 sans données de travail. */
export function toolReach(tool: string | undefined): number {
  const w = tool ? items[tool]?.work : undefined;
  return w ? (w.length - w.grip) / CM_PER_PX : 0;
}

/**
 * Où tombe le fer du geste à l'impact, en x par rapport aux pieds de Xéros tourné vers `dir` (px ; vers la gauche en miroir de la
 * droite) : vers le haut ou le bas, `strike` du geste ; de côté, la main de l'image d'impact plus la portée de l'outil vue en long
 * (`strike.reach`, 1 sans `strike`).
 */
export function strikeOffset(gesture: Gesture, tool: string | undefined, dir: 'down' | 'up' | 'left' | 'right'): number {
  const side = dir === 'left' ? 'right' : dir;
  const hand = gesture.poses[side][gesture.impact].dx;
  const at = side === 'right' ? hand + toolReach(tool) * (gesture.strike?.reach ?? 1) : (gesture.strike?.[side] ?? hand);
  return dir === 'left' ? -at : at;
}

/**
 * La distance des pieds de Xéros à l'axe d'un tronc debout pour l'abattre de côté (px) : le rayon du tronc, son contour, puis le fer
 * du geste à l'impact (`strikeOffset`), qui mord l'écorce d'un pixel. Le fer frappe le tronc du côté de Xéros, jamais au-delà.
 */
export function fellDistance(diameter: number, gesture: Gesture, tool: string | undefined): number {
  return diameter / 2 / CM_PER_PX + 1 + strikeOffset(gesture, tool, 'right') - 1;
}

/** Le geste d'un coup de travail (work.json, `strokes`) par son nom. */
export const gestureOf = (name: string): Gesture => gestures[name];
