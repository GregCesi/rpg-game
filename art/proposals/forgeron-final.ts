// Proposition : le forgeron du village, le dessin final (chantier « forgeron », essai hors jeu ; rien ici n'est déclaré dans
// art/index.ts). Planche : npx tsx tools/essai-forgeron-final.ts écrit .art-preview/forgeron-final.png.
//
// Ce qu'il assemble (décisions de Grégoire) :
// - le corps et les cheveux de la variante C, « le géant » (art/proposals/forgeron-colosse.ts) : cheveux blonds lâchés, rejetés
//   en arrière, rasé avec la moustache blonde, tablier de cuir sur le torse nu, brassards de cuir aux deux avant-bras ;
// - la tête T1, « le rectangle », avec le menton M2, « en avant » (art/proposals/forgeron-tetes.ts) ;
// - le portrait 64 px : `portrait('T1', 'M2')` (art/proposals/forgeron-tetes-portraits.ts), tel quel.
//
// Les trois vues, frame 32 × 48, pieds à y=45 (semelles à y=44, leur contour à y=45), comme Xéros et la mère :
// - de face (`down`) : `head('T1', 'down', 'M2')` tel quel (le corps de C sous la tête). 39 px de haut (y=7 à 45, 1,95 m),
//   28 px de large contour compris (x=2 à 29 : deltoïdes et poings), 15 px la tête ;
// - de profil (`right` ; la gauche est son miroir) : NEUF. La tête T1/M2 de profil (rangées de forgeron-tetes.ts, recopiées
//   ici, le fichier ne les exporte pas), sur un corps de profil refait à la carrure de C à partir de celui de A : le bras côté
//   spectateur plus épais d'un pixel (8 px de matière du deltoïde à l'avant-bras, poing de 8 px), le deltoïde qui monte jusqu'aux
//   trapèzes (y=23), la poitrine haute qui pousse la bavette d'un pixel en avant (y=24-25) puis rentre sous le pectoral, la
//   lanière de la taille à y=26 comme de face. 39 px de haut, 21 px de large contour compris (x=8 à 28) ;
// - de dos (`up`) : NEUF. La silhouette exacte de face (tête T1, deltoïdes, bras, poings et brassards de C), les cheveux de C vus
//   de dos (des mèches rejetées en arrière, séparées par des traits d'ombre qui glissent d'un pixel : l'ondulation ; elles
//   couvrent la nuque et s'étalent en pointes sur les trapèzes, y=22-24), le dos nu, les deux lanières du tablier en V jusqu'au
//   nœud aux reins (y=26), les pans du nœud, le fond du pantalon entre les bords du tablier (repris de A, élargi d'un pixel de
//   chaque côté à la taille de C). 39 px de haut, 28 px de large contour compris (x=2 à 29).
// Corrections après la planche finale (retour de Grégoire) : de dos, les cheveux ne font plus un casque rayé (mèches séparées
// qui ondulent et s'écartent en pointes sur les trapèzes, `backHair`) ; de profil, la bavette couvre la poitrine devant le bras
// (son bord du haut au jour, la lanière du cou) et le poing rentre dans la largeur du bras. La version d'avant :
// forgeron-final-v1.ts. La matière de chaque vue (`matter`) sert aux animations (forgeron-anim.ts). Le portrait a deux humeurs :
// `portraitFinal('neutral')`, `portraitFinal('smile')`.
// Toutes les vues tiennent dans 30 px de large (frame de 32). La collision visée : 14 × 8 px aux pieds (70 × 40 cm), centrée
// sous lui (x=9 à 22, y=38 à 45 de la frame), comme les bottes de face (x=8 à 23 contour compris).
//
// Les couleurs sont celles de l'essai 3 (`palette`, rampes `ramps` de forgeron-colosse.ts) : aucune teinte nouvelle.

import { Canvas, selOut, type Grid } from '../lib/canvas';
import { SPECS, W, H, palette as smithPalette } from './forgeron-colosse';
import { spec as headSpec } from './forgeron-tetes';
import { portrait } from './forgeron-tetes-portraits';

export const palette: Record<string, string> = smithPalette;

export type Facing = 'down' | 'up' | 'right';

type Spec = [number, string][];
/** Haut de la matière (le contour du sommet est à y=7). */
export const TOP = 8;

export const DARK: Record<string, string> = {
  Y: 'd', H: 'd', h: 'd', d: 'd',
  w: 'D', s: 'D', S: 'D', D: 'D',
  A: 'Q', a: 'Q', q: 'Q', Q: 'Q',
  p: 'n', P: 'n', n: 'n',
  K: 'm', k: 'm', m: 'm',
};

/** Les jambes et les bottes de face et de dos (y=34 à 44), celles de A et de C. */
const LEGS_FRONT: Spec = SPECS['C-down-loose'].slice(26);
/** Les jambes et les bottes de profil (y=34 à 44), celles de A. */
const LEGS_SIDE: Spec = SPECS['A-right-loose'].slice(26);

// ---------- De dos ----------
// Corrigé (retour de Grégoire sur la planche finale : « un casque rayé ») : la tête n'est plus une plaque de bandes parallèles,
// mais quatre mèches séparées (`BACK_LOCKS`), chacune avec son reflet, à sa hauteur, et un trait d'ombre (d) entre deux mèches.
// Les traits ne glissent pas ensemble : chaque séparation ondule à son rang (la première à y=14, la deuxième à y=15...), et
// les mèches gonflent d'un pixel sur les côtés au-dessus des oreilles (y=14 à 19) : la tête n'est plus un rectangle. Sous la
// nuque, chaque mèche s'écarte de sa voisine et finit en pointe sur les trapèzes, à sa longueur (la première et la troisième
// à y=24, les deux autres à y=23) : la peau et les lanières se voient entre elles.

/** La matière sous les cheveux, de dos (y=8 à 25) : le crâne (couvert), la nuque, les trapèzes, les deltoïdes, les lanières. */
const BACK_BASE: Spec = [
  [11, 'hhhhhhhhh'], // y=8
  [10, 'hhhhhhhhhhh'],
  ...Array.from({ length: 11 }, (): [number, string] => [9, 'hhhhhhhhhhhhh']), // y=10 à 20
  [11, 'sssssSSSS'], // y=21 : la nuque
  [6, 'wsssQssssssSSSSQSSSD'], // y=22 : les trapèzes ; les lanières montent vers le cou (x=10 et 21)
  [3, 'swwwssssQssssSSSSQSSSSSSSD'], // y=23 : les deltoïdes de C
  [3, 'sssSSosssQsssSSSQSSSoSSSSD'], // y=24 : les lanières (x=12 et 19)
  [3, 'sssSS.ssswQsSSSQSSSD.SSSSD'], // y=25 : le V des lanières ; un pixel d'air aux aisselles, comme de face
];

/**
 * Les cheveux de dos, rangée par rangée (y=8 à 20) : le bord gauche, les quatre traits d'ombre entre les mèches (g1 à g4 ; 0 :
 * pas encore de trait), le bord droit. Les traits partent de la couronne et s'écartent en courbe vers l'extérieur : les mèches
 * du milieu sont larges, celles des côtés se resserrent en tournant autour du crâne (le volume) ; chaque trait ondule à son rang.
 */
const BACK_ROWS: Record<number, [number, number, number, number, number, number]> = {
  8: [11, 0, 0, 0, 0, 19],
  9: [10, 0, 0, 0, 0, 20],
  10: [9, 12, 0, 17, 0, 21],
  11: [9, 12, 14, 17, 19, 21],
  12: [9, 11, 14, 18, 20, 21],
  13: [9, 11, 14, 18, 20, 21],
  14: [9, 11, 13, 18, 20, 21],
  15: [8, 10, 13, 18, 21, 22],
  16: [8, 10, 14, 18, 21, 22],
  17: [8, 10, 14, 17, 21, 22],
  18: [8, 11, 14, 17, 20, 22],
  19: [8, 11, 14, 18, 20, 22],
  20: [9, 11, 13, 18, 20, 21],
};

/** Les pointes (y=21 à 25), mèche par mèche [y, x0, x1] : elles s'écartent sur les trapèzes, chacune à sa longueur. */
const BACK_TIPS: [number, number, number][][] = [
  [[21, 8, 10], [22, 7, 9], [23, 6, 8], [24, 6, 7]],
  [[21, 12, 13], [22, 11, 13], [23, 11, 12], [24, 11, 11]],
  [[21, 14, 17], [22, 14, 17], [23, 15, 17], [24, 15, 16], [25, 16, 16]],
  [[21, 19, 20], [22, 19, 21], [23, 20, 21]],
  [[21, 21, 22], [22, 22, 23], [23, 23, 24], [24, 24, 24]],
];

/** Le reflet de chaque mèche : ses rangées et sa colonne dans la mèche (au jour : Y ; les deux mèches à l'ombre : H). */
const BACK_SHINE: { y: [number, number]; at: number; ch: string }[] = [
  { y: [13, 14], at: 0, ch: 'Y' },
  { y: [11, 12], at: 0, ch: 'Y' },
  { y: [10, 12], at: 1, ch: 'Y' },
  { y: [12, 13], at: 0, ch: 'H' },
  { y: [15, 16], at: 0, ch: 'H' },
];

/** Une rangée de mèche : au jour à gauche (H), son ombre à droite (h) ; les deux mèches de droite à l'ombre (h, d). */
function lockRow(c: Canvas, k: number, y: number, x0: number, x1: number): void {
  const shade = k >= 3, w = x1 - x0 + 1;
  for (let i = 0; i < w; i++) {
    const last = i === w - 1 && w > 1;
    let ch = shade ? (last && w > 2 ? 'd' : 'h') : last ? 'h' : y >= 17 && i > 0 ? 'h' : 'H';
    if (y >= 21 && !shade) ch = i === 0 && y < 24 ? 'H' : 'h';
    const sh = BACK_SHINE[k];
    if (y >= sh.y[0] && y <= sh.y[1] && i === Math.min(sh.at, w - 1)) ch = sh.ch;
    c.set(x0 + i, y, ch);
  }
}

/** Peint les cheveux de dos sur la matière. */
function backHair(c: Canvas): void {
  // la couronne (y=8-9) : la masse au jour, l'éclat du sommet, l'ombre à droite
  c.stamp(['HHYYHHhhh'], 11, 8);
  c.stamp(['HHYYYHHHhhh'], 10, 9);
  for (let y = 10; y <= 20; y++) {
    const [L, ...rest] = BACK_ROWS[y];
    const R = rest[4];
    const gaps = rest.slice(0, 4);
    const edges = [L - 1, ...gaps, R + 1];
    // les mèches entre deux traits ; un trait absent (0) : la mèche continue
    let k = 0, from = L;
    for (let g = 0; g < 4; g++) {
      if (!gaps[g]) continue;
      lockRow(c, k, y, from, gaps[g] - 1);
      c.set(gaps[g], y, 'd');
      from = gaps[g] + 1;
      k = g + 1;
    }
    lockRow(c, y >= 11 ? 4 : k === 3 ? 3 : 2, y, from, R);
    void edges;
  }
  BACK_TIPS.forEach((tips, k) => tips.forEach(([y, x0, x1]) => lockRow(c, k, y, x0, x1)));
}

const BACK_BODY: Spec = [
  [4, 'sSSD..QQQQQAqQQQQQ..SSSD'], // y=26 : le nœud aux reins, sur la lanière de la taille (x=10 à 21)
  [3, 'wsssSS.aaaqPqQPqqqQ.ssSSSD'], // les pans du nœud ; le fond du pantalon entre les bords du tablier
  [3, 'aAAaqQ.aaaqPqQPqqqQ.aaaqqQ'], // y=28 : les brassards, aux deux avant-bras
  [3, 'wsssSD.aaaqPPPPqqqQ.sSSSSD'],
  [3, '.sSSD.aaaqPPPPPPqqqQ.SSSD.'], // les poignets
  [3, 'wsssS.qqqqPPPPPPqqqQ.ssSSD'], // y=31 : les poings ; l'ourlet
  ...SPECS['C-down-loose'].slice(24, 26), // y=32-33 : les poings, le haut du pantalon (le même de dos)
];

// ---------- De profil (vers la droite) ----------
// La tête T1 avec le menton M2 : rangées y=8 à 22 de forgeron-tetes.ts (SIDE_TOP, T1_SIDE, CHIN_ROWS.M2.right), recopiées.
const SIDE_HEAD: Spec = [
  [15, 'hHYYHHd'], // y=8
  [14, 'hHYHHYHHd'],
  [13, 'hHYHdHHYHHd'],
  [13, 'hYhdHYHHhws'], // y=11 : la racine haute, le front droit
  [12, 'hYhdHHHYhwss'],
  [12, 'hHhdhHhdshhs'], // le sourcil droit ; la mèche devant l'oreille
  [13, 'dYhSShhsSsss'], // l'oreille ; la paupière ; l'arête du nez
  [13, 'hdYsDhhsossw'], // l'œil
  [12, 'hYhdSShdwssssS'], // y=16 : la pommette ; le nez fort
  [13, 'dHYDsdsssssSD'], // le dessous du nez ; le bord arrière de la mâchoire
  [14, 'hYDsssssHHh'], // la moustache courte
  [13, 'dhYDssssssSs'],
  [12, 'hYhdDssssswsD'], // y=20 : le creux sous la lèvre (M2)
  [13, 'dYhDSSSSssswS'], // y=21 : la bosse du menton avance (M2)
  [10, 'hYhdhsSSDDQQSSs'], // y=22 : le dessous du menton, son ombre sur le cou ; la lanière du cou (x=20-21) descend vers la bavette
];

// Le corps de profil à la carrure de C. Colonnes : x=9 à 12 le dos (et les pointes des cheveux en haut), x=13 le bord arrière
// du bras (ombre D), x=14 à 21 le bras côté spectateur (8 px : le deltoïde, le biceps, l'avant-bras et son brassard), x=22 son
// bord avant, x=23-24 la poitrine, x=25 à 27 la bavette du tablier.
const SIDE_BODY: Spec = [
  // Corrigé (retour de Grégoire : « de profil, il paraît torse nu ») : la bavette couvre la poitrine devant le bras (x=22 à 27),
  // son bord du haut au jour (A, y=23), la lanière du cou qui y arrive (x=22, y=23 ; x=20-21, y=22), son devant à l'ombre ; le
  // poing rentre dans la largeur du bras (x=15 à 19) au lieu de déborder devant la cuisse : le pantalon se voit devant lui.
  [9, 'dhYhDwwwwsssSQAAAq'], // y=23 : le haut du deltoïde, rond, jusqu'aux trapèzes ; le bord du haut de la bavette
  [9, 'hdssDwwsssssSqaaaqQ'], // y=24 : la poitrine haute pousse la bavette en avant (x=27)
  [9, 'sssSDwssssSSDqaaaqQ'], // le pectoral sous le cuir ; le bras, son bord avant dans l'ombre
  [9, 'QQQQDwsssSSSSDQaAq'], // y=26 : la lanière de la taille passe derrière le bras et devant la bavette ; le ventre rentre
  [9, 'aaaqDwssssssSDqaAq'], // l'avant-bras de 8 px ; le tablier enveloppe la hanche
  [9, 'aaaqQaAAaaaqqQqaAq'], // y=28 : le brassard
  [9, 'aaaqDssssssSSDqaAq'],
  [9, 'aaaqqDsssSSSDqqaAq'], // le poignet
  [9, 'qqqqqDwssssSSDqqqQ'], // y=31 : le poing ; l'ourlet
  [12, 'pPDssSSDPPPn'], // y=32 : le poing, dans la largeur du bras ; la cuisse devant lui
  [12, 'pPPDSSDpPPPn'],
];

function rows(facing: Exclude<Facing, 'down'>): Spec {
  const all = facing === 'up' ? [...BACK_BASE, ...BACK_BODY, ...LEGS_FRONT] : [...SIDE_HEAD, ...SIDE_BODY, ...LEGS_SIDE];
  if (all.length !== 37) throw new Error(`forgeron-final : la vue ${facing} a ${all.length} rangées, il en faut 37 (y=8 à 44)`);
  return all;
}

/**
 * La matière d'une vue, sans contour ni ombre (frame 32 × 48, '.' vide) : ce que les animations (forgeron-anim.ts) déplacent
 * avant de finir l'image par `finishMatter`.
 */
export function matter(facing: Facing): Grid {
  const s = facing === 'down' ? headSpec('T1', 'down', 'M2') : rows(facing);
  const c = new Canvas(W, H);
  s.forEach(([x, row], i) => c.stamp([row], x, TOP + i));
  if (facing === 'up') backHair(c);
  return c.toGrid();
}

/** Largeur de l'ombre portée par vue. */
export const SHADOW_W: Record<Facing, number> = { down: 9, up: 9, right: 6 };

/** Contour d'un pixel, ombre portée sous les pieds, contour côté lumière : l'image finie. */
export function finishMatter(m: Grid, shadowW: number, dark: Record<string, string> = DARK): Grid {
  const c = Canvas.from(m).outline('o');
  c.within('.', (cc) => cc.ellipse(16.5, 45.5, shadowW, 2, 'x'));
  return selOut(c.toGrid(), dark);
}

/** Le forgeron, frame 32 × 48, pieds à y=45 : de face, de dos, de profil droit (la gauche est son miroir). */
export function smithFinal(facing: Facing): Grid {
  return finishMatter(matter(facing), SHADOW_W[facing]);
}

export type Mood = 'neutral' | 'smile';

/**
 * Le sourire (`portraitFinal('smile')`) : des retouches au pixel sur le portrait neutre, le même visage, calme et bienveillant.
 * [x, y, couleur] dans le portrait 64 × 64, avant le contour (les deux yeux : x=24 à 29 et 34 à 39 ; la moustache y=33-34 ;
 * la bouche y=35).
 */
const SMILE: [number, number, string][] = [
  // les yeux un peu plissés : la paupière du bas remonte sur le bas de l'iris (S), le blanc des coins se couvre de peau
  [24, 26, 's'], [25, 26, 'S'], [26, 26, 'i'], [27, 26, 'i'], [28, 26, 'S'], [29, 26, 's'],
  [34, 26, 'S'], [35, 26, 'S'], [36, 26, 'i'], [37, 26, 'i'], [38, 26, 'S'], [39, 26, 's'],
  [26, 27, 'c'], [27, 27, 'c'], [36, 27, 's'], [37, 27, 's'],
  // les joues qui montent : le haut de la pommette au jour sous chaque œil, une rangée plus haut que le plan de la joue
  [25, 28, 'c'], [26, 28, 'c'], [27, 28, 'c'], [25, 29, 'c'],
  [36, 28, 's'], [37, 28, 's'], [38, 29, 's'],
  // la moustache remonte : ses bouts se relèvent d'une rangée (y=33) ; dessous, les coins de la bouche s'étirent et montent
  [28, 33, 'H'], [36, 33, 'd'], [28, 34, 'M'], [36, 34, 'M'],
  [28, 35, 's'], [36, 35, 'S'],
  // la lèvre du bas, au jour, un peu plus large ; le creux sous elle
  [29, 36, 'c'], [30, 36, 'm'], [35, 36, 'S'],
  // le bas des joues, gonflé par le sourire, de part et d'autre de la bouche
  [26, 34, 'c'], [26, 35, 'c'], [38, 34, 's'], [38, 35, 's'],
];

/** Le portrait 64 px du forgeron : tête T1, menton M2, les cheveux de C ; neutre (par défaut) ou souriant. */
export function portraitFinal(mood: Mood = 'neutral'): { grid: Grid; pal: Record<string, string> } {
  const p = portrait('T1', 'M2');
  if (mood === 'neutral') return p;
  const g = p.grid.map((r) => [...r]);
  for (const [x, y, ch] of SMILE) g[y][x] = ch;
  return { grid: g.map((r) => r.join('')), pal: p.pal };
}

/** La silhouette d'une vue (hors ombre portée) : première et dernière colonne, première et dernière rangée. */
export function bounds(g: Grid): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  g.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === 'x') return;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }));
  return { x0, x1, y0, y1 };
}
