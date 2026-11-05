// Proposition : les portraits 64 px du forgeron (chantier « forgeron », CADRAGE-forgeron.md section 6), un par variante du
// sprite (art/proposals/forgeron-colosse.ts : A « le chêne », B « le bœuf », C « le géant tranquille »), rasé avec la moustache
// ou avec une barbe de quelques jours. Essai hors jeu : rien ici n'est déclaré dans art/index.ts. Planche :
// npx tsx tools/essai-forgeron-portrait.ts écrit .art-preview/forgeron-portrait.png.
//
// Qui : une trentaine d'années, un colosse très calme, sympathique, qui écoute. Ce qui avait raté (portrait de
// art/proposals/forgeron.ts) : des rides, des joues creusées, une arcade lourde, des yeux enfoncés : vieux et dur. Ici :
// - le visage large et franc, les joues pleines (aucune ombre en biais sous les pommettes), aucune ride, aucune cerne ;
// - la mâchoire puissante : son angle se lit contre les cheveux et par l'ombre du cou sous elle, jamais par un trait sur la joue ;
// - le nez fort (l'arête au jour, le bout large), les yeux grands ouverts avec leur reflet, les sourcils doux et hauts ;
// - l'esquisse d'un sourire : les coins de la bouche remontent d'un pixel sous la moustache, la lèvre du bas au jour ;
// - le cou épais, les trapèzes, le haut des épaules nues ; la bavette de cuir et sa lanière au cou en bas du cadre ;
// - les cheveux blond doré en mèches : chaque mèche est une bande effilée le long d'une courbe (`lock`), claire à gauche, son
//   ombre à droite, séparée de la voisine par sa teinte la plus sombre, un reflet au jour en haut ; elles ondulent un peu.
//
// Construit comme ceux de Xéros et de la mère (art/portraits/) : formes pensées sur 64 px, yeux, sourcils et bouche en grilles
// écrites à la main, contour d'un pixel, contour côté lumière dans la teinte sombre de chaque matière (selOut).
//
// Couleurs : les rampes du sprite (`ramps` de forgeron-colosse.ts, le portrait fait référence), plus quelques teintes propres au
// portrait, comme celui de Xéros : `G` (un blond entre le reflet et la mèche), `e` (le creux le plus sombre des cheveux, sous
// les mèches et derrière la nuque), `c` (la peau entre la lumière et la peau, pour modeler le front et les joues sans saut),
// les yeux, la bouche, et la barbe de quelques jours (`b`, `B` : la peau mêlée de poils blonds, au jour et à l'ombre).

import { Canvas, flipX, selOut, type Grid } from '../lib/canvas';
import { OUTLINE } from '../palette';
import { ramps } from './forgeron-colosse';

export type Variant = 'A' | 'B' | 'C';

export const palette: Record<string, string> = {
  o: OUTLINE,
  // blond doré (ramps.gold) : Y reflet, G entre deux, H mèche au jour, h mèche, d ombre entre les mèches, e le creux
  Y: ramps.gold.light,
  G: '#efcd7e',
  H: ramps.gold.base,
  h: ramps.gold.shade,
  d: ramps.gold.deep,
  e: '#5e3c1d',
  // peau hâlée (ramps.skin) : l lumière, c entre deux, s peau, S ombre, D ombre profonde
  l: ramps.skin.light,
  c: '#e4b082',
  s: ramps.skin.base,
  S: ramps.skin.shade,
  D: ramps.skin.deep,
  // yeux noisette
  W: '#f0e7d6',
  i: '#74502c',
  I: '#a27646',
  p: '#22140c',
  q: '#fff6ea',
  // bouche
  m: '#b86e52',
  M: '#8a4a3a',
  // barbe de quelques jours : la peau mêlée de poils blonds
  b: '#c39058',
  B: '#9c6b43',
  // cuir du tablier (ramps.leather)
  A: ramps.leather.light,
  a: ramps.leather.base,
  k: ramps.leather.shade,
  K: ramps.leather.deep,
};

/** Contour côté lumière : teinte la plus sombre de chaque matière. */
const DARK: Record<string, string> = {
  Y: 'e', G: 'e', H: 'e', h: 'e', d: 'e', e: 'e',
  l: 'D', c: 'D', s: 'D', S: 'D', D: 'D', b: 'D', B: 'D', m: 'D', M: 'D',
  A: 'K', a: 'K', k: 'K', K: 'K',
};

// ---------- Les mèches ----------

type P = [number, number];

/** Courbe de Catmull-Rom qui passe par les points, échantillonnée finement. */
function spline(pts: P[], steps = 8): P[] {
  const out: P[] = [];
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (k: 0 | 1) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
        + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Les teintes d'une mèche : au jour (côté gauche du visage), ou à l'ombre (côté droit). */
interface Tier { hi: string; base: string; shade: string; gap: string }
const LIT: Tier = { hi: 'Y', base: 'H', shade: 'h', gap: 'd' };
const MID: Tier = { hi: 'G', base: 'H', shade: 'h', gap: 'd' };
const SHADE: Tier = { hi: 'H', base: 'h', shade: 'd', gap: 'e' };

interface LockOpts {
  /** Part de la longueur où brille le reflet, [début, fin] entre 0 et 1. */
  hi?: [number, number];
  /** Part de la longueur où la mèche s'effile en pointe (0 : bout carré). */
  tip?: number;
  /** Sans la ligne de séparation du côté de l'ombre. */
  noGap?: boolean;
}

/**
 * Une mèche : une bande le long de la courbe `pts`, de largeur `w0` à `w1`, effilée au bout. Le côté tourné vers le bas et la
 * droite (loin de la lumière) prend l'ombre, son bord la teinte de séparation ; un reflet court le long du côté au jour.
 */
function lock(c: Canvas, pts: P[], w0: number, w1: number, tier: Tier, o: LockOpts = {}): void {
  const p = spline(pts);
  const n = p.length;
  const len: number[] = [0];
  for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const total = len[n - 1] || 1;
  const tip = o.tip ?? 0.3;
  const L: P[] = [], R: P[] = [], M: P[] = [], G: P[] = [], Hh: P[] = [];
  for (let i = 0; i < n; i++) {
    const t = len[i] / total;
    let w = w0 + (w1 - w0) * t;
    if (tip > 0 && t > 1 - tip) w *= 0.25 + 0.75 * ((1 - t) / tip);
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl; ny /= nl;
    if (nx + ny < 0) { nx = -nx; ny = -ny; }
    const [x, y] = p[i];
    L.push([x - nx * w / 2, y - ny * w / 2]);
    R.push([x + nx * w / 2, y + ny * w / 2]);
    M.push([x + nx * w * 0.08, y + ny * w * 0.08]);
    G.push([x + nx * (w / 2 - 0.45), y + ny * (w / 2 - 0.45)]);
    Hh.push([x - nx * w * 0.22, y - ny * w * 0.22]);
  }
  c.polygon([...L, ...[...R].reverse()], tier.base);
  c.polygon([...M, ...[...R].reverse()], tier.shade);
  const path = (q: P[], col: string, from = 0, to = 1) => {
    for (let i = 1; i < n; i++) {
      const t = len[i] / total;
      if (t < from || t > to) continue;
      c.line(q[i - 1][0], q[i - 1][1], q[i][0], q[i][1], col);
    }
  };
  if (!o.noGap) path(G, tier.gap, 0, 0.97);
  const [h0, h1] = o.hi ?? [0.08, 0.4];
  path(Hh, tier.hi, h0, h1);
}

// ---------- La tête : réduite et descendue dans le cadre ----------
// Le crâne et le dessus des cheveux sont pensés sur une grande tête (coordonnées de dessin), puis réduits d'environ 15 % et
// descendus (`Xf`) : la tête ne remplit plus le cadre, ce sont les épaules et les trapèzes, coupés par les bords, qui disent le
// colosse. Le buste, le visage et les côtés des cheveux sont posés à leur place finale.

interface Xf { k: number; oy: number }
const tp = (f: Xf, [x, y]: P): P => [32 + (x - 32) * f.k, y * f.k + f.oy];
const tps = (f: Xf, pts: P[]): P[] => pts.map((p) => tp(f, p));

/** Une mèche du dessus, en coordonnées de dessin. */
function capLock(c: Canvas, f: Xf, pts: P[], w0: number, w1: number, tier: Tier, o: LockOpts = {}): void {
  lock(c, tps(f, pts), w0 * 0.9, w1 * 0.9, tier, o);
}

interface Head {
  /** Demi-largeur du visage aux pommettes. */
  half: number;
  /** Demi-largeur à l'angle de la mâchoire, et sa rangée. */
  jaw: number;
  jawY: number;
  /** Demi-largeur du menton, et sa rangée du bas. */
  chin: number;
  chinY: number;
  /** Rangée du haut de la ligne de paupière ; haut du front (caché par les cheveux). */
  eyeY: number;
  top: number;
  /** Demi-écart entre les yeux (du centre au coin intérieur). */
  eyeGap: number;
  /** Demi-largeur du cou. */
  neck: number;
  /** Rangée où le cou rejoint la pente des trapèzes. */
  trap: number;
}

// ---------- Le buste : épaules, pectoraux, tablier, cou ----------

function bust(c: Canvas, h: Head): void {
  const nl = 32 - h.neck, nr = 32 + h.neck;
  const t = h.trap;
  // épaules nues : les trapèzes partent haut derrière la mâchoire et descendent jusqu'aux deltoïdes, coupés par le cadre
  c.polygon([[0, 64], [0, t + 8], [4, t + 6], [11, t + 4], [18, t + 1.5], [nl, t - 1], [nr, t - 1], [46, t + 1.5], [53, t + 4],
    [60, t + 6], [64, t + 8], [64, 64]], 's');
  c.within('s', (c) => {
    // l'ombre : tout le côté droit, sous le trapèze droit
    c.polygon([[nr - 1, t - 1], [46, t + 1.5], [53, t + 4], [60, t + 6], [64, t + 8], [64, 64], [44, 64], [43, t + 8]], 'S');
    // la lumière sur la crête du trapèze gauche
    c.polygon([[0, t + 8.4], [4, t + 6.4], [11, t + 4.4], [18, t + 1.9], [nl, t - 0.6], [nl, t + 1], [18, t + 3.2], [11, t + 5.6],
      [4, t + 8], [0, t + 10]], 'l');
    // le deltoïde gauche, une masse ronde au bord du cadre : au jour, son ombre en croissant vers le pectoral
    c.ellipse(0, t + 17, 6, 7, 'c');
    c.ellipse(-1, t + 16, 4, 4.5, 'l');
    c.line(6, t + 13, 7, t + 16, 'S');
    c.line(7, t + 17, 7, 64, 'S');
    // le pectoral gauche, au jour sous le trapèze, son bord bas à l'ombre
    c.ellipse(16, t + 14, 6, 4, 'c');
    c.line(9, t + 19, 21, t + 18, 'S');
    c.line(10, t + 20, 21, t + 19, 'S');
  });
  c.within('S', (c) => {
    // le deltoïde droit : sa crête attrape un peu de jour, son creux vers le pectoral
    c.polygon([[56, t + 7], [64, t + 9], [64, t + 12], [58, t + 10]], 's');
    c.line(57, t + 13, 57, 64, 'D');
    c.line(43, t + 18, 55, t + 19, 'D');
  });

  // la bavette de cuir, plus étroite que la poitrine ; sa lanière monte de chaque coin vers la base du cou
  const by = t + 13;
  c.polygon([[23, by], [41, by], [42, 64], [22, 64]], 'a');
  c.within('a', (c) => {
    c.polygon([[36, by], [41, by], [42, 64], [37, 64]], 'k');
    c.line(23, by, 40, by, 'A');
    c.line(23, by + 1, 23, 64, 'A');
    for (let x = 25; x < 40; x += 2) c.set(x, by + 2, 'k');
  });
  c.line(24, by, nl + 1, t + 3, 'A');
  c.line(25, by, nl + 2, t + 3, 'a');
  c.line(40, by, nr - 1, t + 3, 'K');
  c.line(39, by, nr - 2, t + 3, 'k');

  // le cou de taureau, en peau : clair à gauche, à l'ombre à droite
  c.rect(nl, h.jawY - 5, nr - nl, t - h.jawY + 8, 's');
  c.within('s', (c) => {
    c.rect(nl + 1, h.jawY - 5, 3, t - h.jawY + 8, 'c');
    c.rect(nr - 4, h.jawY - 5, 4, t - h.jawY + 8, 'S');
    // le creux de la gorge
    c.set(32, t + 3, 'S');
    c.set(31, t + 4, 'S');
    c.set(32, t + 4, 'S');
  });
  // la lanière qui passe derrière le cou
  c.line(nl + 1, t + 3, nl + 1, t + 1, 'A');
  c.line(nr - 1, t + 3, nr - 1, t + 1, 'K');
}

// ---------- Le visage ----------

function face(c: Canvas, h: Head): void {
  const nl = 32 - h.neck, nr = 32 + h.neck;
  const L = 32 - h.half, R = 32 + h.half;
  // l'angle de la mâchoire : le flanc presque droit jusqu'à lui, puis une cassure nette vers le menton
  const poly: P[] = [
    [L + 2, h.top], [R - 2, h.top], [R, h.top + 8], [R + 0.3, h.eyeY + 4], [32 + h.jaw + 0.3, h.jawY - 1.5], [32 + h.jaw, h.jawY],
    [32 + h.chin + 1, h.chinY - 0.6], [32 + h.chin, h.chinY], [32 - h.chin, h.chinY], [32 - h.chin - 1, h.chinY - 0.6],
    [32 - h.jaw, h.jawY], [32 - h.jaw - 0.3, h.jawY - 1.5], [L - 0.3, h.eyeY + 4], [L, h.top + 8],
  ];
  c.polygon(poly, 's');
  const mask = new Canvas(64, 64).polygon(poly, '#');
  c.within('s', (c) => {
    // le côté droit dans l'ombre, de la tempe à la mâchoire
    c.polygon([[R - 2.5, h.top], [R + 1, h.top + 8], [R + 1, h.eyeY + 4], [32 + h.jaw + 1.5, h.jawY - 1.5], [32 + h.jaw + 1, h.jawY + 0.5],
      [32 + h.chin + 2, h.chinY + 0.5], [32 + h.chin - 1, h.chinY + 1], [32 + h.jaw - 2.5, h.jawY - 1], [R - 3, h.eyeY + 4],
      [R - 3, h.top + 8]], 'S');
    // le front au jour
    c.ellipse(28, h.top + 5, 7, 4, 'c');
    c.ellipse(26, h.top + 4, 4, 2.4, 'l');
    // les pommettes marquées par la lumière : un trait clair sur la gauche, une crête sur la droite
    c.line(L + 2, h.eyeY + 5, L + 6, h.eyeY + 4, 'l');
    c.line(L + 2, h.eyeY + 6, L + 5, h.eyeY + 6, 'c');
    c.line(L + 3, h.eyeY + 7, L + 5, h.eyeY + 7, 'c');
    // le menton au jour
    c.line(29, h.chinY - 1, 32, h.chinY - 1, 'c');
    // le dessous de la mâchoire : son bord tourné vers le bas
    c.line(32 - h.chin, h.chinY, 32 + h.chin, h.chinY, 'S');
    c.line(32 + h.jaw - 1, h.jawY + 1, 32 + h.chin + 1, h.chinY - 1, 'D');
  });
  c.within('S', (c) => {
    c.line(R - 2, h.eyeY + 5, R - 1, h.eyeY + 5, 's');
    c.line(R - 3, h.eyeY + 4, R - 2, h.eyeY + 4, 's');
  });
  // l'ombre de la mâchoire sur le cou : une bande de trois rangées en peau ombrée, de l'angle au menton
  for (let x = nl; x < nr; x++) {
    let y = 63;
    while (y > 0 && mask.get(x, y) !== '#') y--;
    if (y <= h.jawY - 3) continue;
    if ('sScl'.includes(c.get(x, y + 1))) c.set(x, y + 1, 'D');
    if ('scl'.includes(c.get(x, y + 2))) c.set(x, y + 2, 'S');
    if ('cl'.includes(c.get(x, y + 3))) c.set(x, y + 3, 's');
  }
}

// ---------- Les détails : yeux, sourcils, nez, moustache, bouche ----------

const EYE: Grid = [
  '.oooo.',
  'oiqpiW',
  'WiIIiW',
  '..ii..',
];
const BROW: Grid = [
  '.hdddd',
  'dd....',
];

function features(c: Canvas, h: Head): void {
  const eyeY = h.eyeY;
  const xl = Math.round(32 - h.eyeGap - 6), xr = 64 - xl - 6;
  // le pli de la paupière, au-dessus de l'œil : le regard posé
  c.within('slcSD', (c) => {
    c.line(xl + 1, eyeY - 2, xl + 4, eyeY - 2, 'S');
    c.line(xr + 1, eyeY - 2, xr + 4, eyeY - 2, 'D');
    c.line(xl + 1, eyeY - 1, xl + 4, eyeY - 1, 'l');
  });
  c.stamp(EYE, xl, eyeY);
  c.stamp(flipX(EYE), xr, eyeY);
  c.stamp(BROW, xl, eyeY - 5);
  c.stamp(flipX(BROW), xr, eyeY - 5);

  // le nez fort : l'arête au jour, son ombre à droite, le bout large, les narines
  const ny = eyeY;
  c.line(31, ny + 1, 31, ny + 4, 'c');
  c.line(30, ny + 3, 30, ny + 5, 'l');
  c.line(33, ny + 1, 33, ny + 5, 'S');
  c.line(34, ny + 3, 34, ny + 5, 'S');
  c.line(29, ny + 6, 35, ny + 6, 's');
  c.set(30, ny + 6, 'l');
  c.set(31, ny + 6, 'l');
  c.line(33, ny + 6, 35, ny + 6, 'S');
  c.line(29, ny + 7, 35, ny + 7, 'S');
  c.set(28, ny + 6, 'S');
  c.set(36, ny + 6, 'D');
  c.set(29, ny + 7, 'D');
  c.set(35, ny + 7, 'D');
}

/** Moustache blonde et bouche souriante, sous le nez (rangée `y` : le haut de la moustache). */
function mouth(c: Canvas, y: number): void {
  // la bouche : les coins remontent sous les pointes de la moustache, la lèvre du bas au jour
  c.line(28, y + 3, 36, y + 3, 'M');
  c.set(27, y + 2, 'M');
  c.set(37, y + 2, 'M');
  c.line(29, y + 4, 35, y + 4, 'm');
  c.set(30, y + 4, 'c');
  c.set(31, y + 4, 'c');
  c.line(30, y + 5, 34, y + 5, 'S');
  // la moustache, un cran plus foncée que les cheveux : la mèche `h`, le jour en haut à gauche, l'ombre `d` dessous
  c.polygon([[28, y - 0.3], [31.5, y + 0.3], [32.5, y + 0.3], [36, y - 0.3], [37.6, y + 1.3], [37, y + 2.6], [33, y + 2.4],
    [31, y + 2.4], [27, y + 2.6], [26.4, y + 1.3]], 'h');
  c.within('h', (c) => {
    c.line(28, y, 30, y, 'H');
    c.set(27, y + 1, 'H');
    c.set(28, y + 1, 'H');
    c.line(31, y + 2, 37, y + 2, 'd');
    c.line(27, y + 2, 29, y + 2, 'd');
    c.line(34, y + 1, 37, y + 1, 'd');
    c.set(32, y + 1, 'd');
    c.set(32, y, 'd');
  });
}

/** La barbe de quelques jours : une ombre de poils blonds courts sur les joues, la mâchoire, le menton et la lèvre. */
function stubble(c: Canvas, h: Head): void {
  const top = h.eyeY + 6;
  const area: P[] = [
    [32 - h.half - 0.5, top - 1], [32 - h.half + 3, top + 2], [27, top + 3], [37, top + 3], [32 + h.half - 3, top + 2],
    [32 + h.half + 0.5, top - 1], [32 + h.half + 1, h.jawY], [32 + h.chin + 2, h.chinY + 1], [32 - h.chin - 2, h.chinY + 1],
    [32 - h.half - 1, h.jawY],
  ];
  const tmp = new Canvas(64, 64);
  tmp.polygon(area, '#');
  const map: Record<string, string> = { s: 'b', c: 'b', l: 'b', S: 'B', D: 'B' };
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    if (tmp.get(x, y) !== '#') continue;
    const to = map[c.get(x, y)];
    if (!to) continue;
    // le haut de la barbe se perd sur la joue : un pixel sur deux sur les deux premières rangées
    const edge = tmp.get(x, y - 1) !== '#' || tmp.get(x, y - 2) !== '#';
    if (edge && (x + y) % 2 === 0) continue;
    // le grain : quelques pixels de peau dans la barbe au jour
    if (to === 'b' && (x * 3 + y * 5) % 7 === 0) continue;
    c.set(x, y, to);
  }
}

/** Les cheveux de derrière, seulement autour du crâne jusqu'à la mâchoire : sous elle, le cou et les épaules restent nus. */
function backHair(c: Canvas, h: Head): void {
  const w = h.half + 2.5;
  c.polygon([[32 - w + 1, h.top], [32 + w - 1, h.top], [32 + w, h.eyeY + 4], [32 + w - 1, h.jawY - 1], [32 - w + 1, h.jawY - 1],
    [32 - w, h.eyeY + 4]], 'e');
}

function finishFace(c: Canvas, h: Head, stub: boolean): void {
  features(c, h);
  if (stub) stubble(c, h);
  mouth(c, h.eyeY + 8);
}

/** Le miroir d'une mèche (côté droit, à l'ombre). */
const mx = (pts: P[]): P[] => pts.map(([x, y]) => [64 - x, y]);

// ---------- Les trois têtes ----------

/** A, « le chêne » : tête carrée, cheveux aux épaules, raie sur le côté, deux mèches sur le front. */
function drawA(stub: boolean): Canvas {
  const c = new Canvas(64, 64);
  const f: Xf = { k: 0.85, oy: 7 };
  const h: Head = { half: 12, jaw: 11.5, jawY: 40, chin: 6.5, chinY: 44, eyeY: 28, top: 15, eyeGap: 3, neck: 10, trap: 43 };
  backHair(c, h);
  bust(c, h);
  face(c, h);

  // la masse du crâne sous les mèches, et la ligne des cheveux sur le front
  c.polygon(tps(f, [[14, 30], [14, 14], [18, 7], [26, 3.5], [38, 3.5], [46, 7], [50, 14], [50, 30], [47.5, 22], [45, 16], [38, 13],
    [31, 13.5], [25, 14], [21, 17], [17.5, 23]]), 'h');
  capLock(c, f, [[24, 5], [19, 8], [16, 14], [15.5, 21]], 5, 4, LIT, { tip: 0, hi: [0.05, 0.6] });
  capLock(c, f, [[26, 4], [34, 3.8], [43, 6.5], [48.5, 13], [49.5, 21]], 6, 5, MID, { tip: 0, hi: [0.05, 0.45] });
  capLock(c, f, [[25, 7], [32, 8], [40, 11], [45.5, 16], [47.5, 24]], 5, 4, MID, { tip: 0, hi: [0.05, 0.35] });
  // les deux mèches qui tombent sur le front, et s'arrêtent au-dessus des sourcils
  capLock(c, f, [[25, 8], [28.5, 11], [30.5, 14], [31, 17.5]], 5, 3, LIT, { tip: 0.45, hi: [0.05, 0.55] });
  capLock(c, f, [[29, 9], [34, 12], [36.5, 15], [38, 18]], 5, 3, MID, { tip: 0.45, hi: [0.05, 0.5] });
  const [rx, ry] = tp(f, [24, 4]);
  c.line(rx, ry, rx + 1, ry + 3, 'd'); // la raie

  // les côtés : deux mèches par côté, de longueurs différentes ; la grande passe derrière la mâchoire et finit sur le trapèze
  // en ondulant, la petite s'arrête sous l'oreille ; entre elles et le cou, la peau
  const short: P[] = [[19.5, 17], [17.5, 23], [17, 29], [15.5, 34], [15.5, 39]];
  const long: P[] = [[21, 15], [18.5, 22], [18, 29], [16.5, 35], [15, 40], [12.5, 44], [11, 47], [12.5, 49.5]];
  lock(c, short, 3.5, 3, LIT, { tip: 0.35, hi: [0.05, 0.4] });
  lock(c, mx(short), 3.5, 3, SHADE, { tip: 0.35, hi: [0.05, 0.3] });
  lock(c, long, 4.5, 3.5, LIT, { tip: 0.3, hi: [0.05, 0.35] });
  lock(c, mx(long), 4.5, 3.5, SHADE, { tip: 0.3, hi: [0.05, 0.25] });

  finishFace(c, h, stub);
  return c;
}

/** B, « le bœuf » : la tête et le cou les plus larges, cheveux passés les épaules, une mèche qui barre le front. */
function drawB(stub: boolean): Canvas {
  const c = new Canvas(64, 64);
  const f: Xf = { k: 0.87, oy: 6.5 };
  const h: Head = { half: 13.5, jaw: 13.5, jawY: 40, chin: 7.5, chinY: 44, eyeY: 28, top: 15, eyeGap: 3.5, neck: 11.5, trap: 42 };
  backHair(c, h);
  bust(c, h);
  face(c, h);

  c.polygon(tps(f, [[12, 30], [12, 14], [17, 7], [25, 3.5], [39, 3.5], [47, 7], [52, 14], [52, 30], [49.5, 22], [47, 16], [40, 12.5],
    [32, 12.5], [24, 13.5], [19.5, 17], [16, 23]]), 'h');
  capLock(c, f, [[30, 3.5], [22, 5], [16.5, 10], [14, 18]], 6, 5, LIT, { tip: 0, hi: [0.05, 0.6] });
  capLock(c, f, [[33, 3.5], [41, 4.5], [47.5, 9], [50.5, 17]], 6, 5, MID, { tip: 0, hi: [0.05, 0.4] });
  capLock(c, f, [[37, 6], [43.5, 9], [48, 15], [49.5, 23]], 5, 4, MID, { tip: 0, hi: [0.05, 0.3] });
  capLock(c, f, [[28, 6], [34, 8.5], [40, 12.5], [44, 17]], 5, 4, MID, { tip: 0.3, hi: [0.05, 0.4] });
  // la mèche qui barre le front en biais, de la tempe gauche au-dessus du sourcil droit
  capLock(c, f, [[19, 11], [25, 12], [31, 14], [37, 16], [41, 18]], 6, 3, LIT, { tip: 0.35, hi: [0.05, 0.55] });

  // les côtés, plus longs : la grande mèche passe l'épaule et finit sur le haut de la poitrine en ondulant
  const short: P[] = [[18, 17], [16, 24], [16, 30], [14, 36], [14, 42], [12, 46]];
  const long: P[] = [[20, 15], [17.5, 22], [17, 29], [15.5, 36], [14, 42], [12, 47], [12.5, 52], [10.5, 56], [12, 59]];
  lock(c, short, 4, 3, LIT, { tip: 0.3, hi: [0.05, 0.4] });
  lock(c, mx(short), 4, 3, SHADE, { tip: 0.3, hi: [0.05, 0.3] });
  lock(c, long, 4.5, 4, LIT, { tip: 0.25, hi: [0.05, 0.3] });
  lock(c, mx(long), 4.5, 4, SHADE, { tip: 0.25, hi: [0.05, 0.2] });

  finishFace(c, h, stub);
  return c;
}

/** C, « le géant tranquille » : la tête la plus grosse, cheveux rejetés en arrière qui ondulent, deux mèches devant les oreilles. */
function drawC(stub: boolean): Canvas {
  const c = new Canvas(64, 64);
  const f: Xf = { k: 0.88, oy: 6 };
  const h: Head = { half: 12.5, jaw: 12, jawY: 40, chin: 7, chinY: 45, eyeY: 28, top: 14, eyeGap: 3, neck: 10, trap: 43 };
  backHair(c, h);
  // la masse rejetée tombe derrière la nuque : une vague de chaque côté du cou, jusqu'au trapèze
  const wave: P[] = [[18, 30], [16, 35], [16.5, 40], [14, 44], [12.5, 47]];
  bust(c, h);
  lock(c, wave, 4.5, 3.5, LIT, { tip: 0.35, hi: [0.05, 0.35] });
  lock(c, mx(wave), 4.5, 3.5, SHADE, { tip: 0.35, hi: [0.05, 0.25] });
  // les oreilles, dégagées par les cheveux rejetés
  c.ellipse(19.5, 32, 2, 3.4, 's');
  c.ellipse(44.5, 32, 2, 3.4, 'S');
  c.set(19, 32, 'S');
  c.set(19, 33, 'S');
  c.set(45, 32, 'D');
  c.set(45, 33, 'D');
  face(c, h);

  // le front dégagé : la ligne des cheveux haute ; les mèches montent du front et filent vers l'arrière
  c.polygon(tps(f, [[13, 28], [13, 13], [18, 6], [26, 3], [38, 3], [46, 6], [51, 13], [51, 28], [48.5, 19], [45, 14], [38, 11.5],
    [26, 11.5], [19, 14], [15.5, 19]]), 'h');
  capLock(c, f, [[27, 12], [24, 8], [19, 7.5], [15, 12.5], [14, 21]], 5, 4, LIT, { tip: 0, hi: [0.0, 0.5] });
  capLock(c, f, [[31, 11.5], [29.5, 6.5], [24, 4], [17.5, 6.5]], 5, 4, LIT, { tip: 0, hi: [0.0, 0.6] });
  capLock(c, f, [[35, 11.5], [36, 6.5], [42, 4.5], [47.5, 8.5], [50, 16]], 5, 4, MID, { tip: 0, hi: [0.0, 0.35] });
  capLock(c, f, [[39, 12], [43, 9], [47.5, 11.5], [50, 21]], 4, 4, MID, { tip: 0, hi: [0.0, 0.3] });
  capLock(c, f, [[33, 11.5], [33, 5.5], [37, 3.3]], 4, 3, MID, { tip: 0, hi: [0.0, 0.6] });
  capLock(c, f, [[15, 17], [13, 22], [14, 27], [12.5, 31]], 5, 4, LIT, { tip: 0.3, hi: [0.05, 0.35] });
  capLock(c, f, [[49, 17], [51, 22], [50, 27], [51.5, 31]], 5, 4, SHADE, { tip: 0.3, hi: [0.05, 0.25] });
  // les deux mèches qui retombent devant les oreilles, jusqu'à la mâchoire
  const ear: P[] = [[21, 17], [19, 23], [20, 29], [18.5, 35], [19.5, 39]];
  lock(c, ear, 3.5, 3, LIT, { tip: 0.35, hi: [0.05, 0.4] });
  lock(c, mx(ear), 3.5, 3, SHADE, { tip: 0.35, hi: [0.05, 0.3] });

  finishFace(c, h, stub);
  return c;
}

/** Le portrait 64 px du forgeron, de face : variante A, B ou C, rasé (moustache) ou barbe de quelques jours. */
export function portrait(variant: Variant, stubble: boolean): { grid: Grid; pal: Record<string, string> } {
  const c = variant === 'A' ? drawA(stubble) : variant === 'B' ? drawB(stubble) : drawC(stubble);
  c.outline('o');
  return { grid: selOut(c.toGrid(), DARK), pal: palette };
}
