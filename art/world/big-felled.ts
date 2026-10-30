// Chute de l'arbre et arbre couché.
//
// La chute (`big-tree-fall`) reprend l'arbre de trees.ts dans son repère (image 64x96, pied du tronc en (33, 89)),
// pivoté autour de la charnière au-dessus de la souche. Sa dernière image est l'arbre couché lui-même :
// la souche (`big-tree-stump`) et les quatre pièces que le jeu pose ensuite comme objets séparés, si bien que
// le remplacement de la dernière image par les objets ne saute pas.
//
// Arbre couché vers la droite, du pied à la cime : `big-felled-section-1`, `-2`, `-3` (tronc nu, 19 px, environ 1 m),
// puis `big-felled-crown` (4e bille et pointe, sous le houppier). Ébranché, `big-felled-crown` devient `big-felled-head`
// (même image, même place : la 4e bille nue, puis la pointe avec ses chicots). Chaque pièce est une future bille
// et porte une encoche à son bout droit, sur la jonction avec la suivante, qui se creuse à chaque coup (`-n1`, `-n2`)
// puis se coupe (`-cut-right` ; la voisine passe en `-cut-left`). La bille `big-felled-log-k` est la pièce k coupée aux
// deux bouts, même image, même place. La chute vers la gauche (`big-tree-fall-left`, pièces `-left`) a sa propre
// section en fin de fichier : géométrie en miroir, dessin et lumière refaits.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { FOOT, type Vec, despeckle, groundShadow, shadedOutline, standingTree, stump, stumpBody, treeBody } from './big-tree';
import { DIAMETER, bark, faceTone, logByTheEnd, logEnd } from './wood';

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
/** Première colonne du tronc debout sous le houppier (rangée 77 de treeBody : 11 px, de 27 à 37). */
const PROFILE_X0 = 27;

function withStump(c: Canvas, off = OFF): Canvas {
  c.stamp(stumpBody().toGrid(), STUMP_AT[0] + off, STUMP_AT[1]);
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
  // le tronc ajouté : la silhouette du tronc juste sous la coupe, l'écorce commune (art/world/wood.ts), ses sillons
  // continuant ceux du tronc au-dessus
  const profile = body.px[77];
  for (let y = TRUNK_FROM; y < cut; y++) for (let x = 0; x < 64; x++) {
    src.px[y][x] = profile[x] === EMPTY ? EMPTY : bark(y, (x - PROFILE_X0 + 0.5) / DIAMETER);
  }
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
 * Dessine le haut de l'arbre selon `pose` (tourné de `deg` degrés vers la droite, vers la gauche si `deg` < 0), avec la lumière
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
  // bout scié : disque du tronc vu de biais, tourné vers le bas-gauche (vers la lumière) quand l'arbre tombe
  // à droite, vers le bas-droite (dans l'ombre) quand il tombe à gauche
  // face commune (art/world/wood.ts), dans l'ombre quand l'arbre tombe à gauche
  const minor = 0.9 + 1.1 * Math.abs(sin);
  const rx = 5.6, ry = minor + 0.4;
  const inFace = (h: number, g: number) => h >= 1 && ((g + 0.3) / rx) ** 2 + ((h - 1) / ry) ** 2 <= 1;
  // la rangée du bas : bord d'écorce du disque, qui sépare le bout scié du dessus de la souche
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (layer.get(X, Y) !== EMPTY && local(X, Y)[0] < 1) layer.set(X, Y, 'N');
  }
  const paint: [number, number, string][] = [];
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (layer.get(X, Y) === EMPTY) continue;
    const [h, g] = local(X, Y);
    if (!inFace(h, g)) continue;
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const [h2, g2] = local(X + dx, Y + dy);
      return layer.get(X + dx, Y + dy) === EMPTY || (!inFace(h2, g2) && h2 >= 1);
    });
    // u en travers du tronc, v le long (vers la cime) : la face regarde le bas de l'écran
    paint.push([X, Y, faceTone((g + 0.3) / rx, -(h - 1) / ry, rim, p.deg < 0)]);
  }
  for (const [X, Y, k] of paint) layer.set(X, Y, k);
  c.stamp(layer.toGrid(), 0, 0);
}

/** Image de la chute : souche fixe, haut de l'arbre dans la pose donnée, contour, ombres. */
function fallFrame(p: Pose, shadows: [number, number, number, number][], off = OFF): Canvas {
  const c = withStump(new Canvas(FALL_W, FALL_H), off);
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

/** Centre du tronc couché en hauteur (11 rangées de bois à partir de TRUNK_TOP). */
const LOG_CY = TRUNK_TOP + DIAMETER / 2;

/**
 * Bout coupé d'un tronc couché (bout commun de art/world/wood.ts) : coins arrondis en ovale ; le bout de gauche, tourné
 * vers la lumière, montre la face de coupe, celui de droite l'écorce qui s'enroule. `x` : première colonne de bois
 * (bout gauche) ou colonne qui suit la dernière (bout droit).
 */
function sawnEnd(c: Canvas, x: number, side: 'left' | 'right', cy = LOG_CY) {
  logEnd(c, x, side, cy, side === 'left');
}

/**
 * Tronc couché, sans contour : profil d'écorce de l'arbre (clair en haut, sombre en bas), aminci vers la cime.
 * `withStubs` : ébranché, avec les chicots sur la pointe (au-delà de la 4e bille) et la cime coupée net.
 */
function trunkBody(withStubs: boolean): Canvas {
  const c = trunkCore();
  sawnEnd(c, BUTT_X, 'left');
  if (withStubs) stubs(c, (x) => x);
  return c;
}

/** Tronc couché vers la droite, sans bout scié ni chicots : profil d'écorce, amincissement, fentes. */
function trunkCore(): Canvas {
  const profile = treeBody(LYING_LIGHT).px[77];
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = lying(X, Y);
    if (h < 0 || h > TRUNK_LEN) continue;
    const s = h <= TAPER_FROM ? 1 : 1 - (0.55 * (h - TAPER_FROM)) / (TRUNK_LEN - TAPER_FROM);
    const i = Math.floor(FOOT[0] + g / s);
    if (profile[i] && profile[i] !== EMPTY) c.set(X, Y, bark(X - BUTT_X, (i - PROFILE_X0 + 0.5) / DIAMETER));
  }
  return c;
}

/**
 * Chicots de la pointe et cime coupée net. `at` place une colonne du tronc couché vers la droite à l'écran
 * (l'identité, ou le miroir pour le tronc couché vers la gauche) : les chicots montent en biais vers la cime,
 * leur flanc du haut reste le plus clair dans les deux sens.
 */
function stubs(c: Canvas, at: (x: number) => number) {
  // chicots : moignons de branches coupées au ras, deux vers le nord (éclairés), un vers le sud (ombre)
  c.line(at(139), 75, at(142), 72, 'M').line(at(140), 75, at(143), 72, 'm').line(at(140), 76, at(143), 73, 'm');
  c.set(at(142), 71, 'Y').set(at(143), 71, 'Y').set(at(144), 72, 'Y');
  c.line(at(147), 77, at(149), 75, 'M').line(at(148), 77, at(150), 75, 'm');
  c.set(at(149), 74, 'Y').set(at(150), 74, 'Y').set(at(151), 75, 'Y');
  c.line(at(142), 86, at(143), 87, 'N').line(at(143), 86, at(144), 87, 'N').line(at(144), 86, at(145), 87, 'K');
  c.set(at(144), 88, 't').set(at(145), 88, 't');
  // pointe de la cime, coupée net
  const tip = at(BUTT_X + TRUNK_LEN);
  for (let Y = 0; Y < FALL_H; Y++) if (c.get(tip, Y) !== EMPTY) c.set(tip, Y, 't');
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

/**
 * Bille seule (`big-felled-log`, celle du tas et de l'atelier) : la même que les billes du tronc, 17 px de bois entre deux
 * contours, 11 de diamètre. Un cylindre : l'écorce commune en travers (lumière en haut), les sillons en long, les coins
 * arrondis, la face de coupe en ovale au bout gauche, vers la lumière, et l'écorce enroulée au bout droit.
 */
const LOG_LEN = 17;
function felledLog(): Canvas {
  const c = new Canvas(LOG_LEN + 4, 17);
  for (let Y = 1; Y <= DIAMETER; Y++) for (let X = 1; X <= LOG_LEN; X++) c.set(X, Y, bark(X + 30, (Y - 1 + 0.5) / DIAMETER));
  sawnEnd(c, 1, 'left', 1 + DIAMETER / 2);
  sawnEnd(c, LOG_LEN + 1, 'right', 1 + DIAMETER / 2);
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  // ombre au sol, décalée vers la droite par la lumière : elle s'arrête au bord droit du corps (colonne LOG_LEN + 1),
  // sans le dépasser, pour ne pas tomber sur l'herbe à côté des porteuses quand la bille est posée dans un creux du tas
  for (let X = 2; X <= LOG_LEN + 1; X++) for (const Y of [13, 14]) if (c.get(X, Y) === EMPTY) c.set(X, Y, 'x');
  for (let X = 4; X <= LOG_LEN; X++) if (c.get(X, 15) === EMPTY) c.set(X, 15, 'x');
  return c;
}

/**
 * La même bille couchée nord-sud (`big-felled-log-ns`, tas tourné de piles.json), vue par le bout : la bille est-ouest
 * tournée d'un quart de tour. Elle tient dans la même boîte, transposée : 13 px de large (11 de diamètre, 55 cm, et le
 * contour) et 19 px de haut, comme la bille est-ouest et la pièce du tronc font 19 px de long (95 cm). Au sol, le jeu
 * compte la profondeur à 5 cm par pixel, comme la largeur (collisions de props.json, tas est-ouest à 11 px d'une
 * bille à l'autre) : la bille couvre donc 19 px du nord au sud, face de coupe comprise. Dans ces 19 px : le contour,
 * 10 rangées d'écorce (du rond du fond au haut de la face) et la face de coupe, ovale de 11 × 7 px, puis le contour.
 * Matière commune (art/world/wood.ts) : écorce éclairée à gauche, sillons en long, le bord du bout lointain en haut,
 * la face de coupe devant. L'ombre au sol tombe le long du flanc droit (colonne 13, la seule au-delà du contour) et
 * sous la face, décalée à droite. Posée dans un creux du tas, ce flanc d'ombre tombe sur la bille de dessous.
 */
export const LOG_NS = { w: 14, h: 21, cx: 6.5, back: 4.5, front: 14.5, rx: 5.5, ry: 3.5 } as const;
function felledLogNS(): Canvas {
  const { w, h, cx, back, front, rx, ry } = LOG_NS;
  const c = logByTheEnd(new Canvas(w, h), cx, back, front, rx, ry);
  despeckle(c, 'KYTtN');
  shadedOutline(c);
  // ombre au sol : le corps contourné, décalé d'un pixel vers la droite et de deux vers le bas
  const body = Canvas.from(c.toGrid());
  for (let Y = 0; Y < h; Y++) for (let X = 2; X < w; X++) {
    if (c.get(X, Y) !== EMPTY || body.get(X - 1, Y - 2) === EMPTY) continue;
    if (Y < back + 2) continue;
    c.set(X, Y, 'x');
  }
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

const PIECE_NAMES = ['big-felled-section-1', 'big-felled-section-2', 'big-felled-section-3', 'big-felled-crown'];
const PIECES = [0, 1, 2, 3].map((k) => piece(k));

/**
 * Toutes les images d'une pièce, dans la frame entière : clé -> canevas. La 1re section n'a pas de bout gauche
 * à couper (c'est le bout scié) ; le houppier ne s'entaille pas (on ébranche d'abord).
 */
function variants(k: number, head: boolean): [string, Canvas][] {
  const name = head ? 'big-felled-head' : PIECE_NAMES[k];
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
 * Données des pièces, pour props.json : repère = coin bas gauche de l'image `big-tree` posée sur la carte
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
    crown: describe('big-felled-crown', FRAMES[3], 3, false),
    head: describe('big-felled-head', FRAMES[3], 3, true),
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
  name: 'big-tree-fall',
  frameW: FALL_W,
  frameH: FALL_H,
  palette: world,
  animations: {
    fall: { frames: frames.map((f) => f.toGrid()), frameRate: 6, repeat: 0 },
  },
};

// ---------- Chute vers la gauche ----------
// Pas un miroir de la chute à droite : l'arbre debout reste `big-tree` tel quel, il pivote vers la gauche autour du bord
// gauche de sa coupe, et la souche reste `big-tree-stump`, à la même place. Seules la géométrie des pièces couchées
// (silhouettes, encoches, cadres) est le miroir exact de celle de droite autour du pied de l'arbre, pour que le jeu
// en déduise positions et collisions (x' = 66 - (x + w - 1) dans le repère de `big-tree`) ; le dessin est refait avec
// la lumière en haut à gauche : faces de coupe, entailles, houppier, contour.
//
// Frame de même taille que la chute à droite, miroir de la sienne : l'arbre debout y est à OFF_L, le tronc couché
// s'étend vers la gauche. Une colonne X de la frame de droite devient la colonne mx(X) de celle de gauche.

/** Décalage de l'arbre dans la frame de la chute à gauche : coin bas gauche de la frame à x = -OFF_L de celui de `big-tree`. */
export const OFF_L = FALL_W - 1 - OFF - 66;
const mx = (X: number) => FALL_W - 1 - X;
/** Charnière de la chute à gauche : bord gauche de la coupe (le tronc va de 28 à 37 sous le houppier). */
const HINGE_L: Vec = [28, CUT_Y];

/** Pose pivotée vers la gauche autour du bord gauche de la coupe. */
function pivotLeft(deg: number): Pose {
  const t = (-deg * Math.PI) / 180;
  const s = Math.abs(Math.sin(t));
  const d = FOOT[0] - HINGE_L[0];
  return {
    deg: -deg,
    base: [HINGE_L[0] + OFF_L + d * Math.cos(t), HINGE_L[1] - d * s],
    ext: Math.round(EXT * s),
    squash: 1 - 0.64 * s * s,
  };
}

/** Miroir horizontal d'une image de la frame. */
const flipFrame = (c: Canvas): Canvas => Canvas.from(c.toGrid().map((r) => [...r].reverse().join('')));

/**
 * Entaille au bout gauche d'une pièce couchée à gauche (miroir de NOTCH en forme, calée à gauche sur la première
 * colonne après la jonction). Le flanc en biais regarde ici le haut à gauche, vers la lumière : bois frais plus
 * clair que dans l'entaille de droite. La colonne de la jonction reste le fond de la fente, dans l'ombre.
 */
const NOTCH_L: string[][] = [
  ['..  ', 'KY  '],
  ['.... ', 'KtY  ', 'Kt   ', 'K    '],
  ['......', '..... ', 'KtYYY ', 'KttY  ', 'KTt   ', 'KT    ', 'K     '],
];
NOTCH_L.forEach((p, d) => {
  const ref = NOTCH[d];
  const same = p.length === ref.length && p.every((row, r) =>
    row.length === ref[r].length && [...row].every((ch, i) => (ch === '.') === (ref[r][row.length - 1 - i] === '.')));
  if (!same) throw new Error(`felled : l'entaille gauche ${d} n'est pas le miroir de l'entaille droite`);
});

function notchLeft(c: Canvas, first: number, depth: number) {
  NOTCH_L[depth].forEach((row, r) => {
    for (let i = 0; i < row.length; i++) {
      const col = row[i];
      if (col === ' ') continue;
      const X = first + i;
      if (c.get(X, TRUNK_TOP + r) !== EMPTY) c.set(X, TRUNK_TOP + r, col);
    }
  });
}

/** Tronc couché vers la gauche, sans contour : bout scié au pied à droite (dans l'ombre), chicots vers la gauche. */
function trunkBodyLeft(withStubs: boolean): Canvas {
  const c = flipFrame(trunkCore());
  sawnEnd(c, FALL_W - BUTT_X, 'right');
  if (withStubs) stubs(c, mx);
  return c;
}

/**
 * Houppier couché vers la gauche, sans contour : mêmes pixels de l'arbre que le houppier de droite, en miroir
 * (silhouette identique retournée), mais éclairés pour ce sens. Le miroir envoie le haut de l'écran sur la gauche
 * de l'arbre, comme à droite, et la gauche de l'écran vers sa cime : la lumière nord-ouest y redevient celle de
 * l'arbre debout.
 */
function crownBodyLeft(): Canvas {
  const lit = treeBody();
  const ref = treeBody(LYING_LIGHT);
  const k = (CROWN_END - F0) / (66 - 12);
  const half = 5.5;
  const inv = (g: number) => (Math.abs(g) <= half ? g : Math.sign(g) * (half + (Math.abs(g) - half) / SQUASH));
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = lying(mx(X), Y);
    if (h < F0) continue;
    const sx = Math.floor(FOOT[0] + inv(g));
    const sy = Math.floor(66 - (h - F0) / k);
    if (!'jLlk'.includes(ref.get(sx, sy))) continue;
    const q = lit.get(sx, sy);
    // un pixel que le nettoyage de l'arbre a rendu au tronc dans ce sens garde la teinte moyenne du feuillage
    c.set(X, Y, 'jLlk'.includes(q) ? q : 'l');
  }
  despeckle(c);
  // pixels seuls au bord du feuillage (que despeckle laisse, ils touchent le vide) : la teinte voisine la plus courante
  const fix: [number, number, string][] = [];
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const p = c.get(X, Y);
    if (p === EMPTY) continue;
    const ns = [c.get(X + 1, Y), c.get(X - 1, Y), c.get(X, Y + 1), c.get(X, Y - 1)].filter((n) => n !== EMPTY);
    if (ns.length === 0 || ns.includes(p)) continue;
    const count: Record<string, number> = {};
    for (const n of ns) count[n] = (count[n] ?? 0) + 1;
    fix.push([X, Y, Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]]);
  }
  for (const [X, Y, col] of fix) c.px[Y][X] = col;
  return c;
}

/** Ombre au sol du tronc couché à gauche : décalée vers la droite, comme toutes les ombres. */
function trunkShadowLeft(): Canvas {
  const tip = mx(BUTT_X + TRUNK_LEN + 1); // colonne du contour de la pointe
  const butt = mx(BUTT_X - 1); // colonne du contour du bout scié, contre la souche
  const c = new Canvas(FALL_W, FALL_H);
  c.rect(tip + 2, TRUNK_BOTTOM + 1, butt - 1 - (tip + 2) + 1, 2, 'x').rect(tip + 4, TRUNK_BOTTOM + 3, butt - 3 - (tip + 4) + 1, 1, 'x');
  return c;
}

const TRUNK_L = shadedOutline(despeckle(trunkBodyLeft(false), 'KYTt'));
const CROWN_L = shadedOutline(crownBodyLeft());
const BAND_L = trunkShadowLeft();
/** Colonne la plus à droite du houppier couché à gauche (son ombre ne déborde pas de son image). */
const CROWN_L_RIGHT = mx(Math.min(...[...Array(FALL_W).keys()].filter((X) => CROWN.px.some((r) => r[X] !== EMPTY))));
const CROWN_SHADOW_L = new Canvas(FALL_W, FALL_H).ellipse(mx(BUTT_X + 81) + 13, 90.5, 21, 3.5, 'x');

/** Pièce k couchée à gauche : X de la frame de gauche, dans la pièce k (miroir de inRange). */
const inRangeL = (X: number, k: number) => inRange(mx(X), k);
/**
 * Souche posée dans la frame de gauche. L'ombre d'une pièce ne se pose jamais sur elle : dans la frame, `stamp`
 * remplacerait le pixel de la souche par l'ombre (herbe ombrée), alors qu'en jeu l'ombre translucide se fond
 * avec la souche (pixel sombre). Sans ombre à cet endroit, les deux donnent la souche.
 */
const STUMP_L = new Canvas(FALL_W, FALL_H).stamp(stump().toGrid(), STUMP_AT[0] + OFF_L, STUMP_AT[1]);

/**
 * Tronc de la pièce k couchée à gauche, contour compris. Les états parlent de la chaîne : `left` est le bout côté
 * souche (à droite à l'écran, face de coupe dans l'ombre), `right` le bout côté cime (à gauche à l'écran, face de
 * coupe vers la lumière, entaille).
 */
function pieceTrunkLeft(k: number, head: boolean, st: State): Canvas {
  const c = trunkBodyLeft(head);
  const hi = st.left ? mx(PIECE_X[k] + 1) : FALL_W - 1;
  const lo = st.right === 'cut' ? mx(JUNCTION[k] - 2) : 0;
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) if (X < lo || X > hi) c.px[Y][X] = EMPTY;
  if (st.left) sawnEnd(c, hi + 1, 'right');
  if (st.right === 'cut') sawnEnd(c, lo, 'left');
  else notchLeft(c, FALL_W - JUNCTION[k], st.right ?? 0);
  return shadedOutline(despeckle(c, 'KYTt'));
}

/** Pièce k (0 à 3) couchée à gauche, dans la frame entière. */
function pieceLeft(k: number, head = false, st: State = {}): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  const trunk = pieceTrunkLeft(k, head, st);
  const crown = k === 3 && !head;
  // ombre du tronc : décalée vers la droite, elle commence deux colonnes après un bout coupé à gauche à l'écran
  // (quatre au bord) et s'arrête au contour d'un bout coupé à droite
  const bandFrom = (Y: number) => (st.right === 'cut' ? FALL_W - JUNCTION[k] + (Y >= TRUNK_BOTTOM + 3 ? 4 : 2) : 0);
  const bandTo = st.left ? mx(PIECE_X[k]) : FALL_W;
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (inRangeL(X, k)) c.set(X, Y, trunk.get(X, Y));
    if (!crown) continue;
    const f = CROWN_L.get(X, Y);
    if (f === EMPTY) continue;
    const t = TRUNK_L.get(X, Y);
    if (t === EMPTY || (mx(X) >= PIECE_X[3] && mx(X) >= overAt(Y))) c.set(X, Y, f);
  }
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    if (STUMP_L.get(X, Y) !== EMPTY) continue;
    if (inRangeL(X, k) && X >= bandFrom(Y) && X <= bandTo && BAND_L.get(X, Y) !== EMPTY) c.set(X, Y, 'x');
    else if (crown && X <= CROWN_L_RIGHT && CROWN_SHADOW_L.get(X, Y) !== EMPTY && BAND_L.get(X, Y) === EMPTY && TRUNK_L.get(X, Y) === EMPTY) c.set(X, Y, 'x');
  }
  return c;
}

/** Variantes d'une pièce couchée à gauche : la clé de la pièce, puis `-left`, puis le suffixe d'état. */
function variantsLeft(k: number, head: boolean): [string, Canvas][] {
  const base = head ? 'big-felled-head' : PIECE_NAMES[k];
  return variants(k, head).map(([name]): [string, Canvas] => {
    const suffix = name.slice(base.length);
    const left = suffix.startsWith('-cut-left');
    const right = suffix.endsWith('-n1') ? 1 : suffix.endsWith('-n2') ? 2 : suffix === '-cut-right' ? 'cut' : undefined;
    return [`${base}-left${suffix}`, pieceLeft(k, head, { left, right })];
  });
}

const SETS_L = [0, 1, 2].map((k) => variantsLeft(k, false));
const CROWN_SET_L = variantsLeft(3, false);
const HEAD_SET_L = variantsLeft(3, true);
const LOGS_L: Canvas[] = [0, 1, 2, 3].map((k) => pieceLeft(k, k === 3, { left: k > 0, right: 'cut' }));
/** Cadres de gauche : miroirs exacts des cadres de droite (même taille, même y). */
const FRAMES_L: Frame[] = FRAMES.map((f) => ({ ...f, x: FALL_W - f.x - f.w }));

// Garde-fou : chaque image de gauche tient dans son cadre et a la silhouette exacte, retournée, de son image de droite
// (ombre portée mise à part : elle reste décalée vers la droite).
{
  const solid = (c: Canvas, X: number, Y: number) => c.get(X, Y) !== EMPTY && c.get(X, Y) !== 'x';
  const pairs: [string, Canvas, Canvas, Frame, Frame][] = [
    ...SETS.flatMap((s, k) => s.map(([n, c], i): [string, Canvas, Canvas, Frame, Frame] => [n, c, SETS_L[k][i][1], FRAMES[k], FRAMES_L[k]])),
    ...[...CROWN_SET, ...HEAD_SET].map(([n, c], i): [string, Canvas, Canvas, Frame, Frame] => [n, c, [...CROWN_SET_L, ...HEAD_SET_L][i][1], FRAMES[3], FRAMES_L[3]]),
    ...LOGS.map((c, k): [string, Canvas, Canvas, Frame, Frame] => [`big-felled-log-${k + 1}`, c, LOGS_L[k], FRAMES[k], FRAMES_L[k]]),
  ];
  for (const [name, r, l, , fl] of pairs) {
    for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
      if (solid(l, X, Y) !== solid(r, mx(X), Y)) throw new Error(`felled : ${name}-left n'est pas le miroir de ${name} en (${X}, ${Y})`);
      if (l.get(X, Y) !== EMPTY && (X < fl.x || X >= fl.x + fl.w || Y < fl.y || Y >= fl.y + fl.h)) {
        throw new Error(`felled : ${name}-left déborde de son cadre en (${X}, ${Y})`);
      }
    }
  }
}

/** Dernière image de la chute à gauche : la souche et les quatre pièces couchées à gauche, posées comme par le jeu. */
function lyingFrameLeft(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  c.stamp(stump().toGrid(), STUMP_AT[0] + OFF_L, STUMP_AT[1]);
  const pieces = [...SETS_L.map((s) => s[0][1]), CROWN_SET_L[0][1]];
  // garde-fou : une ombre translucide posée sur un pixel déjà peint donnerait en jeu un mélange que `stamp` ne rend pas
  for (const p of pieces) for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const under = c.get(X, Y);
    if (p.get(X, Y) === 'x' && under !== EMPTY && under !== 'x') throw new Error(`felled : ombre d'une pièce gauche sur un pixel peint en (${X}, ${Y})`);
  }
  for (const p of pieces) c.stamp(p.toGrid(), 0, 0);
  return c;
}

const FOOT_XL = FOOT[0] + OFF_L;

const framesLeft = [
  new Canvas(FALL_W, FALL_H).stamp(standingTree().toGrid(), OFF_L, 0),
  fallFrame(pivotLeft(10), [[FOOT_XL + 3, 89.5, 17, 4], [FOOT_XL - 8, 90, 16, 3.5]], OFF_L),
  fallFrame(pivotLeft(45), [[FOOT_XL + 3, 89.5, 14, 3.5], [FOOT_XL - 38, 90.5, 26, 4]], OFF_L),
  lyingFrameLeft(),
];

const treeFallLeft: SpriteSheetSource = {
  ...treeFall,
  name: 'big-tree-fall-left',
  animations: {
    fall: { ...treeFall.animations.fall, frames: framesLeft.map((f) => f.toGrid()) },
  },
};

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  treeFall,
  ...SETS.flatMap((s, k) => s.map(([name, c]) => img(name, cut(c, FRAMES[k])))),
  ...[...CROWN_SET, ...HEAD_SET].map(([name, c]) => img(name, cut(c, FRAMES[3]))),
  ...LOGS.map((c, k) => img(`big-felled-log-${k + 1}`, cut(c, FRAMES[k]))),
  // largeur gardée à LOG_LEN + 3 (20 px, dernière colonne vide depuis que l'ombre ne dépasse plus) : collision et
  // places du tas en dépendent
  img('big-felled-log', ((l) => cut(l, { ...bounds([l]), w: LOG_LEN + 3 }))(felledLog())),
  img('big-felled-log-ns', felledLogNS()),
  treeFallLeft,
  ...SETS_L.flatMap((s, k) => s.map(([name, c]) => img(name, cut(c, FRAMES_L[k])))),
  ...[...CROWN_SET_L, ...HEAD_SET_L].map(([name, c]) => img(name, cut(c, FRAMES_L[3]))),
  ...LOGS_L.map((c, k) => img(`big-felled-log-${k + 1}-left`, cut(c, FRAMES_L[k]))),
];
