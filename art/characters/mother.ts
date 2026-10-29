// La mère de Xéros — environ 35 ans. Cheveux châtain foncé noués sous un foulard de lin,
// robe de laine brune, tablier écru, manches retroussées.
// Frame 32x48, construite comme Xéros : pieds à y=45, ombre dessous, vues face et dos en demi-grilles
// symétrisées (puis le côté droit est assombri), vue gauche = vue droite retournée.
// Un peu plus grande que Xéros : 33 px (de y=12 à y=45) contre 31.
// Pas de marche : seulement la respiration (le haut du corps descend d'1 px, les pieds ne bougent pas).

import { Canvas, flipX, mirror, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE } from '../palette';

const W = 32;
const H = 48;
const HEAD_Y = 12;
const BODY_Y = HEAD_Y + 16;

const palette = {
  o: OUTLINE,
  // foulard de lin (mêmes teintes que la tunique de Xéros)
  f: '#c8b388',
  F: '#ddcca3',
  T: '#a8926a',
  Y: '#85704f',
  // cheveux châtain foncé, un peu plus roux que ceux de Xéros
  h: '#6b3d24',
  H: '#8a5434',
  d: '#45261a',
  // peau (celle de Xéros)
  s: '#e9b993',
  S: '#cf9572',
  // robe de laine brune
  r: '#6d4532',
  R: '#8a5b3f',
  q: '#4f3024',
  // tablier écru
  a: '#e6dcc2',
  A: '#c7b994',
  // sabots
  k: '#3d2a1f',
  K: '#5c4130',
  x: '#00000038', // ombre au sol
};

// Côté droit dans l'ombre : sur les demi-grilles symétrisées, on éteint les reflets à droite du milieu.
const SHADE_RIGHT: Record<string, string> = { F: 'f', R: 'r', H: 'h' };
function shadeRight(g: Grid, from = 16): Grid {
  return g.map((row, y) => [...row].map((ch, x) => (x >= from ? SHADE_RIGHT[ch] ?? ch : ch)).join(''));
}

// ---------- Vue de face ----------

const headFront = mirror([
  '.......ooo',
  '.....ooFFF',
  '....oFFfff',
  '...oFfffff',
  '..oFffffff',
  '..offfffff',
  '..offfffff',
  '..oTfFFFFF',
  '..oThhHhhd',
  '..oThhssss',
  '..ohhssoss',
  '..ohhssoss',
  '..ohhsssss',
  '...ohssssS',
  '....ooSsss',
  '......oooo',
]);

// Haut du corps : buste, bavette du tablier, bras aux manches retroussées.
const torsoFront = mirror([
  '........oS',
  '....ooooqs',
  '...oRrrrqs',
  '..oRRrrraa',
  '..oRrqraaa',
  '..oRrqraaa',
  '..oRRqraaa',
  '..osSqAAAA',
  '..osSqraaa',
  '..oSSqraaa',
  '..ooorraaa',
]);

// Bas : jupe longue, tablier, bout des sabots.
const skirtFront = mirror([
  '..oqrrraaa',
  '..oqrrraaa',
  '..oqrrraaa',
  '.oqrrrraaa',
  '.oqrrrraaa',
  '.oqrrrraaa',
  '.oqrrrraaa',
  '.oqqqqqAAA',
  '.ooookKooo',
  '....oooo..',
]);

// ---------- Vue de dos ----------

const headBack = mirror([
  '.......ooo',
  '.....ooFFF',
  '....oFFfff',
  '...oFfffff',
  '..oFffffff',
  '..offfffff',
  '..offfffff',
  '..oTffffff',
  '..oTTfffff',
  '..ohTTTfFF',
  '..ohhhoTfF',
  '..ohHhhoTf',
  '..ohhhhhoT',
  '...ohhhhho',
  '.....oSSSS',
  '......oooo',
]);

const torsoBack = mirror([
  '........oS',
  '....ooooqq',
  '...oRrrrrr',
  '..oRRrrrrr',
  '..oRrqrrrr',
  '..oRrqrrrr',
  '..oRRqrrrr',
  '..osSqAAAA',
  '..osSqrrrr',
  '..oSSqrrrr',
  '..ooorrrrr',
]);

const skirtBack = mirror([
  '..oqrrrrrr',
  '..oqrrrrrr',
  '..oqrrrrrq',
  '.oqrrrrrrq',
  '.oqrrrrrrq',
  '.oqrrrrrrq',
  '.oqrrrrrrq',
  '.oqqqqqqqq',
  '.ooookKooo',
  '....oooo..',
]);

// Noeud et pans du tablier, au creux des reins.
const apronBow: Grid = [
  'qaAq',
  'qaAq',
  'qaAq',
  '.qq.',
];

// ---------- Vue de profil (droite) ----------

const headSide: Grid = [
  '.....oooooo.......',
  '...ooFFFFffoo.....',
  '..oFFfffffffTo....',
  '.oFffffffffffTo...',
  '.offfffffffffTo...',
  'offffffffffffTTo..',
  'offffffffffffFFFo.',
  'oTfffffffFFFFhhho.',
  'oTTffffFFhhhHhhho.',
  'ohTTTFFhhhssssso..',
  'ohhhhhsSSsssosso..',
  'ohhhhhsSSsssossso.',
  'ohhhhhhhSssssso...',
  '.ohhhhhhSsssSo....',
  '..oooooooSsso.....',
  '.........ooo......',
];

// Noeud du foulard sur la nuque, qui dépasse derrière la tête.
const knotSide: Grid = [
  '.oo.',
  'oFfo',
  'oTfo',
  '.oTo',
  '..o.',
];

const torsoSide: Grid = [
  '.......oSSo.......',
  '...oooooooqsoo....',
  '..oRrrrrrrrraAo...',
  '..oRrrrrrrrraAo...',
  '..oRrrrrrrrraAo...',
  '..oRrrrrrrrraAo...',
  '..oRrrrrrrrraAo...',
  '..oRAAAAAAAAaAo...',
  '..oRrrrrrrrraaAo..',
];

const skirtSide: Grid = [
  '..oRrrrrrrrraaAo..',
  '..oRrrrrrrrraaAo..',
  '..oRrrrrrrrraaAo..',
  '.oRrrrrrrrrraaAo..',
  '.oRrrrrrrrrraaAo..',
  '.oRrrrrrrrrraaaAo.',
  'oRrrrrrrrrrraaaAo.',
  'oqqqqqqqqqqqqAAAo.',
  'oooooooookkkKKoo..',
  '........ooooooo...',
];

const armSide: Grid = [
  '.oo.',
  'oRro',
  'oRro',
  'oRro',
  'oRRo',
  'osSo',
  'osSo',
  'oSSo',
  '.oo.',
];

// ---------- Composition ----------

function shadow(c: Canvas) {
  c.ellipse(16.5, 45.5, 7.5, 2, 'x');
}

type Facing = 'down' | 'up';

/** Face ou dos. bob : le buste et la tête descendent de `bob` px (respiration), la jupe reste en place. */
function frontal(facing: Facing, bob: number): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 6;
  c.stamp(facing === 'down' ? skirtFront : skirtBack, ox, BODY_Y + 8);
  c.stamp(facing === 'down' ? torsoFront : torsoBack, ox, BODY_Y + bob);
  if (facing === 'up') c.stamp(apronBow, ox + 8, BODY_Y + 8 + bob);
  c.stamp(facing === 'down' ? headFront : headBack, ox, HEAD_Y + bob);
  return shadeRight(c.toGrid());
}

/** Profil droit. */
function side(bob: number): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  const ox = 7;
  c.stamp(skirtSide, ox, BODY_Y + 8);
  c.stamp(torsoSide, ox, BODY_Y + bob);
  c.stamp(armSide, ox + 6, BODY_Y + 2 + bob);
  c.stamp(knotSide, ox - 2, HEAD_Y + 7 + bob);
  c.stamp(headSide, ox, HEAD_Y + bob);
  return c.toGrid();
}

const breathe = <T>(f: (bob: number) => T) => [f(0), f(1)];

const mother: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'mother',
  frameW: W,
  frameH: H,
  palette,
  animations: {
    'idle-down': { frames: breathe((b) => frontal('down', b)), frameRate: 2, repeat: -1 },
    'idle-up': { frames: breathe((b) => frontal('up', b)), frameRate: 2, repeat: -1 },
    'idle-right': { frames: breathe(side), frameRate: 2, repeat: -1 },
    'idle-left': { frames: breathe(side).map(flipX), frameRate: 2, repeat: -1 },
  },
};

export default mother;
