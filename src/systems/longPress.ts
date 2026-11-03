import type Phaser from 'phaser';
import { pressEnd } from '../input/keyLatch';
import { DEPTH, LONG_PRESS } from '../config';
import type { Player } from '../entities/Player';
import type { Action } from '../world/GameMap';

/** Ce qu'a donné un clic qui attendait sa fin : relâché tôt (le clic court), ou tenu jusqu'au bout (le clic maintenu). */
export type PressEnd = 'short' | 'long';

/** Ce que vise une action, pour savoir si Xéros vise toujours la même chose (les cibles sont refaites à chaque image). */
export function subject(a: Action): unknown {
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
    case 'swing':
      return `build:${a.id}`;
    default:
      return a.prop;
  }
}

/**
 * Un clic qui attend sa fin (docs/COMMANDES.md, « La souris ») : relâché avant `LONG_PRESS.ms`, c'est le clic court (il agit au
 * relâchement : un clic gardé trop longtemps sur un arbre ne lance pas la cognée) ; tenu jusque-là, le clic maintenu. Un seul seuil et
 * une seule jauge pour tous les clics (`LONG_PRESS` de config.ts) : quand le clic maintenu a un sens (`gauge`), la jauge (`ui-gauge`,
 * animation `fill`, de vide à plein) se remplit au-dessus de la tête de Xéros. Si Xéros cesse de viser ce qu'il visait au début du
 * clic (`key`), le clic est abandonné. Ne fait rien lui-même : la scène dit quoi faire du résultat.
 */
export class LongPress {
  private key: unknown;
  private waiting = false;
  private gaugeOn = false;
  private start = 0;
  private readonly gauge: Phaser.GameObjects.Image;
  /** Images de la jauge, de vide à plein. */
  private readonly frames: (string | number)[];

  constructor(
    scene: Phaser.Scene,
    private readonly ms: number = LONG_PRESS.ms,
  ) {
    this.frames = scene.anims.get('ui-gauge-fill').frames.map((f) => f.frame.name);
    this.gauge = scene.add.image(0, 0, 'ui-gauge', this.frames[0]).setOrigin(0.5, 1).setDepth(DEPTH.prompt).setVisible(false);
  }

  /** Un clic attend sa fin. */
  get pending(): boolean {
    return this.waiting;
  }

  /**
   * Le clic commence, en visant `key` (ce que vise Xéros ; undefined : rien). `now` est le temps vrai (`performance.now()`, l'horloge des
   * événements), jamais celui du jeu : un clic est un geste du joueur, il dure autant à toutes les vitesses de simulation. `gauge` : le
   * clic maintenu a un sens, la jauge se montre.
   */
  begin(key: unknown, now: number, gauge: boolean): void {
    this.key = key;
    this.waiting = true;
    this.gaugeOn = gauge;
    this.start = now;
  }

  /** Abandonne le clic en cours (dialogue, changement de carte...). */
  cancel(): void {
    this.waiting = false;
    this.key = undefined;
    this.gauge.setVisible(false);
  }

  /**
   * À appeler à chaque image, avec le temps vrai (`now`, comme pour `begin`) : `down`, le bouton est encore enfoncé ; `key`, ce que vise
   * Xéros maintenant ; `lasted`, la durée vraie du dernier clic fini (src/input/keyLatch.ts : une image longue ne fait pas d'un clic
   * court un clic maintenu). Renvoie la fin du clic quand il se termine, sinon undefined.
   */
  update(now: number, down: boolean, key: unknown, player: Player, lasted?: number): PressEnd | undefined {
    if (!this.waiting) return undefined;
    if (key !== this.key) {
      this.cancel();
      return undefined;
    }
    const end = pressEnd(down, now - this.start, this.ms, lasted);
    if (end) {
      this.cancel();
      return end;
    }
    if (!this.gaugeOn) return undefined;
    const t = (now - this.start) / this.ms;
    const frame = this.frames[Math.min(this.frames.length - 1, Math.floor(t * this.frames.length))];
    this.gauge
      .setFrame(frame)
      .setPosition(Math.round(player.actor.x), Math.round(player.actor.y - LONG_PRESS.above))
      .setVisible(true);
    return undefined;
  }
}
