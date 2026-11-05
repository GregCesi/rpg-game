// Palette commune du jeu. Les sprites piochent dedans pour rester cohérents entre eux.
// Un caractère = une couleur. '.' est réservé à la transparence.

// Direction "conte rustique" : tons terreux tirant vers l'ocre, ombres qui glissent vers le brun-violet,
// lumières vers le jaune. Contours brun chaud plutôt que noirs.
export const OUTLINE = '#3b2b20';

/**
 * Le bois travaillé, une rampe par âge (docs/CONCEPTION.md, « L'âge du bois ») : neuf (blond chaud), patiné (brun doux), vieux
 * (gris argenté). Toute pièce de bois travaillé (faces dressées et fendues, bois de bout, planches, bardage, portes, volets, pans de
 * toit…) se dessine avec ces signes-là, de la lumière au joint ; la palette `world` leur donne les teintes du neuf, et le build tire
 * le patiné et le vieux de la même grille en changeant ces teintes (art/world/wood.ts, `WOOD_AGES`). Mêmes signes pour les trois
 * âges ; ce qui distingue les pièces entre elles, c'est la forme et la texture, jamais la teinte. Signes pris hors des lettres,
 * libres dans toutes les palettes du jeu.
 *
 * Cinq teintes, de la plus claire à la plus sombre :
 * - `^` lumière : le dessus et les arêtes au soleil, le bord éclairé d'une planche, le bois de bout côté lumière ;
 * - `*` bois : la teinte de la pièce, sa face sud, le fond d'une planche ;
 * - `%` ombre : le fil, la face dans l'ombre, le cerne, le cœur ;
 * - `&` creux : le fil arraché dans l'ombre, l'ombre portée d'une traverse, le bas mouillé ;
 * - `@` joint : la fente entre deux planches, les têtes de chevilles et de clous, la saignée ; jamais le contour (K, o).
 * Le neuf est un blond de bois fendu du jour, moins jaune et moins saturé que le chaume (Y t T P) dont il se détache ; le patiné,
 * le même bois après quelques saisons, brun doux, plus clair et plus gris que l'écorce (M m N K) pour ne pas s'y confondre ; le
 * vieux, le bois lavé par vingt ans de pluie, gris-brun argenté (réchauffé à la demande de Grégoire : un gris neutre faisait
 * pierre, métal ou béton) : arêtes blanchies, un peu jaunes, corps gris-brun, creux et joints qui restent bruns, vers le
 * brun-violet ; moins brun que le bois grisé S A B Q, distinct de la pierre grise (qui tire vers l'olive). Plus d'écart entre
 * lumière et creux que les autres âges. D'un âge à l'autre, chaque signe garde à peu près sa valeur : le dessin se lit pareil,
 * seule la couleur change.
 */
export const woodAges = {
  new: { '^': '#d2b688', '*': '#b39469', '%': '#8d704f', '&': '#6a523f', '@': '#4b3a2f' },
  worn: { '^': '#b49a7a', '*': '#957c62', '%': '#74604d', '&': '#56473b', '@': '#3e332c' },
  old: { '^': '#c8bfaa', '*': '#9e9182', '%': '#7b6d60', '&': '#5b4b44', '@': '#3f3036' },
} as const;

export const world = {
  // herbe (olive, un peu sèche)
  g: '#7b8544',
  G: '#949a52',
  v: '#606a38',
  V: '#4c5430',
  y: '#b0a862',
  // terre / chemin
  u: '#a8855a',
  U: '#bf9d6c',
  n: '#8c6c48',
  e: '#6f553a',
  // champ labouré
  f: '#6e4f33',
  F: '#87643f',
  // eau
  w: '#56788a',
  W: '#7e9ea8',
  q: '#45627a',
  // bois (clôtures, troncs, charpente)
  m: '#86613e',
  M: '#a67d51',
  N: '#5f412b',
  K: '#46301f',
  // bois grisé par les intempéries (toit de planches de l'abri, bois brut de la cabane et de la maison) : chaque teinte
  // est le mélange à moitié d'une teinte du bois (M m N) et de la pierre de même rang (R r z Z), moins jaune que le bois
  // équarri frais (Y t T) et que le chaume. Du plus clair au plus sombre ; K pour les joints. Quelques palettes locales
  // (portraits, personnages, intérieur, dialogue) redonnent leur propre sens à S, A, B ou Q.
  S: '#af976f', // M + R : la planche la plus claire, au faîte
  A: '#a0886a', // M + r : planche claire
  B: '#7f684f', // m + z : planche ordinaire
  Q: '#5e4b3a', // N + Z : planche à l'ombre, fil, tranche
  // feuillage
  l: '#5d6e34',
  L: '#76863f',
  j: '#99a556',
  k: '#45512b',
  // pierre
  r: '#9a9384',
  R: '#b8b09f',
  z: '#787061',
  Z: '#5d564a',
  // calcaire de la carrière (chantier « pierre », roche `limestone` de art/proposals/roches.ts) : la pierre commune du
  // village, gris clair presque blanc, plus claire et plus chaude que la pierre grise R r z Z (qui reste celle des rochers).
  // De la cassure fraîche à la fissure profonde : la lumière glisse vers le jaune crème, l'ombre vers le brun-violet, jamais
  // un gris froid de béton. Signes pris hors des lettres, libres dans toutes les palettes du jeu.
  '!': '#f3eedf', // cassure fraîche : arêtes vives, éclats de taille (presque blanc, à peine chaud)
  '+': '#ddd3bb', // calcaire au soleil : dessus, faces tournées vers la lumière (crème)
  '=': '#bdb29c', // calcaire patiné : face sud, la teinte de la pierre en place
  ';': '#958a84', // calcaire à l'ombre : flanc est, dessous (glisse vers le violet)
  '~': '#675a5a', // fissure profonde, creux, contour côté lumière (brun-violet)
  // chaume
  t: '#b8954f',
  T: '#97773c',
  Y: '#d3b46d',
  P: '#73592e',
  // torchis
  d: '#d8c6a1',
  D: '#baa47f',
  E: '#9a8664',
  // fleurs
  a: '#efe6cc',
  b: '#e0b94a',
  c: '#b8584a',
  // chanvre (corde) : plus jaune et plus saturé que le lin de la tunique de Xéros (portrait L t T), pour s'en
  // détacher quand il pend à sa main ; plus pâle que la paille (Y t). X : le plus sombre, contour côté lumière et creux.
  J: '#ddc58d',
  O: '#b99c62',
  C: '#8c7244',
  X: '#5f4a2b',
  // bois travaillé, à l'âge neuf (woodAges : le patiné et le vieux se tirent de la même grille)
  ...woodAges.new,
  // bois travaillé vieux, posé dans une tuile (le pont de bois, art/world/tiles.ts) : un jeu de tuiles n'a qu'une palette, et le
  // build ne vieillit pas les tuiles ; ces signes reprennent tels quels la rampe `woodAges.old`, dans le même ordre (^ * % & @).
  '{': woodAges.old['^'],
  '}': woodAges.old['*'],
  '[': woodAges.old['%'],
  ']': woodAges.old['&'],
  '|': woodAges.old['@'],
  // sols de la forêt, de la lisière à la forêt profonde (art/world/tiles.ts) : même grain que l'herbe, les tons glissent de
  // l'olive vers le brun de la litière, puis vers un vert-bleu froid et un humus noir qui tire au brun-violet.
  '0': '#757b41', // sol de lisière : herbe rare mêlée de feuilles (un cran sous l'herbe g)
  '2': '#665c3c', // litière du sous-bois : feuilles brunes tassées
  '3': '#43372a', // terre sombre du sous-bois, creux de la litière
  '4': '#485045', // sol de la forêt profonde, froid
  '5': '#2c292d', // humus noir (brun-violet)
  '6': '#4d6756', // mousse vert-bleu de la forêt profonde
  '7': '#5f7d68', // mousse au jour (forêt profonde)
  '8': '#35483f', // mousse à l'ombre (forêt profonde)
  '9': '#54473b', // feuille pourrie, éteinte (forêt profonde)
  // prairie de fauche : herbe haute, plus blonde que l'herbe rase g
  s: '#878a4a', // fond de la prairie
  p: '#c3b571', // épis blonds, au soleil
  // terre battue (place du village, cours de ferme) : plus claire et plus tassée que le chemin u U n e
  I: '#b9a178', // terre battue
  '#': '#cbb68d', // terre battue lissée, au soleil
  $: '#9b8461', // terre battue, creux et traces
  // route empierrée : la terre qui lie les pierres (les pierres : calcaire + = ;, pierre grise R r z, ocre U u)
  ':': '#7c6b54', // joint de terre entre les pierres
  ',': '#5b4d3d', // joint profond, ombre au pied d'une pierre de bordure
  // contour, ombre, lueur
  o: OUTLINE,
  x: '#2b1a1040',
  h: '#e9a23b',
  H: '#f6d36b',
  i: '#c4542c',
};

// Laine teinte à la guède, délavée (robe de la mère). Le bleu de l'eau (W w q) éteint vers le gris
// de la pierre (R r z) : la lumière glisse vers le jaune-gris, l'ombre vers le brun-violet.
// Assez claire et froide pour se détacher de la terre battue et des cheveux châtain.
export const woad = {
  light: '#94a29f',
  base: '#728390',
  shade: '#56637a',
  deep: '#443f55',
};

// Robe du lapin de garenne (art/world/rabbit.ts, chantier « lapins » : la proposition B retenue par Grégoire). La rampe de
// l'écorce (M m N K) éteinte vers le gris de la pierre : rousse et contrastée, elle se détache de l'herbe olive ; la lumière
// glisse vers le jaune, l'ombre vers le brun-violet. Le blanc du ventre et de la queue est le `a` des fleurs, son ombre `d`.
export const rabbitFur = {
  light: '#b39069', // robe au soleil (le dos) : M éteint, un peu jaune
  base: '#8a6a4c', // robe (les flancs) : m vers la pierre
  shade: '#634a38', // robe à l'ombre : N réchauffé
  deep: '#3f2c27', // le plus sombre : contour côté lumière, oreilles ; K vers le brun-violet
};

/**
 * Les ciels du cadran du temps (art/ui/clock.ts, chantier « le temps ») : deux aplats par moment de la journée, le haut et
 * l'horizon, sans dégradé. Ils restent terreux comme le reste : la lumière glisse vers le jaune, l'ombre vers le brun-violet.
 * Signes pris hors des lettres, libres dans la palette du monde.
 */
export const sky = {
  '(': '#a8838e', // aube, haut : mauve rosé
  ')': '#ddb08a', // aube, horizon : pêche
  '<': '#9fb6b6', // jour, haut : bleu pâle grisé (l'eau W, éclaircie)
  '>': '#c6cfbb', // jour, horizon : presque crème
  '?': '#8e5560', // crépuscule, haut : lie-de-vin
  '/': '#cf7f4c', // crépuscule, horizon : orange brique
  '-': '#2c3049', // nuit, haut : indigo sombre
  '_': '#434b68', // nuit, horizon : indigo
};

/**
 * Le fer forgé (chantier « forge » : l'enclume, la tuyère et la buse, les outils pendus, les barres, l'étau, la tôle de la porte du
 * four, la ferraille). Un gris bleu sombre : la lumière glisse vers le jaune-gris (le poli d'une table d'enclume au jour), l'ombre
 * vers le brun-violet, jamais un noir. Du plus clair au plus sombre ; `>` sert aussi de contour côté lumière d'une pièce de fer.
 * Signes libres dans toute la palette du monde (`world`, `stonePalette`) : ils ne servent ailleurs qu'aux ciels du cadran (`sky`),
 * une palette d'interface qu'on ne mêle jamais à celle d'un objet du monde.
 */
export const iron = {
  '(': '#a9a99d', // fer poli au soleil : la table de l'enclume, l'arête d'une barre
  ')': '#727980', // fer : la face au jour, gris bleu
  '<': '#50566a', // fer à l'ombre (le bleu glisse vers le violet)
  '>': '#363343', // fer au plus sombre : le creux, le contour côté lumière (brun-violet)
};

/**
 * La terre cuite (chantier « forge » : les tuiles plates, `tile-roof-large`) : un brun-rouge chaud un peu passé, la lumière qui
 * glisse vers le jaune (la tuile lavée par la pluie, au soleil), l'ombre vers le brun-violet (le creux sous le rang du dessus, la
 * tuile la plus cuite). Plus rouge et plus saturée que le bois (écorce M m N K, bois travaillé ^ * % & @) et que le chemin
 * (U u n e), dont elle se détache. Du plus clair au plus sombre. Signes pris hors des lettres, libres dans toute la palette du monde
 * (le `?` n'est ailleurs qu'au ciel du cadran, `sky`, une palette d'interface).
 */
export const terracotta = {
  "'": '#c58c68', // tuile au soleil, passée (vers le jaune)
  '"': '#a8664c', // la tuile
  '`': '#965843', // une tuile plus cuite, le coin arrondi
  '\\': '#844b3c', // l'ombre sous le rang du dessus
  '?': '#5d3634', // le creux, la tuile la plus cuite, contour côté lumière (vers le brun-violet)
};

/**
 * Le forgeron du village (chantier « forgeron », validé par Grégoire le 5 novembre 2026 ; art/characters/smith.ts,
 * art/portraits/smith.ts). Du plus clair au plus sombre dans chaque rampe ; la lumière glisse vers le jaune, l'ombre vers le
 * brun-violet. Le fer de ses outils, le manche du marteau, le fer rouge et l'étincelle ne sont pas ici : ce sont le fer (`iron`), le
 * bois neuf (`woodAges.new`) et le feu de la forge (`world` h, H, i).
 */
export const smith = {
  /** Ses cheveux : un blond doré chaud, plus chaud que le chaume. `glint` et `root` : le reflet doux et le creux des mèches du portrait. */
  hair: { light: '#f6e2a0', glint: '#efcd7e', base: '#e3b65c', shade: '#be8a36', deep: '#835a26', root: '#5e3c1d' },
  /** Sa peau hâlée par le feu ; `soft` (le portrait) : le passage du jour à la peau ; `hollow` : le creux doux sous la pommette. */
  skin: { light: '#f1c597', soft: '#e4b082', base: '#d69c6c', shade: '#ae7350', deep: '#7e4b37', hollow: '#c38a60' },
  /** Le cuir épais du tablier et des brassards : un brun-roux, nettement plus sombre que la peau. */
  leather: { light: '#a0653b', base: '#7d4a2b', shade: '#5c3420', deep: '#3e2218' },
  /** Son pantalon de grosse toile sombre. */
  canvas: { light: '#5f5650', base: '#49423f', deep: '#332d2f' },
  /** Ses bottes de cuir. */
  boots: { light: '#6e4c34', base: '#4f3626', deep: '#35241b' },
  /** Son visage au portrait : le blanc des yeux, l'iris brun et son ombre, les lèvres et leur ombre. */
  face: { white: '#f0e7d6', iris: '#a27646', irisShade: '#74502c', lip: '#b86e52', lipShade: '#8a4a3a' },
} as const;
