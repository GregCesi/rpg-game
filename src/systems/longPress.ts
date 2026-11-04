import { pressEnd } from '../input/keyLatch';
import { LONG_PRESS } from '../config';
import type { Action } from '../world/GameMap';

/** Ce qu'a donné un appui qui attendait sa fin : relâché tôt (l'appui court), ou tenu jusqu'au bout (l'appui maintenu). */
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
 * Un appui qui attend sa fin (E maintenu, un clic qu'on garde pour lancer ; docs/COMMANDES.md) : relâché avant `LONG_PRESS.ms`, c'est
 * l'appui court (il agit au relâchement : un clic gardé un peu longtemps ne lance pas) ; tenu jusque-là, l'appui maintenu. Un seul
 * seuil (`LONG_PRESS` de config.ts). Si Xéros cesse de viser ce qu'il visait au début de l'appui (`key`), l'appui est abandonné. Ne
 * dessine rien : `progress` dit où il en est (la touche E qui se remplit d'or, systems/keyPrompts.ts) ; la scène dit quoi faire du
 * résultat.
 */
export class LongPress {
  private key: unknown;
  private waiting = false;
  private start = 0;

  constructor(private readonly ms: number = LONG_PRESS.ms) {}

  /** Un appui attend sa fin. */
  get pending(): boolean {
    return this.waiting;
  }

  /**
   * L'appui commence, en visant `key` (ce que vise Xéros ; undefined : rien). `now` est le temps vrai (`performance.now()`, l'horloge
   * des événements), jamais celui du jeu : un appui est un geste du joueur, il dure autant à toutes les vitesses de simulation.
   */
  begin(key: unknown, now: number): void {
    this.key = key;
    this.waiting = true;
    this.start = now;
  }

  /** Abandonne l'appui en cours (dialogue, changement de carte...). */
  cancel(): void {
    this.waiting = false;
    this.key = undefined;
  }

  /** Où en est l'appui en cours, de 0 (il commence) à 1 (le seuil), au temps vrai `now` ; undefined sans appui. */
  progress(now: number): number | undefined {
    return this.waiting ? Math.min(1, Math.max(0, (now - this.start) / this.ms)) : undefined;
  }

  /**
   * À appeler à chaque image, avec le temps vrai (`now`, comme pour `begin`) : `down`, la touche est encore enfoncée ; `key`, ce que
   * vise Xéros maintenant ; `lasted`, la durée vraie du dernier appui fini (src/input/keyLatch.ts : une image longue ne fait pas d'un
   * appui court un appui maintenu). Renvoie la fin de l'appui quand il se termine, sinon undefined.
   */
  update(now: number, down: boolean, key: unknown, lasted?: number): PressEnd | undefined {
    if (!this.waiting) return undefined;
    if (key !== this.key) {
      this.cancel();
      return undefined;
    }
    const end = pressEnd(down, now - this.start, this.ms, lasted);
    if (end) this.cancel();
    return end;
  }
}
