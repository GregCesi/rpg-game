// Constantes globales. Tout ce qui est réglage de gameplay passe par ici.

export const TILE = 32;

/** Zone visible en pixels du monde : 20 x 11 tuiles. */
export const VIEW = { width: 640, height: 360 };

/**
 * Le canvas est rendu à VIEW x ZOOM et les caméras zooment d'autant : le pixel art garde sa taille,
 * mais le texte des dialogues est rendu à pleine résolution, donc net.
 */
export const ZOOM = 2;

export const UI = {
  font: '"Pixelify Sans", monospace',
  ink: '#3b2a1c',
  inkSoft: '#7a6646',
  /** Lettres par seconde pour l'effet machine à écrire. */
  typeSpeed: 45,
};

/** Tailles de portrait comparées en jeu (touche P pendant un dialogue). La première est celle par défaut. */
export const PORTRAIT_MODES = [
  { size: 96, scale: 1 },
  { size: 64, scale: 1 },
  { size: 64, scale: 2 },
];

/** Distance devant les pieds où l'on cherche un objet avec lequel interagir, et rayon de recherche (px). */
export const INTERACT = { reach: 16, radius: 20 };

export const PLAYER = {
  skin: 'xeros',
  walkSpeed: 100, // px/s, environ 3 tuiles par seconde
  runSpeed: 165,
};

/** Ajouter ?debug à l'URL affiche les boîtes de collision. */
export const DEBUG = new URLSearchParams(location.search).has('debug');
