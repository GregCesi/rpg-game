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
  /** Ombres portées des toits : sur le sol et ce qui y est posé à plat, sous les poteaux et les personnages. */
  shadow: -0.7,
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
 * E maintenu (nouer, dénouer) : durée de l'appui (ms) ; avant, relâcher E fait le geste court (reprendre une pièce).
 * La jauge (`ui-gauge`) se remplit au-dessus de la tête de Xéros, `above` px au-dessus de ses pieds (bas de la jauge).
 */
export const LONG_PRESS = { ms: 500, above: 35 };

/** R maintenu (pivoter une bille couchée, systems/turnLog.ts) : durée de l'appui (ms), avec la même jauge que pour nouer. */
export const TURN_PRESS = { ms: 1000 };

/** Nombre de pièces d'un tas (`count` de piles.json) : affiché quand les pieds de Xéros sont à moins de `near` px du tas au sol. */
export const PILE_COUNT = { near: 12 };

/**
 * Toits (pièces `roof` de props.json : chevrons, toit de planches) : opacité quand Xéros est dessous ou caché derrière, et durée
 * du fondu (ms) pour aller d'opaque à cette opacité.
 */
export const ROOF = { alpha: 0.35, fadeMs: 250 };

/**
 * Ombre portée d'un toit (`shadow` de props.json) : la lumière vient du nord-ouest, d'en haut (docs/STYLE.md section 2) ;
 * un point à z px de haut tombe au sol décalé de z × `dx` vers l'est et z × `dy` vers le sud. Couleur et opacité : celles
 * de l'ombre portée des sprites (`x` de la palette, #2b1a10 à 0x40).
 */
export const SHADOW = { dx: 0.25, dy: 0.1, color: 0x2b1a10, alpha: 0x40 / 255 };

/** Poser devant soi : écart entre la collision de Xéros et ce qu'il pose (px). */
export const PUT_DOWN = { gap: 2 };

/**
 * Viser une encoche du tronc couché : Xéros doit être collé au tronc (au plus `gap` px entre sa collision et celle du tronc),
 * tourné vers lui (haut ou bas), et le fer à l'impact à moins de `align` px de l'encoche (une demi-section : 19 px / 2).
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

/** Les mains à l'écran : durée d'un message court (ms), et d'un message important (sauvegarde refusée). */
export const HUD = { noticeMs: 1800, longNoticeMs: 7000 };

/** Où commence la partie : Xéros se réveille dans son cagibi. */
export const START = { map: 'maison', spawn: 'reveil' };

export const PLAYER = {
  skin: 'xeros',
  walkSpeed: 100, // px/s, environ 3 tuiles par seconde
  runSpeed: 165,
  /**
   * Cadence de référence de la marche portée (`carry-walk-*`, dessinée pour environ 55 px/s) : l'animation s'accélère ou
   * ralentit avec la vitesse réelle, qui dépend de la masse portée (`entities/Strength.ts`, strength.json).
   */
  carrySpeed: 55,
};

/**
 * Faire rouler une bille (systems/roll.ts) : il faut pousser `startMs` ms sans lâcher avant qu'elle ne bouge ; elle avance
 * alors à la vitesse de marche × (1 − masse / force de roulement), bornée entre `minFactor` et `maxFactor` fois la marche
 * (la force de roulement est dans strength.json : 300 kg). Pas d'élan : elle s'arrête quand il s'arrête.
 */
export const ROLL = { startMs: 300, minFactor: 0.15, maxFactor: 0.6 };

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

/** Ajouter ?debug à l'URL affiche les boîtes de collision. */
export const DEBUG = params.has('debug');

/** ?reset efface la sauvegarde et repart du réveil (le mot est ensuite retiré de l'adresse, voir resumeGame). */
export const RESET = params.has('reset');

/** ?dieu ouvre les outils de test, à côté du jeu (src/dieu/). Sans lui, ils n'existent pas. */
export const DIEU = params.has('dieu');
