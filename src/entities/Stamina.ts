import { stamina as def } from '../content';
import { game, setStamina } from '../state';

/** Au moins ce que les niveaux doivent bouger (points) avant d'être écrits dans GameState pendant un effort continu. */
const SAVE_EVERY = 5;

/** Ce que donne un effort demandé : fait, refusé faute de souffle (il attend : Xéros souffle), refusé faute de plafond (épuisé). */
export type Effort = 'done' | 'winded' | 'exhausted';

/** Les niveaux, tels que le HUD les montre. */
export interface StaminaLevels {
  breath: number;
  ceiling: number;
  max: number;
  winded: boolean;
}

/**
 * Composant du joueur : l'endurance en trois niveaux (docs/CONCEPTION.md, « Le temps »), réglée par stamina.json.
 * - Le **souffle** se vide à chaque effort (`breath.perCost` fois son prix ; les efforts continus, `breath.perSec`) et revient vers le
 *   plafond de `regenPerSec` par seconde jouée, `regenDelayMs` après le dernier effort. Un effort qui manque de souffle attend : il est
 *   refusé sans message d'épuisement, et Xéros est « essoufflé » (`winded` : la barre clignote, il souffle) jusqu'à ce que le souffle
 *   soit revenu à `breath.recovered` du plafond.
 * - Le **plafond du jour** baisse du prix de chaque effort (les prix d'aujourd'hui) et ne revient qu'en dormant ; à 0, épuisé, plus
 *   rien de ce qui coûte ; sous `tired` du maximum, fatigué : plus de course, marche à `tiredWalk`.
 * - Le **maximum** monte la nuit avec l'entraînement (systems/sleep).
 * Les valeurs vivantes sont ici ; GameState les reçoit à chaque effort ponctuel, tous les `SAVE_EVERY` points d'un effort continu et
 * à l'arrêt de l'effort (`flush`). `infinite` (?dieu) : rien ne se dépense. Ne sait rien du monde : la scène et `systems/effort.ts`
 * disent quel effort est fait, et ce qu'on en dit au joueur.
 */
export class Stamina {
  breath = game.stamina.breath;
  ceiling = game.stamina.ceiling;
  max = game.stamina.max;
  /** Outils de test : l'endurance ne baisse jamais. */
  infinite = false;
  /** Essoufflé : un effort a attendu faute de souffle, ou la course s'est arrêtée ; jusqu'à ce que le souffle revienne. */
  winded = false;
  /** Temps (ms jouées) depuis le dernier effort : le souffle ne revient qu'après `regenDelayMs`. */
  private rest = 0;
  private unsaved = 0;
  /** Appelé à chaque changement (le HUD se redessine). */
  onChange?: () => void;

  /** Épuisé : le plafond est vide, plus rien de ce qui coûte (marcher reste possible). */
  get empty(): boolean {
    return !this.infinite && this.ceiling <= 1e-9;
  }

  /** Fatigué : le plafond sous `tired` du maximum : il ne court plus et marche plus lentement. */
  get tired(): boolean {
    return !this.infinite && this.ceiling < def.tired * this.max;
  }

  /** Peut-il courir ? Ni fatigué, ni à bout de souffle. */
  canRun(): boolean {
    return !this.tired && (this.infinite || this.breath > 1e-9);
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

  /** Souffle par seconde de la course. */
  get runBreath(): number {
    return def.breath.perSec.run;
  }

  /** Souffle par seconde de marcher en portant `load` kg, au-delà de `walk`. */
  carryBreath(load: number, walk: number): number {
    return def.breath.perSec.carryPerKg * Math.max(0, load - walk);
  }

  /** Souffle par seconde de pousser une bille de `kg`. */
  pushBreath(kg: number): number {
    return def.breath.perSec.pushPerKg * kg;
  }

  /** Les niveaux en ce moment (le HUD). */
  levels(): StaminaLevels {
    return { breath: this.breath, ceiling: this.ceiling, max: this.max, winded: this.winded && !this.infinite };
  }

  /**
   * Un effort ponctuel de `cost` points : refusé si le plafond est vide (épuisé) ou si le souffle ne suffit pas (il attend, Xéros est
   * essoufflé) ; sinon le plafond baisse de son prix et le souffle de `breath.perCost` fois. Écrit tout de suite dans GameState.
   */
  spend(cost: number): Effort {
    const r = this.check(cost);
    if (r !== 'done' || this.infinite || cost <= 0) return r;
    this.rest = 0;
    this.set(this.breath - cost * def.breath.perCost, this.ceiling - cost, true);
    return 'done';
  }

  /**
   * Un effort ponctuel de `cost` points pourrait-il se faire, sans le payer ? À bout de souffle, Xéros devient essoufflé (le signe
   * se voit tout de suite) ; un souffle plus bas que le plafond ne bloque pas un effort plus cher que le plafond entier.
   */
  check(cost: number): Effort {
    if (this.infinite || cost <= 0) return 'done';
    if (this.empty) return 'exhausted';
    if (this.breath + 1e-9 < Math.min(this.ceiling, cost * def.breath.perCost)) {
      if (!this.winded) {
        this.winded = true;
        this.onChange?.();
      }
      return 'winded';
    }
    return 'done';
  }

  /** Un effort continu pendant `delta` ms : `perSec` points du plafond par seconde, et `breathPerSec` du souffle. */
  drain(perSec: number, delta: number, breathPerSec = 0): void {
    if (this.infinite || (perSec <= 0 && breathPerSec <= 0)) return;
    this.rest = 0;
    const s = delta / 1000;
    const breath = this.breath - breathPerSec * s;
    if (breath <= 1e-9 && breathPerSec > 0) this.winded = true;
    this.set(breath, this.ceiling - perSec * s, false);
  }

  /** La veille de nuit use le plafond de `points` (world/sleep.ts), sans toucher au repos du souffle. */
  wear(points: number): void {
    if (this.infinite || points <= 0) return;
    this.set(this.breath, this.ceiling - points, false);
  }

  /** À chaque image : le souffle revient vers le plafond au repos ; essoufflé, Xéros le reste jusqu'à `recovered` du plafond. */
  recover(delta: number): void {
    this.rest += delta;
    if (this.rest >= def.breath.regenDelayMs && this.breath < this.ceiling) {
      this.set(this.breath + (def.breath.regenPerSec * delta) / 1000, this.ceiling, false);
    }
    if (this.winded && this.breath >= def.breath.recovered * this.ceiling) {
      this.winded = false;
      this.onChange?.();
    }
  }

  /** Remet les niveaux (outils de test, sommeil), écrits tout de suite. */
  reset(value: { breath?: number; ceiling?: number; max?: number }): void {
    if (value.max !== undefined) this.max = value.max;
    const ceiling = value.ceiling ?? this.ceiling;
    this.set(value.breath ?? Math.min(this.breath, ceiling), ceiling, true);
  }

  /** Écrit les niveaux dans GameState s'ils ont bougé depuis la dernière écriture (arrêt d'un effort, changement de carte). */
  flush(): void {
    if (this.unsaved <= 0) return;
    this.unsaved = 0;
    setStamina(game, { breath: this.breath, ceiling: this.ceiling, max: this.max });
  }

  private set(breath: number, ceiling: number, save: boolean): void {
    const c = Math.min(this.max, Math.max(0, ceiling));
    const b = Math.min(c, Math.max(0, breath));
    this.unsaved += Math.abs(this.ceiling - c) + Math.abs(this.breath - b);
    this.ceiling = c;
    this.breath = b;
    this.onChange?.();
    if (save || this.unsaved >= SAVE_EVERY) {
      this.unsaved = 0;
      setStamina(game, { breath: b, ceiling: c, max: this.max });
    }
  }
}
