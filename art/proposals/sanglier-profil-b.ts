// Deuxième essai du profil du sanglier, variante B (hors jeu ; planche : npx tsx tools/essai-sangliers-profil.ts).
// Parti pris : la tête un peu plus levée (le groin d'un pixel plus haut que A, le front moins pentu), la crinière plus fournie (des
// touffes sur deux rangées, du garrot au milieu du dos), le dos plus droit.
// Gabarit : 28 × 20 px debout (zones 26 × 18, voir sanglier-profil-lib.ts).

import { standing, lowerFrom, type Variant } from '../world/boar-lib';
import { standLegs, chargeLegs } from './sanglier-profil-a';

//              0         1         2
//              01234567890123456789012345
export const body = [
  '........C.CC.CCC.C.C......', // 0  touffes de la crinière, pointe de l'oreille
  '.......CCCCCCCCCCCBCC.....', // 1  la crinière fournie, l'oreille
  '....UUUCCCCCCCBBBBBBBB....', // 2
  '..UUUUUUUUUBBBBBBBBBEBBB..', // 3  l'œil
  '.BBBBBBBBBBBBBBBBBBBBBBBBS', // 4  le haut du groin
  'CBBBBBBBBBBBBBBBBBBBBBWBBS', // 5  la queue ; la défense
  'CBBBBBBBBBBBBBBBBBBBBWBBBS', // 6
  'CBBBBBBBBBBBBBBBBBBBBBBB..', // 7
  '.BBBBBBBBBBBBBBBBBBBB.....', // 8  la mâchoire
  '.BBBBBBBBBBBBBBBBBBB......', // 9
  '..BBBBBBBBBBBBBBBBBB......', // 10 le ventre
  '..BBBBB....BBBBBBB........', // 11 le jambon, le poitrail
];

const variant: Variant = {
  key: 'b',
  title: 'B : LA TETE PLUS LEVEE, LA CRINIERE PLUS FOURNIE',
  note: 'le groin un pixel plus haut, le front moins pentu ; des touffes de soies sur deux rangees, le dos plus droit',
  stand: standing(body, standLegs),
  charge: standing(lowerFrom(body, [[17, 1]]), chargeLegs, { air: 2 }),
};
export default variant;
