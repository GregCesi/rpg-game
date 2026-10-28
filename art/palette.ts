// Palette commune du jeu. Les sprites piochent dedans pour rester cohérents entre eux.
// Un caractère = une couleur. '.' est réservé à la transparence.

// Direction "conte rustique" : tons terreux tirant vers l'ocre, ombres qui glissent vers le brun-violet,
// lumières vers le jaune. Contours brun chaud plutôt que noirs.
export const OUTLINE = '#3b2b20';

export const world = {
  // herbe (olive, un peu sèche)
  g: '#7b8544',
  G: '#949a52',
  v: '#606a38',
  V: '#4c5430',
  y: '#b0a862',
  // terre / chemin
  u: '#a8855a',
  U: '#bf9d6c',
  n: '#8c6c48',
  e: '#6f553a',
  // champ labouré
  f: '#6e4f33',
  F: '#87643f',
  // eau
  w: '#56788a',
  W: '#7e9ea8',
  q: '#45627a',
  // bois (clôtures, troncs, charpente)
  m: '#86613e',
  M: '#a67d51',
  N: '#5f412b',
  K: '#46301f',
  // feuillage
  l: '#5d6e34',
  L: '#76863f',
  j: '#99a556',
  k: '#45512b',
  // pierre
  r: '#9a9384',
  R: '#b8b09f',
  z: '#787061',
  Z: '#5d564a',
  // chaume
  t: '#b8954f',
  T: '#97773c',
  Y: '#d3b46d',
  P: '#73592e',
  // torchis
  d: '#d8c6a1',
  D: '#baa47f',
  E: '#9a8664',
  // fleurs
  a: '#efe6cc',
  b: '#e0b94a',
  c: '#b8584a',
  // contour, ombre, lueur
  o: OUTLINE,
  x: '#2b1a1040',
  h: '#e9a23b',
  H: '#f6d36b',
  i: '#c4542c',
};
