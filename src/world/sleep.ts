// Le sommeil et la veille, sans Phaser (docs/CONCEPTION.md, « Le temps ») : quand Xéros se lève, ce que lui rend la nuit, ce que lui
// coûte une nuit de veille. Les valeurs sont dans stamina.json (`sleep`, `max`, `tired`) et time.json (`wakeHour`).
import type { StaminaDef } from '../content/types';
import { MINUTES_PER_DAY, between, later, type Clock } from './clock';

/** Les niveaux au coucher et ce qu'il fallait savoir de la journée : le plafond au réveil d'avant (`woke`). */
export interface Bedtime {
  ceiling: number;
  max: number;
  woke: number;
}

/**
 * Le lever : à `wakeHour` (le prochain après le coucher), sauf si cela fait plus de `hours` de sommeil ; alors au bout de ses
 * `hours` (couché à l'aube, levé l'après-midi). Couché à 22 h : 6 h ; à 2 h : 6 h (nuit courte) ; à 6 h : 14 h.
 */
export function wakeTime(bed: Clock, wakeHour: number, hours: number): Clock {
  const at = wakeHour * 60;
  const next = bed.minute < at ? { day: bed.day, minute: at } : { day: bed.day + 1, minute: at };
  const full = later(bed, hours * 60);
  return between(bed, next) <= between(bed, full) ? next : full;
}

/**
 * Ce que rend la nuit : le maximum monte de `gain` × (1 − maximum / `cap`) si la journée a entamé le plafond d'au moins `trainFrom` du
 * maximum ; le plafond revient au (nouveau) maximum, moins `exhaustedPenalty` × ce qui manquait sous le seuil « fatigué » (`tired` du
 * maximum) au coucher, moins `missingHourPenalty` par heure de sommeil manquante sous `hours`.
 */
export function morning(def: StaminaDef, bed: Bedtime, sleptMinutes: number): { ceiling: number; max: number } {
  const trained = bed.woke - bed.ceiling >= def.max.trainFrom * bed.max;
  const max = Math.min(def.max.cap, bed.max + (trained ? def.max.gain * (1 - bed.max / def.max.cap) : 0));
  const shortfall = Math.max(0, def.tired * bed.max - bed.ceiling);
  const missing = Math.max(0, def.sleep.hours - sleptMinutes / 60);
  const ceiling = max - def.sleep.exhaustedPenalty * shortfall - def.sleep.missingHourPenalty * missing;
  return { max, ceiling: Math.min(max, Math.max(0, ceiling)) };
}

/** Minutes de nuit (de `nightFrom` h à `wakeHour` h) entre `from` et `minutes` plus tard : la veille de nuit use le plafond. */
export function nightMinutes(from: Clock, minutes: number, nightFrom: number, wakeHour: number): number {
  const start = nightFrom * 60;
  const end = wakeHour * 60;
  let total = 0;
  let t = from.minute;
  let left = Math.max(0, minutes);
  // morceau par morceau, d'un bord de la nuit au suivant
  while (left > 1e-9) {
    const night = t >= start || t < end;
    const edge = t >= start ? MINUTES_PER_DAY + end : t < end ? end : start;
    const step = Math.min(left, edge - t);
    if (night) total += step;
    left -= step;
    t = (t + step) % MINUTES_PER_DAY;
  }
  return total;
}
