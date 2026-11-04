// Proposition : le forgeron, essai 4, « les têtes » (chantier « forgeron », essai hors jeu ; rien ici n'est déclaré dans
// art/index.ts). Planche : npx tsx tools/essai-forgeron-tete.ts écrit .art-preview/forgeron-tetes.png.
//
// Retour de Grégoire sur l'essai 3 (art/proposals/forgeron-colosse.ts, gardé tel quel pour comparer) : on garde la variante C,
// « le géant », pour ses cheveux (rejetés en arrière, qui ondulent, deux mèches devant les oreilles) et son corps ; la tête
// était trop ronde (16 × 15 px contour compris, plus large que haute). Ici, trois têtes plus longues que larges, aux traits
// carrés, sur le corps de C (de face) et sur celui de A (de profil, le profil de C n'existant pas) :
// - T1, « le rectangle » : front, pommettes et mâchoire de même largeur (le visage de peau, 9 px), angles de mâchoire à 90°
//   sous les mèches, menton plat et large ;
// - T2, « l'écu » : le front plus étroit (7 px de peau, les tempes sous les cheveux), la mâchoire la plus large et la plus
//   lourde (11 px, toute la largeur de la tête), menton carré large ; le plus massif ;
// - T3, « la lame » : la plus étroite (10 px de matière) et la plus longue (le menton descend d'une rangée, sur le cou),
//   pommettes hautes, joues creusées dessous, menton carré mais étroit (6 px).
// Toutes : sourcils droits (deux pixels d'ombre blonde), nez droit et fort (l'arête claire, l'ombre dessous sur deux pixels),
// moustache blonde courte (pas plus large que la bouche), regard calme (paupière d'ombre, pas de sourcil froncé), aucune ride.
// L'angle de la mâchoire se lit à x1 par une encoche de contour sous chaque coin (un pixel vide dans la rangée du cou, que le
// contour remplit) et par l'ombre du cou sous le menton.
//
// Construction : celle de l'essai 3 (matière seule rangée par rangée, [colonne de départ, pixels], contour ajouté autour, puis
// passé côté lumière dans la teinte la plus sombre de chaque matière). Le corps est repris des grilles de l'essai 3 (`SPECS`) :
// de face, celui de C à partir des deltoïdes (y=23) ; de profil, celui de A à partir du dessous des pectoraux (y=23).
// Les couleurs sont celles de l'essai 3 (`palette`).

import { Canvas, selOut, type Grid } from '../lib/canvas';
import { SPECS, W, H, palette } from './forgeron-colosse';

export { palette };

export type Version = 'T1' | 'T2' | 'T3';
export type HeadFacing = 'down' | 'right';

type Spec = [number, string][];
const TOP = 8;

const DARK: Record<string, string> = {
  Y: 'd', H: 'd', h: 'd', d: 'd',
  w: 'D', s: 'D', S: 'D', D: 'D',
  A: 'Q', a: 'Q', q: 'Q', Q: 'Q',
  p: 'n', P: 'n', n: 'n',
  K: 'm', k: 'm', m: 'm',
};

// ---------- Les cheveux de C, sur une tête plus étroite ----------
// Rejetés en arrière : de face, des mèches qui montent du front (traits d'ombre presque verticaux qui glissent d'un pixel :
// l'ondulation), un reflet (Y) par mèche ; la racine droite et haute (le front dégagé). Matière x=10 à 20 (11 px, 13 contour
// compris) pour T1 et T2, x=11 à 20 pour T3.

/** y=23 : la rangée des deltoïdes de C, les pointes des cheveux posées dessus (x=7 à 9 et 21 à 23). */
const SHOULDER_HAIR: [number, string] = [3, 'swwwhHdwsAAaaaaaqShddSSSSD'];

const HAIR_11: Spec = [
  [11, 'HHYHdHHhd'], // y=8 : le volume rejeté en arrière, qui bombe au-dessus du front
  [10, 'hHHYHHdHYhd'],
  [9, 'hHHYHHdHHYhdd'],
];

// ---------- T1, « le rectangle » : de face ----------
// Peau x=11 à 19 (9 px) de y=11 à 21 (11 rangées). Les mèches devant les oreilles (x=10 et 20) s'arrêtent à y=17 ; dessous,
// le bord de la mâchoire, droit, et ses coins à angle droit (y=21).
const T1_FRONT: Spec = [
  ...HAIR_11,
  [9, 'dHHswwsssShhd'], // y=11 : la racine ; les mèches plongent aux coins du front
  [9, 'dYswsssssSShd'], // les deux mèches devant les oreilles (2 px), qui ondulent : le reflet glisse d'une colonne
  [9, 'dYshhssshhShd'], // sourcils droits, blonds
  [9, 'dYssSswSSsSdh'], // paupières, légères ; l'arête du nez
  [9, 'dHssoswSosSdh'], // yeux
  [9, 'dHwwsswSssShd'], // pommettes ; le nez
  [9, 'hYsssSSDssShd'], // le dessous du nez, fort
  [9, 'hYssHHHhhsShd'], // y=18 : la moustache courte
  [9, 'dHswssSSsSShd'], // la bouche, paisible
  [9, 'YdsssswwssSdh'], // le menton, clair ; les pointes des mèches
  [11, 'SsssssSSD'], // y=21 : le menton plat, les coins de la mâchoire dégagés
  [6, 'whHhd.QDDDDDDQ.hhddD'], // y=22 : la masse des cheveux derrière la nuque, sur les trapèzes ; le cou ; les encoches
  SHOULDER_HAIR, // y=23 : les pointes qui ondulent sur les épaules
];

// ---------- T2, « l'écu » : de face ----------
// Le front plus étroit (peau x=12 à 18, les tempes sous les cheveux), les pommettes x=11 à 19, la mâchoire x=10 à 20 (11 px) :
// les mèches s'arrêtent à y=16 et la mâchoire prend leur place, plus large que tout le haut du visage.
const T2_FRONT: Spec = [
  ...HAIR_11,
  [9, 'dHHswssssShhd'], // y=11 : le front étroit (7 px), les tempes sous les cheveux
  [9, 'dYHwssssSShhd'],
  [9, 'dYshhssshhShd'], // sourcils ; le visage s'élargit
  [9, 'dYssSswSSsSdh'],
  [9, 'dHssoswSosSdh'],
  [9, 'dHwwsswSssShd'],
  [9, 'hswssSSDssSSd'], // y=17 : la mâchoire, toute la largeur (x=10 à 20) ; les mèches s'amincissent
  [9, 'dsssHHHhhsSSh'], // la moustache
  [9, 'hswsssSSsSSDd'],
  [9, 'dSssswwsSSSDh'], // le menton large ; le bord de la mâchoire dans l'ombre
  [10, 'DSsssssSSDD'], // y=21 : le bas, lourd ; les coins
  [6, 'whHh.DQDDDDDDQ.hhddD'], // la masse derrière la nuque ; les encoches sous les coins (x=10 et 20)
  SHOULDER_HAIR,
];

// ---------- T3, « la lame » : de face ----------
// Matière x=11 à 20 (10 px), peau x=12 à 19 (8 px) de y=11 à 22 (12 rangées) : le menton descend sur le cou. Pommettes hautes
// (y=16), le creux des joues dessous (S), la mâchoire droite jusqu'à y=21, le menton plus étroit (x=13 à 18).
const T3_FRONT: Spec = [
  [12, 'HHYHdHhd'], // y=8
  [11, 'hHHYHdHYhd'],
  [10, 'hHHYHdHHYhdd'],
  [10, 'dHHswwssShhd'], // y=11
  [10, 'dYswssssSShd'],
  [10, 'dYshhsshhShd'], // sourcils droits
  [10, 'dYssSwSSsSdh'], // paupières, légères
  [10, 'dHssowSosSdh'], // yeux
  [10, 'dHwwswSssShd'], // pommettes hautes
  [10, 'hYSssSDsSShd'], // les joues creusées dessous ; le dessous du nez
  [10, 'hYSsHHhhsShd'], // y=18 : la moustache
  [10, 'dHswsSSsSShd'],
  [10, 'YdsssswsSSdh'], // les pointes des mèches
  [12, 'DsswwsSD'], // y=21 : le coin de la mâchoire
  [6, 'whHhdd.SsswsD.hhddSD'], // y=22 : le menton étroit entre deux encoches ; la masse des cheveux derrière la nuque
  SHOULDER_HAIR,
];

// ---------- De profil (vers la droite) ----------
// Sur le corps de A (essai 3), dont la tête de profil allait de x=9 à 25 : ici de x=13 à 25 (le nez), 15 px contour compris. Les cheveux de C,
// rejetés en arrière : des mèches couchées vers la nuque, qui ondulent et descendent sur le haut du dos (x=9 à 14, y=22 à 24) ;
// une mèche devant l'oreille (x=18 et 19) jusqu'à y=17. L'oreille en x=16-17 ; sous elle, le bord arrière de la mâchoire
// (une colonne d'ombre D, x=16 ; x=15 pour T2), le bord inférieur droit jusqu'au menton carré, dans l'ombre ; le cou rentre sous le menton
// (vide devant lui, que le contour remplit : le dessous du menton se lit). Le nez droit et fort : l'arête descend d'un pixel
// vers l'avant (x=24 puis 25), le dessous dans l'ombre.

/** Les pointes des cheveux sur le haut du dos (y=23-24), qui ondulent ; le reste des rangées de A (deltoïde, bavette). */
const NAPE: Spec = [
  [9, 'dhYhdDwwwsssSDQSAq'], // y=23
  [9, 'hd.ssDwsssssSDssAq'],
];

const SIDE_TOP: Spec = [
  [15, 'hHYYHHd'], // y=8
  [14, 'hHYHHYHHd'],
  [13, 'hHYHdHHYHHd'],
  [13, 'hYhdHYHHhws'], // y=11 : la racine haute, le front droit (x=22-23)
  [12, 'hYhdHHHYhwss'],
  [12, 'hHhdhHhdshhs'], // le sourcil droit (x=21-22) ; la mèche devant l'oreille (x=18-19)
  [13, 'dYhSShhsSsss'], // l'oreille (x=16-17) ; la paupière ; l'arête du nez (x=24)
  [13, 'hdYsDhhsossw'], // l'œil (x=21)
  [12, 'hYhdSShdwssssS'], // y=16 : la pommette ; le nez fort (x=25) ; la pointe de la mèche
];

const T1_SIDE: Spec = [
  ...SIDE_TOP,
  [13, 'dHYDsdsssssSD'], // le dessous du nez ; le bord arrière de la mâchoire (x=16), sous l'oreille
  [14, 'hYDsssssHHh'], // la moustache courte
  [13, 'dhYDssssssSs'],
  [12, 'hYhdDssssswsS'], // le menton
  [13, 'dYhDSSSSSSSD'], // y=21 : le bord inférieur, droit ; l'angle à 90° sous l'oreille
  [10, 'hYhdhsSSDDDD'], // y=22 : le cou rentre, dans l'ombre du menton ; les cheveux sur la nuque
  ...NAPE,
];

// T2 : la mâchoire plus profonde (le bord arrière en x=16), le menton qui avance jusqu'à l'aplomb du nez (x=25).
const T2_SIDE: Spec = [
  ...SIDE_TOP,
  [13, 'YhDssdsssssSD'], // le bord arrière de la mâchoire, plus profonde (x=15)
  [13, 'dYDssssssHHh'],
  [13, 'hYDsssssssSs'],
  [12, 'hYhDsssssswssS'], // le menton lourd, à l'aplomb du nez (x=25)
  [13, 'YdDSSSSSSSSSD'], // y=21
  [10, 'hYhdSsSSDDDD'],
  ...NAPE,
];

// T3 : plus longue (le menton à y=22), la joue creusée sous la pommette (x=20-21), le menton étroit d'avant en arrière.
const T3_SIDE: Spec = [
  ...SIDE_TOP,
  [13, 'dHYDsdsSsssSD'], // le creux de la joue sous la pommette (x=20)
  [14, 'hYDsssSsHHh'],
  [13, 'dhYDssssssSs'],
  [12, 'hYhdDsssssssS'],
  [13, 'dYhDsssswssS'], // y=21 : le bord arrière de la mâchoire (x=16)
  [10, 'hYhdhsSDSSSSSSD'], // y=22 : le menton, plus bas ; le cou rentre derrière lui
  [9, 'dhYhdDwwwDDDDDQSAq'], // y=23 : l'ombre du menton sur le haut de la poitrine
  NAPE[1],
];

// ---------- Composition ----------

/** Rangées du visage par version (y=8 à 22) ; le corps suit. */
const FRONT: Record<Version, Spec> = { T1: T1_FRONT, T2: T2_FRONT, T3: T3_FRONT };
const SIDE: Record<Version, Spec> = { T1: T1_SIDE, T2: T2_SIDE, T3: T3_SIDE };

/** La rangée du menton (le bas de la tête), pour mesurer la tête. */
export const CHIN: Record<Version, number> = { T1: 21, T2: 21, T3: 22 };

// ---------- Le menton de T1 (essai 5 : Grégoire choisit T1 et ne demande que le menton) ----------
// Plus saillant (il avance devant la lèvre, de profil ; de face, un plan de lumière franc et une ombre portée nette dessous),
// un peu plus pointu vers le bas (les coins du bas dans l'ombre, ou le milieu qui descend d'une rangée), une fossette au milieu
// (un pixel d'ombre entre deux reflets). Tout le reste de T1 est identique : seules les rangées y=20 à 23 changent.
// - M0 : T1 telle quelle (essai 4), pour comparer ;
// - M1 « la bosse » : la silhouette de T1 (menton à y=21) ; de face, les coins du bas à l'ombre (le menton se lit sur 5 px),
//   le plan de lumière, la fossette, l'ombre portée sur le cou ; de profil, le menton avance d'un pixel devant la lèvre ;
// - M2 « le menton en avant » : le milieu descend d'une rangée (y=22, 5 px sous la mâchoire de 9 px, les angles gardés), la
//   fossette au bas, l'ombre portée sur le haut de la bavette ; de profil, il avance et descend ;
// - M3 « le menton fort » : M2 plus marqué (le bas plus étroit à l'ombre, la fossette plus sombre entre deux reflets
//   clairs ; de profil, la bosse plus pleine).
export type Chin = 'M0' | 'M1' | 'M2' | 'M3';
export const CHINS: Chin[] = ['M0', 'M1', 'M2', 'M3'];

/** Les rangées remplacées, par y, de face (`down`) et de profil (`right`). */
const CHIN_ROWS: Record<Exclude<Chin, 'M0'>, Record<HeadFacing, Record<number, [number, string]>>> = {
  M1: {
    down: {
      20: [9, 'YdssswwwsSSdh'], // le plan de lumière du menton
      21: [11, 'SSswSwsSD'], // les coins à l'ombre ; la fossette (x=15) entre deux reflets
      22: [6, 'whHhd.DQQQQQDD.hhddD'], // l'ombre portée du menton sur le cou, nette
    },
    right: {
      // y=20 : le creux sous la lèvre (x=24, à l'ombre), inchangé ; y=21 : la bosse du menton avance d'un pixel (x=25), au jour
      21: [13, 'dYhDSSSSSswsS'],
    },
  },
  M2: {
    down: {
      21: [11, 'SsswwwsSD'], // le plan de lumière ; les angles de la mâchoire gardés
      22: [6, 'whHhd.QswSsSDQ.hhddD'], // le bas du menton (x=13 à 17), la fossette (x=15)
      23: [3, 'swwwhHdwsAQQQQQaqShddSSSSD'], // son ombre portée sur la bavette
    },
    right: {
      20: [12, 'hYhdDssssswsD'], // le creux sous la lèvre (x=24), plus sombre
      21: [13, 'dYhDSSSSssswS'], // la bosse du menton avance (x=25), son haut au jour
      22: [10, 'hYhdhsSSDDDQSSS'], // le dessous du menton, une rangée plus bas ; l'ombre portée sur le cou (Q)
      23: [9, 'dhYhdDwwwsssSQQQAq'], // l'ombre portée sur la poitrine
    },
  },
  M3: {
    down: {
      21: [11, 'SSswwwsSD'], // les coins du menton à l'ombre dès y=21
      22: [6, 'whHhd.QSwDwSDQ.hhddD'], // le bas étroit à l'ombre ; la fossette sombre entre deux reflets
      23: [3, 'swwwhHdwsAQQQQQaqShddSSSSD'],
    },
    right: {
      20: [12, 'hYhdDssssswD'], // le creux sous la lèvre rentre d'un pixel (x=23) : la lèvre (x=24) et le menton (x=25) le bordent
      21: [13, 'dYhDSSSSsswwS'], // la bosse pleine, son haut au jour
      22: [10, 'hYhdhsSSDDDQSssD'], // le bas plein, jusqu'à x=25
      23: [9, 'dhYhdDwwwsssSQQQQq'],
    },
  },
};

/** La rangée du bas du menton de T1 selon la version du menton. */
export const CHIN_BOTTOM: Record<Chin, number> = { M0: 21, M1: 21, M2: 22, M3: 22 };

function spec(version: Version, facing: HeadFacing, chin: Chin = 'M0'): Spec {
  // De face : le corps de C sous les deltoïdes (y=24 ; la rangée y=23 est SHOULDER_HAIR). De profil : celui de A à partir de y=25 (les rangées y=23-24,
  // les pointes des cheveux sur le dos, sont dans NAPE).
  const body = facing === 'down' ? SPECS['C-down-loose'].slice(16) : SPECS['A-right-loose'].slice(17);
  const head = facing === 'down' ? FRONT[version] : SIDE[version];
  const all = [...head, ...body];
  if (chin !== 'M0') {
    if (version !== 'T1') throw new Error(`forgeron-tetes : le menton ${chin} n'existe que pour T1`);
    for (const [y, row] of Object.entries(CHIN_ROWS[chin][facing])) {
      const i = Number(y) - TOP;
      const [x0, old] = all[i];
      if (x0 + old.length !== row[0] + row[1].length && facing === 'down' && i < 14) {
        // de face, la largeur des rangées du visage ne change pas
        throw new Error(`forgeron-tetes : ${chin} y=${y} change la largeur de la rangée`);
      }
      all[i] = row;
    }
  }
  if (all.length !== 37) throw new Error(`forgeron-tetes : ${version} ${facing} a ${all.length} rangées, il en faut 37`);
  return all;
}

function grid(s: Spec): Grid {
  const c = new Canvas(W, H);
  s.forEach(([x, row], i) => c.stamp([row], x, TOP + i));
  return c.toGrid();
}

function finish(matter: Grid, shadowW: number): Grid {
  const c = Canvas.from(matter).outline('o');
  c.within('.', (cc) => cc.ellipse(16.5, 45.5, shadowW, 2, 'x'));
  return selOut(c.toGrid(), DARK);
}

/** Le forgeron avec la tête `version`, de face (corps de C) ou de profil droit (corps de A), cheveux lâchés. */
export function head(version: Version, facing: HeadFacing, chin: Chin = 'M0'): Grid {
  return finish(grid(spec(version, facing, chin)), facing === 'right' ? 6 : 9);
}

/** La tête seule (matière, sans contour) : largeur et hauteur contour compris, de y=7 (le contour du sommet) au menton. */
export function headSize(version: Version, facing: HeadFacing, chin: Chin = 'M0'): { w: number; h: number } {
  const g = grid(spec(version, facing, chin));
  let x0 = 99, x1 = -1;
  for (let y = TOP; y <= Math.min(CHIN[version], 21); y++) { // y=22 de T3 : le menton entre les trapèzes
    [...g[y]].forEach((ch, x) => { if (ch !== '.') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } });
  }
  const bottom = chin === 'M0' ? CHIN[version] : CHIN_BOTTOM[chin];
  return { w: x1 - x0 + 3, h: bottom - TOP + 2 };
}
