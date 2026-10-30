// Événements échangés entre scènes sur le bus du jeu (this.game.events).
// Un événement = une constante ici, jamais une chaîne tapée à la main : une faute de frappe devient une erreur de compilation.
// À l'intérieur d'une scène, pas d'événements : la scène appelle ses systèmes directement, c'est plus facile à suivre.
import type { Held } from './state';

export const GameEvent = {
  /** Le dialogue en cours vient de se fermer (argument : l'action du choix pris, s'il y en a une : `DialogueAction`). */
  DialogueEnd: 'dialogue-end',
  /** Ce que tiennent les mains, ou la main active, a changé (prendre, lâcher, poser, Tab) : les deux cases se redessinent. */
  HandsChanged: 'hands-changed',
  /** L'endurance a changé (argument : la part restante, de 0 à 1). */
  Stamina: 'stamina',
  /** Un effort a été refusé, Xéros étant épuisé : la jauge tremble. */
  StaminaDenied: 'stamina-denied',
  /** Message court à afficher au-dessus des mains (argument : le texte). Ex. l'outil manque. */
  Notice: 'notice',
  /** Outils de test (?dieu) : une commande du panneau, pour WorldScene (argument : une DieuCommand). */
  Dieu: 'dieu',
} as const;

/**
 * Ce que demande le panneau des outils de test (src/dieu/panel.ts) : donner un objet en main (ce que tenaient les mains
 * disparaît ; un rouleau avec sa longueur, `length` de Held), poser devant Xéros un objet du monde (`length` : sa
 * longueur, s'il en a une) ou un tas (`tie` : avec son lien dessous, `count` pouvant alors être 0), aller sur une carte,
 * remettre la carte ou la partie à zéro, multiplier la force de Xéros (`force` : tester les seuils de masse), régler son endurance (`stamina`, en points) ou la
 * rendre infinie (`stamina-infinite`).
 */
export type DieuCommand =
  | { kind: 'give'; held: Held }
  | { kind: 'prop'; prop: string; length?: number }
  | { kind: 'pile'; pile: string; count: number; turned: boolean; tie: boolean }
  | { kind: 'force'; multiplier: number }
  | { kind: 'stamina'; value: number }
  | { kind: 'stamina-infinite'; on: boolean }
  | { kind: 'map'; map: string }
  | { kind: 'reset-map' }
  | { kind: 'reset-game' };
