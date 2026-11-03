// Un banc d'essai des créatures, sans Phaser ni navigateur (tools/test-creatures.ts, tools/test-contrats.ts) : un pré avec des
// obstacles (des boîtes), des entrées de garenne, Xéros réduit à un point et une allure, et une créature menée par le moteur commun
// (src/world/creature.ts) pas à pas, comme le jeu (pas de jeu de taille normale).

import type { CreatureDef, Gait } from '../../src/content/types';
import { rng } from '../../src/world/gridCanvas';
import { emerge, step, type Creature, type CreatureEvent, type Point, type Surroundings } from '../../src/world/creature';

/** Une boîte d'obstacle, en px : gauche, haut, largeur, hauteur. */
export type Box = { x: number; y: number; w: number; h: number };

/** Un pas de jeu à x1 (60 images par seconde). */
export const DT = 1 / 60;

export interface Field {
  boxes: Box[];
  holes: Point[];
  threat?: { x: number; y: number; gait: Gait };
  rand: () => number;
}

export const field = (boxes: Box[], holes: Point[], seed = 1): Field => ({ boxes, holes, rand: rng(seed) });

export const blockedIn =
  (boxes: Box[]) =>
  (x: number, y: number): boolean =>
    boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);

export const around = (f: Field): Surroundings => ({ threat: f.threat, blocked: blockedIn(f.boxes), holes: f.holes, rand: f.rand });

/** Une bête qui sort à `at`. */
export const beast = (def: CreatureDef, at: Point, kind = 'essai'): Creature => emerge(`${kind}#0`, kind, def, at);

/**
 * Mener la bête `n` pas au plus, jusqu'à ce que `until` soit vrai ; à chaque pas, `each` (une vérification) ; rend les événements et le
 * nombre de pas faits.
 */
export function drive(
  c: Creature,
  def: CreatureDef,
  f: Field,
  n: number,
  until?: (c: Creature, ev: CreatureEvent[]) => boolean,
  each?: (c: Creature) => void,
): { events: CreatureEvent[]; steps: number } {
  const all: CreatureEvent[] = [];
  for (let i = 0; i < n; i++) {
    const ev = step(c, def, around(f), DT);
    all.push(...ev);
    each?.(c);
    if (until?.(c, ev)) return { events: all, steps: i + 1 };
  }
  return { events: all, steps: n };
}
