// PROPOSITION (hors jeu) : les pièces nouvelles des maisons de bois du village (CADRAGE-village.md, section 3.2 : h1, h3, h4, h5, h6,
// h7, h11). Chacune est un petit modèle en volumes (art/lib/volumes.ts), rendu dans ses vues comme le jeu les tire (r0 à r3, un quart
// de tour de plus dans le sens des aiguilles d'une montre : la vue suivante est le même modèle tourné, jamais une rotation de
// pixels), à 5 cm par pixel : les pièces de bâtiment (`ground` : murs, pignons, portes, pans) en (x, y − z), les meubles et objets en
// (x, y/2 − z) avec leur ombre portée. Le bois travaillé est dessiné patiné (`^ * % & @`, la palette `PIECE_PAL`) : `agedGrid` le
// passe au vieux (les vieux, h3). Les maisons posent ces mêmes images (meubles) ou ces mêmes matières (murs, toits).

import type { Grid } from '../lib/canvas';
import type { HouseId, VillagePiece } from './village-types';
import {
  PIECE_PAL, bark, boardsTex, box, crossTex, cylinder, face, flakingTex, gableFill, gableRoof, hash, hipRoof, ironTex,
  leafInsideTex, leafTex, leanTo, part, pieceView, planksRoof, prism, roofGeom, THICK, timber, type HouseSpec,
} from './village-maisons-bois-lib';
import { wattle, type Quad, type Tex, type V3 } from '../lib/volumes';

// =====================================================================================================================
// Outils
// =====================================================================================================================

const WP = (name: string, prio = 5) => part(name, prio, 'K', 'full');
const thin = (name: string, prio = 5, dark = 'K') => part(name, prio, dark, 'thin');
/** Une barre de bois (perche, montant penché) de a à b, section w. */
function bar(a: V3, b: V3, w: number, p = WP('barre'), tex: Tex = timber(7)): Quad[] {
  const ax: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e1: V3 = Math.abs(ax[0]) > Math.abs(ax[1]) ? [0, 1, 0] : [1, 0, 0];
  const l = Math.hypot(...ax);
  // e2 : perpendiculaire à l'axe et à e1
  const c: V3 = [ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0]];
  const cl = Math.hypot(...c) || 1, e2: V3 = [c[0] / cl, c[1] / cl, c[2] / cl];
  return prism(a, b, e1, e2[2] < 0 ? [-e2[0], -e2[1], -e2[2]] : e2, w, w, p, l ? tex : tex);
}
/** La paille d'une botte, dans le sens des brins ; le lien plus sombre. */
const strawSide = (seed: number, len: number): Tex => (s, t) => {
  const i = Math.floor(s);
  if (Math.abs(s - len / 3) < 0.8 || Math.abs(s - (2 * len) / 3) < 0.8) return 'P';
  return hash(seed, i >> 1, Math.floor(t * 2)) < 0.3 ? 'Y' : hash(seed, i, Math.floor(t * 3)) < 0.5 ? 't' : 'T';
};
const strawCap: Tex = (s, t) => (hash(77, Math.floor(s), Math.floor(t)) < 0.3 ? 'P' : 'T');

/** Une image en tas (le fumier) : un relief au sol rendu colonne par colonne, éclairé du nord-ouest, son contour, son ombre. */
function mound(W: number, D: number, H: number, seed: number, ramp: string[], bits: string[]): Grid {
  const hf = (x: number, y: number) => {
    const r = ((x - W / 2) / (W / 2)) ** 2 + ((y - D * 0.38) / (y < D * 0.38 ? D * 0.38 : D * 0.62)) ** 2;
    if (r >= 1) return 0;
    const n = 1 + (hash(seed, x >> 2, y >> 2) - 0.5) * 0.35 + (hash(seed + 1, x, y) - 0.5) * 0.12;
    return H * Math.pow(1 - r, 0.55) * n;
  };
  const top = Math.ceil(H) + 2, rows = top + Math.ceil(D / 2) + 2, cols = W + 2;
  const g = Array.from({ length: rows }, () => Array<string>(cols).fill('.'));
  const own = Array.from({ length: rows }, () => Array<number>(cols).fill(-1));
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
    const h = hf(x + 0.5, y + 0.5);
    if (h <= 0.2) continue;
    const lit = (hf(x + 1.5, y + 0.5) - hf(x - 0.5, y + 0.5)) * 0.6 + (hf(x + 0.5, y + 1.5) - hf(x + 0.5, y - 0.5)) * 0.8;
    const sy = top + Math.floor(y / 2);
    for (let z = 0; z <= Math.round(h); z++) {
      const Y = sy - z, X = x + 1;
      if (Y < 0) continue;
      const face = z < Math.round(h) ? 1 : 0; // le flanc sud sous le dessus
      let r = face ? 2 : lit > 0.6 ? 0 : lit > -0.4 ? 1 : 2;
      if (face && z < 1) r = 3;
      let k = ramp[r];
      if (hash(seed, X, Y, 3) < 0.13) k = bits[Math.floor(hash(seed, X, Y, 4) * bits.length)];
      g[Y][X] = k; own[Y][X] = y;
    }
  }
  // le contour : sombre en haut et à gauche, OUTLINE en bas et à droite
  const out = g.map((r) => r.slice());
  for (let Y = 0; Y < rows; Y++) for (let X = 0; X < cols; X++) {
    if (g[Y][X] === '.') continue;
    const e = (dx: number, dy: number) => g[Y + dy]?.[X + dx] === undefined || g[Y + dy][X + dx] === '.';
    if (e(1, 0) || e(0, 1)) out[Y][X] = 'o';
    else if (e(-1, 0) || e(0, -1)) out[Y][X] = ramp[3];
  }
  const rowsS = out.map((r) => r.join(''));
  while (rowsS.length && !/[^.]/.test(rowsS[0])) rowsS.shift();
  while (rowsS.length && !/[^.]/.test(rowsS[rowsS.length - 1])) rowsS.pop();
  const last = rowsS[rowsS.length - 1];
  const shade = ('.' + last.slice(0, -1)).split('').map((c) => (c === '.' ? '.' : 'x')).join('');
  return [...rowsS, shade];
}

// =====================================================================================================================
// Les modèles
// =====================================================================================================================

interface Def {
  key: string; name: string; dims: { w: number; d: number; h: number }; houses: HouseId[];
  /** Le nombre de vues dessinées (1 rond, 2 symétrique, 4) ; la vue v se rend avec k(v). */
  n: 1 | 2 | 4; k: (v: number) => 1 | 0.5;
  model?: (v: number) => Quad[];
  grid?: (v: number) => Grid;
  /** `lying` : couché, la vue nord-sud a les dimensions de l'est-ouest inversées (règle D). */
  lying?: boolean; ground?: boolean;
}
const furn = (): 0.5 => 0.5;
const bld = (): 1 => 1;

// ---------- h1 : le couvreur ----------

const cradle = (): Quad[] => {
  const W = timber(301), Q: Quad[] = [];
  const P = WP('berceau');
  Q.push(...box(1, 17, 1, 9, 3, 4, P, W));
  Q.push(...box(1, 17, 1, 2, 3, 9, P, W), ...box(1, 17, 8, 9, 3, 8, P, W));
  Q.push(...box(1, 2, 2, 8, 3, 9, P, W), ...box(15.5, 17, 1, 9, 3, 11, P, W));
  // le linge, l'oreiller au bout de la tête (est)
  Q.push(...box(2, 15.5, 2, 8, 4, 8.5, part('linge', 4, 'D', 'full'), (s, t, c) => (c.face === 'top' ? (s > c.w - 4 ? 'a' : hash(5, Math.floor(s / 2), Math.floor(t)) < 0.2 ? 'D' : 'd') : 'D')));
  // les patins, courbes : on ne garde que le milieu bas
  const rocker: Tex = (s, t, c) => (c.face === 'top' ? '*' : t < 1 && (s < 2 || s > c.w - 2) ? null : timber(305)(s, t, c));
  Q.push(...box(2, 3.2, -0.5, 10.5, 0, 3, WP('patin', 4), rocker), ...box(14.8, 16, -0.5, 10.5, 0, 3, WP('patin', 4), rocker));
  return Q;
};

const bundleStack = (): Quad[] => {
  const Q: Quad[] = [];
  const P = part('botte', 5, 'P', 'full');
  const r = 2.7, L = 12;
  const rows = [6, 6, 6];
  rows.forEach((n, row) => {
    const span = n * 2 * r, x0 = (32 - span) / 2 + (row % 2 ? 0.4 : -0.4);
    for (let k = 0; k < n; k++) {
      const x = x0 + r + k * 2 * r, z = r + row * r * 1.7;
      Q.push(...cylinder([x, L - 0.2 * ((k + row) % 2), z], [x, 0, z], r, P, strawSide(row * 10 + k, L), strawCap, 8));
    }
  });
  return Q;
};

const ladder = (): Quad[] => {
  const Q: Quad[] = [], P = WP('échelle'), W = timber(311);
  Q.push(...box(0, 80, 0, 1.6, 0, 2, P, W), ...box(0, 80, 6.4, 8, 0, 2, P, W));
  for (let x = 3; x < 79; x += 6) Q.push(...box(x, x + 1.2, 1.6, 6.4, 0.5, 1.6, WP('barreau', 4), timber(312 + x)));
  return Q;
};

// ---------- h3 : les vieux ----------

const spinningWheel = (): Quad[] => {
  const Q: Quad[] = [], P = WP('rouet'), W = timber(321);
  Q.push(...box(0, 18, 2, 6, 6, 8, P, W));
  Q.push(...bar([1.6, 0.4, 0], [1.6, 2.8, 6], 1.1, P, W), ...bar([1.6, 7.6, 0], [1.6, 5.2, 6], 1.1, P, W), ...bar([16.1, 4, 0], [16.1, 4, 6], 1.1, P, W));
  // les montants de la roue, la roue (douze segments de jante, six rais), le moyeu
  Q.push(...box(10.5, 11.5, 2.3, 3.3, 8, 11, P, W), ...box(10.5, 11.5, 4.7, 5.7, 8, 11, P, W));
  const cx = 11, cz = 11.5, R = 5.6;
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const x = cx + R * Math.cos(a), z = cz + R * Math.sin(a);
    Q.push(...box(x - 0.8, x + 0.8, 3.5, 4.5, z - 0.8, z + 0.8, thin('jante', 6), timber(322 + k)));
  }
  // la roue vue de face : la jante, six rais, le moyeu (une face au milieu de la jante ; de chant, les segments)
  const wheel: Tex = (s, t) => {
    const dx = s - R - 0.8, dz = t - R - 0.8, r = Math.hypot(dx, dz);
    if (r > R + 0.8) return null;
    if (r > R - 0.7) return dz > 0.5 && dx < 0.5 ? '^' : dz < -0.5 ? '%' : '*';
    if (r < 1.2) return '&';
    const a = ((Math.atan2(dz, dx) / (Math.PI * 2)) * 6 + 6) % 1;
    return a < 0.12 || a > 0.88 ? '*' : null;
  };
  Q.push({ o: [cx - R - 0.8, 4.5, cz - R - 0.8], u: [2 * R + 1.6, 0, 0], v: [0, 0, 2 * R + 1.6], n: [0, 1, 0], part: part('roue', 6.5, 'K', 'thin'), tex: wheel, face: 'S' });
  Q.push({ o: [cx + R + 0.8, 3.5, cz - R - 0.8], u: [-(2 * R + 1.6), 0, 0], v: [0, 0, 2 * R + 1.6], n: [0, -1, 0], part: part('roue', 6.5, 'K', 'thin'), tex: wheel, face: 'N' });
  // l'épinglier et la quenouille, le lin en houppe (le chanvre de la corde)
  Q.push(...box(2.5, 6, 3, 5, 8, 10, P, W));
  Q.push(...bar([3, 4, 8], [4, 4, 16], 0.8, thin('quenouille', 6), timber(345)));
  Q.push(...box(2.6, 5.2, 3, 5, 14, 18, part('lin', 6, 'C', 'full'), (s, t) => (t > 2.5 ? 'J' : hash(9, Math.floor(s), Math.floor(t)) < 0.4 ? 'O' : 'J')));
  return Q;
};

const smallTable = (): Quad[] => {
  const Q: Quad[] = [], P = WP('petite table'), W = timber(351);
  Q.push(...box(0, 16, 0, 12, 13.5, 15, P, W));
  for (const [x, y] of [[1, 1], [13.5, 1], [1, 9.5], [13.5, 9.5]]) Q.push(...box(x, x + 1.5, y, y + 1.5, 0, 13.5, WP('pied', 4), W));
  Q.push(...box(1.5, 14.5, 1.5, 10.5, 11.5, 13.5, WP('ceinture', 3), timber(352)));
  return Q;
};

// ---------- h4 : le berger ----------

const boardWallLow = (): Quad[] => {
  const out = boardsTex(361), inside = boardsTex(362, 5);
  const tex: Tex = (s, t, c) => {
    if (c.face === 'N') { const j = Math.floor(t); return j === 8 || j === 30 ? '^' : j === 7 || j === 29 ? '%' : inside(s, t, c); }
    return out(s, t, c);
  };
  return box(0, 24, 0, 4, 0, 40, part('bardage', 3, 'K', 'full'), tex);
};

const hurdle = (): Quad[] => {
  const Q: Quad[] = [];
  Q.push(...box(0, 32, 0.5, 1.5, 1, 18, part('claie', 3, 'Q', 'full'), wattle(371, 32, [0, 7, 14, 22, 30])));
  for (const x of [0, 15.2, 30.4]) Q.push(...box(x, x + 1.6, 0.2, 1.8, 0, 20, WP('montant', 5), bark(372 + x)));
  return Q;
};

const plessis = (): Quad[] => {
  const Q: Quad[] = [];
  const stakes = [0.5, 6.5, 12.8, 19, 25.2, 30.8];
  const weave: Tex = (s, t) => {
    const j = Math.floor(t), row = Math.floor(j / 2), i = Math.floor(s);
    const n = stakes.findIndex((x) => x > i);
    const front = (row + n) % 2 === 0;
    if (j % 2 === 1) return front ? 'M' : 'm';
    return front ? 'm' : 'N';
  };
  Q.push(...box(0, 32, 0.4, 1.6, 0, 14, part('plessis', 3, 'K', 'full'), weave));
  stakes.forEach((x, k) => Q.push(...box(x, x + 1.4, 0.2, 1.8, 0, 15 + Math.round(hash(381, k) * 3), WP('pieu', 5), bark(382 + k))));
  return Q;
};

const kennel = (): Quad[] => {
  const Q: Quad[] = [], b = boardsTex(391, 5);
  const body: Tex = (s, t, c) => {
    if (c.face === 'S') {
      const dx = s - 8, top = 6 + Math.sqrt(Math.max(0, 9 - dx * dx)) * 0.5;
      if (Math.abs(dx) < 3 && t < top) return t > top - 0.8 ? '&' : 'o';
    }
    return b(s, t, c);
  };
  Q.push(...box(0, 16, 0, 20, 0, 9, part('niche', 3, 'K', 'full'), body));
  const P = part('toit de la niche', 6, '&', 'full', { roof: true });
  Q.push(face([-1, -1, 8.5], [0, 22, 0], [9, 0, 5.5], P, planksRoof(392)), face([17, -1, 8.5], [0, 22, 0], [-9, 0, 5.5], P, planksRoof(393)));
  const gableT = boardsTex(394, 5);
  Q.push({ o: [0, 20, 9], u: [16, 0, 0], v: [0, 0, 5], n: [0, 1, 0], part: part('niche', 3, 'K', 'full'), face: 'S', tex: (s, t, c) => (t > 5 * (1 - Math.abs(s - 8) / 8) ? null : gableT(s, t, c)) });
  return Q;
};

// ---------- h6 : le charpentier ----------

const sawhorse = (): Quad[] => {
  const Q: Quad[] = [], W = timber(401);
  Q.push(...box(0, 20, 4, 6, 14, 16, WP('chevalet'), W));
  for (const x of [3, 17]) {
    Q.push(...bar([x, 0.8, 0], [x, 4.6, 14], 1.6, WP('pied', 4), timber(402 + x)));
    Q.push(...bar([x, 9.2, 0], [x, 5.4, 14], 1.6, WP('pied', 4.5), timber(403 + x)));
  }
  Q.push(...box(3, 17, 4.4, 5.6, 6, 7.2, WP('entretoise', 3), timber(404)));
  return Q;
};

// ---------- h7 : le laboureur ----------

const manger = (): Quad[] => {
  const Q: Quad[] = [], W = timber(411);
  const trough: Tex = (s, t, c) => {
    if (c.face === 'top') { const j = Math.floor(t), i = Math.floor(s); return j === 0 || j >= Math.floor(c.h) - 1 || i === 0 || i >= Math.floor(c.w) - 1 ? '^' : hash(412, i, j) < 0.45 ? 'Y' : hash(413, i >> 1, j) < 0.5 ? 't' : '&'; }
    return W(s, t, c);
  };
  Q.push(...box(0, 48, 5, 12, 6, 11, WP('auge'), trough));
  for (const x of [1, 23, 45]) Q.push(...box(x, x + 2, 9, 11, 0, 6, WP('pied', 4), W));
  Q.push(...box(0, 2, 0, 2, 0, 24, WP('montant', 5), W), ...box(46, 48, 0, 2, 0, 24, WP('montant', 5), W));
  Q.push(...box(0, 48, 0, 2, 22, 24, WP('lisse', 6), timber(414)), ...box(0, 48, 4.5, 6, 11, 12.5, WP('lisse', 6), timber(415)));
  for (let x = 3; x < 46; x += 3) Q.push(...bar([x, 5.2, 12], [x, 1, 22], 0.9, thin('barreau', 5.5), timber(416 + x)));
  // le foin dans le râtelier, contre le mur
  Q.push(face([2, 1.2, 13], [44, 0, 0], [0, 2.6, 7], part('foin', 4.8, 'T', 'none'), (s, t) => (hash(417, Math.floor(s), Math.floor(t)) < 0.4 ? 'Y' : hash(418, Math.floor(s)) < 0.5 ? 't' : 'T'), 'S'));
  return Q;
};

const plough = (): Quad[] => {
  const Q: Quad[] = [], W = timber(421);
  const I = part('fer', 6, '>', 'full');
  Q.push(...bar([12, 7, 8], [49, 7, 1], 2, WP('age', 6), W));
  Q.push(...box(8, 27, 5.5, 8.5, 0, 2, WP('sep', 4), timber(422)));
  Q.push(...box(27, 32, 5.5, 8.5, 0, 1.5, I, ironTex));
  Q.push(face([14, 8.5, 1], [13, 0, 0], [0, 2.5, 6], WP('versoir', 5), timber(423), 'S'));
  Q.push(...box(20, 22, 6, 8, 2, 9.5, WP('étançon', 5), timber(424)));
  Q.push(...bar([30, 7, 5.6], [28.5, 7, 0.5], 0.9, I, ironTex));
  Q.push(...bar([12, 4.5, 2], [1, 0.8, 18], 1.4, WP('mancheron', 6), timber(425)), ...bar([12, 9.5, 2], [1, 13.2, 18], 1.4, WP('mancheron', 6.5), timber(426)));
  Q.push(...box(5, 6.2, 2.5, 11.5, 10.5, 11.7, WP('traverse', 6), timber(427)));
  return Q;
};

// ---------- h11 : la guérisseuse ----------

const trivet = (): Quad[] => {
  const Q: Quad[] = [], apex: V3 = [11, 10, 30];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    Q.push(...bar([11 + 10.5 * Math.cos(a), 10 + 9.5 * Math.sin(a), 0], apex, 1.3, WP('perche', 5 + k * 0.1), bark(431 + k)));
  }
  const I = part('crémaillère', 6.5, '>', 'thin');
  Q.push(...box(10.5, 11.5, 9.5, 10.5, 13, 29, I, (_s, t) => (Math.floor(t) % 2 ? '<' : ')')));
  Q.push(...box(9.8, 12.2, 9.5, 10.5, 11.5, 13, I, ironTex));
  return Q;
};

const cauldron = (): Quad[] => {
  const Q: Quad[] = [], P = part('chaudron', 5, '>', 'full');
  const side: Tex = (_s, t, c) => (c.n[0] < -0.3 ? (t > 3 ? ')' : '<') : c.n[0] > 0.4 ? '>' : t > 4.5 ? ')' : '<');
  const cap: Tex = (s, t) => (Math.hypot(s - 5, t - 5) > 3.8 ? '(' : Math.hypot(s - 5, t - 5) > 3 ? '>' : hash(441, Math.floor(s), Math.floor(t)) < 0.3 ? 'e' : 'n');
  Q.push(...cylinder([5, 5, 1], [5, 5, 6.5], 5, P, side, cap, 12));
  for (const [x, y] of [[2, 3], [8, 3], [5, 8.5]]) Q.push(...box(x - 0.5, x + 0.5, y - 0.5, y + 0.5, 0, 1.5, P, ironTex));
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * (k / 8);
    Q.push(...box(5 - 5.2 * Math.cos(a) - 0.4, 5 - 5.2 * Math.cos(a) + 0.4, 4.6, 5.4, 6.5 + 3.5 * Math.sin(a) - 0.4, 6.5 + 3.5 * Math.sin(a) + 0.4, part('anse', 6, '>', 'thin'), ironTex));
  }
  return Q;
};

const herbShelf = (): Quad[] => {
  const Q: Quad[] = [], W = timber(451);
  Q.push(...box(0, 24, 0, 1, 0, 30, WP('dos', 2), boardsTex(452, 5)));
  Q.push(...box(0, 1.5, 0, 6, 0, 30, WP('montant', 5), W), ...box(22.5, 24, 0, 6, 0, 30, WP('montant', 5), W));
  for (const z of [1, 9, 17, 25]) Q.push(...box(1.5, 22.5, 1, 6, z, z + 1, WP('rayon', 4), timber(453 + z)));
  const pots: Tex = (_s, t, c) => (c.face === 'cap' ? 'e' : c.n[0] < -0.3 ? 'U' : c.n[0] > 0.4 ? 'n' : t > 2.5 ? 'U' : 'u');
  const potP = part('pot', 4.5, 'e', 'full');
  [[2], [10], [18], [26]].forEach(([z], row) => {
    let x = 3;
    for (let k = 0; k < 5 && x < 21; k++) {
      const r = 1.2 + hash(461, row, k) * 0.8, hh = 2.5 + hash(462, row, k) * 2;
      if (row === 3 && k > 2) break;
      Q.push(...cylinder([x + r, 3.6, z], [x + r, 3.6, z + hh], r, potP, pots, pots, 8));
      x += 2 * r + 0.8 + hash(463, row, k) * 1.5;
    }
  });
  return Q;
};

const mortar = (): Quad[] => {
  const Q: Quad[] = [];
  const side: Tex = (_s, t, c) => (c.n[0] < -0.3 ? '+' : c.n[0] > 0.4 ? ';' : t < 1 ? ';' : '=');
  const cap: Tex = (s, t) => (Math.hypot(s - 3, t - 3) > 2.1 ? '+' : ';');
  Q.push(...cylinder([3, 3, 0], [3, 3, 5.5], 3, part('mortier', 5, '~', 'full'), side, cap, 10));
  Q.push(...bar([3.2, 3, 3.5], [5, 2.2, 9.5], 1, WP('pilon', 6), timber(471)));
  return Q;
};

const herbBundles = (): Quad[] => {
  const Q: Quad[] = [];
  Q.push(...box(0, 32, 0.6, 1.4, 7.4, 8.2, part('lien', 6, 'X', 'thin'), () => 'O'));
  const greens = [['l', 'L', 'k'], ['j', 'L', 'l'], ['y', 'G', 'g'], ['c', 'l', 'L'], ['b', 'j', 'l'], ['L', 'k', 'l']];
  for (let k = 0; k < 6; k++) {
    const x = 1.5 + k * 5.2, g = greens[k];
    const tex: Tex = (s, t, c) => {
      const w = c.w, mid = w / 2;
      if (t > c.h - 1.2) return Math.abs(s - mid) < 1 ? 'C' : null;
      const half = 0.6 + ((c.h - t) / c.h) * mid * 1.1;
      if (Math.abs(s - mid) > half) return null;
      const r = hash(481, k, Math.floor(s), Math.floor(t));
      return r < 0.3 ? g[0] : r < 0.75 ? g[1] : g[2];
    };
    Q.push(...box(x, x + 3.6, 0.4, 1.6, 1 + hash(482, k), 7.5, part('bouquet', 5, g[2], 'full'), tex));
  }
  return Q;
};

const skep = (): Quad[] => {
  const Q: Quad[] = [];
  Q.push(...box(-0.5, 9.5, -0.5, 9.5, 0, 1, part('pierre', 3, '~', 'full'), (_s, t, c) => (c.face === 'top' ? '+' : t > 0.5 ? '=' : ';')));
  const rings: [number, number][] = [[4.5, 1], [4.5, 2.6], [4.3, 4.2], [3.9, 5.8], [3.2, 7.4], [2.3, 8.8], [1.2, 10]];
  rings.forEach(([r, z], k) => {
    const side: Tex = (_s, t, c) => {
      if (k === 0 && c.n[1] > 0.6 && t < 1.2 && Math.abs(c.n[0]) < 0.3) return 'o';
      const lit = c.n[0] < -0.3 ? 0 : c.n[0] > 0.4 ? 2 : 1;
      return t > 1.1 ? ['Y', 't', 'T'][lit] : ['t', 'T', 'P'][lit];
    };
    Q.push(...cylinder([4.5, 4.5, z], [4.5, 4.5, z + 1.7], r, part('ruche', 5, 'P', 'full'), side, () => 'Y', 12));
  });
  return Q;
};

const polePost = (): Quad[] => cylinder([1.5, 1.5, 0], [1.5, 1.5, 40], 1.5, WP('perche'), bark(491), () => '*', 8);

// ---------- les pièces de bâtiment ----------

const panel = (tex: Tex, w = 28, h = 36) => (): Quad[] => box(0, w, 0, 3, 0, h, part('remplissage', 1, ';', 'none'), tex);

/** Un pignon seul (vu de face) : la portée w, la montée g (px), son remplissage, l'entrait retroussé à 1,40 m. */
function gablePiece(w: number, g: number, kind: Parameters<typeof gableFill>[0]): () => Quad[] {
  return () => {
    const inner = gableFill(kind, 701, w, g, 'worn');
    const apex = (s: number) => g * (1 - Math.abs(s - w / 2) / (w / 2));
    const P = part('pignon', 1, ';', 'full');
    const T: Tex = (s, t, c) => (t > apex(s) ? null : inner(s, t, c));
    const Tn: Tex = (s, t, c) => (t > apex(w - s) ? null : inner(s, t, c));
    const Q: Quad[] = [
      { o: [0, 3, 0], u: [w, 0, 0], v: [0, 0, g], n: [0, 1, 0], part: P, tex: T, face: 'S' },
      { o: [w, 0, 0], u: [-w, 0, 0], v: [0, 0, g], n: [0, -1, 0], part: P, tex: Tn, face: 'N' },
      face([0, 0, 0], [w / 2, 0, g], [0, 3, 0], P, () => '+'),
      face([w / 2, 0, g], [w / 2, 0, -g], [0, 3, 0], P, () => '='),
    ];
    const ez = 26, half = (w / 2) * (1 - ez / g);
    if (half > 2) Q.push(...box(w / 2 - half + 1, w / 2 + half - 1, -0.5, 3.5, ez, ez + 3, WP('entrait', 6), timber(702)));
    return Q;
  };
}

const twinDoor = (): Quad[] => {
  const P = part('porte', 3, 'K', 'full');
  const l = leafTex(511, 16, { latch: 'right' }), r = leafTex(512, 16), inn = leafInsideTex(513);
  return [
    ...box(0, 16, 0, 1, 0, 38, P, (s, t, c) => (c.face === 'N' ? inn(s, t, c) : l(s, t, c))),
    ...box(16, 32, 0, 1, 0, 38, part('porte', 3.1, 'K', 'full'), (s, t, c) => (c.face === 'N' ? inn(s, t, c) : r(s, t, c))),
  ];
};
const stableDoor = (): Quad[] => {
  const l = leafTex(521, 28, { split: 16, latch: 'right' }), inn = leafInsideTex(522);
  return box(0, 28, 0, 1, 0, 36, part('porte', 3, 'K', 'full'), (s, t, c) => (c.face === 'N' ? inn(s, t, c) : l(s, t, c)));
};

/** Les pans de toit tirés des maisons (la même géométrie) : le pan sud et son faîtage, de la longueur voulue. */
function panOf(h: HouseSpec): () => Quad[] {
  // le pan sud seul, sans le faîtage (le faîtage de terre du jeu, `earth-ridge`, se pose dessus)
  return () => gableRoof(h).filter((q) => q.part.name !== 'faîtage' && q.part.name !== 'pignon' && q.part.name !== 'entrait' && (q.n[1] > 0.01 || (q.face === 'edge' && q.o[1] > h.D / 2)));
}
/** La boîte d'un pan (cm) comme celle du jeu (`thatch-roof`) : la longueur, la profondeur de l'égout à l'axe du faîtage, la montée. */
function panDims(h: HouseSpec): { w: number; d: number; h: number } {
  const g = roofGeom(h), [lo, hi] = THICK[h.roof.cover], ev = h.roof.eave ?? 14, [a, b] = h.roof.over ?? [6, 6];
  const EAVE = g.H2 + ev, dLo = EAVE - lo * g.SIN;
  const zTop = g.zU(-hi * g.SIN) + hi * g.COS, zEave = g.zU(dLo) + lo * g.COS;
  return { w: (h.L + a + b) * 5, d: EAVE * 5, h: Math.round((zTop - zEave) * 5) };
}
const mini = (L: number, D: number, pitch: number, cover: HouseSpec['roof']['cover'], over: [number, number], smoke?: number[]): HouseSpec => ({
  L, D, T: 0, sill: 16, doorW: 18, innerDoorW: 16, walls: [], age: 'worn', fill: 'lime', roof: { cover, pitch, over, smoke, gables: ['none', 'none'] },
});
export const H11_ROOF: HouseSpec = {
  L: 96, D: 64, T: 0, sill: 16, doorW: 18, innerDoorW: 16, walls: [], age: 'worn', fill: 'daub',
  roof: { cover: 'thatch', pitch: 50, hip: true, eave: 16, notch: [36, 62] },
};
/** L'appentis de bardeaux du berger : 3,80 × 3,20 m, de 2,95 m au nord à 1,70 m au sud (25°). */
export const SHED_LOW = { w: 76, d: 64, hi: 59, lo: 29.5 };
const shedLow = (): Quad[] => leanTo([0, 0, SHED_LOW.hi], [0, SHED_LOW.d, SHED_LOW.lo], [SHED_LOW.w, 0, 0], [], 'worn', 531, 'shingles');

// =====================================================================================================================
// La liste
// =====================================================================================================================

const DEFS: Def[] = [
  // h1
  { key: 'thatch-smoke-hole', name: 'Chaume perce d un trou de fumee (une travee)', dims: panDims(mini(32, 96, 50, 'thatch', [0, 0], [16])), houses: ['h1-couvreur', 'h5-journaliers'], n: 4, k: bld, ground: true, model: panOf(mini(32, 96, 50, 'thatch', [0, 0], [16])) },
  { key: 'cradle', name: 'Berceau', dims: { w: 90, d: 50, h: 50 }, houses: ['h1-couvreur'], n: 2, k: furn, model: cradle },
  { key: 'thatch-bundle-stack', name: 'Bottes de chaume rangees', dims: { w: 160, d: 60, h: 80 }, houses: ['h1-couvreur'], n: 2, k: furn, model: bundleStack },
  { key: 'ladder', name: 'Echelle du couvreur (couchee)', dims: { w: 400, d: 40, h: 10 }, houses: ['h1-couvreur'], n: 2, k: (v) => (v % 2 ? 1 : 0.5), lying: true, model: ladder },
  // h3
  { key: 'lime-panel-flaking', name: 'Remplissage chaule ecaille', dims: { w: 140, d: 15, h: 180 }, houses: ['h3-vieux'], n: 4, k: bld, ground: true, model: panel(flakingTex(541)) },
  { key: 'thatch-roof-mossy', name: 'Pan de chaume vieux et moussu (6 m)', dims: panDims(mini(96, 64, 50, 'thatch-mossy', [12, 12])), houses: ['h3-vieux'], n: 4, k: bld, ground: true, model: panOf(mini(96, 64, 50, 'thatch-mossy', [12, 12])) },
  { key: 'spinning-wheel', name: 'Rouet', dims: { w: 90, d: 40, h: 90 }, houses: ['h3-vieux'], n: 4, k: furn, model: spinningWheel },
  { key: 'small-table', name: 'Petite table', dims: { w: 80, d: 60, h: 75 }, houses: ['h3-vieux'], n: 2, k: furn, model: smallTable },
  // h4
  { key: 'board-wall-low', name: 'Pan de bardage bas', dims: { w: 120, d: 20, h: 200 }, houses: ['h4-berger'], n: 4, k: bld, ground: true, model: boardWallLow },
  { key: 'shingle-shed-roof-low', name: 'Appentis de bardeaux bas (25 deg)', dims: { w: 0, d: 0, h: 0 }, houses: ['h4-berger'], n: 4, k: bld, ground: true, model: shedLow },
  { key: 'hurdle', name: 'Claie de parc', dims: { w: 160, d: 10, h: 100 }, houses: ['h4-berger'], n: 2, k: furn, model: hurdle },
  { key: 'dog-kennel', name: 'Niche', dims: { w: 80, d: 100, h: 70 }, houses: ['h4-berger'], n: 4, k: furn, model: kennel },
  // h5
  { key: 'daub-gable', name: 'Pignon en torchis brut (3,20 m)', dims: { w: 320, d: 15, h: 190 }, houses: ['h5-journaliers'], n: 4, k: bld, ground: true, model: gablePiece(64, 38, 'daub') },
  // h6
  { key: 'lime-cross-panel', name: 'Remplissage chaule a croix de Saint-Andre', dims: { w: 140, d: 15, h: 180 }, houses: ['h6-charpentier'], n: 4, k: bld, ground: true, model: panel(crossTex(551, 'worn')) },
  { key: 'lime-gable-cross', name: 'Pignon chaule a croix (4,80 m)', dims: { w: 480, d: 15, h: 240 }, houses: ['h6-charpentier'], n: 4, k: bld, ground: true, model: gablePiece(96, 48, 'cross') },
  { key: 'twin-plank-door', name: 'Porte d atelier a deux battants', dims: { w: 160, d: 5, h: 190 }, houses: ['h6-charpentier'], n: 4, k: bld, ground: true, model: twinDoor },
  { key: 'sawhorse', name: 'Chevalet', dims: { w: 100, d: 50, h: 80 }, houses: ['h6-charpentier'], n: 2, k: furn, model: sawhorse },
  // h7
  { key: 'manger', name: 'Mangeoire et ratelier', dims: { w: 240, d: 60, h: 120 }, houses: ['h7-laboureur'], n: 4, k: furn, model: manger },
  { key: 'stable-door', name: 'Porte d etable coupee en deux', dims: { w: 140, d: 5, h: 180 }, houses: ['h7-laboureur'], n: 4, k: bld, ground: true, model: stableDoor },
  { key: 'dung-heap', name: 'Tas de fumier', dims: { w: 300, d: 200, h: 80 }, houses: ['h7-laboureur'], n: 2, k: furn, grid: (v) => (v % 2 ? mound(40, 60, 16, 601, ['U', 'n', 'e', 'N'], ['T', 't', 'P', 'K']) : mound(60, 40, 16, 601, ['U', 'n', 'e', 'N'], ['T', 't', 'P', 'K'])) },
  { key: 'lime-gable-loft', name: 'Pignon chaule a gerbiere (6,40 m)', dims: { w: 640, d: 15, h: 320 }, houses: ['h7-laboureur'], n: 4, k: bld, ground: true, model: gablePiece(128, 64, 'loft') },
  { key: 'plough', name: 'Charrue', dims: { w: 250, d: 70, h: 90 }, houses: ['h7-laboureur'], n: 4, k: furn, model: plough },
  // h11
  { key: 'thatch-hip-roof', name: 'Chaume a croupes (quatre pans)', dims: { w: 0, d: 0, h: 0 }, houses: ['h11-guerisseuse'], n: 4, k: bld, ground: true, model: () => hipRoof(H11_ROOF) },
  { key: 'pole-post', name: 'Perche debout (poteau rond)', dims: { w: 15, d: 15, h: 200 }, houses: ['h11-guerisseuse'], n: 1, k: furn, model: polePost },
  { key: 'pot-hook', name: 'Cremaillere sur trepied', dims: { w: 110, d: 100, h: 150 }, houses: ['h11-guerisseuse'], n: 1, k: furn, model: trivet },
  { key: 'cauldron', name: 'Chaudron', dims: { w: 50, d: 50, h: 45 }, houses: ['h11-guerisseuse'], n: 1, k: furn, model: cauldron },
  { key: 'herb-shelf', name: 'Etagere a pots', dims: { w: 120, d: 30, h: 150 }, houses: ['h11-guerisseuse'], n: 4, k: furn, model: herbShelf },
  { key: 'mortar', name: 'Mortier et pilon', dims: { w: 30, d: 30, h: 45 }, houses: ['h11-guerisseuse'], n: 1, k: furn, model: mortar },
  { key: 'herb-bundles', name: 'Bouquets d herbes pendus', dims: { w: 160, d: 10, h: 40 }, houses: ['h11-guerisseuse'], n: 2, k: furn, model: herbBundles },
  { key: 'plessis', name: 'Plessis (cloture tressee)', dims: { w: 160, d: 10, h: 90 }, houses: ['h11-guerisseuse'], n: 2, k: furn, model: plessis },
  { key: 'skep', name: 'Ruche en paille', dims: { w: 45, d: 45, h: 55 }, houses: ['h11-guerisseuse'], n: 1, k: furn, model: skep },
];

/** La vue v d'une pièce (grille, signes de PIECE_PAL). */
export function pieceGrid(key: string, v = 0): Grid {
  const d = DEFS.find((x) => x.key === key);
  if (!d) throw new Error(`village-maisons-bois : pas de pièce « ${key} »`);
  if (d.grid) return d.grid(v);
  return pieceView(d.model!, v, d.k(v));
}

/** Les dimensions d'une pièce calculée (les pans) : la boîte de son modèle, en cm. */
function boxDims(model: () => Quad[]): { w: number; d: number; h: number } {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const q of model()) for (const p of [q.o, [q.o[0] + q.u[0], q.o[1] + q.u[1], q.o[2] + q.u[2]], [q.o[0] + q.v[0], q.o[1] + q.v[1], q.o[2] + q.v[2]], [q.o[0] + q.u[0] + q.v[0], q.o[1] + q.u[1] + q.v[1], q.o[2] + q.u[2] + q.v[2]]]) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]);
  }
  return { w: Math.round((x1 - x0) * 5), d: Math.round((y1 - y0) * 5), h: Math.round((z1 - z0) * 5) };
}

/** Les pièces nouvelles (interface de art/proposals/village-types.ts). */
export const PIECES: VillagePiece[] = DEFS.map((d) => ({
  key: d.key,
  name: d.name,
  dims: d.dims.w ? d.dims : boxDims(() => d.model!(0)),
  houses: d.houses,
  views: () => Array.from({ length: d.n }, (_, v) => ({ grid: pieceGrid(d.key, v), pal: PIECE_PAL })),
}));
/** Ce que la planche des pièces doit savoir de plus : la forme pour le gabarit (pièce de bâtiment, couchée). */
export interface PieceForm {
  ground?: boolean; lying?: boolean;
  /** Un pan : sa vue de dos (r2) ne montre que sa tranche ; un pignon : de chant, un triangle (sa boîte ne s'emplit pas). */
  pan?: boolean; gable?: boolean;
  /** Un toit entier (les croupes) : la boîte d'un pan ne vaut pas ; à découper en quatre pans pour le jeu. */
  whole?: boolean;
  /** Ce qui explique un écart à la boîte (la forme de l'objet). */
  note?: string;
}
const NOTES: Record<string, string> = {
  'dog-kennel': 'de cote, le faite au milieu : la boite ne s emplit pas en haut',
  manger: 'de dos, le ratelier est devant : la boite ne s emplit pas en haut',
  'dung-heap': 'un tas : son sommet n est pas au fond de sa boite',
  'pot-hook': 'un trepied : le sommet au milieu de sa boite',
  'thatch-bundle-stack': 'de cote, le haut des bottes arrondi',
  'spinning-wheel': 'de cote, la roue au milieu',
  plough: 'au repos, la pointe de l age au sol, les mancherons dresses : la boite ne s emplit pas',
};
export const PIECE_FORM: Record<string, PieceForm> = Object.fromEntries(
  DEFS.map((d) => [d.key, {
    ground: d.ground, lying: d.lying,
    pan: ['thatch-smoke-hole', 'thatch-roof-mossy', 'shingle-shed-roof-low'].includes(d.key),
    gable: d.key.includes('gable'), whole: d.key === 'thatch-hip-roof', note: NOTES[d.key],
  }]),
);
