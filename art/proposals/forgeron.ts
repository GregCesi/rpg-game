// Proposition : le forgeron du village (chantier « forge », CADRAGE-forge.md section 5). Essai hors jeu : rien ici n'est déclaré
// dans art/index.ts. Planche : npx tsx tools/essai-forge-forgeron.ts écrit .art-preview/forge-forgeron.png.
//
// Un homme fait, grand et très musclé : 1,90 m, soit 38 px de haut contour compris (y=8 à y=45 dans une frame de 32 × 48, pieds à
// y=45 comme Xéros et la mère), 16 px de large bras compris (x=8 à 23 : épaules larges, bras épais de 3 px, avant-bras
// puissants ; les personnages font 12). Tête carrée de 12 px (x=10 à 21), grosse mâchoire qui déborde des cheveux (le visage a
// 6 px au front et 8 px à la mâchoire). Cheveux blonds, longs jusqu'aux épaules, avec une raie ; deux coiffures : lâchés, ou
// attachés à la nuque pour le travail (on voit alors les oreilles et la queue dans le dos). Rasé, ou une barbe courte.
// Torse, épaules et bras nus sous un tablier de cuir de la poitrine aux genoux : bavette tenue par une lanière au cou ; dans le
// dos, deux lanières croisées et le nœud aux reins. Braies de laine brune, bottes de cuir. Peau hâlée, quelques brûlures d'un
// pixel sur les avant-bras.
//
// Construction comme Xéros et la mère : grilles écrites à la main (16 colonnes, posées à x=8), contour d'un pixel, contour côté
// lumière dans la teinte la plus sombre de chaque matière (selOut), lumière en haut à gauche (la moitié droite dans l'ombre).
// La tête (rangées 0 à 16 de la grille : jusqu'aux épaules, où tombent les cheveux) change avec la coiffure ; le corps (rangées
// 17 à 37) est commun.

import { Canvas, selOut, type Grid } from '../lib/canvas';
import { OUTLINE, world } from '../palette';

export const W = 32;
export const H = 48;
/** Haut de la silhouette : 38 px jusqu'aux pieds, à y=45. */
export const TOP_Y = 8;
/** Colonne gauche des grilles (16 px de large, centrées sur la frame). */
export const OX = 8;

export const palette: Record<string, string> = {
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

export type Hair = 'loose' | 'tied';
export type Facing = 'down' | 'up' | 'right';

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
export function smith(facing: Facing, hair: Hair, beard = false): Grid {
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

// ---------- Portrait 64 px ----------
// Construit comme ceux de Xéros et de la mère (art/portraits/) : formes pensées sur 64 px, yeux, sourcils et bouche en grilles
// écrites à la main, contour d'un pixel, contour côté lumière dans la teinte sombre de chaque matière. Buste de face : épaules
// nues larges, cou épais, tablier de cuir tenu au cou par sa lanière, tête carrée à grosse mâchoire, cheveux blonds à raie qui
// tombent derrière les épaules. Yeux gris-bleu.

const portraitPalette: Record<string, string> = {
  ...palette,
  l: '#e6b994', // pommette, arête du nez au soleil
  // yeux gris-bleu (le bleu de l'eau W w q de la palette, éteint vers la pierre)
  w: '#e9e0cf',
  i: '#5f7178',
  I: '#82959a',
  n: '#22140c',
  c: '#fff6ea',
  // bouche
  m: '#a5664f',
  M: '#7f4636',
  // cheveux : un reflet plus clair que le chaume au soleil
  G: '#ead08a',
};

const PORTRAIT_DARK: Record<string, string> = {
  ...DARK, G: 'e', l: 'D', m: 'D', M: 'D',
};

const eye: Grid = [
  'oooooo',
  'wiInIw',
];
const brow: Grid = [
  'dddddd',
  'eeeedd',
];

function drawPortrait(): Grid {
  const S = 64;
  const c = new Canvas(S, S);

  // --- cheveux, derrière : ils tombent sur la nuque et les épaules ---
  c.polygon([[13, 16], [51, 16], [53, 40], [52, 54], [44, 52], [20, 52], [12, 54], [11, 40]], 'h');
  c.within('h', (c) => c.polygon([[44, 20], [53, 30], [53, 56], [42, 56]], 'd'));

  // --- épaules nues, larges : les trapèzes montent vers le cou ---
  c.polygon([[0, 64], [1, 56], [8, 51], [18, 47], [46, 47], [56, 51], [63, 56], [64, 64]], 's');
  c.within('s', (c) => {
    c.polygon([[44, 47], [56, 51], [63, 56], [64, 64], [50, 64], [46, 55]], 'S');
    c.polygon([[0, 64], [1, 57], [5, 54], [6, 64]], 'S');
    c.polygon([[8, 52], [17, 48], [22, 48], [12, 53]], 'l');
    // creux de la clavicule
    c.line(16, 53, 25, 51, 'S');
    c.line(39, 51, 48, 53, 'D');
    // deltoïdes
    c.line(5, 55, 3, 64, 'S');
    c.line(58, 55, 60, 64, 'D');
  });
  // cicatrices de brûlure sur l'épaule
  c.set(10, 58, 'b');
  c.set(54, 60, 'b');

  // --- cou épais ---
  c.rect(24, 38, 16, 13, 's');
  c.within('s', (c) => {
    c.rect(35, 38, 5, 13, 'S');
    c.rect(24, 40, 16, 3, 'D');
    c.line(28, 44, 29, 50, 'S'); // le muscle du cou
  });

  // --- tablier : la bavette sur la poitrine, la lanière autour du cou ---
  c.polygon([[19, 57], [45, 57], [46, 64], [18, 64]], 'a');
  c.within('a', (c) => {
    c.rect(18, 57, 29, 1, 'A');
    c.polygon([[39, 58], [46, 58], [46, 64], [41, 64]], 'q');
  });
  c.line(20, 57, 25, 47, 'q');
  c.line(21, 57, 26, 47, 'A');
  c.line(44, 57, 39, 47, 'q');
  c.line(43, 57, 38, 47, 'Q');
  // les œillets de la lanière
  c.set(21, 59, 'Q');
  c.set(43, 59, 'Q');

  // --- visage carré, grosse mâchoire ---
  c.polygon([[19, 16], [45, 16], [46.5, 33], [46, 41], [41, 46.5], [23, 46.5], [18, 41], [17.5, 33]], 's');
  const shadeFace = () => c.within('s', (c) => {
    // ombre côté droit et sous la mâchoire
    c.polygon([[42, 22], [46.5, 30], [46, 41], [41, 46.5], [35, 46.5], [41, 41], [43, 33]], 'S');
    c.polygon([[23, 44.5], [41, 44.5], [40, 46.5], [24, 46.5]], 'D');
    // pommette éclairée
    c.ellipse(25, 34.5, 2, 1, 'l');
    // le creux de la joue et l'angle de la mâchoire
    c.line(20, 37, 22, 42, 'S');
    c.line(44, 36, 42, 42, 'D');
    // fossette du menton
    c.set(32, 45, 'S');
  });
  shadeFace();

  // --- cheveux devant : la raie un peu à droite, deux bandeaux qui couvrent les tempes et les oreilles ---
  const part = 34;
  c.polygon([[16, 12], [part, 10], [part, 15], [27, 19], [22, 23], [20, 30], [19.5, 38], [17, 50], [12, 52], [12, 30], [13, 18]], 'h');
  c.polygon([[part, 10], [48, 12], [51, 18], [52, 30], [52, 52], [47, 50], [44.5, 38], [44, 30], [42, 23], [38, 19], [part, 15]], 'h');
  c.within('h', (c) => {
    // reflets à gauche, sur le dessus et le long du bandeau
    c.polygon([[17, 13], [30, 11], [28, 14], [20, 17], [16, 22]], 'H');
    c.line(19, 18, 15, 40, 'H');
    c.line(23, 13, 26, 13, 'G');
    // mèches
    c.line(24, 16, 18, 34, 'd');
    c.line(16, 32, 15, 50, 'd');
    c.line(40, 14, 46, 24, 'd');
    c.line(47, 22, 48, 50, 'd');
    c.line(44, 28, 45, 44, 'd');
    // côté droit dans l'ombre
    c.polygon([[46, 16], [52, 22], [52, 52], [49, 51]], 'd');
    c.line(51, 30, 51, 52, 'e');
    // la raie
    c.line(part, 10, part, 14, 'e');
  });

  // --- la mâchoire, plus large que le visage, passe devant les cheveux ---
  c.polygon([[17.5, 35], [46.5, 35], [48, 40], [44, 47.5], [20, 47.5], [16, 40]], 's');
  c.within('s', (c) => {
    c.polygon([[42, 35], [46.5, 35], [48, 40], [44, 47.5], [36, 47.5], [43, 41]], 'S');
    c.polygon([[20, 45.5], [44, 45.5], [43.5, 47.5], [20.5, 47.5]], 'D');
    c.line(18, 38, 21, 44, 'S');
    c.line(46, 38, 43, 44, 'D');
    c.set(32, 46, 'S');
  });

  // --- détails ---
  const eyeY = 29;
  c.stamp(eye, 23, eyeY);
  c.stamp(eye.map((r) => [...r].reverse().join('')), 35, eyeY);
  // arcade lourde : sourcils bas et épais, posés sur les paupières
  c.stamp(brow, 23, 27);
  c.stamp(brow.map((r) => [...r].reverse().join('')), 35, 27);
  c.within('s', (c) => c.line(29, 28, 34, 28, 'S'));
  // nez large et droit
  c.line(33, 31, 33, 37, 'S');
  c.line(32, 31, 32, 36, 'l');
  c.line(29, 38, 35, 38, 'S');
  c.set(29, 37, 'D');
  c.set(35, 37, 'D');
  // bouche fine et ferme
  c.line(28, 41, 36, 41, 'M');
  c.line(29, 42, 35, 42, 'm');

  c.outline('o');
  return selOut(c.toGrid(), PORTRAIT_DARK);
}

/** Le portrait 64 px de face. */
export function portrait(): { grid: Grid; pal: Record<string, string> } {
  return { grid: drawPortrait(), pal: portraitPalette };
}
