// Icônes d'objets 16×16 : les ressources que Xéros ramasse (inventaire, objet tombé au sol).
// Pas d'ombre portée : le jeu l'ajoute quand l'objet est posé.
// Contour d'un pixel : teinte la plus sombre de la matière en haut et à gauche, OUTLINE en bas et à droite.

import { Canvas, EMPTY } from '../lib/canvas';
import { capsule, outline } from './lib';
import { branchBody, centerIn, diagonal, finishBranch, type Branch } from './branch';
import type { ImageSource } from '../lib/types';
import { world } from '../palette';
import { NORMAL_WOOD, POLE_WOOD, bark, paintFace } from '../world/wood';
import { shadedOutline } from '../world/big-tree';
import { SKINS } from '../world/wood-skin';
import { strawIconCanvas } from './fibres';

const S = 16;

const palette = {
  ...world,
  // minerai de fer : rouille et reflets, dérivés de la pierre (z Z) et des braises (i)
  '1': '#a65a34', // rouille claire (i assombri, tiré vers la terre)
  '2': '#7a4430', // rouille sombre (vers le brun-violet des ombres)
  '3': '#c9c8bc', // reflet métallique (R éclairci, un peu froid)
  '4': '#47423b', // roche du minerai, ombre profonde (Z assombri)
  '5': '#7f8386', // fer à nu (z refroidi)
  // rouge des baies et de la pomme, dérivé des fleurs (c) et des braises (i)
  '6': '#d27a52', // rouge éclairé (c tiré vers le jaune)
  '7': '#a8453a', // rouge franc
  '8': '#74303a', // rouge d'ombre (vers le brun-violet)
};

// ---------- Branche ----------

/**
 * La branche sèche du tas et du sol (art/items/branch.ts), réduite pour la case : 13 px au lieu de 22 à 28, en
 * diagonale, gros bout cassé clair en bas à gauche, pointe en haut à droite. Les rameaux se tracent après la mise en
 * diagonale, pour qu'ils s'écartent de la tige comme sur la branche couchée : un fourchu à gauche, un court à droite.
 */
function branch(): Canvas {
  const b: Branch = { len: 13, thickLeft: true, thick: 6, seed: 71, twigs: [] };
  // tige à plat sur la rangée 5, puis en diagonale : le pixel (x, 5) passe en (x, 21 - x)
  const c = diagonal(branchBody(b, 1, 16, 8, 6));
  c.line(5, 16, 5, 12, 'm').line(5, 12, 4, 11, 'm').line(5, 12, 6, 11, 'm');
  c.line(9, 12, 12, 11, 'm');
  return finishBranch(centerIn(c, S, S));
}

// ---------- Pierre ----------

/** Caillou à facettes : dessus clair, flanc gauche moyen, face sud et flanc droit sombres. */
function stone(): Canvas {
  const c = Canvas.from([
    '................',
    '................',
    '.....RRRRRR.....',
    '....RRRRRRRRR...',
    '...rRRRRRRRRRR..',
    '..rrrRRRRRRRRzz.',
    '..rrrrRRRRRRzzz.',
    '.rrrrrrRRRRzzzz.',
    '.rrrrrrrrRzzzzz.',
    '.zzrrrrrrrzzzzZ.',
    '.zzzzzzzzzzzzZZ.',
    '.zzzZZzzzzzzZZZ.',
    '..zzzzZZzzzZZZ..',
    '...ZZZZZZZZZZ...',
    '................',
    '................',
  ]);
  return outline(c, 'Z');
}

// ---------- Minerai de fer ----------

/**
 * Bloc de roche sombre et anguleux, veiné de rouille, avec des éclats de fer.
 * Dessiné avec les lettres de la pierre, puis assombri d'un cran (la roche ferreuse est plus noire).
 */
function ironOre(): Canvas {
  const c = Canvas.from([
    '................',
    '......rr........',
    '.....rRRr...r...',
    '....rRRRrr.rRr..',
    '...rRRR1rrrRRrz.',
    '..rrRR12rrrRrzz.',
    '..rrR12rr35rzzZ.',
    '.zrr12rrr55zzzZ.',
    '.zzr12rrrrzzZ1Z.',
    '.zzz12zzzzzZ12Z.',
    '.ZzzzzzzZZZ12ZZ.',
    '.ZZz35zZZZZ12ZZ.',
    '..ZZ55ZZZZZ12Z..',
    '...ZZZZZZZZZZ...',
    '................',
    '................',
  ]);
  c.recolor({ Z: '4', z: 'Z', r: 'z', R: 'r' });
  return outline(c, '4');
}

// ---------- Paille ----------

/**
 * La gerbe de paille longue (`straw`, art/items/fibres.ts) en diagonale : le pied coupé net en bas à gauche, le lien de
 * paille tordue au milieu, les épis bruns à grains clairs en haut à droite. Le dessin est celui de fibres.ts.
 */
function straw(): Canvas {
  return strawIconCanvas();
}

// ---------- Blé ----------


// ---------- Graines ----------


// ---------- Baies ----------


// ---------- Champignon ----------


// ---------- Œuf ----------


// ---------- Pomme ----------


// ---------- Laine ----------


// ---------- Pièce de bois ----------
// Les icônes de la pièce de bois (src/content/wood.json : `icon` de chaque aspect), une par aspect qui se voit dans la
// case : le gros bois rond, demi, quart ; le bois normal rond (le rondin, avec ses faces dressées une à trois) et la poutre.
// Toutes de biais, le bout tourné vers la lumière en bas à gauche, la pièce qui fuit vers le haut à droite, contour K.

/**
 * Gros bois rond (la bille d'un mètre) couché de biais, réduit pour la case : la matière commune (art/world/wood.ts),
 * écorce claire en haut, sombre en bas, sillons le long du fil ; bout scié tourné vers la lumière, ovale cerclé
 * d'écorce, bois de bout éclairé en haut à gauche et le cœur.
 */
function bigRoundIcon(): Canvas {
  const c = new Canvas(S, S);
  const [x0, y0, x1, y1] = [4.4, 9.4, 11.4, 6.8];
  const r = 3.4;
  capsule(c, x0, y0, x1, y1, r, (t, a) => bark(t * 16, (a + 1) / 2));
  // bout scié : la face de coupe commune, ovale, au bout bas gauche
  paintFace(c, x0 - 0.9, y0 + 0.1, 2.4, 3.5, { all: true });
  // retouches : bosse d'un pixel sur le dos de l'écorce, pixel de sillon seul au bas du flanc
  c.set(11, 3, EMPTY).set(12, 9, 'N');
  return outline(c, 'K');
}

/**
 * Demi-bille : la bille fendue en deux, face de fente en haut. Même biais que le rond : devant, en bas à gauche, le bout
 * en demi-lune (le cœur au milieu de son bord droit du haut, contre la fente, un cerne, l'écorce N sur l'arc) ; la face
 * de fente, la plus claire (^, fibres * en long), fuit vers le haut à droite ; le dos d'écorce dessous, à droite, de m à
 * K vers le bas.
 */
const HALF_ICON = [
  '................',
  '................',
  '........^^^*^^^.',
  '.......^*^^^^*m.',
  '......^^^*^^^mm.',
  '....^^*^^^*^mmN.',
  '..^^^^^*^^^mmNN.',
  '.N***%**NmmNNNK.',
  '.N^*%%%*NmNNNK..',
  '..N^***NNNNKK...',
  '...NNNNNNNK.....',
  '................',
  '................',
  '................',
  '................',
  '................',
];
const bigHalfIcon = (): Canvas => shadedOutline(Canvas.from(HALF_ICON));

/**
 * Quartier de biais, dans sa position au sol (wood.json, `section` : l'écorce en bas, la pointe en l'air, l'angle du cœur).
 * Devant, en bas à gauche, son bout en triangle pointe en haut : le cœur (%) à la pointe, un cerne (*), le bois de bout clair,
 * l'arc d'écorce (N) dessous. La pièce fuit vers le haut à droite : le triangle poussé de loin en près, dont on voit l'arête
 * (le fil du cœur, qui accroche la lumière : ^), puis la face fendue tournée vers nous, qui descend dans l'ombre (*, %, fibres
 * &, la matière des faces fendues de art/world/wood-skin.ts) jusqu'au liseré d'écorce du pied. La face nord, tournée vers la
 * lumière, est derrière l'arête : on ne la voit pas d'ici.
 */
function bigQuarterIcon(): Canvas {
  const c = new Canvas(S, S);
  /** Tout descend de 2 rangées : l'icône centrée dans la case. */
  const DOWN = 2;
  // le triangle du bout : la pointe en (5, 5), une colonne de plus de chaque côté par rangée, l'arc d'écorce en rangée 10
  const tri = (X: number, Y: number) => (Y >= 5 && Y <= 9 && Math.abs(X - 5) <= Y - 5) || (Y === 10 && X >= 2 && X <= 8);
  const dash = (x: number, phase: number, every: number, len: number) => (x + phase) % every < len;
  // la pièce qui fuit : le triangle poussé de 5 px vers la droite et de 3 vers le haut, de loin en près
  const body = new Canvas(S, S);
  for (let k = 5; k >= 1; k--) {
    const dx = k, dy = -Math.round(k * 0.6);
    for (let Y = 0; Y < S; Y++) for (let X = 0; X < S; X++) if (tri(X, Y)) body.set(X + dx, Y + dy, 'x');
  }
  // la pointe du bout lointain : un pixel seul au-dessus de l'arête, retiré (la silhouette reste droite)
  for (let X = 1; X < S - 1; X++) {
    const top = [...Array(S).keys()].find((Y) => body.get(X, Y) !== EMPTY);
    if (top !== undefined && body.get(X - 1, top) === EMPTY && body.get(X + 1, top) === EMPTY) body.set(X, top, EMPTY);
  }
  for (let X = 0; X < S; X++) {
    const ys = [...Array(S).keys()].filter((Y) => body.get(X, Y) !== EMPTY && !tri(X, Y));
    if (!ys.length) continue;
    const top = Math.min(...ys);
    const foot = Math.max(...ys);
    for (const Y of ys) {
      const d = Y - top;
      let q = d === 0 ? '^' : d === 1 ? (dash(X, 0, 4, 2) ? '%' : '*') : d === 2 ? (dash(X, 1, 5, 2) ? '*' : '%') : dash(X, 3, 5, 3) ? '&' : '%';
      if (Y === foot && d > 1 && !tri(X, Y + 1)) q = 'N';
      // contre le bout, l'ombre de son arête
      else if (tri(X - 1, Y) && d > 0) q = '%';
      c.set(X, Y + DOWN, q);
    }
  }
  const END: [number, string][] = [
    [5, '.....%'],
    [6, '....^%*'],
    [7, '...^***%'],
    [8, '..^^*^**%'],
    [9, '.^^^^^^^*%'],
    [10, '..NNNNNNN'],
  ];
  for (const [y, row] of END) [...row].forEach((q, x) => { if (q !== '.') c.set(x, y + DOWN, q); });
  return shadedOutline(c);
}

/**
 * Bois normal rond (le rondin, de la grosseur d'un bras : 30 cm au lieu de 55) : même cadrage, même biais que le gros.
 * Matière `NORMAL_WOOD` (deux couloirs de sillons) ; bout scié en bas à gauche, ovale étroit sans cerne. Sert aussi au
 * rondin dont la doloire a dressé une à trois faces (wood.json).
 */
function normalRoundIcon(): Canvas {
  const c = new Canvas(S, S);
  const [x0, y0, x1, y1] = [4.4, 9.4, 11.4, 6.8];
  const r = 2.2;
  capsule(c, x0, y0, x1, y1, r, (t, a) => bark(t * 16, (a + 1) / 2, NORMAL_WOOD));
  paintFace(c, x0 - 0.6, y0 + 0.1, 1.6, 2.4, { all: true });
  return outline(c, 'K');
}

/**
 * Le rondin écorcé : le rondin de biais, même cadrage, mais mis à nu à la plane : le bois travaillé en cylindre (la matière
 * `peeled` de art/world/wood-skin.ts : clair en haut, ombre en bas, traces de plane en long), le bout scié en bas à gauche, son
 * bois de bout sans anneau d'écorce.
 */
function normalPeeledIcon(): Canvas {
  const c = new Canvas(S, S);
  const [x0, y0, x1, y1] = [4.4, 9.4, 11.4, 6.8];
  const r = 2.2;
  capsule(c, x0, y0, x1, y1, r, (t, a) => {
    const s = Math.min(0.999, Math.max(0, (a + 1) / 2));
    return SKINS.normal.peeled(t * 16, Math.floor(s * 6), s, 0);
  });
  paintFace(c, x0 - 0.6, y0 + 0.1, 1.6, 2.4, { all: true });
  // pas d'écorce : le bord du bout (N, l'anneau d'écorce de paintFace) devient du bois de bout à l'ombre
  for (let Y = 0; Y < S; Y++) for (let X = 0; X < S; X++) if (c.get(X, Y) === 'N') c.set(X, Y, '%');
  return outline(c, 'K');
}

/**
 * La poutre (20 × 20 cm) en biais : la face de bout carrée en bas à gauche (bois de bout, le cœur), le dessus éclairé
 * qui monte vers la droite, le flanc dans l'ombre dessous (l'icône de art/world/timber.ts).
 */
function beamIcon(): Canvas {
  const c = new Canvas(S, S);
  const L: [number, number] = [9, -4.5];
  const A: [number, number] = [1.5, 7.5], B: [number, number] = [5.5, 7.5], C: [number, number] = [5.5, 11.5], D: [number, number] = [1.5, 11.5];
  const add = (p: [number, number]): [number, number] => [p[0] + L[0], p[1] + L[1]];
  c.polygon([A, add(A), add(B), B], '^');
  c.polygon([B, add(B), add(C), C], '*');
  c.polygon([A, B, C, D], '^');
  // flanc : le pied plus sombre
  for (let X = 0; X < S; X++) for (let Y = 0; Y < S; Y++) {
    if (c.get(X, Y) === '*' && c.get(X, Y + 1) === EMPTY) c.set(X, Y, '%');
  }
  // face de bout : le cœur et l'ombre du bas à droite
  c.set(3, 9, '%').set(4, 9, '%').set(4, 10, '*').set(3, 10, '*').set(2, 10, '*').set(4, 8, '*');
  return outline(c, 'K');
}

/**
 * La perche (12 cm, longue) : un bâton fin en travers de toute l'icône, du bas à gauche au haut à droite, écorce lisse gris-brun
 * (`POLE_WOOD` : A B Q), le bout coupé en bas à gauche (^ *), contour K.
 */
function poleIcon(): Canvas {
  const c = new Canvas(S, S);
  const [x0, y0, x1, y1] = [2.6, 13.2, 13.4, 2.8];
  capsule(c, x0, y0, x1, y1, 1.25, (t, a) => bark(t * 20, (a + 1) / 2, POLE_WOOD));
  c.set(2, 13, '^').set(3, 13, '*').set(2, 12, '*');
  return outline(c, 'K');
}

/**
 * La planche fendue, de biais : la planche est-ouest au sol (art/world/wood-pieces.ts) cisaillée, qui monte vers la droite d'un
 * pixel tous les deux. Chaque colonne : l'arête (^), le dessus de bois travaillé (^, ses fibres * en long), la rive d'épaisseur
 * dans l'ombre (%). Les bouts coupés droit : à gauche, vers la lumière, le bois de bout clair (^ *) ; à droite, dans l'ombre (%).
 */
function plankIcon(): Canvas {
  const c = new Canvas(S, S);
  const x0 = 2, x1 = 13;
  const FIBRE = [3, 4, 8, 9];
  for (let X = x0; X <= x1; X++) {
    const y = 10 - Math.floor((X - x0) / 2);
    const col = ['^', '^', FIBRE.includes(X) ? '*' : '^', '%'];
    if (X === x0) col.splice(0, 4, '^', '^', '*', '*');
    if (X === x1) col.splice(0, 4, '%', '%', '%', 'N');
    col.forEach((q, i) => c.set(X, y + i, q));
  }
  return outline(c, 'K');
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette, grid: c.toGrid() });

export default [
  img('item-branch', branch()),
  img('item-stone', stone()),
  img('item-iron-ore', ironOre()),
  img('item-straw', straw()),
  img('item-wood-big-round', bigRoundIcon()),
  img('item-wood-big-half', bigHalfIcon()),
  img('item-wood-big-quarter', bigQuarterIcon()),
  img('item-wood-normal-round', normalRoundIcon()),
  img('item-wood-normal-peeled', normalPeeledIcon()),
  img('item-wood-normal-beam', beamIcon()),
  img('item-wood-big-plank', plankIcon()),
  img('item-wood-pole-round', poleIcon()),
];
