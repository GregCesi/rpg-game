// ESSAI (chantier « maison du coq », dessins d'intégration, hors jeu, jamais chargé par le jeu) : le pan de mur de pierre de
// taille, une assise de 30 cm de toute longueur (réponses 23, 28 et 29 de Grégoire, CADRAGE-coq.md sections 11 et 12.14).
// Planche : npx tsx tools/essai-coq-integration.ts (.art-preview/coq-integration-mur.png).
//
// Le contrat, celui du solin (src/world/walls.ts) : **les pierres sont des données, dessinées une à une** (`ASHLAR_STONES` : la
// face de chaque pierre dans le mur, 6 rangées, son lit vu sur l'arase), et **du code les pose** (`ashlarCourse`). À l'intégration,
// les grilles de `ASHLAR_STONES` s'écrivent dans src/generated/ comme `wallStones.ts`, le tirage `ASHLAR_COURSE` va dans walls.json
// (`ashlar`), et `ashlarCourse` rejoint world/walls.ts sous `kind: 'ashlar'` (le dessin d'un tronçon, `wallRuns` inchangé).
//
// Les joints se décalent d'une assise à l'autre **par la parité de l'assise** (k = z / 30 cm) : deux tirages périodiques (7,20 m),
// l'un pour les assises paires, l'autre pour les impaires, ancrés au monde (x absolu), dont tous les joints sont à 15 cm au moins
// les uns des autres (cherché par le dessinateur, vérifié par `checkStagger`). Un pan ne dépend donc ni de ses voisins ni de
// l'endroit où il commence : deux pans posés bout à bout, ou l'un sur l'autre, s'accordent toujours. Aux bouts : la chaîne d'angle
// (pierre d'angle, 60 et 40 cm de face selon la parité), la tête de mur (la même), le tableau d'une baie (pierre de tableau, 40 et
// 60), ou contre une pièce de forme (linteau, appui) ; entre le bout et le premier joint du tirage, une pierre recoupée (un carreau
// coupé à la longueur, de 30 à 90 cm), écartée elle aussi des joints des assises voisines.
//
// Les matières reprennent au pixel près le parement validé (`ashlarWall` de coq-pierre.ts) : joint de chaux mince `;`, blocs
// θ = λ (30 %, 55 %, 15 %), ciselure (l'arête du haut et de gauche un cran plus claire), layage (une colonne sur trois, debout ou
// en biais selon le bloc), pierres d'angle et de tableau plus claires (+).

import type { Grid } from '../lib/canvas';
import { dash, hash } from '../lib/volumes';
import { COQ_PAL, limePlaster } from './coq-pierre';

export const PAL = COQ_PAL;

// =====================================================================================================================
// Le tirage (à l'intégration : walls.json, `ashlar`)
// =====================================================================================================================

/**
 * Le tirage des assises, en px du jeu (5 cm) : la hauteur d'une assise, la période des deux tirages, l'écart minimal entre deux
 * joints d'assises voisines, les longueurs permises d'une pierre recoupée, et la largeur de face des pierres de bout par parité
 * ([paire, impaire]). Dans `seq`, 8 est la boutisse (40 cm de face), 10, 14, 18 les carreaux de 50, 70, 90.
 */
export const ASHLAR_COURSE = {
  course: 6,
  period: 144,
  stagger: 3,
  closer: { min: 6, max: 18 },
  even: { offset: 0, seq: [8, 10, 14, 8, 10, 14, 8, 10, 18, 8, 18, 8, 10] },
  odd: { offset: 5, seq: [8, 14, 8, 18, 8, 18, 8, 18, 8, 18, 8, 10] },
  ends: { corner: [12, 8], head: [12, 8], jamb: [8, 12], abut: [0, 0], lintel: [0, 0] } as Record<End, [number, number]>,
  /** Contre un linteau (qui porte de 20 cm sur ses tableaux) : les bords des pierres de tableau de l'assise du dessous, à fuir. */
  lintel: [4, 8],
};

/** Un bout de pan : chaîne d'angle, tête de mur, tableau d'une baie, ou contre une pièce de forme. */
export type End = 'corner' | 'head' | 'jamb' | 'abut' | 'lintel';
const open = (e: End) => e === 'abut' || e === 'lintel';
export type StoneKind = 'block-50' | 'block-70' | 'block-90' | 'header' | 'closer' | 'quoin' | 'jamb';

/** Les clés du catalogue (coq-catalogue-data.ts) de chaque sorte de pierre posée. */
export const STONE_KEY: Record<StoneKind, string> = {
  'block-50': 'ashlar-block-50', 'block-70': 'ashlar-block-70', 'block-90': 'ashlar-block-90', header: 'ashlar-header',
  closer: 'ashlar-block-90 (recoupé)', quoin: 'ashlar-quoin', jamb: 'ashlar-jamb',
};
const BY_LEN: Record<number, StoneKind> = { 8: 'header', 10: 'block-50', 14: 'block-70', 18: 'block-90' };

const P = ASHLAR_COURSE.period;
const pat = (parity: number) => (parity % 2 ? ASHLAR_COURSE.odd : ASHLAR_COURSE.even);

/** Les joints du tirage d'une parité entre a et b (inclus), avec la longueur de la pierre qui commence à chacun. */
function patternJoints(parity: number, a: number, b: number): { x: number; len: number }[] {
  const { offset, seq } = pat(parity), out: { x: number; len: number }[] = [];
  for (let n = Math.floor((a - offset) / P) - 1; n * P + offset <= b; n++) {
    let x = n * P + offset;
    for (const len of seq) { if (x >= a && x <= b) out.push({ x, len }); x += len; }
  }
  return out;
}

/** Tous les joints de deux assises voisines sont-ils à `stagger` au moins (le tirage seul) ? */
export function checkStagger(): number {
  const a = patternJoints(0, 0, P).map((j) => j.x), b = patternJoints(1, 0, P).map((j) => j.x);
  let m = Infinity;
  for (const x of a) for (const y of b) { const d = Math.abs(x - y) % P; m = Math.min(m, d, P - d); }
  return m;
}

// =====================================================================================================================
// La pose d'une assise (à l'intégration : world/walls.ts)
// =====================================================================================================================

/** Une pierre posée : son x (px du monde, le joint de gauche compris), sa largeur de face, sa sorte. */
export interface Laid { x: number; w: number; kind: StoneKind }
/** Une assise : de x0 à x1 (px du monde), la parité de son assise, ses deux bouts. */
export interface CourseSpec {
  x0: number; x1: number; k: number; start: End; end: End;
  /**
   * Les joints des assises voisines à fuir, quand le pan est posé dans un mur (`layWall`) : les joints de l'assise du dessous, les
   * bords des pierres de bout des deux voisines. Absent : le pan seul, qui ne fuit que les joints de l'autre parité au même endroit.
   */
  avoid?: number[];
}

const near = (x: number, list: number[], d: number) => list.some((y) => Math.abs(x - y) < d);

/** Les joints d'une assise (sans ses deux bords), et ses pierres. `avoid` : les joints de la parité voisine à fuir. */
function joints(spec: CourseSpec, avoid: number[]): number[] {
  const { x0, x1, k } = spec, par = k % 2, E = ASHLAR_COURSE.ends, { min, max } = ASHLAR_COURSE.closer, st = ASHLAR_COURSE.stagger;
  const a = x0 + E[spec.start][par], b = x1 - E[spec.end][par];
  const out: number[] = [];
  avoid = avoid.concat(spec.start === 'lintel' ? ASHLAR_COURSE.lintel.map((d) => x0 + d) : [], spec.end === 'lintel' ? ASHLAR_COURSE.lintel.map((d) => x1 - d) : []);
  if (!open(spec.start)) out.push(a);
  const inner = patternJoints(par, a + 1, b - 1).map((j) => j.x).filter((x) => x - a >= min && b - x >= min && !near(x, avoid, st));
  // les écarts trop grands (un joint du tirage écarté) : un joint de plus, écarté de tout, les deux pierres de 30 à 90 cm
  const all = [a, ...inner, b];
  const others = patternJoints(1 - par, a - 40, b + 40).map((j) => j.x).concat(avoid);
  for (let i = 0; i + 1 < all.length; i++) {
    out.push(...(i ? [all[i]] : []));
    let g0 = all[i];
    const g1 = all[i + 1];
    while (g1 - g0 > max) {
      let pick = -1;
      for (let L = 14; L >= min && pick < 0; L--) for (const s of [L, max - (14 - L)]) {
        const x = g0 + s;
        if (s >= min && s <= max && g1 - x >= min && !near(x, others, st)) { pick = x; break; }
      }
      if (pick < 0) pick = g0 + Math.min(max, Math.max(min, Math.floor((g1 - g0) / 2)));
      out.push(pick);
      g0 = pick;
    }
  }
  if (!open(spec.end)) out.push(b);
  return out;
}

/**
 * Les pierres d'une assise. Les joints de l'assise de l'autre parité au même endroit (ses bouts, ses pierres recoupées) sont
 * calculés d'abord, toujours de la paire vers l'impaire : le résultat ne dépend que de la parité, jamais de l'ordre de pose.
 */
export function layCourse(spec: CourseSpec): Laid[] {
  const par = spec.k % 2, E = ASHLAR_COURSE.ends;
  const edges = (p: number) => [spec.x0 + E[spec.start][p], spec.x1 - E[spec.end][p]].filter((_x, i) => !open(i ? spec.end : spec.start));
  let avoid = edges(1 - par);
  if (spec.avoid) avoid = spec.avoid;
  else if (par === 1) avoid = avoid.concat(joints({ ...spec, k: 0 }, edges(1)));
  const J = joints(spec, avoid);
  const xs = [spec.x0, ...J.filter((x) => x > spec.x0 && x < spec.x1), spec.x1];
  const pj = new Map(patternJoints(par, spec.x0 - 20, spec.x1 + 20).map((j) => [j.x, j.len]));
  const out: Laid[] = [];
  for (let i = 0; i + 1 < xs.length; i++) {
    const x = xs[i], w = xs[i + 1] - x;
    let kind: StoneKind = pj.get(x) === w && BY_LEN[w] ? BY_LEN[w] : w === 18 || w === 14 || w === 10 ? BY_LEN[w] : 'closer';
    if (i === 0 && !open(spec.start)) kind = spec.start === 'jamb' ? 'jamb' : 'quoin';
    if (i === xs.length - 2 && !open(spec.end)) kind = spec.end === 'jamb' ? 'jamb' : 'quoin';
    out.push({ x, w, kind });
  }
  return out;
}

/** Les bords fixes d'une assise (les joints que rien ne déplace) : le bord intérieur de ses pierres de bout, ses bouts ouverts. */
function fixedEdges(runs: CourseSpec[]): number[] {
  const E = ASHLAR_COURSE.ends;
  return runs.flatMap((r) => {
    const p = r.k % 2;
    return [open(r.start) ? r.x0 : r.x0 + E[r.start][p], open(r.end) ? r.x1 : r.x1 - E[r.end][p]];
  });
}

/** Les joints posés d'une assise (le bord gauche de chaque pierre, sauf aux bouts finis), pour l'assise du dessus. */
export const courseJointsOf = (runs: CourseSpec[]): number[] =>
  runs.flatMap((r) => layCourse(r).map((s, i) => (i === 0 && !open(r.start) ? -1e9 : s.x)).filter((x) => x > -1e9).concat(open(r.end) ? [r.x1] : []));

/**
 * Un mur entier, assise par assise du bas vers le haut (à l'intégration : le dessin d'un tronçon, qui voit les pans posés
 * dessous et dessus) : chaque assise fuit les joints posés de celle du dessous et les bords fixes de ses deux voisines (une baie, un
 * linteau changent les bouts d'une assise à l'autre). Rend les assises avec leur liste `avoid` remplie.
 */
export function layWall(courses: CourseSpec[][]): CourseSpec[][] {
  const out: CourseSpec[][] = [];
  courses.forEach((runs, k) => {
    const near = [...(k > 0 ? courseJointsOf(out[k - 1]) : []), ...(k > 0 ? fixedEdges(courses[k - 1]) : []), ...(k + 1 < courses.length ? fixedEdges(courses[k + 1]) : [])];
    out.push(runs.map((r) => ({ ...r, avoid: near })));
  });
  return out;
}

// =====================================================================================================================
// Les pierres, dessinées une à une (à l'intégration : src/generated, comme wallStones.ts)
// =====================================================================================================================

const LIGHTER: Record<string, string> = { '+': '!', 'θ': '+', '=': 'θ', 'λ': '=' };
const DARKER: Record<string, string> = { '+': 'θ', 'θ': '=', '=': 'λ', 'λ': ';' };
/** Les trois tons d'un bloc de parement (le calcaire d'une même carrière), comme `ashlarWall` : 30 %, 55 %, 15 %. */
export const TONES = ['θ', '=', 'λ'] as const;
const toneOf = (r: number) => (r < 0.3 ? 'θ' : r < 0.85 ? '=' : 'λ');

/**
 * La face d'une pierre dans le mur, `w` × 6 (la rangée du bas : le lit de chaux ; la colonne de gauche : le joint montant) :
 * la ciselure en haut et à gauche, le layage. `base` : son ton ; `slant` : le layage en biais ; `chamfer` : le bord d'une pierre
 * de tableau tourné vers le jour (`west` : le jour à l'ouest, au soleil ; `east` : le jour à l'est, à l'ombre).
 */
export function stoneFace(w: number, base: string, slant: boolean, seed: number, chamfer?: 'west' | 'east'): Grid {
  const rows: string[] = [];
  for (let r = 0; r < 6; r++) {
    let row = '';
    for (let i = 0; i < w; i++) {
      if (r === 5) { row += ';'; continue; }
      if (chamfer === 'west' && i === 0) { row += '+'; continue; }
      if (chamfer === 'east' && i === w - 1) { row += ';'; continue; }
      if (i === 0) { row += ';'; continue; }
      const bx = i - 1, by = 4 - r;
      if (r === 0 || bx === 0) { row += LIGHTER[base]; continue; }
      const lane = slant ? bx + by : bx;
      row += lane % 3 === 1 && dash(seed, lane, by, 0.8) ? DARKER[base] : base;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Le lit d'une pierre vu sur l'arase (le dessus du mur, raccourci de moitié : 20 cm de lit = 2 rangées), `w` × `rows` : le joint
 * de chaux (=) à gauche, la pierre au soleil, sa dernière rangée (l'arête sud) plus claire.
 */
export function stoneBed(w: number, rows: number, tone: string): Grid {
  return Array.from({ length: rows }, (_, r) => [...Array(w)].map((_, i) => (i === 0 ? '=' : r === rows - 1 ? LIGHTER[tone] : tone)).join(''));
}

/** Les pierres d'une assise, chacune seule (pour la planche) : sa sorte, sa largeur, ses tons, sa face, son lit. */
export interface StoneDrawing { kind: StoneKind; label: string; w: number; faces: Grid[]; bed: Grid }
export const ASHLAR_STONES: StoneDrawing[] = [
  ...([10, 14, 18] as const).map((w) => ({
    kind: BY_LEN[w], label: `carreau de ${w * 5}`, w,
    faces: TONES.map((t, n) => stoneFace(w, t, n === 1, 300 + w + n)), bed: stoneBed(w, 2, '+'),
  })),
  { kind: 'header', label: 'boutisse de 40', w: 8, faces: TONES.map((t, n) => stoneFace(8, t, n === 2, 340 + n)), bed: stoneBed(8, 6, '+') },
  { kind: 'quoin', label: "pierre d'angle (60 et 40)", w: 12, faces: [stoneFace(12, '+', false, 361), stoneFace(8, '+', true, 362)], bed: stoneBed(12, 4, '+') },
  { kind: 'jamb', label: 'pierre de tableau (40 et 60)', w: 8, faces: [stoneFace(8, '+', false, 371, 'east'), stoneFace(12, '+', true, 372, 'west')], bed: stoneBed(8, 6, '+') },
  { kind: 'closer', label: 'pierre recoupee (30 a 90)', w: 7, faces: [stoneFace(7, '=', false, 381), stoneFace(16, 'θ', true, 382)], bed: stoneBed(7, 2, '+') },
];

// =====================================================================================================================
// Les images d'un pan
// =====================================================================================================================

/** Une toile de signes. */
export class Paint {
  readonly c: string[][];
  constructor(readonly w: number, readonly h: number) { this.c = Array.from({ length: h }, () => Array(w).fill('.')); }
  put(g: Grid, x: number, y: number): void {
    g.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && this.c[y + j]?.[x + i] !== undefined) this.c[y + j][x + i] = ch; }));
  }
  set(x: number, y: number, ch: string): void { if (this.c[y]?.[x] !== undefined) this.c[y][x] = ch; }
  grid(): Grid { return this.c.map((r) => r.join('')); }
}

/** Le contour d'un pixel (STYLE.md section 3) : OUTLINE en bas et à droite, la teinte la plus sombre du calcaire en haut et à gauche. */
export function outline(g: Grid, dark = '~'): Grid {
  const H = g.length, W = g[0].length, at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? '.' : g[y][x]);
  return g.map((row, y) => [...row].map((ch, x) => {
    if (ch === '.' || ch === 'x') return ch;
    if (at(x + 1, y) === '.' || at(x, y + 1) === '.') return 'o';
    if (at(x - 1, y) === '.' || at(x, y - 1) === '.') return dark;
    return ch;
  }).join(''));
}

/** L'ombre portée d'une rangée sous la silhouette, décalée d'un pixel vers l'est (comme `withGroundShadow`). */
export function shadowed(g: Grid): Grid {
  const rows = g.map((r) => r + '.'), last = rows[rows.length - 1];
  return [...rows, [...('.' + last.slice(0, -1))].map((c) => (c === '.' ? '.' : 'x')).join('')];
}

/** Le ton et le biais d'une pierre posée, tirés de sa place dans le monde (le même mur à chaque chargement). */
const look = (s: Laid, k: number, side: number) => ({ base: s.kind === 'quoin' || s.kind === 'jamb' ? '+' : toneOf(hash(s.x, k, 7 + side)), slant: hash(s.x, k, 3 + side) < 0.5, seed: Math.floor(hash(s.x, k, 11 + side) * 1000) });

/** La face d'une assise, vue du sud (R0) ou du nord (`inner` : la face du dedans, R2, nue ou enduite). */
export function courseFace(spec: CourseSpec, side: 'out' | 'in' = 'out', lime = false): Grid {
  const L = spec.x1 - spec.x0, p = new Paint(L, 6), stones = layCourse(spec);
  if (side === 'in' && lime) {
    const tex = limePlaster(17);
    for (let r = 0; r < 6; r++) for (let i = 0; i < L; i++) {
      const X = spec.x1 - 1 - i; // vu du nord : l'est à gauche
      p.set(i, r, tex(X, spec.k * 6 + 5 - r, { w: 999, h: 999, p: [0, 0, 0], n: [0, -1, 0], X: 0, Y: 0, face: 'N' }) ?? '!');
    }
    return p.grid();
  }
  for (const s of stones) {
    const lk = look(s, spec.k, side === 'in' ? 1 : 0);
    const first = s.x === spec.x0, last = s.x + s.w === spec.x1;
    let chamfer: 'west' | 'east' | undefined;
    if (s.kind === 'jamb') chamfer = first && spec.start === 'jamb' ? 'west' : last && spec.end === 'jamb' ? 'east' : undefined;
    const base = side === 'in' && (s.kind === 'quoin' || s.kind === 'jamb') ? toneOf(hash(s.x, spec.k, 8)) : lk.base;
    const g = stoneFace(s.w, base, lk.slant, lk.seed, side === 'in' ? undefined : chamfer);
    const x = side === 'in' ? spec.x1 - (s.x + s.w) : s.x - spec.x0;
    p.put(g, x, 0);
  }
  return p.grid();
}

/** La fourrure de l'arase : des moellons et le mortier de chaux, en taches de 2 px. */
const fourrure = (X: number, Y: number) => { const r = hash(211, X >> 1, Y >> 1); return r < 0.3 ? ';' : r < 0.7 ? '=' : 'λ'; };

/**
 * L'arase d'une assise (son dessus), en rangées du nord au sud : `rows` rangées pour l'épaisseur du mur (6 : 60 cm raccourcis de
 * moitié ; 12 : à l'échelle du sol, le plan), les deux parements de 20 cm, la fourrure entre eux, les boutisses et les pierres de
 * bout qui traversent. `thick` : 60 (le mur) ou 40 (le refend, sans fourrure). Vu du sud (le nord en haut).
 */
export function courseTop(spec: CourseSpec, rows = 6, thick = 60): Grid {
  const L = spec.x1 - spec.x0, p = new Paint(L, rows), stones = layCourse(spec), par = spec.k % 2;
  const face = Math.round((20 / thick) * rows); // un parement de 20 cm
  for (let y = 0; y < rows; y++) for (let i = 0; i < L; i++) p.set(i, y, fourrure(spec.x0 + i, spec.k * 7 + y));
  for (const s of stones) {
    const x = s.x - spec.x0, through = s.kind === 'header' || (s.kind === 'jamb' && (s.w === 8) === (par === 0)) || (s.kind === 'quoin' && par === 1);
    const deep = s.kind === 'quoin' && par === 0 ? Math.round((40 / thick) * rows) : s.kind === 'jamb' && !through ? Math.round((40 / thick) * rows) : face;
    const tone = s.kind === 'quoin' || s.kind === 'jamb' ? '+' : hash(s.x, spec.k, 5) < 0.3 ? 'θ' : '+';
    if (through) { p.put(stoneBed(s.w, rows, tone), x, 0); continue; }
    p.put(stoneBed(s.w, deep, tone), x, rows - deep); // le parement du dehors, au sud
    p.put(stoneBed(s.w, face, hash(s.x, spec.k, 6) < 0.3 ? 'θ' : '+').map((r) => r.replace(/!/g, '+')), x, 0); // celui du dedans
  }
  // l'arête sud au soleil, l'arête nord dans la teinte du lit
  for (let i = 0; i < L; i++) if (p.c[rows - 1][i] !== '=') p.set(i, rows - 1, '!');
  return p.grid();
}

/** L'image d'un pan est-ouest (R0) : son arase (6 rangées) au-dessus de sa face (6), sans contour (le contour se pose sur le mur). */
export function courseImage(spec: CourseSpec, thick = 60): Grid {
  return [...courseTop(spec, (thick / 60) * 6, thick), ...courseFace(spec)];
}

/**
 * La vue R2 d'un pan (vu du nord : la face du dedans, `lime` enduite de chaux) : l'arase retournée (le sud en haut, l'est à
 * gauche) au-dessus de la face du dedans.
 */
export function courseInner(spec: CourseSpec, lime: boolean, thick = 60): Grid {
  const top = courseTop(spec, (thick / 60) * 6, thick).map((r) => [...r].reverse().join('')).reverse();
  return [...top, ...courseFace(spec, 'in', lime)];
}

/**
 * La vue nord-sud d'un pan (R1, la règle D : l'image est-ouest tournée, 12 px de large pour `length` de long) : l'arase à
 * l'échelle du sol sur toute la longueur, le parement ouest à gauche ; au sud, si le pan finit en tête de mur, son bout (6 rangées).
 * `y0` : sa place nord-sud dans le monde (px), qui ancre les joints comme x pour l'est-ouest.
 */
export function courseNS(spec: CourseSpec, thick = 60): Grid {
  const W = (thick / 60) * 12, L = spec.x1 - spec.x0, head = spec.end === 'head' ? 6 : 0;
  const plan = courseTop({ ...spec, end: head ? 'abut' : spec.end, x1: spec.x1 - head }, W, thick); // W rangées : nord en haut = ouest à gauche après rotation
  // tourner d'un quart de tour : la rangée y du plan (nord → sud de l'épaisseur) devient la colonne x (ouest → est) ; le long du pan
  // (ouest → est) devient le haut → bas (nord → sud)
  const rows: string[] = [];
  for (let i = 0; i < L - head; i++) {
    let row = '';
    for (let y = 0; y < W; y++) {
      let ch = plan[y][i];
      if (ch === '=' && plan[y][i - 1] !== '=' && i > 0) ch = '='; // le joint reste un joint
      row += y === 0 && ch !== '=' ? '!' : ch === '!' ? '+' : ch;
    }
    rows.push(row);
  }
  if (head) {
    // le bout du mur : la pierre d'angle vue par son bout (60 cm de large, 30 de haut)
    const end = stoneFace(W, '+', spec.k % 2 === 1, 390 + spec.k);
    rows.push(...end);
  }
  return rows;
}

// =====================================================================================================================
// La masse d'un pan, ce qu'il consomme
// =====================================================================================================================

/** Ce qu'un pan consomme : ses pierres par sorte (les deux parements ; une boutisse compte une fois), la fourrure, sa masse. */
export function consumption(spec: CourseSpec, thick = 60): { stones: Record<string, number>; rubbleKg: number; kg: number } {
  const stones: Record<string, number> = {};
  const lay = layCourse(spec);
  let blockVol = 0, through = 0;
  for (const s of lay) {
    const key = STONE_KEY[s.kind];
    const n = s.kind === 'header' || s.kind === 'quoin' || s.kind === 'jamb' ? 1 : 2; // un carreau dehors, un dedans
    stones[key] = (stones[key] ?? 0) + n;
    const w = s.w * 0.05, h = 0.3;
    if (s.kind === 'header') { blockVol += w * (thick / 100) * h; through += w; } else if (s.kind === 'quoin') blockVol += w * 0.6 * h; else if (s.kind === 'jamb') blockVol += w * 0.6 * h; else blockVol += 2 * w * 0.2 * h;
  }
  const L = (spec.x1 - spec.x0) * 0.05;
  const fillVol = thick === 60 ? Math.max(0, (L - through) * 0.2 * 0.3) : 0;
  const rubbleKg = fillVol * 2400 * 0.85;
  return { stones, rubbleKg, kg: blockVol * 2400 + rubbleKg };
}
