// Portrait de dialogue de Xéros : buste de face.
// Dessiné en formes (coordonnées sur 64 px), avec les détails fins (yeux, sourcils, bouche) en grilles écrites à la main.
// Une animation = une expression. Pour l'instant : 'neutral'.

import { Canvas, flipX, type Grid } from '../lib/canvas';
import type { SpriteSheetSource } from '../lib/types';
import { OUTLINE } from '../palette';

export const palette = {
  o: OUTLINE,
  // peau claire hâlée
  s: '#e9b993',
  S: '#cf9572',
  D: '#a86b50',
  l: '#f6d5b5',
  e: '#c9967f', // cernes
  // cheveux brun foncé
  h: '#553220',
  H: '#74472c',
  G: '#8e5b39',
  j: '#3a2013',
  // côtés rasés (peau + repousse)
  u: '#7a5947',
  U: '#5f4334',
  // yeux
  w: '#efe6d8',
  i: '#6b4126',
  I: '#8f5a35',
  p: '#22140c',
  q: '#fff6ea',
  // sourcils, bouche
  b: '#3f2416',
  m: '#b5735c',
  M: '#8d4f3e',
  // tunique de lin beige
  t: '#c8b388',
  T: '#a8926a',
  Y: '#85704f',
  L: '#ddcca3',
  P: '#b6a179', // pièce rapiécée
  n: '#6c573c', // coutures, lacet
};

const S = 64;

interface Details {
  eye: Grid; // oeil gauche (à l'écran) ; l'oeil droit est son reflet
  brow: Grid;
  mouth: Grid;
}

const details: Details = {
  eye: [
    '.oooo.',
    'oiqpiw',
    'wiIIiw',
    '..ee..',
  ],
  brow: [
    '.bbbb.',
    'b.....',
  ],
  mouth: [
    'SmmmmS',
    '.llll.',
  ],
};

function draw(): Canvas {
  const c = new Canvas(S, S);
  const d = details;

  // --- Tunique ---
  c.polygon([[4, 64], [9, 55], [19, 49.5], [45, 49.5], [55, 55], [60, 64]], 't');
  c.within('t', (c) => {
    // ombre côté droit et sous les bras
    c.polygon([[46, 50], [55, 55], [60, 64], [48, 64], [44, 56]], 'T');
    c.polygon([[4, 64], [9, 55], [13, 53], [12, 64]], 'T');
    // lumière sur l'épaule gauche
    c.polygon([[10, 54], [19, 50], [24, 50], [16, 55]], 'L');
    // pièce rapiécée sur l'épaule droite
    c.rect(Math.round(47), Math.round(56), Math.round(6), Math.round(5), 'P');
  });
  // coutures de la pièce
  const px0 = Math.round(47), py0 = Math.round(56), pw = Math.round(6), ph = Math.round(5);
  for (let i = 0; i < pw; i += 2) { c.set(px0 + i, py0, 'n'); c.set(px0 + i, py0 + ph - 1, 'n'); }
  for (let j = 0; j < ph; j += 2) { c.set(px0, py0 + j, 'n'); c.set(px0 + pw - 1, py0 + j, 'n'); }
  // plis
  c.line(22, 56, 20, 64, 'T');
  c.line(41, 57, 43, 64, 'Y');

  // --- Cou ---
  c.rect(Math.round(27.5), Math.round(40), Math.round(9), Math.round(12), 's');
  c.within('s', (c) => {
    c.rect(Math.round(33.5), Math.round(40), Math.round(3), Math.round(12), 'S');
    c.rect(Math.round(27.5), Math.round(42), Math.round(9), Math.round(2.4), 'D');
  });
  // encolure ronde avec fente lacée
  c.ellipse(32, 50, 8, 3.2, 'S');
  c.within('S', (c) => c.ellipse(32, 49.4, 7, 2.4, 's'));
  c.polygon([[30.5, 50], [33.5, 50], [32.6, 58], [31.4, 58]], 'S');
  c.line(30, 52, 34, 55, 'n');
  c.line(34, 52, 30, 55, 'n');

  // --- Tête : le crâne rasé déborde du visage sur les côtés (tempes, derrière les oreilles) ---
  c.ellipse(32, 28.5, 16, 14.5, 'u');
  c.within('u', (c) => {
    c.ellipse(36, 30, 14, 14, 'U');
    c.ellipse(28, 27, 10, 10, 'u');
  });
  c.within('uU', (c) => {
    for (let y = 0; y < S; y += 2) for (let x = (y / 2) % 2; x < S; x += 2) c.set(x, y, c.get(x, y) === 'u' ? 'U' : 'u');
  });
  // oreilles
  c.ellipse(18.3, 34.3, 2.4, 3.7, 's');
  c.ellipse(45.7, 34.3, 2.4, 3.7, 'S');
  c.set(Math.round(18.5), Math.round(34.5), 'S');
  c.set(Math.round(45.5), Math.round(34.5), 'D');
  // visage : ovale, la mâchoire commence à se dessiner
  c.ellipse(32, 30.5, 12.4, 12.5, 's');
  c.polygon([[19.8, 30], [20.3, 35.5], [23.2, 40.2], [28.6, 44], [35.4, 44], [40.8, 40.2], [43.7, 35.5], [44.2, 30]], 's');
  c.within('s', (c) => {
    // ombre côté droit du visage et de la mâchoire
    c.polygon([[41.5, 27], [44.4, 30], [43.7, 35.5], [40.8, 40.2], [35.4, 44], [33.5, 44], [38.5, 40], [41.6, 34]], 'S');
    // pommette éclairée
    c.ellipse(24.4, 35.4, 1.7, 1, 'l');
    // ombre portée de la frange sur le front
    c.rect(0, Math.round(27), S, Math.max(1, Math.round(1.2)), 'S');
  });
  // dessous du menton
  c.line(29, 44.4, 35, 44.4, 'D');

  // --- Bol de cheveux ---
  const top = 9.5;
  const edge = 27;
  const bowl: [number, number][] = [];
  for (let a = 0; a <= 40; a++) {
    const t = Math.PI + (a / 40) * Math.PI;
    bowl.push([32 + Math.cos(t) * 17, edge + Math.sin(t) * (edge - top)]);
  }
  bowl.push([49, edge + 0.8], [15, edge + 0.8]);
  c.polygon(bowl, 'h');
  c.within('h', (c) => {
    // ombre à droite et sous le bord
    c.ellipse(47, 23, 5, 10, 'j');
    // anneau de reflet qui fait le tour du crâne
    c.ellipse(30, 19, 12, 7.5, 'H');
    c.ellipse(31, 20.6, 12.5, 7.2, 'h');
    c.ellipse(23.5, 14.8, 3.4, 1.3, 'G');
    // mèches de la frange
    for (let x = 17.5; x < 47; x += 3.5) c.line(x, edge - 4.5, (x + (x - 32) * 0.04), edge, 'j');
  });
  // pointes de mèches : bord net mais pas tiré à la règle
  const tipStep = Math.max(2, Math.round(3.5));
  for (let x = Math.round(16.5); x < Math.round(48); x += tipStep) {
    c.set(x, Math.round(edge + 0.8), 'h');
    c.set(x + 1, Math.round(edge + 0.8), 'j');
  }

  // --- Détails du visage ---
  const eyeY = Math.round(30.8);
  const eyeL = Math.round(26.2 - d.eye[0].length / 2);
  const eyeR = S - eyeL - d.eye[0].length;
  c.stamp(d.eye, eyeL, eyeY);
  c.stamp(flipX(d.eye), eyeR, eyeY);
  const browY = Math.round(29 - d.brow.length);
  c.stamp(d.brow, eyeL, browY);
  c.stamp(flipX(d.brow), eyeR, browY);
  // nez : arête ombrée côté droit, narines
  c.line(33.6, 35, 33.6, 37.2, 'S');
  c.line(31, 38.2, 33.8, 38.2, 'S');
  c.set(Math.round(30.6), Math.round(37.8), 'D');
  c.set(Math.round(33.8), Math.round(37.8), 'D');
  // bouche, neutre
  c.stamp(d.mouth, Math.round(32 - d.mouth[0].length / 2), Math.round(41));

  c.outline('o');
  return c;
}

const sheet: SpriteSheetSource = {
  kind: 'spritesheet',
  name: `portrait-xeros-${S}`,
  frameW: S,
  frameH: S,
  palette,
  animations: {
    neutral: { frames: [draw().toGrid()], frameRate: 1, repeat: 0 },
  },
};

export default [sheet];
