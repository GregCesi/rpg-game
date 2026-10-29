// Xéros — 14 ans, jeune paysan sec et maigre. Coupe au bol brun foncé, côtés rasés (dessinés en peau :
// à ~5 cm par pixel, 3-6 mm de repousse ne se voient pas), tunique de lin beige serrée à la ceinture.
// Frame 32x48. Les pieds touchent y=45, l'ombre est dessinée dessous. 31 px de haut (y=14 à y=45).
// Couleurs du portrait 64 px (peau, cheveux, lin), qui fait référence.
// Les grilles de face et de dos sont écrites en deux moitiés (gauche | droite) : la lumière vient
// d'en haut à gauche, la moitié droite est plus sombre. Le contour suit selOut, comme la mère.
// La vue gauche est la vue droite retournée.

import { Canvas, EMPTY, flipX, selOut, type Grid } from '../lib/canvas';
import type { ToolPose, Vec } from '../lib/held';
import { capsule } from '../items/lib';
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

// Face : le bord du bol s'arrête au-dessus des oreilles et la frange au-dessus des yeux (y=22),
// avec une mèche plus longue au milieu du front. Tempes rasées en peau, oreilles qui dépassent,
// un pixel d'œil de chaque côté, sous une rangée de front dégagée.
const headFront = halves([
  ...bowlTop,
  ['..ohhhhdhh', 'hhhdhhdo..'],
  ['..osdddddd', 'dddddsSo..'],
  ['..osssssdd', 'ssssssSo..'],
  ['.oSssssoss', 'ssosssSSo.'],
  ['.oSssssoss', 'ssosssSSo.'],
  ['..osssssss', 'sssssSSo..'],
  ['...osssssS', 'SsssSSo...'],
  ['.....ossss', 'sssSo.....'],
  ['......oooo', 'oooo......'],
]);

// Dos : le bol vu de derrière descend jusqu'aux oreilles (y=25) ; dessous, l'arrière du crâne rasé garde
// la silhouette de la mâchoire vue de face, une seule rangée claire, le reste dans l'ombre de la tête.
const headBack = halves([
  ...bowlTop,
  ['..ohhhhhhh', 'hhhhhhdo..'],
  ['..ohhhhhhh', 'hhhhhhdo..'],
  ['..ohhhhhhh', 'hhhhhhdo..'],
  ['.oSdhhhhhh', 'hhhhhhdSo.'],
  ['.oSsdddddd', 'ddddddsSo.'],
  ['..osssssss', 'sssssSSo..'],
  ['...osSSSSS', 'SSSSSSo...'],
  ['.....oSSSS', 'SSSSo.....'],
  ['......oooS', 'Sooo......'],
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


// ---------- Geste d'outil (hache, pioche, houe...) ----------
// Le corps seul : l'outil est une image à part (planche tool-<objet>, art/lib/held.ts) que le jeu pose
// sur les mains, devant ou derrière le corps. Quatre temps : lever, armer, frapper (impact), retour.
// La tête ne bouge pas ; les jambes restent plantées.

/** Image de l'impact dans les animations use-* (0 à 3). */
export const USE_IMPACT = 2;
export const USE_FRAME_RATE = 10;

/** Où passent les bras : devant tout, sous la tête seulement (bras levés), ou sous le corps (vue de dos). */
type ArmLayer = 'front' | 'head' | 'body';

interface UseBody {
  tool: ToolPose;
  /** Coudes (face et dos : gauche puis droit ; profil : le bras côté spectateur). */
  elbows: Vec[];
  arms: ArmLayer;
}

const pose = (
  hand: Vec, head: ToolPose['head'], edge: ToolPose['edge'], behind: boolean, elbows: Vec[], arms: ArmLayer = 'front',
): UseBody => ({ tool: { hand, head, edge, behind }, elbows, arms });

// Épaules, dans la frame : face/dos à gauche et à droite du torse, profil au milieu du dos.
const SHOULDER_L: Vec = [11, BODY_Y + 2];
const SHOULDER_R: Vec = [20, BODY_Y + 2];
const SHOULDER_SIDE: Vec = [14, BODY_Y + 2];

const USE_BODY: Record<'down' | 'up' | 'right', UseBody[]> = {
  // de face : le fer monte devant le visage, passe derrière la tête, s'abat vers le spectateur, remonte un peu
  down: [
    pose([16, 31], 'n', 'cw', false, [[9, 35], [22, 35]]),
    pose([16, 13], 'n', 'cw', true, [[7, 22], [24, 22]], 'head'),
    pose([16, 39], 's', 'ccw', false, [[11, 37], [20, 37]]),
    pose([17, 36], 'se', 'ccw', false, [[10, 36], [21, 35]]),
  ],
  // de dos, les bras passent sous le corps : le fer se lève à droite, passe au-dessus de la tête,
  // puis frappe devant lui, caché par le corps (seuls les coudes dépassent)
  up: [
    pose([21, 34], 'ne', 'cw', true, [[10, 36], [22, 37]], 'body'),
    pose([25, 19], 'nw', 'ccw', false, [[9, 30], [26, 27]], 'body'),
    pose([16, 34], 'n', 'cw', true, [[9, 35], [22, 35]], 'body'),
    pose([18, 36], 'ne', 'cw', true, [[9, 37], [22, 37]], 'body'),
  ],
  // de profil : le fer se lève devant, passe au-dessus de la tête vers l'arrière, s'abat au sol devant les pieds,
  // remonte à l'horizontale
  right: [
    pose([21, 33], 'ne', 'cw', false, [[16, 36]]),
    pose([13, 13], 'w', 'cw', true, [[8, 23]]),
    pose([23, 37], 'se', 'cw', false, [[18, 35]]),
    pose([23, 34], 'e', 'cw', false, [[18, 35]]),
  ],
};

/** Pose de l'outil pour chaque image des animations use-down, use-up et use-right. */
export const USE_POSES: Record<'down' | 'up' | 'right', ToolPose[]> = {
  down: USE_BODY.down.map((b) => b.tool),
  up: USE_BODY.up.map((b) => b.tool),
  right: USE_BODY.right.map((b) => b.tool),
};

// Geste de haut en bas (chop-*), sur ce qui est couché ou posé au sol : le fer monte droit au-dessus de la tête,
// puis s'abat devant les pieds, bras tendus vers le sol ; au dernier temps, on le dégage du bois.
// Même corps, mêmes couches que use-* ; seule la trajectoire des mains change.

/** Image de l'impact dans les animations chop-* (0 à 3). */
export const CHOP_IMPACT = 2;
export const CHOP_FRAME_RATE = 9;

const CHOP_BODY: Record<'down' | 'up' | 'right', UseBody[]> = {
  // de face : le fer passe devant le visage, monte haut derrière la tête, s'abat juste devant les pieds
  // (sur le tronc couché au sud), puis on le dégage
  down: [
    pose([16, 30], 'n', 'cw', false, [[9, 34], [22, 34]]),
    pose([16, 10], 'n', 'cw', true, [[7, 20], [24, 20]], 'head'),
    pose([16, 42], 's', 'ccw', false, [[12, 37], [20, 37]]),
    pose([16, 39], 's', 'ccw', false, [[11, 36], [21, 36]]),
  ],
  // de dos : le fer se lève devant lui (caché par le corps, la tête du fer dépasse), monte au-dessus de la tête,
  // puis s'abat devant lui, au nord, sur le tronc : caché par le corps, seuls les coudes dépassent
  up: [
    pose([16, 28], 'n', 'cw', true, [[9, 32], [23, 32]], 'body'),
    pose([16, 10], 'n', 'cw', false, [[8, 21], [24, 21]], 'head'),
    pose([16, 37], 'n', 'cw', true, [[9, 37], [23, 37]], 'body'),
    pose([16, 35], 'n', 'cw', true, [[9, 36], [23, 36]], 'body'),
  ],
  // de profil : le fer se dresse devant le visage, bascule au-dessus de la tête vers l'arrière, s'abat devant lui
  // sur le dessus de ce qui est couché (un tronc couché a le dessus à une dizaine de pixels du sol), puis on le dégage
  right: [
    pose([20, 27], 'n', 'cw', false, [[18, 33]]),
    pose([14, 10], 'w', 'cw', true, [[10, 21]]),
    pose([22, 34], 'se', 'cw', false, [[18, 35]]),
    pose([21, 32], 'se', 'cw', false, [[17, 34]]),
  ],
};

/** Pose de l'outil pour chaque image des animations chop-down, chop-up et chop-right. */
export const CHOP_POSES: Record<'down' | 'up' | 'right', ToolPose[]> = {
  down: CHOP_BODY.down.map((b) => b.tool),
  up: CHOP_BODY.up.map((b) => b.tool),
  right: CHOP_BODY.right.map((b) => b.tool),
};

/** Tout ce qui n'est ni vide, ni ombre au sol, ni contour. */
const isMatter = (ch: string) => ch !== EMPTY && ch !== 'x' && ch !== 'o';

/** Contour d'un pixel autour de la matière (sur le vide et l'ombre au sol). */
function rim(c: Canvas) {
  const add: Vec[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = c.get(x, y);
    if (ch !== EMPTY && ch !== 'x') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isMatter(c.get(x + dx, y + dy)))) add.push([x, y]);
  }
  for (const [x, y] of add) c.set(x, y, 'o');
}

/**
 * Bras de l'épaule à la main, par le coude : manche de lin, mains de peau jointes sur le manche.
 * Bordé de contour sur le vide, et de la teinte la plus sombre de ce qu'il recouvre ailleurs
 * (pas de contour intérieur).
 */
function arm(c: Canvas, pts: Vec[], sleeve: string, sleeveLight: string) {
  const a = new Canvas(W, H);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    capsule(a, x0 + 0.5, y0 + 0.5, x1 + 0.5, y1 + 0.5, 1.05, (_t, across) => (across < -0.2 ? sleeveLight : sleeve));
  }
  const [hx, hy] = pts[pts.length - 1];
  a.rect(hx - 1, hy - 1, 3, 3, 's').rect(hx + 1, hy - 1, 1, 3, 'S').set(hx - 1, hy + 1, 'S').set(hx, hy + 1, 'S');
  const border: [number, number, string][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a.get(x, y) !== EMPTY) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => a.get(x + dx, y + dy) !== EMPTY)) continue;
    const under = c.get(x, y);
    border.push([x, y, isMatter(under) ? DARK[under] ?? 'o' : 'o']);
  }
  c.stamp(a.toGrid(), 0, 0);
  for (const [x, y, k] of border) c.set(x, y, k);
}

/** Torse sans bras pendants : seul le bord de l'épaule reste. */
const bareTorso = (torso: Grid): Grid => torso.map((row) => '.....' + row + '.....');

function useFrontal(facing: Facing, b: UseBody): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 6;
  const legY = BODY_Y + 10;
  c.stamp(legLeft, ox + 5, legY);
  c.stamp(legRight, ox + 11, legY);
  const torso = () => c.stamp(bareTorso(facing === 'down' ? torsoFront : torsoBack), ox, BODY_Y);
  const head = () => c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y);
  const arms = () => {
    rim(c);
    const [el, er] = b.elbows;
    arm(c, [SHOULDER_L, el, b.tool.hand], 't', 'L');
    arm(c, [SHOULDER_R, er, b.tool.hand], 'T', 't');
  };
  if (b.arms === 'body') arms();
  torso();
  if (b.arms === 'head') arms();
  head();
  if (b.arms === 'front') arms();
  rim(c);
  return selOut(c.toGrid(), DARK);
}

function useSide(b: UseBody): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 7;
  const legY = BODY_Y + 10;
  c.stamp(backLeg(legSide), ox + 3, legY);
  c.stamp(legSide, ox + 7, legY);
  c.stamp(bodySide, ox, BODY_Y);
  const arms = () => {
    rim(c);
    arm(c, [SHOULDER_SIDE, b.elbows[0], b.tool.hand], 't', 'L');
  };
  if (b.arms !== 'front') arms();
  c.stamp(headSide, ox, HEAD_Y);
  if (b.arms === 'front') arms();
  rim(c);
  return selOut(c.toGrid(), DARK);
}

const useDown = USE_BODY.down.map((b) => useFrontal('down', b));
const useUp = USE_BODY.up.map((b) => useFrontal('up', b));
const useRight = USE_BODY.right.map(useSide);
const chopDown = CHOP_BODY.down.map((b) => useFrontal('down', b));
const chopUp = CHOP_BODY.up.map((b) => useFrontal('up', b));
const chopRight = CHOP_BODY.right.map(useSide);

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
    'use-down': { frames: useDown, frameRate: USE_FRAME_RATE, repeat: 0 },
    'use-up': { frames: useUp, frameRate: USE_FRAME_RATE, repeat: 0 },
    'use-right': { frames: useRight, frameRate: USE_FRAME_RATE, repeat: 0 },
    'use-left': { frames: useRight.map(flipX), frameRate: USE_FRAME_RATE, repeat: 0 },
    'chop-down': { frames: chopDown, frameRate: CHOP_FRAME_RATE, repeat: 0 },
    'chop-up': { frames: chopUp, frameRate: CHOP_FRAME_RATE, repeat: 0 },
    'chop-right': { frames: chopRight, frameRate: CHOP_FRAME_RATE, repeat: 0 },
    'chop-left': { frames: chopRight.map(flipX), frameRate: CHOP_FRAME_RATE, repeat: 0 },
  },
};

export default xeros;
