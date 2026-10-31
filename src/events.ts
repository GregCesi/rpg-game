// Événements échangés entre scènes sur le bus du jeu (this.game.events).
// Un événement = une constante ici, jamais une chaîne tapée à la main : une faute de frappe devient une erreur de compilation.
// À l'intérieur d'une scène, pas d'événements : la scène appelle ses systèmes directement, c'est plus facile à suivre.
import type { BuildRef, PileWood, WoodPiece } from './content/types';
import type { Area } from './world/build';
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
  /** Mode construction (?construire) : une commande du catalogue, pour WorldScene (argument : une BuildCommand). */
  Build: 'build',
  /** Mode construction : ce que le catalogue affiche a changé (argument : un BuildStatus). */
  BuildStatus: 'build-status',
} as const;

/**
 * Ce que demande le catalogue du mode construction (src/build/panel.ts) : entrer ou sortir (`toggle`), prendre une pièce
 * (`pick` : ce qu'elle est, son sens, et pour une matière naturelle sa forme et sa taille, au hasard si absentes), prendre un plan
 * du bac à sable (`pick-plan`), choisir une zone à la souris (`select`), n'avoir rien en main (`none` : le clic droit retire encore),
 * enregistrer la zone choisie comme plan (`save-plan` : son nom affiché), annuler, refaire.
 */
export type BuildCommand =
  | { kind: 'toggle' }
  | { kind: 'pick'; piece: BuildRef; view?: number; natural?: { form?: 0 | 1; size?: number } }
  | { kind: 'pick-plan'; plan: string }
  | { kind: 'select' }
  | { kind: 'none' }
  | { kind: 'save-plan'; name: string }
  | { kind: 'undo' }
  | { kind: 'redo' };

/** Ce que montre le catalogue : le mode est-il ouvert, ce qu'on a en main, le cran, la zone choisie, le nombre de pièces posées. */
export interface BuildStatus {
  active: boolean;
  tool: string;
  step: number;
  selection?: Area;
  count: number;
  undo: number;
  redo: number;
}

/**
 * Ce que demande le panneau des outils de test (src/dieu/panel.ts) : donner un objet en main (ce que tenaient les mains
 * disparaît ; un rouleau avec sa longueur, `length` de Held), poser devant Xéros un objet du monde (`length` : sa
 * longueur, s'il en a une) ou un tas (un genre écrit `pile`, ou une pièce de bois `wood` ; `tie` : avec son lien dessous, `count` pouvant alors être 0), aller sur une carte,
 * remettre la carte ou la partie à zéro, apprendre un plan (`learn-plan`), mettre au sol autour de Xéros des piquets ou des pierres
 * plates (`supply` : `what` est la clé d'un objet possédable ou d'un objet du monde), effacer les chantiers de la carte
 * (`erase-sites`), remplir d'un coup l'étape en cours du chantier (`skip-step`), multiplier la force de Xéros (`force` : tester les seuils de masse), régler son endurance (`stamina`, en points) ou la
 * rendre infinie (`stamina-infinite`), poser devant Xéros une pièce de bois de réglages choisis (`wood` : diamètre, longueur sur la
 * grille, forme, faces, sens).
 */
export type DieuCommand =
  | { kind: 'give'; held: Held }
  | { kind: 'prop'; prop: string; length?: number }
  | { kind: 'wood'; wood: WoodPiece }
  | { kind: 'pile'; pile?: string; wood?: PileWood; count: number; turned: boolean; tie: boolean }
  | { kind: 'force'; multiplier: number }
  | { kind: 'stamina'; value: number }
  | { kind: 'stamina-infinite'; on: boolean }
  | { kind: 'learn-plan'; plan: string }
  | { kind: 'supply'; what: string; count: number }
  | { kind: 'erase-sites' }
  | { kind: 'skip-step' }
  | { kind: 'transform'; id: string }
  | { kind: 'map'; map: string }
  | { kind: 'reset-map' }
  | { kind: 'reset-game' };
