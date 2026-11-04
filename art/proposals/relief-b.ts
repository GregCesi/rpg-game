// Proposition B du chantier « relief » : « la falaise peinte » (planche : npx tsx tools/essai-relief-b.ts).
//
// Le monde reste plat à l'écran, à la manière des falaises de Stardew Valley : le plateau (3 m plus haut que la ferme), ses arbres
// et Xéros sur le plateau sont dessinés à leur place au sol, sans décalage. La hauteur est peinte par des tuiles :
//   - la face est de la falaise (colonne 21) : la paroi vue en raccourci à ½ (3 m -> 30 px), crête claire à gauche (le haut),
//     pied mouillé à droite dans l'eau ; ses lits de roche (horizontaux dans le monde) deviennent des traits verticaux, ses
//     diaclases (verticales dans le monde) des fentes horizontales ;
//   - la paroi nord du lit sec (elle regarde le sud) : une face de roche en vraie grandeur, pendue sous la crête du plateau
//     (y = 256), dans les rangées du lit, 60 px (3 m) à l'entrée qui décroissent jusqu'à 0 en haut de la pente : son pied est
//     une diagonale, son ombre glisse au pied, sur le fond du lit ;
//   - la paroi sud (elle regarde le nord) ne se voit pas : sa seule crête, un rebord de roche qui s'amincit avec la hauteur ;
//   - le fond du lit sec : terre tassée claire, sable, galets, sans contour ; des barres de galets nord-sud (une par case, leur
//     contremarche à l'est, dans l'ombre) et des traînées est-ouest disent la montée ;
//   - l'ombre de la falaise sur l'eau, vers l'est ; la rivière coupée net de part et d'autre du lit, avec son miroitement
//     (4 images).
// Couleurs : la palette du monde (art/palette.ts) : pierre R r z Z, terre battue # I $, chemin u U n e, eau W w q, '!' et 'a'
// pour les éclats du miroitement. Les tuiles du sol voisines (forêt, sous-bois, eau, chemin) sont celles du jeu.

import { Canvas, rng, type Grid } from '../lib/canvas';
import tileset from '../world/tiles';

export const T = 32;
export const COLS = 36;
export const ROWS = 22;
export const W = COLS * T;
export const H = ROWS * T;

/** Le lit sec : rangées 8 à 13, colonnes 2 à 26. */
export const BED = { c0: 2, c1: 26, r0: 8, r1: 13 };
/** La rivière : colonnes 22 à 26 ; la falaise est le bord ouest de la colonne 22. */
export const RIVER = { c0: 22, c1: 26 };
export const CLIFF_COL = 21;
const CREST_N = BED.r0 * T; // 256 : crête nord (bord du plateau au nord du lit)
const CREST_S = (BED.r1 + 1) * T; // 448 : crête sud
const X_TOP = 3 * T + 16; // 112 : le fond du lit atteint 3 m (milieu de la colonne 3)
const X_FOOT = CLIFF_COL * T + 16; // 688 : le fond du lit à 0 m (milieu de la colonne 21)
const X_RIVER = RIVER.c0 * T; // 704
const X_BANK = (RIVER.c1 + 1) * T; // 864

/** Hauteur de la paroi au-dessus du fond du lit, en px (3 m = 60 px), à l'abscisse x : 0 en haut de la pente, 60 à l'entrée. */
export function wallHeight(x: number): number {
  return Math.max(0, Math.min(60, Math.round((60 * (x - X_TOP)) / (X_FOOT - X_TOP))));
}

/** Hauteur du fond du lit (en m) au milieu de la colonne c. */
export function bedLevel(c: number): number {
  if (c >= RIVER.c0 - 1) return 0;
  if (c <= 3) return 3;
  return Math.round(((3 * (X_FOOT - (c * T + 16))) / (X_FOOT - X_TOP)) * 100) / 100;
}

const tiles = tileset.tiles;
const hash = (c: number, r: number) => ((c * 73856093) ^ (r * 19349663)) >>> 0;
const pick = (base: string, c: number, r: number) => {
  const k = hash(c, r) % 4;
  return tiles[k ? `${base}${k + 1}` : base];
};
const wave = (x: number, f: number, p: number) => Math.sin((x / T) * Math.PI * 2 * f + p);

const isBed = (c: number, r: number) => r >= BED.r0 && r <= BED.r1 && c >= BED.c0 && c <= BED.c1;
const isRiver = (c: number, r: number) => c >= RIVER.c0 && c <= RIVER.c1 && !isBed(c, r);
const isPath = (c: number, r: number) => (r === 10 || r === 11) && (c >= 27 || c <= 1);

// ---------- La tuile « lit sec » ----------

/**
 * Le fond du lit sec : terre tassée claire (I), plus claire et plus grise que le chemin (u), sable lissé (#), creux ($),
 * galets de calcaire et de pierre grise, sans contour. `slope` : une barre de galets nord-sud et sa contremarche à l'est
 * (le lit monte vers l'ouest) ; `track` : le passage tassé du chemin (rangées 10-11).
 */
export function bedTile(seed: number, slope: boolean, track: boolean, gravel = false): Canvas {
  const r = rng(seed);
  const c = new Canvas(T, T, 'I');
  for (let i = 0; i < 46; i++) c.set(Math.floor(r() * T), Math.floor(r() * T), ['#', '$', 'U', '#'][Math.floor(r() * 4)]);
  // traînées est-ouest : le sable lissé par l'ancien courant
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(r() * (T - 8));
    const y = 1 + Math.floor(r() * (T - 2));
    const len = 4 + Math.floor(r() * 6);
    c.rect(x, y, len, 1, '#');
    if (r() < 0.6) c.rect(x + 1, y + 1, len - 2, 1, '$');
  }
  if (track) {
    // le passage : terre plus tassée, traces de pas
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(r() * (T - 3));
      const y = Math.floor(r() * (T - 2));
      c.set(x, y, '$').set(x + 1, y, '$').set(x + 1, y + 1, 'n');
    }
  }
  // galets : grappes de 3 ou 4 pixels, éclairées en haut à gauche, leur creux en bas à droite
  const STONES: [string, string, string][] = [['R', 'r', 'z'], ['+', '=', ';'], ['U', 'u', 'n']];
  const nStones = gravel ? (track ? 9 : 16) : track ? 3 : 5;
  for (let i = 0; i < nStones; i++) {
    const [hi, mid, lo] = STONES[Math.floor(r() * STONES.length)];
    const x = 1 + Math.floor(r() * (T - 4));
    const y = 1 + Math.floor(r() * (T - 4));
    c.set(x, y, hi).set(x + 1, y, mid).set(x, y + 1, mid).set(x + 1, y + 1, lo).set(x + 2, y + 1, '$').set(x + 1, y + 2, '$');
  }
  if (slope) {
    // barre de galets nord-sud, un peu de travers ; à l'est, la contremarche (le lit descend vers l'est) dans l'ombre
    const x0 = 18 + Math.floor(r() * 4);
    // la barre se rompt par endroits ; les galets en grappes de 2 à 4 pixels, la contremarche d'un pixel
    for (let y = 0; y < T; y++) {
      const x = x0 + Math.round(wave(y, 1, seed) * 1.2 + wave(y, 3, seed * 2) * 0.6);
      if (wave(y, 2, seed * 0.7) < -0.55) continue;
      c.set(x, y, y % 4 === 0 ? 'R' : y % 4 === 2 ? '+' : 'r');
      c.set(x + 1, y, y % 4 === 1 ? 'z' : '$');
      if (y % 5 === 0) c.set(x - 1, y, '#');
    }
  }
  return c;
}

// ---------- Montage de la scène ----------

/** Le sol de la case (c, r), avant les peintures de relief : la tuile du jeu, ou le lit sec. */
function groundTile(c: number, r: number): Grid {
  if (isBed(c, r)) {
    // une barre de galets toutes les deux cases (3,2 m, 32 cm de montée) ; l'ancien lit de la rivière, plus caillouteux
    const slope = c >= 4 && c <= CLIFF_COL && c % 2 === 1;
    const track = r === 10 || r === 11;
    const gravel = c >= RIVER.c0;
    return bedTile(300 + (hash(c, r) % 4) + (track ? 10 : 0) + (slope ? 20 : 0) + (gravel ? 40 : 0), slope, track, gravel).toGrid();
  }
  if (isRiver(c, r)) {
    // voisins d'eau au nord et au sud (la coupure est peinte à part), la falaise à l'ouest (pas de berge d'herbe)
    let mask = 1 | 4 | 8;
    if (c < RIVER.c1) mask |= 2;
    return tiles[`water-${mask}`];
  }
  if (isPath(c, r)) {
    // le chemin entre dans le lit (côté est) et en ressort en sentier (côté ouest) : pas de bord d'herbe de ces côtés
    return tiles[`path-${(r === 10 ? 4 : 1) | 2 | 8}`];
  }
  if (c >= 31) return pick('grass', c, r) ?? tiles.grass;
  if (c <= 6) return pick('woods', c, r);
  return pick('forest', c, r);
}

/** Pose une bordure ondulée d'une tuile voisine sur le bord d'une case du lit (le lit et le sol voisin sont au même niveau). */
function softEdge(s: Canvas, c: number, r: number, side: 'n' | 's' | 'e' | 'w', from: Grid, seed: number) {
  for (let i = 0; i < T; i++) {
    const depth = 2 + Math.round(wave(i, 2, seed) * 1.2 + wave(i, 5, seed * 3) * 0.8);
    for (let d = 0; d <= depth; d++) {
      const [lx, ly] = side === 'n' ? [i, d] : side === 's' ? [i, T - 1 - d] : side === 'w' ? [d, i] : [T - 1 - d, i];
      s.set(c * T + lx, r * T + ly, d === depth ? '$' : from[ly][lx]);
    }
  }
}

const DARKER: Record<string, string> = {
  '#': 'I', I: '$', $: 'n', U: 'u', u: 'n', n: 'e', R: 'r', r: 'z', z: 'Z', '+': '=', '=': ';', ';': 'z', e: 'e', Z: 'Z',
};
const SHADED_WATER: Record<string, string> = { W: 'w', w: 'q', q: '5' };

/** La face sud de la paroi nord du lit sec : vraie grandeur, pendue sous la crête, pied en diagonale. */
function northWall(s: Canvas) {
  const r = rng(808);
  // lits de roche : profondeur sous la crête, ondulée, avec des lacunes
  const ledges = [9, 19, 31, 44].map((b, k) => ({ b, p: k * 1.7 + 0.4, gap: r() * 6 }));
  const joints: { x: number; k: number }[] = [];
  for (let x = X_TOP + 10; x < X_RIVER - 4; x += 13 + Math.floor(r() * 14)) joints.push({ x, k: Math.floor(r() * 5) });
  for (let x = X_TOP; x < X_RIVER; x++) {
    const h0 = wallHeight(x);
    if (h0 <= 0) continue;
    // le pied n'est pas une règle : des blocs tombés le bossellent de 1 à 2 px
    const h = h0 > 4 ? h0 + Math.round(wave(x, 1.9, 0.5) * 1.2 + wave(x, 4.3, 1.1) * 0.8) : h0;
    for (let Y = 0; Y < h; Y++) {
      const y = CREST_N + Y;
      let ch = 'z';
      if (Y >= h - 3) ch = 'Z';
      for (const L of ledges) {
        const ly = L.b + Math.round(wave(x, 1.3, L.p) * 1.4 + wave(x, 0.35, L.p * 2) * 2.2);
        const broken = wave(x, 0.7, L.gap) + wave(x, 2.3, L.p) * 0.4 < -0.6;
        if (broken || ly >= h - 3) continue;
        if (Y === ly) ch = 'r';
        if (Y === ly - 1 && wave(x, 1.7, L.p) > 0.2) ch = 'r';
        if (Y === ly + 1) ch = 'Z';
      }
      if (Y === 0) ch = 'R';
      if (Y === 1) ch = 'r';
      if (Y === 2) ch = wave(x, 2.7, 1) > 0.3 ? 'r' : 'z';
      s.set(x, y, ch);
    }
    // ombre portée au pied, sur le fond du lit (la lumière vient du nord-ouest)
    const sh = h > 3 ? 1 + Math.round(h / 12 + wave(x, 1.1, 2) * 0.8) : 0;
    for (let k = 0; k < sh; k++) {
      const y = CREST_N + h + k;
      s.set(x, y, DARKER[s.get(x, y)] ?? s.get(x, y));
    }
  }
  // diaclases verticales : une fente sombre, son bord droit dans l'ombre, entre deux lits
  for (const j of joints) {
    const h = wallHeight(j.x);
    const top = [2, 11, 21, 33, 46][j.k];
    const bot = Math.min(h - 3, top + 5 + (j.k % 3) * 2);
    for (let Y = top; Y < bot; Y++) {
      if (s.get(j.x, CREST_N + Y) === 'r') continue;
      s.set(j.x - 1, CREST_N + Y, 'r');
      s.set(j.x, CREST_N + Y, 'Z');
    }
  }
  // l'angle de l'éperon, à l'est : son arête dans l'ombre
  for (let Y = 2; Y < 60; Y++) s.set(X_RIVER - 1, CREST_N + Y, 'Z').set(X_RIVER - 2, CREST_N + Y, Y % 7 === 3 ? 'Z' : 'z');
  // la crête : quelques mottes de mousse et d'herbe qui débordent
  for (let x = X_TOP + 4; x < X_RIVER - 4; x += 9 + Math.floor(r() * 12)) {
    const w = 2 + Math.floor(r() * 3);
    for (let i = 0; i < w; i++) {
      s.set(x + i, CREST_N - 1, 'L');
      s.set(x + i, CREST_N, i === 0 ? 'L' : 'l');
      if (i > 0 && i < w - 1) s.set(x + i, CREST_N + 1, 'k');
    }
  }
  // éboulis au pied : quelques pierres sur le fond du lit
  for (let x = X_TOP + 120; x < X_RIVER - 6; x += 14 + Math.floor(r() * 18)) {
    const y = CREST_N + wallHeight(x) + 1 + Math.floor(r() * 3);
    s.set(x, y, 'R').set(x + 1, y, 'r').set(x, y + 1, 'r').set(x + 1, y + 1, 'z').set(x + 2, y + 1, '$').set(x + 1, y + 2, '$');
  }
}

/** La crête de la paroi sud (sa face regarde le nord et ne se voit pas) : un rebord de roche au bord du plateau. */
function southLip(s: Canvas) {
  for (let x = X_TOP; x < X_RIVER - T; x++) {
    const t = Math.round(wallHeight(x) / 7 + wave(x, 1.6, 0.8) * 0.7);
    if (t <= 0) continue;
    s.set(x, CREST_S - 1, 'n');
    for (let k = 0; k < t; k++) s.set(x, CREST_S + k, k === 0 ? 'Z' : k === 1 ? 'R' : k === t - 1 ? 'z' : 'r');
    s.set(x, CREST_S + t, wave(x, 3.1, 0) > 0 ? 'z' : 'L');
  }
}

/** La face est de la falaise (colonne 21), vue en raccourci : crête à gauche, pied mouillé à droite, dans l'eau. */
function eastFace(s: Canvas) {
  const r = rng(909);
  const x0 = CLIFF_COL * T;
  const parts: [number, number][] = [[0, CREST_N], [CREST_S, H]];
  const cracks: { y: number; u: number; len: number }[] = [];
  for (let y = 4; y < H; y += 11 + Math.floor(r() * 16)) cracks.push({ y, u: 2 + Math.floor(r() * 16), len: 3 + Math.floor(r() * 8) });
  for (const [y0, y1] of parts) {
    for (let y = y0; y < y1; y++) {
      for (let u = 0; u < T; u++) {
        let ch = u < 17 ? 'z' : 'Z';
        if (u === 0) ch = 'R';
        else if (u === 1) ch = 'r';
        else if (u <= 3) ch = wave(y, 1.9, 0.3) > 0.2 ? 'r' : 'z';
        // lits de roche (horizontaux dans le monde) : un trait vertical, son bord haut au jour
        for (const [b, p] of [[9, 0.5], [17, 2.1], [24, 3.3]] as [number, number][]) {
          const lu = b + Math.round(wave(y, 0.9, p) * 1.3);
          if (u === lu) ch = 'r';
          if (u === lu + 1) ch = 'Z';
        }
        if (u >= 27) ch = u === 27 ? 'Z' : u === 28 ? (y % 5 === 0 ? 'q' : 'Z') : u === 29 ? 'q' : 'w';
        if (u >= 30 && (y + Math.floor(y / 9)) % 11 === 0) ch = 'W';
        s.set(x0 + u, y, ch);
      }
    }
  }
  // diaclases (verticales dans le monde) : des fentes horizontales, leur lèvre haute au jour
  for (const k of cracks) {
    if ((k.y >= CREST_N - 2 && k.y < CREST_S + 2)) continue;
    for (let i = 0; i < k.len && k.u + i < 27; i++) {
      s.set(x0 + k.u + i, k.y, 'Z');
      if (i > 0 && i < k.len - 1) s.set(x0 + k.u + i, k.y - 1, 'r');
    }
  }
  // les deux bouts autour du lit : au sud, la crête qui tourne (vue de dessus) ; au nord, la face finit sur la crête nord
  for (let u = 0; u < 28; u++) {
    s.set(x0 + u, CREST_S, u < 27 ? 'R' : 'r');
    s.set(x0 + u, CREST_S + 1, 'r');
  }
  // mottes de mousse sur la crête du plateau, qui débordent sur la face
  for (let y = 6; y < H; y += 13 + Math.floor(r() * 14)) {
    if (y > CREST_N - 6 && y < CREST_S + 4) continue;
    const len = 2 + Math.floor(r() * 3);
    for (let i = 0; i < len; i++) s.set(x0 - 1, y + i, 'L').set(x0, y + i, i === 0 ? 'L' : 'l');
    s.set(x0 + 1, y + 1, 'k');
  }
  // ombre de la falaise sur l'eau : elle part vers l'est
  for (let y = 0; y < H; y++) {
    if (y >= CREST_N && y < CREST_S) continue;
    const w = 8 + Math.round(wave(y, 2, 0.4) * 2 + wave(y, 5, 1.3));
    for (let x = X_RIVER; x < X_RIVER + w; x++) s.set(x, y, SHADED_WATER[s.get(x, y)] ?? s.get(x, y));
  }
}

/** Les deux coupures de l'eau, au bord nord et au bord sud du lit : l'eau s'arrête net, sa lèvre claire, le sable mouillé. */
function waterCuts(s: Canvas) {
  for (let x = X_RIVER; x < X_BANK; x++) {
    // nord : la rivière finit à la rangée 7 ; on voit sa tranche, une lame d'eau de 3 px, comme du verre
    const lip = CREST_N - 4;
    s.set(x, lip, (x + 3) % 7 < 4 ? 'W' : 'w');
    s.set(x, lip + 1, 'w');
    s.set(x, lip + 2, (x % 5 === 0) ? 'w' : 'q');
    s.set(x, lip + 3, 'q');
    // le sable mouillé au pied de la lame
    const wet = 2 + Math.round(wave(x, 2, 0.7) * 0.8 + wave(x, 5, 2.2) * 0.6);
    for (let k = 0; k < wet; k++) s.set(x, CREST_N + k, k === 0 ? 'n' : '$');
    // sud : l'eau reprend à la rangée 14 ; sa tranche regarde le nord, on n'en voit que la lèvre
    s.set(x, CREST_S, (x + 1) % 6 < 3 ? 'W' : 'w');
    const wet2 = 2 + Math.round(wave(x, 2, 2.9) * 0.8 + wave(x, 4, 0.2) * 0.6);
    for (let k = 1; k <= wet2; k++) s.set(x, CREST_S - k, k === 1 ? 'n' : '$');
  }
}

/** Le terrain sans miroitement (tuiles du sol, lit sec, peintures de relief). */
export function terrain(): Canvas {
  const s = new Canvas(W, H);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s.stamp(groundTile(c, r), c * T, r * T);
  // bords du lit sur le sol du même niveau : à l'ouest (colonne 2, au haut de la pente) et à l'est (la rive, colonne 27)
  for (let r = BED.r0; r <= BED.r1; r++) {
    softEdge(s, BED.c0, r, 'w', groundTile(BED.c0 - 1, r), 11 + r);
    softEdge(s, BED.c1, r, 'e', groundTile(BED.c1 + 1, r), 31 + r);
  }
  softEdge(s, BED.c0, BED.r0, 'n', groundTile(BED.c0, BED.r0 - 1), 5);
  softEdge(s, BED.c0, BED.r1, 's', groundTile(BED.c0, BED.r1 + 1), 7);
  northWall(s);
  southLip(s);
  eastFace(s);
  waterCuts(s);
  return s;
}

// ---------- Le miroitement (4 images) ----------

/** Les éclats du miroitement : leur place sur les deux lèvres et leur phase. */
const SPARKS = (() => {
  const r = rng(4242);
  const out: { x: number; y: number; ph: number }[] = [];
  for (const y of [CREST_N - 4, CREST_N - 3, CREST_S, CREST_S + 1]) {
    for (let x = X_RIVER + 3 + Math.floor(r() * 6); x < X_BANK - 3; x += 9 + Math.floor(r() * 8)) {
      out.push({ x, y, ph: Math.floor(r() * 4) });
    }
  }
  return out;
})();

/**
 * Pose l'image `frame` (0 à 3) du miroitement : chaque éclat passe par quatre états (éteint, une étincelle, une croix, une
 * traînée), décalés d'un éclat à l'autre ; et la lèvre claire glisse de 2 px par image.
 */
export function shimmer(s: Canvas, frame: number) {
  for (let x = X_RIVER; x < X_BANK; x++) {
    s.set(x, CREST_N - 4, (x + 3 + frame * 2) % 7 < 4 ? 'W' : 'w');
    s.set(x, CREST_S, (x + 1 - frame * 2 + 60) % 6 < 3 ? 'W' : 'w');
  }
  for (const k of SPARKS) {
    const st = (frame + k.ph) % 4;
    if (st === 1) s.set(k.x, k.y, '!').set(k.x + 1, k.y, 'W');
    if (st === 2) s.set(k.x, k.y, '!').set(k.x - 1, k.y, 'a').set(k.x + 1, k.y, 'a').set(k.x, k.y - 1, 'W').set(k.x, k.y + 1, 'W');
    if (st === 3) s.set(k.x, k.y, 'a').set(k.x + 1, k.y, 'W').set(k.x + 2, k.y, 'W');
  }
}

/** La scène complète, image `frame` du miroitement. */
export function scene(frame: number): Grid {
  const s = terrain();
  shimmer(s, frame);
  return s.toGrid();
}

/** Ce qui se pose par-dessus : les arbres du jeu (clé d'image, pied en case) et Xéros (pose, case). */
export const TREES: { key: 'normal-tree' | 'big-tree'; c: number; r: number }[] = [
  { key: 'big-tree', c: 3, r: 4 },
  { key: 'normal-tree', c: 8, r: 6 },
  { key: 'normal-tree', c: 12, r: 3 },
  { key: 'big-tree', c: 16, r: 5 },
  { key: 'normal-tree', c: 19, r: 2 },
  { key: 'normal-tree', c: 1, r: 18 },
  { key: 'big-tree', c: 6, r: 20 },
  { key: 'normal-tree', c: 11, r: 19 },
  { key: 'normal-tree', c: 15, r: 21 },
  { key: 'normal-tree', c: 18, r: 18 },
  { key: 'big-tree', c: 33, r: 4 },
  { key: 'normal-tree', c: 31, r: 20 },
];
export const XEROS: { pose: 'idle-down' | 'idle-left'; c: number; r: number; label: string }[] = [
  { pose: 'idle-down', c: 29, r: 11, label: 'en bas, 0 m' },
  { pose: 'idle-down', c: 12, r: 11, label: 'sur la pente' },
  { pose: 'idle-down', c: 1, r: 11, label: 'en haut, 3 m' },
  { pose: 'idle-left', c: 27, r: 17, label: 'au bord de l eau' },
];
