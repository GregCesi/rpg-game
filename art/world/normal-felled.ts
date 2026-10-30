// Arbre normal couché : `normal-felled-tree` (vers la droite) et `normal-felled-tree-left` (vers la gauche), d'un seul
// tenant, tronc et houppier.
//
// Même logique que l'arbre couché du gros (art/world/big-felled.ts, section « Arbre couché » et « Chute vers la gauche »),
// à l'échelle du normal (contrat : art/world/normal-geometry.ts) : tronc de 30 cm (6 rangées d'écorce, 8 px contour
// compris), environ 7 m couché (TREE_LEN = 140 px, houppier compris), matière `NORMAL_WOOD` de wood.ts.
//
// L'arbre couché n'a plus de sections : ébranché, il devient une seule pièce de bois ronde de 580 cm (`composeWood`,
// art/world/wood-pieces.ts, contrat src/world/woodShape.ts) posée sur son tronc, qu'on coupe ensuite où l'on veut. Il ne porte donc aucune entaille.
// Vers la gauche : géométrie en miroir exact autour du pied, dessin et lumière refaits en haut à gauche.
//
// Exports : pour la chute (normal-fall.ts), `lyingFrame()` et `lyingFrameLeft()` (la souche et l'arbre couché, dernière
// image de chaque chute) ; pour props.json et le jeu, `FELLED_TREE` (taille, place, collisions, place du rondin).

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { type Vec, despeckle, shadedOutline } from './big-tree';
import { NORMAL_WOOD, bark, logEnd } from './wood';
import {
  BUTT_X, CROWN_BOTTOM, CROWN_OVER_X, CROWN_TOP, DIAMETER, FALL_H, FALL_W, FOOT, OFF, OFF_L, STUMP_AT, TREE_LEN,
  TRUNK_BOTTOM, TRUNK_ROW, TRUNK_TOP, TRUNK_X0,
} from './normal-geometry';
import { stump, treeBody } from './normal-tree';

// ---------- Arbre couché vers la droite ----------
// Dessiné en entier dans le repère de la chute (FALL_W × FALL_H). Le tronc et le houppier ont chacun leur contour.

/** Lumière nord-ouest de l'écran ramenée dans le repère de l'arbre couché (tourné de 90° vers la droite). */
const LYING_LIGHT: Vec = [-Math.SQRT1_2, Math.SQRT1_2];
/** Axe du tronc couché : milieu des 6 rangées d'écorce (TRUNK_TOP à TRUNK_TOP + 5). */
const AXIS_Y = TRUNK_TOP + DIAMETER / 2;
/** Centre du tronc couché en hauteur, pour les bouts coupés. */
const LOG_CY = AXIS_Y;
/** Demi-largeur du tronc, jamais écrasée quand on aplatit le houppier. */
const HALF = DIAMETER / 2;
/** Longueur du tronc, du bout scié à la pointe cachée sous le houppier (120 px, 6 m). */
const TRUNK_LEN = 120;
/** Distance au pied où le tronc commence à s'amincir : il garde ses 6 rangées sur les 4,8 premiers mètres ; au-delà, la pièce de 5,8 m passe sous le houppier. */
const TAPER_FROM = 96;
/**
 * Le houppier commence à F0 px du pied et finit à CROWN_END (le haut de l'arbre, centre de son dernier pixel). Du
 * contour du bout scié (colonne BUTT_X − 1) au contour du bout du houppier, l'arbre couché fait TREE_LEN = 140 px.
 */
const F0 = 55;
const CROWN_END = TREE_LEN - 3;
/**
 * Demi-hauteur maximale du houppier couché à l'écran, de part et d'autre de l'axe : il doit tenir, contour et ombre
 * compris, au-dessus du bas de la frame (FALL_H).
 */
const CROWN_HALF_MAX = 9.5;
/** Rangée de profil du tronc debout (colonnes d'écorce TRUNK_X0 à TRUNK_X0 + 5). */
const PROFILE_X0 = TRUNK_X0;
/** Hauteur de la collision au sol du tronc : sa profondeur, 30 cm. */
const BODY_H = DIAMETER;
/** Frontière où le houppier passe par-dessus le tronc (festonnée), une valeur par rangée, du contour du haut à celui du bas. */
const OVER = [131, 132, 131, 130, 131, 132, 131, 130];
const overAt = (y: number) => OVER[y - (TRUNK_TOP - 1)] ?? 0;

if (BUTT_X - 1 + TREE_LEN - 1 > FALL_W - 2) throw new Error('normal-felled : le houppier couché dépasse la frame');

/** Distance au pied (h) et au travers de l'axe (g) d'un pixel de la frame. */
const lying = (X: number, Y: number): Vec => [X + 0.5 - BUTT_X, Y + 0.5 - AXIS_Y];

/**
 * Bout coupé d'un tronc couché (bout commun de art/world/wood.ts, r = 3, ovale de 4 px de large) : coins arrondis ;
 * le bout de gauche, tourné vers la lumière, montre la face de coupe (sur un bout si étroit, des rayures, pas de
 * cerne), celui de droite l'écorce qui s'enroule. `x` : première colonne de bois (bout gauche) ou colonne qui suit la
 * dernière (bout droit).
 */
function sawnEnd(c: Canvas, x: number, side: 'left' | 'right', cy = LOG_CY) {
  logEnd(c, x, side, cy, side === 'left', DIAMETER / 2, NORMAL_WOOD.endA);
}

/** Tronc couché vers la droite, sans bout scié : profil d'écorce de l'arbre debout, amincissement vers la cime. */
function trunkCore(): Canvas {
  const profile = treeBody(LYING_LIGHT).px[TRUNK_ROW];
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = lying(X, Y);
    if (h < 0 || h > TRUNK_LEN) continue;
    const s = h <= TAPER_FROM ? 1 : 1 - (0.55 * (h - TAPER_FROM)) / (TRUNK_LEN - TAPER_FROM);
    const i = Math.floor(FOOT[0] + g / s);
    if (profile[i] && profile[i] !== EMPTY) c.set(X, Y, bark(X - BUTT_X, (i - PROFILE_X0 + 0.5) / DIAMETER, NORMAL_WOOD));
  }
  return c;
}

/** Le tronc nu vers la droite, une fois pour toutes. */
const CORE = trunkCore();

/** Tronc couché, sans contour : bout scié au pied. */
function trunkBody(): Canvas {
  const c = Canvas.from(CORE.toGrid());
  sawnEnd(c, BUTT_X, 'left');
  return c;
}

/** Plus grand écart au pied d'un pixel de feuillage de l'arbre debout : la demi-largeur du houppier. */
function crownHalfWidth(): number {
  const body = treeBody(LYING_LIGHT);
  let m = HALF;
  for (let y = CROWN_TOP; y <= CROWN_BOTTOM; y++) for (let x = 0; x < body.w; x++) {
    if ('jLlk'.includes(body.get(x, y))) m = Math.max(m, Math.abs(x + 0.5 - FOOT[0]));
  }
  return m;
}
/**
 * Écrasement du houppier en travers du tronc : vu de dessus, il s'aplatit au sol (0,4 comme le gros), davantage
 * si l'arbre debout est assez large pour que le houppier couché sorte de la frame.
 */
const SQUASH = Math.min(0.4, (CROWN_HALF_MAX - HALF) / Math.max(1, crownHalfWidth() - HALF));
const inv = (g: number) => (Math.abs(g) <= HALF ? g : Math.sign(g) * (HALF + (Math.abs(g) - HALF) / SQUASH));
/** Première rangée de feuillage de l'arbre debout (le haut réel du houppier, à partir de CROWN_TOP). */
const CROWN_TOP_ROW = (() => {
  const body = treeBody(LYING_LIGHT);
  for (let y = CROWN_TOP; y <= CROWN_BOTTOM; y++) if (body.px[y].some((q) => 'jLlk'.includes(q))) return y;
  return CROWN_TOP;
})();
/**
 * Raccourci du houppier le long du tronc : les rangées CROWN_TOP_ROW..CROWN_BOTTOM de l'arbre (le bas de la rangée
 * CROWN_BOTTOM au haut de la rangée du sommet) sur F0..CROWN_END.
 */
const CROWN_K = (CROWN_END + 0.5 - F0) / (CROWN_BOTTOM + 1 - CROWN_TOP_ROW);
const crownSource = (h: number, g: number): Vec => [Math.floor(FOOT[0] + inv(g)), Math.floor(CROWN_BOTTOM + 1 - (h - F0) / CROWN_K)];

/** Houppier couché, sans contour : les masses de feuillage de l'arbre, raccourcies le long du tronc, aplaties en travers. */
function crownBody(): Canvas {
  const body = treeBody(LYING_LIGHT);
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = lying(X, Y);
    if (h < F0 || h > CROWN_END + 0.5) continue;
    const [sx, sy] = crownSource(h, g);
    const q = body.get(sx, sy);
    if ('jLlk'.includes(q)) c.set(X, Y, q);
  }
  return despeckle(c);
}

/**
 * Ombre au sol sous un tronc contourné : une bande décalée vers la droite qui suit le dessous du tronc (elle remonte
 * sous la pointe amincie). Rangée 1 de la 3e colonne à une colonne après le bout ; rangée 2 en retrait de deux
 * colonnes de chaque côté. Rend les deux rangées à part.
 */
function trunkShadow(trunk: Canvas): [Canvas, Canvas] {
  const cols = [...Array(FALL_W).keys()].filter((X) => trunk.px.some((r) => r[X] !== EMPTY));
  const first = cols[0];
  const last = cols[cols.length - 1];
  const bottom = (X: number) => FALL_H - 1 - [...trunk.px].reverse().findIndex((r) => r[X] !== EMPTY);
  const r1 = new Canvas(FALL_W, FALL_H);
  const r2 = new Canvas(FALL_W, FALL_H);
  for (let X = first + 2; X <= last + 1; X++) {
    const b = bottom(Math.min(X - 1, last));
    if (trunk.get(X, b + 1) === EMPTY) r1.set(X, b + 1, 'x');
  }
  for (let X = first + 4; X <= last - 1; X++) {
    const b = bottom(X - 2);
    if (trunk.get(X, b + 2) === EMPTY && r1.get(X, b + 2) === EMPTY) r2.set(X, b + 2, 'x');
  }
  return [r1, r2];
}

const TRUNK = shadedOutline(despeckle(trunkBody(), 'KYTt'));
const CROWN = shadedOutline(crownBody());
const [BAND1, BAND2] = trunkShadow(TRUNK);

/** Colonnes et rangées du houppier couché (contour compris). */
function extent(c: Canvas) {
  let x0 = FALL_W, x1 = -1, y1 = -1;
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (c.get(X, Y) === EMPTY) continue;
    x0 = Math.min(x0, X); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
  }
  return { x0, x1, y1 };
}
const CROWN_EXT = extent(CROWN);
if (CROWN_EXT.y1 > FALL_H - 3) throw new Error(`normal-felled : le houppier couché descend trop bas (rangée ${CROWN_EXT.y1})`);
if (CROWN_EXT.x1 > FALL_W - 2) throw new Error(`normal-felled : le houppier couché dépasse à droite (colonne ${CROWN_EXT.x1})`);
/** Ombre du houppier : un ovale aplati sous son bord du bas, décalé vers la droite. */
const crownShadow = (cx: number) => new Canvas(FALL_W, FALL_H).ellipse(cx, CROWN_EXT.y1 + 0.5, (CROWN_EXT.x1 - CROWN_EXT.x0) / 2 - 4, 2.5, 'x');
const CROWN_SHADOW = crownShadow((CROWN_EXT.x0 + CROWN_EXT.x1) / 2 + 4);

/** Première colonne du tronc couché (le contour du bout scié). */
const TRUNK_X = BUTT_X - 1;

/**
 * L'arbre couché vers la droite, sans la souche, dans la frame de la chute : le tronc ; le houppier par-dessus le tronc
 * au-delà de la frontière festonnée (à partir de CROWN_OVER_X), ailleurs sur le vide ; l'ombre du tronc (deux rangées
 * décalées vers la droite) puis celle du houppier.
 */
function lyingTree(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const t = TRUNK.get(X, Y);
    if (X >= TRUNK_X) c.set(X, Y, t);
    const f = CROWN.get(X, Y);
    if (f !== EMPTY && (t === EMPTY || (X >= CROWN_OVER_X && X >= overAt(Y)))) c.set(X, Y, f);
  }
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    const band = BAND1.get(X, Y) !== EMPTY || BAND2.get(X, Y) !== EMPTY;
    if (band && X >= TRUNK_X) c.set(X, Y, 'x');
    else if (!band && CROWN_SHADOW.get(X, Y) !== EMPTY && TRUNK.get(X, Y) === EMPTY) c.set(X, Y, 'x');
  }
  return c;
}

interface Frame { x: number; y: number; w: number; h: number }

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

const LYING = lyingTree();

/** Dernière image de la chute à droite : la souche et l'arbre couché, exactement comme le jeu les posera. */
export function lyingFrame(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  c.stamp(stump().toGrid(), STUMP_AT[0] + OFF, STUMP_AT[1]);
  c.stamp(LYING.toGrid(), 0, 0);
  return c;
}

// ---------- Arbre couché vers la gauche ----------
// Pas un miroir du dessin : seule la géométrie de l'arbre couché (silhouette, cadre) est le miroir exact de celle de
// droite autour du pied de l'arbre, pour que le jeu en déduise positions et collisions ; le dessin est refait avec la
// lumière en haut à gauche : face de coupe, houppier, contour. Une colonne X de la frame de
// droite devient la colonne mx(X) de celle de gauche.

const mx = (X: number) => FALL_W - 1 - X;
if (mx(OFF + FOOT[0]) !== OFF_L + FOOT[0]) throw new Error('normal-felled : OFF_L n\'est pas le miroir de OFF autour du pied');

/** Miroir horizontal d'une image de la frame. */
const flipFrame = (c: Canvas): Canvas => Canvas.from(c.toGrid().map((r) => [...r].reverse().join('')));

/** Tronc couché vers la gauche, sans contour : bout scié au pied à droite (dans l'ombre). */
function trunkBodyLeft(): Canvas {
  const c = flipFrame(CORE);
  sawnEnd(c, FALL_W - BUTT_X, 'right');
  return c;
}

/**
 * Houppier couché vers la gauche, sans contour : mêmes pixels de l'arbre que le houppier de droite, en miroir
 * (silhouette identique retournée), mais éclairés pour ce sens : le miroir envoie le haut de l'écran sur la gauche de
 * l'arbre et la gauche de l'écran vers sa cime, la lumière nord-ouest y redevient celle de l'arbre debout.
 */
function crownBodyLeft(): Canvas {
  const lit = treeBody();
  const ref = treeBody(LYING_LIGHT);
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const [h, g] = lying(mx(X), Y);
    if (h < F0 || h > CROWN_END + 0.5) continue;
    const [sx, sy] = crownSource(h, g);
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

const TRUNK_L = shadedOutline(despeckle(trunkBodyLeft(), 'KYTt'));
const CROWN_L = shadedOutline(crownBodyLeft());
const [BAND1_L, BAND2_L] = trunkShadow(TRUNK_L);
/** Colonne la plus à droite du houppier couché à gauche (son ombre ne déborde pas de son image). */
const CROWN_L_RIGHT = mx(CROWN_EXT.x0);
const CROWN_SHADOW_L = crownShadow(mx((CROWN_EXT.x0 + CROWN_EXT.x1) / 2) + 4);

/**
 * Souche posée dans la frame de gauche. L'ombre de l'arbre ne se pose jamais sur elle : dans la frame, `stamp`
 * remplacerait le pixel de la souche par l'ombre, alors qu'en jeu l'ombre translucide se fond avec la souche.
 */
const STUMP_L = new Canvas(FALL_W, FALL_H).stamp(stump().toGrid(), STUMP_AT[0] + OFF_L, STUMP_AT[1]);

/** L'arbre couché vers la gauche, sans la souche : le miroir de `lyingTree` en géométrie, éclairé pour ce sens. */
function lyingTreeLeft(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const t = TRUNK_L.get(X, Y);
    if (mx(X) >= TRUNK_X) c.set(X, Y, t);
    const f = CROWN_L.get(X, Y);
    if (f !== EMPTY && (t === EMPTY || (mx(X) >= CROWN_OVER_X && mx(X) >= overAt(Y)))) c.set(X, Y, f);
  }
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (c.get(X, Y) !== EMPTY || STUMP_L.get(X, Y) !== EMPTY) continue;
    const band = BAND1_L.get(X, Y) !== EMPTY || BAND2_L.get(X, Y) !== EMPTY;
    if (band && mx(X) >= TRUNK_X) c.set(X, Y, 'x');
    else if (!band && X <= CROWN_L_RIGHT && CROWN_SHADOW_L.get(X, Y) !== EMPTY && TRUNK_L.get(X, Y) === EMPTY) c.set(X, Y, 'x');
  }
  return c;
}

const LYING_L = lyingTreeLeft();

// Garde-fou : l'arbre couché à gauche a la silhouette exacte, retournée, de celui de droite (ombre portée mise à part :
// elle reste décalée vers la droite).
{
  const solid = (c: Canvas, X: number, Y: number) => c.get(X, Y) !== EMPTY && c.get(X, Y) !== 'x';
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (solid(LYING_L, X, Y) !== solid(LYING, mx(X), Y)) throw new Error(`normal-felled : l'arbre couché à gauche n'est pas le miroir de celui de droite en (${X}, ${Y})`);
  }
}

/** Dernière image de la chute à gauche : la souche et l'arbre couché à gauche, posés comme par le jeu. */
export function lyingFrameLeft(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  c.stamp(stump().toGrid(), STUMP_AT[0] + OFF_L, STUMP_AT[1]);
  c.stamp(LYING_L.toGrid(), 0, 0);
  return c;
}

// ---------- Arbre couché entier ----------
// `normal-felled-tree` et `normal-felled-tree-left` : l'arbre couché d'un seul tenant (tronc et houppier), pixel pour
// pixel la dernière image de `normal-tree-fall` (`-left`) sans la souche (objet à part, `normal-tree-stump`), recadrée
// sur ses pixels peints. Ébranché, il laisse une pièce de bois ronde de 580 cm (art/world/wood-pieces.ts) posée sur son tronc, bout scié sur
// bout scié : le rondin n'a pas de version gauche, sa face de coupe est toujours à gauche (à gauche, elle tombe donc
// côté cime, et son bout droit sur le bout scié).

/** L'arbre couché, sans la souche, dans la frame de la chute ; et son cadre. */
function wholeTree(left: boolean): { c: Canvas; f: Frame } {
  const c = left ? LYING_L : LYING;
  return { c, f: bounds(c) };
}

/** Longueur du rondin né de l'arbre ébranché (cm) et sa longueur en pixels, contour compris. */
const TIMBER_CM = 580;
const TIMBER_N = TIMBER_CM / 5;

/**
 * Géométrie de l'arbre couché entier, pour props.json et le jeu. Repère de `at` : coin bas gauche de l'image
 * `normal-tree` posée sur la carte (x vers la droite, y vers le bas : négatif au-dessus) ; le coin
 * bas gauche d'une image est (sa colonne de gauche, la rangée qui suit sa dernière). Dans l'image : `butt`, colonne du
 * contour du bout scié ; `top`, rangée du contour du haut du tronc ; `bodies`, collisions (x, y, w, h) du tronc et du
 * houppier ; `log`, décalage [dx, dy] du coin bas gauche du rondin est-ouest de 580 cm (image 117 × 10, rangées 0 à 7 le
 * corps) par rapport au coin bas gauche de l'image, pour qu'il recouvre le tronc.
 */
export const FELLED_TREE = (() => {
  const describe = (left: boolean) => {
    const { f } = wholeTree(left);
    const X = (x: number) => (left ? mx(x) : x);
    const buttFrame = X(BUTT_X - 1);
    const tipFrame = X(BUTT_X + TRUNK_LEN + 1);
    const top = TRUNK_TOP - 1 - f.y;
    const trunkY = TRUNK_BOTTOM - (BODY_H - 1) - f.y;
    const crownX0 = left ? mx(CROWN_EXT.x1) : CROWN_EXT.x0;
    const crownX1 = left ? mx(CROWN_EXT.x0) : CROWN_EXT.x1;
    // rondin : à droite, son contour gauche sur le contour du bout scié ; à gauche, son dernier pixel de corps (n − 1)
    const logX = left ? buttFrame - (TIMBER_N - 1) : buttFrame;
    return {
      w: f.w,
      h: f.h,
      at: [f.x - (left ? OFF_L : OFF), f.y + f.h - FALL_H] as Vec,
      butt: buttFrame - f.x,
      top,
      bodies: [
        { x: Math.min(buttFrame, tipFrame) - f.x, y: trunkY, w: Math.abs(tipFrame - buttFrame) + 1, h: BODY_H },
        { x: crownX0 + 3 - f.x, y: AXIS_Y - 6 - f.y, w: crownX1 - crownX0 - 5, h: CROWN_EXT.y1 - 1 - (AXIS_Y - 6) },
      ],
      log: [logX - f.x, TRUNK_TOP - 1 + 10 - (f.y + f.h)] as Vec,
    };
  };
  return { right: describe(false), left: describe(true) };
})();

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  ...[false, true].map((left) => {
    const { c, f } = wholeTree(left);
    return img(left ? 'normal-felled-tree-left' : 'normal-felled-tree', cut(c, f));
  }),
];
