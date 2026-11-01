// Constantes globales. Tout ce qui est réglage de gameplay passe par ici.

export const TILE = 32;

/** Zone visible en pixels du monde : 20 x 11 tuiles. */
export const VIEW = { width: 640, height: 360 };

/**
 * Le canvas est rendu à VIEW x ZOOM et les caméras zooment d'autant : le pixel art garde sa taille,
 * mais le texte des dialogues est rendu à pleine résolution, donc net.
 */
export const ZOOM = 2;

/**
 * Paliers du zoom de la caméra du monde (molette, + et −, systems/zoom.ts) : des entiers seulement, d'un cran sous `ZOOM` à trois
 * au-dessus (les petits objets, à leur vraie taille, se voient de près). Le plus bas est relevé sur une carte trop petite pour lui.
 */
export const ZOOM_STEPS = { min: ZOOM - 1, max: ZOOM + 3 };

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
 * La transformation « magique » des outils de test (?dieu, systems/transform.ts) : ce qui entre se cherche dans les mains, puis au
 * sol à moins de `near` px des pieds de Xéros (le plus près du point qu'il regarde d'abord).
 */
export const TRANSFORM = { near: 40 };

/**
 * E maintenu (nouer, dénouer) : durée de l'appui (ms) ; avant, relâcher E fait le geste court (reprendre une pièce).
 * La jauge (`ui-gauge`) se remplit au-dessus de la tête de Xéros, `above` px au-dessus de ses pieds (bas de la jauge).
 */
export const LONG_PRESS = { ms: 500, above: 35 };

/** L'aide de la mère pour dresser une poutre trop lourde (systems/site.ts) : durée du fondu (ms) et temps passé dans le noir, le temps de lire « Ta mère vient t'aider. ». */
export const HELP = { fade: 500, hold: 1600 };

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

/**
 * Chantiers (systems/site.ts) : les piquets suivants s'aimantent au coin du tracé le plus près s'il est à moins de `snap` px du
 * point que regarde Xéros ; la ligne d'état « Abri à bois : dés, 2 sur 4 » paraît quand Xéros est à moins de `near` px de
 * l'emprise ; `ghost` et `aimed` : opacité des places à remplir, et de celle que vise Xéros avec une pièce qui lui convient.
 */
export const SITE = { snap: 12, near: 110, ghost: 0.35, aimed: 0.7 };

/**
 * Poser devant soi : écart entre la collision de Xéros et ce qu'il pose (`gap`, px) ; si la place juste devant lui est prise, on
 * cherche la plus proche à côté, par pas de `step` px, en travers puis en s'éloignant, jusqu'à `reach` px (systems/hands.ts).
 */
export const PUT_DOWN = { gap: 2, step: 2, reach: 24 };

/**
 * Viser une pièce de bois (systems/wood.ts) : Xéros doit être collé à elle, tourné vers elle : au plus `gap` px entre sa collision
 * et celle de la pièce contre son flanc (couper, équarrir), `end` px à un de ses bouts (planter le coin, frapper à la masse).
 */
export const WOOD_AIM = { gap: 3, end: 6 };

/**
 * La passe de doloire (systems/wood.ts, sur le rail de systems/rail.ts) : elle commence à au plus `reach` px d'un bout de la pièce,
 * ou de là où la face en cours s'est arrêtée ; entre deux faces, la pièce est retournée d'un quart de tour sur son axe : elle se
 * soulève de `hop` px, s'écrase un peu en retombant, en `turnMs` ms.
 */
export const HEW_PASS = { reach: 8, hop: 3, turnMs: 420 };

/**
 * Fendre : les deux morceaux naissent à leur place (`split` de wood.json) ; si elle est prise, ils s'écartent ensemble, en travers
 * de la pièce, d'un pixel de plus à chaque essai, de part et d'autre, jusqu'à `slide` px (deux quartiers écorce en bas, pointe en
 * l'air, sont plus larges que leur demi-bille : celle d'à côté ne doit pas l'empêcher de se fendre).
 */
export const SPLIT = { slide: 12 };

/** Récolte : tremblement d'un objet frappé, saut des objets lâchés, où ils retombent (px, autour de la base). */
export const HARVEST = {
  shakeMs: 160,
  dropMs: 320,
  dropRadius: [12, 24] as [number, number],
  dropSpacing: 9,
  /** Fendage : durée (ms) de la fente grande ouverte avant que les deux morceaux paraissent. */
  splitMs: 380,
  /** Éclats d'impact : nombre par coup, durée de vie (ms), vitesse (px/s), pesanteur (px/s²). */
  chips: { count: 6, lifespan: 420, speed: [50, 110] as [number, number], gravity: 420 },
};

/** Les mains à l'écran : durée d'un message court (ms), et d'un message important (sauvegarde refusée). */
export const HUD = { noticeMs: 1800, longNoticeMs: 7000 };

/**
 * La barre d'endurance du HUD (art/ui/stamina-bar.ts, contrat de pose) : `pxPerPoint` px de creux par point (le maximum de 100 fait
 * 50 px), le creux en (`inner`, `inner`) du cadre, `gap` px au-dessus des cases des mains ; essoufflé, la part « revient » clignote
 * (`blinkMs` par demi-période, jusqu'à `blinkAlpha`).
 */
export const STAMINA_BAR = { pxPerPoint: 0.5, inner: 3, end: 3, height: 10, gap: 4, blinkMs: 260, blinkAlpha: 0.25 };

/**
 * La jauge d'un travail (entities/WorkBar.ts, art/ui/work-bar.ts, contrat de pose) : coin haut-gauche de l'image depuis les pieds de
 * Xéros (`dx`, `dy` : au-dessus de l'outil levé du coup de masse), et le creux où se pose le remplissage (`inner`, depuis le coin du cadre).
 */
export const WORK_BAR = { dx: -10, dy: -68, inner: { x: 2, y: 2, w: 16, h: 2 } };

/**
 * La bouffée de Xéros essoufflé (planche `fx-breath`, art/characters/breath.ts) : coin haut-gauche de l'image depuis ses pieds, et
 * miroir, par direction (les accroches données par le dessin).
 */
export const BREATH = {
  down: { dx: 4, dy: -26, flipX: false },
  up: { dx: 4, dy: -26, flipX: false },
  right: { dx: 5, dy: -26, flipX: false },
  left: { dx: -15, dy: -26, flipX: true },
} as const;

/**
 * Le mode construction (le bac à sable, systems/build.ts, world/build.ts) : la grille (cm) de l'emprise et des crans de hauteur ;
 * `high` : une pièce posée à cette hauteur ou plus haut ne bloque plus le passage ; `head` : une pièce dont la base est à cette
 * hauteur ou plus haut s'efface quand Xéros passe dessous (sa tête, 1,60 m) ; `camera` : vitesse de la caméra libre (px/s, Maj :
 * `fast` fois plus) ; `ghost` : opacité du fantôme (`refused` : quand la pose est refusée).
 */
export const BUILD = { grid: 20, high: 200, head: 160, camera: 260, fast: 3, ghost: 0.6, refused: 0.25 };

/**
 * Les intérieurs (chantier « intérieurs », world/interior.ts, world/interiorMap.ts) : un bâtiment posé en mode construction se
 * reconnaît à sa porte, la pièce est ce qui est clos autour d'elle. Hauteurs en cm : ce qui a sa base sous `headroom` barre le passage,
 * ce qui l'a entre `headroom` et `lintel` est un linteau (l'ouverture dessous est un passage, la pièce reste close) ; ce dont le dessus
 * est sous `floor` est au sol (dalles, seuil) ; `cell` : la grille de la recherche (cm, un pixel) ; `search` : jusqu'où l'on cherche le
 * dedans derrière une porte ; `maxCells` : au-delà, ce n'est pas une pièce close ; `reach` : l'épaisseur des murs qu'on prend autour de
 * la pièce ; `band` : une pièce en hauteur dans cette bande le long d'un mur est du mur (la sablière) ; `south` : ce qui touche le bord
 * sud dans cette bande est du mur sud (montré en coupe) ; `passage` : la plus petite ouverture sans porte. La vue : `margin` (px)
 * autour de la pièce, la pénombre (`ambient` quand un volet est ouvert, `dark` sinon, comme la chaumière), la couleur du vide, la
 * taille des taches de lumière (`light`, × l'image `sunpatch`).
 */
export const INTERIOR = {
  headroom: 180,
  lintel: 240,
  floor: 30,
  cell: 5,
  search: 300,
  maxCells: 250000,
  reach: 80,
  band: 40,
  south: 60,
  passage: 60,
  margin: { side: 32, top: 128, bottom: 32 },
  ambient: 0.22,
  dark: 0.36,
  void: 0x1e1610,
  light: { door: 0.75, window: 0.8, alpha: 0.9 },
};

/** Où commence la partie : Xéros se réveille dans son cagibi. */
export const START = { map: 'maison', spawn: 'reveil' };

/**
 * Les zones du monde (chantier « monde », systems/zones.ts) : `band`, ce qu'on voit des voisines par-delà le bord, en cases (assez pour
 * la moitié de la vue au palier de zoom le plus bas : la caméra ne montre jamais le vide près d'un bord ouvert) ; `reach`, en cases, ce
 * qu'on prend d'objets au-delà de la bande (un arbre planté plus bas qui dépasse vers le haut) ; `edge`, en px, ce dont les pieds de
 * Xéros passent le bord avant que la voisine prenne le relais (le milieu de ses pieds).
 */
export const ZONES = { band: { x: 21, y: 12 }, reach: 8, edge: 8 };

/** La pénombre du sous-bois (`gloom` de world.json) : sa couleur, et la largeur des bandes où elle varie (px). */
export const GLOOM = { color: 0x0b1611, strip: 64 };

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

/** ?construire ouvre le mode construction (le bac à sable) : son catalogue à gauche du jeu, la touche B pour entrer et sortir. */
export const CONSTRUIRE = params.has('construire');

/** ?dieu ouvre les outils de test, à côté du jeu (src/dieu/). Sans lui, ils n'existent pas. */
export const DIEU = params.has('dieu');
