// Xéros — 14 ans, jeune paysan sec et maigre. Coupe au bol brun foncé, côtés rasés (dessinés en peau :
// à ~5 cm par pixel, 3-6 mm de repousse ne se voient pas), tunique de lin beige serrée à la ceinture.
// Frame 32x48. Les pieds touchent y=45, l'ombre est dessinée dessous. 32 px de haut (y=14 à y=45, 1,60 m) et 12 px de
// large (x=10 à 21, 60 cm : la carrure d'un adolescent maigre, bras compris).
// Couleurs du portrait 64 px (peau, cheveux, lin), qui fait référence.
// La lumière vient d'en haut à gauche : la moitié droite est plus sombre. Le contour suit selOut, comme la mère.
// La vue gauche est la vue droite retournée.
//
// Repères (dans la frame) : tête y=14 à 28 (15 rangées), cou y=29, épaules y=30 à 32, ceinture y=36, mains pendantes
// y=36-37, ourlet y=38-39, jambes y=40 à 45. De face : yeux en x=14 et 17 (y=23-24), oreilles en x=10 et 21, bras
// en x=11-12 et 19-20, torse en x=13 à 18, jambes en x=12-15 et 16-19. De profil : nez en x=21 (y=24), œil en x=17,
// oreille en x=13-14, bras côté spectateur en x=14 à 17.

import { Canvas, flipX, selOut, type Grid } from '../lib/canvas';
import type { ToolPose, Vec, View } from '../lib/held';
import { capsule } from '../items/lib';
import type { SpriteSheetSource } from '../lib/types';
import {
  W, H, HEAD_Y, BODY_Y, FRONT_X, SIDE_X, palette, DARK, headFront, headBack, torsoFront, torsoBack, legLeft, legRight, LEG_L, LEG_R, headSide, bodySide, legSide, LEG_SIDE, backLeg, shadow, rim, arm, bareTorso,
} from './xeros-body';
import { combatAnimations } from './xeros-combat';


// Bras pendants (3 colonnes : contour et manche de 2 px). `raised` : la main remonte d'un pixel (bras qui part vers
// l'avant pendant la marche).
function armLeft(raised: boolean): Grid {
  const top = ['...', '..o', '.oL', 'oLL'];
  return raised
    ? [...top, 'oLt', 'oLt', 'osS', 'osS', 'ooo', '..o', '..o', '...']
    : [...top, 'oLt', 'oLt', 'oLt', 'osS', 'osS', 'ooo', '..o', '...'];
}

function armRight(raised: boolean): Grid {
  const top = ['...', 'o..', 'To.', 'TTo'];
  return raised
    ? [...top, 'tTo', 'tTo', 'sSo', 'sSo', 'ooo', 'o..', 'o..', '...']
    : [...top, 'tTo', 'tTo', 'tTo', 'sSo', 'sSo', 'ooo', 'o..', '...'];
}

function bodyFrontal(torso: Grid, leftRaised: boolean, rightRaised: boolean): Grid {
  const l = armLeft(leftRaised);
  const r = armRight(rightRaised);
  return torso.map((row, y) => l[y] + row + r[y]);
}

/** Colonne du bras de profil, depuis SIDE_X. */
const ARM_SIDE_X = 4;

// Bras côté spectateur, bordé de l'ombre du lin pour se détacher du torse ; il pend le long du corps, la main au bas
// de la tunique.
const armSide: Grid = [
  'YLLY',
  'YLLY',
  'YLLY',
  'YLtY',
  'YLtY',
  'YLtY',
  'YLtY',
  'DsSD',
  'DSSD',
  '.DD.',
];

type Facing = 'down' | 'up';

/**
 * Face ou dos. legL/legR : décalage vertical de chaque jambe (négatif = levée).
 * bob : décalage du haut du corps. La main opposée à la jambe levée remonte d'un pixel.
 */
function frontal(facing: Facing, legL: number, legR: number, bob: number): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = FRONT_X;
  const legY = BODY_Y + 11;
  c.stamp(legLeft, ox + LEG_L, legY + legL);
  c.stamp(legRight, ox + LEG_R, legY + legR);
  const torso = facing === 'down' ? torsoFront : torsoBack;
  c.stamp(bodyFrontal(torso, legR < 0, legL < 0), ox, BODY_Y + bob);
  c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + bob);
  return selOut(c.toGrid(), DARK);
}

/** Profil droit. spread : écart des jambes (0 = jambes jointes). arm : balancement du bras. */
function side(spread: number, arm: number, bob: number, swapLegs = false): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = SIDE_X;
  const legY = BODY_Y + 11;
  const back = swapLegs ? legSide : backLeg(legSide);
  const front = swapLegs ? backLeg(legSide) : legSide;
  c.stamp(back, ox + LEG_SIDE[0] - spread, legY);
  c.stamp(front, ox + LEG_SIDE[1] + spread, legY);
  c.stamp(bodySide, ox, BODY_Y + bob);
  c.stamp(armSide, ox + ARM_SIDE_X + arm, BODY_Y + 1 + bob);
  c.stamp(headSide, ox, HEAD_Y + bob);
  return selOut(c.toGrid(), DARK);
}


// ---------- Gestes de travail (use-*, chop-*, maul-*) ----------
// Le corps seul : l'outil est une image à part (planche tool-<objet>, art/lib/held.ts) que le jeu pose sur les mains, devant ou
// derrière le corps. Le coup lourd (docs/CONCEPTION.md, « Le travail ») : huit images en cinq temps, les mêmes pour les trois gestes
// (WORK_PHASES, `phases` de gestures.json) : armer (2), le temps en haut (1), abattre (2 : l'outil part du sommet puis arrive, avec
// sa traînée, dessinée dans la planche de l'outil), impact (1), dégager (2 : on retire le fer, on revient en garde). La dernière
// image, la garde, est celle d'où part le coup suivant. On arme plus haut et plus loin, le corps cambré (`lean` −1 : buste et tête
// remontent d'un pixel, de profil ils reculent) ; à l'impact le corps se tasse (1 : buste raccourci d'une rangée, tête baissée, de
// profil le haut du corps avance ; 2 pour la masse : deux rangées). Pieds écartés d'un pixel, plantés. La tête garde sa hauteur
// hors du cambré et du tassé. Le jeu impose la durée de chaque image (world/swing.ts) ; FRAME_RATE ne sert qu'aux aperçus.

/** Les cinq temps de chaque image d'un geste de travail (gestures.json, `phases`). */
export const WORK_PHASES = ['arm', 'arm', 'hold', 'down', 'down', 'impact', 'free', 'free'] as const;
/** Image de l'impact dans les gestes de travail (0 à 7). */
export const WORK_IMPACT = 5;
/** Cadences des aperçus (le coup de Xéros d'aujourd'hui : environ 1,9 s à la cognée, 3 s à la masse). */
export const USE_FRAME_RATE = 4;
export const CHOP_FRAME_RATE = 4;
export const MAUL_FRAME_RATE = 3;

/** Où passent les bras : devant tout, sous la tête seulement (bras levés), ou sous le corps (vue de dos). */
type ArmLayer = 'front' | 'head' | 'body';

interface WorkBody {
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
  /** −1 : cambré ; 0 : droit ; 1, 2 : tassé vers le coup. */
  lean: number;
}

interface WorkOpts { arms?: ArmLayer; grip?: Vec; trail?: boolean }

const pose = (
  view: View, hands: Vec, head: ToolPose['head'], edge: ToolPose['edge'], behind: boolean, elbows: Vec[], lean: number, o: WorkOpts = {},
): WorkBody => ({
  hands,
  tool: { hand: o.grip ?? hands, head, edge, behind, ...(view === 'edge' ? { view } : {}), ...(o.trail ? { trail: true } : {}) },
  elbows,
  arms: o.arms ?? 'front',
  lean,
});

/** Pose d'un coup horizontal : on voit la face de l'outil, de profil (art/lib/held.ts, dessins `diag` et `upright`). */
const face = (
  hands: Vec, head: ToolPose['head'], edge: ToolPose['edge'], behind: boolean, elbows: Vec[], lean: number, o?: WorkOpts,
) => pose('face', hands, head, edge, behind, elbows, lean, o);
/** Pose d'un coup vertical : on voit l'outil par la tranche (art/lib/held.ts, dessins `flat*`). */
const edgeOn = (
  hands: Vec, head: ToolPose['head'], edge: ToolPose['edge'], behind: boolean, elbows: Vec[], lean: number, o?: WorkOpts,
) => pose('edge', hands, head, edge, behind, elbows, lean, o);

// Épaules, dans la frame : face/dos à gauche et à droite du torse (sur la manche), profil au milieu du dos.
const SHOULDER_L: Vec = [12, BODY_Y + 2];
const SHOULDER_R: Vec = [19, BODY_Y + 2];
const SHOULDER_SIDE: Vec = [15, BODY_Y + 2];

// Coup horizontal (use-*), sur ce qui est debout (abattre l'arbre) : la cognée tourne à plat autour de Xéros (tranchant 'ccw' :
// elle tourne dans le sens inverse des aiguilles d'une montre, vue d'en haut). On voit la face du fer, de profil. En garde, le fer
// bas devant lui ; il l'arme sur le côté puis derrière l'épaule, à hauteur de tête, le corps cambré ; elle part, passe du côté du
// spectateur, et mord le tronc à hauteur de taille, le corps tassé ; on la retire et on revient en garde.
const USE_BODY: Record<'down' | 'up' | 'right', WorkBody[]> = {
  // de face (l'arbre au sud) : armée à sa droite (à gauche de l'image), derrière l'épaule ; le fer revient vers nous et mord le
  // tronc devant lui, en bas à gauche
  down: [
    face([11, 34], 'w', 'ccw', false, [[10, 36], [16, 37]], 0),
    face([9, 30], 'nw', 'ccw', true, [[9, 33], [14, 34]], -1),
    face([9, 28], 'n', 'ccw', true, [[9, 32], [14, 33]], -1),
    face([9, 33], 'w', 'ccw', false, [[9, 35], [15, 36]], 0, { trail: true }),
    face([12, 37], 'sw', 'ccw', false, [[11, 37], [17, 38]], 0, { trail: true }),
    face([15, 38], 'sw', 'ccw', false, [[12, 38], [19, 38]], 1, { grip: [17, 37] }),
    face([14, 37], 'sw', 'ccw', false, [[12, 37], [18, 37]], 0, { grip: [15, 36] }),
    face([13, 38], 's', 'ccw', false, [[12, 37], [18, 38]], 0),
  ],
  // de dos (l'arbre au nord) : armée à sa droite (à droite de l'image), puis rejetée en arrière, vers nous, à hauteur d'épaule ;
  // elle tourne par la droite et mord le tronc devant lui, à droite de la tête
  up: [
    face([23, 34], 'e', 'ccw', false, [[13, 37], [22, 34]], 0, { arms: 'body' }),
    face([23, 30], 'ne', 'ccw', true, [[13, 35], [22, 33]], -1, { arms: 'body' }),
    face([22, 27], 'n', 'ccw', true, [[13, 33], [23, 31]], -1, { arms: 'body' }),
    face([24, 31], 'e', 'ccw', false, [[13, 35], [23, 33]], 0, { arms: 'body', trail: true }),
    face([23, 35], 'se', 'ccw', false, [[13, 36], [21, 33]], 0, { arms: 'body', trail: true }),
    face([21, 33], 'ne', 'ccw', true, [[13, 36], [21, 35]], 1, { arms: 'body' }),
    face([22, 34], 'ne', 'ccw', true, [[13, 36], [22, 35]], 0, { arms: 'body' }),
    face([22, 37], 'ne', 'ccw', true, [[13, 37], [21, 36]], 0, { arms: 'body' }),
  ],
  // de profil (l'arbre à l'est) : levée devant lui, puis rejetée derrière la tête ; elle tourne par le côté proche de nous (fer
  // vers le spectateur) et mord le tronc devant lui
  right: [
    face([15, 32], 'n', 'ccw', false, [[17, 35]], 0),
    face([12, 28], 'nw', 'ccw', true, [[16, 31]], -1, { arms: 'head' }),
    face([11, 27], 'w', 'ccw', true, [[15, 30]], -1, { arms: 'head' }),
    face([14, 33], 'sw', 'ccw', false, [[15, 35]], 0, { trail: true }),
    face([18, 36], 'se', 'ccw', false, [[17, 36]], 0, { trail: true }),
    face([21, 35], 'e', 'ccw', false, [[19, 35]], 1),
    face([19, 34], 'e', 'ccw', false, [[18, 34]], 0),
    face([16, 37], 'se', 'ccw', false, [[16, 36]], 0),
  ],
};

/** Pose de l'outil pour chaque image des animations use-down, use-up et use-right. */
export const USE_POSES: Record<'down' | 'up' | 'right', ToolPose[]> = {
  down: USE_BODY.down.map((b) => b.tool),
  up: USE_BODY.up.map((b) => b.tool),
  right: USE_BODY.right.map((b) => b.tool),
};

// Coup vertical (chop-*), de haut en bas sur ce qui est couché ou posé au sol (ébrancher, couper, la doloire, la hachette sur le
// billot) : on voit l'outil par la tranche, un bloc de fer étroit et sombre au bout du manche. Armé au-dessus de la tête, le corps
// cambré ; il s'abat, frappe devant les pieds (à l'impact le manche est vertical et le bloc dans l'encoche), le corps tassé ; on le
// dégage et on revient en garde, le fer posé près de la cible.
const CHOP_BODY: Record<'down' | 'up' | 'right', WorkBody[]> = {
  down: [
    edgeOn([16, 24], 'n', 'cw', false, [[10, 28], [21, 28]], 0),
    edgeOn([16, 13], 'n', 'cw', true, [[9, 22], [22, 22]], -1, { arms: 'head' }),
    edgeOn([16, 10], 'n', 'cw', true, [[9, 20], [22, 20]], -1, { arms: 'head' }),
    edgeOn([16, 17], 'n', 'cw', false, [[10, 25], [21, 25]], 0, { trail: true }),
    edgeOn([16, 32], 's', 'ccw', false, [[12, 33], [20, 33]], 0, { trail: true }),
    edgeOn([16, 41], 's', 'ccw', false, [[12, 37], [20, 37]], 1, { grip: [16, 36] }),
    edgeOn([16, 39], 's', 'ccw', false, [[12, 36], [20, 36]], 0, { grip: [16, 34] }),
    edgeOn([16, 37], 's', 'ccw', false, [[12, 36], [20, 36]], 0, { grip: [16, 32] }),
  ],
  // de dos (la cible au nord, derrière la taille et le dos) : le fer armé derrière la tête, pendu vers nous ; il passe au-dessus
  // de la tête, puis frappe derrière le corps ; les mains décalées à droite, le manche et le fer dépassent du flanc droit
  up: [
    edgeOn([21, 24], 'n', 'cw', true, [[11, 28], [22, 27]], 0, { arms: 'body' }),
    edgeOn([18, 12], 's', 'ccw', false, [[9, 21], [22, 21]], -1, { arms: 'head' }),
    edgeOn([18, 9], 's', 'ccw', false, [[9, 19], [22, 19]], -1, { arms: 'head' }),
    edgeOn([21, 10], 'n', 'cw', true, [[9, 20], [23, 19]], 0, { arms: 'head', trail: true }),
    edgeOn([23, 26], 'n', 'cw', true, [[12, 30], [22, 29]], 0, { arms: 'body', trail: true }),
    edgeOn([24, 38], 'n', 'cw', true, [[14, 39], [20, 39]], 1, { arms: 'body', grip: [24, 40] }),
    edgeOn([24, 36], 'n', 'cw', true, [[14, 38], [20, 38]], 0, { arms: 'body', grip: [24, 38] }),
    edgeOn([23, 35], 'n', 'cw', true, [[14, 37], [20, 37]], 0, { arms: 'body', grip: [23, 36] }),
  ],
  right: [
    edgeOn([18, 24], 'n', 'cw', false, [[19, 29]], 0),
    edgeOn([13, 13], 'nw', 'cw', true, [[10, 22]], -1, { arms: 'head' }),
    edgeOn([12, 11], 'w', 'ccw', true, [[9, 21]], -1, { arms: 'head' }),
    edgeOn([19, 15], 'ne', 'ccw', false, [[19, 23]], 0, { trail: true }),
    edgeOn([23, 24], 'e', 'ccw', false, [[21, 29]], 0, { trail: true }),
    edgeOn([24, 30], 'se', 'cw', false, [[21, 32]], 1, { grip: [23, 27] }),
    edgeOn([23, 28], 'se', 'cw', false, [[20, 31]], 0, { grip: [22, 26] }),
    edgeOn([21, 33], 'se', 'cw', false, [[19, 34]], 0, { grip: [20, 31] }),
  ],
};

/** Pose de l'outil pour chaque image des animations chop-down, chop-up et chop-right. */
export const CHOP_POSES: Record<'down' | 'up' | 'right', ToolPose[]> = {
  down: CHOP_BODY.down.map((b) => b.tool),
  up: CHOP_BODY.up.map((b) => b.tool),
  right: CHOP_BODY.right.map((b) => b.tool),
};

// Frapper à la masse (maul-*), de haut en bas sur le coin planté dans une bille couchée devant lui : le modèle de chop, plus haut
// et plus lourd. La masse monte plus haut que la cognée (les mains au-dessus du sommet du crâne), pend derrière la tête au temps en
// haut ; elle s'abat par-dessus la tête ; à l'impact la tête de la masse est sur le coin, bras tendus, le buste tassé de deux
// rangées ; elle rebondit d'un ou deux pixels, puis la garde : la masse posée devant lui. On la voit par la tranche (le bloc carré
// de sa tête), comme la cognée dans chop.
const MAUL_BODY: Record<'down' | 'up' | 'right', WorkBody[]> = {
  down: [
    edgeOn([16, 23], 'n', 'cw', false, [[10, 27], [21, 27]], 0),
    edgeOn([16, 11], 'n', 'cw', true, [[9, 20], [22, 20]], -1, { arms: 'head' }),
    edgeOn([16, 8], 'n', 'cw', true, [[9, 19], [22, 19]], -1, { arms: 'head' }),
    edgeOn([16, 14], 'n', 'cw', false, [[10, 23], [21, 23]], 0, { trail: true }),
    edgeOn([16, 31], 's', 'ccw', false, [[12, 33], [20, 33]], 0, { trail: true }),
    edgeOn([16, 40], 's', 'ccw', false, [[12, 37], [20, 37]], 2),
    edgeOn([16, 38], 's', 'ccw', false, [[12, 36], [20, 36]], 1),
    edgeOn([16, 37], 's', 'ccw', false, [[12, 36], [20, 36]], 0),
  ],
  // de dos (la bille au nord, son dessus derrière les épaules) : la masse frappe devant lui, cachée par le corps ; les mains
  // décalées à droite, elle dépasse du flanc droit, comme la cognée
  up: [
    edgeOn([21, 24], 'n', 'cw', true, [[11, 28], [22, 27]], 0, { arms: 'body' }),
    edgeOn([18, 11], 's', 'ccw', false, [[9, 20], [22, 20]], -1, { arms: 'head' }),
    edgeOn([17, 7], 's', 'ccw', false, [[9, 18], [22, 18]], -1, { arms: 'head' }),
    edgeOn([20, 9], 'n', 'cw', true, [[9, 19], [23, 18]], 0, { arms: 'head', trail: true }),
    edgeOn([22, 25], 'n', 'cw', true, [[12, 30], [22, 29]], 0, { arms: 'body', trail: true }),
    edgeOn([23, 38], 'n', 'cw', true, [[14, 39], [20, 39]], 2, { arms: 'body' }),
    edgeOn([23, 36], 'n', 'cw', true, [[14, 38], [20, 38]], 1, { arms: 'body' }),
    edgeOn([23, 35], 'n', 'cw', true, [[14, 37], [20, 37]], 0, { arms: 'body' }),
  ],
  // de profil : levée devant lui, puis derrière la tête, la masse pendue dans le dos ; elle repart par-dessus lui et frappe le
  // dessus de la bille devant lui, bras tendus, buste penché
  right: [
    edgeOn([18, 23], 'n', 'cw', false, [[19, 28]], 0),
    edgeOn([13, 11], 'nw', 'cw', true, [[10, 20]], -1, { arms: 'head' }),
    edgeOn([12, 9], 'w', 'ccw', true, [[9, 20]], -1, { arms: 'head' }),
    edgeOn([19, 12], 'ne', 'ccw', false, [[19, 21]], 0, { trail: true }),
    edgeOn([23, 23], 'e', 'ccw', false, [[21, 28]], 0, { trail: true }),
    edgeOn([24, 35], 'se', 'cw', false, [[21, 33]], 2),
    edgeOn([23, 33], 'se', 'cw', false, [[20, 32]], 1),
    edgeOn([21, 34], 'se', 'cw', false, [[19, 34]], 0),
  ],
};

/** Pose de l'outil pour chaque image des animations maul-down, maul-up et maul-right. */
export const MAUL_POSES: Record<'down' | 'up' | 'right', ToolPose[]> = {
  down: MAUL_BODY.down.map((b) => b.tool),
  up: MAUL_BODY.up.map((b) => b.tool),
  right: MAUL_BODY.right.map((b) => b.tool),
};

/**
 * Torse de face ou de dos : cambré (lean −1), une rangée de tunique de plus (le buste s'étire) ; tassé (lean 1 ou 2), une ou deux
 * rangées de moins, si bien que l'ourlet reste en place.
 */
function workTorso(torso: Grid, lean: number): Grid {
  if (lean < 0) return [...torso.slice(0, 5), torso[4], ...torso.slice(5)];
  if (lean === 0) return torso;
  const drop = lean >= 2 ? [4, 8] : [8];
  return torso.filter((_, i) => !drop.includes(i));
}

function workFrontal(facing: Facing, b: WorkBody): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = FRONT_X;
  const legY = BODY_Y + 11;
  // pieds écartés d'un pixel de plus qu'au repos, plantés
  c.stamp(legLeft, ox + LEG_L - 1, legY);
  c.stamp(legRight, ox + LEG_R + 1, legY);
  const dy = b.lean < 0 ? -1 : b.lean; // haut du torse et tête
  const torso = () => c.stamp(bareTorso(workTorso(facing === 'down' ? torsoFront : torsoBack, b.lean)), ox, BODY_Y + dy);
  const head = () => c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + dy);
  const arms = () => {
    rim(c);
    const [el, er] = b.elbows;
    arm(c, [down1(SHOULDER_L, dy), el, b.hands], 't', 'L');
    arm(c, [down1(SHOULDER_R, dy), er, b.hands], 'T', 't');
  };
  if (b.arms === 'body') arms();
  torso();
  if (b.arms === 'head') arms();
  head();
  if (b.arms === 'front') arms();
  rim(c);
  return selOut(c.toGrid(), DARK);
}

function workSide(b: WorkBody): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = SIDE_X;
  const legY = BODY_Y + 11;
  c.stamp(backLeg(legSide), ox + LEG_SIDE[0] - 1, legY);
  c.stamp(legSide, ox + LEG_SIDE[1] + 1, legY);
  // le haut du torse recule (cambré) ou avance (tassé), la ceinture reste sur les hanches
  const shift = b.lean < 0 ? [-1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]
    : b.lean >= 2 ? [2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
      : b.lean === 1 ? [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] : Array(12).fill(0);
  const body = bodySide.map((row, y) => (shift[y] >= 0 ? '.'.repeat(shift[y]) + row : row.slice(-shift[y]) + '.'.repeat(-shift[y])));
  const headDx = b.lean < 0 ? -1 : b.lean >= 2 ? 2 : b.lean;
  const headDy = b.lean >= 1 ? 1 : 0;
  const shoulder: Vec = [SHOULDER_SIDE[0] + shift[2], SHOULDER_SIDE[1] + headDy];
  const arms = () => {
    rim(c);
    arm(c, [shoulder, b.elbows[0], b.hands], 't', 'L');
  };
  c.stamp(body, ox, BODY_Y);
  if (b.arms !== 'front') arms();
  c.stamp(headSide, ox + headDx, HEAD_Y + headDy);
  if (b.arms === 'front') arms();
  rim(c);
  return selOut(c.toGrid(), DARK);
}


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
  down: { hands: [16, 37], elbows: [[11, 36], [20, 36]] },
  // de dos : les mains sont devant lui, cachées par le corps ; seuls les coudes dépassent des flancs
  up: { hands: [16, 36], elbows: [[11, 35], [20, 35]] },
  // de profil : le bras descend sous l'épaule, coude contre la taille, l'avant-bras part devant le ventre
  right: { hands: [21, 36], elbows: [[17, 37]] },
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
  const ox = FRONT_X;
  const legY = BODY_Y + 11;
  c.stamp(legLeft, ox + LEG_L, legY + legL);
  c.stamp(legRight, ox + LEG_R, legY + legR);
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
  const ox = SIDE_X;
  const legY = BODY_Y + 11;
  const back = swapLegs ? legSide : backLeg(legSide);
  const front = swapLegs ? backLeg(legSide) : legSide;
  c.stamp(back, ox + LEG_SIDE[0] - spread, legY);
  c.stamp(front, ox + LEG_SIDE[1] + spread, legY);
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
 * en bas à gauche (bras gauche de l'image : x = 11 ; bras droit de l'image : x = 19). La main remonte d'un pixel
 * quand le bras part en avant. De face, la main droite de Xéros est à gauche de l'image ; de dos, à droite. De dos, ce
 * qu'il tient passe sous le corps : la main le recouvre, seul ce qui dépasse de la silhouette se voit.
 */
function frontalHands(facing: Facing, legL: number, legR: number, bob: number): HandPair {
  const imgLeft = holdAt([11, 37 + bob - (legR < 0 ? 1 : 0)], facing === 'up');
  const imgRight = holdAt([19, 37 + bob - (legL < 0 ? 1 : 0)], facing === 'up');
  return facing === 'down' ? { right: imgLeft, left: imgRight } : { left: imgLeft, right: imgRight };
}

/**
 * Profil droit, pour side(spread, arm, bob) : la main droite est celle du bras côté spectateur (armSide, poing en
 * x = 15..16, y = 37..38, point en bas à gauche) ; la gauche est de l'autre côté du corps, cachée, un pixel plus haut (plus loin) et balancée
 * à l'opposé.
 */
function sideHands(arm: number, bob: number): HandPair {
  return { right: holdAt([15 + arm, 38 + bob], false), left: holdAt([14 - arm, 37 + bob], true) };
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
  down: { hand: [12, 33], elbow: [11, 36] },
  // de dos : sa droite est à droite de l'image ; le poing est devant lui, caché ; le coude dépasse du flanc
  up: { hand: [19, 33], elbow: [20, 36] },
  // de profil : le coude contre la taille, le poing devant la poitrine
  right: { hand: [16, 34], elbow: [16, 37] },
};

function shoulderFrontal(facing: Facing, legL: number, legR: number, bob: number): Grid {
  const b = SHOULDER_BODY[facing];
  const c = new Canvas(W, H);
  shadow(c);
  const ox = FRONT_X;
  const legY = BODY_Y + 11;
  c.stamp(legLeft, ox + LEG_L, legY + legL);
  c.stamp(legRight, ox + LEG_R, legY + legR);
  const torso = facing === 'down' ? torsoFront : torsoBack;
  // le bras qui pend : à droite de l'image de face (sa gauche), à gauche de dos (sa gauche aussi)
  const hanging = facing === 'down'
    ? torso.map((row, y) => '...' + row + armRight(legL < 0)[y])
    : torso.map((row, y) => armLeft(legR < 0)[y] + row + '...');
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
  const ox = SIDE_X;
  const legY = BODY_Y + 11;
  const back = swapLegs ? legSide : backLeg(legSide);
  const front = swapLegs ? backLeg(legSide) : legSide;
  c.stamp(back, ox + LEG_SIDE[0] - spread, legY);
  c.stamp(front, ox + LEG_SIDE[1] + spread, legY);
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
  const ox = SIDE_X;
  // buste penché : le haut du torse avance de deux pixels, la poitrine d'un, la ceinture reste sur les hanches
  const LEAN = [2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0];
  const leaned = bodySide.map((row, y) => '.'.repeat(LEAN[y]) + row);
  // le bras du fond, presque caché : il passe devant la poitrine, la main un pixel plus haut (plus loin)
  const shoulder: Vec = [SHOULDER_SIDE[0] + 2, SHOULDER_SIDE[1] + 1];
  const legs = () => {
    const ankleY = 43 - 1;
    const y = (which: 'back' | 'front') => ankleY - (lift === which ? 1 : 0);
    pushLeg(c, [14, 40], [backX, y('back')], !swap);
    pushLeg(c, [16, 40], [frontX, y('front')], swap);
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
  const ox = FRONT_X;
  const legY = BODY_Y + 11;
  // jambes écartées d'un pixel de plus qu'au repos
  c.stamp(legLeft, ox + LEG_L - 1, legY + legL);
  c.stamp(legRight, ox + LEG_R + 1, legY + legR);
  // épaules plus basses : le torse descend d'un pixel sous la tête, raccourci d'une rangée de tunique (le buste
  // penché vers nous ou loin de nous), si bien que l'ourlet reste où il est
  const torso = facing === 'down' ? torsoFront : torsoBack;
  const hunched = [...torso.slice(0, 8), ...torso.slice(9)];
  const shL: Vec = [SHOULDER_L[0], SHOULDER_L[1] + 2];
  const shR: Vec = [SHOULDER_R[0], SHOULDER_R[1] + 2];
  const arms = () => {
    rim(c);
    if (facing === 'down') {
      arm(c, [shL, [11, 36], [12, 39]], 't', 'L');
      arm(c, [shR, [20, 36], [19, 39]], 'T', 't');
    } else {
      arm(c, [shL, [11, 35], [13, 34]], 't', 'L');
      arm(c, [shR, [20, 35], [18, 34]], 'T', 't');
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
  pushSide(10, 19, null, false),
  pushSide(14, 18, 'back', false),
  pushSide(10, 19, null, true),
  pushSide(14, 18, 'back', true),
];

const workAnims = (bodies: Record<'down' | 'up' | 'right', WorkBody[]>) => {
  const right = bodies.right.map(workSide);
  return { down: bodies.down.map((b) => workFrontal('down', b)), up: bodies.up.map((b) => workFrontal('up', b)), right, left: right.map(flipX) };
};
const useAnim = workAnims(USE_BODY);
const chopAnim = workAnims(CHOP_BODY);
const maulAnim = workAnims(MAUL_BODY);

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
    'use-down': { frames: useAnim.down, frameRate: USE_FRAME_RATE, repeat: 0 },
    'use-up': { frames: useAnim.up, frameRate: USE_FRAME_RATE, repeat: 0 },
    'use-right': { frames: useAnim.right, frameRate: USE_FRAME_RATE, repeat: 0 },
    'use-left': { frames: useAnim.left, frameRate: USE_FRAME_RATE, repeat: 0 },
    'chop-down': { frames: chopAnim.down, frameRate: CHOP_FRAME_RATE, repeat: 0 },
    'chop-up': { frames: chopAnim.up, frameRate: CHOP_FRAME_RATE, repeat: 0 },
    'chop-right': { frames: chopAnim.right, frameRate: CHOP_FRAME_RATE, repeat: 0 },
    'chop-left': { frames: chopAnim.left, frameRate: CHOP_FRAME_RATE, repeat: 0 },
    'maul-down': { frames: maulAnim.down, frameRate: MAUL_FRAME_RATE, repeat: 0 },
    'maul-up': { frames: maulAnim.up, frameRate: MAUL_FRAME_RATE, repeat: 0 },
    'maul-right': { frames: maulAnim.right, frameRate: MAUL_FRAME_RATE, repeat: 0 },
    'maul-left': { frames: maulAnim.left, frameRate: MAUL_FRAME_RATE, repeat: 0 },
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
    'push-idle-right': { frames: [pushSide(10, 19, null, false)], frameRate: 1, repeat: 0 },
    'push-idle-left': { frames: [flipX(pushSide(10, 19, null, false))], frameRate: 1, repeat: 0 },
    'push-walk-down': { frames: pushWalkFrontal('down'), frameRate: PUSH_FRAME_RATE, repeat: -1 },
    'push-walk-up': { frames: pushWalkFrontal('up'), frameRate: PUSH_FRAME_RATE, repeat: -1 },
    'push-walk-right': { frames: pushWalkRight, frameRate: PUSH_FRAME_RATE, repeat: -1 },
    'push-walk-left': { frames: pushWalkRight.map(flipX), frameRate: PUSH_FRAME_RATE, repeat: -1 },
    // les gestes de combat (taille, coup vertical, directs), la gauche dessinée à part : art/characters/xeros-combat.ts
    ...combatAnimations(),
  },
};

export default xeros;
