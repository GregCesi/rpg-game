// Le mur de pierre de taille, le cordon et le dallage de la maison du coq, dessinés par le jeu (chantier « maison du coq » ; CONCEPTION
// « La maison du coq ») : du code pur (ni Phaser, ni art/), le même que celui du dessinateur (art/world/coq-wall.ts, coq-floor.ts : les
// planches et les images du catalogue), recopié ici parce que le jeu ne lit jamais art/ ; tools/test-murs-coq.ts vérifie, pixel pour
// pixel, que les deux dessinent la même chose. Les pierres, les tons, l'enduit et la palette viennent de src/generated/ashlarStones.ts
// (écrit par build-art).
//
// Un pan d'assise (`wall: "coursed"`, 30 cm), un pan de cordon (`string`, 20 cm), un pan de dallage (`flagstone`, 8 cm) : chacun de
// toute longueur ; leurs joints sont ancrés au monde (la place x du pan, en px) et décalés par la parité de l'assise ou de la rangée.

import { ashlarDarker as DARKER, ashlarLighter as LIGHTER, ashlarPlaster } from '../generated/ashlarStones';
import { CM_PER_PX } from '../content/gabarit';
import type { Grid } from './gridCanvas';
import type { WallRun } from './wallRuns';
import type { RunEnd } from './walls';

/** Le hachage du dessinateur (art/lib/volumes.ts), à l'identique : le même tirage, le même mur. */
export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const v of n) {
    h = Math.imul(h ^ ((v | 0) + 0x9e3779b9), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

/** Les tirets du dessinateur (art/lib/volumes.ts), à l'identique. */
export function dash(seed: number, lane: number, pos: number, rate = 0.7): boolean {
  const per = 7 + Math.floor(hash(seed, lane, 1) * 7), l = 2 + Math.floor(hash(seed, lane, 2) * 3), ph = Math.floor(hash(seed, lane, 3) * per);
  return hash(seed, lane, 4) < rate && (((pos + ph) % per) + per) % per < l;
}

/** L'enduit de chaux du dedans (réponse 31), lu dans sa tuile (src/generated/ashlarStones.ts) : X la place est-ouest, Y la hauteur (px). */
const plaster = (X: number, Y: number): string => {
  const t = ashlarPlaster;
  const row = t[((Y % t.length) + t.length) % t.length];
  return row[((X % row.length) + row.length) % row.length];
};

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
/**
 * Un pan trop court pour ses deux pierres de bout (un trumeau de 40 cm entre deux baies) : ses bouts deviennent ouverts, et il se
 * pose de pierres recoupées (le jeu seulement : le dessinateur ne dessine pas de pan si court).
 */
export function fitEnds(spec: CourseSpec): CourseSpec {
  const E = ASHLAR_COURSE.ends;
  const need = Math.max(...[0, 1].map((p) => E[spec.start][p] + E[spec.end][p])) + ASHLAR_COURSE.closer.min;
  return spec.x1 - spec.x0 >= need ? spec : { ...spec, start: open(spec.start) ? spec.start : 'abut', end: open(spec.end) ? spec.end : 'abut' };
}

export function layCourse(given: CourseSpec): Laid[] {
  const spec = fitEnds(given);
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
    for (let r = 0; r < 6; r++) for (let i = 0; i < L; i++) {
      const X = spec.x1 - 1 - i; // vu du nord : l'est à gauche
      p.set(i, r, plaster(X, spec.k * 6 + 5 - r));
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
 * `y0` : sa place nord-sud dans le monde (px), qui ancre les joints comme x pour l'est-ouest. `r3` : la vue R3 (le pan tourné dans
 * l'autre sens : son bout ouest au sud, son arase lue à l'envers), la même lumière (le jour sur la colonne ouest).
 */
export function courseNS(spec: CourseSpec, thick = 60, r3 = false): Grid {
  // la règle D : la largeur nord-sud est la hauteur de l'est-ouest (l'arase raccourcie et la face) : 12 px pour le mur, 10 pour le refend
  const W = (thick / 60) * 6 + 6, L = spec.x1 - spec.x0, head = (r3 ? spec.start : spec.end) === 'head' ? 6 : 0;
  const cut: CourseSpec = r3 ? { ...spec, start: head ? 'abut' : spec.start, x0: spec.x0 + head } : { ...spec, end: head ? 'abut' : spec.end, x1: spec.x1 - head };
  const top = courseTop(cut, W, thick); // W rangées : nord en haut = ouest à gauche après rotation
  // R3 : l'arase tournée d'un demi-tour avant d'être couchée (le bout est du pan au nord, le parement du dedans à l'est)
  const plan = r3 ? top.map((r) => [...r].reverse().join('')).reverse() : top;
  // tourner d'un quart de tour : la rangée y du plan (nord → sud de l'épaisseur) devient la colonne x (ouest → est) ; le long du pan
  // (ouest → est) devient le haut → bas (nord → sud)
  const rows: string[] = [];
  for (let i = 0; i < L - head; i++) {
    let row = '';
    for (let y = 0; y < W; y++) {
      const ch = plan[y][i];
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
// Le pan de cordon (une assise de 20 cm : la moulure du niveau de l'étage)
// =====================================================================================================================

/**
 * La pierre de cordon dans le pan (`ashlar-string-course`, 60 cm : 12 px) : sa face de 4 rangées, la moulure validée (`stringCourse`
 * de coq-materials.ts : l'arête au soleil, le listel, la gorge à l'ombre, le bas de la gorge), le joint montant à gauche (la gorge
 * le garde sombre) ; son lit vu sur l'arase (30 cm de profondeur, 20 sur le mur et 10 de débord : 3 rangées raccourcies), le joint
 * de chaux à gauche, l'arête sud au soleil.
 */
export const STRING_COURSE = { len: 12, face: 4 };
export function stringFace(w = STRING_COURSE.len): Grid {
  const rows = ['!', '+', '~', ';'];
  return rows.map((c, r) => [...Array(w)].map((_, i) => (i === 0 && r > 0 ? (r >= 2 ? '~' : ';') : c)).join(''));
}
export const stringBed = (w = STRING_COURSE.len, rows = 3): Grid => stoneBed(w, rows, '+');

/** Les pierres de cordon d'un pan de x0 à x1 (px du monde) : une pierre de 12 px, les joints ancrés au monde, recoupée aux bouts. */
function stringStones(x0: number, x1: number): { x: number; w: number }[] {
  const L = STRING_COURSE.len, xs = [x0];
  for (let x = Math.ceil((x0 + 1) / L) * L; x < x1; x += L) if (x - x0 >= 4 && x1 - x >= 4) xs.push(x);
  xs.push(x1);
  return xs.slice(0, -1).map((x, i) => ({ x, w: xs[i + 1] - x }));
}

/**
 * L'arase d'un pan de cordon, du nord au sud (`rows` rangées pour l'épaisseur : 6 pour 60 cm, 4 pour 40, raccourcies de moitié) :
 * derrière, le lit du parement du dedans (des carreaux de 20 cm de haut, joints décalés d'une demi-pierre), devant le lit des pierres
 * de cordon (la moitié sud).
 */
export function stringTop(x0: number, x1: number, rows: number): Grid {
  const p = new Paint(x1 - x0, rows), back = Math.floor(rows / 2), front = rows - back;
  for (const s of stringStones(x0 - 6, x1 + 6)) {
    const a = Math.max(s.x + 6, x0), b = Math.min(s.x + 6 + s.w, x1);
    if (b > a) p.put(stoneBed(b - a, back, hash(s.x, 5) < 0.3 ? 'θ' : '+').map((r) => r.replace(/!/g, '+')), a - x0, 0);
  }
  for (const s of stringStones(x0, x1)) p.put(stringBed(s.w, front), s.x - x0, back);
  return p.grid();
}

/** La face d'un pan de cordon, vue du sud (les pierres de cordon) ou du nord (`inner` : l'enduit, comme le mur ; Y 54 à 57, le niveau de l'étage). */
export function stringFaceRow(x0: number, x1: number, inner = false): Grid {
  const L = x1 - x0, p = new Paint(L, 4);
  if (inner) {
    for (let r = 0; r < 4; r++) for (let i = 0; i < L; i++) p.set(i, r, plaster(x1 - 1 - i, 57 - r));
    return p.grid();
  }
  for (const s of stringStones(x0, x1)) p.put(stringFace(s.w), s.x - x0, 0);
  return p.grid();
}

/**
 * Les vues d'un pan de cordon de x0 à x1, d'épaisseur `thick` (couché, quatre vues, comme le pan d'assise) : r0 l'arase sur la face
 * des pierres de cordon ; r2 l'arase retournée sur l'enduit du dedans ; r1, r3 nord-sud par la règle D (la largeur est la hauteur de
 * l'est-ouest : 10 px, 8 pour 40 cm), l'arase à l'échelle du sol, le bout du cordon (sa moulure, 4 rangées) au sud.
 */
export function stringView(x0: number, x1: number, thick: number, v: number): Grid {
  const rows = (thick / 60) * 6, top = stringTop(x0, x1, rows);
  if (v === 0) return [...top, ...stringFaceRow(x0, x1)];
  if (v === 2) return [...top.map((r) => [...r].reverse().join('')).reverse(), ...stringFaceRow(x0, x1, true)];
  const W = rows + 4, L = x1 - x0, plan = stringTop(x0, x1 - 4, W);
  // r1 : le dehors (le cordon) à l'ouest ; r3 : à l'est ; la lumière sur la colonne ouest
  const out: string[] = [];
  for (let i = 0; i < L - 4; i++) {
    let row = '';
    for (let c = 0; c < W; c++) {
      const y = v === 1 ? W - 1 - c : c, ch = plan[y][v === 1 ? i : L - 5 - i];
      row += c === 0 && ch !== '=' ? '!' : ch === '!' ? '+' : ch;
    }
    out.push(row);
  }
  return [...out, ...stringFace(W).map((r) => (v === 1 ? r : [...r].reverse().join('')))];
}

// =====================================================================================================================
/** Une dalle : 60 cm (12 px) le long de la rangée, 40 (8 px) de profondeur, 8 cm d'épaisseur (le chant : 2 rangées). */
export const FLAG = { len: 12, depth: 8, edge: 2, min: 4 };

const darker: Record<string, string> = { '+': 'θ', 'θ': '=', '=': 'λ' };

/**
 * Le dessus d'une dalle (`w` × 8) : le joint de chaux au nord et à l'ouest (;), son ton, une veine du calcaire en tirets, l'usure
 * (une plage plus claire au milieu, là où l'on marche) ; pas d'arête au soleil : les dalles sont à fleur, le chant ne se voit qu'au bout.
 */
export function flagTop(w: number, tone: string, seed: number, d = FLAG.depth): Grid {
  return Array.from({ length: d }, (_, j) => [...Array(w)].map((_, i) => {
    if (i === 0 || j === 0) return ';';
    if (dash(seed, j, i, 0.22)) return darker[tone];
    if (tone !== '+' && i > 2 && i < w - 2 && j > 2 && j < d - 2 && hash(seed, i >> 1, j >> 1) < 0.25) return '+';
    return tone;
  }).join(''));
}
/** Le chant d'une dalle (`w` × 2) : le haut au jour, le bas à l'ombre, le joint. */
export const flagEdge = (w: number): Grid => [[...Array(w)].map((_, i) => (i === 0 ? ';' : '=')).join(''), [...Array(w)].map(() => ';').join('')];

/** Les dalles dessinées une à une (à l'intégration : src/generated) : trois tons, et leur chant. */

/** Les dalles d'une rangée de x0 à x1 (px du monde), de parité `row % 2` : leurs x et largeurs. */
export function layFlags(x0: number, x1: number, row: number): { x: number; w: number }[] {
  const off = row % 2 ? FLAG.len / 2 : 0, js: number[] = [];
  for (let x = Math.ceil((x0 - off) / FLAG.len) * FLAG.len + off; x < x1; x += FLAG.len) if (x > x0) js.push(x);
  let xs = [x0, ...js, x1];
  // une recoupe de moins de 20 cm : les deux dernières dalles se partagent la place
  const fix = (a: number, b: number, c: number) => (b - a < FLAG.min || c - b < FLAG.min ? Math.round((a + c) / 2) : b);
  if (xs.length > 3) xs[1] = fix(xs[0], xs[1], xs[2]);
  if (xs.length > 3) xs[xs.length - 2] = fix(xs[xs.length - 3], xs[xs.length - 2], xs[xs.length - 1]);
  xs = xs.filter((x, i) => i === 0 || x > xs[i - 1]);
  return xs.slice(0, -1).map((x, i) => ({ x, w: xs[i + 1] - x }));
}

/** L'image d'un pan est-ouest (R0) : le dessus des dalles (8 rangées) et le chant (2), L × 10. */
export function flagRow(x0: number, x1: number, row: number): Grid {
  const p = new Paint(x1 - x0, FLAG.depth + FLAG.edge);
  for (const f of layFlags(x0, x1, row)) {
    const r = hash(f.x, row, 41), tone = r < 0.35 ? '+' : r < 0.8 ? 'θ' : '=';
    p.put(flagTop(f.w, tone, Math.floor(hash(f.x, row, 43) * 999)), f.x - x0, 0);
    p.put(flagEdge(f.w), f.x - x0, FLAG.depth);
  }
  return p.grid();
}

/**
 * L'image d'un pan nord-sud (R1, une pièce au sol : la vraie projection, 8 × (L + 2)) : les dalles tournées, 40 cm de large, 60
 * le long de la rangée ; les joints décalés par la parité de la colonne (x / 40 cm), ancrés au monde comme l'est-ouest.
 */
export function flagColumn(y0: number, y1: number, col: number): Grid {
  const L = y1 - y0, p = new Paint(FLAG.depth, L + FLAG.edge);
  for (const f of layFlags(y0, y1, col)) {
    const r = hash(f.x, col, 47), tone = r < 0.35 ? '+' : r < 0.8 ? 'θ' : '=';
    // la dalle tournée : le dessus de 8 de large sur f.w de long, le joint au nord et à l'ouest, l'arête sud seulement au bout
    const top = flagTop(FLAG.depth, tone, Math.floor(hash(f.x, col, 49) * 999), f.w).map((row, j) => (j === f.w - 1 && f.x + f.w < y1 ? row.replace(/[!+]/g, (_c, i) => (i === 0 ? ';' : tone)) : row));
    p.put(top, 0, f.x - y0);
  }
  p.put(flagEdge(FLAG.depth), 0, L);
  return p.grid();
}

/** Un dallage de `w` × `d` px fait de rangées est-ouest, posées du nord au sud (chacune recouvre le chant de la précédente). */
export function flagFloor(x0: number, y0: number, w: number, d: number): Grid {
  const p = new Paint(w, d + FLAG.edge);
  for (let y = 0; y < d; y += FLAG.depth) p.put(flagRow(x0, x0 + w, Math.floor((y0 + y) / FLAG.depth)), 0, y);
  return p.grid();
}

/** Le pan de dallage nord-sud par la règle D (10 × 32 : l'est-ouest inversé), comme art/world/coq.ts (`flagRuleD`). */
export function flagRuleD(y0: number, y1: number, col: number): Grid {
  const g = flagColumn(y0, y1, col), last = g.length - 2;
  return g.map((r, j) => r + (j >= last ? ';;' : '=;'));
}

/** Le bout d'un tronçon (world/wallRuns.ts) en bout de pan : l'angle, contre un autre mur, ou le tableau d'une baie (une tête). */
const endOf = (e: RunEnd): End => (e.startsWith('corner') ? 'corner' : e === 'abut' ? 'abut' : 'jamb');

/**
 * L'image d'un tronçon de pierre de taille, de cordon ou de dallage, comme le dessinateur la fait pour le catalogue (le contour, l'ombre
 * portée) : la place du tronçon dans le monde ancre ses joints, sa hauteur donne la parité de son assise (30 cm), sa rangée de dalles
 * (40 cm) celle du dallage ; sa vue choisit la face (dehors, dedans enduit, nord-sud).
 */
export function coqRunImage(run: WallRun): Grid {
  const b = run.box;
  const es = run.extra?.start ?? 0;
  const ee = run.extra?.end ?? 0;
  const along = run.axis === 'ew' ? b.x : b.y;
  const len = (run.axis === 'ew' ? b.w : b.d) / CM_PER_PX;
  const x0 = Math.round(along / CM_PER_PX) - es;
  const x1 = Math.round(along / CM_PER_PX + len) + ee;
  const k = Math.floor(b.z / 30);
  const spec: CourseSpec = { x0, x1, k, start: endOf(run.start), end: endOf(run.end) };
  const v = run.view % 4;
  if (run.kind === 'flagstone') {
    const g = v % 2 ? flagRuleD(x0, x1, Math.floor(b.x / 40)) : flagRow(x0, x1, Math.floor(b.y / 40) + (v === 2 ? 1 : 0));
    return shadowed(outline(g, '~'));
  }
  if (run.kind === 'string') return shadowed(outline(stringView(x0, x1, run.thick, v)));
  return shadowed(outline(v === 0 ? courseImage(spec, run.thick) : v === 2 ? courseInner(spec, true, run.thick) : courseNS(spec, run.thick, v === 3)));
}
