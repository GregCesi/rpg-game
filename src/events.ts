// Événements échangés entre scènes sur le bus du jeu (this.game.events).
// Un événement = une constante ici, jamais une chaîne tapée à la main : une faute de frappe devient une erreur de compilation.
// À l'intérieur d'une scène, pas d'événements : la scène appelle ses systèmes directement, c'est plus facile à suivre.
import type { BuildRef, Gait, JointType, PileWood, WoodAge, WoodPiece } from './content/types';
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
  /**
   * Ce que feraient les deux clics sur ce qui est visé (argument : `{ left, right }` de ClickPlan, world/clickAction.ts ; undefined hors du
   * jeu) : le HUD l'écrit au-dessus des mains. Émis à chaque image par WorldScene.
   */
  ClickPlans: 'click-plans',
  /**
   * La case du monde où est Xéros, et son sens (argument : `PlayerCell`, ou undefined hors du monde) : la petite carte du HUD se
   * centre sur elle (systems/minimap.ts). Dedans, la case du dehors (le décalage de l'intérieur ôté). Émis par WorldScene quand la
   * case ou le sens change, pour que le HUD ne lise jamais la scène du monde.
   */
  PlayerCell: 'player-cell',
} as const;

/** La case du monde (en cases de 1,60 m, world/minimap.ts) où sont les pieds de Xéros, et le sens où il regarde. */
export interface PlayerCell {
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
}

/**
 * Ce que demande le catalogue du mode construction (src/build/panel.ts) : entrer ou sortir (`toggle`), prendre une pièce
 * (`pick` : ce qu'elle est, son sens, et pour une matière naturelle sa forme et sa taille, au hasard si absentes), prendre un plan
 * du bac à sable (`pick-plan`), prendre un assemblage (`pick-joint` : on le pose sur la jonction de deux pièces), choisir une zone à la souris (`select`), n'avoir rien en main (`none` : le clic droit retire encore),
 * régler l'âge du bois des pièces qu'on pose (`age` : la pièce de bois et les objets de bois `aged` le prennent ; un plan qui fixe le sien l'emporte),
 * enregistrer la zone choisie comme plan (`save-plan` : son nom affiché), annuler, refaire.
 */
export type BuildCommand =
  | { kind: 'toggle' }
  | { kind: 'pick'; piece: BuildRef; view?: number; natural?: { form?: 0 | 1; size?: number } }
  | { kind: 'pick-plan'; plan: string }
  | { kind: 'pick-joint'; joint: JointType }
  | { kind: 'select' }
  | { kind: 'none' }
  | { kind: 'age'; age: WoodAge }
  | { kind: 'save-plan'; name: string }
  | { kind: 'undo' }
  | { kind: 'redo' };

/** Ce que montre le catalogue : le mode est-il ouvert, ce qu'on a en main, le cran, la zone choisie, le nombre de pièces posées. */
export interface BuildStatus {
  active: boolean;
  tool: string;
  /** L'âge du bois des pièces qu'on pose. */
  age: WoodAge;
  step: number;
  selection?: Area;
  count: number;
  undo: number;
  redo: number;
  /** Ce que dit la visée d'un assemblage : il va, ou pourquoi pas. */
  hint?: string;
}

/**
 * Ce que demande le panneau des outils de test (src/dieu/panel.ts) : donner un objet en main (ce que tenaient les mains
 * disparaît ; un rouleau avec sa longueur, `length` de Held), poser devant Xéros un objet du monde (`length` : sa
 * longueur, s'il en a une) ou un tas (un genre écrit `pile`, ou une pièce de bois `wood` ; `tie` : avec son lien dessous, `count` pouvant alors être 0), aller sur une carte,
 * remettre la carte ou la partie à zéro, apprendre un plan (`learn-plan`), mettre au sol autour de Xéros des piquets ou des pierres
 * plates (`supply` : `what` est la clé d'un objet possédable ou d'un objet du monde), effacer les chantiers de la carte
 * (`erase-sites`), remplir d'un coup l'étape en cours du chantier (`skip-step`), multiplier la force de Xéros (`force` : tester les seuils de masse), régler son endurance (`stamina` : souffle, plafond du jour, maximum, en points) ou la
 * rendre infinie (`stamina-infinite`), avancer l'horloge jusqu'à une heure (`clock` : la prochaine fois qu'elle sonne), finir d'un coup le travail en cours (`finish-work` : horloge, endurance et résultat compris), remettre l'endurance de départ (`stamina-start`), régler les vitesses de marche et de course (`speeds`, en m/s, et la part de la marche discrète `sneak` ; chargé ou fatigué, une part de la marche ; `speeds-default` : celles par défaut), la vitesse de simulation (`sim-speed` : x1 à x50, tout à l'écran plus vite, par pas de taille normale), poser devant Xéros une pièce de bois de réglages choisis (`wood` : diamètre, longueur sur la
 * grille, forme, faces, sens) ; les créatures (CONCEPTION « Les créatures ») : faire sortir une bête de la garenne la plus proche à 3 m de
 * Xéros (`creature-spawn`), régler le nombre de bêtes de cette garenne (`creature-population`), régler les distances de perception d'une
 * espèce à une allure (`creature-senses`, en m, le temps de la session : les données de creatures.json en mémoire), montrer autour de Xéros
 * les deux cercles de son allure (`creature-rings`).
 */
export type DieuCommand =
  | { kind: 'give'; held: Held }
  | { kind: 'prop'; prop: string; length?: number }
  | { kind: 'wood'; wood: WoodPiece }
  | { kind: 'pile'; pile?: string; wood?: PileWood; count: number; turned: boolean; tie: boolean }
  | { kind: 'force'; multiplier: number }
  | { kind: 'stamina'; breath?: number; ceiling?: number; max?: number }
  | { kind: 'stamina-infinite'; on: boolean }
  | { kind: 'clock'; hour: number }
  | { kind: 'finish-work' }
  | { kind: 'stamina-start' }
  | { kind: 'speeds'; walk: number; run: number; sneak?: number }
  | { kind: 'speeds-default' }
  | { kind: 'sim-speed'; factor: number }
  | { kind: 'learn-plan'; plan: string }
  | { kind: 'supply'; what: string; count: number }
  | { kind: 'erase-sites' }
  | { kind: 'skip-step' }
  | { kind: 'transform'; id: string }
  | { kind: 'map'; map: string }
  | { kind: 'reset-map' }
  | { kind: 'reset-game' }
  | { kind: 'creature-spawn' }
  | { kind: 'creature-population'; count: number }
  | { kind: 'creature-senses'; creature: string; gait: Gait; alert: number; flee: number }
  | { kind: 'creature-rings'; on: boolean };
