import type Phaser from 'phaser';
import { DEPTH, LONG_PRESS } from '../config';
import type { Player } from '../entities/Player';
import type { Action, Interactable } from '../world/GameMap';

/** Ce qu'a donné un appui sur E qui attendait : relâché tôt (le geste court), ou tenu jusqu'au bout (le geste long). */
export type PressResult = { kind: 'short' | 'long'; target: Interactable };

/** Ce que vise une action, pour savoir si Xéros vise toujours la même chose (les cibles sont refaites à chaque image). */
function subject(a: Action): unknown {
  switch (a.kind) {
    case 'pile':
    case 'tie':
      return a.pile;
    case 'pickup':
      return a.ground;
    case 'talk':
      return a.npc ?? a.dialogue;
    case 'stake':
      return `${a.site}:${a.corner}`;
    case 'site-place':
    case 'site-help':
      return `${a.site}:${a.place}`;
    default:
      return a.prop;
  }
}

/**
 * E maintenu. Devant une cible où E maintenu a un sens (nouer, dénouer : systems/knot.ts), l'appui attend : relâché avant
 * `LONG_PRESS.ms`, c'est le geste court (reprendre une pièce) ; tenu jusque-là, le geste long. Pendant l'attente, une
 * jauge (`ui-gauge`, animation `fill`, de vide à plein) se remplit au-dessus de la tête de Xéros. Si Xéros cesse de
 * viser la cible, l'appui est abandonné. Ne fait rien lui-même : la scène dit quoi faire du résultat.
 */
export class LongPress {
  private target?: Interactable;
  private start = 0;
  private readonly gauge: Phaser.GameObjects.Image;
  /** Images de la jauge, de vide à plein. */
  private readonly frames: (string | number)[];

  /** `ms` : durée de l'appui (par défaut celle d'E maintenu, `LONG_PRESS`). */
  constructor(
    scene: Phaser.Scene,
    private readonly ms: number = LONG_PRESS.ms,
  ) {
    this.frames = scene.anims.get('ui-gauge-fill').frames.map((f) => f.frame.name);
    this.gauge = scene.add.image(0, 0, 'ui-gauge', this.frames[0]).setOrigin(0.5, 1).setDepth(DEPTH.prompt).setVisible(false);
  }

  /** Un appui attend sa fin. */
  get pending(): boolean {
    return !!this.target;
  }

  /** E vient d'être pressé devant `target` : l'appui commence. */
  begin(target: Interactable, time: number): void {
    this.target = target;
    this.start = time;
  }

  /** Abandonne l'appui en cours (dialogue, changement de carte...). */
  cancel(): void {
    this.target = undefined;
    this.gauge.setVisible(false);
  }

  /**
   * À appeler à chaque image : `down`, E est encore enfoncé ; `current`, ce que Xéros vise maintenant. Renvoie le geste
   * à faire quand l'appui se termine, sinon undefined.
   */
  update(time: number, down: boolean, current: Interactable | undefined, player: Player): PressResult | undefined {
    const target = this.target;
    if (!target) return undefined;
    if (!current || subject(current.action) !== subject(target.action)) {
      this.cancel();
      return undefined;
    }
    const t = (time - this.start) / this.ms;
    if (!down || t >= 1) {
      this.cancel();
      return { kind: t >= 1 ? 'long' : 'short', target };
    }
    const frame = this.frames[Math.min(this.frames.length - 1, Math.floor(t * this.frames.length))];
    this.gauge
      .setFrame(frame)
      .setPosition(Math.round(player.actor.x), Math.round(player.actor.y - LONG_PRESS.above))
      .setVisible(true);
    return undefined;
  }
}
