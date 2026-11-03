// Proposition A du chantier « lapins » : « agouti discret, à la taille stricte ».
// La robe gris-brun du lapin de garenne, contraste doux (il se fond dans l'herbe olive, comme un vrai) ; la tache blanche de la
// queue et le contour le détachent. Tailles de la fiche sans tolérance : profil 8 × 6 à 7, face et dos 3 px de large (un seul
// pixel de robe entre deux contours), dressé 6 × 9, course 10 × 4.
// Couleurs : la robe est une rampe dérivée de la terre et de la pierre de art/palette.ts (E, z, Z, l'ombre vers le brun-violet) ;
// le blanc du ventre et de la queue est le `a` des fleurs, son ombre le torchis `D` ; l'œil, l'humus `5` ; la garenne, la terre
// u U n e et le sous-bois 3 5.
// Les dessins sont communs (art/world/rabbit-shapes.ts) ; contrat : art/world/rabbit-types.ts.
// Planche : npx tsx tools/essai-lapins.ts.

import { world } from '../palette';
import { EARTH_KEYS } from '../world/rabbit-lib';
import { buildProposal } from '../world/rabbit-shapes';

export const palette: Record<string, string> = {
  ...Object.fromEntries(EARTH_KEYS.map((k) => [k, world[k as keyof typeof world]])),
  l: '#a3967a', // robe au soleil : le dos (entre E et r, un peu jaune)
  b: '#837563', // robe : les flancs (E éteint vers z)
  s: '#655a4e', // robe à l'ombre : le bas des flancs (Z réchauffé)
  k: '#4a3f3d', // le plus sombre de la robe : contour côté lumière, oreilles (vers le brun-violet)
  w: world.a, // blanc du ventre et de la queue
  v: world.D, // blanc à l'ombre
  i: world['5'], // l'œil
};

export default buildProposal({
  id: 'A',
  title: 'agouti discret, taille stricte',
  note: 'robe gris-brun douce, contraste faible (il se fond dans l herbe) ; face et dos a 3 px stricts ; la queue blanche le trahit',
  palette,
  width: 3,
});
