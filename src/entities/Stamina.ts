import { stamina as def } from '../content';
import { game, setStamina } from '../state';

/** Au moins ce que la jauge doit perdre (points) avant d'être écrite dans GameState pendant un effort continu. */
const SAVE_EVERY = 1;

/**
 * Composant du joueur : l'endurance, la fatigue de la journée. Le maximum, le seuil de fatigue et le prix de chaque effort
 * viennent du contenu (stamina.json). La valeur vivante est ici ; GameState la reçoit à chaque dépense ponctuelle, tous
 * les `SAVE_EVERY` points d'un effort continu (courir, porter, pousser), à l'arrêt de l'effort (`flush`) et en quittant la
 * carte : sinon la sauvegarde s'écrirait à chaque image. `infinite` (outils de test, ?dieu) : rien ne se dépense. Ne sait
 * rien du monde : la scène et `systems/effort.ts` disent quel effort est fait, quand, et ce qu'on en dit au joueur.
 */
export class Stamina {
  /** Endurance en ce moment, de 0 à `def.max`. */
  value = game.stamina;
  /** Outils de test : l'endurance ne baisse jamais. */
  infinite = false;
  /** Part de la jauge perdue depuis la dernière écriture dans GameState. */
  private unsaved = 0;
  /** Appelé à chaque changement de la valeur (le HUD se redessine). */
  onChange?: () => void;

  get max(): number {
    return def.max;
  }

  /** Part de la jauge restante, de 0 à 1. */
  get fraction(): number {
    return this.value / def.max;
  }

  /** Épuisé : plus rien de ce qui coûte ne se fait (marcher reste possible). */
  get empty(): boolean {
    return !this.infinite && this.value <= 1e-9;
  }

  /** Fatigué : sous le seuil de `tired`, il ne court plus et marche plus lentement. */
  get tired(): boolean {
    return !this.infinite && this.fraction < def.tired;
  }

  /** Peut-il courir ? Ni fatigué ni épuisé. */
  canRun(): boolean {
    return !this.tired;
  }

  /** Sa marche en part de la normale : 1, ou `tiredWalk` quand il est fatigué. */
  walkFactor(): number {
    return this.tired ? def.tiredWalk : 1;
  }

  /** Prix d'un effort ponctuel (voir stamina.json). */
  get costs() {
    return def.costs;
  }

  /** Prix de pivoter une bille de `kg`. */
  turnCost(kg: number): number {
    return def.costs.turnPerKg * kg;
  }

  /** Prix de dresser une poutre de `kg` sur son appui ; avec de l'aide (`helped`), la moitié. */
  raiseCost(kg: number, helped = false): number {
    return def.costs.raisePerKg * kg * (helped ? 0.5 : 1);
  }

  /** Prix par seconde de marcher en portant `load` kg : proportionnel à ce qui dépasse `walk` (strength.json, × la force). */
  carryRate(load: number, walk: number): number {
    return def.costs.carryPerKgSec * Math.max(0, load - walk);
  }

  /** Prix par seconde de pousser une bille de `kg`. */
  pushRate(kg: number): number {
    return def.costs.pushPerKgSec * kg;
  }

  /**
   * Dépense `cost` points pour un effort ponctuel. Refusé (faux, rien ne change) s'il ne reste rien ; sinon fait, même s'il
   * ne reste pas tout à fait de quoi le payer en entier (la jauge tombe à 0). Écrit tout de suite dans GameState.
   */
  spend(cost: number): boolean {
    if (this.empty) return false;
    this.set(this.value - cost, true);
    return true;
  }

  /** Dépense `perSec` points par seconde pendant `delta` ms (un effort continu) ; écrit dans GameState tous les `SAVE_EVERY` points. */
  drain(perSec: number, delta: number): void {
    if (this.infinite || perSec <= 0) return;
    this.set(this.value - (perSec * delta) / 1000, false);
  }

  /** Remet la jauge à `value` (outils de test, sommeil), écrite tout de suite. */
  reset(value: number): void {
    this.set(value, true);
  }

  /** Écrit la valeur dans GameState si elle a bougé depuis la dernière écriture (arrêt d'un effort, fermeture, changement de carte). */
  flush(): void {
    if (this.unsaved <= 0) return;
    this.unsaved = 0;
    setStamina(game, this.value);
  }

  private set(next: number, save: boolean): void {
    const v = Math.min(def.max, Math.max(0, next));
    this.unsaved += Math.abs(this.value - v);
    this.value = v;
    this.onChange?.();
    if (save || this.unsaved >= SAVE_EVERY) {
      this.unsaved = 0;
      setStamina(game, v);
    }
  }
}
