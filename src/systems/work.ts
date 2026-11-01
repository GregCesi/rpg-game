// Un travail en temps réel (docs/CONCEPTION.md, « Le temps ») : abattre, ébrancher, récolter, couper, fendre, tailler. Il se lance
// d'un appui ; Xéros répète son geste pendant toute la durée réaliste du travail (les `minutes` des données), au rythme du geste :
// le nombre de coups en découle. Les étapes du travail (les `hits` des données : l'arbre qui tremble, la coupe qui se creuse, la fente
// qui s'allonge) tombent à intervalles égaux, chacune sur un coup ; le résultat arrive au dernier. L'endurance se paie au fil du travail,
// coup par coup ; à bout de souffle, Xéros s'arrête et souffle, puis reprend ; plafond vide, le travail s'arrête. Bouger ou Échap
// l'interrompt : ce qui est fait reste fait (la part faite est écrite dans GameState, `work` de la carte). Une jauge au-dessus de Xéros
// montre où il en est. Ne lit pas le clavier : la scène dit quand s'arrêter.
import type { Player } from '../entities/Player';
import type { WorkBar } from '../entities/WorkBar';
import { gameMinutes } from '../world/clock';
import { ClockSystem } from './clock';
import type { EffortSystem } from './effort';

/** Un travail : ce que la scène sait de lui au départ. */
export interface WorkJob {
  /** Le geste répété (clé de gestures.json) et l'outil en main (absent : à mains nues). */
  gesture: string;
  tool?: string;
  /** Durée réaliste du travail entier, en minutes de jeu. */
  minutes: number;
  /** Nombre d'étapes (au moins 1) ; la dernière donne le résultat. */
  steps: number;
  /** Minutes déjà faites (un travail repris là où il s'était arrêté). */
  done: number;
  /** Prix du travail entier en endurance (points du plafond), payé au fil des coups. */
  cost: number;
  /** L'étape `k` (de 1 à `steps`) est atteinte : son effet (la dernière, le résultat). */
  step(k: number): void;
  /** Chaque coup qui porte : éclats, l'objet qui tremble. */
  strike(): void;
  /** La part faite (minutes), à écrire dans GameState ; `undefined` : le travail est fini, plus rien à garder. */
  save(minutes: number | undefined): void;
  /** La cible est-elle toujours là ? */
  valid(): boolean;
  /** Le travail est fini ou arrêté (`why`). */
  end(why: WorkEnd): void;
}

/** Pourquoi un travail se termine : fini, arrêté (bouger, Échap), épuisé, la cible partie. */
export type WorkEnd = 'done' | 'stopped' | 'spent' | 'gone';

/** Tous les combien de ms jouées la part faite s'écrit, en plus des étapes et de l'arrêt (une page fermée en plein travail). */
const SAVE_EVERY_MS = 10000;

/**
 * Le travail en cours : `start` le lance, `update` à chaque image le fait avancer et l'arrête sur demande, `finish` (?dieu) le termine
 * d'un coup, comme s'il avait duré son temps (horloge, endurance et résultat compris).
 */
export class WorkSystem {
  private job?: WorkJob;
  /** Minutes faites depuis le début du travail (reprise comprise). */
  private done = 0;
  /** Minutes déjà payées en endurance. */
  private paid = 0;
  /** Étapes déjà atteintes. */
  private reached = 0;
  /** À bout de souffle : il attend sans avancer ; `idle` : le geste en cours est fini, le suivant attend. */
  private waiting = false;
  private idle = false;
  /** Le dernier coup est donné : le travail finit avec ce geste. */
  private last = false;
  private sinceSave = 0;

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

  /** Lance un travail : rien n'est payé avant le premier coup ; plafond vide, refusé (« épuisé »). */
  start(job: WorkJob): boolean {
    if (this.player.stamina.empty) {
      this.effort.exhausted();
      return false;
    }
    this.job = job;
    this.done = Math.min(job.minutes, Math.max(0, job.done));
    this.paid = this.done;
    this.reached = this.stepsAt(this.done);
    this.waiting = this.idle = this.last = false;
    this.sinceSave = 0;
    this.bar.show(this.player.actor, this.fraction);
    this.swing();
    return true;
  }

  /** À chaque image : le temps du travail avance (à la vitesse du temps) ; `stop` (bouger, Échap) l'interrompt, ce qui est fait reste. */
  update(delta: number, stop: boolean): void {
    const job = this.job;
    if (!job) return;
    // le dernier coup a pu changer la cible (l'arbre devenu souche) : le geste s'achève
    if (!this.last && !job.valid()) return this.close('gone');
    if (stop) {
      this.player.tools.cancel();
      return this.close('stopped');
    }
    if (this.waiting) {
      // il reprend son souffle sur place, puis le geste suivant
      if (this.idle && !this.player.stamina.winded) {
        this.waiting = this.idle = false;
        this.swing();
      }
      return;
    }
    if (this.last) return;
    this.done = Math.min(job.minutes, this.done + gameMinutes(delta, ClockSystem.speed));
    this.sinceSave += delta;
    if (this.sinceSave >= SAVE_EVERY_MS) {
      this.sinceSave = 0;
      job.save(this.paid);
    }
    this.bar.show(this.player.actor, this.fraction);
  }

  /**
   * ?dieu « Finir le travail » : ce qui reste se fait d'un coup ; l'horloge avance de ce qui manquait, l'endurance en paie le prix (sans
   * attendre son souffle), les étapes restantes et le résultat tombent.
   */
  finish(): boolean {
    const job = this.job;
    if (!job) return false;
    this.player.tools.cancel();
    this.jump(job.minutes - this.done);
    this.player.stamina.force(this.costOf(job.minutes - this.paid));
    this.done = this.paid = job.minutes;
    this.reach(job.steps);
    this.close('done');
    return true;
  }

  private get fraction(): number {
    return this.job && this.job.minutes > 0 ? this.done / this.job.minutes : 1;
  }

  /** Prix en endurance de `minutes` de ce travail. */
  private costOf(minutes: number): number {
    const job = this.job!;
    return job.minutes > 0 ? (job.cost * Math.max(0, minutes)) / job.minutes : 0;
  }

  /** Nombre d'étapes atteintes après `minutes` faites : une tous les `minutes / steps`, la dernière au bout. */
  private stepsAt(minutes: number): number {
    const job = this.job!;
    if (minutes >= job.minutes - 1e-9) return job.steps;
    return Math.min(job.steps - 1, Math.floor((minutes / job.minutes) * job.steps + 1e-9));
  }

  /** Les étapes jusqu'à `k` tombent, dans l'ordre. */
  private reach(k: number): void {
    while (this.reached < k && this.job) {
      this.reached++;
      this.job.step(this.reached);
    }
  }

  /** Un geste : à l'impact, le coup se paie et porte, les étapes passées tombent ; puis le suivant, sauf au bout. */
  private swing(): void {
    const job = this.job!;
    this.player.tools.swing(
      job.gesture,
      job.tool,
      () => {
        if (this.job !== job) return;
        const r = this.effort.attempt(this.player, this.costOf(this.done - this.paid));
        if (r === 'winded') {
          // le temps de ce geste ne compte pas : il le refera, son souffle revenu
          this.done = this.paid;
          this.waiting = true;
          return;
        }
        if (r === 'exhausted') {
          this.last = true;
          return;
        }
        this.paid = this.done;
        job.strike();
        const k = this.stepsAt(this.done);
        if (k > this.reached) {
          this.reach(k);
          if (this.job === job) job.save(k >= job.steps ? undefined : this.done);
        }
        if (k >= job.steps) this.last = true;
      },
      () => {
        if (this.job !== job) return;
        if (this.last) return this.close(this.reached >= job.steps ? 'done' : 'spent');
        if (this.waiting) this.idle = true;
        else this.swing();
      },
    );
  }

  private close(why: WorkEnd): void {
    const job = this.job!;
    this.job = undefined;
    this.bar.hide();
    if (why === 'done') job.save(undefined);
    else if (why !== 'gone') job.save(this.paid);
    this.player.stamina.flush();
    job.end(why);
  }
}
