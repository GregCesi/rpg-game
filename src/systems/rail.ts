// Une passe sur un rail : Xéros longe une pièce tout seul, en ligne droite, au pas, en répétant un geste d'outil en rythme (la
// doloire qui dresse une face, plus tard le rabot et la scie de long). Le joueur ne le dirige pas : seule Échap arrête la passe, là
// où il est. Le rail ne sait rien du travail : celui qui le lance dit, à chaque coup, ce que le coup fait (et s'il peut se faire),
// et ce qu'on fait de la passe finie ou arrêtée.
import type { Player } from '../entities/Player';

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
  /** Pixels faits pendant un geste : la vitesse en découle (un pas par geste, d'un mouvement continu). */
  step: number;
  /** À l'image d'impact de chaque geste, `done` px faits depuis le départ. Faux : le coup ne se fait pas, la passe s'arrête après lui. */
  onStroke(done: number): boolean;
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
  /** Vitesse, en px par ms. */
  private speed = 0;
  /** Un coup a été refusé : la passe s'arrête à la fin de ce geste. */
  private spent = false;

  constructor(private readonly player: Player) {}

  /** Une passe est en cours. */
  get active(): boolean {
    return !!this.pass;
  }

  /** Lance la passe : Xéros est posé au départ, le premier geste commence. */
  start(pass: RailPass): void {
    const { actor } = this.player;
    this.pass = pass;
    this.done = 0;
    this.spent = false;
    const anim = actor.scene.anims.get(`${actor.skin}-${pass.gesture}-${actor.facing}`);
    this.speed = pass.step / Math.max(1, anim?.duration ?? 400);
    this.place();
    this.swing();
  }

  /** À chaque image pendant la passe : Xéros avance ; `stop` (Échap) l'arrête là où il est, le geste interrompu. */
  update(delta: number, stop: boolean): void {
    if (!this.pass) return;
    if (stop) {
      this.player.tools.cancel();
      return this.finish('stopped');
    }
    this.done = Math.min(this.length, this.done + this.speed * delta);
    this.place();
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
        if (this.pass === pass && !pass.onStroke(this.done)) this.spent = true;
      },
      () => {
        if (this.pass !== pass) return;
        if (this.done >= this.length - 1e-6) this.finish('end');
        else if (this.spent) this.finish('spent');
        else this.swing();
      },
    );
  }

  private finish(why: RailEnd): void {
    const pass = this.pass!;
    this.pass = undefined;
    pass.onEnd(why, this.done);
  }
}
