// Un coup de travail, sans Phaser (docs/CONCEPTION.md, « Le travail ») : la même physique que le combat (world/strike.ts : l'inertie
// de l'outil autour des mains, la précision qui baisse avec elle). Le corps applique un couple sur l'angle de frappe ; l'outil arrive à
// la vitesse angulaire ω = min(√(2 τ θ / I), ω du bras), avec l'énergie ½ I ω². Un outil lourd prend toute la force mais part
// lentement ; un outil léger plafonne à la vitesse du bras. Le coup a cinq temps : armer, le temps en haut et dégager s'allongent avec
// l'inertie et raccourcissent avec la force ; abattre dure 2 θ / ω ; l'impact est fixe. Ce qu'enlève un coup se calcule ici aussi
// (world/workPlan.ts : la matière de chaque travail ; systems/work.ts : le jeu).

import type { CombatDef, Swinger, ToolWork, Weapon, WorkStroke } from '../content/types';
import { inertia, precision } from './strike';

/** Les cinq temps d'un coup (gestures.json, `phases`). */
export type Phase = 'arm' | 'hold' | 'down' | 'impact' | 'free';

/** Un coup : l'inertie (kg·m²), la vitesse angulaire (rad/s), la vitesse du tranchant (m/s), l'énergie (J), ses temps (s), sa précision. */
export interface Stroke {
  inertia: number;
  omega: number;
  tip: number;
  joules: number;
  times: Record<Phase, number>;
  /** Durée du coup entier, en s. */
  cycle: number;
  /** Précision de 0 à 1 : celle de l'outil (comme une arme), meilleure avec la force, × l'adresse. */
  precision: number;
  /** La part utile du coup : 1 − `aim` × (1 − précision). */
  quality: number;
  edge: number;
}

/** Le couple de référence des temps hors frappe (N·m) : à ce couple, `armK` × 0,1 s par kg·m². */
const TORQUE_REF = 50;

/** Un outil vu comme une arme, pour l'inertie et la précision de world/strike.ts. */
export const asWeapon = (t: ToolWork): Weapon => ({ length: t.length, grip: t.grip, balance: t.balance }) as Weapon;

/** Le coup `stroke` de l'outil `tool` (de masse `kg`) donné par `who`. */
export function strokeOf(who: Swinger, tool: ToolWork, kg: number, stroke: WorkStroke, rules: CombatDef['rules']): Stroke {
  const w = asWeapon(tool);
  const I = inertia(w, kg);
  const omega = Math.min(Math.sqrt((2 * who.torque * stroke.angle) / I), who.omegaMax);
  const joules = 0.5 * I * omega * omega;
  // les temps hors frappe s'allongent avec l'inertie, raccourcissent avec la force
  const slow = (I * TORQUE_REF) / who.torque;
  const times: Record<Phase, number> = {
    arm: stroke.arm + stroke.armK * 0.1 * slow,
    hold: stroke.hold + stroke.holdK * 0.1 * slow,
    down: (2 * stroke.angle) / omega,
    impact: stroke.impact,
    free: stroke.free + stroke.freeK * 0.1 * slow,
  };
  const cycle = times.arm + times.hold + times.down + times.impact + times.free;
  // un outil lourd se tient mieux quand on est fort : le contrôle grandit avec le couple
  const p = precision({ ...rules, controlRef: (rules.controlRef * who.torque) / TORQUE_REF }, w, kg) * who.skill;
  return { inertia: I, omega, tip: omega * ((tool.length - tool.grip) / 100), joules, times, cycle, precision: p, quality: 1 - tool.aim * (1 - p), edge: tool.edge };
}

/** Ce qu'enlève un coup d'une matière de résistance `resistance` (J par unité : cm³, ou m² de fente), et de dureté `hardness`. */
export const removedBy = (s: Stroke, resistance: number, hardness = 1): number => (s.joules * s.quality * s.edge) / (resistance * hardness);

/**
 * La durée de chaque image d'un geste (ms), d'après les temps du coup : chaque temps partagé également entre ses images (`phases` de
 * gestures.json, une valeur par image).
 */
export function frameMs(s: Stroke, phases: readonly Phase[]): number[] {
  const count = (p: Phase) => phases.filter((q) => q === p).length;
  return phases.map((p) => Math.max(1, Math.round((s.times[p] * 1000) / count(p))));
}
