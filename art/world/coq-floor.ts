// Dessin validé par Grégoire, passé au jeu (chantier « maison du coq », dessins d'intégration) : le pan de dallage (réponse 30 de Grégoire : le dallage se
// pose par pans qui consomment leurs dalles ; un pan = une rangée de dalles de 40 cm de profondeur, de toute longueur ; la dalle
// seule reste posable pour les retouches). Planche : npx tsx tools/essai-coq-integration.ts (.art-preview/coq-integration-sol.png).
//
// Le pan est une pièce de bâtiment au sol (`ground: true`, STYLE.md section 8 : sa profondeur à l'échelle du sol, sans raccourci,
// pour que les rangées voisines se touchent sur la carte) : L × 40 × 8 cm, à l'écran L/5 × (8 + 1,6) px, dessiné L/5 × 10 : le
// dessus de 8 rangées, le chant de 2 rangées au sud. La rangée posée au sud recouvre le chant de celle du nord : on ne voit que le
// chant de la dernière. Comme le mur : **les dalles sont des données** (`FLAGSTONES` : le dessus et le chant de chaque dalle, trois
// tons), **le code les pose** (`flagRow`) ; les joints se décalent d'une demi-dalle (30 cm) **par la parité de la rangée** (y / 40 cm),
// ancrés au monde ; aux bouts, une dalle recoupée (au moins 20 cm, sinon les deux dernières se partagent la place).

import type { Grid } from '../lib/canvas';
import { dash, hash } from '../lib/volumes';
import { Paint } from './coq-wall';

/** Une dalle : 60 cm (12 px) le long de la rangée, 40 (8 px) de profondeur, 8 cm d'épaisseur (le chant : 2 rangées). */
export const FLAG = { len: 12, depth: 8, edge: 2, min: 4 };

const TONE = ['+', 'θ', '='] as const;
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
export const FLAGSTONES = TONE.map((t, n) => ({ label: `dalle ${['claire', 'blonde', 'grise'][n]}`, top: flagTop(FLAG.len, t, 500 + n), edge: flagEdge(FLAG.len) }));

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
