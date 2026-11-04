// Troisième essai du sanglier (chantier « sangliers », hors jeu) : la variante C du profil, choisie par Grégoire (la tête la plus
// massive en coin, la joue grise qui détache la tête du cou, la défense qui sort de la babine, garrot haut, croupe plus basse,
// pattes courtes et fines), étendue à la face, au dos, à toutes les animations, à la mort et à l'objet mort au sol.
// Planches : npx tsx tools/essai-sangliers-c.ts (.art-preview/sangliers-c-*.png).
//
// Gabarit (docs/STYLE.md, section 8 ; 140 × 40 × 80 cm, boîte, 5 cm par pixel), silhouette contour compris, ombre exclue :
//   - de profil : L × (H + D/2) = 28 × (16 + 4) = 28 × 20 px (zones 26 × 18, le contour ajoute un pixel de chaque côté) ;
//   - de face et de dos : W × (H + L/2) = 8 × (16 + 14) = 8 × 30 px ; dessinés à 10 × 30 (zones 8 × 28) : la tolérance de 2 px
//     prise en entier pour la masse demandée, l'écu au plus large, la croupe plus étroite (le corps en coin, vu de face ou de dos) ;
//   - mort, couché sur le flanc (140 × 80 × 40 : la hauteur devient la profondeur) : 28 × (8 + 16/2) = 28 × 16 ; nord-sud,
//     règle D (rotation pure) : 16 × 28.
//
// Méthode : comme les essais 1 et 2, chaque image est un dessin en zones de matière (un tableau de lignes, posé par quelques
// réglages : tête baissée, croupe levée, pattes par points), éclairé en haut à gauche et contouré par art/lib/light.ts, puis son
// ombre `x`. La vue gauche est le miroir de la droite (le jeu retourne l'image, comme pour le lapin) ; aucune image n'a de
// détail qui ne supporte pas le miroir (pas d'arme, pas de main).
//
// Zones : B robe (côté vu), U dessus du dos (vers le ciel ; sa teinte claire Q, la pointe grise des soies, fait le liseré du dos
// qui se lit sous la pénombre), C soies de la crinière, oreille, queue (le plus sombre), F robe du côté caché, G pattes du côté vu
// et joue grise, J pattes du fond, S disque du groin (sa teinte claire p, plus claire qu'aux essais : le groin se lit de loin),
// N narines, H sabots, W défense, E œil (ouvert : un pixel ; fermé : un trait de deux), V ventre (plus clair).

import { Canvas, EMPTY, castShadow, type Grid, type Palette } from '../lib/canvas';
import { lightUp, type Materials } from '../lib/light';
import { palette as second, MATS as SECOND } from './sanglier-profil-lib';
import { body as cBody } from './sanglier-profil-c';

export const palette: Palette = {
  ...second,
  Q: '#907a5e', // pointe grise des soies du dos au soleil : la pierre z mêlée à la terre u (le liseré du dos)
  p: '#a5917a', // groin au soleil : g mêlé au torchis D (le boutoir, la peau nue, plus claire que la robe)
};

export const MATS: Materials = {
  ...SECOND,
  U: { light: 'Q', base: 'q', shade: 'r', dark: 't' },
  S: { light: 'p', base: 'g', shade: 'h', dark: 't' },
  N: { light: 'i', base: 'i', shade: 'i', dark: 't' },
};

export type P = [number, number];
export type Dab = [number, number, string];
export interface Anim { frames: Grid[]; ms: number[]; loop: boolean; note: string }

/** Pixels d'une ligne brisée, sans doublon. */
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

/** Ajoute des pixels après l'éclairage (poussière, mottes, éclats d'écorce), là où c'est vide ou ombre. */
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

/** Frame de profil : 46 × 30 ; le point (0, 0) des zones en (OX, OY) ; les sabots (rangée 17) sur GY ; ombre sur GY + 2. */
export const SIDE = { w: 46, h: 30, ox: 10, oy: 5 } as const;
export const GY = SIDE.oy + 17;
/** La rangée du sol (contour sous les sabots) : le pied du sprite. */
export const FOOT = GY + 1;

/** Le corps de C sans sa queue (dessinée à part selon l'allure) ; l'œil retiré (posé à part, ouvert ou fermé). */
const BODY = cBody.map((r) => r.replace(/^C/, '.').replace('E', 'B'));
const EYE: P = [20, 4];

export interface Leg { pts: P[]; near: boolean; thigh?: number }

export interface SidePose {
  legs: Leg[];
  /** la tête baissée au bout du groin (px ; négatif : relevée), pliée depuis la colonne `headFrom` (17). */
  head?: number;
  headFrom?: number;
  /** l'avant (garrot, encolure) baissé : 0 à la colonne 8, tout à la colonne 16. */
  neck?: number;
  /** la croupe levée (px à la colonne 0, rien à la colonne 9). */
  rump?: number;
  /** tout l'animal décalé (pattes comprises), et le corps seul baissé (les sabots restent). */
  dx?: number;
  dy?: number;
  sag?: number;
  tail?: 'down' | 'up' | 'out';
  bristle?: boolean;
  eye?: 'open' | 'closed';
  /** le dos qui gonfle d'un pixel (la respiration, couché) entre ces colonnes. */
  swell?: [number, number];
  body?: string[];
  /** l'ombre raccourcie de chaque côté (en l'air). */
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
  // la hanche suit le corps, le genou à moitié, le sabot reste où il est dessiné
  const n = l.pts.length;
  const pts = l.pts.map(([x, y], i): P => [x, y + Math.round(w(l.pts[0][0]) * (1 - i / (n - 1)))]);
  const px = trace(pts);
  const thigh = l.thigh ?? 2;
  px.forEach(([x, y], i) => {
    const last = i === px.length - 1;
    const z = last ? 'H' : i < thigh ? (l.near ? 'B' : 'F') : l.near ? 'G' : 'J';
    c.set(ox + x, oy + y, z);
    if (l.near && (i < thigh + 1 || last)) c.set(ox + x + 1, oy + y, z);
  });
}

function sideZones(p: SidePose): Canvas {
  const c = new Canvas(SIDE.w, SIDE.h);
  const ox = SIDE.ox + (p.dx ?? 0), oy = SIDE.oy + (p.dy ?? 0);
  const w = warp(p);
  const body = p.body ?? BODY;
  for (const l of p.legs.filter((l) => !l.near)) drawLeg(c, l, ox, oy, w);
  body.forEach((row, y) => [...row].forEach((z, x) => { if (z !== EMPTY) c.set(ox + x, oy + y + w(x), z); }));
  // la respiration : le dos monte d'un pixel
  if (p.swell) for (let x = p.swell[0]; x <= p.swell[1]; x++) {
    let y = 0;
    while (y < SIDE.h && c.get(ox + x, y) === EMPTY) y++;
    if (y > 0 && y < SIDE.h) c.set(ox + x, y - 1, c.get(ox + x, y) === 'C' ? 'C' : 'U');
  }
  // les soies hérissées : une rangée de plus sur l'écu, la crinière pleine
  if (p.bristle) {
    for (let x = 9; x <= 18; x++) c.set(ox + x, oy + w(x), 'C');
    for (const x of [10, 12, 13, 15, 16]) c.set(ox + x, oy - 1 + w(x), 'C');
  }
  // la queue
  const t = p.tail ?? 'down';
  const tw = w(1);
  const tail: P[] = t === 'down' ? [[0, 6], [0, 7], [0, 8]] : t === 'up' ? [[0, 5], [0, 4], [0, 3]] : [[0, 6], [0, 5], [1, 4]];
  for (const [x, y] of tail) c.set(ox + x, oy + y + tw, 'C');
  // l'œil
  const [ex, ey] = EYE;
  if ((p.eye ?? 'open') === 'open') c.set(ox + ex, oy + ey + w(ex), 'E');
  else { c.set(ox + ex, oy + ey + 1 + w(ex), 'E'); c.set(ox + ex - 1, oy + ey + 1 + w(ex - 1), 'E'); }
  for (const l of p.legs.filter((l) => l.near)) drawLeg(c, l, ox, oy, w);
  return c;
}

/** L'ombre sous un animal debout : une rangée sous le contour des sabots, sous le corps, décalée d'un pixel. */
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

/** Image couchée (bauge, effondré) : le corps posé, ombre à plat. */
function sideLying(p: SidePose): Grid {
  const lit = lightUp(sideZones(p).toGrid(), MATS);
  return dab(flatShadow(lit), (p.dabs ?? []).map(([x, y, k]) => [SIDE.ox + (p.dx ?? 0) + x, SIDE.oy + y, k]));
}

const L = (near: boolean, ...pts: P[]): Leg => ({ pts, near });
/** Debout, les pattes d'aplomb (celles de l'essai 2). */
const STAND: Leg[] = [L(false, [7, 11], [7, 17]), L(false, [12, 11], [12, 17]), L(true, [4, 11], [4, 13], [3, 15], [3, 17]), L(true, [15, 11], [15, 17])];

export const stand = side({ legs: STAND });

// Poussière (au sol, derrière un sabot) en coordonnées de zones.
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

// ---------------------------------------------------------------- le galop de la charge (pattes fléchies)

/** 1 suspension étirée, 2 l'avant se pose, 3 suspension rassemblée (pattes sous le corps), 4 l'arrière pousse. */
const GALLOP: Leg[][] = [
  [L(false, [7, 11], [5, 13], [3, 15]), L(false, [12, 11], [15, 13], [17, 14]), L(true, [4, 11], [2, 13], [0, 15]), L(true, [15, 11], [18, 13], [19, 15])],
  [L(false, [7, 11], [9, 13], [8, 15]), L(false, [12, 11], [12, 14], [10, 16]), L(true, [4, 11], [6, 13], [5, 15]), L(true, [15, 11], [16, 14], [16, 17])],
  [L(false, [7, 11], [10, 13], [11, 15]), L(false, [12, 11], [14, 13], [12, 15]), L(true, [4, 11], [7, 13], [9, 15]), L(true, [15, 11], [17, 13], [15, 15])],
  [L(false, [7, 11], [6, 14], [3, 17]), L(false, [12, 11], [15, 12], [17, 14]), L(true, [4, 11], [5, 14], [6, 17]), L(true, [15, 11], [18, 12], [19, 14])],
];

// =====================================================================================================================
// DE FACE ET DE DOS
// =====================================================================================================================

/** Frame de face et de dos : 22 × 46 ; la colonne 0 des zones en X ; la rangée 27 des zones (les sabots) sur FGY. */
export const FRONT = { w: 22, h: 46, ox: 7, gy: 38 } as const;
export const FFOOT = FRONT.gy + 1;

// De face : la croupe au loin (en haut), étroite ; le dos vu du ciel en raccourci, qui s'élargit vers les côtes et l'écu (le
// sanglier est en coin : l'avant massif, l'arrière petit) ; la crinière qui monte vers le garrot, juste au-dessus de la tête ; la
// tête massive, devant les épaules dans l'ombre (F) qui la détachent de chaque côté ; la joue grise, le groin clair et large, une
// défense de chaque côté qui sort de la babine sur l'épaule sombre ; le poitrail ; les pattes.
// Huit colonnes (10 px contour compris : le gabarit de 8 plus la tolérance de 2, pour la masse demandée).
//                  01234567
const FACE_BODY = [
  '..UUUU..', // 0  la croupe, au loin, étroite
  '.UUUUUU.', // 1
  '.UUUUUU.', // 2
  '.UUUUUU.', // 3
  '.UUCCUU.', // 4  la crinière commence au milieu du dos
  'UUUCCUUU', // 5  les côtes : le dos s'élargit vers l'avant
  'UUUCCUUU', // 6
  'UUCCCCUU', // 7  la crinière s'épaissit vers le garrot
  'UCCCCCCU', // 8
  'BCCCCCCB', // 9  le garrot, juste au-dessus de la tête
  'FFFFFFFF', // 10 les épaules, dans l'ombre, de part et d'autre de la tête
  'FFFFFFFF', // 11
  'FFFFFFFF', // 12
  'FFFFFFFF', // 13
  'FFFFFFFF', // 14
  'FFFFFFFF', // 15
  'FFFFFFFF', // 16
  'FFFFFFFF', // 17
  'FFFFFFFF', // 18
  'FBBBBBBF', // 19 le poitrail
  'FBBBBBBF', // 20
  '.FBBBBF.', // 21
  '..BBBB..', // 22
];
// La tête vue de face, posée à la rangée 10 : les oreilles dressées aux coins, le front, les yeux, la joue grise, le groin.
const FACE_HEAD = [
  '.C....C.', // 0  les oreilles
  '.CBBBBC.', // 1
  '.BBBBBB.', // 2  le front
  '.BEBBEB.', // 3  les yeux
  '.GBBBBG.', // 4  la joue grise
  '.GGBBGG.', // 5
  'WGSSSSGW', // 6  le groin ; les défenses sortent de la babine, sur l'épaule sombre
  '.WSSSSW.', // 7
  '.SNSSNS.', // 8  les narines, le groin large
  '..SSSS..', // 9
];
const FACE_HEAD_Y = 10;

// De dos : la croupe devant (en bas), ronde, plus étroite que l'écu ; les jambons, la queue ; le dos vu du ciel qui s'élargit en
// montant vers les épaules ; la crinière en touffes, au plus haut ; derrière elle, le haut de la tête et les oreilles.
const BACK_BODY = [
  '........', // 0
  '........', // 1
  '.CCCCCC.', // 2  les touffes de la crinière, au garrot (le plus haut)
  'UCCCCCCU', // 3  l'écu, le plus large
  'UUCCCCUU', // 4
  'UUUCCUUU', // 5
  'UUUCCUUU', // 6
  '.UUCCUU.', // 7  le dos se resserre vers la croupe
  '.UUUUUU.', // 8
  '.UUUUUU.', // 9
  '.UUUUUU.', // 10
  '.UUUUUU.', // 11
  '.FBBBBF.', // 12 l'arête où le dos tourne en croupe, face au sud (l'ombre des hanches)
  '.BBBBBB.', // 13
  '.BBBBBB.', // 14
  '.BBBBBB.', // 15
  '.BBBBBB.', // 16
  '.BBBBBB.', // 17
  '.BBBBBB.', // 18
  '.BBBBBB.', // 19
  '.BBFFBB.', // 20 la fente entre les jambons
  '.BBFFBB.', // 21
  '..BFFB..', // 22
];
const BACK_HEAD = [
  '.C....C.', // les oreilles, au loin
  '.CBBBBC.',
  '..BBBB..',
  '..BBBB..',
];

export interface FrontPose {
  /** la tête baissée (+) ou relevée (−), et balancée de côté. */
  hd?: number; hx?: number;
  /** le corps levé (+) ; les sabots restent au sol sauf `ll`, `rl` (pattes gauche et droite à l'écran levées). */
  up?: number;
  ll?: number; rl?: number;
  /** pattes écartées (sonné). */
  splay?: number;
  /** tout l'animal décalé (recul). */
  dx?: number; dy?: number;
  bristle?: boolean;
  eye?: 'open' | 'closed';
  /** couché : le corps posé au sol, pattes repliées dessous (invisibles), `breath` : le dos gonfle. */
  lie?: boolean; breath?: boolean;
  /** la croupe levée (de dos : l'arrière-train décolle au choc). */
  rump?: number;
  air?: number;
  dabs?: Dab[];
}

function frontLegs(c: Canvas, X: number, Y: number, p: FrontPose, hind: boolean) {
  const s = p.splay ?? 0;
  const up = p.up ?? 0;
  const leg = (x: number, lift: number, out: number) => {
    const top = 23 - up - (hind ? (p.rump ?? 0) : 0), foot = 27 - lift - (hind ? (p.rump ?? 0) : 0);
    for (let y = top; y <= foot; y++) {
      const xx = x + Math.round((out * (y - top)) / Math.max(1, foot - top));
      c.set(X + xx, Y + y, y === foot ? 'H' : y <= top + 1 ? 'F' : 'G');
    }
  };
  leg(1, p.ll ?? 0, -s);
  leg(6, p.rl ?? 0, s);
}

function frontZones(p: FrontPose): Canvas {
  const c = new Canvas(FRONT.w, FRONT.h);
  const X = FRONT.ox + (p.dx ?? 0);
  const lie = p.lie ? 5 : 0;
  const Y = FRONT.gy - 27 + (p.dy ?? 0);
  const up = p.up ?? 0;
  if (!p.lie) frontLegs(c, X, Y, p, false);
  const by = Y - up + lie;
  FACE_BODY.forEach((r, y) => [...r].forEach((z, x) => { if (z !== EMPTY) c.set(X + x, by + y, z); }));
  if (p.breath) [...FACE_BODY[0]].forEach((z, x) => { if (z !== EMPTY) c.set(X + x, by - 1, z); });
  if (p.bristle) {
    // les soies hérissées débordent de l'écu de chaque côté, au garrot
    for (const [x, y] of [[2, 3], [5, 3], [2, 4], [5, 4], [1, 7], [6, 7], [3, 2], [4, 2]] as P[]) c.set(X + x, by + y, 'C');
  }
  const hx = p.hx ?? 0, hd = p.hd ?? 0;
  const hy = by + FACE_HEAD_Y + hd;
  FACE_HEAD.forEach((r, y) => [...r].forEach((z, x) => { if (z !== EMPTY) c.set(X + hx + x, hy + y, z); }));
  if (p.eye === 'closed') { c.set(X + hx + 2, hy + 3, 'B').set(X + hx + 5, hy + 3, 'B'); c.set(X + hx + 2, hy + 4, 'E').set(X + hx + 5, hy + 4, 'E'); }
  return c;
}

function backZones(p: FrontPose): Canvas {
  const c = new Canvas(FRONT.w, FRONT.h);
  const X = FRONT.ox + (p.dx ?? 0);
  const lie = p.lie ? 5 : 0;
  const Y = FRONT.gy - 27 + (p.dy ?? 0);
  const up = p.up ?? 0;
  const by = Y - up + lie;
  const hx = p.hx ?? 0, hd = p.hd ?? 0;
  // la tête au loin, derrière le garrot (cachée quand elle se baisse)
  BACK_HEAD.forEach((r, y) => [...r].forEach((z, x) => { if (z !== EMPTY) c.set(X + hx + x, by + y + hd, z); }));
  const rump = p.rump ?? 0;
  BACK_BODY.forEach((r, y) => [...r].forEach((z, x) => {
    if (z === EMPTY) return;
    // la croupe levée : les rangées du bas (l'arrière-train) montent
    const lift = y >= 12 ? rump : y >= 8 ? Math.round((rump * (y - 7)) / 5) : 0;
    c.set(X + x, by + y - lift, z);
  }));
  if (p.breath) [...BACK_BODY[2]].forEach((z, x) => { if (z !== EMPTY) c.set(X + x, by + 1, z); });
  if (p.bristle) for (const [x, y] of [[1, 1], [3, 0], [4, 0], [6, 1], [2, 1], [5, 1]] as P[]) c.set(X + x, by + y, 'C');
  if (!p.lie) frontLegs(c, X, Y, p, true);
  // la queue, fine, et son pinceau ; elle balance à l'opposé de la tête
  const tx = X + 4 - Math.sign(hx);
  for (let y = 12; y <= 17; y++) c.set(tx, by + y - rump, 'C');
  c.set(tx - 1, by + 18 - rump, 'C').set(tx, by + 18 - rump, 'C').set(tx + 1, by + 18 - rump, 'C');
  return c;
}

function frontish(z: Canvas, p: FrontPose): Grid {
  const lit = lightUp(z.toGrid(), MATS);
  const c = Canvas.from(lit);
  const X = FRONT.ox + (p.dx ?? 0);
  const gy = FRONT.gy + 2 + (p.dy ?? 0);
  const air = p.air ?? 0;
  for (let x = X + 1 + air; x <= X + 8 - air; x++) if (c.get(x, gy) === EMPTY) c.set(x, gy, 'x');
  if (p.lie) for (let y = gy - 20; y < gy; y++) if (c.get(X + 8, y) === EMPTY && c.get(X + 7, y - 1) !== EMPTY) c.set(X + 8, y, "x");
  return dab(c.toGrid(), (p.dabs ?? []).map(([x, y, k]) => [X + x, FRONT.gy - 27 + (p.dy ?? 0) + y, k]));
}

export const front = (p: FrontPose = {}) => frontish(frontZones(p), p);
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

// L'annonce : 0,6 s, quatre images ; la tête basse, les soies hérissées, la queue dressée, une patte de devant gratte le sol.
const TELL = { head: 3, headFrom: 15, neck: 1, bristle: true, tail: 'up' as const };
const tellLegs = (front: Leg): Leg[] => [STAND[0], STAND[1], STAND[2], front];
export const tell: Record<Dir, Anim> = {
  right: {
    note: 'annonce 0,6 s : tete basse, soies herissees, queue dressee ; la patte gratte, la terre vole', ms: four(150), loop: false,
    frames: [
      side({ ...TELL, legs: tellLegs(L(true, [15, 11], [17, 13], [17, 15])) }),
      side({ ...TELL, legs: tellLegs(L(true, [15, 11], [14, 14], [12, 17])), dabs: dust(11, 17, 2) }),
      side({ ...TELL, legs: tellLegs(L(true, [15, 11], [17, 13], [18, 15])), dabs: [[8, 15, 'd'], [7, 14, 'D'], [9, 16, 'y']] }),
      side({ ...TELL, head: 4, legs: tellLegs(L(true, [15, 11], [14, 14], [12, 17])), dabs: dust(11, 17, 3) }),
    ],
  },
  down: {
    note: '', ms: four(150), loop: false,
    frames: [
      front({ hd: 2, bristle: true, rl: 2 }),
      front({ hd: 2, bristle: true, dabs: [[6, 28, 'D'], [7, 27, 'd'], [8, 28, 'y']] }),
      front({ hd: 2, bristle: true, rl: 2, dabs: [[8, 26, 'd']] }),
      front({ hd: 3, bristle: true, dabs: [[6, 28, 'd'], [8, 27, 'D'], [9, 26, 'd'], [-1, 28, 'y']] }),
    ],
  },
  up: {
    note: '', ms: four(150), loop: false,
    frames: [
      back({ hd: 2, bristle: true }),
      back({ hd: 3, bristle: true, dabs: [[5, 29, 'D'], [6, 30, 'd']] }),
      back({ hd: 2, bristle: true }),
      back({ hd: 3, bristle: true, dabs: [[5, 30, 'd'], [7, 29, 'D'], [4, 30, 'y']] }),
    ],
  },
};

const RUN = { head: 2, headFrom: 16, neck: 1, bristle: true, tail: 'up' as const };
export const charge: Record<Dir, Anim> = {
  right: {
    note: 'charge, galop 11 m/s : 1 suspension etiree, 2 l avant se pose, 3 suspension rassemblee, 4 l arriere pousse', ms: four(80), loop: true,
    frames: [
      side({ ...RUN, legs: GALLOP[0], dy: -1, air: 2, dabs: dust(1, 17, 3) }),
      side({ ...RUN, head: 3, legs: GALLOP[1], dabs: dust(15, 18, 1) }),
      side({ ...RUN, legs: GALLOP[2], dy: -1, air: 2, rump: 1, dabs: dust(14, 18, 2) }),
      side({ ...RUN, head: 3, legs: GALLOP[3], dabs: dust(2, 18, 3) }),
    ],
  },
  down: {
    note: '', ms: four(80), loop: true,
    frames: [
      front({ hd: 2, bristle: true, up: 1, ll: 1, rl: 1, air: 1, dabs: [[0, 29, 'D'], [7, 29, 'd']] }),
      front({ hd: 3, bristle: true, rl: 2, dabs: [[-1, 28, 'd'], [8, 29, 'D'], [9, 28, 'y']] }),
      front({ hd: 2, bristle: true, up: 1, ll: 2, rl: 2, air: 1, dabs: [[7, 30, 'D'], [-1, 29, 'd']] }),
      front({ hd: 3, bristle: true, ll: 2, dabs: [[-1, 29, 'D'], [-2, 28, 'd'], [8, 28, 'y']] }),
    ],
  },
  up: {
    note: '', ms: four(80), loop: true,
    frames: [
      back({ hd: 3, bristle: true, up: 1, ll: 1, rl: 1, air: 1, dabs: [[1, 30, 'D'], [2, 31, 'd'], [0, 31, 'y']] }),
      back({ hd: 3, bristle: true, rl: 2, dabs: [[6, 30, 'D'], [7, 31, 'd'], [5, 31, 'D']] }),
      back({ hd: 3, bristle: true, up: 1, ll: 2, rl: 2, air: 1, dabs: [[1, 31, 'd'], [6, 30, 'y']] }),
      back({ hd: 3, bristle: true, ll: 2, dabs: [[1, 30, 'D'], [2, 31, 'D'], [0, 30, 'd']] }),
    ],
  },
};

/** Le choc contre un tronc : `trunk` dit où le tronc est posé dans l'image (le planche le dessine). */
export interface Impact extends Anim { trunk: { x: number; y: number; front: boolean } }
const SPLAY: Leg[] = [L(false, [7, 11], [8, 17]), L(false, [12, 11], [11, 17]), L(true, [4, 11], [3, 14], [2, 17]), L(true, [15, 11], [16, 14], [17, 17])];
const BRACE: Leg[] = [L(false, [7, 11], [7, 17]), L(false, [12, 11], [14, 14], [15, 17]), L(true, [4, 11], [3, 14], [3, 17]), L(true, [15, 11], [17, 14], [18, 17])];
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
  // de face : le tronc devant lui (au sud), qui le cache à demi ; il recule vers le nord
  down: {
    note: '', ms: [60, 110, 150, 250], loop: false,
    trunk: { x: FRONT.ox + 9, y: FRONT.gy + 4, front: true },
    frames: [
      front({ hd: 3, bristle: true }),
      front({ hd: -2, up: -1, bristle: true, dabs: [[9, 18, 'y'], [-1, 16, 'd'], [9, 14, 'D']] }),
      front({ hd: -1, dy: -3 }),
      front({ hd: 2, dy: -4, splay: 1 }),
    ],
  },
  // de dos : le tronc au nord, derrière sa tête ; l'arrière-train décolle, puis il recule vers le sud
  up: {
    note: '', ms: [60, 110, 150, 250], loop: false,
    trunk: { x: FRONT.ox + 4, y: FRONT.gy - 22, front: false },
    frames: [
      back({ hd: 3, bristle: true }),
      back({ hd: -2, rump: 2, ll: 1, rl: 1, bristle: true, dabs: [[-1, 1, 'y'], [8, 0, 'd'], [7, -2, 'D']] }),
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

// La fouille : l'avant baissé, le groin au sol qui pousse et retourne la terre ; les mottes volent devant.
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
      front({ hd: 4, dabs: [[-1, 23, 'd'], [-2, 21, 'D'], [8, 22, 'y']] }),
      front({ hd: 5, hx: 1, dabs: [[9, 20, 'd'], [-2, 24, 'D'], [10, 22, 'D']] }),
      front({ hd: 4, dabs: [[-2, 27, 'd'], [9, 26, 'D'], [10, 27, 'd']] }),
    ],
  },
  up: {
    note: '', ms: four(200), loop: true,
    frames: [
      back({ hd: 4 }),
      back({ hd: 4, dabs: [[0, 0, 'd'], [-1, 2, 'D'], [7, 1, 'y']] }),
      back({ hd: 4, hx: 1, dabs: [[8, -1, 'd'], [-1, 1, 'D'], [9, 1, 'D']] }),
      back({ hd: 4, dabs: [[-2, 3, 'd'], [9, 2, 'D'], [8, 0, 'd']] }),
    ],
  },
};

// Couché à la bauge : sur le ventre, d'aplomb, la crinière en haut, les pattes repliées sous lui (les canons de devant sous le
// menton, le jarret derrière), la tête posée, l'œil fermé ; le dos gonfle à la respiration. Tout l'opposé du mort (sur le flanc,
// le ventre clair en l'air, les pattes raides qui sortent).
const BED_BODY = [
  ...BODY.slice(0, 11),
  '.GGBBBBBBBBBBBBGGGGGHH....', // 11 le jarret replié derrière, les canons de devant sous le menton
];
const BED: SidePose = { body: BED_BODY, legs: [], dy: 6, head: 1, headFrom: 16, eye: 'closed' };
export const bed: Record<Dir, Anim> = {
  right: {
    note: 'couche a la bauge, en boucle : sur le ventre, pattes repliees, il respire', ms: [1000, 1000], loop: true,
    frames: [sideLying(BED), sideLying({ ...BED, swell: [5, 13] })],
  },
  down: { note: '', ms: [1000, 1000], loop: true, frames: [front({ lie: true, hd: 1, eye: 'closed' }), front({ lie: true, hd: 1, eye: 'closed', breath: true })] },
  up: { note: '', ms: [1000, 1000], loop: true, frames: [back({ lie: true, hd: 1 }), back({ lie: true, hd: 1, breath: true })] },
};

// =====================================================================================================================
// LA MORT : il bascule sur le flanc
// =====================================================================================================================

// Couché sur le flanc, vu du ciel : le flanc d'en haut emplit l'image, le dos et sa crinière bordent le bas (au sud), le ventre
// clair le haut (au nord) ; les pattes sortent du ventre vers le nord, courtes, raides et en biais (les antérieurs vers la tête,
// les postérieurs vers l'arrière) : pas dressées. La tête n'est pas retournée : posée sur la joue, le groin clair au bout (à
// l'est), l'œil fermé (un trait) dans le haut de la tête, la défense qui pointe de la babine, l'oreille rabattue sur la nuque.
//                   0         1         2
//                   01234567890123456789012345
export const DEAD = [
  '..........................', // 0  (les pattes)
  '..........................', // 1
  '..........................', // 2
  '....VVVVVVVVVVVV..........', // 3  le ventre clair, au nord
  '..VVVVVVVVVVVVVVVBB.W.....', // 4  la défense pointe de la babine
  '.BVVVVVVVVVVVVVVBBBBBWBB..', // 5
  'CBBBBBBBBBBBBBBBBBBBEEBBSS', // 6  la queue ; l'œil fermé ; le groin
  'CBBBBBBBBBBBBBBBBBBGGGBBSS', // 7  la joue grise
  '.BBBBBBBBBBBBBBBBBBGGGBBSS', // 8
  '.BBBBBBBBBBBBBBBBBBBBBBBS.', // 9
  '..BBBBBBBBBBBBBBBBBCCBBB..', // 10 l'oreille rabattue
  '...UUUUUUUUUUUUUUUBB......', // 11 le dos, au sud
  '....CCCCCCCCCCCCC.........', // 12 la crinière, couchée le long du dos
];

/** Les pattes raides, courtes, en biais ; `k` : la part sortie (la bascule). */
const deadLegs = (k: number): Leg[] => ([
  [[5, 3], [2, 0], false], [[8, 3], [5, 0], true], [[13, 3], [16, 0], false], [[16, 4], [19, 1], true],
] as [P, P, boolean][]).map(([a, b, near]) => ({
  pts: [a, [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k)]] as P[], near, thigh: 1,
}));

/** Les zones du mort (pattes comprises), en 28 × 16 de marge pour l'éclairage. */
function deadZones(k = 1): Grid {
  const c = new Canvas(28, 15);
  const legs = deadLegs(k);
  for (const l of legs.filter((l) => !l.near)) drawLeg(c, l, 1, 1, () => 0);
  DEAD.forEach((r, y) => [...r].forEach((z, x) => { if (z !== EMPTY) c.set(1 + x, 1 + y, z); }));
  for (const l of legs.filter((l) => l.near)) drawLeg(c, l, 1, 1, () => 0);
  return c.toGrid();
}

/** Recadre une grille sur ses pixels pleins, avec une marge (pour le contour). */
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
function rotateCW(g: Grid): Grid {
  const h = g.length, w = g[0].length;
  return Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => g[h - 1 - x][y]).join(''));
}
/** Pose un dessin couché dans la frame de profil, son bas au sol (FOOT), décalé de `dx`. */
function inSide(g: Grid, dx = 0): Grid {
  const c = new Canvas(SIDE.w, SIDE.h).stamp(g, SIDE.ox - 1 + dx, FOOT - g.length + 1);
  return flatShadow(c.toGrid());
}

const lit = (z: Grid) => lightUp(trimPad(z), MATS);
export const dead = inSide(lit(deadZones(1)));

/** Le sanglier mort au sol, ses quatre vues (règle D) : est (tête à l'est), r1 tête au sud, r2 tête à l'ouest, r3 tête au nord. */
export const deadViews: Grid[] = (() => {
  const z = trimPad(deadZones(1));
  const r1 = rotateCW(z), r2 = rotateCW(r1), r3 = rotateCW(r2);
  return [z, r1, r2, r3].map((v) => castShadow(lightUp(v, MATS)));
})();

/** Les antérieurs qui cèdent (image 1). */
const BUCKLE: Leg[] = [STAND[0], L(false, [12, 11], [14, 14], [13, 17]), STAND[2], L(true, [15, 11], [17, 14], [16, 17])];
/** Écroulé sur le ventre, les pattes écartées sous lui (image 2). */
const SINK_BODY = [...BODY.slice(0, 11), '..BBBBB....BBBBBBB........'];
const SINK_LEGS: Leg[] = [
  { pts: [[7, 11], [6, 12]], near: false, thigh: 1 }, { pts: [[12, 11], [14, 12]], near: false, thigh: 1 },
  { pts: [[4, 11], [2, 12]], near: true, thigh: 1 }, { pts: [[15, 11], [18, 12]], near: true, thigh: 1 },
];

export const death: Anim = {
  note: '1 les anterieurs cedent, 2 il s ecroule sur le ventre, 3 il roule sur le flanc, les pattes sortent, 4 couche sur le flanc (tenu)',
  ms: [150, 180, 200, 1500], loop: false,
  frames: [
    side({ legs: BUCKLE, neck: 2, head: 2, sag: 1 }),
    sideLying({ body: SINK_BODY, legs: SINK_LEGS, dy: 5, head: 2, headFrom: 15, eye: 'closed' }),
    inSide(lit(deadZones(0.4))),
    dead,
  ],
};

export const anims = { walk, tell, charge, impact, dazed, root, bed };
