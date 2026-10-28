// Constantes globales. Tout ce qui est réglage de gameplay passe par ici.

export const TILE = 32;

/** Résolution interne du jeu (agrandie à l'écran sans flou). 20 x 11 tuiles visibles. */
export const VIEW = { width: 640, height: 360 };

export const PLAYER = {
  skin: 'xeros',
  walkSpeed: 100, // px/s, environ 3 tuiles par seconde
  runSpeed: 165,
};

/** Ajouter ?debug à l'URL affiche les boîtes de collision. */
export const DEBUG = new URLSearchParams(location.search).has('debug');
