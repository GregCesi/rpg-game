// La tempête (docs/CONCEPTION.md, « La tempête ») : ce que la tempête de la nuit, venue de l'ouest, a laissé dans le bois.
// Planche de contrôle : npx tsx tools/essai-tempete.ts (.art-preview/tempete.png), tirée de ces dessins.
//
// Les arbres couchés par la tempête sont des arbres normaux (art/world/normal-*.ts) : même écorce (`bark`, NORMAL_WOOD de
// art/world/wood.ts, rampe M m N K), même bois frais à la cassure (la rampe du bois travaillé, neuf : ^ * % &), même pied que
// l'arbre debout. Lumière en haut à gauche, contour d'un pixel (le plus sombre de la matière en haut et à gauche, OUTLINE en
// bas et à droite), ombre portée `x`. Pas de bois travaillé ici : pas d'âges.
//
// Les images (clés d'image) :
// - `normal-snag` : le chicot, l'arbre normal cassé debout vers 2,5 m. Une vue (rond). Même pied et même ancrage que l'arbre
//   normal : le pied du tronc à la colonne SNAG_FOOT[0], six rangées sous lui (l'ombre), comme FOOT de `normal-tree`.
//   dims : 65 × 55 × 290 cm, boîte : 13 × 63,5 px.
// - `normal-snag-top` : sa cime, couchée vers l'est (cassure à l'ouest), découpée dans l'arbre couché du jeu
//   (`normal-felled-tree`) par le même profil de cassure (`PROFILE`) : chicot + cime = l'arbre entier, en longueur et en
//   matière. Quatre vues, couchée (règle D) : `-r2` découpée de `normal-felled-tree-left` par le profil retourné ; `-r1` et
//   `-r3` (nord-sud) sont la vue est-ouest de même sens transposée (x ↔ y), ce qui garde la lumière en haut à gauche et donne
//   exactement les dimensions inversées.
// - `root-plate` : la galette de racines dressée au pied de l'arbre déraciné. Quatre vues : la base, l'arbre couché vers l'est
//   (la galette à son bout ouest, vue de profil, sa face de terre tournée vers l'ouest) ; `-r1`, couché vers le sud (on voit
//   l'ancien dessus, l'herbe, où le tronc entrait) ; `-r2`, couché vers l'ouest (l'autre profil, la face de terre à l'est, dans
//   l'ombre) ; `-r3`, couché vers le nord (la face de terre et ses racines, de face).
//   Un disque de terre et de racines d'environ 1,10 m (la motte), 1,50 m racines comprises, 30 cm d'épaisseur.
// - `uprooted-hole` : le trou que la motte a laissé, à plat dans le sol, 115 × 105 cm. Une vue.
//
// Les places relatives (pour poser les objets dans les cartes) : `UPROOTED` (galette et trou par rapport à l'arbre couché vers
// l'est) et `SNAG_TOP_AT` (la cime couchée à côté du chicot), en coins bas gauches d'images.

import { Canvas, EMPTY, rng, type Grid } from '../lib/canvas';
import type { ArtSource, ImageSource } from '../lib/types';
import { outline } from '../items/lib';
import { world } from '../palette';
import { groundShadow } from './big-tree';
import { NORMAL_WOOD, bark } from './wood';
import { FOOT as TREE_FOOT, TRUNK_X0 as TREE_TRUNK_X0 } from './normal-geometry';
import './normal-felled';
import { treeArt } from './tree-registry';

export const palette = world;

/** Dimensions réelles (cm), forme du gabarit (src/content/gabarit.ts). */
export const DIMS = {
  snag: { w: 65, d: 55, h: 290, shape: 'box' as const },
  /**
   * La galette, l'arbre couché vers l'est (vue de base) : un disque dressé de 1,10 m (la motte), 1,50 m racines comprises,
   * 30 cm d'épaisseur. Pour le gabarit, un cylindre couché est-ouest très court : `d` 150 (sa largeur nord-sud, racines
   * comprises), `h` 125 (sa hauteur, le bas écrasé au sol) ; `w` 110, ce que la vue de profil occupe d'est en ouest : la
   * face de terre en ovale de Ø/2 (comme le bout d'une bille, STYLE.md section 8), la tranche de 30 cm, les racines qui en
   * sortent. Base 22 × 28 px, de face (r1, r3 : largeur et profondeur échangées) 30 × 28 px.
   */
  plate: { w: 110, d: 150, h: 125, shape: 'cylinder' as const, axis: 'ew' as const },
  hole: { w: 115, d: 105, h: 0, shape: 'flat' as const },
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

/** Le cadre des pixels peints (ombre comprise). */
function bounds(c: Canvas): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) === EMPTY) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Recadre une image sur ses pixels peints ; `at` : le coin haut gauche du recadrage dans l'image d'origine. */
function crop(c: Canvas): { c: Canvas; at: [number, number] } {
  const b = bounds(c);
  return { c: Canvas.from(c.toGrid().slice(b.y, b.y + b.h).map((r) => r.slice(b.x, b.x + b.w))), at: [b.x, b.y] };
}

/** L'image transposée (x ↔ y) : un quart de tour et un miroir, la lumière reste en haut à gauche. */
function transpose(c: Canvas): Canvas {
  const t = new Canvas(c.h, c.w);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) t.px[x][y] = c.px[y][x];
  return t;
}

// ---------- 1. Le chicot ----------

export const SNAG_W = 24;
export const SNAG_H = 70;
/** Le pied du tronc (rangée du contour sous le tronc), comme FOOT de l'arbre debout : six rangées dessous, l'ombre. */
export const SNAG_FOOT: [number, number] = [12, 63];
/** Décalage du repère de l'arbre debout à celui du chicot : les sillons et l'évasement sont ceux de l'arbre, rangée pour rangée. */
const SDX = TREE_FOOT[0] - SNAG_FOOT[0];
const SDY = TREE_FOOT[1] - SNAG_FOOT[1];
const X0 = TREE_TRUNK_X0 - SDX;
const X1 = X0 + NORMAL_WOOD.diameter - 1;
/** Évasement du pied (normal-tree.ts, FLARE), depuis la dernière rangée d'écorce. */
const FLARE: [number, number][] = [[-2, 2], [-1, 2], [-1, 1], [0, 1], [0, 1]];

/**
 * Le profil de la cassure, partagé par le chicot et sa cime (la matière se conserve : ce qui manque à l'un est l'autre) : pour
 * chaque colonne d'écorce du fût (0 à l'ouest, 5 à l'est), la longueur du chicot depuis le pied, en pixels. À l'ouest (le vent
 * venait de là), les fibres arrachées en tension restent hautes, en longues esquilles (jusqu'à 61 px, 3 m) ; à l'est, où la
 * tête est tombée, le bois écrasé en compression casse bas (50 px, 2,5 m). Couché vers l'est, l'ouest du fût devient le dessus
 * du tronc : la colonne c du chicot debout est la rangée TRUNK_ROWS[0] + c de l'arbre couché.
 */
export const PROFILE = [61, 59, 54, 56, 52, 50];
const BREAK_LOW = Math.min(...PROFILE);
const BREAK_HIGH = Math.max(...PROFILE);

/** Teinte de la cassure du chicot debout, colonne `c`, `k` pixels sous la pointe de son esquille. */
function splinterTone(c: number, k: number, y: number): string {
  if (k === 0) return c >= 4 ? '*' : '^';
  if (c === 0) return 'M'; // l'écorce reste sur le dos de l'esquille ouest
  if (c === 5) return k > 1 ? 'N' : '%';
  // le fil : une fibre plus sombre toutes les trois rangées, décalée d'une colonne à l'autre
  const fibre = (y + c) % 3 === 0;
  return [, fibre ? '*' : '^', fibre ? '%' : '^', fibre ? '%' : '*', fibre ? '&' : '%'][c] as string;
}

function snagBody(): Canvas {
  const c = new Canvas(SNAG_W, SNAG_H);
  const [, FY] = SNAG_FOOT;
  for (let y = 0; y < FY; y++) {
    const [dl, dr] = FLARE[FY - 1 - y] ?? [0, 0];
    const x0 = X0 + dl, x1 = X1 + dr, w = x1 - x0 + 1;
    for (let x = x0; x <= x1; x++) {
      const col = x - X0;
      const len = PROFILE[Math.max(0, Math.min(5, col))];
      if (FY - y > len) continue;
      // au-dessus de la cassure la plus basse (et deux rangées dessous, le dessus arraché qu'on voit d'en haut) : bois frais
      if (FY - y > BREAK_LOW - 2 && col >= 0 && col <= 5) c.set(x, y, splinterTone(col, len - (FY - y), y));
      else c.set(x, y, bark(y + SDY, (x + 0.5 - x0) / w, NORMAL_WOOD));
    }
  }
  const top = FY - BREAK_LOW + 2;
  // l'ombre de la cassure sur le haut du fût, côté est
  for (let y = top; y < top + 3; y++) c.set(X1, y, 'K');
  // une fente qui descend de la cassure dans le fût (le bois s'est ouvert en cassant), côté jour
  for (let y = top; y < top + 5; y++) c.set(X0 + 2 + (y > top + 2 ? 1 : 0), y, 'N');
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

/** Le chicot, avec contour et ombre portée (24 × 70, le pied en SNAG_FOOT). */
export function snag(): Grid {
  const c = contour(snagBody());
  groundShadow(c, SNAG_FOOT[0] + 1.5, SNAG_FOOT[1] + 0.5, 6.5, 1.8);
  return c.toGrid();
}

// ---------- 1 bis. La cime ----------
//
// Ce qui manque au chicot, couché : l'arbre couché du jeu (`normal-felled-tree`, le même houppier couché, le même
// aplatissement, la règle D), coupé par le profil de la cassure. Le chicot couché (pour la preuve) en est l'autre part : les
// deux réunis font l'image de l'arbre couché, pixel pour pixel.

/** Rangées de l'écorce du tronc dans l'image de l'arbre couché (le contour au-dessus et au-dessous). */
const TRUNK_ROWS = [7, 12];
/** Largeur de l'image de l'arbre couché (140 px, 7 m) : le miroir d'une colonne x est FELLED_W − 1 − x. */
const FELLED_W = 140;

/** La longueur du chicot à la rangée `y` de l'image couchée : le profil sur l'écorce, les contours suivent leur voisine. */
function splitAt(y: number): number {
  const [r0, r1] = TRUNK_ROWS;
  if (y >= r0 && y <= r1) return PROFILE[y - r0];
  if (y === r0 - 1) return PROFILE[0];
  return BREAK_LOW; // le contour du bas, l'ombre, le houppier (il commence bien plus loin)
}

/** L'arbre couché du jeu, tel qu'il est dessiné (art/world/normal-felled.ts), vers l'est ou (`left`) vers l'ouest. */
function felledTree(left = false): Canvas {
  const a = treeArt('normal-tree').lying(580, 'normal-felled-tree');
  return Canvas.from((left ? a.left : a.right).toGrid());
}

/**
 * Une part de l'arbre couché (`side` 'snag' : le pied jusqu'à la cassure ; 'crown' : la cime), avec sa cassure dessinée : sur
 * les deux pixels de bois au bord, le bois frais (^ au jour en haut, * puis % vers le bas) ; le dessus d'une esquille qui
 * dépasse, au jour ; puis le contour de la cassure (le plus sombre de la matière côté jour, OUTLINE côté ombre). `left` :
 * l'arbre couché vers l'ouest, le profil retourné (la cassure de la cime regarde l'est, à l'ombre).
 */
function lyingPart(side: 'snag' | 'crown', left = false): Canvas {
  const src = felledTree(left);
  const c = new Canvas(src.w, src.h);
  // en coordonnées « vers l'est » : X = x à droite, le miroir à gauche
  const X = (x: number) => (left ? FELLED_W - 1 - x : x);
  const mine = (x: number, y: number) => (side === 'snag' ? X(x) < splitAt(y) : X(x) >= splitAt(y));
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (mine(x, y)) c.set(x, y, src.get(x, y));
  const [r0, r1] = TRUNK_ROWS;
  // la face de la cassure : au jour (^) en haut quand elle regarde l'ouest ; tournée vers l'est (à droite), plus sombre
  const westward = (side === 'crown') !== left;
  const fresh = (y: number) => (westward ? (y - r0 < 3 ? '^' : y - r0 < 5 ? '*' : '%') : (y - r0 < 2 ? '*' : y - r0 < 4 ? '%' : '&'));
  for (let y = r0; y <= r1; y++) {
    const s = splitAt(y);
    const xs = side === 'snag' ? [s - 1, s - 2] : [s, s + 1];
    xs.forEach((x, i) => c.set(X(x), y, i === 0 ? fresh(y) : side === 'snag' && !left ? '*' : fresh(y)));
    // une esquille qui dépasse de sa voisine du dessus : son dessus au jour
    const above = splitAt(y - 1);
    if (side === 'crown' && s < above) for (let x = s; x < above; x++) c.set(X(x), y, '^');
    if (side === 'snag' && s > above) for (let x = above; x < s; x++) c.set(X(x), y, '^');
  }
  // le contour de la cassure, dans la zone de la cassure seulement (ailleurs l'image a déjà le sien)
  const zone = (x: number) => X(x) >= BREAK_LOW - 3 && X(x) <= BREAK_HIGH + 2;
  const add: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!zone(x) || c.get(x, y) !== EMPTY || y < r0 - 1 || y > r1 + 1) continue;
    const wood = (dx: number, dy: number) => { const k = c.get(x + dx, y + dy); return k !== EMPTY && k !== 'x'; };
    if (!(wood(1, 0) || wood(-1, 0) || wood(0, 1) || wood(0, -1))) continue;
    add.push([x, y, wood(1, 0) || wood(0, 1) ? 'K' : 'o']);
  }
  for (const [x, y, k] of add) c.set(x, y, k);
  return c;
}

/** La cime, recadrée : vers l'est (sa cassure à l'ouest) et vers l'ouest (`left`). `at` : son coin dans l'image couchée. */
const crownEast = crop(lyingPart('crown'));
const crownWest = crop(lyingPart('crown', true));
/** La cime couchée vers l'est, recadrée sur ses pixels. */
export const crown = () => crownEast.c.toGrid();
/** Le chicot couché, pour la preuve seulement : l'autre part de l'arbre couché (dans le cadre 140 × 22 de l'arbre couché). */
export const snagLying = () => lyingPart('snag').toGrid();
/** Colonne de la cime dans le cadre de l'arbre couché (140 × 22) : pour la poser sur la preuve. */
export const CROWN_AT = crownEast.at;

/**
 * La cime couchée à côté du chicot, cassure contre cassure : le coin bas gauche de `normal-snag-top` par rapport au coin bas
 * gauche de `normal-snag` (x vers l'est, y vers le sud), en pixels. Le cadre de l'arbre couché est posé avec sa colonne
 * BREAK_LOW − 3 à 4 px à l'est du pied du chicot, l'axe du tronc couché (rangée 9,5) 2,5 px au nord du pied.
 */
export const SNAG_TOP_AT: [number, number] = (() => {
  const frameX = SNAG_FOOT[0] + 4 - (BREAK_LOW - 3);
  const frameY = SNAG_FOOT[1] - 12;
  const b = crownEast;
  return [frameX + b.at[0], frameY + b.at[1] + b.c.h - SNAG_H];
})();

/** Longueurs et matière (m, m³, kg) : le chicot et la cime font l'arbre normal (la souche et l'arbre couché du jeu). */
export const MATTER = (() => {
  const density = 900; // wood.json, bois vert
  const section = Math.PI * 0.15 ** 2; // tronc de 30 cm
  const felledMass = 420; // props.json, normal-felled-tree
  const bole = 5.8; // la pièce de bois du normal-felled-tree (size normal, length 580)
  const crownMass = felledMass - section * bole * density; // houppier : branches et pointe
  const stump = 0.4, snagLen = 2.5;
  const snagVol = section * snagLen, crownBole = section * (stump + bole - snagLen);
  return {
    density, section, crownMass, felledMass,
    snag: { len: snagLen, vol: snagVol, kg: snagVol * density },
    crown: { len: 7 - snagLen, boleLen: stump + bole - snagLen, vol: crownBole, kg: crownBole * density + crownMass },
    whole: { stumpKg: section * stump * density, felledKg: felledMass },
  };
})();

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

/** Une face retournée est-ouest dans une image de largeur `w` (les phases des bosses suivent : le bord est le miroir). */
const mirrorFace = (f: Face, w: number): Face => ({ ...f, cx: w - f.cx, lumps: f.lumps.map(([a, k, p]) => [a, k, Math.PI * k - p] as [number, number, number]) });

/**
 * La terre du dessous de la motte : au jour en haut à gauche, sombre en bas à droite, en grain de mottes (2 × 2 px) ; çà et là
 * un creux sombre, là où une racine s'est arrachée de la terre. `dim` : la face tourne le dos au soleil (plus sombre).
 */
function paintEarth(c: Canvas, f: Face, seed: number, dim = 0) {
  const g = grain(seed);
  const r = rng(seed + 1);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!inFace(f, x, y)) continue;
    const [u, v] = rel(f, x, y);
    const l = -(u + v) / Math.SQRT2 + (g(x, y) - 0.5) * 0.55 - dim;
    c.set(x, y, l > 0.5 ? 'e' : l > 0.0 ? '2' : l > -0.55 ? '9' : '3');
  }
  // creux : des poches sombres irrégulières, là où une racine s'est arrachée (une rangée large, une plus courte dessous)
  for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI * 2, d = 0.35 + r() * 0.4;
    const x = Math.round(f.cx + Math.cos(a) * d * f.rx), y = Math.round(f.cy + Math.sin(a) * d * f.ry);
    const w = r() < 0.5 ? 2 : 3;
    for (let k = 0; k < w; k++) if (inFace(f, x + k, y)) c.set(x + k, y, '3');
    for (let k = 1; k < w; k++) if (inFace(f, x + k, y + 1)) c.set(x + k, y + 1, k === 1 ? '5' : '3');
  }
  despeckle(c);
}

/**
 * Une racine cassée, du collet vers le bord : une ligne qui se courbe (`bend` radians par unité de rayon), épaisse de 2 px sur
 * sa première partie si `thick` ; sur son côté au jour le pixel clair (M), dessous le corps (m), et son ombre sur la terre
 * juste sous elle. Le bout, s'il sort de la motte, est cassé : bois frais (^).
 */
function root(c: Canvas, f: Face, deg: number, len: number, bend: number, thick: boolean) {
  const pts: [number, number][] = [];
  let a = (deg * Math.PI) / 180;
  let lastKey = '';
  const steps = 60, r0 = 0.22;
  for (let i = 0; i <= steps; i++) {
    const r = r0 + (len - r0) * (i / steps);
    a += (bend * (len - r0)) / steps;
    const x = Math.floor(f.cx + Math.cos(a) * r * f.rx);
    const y = Math.floor(f.cy + Math.sin(a) * r * f.ry);
    const key = `${x},${y}`;
    if (key === lastKey) continue;
    lastKey = key;
    const fat = thick && i < steps * 0.7;
    const horiz = Math.abs(Math.cos(a) * f.rx) > Math.abs(Math.sin(a) * f.ry);
    // l'ombre de la racine sur la terre, du côté opposé au jour
    const [sx, sy] = horiz ? [x, y + 1] : [x + 1, y];
    if (inFace(f, sx, sy) && !'mMN^'.includes(c.get(sx, sy))) c.set(sx, sy, '3');
    const shade = Math.sin(a) + Math.cos(a) > 0.6; // la racine qui part vers le bas à droite reste dans l'ombre
    c.set(x, y, shade ? 'N' : 'm');
    if (fat) {
      const [lx, ly] = horiz ? [x, y - 1] : [x - 1, y];
      c.set(lx, ly, shade ? 'm' : 'M');
    }
    pts.push([x, y]);
  }
  const [ex, ey] = pts[pts.length - 1];
  if (!inFace(f, ex, ey)) c.set(ex, ey, '^');
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
 * La frange : les racines arrachées qui sortent du bord de la motte et rayonnent, de 1 à 4 px (5 à 20 cm), en se tordant un
 * peu ; les grosses ont 2 px sur leur première moitié (le côté au jour en M), toutes finissent par un bout cassé clair (^).
 * `deg` : direction (0 vers la droite, sens horaire à l'écran), `len` : longueur hors de la motte en pixels.
 */
function fringe(c: Canvas, f: Face, list: [number, number, boolean, number][]) {
  for (const [deg, len, thick, bend] of list) {
    const a = (deg * Math.PI) / 180;
    // départ : un peu en dedans du bord, dans la direction `a` de l'ovale
    const e = edge(f, a) * 0.9;
    let x = f.cx + Math.cos(a) * e * f.rx, y = f.cy + Math.sin(a) * e * f.ry;
    let d = Math.atan2(Math.sin(a) * f.ry, Math.cos(a) * f.rx);
    const inside = 2;
    const total = len + inside;
    let last = '';
    let lx = 0, ly = 0;
    for (let i = 0; i <= total * 2; i++) {
      const t = i / 2;
      const X = Math.floor(x), Y = Math.floor(y);
      const key = `${X},${Y}`;
      if (key !== last) {
        last = key;
        const shade = Math.sin(d) > 0.5 || Math.cos(d) > 0.8;
        c.set(X, Y, shade ? 'N' : 'm');
        if (thick && t < total * 0.55) {
          const horiz = Math.abs(Math.cos(d)) > Math.abs(Math.sin(d));
          c.set(horiz ? X : X - 1, horiz ? Y - 1 : Y, shade ? 'm' : 'M');
        }
        lx = X; ly = Y;
      }
      x += Math.cos(d) * 0.5;
      y += Math.sin(d) * 0.5;
      d += bend * 0.05;
    }
    c.set(lx, ly, '^');
  }
}

/** Mottes de terre tombées au pied de la galette : x, y du coin haut gauche, largeur (2 rangées : dessus au jour, dessous). */
function clods(c: Canvas, list: [number, number, number][]) {
  for (const [x, y, w] of list) {
    for (let i = 0; i < w; i++) {
      c.set(x + i, y, i === 0 ? 'n' : 'e');
      c.set(x + i, y + 1, i === w - 1 ? '9' : '2');
    }
  }
}

/**
 * Racines du bas, enfouies ou cassées court : le bas de la galette touche la terre ; ses racines n'en sortent que d'un pixel
 * ou deux, bout cassé (^) sur le côté au jour, l'écorce (N) à l'ombre. x, y du bout, `dir` : -1 vers la gauche, 1 vers la droite.
 */
function buried(c: Canvas, list: [number, number, -1 | 1][]) {
  for (const [x, y, dir] of list) {
    c.set(x, y, dir < 0 ? '^' : 'N');
    c.set(x - dir, y, 'm');
  }
}

/** Marge ajoutée autour d'une galette pour ses racines (px). */
const ROOM = 5;

/** La galette dessinée dans un cadre agrandi de ROOM de chaque côté, la face poussée d'autant. */
function roomy(body: Canvas, f: Face): { c: Canvas; f: Face } {
  const c = new Canvas(body.w + 2 * ROOM, body.h + 2 * ROOM).stamp(body.toGrid(), ROOM, ROOM);
  return { c, f: { ...f, cx: f.cx + ROOM, cy: f.cy + ROOM } };
}

/** Ombre portée sous la base d'une image : l'ovale centré sous sa rangée la plus basse. */
function shadowUnder(c: Canvas, rx: number) {
  let yb = -1, xs: number[] = [];
  for (let y = c.h - 1; y >= 0 && yb < 0; y--) {
    xs = [...Array(c.w).keys()].filter((x) => c.get(x, y) !== EMPTY && c.get(x, y) !== 'x');
    if (xs.length) yb = y;
  }
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2 + 2;
  groundShadow(c, cx, yb + 0.5, rx, 1.6);
}

/** Herbe de l'ancien sol : une rampe de touffes, du jour à l'ombre. */
const GRASS = ['G', 'g', 'v', 'V'];

// --- Vue de profil (base : l'arbre couché vers l'est ; r2 : vers l'ouest) ---

/** Cadre de la vue de profil, sans la marge : la face de terre (Ø/2 × Ø, contour compris) et sa tranche. */
const PLATE_E_W = 24;
const PLATE_E_H = 28;
/** La face de terre de profil, l'ovale du bout, bosselé : la galette de l'arbre couché vers l'est (face tournée vers l'ouest). */
const FACE_E: Face = { cx: 8, cy: 14.6, rx: 5, ry: 10.5, lumps: [[0.05, 3, 0.7], [0.04, 5, 2.1], [0.03, 8, 4]], flat: 0.93 };
/** Épaisseur de la galette : 30 cm, la tranche s'étire de 6 px ; son bord remonte de 1,5 px (on voit le dessus). */
const THICK = 6;
const RISE = 1.5;

/**
 * La galette de profil. `east` : l'arbre couché vers l'est, la face de terre à l'ouest, au jour, la tranche et le gazon de
 * l'ancien sol à l'est ; sinon le miroir de la forme, la face de terre à l'est, qui tourne le dos au soleil, et le gazon à
 * l'ouest, au jour. La lumière reste en haut à gauche dans les deux.
 */
function rootPlateSideBody(east: boolean): { c: Canvas; f: Face } {
  const c = new Canvas(PLATE_E_W, PLATE_E_H);
  const f = east ? FACE_E : mirrorFace(FACE_E, PLATE_E_W);
  const s = east ? 1 : -1; // le sens de la tranche, vers l'arbre
  const g = grain(east ? 71 : 171);
  // la tranche : l'union des faces poussées vers l'arbre (et un peu vers le haut : on voit le dessus)
  const tOf = (x: number, y: number) => {
    for (let t = THICK; t >= 0; t -= 0.5) if (inFace(f, x, y, s * t, (-t * RISE) / THICK)) return t;
    return -1;
  };
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const t = tOf(x, y);
    if (t < 0) continue;
    // le bord de la motte, terre arrachée : au jour en haut, à l'ombre en bas
    const v = (y + 0.5 - f.cy) / f.ry;
    const l = -v * 1.1 + (g(x, y) - 0.5) * 0.6;
    c.set(x, y, l > 0.6 ? 'n' : l > 0.05 ? 'e' : l > -0.5 ? '2' : '9');
  }
  despeckle(c);
  // l'ancien sol, l'herbe, sur le bord de la tranche côté arbre (2 à 3 px), du haut aux deux tiers ; au jour à l'ouest
  const r = rng(east ? 72 : 172);
  for (let y = 0; y < c.h; y++) {
    let xe = -1;
    if (east) { for (let x = c.w - 1; x >= 0; x--) if (c.get(x, y) !== EMPTY) { xe = x; break; } }
    else { for (let x = 0; x < c.w; x++) if (c.get(x, y) !== EMPTY) { xe = x; break; } }
    if (xe < 0) continue;
    const v = (y + 0.5 - (f.cy - RISE)) / f.ry;
    if (v > 0.5) continue;
    const k = Math.max(0, Math.min(3, (v < -0.55 ? 0 : v < 0 ? 1 : 2) + (east ? 0 : -1)));
    c.set(xe + s, y, GRASS[Math.min(3, k + 1)]);
    c.set(xe, y, GRASS[k]);
    if (v < 0.25) c.set(xe - s, y, GRASS[k]);
  }
  // touffes qui dépassent au sommet de la tranche
  for (let x = 0; x < c.w; x++) {
    let yt = -1;
    for (let y = 0; y < c.h; y++) if (c.get(x, y) !== EMPTY) { yt = y; break; }
    if (yt < 0 || (east ? x < f.cx + 1 : x > f.cx - 2)) continue;
    if (r() < 0.45) c.set(x, yt - 1, GRASS[east ? 0 : 0]);
  }
  paintEarth(c, f, east ? 73 : 173, east ? 0 : 0.45);
  const m = (x: number, w = 1) => (east ? x : PLATE_E_W - x - w);
  stones(c, [[m(6, 2), 8, 2], [m(9, 2), 20, 2]]);
  // racines : deux grosses qui partent du collet en se tordant, une fine
  const dir = (deg: number) => (east ? deg : 180 - deg);
  root(c, f, dir(-140), 1.0, east ? 0.9 : -0.9, true);
  root(c, f, dir(-60), 0.9, east ? -0.8 : 0.8, false);
  root(c, f, dir(40), 0.95, east ? 0.9 : -0.9, true);
  root(c, f, dir(150), 0.8, east ? -0.7 : 0.7, false);
  stubs(c, [[m(6, 2), 6, 2], [m(4, 2), 14, 2], [m(8, 1), 21, 1]]);
  collar(c, f, 1.5, 2.4);
  return { c, f };
}

/** La galette de profil, contour, frange et ombre portée ; `face` : le centre de sa face de terre dans l'image recadrée. */
function rootPlateSide(east: boolean): { c: Canvas; face: [number, number] } {
  const body = rootPlateSideBody(east);
  const { c, f } = roomy(body.c, body.f);
  const dir = (deg: number) => (east ? deg : 180 - deg);
  // les racines qui rayonnent du bord de la face : vers l'extérieur et le haut ; en bas, enfouies ou cassées court
  fringe(c, f, [
    [-178, 3, true, 0.4], [-158, 2, false, -0.5], [-138, 3, true, 0.3], [-116, 2, false, 0.6], [-96, 2, true, -0.4],
    [-74, 2, false, 0.5], [196, 2, false, -0.5],
  ].map(([d, l, t, b]) => [dir(d as number), l, t, east ? b : -(b as number)] as [number, number, boolean, number]));
  const base = Math.floor(f.cy + f.ry * f.flat);
  const mx = (x: number, w = 1) => (east ? x : c.w - x - w);
  buried(c, [[mx(Math.round(f.cx - 6)), base - 2, east ? -1 : 1]]);
  // les mottes tombées au pied, devant la face et contre la tranche
  const cx = east ? f.cx : c.w - f.cx;
  clods(c, [[mx(Math.round(cx - 7), 3), base - 1, 3], [mx(Math.round(cx - 3), 2), base, 2], [mx(Math.round(cx + 9), 2), base - 1, 2]]);
  const out = contour(c);
  shadowUnder(out, 9);
  const k = crop(out);
  return { c: k.c, face: [f.cx - k.at[0], f.cy - k.at[1]] };
}

// --- Vue de face (r3 : l'arbre couché vers le nord, la face de terre ; r1 : couché vers le sud, l'ancien dessus) ---

const PLATE_F_W = 28;
const PLATE_F_H = 29;
const FACE_F: Face = { cx: 14, cy: 17, rx: 10, ry: 10.4, lumps: [[0.05, 3, 2.2], [0.04, 5, 0.3], [0.025, 9, 1]], flat: 0.93 };
/** Le dessus de la tranche, en raccourci : 30 cm ÷ 2 = 3 px. */
const TOP = 3;

/** Le dessus de la tranche (terre), la face poussée vers le nord de TOP px. */
function plateTop(c: Canvas, seed: number) {
  const g = grain(seed);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    let ok = false;
    for (let s = 0; s <= TOP; s += 0.5) if (inFace(FACE_F, x, y, 0, -s)) { ok = true; break; }
    if (!ok) continue;
    const u = (x + 0.5 - FACE_F.cx) / FACE_F.rx;
    const l = -u * 0.8 + (g(x, y) - 0.5) * 0.6;
    c.set(x, y, l > 0.35 ? 'n' : l > -0.3 ? 'e' : '2');
  }
  despeckle(c);
}

/** La face de terre, de face (r3) : l'arbre couché vers le nord, derrière elle ; le gazon sur l'arête nord de la tranche. */
function rootPlateFaceBody(): Canvas {
  const c = new Canvas(PLATE_F_W, PLATE_F_H);
  plateTop(c, 91);
  // le gazon de l'ancien sol sur l'arête nord : deux pixels du haut de chaque colonne, des touffes qui dépassent
  const r = rng(92);
  for (let x = 0; x < c.w; x++) {
    let yt = -1;
    for (let y = 0; y < c.h; y++) if (c.get(x, y) !== EMPTY) { yt = y; break; }
    if (yt < 0) continue;
    const u = (x + 0.5 - FACE_F.cx) / FACE_F.rx;
    if (Math.abs(u) > 0.85) continue;
    const k = u < -0.3 ? 0 : u < 0.35 ? 1 : 2;
    c.set(x, yt, GRASS[k]);
    c.set(x, yt + 1, GRASS[k + 1]);
    if (r() < 0.4 && Math.abs(u) < 0.7) c.set(x, yt - 1, GRASS[k]);
  }
  paintEarth(c, FACE_F, 93);
  stones(c, [[7, 12, 2], [18, 22, 2], [19, 11, 2]]);
  root(c, FACE_F, -150, 0.95, 0.9, true);
  root(c, FACE_F, -70, 0.9, -0.8, false);
  root(c, FACE_F, 5, 1.0, 0.8, true);
  root(c, FACE_F, 145, 0.75, 0.7, false);
  stubs(c, [[9, 9, 2], [17, 15, 2], [6, 19, 2]]);
  collar(c, FACE_F, 2.5, 2.5);
  return c;
}

/**
 * L'ancien dessus de la motte (r1) : l'arbre couché vers le sud, devant elle ; on voit le gazon que la motte a emporté, le
 * pied du tronc au milieu (l'écorce du collet et ses contreforts qui s'enfoncent dans l'herbe), le dessus de la tranche en
 * terre ; les racines arrachées dépassent derrière le bord.
 */
function rootPlateBackBody(): Canvas {
  const c = new Canvas(PLATE_F_W, PLATE_F_H);
  plateTop(c, 191);
  const g = grain(192);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!inFace(FACE_F, x, y)) continue;
    const [u, v] = rel(FACE_F, x, y);
    const l = -(u + v) / Math.SQRT2 + (g(x, y) - 0.5) * 0.5;
    // le bord de la motte, déchiré : la terre se voit sous le gazon sur le pourtour bas
    const d = Math.hypot(u, v) / edge(FACE_F, Math.atan2(v, u));
    if (d > 0.86 && v > -0.2) { c.set(x, y, l > 0 ? '2' : '9'); continue; }
    c.set(x, y, l > 0.55 ? 'G' : l > -0.05 ? 'g' : l > -0.6 ? 'v' : 'V');
  }
  despeckle(c);
  // des brins plus clairs, çà et là (l'herbe sèche de l'ancien sol)
  for (const [x, y] of [[9, 11], [10, 11], [12, 21], [13, 21], [19, 13], [20, 13]] as [number, number][]) c.set(x, y, 'y');
  // les contreforts du pied, qui partent du collet et plongent dans le gazon
  for (const [deg, len] of [[-150, 0.55], [-40, 0.5], [35, 0.6], [150, 0.5]] as [number, number][]) {
    const a = (deg * Math.PI) / 180;
    for (let r = 0.18; r <= len; r += 0.04) {
      const x = Math.floor(FACE_F.cx + Math.cos(a) * r * FACE_F.rx), y = Math.floor(FACE_F.cy + Math.sin(a) * r * FACE_F.ry);
      const shade = Math.sin(a) + Math.cos(a) > 0.4;
      c.set(x, y, shade ? 'N' : 'm');
      const horiz = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
      if (r < len * 0.6) c.set(horiz ? x : x - 1, horiz ? y - 1 : y, shade ? 'm' : 'M');
    }
  }
  // le pied du tronc : l'écorce en rond (le tronc couché part de là vers le sud et le couvre)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const u = (x + 0.5 - FACE_F.cx) / 3.4, v = (y + 0.5 - FACE_F.cy) / 3.4;
    const r = Math.hypot(u, v);
    if (r > 1) continue;
    c.set(x, y, u + v < -0.5 ? 'M' : u + v > 0.6 ? 'N' : r < 0.45 ? 'N' : 'm');
  }
  return c;
}

/** Une vue de face : contour, frange (en haut et sur les côtés seulement), racines courtes et mottes au pied, ombre. */
function rootPlateFront(back: boolean): Canvas {
  const { c, f } = roomy(back ? rootPlateBackBody() : rootPlateFaceBody(), FACE_F);
  // les racines rayonnent en haut et sur les côtés ; le bas touche la terre : rien n'y rayonne
  fringe(c, f, back
    ? [[-168, 2, true, 0.4], [-140, 3, false, 0.3], [-112, 2, false, 0.5], [-88, 2, true, -0.3], [-60, 2, false, 0.4],
      [-34, 3, true, -0.4], [-8, 2, false, 0.5]]
    : [[-172, 2, true, 0.4], [-150, 2, false, -0.5], [-128, 3, true, 0.3], [-105, 2, false, 0.5], [-84, 2, true, -0.3],
      [-62, 2, false, 0.4], [-40, 3, true, -0.4], [-18, 2, false, 0.5], [-3, 2, true, -0.3]]);
  const base = Math.floor(f.cy + f.ry * f.flat);
  // en bas, des racines enfouies ou cassées court : un pixel ou deux qui dépassent de la motte, au ras des mottes
  buried(c, back ? [[Math.round(f.cx - 10), base - 3, -1]] : [[Math.round(f.cx - 10), base - 3, -1], [Math.round(f.cx + 10), base - 4, 1]]);
  clods(c, [[Math.round(f.cx - 12), base - 1, 3], [Math.round(f.cx - 9), base, 2], [Math.round(f.cx + 8), base - 1, 3], [Math.round(f.cx + 11), base, 2]]);
  const out = contour(c);
  shadowUnder(out, 12);
  return crop(out).c;
}

// ---------- Le trou ----------

const HOLE_W = 23;
const HOLE_H = 21;

/**
 * Le trou, à plat : une couronne de terre retournée en mottes (le sol, l'herbe, se voit entre), la paroi nord-ouest dans
 * l'ombre (elle tourne le dos au soleil), la paroi sud-est au jour, le fond sombre et une flaque de pluie ; deux bouts de
 * racines arrachées dans la paroi nord. Sans contour (c'est du sol) ni ombre portée.
 */
function rootHole(): Canvas {
  const c = new Canvas(HOLE_W, HOLE_H);
  const f: Face = { cx: HOLE_W / 2, cy: HOLE_H / 2, rx: HOLE_W / 2, ry: HOLE_H / 2, lumps: [[0.04, 3, 1.3], [0.03, 6, 0.2]], flat: 2 };
  const g = grain(55);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!inFace(f, x, y)) continue;
    const [u, v] = rel(f, x, y);
    const d = Math.hypot(u, v) / edge(f, Math.atan2(v, u));
    if (d > 0.74) {
      // terre retournée : des mottes, claires au jour, qui ne couvrent pas tout le bord
      const n = g(x, y);
      if (n < 0.25) continue;
      c.set(x, y, n > 0.75 ? 'n' : n > 0.5 ? 'e' : '2');
      continue;
    }
    // le creux : la paroi selon son orientation ; l'ombre au nord-ouest, le jour au sud-est, le fond plus sombre
    const lit = (u + v) / Math.SQRT2;
    const depth = 1 - d / 0.74;
    let k = lit > 0.3 ? 'e' : lit > -0.05 ? '2' : lit > -0.4 ? '9' : '3';
    if (lit < -0.6 && d > 0.62) k = '5'; // juste sous le bord nord-ouest, l'ombre portée du bord
    if (depth > 0.6 && k === 'e') k = '2';
    c.set(x, y, k);
  }
  // la flaque au fond, un peu au sud du centre
  const puddle = new Canvas(c.w, c.h).ellipse(f.cx + 2, f.cy + 2.5, 2.8, 1.4, 'q');
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (puddle.get(x, y) !== EMPTY) c.set(x, y, 'q');
  const px = Math.floor(f.cx + 1), py = Math.floor(f.cy + 2);
  c.set(px - 1, py, 'W').set(px, py, 'W');
  // deux bouts de racines arrachées dans la paroi nord, bout cassé clair
  c.set(8, 5, 'm').set(9, 5, 'm').set(10, 6, '^');
  c.set(14, 4, 'm').set(15, 5, 'm').set(15, 6, '^');
  return despeckle(c, 'W^qm');
}

// ---------- Les images ----------

const plateEast = rootPlateSide(true);
const plateWest = rootPlateSide(false);
const plateFace = rootPlateFront(false);
const plateBack = rootPlateFront(true);
const hole = rootHole();

/** Les grilles, pour la planche (tools/essai-tempete.ts). */
export const views = {
  snag: () => snag(),
  snagTop: [crownEast.c, transpose(crownEast.c), crownWest.c, transpose(crownWest.c)].map((c) => c.toGrid()),
  plate: [plateEast.c, plateBack, plateWest.c, plateFace].map((c) => c.toGrid()),
  hole: () => hole.toGrid(),
};

/**
 * L'arbre déraciné, dans le repère de l'image de l'arbre couché vers l'est (`normal-felled-tree`, 140 × 22, le bout scié en
 * x = 0, l'axe du tronc vers la rangée 9,5) : coin bas gauche de chaque image par rapport au coin bas gauche de l'arbre couché
 * (x vers l'est, y vers le sud). La galette couvre le bout scié : le centre de sa face de terre (le collet) en (−7, 10), sa
 * tranche et son gazon sur les premières colonnes du tronc ; le trou à l'ouest, sous sa base, centré sur l'axe du tronc.
 */
export const UPROOTED = (() => {
  const FELLED_H = 22;
  const plateTop: [number, number] = [-7 - Math.round(plateEast.face[0]), 10 - Math.round(plateEast.face[1])];
  const holeTop: [number, number] = [-20 - Math.floor(HOLE_W / 2), Math.round(9.5 - HOLE_H / 2)];
  return {
    /** Coins haut gauche, dans l'image de l'arbre couché (pour la planche). */
    plateTop, holeTop,
    plate: [plateTop[0], plateTop[1] + plateEast.c.h - FELLED_H] as [number, number],
    hole: [holeTop[0], holeTop[1] + HOLE_H - FELLED_H] as [number, number],
  };
})();

const img = (name: string, grid: Grid): ImageSource => ({ kind: 'image', name, palette: world, grid });

const sources: ArtSource[] = [
  img('normal-snag', views.snag()),
  img('normal-snag-top', views.snagTop[0]),
  img('normal-snag-top-r1', views.snagTop[1]),
  img('normal-snag-top-r2', views.snagTop[2]),
  img('normal-snag-top-r3', views.snagTop[3]),
  img('root-plate', views.plate[0]),
  img('root-plate-r1', views.plate[1]),
  img('root-plate-r2', views.plate[2]),
  img('root-plate-r3', views.plate[3]),
  img('uprooted-hole', views.hole()),
];
export default sources;
