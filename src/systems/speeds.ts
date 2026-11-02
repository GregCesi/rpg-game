import { PLAYER } from '../config';
import { CM_PER_PX } from '../content/gabarit';

/** Où les vitesses réglées sont retenues d'une session à l'autre, hors de la sauvegarde (comme le zoom). */
const KEY = 'xeros-vitesses-2';

/** Les vitesses de Xéros, en px/s : la marche et la course. Chargé ou fatigué, il marche à une part de la marche : une seule source. */
export interface Speeds {
  walk: number;
  run: number;
}

/** m/s en px/s (5 cm par pixel), et l'inverse. */
export const pxPerSec = (metresPerSec: number): number => (metresPerSec * 100) / CM_PER_PX;
export const metresPerSec = (px: number): number => (px * CM_PER_PX) / 100;

/** Les vitesses par défaut (config.ts, PLAYER, en m/s). */
const DEFAULT_SPEEDS: Speeds = { walk: pxPerSec(PLAYER.walk), run: pxPerSec(PLAYER.run) };

function stored(): Speeds {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Speeds> | null;
    const ok = (x: unknown): x is number => typeof x === 'number' && x > 0 && x < 2000;
    return { walk: ok(v?.walk) ? v.walk : DEFAULT_SPEEDS.walk, run: ok(v?.run) ? v.run : DEFAULT_SPEEDS.run };
  } catch {
    return { ...DEFAULT_SPEEDS };
  }
}

/**
 * Les vitesses en ce moment (docs/CONCEPTION.md, « Le travail », § 8) : celles par défaut, ou celles que Grégoire règle dans ?dieu pour
 * les calibrer en jouant ; lues par Player et RollSystem à chaque image. La marche chargée, la marche fatiguée et la bille poussée en
 * dérivent (une part de la marche) : aucune autre vitesse de déplacement.
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

/**
 * La vitesse d'une bille poussée (px/s) : la marche, × ce que permet la force pour cette masse (`rollFactor`), × la fatigue (`tired` :
 * `walkFactor` de Stamina, 1 reposé) : comme la marche, jamais une vitesse à part.
 */
export const pushSpeed = (rollFactor: number, tired: number): number => SPEEDS.walk * rollFactor * tired;
