// Portrait de dialogue de la mère de Xéros : buste de face, 64 px.
// Construit comme celui de Xéros (formes pensées sur 64 px, détails fins en grilles écrites à la main),
// même peau, même contour. Foulard de lin sur des cheveux châtain foncé, robe de laine brune, tablier écru.
// Une animation = une expression. Pour l'instant : 'neutral'.

import { Canvas, flipX, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE } from '../palette';
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
  // robe de laine brune
  r: '#6d4532',
  R: '#8a5b3f',
  k: '#4f3024',
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

  // --- Robe ---
  c.polygon([[4, 64], [9, 55], [19, 50.5], [45, 50.5], [55, 55], [60, 64]], 'r');
  c.within('r', (c) => {
    c.polygon([[46, 51], [55, 55], [60, 64], [48, 64], [44, 56]], 'k');
    c.polygon([[4, 64], [9, 55], [13, 53], [12, 64]], 'k');
    c.polygon([[10, 54], [19, 51], [24, 51], [16, 55]], 'R');
  });
  // plis de la laine
  c.line(19, 57, 17, 64, 'k');
  c.line(45, 58, 47, 64, 'k');

  // --- Tablier : bavette et bretelles ---
  c.polygon([[21, 55], [43, 55], [44, 64], [20, 64]], 'a');
  c.within('a', (c) => c.polygon([[37, 55], [43, 55], [44, 64], [39, 64]], 'A'));
  c.line(21, 55, 43, 55, 'A');
  c.polygon([[21, 55], [24, 55], [21, 50.6], [18.5, 50.8]], 'a');
  c.polygon([[40, 55], [43, 55], [45.5, 50.8], [43, 50.6]], 'A');
  // couture du haut de la bavette
  for (let x = 23; x < 42; x += 2) c.set(x, 56, 'A');

  // --- Pans du foulard, noués sur la nuque, qui pendent derrière l'épaule droite ---
  c.polygon([[42, 38], [48, 36], [51, 47], [47, 51], [43, 49]], 'T');
  c.within('T', (c) => c.line(46, 39, 48, 48, 'Y'));

  // --- Cou ---
  c.rect(28, 40, 8, 12, 's');
  c.within('s', (c) => {
    c.rect(33, 40, 3, 12, 'S');
    c.rect(28, 42, 8, 2, 'D');
  });
  // encolure de la robe
  c.ellipse(32, 50.5, 7.5, 3.2, 'k');
  c.within('k', (c) => c.ellipse(32, 50, 6.5, 2.4, 's'));

  // --- Tête : la chevelure tirée en arrière déborde du visage sur les côtés ---
  c.ellipse(32, 29, 15.8, 14.5, 'h');
  c.within('h', (c) => {
    c.ellipse(37, 31, 13, 13, 'j');
    c.ellipse(28, 27, 10, 10, 'h');
  });
  // oreilles
  c.ellipse(18.6, 34.3, 2.3, 3.6, 's');
  c.ellipse(45.4, 34.3, 2.3, 3.6, 'S');
  c.set(19, 34, 'S');
  c.set(45, 34, 'D');

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
  });

  // --- Foulard noué sur la nuque : couvre le dessus de la tête, bord roulé sur le front ---
  const dome = arc(32, 36, 17.6, 27);
  c.polygon([...dome, ...arc(32, 36, 17.4, 16).reverse()], 'f');
  c.within('f', (c) => {
    c.ellipse(47, 20, 6, 10, 'T');
    c.ellipse(25, 14, 7, 3.4, 'F');
    // bord roulé : bande claire, ombre au-dessus
    c.polygon([...arc(32, 36, 17.4, 16), ...arc(32, 36, 17.4, 17.8).reverse()], 'F');
    c.polygon([...arc(32, 36, 17.4, 17.8), ...arc(32, 36, 17.4, 18.8).reverse()], 'T');
    // pli
    c.line(38, 12, 44, 16, 'T');
  });
  // à droite, côté ombre, le bord roulé s'éteint
  c.within('F', (c) => c.rect(40, 0, 24, 64, 'f'));
  c.within('T', (c) => c.rect(44, 15, 20, 20, 'Y'));
  // ombre portée du foulard sur la raie
  c.within('h', (c) => c.line(32, 20, 32, 23, 'j'));

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

const portrait: SpriteSheetSource = {
  kind: 'spritesheet',
  name: 'portrait-mother-64',
  frameW: 64,
  frameH: 64,
  palette,
  animations: {
    neutral: { frames: [draw().toGrid()], frameRate: 1, repeat: 0 },
  },
};

export default portrait;
