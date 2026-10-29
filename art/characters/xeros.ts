// Xéros — 14 ans, jeune paysan sec et maigre. Coupe au bol brun foncé, côtés rasés (dessinés en peau :
// à ~5 cm par pixel, 3-6 mm de repousse ne se voient pas), tunique de lin beige serrée à la ceinture.
// Frame 32x48. Les pieds touchent y=45, l'ombre est dessinée dessous. 31 px de haut (y=14 à y=45).
// Couleurs du portrait 64 px (peau, cheveux, lin), qui fait référence.
// Les grilles de face et de dos sont écrites en deux moitiés (gauche | droite) : la lumière vient
// d'en haut à gauche, la moitié droite est plus sombre. Le contour suit selOut, comme la mère.
// La vue gauche est la vue droite retournée.

import { Canvas, flipX, selOut, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE } from '../palette';
import { palette as portrait } from '../portraits/xeros';

const W = 32;
const H = 48;
const HEAD_Y = 14;
const BODY_Y = HEAD_Y + 16;

const palette = {
  o: OUTLINE,
  // cheveux (portrait : h H j)
  h: portrait.h,
  H: portrait.H,
  d: portrait.j,
  // peau (portrait : s S D) ; D sert au contour côté lumière et au dessous de la mâchoire
  s: portrait.s,
  S: portrait.S,
  D: portrait.D,
  // tunique de lin (portrait : L t T Y)
  L: portrait.L,
  t: portrait.t,
  T: portrait.T,
  Y: portrait.Y,
  b: '#5a3a22', // ceinture de cuir
  p: '#6f5640', // pantalon
  P: '#57422f',
  k: '#3d2a1f', // bottes
  K: '#5c4130',
  x: '#00000038', // ombre au sol
};

// Contour côté lumière : teinte la plus sombre de chaque matière.
const DARK: Record<string, string> = {
  h: 'd', H: 'd', d: 'd',
  s: 'D', S: 'D', D: 'D',
  L: 'Y', t: 'Y', T: 'Y', Y: 'Y',
  b: 'b',
  p: 'P', P: 'P',
  k: 'k', K: 'k',
};

/** Assemble des moitiés gauche | droite (10 + 10 colonnes). */
const halves = (rows: [string, string][]): Grid => rows.map(([l, r]) => l + r);

// ---------- Tête ----------

// Bol commun aux vues de face et de dos : reflet en haut à gauche, ombre à droite.
const bowlTop: [string, string][] = [
  ['.......ooo', 'ooo.......'],
  ['.....oohhh', 'hhhoo.....'],
  ['....ohHHHH', 'hhhhho....'],
  ['...ohHHHhh', 'hhhhhdo...'],
  ['..ohHHhhhh', 'hhhhhhdo..'],
  ['..ohHhhhhh', 'hhhhhhdo..'],
  ['..ohhhhhhh', 'hhhhhhdo..'],
];

// Face : le bord du bol s'arrête au-dessus des oreilles (y=22) et descend en frange sur le front (y=23).
// Tempes rasées en peau, oreilles qui dépassent, un pixel d'œil de chaque côté.
const headFront = halves([
  ...bowlTop,
  ['..ohhhhdhh', 'hhhdhhdo..'],
  ['..oddhhdhh', 'hhhdhddo..'],
  ['..ossddddd', 'dddddsSo..'],
  ['.oSssssoss', 'ssosssSSo.'],
  ['.oSssssoss', 'ssosssSSo.'],
  ['..osssssss', 'sssssSSo..'],
  ['...osssssS', 'SsssSSo...'],
  ['.....ossss', 'sssSo.....'],
  ['......oooo', 'oooo......'],
]);

// Dos : le bol vu de derrière, même bord ; dessous, l'arrière du crâne rasé et la nuque, claire.
const headBack = halves([
  ...bowlTop,
  ['..ohhhhhhh', 'hhhhhhdo..'],
  ['..ohhhhhhh', 'hhhhhhdo..'],
  ['..oddhhhhh', 'hhhhhddo..'],
  ['.oSssddddd', 'dddddsSSo.'],
  ['.oSsssssss', 'ssssssSSo.'],
  ['...ossssss', 'sssssSo...'],
  ['.......oos', 'Soo.......'],
  ['........os', 'So........'],
]);

// ---------- Corps, face et dos ----------
// Colonnes : 0-4 bras gauche, 5-14 torse, 15-19 bras droit. Le torse fait 10 px aux épaules,
// 8 à la taille (un pixel d'ombre le sépare des bras) et s'évase à 10 sous la ceinture.

const torsoFront: Grid = [
  '...osSo...', // cou
  'oooosSoooo', // épaules, encolure
  'LLLtTTtttt', // fente de l'encolure
  'LLttttttTT',
  'YLttttttTY',
  'YLttttttTY',
  'YbbbbbbbbY', // ceinture
  'YLtttttTTY',
  'LttttttTTT', // l'ourlet s'évase
  'LtttttTTTT',
  'oooooooooo',
];

// Dos : pas d'encolure, un pli qui descend de l'omoplate droite et reprend sous la ceinture.
const torsoBack: Grid = [
  '...osSo...',
  'oooottoooo',
  'LLLtttTttt',
  'LLttttTttT',
  'YLttttTtTY',
  'YLtttttTTY',
  'YbbbbbbbbY',
  'YLttttTtTY',
  'LtttttTTTT',
  'LttttTTTTT',
  'oooooooooo',
];

// Bras pendants. `raised` : la main remonte d'un pixel (bras qui part vers l'avant pendant la marche).
function armLeft(raised: boolean): Grid {
  const top = ['.....', '....o', '...oL', '..oLL', '..oLt'];
  return raised
    ? [...top, '..osS', '..osS', '..ooo', '....o', '....o', '.....']
    : [...top, '..oLt', '..osS', '..osS', '..ooo', '....o', '.....'];
}

function armRight(raised: boolean): Grid {
  const top = ['.....', 'o....', 'to...', 'tTo..', 'tTo..'];
  return raised
    ? [...top, 'sSo..', 'sSo..', 'ooo..', 'o....', 'o....', '.....']
    : [...top, 'tTo..', 'sSo..', 'sSo..', 'ooo..', 'o....', '.....'];
}

function bodyFrontal(torso: Grid, leftRaised: boolean, rightRaised: boolean): Grid {
  const l = armLeft(leftRaised);
  const r = armRight(rightRaised);
  return torso.map((row, y) => l[y] + row + r[y]);
}

// Jambes fines, bien séparées ; bottes de cuir.
const legLeft: Grid = ['opPo', 'opPo', 'opPo', 'oKko', 'oKko', 'oooo'];
const legRight: Grid = ['opPo', 'opPo', 'oPPo', 'oKko', 'okko', 'oooo'];

// ---------- Vue de profil (droite) ----------

// Le bol couvre le crâne jusqu'au-dessus de l'oreille et descend un peu plus bas derrière ;
// dessous, une petite bande rasée à la nuque. Œil, nez qui dépasse, oreille, mâchoire ombrée,
// cou court (2 px) qui disparaît dans le col.
const headSide: Grid = [
  '.....oooooo.......',
  '...oohhhhhhoo.....',
  '..ohHHHHhhhhho....',
  '.ohHHHhhhhhhhho...',
  '.ohHHhhhhhhhhhho..',
  'ohHhhhhhhhhhhhhho.',
  'ohhhhhhhhhhhhhhho.',
  'ohhhhhhhhhhhhhhho.',
  'ohhhhhhhhhhdhhdho.',
  'ohhhddddddddddddo.',
  'ohhdsSSsssssossso.',
  'ohsssSDsssssosssso',
  '.osssSDssssssssSo.',
  '..osssssssssssSo..',
  '...ossssSDDSSoo...',
  '....osSDoooo......',
];

// Torse de profil : col montant autour du cou, épaules plus larges que la taille,
// ourlet qui s'évase sous la ceinture. Dos éclairé à gauche.
const bodySide: Grid = [
  '...oLLttTTo.......',
  '..oLLttttttTo.....',
  '..oLtttttttTTo....',
  '..oLtttttttTTo....',
  '...oLttttttTo.....',
  '...oLttttttTo.....',
  '...obbbbbbbbo.....',
  '...oLtttttttTo....',
  '..oLttttttttTo....',
  '..oLttttttttTTo...',
  '..ooooooooooooo...',
];

// Bras côté spectateur, bordé de l'ombre du lin pour se détacher du torse ; il pend le long
// du corps, la main au bas de la tunique.
const armSide: Grid = [
  'YLLY',
  'YLLY',
  'YLLY',
  'YLLY',
  'YLLY',
  'YLtY',
  'DsSD',
  'DSSD',
  '.DD.',
];

const legSide: Grid = [
  'opPo.',
  'opPo.',
  'opPo.',
  'oKkko',
  'okkko',
  'ooooo',
];

// La jambe du fond est plus sombre pour qu'on lise la profondeur.
const backLeg = (g: Grid) => Canvas.from(g).recolor({ p: 'P', K: 'k' }).toGrid();

// ---------- Composition ----------

function shadow(c: Canvas) {
  c.ellipse(16.5, 45.5, 7, 2, 'x');
}

type Facing = 'down' | 'up';

/**
 * Face ou dos. legL/legR : décalage vertical de chaque jambe (négatif = levée).
 * bob : décalage du haut du corps. La main opposée à la jambe levée remonte d'un pixel.
 */
function frontal(facing: Facing, legL: number, legR: number, bob: number): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 6;
  const legY = BODY_Y + 10;
  c.stamp(legLeft, ox + 5, legY + legL);
  c.stamp(legRight, ox + 11, legY + legR);
  const torso = facing === 'down' ? torsoFront : torsoBack;
  c.stamp(bodyFrontal(torso, legR < 0, legL < 0), ox, BODY_Y + bob);
  c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + bob);
  return selOut(c.toGrid(), DARK);
}

/** Profil droit. spread : écart des jambes (0 = jambes jointes). arm : balancement du bras. */
function side(spread: number, arm: number, bob: number, swapLegs = false): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 7;
  const legY = BODY_Y + 10;
  const back = swapLegs ? legSide : backLeg(legSide);
  const front = swapLegs ? backLeg(legSide) : legSide;
  c.stamp(back, ox + 4 - spread, legY);
  c.stamp(front, ox + 6 + spread, legY);
  c.stamp(bodySide, ox, BODY_Y + bob);
  c.stamp(armSide, ox + 6 + arm, BODY_Y + 1 + bob);
  c.stamp(headSide, ox, HEAD_Y + bob);
  return selOut(c.toGrid(), DARK);
}

const walkFrontal = (f: Facing) => [
  frontal(f, 0, -2, 0),
  frontal(f, 0, 0, -1),
  frontal(f, -2, 0, 0),
  frontal(f, 0, 0, -1),
];

const walkRight = [side(1, -1, 0), side(0, 0, -1), side(1, 1, 0, true), side(0, 0, -1)];

const xeros: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'xeros',
  frameW: W,
  frameH: H,
  palette,
  animations: {
    'idle-down': { frames: [frontal('down', 0, 0, 0)], frameRate: 1, repeat: 0 },
    'idle-up': { frames: [frontal('up', 0, 0, 0)], frameRate: 1, repeat: 0 },
    'idle-right': { frames: [side(0, 0, 0)], frameRate: 1, repeat: 0 },
    'idle-left': { frames: [flipX(side(0, 0, 0))], frameRate: 1, repeat: 0 },
    'walk-down': { frames: walkFrontal('down'), frameRate: 8, repeat: -1 },
    'walk-up': { frames: walkFrontal('up'), frameRate: 8, repeat: -1 },
    'walk-right': { frames: walkRight, frameRate: 8, repeat: -1 },
    'walk-left': { frames: walkRight.map(flipX), frameRate: 8, repeat: -1 },
  },
};

export default xeros;
