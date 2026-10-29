// La mère de Xéros — environ 35 ans. Cheveux châtain foncé sous un foulard de lin noué sur la nuque,
// robe de laine bleu-gris délavé (teinte à la guède), tablier écru, manches retroussées.
// Frame 32x48, construite comme Xéros : pieds à y=45, ombre dessous. Têtes écrites en grilles complètes
// (le foulard n'est pas symétrique), buste et jupe en demi-grilles symétrisées puis assombries à droite.
// Vue gauche = vue droite retournée.
// Un peu plus grande que Xéros : 33 px (de y=12 à y=45) contre 31.
// Pas de marche : seulement la respiration (tête et épaules descendent d'1 px, le tablier se creuse,
// les pans du foulard suivent ; les pieds ne bougent pas).

import { Canvas, flipX, mirror, selOut, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE, woad } from '../palette';

const W = 32;
const H = 48;
const HEAD_Y = 12;
const BODY_Y = HEAD_Y + 16;

const palette = {
  o: OUTLINE,
  // foulard de lin (teintes de la tunique de Xéros) ; Y trace les plis profonds et le dessous du nœud
  F: '#ddcca3',
  f: '#c8b388',
  T: '#a8926a',
  Y: '#85704f',
  // cheveux châtain foncé, un peu plus roux que ceux de Xéros
  h: '#6b3d24',
  H: '#8a5434',
  d: '#45261a',
  // peau (celle de Xéros) ; D = ombre profonde du portrait, sert au contour côté lumière
  s: '#e9b993',
  S: '#cf9572',
  D: '#a86b50',
  // robe de laine teinte à la guède (palette commune)
  R: woad.light,
  r: woad.base,
  q: woad.shade,
  Q: woad.deep,
  // tablier écru
  a: '#e6dcc2',
  A: '#c7b994',
  // sabots
  k: '#3d2a1f',
  K: '#5c4130',
  x: '#00000038', // ombre au sol
};

// Contour côté lumière : teinte la plus sombre de chaque matière.
const DARK: Record<string, string> = {
  F: 'Y', f: 'Y', T: 'Y', Y: 'Y',
  h: 'd', H: 'd', d: 'd',
  s: 'D', S: 'D', D: 'D',
  R: 'Q', r: 'Q', q: 'Q', Q: 'Q',
  a: 'A', A: 'A',
};

// Côté droit dans l'ombre : sur les demi-grilles symétrisées, on éteint les reflets à droite du milieu.
const SHADE_RIGHT: Record<string, string> = { R: 'r', H: 'h' };
function shadeRight(g: Grid, from = 16): Grid {
  return g.map((row) => [...row].map((ch, x) => (x >= from ? SHADE_RIGHT[ch] ?? ch : ch)).join(''));
}

// ---------- Vue de face ----------

// Foulard : dôme de lin éclairé en haut à gauche, plis qui filent vers la nuque, ourlet roulé sur le front
// (bande claire, dessous ombré), pans qui descendent derrière les tempes. Raie des cheveux sous l'ourlet.
const headFront: Grid = [
  '.......oooooo.......',
  '.....ooFFFFffoo.....',
  '....oFFFFFFffffo....',
  '...oFFFFFffffTffo...',
  '..oFFFTFffffTfffYo..',
  '..oFTTTTTTTTTTTTYo..',
  '..oFFFFFFFFFFfffYo..',
  '..oThHHhhdhhhhhhYo..',
  '..oThhhssssssshhYo..',
  '..oThhsssssssshhYo..',
  '..oThssossssosshYo..',
  '..oThssossssosshYo..',
  '..oThsssssssssshYo..',
  '...oTssssSSssssSYo..',
  '....ooSssssssSSoo...',
  '......oooooooo......',
];

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

// Le foulard couvre l'arrière du crâne ; les plis convergent vers le nœud, sur la nuque.
const headBack: Grid = [
  '.......oooooo.......',
  '.....ooFFFFffoo.....',
  '....oFFFFFFffffo....',
  '...oFFFFFffffffTo...',
  '..oFFTFFfffffTfffo..',
  '..oFFFTFffffTffffo..',
  '..oFFFFTfffTfffffo..',
  '..oFFFFFTfTffffffo..',
  '..oTFFFFTTTfffffYo..',
  '..oTTTYFfYFfYTTTYo..',
  '..ohhhYFfYFTYhhhho..',
  '..ohHhhhYfYhhhhhho..',
  '..ohhhhhYFfYhhhhho..',
  '...ohhhYFfYTYhhho...',
  '.....oSYFYYTYSo.....',
  '......oYFYoYTYo.....',
];

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
  '.oqQqqqqqq',
  '.ooookKooo',
  '....oooo..',
]);

// Pans du foulard qui pendent du nœud sur le haut du dos (clair à gauche, ombre à droite).
const tailsBack: Grid = [
  'YFY..YTY',
  'YY....YY',
];

// Noeud et pans du tablier, au creux des reins.
const apronBow: Grid = [
  'qaAq',
  'qaAq',
  'qaAq',
  '.qq.',
];

// ---------- Vue de profil (droite) ----------

// Ourlet en diagonale du front vers la nuque, cheveux et oreille dessous, plis qui partent du nœud.
const headSide: Grid = [
  '.....oooooo.......',
  '...ooFFFFFFoo.....',
  '..oFFFFFFFfffo....',
  '.oFFFFFFfffffTo...',
  '.oFTFFFffffffTo...',
  'oFFFTFfffffffffo..',
  'oFfffTffffFFFFFFo.',
  'oTffffTFFFFFTTTTo.',
  'oTTfTFFFTTTThhhho.',
  'oYTFFTTThhhssssso.',
  'oYhhhhsSSsssosso..',
  'ohhhhhsSSsssossso.',
  'ohhhhhhhSssssso...',
  '.ohhhhhhSsssSo....',
  '..oooooooSsso.....',
  '.........ooo......',
];

// Noeud du foulard sur la nuque et ses deux pans, qui dépassent derrière la tête.
const knotSide: Grid = [
  '.oo.',
  'oFfo',
  'oFTo',
  'oTfY',
  '.oTY',
  '.oYo',
  '..o.',
];

const torsoSide: Grid = [
  '.......oSSo.......',
  '...ooooQQQqsoo....',
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
  'oqqqqQqqqqqqqAAAo.',
  'oooooooookkkKKoo..',
  '........ooooooo...',
];

// Le bras est posé sur la robe : ses bords sont dans les ombres de la laine et de la peau, pas en contour.
const armSide: Grid = [
  '.QQ.',
  'QRrQ',
  'QRrQ',
  'QRqQ',
  'QRqQ',
  'DsSD',
  'DsSD',
  'DSSD',
  '.DD.',
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
  if (facing === 'down' && bob) {
    // expiration : la bavette du tablier se creuse sous la poitrine
    c.within('a', (c) => c.line(ox + 8, BODY_Y + 5, ox + 11, BODY_Y + 5, 'A'));
  }
  const head = facing === 'down' ? headFront : headBack;
  c.stamp(head, ox, HEAD_Y + bob);
  if (facing === 'up') c.stamp(tailsBack, ox + 6, HEAD_Y + 16 + bob);
  return selOut(shadeRight(c.toGrid()), DARK);
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
  return selOut(c.toGrid(), DARK);
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
