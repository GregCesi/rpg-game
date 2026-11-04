// Proposition : le forgeron du village (chantier « forge », CADRAGE-forge.md section 5). Essai hors jeu : rien ici n'est déclaré
// dans art/index.ts. Planche : npx tsx tools/essai-forge-forgeron.ts écrit .art-preview/forge-forgeron.png.
//
// Essai 2 (retour de Grégoire sur l'essai 1, « un peu féminin, de grosses joues ») : un bel homme, très masculin.
// - 1,90 m : 38 px de haut contour compris (y=8 à y=45 dans une frame de 32 × 48, pieds à y=45 comme Xéros et la mère).
// - 18 px de large bras compris (x=7 à 24 ; Xéros et la mère : 12) : à 16 px l'écart de carrure ne se lisait pas assez à x1.
//   Trapèzes qui descendent du cou, deltoïdes ronds séparés des pectoraux par une ombre, bras de 4 px (biceps, creux du coude,
//   avant-bras épais, creux du poignet, gros poings).
// - Tête de 12 px (x=10 à 21) : visage de 10 px, tempes dégagées (on voit les oreilles), arcade lourde, nez droit, joues creuses
//   (ombre sous la pommette), mâchoire carrée dont l'angle est dessiné, menton fort ; cou épais, aussi large que le visage.
// - Cheveux longs et blonds, rejetés en arrière : des mèches et des pointes, pas de frange ; ils ne couvrent ni les tempes ni la
//   mâchoire, tombent derrière les oreilles, sur la nuque et dans le dos. Attachés : une queue à la nuque.
// - Tablier de cuir de la poitrine aux genoux, rien dessous : pectoraux de part et d'autre de la bavette étroite, flancs nus,
//   bras nus ; dans le dos, deux lanières en V jusqu'au nœud aux reins, le dos nu entre elles (colonne, omoplates).
// - Braies de laine brune, bottes de cuir ; peau hâlée, quelques brûlures d'un pixel (cicatrices claires).
// - Barbe courte : un blond plus foncé que la peau (d e), qui se lit à x1.
//
// Construction comme Xéros et la mère : grilles écrites à la main, contour d'un pixel, contour côté lumière dans la teinte la
// plus sombre de chaque matière (selOut), lumière en haut à gauche (la moitié droite et le côté droit de chaque bras dans
// l'ombre). La tête (rangées 0 à 16 de la grille : jusqu'aux épaules, où tombent les cheveux) change avec la coiffure ; le
// corps (rangées 17 à 37) est commun. L'essai 1 est gardé en bas du fichier (`essai1`), pour la comparaison.

import { Canvas, selOut, type Grid } from '../lib/canvas';
import { OUTLINE, world } from '../palette';

export const W = 32;
export const H = 48;
/** Haut de la silhouette : 38 px jusqu'aux pieds, à y=45. */
export const TOP_Y = 8;
/** Colonne gauche des grilles de face et de dos (18 px de large, centrées sur la frame). */
export const OX = 7;
/** Colonne gauche des grilles de profil (16 px). */
const SIDE_OX = 8;

export const palette: Record<string, string> = {
  o: OUTLINE,
  // cheveux blonds : la rampe du chaume (Y t T P), un blond de paille ; la barbe prend les deux teintes sombres (d e)
  H: world.Y,
  h: world.t,
  d: world.T,
  e: world.P,
  // peau hâlée : celle de Xéros (portrait s S D) brunie d'un cran par le feu et le soleil
  s: '#d4a27c',
  S: '#b07b5a',
  D: '#83503a',
  // brûlure : une cicatrice luisante d'un pixel, plus claire et plus rose que la peau
  b: '#e8b19a',
  // tablier de cuir : brun-roux sombre, plus rouge que les braies, nettement plus sombre que la peau
  A: '#87512f',
  a: '#673b23',
  q: '#4b2a1a',
  Q: '#341b12',
  // braies de laine brune, plus grises que le cuir
  p: '#76604a',
  P: '#5a4836',
  // bottes de cuir (celles de Xéros)
  k: '#3d2a1f',
  K: '#5c4130',
  x: '#00000038', // ombre au sol
};

/** Contour côté lumière : teinte la plus sombre de chaque matière. */
const DARK: Record<string, string> = {
  H: 'e', h: 'e', d: 'e', e: 'e',
  s: 'D', S: 'D', D: 'D', b: 'D',
  A: 'Q', a: 'Q', q: 'Q', Q: 'Q',
  p: 'P', P: 'P',
  k: 'k', K: 'k',
};

export type Hair = 'loose' | 'tied';
export type Facing = 'down' | 'up' | 'right';

// ---------- Vue de face (18 colonnes, posées à x=7) ----------

// Tête, cheveux lâchés. Le dessus : des mèches rejetées en arrière depuis une raie, quelques pointes sur le haut du front, pas de
// frange. Le visage : tempes dégagées et oreilles, arcade lourde et sourcils bas, yeux enfoncés, nez droit (son ombre à droite),
// joues creuses sous les pommettes, bouche ferme, angle de la mâchoire dessiné, menton fort. Le cou, aussi large que le visage,
// dans l'ombre de la mâchoire ; les cheveux tombent derrière la nuque (mèches sur les trapèzes) ; la lanière du tablier monte
// au cou ; deltoïdes séparés des pectoraux par une ombre.
const headFrontLoose: Grid = [
  '.....oooooooo.....',
  '....oHHHHHhhho....',
  '...oHHhHHhdhhdo...', // des mèches plaquées en arrière : le dessus suit le crâne
  '...oHhHHhdhdhdo...',
  '...ohHhdhhdhdeo...',
  '..ohhshssshsddeo..', // naissance des cheveux : des pointes, le front dégagé
  '..ohsssssssssSdo..', // tempes
  '..ossdddsSdddSSo..', // arcade, sourcils ; le haut des oreilles
  '..ossSossSSoSSDo..', // yeux enfoncés, oreilles
  '...osssssSssSSo...', // pommettes, arête du nez
  '...osSssSSssDSo...', // joues creuses, bout du nez
  '...ossSDDDsSSSo...', // bouche
  '...oDssssSSSSDo...', // angle de la mâchoire, menton
  '...ooDSssSSDDoo...', // dessous de la mâchoire
  '.oHhssSSSSSSSDdeo.', // cou épais ; les cheveux derrière la nuque
  '.oHhsssqssqSSSdeo.', // trapèzes, mèches, lanière du tablier
  'ossHDssqssqSSDeSSo', // deltoïdes, pointes des cheveux
];

// Cheveux attachés à la nuque : le même dessus, sans pointes sur le front ; rien ne tombe sur les épaules.
const headFrontTied: Grid = [
  ...headFrontLoose.slice(0, 5),
  '..ohhsssssssddeo..',
  ...headFrontLoose.slice(6, 14),
  '...ossSSSSSSSDo...',
  '.osssSsqssqSSDSSo.',
  'osssDssqssqSSDSSSo',
];

// Barbe courte (rangées 9 à 13, colonnes 4 à 13) : joues, autour de la bouche, menton et dessous de la mâchoire, d'un blond plus
// foncé que la peau (d, l'ombre e à droite) pour se lire à x1.
const beardFront: Grid = [
  'd........e',
  'dd......ee',
  'ddd...deee',
  'dddddddeee',
  '.ddddeeee.',
];

// Corps de face (rangées 17 à 37). Bras de 4 px (3 de lumière, l'ombre qui les sépare du torse), creux au coude et au poignet,
// gros poings ; bavette étroite, pectoraux de part et d'autre, leur ombre dessous, flancs nus ; le tablier s'élargit à la
// taille et descend aux genoux ; brûlures sur les avant-bras ; braies, bottes.
const bodyFront: Grid = [
  'ossSDssAAaqSSDsSSo', // haut de la bavette, pectoraux
  'ossSDssAaaqSSDsSSo',
  'ossSDDSAaaqSDDsSSo', // le dessous des pectoraux
  '.osSDsAAaaaqSDsSo.', // coudes ; flancs nus
  'ossSDsAaaaaqSDsSSo', // avant-bras
  'ossSDAAaaaaaqDsSSo', // taille : le tablier s'élargit
  'ossSDAaaaaaaqDsSSo',
  'osbSDAaaaaaaqDsSSo', // brûlure
  'ossSDAaaaaaaqDsbSo', // brûlure
  '.osSDAaaqaaaqDsSo.', // poignets ; pli du cuir
  'osssSAaaqaaaqSsSSo', // poings
  'oSSSDAaaqaaaqDSSDo',
  '.ooooAaaqaaaqoooo.',
  '....oqqqqqqqqo....', // ourlet, aux genoux
  '....oppPoopPPo....',
  '....oppPoopPPo....',
  '....opPPoPPPPo....',
  '....oKKkooKkko....',
  '....oKkkooKkko....',
  '....okkkookkko....',
  '....oooooooooo....',
];

// ---------- Vue de dos ----------

// Cheveux lâchés : des mèches qui couvrent l'arrière du crâne et la nuque, et tombent entre les omoplates (pointes : hairTips).
const headBackLoose: Grid = [
  '.....oooooooo.....',
  '....oHHHHHhhho....',
  '...oHHhHHhdhhdo...',
  '...oHhHHhdhdhdo...',
  '...ohHhdhhdhdeo...',
  '..oHhhdhHhdhdheo..',
  '..ohHhdhhHhdhdeo..',
  '..ohhhdhHhhdhdeo..',
  '..ohHhdhhhhdhdeo..',
  '...ohhdhhdhddeo...', // les cheveux tombent droit sous le crâne
  '...ohdhhhdhhdeo...',
  '...ohdhhdhhdeeo...',
  '...ohdhhdhhddeo...',
  '...ohhdhhdhdeeo...',
  '..oshhdhhdhhdeSo..',
  '.osshhdhhdhhdeSSo.',
  'ossDhhdhhdhhdeDSSo',
];
/** Pointes des cheveux lâchés sur le haut du dos (colonnes 4 à 13, rangées 17 à 19). */
const hairTips: Grid = [
  'hhdhhdhhde',
  '.hdh.dhde.',
  '..d...h...',
];

// Cheveux attachés : les mèches tirées vers la nuque, les oreilles dégagées, le lien de cuir, la queue entre les omoplates
// (tailBack) ; la nuque et le cou nus.
const headBackTied: Grid = [
  ...headBackLoose.slice(0, 5),
  '..ohhhdhhhdhdheo..',
  '..ohHhdhhHhdhdeo..',
  '..ohhhdhHhhdhdeo..',
  '..oshhdhhhdhdeSo..', // oreilles
  '..oSDhhdhhdhdDSo..',
  '...oSShdhhddSSo...',
  '...osSShqqdSSDo...', // le lien
  '...osSSShdSSSDo...',
  '...oDsSShdSSDDo...',
  '...osSSShdSSSDo...',
  '.ossSssShdSSSDSSo.',
  'osssDssShdSSSDSSSo',
];
/** La queue de cheveux attachés (colonnes 8 et 9, rangées 17 à 19). */
const tailBack: Grid = ['hd', 'hd', 'he'];

// Dos nu : omoplates, colonne, les deux lanières du tablier qui descendent des épaules en V jusqu'au nœud aux reins, le cuir qui
// revient sur les flancs à la taille, les pans du nœud ; les braies sous le nœud.
const bodyBack: Grid = [
  'ossSDqsssSSSqDsSSo',
  'ossSDsqssSSqSDsSSo',
  'ossSDDqsSSSqDDsSSo', // le bas des omoplates
  '.osSDssqsSqSSDsSo.', // coudes ; la colonne entre les lanières
  'ossSDssqsSqSSDsSSo',
  'ossSDAsSqqSSqDsSSo', // les lanières se rejoignent
  'ossSDAqqAAqqqDsSSo', // le nœud aux reins
  'osbSDApqaqqPqDsSSo',
  'ossSDApqPqpPqDsbSo', // pans du nœud, braies
  '.osSDAppqPpPqDsSo.',
  'osssSAppPpPPqSsSSo',
  'oSSSDAppPpPPqDSSDo',
  '.ooooApppPPPqoooo.',
  '....oqpppPPPqo....',
  '....oppPoopPPo....',
  '....oppPoopPPo....',
  '....opPPoPPPPo....',
  '....oKKkooKkko....',
  '....oKkkooKkko....',
  '....okkkookkko....',
  '....oooooooooo....',
];

// ---------- Vue de profil (droite ; 16 colonnes, posées à x=8) ----------

// Tête de profil, cheveux lâchés : front droit, arcade qui avance au-dessus de l'œil, nez droit, joue creuse, lèvres, menton fort
// qui avance, angle de la mâchoire dessiné, oreille dégagée ; les cheveux rejetés derrière l'oreille tombent sur la nuque et le
// dos ; cou épais.
const headSideLoose: Grid = [
  '....ooooooo.....',
  '...oHHHHHHho....',
  '..oHHHhHHhhhho..',
  '..oHHhhHhhdhho..',
  '..ohHhdhhhhsso..',
  '..ohhdhhhhssso..',
  '..ohhdhhhssddso.', // arcade, sourcil
  '..ohhdhhSssoSo..', // oreille, œil enfoncé
  '..ohhdhhSDsssso.', // nez
  '..ohhdhhDSSsssSo', // joue creuse, bout du nez
  '..ohhdhhSsSssDo.', // bouche
  '..ohhdhhDSSsssSo', // angle de la mâchoire, menton
  '..ohhdhhoDSSSSDo', // le bord de la mâchoire
  '..ohhdhhsSDoooo.',
  '..ohhdhssSSSDo..', // cou épais
  '..ohhdhsssssSSo.',
  '..ohdhessssssSSo',
];
/** Pointes des cheveux lâchés de profil (colonnes 3 à 5, rangées 17 à 19). */
const hairTipsSide: Grid = ['hde', 'hd.', '.e.'];

// Cheveux attachés : le lien de cuir sur la nuque, la queue qui pend derrière le cou, la nuque nue.
const headSideTied: Grid = [
  ...headSideLoose.slice(0, 9),
  '..oqqSssDSSsssSo', // le lien
  '..ohdsSSSsSssDo.',
  '..ohdsSSDSSsssSo',
  '..ohdsSSoDSSSSDo',
  '..ohdsSSsSDoooo.',
  '..ohdsssSSSSDo..',
  '..ohesssssssSSo.',
  '..osssssssssSSSo',
];

// Barbe courte de profil (colonnes 8 à 15, rangées 9 à 12).
const beardSide: Grid = [
  '.dd.....',
  '.ddd....',
  'dddddde.',
  '.ddddde.',
];

// Corps de profil (rangées 17 à 37) : dos large, poitrine bombée sous la bavette (le cuir épais fait le bord avant), le dessous
// du pectoral, le flanc nu, la lanière à la taille ; le cuir aux genoux devant, les braies derrière ; jambes et bottes.
const bodySide: Grid = [
  '..osssssssSSAAo.',
  '..osssssssSSaAo.',
  '..oSsssssSDDaAo.', // le dessous du pectoral
  '..oSssssssSsaAo.', // flanc nu
  '...oSsssssSsaAo.',
  '...oqqqqqqqqaAo.', // la lanière du tablier
  '...oPpppppqaaAo.',
  '..oPppppppqaaAo.',
  '..oPppppppqaaAo.',
  '..oPppppppqaaAo.',
  '..oPPpppppqaaAo.',
  '...oPppppqaaaAo.',
  '...oPpppppqaaAo.',
  '...oPPpppqqqqqo.', // ourlet, aux genoux
  '....oPpPpPpPo...',
  '....oPpPpPpPo...',
  '....oPPpPPpPo...',
  '....okkKKKKKo...',
  '....okkkKKKKKo..',
  '....okkkkkkkko..',
  '....oooooooooo..',
];

// Bras côté spectateur (rangées 15 à 29) : deltoïde rond, biceps, creux du coude, avant-bras épais, poignet, gros poing ; bordé
// de l'ombre de la peau pour se détacher du torse, sans contour intérieur ; une brûlure sur l'avant-bras.
const armSide: Grid = [
  '.DDDD.',
  'DssssD', // deltoïde
  'DsssSD',
  'DssSSD',
  '.DssSD',
  'DsssSD', // biceps
  'DsssSD',
  '.DsSD.', // coude
  'DsssSD', // avant-bras
  'DsbsSD',
  'DsssSD',
  '.DsSD.', // poignet
  'DsssSD', // poing
  'DSSSSD',
  '.DDDD.',
];

// ---------- Composition ----------

function shadow(c: Canvas, facing: Facing) {
  if (facing === 'right') c.ellipse(16.5, 45.5, 6, 2, 'x');
  else c.ellipse(16.5, 45.5, 8, 2, 'x');
}

/** Une image du forgeron : de face, de dos ou de profil droit ; coiffure ; barbe. */
export function smith(facing: Facing, hair: Hair, beard = false): Grid {
  const c = new Canvas(W, H);
  shadow(c, facing);
  if (facing === 'down') {
    c.stamp(bodyFront, OX, TOP_Y + 17);
    c.stamp(hair === 'loose' ? headFrontLoose : headFrontTied, OX, TOP_Y);
    if (beard) c.stamp(beardFront, OX + 4, TOP_Y + 9);
  } else if (facing === 'up') {
    c.stamp(bodyBack, OX, TOP_Y + 17);
    c.stamp(hair === 'loose' ? headBackLoose : headBackTied, OX, TOP_Y);
    if (hair === 'loose') c.stamp(hairTips, OX + 4, TOP_Y + 17);
    else c.stamp(tailBack, OX + 8, TOP_Y + 17);
  } else {
    c.stamp(bodySide, SIDE_OX, TOP_Y + 17);
    c.stamp(hair === 'loose' ? headSideLoose : headSideTied, SIDE_OX, TOP_Y);
    if (hair === 'loose') c.stamp(hairTipsSide, SIDE_OX + 3, TOP_Y + 17);
    c.stamp(armSide, SIDE_OX + 6, TOP_Y + 15);
    if (beard) c.stamp(beardSide, SIDE_OX + 8, TOP_Y + 9);
  }
  return selOut(c.toGrid(), DARK);
}

// ---------- Portrait 64 px ----------
// Construit comme ceux de Xéros et de la mère (art/portraits/) : formes pensées sur 64 px, yeux, sourcils et bouche en grilles
// écrites à la main, contour d'un pixel, contour côté lumière dans la teinte sombre de chaque matière. Buste de face : trapèzes
// qui descendent du cou, épaules nues, cou épais (presque la largeur du visage) ; tablier tenu au cou par sa lanière. Tête
// carrée : tempes dégagées et oreilles, cheveux rejetés en arrière (des mèches, pas de frange) qui tombent derrière les
// oreilles et la nuque ; arcade lourde, yeux gris-bleu enfoncés, nez droit, joues creuses, angle de la mâchoire, menton fort.

const portraitPalette: Record<string, string> = {
  ...palette,
  l: '#e6b994', // pommette, arête du nez au soleil
  // yeux gris-bleu (le bleu de l'eau W w q de la palette, éteint vers la pierre)
  w: '#e9e0cf',
  i: '#5f7178',
  I: '#82959a',
  n: '#22140c',
  // bouche
  m: '#a5664f',
  M: '#7f4636',
  // cheveux : un reflet plus clair que le chaume au soleil
  G: '#ead08a',
};

const PORTRAIT_DARK: Record<string, string> = { ...DARK, G: 'e', l: 'D', m: 'D', M: 'D' };

const eye: Grid = [
  'oooooo',
  'wiInIw',
];
const brow: Grid = [
  'dddddd',
  'eeeedd',
];
const flip = (g: Grid): Grid => g.map((r) => [...r].reverse().join(''));

function drawPortrait(beard: boolean): Grid {
  const S = 64;
  const c = new Canvas(S, S);

  // --- cheveux, derrière : rejetés en arrière, ils tombent derrière les oreilles, sur la nuque et les épaules, en mèches ---
  // collés au crâne au-dessus des oreilles, ils ne s'écartent qu'au-dessous de la mâchoire, sur la nuque et les épaules
  c.polygon([[15, 14], [49, 14], [50, 30], [51, 38], [55, 47], [53, 53], [47, 50], [17, 50], [11, 53], [9, 47], [13, 38], [14, 30]], 'h');
  c.within('h', (c) => {
    c.polygon([[46, 18], [55, 40], [55, 53], [47, 50]], 'd');
    for (const [x0, x1] of [[13, 10], [15, 13], [49, 51], [51, 54]]) c.line(x0, 36, x1, 53, x0 < 32 ? 'd' : 'e');
    c.line(13, 40, 10, 48, 'H');
  });

  // --- épaules nues : les trapèzes descendent du cou vers les deltoïdes ---
  c.polygon([[0, 64], [0, 56], [9, 51], [20, 45], [44, 45], [55, 51], [64, 56], [64, 64]], 's');
  c.within('s', (c) => {
    c.polygon([[44, 45], [55, 51], [64, 56], [64, 64], [52, 64], [46, 54]], 'S');
    c.polygon([[3, 54], [11, 50], [17, 48], [8, 54]], 'l');
    // le bord des trapèzes et le creux des clavicules
    c.line(9, 52, 20, 47, 'S');
    c.line(15, 55, 25, 52, 'S');
    c.line(39, 52, 49, 55, 'D');
    // deltoïdes
    c.line(4, 57, 2, 64, 'S');
    c.line(60, 57, 62, 64, 'D');
  });
  // cicatrices de brûlure sur l'épaule
  c.set(8, 59, 'b');
  c.set(55, 61, 'b');

  // --- cou épais, presque aussi large que le visage ---
  c.rect(20, 38, 24, 13, 's');
  c.within('s', (c) => {
    c.rect(36, 38, 8, 13, 'S');
    c.rect(20, 39, 24, 3, 'D');
    // les muscles du cou, de sous l'oreille au creux de la gorge
    c.line(22, 42, 29, 50, 'S');
    c.line(42, 42, 35, 50, 'D');
    c.set(32, 49, 'S');
  });

  // --- tablier : la bavette sur la poitrine, la lanière autour du cou ---
  c.polygon([[21, 58], [43, 58], [44, 64], [20, 64]], 'a');
  c.within('a', (c) => {
    c.rect(20, 58, 25, 1, 'A');
    c.polygon([[38, 59], [44, 59], [44, 64], [40, 64]], 'q');
  });
  c.line(22, 58, 25, 48, 'q');
  c.line(23, 58, 26, 48, 'A');
  c.line(42, 58, 39, 48, 'q');
  c.line(41, 58, 38, 48, 'Q');
  c.set(23, 60, 'Q');
  c.set(41, 60, 'Q');
  // les pectoraux de part et d'autre de la bavette
  c.within('sS', (c) => {
    c.line(12, 60, 19, 61, 'S');
    c.line(45, 61, 52, 60, 'D');
  });

  // --- visage carré : front droit, mâchoire large, angle dessiné, menton fort ---
  c.polygon([[19, 14], [45, 14], [46.5, 28], [47, 38], [46, 42], [41, 47.5], [23, 47.5], [18, 42], [17, 38], [17.5, 28]], 's');
  c.within('s', (c) => {
    // ombre côté droit
    c.polygon([[42, 20], [46.5, 28], [47, 38], [46, 42], [41, 47.5], [37, 47.5], [43, 41], [43.5, 30]], 'S');
    // joues creuses : une ombre en biais sous chaque pommette
    c.line(20, 35, 24, 40, 'S');
    c.line(21, 35, 24, 39, 'S');
    c.line(44, 35, 40, 40, 'D');
    // pommettes au soleil
    c.line(21, 32, 26, 32, 'l');
    c.line(22, 33, 24, 33, 'l');
    // l'angle de la mâchoire et son bord jusqu'au menton
    c.line(18, 40, 18, 42, 'S');
    c.line(19, 43, 23, 47, 'S');
    c.line(46, 40, 46, 42, 'D');
    c.line(45, 43, 41, 47, 'D');
    // menton fort, sa fossette, l'ombre dessous
    c.line(24, 47, 40, 47, 'D');
    c.line(29, 44, 35, 44, 'l');
    c.set(32, 45, 'S');
  });

  // --- oreilles, dégagées : elles dépassent du visage, les cheveux passent derrière ---
  c.ellipse(16, 31.5, 2.2, 4, 's');
  c.ellipse(48, 31.5, 2.2, 4, 'S');
  c.set(16, 31, 'S');
  c.set(16, 33, 'D');
  c.set(48, 31, 'D');
  c.within('s', (c) => c.line(17.5, 28, 17.5, 35, 'S'));

  // --- cheveux devant : rejetés en arrière depuis une raie, des mèches et quelques pointes sur le haut du front ---
  const part = 34;
  c.polygon([[14, 22], [14, 13], [20, 8], [32, 6], [44, 8], [50, 13], [50, 22], [47, 18], [42, 16], [36, 17], [part, 15], [30, 17], [24, 16], [18, 18]], 'h');
  c.within('h', (c) => {
    c.polygon([[16, 13], [22, 9], [30, 8], [26, 11], [19, 15]], 'H');
    c.line(23, 10, 26, 10, 'G');
    // mèches qui partent de la raie vers l'arrière
    c.line(part - 2, 9, 20, 14, 'd');
    c.line(part - 4, 12, 17, 19, 'd');
    c.line(part + 2, 9, 46, 13, 'd');
    c.line(part + 3, 12, 49, 19, 'e');
    c.polygon([[44, 9], [50, 13], [50, 22], [46, 16]], 'd');
    c.line(part, 7, part, 14, 'e');
  });
  // pointes sur le front
  c.set(25, 17, 'h');
  c.set(40, 17, 'd');

  // --- détails ---
  const eyeY = 29;
  c.stamp(eye, 23, eyeY);
  c.stamp(flip(eye), 35, eyeY);
  // arcade lourde : sourcils bas et épais, posés sur les paupières, l'ombre de l'arcade entre eux
  c.stamp(brow, 23, 27);
  c.stamp(flip(brow), 35, 27);
  c.within('s', (c) => c.line(29, 27, 34, 27, 'S'));
  // nez droit : l'arête au soleil, l'ombre à droite, les narines
  c.line(33, 30, 33, 37, 'S');
  c.line(32, 30, 32, 36, 'l');
  c.line(29, 38, 35, 38, 'S');
  c.set(29, 37, 'D');
  c.set(35, 37, 'D');
  // bouche ferme
  c.line(28, 41, 36, 41, 'M');
  c.line(29, 42, 35, 42, 'm');

  if (beard) {
    // barbe courte : joues sous les pommettes, autour de la bouche, menton, d'un blond plus foncé que la peau
    c.within('slSD', (c) => {
      c.polygon([[18, 33], [23, 36], [27, 40], [28, 43], [36, 43], [37, 40], [41, 36], [46, 33], [47, 40], [42, 48], [22, 48], [17, 40]], 'd');
      c.polygon([[38, 36], [46, 33], [47, 40], [42, 48], [36, 48]], 'e');
      c.line(29, 40, 35, 40, 'd'); // la moustache
    });
    c.line(28, 41, 36, 41, 'M');
  }

  c.outline('o');
  return selOut(c.toGrid(), PORTRAIT_DARK);
}

/** Le portrait 64 px de face (rasé, ou avec la barbe courte). */
export function portrait(beard = false): { grid: Grid; pal: Record<string, string> } {
  return { grid: drawPortrait(beard), pal: portraitPalette };
}

// ---------- Essai 1 (gardé pour la comparaison sur la planche) ----------

/** L'essai 1 tel qu'il a été montré à Grégoire (16 px de large, visage jugé trop féminin). */
export const essai1 = (() => {
  const OX = 8;
  const palette: Record<string, string> = {
    o: OUTLINE,
    // cheveux blonds : la rampe du chaume (Y t T P), un blond de paille un peu sale
    H: world.Y,
    h: world.t,
    d: world.T,
    e: world.P,
    // peau hâlée : celle de Xéros (portrait s S D) brunie d'un cran par le feu et le soleil
    s: '#d4a27c',
    S: '#b07b5a',
    D: '#83503a',
    // brûlure : une cicatrice luisante d'un pixel, plus claire et plus rose que la peau (le rouge vif faisait du sang)
    b: '#e8b19a',
    // tablier de cuir : brun-roux sombre, plus rouge que les braies, nettement plus sombre que la peau
    A: '#87512f',
    a: '#673b23',
    q: '#4b2a1a',
    Q: '#341b12',
    // braies de laine brune, plus grises que le cuir
    p: '#76604a',
    P: '#5a4836',
    // bottes de cuir (celles de Xéros)
    k: '#3d2a1f',
    K: '#5c4130',
    x: '#00000038', // ombre au sol
  };

  /** Contour côté lumière : teinte la plus sombre de chaque matière. */
  const DARK: Record<string, string> = {
    H: 'e', h: 'e', d: 'e', e: 'e',
    s: 'D', S: 'D', D: 'D', b: 'D',
    A: 'Q', a: 'Q', q: 'Q', Q: 'Q',
    p: 'P', P: 'P',
    k: 'k', K: 'k',
  };

  type Hair = 'loose' | 'tied';
  type Facing = 'down' | 'up' | 'right';

  // ---------- Vue de face ----------

  // Tête, cheveux lâchés : la raie un peu à droite du milieu, deux bandeaux qui couvrent les tempes et les oreilles et tombent
  // sur les épaules ; front en triangle sous la raie, sourcils lourds, petits yeux, nez marqué à droite, bouche fine, menton et
  // mâchoire carrés, plus larges que les cheveux autour des joues. Les épaules (rangées 15-16) portent les pointes des cheveux et
  // la lanière du tablier, qui monte au cou.
  const headFrontLoose: Grid = [
    '...oooooooooo...',
    '..oHHHHHHhhhho..',
    '..oHHHHhhhhhdo..',
    '..oHHHhhhhhhdo..',
    '..oHHhhhdhhhdo..', // la raie
    '..oHhhhsshhhdo..',
    '..oHhsssssShdo..',
    '..oHhddssddhdo..', // sourcils
    '..oHhsossoShdo..', // yeux
    '..oHssssSsSSdo..', // la mâchoire s'élargit
    '..oHsssSSsSSdo..', // nez
    '..ossssDDSSSSo..', // bouche ; la mâchoire passe devant les cheveux
    '..osssssssSSSo..', // menton
    '..oSSSSSSSDDDo..', // dessous de la mâchoire
    '..oHoDDDDDDodo..', // cou, dans l'ombre de la mâchoire
    '.osHhqsssSqhdSo.', // trapèzes, pointes des cheveux, lanière du tablier
    'osshSqsssSqSdSSo',
  ];

  // Cheveux attachés à la nuque : tirés en arrière, plaqués sur le crâne, les oreilles dégagées ; rien sur les épaules.
  const headFrontTied: Grid = [
    '...oooooooooo...',
    '..oHHHHHHhhhho..',
    '..oHHHHhhhhhdo..',
    '..oHHHhhhhhhdo..',
    '..oHHhhhdhhhdo..',
    '..oHhhhsshhhdo..',
    '..oHhsssssShdo..',
    '..oohddssddhoo..', // sourcils ; les cheveux s'arrêtent au-dessus des oreilles
    '..osssossoSSSo..', // yeux, oreilles
    '..oSssssSsSSDo..',
    '...osssSSsSSo...',
    '...ossSDDSSSo...',
    '...osssssSSSo...',
    '...oSSSSSDDDo...',
    '....oDDDDDDo....',
    '.ooSsqsssSqSSoo.',
    'osssSqsssSqSSSSo',
  ];

  // Barbe courte, par-dessus la tête de face (rangées 9 à 13, colonnes 4 à 11 de la grille) : favoris, moustache autour de la
  // bouche, menton couvert ; plus sombre à droite.
  const beardFront: Grid = [
    '.d......e.',
    '.dd....ee.',
    'ddd.DD.eee',
    'ddddddeeee',
    'eddddeeeee',
  ];

  // Corps de face (rangées 17 à 37) : bras nus de 3 px (lumière à gauche de chacun), séparés du torse par l'ombre ; bavette du
  // tablier sur la poitrine, le tablier s'élargit à la taille et descend aux genoux ; poings serrés ; brûlures sur les avant-bras ;
  // braies et bottes, jambes écartées par leur contour.
  const bodyFront: Grid = [
    'ossSssAAaqsSsSDo', // haut de la bavette, pectoraux de part et d'autre
    'ossSssAaaqsSsSDo',
    'ossDSSAaaqSDsSDo', // le dessous des pectoraux
    '.osSDAAaaaqDsSo.', // coudes : le bras s'amincit
    'ossSDAaaaaqDsSDo', // avant-bras
    'ossSAAAaaaaqsSDo', // taille : le tablier s'élargit
    'ossSAaaaaaaqsSDo',
    'osbSAaaaaaaqsSDo', // brûlure
    'ossSAaaaaaaqsbDo', // brûlure
    '.osSAaaqaaaqsSo.', // poignets ; pli du cuir
    'osssAaaqaaaqsSSo', // poings
    'oSSDAaaqaaaqSSDo',
    '.oooAaaqaaaqooo.',
    '...oqqqqqqqqo...', // ourlet, aux genoux
    '...oppPoopPPo...',
    '...oppPoopPPo...',
    '...opPPoPPPPo...',
    '...oKKkooKkko...',
    '...oKkkooKkko...',
    '...okkkookkko...',
    '...oooooooooo...',
  ];

  // ---------- Vue de dos ----------

  // Cheveux lâchés : ils couvrent l'arrière du crâne et la nuque et s'étalent sur le haut des épaules.
  const headBackLoose: Grid = [
    '...oooooooooo...',
    '..oHHHHHHhhhho..',
    '..oHHHHhhhhhdo..',
    '..oHHHhhhhhhdo..',
    '..oHHhhhhhhhdo..',
    '..oHhhhhhhhhdo..',
    '..oHhhhhhhhhdo..',
    '..oHhhhhhhhhdo..',
    '..oHhhhdhhhhdo..', // mèches
    '..oHhhhdhhhddo..',
    '..oHhhdhhhhddo..',
    '..oHhhdhhdhddo..',
    '..oHhhdhhdhddo..',
    '..oHhhhhhdhddo..',
    '..oHhhhhhhhddo..',
    '.osHhhhhhhhddSo.',
    'osshhhdhhdhddSSo', // pointes des cheveux
  ];

  // Cheveux attachés : le crâne lisse, la nuque dégagée, la queue qui pend entre les omoplates (posée à part : tailBack).
  const headBackTied: Grid = [
    '...oooooooooo...',
    '..oHHHHHHhhhho..',
    '..oHHHHhhhhhdo..',
    '..oHHHhhhhhhdo..',
    '..oHHhhhhhhhdo..',
    '..oHhhhhhhhhdo..',
    '..oHhhhhhhhhdo..',
    '..ooHhhdhdhhoo..', // les mèches convergent vers le lien
    '..osHhhdhddhSo..', // oreilles
    '..oSSHhhdhdSSo..',
    '...oSShqqdSSo...', // le lien
    '...osSSdhSSSo...',
    '...osSSdhSSDo...',
    '...oSSShdSDDo...',
    '....oSShdSDo....',
    '.ooSsSShdSSSDoo.',
    'osssSSShdSSSSSDo',
  ];

  // La queue de cheveux sur le haut du dos, sous le lien.
  const tailBack: Grid = ['hd', 'hd', 'he'];

  // Dos : omoplates et colonne en ombre, les deux lanières du tablier croisées (de chaque épaule vers le nœud aux reins), le
  // tablier qui revient sur les flancs à la taille, le nœud et ses pans ; les braies se voient sous le nœud.
  const bodyBack: Grid = [
    'ossSqssssSqDsSDo',
    'ossSDqsSSSqDsSDo',
    'ossSSsqSSqSDsSDo', // omoplates
    '.osSDssqqSSDsSo.', // les lanières se croisent ; coudes
    'ossSDssqqSSDsSDo',
    'ossSAsqSSqSqsSDo',
    'ossSAqSSSSqqsSDo',
    'osbSAqqAAqqqsSDo', // le nœud aux reins
    'ossSApqaqqPqsbDo',
    '.osSApqPqpPqsSo.', // pans du nœud, braies ; poignets
    'osssApppPPPqsSSo',
    'oSSDAppPpPPqSSDo',
    '.oooApppPPPqooo.',
    '...oqpppPPPqo...',
    '...oppPoopPPo...',
    '...oppPoopPPo...',
    '...opPPoPPPPo...',
    '...oKKkooKkko...',
    '...oKkkooKkko...',
    '...okkkookkko...',
    '...oooooooooo...',
  ];

  // ---------- Vue de profil (droite) ----------

  // Tête de profil : front droit, arcade lourde, nez qui dépasse, menton carré qui avance ; cheveux lâchés qui couvrent l'oreille
  // et tombent dans le dos jusqu'aux épaules.
  const headSideLoose: Grid = [
    '....ooooooo.....',
    '...oHHHHHhho....',
    '..oHHHHhhhhho...',
    '..oHHHhhhhhho...',
    '..oHHhhhhhhsso..',
    '..oHhhhhhhssso..',
    '..oHhhhhhsddso..', // sourcil
    '..oHhhhhhssoso..', // œil
    '..oHhhhhhssssso.', // nez
    '..oHhhhhhsssSo..',
    '..oHhhhhhssDSo..', // bouche
    '..oHhhhhdssssSo.', // menton
    '..oHhhhhdSSSSDo.',
    '..oHhhhhdDoooo..',
    '..oHhhhhdSSo....', // cou
    '..oHhhhdsssSo...',
    '..oHhhdsssssSo..',
  ];

  // Cheveux attachés : l'oreille dégagée, la queue qui pend derrière la nuque.
  const headSideTied: Grid = [
    '....ooooooo.....',
    '...oHHHHHhho....',
    '..oHHHHhhhhho...',
    '..oHHHhhhhhho...',
    '..oHHhhhhhhsso..',
    '..oHhhhhhhssso..',
    '..oHhhhhhsddso..',
    '..oHhhhdsssoso..', // œil ; les cheveux s'arrêtent au-dessus de l'oreille
    '..oqhhdSDssssso.', // le lien sur la nuque, l'oreille, le nez
    '..ohdoSSssssSo..',
    '..ohdosssssDSo..', // bouche
    '..ohdosssssssSo.', // menton
    '..ohdoDSSSSSSDo.',
    '..ohdoDDoooooo..',
    '..ohdSSSSSSo....', // cou ; la queue pend derrière
    '..ohesssssSSo...',
    '..osssssssssSo..',
  ];

  // Barbe courte de profil (rangées 9 à 13, colonnes 6 à 13).
  const beardSide: Grid = [
    'dd..ddd.',
    'dddd.Dd.',
    'ddddddde',
    '.ddddeee',
  ];

  // Corps de profil (rangées 17 à 37) : dos large, poitrine bombée, la bavette du tablier devant (le cuir épais forme le bord
  // avant), la lanière du dos à la taille ; le cuir descend aux genoux devant, les braies se voient derrière ; jambes et bottes.
  const bodySide: Grid = [
    '..osssssssSAo...',
    '..osssssssSAo...',
    '..osssssssSAAo..',
    '..oSsssssSSaAo..',
    '..oSsssssSSaAo..',
    '..oqqqqqqqqaAo..', // la lanière du tablier, à la taille
    '..oPpppppqaaAo..',
    '..oPpppppqaaAo..',
    '..oPppppppqaAo..',
    '..oPppppppqaAo..',
    '..oPppppppqaAo..',
    '..oPPpppppqaAo..',
    '...oPppppqaaAo..',
    '...oPpppppqqqo..',
    '....oPpPpPpo....',
    '....oPpPpPpo....',
    '....oPPpPPpo....',
    '....okkKKKKKo...',
    '....okkkKKKKKo..',
    '....okkkkkkkko..',
    '....oooooooooo..',
  ];

  // Bras côté spectateur : gros biceps, avant-bras épais, poing ; bordé de l'ombre de la peau pour se détacher du torse, sans
  // contour intérieur ; une brûlure sur l'avant-bras.
  const armSide: Grid = [
    '.DDD.',
    'DsssSD',
    'DsssSD',
    'DsssSD',
    'DsssSD',
    '.DssSD', // coude
    'DsssSD',
    'DsbsSD',
    'DsssSD',
    '.DssSD', // poignet
    'DsssSD',
    'DSSSSD',
    '.DDDD.',
  ];

  // ---------- Composition ----------

  function shadow(c: Canvas, facing: Facing) {
    if (facing === 'right') c.ellipse(16.5, 45.5, 5.5, 2, 'x');
    else c.ellipse(16.5, 45.5, 7, 2, 'x');
  }

  /** Une image du forgeron : de face, de dos ou de profil droit ; coiffure ; barbe. */
  function smith(facing: Facing, hair: Hair, beard = false): Grid {
    const c = new Canvas(W, H);
    shadow(c, facing);
    if (facing === 'down') {
      c.stamp(bodyFront, OX, TOP_Y + 17);
      c.stamp(hair === 'loose' ? headFrontLoose : headFrontTied, OX, TOP_Y);
      if (beard) c.stamp(beardFront, OX + 3, TOP_Y + 9);
    } else if (facing === 'up') {
      c.stamp(bodyBack, OX, TOP_Y + 17);
      c.stamp(hair === 'loose' ? headBackLoose : headBackTied, OX, TOP_Y);
      if (hair === 'tied') c.stamp(tailBack, OX + 7, TOP_Y + 17);
    } else {
      c.stamp(bodySide, OX, TOP_Y + 17);
      c.stamp(hair === 'loose' ? headSideLoose : headSideTied, OX, TOP_Y);
      c.stamp(armSide, OX + 5, TOP_Y + 15);
      if (beard) c.stamp(beardSide, OX + 6, TOP_Y + 9);
    }
    return selOut(c.toGrid(), DARK);
  }
  return { palette, smith };
})();
