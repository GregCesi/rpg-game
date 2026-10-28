// Événements échangés entre scènes sur le bus du jeu (this.game.events).
// Un événement = une constante ici, jamais une chaîne tapée à la main : une faute de frappe devient une erreur de compilation.
// À l'intérieur d'une scène, pas d'événements : la scène appelle ses systèmes directement, c'est plus facile à suivre.

export const GameEvent = {
  /** Le dialogue en cours vient de se fermer. */
  DialogueEnd: 'dialogue-end',
} as const;
