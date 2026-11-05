// PROPOSITION (hors jeu, jamais chargée par le jeu) : les matières des maisons de pierre du village (CADRAGE-village.md, travail
// 2 : h2 le tisserand, h8 le meunier, h9 le forgeron, h10 le maquignon), pour le modèle en volumes (art/lib/volumes.ts) : des
// fonctions qui rendent un `Tex` (s vers la droite, t vers le haut sur la face, px du jeu, 5 cm par pixel).
//
// D'où vient chaque matière (rien n'est inventé là où le jeu ou un essai validé a déjà la sienne) :
//   - la pierre brute (h2 à la terre, h10 à la chaux) : l'algorithme des murs du jeu dans sa copie d'essai
//     art/proposals/walls-high.ts (`highWall`, les pierres mêmes du jeu, ses ouvertures), échantillonné au pixel sur la face ;
//   - les moellons assisés à la chaux (h9, à côté de la forge) : `masonry` de art/proposals/forge.ts, importée, ses joints
//     rejointoyés clair ;
//   - COPIÉ de la branche `maison-coq` (validé par Grégoire, jamais extrait ni réécrit autrement que pour la longueur des lignes) :
//     la palette du coq (`COQ_PAL` de art/proposals/coq-pierre.ts : le calcaire taillé θ λ, les laves ( ) ? ", le verre et le plomb
//     ` > <, le fer - _, la guède, la garance) ; le moyen appareil et sa chaîne d'angle (`courseJoints`, `locate` de
//     coq-pierre.ts), ici seulement aux angles (le meunier : « pierre de taille aux angles seulement ») ; la lave (`laves`,
//     `lavesRows`, `lavesJoints`, `lavesRidge`, `smooth`) : la seule lauze du jeu (CADRAGE-coq section 10) ; le dallage
//     (`flagstones`), l'enduit de chaux du dedans (`limePlaster`) ; l'encadrement des baies (pierres de tableau harpées, linteau
//     monolithe, chanfrein : `frame`, `withBays`, `inBay` de art/proposals/coq-baies.ts) ; le vitrail en losanges plombés (`leaded`
//     de coq-baies.ts) ; le plancher de planches (`planks` de art/proposals/coq-maison.ts) ;
//   - COPIÉ de art/proposals/forge-toits.ts (essai validé de la forge, art/world/forge-roofs.ts au jeu) : les tuiles plates
//     (`tilesTex`) et les bardeaux (`shinglesTex`), écrits ici en signes de la palette (la terre cuite de `terracotta` sous des
//     signes grecs, les bardeaux au bois patiné `woodAges.worn`) pour que les pièces se dessinent aussi en grille.
//
// Les signes : ceux du monde (`stonePalette`), du bois patiné, du coq, et trois signes neufs (la toile huilée ε ζ η, à ajouter à
// art/palette.ts si le tisserand entre au jeu). Le rendu de l'essai (art/proposals/maison-xeros.ts `render`) ne connaît que les
// signes du monde et du bois patiné : `hexify` écrit les autres en couleur (#rrggbb), sans changer les parts (le contour en dépend).

import type { Grid, Palette } from '../lib/canvas';
import { stonePalette } from '../items/stones';
import { terracotta, woad, woodAges } from '../palette';
import { dash, hash, type Ctx, type Part, type Quad, type Tex } from '../lib/volumes';
import { gameImage } from '../lib/walls';
import { wallKit, type Hole as KitHole, type WallKind } from './walls-high';
import { masonry } from './forge';
import { PAL as XEROS_PAL } from './maison-xeros';

// =====================================================================================================================
// La palette
// =====================================================================================================================

/**
 * La palette des maisons de pierre : le monde et la pierre fraîche (`stonePalette`), le bois travaillé à l'âge patiné (des maisons
 * habitées, CADRAGE-village 3.1), la palette du coq (copiée de `COQ_PAL`, maison-coq:art/proposals/coq-pierre.ts), la terre cuite
 * des tuiles (`terracotta` de art/palette.ts, sous des signes grecs : ses signes à elle sont ceux des laves du coq) et la toile
 * huilée du tisserand.
 */
export const palette: Palette = {
  ...stonePalette,
  ...woodAges.worn,
  // ---- du coq (coq-pierre.ts, COQ_PAL), à l'identique ----
  'θ': '#cbc1aa', // bloc clair : entre + et =
  'λ': '#ada290', // layage : les stries du marteau taillant, entre = et ;
  '(': '#a8a194', // lave au soleil
  ')': '#8a8379', // lave
  '?': '#6a625b', // lave à l'ombre, chant d'une lave
  '"': '#463d3e', // creux sous une lave, joint du faîtage
  '`': '#3f3c48', // plomb
  '>': '#61766f', // verre
  '<': '#a9bab0', // reflet du ciel sur le verre
  '-': '#6c6468', // fer éclairé
  '_': '#3a3239', // fer
  'α': woad.light,
  'β': woad.base,
  'γ': woad.shade,
  'δ': woad.deep,
  'ρ': '#a5614f', // garance au jour
  'σ': '#7e4a40', // garance à l'ombre
  'τ': '#5a3631', // garance au creux du pli
  // ---- la terre cuite des tuiles plates (art/palette.ts `terracotta`, signes ' " ` \ ? : pris ici par le coq) ----
  'κ': terracotta["'"], // tuile au soleil, passée
  'μ': terracotta['"'], // la tuile
  'ν': terracotta['`'], // une tuile plus cuite, le coin arrondi
  'ξ': terracotta['\\'], // l'ombre sous le rang du dessus
  'π': terracotta['?'], // le creux, contour côté lumière
  // ---- NOUVEAU : la toile huilée du châssis du tisserand (le lin imbibé d'huile de lin, jauni, qui laisse passer un jour
  // laiteux) : plus pâle et plus gris que le chaume (Y t T P), plus jaune que le lin écru (d D E) ; l'ombre vers le brun ----
  'ε': '#e6d9ae', // la toile au jour
  'ζ': '#cdbb8a', // la toile
  'η': '#a08c64', // la toile à l'ombre, le pli sur la traverse
};

const SAME = (k: string) => XEROS_PAL[k] !== undefined && XEROS_PAL[k] === palette[k];
/** Un signe que le rendu de l'essai ne connaît pas, écrit en couleur. */
export const toHex = (k: string | null): string | null => (k === null || k.startsWith('#') || SAME(k) ? k : palette[k] ?? k);

/** Les faces d'une scène, leurs signes neufs écrits en couleur (les parts gardent leur identité : le contour en dépend). */
export function hexify(qs: Quad[]): Quad[] {
  const parts = new Map<Part, Part>();
  const P = (p: Part) => {
    let n = parts.get(p);
    if (!n) { n = { ...p, dark: toHex(p.dark) ?? p.dark }; parts.set(p, n); }
    return n;
  };
  return qs.map((q) => ({ ...q, part: P(q.part), tex: (s, t, c) => toHex(q.tex(s, t, c)) }));
}

const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Le vide autour d'un intérieur (`INTERIOR.void` de src/config.ts). */
export const VOID = '#1e1610';
/** Des faces vues dans la pénombre (ce qu'on voit du niveau du dessous par la trémie) : la couleur mêlée de la pénombre. */
export function dimmed(qs: Quad[], f = 0.55): Quad[] {
  const S = [0x1a, 0x0e, 0x06];
  const mix = (k: string | null) => {
    const h = toHex(k);
    if (h === null) return null;
    const hex = h.startsWith('#') ? h : palette[h] ?? XEROS_PAL[h];
    if (!hex) return h;
    const [r, g, b] = hexRgb(hex);
    const c = (v: number, s: number) => Math.round(v * (1 - f) + s * f).toString(16).padStart(2, '0');
    return `#${c(r, S[0])}${c(g, S[1])}${c(b, S[2])}`;
  };
  const parts = new Map<Part, Part>();
  const P = (p: Part) => { let n = parts.get(p); if (!n) { n = { ...p, dark: mix(p.dark) ?? p.dark, cast: false }; parts.set(p, n); } return n; };
  return qs.map((q) => ({ ...q, part: P(q.part), tex: (s, t, c) => mix(q.tex(s, t, c)) }));
}

// =====================================================================================================================
// La pierre brute : le mur du jeu (walls-high.ts), échantillonné sur la face
// =====================================================================================================================

const kit = wallKit(gameImage);
const kitMemo = new Map<string, Grid>();

/** Une ouverture dans une face, en coordonnées de la face (s depuis la gauche, t depuis le bas) ; `lintel` : la place d'un linteau. */
export interface FaceHole { s0: number; s1: number; t0: number; t1: number; kind?: 'void' | 'lintel' }

/** Le mortier : la terre (le mur du jeu, `n u e`), ou la chaux (rejointoyé clair). */
export type Mortar = 'earth' | 'lime';
const LIME_MORTAR: Record<string, string> = { n: '+', u: '!', e: '=', D: '=', E: ';' };

/**
 * Le parement de pierre brute d'une face de `w` × `h` px : le mur de l'algorithme du jeu (art/proposals/walls-high.ts, `highWall`
 * brut, ses têtes finies, les pierres posées autour des ouvertures et des linteaux), monté une fois par taille et par graine, puis
 * lu au pixel. La face se lit en coordonnées de la face (s, t) ; `mortar` : la terre du jeu ou la chaux.
 */
export function rubbleGrid(kind: WallKind, seed: number, w: number, h: number, holes: FaceHole[] = []): Grid {
  const W = Math.round(w), H = Math.round(h);
  const key = `${kind}:${seed}:${W}:${H}:${holes.map((o) => [o.s0, o.s1, o.t0, o.t1, o.kind].join(',')).join(';')}`;
  let g = kitMemo.get(key);
  if (!g) {
    const kh: KitHole[] = holes.map((o) => ({ x0: Math.round(o.s0), x1: Math.round(o.s1), y0: H - Math.round(o.t1), y1: H - Math.round(o.t0), kind: o.kind ?? 'void' }));
    g = kit.highWall(kind, seed, { length: W, face: H, top: 0 }, { left: 'head', right: 'head', holes: kh });
    kitMemo.set(key, g);
  }
  return g;
}

export function rubble(seed: number, w: number, h: number, mortar: Mortar, holes: FaceHole[] = [], kind: WallKind = 'rough'): Tex {
  return (s, t) => {
    const g = rubbleGrid(kind, seed, w, h, holes);
    const H = Math.round(h), i = Math.min(Math.round(w) - 1, Math.max(0, Math.floor(s))), j = Math.min(H - 1, Math.max(0, Math.floor(t)));
    let k = g[H - 1 - j]?.[i] ?? 'n';
    if (k === '.' || k === 'x') k = 'n';
    return mortar === 'lime' ? LIME_MORTAR[k] ?? k : k;
  };
}

/** La coupe d'un mur de pierre tranché (le dessus d'un mur coupé, vu du dedans) : des pierres dans le mortier. */
export function rubbleSection(seed: number, mortar: Mortar): Tex {
  return (_s, _t, c) => {
    const x = Math.floor(c.p[0]), y = Math.floor(c.p[1]);
    const cell = hash(seed, Math.floor((x + (y % 2) * 2) / 4), Math.floor(y / 3));
    const edge = (x + (y % 2) * 2) % 4 === 0 || y % 3 === 0;
    if (edge) return mortar === 'lime' ? '+' : 'n';
    return cell < 0.3 ? 'z' : cell < 0.65 ? 'r' : 'R';
  };
}

// =====================================================================================================================
// Les moellons assisés à la chaux (la forge, art/proposals/forge.ts `masonry`), rejointoyés clair
// =====================================================================================================================

/** Les moellons de la forge, leurs joints de lit et montants rejointoyés à la chaux claire (le forgeron : « rejointoyés clair »). */
export function limeMasonry(seed: number, quoin?: (face: string) => [boolean, boolean]): Tex {
  const m = masonry(seed, quoin);
  return (s, t, c) => {
    const k = m(s, t, c);
    if (k === 'E') return c.face === 'top' ? '!' : '+';
    if (k === '+' && c.face !== 'top') return '=';
    return k;
  };
}

// =====================================================================================================================
// Copié de maison-coq:art/proposals/coq-pierre.ts : le moyen appareil (la chaîne d'angle), les laves, le dallage, l'enduit
// =====================================================================================================================

/** Hauteur d'une assise de pierre de taille : 30 cm. */
export const COURSE = 6;
const BLOCK_MIN = 10, BLOCK_MAX = 18;
const STAGGER = 3;
const memo = new Map<string, number[]>();
const LIGHTER: Record<string, string> = { '+': '!', 'θ': '+', '=': 'θ', 'λ': '=' };
const DARKER: Record<string, string> = { '+': 'θ', 'θ': '=', '=': 'λ', 'λ': ';' };

function courseJoints(seed: number, k: number, w: number): number[] {
  const key = `${seed}:${k}:${w}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const below = k > 0 ? courseJoints(seed, k - 1, w) : [];
  const out: number[] = [];
  let x = -1 - Math.floor(hash(seed, k, 0) * BLOCK_MAX);
  for (let n = 0; x < w + 20; n++) {
    let L = BLOCK_MIN + Math.floor(hash(seed, k, n, 1) * (BLOCK_MAX - BLOCK_MIN + 1));
    for (let tries = 0; tries < 6 && below.some((b) => Math.abs(x + L - b) < STAGGER); tries++) L = L + 2 > BLOCK_MAX ? BLOCK_MIN + tries : L + 2;
    x += L;
    out.push(x);
  }
  memo.set(key, out);
  return out;
}

interface AshlarOpts { quoins?: ('left' | 'right')[]; quoinLong?: number; quoinShort?: number }
interface At { joint: boolean; bx: number; by: number; len: number; id: number; quoin: boolean }

function locate(seed: number, i: number, j: number, w: number, face: Ctx['face'], o: AshlarOpts): At {
  const k = Math.floor(j / COURSE), jj = j - k * COURSE;
  const side = face === 'E' || face === 'W' ? 1 : 0;
  const long = (k + side) % 2 === 0;
  const qLong = o.quoinLong ?? 18, qShort = o.quoinShort ?? 10;
  const ql = o.quoins?.includes('left') ? (long ? qLong : qShort) : 0;
  const qr = o.quoins?.includes('right') ? (long ? qLong : qShort) : 0;
  if (jj === 0) return { joint: true, bx: 0, by: 0, len: 0, id: 0, quoin: false };
  let J = courseJoints(seed, k, w).filter((x) => x > ql + 4 && x < w - qr - 5);
  if (ql) J = [ql - 1, ...J];
  if (qr) J = [...J, w - qr];
  let prev = -40, next = w + 40, n = 0;
  for (const x of J) {
    if (x === i) return { joint: true, bx: 0, by: 0, len: 0, id: 0, quoin: false };
    if (x < i) { prev = x; n++; } else { next = x; break; }
  }
  const quoin = (ql > 0 && i < ql) || (qr > 0 && i > w - qr);
  return { joint: false, bx: i - prev - 1, by: jj - 1, len: next - prev - 1, id: Math.floor(hash(seed, k, n, 7) * 1000), quoin };
}

/** Un pixel de bloc de pierre de taille (copie de `ashlarWall` du coq : la ciselure, le layage). */
function ashlarPixel(seed: number, a: At): string {
  if (a.joint) return ';';
  const r = a.id / 1000;
  const base = a.quoin ? '+' : r < 0.3 ? 'θ' : r < 0.85 ? '=' : 'λ';
  if (a.by === COURSE - 2 || a.bx === 0) return LIGHTER[base];
  const slant = hash(seed, a.id, 3) < 0.5;
  const stria = ((slant ? a.bx + a.by : a.bx) % 3 === 1) && dash(seed + a.id, slant ? a.bx + a.by : a.bx, a.by, 0.8);
  return stria ? DARKER[base] : base;
}

/** Bruit de valeur lissé (cellules de `cell` px), dans [0, 1). */
export function smooth(seed: number, s: number, t: number, cell: number): number {
  const x = s / cell, y = t / cell, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const v = (a: number, b: number) => hash(seed, a, b, 71);
  const e = (u: number) => u * u * (3 - 2 * u);
  const top = v(x0, y0) * (1 - e(fx)) + v(x0 + 1, y0) * e(fx);
  const bot = v(x0, y0 + 1) * (1 - e(fx)) + v(x0 + 1, y0 + 1) * e(fx);
  return top * (1 - e(fy)) + bot * e(fy);
}

/**
 * L'enduit de chaux des murs du dedans (copie de `limePlaster` du coq, adoucie : sur un mur entier de 12 m, les plages crème
 * de 70 cm du coq faisaient des taches ; ici plus petites et plus rares).
 */
export function limePlaster(seed: number): Tex {
  return (s, t, c) => {
    if (c.face === 'top') return Math.floor(t) === Math.round(c.h) - 1 ? '!' : '=';
    const n = smooth(seed, s, t, 6) * 0.6 + smooth(seed + 1, s, t * 2, 3) * 0.4;
    if (n > 0.8) return '+';
    if (t < 2 && hash(seed, Math.floor(s / 3), 72) < 0.6) return t < 1 ? '=' : '+';
    return '!';
  };
}

function lavesRows(seed: number, upto: number, total: number): number[] {
  const out = [0];
  for (let r = 0; out[out.length - 1] <= upto + 6; r++) {
    const f = Math.min(1, out[out.length - 1] / Math.max(1, total));
    out.push(out[out.length - 1] + Math.round(5 - 2 * f + (hash(seed, r, 41) - 0.5) * 0.9));
  }
  return out;
}
function lavesJoints(seed: number, r: number, w: number, f = 0): number[] {
  const out: number[] = [];
  let x = -Math.floor(hash(seed, r, 51) * 12) - 1;
  for (let n = 0; x < w + 16; n++) { x += Math.round((7 + Math.floor(hash(seed, r, n, 52) * 9)) * (1 - 0.35 * f)); out.push(x); }
  return out;
}

/** Le pan de toit en laves (copie de `laves` du coq, à l'identique). */
export function laves(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), w = Math.round(c.w);
    if (c.face === 'edge' || c.face === 'cap' || c.face === 'under' || c.face === 'S' || c.face === 'E' || c.face === 'W') {
      const j = Math.floor(t), h = Math.round(c.h);
      const L = lavesJoints(seed + 7, j, w), n = L.filter((b) => b < i).length;
      if (j === h - 1) return '(';
      return (j + (hash(seed, n, j, 58) < 0.5 ? 0 : 1)) % 2 === 0 ? '?' : ')';
    }
    const rows = lavesRows(seed, t, c.h);
    const fr = (r: number) => Math.min(1, rows[r] / Math.max(1, c.h));
    const lip = (r: number, x: number) => {
      const J = lavesJoints(seed, r, w, fr(r));
      const n = J.filter((b) => b < x).length, a = n ? J[n - 1] : -20, b = J[n] ?? w + 20;
      if (x - a <= 1 || b - x <= 1) return 0;
      return hash(seed, r, n, 53) < 0.5 ? 1 : 0;
    };
    let r = Math.max(0, rows.findIndex((b, q) => q + 1 < rows.length && t >= b && t < rows[q + 1]));
    if (r + 1 < rows.length && t >= rows[r + 1] - lip(r + 1, i)) r++;
    const f = t - (rows[r] - lip(r, i)), H = rows[r + 1] - rows[r] + lip(r, i) - lip(r + 1, i);
    const J = lavesJoints(seed, r, w, fr(r));
    const n = J.filter((b) => b < i).length;
    const mossy = hash(seed, i >> 2, r, 55) < 0.1;
    if (f >= H - 1) return mossy ? 'l' : '"';
    if (J.includes(i)) return f < 1 ? ')' : '?';
    if (f < 1) return mossy && hash(seed, i, r, 56) < 0.6 ? 'L' : '(';
    const tone = hash(seed, r, n, 54);
    if (tone > 0.88) return '?';
    return smooth(seed + r, s, t * 3, 4) > 0.72 ? '(' : ')';
  };
}

/** Le faîtage de pierre (copie de `lavesRidge` du coq) : des faîtières de 40 cm, le dessus au soleil, les joues dans l'ombre. */
export function lavesRidge(): Tex {
  return (s, _t, c) => {
    const i = Math.floor(s), nz = c.n[2];
    if (c.face === 'cap') return ';';
    if (i % 8 === 7) return '"';
    if (i % 8 === 0 && nz > 0.5) return '!';
    return nz > 0.9 ? '+' : nz > 0.3 ? '=' : nz > 0 ? ';' : '?';
  };
}

function slabRows(seed: number, upto: number): number[] {
  const out = [0];
  for (let r = 0; out[out.length - 1] <= upto + 12; r++) out.push(out[out.length - 1] + 8 + Math.floor(hash(seed, r, 61) * 5));
  return out;
}
/** Le dallage de calcaire d'un sol (copie de `flagstones` du coq), lu en coordonnées du monde. */
export function flagstones(seed: number): Tex {
  return (_s, _t, c) => {
    const i = Math.floor(c.p[0]) + 200, j = Math.floor(c.p[1]) + 200;
    if (c.face !== 'top') return Math.floor(_t) === Math.round(c.h) - 1 ? '+' : '=';
    const rows = slabRows(seed, j);
    const r = rows.findIndex((b, q) => j >= b && j < rows[q + 1]);
    if (j === rows[r]) return ';';
    let x = -Math.floor(hash(seed, r, 62) * 10) - 1, n = 0;
    while (x < i) { x += 8 + Math.floor(hash(seed, r, n, 63) * 5); n++; }
    if (x === i) return ';';
    const tone = hash(seed, r, n, 64);
    const base = tone < 0.4 ? '+' : tone < 0.85 ? 'θ' : '=';
    if (dash(seed + n * 7 + r, j, i, 0.25)) return base === '+' ? 'θ' : '=';
    return base;
  };
}

/** Le plancher de l'étage (copie de `planks` du coq) : des planches de 25 cm posées est-ouest, joints de bout décalés. */
export function planks(): Tex {
  return (_s, _t, c) => {
    const x = Math.floor(c.p[0]) + 400, y = Math.floor(c.p[1]) + 400, row = Math.floor(y / 5), r = y - row * 5;
    if (c.face !== 'top') return _t > 1 ? '%' : '&';
    if (r === 4) return '@';
    const L = 58 + Math.floor(hash(17, row) * 20), off = Math.floor(hash(18, row) * L);
    if ((x + off) % L === 0) return '@';
    if (r === 0) return '^';
    return dash(19, y, x, 0.35) ? '%' : '*';
  };
}

// =====================================================================================================================
// L'enduit du meunier, ses chaînes d'angle (les pierres d'angle du coq, `ashlar-quoin` : 60 et 40 cm en harpe, assises de 30)
// =====================================================================================================================

/**
 * L'enduit de chaux du dehors (le meunier : « un crépi lisse, blanc cassé ») : plus calme que la chaux du torchis de Xéros, de
 * larges plages à peine plus crème, la pluie qui l'a lavé en coulures sous l'égout, la terre qui rejaillit au pied ; les chaînes
 * d'angle en pierre de taille (les pierres d'angle du catalogue du coq, 60 et 40 cm alternés, assises de 30 cm) aux deux bouts de
 * la face (`quoins`), le reste enduit. La face se lit en coordonnées de la face (s, t).
 */
export function rendered(seed: number, w: number, quoins: ('left' | 'right')[] = []): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top') return j === Math.round(c.h) - 1 ? '!' : '+';
    if (quoins.length) {
      const k = Math.floor(j / COURSE), long = k % 2 === 0, q = long ? 12 : 8;
      const inQ = (quoins.includes('left') && i < q) || (quoins.includes('right') && i >= Math.round(w) - q);
      if (inQ) return ashlarPixel(seed, locate(seed, i, j, Math.round(w), c.face, { quoins, quoinLong: 12, quoinShort: 8 }));
      // le bord de l'enduit contre la pierre : un liseré d'ombre (l'enduit est un peu en retrait du nu de la pierre)
      const nearL = quoins.includes('left') && i === q, nearR = quoins.includes('right') && i === Math.round(w) - q - 1;
      if (nearL) return '=';
      if (nearR) return '+';
    }
    const n = smooth(seed, s, t, 5) * 0.55 + smooth(seed + 3, s * 2, t, 3) * 0.45;
    let k = n > 0.78 ? '+' : '!';
    // les coulures sous l'égout (le haut du mur) et le pied sali
    if (t > c.h - 9 && hash(seed, i, 3) < 0.18 && t > c.h - 3 - hash(seed, i, 4) * 8) k = '+';
    if (t > c.h - 2 && hash(seed, i >> 1, 5) < 0.5) k = '=';
    if (t < 3 && hash(seed, Math.floor(s / 3), 6) < 0.6 && t < 1 + hash(seed, i, 7) * 2.5) k = t < 1 ? 'E' : 'D';
    else if (t < 4 && hash(seed, i, 8) < 0.25) k = '+';
    return k;
  };
}

// =====================================================================================================================
// Copié de maison-coq:art/proposals/coq-baies.ts : l'encadrement de pierre de taille d'une baie, le vitrail en losanges
// =====================================================================================================================

/** Une baie dans une face : le jour de s0 à s1 (exclu), de t0 à t1 (le haut du jour, sous le linteau). */
export interface StoneBay { s0: number; s1: number; t0: number; t1: number; seed?: number; sill?: boolean }

export function inBay(b: StoneBay, s: number, t: number): boolean {
  return !(s < b.s0 || s >= b.s1 || t < b.t0 || t >= b.t1);
}
/** Largeur d'un piédroit à l'assise `k` : en harpe, 35 et 20 cm. */
const jamb = (k: number, seed: number) => ((k + seed) % 2 === 0 ? 7 : 4);

/** L'encadrement d'une baie (copie de `frame` du coq, sans l'arc) : piédroits harpés, linteau d'un bloc, chanfrein. */
function frame(b: StoneBay, i: number, j: number): string | undefined {
  const seed = b.seed ?? 0;
  const k = Math.floor(j / COURSE), jj = j - k * COURSE;
  if (j >= b.t1 && j < b.t1 + COURSE && i >= b.s0 - 5 && i < b.s1 + 5) {
    if (j === b.t1) return ';';
    if (j === b.t1 + COURSE - 1 || i === b.s0 - 5) return '!';
    if (i === b.s1 + 4) return ';';
    return 'θ';
  }
  if (j < b.t0 || j >= b.t1) return undefined;
  const wl = jamb(k, seed), wr = jamb(k + 1, seed);
  const L = i >= b.s0 - wl && i < b.s0, R = i >= b.s1 && i < b.s1 + wr;
  if (!L && !R) return undefined;
  if (jj === 0) return ';';
  if (L && i === b.s0 - 1) return ';';
  if (R && i === b.s1) return '+';
  if (L && i === b.s0 - wl) return ';';
  if (R && i === b.s1 + wr - 1) return ';';
  if (jj === COURSE - 1 || (R && i === b.s1 + 1)) return '!';
  return 'θ';
}

/** La matière d'une face percée de ses baies encadrées de pierre de taille (copie de `withBays` du coq ; s, t de la face). */
export function withBays(tex: Tex, bays: StoneBay[]): Tex {
  return (s, t, c) => {
    if (c.face !== 'S' && c.face !== 'N') return tex(s, t, c);
    const i = Math.floor(s), j = Math.floor(t);
    for (const b of bays) if (inBay(b, i + 0.5, j + 0.5)) return null;
    for (const b of bays) { const f = frame(b, i, j); if (f) return f; }
    return tex(s, t, c);
  };
}

/** Les losanges plombés d'un jour de `w` × `h` (copie de `leaded` du coq) : plomb, verre, un reflet en biais. */
export function leaded(w: number, h: number, s: number, t: number): string {
  const i = Math.floor(s), j = Math.floor(t);
  if (i === 0 || j === 0 || i === w - 1 || j === h - 1) return '`';
  if ((i + j) % 4 === 0 || (((i - j) % 4) + 4) % 4 === 0) return '`';
  const d = i + (h - 1 - j);
  return d >= 3 && d <= 6 ? '<' : '>';
}

// =====================================================================================================================
// Copié de art/proposals/forge-toits.ts : les tuiles plates et les bardeaux, en signes de la palette
// =====================================================================================================================

/** Les tuiles plates (copie de `tilesTex` de la forge) : rangs de 3 px à l'écran, tuiles de 5 px à joints croisés ; `K` écran / pente. */
export function tiles(K: number, seed = 401): Tex {
  return (s, t) => {
    const d = t * K, r = Math.floor(d / 3), yy = d - r * 3;
    const off = (r % 2) * 3, col = Math.floor((s + off) / 5), xx = Math.floor(s + off) - col * 5;
    const h = hash(seed, r, col);
    if (yy >= 2) return h < 0.12 ? 'π' : 'ξ';
    if (yy < 1 && xx === 0) return 'π';
    if (yy < 1 && xx === 4) return 'ν';
    if (h < 0.12) return 'ν';
    if (h < 0.16) return hash(seed + 2, Math.floor(s), r) < 0.5 ? 'l' : 'ν';
    if (h < 0.34) return yy < 1 ? 'μ' : 'κ';
    return yy >= 1 && xx === 1 && hash(seed + 3, r, col) < 0.5 ? 'κ' : 'μ';
  };
}

/** Les bardeaux de chêne fendu (copie de `shinglesTex` de la forge), au bois patiné : écailles de 2 à 4 px, rangs de 4 px. */
export function shingles(K: number, seed = 411): Tex {
  const edges = (r: number): number[] => {
    const out: number[] = [];
    let a = -Math.floor(hash(seed, r) * 4);
    while (a < 400) { out.push(a); a += 2 + Math.floor(hash(seed + 1, r, a) * 3); }
    return out;
  };
  const cache = new Map<number, number[]>();
  return (s, t) => {
    const d = t * K, r = Math.floor(d / 4), yy = d - r * 4, i = Math.floor(s);
    if (!cache.has(r)) cache.set(r, edges(r));
    const es = cache.get(r)!, k = es.filter((a) => a <= i).length;
    const h = hash(seed + 2, r, k);
    if (yy >= 3) return '&';
    if (es.includes(i)) return yy < 1 ? '&' : '%';
    if (yy < 1) return h < 0.25 ? '*' : '^';
    if (hash(seed + 3, i, r) < 0.25) return '%';
    return h < 0.2 ? '%' : '*';
  };
}

// =====================================================================================================================
// Le fer, le bois, la toile
// =====================================================================================================================

/** Le fer forgé (pentures, grille, anneau) : le dessus et la face au jour éclairés, le reste sombre (les signes du coq). */
export const ironTex: Tex = (_s, t, c) => (c.face === 'top' || c.face === 'W' || (c.face === 'S' && t > c.h - 1) ? '-' : '_');

/** Le bois d'un meuble ou d'une menuiserie (bois patiné) : le dessus clair, la face sud, l'ombre à l'est, le fil. */
export function furnWood(seed: number): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top' || (c.face === 'slope' && c.n[2] > 0.5)) return dash(seed, j, i, 0.35) ? '*' : '^';
    if (c.face === 'E' || c.face === 'edge' || c.face === 'N' || c.face === 'under') return '%';
    if (c.face === 'W') return '^';
    return dash(seed, i, j, 0.3) ? '%' : '*';
  };
}

/** Des planches debout (porte, cloison, battant) : planches de `plank` px, joints, le bas mouillé ; `battens` : les traverses (t). */
export function boards(seed: number, plank = 4, battens: number[] = []): Tex {
  return (s, t, c) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (c.face === 'top' || c.face === 'under') return '^';
    if (c.face === 'E' || c.face === 'W' || c.face === 'edge') return c.face === 'W' ? '*' : '%';
    if (battens.some((b) => j >= b && j < b + 2)) return j === battens.find((b) => j >= b && j < b + 2)! + 1 ? '^' : '%';
    if (i % plank === plank - 1) return '@';
    let k = i % plank === 0 ? '^' : '*';
    if (k === '*' && dash(seed, i, j, 0.5)) k = '%';
    return j < 2 ? (k === '^' ? '*' : '&') : k;
  };
}

/**
 * Le châssis de toile huilée (120 × 80 cm : 24 × 16 px) : un cadre de bois de 5 cm, deux montants et une traverse qui font six
 * carreaux, la toile tendue et clouée ; le jour laiteux : la toile plus claire en haut à gauche (le ciel), le pli d'ombre le long du
 * bois, la trame en tirets. (s, t) depuis le coin bas-gauche du châssis.
 */
export function oiledCloth(w: number, h: number): (s: number, t: number) => string {
  const cols = [0, Math.round(w / 3), Math.round((2 * w) / 3), w - 1], row = Math.round(h / 2);
  return (s, t) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (cols.includes(i) || j === 0 || j === h - 1 || j === row) return j === h - 1 || (cols.includes(i) && i !== w - 1 && j !== 0) ? (j === h - 1 ? '^' : '*') : '%';
    // le pli d'ombre sous la traverse du haut et à droite des montants (la toile en retrait du bois)
    const below = j === h - 2 || j === row - 1, right = cols.some((x) => i === x + 1);
    if (below || right) return 'η';
    const light = j + (w - i) * 0.3 > h * 0.8;
    if (dash(7, j, i, 0.3)) return light ? 'ζ' : 'η';
    return light ? 'ε' : 'ζ';
  };
}
