// Cinquième essai du sanglier (chantier « sangliers », hors jeu) : le profil validé par Grégoire, B+C (l'avant de B, l'arrière
// de C, art/proposals/sanglier-profil-bc.ts) avec la joue grise, la croupe baissée d'une rangée de plus, étendu à la face, au dos,
// à toutes les animations, à la mort et à l'objet mort au sol. Base : art/proposals/sanglier-c.ts (copié ici, pas importé, pour
// que les essais précédents restent intacts).
// Planches : npx tsx tools/essai-sangliers-bc.ts (.art-preview/sangliers-bc-*.png).
//
// Gabarit (docs/STYLE.md, section 8 ; 140 × 40 × 80 cm, boîte, 5 cm par pixel), silhouette contour compris, ombre exclue :
//   - de profil : L × (H + D/2) = 28 × (16 + 4) = 28 × 20 px (zones 26 × 18) ;
//   - de face et de dos : 12 × 30 px, ÉCART VOULU PAR GRÉGOIRE au gabarit 8 × 30 (W × (H + L/2) = 8 × (16 + 14)), POUR
//     L'AFFICHAGE SEULEMENT : la crinière et les soies donnent le volume ; le corps physique (collision, masse) reste de 40 cm
//     de large. À reporter dans la future fiche (docs/objets/) et dans EXCEPTIONS le jour où le sanglier entre au jeu ;
//   - mort, couché sur le flanc (140 × 80 × 40 : la hauteur devient la profondeur) : 28 × (8 + 16/2) = 28 × 16 ; nord-sud,
//     règle D (rotation pure) : 16 × 28.
//
// Retours de Grégoire sur l'essai C, appliqués ici :
//   - la robe éclaircie (brun-gris, ni roux ni gris souris), pour qu'elle se lise sous la pénombre sans dépendre du liseré ;
//   - le galop de profil : des pattes nettes à chaque image, sans emmêlement sous le ventre, les antérieurs visibles sous la tête
//     baissée, les pattes du fond un ton plus sombres, décalées dans le temps et l'espace ;
//   - la roulade de la mort (image 3) dessinée à part : le dos large qui passe, la crinière au milieu, le ventre clair qui
//     apparaît, une patte qui sort ;
//   - de face et de dos, la mort bascule sur le flanc (vers l'ouest de face, vers l'est de dos) et finit dans la vue couchée
//     nord-sud correspondante.
//
// Méthode : celle de l'essai C. Chaque image est un dessin en zones de matière, éclairé en haut à gauche et contouré par
// art/lib/light.ts, puis son ombre `x`. La vue gauche est le miroir de la droite.
//
// Zones : B robe (côté vu), U dessus du dos (sa teinte claire Q fait le liseré), C soies, crinière, oreille, queue, F robe du côté
// caché, K joue grise, G pattes du côté vu, J pattes du fond, S groin (clair), N narines, H sabots, W défense, E œil, V ventre.

import { Canvas, EMPTY, castShadow, type Grid, type Palette } from '../../lib/canvas';
import { lightUp, type Materials } from '../../lib/light';
import { world } from '../../palette';

/**
 * La robe, éclaircie d'un cran par rapport à l'essai C : un brun-gris tiré de l'écorce (N, m) et de la pierre (z, Z), sans
 * roux ; la lumière, la pointe grise des soies ; l'ombre vers l'humus. Le groin et la joue, plus clairs et plus gris.
 */
export const palette: Palette = {
  Q: '#a8957a', // pointe grise des soies du dos au soleil : le liseré (z mêlé à A)
  q: '#8e7c65', // robe au soleil : m mêlé à z
  r: '#6d5d4c', // robe : N mêlé à z
  s: '#4f4339', // robe à l'ombre : N mêlé à Z, vers l'humus
  t: world['5'], // le plus sombre : soies de la crête, contour côté lumière, sabots
  k: '#aaa392', // joue grise au soleil : r mêlé à z
  l: '#8a8476', // joue grise
  m: '#6c665b', // joue grise à l'ombre
  p: '#bba88d', // groin au soleil : la peau nue, plus claire que la robe
  g: '#9c8b73', // groin, bas des pattes au soleil
  h: '#7a6c5b', // pattes
  i: '#5c4f43', // pattes à l'ombre, pattes du fond
  b: '#b4a286', // ventre (les soies du ventre, clairsemées, plus claires)
  w: world.a, // défenses
  v: world.D, // défense à l'ombre
  e: '#1e1a1d', // l'œil
  d: world.n, // poussière, mottes
  D: world.u, // poussière au soleil
  y: world['9'], // litière soulevée
  o: world.o,
  x: world.x,
};

export const MATS: Materials = {
  B: { light: 'q', base: 'r', shade: 's', dark: 't' },
  U: { light: 'Q', base: 'q', shade: 'r', dark: 't' },
  F: { light: 'r', base: 's', shade: 's', dark: 't' },
  C: { light: 's', base: 't', shade: 't', dark: 't' },
  K: { light: 'k', base: 'l', shade: 'm', dark: 't' },
  G: { light: 'p', base: 'g', shade: 'g', dark: 't' },
  J: { light: 'h', base: 'h', shade: 'i', dark: 't' },
  S: { light: 'p', base: 'g', shade: 'h', dark: 't' },
  N: { light: 'i', base: 'i', shade: 'i', dark: 't' },
  H: { light: 't', base: 't', shade: 't', dark: 't' },
  W: { light: 'w', base: 'w', shade: 'v', dark: 't' },
  E: { light: 'e', base: 'e', shade: 'e', dark: 't' },
  V: { light: 'b', base: 'b', shade: 'g', dark: 't' },
};

export type P = [number, number];
export type Dab = [number, number, string];
export interface Anim { frames: Grid[]; ms: number[]; loop: boolean; note: string }

function trace(pts: P[]): P[] {
  const out: P[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let k = 0; k <= n; k++) {
      const p: P = [Math.round(ax + ((bx - ax) * k) / n), Math.round(ay + ((by - ay) * k) / n)];
      const last = out[out.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
  }
  return out;
}

/** Ajoute des pixels après l'éclairage (poussière, mottes, éclats), là où c'est vide ou ombre. */
export function dab(g: Grid, px: Dab[]): Grid {
  const c = Canvas.from(g);
  for (const [x, y, k] of px) if (c.get(x, y) === EMPTY || c.get(x, y) === 'x') c.set(x, y, k);
  return c.toGrid();
}

/** Ombre à plat : un pixel au sud-est de toute la silhouette (corps couché). */
function flatShadow(g: Grid): Grid {
  const c = Canvas.from(g);
  for (let y = 1; y < g.length; y++) for (let x = 1; x < g[0].length; x++) {
    if (g[y][x] === EMPTY && g[y - 1][x - 1] !== EMPTY && g[y - 1][x - 1] !== 'x' && !'dDy'.includes(g[y - 1][x - 1])) c.set(x, y, 'x');
  }
  return c.toGrid();
}

// =====================================================================================================================
// DE PROFIL (tête à droite ; la gauche est le miroir)
// =====================================================================================================================

export const SIDE = { w: 46, h: 30, ox: 10, oy: 5 } as const;
export const GY = SIDE.oy + 17;
export const FOOT = GY + 1;

/**
 * Le corps B+C, la joue grise (K), la croupe baissée d'une rangée de plus que l'essai 4 : la ligne du dos descend du garrot
 * (rangée 1, la crinière) à la croupe (rangée 6) d'une rangée par une ou deux colonnes (6, 5, 5, 4, 4, 3, 2, 1), sans marche.
 * Sans queue (dessinée selon l'allure) ni œil (ouvert ou fermé).
 */
//                    0         1         2
//                    01234567890123456789012345
export const BODY = [
  '..........CC.CCC.C.C......', // 0  touffes de la crinière, pointe de l'oreille
  '........CCCCCCCCCCBCC.....', // 1  le garrot, la crinière en deux rangées ; l'oreille
  '.......UCCCCCCBBBBBBBB....', // 2
  '......UUUUUBBBBBBBBBBBBB..', // 3  (l'œil en 20)
  '....UUUUBBBBBBBBBBBBBBBBBS', // 4  le haut du groin
  '..UUUBBBBBBBBBBBBBKKKBWBBS', // 5  la joue grise ; la défense
  '.UBBBBBBBBBBBBBBBKKKKWBBBS', // 6  la croupe, au plus bas de la ligne du dos
  '.BBBBBBBBBBBBBBBBBKKKBBB..', // 7
  '.BBBBBBBBBBBBBBBBBBBB.....', // 8  la mâchoire
  '.BBBBBBBBBBBBBBBBBBB......', // 9
  '..BBBBBBBBBBBBBBBBBB......', // 10 le ventre
  '..BBBBB....BBBBBBB........', // 11 le jambon, le poitrail
];
const EYE: P = [20, 3];
/** La queue, selon l'allure : pendante, dressée (la course), en arrière (le choc). */
const TAILS: Record<'down' | 'up' | 'out', P[]> = {
  down: [[0, 7], [0, 8], [0, 9]],
  up: [[0, 6], [0, 5], [0, 4]],
  out: [[0, 7], [0, 6], [1, 5]],
};

export interface Leg { pts: P[]; near: boolean; thigh?: number; /** le canon aussi sur 2 px (le galop : la patte se lit à x2). */ thick?: boolean }

export interface SidePose {
  legs: Leg[];
  head?: number;
  headFrom?: number;
  neck?: number;
  rump?: number;
  dx?: number;
  dy?: number;
  sag?: number;
  tail?: 'down' | 'up' | 'out';
  bristle?: boolean;
  eye?: 'open' | 'closed';
  swell?: [number, number];
  body?: string[];
  air?: number;
  dabs?: Dab[];
}

function warp(p: SidePose): (x: number) => number {
  const head = p.head ?? 0, from = p.headFrom ?? 17, neck = p.neck ?? 0, rump = p.rump ?? 0, sag = p.sag ?? 0;
  return (x: number) => {
    let d = sag;
    if (neck) d += Math.round(neck * Math.min(1, Math.max(0, (x - 8) / 8)));
    if (rump) d -= Math.round(rump * Math.min(1, Math.max(0, (9 - x) / 9)));
    if (head && x >= from) d += Math.round((head * (x - from + 1)) / (26 - from));
    return d;
  };
}

function drawLeg(c: Canvas, l: Leg, ox: number, oy: number, w: (x: number) => number) {
  const n = l.pts.length;
  const pts = l.pts.map(([x, y], i): P => [x, y + Math.round(w(l.pts[0][0]) * (1 - i / (n - 1)))]);
  const px = trace(pts);
  const thigh = l.thigh ?? 2;
  px.forEach(([x, y], i) => {
    const last = i === px.length - 1;
    const z = last ? 'H' : i < thigh ? (l.near ? 'B' : 'F') : l.near ? 'G' : 'J';
    c.set(ox + x, oy + y, z);
    if (l.near && (i < thigh + 1 || last || l.thick)) c.set(ox + x + 1, oy + y, z);
  });
}

function sideZones(p: SidePose): Canvas {
  const c = new Canvas(SIDE.w, SIDE.h);
  const ox = SIDE.ox + (p.dx ?? 0), oy = SIDE.oy + (p.dy ?? 0);
  const w = warp(p);
  const body = p.body ?? BODY;
  for (const l of p.legs.filter((l) => !l.near)) drawLeg(c, l, ox, oy, w);
  body.forEach((row, y) => [...row].forEach((z, x) => { if (z !== EMPTY) c.set(ox + x, oy + y + w(x), z); }));
  if (p.swell) for (let x = p.swell[0]; x <= p.swell[1]; x++) {
    let y = 0;
    while (y < SIDE.h && c.get(ox + x, y) === EMPTY) y++;
    if (y > 0 && y < SIDE.h) c.set(ox + x, y - 1, c.get(ox + x, y) === 'C' ? 'C' : 'U');
  }
  if (p.bristle) {
    for (let x = 9; x <= 18; x++) c.set(ox + x, oy + w(x), 'C');
    for (const x of [10, 12, 13, 15, 16]) c.set(ox + x, oy - 1 + w(x), 'C');
  }
  const tw = w(1);
  for (const [x, y] of TAILS[p.tail ?? 'down']) c.set(ox + x, oy + y + tw, 'C');
  const [ex, ey] = EYE;
  if ((p.eye ?? 'open') === 'open') c.set(ox + ex, oy + ey + w(ex), 'E');
  else { c.set(ox + ex, oy + ey + 1 + w(ex), 'E'); c.set(ox + ex - 1, oy + ey + 1 + w(ex - 1), 'E'); }
  for (const l of p.legs.filter((l) => l.near)) drawLeg(c, l, ox, oy, w);
  return c;
}

function standShadow(g: Grid, air: number, dy: number): Grid {
  const c = Canvas.from(g);
  let a = 1e9, b = -1;
  for (let y = SIDE.oy + 5 + dy; y <= SIDE.oy + 11 + dy; y++) for (let x = 0; x < g[0].length; x++) {
    if (g[y]?.[x] && g[y][x] !== EMPTY) { a = Math.min(a, x); b = Math.max(b, x); }
  }
  for (let x = a + 2 + air; x <= b - air; x++) if (c.get(x, GY + 2) === EMPTY) c.set(x, GY + 2, 'x');
  return c.toGrid();
}

export function side(p: SidePose): Grid {
  const lit = lightUp(sideZones(p).toGrid(), MATS);
  return dab(standShadow(lit, p.air ?? 0, p.dy ?? 0), (p.dabs ?? []).map(([x, y, k]) => [SIDE.ox + (p.dx ?? 0) + x, SIDE.oy + y, k]));
}

function sideLying(p: SidePose): Grid {
  const lit = lightUp(sideZones(p).toGrid(), MATS);
  return dab(flatShadow(lit), (p.dabs ?? []).map(([x, y, k]) => [SIDE.ox + (p.dx ?? 0) + x, SIDE.oy + y, k]));
}

const L = (near: boolean, ...pts: P[]): Leg => ({ pts, near });
/** Une patte du côté vu, épaisse (le galop). */
const T = (...pts: P[]): Leg => ({ pts, near: true, thick: true });
/** Debout, les pattes d'aplomb. */
const STAND: Leg[] = [L(false, [7, 11], [7, 17]), L(false, [12, 11], [12, 17]), L(true, [4, 11], [4, 13], [3, 15], [3, 17]), L(true, [15, 11], [15, 17])];

export const stand = side({ legs: STAND });

const dust = (x: number, y: number, n: number, back = -1): Dab[] => {
  const o: Dab[] = [[x, y, 'D'], [x + back, y, 'd'], [x + back, y - 1, 'D']];
  if (n > 1) o.push([x + 2 * back, y - 1, 'd'], [x + 3 * back, y - 2, 'y'], [x + 2 * back, y - 2, 'D']);
  if (n > 2) o.push([x + 4 * back, y - 1, 'd'], [x + 4 * back, y - 3, 'D'], [x + 3 * back, y - 3, 'd']);
  return o;
};

// ---------------------------------------------------------------- la marche (pas diagonal)

const WALK_LEGS: Leg[][] = [
  [L(false, [7, 11], [8, 14], [9, 17]), L(false, [12, 11], [11, 14], [10, 17]), L(true, [4, 11], [3, 14], [2, 17]), L(true, [15, 11], [16, 14], [17, 17])],
  [L(false, [7, 11], [7, 14], [7, 17]), L(false, [12, 11], [13, 13], [13, 16]), L(true, [4, 11], [5, 13], [5, 16]), L(true, [15, 11], [15, 14], [15, 17])],
  [L(false, [7, 11], [6, 14], [5, 17]), L(false, [12, 11], [13, 14], [14, 17]), L(true, [4, 11], [5, 14], [6, 17]), L(true, [15, 11], [14, 14], [13, 17])],
  [L(false, [7, 11], [8, 13], [8, 16]), L(false, [12, 11], [12, 14], [12, 17]), L(true, [4, 11], [4, 14], [4, 17]), L(true, [15, 11], [16, 13], [16, 16])],
];

// ---------------------------------------------------------------- le galop de la charge

/**
 * Quatre images, chaque patte dans sa bande de colonnes, jamais croisée avec une autre sous le ventre : les pattes du fond (J,
 * plus sombres) suivent celles du côté vu avec un temps de retard et s'écartent d'elles d'au moins trois colonnes.
 *   1 suspension étirée : les postérieurs tendus en arrière, les antérieurs lancés devant, sous la tête baissée ;
 *   2 l'avant se pose : les deux antérieurs au sol (le proche devant), les postérieurs ramenés, pliés, en l'air ;
 *   3 l'arrière se pose sous le ventre, les antérieurs repliés, levés (le genou devant) ;
 *   4 l'arrière pousse : le postérieur proche au sol loin derrière, les antérieurs repartent devant.
 */
const GALLOP: Leg[][] = [
  [L(false, [7, 11], [7, 14], [5, 16]), L(false, [12, 11], [13, 14], [12, 16]), T( [4, 11], [2, 13], [0, 15]), T( [15, 11], [18, 13], [21, 14])],
  [L(false, [7, 11], [9, 12], [10, 14]), L(false, [12, 11], [12, 14], [13, 17]), T( [4, 11], [5, 13], [3, 15]), T( [15, 11], [17, 14], [17, 17])],
  [L(false, [7, 11], [10, 14], [11, 17]), L(false, [12, 11], [15, 13], [14, 15]), T( [4, 11], [6, 14], [7, 17]), T( [15, 11], [18, 13], [18, 15])],
  [L(false, [7, 11], [6, 14], [5, 16]), L(false, [12, 11], [14, 14], [15, 16]), T( [4, 11], [3, 14], [1, 17]), T( [15, 11], [18, 12], [20, 13])],
];

// =====================================================================================================================
// DE FACE ET DE DOS (12 × 30 : écart voulu au gabarit 8 × 30, affichage seulement)
// =====================================================================================================================

/** Frame de face et de dos : 26 × 46 ; la colonne 0 des zones en X ; la rangée 27 des zones (les sabots) sur gy. */
export const FRONT = { w: 26, h: 46, ox: 8, gy: 38 } as const;
export const FFOOT = FRONT.gy + 1;
/** Largeur des zones de face et de dos (12 px contour compris). */
const FW = 10;

// De face : la croupe au loin (en haut), le dos vu du ciel en raccourci qui s'élargit vers l'écu, la crinière qui monte en
// touffes jusqu'au garrot et déborde de chaque côté (le volume) ; les épaules dans l'ombre, de part et d'autre de la tête.
//                  0123456789
const FACE_BODY = [
  '...UUUU...', // 0  la croupe, au loin
  '..UUUUUU..', // 1
  '.UUUUUUUU.', // 2
  '.UUUCCUUU.', // 3  la crinière : une arête au milieu du dos
  'UUUUCCUUUU', // 4
  'UUUUCCUUUU', // 5
  'UUUUCCUUUU', // 6
  'CUUCCCCUUC', // 7  les soies débordent de chaque côté
  'CCUCCCCUCC', // 8
  'FCCCCCCCCF', // 9  le garrot, juste au-dessus de la tête
  'FFFFFFFFFF', // 10 les épaules, dans l'ombre, de part et d'autre de la tête
  'FFFFFFFFFF', // 11
  'FFFFFFFFFF', // 12
  'FFFFFFFFFF', // 13
  'FFFFFFFFFF', // 14
  'FFFFFFFFFF', // 15
  'FFFFFFFFFF', // 16
  'FFFFFFFFFF', // 17
  'FFFFFFFFFF', // 18
  'FBBBBBBBBF', // 19 le poitrail
  'FBBBBBBBBF', // 20
  '.FBBBBBBF.', // 21
  '..BBBBBB..', // 22
];
// La tête en coin, plus étroite que les épaules (qui la détachent, sombres, de chaque côté) : large aux joues grises, qui se
// resserre vers le groin ; les oreilles dressées aux coins, les défenses qui sortent de la babine et remontent.
const FACE_HEAD = [
  'C........C', // 0  la pointe des oreilles
  '.CBBBBBBC.', // 1  les oreilles, le front
  '.BBBBBBBB.', // 2
  '.BEBBBBEB.', // 3  les yeux
  'KKBBBBBBKK', // 4  les joues grises, au plus large
  'KKKBBBBKKK', // 5
  '.KKSSSSKK.', // 6  le haut du groin
  'W.KSSSSK.W', // 7  les défenses remontent
  '.WSNSSNSW.', // 8  les narines
  '..SSSSSS..', // 9
];
const FACE_HEAD_Y = 10;

// De dos : plus de bouteille. La tête au loin (les oreilles), la crinière en touffes au garrot qui déborde, les épaules larges,
// le dos qui se resserre à peine, la croupe ronde devant (les jambons, la fente, la queue).
const BACK_BODY = [
  '..........', // 0
  '..........', // 1
  'C.CC.CC.C.', // 2  les touffes de la crinière
  'CCCCCCCCCC', // 3  le garrot, la crinière déborde
  'UUUCCCCUUU', // 4  les épaules, au plus large
  'UUUUCCUUUU', // 5
  'UUUUCCUUUU', // 6
  'UUUUCCUUUU', // 7
  'UUUUCCUUUU', // 8  l'arête du dos descend jusqu'à la croupe
  '.UUUUCUUU.', // 9  le rein, à peine plus étroit
  '.UUUUUUUU.', // 10
  'UUUUUUUUUU', // 11 la croupe s'arrondit
  'UBBBBBBBBU', // 12 l'arête où le dos tourne en croupe
  'BBBBBBBBBB', // 13
  'BBBBBBBBBB', // 14
  'BBBBBBBBBB', // 15
  'BBBBBBBBBB', // 16
  'BBBBBBBBBB', // 17
  'BBBBBBBBBB', // 18
  'BBBBFFBBBB', // 19 la fente entre les jambons, sous la queue
  '.BBBFFBBB.', // 20
  '..BBFFBB..', // 21
  '...BFFB...', // 22
];
const BACK_HEAD = [
  'C........C', // les oreilles, au loin
  'CCBBBBBBCC',
  '.BBBBBBBB.',
  '..BBBBBB..',
];

export interface FrontPose {
  hd?: number; hx?: number;
  up?: number;
  ll?: number; rl?: number;
  splay?: number;
  dx?: number; dy?: number;
  bristle?: boolean;
  eye?: 'open' | 'closed';
  lie?: boolean; breath?: boolean;
  rump?: number;
  air?: number;
  /** penché sur le côté (la mort) : px de décalage en haut de l'image, vers l'est (+) ou l'ouest (−) ; les pattes partent à l'opposé. */
  lean?: number;
  dabs?: Dab[];
}

const LEG_X: [number, number] = [1, FW - 2];

function frontLegs(c: Canvas, X: number, Y: number, p: FrontPose, hind: boolean) {
  const s = p.splay ?? 0;
  const up = p.up ?? 0;
  const lean = p.lean ?? 0;
  const leg = (x: number, lift: number, out: number) => {
    const top = 23 - up - (hind ? (p.rump ?? 0) : 0), foot = 27 - lift - (hind ? (p.rump ?? 0) : 0);
    for (let y = top; y <= foot; y++) {
      const t = (y - top) / Math.max(1, foot - top);
      const xx = x + Math.round(out * t) + Math.round(lean * 0.3 * (1 - t));
      c.set(X + xx, Y + y, y === foot ? 'H' : y <= top + 1 ? 'F' : 'G');
    }
  };
  leg(LEG_X[0], p.ll ?? 0, -s - (lean > 0 ? Math.round(lean / 2) : 0));
  leg(LEG_X[1], p.rl ?? 0, s - (lean < 0 ? Math.round(lean / 2) : 0));
}

/** Le décalage d'une rangée penchée : rien au sol (rangée 27), `lean` en haut. */
const leanAt = (lean: number, y: number) => Math.round((lean * Math.max(0, 27 - y)) / 27);

/** Les zones de face : le corps (`head` faux) ou la tête seule (`head` vrai), éclairés à part pour que la tête se détache. */
function frontZones(p: FrontPose, head = false): Canvas {
  const c = new Canvas(FRONT.w, FRONT.h);
  const X = FRONT.ox + (p.dx ?? 0);
  const lie = p.lie ? 5 : 0;
  const Y = FRONT.gy - 27 + (p.dy ?? 0);
  const up = p.up ?? 0;
  const lean = p.lean ?? 0;
  if (!p.lie && !head) frontLegs(c, X, Y, p, false);
  const by = Y - up + lie;
  const put = (x: number, y: number, z: string) => c.set(X + x + leanAt(lean, y), by + y, z);
  const hx = p.hx ?? 0, hd = p.hd ?? 0;
  const hy = FACE_HEAD_Y + hd;
  if (head) {
    FACE_HEAD.forEach((r, y) => [...r].forEach((z, x) => { if (z !== EMPTY) put(hx + x, hy + y, z); }));
    if (p.eye === 'closed') { put(hx + 2, hy + 3, 'B'); put(hx + 7, hy + 3, 'B'); put(hx + 2, hy + 4, 'E'); put(hx + 7, hy + 4, 'E'); }
    return c;
  }
  FACE_BODY.forEach((r, y) => [...r].forEach((z, x) => { if (z !== EMPTY) put(x, y, z); }));
  if (p.breath) [...FACE_BODY[0]].forEach((z, x) => { if (z !== EMPTY) put(x, -1, z); });
  if (p.bristle) {
    for (const [x, y] of [[3, 2], [6, 2], [2, 3], [7, 3], [1, 6], [8, 6], [4, 1], [5, 1], [0, 7], [9, 7]] as P[]) put(x, y, 'C');
  }
  return c;
}

function backZones(p: FrontPose): Canvas {
  const c = new Canvas(FRONT.w, FRONT.h);
  const X = FRONT.ox + (p.dx ?? 0);
  const lie = p.lie ? 5 : 0;
  const Y = FRONT.gy - 27 + (p.dy ?? 0);
  const up = p.up ?? 0;
  const by = Y - up + lie;
  const lean = p.lean ?? 0;
  const hx = p.hx ?? 0, hd = p.hd ?? 0;
  const put = (x: number, y: number, z: string) => c.set(X + x + leanAt(lean, y), by + y, z);
  BACK_HEAD.forEach((r, y) => [...r].forEach((z, x) => { if (z !== EMPTY) put(hx + x, y + hd, z); }));
  const rump = p.rump ?? 0;
  BACK_BODY.forEach((r, y) => [...r].forEach((z, x) => {
    if (z === EMPTY) return;
    const lift = y >= 12 ? rump : y >= 8 ? Math.round((rump * (y - 7)) / 5) : 0;
    put(x, y - lift, z);
  }));
  if (p.breath) [...BACK_BODY[3]].forEach((z, x) => { if (z !== EMPTY) put(x, 2, z); });
  if (p.bristle) for (const [x, y] of [[2, 1], [4, 0], [5, 0], [7, 1], [3, 1], [6, 1], [4, 1], [5, 1]] as P[]) put(x, y, 'C');
  if (!p.lie) frontLegs(c, X, Y, p, true);
  // la queue, fine, et son pinceau ; elle balance à l'opposé de la tête
  const tx = 4 + (hx < 0 ? 1 : 0);
  for (let y = 13; y <= 16; y++) put(tx, y - rump, 'C');
  put(tx - 1, 17 - rump, 'C'); put(tx, 17 - rump, 'C'); put(tx + 1, 17 - rump, 'C');
  return c;
}

function frontish(z: Canvas, p: FrontPose, head?: Canvas): Grid {
  const lit = lightUp(z.toGrid(), MATS);
  const c = Canvas.from(lit);
  // la tête, éclairée et contourée à part, posée sur les épaules
  if (head) lightUp(head.toGrid(), MATS).forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== EMPTY) c.set(x, y, ch); }));
  const X = FRONT.ox + (p.dx ?? 0);
  const gy = FRONT.gy + 2 + (p.dy ?? 0);
  const air = p.air ?? 0;
  for (let x = X + 1 + air; x <= X + FW - air; x++) if (c.get(x, gy) === EMPTY) c.set(x, gy, 'x');
  if (p.lie) for (let y = gy - 20; y < gy; y++) if (c.get(X + FW, y) === EMPTY && c.get(X + FW - 1, y - 1) !== EMPTY) c.set(X + FW, y, 'x');
  return dab(c.toGrid(), (p.dabs ?? []).map(([x, y, k]) => [X + x, FRONT.gy - 27 + (p.dy ?? 0) + y, k]));
}

export const front = (p: FrontPose = {}) => frontish(frontZones(p), p, frontZones(p, true));
export const back = (p: FrontPose = {}) => frontish(backZones(p), p);

// =====================================================================================================================
// LES ANIMATIONS
// =====================================================================================================================

export type Dir = 'right' | 'down' | 'up';
const four = (ms: number) => [ms, ms, ms, ms];

export const walk: Record<Dir, Anim> = {
  right: {
    note: 'au pas, 1,2 m/s : pas diagonal, la tete hoche', ms: four(160), loop: true,
    frames: WALK_LEGS.map((legs, i) => side({ legs, head: i % 2 ? 1 : 0 })),
  },
  down: { note: '', ms: four(160), loop: true, frames: [front({}), front({ ll: 1, hd: 1 }), front({}), front({ rl: 1, hd: 1 })] },
  up: { note: '', ms: four(160), loop: true, frames: [back({}), back({ rl: 1, hx: 1 }), back({}), back({ ll: 1, hx: -1 })] },
};

const TELL = { head: 3, headFrom: 15, neck: 1, bristle: true, tail: 'up' as const };
const tellLegs = (front: Leg): Leg[] => [STAND[0], STAND[1], STAND[2], front];
export const tell: Record<Dir, Anim> = {
  right: {
    note: 'annonce 0,6 s : tete basse, soies herissees, queue dressee ; la patte gratte, la terre vole', ms: four(150), loop: false,
    frames: [
      side({ ...TELL, legs: tellLegs(L(true, [15, 11], [17, 13], [17, 15])) }),
      side({ ...TELL, legs: tellLegs(L(true, [15, 11], [14, 14], [13, 17])), dabs: dust(12, 17, 2) }),
      side({ ...TELL, legs: tellLegs(L(true, [15, 11], [17, 13], [18, 15])), dabs: [[9, 15, 'd'], [8, 14, 'D'], [10, 16, 'y']] }),
      side({ ...TELL, head: 4, legs: tellLegs(L(true, [15, 11], [14, 14], [13, 17])), dabs: dust(12, 17, 3) }),
    ],
  },
  down: {
    note: '', ms: four(150), loop: false,
    frames: [
      front({ hd: 2, bristle: true, rl: 2 }),
      front({ hd: 2, bristle: true, dabs: [[8, 28, 'D'], [9, 27, 'd'], [10, 28, 'y']] }),
      front({ hd: 2, bristle: true, rl: 2, dabs: [[10, 26, 'd']] }),
      front({ hd: 3, bristle: true, dabs: [[8, 28, 'd'], [10, 27, 'D'], [11, 26, 'd'], [-1, 28, 'y']] }),
    ],
  },
  up: {
    note: '', ms: four(150), loop: false,
    frames: [
      back({ hd: 2, bristle: true }),
      back({ hd: 3, bristle: true, dabs: [[7, 29, 'D'], [8, 30, 'd']] }),
      back({ hd: 2, bristle: true }),
      back({ hd: 3, bristle: true, dabs: [[7, 30, 'd'], [9, 29, 'D'], [6, 30, 'y']] }),
    ],
  },
};

const RUN = { head: 2, headFrom: 16, neck: 1, bristle: true, tail: 'up' as const };
export const charge: Record<Dir, Anim> = {
  right: {
    note: 'charge, galop 11 m/s : 1 suspension etiree, 2 l avant se pose, 3 l arriere se pose sous le ventre, 4 l arriere pousse', ms: four(80), loop: true,
    frames: [
      side({ ...RUN, legs: GALLOP[0], dy: -1, air: 2, dabs: dust(1, 17, 3) }),
      side({ ...RUN, head: 3, legs: GALLOP[1], dabs: dust(16, 18, 1) }),
      side({ ...RUN, legs: GALLOP[2], rump: 1, dabs: dust(7, 18, 2) }),
      side({ ...RUN, head: 3, legs: GALLOP[3], dabs: dust(1, 18, 3) }),
    ],
  },
  down: {
    note: '', ms: four(80), loop: true,
    frames: [
      front({ hd: 2, bristle: true, up: 1, ll: 1, rl: 1, air: 1, dabs: [[0, 29, 'D'], [9, 29, 'd']] }),
      front({ hd: 3, bristle: true, rl: 2, dabs: [[-1, 28, 'd'], [10, 29, 'D'], [11, 28, 'y']] }),
      front({ hd: 2, bristle: true, up: 1, ll: 2, rl: 2, air: 1, dabs: [[9, 30, 'D'], [-1, 29, 'd']] }),
      front({ hd: 3, bristle: true, ll: 2, dabs: [[-1, 29, 'D'], [-2, 28, 'd'], [10, 28, 'y']] }),
    ],
  },
  up: {
    note: '', ms: four(80), loop: true,
    frames: [
      back({ hd: 3, bristle: true, up: 1, ll: 1, rl: 1, air: 1, dabs: [[1, 30, 'D'], [2, 31, 'd'], [0, 31, 'y']] }),
      back({ hd: 3, bristle: true, rl: 2, dabs: [[8, 30, 'D'], [9, 31, 'd'], [7, 31, 'D']] }),
      back({ hd: 3, bristle: true, up: 1, ll: 2, rl: 2, air: 1, dabs: [[1, 31, 'd'], [8, 30, 'y']] }),
      back({ hd: 3, bristle: true, ll: 2, dabs: [[1, 30, 'D'], [2, 31, 'D'], [0, 30, 'd']] }),
    ],
  },
};

export interface Impact extends Anim { trunk: { x: number; y: number; front: boolean } }
const SPLAY: Leg[] = [L(false, [7, 11], [8, 17]), L(false, [12, 11], [11, 17]), L(true, [4, 11], [3, 14], [2, 17]), L(true, [15, 11], [16, 14], [17, 17])];
const BRACE: Leg[] = [L(false, [7, 11], [7, 17]), L(false, [12, 11], [13, 14], [13, 17]), L(true, [4, 11], [3, 14], [3, 17]), L(true, [15, 11], [17, 14], [18, 17])];
const chips = (x: number): Dab[] => [[x, 2, 'y'], [x + 1, 0, 'd'], [x, -2, 'D'], [x + 1, 5, 'y'], [x + 2, 3, 'd']];
export const impact: Record<Dir, Impact> = {
  right: {
    note: 'choc contre un arbre : 1 il arrive lance, 2 la tete cogne et rebondit, l arriere decolle, 3 le recul, 4 il se pose, sonne',
    ms: [60, 110, 150, 250], loop: false,
    trunk: { x: SIDE.ox + 27, y: FOOT, front: false },
    frames: [
      side({ ...RUN, head: 3, legs: GALLOP[1] }),
      side({ head: -2, headFrom: 16, bristle: true, tail: 'up', rump: 2, legs: [L(false, [7, 11], [8, 13], [9, 15]), BRACE[1], L(true, [4, 11], [5, 13], [6, 15]), BRACE[3]], dabs: chips(27) }),
      side({ dx: -2, head: -1, tail: 'out', legs: BRACE, dabs: [[28, 8, 'y'], [27, 12, 'd']] }),
      side({ dx: -3, head: 2, neck: 1, legs: SPLAY }),
    ],
  },
  down: {
    note: '', ms: [60, 110, 150, 250], loop: false,
    trunk: { x: FRONT.ox + 11, y: FRONT.gy + 4, front: true },
    frames: [
      front({ hd: 3, bristle: true }),
      front({ hd: -2, up: -1, bristle: true, dabs: [[11, 18, 'y'], [-1, 16, 'd'], [11, 14, 'D']] }),
      front({ hd: -1, dy: -3 }),
      front({ hd: 2, dy: -4, splay: 1 }),
    ],
  },
  up: {
    note: '', ms: [60, 110, 150, 250], loop: false,
    trunk: { x: FRONT.ox + 5, y: FRONT.gy - 22, front: false },
    frames: [
      back({ hd: 3, bristle: true }),
      back({ hd: -2, rump: 2, ll: 1, rl: 1, bristle: true, dabs: [[-1, 1, 'y'], [10, 0, 'd'], [9, -2, 'D']] }),
      back({ hd: -1, dy: 3 }),
      back({ hd: 1, dy: 4, splay: 1 }),
    ],
  },
};

export const dazed: Record<Dir, Anim> = {
  right: {
    note: 'sonne, en boucle : il titube, tete basse, l avant flechit, il chancelle d un pixel', ms: four(260), loop: true,
    frames: [
      side({ head: 3, neck: 1, legs: SPLAY }),
      side({ head: 4, neck: 2, sag: 1, eye: 'closed', legs: [SPLAY[0], SPLAY[1], SPLAY[2], L(true, [15, 11], [17, 14], [16, 17])] }),
      side({ dx: -1, head: 2, neck: 1, rump: 1, legs: [SPLAY[0], SPLAY[1], L(true, [4, 11], [5, 14], [6, 17]), SPLAY[3]] }),
      side({ head: 3, neck: 1, sag: 1, legs: SPLAY }),
    ],
  },
  down: {
    note: '', ms: four(260), loop: true,
    frames: [
      front({ splay: 1, hx: -1, hd: 2 }),
      front({ splay: 1, hd: 3, up: -1, eye: 'closed' }),
      front({ splay: 1, hx: 1, hd: 2 }),
      front({ splay: 1, hd: 3, up: -1 }),
    ],
  },
  up: {
    note: '', ms: four(260), loop: true,
    frames: [
      back({ splay: 1, hx: -1, hd: 2 }),
      back({ splay: 1, hd: 3, up: -1 }),
      back({ splay: 1, hx: 1, hd: 2 }),
      back({ splay: 1, hd: 3, up: -1 }),
    ],
  },
};

const ROOT = { headFrom: 14, neck: 2 };
const ROOT_LEGS: Leg[] = [STAND[0], L(false, [12, 11], [13, 14], [12, 17]), STAND[2], L(true, [15, 11], [16, 14], [15, 17])];
export const root: Record<Dir, Anim> = {
  right: {
    note: 'fouille, en boucle : le groin s enfonce, pousse, la terre vole', ms: four(200), loop: true,
    frames: [
      side({ ...ROOT, head: 7, legs: ROOT_LEGS }),
      side({ ...ROOT, head: 6, legs: ROOT_LEGS, dabs: [[27, 15, 'd'], [28, 13, 'D'], [27, 12, 'y']] }),
      side({ ...ROOT, head: 7, dx: 1, legs: ROOT_LEGS.map((l) => ({ ...l, pts: l.pts.map(([x, y]): P => [x - 1, y]) })), dabs: [[28, 11, 'd'], [29, 13, 'D'], [26, 17, 'd'], [27, 17, 'D']] }),
      side({ ...ROOT, head: 6, legs: ROOT_LEGS, dabs: [[29, 16, 'd'], [30, 17, 'D'], [28, 17, 'd']] }),
    ],
  },
  down: {
    note: '', ms: four(200), loop: true,
    frames: [
      front({ hd: 5 }),
      front({ hd: 4, dabs: [[-1, 23, 'd'], [-2, 21, 'D'], [10, 22, 'y']] }),
      front({ hd: 5, hx: 1, dabs: [[11, 20, 'd'], [-2, 24, 'D'], [12, 22, 'D']] }),
      front({ hd: 4, dabs: [[-2, 27, 'd'], [11, 26, 'D'], [12, 27, 'd']] }),
    ],
  },
  up: {
    note: '', ms: four(200), loop: true,
    frames: [
      back({ hd: 4 }),
      back({ hd: 4, dabs: [[0, 0, 'd'], [-1, 2, 'D'], [9, 1, 'y']] }),
      back({ hd: 4, hx: 1, dabs: [[10, -1, 'd'], [-1, 1, 'D'], [11, 1, 'D']] }),
      back({ hd: 4, dabs: [[-2, 3, 'd'], [11, 2, 'D'], [10, 0, 'd']] }),
    ],
  },
};

// Couché à la bauge : sur le ventre, d'aplomb, la crinière en haut, les pattes repliées sous lui, la tête posée, l'œil fermé.
const BED_BODY = [
  ...BODY.slice(0, 11),
  '.GGBBBBBBBBBBBBGGGGGHH....', // 11 le jarret replié derrière, les canons de devant sous le menton
];
const BED: SidePose = { body: BED_BODY, legs: [], dy: 6, head: 1, headFrom: 16, eye: 'closed' };
export const bed: Record<Dir, Anim> = {
  right: {
    note: 'couche a la bauge, en boucle : sur le ventre, pattes repliees, il respire', ms: [1000, 1000], loop: true,
    frames: [sideLying(BED), sideLying({ ...BED, swell: [4, 13] })],
  },
  down: { note: '', ms: [1000, 1000], loop: true, frames: [front({ lie: true, hd: 1, eye: 'closed' }), front({ lie: true, hd: 1, eye: 'closed', breath: true })] },
  up: { note: '', ms: [1000, 1000], loop: true, frames: [back({ lie: true, hd: 1 }), back({ lie: true, hd: 1, breath: true })] },
};

// =====================================================================================================================
// LA MORT : il bascule sur le flanc
// =====================================================================================================================

// Couché sur le flanc, vu du ciel : le flanc d'en haut emplit l'image, le dos et sa crinière bordent le bas (au sud), le ventre
// clair le haut (au nord) ; les pattes sortent du ventre vers le nord, courtes, raides et en biais. La tête à l'endroit, posée
// sur la joue : le groin clair au bout, l'œil fermé en haut, la joue grise, la défense, l'oreille rabattue.
//                   0         1         2
//                   01234567890123456789012345
export const DEAD = [
  '..........................', // 0  (les pattes)
  '..........................', // 1
  '..........................', // 2
  '.....VVVVVVVVVV...........', // 3  le ventre clair, au nord
  '...VVVVVVVVVVVVVV.........', // 4
  '..VVVVVVVVVVVVVVVBB.W.....', // 5  la défense pointe de la babine
  '.BBVVVVVVVVVVVVVBBBBBWBB..', // 6
  'CBBBBBBBBBBBBBBBBBBBEEBBSS', // 7  la queue ; l'œil fermé ; le groin
  'CBBBBBBBBBBBBBBBBBBKKKBBSS', // 8  la joue grise
  '.BBBBBBBBBBBBBBBBBBKKKBBSS', // 9
  '.BBBBBBBBBBBBBBBBBBBBBBBS.', // 10
  '..BBBBBBBBBBBBBBBBBCCBBB..', // 11 l'oreille rabattue
  '...UUUUUUUUUUUUUUUBB......', // 12 le dos, au sud
  '....CCCCCCCCCCCCC.........', // 13 la crinière, couchée le long du dos
];

/** Les pattes raides, courtes, en biais ; `k` : la part sortie. */
const deadLegs = (k: number): Leg[] => ([
  [[5, 4], [2, 0], false], [[8, 4], [5, 0], true], [[13, 4], [16, 0], false], [[16, 5], [19, 1], true],
] as [P, P, boolean][]).map(([a, b, near]) => ({
  pts: [a, [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k)]] as P[], near, thigh: 1,
}));

function zonesOf(body: string[], legs: Leg[]): Grid {
  const c = new Canvas(28, body.length + 2);
  for (const l of legs.filter((l) => !l.near)) drawLeg(c, l, 1, 1, () => 0);
  body.forEach((r, y) => [...r].forEach((z, x) => { if (z !== EMPTY) c.set(1 + x, 1 + y, z); }));
  for (const l of legs.filter((l) => l.near)) drawLeg(c, l, 1, 1, () => 0);
  return c.toGrid();
}

// La roulade (image 3) : à mi-chemin entre le ventre et le flanc, il bascule vers nous (au sud). Le dos se présente au ciel et
// à nous : une large bande claire (U), la crinière et ses touffes à son bord sud ; au-dessus, le flanc, et
// le bord du ventre clair qui apparaît au nord ; une patte de devant et une de derrière sortent, levées ; la tête à l'endroit,
// l'œil fermé, le groin.
//                   0         1         2
//                   01234567890123456789012345
const ROLL = [
  '..........................', // 0  (les pattes)
  '..........................', // 1
  '..........................', // 2
  '..........................', // 3
  '......VVVVVVVV............', // 4  le bord du ventre clair
  '...BBBVVVVVVVVBBBB........', // 5
  '..BBBBBBBBBBBBBBBBBBB.....', // 6
  '.BBBBBBBBBBBBBBBBBBBBBB.W.', // 7  la défense
  'CBBBBBBBBBBBBBBBBBBEEBBBSS', // 8  la queue ; l'œil fermé ; le groin
  'CUUUUUUUUUUUUUUUBBBKKKBWSS', // 9  le dos qui passe, large et clair
  '.UUUUUUUUUUUUUUUUBBKKKBBSS', // 10
  '.UUUUUUUUUUUUUUUBBBBBBBS..', // 11
  '..UUUUUUUUUUUUUUBBBCCB....', // 12 l'oreille
  '...CCCCCCCCCCCCC..........', // 13 la crinière, l'arête du dos, tournée vers nous
  '....C.CC.CC.CC............', // 14 ses touffes
];
const rollLegs: Leg[] = [
  { pts: [[4, 5], [1, 1]], near: false, thigh: 1 },
  { pts: [[7, 6], [5, 1]], near: true, thigh: 1 },
  { pts: [[15, 6], [19, 1]], near: true, thigh: 1 },
];

function trimPad(g: Grid, m = 1): Grid {
  const filled = (r: string) => /[^.]/.test(r);
  const y0 = g.findIndex(filled), y1 = g.length - 1 - [...g].reverse().findIndex(filled);
  const kept = g.slice(y0, y1 + 1);
  const x0 = Math.min(...kept.filter(filled).map((r) => r.search(/[^.]/)));
  const x1 = Math.max(...kept.filter(filled).map((r) => r.length - 1 - [...r].reverse().join('').search(/[^.]/)));
  const w = x1 - x0 + 1 + 2 * m;
  const blank = '.'.repeat(w);
  return [...Array(m).fill(blank), ...kept.map((r) => '.'.repeat(m) + r.slice(x0, x1 + 1) + '.'.repeat(m)), ...Array(m).fill(blank)];
}
export function rotateCW(g: Grid): Grid {
  const h = g.length, w = g[0].length;
  return Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => g[h - 1 - x][y]).join(''));
}
const rotateCCW = (g: Grid) => rotateCW(rotateCW(rotateCW(g)));

function inSide(g: Grid, dx = 0): Grid {
  const c = new Canvas(SIDE.w, SIDE.h).stamp(g, SIDE.ox - 1 + dx, FOOT - g.length + 1);
  return flatShadow(c.toGrid());
}
/** Pose une vue couchée nord-sud dans la frame de face, son bas au sol (FFOOT), centrée. */
function inFront(g: Grid, dx = 0): Grid {
  const c = new Canvas(FRONT.w, FRONT.h).stamp(g, Math.round((FRONT.w - g[0].length) / 2) + dx, FFOOT - g.length + 1);
  return flatShadow(c.toGrid());
}

const lit = (z: Grid) => lightUp(trimPad(z), MATS);
const deadZ = trimPad(zonesOf(DEAD, deadLegs(1)));
const rollZ = trimPad(zonesOf(ROLL, rollLegs));
export const dead = inSide(lightUp(deadZ, MATS));

/** Le sanglier mort au sol, ses quatre vues (règle D) : est (tête à l'est), r1 tête au sud, r2 tête à l'ouest, r3 tête au nord. */
export const deadViews: Grid[] = (() => {
  const r1 = rotateCW(deadZ), r2 = rotateCW(r1), r3 = rotateCW(r2);
  return [deadZ, r1, r2, r3].map((v) => castShadow(lightUp(v, MATS)));
})();

const BUCKLE: Leg[] = [STAND[0], L(false, [12, 11], [14, 14], [13, 17]), STAND[2], L(true, [15, 11], [17, 14], [16, 17])];
const SINK_BODY = [...BODY.slice(0, 11), '..BBBBB....BBBBBBB........'];
const SINK_LEGS: Leg[] = [
  { pts: [[7, 11], [6, 12]], near: false, thigh: 1 }, { pts: [[12, 11], [14, 12]], near: false, thigh: 1 },
  { pts: [[4, 11], [2, 12]], near: true, thigh: 1 }, { pts: [[15, 11], [18, 12]], near: true, thigh: 1 },
];

const DEATH_MS = [150, 180, 200, 1500];
export const death: Record<Dir, Anim> = {
  right: {
    note: '1 les anterieurs cedent, 2 il s ecroule, 3 il roule (le dos passe, une patte sort, le ventre apparait), 4 sur le flanc (tenu)',
    ms: DEATH_MS, loop: false,
    frames: [
      side({ legs: BUCKLE, neck: 2, head: 2, sag: 1 }),
      sideLying({ body: SINK_BODY, legs: SINK_LEGS, dy: 5, head: 2, headFrom: 15, eye: 'closed' }),
      inSide(lit(rollZ)),
      dead,
    ],
  },
  // De face, il bascule vers l'ouest (sa droite) : la roulade est l'image de profil tournée d'un quart de tour, et il finit
  // couché la tête au sud (r1), le dos à l'ouest, les pattes à l'est.
  down: {
    note: 'de face : il flechit, penche vers l ouest, roule sur le flanc, couche la tete au sud (r1)', ms: DEATH_MS, loop: false,
    frames: [
      front({ hd: 3, up: -2, splay: 1, eye: 'closed' }),
      front({ hd: 3, up: -3, lean: -4, eye: 'closed' }),
      inFront(lightUp(rotateCW(rollZ), MATS), -1),
      inFront(deadViews[1].map((r) => r), -1),
    ],
  },
  // De dos, il bascule vers l'est : il finit la tête au nord (r3), le dos à l'est.
  up: {
    note: 'de dos : il flechit, penche vers l est, roule sur le flanc, couche la tete au nord (r3)', ms: DEATH_MS, loop: false,
    frames: [
      back({ hd: 2, up: -2, splay: 1 }),
      back({ hd: 2, up: -3, lean: 4 }),
      inFront(lightUp(rotateCCW(rollZ), MATS), 1),
      inFront(deadViews[3].map((r) => r), 1),
    ],
  },
};

export const anims = { walk, tell, charge, impact, dazed, root, bed };
