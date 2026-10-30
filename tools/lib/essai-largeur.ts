// Essai de largeur de Xéros (chantier « largeur », étape 1) : le dessin actuel (18 px de large) et deux redessins,
// à 14 px (70 cm) et à 12 px (60 cm), de face, de profil (droite) et de dos, tous de 32 px de haut (1,60 m).
// Hors du jeu : rien ici n'est déclaré dans art/index.ts ni écrit dans src/generated. Aperçu : tools/essai-largeur.ts.
//
// Les grilles sont celles de la silhouette seule : 32 rangées (rangées 14 à 45 de la frame de 32 × 48), contour
// compris. Tête de 15 rangées (0 à 14), cou et corps de 12 (15 à 26), jambes de 6 (26 à 31, la première sous l'ourlet).
// Même construction que art/characters/xeros.ts : contour 'o' partout, puis selOut (teinte la plus sombre de la
// matière côté lumière) ; mêmes couleurs (palette de xeros, tirée du portrait).

import { Canvas, selOut, type Grid } from '../../art/lib/canvas';

const FRAME_W = 32;
const FRAME_H = 48;
const TOP = 14;

// Contour côté lumière : celui de xeros.ts.
const DARK: Record<string, string> = {
  h: 'd', H: 'd', d: 'd',
  s: 'D', S: 'D', D: 'D',
  L: 'Y', t: 'Y', T: 'Y', Y: 'Y',
  b: 'b',
  p: 'P', P: 'P',
  k: 'k', K: 'k',
};

// ---------- 12 px ----------
// Crâne de 10 px contour compris (intérieur 8), oreilles d'un pixel de chaque côté : 12. Yeux en x = 4 et 7 de la
// grille (2 px de joue, 2 entre les yeux, 2 de joue), deux rangées de haut. Bras de 2 px (manche claire, ombre),
// torse de 6 px, jambes de 4 px jointes (deux contours entre elles).

const head12Front: Grid = [
  '...oooooo...',
  '..ohHHhhho..',
  '.ohHHHhhhdo.',
  '.ohHHhhhhdo.',
  '.ohHhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhdhhhdo.', // mèches de la frange
  '.osddddddSo.', // bord du bol, tempes rasées
  '.osssddssSo.', // mèche plus longue au milieu du front
  'oSssossosSSo', // yeux, oreilles
  'oSssossosSSo',
  '.osssssssSo.',
  '..ossssSSo..',
  '...osssSo...',
  '....oooo....',
];

const head12Back: Grid = [
  '...oooooo...',
  '..ohHHhhho..',
  '.ohHHHhhhdo.',
  '.ohHHhhhhdo.',
  '.ohHhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  'oSdhhhhhhdSo', // le bol descend jusqu'aux oreilles
  'oSsddddddsSo',
  '.ossssssSSo.',
  '..osSSSSSo..',
  '...oSSSSo...',
  '....oooo....',
];

const body12Front: Grid = [
  '....osSo....', // cou
  '..ooosSooo..', // épaules, encolure
  '.oLLtTTttTo.', // fente de l'encolure
  'oLLLtttttTTo',
  'oLtYLttTYtTo', // bras séparés du torse par l'ombre du lin
  'oLtYLttTYtTo',
  'oLtYLttTYtTo',
  'osSYbbbbYsSo', // ceinture, mains
  'osSYLttTYsSo',
  'oooLttTTTooo', // l'ourlet sous les mains
  '..oLtTTTTo..',
  '...oooooo...',
];

const body12Back: Grid = [
  '....osSo....',
  '..ooottooo..',
  '.oLLtttTtTo.', // pli qui descend de l'omoplate droite
  'oLLLttTttTTo',
  'oLtYLtTtYtTo',
  'oLtYLttTYtTo',
  'oLtYLttTYtTo',
  'osSYbbbbYsSo',
  'osSYLtTtYsSo',
  'oooLttTTTooo',
  '..oLtTTTTo..',
  '...oooooo...',
];

const legs12: Grid = [
  '..opPoopPo..',
  '..opPoopPo..',
  '..opPooPPo..',
  '..oKkooKko..',
  '..oKkooKko..',
  '..oooooooo..',
];

// Profil : crâne de 11 px contour compris, le nez dépasse d'un pixel (12). Oreille en x = 3-4, œil en x = 7.
const head12Side: Grid = [
  '...ooooo....',
  '..ohHHhhho..',
  '.ohHHhhhhho.',
  'ohHhhhhhhho.',
  'ohhhhhhhhho.',
  'ohhhhhhhhho.',
  'ohhhhhhhhho.',
  'ohhhhhhdhdo.', // mèches
  'ohhdddddddo.', // bord du bol ; derrière, il descend plus bas
  'ohdSSssosso.', // oreille, œil
  'ohsSDssossso', // le nez dépasse
  '.osSDssssSo.',
  '..ossssssSo.',
  '...ossDDSo..', // dessous de la mâchoire
  '....osDooo..', // cou
];

const body12Side: Grid = [
  '...oLtTo....', // col autour du cou
  '..oLLtttTo..',
  '..oLttttTTo.',
  '..oLttttTTo.',
  '...oLtttTo..',
  '...oLtttTo..',
  '...oLtttTo..',
  '...obbbbbo..',
  '...oLttttTo.',
  '..oLtttttTo.',
  '..oLttttttTo',
  '..oooooooooo',
];

// Bras côté spectateur, bordé de l'ombre du lin.
const arm12Side: Grid = ['YLLY', 'YLLY', 'YLLY', 'YLtY', 'YLtY', 'YLtY', 'YLtY', 'DsSD', 'DSSD', '.DD.'];

// ---------- 14 px ----------
// Crâne de 12 px contour compris (intérieur 10), oreilles : 14. Yeux en x = 5 et 8 (3 px de joue, 2 entre les yeux,
// 3 de joue). Bras de 2 px, torse de 8, jambes de 4 px écartées de 2 (comme le dessin actuel).

const head14Front: Grid = [
  '...oooooooo...',
  '..ohHHhhhhho..',
  '.ohHHHhhhhhdo.',
  '.ohHHhhhhhhdo.',
  '.ohHhhhhhhhdo.',
  '.ohhhhhhhhhdo.',
  '.ohhhdhhhdhdo.',
  '.osddddddddSo.',
  '.ossssddsssSo.',
  'oSsssossossSSo',
  'oSsssossossSSo',
  '.ossssssssSSo.',
  '..osssssSSSo..',
  '...ossssSSo...',
  '....oooooo....',
];

const head14Back: Grid = [
  '...oooooooo...',
  '..ohHHhhhhho..',
  '.ohHHHhhhhhdo.',
  '.ohHHhhhhhhdo.',
  '.ohHhhhhhhhdo.',
  '.ohhhhhhhhhdo.',
  '.ohhhhhhhhhdo.',
  '.ohhhhhhhhhdo.',
  '.ohhhhhhhhhdo.',
  'oSdhhhhhhhhdSo',
  'oSsddddddddsSo',
  '.ossssssssSSo.',
  '..osSSSSSSSo..',
  '...oSSSSSSo...',
  '....oooooo....',
];

const body14Front: Grid = [
  '.....osSo.....',
  '..oooosSoooo..',
  '.oLLLtTTtttTo.',
  'oLLLLttttttTTo',
  'oLtYLttttTYtTo',
  'oLtYLttttTYtTo',
  'oLtYLttttTYtTo',
  'osSYbbbbbbYsSo',
  'osSYLttttTYsSo',
  'oooLtttttTTooo',
  '..oLttttTTTo..',
  '...oooooooo...',
];

const body14Back: Grid = [
  '.....osSo.....',
  '..oooottoooo..',
  '.oLLLtttTttTo.',
  'oLLLLtttTttTTo',
  'oLtYLttTtTYtTo',
  'oLtYLtttTTYtTo',
  'oLtYLtttTTYtTo',
  'osSYbbbbbbYsSo',
  'osSYLttTtTYsSo',
  'oooLtttTTTTooo',
  '..oLttTTTTTo..',
  '...oooooooo...',
];

const legs14: Grid = [
  '..opPo..opPo..',
  '..opPo..opPo..',
  '..opPo..oPPo..',
  '..oKko..oKko..',
  '..oKko..okko..',
  '..oooo..oooo..',
];

const head14Side: Grid = [
  '...oooooo.....',
  '..oohHHhhoo...',
  '.ohHHhhhhhho..',
  'ohHHhhhhhhhho.',
  'ohHhhhhhhhhho.',
  'ohhhhhhhhhhho.',
  'ohhhhhhhhhhho.',
  'ohhhhhhhdhhdo.',
  'ohhhddddddddo.',
  'ohdsSSsssosso.',
  'ohssSDsssossso',
  '.ossSDsssssSo.',
  '..ossssssssSo.',
  '...osssSDDSo..',
  '....osSDoooo..',
];

const body14Side: Grid = [
  '...oLLtTTo....',
  '..oLLttttTo...',
  '..oLtttttTTo..',
  '..oLtttttTTo..',
  '...oLttttTo...',
  '...oLttttTo...',
  '...oLttttTo...',
  '...obbbbbbo...',
  '...oLtttttTo..',
  '..oLttttttTo..',
  '..oLttttttTTo.',
  '..ooooooooooo.',
];

const arm14Side = arm12Side;

// Jambe de profil (celle de xeros.ts) ; la jambe du fond plus sombre.
const legSide: Grid = ['opPo.', 'opPo.', 'opPo.', 'oKkko', 'okkko', 'ooooo'];
const backLeg = (g: Grid) => Canvas.from(g).recolor({ p: 'P', K: 'k' }).toGrid();

// ---------- Composition ----------

interface WidthSet {
  w: number;
  headFront: Grid; headBack: Grid; headSide: Grid;
  bodyFront: Grid; bodyBack: Grid; bodySide: Grid;
  legs: Grid; armSide: Grid;
  /** Colonne de l'épaule du bras de profil, et des jambes (fond, devant) dans la grille de profil. */
  armX: number; legX: [number, number];
}

const SETS: Record<12 | 14, WidthSet> = {
  12: {
    w: 12, headFront: head12Front, headBack: head12Back, headSide: head12Side,
    bodyFront: body12Front, bodyBack: body12Back, bodySide: body12Side, legs: legs12, armSide: arm12Side,
    armX: 4, legX: [3, 5],
  },
  14: {
    w: 14, headFront: head14Front, headBack: head14Back, headSide: head14Side,
    bodyFront: body14Front, bodyBack: body14Back, bodySide: body14Side, legs: legs14, armSide: arm14Side,
    armX: 5, legX: [4, 6],
  },
};

function shadow(c: Canvas, rx: number) {
  c.ellipse(16.5, 45.5, rx, 2, 'x');
}

export type View = 'down' | 'right' | 'up';

/** Une frame de 32 × 48 (pieds à y = 45), de face, de profil droit ou de dos, à 12 ou 14 px de large. */
export function essaiFrame(width: 12 | 14, view: View): Grid {
  const s = SETS[width];
  const c = new Canvas(FRAME_W, FRAME_H);
  shadow(c, width / 2 - 0.5);
  const ox = 16 - s.w / 2;
  if (view === 'right') {
    c.stamp(backLeg(legSide), ox + s.legX[0], TOP + 26);
    c.stamp(legSide, ox + s.legX[1], TOP + 26);
    c.stamp(s.bodySide, ox, TOP + 15);
    c.stamp(s.armSide, ox + s.armX, TOP + 16);
    c.stamp(s.headSide, ox, TOP);
  } else {
    c.stamp(s.legs, ox, TOP + 26);
    c.stamp(view === 'down' ? s.bodyFront : s.bodyBack, ox, TOP + 15);
    c.stamp(view === 'down' ? s.headFront : s.headBack, ox, TOP);
  }
  return selOut(c.toGrid(), DARK);
}
