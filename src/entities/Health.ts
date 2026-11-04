import { health as def } from '../content';
import { game, setHealth } from '../state';

/**
 * Composant du joueur : la vie de Xéros (docs/CONCEPTION.md, « La vie de Xéros »), réglée par health.json. Un choc la fait baisser
 * (`hurt`, la charge d'un sanglier : world/charge.ts) ; à zéro, Xéros s'évanouit (la scène le ramène au cagibi, `faint` de GameState) ;
 * la nuit la fait remonter (`sleep` de GameState). Écrite tout de suite dans GameState. `infinite` (?dieu) : rien ne la fait baisser.
 * Ne sait rien du monde : il dit seulement ce qui reste.
 */
export class Health {
  /** Outils de test : la vie ne baisse jamais. */
  infinite = false;
  /** Appelé à chaque changement (le HUD se redessine). */
  onChange?: () => void;

  get value(): number {
    return game.health;
  }

  get max(): number {
    return def.max;
  }

  /** Sans connaissance : la vie est à zéro. */
  get fainted(): boolean {
    return game.health <= 1e-9;
  }

  /** Un choc de `points` (déjà tirés de son énergie) : rend vrai si Xéros s'évanouit. */
  hurt(points: number): boolean {
    if (this.infinite || points <= 0) return false;
    this.set(game.health - points);
    return this.fainted;
  }

  /** Remet la vie (outils de test, le réveil). */
  set(value: number): void {
    setHealth(game, value);
    this.onChange?.();
  }
}
