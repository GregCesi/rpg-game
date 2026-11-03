// Proposition de dessin (chantier « la tempête ») : ce que la tempête de la nuit a laissé dans le bois, hors du jeu, à faire
// valider par Grégoire avant toute intégration. Planche : npx tsx tools/essai-tempete.ts (.art-preview/tempete.png).
//
// Les arbres couchés par la tempête (venue de l'ouest) sont des arbres normaux (art/world/normal-*.ts) : même écorce
// (`bark`, NORMAL_WOOD de art/world/wood.ts, rampe M m N K), même bois frais à la cassure (la rampe du bois travaillé, neuf :
// ^ * % &), même pied que l'arbre debout. Lumière en haut à gauche, contour d'un pixel (le plus sombre de la matière en haut
// et à gauche, OUTLINE en bas et à droite), ombre portée `x`.
//
// 1. Le chicot (`snag`) : l'arbre normal cassé debout à 2,5 m. Tronc de 30 cm (6 px d'écorce, 8 px contour compris), le pied
//    évasé de l'arbre debout (mêmes racines, mêmes sillons, rangée pour rangée), la cassure en esquilles : du côté du vent
//    (l'ouest, à gauche) les fibres arrachées en tension restent hautes, en longues esquilles ; du côté où l'arbre est tombé
//    (l'est) le bois écrasé en compression casse bas. La face arrachée, vue d'en haut, est du bois frais clair. Deux moignons
//    de branches mortes cassées (une à droite à 1,8 m, une petite à gauche à 1,3 m). Une seule vue (`round`).
//    dims : 65 × 55 × 290 cm, boîte (largeur des racines et des moignons ; cassé entre 2,45 et 2,6 m, les esquilles du côté
//    du vent jusqu'à 2,9 m) : 13 × (58 + 5,5) = 13 × 63,5 px.
//
// 2. L'arbre déraciné : la galette de racines (`root-plate`), dressée debout au pied de l'arbre couché, et le trou
//    (`root-hole`) qu'elle a laissé, à plat dans le sol.
//    - Galette : un disque de terre et de racines de 1,60 m de diamètre (contour compris) et 40 cm d'épaisseur, dressé dans
//      le plan nord-sud quand l'arbre est couché vers l'est. Vue est-ouest (`rootPlateEast`, l'arbre couché vers l'est, la
//      galette à son bout ouest) : on la voit par la tranche, comme le bout d'une bille (gabarit : le bout d'un cylindre couché
//      est-ouest est un ovale de Ø/2 de large pour Ø de haut) ; la face tournée vers la lumière (l'ouest) est le dessous de la
//      motte, terre arrachée et bouts de racines cassées ; la tranche (40 cm, 8 px) s'étire vers l'est, et le bord de la face
//      est (l'ancien sol, l'herbe) la frange. 8 + 16 = 24 px de large, Ø × 1,12 = 36 px de haut.
//      Vue de face (`rootPlateFace`, l'arbre couché vers le nord, la galette à son bout sud) : le disque entier, 32 px, et son
//      dessus en raccourci (40 cm ÷ 2 = 4 px) : 32 × 36 px.
//    - Trou : la place de la motte, un peu plus petit qu'elle (la terre est retombée), 150 × 140 cm, à plat (`flat`, sans
//      raccourci : le sol se voit à 5 cm par pixel) : 30 × 28 px ; terre retournée en mottes sur son bord, la paroi nord-ouest
//      dans l'ombre, la paroi sud-est au jour, un fond d'eau de pluie. Pas de contour (c'est du sol), pas d'ombre portée.
//    La galette se pose contre le pied du tronc couché (`normal-felled-tree`, à la place de son bout scié) ; le trou à
//    l'ouest d'elle, sous sa base : `UPROOTED` donne les places, dans le repère de l'image de l'arbre couché.

import { Canvas, EMPTY, rng, type Grid } from '../lib/canvas';
import { outline } from '../items/lib';
import { world } from '../palette';
import { groundShadow } from '../world/big-tree';
import { NORMAL_WOOD, bark } from '../world/wood';
import { FOOT as TREE_FOOT, TRUNK_X0 as TREE_TRUNK_X0 } from '../world/normal-geometry';

export const palette = world;

/** Dimensions réelles proposées (cm), forme du gabarit, et la taille attendue à l'écran (px). */
export const DIMS = {
  snag: { w: 65, d: 55, h: 290, shape: 'box' as const },
  plateEast: { w: 40, d: 170, h: 170, shape: 'box' as const },
  plateFace: { w: 170, d: 40, h: 170, shape: 'box' as const },
  hole: { w: 150, d: 140, h: 0, shape: 'flat' as const },
};

/** Teinte la plus sombre de chaque matière : le contour côté lumière (STYLE.md, section 3). */
const DARKEST: Record<string, string> = {
  M: 'K', m: 'K', N: 'K', K: 'K', '^': 'K', '*': 'K', '%': 'K', '&': 'K',
  // terre (dessous de la motte) : humus brun-violet
  u: '5', n: '5', F: '5', f: '5', e: '5', '2': '5', '9': '5', '3': '5', '5': '5',
  // herbe de l'ancien sol
  G: 'V', g: 'V', v: 'V', V: 'V', y: 'V',
  // cailloux
  R: 'Z', r: 'Z', z: 'Z', Z: 'Z',
};
const contour = (c: Canvas) => outline(c, (k) => DARKEST[k] ?? 'o');

/** Un pixel sans voisin de sa couleur prend la couleur majoritaire de ses voisins peints (pas de point isolé). */
function despeckle(c: Canvas, keep = ''): Canvas {
  const fix: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const p = c.get(x, y);
    if (p === EMPTY || keep.includes(p)) continue;
    const ns = [c.get(x + 1, y), c.get(x - 1, y), c.get(x, y + 1), c.get(x, y - 1)].filter((n) => n !== EMPTY);
    if (!ns.length || ns.includes(p)) continue;
    const count: Record<string, number> = {};
    for (const n of ns) count[n] = (count[n] ?? 0) + 1;
    fix.push([x, y, Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]]);
  }
  for (const [x, y, k] of fix) c.px[y][x] = k;
  return c;
}

// ---------- 1. Le chicot ----------

export const SNAG_W = 24;
export const SNAG_H = 72;
/** Le pied du tronc (rangée du contour sous le tronc), comme FOOT de l'arbre debout. */
export const SNAG_FOOT: [number, number] = [12, 66];
/** Décalage du repère de l'arbre debout à celui du chicot : les sillons et l'évasement sont ceux de l'arbre, rangée pour rangée. */
const SDX = TREE_FOOT[0] - SNAG_FOOT[0];
const SDY = TREE_FOOT[1] - SNAG_FOOT[1];
const X0 = TREE_TRUNK_X0 - SDX;
const X1 = X0 + NORMAL_WOOD.diameter - 1;
/** Évasement du pied (normal-tree.ts, FLARE), depuis la dernière rangée d'écorce. */
const FLARE: [number, number][] = [[-2, 2], [-1, 2], [-1, 1], [0, 1], [0, 1]];

/**
 * La cassure, colonnes X0 à X1 + 1, à partir de la rangée BREAK_TOP : '.' vide, sinon la teinte. À gauche (le vent venait de
 * l'ouest), les fibres arrachées en tension restent hautes : deux longues esquilles, l'écorce sur leur dos ; au milieu, la face
 * arrachée vue d'en haut, bois frais (^ au jour, * et % dans le fil) ; à droite le bois écrasé en compression, bas et sombre
 * (% &), et une lanière de bois arrachée qui pend vers l'est, où la tête est tombée. Sous la dernière rangée, l'écorce reprend.
 */
const BREAK_TOP = 4;
const BREAK: string[] = [
  '^......',
  '^......',
  '^*.....',
  'M^.....',
  'M^..^..',
  'M*.^*..',
  'M%.^^..',
  'M*^*%^.',
  'M%^^*^^',
  'MM^^*%*',
  'MM*^^%%',
  'MMm**%.',
  'MMmm%&.',
];

export function snagBody(): Canvas {
  const c = new Canvas(SNAG_W, SNAG_H);
  const [, FY] = SNAG_FOOT;
  const top = BREAK_TOP + BREAK.length;
  for (let y = top; y < FY; y++) {
    const [dl, dr] = FLARE[FY - 1 - y] ?? [0, 0];
    const x0 = X0 + dl, x1 = X1 + dr, w = x1 - x0 + 1;
    for (let x = x0; x <= x1; x++) c.set(x, y, bark(y + SDY, (x + 0.5 - x0) / w, NORMAL_WOOD));
  }
  BREAK.forEach((row, j) => [...row].forEach((k, i) => { if (k !== '.') c.set(X0 + i, BREAK_TOP + j, k); }));
  // l'ombre de la cassure sur le haut du fût, côté est
  for (let y = top; y < top + 3; y++) c.set(X1, y, 'K');
  // une fente qui descend de la cassure dans le fût (le bois s'est ouvert en cassant), côté jour
  for (let y = top; y < top + 6; y++) c.set(X0 + 2 + (y > top + 2 ? 1 : 0), y, 'N');
  // moignon de branche à droite, 1,8 m (36 px au-dessus du pied), qui monte vers la droite ; bout cassé, bois frais
  const by = FY - 36;
  c.set(X1 + 1, by, 'M').set(X1 + 1, by + 1, 'N');
  c.set(X1 + 2, by - 1, 'M').set(X1 + 2, by, 'N');
  c.set(X1 + 3, by - 2, '^').set(X1 + 3, by - 1, '*');
  // petit moignon à gauche, 1,3 m, vers le haut à gauche
  const ly = FY - 26;
  c.set(X0 - 1, ly, 'M').set(X0 - 1, ly + 1, 'm');
  c.set(X0 - 2, ly - 1, '^').set(X0 - 2, ly, '*');
  return c;
}

/** Le chicot, avec contour et ombre portée. */
export function snag(): Grid {
  const c = contour(snagBody());
  groundShadow(c, SNAG_FOOT[0] + 1.5, SNAG_FOOT[1] + 0.5, 6.5, 1.8);
  return c.toGrid();
}

// ---------- 2. La galette de racines ----------

/** Grain de la terre : une valeur par bloc de 2 × 2. */
function grain(seed: number) {
  const r = rng(seed);
  const cells = new Map<string, number>();
  return (x: number, y: number) => {
    const k = `${x >> 1},${y >> 1}`;
    if (!cells.has(k)) cells.set(k, r());
    return cells.get(k)!;
  };
}

/**
 * Une face de motte : un ovale bosselé (jamais un œuf : le bord se gonfle et se creuse en mottes, le bas s'écrase au sol).
 * `lumps` : [amplitude, fréquence, phase] des bosses du bord.
 */
interface Face { cx: number; cy: number; rx: number; ry: number; lumps: [number, number, number][]; flat: number }

/** Le rayon relatif du bord de la face dans la direction θ. */
function edge(f: Face, th: number): number {
  return 1 + f.lumps.reduce((s, [a, k, p]) => s + a * Math.sin(k * th + p), 0);
}

/** Le pixel (x, y) est-il dans la face, poussée de (dx, dy) ? */
function inFace(f: Face, x: number, y: number, dx = 0, dy = 0): boolean {
  const u = (x + 0.5 - f.cx - dx) / f.rx, v = (y + 0.5 - f.cy - dy) / f.ry;
  if (v > f.flat) return false; // le bas, écrasé au sol
  return Math.hypot(u, v) <= edge(f, Math.atan2(v, u));
}

/** Coordonnées relatives (u, v) du pixel dans la face. */
const rel = (f: Face, x: number, y: number) => [(x + 0.5 - f.cx) / f.rx, (y + 0.5 - f.cy) / f.ry] as const;

/**
 * La terre du dessous de la motte : au jour en haut à gauche, sombre en bas à droite, en grain de mottes (2 × 2 px) ; çà et là
 * un creux sombre, là où une racine s'est arrachée de la terre.
 */
function paintEarth(c: Canvas, f: Face, seed: number) {
  const g = grain(seed);
  const r = rng(seed + 1);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!inFace(f, x, y)) continue;
    const [u, v] = rel(f, x, y);
    const l = -(u + v) / Math.SQRT2 + (g(x, y) - 0.5) * 0.55;
    c.set(x, y, l > 0.5 ? 'e' : l > 0.0 ? '2' : l > -0.55 ? '9' : '3');
  }
  // creux : des poches sombres irrégulières, là où une racine s'est arrachée (une rangée large, une plus courte dessous)
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2, d = 0.35 + r() * 0.45;
    const x = Math.round(f.cx + Math.cos(a) * d * f.rx), y = Math.round(f.cy + Math.sin(a) * d * f.ry);
    const w = r() < 0.5 ? 2 : 3;
    for (let k = 0; k < w; k++) if (inFace(f, x + k, y)) c.set(x + k, y, '3');
    for (let k = 1; k < w; k++) if (inFace(f, x + k, y + 1)) c.set(x + k, y + 1, k === 1 ? '5' : '3');
  }
  despeckle(c);
}

/**
 * Une racine cassée, du collet vers le bord : une ligne qui se courbe (`bend` radians par unité de rayon), épaisse de 2 px sur
 * sa première moitié si `thick`, une branche fine qui s'en détache à mi-longueur ; sur son côté au jour le pixel clair (M),
 * dessous le corps (m), et son ombre sur la terre juste sous elle. Le bout, s'il sort de la motte, est cassé : bois frais (^).
 */
function root(c: Canvas, f: Face, deg: number, len: number, bend: number, thick: boolean, branch = 0) {
  const pts: [number, number][] = [];
  const walk = (a0: number, r0: number, r1: number, b: number, w: boolean) => {
    let a = a0;
    let lastKey = '';
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const r = r0 + (r1 - r0) * (i / steps);
      a += (b * (r1 - r0)) / steps;
      const x = Math.floor(f.cx + Math.cos(a) * r * f.rx);
      const y = Math.floor(f.cy + Math.sin(a) * r * f.ry);
      const key = `${x},${y}`;
      if (key === lastKey) continue;
      lastKey = key;
      const fat = w && i < steps * 0.8;
      const horiz = Math.abs(Math.cos(a) * f.rx) > Math.abs(Math.sin(a) * f.ry);
      // l'ombre de la racine sur la terre, du côté opposé au jour
      const [sx, sy] = horiz ? [x, y + (fat ? 1 : 1)] : [x + 1, y];
      if (inFace(f, sx, sy) && !'mMN^'.includes(c.get(sx, sy))) c.set(sx, sy, '3');
      const shade = Math.sin(a) + Math.cos(a) > 0.6; // la racine qui part vers le bas à droite reste dans l'ombre
      c.set(x, y, shade ? 'N' : 'm');
      if (fat) {
        const [lx, ly] = horiz ? [x, y - 1] : [x - 1, y];
        c.set(lx, ly, shade ? 'm' : 'M');
      }
      pts.push([x, y]);
    }
    return a;
  };
  const end = walk((deg * Math.PI) / 180, 0.22, len, bend, thick);
  const [ex, ey] = pts[pts.length - 1];
  if (!inFace(f, ex, ey)) c.set(ex, ey, '^');
  if (branch) {
    const mid = 0.22 + (len - 0.22) * 0.5;
    const a = (deg * Math.PI) / 180 + (bend * (mid - 0.22));
    walk(a + branch, mid, mid + (len - mid) * 0.75, -bend, false);
  }
  void end;
}

/** Le collet : le pied du tronc vu par-dessous, l'écorce en rond, le pivot arraché au milieu (bois frais). */
function collar(c: Canvas, f: Face, rx: number, ry: number) {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const u = (x + 0.5 - f.cx) / rx, v = (y + 0.5 - f.cy) / ry;
    const r = Math.hypot(u, v);
    if (r > 1) continue;
    c.set(x, y, r < 0.5 ? (u + v < 0 ? '^' : '*') : u + v < -0.3 ? 'M' : u + v > 0.5 ? 'N' : 'm');
  }
}

/** Cailloux pris dans la terre : x, y, largeur (2 rangées : dessus au jour, dessous à l'ombre). */
function stones(c: Canvas, list: [number, number, number][]) {
  for (const [sx, sy, w] of list) {
    for (let i = 0; i < w; i++) { c.set(sx + i, sy, i === 0 ? 'R' : 'r'); c.set(sx + i, sy + 1, i === w - 1 ? 'Z' : 'z'); }
  }
}

/**
 * Bouts de racines cassées qui sortent de la face vers nous (le dessous de la motte en est hérissé) : une section de bois
 * frais (^ au jour, * à l'ombre) sur une rangée, l'écorce et son ombre dessous (N, puis la terre sombre).
 */
function stubs(c: Canvas, list: [number, number, number][]) {
  for (const [x, y, w] of list) {
    for (let i = 0; i < w; i++) {
      c.set(x + i, y, i === 0 ? '^' : '*');
      c.set(x + i, y + 1, 'N');
    }
    c.set(x + w, y + 1, '3');
  }
}

/**
 * La frange : des racines arrachées qui dépassent du bord de la motte de 1 à 3 px, vers l'extérieur (angles en degrés, 0
 * vers la droite) ; le bout clair si `broken`, sinon l'écorce qui s'effile.
 */
function fringe(c: Canvas, f: Face, list: [number, number, boolean][]) {
  for (const [deg, out, broken] of list) {
    const a = (deg * Math.PI) / 180;
    const e = edge(f, a);
    let last: [number, number] = [0, 0];
    for (let r = e * 0.85; r <= e + out / Math.min(f.rx, f.ry) * 1.6; r += 0.02) {
      const x = Math.floor(f.cx + Math.cos(a) * r * f.rx);
      const y = Math.floor(f.cy + Math.sin(a) * r * f.ry);
      if (x === last[0] && y === last[1]) continue;
      c.set(x, y, Math.sin(a) + Math.cos(a) > 0.4 ? 'N' : 'm');
      last = [x, y];
    }
    if (broken) c.set(last[0], last[1], '^');
  }
}

/** Herbe de l'ancien sol : une rampe de touffes, du jour à l'ombre. */
const GRASS = ['G', 'g', 'v', 'V'];

/** Vue est-ouest de la galette (l'arbre couché vers l'est) : environ 24 × 36 px contour compris, avec une marge. */
export const PLATE_E_W = 32;
export const PLATE_E_H = 42;
/** La face ouest (le dessous de la motte), l'ovale du bout : Ø/2 × Ø, contour compris, bosselé. */
const FACE_E: Face = { cx: 10, cy: 22.5, rx: 7, ry: 16.6, lumps: [[0.05, 3, 0.7], [0.04, 5, 2.1], [0.03, 8, 4]], flat: 0.93 };
/** Épaisseur de la galette : 40 cm, la tranche s'étire de 8 px vers l'est ; le bord est remonte de 2 px (le dessus). */
const THICK = 8;
const RISE = 2;

export function rootPlateEastBody(): Canvas {
  const c = new Canvas(PLATE_E_W, PLATE_E_H);
  const g = grain(71);
  // la tranche : l'union des faces poussées vers l'est (et un peu vers le haut : on voit le dessus)
  const tOf = (x: number, y: number) => {
    for (let t = THICK; t >= 0; t -= 0.5) if (inFace(FACE_E, x, y, t, (-t * RISE) / THICK)) return t;
    return -1;
  };
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const t = tOf(x, y);
    if (t < 0) continue;
    // le bord de la motte, terre arrachée : au jour en haut, à l'ombre en bas
    const v = (y + 0.5 - FACE_E.cy) / FACE_E.ry;
    const l = -v * 1.1 + (g(x, y) - 0.5) * 0.6;
    c.set(x, y, l > 0.6 ? 'n' : l > 0.05 ? 'e' : l > -0.5 ? '2' : '9');
  }
  despeckle(c);
  // l'ancien sol, l'herbe, sur le bord est de la tranche (3 px, la motte de gazon), du haut aux deux tiers ; elle déborde
  // un peu en haut, en touffes
  for (let y = 0; y < c.h; y++) {
    let xr = -1;
    for (let x = c.w - 1; x >= 0; x--) if (c.get(x, y) !== EMPTY) { xr = x; break; }
    if (xr < 0) continue;
    const v = (y + 0.5 - (FACE_E.cy - RISE)) / FACE_E.ry;
    if (v > 0.5) continue;
    const k = v < -0.55 ? 0 : v < 0 ? 1 : 2;
    c.set(xr + 1, y, GRASS[Math.min(3, k + 1)]);
    c.set(xr, y, GRASS[k]);
    if (v < 0.25) c.set(xr - 1, y, GRASS[k]);
    if (v > 0.3) c.set(xr - 1, y, '2');
  }
  // touffes qui dépassent au sommet de la tranche et sur l'arête est
  for (const [x, y, k] of [[17, 6, 'G'], [18, 5, 'G'], [19, 5, 'g'], [20, 6, 'g'], [24, 9, 'g'], [25, 10, 'v'], [25, 11, 'v'], [12, 6, 'G'], [13, 6, 'G']] as [number, number, string][]) {
    c.set(x, y, k);
  }
  paintEarth(c, FACE_E, 73);
  stones(c, [[7, 12, 2], [12, 28, 3], [5, 30, 2]]);
  // racines : quatre grosses qui partent du collet en se tordant, deux fines qui ne partent pas du centre
  root(c, FACE_E, -140, 1.0, 0.9, true);
  root(c, FACE_E, -60, 0.9, -0.8, false);
  root(c, FACE_E, 40, 0.95, 0.9, true);
  root(c, FACE_E, 150, 1.0, -0.7, true);
  stubs(c, [[8, 10, 2], [6, 20, 2], [11, 30, 1], [8, 34, 2]]);
  fringe(c, FACE_E, [[-178, 2, true], [-155, 1, false], [-125, 1, true], [165, 2, true], [192, 1, false], [140, 1, true]]);
  collar(c, FACE_E, 1.8, 3.2);
  return c;
}

/** La galette, l'arbre couché vers l'est : contour et ombre portée (vers le sud-est, sous sa base). */
export function rootPlateEast(): Grid {
  const c = contour(rootPlateEastBody());
  groundShadow(c, 15, 37.5, 11, 2);
  return c.toGrid();
}

/** Vue de face de la galette (l'arbre couché vers le nord) : environ 32 × 36 px contour compris, avec une marge. */
export const PLATE_F_W = 40;
export const PLATE_F_H = 44;
const FACE_F: Face = { cx: 19, cy: 25.5, rx: 15, ry: 16.2, lumps: [[0.05, 3, 2.2], [0.04, 5, 0.3], [0.025, 9, 1]], flat: 0.93 };
/** Le dessus de la tranche, en raccourci : 40 cm ÷ 2 = 4 px. */
const TOP = 4;

export function rootPlateFaceBody(): Canvas {
  const c = new Canvas(PLATE_F_W, PLATE_F_H);
  const g = grain(91);
  // le dessus de la tranche : la face poussée vers le nord (vers le haut) de TOP px, terre, et sur l'arête nord le gazon
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    let ok = false;
    for (let s = 0; s <= TOP; s += 0.5) if (inFace(FACE_F, x, y, 0, -s)) { ok = true; break; }
    if (!ok) continue;
    const u = (x + 0.5 - FACE_F.cx) / FACE_F.rx;
    const l = -u * 0.8 + (g(x, y) - 0.5) * 0.6;
    c.set(x, y, l > 0.35 ? 'n' : l > -0.3 ? 'e' : '2');
  }
  despeckle(c);
  // le gazon de l'ancien sol sur l'arête nord : trois pixels du haut de chaque colonne, des touffes qui dépassent
  const r = rng(92);
  for (let x = 0; x < c.w; x++) {
    let yt = -1;
    for (let y = 0; y < c.h; y++) if (c.get(x, y) !== EMPTY) { yt = y; break; }
    if (yt < 0) continue;
    const u = (x + 0.5 - FACE_F.cx) / FACE_F.rx;
    if (Math.abs(u) > 0.85) continue;
    const k = u < -0.3 ? 0 : u < 0.35 ? 1 : 2;
    c.set(x, yt, GRASS[k]);
    c.set(x, yt + 1, GRASS[k]);
    c.set(x, yt + 2, GRASS[k + 1]);
    if (r() < 0.45 && Math.abs(u) < 0.7) c.set(x, yt - 1, GRASS[k]);
  }
  paintEarth(c, FACE_F, 93);
  stones(c, [[9, 17, 3], [26, 32, 2], [12, 33, 2], [28, 17, 2]]);
  root(c, FACE_F, -150, 0.95, 0.9, true);
  root(c, FACE_F, -70, 0.9, -0.8, false);
  root(c, FACE_F, 0, 1.0, 0.8, true);
  root(c, FACE_F, 75, 0.85, -0.9, false);
  root(c, FACE_F, 150, 1.0, 0.7, true);
  stubs(c, [[13, 16, 2], [24, 20, 2], [9, 26, 2], [21, 33, 2], [28, 28, 1]]);
  fringe(c, FACE_F, [[-172, 1, true], [-140, 1, false], [-112, 1, true], [-35, 1, false], [-8, 1, true], [22, 1, false], [40, 1, true], [145, 1, false], [168, 1, true], [195, 1, false]]);
  collar(c, FACE_F, 3.3, 3.3);
  return c;
}

export function rootPlateFace(): Grid {
  const c = contour(rootPlateFaceBody());
  groundShadow(c, 22, 41.5, 15, 2);
  return c.toGrid();
}

// ---------- Le trou ----------

export const HOLE_W = 30;
export const HOLE_H = 28;

/**
 * Le trou, à plat : une couronne de terre retournée en mottes (le sol, l'herbe, se voit entre), la paroi nord-ouest dans
 * l'ombre (elle tourne le dos au soleil), la paroi sud-est au jour, le fond sombre et une flaque de pluie ; deux bouts de
 * racines arrachées dans la paroi nord. Sans contour (c'est du sol) ni ombre portée.
 */
export function rootHole(): Grid {
  const c = new Canvas(HOLE_W, HOLE_H);
  const f: Face = { cx: HOLE_W / 2, cy: HOLE_H / 2, rx: HOLE_W / 2, ry: HOLE_H / 2, lumps: [[0.04, 3, 1.3], [0.03, 6, 0.2]], flat: 2 };
  const g = grain(55);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!inFace(f, x, y)) continue;
    const [u, v] = rel(f, x, y);
    const d = Math.hypot(u, v) / edge(f, Math.atan2(v, u));
    if (d > 0.76) {
      // terre retournée : des mottes, claires au jour, qui ne couvrent pas tout le bord
      const n = g(x, y);
      if (n < 0.25) continue;
      c.set(x, y, n > 0.75 ? 'n' : n > 0.5 ? 'e' : '2');
      continue;
    }
    // le creux : la paroi selon son orientation ; l'ombre au nord-ouest, le jour au sud-est, le fond plus sombre
    const lit = (u + v) / Math.SQRT2;
    const depth = 1 - d / 0.76;
    let k = lit > 0.3 ? 'e' : lit > -0.05 ? '2' : lit > -0.4 ? '9' : '3';
    if (lit < -0.6 && d > 0.66) k = '5'; // juste sous le bord nord-ouest, l'ombre portée du bord
    if (depth > 0.6 && k === 'e') k = '2';
    c.set(x, y, k);
  }
  // la flaque au fond, un peu au sud du centre
  const puddle = new Canvas(c.w, c.h).ellipse(f.cx + 3, f.cy + 3.5, 3.5, 1.8, 'q');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (puddle.get(x, y) !== EMPTY) c.set(x, y, 'q');
  const px = Math.floor(f.cx + 2), py = Math.floor(f.cy + 3);
  c.set(px - 1, py, 'W').set(px, py, 'W');
  // deux bouts de racines arrachées dans la paroi nord, bout cassé clair
  c.set(10, 6, 'm').set(11, 6, 'm').set(12, 7, '^');
  c.set(19, 5, 'm').set(20, 6, 'm').set(20, 7, '^');
  return despeckle(c, 'W^qm').toGrid();
}

/**
 * L'ensemble, dans le repère de l'image de l'arbre couché vers l'est (`normal-felled-tree`, 140 × 22, le bout scié en x = 0,
 * le tronc sur les rangées 6 à 13, son axe au sol vers la rangée 9,5) : coin haut gauche de chaque image. La galette couvre le
 * bout scié (le pied du tronc entre dans la motte, sous sa tranche) ; son bas est le bord sud de la motte au sol, 80 cm au sud
 * de l'axe du tronc (16 px) ; le trou, centré sur l'axe du tronc, à l'ouest, sous la base de la galette.
 */
export const UPROOTED = {
  plate: [-21, -12] as [number, number],
  hole: [-41, -5] as [number, number],
};
