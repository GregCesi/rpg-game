// Xéros — jeune paysan, coupe au bol brune, tunique teinte au pastel (bleu guède).
// Frame 32x48. Les pieds touchent y=45, l'ombre est dessinée dessous.
// Les vues face et dos sont dessinées en demi-grilles (gauche) puis symétrisées.
// La vue gauche est la vue droite retournée.

import { Canvas, flipX, mirror, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE } from '../palette';

const W = 32;
const H = 48;
const HEAD_Y = 14;

const palette = {
  o: OUTLINE,
  h: '#6e4326', // cheveux
  H: '#91603a',
  d: '#4a2b18',
  s: '#eab68c', // peau
  S: '#c98b64',
  t: '#4d6a8c', // tunique
  T: '#374e6b',
  L: '#6a87a8',
  c: '#d9c9a3', // col en lin
  b: '#5a3a22', // ceinture
  B: '#c9a64a',
  p: '#8a6a48', // pantalon
  P: '#6b5035',
  k: '#3d2a1f', // bottes
  K: '#5c4130',
  x: '#00000038', // ombre au sol
};

// ---------- Vue de face ----------

const headFront = mirror([
  '.......ooo',
  '.....oohhh',
  '....ohhHHH',
  '...ohhhhHH',
  '..ohhhhhhh',
  '..ohhhhhhh',
  '..ohhhhhhh',
  '..ohdhhdhh',
  '..oddddddd',
  '..ohhsssss',
  '..ohhssoss',
  '..ohhssoss',
  '..oddsssss',
  '...oossssS',
  '.....oSsss',
  '......oooo',
]);

const bodyFront = mirror([
  '........oS',
  '....oooocc',
  '...oLttttc',
  '..oLLttttt',
  '..oLtTtttt',
  '..oLtTtttt',
  '..oLtTtttt',
  '..oLtTbbbB',
  '..osSTtttt',
  '..oooTtttt',
  '.....ooooo',
]);

// ---------- Vue de dos ----------

const headBack = mirror([
  '.......ooo',
  '.....oohhh',
  '....ohhHHH',
  '...ohhhhHH',
  '..ohhhhhhh',
  '..ohhhhhhh',
  '..ohhhhhhh',
  '..ohhhhhhh',
  '..ohhhhhhh',
  '..ohhhhhhh',
  '..ohhdhhhd',
  '..ohhdhhhd',
  '..oddddddd',
  '...ooSSSSS',
  '.....oSSSS',
  '......oooo',
]);

const bodyBack = mirror([
  '........oS',
  '....oooott',
  '...oLttttt',
  '..oLLttttt',
  '..oLtTtttt',
  '..oLtTtttt',
  '..oLtTtttt',
  '..oLtTbbbb',
  '..osSTtttt',
  '..oooTtttt',
  '.....ooooo',
]);

const legFront: Grid = [
  'oPpo',
  'oPpo',
  'oPpo',
  'oPpo',
  'okKo',
  'okko',
  'oooo',
];

// ---------- Vue de profil (droite) ----------

const headSide: Grid = [
  '.....oooooo.......',
  '...oohhhhhhoo.....',
  '..ohhhhhHHHhho....',
  '.ohhhhhhhHHhhho...',
  '.ohhhhhhhhhhhhho..',
  'ohhhhhhhhhhhhhhho.',
  'ohhhhhhhhhhhhhhho.',
  'ohhhhhhdhhdhhdhho.',
  'ohhhhhhhddddddddo.',
  'ohhhhhhhSsssssso..',
  'ohhhhhhhSsssosso..',
  'ohhhhhhhSsssossso.',
  'odhhhhhhSssssso...',
  '.odddddoSsssSo....',
  '..oooooooSsso.....',
  '.........ooo......',
];

const bodySide: Grid = [
  '.......oSSo.......',
  '...ooooooooccoo...',
  '..oLttttttttcto...',
  '..oLtttttttttto...',
  '..oLtttttttttto...',
  '..oLtttttttttto...',
  '..oLtttttttttto...',
  '..oLbbbbbbbbbbo...',
  '..oLtttttttttto...',
  '..oTtttttttTtto...',
  '..ooooooooooooo...',
];

const armSide: Grid = [
  '.oo.',
  'oLto',
  'oLto',
  'oLto',
  'otTo',
  'oSso',
  '.oo.',
];

const legSide: Grid = [
  'oPpo.',
  'oPpo.',
  'oPpo.',
  'oPpo.',
  'okkKo',
  'okkko',
  'ooooo',
];

// La jambe du fond est plus sombre pour qu'on lise la profondeur.
const backLeg = (g: Grid) => Canvas.from(g).recolor({ p: 'P', K: 'k' }).toGrid();

// ---------- Composition ----------

function shadow(c: Canvas) {
  c.ellipse(16, 45.5, 7, 2, 'x');
}

type Facing = 'down' | 'up';

/** Face ou dos. legL/legR : décalage vertical de chaque jambe (négatif = levée). bob : décalage du haut du corps. */
function frontal(facing: Facing, legL: number, legR: number, bob: number): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 6;
  const legY = HEAD_Y + 25;
  c.stamp(legFront, ox + 5, legY + legL);
  c.stamp(flipX(legFront), ox + 11, legY + legR);
  c.stamp(facing === 'down' ? bodyFront : bodyBack, ox, HEAD_Y + 16 + bob);
  c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + bob);
  return c.toGrid();
}

/** Profil droit. spread : écart des jambes (0 = jambes jointes). arm : balancement du bras. */
function side(spread: number, arm: number, bob: number, swapLegs = false): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 7;
  const legY = HEAD_Y + 25;
  const back = swapLegs ? legSide : backLeg(legSide);
  const front = swapLegs ? backLeg(legSide) : legSide;
  c.stamp(back, ox + 5 - spread, legY);
  c.stamp(front, ox + 5 + spread, legY);
  c.stamp(bodySide, ox, HEAD_Y + 16 + bob);
  c.stamp(armSide, ox + 6 + arm, HEAD_Y + 18 + bob);
  c.stamp(headSide, ox, HEAD_Y + bob);
  return c.toGrid();
}

const walkFrontal = (f: Facing) => [
  frontal(f, 0, -2, 0),
  frontal(f, 0, 0, -1),
  frontal(f, -2, 0, 0),
  frontal(f, 0, 0, -1),
];

const walkRight = [side(2, -1, 0), side(0, 0, -1), side(2, 1, 0, true), side(0, 0, -1)];

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
