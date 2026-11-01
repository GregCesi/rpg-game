import { time } from '../content';
import { advanceClock, game } from '../state';
import { gameMinutes, nextSpeed, type Clock } from '../world/clock';

/** Où le palier choisi est retenu d'une session à l'autre, hors de la sauvegarde de partie (comme le zoom). */
const KEY = 'xeros-temps';

/** Le palier de la vitesse du temps en ce moment : celui retenu dans le navigateur, sinon celui de time.json. */
function stored(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return time.speeds.includes(v) ? v : time.default;
  } catch {
    return time.default;
  }
}

/**
 * L'horloge en jeu (docs/CONCEPTION.md, « Le temps ») : à chaque image, elle avance de la durée jouée × la vitesse du temps (un palier
 * de time.json, choisi par le joueur avec V et Maj + V, retenu dans le navigateur) ; elle ne fait avancer que l'heure, jamais la marche
 * ni les gestes. Arrêtée pendant un dialogue, un passage d'une carte à l'autre et le mode construction. `work` y ajoute la durée d'un
 * travail (les minutes de son geste, en données).
 */
export class ClockSystem {
  /** Le palier en ce moment (lu aussi par le HUD). */
  static speed = stored();
  /** Appelé chaque fois que l'horloge avance en jeu, depuis `from`, de `minutes` (la veille de nuit use l'endurance). */
  onAdvance?: (from: Clock, minutes: number) => void;

  /** À chaque image : `delta` ms jouées ; `running` : faux pendant un dialogue, un fondu, le mode construction. */
  update(delta: number, running: boolean): void {
    if (running) this.advance(gameMinutes(delta, ClockSystem.speed));
  }

  /** V (`dir` +1) ou Maj + V (−1) : le palier voisin ; rend le nouveau palier, retenu dans le navigateur. */
  step(dir: 1 | -1): number {
    ClockSystem.speed = nextSpeed(time.speeds, ClockSystem.speed, dir);
    try {
      localStorage.setItem(KEY, String(ClockSystem.speed));
    } catch {
      // stockage refusé : le palier vaut pour cette session
    }
    return ClockSystem.speed;
  }

  /** Un travail : l'horloge avance de sa durée réaliste (minutes de jeu), quelle que soit la vitesse du temps. */
  work(minutes: number): void {
    this.advance(minutes);
  }

  private advance(minutes: number): void {
    const from = game.clock;
    advanceClock(game, minutes);
    this.onAdvance?.(from, minutes);
  }
}
