// Proposition : trois têtes pour le portrait 64 px du forgeron (chantier « forgeron », essai 4, hors jeu : rien ici n'est déclaré
// dans art/index.ts). Planche : npx tsx tools/essai-forgeron-tete-portrait.ts écrit .art-preview/forgeron-tetes-portrait.png.
//
// Retour de Grégoire sur l'essai 3 (art/proposals/forgeron-portraits.ts, gardé pour comparer) : on garde la variante C, « le
// géant », pour ses cheveux (rejetés en arrière, qui ondulent, deux mèches devant les oreilles) et sa carrure (épaules et
// trapèzes nus qui débordent du cadre, bavette). La tête est à refaire : la bouille était trop ronde. Ici :
// - le visage long, nettement plus haut que large ; la tête reste grosse, en longueur et en carrure, pas en rondeur ;
// - des traits carrés : la mâchoire marquée, ses angles nets sous les oreilles (le flanc droit, puis une cassure), le menton
//   carré, les pommettes hautes, les joues plates (ou un creux doux sous la pommette, jamais un trait) ;
// - les sourcils droits, le nez droit et fort, une moustache blonde courte et fine ;
// - calme, bienveillant, le coin des lèvres qui remonte ; jeune, sans ride.
//
// Trois versions, les mêmes que la tête du sprite (art/proposals/forgeron-tetes.ts, dessiné en parallèle) :
// - T1 « le rectangle » : front, pommettes et mâchoire de même largeur, angles de mâchoire à angle droit, menton plat et large ;
// - T2 « l'écu » : la mâchoire la plus large et la plus lourde, le front un peu plus étroit, le menton carré large ;
// - T3 « la lame » : la plus longue et la plus étroite, les pommettes les plus hautes, un creux doux sous elles, le menton
//   carré mais plus étroit.
//
// Construction reprise de l'essai 3 : la fonction `lock` des mèches (copiée : le fichier de l'essai 3 ne l'exporte pas), le
// buste (épaules, trapèzes, bavette de cuir), la palette (importée). Couleurs : celles de l'essai 3, plus une teinte :
// `v`, le creux doux sous la pommette (entre la peau `s` et son ombre `S`), pour que la joue se creuse sans trait.

import { Canvas, flipX, selOut, type Grid } from '../lib/canvas';
import { palette as essai3 } from './forgeron-portraits';

export type HeadVersion = 'T1' | 'T2' | 'T3';

export const palette: Record<string, string> = {
  ...essai3,
  // le creux doux sous la pommette : entre la peau (ramps.skin.base) et son ombre (ramps.skin.shade)
  v: '#c38a60',
};

/** Contour côté lumière : teinte la plus sombre de chaque matière. */
const DARK: Record<string, string> = {
  Y: 'e', G: 'e', H: 'e', h: 'e', d: 'e', e: 'e',
  l: 'D', c: 'D', s: 'D', S: 'D', D: 'D', v: 'D', m: 'D', M: 'D',
  A: 'K', a: 'K', k: 'K', K: 'K',
};

type P = [number, number];

// ---------- Les mèches (reprises de l'essai 3) ----------

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

interface Tier { hi: string; base: string; shade: string; gap: string }
const LIT: Tier = { hi: 'Y', base: 'H', shade: 'h', gap: 'd' };
const MID: Tier = { hi: 'G', base: 'H', shade: 'h', gap: 'd' };
const SHADE: Tier = { hi: 'H', base: 'h', shade: 'd', gap: 'e' };

interface LockOpts { hi?: [number, number]; tip?: number; noGap?: boolean }

/** Une mèche : une bande effilée le long de la courbe, son ombre en bas à droite, un reflet au jour (essai 3). */
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

const mx = (pts: P[]): P[] => pts.map(([x, y]) => [64 - x, y]);

// ---------- La tête : ses mesures ----------

interface Head {
  /** Demi-largeur du front (aux tempes). */
  brow: number;
  /** Demi-largeur aux pommettes, et leur rangée. */
  cheek: number;
  cheekY: number;
  /** Demi-largeur à l'angle de la mâchoire, et sa rangée (sous l'oreille). */
  jaw: number;
  jawY: number;
  /** Demi-largeur du menton, et sa rangée du bas. */
  chin: number;
  chinY: number;
  /** Ligne des cheveux au milieu du front ; sommet du crâne. */
  hairline: number;
  crown: number;
  /** Rangée du haut de l'œil ; demi-écart entre les yeux. */
  eyeY: number;
  eyeGap: number;
  /** Demi-largeur du cou ; rangée où il rejoint la pente des trapèzes. */
  neck: number;
  trap: number;
  /** Le creux doux sous la pommette : 0 (joue plate) à 2. */
  hollow: number;
  /** Le menton retouché de T1 (essai 5) ; absent, le menton plat de l'essai 4. */
  tip?: ChinTip;
}

// ---------- Le menton de T1 (essai 5) ----------
// Grégoire choisit T1 « le rectangle » et ne demande qu'une correction, le menton : plus saillant (un plan de lumière franc
// sur la bosse, une ombre portée nette dessous sur le cou), un peu plus pointu vers le bas (sans devenir un V), une fossette
// au milieu qui le sépare en deux bosses (un trait d'ombre vertical entre deux reflets). Le visage, la mâchoire jusqu'à ses
// angles (y=43) et le coin où elle rejoint le menton (x=24, y=46), les traits, les cheveux et le buste ne bougent pas : le
// menton est ajouté sous la ligne de la mâchoire.
// - M0 : T1 telle quelle (essai 4) ;
// - M1 « la bosse » : le bas descend d'une rangée (y=47), 11 px de large ; fossette courte ;
// - M2 « le menton en avant » : deux rangées (y=48), 10 px ; la fossette sur trois rangées, l'ombre portée sur deux ;
// - M3 « le menton fort » : trois rangées (y=49), 9 px, une échancrure au bas de la fossette (les deux bosses se lisent dans
//   la silhouette) ; l'ombre la plus dure.
export type ChinVersion = 'M0' | 'M1' | 'M2' | 'M3';

interface ChinTip {
  /** Demi-largeur du bas du menton, et la rangée sous lui (le polygone s'arrête au-dessus). */
  half: number;
  bottom: number;
  /**
   * Le modelé du menton, 11 px centrés (x=27 à 37), ses rangées au-dessus du dessous du menton (la dernière juste au-dessus) :
   * l, c, la bosse gauche au jour et son reflet ; s, S, la droite en demi-teinte, son reflet c ; au milieu, la fossette (S, D) ;
   * v, le creux doux qui détache la bosse (ses flancs ; pour M3, le pli sous la lèvre).
   */
  model: Grid;
  /** Rangées d'ombre profonde portée sous le menton, sur le cou. */
  shadow: number;
  /** Une échancrure au bas, au milieu : la fossette entame le dessous du menton (un pixel d'ombre profonde). */
  notch: boolean;
}

const TIPS: Record<Exclude<ChinVersion, 'M0'>, ChinTip> = {
  M1: {
    half: 5.5, bottom: 47, shadow: 1, notch: false,
    model: [
      '..cccssss..',
      '.cllcSccss.',
      '.ccccSsssS.',
    ],
  },
  M2: {
    half: 5, bottom: 48, shadow: 2, notch: false,
    model: [
      '..cccsssss.',
      'vcllcScccsv',
      'vclccSsccSv',
      '.sccsDssSS.',
    ],
  },
  M3: {
    half: 4.5, bottom: 49, shadow: 2, notch: true,
    model: [
      '..vvvvvvv..',
      '.ccccssssS.',
      'vlllcScccSv',
      'vclccDsccSv',
      '.sccsDssSS.',
    ],
  },
};

const headOf = (v: HeadVersion, chin: ChinVersion): Head => {
  if (chin === 'M0') return HEADS[v];
  if (v !== 'T1') throw new Error(`forgeron-tetes-portraits : le menton ${chin} n'existe que pour T1`);
  return { ...HEADS[v], tip: TIPS[chin] };
};

/** Le bas du visage : le menton retouché, ou celui de l'essai 4. */
const bottomOf = (h: Head): number => h.tip?.bottom ?? h.chinY;

const HEADS: Record<HeadVersion, Head> = {
  T1: { brow: 11, cheek: 11, cheekY: 27, jaw: 11, jawY: 43, chin: 7.5, chinY: 46, hairline: 12, crown: 3, eyeY: 24, eyeGap: 2.5,
    neck: 8.5, trap: 45, hollow: 0 },
  T2: { brow: 9.5, cheek: 11, cheekY: 27, jaw: 12.5, jawY: 43, chin: 9.5, chinY: 46, hairline: 12, crown: 3, eyeY: 24, eyeGap: 2.5,
    neck: 9.5, trap: 45, hollow: 0 },
  T3: { brow: 9.5, cheek: 10, cheekY: 25, jaw: 9, jawY: 44, chin: 6, chinY: 47, hairline: 11, crown: 2, eyeY: 24, eyeGap: 2.5,
    neck: 8, trap: 46, hollow: 1 },
};

/** Le contour du visage : le flanc presque droit jusqu'à l'angle de la mâchoire, une cassure nette, puis le menton carré. */
function facePoly(h: Head): P[] {
  const left: P[] = [
    [32 - h.brow, h.hairline - 4],
    [32 - h.brow, h.hairline + 6],
    [32 - h.cheek, h.cheekY],
    [32 - h.cheek + (h.cheek - h.jaw) * 0.8, h.jawY - 4],
    [32 - h.jaw, h.jawY],
    // la cassure : la ligne de la mâchoire, courte et franche, jusqu'au coin du menton
    [32 - h.chin - 0.5, h.chinY - 0.3],
    [32 - h.chin, h.chinY],
  ];
  if (h.tip) {
    // le menton retouché : du coin de la mâchoire, il descend sous elle en se resserrant, son bas plat
    const k = h.tip;
    left.splice(-1, 1, [32 - k.half - 0.5, k.bottom - 0.4], [32 - k.half, k.bottom]);
  }
  return [...left, ...left.map(([x, y]) => [64 - x, y] as P).reverse()];
}

// ---------- Le buste (repris de l'essai 3, le cou à la largeur de la mâchoire) ----------

function bust(c: Canvas, h: Head): void {
  const nl = 32 - h.neck, nr = 32 + h.neck;
  const t = h.trap;
  c.polygon([[0, 64], [0, t + 7], [4, t + 5], [11, t + 3], [18, t + 1], [nl, t - 1.5], [nr, t - 1.5], [46, t + 1], [53, t + 3],
    [60, t + 5], [64, t + 7], [64, 64]], 's');
  c.within('s', (c) => {
    c.polygon([[nr - 1, t - 1], [46, t + 1], [53, t + 3], [60, t + 5], [64, t + 7], [64, 64], [44, 64], [43, t + 7]], 'S');
    c.polygon([[0, t + 7.4], [4, t + 5.4], [11, t + 3.4], [18, t + 1.4], [nl, t - 1.1], [nl, t + 0.5], [18, t + 2.7], [11, t + 4.6],
      [4, t + 7], [0, t + 9]], 'l');
    c.ellipse(0, t + 15, 6, 7, 'c');
    c.ellipse(-1, t + 14, 4, 4.5, 'l');
    c.line(6, t + 11, 7, t + 14, 'S');
    c.line(7, t + 15, 7, 64, 'S');
    c.ellipse(16, t + 12, 6, 4, 'c');
    c.line(9, t + 17, 21, t + 16, 'S');
  });
  c.within('S', (c) => {
    c.polygon([[56, t + 6], [64, t + 8], [64, t + 11], [58, t + 9]], 's');
    c.line(57, t + 12, 57, 64, 'D');
    c.line(43, t + 16, 55, t + 17, 'D');
  });

  // la bavette de cuir et sa lanière
  const by = t + 11;
  c.polygon([[23, by], [41, by], [42, 64], [22, 64]], 'a');
  c.within('a', (c) => {
    c.polygon([[36, by], [41, by], [42, 64], [37, 64]], 'k');
    c.line(23, by, 40, by, 'A');
    c.line(23, by + 1, 23, 64, 'A');
    for (let x = 25; x < 40; x += 2) c.set(x, by + 2, 'k');
  });
  c.line(24, by, nl + 1, t + 2, 'A');
  c.line(25, by, nl + 2, t + 2, 'a');
  c.line(40, by, nr - 1, t + 2, 'K');
  c.line(39, by, nr - 2, t + 2, 'k');

  // le cou de taureau
  c.rect(nl, h.jawY - 4, nr - nl, t - h.jawY + 7, 's');
  c.within('s', (c) => {
    c.rect(nl + 1, h.jawY - 4, 3, t - h.jawY + 7, 'c');
    c.rect(nr - 4, h.jawY - 4, 4, t - h.jawY + 7, 'S');
    c.set(32, t + 2, 'S');
    c.set(31, t + 3, 'S');
    c.set(32, t + 3, 'S');
  });
  c.line(nl + 1, t + 2, nl + 1, t, 'A');
  c.line(nr - 1, t + 2, nr - 1, t, 'K');
}

// ---------- Le visage ----------

function face(c: Canvas, h: Head): void {
  const poly = facePoly(h);
  c.polygon(poly, 's');
  const mask = new Canvas(64, 64).polygon(poly, '#');
  const ex = (y: number) => {
    // bord droit du masque à la rangée y
    let x = 63;
    while (x > 32 && mask.get(x, y) !== '#') x--;
    return x;
  };
  const exL = (y: number) => {
    let x = 0;
    while (x < 32 && mask.get(x, y) !== '#') x++;
    return x;
  };
  c.within('s', (c) => {
    // le flanc droit à l'ombre, une bande qui suit le contour : 3 px sur la tempe et la joue, qui tourne avec la mâchoire
    for (let y = h.hairline - 4; y <= bottomOf(h); y++) {
      const r = ex(y);
      const w = y < h.jawY ? 3 : y < bottomOf(h) - 2 ? 3 : 2;
      for (let x = r - w + 1; x <= r; x++) c.set(x, y, 'S');
    }
    // le dessous de la mâchoire et du menton, tourné vers le bas
    for (let x = 0; x < 64; x++) {
      let y = 63;
      while (y > 0 && mask.get(x, y) !== '#') y--;
      if (y < h.jawY) continue;
      c.set(x, y, 'S');
    }
    // le front au jour
    c.ellipse(29, h.hairline + 3.5, 6.5, 3, 'c');
    c.ellipse(27.5, h.hairline + 3, 3.5, 1.6, 'l');
    // le plan de la joue gauche, au jour sous la pommette haute
    const L = exL(h.cheekY);
    c.line(L + 1, h.cheekY - 1, L + 5, h.cheekY - 2, 'l');
    c.line(L + 1, h.cheekY, L + 4, h.cheekY - 1, 'l');
    c.rect(L + 1, h.cheekY + 1, 3, 5, 'c');
    c.rect(L + 1, h.cheekY + 6, 2, 3, 'c');
    // l'angle gauche de la mâchoire qui attrape la lumière, la ligne de la mâchoire au jour jusqu'au menton
    const jl = exL(h.jawY);
    c.line(jl + 1, h.jawY - 2, jl + 1, h.jawY, 'c');
    c.line(jl + 2, h.jawY + 1, 32 - h.chin, h.chinY - 1, 'c');
    // le menton : son plan au jour, carré
    if (!h.tip) {
      c.rect(28, h.chinY - 5, 4, 2, 'c');
      c.line(29, h.chinY - 5, 30, h.chinY - 5, 'l');
    }
  });
  if (h.tip) chinTip(c, h.tip);
  // le creux doux sous la pommette : une grappe de `v`, sans bord net
  if (h.hollow > 0) {
    c.within('sc', (c) => {
      const L = exL(h.cheekY + 3);
      c.polygon([[L + 3, h.cheekY + 2], [L + 6, h.cheekY + 2.5], [L + 5.5, h.cheekY + 6], [L + 3.5, h.cheekY + 6.5]], 'v');
      const R = ex(h.cheekY + 3);
      c.polygon([[R - 6, h.cheekY + 2.5], [R - 3, h.cheekY + 2], [R - 3, h.cheekY + 6.5], [R - 5.5, h.cheekY + 6]], 'v');
    });
  }
  // la pommette droite : une crête de peau dans l'ombre
  c.within('S', (c) => {
    const R = ex(h.cheekY - 1);
    c.line(R - 3, h.cheekY - 1, R - 1, h.cheekY - 1, 's');
    c.line(R - 2, h.cheekY, R - 2, h.cheekY, 's');
  });
  // le bord de la mâchoire droite, en ombre profonde du coin au menton : l'angle se lit
  c.within('S', (c) => {
    const jr = ex(h.jawY);
    c.line(jr, h.jawY - 2, jr, h.jawY, 'D');
    c.line(jr - 1, h.jawY + 1, 32 + h.chin, h.chinY - 1, 'D');
  });
  // l'ombre de la mâchoire sur le cou
  for (let x = Math.floor(32 - h.neck); x < Math.ceil(32 + h.neck); x++) {
    let y = 63;
    while (y > 0 && mask.get(x, y) !== '#') y--;
    if (y <= h.jawY - 3) continue;
    if ('sScl'.includes(c.get(x, y + 1))) c.set(x, y + 1, 'D');
    if ('sScl'.includes(c.get(x, y + 2))) c.set(x, y + 2, 'S');
  }
}

/** Le menton retouché : deux bosses au jour séparées par la fossette, l'ombre portée nette sur le cou. */
function chinTip(c: Canvas, k: ChinTip): void {
  const last = k.bottom - 1; // la dernière rangée du menton, son dessous à l'ombre
  c.within('slcS', (c) => c.stamp(k.model, 27, last - k.model.length));
  // l'échancrure : la fossette entame le bas du menton, l'ombre du cou s'y voit
  if (k.notch) c.set(32, last, 'D');
  // l'ombre portée nette sous le menton, sur le cou : la forme du menton
  for (let x = Math.ceil(32 - k.half); x <= Math.floor(32 + k.half); x++) {
    for (let i = 1; i <= k.shadow; i++) if ('sScl'.includes(c.get(x, last + i))) c.set(x, last + i, 'D');
    if ('sScl'.includes(c.get(x, last + k.shadow + 1))) c.set(x, last + k.shadow + 1, 'S');
  }
}

// ---------- Les détails : yeux, sourcils droits, nez droit, moustache courte, bouche ----------

const EYE: Grid = [
  '.oooo.',
  'oiqpiW',
  'WiIIiW',
  '..ii..',
];
/** Le sourcil droit, épais et horizontal, sa queue à peine plus mince. */
const BROW: Grid = [
  'hhhhhd',
  'ddddd.',
];

function features(c: Canvas, h: Head): void {
  const y = h.eyeY;
  const xl = Math.round(32 - h.eyeGap - 6), xr = 64 - xl - 6;
  // le pli de la paupière : le regard posé, calme
  c.within('slcSD', (c) => {
    c.line(xl + 1, y - 1, xl + 4, y - 1, 'l');
    c.line(xr + 1, y - 2, xr + 4, y - 2, 'S');
  });
  c.stamp(EYE, xl, y);
  c.stamp(flipX(EYE), xr, y);
  c.stamp(BROW, xl, y - 4);
  c.stamp(flipX(BROW), xr, y - 4);

  // le nez droit et fort : une arête longue au jour, son flanc à l'ombre, le bout large, les narines
  c.line(31, y, 31, y + 5, 'c');
  c.line(30, y + 2, 30, y + 5, 'l');
  c.line(33, y + 1, 33, y + 6, 'S');
  c.line(34, y + 3, 34, y + 6, 'S');
  c.line(29, y + 6, 35, y + 6, 's');
  c.set(30, y + 6, 'l');
  c.set(31, y + 6, 'l');
  c.line(33, y + 6, 35, y + 6, 'S');
  c.line(29, y + 7, 35, y + 7, 'S');
  c.set(28, y + 6, 'S');
  c.set(36, y + 6, 'D');
  c.set(29, y + 7, 'D');
  c.set(35, y + 7, 'D');

  // la moustache blonde, courte et fine : deux rangées, de la largeur de la bouche
  const m = y + 9;
  c.line(29, m, 35, m, 'h');
  c.line(28, m + 1, 36, m + 1, 'h');
  c.line(29, m, 30, m, 'H');
  c.set(28, m + 1, 'H');
  c.line(33, m + 1, 36, m + 1, 'd');
  c.set(32, m, 'd');
  c.set(32, m + 1, 'd');
  // la bouche : le coin des lèvres remonte de part et d'autre de la moustache, la lèvre du bas au jour, son ombre dessous
  c.line(28, m + 2, 36, m + 2, 'M');
  c.set(27, m + 1, 'M');
  c.set(37, m + 1, 'M');
  c.set(27, m + 2, 's');
  c.set(37, m + 2, 'S');
  c.line(29, m + 3, 35, m + 3, 'm');
  c.line(29, m + 3, 30, m + 3, 'c');
  c.line(30, m + 4, 34, m + 4, 'S');
}

// ---------- Les cheveux de C, rejetés en arrière, adaptés à la tête longue ----------

function hairBack(c: Canvas, h: Head): void {
  // la masse derrière la tête, du crâne à la mâchoire
  const w = h.brow + 3;
  c.polygon([[32 - w + 1, h.hairline], [32 + w - 1, h.hairline], [32 + w, h.eyeY + 4], [32 + w - 1, h.jawY - 1],
    [32 - w + 1, h.jawY - 1], [32 - w, h.eyeY + 4]], 'e');
}

/** La vague qui tombe derrière la nuque, de chaque côté du cou, jusqu'au trapèze. */
function hairWave(c: Canvas, h: Head): void {
  const x = 32 - Math.max(h.brow, h.jaw) - 3.5;
  const wave: P[] = [[x + 1.5, h.eyeY + 3], [x - 0.5, h.eyeY + 8], [x, h.jawY - 3], [x - 2.5, h.trap], [x - 4, h.trap + 3]];
  lock(c, wave, 4.5, 3.5, LIT, { tip: 0.35, hi: [0.05, 0.35] });
  lock(c, mx(wave), 4.5, 3.5, SHADE, { tip: 0.35, hi: [0.05, 0.25] });
}

function ears(c: Canvas, h: Head): void {
  const ey = h.eyeY + 6;
  const xl = 32 - h.brow - 2, xr = 32 + h.brow + 2;
  // l'oreille, plus haute que large, collée à la tête
  c.ellipse(xl, ey, 1.8, 3.6, 's');
  c.ellipse(xr, ey, 1.8, 3.6, 'S');
  c.set(Math.floor(xl), ey, 'S');
  c.set(Math.floor(xl), ey + 1, 'S');
  c.set(Math.floor(xr), ey, 'D');
  c.set(Math.floor(xr), ey + 1, 'D');
}

function hairTop(c: Canvas, h: Head): void {
  const b = h.brow, hl = h.hairline, cr = h.crown;
  // la masse du crâne : au-dessus du front haut, la ligne des cheveux droite qui rentre un peu aux tempes
  c.polygon([[32 - b - 3, h.eyeY + 3], [32 - b - 3.5, hl + 1], [32 - b - 1, cr + 4], [32 - 6, cr + 0.5], [32 + 6, cr + 0.5],
    [32 + b + 1, cr + 4], [32 + b + 3.5, hl + 1], [32 + b + 3, h.eyeY + 3], [32 + b, hl + 6], [32 + b - 1.5, hl + 1.5],
    [32 + 4, hl], [32 - 4, hl], [32 - b + 1.5, hl + 1.5], [32 - b, hl + 6]], 'h');
  // les mèches qui montent du front et filent vers l'arrière, puis retombent sur les côtés
  const s = (b + 3) / 15.5; // l'essai 3 avait la tête de 12,5 de demi-largeur : on la resserre
  const X = (x: number) => 32 + (x - 32) * s;
  const Yp = (y: number) => cr + (y - 3) * ((hl - cr) / 8.5);
  const T = (pts: P[]): P[] => pts.map(([x, y]) => [X(x), Yp(y)]);
  lock(c, T([[27, 11.5], [24, 7.5], [19, 7], [15, 12.5], [14, 21]]), 4.5, 3.6, LIT, { tip: 0, hi: [0.0, 0.5] });
  lock(c, T([[31, 11.5], [29.5, 6], [24, 3.5], [17.5, 6.5]]), 4.5, 3.6, LIT, { tip: 0, hi: [0.0, 0.6] });
  lock(c, T([[35, 11.5], [36, 6], [42, 4], [47.5, 8.5], [50, 16]]), 4.5, 3.6, MID, { tip: 0, hi: [0.0, 0.35] });
  lock(c, T([[39, 11.5], [43, 8.5], [47.5, 11.5], [50, 21]]), 3.6, 3.6, MID, { tip: 0, hi: [0.0, 0.3] });
  lock(c, T([[33, 11.5], [33, 5], [37, 3]]), 3.6, 2.7, MID, { tip: 0, hi: [0.0, 0.6] });
  // les côtés au-dessus des oreilles, qui ondulent vers l'arrière
  const side: P[] = [[32 - b - 1.5, hl + 2], [32 - b - 3, hl + 6], [32 - b - 2, hl + 10], [32 - b - 3.5, h.eyeY + 5]];
  lock(c, side, 4.5, 3.6, LIT, { tip: 0.3, hi: [0.05, 0.35] });
  lock(c, mx(side), 4.5, 3.6, SHADE, { tip: 0.3, hi: [0.05, 0.25] });
}

/** Les deux mèches qui retombent devant les oreilles : le lobe se voit dessous et derrière. */
function earLocks(c: Canvas, h: Head): void {
  const b = h.brow, hl = h.hairline;
  const ear: P[] = [[32 - b + 1.5, hl + 3], [32 - b + 0.5, hl + 8], [32 - b + 1, h.eyeY + 3], [32 - b + 0.3, h.eyeY + 7],
    [32 - b + 0.8, h.eyeY + 10]];
  lock(c, ear, 2.8, 2.4, LIT, { tip: 0.35, hi: [0.05, 0.4] });
  lock(c, mx(ear), 2.8, 2.4, SHADE, { tip: 0.35, hi: [0.05, 0.3] });
}

function draw(v: HeadVersion, chin: ChinVersion = 'M0'): Canvas {
  const h = headOf(v, chin);
  const c = new Canvas(64, 64);
  hairBack(c, h);
  bust(c, h);
  hairWave(c, h);
  face(c, h);
  hairTop(c, h);
  ears(c, h);
  earLocks(c, h);
  features(c, h);
  return c;
}

/** Le portrait 64 px du forgeron, de face, rasé avec la moustache : tête T1, T2 ou T3, les cheveux de C. */
export function portrait(version: HeadVersion, chin: ChinVersion = 'M0'): { grid: Grid; pal: Record<string, string> } {
  const c = draw(version, chin);
  c.outline('o');
  return { grid: selOut(c.toGrid(), DARK), pal: palette };
}

/**
 * La taille du visage, en px : la largeur de la peau du visage à sa rangée la plus large (oreilles et cheveux exclus), la
 * hauteur de la ligne des cheveux au bas du menton (au milieu du front).
 */
export function faceSize(version: HeadVersion, chin: ChinVersion = 'M0'): { w: number; h: number } {
  const h = headOf(version, chin);
  const mask = new Canvas(64, 64).polygon(facePoly(h), '#').toGrid();
  let w = 0;
  for (const row of mask) w = Math.max(w, row.split('').filter((ch) => ch === '#').length);
  const g = portrait(version, chin).grid;
  let top = 0;
  while (top < 64 && !'slcSDv'.includes(g[top][32])) top++;
  return { w, h: Math.ceil(bottomOf(h)) - top };
}
