// Matière bois du gros arbre : une seule définition pour toute la chaîne, de l'arbre debout à la bille.
// L'arbre (`big-tree`), sa souche, sa chute, les pièces du tronc couché, les billes (est-ouest et nord-sud), la bille
// portée et son icône tirent leur apparence d'ici, pour qu'on reconnaisse partout le même bois.
//
// - Écorce : la rampe du bois de la palette (M m N K), posée en travers du tronc. `s` va de 0 (bord tourné vers la
//   lumière) à 1 (bord dans l'ombre) : à gauche pour un tronc debout ou une bille nord-sud, en haut pour un tronc ou
//   une bille est-ouest. Sur 11 px (55 cm, le diamètre du tronc) : 3 M, 5 m, 2 N, 1 K.
// - Sillons : l'écorce se creuse dans le sens de la longueur. Trois couloirs en travers (rangées 2, 5, 8 sur 11, assez
//   écartés pour que deux tirets ne se touchent jamais), des tirets de 5 à 6 px qui descendent d'un pixel à
//   mi-longueur, de périodes différentes pour ne jamais s'aligner en planches. Un sillon prend la teinte d'écorce un cran plus sombre (M -> m, m -> N, N -> K).
// - Face de coupe : un ovale cerclé d'écorce (N), bois de bout (t) éclairé en haut à gauche (Y), un cerne (t côté
//   lumière, T côté ombre) et le cœur (T). Les entailles montrent le même bois frais (Y t T).

import { Canvas, EMPTY } from '../lib/canvas';

/** Diamètre du tronc du gros arbre en pixels : la référence des couloirs de sillons. */
export const DIAMETER = 11;

/**
 * Une sorte de tronc : son diamètre d'écorce (sans contour), les couloirs de sillons (rangée, période, longueur du
 * tiret, décalage : assez écartés pour que deux tirets ne se touchent jamais) et la demi-largeur de l'ovale de ses
 * bouts (Ø/2 en largeur à l'écran, gabarit).
 */
export interface Wood {
  diameter: number;
  furrows: [number, number, number, number][];
  endA: number;
}

/** Le gros arbre : tronc de 55 cm, 11 px d'écorce. */
export const BIG_WOOD: Wood = {
  diameter: DIAMETER,
  furrows: [
    [2, 13, 5, 0],
    [5, 11, 6, 6],
    [8, 12, 5, 3],
  ],
  endA: 2.5,
};

/**
 * L'arbre normal : tronc de 30 cm, 6 px d'écorce. Deux couloirs seulement (rangées 1 et 4 sur 6, le tiret descend
 * d'un pixel à mi-longueur : les rangées 1-2 et 4-5 ne se touchent jamais), de périodes différentes. La rampe d'écorce
 * de `barkTone` donne sur 6 px : 2 M, 2 m, 2 N (le K ne vient que des sillons). Bouts ovales de 4 px de large (Ø 40 cm contour compris ÷ 2).
 */
export const NORMAL_WOOD: Wood = {
  diameter: 6,
  furrows: [
    [1, 13, 4, 0],
    [4, 11, 5, 6],
  ],
  endA: 2,
};

/** Écorce, de la lumière à l'ombre (palette `world`). */
export const BARK = ['M', 'm', 'N', 'K'] as const;

/** Teinte d'écorce un cran plus sombre. */
export const DARKER: Record<string, string> = { M: 'm', m: 'N', N: 'K', K: 'K' };

/** Teinte d'écorce en travers du tronc, `s` de 0 (bord éclairé) à 1 (bord dans l'ombre). */
export function barkTone(s: number): string {
  return s < 0.28 ? 'M' : s < 0.7 ? 'm' : s < 0.92 ? 'N' : 'K';
}

/** Le pixel (`along` le long du tronc, `s` en travers) est-il dans un sillon ? */
export function furrowAt(along: number, s: number, wood: Wood = BIG_WOOD): boolean {
  const row = Math.floor(s * wood.diameter);
  const a = Math.floor(along);
  return wood.furrows.some(([r, p, n, ph]) => {
    const pos = (((a + ph) % p) + p) % p;
    if (pos >= n) return false;
    return row === r + (pos >= Math.ceil(n / 2) ? 1 : 0);
  });
}

/** Écorce en un point du tronc : la rampe, creusée par les sillons. */
export function bark(along: number, s: number, wood: Wood = BIG_WOOD): string {
  const b = barkTone(s);
  return furrowAt(along, s, wood) ? DARKER[b] : b;
}

/**
 * Bois d'une face de coupe en (u, v), dans le disque u² + v² ≤ 1 (u vers la droite, v vers le bas de l'écran ; la
 * lumière vient de (−, −)). `rim` : pixel du bord, l'écorce qui cercle la face. `dim` : face tournée vers l'ombre.
 * `rings` : le cerne, qui ne se lit que sur une face d'au moins 7 px de large (sur un bout étroit, rayures).
 */
export function faceTone(u: number, v: number, rim: boolean, dim = false, rings = true): string {
  if (rim) return 'N';
  const r = Math.hypot(u, v);
  const lit = u + v < (rings ? 0.15 : -0.3);
  let k: string;
  // le cœur, un peu décalé vers le bas à droite : un bloc de 2 × 2 sur une grande face, 1 × 2 sur un bout étroit
  if (Math.hypot(u - 0.09, v - 0.11) < 0.2) k = 'T';
  else if (rings && r >= 0.5 && r < 0.66) k = lit ? 't' : 'T';
  else k = lit ? 'Y' : 't';
  return dim ? ({ Y: 't', t: 'T', T: 'T' } as Record<string, string>)[k] : k;
}

/**
 * Peint une face de coupe ovale (centre cx, cy ; demi-axes rx, ry) sur les pixels déjà peints de `c` (`all` : aussi sur
 * le vide). Le bord est l'anneau des pixels de l'ovale qui touchent l'extérieur de l'ovale.
 */
export function paintFace(c: Canvas, cx: number, cy: number, rx: number, ry: number, opts: { dim?: boolean; all?: boolean } = {}): Canvas {
  const inside = (X: number, Y: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  const out: [number, number, string][] = [];
  for (let Y = Math.floor(cy - ry); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    if (!inside(X, Y)) continue;
    if (!opts.all && c.get(X, Y) === EMPTY) continue;
    const rim = !inside(X + 1, Y) || !inside(X - 1, Y) || !inside(X, Y + 1) || !inside(X, Y - 1);
    out.push([X, Y, faceTone((X + 0.5 - cx) / rx, (Y + 0.5 - cy) / ry, rim, opts.dim, Math.min(rx, ry) >= 3.5)]);
  }
  for (const [X, Y, k] of out) c.set(X, Y, k);
  return c;
}

/** Demi-largeur (le long du tronc) de l'ovale d'un bout de tronc couché est-ouest du gros arbre : 5 px de large. */
export const END_A = BIG_WOOD.endA;

/**
 * Bout d'un tronc ou d'une bille couchés est-ouest, dont le bois commence à la colonne `x` (`side` 'left' : le bois
 * s'étend vers la droite ; 'right' : vers la gauche, `x` est alors la colonne qui suit le dernier pixel de bois).
 * Le bout prend la forme d'un ovale (END_A de large, le rayon du tronc en hauteur, centré sur `cy`) : les coins sont
 * arrondis. Tourné vers la lumière (`face`), on y voit la face de coupe ; sinon l'écorce s'y enroule, un cran plus
 * sombre sur son bord.
 */
export function logEnd(c: Canvas, x: number, side: 'left' | 'right', cy: number, face: boolean, r = DIAMETER / 2, a = END_A): Canvas {
  const dir = side === 'left' ? 1 : -1;
  const ox = side === 'left' ? x + a : x - a; // centre de l'ovale
  const inside = (X: number, Y: number) => ((X + 0.5 - ox) / a) ** 2 + ((Y + 0.5 - cy) / r) ** 2 <= 1;
  const near = (X: number) => {
    const h = (X + 0.5 - x) * dir;
    return h >= 0 && h < a;
  };
  // coins arrondis
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (near(X) && c.get(X, Y) !== EMPTY && !inside(X, Y)) c.px[Y][X] = EMPTY;
  }
  if (face) return paintFace(c, ox, cy, a, r);
  // bout dans l'ombre : l'écorce qui s'enroule, plus sombre sur le pourtour
  const edge: [number, number][] = [];
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (!near(X) || c.get(X, Y) === EMPTY) continue;
    if (c.get(X - dir, Y) === EMPTY) edge.push([X, Y]);
  }
  for (const [X, Y] of edge) c.px[Y][X] = DARKER[c.px[Y][X]] ?? c.px[Y][X];
  return c;
}

/**
 * Bille vue par le bout (couchée nord-sud, ou portée de profil) : le dessus d'écorce du rond du fond (cy = `back`) au
 * rond de devant (`front`), le bord du bout lointain en haut (l'écorce qui s'enroule, en N), la face de coupe devant.
 * Pas de contour ni d'ombre. Le corps porte la même écorce que le tronc debout (lumière à gauche), sillons dans le sens
 * de la bille.
 */
export function logByTheEnd(c: Canvas, cx: number, back: number, front: number, rx: number, ry: number, wood: Wood = BIG_WOOD): Canvas {
  const inDisk = (X: number, Y: number, cy: number) => ((X + 0.5 - cx) / rx) ** 2 + ((Y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    const body = Math.abs(X + 0.5 - cx) <= rx && Y + 0.5 >= back && Y + 0.5 <= front;
    if (!body && !inDisk(X, Y, back)) continue;
    const s = (X + 0.5 - (cx - rx)) / (2 * rx);
    // la bille fuit vers le haut de l'écran : le sillon se lit le long de Y, raccourci
    let k = bark(Y * 1.2, s, wood);
    // bord du bout lointain : le haut du rond du fond, qu'on ne voit pas sous le rond décalé d'un pixel et demi
    if (Y + 0.5 < back && !inDisk(X, Y - 1.5, back)) k = k === 'K' ? 'K' : 'N';
    c.set(X, Y, k);
  }
  return paintFace(c, cx, front, rx, ry, { all: true });
}

// ---------- Bois équarri ----------
//
// Poteaux, sablières, chevrons : le même bois que l'arbre, taillé à la hache. Les faces équarries montrent le bois
// clair des faces de coupe (Y t T, comme le bois de bout des billes), le fil dans le sens de la pièce, et par endroits
// un reste d'écorce (la rampe M m N K) sur une arête, là où la hache n'a pas mordu (la flache).
// - Teinte de fond d'une face (`s` de 0, bord tourné vers la lumière, à 1, bord dans l'ombre ; `width` la largeur de
//   la face en pixels) : t ; sur une face d'au moins 3 px, Y sur le premier pixel côté lumière, T sur le dernier.
// - Fil : des tirets d'un cran plus sombres (Y -> t, t -> T), de 3 à 4 px, le long de la pièce, de périodes
//   différentes par couloir (un couloir tous les 3 px en travers) pour ne jamais s'aligner ; un pixel de bois clair
//   les sépare toujours d'une plaque d'écorce.
// - Flache : des plaques d'écorce de 4 à 5 px le long d'une arête (`wane` : 'lit', l'arête éclairée, en m ; 'shade',
//   l'arête dans l'ombre, en N), finies d'un pixel plus sombre vers le bas de l'image (le bord de l'écorce) ; sur
//   une face de moins de 3 px, la plaque prend toute la largeur. Une pièce de 3 px de large (le poteau : contour,
//   une colonne de bois, contour) n'a qu'une colonne : la flache s'y lit comme une plaque brune sur le bois clair,
//   le contour gauche reste N (teinte la plus sombre du bois de coupe, comme dans trees.ts).
// `along` se compte en pixels le long de la pièce ; le décaler (`phase`) donne une autre pièce du même bois.

/** Couloirs du fil : période, longueur du tiret, décalage. */
const GRAIN: [number, number, number][] = [
  [13, 3, 4],
  [11, 4, 7],
  [14, 3, 1],
];

/** Plaques d'écorce sur une arête : période, longueur, décalage (deux suites mêlées, pour qu'elles tombent au hasard). */
const WANE: [number, number, number][] = [
  [23, 5, 0],
  [53, 3, 30],
];

/** Teinte de bois clair un cran plus sombre. */
const HEWN_DARKER: Record<string, string> = { Y: 't', t: 'T', T: 'T' };

/** Le pixel (`along` le long de la pièce) est-il dans une plaque d'écorce ? Rend sa place dans la plaque, ou -1. */
function waneAt(along: number): { i: number; n: number } | null {
  const a = Math.floor(along);
  for (const [p, n, ph] of WANE) {
    const pos = (((a + ph) % p) + p) % p;
    if (pos < n) return { i: pos, n };
  }
  return null;
}

/**
 * Teinte d'une face équarrie au pixel (`along` le long de la pièce, `col` de 0 à `width` − 1 en travers, colonne 0
 * côté lumière). `wane` : l'arête qui garde de l'écorce par endroits (aucune si absent).
 */
export function hewnTone(along: number, col: number, width: number, wane?: 'lit' | 'shade'): string {
  const a = Math.floor(along);
  // flache : sur l'arête choisie, toute la largeur si la face est étroite
  if (wane) {
    const w = waneAt(a);
    const onEdge = width < 3 || (wane === 'lit' ? col === 0 : col === width - 1);
    if (w && onEdge) {
      const last = w.i === w.n - 1;
      if (wane === 'lit') return last ? 'N' : 'm';
      return last ? 'K' : 'N';
    }
  }
  let k = width >= 3 && col === 0 ? 'Y' : width >= 3 && col === width - 1 ? 'T' : 't';
  // un couloir de fil tous les 3 px en travers, au milieu du couloir (ou sur toute face étroite)
  const [p, n, ph] = GRAIN[Math.floor(col / 3) % GRAIN.length];
  const pos = (((a + ph) % p) + p) % p;
  // le fil s'écarte de la flache d'un pixel : une plaque d'écorce garde du bois clair autour d'elle
  const nearWane = wane && (waneAt(a - 1) || waneAt(a + 1));
  if (pos < n && !nearWane && (width < 3 || col % 3 === 1)) k = HEWN_DARKER[k];
  return k;
}
