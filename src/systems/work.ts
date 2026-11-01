// Un travail au coup (docs/CONCEPTION.md, « Le travail ») : abattre, ébrancher, couper, fendre, tailler. Un travail est une quantité de
// matière (world/workPlan.ts) ; chaque coup en enlève une part, selon son énergie (world/swing.ts : la force de Xéros, la masse et la
// longueur de l'outil), le tranchant, la résistance et la précision. Un appui sur Espace : un coup ; Espace maintenu : les coups
// s'enchaînent jusqu'au résultat. Chaque coup coûte du plafond et du souffle ; pendant le travail le souffle ne revient pas ; vide,
// Xéros s'arrête et souffle, puis reprend tout seul si Espace est toujours tenu. Relâcher Espace, bouger ou Échap arrête après le coup en
// cours ; ce qui est fait reste fait (la part enlevée, dans GameState : `work` de la carte). Les étapes du travail (l'arbre qui
// tremble, la coupe qui se creuse, la fente qui s'allonge) tombent quand la part enlevée passe leurs seuils ; le résultat, au bout. La
// durée n'est imposée nulle part : elle découle des coups et des pauses. Une jauge au-dessus de Xéros montre la part enlevée.
import { gestures, work } from '../content';
import type { Player } from '../entities/Player';
import type { WorkBar } from '../entities/WorkBar';
import { frameMs, type Phase, type Stroke } from '../world/swing';
import { jobStroke, perStroke, planOf, strokeCost, type WorkJobDef } from '../world/workPlan';
import type { EffortSystem } from './effort';

/** Un travail : ce que la scène sait de lui au départ. */
export interface WorkJob {
  /** La matière, l'outil et le coup (world/workPlan.ts). */
  def: WorkJobDef;
  /** La part déjà enlevée, de 0 à 1 (un travail repris). */
  done: number;
  /** Nombre d'étapes (au moins 1) ; la dernière donne le résultat. L'étape k tombe quand la part enlevée passe k / steps. */
  steps: number;
  /** L'étape `k` (de 1 à `steps`) est atteinte : son effet (la dernière, le résultat). */
  step(k: number): void;
  /** Chaque coup qui porte : éclats, l'objet qui tremble. */
  strike(): void;
  /** La part enlevée a changé (au départ, à chaque coup, avant le résultat) : l'étape visible. */
  progress?(done: number): void;
  /** La part enlevée (0 à 1), à écrire dans GameState ; `undefined` : le travail est fini, plus rien à garder. */
  save(done: number | undefined): void;
  /** La cible est-elle toujours là ? */
  valid(): boolean;
  /** Le travail est fini ou arrêté (`why`). */
  end(why: WorkEnd): void;
}

/** Pourquoi un travail se termine : fini, arrêté (relâcher Espace, bouger, Échap), épuisé, la cible partie. */
export type WorkEnd = 'done' | 'stopped' | 'spent' | 'gone';

/** Ce que la scène dit à chaque image : Espace tenu, un arrêt demandé (un pas, Échap). */
export interface WorkInput {
  held: boolean;
  stop: boolean;
}

/**
 * Le travail en cours : `start` le lance (le premier coup part), `update` à chaque image enchaîne ou arrête, `finish` (?dieu) le
 * termine d'un coup, comme s'il avait duré son temps (horloge, endurance et résultat compris).
 */
export class WorkSystem {
  private job?: WorkJob;
  private stroke?: Stroke;
  private per = 0;
  private reached = 0;
  /** Un arrêt est demandé : le coup en cours s'achève, puis le travail s'arrête. */
  private stopping = false;
  /** À bout de souffle : il souffle sur place ; `idle` : entre deux coups. */
  private pausing = false;
  private idle = false;

  constructor(
    private readonly player: Player,
    private readonly effort: EffortSystem,
    private readonly bar: WorkBar,
    /** L'horloge avance d'un coup (Finir le travail). */
    private readonly jump: (minutes: number) => void,
  ) {}

  get active(): boolean {
    return !!this.job;
  }

  /** La part enlevée du travail en cours (0 à 1). */
  get done(): number {
    return this.job?.done ?? 0;
  }

  /** La force d'un coup de Xéros : strength.json, le couple multiplié par sa force (?dieu « force »). */
  private get swinger() {
    const s = this.player.strength;
    return { ...s.swing, torque: s.swing.torque * s.multiplier };
  }

  /** Lance un travail : le premier coup part ; plafond vide, refusé (« épuisé »). */
  start(job: WorkJob): boolean {
    if (this.player.stamina.empty) {
      this.effort.exhausted();
      return false;
    }
    this.job = job;
    job.done = Math.min(1, Math.max(0, job.done));
    this.stroke = jobStroke(job.def, this.swinger);
    this.per = perStroke(job.def, this.stroke) / job.def.amount;
    this.reached = this.stepsAt(job.done);
    this.stopping = this.pausing = this.idle = false;
    this.bar.show(this.player.actor, job.done);
    job.progress?.(job.done);
    this.swing();
    return true;
  }

  /** À chaque image : un arrêt demandé, ou Espace relâché, arrête après le coup en cours ; à bout de souffle, il souffle puis reprend. */
  update(input: WorkInput): void {
    const job = this.job;
    if (!job) return;
    if (!job.valid() && this.reached < job.steps) return this.close('gone');
    if (input.stop || !input.held) this.stopping = true;
    if (this.pausing) {
      // la pause : le souffle revient ; repris s'il est revenu et qu'Espace est toujours tenu, sinon arrêté
      if (this.stopping) return this.close('stopped');
      if (this.idle && !this.player.stamina.winded) {
        this.pausing = this.idle = false;
        this.swing();
      }
      return;
    }
    // pendant le travail, le souffle ne revient pas
    this.player.stamina.busy();
    this.bar.show(this.player.actor, job.done);
  }

  /**
   * ?dieu « Finir le travail » : tous les coups qui restent d'un coup ; l'horloge avance de leur durée (pauses comprises), le plafond en
   * paie le prix, les étapes restantes et le résultat tombent.
   */
  finish(): boolean {
    const job = this.job;
    if (!job) return false;
    this.player.tools.cancel();
    const plan = planOf(job.def, this.swinger, this.player.stamina.max, job.done);
    this.jump(plan.seconds / 60);
    this.player.stamina.force(plan.ceiling);
    job.done = 1;
    job.progress?.(1);
    this.reach(job.steps);
    this.close('done');
    return true;
  }

  /** Nombre d'étapes atteintes à la part `done` : une tous les 1 / steps, la dernière au bout. */
  private stepsAt(done: number): number {
    const job = this.job!;
    if (done >= 1 - 1e-9) return job.steps;
    return Math.min(job.steps - 1, Math.floor(done * job.steps + 1e-9));
  }

  /** Les étapes jusqu'à `k` tombent, dans l'ordre. */
  private reach(k: number): void {
    while (this.reached < k && this.job) {
      this.reached++;
      this.job.step(this.reached);
    }
  }

  /** Un coup : il se paie à l'impact (sinon il souffle, ou s'arrête épuisé), enlève sa part, fait tomber les étapes passées ; puis le suivant. */
  private swing(): void {
    const job = this.job!;
    const s = this.stroke!;
    const phases = gestures[jobGesture(job)]?.phases as Phase[] | undefined;
    const durations = phases ? frameMs(s, phases) : undefined;
    let ended = false;
    this.player.tools.swing(
      jobGesture(job),
      job.def.tool,
      () => {
        if (this.job !== job) return;
        const cost = strokeCost(s);
        const r = this.player.stamina.spendStroke(cost.ceiling, cost.breath);
        if (r === 'winded') {
          // il s'arrête et souffle ; ce coup ne compte pas
          this.pausing = true;
          return;
        }
        if (r === 'exhausted') {
          this.effort.exhausted();
          ended = true;
          return;
        }
        job.strike();
        job.done = Math.min(1, job.done + this.per);
        job.progress?.(job.done);
        const k = this.stepsAt(job.done);
        if (k > this.reached) {
          this.reach(k);
          if (this.job === job && k < job.steps) job.save(job.done);
        }
        if (k >= job.steps) ended = true;
        this.bar.show(this.player.actor, job.done);
      },
      () => {
        if (this.job !== job) return;
        if (ended) return this.close(this.reached >= job.steps ? 'done' : 'spent');
        if (this.pausing) {
          this.idle = true;
          return;
        }
        if (this.stopping) return this.close('stopped');
        this.swing();
      },
      durations,
    );
  }

  private close(why: WorkEnd): void {
    const job = this.job!;
    this.job = undefined;
    this.bar.hide();
    if (why === 'done') job.save(undefined);
    else if (why !== 'gone') job.save(job.done);
    this.player.stamina.flush();
    job.end(why);
  }
}

/** Le geste du corps d'un travail : celui de son coup (work.json, `strokes`). */
const jobGesture = (job: WorkJob): string => work.strokes[job.def.stroke].gesture;
