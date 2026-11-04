import Phaser from 'phaser';
import { INTERACT } from '../config';
import type { Player } from '../entities/Player';
import type { Action, Interactable } from '../world/GameMap';

/** Ce sur quoi A pose ce qu'on tient (une place de chantier, le billot) ; tout le reste se fait par E, devant Xéros (docs/COMMANDES.md). */
const A_KINDS: readonly Action['kind'][] = ['site-place', 'rest'];

/** L'action se fait par A (poser sur), et non par E (agir sans outil, prendre). */
export const isPutAction = (a: Action): boolean => A_KINDS.includes(a.kind);

/**
 * Repère ce qui est devant Xéros (Player.probe : hors du combat, le curseur n'y compte pas) : pour E, le plus proche de ce qui se fait
 * sans outil (parler, ouvrir, lire, prendre, une place trop lourde : `eTarget`) ; pour A, ce sur quoi il poserait (`putTarget`). Ne sait
 * pas ce que fait la cible : c'est la scène qui décide (world/actionPlan.ts), et systems/keyPrompts.ts montre la touche.
 */
export class InteractionSystem {
  private lockedUntil = 0;
  /** Les cibles de cette image : la liste n'est faite qu'une fois par image, pour E et pour A. */
  private list?: readonly Interactable[];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    /** Les cibles possibles en ce moment : la liste change quand un objet est récolté ou ramassé. */
    private readonly items: () => readonly Interactable[],
  ) {}

  /** À appeler à chaque image. `active` = false pendant un dialogue ou un changement de carte. */
  update(active: boolean): void {
    this.list = active ? this.items() : undefined;
  }

  /** Ce que vise E : le plus proche du point que regarde Xéros, à portée. */
  eTarget(): Interactable | undefined {
    return this.nearest((a) => !isPutAction(a));
  }

  /** Ce sur quoi A poserait (une place de chantier, ce qui accepte un objet tenu). */
  putTarget(): Interactable | undefined {
    return this.nearest(isPutAction);
  }

  /** Les touches sont ignorées en ce moment (juste après un dialogue, un travail). */
  get locked(): boolean {
    return this.scene.time.now < this.lockedUntil;
  }

  /** Ignore les touches pendant `ms` : l'appui qui ferme un dialogue ne doit pas en rouvrir un. */
  lock(ms: number): void {
    this.lockedUntil = this.scene.time.now + ms;
  }

  /** Objet le plus proche du point que vise Xéros, s'il est à portée, parmi ceux que `keep` garde. */
  private nearest(keep: (a: Action) => boolean): Interactable | undefined {
    if (!this.list) return undefined;
    const probe = this.player.probe(INTERACT.reach);
    let best: Interactable | undefined;
    let bestD = INTERACT.radius;
    for (const it of this.list) {
      if (!keep(it.action)) continue;
      const d = Phaser.Math.Distance.Between(probe.x, probe.y, it.x, it.y);
      if (d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }
}
