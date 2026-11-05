// Constantes globales. Tout ce qui est réglage de gameplay passe par ici.

export const TILE = 32;

/** Zone visible en pixels du monde : 20 x 11 tuiles. */
export const VIEW = { width: 640, height: 360 };

/**
 * L'interface (HUD, dialogues) est dessinée sur VIEW et agrandie ZOOM fois ; le canvas est rendu à VIEW × ZOOM × RENDER et les caméras
 * de l'interface zooment de ZOOM × RENDER (`UI_ZOOM`) : le pixel art garde sa taille, le texte est rendu à pleine résolution, donc net.
 */
export const ZOOM = 2;

/**
 * La définition du canevas (chantier « correctifs ») : RENDER fois plus de pixels que VIEW × ZOOM. Aux crans de zoom non entiers, un
 * pixel du monde fait 4 ou 5 pixels du canevas au lieu de 2 ou 3 : l'écart entre deux pixels voisins (et le scintillement quand la
 * caméra glisse) se voit beaucoup moins. La caméra du monde zoome de palier × RENDER (systems/zoom.ts). Laissée à 1 en attendant
 * Grégoire : à 2, une image passait de 25–30 ms à 80–90 ms dans Chromium sans écran (rendu logiciel) ; captures comparées par
 * `npx tsx tools/essai-zoom.ts` (.art-preview/zoom-crans-x1.png, zoom-crans-x2.png).
 */
export const RENDER = 1;

/** Le zoom des caméras de l'interface, et la résolution de leurs textes. */
export const UI_ZOOM = ZOOM * RENDER;

/**
 * Le zoom de la caméra du monde (molette, + et −, systems/zoom.ts ; décidé par Grégoire, chantier « correctifs » : l'échelle reste réelle,
 * on aide la lecture). `min` : la vue la plus large (640 × 360 px du monde, 32 × 18 m) ; `start` : la première fois (environ 21 × 12 m) ;
 * `max` : la plus proche (12,8 × 7,2 m : les petits objets, à leur vraie taille, se voient de près) ; `step` : un cran de molette, un quart
 * de palier. Le plus bas est relevé sur une carte trop petite pour lui. La seule source de ces réglages.
 */
export const ZOOM_STEPS = { min: 2, start: 3, max: 5, step: 0.25 };

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
 * Les touches affichées au-dessus de ce qui est devant Xéros (systems/keyPrompts.ts) : `lift` px au-dessus du haut de l'objet (4 :
 * un peu dedans), balancées de `bob` px ; un objet de plus de `tall` cm (l'arbre) a sa touche à `at` cm du sol, sur le tronc ; deux
 * touches sur la même cible (E et F) côte à côte, `gap` px d'écart (E à gauche) ; les trois points de E maintenable `dots` px sous E.
 */
export const KEY_PROMPT = { lift: 4, bob: 2, tall: 250, at: 150, gap: 1, dots: 1 };

/**
 * La visée d'un coup à la souris (src/world/aim.ts ; hors du combat, Xéros vise devant lui) : ce qui encaisse un coup (le mannequin,
 * une bête) se vise sous le curseur jusqu'à `strike` px du point d'où Xéros regarde (la portée d'un long coup), sinon dans sa direction.
 */
export const AIM = { strike: 64 };

/**
 * La transformation « magique » des outils de test (?dieu, systems/transform.ts) : ce qui entre se cherche dans les mains, puis au
 * sol à moins de `near` px des pieds de Xéros (le plus près du point qu'il regarde d'abord).
 */
export const TRANSFORM = { near: 40 };

/**
 * L'appui maintenu (docs/COMMANDES.md : E maintenu noue, dénoue, fait pivoter une bille, appelle la mère ; le clic maintenu vise un
 * lancer) : le seuil (ms), le même pour toutes ; avant, le relâcher fait l'appui court. Pendant E maintenu, la touche E se remplit d'or
 * (`ui-key-e-fill`, systems/keyPrompts.ts).
 */
export const LONG_PRESS = { ms: 500 };

/** L'aide de la mère pour dresser une poutre trop lourde (systems/site.ts) : durée du fondu (ms) et temps passé dans le noir, le temps de lire « Ta mère vient t'aider. ». */
export const HELP = { fade: 500, hold: 1600 };


/** Nombre de pièces d'un tas (`count` de piles.json) : affiché quand les pieds de Xéros sont à moins de `near` px du tas au sol. */
export const PILE_COUNT = { near: 12 };

/**
 * Toits (pièces `roof` de props.json : chevrons, toit de planches) : opacité quand Xéros est dessous ou caché derrière, et durée
 * du fondu (ms) pour aller d'opaque à cette opacité.
 */
/**
 * Les toits : opacité d'un toit effacé, durée du fondu ; `wall` : l'épaisseur des murs autour de la pièce d'un bâtiment (cm : ce qui
 * la touche à cette distance est à lui) ; `window` : devant une fenêtre ouverte, dehors, jusqu'où (cm de la face du mur) et à quel
 * écart de ses bords on voit la pièce (src/world/roofView.ts) ; `reveal` : la hauteur des murs qu'on voit au fond de la pièce découverte (cm).
 */
export const ROOF = { alpha: 0.35, fadeMs: 250, wall: 30, eaves: 100, window: { front: 150, side: 40 } };

/**
 * Ombre portée d'un toit (`shadow` de props.json) : la lumière vient du nord-ouest, d'en haut (docs/STYLE.md section 2) ;
 * un point à z px de haut tombe au sol décalé de z × `dx` vers l'est et z × `dy` vers le sud. Couleur et opacité : celles
 * de l'ombre portée des sprites (`x` de la palette, #2b1a10 à 0x40).
 */
export const SHADOW = { dx: 0.25, dy: 0.1, color: 0x2b1a10, alpha: 0x40 / 255 };

/**
 * L'ombre de joint (chantier « hauteurs », choix B de Grégoire) : sous une pièce de bois couchée posée sur une autre, une rangée
 * assombrie sur celle du dessous, juste sous le bas de sa silhouette, là où celle du dessous se voit (world/jointShade.ts). Posées
 * à leur hauteur vraie, deux pièces se recouvrent de 2 px : l'ombre rend la rondeur sans le double trait. La teinte de l'ombre `x`.
 */
export const JOINT_SHADE = { color: 0x2b1a10, alpha: 110 / 255 };

/**
 * Le relief (chantier « relief », world/relief.ts) : `straddle` (cm), l'écart de hauteur au-delà duquel une chose posée serait à
 * cheval sur une marche (elle basculerait) : la place n'est pas libre ; `lane`, l'opacité du bord sud d'un chemin creux et des
 * feuillages qui le surplombent quand Xéros est dessous (comme un toit, plus effacé), `fadeMs` le fondu ; `gloom`, la pénombre du
 * creux à 5 m de profondeur (elle suit la profondeur, cuite dans le terrain, jamais sur Xéros).
 */
export const RELIEF = { straddle: 50, lane: 0.2, fadeMs: 250, gloom: 0.3 };

/**
 * Chantiers (systems/site.ts) : les piquets suivants s'aimantent au coin du tracé le plus près s'il est à moins de `snap` px du
 * point que regarde Xéros ; la ligne d'état « Abri à bois : dés, 2 sur 4 » paraît quand Xéros est à moins de `near` px de
 * l'emprise ; `ghost` et `aimed` : opacité des places à remplir, et de celle que vise Xéros avec une pièce qui lui convient ;
 * `helpReach` : la mère aide à dresser une poutre couchée dont un bout est à moins de ce rayon (px, une case) de sa place.
 */
export const SITE = { snap: 12, near: 110, ghost: 0.35, aimed: 0.7, helpReach: 32 };

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
 * La petite carte du HUD (docs/CONCEPTION.md, « La petite carte » ; src/world/minimap.ts, src/systems/minimap.ts) : ronde, en haut à
 * gauche, nord en haut, calculée depuis les cartes et la partie. La seule source de ses réglages.
 * `steps` : ses crans, dans l'ordre où un clic sur la carte les fait passer (puis retour au premier) ; `px` : pixels du canevas par
 * case de 1,60 m (avant RENDER ; 2 = un pixel du HUD) ; `inner` : le diamètre de la fenêtre ronde en px du HUD (impair ; le cadre de
 * bois de art/ui/minimap.ts est tiré à chaque diamètre). Les cases montrées : inner × ZOOM ÷ px (81 cases, 65 m autour ; 40,5 cases,
 * 32 m ; 126 cases, 100 m). `start` : le cran de la première fois (ensuite le cran choisi est retenu, comme le zoom de la caméra).
 * `margin` : du bord de l'écran (px du HUD, comme le cadran) ; `refreshMs` : la zone de Xéros repeinte au plus une fois par
 * `refreshMs` quand la partie a changé ; `outside` : l'aplat au-delà du bord du monde (l'humus `5` de la palette).
 */
export const MINIMAP = {
  steps: [
    { px: 2, inner: 81 },
    { px: 4, inner: 81 },
    { px: 1, inner: 63 },
  ],
  start: 0,
  margin: 4,
  refreshMs: 500,
  outside: '#2c292d',
} as const;

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
 * Les pieds d'un personnage (px) : la boîte de collision (`w` × `h`, son bas `gap` au-dessus des pieds), et le point qui passe les
 * sorties et les portes (`point` au-dessus des pieds). Une seule source : Actor, les sorties, les intérieurs, l'arrivée par le bord.
 */
export const FEET = { w: 10, h: 8, gap: 2, point: 3 };

/** La taille de Xéros (cm, du sol au haut du bol de cheveux) : la seule ; les toits, le mode construction et les intérieurs en partent. */
export const XEROS_HEIGHT = 170;

/**
 * Le mode construction (le bac à sable, systems/build.ts, world/build.ts) : la grille (cm) de l'emprise et des crans de hauteur ;
 * `high` : une pièce posée à cette hauteur ou plus haut ne bloque plus le passage ; `head` : une pièce dont la base est à cette
 * hauteur ou plus haut s'efface quand Xéros passe dessous (sa tête, `XEROS_HEIGHT`) ; `camera` : vitesse de la caméra libre (px/s, Maj :
 * `fast` fois plus) ; `ghost` : opacité du fantôme (`refused` : quand la pose est refusée).
 */
export const BUILD = { grid: 20, high: 200, head: XEROS_HEIGHT, camera: 260, fast: 3, ghost: 0.6, refused: 0.25 };

/**
 * Les intérieurs (chantier « intérieurs », world/interior.ts, world/interiorMap.ts) : un bâtiment posé en mode construction se
 * reconnaît à sa porte, la pièce est ce qui est clos autour d'elle. Hauteurs en cm : ce qui a sa base sous `headroom` (la taille de Xéros et 10 cm de garde) barre le passage,
 * ce qui l'a entre `headroom` et `lintel` est un linteau (l'ouverture dessous est un passage, la pièce reste close) ; ce dont le dessus
 * est sous `floor` est au sol (dalles, seuil) ; `cell` : la grille de la recherche (cm, un pixel) ; `search` : jusqu'où l'on cherche le
 * dedans derrière une porte ; `maxCells` : au-delà, ce n'est pas une pièce close ; `reach` : l'épaisseur des murs qu'on prend autour de
 * la pièce ; `band` : une pièce en hauteur dans cette bande le long d'un mur est du mur (la sablière) ; `south` : ce qui touche le bord
 * sud dans cette bande est du mur sud (montré en coupe) ; `passage` : la plus petite ouverture sans porte. La vue : `margin` (px)
 * autour de la pièce, la pénombre (`ambient` quand un volet est ouvert, `dark` sinon, comme la chaumière), la couleur du vide, la
 * taille des taches de lumière (`light`, × l'image `sunpatch`).
 */
export const INTERIOR = {
  headroom: XEROS_HEIGHT + 10,
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
  /** La teinte de la pénombre (dedans, et la pièce vue de dehors). */
  shade: 0x1a0e06,
  void: 0x1e1610,
  light: { door: 0.75, window: 0.8, alpha: 0.9 },
};

/** Où commence la partie : Xéros se réveille dans son coin de la maison (le réveil est « dedans », sur la ferme). */
export const START = { map: 'ferme', spawn: 'reveil' };

/**
 * Les zones du monde (chantier « monde », systems/zones.ts) : `band`, ce qu'on voit des voisines par-delà le bord, en cases, tirée de la
 * moitié de la vue au palier de zoom le plus bas (`ZOOM_STEPS.min`), plus une case (la caméra ne montre jamais le vide près d'un bord ouvert) ; `reach`, en cases, ce
 * qu'on prend d'objets au-delà de la bande (un arbre planté plus bas qui dépasse vers le haut) ; `edge`, en px, ce dont les pieds de
 * Xéros passent le bord avant que la voisine prenne le relais (le milieu de ses pieds).
 */
export const ZONES = {
  band: { x: Math.ceil((VIEW.width * ZOOM) / ZOOM_STEPS.min / 2 / TILE) + 1, y: Math.ceil((VIEW.height * ZOOM) / ZOOM_STEPS.min / 2 / TILE) + 1 },
  reach: 8,
  edge: 8,
};

/**
 * Le pas de jeu (docs/CONCEPTION.md, « Le temps ») : le jeu avance toujours par pas de la même durée, `1000 / fps` ms (celle des pas de
 * la physique d'Arcade, `physics.arcade.fps` de main.ts), quelle que soit la machine : une image du navigateur fait autant de pas que le
 * temps vrai écoulé en demande (une machine lente en fait plusieurs, jamais un plus grand), au plus `maxPerImage` (en dessous de
 * 60 / 12 = 5 images par seconde à x1, la borne de Phaser pour son pas d'avant, le jeu ralentit plutôt que de sauter ; à xN, au plus N pas par image si N est plus grand :
 * une machine qui ne suit pas ralentit le temps accéléré au lieu de s'emballer) ; `slack` (ms) : l'écart toléré pour qu'un écran à 60 Hz,
 * dont les images ne tombent jamais tout à fait sur 16,67 ms, fasse un pas par image, sans image vide ni double (world/timeStep.ts).
 */
export const STEP = { fps: 60, maxPerImage: 12, slack: 2 };

/** La pénombre du sous-bois (`gloom` de world.json) : sa couleur, et la largeur des bandes où elle varie (px). */
export const GLOOM = { color: 0x0b1611, strip: 64 };

export const PLAYER = {
  skin: 'xeros',
  /**
   * Les vitesses de Xéros, en m/s (décidé par Grégoire : une marche de 2 m/s, une course de 2,5 m/s, 9 km/h) : la seule source des
   * déplacements (systems/speeds.ts, réglables dans ?dieu). Chargé, il marche à la marche × ce que permet sa force (Strength) ; fatigué,
   * à la marche × `tiredWalk` de stamina.json (1 m/s).
   */
  walk: 2,
  run: 2.5,
  /**
   * La marche discrète (Alt maintenu, Option sur Mac ; docs/COMMANDES.md) : une part de la marche (0,4 : 0,8 m/s), réglable dans ?dieu
   * (systems/speeds.ts). Chargé ou fatigué, la même part de sa marche d'alors.
   */
  sneak: 0.4,
  /**
   * Cadences des dessins (px/s) : la vitesse pour laquelle la marche (`walk-*`, 100 px/s) et la marche portée (`carry-walk-*`, 55 px/s)
   * ont été dessinées ; l'animation s'accélère ou ralentit avec la vitesse réelle. Pas des vitesses de déplacement.
   */
  walkCadence: 100,
  carryCadence: 55,
  /** La marche portée : la cadence de son dessin suit la vitesse divisée par ce rapport (px/s par image/s), jamais sous `carryCadence`. */
  carryStride: 1.4,
};

/**
 * Les petits délais entre deux états (ms) : `fade` le fondu d'un changement de carte (`fadeIn` à l'arrivée) ; `lock` l'interaction
 * bloquée après un fondu, un dialogue, la sortie du mode construction (l'appui qui l'a fermé ne relance rien) ; `afterWork` les clics
 * bloqué après un travail ou une passe arrêtés.
 */
export const LOCKS = { fade: 200, fadeIn: 220, lock: 200, afterWork: 150 };

/** La lueur d'un feu (`light` de props.json) : teinte, opacité de pose puis son battement, la taille de l'image `glow` (px), l'écart d'échelle, la durée d'un battement (ms, plus un tirage). */
export const GLOW = { tint: 0xffa040, alpha: 0.32, from: 0.26, to: 0.4, image: 64, scale: [0.95, 1.04], ms: 180, jitter: 140 };

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
