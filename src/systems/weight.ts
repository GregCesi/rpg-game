// Le poids de ce qu'on tient, et ce qu'on dit quand c'est trop lourd. Sans Phaser.
import { heldMass } from '../content/mass';
import type { PropDef } from '../content/types';
import type { Strength } from '../entities/Strength';
import type { GameState } from '../state';

/** Masse de tout ce que tiennent les mains (les deux mains, ou ce qu'on tient à deux), en kg. */
export function carriedMass(s: GameState): number {
  return s.both ? heldMass(s.both) : heldMass(s.hands[0]) + heldMass(s.hands[1]);
}

/**
 * Ce qu'on dit quand E refuse un objet de plus de ce que Xéros porte : une bille qui roule est à pousser ; une bille trop
 * lourde pour rouler le dit ; tout autre objet est seulement trop lourd.
 */
export function heavyNotice(def: PropDef | undefined, kg: number, strength: Strength): string {
  if (!def?.roll) return 'Trop lourd à porter.';
  return strength.canRoll(kg) ? 'Trop lourde à porter. Pousse-la pour la faire rouler.' : 'Trop lourde à porter, et trop lourde pour rouler.';
}
