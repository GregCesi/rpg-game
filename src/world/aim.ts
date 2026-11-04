// La visée, sans Phaser (docs/COMMANDES.md) : hors du combat, Xéros vise devant lui (Player.probe, sans curseur). Au coup et au lancer,
// il se tourne vers le curseur (la plus proche de ses quatre directions de dessin), et ce qu'il frappe est sous le curseur s'il est à
// portée, sinon dans la direction du curseur, à la distance où il regarde d'habitude.

import type { Facing } from '../content/types';

export type Point = { x: number; y: number };

/** Le vecteur d'une direction de dessin. */
export const FACING_VECTOR: Record<Facing, Point> = { down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/**
 * La direction de dessin la plus proche du vecteur (dx, dy) : celle de l'axe le plus long. À égalité, `current` est gardée si elle
 * convient, sinon l'horizontale. Un vecteur nul garde `current`.
 */
export function facingToward(dx: number, dy: number, current: Facing): Facing {
  if (dx === 0 && dy === 0) return current;
  const h: Facing = dx < 0 ? 'left' : 'right';
  const v: Facing = dy < 0 ? 'up' : 'down';
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > ay) return h;
  if (ay > ax) return v;
  return current === h || current === v ? current : h;
}

/**
 * Le point visé depuis `center` (le point d'où Xéros regarde) : le curseur s'il est à moins de `reach` px ; sinon, le point à `distance`
 * px dans la direction du curseur ; sans curseur (ou sur lui), le point à `distance` px devant lui (`facing`).
 */
export function aimProbe(center: Point, cursor: Point | undefined, facing: Facing, reach: number, distance: number): Point {
  if (cursor) {
    const dx = cursor.x - center.x;
    const dy = cursor.y - center.y;
    const d = Math.hypot(dx, dy);
    if (d <= reach && d > 0) return { x: cursor.x, y: cursor.y };
    if (d > 0) return { x: center.x + (dx / d) * distance, y: center.y + (dy / d) * distance };
  }
  const f = FACING_VECTOR[facing];
  return { x: center.x + f.x * distance, y: center.y + f.y * distance };
}
