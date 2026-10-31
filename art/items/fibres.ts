// Les fibres du chantier « briques » : la gerbe de paille longue (`straw`), la botte de chaume (`thatch-bundle`) et la
// baguette de clayonnage (`wattle-rod`). Pour chacune : ses quatre vues au sol (couchée, vues `four`, règle D de
// docs/STYLE.md section 8), son icône 16 × 16 et sa planche tenue (`held-*`, art/items/carried.ts).
//
// Gabarit (5 cm par pixel, silhouette contour compris, ombre exclue) :
// - gerbe, 120 cm × Ø 20 : cylindre couché est-ouest, 24 × (4 × 1,12 = 4,5) : dessinée 24 × 5 ; nord-sud 5 × 24.
// - botte, 120 cm × Ø 30 : 24 × (6 × 1,12 = 6,7) : dessinée 24 × 7 ; nord-sud 7 × 24.
// - baguette, 200 cm × Ø 2,5 : 40 × 0,6 : dessinée 40 × 2 (une rangée d'écorce et l'OUTLINE dessous, sans contour du haut :
//   une épaisseur de moins d'un pixel) ; nord-sud 2 × 40.
//
// Matières : chaume Y t T P (la paille), le lien de la gerbe en paille tordue (T P) ; la botte, plus dorée et plus
// régulière (Y dominant, fils droits), deux liens serrés qui la pincent ; la baguette, écorce de noisetier brun-gris
// lisse (A B Q, le bois grisé), le biseau du gros bout en bois clair (U). Contour : P (la teinte la plus sombre du chaume)
// ou Q côté lumière, OUTLINE en bas et à droite ; ombre `x` décalée au sud-est.
//
// Choix (Grégoire dort, tranché au plus réaliste) :
// - Gerbe : le pied coupé net à l'ouest dans la vue de base, les épis à l'est ; chaque vue tourne d'un quart de tour dans le
//   sens des aiguilles d'une montre (-r1 : pied au nord, épis au sud ; -r2 : épis à l'ouest ; -r3 : pied au sud). On voit
//   la face des tiges coupées quand elle regarde l'ouest ou le sud (côté spectateur et lumière), comme le bout d'une bille.
// - Botte : même convention, le pied coupé plat à l'ouest, la pointe effilée à l'est.
// - Baguette : le gros bout coupé en biseau à l'ouest, le bout fin à l'est ; « à peine courbe » ne se voit pas sur une
//   rangée de 2 px sans dépasser le gabarit : elle se lit droite au sol, sa courbe se voit en main.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { BRANCH_FIST, fistGap, sheet } from './carried';
import { darkest, outline } from './lib';
import { lyingView } from './lying';

type View = 'down' | 'up' | 'right';
/** Sens au sol : la base (pied à l'ouest), puis un quart de tour de plus dans le sens des aiguilles d'une montre. */
type Turn = 0 | 1 | 2 | 3;

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: world, grid });

/** Contour côté lumière : la teinte la plus sombre de chaque matière. */
const DARK = darkest({ Y: 'P', t: 'P', T: 'P', P: 'P', U: 'P', u: 'P', A: 'Q', B: 'Q', Q: 'Q' }, 'P');

/** Petit hachage déterministe, pour les tirets des brins. */
const hash = (a: number, b: number) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 997;

/**
 * Une botte de paille dans son repère : `a` le long (0 au pied, len - 1 au bout des épis ou à la pointe), `j` en travers
 * (0 côté lumière, dia - 1 côté ombre). Renvoie la matière du pixel ou null (vide). `face` : la face des tiges coupées
 * au pied se voit (pied à l'ouest ou au sud) ; `shadeFace` : elle regarde l'est, dans l'ombre (une colonne sombre).
 */
type Painter = (a: number, j: number, face: boolean, shadeFace: boolean) => string | null;

/** Pose un dessin de repère (a, j) dans une grille, selon le sens au sol. */
function laid(len: number, dia: number, turn: Turn, paint: Painter): Grid {
  const crosswise = turn % 2 === 1;
  const w = crosswise ? dia : len, h = crosswise ? len : dia;
  const c = new Canvas(w, h);
  const face = turn === 0 || turn === 3; // pied à l'ouest ou au sud : sa face vers nous
  const shadeFace = turn === 2; // pied à l'est : la face dans l'ombre, de biais
  for (let a = 0; a < len; a++) for (let j = 0; j < dia; j++) {
    const k = paint(a, j, face, shadeFace);
    if (!k) continue;
    // 0 : pied à l'ouest ; 1 : pied au nord ; 2 : pied à l'est ; 3 : pied au sud. Lumière toujours au nord-ouest.
    if (turn === 0) c.set(a, j, k);
    else if (turn === 1) c.set(j, a, k);
    else if (turn === 2) c.set(len - 1 - a, j, k);
    else c.set(j, len - 1 - a, k);
  }
  return c.toGrid();
}

// ---------- Gerbe de paille ----------
// Paille de seigle gardée longue pour le chaume, liée en son milieu d'un lien de paille tordue. Une gerbe, pas une botte :
// elle s'évase vers les épis. Au pied (3 couloirs de brins), les tiges coupées net (des points clairs et sombres : les
// tiges creuses) ; le lien, deux colonnes de paille tordue (P T), la pince ; puis les épis s'ouvrent sur un couloir de plus
// (4), bruns (T) à grains clairs (Y), barbes sombres (P) aux bouts inégaux. Les brins en long, ternes : t dominant, Y côté
// lumière, T côté ombre, des tirets d'une autre teinte çà et là (la gerbe est moins dorée et moins régulière que la botte).

const STRAW_LEN = 22; // intérieur ; 24 avec le contour
const STRAW_DIA = 4; // intérieur aux épis ; 3 couloirs au pied (silhouette 24 × 6 aux épis, 5 au pied)
const STRAW_TIE = 9; // première colonne du lien, depuis le pied
const STRAW_EARS = 14; // début des épis, depuis le pied
/** Bout de chaque couloir d'épis (inégaux), du côté lumière au côté ombre. */
const STRAW_END = [19, 21, 20, 18];

function strawTone(a: number, j: number): string {
  const base = j === 1 ? 'Y' : j === 2 ? 't' : 'T';
  const h = hash(a >> 1, j * 7 + 3);
  // des brins d'une autre teinte, par tronçons de 2 px : la paille d'une gerbe n'est pas peignée
  if (h % 4 === 0) return j === 1 ? 't' : j === 2 ? 'Y' : 'P';
  if (h % 4 === 1 && j === 2) return 'T';
  return base;
}

const strawPaint: Painter = (a, j, face, shadeFace) => {
  // les épis : un couloir de plus côté lumière (la gerbe s'évase), bouts inégaux, grains clairs sur fond brun
  if (a >= STRAW_EARS) {
    const end = STRAW_END[j];
    if (a > end) return null;
    if (j === 0 && a < STRAW_EARS + 2) return null; // l'évasement commence après le lien
    if (a === end) return 'P'; // les barbes
    return (a + 2 * j) % 3 === 0 ? 'Y' : j === 3 ? 'P' : 'T';
  }
  if (j === 0) return null;
  // le lien : deux colonnes de paille tordue, en biais ; il pince le haut de la gerbe
  if (a === STRAW_TIE || a === STRAW_TIE + 1) {
    if (j === 1) return null;
    return (a + j) % 2 === 0 ? 'P' : 'T';
  }
  // le pied coupé net : sa face (deux colonnes, l'ovale du bout), ou un liseré sombre quand elle est dans l'ombre
  if (face && a <= 1) {
    if (a === 0 && j !== 2) return null; // les coins de l'ovale
    return (a + j) % 2 === 0 ? 'Y' : 'P';
  }
  if (shadeFace && a === 0) return j === 1 ? 't' : 'P';
  return strawTone(a, j);
};

const strawInner = (turn: Turn) => laid(STRAW_LEN, STRAW_DIA, turn, strawPaint);

// ---------- Botte de chaume ----------
// Des gerbes peignées, sans brins courts ni épis, serrées en deux liens : un faisceau régulier, doré. Le pied coupé plat (la
// face des tiges : un ovale de 2 × 5, points clairs et sombres en quinconce), la pointe effilée (les couloirs du bord
// s'arrêtent les premiers). Les brins en long, droits et continus d'un bout à l'autre : des couloirs alternés Y t Y t T, la
// paille peignée qui luit. Deux liens serrés (une colonne P) qui la pincent dessus et dessous.

const THATCH_LEN = 22;
const THATCH_DIA = 5;
const THATCH_TIES = [6, 13];
/** Où chaque couloir de brins s'arrête vers la pointe (les bords d'abord) : la pointe effilée. */
const THATCH_END = [16, 19, 21, 19, 16];

const thatchPaint: Painter = (a, j, face, shadeFace) => {
  if (a > THATCH_END[j]) return null;
  const edge = j === 0 || j === THATCH_DIA - 1;
  if (THATCH_TIES.includes(a)) return edge ? null : j === 1 ? 'T' : 'P'; // serré : le faisceau pincé
  if (face && a <= 1) {
    // la face du pied coupé : ovale, tiges en quinconce
    if (a === 0 && edge) return null;
    return (a + j) % 2 === 0 ? (j <= 2 ? 'Y' : 't') : j >= 3 ? 'P' : 'T';
  }
  if (shadeFace && a === 0) return j <= 1 ? 't' : 'T';
  // la pointe : le bout des brins un cran plus sombre
  if (a === THATCH_END[j]) return j <= 1 ? 't' : 'T';
  return ['Y', 't', 'Y', 't', 'T'][j];
};

const thatchInner = (turn: Turn) => laid(THATCH_LEN, THATCH_DIA, turn, thatchPaint);

// ---------- Baguette de clayonnage ----------
// Rejet de noisetier de 2 m, Ø 2,5 cm : une rangée d'écorce (A, des nœuds B), le gros bout plus épais sur 6 px (l'écorce
// et son ombre Q sur deux rangées), coupé en biseau (U, le bois clair) ; vers le bout fin, l'écorce s'assombrit (B). Sous
// la rangée d'écorce, l'OUTLINE ; pas de contour du haut (moins d'un pixel d'épaisseur réelle). Ombre au sud-est.

const ROD_LEN = 40;
const ROD_BUTT = 6;

/** La baguette dans son repère : `a` depuis le gros bout ; rangée 0 (écorce) ou 1 (ombre et contour). */
function rodAt(a: number, row: 0 | 1): string | null {
  if (row === 0) {
    if (a === 0) return 'U'; // le biseau
    if (a === ROD_LEN - 1) return 'Q';
    if (a > ROD_LEN - 8) return 'B';
    return a % 9 === 4 ? 'B' : 'A';
  }
  if (a < ROD_BUTT) return a === 0 ? 'u' : 'Q';
  return a === ROD_LEN - 1 ? null : 'o';
}

/** Une vue au sol de la baguette (écorce, ombre ou contour, et l'ombre portée au sud-est). */
function rodGround(turn: Turn): Grid {
  const crosswise = turn % 2 === 1;
  const w = crosswise ? 2 : ROD_LEN, h = crosswise ? ROD_LEN : 2;
  const c = new Canvas(w + 1, h + 1);
  for (let a = 0; a < ROD_LEN; a++) for (const row of [0, 1] as const) {
    const k = rodAt(a, row);
    if (!k) continue;
    const along = turn === 0 || turn === 1 ? a : ROD_LEN - 1 - a;
    if (crosswise) c.set(row, along, k);
    else c.set(along, row, k);
  }
  // le biseau dans la lumière quel que soit le sens ; au bout est ou sud, son flanc d'ombre devient le contour
  if (turn === 2) c.set(ROD_LEN - 1, 1, 'o');
  if (turn === 3) c.set(1, ROD_LEN - 1, 'o');
  const body = Canvas.from(c.toGrid());
  for (let y = 1; y < c.h; y++) for (let x = 1; x < c.w; x++) {
    if (c.get(x, y) === EMPTY && body.get(x - 1, y - 1) !== EMPTY) c.set(x, y, 'x');
  }
  return c.toGrid();
}

// ---------- Icônes ----------
// En diagonale, du bas à gauche (le pied, le gros bout) au haut à droite, sans ombre (le jeu l'ajoute).

// La gerbe et la botte en icône se couchent est-ouest, comme le fagot (art/world/faggot.ts) : en diagonale, sur 16 px, la
// gerbe et la botte se confondaient en un fuseau ; en long, on lit le pied, le lien et les épis.

/** La gerbe : le pied coupé à gauche (3 rangées), le lien qui la pince, les épis qui s'ouvrent en éventail à droite. */
const STRAW_ICON: Grid = [
  '..........P.P.',
  '........TYTTYP',
  '.YYtYYt.tYTYTT',
  'YtYttYtPYtTYTP',
  'PtTtTtTPTTPTT.',
  '.........TPT.P',
];

/** La botte : le pied coupé plat à gauche, deux liens serrés, les brins peignés en couloirs, la pointe effilée à droite. */
const THATCH_ICON: Grid = [
  '.YYY.YYYY.Y...',
  'YtttTttttTttt.',
  'PYYYPYYYYPYYYY',
  'tPtTPtttTPtttt',
  'PtttPttttPttT.',
  '.TTT.TTTT.T...',
];

function strawIcon(): Canvas {
  return outline(new Canvas(16, 16).stamp(STRAW_ICON, 1, 5), DARK);
}

function thatchIcon(): Canvas {
  return outline(new Canvas(16, 16).stamp(THATCH_ICON, 1, 5), DARK);
}

function rodIcon(): Canvas {
  const c = new Canvas(16, 16);
  // une baguette de 15 px en diagonale, à peine courbée (le milieu un pixel plus haut), gros bout en bas à gauche
  const pts: [number, number][] = [];
  for (let i = 0; i <= 13; i++) {
    const bow = i >= 4 && i <= 9 ? 1 : 0;
    pts.push([1 + i, 14 - i - bow]);
  }
  pts.forEach(([x, y], i) => c.set(x, y, i === 0 ? 'U' : i < 4 ? 'A' : i > 11 ? 'B' : i % 5 === 2 ? 'B' : 'A'));
  // le gros bout plus épais
  c.set(2, 14, 'B').set(3, 13, 'B');
  return outline(c, DARK);
}

// ---------- Tenues ----------

const STRAW_HELD = 29;
const SC = Math.floor(STRAW_HELD / 2);

/**
 * La gerbe tenue par le lien, à une main (posture `hand`) : elle pend en travers du poing.
 * - De profil : en long, couchée, les épis vers l'avant (à droite) qui retombent d'un pixel, le pied derrière ; le lien
 *   dans le poing. Toute sa longueur (24 px) et son épaisseur (5 px), comme au sol.
 * - De face : par le bout, les épis vers nous (en bas), raccourcie : le dessus qui fuit vers le haut, le lien sous le
 *   poing. De dos : le pied coupé vers nous.
 */
function heldStrawView(view: View): Grid {
  const c = new Canvas(STRAW_HELD, STRAW_HELD);
  if (view === 'right') {
    // la vue au sol de base (pied à l'ouest), sans contour : le lien (colonnes 10-11 de l'intérieur) dans le poing
    const g = strawInner(0);
    const ox = SC - STRAW_TIE, oy = SC - 2;
    g.forEach((row, y) => [...row].forEach((k, x) => {
      if (k === EMPTY) return;
      // les épis retombent : un pixel plus bas sur les quatre derniers
      const drop = x >= STRAW_LEN - 5 ? 1 : 0;
      c.set(ox + x, oy + y + drop, k);
    }));
    outline(c, DARK);
    return fistGap(c.toGrid(), SC, BRANCH_FIST);
  }
  // par le bout : 4 colonnes de large, 9 rangées (le fond en haut, le bout proche en bas), le lien sur la rangée du poing
  const near = view === 'down' ? 'ears' : 'butt';
  const x0 = SC - 1, top = SC - 4, bottom = SC + 4;
  for (let y = top; y <= bottom; y++) for (let i = 0; i < 4; i++) {
    const x = x0 + i;
    const fromNear = bottom - y; // 0 : le bout proche
    if (y === top && (i === 0 || i === 3)) continue; // le rond du fond
    let k: string;
    if (y === SC || y === SC - 1) k = (i + y) % 2 === 0 ? 'P' : 'T'; // le lien, sous le poing
    else if (fromNear <= 2) {
      if (near === 'ears') {
        // les épis : grains et bouts inégaux
        if (fromNear === 0 && i % 2 === 1) continue;
        k = (i + y) % 2 === 0 ? 'T' : i === 3 ? 't' : 'Y';
      } else {
        if (fromNear === 0 && (i === 0 || i === 3)) continue;
        k = (i + y) % 2 === 0 ? 'Y' : 'P'; // les tiges coupées
      }
    } else k = ['Y', 't', 't', 'T'][i];
    c.set(x, y, k);
  }
  outline(c, DARK);
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), SC, BRANCH_FIST);
}

const THATCH_HELD = 29;
const TC = Math.floor(THATCH_HELD / 2);

/**
 * La botte portée à deux mains devant lui (posture `carry`, comme le fagot). De face et de dos, en long : la botte
 * est-ouest sans ombre, son milieu sur la prise. De profil, par le bout : la face du pied coupé (6 × 5, en quinconce)
 * sous les mains, le dessus de la botte qui fuit derrière, un lien en travers.
 */
function thatchLengthwise(): Grid {
  const body = lyingView(thatchInner(0), DARK, false).slice(0, -1); // sans la rangée d'ombre
  const c = new Canvas(THATCH_HELD, THATCH_HELD);
  c.stamp(body, TC - Math.floor(body[0].length / 2), TC - Math.floor(body.length / 2));
  return c.toGrid();
}

function thatchEnd(): Grid {
  const c = new Canvas(THATCH_HELD, THATCH_HELD);
  const x0 = TC - 2, w = 6;
  const back = TC - 5, faceTop = TC - 1, bottom = TC + 3;
  for (let y = back; y <= bottom; y++) for (let i = 0; i < w; i++) {
    const x = x0 + i;
    const corner = i === 0 || i === w - 1;
    if ((y === back || y === bottom) && corner) continue;
    let k: string;
    if (y >= faceTop) k = (i + 2 * y) % 3 === 0 ? (i >= 3 ? 'P' : 'T') : ['Y', 'Y', 't', 't', 'T', 'T'][i]; // la face du pied, tiges creuses çà et là
    else if (y === back + 2) k = corner ? EMPTY : i <= 2 ? 'T' : 'P'; // le lien, serré
    else k = ['Y', 'Y', 'Y', 't', 't', 'T'][i];
    if (k !== EMPTY) c.set(x, y, k);
  }
  return outline(c, DARK).toGrid();
}

const ROD_HELD = 45;
const RC = Math.floor(ROD_HELD / 2);

/**
 * La baguette tenue en son milieu (posture `hand`), inclinée, l'avant vers le sol.
 * - De profil : toute sa longueur (40 px), 18 px de chaque côté du poing, descendant d'un pixel tous les deux vers
 *   l'avant (à droite), le gros bout derrière ; une rangée d'écorce, l'OUTLINE dessous ; elle plie à peine (le bout fin
 *   retombe d'un pixel de plus).
 * - De face : elle vient vers nous en descendant : on la voit presque debout, raccourcie (19 px), le bout fin en bas, sous la hanche.
 *   De dos, le gros bout vers nous, en bas, caché en partie par le corps.
 */
function heldRodView(view: View): Grid {
  const c = new Canvas(ROD_HELD, ROD_HELD);
  if (view === 'right') {
    for (let i = -19; i <= 19; i++) {
      const x = RC + i;
      const sag = i > 12 ? 1 : 0;
      const y = RC + Math.floor(i / 2.2) + sag;
      const a = i + 19; // depuis le gros bout (à gauche)
      const k = rodAt(Math.round((a * (ROD_LEN - 1)) / 38), 0)!;
      c.set(x, y, k);
    }
  } else {
    // presque debout, le poing au milieu ; le bout fin en bas (de face), le gros bout en bas (de dos)
    for (let i = -11; i <= 7; i++) {
      const y = RC + i;
      const x = RC;
      const fromButt = view === 'up' ? 7 - i : i + 11;
      c.set(x, y, fromButt === 0 ? 'U' : fromButt > 14 ? 'B' : 'A');
    }
  }
  // l'ombre de la baguette : l'OUTLINE à droite et dessous, pas de contour côté lumière (moins d'un pixel)
  const add: [number, number][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== EMPTY) continue;
    if (view === 'right' ? c.get(x, y - 1) !== EMPTY : c.get(x - 1, y) !== EMPTY) add.push([x, y]);
  }
  for (const [x, y] of add) c.set(x, y, 'o');
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), RC, BRANCH_FIST);
}

const held = (name: string, size: number, f: (v: View) => Grid): SpriteSheetSource =>
  sheet(name, size, world, { down: f('down'), up: f('up'), right: f('right') });

const TURNS: Turn[] = [0, 1, 2, 3];
const suffix = (t: Turn) => (t === 0 ? '' : `-r${t}`);

const sources = [
  ...TURNS.map((t) => img(`straw-ground${suffix(t)}`, lyingView(strawInner(t), DARK, t % 2 === 1))),
  held('held-straw', STRAW_HELD, heldStrawView),
  ...TURNS.map((t) => img(`thatch-bundle-ground${suffix(t)}`, lyingView(thatchInner(t), DARK, t % 2 === 1))),
  img('item-thatch-bundle', thatchIcon().toGrid()),
  sheet('held-thatch-bundle', THATCH_HELD, world, { down: thatchLengthwise(), up: thatchLengthwise(), right: thatchEnd() }),
  ...TURNS.map((t) => img(`wattle-rod-ground${suffix(t)}`, rodGround(t))),
  img('item-wattle-rod', rodIcon().toGrid()),
  held('held-wattle-rod', ROD_HELD, heldRodView),
];

/** L'icône de la gerbe, reprise par art/items/resources.ts (`item-straw`). */
export const strawIconCanvas = strawIcon;

export default sources;
