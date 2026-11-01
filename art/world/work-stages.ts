// Les étapes visibles du travail (CONCEPTION, « Le travail », § 6 : ce qu'on voit avancer), d'après l'essai validé
// (art/proposals/essai-abattage.ts, .art-preview/essai-abattage-3.png). Des variantes d'image d'objets existants, pas de
// nouveaux objets : chaque étape a la taille et l'origine de l'image qu'elle remplace (le jeu change l'image à la volée).
//
// 1. L'ABATTAGE (`<arbre>-stage-1` à `-7`, arbres debout `normal-tree`, `big-tree`, `big-pollard`, vue unique : `round`) :
//    entaille 1/3, 2/3, 3/3, trait d'abattage, craquement, penche 1, penche 2. Dessinées pour un arbre qui tombe vers la
//    droite (l'entaille à droite) ; le jeu les retourne (flipX) quand Xéros frappe depuis la droite.
//    - L'entaille de direction se creuse côté droit, à la hauteur de la coupe de la chute : un V à plancher horizontal (le
//      plancher au soleil, bois neuf `^`, la face haute en pente dans l'ombre `%`, le creux `@ &`) ; le bord du tronc
//      s'échancre.
//    - Le trait d'abattage, côté gauche, une rangée au-dessus du plancher : une morsure et la saignée `@`.
//    - Le craquement : la saignée rejoint presque l'entaille (la charnière), une fente monte dans le tronc, des éclats sautent.
//    - La penche : le haut pivote autour de la charnière ; le trait d'abattage s'ouvre à gauche. L'angle est borné par la
//      largeur de l'image (le houppier ne doit pas en sortir) : voir `lean` de chaque arbre.
//    - Les copeaux (bois neuf `^ * %`, éclats de 1 à 2 px) s'accumulent au pied : côté entaille d'abord, puis côté trait.
//    Mêmes règles pour les gros (tronc de 55 cm, 11 px) à leur échelle : entaille plus profonde, plus de copeaux.
//
// 2. L'ÉBRANCHAGE (`<image couchée>-stage-1` à `-3`, une par vue existante : `<clé>` et `<clé>-left`) : le houppier
//    s'allège depuis le pied vers la cime, une branche après l'autre (le houppier est partagé en autant de branches que
//    `limbs.count` de props.json, chacune une cellule le long du tronc) ; chaque branche coupée laisse une cicatrice claire
//    sur le tronc et tombe au sol à côté de lui (au nord ou au sud, du côté où elle était), feuillage et tige. Étape 1 : 30 %
//    du houppier, 2 : 60 %, 3 : 85 % ; il reste la touffe de la cime (le jeu pose ensuite la pièce de bois et les branches).
//    Le front de la coupe recule du pied vers la cime, festonné ; les branches tombées gardent leur place d'une étape à
//    l'autre.

import { Canvas, EMPTY, rng } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { despeckle, groundShadow, shadedOutline, standingTree as bigStanding, tallTreeBody, treeBody as bigBody, TALL_DY, type Vec } from './big-tree';
import { treeBody as normalBody } from './normal-tree';
import { FOOT as NORMAL_FOOT, TREE_H, TREE_W } from './normal-geometry';
import { NORMAL_LYING } from './normal-felled';
import { BIG_FELLED, BIG_TREE_CM, bigLying } from './big-felled';
import { CROWN_SHIFT, POLLARD_CM, POLLARD_FELLED } from './big-pollard';

// =====================================================================================================================
// 1. L'abattage
// =====================================================================================================================

/** Une entaille : profondeur (colonnes depuis le bord droit de l'écorce) et ouverture (rangées au-dessus du plancher). */
interface Notch { depth: number; open: number }

/** Un arbre debout à abattre. */
interface Standing {
  key: string;
  /** Le corps de l'arbre debout (sans contour ni ombre), dans le repère de son image. */
  body: () => Canvas;
  w: number;
  h: number;
  /** Pied du tronc (centre du bas), dans l'image. */
  foot: Vec;
  /** Ombre portée de l'arbre debout (celle de son image). */
  shadow: [number, number, number, number];
  /** Rangée du plancher de l'entaille : juste sous la coupe de la chute. */
  floor: number;
  /** L'entaille à 1/3, 2/3, 3/3. */
  notch: [Notch, Notch, Notch];
  /** Longueur de la saignée du trait d'abattage, puis au craquement. */
  back: [number, number];
  /** Fente du craquement, [dx depuis le bord gauche, dy depuis le plancher]. */
  crack: Vec[];
  /** Angles de la penche (degrés). */
  lean: [number, number];
  /** Ombre du haut qui penche : [dx depuis le pied, rx]. */
  leanShadow: [number, number];
  /** Copeaux : écart au pied du premier, nombre côté entaille puis côté trait à chaque étape (0 à 7). */
  chips: { gap: number; right: number[]; left: number[] };
  /** Éclats du craquement, [dx depuis le bord gauche, dy depuis le plancher]. */
  splinters: [number, number, string][];
}

/** Colonnes d'écorce [gauche, droite] de la rangée `y`. */
function barkSpan(c: Canvas, y: number): [number, number] {
  const xs = [...Array(c.w).keys()].filter((x) => 'MmNK'.includes(c.get(x, y)));
  if (!xs.length) throw new Error(`étapes : pas d'écorce à la rangée ${y}`);
  return [xs[0], xs[xs.length - 1]];
}

/**
 * Creuse l'entaille de direction (côté droit) : V à plancher horizontal (méthode de l'essai). Le bord du tronc s'échancre ;
 * dans le V, le creux à l'ombre (`@`, `&`) ; la face haute en pente (`%`) ; le plancher au soleil (`^`), qui dépasse d'un
 * pixel à gauche du V (la face sud de l'entaille, qui s'enroule autour du tronc).
 */
function notch(c: Canvas, right: number, floor: number, n: Notch) {
  const top = floor - n.open;
  for (let y = top; y < floor; y++) {
    const d = Math.max(1, Math.round((n.depth * (y - top + 1)) / n.open));
    for (let k = 0; k < d; k++) {
      c.px[y][right - k] = d === 1 ? '&' : k === 0 ? EMPTY : k === d - 1 ? '%' : y === floor - 1 ? '&' : '@';
    }
  }
  for (let k = 0; k <= n.depth; k++) c.px[floor][right - k] = k === n.depth ? '*' : '^';
  c.px[floor - 1][right - n.depth] = '^';
}

/** Le trait d'abattage (côté gauche, une rangée au-dessus du plancher) : une morsure et la saignée, `reach` px de long. */
function backCut(c: Canvas, left: number, floor: number, reach: number, open: boolean) {
  const y = floor - 1;
  c.px[y][left] = EMPTY;
  c.px[y - 1][left] = EMPTY;
  c.px[y + 1][left] = '^';
  for (let x = left + 1; x < left + reach; x++) c.px[y][x] = '@';
  c.px[y - 1][left + 1] = '%';
  if (open) {
    // la saignée s'ouvre en coin : le haut du tronc a commencé à basculer
    c.px[y - 1][left + 1] = '&';
    c.px[y - 2][left] = EMPTY;
  }
}

/**
 * Le haut de l'arbre (au-dessus du plancher) pivoté de `deg` degrés vers la droite autour de la charnière ; le pied ne
 * bouge pas. Refuse un houppier qui sortirait de l'image.
 */
function leanTop(body: Canvas, hinge: Vec, floor: number, deg: number, what: string): Canvas {
  const pad = 24;
  const out = new Canvas(body.w + pad, body.h);
  const t = (deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  for (let y = floor - 1; y < body.h; y++) for (let x = 0; x < body.w; x++) out.px[y][x] = body.px[y][x];
  for (let y = 0; y < body.h; y++) for (let x = 0; x < out.w; x++) {
    const u = x + 0.5 - hinge[0];
    const v = y + 0.5 - hinge[1];
    const sx = Math.floor(hinge[0] + u * cos + v * sin);
    const sy = Math.floor(hinge[1] - u * sin + v * cos);
    if (sy >= floor - 1 || sx < 0 || sx >= body.w || sy < 0) continue;
    const p = body.px[sy][sx];
    if (p !== EMPTY) out.px[y][x] = p;
  }
  // garde-fou : rien ne sort de l'image (contour compris : une colonne de marge)
  for (let y = 0; y < out.h; y++) for (let x = body.w - 1; x < out.w; x++) {
    if (out.px[y][x] !== EMPTY) throw new Error(`étapes : ${what}, la penche de ${deg}° sort de l'image en (${x}, ${y})`);
  }
  return Canvas.from(out.toGrid().map((r) => r.slice(0, body.w)));
}

/** Copeaux au sol : [dx, dy, forme] depuis le pied ; forme 0 : un point, 1 : deux en long, 2 : deux en travers. */
function chipsFor(t: Standing, stage: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const r = rng(77);
  const nr = t.chips.right[t.chips.right.length - 1];
  const nl = t.chips.left[t.chips.left.length - 1];
  const spot = (side: 1 | -1, i: number): [number, number, number] => {
    const d = t.chips.gap + Math.floor(i * 0.45 + r() * 3);
    return [side * d, -1 + Math.floor(r() * 3), Math.floor(r() * 3)];
  };
  for (let i = 0; i < nr; i++) {
    const c = spot(1, i);
    if (i < t.chips.right[stage]) out.push(c);
  }
  for (let i = 0; i < nl; i++) {
    const c = spot(-1, i);
    if (i < t.chips.left[stage]) out.push([c[0] - 1, c[1], c[2]]);
  }
  return out;
}

function drawChips(c: Canvas, t: Standing, stage: number) {
  const [fx, fy] = [t.foot[0], t.foot[1] + 1];
  for (const [dx, dy, form] of chipsFor(t, stage)) {
    const x = fx + dx;
    const y = fy + dy;
    if (form === 1) { c.set(x, y, '^'); c.set(x + 1, y, '*'); }
    else if (form === 2) { c.set(x, y, '^'); c.set(x, y + 1, '%'); }
    else c.set(x, y, '^');
  }
}

/** Une étape de l'abattage (1 à 7), dans l'image de l'arbre debout. */
function fellingStage(t: Standing, stage: number): Canvas {
  let body = t.body();
  const [left, right] = barkSpan(body, t.floor - 1);
  if (stage >= 1) notch(body, right, t.floor, t.notch[Math.min(stage, 3) - 1]);
  if (stage >= 4) backCut(body, left, t.floor, t.back[stage >= 5 ? 1 : 0], stage >= 6);
  if (stage >= 5) for (const [dx, dy] of t.crack) body.px[t.floor + dy][left + dx] = '&';
  if (stage >= 6) body = leanTop(body, [right - 1 + 0.5, t.floor], t.floor, t.lean[stage - 6], `${t.key}-stage-${stage}`);
  despeckle(body, 'K^*%&@');
  const c = shadedOutline(body);
  groundShadow(c, ...t.shadow);
  if (stage >= 6) groundShadow(c, t.foot[0] + t.leanShadow[0], t.foot[1] + 1, t.leanShadow[1], t.shadow[3]);
  drawChips(c, t, stage);
  if (stage === 5) for (const [dx, dy, k] of t.splinters) c.set(left + dx, t.floor + dy, k);
  if (c.w !== t.w || c.h !== t.h) throw new Error(`étapes : ${t.key}, image de ${c.w} × ${c.h} au lieu de ${t.w} × ${t.h}`);
  return c;
}

// Les gros (tronc de 55 cm, 10 à 11 colonnes d'écorce) : l'entaille va jusqu'à 5 px (0,45 D), la saignée jusqu'à la
// charnière, la fente monte plus haut, davantage de copeaux, plus loin (au-delà des racines, ± 12 px).
const BIG_NOTCH: [Notch, Notch, Notch] = [{ depth: 3, open: 4 }, { depth: 4, open: 6 }, { depth: 5, open: 8 }];
const BIG_CRACK: Vec[] = [[5, -2], [5, -3], [4, -4], [4, -5], [4, -6], [3, -7], [3, -8]];
const BIG_CHIPS = { gap: 13, right: [0, 6, 11, 16, 18, 18, 18, 18], left: [0, 0, 0, 0, 5, 8, 8, 8] };
const BIG_SPLINTERS: [number, number, string][] = [
  [-3, -3, '^'], [-4, -3, '*'], [-6, -6, '^'], [-3, -9, '^'], [-2, -9, '*'], [-8, -4, '^'], [-5, -11, '^'],
];

const NORMAL: Standing = {
  key: 'normal-tree',
  body: () => normalBody(),
  w: TREE_W,
  h: TREE_H,
  foot: NORMAL_FOOT,
  shadow: [NORMAL_FOOT[0] + 2, NORMAL_FOOT[1] + 0.5, 9, 2.4],
  // la coupe de la chute est à la rangée 148 (normal-fall.ts) ; le plancher juste dessous
  floor: 149,
  notch: [{ depth: 2, open: 3 }, { depth: 3, open: 4 }, { depth: 3, open: 6 }],
  back: [3, 4],
  crack: [[3, -2], [3, -3], [2, -4], [2, -5], [2, -6]],
  lean: [1.5, 2.5],
  leanShadow: [8, 11],
  chips: { gap: 4, right: [0, 4, 8, 12, 13, 13, 13, 13], left: [0, 0, 0, 0, 4, 6, 6, 6] },
  splinters: [[-3, -3, '^'], [-4, -3, '*'], [-6, -6, '^'], [-3, -8, '^'], [-2, -8, '*']],
};

const BIG: Standing = {
  key: 'big-tree',
  body: () => tallTreeBody(),
  w: 64,
  h: 160,
  foot: [33, 89 + TALL_DY],
  shadow: [36, 89.5 + TALL_DY, 17, 4],
  // la coupe de la chute est à la rangée 76 du repère 64 × 96 (big-felled.ts) ; le plancher deux rangées dessous
  floor: 78 + TALL_DY,
  notch: BIG_NOTCH,
  back: [4, 6],
  crack: BIG_CRACK,
  lean: [1.5, 3],
  leanShadow: [8, 18],
  chips: BIG_CHIPS,
  splinters: BIG_SPLINTERS,
};

const POLLARD: Standing = {
  ...BIG,
  key: 'big-pollard',
  body: () => bigBody(),
  h: 96,
  foot: [33, 89],
  shadow: [36, 89.5, 17, 4],
  floor: 78,
  lean: [2, 5],
};

// garde-fou : l'étape 0 (rien de fait) est, au pixel près, l'image de l'arbre debout
{
  const same = (a: Canvas, b: Canvas, what: string) => {
    const ga = a.toGrid();
    const gb = b.toGrid();
    if (ga.join('\n') !== gb.join('\n')) throw new Error(`étapes : ${what}, l'étape 0 diffère de l'arbre debout`);
  };
  same(fellingStage(BIG, 0), bigStanding(), 'big-tree');
}

// =====================================================================================================================
// 2. L'ébranchage
// =====================================================================================================================

interface Frame { x: number; y: number; w: number; h: number }

/** Un arbre couché à ébrancher (repère : la frame de sa chute). */
interface Lying {
  w: number;
  buttX: number;
  axisY: number;
  /** Première et dernière rangées d'écorce du tronc. */
  barkTop: number;
  barkBottom: number;
  /** Longueur du tronc depuis le bout scié (px). */
  trunkLen: number;
  frame: (left: boolean) => Frame;
  compose: (left: boolean, keep: (h: number, g: number) => boolean) => Canvas;
}

interface Felled {
  key: string;
  lying: Lying;
  /** Nombre de branches (`limbs.count` de props.json). */
  limbs: number;
}

/** Part des branches tombées à chaque étape. */
const LIMBED = [0.3, 0.6, 0.85];

/** Une branche coupée : sa place (h le long du tronc, g en travers : son côté). */
interface Limb { h: number; g: number }

/** L'étendue du houppier de l'arbre entier, en distance au pied (h), et sa plus grande demi-largeur. */
function crownExtent(f: Felled): { h0: number; h1: number; gMax: number } {
  const all = f.lying.compose(false, () => true);
  const bare = f.lying.compose(false, () => false);
  let h0 = Infinity, h1 = -Infinity, gMax = 0;
  for (let Y = 0; Y < all.h; Y++) for (let X = 0; X < all.w; X++) {
    const q = all.get(X, Y);
    if (q === EMPTY || !'jLlk'.includes(q) || bare.get(X, Y) === q) continue;
    const h = X + 0.5 - f.lying.buttX;
    h0 = Math.min(h0, h); h1 = Math.max(h1, h); gMax = Math.max(gMax, Math.abs(Y + 0.5 - f.lying.axisY));
  }
  return { h0, h1, gMax };
}

/**
 * Le front de l'ébranchage à chaque étape : on coupe du pied vers la cime, le houppier ne garde que ce qui est au-delà du
 * front. Le front n'est pas droit : festonné en travers (des branches plus ou moins longues). À la dernière étape, la
 * touffe de la cime touche encore le bout du tronc (chez les gros, elle couvre le bout scié de la pièce de bois).
 */
function frontsOf(f: Felled) {
  const { h0, h1, gMax } = crownExtent(f);
  // la touffe qui reste touche encore le bout du tronc : sans cela elle flotterait au-delà, comme un buisson à part
  const last = Math.min(h0 + LIMBED[2] * (h1 - h0), f.lying.trunkLen - 3);
  const fronts = LIMBED.map((p) => h0 + (p / LIMBED[2]) * (last - h0));
  const r = rng(f.limbs * 7 + 1);
  const ph = [r() * 6, r() * 6];
  const wave = (g: number) => 2.2 * Math.sin(g * 0.8 + ph[0]) + 1.4 * Math.sin(g * 1.9 + ph[1]) + 0.12 * Math.abs(g) * 2;
  return { h0, h1, gMax, fronts, keep: (front: number) => (h: number, g: number) => h > front + wave(g) };
}

/**
 * Les branches coupées à une étape : autant que la part du houppier passée sous le front (`limbs` en tout), en quinconce de
 * part et d'autre du tronc, placées irrégulièrement dans la partie coupée.
 */
function limbsAt(f: Felled, h0: number, last: number, gMax: number, share: number): Limb[] {
  const n = Math.round(f.limbs * share);
  const r = rng(f.limbs * 13 + 5);
  const out: Limb[] = [];
  for (let i = 0; i < f.limbs; i++) {
    const t = (i + 0.3 + r() * 0.4) / f.limbs;
    // place fixe d'une étape à l'autre : la branche i tombe à la même place, quelle que soit l'étape
    const h = h0 - 4 + (t / LIMBED[2]) * (last - h0 + 4);
    const side = (i + (r() < 0.25 ? 1 : 0)) % 2 === 0 ? -1 : 1;
    const g = side * gMax * (0.35 + r() * 0.25);
    if (i < n) out.push({ h: Math.min(h, last - 2), g });
  }
  return out;
}

/**
 * Une branche coupée, couchée au sol, vue de dessus : une tige (écorce, dessus clair) qui part près du tronc vers la cime en
 * s'en écartant, et des touffes de feuillage irrégulières le long d'elle, éclairées en haut à gauche. `dir` : sens de la cime
 * (+1 à droite), `side` : −1 au nord du tronc, +1 au sud. Peinte dans `c` (sans contour), base en (x, y).
 */
function fallenBranch(c: Canvas, x: number, y: number, dir: number, side: number, seed: number) {
  const r = rng(seed);
  const len = 7 + Math.floor(r() * 5);
  const rise = 1 + r() * 2.5;
  const at = (t: number): Vec => [x + dir * len * t, y + side * rise * t];
  // la tige : deux pixels d'épaisseur au pied (le dessus clair), un au bout
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const [px, py] = at(t);
    c.set(Math.round(px), Math.round(py), 'N');
    if (t < 0.45) c.set(Math.round(px), Math.round(py) - 1, 'm');
  }
  // les touffes : deux à quatre, de tailles inégales, dans la moitié du bout, un peu de part et d'autre de la tige
  const n = 2 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const t = 0.45 + r() * 0.55;
    const [cx0, cy0] = at(t);
    const rx = 1.6 + r() * 1.4;
    const ry = 1.1 + r() * 0.8;
    const cx = cx0 + (r() - 0.5) * 2;
    const cy = cy0 + (r() - 0.5) * 2.5;
    for (let yy = Math.floor(cy - ry - 1); yy <= Math.ceil(cy + ry + 1); yy++) {
      for (let xx = Math.floor(cx - rx - 1); xx <= Math.ceil(cx + rx + 1); xx++) {
        const u = (xx + 0.5 - cx) / rx;
        const v = (yy + 0.5 - cy) / ry;
        if (u * u + v * v > 1) continue;
        const lit = -(u + v) * 0.7;
        c.set(xx, yy, lit > 0.5 ? 'j' : lit > -0.05 ? 'L' : lit > -0.6 ? 'l' : 'k');
      }
    }
  }
}

/** Une étape de l'ébranchage (1 à 3) de l'arbre couché, dans sa vue (`left` : la vue `-left`), recadrée sur son cadre. */
function limbingStage(f: Felled, stage: number, left: boolean): Canvas {
  const L = f.lying;
  const { h0, gMax, fronts, keep } = frontsOf(f);
  const front = fronts[stage - 1];
  const limbs = limbsAt(f, h0, fronts[2], gMax, LIMBED[stage - 1]);
  const c = L.compose(left, keep(front));
  const X = (h: number) => Math.round(left ? L.w - 1 - (L.buttX + h) : L.buttX + h);
  const frame = L.frame(left);

  // les cicatrices : deux pixels de bois neuf sur l'écorce, au nord ou au sud du tronc, là où la branche partait
  for (const l of limbs) {
    if (l.h < 2 || l.h > L.trunkLen - 2) continue;
    const y = l.g < 0 ? L.barkTop + 1 : L.barkBottom - 1;
    const x = X(l.h);
    if ('MmNK'.includes(c.get(x, y)) && 'MmNK'.includes(c.get(x + 1, y))) { c.set(x, y, '^'); c.set(x + 1, y, '^'); }
  }

  // les branches tombées : au sol, du côté où elles étaient, contre le tronc, sous tout le reste
  const layer = new Canvas(c.w, c.h);
  const half = (L.barkBottom - L.barkTop + 1) / 2 + 1;
  limbs.forEach((l, i) => {
    const side = l.g < 0 ? -1 : 1;
    const dir = left ? -1 : 1;
    // au sol le long du tronc, jamais au-delà de son bout
    const h = Math.max(2, Math.min(l.h - 5, L.trunkLen - 14));
    const y = Math.round(L.axisY + side * (half + 1.5 + (i % 3 === 1 ? 1 : 0)));
    fallenBranch(layer, X(h), y, dir, side, 300 + i * 17);
  });
  despeckle(layer);
  shadedOutline(layer);
  // ne garder que ce qui tient dans le cadre (contour compris), au-dessus de son bord du bas
  for (let Y = 0; Y < c.h; Y++) for (let Xx = 0; Xx < c.w; Xx++) {
    const q = layer.get(Xx, Y);
    if (q === EMPTY) continue;
    if (Xx < frame.x || Xx >= frame.x + frame.w || Y < frame.y || Y >= frame.y + frame.h - 1) continue;
    const under = c.get(Xx, Y);
    if (under === EMPTY || under === 'x') c.set(Xx, Y, q);
  }
  // leur ombre : un pixel sous chacun, décalé vers la droite, sur le vide
  for (let Y = c.h - 1; Y >= 1; Y--) for (let Xx = c.w - 1; Xx >= 1; Xx--) {
    if (c.get(Xx, Y) !== EMPTY || layer.get(Xx - 1, Y - 1) === EMPTY || layer.get(Xx, Y) !== EMPTY) continue;
    if (Xx < frame.x || Xx >= frame.x + frame.w || Y >= frame.y + frame.h) continue;
    c.set(Xx, Y, 'x');
  }

  const out = new Canvas(frame.w, frame.h);
  for (let Y = 0; Y < frame.h; Y++) for (let Xx = 0; Xx < frame.w; Xx++) out.px[Y][Xx] = c.get(frame.x + Xx, frame.y + Y);
  return out;
}

const FELLED: Felled[] = [
  { key: 'normal-felled-tree', lying: NORMAL_LYING, limbs: 12 },
  { key: 'big-felled-tree', lying: bigLying(BIG_FELLED, BIG_TREE_CM, 0), limbs: 16 },
  { key: 'big-pollard-felled-tree', lying: bigLying(POLLARD_FELLED, POLLARD_CM, CROWN_SHIFT), limbs: 10 },
];

// =====================================================================================================================
// Les images
// =====================================================================================================================

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

/** Les étapes, par objet et par vue, dans l'ordre : pour la planche de contrôle (art/world/work-stages-preview.ts). */
export const STAGE_GROUPS: { base: string; stages: ImageSource[] }[] = [
  ...[NORMAL, BIG, POLLARD].map((t) => ({
    base: t.key,
    stages: [1, 2, 3, 4, 5, 6, 7].map((s) => img(`${t.key}-stage-${s}`, fellingStage(t, s))),
  })),
  ...FELLED.flatMap((f) => [false, true].map((left) => {
    const base = left ? `${f.key}-left` : f.key;
    return { base, stages: [1, 2, 3].map((s) => img(`${base}-stage-${s}`, limbingStage(f, s, left))) };
  })),
];

export default STAGE_GROUPS.flatMap((g) => g.stages);
