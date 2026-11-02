// Chute de l'arbre normal : planches `normal-tree-fall` (vers la droite) et `normal-tree-fall-left` (vers la gauche).
//
// Même logique que la chute du gros arbre (art/world/big-felled.ts, sections « Chute » et « Chute vers la gauche »), à
// l'échelle de l'arbre normal (contrat : art/world/normal-geometry.ts). Cinq images :
// 1. et 2. le raccord (`leadIn` de art/world/felling.ts) : l'arbre de la dernière étape de l'abattage (`normal-tree-stage-7`,
//    entaillé, qui penche de 2,5°), posé en (OFF, 0), dont le haut continue de basculer autour de la même charnière ;
// 3. le haut de l'arbre pivoté de 10° autour de la charnière (bord de la coupe du côté où il tombe), sur la souche ;
// 4. pivoté de 45° ;
// 5. l'arbre couché lui-même : `lyingFrame()` de normal-felled.ts, la souche et `normal-felled-tree` exactement comme le
//    jeu les posera, pour que rien ne saute au remplacement.
//
// En tombant, l'arbre passe de la vue de face (debout, hauteur en vraie grandeur) à la vue de dessus (couché) : le tronc
// nu s'allonge (EXT) et le houppier, vu de plus en plus par-dessus, se raccourcit le long du tronc (CROWN_K) et
// s'aplatit en travers (SQUASH), jusqu'aux proportions de l'arbre couché de normal-felled.ts (environ 140 px du bout
// scié à la cime). Vers la gauche, ce n'est pas un miroir : l'arbre debout reste `normal-tree`, il pivote autour du bord
// gauche de sa coupe, la lumière reste en haut à gauche et la face de coupe du pied, tournée vers le bas à droite, est
// dans l'ombre.

import { Canvas, EMPTY } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { type Vec, despeckle, groundShadow, shadedOutline } from './big-tree';
import { NORMAL_WOOD, bark, faceTone } from './wood';
import { CROWN_BOTTOM, FALL_H, FALL_W, FOOT, OFF, OFF_L, STUMP_AT, TREE_W, TRUNK_ROW, TRUNK_X0 } from './normal-geometry';
import { stumpBody, treeBody } from './normal-tree';
import { lyingFrame, lyingFrameLeft } from './normal-felled';
import { NORMAL, hingeOf, leadIn, withChips, type LeadSide } from './felling';

/** Hauteur de la coupe dans le repère de l'arbre debout (13 px, 65 cm, au-dessus du pied) : tout ce qui est au-dessus tombe. */
const CUT_Y = 148;
/**
 * Charnière de la chute à droite : celle des étapes de l'abattage (art/world/felling.ts), le bord droit de l'écorce au
 * plancher de l'entaille, une rangée sous la coupe : l'arbre de la dernière étape continue de pivoter autour d'elle.
 */
const HINGE: Vec = hingeOf(NORMAL);
/** Charnière de la chute à gauche : celle des étapes vers la gauche (`-left-stage-<n>`), le bord gauche de l'écorce au plancher. */
const HINGE_L: Vec = hingeOf(NORMAL, true);

/** Centre de la coupe (debout en (FOOT[0], CUT_Y)) pivoté de `deg` degrés (vers la droite si positif) autour de `h`. */
function cutCentre(deg: number, h: Vec, off: number): Vec {
  const t = (deg * Math.PI) / 180;
  const [u, v] = [FOOT[0] - h[0], CUT_Y - h[1]];
  return [h[0] + off + u * Math.cos(t) - v * Math.sin(t), h[1] + u * Math.sin(t) + v * Math.cos(t)];
}
/** Demi-largeur du tronc (6 px d'écorce, centré sur le pied) : jamais écrasée. */
const HALF = NORMAL_WOOD.diameter / 2;
/**
 * Allongement du tronc nu couché. Debout, 48 rangées séparent la coupe du bas du houppier (CUT_Y − CROWN_BOTTOM) ;
 * couché (normal-felled.ts), le houppier commence à 55 px du bout scié (F0), et le bout scié se pose 6 px plus loin que
 * le centre de la coupe à 90° (BUTT_X − pied, moins la charnière) : 61 − 48 = 13.
 */
const EXT = 13;
/**
 * Raccourcissement du houppier le long du tronc, couché (1 = aucun) : celui de normal-felled.ts, les 97 rangées du
 * houppier debout (CROWN_TOP à CROWN_BOTTOM) sur 82 px couché (F0 = 55 à CROWN_END = 137).
 */
const CROWN_K = 82 / 97;
/** Écrasement du houppier en travers du tronc, couché : celui de normal-felled.ts (0,4, comme le gros). */
const SQUASH = 0.4;
/** Rangée du sol sous le pied (centre des ombres portées). */
const GROUND_Y = FOOT[1] + 0.5;

/**
 * Première rangée sous le houppier où l'arbre n'est plus que tronc : le tronc s'allonge à partir d'elle. Lue sur le
 * dessin de l'arbre (aucun feuillage sur la rangée), au plus tôt à CROWN_BOTTOM.
 */
const TRUNK_FROM = (() => {
  const body = treeBody();
  for (let y = CROWN_BOTTOM; y < CUT_Y; y++) {
    if (body.px[y].every((p) => p === EMPTY || 'MmNK'.includes(p))) return y;
  }
  return CROWN_BOTTOM + 2;
})();

/** La souche sous le tronc qui tombe (sans contour : il se fait avec celui de toute l'image). */
function withStump(c: Canvas, off: number): Canvas {
  c.stamp(stumpBody().toGrid(), STUMP_AT[0] + off, STUMP_AT[1]);
  return c;
}

/**
 * Le haut de l'arbre (au-dessus de la coupe), houppier raccourci de `k`, tronc nu allongé de `ext` rangées. Le tronc
 * reprend le profil de l'arbre sous le houppier (rangée TRUNK_ROW) et l'écorce commune de l'arbre normal, éclairée à
 * gauche. Rend le canevas et la rangée de coupe dans ce canevas.
 */
function fallingPart(light: Vec, ext: number, k: number): { src: Canvas; cut: number } {
  const body = treeBody(light);
  const crownH = Math.round(TRUNK_FROM * k);
  const cut = crownH + (CUT_Y - TRUNK_FROM) + ext;
  const src = new Canvas(TREE_W, cut);
  for (let y = 0; y < crownH; y++) {
    const from = Math.max(0, Math.floor(TRUNK_FROM - (crownH - y - 0.5) / k));
    for (let x = 0; x < TREE_W; x++) src.px[y][x] = body.get(x, from);
  }
  const profile = body.px[TRUNK_ROW];
  for (let y = crownH; y < cut; y++) for (let x = 0; x < TREE_W; x++) {
    src.px[y][x] = profile[x] === EMPTY ? EMPTY : bark(y - crownH, (x - TRUNK_X0 + 0.5) / NORMAL_WOOD.diameter, NORMAL_WOOD);
  }
  return { src, cut };
}

interface Pose {
  deg: number;
  /** Position à l'écran du centre de la coupe du tronc qui tombe. */
  base: Vec;
  ext: number;
  /** Raccourcissement du houppier le long du tronc (1 = aucun). */
  k: number;
  /** Écrasement du houppier de part et d'autre du tronc (1 = aucun). */
  squash: number;
}

/**
 * Dessine le haut de l'arbre selon `p` (tourné de `deg` degrés vers la droite, vers la gauche si `deg` < 0), la lumière
 * nord-ouest de l'écran ramenée dans le repère de l'arbre, puis le bout scié au pied du tronc.
 */
function drawFalling(c: Canvas, p: Pose) {
  const t = (p.deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const S: Vec = [-Math.SQRT1_2, -Math.SQRT1_2];
  const { src, cut } = fallingPart([S[0] * cos + S[1] * sin, -S[0] * sin + S[1] * cos], p.ext, p.k);
  const inv = (g: number) => (Math.abs(g) <= HALF ? g : Math.sign(g) * (HALF + (Math.abs(g) - HALF) / p.squash));
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
  // bout scié : la face de coupe commune (sans cerne, trop étroite), vue de biais, tournée vers le bas-gauche (vers la
  // lumière) quand l'arbre tombe à droite, vers le bas-droite (dans l'ombre) quand il tombe à gauche
  const minor = 0.9 + 1.5 * Math.abs(sin);
  const rx = HALF + 0.1, ry = minor + 0.4;
  const inFace = (h: number, g: number) => h >= 1 && (g / rx) ** 2 + ((h - 1) / ry) ** 2 <= 1;
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
    paint.push([X, Y, faceTone(g / rx, -(h - 1) / ry, rim, p.deg < 0, false)]);
  }
  for (const [X, Y, k] of paint) layer.set(X, Y, k);
  c.stamp(layer.toGrid(), 0, 0);
}

/** Image de la chute : souche fixe, haut de l'arbre dans la pose donnée, contour, ombres portées. */
function fallFrame(p: Pose, shadows: [number, number, number, number][], off: number): Canvas {
  const c = withStump(new Canvas(FALL_W, FALL_H), off);
  drawFalling(c, p);
  despeckle(c, 'K^');
  shadedOutline(c);
  for (const [x, y, rx, ry] of shadows) groundShadow(c, x, y, rx, ry);
  return c;
}

/** Ce que la pose doit à l'angle : tronc allongé, houppier raccourci et aplati, d'autant plus que l'arbre se couche. */
function stretch(s: number) {
  return {
    ext: Math.round(EXT * s),
    k: 1 - (1 - CROWN_K) * s * s,
    squash: 1 - (1 - SQUASH) * s * s,
  };
}

/** Pose pivotée vers la droite autour de la charnière (bord droit de la coupe), qui reste sur la souche. */
function pivot(deg: number): Pose {
  const s = Math.sin((deg * Math.PI) / 180);
  return { deg, base: cutCentre(deg, HINGE, OFF), ...stretch(s) };
}

/** Pose pivotée vers la gauche autour du bord gauche de la coupe. */
function pivotLeft(deg: number): Pose {
  const s = Math.sin((deg * Math.PI) / 180);
  return { deg: -deg, base: cutCentre(-deg, HINGE_L, OFF_L), ...stretch(s) };
}

const FOOT_X = FOOT[0] + OFF;
const FOOT_XL = FOOT[0] + OFF_L;

/** Ombre du pied à 10° : celle de l'arbre debout et des étapes, pour qu'elle ne saute pas du raccord à 10°. */
const TREE_SHADOW = (fx: number): [number, number, number, number] => [fx + 2, GROUND_Y, 9, 2.4];
/** Ombre de la souche à 45° : celle de `stump()`, que la dernière image pose. */
const STUMP_SHADOW = (fx: number): [number, number, number, number] => [fx + 1.5, GROUND_Y, 6.5, 1.8];

/**
 * Ombres portées : sous la souche, puis sous le haut de l'arbre, projeté au sol du côté où il tombe (décalées vers la
 * droite, comme toutes les ombres). À 45°, l'ombre couvre à peu près ce que couvrira le tronc couché (environ 120 px).
 */
/** Ombre du haut de l'arbre à 10°, de chaque côté : le raccord y mène. */
const SHADE_10: [number, number, number, number] = [FOOT_X + 16, GROUND_Y + 0.5, 18, 3];
const SHADE_10_L: [number, number, number, number] = [FOOT_XL - 10, GROUND_Y + 0.5, 18, 3];
const RIGHT: LeadSide = { w: FALL_W, off: OFF, shade10: SHADE_10, left: false };
const LEFT: LeadSide = { w: FALL_W, off: OFF_L, shade10: SHADE_10_L, left: true };

/**
 * Le raccord depuis la dernière étape de l'abattage (`normal-tree-stage-7`, art/world/felling.ts), 10° et 45° (les copeaux
 * de l'abattage encore au pied), puis l'arbre couché.
 */
const frames = [
  ...leadIn(NORMAL, RIGHT),
  withChips(fallFrame(pivot(10), [TREE_SHADOW(FOOT_X), SHADE_10], OFF), NORMAL, RIGHT),
  withChips(fallFrame(pivot(45), [STUMP_SHADOW(FOOT_X), [FOOT_X + 62, GROUND_Y + 0.5, 50, 3]], OFF), NORMAL, RIGHT),
  lyingFrame(),
];

const framesLeft = [
  ...leadIn(NORMAL, LEFT),
  withChips(fallFrame(pivotLeft(10), [TREE_SHADOW(FOOT_XL), SHADE_10_L], OFF_L), NORMAL, LEFT),
  withChips(fallFrame(pivotLeft(45), [STUMP_SHADOW(FOOT_XL), [FOOT_XL - 56, GROUND_Y + 0.5, 50, 3]], OFF_L), NORMAL, LEFT),
  lyingFrameLeft(),
];

const treeFall: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'normal-tree-fall',
  frameW: FALL_W,
  frameH: FALL_H,
  palette: world,
  animations: {
    fall: { frames: frames.map((f) => f.toGrid()), frameRate: 6, repeat: 0 },
  },
};

const treeFallLeft: SpriteSheetSource = {
  ...treeFall,
  name: 'normal-tree-fall-left',
  animations: {
    fall: { ...treeFall.animations.fall, frames: framesLeft.map((f) => f.toGrid()) },
  },
};

export default [treeFall, treeFallLeft];
