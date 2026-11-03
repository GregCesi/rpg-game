// Proposition C du chantier « lapins » : « gris clair en aplat, face à 4 px ».
// Moins de détail : la robe en aplat (pas de lumière sur le dos, une seule teinte, une ombre franche en bas), plus claire que
// l'herbe, la silhouette portée par le contour sombre ; c'est le test de la règle « la silhouette d'abord » (docs/STYLE.md,
// section 5). De face et de dos, 4 px (20 cm, 1 px de tolérance) : deux oreilles, les yeux sur les côtés de la tête.
// Couleurs : la pierre de art/palette.ts (r z Z) réchauffée vers la terre ; le blanc `a`, son ombre `D` ; l'œil, l'humus `5`.
// Les dessins sont communs (art/world/rabbit-shapes.ts) ; contrat : art/world/rabbit-types.ts.

import { world } from '../palette';
import { EARTH_KEYS } from '../world/rabbit-lib';
import { buildProposal } from '../world/rabbit-shapes';

export const palette: Record<string, string> = {
  ...Object.fromEntries(EARTH_KEYS.map((k) => [k, world[k as keyof typeof world]])),
  l: '#aa9e88', // robe (aplat) : r réchauffé
  b: '#aa9e88', // la même : pas de modelé
  s: '#7c705f', // robe à l'ombre : z réchauffé
  k: '#4d4340', // le plus sombre : Z vers le brun-violet
  w: world.a,
  v: world.D,
  i: world['5'],
};

export default buildProposal({
  id: 'C',
  title: 'gris clair en aplat, face a 4 px',
  note: 'robe claire en aplat, peu de detail, la silhouette par le contour ; face et dos a 4 px',
  palette,
  width: 4,
});
