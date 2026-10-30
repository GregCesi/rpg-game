// L'effort de Xéros : ce que coûtent la course et le fardeau, et ce qu'on dit quand l'endurance est vide. Sans lire le
// clavier : la scène dit quand. Les prix sont dans stamina.json ; le composant `Stamina` (entities/) tient la jauge.
import type { Player } from '../entities/Player';

/** Ce qu'on dit quand un effort est refusé, jauge à zéro. */
export const EXHAUSTED = 'Xéros est épuisé. Il faut dormir.';

/**
 * La course et le fardeau puisent dans la jauge à chaque image (par seconde, `runPerSec` ; marcher en portant au-delà de
 * ce que Xéros porte sans peine, `carryPerKgSec` par kg de trop). Marcher à vide ne coûte rien. Les efforts ponctuels
 * (coup d'outil, nœud, pivot) passent par `afford`. Le message « épuisé » n'est dit qu'une fois par tentative : pour la
 * course, une fois par appui sur Maj, pas à chaque image.
 */
export class EffortSystem {
  /** Le message de cet appui sur Maj est déjà dit. */
  private told = false;

  constructor(
    private readonly notice: (text: string) => void,
    /** La jauge tremble (le HUD). */
    private readonly denied: () => void,
  ) {}

  /** À appeler après `Player.update`, à chaque image. `active` = false pendant un geste, un dialogue ou un changement de carte. */
  update(player: Player, delta: number, active: boolean): void {
    const s = player.stamina;
    if (!active) return s.flush();
    if (player.running) s.drain(s.costs.runPerSec, delta);
    // porter se paie en marchant ; la bille qu'on pousse a son prix (systems/roll.ts), il ne porte alors rien
    const walking = player.dir.lengthSq() > 0 && !player.pushing;
    if (walking) s.drain(s.carryRate(player.strength.load, player.strength.walk), delta);
    if (!player.running && !walking && !player.pushing) s.flush();
    if (player.runRefused) {
      if (!this.told) this.exhausted();
      this.told = true;
    } else this.told = false;
  }

  /** Paye un effort ponctuel de `cost` points ; sinon dit que Xéros est épuisé. Vrai si l'effort peut se faire. */
  afford(player: Player, cost: number): boolean {
    if (player.stamina.spend(cost)) return true;
    this.exhausted();
    return false;
  }

  /** Dit que Xéros est épuisé et fait trembler la jauge. */
  exhausted(): void {
    this.notice(EXHAUSTED);
    this.denied();
  }
}
