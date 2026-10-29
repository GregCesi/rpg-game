// Chute de l'arbre et arbre couché.
//
// La chute (`tree-fall`) reprend l'arbre de trees.ts dans son repère (image 64x96, pied du tronc en (33, 89)),
// pivoté autour de la charnière au-dessus de la souche. Sa dernière image est l'arbre couché lui-même :
// la souche (`tree-stump`) et les quatre pièces que le jeu pose ensuite comme objets séparés, si bien que
// le remplacement de la dernière image par les objets ne saute pas.
//
// Arbre couché vers la droite, du pied à la cime : `felled-section-1`, `-2`, `-3` (tronc nu, 19 px, environ 1 m),
// puis `felled-crown` (4e bille et pointe, sous le houppier). Ébranché, `felled-crown` devient `felled-head`
// (même image, même place : la 4e bille nue, puis la pointe avec ses chicots). Chaque pièce est une future bille
// et porte une encoche à son bout droit, sur la jonction avec la suivante, qui se creuse à chaque coup (`-n1`, `-n2`)
// puis se coupe (`-cut-right` ; la voisine passe en `-cut-left`). La bille `felled-log-k` est la pièce k coupée aux
// deux bouts, même image, même place. La chute vers la gauche est le miroir de tout cela (le jeu retourne les images).

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
// les pièces partagent le contour d'un seul tronc, donc aucune couture aux raccords.
//
// Chaque pièce est exactement une future bille. Son encoche est à son bout droit, pile sur la jonction avec la
// pièce suivante, et dessinée tout entière dans la pièce de gauche : la pièce de droite ne change pas pendant qu'on
// creuse. Une bille est sa pièce coupée aux deux bouts, même image, même place.

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
/** Longueur d'une pièce, donc d'une bille : 19 colonnes (17 de bois entre deux contours), environ 1 m. */
const SEC = 19;
/** Première colonne de chaque pièce (la 1re prend le contour du bout scié), puis la fin de la frame. */
const PIECE_X = [BUTT_X - 1, BUTT_X - 1 + SEC, BUTT_X - 1 + 2 * SEC, BUTT_X - 1 + 3 * SEC, FALL_W];
/** Jonction au bout droit de chaque pièce (1re colonne de la suivante) ; pour la tête, entre la 4e bille et la pointe. */
const JUNCTION = [PIECE_X[1], PIECE_X[2], PIECE_X[3], PIECE_X[3] + SEC];
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

/** Fentes d'écorce (x, y, longueur), au milieu de chaque pièce : loin des faces de coupe et des entailles. */
const FISSURES_DARK: [number, number, number][] = [
  [64, 80, 5], [70, 82, 4], [83, 82, 5], [89, 79, 4], [102, 80, 5], [107, 82, 4], [121, 82, 5], [124, 79, 3],
];
const FISSURES_LIGHT: [number, number, number][] = [[66, 77, 3], [85, 77, 3], [104, 77, 3]];

/**
 * Entaille au bout droit d'une pièce, par profondeur (0 : marquée, 1 : un tiers, 2 : deux tiers). Une rangée par
 * rangée du tronc à partir de TRUNK_TOP, calée à droite sur la dernière colonne avant la jonction.
 * '.' : bois retiré (le contour y descend), ' ' : inchangé. Le flanc de gauche, entaillé en biais, montre le bois
 * frais (clair en haut, plus sombre au fond) ; la colonne de la jonction est le fond de la fente, dans l'ombre.
 */
const NOTCH: string[][] = [
  ['  ..', '  YK'],
  [' ....', '  YtK', '   TK', '    K'],
  ['......', ' .....', ' YttTK', '  ttTK', '   TTK', '    TK', '     K'],
];
/** Profondeur de chaque entaille, en rangées : le fond visé (`aim`) est sur la dernière rangée. */
const NOTCH_DEPTH = NOTCH.map((p) => p.length);

function notch(c: Canvas, junction: number, depth: number) {
  NOTCH[depth].forEach((row, r) => {
    for (let i = 0; i < row.length; i++) {
      const col = row[i];
      if (col === ' ') continue;
      const X = junction - row.length + i;
      if (c.get(X, TRUNK_TOP + r) !== EMPTY) c.set(X, TRUNK_TOP + r, col);
    }
  });
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

/**
 * Tronc couché, sans contour : profil d'écorce de l'arbre (clair en haut, sombre en bas), aminci vers la cime.
 * `withStubs` : ébranché, avec les chicots sur la pointe (au-delà de la 4e bille) et la cime coupée net.
 */
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
  if (withStubs) {
    // chicots : moignons de branches coupées au ras, deux vers le nord (éclairés), un vers le sud (ombre)
    c.line(139, 75, 142, 72, 'M').line(140, 75, 143, 72, 'm').line(140, 76, 143, 73, 'm');
    c.set(142, 71, 'Y').set(143, 71, 'Y').set(144, 72, 'Y');
    c.line(147, 77, 149, 75, 'M').line(148, 77, 150, 75, 'm');
    c.set(149, 74, 'Y').set(150, 74, 'Y').set(151, 75, 'Y');
    c.line(142, 86, 143, 87, 'N').line(143, 86, 144, 87, 'N').line(144, 86, 145, 87, 'K');
    c.set(144, 88, 't').set(145, 88, 't');
    // pointe de la cime, coupée net
    for (let Y = 0; Y < FALL_H; Y++) if (c.get(BUTT_X + TRUNK_LEN, Y) !== EMPTY) c.set(BUTT_X + TRUNK_LEN, Y, 't');
  }
  return c;
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

const TRUNK = shadedOutline(despeckle(trunkBody(false), 'KYTt'));
const CROWN = shadedOutline(crownBody());
const BAND = trunkShadow();
const CROWN_SHADOW = new Canvas(FALL_W, FALL_H).ellipse(BUTT_X + 81, 90.5, 21, 3.5, 'x');

const inRange = (X: number, k: number) => X >= PIECE_X[k] && X < PIECE_X[k + 1];

/** État d'une pièce : bout gauche coupé (la voisine est partie), entaille du bout droit (0 à 2) ou coupé à fond. */
interface State { left?: boolean; right?: number | 'cut' }

/**
 * Tronc de la pièce k dans l'état donné, contour compris. Un bout coupé arrête le bois une colonne avant le bord
 * de la pièce, pour que le contour tienne dans l'image ; la face de coupe est claire à gauche (vers la lumière),
 * plus sombre à droite. Seule l'entaille du bout droit de la pièce k est dessinée.
 */
function pieceTrunk(k: number, head: boolean, st: State): Canvas {
  const c = trunkBody(head);
  const lo = st.left ? PIECE_X[k] + 1 : 0;
  const hi = st.right === 'cut' ? JUNCTION[k] - 2 : FALL_W - 1;
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) if (X < lo || X > hi) c.px[Y][X] = EMPTY;
  if (st.left) sawnEnd(c, lo, 'left');
  if (st.right === 'cut') sawnEnd(c, hi + 1, 'right');
  else notch(c, JUNCTION[k], st.right ?? 0);
  return shadedOutline(despeckle(c, 'KYTt'));
}

/** Pièce k (0 à 3) dans la frame entière. `head` : la 4e pièce ébranchée (sinon, avec son houppier). */
function piece(k: number, head = false, st: State = {}): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  const trunk = pieceTrunk(k, head, st);
  const crown = k === 3 && !head;
  // ombre du tronc : elle commence deux colonnes après un bout coupé à gauche (quatre au bord), et s'arrête
  // une colonne après un bout coupé à droite
  const bandFrom = (Y: number) => (st.left ? PIECE_X[k] + (Y >= TRUNK_BOTTOM + 3 ? 4 : 2) : 0);
  const bandTo = st.right === 'cut' ? JUNCTION[k] : FALL_W;
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (inRange(X, k)) c.set(X, Y, trunk.get(X, Y));
    if (!crown) continue;
    // houppier : par-dessus le tronc de sa propre pièce au-delà de la frontière festonnée, ailleurs sur le vide
    const f = CROWN.get(X, Y);
    if (f === EMPTY) continue;
    const t = TRUNK.get(X, Y);
    if (t === EMPTY || (X >= PIECE_X[3] && X >= overAt(Y))) c.set(X, Y, f);
  }
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    if (inRange(X, k) && X >= bandFrom(Y) && X <= bandTo && BAND.get(X, Y) !== EMPTY) c.set(X, Y, 'x');
    else if (crown && CROWN_SHADOW.get(X, Y) !== EMPTY && BAND.get(X, Y) === EMPTY && TRUNK.get(X, Y) === EMPTY) c.set(X, Y, 'x');
  }
  return c;
}

/** Bille de l'atelier (`felled-log`), indépendante de l'arbre couché : 17 px de bois entre deux contours. */
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

interface Frame { x: number; y: number; w: number; h: number }

/** Cadre minimal commun à plusieurs images de la frame (toutes les variantes d'une pièce y tiennent). */
function bounds(cs: Canvas[]): Frame {
  let x0 = FALL_W, y0 = FALL_H, x1 = -1, y1 = -1;
  for (const c of cs) for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (c.get(X, Y) === EMPTY) continue;
    x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Découpe `c` dans le cadre `f`. */
function cut(c: Canvas, f: Frame): Canvas {
  const out = new Canvas(f.w, f.h);
  for (let Y = 0; Y < f.h; Y++) for (let X = 0; X < f.w; X++) out.px[Y][X] = c.get(f.x + X, f.y + Y);
  return out;
}

const PIECE_NAMES = ['felled-section-1', 'felled-section-2', 'felled-section-3', 'felled-crown'];
const PIECES = [0, 1, 2, 3].map((k) => piece(k));

/**
 * Toutes les images d'une pièce, dans la frame entière : clé -> canevas. La 1re section n'a pas de bout gauche
 * à couper (c'est le bout scié) ; le houppier ne s'entaille pas (on ébranche d'abord).
 */
function variants(k: number, head: boolean): [string, Canvas][] {
  const name = head ? 'felled-head' : PIECE_NAMES[k];
  if (k === 3 && !head) return [[name, piece(k)], [`${name}-cut-left`, piece(k, false, { left: true })]];
  const lefts = k === 0 ? [false] : [false, true];
  return lefts.flatMap((left): [string, Canvas][] => {
    const pre = left ? `${name}-cut-left` : name;
    return [
      [pre, piece(k, head, { left })],
      [`${pre}-n1`, piece(k, head, { left, right: 1 })],
      [`${pre}-n2`, piece(k, head, { left, right: 2 })],
      ...(left ? [] : [[`${name}-cut-right`, piece(k, head, { right: 'cut' })] as [string, Canvas]]),
    ];
  });
}

/** Bille k (1 à 4) : la pièce k coupée aux deux bouts ; la 4e est la tête sans sa pointe. */
const LOGS: Canvas[] = [0, 1, 2, 3].map((k) => piece(k, k === 3, { left: k > 0, right: 'cut' }));

const SETS = [0, 1, 2].map((k) => variants(k, false));
const CROWN_SET = variants(3, false);
const HEAD_SET = variants(3, true);
/** Cadre de chaque pièce : le houppier, la tête et la 4e bille partagent le même (même image, même place). */
const FRAMES: Frame[] = [
  ...SETS.map((s, k) => bounds([...s.map(([, c]) => c), LOGS[k]])),
  bounds([...CROWN_SET, ...HEAD_SET].map(([, c]) => c).concat(LOGS[3])),
];

/**
 * Données des pièces, pour props.json : repère = coin bas gauche de l'image `tree` posée sur la carte
 * (x vers la droite, y vers le bas, donc négatif au-dessus). Calculé, jamais recopié à la main.
 */
export const FELLED_LAYOUT = (() => {
  const describe = (name: string, f: Frame, k: number, aimed: boolean) => {
    const bottom = f.y + f.h;
    // empreinte au sol du tronc : les 10 rangées du bas (contour compris), de son premier à son dernier pixel
    const trunkX0 = PIECE_X[k];
    const trunkX1 = k === 3 ? BUTT_X + TRUNK_LEN + 1 : JUNCTION[k] - 1;
    return {
      name,
      w: f.w,
      h: f.h,
      /** Coin bas gauche dans le repère de l'arbre. */
      at: [f.x - OFF, bottom - FALL_H] as Vec,
      /** Collision centrée en bas de l'image : toute la largeur, les 10 rangées du bas du tronc. */
      body: { w: f.w, h: 10, bottom: bottom - (TRUNK_BOTTOM + 1) },
      /** Collision du tronc seul (pour la tête, pointe comprise), dans l'image (x, y, w, h). */
      trunkRect: { x: trunkX0 - f.x, y: TRUNK_BOTTOM - 9 - f.y, w: trunkX1 - trunkX0 + 1, h: 10 },
      /** Encoche visée, dans l'image : le fond de la fente de l'entaille, à chaque profondeur (0, 1, 2). */
      /** Collision de la bille qui naît de cette pièce, dans la même image (x, y, w, h). */
      logRect: { x: PIECE_X[k] - f.x, y: TRUNK_BOTTOM - 9 - f.y, w: JUNCTION[k] - PIECE_X[k], h: 10 },
      aim: aimed ? NOTCH_DEPTH.map((d) => [JUNCTION[k] - 1 - f.x, TRUNK_TOP + d - 1 - f.y] as Vec) : undefined,
    };
  };
  return {
    pieces: [0, 1, 2].map((k) => describe(PIECE_NAMES[k], FRAMES[k], k, true)),
    crown: describe('felled-crown', FRAMES[3], 3, false),
    head: describe('felled-head', FRAMES[3], 3, true),
  };
})();

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

export default [
  treeFall,
  ...SETS.flatMap((s, k) => s.map(([name, c]) => img(name, cut(c, FRAMES[k])))),
  ...[...CROWN_SET, ...HEAD_SET].map(([name, c]) => img(name, cut(c, FRAMES[3]))),
  ...LOGS.map((c, k) => img(`felled-log-${k + 1}`, cut(c, FRAMES[k]))),
  img('felled-log', ((l) => cut(l, bounds([l])))(felledLog())),
];
