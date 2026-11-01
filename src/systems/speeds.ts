import { PLAYER } from '../config';
import { CM_PER_PX } from '../content/gabarit';

/** Où les vitesses réglées sont retenues d'une session à l'autre, hors de la sauvegarde (comme le zoom et la vitesse du temps). */
const KEY = 'xeros-vitesses';

/** Les vitesses de Xéros, en px/s : la marche, la course, la marche chargée (à deux mains). */
export interface Speeds {
  walk: number;
  run: number;
  carry: number;
}

/** Les vitesses par défaut (config.ts, PLAYER) : la marche chargée part de la marche, que la masse portée ralentit. */
export const DEFAULT_SPEEDS: Speeds = { walk: PLAYER.walkSpeed, run: PLAYER.runSpeed, carry: PLAYER.walkSpeed };

function stored(): Speeds {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Speeds> | null;
    const ok = (x: unknown): x is number => typeof x === 'number' && x > 0 && x < 2000;
    return { walk: ok(v?.walk) ? v.walk : DEFAULT_SPEEDS.walk, run: ok(v?.run) ? v.run : DEFAULT_SPEEDS.run, carry: ok(v?.carry) ? v.carry : DEFAULT_SPEEDS.carry };
  } catch {
    return { ...DEFAULT_SPEEDS };
  }
}

/**
 * Les vitesses en ce moment (docs/CONCEPTION.md, « Le travail », § 8) : celles par défaut, ou celles que Grégoire règle dans ?dieu pour
 * les calibrer en jouant ; lues par Player et RollSystem à chaque image. Les valeurs par défaut ne changent pas.
 */
export const SPEEDS: Speeds = stored();

/** Règle les vitesses (px/s) et les retient dans le navigateur ; `undefined` : celles par défaut. */
export function setSpeeds(v: Speeds | undefined): void {
  Object.assign(SPEEDS, v ?? DEFAULT_SPEEDS);
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(SPEEDS));
    else localStorage.removeItem(KEY);
  } catch {
    // stockage refusé : les vitesses valent pour cette session
  }
}

/** m/s en px/s (5 cm par pixel), et l'inverse. */
export const pxPerSec = (metresPerSec: number): number => (metresPerSec * 100) / CM_PER_PX;
export const metresPerSec = (px: number): number => (px * CM_PER_PX) / 100;
