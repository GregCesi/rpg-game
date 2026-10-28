// Palette commune du jeu. Les sprites piochent dedans pour rester cohérents entre eux.
// Un caractère = une couleur. '.' est réservé à la transparence.

export const OUTLINE = '#2b1d16';

export const world = {
  // herbe
  g: '#5f8f3e',
  G: '#74a54a',
  v: '#4c7633',
  y: '#8dbb57',
  // terre / chemin
  u: '#a27b50',
  U: '#b68e5f',
  n: '#8a6641',
  // champ labouré
  f: '#6b4a2e',
  F: '#84603d',
  // eau
  w: '#3d6e9e',
  W: '#5a8dc0',
  q: '#2f5a85',
  // bois (clôtures, troncs)
  m: '#7a5232',
  M: '#9a6c43',
  N: '#56391f',
  // feuillage
  l: '#3f6b2c',
  L: '#55893a',
  j: '#6fa64a',
  k: '#2d5020',
  // pierre
  r: '#8b8a84',
  R: '#a9a8a0',
  z: '#6b6a66',
  // fleurs
  a: '#f2ecd6',
  b: '#e8c547',
  c: '#c8584a',
  // contour et ombre
  o: OUTLINE,
  x: '#00000038',
};
