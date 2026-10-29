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
  /** Lettres par seconde pour l'effet machine à écrire. */
  typeSpeed: 45,
};

/** Portrait de dialogue : une seule taille (64 px). Chaque personnage n'a besoin que de `portrait-<nom>-64`. */
export const PORTRAIT_SIZE = 64;

/**
 * Ordre d'affichage. Entre le sol et la pénombre, la profondeur d'un personnage ou d'un objet = y de ses pieds.
 * Toutes les profondeurs fixes sont ici, pour qu'on voie d'un coup d'œil qui passe devant qui.
 */
export const DEPTH = {
  ground: -1,
  decal: -0.9,
  /** Objets posés à plat (tapis, tache de lumière) : sous les personnages. */
  floor: -0.8,
  /** Pénombre des intérieurs, au-dessus de tout le monde. */
  ambient: 90000,
  /** Lueurs (feux, soleil) : par-dessus la pénombre, pour qu'elle ne les éteigne pas. */
  light: 90001,
  /** Invite « touche E » au-dessus d'un objet. */
  prompt: 100000,
};

/** Distance devant les pieds où l'on cherche un objet avec lequel interagir, et rayon de recherche (px). */
export const INTERACT = { reach: 16, radius: 20 };

/**
 * Viser une encoche du tronc couché : Xéros doit être collé au tronc (au plus `gap` px entre sa collision et celle du tronc),
 * tourné vers lui (haut ou bas), et son centre à moins de `align` px de l'encoche (une demi-section : 19 px / 2).
 */
export const NOTCH_AIM = { gap: 3, align: 9.5 };

/** Récolte : tremblement d'un objet frappé, saut des objets lâchés, où ils retombent (px, autour de la base). */
export const HARVEST = {
  shakeMs: 160,
  dropMs: 320,
  dropRadius: [12, 24] as [number, number],
  dropSpacing: 9,
  /** Éclats d'impact : nombre par coup, durée de vie (ms), vitesse (px/s), pesanteur (px/s²). */
  chips: { count: 6, lifespan: 420, speed: [50, 110] as [number, number], gravity: 420 },
};

/** Barre d'objets : durée d'un message court (ms). */
export const HUD = { noticeMs: 1800 };

/** Où commence la partie : Xéros se réveille dans son cagibi. */
export const START = { map: 'maison', spawn: 'reveil' };

export const PLAYER = {
  skin: 'xeros',
  walkSpeed: 100, // px/s, environ 3 tuiles par seconde
  runSpeed: 165,
};

/** Ajouter ?debug à l'URL affiche les boîtes de collision. */
export const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
