// Le groupe terre (chantier « briques », docs/objets/) : la motte de terre (argile grasse tranchée à la bêche), la motte de
// torchis, la gâchée de mortier de terre, le seau plein et la bêche. Échelle du jeu (5 cm par pixel), lumière en haut à
// gauche, contour d'un pixel (teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite), ombre
// portée `x` en bas à droite, hors silhouette.
//
// Matières, toutes prises dans la palette : l'argile grasse et humide sur la rampe de la terre (U u n e : ocre gris-brun,
// U pour le luisant des faces tranchées) ; le torchis sur la sienne (d D E), plus clair, la paille hachée en grappes
// (Y t) ; le mortier frais sur la terre de labour mouillée (F f), plus sombre et luisant (U) ; l'eau (W w q) ; le seau en
// bois cerclé de fer (art/world/props.ts) ; la bêche en bois (M m N, poignée patinée) ferrée au bout (fer presque noir 0,
// fil clair 1, comme la hache et la doloire, art/items/tools.ts).

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import { lightUp, type Material, type Materials } from '../lib/light';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { BUCKET, BUCKET_WATER, bucket } from '../world/props';
import { BRANCH_FIST, FIST, behindHead, fistGap, sheet } from './carried';
import { darkest, outline } from './lib';
import { lyingView } from './lying';
import { toolPalette } from './tools';

/** Teinte la plus sombre de chaque matière, pour le contour côté lumière. */
const dark = darkest({
  U: 'e', u: 'e', n: 'e', e: 'e', // argile
  d: 'E', D: 'E', E: 'E', Y: 'E', t: 'E', // torchis et sa paille
  F: 'f', f: 'f', // mortier
  M: 'K', m: 'K', N: 'K', K: 'K', z: 'Z', r: 'Z', W: 'q', w: 'q', q: 'q', // seau
  '1': '0', '0': '0', '4': '0', // fer de la bêche
}, 'o');

/**
 * Ombre portée d'un objet posé : sa silhouette décalée d'un pixel vers le sud et l'est, sur les deux dernières rangées
 * seulement (l'ombre reste au sol, elle ne monte pas le long du flanc est). Ajoute une colonne et une rangée.
 */
function castShadow(c: Canvas): Grid {
  const out = new Canvas(c.w + 1, c.h + 1).stamp(c.toGrid(), 0, 0);
  for (let y = c.h - 1; y < out.h; y++) for (let x = 1; x < out.w; x++) {
    if (out.get(x, y) === EMPTY && c.get(x - 1, y - 1) !== EMPTY) out.set(x, y, 'x');
  }
  return out.toGrid();
}

/** Une matière dessinée sans contour (`inner`) -> son contour d'un pixel. */
const outlined = (inner: Grid): Canvas => outline(new Canvas(inner[0].length + 2, inner.length + 2).stamp(inner, 1, 1), dark);

// ---------- Motte de terre ----------
// Une motte d'argile grasse de 20 cm de côté, tranchée à la bêche au bord de l'étang : boîte de 20 × 20 × 20 cm, 4 × 6 px à
// la taille réelle, agrandie au plancher de lisibilité (6 px de large, mêmes proportions : 6 × 9). Deux faces nettes, lisses
// et luisantes, laissées par les coups de bêche ; le reste arraché, grumeleux (grappes de u et de e). Deux formes (matière
// naturelle) : la première debout, la face sud et le flanc ouest tranchés, le dessus arraché qui retombe à l'est ; la
// seconde (`-b`, 6 × 8) couchée sur le côté, une face tranchée en dessus, en biais, le devant arraché et le pied écrasé.

const CLAY_A: Grid = [
  'uu..',
  'uun.', // le dessus arraché, qui retombe à l'est
  'uunn',
  'UUUu', // l'arête vive du coup de bêche, qui prend le jour
  'nnnn', // la face sud tranchée, lisse et mate
  'nnne',
  'nnne',
];
const CLAY_B: Grid = [
  '.uUU',
  'uuUu', // la face tranchée, couchée en biais : lisse, un luisant
  'uuuu',
  'nnen', // le devant arraché
  'neen',
  'nne.', // le pied écrasé
];

const clayGround = (inner: Grid): Grid => castShadow(outlined(inner));

// ---------- Motte de torchis ----------
// Même unité que la motte de terre (20 × 20 × 20 cm, 6 × 9 px) : terre, paille hachée et eau, pétrie à la main en pâton.
// Plus régulière (les coins arrondis, pas d'arrachement), plus claire, des brins de paille en grappes de teinte paille.

const COB: Grid = [
  '.dd.',
  'dtYd', // le dessus, pétri, des brins de paille
  'dddD',
  'DDDE', // la face sud
  'DYtE',
  'DDDE',
  '.EE.',
];

// ---------- Gâchée de mortier ----------
// Un tas aplati de mortier frais, 50 × 40 × 15 cm : boîte, 10 × (3 + 4) = 10 × 7 px. La terre mouillée et battue, plus
// sombre que la motte, en dôme bas au nord-ouest qui s'étale en bourrelet jusqu'au sol ; luisante (U) sur le dôme.

const MORTAR: Grid = [
  '..FUUF..', // le dôme, luisant
  '.FUFFff.',
  'FFFfffFF', // le creux au pied du dôme, puis le bourrelet
  'FFfFFFFf',
  'efffffee', // le bord qui s'étale au sol
];

// ---------- Icônes ----------

const ICON_CLAY: Grid = [
  '................',
  '................',
  '.....UU.........',
  '...UUUuuU.......',
  '..UuUUuuuun.....',
  '..UuuUuuunnn....',
  '..uuuuuunnnn....',
  '..UUUUUUUuunn...',
  '..uuuuuuuunnn...',
  '..uuuuuuunnne...',
  '..unnnnnnnnne...',
  '..unnnnnnnnee...',
  '..nnnnnnnneee...',
  '...nnneeeee.....',
  '................',
  '................',
];

const ICON_COB: Grid = [
  '................',
  '................',
  '................',
  '.....dddddd.....',
  '...ddYYtdddDD...',
  '..dddddddddtDD..',
  '..ddtddddYYdDD..',
  '..DDDDDDDDDDDE..', // l'arête du pâton
  '..DDYYtDDDDDEE..', // brins de paille hachée, en long
  '..DDDDDDDtDDEE..',
  '..DDDDDDYYDDEE..',
  '..DtYDDDDDDEEE..',
  '...DDDDDDEEEE...',
  '................',
  '................',
  '................',
];

/** Le seau en icône, 12 px de large : vide (le dedans sombre) ou plein (l'eau et son reflet). */
function iconBucket(full: boolean): Grid {
  const inside = full
    ? ['WWWwwwwwwq', 'wwwwwwwwqq']
    : ['NNmmmmmmmN', 'KKKKKNNNmm'];
  const g: Grid = [
    '................',
    '................',
    '.....zzzzzz.....', // l'anse
    '....z......z....',
    '...z........z...',
    '..KKKKKKKKKKKK..', // le bord arrière
    `..K${inside[0]}o..`,
    `..K${inside[1]}o..`,
    '..KMMMMMMMMMNo..', // le bord avant
    '..KRrrrrrrzzZo..', // cercle de fer
    '..KMMmMMmMmNNo..', // douelles
    '..KMMmMMmMmNNo..',
    '..KRrrrrrrzzZo..',
    '..KMMmMMmMmNNo..',
    '...oooooooooo...',
    '................',
  ];
  return g;
}

/**
 * Icône de la bêche, 16 × 16, pas à l'échelle : en diagonale, le fer en bas à gauche, la poignée en T en haut à droite.
 * La pelle de bois s'élargit au bout du manche, ferrée sur son dernier tiers, le fil clair au bord.
 */
function iconSpade(): Grid {
  const c = new Canvas(16, 16);
  const ax = 3, ay = 13; // le milieu du fil
  const r = Math.SQRT1_2;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const px = x + 0.5 - ax, py = y + 0.5 - ay;
    const a = (px - py) * r; // le long du manche, depuis le fil
    const b = (px + py) * r; // en travers : < 0 côté lumière (haut à gauche)
    let k: string | null = null;
    if (a >= 0 && a < 6 && Math.abs(b) <= 2.3 - (a > 5 ? 1 : 0)) {
      if (a < 1) k = '1';
      else if (a < 2.6) k = b < -0.8 ? '4' : '0';
      else k = b < -0.8 ? 'M' : b > 0.9 ? 'm' : 'M';
    } else if (a >= 6 && a < 13 && Math.abs(b) <= 0.75) k = a > 11 ? 'm' : 'M';
    else if (a >= 13 && a < 14.5 && Math.abs(b) <= 2) k = b < 0 ? 'M' : 'm';
    if (k) c.set(x, y, k);
  }
  return outline(c, dark).toGrid();
}

// ---------- Bêche au sol ----------
// Couchée à plat (`spade-ground`, 110 × 20 × 5 cm : boîte, 22 × (1 + 2) = 22 × 3 px ; dessinée 22 × 5 contour compris,
// comme la doloire, pour que la pelle se lise plus large que le manche). La tête à l'est : la poignée en T au bout ouest
// (la traverse en travers, N), le manche, la pelle de bois qui s'élargit (épaulée d'un pixel), ferrée sur ses deux derniers
// pixels (0), le fil clair (1) au bout est. Puis un quart de tour de plus à chaque vue, dans le sens des aiguilles d'une
// montre (règle D : `-r1` et `-r3` 5 × 22, `-r2` 22 × 5), la lumière toujours en haut à gauche.

/** La bêche est-ouest, tête à l'est : traverse du T, poignée patinée, manche, pelle de bois, fer, fil. */
const SPADE_EW: Grid = [
  'M' + '.'.repeat(14) + 'MM001',
  'm' + 'mm' + 'M'.repeat(12) + 'MM001',
  'N' + '.'.repeat(14) + 'mm001',
];
/** La bêche nord-sud, tête au sud : la même, dessinée en long (la lumière à gauche). */
const SPADE_NS: Grid = ['MMm', '.m.', '.m.', ...Array(12).fill('.M.'), 'MMm', 'MMm', '000', '000', '111'];

const SPADE_VIEWS: Record<'r0' | 'r1' | 'r2' | 'r3', Grid> = {
  r0: SPADE_EW, // tête à l'est
  r1: SPADE_NS, // tête au sud
  r2: SPADE_EW.map((r) => [...r].reverse().join('')), // tête à l'ouest
  r3: [...SPADE_NS].reverse(), // tête au nord
};

// ---------- Tenus ----------
// Le jeu pose le centre de l'image sur le point d'accroche (art/items/carried.ts).

/** Une image tenue : `g` posée dans un carré de `size`, son pixel (`gx`, `gy`) sur le centre. */
function onPoint(g: Grid, size: number, gx: number, gy: number): Canvas {
  const C = Math.floor(size / 2);
  return new Canvas(size, size).stamp(g, C - gx, C - gy);
}

/** Retire l'ombre portée (rangées et colonnes de `x`) d'une image au sol. */
const noShadow = (g: Grid): Grid => g.map((r) => r.replace(/x/g, '.'));

// Portées à deux mains devant le ventre (posture `carry`, comme la pierre plate) : la motte entière entre les mains, son
// milieu sur la prise ; de dos, elle passe sous le corps. Ronde, elle se voit pareille des trois côtés.
const CARRY_SIZE = 15;

function carriedClod(g: Grid): SpriteSheetSource['animations'][string]['frames'][number] {
  const body = noShadow(g).filter((r) => /[^.]/.test(r)).map((r) => r.slice(0, -1));
  return onPoint(body, CARRY_SIZE, Math.floor(body[0].length / 2), Math.floor(body.length / 2)).toGrid();
}

const heldClod = (name: string, g: Grid): SpriteSheetSource => {
  const v = carriedClod(g);
  return sheet(name, CARRY_SIZE, world, { down: v, up: v, right: v });
};

// Le seau au poing, bras pendant (posture `hand`, comme le rouleau de corde) : l'anse dans le poing (le poing 2 × 2, le
// point d'accroche son pixel du bas côté extérieur), le seau pend dessous. De profil, on voit l'anse en arceau (ses
// oreilles devant et derrière) ; de face et de dos, elle est vue par la tranche : un fil droit du poing au bord.
const HAND_SIZE = 17;

function heldBucketView(view: 'down' | 'up' | 'right', full: boolean): Grid {
  const C = Math.floor(HAND_SIZE / 2);
  const body = BUCKET.map((r, i) => (i === 3 && full ? BUCKET_WATER : r));
  const c = new Canvas(HAND_SIZE, HAND_SIZE);
  if (view === 'right') {
    // l'arceau dans le poing (rangées C − 1 et C), le bord juste dessous : la main est à 40 cm du sol, le seau pend
    // presque jusqu'à terre
    c.stamp(body, C - 2, C - 2);
  } else {
    // l'anse par la tranche : un fil du poing au bord arrière, le seau dessous
    const edgeOn = body.map((r, i) => (i === 0 ? '..z...' : i === 1 ? '..z...' : r));
    c.stamp(edgeOn, C - 2, C - 2);
  }
  return view === 'up' ? c.toGrid() : fistGap(c.toGrid(), C, BRANCH_FIST);
}

const heldBucket = (name: string, full: boolean): SpriteSheetSource =>
  sheet(name, HAND_SIZE, world, {
    down: heldBucketView('down', full),
    up: heldBucketView('up', full),
    right: heldBucketView('right', full),
  });

// La bêche sur l'épaule (posture `shoulder`, comme la doloire et la cognée) : le poing la serre devant la poitrine, la
// poignée en T juste sous lui ; le manche passe sur l'épaule, la pelle derrière, au-dessus. La pelle est tournée d'un
// huitième de tour sur le manche (posée de biais sur l'épaule) : on la voit de quatre pixels de large de face, de dos et de
// profil. Manche de 85 cm (17 px du poing au fer, T compris), pelle de 25 cm (5 px : 2 de bois, 2 de fer, le fil).

const SHOULDER_SIZE = 45;

const wood: Material = { light: 'M', base: 'M', shade: 'm', dark: 'K' };
const iron: Material = { light: '4', base: '0', shade: '0', dark: '0' };
const spadeMaterials: Materials = {
  M: wood,
  L: wood, // la pelle de bois
  w: { light: 'm', base: 'm', shade: 'N', dark: 'K' }, // la poignée patinée et le T
  f: iron, // le fer du bout
  '1': { light: '1', base: '1', shade: '1', dark: '0' }, // le fil
};

/** La bêche en zones le long de son axe : `a` depuis le poing (pixels vers la pelle), `b` en travers. */
function spadeZone(a: number, b: number): string | null {
  const ab = Math.abs(b);
  if (a >= -3 && a < -2) return ab <= 1.8 ? 'w' : null; // la traverse du T
  if (a >= -2 && a < 12) return ab <= 0.75 ? (a < 1 ? 'w' : 'M') : null; // le manche
  if (a >= 12 && a < 17) {
    if (ab > (a < 13 ? 1.5 : 2.1)) return null; // la pelle s'épaule sur le manche, puis 4 px de large
    return a < 14 ? 'L' : a < 16 ? 'f' : '1';
  }
  return null;
}

/** La bêche, la pelle vers `deg` (90 = haut, plus = vers la gauche), le poing au centre de l'image. */
function spadeZones(deg: number): Grid {
  const c = new Canvas(SHOULDER_SIZE, SHOULDER_SIZE);
  const C = Math.floor(SHOULDER_SIZE / 2);
  const rad = (deg * Math.PI) / 180;
  const ux = Math.cos(rad), uy = -Math.sin(rad);
  const ox = C + 0.5, oy = C; // le milieu du poing (2 × 2)
  for (let y = 0; y < SHOULDER_SIZE; y++) for (let x = 0; x < SHOULDER_SIZE; x++) {
    const px = x + 0.5 - ox, py = y + 0.5 - oy;
    const z = spadeZone(px * ux + py * uy, px * uy - py * ux);
    if (z) c.set(x, y, z);
  }
  return c.toGrid();
}

const heldSpade = (): SpriteSheetSource => {
  const C = Math.floor(SHOULDER_SIZE / 2);
  return sheet('held-spade', SHOULDER_SIZE, toolPalette, {
    down: behindHead(fistGap(lightUp(spadeZones(112), spadeMaterials), C, FIST), 'down'),
    up: lightUp(spadeZones(68), spadeMaterials),
    right: behindHead(fistGap(lightUp(spadeZones(135), spadeMaterials), C, FIST), 'right'),
  });
};

// ---------- Planche ----------

const img = (name: string, grid: Grid, palette = world): ImageSource => ({ kind: 'image', name, palette, grid });

const sources: ArtSource[] = [
  img('clay-clod-ground', clayGround(CLAY_A)),
  img('clay-clod-ground-b', clayGround(CLAY_B)),
  img('item-clay-clod', outline(Canvas.from(ICON_CLAY), dark).toGrid()),
  heldClod('held-clay-clod', clayGround(CLAY_A)),
  img('cob-ground', castShadow(outlined(COB))),
  img('item-cob', outline(Canvas.from(ICON_COB), dark).toGrid()),
  heldClod('held-cob', castShadow(outlined(COB))),
  img('earth-mortar', castShadow(outlined(MORTAR))),
  img('bucket-water', bucket(true).toGrid()),
  img('item-bucket', outline(Canvas.from(iconBucket(false)), dark).toGrid()),
  img('item-bucket-water', outline(Canvas.from(iconBucket(true)), dark).toGrid()),
  heldBucket('held-bucket', false),
  heldBucket('held-bucket-water', true),
  img('spade-ground', lyingView(SPADE_VIEWS.r0, dark, false), toolPalette),
  img('spade-ground-r1', lyingView(SPADE_VIEWS.r1, dark, true), toolPalette),
  img('spade-ground-r2', lyingView(SPADE_VIEWS.r2, dark, false), toolPalette),
  img('spade-ground-r3', lyingView(SPADE_VIEWS.r3, dark, true), toolPalette),
  img('item-spade', iconSpade(), toolPalette),
  heldSpade(),
];

export default sources;
