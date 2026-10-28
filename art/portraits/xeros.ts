// Portrait de dialogue de Xéros : buste de face.
// Dessiné en formes (coordonnées pensées sur 64 px, mises à l'échelle), avec les détails fins
// (yeux, sourcils, bouche) en grilles écrites à la main pour chaque taille.
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

interface Details {
  eye: Grid; // oeil gauche (à l'écran) ; l'oeil droit est son reflet
  brow: Grid;
  mouth: Grid;
}

const details: Record<number, Details> = {
  64: {
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
  },
  96: {
    eye: [
      '..oooooo.',
      '.ooooooo.',
      'owiqpiiw.',
      'wwiIIIiww',
      '..wiiiw..',
      '...eeee..',
    ],
    brow: [
      '..bbbbbb.',
      'bbbb.....',
    ],
    mouth: [
      'S.mmmmmm.S',
      '..llllll..',
    ],
  },
};

function draw(S: number): Canvas {
  const k = S / 64;
  const X = (v: number) => v * k;
  const pts = (list: [number, number][]) => list.map(([x, y]) => [X(x), X(y)] as [number, number]);
  const c = new Canvas(S, S);
  const d = details[S];

  // --- Tunique ---
  c.polygon(pts([[4, 64], [9, 55], [19, 49.5], [45, 49.5], [55, 55], [60, 64]]), 't');
  c.within('t', (c) => {
    // ombre côté droit et sous les bras
    c.polygon(pts([[46, 50], [55, 55], [60, 64], [48, 64], [44, 56]]), 'T');
    c.polygon(pts([[4, 64], [9, 55], [13, 53], [12, 64]]), 'T');
    // lumière sur l'épaule gauche
    c.polygon(pts([[10, 54], [19, 50], [24, 50], [16, 55]]), 'L');
    // pièce rapiécée sur l'épaule droite
    c.rect(Math.round(X(47)), Math.round(X(56)), Math.round(X(6)), Math.round(X(5)), 'P');
  });
  // coutures de la pièce
  const px0 = Math.round(X(47)), py0 = Math.round(X(56)), pw = Math.round(X(6)), ph = Math.round(X(5));
  for (let i = 0; i < pw; i += 2) { c.set(px0 + i, py0, 'n'); c.set(px0 + i, py0 + ph - 1, 'n'); }
  for (let j = 0; j < ph; j += 2) { c.set(px0, py0 + j, 'n'); c.set(px0 + pw - 1, py0 + j, 'n'); }
  // plis
  c.line(X(22), X(56), X(20), X(64), 'T');
  c.line(X(41), X(57), X(43), X(64), 'Y');

  // --- Cou ---
  c.rect(Math.round(X(27.5)), Math.round(X(40)), Math.round(X(9)), Math.round(X(12)), 's');
  c.within('s', (c) => {
    c.rect(Math.round(X(33.5)), Math.round(X(40)), Math.round(X(3)), Math.round(X(12)), 'S');
    c.rect(Math.round(X(27.5)), Math.round(X(42)), Math.round(X(9)), Math.round(X(2.4)), 'D');
  });
  // encolure ronde avec fente lacée
  c.ellipse(X(32), X(50), X(8), X(3.2), 'S');
  c.within('S', (c) => c.ellipse(X(32), X(49.4), X(7), X(2.4), 's'));
  c.polygon(pts([[30.5, 50], [33.5, 50], [32.6, 58], [31.4, 58]]), 'S');
  c.line(X(30), X(52), X(34), X(55), 'n');
  c.line(X(34), X(52), X(30), X(55), 'n');

  // --- Tête : le crâne rasé déborde du visage sur les côtés (tempes, derrière les oreilles) ---
  c.ellipse(X(32), X(28.5), X(16), X(14.5), 'u');
  c.within('u', (c) => {
    c.ellipse(X(36), X(30), X(14), X(14), 'U');
    c.ellipse(X(28), X(27), X(10), X(10), 'u');
  });
  c.within('uU', (c) => {
    for (let y = 0; y < S; y += 2) for (let x = (y / 2) % 2; x < S; x += 2) c.set(x, y, c.get(x, y) === 'u' ? 'U' : 'u');
  });
  // oreilles
  c.ellipse(X(18.3), X(34.3), X(2.4), X(3.7), 's');
  c.ellipse(X(45.7), X(34.3), X(2.4), X(3.7), 'S');
  c.set(Math.round(X(18.5)), Math.round(X(34.5)), 'S');
  c.set(Math.round(X(45.5)), Math.round(X(34.5)), 'D');
  // visage : ovale, la mâchoire commence à se dessiner
  c.ellipse(X(32), X(30.5), X(12.4), X(12.5), 's');
  c.polygon(pts([[19.8, 30], [20.3, 35.5], [23.2, 40.2], [28.6, 44], [35.4, 44], [40.8, 40.2], [43.7, 35.5], [44.2, 30]]), 's');
  c.within('s', (c) => {
    // ombre côté droit du visage et de la mâchoire
    c.polygon(pts([[41.5, 27], [44.4, 30], [43.7, 35.5], [40.8, 40.2], [35.4, 44], [33.5, 44], [38.5, 40], [41.6, 34]]), 'S');
    // pommette éclairée
    c.ellipse(X(24.4), X(35.4), X(1.7), X(1), 'l');
    // ombre portée de la frange sur le front
    c.rect(0, Math.round(X(27)), S, Math.max(1, Math.round(X(1.2))), 'S');
  });
  // dessous du menton
  c.line(X(29), X(44.4), X(35), X(44.4), 'D');

  // --- Bol de cheveux ---
  const top = 9.5;
  const edge = 27;
  const bowl: [number, number][] = [];
  for (let a = 0; a <= 40; a++) {
    const t = Math.PI + (a / 40) * Math.PI;
    bowl.push([32 + Math.cos(t) * 17, edge + Math.sin(t) * (edge - top)]);
  }
  bowl.push([49, edge + 0.8], [15, edge + 0.8]);
  c.polygon(pts(bowl), 'h');
  c.within('h', (c) => {
    // ombre à droite et sous le bord
    c.ellipse(X(47), X(23), X(5), X(10), 'j');
    // anneau de reflet qui fait le tour du crâne
    c.ellipse(X(30), X(19), X(12), X(7.5), 'H');
    c.ellipse(X(31), X(20.6), X(12.5), X(7.2), 'h');
    c.ellipse(X(23.5), X(14.8), X(3.4), X(1.3), 'G');
    // mèches de la frange
    for (let x = 17.5; x < 47; x += 3.5) c.line(X(x), X(edge - 4.5), X(x + (x - 32) * 0.04), X(edge), 'j');
  });
  // pointes de mèches : bord net mais pas tiré à la règle
  const tipStep = Math.max(2, Math.round(X(3.5)));
  for (let x = Math.round(X(16.5)); x < Math.round(X(48)); x += tipStep) {
    c.set(x, Math.round(X(edge + 0.8)), 'h');
    c.set(x + 1, Math.round(X(edge + 0.8)), 'j');
  }

  // --- Détails du visage ---
  const eyeY = Math.round(X(30.8));
  const eyeL = Math.round(X(26.2) - d.eye[0].length / 2);
  const eyeR = S - eyeL - d.eye[0].length;
  c.stamp(d.eye, eyeL, eyeY);
  c.stamp(flipX(d.eye), eyeR, eyeY);
  const browY = Math.round(X(29) - d.brow.length);
  c.stamp(d.brow, eyeL, browY);
  c.stamp(flipX(d.brow), eyeR, browY);
  // nez : arête ombrée côté droit, narines
  c.line(X(33.6), X(35), X(33.6), X(37.2), 'S');
  c.line(X(31), X(38.2), X(33.8), X(38.2), 'S');
  c.set(Math.round(X(30.6)), Math.round(X(37.8)), 'D');
  c.set(Math.round(X(33.8)), Math.round(X(37.8)), 'D');
  // bouche, neutre
  c.stamp(d.mouth, Math.round(X(32) - d.mouth[0].length / 2), Math.round(X(41)));

  c.outline('o');
  return c;
}

const sheet = (S: number): SpriteSheetSource => ({
  kind: 'spritesheet',
  name: `portrait-xeros-${S}`,
  frameW: S,
  frameH: S,
  palette,
  animations: {
    neutral: { frames: [draw(S).toGrid()], frameRate: 1, repeat: 0 },
  },
});

export default [sheet(64), sheet(96)];
