// Têtard (trogne) : un deuxième gros arbre de la sorte `big`, court et touffu.
//
// Debout (`big-pollard`), c'est le dessin d'origine du gros arbre : `treeBody` de big-tree.ts (repère 64x96, pied en
// (33, 89)), tronc de 55 cm (le même que le gros arbre, donc la même souche), tête touffue juste au-dessus de la coupe.
// Il ne se retouche pas.
//
// Couché, il est d'un seul tenant (`big-pollard-felled-tree`, `-left`), comme le gros grand (`felledTree` de
// art/world/big-felled.ts) : un tronc de 2 m (sa longueur utile, une ancienne bille et la tête), au pixel près la pièce de
// bois `big` ronde de 200 cm que le jeu pose quand on a coupé le houppier, et le houppier du gros grand par-dessus, rapproché
// du pied de 2 m (CROWN_SHIFT).
//
// Chutes (`big-pollard-fall`, `big-pollard-fall-left`) : même mécanique que celles du gros arbre (pivot autour de la
// charnière sur la souche, lumière ramenée au nord-ouest), mais tirées de `treeBody`. Première image : `big-pollard`
// posé ; dernière : la souche et l'arbre couché, exactement comme le jeu les pose. Les images sont composées dans la
// frame 160x96, puis recadrées à POLLARD_W colonnes : côté gauche de la frame pour la chute à droite, côté droit pour la
// chute à gauche.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { FOOT, groundShadow, shadedOutline, treeBody } from './big-tree';
import { FALL_H, FALL_W, OFF, OFF_L, type Faller, crownRows, fallFrame, felledImages, felledTree, lyingFrame, pivot, pivotLeft } from './big-felled';

/** Le têtard debout, 64x96 : image `big-pollard` (le dessin d'origine du gros arbre). */
export function standingPollard(): Canvas {
  const c = shadedOutline(treeBody());
  groundShadow(c, 36, 89.5, 17, 4);
  return c;
}

/** Ce qui tombe : le haut de `treeBody`, coupé à la rangée 76 (comme le gros arbre, rangées du repère 64x96). */
const POLLARD: Faller = { body: treeBody, cut: 76, crown: crownRows(treeBody()) };

/** Longueur utile du têtard (cm). */
export const POLLARD_CM = 200;
/** Décalage du houppier couché du têtard par rapport à celui du gros arbre : 2 m de tronc de moins (40 px). */
export const CROWN_SHIFT = -40;
/** Le têtard couché. */
export const POLLARD_FELLED = felledTree(POLLARD_CM, CROWN_SHIFT, 'big-pollard-felled-tree');

/** Largeur des images des chutes du têtard (recadrées dans la frame de 160) : tout l'arbre couché et son ombre. */
const POLLARD_W = 126;
/** Première colonne de la frame de 160 gardée par la chute à gauche. */
const LEFT_FROM = FALL_W - POLLARD_W;

/** Recadre une image de la frame (160 de large) aux colonnes [from, from + POLLARD_W), en vérifiant que rien n'est coupé. */
function crop(c: Canvas, from: number, what: string): Canvas {
  const out = new Canvas(POLLARD_W, c.h);
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    const p = c.get(X, Y);
    if (p === EMPTY) continue;
    if (X < from || X >= from + POLLARD_W) throw new Error(`big-pollard : ${what} déborde du cadre de ${POLLARD_W} px en (${X}, ${Y})`);
    out.px[Y][X - from] = p;
  }
  return out;
}

const lying = (left: boolean) => lyingFrame(POLLARD_FELLED, left);

const FOOT_X = FOOT[0] + OFF;
const FOOT_XL = FOOT[0] + OFF_L;
const DY = 0; // les images de la chute ont la hauteur de l'arbre debout : la frame des pièces, sans décalage

const right = [
  new Canvas(FALL_W, FALL_H).stamp(standingPollard().toGrid(), OFF, 0),
  fallFrame(pivot(10, POLLARD, DY), [[FOOT_X + 3, 89.5, 17, 4], [FOOT_X + 9, 90, 16, 3.5]], OFF, POLLARD, FALL_H),
  fallFrame(pivot(45, POLLARD, DY), [[FOOT_X + 3, 89.5, 14, 3.5], [FOOT_X + 30, 90.5, 21, 4]], OFF, POLLARD, FALL_H),
  lying(false),
].map((c, i) => crop(c, 0, `image ${i + 1} de la chute à droite`));

const left = [
  new Canvas(FALL_W, FALL_H).stamp(standingPollard().toGrid(), OFF_L, 0),
  fallFrame(pivotLeft(10, POLLARD, DY), [[FOOT_XL + 3, 89.5, 17, 4], [FOOT_XL - 5, 90, 16, 3.5]], OFF_L, POLLARD, FALL_H),
  fallFrame(pivotLeft(45, POLLARD, DY), [[FOOT_XL + 3, 89.5, 14, 3.5], [FOOT_XL - 24, 90.5, 21, 4]], OFF_L, POLLARD, FALL_H),
  lying(true),
].map((c, i) => crop(c, LEFT_FROM, `image ${i + 1} de la chute à gauche`));

/** Décalages x des planches de chute, pour props.json (repère : coin bas gauche de l'image `big-pollard` posée). */
export const POLLARD_FALL = { x: -OFF, left: { x: -(OFF_L - LEFT_FROM) }, foot: FOOT[0] };

const sheet = (name: string, frames: Canvas[]): SpriteSheetSource => ({
  kind: 'spritesheet',
  name,
  frameW: POLLARD_W,
  frameH: FALL_H,
  palette: world,
  animations: { fall: { frames: frames.map((f) => f.toGrid()), frameRate: 6, repeat: 0 } },
});

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  img('big-pollard', standingPollard()),
  sheet('big-pollard-fall', right),
  sheet('big-pollard-fall-left', left),
  ...felledImages('big-pollard-felled-tree', POLLARD_FELLED),
];
