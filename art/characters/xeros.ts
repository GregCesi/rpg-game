// Xéros — 14 ans, jeune paysan sec et maigre. Coupe au bol brun foncé, côtés rasés (dessinés en peau :
// à ~5 cm par pixel, 3-6 mm de repousse ne se voient pas), tunique de lin beige serrée à la ceinture.
// Frame 32x48. Les pieds touchent y=45, l'ombre est dessinée dessous. 31 px de haut (y=14 à y=45).
// Couleurs du portrait 64 px (peau, cheveux, lin), qui fait référence.
// Les grilles de face et de dos sont écrites en deux moitiés (gauche | droite) : la lumière vient
// d'en haut à gauche, la moitié droite est plus sombre. Le contour suit selOut, comme la mère.
// La vue gauche est la vue droite retournée.

import { Canvas, EMPTY, flipX, selOut, type Grid } from '../lib/canvas';
import type { ToolPose, Vec, View } from '../lib/held';
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
  /** Mains jointes, dans la frame : là où finissent les bras. */
  hands: Vec;
  /**
   * Pose de l'outil. Sa prise (`tool.hand`, la main la plus proche du fer) est sur les mains, ou décalée de quelques
   * pixels le long du manche quand un outil long doit atteindre sa cible sans toucher au corps.
   */
  tool: ToolPose;
  /** Coudes (face et dos : gauche puis droit ; profil : le bras côté spectateur). */
  elbows: Vec[];
  arms: ArmLayer;
}

const pose = (
  hand: Vec, head: ToolPose['head'], edge: ToolPose['edge'], behind: boolean, elbows: Vec[], arms: ArmLayer, view: View, grip: Vec,
): UseBody => ({ hands: hand, tool: { hand: grip, head, edge, behind, ...(view === 'edge' ? { view } : {}) }, elbows, arms });

/** Pose d'un coup horizontal : on voit la face de l'outil, de profil (art/lib/held.ts, dessins `diag` et `upright`). */
const face = (
  hand: Vec, head: ToolPose['head'], edge: ToolPose['edge'], behind: boolean, elbows: Vec[], arms: ArmLayer = 'front', grip: Vec = hand,
) => pose(hand, head, edge, behind, elbows, arms, 'face', grip);

/** Pose d'un coup vertical : on voit l'outil par la tranche (art/lib/held.ts, dessins `flat*`). */
const edgeOn = (
  hand: Vec, head: ToolPose['head'], edge: ToolPose['edge'], behind: boolean, elbows: Vec[], arms: ArmLayer = 'front', grip: Vec = hand,
) => pose(hand, head, edge, behind, elbows, arms, 'edge', grip);

// Épaules, dans la frame : face/dos à gauche et à droite du torse, profil au milieu du dos.
const SHOULDER_L: Vec = [11, BODY_Y + 2];
const SHOULDER_R: Vec = [20, BODY_Y + 2];
const SHOULDER_SIDE: Vec = [14, BODY_Y + 2];

// Coup horizontal (use-*), sur ce qui est debout : la hache tourne à plat autour de Xéros, à hauteur de tronc
// (mains à hauteur de ceinture). On voit la face du fer, de profil : le tranchant en éventail mène le coup (côté 'ccw' :
// la hache tourne dans le sens inverse des aiguilles d'une montre, vue d'en haut). Armée sur le côté, elle passe devant
// lui puis mord le tronc.
const USE_BODY: Record<'down' | 'up' | 'right', UseBody[]> = {
  // de face (l'arbre au sud) : armée à sa droite (à gauche de l'image), le fer tourne vers nous et mord le tronc
  // devant lui ; puis on le dégage
  down: [
    face([10, 34], 'nw', 'ccw', true, [[8, 36], [16, 37]]),
    face([12, 37], 'w', 'ccw', false, [[9, 37], [18, 38]]),
    face([16, 38], 'sw', 'ccw', false, [[11, 38], [20, 38]], 'front', [18, 37]),
    face([14, 37], 'sw', 'ccw', false, [[10, 38], [19, 38]], 'front', [16, 36]),
  ],
  // de dos (l'arbre au nord) : armée en arrière à sa droite, le fer vers nous ; il tourne par la droite et mord
  // le tronc devant lui, à droite de la tête, puis revient
  up: [
    face([22, 37], 'se', 'ccw', false, [[12, 37], [23, 35]], 'body'),
    face([24, 34], 'e', 'ccw', false, [[12, 36], [24, 32]], 'body'),
    face([21, 31], 'ne', 'ccw', true, [[12, 35], [23, 33]], 'body'),
    face([23, 33], 'ne', 'ccw', true, [[12, 36], [24, 34]], 'body'),
  ],
  // de profil : armée derrière son dos, elle tourne par le côté proche de nous (fer vers le spectateur),
  // mord le tronc devant lui, puis on la dégage d'un pixel
  right: [
    face([11, 35], 'w', 'ccw', false, [[14, 36]]),
    face([18, 37], 'se', 'ccw', false, [[16, 36]]),
    face([22, 34], 'ne', 'ccw', false, [[18, 35]]),
    face([20, 35], 'ne', 'ccw', false, [[17, 35]]),
  ],
};

/** Pose de l'outil pour chaque image des animations use-down, use-up et use-right. */
export const USE_POSES: Record<'down' | 'up' | 'right', ToolPose[]> = {
  down: USE_BODY.down.map((b) => b.tool),
  up: USE_BODY.up.map((b) => b.tool),
  right: USE_BODY.right.map((b) => b.tool),
};

// Coup vertical (chop-*), de haut en bas sur ce qui est couché ou posé au sol : on voit la hache par la tranche,
// un bloc de fer étroit et sombre au bout du manche. Armée au-dessus de la tête, elle s'abat ; à l'impact le manche est
// vertical et le bloc est dans l'encoche, au sol devant Xéros ; puis on le dégage.

/** Image de l'impact dans les animations chop-* (0 à 3). */
export const CHOP_IMPACT = 2;
export const CHOP_FRAME_RATE = 9;

const CHOP_BODY: Record<'down' | 'up' | 'right', UseBody[]> = {
  // de face (le tronc au sud) : armée haut derrière la tête, elle revient devant le front, puis le fer frappe
  // le dessus du tronc quelques pixels sous les pieds, manche vertical, et on le dégage
  down: [
    edgeOn([16, 11], 'n', 'cw', true, [[7, 21], [24, 21]], 'head'),
    edgeOn([16, 18], 'n', 'cw', false, [[8, 26], [24, 26]]),
    edgeOn([16, 42], 's', 'ccw', false, [[12, 38], [20, 38]], 'front', [16, 35]),
    edgeOn([16, 39], 's', 'ccw', false, [[11, 37], [21, 37]], 'front', [16, 33]),
  ],
  // de dos (le tronc au nord, son dessus 18 à 22 px au-dessus des pieds, derrière la taille et le dos) : le fer est
  // armé derrière la tête, pendu vers nous ; il passe au-dessus de la tête, puis frappe l'encoche derrière le corps.
  // Les mains sont décalées à droite : le manche vertical et le fer dépassent du flanc droit
  up: [
    edgeOn([18, 12], 's', 'ccw', false, [[8, 21], [25, 21]], 'head'),
    edgeOn([21, 10], 'n', 'cw', true, [[9, 21], [26, 20]], 'head'),
    edgeOn([24, 37], 'n', 'cw', true, [[14, 39], [20, 39]], 'body', [24, 39]),
    edgeOn([24, 35], 'n', 'cw', true, [[14, 38], [20, 38]], 'body', [24, 37]),
  ],
  // de profil : armée derrière la tête, elle repart en avant au-dessus de lui, puis le fer frappe le dessus de la
  // bille posée devant lui, manche vertical, et on le dégage
  right: [
    edgeOn([12, 12], 'nw', 'cw', true, [[6, 23]], 'head'),
    edgeOn([22, 21], 'ne', 'ccw', false, [[19, 28]]),
    edgeOn([24, 29], 'se', 'cw', false, [[19, 32]], 'front', [23, 26]),
    edgeOn([23, 27], 'se', 'cw', false, [[19, 31]], 'front', [22, 25]),
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
    arm(c, [SHOULDER_L, el, b.hands], 't', 'L');
    arm(c, [SHOULDER_R, er, b.hands], 'T', 't');
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
    arm(c, [SHOULDER_SIDE, b.elbows[0], b.hands], 't', 'L');
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

/** Images de walk-down et walk-up : [legL, legR, bob] de frontal. */
const WALK_FRONTAL: [number, number, number][] = [[0, -2, 0], [0, 0, -1], [-2, 0, 0], [0, 0, -1]];
/** Images de walk-right : [spread, arm, bob, swapLegs] de side. */
const WALK_SIDE: [number, number, number, boolean][] = [[1, -1, 0, false], [0, 0, -1, false], [1, 1, 0, true], [0, 0, -1, false]];

const walkFrontal = (f: Facing) => WALK_FRONTAL.map(([l, r, bob]) => frontal(f, l, r, bob));

const walkRight = WALK_SIDE.map(([spread, arm, bob, swap]) => side(spread, arm, bob, swap));

// ---------- Porter (carry-*) ----------
// Une charge lourde tenue à deux mains contre soi (une bille d'un mètre). La charge est une image à part que le jeu
// pose sur les mains : devant le corps de face et de profil, derrière le corps de dos. On dessine le corps seul :
// bras tendus vers l'avant, mains jointes à hauteur de ventre ; le pas de la marche, plus court, un peu plus lent ;
// de profil, la tête recule d'un pixel (dos cambré pour équilibrer la charge).

export const CARRY_FRAME_RATE = 6;

interface CarryBody {
  /** Mains jointes, dans la frame, avant le rebond de la marche. */
  hands: Vec;
  /** Coudes (face et dos : gauche puis droit ; profil : le bras côté spectateur). */
  elbows: Vec[];
}

const CARRY_BODY: Record<'down' | 'up' | 'right', CarryBody> = {
  // de face : les bras descendent le long des flancs et reviennent devant le ventre, raccourcis par la perspective
  down: { hands: [16, 37], elbows: [[9, 36], [22, 36]] },
  // de dos : les mains sont devant lui, cachées par le corps ; seuls les coudes dépassent des flancs
  up: { hands: [16, 36], elbows: [[9, 35], [22, 35]] },
  // de profil : le bras descend sous l'épaule, coude contre la taille, l'avant-bras part devant le ventre
  right: { hands: [21, 36], elbows: [[16, 37]] },
};

/** Rebond de chaque image de la marche chargée (0 au repos) : celui de la marche. */
const CARRY_BOB = [0, -1, 0, -1];

const down1 = (v: Vec, bob: number): Vec => [v[0], v[1] + bob];

// Bras partis vers l'avant : ils naissent un pixel sous le haut de l'épaule, qui garde son contour.
const CARRY_SHOULDER_L: Vec = [SHOULDER_L[0], SHOULDER_L[1] + 1];
const CARRY_SHOULDER_R: Vec = [SHOULDER_R[0], SHOULDER_R[1] + 1];
const CARRY_SHOULDER_SIDE: Vec = [SHOULDER_SIDE[0], SHOULDER_SIDE[1] + 1];

function carryFrontal(facing: Facing, legL: number, legR: number, bob: number): Grid {
  const b = CARRY_BODY[facing];
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 6;
  const legY = BODY_Y + 10;
  c.stamp(legLeft, ox + 5, legY + legL);
  c.stamp(legRight, ox + 11, legY + legR);
  const arms = () => {
    rim(c);
    const [el, er] = b.elbows;
    arm(c, [down1(CARRY_SHOULDER_L, bob), down1(el, bob), down1(b.hands, bob)], 't', 'L');
    arm(c, [down1(CARRY_SHOULDER_R, bob), down1(er, bob), down1(b.hands, bob)], 'T', 't');
  };
  if (facing === 'up') arms();
  c.stamp(bareTorso(facing === 'down' ? torsoFront : torsoBack), ox, BODY_Y + bob);
  c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + bob);
  if (facing === 'down') arms();
  rim(c);
  return selOut(c.toGrid(), DARK);
}

function carrySide(spread: number, bob: number, swapLegs = false): Grid {
  const b = CARRY_BODY.right;
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 7;
  const legY = BODY_Y + 10;
  const back = swapLegs ? legSide : backLeg(legSide);
  const front = swapLegs ? backLeg(legSide) : legSide;
  c.stamp(back, ox + 4 - spread, legY);
  c.stamp(front, ox + 6 + spread, legY);
  c.stamp(bodySide, ox, BODY_Y + bob);
  c.stamp(headSide, ox - 1, HEAD_Y + bob);
  rim(c);
  arm(c, [down1(CARRY_SHOULDER_SIDE, bob), down1(b.elbows[0], bob), down1(b.hands, bob)], 't', 'L');
  rim(c);
  return selOut(c.toGrid(), DARK);
}

// Pas plus court que la marche : la jambe ne se lève que d'un pixel.
const carryWalkFrontal = (f: Facing) => [
  carryFrontal(f, 0, -1, CARRY_BOB[0]),
  carryFrontal(f, 0, 0, CARRY_BOB[1]),
  carryFrontal(f, -1, 0, CARRY_BOB[2]),
  carryFrontal(f, 0, 0, CARRY_BOB[3]),
];
const carryWalkRight = [carrySide(1, CARRY_BOB[0]), carrySide(0, CARRY_BOB[1]), carrySide(1, CARRY_BOB[2], true), carrySide(0, CARRY_BOB[3])];

/**
 * Point des mains, depuis les pieds (dx = x − 16, dy = y − 48 dans la frame, comme src/content/gestures.json) :
 * `idle` pour carry-idle-*, `walk` pour chaque image de carry-walk-*. La gauche est le miroir de la droite (dx opposé).
 */
export const CARRY_HANDS: Record<'down' | 'up' | 'right', { idle: { dx: number; dy: number }; walk: { dx: number; dy: number }[] }> = (() => {
  const at = ([x, y]: Vec, bob: number) => ({ dx: x - 16, dy: y + bob - 48 });
  const dir = (d: 'down' | 'up' | 'right') => ({ idle: at(CARRY_BODY[d].hands, 0), walk: CARRY_BOB.map((bob) => at(CARRY_BODY[d].hands, bob)) });
  return { down: dir('down'), up: dir('up'), right: dir('right') };
})();

// ---------- Mains à l'attente et à la marche (idle-*, walk-*) ----------
// Un objet tenu d'une main (une branche) est une image à part que le jeu pose sur la main, image par image.

/** Point d'accroche depuis les pieds (dx = x − 16, dy = y − 48 dans la frame) ; `behind` : l'objet passe sous le corps. */
export interface HoldPoint { dx: number; dy: number; behind: boolean }
/** Les deux mains de Xéros (sa gauche et sa droite, pas celles de l'image). */
export interface HandPair { left: HoldPoint; right: HoldPoint }

const holdAt = ([x, y]: Vec, behind: boolean): HoldPoint => ({ dx: x - 16, dy: y - 48, behind });

/**
 * Mains pendantes de face et de dos, pour frontal(legL, legR, bob) : le poing fait 2 × 2 px, le point est son pixel
 * en bas à gauche (bras gauche de l'image : x = 9 ; bras droit de l'image : x = 21). La main remonte d'un pixel
 * quand le bras part en avant. De face, la main droite de Xéros est à gauche de l'image ; de dos, à droite. De dos, ce
 * qu'il tient passe sous le corps : la main le recouvre, seul ce qui dépasse de la silhouette se voit.
 */
function frontalHands(facing: Facing, legL: number, legR: number, bob: number): HandPair {
  const imgLeft = holdAt([9, 37 + bob - (legR < 0 ? 1 : 0)], facing === 'up');
  const imgRight = holdAt([21, 37 + bob - (legL < 0 ? 1 : 0)], facing === 'up');
  return facing === 'down' ? { right: imgLeft, left: imgRight } : { left: imgLeft, right: imgRight };
}

/**
 * Profil droit, pour side(spread, arm, bob) : la main droite est celle du bras côté spectateur (armSide, poing en
 * x = 14..15, y = 37..38, point en bas à gauche) ; la gauche est de l'autre côté du corps, cachée, un pixel plus haut (plus loin) et balancée
 * à l'opposé.
 */
function sideHands(arm: number, bob: number): HandPair {
  return { right: holdAt([14 + arm, 38 + bob], false), left: holdAt([13 - arm, 37 + bob], true) };
}

/**
 * Point de chaque main pour idle-* (`idle`) et chaque image de walk-* (`walk`), dans l'ordre des images.
 * La gauche de l'écran est le miroir de la droite : dx opposé, image de l'objet retournée ; une fois retourné, le bras
 * côté spectateur est sa main gauche, si bien que la main gauche de Xéros vers la gauche est le miroir de sa main
 * droite vers la droite (et inversement).
 */
export const HAND_POINTS: Record<'down' | 'up' | 'right', { idle: HandPair; walk: HandPair[] }> = {
  down: { idle: frontalHands('down', 0, 0, 0), walk: WALK_FRONTAL.map(([l, r, b]) => frontalHands('down', l, r, b)) },
  up: { idle: frontalHands('up', 0, 0, 0), walk: WALK_FRONTAL.map(([l, r, b]) => frontalHands('up', l, r, b)) },
  right: { idle: sideHands(0, 0), walk: WALK_SIDE.map(([, arm, bob]) => sideHands(arm, bob)) },
};

// ---------- La hache sur l'épaule (shoulder-*) ----------
// La main droite remonte tenir le manche devant la poitrine, le manche posé sur l'épaule droite, le fer derrière
// elle, au-dessus de l'épaule ; l'autre bras pend et balance comme à la marche. La hache est une image à part
// (held-axe, art/items/carried.ts), centrée sur le poing droit. Même pas et même cadence que walk-*.

interface ShoulderBody {
  /** Poing droit, dans la frame, au repos : le centre de l'image de la hache. */
  hand: Vec;
  /** Coude droit. */
  elbow: Vec;
}

const SHOULDER_BODY: Record<'down' | 'up' | 'right', ShoulderBody> = {
  // de face : sa droite est à gauche de l'image ; le coude reste au flanc, le poing remonte devant l'épaule
  down: { hand: [12, 33], elbow: [9, 36] },
  // de dos : sa droite est à droite de l'image ; le poing est devant lui, caché ; le coude dépasse du flanc
  up: { hand: [19, 33], elbow: [22, 36] },
  // de profil : le coude contre la taille, le poing devant la poitrine
  right: { hand: [16, 34], elbow: [15, 37] },
};

function shoulderFrontal(facing: Facing, legL: number, legR: number, bob: number): Grid {
  const b = SHOULDER_BODY[facing];
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 6;
  const legY = BODY_Y + 10;
  c.stamp(legLeft, ox + 5, legY + legL);
  c.stamp(legRight, ox + 11, legY + legR);
  const torso = facing === 'down' ? torsoFront : torsoBack;
  // le bras qui pend : à droite de l'image de face (sa gauche), à gauche de dos (sa gauche aussi)
  const hanging = facing === 'down'
    ? torso.map((row, y) => '.....' + row + armRight(legL < 0)[y])
    : torso.map((row, y) => armLeft(legR < 0)[y] + row + '.....');
  const shoulder = facing === 'down' ? SHOULDER_L : SHOULDER_R;
  const raised = () => {
    rim(c);
    arm(c, [down1(shoulder, bob), down1(b.elbow, bob), down1(b.hand, bob)], facing === 'down' ? 't' : 'T', facing === 'down' ? 'L' : 't');
  };
  if (facing === 'up') raised();
  c.stamp(hanging, ox, BODY_Y + bob);
  c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + bob);
  if (facing === 'down') raised();
  rim(c);
  return selOut(c.toGrid(), DARK);
}

function shoulderSide(spread: number, bob: number, swapLegs = false): Grid {
  const b = SHOULDER_BODY.right;
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 7;
  const legY = BODY_Y + 10;
  const back = swapLegs ? legSide : backLeg(legSide);
  const front = swapLegs ? backLeg(legSide) : legSide;
  c.stamp(back, ox + 4 - spread, legY);
  c.stamp(front, ox + 6 + spread, legY);
  c.stamp(bodySide, ox, BODY_Y + bob);
  c.stamp(headSide, ox, HEAD_Y + bob);
  rim(c);
  arm(c, [down1(SHOULDER_SIDE, bob), down1(b.elbow, bob), down1(b.hand, bob)], 't', 'L');
  rim(c);
  return selOut(c.toGrid(), DARK);
}

const shoulderWalkFrontal = (f: Facing) => WALK_FRONTAL.map(([l, r, bob]) => shoulderFrontal(f, l, r, bob));
const shoulderWalkRight = WALK_SIDE.map(([spread, , bob, swap]) => shoulderSide(spread, bob, swap));

/**
 * Où le jeu pose le centre de l'image held-axe, pour shoulder-idle-* (`idle`) et chaque image de shoulder-walk-*
 * (`walk`) : le poing droit, qui suit le rebond de la marche. De face et de profil, la hache passe devant le corps (le
 * poing se dessine dans son image) ; de dos aussi : le fer est derrière lui, donc de notre côté, et l'image ne montre
 * pas ce que le corps cache. La gauche est le miroir de la droite (la hache passe alors sur l'épaule côté spectateur).
 */
export const SHOULDER_POINTS: Record<'down' | 'up' | 'right', { idle: HoldPoint; walk: HoldPoint[] }> = (() => {
  const dir = (d: 'down' | 'up' | 'right', bobs: number[]) => ({
    idle: holdAt(SHOULDER_BODY[d].hand, false),
    walk: bobs.map((bob) => holdAt(down1(SHOULDER_BODY[d].hand, bob), false)),
  });
  return {
    down: dir('down', WALK_FRONTAL.map(([, , b]) => b)),
    up: dir('up', WALK_FRONTAL.map(([, , b]) => b)),
    right: dir('right', WALK_SIDE.map(([, , b]) => b)),
  };
})();

// ---------- Pousser (push-*) ----------
// Xéros pousse une charge posée au sol (une bille qui roule) : mains libres, à plat contre la charge, à hauteur de
// ventre ; buste penché vers la poussée, tête rentrée dans les épaules (un pixel plus bas que debout) ; jambes écartées,
// le pied arrière en appui. Pas lents et lourds : la moitié de la cadence de walk-*. La charge est une image à part.

export const PUSH_FRAME_RATE = 4;

/** Une jambe de profil, de la hanche à la cheville, et sa botte (la pointe vers la poussée). */
function pushLeg(c: Canvas, hip: Vec, ankle: Vec, back: boolean) {
  const [pants, pantsShade, boot, bootLight] = back ? ['P', 'P', 'k', 'k'] : ['p', 'P', 'k', 'K'];
  capsule(c, hip[0] + 0.5, hip[1] + 0.5, ankle[0] + 0.5, ankle[1] + 0.5, 1.05, (_t, across) => (across > 0.4 ? pantsShade : pants));
  const [ax, ay] = ankle;
  c.rect(ax - 1, ay + 1, 3, 2, boot).rect(ax - 1, ay + 1, 2, 1, bootLight);
}

/**
 * Profil droit. feet : x de la cheville arrière (jambe du fond, plus sombre) et avant ; lift : la cheville qui avance
 * se lève d'un pixel ; swap : la jambe claire (côté spectateur) est derrière.
 */
function pushSide(backX: number, frontX: number, lift: 'back' | 'front' | null, swap: boolean): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 7;
  // buste penché : le haut du torse avance de deux pixels, la poitrine d'un, la ceinture reste sur les hanches
  const LEAN = [2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0];
  const leaned = bodySide.map((row, y) => '.'.repeat(LEAN[y]) + row);
  // le bras du fond, presque caché : il passe devant la poitrine, la main un pixel plus haut (plus loin)
  const shoulder: Vec = [SHOULDER_SIDE[0] + 2, SHOULDER_SIDE[1] + 1];
  const legs = () => {
    const ankleY = 43 - 1;
    const y = (which: 'back' | 'front') => ankleY - (lift === which ? 1 : 0);
    pushLeg(c, [12, 40], [backX, y('back')], !swap);
    pushLeg(c, [14, 40], [frontX, y('front')], swap);
  };
  legs();
  rim(c);
  arm(c, [shoulder, [20, 34], [24, 35]], 'T', 'T');
  c.stamp(leaned, ox, BODY_Y);
  c.stamp(headSide, ox + 2, HEAD_Y + 1);
  rim(c);
  arm(c, [shoulder, [20, 35], [24, 36]], 't', 'L');
  rim(c);
  return selOut(c.toGrid(), DARK);
}

/**
 * Face ou dos. legL/legR : décalage vertical de chaque jambe (négatif = levée). De face, les bras descendent de
 * l'épaule devant le ventre, mains écartées ouvertes vers nous ; de dos, ils partent devant lui, cachés par le corps.
 */
function pushFrontal(facing: Facing, legL: number, legR: number): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 6;
  const legY = BODY_Y + 10;
  // jambes écartées d'un pixel de plus qu'au repos
  c.stamp(legLeft, ox + 4, legY + legL);
  c.stamp(legRight, ox + 12, legY + legR);
  // épaules plus basses : le torse descend d'un pixel sous la tête, raccourci d'une rangée de tunique (le buste
  // penché vers nous ou loin de nous), si bien que l'ourlet reste où il est
  const torso = facing === 'down' ? torsoFront : torsoBack;
  const hunched = [...torso.slice(0, 7), ...torso.slice(8)];
  const shL: Vec = [SHOULDER_L[0], SHOULDER_L[1] + 2];
  const shR: Vec = [SHOULDER_R[0], SHOULDER_R[1] + 2];
  const arms = () => {
    rim(c);
    if (facing === 'down') {
      arm(c, [shL, [9, 36], [12, 39]], 't', 'L');
      arm(c, [shR, [22, 36], [19, 39]], 'T', 't');
    } else {
      arm(c, [shL, [9, 35], [13, 34]], 't', 'L');
      arm(c, [shR, [22, 35], [18, 34]], 'T', 't');
    }
  };
  if (facing === 'up') arms();
  c.stamp(bareTorso(hunched), ox, BODY_Y + 1);
  c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + 1);
  if (facing === 'down') arms();
  rim(c);
  return selOut(c.toGrid(), DARK);
}

// Pas lourd : une jambe ne se lève que d'un pixel, et la tête ne rebondit pas.
const pushWalkFrontal = (f: Facing) => [pushFrontal(f, 0, -1), pushFrontal(f, 0, 0), pushFrontal(f, -1, 0), pushFrontal(f, 0, 0)];
// De profil : grand écart, la jambe arrière ramenée (levée) sous le corps, puis l'autre jambe devant.
const pushWalkRight = [
  pushSide(9, 18, null, false),
  pushSide(13, 17, 'back', false),
  pushSide(9, 18, null, true),
  pushSide(13, 17, 'back', true),
];

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
    'carry-idle-down': { frames: [carryFrontal('down', 0, 0, 0)], frameRate: 1, repeat: 0 },
    'carry-idle-up': { frames: [carryFrontal('up', 0, 0, 0)], frameRate: 1, repeat: 0 },
    'carry-idle-right': { frames: [carrySide(0, 0)], frameRate: 1, repeat: 0 },
    'carry-idle-left': { frames: [flipX(carrySide(0, 0))], frameRate: 1, repeat: 0 },
    'carry-walk-down': { frames: carryWalkFrontal('down'), frameRate: CARRY_FRAME_RATE, repeat: -1 },
    'carry-walk-up': { frames: carryWalkFrontal('up'), frameRate: CARRY_FRAME_RATE, repeat: -1 },
    'carry-walk-right': { frames: carryWalkRight, frameRate: CARRY_FRAME_RATE, repeat: -1 },
    'carry-walk-left': { frames: carryWalkRight.map(flipX), frameRate: CARRY_FRAME_RATE, repeat: -1 },
    'shoulder-idle-down': { frames: [shoulderFrontal('down', 0, 0, 0)], frameRate: 1, repeat: 0 },
    'shoulder-idle-up': { frames: [shoulderFrontal('up', 0, 0, 0)], frameRate: 1, repeat: 0 },
    'shoulder-idle-right': { frames: [shoulderSide(0, 0)], frameRate: 1, repeat: 0 },
    'shoulder-idle-left': { frames: [flipX(shoulderSide(0, 0))], frameRate: 1, repeat: 0 },
    'shoulder-walk-down': { frames: shoulderWalkFrontal('down'), frameRate: 8, repeat: -1 },
    'shoulder-walk-up': { frames: shoulderWalkFrontal('up'), frameRate: 8, repeat: -1 },
    'shoulder-walk-right': { frames: shoulderWalkRight, frameRate: 8, repeat: -1 },
    'shoulder-walk-left': { frames: shoulderWalkRight.map(flipX), frameRate: 8, repeat: -1 },
    'push-idle-down': { frames: [pushFrontal('down', 0, 0)], frameRate: 1, repeat: 0 },
    'push-idle-up': { frames: [pushFrontal('up', 0, 0)], frameRate: 1, repeat: 0 },
    'push-idle-right': { frames: [pushSide(9, 18, null, false)], frameRate: 1, repeat: 0 },
    'push-idle-left': { frames: [flipX(pushSide(9, 18, null, false))], frameRate: 1, repeat: 0 },
    'push-walk-down': { frames: pushWalkFrontal('down'), frameRate: PUSH_FRAME_RATE, repeat: -1 },
    'push-walk-up': { frames: pushWalkFrontal('up'), frameRate: PUSH_FRAME_RATE, repeat: -1 },
    'push-walk-right': { frames: pushWalkRight, frameRate: PUSH_FRAME_RATE, repeat: -1 },
    'push-walk-left': { frames: pushWalkRight.map(flipX), frameRate: PUSH_FRAME_RATE, repeat: -1 },
  },
};

export default xeros;
