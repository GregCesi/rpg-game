// ESSAI (chantier « combat ») : de vrais gestes de combat, d'une main, pour Xéros. Rien de ce fichier n'est chargé par le jeu ni
// déclaré dans art/index.ts ; tools/essai-gestes.ts le pose sur .art-preview/essai-gestes.png pour que Grégoire choisisse.
//
// Quatre gestes, dans les quatre directions (docs/CONCEPTION.md, « Le combat » : le corps a ses gestes, qui ne savent pas ce
// qu'il tient ; l'arme garde son dessin unique en huit angles, planche `weapon-wooden-sword`, posée sur la main image par image) :
//   - `cut`       la taille, à l'épée de bois : garde, armer, frappe en deux images très rapides (avec la traînée), suite, retour ;
//   - `overhead`  le coup vertical : l'épée au-dessus de la tête, abattue devant, la pointe près du sol, retour ;
//   - `jab-right` le direct du poing droit (main vide), avec un éclat au bout du poing à l'impact ;
//   - `jab-left`  le direct du poing gauche, le deuxième appui de l'enchaînement gauche-droite.
//
// Les DONNÉES (`COMBAT_GESTURES`) servent telles quelles à l'intégration : à chaque image, sa durée, le point des deux mains
// (dx, dy depuis les pieds, comme gestures.json), l'angle de l'épée (multiple de 45 : 0 = est, 90 = nord) et si elle passe
// derrière le corps, la traînée (son image et son point) et l'éclat.
//
// La gauche : l'épée reste dans la main DROITE. Vers la gauche, la main droite est du côté du fond (au nord) : la vue gauche
// n'est donc PAS le miroir de la droite. Elle est dessinée comme un profil droit dont le bras du fond tient l'épée, puis
// retournée : ses données (`poses.left`) sont écrites comme celles de la droite, dans le repère retourné (le jeu les retourne
// comme il le fait aujourd'hui : dx opposé, image de l'arme retournée). À l'intégration, `poses.left` remplace le miroir de
// `poses.right` quand il existe.
//
// Le corps reprend les pièces de art/characters/xeros.ts (tête, torse, jambes, bras par le coude, couches, contour) : elles y
// sont privées, elles sont recopiées ici pour l'essai ; l'intégration les exportera de xeros.ts au lieu de les recopier.

import { Canvas, EMPTY, flipX, selOut, type Grid, type Palette } from '../lib/canvas';
import { capsule } from '../items/lib';
import xeros from '../characters/xeros';

type Vec = [number, number];
export type Dir = 'down' | 'up' | 'right' | 'left';
export const DIRS: Dir[] = ['down', 'up', 'right', 'left'];

const W = 32;
const H = 48;
const HEAD_Y = 14;
const BODY_Y = HEAD_Y + 15;
const FRONT_X = 10;
const SIDE_X = 10;

/** La palette du corps : celle de Xéros. */
export const bodyPalette: Palette = xeros.palette;

const DARK: Record<string, string> = {
  h: 'd', H: 'd', d: 'd',
  s: 'D', S: 'D', D: 'D',
  L: 'Y', t: 'Y', T: 'Y', Y: 'Y',
  b: 'b',
  p: 'P', P: 'P',
  k: 'k', K: 'k',
};

// ---------- Pièces du corps (recopiées de art/characters/xeros.ts) ----------

const headFront: Grid = [
  '...oooooo...',
  '..ohHHhhho..',
  '.ohHHHhhhdo.',
  '.ohHHhhhhdo.',
  '.ohHhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhdhhhdo.',
  '.osddddddSo.',
  '.osssddssSo.',
  'oSssossosSSo',
  'oSssossosSSo',
  '.osssssssSo.',
  '..ossssSSo..',
  '...osssSo...',
  '....oooo....',
];

const headBack: Grid = [
  '...oooooo...',
  '..ohHHhhho..',
  '.ohHHHhhhdo.',
  '.ohHHhhhhdo.',
  '.ohHhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  '.ohhhhhhhdo.',
  'oSdhhhhhhdSo',
  'oSsddddddsSo',
  '.ossssssSSo.',
  '..osSSSSSo..',
  '...oSSSSo...',
  '....oooo....',
];

const torsoFront: Grid = [
  '.osSo.',
  'oosSoo',
  'LtTTtt',
  'Lttttt',
  'YLttTY',
  'YLttTY',
  'YLttTY',
  'YbbbbY',
  'YLttTY',
  'LttTTT',
  'LtTTTT',
  'oooooo',
];

const torsoBack: Grid = [
  '.osSo.',
  'oottoo',
  'LttTtT',
  'LttTtt',
  'YLtTtY',
  'YLttTY',
  'YLttTY',
  'YbbbbY',
  'YLtTtY',
  'LttTTT',
  'LtTTTT',
  'oooooo',
];

const legLeft: Grid = ['opPo', 'opPo', 'opPo', 'oKko', 'oKko', 'oooo'];
const legRight: Grid = ['opPo', 'opPo', 'oPPo', 'oKko', 'okko', 'oooo'];
const LEG_L = 2;
const LEG_R = 6;

const headSide: Grid = [
  '...ooooo....',
  '.oohHHhhoo..',
  '.ohHHHhhhho.',
  'ohHHhhhhhho.',
  'ohHhhhhhhho.',
  'ohhhhhhhhho.',
  'ohhhhhhdhdo.',
  'ohhhddddddo.',
  'ohhdsssssso.',
  'ohdSsssosso.',
  'ohsSDssossso',
  '.osSsssssSo.',
  '..ossssssSo.',
  '...ossDDSo..',
  '....osDooo..',
];

const bodySide: Grid = [
  '...oLtTo....',
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

const legSide: Grid = ['opPo.', 'opPo.', 'opPo.', 'oKkko', 'okkko', 'ooooo'];
const LEG_SIDE: [number, number] = [3, 5];
const backLeg = (g: Grid) => Canvas.from(g).recolor({ p: 'P', K: 'k' }).toGrid();

const isMatter = (ch: string) => ch !== EMPTY && ch !== 'x' && ch !== 'o';

function shadow(c: Canvas) {
  c.ellipse(16.5, 45.5, 5.5, 2, 'x');
}

function rim(c: Canvas) {
  const add: Vec[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = c.get(x, y);
    if (ch !== EMPTY && ch !== 'x') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isMatter(c.get(x + dx, y + dy)))) add.push([x, y]);
  }
  for (const [x, y] of add) c.set(x, y, 'o');
}

/** Bras de l'épaule à la main par le coude, la main (ou le poing) de 3 × 3 au bout (xeros.ts, `arm`). */
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

const bareTorso = (torso: Grid): Grid => torso.map((row) => '...' + row + '...');

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
  /** Nom du temps (garde, armer…), pour la planche. */
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
  /** Face/dos : [dx, dy] de la jambe gauche de l'image, puis de la droite. Profil : [recul du pied arrière, avance du pied avant]. */
  legs?: [number, number, number, number] | [number, number];
}

// ---------- Les corps ----------

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
  const imgL = facing === 'down' ? f.right : f.left;
  const imgR = facing === 'down' ? f.left : f.right;
  const shL: Vec = [12 + tdx, BODY_Y + 2];
  const shR: Vec = [19 + tdx, BODY_Y + 2];
  const draw = (layer: Layer) => {
    if (imgL.layer === layer) { rim(c); arm(c, [shL, imgL.elbow, imgL.hand], 't', 'L'); }
    if (imgR.layer === layer) { rim(c); arm(c, [shR, imgR.elbow, imgR.hand], 'T', 't'); }
  };
  draw('body');
  c.stamp(bareTorso(facing === 'down' ? torsoFront : torsoBack), ox + tdx, BODY_Y);
  draw('head');
  c.stamp(facing === 'down' ? headFront : headBack, ox + (f.head ?? 0), HEAD_Y);
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
  const lean = f.torso ?? 0;
  const shift = lean < 0 ? [-1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]
    : lean > 0 ? [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] : Array(12).fill(0);
  const body = bodySide.map((row, y) => (shift[y] >= 0 ? '.'.repeat(shift[y]) + row : row.slice(-shift[y]) + '.'.repeat(-shift[y])));
  const nearSh: Vec = [15 + shift[2], BODY_Y + 2];
  const farSh: Vec = [16 + shift[2], BODY_Y + 2];
  const draw = (layer: Layer) => {
    if (far.layer === layer) { rim(c); arm(c, [farSh, far.elbow, far.hand], 'T', 'T'); }
    if (near.layer === layer) { rim(c); arm(c, [nearSh, near.elbow, near.hand], 't', 'L'); }
  };
  draw('body');
  c.stamp(body, ox, BODY_Y);
  draw('head');
  c.stamp(headSide, ox + (f.head ?? lean), HEAD_Y);
  draw('front');
  rim(c);
  return selOut(c.toGrid(), DARK);
}

function bodyOf(dir: Dir, f: Frame): Grid {
  if (dir === 'down' || dir === 'up') return frontalBody(dir, f);
  // vers la droite, la main droite est devant ; vers la gauche, au fond (repère retourné)
  return dir === 'right' ? sideBody(f, f.right, f.left) : flipX(sideBody(f, f.left, f.right));
}

// ---------- Raccourcis d'écriture ----------

const A = (hand: Vec, elbow: Vec, layer: Layer = 'front'): Arm => ({ hand, elbow, layer });
const S = (angle: number, behind = false) => ({ angle, behind });

// =====================================================================================================================
// 1. La taille, à l'épée de bois
// =====================================================================================================================
// Coup droit de la main droite : armée derrière l'épaule droite, l'épée balaie devant lui de sa droite vers sa gauche, à
// hauteur de taille, et finit basse de l'autre côté. Vue d'en haut, la pointe tourne dans le sens inverse des aiguilles d'une
// montre de face (sa droite est à gauche de l'image) et de profil droit ; dans le sens trigonométrique à l'écran.
// Durées : garde 80, armer 150, frappe 50 + 50, suite 100, retour 100 (450 ms de l'armé au retour, le coup d'épée du jeu
// dure 0,6 s avec la garde).

const CUT: Record<Dir, Frame[]> = {
  // de face : sa main droite est à gauche de l'image
  down: [
    { name: 'garde', ms: 80, right: A([13, 36], [11, 34]), left: A([20, 35], [21, 33]), sword: S(315), legs: [0, 0, 0, 1] },
    { name: 'armer', ms: 150, right: A([9, 29], [8, 33], 'head'), left: A([19, 35], [21, 33]), sword: S(135, true), torso: -1, head: -1, legs: [-1, 0, 0, 1] },
    { name: 'frappe 1', ms: 50, right: A([10, 37], [9, 34]), left: A([21, 34], [22, 33], 'body'), sword: S(225), smear: { mode: 'ccw', behind: false }, legs: [-1, 0, 1, 1] },
    { name: 'frappe 2', ms: 50, right: A([17, 39], [12, 36]), left: A([21, 33], [22, 32], 'body'), sword: S(315), smear: { mode: 'ccw', behind: false }, torso: 1, legs: [-1, 0, 1, 1] },
    { name: 'suite', ms: 100, right: A([22, 37], [16, 37]), left: A([21, 32], [22, 31], 'body'), sword: S(0), torso: 1, head: 1, legs: [-1, 0, 1, 1] },
    { name: 'retour', ms: 100, right: A([16, 37], [12, 35]), left: A([20, 35], [21, 33]), sword: S(315), legs: [0, 0, 0, 1] },
  ],
  // de dos : sa main droite est à droite de l'image ; armée derrière l'épaule, l'épée vers nous, puis elle passe devant
  // lui (derrière la tête pour nous) et finit basse à sa gauche, revenue de notre côté
  up: [
    { name: 'garde', ms: 80, right: A([22, 35], [22, 33], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(90, true), legs: [0, -1, 0, 0] },
    { name: 'armer', ms: 150, right: A([23, 30], [23, 33]), left: A([11, 35], [9, 33], 'body'), sword: S(315), torso: 1, head: 1, legs: [0, -1, 1, 0] },
    { name: 'frappe 1', ms: 50, right: A([24, 33], [23, 33]), left: A([10, 34], [9, 33], 'body'), sword: S(45, true), smear: { mode: 'ccw', behind: false }, torso: 1, legs: [-1, -1, 1, 0] },
    { name: 'frappe 2', ms: 50, right: A([16, 29], [21, 32], 'body'), left: A([10, 34], [9, 33], 'body'), sword: S(135, true), smear: { mode: 'ccw', behind: true }, torso: -1, legs: [-1, -1, 1, 0] },
    { name: 'suite', ms: 100, right: A([9, 37], [12, 34], 'body'), left: A([9, 32], [8, 34], 'body'), sword: S(225), torso: -1, head: -1, legs: [-1, -1, 1, 0] },
    { name: 'retour', ms: 100, right: A([21, 35], [22, 33], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(45, true), legs: [0, -1, 0, 0] },
  ],
  // de profil droit : la main droite est devant ; armée par-dessus l'épaule, la pointe passe derrière lui, à son côté (vers
  // nous, en bas de l'image), devant lui, et finit de l'autre côté, au fond, derrière le corps
  right: [
    { name: 'garde', ms: 80, right: A([19, 36], [16, 36]), left: A([18, 34], [17, 35], 'body'), sword: S(0), legs: [1, 1] },
    { name: 'armer', ms: 150, right: A([12, 30], [12, 34]), left: A([18, 34], [17, 35], 'body'), sword: S(135), torso: -1, legs: [2, 1] },
    { name: 'frappe 1', ms: 50, right: A([16, 37], [14, 35]), left: A([19, 33], [18, 35], 'body'), sword: S(225), smear: { mode: 'ccw', behind: false }, legs: [1, 2] },
    { name: 'frappe 2', ms: 50, right: A([24, 34], [20, 34]), left: A([18, 33], [17, 35], 'body'), sword: S(0), smear: { mode: 'ccw', behind: false }, torso: 1, legs: [1, 3] },
    { name: 'suite', ms: 100, right: A([20, 34], [18, 36]), left: A([16, 35], [15, 36], 'body'), sword: S(45, true), torso: 1, legs: [1, 3] },
    { name: 'retour', ms: 100, right: A([19, 36], [16, 36]), left: A([18, 34], [17, 35], 'body'), sword: S(0), legs: [1, 2] },
  ],
  // vers la gauche (dessiné en profil droit, retourné) : la main droite est au fond ; armée derrière la tête, la pointe passe
  // au fond (son côté droit), devant lui, puis revient devant le corps, basse, de notre côté
  left: [
    { name: 'garde', ms: 80, right: A([21, 36], [18, 36], 'body'), left: A([19, 34], [16, 35]), sword: S(0, true), legs: [1, 1] },
    { name: 'armer', ms: 150, right: A([13, 29], [13, 33], 'body'), left: A([20, 35], [17, 35]), sword: S(135, true), torso: -1, legs: [2, 1] },
    { name: 'frappe 1', ms: 50, right: A([22, 31], [18, 33], 'body'), left: A([19, 36], [16, 36]), sword: S(90, true), smear: { mode: 'cw', behind: true }, legs: [1, 2] },
    { name: 'frappe 2', ms: 50, right: A([24, 34], [20, 34], 'body'), left: A([17, 36], [15, 36]), sword: S(0, true), smear: { mode: 'cw', behind: false }, torso: 1, legs: [1, 3] },
    { name: 'suite', ms: 100, right: A([21, 38], [18, 36], 'front'), left: A([15, 36], [14, 35]), sword: S(315), torso: 1, legs: [1, 3] },
    { name: 'retour', ms: 100, right: A([21, 36], [18, 36], 'body'), left: A([19, 34], [16, 35]), sword: S(0, true), legs: [1, 2] },
  ],
};

// =====================================================================================================================
// 2. Le coup vertical, à l'épée de bois
// =====================================================================================================================
// L'épée levée au-dessus de la tête (le bras droit tendu en l'air), abattue devant lui, la pointe près du sol, puis retour.
// De face, la lame descend le long du côté droit de la tête (pas devant le visage) : une traînée droite, verticale. Durées :
// garde 80, armer 180, frappe 50 + 50, tenue 120 (la pointe au sol), retour 120.

const OVERHEAD: Record<Dir, Frame[]> = {
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
    { name: 'frappe 2', ms: 50, right: A([23, 37], [23, 32], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(90, true), smear: { mode: 'line', behind: true }, legs: [0, -2, 0, 0] },
    { name: 'tenue', ms: 120, right: A([23, 38], [23, 33], 'body'), left: A([10, 35], [9, 33], 'body'), sword: S(90, true), legs: [0, -2, 0, 0] },
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
    { name: 'frappe 2', ms: 50, right: A([23, 33], [20, 31], 'body'), left: A([17, 36], [15, 36]), sword: S(315, true), smear: { mode: 'cw', behind: false }, torso: 1, legs: [1, 3] },
    { name: 'tenue', ms: 120, right: A([23, 34], [20, 32], 'body'), left: A([17, 36], [15, 36]), sword: S(315, true), torso: 1, legs: [1, 3] },
    { name: 'retour', ms: 120, right: A([21, 36], [18, 36], 'body'), left: A([19, 34], [16, 35]), sword: S(0, true), legs: [1, 2] },
  ],
};

// =====================================================================================================================
// 3. Les coups de poing (main vide)
// =====================================================================================================================
// Garde poings levés devant le menton, le poing gauche (le poing avant) un peu plus loin. Armer très court : l'épaule recule.
// Le bras se tend, petit pas du pied avant, un éclat au bout du poing ; retour en garde. Durées : garde 80, armer 60, frappe
// 80, retour 120. Le direct du gauche est le deuxième appui de l'enchaînement gauche-droite : même construction, l'autre bras.

const GUARD: Record<Dir, Pick<Frame, 'right' | 'left' | 'legs'>> = {
  down: { right: A([13, 31], [11, 35]), left: A([18, 32], [20, 35]), legs: [0, 0, 0, 1] },
  up: { right: A([20, 31], [21, 35], 'body'), left: A([12, 32], [10, 35], 'body'), legs: [0, -1, 0, 0] },
  right: { right: A([19, 31], [16, 35]), left: A([21, 30], [18, 34], 'body'), legs: [1, 1] },
  left: { right: A([20, 31], [17, 34], 'body'), left: A([21, 30], [17, 34]), legs: [1, 1] },
};

const g = (d: Dir, name: string, ms: number, over: Partial<Frame> = {}): Frame => ({ name, ms, ...GUARD[d], ...over });

const JAB_RIGHT: Record<Dir, Frame[]> = {
  down: [
    g('down', 'garde', 80),
    g('down', 'armer', 60, { right: A([12, 31], [10, 34]), torso: -1, head: 0 }),
    g('down', 'frappe', 80, { right: A([15, 35], [13, 33]), spark: { hand: 'right', at: [0, 4] }, legs: [0, 0, 0, 2] }),
    g('down', 'retour', 120, { right: A([13, 33], [11, 35]) }),
  ],
  up: [
    g('up', 'garde', 80),
    g('up', 'armer', 60, { right: A([21, 32], [22, 35], 'body'), torso: 1 }),
    g('up', 'frappe', 80, { right: A([22, 24], [21, 28], 'body'), spark: { hand: 'right', at: [0, -4] }, legs: [0, -2, 0, 0] }),
    g('up', 'retour', 120, { right: A([21, 30], [22, 34], 'body') }),
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

const JAB_LEFT: Record<Dir, Frame[]> = {
  down: [
    g('down', 'garde', 80),
    g('down', 'armer', 60, { left: A([19, 31], [21, 34]), torso: 1 }),
    g('down', 'frappe', 80, { left: A([17, 35], [19, 33]), spark: { hand: 'left', at: [0, 4] }, legs: [0, 0, 0, 2] }),
    g('down', 'retour', 120, { left: A([18, 33], [20, 35]) }),
  ],
  up: [
    g('up', 'garde', 80),
    g('up', 'armer', 60, { left: A([11, 32], [9, 35], 'body'), torso: -1 }),
    g('up', 'frappe', 80, { left: A([9, 24], [10, 28], 'body'), spark: { hand: 'left', at: [0, -4] }, legs: [0, -2, 0, 0] }),
    g('up', 'retour', 120, { left: A([11, 30], [10, 34], 'body') }),
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

export const SMEAR_SIZE = 64;
const SMEAR_C = SMEAR_SIZE / 2;
/** Longueur de la lame de la main à la pointe (art/items/weapons.ts : la garde à +2, 14 px de lame). */
const REACH = 16;

export const effectPalette: Palette = {
  // traînée : `a` (parchemin, world.a) presque plein, puis `^` (lumière du bois, woodAges.new) de plus en plus transparent
  '1': '#efe6cce0',
  '2': '#efe6cc99',
  '3': '#d2b68860',
  // éclat : parchemin plein, cœur jaune clair de la lueur (world.H)
  a: '#efe6cc',
  H: '#f6d36b',
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const tipOf = (hand: Vec, deg: number): Vec => [hand[0] + REACH * Math.cos(rad(deg)), hand[1] - REACH * Math.sin(rad(deg))];

function smearGrid(prev: Frame, cur: Frame, mode: 'ccw' | 'cw' | 'line'): Grid {
  const a0 = prev.sword!.angle;
  const a1 = cur.sword!.angle;
  const h0 = prev.right.hand;
  const h1 = cur.right.hand;
  let delta = ((a1 - a0) % 360 + 360) % 360; // ccw
  if (mode === 'cw') delta = delta - 360;
  const best = new Map<string, number>();
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const hand: Vec = [h0[0] + (h1[0] - h0[0]) * t, h0[1] + (h1[1] - h0[1]) * t];
    let tip: Vec;
    if (mode === 'line') {
      const t0 = tipOf(h0, a0);
      const t1 = tipOf(h1, a1);
      tip = [t0[0] + (t1[0] - t0[0]) * t, t0[1] + (t1[1] - t0[1]) * t];
    } else tip = tipOf(hand, a0 + delta * t);
    // le bout de la lame, de plus en plus large vers la lame : la queue ne garde que la pointe
    const from = mode === 'line' ? 0.75 : 0.9 - 0.3 * t;
    for (let r = from; r <= 1.0001; r += 0.04) {
      const x = Math.round(hand[0] + (tip[0] - hand[0]) * r - h1[0] + SMEAR_C);
      const y = Math.round(hand[1] + (tip[1] - hand[1]) * r - h1[1] + SMEAR_C);
      const k = `${x},${y}`;
      best.set(k, Math.max(best.get(k) ?? 0, t));
    }
  }
  const c = new Canvas(SMEAR_SIZE, SMEAR_SIZE);
  for (const [k, t] of best) {
    const [x, y] = k.split(',').map(Number);
    // la traînée droite est courte et vue de face : plus pleine, pour se lire sur le corps
    const [hi, lo] = mode === 'line' ? [0.4, 0.15] : [0.7, 0.35];
    c.set(x, y, t > hi ? '1' : t > lo ? '2' : '3');
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

/** L'éclat de l'impact, 7 × 7 : un cœur clair et quatre rayons, deux éclats en biais. Ses pixels seuls sont voulus. */
export const SPARK: Grid = [
  '...a...',
  '.H.a...',
  '...H...',
  'aaHaHaa',
  '...H...',
  '...a.H.',
  '...a...',
];

// =====================================================================================================================
// Les données, pour l'intégration
// =====================================================================================================================

export interface HandData { dx: number; dy: number; behind: boolean }
export interface CombatFrameData {
  name: string;
  /** Durée de l'image, en millisecondes. */
  ms: number;
  /** Les deux mains de Xéros (sa droite, sa gauche), depuis les pieds ; `behind` : le bras passe sous le corps. */
  right: HandData;
  left: HandData;
  /** L'épée dans la main droite : l'image `angle / 45` de `weapon-wooden-sword`, posée par son centre sur la main droite. */
  weapon?: { angle: number; behind: boolean };
  /** La traînée : son image (64 × 64), posée par son centre sur (dx, dy) depuis les pieds. */
  smear?: { image: string; dx: number; dy: number; behind: boolean };
  /** L'éclat de l'impact (7 × 7), son centre sur (dx, dy) depuis les pieds. */
  spark?: { image: string; dx: number; dy: number };
}
export interface CombatGesture {
  title: string;
  /** L'image où le coup porte (la deuxième image de frappe, ou celle du poing tendu). */
  impact: number;
  poses: Record<Dir, CombatFrameData[]>;
}

const GESTURES: Record<string, { title: string; frames: Record<Dir, Frame[]> }> = {
  cut: { title: 'la taille, a l epee de bois', frames: CUT },
  overhead: { title: 'le coup vertical, a l epee de bois', frames: OVERHEAD },
  'jab-right': { title: 'direct du poing droit', frames: JAB_RIGHT },
  'jab-left': { title: 'direct du poing gauche (2e appui du gauche-droite)', frames: JAB_LEFT },
};

const at = ([x, y]: Vec) => ({ dx: x - 16, dy: y - 48 });

/** Les images dessinées : le corps de chaque image, les traînées, l'éclat. */
export const bodyFrames: Record<string, Record<Dir, Grid[]>> = {};
export const smearImages: Record<string, Grid> = { };
export const sparkImage = { name: 'fx-spark', grid: SPARK };

export const COMBAT_GESTURES: Record<string, CombatGesture> = Object.fromEntries(
  Object.entries(GESTURES).map(([key, { title, frames }]) => {
    bodyFrames[key] = {} as Record<Dir, Grid[]>;
    const poses = {} as Record<Dir, CombatFrameData[]>;
    for (const dir of DIRS) {
      const list = frames[dir];
      bodyFrames[key][dir] = list.map((f) => bodyOf(dir, f));
      poses[dir] = list.map((f, i) => {
        const d: CombatFrameData = {
          name: f.name,
          ms: f.ms,
          right: { ...at(f.right.hand), behind: f.right.layer === 'body' },
          left: { ...at(f.left.hand), behind: f.left.layer === 'body' },
        };
        if (f.sword) d.weapon = { angle: f.sword.angle, behind: f.sword.behind };
        if (f.smear && f.sword && i > 0) {
          const image = `fx-smear-${key}-${dir}-${i}`;
          smearImages[image] = smearGrid(list[i - 1], f, f.smear.mode);
          d.smear = { image, ...at(f.right.hand), behind: f.smear.behind };
        }
        if (f.spark) {
          const h = f[f.spark.hand].hand;
          d.spark = { image: sparkImage.name, ...at([h[0] + f.spark.at[0], h[1] + f.spark.at[1]]) };
        }
        return d;
      });
    }
    const impact = Math.max(0, frames.down.findIndex((f) => f.spark) >= 0
      ? frames.down.findIndex((f) => f.spark)
      : frames.down.map((f) => !!f.smear).lastIndexOf(true));
    return [key, { title, impact, poses }];
  }),
);
