// PROPOSITION (hors jeu, jamais chargée par le jeu) : les pièces nouvelles des quarts sud de la place (CADRAGE-village.md, sections
// 13.5 à 13.7), chacune son modèle en volumes (art/lib/volumes.ts), en px du jeu (5 cm), posée au sol de x 0 à W (est-ouest), y 0 à D
// (nord-sud), z 0 à H. Ses vues R0 à R3 en sont tirées (un quart de tour de plus dans le sens des aiguilles d'une montre à chaque
// fois), rendues comme le jeu : un meuble ou un objet avec le dessus raccourci de moitié et son ombre portée (k = ½), une pièce de
// bâtiment qui relie des appuis au sol avec sa profondeur à l'échelle du sol (`ground`, k = 1). Les bâtiments (place-sud.ts) posent
// ces mêmes modèles : les meubles en images (comme le jeu), les pièces de bâtiment en faces dans leur scène.
//
// COPIÉ de maison-coq:art/proposals/coq-catalogue-bois.ts (pièces EXISTANTES du coq, que le cadrage reprend : à réunir quand le coq
// s'intégrera) : la table de la tailleuse (`tailorTableQuads`) et le coupon d'étoffe plié (`clothBoltQuads`), à l'identique.
//
// Les couleurs : la palette des maisons de pierre (village-maisons-pierre-matieres.ts) : le monde (le feuillage j L l k des choux et des
// poireaux, les fleurs a b c, le chanvre J O C X de l'osier et des cordes, l'écorce M m N K et la terre U u n e du cuir), le bois patiné,
// le coq (la guède α β γ δ, la garance ρ σ τ, le fer - _), le calcaire. Aucune couleur nouvelle.

import type { Grid } from '../lib/canvas';
import {
  box, dash, hash, part, polyPrism, renderPiece, rotQuads, sub, timber, unit, withGroundShadow,
  type Part, type Quad, type Rot, type Tex, type V3,
} from '../lib/volumes';
import type { HouseId, Img, VillagePiece } from './village-types';
import { boards, furnWood, palette } from './village-maisons-pierre-matieres';
import { bark, boardsTex, cylinder, face, leafInsideTex, leafTex } from './village-maisons-bois-lib';
import { ball, ballHeap, bar, clapboard, quad } from './place-sud-lib';

const P = (name: string, prio = 3, dark = 'K', outline: 'full' | 'thin' | 'none' = 'full', extra: Partial<Part> = {}) => part(name, prio, dark, outline, extra);
const W = (seed: number) => furnWood(seed);
/** Le bois brut d'un étal (planches de sciage, jamais rabotées) : plus de fil, des nœuds. */
const roughWood = (seed: number): Tex => (s, t, c) => {
  const i = Math.floor(s), j = Math.floor(t);
  if (c.face === 'top') return hash(seed, i >> 2, j) < 0.06 ? '&' : dash(seed, j, i, 0.5) ? '%' : hash(seed, i, j, 3) < 0.15 ? '^' : '*';
  if (c.face === 'E' || c.face === 'edge' || c.face === 'N') return '%';
  return dash(seed, i, j, 0.4) ? '&' : '%';
};

// =====================================================================================================================
// 13.5 La ferme rivale : l'étal, l'auvent, les cageots, le panier, la balance, l'ardoise
// =====================================================================================================================

/** Les rampes des légumes : [lumière, teinte, ombre, contour côté lumière]. */
export const VEG = {
  cabbage: 'jLlk', // le chou : le feuillage du monde
  cabbage2: 'Llkk',
  turnip: 'ρρaσ', // la rave : le collet violet (garance), le bas blanc
  apple: 'bcστ', // la pomme : le jaune, le rouge
  apple2: 'ccστ',
  onion: 'UunN', // l'oignon : la terre claire
  carrot: 'hiστ', // la carotte : les lueurs du feu (h, i), seules teintes orangées de la palette
};

/** Des poireaux couchés nord-sud côte à côte : le blanc au sud, le vert au nord ; deux rangs. */
function leeks(x0: number, x1: number, y0: number, y1: number, z0: number): Quad[] {
  const Q: Quad[] = [], mid = y0 + (y1 - y0) * 0.45;
  for (let L = 0; L < 2; L++) for (let x = x0 + L * 0.8; x + 1.6 <= x1 - L * 0.8; x += 1.7) {
    const tex: Tex = (s, _t, c) => {
      const y = c.p[1];
      const green = y < mid;
      if (c.face === 'top') return green ? (s < 0.8 ? 'L' : 'l') : s < 0.8 ? 'a' : 'd';
      if (c.face === 'S') return 'D';
      return green ? 'l' : 'd';
    };
    Q.push(...box(x, x + 1.6, y0 + hash(4, x, L) * 1.2, y1 - hash(5, x, L) * 1.2, z0 + L * 1.3, z0 + L * 1.3 + 1.4, P('poireau', 3, 'k'), tex));
  }
  return Q;
}

/** Les légumes d'une travée d'étal (64 × 14 px de plateau), en tas, selon le tirage `mix`. */
function stallLoad(mix: number, z: number): Quad[] {
  if (mix === 0) return [
    ...ballHeap(0.5, 15, 0.5, 13.5, z, 2.4, [VEG.cabbage, VEG.cabbage2], 11, 2),
    ...ballHeap(16, 30, 1, 13, z, 1.6, [VEG.turnip], 12, 2),
    ...leeks(31, 46, 1, 13, z),
    ...ballHeap(47, 63.5, 0.5, 13.5, z, 1.4, [VEG.apple, VEG.apple2], 13, 3),
  ];
  return [
    ...ballHeap(0.5, 18, 0.5, 13.5, z, 1.5, [VEG.onion], 21, 3),
    ...leeksCarrots(19, 32, z),
    ...ballHeap(33, 50, 0.5, 13.5, z, 2.4, [VEG.cabbage2, VEG.cabbage], 22, 2),
  ];
}
/** Des carottes en bottes : couchées nord-sud, le fanes au nord. */
function leeksCarrots(x0: number, x1: number, z0: number): Quad[] {
  const Q: Quad[] = [];
  for (let x = x0; x + 1.4 <= x1; x += 1.5) {
    const tex: Tex = (_s, _t, c) => (c.p[1] < 4 ? (c.face === 'top' ? 'L' : 'l') : c.face === 'top' ? (Math.floor(c.p[1]) % 3 === 0 ? 'h' : 'i') : 'σ');
    Q.push(...box(x, x + 1.4, 1 + hash(6, x) * 1.5, 12, z0, z0 + 1.2, P('carotte', 3, 'σ'), tex));
  }
  return Q;
}

/**
 * L'étal de planches sur tréteaux, une travée de 3,20 m (320 × 70 × 80 cm ; 95 avec les légumes) : deux tréteaux (une traverse, quatre
 * pieds écartés), trois planches brutes mal dressées ; garni (`mix` 0 : choux, raves, poireaux, pommes ; 1 : oignons, carottes, choux).
 */
export function roughStallModel(mix = 0, loaded = true): Quad[] {
  const Q: Quad[] = [];
  for (const x of [5, 57]) {
    Q.push(...box(x, x + 2, 0.5, 13.5, 13, 15, P('tréteau', 3), W(301 + x)));
    for (const [yt, yb] of [[2, 0.3], [12, 13.7]] as const) for (const dx of [-1.6, 1.6]) {
      Q.push(...bar([x + 1, yt, 13], [x + 1 + dx, yb, 0], 1.2, P('pied', 2.5), W(303 + x)));
    }
  }
  const planks: [number, number, number][] = [[0, 4.5, -1], [4.8, 9.2, 0.5], [9.5, 14, 0]];
  planks.forEach(([y0, y1, dx], k) => Q.push(...box(dx, 64 + dx, y0, y1, 15, 16, P('planche', 4, '&'), roughWood(311 + k))));
  if (loaded) Q.push(...stallLoad(mix, 16));
  return Q;
}

export const AWNING = { w: 128, d: 48, zS: 48, zN: 40 };
/**
 * L'auvent de planches sur perches, 640 × 240 × 240 cm : quatre perches écorcées, deux pannes de perche (au nord à 2 m, au sud à
 * 2,40 m), des planches brutes posées nord-sud, mal jointes (des jours entre elles, les bouts pas alignés), qui penchent vers la place.
 */
export function awningModel(): Quad[] {
  const Q: Quad[] = [], { w, d, zS, zN } = AWNING;
  const zAt = (y: number) => zN + ((zS - zN) * y) / d;
  // les perches et les pannes
  const BK = bark(331);
  for (const y of [3, d - 3]) {
    Q.push(...box(-2, w + 2, y - 1, y + 1, zAt(y) - 3, zAt(y) - 1, P('panne', 6, 'K'), BK));
    for (const x of [2, w - 2]) Q.push(...box(x - 1, x + 1, y - 1, y + 1, 0, zAt(y) - 3, P('perche', 5, 'K'), bark(333 + x + y)));
  }
  // les planches : de 20 à 30 cm, un jour de 0 à 5 cm, les bouts décalés
  const PL = P('planche', 8, '&', 'full', { roof: true });
  let x = -1, k = 0;
  while (x < w + 1) {
    const pw = 4 + Math.floor(hash(341, k) * 3), y0 = -2 + Math.floor(hash(342, k) * 3) - 1, y1 = d + 1 + Math.floor(hash(343, k) * 3);
    const x1 = Math.min(x + pw, w + 1.5);
    const tex: Tex = (s, t, c) => {
      const i = Math.floor(s), j = Math.floor(t);
      if (c.face !== 'slope') return '%';
      if (i === 0) return '^';
      if (i === Math.floor(c.w) - 1) return '%';
      return hash(344, k, j >> 2) < 0.07 ? '&' : dash(345 + k, i, j, 0.5) ? '%' : '*';
    };
    const lift = hash(346, k) < 0.3 ? 0.4 : 0;
    Q.push(face([x, y0, zAt(y0) + lift], [x1 - x, 0, 0], [0, y1 - y0, zAt(y1) - zAt(y0)], PL, tex));
    Q.push(quad([x, y1, zAt(y1) + lift - 1], [x1 - x, 0, 0], [0, 0, 1], [0, 1, 0], PL, () => '&'));
    x = x1 + (hash(347, k) < 0.22 ? 1 : 0);
    k++;
  }
  return Q;
}

/** Le cageot de lattes (50 × 35 × 30 cm) : lattes horizontales et jours, les coins ; garni (0 choux, 1 raves et poireaux, 2 pommes). */
export function crateModel(mix: number): Quad[] {
  const Q: Quad[] = [];
  const slats: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), wF = Math.floor(c.w);
    if (c.face === 'top') return mix === 0 ? 'k' : mix === 1 ? 'D' : 'σ';
    if (i === 0 || i === wF - 1) return c.face === 'S' ? '%' : '&';
    if (j === 2) return '&';
    return j === 5 || j === 1 ? '^' : dash(351, i, j, 0.4) ? '%' : '*';
  };
  Q.push(...box(0, 10, 0, 7, 0, 6, P('cageot', 3, '&'), slats));
  if (mix === 0) for (const x of [2.6, 7.4]) Q.push(...ball(x, 3.5, 4.5, 2.4, x < 5 ? VEG.cabbage : VEG.cabbage2));
  if (mix === 1) {
    Q.push(...leeks(0.5, 5, 0.5, 6.5, 5.5));
    for (const [x, y] of [[6.6, 2], [8.6, 2], [7.6, 4.8]]) Q.push(...ball(x, y, 5.5, 1.5, VEG.turnip));
  }
  if (mix === 2) for (const [x, y, z] of [[2, 2, 5.4], [5, 2, 5.4], [8, 2, 5.4], [2, 5, 5.4], [5, 5, 5.4], [8, 5, 5.4], [3.5, 3.5, 6.6], [6.5, 3.5, 6.6]]) Q.push(...ball(x, y, z, 1.4, (x + y) % 3 < 1.5 ? VEG.apple : VEG.apple2));
  return Q;
}

/** L'osier tressé : des brins en quinconce (le chanvre du monde : J O C X). */
const wicker: Tex = (s, t, c) => {
  if (c.face === 'cap' || c.face === 'top') return 'C';
  const i = Math.floor(s), j = Math.floor(t);
  const lit = c.n[0] < -0.3 ? 1 : c.n[0] > 0.4 ? -1 : 0;
  const weave = (i + j) % 2 === 0;
  if (lit > 0) return weave ? 'J' : 'O';
  if (lit < 0) return weave ? 'C' : 'X';
  return weave ? 'O' : 'C';
};
/** Le panier d'osier (Ø 40 × 30 cm), plein d'oignons. */
export function basketModel(): Quad[] {
  const Q: Quad[] = [];
  Q.push(...cylinder([4, 4, 0], [4, 4, 6], 4, P('panier', 3, 'X'), wicker, () => 'n', 12));
  for (const [x, y] of [[2.6, 3], [5.4, 3], [4, 5.2], [2.8, 5.6], [5.4, 5.6]]) Q.push(...ball(x, y, 5.6, 1.5, VEG.onion));
  Q.push(...ball(4, 4, 7.2, 1.5, VEG.onion));
  return Q;
}

/** La balance à plateaux (50 × 20 × 45 cm) : le socle et la colonne de bois, le fléau de fer, deux plateaux de laiton pendus. */
export function scaleModel(): Quad[] {
  const Q: Quad[] = [];
  const iron: Tex = (_s, t, c) => (c.face === 'top' || (c.face === 'S' && t > c.h - 0.6) ? '-' : '_');
  const brass: Tex = (_s, _t, c) => (c.face === 'cap' ? 'J' : c.n[0] < -0.2 ? 'J' : c.n[0] > 0.3 ? 'C' : 'O');
  Q.push(...box(2, 8, 0.5, 3.5, 0, 1.2, P('socle', 3), W(361)));
  Q.push(...box(4.4, 5.6, 1.4, 2.6, 1.2, 8.4, P('colonne', 4), W(362)));
  Q.push(...box(0.4, 9.6, 1.6, 2.4, 8.4, 9.2, P('fléau', 5, '_', 'thin'), iron));
  for (const x of [1.6, 8.4]) {
    for (const dx of [-0.8, 0.8]) Q.push(...bar([x, 2, 8.5], [x + dx, 2, 4.4], 0.3, P('chaînette', 4, '_', 'thin'), iron));
    Q.push(...cylinder([x, 2, 3.9], [x, 2, 4.4], 1.6, P('plateau', 4.5, 'X'), brass, () => 'J', 10));
  }
  return Q;
}

/** L'ardoise des prix (40 × 10 × 70 cm) sur son piquet, écrite à la craie des deux côtés. */
export function slateModel(): Quad[] {
  const Q: Quad[] = [];
  Q.push(...box(3.4, 4.6, 0.6, 1.8, 0, 9, P('piquet', 3), W(371)));
  const chalk: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), wF = Math.floor(c.w), hF = Math.floor(c.h);
    if (c.face === 'top') return '%';
    if (c.face === 'E' || c.face === 'W' || c.face === 'edge') return '%';
    if (i === 0 || j === 0 || i === wF - 1 || j === hF - 1) return j === hF - 1 ? '^' : '%';
    // trois lignes de prix : un trait, un blanc, un chiffre
    if ((j === 4 || j === 2) && i > 0 && i < wF - 1 && (i === 1 || i === 2 || (i >= 4 && i <= 5 && hash(372, j) < 0.7))) return 'a';
    return hash(373, i, j) < 0.12 ? 'z' : 'Z';
  };
  Q.push(...box(0, 8, 0.4, 2, 8, 14.5, P('ardoise', 4, '~'), chalk));
  return Q;
}

// =====================================================================================================================
// 13.6 La mercière : le comptoir, le casier à tiroirs, le présentoir à rubans, l'ouvroir
// =====================================================================================================================

/** Un panneau de menuiserie vu de face : les montants tous les `pitch` px, la traverse haute, la plinthe, les panneaux en retrait. */
const panelled = (seed: number, pitch = 10): Tex => (s, t, c) => {
  const i = Math.floor(s), j = Math.floor(t), hF = Math.floor(c.h);
  if (c.face === 'top') return dash(seed, j, i, 0.3) ? '*' : '^';
  if (c.face === 'E' || c.face === 'N' || c.face === 'edge' || c.face === 'under') return '%';
  if (c.face === 'W') return '*';
  if (j < 2) return '&';
  if (j >= hF - 2) return j === hF - 1 ? '^' : '*';
  const m = ((i % pitch) + pitch) % pitch;
  if (m === 0) return '^';
  if (m === 1 || m === pitch - 1) return m === 1 ? '*' : '%';
  if (j === hF - 3 || m === 2) return '%';
  if (j === 2 || m === pitch - 2) return '^';
  return dash(seed, i, j, 0.3) ? '%' : '*';
};

/** Le comptoir simple, 200 × 60 × 95 cm : le corps à panneaux, le dessus débordant ; dessus, trois bobines et un ruban roulé. */
export function counterModel(goods: 'haberdashery' | 'cloth' | 'none' = 'haberdashery'): Quad[] {
  const Q: Quad[] = [];
  Q.push(...box(0, 40, 1, 12, 0, 18, P('comptoir', 3), panelled(381)));
  Q.push(...box(-0.5, 40.5, 0, 12.5, 18, 19, P('dessus', 4), W(382)));
  const spool = (x: number, y: number, R: string) => Q.push(...cylinder([x, y, 19], [x, y, 20.6], 1, P('bobine', 5, R[2]), (_s, _t, c) => (c.n[0] < -0.2 ? R[0] : R[1]), () => R[0], 8));
  if (goods === 'haberdashery') {
    spool(4, 4, 'ρσ τ'.replace(' ', '')); spool(7, 4.5, 'αβγ'); spool(5.5, 7.5, 'adD');
    Q.push(...box(12, 20, 3, 5, 19, 19.6, P('ruban', 5, 'σ'), () => 'ρ'));
    Q.push(...box(28, 36, 5, 9, 19, 19.4, P('coffret', 5, '&'), (_s, _t, c) => (c.face === 'top' ? 'a' : '%')));
  }
  if (goods === 'cloth') {
    Q.push(...box(3, 11, 3, 9, 19, 21, P('coupon', 4, 'τ'), (_s, t, c) => (c.face === 'top' ? 'ρ' : Math.floor(t * 2) % 2 ? 'σ' : 'τ')));
    Q.push(...box(13, 21, 4, 9, 19, 20.5, P('coupon', 4, 'δ'), (_s, t, c) => (c.face === 'top' ? 'α' : Math.floor(t * 2) % 2 ? 'β' : 'γ')));
  }
  return Q;
}

/** Le casier à tiroirs, 160 × 45 × 180 cm : quatre colonnes de six tiroirs à bouton, la corniche, la plinthe ; un tiroir tiré (des boutons). */
export function cabinetModel(): Quad[] {
  const Q: Quad[] = [];
  const drawers: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return '^';
    if (c.face !== 'S') return c.face === 'W' ? '*' : '%';
    if (j < 2) return '&';
    const jj = j - 2, col = Math.floor(i / 8), x = i - col * 8, row = Math.floor(jj / 5), y = jj - row * 5;
    if (x === 0 || y === 0) return '&';
    if (x === 7) return '%';
    if (x === 4 && y === 2) return '@';
    if (y === 4) return '^';
    return dash(391 + col, row, i, 0.25) ? '%' : '*';
  };
  Q.push(...box(0, 32, 0, 9, 0, 33, P('casier', 3), drawers));
  Q.push(...box(-0.6, 32.6, -0.4, 9.6, 33, 35, P('corniche', 4), W(392)));
  // le tiroir tiré : la 2e colonne, le 4e rang ; dedans, des boutons d'os et de corne
  const z0 = 2 + 3 * 5 + 1;
  Q.push(...box(9, 15, 7, 12, z0, z0 + 3.5, P('tiroir', 5), (s, t, c) => {
    if (c.face !== 'top') return c.face === 'S' ? (Math.floor(t) === 1 && Math.floor(s) === 3 ? '@' : '*') : '%';
    const i = Math.floor(s), j = Math.floor(t);
    if (i === 0 || i === Math.floor(c.w) - 1 || j === 0 || j === Math.floor(c.h) - 1) return '^';
    return hash(393, i, j) < 0.45 ? 'a' : hash(394, i, j) < 0.5 ? 'C' : '!';
  }));
  return Q;
}

const RIBBONS = ['ρστ', 'αβγ', 'bOC', 'adD', 'LlV'.replace('V', 'k'), 'ρστ', 'βγδ', 'adD'];
/** Le présentoir à rubans, 100 × 40 × 150 cm : deux montants sur patins, trois barres, les rubans qui pendent, les bobines en bas. */
export function ribbonRackModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [0, 18.5]) {
    Q.push(...box(x, x + 1.5, 3.2, 4.8, 0, 30, P('montant', 4), W(401 + x)));
    Q.push(...box(x - 0.5, x + 2, 0, 8, 0, 1.2, P('patin', 3), W(402 + x)));
  }
  [28, 20, 12].forEach((z, r) => {
    Q.push(...box(1.5, 18.5, 3.6, 4.4, z, z + 0.8, P('barre', 5, 'K', 'thin'), W(403 + r)));
    for (let k = 0; k < 7; k++) {
      const x = 2.4 + k * 2.3 + (r % 2) * 0.8;
      if (x + 1.4 > 18.2) continue;
      const R = RIBBONS[(k + r * 3) % RIBBONS.length], len = 4 + Math.floor(hash(404, k, r) * 3);
      Q.push(...box(x, x + 1.4, 4.4, 4.8, z - len, z + 0.4, P('ruban', 6, R[2], 'none'), (s) => (s < 0.6 ? R[0] : R[1])));
    }
  });
  // la tablette du bas et ses bobines
  Q.push(...box(1.5, 18.5, 1.5, 6.5, 4, 5, P('tablette', 4), W(409)));
  for (let k = 0; k < 6; k++) {
    const R = RIBBONS[k], x = 3 + k * 2.6;
    Q.push(...cylinder([x, 4, 5], [x, 4, 6.6], 1, P('bobine', 5, R[2]), (_s, _t, c) => (c.n[0] < -0.2 ? R[0] : R[1]), () => R[0], 8));
  }
  return Q;
}

/** L'ouvroir fermé (160 × 5 × 80 cm) : le volet de planches debout, deux barres, les pentures du bas, les pieds repliés contre lui. */
export function flapClosedModel(): Quad[] {
  const Q: Quad[] = [];
  Q.push(...box(0, 32, 0, 1, 0, 16, P('volet', 3, '&'), boards(411, 4, [2, 13])));
  const iron: Tex = (_s, t, c) => (c.face === 'top' || (c.face === 'S' && t > c.h - 0.6) ? '-' : '_');
  for (const x of [5, 25]) Q.push(...box(x, x + 3, 1, 1.4, 0.5, 1.5, P('penture', 4, '_', 'thin'), iron));
  for (const x of [1.5, 29]) Q.push(...box(x, x + 1.5, 1, 2, 1, 15, P('pied replié', 4), W(412 + x)));
  return Q;
}
/** L'ouvroir rabattu en comptoir (160 × 80 × 90 cm) : le volet couché à 90 cm, ses deux pieds dépliés, deux pots de pommade dessus. */
export function flapOpenModel(): Quad[] {
  const Q: Quad[] = [];
  const top: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face !== 'top') return c.face === 'S' ? '%' : '&';
    if (i % 4 === 3) return '@';
    if (j === 2 || j === 13) return '%';
    return i % 4 === 0 ? '^' : dash(413, i, j, 0.4) ? '%' : '*';
  };
  Q.push(...box(0, 32, 0, 16, 17, 18, P('volet', 4, '&'), top));
  for (const x of [1.5, 29]) Q.push(...box(x, x + 1.5, 13.5, 15, 0, 17, P('pied', 3), W(414 + x)));
  for (const [x, R] of [[8, 'adD'], [11, 'αβγ']] as const) Q.push(...cylinder([x, 8, 18], [x, 8, 19.6], 1, P('pot', 5, R[2]), (_s, _t, c) => (c.n[0] < -0.2 ? R[0] : R[1]), () => 'Z', 8));
  return Q;
}

// =====================================================================================================================
// 13.7 La tailleuse : le bardage à clins, la galerie, le portail, la palissade, et ce que vendent et font les deux boutiques
// =====================================================================================================================

/** Le pan de bardage à clins, 160 × 15 × 260 cm : les clins sur l'ossature, les planches d'angle debout aux deux bouts. */
export function clapboardWallModel(): Quad[] {
  const Q: Quad[] = [];
  Q.push(...box(2, 30, 0, 3, 0, 52, P('bardage', 2, 'K'), clapboard(421)));
  for (const x of [0, 30]) Q.push(...box(x, x + 2, 0, 3.4, 0, 52, P('planche d angle', 3, 'K'), timber(422 + x)));
  return Q;
}

export const GALLERY = { d: 20, floor: 57, rail: 20 };
/**
 * La galerie de bois à l'étage (la travée de la pièce : 360 × 160 cm, le garde-corps à 3,85 m) : les poteaux de 20 × 20 au sol, la
 * sablière de galerie, les solives (leurs bouts au sud), le plancher, le garde-corps (lisse basse, balustres de 5 cm tous les 15 cm,
 * main courante). `posts` : les x des poteaux ; la galerie court de x0 à x1, de y 0 (le nu du mur) à `d`.
 */
export function galleryModel(x0: number, x1: number, posts: number[], d = GALLERY.d): Quad[] {
  const Q: Quad[] = [], z = GALLERY.floor, top = z + GALLERY.rail;
  const T = (n: string, prio = 6) => P(n, prio, 'K', 'full', { eave: true });
  for (const x of posts) {
    Q.push(...box(x - 2, x + 2, d - 4, d, 0, z - 5, T('poteau', 5), timber(431 + x, [[1, 2], [2, 30]])));
    Q.push(...box(x - 1.5, x + 1.5, d - 3.5, d - 0.5, z + 1, top + 1, T('poteau de garde-corps', 6.5), timber(432 + x)));
  }
  Q.push(...box(x0, x1, d - 4, d, z - 5, z - 1, T('sablière de galerie', 7), timber(433)));
  // les solives, du mur à la sablière : on voit leur bout au-dessus de la sablière
  for (let x = x0 + 4; x < x1 - 2; x += 8) Q.push(...box(x, x + 2, 0, d - 4, z - 4, z - 1, T('solive', 4), timber(434 + x)));
  Q.push(...box(x0, x1, 0, d, z - 1, z, T('plancher', 6.2), (_s, _t, c) => (c.face === 'top' ? (Math.floor(c.p[0]) % 5 === 4 ? '%' : dash(435, Math.floor(c.p[0]), Math.floor(c.p[1]), 0.3) ? '*' : '^') : '%')));
  // le garde-corps
  const ys: [number, number] = [d - 3, d - 1.5];
  Q.push(...box(x0, x1, ys[0], ys[1], z, z + 1.5, T('lisse basse', 6.8), timber(436)));
  Q.push(...box(x0, x1, d - 3.5, d - 1, top - 1.5, top, T('main courante', 7), timber(437)));
  for (let x = x0 + 2; x < x1 - 1; x += 3) {
    if (posts.some((p) => Math.abs(p - x - 0.5) < 2.5)) continue;
    Q.push(...box(x, x + 1, ys[0] + 0.2, ys[1] - 0.2, z + 1.5, top - 1.5, P('balustre', 6.6, 'K', 'thin', { eave: true }), (_s, _t, c) => (c.face === 'top' ? '^' : c.face === 'W' ? '^' : '*')));
  }
  return Q;
}

export const GATE = { w: 56, post: 4, h: 40, leafH: 36 };
/**
 * Le portail de cour (280 × 20 × 200 cm) : deux poteaux de chêne coiffés, deux battants de planches debout de 1,20 m (traverses et
 * écharpe au revers). `open` : les battants ouverts à angle droit vers le nord (dans la cour : la boutique est ouverte).
 */
export function gateModel(open = false): Quad[] {
  const Q: Quad[] = [], { w, post, h, leafH } = GATE, L = (w - 2 * post) / 2;
  for (const x of [0, w - post]) {
    Q.push(...box(x, x + post, 0, 4, 0, h, P('poteau', 5), timber(441 + x, [[1, 2]])));
    Q.push(...polyPrism(x - 0.5, x + post + 0.5, [[-0.5, h], [2, h + 2.2], [4.5, h]], P('chapeau', 6, '&'), (_s, _t, c) => (c.n[1] < 0 ? '%' : '^')));
  }
  const PL = P('battant', 4, '&');
  if (!open) {
    Q.push(...box(post, post + L, 1.5, 2.5, 1, 1 + leafH, PL, (s, t, c) => (c.face === 'S' ? leafTex(443, L, { latch: 'right' })(s, t, c) : c.face === 'N' ? leafInsideTex(444)(s, t, c) : '%')));
    Q.push(...box(post + L, w - post, 1.5, 2.5, 1, 1 + leafH, P('battant', 4.1, '&'), (s, t, c) => (c.face === 'S' ? leafTex(445, L)(s, t, c) : c.face === 'N' ? leafInsideTex(446)(s, t, c) : '%')));
    return Q;
  }
  // ouverts : chaque battant pivote sur son poteau et se range vers le nord, le long de lui
  Q.push(...box(post, post + 1, 2 - L, 2, 1, 1 + leafH, PL, (s, t, c) => (c.face === 'E' ? leafTex(443, L, { latch: 'right' })(s, t, c) : c.face === 'W' ? leafInsideTex(444)(s, t, c) : '%')));
  Q.push(...box(w - post - 1, w - post, 2 - L, 2, 1, 1 + leafH, PL, (s, t, c) => (c.face === 'W' ? leafTex(445, L)(s, t, c) : c.face === 'E' ? leafInsideTex(446)(s, t, c) : '%')));
  return Q;
}

/**
 * La palissade de planches (la travée de la pièce : 160 × 10 × 160 cm) : des planches debout de 20 à 25 cm, le haut irrégulier, deux
 * lisses au revers, un poteau tous les 1,60 m. Le long de x de 0 à `L` (px).
 */
export function fenceModel(L = 32, seed = 451): Quad[] {
  const Q: Quad[] = [];
  const bt = boardsTex(seed, 5);
  const tex: Tex = (s, t, c) => {
    if (c.face === 'top') return '%';
    const i = Math.floor(s);
    // le haut des planches, un peu inégal (des planches sciées à la main)
    if (t > c.h - 1.5 && hash(seed, Math.floor(i / 5)) < 0.4) return null;
    return c.face === 'S' || c.face === 'N' ? bt(s, t, c) : '%';
  };
  Q.push(...box(0, L, 0.5, 1.5, 0, 32, P('palissade', 3, 'K'), tex));
  for (const z of [7, 26]) Q.push(...box(0, L, 1.5, 2.3, z, z + 1.6, P('lisse', 2.5), timber(seed + z)));
  for (let x = 0; x <= L; x += 32) Q.push(...box(Math.min(x, L - 2), Math.min(x, L - 2) + 2, 1.5, 3.5, 0, 33, P('poteau', 4), timber(seed + 3 + x)));
  return Q;
}

/** Un vêtement pendu à une perche (vu de face) : la silhouette d'épaules, les plis, la rampe [lumière, teinte, ombre, sombre]. */
function garment(x: number, yc: number, zTop: number, w: number, h: number, R: string, kind: 'shirt' | 'cape' | 'hood', seed: number): Quad[] {
  const halfAt = (u: number) => { // u : 0 en haut, 1 en bas ; la demi-largeur
    if (u < 0.06) return 0.6;
    if (kind === 'hood') return u < 0.45 ? (w / 2) * (0.5 + u) : (w / 2) * (1 - (u - 0.45) * 0.6);
    if (kind === 'cape') return (w / 2) * Math.min(1, 0.55 + u * 0.9);
    return (w / 2) * (u < 0.2 ? 0.75 + u : 1);
  };
  const tex: Tex = (s, t, c) => {
    if (c.face === 'top' || c.face === 'under') return null;
    if (c.w < 3) return t < c.h - 1 ? R[1] : null;
    const u = 1 - t / c.h, hw = halfAt(u), dx = s - c.w / 2;
    if (Math.abs(dx) > hw) return null;
    if (u < 0.06) return '%';
    const i = Math.floor(s);
    if ((i + seed) % 3 === 0 && u > 0.25) return R[2];
    return dx < -hw * 0.4 ? R[0] : R[1];
  };
  return box(x, x + w, yc - 1, yc + 1, zTop - h, zTop, P('vêtement', 5, R[3]), tex);
}
/** La perche à habits, 200 × 40 × 170 cm : deux montants sur patins, la perche, cinq vêtements (chemise, cotte, chaperon, cape, tunique). */
export function clothesRackModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [0.5, 38]) {
    Q.push(...box(x, x + 1.5, 3.2, 4.8, 0, 34, P('montant', 4), W(461 + x)));
    Q.push(...box(x - 0.5, x + 2, 0, 8, 0, 1.2, P('patin', 3), W(462 + x)));
  }
  Q.push(...box(0, 40, 3.5, 4.5, 32, 33, P('perche', 6, 'K', 'thin'), W(463)));
  const items: [number, number, number, string, 'shirt' | 'cape' | 'hood'][] = [
    [2.5, 6, 17, 'adDE', 'shirt'], [9, 7, 20, 'αβγδ', 'shirt'], [16.5, 6, 10, 'ρστσ', 'hood'], [23, 8, 26, 'BQQK'.replace('K', 'K'), 'cape'], [31.5, 6, 18, 'LlkV', 'shirt'],
  ];
  items.forEach(([x, w, h, R, kind], k) => Q.push(...garment(x, 4 + (k % 2) * 0.3, 32, w, h, R, kind, k)));
  return Q;
}

/** Le mannequin d'osier (Ø 45 × 160 cm) : le trépied, la colonne, le buste d'osier, habillé d'une robe de garance. */
export function dressFormModel(): Quad[] {
  const Q: Quad[] = [], c: V3 = [4.5, 4.5, 0];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    Q.push(...bar([c[0], c[1], 7], [c[0] + Math.cos(a) * 4, c[1] + Math.sin(a) * 4, 0], 0.9, P('pied', 3), W(471 + k)));
  }
  Q.push(...box(4, 5, 4, 5, 0, 13, P('colonne', 4), W(474)));
  // le buste : des tranches rondes, le rayon de la hanche à l'épaule ; la robe jusqu'à l'encolure
  const R = (z: number) => (z < 13 ? 0 : z < 15 ? 4.2 : z < 19 ? 3.7 - (z - 15) * 0.2 : z < 23 ? 2.9 + (z - 19) * 0.15 : z < 27 ? 3.5 : z < 29 ? 3.5 - (z - 27) * 0.9 : 0.9);
  const robe = (z: number) => z < 27.5;
  const cloth: Tex = (s, _t, cx) => (cx.face === 'cap' ? 'ρ' : cx.n[0] < -0.3 ? 'ρ' : cx.n[0] > 0.4 ? 'τ' : Math.floor(s) % 2 ? 'σ' : 'ρ');
  for (let z = 13; z < 31; z += 1.5) {
    const r = R(z);
    Q.push(...cylinder([4.5, 4.5, z], [4.5, 4.5, z + 1.5], r, P('buste', robe(z) ? 4 : 4.2, robe(z) ? 'τ' : 'X'), robe(z) ? cloth : wicker, () => (robe(z) ? 'ρ' : 'O'), 12));
  }
  Q.push(...box(4, 5, 4, 5, 31, 32.5, P('pommeau', 5), W(475)));
  return Q;
}

/** Les choses du râtelier d'équipement, chacune une petite boîte de couleur. */
function gearItems(): Quad[] {
  const Q: Quad[] = [];
  const thing = (x0: number, x1: number, z0: number, z1: number, R: string, name: string, round = false) => {
    const tex: Tex = (s, t, c) => {
      if (c.face === 'top') return R[0];
      if (c.face !== 'S') return R[2];
      if (round) { const dx = (s - c.w / 2) / (c.w / 2), dz = (t - c.h / 2) / (c.h / 2); if (dx * dx + dz * dz > 1.15) return null; }
      return s < c.w * 0.35 ? R[0] : t < 1 ? R[2] : R[1];
    };
    Q.push(...box(x0, x1, 2.5, 4.5, z0, z1, P(name, 5, R[3]), tex));
  };
  // en haut : trois sacs et besaces de cuir, une outre
  thing(2, 8, 27, 33, 'UunN', 'sac'); thing(9.5, 14.5, 28, 33, 'MmNK', 'besace'); thing(16, 22, 26.5, 33, 'Uune', 'sac');
  thing(24, 28.5, 27, 32.5, 'MmNK', 'outre', true); thing(30, 37, 27.5, 33, 'unNK', 'besace');
  // au milieu : ceintures, fourreaux, la corde
  for (const x of [2.5, 4.5, 6.5]) thing(x, x + 1.2, 13, 23, 'mNKK', 'ceinture');
  thing(9.5, 11, 11, 23, 'NKKo'.replace('o', 'K'), 'fourreau'); thing(12.5, 14, 13, 23, 'mNKK', 'fourreau');
  Q.push(...cylinder([20, 3.5, 17.5], [20, 4.5, 17.5], 3.6, P('corde', 5, 'X'), (s, _t, c) => (c.n[0] < -0.2 || c.n[2] > 0.5 ? 'J' : Math.floor(s) % 2 ? 'O' : 'C'), (s, t) => (Math.hypot(s - 3.6, t - 3.6) < 1.6 ? null : Math.floor(s + t) % 2 ? 'O' : 'J'), 12));
  thing(26, 31, 15, 22, 'UunN', 'sac'); thing(32.5, 37, 16, 22, 'MmNK', 'outre', true);
  // en bas : deux lanternes de fer et de corne, une outre
  const lantern = (x: number) => {
    const tex: Tex = (s, t, c) => (c.face === 'top' ? '-' : c.face !== 'S' ? '_' : Math.floor(t) === 0 || Math.floor(t) >= Math.floor(c.h) - 1 || Math.floor(s) === 0 || Math.floor(s) === Math.floor(c.w) - 1 ? '_' : 'J');
    Q.push(...box(x, x + 3, 2.6, 4.4, 4, 9, P('lanterne', 5, '_'), tex));
    Q.push(...box(x + 1, x + 2, 3, 4, 9, 10.5, P('anse', 5, '_', 'thin'), () => '_'));
  };
  lantern(4); lantern(10);
  thing(16, 21, 3.5, 9.5, 'UunN', 'sac'); thing(23, 27, 4, 10, 'MmNK', 'outre', true);
  return Q;
}
/** Le râtelier d'équipement, 200 × 40 × 180 cm : le bâti, trois barres à chevilles, les sacs, outres, ceintures, fourreaux, cordes, lanternes. */
export function gearRackModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [0, 38.5]) {
    Q.push(...box(x, x + 1.5, 0.5, 2, 0, 36, P('montant', 4), W(481 + x)));
    Q.push(...box(x - 0.3, x + 1.8, 0, 8, 0, 1.2, P('patin', 3), W(482 + x)));
  }
  for (const [z, k] of [[34, 0], [24, 1], [11, 2]] as const) {
    Q.push(...box(1.5, 38.5, 0.8, 2, z, z + 1.4, P('barre', 4.5), W(483 + k)));
  }
  Q.push(...gearItems());
  return Q;
}

/** Le présentoir à couteaux et à haches, 120 × 50 × 100 cm : quatre pieds, le pupitre incliné, la baguette d'arrêt, les lames posées. */
export function knifeDisplayModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [0.5, 21.5]) for (const y of [1, 8]) Q.push(...box(x, x + 2, y, y + 1.5, 0, y < 4 ? 19 : 14, P('pied', 3), W(491 + x + y)));
  const blades: Tex = (s, t, c) => {
    if (c.n[2] < 0.5) return '%';
    const i = Math.floor(s), j = Math.floor(t * 0.8);
    // cinq couteaux (lame, mitre, manche), deux hachettes (le fer, le manche)
    for (let k = 0; k < 5; k++) {
      const x = 2 + k * 3;
      if (i === x) { if (j <= 3) return j === 0 ? '!' : '-'; if (j === 4) return '_'; if (j <= 7) return j % 2 ? '%' : '&'; }
    }
    for (const x of [18, 21]) {
      if (i >= x - 1 && i <= x + 1 && j >= 6 && j <= 8) return j === 8 ? '-' : '_';
      if (i === x && j <= 5) return j % 2 ? '%' : '*';
    }
    return hash(492, i, j) < 0.15 ? '%' : '*';
  };
  Q.push(...polyPrism(0, 24, [[10, 14], [10, 15], [0, 20], [0, 19]], P('pupitre', 4), blades));
  Q.push(...box(0, 24, 9.4, 10.4, 15, 16, P('baguette', 5), W(493)));
  return Q;
}

/** L'établi du cuir, 180 × 60 × 85 cm : le plateau épais, les pieds, la pince de bourrelier dressée à l'est, un cuir, l'alêne, le tranchet. */
export function saddlerBenchModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [1, 32]) for (const y of [1, 9.5]) Q.push(...box(x, x + 2, y, y + 1.5, 0, 15, P('pied', 3), W(501 + x + y)));
  Q.push(...box(1, 34, 1.5, 10.5, 4, 5, P('tablette', 3), W(502)));
  Q.push(...box(0, 36, 0, 12, 15, 17, P('plateau', 4), W(503)));
  // un cuir à demi taillé, un rouleau, l'alêne et le tranchet, un pot de colle
  Q.push(...box(4, 15, 2, 9, 17, 17.4, P('cuir', 5, 'N'), (s, t, c) => (c.face === 'top' ? (Math.hypot(s - 11, t - 7) < 2.2 ? null : s < 3 ? 'U' : 'u') : 'n')));
  Q.push(...cylinder([17, 3, 18.2], [23, 3, 18.2], 1.2, P('rouleau', 5, 'N'), (_s, _t, c) => (c.n[2] > 0.5 ? 'u' : c.n[1] > 0 ? 'n' : 'e'), () => 'U', 8));
  Q.push(...box(17, 21, 7, 7.6, 17, 17.5, P('tranchet', 5, '_', 'thin'), () => '-'));
  Q.push(...box(22, 22.6, 7, 10, 17, 17.6, P('alêne', 5, '_', 'thin'), (_s, t) => (t > 1 ? '%' : '-')));
  Q.push(...cylinder([26, 8, 17], [26, 8, 18.6], 1.1, P('pot', 5, 'Z'), (_s, _t, c) => (c.n[0] < -0.2 ? 'r' : 'z'), () => 'K', 8));
  // la pince : deux mâchoires de bois serrées, dressées au bout est
  Q.push(...box(29.5, 31, 4, 8, 17, 27, P('mâchoire', 5), W(504)));
  Q.push(...box(31.2, 32.7, 4, 8, 17, 27, P('mâchoire', 5.1), W(505)));
  Q.push(...box(29, 33.2, 3.6, 8.4, 20, 21, P('lien', 5.2, 'X'), () => 'C'));
  return Q;
}

/** Les peaux pendues, 200 × 10 × 150 cm : la perche sur deux montants, trois peaux tannées (fauve, brune, crue) aux pattes étirées. */
export function hidesModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [0, 38.5]) {
    Q.push(...box(x, x + 1.5, 0.5, 1.5, 0, 30, P('montant', 4), W(511 + x)));
    Q.push(...box(x - 0.5, x + 2, -1.5, 3.5, 0, 1, P('patin', 3), W(512 + x)));
  }
  Q.push(...box(0, 40, 0.5, 1.5, 28, 29, P('perche', 6, 'K', 'thin'), W(513)));
  const hide = (x: number, w: number, h: number, R: string, seed: number) => {
    const shape = (s: number, t: number) => {
      const u = 1 - t / h, v = (s - w / 2) / (w / 2);
      // le corps en tonneau, les quatre pattes aux coins, l'encolure en haut
      const body = Math.abs(v) < 0.78 - 0.18 * Math.abs(u - 0.5) && u > 0.06 && u < 0.94;
      const leg = Math.abs(v) > 0.6 && Math.abs(v) < 1 && (u < 0.24 || u > 0.78) && Math.abs(v) - 0.6 < (u < 0.24 ? 0.24 - u : u - 0.78) * 2.2;
      const edge = hash(seed, Math.floor(s), Math.floor(t)) < 0.12 && Math.abs(v) > 0.66;
      return (body || leg) && !edge;
    };
    const tex: Tex = (s, t, c) => {
      if (c.face !== 'S') return c.face === 'top' ? null : R[2];
      if (!shape(s, t)) return null;
      const v = (s - w / 2) / (w / 2);
      return v < -0.35 ? R[0] : hash(seed + 1, Math.floor(s / 2), Math.floor(t / 3)) < 0.25 ? R[2] : R[1];
    };
    Q.push(...box(x, x + w, 1.6, 2, 28 - h, 28, P('peau', 5, R[3]), tex));
  };
  hide(1.5, 12, 22, 'UunN', 521); hide(14, 12.5, 24, 'MmNK', 522); hide(27, 11.5, 20, 'dDEN', 523);
  return Q;
}

// =====================================================================================================================
// COPIÉ de maison-coq:art/proposals/coq-catalogue-bois.ts : la table de la tailleuse, le coupon d'étoffe (pièces existantes du coq)
// =====================================================================================================================

const F = (name: string, prio = 3, dark = 'K') => part(name, prio, dark, 'full');
/** La table de la tailleuse (140 × 70 × 75 cm), copiée du coq : le plateau, trois coupons, les ciseaux, le panier à ouvrage. */
export function tailorTableQuads(): Quad[] {
  const Q: Quad[] = [], wood = furnWood(81);
  for (const x of [0, 26]) for (const y of [0, 12]) Q.push(...box(x, x + 2, y, y + 2, 0, 14, F('pied'), wood));
  Q.push(...box(0, 28, 0, 14, 14, 15, F('plateau', 2), wood));
  const bolt = (x: number, y: number, w: number, d: number, h: number, R: string) => Q.push(...box(x, x + w, y, y + d, 15, 15 + h, F('coupon', 3), { top: (s) => (Math.floor(s) % 4 === 0 ? R[1] : R[0]), side: (_s, t) => (Math.floor(t * 2) % 2 ? R[1] : R[2]) }));
  bolt(2, 2, 9, 6, 2, 'ρστ'); bolt(13, 1, 8, 5, 1.5, 'αβγ'); bolt(3, 8, 7, 5, 1, 'adD');
  Q.push(...box(22, 26, 9, 12, 15, 15.4, F('ciseaux', 4), () => 'Z'));
  for (let k = 0; k < 10; k++) {
    const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2;
    const p0: V3 = [24 + 2.5 * Math.cos(a0), 4 + 2.5 * Math.sin(a0), 15], p1: V3 = [24 + 2.5 * Math.cos(a1), 4 + 2.5 * Math.sin(a1), 15];
    Q.push(quad(p0, sub(p1, p0), [0, 0, 3], [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0], F('panier', 3), (_s, t) => (Math.floor(t) % 2 ? 'O' : 'C')));
  }
  Q.push(...box(21.5, 26.5, 1.5, 6.5, 17.5, 18, F('ouvrage', 2.9), () => 'J'));
  return Q;
}
/** Le coupon d'étoffe plié (40 × 30 × 10 cm), copié du coq : les plis sur la face, la lisière dessus. */
export function clothBoltQuads(kind: 'red' | 'blue' | 'linen'): Quad[] {
  const R = kind === 'red' ? 'ρστ' : kind === 'blue' ? 'αβγ' : 'adD';
  const tex: Tex = (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t * 2);
    if (c.face === 'top') return i % 4 === 3 ? R[1] : R[0];
    if (c.n[0] > 0.5) return R[2];
    return j % 2 ? R[1] : (i === 0 ? R[0] : R[2]);
  };
  const dark = kind === 'red' ? 'τ' : kind === 'blue' ? 'δ' : 'E';
  return box(0, 8, 0, 6, 0, 2, part('coupon', 2, dark, 'full'), tex);
}

// =====================================================================================================================
// Le catalogue
// =====================================================================================================================

const VIEW_ROT: Rot[] = [0, 3, 2, 1];
export interface PieceModel {
  key: string;
  name: string;
  dims: { w: number; d: number; h: number };
  /** Les bâtiments de la place qui s'en servent. */
  users: string[];
  views: 1 | 2 | 4;
  ground: boolean;
  /** Ce que la planche écrit sous la pièce. */
  note: string;
  /** Pourquoi une vue ne remplit pas sa boîte (la forme de l'objet) : la planche le dit au lieu de « hors gabarit ». */
  form?: string;
  model(): Quad[];
}

export const PIECE_MODELS: PieceModel[] = [
  // la ferme rivale
  { key: 'rough-stall', name: 'Étal de planches sur tréteaux (une travée, garni)', dims: { w: 320, d: 70, h: 95 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'planches brutes sur deux tréteaux ; choux, raves, poireaux, pommes en tas (80 cm, 95 avec les légumes)', model: () => roughStallModel(0) },
  { key: 'rough-stall-s1', name: 'Étal de planches sur tréteaux (second tirage)', dims: { w: 320, d: 70, h: 95 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'oignons, carottes en bottes, choux', model: () => roughStallModel(1) },
  { key: 'plank-awning-poles', name: 'Auvent de planches sur perches', dims: { w: 660, d: 270, h: 245 }, users: ['p-ferme-rivale'], views: 4, ground: true, note: 'quatre perches, deux pannes, planches mal jointes ; 2 m au nord, 2,40 m au sud (débords compris)', form: 'le pan penche vers le nord : son bord nord est à 2 m, pas au haut de la boîte', model: awningModel },
  { key: 'vegetable-crate', name: 'Cageot de légumes : choux', dims: { w: 50, d: 35, h: 40 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'lattes du vannier, deux choux', model: () => crateModel(0) },
  { key: 'vegetable-crate-s1', name: 'Cageot de légumes : raves et poireaux', dims: { w: 50, d: 35, h: 40 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'second tirage', model: () => crateModel(1) },
  { key: 'vegetable-crate-s2', name: 'Cageot de légumes : pommes', dims: { w: 50, d: 35, h: 40 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'troisième tirage', model: () => crateModel(2) },
  { key: 'vegetable-basket', name: 'Panier d’oignons', dims: { w: 40, d: 40, h: 45 }, users: ['p-ferme-rivale'], views: 1, ground: false, note: 'osier tressé, plein d’oignons (30 cm, 45 avec le tas)', model: basketModel },
  { key: 'scale', name: 'Balance à plateaux', dims: { w: 50, d: 20, h: 45 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'colonne de bois, fléau de fer, plateaux de laiton', model: scaleModel },
  { key: 'price-slate', name: 'Ardoise des prix', dims: { w: 40, d: 10, h: 72 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'sur son piquet, écrite des deux côtés', model: slateModel },
  // la mercière
  { key: 'shop-counter', name: 'Comptoir simple', dims: { w: 200, d: 60, h: 95 }, users: ['p-merciere', 'p-tailleuse'], views: 4, ground: false, note: 'à panneaux ; dessus, des bobines, un ruban, un coffret', model: () => counterModel('haberdashery') },
  { key: 'haberdashery-cabinet', name: 'Casier à tiroirs', dims: { w: 160, d: 60, h: 175 }, users: ['p-merciere'], views: 4, ground: false, note: '24 tiroirs à bouton, la corniche ; un tiroir tiré (45 cm de fond, 60 avec le tiroir), des boutons', model: cabinetModel },
  { key: 'ribbon-rack', name: 'Présentoir à rubans', dims: { w: 100, d: 40, h: 150 }, users: ['p-merciere'], views: 4, ground: false, note: 'trois barres de rubans, des bobines', model: ribbonRackModel },
  { key: 'shop-flap', name: 'Ouvroir (volet fermé)', dims: { w: 160, d: 10, h: 80 }, users: ['p-merciere'], views: 4, ground: false, note: 'le volet de planches, ses pentures en bas, ses pieds repliés', model: flapClosedModel },
  { key: 'shop-flap-open', name: 'Ouvroir rabattu en comptoir', dims: { w: 160, d: 80, h: 90 }, users: ['p-merciere'], views: 4, ground: false, note: 'à 90 cm sur ses deux pieds dépliés ; deux pots de pommade', form: 'de dos (R2), les pieds sont au fond : le bord sud de la boîte est en l’air', model: flapOpenModel },
  // la tailleuse
  { key: 'clapboard-wall', name: 'Bardage à clins', dims: { w: 160, d: 17, h: 260 }, users: ['p-tailleuse'], views: 4, ground: true, note: 'planches horizontales de 20 cm qui se recouvrent, planches d’angle', model: clapboardWallModel },
  { key: 'timber-gallery', name: 'Galerie de bois (une travée)', dims: { w: 380, d: 100, h: 390 }, users: ['p-tailleuse'], views: 4, ground: true, note: '1 m de large (1,60 m cachait les boutiques), poteaux de 20 cm, plancher à 2,85 m, garde-corps à balustres de 1 m', form: 'le plancher et le garde-corps sont au sud, le haut de la boîte n’est pas au nord', model: () => galleryModel(-2, 74, [0, 72]) },
  { key: 'yard-gate', name: 'Portail de cour', dims: { w: 280, d: 20, h: 211 }, users: ['p-tailleuse'], views: 4, ground: true, note: 'deux battants de 1,20 m, poteaux coiffés', model: () => gateModel(false) },
  { key: 'yard-fence', name: 'Palissade de planches', dims: { w: 160, d: 18, h: 165 }, users: ['p-tailleuse', 'p-merciere'], views: 2, ground: true, note: 'planches debout, deux lisses au revers', model: () => fenceModel() },
  { key: 'clothes-rack', name: 'Perche à habits', dims: { w: 200, d: 40, h: 170 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'chemise, cotte de guède, chaperon de garance, cape, tunique', model: clothesRackModel },
  { key: 'dress-form', name: 'Mannequin d’osier', dims: { w: 45, d: 45, h: 155 }, users: ['p-tailleuse'], views: 1, ground: false, note: 'sur son trépied, habillé d’une robe de garance', model: dressFormModel },
  { key: 'gear-rack', name: 'Râtelier d’équipement', dims: { w: 200, d: 40, h: 180 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'sacs, besaces, outres, ceintures, fourreaux, corde, lanternes', form: 'de dos, le bâti est devant les sacs', model: gearRackModel },
  { key: 'knife-display', name: 'Présentoir à couteaux et à haches', dims: { w: 120, d: 50, h: 100 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'pupitre incliné : cinq couteaux, deux hachettes (le forgeron)', form: 'de dos, le haut du pupitre est devant', model: knifeDisplayModel },
  { key: 'saddler-bench', name: 'Établi du cuir', dims: { w: 180, d: 60, h: 135 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'plateau à 85 cm, la pince de bourrelier dressée (1,35 m), cuir, alêne, tranchet', form: 'vue de l’ouest (R1), la pince haute est devant, pas au fond de la boîte', model: saddlerBenchModel },
  { key: 'leather-hides', name: 'Peaux pendues', dims: { w: 200, d: 25, h: 150 }, users: ['p-tailleuse'], views: 2, ground: false, note: 'trois peaux tannées sur une perche', model: hidesModel },
];

const viewCache = new Map<string, Grid>();
/** La vue v (0 à 3) d'une pièce, rendue comme le jeu (meuble : dessus à ½ et ombre portée ; bâtiment : k = 1). */
export function pieceGrid(m: PieceModel, v: number): Grid {
  const key = `${m.key}:${v}`;
  let g = viewCache.get(key);
  if (!g) {
    const r = renderPiece(rotQuads(m.model(), VIEW_ROT[v % 4], [0, 0]), { k: m.ground ? 1 : 0.5 });
    g = m.ground ? r : withGroundShadow(r);
    viewCache.set(key, g);
  }
  return g;
}
export const pieceModel = (key: string): PieceModel => {
  const m = PIECE_MODELS.find((p) => p.key === key);
  if (!m) throw new Error(`place-sud : pas de pièce « ${key} »`);
  return m;
};
/** Une grille d'un modèle quelconque (meuble, k = ½, avec son ombre). */
export function furnitureGrid(q: Quad[], v = 0): Grid {
  return withGroundShadow(renderPiece(rotQuads(q, VIEW_ROT[v % 4], [0, 0]), { k: 0.5 }));
}

/** Les pièces nouvelles, selon l'interface commune (art/proposals/village-types.ts ; `houses` vide : ce sont les bâtiments de la place, `PIECE_USERS`). */
export const PIECES: VillagePiece[] = PIECE_MODELS.map((m) => ({
  key: m.key,
  name: m.name,
  dims: m.dims,
  houses: [] as HouseId[],
  views: (): Img[] => Array.from({ length: m.views }, (_, v) => ({ grid: pieceGrid(m, v), pal: palette })),
}));
/** Les bâtiments de la place qui se servent de chaque pièce (l'interface des maisons n'a que `houses`). */
export const PIECE_USERS: Record<string, string[]> = Object.fromEntries(PIECE_MODELS.map((m) => [m.key, m.users]));
export const PIECE_NOTES: Record<string, string> = Object.fromEntries(PIECE_MODELS.map((m) => [m.key, m.note]));
export { unit };
