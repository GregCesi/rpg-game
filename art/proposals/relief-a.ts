// Proposition A du relief (chantier « relief », essai hors jeu) : « le plateau soulevé », dans la vraie projection du jeu.
//
// Les dessins nouveaux, chacun par sa seule source, pris dans la palette `world` (art/palette.ts), sans contour (ce sont des sols
// et une paroi de terrain) :
//   - `dryBed` : la tuile « lit sec » (sable, galets, terre tassée), plus claire que le chemin, quatre variantes ;
//   - `rockFace` : la paroi de roche vue de face (une face tournée vers le sud, en vraie grandeur), rampe pierre R r z Z, par
//     assises de calcaire coupées de joints, éclairée en haut à gauche ;
//   - `rim` : la lèvre de roche du plateau le long d'un bord (est : la falaise vue par la tranche ; nord : le haut de la paroi ;
//     sud : le bord avant, en surplomb) ;
//   - `wetFoot` : le pied mouillé de la falaise dans l'eau ;
//   - `shimmer` : le miroitement des deux coupures de l'eau, quatre images.
// Rien de art/proposals/ ne se déclare dans art/index.ts : le jeu ne charge pas ces dessins. La scène qui les assemble :
// art/proposals/relief-a-scene.ts ; la planche : tools/essai-relief-a.ts.

import { Canvas, rng } from '../lib/canvas';

export const T = 32;

/** Bruit lisse et périodique sur `period` px (deux tuiles voisines se raccordent), de −1 à 1 environ. */
export function wave(i: number, phase: number, period = T): number {
  const a = (i / period) * Math.PI * 2;
  return Math.sin(a * 2 + phase) * 0.6 + Math.sin(a * 5 + phase * 3) * 0.4;
}

/** Hachage stable d'un pixel, de 0 à 1. */
export function hash(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- la tuile « lit sec » ----------

/**
 * Le lit sec : le fond d'une ancienne rivière, à sec depuis longtemps. Terre tassée claire (I, plus claire que le chemin u),
 * plaques de sable lissé (#), galets de calcaire et de pierre grise (2 à 4 px, éclairés en haut à gauche, posés en traînées
 * est-ouest comme l'eau les a laissés), gravier ($, r). Sans contour, sans motif qui se répète d'une tuile à l'autre.
 */
export function dryBed(seed: number): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'I');
  // sable lissé : plaques allongées est-ouest
  for (let i = 0; i < 3; i++) c.ellipse(2 + r() * 28, 2 + r() * 28, 3 + r() * 4, 1 + r() * 0.8, '#');
  // grain de la terre tassée
  for (let i = 0; i < 34; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.55 ? '$' : '#');
  // gravier
  for (let i = 0; i < 10; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), r() < 0.5 ? 'r' : 'z');
  // galets, en une ou deux traînées est-ouest
  const lanes = [4 + Math.floor(r() * 10), 18 + Math.floor(r() * 10)];
  for (let i = 0; i < 7; i++) {
    const big = r() < 0.4;
    const x = Math.floor(r() * (T - 3));
    const y = lanes[i % 2] + Math.floor(r() * 5) - 2;
    const [hi, mid, lo] = r() < 0.5 ? ['+', '=', ';'] : ['R', 'r', 'z'];
    if (big) {
      // galet de 4 × 3 : dessus clair, flanc sud et est à l'ombre, ombre de terre au pied
      c.set(x + 1, y, hi).set(x + 2, y, hi);
      c.set(x, y + 1, hi).set(x + 1, y + 1, mid).set(x + 2, y + 1, mid).set(x + 3, y + 1, lo);
      c.set(x + 1, y + 2, lo).set(x + 2, y + 2, lo);
      c.set(x + 3, y + 2, '$').set(x + 2, y + 3, '$');
    } else {
      c.set(x, y, hi).set(x + 1, y, mid).set(x, y + 1, mid).set(x + 1, y + 1, lo).set(x + 2, y + 1, '$');
    }
  }
  return c;
}

export const DRY_BED = [0, 1, 2, 3].map((k) => dryBed(300 + k));

// ---------- la paroi de roche, vue de face ----------

/**
 * La couleur de la paroi au point (x, z) : x en px du monde, z la hauteur absolue au-dessus du pied de la falaise (0 à 60 px).
 * Assises de calcaire de 8 à 13 px, un peu ondulées ; chaque bloc a son arête du haut et sa gauche au jour (R), sa droite et son
 * bas à l'ombre (z), les joints creux (Z) ; quelques trous (z) ; en haut, la mousse qui pend de la lèvre (l, k).
 * `top` : la hauteur de la lèvre (60) ; `foot` : la hauteur du fond du lit sous ce point (la paroi s'arrête là).
 */
export function rockFace(x: number, z: number, foot: number, top = 60): string {
  // assises de calcaire, d'épaisseur inégale, un peu ondulées ; une limite d'assise sur deux ne fait qu'un fil (pas de creux)
  const courses = [0, 9, 23, 31, 46, top];
  let k = 0;
  let lo = 0;
  let hi = top;
  for (let i = 0; i < courses.length - 1; i++) {
    const a = i === 0 ? -99 : courses[i] + Math.round(wave(x, i * 1.7, 192) * 2);
    const b = i === courses.length - 2 ? top : courses[i + 1] + Math.round(wave(x, (i + 1) * 1.7, 192) * 2);
    if (z >= a && z < b) { k = i; lo = Math.max(a, foot); hi = b; break; }
  }
  const fromTop = hi - 1 - z; // 0 : la rangée du haut de l'assise
  const fromBot = z - lo; // 0 : la rangée du bas de l'assise
  // mousse pendue sous la lèvre
  if (z >= top - 7 && hash(Math.floor(x / 2), 11) < 0.16 && top - 1 - z <= 1 + Math.floor(hash(Math.floor(x / 2), 12) * 5)) {
    return z === top - 1 ? 'L' : hash(x, z, 13) < 0.6 ? 'l' : 'k';
  }
  if (fromTop === 0) return z >= top - 1 ? 'R' : k % 2 ? 'z' : 'Z'; // joint d'assise (au sommet : l'arête de la lèvre)
  // fissures verticales, rares et penchées, qui ne traversent pas toujours l'assise
  const span = 26 + Math.floor(hash(k, 7) * 26);
  const xs = x + Math.floor((z - lo) / 3) * (hash(k, 9) < 0.5 ? 1 : -1) + Math.floor(hash(k, 3) * span);
  const bx = Math.floor(xs / span);
  const ix = xs - bx * span;
  const crackLen = 3 + Math.floor(hash(bx, k, 5) * (hi - lo));
  if (ix === 0 && fromTop <= crackLen) return 'Z';
  if (ix === 1 && fromTop <= crackLen) return 'z'; // le bord de la fissure côté ombre (à droite d'elle)
  if (ix === span - 1 && fromTop <= crackLen) return 'R'; // le bord éclairé, à gauche de la fissure
  // le haut de l'assise au jour, le bas dans l'ombre de l'assise du dessus qui avance
  if (fromTop === 1 || (fromTop === 2 && hash(Math.floor(x / 4), k, 14) < 0.5)) return 'R';
  if (fromBot === 0) return 'z';
  // la roche usée : plaques claires et creux, en grappes de 3 × 2 au moins
  const n = hash(Math.floor(x / 3), Math.floor(z / 2), 21 + k);
  if (n < 0.1) return 'z';
  if (n < 0.13) return 'Z';
  if (n > 0.9) return 'R';
  // le bas de la paroi, plus sombre (l'humidité, les éclaboussures du temps de la rivière)
  if (z - foot <= 2 && hash(x, z, 23) < 0.6) return 'z';
  return 'r';
}

// ---------- la lèvre du plateau ----------

/**
 * La lèvre de roche du plateau, le long d'un bord : `d` la distance au bord (0 : la dernière rangée ou colonne du plateau), `i` la
 * position le long du bord (px du monde). Rend la couleur, ou undefined si le sol du plateau reste visible là.
 * - `east` : la falaise vue par la tranche, côté ombre : la roche affleure sur 2 à 4 px, la dernière colonne à l'ombre (z) ;
 * - `north` : le haut de la paroi du lit, côté lumière : 2 à 3 rangées de roche claire, l'arête au jour (R) ;
 * - `south` : le bord avant du plateau, vu de face, en surplomb : la crête claire (R), la roche (r), puis des touffes de la forêt
 *   qui pendent par-dessus le vide.
 */
export function rim(side: 'east' | 'north' | 'south', d: number, i: number): string | undefined {
  const w = 2 + Math.round((wave(i, side.length, 96) + 1) * 1.1);
  if (d > w) return undefined;
  const n = hash(Math.floor(i / 2), d, side.length);
  if (side === 'east') {
    if (d === 0) return 'z';
    if (d === 1) return n < 0.7 ? 'r' : 'z';
    return n < 0.55 ? 'R' : 'r';
  }
  if (side === 'north') {
    if (d === 0) return 'R';
    if (d === 1) return n < 0.7 ? 'R' : 'r';
    return n < 0.5 ? 'r' : undefined;
  }
  // la rangée du bord : l'arête qui tourne vers le vide (la face cachée), à l'ombre ; puis la crête au jour
  if (d === 0) return n < 0.8 ? 'z' : 'Z';
  if (d === 1) return n < 0.85 ? 'R' : 'r';
  if (d === 2) return n < 0.6 ? 'R' : 'r';
  return n < 0.6 ? 'r' : 'z';
}

/** Herbe et racines qui pendent de la lèvre sud sur le fond du lit (au-dessus d'elle à l'écran) : longueur en px à la position i. */
export function overhang(i: number): number {
  const n = hash(Math.floor(i / 3), 0, 31);
  return n < 0.22 ? 1 + Math.floor(hash(i, 1, 32) * 3) : 0;
}

// ---------- le pied mouillé ----------

/**
 * L'eau au pied de la falaise : `d` la distance à la paroi (0 : la colonne d'eau contre la roche), `y` la position le long de la
 * falaise. Une colonne d'eau sombre (q) contre la roche, puis un liseré d'écume cassé (W) que l'eau fait en battant le pied.
 */
export function wetFoot(d: number, y: number): string | undefined {
  if (d === 0) return 'q';
  if (d === 1) return hash(Math.floor(y / 3), 0, 41) < 0.55 ? 'W' : 'w';
  if (d === 2) return hash(Math.floor(y / 4), 1, 42) < 0.25 ? 'W' : undefined;
  return undefined;
}

// ---------- le miroitement des coupures ----------

/** Nombre d'images du miroitement. */
export const SHIMMER_FRAMES = 4;

/**
 * Le miroitement d'une coupure de l'eau, image `f` : `i` la position le long de la coupure (px), `d` la rangée comptée depuis le
 * bord de l'eau (0 : la dernière rangée d'eau, 1 : l'avant-dernière ; −1 : la rangée de lit sec contre l'eau). Rend la couleur,
 * ou undefined (rien ne change). Des grappes de 2 ou 3 px clairs (W, a au cœur) glissent le long du bord et s'allument tour à
 * tour ; l'eau du bord reste un peu plus claire (W) en tirets, pour que la coupure se lise même entre deux éclats.
 */
export function shimmer(f: number, i: number, d: number, side: number): string | undefined {
  const P = 13; // une grappe tous les 13 px
  const slot = Math.floor((i + f * 3 + side * 5) / P);
  const at = (i + f * 3 + side * 5) - slot * P;
  const phase = (Math.floor(hash(slot, side, 51) * SHIMMER_FRAMES) + f) % SHIMMER_FRAMES;
  // 0 : éteinte, 1 : naissante, 2 : pleine, 3 : mourante
  if (d === 0) {
    if (phase === 2 && at >= 4 && at <= 6) return 'a';
    if (phase === 2 && (at === 3 || at === 7)) return 'W';
    if (phase === 1 && at === 5) return 'a';
    if (phase === 1 && (at === 4 || at === 6)) return 'W';
    if (phase === 3 && at >= 5 && at <= 6) return at === 5 ? 'a' : 'W';
    return (Math.floor((i + f * 2) / 4) + side) % 3 === 0 ? 'W' : undefined;
  }
  if (d === 1) return phase === 2 && at === 5 ? 'a' : phase === 2 && (at === 4 || at === 6) ? 'W' : undefined;
  if (d === -1) return phase === 2 && at === 5 ? 'a' : phase === 3 && at === 6 ? 'W' : undefined;
  return undefined;
}
