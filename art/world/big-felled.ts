// Chutes des gros arbres et gros arbre couché.
//
// La chute (`big-tree-fall`) reprend l'arbre debout de big-tree.ts dans son grand repère (`tallTreeBody`, image 64 x TALL_H,
// à sa vraie hauteur), pivoté autour de la charnière au-dessus de la souche : sa première image est `big-tree` lui-même.
// En tombant, le feuillage se raccourcit le long du tronc (de sa hauteur debout à la longueur du houppier couché) et
// s'aplatit en travers. Les images de la planche font FALL_W x FALL_HT, bas aligné : l'arbre couché est composé dans la
// frame 160x96 (FALL_H), posée au bas de la planche. La dernière image est la souche (`big-tree-stump`) et l'arbre couché
// (`big-felled-tree`) exactement comme le jeu les pose : le remplacement de la chute par les objets ne saute pas.
// La chute vers la gauche (`big-tree-fall-left`) est dessinée, pas retournée. Le moteur (`Faller`, `fallFrame`, `pivot`,
// `pivotLeft`, `felledTree`, `lyingFrame`) sert aussi au têtard (art/world/big-pollard.ts).
//
// L'arbre couché est d'un seul tenant (`big-felled-tree`, `-left`) : son tronc est, au pixel près, la pièce de bois `big`
// ronde de 400 cm (`composeWood`, art/world/wood-pieces.ts) que le jeu pose à sa place quand on a coupé le houppier.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { FOOT, STUMP_AT, TALL_DY, TALL_H, type Vec, despeckle, groundShadow, shadedOutline, standingTree, stump, stumpBody, tallTreeBody, treeBody } from './big-tree';
import { faceTone } from './wood';
import { composeWood } from './wood-pieces';

// ---------- Chute ----------

export const FALL_W = 160;
export const FALL_H = 96;
/** Hauteur des images de la planche de chute : celle de l'arbre debout ; la frame des pièces (FALL_H) en occupe le bas. */
const FALL_HT = TALL_H;
/** Décalage des rangées du repère 64x96 (et de la frame des pièces) dans le grand repère et dans la planche. */
const DY = TALL_DY;
/**
 * Décalage de l'arbre (64 de large) dans la frame : l'arbre debout est à gauche (pied en x = OFF + 33)
 * pour laisser au tronc couché, puis au houppier, la place de s'étendre vers la droite.
 */
export const OFF = 14;
/** Hauteur de la coupe dans le repère de l'arbre : tout ce qui est au-dessus tombe. */
const CUT_Y = 76;
/** Charnière : bord droit de la coupe, côté où l'arbre tombe. */
const HINGE: Vec = [38, CUT_Y];

/**
 * Ce qui tombe : le corps d'un arbre debout dans son repère (64 de large, pied en FOOT[0]), la rangée de la coupe
 * dans ce repère, et les rangées extrêmes de son feuillage. Le gros arbre (`big-tree`) tombe depuis `tallTreeBody`,
 * le têtard (`big-pollard`, art/world/big-pollard.ts) depuis `treeBody`.
 */
export interface Faller { body: (light: Vec) => Canvas; cut: number; crown: { top: number; bottom: number } }

/** Feuillage d'un arbre debout : première et dernière rangées. */
export function crownRows(body: Canvas): { top: number; bottom: number } {
  const rows = body.px.map((r, y) => (r.some((q) => 'jLlk'.includes(q)) ? y : -1)).filter((y) => y >= 0);
  return { top: rows[0], bottom: rows[rows.length - 1] };
}

/** Le gros arbre, dans son grand repère. */
const TALL: Faller = { body: tallTreeBody, cut: CUT_Y + DY, crown: crownRows(tallTreeBody()) };

export interface Pose {
  deg: number;
  /** Position à l'écran du centre de la coupe du tronc qui tombe. */
  base: Vec;
  /** Raccourcissement du feuillage le long du tronc (1 = aucun) : couché, il a la longueur du houppier couché. */
  along: number;
  /** Écrasement du houppier de part et d'autre du tronc (1 = aucun) : vu de dessus, il s'aplatit au sol. */
  squash: number;
}

/**
 * Dessine le haut de l'arbre selon `pose` (tourné de `deg` degrés vers la droite, vers la gauche si `deg` < 0), avec la lumière
 * nord-ouest de l'écran ramenée dans le repère de l'arbre, puis le bout scié au pied du tronc.
 */
function drawFalling(c: Canvas, p: Pose, f: Faller) {
  const t = (p.deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const S: Vec = [-Math.SQRT1_2, -Math.SQRT1_2];
  const src = f.body([S[0] * cos + S[1] * sin, -S[0] * sin + S[1] * cos]);
  const cut = f.cut;
  // distance de la coupe au bas du feuillage : au-delà, le feuillage se raccourcit
  const hc = cut - f.crown.bottom;
  const row = (h: number) => Math.floor(cut - (h <= hc ? h : hc + (h - hc) / p.along));
  const half = 5.5; // demi-largeur du tronc, jamais écrasée
  const inv = (g: number) => (Math.abs(g) <= half ? g : Math.sign(g) * (half + (Math.abs(g) - half) / p.squash));
  // calque à part : le bout scié ne se peint que sur le tronc qui tombe, jamais sur la souche
  const layer = new Canvas(c.w, c.h);
  // axe du tronc (vers la cime) : (sin, -cos) ; travers (côté droit de l'arbre) : (cos, sin)
  const local = (X: number, Y: number): Vec => {
    const U = X + 0.5 - p.base[0];
    const V = Y + 0.5 - p.base[1];
    return [U * sin - V * cos, U * cos + V * sin];
  };
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    const [h, g] = local(X, Y);
    if (h < 0) continue;
    const q = src.get(Math.floor(FOOT[0] + inv(g)), row(h));
    if (q !== EMPTY) layer.set(X, Y, q);
  }
  // bout scié : disque du tronc vu de biais, tourné vers le bas-gauche (vers la lumière) quand l'arbre tombe
  // à droite, vers le bas-droite (dans l'ombre) quand il tombe à gauche
  // face commune (art/world/wood.ts), dans l'ombre quand l'arbre tombe à gauche
  const minor = 0.9 + 1.1 * Math.abs(sin);
  const rx = 5.6, ry = minor + 0.4;
  const inFace = (h: number, g: number) => h >= 1 && ((g + 0.3) / rx) ** 2 + ((h - 1) / ry) ** 2 <= 1;
  // la rangée du bas : bord d'écorce du disque, qui sépare le bout scié du dessus de la souche
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (layer.get(X, Y) !== EMPTY && local(X, Y)[0] < 1) layer.set(X, Y, 'N');
  }
  const paint: [number, number, string][] = [];
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
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

/**
 * Image de la chute (FALL_W x `h`, FALL_HT par défaut) : souche fixe, haut de l'arbre `f` dans la pose donnée, contour,
 * ombres. Les ombres sont données dans la frame des pièces (y de 0 à FALL_H), comme la souche ; la frame des pièces
 * occupe le bas de l'image.
 */
export function fallFrame(p: Pose, shadows: [number, number, number, number][], off = OFF, f: Faller = TALL, h = FALL_HT): Canvas {
  const dy = h - FALL_H;
  const c = new Canvas(FALL_W, h);
  c.stamp(stumpBody().toGrid(), STUMP_AT[0] + off, STUMP_AT[1] + dy);
  drawFalling(c, p, f);
  despeckle(c, 'KY');
  shadedOutline(c);
  for (const [x, y, rx, ry] of shadows) groundShadow(c, x, y + dy, rx, ry);
  return c;
}

/** Raccourcissement du feuillage selon le sinus de l'angle : 1 debout, longueur du houppier couché / hauteur du feuillage debout couché. */
function alongAt(s: number, f: Faller): number {
  const lying = (CROWN_END - F0) / (f.crown.bottom - f.crown.top + 1);
  return 1 - (1 - lying) * s * s;
}

/**
 * Pose pivotée autour de la charnière (bord droit de la coupe), qui reste sur la souche. `dy` : décalage des rangées
 * du repère 64x96 dans l'image de la chute (celle du gros arbre par défaut).
 */
export function pivot(deg: number, f: Faller = TALL, dy = DY): Pose {
  const t = (deg * Math.PI) / 180;
  const s = Math.sin(t);
  // centre de la coupe : 5 px à gauche de la charnière, dans le repère tourné
  const d = HINGE[0] - FOOT[0];
  return {
    deg,
    base: [HINGE[0] + OFF - d * Math.cos(t), HINGE[1] + dy - d * s],
    along: alongAt(s, f),
    squash: 1 - 0.64 * s * s,
  };
}

// ---------- Chute vers la gauche ----------
// Pas un miroir de la chute à droite : l'arbre debout reste tel quel, il pivote vers la gauche autour du bord gauche de sa
// coupe, et la souche reste à la même place. Frame de même taille, miroir de celle de droite autour du pied.

/** Décalage de l'arbre dans la frame de la chute à gauche : coin bas gauche de la frame à x = -OFF_L de celui de l'arbre debout. */
export const OFF_L = FALL_W - 1 - OFF - 66;
/** Charnière de la chute à gauche : bord gauche de la coupe (le tronc va de 28 à 37 sous le houppier). */
const HINGE_L: Vec = [28, CUT_Y];

/** Pose pivotée vers la gauche autour du bord gauche de la coupe. */
export function pivotLeft(deg: number, f: Faller = TALL, dy = DY): Pose {
  const t = (-deg * Math.PI) / 180;
  const s = Math.abs(Math.sin(t));
  const d = FOOT[0] - HINGE_L[0];
  return {
    deg: -deg,
    base: [HINGE_L[0] + OFF_L + d * Math.cos(t), HINGE_L[1] + dy - d * s],
    along: alongAt(s, f),
    squash: 1 - 0.64 * s * s,
  };
}

// ---------- Arbre couché ----------
// D'un seul tenant : le tronc est la pièce de bois `big` ronde, est-ouest, de la longueur utile de l'arbre, telle que
// `composeWood` (art/world/wood-pieces.ts) l'assemble et telle que le jeu la pose quand on a coupé le houppier : rien ne
// saute à l'ébranchage. Le houppier se pose par-dessus, au-delà d'une frontière festonnée, ailleurs sur le vide.
// Composé dans la frame de la chute (FALL_W × FALL_H), puis recadré sur ses pixels peints.
//
// Vers la gauche : la même pièce (jamais retournée : sa face de coupe reste à gauche, côté cime), posée en miroir autour
// du pied (son dernier pixel de corps sur le contour du bout scié) ; le houppier a la silhouette retournée de celui de
// droite, éclairé pour ce sens (lumière en haut à gauche). Le cadre de gauche est le miroir exact de celui de droite, pour
// que le jeu en déduise position (x' = 2 × pied − (x + largeur − 1)), collisions et place de la pièce.

/** Lumière nord-ouest de l'écran ramenée dans le repère de l'arbre couché (tourné de 90° vers la droite). */
const LYING_LIGHT: Vec = [-Math.SQRT1_2, Math.SQRT1_2];
/** Première colonne d'écorce du tronc couché (bout scié), contre la racine droite de la souche. */
const BUTT_X = OFF + FOOT[0] + 13;
/** Colonne du coin gauche de la pièce de bois (le contour de son bout scié). */
const WOOD_X = BUTT_X - 1;
/** Axe du tronc couché : 6 px au-dessus du sol. */
const AXIS_Y = 81.5;
/** Rangées d'écorce du tronc couché : 11 à partir de TRUNK_TOP ; la pièce de bois a son contour du haut sur TRUNK_TOP − 1. */
const TRUNK_TOP = 75;
const WOOD_Y = TRUNK_TOP - 1;
/** Le houppier commence à F0 px du pied et finit à CROWN_END (le haut de l'arbre). */
const F0 = 46;
const CROWN_END = 98;
/** Écrasement du houppier en travers du tronc : vu de dessus, il s'aplatit au sol. */
const SQUASH = 0.4;
/** Frontière où le houppier passe par-dessus le tronc (festonnée), une valeur par rangée, du contour du haut à celui du bas. */
const OVER = [130, 131, 130, 129, 130, 132, 131, 130, 129, 130, 131, 130, 131];
const overAt = (y: number) => OVER[y - WOOD_Y] ?? 0;
/** Longueur utile du gros arbre (cm) : ses anciennes quatre billes, la dernière sous le houppier. */
export const BIG_TREE_CM = 400;

/** Distance au pied (h) et au travers de l'axe (g) d'un pixel de la frame. */
const lying = (X: number, Y: number): Vec => [X + 0.5 - BUTT_X, Y + 0.5 - AXIS_Y];
const mx = (X: number) => FALL_W - 1 - X;

/** Houppier couché vers la droite, sans contour : les masses de feuillage de l'arbre, raccourcies le long du tronc, aplaties en travers. */
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

/**
 * Houppier couché vers la gauche, sans contour : mêmes pixels de l'arbre que celui de droite, en miroir (silhouette
 * identique retournée), éclairés pour ce sens : le miroir envoie le haut de l'écran sur la gauche de l'arbre et la gauche
 * de l'écran vers sa cime, la lumière nord-ouest y redevient celle de l'arbre debout.
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

const CROWN = shadedOutline(crownBody());
const CROWN_L = shadedOutline(crownBodyLeft());
/** Colonnes extrêmes du houppier couché à droite (contour compris). */
const CROWN_COLS = [...Array(FALL_W).keys()].filter((X) => CROWN.px.some((r) => r[X] !== EMPTY));
const CROWN_X0 = CROWN_COLS[0];
const CROWN_X1 = CROWN_COLS[CROWN_COLS.length - 1];
const CROWN_ROWS = CROWN.px.map((r, y) => (r.some((q) => q !== EMPTY) ? y : -1)).filter((y) => y >= 0);
const CROWN_Y1 = CROWN_ROWS[CROWN_ROWS.length - 1];

/** Décale une image de la frame de `dx` colonnes. */
const shifted = (c: Canvas, dx: number) => new Canvas(FALL_W, FALL_H).stamp(c.toGrid(), dx, 0);

export interface Frame { x: number; y: number; w: number; h: number }

/** Cadre des pixels peints. */
function bounds(c: Canvas): Frame {
  let x0 = FALL_W, y0 = FALL_H, x1 = -1, y1 = -1;
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
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

/** Souche posée dans la frame, à droite (OFF) ou à gauche (OFF_L). */
const stumpIn = (off: number) => new Canvas(FALL_W, FALL_H).stamp(stump().toGrid(), STUMP_AT[0] + off, STUMP_AT[1]);

/** Un gros arbre couché, composé et décrit pour le jeu. */
export interface Felled {
  /** L'arbre couché dans la frame (sans la souche), vers la droite et vers la gauche. */
  right: Canvas;
  left: Canvas;
  /** Cadre de l'image à droite dans la frame ; celui de gauche en est le miroir exact. */
  frame: Frame;
  frameLeft: Frame;
  /** Image de la pièce de bois du tronc (n + 1 × 16) et sa longueur en pixels. */
  wood: Canvas;
  n: number;
  /** Pour props.json (voir `layout`). */
  layout: FelledLayout;
}

/**
 * Données de l'arbre couché pour props.json. `spawn` : coin bas gauche de l'image couchée (droite) par rapport à celui de
 * l'arbre debout posé ; `bodies` : collisions (x, y, w, h) dans l'image de droite, le tronc (celle de la pièce de bois)
 * puis le houppier ; `aim` : point visé du houppier ; `at` : décalage du coin bas gauche de la pièce de bois par rapport à
 * celui de l'image couchée.
 */
export interface FelledLayout {
  w: number;
  h: number;
  spawn: Vec;
  bodies: { x: number; y: number; w: number; h: number }[];
  aim: Vec;
  at: Vec;
}

/**
 * Compose l'arbre couché d'un tronc de `cm` centimètres, le houppier décalé de `shift` colonnes par rapport à celui du gros
 * grand (le têtard : plus court de 2 m, −40).
 */
export function felledTree(cm: number, shift: number, what: string): Felled {
  const wood = composeWood({ size: 'big', shape: 'round', axis: 'ew', length: cm });
  const n = wood.w - 1;
  const crownR = shifted(CROWN, shift);
  const crownL = shifted(CROWN_L, -shift);
  const shadow = (cx: number) => new Canvas(FALL_W, FALL_H).ellipse(cx, 90.5, 21, 3.5, 'x');
  const shadowR = shadow(BUTT_X + 81 + shift);
  const shadowL = shadow(mx(BUTT_X + 81) + 13 - shift);
  const crownRight = CROWN_X1 + shift;
  const crownLeftEdge = mx(CROWN_X0 + shift);
  const stumpL = stumpIn(OFF_L);
  const stumpR = stumpIn(OFF);

  const compose = (left: boolean): Canvas => {
    const c = new Canvas(FALL_W, FALL_H);
    const wx = left ? FALL_W - WOOD_X - n : WOOD_X;
    const base = new Canvas(FALL_W, FALL_H).stamp(wood.toGrid(), wx, WOOD_Y);
    const crown = left ? crownL : crownR;
    const stp = left ? stumpL : stumpR;
    for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
      const t = base.get(X, Y);
      // l'ombre de la pièce ne se pose jamais sur la souche : dans la frame, elle remplacerait le pixel au lieu de s'y fondre
      if (t !== EMPTY && !(t === 'x' && stp.get(X, Y) !== EMPTY)) c.set(X, Y, t);
      const f = crown.get(X, Y);
      if (f === EMPTY) continue;
      const col = left ? mx(X) : X; // colonne dans le sens de droite
      if (t === EMPTY || t === 'x' || col >= overAt(Y) + shift) c.set(X, Y, f);
    }
    // ombre du houppier, décalée vers la droite, sur le vide seulement, sans dépasser le houppier à droite
    const sh = left ? shadowL : shadowR;
    const edge = left ? crownLeftEdge : crownRight;
    for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
      if (c.get(X, Y) !== EMPTY || sh.get(X, Y) === EMPTY || X > edge || stp.get(X, Y) !== EMPTY) continue;
      c.set(X, Y, 'x');
    }
    return c;
  };
  const right = compose(false);
  const left = compose(true);

  // garde-fous : rien ne déborde de la frame ; la silhouette de gauche est le miroir de celle de droite (ombre mise à part)
  const solid = (c: Canvas, X: number, Y: number) => c.get(X, Y) !== EMPTY && c.get(X, Y) !== 'x';
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (solid(left, X, Y) !== solid(right, mx(X), Y)) throw new Error(`big-felled : ${what} à gauche n'est pas le miroir de droite en (${X}, ${Y})`);
  }
  // cadre commun : celui de droite et le miroir de celui de gauche
  const fr = bounds(right);
  const flRaw = bounds(left);
  const x0 = Math.min(fr.x, FALL_W - flRaw.x - flRaw.w);
  const x1 = Math.max(fr.x + fr.w, FALL_W - flRaw.x);
  const y0 = Math.min(fr.y, flRaw.y);
  const y1 = Math.max(fr.y + fr.h, flRaw.y + flRaw.h);
  const frame: Frame = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const frameLeft: Frame = { ...frame, x: FALL_W - frame.x - frame.w };
  if (frame.x < 0 || frame.x + frame.w > FALL_W || y1 > FALL_H) throw new Error(`big-felled : ${what} sort de la frame`);

  // garde-fou : le tronc de l'image est, au pixel près, la pièce de bois, partout où le houppier ne le couvre pas
  for (const [c, wx] of [[right, WOOD_X], [left, FALL_W - WOOD_X - n]] as const) {
    for (let Y = 0; Y < wood.h; Y++) for (let X = 0; X < wood.w; X++) {
      const q = wood.get(X, Y);
      if (q === EMPTY || q === 'x') continue;
      const got = c.get(wx + X, WOOD_Y + Y);
      if (got !== q && !'jLlkoK'.includes(got)) throw new Error(`big-felled : ${what}, le tronc diffère de la pièce de bois en (${wx + X}, ${WOOD_Y + Y})`);
    }
  }

  const bottom = frame.y + frame.h;
  const cx0 = CROWN_X0 + shift, cx1 = CROWN_X1 + shift;
  const layout: FelledLayout = {
    w: frame.w,
    h: frame.h,
    spawn: [frame.x - OFF, bottom - FALL_H],
    bodies: [
      // la collision de la pièce de bois (wood.json : la longueur moins un pixel, centrée ; 10 rangées, 3 au-dessus du bas)
      { x: WOOD_X + 1 - frame.x, y: WOOD_Y + 3 - frame.y, w: n - 1, h: 10 },
      // le houppier au sol : en retrait de 3 px de ses bords, de 6 rangées au-dessus de l'axe à son bord du bas
      { x: cx0 + 3 - frame.x, y: Math.floor(AXIS_Y) - 6 - frame.y, w: cx1 - cx0 - 5, h: CROWN_Y1 - 1 - (Math.floor(AXIS_Y) - 6) },
    ],
    aim: [Math.round((Math.max(cx0, WOOD_X + n - 12) + cx1) / 2) - frame.x, Math.floor(AXIS_Y) - frame.y],
    at: [WOOD_X - frame.x, WOOD_Y + wood.h - bottom],
  };
  return { right, left, frame, frameLeft, wood, n, layout };
}

/** Le gros grand couché : tronc de 4 m. */
export const BIG_FELLED = felledTree(BIG_TREE_CM, 0, 'big-felled-tree');

/** Dernière image d'une chute : la souche, puis l'arbre couché, exactement comme le jeu les pose. */
export function lyingFrame(f: Felled, left: boolean): Canvas {
  const c = stumpIn(left ? OFF_L : OFF);
  const t = left ? f.left : f.right;
  // garde-fou : une ombre translucide posée sur un pixel déjà peint donnerait en jeu un mélange que `stamp` ne rend pas
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (t.get(X, Y) === 'x' && c.get(X, Y) !== EMPTY) throw new Error(`big-felled : ombre de l'arbre couché sur la souche en (${X}, ${Y})`);
  }
  return c.stamp(t.toGrid(), 0, 0);
}

/** Les images de l'arbre couché : `<clé>` (droite) et `<clé>-left`, recadrées sur leur cadre commun. */
export function felledImages(key: string, f: Felled): ImageSource[] {
  return [img(key, cut(f.right, f.frame)), img(`${key}-left`, cut(f.left, f.frameLeft))];
}

const FOOT_X = FOOT[0] + OFF;
const FOOT_XL = FOOT[0] + OFF_L;

const frames = [
  new Canvas(FALL_W, FALL_HT).stamp(standingTree().toGrid(), OFF, FALL_HT - TALL_H),
  fallFrame(pivot(10), [[FOOT_X + 3, 89.5, 17, 4], [FOOT_X + 12, 90, 16, 3.5]]),
  fallFrame(pivot(45), [[FOOT_X + 3, 89.5, 14, 3.5], [FOOT_X + 46, 90.5, 26, 4]]),
  new Canvas(FALL_W, FALL_HT).stamp(lyingFrame(BIG_FELLED, false).toGrid(), 0, DY),
];

const framesLeft = [
  new Canvas(FALL_W, FALL_HT).stamp(standingTree().toGrid(), OFF_L, FALL_HT - TALL_H),
  fallFrame(pivotLeft(10), [[FOOT_XL + 3, 89.5, 17, 4], [FOOT_XL - 8, 90, 16, 3.5]], OFF_L),
  fallFrame(pivotLeft(45), [[FOOT_XL + 3, 89.5, 14, 3.5], [FOOT_XL - 38, 90.5, 26, 4]], OFF_L),
  new Canvas(FALL_W, FALL_HT).stamp(lyingFrame(BIG_FELLED, true).toGrid(), 0, DY),
];

const sheet = (name: string, fs: Canvas[]): SpriteSheetSource => ({
  kind: 'spritesheet',
  name,
  frameW: FALL_W,
  frameH: FALL_HT,
  palette: world,
  animations: { fall: { frames: fs.map((f) => f.toGrid()), frameRate: 6, repeat: 0 } },
});

function img(name: string, c: Canvas): ImageSource {
  return { kind: 'image', name, palette: world, grid: c.toGrid() };
}

export default [
  sheet('big-tree-fall', frames),
  sheet('big-tree-fall-left', framesLeft),
  ...felledImages('big-felled-tree', BIG_FELLED),
];
