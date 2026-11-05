// PROPOSITION (hors jeu) : les pièces nouvelles des quarts nord de la place (CADRAGE-village.md, sections 13.2, 13.3, 13.4, 13.8 et
// 13.9). Chacune est un petit modèle en volumes (art/lib/volumes.ts), rendu dans ses vues comme le jeu les tire (r0 à r3, un quart de
// tour de plus dans le sens des aiguilles d'une montre : le même modèle tourné, jamais une rotation de pixels), à 5 cm par pixel :
// les meubles et objets en (x, y/2 − z) avec leur ombre portée, les pièces de bâtiment (`ground` : l'auvent, le volet, le pan) en
// (x, y − z). Le bois travaillé se dessine avec les signes du bois patiné (`^ * % & @`) ou vieux (`{ } [ ] |`) ; les couleurs
// nouvelles (toile, miel, cire, fromage, papier, peinture, rouille) sont dans `C` de place-nord-lib.ts.
//
// L'enseigne (`hanging-sign`) est la seule pièce de toutes les enseignes de la place (13.9) : une potence de fer forgé, un panneau
// de bois peint pendu dessous, un motif par métier, en tirages (`hanging-sign-s<k>`, comme les `variants` du jeu) : s0 le pot de miel
// et le coq (la ferme du riche), s1 la hache et la bûche (le bûcheron), s2 l'aiguille et le fil (la mercière), s3 les ciseaux (la
// tailleuse), s4 le sac (son mari, le frère du forgeron). Le panneau pend dans le plan est-ouest : vue du sud, on le lit en vraie
// grandeur (CADRAGE 8.1 : un panneau tourné vers l'est ou l'ouest ne se verrait pas) ; la potence se fixe donc sur une face tournée
// vers l'est (R0, le bras vers l'est) ou vers l'ouest (R2, le bras vers l'ouest), un pignon, un poteau d'angle.

import type { Grid } from '../lib/canvas';
import type { PlaceBuildingId, VillagePiece } from './place-types';
import { box, dash, hash, part, rotQuads, timber, type Quad, type Rot, type Tex, type V3 } from '../lib/volumes';
import { foreign, gableRoof, shinglesTex, type HouseSpec } from './village-maisons-bois-lib';
import { furnWood } from './village-maisons-pierre-matieres';
import { C, XPAL, agedTex, bar, litOf, pieceImg, upright, type Age, type Img } from './place-nord-lib';

// =====================================================================================================================
// Outils
// =====================================================================================================================

const VIEW_ROT: Rot[] = [0, 3, 2, 1];
const WP = (name: string, prio = 5, dark = '&') => part(name, prio, dark, 'full');
const W = (seed: number, age: Age = 'worn') => agedTex(furnWood(seed), age);
const IRON = (name: string, prio = 6, rust = false) => part(name, prio, rust ? C.rust : C.ironDeep, 'full');
/** Le fer forgé : le dessus et l'ouest au jour, le reste sombre ; rouillé, des plaques de rouille. */
const ironTex = (rust = false): Tex => (_s, t, c) => {
  const lit = c.face === 'top' || c.face === 'cap' || c.face === 'W' || (c.face === 'edge' && (c.n[2] > 0.5 || c.n[0] < -0.5));
  if (rust && hash(91, Math.floor(c.p[0] * 2), Math.floor(c.p[2] * 2)) < 0.45) return lit ? C.rustLight : C.rust;
  return lit ? C.ironLight : c.face === 'S' && t > c.h * 0.5 ? C.iron : C.ironShade;
};
/** La paille, l'osier des claies (le clayonnage du jeu : A B Q). */
const wickerTex: Tex = (s, t, c) => {
  const i = Math.floor(s), j = Math.floor(t);
  if (c.face !== 'top') return 'Q';
  return (i + j) % 2 === 0 ? 'A' : hash(7, i, j) < 0.4 ? 'Q' : 'B';
};
/** Une couleur selon la lumière d'une face (cylindre, boîte) : clair, moyen, ombre. */
const shade3 = (light: string, mid: string, dark: string): Tex => (_s, t, c) => {
  if (c.face === 'top' || c.face === 'cap') return light;
  if (c.face === 'W') return light;
  if (c.face === 'E' || c.face === 'N' || c.face === 'under') return dark;
  if (c.face === 'edge') return [light, mid, dark][litOf(c.n)];
  return t > c.h * 0.6 ? mid : mid;
};

/** Les petits produits posés (miel, fromage, cire, épices), en volumes pour les meubles qui les portent. */
function honeyPot(x: number, y: number, z: number, r = 1.1, h = 2.6): Quad[] {
  const P = part('pot', 4.5, C.stonewareShade, 'full');
  const body: Tex = (_s, t, c) => {
    if (t > h - 0.9) return c.face === 'edge' ? (litOf(c.n) === 2 ? C.paperShade : C.paper) : C.paper; // le linge noué
    return [C.honeyLight, C.honey, C.honeyShade][litOf(c.n)];
  };
  return upright(x, y, r, z, z + h, P, body, () => C.paper, 8);
}
function cheese(x: number, y: number, z: number, r = 1.6, h = 1.3): Quad[] {
  const P = part('fromage', 4.5, C.rindShade, 'full');
  return upright(x, y, r, z, z + h, P, (_s, _t, c) => [C.rindLight, C.rind, C.rindShade][litOf(c.n)], (s, t) => (Math.hypot(s - r, t - r) < r - 0.7 ? C.rindLight : C.rind), 10);
}
function waxCake(x: number, y: number, z: number): Quad[] {
  return box(x, x + 2.4, y, y + 1.6, z, z + 1.1, part('cire', 4.5, C.waxShade, 'full'), shade3(C.waxLight, C.wax, C.waxShade));
}
function spiceBox(x: number, y: number, z: number, lid: string = C.redOchre): Quad[] {
  return [
    ...box(x, x + 2.4, y, y + 1.6, z, z + 1, part('boîte', 4.5, '&', 'full'), (_s, _t, c) => (c.face === 'top' ? '^' : c.face === 'S' ? '*' : '%')),
    ...box(x - 0.1, x + 2.5, y - 0.1, y + 1.7, z + 1, z + 1.5, part('couvercle', 4.6, C.ochreShade, 'full'), (_s, _t, c) => (c.face === 'top' ? lid : C.ochreShade)),
  ];
}

// =====================================================================================================================
// 13.2 La ferme du riche
// =====================================================================================================================

/**
 * Le comptoir de chêne sculpté (240 × 70 × 95) : le plateau mouluré, la frise de rinceaux sous lui, quatre panneaux à plis de
 * serviette entre des montants, la plinthe. Les sculptures sont au sud (le côté des clients) ; le dos (nord) : les rayons du marchand.
 */
const luxuryCounter = (): Quad[] => {
  const Q: Quad[] = [];
  const front: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), w = Math.round(c.w), h = Math.round(c.h);
    if (c.face === 'top') return dash(301, j, i, 0.3) ? '*' : '^';
    if (c.face !== 'S') return c.face === 'W' ? '*' : '%';
    // la frise sous le plateau (2 px) : les rinceaux, un creux tous les 3 px
    if (j >= h - 2) return (i + (j === h - 1 ? 0 : 1)) % 3 === 0 ? '&' : j === h - 1 ? '^' : '*';
    // les montants (2 px) : tous les 11 px, le clair à gauche
    const stile = [0, 11, 22, 33, w - 2];
    for (const x of stile) if (i === x) return '^';
    for (const x of stile) if (i === x + 1) return '%';
    if (j === h - 3) return '&'; // l'ombre de la frise
    if (j === 0) return '@'; // le pied du panneau
    // le panneau à plis de serviette : des plis debout, le clair, le creux ; arrondis en haut et en bas
    const k = (i - 2) % 11;
    const fold = k % 3;
    if (j === 1 || j === h - 4) return fold === 1 ? '*' : '%';
    return fold === 0 ? '^' : fold === 1 ? '*' : '&';
  };
  Q.push(...box(1, 47, 1, 13, 1.5, 17, WP('caisse', 4), front));
  Q.push(...box(0.5, 47.5, 0.5, 13.5, 0, 1.5, WP('plinthe', 4.2, '@'), (_s, _t, c) => (c.face === 'top' ? '*' : c.face === 'S' ? '&' : '@')));
  Q.push(...box(0, 48, 0, 14, 17, 19, WP('plateau', 5), (s, t, c) => {
    if (c.face === 'top') return dash(302, Math.floor(t), Math.floor(s), 0.35) ? '*' : '^';
    return Math.floor(t) === 1 ? '^' : '%';
  }));
  return Q;
};

/**
 * Le présentoir à gradins (160 × 70 × 110) : trois gradins de planches sous une nappe de lin, chargés à ras bord (14.3 : des tas
 * plutôt que l'unité) : en bas une rangée de meules entamées, au milieu les pots de miel serrés deux par deux et les pains de cire
 * en pile, en haut les boîtes d'épices et deux pots de confiture.
 */
const tieredDisplay = (): Quad[] => {
  const Q: Quad[] = [];
  const cloth: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return hash(311, i, j) < 0.15 ? '+' : '!';
    if (c.face === 'S') return j === Math.round(c.h) - 1 ? '+' : (i % 5 === 2 ? ';' : '=');
    return c.face === 'W' ? '+' : '=';
  };
  const N = part('nappe', 3, '=', 'full');
  const steps: [number, number, number][] = [[9, 14, 8], [4.5, 9, 14], [0, 4.5, 20]];
  for (const [y0, y1, z] of steps) Q.push(...box(0, 32, y0, y1, 0, z, N, cloth));
  for (let k = 0; k < 6; k++) Q.push(...cheese(3 + k * 5.2, 11.5, 8, 2.4, 1.8));
  for (let k = 0; k < 4; k++) Q.push(...cheese(5.6 + k * 6.6, 11.5, 9.8, 2.1, 1.4));
  for (let k = 0; k < 7; k++) Q.push(...(k % 3 === 2 ? waxCake(2.4 + k * 4.2, 5.6, 14).concat(waxCake(2.6 + k * 4.2, 5.6, 15.1)) : honeyPot(3.6 + k * 4.2, 6.8, 14, 1.5, 3)));
  for (let k = 0; k < 6; k++) Q.push(...(k === 2 || k === 4 ? honeyPot(4 + k * 4.8, 2.4, 20, 1.3, 2.6) : spiceBox(2.6 + k * 4.8, 1.2, 20, k % 2 ? C.redOchre : C.ochre)));
  return Q;
};

/** Les étagères de boutique (200 × 40 × 180) : trois montants, le dos de planches, cinq rayons chargés. */
const shopShelves = (): Quad[] => {
  const Q: Quad[] = [];
  Q.push(...box(0, 40, 0, 1, 0, 35, WP('dos', 2), (s, t, c) => (c.face === 'S' ? (Math.floor(s) % 6 === 0 ? '&' : dash(321, Math.floor(s), Math.floor(t), 0.4) ? '&' : '%') : '%')));
  for (const x of [0, 19, 38]) Q.push(...box(x, x + 2, 0, 8, 0, 36, WP('montant', 5), W(322 + x)));
  for (const z of [1, 9, 17, 25, 33]) Q.push(...box(0, 40, 1, 8, z, z + 1, WP('rayon', 4), W(330 + z)));
  // ce qui est sur les rayons : en bas les jarres d'huile et de miel, puis fromages, pots, cire, épices
  const goods = (z: number, row: number) => {
    for (let x = 2.6; x < 38; ) {
      if (Math.abs(x - 20) < 1.6) { x += 2; continue; }
      const r = hash(341, row, Math.floor(x));
      if (row === 0) { Q.push(...honeyPot(x + 1.6, 4.5, z, 1.6, 4.2)); x += 4.2; }
      else if (row === 1) { Q.push(...cheese(x + 1.6, 4.5, z, 1.6, 1.4), ...cheese(x + 1.6, 4.5, z + 1.4, 1.4, 1.3)); x += 3.8; }
      else if (row === 2) { Q.push(...honeyPot(x + 1.1, 4.5, z)); x += 3; }
      else if (row === 3) { Q.push(...(r < 0.5 ? waxCake(x, 3.8, z) : waxCake(x, 3.8, z).concat(waxCake(x + 0.2, 3.8, z + 1.1)))); x += 3.2; }
      else { Q.push(...spiceBox(x, 3.8, z, r < 0.5 ? C.redOchre : C.ochre)); x += 3.1; }
    }
  };
  [2, 10, 18, 26, 34].forEach((z, row) => { if (row < 4) goods(z, row); });
  return Q;
};

/** La claie à fromages (120 × 50 × 160) : quatre montants, cinq claies d'osier, les fromages qui s'affinent. */
const cheeseRack = (): Quad[] => {
  const Q: Quad[] = [];
  for (const [x, y] of [[0, 0], [22.5, 0], [0, 8.5], [22.5, 8.5]]) Q.push(...box(x, x + 1.5, y, y + 1.5, 0, 32, WP('montant', 5), W(351 + x + y)));
  [3, 9, 15, 21, 27].forEach((z, k) => {
    Q.push(...box(1.5, 22.5, 0.5, 9.5, z, z + 0.8, part('claie', 4, 'Q', 'full'), wickerTex));
    for (let n = 0; n < 4; n++) Q.push(...cheese(4.2 + n * 5.2, 5, z + 0.8, 2.1, k === 4 && n === 3 ? 0.9 : 1.6));
  });
  return Q;
};

/** Le pot de miel (Ø 20, 25 cm) : le grès vernissé, le miel qui a coulé, le linge noué d'une ficelle rouge. */
const honeyPotPiece = (): Quad[] => {
  const P = part('pot', 4.5, C.stonewareShade, 'full');
  const body: Tex = (_s, t, c) => {
    if (t > 3.8) return litOf(c.n) === 2 ? C.paperShade : C.paper;
    if (t > 3.3) return C.madder;
    const l = litOf(c.n);
    return t > 2.2 && l < 2 ? C.honey : [C.stonewareLight, C.stoneware, C.stonewareShade][l];
  };
  return upright(2, 2, 2, 0, 4.8, P, body, (s, t) => (Math.hypot(s - 2, t - 2) < 1.1 ? C.paperShade : C.paper), 10);
};
/** Le pain de cire (25 × 15 × 10). */
const waxCakePiece = (): Quad[] => box(0, 5, 0, 3, 0, 2, part('cire', 4.5, C.waxShade, 'full'), (s, t, c) => {
  if (c.face === 'top') return Math.floor(s) === 0 || Math.floor(t) === 0 ? C.waxLight : hash(361, Math.floor(s), Math.floor(t)) < 0.2 ? C.wax : C.waxLight;
  return c.face === 'S' ? C.wax : C.waxShade;
});
/** La boîte d'épices (25 × 15 × 12) : le bois, le couvercle peint. */
const spiceBoxPiece = (): Quad[] => [
  ...box(0, 5, 0, 3, 0, 1.7, part('boîte', 4.5, '&', 'full'), (_s, _t, c) => (c.face === 'S' ? '*' : c.face === 'W' ? '^' : '%')),
  ...box(-0.01, 5.01, -0.01, 3.01, 1.7, 2.4, part('couvercle', 4.6, C.madderDeep, 'full'), (_s, t, c) => (c.face === 'top' ? C.redOchre : t > 0.4 ? C.madder : C.madderShade)),
];

/**
 * L'auvent de toile rayée (480 × 300 × 260) : quatre poteaux tournés, deux traverses, la toile rayée guède et garance qui descend
 * vers le sud, le lambrequin festonné devant. Pièce de bâtiment (ses poteaux posés au sol à leur place : la profondeur entière).
 */
export const AWNING = { w: 128, d: 60, back: 56, front: 48, valance: 5 };
const turnedPost = (x: number, y: number, h: number, seed: number): Quad[] => {
  const Q: Quad[] = [], P = WP('poteau tourné', 5, '&');
  const wood: Tex = (_s, t, c) => {
    const l = litOf(c.n);
    return dash(seed, l, Math.floor(t), 0.3) ? ['*', '%', '&'][l] : ['^', '*', '%'][l];
  };
  const top: Tex = () => '^';
  // le profil : la base carrée, le fût, deux bagues, le chapiteau
  Q.push(...box(x - 2, x + 2, y - 2, y + 2, 0, 3, P, (_s, _t, c) => (c.face === 'top' ? '^' : c.face === 'S' ? '*' : c.face === 'W' ? '^' : '%')));
  const prof: [number, number, number][] = [[3, 9, 1.35], [9, 10.5, 1.9], [10.5, h - 14, 1.3], [h - 14, h - 12.5, 1.9], [h - 12.5, h - 3, 1.35], [h - 3, h, 2]];
  for (const [z0, z1, r] of prof) Q.push(...upright(x, y, r, z0, z1, P, wood, top, 10));
  return Q;
};
const stripes = (light: boolean): Tex => (s, t, c) => {
  const i = Math.floor(s), band = Math.floor(i / 4) % 2;
  const edge = i % 4 === 3;
  const [a, b] = band ? [C.madderLight, C.madder] : [C.woadLight, C.woad];
  const [sa, sb] = band ? [C.madder, C.madderShade] : [C.woad, C.woadShade];
  if (!light) return edge ? sb : sa;
  // la toile : la trame en tirets, le bord de chaque lé un peu plus sombre, le creux le long des traverses
  if (Math.abs(c.p[1] - 1.5) < 1.2 || Math.abs(c.p[1] - (AWNING.d - 1.5)) < 1) return edge ? sb : sa;
  if (edge) return b;
  return dash(371 + band, i, Math.floor(t), 0.25) ? b : a;
};
const stripedAwning = (): Quad[] => {
  const Q: Quad[] = [], { w, d, back, front, valance } = AWNING;
  // six poteaux tournés : les quatre coins et le milieu de chaque traverse (6,40 m de portée)
  for (const [x, y] of [[2, 2], [w / 2, 2], [w - 2, 2], [2, d - 2], [w / 2, d - 2], [w - 2, d - 2]]) Q.push(...turnedPost(x, y, (y < 10 ? back : front) - 1.5, 381 + x + y));
  // les traverses et les longerons, sous la toile
  const T = WP('traverse', 6, '&');
  Q.push(...box(0, w, 1, 3, back - 3.5, back - 1.5, T, timber(391)));
  Q.push(...box(0, w, d - 3, d - 1, front - 3.5, front - 1.5, T, timber(392)));
  // la toile, de la traverse du fond à celle de devant, un peu au-delà
  const zb = back - 1, zf = front - 1.2;
  const slope: V3 = [0, -(d + 1), zb - zf];
  Q.push({ o: [-1, d + 0.5, zf], u: [w + 2, 0, 0], v: slope, n: [0, 0.16, 0.99], part: part('toile', 9, C.woadDeep, 'full', { roof: true }), tex: stripes(true), face: 'slope' });
  // le lambrequin festonné devant : des dents arrondies de 4 px, le bord ourlé
  const fest: Tex = (s, t, c) => {
    const k = s % 4, depth = 1.6 * Math.sin((Math.PI * k) / 4);
    if (t < valance - 2 - depth) return null;
    return Math.floor(t) === Math.round(c.h) - 1 ? stripes(true)(s, t, c) : stripes(false)(s, t, c);
  };
  Q.push({ o: [-1, d + 0.6, zf - valance + 0.2], u: [w + 2, 0, 0], v: [0, 0, valance], n: [0, 1, 0], part: part('lambrequin', 9.5, C.woadDeep, 'full', { roof: true }), tex: fest, face: 'S' });
  return Q;
};

// =====================================================================================================================
// 14.3 Les marchandises en tas (lisibles à la taille du jeu : des pyramides et des piles, pas l'unité)
// =====================================================================================================================

/** Les pots de miel en pyramide (100 × 30 × 100) : quatre rangs de pots de grès vernissé (Ø 25 cm), une planchette entre chaque rang. */
const honeyPyramid = (): Quad[] => {
  const Q: Quad[] = [];
  const PL = WP('planchette', 4);
  for (let k = 0; k < 4; k++) {
    const n = 4 - k, z = k * 5, w = n * 5;
    Q.push(...box(10 - w / 2, 10 + w / 2, 0.5, 5.5, z, z + 0.7, PL, W(601 + k)));
    for (let i = 0; i < n; i++) Q.push(...honeyPot(10 + (i - (n - 1) / 2) * 5, 3, z + 0.7, 2.3, 4.1));
  }
  return Q;
};
/** La pile de meules (Ø 50 cm, 60 de haut) : cinq meules affinées, un peu décalées l'une sur l'autre, la croûte lavée. */
const cheeseStack = (): Quad[] => {
  const Q: Quad[] = [];
  const off = [0, 0.4, -0.3, 0.3, -0.2];
  for (let k = 0; k < 5; k++) Q.push(...cheese(5 + off[k], 5 + off[(k + 2) % 5], k * 2.4, 4.8 - (k === 4 ? 0.4 : 0), 2.3));
  return Q;
};
/** Les pains de cire en pile (50 × 30 × 40) : des pains de 25 × 15 × 10, quatre lits croisés, le dernier de deux pains. */
const waxStack = (): Quad[] => {
  const Q: Quad[] = [];
  const P = part('cire', 4.5, C.waxShade, 'full');
  const tex: Tex = (s, t, c) => {
    if (c.face === 'top') return Math.floor(s) === 0 || Math.floor(t) === 0 ? C.waxLight : hash(361, Math.floor(s), Math.floor(t)) < 0.2 ? C.wax : C.waxLight;
    return c.face === 'S' ? (Math.floor(t) === 1 ? C.wax : C.waxShade) : c.face === 'W' ? C.wax : C.waxShade;
  };
  for (let k = 0; k < 4; k++) {
    const z = k * 2, top = k === 3;
    for (const [x0, y0] of (top ? [[0.4, 1.6], [5.2, 1.6]] : [[0, 0], [5, 0], [0, 3], [5, 3]]) as [number, number][]) Q.push(...box(x0 + (k % 2) * 0.3, x0 + 4.8 + (k % 2) * 0.3, y0, y0 + 2.8, z, z + 1.9, P, tex));
  }
  return Q;
};
/** Une botte de cierges (30 × 10 × 50) pendue par les mèches : six cierges de cire jaune, la ficelle. */
const candleBunch = (): Quad[] => {
  const Q: Quad[] = [];
  Q.push(...box(1, 5, 0.8, 1.6, 9, 10, part('ficelle', 6, '#7c6a4f', 'thin'), () => '#b49a6c'));
  const lens = [7.6, 8.4, 7.2, 8.8, 7.8, 8.2];
  lens.forEach((l, i) => Q.push(...box(0.2 + i, 1.1 + i, 0.6 + (i % 2) * 0.6, 1.5 + (i % 2) * 0.6, 9 - l, 9, part('cierge', 5 + i * 0.01, C.waxShade, 'full'), (_s, t, c) => (c.face === 'W' || c.face === 'top' ? C.waxLight : c.face === 'S' ? (Math.floor(t) % 4 === 0 ? C.wax : C.waxLight) : C.wax))));
  return Q;
};
/**
 * Le comptoir sculpté chargé (pas une pièce : une mise en place, le comptoir et ce qui est posé dessus) : les pots de miel serrés en
 * deux rangs, deux piles de meules, la pyramide de pains de cire, les boîtes d'épices.
 */
export function ladenCounterModel(): Quad[] {
  const Q = luxuryCounter(), z = 19;
  for (let i = 0; i < 4; i++) Q.push(...honeyPot(3 + i * 3.6, 4, z, 1.7, 3.2));
  for (let i = 0; i < 3; i++) Q.push(...honeyPot(4.8 + i * 3.6, 9.5, z, 1.7, 3.2));
  for (const [x, n] of [[21, 3], [28.5, 2]] as const) for (let k = 0; k < n; k++) Q.push(...cheese(x, 7, z + k * 1.9, 3.4, 1.8));
  for (let k = 0; k < 3; k++) for (let i = 0; i < 3 - k; i++) Q.push(...waxCake(34 + i * 2.6 + k * 1.3, 4 + k * 0.4, z + k * 1.1));
  for (let i = 0; i < 3; i++) Q.push(...spiceBox(35 + i * 3.4, 9.6, z, i % 2 ? C.redOchre : C.ochre));
  return Q;
}

// =====================================================================================================================
// 14.1 La vie autour des maisons : les pots de fleurs, le linge, l'échelle
// =====================================================================================================================

/** La jardinière de terre cuite (60 × 20 × 30) posée sur un appui d'étage : géraniums de garance, soucis, giroflées blanches. */
const flowerBox = (): Quad[] => {
  const Q: Quad[] = [];
  Q.push(...box(0, 12, 0, 4, 0, 3, part('jardinière', 4, C.terraDeep, 'full'), (_s, t, c) => {
    if (c.face === 'top') return C.terraLight;
    if (c.face === 'W') return C.terraLight;
    if (c.face === 'S') return Math.floor(t) === 2 ? C.terraLight : C.terra;
    return C.terraShade;
  }));
  // les feuilles en trois touffes, les fleurs dessus (un pixel voulu par fleur)
  const leaf = part('feuilles', 5, 'k', 'full');
  for (const [x0, x1, h] of [[0.4, 4.4, 3.2], [4, 8.4, 3.8], [8, 11.6, 2.9]] as const) Q.push(...box(x0, x1, 0.6, 3.4, 3, 3 + h, leaf, (s, t, c) => {
    if (c.face === 'top') return hash(611, Math.floor(s), Math.floor(t)) < 0.5 ? 'L' : 'l';
    return c.face === 'W' ? 'l' : Math.floor(t) > c.h - 2 ? 'l' : 'k';
  }));
  const fl = part('fleur', 6, C.madderDeep, 'none');
  const heads: [number, number, number, string][] = [[1, 1.4, 6.5, C.madderLight], [3, 2.2, 6.4, C.madder], [5.2, 1.2, 7.2, C.paper], [7, 2.4, 7.1, C.honeyLight], [9, 1.4, 6.2, C.madderLight], [10.6, 2.2, 6.1, C.paper], [2.2, 3, 5.6, C.honeyLight], [6, 3, 6.2, C.madder]];
  for (const [x, y, z, col] of heads) Q.push(...box(x, x + 1, y, y + 1, z - 1, z, fl, () => col));
  return Q;
};
/**
 * Le linge à la fenêtre (120 × 10 × 60) : une perche passée dans le chambranle, une chemise de lin, un chaperon de guède, un drap
 * plié en deux ; pend en hauteur (pas d'ombre au sol).
 */
const windowLaundry = (): Quad[] => {
  const Q: Quad[] = [];
  Q.push(...box(0, 24, 0.5, 1.5, 11, 12, WP('perche', 6), W(621)));
  const cloth = (x0: number, x1: number, z0: number, col: [string, string, string], seed: number, shirt = false): void => {
    const tex: Tex = (s, t, c) => {
      const i = Math.floor(s), j = Math.floor(t), h = Math.round(c.h);
      if (c.face !== 'S') return col[2];
      if (shirt && j < h - 3 && (i === 0 || i === Math.round(c.w) - 1) && j < h - 6) return null; // les manches pendent, le corps s'arrête
      if (j === h - 1) return col[1];
      return (i + seed) % 3 === 0 ? col[1] : dash(seed, i, j, 0.25) ? col[1] : col[0];
    };
    Q.push(...box(x0, x1, 1.6, 2.2, z0, 11, part('linge', 5 + seed * 0.01, col[2], 'full'), tex));
  };
  cloth(1, 8, 3, [C.paper, C.paperShade, '#9f9479'], 631, true);
  cloth(9, 14, 5, [C.woadLight, C.woad, C.woadShade], 632);
  cloth(15, 23, 1, [C.paper, C.paperShade, '#9f9479'], 633);
  return Q;
};
// =====================================================================================================================
// 14.3 Le bûcheron : les outils du bois, les bottes de bardeaux
// =====================================================================================================================

/**
 * Le râtelier d'outils du bois (200 × 30 × 160), sous l'avant-toit : deux montants, la planche du fond, les chevilles ; deux cognées
 * et une hache pendues tête en haut, le passe-partout (150 cm) en travers, la scie à cadre, une tablette basse avec les coins de
 * fer et deux maillets.
 */
const toolRack = (): Quad[] => {
  const Q: Quad[] = [];
  for (const x of [0.5, 37.5]) Q.push(...box(x, x + 2, 0, 2, 0, 32, WP('montant', 5), W(661 + x)));
  Q.push(...box(2.5, 37.5, 0, 1, 7, 31, WP('fond', 2), (s, t, c) => (c.face === 'S' ? (Math.floor(s) % 6 === 0 ? '&' : dash(662, Math.floor(s), Math.floor(t), 0.4) ? '&' : '%') : '%')));
  Q.push(...box(0, 40, 0, 6, 5, 6, WP('tablette', 4), W(663)));
  const I = IRON('fer', 7), it = ironTex();
  const H = WP('manche', 6.5, '&');
  const handle: Tex = (_s, _t, c) => (c.face === 'W' || c.face === 'top' ? '^' : c.face === 'S' ? '*' : '%');
  // les cognées et la hache : manche de 90 cm, tête de fer en haut, le tranchant vers l'est (la hache, plus petite, vers l'ouest)
  for (const [x, z1, blade, big] of [[4.5, 29, 1, true], [9, 29, 1, true], [34, 27, -1, false]] as const) {
    Q.push(...box(x, x + 1, 1.2, 2.2, z1 - 17, z1, H, handle));
    const w = big ? 3.2 : 2.4, hh = big ? 2.6 : 2;
    if (blade > 0) Q.push(...box(x - 0.6, x + w, 1, 2.4, z1 - hh, z1 + 0.4, I, it), ...box(x + w - 0.6, x + w + 0.4, 1, 2.4, z1 - hh - 0.8, z1 + 1, I, it));
    else Q.push(...box(x + 1.6 - w, x + 1.6, 1, 2.4, z1 - hh, z1 + 0.4, I, it), ...box(x + 1.6 - w - 0.4, x + 1.6 - w + 0.6, 1, 2.4, z1 - hh - 0.8, z1 + 1, I, it));
  }
  // le passe-partout : la lame de 150 cm, les dents en bas, une poignée de bois à chaque bout
  const teeth: Tex = (s, t, c) => {
    if (c.face !== 'S') return C.ironShade;
    const i = Math.floor(s), j = Math.floor(t);
    if (j === 0) return i % 2 ? C.ironShade : null;
    return j === Math.round(c.h) - 1 ? C.ironLight : C.iron;
  };
  Q.push(...box(13, 31, 1.4, 1.8, 21, 23.6, part('lame', 7.2, C.ironDeep, 'full'), teeth));
  for (const x of [12, 31]) Q.push(...box(x, x + 1, 1.2, 2.2, 20, 25.5, H, handle));
  // la scie à cadre : deux bras, la traverse, la lame en bas, la corde tordue en haut
  for (const x of [14, 29]) Q.push(...box(x, x + 1, 1.2, 2.2, 8, 18.5, H, handle));
  Q.push(...box(15, 29, 1.3, 2.1, 13, 14, H, handle));
  Q.push(...box(14.5, 29.5, 1.5, 1.9, 8.6, 9.8, part('lame', 7.2, C.ironDeep, 'full'), teeth));
  Q.push(...box(15, 29, 1.5, 1.9, 17.4, 18, part('corde', 7, '#7c6a4f', 'thin'), () => '#b49a6c'));
  // la tablette : les coins de fer, deux maillets couchés
  for (let k = 0; k < 4; k++) Q.push(...box(3 + k * 2.4, 4.6 + k * 2.4, 2, 4.4, 6, 7.4, I, it));
  for (const x of [17, 26]) {
    Q.push(...box(x, x + 3, 1.6, 4.4, 6, 8.2, WP('maillet', 6.6, 'K'), (_s, _t, c) => (c.face === 'top' ? 'M' : c.face === 'W' ? 'm' : c.face === 'S' ? '*' : 'N')));
    Q.push(...box(x + 3, x + 7, 2.6, 3.4, 6, 6.8, H, handle));
  }
  return Q;
};
/** La botte de bardeaux (50 × 25 × 30) : les bardeaux de chêne fendus, couchés en paquet, liés de deux harts d'osier. */
const shingleBundle = (): Quad[] => [
  ...box(0, 10, 0, 5, 0, 6, WP('bardeaux', 5), (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (i === 2 || i === 7) return c.face === 'W' || c.face === 'E' ? '%' : 'Q';
    if (c.face === 'top') return dash(671, j, i, 0.4) ? '*' : '^';
    if (c.face === 'S') return j % 2 ? '*' : '%';
    if (c.face === 'W') return j % 2 ? '^' : '*';
    return '&';
  }),
];

// =====================================================================================================================
// L'enseigne (13.9) : la potence de fer forgé, le panneau peint, les motifs
// =====================================================================================================================

/** Un motif d'enseigne : 14 × 10 px peints dans un cadre d'un pixel (le panneau fait 16 × 12, 80 × 60 cm) ; '.' : le fond. */
interface Motif { key: string; name: string; ground: string; frame: string; rows: string[]; colors: Record<string, string> }
const INK = '#3a2c27';
export const MOTIFS: Motif[] = [
  {
    key: 's0', name: 'le pot de miel et le coq (la ferme du riche)', ground: C.woad, frame: C.woadDeep,
    rows: [
      '..............',
      '.........rr...',
      '........rRR.k.',
      '.wwww..yRRRkkk',
      'wwwwww..rRRRkk',
      '.rrrr...RRddRk',
      'hHHHHm...RRRR.',
      'hHHHHm....y.y.',
      'hHHHHm....y.y.',
      '.mHHm....yy.yy',
    ],
    colors: { w: C.paper, r: C.madderLight, R: C.madder, d: C.madderDeep, k: INK, y: C.honeyLight, h: C.honeyLight, H: C.honey, m: C.honeyShade },
  },
  {
    key: 's1', name: 'la hache et la bûche (le bûcheron)', ground: C.ochre, frame: C.ochreShade,
    rows: [
      '.........iII..',
      '........iIIIJ.',
      '.......aIIIJ..',
      '......a..IJ...',
      '.....a........',
      '....a.........',
      '...A..........',
      '.cebbbbbbbbbb.',
      '.eceBbbbbbbbB.',
      '.cebBBBBBBBBB.',
    ],
    colors: { i: C.ironLight, I: C.iron, J: C.ironShade, a: '#b49a7a', A: '#74604d', b: XPAL.M, B: XPAL.N, c: '#d2b688', e: '#8d704f' },
  },
  {
    key: 's2', name: 'l\'aiguille et le fil (la mercière)', ground: C.madder, frame: C.madderDeep,
    rows: [
      '...........ii.',
      '..........i.i.',
      '.........ii.i.',
      '........ii..w.',
      '.......ii..w..',
      '......ii..w...',
      '.....ii..ww...',
      '....ii.....ww.',
      '...ii........w',
      '..i...........',
    ],
    colors: { i: C.ironLight, w: C.paper },
  },
  {
    key: 's3', name: 'les ciseaux (la tailleuse)', ground: C.woad, frame: C.woadDeep,
    rows: [
      '.ii.......ii..',
      '..ii.....ii...',
      '...ii...ii....',
      '....ii.ii.....',
      '.....iJi......',
      '....ii.ii.....',
      '..iiii.iiii...',
      '.i..i...i..i..',
      '.i..i...i..i..',
      '..ii.....ii...',
    ],
    colors: { i: C.ironLight, J: C.ironShade },
  },
  {
    key: 's4', name: 'le sac (le frère du forgeron)', ground: C.woadLight, frame: C.woad,
    rows: [
      '....LLLLLL....',
      '...L......L...',
      '..L........L..',
      '.eLllllllllLe.',
      '.ellllllllllE.',
      '.eEEEEEiiEEEE.',
      '.elllllillllE.',
      '.ellllllllllE.',
      '.elllllllllEE.',
      '..EEEEEEEEEE..',
    ],
    colors: { L: '#7c5136', l: '#a06d48', e: '#b9845a', E: '#583827', i: C.ironLight },
  },
];
/** Le rabot de l'enseigne tombée du menuisier : la peinture passée, fendue. */
const PLANE_MOTIF: Motif = {
  key: 'rabot', name: 'le rabot (le menuisier)', ground: '#b5a582', frame: '#7b6d60',
  rows: [
    '..............',
    '..............',
    '......AAA.....',
    '.....A...A....',
    '..a..A..iA....',
    '.aaaaAAAiAAAA.',
    '.AAAAAAAiAAAA.',
    '.AAAAAAAAAAAA.',
    '..............',
    '..............',
  ],
  colors: { a: '#7b6d60', A: '#5b4b44', i: C.ironLight },
};

/** Le panneau peint (s depuis la gauche vue de face, t vers le haut ; 16 × 12) : le cadre, le motif, quelques écailles s'il est vieux. */
function panelTex(m: Motif, worn = false): Tex {
  return (s, t, c) => {
    if (c.face !== 'S' && c.face !== 'N' && c.face !== 'top') return worn ? '[' : '%';
    const i = Math.floor(s), j = c.face === 'top' ? Math.floor(t) : Math.round(c.h) - 1 - Math.floor(t);
    const w = Math.round(c.w), h = Math.round(c.h);
    if (i <= 0 || j <= 0 || i >= w - 1 || j >= h - 1) return m.frame;
    const k = m.rows[j - 1]?.[i - 1] ?? '.';
    let col = k === '.' ? m.ground : m.colors[k] ?? m.ground;
    if (worn) {
      // la peinture écaillée : le bois vieux qui se voit, une fente le long du fil
      if (hash(401, i, j) < 0.06) col = '[';
      if (j === 10 && i > 2 && i < 9) col = '|';
    }
    return col;
  };
}

/** La potence (100 × 10 × 100 avec son panneau ; vide, 35 cm) : la platine scellée à l'ouest, le bras vers l'est, la console à volute, deux crochets. */
export const SIGN = { w: 20, d: 2, h: 20, armZ: 15, panel: [3, 19, 0, 12] as [number, number, number, number] };
function bracketQuads(rust: boolean, hooks: 'two' | 'one-empty' | 'none'): Quad[] {
  const Q: Quad[] = [], I = IRON('potence', 6, rust), tex = ironTex(rust);
  const { armZ } = SIGN;
  // la platine contre le mur, de part et d'autre du bras
  Q.push(...box(0, 0.8, 0.4, 1.6, armZ - 3, armZ + 5, I, tex));
  // le bras, la volute au bout (un enroulement vers le haut)
  Q.push(...box(0, SIGN.w - 1, 0.5, 1.5, armZ, armZ + 1.2, I, tex));
  Q.push(...box(SIGN.w - 2, SIGN.w, 0.5, 1.5, armZ + 1.2, armZ + 2.2, I, tex), ...box(SIGN.w - 1, SIGN.w, 0.5, 1.5, armZ, armZ + 1.2, I, tex));
  // le hauban au-dessus du bras, de la platine au milieu du bras, la volute dans l'angle
  Q.push(...bar([0.8, 1, armZ + 4.6], [12, 1, armZ + 1.4], 1, I, tex));
  Q.push(...box(3.2, 4.4, 0.6, 1.4, armZ + 1.2, armZ + 2.2, I, tex), ...box(4.4, 5.4, 0.6, 1.4, armZ + 1.8, armZ + 2.6, I, tex));
  // les crochets
  if (hooks !== 'none') {
    const xs = hooks === 'two' ? [SIGN.panel[0] + 2, SIGN.panel[1] - 3] : [SIGN.panel[1] - 3];
    for (const x of xs) Q.push(...box(x, x + 1, 0.6, 1.4, hooks === 'two' ? SIGN.panel[3] - 0.2 : armZ - 2.5, armZ, part('crochet', 6.2, rust ? C.rust : C.ironDeep, 'thin'), tex));
    if (hooks === 'one-empty') Q.push(...box(SIGN.panel[0] + 2, SIGN.panel[0] + 3, 0.6, 1.4, armZ - 1.2, armZ, part('crochet', 6.2, C.rust, 'thin'), tex));
  }
  return Q;
}
const signModel = (m: Motif) => (): Quad[] => {
  const [x0, x1, z0, z1] = SIGN.panel;
  return [
    ...bracketQuads(false, 'two'),
    ...box(x0, x1, 0.5, 1.5, z0, z1, part('panneau', 5, m.frame, 'full'), panelTex(m)),
  ];
};
const signBracket = (): Quad[] => bracketQuads(true, 'one-empty').map((q) => ({ ...q, o: [q.o[0], q.o[1], q.o[2] - (SIGN.armZ - 3)] as V3 }));
/** L'enseigne tombée (80 × 60 × 5) : le panneau couché face en l'air, le rabot passé, une fente, le crochet arraché. */
const fallenSign = (): Quad[] => [
  ...box(0, 16, 0, 12, 0, 1, part('panneau', 5, PLANE_MOTIF.frame, 'full'), panelTex(PLANE_MOTIF, true)),
  ...box(13, 13.8, 1, 2.6, 1, 1.4, part('crochet', 6, C.rust, 'thin'), ironTex(true)),
];

// =====================================================================================================================
// 13.3 Le bûcheron
// =====================================================================================================================

/** Un billot (Ø 45, 80 cm) : l'écorce, la coupe en bois de bout. */
function billot(x: number, y: number, r: number, h: number, seed: number): Quad[] {
  const P = part('billot', 4, 'K', 'full');
  return upright(x, y, r, 0, h, P, (_s, t, c) => {
    const l = litOf(c.n);
    return dash(seed, l, Math.floor(t), 0.4) ? ['m', 'N', 'K'][l] : ['M', 'm', 'N'][l];
  }, (s, t) => {
    const d = Math.hypot(s - r, t - r);
    return d > r - 0.8 ? '%' : Math.floor(d) % 2 ? '*' : '^';
  }, 12);
}
/** Le comptoir du bûcheron (200 × 50 × 90) : une planche épaisse sur deux billots. */
const plankCounter = (): Quad[] => [
  ...billot(5.5, 5, 4.4, 16, 501), ...billot(34.5, 5, 4.4, 16, 502),
  ...box(0, 40, 0.5, 9.5, 16, 18, WP('planche', 5), (s, t, c) => {
    if (c.face === 'top') return dash(503, Math.floor(t), Math.floor(s), 0.4) ? '*' : '^';
    return c.face === 'S' ? (Math.floor(t) === 1 ? '*' : '%') : c.face === 'W' ? '%' : '&';
  }),
];

/**
 * Le râtelier (300 × 60 × 290) : deux poteaux, une lisse haute et une basse, les perches et les planches debout, penchées contre la
 * lisse haute. Les perches (Ø 12 cm) en écorce, les planches (25 × 5 cm) en bois neuf (le bois du bûcheron sort de la scie).
 */
export const RACK = { w: 60, d: 16, h: 60 };
const woodRack = (): Quad[] => {
  const Q: Quad[] = [];
  for (const x of [1.5, 56.5]) Q.push(...box(x, x + 2.5, 12, 14.5, 0, 50, WP('poteau', 5), W(511 + x)));
  Q.push(...box(0, 60, 12, 14.5, 46, 48, WP('lisse', 6), W(513)), ...box(0, 60, 12.5, 14, 22, 23.5, WP('lisse', 6), W(514)));
  // les perches et les planches, du pied (au sud) au sommet (contre la lisse haute), dans l'ordre de l'ouest à l'est
  let x = 4;
  for (let k = 0; x < 55; k++) {
    const plank = hash(515, k) < 0.35;
    const lean = 0.6 + hash(516, k) * 0.8;
    const top = (plank ? 54 : 56) + hash(517, k) * 4;
    if (plank) {
      const P = part('planche', 7 + k * 0.01, '&', 'full');
      const tex = agedTex((s, t, c) => (c.face === 'slope' || c.face === 'edge' ? (Math.floor(s) % 9 === 0 && hash(518, k, Math.floor(s)) < 0.5 ? '%' : dash(519 + k, Math.floor(t), Math.floor(s), 0.3) ? '*' : '^') : c.face === 'cap' ? '*' : '%'), 'new');
      const y0 = 4 + lean, y1 = 11.5;
      Q.push(...box(x, x + 5, y0, y0 + 1, 0, 0.01, P, tex));
      Q.push({ o: [x, y0 + 1, 0], u: [5, 0, 0], v: [0, y1 - y0, top], n: [0, 0.99, -0.14], part: P, tex, face: 'slope' });
      Q.push({ o: [x, y0 + 1, 0], u: [0, y1 - y0, top], v: [0, -1, 0], n: [-1, 0, 0], part: P, tex, face: 'W' });
      Q.push({ o: [x + 5, y0 + 1, 0], u: [0, y1 - y0, top], v: [0, -1, 0], n: [1, 0, 0], part: P, tex, face: 'E' });
      Q.push(...box(x, x + 5, y1, y1 + 1, top, top + 0.8, P, tex));
      x += 5.8;
    } else {
      const P = part('perche', 7 + k * 0.01, 'K', 'full');
      const tex: Tex = (_s, t, c) => {
        if (c.face === 'cap') return '*';
        const l = c.n[0] < -0.3 ? 0 : c.n[0] > 0.3 ? 2 : 1;
        return dash(520 + k, l, Math.floor(t), 0.35) ? ['m', 'N', 'K'][l] : ['M', 'm', 'N'][l];
      };
      Q.push(...bar([x + 1.2, 3.5 + lean, 0], [x + 1.2 + (hash(521, k) - 0.5) * 1.5, 12, top], 2.4, P, tex));
      x += 2.9 + hash(522, k) * 0.8;
    }
  }
  return Q;
};

// =====================================================================================================================
// 13.4 Le menuisier
// =====================================================================================================================

/** Le volet cloué (70 × 15 × 55, croix comprise) : trois planches debout, deux planches clouées en croix par-dessus ; le revers, deux barres. */
const nailedShutter = (): Quad[] => {
  const Q: Quad[] = [];
  const planks: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'N') return j === 2 || j === 8 ? '^' : i % 5 === 4 ? '@' : '%';
    if (c.face !== 'S') return '%';
    if (i % 5 === 4) return '@';
    if (i % 5 === 0) return '^';
    return dash(531, i, j, 0.5) ? '%' : '*';
  };
  Q.push(...box(0, 14, 0, 1, 0, 11, WP('volet', 3, '|'), agedTex(planks, 'old')));
  // la croix : deux planches de 15 cm clouées en biais, leurs clous
  const cross = (dir: 1 | -1, prio: number): Quad[] => {
    const a: V3 = dir > 0 ? [0.5, 1.6, 0.8] : [13.5, 1.6, 0.8], b: V3 = dir > 0 ? [13.5, 1.6, 10.2] : [0.5, 1.6, 10.2];
    const T: Tex = (s, _t, c) => {
      if (c.face === 'cap') return '[';
      const i = Math.floor(s);
      if ((i === 1 || i === Math.floor(c.w) - 2) && c.n[1] > 0.5) return C.rust;
      return c.n[2] > 0.3 ? '{' : c.n[1] > 0.5 ? (dash(533 + dir, 0, i, 0.4) ? '[' : '}') : '[';
    };
    return bar(a, b, 2.4, part('planche clouée', prio, '|', 'full'), T);
  };
  Q.push(...cross(1, 4), ...cross(-1, 4.1));
  return Q;
};

/** L'herbe haute contre le solin (120 × 40 × 65) : des touffes de graminées, deux pieds d'ortie, une patience aux larges feuilles. */
const tallWeeds = (): Quad[] => {
  const Q: Quad[] = [];
  const tuft = (x: number, y: number, w: number, h: number, seed: number, kind: 'grass' | 'nettle' | 'dock') => {
    const n = kind === 'grass' ? 6 : 3;
    const blades = Array.from({ length: n }, (_, k) => ({
      base: w / 2 + (hash(seed, k, 1) - 0.5) * 2, tip: (k + 0.5) * (w / n) + (hash(seed, k, 2) - 0.5) * 1.5,
      top: h * (0.6 + hash(seed, k, 3) * 0.4), dry: hash(seed, k, 4) < 0.35,
    }));
    const tex: Tex = (s, t) => {
      for (const b of blades) {
        if (t > b.top) continue;
        const f = t / b.top, x = b.base + (b.tip - b.base) * Math.pow(f, 0.8);
        const half = kind === 'grass' ? 0.5 : kind === 'nettle' ? 0.4 + 1.2 * Math.sin(Math.PI * Math.min(1, f * 1.2)) * (Math.floor(t) % 3 === 0 ? 1 : 0.3) : 0.4 + 1.8 * Math.sin(Math.PI * f) * (f < 0.25 ? 0.2 : 0.8);
        if (Math.abs(s - x) > half) continue;
        if (kind === 'grass') {
          // l'épi au bout, plus large d'un pixel ; la tige sèche ou verte
          if (f > 0.84) return b.dry ? 'Y' : 't';
          if (b.dry) return f > 0.4 ? 't' : 'T';
          return f > 0.5 ? 'g' : f > 0.2 ? 'v' : 'V';
        }
        if (kind === 'nettle') return f > 0.85 ? 'L' : s < x ? 'l' : 'k';
        return s < x - 0.3 ? (f > 0.6 ? 'G' : 'g') : f > 0.6 ? 'v' : 'V';
      }
      return null;
    };
    const P = part('herbe', 3 + y * 0.01, kind === 'grass' ? 'V' : 'k', 'thin');
    Q.push({ o: [x, y, 0], u: [w, 0, 0], v: [0, 0, h], n: [0, 1, 0], part: P, tex, face: 'S' });
    // le même éventail en travers (la vue de côté, R1), au milieu de la touffe, sur la profondeur du pied
    const dw = Math.min(w, 6), yc = Math.min(Math.max(y, dw / 2), 8 - dw / 2);
    Q.push({ o: [x + w / 2, yc + dw / 2, 0], u: [0, -dw, 0], v: [0, 0, h], n: [1, 0, 0], part: P, tex: (s, t, c) => tex((s / dw) * w, t, c), face: 'E' });
  };
  tuft(0, 3, 8, 14, 541, 'grass');
  tuft(5, 6, 7, 16, 542, 'nettle');
  tuft(10, 2, 8, 12, 543, 'grass');
  tuft(13, 7, 6, 10, 544, 'dock');
  tuft(17, 4, 7, 15, 545, 'grass');
  tuft(3, 7.5, 6, 9, 546, 'grass');
  tuft(19, 7.6, 5, 11, 547, 'nettle');
  return Q;
};

/** Les bardeaux dont il manque des rangs : des trous dans la couverture, les lattes et le noir du comble dessous. */
export function damagedShingles(tex: Tex, K: number, holes: [number, number, number, number][]): Tex {
  // holes : [s0, s1, rang0, rang1] en px de pente et en rangs de 4 px d'écran depuis l'égout
  return (s, t, c) => {
    const r = Math.floor((t * K) / 4), yy = t * K - r * 4;
    for (const [s0, s1, r0, r1] of holes) {
      // le bord du trou, rang par rang : des bardeaux tombés de travers, un trou qui s'élargit vers le bas
      const a = s0 + Math.floor(hash(551, r, s0) * 7) - 3 - (r1 - r) * 2, b = s1 + Math.floor(hash(553, r, s1) * 7) - 3 + (r1 - r) * 2;
      const jag = hash(554, r, Math.floor(s / 2)) < 0.3 ? 1 : 0;
      if (r >= r0 && r <= r1 && s >= a + jag && s < b - jag) {
        // la latte (une tous les 4 px d'écran), le noir entre deux
        if (yy < 1.2) return '}';
        if (yy < 2) return '[';
        return hash(552, Math.floor(s), r) < 0.15 ? '|' : 'o';
      }
    }
    return tex(s, t, c);
  };
}
/** Le pan de bardeaux abîmé (deux travées, 3,20 m) : le pan sud du menuisier, ses trous. */
export const MENUISIER_ROOF = { pitch: 45, D: 128, cover: 'shingles' as const };
const damagedPan = (): Quad[] => {
  const h: HouseSpec = { L: 64, D: 128, T: 0, sill: 16, doorW: 18, innerDoorW: 16, walls: [], age: 'old', fill: 'flaking', roof: { cover: 'shingles', pitch: 45, over: [0, 0], eave: 10, gables: ['none', 'none'] } };
  const RAD = (45 * Math.PI) / 180, K = Math.sin(RAD) + Math.cos(RAD);
  const qs = gableRoof(h).filter((q) => q.part.name !== 'pignon' && q.part.name !== 'entrait' && q.part.name !== 'faîtage' && (q.n[1] > 0.01 || (q.face === 'edge' && q.o[1] > h.D / 2)));
  return foreign(qs.map((q) => (q.face === 'slope' ? { ...q, tex: damagedShingles(q.tex, K, [[10, 22, 4, 5], [38, 50, 12, 12], [3, 9, 15, 17]]) } : q)));
};

/** La chaise pas finie (45 × 45 × 90) : les pieds, les montants du dossier, deux traverses ; ni assise ni barreaux. */
const unfinishedChair = (): Quad[] => {
  const Q: Quad[] = [], P = WP('chaise', 5, '|'), w = W(561, 'old');
  for (const [x, y, h] of [[0, 0, 18], [7, 0, 18], [0, 7, 9], [7, 7, 9]]) Q.push(...box(x, x + 2, y, y + 2, 0, h, P, w));
  // les traverses posées (le cadre de l'assise à moitié : deux côtés), une du dossier
  // le cadre de l'assise (sans paille ni planches), la traverse haute du dossier ; il manque le côté est et les barreaux
  Q.push(...box(2, 7, 0.6, 1.4, 8, 9, P, w), ...box(0.6, 1.4, 2, 7, 8, 9, P, w), ...box(2, 7, 7.1, 7.9, 8, 9, P, w), ...box(2, 7, 0.6, 1.4, 15, 16.5, P, w));
  Q.push(...box(2, 7, 7.1, 7.9, 3, 3.8, P, w));
  // le barreau qui manque, posé par terre devant
  Q.push(...box(1, 6.5, 8.6, 9.4, 0, 0.8, P, w));
  return Q;
};

// =====================================================================================================================
// 13.8 Le panneau des nouvelles
// =====================================================================================================================

/** Les feuillets cloués (s, t de la face du tableau) : quatre ou cinq papiers, les lignes d'encre, le clou. */
function sheetsOn(seed: number, base: Tex): Tex {
  const sheets: [number, number, number, number][] = seed === 1
    ? [[1, 6, 9, 16], [7, 12, 4, 11], [13, 17, 10, 17], [18, 23, 5, 13]]
    : [[2, 7, 6, 14], [9, 14, 9, 17], [15, 21, 4, 11]];
  return (s, t, c) => {
    if (c.face !== 'S' && c.face !== 'N') return base(s, t, c);
    const i = Math.floor(s), j = Math.floor(t);
    for (const [x0, x1, y0, y1] of sheets) {
      if (i < x0 || i >= x1 || j < y0 || j >= y1) continue;
      if (j === y1 - 1 && i === Math.floor((x0 + x1) / 2)) return C.ironShade; // le clou
      if (i === x1 - 1 || j === y0) return C.paperShade;
      if (j < y1 - 2 && (y1 - j) % 2 === 1 && i > x0 && i < x1 - 2 && hash(571 + seed, i, j) < 0.7) return C.ink;
      return C.paper;
    }
    return base(s, t, c);
  };
}
/** Le panneau (160 × 30 × 210) : deux poteaux plantés, le tableau de planches, le petit toit de bardeaux à deux pans. */
const noticeBoard = (): Quad[] => {
  const Q: Quad[] = [];
  const P = WP('poteau', 5);
  for (const x of [1, 28]) Q.push(...box(x, x + 3, 1.5, 4.5, 0, 39, P, W(581 + x)));
  const planks: Tex = (s, t, c) => {
    if (c.face === 'top') return '^';
    if (c.face !== 'S' && c.face !== 'N') return '%';
    const j = Math.floor(t);
    if (j % 4 === 3) return '&';
    if (j % 4 === 0) return '%';
    return dash(583, j, Math.floor(s), 0.35) ? '%' : '*';
  };
  // le tableau, et ses feuillets des deux côtés
  Q.push(...box(4, 28, 2.5, 3.5, 15, 33, WP('tableau', 4), (s, t, c) => (c.face === 'N' ? sheetsOn(2, planks)(s, t, c) : sheetsOn(1, planks)(s, t, c))));
  Q.push(...box(3.5, 28.5, 2, 4, 33, 34.5, WP('chapeau', 5), W(584)), ...box(3.5, 28.5, 2.2, 3.8, 13.8, 15, WP('lisse', 5), W(585)));
  // le petit toit de bardeaux à deux pans (faîtage est-ouest), ses pignons de planches
  const zE = 37, zR = 42, K = 1.4;
  const sh = shinglesTex(K);
  const R = part('toit', 9, '@', 'full', { roof: true });
  Q.push({ o: [0, 6, zE], u: [32, 0, 0], v: [0, -3, zR - zE], n: [0, 0.86, 0.51], part: R, tex: sh, face: 'slope' });
  Q.push({ o: [32, 0, zE], u: [-32, 0, 0], v: [0, 3, zR - zE], n: [0, -0.86, 0.51], part: R, tex: sh, face: 'slope' });
  Q.push({ o: [0, 6, zE - 0.8], u: [32, 0, 0], v: [0, 0, 0.8], n: [0, 1, 0], part: R, tex: () => '&', face: 'S' });
  Q.push(...box(-0.2, 32.2, 2.4, 3.6, zR - 0.3, zR + 0.8, part('faîtage', 10, '@', 'full', { roof: true }), (_s, _t, c) => (c.face === 'top' ? '^' : '&')));
  const gh = zR - 34.5, tri = (s: number, t: number) => t > gh * (1 - Math.abs(s - 3) / 3);
  const G = WP('pignon', 4);
  Q.push({ o: [0.6, 0, 34.5], u: [0, 6, 0], v: [0, 0, gh], n: [-1, 0, 0], part: G, tex: (s, t) => (tri(s, t) ? null : Math.floor(t) % 3 === 2 ? '%' : '*'), face: 'W' });
  Q.push({ o: [31.4, 6, 34.5], u: [0, -6, 0], v: [0, 0, gh], n: [1, 0, 0], part: G, tex: (s, t) => (tri(s, t) ? null : Math.floor(t) % 3 === 2 ? '&' : '%'), face: 'E' });
  return Q;
};
/** Un feuillet (20 × 30 cm) posé à plat : le papier, trois lignes d'encre. */
const noticeSheet = (): Quad[] => box(0, 4, 0, 6, 0, 0.3, part('feuillet', 3, C.paperShade, 'full'), (s, t, c) => {
  if (c.face !== 'top') return C.paperShade;
  const i = Math.floor(s), j = Math.floor(t);
  return (j === 1 || j === 3) && i >= 1 && i <= 2 ? C.ink : j === 4 && i === 1 ? C.ink : C.paper;
});

// =====================================================================================================================
// Le catalogue
// =====================================================================================================================

interface Def {
  key: string; name: string; dims: { w: number; d: number; h: number }; buildings: PlaceBuildingId[];
  /** Le nombre de vues (1 rond, 2 symétrique, 4) ; `k` : 1 pièce de bâtiment, ½ meuble ; `shadow` : l'ombre portée au sol. */
  n: 1 | 2 | 4; k: 1 | 0.5; shadow: boolean;
  /** Ce qui explique sa forme (écrit sous la pièce). */
  note: string;
  /** La forme pour le gabarit : `lying` couché (règle D), `flat` à plat au sol, `ground` pièce de bâtiment. */
  form?: 'lying' | 'flat' | 'ground' | 'hanging' | 'pan';
  model(): Quad[];
}

const SIGN_DIMS = { w: 100, d: 10, h: 100 };
const DEFS: Def[] = [
  // 13.2 la ferme du riche
  { key: 'luxury-counter', name: 'Comptoir de chêne sculpté', dims: { w: 240, d: 70, h: 95 }, buildings: ['p-ferme-riche'], n: 4, k: 0.5, shadow: true, note: 'plateau mouluré, frise de rinceaux, quatre panneaux à plis de serviette au sud', model: luxuryCounter },
  { key: 'striped-awning', name: 'Auvent de toile rayée', dims: { w: 640, d: 300, h: 285 }, buildings: ['p-ferme-riche'], n: 4, k: 1, shadow: false, form: 'ground', note: 'six poteaux tournés, la toile guède et garance (lés de 20 cm), le lambrequin festonné au sud ; vu de dos (R2), le haut de la toile est au sud : moins haut que la boîte, c\'est la projection', model: stripedAwning },
  { key: 'tiered-display', name: 'Présentoir à gradins', dims: { w: 160, d: 70, h: 110 }, buildings: ['p-ferme-riche'], n: 4, k: 0.5, shadow: true, note: 'trois gradins sous une nappe, chargés : meules, pots de miel et cire, épices en boîtes ; de dos (R2), le gradin haut est devant : moins haut que la boîte', model: tieredDisplay },
  { key: 'shop-shelves', name: 'Étagères de boutique', dims: { w: 200, d: 40, h: 180 }, buildings: ['p-ferme-riche'], n: 4, k: 0.5, shadow: true, note: 'cinq rayons : jarres, fromages, pots de miel, pains de cire', model: shopShelves },
  { key: 'cheese-rack', name: 'Claie à fromages', dims: { w: 120, d: 50, h: 160 }, buildings: ['p-ferme-riche'], n: 2, k: 0.5, shadow: true, note: 'cinq claies d\'osier, vingt fromages qui s\'affinent', model: cheeseRack },
  { key: 'honey-pot', name: 'Pot de miel', dims: { w: 20, d: 20, h: 25 }, buildings: ['p-ferme-riche'], n: 1, k: 0.5, shadow: true, note: 'grès, le linge noué d\'une ficelle rouge ; à sa taille réelle (4 px)', model: honeyPotPiece },
  { key: 'wax-cake', name: 'Pain de cire', dims: { w: 25, d: 15, h: 10 }, buildings: ['p-ferme-riche'], n: 2, k: 0.5, shadow: true, note: 'à sa taille réelle (5 px)', model: waxCakePiece },
  { key: 'spice-box', name: 'Boîte d\'épices', dims: { w: 25, d: 15, h: 12 }, buildings: ['p-ferme-riche'], n: 2, k: 0.5, shadow: true, note: 'le couvercle peint à la garance ; à sa taille réelle (5 px)', model: spiceBoxPiece },
  { key: 'honey-pyramid', name: 'Pots de miel en pyramide', dims: { w: 100, d: 30, h: 100 }, buildings: ['p-ferme-riche'], n: 2, k: 0.5, shadow: true, note: 'quatre rangs de pots de grès de 25 cm, 4-3-2-1, une planchette entre chaque ; de côté, la pyramide montre moins que sa boîte (le sommet est au milieu)', model: honeyPyramid },
  { key: 'cheese-stack', name: 'Pile de meules', dims: { w: 50, d: 50, h: 60 }, buildings: ['p-ferme-riche'], n: 1, k: 0.5, shadow: true, note: 'cinq meules affinées de 12 cm, la croûte lavée', model: cheeseStack },
  { key: 'wax-stack', name: 'Pains de cire en pile', dims: { w: 50, d: 30, h: 40 }, buildings: ['p-ferme-riche'], n: 2, k: 0.5, shadow: true, note: 'quatorze pains de 25 x 15 x 10 en quatre lits', model: waxStack },
  { key: 'candle-bunch', name: 'Botte de cierges', dims: { w: 30, d: 10, h: 50 }, buildings: ['p-ferme-riche'], n: 2, k: 0.5, shadow: false, form: 'hanging', note: 'six cierges pendus par les mèches, sous la traverse de l\'auvent ; de côté (R1), la botte se voit par la tranche', model: candleBunch },
  // 14.1 la vie : les jardinières, le linge (l'échelle est celle du centre : art/proposals/place-centre-pieces.ts)
  { key: 'flower-box', name: 'Jardinière d\'appui', dims: { w: 60, d: 20, h: 40 }, buildings: ['p-ferme-riche', 'p-bucheron'], n: 2, k: 0.5, shadow: false, form: 'hanging', note: 'terre cuite, géraniums, soucis, giroflées ; posée sur l\'appui d\'une fenêtre d\'étage', model: flowerBox },
  { key: 'window-laundry', name: 'Linge à la fenêtre', dims: { w: 120, d: 10, h: 60 }, buildings: ['p-ferme-riche', 'p-bucheron'], n: 2, k: 0.5, shadow: false, form: 'hanging', note: 'une perche, une chemise, un chaperon de guède, un drap ; pend en hauteur ; de côté (R1) le linge est vu par la tranche (une face est ou ouest ne se voit pas : CADRAGE 8.1)', model: windowLaundry },
  // 13.9 l'enseigne, ses cinq motifs (un tirage par métier)
  ...MOTIFS.map((m, i): Def => ({
    key: i === 0 ? 'hanging-sign' : `hanging-sign-${m.key}`, name: `Enseigne pendue à sa potence (${m.name})`, dims: SIGN_DIMS,
    buildings: i === 0 ? ['p-ferme-riche'] : i === 1 ? ['p-bucheron'] : [], n: 4, k: 0.5, shadow: false, form: 'hanging',
    note: `tirage ${m.key} ; fer forgé, panneau de 80 x 60 cm peint des deux côtés ; pend en hauteur (pas d'ombre au sol)`, model: signModel(m),
  })),
  // 13.3 le bûcheron
  { key: 'plank-counter', name: 'Comptoir sur billots', dims: { w: 200, d: 50, h: 90 }, buildings: ['p-bucheron'], n: 2, k: 0.5, shadow: true, note: 'une planche de 10 cm sur deux billots de 45 cm de diamètre', model: plankCounter },
  { key: 'tool-rack', name: 'Râtelier d\'outils du bois', dims: { w: 200, d: 30, h: 160 }, buildings: ['p-bucheron'], n: 4, k: 0.5, shadow: true, note: 'deux cognées, une hache, le passe-partout, la scie à cadre ; les coins et les maillets sur la tablette', model: toolRack },
  { key: 'shingle-bundle', name: 'Botte de bardeaux', dims: { w: 50, d: 25, h: 30 }, buildings: ['p-bucheron'], n: 2, k: 0.5, shadow: true, note: 'bardeaux de chêne fendus, liés de deux harts', model: shingleBundle },
  { key: 'wood-rack', name: 'Râtelier à perches et planches', dims: { w: 300, d: 60, h: 290 }, buildings: ['p-bucheron'], n: 4, k: 0.5, shadow: true, note: 'deux poteaux, deux lisses ; perches et planches debout, penchées contre la lisse haute', model: woodRack },
  // 13.4 le menuisier
  { key: 'nailed-shutter', name: 'Volet cloué', dims: { w: 70, d: 15, h: 55 }, buildings: ['p-menuisier'], n: 4, k: 1, shadow: false, form: 'ground', note: 'bois vieux, deux planches clouées en croix', model: nailedShutter },
  { key: 'fallen-sign', name: 'Enseigne tombée (le rabot)', dims: { w: 80, d: 60, h: 5 }, buildings: ['p-menuisier'], n: 4, k: 1, shadow: false, form: 'flat', note: 'à plat au sol, la peinture passée et écaillée, une fente, le crochet arraché', model: fallenSign },
  { key: 'sign-bracket', name: 'Potence vide', dims: { w: 100, d: 10, h: 35 }, buildings: ['p-menuisier'], n: 4, k: 0.5, shadow: false, form: 'hanging', note: 'la potence de l\'enseigne, rouillée, un crochet vide', model: signBracket },
  { key: 'tall-weeds', name: 'Herbe haute', dims: { w: 120, d: 40, h: 65 }, buildings: ['p-menuisier'], n: 2, k: 0.5, shadow: true, note: 'graminées, deux orties, une patience', model: tallWeeds },
  { key: 'shingle-roof-damaged', name: 'Pan de bardeaux abîmé (deux travées)', dims: { w: 0, d: 0, h: 0 }, buildings: ['p-menuisier'], n: 4, k: 1, shadow: false, form: 'pan', note: 'bois vieux, trois trous : les lattes et le noir du comble ; de dos (R2), un pan ne montre rien (la pente fuit)', model: damagedPan },
  { key: 'unfinished-chair', name: 'Chaise pas finie', dims: { w: 45, d: 45, h: 90 }, buildings: ['p-menuisier'], n: 4, k: 0.5, shadow: true, note: 'bois vieux : les pieds, les montants, deux traverses ; un barreau par terre', model: unfinishedChair },
  // 13.8 le panneau
  { key: 'notice-board', name: 'Panneau des nouvelles', dims: { w: 160, d: 30, h: 210 }, buildings: ['p-panneau'], n: 2, k: 0.5, shadow: true, note: 'deux poteaux, le tableau, un toit de bardeaux ; des feuillets des deux côtés', model: noticeBoard },
  { key: 'notice-sheet', name: 'Feuillet', dims: { w: 20, d: 30, h: 1 }, buildings: ['p-panneau'], n: 2, k: 1, shadow: false, form: 'flat', note: 'à plat, trois lignes d\'encre ; à sa taille réelle', model: noticeSheet },
];

const cache = new Map<string, Img>();
/** La vue v d'une pièce (image et sa palette). */
export function pieceView(key: string, v = 0): Img {
  const id = `${key}:${v}`;
  let r = cache.get(id);
  if (!r) {
    const d = DEFS.find((x) => x.key === key);
    if (!d) throw new Error(`place-nord : pas de pièce « ${key} »`);
    const qs = rotQuads(d.model(), VIEW_ROT[v % 4], [0, 0]);
    r = pieceImg(qs, { k: d.k, shadow: d.shadow });
    cache.set(id, r);
  }
  return r;
}
/** Le modèle d'une pièce dans sa vue (pour la poser en volumes dans une scène). */
export function pieceModel(key: string, v = 0): Quad[] {
  const d = DEFS.find((x) => x.key === key);
  if (!d) throw new Error(`place-nord : pas de pièce « ${key} »`);
  return v ? rotQuads(d.model(), VIEW_ROT[v % 4], [0, 0]) : d.model();
}
/** Le comptoir sculpté chargé dans sa vue (R0 : le long des clients au sud ; R1 et R3 : nord-sud, pour l'équerre). */
export function ladenCounter(v = 0): Img {
  const id = `laden:${v}`;
  let r = cache.get(id);
  if (!r) { r = pieceImg(rotQuads(ladenCounterModel(), VIEW_ROT[v % 4], [0, 0]), { k: 0.5, shadow: true }); cache.set(id, r); }
  return r;
}
/** L'enseigne d'un motif (s0 à s4) dans sa vue : la seule source des enseignes de la place (le module du sud s'en sert). */
export function hangingSign(motif: 's0' | 's1' | 's2' | 's3' | 's4', v = 0): Img {
  return pieceView(motif === 's0' ? 'hanging-sign' : `hanging-sign-${motif}`, v);
}

/** Les dimensions d'une pièce calculée (le pan) : la boîte de son modèle, en cm. */
function boxDims(model: () => Quad[]): { w: number; d: number; h: number } {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const q of model()) for (const p of [q.o, [q.o[0] + q.u[0], q.o[1] + q.u[1], q.o[2] + q.u[2]], [q.o[0] + q.v[0], q.o[1] + q.v[1], q.o[2] + q.v[2]], [q.o[0] + q.u[0] + q.v[0], q.o[1] + q.u[1] + q.v[1], q.o[2] + q.u[2] + q.v[2]]]) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]);
  }
  return { w: Math.round((x1 - x0) * 5), d: Math.round((y1 - y0) * 5), h: Math.round((z1 - z0) * 5) };
}

/** Les pièces nouvelles (interface commune) ; `houses` reste vide : les bâtiments de la place sont dans `PIECE_USES`. */
export const PIECES: VillagePiece[] = DEFS.map((d) => ({
  key: d.key,
  name: d.name,
  dims: d.dims.w ? d.dims : boxDims(d.model),
  houses: [],
  views: () => Array.from({ length: d.n }, (_, v) => pieceView(d.key, v)),
}));
/** Les bâtiments de la place qui se servent de chaque pièce (le champ `houses` de l'interface ne connaît que les maisons). */
export const PIECE_USES: Record<string, PlaceBuildingId[]> = Object.fromEntries(DEFS.map((d) => [d.key, d.buildings]));
/** Ce que la planche des pièces écrit de plus : la forme pour le gabarit, la note. */
export const PIECE_INFO: Record<string, { form?: Def['form']; k: 1 | 0.5; note: string }> = Object.fromEntries(DEFS.map((d) => [d.key, { form: d.form, k: d.k, note: d.note }]));
export type { Grid };
