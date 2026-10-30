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
  // bois grisé par les intempéries (toit de planches de l'abri, bois brut de la cabane et de la maison) : chaque teinte
  // est le mélange à moitié d'une teinte du bois (M m N) et de la pierre de même rang (R r z Z), moins jaune que le bois
  // équarri frais (Y t T) et que le chaume. Du plus clair au plus sombre ; K pour les joints. Quelques palettes locales
  // (portraits, personnages, intérieur, dialogue) redonnent leur propre sens à S, A, B ou Q.
  S: '#af976f', // M + R : la planche la plus claire, au faîte
  A: '#a0886a', // M + r : planche claire
  B: '#7f684f', // m + z : planche ordinaire
  Q: '#5e4b3a', // N + Z : planche à l'ombre, fil, tranche
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
  // chanvre (corde) : plus jaune et plus saturé que le lin de la tunique de Xéros (portrait L t T), pour s'en
  // détacher quand il pend à sa main ; plus pâle que la paille (Y t). X : le plus sombre, contour côté lumière et creux.
  J: '#ddc58d',
  O: '#b99c62',
  C: '#8c7244',
  X: '#5f4a2b',
  // contour, ombre, lueur
  o: OUTLINE,
  x: '#2b1a1040',
  h: '#e9a23b',
  H: '#f6d36b',
  i: '#c4542c',
};

// Laine teinte à la guède, délavée (robe de la mère). Le bleu de l'eau (W w q) éteint vers le gris
// de la pierre (R r z) : la lumière glisse vers le jaune-gris, l'ombre vers le brun-violet.
// Assez claire et froide pour se détacher de la terre battue et des cheveux châtain.
export const woad = {
  light: '#94a29f',
  base: '#728390',
  shade: '#56637a',
  deep: '#443f55',
};
