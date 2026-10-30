// Arbre normal couché : pièces du tronc, entailles, bouts coupés et billes de la chaîne, à droite et à gauche.
//
// Même logique que l'arbre couché du gros (art/world/big-felled.ts, section « Arbre couché » et « Chute vers la gauche »),
// à l'échelle du normal (contrat : art/world/normal-geometry.ts) : tronc de 30 cm (6 rangées d'écorce, 8 px contour
// compris), environ 7 m couché (TREE_LEN = 140 px, houppier compris), matière `NORMAL_WOOD` de wood.ts.
//
// Arbre couché vers la droite, du pied à la cime : `normal-felled-section-1..4` (tronc nu, 19 px, 95 cm), puis
// `normal-felled-crown` (5e bille et pointe, sous le houppier). Ébranché, `normal-felled-crown` devient
// `normal-felled-head` (même image, même place : la 5e bille nue, puis la pointe et ses chicots). Chaque pièce est une
// future bille et porte une encoche à son bout droit, sur la jonction avec la suivante, qui se creuse à chaque coup
// (`-n1`, `-n2`) puis se coupe (`-cut-right` ; la voisine passe en `-cut-left`). La bille `normal-felled-log-k` est la
// pièce k coupée aux deux bouts, même image, même place. Vers la gauche (pièces `-left`) : géométrie en miroir exact,
// dessin et lumière refaits en haut à gauche.
//
// Exports pour la chute (normal-fall.ts) : `lyingFrame()`, `lyingFrameLeft()` ; pour props.json : `FELLED_LAYOUT`.
// La bille seule (`normal-felled-log`, `-ns`) est dans normal-logs.ts, les planches de chute dans normal-fall.ts.

import { Canvas, EMPTY } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { type Vec, despeckle, shadedOutline } from './big-tree';
import { NORMAL_WOOD, bark, logEnd } from './wood';
import {
  BUTT_X, CROWN_BOTTOM, CROWN_TOP, DIAMETER, FALL_H, FALL_W, FOOT, LOGS as LOG_COUNT, OFF, OFF_L, PIECE_X, SEC,
  SECTIONS, STUMP_AT, TREE_LEN, TRUNK_BOTTOM, TRUNK_ROW, TRUNK_TOP, TRUNK_X0,
} from './normal-geometry';
import { stump, treeBody } from './normal-tree';

// ---------- Arbre couché vers la droite ----------
// Dessiné d'abord en entier dans le repère de la chute (FALL_W × FALL_H), puis découpé en pièces par colonnes.
// Le tronc et le houppier ont chacun leur contour : sans houppier, le tronc reste contourné ; les pièces partagent le
// contour d'un seul tronc, donc aucune couture aux raccords.

/** Lumière nord-ouest de l'écran ramenée dans le repère de l'arbre couché (tourné de 90° vers la droite). */
const LYING_LIGHT: Vec = [-Math.SQRT1_2, Math.SQRT1_2];
/** Axe du tronc couché : milieu des 6 rangées d'écorce (TRUNK_TOP à TRUNK_TOP + 5). */
const AXIS_Y = TRUNK_TOP + DIAMETER / 2;
/** Centre du tronc couché en hauteur, pour les bouts coupés. */
const LOG_CY = AXIS_Y;
/** Demi-largeur du tronc, jamais écrasée quand on aplatit le houppier. */
const HALF = DIAMETER / 2;
/** Indice de la pièce de tête (houppier, puis tête nue) : la 5e. */
const HEAD = SECTIONS;
/** Jonction au bout droit de chaque pièce (1re colonne de la suivante) ; pour la tête, entre la 5e bille et la pointe. */
const JUNCTION = [...Array(LOG_COUNT).keys()].map((k) => PIECE_X[k] + SEC);
/**
 * Longueur du tronc, du bout scié à la pointe cachée sous le houppier : la 5e bille finit à 94 px du pied, la pointe
 * la prolonge de 26 px (chicots, cime coupée net).
 */
const TRUNK_LEN = 120;
/** Distance au pied où le tronc commence à s'amincir : juste après la 5e bille, qui garde ses 6 rangées. */
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
/** Hauteur de la collision au sol d'une pièce : la profondeur du tronc, 30 cm. */
const BODY_H = DIAMETER;
/** Frontière où le houppier passe par-dessus le tronc (festonnée), une valeur par rangée, du contour du haut à celui du bas. */
const OVER = [131, 132, 131, 130, 131, 132, 131, 130];
const overAt = (y: number) => OVER[y - (TRUNK_TOP - 1)] ?? 0;

if (BUTT_X - 1 + TREE_LEN - 1 > FALL_W - 2) throw new Error('normal-felled : le houppier couché dépasse la frame');

/** Distance au pied (h) et au travers de l'axe (g) d'un pixel de la frame. */
const lying = (X: number, Y: number): Vec => [X + 0.5 - BUTT_X, Y + 0.5 - AXIS_Y];

/**
 * Entaille au bout droit d'une pièce, par profondeur (0 : marquée, 1 : un tiers, 2 : presque à travers). Une rangée par
 * rangée du tronc à partir de TRUNK_TOP, calée à droite sur la dernière colonne avant la jonction.
 * '.' : bois retiré (le contour y descend), ' ' : inchangé. Le flanc de gauche, entaillé en biais, montre le bois frais
 * (clair en haut, plus sombre au fond) ; la colonne de la jonction est le fond de la fente, dans l'ombre.
 * Sur 6 rangées : la fente descend de 2, 3 puis 5 rangées (il ne reste alors que la rangée du bas).
 */
const NOTCH: string[][] = [
  ['..', 'YK'],
  ['...', 'YtK', ' TK'],
  ['....', ' ...', ' YtK', '  TK', '   K'],
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

/**
 * Bout coupé d'un tronc couché (bout commun de art/world/wood.ts, r = 3, ovale de 4 px de large) : coins arrondis ;
 * le bout de gauche, tourné vers la lumière, montre la face de coupe (sur un bout si étroit, des rayures, pas de
 * cerne), celui de droite l'écorce qui s'enroule. `x` : première colonne de bois (bout gauche) ou colonne qui suit la
 * dernière (bout droit).
 */
function sawnEnd(c: Canvas, x: number, side: 'left' | 'right', cy = LOG_CY) {
  logEnd(c, x, side, cy, side === 'left', DIAMETER / 2, NORMAL_WOOD.endA);
}

/** Tronc couché vers la droite, sans bout scié ni chicots : profil d'écorce de l'arbre debout, amincissement vers la cime. */
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

/** Le tronc nu vers la droite, une fois pour toutes : les chicots se calent sur son dessus et son dessous. */
const CORE = trunkCore();
const topOf = (X: number) => CORE.px.findIndex((r) => r[X] !== EMPTY);
const bottomOf = (X: number) => FALL_H - 1 - [...CORE.px].reverse().findIndex((r) => r[X] !== EMPTY);

/**
 * Chicots de la pointe et cime coupée net. `at` place une colonne du tronc couché vers la droite à l'écran (l'identité,
 * ou le miroir pour le tronc couché vers la gauche) : les chicots montent en biais vers la cime, leur flanc du haut
 * reste le plus clair dans les deux sens. À l'échelle d'un tronc de 6 px : moignons de 2 px de large, 2 de haut.
 */
function stubs(c: Canvas, at: (x: number) => number) {
  // deux vers le nord (éclairés), un vers le sud (ombre), posés sur le dessus et le dessous du tronc
  const north = (X0: number, long: boolean) => {
    const t = topOf(X0);
    c.set(at(X0), t - 1, 'M').set(at(X0 + 1), t - 1, 'm');
    if (long) c.set(at(X0 + 1), t - 2, 'M').set(at(X0 + 2), t - 2, 'm');
    const e = long ? 2 : 1;
    c.set(at(X0 + e), t - 1 - e, 'Y').set(at(X0 + e + 1), t - 1 - e, 'Y');
  };
  north(BUTT_X + 99, true);
  north(BUTT_X + 110, false);
  const S = BUTT_X + 104;
  const b = bottomOf(S);
  c.set(at(S), b + 1, 'N').set(at(S + 1), b + 1, 'K').set(at(S + 1), b + 2, 't').set(at(S + 2), b + 2, 't');
  // pointe de la cime, coupée net
  const tip = at(BUTT_X + TRUNK_LEN);
  for (let Y = 0; Y < FALL_H; Y++) if (c.get(tip, Y) !== EMPTY) c.set(tip, Y, 't');
}

/**
 * Tronc couché, sans contour : bout scié au pied. `withStubs` : ébranché, avec les chicots sur la pointe (au-delà de la
 * 5e bille) et la cime coupée net.
 */
function trunkBody(withStubs: boolean): Canvas {
  const c = Canvas.from(CORE.toGrid());
  sawnEnd(c, BUTT_X, 'left');
  if (withStubs) stubs(c, (x) => x);
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
 * colonnes de chaque côté. Rend les deux rangées à part (une pièce coupée les arrête à des colonnes différentes).
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

const TRUNK = shadedOutline(despeckle(trunkBody(false), 'KYTt'));
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

const inRange = (X: number, k: number) => X >= PIECE_X[k] && X < PIECE_X[k + 1];

/** État d'une pièce : bout gauche coupé (la voisine est partie), entaille du bout droit (0 à 2) ou coupé à fond. */
interface State { left?: boolean; right?: number | 'cut' }

/**
 * Tronc de la pièce k dans l'état donné, contour compris. Un bout coupé arrête le bois une colonne avant le bord de la
 * pièce, pour que le contour tienne dans l'image ; la face de coupe est claire à gauche (vers la lumière), l'écorce
 * enroulée à droite. Seule l'entaille du bout droit de la pièce k est dessinée.
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

/** Pièce k (0 à 4) dans la frame entière. `head` : la 5e pièce ébranchée (sinon, avec son houppier). */
function piece(k: number, head = false, st: State = {}): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  const trunk = pieceTrunk(k, head, st);
  const crown = k === HEAD && !head;
  // ombre du tronc : elle commence deux colonnes après un bout coupé à gauche (quatre pour la 2e rangée), et s'arrête
  // à la colonne qui suit un bout coupé à droite
  const bandTo = st.right === 'cut' ? JUNCTION[k] : FALL_W;
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (inRange(X, k)) c.set(X, Y, trunk.get(X, Y));
    if (!crown) continue;
    // houppier : par-dessus le tronc de sa propre pièce au-delà de la frontière festonnée, ailleurs sur le vide
    const f = CROWN.get(X, Y);
    if (f === EMPTY) continue;
    const t = TRUNK.get(X, Y);
    if (t === EMPTY || (X >= PIECE_X[HEAD] && X >= overAt(Y))) c.set(X, Y, f);
  }
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    const r2 = BAND2.get(X, Y) !== EMPTY;
    const band = BAND1.get(X, Y) !== EMPTY || r2;
    const from = st.left ? PIECE_X[k] + (r2 ? 4 : 2) : 0;
    if (inRange(X, k) && X >= from && X <= bandTo && band) c.set(X, Y, 'x');
    else if (crown && !band && CROWN_SHADOW.get(X, Y) !== EMPTY && TRUNK.get(X, Y) === EMPTY) c.set(X, Y, 'x');
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

const PIECE_NAMES = [...[...Array(SECTIONS).keys()].map((k) => `normal-felled-section-${k + 1}`), 'normal-felled-crown'];
const HEAD_NAME = 'normal-felled-head';
const PIECES = [...Array(LOG_COUNT).keys()].map((k) => piece(k));

/**
 * Toutes les images d'une pièce, dans la frame entière : clé -> canevas. La 1re section n'a pas de bout gauche à couper
 * (c'est le bout scié) ; le houppier ne s'entaille pas (on ébranche d'abord).
 */
function variants(k: number, head: boolean): [string, Canvas][] {
  const name = head ? HEAD_NAME : PIECE_NAMES[k];
  if (k === HEAD && !head) return [[name, piece(k)], [`${name}-cut-left`, piece(k, false, { left: true })]];
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

/** Bille k (1 à 5) : la pièce k coupée aux deux bouts ; la 5e est la tête sans sa pointe. */
const LOG_IMAGES: Canvas[] = [...Array(LOG_COUNT).keys()].map((k) => piece(k, k === HEAD, { left: k > 0, right: 'cut' }));

const SETS = [...Array(SECTIONS).keys()].map((k) => variants(k, false));
const CROWN_SET = variants(HEAD, false);
const HEAD_SET = variants(HEAD, true);
/** Cadre de chaque pièce : le houppier, la tête et la 5e bille partagent le même (même image, même place). */
const FRAMES: Frame[] = [
  ...SETS.map((s, k) => bounds([...s.map(([, c]) => c), LOG_IMAGES[k]])),
  bounds([...CROWN_SET, ...HEAD_SET].map(([, c]) => c).concat(LOG_IMAGES[HEAD])),
];

/**
 * Données des pièces, pour props.json : repère = coin bas gauche de l'image `normal-tree` posée sur la carte (x vers la
 * droite, y vers le bas, donc négatif au-dessus). Calculé, jamais recopié à la main. Vers la gauche, tout est le miroir
 * autour du pied : x' = 2 × FOOT[0] − (x + w − 1) = 48 − (x + w − 1) dans le repère de `normal-tree`.
 */
export const FELLED_LAYOUT = (() => {
  const describe = (name: string, f: Frame, k: number, aimed: boolean) => {
    const bottom = f.y + f.h;
    // empreinte au sol du tronc : les BODY_H rangées du bas (contour compris), de son premier à son dernier pixel
    const trunkX0 = PIECE_X[k];
    const trunkX1 = k === HEAD ? BUTT_X + TRUNK_LEN + 1 : JUNCTION[k] - 1;
    return {
      name,
      w: f.w,
      h: f.h,
      /** Coin bas gauche dans le repère de l'arbre. */
      at: [f.x - OFF, bottom - FALL_H] as Vec,
      /** Collision centrée en bas de l'image : toute la largeur, les BODY_H rangées du bas du tronc. */
      body: { w: f.w, h: BODY_H, bottom: bottom - (TRUNK_BOTTOM + 1) },
      /** Collision du tronc seul (pour la tête, pointe comprise), dans l'image (x, y, w, h). */
      trunkRect: { x: trunkX0 - f.x, y: TRUNK_BOTTOM - (BODY_H - 1) - f.y, w: trunkX1 - trunkX0 + 1, h: BODY_H },
      /** Collision de la bille qui naît de cette pièce, dans la même image (x, y, w, h). */
      logRect: { x: PIECE_X[k] - f.x, y: TRUNK_BOTTOM - (BODY_H - 1) - f.y, w: JUNCTION[k] - PIECE_X[k], h: BODY_H },
      /** Encoche visée, dans l'image : le fond de la fente de l'entaille, à chaque profondeur (0, 1, 2). */
      aim: aimed ? NOTCH_DEPTH.map((d) => [JUNCTION[k] - 1 - f.x, TRUNK_TOP + d - 1 - f.y] as Vec) : undefined,
    };
  };
  return {
    pieces: [...Array(SECTIONS).keys()].map((k) => describe(PIECE_NAMES[k], FRAMES[k], k, true)),
    crown: describe('normal-felled-crown', FRAMES[HEAD], HEAD, false),
    head: describe(HEAD_NAME, FRAMES[HEAD], HEAD, true),
  };
})();

/** Dernière image de la chute à droite : la souche et les cinq pièces, exactement comme le jeu les posera. */
export function lyingFrame(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  c.stamp(stump().toGrid(), STUMP_AT[0] + OFF, STUMP_AT[1]);
  for (const p of PIECES) c.stamp(p.toGrid(), 0, 0);
  return c;
}

// ---------- Arbre couché vers la gauche ----------
// Pas un miroir du dessin : seule la géométrie des pièces couchées (silhouettes, encoches, cadres) est le miroir exact
// de celle de droite autour du pied de l'arbre, pour que le jeu en déduise positions et collisions ; le dessin est
// refait avec la lumière en haut à gauche : faces de coupe, entailles, houppier, contour. Une colonne X de la frame de
// droite devient la colonne mx(X) de celle de gauche.

const mx = (X: number) => FALL_W - 1 - X;
if (mx(OFF + FOOT[0]) !== OFF_L + FOOT[0]) throw new Error('normal-felled : OFF_L n\'est pas le miroir de OFF autour du pied');

/** Miroir horizontal d'une image de la frame. */
const flipFrame = (c: Canvas): Canvas => Canvas.from(c.toGrid().map((r) => [...r].reverse().join('')));

/**
 * Entaille au bout gauche d'une pièce couchée à gauche (miroir de NOTCH en forme, calée à gauche sur la première
 * colonne après la jonction). Le flanc en biais regarde ici le haut à gauche, vers la lumière : bois frais plus clair
 * que dans l'entaille de droite. La colonne de la jonction reste le fond de la fente, dans l'ombre.
 */
const NOTCH_L: string[][] = [
  ['..', 'KY'],
  ['...', 'KtY', 'Kt '],
  ['....', '... ', 'KtYY', 'KtY ', 'K   '],
];
NOTCH_L.forEach((p, d) => {
  const ref = NOTCH[d];
  const same = p.length === ref.length && p.every((row, r) =>
    row.length === ref[r].length && [...row].every((ch, i) => (ch === '.') === (ref[r][row.length - 1 - i] === '.')));
  if (!same) throw new Error(`normal-felled : l'entaille gauche ${d} n'est pas le miroir de l'entaille droite`);
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
  const c = flipFrame(CORE);
  sawnEnd(c, FALL_W - BUTT_X, 'right');
  if (withStubs) stubs(c, mx);
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

const TRUNK_L = shadedOutline(despeckle(trunkBodyLeft(false), 'KYTt'));
const CROWN_L = shadedOutline(crownBodyLeft());
const [BAND1_L, BAND2_L] = trunkShadow(TRUNK_L);
/** Colonne la plus à droite du houppier couché à gauche (son ombre ne déborde pas de son image). */
const CROWN_L_RIGHT = mx(CROWN_EXT.x0);
const CROWN_SHADOW_L = crownShadow(mx((CROWN_EXT.x0 + CROWN_EXT.x1) / 2) + 4);

/** Pièce k couchée à gauche : X de la frame de gauche, dans la pièce k (miroir de inRange). */
const inRangeL = (X: number, k: number) => inRange(mx(X), k);
/**
 * Souche posée dans la frame de gauche. L'ombre d'une pièce ne se pose jamais sur elle : dans la frame, `stamp`
 * remplacerait le pixel de la souche par l'ombre, alors qu'en jeu l'ombre translucide se fond avec la souche.
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

/** Pièce k (0 à 4) couchée à gauche, dans la frame entière. */
function pieceLeft(k: number, head = false, st: State = {}): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  const trunk = pieceTrunkLeft(k, head, st);
  const crown = k === HEAD && !head;
  // ombre du tronc : décalée vers la droite, elle commence deux colonnes après un bout coupé à gauche à l'écran
  // (quatre pour la 2e rangée) et s'arrête au contour d'un bout coupé à droite
  const bandTo = st.left ? mx(PIECE_X[k]) : FALL_W;
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (inRangeL(X, k)) c.set(X, Y, trunk.get(X, Y));
    if (!crown) continue;
    const f = CROWN_L.get(X, Y);
    if (f === EMPTY) continue;
    const t = TRUNK_L.get(X, Y);
    if (t === EMPTY || (mx(X) >= PIECE_X[HEAD] && mx(X) >= overAt(Y))) c.set(X, Y, f);
  }
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    if (STUMP_L.get(X, Y) !== EMPTY) continue;
    const r2 = BAND2_L.get(X, Y) !== EMPTY;
    const band = BAND1_L.get(X, Y) !== EMPTY || r2;
    const from = st.right === 'cut' ? FALL_W - JUNCTION[k] + (r2 ? 4 : 2) : 0;
    if (inRangeL(X, k) && X >= from && X <= bandTo && band) c.set(X, Y, 'x');
    else if (crown && !band && X <= CROWN_L_RIGHT && CROWN_SHADOW_L.get(X, Y) !== EMPTY && TRUNK_L.get(X, Y) === EMPTY) c.set(X, Y, 'x');
  }
  return c;
}

/** Variantes d'une pièce couchée à gauche : la clé de la pièce, puis `-left`, puis le suffixe d'état. */
function variantsLeft(k: number, head: boolean): [string, Canvas][] {
  const base = head ? HEAD_NAME : PIECE_NAMES[k];
  return variants(k, head).map(([name]): [string, Canvas] => {
    const suffix = name.slice(base.length);
    const left = suffix.startsWith('-cut-left');
    const right = suffix.endsWith('-n1') ? 1 : suffix.endsWith('-n2') ? 2 : suffix === '-cut-right' ? 'cut' : undefined;
    return [`${base}-left${suffix}`, pieceLeft(k, head, { left, right })];
  });
}

const SETS_L = [...Array(SECTIONS).keys()].map((k) => variantsLeft(k, false));
const CROWN_SET_L = variantsLeft(HEAD, false);
const HEAD_SET_L = variantsLeft(HEAD, true);
const LOGS_L: Canvas[] = [...Array(LOG_COUNT).keys()].map((k) => pieceLeft(k, k === HEAD, { left: k > 0, right: 'cut' }));
/** Cadres de gauche : miroirs exacts des cadres de droite (même taille, même y). */
const FRAMES_L: Frame[] = FRAMES.map((f) => ({ ...f, x: FALL_W - f.x - f.w }));

// Garde-fou : chaque image de gauche tient dans son cadre et a la silhouette exacte, retournée, de son image de droite
// (ombre portée mise à part : elle reste décalée vers la droite) ; chaque image de droite tient dans le sien.
{
  type Pair = [string, Canvas, Canvas, Frame, Frame];
  const solid = (c: Canvas, X: number, Y: number) => c.get(X, Y) !== EMPTY && c.get(X, Y) !== 'x';
  const pairs: Pair[] = [
    ...SETS.flatMap((s, k) => s.map(([n, c], i): Pair => [n, c, SETS_L[k][i][1], FRAMES[k], FRAMES_L[k]])),
    ...[...CROWN_SET, ...HEAD_SET].map(([n, c], i): Pair => [n, c, [...CROWN_SET_L, ...HEAD_SET_L][i][1], FRAMES[HEAD], FRAMES_L[HEAD]]),
    ...LOG_IMAGES.map((c, k): Pair => [`normal-felled-log-${k + 1}`, c, LOGS_L[k], FRAMES[k], FRAMES_L[k]]),
  ];
  const outside = (f: Frame, X: number, Y: number) => X < f.x || X >= f.x + f.w || Y < f.y || Y >= f.y + f.h;
  for (const [name, r, l, fr, fl] of pairs) {
    for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
      if (solid(l, X, Y) !== solid(r, mx(X), Y)) throw new Error(`normal-felled : ${name}-left n'est pas le miroir de ${name} en (${X}, ${Y})`);
      if (l.get(X, Y) !== EMPTY && outside(fl, X, Y)) throw new Error(`normal-felled : ${name}-left déborde de son cadre en (${X}, ${Y})`);
      if (r.get(X, Y) !== EMPTY && outside(fr, X, Y)) throw new Error(`normal-felled : ${name} déborde de son cadre en (${X}, ${Y})`);
    }
  }
}

/** Dernière image de la chute à gauche : la souche et les cinq pièces couchées à gauche, posées comme par le jeu. */
export function lyingFrameLeft(): Canvas {
  const c = new Canvas(FALL_W, FALL_H);
  c.stamp(stump().toGrid(), STUMP_AT[0] + OFF_L, STUMP_AT[1]);
  const pieces = [...SETS_L.map((s) => s[0][1]), CROWN_SET_L[0][1]];
  // garde-fou : une ombre translucide posée sur un pixel déjà peint donnerait en jeu un mélange que `stamp` ne rend pas
  for (const p of pieces) for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const under = c.get(X, Y);
    if (p.get(X, Y) === 'x' && under !== EMPTY && under !== 'x') throw new Error(`normal-felled : ombre d'une pièce gauche sur un pixel peint en (${X}, ${Y})`);
  }
  for (const p of pieces) c.stamp(p.toGrid(), 0, 0);
  return c;
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

export default [
  ...SETS.flatMap((s, k) => s.map(([name, c]) => img(name, cut(c, FRAMES[k])))),
  ...[...CROWN_SET, ...HEAD_SET].map(([name, c]) => img(name, cut(c, FRAMES[HEAD]))),
  ...LOG_IMAGES.map((c, k) => img(`normal-felled-log-${k + 1}`, cut(c, FRAMES[k]))),
  ...SETS_L.flatMap((s, k) => s.map(([name, c]) => img(name, cut(c, FRAMES_L[k])))),
  ...[...CROWN_SET_L, ...HEAD_SET_L].map(([name, c]) => img(name, cut(c, FRAMES_L[HEAD]))),
  ...LOGS_L.map((c, k) => img(`normal-felled-log-${k + 1}-left`, cut(c, FRAMES_L[k]))),
];
