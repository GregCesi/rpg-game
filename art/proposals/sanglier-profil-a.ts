// Deuxième essai du profil du sanglier, variante A (hors jeu ; planche : npx tsx tools/essai-sangliers-profil.ts).
// Parti pris : la tête dans l'axe du dos, le garrot très marqué. Le dos tombe de trois rangées du garrot à la croupe ; le front
// continue la pente du garrot jusqu'au groin, le dessous de la mâchoire reste à la hauteur du ventre.
// Gabarit : 28 × 20 px debout (zones 26 × 18, voir sanglier-profil-lib.ts).

import { standing, lowerFrom, type Leg, type Variant } from '../world/boar-lib';

//              0         1         2
//              01234567890123456789012345
export const body = [
  '...........C.CC.C..C......', // 0  soies du garrot, pointe de l'oreille
  '.........UCCCCCCC.CC......', // 1  le garrot, la crinière ; l'oreille, détachée de la nuque
  '......UUUUUCCCCBBBBBB.....', // 2
  '....UUUUUUUUUBBBBBBBBB....', // 3
  '..UUBBBBBBBBBBBBBBBEBBB...', // 4  l'œil
  '.BBBBBBBBBBBBBBBBBBBBBBBBS', // 5  le haut du groin
  'CBBBBBBBBBBBBBBBBBBBBBWBBS', // 6  la queue ; la défense
  'CBBBBBBBBBBBBBBBBBBBBWBBS.', // 7
  'CBBBBBBBBBBBBBBBBBBBBBBB..', // 8
  '.BBBBBBBBBBBBBBBBBBBB.....', // 9  la mâchoire, à la hauteur du ventre
  '..BBBBBBBBBBBBBBBBBB......', // 10 le ventre
  '..BBBBB....BBBBBBB........', // 11 le jambon, le poitrail
];

export const standLegs: Leg[] = [
  { pts: [[7, 11], [7, 17]], near: false },
  { pts: [[12, 11], [12, 17]], near: false },
  { pts: [[4, 11], [4, 13], [3, 15], [3, 17]], near: true },
  { pts: [[15, 11], [15, 17]], near: true },
];

/** Pleine charge, en l'air : les antérieurs lancés en avant, les postérieurs tendus en arrière, la tête un pixel plus bas. */
export const chargeLegs: Leg[] = [
  { pts: [[7, 11], [5, 13], [3, 15]], near: false },
  { pts: [[13, 11], [15, 13], [18, 15]], near: false },
  { pts: [[4, 11], [2, 13], [-1, 15]], near: true },
  { pts: [[15, 11], [17, 13], [20, 15]], near: true },
];

const variant: Variant = {
  key: 'a',
  title: 'A : LA TETE DANS L AXE DU DOS, GARROT TRES MARQUE',
  note: 'le dos tombe du garrot a la croupe ; le front prolonge cette pente jusqu au groin',
  stand: standing(body, standLegs),
  charge: standing(lowerFrom(body, [[17, 1]]), chargeLegs, { air: 2 }),
};
export default variant;
