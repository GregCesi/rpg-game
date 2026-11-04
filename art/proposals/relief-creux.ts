// Proposition du chemin creux (chantier « relief », essai hors jeu) : les matières du passage entre la ferme et le plateau.
//
// Un couloir de 2,50 m creusé dans un plateau de 5 m, « comme si un ver de terre avait creusé un trou » : pas de roche en assises,
// pas de muret, pas de rampe lisse. Chaque dessin a sa seule source ici, pris dans la palette `world` (art/palette.ts), sans
// contour pour ce qui fait partie du terrain (sol, talus, paroi), avec contour pour les masses de feuillage posées par-dessus :
//   - `paleFloor` : le sol du passage, terre tassée presque blanche et cailloux de calcaire, quatre variantes de 32 × 32 ;
//   - `bankAt` : le talus de terre très foncée d'une paroi, vu de dessus (la paroi n'est pas à pic : elle a une emprise au sol,
//     que la projection montre), sa lumière selon le côté où elle regarde ;
//   - `faceAt` : la paroi tournée vers le sud (la bouche dans la falaise), vue en vraie grandeur : terre, racines qui pendent,
//     mousse, broussailles de la lèvre, terre tombée au pied ;
//   - `lipBrush` : les broussailles qui bordent la lèvre, sur le plateau ;
//   - `foliageMass` : une masse de feuillage qui pend au-dessus du passage (la voûte), avec ses vrilles ;
//   - `rootStrands` : les racines et le lierre qui pendent d'une lèvre.
// Rien de art/proposals/ ne se déclare dans art/index.ts : le jeu ne charge pas ces dessins. La scène : relief-creux-scene.ts ;
// la planche : tools/essai-relief-creux.ts.

import { Canvas, rng } from '../lib/canvas';
import { hash, wave } from './relief-a';

export { hash, wave };
export const T = 32;

// ---------- le sol du passage ----------

/**
 * Le sol du chemin creux : terre tassée très claire, presque blanche (`+`, le calcaire au soleil), des plaques lissées plus
 * chaudes (`#`), des cailloux de calcaire de 2 à 4 px (arête claire `!` en haut à gauche, flanc `=`, ombre `;` en bas à droite),
 * du gravier épars. Sans contour, en grappes : aucun pixel seul, sauf les éclats voulus.
 */
export function paleFloor(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, '+');
  for (let i = 0; i < 3; i++) c.ellipse(2 + r() * 28, 2 + r() * 28, 2.5 + r() * 4, 1.2 + r() * 1.2, '#');
  for (let i = 0; i < 2; i++) c.ellipse(2 + r() * 28, 2 + r() * 28, 2 + r() * 2, 1 + r(), '!');
  // gravier : petites paires
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(r() * (T - 1));
    const y = Math.floor(r() * T);
    c.set(x, y, '=').set(x + 1, y, ';');
  }
  // cailloux
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * (T - 4));
    const y = Math.floor(r() * (T - 3));
    if (r() < 0.45) {
      c.set(x + 1, y, '!').set(x + 2, y, '!');
      c.set(x, y + 1, '!').set(x + 1, y + 1, '=').set(x + 2, y + 1, '=').set(x + 3, y + 1, ';');
      c.set(x + 1, y + 2, ';').set(x + 2, y + 2, ';').set(x + 3, y + 2, '$');
    } else {
      c.set(x, y, '!').set(x + 1, y, '=').set(x, y + 1, '=').set(x + 1, y + 1, ';').set(x + 2, y + 1, '$');
    }
  }
  return c;
}

export const PALE_FLOOR = [0, 1, 2, 3].map((k) => paleFloor(500 + k));

/** Le sol du passage au point (x, y) du monde ; `edge` : la distance au pied du talus (px), `mid` : la distance à l'axe. */
export function floorAt(x: number, y: number, edge: number, mid: number): string {
  // au pied des parois : la terre tombée et les feuilles, qui grignotent le sol clair en grappes
  const crumb = hash(Math.floor(x / 2), Math.floor(y / 3), 501);
  if (edge < 1 + crumb * 3) return crumb < 0.35 ? '3' : crumb < 0.7 ? '2' : '9';
  if (edge < 3 + crumb * 4) return crumb < 0.5 ? '$' : 'I';
  // la trace des pas au milieu : un peu plus tassée, plus chaude
  if (mid < 7 && hash(Math.floor(x / 3), Math.floor(y / 2), 502) < 0.35) return '#';
  const col = Math.floor(x / T);
  const row = Math.floor(y / T);
  const v = Math.floor(hash(col, row, 503) * 4);
  return PALE_FLOOR[v].get(((x % T) + T) % T, ((y % T) + T) % T);
}

// ---------- le talus des parois, vu de dessus ----------

/**
 * Le talus d'une paroi au point (x, y) du monde, vu de dessus : `t` de 0 (au pied, sur le sol) à 1 (à la lèvre), `light` de −1
 * (le talus regarde l'est ou le sud : à l'ombre) à 1 (il regarde l'ouest ou le nord : au jour). Terre très foncée : humus `5`,
 * terre `3`, éclairée `e` du côté du jour ; mousse en haut (`8`, `6`), feuilles et terre tombée au pied (`2`, `9`). Les racines
 * qui descendent le talus sont posées à part (`rootStrands`).
 */
export function bankAt(x: number, y: number, t: number, light: number): string {
  const n = hash(Math.floor(x / 2), Math.floor(y / 2), 511);
  const m = hash(Math.floor(x / 3), Math.floor(y / 3), 512);
  // feuilles mortes et terre éboulée au pied
  if (t < 0.18) return n < 0.4 ? '2' : n < 0.7 ? '9' : '3';
  // mousse près de la lèvre, plus abondante au jour
  if (t > 0.72 && m < 0.25 + 0.2 * light) return light > 0 ? (n < 0.5 ? '6' : '7') : (n < 0.6 ? '8' : '6');
  if (light > 0.3) return n < 0.5 ? '3' : n < 0.78 ? 'e' : n < 0.9 ? '9' : '5';
  if (light > -0.3) return n < 0.55 ? '3' : n < 0.85 ? '5' : '9';
  return n < 0.62 ? '5' : n < 0.9 ? '3' : '8';
}

// ---------- la paroi tournée vers le sud ----------

/**
 * La paroi vue de face (tournée vers le sud, en vraie grandeur), au point x, à `fromTop` px sous la lèvre, sur une paroi de `h` px.
 * Terre très foncée (`3`, creux `5`), mottes éclairées en haut à gauche (`e`), coulures verticales (`5`), plaques de mousse et de
 * lierre (`8`, `6`, `l`, `k`), broussailles et herbes qui débordent de la lèvre (`L`, `l`, `j`, `k`), terre tombée au pied (`2`,
 * `9`). Les racines qui pendent sont posées par-dessus (`rootStrands`). Undefined : rien de propre (la terre nue).
 */
export function faceAt(x: number, fromTop: number, h: number): string {
  const fromBot = h - 1 - fromTop;
  // la lèvre : herbes et broussailles qui débordent, une frange inégale de 2 à 7 px
  const fringe = 2 + Math.floor((wave(x, 1.1, 40) + 1) * 1.6) + (hash(Math.floor(x / 2), 0, 521) < 0.25 ? 2 : 0);
  if (fromTop < fringe) {
    const n = hash(x, fromTop, 522);
    if (fromTop === 0) return n < 0.6 ? 'L' : 'j';
    if (fromTop === fringe - 1) return 'k';
    return n < 0.55 ? 'l' : n < 0.8 ? 'L' : 'k';
  }
  // la terre tombée au pied, en cône
  const cone = 2 + Math.floor((wave(x, 2.7, 56) + 1) * 2);
  if (fromBot < cone) {
    const n = hash(Math.floor(x / 2), fromBot, 523);
    return fromBot === cone - 1 ? (n < 0.5 ? 'e' : '9') : n < 0.45 ? '2' : n < 0.75 ? '9' : '3';
  }
  // coulures sombres, verticales
  const runnel = hash(Math.floor(x / 3), 1, 524);
  if (runnel < 0.18 && hash(Math.floor(x / 3), Math.floor(fromTop / 9), 525) < 0.7) return '5';
  // plaques de mousse et de lierre (grappes de 3 × 3)
  const moss = hash(Math.floor(x / 4), Math.floor(fromTop / 3), 526);
  if (moss < 0.05) return hash(Math.floor(x / 4), Math.floor(fromTop / 3), 527) < 0.5 ? '8' : 'k';
  if (moss > 0.965) return fromTop % 3 === 0 ? 'l' : 'k';
  // mottes : l'arête du haut éclairée, le dessous creusé
  const clod = hash(Math.floor((x + 2) / 6), Math.floor((fromTop + 3) / 7), 529);
  const cy = ((fromTop + 3) % 7 + 7) % 7;
  if (clod < 0.22 && cy === 0 && hash(Math.floor(x / 3), fromTop, 530) < 0.8) return 'e';
  if (clod < 0.22 && cy === 6) return '5';
  return hash(Math.floor(x / 3), Math.floor(fromTop / 3), 531) < 0.2 ? '5' : '3';
}

// ---------- les broussailles de la lèvre, sur le plateau ----------

/**
 * Les broussailles au bord du plateau, à `d` px de la lèvre (0 : la dernière rangée du plateau), le long de `i` : une haie basse
 * et inégale de ronces et de jeunes pousses (feuillage `j L l k`), plus large par endroits ; undefined au-delà.
 */
export function lipBrush(d: number, i: number, seed = 0): string | undefined {
  const w = 2 + Math.round((wave(i, 0.8 + seed, 64) + 1) * 2.2) + (hash(Math.floor(i / 5), seed, 541) < 0.3 ? 3 : 0);
  if (d > w) return undefined;
  const n = hash(Math.floor(i / 2), d, 542 + seed);
  if (d === w) return n < 0.5 ? 'k' : 'l';
  if (d === w - 1) return n < 0.6 ? 'j' : 'L';
  return n < 0.45 ? 'L' : n < 0.8 ? 'l' : 'k';
}

// ---------- les racines et le lierre qui pendent ----------

export interface Strand {
  /** Les pixels, du haut (accroché à la lèvre) vers le bas, avec leur couleur. */
  px: [number, number, string][];
}

/**
 * Une racine ou une liane qui pend de (x0, y0) sur `len` px, vers `dir` (1 : vers le bas de l'écran ; en plan, le sens de la
 * pente) ; elle ondule d'un pixel, s'affine (une racine claire `m` au jour, `N` à l'ombre, sa pointe `K`) ; le lierre (`ivy`)
 * porte des feuilles en grappes (`l`, `k`, `L`).
 */
export function strand(x0: number, y0: number, len: number, seed: number, ivy: boolean, dx = 0, dy = 1): Strand {
  const r = rng(seed);
  const px: [number, number, string][] = [];
  let x = x0;
  let y = y0;
  let drift = 0;
  for (let k = 0; k < len; k++) {
    const tip = k >= len - 2;
    if (ivy) {
      px.push([Math.round(x), Math.round(y), k % 3 === 0 ? 'L' : tip ? 'k' : 'l']);
      if (k % 3 === 1 && r() < 0.8) { px.push([Math.round(x) - 1, Math.round(y), 'L']); px.push([Math.round(x) + 1, Math.round(y), 'k']); }
    } else {
      px.push([Math.round(x), Math.round(y), tip ? 'K' : k < 2 ? 'N' : r() < 0.3 ? 'm' : 'N']);
      if (k > 3 && k < len - 3 && r() < 0.08) {
        // une radicelle qui part de côté
        const s = r() < 0.5 ? -1 : 1;
        px.push([Math.round(x) + s * (dy !== 0 ? 1 : 0), Math.round(y) + s * (dx !== 0 ? 1 : 0), 'K']);
      }
    }
    x += dx;
    y += dy;
    drift += (r() - 0.5) * 0.9;
    drift = Math.max(-1, Math.min(1, drift));
    // la racine ondule d'un pixel de part et d'autre de sa ligne
    if (dx === 0) x = x0 + Math.round(drift);
    else if (dy === 0) y = y0 + Math.round(drift);
  }
  return { px };
}

// ---------- la masse de feuillage de la voûte ----------

/**
 * Une masse de feuillage qui pend au-dessus du passage, de `w` × `h` px : trois à six touffes rondes, éclairées en haut à gauche
 * (`j` au jour, `L`, `l`, `k` dessous), contour d'un pixel (`o` en bas et à droite, `k` en haut et à gauche, STYLE section 3), et
 * des vrilles qui pendent en bas (`hang` : leur longueur max). Le bas de l'image est le bas des vrilles.
 */
export function foliageMass(w: number, h: number, seed: number, hang = 6): Canvas {
  const r = rng(seed);
  const c = new Canvas(w, h);
  const body = h - hang;
  const clumps = 3 + Math.floor(r() * 4);
  const blobs: [number, number, number, number][] = [];
  for (let i = 0; i < clumps; i++) {
    const rx = 4 + r() * Math.min(9, w / 3);
    const ry = 3 + r() * Math.min(6, body / 3);
    const cx = rx + 1 + r() * Math.max(0, w - 2 * rx - 2);
    const cy = ry + 1 + r() * Math.max(0, body - 2 * ry - 2);
    blobs.push([cx, cy, rx, ry]);
    c.ellipse(cx, cy, rx, ry, 'l');
  }
  // une base continue, pour que la masse se tienne
  c.ellipse(w / 2, body * 0.6, w / 2 - 1.5, body * 0.35, 'l');
  // modelé : chaque touffe a sa lumière en haut à gauche et son ombre en bas à droite
  c.within('l', () => {
    for (const [cx, cy, rx, ry] of blobs) {
      c.ellipse(cx + rx * 0.25, cy + ry * 0.35, rx * 0.8, ry * 0.65, 'k');
    }
    for (const [cx, cy, rx, ry] of blobs) {
      c.ellipse(cx - rx * 0.1, cy - ry * 0.1, rx * 0.75, ry * 0.6, 'l');
      c.ellipse(cx - rx * 0.3, cy - ry * 0.35, rx * 0.5, ry * 0.4, 'L');
    }
  });
  c.within('L', () => {
    for (const [cx, cy, rx, ry] of blobs) c.ellipse(cx - rx * 0.4, cy - ry * 0.45, rx * 0.28, ry * 0.25, 'j');
  });
  // grain des feuilles : quelques éclats sombres dans le clair, clairs dans le sombre (par paires)
  for (let i = 0; i < (w * body) / 18; i++) {
    const x = Math.floor(r() * (w - 1));
    const y = Math.floor(r() * body);
    const ch = c.get(x, y);
    if (ch === 'L' && c.get(x + 1, y) === 'L') c.set(x, y, 'l').set(x + 1, y, 'l');
    else if (ch === 'k' && c.get(x + 1, y) === 'k') c.set(x, y, 'l').set(x + 1, y, 'l');
  }
  // vrilles qui pendent du dessous
  for (let x = 2; x < w - 2; x += 2 + Math.floor(r() * 3)) {
    let y = body - 1;
    while (y > 0 && c.get(x, y) === '.') y--;
    if (y <= 0 || r() < 0.35) continue;
    const len = 1 + Math.floor(r() * hang);
    for (let k = 1; k <= len; k++) c.set(x, y + k, k === len ? 'k' : k % 2 ? 'l' : 'L');
  }
  c.outline('o');
  // contour côté lumière : la teinte la plus sombre du feuillage
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) !== 'o') continue;
    const open = (a: number, b: number) => c.get(a, b) === '.';
    if ((open(x - 1, y) || open(x, y - 1)) && !open(x + 1, y) && !open(x, y + 1)) c.set(x, y, 'k');
    else if (open(x + 1, y) === false && open(x, y + 1) === false) c.set(x, y, 'k');
  }
  return c;
}
