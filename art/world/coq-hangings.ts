// Dessin validé par Grégoire, passé au jeu (chantier « maison du coq ») : la tapisserie de la salle et la tenture de la chambre, des images à pendre au
// mur (palette COQ_PAL d'art/proposals/coq-pierre.ts). Planche : npx tsx tools/essai-coq-details.ts.
//
// - La verdure (2,40 × 1,60 m : 48 × 32 px, vue de face comme le jeu montre le mur du fond d'une pièce) : une tapisserie de
//   laine achetée à la ville, la moins chère qui soit, sans personnages : de grandes feuilles (vertes, bleues, brunes) sur un
//   fond sombre, une bordure de laine brune semée de petites fleurs ocre, et au milieu le coq, l'emblème de la famille, sur une
//   motte. Un peu passée : les verts et les bleus éteints (la laine au jour depuis vingt ans), aucun blanc.
// - La tenture (1,60 × 1,20 m : 32 × 24 px) : une étoffe de laine teinte à la garance, passée, ses plis qui tombent des anneaux,
//   une bordure bleue de guède.
// Les deux pendent par des anneaux à une tringle de fer (la tringle est posée par l'essai, devant le mur) : la rangée du haut de
// l'image montre les anneaux.

import type { Grid } from '../lib/canvas';
import { hash } from '../lib/volumes';

/** Les rampes de laine (de la lumière au creux) : vert, bleu, brun-ocre. */
const GREEN = ['j', 'L', 'l', 'k'];
const BLUE = ['α', 'β', 'γ', 'δ'];
const BROWN = ['D', 'E', 'm', 'N'];

/** Une feuille : centre, demi-axes, angle, rampe, nombre de dents. */
interface Leaf { x: number; y: number; a: number; b: number; ang: number; ramp: string[]; teeth: number }

/** Le coq de la verdure (14 × 13), tourné vers l'ouest : crête et barbillons de garance, corps brun-ocre, queue en faucilles bleues. */
const COQ: Grid = [
  '...ρρ.........',
  '..ρρρρ........',
  '..DDmD....γβ..',
  '.bD_mD...γββγ.',
  'bbDDmm..γβ.αβ.',
  '..σDmm..βα..β.',
  '..σDDmmmβγ..γ.',
  '...DDDmmmγ....',
  '...EDDDmmm....',
  '....EmmmmN....',
  '......b..b....',
  '......b..b....',
  '.....bb.bb....',
];

/** Pose `g` dans `out` en (x, y), avec un liseré brun d'un pixel autour (la laine sombre qui cerne les motifs). */
function stampOutlined(out: string[][], g: Grid, x: number, y: number, rim = 'N'): void {
  const at = (i: number, j: number) => (g[j]?.[i] ?? '.') !== '.';
  for (let j = -1; j <= g.length; j++) for (let i = -1; i <= g[0].length; i++) {
    if (at(i, j)) { out[y + j][x + i] = g[j][i]; continue; }
    if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) if (out[y + j]?.[x + i] !== undefined) out[y + j][x + i] = rim;
  }
}

/** La verdure, 48 × 32. */
export function verdure(seed = 7): Grid {
  const W = 48, H = 32, B = 3;
  const out: string[][] = Array.from({ length: H }, () => Array(W).fill('δ'));
  // le fond du champ : un vert-bleu très sombre, plus bleu en haut (le lointain), plus vert au pied
  for (let j = B; j < H - B; j++) for (let i = B; i < W - B; i++) out[j][i] = j < 12 ? 'δ' : hash(seed, i >> 2, j >> 2) < 0.5 ? 'k' : 'δ';
  // les feuilles, du fond vers le devant
  const leaves: Leaf[] = [];
  for (let n = 0; n < 50; n++) {
    const r = (k: number) => hash(seed, n, k);
    const x = B + 2 + r(1) * (W - 2 * B - 4), y = B + 2 + r(2) * (H - 2 * B - 4);
    // la place du coq reste au milieu
    if (Math.abs(x - 24) < 8 && Math.abs(y - 18) < 7) continue;
    const ramp = r(3) < 0.5 ? GREEN : r(3) < 0.8 ? BLUE : BROWN;
    leaves.push({ x, y, a: 3 + r(4) * 4, b: 1.5 + r(5) * 1.6, ang: (r(6) - 0.5) * 2.4 + (x < 24 ? -0.6 : 0.6), ramp, teeth: 3 + Math.floor(r(7) * 3) });
  }
  for (const L of leaves) {
    const ca = Math.cos(L.ang), sa = Math.sin(L.ang);
    for (let j = Math.floor(L.y - L.a - 1); j <= L.y + L.a + 1; j++) for (let i = Math.floor(L.x - L.a - 1); i <= L.x + L.a + 1; i++) {
      if (i < B || j < B || i >= W - B || j >= H - B) continue;
      const dx = i + 0.5 - L.x, dy = j + 0.5 - L.y;
      const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      // le bord dentelé : la demi-largeur ondule le long de la feuille
      const along = u / L.a;
      if (Math.abs(along) > 1) continue;
      const half = L.b * Math.sqrt(1 - along * along) * (0.8 + 0.25 * Math.cos(along * Math.PI * L.teeth));
      if (Math.abs(v) > half) continue;
      // la nervure, la moitié au soleil (vers le haut et la gauche), la moitié à l'ombre, le creux au bord bas
      const lit = (v > 0) === (sa * 0.6 - ca * 0.8 > 0);
      let k = Math.abs(v) < 0.5 && Math.abs(along) < 0.85 ? 2 : lit ? 0 : 1;
      if (!lit && Math.abs(v) > half - 0.8) k = 2;
      out[j][i] = L.ramp[k];
    }
  }
  // la motte sous le coq, et le coq
  for (let i = 17; i < 31; i++) for (let j = 25; j < 28; j++) {
    const top = 25 + Math.floor(Math.abs(i - 24) / 4);
    if (j >= top) out[j][i] = j === top ? 'L' : 'l';
  }
  stampOutlined(out, COQ, 17, 12);
  // la bordure : brune, semée de fleurs ocre (2 × 1) ; un fil clair à l'intérieur
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const e = Math.min(i, j, W - 1 - i, H - 1 - j);
    if (e >= B) continue;
    out[j][i] = e === B - 1 ? 'E' : 'N';
    if (e === 1 && (i + j) % 6 === 0) out[j][i] = 'b';
    if (e === 1 && (i + j) % 6 === 1 && (i === 1 || i === W - 2)) out[j][i] = 'b';
  }
  // le contour : la laine sombre en haut et à gauche, OUTLINE en bas et à droite
  for (let i = 0; i < W; i++) { out[0][i] = 'K'; out[H - 1][i] = 'o'; }
  for (let j = 0; j < H; j++) { out[j][0] = 'K'; out[j][W - 1] = 'o'; }
  return out.map((r) => r.join(''));
}

/** La tenture de garance, 32 × 24 : plis qui tombent des anneaux (un tous les 40 cm), bordure de guède. */
export function tenture(): Grid {
  const W = 32, H = 24;
  const out: string[][] = Array.from({ length: H }, () => Array(W).fill('ρ'));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    // un pli tous les 8 px : le ventre au jour à gauche, le creux à droite, le creux qui s'élargit vers le bas
    const p = i % 8, deep = j > 12 ? 2 : 1;
    let k = p < 3 ? 'ρ' : p < 7 - deep ? 'σ' : 'τ';
    if (p === 0 && j > 2) k = 'ρ';
    out[j][i] = k;
  }
  // la bordure de guède, en bas et sur les côtés (3 px), un fil clair dedans
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const e = Math.min(i, W - 1 - i, H - 1 - j);
    if (e < 3) out[j][i] = e === 2 ? 'α' : 'β';
  }
  // la gaine du haut, repliée sur les anneaux
  for (let i = 0; i < W; i++) { out[0][i] = i % 8 < 3 ? 'ρ' : 'σ'; out[1][i] = 'τ'; }
  for (let i = 0; i < W; i++) { out[0][i] = 'σ'; out[H - 1][i] = 'o'; }
  for (let j = 0; j < H; j++) { out[j][0] = 'τ'; out[j][W - 1] = 'o'; }
  return out.map((r) => r.join(''));
}
