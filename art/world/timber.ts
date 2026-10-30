// Bois d'œuvre de l'arbre normal : le rondin (de 30 cm à 5 m) et la poutre équarrie qu'on en tire, dans les deux sens.
// Contrat : src/world/timberShape.ts (EW, NS, placements, notchPixel) ; le jeu assemble l'image d'une longueur à la volée
// avec les mêmes placements que `composeTimber` ci-dessous.
//
// Deux planches, palette `world` : `normal-timber` (est-ouest) et `normal-timber-ns` (nord-sud). Chaque aspect (`round`,
// `f1`, `f2`, `f3`, `beam`) y a trois parties, `<aspect>-start`, `<aspect>-mid`, `<aspect>-end`, calées en haut à gauche
// d'un cadre commun ; le rond a 4 images par partie (le roulement), les autres une. `notch1`, `notch2` : la bande
// d'encoche (un tiers, deux tiers), une image par image de roulement du rond.
//
// Matière : celle de l'arbre normal (`NORMAL_WOOD`, art/world/wood.ts) : tronc de 30 cm, 6 px d'écorce, 8 px contour
// compris ; rampe d'écorce M M m m N N en travers, lumière en haut à gauche, contour K côté lumière, o côté ombre.
// - Sillons : sur un anneau de 12 rangées (deux fois la face visible, comme les billes de roll.ts), quatre couloirs
//   (rangées 1, 4, 7, 10), des tirets de 4 à 5 px qui descendent d'un pixel à mi-longueur, périodiques sur TILE px le
//   long de la pièce : le milieu se répète sans couture. Roulement : 4 images = un tour ; l'image k+1 décale l'anneau
//   d'un quart (3 rangées), vers le bas (est-ouest, la pièce roule vers le sud) ou vers la droite (nord-sud, vers
//   l'est) ; la lumière reste en place, seuls les sillons défilent ; les bouts ne bougent pas, sauf la fente de la face
//   de coupe nord-sud, qui tourne d'un quart de tour par image (comme les billes).
// - Faces dressées (bois frais, `Y t T` comme le bois de bout, plat et lisse, un fil discret) : f1 la face sud (vers
//   nous ; nord-sud : la face ouest), f2 la face nord en plus (nord-sud : la face est), f3 le dessus en plus, la poutre
//   enfin (le dessous : on le voit aux bouts, carrés). Le bout de la poutre montre la section carrée, le bois de bout
//   éclairé en haut à gauche et le cœur au milieu (un cerne ne se lit pas sur 4 px : paintFace le retire sous 7 px).
// - Poutre : 20 × 20 cm de bois (30 × 30 contour compris) ; est-ouest dans les mêmes 10 rangées que le rondin (corps 8,
//   gabarit 6 + 3 = 9), nord-sud 6 px de large dans le cadre de 9.
// - Ombre au sol : est-ouest, deux rangées sous le corps, décalées vers la droite (rangée 8 de la colonne 2 à la colonne
//   de plus, rangée 9 de la colonne 4 à l'avant-dernière) ; nord-sud, le corps décalé d'un pixel à droite et de deux
//   vers le bas, à partir de la rangée back + 2.
//
// Images tirées d'ici (mêmes clés, mêmes tailles que les anciennes de normal-logs.ts et roll.ts, pour que les tas de
// piles.json ne bougent pas) : `normal-felled-log` (95 cm, 20 × 10), `normal-felled-log-ns` (9 × 17), leurs planches de
// roulement `-roll` ; la poutre de 95 cm `normal-beam`, `normal-beam-ns` ; la poutre portée `held-normal-beam` et son
// icône `item-normal-beam`.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { despeckle, shadedOutline } from './big-tree';
import { barkTone, DARKER, faceTone, NORMAL_WOOD, paintFace } from './wood';
import { sheet as heldSheet } from '../items/carried';
import { darkest, outline } from '../items/lib';
import {
  EW, LOOKS, NS, framesOf, notchPixel, placements, timberSize, type TimberAxis, type TimberLook,
} from '../../src/world/timberShape';

const D = NORMAL_WOOD.diameter; // 6 px d'écorce
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---------- Écorce qui roule ----------

/** Anneau d'écorce : 12 rangées de texture sur tout le tour (deux fois les 6 visibles). */
const RING = 12;
/**
 * Couloirs de sillons : rangée de l'anneau, puis tirets [début, longueur] sur une période de 24 px le long de la pièce
 * (EW.tile, NS.tile). Rangées 1 et 4 visibles à l'image 0 (celles de NORMAL_WOOD), 7 et 10 sur la face cachée ; écarts
 * de 3 rangées : un tiret qui descend d'un pixel ne touche jamais le couloir voisin.
 */
const FURROWS: [number, [number, number][]][] = [
  [1, [[0, 4], [13, 5]]],
  [4, [[6, 5], [18, 4]]],
  [7, [[3, 4], [15, 5]]],
  [10, [[9, 5], [21, 4]]],
];
if (EW.tile !== 24 || NS.tile !== 24) throw new Error('timber : les sillons sont périodiques sur 24 px (EW.tile, NS.tile)');

/** Le pixel (`along` le long de la pièce, rangée visible `v` de 0 à 5 en travers) est-il dans un sillon, à l'image k ? */
function furrow(along: number, v: number, k: number): boolean {
  const row = mod(v - 3 * k, RING);
  const a = mod(along, EW.tile);
  return FURROWS.some(([r, dashes]) => dashes.some(([s, n]) => {
    const pos = mod(a - s, EW.tile);
    if (pos >= n) return false;
    return row === mod(r + (pos >= Math.ceil(n / 2) ? 1 : 0), RING);
  }));
}

/** Écorce : rampe en travers (v de 0, côté lumière, à 5), creusée d'un cran par les sillons. */
function barkAt(along: number, v: number, k: number, plain = false): string {
  const b = barkTone((v + 0.5) / D);
  return !plain && furrow(along, v, k) ? DARKER[b] : b;
}

/** Fil du bois dressé : tirets [début, longueur] d'un cran plus sombres, sur 24 px, par couloir. */
const GRAIN: Record<string, [number, number][]> = {
  a: [[3, 4], [16, 3]],
  b: [[10, 4], [21, 3]],
  c: [[6, 3], [18, 4]],
};
const HEWN_DARKER: Record<string, string> = { Y: 't', t: 'T', T: 'T' };
function grain(along: number, lane: keyof typeof GRAIN, base: string): string {
  const a = mod(along, EW.tile);
  return GRAIN[lane].some(([s, n]) => mod(a - s, EW.tile) < n) ? HEWN_DARKER[base] : base;
}

// ---------- Est-ouest ----------
// Rangées : 0 contour du haut, 1-6 corps (écorce : M M m m N N ; dressé : dessus 1-2, face sud 3-6), 7 contour du bas
// (au sol), 8-9 ombre. Les bouts sont dessinés au pixel (5 colonnes de départ, 4 d'arrivée) ; le milieu suit les règles.

/** Bout de départ (ouest) : contour, puis la face de coupe (4 colonnes), tournée vers la lumière. Sans ombre. */
const EW_START: Record<TimberLook, Grid> = {
  // l'ovale de la bille : bord d'écorce N, bois de bout Y t, le cœur T
  round: ['..KKK', '.KNNM', 'KNYtN', 'KNYtN', 'KNtTN', 'KNttN', '.oNNN', '..ooo'],
  // face sud dressée : le côté droit de la face (le sud) devient droit, le coin du bas aussi
  f1: ['..KKK', '.KNNM', 'KNYtN', 'KNYtT', 'KNtTT', 'KNttT', '.oNNT', '..ooo'],
  // face nord en plus : le côté gauche de la face devient droit, le coin du haut aussi
  f2: ['.KKKK', 'KNNNM', 'KYYtN', 'KYYtT', 'KYtTT', 'KtttT', '.oNNT', '..ooo'],
  // dessus en plus : le haut de la face est du bois, le coin d'en haut à droite rejoint le dessus dressé
  f3: ['.KKKK', 'KYYYt', 'KYYtt', 'KYYtT', 'KYtTT', 'KtttT', '.oNNT', '..ooo'],
  // poutre : la section carrée, bois de bout sans écorce, le cœur au milieu, quatre coins droits
  beam: ['.KKKK', 'KYYYt', 'KYttt', 'KYtTT', 'KttTT', 'KtTTT', 'KtTTT', '.oooo'],
};

/** Bout d'arrivée (est), dans l'ombre : l'écorce qui s'enroule (rond), le bois de bout en T (dressé). Sans ombre. */
const EW_END: Record<TimberLook, Grid> = {
  round: ['K...', 'mo..', 'Mmo.', 'mNo.', 'mNo.', 'NKo.', 'Ko..', 'o...'],
  f1: ['K...', 'mo..', 'Mmo.', 'tTo.', 'tTo.', 'tTo.', 'TTo.', 'oo..'],
  f2: ['KK..', 'MNo.', 'MNo.', 'tTo.', 'tTo.', 'tTo.', 'TTo.', 'oo..'],
  f3: ['KK..', 'YTo.', 'YTo.', 'tTo.', 'tTo.', 'tTo.', 'TTo.', 'oo..'],
  beam: ['KK..', 'YTo.', 'YTo.', 'tTo.', 'tTo.', 'tTo.', 'TTo.', 'oo..'],
};

/** Une colonne du milieu (rangées 0 à 7), `along` le long de la pièce, à l'image k du roulement. */
function ewColumn(look: TimberLook, along: number, k: number): string[] {
  const col = ['K'];
  for (let v = 0; v < D; v++) {
    const row = v + 1;
    if (look === 'round') col.push(barkAt(along, v, k));
    // dessus : écorce (f1, f2), bois dressé éclairé (f3, poutre)
    else if (row <= 2) col.push(look === 'f1' || look === 'f2' ? barkAt(along, v, 0) : row === 2 ? grain(along, 'c', 'Y') : 'Y');
    // face sud dressée : t, un couloir de fil, T au pied
    else col.push(row === 6 ? 'T' : row === 5 ? grain(along, 'b', 't') : 't');
  }
  col.push('o');
  return col;
}

/** Ombre au sol est-ouest d'une image de `w` colonnes (n = w − 1 de corps) : rangée 8 de 2 à n, rangée 9 de 4 à n − 1. */
function ewShadow(c: Canvas) {
  const n = c.w - 1;
  for (let X = 2; X <= n; X++) if (c.get(X, 8) === EMPTY) c.set(X, 8, 'x');
  for (let X = 4; X <= n - 1; X++) if (c.get(X, 9) === EMPTY) c.set(X, 9, 'x');
}

/** Image est-ouest complète d'une pièce de n px (largeur n + 1) : départ, milieu par les règles, arrivée, ombre. */
function ewFull(look: TimberLook, n: number, k: number): Canvas {
  const c = new Canvas(n + 1, EW.h);
  for (let X = 0; X < n; X++) ewColumn(look, X, k).forEach((q, Y) => c.set(X, Y, q));
  // les bouts, au pixel : le départ efface ses coins arrondis, l'arrivée aussi
  const put = (g: Grid, x0: number) => g.forEach((row, Y) => [...row].forEach((q, i) => {
    c.px[Y][x0 + i] = q;
  }));
  put(EW_START[look], 0);
  put(EW_END[look], n + 1 - EW.end);
  ewShadow(c);
  return c;
}

// ---------- Nord-sud ----------
// Colonnes : le rond fait 8 px (contour 0 et 7, écorce 1 à 6) et une colonne d'ombre ; dressé, il perd une colonne par
// face de côté (f1 : 1 à 7, f2 et après : 1 à 6). Rangées : le rond du fond (contour en 0, bord du bout lointain en 1-2),
// back = 3 (le bout nord), le dessus jusqu'à la face de coupe (rangées h − 7 à h − 4), le contour du bas, l'ombre.

/** Bout de départ (nord) : 5 rangées, sans ombre. */
const NS_START: Record<TimberLook, Grid> = {
  round: ['..KKKK...', '.KNNNNo..', 'KNNNNNNo.', 'KMMmmNNo.', 'KMMmmNNo.'],
  f1: ['..KKKK...', '.KYNNNo..', '.KYNNNNo.', '.KYmmNNo.', '.KYmmNNo.'],
  f2: ['..KKKK...', '.KYNNTo..', '.KYNNTo..', '.KYmmTo..', '.KYmmTo..'],
  f3: ['..KKKK...', '.KYYYto..', '.KYYYto..', '.KYYYto..', '.KYYYto..'],
  beam: ['..KKKK...', '.KYYYto..', '.KYYYto..', '.KYYYto..', '.KYYYto..'],
};

/**
 * Bout d'arrivée (sud) des pièces dressées : 8 rangées (le dessus, la face de bout de 4 rangées, le contour), sans ombre.
 * Le rond est construit plus bas (sa fente tourne).
 */
const NS_END: Record<Exclude<TimberLook, 'round'>, Grid> = {
  f1: ['.KYmmNNo.', '.KYNNNNo.', '.KYYttNo.', '.KYtTtNo.', '.otNNNo..', '..oooo...', '.........', '.........'],
  f2: ['.KYmmTo..', '.KYNNTo..', '.KYYtTo..', '.KYtTTo..', '.otNNTo..', '..oooo...', '.........', '.........'],
  f3: ['.KYYYto..', '.KtttTo..', '.KYtTTo..', '.KttTTo..', '.otNNTo..', '..oooo...', '.........', '.........'],
  beam: ['.KYYYto..', '.KtttTo..', '.KYtTTo..', '.KttTTo..', '.KtTTTo..', '..oooo...', '.........', '.........'],
};

/** Une rangée du milieu nord-sud (colonnes 0 à 8, sans ombre), `along` = rangée, à l'image k. */
function nsRow(look: TimberLook, along: number, k: number): string {
  const bark = (col: number) => barkAt(along, col - 1, k, false);
  switch (look) {
    case 'round': return `K${[1, 2, 3, 4, 5, 6].map(bark).join('')}o.`;
    case 'f1': return `.KY${[3, 4, 5, 6].map((c) => barkAt(along, c - 1, 0)).join('')}o.`;
    case 'f2': return `.KY${[3, 4].map((c) => barkAt(along, c - 1, 0)).join('')}To..`;
    default: return `.KY${grain(along, 'a', 'Y')}${grain(along, 'b', 'Y')}to..`;
  }
}

/** Ombre nord-sud : le corps décalé d'un pixel à droite et de deux vers le bas, à partir de la rangée back + 2. */
function nsShadow(c: Canvas) {
  const body = Canvas.from(c.toGrid());
  for (let Y = NS.back + 2; Y < c.h; Y++) for (let X = 2; X < c.w; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    const q = body.get(X - 1, Y - 2);
    if (q !== EMPTY && q !== 'x') c.set(X, Y, 'x');
  }
}

/** Fente de la face de coupe du rond : angle à l'image 0 (vers le haut à gauche), un quart de tour par image. */
const CRACK0 = (-3 * Math.PI) / 4;

/**
 * Rond nord-sud de h rangées, à l'image k : comme `rollingLogNS` (roll.ts) : dessus d'écorce du rond du fond à la face
 * de coupe, sillons qui défilent vers la droite, face ovale (6 × 4) et sa fente, contour. Sans ombre.
 */
function nsRound(h: number, k: number): Canvas {
  const cx = 4, back = NS.back, front = h - 5, rx = 3, ry = 2;
  const c = new Canvas(NS.w, h);
  const inDisk = (X: number, Y: number, cy: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < NS.w; X++) {
    const body = Math.abs(X + 0.5 - cx) <= rx && Y + 0.5 >= back && Y + 0.5 <= front;
    if (!body && !inDisk(X, Y, back)) continue;
    // près de la face (ses 2 rangées de dessus) et au fond, l'écorce sans sillon : les bouts ne bougent pas
    const plain = Y >= front - 3 || Y < NS.start;
    let q = barkAt(Y, X - 1, plain ? 0 : k, plain);
    if (Y + 0.5 < back && !inDisk(X, Y - 1.5, back)) q = q === 'K' ? 'K' : 'N';
    c.set(X, Y, q);
  }
  paintFace(c, cx, front, rx, ry, { all: true });
  const th = CRACK0 + (k * Math.PI) / 2;
  for (let t = 0.3; t <= 0.95; t += 0.05) {
    const X = Math.floor(cx + t * rx * Math.cos(th));
    const Y = Math.floor(front + t * ry * Math.sin(th));
    if (((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - front) / ry) ** 2 <= 1) c.set(X, Y, 'N');
  }
  despeckle(c, 'KYTtNMm');
  return shadedOutline(c);
}

/** Image nord-sud complète de h rangées : départ, milieu, arrivée, ombre. */
function nsFull(look: TimberLook, h: number, k: number): Canvas {
  let c: Canvas;
  if (look === 'round') {
    c = nsRound(h, k);
    // le bout du fond ne bouge pas : toujours celui de l'image 0
    NS_START.round.forEach((row, Y) => [...row].forEach((q, X) => (c.px[Y][X] = q)));
    // milieu : les sillons de la règle (périodiques), pas ceux du tracé
    for (let Y = NS.start; Y < h - NS.end; Y++) [...nsRow('round', Y, k)].forEach((q, X) => (c.px[Y][X] = q));
  } else {
    c = new Canvas(NS.w, h);
    for (let Y = 0; Y < h; Y++) [...nsRow(look, Y, k)].forEach((q, X) => c.set(X, Y, q));
    NS_START[look].forEach((row, Y) => [...row].forEach((q, X) => (c.px[Y][X] = q)));
    NS_END[look].forEach((row, i) => [...row].forEach((q, X) => (c.px[h - NS.end + i][X] = q)));
  }
  nsShadow(c);
  return c;
}

// ---------- Les parties ----------

/** Longueur de référence d'où l'on tire les parties : départ + un milieu + arrivée, exactement. */
const EW_REF = EW.start + EW.tile + EW.end; // largeur de l'image (n + 1)
const NS_REF = NS.start + NS.tile + NS.end; // hauteur de l'image

interface Parts { start: Grid; mid: Grid; end: Grid }

function slice(c: Canvas, axis: TimberAxis, from: number, size: number): Grid {
  if (axis === 'ew') return c.toGrid().map((r) => r.slice(from, from + size));
  return c.toGrid().slice(from, from + size);
}

/** Les trois parties d'un aspect, à l'image k. */
function partsOf(axis: TimberAxis, look: TimberLook, k: number): Parts {
  const full = axis === 'ew' ? ewFull(look, EW_REF - 1, k) : nsFull(look, NS_REF, k);
  const g = axis === 'ew' ? EW : NS;
  return {
    start: slice(full, axis, 0, g.start),
    mid: slice(full, axis, g.start, g.tile),
    end: slice(full, axis, g.start + g.tile, g.end),
  };
}

const PARTS: Record<TimberAxis, Record<TimberLook, Parts[]>> = {
  ew: Object.fromEntries(LOOKS.map((l) => [l, [...Array(framesOf(l)).keys()].map((k) => partsOf('ew', l, k))])) as Record<TimberLook, Parts[]>,
  ns: Object.fromEntries(LOOKS.map((l) => [l, [...Array(framesOf(l)).keys()].map((k) => partsOf('ns', l, k))])) as Record<TimberLook, Parts[]>,
};

// ---------- Encoches ----------
// Est-ouest : bande de 5 colonnes (EW.notch.w), la colonne 4 est la première à l'est de la coupe. Image 0 : l'entaille
// est sur le dessus, la silhouette se creuse (comme les anciennes entailles de normal-felled.ts : le flanc ouest en bois
// frais Y t T, le fond de la fente en K) ; image 1 : la pièce a roulé d'un quart vers le sud, l'entaille est sur la face
// qu'on voit ; image 2 : dessous, presque rien ; image 3 : au nord, la silhouette s'ébrèche à peine.
const EW_NOTCH: Record<1 | 2, Grid[]> = {
  1: [
    ['K...K', 'MKNKM', 'MYtKM', 'mmTKm', 'mmmmm', 'NNNNN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KKKKK', 'MMMMM', 'MMMMM', 'mYtKm', 'mmTKm', 'NNNKN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KKKKK', 'MMMMM', 'MMMMM', 'mmmmm', 'mmmmm', 'NNNNN', 'NNKKN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KK.KK', 'MKKKM', 'MMMMM', 'mmmmm', 'mmmmm', 'NNNNN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
  ],
  2: [
    ['....K', 'K..KM', 'MKNKM', 'mYtKm', 'mmTKm', 'NNNKN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KKKKK', 'MMMMM', 'MYtKM', 'mYtKm', 'mmTKm', 'NNTKN', 'NNNKN', 'ooooo', 'xxxxx', 'xxxxx'],
    ['KKKKK', 'MMMMM', 'MMMMM', 'mmmmm', 'mmmmm', 'NNKKN', 'NKKKN', 'oo.oo', 'xxxxx', 'xxxxx'],
    ['K..KK', 'MK.KM', 'MMKMM', 'mmmmm', 'mmmmm', 'NNNNN', 'NNNNN', 'ooooo', 'xxxxx', 'xxxxx'],
  ],
};

// Nord-sud : bande de 3 rangées (NS.notch.h), la rangée 2 est la première au sud de la coupe. Image 0 : la saignée en
// travers du dessus, son flanc nord (tourné vers nous) en bois frais, la fente en K ; à deux tiers, les côtés de la
// silhouette s'ébrèchent. Image 1 : la pièce a roulé d'un quart vers l'est, l'entaille est sur le flanc est ; image 2 :
// dessous ; image 3 : sur le flanc ouest.
const NS_NOTCH: Record<1 | 2, Grid[]> = {
  1: [
    ['KMYYttNox', 'KMtTTTNox', 'KNKKKKNox'],
    ['KMMmYtNox', 'KMMmtKNox', 'KMMmmKNox'],
    ['KMMmmNNox', 'KMMmmNNox', 'KMMmmNNox'],
    ['KYtmmNNox', 'KtKmmNNox', 'KKMmmNNox'],
  ],
  2: [
    ['KYYYttNox', '.KtTTTo.x', '.KKKKKo.x'],
    ['KMMYttTox', 'KMMmtTo.x', 'KMMmKKo.x'],
    ['KMMmmNNox', 'KMMmmNNox', 'KMNKKNNox'],
    ['KYttmNNox', '.KtTmNNox', '.KKKmNNox'],
  ],
};

if (EW_NOTCH[1][0][0].length !== EW.notch.w || NS_NOTCH[1][0].length !== NS.notch.h) throw new Error('timber : bande d\'encoche hors contrat');

// ---------- Assemblage ----------

/**
 * L'image d'une pièce de `cm` centimètres couchée dans le sens `axis`, d'aspect `look`, à l'image `frame` du roulement
 * (0 pour un aspect qui ne roule pas), exactement comme le jeu l'assemble : les parties selon `placements` (le bout
 * d'arrivée posé en dernier, par-dessus), puis, s'il y a une encoche, sa bande à `notchPixel` : on efface ses colonnes
 * (est-ouest) ou ses rangées (nord-sud), puis on la peint.
 */
export function composeTimber(axis: TimberAxis, look: TimberLook, cm: number, frame = 0, notch?: { cm: number; depth: 1 | 2 }): Canvas {
  const { w, h } = timberSize(axis, cm);
  const c = new Canvas(w, h);
  const parts = PARTS[axis][look][frame % framesOf(look)];
  for (const p of placements(axis, cm)) {
    const g = parts[p.part];
    if (axis === 'ew') c.stamp(g.map((r) => r.slice(0, p.size)), p.at, 0);
    else c.stamp(g.slice(0, p.size), 0, p.at);
  }
  if (notch) {
    const at = notchPixel(axis, notch.cm);
    const band = (axis === 'ew' ? EW_NOTCH : NS_NOTCH)[notch.depth][frame % 4];
    if (axis === 'ew') {
      for (let X = at; X < at + EW.notch.w; X++) for (let Y = 0; Y < h; Y++) c.set(X, Y, EMPTY);
    } else {
      for (let Y = at; Y < at + NS.notch.h; Y++) for (let X = 0; X < w; X++) c.set(X, Y, EMPTY);
    }
    c.stamp(band, axis === 'ew' ? at : 0, axis === 'ew' ? 0 : at);
  }
  return c;
}

// ---------- Planches ----------

/** Cadre commun d'une planche : assez grand pour la plus grande partie et la bande d'encoche. */
const FRAME: Record<TimberAxis, { w: number; h: number }> = {
  ew: { w: Math.max(EW.start, EW.tile, EW.end, EW.notch.w), h: EW.h },
  ns: { w: NS.w, h: Math.max(NS.start, NS.tile, NS.end, NS.notch.h) },
};

/** Une partie calée en haut à gauche du cadre. */
function framed(axis: TimberAxis, g: Grid): Grid {
  const f = FRAME[axis];
  return new Canvas(f.w, f.h).stamp(g, 0, 0).toGrid();
}

function timberSheet(axis: TimberAxis): SpriteSheetSource {
  const animations: SpriteSheetSource['animations'] = {};
  for (const look of LOOKS) for (const part of ['start', 'mid', 'end'] as const) {
    animations[`${look}-${part}`] = { frames: PARTS[axis][look].map((p) => framed(axis, p[part])), frameRate: 1, repeat: 0 };
  }
  for (const d of [1, 2] as const) {
    animations[`notch${d}`] = { frames: (axis === 'ew' ? EW_NOTCH : NS_NOTCH)[d].map((g) => framed(axis, g)), frameRate: 1, repeat: 0 };
  }
  return {
    kind: 'spritesheet',
    name: axis === 'ew' ? 'normal-timber' : 'normal-timber-ns',
    frameW: FRAME[axis].w,
    frameH: FRAME[axis].h,
    palette: world,
    animations,
  };
}

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

/** Planche de roulement d'une pièce de 95 cm (4 images = un tour), comme celles de roll.ts. */
function rollSheet(name: string, axis: TimberAxis): SpriteSheetSource {
  const frames = [0, 1, 2, 3].map((k) => composeTimber(axis, 'round', 95, k));
  return {
    kind: 'spritesheet',
    name,
    frameW: frames[0].w,
    frameH: frames[0].h,
    palette: world,
    animations: { roll: { frames: frames.map((f) => f.toGrid()), frameRate: 8, repeat: -1 } },
  };
}

// ---------- Poutre portée ----------
// Une poutre de 1,70 m (34 px), 20 × 20 cm, portée à deux mains devant lui (posture `carry`), dans une image carrée
// impaire de 37 px dont le centre est la prise. De face et de dos, en long : la poutre est-ouest elle-même, sans son
// ombre, le milieu sur la prise. De profil, par le bout : la face de bout carrée (4 × 4 de bois) juste sous les mains,
// et le dessus qui fuit derrière (raccourci, 8 rangées, comme la bille portée qui raccourcit le sien).

const HELD = 37;
const HC = Math.floor(HELD / 2);

function beamLengthwise(): Grid {
  const g = composeTimber('ew', 'beam', 170).toGrid().map((r) => r.replace(/x/g, EMPTY)).filter((r) => /[^.]/.test(r));
  const body = g.map((r) => r.replace(/\.+$/, ''));
  const w = Math.max(...body.map((r) => r.length));
  return new Canvas(HELD, HELD).stamp(body, HC - Math.floor(w / 2), HC - Math.floor(body.length / 2)).toGrid();
}

function beamByTheEnd(): Grid {
  const c = new Canvas(HELD, HELD);
  const x0 = HC - 2; // 4 colonnes de bois : HC − 2 à HC + 1
  const top = HC - 6; // le dessus : 8 rangées, de HC − 6 à HC + 1
  for (let Y = top; Y <= HC + 1; Y++) [...'YYYt'].forEach((q, i) => c.set(x0 + i, Y, i === 1 || i === 2 ? grain(Y, i === 1 ? 'a' : 'b', 'Y') : q));
  // la face de bout, sous les mains : bois de bout éclairé en haut à gauche, le cœur au milieu
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    c.set(x0 + i, HC + 2 + j, faceTone((i - 1.5) / 2, (j - 1.5) / 2, false, false, false));
  }
  c.set(x0, HC + 2, 't').set(x0 + 1, HC + 2, 't').set(x0 + 2, HC + 2, 't').set(x0 + 3, HC + 2, 'T');
  return outline(c, darkest({ Y: 'K', t: 'K', T: 'K' }, 'o')).toGrid();
}

const heldBeam = (): SpriteSheetSource => {
  const lengthwise = beamLengthwise();
  return heldSheet('held-normal-beam', HELD, world, { down: lengthwise, up: lengthwise, right: beamByTheEnd() });
};

// ---------- Icône ----------
// La poutre en biais dans la case de 16 px : la face de bout carrée en bas à gauche (bois de bout, le cœur), le dessus
// éclairé qui monte vers la droite, le flanc dans l'ombre dessous ; contour K comme les autres icônes de bois.

function beamIcon(): Canvas {
  const c = new Canvas(16, 16);
  const L: [number, number] = [9, -4.5];
  const A: [number, number] = [1.5, 7.5], B: [number, number] = [5.5, 7.5], C: [number, number] = [5.5, 11.5], Dd: [number, number] = [1.5, 11.5];
  const add = (p: [number, number]): [number, number] => [p[0] + L[0], p[1] + L[1]];
  c.polygon([A, add(A), add(B), B], 'Y');
  c.polygon([B, add(B), add(C), C], 't');
  c.polygon([A, B, C, Dd], 'Y');
  // flanc : le pied plus sombre, un fil
  for (let X = 0; X < 16; X++) for (let Y = 0; Y < 16; Y++) {
    if (c.get(X, Y) !== 't') continue;
    if (c.get(X, Y + 1) === EMPTY) c.set(X, Y, 'T');
  }
  // face de bout : le cœur et l'ombre du bas à droite
  c.set(3, 9, 'T').set(4, 9, 'T').set(4, 10, 't').set(3, 10, 't').set(2, 10, 't').set(4, 8, 't');
  return outline(c, 'K');
}

export default [
  timberSheet('ew'),
  timberSheet('ns'),
  img('normal-felled-log', composeTimber('ew', 'round', 95)),
  img('normal-felled-log-ns', composeTimber('ns', 'round', 95)),
  rollSheet('normal-felled-log-roll', 'ew'),
  rollSheet('normal-felled-log-ns-roll', 'ns'),
  img('normal-beam', composeTimber('ew', 'beam', 95)),
  img('normal-beam-ns', composeTimber('ns', 'beam', 95)),
  heldBeam(),
  img('item-normal-beam', beamIcon()),
];
