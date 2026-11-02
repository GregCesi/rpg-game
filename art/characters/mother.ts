// La mère de Xéros — environ 35 ans. Cheveux châtain foncé sous un foulard de lin noué sur la nuque,
// robe de laine bleu-gris délavé (teinte à la guède), tablier écru, manches retroussées.
// Frame 32x48, construite comme Xéros : pieds à y=45, ombre dessous. Têtes écrites en grilles complètes
// (le foulard n'est pas symétrique), buste et jupe en demi-grilles symétrisées puis assombries à droite.
// Vue gauche = vue droite retournée.
// Même taille que Xéros : 32 px de haut (y=14 à y=45, 1,60 m) et 12 px de large (x=10 à 21, 60 cm), yeux à la même
// hauteur que les siens (y=23-24).
// Pas de marche : seulement la respiration (tête et épaules descendent d'1 px, le tablier se creuse,
// les pans du foulard suivent ; les pieds ne bougent pas).

import { Canvas, flipX, mirror, selOut, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE, woad } from '../palette';

const W = 32;
const H = 48;
const HEAD_Y = 14;
const BODY_Y = HEAD_Y + 15;
/** Colonne gauche de la silhouette (12 px de large, centrée sur la frame). */
const OX = 10;

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
// (bande d'ombre, puis bande claire), pans qui descendent derrière les tempes jusqu'à la mâchoire. Raie des cheveux
// sous l'ourlet. Yeux en x=14 et 17, comme Xéros.
const headFront: Grid = [
  '...oooooo...',
  '..oFFFFffo..',
  '.oFFFFffffo.',
  'oFFFFfffTfYo',
  'oFFTFffTffYo',
  'oFTTTTTTTTYo', // dessous de l'ourlet roulé
  'oFFFFFFFffYo', // ourlet
  'oThHhhdhhhYo', // raie des cheveux
  'oThsssssshYo',
  'oThsossoshYo', // yeux
  'oThsossoshYo',
  'oThsssssshYo',
  '.oTssssssSYo',
  '..ooSsssSoo.',
  '....oooo....',
];

// Haut du corps : buste, bavette du tablier, bras aux manches retroussées (avant-bras et mains en peau). Demi-grille.
const torsoFront = mirror([
  '....oS', // cou
  '..ooqs', // col
  '.oRrqs', // encolure
  'oRRraa', // bavette
  'oRrqaa', // bras séparé du buste par l'ombre de la laine
  'oRrqaa',
  'osSqAA', // taille du tablier, avant-bras
  'osSqaa', // mains
  'oSSqaa',
  'oooraa',
]);

// Bas : jupe longue qui s'évase, tablier, bout des sabots. Demi-grille.
const skirtFront = mirror([
  '.oqraa',
  '.oqraa',
  '.oqraa',
  '.oqraa',
  'oqrraa',
  'oqrraa',
  'oqrraa',
  'oqqqAA', // ourlet
  'ooookK', // sabots
  '....oo',
]);

// ---------- Vue de dos ----------

// Le foulard couvre l'arrière du crâne ; les plis convergent vers le nœud, sur la nuque, d'où pendent les pans.
// Les cheveux dépassent de part et d'autre.
const headBack: Grid = [
  '...oooooo...',
  '..oFFFFffo..',
  '.oFFFFffffo.',
  'oFFTFFffTffo',
  'oFFFTFfTfffo',
  'oFFFFTfTfffo',
  'oFFFFTTffffo',
  'oTFFFFfffTYo',
  'oTTTTFfTTTYo', // bord du foulard, plis qui finissent au nœud
  'ohhhYFfYhhho', // nœud
  'ohHhYffYhhho',
  '.ohhoYYohho.',
  '..oSSFTSSo..', // nuque, pans du nœud
  '...oSFTSo...',
  '....YFTY....',
];

const torsoBack = mirror([
  '....oS',
  '..ooqq',
  '.oRrrr',
  'oRRrrr',
  'oRrqrr',
  'oRrqrr',
  'osSqAA', // lien du tablier
  'osSqrr',
  'oSSqrr',
  'ooorrr',
]);

const skirtBack = mirror([
  '.oqrrr',
  '.oqrrr',
  '.oqrrr',
  '.oqrrq',
  'oqrrrq',
  'oqrrrq',
  'oqrrrq',
  'oqQqqq',
  'ooookK',
  '....oo',
]);

// Pans du foulard qui pendent du nœud sur le haut du dos (clair à gauche, ombre à droite).
const tailsBack: Grid = [
  'YFTY',
  '.YY.',
];

// Nœud et pans du tablier, au creux des reins.
const apronBow: Grid = [
  'qaAq',
  'qaAq',
  '.qq.',
];

// ---------- Vue de profil (droite) ----------

// Ourlet en diagonale du front vers la nuque, cheveux et oreille dessous ; le nœud fait une bosse derrière la tête
// et ses deux pans pendent derrière le cou. Œil en x=17, nez en x=21.
const headSide: Grid = [
  '...ooooo....',
  '..oFFFFfoo..',
  '.oFFFFffffo.',
  'oFFTFfffffo.',
  'oFFFTffffTo.',
  'oFFFFTfFFFo.', // ourlet roulé, devant
  'oTFFFFTTTTo.',
  'oTTFFThhsso.', // l'ourlet descend vers la nuque ; front
  'oYTThhsssso.',
  'oYhhSssosso.', // oreille, œil
  'oFhhSDsossso', // nœud derrière ; le nez dépasse
  'oThhhSsssSo.',
  '.oYhhhSssSo.',
  '.oTYooosSo..', // pans du nœud, cou
  '..oYo..oSo..',
];

const torsoSide: Grid = [
  '..ooQQQqSo..',
  '.oRrrrrraAo.',
  '.oRrrrrraAo.',
  '.oRrrrrraAo.',
  '.oRrrrrraAo.',
  '.oRrrrrraAo.',
  '.oRAAAAAaAo.', // lien du tablier
  '.oRrrrrraaAo',
  '.oRrrrrraaAo',
];

const skirtSide: Grid = [
  '.oRrrrrraaAo',
  '.oRrrrrraaAo',
  '.oRrrrrraaAo',
  'oRrrrrrraaAo',
  'oRrrrrrraaAo',
  'oRrrrrrraaAo',
  'oRrrrrrraaAo',
  'oqqqQqqqqAAo',
  'ooooookkKKoo',
  '.....oooooo.',
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

// ---------- Assise (sur le banc de 45 cm, `bench`, ou le tabouret) ----------
// Elle s'assoit sur un siège de 45 cm (9 px) : la tête descend de 2 px (HEAD_SIT), le buste se tasse, les cuisses se voient de
// dessus (le giron, couvert du tablier), les jambes pendent devant le siège jusqu'aux sabots, au sol à y=45 comme debout. À
// l'échelle stylisée du personnage (grosse tête, jambes courtes : les hanches à 9 px du sol debout), une assise « vraie » la ferait
// grandir ; on garde l'impression de l'assise : plus basse de 2 px, le giron, les mains posées dessus.
// Le siège se pose sous elle, dessiné avant elle (elle passe par-dessus) : SEAT, le point de la frame où tombe le milieu du bord
// sud du siège, au sol (le bas de l'image du banc, sans son ombre). De face, ses pieds sont juste devant ce bord ; de dos, le
// siège cache ses jambes (elles sont au-delà, au nord) : l'image s'arrête au bord du siège ; de profil, le siège est sous ses
// cuisses, ses jambes pendent devant lui, à l'est.

const HEAD_SIT = HEAD_Y + 2;
const BODY_SIT = HEAD_SIT + 15;

/** Où poser le siège sous elle, par vue : le milieu du bord sud du siège au sol (le bas de l'image du banc). */
export const SEAT: Record<'down' | 'up' | 'right', { x: number; y: number }> = {
  down: { x: 16, y: 44 },
  up: { x: 16, y: 45 },
  right: { x: 15, y: 45 },
};

// De face : buste tassé, les avant-bras repliés vers le giron, les mains posées l'une près de l'autre ; le giron (les cuisses
// vues de dessus) couvert du tablier, son bord (les genoux) dans l'ombre ; la jupe qui pend des genoux aux sabots. Demi-grille.
const sitFront = mirror([
  '....oS', // cou
  '..ooqs', // col
  '.oRrqs', // encolure
  'oRRraa', // bavette
  'oRrqaa', // bras
  'oRrqAA', // taille du tablier
  'oqsSsa', // avant-bras repliés, les mains sur le giron
  'oRraaa', // le giron, vu de dessus
  'oRraaa',
  'oqqAAA', // le bord des genoux, dans l'ombre
  '.oqrra', // la jupe qui pend devant le siège
  '.oqrra',
  '.oqqqA', // ourlet
  '.ookKK', // sabots
  '...ooo',
]);

// De dos : le buste, le lien du tablier, puis la jupe étalée sur le siège ; le siège cache le reste. Demi-grille.
const sitBack = mirror([
  '....oS',
  '..ooqq',
  '.oRrrr',
  'oRRrrr',
  'oRrqrr',
  'oRrqrr',
  'oRrqAA', // lien du tablier
  'oqrrrr', // la jupe sur le siège, qui s'étale
  'oqrrrq',
  'oqqqqq', // son bord, sur l'arête du siège
  '.ooooo',
]);

// De profil (droite) : le buste droit, le giron qui avance vers l'est à la hauteur du siège, les jambes qui pendent devant lui ;
// sous les cuisses, le vide où se voit le siège.
const sitSide: Grid = [
  '..ooQQQqSo......',
  '.oRrrrrraAo.....',
  '.oRrrrrraAo.....',
  '.oRrrrrraAo.....',
  '.oRrrrrraAo.....',
  '.oRAAAAAaAo.....', // lien du tablier
  '.oRrrrrraaaaAo..', // le giron : les cuisses vers l'est, le tablier dessus
  '.oRrrrrraaaaaAo.',
  '.oqqqqqqqqqqqAo.', // le dessous des cuisses, dans l'ombre
  '.........oRraAo.', // les jambes qui pendent devant le siège
  '.........oRraAo.',
  '.........oRraAo.',
  '.........oqqAAo.', // ourlet
  '.........ookkKKo', // sabots, la pointe vers l'est
  '..........ooooo.',
];

// Le bras de profil, assise : le haut du bras le long du buste, l'avant-bras posé sur le giron, la main vers le genou.
const armSit: Grid = [
  '.QQ....',
  'QRrQ...',
  'QRrQ...',
  'QRqQ...',
  'QRqsssD',
  '.DSSSSD',
];

/** Assise, face ou dos. */
function sitFrontal(facing: Facing): Grid {
  const c = new Canvas(W, H);
  if (facing === 'down') {
    c.ellipse(16.5, 45.5, 5.5, 1.5, 'x');
    c.stamp(sitFront, OX, BODY_SIT);
    c.stamp(headFront, OX, HEAD_SIT);
  } else {
    c.stamp(sitBack, OX, BODY_SIT);
    c.stamp(apronBow, OX + 4, BODY_SIT + 6);
    c.stamp(headBack, OX, HEAD_SIT);
    c.stamp(tailsBack, OX + 4, HEAD_SIT + 15);
  }
  return selOut(shadeRight(c.toGrid()), DARK);
}

/** Assise, profil droit. */
function sitSideView(): Grid {
  const c = new Canvas(W, H);
  c.ellipse(21, 45.5, 3, 1.2, 'x');
  c.stamp(sitSide, OX, BODY_SIT);
  c.stamp(armSit, OX + 4, BODY_SIT + 1);
  c.stamp(headSide, OX, HEAD_SIT);
  return selOut(c.toGrid(), DARK);
}

// ---------- Composition ----------

function shadow(c: Canvas) {
  c.ellipse(16.5, 45.5, 5.5, 2, 'x');
}

type Facing = 'down' | 'up';

/** Face ou dos. bob : le buste et la tête descendent de `bob` px (respiration), la jupe reste en place. */
function frontal(facing: Facing, bob: number): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  c.stamp(facing === 'down' ? skirtFront : skirtBack, OX, BODY_Y + 7);
  c.stamp(facing === 'down' ? torsoFront : torsoBack, OX, BODY_Y + bob);
  if (facing === 'up') c.stamp(apronBow, OX + 4, BODY_Y + 6 + bob);
  if (facing === 'down' && bob) {
    // expiration : la bavette du tablier se creuse sous la poitrine
    c.within('a', (c) => c.line(OX + 4, BODY_Y + 4, OX + 7, BODY_Y + 4, 'A'));
  }
  const head = facing === 'down' ? headFront : headBack;
  c.stamp(head, OX, HEAD_Y + bob);
  if (facing === 'up') c.stamp(tailsBack, OX + 4, HEAD_Y + 15 + bob);
  return selOut(shadeRight(c.toGrid()), DARK);
}

/** Profil droit. */
function side(bob: number): Grid {
  const c = new Canvas(W, H);
  shadow(c);
  c.stamp(skirtSide, OX, BODY_Y + 7);
  c.stamp(torsoSide, OX, BODY_Y + bob);
  c.stamp(armSide, OX + 4, BODY_Y + 1 + bob);
  c.stamp(headSide, OX, HEAD_Y + bob);
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
    // assise, sur le banc ou le tabouret (SEAT : où poser le siège sous elle) ; une image, la gauche retournée
    'sit-down': { frames: [sitFrontal('down')], frameRate: 1, repeat: 0 },
    'sit-up': { frames: [sitFrontal('up')], frameRate: 1, repeat: 0 },
    'sit-right': { frames: [sitSideView()], frameRate: 1, repeat: 0 },
    'sit-left': { frames: [flipX(sitSideView())], frameRate: 1, repeat: 0 },
  },
};

export default mother;
