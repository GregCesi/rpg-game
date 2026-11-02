// L'effort de Xéros : ce que coûtent la course et le fardeau, et ce qu'on dit quand l'endurance manque. Sans lire le clavier : la
// scène dit quand. Les prix sont dans stamina.json ; le composant `Stamina` (entities/) tient les trois niveaux.
import type { Player } from '../entities/Player';
import type { Effort } from '../entities/Stamina';

/** Ce qu'on dit quand un effort est refusé, plafond du jour à zéro. */
export const EXHAUSTED = 'Xéros est épuisé. Il faut dormir.';

/**
 * La course et le fardeau puisent à chaque image dans le plafond du jour (`costs.runPerSec`, `carryPerKgSec`) et dans le souffle
 * (`breath.perSec`) ; marcher à vide ne coûte rien. Les efforts ponctuels (coup d'outil, nœud, pivot) passent par `afford`. Le souffle
 * revient au repos (`recover`, à chaque image, même pendant un geste : il ne revient qu'après `regenDelayMs` sans effort).
 * Deux refus : à bout de souffle, l'effort attend sans message (Xéros souffle, la barre clignote : `Stamina.winded`) ; plafond vide,
 * « épuisé », dit une fois par tentative (pour la course, une fois par appui sur Maj, pas à chaque image).
 */
export class EffortSystem {
  /** Le message de cet appui sur Maj est déjà dit. */
  private told = false;

  constructor(
    private readonly notice: (text: string) => void,
    /** La barre tremble (le HUD). */
    private readonly denied: () => void,
  ) {}

  /** À appeler après `Player.update`, à chaque image. `active` = false pendant un geste, un dialogue ou un changement de carte. */
  update(player: Player, delta: number, active: boolean): void {
    const s = player.stamina;
    s.recover(delta);
    if (!active) return s.flush();
    if (player.running) s.drain(s.costs.runPerSec, delta, s.runBreath);
    // porter se paie en marchant ; la bille qu'on pousse a son prix (systems/roll.ts), il ne porte alors rien
    const walking = player.dir.lengthSq() > 0 && !player.pushing;
    const { load, walk } = player.strength;
    if (walking) s.drain(s.carryRate(load, walk), delta, s.carryBreath(load, walk));
    if (!player.running && !walking && !player.pushing) s.flush();
    if (player.runRefused) {
      if (!this.told) this.exhausted();
      this.told = true;
    } else this.told = false;
  }

  /**
   * Paye un effort ponctuel de `cost` points. Vrai si l'effort peut se faire ; à bout de souffle, faux sans message (il attend) ;
   * plafond vide, faux et « épuisé ».
   */
  afford(player: Player, cost: number): boolean {
    return this.attempt(player, cost) === 'done';
  }

  /** Comme `afford`, mais rend ce qui s'est passé : fait, `winded` (il attend son souffle), `exhausted` (dit). */
  attempt(player: Player, cost: number): Effort {
    const r = player.stamina.spend(cost);
    if (r === 'exhausted') this.exhausted();
    return r;
  }

  /**
   * Paye un coup au joule (un coup de travail, une attaque : son plafond et son souffle). Vrai si le coup part ; à bout de souffle, faux
   * sans message (Xéros souffle) ; plafond vide, faux et « épuisé ».
   */
  affordStroke(player: Player, cost: { ceiling: number; breath: number }): boolean {
    const r = player.stamina.spendStroke(cost.ceiling, cost.breath);
    if (r === 'exhausted') this.exhausted();
    return r === 'done';
  }

  /** Un effort de `cost` points pourrait-il se faire maintenant ? Sans le payer ; plafond vide, « épuisé » est dit. */
  allows(player: Player, cost: number): boolean {
    const r = player.stamina.check(cost);
    if (r === 'exhausted') this.exhausted();
    return r === 'done';
  }

  /** Dit que Xéros est épuisé et fait trembler la barre. */
  exhausted(): void {
    this.notice(EXHAUSTED);
    this.denied();
  }
}
