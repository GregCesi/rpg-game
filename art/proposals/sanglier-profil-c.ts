// Deuxième essai du profil du sanglier, variante C (hors jeu ; planche : npx tsx tools/essai-sangliers-profil.ts).
// Parti pris : le coin le plus massif. Le garrot de A, la tête plus profonde (le groin sur quatre rangées, la ganache large), la
// joue grise (G) qui détache la tête du cou comme sur un vrai sanglier, la défense qui sort de la babine devant elle.
// Avec elle, la mort (bascule sur le flanc, pattes raides) et le couché à la bauge (sur le ventre, pattes repliées, tête posée).
// Gabarit : 28 × 20 px debout (zones 26 × 18, voir sanglier-profil-lib.ts) ; mort sur le flanc 28 × 16 (140 × 80 × 40 cm couché).

import { standing, lying, flipped, lowerFrom, type Anim, type Leg, type P, type Variant } from './sanglier-profil-lib';
import { standLegs, chargeLegs } from './sanglier-profil-a';

//              0         1         2
//              01234567890123456789012345
export const body = [
  '..........C.CC.CC.C.......', // 0  soies du garrot, pointe de l'oreille
  '........UCCCCCCC.CC.......', // 1  le garrot, la crinière ; l'oreille, détachée de la nuque
  '.....UUUUUUCCCCBBBBBB.....', // 2
  '...UUUUUUUUUUBBBBBBBBB....', // 3
  '..BBBBBBBBBBBBBBBBBBEBBB..', // 4  l'œil
  '.BBBBBBBBBBBBBBBBBBBBBBBBS', // 5  le haut du groin
  'CBBBBBBBBBBBBBBBBBGGGBWBBS', // 6  la queue ; la joue grise ; la défense
  'CBBBBBBBBBBBBBBBBGGGGWBBBS', // 7
  'CBBBBBBBBBBBBBBBBBGGGBBBB.', // 8
  '.BBBBBBBBBBBBBBBBBBBBB....', // 9  la ganache, à la hauteur du ventre
  '..BBBBBBBBBBBBBBBBBBB.....', // 10 le ventre
  '..BBBBB....BBBBBBB........', // 11 le jambon, le poitrail
];

const variant: Variant = {
  key: 'c',
  title: 'C : LE COIN LE PLUS MASSIF, LA JOUE GRISE',
  note: 'le garrot de A, la tete plus profonde ; la joue grise detache la tete du cou, la defense sort de la babine',
  stand: standing(body, standLegs),
  charge: standing(lowerFrom(body, [[17, 1]]), chargeLegs, { air: 2 }),
};
export default variant;

// ---------------------------------------------------------------- couché sur le flanc (mort)

// Dessiné pattes en bas (le dos en haut), puis retourné de haut en bas par `flipped` : couché sur le flanc, vu du sud, le dos et
// sa crinière bordent le bas de l'image, le ventre clair passe au nord, les pattes raides pointent hors du corps (vers le nord).
//                     0         1         2
//                     0123456789012345678901234567
export const deadBody = [
  '.....CCCCCCCCCC....CC.......', // 0  la crinière, le long du dos (au sud une fois retourné) ; l'oreille couchée
  '...BBBBBBBBBBBBBBBBBBB......', // 1
  '..BBBBBBBBBBBBBBBBBBBBBB....', // 2
  '.BBBBBBBBBBBBBBBBBBBEBBBB...', // 3  l'œil
  'CBBBBBBBBBBBBBBBBBBBBBBBBBS.', // 4  la queue ; le groin
  'CBBBBBBBBBBBBBBBBBBGGGWBBBS.', // 5  la joue, la défense
  '.BBBBBBBBBBBBBBBBBBGGGBBBBS.', // 6
  '..VVVVVVVVVVVVVVVVVBBBBBB...', // 7  le ventre clair (au nord une fois retourné)
  '...VVVVVVVVVVVVVVV..........', // 8
];

/** Les pattes raides, droites, tendues hors du corps (dessinées vers le bas, puis le dessin est retourné : elles pointent en l'air). */
const upLegs = (k: number): Leg[] => ([
  [[9, 8], [7, 15]], [[14, 8], [16, 15]], [[6, 8], [3, 15]], [[17, 8], [20, 15]],
] as [P, P][]).map(([a, b], i) => ({
  pts: [a, [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k)]] as P[], near: i >= 2, thigh: 1,
}));

export const dead = flipped(deadBody, upLegs(1));

// ---------------------------------------------------------------- couché à la bauge (sur le ventre)

/** Le corps posé au sol, les pattes repliées dessous ; la tête descend d'un pixel de plus, le menton sur les antérieurs. */
const bedBody = (() => {
  const b = lowerFrom(body.slice(0, 11), [[16, 1]]);
  // les antérieurs repliés, couchés sous le menton (le canon et le sabot dépassent devant le poitrail)
  return [...b, '..BBBBBBBBBBBBBGGGGGHH.....'.slice(0, 26)];
})();

export const bed = lying(bedBody, []);

// ---------------------------------------------------------------- la mort : il bascule sur le flanc

/** Les pattes qui plient (image 1) : les antérieurs cèdent, genoux en avant. */
const buckleLegs: Leg[] = [
  { pts: [[7, 11], [7, 17]], near: false },
  { pts: [[13, 12], [15, 14], [14, 17]], near: false },
  { pts: [[4, 11], [4, 13], [3, 15], [3, 17]], near: true },
  { pts: [[15, 12], [17, 14], [16, 17]], near: true },
];

/** Écroulé sur le ventre, prêt à basculer (image 2) : les pattes écartées sous lui. */
const sinkLegs: Leg[] = [
  { pts: [[7, 10], [6, 12]], near: false, thigh: 1 },
  { pts: [[13, 10], [15, 12]], near: false, thigh: 1 },
  { pts: [[4, 10], [2, 12]], near: true, thigh: 1 },
  { pts: [[15, 10], [18, 12]], near: true, thigh: 1 },
];

export const death: Anim = {
  note: '1 les anterieurs cedent, 2 il s ecroule, 3 il roule sur le flanc, les pattes sortent, 4 pattes raides tendues (tenu)',
  ms: [140, 160, 180, 1500],
  frames: [
    standing(lowerFrom(body, [[0, 0], [10, 1], [16, 2]]), buckleLegs),
    lying(lowerFrom(body.slice(0, 11), [[14, 1]]), sinkLegs),
    flipped(deadBody, upLegs(0.5)),
    dead,
  ],
};
