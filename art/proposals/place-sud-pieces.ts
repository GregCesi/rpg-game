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
import { ball, ballHeap, bar, clapboard, leanToX, quad } from './place-sud-lib';

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
  pear: 'pyGv', // la poire : le jaune-vert
  plum: 'βγδ_', // la prune : la guède sombre
  plum2: 'γδδ_',
  pumpkin: 'Hhiσ', // la citrouille : les lueurs du feu
};
/** Le pain : la croûte dorée (le chaume du monde, Y t T P). */
export const BREAD = { loaf: 'YtTP', loaf2: 'tTTP' };
/** Des volumes déplacés (sans recaler la matière : ce sont des boules et des boîtes à leur couleur). */
const moved0 = (qs: Quad[], [dx, dy, dz]: V3): Quad[] => qs.map((q) => ({ ...q, o: [q.o[0] + dx, q.o[1] + dy, q.o[2] + dz] as V3, tex: (s, t, c) => q.tex(s, t, { ...c, p: [c.p[0] - dx, c.p[1] - dy, c.p[2] - dz] }) }));
/** Une couronne de pain (Ø 30 cm) posée à plat : un anneau de huit morceaux. */
function crown(cx: number, cy: number, z: number, r: number): Quad[] {
  const Q: Quad[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    Q.push(...ball(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, z, 1.1, BREAD.loaf, 1.6, 'couronne'));
  }
  return Q;
}
/** Une citrouille côtelée (Ø 2r px), la queue verte. */
export function pumpkin(cx: number, cy: number, z: number, r: number): Quad[] {
  const R = VEG.pumpkin, P0 = P('citrouille', 3, R[3]);
  const tex: Tex = (s, t, c) => {
    if (c.face === 'top') {
      const dx = (s - r) / r, dy = (t - r) / r;
      if (dx * dx + dy * dy > 1.05) return null;
      if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) return 'l';
      return Math.floor(s) % 3 === 0 ? R[2] : dx < -0.1 ? R[0] : R[1];
    }
    if (c.face === 'S') {
      const dx = (s - r) / r, dz = (t - r * 0.7) / (r * 0.7);
      if (dx * dx + dz * dz > 1.2) return null;
      return Math.floor(s) % 3 === 0 ? R[3] : dz > 0.1 ? R[1] : R[2];
    }
    return null;
  };
  return box(cx - r, cx + r, cy - r, cy + r, z, z + r * 1.4, P0, tex);
}

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
  if (mix === 2) return [
    // le pain de la ferme : des miches en tas, deux couronnes ; les œufs en paniers ; trois citrouilles
    ...ballHeap(0.5, 17, 0.5, 13.5, z, 2.2, [BREAD.loaf, BREAD.loaf2], 31, 2),
    ...crown(21, 4.5, z, 3.2), ...crown(21, 10, z, 3.2),
    ...moved0(basketModel('eggs'), [27, 1, z]), ...moved0(basketModel('eggs'), [36, 5, z]),
    ...[[48, 4], [55, 9], [58, 3.5]].flatMap(([x, y]) => pumpkin(x, y, z, 3)),
  ];
  if (mix === 3) return [
    // les fruits : pommes, poires, prunes, en tas
    ...ballHeap(0.5, 21, 0.5, 13.5, z, 1.4, [VEG.apple, VEG.apple2], 41, 3),
    ...ballHeap(22, 42, 0.5, 13.5, z, 1.4, [VEG.pear], 42, 3),
    ...ballHeap(43, 63.5, 0.5, 13.5, z, 1.2, [VEG.plum, VEG.plum2], 43, 3),
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
  if (mix === 3) for (let x = 0.8; x + 1.4 <= 9.4; x += 1.5) {
    // des carottes en bottes, les fanes au nord
    const tex: Tex = (_s, _t, c) => (c.p[1] < 3 ? (c.face === 'top' ? 'L' : 'l') : c.face === 'top' ? (Math.floor(c.p[1] * 2) % 3 === 0 ? 'h' : 'i') : 'σ');
    Q.push(...box(x, x + 1.4, 0.6 + hash(7, x) * 1.2, 6.6, 5.5, 6.8, P('carotte', 3, 'σ'), tex));
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
export type BasketFill = 'onions' | 'eggs' | 'bread' | 'apples';
/** Le panier d'osier (Ø 40 × 30 cm), plein : d'oignons, d'œufs (crème et roux), de petits pains, de pommes. */
export function basketModel(fill: BasketFill = 'onions'): Quad[] {
  const Q: Quad[] = [];
  Q.push(...cylinder([4, 4, 0], [4, 4, 6], 4, P('panier', 3, 'X'), wicker, () => (fill === 'eggs' ? 'D' : 'n'), 12));
  if (fill === 'eggs') {
    // l'anse, les œufs (de 6 cm : 1,2 px) en tas : des grains crème et roux sur la paille
    Q.push(...bar([0.6, 4, 6], [4, 4, 10], 0.7, P('anse', 2.5, 'X', 'thin'), wicker), ...bar([4, 4, 10], [7.4, 4, 6], 0.7, P('anse', 2.5, 'X', 'thin'), wicker));
    for (const [x, y, z] of [[2, 2.6, 6], [3.6, 2.2, 6], [5.4, 2.8, 6], [2.4, 4.4, 6], [4.2, 4.2, 6], [5.8, 4.6, 6], [3, 6, 6], [4.8, 6, 6], [3.2, 3.4, 7], [4.8, 3.6, 7], [4, 5, 7]]) {
      Q.push(...ball(x, y, z, 0.9, (x * 7 + y) % 3 < 1 ? 'adDE' : '!adD', 1.3, 'œuf'));
    }
    return Q;
  }
  const R = fill === 'bread' ? [BREAD.loaf, BREAD.loaf2] : fill === 'apples' ? [VEG.apple, VEG.apple2] : [VEG.onion];
  const r = fill === 'bread' ? 1.8 : 1.5;
  for (const [x, y] of [[2.6, 3], [5.4, 3], [4, 5.2], [2.8, 5.6], [5.4, 5.6]]) Q.push(...ball(x, y, 5.6, r, R[Math.floor(x + y) % R.length]));
  Q.push(...ball(4, 4, 7.2, r, R[0]));
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
// 14 La place resserrée : l'appentis, et les étalages chargés des quatre boutiques du sud
// =====================================================================================================================

/** L'appentis ouvert de boutique (une travée de 3,20 m, 2,90 m de profondeur) : deux poteaux, la sablière, le pan de bardeaux à 12°. */
export function leanToModel(): Quad[] {
  const Q: Quad[] = [];
  leanToX(Q, 0, 64, 58, 56, 38, 50, 611, 62);
  return Q;
}

/** La couleur d'un coupon : [lumière, teinte, ombre, contour]. */
const CLOTH = ['ρστσ', 'αβγδ', 'adDE', 'LlkV', 'JOCX', 'βγδδ', 'bOCX', '!adD'];
/** Une pile de coupons pliés (40 × 30 cm, 10 cm chacun) : `n` coupons de couleurs tirées. */
function boltPile(x: number, y: number, z: number, n: number, seed: number): Quad[] {
  const Q: Quad[] = [];
  for (let k = 0; k < n; k++) {
    const R = CLOTH[Math.floor(hash(seed, k) * CLOTH.length)];
    const dx = (hash(seed, k, 2) - 0.5) * 0.8;
    Q.push(...box(x + dx, x + dx + 8, y, y + 6, z + k * 2, z + k * 2 + 2, P('coupon', 4 + k * 0.01, R[3]), (s, t, c) => {
      if (c.face === 'top') return Math.floor(s) % 4 === 3 ? R[1] : R[0];
      if (c.face !== 'S') return R[2];
      return Math.floor(t * 2) % 2 ? R[1] : Math.floor(s) === 0 ? R[0] : R[2];
    }));
  }
  return Q;
}
/** Un rouleau d'étoffe couché nord-sud (Ø 20 cm, 60 cm). */
function clothRoll(x: number, y: number, z: number, R: string): Quad[] {
  return cylinder([x, y, z + 2], [x, y + 12, z + 2], 2, P('rouleau', 4, R[3]), (_s, _t, c) => (c.n[2] > 0.5 ? R[0] : c.n[0] < 0 ? R[1] : R[2]), (s, t) => (Math.hypot(s - 2, t - 2) < 0.8 ? '%' : R[1]), 8);
}
/** La longue table des étoffes, 320 × 80 × 105 cm : planches rabotées sur tréteaux, les coupons en piles, deux rouleaux, les rubans. */
export function clothTableModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [5, 57]) {
    Q.push(...box(x, x + 2, 0.5, 15.5, 14, 16, P('tréteau', 3), W(621 + x)));
    for (const [yt, yb] of [[2, 0.3], [14, 15.7]] as const) for (const dx of [-1.6, 1.6]) Q.push(...bar([x + 1, yt, 14], [x + 1 + dx, yb, 0], 1.2, P('pied', 2.5), W(623 + x)));
  }
  Q.push(...box(0, 64, 0, 16, 16, 17, P('plateau', 4, '&'), W(625)));
  // une toile de garance qui pend devant (le bord de la table, à franges)
  Q.push(...box(0, 64, 15.9, 16.4, 11, 17, P('tenture', 4.5, 'τ'), (s, t, c) => {
    if (c.face !== 'S') return 'σ';
    const i = Math.floor(s), j = Math.floor(t);
    if (j === 0) return i % 2 ? null : 'σ';
    if (j >= 5) return 'ρ';
    return i % 8 < 4 ? 'ρ' : 'σ';
  }));
  [[1, 2, 4], [10, 1.5, 3], [19, 2.5, 5], [40, 2, 3], [49, 1, 4], [56, 2.5, 2], [1, 9, 2], [10, 9, 3]].forEach(([x, y, n], k) => Q.push(...boltPile(x, y, 17, n, 631 + k)));
  Q.push(...clothRoll(30, 2, 17, 'αβγδ'), ...clothRoll(35, 2, 17, 'adDE'));
  // les rubans roulés, en rang devant
  for (let k = 0; k < 7; k++) {
    const R = CLOTH[(k * 3) % CLOTH.length];
    Q.push(...cylinder([20 + k * 2.6, 12, 17], [20 + k * 2.6, 12, 18.4], 1.1, P('ruban', 5, R[3]), (_s, _t, c) => (c.n[0] < -0.2 ? R[0] : R[1]), () => R[0], 8));
  }
  Q.push(...box(40, 52, 10, 13, 17, 17.6, P('galon', 5, 'X'), (s) => (Math.floor(s) % 2 ? 'b' : 'J')));
  return Q;
}

/** Le portemanteau à chapeaux et à capes, Ø 60 × 185 cm : le pied en croix, le mât, quatre patères, trois chapeaux, une cape. */
export function hatStandModel(): Quad[] {
  const Q: Quad[] = [], c = 6;
  for (const [dx, dy] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) Q.push(...bar([c, c, 2], [c + dx, c + dy, 0], 1, P('pied', 3), W(641)));
  Q.push(...box(c - 0.7, c + 0.7, c - 0.7, c + 0.7, 0, 36, P('mât', 4), W(642)));
  // la cape pendue au sud-ouest
  Q.push(...box(c - 8, c + 1, c + 1, c + 2, 12, 32, P('cape', 4.5, 'δ'), (s, t, cx) => {
    if (cx.face !== 'S') return cx.face === 'top' ? null : 'γ';
    const u = 1 - t / 20, hw = 1.6 + u * 3, dx = s - 4.5;
    if (Math.abs(dx) > hw) return null;
    if (u < 0.12) return 'δ';
    return Math.floor(s) % 3 === 1 ? 'γ' : dx < -0.5 ? 'α' : 'β';
  }));
  const hat = (x: number, y: number, z: number, R: string, tall: number) => {
    Q.push(...cylinder([x, y, z], [x, y, z + 0.6], 4.2, P('bord', 5, R[3]), (_s, _t, cx) => (cx.n[0] < 0 ? R[1] : R[2]), () => R[1], 12));
    Q.push(...cylinder([x, y, z + 0.6], [x, y, z + 0.6 + tall], 2, P('calotte', 5.1, R[3]), (_s, t, cx) => (t < 0.8 ? 'b' : cx.n[0] < -0.2 ? R[0] : R[1]), () => R[0], 10));
  };
  hat(c, c, 36, 'MmNK', 2.6);
  hat(c - 3, c - 1, 30, 'ρστσ', 2);
  hat(c + 3.5, c + 1, 27, 'Uune', 2.2);
  return Q;
}

/** Un mannequin d'armure, Ø 50 × 160 cm : le pied, la colonne, le buste d'homme ; habillé d'un gambison piqué (`kind` 0) ou d'une cotte de cuir clouté (1). */
export function armorFormModel(kind: 0 | 1): Quad[] {
  const Q: Quad[] = [], c: V3 = [5, 5, 0];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    Q.push(...bar([c[0], c[1], 6], [c[0] + Math.cos(a) * 4.4, c[1] + Math.sin(a) * 4.4, 0], 1, P('pied', 3), W(651 + k)));
  }
  Q.push(...box(4.5, 5.5, 4.5, 5.5, 0, 12, P('colonne', 4), W(654)));
  const R = kind === 0 ? 'adDE' : 'UunN';
  // le buste : large aux épaules, la taille, le bas de la cotte évasé ; deux moignons de manches
  const rad = (z: number) => (z < 14 ? 4.2 : z < 18 ? 3.9 : z < 22 ? 3.6 : z < 27 ? 4.2 : z < 29 ? 4.6 : 0);
  const cloth: Tex = (s, _t, cx) => {
    if (cx.face === 'cap') return R[1];
    const z = cx.p[2], i = Math.floor(s);
    if (kind === 0 && Math.floor(z * 1.4) % 3 === 0) return R[2];
    if (kind === 1 && (i + Math.floor(z)) % 4 === 0 && Math.floor(z) % 3 === 1) return '-';
    if (kind === 1 && Math.abs(z - 20) < 0.6) return 'K';
    return cx.n[0] < -0.3 ? R[0] : cx.n[0] > 0.4 ? R[2] : R[1];
  };
  for (let z = 12; z < 29; z += 1.5) Q.push(...cylinder([5, 5, z], [5, 5, z + 1.5], rad(z), P('buste', 4, R[3]), cloth, () => R[1], 12));
  for (const dx of [-5.2, 5.2]) Q.push(...cylinder([5 + dx * 0.8, 5, 27.5], [5 + dx, 5, 23], 1.5, P('manche', 4.2, R[3]), cloth, () => R[2], 8));
  Q.push(...cylinder([5, 5, 29], [5, 5, 30.5], 1.2, P('col', 4.4, R[3]), cloth, () => R[1], 8));
  Q.push(...box(4.5, 5.5, 4.5, 5.5, 30.5, 32, P('pommeau', 5), W(655)));
  if (kind === 1) Q.push(...box(1, 9, 3, 7, 19.4, 20.4, P('ceinture', 4.6, 'K'), (_s, _t, cx) => (cx.face === 'top' ? 'N' : 'K')));
  return Q;
}

/** Un bouclier rond (Ø 60 cm, 12 px) vu de face, debout en (x, y), son bas à z : planches peintes en quartiers, le bord de cuir, l'umbo de fer. */
function shield(x: number, y: number, z: number, R: [string, string], seed: number): Quad[] {
  const r = 6;
  const tex: Tex = (s, t, c) => {
    const dx = s - r, dz = t - r, d = Math.hypot(dx, dz);
    if (c.face !== 'S') return c.face === 'top' ? (Math.abs(s - r) < r - 1 ? 'N' : null) : 'N';
    if (d > r) return null;
    if (d < 1.6) return d < 0.8 ? '!' : '-';
    if (d > r - 1) return dz > 0 && dx < 0 ? 'u' : 'n';
    const q = (dx < 0) === (dz < 0) ? 0 : 1;
    const k = R[q];
    // le jour en haut à gauche, les joints des planches
    if (Math.floor(s + seed) % 4 === 0) return k[2];
    return dx < -1 && dz > 1 ? k[0] : k[1];
  };
  return box(x, x + 2 * r, y, y + 1, z, z + 2 * r, P('bouclier', 5, 'K'), tex);
}
/** Le chevalet à boucliers, 200 × 40 × 110 cm : une barre sur deux pieds, trois boucliers ronds appuyés, un casque de cuir dessus. */
export function shieldStandModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [0, 38]) {
    Q.push(...box(x, x + 2, 3, 5, 0, 18, P('pied', 3), W(661 + x)));
    Q.push(...box(x - 0.5, x + 2.5, 0, 8, 0, 1.2, P('patin', 3), W(662 + x)));
  }
  Q.push(...box(0, 40, 3, 5, 16, 18, P('barre', 3.5), W(663)));
  Q.push(...shield(1.5, 5, 1, ['ρστ', 'adD'], 1), ...shield(14, 5.3, 1, ['αβγ', 'JOC'], 2), ...shield(26.5, 5, 1, ['ρστ', 'βγδ'], 3));
  // le casque de cuir bouilli, posé sur la barre
  Q.push(...cylinder([20, 4, 18], [20, 4, 21], 2.6, P('casque', 5, 'N'), (_s, t, c) => (t < 0.8 ? 'K' : c.n[0] < -0.2 ? 'U' : 'u'), () => 'U', 10));
  return Q;
}

/** Le râtelier d'armes, 160 × 40 × 250 cm : le bâti, deux barres percées ; quatre lances, deux haches, deux épées. */
export function weaponRackModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [0, 30.5]) {
    Q.push(...box(x, x + 1.5, 3, 4.5, 0, 26, P('montant', 4), W(671 + x)));
    Q.push(...box(x - 0.5, x + 2, 0, 8, 0, 1.2, P('patin', 3), W(672 + x)));
  }
  Q.push(...box(0, 32, 2.6, 5, 4, 5.4, P('barre basse', 3.5), W(673)), ...box(0, 32, 3, 4.5, 24, 25.5, P('barre haute', 5.5), W(674)));
  const shaft = (x: number, h: number) => Q.push(...box(x, x + 0.8, 3.4, 4.2, 1, h, P('hampe', 5, 'K', 'thin'), (_s, _t, c) => (c.face === 'top' ? '^' : '*')));
  // les lances : la hampe de frêne, le fer en feuille de laurier
  for (const x of [3, 6.5, 10]) {
    shaft(x, 44);
    Q.push(...box(x - 0.6, x + 1.4, 3.3, 4.3, 44, 48.5, P('fer de lance', 6, '_', 'thin'), (s, t, c) => (c.face !== 'S' ? '-' : t > 3.5 && (s < 0.5 || s > 1.5) ? null : s < 1 ? '!' : '-')));
  }
  // les haches : le manche, le fer à l'est
  for (const x of [14, 18]) {
    shaft(x, 32);
    Q.push(...box(x + 0.8, x + 3.6, 3.2, 4.4, 27, 31.5, P('fer de hache', 6, '_', 'thin'), (s, t, c) => (c.face !== 'S' ? '-' : s > 2 && (t < 0.5 || t > 4) ? null : s > 2 ? '!' : '-')));
  }
  // les épées, pointe en bas : la lame, la garde, la poignée, le pommeau
  for (const x of [23, 26.5]) {
    Q.push(...box(x, x + 1, 3.4, 4.2, 2, 20, P('lame', 6, '_', 'thin'), (s, _t, c) => (c.face !== 'S' ? '-' : s < 0.5 ? '!' : '-')));
    Q.push(...box(x - 1.4, x + 2.4, 3.3, 4.3, 20, 21, P('garde', 6.2, '_', 'thin'), () => '_'));
    Q.push(...box(x, x + 1, 3.4, 4.2, 21, 24, P('poignée', 6.1, 'K', 'thin'), () => 'N'));
    Q.push(...box(x - 0.2, x + 1.2, 3.3, 4.3, 24, 25, P('pommeau', 6.3, '_', 'thin'), () => '-'));
  }
  return Q;
}

/** Le chevalet à selle, 90 × 50 × 110 cm : quatre pieds écartés, la poutre ; la selle de cuir, ses étriers ; une paire de bottes au pied. */
export function saddleStandModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [2, 16]) for (const dy of [-2.5, 2.5]) Q.push(...bar([x, 5, 14], [x, 5 + dy, 0], 1.1, P('pied', 3), W(681 + x)));
  Q.push(...box(0.5, 17.5, 4.2, 5.8, 13.5, 15, P('poutre', 3.5), W(682)));
  // la selle : le siège creusé, le pommeau devant (à l'ouest), le troussequin, les quartiers qui tombent sur les flancs
  const leather: Tex = (s, t, c) => (c.face === 'top' ? (Math.floor(s) % 5 === 0 ? 'u' : 'U') : c.face === 'S' ? (t > c.h - 1 ? 'U' : Math.floor(s) % 4 === 0 ? 'n' : 'u') : 'n');
  Q.push(...box(3, 15, 1.5, 8.5, 15, 16.5, P('siège', 4.5, 'N'), leather));
  Q.push(...box(3, 5, 2.5, 7.5, 16.5, 19, P('pommeau', 4.6, 'N'), leather), ...box(13, 15, 2, 8, 16.5, 18.5, P('troussequin', 4.6, 'N'), leather));
  Q.push(...box(5, 13, 8.4, 9, 9, 15, P('quartier', 4.4, 'N'), leather));
  for (const x of [7, 10.5]) {
    Q.push(...box(x, x + 0.5, 9, 9.4, 4, 9, P('étrivière', 4.7, 'K', 'thin'), () => 'N'));
    Q.push(...box(x - 0.6, x + 1.1, 9, 9.6, 2.6, 4, P('étrier', 4.8, '_', 'thin'), (s, t) => (t > 1 && s > 0.5 && s < 1.2 ? null : '-')));
  }
  // les bottes, debout côte à côte
  for (const [x, R] of [[2.5, 'MmNK'], [5.5, 'MmNK']] as const) {
    Q.push(...box(x, x + 2.4, 9, 11.5, 0, 7, P('botte', 5, R[3]), (s, t, c) => (c.face === 'top' ? R[2] : c.face !== 'S' ? R[2] : t < 1 ? R[3] : s < 1 ? R[0] : R[1])));
    Q.push(...box(x, x + 2.4, 11.5, 13, 0, 2, P('pied de botte', 5.1, R[3]), (_s, _t, c) => (c.face === 'top' ? R[1] : R[2])));
  }
  return Q;
}

/** L'étal long de la mercière, 320 × 70 × 100 cm : la table sur tréteaux, le tapis de guède qui pend à franges ; bobines, rubans, boutons, savons, chandelles, peignes, petits paniers. */
export function haberdasheryStallModel(): Quad[] {
  const Q: Quad[] = [];
  for (const x of [5, 57]) {
    Q.push(...box(x, x + 2, 0.5, 13.5, 13, 15, P('tréteau', 3), W(691 + x)));
    for (const [yt, yb] of [[2, 0.3], [12, 13.7]] as const) for (const dx of [-1.6, 1.6]) Q.push(...bar([x + 1, yt, 13], [x + 1 + dx, yb, 0], 1.2, P('pied', 2.5), W(693 + x)));
  }
  Q.push(...box(0, 64, 0, 14, 15, 16, P('tapis', 4, 'δ'), (_s, _t, c) => (c.face === 'top' ? (Math.floor(c.p[0]) % 16 === 0 ? 'b' : 'β') : 'γ')));
  Q.push(...box(0, 64, 13.9, 14.4, 10, 16, P('tapis', 4.5, 'δ'), (s, t, c) => {
    if (c.face !== 'S') return 'γ';
    const i = Math.floor(s), j = Math.floor(t);
    if (j === 0) return i % 2 ? null : 'b';
    if (j === 4) return 'b';
    return i % 8 < 4 ? 'β' : 'γ';
  }));
  const z = 16;
  // les bobines de fil, en rangs
  for (let k = 0; k < 10; k++) {
    const R = CLOTH[k % CLOTH.length], x = 1.5 + (k % 5) * 2.4, y = 2 + Math.floor(k / 5) * 2.6;
    Q.push(...cylinder([x, y, z], [x, y, z + 1.8], 0.9, P('bobine', 5, R[3]), (_s, _t, c) => (c.n[0] < -0.2 ? R[0] : R[1]), () => R[0], 8));
  }
  // les rubans roulés
  for (let k = 0; k < 6; k++) {
    const R = CLOTH[(k * 5 + 1) % CLOTH.length];
    Q.push(...cylinder([15 + k * 2.4, 10, z], [15 + k * 2.4, 10, z + 1.2], 1.1, P('ruban', 5, R[3]), (_s, _t, c) => (c.n[0] < -0.2 ? R[0] : R[1]), () => R[0], 8));
  }
  // la boîte à boutons, ouverte
  Q.push(...box(15, 23, 2, 7, z, z + 1.6, P('boîte à boutons', 5, '&'), (s, t, c) => {
    if (c.face !== 'top') return '%';
    const i = Math.floor(s), j = Math.floor(t);
    if (i === 0 || j === 0 || i === 7 || j === 4) return '^';
    return hash(701, i, j) < 0.4 ? 'a' : hash(702, i, j) < 0.5 ? 'C' : '@';
  }));
  // les pains de savon, empilés
  for (const [x, y, zz] of [[27, 2, 0], [30.5, 2, 0], [34, 2, 0], [28.7, 2.3, 1.5], [32.2, 2.3, 1.5], [27, 6, 0], [30.5, 6, 0]] as const) {
    Q.push(...box(x, x + 3, y, y + 3, z + zz, z + zz + 1.5, P('savon', 5 + zz * 0.01, 'E'), (_s, t, c) => (c.face === 'top' ? 'a' : t > 1 ? 'd' : 'D')));
  }
  // les chandelles de suif, en bottes pendues par la mèche et debout
  for (let k = 0; k < 6; k++) Q.push(...box(39 + k * 1.2, 39.8 + k * 1.2, 4, 4.8, z, z + 4.5, P('chandelle', 5, 'E'), (_s, t, c) => (c.face === 'top' ? 'a' : t > 3.9 ? 'X' : k % 2 ? 'd' : '!')));
  for (let k = 0; k < 5; k++) Q.push(...box(39 + k * 1.4, 39.8 + k * 1.4, 9, 9.8, z, z + 3.5, P('chandelle', 5, 'E'), (_s, t, c) => (c.face === 'top' ? 'a' : t > 2.9 ? 'X' : '!')));
  // les peignes de buis, en rang
  for (let k = 0; k < 3; k++) Q.push(...box(48, 52, 2 + k * 2, 3 + k * 2, z, z + 0.8, P('peigne', 5, 'X'), (s, _t, c) => (c.face === 'top' ? (Math.floor(s * 2) % 2 ? 'J' : 'O') : 'C')));
  // les petits paniers du vannier, emboîtés
  Q.push(...cylinder([58, 4, z], [58, 4, z + 3], 2.6, P('panier', 4.8, 'X'), wicker, () => 'n', 10), ...cylinder([58, 4, z + 3], [58, 4, z + 4], 2.2, P('panier', 4.9, 'X'), wicker, () => 'n', 10));
  Q.push(...cylinder([55.5, 10, z], [55.5, 10, z + 2.5], 2.2, P('panier', 4.8, 'X'), wicker, () => 'n', 10));
  return Q;
}

/** Un tas de citrouilles sur la paille (100 × 60 × 45 cm). */
export function pumpkinPileModel(): Quad[] {
  const Q: Quad[] = [];
  Q.push(...box(0, 20, 0, 12, 0, 0.6, P('paille', 1, 'P'), (s, t) => (hash(711, Math.floor(s), Math.floor(t)) < 0.4 ? 'Y' : 't')));
  for (const [x, y, z, r] of [[3.5, 3.5, 0.6, 3.2], [10, 3.2, 0.6, 3.4], [16.5, 4, 0.6, 3], [6.5, 8.5, 0.6, 3.2], [13.5, 8.6, 0.6, 3.2], [8, 5.5, 4.2, 3]] as const) Q.push(...pumpkin(x, y, z, r));
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
  // ce que partagent les trois bâtiments (solution 1 de 14.2)
  { key: 'shop-lean-to', name: 'Appentis ouvert de boutique (une travée)', dims: { w: 340, d: 290, h: 250 }, users: ['p-ferme-rivale', 'p-merciere', 'p-tailleuse'], views: 4, ground: true, note: 'deux poteaux de 15 cm, la sablière, le pan de bardeaux à 12° : égout à 1,90 m, 2,50 m contre le mur ; posé sous l’égout du bâtiment', form: 'le pan descend vers le nord : son bord haut est contre le mur', model: leanToModel },
  // la ferme rivale
  { key: 'rough-stall', name: 'Étal de planches sur tréteaux (légumes)', dims: { w: 320, d: 70, h: 95 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'planches brutes sur deux tréteaux ; choux, raves, poireaux, pommes en tas (80 cm, 95 avec les légumes)', model: () => roughStallModel(0) },
  { key: 'rough-stall-s1', name: 'Étal de planches sur tréteaux (second tirage)', dims: { w: 320, d: 70, h: 95 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'oignons, carottes en bottes, choux', model: () => roughStallModel(1) },
  { key: 'rough-stall-s2', name: 'Étal de planches sur tréteaux (pain, œufs)', dims: { w: 320, d: 70, h: 110 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'le pain de la ferme : miches en tas, deux couronnes ; deux paniers d’œufs ; trois citrouilles', form: 'les marchandises en tas : vue par le bout, le haut de la boîte n’est atteint qu’en un point', model: () => roughStallModel(2) },
  { key: 'rough-stall-s3', name: 'Étal de planches sur tréteaux (fruits)', dims: { w: 320, d: 70, h: 105 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'pommes, poires, prunes en tas', form: 'les marchandises en tas : vue par le bout, le haut de la boîte n’est atteint qu’en un point', model: () => roughStallModel(3) },
  { key: 'vegetable-crate', name: 'Cageot de légumes : choux', dims: { w: 50, d: 35, h: 40 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'lattes du vannier, deux choux', model: () => crateModel(0) },
  { key: 'vegetable-crate-s1', name: 'Cageot de légumes : raves et poireaux', dims: { w: 50, d: 35, h: 40 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'second tirage', model: () => crateModel(1) },
  { key: 'vegetable-crate-s2', name: 'Cageot de légumes : pommes', dims: { w: 50, d: 35, h: 40 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'troisième tirage', model: () => crateModel(2) },
  { key: 'vegetable-crate-s3', name: 'Cageot de légumes : carottes', dims: { w: 50, d: 35, h: 35 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'quatrième tirage : les bottes de carottes, fanes au nord', model: () => crateModel(3) },
  { key: 'vegetable-basket', name: 'Panier d’oignons', dims: { w: 40, d: 40, h: 45 }, users: ['p-ferme-rivale'], views: 1, ground: false, note: 'osier tressé, plein d’oignons (30 cm, 45 avec le tas)', model: () => basketModel('onions') },
  { key: 'egg-basket', name: 'Panier d’œufs', dims: { w: 40, d: 40, h: 50 }, users: ['p-ferme-rivale'], views: 1, ground: false, note: 'l’anse, les œufs crème et roux sur la paille', model: () => basketModel('eggs') },
  { key: 'bread-basket', name: 'Panier de petits pains', dims: { w: 40, d: 40, h: 50 }, users: ['p-ferme-rivale'], views: 1, ground: false, note: 'les petits pains de la ferme', model: () => basketModel('bread') },
  { key: 'apple-basket', name: 'Panier de pommes', dims: { w: 40, d: 40, h: 45 }, users: ['p-ferme-rivale'], views: 1, ground: false, note: 'pommes jaunes et rouges', model: () => basketModel('apples') },
  { key: 'pumpkin-pile', name: 'Tas de citrouilles', dims: { w: 100, d: 60, h: 45 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'six citrouilles côtelées sur la paille', form: 'les marchandises en tas : vue par le bout, le haut de la boîte n’est atteint qu’en un point', model: pumpkinPileModel },
  { key: 'scale', name: 'Balance à plateaux', dims: { w: 50, d: 20, h: 45 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'colonne de bois, fléau de fer, plateaux de laiton', model: scaleModel },
  { key: 'price-slate', name: 'Ardoise des prix', dims: { w: 40, d: 10, h: 72 }, users: ['p-ferme-rivale'], views: 2, ground: false, note: 'sur son piquet, écrite des deux côtés', model: slateModel },
  // la mercière
  { key: 'haberdashery-stall', name: 'Étal long de la mercière', dims: { w: 320, d: 70, h: 105 }, users: ['p-merciere'], views: 2, ground: false, note: 'le tapis de guède à franges ; bobines, rubans, boutons, savons, chandelles, peignes, petits paniers du vannier', form: 'les marchandises en tas : vue par le bout, le haut de la boîte n’est atteint qu’en un point', model: haberdasheryStallModel },
  { key: 'shop-counter', name: 'Comptoir simple', dims: { w: 200, d: 60, h: 95 }, users: ['p-merciere', 'p-tailleuse'], views: 4, ground: false, note: 'à panneaux ; dessus, des bobines, un ruban, un coffret', model: () => counterModel('haberdashery') },
  { key: 'haberdashery-cabinet', name: 'Casier à tiroirs', dims: { w: 160, d: 60, h: 175 }, users: ['p-merciere'], views: 4, ground: false, note: '24 tiroirs à bouton, la corniche ; un tiroir tiré (45 cm de fond, 60 avec le tiroir), des boutons', model: cabinetModel },
  { key: 'ribbon-rack', name: 'Présentoir à rubans', dims: { w: 100, d: 40, h: 150 }, users: ['p-merciere'], views: 4, ground: false, note: 'trois barres de rubans, des bobines', model: ribbonRackModel },
  // la tailleuse et le frère du forgeron
  { key: 'clapboard-wall', name: 'Bardage à clins', dims: { w: 160, d: 17, h: 260 }, users: ['p-tailleuse'], views: 4, ground: true, note: 'planches horizontales de 20 cm qui se recouvrent, planches d’angle', model: clapboardWallModel },
  { key: 'timber-gallery', name: 'Galerie de bois (une travée)', dims: { w: 380, d: 100, h: 390 }, users: ['p-tailleuse'], views: 4, ground: true, note: '1 m de large, poteaux de 20 cm, plancher à 2,85 m, garde-corps à balustres de 1 m', form: 'le plancher et le garde-corps sont au sud, le haut de la boîte n’est pas au nord', model: () => galleryModel(-2, 74, [0, 72]) },
  { key: 'yard-fence', name: 'Palissade de planches', dims: { w: 160, d: 18, h: 165 }, users: ['p-tailleuse', 'p-merciere', 'p-ferme-rivale'], views: 2, ground: true, note: 'planches debout, deux lisses au revers', model: () => fenceModel() },
  { key: 'cloth-table', name: 'Longue table des étoffes', dims: { w: 320, d: 80, h: 135 }, users: ['p-tailleuse'], views: 2, ground: false, note: 'planches rabotées sur tréteaux, la tenture de garance à franges ; coupons en piles (jusqu’à cinq), deux rouleaux, rubans, un galon', form: 'les marchandises en tas : vue par le bout, le haut de la boîte n’est atteint qu’en un point', model: clothTableModel },
  { key: 'clothes-rack', name: 'Perche à habits', dims: { w: 200, d: 40, h: 170 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'chemise, cotte de guède, chaperon de garance, cape, tunique', model: clothesRackModel },
  { key: 'dress-form', name: 'Mannequin d’osier', dims: { w: 45, d: 45, h: 155 }, users: ['p-tailleuse'], views: 1, ground: false, note: 'sur son trépied, habillé d’une robe de garance', model: dressFormModel },
  { key: 'hat-stand', name: 'Portemanteau à chapeaux', dims: { w: 80, d: 60, h: 195 }, users: ['p-tailleuse'], views: 1, ground: false, note: 'le mât sur son pied en croix ; trois chapeaux de feutre (brun, garance, fauve), une cape de guède', model: hatStandModel },
  { key: 'gear-rack', name: 'Râtelier d’équipement', dims: { w: 200, d: 40, h: 180 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'sacs, besaces, outres, ceintures, fourreaux, corde, lanternes', form: 'de dos, le bâti est devant les sacs', model: gearRackModel },
  { key: 'knife-display', name: 'Présentoir à couteaux et à haches', dims: { w: 120, d: 50, h: 100 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'pupitre incliné : cinq couteaux, deux hachettes (le forgeron)', form: 'de dos, le haut du pupitre est devant', model: knifeDisplayModel },
  { key: 'armor-form', name: 'Mannequin d’armure : gambison', dims: { w: 65, d: 50, h: 150 }, users: ['p-tailleuse'], views: 1, ground: false, note: 'le buste d’homme sur son pied ; le gambison de lin piqué en bandes', model: () => armorFormModel(0) },
  { key: 'armor-form-s1', name: 'Mannequin d’armure : cotte de cuir', dims: { w: 65, d: 50, h: 150 }, users: ['p-tailleuse'], views: 1, ground: false, note: 'second tirage : la cotte de cuir bouilli cloutée, sa ceinture', model: () => armorFormModel(1) },
  { key: 'shield-stand', name: 'Chevalet à boucliers', dims: { w: 200, d: 40, h: 105 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'trois boucliers ronds de 60 cm peints en quartiers (garance, guède, lin), l’umbo de fer ; un casque de cuir', form: 'de côté, les boucliers se voient par la tranche', model: shieldStandModel },
  { key: 'weapon-rack', name: 'Râtelier d’armes', dims: { w: 160, d: 40, h: 245 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'trois lances (2,40 m), deux haches, deux épées pointe en bas (le forgeron)', form: 'de côté, les hampes se voient par la tranche ; vue de l’est (R3), la lance la plus haute est cachée par le montant', model: weaponRackModel },
  { key: 'saddle-stand', name: 'Chevalet à selle', dims: { w: 90, d: 65, h: 95 }, users: ['p-tailleuse'], views: 4, ground: false, note: 'la selle de cuir, ses étriers ; une paire de bottes au pied', form: 'de dos et de l’est, le pommeau et l’étrier sont plus bas que le haut de la boîte', model: saddleStandModel },
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
