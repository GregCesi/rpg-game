// Portrait de dialogue de la mère de Xéros : buste de face, 64 px.
// Construit comme celui de Xéros (formes pensées sur 64 px, détails fins en grilles écrites à la main),
// même peau, même contour. Foulard de lin noué sur la nuque (ourlet roulé sur le front, pans qui couvrent
// les oreilles, nœud et pans derrière l'épaule droite) sur des cheveux châtain foncé, robe de laine
// bleu-gris délavé (guède), tablier écru. Contour côté lumière dans la teinte sombre de chaque matière.
// Une animation = une expression. Pour l'instant : 'neutral'.

import { Canvas, flipX, selOut, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE, woad } from '../palette';
import { palette as xerosPalette } from './xeros';

const palette = {
  o: OUTLINE,
  // peau : celle de Xéros
  s: xerosPalette.s,
  S: xerosPalette.S,
  D: xerosPalette.D,
  l: xerosPalette.l,
  e: xerosPalette.e,
  // yeux (bruns, comme son fils)
  w: xerosPalette.w,
  i: xerosPalette.i,
  I: xerosPalette.I,
  p: xerosPalette.p,
  q: xerosPalette.q,
  // sourcils, bouche
  b: '#4a2a1a',
  m: xerosPalette.m,
  M: xerosPalette.M,
  // cheveux châtain foncé
  h: '#6b3d24',
  H: '#8a5434',
  G: '#a06a42',
  j: '#45261a',
  // foulard de lin (teintes de la tunique de Xéros)
  f: xerosPalette.t,
  F: xerosPalette.L,
  T: xerosPalette.T,
  Y: xerosPalette.Y,
  // robe de laine teinte à la guède (palette commune)
  R: woad.light,
  r: woad.base,
  k: woad.shade,
  K: woad.deep,
  // tablier écru
  a: '#e6dcc2',
  A: '#c7b994',
};

interface Details {
  eye: Grid; // oeil gauche (à l'écran) ; l'oeil droit est son reflet
  brow: Grid;
  mouth: Grid;
}

const d: Details = {
  eye: [
    'ooooo.',
    'oiqpiw',
    'wiIIiw',
    '..ee..',
  ],
  brow: [
    '..bbb.',
    'bbb...',
  ],
  mouth: [
    'SmmmmS',
    '.llll.',
  ],
};

function draw(): Canvas {
  const S = 64;
  const c = new Canvas(S, S);
  const arc = (cx: number, cy: number, rx: number, ry: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let a = 0; a <= 40; a++) {
      const t = Math.PI + (a / 40) * Math.PI;
      out.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
    }
    return out;
  };

  // --- Robe de laine (guède) ---
  c.polygon([[4, 64], [9, 55], [19, 50.5], [45, 50.5], [55, 55], [60, 64]], 'r');
  c.within('r', (c) => {
    c.polygon([[46, 51], [55, 55], [60, 64], [48, 64], [44, 56]], 'k');
    c.polygon([[52, 56], [56, 57], [60, 64], [54, 64]], 'K');
    c.polygon([[4, 64], [9, 55], [13, 53], [12, 64]], 'k');
    c.polygon([[10, 54], [19, 51], [24, 51], [16, 55]], 'R');
  });
  // plis de la laine
  c.line(19, 57, 17, 64, 'k');
  c.line(45, 58, 47, 64, 'K');

  // --- Tablier : bavette et bretelles ---
  c.polygon([[21, 55], [43, 55], [44, 64], [20, 64]], 'a');
  c.within('a', (c) => c.polygon([[37, 55], [43, 55], [44, 64], [39, 64]], 'A'));
  c.line(21, 55, 43, 55, 'A');
  c.polygon([[21, 55], [24, 55], [21, 50.6], [18.5, 50.8]], 'a');
  c.polygon([[40, 55], [43, 55], [45.5, 50.8], [43, 50.6]], 'A');
  // couture du haut de la bavette
  for (let x = 23; x < 42; x += 2) c.set(x, 56, 'A');

  // --- Pans du foulard, noués sur la nuque, qui pendent derrière l'épaule droite ---
  c.polygon([[44, 39], [49, 38], [52, 48], [49.5, 51], [46, 49]], 'T');
  c.polygon([[41.5, 41], [45, 40], [46.5, 50], [44, 52], [42, 48]], 'f');
  c.within('T', (c) => c.line(48, 40, 50, 48, 'Y'));
  c.within('f', (c) => c.line(42.5, 42, 43.5, 48, 'F'));

  // --- Cou ---
  c.rect(28, 40, 8, 12, 's');
  c.within('s', (c) => {
    c.rect(33, 40, 3, 12, 'S');
    c.rect(28, 42, 8, 2, 'D');
  });
  // encolure de la robe
  c.ellipse(32, 50.5, 7.5, 3.2, 'k');
  c.within('k', (c) => c.ellipse(32, 50, 6.5, 2.4, 's'));
  // l'encolure s'arrête aux épaules : pas de bande sur le cou
  c.within('k', (c) => {
    c.rect(24, 46, 9, 4, 's');
    c.rect(33, 46, 7, 4, 'S');
  });

  // --- Tête : masse des cheveux (cachée en grande partie par le foulard) ---
  c.ellipse(32, 29, 15.8, 14.5, 'h');
  c.within('h', (c) => c.ellipse(37, 31, 13, 13, 'j'));

  // --- Visage : un peu plus étroit et plus long que celui de Xéros ---
  c.ellipse(32, 30.5, 11.8, 12.5, 's');
  c.polygon([[20.4, 30], [20.9, 35.5], [23.6, 40.4], [28.8, 44.2], [35.2, 44.2], [40.4, 40.4], [43.1, 35.5], [43.6, 30]], 's');
  c.within('s', (c) => {
    c.polygon([[41, 27], [43.8, 30], [43.1, 35.5], [40.4, 40.4], [35.2, 44.2], [33.5, 44.2], [38.5, 40], [41.2, 34]], 'S');
    c.ellipse(24.8, 35.4, 1.7, 1, 'l');
  });
  c.line(29, 44.6, 35, 44.6, 'D');

  // --- Cheveux : deux bandeaux séparés par une raie au milieu, tirés vers les tempes ---
  c.within('s', (c) => c.polygon([[18, 0], [46, 0], [46, 33], ...arc(32, 33, 12.6, 9.6).reverse(), [18, 33]], 'h'));
  c.within('h', (c) => {
    c.line(22, 28, 29, 23.5, 'H');
    c.line(23, 28, 26, 26, 'G');
    c.polygon([[35, 23], [44, 26], [44, 33], [41, 28]], 'j');
    c.line(32, 20, 32, 24, 'j'); // raie
  });

  // --- Foulard noué sur la nuque ---
  // Dôme sur le dessus de la tête, et deux pans qui descendent sur les tempes, couvrent les oreilles
  // et filent derrière la mâchoire vers le nœud.
  const hemRx = 17.4;
  const hemRy = 16;
  c.polygon([...arc(32, 36, 17.6, 27), ...arc(32, 36, hemRx, hemRy).reverse()], 'f');
  c.polygon([[14.2, 24], [21.2, 24], [20.9, 31], [21.3, 37], [20.4, 41], [17.5, 41.5], [15, 38.5], [14.3, 32]], 'f');
  c.polygon([[49.8, 24], [42.8, 24], [43.1, 31], [42.7, 37], [43.6, 41], [46.5, 41.5], [49, 38.5], [49.7, 32]], 'T');
  // derrière la mâchoire, les pans cachent la nuque jusqu'au nœud
  c.within('hjHG', (c) => {
    c.polygon([[14, 35], [26, 35], [26, 47], [14, 47]], 'f');
    c.polygon([[38, 35], [50, 35], [50, 47], [38, 47]], 'T');
  });
  c.within('fT', (c) => {
    // ombre : côté droit du dôme, creux du pan droit
    c.polygon([[41, 9], [50, 18], [50, 30], [44, 24], [43, 16]], 'T');
    c.polygon([[45.5, 27], [49.6, 28], [49, 38.5], [46.5, 41.5], [45, 36]], 'Y');
    // lumière en haut à gauche
    c.ellipse(25, 13.5, 7, 3.2, 'F');
    c.ellipse(21, 17, 3, 2, 'F');
    // plis : ils partent des tempes et filent vers la nuque
    c.line(19, 13, 16, 20, 'T');
    c.line(23, 11, 19, 18, 'T');
    c.line(16, 26, 17, 34, 'T');
    c.line(40, 10, 46, 15, 'T');
    c.line(44, 10, 49, 17, 'Y');
    c.line(47, 26, 48, 35, 'T');
  });
  // ourlet roulé : pli d'ombre au-dessus, bande claire du rouleau, ombre portée sur les cheveux en dessous
  c.within('f', (c) => {
    c.polygon([...arc(32, 36, hemRx, hemRy + 2.4), ...arc(32, 36, hemRx, hemRy + 3.4).reverse()], 'T');
    c.polygon([...arc(32, 36, hemRx, hemRy), ...arc(32, 36, hemRx, hemRy + 2.4).reverse()], 'F');
  });
  // le rouleau suit le bord des pans jusqu'à la mâchoire
  c.within('f', (c) => c.line(21, 24, 20.5, 39, 'F'));
  c.within('T', (c) => c.line(43, 25, 43.5, 39, 'f'));
  // nœud sur la nuque, qui dépasse derrière la mâchoire, au-dessus des pans
  c.ellipse(47, 40, 3, 2.4, 'f');
  c.within('f', (c) => {
    c.set(45, 39, 'F');
    c.set(46, 39, 'F');
    c.line(47, 39, 48, 42, 'Y');
    c.set(49, 40, 'T');
  });
  // côté droit, le rouleau passe à l'ombre
  c.within('F', (c) => c.rect(40, 0, 24, 64, 'f'));
  c.within('h', (c) => c.polygon([...arc(32, 36, hemRx - 0.2, hemRy - 0.1), ...arc(32, 36, hemRx - 0.2, hemRy - 1.2).reverse()], 'j'));

  // --- Détails du visage ---
  const eyeY = 31;
  const eyeL = Math.round(26.2 - d.eye[0].length / 2);
  const eyeR = S - eyeL - d.eye[0].length;
  c.stamp(d.eye, eyeL, eyeY);
  c.stamp(flipX(d.eye), eyeR, eyeY);
  const browY = 27;
  c.stamp(d.brow, eyeL, browY);
  c.stamp(flipX(d.brow), eyeR, browY);
  // nez
  c.line(33.6, 35, 33.6, 37.2, 'S');
  c.line(31, 38.2, 33.8, 38.2, 'S');
  c.set(31, 38, 'D');
  c.set(34, 38, 'D');
  // bouche, neutre
  c.stamp(d.mouth, 29, 41);

  c.outline('o');
  return c;
}

// Contour côté lumière : teinte la plus sombre de chaque matière.
const DARK: Record<string, string> = {
  F: 'Y', f: 'Y', T: 'Y', Y: 'Y',
  h: 'j', H: 'j', G: 'j', j: 'j',
  s: 'D', S: 'D', D: 'D', l: 'D',
  R: 'K', r: 'K', k: 'K', K: 'K',
  a: 'A', A: 'A',
};

const portrait: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'portrait-mother-64',
  frameW: 64,
  frameH: 64,
  palette,
  animations: {
    neutral: { frames: [selOut(draw().toGrid(), DARK)], frameRate: 1, repeat: 0 },
  },
};

export default portrait;
