// Proposition B du chantier « lapins » : « roux contrasté, face à 5 px ».
// Une robe plus rousse et plus contrastée (le lapin de garenne l'est en été), qui se détache de l'herbe olive : lumière chaude sur
// le dos, ombre franche, contour presque brun-noir ; le blanc du ventre et de la queue plus vif. De face et de dos, 5 px de large
// (25 cm au lieu des 15 de la fiche : 2 px d'écart, la tolérance du gabarit) : les deux oreilles écartées, deux yeux, le museau
// blanc au milieu ; le profil est celui de A (8 px, la fiche).
// Couleurs : la rampe de l'écorce de art/palette.ts (M m N K), éteinte vers le gris de la pierre ; le blanc `a`, son ombre `d` ;
// l'œil, l'humus `5`.
// Les dessins sont communs aux propositions (art/proposals/lapins-shapes.ts) ; contrat : art/proposals/lapins-types.ts.

import { world } from '../palette';
import { EARTH_KEYS } from './lapins-lib';
import { buildProposal } from './lapins-shapes';

export const palette: Record<string, string> = {
  ...Object.fromEntries(EARTH_KEYS.map((k) => [k, world[k as keyof typeof world]])),
  l: '#b39069', // robe au soleil : M éteint, un peu jaune
  b: '#8a6a4c', // robe : m vers la pierre
  s: '#634a38', // robe à l'ombre : N réchauffé
  k: '#3f2c27', // le plus sombre : K vers le brun-violet
  w: world.a, // blanc du ventre et de la queue
  v: world.d, // blanc à l'ombre, plus clair que dans A : le blanc se lit mieux
  i: world['5'], // l'œil
};

export default buildProposal({
  id: 'B',
  title: 'roux contraste, face a 5 px',
  note: 'robe rousse contrastee, se detache de l herbe ; face et dos a 5 px (tolerance du gabarit) : deux oreilles, deux yeux',
  palette,
  width: 5,
});
