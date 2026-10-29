// Chute de l'arbre et arbre couché.
//
// La chute (`tree-fall`) reprend l'arbre de trees.ts dans son repère (image 64x96, pied du tronc en (33, 89)),
// pivoté autour de la charnière au-dessus de la souche. Sa dernière image est l'arbre couché lui-même :
// la souche (`tree-stump`) et les quatre pièces que le jeu pose ensuite comme objets séparés, si bien que
// le remplacement de la dernière image par les objets ne saute pas.
//
// Arbre couché vers la droite, du pied à la cime : `felled-section-1`, `-2`, `-3` (tronc nu, 21 px, environ 1 m),
// puis `felled-crown` (4e section, tronc sous le houppier). Ébranché, `felled-crown` devient `felled-head`
// (même tronc, chicots) ; une section coupée devient `felled-log`. Chaque pièce porte une encoche à l'endroit
// où on la coupe. La chute vers la gauche est le miroir de tout cela (le jeu retourne les images).

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { FOOT, type Vec, despeckle, groundShadow, shadedOutline, standingTree, stump, stumpBody, treeBody } from './trees';

// ---------- Chute ----------

const FALL_W = 160;
const FALL_H = 96;
/**
 * Décalage de l'arbre (64 de large) dans la frame : l'arbre debout est à gauche (pied en x = OFF + 33)
 * pour laisser au tronc couché, puis au houppier, la place de s'étendre vers la droite.
 */
const OFF = 14;
/** La souche se pose sous le tronc : décalage du repère de la souche dans celui de l'arbre. */
const STUMP_AT: Vec = [17, 62];
/** Hauteur de la coupe dans le repère de l'arbre : tout ce qui est au-dessus tombe. */
const CUT_Y = 76;
/** Charnière : bord droit de la coupe, côté où l'arbre tombe. */
const HINGE: Vec = [38, CUT_Y];
/** Rangée sous le houppier à partir de laquelle le tronc s'allonge quand il se couche. */
const TRUNK_FROM = 70;
/** Allongement du tronc couché : vu de dessus, il montre toute sa longueur (environ 34 px sous le houppier). */
const EXT = 24;

function withStump(c: Canvas): Canvas {
  c.stamp(stumpBody().toGrid(), STUMP_AT[0] + OFF, STUMP_AT[1]);
  return c;
}

/**
 * Le haut de l'arbre (au-dessus de la coupe), avec un tronc allongé de `ext` rangées.
 * Le tronc ajouté reprend le profil d'écorce de l'arbre (clair à gauche, sombre à droite) et quelques fentes.
 * Rend le canevas et la rangée de coupe dans ce canevas.
 */
function fallingPart(light: Vec, ext: number): { src: Canvas; cut: number } {
  const body = treeBody(light);
  const cut = CUT_Y + ext;
  const src = new Canvas(64, cut);
  for (let y = 0; y < TRUNK_FROM; y++) for (let x = 0; x < 64; x++) src.px[y][x] = body.get(x, y);
  // profil propre du tronc (sans fente), pris juste sous la coupe
  const profile = body.px[77];
  for (let y = TRUNK_FROM; y < cut; y++) for (let x = 0; x < 64; x++) src.px[y][x] = profile[x];
  src.within('m', (c) => {
    for (const [x, y0, n] of [[32, 0, 6], [33, 9, 4], [31, 15, 6], [33, 24, 4]] as const) {
      if (y0 + n <= cut - TRUNK_FROM - 2) c.line(x, TRUNK_FROM + y0, x, TRUNK_FROM + y0 + n - 1, 'N');
    }
  });
  src.within('M', (c) => {
    for (const [x, y0, n] of [[29, 3, 4], [29, 19, 4]] as const) {
      if (y0 + n <= cut - TRUNK_FROM - 2) c.line(x, TRUNK_FROM + y0, x, TRUNK_FROM + y0 + n - 1, 'm');
    }
  });
  return { src, cut };
}

interface Pose {
  deg: number;
  /** Position à l'écran du centre de la coupe du tronc qui tombe. */
  base: Vec;
  ext: number;
  /** Écrasement du houppier de part et d'autre du tronc (1 = aucun) : vu de dessus, il s'aplatit au sol. */
  squash: number;
}

/**
 * Dessine le haut de l'arbre selon `pose` (tourné de `deg` degrés vers la droite), avec la lumière
 * nord-ouest de l'écran ramenée dans le repère de l'arbre, puis le bout scié au pied du tronc.
 */
function drawFalling(c: Canvas, p: Pose) {
  const t = (p.deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const S: Vec = [-Math.SQRT1_2, -Math.SQRT1_2];
  const { src, cut } = fallingPart([S[0] * cos + S[1] * sin, -S[0] * sin + S[1] * cos], p.ext);
  const half = 5.5; // demi-largeur du tronc, jamais écrasée
  const inv = (g: number) => (Math.abs(g) <= half ? g : Math.sign(g) * (half + (Math.abs(g) - half) / p.squash));
  // calque à part : le bout scié ne se peint que sur le tronc qui tombe, jamais sur la souche
  const layer = new Canvas(FALL_W, FALL_H);
  // axe du tronc (vers la cime) : (sin, -cos) ; travers (côté droit de l'arbre) : (cos, sin)
  const local = (X: number, Y: number): Vec => {
    const U = X + 0.5 - p.base[0];
    const V = Y + 0.5 - p.base[1];
    return [U * sin - V * cos, U * cos + V * sin];
  };
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = local(X, Y);
    if (h < 0) continue;
    const q = src.get(Math.floor(FOOT[0] + inv(g)), Math.floor(cut - h));
    if (q !== EMPTY) layer.set(X, Y, q);
  }
  // bout scié : disque du tronc vu de biais, tourné vers le bas-gauche, donc vers la lumière
  const minor = 0.9 + 1.1 * sin;
  const face = (rx: number, ry: number, col: string) => {
    for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
      if (layer.get(X, Y) === EMPTY) continue;
      const [h, g] = local(X, Y);
      if (h < 1) continue;
      const a = (g + 0.3) / rx;
      const b = (h - 1) / ry;
      if (a * a + b * b <= 1) layer.set(X, Y, col);
    }
  };
  // la rangée du bas : bord d'écorce du disque, qui sépare le bout scié du dessus de la souche
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (layer.get(X, Y) !== EMPTY && local(X, Y)[0] < 1) layer.set(X, Y, 'N');
  }
  face(5.6, minor + 0.4, 'Y');
  if (minor > 1.5) face(2.4, minor * 0.6, 't');
  c.stamp(layer.toGrid(), 0, 0);
}

/** Image de la chute : souche fixe, haut de l'arbre dans la pose donnée, contour, ombres. */
function fallFrame(p: Pose, shadows: [number, number, number, number][]): Canvas {
  const c = withStump(new Canvas(FALL_W, FALL_H));
  drawFalling(c, p);
  despeckle(c, 'KY');
  shadedOutline(c);
  for (const [x, y, rx, ry] of shadows) groundShadow(c, x, y, rx, ry);
  return c;
}

/** Pose pivotée autour de la charnière (bord droit de la coupe), qui reste sur la souche. */
function pivot(deg: number): Pose {
  const t = (deg * Math.PI) / 180;
  const s = Math.sin(t);
  // centre de la coupe : 5 px à gauche de la charnière, dans le repère tourné
  const d = HINGE[0] - FOOT[0];
  return {
    deg,
    base: [HINGE[0] + OFF - d * Math.cos(t), HINGE[1] - d * s],
    ext: Math.round(EXT * s),
    squash: 1 - 0.64 * s * s,
  };
}

// ---------- Arbre couché ----------
// Dessiné d'abord en entier dans le repère de la chute (160x96), puis découpé en pièces par colonnes.
// Le tronc et le houppier ont chacun leur contour : sans houppier, le tronc reste contourné ;
// les sections partagent le contour d'un seul tronc, donc aucune couture aux raccords.

/** Lumière nord-ouest de l'écran ramenée dans le repère de l'arbre couché (tourné de 90° vers la droite). */
const LYING_LIGHT: Vec = [-Math.SQRT1_2, Math.SQRT1_2];
/** Première colonne du tronc couché (bout scié), contre la racine droite de la souche. */
const BUTT_X = OFF + FOOT[0] + 13;
/** Axe du tronc couché : 6 px au-dessus du sol, comme dans la pose couchée d'origine. */
const AXIS_Y = 81.5;
/** Rangées du tronc couché (sans contour) : 11 rangées à partir de TRUNK_TOP, comme le tronc debout est large de 11. */
const TRUNK_TOP = 75;
/** Rangée du contour du bas du tronc. */
const TRUNK_BOTTOM = TRUNK_TOP + 11;
/** Longueur d'une section : 21 px, environ 1 m. */
const SEC = 21;
/** Première colonne de chaque pièce (la 1re prend le contour du bout scié), puis la fin de la frame. */
const PIECE_X = [BUTT_X - 1, BUTT_X + SEC, BUTT_X + 2 * SEC, BUTT_X + 3 * SEC, FALL_W];
/** Encoche de chaque pièce : colonne de son flanc éclairé (le flanc sombre est à gauche). */
const NOTCH_X = [BUTT_X + 10, BUTT_X + 31, BUTT_X + 52, BUTT_X + 66];
/** Longueur du tronc, du bout scié à la pointe cachée sous le houppier. */
const TRUNK_LEN = 93;
/** Distance au pied où le tronc commence à s'amincir. */
const TAPER_FROM = 82;
/** Le houppier commence à F0 px du pied et finit à CROWN_END (le haut de l'arbre) : environ 96 px en tout. */
const F0 = 46;
const CROWN_END = 98;
/** Écrasement du houppier en travers du tronc : vu de dessus, il s'aplatit au sol. */
const SQUASH = 0.4;
/** Ligne de la frontière où le houppier passe par-dessus le tronc (festonnée), une valeur par rangée du tronc. */
const OVER = [130, 131, 130, 129, 130, 132, 131, 130, 129, 130, 131, 130, 131];
const overAt = (y: number) => OVER[y - (TRUNK_TOP - 1)] ?? 0;

/** Distance au pied (h) et au travers de l'axe (g) d'un pixel de la frame. */
const lying = (X: number, Y: number): Vec => [X + 0.5 - BUTT_X, Y + 0.5 - AXIS_Y];

/** Fentes d'écorce (x, y, longueur), à l'écart des encoches. */
const FISSURES_DARK: [number, number, number][] = [
  [62, 80, 5], [73, 82, 5], [83, 79, 5], [94, 82, 5], [104, 82, 4], [115, 79, 5], [133, 81, 5],
];
const FISSURES_LIGHT: [number, number, number][] = [[63, 77, 4], [84, 77, 4], [104, 77, 4], [117, 77, 3]];

/** Encoche en V entaillée dans le dessus du tronc : flanc gauche dans l'ombre, flanc droit vers la lumière. */
function notch(c: Canvas, x: number, lo = 0, hi = c.w - 1) {
  const y = TRUNK_TOP;
  // on ne peint qu'entre les colonnes lo et hi : au-delà, un bout coupé a déjà retiré le bois
  const set = (X: number, Y: number, col: string) => {
    if (X >= lo && X <= hi) c.set(X, Y, col);
  };
  // l'entaille dans la silhouette (le contour y descend d'un pixel), le fond du V dans l'ombre,
  // puis les deux flancs de bois clair
  for (let i = -2; i < 2; i++) set(x + i, y, EMPTY);
  set(x - 1, y + 1, 'K'); set(x, y + 1, 'K');
  for (const [dx, dy] of [[-3, 0], [-3, 1], [-2, 1], [-2, 2], [-1, 2], [-1, 3]]) set(x + dx, y + dy, 'T');
  for (const [dx, dy] of [[2, 0], [2, 1], [1, 1], [1, 2], [0, 2], [0, 3]]) set(x + dx, y + dy, 'Y');
}

/** Bout scié : disque du tronc vu de biais, au pied (gauche, vers la lumière) ou en tête (droite, dans l'ombre). */
function sawnEnd(c: Canvas, x: number, side: 'left' | 'right', axisY = AXIS_Y) {
  const dir = side === 'left' ? 1 : -1;
  const [face, heart] = side === 'left' ? ['Y', 't'] : ['t', 'T'];
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (c.get(X, Y) === EMPTY) continue;
    const h = (X + 0.5 - x) * dir;
    const g = Y + 0.5 - axisY;
    if (h < 0) continue;
    if (h < 1) { c.set(X, Y, 'N'); continue; }
    const a = (g + 0.3) / 5.6;
    const b = (h - 1) / 2.4;
    if (a * a + b * b <= 1) c.set(X, Y, face);
    const a2 = (g + 0.3) / 2.4;
    const b2 = (h - 1) / 1.2;
    if (a2 * a2 + b2 * b2 <= 1) c.set(X, Y, heart);
  }
}

/** Tronc couché, sans contour : profil d'écorce de l'arbre (clair en haut, sombre en bas), aminci vers la cime. */
function trunkBody(withStubs: boolean): Canvas {
  const profile = treeBody(LYING_LIGHT).px[77];
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = lying(X, Y);
    if (h < 0 || h > TRUNK_LEN) continue;
    const s = h <= TAPER_FROM ? 1 : 1 - (0.55 * (h - TAPER_FROM)) / (TRUNK_LEN - TAPER_FROM);
    const q = profile[Math.floor(FOOT[0] + g / s)];
    if (q && q !== EMPTY) c.set(X, Y, q);
  }
  c.within('m', (c) => FISSURES_DARK.forEach(([x, y, n]) => c.line(x, y, x + n - 1, y, 'N')));
  c.within('M', (c) => FISSURES_LIGHT.forEach(([x, y, n]) => c.line(x, y, x + n - 1, y, 'm')));
  sawnEnd(c, BUTT_X, 'left');
  NOTCH_X.forEach((x) => notch(c, x));
  if (withStubs) {
    // chicots : moignons de branches coupées au ras, deux vers le nord (éclairés), un vers le sud (ombre)
    c.line(133, 75, 136, 72, 'M').line(134, 75, 137, 72, 'm').line(134, 76, 137, 73, 'm');
    c.set(136, 71, 'Y').set(137, 71, 'Y').set(138, 72, 'Y');
    c.line(145, 76, 147, 74, 'M').line(146, 76, 148, 74, 'm');
    c.set(147, 73, 'Y').set(148, 73, 'Y').set(149, 74, 'Y');
    c.line(139, 86, 140, 87, 'N').line(140, 86, 141, 87, 'N').line(141, 86, 142, 87, 'K');
    c.set(141, 88, 't').set(142, 88, 't');
    // pointe de la cime, coupée net
    for (let Y = 0; Y < FALL_H; Y++) if (c.get(BUTT_X + TRUNK_LEN, Y) !== EMPTY) c.set(BUTT_X + TRUNK_LEN, Y, 't');
  }
  return despeckle(c, 'KYTt');
}

/** Houppier couché, sans contour : les masses de feuillage de l'arbre, raccourcies le long du tronc, aplaties en travers. */
function crownBody(): Canvas {
  const body = treeBody(LYING_LIGHT);
  const k = (CROWN_END - F0) / (66 - 12);
  const half = 5.5;
  const inv = (g: number) => (Math.abs(g) <= half ? g : Math.sign(g) * (half + (Math.abs(g) - half) / SQUASH));
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = lying(X, Y);
    if (h < F0) continue;
    const q = body.get(Math.floor(FOOT[0] + inv(g)), Math.floor(66 - (h - F0) / k));
    if ('jLlk'.includes(q)) c.set(X, Y, q);
  }
  return despeckle(c);
}

/** Ombre au sol sous le tronc : une bande décalée vers la droite. */
function trunkShadow(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  c.rect(BUTT_X + 1, TRUNK_BOTTOM + 1, TRUNK_LEN + 1, 2, 'x').rect(BUTT_X + 3, TRUNK_BOTTOM + 3, TRUNK_LEN - 3, 1, 'x');
  return c;
}

const TRUNK = shadedOutline(trunkBody(false));
const TRUNK_STUBS = shadedOutline(trunkBody(true));
const CROWN = shadedOutline(crownBody());
const BAND = trunkShadow();
const CROWN_SHADOW = new Canvas(FALL_W, FALL_H).ellipse(BUTT_X + 81, 90.5, 21, 3.5, 'x');

const inRange = (X: number, k: number) => X >= PIECE_X[k] && X < PIECE_X[k + 1];

/** Bouts coupés d'une pièce : la voisine de ce côté est partie (devenue bille), le tronc s'y termine. */
interface Cuts { left?: boolean; right?: boolean }

/**
 * Tronc de la pièce k avec un bout coupé à gauche et/ou à droite, contour compris. Le bois s'arrête une colonne
 * avant le bord de la pièce, pour que le contour tienne dans l'image ; la face de coupe est celle de la bille
 * (claire à gauche, vers la lumière ; plus sombre à droite). L'encoche est repeinte par-dessus.
 */
function cutTrunk(k: number, head: boolean, cuts: Cuts): Canvas {
  const c = trunkBody(head);
  const lo = cuts.left ? PIECE_X[k] + 1 : 0;
  const hi = cuts.right ? PIECE_X[k + 1] - 2 : FALL_W - 1;
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) if (X < lo || X > hi) c.px[Y][X] = EMPTY;
  if (cuts.left) sawnEnd(c, lo, 'left');
  if (cuts.right) sawnEnd(c, hi + 1, 'right');
  notch(c, NOTCH_X[k], lo, hi);
  return shadedOutline(despeckle(c, 'KYTt'));
}

/** Pièce k (0 à 3) dans la frame entière. `head` : la 4e pièce ébranchée. `cuts` : ses bouts coupés. */
function piece(k: number, head = false, cuts: Cuts = {}): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  const cut = cuts.left || cuts.right;
  const trunk = cut ? cutTrunk(k, head, cuts) : head ? TRUNK_STUBS : TRUNK;
  // ombre du tronc : comme sous la bille, elle commence deux colonnes après un bout coupé à gauche (et quatre au bord)
  const bandFrom = (Y: number) => (cuts.left ? PIECE_X[k] + (Y >= TRUNK_BOTTOM + 3 ? 4 : 2) : 0);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (inRange(X, k)) c.set(X, Y, trunk.get(X, Y));
    if (k !== 3 || head) continue;
    // houppier : par-dessus le tronc de sa propre section au-delà de la frontière festonnée, ailleurs sur le vide
    const f = CROWN.get(X, Y);
    if (f === EMPTY) continue;
    const t = TRUNK.get(X, Y);
    if (t === EMPTY || (X >= PIECE_X[3] && X >= overAt(Y))) c.set(X, Y, f);
  }
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    if (inRange(X, k) && X >= bandFrom(Y) && BAND.get(X, Y) !== EMPTY) c.set(X, Y, 'x');
    else if (k === 3 && !head && CROWN_SHADOW.get(X, Y) !== EMPTY && BAND.get(X, Y) === EMPTY && TRUNK.get(X, Y) === EMPTY) c.set(X, Y, 'x');
  }
  return c;
}

/** Bille d'environ 1 m (17 px de bois entre deux contours), faces de coupe aux deux bouts ; sa rangée 0 est la rangée LOG_Y de la frame. */
const LOG_LEN = 17;
function felledLog(): Canvas {
  const profile = treeBody(LYING_LIGHT).px[77];
  const top = TRUNK_TOP - 1; // rangée du contour du haut, dans la frame
  const axis = AXIS_Y - top;
  const c = new Canvas(LOG_LEN + 4, 17);
  for (let Y = 0; Y < c.h; Y++) for (let X = 1; X <= LOG_LEN; X++) {
    const q = profile[Math.floor(FOOT[0] + Y + 0.5 - axis)];
    if (q && q !== EMPTY) c.set(X, Y, q);
  }
  c.within('m', (c) => c.line(4, 6, 8, 6, 'N').line(10, 8, 13, 8, 'N'));
  c.within('M', (c) => c.line(6, 3, 9, 3, 'm'));
  sawnEnd(c, 1, 'left', axis);
  sawnEnd(c, LOG_LEN + 1, 'right', axis);
  despeckle(c, 'KYTt');
  shadedOutline(c);
  for (let X = 2; X <= LOG_LEN + 2; X++) for (const Y of [13, 14]) if (c.get(X, Y) === EMPTY) c.set(X, Y, 'x');
  for (let X = 4; X <= LOG_LEN; X++) if (c.get(X, 15) === EMPTY) c.set(X, 15, 'x');
  return c;
}

/** Cadre minimal d'une pièce dans la frame : image recadrée et position de son coin haut gauche. */
function crop(c: Canvas): { canvas: Canvas; x: number; y: number } {
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (c.get(X, Y) === EMPTY) continue;
    x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
  }
  const out = new Canvas(x1 - x0 + 1, y1 - y0 + 1);
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) out.px[Y - y0][X - x0] = c.px[Y][X];
  return { canvas: out, x: x0, y: y0 };
}

const PIECE_NAMES = ['felled-section-1', 'felled-section-2', 'felled-section-3', 'felled-crown'];
const PIECES = [0, 1, 2, 3].map((k) => piece(k));
const HEAD = piece(3, true);

/** Recadre `c` exactement comme la pièce d'origine : même taille, même place (le jeu ne change que la texture). */
function cropLike(c: Canvas, like: { x: number; y: number; canvas: Canvas }): Canvas {
  const out = new Canvas(like.canvas.w, like.canvas.h);
  for (let Y = 0; Y < out.h; Y++) for (let X = 0; X < out.w; X++) out.px[Y][X] = c.get(like.x + X, like.y + Y);
  return out;
}

/**
 * Où vont les pièces, pour props.json : repère = coin bas gauche de l'image `tree` posée sur la carte
 * (x vers la droite, y vers le bas, donc négatif au-dessus). Calculé, jamais recopié à la main.
 */
export const FELLED_LAYOUT = (() => {
  const place = (name: string, c: Canvas, notchX?: number) => {
    const { canvas, x, y } = crop(c);
    const bottom = y + canvas.h; // rangée sous l'image, dans la frame
    return {
      name,
      w: canvas.w,
      h: canvas.h,
      /** Coin bas gauche dans le repère de l'arbre. */
      at: [x - OFF, bottom - FALL_H] as Vec,
      /** Collision : l'empreinte au sol du tronc couché (les 10 rangées du bas, contour compris), toute la largeur. */
      body: { w: canvas.w, h: 10, bottom: bottom - (TRUNK_BOTTOM + 1) },
      /** Encoche dans l'image : le creux du V, sur le dessus du tronc. */
      notch: notchX === undefined ? undefined : ([notchX - 1 - x, TRUNK_TOP + 1 - y] as Vec),
      frame: { x, y, canvas },
    };
  };
  const pieces = PIECES.map((c, k) => place(PIECE_NAMES[k], c, NOTCH_X[k]));
  const head = place('felled-head', HEAD, NOTCH_X[3]);
  const log = crop(felledLog());
  return { pieces, head, log: { w: log.canvas.w, h: log.canvas.h, canvas: log.canvas } };
})();

/** Colonne de la frame où se pose la bille qui remplace la pièce k (contour gauche) : un pixel de jour de chaque côté. */
export const LOG_X = [BUTT_X, PIECE_X[1] + 1, PIECE_X[2] + 1, PIECE_X[3] + 1];
/** Rangée de la frame du haut de l'image de la bille (son contour du haut sur celui du tronc). */
export const LOG_Y = TRUNK_TOP - 1;

/** Dernière image de la chute : la souche et les quatre pièces, exactement comme le jeu les posera. */
function lyingFrame(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  c.stamp(stump().toGrid(), STUMP_AT[0] + OFF, STUMP_AT[1]);
  for (const p of PIECES) c.stamp(p.toGrid(), 0, 0);
  return c;
}

const FOOT_X = FOOT[0] + OFF;

const frames = [
  new Canvas(FALL_W, FALL_H).stamp(standingTree().toGrid(), OFF, 0),
  fallFrame(pivot(10), [[FOOT_X + 3, 89.5, 17, 4], [FOOT_X + 12, 90, 16, 3.5]]),
  fallFrame(pivot(45), [[FOOT_X + 3, 89.5, 14, 3.5], [FOOT_X + 46, 90.5, 26, 4]]),
  lyingFrame(),
];

const treeFall: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'tree-fall',
  frameW: FALL_W,
  frameH: FALL_H,
  palette: world,
  animations: {
    fall: { frames: frames.map((f) => f.toGrid()), frameRate: 6, repeat: 0 },
  },
};

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

/**
 * Variantes « bout coupé » : la pièce quand sa voisine de gauche, de droite ou des deux côtés est devenue bille.
 * La 1re section a déjà son bout scié à gauche, la tête et le houppier ont la cime à droite.
 */
const CUT_SIDES: [number, boolean, ('left' | 'right' | 'both')[]][] = [
  [0, false, ['right']],
  [1, false, ['left', 'right', 'both']],
  [2, false, ['left', 'right', 'both']],
  [3, false, ['left']],
  [3, true, ['left']],
];
const cutImages: ImageSource[] = CUT_SIDES.flatMap(([k, head, sides]) => {
  const base = head ? FELLED_LAYOUT.head : FELLED_LAYOUT.pieces[k];
  return sides.map((side) => {
    const cuts = { left: side !== 'right', right: side !== 'left' };
    return img(`${base.name}-cut-${side}`, cropLike(piece(k, head, cuts), base.frame));
  });
});

export default [
  treeFall,
  ...FELLED_LAYOUT.pieces.map((p) => img(p.name, p.frame.canvas)),
  img('felled-head', FELLED_LAYOUT.head.frame.canvas),
  img('felled-log', FELLED_LAYOUT.log.canvas),
  ...cutImages,
];
