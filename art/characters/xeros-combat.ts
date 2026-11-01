// Les gestes de combat de Xéros, d'une main (docs/CONCEPTION.md, « Le combat » : le corps a ses gestes, qui ne savent pas ce
// qu'il tient ; l'arme garde son dessin unique en huit angles, planche `weapon-wooden-sword`, posée sur la main image par image).
//
//   - `cut`       la taille, à l'épée de bois : garde, armer, frappe en deux images très rapides (avec la traînée), suite, retour ;
//   - `overhead`  le coup vertical : l'épée au-dessus de la tête, abattue devant, la pointe près du sol, tenue, retour ;
//   - `jab-right` le direct du poing droit (main vide), avec un éclat au bout du poing à l'impact ;
//   - `jab-left`  le direct du poing gauche, le deuxième appui de l'enchaînement gauche-droite.
//
// Ce module donne trois choses :
//   - les corps, animations `<geste>-<direction>` de la planche `xeros` (`combatAnimations`, ajoutées par xeros.ts) ;
//   - les images d'effet : chaque traînée `fx-smear-<arme>-<geste>-<direction>-<n>`, tirée pour chaque arme de items.json à la
//     longueur de sa lame devant la main (au moins 64 × 64, son centre sur la main droite de l'image n), la main seule
//     `fx-grip-<geste>-<direction>-<n>` (5 × 5, voir la règle de profondeur) et l'éclat `fx-spark` (7 × 7) (`combatEffects`,
//     déclarées dans art/index.ts) ;
//   - les données de chaque image (`COMBAT_POSES`), que le jeu suit telles quelles : durée, mains, épaules, arme, traînée, éclat,
//     images où le coup porte. La durée d'un coup est la somme des `ms` de ses images, garde comprise (`combatDuration`) : il n'y
//     a pas d'autre source.
//
// Repère : (dx, dy) depuis les pieds, comme gestures.json (le pixel (16, 48) de la frame de 32 × 48). L'angle de l'arme est un
// multiple de 45 (0 = est, 90 = nord) : l'image `angle / 45` de `weapon-wooden-sword`, posée par son centre sur la main droite.
//
// PROFONDEUR DE L'ARME : la lame qui part vers l'avant de Xéros est plus loin de la caméra que sa tête et son corps : de dos
// (vers le haut de l'écran), elle passe derrière (`weapon.behind`, `smear.behind`) ; de face, ce qui monte derrière la tête
// aussi ; de profil gauche, l'épée tenue par le bras du fond est derrière. Ordre de dessin quand l'arme est derrière : l'arme
// et sa traînée, puis le corps, puis la main qui tient l'arme (`grip`, seulement si le corps la cache), pour que la poignée
// reste dans la main. Quand l'arme est devant : le corps, puis l'arme et sa traînée.
//
// LA GAUCHE : l'épée reste dans la main DROITE. Vers la gauche, la main droite est du côté du fond : la vue gauche n'est donc
// PAS le miroir de la droite, elle a ses propres poses. Elle est dessinée comme un profil droit dont le bras du fond tient
// l'épée, puis retournée. L'animation `<geste>-left` de la planche est déjà retournée (prête à jouer telle quelle). Ses DONNÉES
// (`COMBAT_POSES[geste].left`) et ses images de traînée sont, elles, écrites dans le repère d'avant le retournement : le jeu
// retourne l'image de l'arme, de la traînée et de l'éclat, et oppose dx (mains, épaules, arme, traînée, éclat), comme il le
// fait pour les autres vues gauches.

import { Canvas, EMPTY, flipX, selOut, type Grid, type Palette } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import itemsJson from '../../src/content/items.json';
import { CM_PER_PX } from '../../src/content/gabarit';
import {
  W, H, HEAD_Y, BODY_Y, FRONT_X, SIDE_X, DARK, headFront, headBack, torsoFront, torsoBack, legLeft, legRight, LEG_L, LEG_R,
  headSide, bodySide, legSide, LEG_SIDE, backLeg, shadow, rim, arm, bareTorso, palette as bodyPalette,
} from './xeros-body';

type Vec = [number, number];
export type CombatDir = 'down' | 'up' | 'right' | 'left';
export const COMBAT_DIRS: CombatDir[] = ['down', 'up', 'right', 'left'];
export type CombatGesture = 'cut' | 'overhead' | 'jab-right' | 'jab-left';

// ---------- Le modèle d'une image ----------

/** Où passe un bras : sous le corps (`body`), entre le torse et la tête (`head`), devant tout (`front`). */
type Layer = 'body' | 'head' | 'front';

interface Arm {
  /** La main (ou le poing), dans la frame ; c'est le point d'accroche de l'arme. */
  hand: Vec;
  elbow: Vec;
  layer: Layer;
}

interface Frame {
  /** Nom du temps (garde, armer…), pour l'aperçu. */
  name: string;
  ms: number;
  /** Main droite de Xéros (l'épée, le poing droit), main gauche. En profil gauche : repère retourné (voir l'en-tête). */
  right: Arm;
  left: Arm;
  /** L'épée : son angle (multiple de 45) et si elle passe derrière le corps. */
  sword?: { angle: number; behind: boolean };
  /** La traînée, du temps d'avant à celui-ci : en arc (`ccw` sens trigonométrique, `cw` l'autre) ou en ligne (`line`). */
  smear?: { mode: 'ccw' | 'cw' | 'line'; behind: boolean };
  /** L'éclat de l'impact : la main qui frappe et le décalage de l'éclat depuis le poing. */
  spark?: { hand: 'right' | 'left'; at: Vec };
  /** Face/dos : décalage du torse et de la tête (le corps tourne). Profil : le buste penche (−1 en arrière, +1 en avant). */
  torso?: number;
  head?: number;
  /** Face/dos : le haut du corps (tête, torse, épaules) descend (+1, il avance vers nous) ou monte (−1, il penche au loin). */
  rise?: number;
  /** Face/dos : [dx, dy] de la jambe gauche de l'image, puis de la droite. Profil : [recul du pied arrière, avance du pied avant]. */
  legs?: [number, number, number, number] | [number, number];
}

// ---------- Les corps ----------

/** Épaules de face et de dos : celle de gauche de l'image, celle de droite. */
function frontalShoulders(f: Frame): [Vec, Vec] {
  const tdx = f.torso ?? 0;
  const y = BODY_Y + 2 + (f.rise ?? 0);
  return [[12 + tdx, y], [19 + tdx, y]];
}

/** Rangées du torse de profil décalées par la penche du buste. */
function sideShift(f: Frame): number[] {
  const lean = f.torso ?? 0;
  return lean < 0 ? [-1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]
    : lean > 0 ? [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] : Array(12).fill(0);
}

/** Épaules de profil : le bras côté spectateur, celui du fond. */
function sideShoulders(f: Frame): [Vec, Vec] {
  const s = sideShift(f)[2];
  return [[15 + s, BODY_Y + 2], [16 + s, BODY_Y + 2]];
}

/** Face (`down`) ou dos (`up`). De face, la main droite de Xéros est le bras gauche de l'image ; de dos, le droit. */
function frontalBody(facing: 'down' | 'up', f: Frame): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = FRONT_X;
  const legY = BODY_Y + 11;
  const [lx, ly, rx, ry] = (f.legs as [number, number, number, number] | undefined) ?? [0, 0, 0, 0];
  c.stamp(legLeft, ox + LEG_L + lx, legY + ly);
  c.stamp(legRight, ox + LEG_R + rx, legY + ry);
  const tdx = f.torso ?? 0;
  const rise = f.rise ?? 0;
  const imgL = facing === 'down' ? f.right : f.left;
  const imgR = facing === 'down' ? f.left : f.right;
  const [shL, shR] = frontalShoulders(f);
  const draw = (layer: Layer) => {
    if (imgL.layer === layer) { rim(c); arm(c, [shL, imgL.elbow, imgL.hand], 't', 'L'); }
    if (imgR.layer === layer) { rim(c); arm(c, [shR, imgR.elbow, imgR.hand], 'T', 't'); }
  };
  draw('body');
  c.stamp(bareTorso(facing === 'down' ? torsoFront : torsoBack), ox + tdx, BODY_Y + rise);
  draw('head');
  c.stamp(facing === 'down' ? headFront : headBack, ox + (f.head ?? 0), HEAD_Y + rise);
  draw('front');
  rim(c);
  return selOut(c.toGrid(), DARK);
}

/**
 * Profil droit. `near` : le bras côté spectateur (manche claire) ; `far` : le bras du fond (manche dans l'ombre). Vers la
 * droite, la main droite est devant ; vers la gauche (dessiné en profil droit puis retourné), elle est au fond.
 */
function sideBody(f: Frame, near: Arm, far: Arm): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = SIDE_X;
  const legY = BODY_Y + 11;
  const [back, front] = (f.legs as [number, number] | undefined) ?? [0, 0];
  c.stamp(backLeg(legSide), ox + LEG_SIDE[0] - back, legY);
  c.stamp(legSide, ox + LEG_SIDE[1] + front, legY);
  const shift = sideShift(f);
  const body = bodySide.map((row, y) => (shift[y] >= 0 ? '.'.repeat(shift[y]) + row : row.slice(-shift[y]) + '.'.repeat(-shift[y])));
  const [nearSh, farSh] = sideShoulders(f);
  const draw = (layer: Layer) => {
    if (far.layer === layer) { rim(c); arm(c, [farSh, far.elbow, far.hand], 'T', 'T'); }
    if (near.layer === layer) { rim(c); arm(c, [nearSh, near.elbow, near.hand], 't', 'L'); }
  };
  draw('body');
  c.stamp(body, ox, BODY_Y);
  draw('head');
  c.stamp(headSide, ox + (f.head ?? f.torso ?? 0), HEAD_Y);
  draw('front');
  rim(c);
  return selOut(c.toGrid(), DARK);
}

/** Le corps d'une image ; vers la gauche, retourné (prêt à jouer). */
function bodyOf(dir: CombatDir, f: Frame): Grid {
  if (dir === 'down' || dir === 'up') return frontalBody(dir, f);
  return dir === 'right' ? sideBody(f, f.right, f.left) : flipX(sideBody(f, f.left, f.right));
}

/** Les épaules de Xéros (sa droite, sa gauche), dans la frame ; vers la gauche, dans le repère retourné. */
function shouldersOf(dir: CombatDir, f: Frame): { right: Vec; left: Vec } {
  if (dir === 'down') { const [l, r] = frontalShoulders(f); return { right: l, left: r }; }
  if (dir === 'up') { const [l, r] = frontalShoulders(f); return { right: r, left: l }; }
  const [near, far] = sideShoulders(f);
  return dir === 'right' ? { right: near, left: far } : { right: far, left: near };
}

// ---------- Raccourcis d'écriture ----------

const A = (hand: Vec, elbow: Vec, layer: Layer = 'front'): Arm => ({ hand, elbow, layer });
const S = (angle: number, behind = false) => ({ angle, behind });

// =====================================================================================================================
// 1. La taille, à l'épée de bois
// =====================================================================================================================
// Coup droit de la main droite : l'épée armée à l'épaule droite passe au-dessus de la tête et s'abat devant le corps, de sa
// droite vers sa gauche, puis finit basse. Chaque direction a ses poses (la droite n'est pas le miroir de la gauche). Durées :
// garde 80, armer 150, frappe 50 + 50, suite 100, retour 100 : 530 ms.

const CUT: Record<CombatDir, Frame[]> = {
  // de face : sa main droite est à gauche de l'image
  down: [
    { name: 'garde', ms: 80, right: A([13, 36], [11, 34]), left: A([20, 35], [21, 33]), sword: S(315), legs: [0, 0, 0, 1] },
    { name: 'armer', ms: 150, right: A([9, 29], [8, 33], 'head'), left: A([19, 35], [21, 33]), sword: S(135, true), torso: -1, head: -1, legs: [-1, 0, 0, 1] },
    { name: 'frappe 1', ms: 50, right: A([10, 37], [9, 34]), left: A([21, 34], [22, 33], 'body'), sword: S(225), smear: { mode: 'ccw', behind: false }, legs: [-1, 0, 1, 1] },
    { name: 'frappe 2', ms: 50, right: A([17, 39], [12, 36]), left: A([21, 33], [22, 32], 'body'), sword: S(315), smear: { mode: 'ccw', behind: false }, torso: 1, legs: [-1, 0, 1, 1] },
    { name: 'suite', ms: 100, right: A([22, 37], [16, 37]), left: A([21, 32], [22, 31], 'body'), sword: S(0), torso: 1, head: 1, legs: [-1, 0, 1, 1] },
    { name: 'retour', ms: 100, right: A([16, 37], [12, 35]), left: A([20, 35], [21, 33]), sword: S(315), legs: [0, 0, 0, 1] },
  ],
  // de dos : sa main droite est à droite de l'image ; l'épée levée à l'épaule droite, la pointe en l'air, passe par-dessus
  // la tête (derrière elle pour nous, devant lui), puis descend à sa gauche, basse
  up: [
    { name: 'garde', ms: 80, right: A([22, 35], [22, 33], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(90, true), legs: [0, -1, 0, 0] },
    { name: 'armer', ms: 150, right: A([23, 29], [24, 32]), left: A([11, 35], [9, 33], 'body'), sword: S(45, true), torso: 1, head: 1, legs: [0, -1, 1, 0] },
    { name: 'frappe 1', ms: 50, right: A([21, 24], [24, 28]), left: A([10, 34], [9, 33], 'body'), sword: S(135, true), smear: { mode: 'ccw', behind: true }, legs: [-1, -1, 1, 0] },
    { name: 'frappe 2', ms: 50, right: A([11, 33], [15, 32], 'body'), left: A([10, 34], [9, 33], 'body'), sword: S(225, true), smear: { mode: 'ccw', behind: true }, torso: -1, rise: -1, legs: [-1, -1, 1, 0] },
    { name: 'suite', ms: 100, right: A([9, 37], [12, 34], 'body'), left: A([9, 32], [8, 34], 'body'), sword: S(225, true), torso: -1, head: -1, legs: [-1, -1, 1, 0] },
    { name: 'retour', ms: 100, right: A([21, 35], [22, 33], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(45, true), legs: [0, -1, 0, 0] },
  ],
  // de profil droit : la main droite est devant ; armée par-dessus l'épaule, la pointe en arrière, l'épée passe dressée
  // au-dessus de la tête et s'abat devant lui, puis finit basse devant le corps (le trajet de la gauche)
  right: [
    { name: 'garde', ms: 80, right: A([19, 36], [16, 36]), left: A([18, 34], [17, 35], 'body'), sword: S(0), legs: [1, 1] },
    { name: 'armer', ms: 150, right: A([13, 29], [12, 33]), left: A([18, 34], [17, 35], 'body'), sword: S(135), torso: -1, legs: [2, 1] },
    { name: 'frappe 1', ms: 50, right: A([23, 30], [19, 32]), left: A([18, 34], [17, 35], 'body'), sword: S(90), smear: { mode: 'cw', behind: false }, legs: [1, 2] },
    { name: 'frappe 2', ms: 50, right: A([24, 34], [20, 34]), left: A([17, 35], [16, 36], 'body'), sword: S(0), smear: { mode: 'cw', behind: false }, torso: 1, legs: [1, 3] },
    { name: 'suite', ms: 100, right: A([21, 38], [18, 36]), left: A([16, 35], [15, 36], 'body'), sword: S(315), torso: 1, legs: [1, 3] },
    { name: 'retour', ms: 100, right: A([19, 36], [16, 36]), left: A([18, 34], [17, 35], 'body'), sword: S(0), legs: [1, 2] },
  ],
  // vers la gauche (dessiné en profil droit, retourné) : la main droite est au fond ; armée derrière la tête, la pointe passe
  // au-dessus de la tête, s'abat devant lui, puis revient devant le corps, basse, de notre côté
  left: [
    { name: 'garde', ms: 80, right: A([21, 36], [18, 36], 'body'), left: A([19, 34], [16, 35]), sword: S(0, true), legs: [1, 1] },
    { name: 'armer', ms: 150, right: A([10, 28], [12, 33], 'body'), left: A([20, 35], [17, 35]), sword: S(135, true), torso: -1, legs: [2, 1] },
    { name: 'frappe 1', ms: 50, right: A([22, 31], [18, 33], 'body'), left: A([19, 36], [16, 36]), sword: S(90, true), smear: { mode: 'cw', behind: true }, legs: [1, 2] },
    { name: 'frappe 2', ms: 50, right: A([24, 34], [20, 34], 'body'), left: A([17, 36], [15, 36]), sword: S(0, true), smear: { mode: 'cw', behind: true }, torso: 1, legs: [1, 3] },
    { name: 'suite', ms: 100, right: A([21, 38], [18, 36], 'front'), left: A([15, 36], [14, 35]), sword: S(315), torso: 1, legs: [1, 3] },
    { name: 'retour', ms: 100, right: A([21, 36], [18, 36], 'body'), left: A([19, 34], [16, 35]), sword: S(0, true), legs: [1, 2] },
  ],
};

// =====================================================================================================================
// 2. Le coup vertical, à l'épée de bois
// =====================================================================================================================
// L'épée levée au-dessus de la tête (le bras droit tendu en l'air), abattue devant lui, la pointe près du sol, puis retour.
// De face, la lame descend le long du côté droit de la tête (pas devant le visage) : une traînée droite, verticale. De dos, à
// la tenue, le buste penché au loin, la lame dépasse au-dessus de l'épaule, pointée devant lui. Durées : garde 80, armer 180,
// frappe 50 + 50, tenue 120 (la pointe au sol), retour 120 : 600 ms.

const OVERHEAD: Record<CombatDir, Frame[]> = {
  down: [
    { name: 'garde', ms: 80, right: A([13, 36], [11, 34]), left: A([20, 35], [21, 33]), sword: S(315), legs: [0, 0, 0, 1] },
    { name: 'armer', ms: 180, right: A([10, 12], [8, 21], 'head'), left: A([20, 34], [21, 32]), sword: S(90, true), legs: [0, 0, 0, 1] },
    { name: 'frappe 1', ms: 50, right: A([10, 24], [8, 27]), left: A([20, 35], [21, 33]), sword: S(270), smear: { mode: 'line', behind: false }, legs: [0, 0, 0, 1] },
    { name: 'frappe 2', ms: 50, right: A([13, 35], [11, 32]), left: A([21, 34], [22, 33], 'body'), sword: S(270), smear: { mode: 'line', behind: false }, legs: [0, 0, 1, 1] },
    { name: 'tenue', ms: 120, right: A([13, 36], [11, 33]), left: A([21, 34], [22, 33], 'body'), sword: S(270), legs: [0, 0, 1, 1] },
    { name: 'retour', ms: 120, right: A([13, 36], [11, 34]), left: A([20, 35], [21, 33]), sword: S(315), legs: [0, 0, 0, 1] },
  ],
  up: [
    { name: 'garde', ms: 80, right: A([22, 35], [22, 33], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(90, true), legs: [0, -1, 0, 0] },
    { name: 'armer', ms: 180, right: A([21, 12], [23, 21], 'head'), left: A([10, 34], [9, 32], 'body'), sword: S(90), legs: [0, -1, 0, 0] },
    { name: 'frappe 1', ms: 50, right: A([22, 22], [24, 26], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(90, true), smear: { mode: 'line', behind: true }, legs: [0, -1, 0, 0] },
    { name: 'frappe 2', ms: 50, right: A([24, 35], [24, 32], 'body'), left: A([11, 35], [10, 33], 'body'), sword: S(90, true), smear: { mode: 'line', behind: true }, rise: -1, legs: [0, -2, 0, 0] },
    { name: 'tenue', ms: 120, right: A([24, 36], [24, 33], 'body'), left: A([11, 35], [10, 33], 'body'), sword: S(90, true), rise: -1, legs: [0, -2, 0, 0] },
    { name: 'retour', ms: 120, right: A([22, 35], [22, 33], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(90, true), legs: [0, -1, 0, 0] },
  ],
  right: [
    { name: 'garde', ms: 80, right: A([19, 36], [16, 36]), left: A([18, 34], [17, 35], 'body'), sword: S(0), legs: [1, 1] },
    { name: 'armer', ms: 180, right: A([13, 12], [12, 22], 'head'), left: A([18, 34], [17, 35], 'body'), sword: S(135), torso: -1, legs: [1, 1] },
    { name: 'frappe 1', ms: 50, right: A([23, 21], [21, 27]), left: A([18, 34], [17, 35], 'body'), sword: S(0), smear: { mode: 'cw', behind: false }, legs: [1, 2] },
    { name: 'frappe 2', ms: 50, right: A([23, 33], [20, 32]), left: A([17, 35], [16, 36], 'body'), sword: S(315), smear: { mode: 'cw', behind: false }, torso: 1, legs: [1, 3] },
    { name: 'tenue', ms: 120, right: A([23, 34], [20, 33]), left: A([17, 35], [16, 36], 'body'), sword: S(315), torso: 1, legs: [1, 3] },
    { name: 'retour', ms: 120, right: A([19, 36], [16, 36]), left: A([18, 34], [17, 35], 'body'), sword: S(0), legs: [1, 2] },
  ],
  left: [
    { name: 'garde', ms: 80, right: A([21, 36], [18, 36], 'body'), left: A([19, 34], [16, 35]), sword: S(0, true), legs: [1, 1] },
    { name: 'armer', ms: 180, right: A([14, 11], [14, 21], 'body'), left: A([19, 35], [16, 35]), sword: S(135, true), torso: -1, legs: [1, 1] },
    { name: 'frappe 1', ms: 50, right: A([22, 21], [19, 26], 'body'), left: A([19, 35], [16, 35]), sword: S(0, true), smear: { mode: 'cw', behind: true }, legs: [1, 2] },
    { name: 'frappe 2', ms: 50, right: A([23, 33], [20, 31], 'body'), left: A([17, 36], [15, 36]), sword: S(315, true), smear: { mode: 'cw', behind: true }, torso: 1, legs: [1, 3] },
    { name: 'tenue', ms: 120, right: A([23, 34], [20, 32], 'body'), left: A([17, 36], [15, 36]), sword: S(315, true), torso: 1, legs: [1, 3] },
    { name: 'retour', ms: 120, right: A([21, 36], [18, 36], 'body'), left: A([19, 34], [16, 35]), sword: S(0, true), legs: [1, 2] },
  ],
};

// =====================================================================================================================
// 3. Les coups de poing (main vide)
// =====================================================================================================================
// Garde poings levés devant le menton, le poing gauche (le poing avant) un peu plus loin. Armer très court : l'épaule recule.
// Le bras se tend, petit pas du pied avant, un éclat au bout du poing ; retour en garde. De face, le haut du corps avance d'un
// pixel, l'épaule du bras qui frappe tourne vers nous et le poing sort sous le torse : le coup se lit sans l'éclat. De dos,
// le buste penche au loin, le poing part à côté de la tête, à hauteur d'épaule. Durées : garde 80, armer 60, frappe 80,
// retour 120 : 340 ms. Le direct du gauche est le deuxième appui de l'enchaînement gauche-droite : même construction, l'autre bras.

const GUARD: Record<CombatDir, Pick<Frame, 'right' | 'left' | 'legs'>> = {
  down: { right: A([13, 31], [11, 35]), left: A([18, 32], [20, 35]), legs: [0, 0, 0, 1] },
  up: { right: A([17, 32], [21, 35], 'body'), left: A([14, 33], [10, 35], 'body'), legs: [0, -1, 0, 0] },
  right: { right: A([19, 31], [16, 35]), left: A([21, 30], [18, 34], 'body'), legs: [1, 1] },
  left: { right: A([20, 31], [17, 34], 'body'), left: A([21, 30], [17, 34]), legs: [1, 1] },
};

const g = (d: CombatDir, name: string, ms: number, over: Partial<Frame> = {}): Frame => ({ name, ms, ...GUARD[d], ...over });

const JAB_RIGHT: Record<CombatDir, Frame[]> = {
  down: [
    g('down', 'garde', 80),
    g('down', 'armer', 60, { right: A([12, 31], [10, 34]), torso: -1 }),
    g('down', 'frappe', 80, { right: A([16, 39], [14, 35]), spark: { hand: 'right', at: [0, 5] }, torso: 1, rise: 1, legs: [0, 0, 0, 2] }),
    g('down', 'retour', 120, { right: A([13, 33], [11, 35]) }),
  ],
  up: [
    g('up', 'garde', 80),
    g('up', 'armer', 60, { right: A([18, 33], [21, 36], 'body'), torso: 1 }),
    g('up', 'frappe', 80, { right: A([22, 28], [23, 31], 'body'), spark: { hand: 'right', at: [0, -4] }, rise: -1, legs: [0, -2, 0, 0] }),
    g('up', 'retour', 120, { right: A([17, 32], [21, 34], 'body') }),
  ],
  right: [
    g('right', 'garde', 80),
    g('right', 'armer', 60, { right: A([17, 32], [15, 35]), torso: -1 }),
    g('right', 'frappe', 80, { right: A([25, 31], [20, 32]), spark: { hand: 'right', at: [4, 0] }, torso: 1, legs: [1, 3] }),
    g('right', 'retour', 120, { right: A([20, 32], [17, 35]) }),
  ],
  // vers la gauche (repère retourné) : le poing droit est au fond, il part derrière le bras avant
  left: [
    g('left', 'garde', 80),
    g('left', 'armer', 60, { right: A([18, 32], [16, 35], 'body'), torso: -1 }),
    g('left', 'frappe', 80, { right: A([25, 31], [20, 32], 'body'), left: A([19, 32], [16, 35]), spark: { hand: 'right', at: [4, 0] }, torso: 1, legs: [1, 3] }),
    g('left', 'retour', 120, { right: A([20, 32], [17, 35], 'body') }),
  ],
};

const JAB_LEFT: Record<CombatDir, Frame[]> = {
  down: [
    g('down', 'garde', 80),
    g('down', 'armer', 60, { left: A([19, 31], [21, 34]), torso: 1 }),
    g('down', 'frappe', 80, { left: A([15, 39], [17, 35]), spark: { hand: 'left', at: [0, 5] }, torso: -1, rise: 1, legs: [0, 0, 0, 2] }),
    g('down', 'retour', 120, { left: A([18, 33], [20, 35]) }),
  ],
  up: [
    g('up', 'garde', 80),
    g('up', 'armer', 60, { left: A([13, 34], [10, 36], 'body'), torso: -1 }),
    g('up', 'frappe', 80, { left: A([9, 28], [8, 31], 'body'), spark: { hand: 'left', at: [0, -4] }, rise: -1, legs: [0, -2, 0, 0] }),
    g('up', 'retour', 120, { left: A([14, 33], [10, 34], 'body') }),
  ],
  // vers la droite, le poing gauche est au fond
  right: [
    g('right', 'garde', 80),
    g('right', 'armer', 60, { left: A([20, 31], [17, 34], 'body') }),
    g('right', 'frappe', 80, { left: A([26, 30], [21, 31], 'body'), right: A([18, 32], [16, 35]), spark: { hand: 'left', at: [4, 0] }, torso: 1, legs: [1, 3] }),
    g('right', 'retour', 120, { left: A([22, 30], [18, 34], 'body') }),
  ],
  // vers la gauche (repère retourné), le poing gauche est devant
  left: [
    g('left', 'garde', 80),
    g('left', 'armer', 60, { left: A([20, 31], [17, 35]) }),
    g('left', 'frappe', 80, { left: A([26, 30], [21, 31]), spark: { hand: 'left', at: [4, 0] }, torso: 1, legs: [1, 3] }),
    g('left', 'retour', 120, { left: A([22, 30], [18, 34]) }),
  ],
};

// =====================================================================================================================
// La traînée (smear) et l'éclat
// =====================================================================================================================
// La traînée est l'aire balayée par le bout de la lame (ses deux tiers avant) entre le temps d'avant et celui-ci, calculée
// de leurs deux poses : en arc, l'angle tourne dans le sens donné et la main glisse de l'une à l'autre ; en ligne, la pointe
// va droit de l'une à l'autre (le coup vertical vu de face ou de dos, qui vient vers nous ou s'éloigne). Trois tons, du plus
// opaque (près de la lame, ce qui vient de passer) au plus transparent (la queue), tirés du parchemin `a` et de la lumière du
// bois `^` de la palette du monde, en transparence. Pas de contour : c'est un effet, comme une lueur. L'image fait 64 × 64,
// son centre sur la main du temps de frappe (comme l'image de l'arme).

/** Côté minimal d'une image de traînée ; plus grande si l'arme la plus longue n'y tient pas (toujours centrée sur la main). */
export const SMEAR_SIZE = 64;

/** Les armes qui ont un `weapon` (items.json) : par clé, la portée de la lame, de la main à la pointe, en pixels. */
export const WEAPON_REACH: Record<string, number> = Object.fromEntries(
  Object.entries(itemsJson as Record<string, { weapon?: { length: number; grip: number } }>)
    .filter(([, it]) => it.weapon && !(it.weapon as { fist?: boolean }).fist)
    // longueur devant la main (length − grip), 5 cm par px, la main comprise : l'épée (84 cm) a sa pointe à 16 px de la
    // main, la branche (115 cm) à 22 (les dessins de art/items/weapons.ts)
    .map(([key, it]) => [key, Math.round((it.weapon!.length - it.weapon!.grip) / CM_PER_PX) - 1]),
);

/** Le nom d'une image de traînée : `fx-smear-<arme>-<geste>-<direction>-<n>` (le suffixe est `smear.image` de COMBAT_POSES). */
export const smearImage = (weapon: string, suffix: string) => `fx-smear-${weapon}-${suffix}`;

/** Palette des effets de combat : traînée en trois transparences, éclat plein. */
export const effectPalette: Palette = {
  // traînée : `a` (parchemin) presque plein, puis de plus en plus transparent ; la queue dans `^` (lumière du bois neuf)
  '1': `${world.a}e0`,
  '2': `${world.a}99`,
  '3': '#d2b68860', // woodAges.new '^', transparent
  // éclat : parchemin plein, cœur jaune clair de la lueur (world.H)
  a: world.a,
  H: world.H,
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const tipOf = (hand: Vec, deg: number, reach: number): Vec => [hand[0] + reach * Math.cos(rad(deg)), hand[1] - reach * Math.sin(rad(deg))];

function smearGrid(prev: Frame, cur: Frame, mode: 'ccw' | 'cw' | 'line', reach: number): Grid {
  const a0 = prev.sword!.angle;
  const a1 = cur.sword!.angle;
  const h0 = prev.right.hand;
  const h1 = cur.right.hand;
  let delta = ((a1 - a0) % 360 + 360) % 360; // ccw
  if (mode === 'cw') delta = delta - 360;
  // les points, depuis la main de l'image : (x, y) -> le temps le plus tardif qui y passe
  const best = new Map<string, number>();
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const hand: Vec = [h0[0] + (h1[0] - h0[0]) * t, h0[1] + (h1[1] - h0[1]) * t];
    let tip: Vec;
    if (mode === 'line') {
      const t0 = tipOf(h0, a0, reach);
      const t1 = tipOf(h1, a1, reach);
      tip = [t0[0] + (t1[0] - t0[0]) * t, t0[1] + (t1[1] - t0[1]) * t];
    } else tip = tipOf(hand, a0 + delta * t, reach);
    // le bout de la lame, de plus en plus large vers la lame : la queue ne garde que la pointe
    const from = mode === 'line' ? 0.75 : 0.9 - 0.3 * t;
    for (let r = from; r <= 1.0001; r += 0.6 / reach) {
      const x = Math.round(hand[0] + (tip[0] - hand[0]) * r - h1[0]);
      const y = Math.round(hand[1] + (tip[1] - hand[1]) * r - h1[1]);
      const k = `${x},${y}`;
      best.set(k, Math.max(best.get(k) ?? 0, t));
    }
  }
  // l'image, carrée, paire, centrée sur la main : au moins SMEAR_SIZE, plus si la traînée déborde (bords de la ligne compris)
  let far = 0;
  for (const k of best.keys()) for (const v of k.split(',').map(Number)) far = Math.max(far, Math.abs(v) + 1);
  const size = Math.max(SMEAR_SIZE, 2 * far + 2);
  const C = size / 2;
  const c = new Canvas(size, size);
  for (const [k, t] of best) {
    const [x, y] = k.split(',').map(Number);
    // la traînée droite est courte et vue de face : plus pleine, pour se lire sur le corps
    const [hi, lo] = mode === 'line' ? [0.4, 0.15] : [0.7, 0.35];
    c.set(x + C, y + C, t > hi ? '1' : t > lo ? '2' : '3');
  }
  if (mode === 'line') {
    // la traînée droite fait trois pixels de large : un cœur et deux bords plus légers
    const core = c.toGrid();
    core.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === EMPTY) return;
      for (const dx of [-1, 1]) if (c.get(x + dx, y) === EMPTY) c.set(x + dx, y, ch === '1' ? '2' : '3');
    }));
  }
  return c.toGrid();
}

// ---------- La main par-dessus le corps ----------
// Règle de profondeur de l'arme : la lame qui part vers l'avant de Xéros (vers le haut de l'écran de dos, vers le fond de
// profil gauche) est plus loin de la caméra que lui : `weapon.behind` (et `smear.behind`). Vers le bas de l'écran de face, ou
// du côté du spectateur de profil droit, elle est devant. Quand l'arme est derrière, le jeu dessine l'arme et sa traînée, puis
// le corps, puis la main qui la tient (`grip`), pour que la poignée reste dans la main. Le `grip` n'existe que si le corps
// cache la main (son bras passe sous le torse, la tête ou l'autre bras) : c'est la main seule (3 × 3 de peau et son contour,
// sans la manche), image 5 × 5 `fx-grip-<geste>-<direction>-<n>` posée par son centre sur la main.

export const GRIP_SIZE = 5;

/** Le corps d'une image, la gauche pas encore retournée ; `handOver` : la main droite dessinée par-dessus tout. */
function rawBody(dir: CombatDir, f: Frame, handOver = false): Grid {
  const g = handOver ? { ...f, right: { ...f.right, layer: 'front' as Layer } } : f;
  if (dir === 'down' || dir === 'up') return frontalBody(dir, g);
  return dir === 'right' ? sideBody(g, g.right, g.left) : sideBody(g, g.left, g.right);
}

const SLEEVE = new Set(['t', 'T', 'L']);

/** La main droite seule si le corps la cache (au moins un pixel), sinon rien. Vers la gauche, dans le repère retourné. */
function gripGrid(dir: CombatDir, f: Frame): Grid | undefined {
  const plain = Canvas.from(rawBody(dir, f));
  const over = Canvas.from(rawBody(dir, f, true));
  const [hx, hy] = f.right.hand;
  let hidden = false;
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (plain.get(hx + x, hy + y) !== over.get(hx + x, hy + y)) hidden = true;
  if (!hidden) return undefined;
  const r = (GRIP_SIZE - 1) / 2;
  const c = new Canvas(GRIP_SIZE, GRIP_SIZE);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const z = over.get(hx + x, hy + y);
    if (z === EMPTY) continue;
    const inner = Math.abs(x) <= 1 && Math.abs(y) <= 1;
    // autour de la main : seulement son contour, là où il change le corps (pas la manche, qui reste sous le corps)
    if (!inner && (SLEEVE.has(z) || z === plain.get(hx + x, hy + y))) continue;
    c.set(x + r, y + r, z);
  }
  return c.toGrid();
}

/** L'éclat de l'impact, 7 × 7 : un cœur clair et quatre rayons, deux éclats en biais. Ses pixels seuls sont voulus. */
const SPARK: Grid = [
  '...a...',
  '.H.a...',
  '...H...',
  'aaHaHaa',
  '...H...',
  '...a.H.',
  '...a...',
];
export const SPARK_IMAGE = 'fx-spark';

// =====================================================================================================================
// Les données, pour le jeu
// =====================================================================================================================

export interface CombatPoint { dx: number; dy: number }
export interface CombatHand extends CombatPoint { behind: boolean }
export interface CombatFrame {
  /** Nom du temps (garde, armer, frappe…). */
  name: string;
  /** Durée de l'image, en millisecondes. */
  ms: number;
  /** Les deux mains de Xéros (sa droite, sa gauche), depuis les pieds ; `behind` : le bras passe sous le corps. */
  right: CombatHand;
  left: CombatHand;
  /** Les deux épaules (sa droite, sa gauche), depuis les pieds : la zone de coup d'un poing va de l'épaule au poing. */
  shoulderRight: CombatPoint;
  shoulderLeft: CombatPoint;
  /** L'épée dans la main droite : l'image `angle / 45` de `weapon-wooden-sword`, posée par son centre sur la main droite. */
  weapon?: { angle: number; behind: boolean };
  /** La traînée : le suffixe de son image (`<geste>-<direction>-<n>`) ; l'image est `fx-smear-<arme>-<suffixe>` (`smearImage`),
   *  tirée pour chaque arme à sa longueur, posée par son centre sur (dx, dy) depuis les pieds. */
  smear?: { image: string; dx: number; dy: number; behind: boolean };
  /** L'arme est derrière et le corps cache la main : la main seule (`fx-grip-…`, 5 × 5), son centre sur (dx, dy), par-dessus le corps. */
  grip?: { image: string; dx: number; dy: number };
  /** L'éclat de l'impact (7 × 7), son centre sur (dx, dy) depuis les pieds. */
  spark?: { image: string; dx: number; dy: number };
  /** L'arme ou le poing frappe sur cette image. */
  strike?: true;
}

const FRAMES: Record<CombatGesture, Record<CombatDir, Frame[]>> = {
  cut: CUT,
  overhead: OVERHEAD,
  'jab-right': JAB_RIGHT,
  'jab-left': JAB_LEFT,
};

/** Titre de chaque geste, pour les aperçus. */
export const COMBAT_TITLES: Record<CombatGesture, string> = {
  cut: 'la taille, a l epee de bois',
  overhead: 'le coup vertical, a l epee de bois',
  'jab-right': 'direct du poing droit',
  'jab-left': 'direct du poing gauche (2e appui du gauche-droite)',
};

const at = ([x, y]: Vec): CombatPoint => ({ dx: x - 16, dy: y - 48 });

const smearGrids: Record<string, Grid> = {};
const gripGrids: Record<string, Grid> = {};

/** Par geste, par direction, les images dans l'ordre. Vers la gauche : repère retourné (voir l'en-tête). */
export const COMBAT_POSES: Record<CombatGesture, Record<CombatDir, CombatFrame[]>> = Object.fromEntries(
  (Object.keys(FRAMES) as CombatGesture[]).map((key) => {
    const byDir = Object.fromEntries(COMBAT_DIRS.map((dir) => {
      const list = FRAMES[key][dir];
      return [dir, list.map((f, i): CombatFrame => {
        const sh = shouldersOf(dir, f);
        const d: CombatFrame = {
          name: f.name,
          ms: f.ms,
          right: { ...at(f.right.hand), behind: f.right.layer === 'body' },
          left: { ...at(f.left.hand), behind: f.left.layer === 'body' },
          shoulderRight: at(sh.right),
          shoulderLeft: at(sh.left),
        };
        if (f.sword) d.weapon = { angle: f.sword.angle, behind: f.sword.behind };
        if (f.sword?.behind) {
          const grip = gripGrid(dir, f);
          if (grip) {
            const image = `fx-grip-${key}-${dir}-${i}`;
            gripGrids[image] = grip;
            d.grip = { image, ...at(f.right.hand) };
          }
        }
        if (f.smear && f.sword && i > 0) {
          const suffix = `${key}-${dir}-${i}`;
          for (const [weapon, reach] of Object.entries(WEAPON_REACH)) smearGrids[smearImage(weapon, suffix)] = smearGrid(list[i - 1], f, f.smear.mode, reach);
          d.smear = { image: suffix, ...at(f.right.hand), behind: f.smear.behind };
        }
        if (f.spark) {
          const h = f[f.spark.hand].hand;
          d.spark = { image: SPARK_IMAGE, ...at([h[0] + f.spark.at[0], h[1] + f.spark.at[1]]) };
        }
        // l'épée frappe sur ses deux images de traînée, le poing sur l'image de l'éclat
        if (f.smear || f.spark) d.strike = true;
        return d;
      })];
    })) as Record<CombatDir, CombatFrame[]>;
    return [key, byDir];
  }),
) as Record<CombatGesture, Record<CombatDir, CombatFrame[]>>;

/** Durée d'un coup, garde comprise : la somme des `ms` de ses images. */
export function combatDuration(gesture: CombatGesture, dir: CombatDir = 'down'): number {
  return COMBAT_POSES[gesture][dir].reduce((a, f) => a + f.ms, 0);
}

/** Les corps des gestes : animations `<geste>-<direction>` de la planche `xeros` (la gauche déjà retournée). */
export function combatAnimations(): Record<string, { frames: Grid[]; frameRate: number; repeat: number }> {
  const out: Record<string, { frames: Grid[]; frameRate: number; repeat: number }> = {};
  for (const key of Object.keys(FRAMES) as CombatGesture[]) {
    for (const dir of COMBAT_DIRS) {
      // frameRate sans effet : le jeu impose la durée de chaque image (COMBAT_POSES)
      out[`${key}-${dir}`] = { frames: FRAMES[key][dir].map((f) => bodyOf(dir, f)), frameRate: 10, repeat: 0 };
    }
  }
  return out;
}

/** Les images d'effet : chaque traînée (par arme), chaque main par-dessus, l'éclat. Vers la gauche, dans le repère retourné. */
export const combatEffects: ImageSource[] = [
  ...Object.entries(smearGrids).map(([name, grid]): ImageSource => ({ kind: 'image', name, palette: effectPalette, grid })),
  ...Object.entries(gripGrids).map(([name, grid]): ImageSource => ({ kind: 'image', name, palette: bodyPalette, grid })),
  { kind: 'image', name: SPARK_IMAGE, palette: effectPalette, grid: SPARK },
];
