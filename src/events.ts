// Événements échangés entre scènes sur le bus du jeu (this.game.events).
// Un événement = une constante ici, jamais une chaîne tapée à la main : une faute de frappe devient une erreur de compilation.
// À l'intérieur d'une scène, pas d'événements : la scène appelle ses systèmes directement, c'est plus facile à suivre.
import type { Held } from './state';

export const GameEvent = {
  /** Le dialogue en cours vient de se fermer. */
  DialogueEnd: 'dialogue-end',
  /** Ce que tiennent les mains, ou la main active, a changé (prendre, lâcher, poser, Tab) : les deux cases se redessinent. */
  HandsChanged: 'hands-changed',
  /** Message court à afficher au-dessus des mains (argument : le texte). Ex. l'outil manque. */
  Notice: 'notice',
  /** Outils de test (?dieu) : une commande du panneau, pour WorldScene (argument : une DieuCommand). */
  Dieu: 'dieu',
} as const;

/**
 * Ce que demande le panneau des outils de test (src/dieu/panel.ts) : donner un objet en main (ce que tenaient les mains
 * disparaît), poser devant Xéros un objet du monde ou un tas, aller sur une carte, remettre la carte ou la partie à zéro.
 */
export type DieuCommand =
  | { kind: 'give'; held: Held }
  | { kind: 'prop'; prop: string }
  | { kind: 'pile'; pile: string; count: number; turned: boolean }
  | { kind: 'map'; map: string }
  | { kind: 'reset-map' }
  | { kind: 'reset-game' };
