// Le gros arbre couché (la sorte `big` : tronc de 55 cm), commun au gros grand (`big-felled-tree`) et au têtard
// (`big-pollard-felled-tree`, art/world/big-pollard.ts) : d'un seul tenant, son tronc est, au pixel près, la pièce de bois `big`
// ronde de sa longueur utile (`composeWood`, art/world/wood-pieces.ts) que le jeu pose à sa place quand on a coupé le houppier ;
// son houppier couché est tiré du dessin du têtard debout (`treeBody`), raccourci le long du tronc et aplati en travers.
// Composé dans le cadre de la chute (FALL_W × FALL_H, l'arbre debout posé en OFF), puis recadré. La chute elle-même, commune à
// toutes les sortes, est dans art/world/tree-fall.ts ; ce fichier enregistre le dessin du gros grand (`registerTree`).

import { Canvas, EMPTY } from '../lib/canvas';
import { FOOT, STUMP_AT, type Vec, despeckle, shadedOutline, stump, stumpBody, tallTreeBody, treeBody } from './big-tree';
import { composeWood } from './wood-pieces';
import { registerTree, type LyingArt } from './tree-registry';

// ---------- Cadre ----------

/** Le cadre où l'arbre couché est composé (et celui des images de la chute, art/world/tree-fall.ts). */
const FALL_W = 160;
const FALL_H = 96;
/**
 * Place de l'arbre debout (64 de large) dans le cadre : à gauche (pied en x = OFF + 33) pour laisser au tronc couché, puis au
 * houppier, la place de s'étendre vers la droite.
 */
const OFF = 14;
/** Place de l'arbre debout dans le cadre de la chute à gauche : le miroir de OFF autour du pied. */
const OFF_L = FALL_W - 1 - OFF - 66;

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
interface FelledLayout {
  w: number;
  h: number;
  spawn: Vec;
  bodies: { x: number; y: number; w: number; h: number }[];
  aim: Vec;
  at: Vec;
}

/** La pièce de bois du tronc d'un gros arbre couché de `cm` centimètres. */
const woodOf = (cm: number) => composeWood({ size: 'big', shape: 'round', axis: 'ew', length: cm });

/**
 * Compose un gros arbre couché (sans la souche) dans la frame : la pièce de bois du tronc, le houppier `crown` (déjà décalé
 * de `shift`, avec son contour) par-dessus au-delà de la frontière festonnée, puis son ombre ; `shade` : si donné, l'ombre du
 * houppier ne se pose que sous ces colonnes (le houppier allégé de l'ébranchage).
 */
function composeLying(cm: number, shift: number, left: boolean, crown: Canvas, shade?: Set<number>): Canvas {
  const wood = woodOf(cm);
  const n = wood.w - 1;
  const shadow = (cx: number) => new Canvas(FALL_W, FALL_H).ellipse(cx, 90.5, 21, 3.5, 'x');
  const crownRight = CROWN_X1 + shift;
  const crownLeftEdge = mx(CROWN_X0 + shift);
  {
    const c = new Canvas(FALL_W, FALL_H);
    const wx = left ? FALL_W - WOOD_X - n : WOOD_X;
    const base = new Canvas(FALL_W, FALL_H).stamp(wood.toGrid(), wx, WOOD_Y);
    const stp = stumpIn(left ? OFF_L : OFF);
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
    const sh = left ? shadow(mx(BUTT_X + 81) + 13 - shift) : shadow(BUTT_X + 81 + shift);
    const edge = left ? crownLeftEdge : crownRight;
    for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
      if (c.get(X, Y) !== EMPTY || sh.get(X, Y) === EMPTY || X > edge || stp.get(X, Y) !== EMPTY) continue;
      if (shade && !shade.has(X)) continue;
      c.set(X, Y, 'x');
    }
    return c;
  }
}

/**
 * Compose l'arbre couché d'un tronc de `cm` centimètres, le houppier décalé de `shift` colonnes par rapport à celui du gros
 * grand (le têtard : plus court de 2 m, −40).
 */
function felledTree(cm: number, shift: number, what: string): Felled {
  const wood = woodOf(cm);
  const n = wood.w - 1;
  const right = composeLying(cm, shift, false, shifted(CROWN, shift));
  const left = composeLying(cm, shift, true, shifted(CROWN_L, -shift));

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

// ---------- Arbre couché, houppier allégé (l'ébranchage) ----------
// Les étapes de l'ébranchage (art/world/work-stages.ts) : le même arbre couché, composé de la même façon, mais son houppier
// perd des pixels (`keep`, en distance au pied h et au travers de l'axe g, là où il est posé, dans le sens de droite) ; son
// ombre ne reste que sous les colonnes où il en reste. Le cadre reste celui de l'arbre entier.

/** L'arbre couché d'un tronc de `cm` cm (sans la souche, dans la frame), son houppier réduit aux pixels que `keep` garde. */
function lightenedFelled(cm: number, shift: number, left: boolean, keep: (h: number, g: number) => boolean): Canvas {
  const body = left ? crownBodyLeft() : crownBody();
  // le houppier est décalé de `shift` (à droite) ou de −shift (à gauche) : on le juge là où il sera posé
  const crown = new Canvas(FALL_W, FALL_H);
  const dx = left ? -shift : shift;
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    const q = body.get(X, Y);
    if (q === EMPTY) continue;
    const at = X + dx;
    const [h, g] = lying(left ? mx(at) : at, Y);
    if (keep(h, g)) crown.set(at, Y, q);
  }
  const lone: [number, number][] = [];
  despeckle(crown);
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (crown.get(X, Y) === EMPTY) continue;
    const ns = [crown.get(X + 1, Y), crown.get(X - 1, Y), crown.get(X, Y + 1), crown.get(X, Y - 1)].filter((q) => q !== EMPTY);
    if (ns.length <= 1) lone.push([X, Y]);
  }
  for (const [X, Y] of lone) crown.px[Y][X] = EMPTY;
  shadedOutline(crown);
  const cols = new Set([...Array(FALL_W).keys()].filter((X) => crown.px.some((r) => r[X] !== EMPTY)));
  return composeLying(cm, shift, left, crown, cols);
}

/** Ce que l'ébranchage doit savoir d'un gros arbre couché (repère : la frame des pièces, FALL_W × FALL_H). */
function bigLying(f: Felled, cm: number, shift: number) {
  return {
    w: FALL_W,
    buttX: BUTT_X,
    axisY: AXIS_Y,
    barkTop: TRUNK_TOP,
    barkBottom: TRUNK_TOP + 10,
    trunkLen: f.n - 1,
    frame: (left: boolean): Frame => (left ? f.frameLeft : f.frame),
    compose: (left: boolean, keep: (h: number, g: number) => boolean) => lightenedFelled(cm, shift, left, keep),
  };
}

/** Dernière image d'une chute : la souche, puis l'arbre couché, exactement comme le jeu les pose. */
function lyingFrame(f: Felled, left: boolean): Canvas {
  const c = stumpIn(left ? OFF_L : OFF);
  const t = left ? f.left : f.right;
  // garde-fou : une ombre translucide posée sur un pixel déjà peint donnerait en jeu un mélange que `stamp` ne rend pas
  for (let Y = 0; Y < FALL_H; Y++) for (let X = 0; X < FALL_W; X++) {
    if (t.get(X, Y) === 'x' && c.get(X, Y) !== EMPTY) throw new Error(`big-felled : ombre de l'arbre couché sur la souche en (${X}, ${Y})`);
  }
  return c.stamp(t.toGrid(), 0, 0);
}

/** Le dessin d'un gros arbre couché de `cm` cm, son houppier décalé de `shift` colonnes, pour la chute et le jeu. */
export function bigLyingArt(cm: number, shift: number, what: string): LyingArt {
  const f = felledTree(cm, shift, what);
  return {
    w: FALL_W,
    h: FALL_H,
    off: OFF,
    offLeft: OFF_L,
    scene: (left) => lyingFrame(f, left),
    right: cut(f.right, f.frame),
    left: cut(f.left, f.frameLeft),
    box: f.frame,
    woodAt: f.layout.at,
    limbing: bigLying(f, cm, shift),
  };
}

// Le gros grand : debout dans son grand repère (`tallTreeBody`), il tombe en entier ; couché, le houppier du gros.
registerTree('big-tree', {
  body: tallTreeBody,
  stumpBody,
  stump,
  stumpFoot: [FOOT[0] - STUMP_AT[0], FOOT[1] - STUMP_AT[1]],
  lying: (cm, key) => bigLyingArt(cm, 0, key),
});
