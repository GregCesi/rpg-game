// Une passe sur un rail : Xéros longe une pièce tout seul, en ligne droite, au pas, en répétant un geste d'outil en rythme (la
// doloire qui dresse une face, plus tard le rabot et la scie de long). Le joueur ne le dirige pas : seule Échap arrête la passe, là
// où il est ; à bout de souffle, il attend sur place et reprend. Le rail ne sait rien du travail : celui qui le lance dit, à chaque coup, ce que le coup fait (et s'il peut se faire),
// et ce qu'on fait de la passe finie ou arrêtée.
import type { Player } from '../entities/Player';
import type { WorkBar } from '../entities/WorkBar';
import { gameMinutes } from '../world/clock';
import { ClockSystem } from './clock';

/** Pourquoi une passe se termine : arrivée au bout (`end`), arrêtée par Échap (`stopped`), un coup refusé (`spent` : épuisé). */
export type RailEnd = 'end' | 'stopped' | 'spent';

/** Une passe : d'où à où vont les pieds de Xéros, le geste répété, le pas fait à chaque geste, ce que fait chaque coup. */
export interface RailPass {
  /** Les pieds de Xéros au départ et à l'arrivée (px) ; il garde sa direction (tourné vers la pièce). */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Le geste répété (clé de gestures.json) et l'outil en main. */
  gesture: string;
  tool: string;
  /**
   * Durée réaliste de la passe entière, en minutes de jeu (docs/CONCEPTION.md, « Le temps ») : Xéros avance d'un mouvement continu à la
   * vitesse qui en découle, et répète son geste tout du long.
   */
  minutes: number;
  /**
   * À l'image d'impact de chaque geste, `done` px faits depuis le départ. Faux : le coup ne se fait pas, la passe s'arrête après lui ;
   * `wait` : le coup ne se fait pas faute de souffle, Xéros attend sur place, puis la passe reprend quand il n'est plus essoufflé.
   */
  onStroke(done: number): boolean | 'wait';
  /** La passe est finie ou arrêtée, après `done` px. */
  onEnd(why: RailEnd, done: number): void;
}

/**
 * Le rail de Xéros : `start` lance une passe ; `update`, à chaque image, le fait avancer (ses pieds posés sur la ligne, sans
 * physique : le chemin a été jugé libre par celui qui lance) et arrête tout sur Échap. Le geste se rejoue tant qu'il n'est pas au
 * bout ; arrivé, le geste en cours s'achève, puis la passe se termine.
 */
export class Rail {
  private pass?: RailPass;
  /** Pixels faits depuis le départ. */
  private done = 0;
  /** La passe se termine d'un coup (?dieu « Finir le travail ») : ce qui reste se paie sans attendre son souffle. */
  forced = false;
  /** Un coup a été refusé : la passe s'arrête à la fin de ce geste. */
  private spent = false;
  /** Un coup a attendu son souffle : Xéros reste sur place jusqu'à ce qu'il ne soit plus essoufflé. */
  private waiting = false;
  /** Le geste est fini et la passe attend son souffle pour le suivant. */
  private idle = false;

  constructor(
    private readonly player: Player,
    private readonly bar: WorkBar,
    /** L'horloge avance d'un coup (Finir le travail). */
    private readonly jump: (minutes: number) => void,
  ) {}

  /** Une passe est en cours. */
  get active(): boolean {
    return !!this.pass;
  }

  /** Lance la passe : Xéros est posé au départ, le premier geste commence. */
  start(pass: RailPass): void {
    this.pass = pass;
    this.done = 0;
    this.spent = false;
    this.waiting = false;
    this.idle = false;
    this.forced = false;
    this.place();
    this.swing();
  }

  /** À chaque image pendant la passe : Xéros avance ; `stop` (bouger, Échap) l'arrête là où il est, le geste interrompu. */
  update(delta: number, stop: boolean): void {
    if (!this.pass) return;
    if (stop) {
      this.player.tools.cancel();
      return this.finish('stopped');
    }
    if (this.waiting) {
      // il reprend son souffle sur place, puis le geste suivant
      if (this.idle && !this.player.stamina.winded) {
        this.waiting = this.idle = false;
        this.swing();
      }
      return;
    }
    const p = this.pass;
    this.done = Math.min(this.length, this.done + (this.length * gameMinutes(delta, ClockSystem.speed)) / Math.max(1e-6, p.minutes));
    this.place();
    this.bar.show(this.player.actor, this.length > 0 ? this.done / this.length : 1);
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

  /** Un geste : le coup à l'impact, puis le suivant, sauf au bout ou après un coup refusé. */
  private swing(): void {
    const pass = this.pass!;
    this.player.tools.swing(
      pass.gesture,
      pass.tool,
      () => {
        if (this.pass !== pass) return;
        const r = pass.onStroke(this.done);
        if (r === 'wait') this.waiting = true;
        else if (!r) this.spent = true;
      },
      () => {
        if (this.pass !== pass) return;
        if (this.done >= this.length - 1e-6) this.finish('end');
        else if (this.spent) this.finish('spent');
        else if (this.waiting) this.idle = true;
        else this.swing();
      },
    );
  }

  /**
   * ?dieu « Finir le travail » : Xéros va au bout de la passe d'un coup ; l'horloge avance de ce qui manquait, ce qui reste se paie
   * (sans attendre son souffle) et la passe se termine comme arrivée au bout.
   */
  finishNow(): boolean {
    const p = this.pass;
    if (!p) return false;
    this.player.tools.cancel();
    this.jump(this.length > 0 ? (p.minutes * (this.length - this.done)) / this.length : 0);
    this.done = this.length;
    this.place();
    this.forced = true;
    this.finish('end');
    this.forced = false;
    return true;
  }

  private finish(why: RailEnd): void {
    const pass = this.pass!;
    this.pass = undefined;
    this.bar.hide();
    pass.onEnd(why, this.done);
  }
}
