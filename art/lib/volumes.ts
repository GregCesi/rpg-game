// Le modèle en volumes des bâtiments de terre et de chaume (la maison de Xéros, CONCEPTION « La maison de Xéros ») : la géométrie
// (boîtes, prismes, faces), les matières dessinées au pixel (bois équarri, perches, lattes, palançons, clayonnage, torchis, chaux,
// chaume, faîtage de terre, porte en planches, dalle de calcaire) et le rendu d'une pièce seule dans la projection du jeu.
// Tiré de l'essai validé par Grégoire le 2 novembre 2026 (« parfait, j'adore » : art/proposals/maison-xeros.ts, qui s'en sert) :
// les matières sont celles de l'essai, à l'identique.
//
// La projection (docs/STYLE.md section 8) : un point (x, y, z) en px du jeu s'affiche en (x, k·y − z) ; k = 1 pour les pièces de
// bâtiment (`ground` : la profondeur à l'échelle du sol), ½ pour un meuble (le dessus en raccourci). Le rendu garde, pour chaque
// pixel, le point le plus au sud (le plus proche), puis pose le contour de STYLE.md section 3 : la teinte sombre de la matière en
// haut et à gauche, OUTLINE (o) en bas et à droite, contre le vide ou ce qui est derrière.

import type { Grid, Palette } from './canvas';

// =====================================================================================================================
// Géométrie
// =====================================================================================================================

export type V3 = [number, number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => mul(a, 1 / len(a));

/** Hachage déterministe, dans [0, 1). */
export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h = Math.imul(h ^ ((v | 0) + 0x9e3779b9), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

export type Outline = 'full' | 'thin' | 'none';
/**
 * Une pièce : son contour (`full` : sombre en haut et à gauche, OUTLINE en bas et à droite ; `thin` : OUTLINE seul, pour ce qui
 * fait 1 ou 2 px, une perche, une latte ; `none`), sa priorité à profondeur égale (deux faces au même plan : la plus haute
 * passe devant et prend le contour), et ce qu'elle est (toit, mur sous l'avant-toit, sol).
 */
export interface Part { name: string; prio: number; dark: string; outline: Outline; roof?: boolean; eave?: boolean; ground?: boolean; cast?: boolean }
export const part = (name: string, prio: number, dark: string, outline: Outline = 'full', extra: Partial<Part> = {}): Part =>
  ({ name, prio, dark, outline, cast: true, ...extra });

export type Face = 'top' | 'S' | 'N' | 'E' | 'W' | 'slope' | 'under' | 'edge' | 'cap' | 'ground';
/** Ce qu'une texture sait du pixel : la taille de la face (px), le point, la normale (dans la vue), le pixel de l'écran. */
export interface Ctx { w: number; h: number; p: V3; n: V3; X: number; Y: number; face: Face }
/** Une texture : un signe de PAL, une couleur '#rrggbb', ou null (transparent). (s, t) en px sur la face, t vers le haut. */
export type Tex = (s: number, t: number, c: Ctx) => string | null;
export interface Quad { o: V3; u: V3; v: V3; n: V3; part: Part; tex: Tex; face: Face }
/** Une image du jeu posée dans la scène : coin haut-gauche à l'écran, profondeur par rangée. */
export interface Board { grid: Grid; pal: Palette; x: number; y: number; depth: (row: number) => number; part?: Part }
export interface Scene { quads: Quad[]; boards: Board[]; floor?: [number, number, number, number] }

/** Une boîte : le dessus et les quatre faces debout (u de gauche à droite vu du dehors, v vers le haut). */
export function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, p: Part, tex: Tex | { top: Tex; side: Tex }): Quad[] {
  const T = typeof tex === 'function' ? { top: tex, side: tex } : tex;
  const w = x1 - x0, d = y1 - y0, h = z1 - z0;
  return [
    { o: [x0, y0, z1], u: [w, 0, 0], v: [0, d, 0], n: [0, 0, 1], part: p, tex: T.top, face: 'top' },
    { o: [x0, y1, z0], u: [w, 0, 0], v: [0, 0, h], n: [0, 1, 0], part: p, tex: T.side, face: 'S' },
    { o: [x1, y0, z0], u: [-w, 0, 0], v: [0, 0, h], n: [0, -1, 0], part: p, tex: T.side, face: 'N' },
    { o: [x0, y0, z0], u: [0, d, 0], v: [0, 0, h], n: [-1, 0, 0], part: p, tex: T.side, face: 'W' },
    { o: [x1, y1, z0], u: [0, -d, 0], v: [0, 0, h], n: [1, 0, 0], part: p, tex: T.side, face: 'E' },
  ];
}

/** Un prisme droit le long de a → b, section w1 (selon e1) × w2 (selon e2) : faces `slope` (+e2), `under`, `edge`, `cap`. (s le long de l'axe.) */
export function prism(a: V3, b: V3, e1: V3, e2: V3, w1: number, w2: number, p: Part, tex: Tex): Quad[] {
  const ax = sub(b, a), h1 = mul(e1, w1 / 2), h2 = mul(e2, w2 / 2);
  const c = (s1: number, s2: number) => add(add(a, mul(h1, s1)), mul(h2, s2));
  const A = unit(ax);
  return [
    { o: c(-1, 1), u: ax, v: mul(e1, w1), n: e2, part: p, tex, face: 'slope' },
    { o: c(-1, -1), u: ax, v: mul(e1, w1), n: mul(e2, -1), part: p, tex, face: 'under' },
    { o: c(1, -1), u: ax, v: mul(e2, w2), n: e1, part: p, tex, face: 'edge' },
    { o: c(-1, -1), u: ax, v: mul(e2, w2), n: mul(e1, -1), part: p, tex, face: 'edge' },
    { o: c(-1, -1), u: mul(e1, w1), v: mul(e2, w2), n: mul(A, -1), part: p, tex, face: 'cap' },
    { o: add(c(-1, -1), ax), u: mul(e1, w1), v: mul(e2, w2), n: A, part: p, tex, face: 'cap' },
  ];
}

/** Un prisme le long de x, de section polygonale [y, z] (le faîtage de terre) ; la normale de chaque face, loin du centre. */
export function polyPrism(x0: number, x1: number, sec: [number, number][], p: Part, tex: Tex): Quad[] {
  const cy = sec.reduce((s, q) => s + q[0], 0) / sec.length, cz = sec.reduce((s, q) => s + q[1], 0) / sec.length;
  const out: Quad[] = [];
  for (let i = 0; i + 1 < sec.length; i++) {
    const [y0, z0] = sec[i], [y1, z1] = sec[i + 1];
    let n: V3 = unit([0, z1 - z0, -(y1 - y0)]);
    if (dot(n, [0, (y0 + y1) / 2 - cy, (z0 + z1) / 2 - cz]) < 0) n = mul(n, -1);
    out.push({ o: [x0, y0, z0], u: [x1 - x0, 0, 0], v: [0, y1 - y0, z1 - z0], n, part: p, tex, face: 'slope' });
  }
  return out;
}

/** Centre de la première maison (axe des poteaux), autour duquel on tourne la vue ; un plan tourne autour de son milieu. */
export const CENTER: [number, number] = [64, 48];
/** Une vue : 0 du sud (le jeu), 1 de l'ouest, 2 du nord, 3 de l'est (le côté vu passe au sud de la vue). */
export type Rot = 0 | 1 | 2 | 3;
export function rotP(p: V3, r: Rot, c: [number, number] = CENTER): V3 {
  const [cx, cy] = c, [x, y, z] = p;
  if (r === 1) return [cx + (y - cy), cy - (x - cx), z];
  if (r === 2) return [2 * cx - x, 2 * cy - y, z];
  if (r === 3) return [cx - (y - cy), cy + (x - cx), z];
  return p;
}
export const rotV = (v: V3, r: Rot): V3 => (r === 1 ? [v[1], -v[0], v[2]] : r === 2 ? [-v[0], -v[1], v[2]] : r === 3 ? [-v[1], v[0], v[2]] : v);
export const rotQuads = (qs: Quad[], r: Rot, c: [number, number] = CENTER): Quad[] => qs.map((q) => ({ ...q, o: rotP(q.o, r, c), u: rotV(q.u, r), v: rotV(q.v, r), n: rotV(q.n, r) }));
/** Un rectangle au sol, tourné : [x0, x1, y0, y1]. */
export function rotRect(r4: [number, number, number, number], r: Rot, c: [number, number] = CENTER): [number, number, number, number] {
  const a = rotP([r4[0], r4[2], 0], r, c), b = rotP([r4[1], r4[3], 0], r, c);
  return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])];
}

// =====================================================================================================================
// Matières
// =====================================================================================================================

const DARKER: Record<string, string> = {
  '!': '+', '+': '=', '=': ';', ';': '~', '^': '*', '*': '%', '%': '&', '&': '@', U: 'u', u: 'n', n: 'e', e: 'e', Y: 't', t: 'T', T: 'P',
  A: 'B', B: 'Q', D: 'E', d: 'D', M: 'm', m: 'N', N: 'K', K: 'o', G: 'g', g: 'v', v: 'V',
};
export const darker = (k: string) => DARKER[k] ?? k;

/** Un tiret de fil : la voie `lane` (une colonne ou une rangée), la position le long. */
export function dash(seed: number, lane: number, pos: number, rate = 0.7): boolean {
  const per = 7 + Math.floor(hash(seed, lane, 1) * 7), l = 2 + Math.floor(hash(seed, lane, 2) * 3), ph = Math.floor(hash(seed, lane, 3) * per);
  return hash(seed, lane, 4) < rate && (((pos + ph) % per) + per) % per < l;
}

/** Bois équarri patiné : le dessus éclairé, la face debout du clair à gauche à l'ombre à droite, le fil en tirets, les chevilles. */
export function timber(seed: number, pegs: [number, number][] = []): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') {
      if (c.w < 5 && c.h < 5) { // bois de bout (le poteau coupé) : l'aubier, puis le cœur
        const e = Math.min(i, j, Math.floor(c.w) - 1 - i, Math.floor(c.h) - 1 - j);
        return e <= 0 ? '*' : '%';
      }
      const alongS = c.w >= c.h, along = alongS ? i : j, across = alongS ? j : i;
      return dash(seed, across, along, 0.35) ? '*' : '^';
    }
    if (pegs.some(([a, b]) => a === i && b === j)) return '@';
    if (c.h > c.w) {
      const f = (i + 0.5) / c.w, base = f < 0.45 ? '^' : f < 0.8 ? '*' : '%';
      return dash(seed, i, j, 0.55) ? darker(base) : base;
    }
    const base = (j + 0.5) / c.h < 0.3 ? '%' : '*';
    return base === '*' && dash(seed, j, i, 0.4) ? '%' : base;
  };
}

/** Une perche avec son écorce (chevron, faîtière) : la face du dessus claire, le dessous à l'ombre, le bout coupé en bois. */
export function pole(seed: number): Tex {
  return (s, t, c) => {
    if (c.face === 'cap') return '*';
    if (c.face === 'under') return 'N';
    const k = c.face === 'edge' ? 'm' : t < c.h * 0.5 ? 'M' : 'm';
    return dash(seed, Math.floor(t * 2), Math.floor(s), 0.4) ? darker(k) : k;
  };
}

/** Une latte fendue : le dessus clair, le chant à l'ombre. */
export function lath(seed: number): Tex {
  return (s, _t, c) => (c.face === 'edge' || c.face === 'cap' ? '%' : dash(seed, 0, Math.floor(s), 0.5) ? '*' : '^');
}

/** Les mottes du torchis : centres sur une grille tremblée de 5 px ; le plus proche, l'écart au second (le joint), le décalage. */
export function lumps(seed: number, s: number, t: number) {
  const ci = Math.floor(s / 5), cj = Math.floor(t / 5);
  let d1 = Infinity, d2 = Infinity, dx = 0, dy = 0, id = 0;
  for (let a = ci - 1; a <= ci + 1; a++) for (let b = cj - 1; b <= cj + 1; b++) {
    const cx = a * 5 + 1 + hash(seed, a, b, 1) * 3, cy = b * 5 + 1 + hash(seed, a, b, 2) * 3;
    const d = Math.hypot(s - cx, t - cy);
    if (d < d1) { d2 = d1; d1 = d; dx = s - cx; dy = t - cy; id = hash(seed, a, b, 3); } else if (d < d2) d2 = d;
  }
  return { e: d2 - d1, dx, dy, id };
}

/** Un brin de paille dans le torchis : un tiret de 2 px, couché ou debout. */
export function straw(seed: number, i: number, j: number): boolean {
  const at = (a: number, b: number) => hash(seed, a, b, 9) < 0.045;
  const flat = (a: number, b: number) => hash(seed, a, b, 10) < 0.6;
  return at(i, j) || (at(i - 1, j) && flat(i - 1, j)) || (at(i, j - 1) && !flat(i, j - 1));
}

/**
 * Le remplissage d'un pan, étape 3 (torchis) ou 4 (chaux), vu de face ; le dessus (une coupe : le mur tranché de l'intérieur) :
 * la chaux des deux côtés, le torchis au milieu, les baguettes du clayonnage en points.
 */
export function daub(seed: number, lime: boolean): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') {
      const across = c.w >= c.h ? j : i, n = Math.floor(c.w >= c.h ? c.h : c.w);
      if (lime && (across === 0 || across === n - 1)) return '+';
      const along = c.w >= c.h ? i : j;
      return across === Math.floor(n / 2) && along % 3 === 1 ? 'B' : hash(seed, i, j) < 0.3 ? 'n' : 'u';
    }
    const L = lumps(seed, s, t);
    let k: string;
    if (!lime) {
      if (L.e < 0.55 && L.id < 0.35) k = 'e';
      else if (L.e < 0.8 && L.dx - L.dy > 0.3) k = 'n';
      else if (-L.dx + L.dy > 1.2) k = 'U';
      else k = 'u';
      if (straw(seed, i, j)) k = k === 'U' ? 'Y' : 't';
    } else {
      if (L.e < 0.35 && L.id < 0.12 && L.dx - L.dy > 0) k = ';';
      else if (L.e < 0.6 && L.dx - L.dy > 0.8 && L.id < 0.6) k = '=';
      else if (-L.dx + L.dy > 1.8 && L.id > 0.45) k = '!';
      else k = '+';
      // la terre qui rejaillit au pied du mur
      if (t < 3 && hash(seed, Math.floor(s / 3), 5) < 0.55 && t < 1 + hash(seed, i, 6) * 2.5) k = t < 1 ? 'E' : 'D';
    }
    // l'ombre du bois qui encadre : sous la pièce du haut, à droite de la pièce de gauche
    if (t > c.h - 1 || s < 1) k = darker(k);
    return k;
  };
}

/** Les positions (bord gauche) des palançons dans un pan de `w` px : environ tous les 30 cm. */
export function stickPositions(w: number): number[] {
  const n = Math.max(1, Math.round((w - 2) / 6));
  return Array.from({ length: n }, (_, k) => Math.max(0, Math.min(w - 2, Math.round(((k + 0.5) * w) / n - 1))));
}

/** Un palançon : un bâton fendu, la face fendue claire, l'arête d'écorce à droite (le contour la prend). */
export function stick(seed: number): Tex {
  return (s, t, c) => (c.face === 'top' ? '*' : dash(seed, Math.floor(s), Math.floor(t), 0.5) ? '*' : '^');
}

/**
 * Le clayonnage : des baguettes tressées, une par rangée, qui passent devant un palançon et derrière le suivant (une rangée sur
 * deux décalée) : devant, l'écorce claire (A) ; au passage, la teinte moyenne (B) ; derrière, l'ombre (Q) ; là où la baguette
 * passe derrière, on voit le palançon.
 */
export function wattle(seed: number, w: number, st = stickPositions(w)): Tex {
  return (s, t, c) => {
    if (c.face === 'top') return 'B';
    const i = Math.floor(s), j = Math.floor(t);
    const k = st.findIndex((x) => i === x || i === x + 1);
    const sign = (n: number) => ((j + n + (seed & 1)) % 2 === 0 ? 1 : -1);
    if (k >= 0) {
      if (sign(k) > 0) return hash(seed, i, j) < 0.25 ? 'S' : 'A';
      return i === st[k] ? '^' : '%';
    }
    let a = st.findIndex((x) => x > i) - 1;
    if (a < -1) a = st.length - 1;
    const x0 = a >= 0 ? st[a] + 2 : -1, x1 = a + 1 < st.length ? st[a + 1] : w + 1;
    const d0 = a >= 0 ? sign(a) : -sign(0), d1 = a + 1 < st.length ? sign(a + 1) : -d0;
    const u = (i - x0 + 0.5) / Math.max(1, x1 - x0), d = d0 * (1 - u) + d1 * u;
    return d > 0.35 ? 'A' : d > -0.35 ? 'B' : 'Q';
  };
}

/** Le noir d'une baie : le dedans dans la pénombre. */
export const voidTex: Tex = (_s, t, c) => (t > c.h - 2 ? '@' : 'o');

/** La porte en planches (90 × 180 cm) : quatre planches debout, joints, chevilles des traverses du dos, bas mouillé, le loquet. */
export function doorTex(seed: number, w = 18): Tex {
  const joints = w === 18 ? [4, 8, 13] : [4, 8, 12], pegs = w === 18 ? [2, 6, 11, 15] : [2, 6, 10, 14], lx = w - 4;
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (c.face === 'top') return '^';
    if (joints.includes(i)) return '@';
    let k = joints.includes(i - 1) || i === 0 ? '^' : '*';
    if (k === '*' && dash(seed, i, j, 0.6)) k = '%';
    if ((j === 7 || j === h - 8) && pegs.includes(i)) k = '@';
    if (i >= lx && i <= lx + 1 && j === 17) k = '&';
    if (i === lx + 1 && j === 16) k = '@';
    return j < 2 ? darker(k) : k;
  };
}

/** Une dalle de calcaire (le seuil). */
export function slabTex(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return hash(seed, i >> 1, j) < 0.18 ? '=' : j === Math.floor(c.h) - 1 ? '!' : '+';
    return j === Math.floor(c.h) - 1 ? '+' : hash(seed, i, j) < 0.2 ? ';' : '=';
  };
}

/**
 * Le chaume, la face du dessus d'un pan (t le long de la pente, depuis l'égout) : des rangs de 30 cm posés de bas en haut, chacun
 * couvre le haut du précédent ; le bas de chaque rang en pointes inégales, l'ombre sous les pointes, les brins clairs en tirets
 * dans le sens de la pente ; quelques plaques de paille plus vieille.
 */
export function thatchSlope(seed: number): Tex {
  const C = 6;
  return (s, t) => {
    const i = Math.floor(s);
    const tip = (k: number) => [0, 0.6, 1.1, 1.6][Math.floor(hash(seed, i, k) * 4)] + (hash(seed, i >> 1, k, 7) < 0.3 ? 0.6 : 0);
    let k = Math.floor(t / C);
    if (t >= (k + 1) * C - tip(k + 1)) k++;
    const f = t - (k * C - tip(k));
    let r = 1; // Y t T P : 0 lumière, 1 paille, 2 ombre, 3 creux
    if (f >= C - 1.6) r = f >= C - 0.7 && hash(seed, i, k, 3) < 0.5 ? 3 : 2;
    else if (f < 1) r = hash(seed, i, k, 4) < 0.45 ? 0 : 1;
    else if (dash(seed + 3, i, Math.floor(t * 1.4), 0.45)) r = 0;
    if (hash(seed, i >> 3, k, 11) < 0.05 && r === 1) r = 2;
    return 'YtTP'[r];
  };
}

/** L'égout : la tranche du chaume, les bouts des brins, à l'ombre ; le bas effiloché (des colonnes plus courtes). */
export function thatchEave(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t), h = Math.floor(c.h);
    if (j < [0, 0, 1, 1, 2][Math.floor(hash(seed, i, 1) * 5)]) return null;
    if (j >= h - 1) return 't';
    if ((i + Math.floor(hash(seed, Math.floor(i / 3), 2) * 3)) % 3 === 2 && hash(seed, i, j >> 2) < 0.7) return 'P';
    return dash(seed, i, j, 0.5) ? 't' : 'T';
  };
}

/** Le faîtage de terre : la terre modelée par sa pente (le dessus clair), des mottes, l'herbe en touffes sur le dessus. */
export function earthRidge(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), nz = c.n[2];
    // le pied du bourrelet, inégal : le chaume se voit entre les mottes
    if (nz < 0.3 && t < c.h * (0.25 + 0.6 * hash(seed, Math.floor(i / 2), 3))) return null;
    // le bourrelet arrondi : le dessus clair, la joue sud en terre moyenne, le pied à l'ombre (sur le chaume)
    let r = nz > 0.9 ? 0 : nz > 0.3 ? 1 : nz > 0.12 ? 2 : 3;
    const z = Math.floor(c.p[2] * 1.4);
    if (r < 3 && hash(seed, i >> 1, z >> 1) < 0.16) r++;
    else if (r > 0 && hash(seed, i, z, 2) < 0.1) r--;
    // l'herbe : en touffes (4 à 7 px) sur le dessus, quelques brins qui descendent sur la joue
    const tuft = Math.floor((i + Math.floor(hash(seed, Math.floor(i / 6), 8) * 4)) / 6);
    if (hash(seed, tuft, 5) < 0.55 && nz > 0.5) {
      const g = hash(seed, i, z, 6);
      if (nz > 0.9 ? g < 0.8 : g < 0.35) return g < 0.2 ? 'G' : g < 0.5 ? 'g' : 'v';
    }
    return 'Uune'[r];
  };
}

/** Un pignon (vu de face, dans le plan du mur de bout) : le remplissage à l'étape du mur, masqué au triangle sous les chevrons ; `hole` : le trou de fumée. */
export function gableTex(inner: Tex, apex: (s: number) => number, hole?: (s: number, t: number) => boolean): Tex {
  return (s, t, c) => (t >= apex(s) || hole?.(s, t) ? null : inner(s, t, c));
}

// =====================================================================================================================
// Rendu d'une pièce seule (le jeu)
// =====================================================================================================================

/**
 * Le dessin d'une pièce seule, sans sol : ses faces dans la projection (x, k·y − z), le point le plus au sud gardé, puis le contour
 * (la teinte sombre de la pièce en haut et à gauche, OUTLINE en bas et à droite, contre le vide ou ce qui est derrière). Recadré
 * sur ce qui est dessiné. Les signes sont ceux de `stonePalette` (le monde, le bois travaillé à l'âge neuf : le build tire le
 * patiné et le vieux).
 */
export function renderPiece(quads: Quad[], opts: { k?: number } = {}): Grid {
  const k = opts.k ?? 1;
  const view = unit([0, 1, k]);
  const P = (p: V3): [number, number] => [p[0], k * p[1] - p[2]];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of quads) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)]) {
    const [X, Y] = P(p);
    x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
  }
  const bx = Math.floor(x0) - 1, by = Math.floor(y0) - 1, W = Math.ceil(x1) + 1 - bx, H = Math.ceil(y1) + 1 - by, N = W * H;
  const depth = new Float64Array(N).fill(-Infinity);
  const ch: string[] = new Array(N).fill('.');
  const parts: (Part | undefined)[] = new Array(N);
  for (const q of quads) {
    if (dot(q.n, view) <= 1e-6) continue;
    const a11 = q.u[0], a12 = q.v[0], a21 = k * q.u[1] - q.u[2], a22 = k * q.v[1] - q.v[2], det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-9) continue;
    const cs = [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)].map(P);
    const X0 = Math.floor(Math.min(...cs.map((c) => c[0]))), X1 = Math.ceil(Math.max(...cs.map((c) => c[0])));
    const Y0 = Math.floor(Math.min(...cs.map((c) => c[1]))), Y1 = Math.ceil(Math.max(...cs.map((c) => c[1])));
    const [ox, oy] = P(q.o), lu = len(q.u), lv = len(q.v);
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
      const b1 = X + 0.5 - ox, b2 = Y + 0.5 - oy;
      // un centre de pixel qui tombe pile sur le bord d'une face (une face de 1,5 px sur une demi-rangée) lui appartient : sans
      // cette marge, la rangée entre le dessus et la face sud resterait vide
      const E = 1e-6;
      let s = (b1 * a22 - a12 * b2) / det, t = (a11 * b2 - a21 * b1) / det;
      if (s < -E || s > 1 + E || t < -E || t > 1 + E) continue;
      s = Math.min(Math.max(s, 0), 1 - 1e-9); t = Math.min(Math.max(t, 0), 1 - 1e-9);
      const p = add(add(q.o, mul(q.u, s)), mul(q.v, t));
      const dp = p[1] + q.part.prio * 1e-3;
      const i = (Y - by) * W + (X - bx);
      if (dp <= depth[i]) continue;
      const c = q.tex(s * lu, t * lv, { w: lu, h: lv, p, n: q.n, X, Y, face: q.face });
      if (c === null) continue;
      depth[i] = dp; ch[i] = c; parts[i] = q.part;
    }
  }
  const out = ch.slice();
  const behind = (i: number, j: number) => {
    if (j < 0) return true;
    const pj = parts[j], pi = parts[i]!;
    if (!pj) return true;
    if (pj === pi) return false;
    return depth[j] < depth[i] - 0.6 || (depth[j] <= depth[i] + 0.6 && pj.prio < pi.prio);
  };
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X, p = parts[i];
    if (!p || p.outline === 'none') continue;
    const at = (dx: number, dy: number) => (X + dx < 0 || X + dx >= W || Y + dy < 0 || Y + dy >= H ? -1 : (Y + dy) * W + X + dx);
    if (behind(i, at(1, 0)) || behind(i, at(0, 1))) out[i] = 'o';
    else if (p.outline === 'full' && (behind(i, at(-1, 0)) || behind(i, at(0, -1)))) out[i] = p.dark;
  }
  const rows: string[] = [];
  for (let Y = 0; Y < H; Y++) rows.push(out.slice(Y * W, (Y + 1) * W).join(''));
  // le bas de l'image : le bord sud de la boîte de la pièce, à sa base (le pan nord, vu du sud, garde dessous la hauteur du pignon)
  let maxY = -Infinity, minZ = Infinity;
  for (const q of quads) for (const p of [q.o, add(q.o, q.u), add(q.o, q.v), add(add(q.o, q.u), q.v)]) { maxY = Math.max(maxY, p[1]); minZ = Math.min(minZ, p[2]); }
  return crop(rows, Math.ceil(k * maxY - minZ - 1e-6) - 1 - by);
}

/** Une grille recadrée sur ce qui est dessiné ; `bottom` : la dernière rangée gardée au moins. */
export function crop(rows: Grid, bottom = -1): Grid {
  const used = (r: string) => /[^.]/.test(r);
  const top = rows.findIndex(used), last = rows.length - 1 - [...rows].reverse().findIndex(used);
  if (top < 0) return ['.'];
  let l = Infinity, r = -1;
  for (const row of rows) for (let x = 0; x < row.length; x++) if (row[x] !== '.') { l = Math.min(l, x); r = Math.max(r, x); }
  const out = rows.slice(top, last + 1).map((row) => row.slice(l, r + 1));
  for (let y = last + 1; y <= bottom; y++) out.push('.'.repeat(r - l + 1));
  return out;
}

/** L'ombre portée d'une pièce posée au sol : une rangée sous sa silhouette, décalée d'un pixel vers l'est (STYLE.md section 2). */
export function withGroundShadow(g: Grid): Grid {
  const rows = g.map((r) => r + '.');
  const last = rows[rows.length - 1];
  const shade = [...('.' + last.slice(0, last.length - 1))].map((c) => (c === '.' ? '.' : 'x')).join('');
  return [...rows, shade];
}

/** Une grille retournée de gauche à droite. */
export const mirror = (g: Grid): Grid => g.map((r) => [...r].reverse().join(''));
