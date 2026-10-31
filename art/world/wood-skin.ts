// Les matières de la pièce de bois : couleurs et textures, appliquées par le calcul des vues (art/world/wood-section.ts), qui ne
// dessine aucune forme lui-même. Ce fichier est celui du pixel-artist : il y règle une fois l'écorce (rampe, sillons qui roulent),
// le bois fendu (fil en long), le bois dressé à la doloire (fil en long), la planche, et le bois de bout (cernes, cœur), pour chaque
// diamètre de wood.json. La forme, elle, vient de la section (wood.json, `section`).
//
// Le bois mis à nu (faces fendues, dressées, planche, bois de bout, rond écorcé) est le bois travaillé : la rampe des âges
// (^ lumière, * bois, % ombre, & creux ; art/palette.ts `woodAges`), qui prend l'âge de la pièce au build. L'écorce garde sa rampe
// (M m N K, la perche S A B Q) et ne vieillit pas.
//
// Lumière en haut à gauche, toujours : le calcul donne à chaque matière `light`, de -1 (dans l'ombre) à 1 (face à la lumière),
// d'après la normale de la surface ; l'écorce prend `s` = (1 - light) / 2, de 0 (éclairée) à 1 (dans l'ombre).

import { barkTone, DARKER, faceTone, POLE_DARKER } from './wood';

const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Écorce et fibres sont périodiques sur 24 px le long de la pièce (`tile` de wood.json). */
export const TILE = 24;

// ---------- Écorce qui roule ----------

/** Anneau d'écorce : rangées de texture sur tout le tour ; couloirs de sillons (rangée, tirets [début, longueur] sur 24 px). */
export interface Ring { size: number; diameter: number; furrows: [number, [number, number][]][] }

/**
 * Gros : 22 rangées (deux fois les 11 visibles). Couloirs 2, 5, 8 visibles à l'image 0, 12, 15, 18 sur la face cachée ; deux
 * tirets de 4 à 6 px par période, placés pour ne jamais s'aligner d'un couloir à l'autre.
 */
export const BIG_RING: Ring = {
  size: 22,
  diameter: 11,
  furrows: [
    [2, [[1, 5], [13, 6]]],
    [5, [[7, 6], [19, 4]]],
    [8, [[3, 5], [15, 5]]],
    [12, [[10, 6], [21, 5]]],
    [15, [[4, 4], [16, 6]]],
    [18, [[9, 5], [20, 4]]],
  ],
};

/** Normal : l'anneau de 12 rangées (couloirs 1, 4, 7, 10). */
export const NORMAL_RING: Ring = {
  size: 12,
  diameter: 6,
  furrows: [
    [1, [[0, 4], [13, 5]]],
    [4, [[6, 5], [18, 4]]],
    [7, [[3, 4], [15, 5]]],
    [10, [[9, 5], [21, 4]]],
  ],
};

/** Décalage de l'anneau à l'image k : un quart de tour par image. */
export const shiftAt = (ring: Ring, k: number) => Math.round((k * ring.size) / 4);

/** La rangée `v` de l'anneau (à l'image 0) est-elle dans un sillon à `along` et à l'image k ? */
export function furrow(ring: Ring, along: number, v: number, k: number): boolean {
  const row = mod(v - shiftAt(ring, k), ring.size);
  const a = mod(Math.floor(along), TILE);
  return ring.furrows.some(([r, dashes]) => dashes.some(([s, n]) => {
    const pos = mod(a - s, TILE);
    if (pos >= n) return false;
    return row === mod(r + (pos >= Math.ceil(n / 2) ? 1 : 0), ring.size);
  }));
}

/** Écorce : la rampe en travers (`s` de 0, côté lumière, à 1), creusée d'un cran par les sillons de la rangée d'anneau `v`. */
export function ringBark(ring: Ring, along: number, v: number, s: number, k: number): string {
  const b = barkTone(s);
  return furrow(ring, along, v, k) ? DARKER[b] : b;
}

/** Écorce sur la rangée visible `v` (0 à diamètre - 1), comme la voit une pièce de dessus. */
export const barkV = (ring: Ring, along: number, v: number, k: number, plain = false): string =>
  plain ? barkTone((v + 0.5) / ring.diameter) : ringBark(ring, along, v, (v + 0.5) / ring.diameter, k);

/** Écorce lisse de la perche : anneau de 8 rangées, gerçures courtes et rares, rampe S A B (bois grisé). */
export const POLE_RING = 8;
const POLE_MARKS: [number, [number, number][]][] = [
  [1, [[3, 2], [15, 3]]],
  [3, [[9, 3], [21, 2]]],
  [5, [[0, 2], [12, 2]]],
  [7, [[6, 2], [18, 3]]],
];
const POLE_TONES = ['S', 'A', 'B'];

/** Écorce de la perche à `along`, rangée d'anneau `v`, teinte `s` (0 éclairée à 1), à l'image k. */
export function poleBark(along: number, v: number, s: number, k: number): string {
  const row = mod(v - 2 * k, POLE_RING);
  const a = mod(Math.floor(along), TILE);
  const base = POLE_TONES[Math.min(2, Math.floor(s * 3))];
  const hit = POLE_MARKS.some(([r, dashes]) => r === row && dashes.some(([st, n]) => mod(a - st, TILE) < n));
  return hit ? POLE_DARKER[base] : base;
}

// ---------- L'écorce des vues couchées (le rond qui se modèle en cylindre) ----------

/**
 * La rampe de l'écorce d'une pièce couchée, `s` de 0 (la normale face à la lumière : le haut du flanc nord) à 1 (le flanc sud,
 * tourné vers le sol). Le clair M ne prend que le haut côté lumière (environ un cinquième du tour visible), le gros du dessus
 * est en m, le flanc sud en N, et la dernière rangée, juste au-dessus du contour, en K : le rond se lit comme un cylindre, pas
 * comme une planche claire. La perche suit la même découpe dans sa rampe grisée S A B.
 */
export function lyingBarkTone(s: number): string {
  return s < 0.15 ? 'M' : s < 0.5 ? 'm' : s < 0.8 ? 'N' : 'K';
}

/** L'écorce couchée à la rangée d'anneau `v` : la rampe en cylindre, creusée d'un cran par les sillons. */
export function lyingRingBark(ring: Ring, along: number, v: number, s: number, k: number): string {
  const b = lyingBarkTone(s);
  return furrow(ring, along, v, k) ? DARKER[b] : b;
}

/** L'écorce couchée de la perche : la même découpe que le gros et le normal, dans la rampe S A B, gerçures en Q. */
export function lyingPoleBark(along: number, v: number, s: number, k: number): string {
  const row = mod(v - 2 * k, POLE_RING);
  const a = mod(Math.floor(along), TILE);
  const base = s < 0.15 ? 'S' : s < 0.5 ? 'A' : 'B';
  const hit = POLE_MARKS.some(([r, dashes]) => r === row && dashes.some(([st, n]) => mod(a - st, TILE) < n));
  return hit ? POLE_DARKER[base] : base;
}

// ---------- Bois frais de la fente (faces fendues) ----------

/** Couloirs de fibres d'une face fendue, en travers : tirets [début, longueur] sur 24 px. */
export const SPLIT_LANES: [number, number][][] = [
  [[2, 5], [14, 4]],
  [[8, 2], [19, 2]],
  [[5, 6], [17, 3]],
  [[0, 2], [11, 2]],
  [[9, 5], [21, 3]],
];

/**
 * Bois d'une face fendue tournée vers la lumière : `along` le long de la pièce, `across` en travers (0, le bord côté lumière).
 * Fond *, le bord en ^ ; un couloir sur deux des fibres éclairées (^), l'autre des fibres arrachées (%), jamais de cerne. C'est la
 * face de la demi-bille que Grégoire aime : la rangée de demi-billes vue de face.
 */
export function splitWood(along: number, across: number): string {
  if (across === 0) return '^';
  const a = mod(Math.floor(along), TILE);
  const hit = SPLIT_LANES[across % SPLIT_LANES.length].some(([s, n]) => mod(a - s, TILE) < n);
  if (!hit) return '*';
  return across % 2 === 1 ? '^' : '%';
}

/** Un cran plus sombre pour le bois travaillé (fendu, dressé, planche). */
export const WOOD_DARKER: Record<string, string> = { '^': '*', '*': '%', '%': '&', '&': '&' };

// ---------- Bois dressé à la doloire ----------

/** Fil du bois dressé : tirets [début, longueur] d'un cran plus sombres, sur 24 px, par couloir. */
const GRAIN: Record<string, [number, number][]> = {
  a: [[3, 4], [16, 3]],
  b: [[10, 4], [21, 3]],
  c: [[6, 3], [18, 4]],
};
export function grain(along: number, lane: keyof typeof GRAIN, base: string): string {
  const a = mod(along, TILE);
  return GRAIN[lane].some(([s, n]) => mod(a - s, TILE) < n) ? WOOD_DARKER[base] : base;
}

// ---------- La planche ----------

const PLANK_FIBRES: [number, number, number][] = [
  [0, 1, 5], [0, 13, 4], [1, 7, 4], [1, 18, 5], [0, 21, 3],
];
const PLANK_SAP: [number, number][] = [[4, 4], [16, 3]];
const PLANK_EDGE: [number, number][] = [[2, 3], [11, 2], [19, 3]];

/**
 * Bois de la planche à `along`, `across` en travers (0 l'arête au soleil ; puis le dessus, l'aubier par endroits sur la première
 * rangée ; `last` : la rive d'ombre, un reste d'écorce N par endroits).
 */
export function plankTone(along: number, across: number, last: boolean): string {
  const a = mod(Math.floor(along), TILE);
  const inDash = (st: number, n: number) => mod(a - st, TILE) < n;
  if (across === 0) return '^';
  if (last) return PLANK_EDGE.some(([st, n]) => inDash(st, n)) ? 'N' : '%';
  if (across === 1 && PLANK_SAP.some(([st, n]) => inDash(st, n))) return '^';
  const base = across === 1 ? '^' : '*';
  const hit = PLANK_FIBRES.some(([lane, st, n]) => {
    if (!inDash(st, n)) return false;
    const second = mod(a - st, TILE) >= Math.ceil(n / 2);
    return across - 1 === (second ? 1 - lane : lane);
  });
  return hit ? WOOD_DARKER[base] : base;
}

// ---------- Les matières, par diamètre ----------

/** Ce que voit le calcul d'une matière en un point : où il est sur la pièce et comment il est éclairé. */
export interface FaceAt {
  /** Le long de la pièce, en pixels (périodique sur TILE). */
  along: number;
  /** En travers de la face, en pixels depuis son bord côté lumière (0, 1, 2...). */
  across: number;
  /** Rangées de la face en travers : `across` va de 0 à `count` - 1. */
  count: number;
  /** De -1 (dans l'ombre) à 1 (face à la lumière). */
  light: number;
}

/** Les matières d'un diamètre. */
export interface Skin {
  /** Rangées de l'anneau d'écorce sur tout le tour (le roulement le fait tourner d'un quart par image). */
  ringSize: number;
  /** L'écorce à la rangée d'anneau `ring`, teinte `s` (0 éclairée à 1 dans l'ombre), à l'image k du roulement. */
  bark(along: number, ring: number, s: number, k: number): string;
  /**
   * Le rond écorcé (le rondin de la cabane, `bark: 'none'` de sa section) à la rangée d'anneau `ring`, teinte `s` (0 éclairée à 1
   * dans l'ombre), à l'image k du roulement : le bois mis à nu à la plane, dans la rampe du bois travaillé (il prend l'âge).
   */
  peeled(along: number, ring: number, s: number, k: number): string;
  /** Une face plane : fendue (`split`), dressée à la doloire (`hewn`) ou la planche (`plank`). */
  face(kind: 'split' | 'hewn' | 'plank', at: FaceAt): string;
  /** Le bois de bout en (u, v) depuis le cœur (u vers la droite, v vers le bas de l'écran, en rayons) ; `rim` : bord d'écorce. */
  end(u: number, v: number, rim: boolean, rings: boolean): string;
}

/**
 * Bois tourné de biais (un cran) : le fond * passe en %, les fibres éclairées ^ en *, les fibres arrachées % en & (le creux),
 * pour que le fil se lise encore sur une face qui ne prend pas la lumière (le flanc sud du quartier).
 */
const FACE_SHADE: Record<string, string> = { '^': '*', '*': '%', '%': '&', '&': '&' };
/** Bois dans l'ombre (deux crans) : le fond en %, seules les fibres arrachées en & (la face sud d'une poutre). */
const FACE_DEEP: Record<string, string> = { '^': '%', '*': '%', '%': '&', '&': '&' };

/** Une face plane, d'après sa lumière : le bois frais éclairé, un cran plus sombre de biais, deux dans l'ombre. */
function planeFace(kind: 'split' | 'hewn' | 'plank', at: FaceAt): string {
  let q: string;
  if (kind === 'plank') q = plankTone(at.along, at.across, at.across === at.count - 1 && at.count > 2);
  else if (kind === 'split') q = splitWood(at.along, at.across);
  else q = at.across === 0 ? '^' : grain(Math.floor(at.along), (['c', 'a', 'b'] as const)[at.across % 3], at.across % 2 ? '*' : '^');
  if (at.light >= 0.55) return q;
  if (at.light >= -0.1) return FACE_SHADE[q] ?? q;
  return FACE_DEEP[q] ?? q;
}

const endWood = (u: number, v: number, rim: boolean, rings: boolean) => faceTone(u, v, rim, false, rings);

// ---------- Le rond écorcé (le rondin de la cabane) ----------

/**
 * Traces de plane sur l'anneau du rond écorcé : par rangée d'anneau (une sur trois), des tirets [début, longueur] sur 24 px, d'un
 * cran plus sombres. La plane enlève l'écorce en longues facettes : leurs arêtes se lisent comme de longs traits en long, jamais
 * alignés d'une rangée à l'autre.
 */
const PEELED_LANES: [number, number][][] = [
  [[2, 9], [15, 5]],
  [[9, 11]],
  [[0, 6], [13, 8]],
  [[18, 9]],
];
/** Les nœuds (le bois autour d'une branche coupée à ras) : rangée d'anneau, début et longueur sur 24 px. Deux de 2 px par tour. */
const PEELED_KNOTS: { row: number; at: number; n: number }[] = [
  { row: 3, at: 19, n: 2 },
  { row: 8, at: 6, n: 2 },
];

/**
 * Le rond écorcé : le bois mis à nu à la plane, en cylindre dans la rampe du bois travaillé (il prend l'âge). Le clair ^ prend le
 * haut côté lumière (un peu plus large que le M de l'écorce : le bois nu est lisse et renvoie la lumière), le bois * le gros du
 * dessus, le flanc sud en %, la dernière rangée en & ; les traces de plane un cran plus sombres, des nœuds de deux crans. Tout tourne
 * avec l'anneau (un quart de tour par image), comme les sillons de l'écorce.
 */
function peeledWood(ringSize: number) {
  return (along: number, ring: number, s: number, k: number): string => {
    const base = s < 0.2 ? '^' : s < 0.55 ? '*' : s < 0.84 ? '%' : '&';
    const row = mod(ring - Math.round((k * ringSize) / 4), ringSize);
    const a = mod(Math.floor(along), TILE);
    // les nœuds : rangées données pour l'anneau du normal (12), ramenées à celui du diamètre
    const knot = PEELED_KNOTS.some((n) => Math.floor((n.row * ringSize) / 12) === row && mod(a - n.at, TILE) < n.n);
    if (knot) return base === '^' ? '%' : '&';
    if (row % 3 === 1) {
      const lane = PEELED_LANES[Math.floor(row / 3) % PEELED_LANES.length];
      if (lane.some(([st, n]) => mod(a - st, TILE) < n)) return WOOD_DARKER[base];
    }
    return base;
  };
}

export const SKINS: Record<string, Skin> = {
  big: {
    ringSize: BIG_RING.size,
    bark: (along, ring, s, k) => lyingRingBark(BIG_RING, along, ring, s, k),
    peeled: peeledWood(BIG_RING.size),
    face: planeFace,
    end: endWood,
  },
  normal: {
    ringSize: NORMAL_RING.size,
    bark: (along, ring, s, k) => lyingRingBark(NORMAL_RING, along, ring, s, k),
    peeled: peeledWood(NORMAL_RING.size),
    face: planeFace,
    end: endWood,
  },
  pole: {
    ringSize: POLE_RING,
    bark: lyingPoleBark,
    peeled: peeledWood(POLE_RING),
    face: planeFace,
    end: (u, v, rim, rings) => (rim ? 'B' : endWood(u, v, false, rings)),
  },
};
