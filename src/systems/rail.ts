// Une passe sur un rail : Xéros longe une pièce, en ligne droite, en répétant un geste d'outil (la doloire qui dresse une face, plus
// tard le rabot et la scie de long). Un travail au coup (docs/CONCEPTION.md, « Le travail ») : chaque coup avance la face de ce qu'il
// a levé (`advance`), Xéros glisse jusque-là pendant le coup suivant ; lancée de F, la doloire en main, la passe va seule jusqu'au bout ;
// un pas ou Échap l'arrête après le coup en cours, là où il est ; à bout de souffle, il souffle sur place et reprend. Le rail ne sait rien du travail :
// celui qui le lance dit, à chaque coup, ce que le coup fait (et s'il peut se faire), et ce qu'on fait de la passe finie ou arrêtée.
import type { Player } from '../entities/Player';
import type { WorkBar } from '../entities/WorkBar';

/** Pourquoi une passe se termine : arrivée au bout (`end`), arrêtée (`stopped`), un coup refusé (`spent` : épuisé). */
export type RailEnd = 'end' | 'stopped' | 'spent';

/** Une passe : d'où à où vont les pieds de Xéros, le geste répété, ce qu'avance chaque coup, ce que fait chaque coup. */
export interface RailPass {
  /** Les pieds de Xéros au départ et à l'arrivée (px) ; il garde sa direction (tourné vers la pièce). */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Le geste répété (clé de gestures.json), l'outil en main, et la durée de chaque image du geste (ms, world/swing.ts). */
  gesture: string;
  tool: string;
  durations?: number[];
  /** Ce qu'avance la face à chaque coup (px le long du rail) : ce que le coup a levé, rapporté à la section de la face. */
  advance: number;
  /**
   * À l'image d'impact de chaque coup, le fer à `done` px du départ (ce coup compris). Faux : le coup ne se fait pas, la passe s'arrête
   * après lui ; `wait` : faute de souffle, Xéros s'arrête et souffle, puis la passe reprend.
   */
  onStroke(done: number): boolean | 'wait';
  /** ?dieu « Finir le travail » : ce qui reste (`left` px) se fait d'un coup ; l'horloge et l'endurance en sont réglées par la scène. */
  settle(left: number): void;
  /** La passe est finie ou arrêtée, après `done` px. */
  onEnd(why: RailEnd, done: number): void;
}

/** Ce que la scène dit à chaque image : un arrêt demandé (un pas, Échap). */
export interface RailInput {
  stop: boolean;
}

/**
 * Le rail de Xéros : `start` lance une passe (le premier coup part) ; `update`, à chaque image, fait glisser ses pieds vers là où en est
 * le fer (sans physique : le chemin a été jugé libre par celui qui lance), et arrête sur demande, après le coup en cours.
 */
export class Rail {
  private pass?: RailPass;
  /** Pixels où sont les pieds, et où en est le fer (ce que les coups ont avancé). */
  private done = 0;
  private target = 0;
  /** Un coup a été refusé (épuisé) : la passe s'arrête à la fin de ce geste. */
  private spent = false;
  /** Un arrêt est demandé : le coup en cours s'achève, puis la passe s'arrête. */
  private stopping = false;
  /** À bout de souffle : il souffle sur place ; `idle` : entre deux coups. */
  private waiting = false;
  private idle = false;

  constructor(
    private readonly player: Player,
    private readonly bar: WorkBar,
  ) {}

  /** Une passe est en cours. */
  get active(): boolean {
    return !!this.pass;
  }

  /** Lance la passe : Xéros est posé au départ, le premier coup part. */
  start(pass: RailPass): void {
    this.pass = pass;
    this.done = this.target = 0;
    this.spent = this.stopping = this.waiting = this.idle = false;
    this.place();
    this.swing();
  }

  /** À chaque image : les pieds glissent vers le fer ; un pas ou Échap arrête après le coup en cours. */
  update(delta: number, input: RailInput): void {
    const pass = this.pass;
    if (!pass) return;
    if (input.stop) this.stopping = true;
    if (this.waiting) {
      if (this.stopping) return this.finish('stopped');
      // il reprend son souffle sur place, puis le coup suivant
      if (this.idle && !this.player.stamina.winded) {
        this.waiting = this.idle = false;
        this.swing();
      }
      return;
    }
    // pendant le travail, le souffle ne revient pas
    this.player.stamina.busy();
    // les pieds rattrapent le fer en un coup environ
    const cycle = (pass.durations ?? []).reduce((s, v) => s + v, 0) || 1000;
    this.done = Math.min(this.target, this.done + (pass.advance * delta) / cycle);
    this.place();
    this.bar.show(this.player.actor, this.length > 0 ? this.target / this.length : 1);
  }

  /** Longueur de la passe (px). */
  private get length(): number {
    const p = this.pass!;
    return Math.hypot(p.to.x - p.from.x, p.to.y - p.from.y);
  }

  /** Les pieds de Xéros sur la ligne, à `done` px du départ. */
  private place(): void {
    const p = this.pass!;
    const t = this.length > 0 ? this.done / this.length : 1;
    this.player.actor.body.reset(p.from.x + (p.to.x - p.from.x) * t, p.from.y + (p.to.y - p.from.y) * t);
  }

  /** Un coup : à l'impact, il se paie et avance le fer ; puis le suivant, sauf au bout, sur demande d'arrêt, ou épuisé. */
  private swing(): void {
    const pass = this.pass!;
    this.player.tools.swing(
      pass.gesture,
      pass.tool,
      () => {
        if (this.pass !== pass) return;
        const next = Math.min(this.length, this.target + pass.advance);
        const r = pass.onStroke(next);
        if (r === 'wait') this.waiting = true;
        else if (!r) this.spent = true;
        else this.target = next;
      },
      () => {
        if (this.pass !== pass) return;
        if (this.target >= this.length - 1e-6) {
          this.done = this.length;
          this.place();
          return this.finish('end');
        }
        if (this.spent) return this.finish('spent');
        if (this.waiting) {
          this.idle = true;
          return;
        }
        if (this.stopping) return this.finish('stopped');
        this.swing();
      },
      pass.durations,
    );
  }

  /** ?dieu « Finir le travail » : Xéros va au bout de la passe d'un coup (la scène règle l'horloge et l'endurance), et elle se termine. */
  finishNow(): boolean {
    const p = this.pass;
    if (!p) return false;
    this.player.tools.cancel();
    p.settle(this.length - this.target);
    this.done = this.target = this.length;
    this.place();
    this.finish('end');
    return true;
  }

  private finish(why: RailEnd): void {
    const pass = this.pass!;
    // arrêtée : les pieds au fer, là où la face reprendra
    if (why !== 'end' && this.done < this.target) {
      this.done = this.target;
      this.place();
    }
    this.pass = undefined;
    this.bar.hide();
    pass.onEnd(why, this.done);
  }
}
