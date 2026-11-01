import { advanceClock, game } from '../state';
import { gameMinutes, type Clock } from '../world/clock';

/**
 * L'horloge en jeu (docs/CONCEPTION.md, « Le temps ») : à chaque pas de jeu, elle avance de sa durée, une minute de jeu par minute
 * jouée. La vitesse du temps du joueur (V, Maj + V : x1 à x20) est la vitesse de simulation (systems/simSpeed.ts) : elle accélère tout
 * le jeu, l'horloge comprise, par pas de taille normale. Arrêtée pendant un dialogue, un passage d'une carte à l'autre et le mode
 * construction. `work` y ajoute une durée d'un coup (?dieu « Finir le travail », « Transformer »).
 */
export class ClockSystem {
  /** Multiplicateur de l'horloge seule : 1 ; réservé aux tests (faire passer une nuit sans attendre). */
  static speed = 1;
  /** Appelé chaque fois que l'horloge avance en jeu, depuis `from`, de `minutes` (la veille de nuit use l'endurance). */
  onAdvance?: (from: Clock, minutes: number) => void;

  /** À chaque pas de jeu : `delta` ms jouées ; `running` : faux pendant un dialogue, un fondu, le mode construction. */
  update(delta: number, running: boolean): void {
    if (running) this.advance(gameMinutes(delta, ClockSystem.speed));
  }

  /** Une durée d'un coup (minutes de jeu) : ?dieu « Finir le travail », « Transformer ». */
  work(minutes: number): void {
    this.advance(minutes);
  }

  private advance(minutes: number): void {
    const from = game.clock;
    advanceClock(game, minutes);
    this.onAdvance?.(from, minutes);
  }
}
