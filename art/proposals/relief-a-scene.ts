// La scène de la proposition A du relief (« le plateau soulevé ») : une carte de 36 × 22 cases, rendue dans la vraie projection du
// jeu (docs/STYLE.md section 8 : un point au sol (x, y) à la hauteur z se voit à l'écran en (x, y − z), 5 cm par pixel).
//
// Le terrain est une carte des hauteurs, en px (60 px = 3 m) :
//   - le plateau, colonnes 0 à 21, à 60 ;
//   - la rivière et la rive est, colonnes 22 à 35, à 0 ;
//   - le lit sec, rangées 8 à 13 des colonnes 2 à 26 : à 0 sous la rivière (colonnes 22 à 26), puis il monte de 10 % de la
//     colonne 21 (0) à la colonne 3 (60), et rejoint le plateau aux colonnes 0 à 2.
// Chaque colonne de pixels se peint du nord au sud : le sol d'un point se pose à y − h ; quand le sol descend vers le sud, la face
// qu'on voit (tournée vers le sud, en vraie grandeur) remplit l'écart ; ce qui est plus au sud recouvre ce qui est derrière. La
// face est de la falaise, verticale, n'a pas de largeur à l'écran : c'est un simple bord, que la lèvre de roche, le pied mouillé
// et l'ombre portée font lire. L'ombre portée du terrain se calcule comme celle des toits du jeu (SHADOW de src/config.ts : un
// point à la hauteur z tombe au sol décalé de 0,25 z vers l'est et 0,1 z vers le sud).
// Les dessins (tuile du lit sec, paroi, lèvre, pied mouillé, miroitement) : art/proposals/relief-a.ts. Hors jeu.

import type { Grid } from '../lib/canvas';
import tileset from '../world/tiles';
import { DRY_BED, T, hash, overhang, rim, rockFace, shimmer, wave, wetFoot } from './relief-a';

export const COLS = 36;
export const ROWS = 22;
export const W = COLS * T;
export const H = ROWS * T;
/** Hauteur du plateau, en px (3 m). */
export const TOP = 60;
const X_CLIFF = 22 * T; // premier px de la rivière : la falaise est le bord ouest de la colonne 22
const X_BED0 = 2 * T; // le lit sec commence à la colonne 2
const X_RISE = 3 * T; // le fond du lit atteint le plateau au bord ouest de la colonne 3
const X_BED1 = 27 * T; // le lit finit avec la colonne 26
const Y_BED0 = 8 * T;
const Y_BED1 = 14 * T;
const SHADOW = { dx: 0.25, dy: 0.1 };

/** Les bords nord et sud du lit, un peu ondulés sous le plateau (la roche n'est pas tirée au cordeau), droits sous la rivière. */
const yN = (x: number) => Y_BED0 + (x < X_CLIFF ? Math.round(wave(x, 0.5, 128) * 2) : 0);
const yS = (x: number) => Y_BED1 + (x < X_CLIFF ? Math.round(wave(x, 2.1, 128) * 2) : 0);
const inBed = (x: number, y: number) => x >= X_BED0 && x < X_BED1 && y >= yN(x) && y < yS(x);

/** La hauteur du fond du lit en x : 0 à l'est de la colonne 22, 60 à l'ouest de la colonne 3, 10 % entre les deux. */
export const bedZ = (x: number) => Math.max(0, Math.min(TOP, Math.round(((X_CLIFF - x) * TOP) / (X_CLIFF - X_RISE))));

/** La hauteur du sol au point (x, y) du monde, en px. */
export function heightAt(x: number, y: number): number {
  if (x >= X_CLIFF) return 0;
  if (inBed(x, y)) return bedZ(x);
  return TOP;
}

const tile = (name: string, x: number, y: number) => tileset.tiles[name][((y % T) + T) % T][((x % T) + T) % T];
const variant = (col: number, row: number, n: number) => Math.floor(hash(col, row, 77) * n);
const FLOOR4 = (name: string, col: number, row: number) => { const v = variant(col, row, 4); return v ? `${name}${v + 1}` : name; };
const GRASS6 = (col: number, row: number) => { const v = variant(col, row, 6); return v ? `grass${v + 1}` : 'grass'; };

/** Le chemin qui se perd dans le lit : sa trace tassée, large à l'est, qui s'efface en montant ; puis le sentier du plateau. */
function trodden(x: number, y: number): string | undefined {
  const t = Math.max(0, Math.min(1, (x - X_RISE) / (X_BED1 - X_RISE))); // 1 à l'entrée, 0 en haut
  const half = 9 + 17 * t + wave(x, 1.3, 96) * 2.5;
  const d = Math.abs(y - (11 * T - 1) - Math.round(wave(x, 0.7, 160) * 3));
  if (d > half) return undefined;
  // la trace : des plaques de terre foulée (3 × 2 px), serrées au milieu et à l'entrée, qui s'éclaircissent sur les bords et en montant
  const p = (0.1 + 0.95 * t ** 1.5) * (1 - (d / half) ** 3 * 0.8);
  const n = hash(Math.floor((x + (Math.floor(y / 3) % 2) * 2) / 4), Math.floor(y / 3), 61);
  if (n > p) return undefined;
  // le grain du chemin (u, avec n et U semés comme dans la tuile du chemin), les galets du lit qui percent encore
  const g = hash(x, y, 64);
  return g < 0.78 ? 'u' : g < 0.9 ? 'n' : 'U';
}

/** Le sentier du plateau, à l'ouest du lit : une bande de terre de 12 à 16 px. */
function trail(x: number, y: number): string | undefined {
  const half = 7 + wave(x, 0.4, 64) * 1.5;
  const d = Math.abs(y - (11 * T - 1) - Math.round(wave(x, 2.4, 128) * 2));
  if (d > half) return undefined;
  if (d > half - 1) return 'e';
  const n = hash(x, y, 62);
  return n < 0.6 ? 'u' : n < 0.85 ? 'n' : 'U';
}

/** Le sol du plateau (au-dessus, sans la paroi). */
function plateau(x: number, y: number): string {
  const col = Math.floor(x / T);
  const row = Math.floor(y / T);
  // la lèvre est de la falaise (hors du lit)
  const dE = X_CLIFF - 1 - x;
  if (dE <= 5) { const c = rim('east', dE, y); if (c) return c; }
  // le haut de la paroi nord du lit, et le bord avant du plateau au sud du lit : là où la paroi est assez haute pour se lire
  if (x >= X_BED0 && TOP - bedZ(x) >= 4) {
    const dN = yN(x) - 1 - y;
    if (dN >= 0 && dN <= 5) { const c = rim('north', dN, x); if (c) return c; }
    const dS = y - yS(x);
    if (dS >= 0 && dS <= 5) { const c = rim('south', dS, x); if (c) return c; }
  }
  if (x < X_RISE + 6) { const c = trail(x, y); if (c) return c; }
  return tile(FLOOR4(col < 7 ? 'woods' : 'forest', col, row), x, y);
}

/** Le fond du lit sec. */
function bed(x: number, y: number): string {
  const col = Math.floor(x / T);
  const row = Math.floor(y / T);
  // à l'ouest, le lit se fond dans le sol du plateau
  if (x < X_BED0 + 10 + Math.round((wave(y, 0.9, 64) + 1) * 6)) {
    const c = trail(x, y);
    return c ?? tile(FLOOR4('woods', col, row), x, y);
  }
  // éboulis au pied de la paroi nord : quelques pierres tombées
  const foot = y - yN(x);
  if (x < X_CLIFF && foot <= 2 && TOP - bedZ(x) >= 6) {
    const n = hash(Math.floor(x / 2), foot, 63);
    if (n < 0.25) return foot === 0 ? 'z' : 'r';
  }
  const c = trodden(x, y);
  if (c) return c;
  return DRY_BED[variant(col, row, 4)].get(((x % T) + T) % T, ((y % T) + T) % T);
}

/** L'eau de la rivière, avec le pied mouillé de la falaise et le miroitement des coupures (image `f`). */
function river(x: number, y: number, f: number): string {
  const col = Math.floor(x / T);
  const c0 = tile(col === 26 ? 'water-13' : 'water-15', x, y);
  const foot = wetFoot(x - X_CLIFF, y);
  let c = foot ?? c0;
  // les coupures : la dernière rangée d'eau au nord du lit (y = Y_BED0 − 1) et la première au sud (y = Y_BED1)
  if (c0 === 'n' || c0 === 'g' || c0 === 'G' || c0 === 'v' || c0 === 'V' || c0 === 'y') return c0; // la berge est
  const dN = Y_BED0 - 1 - y;
  const dS = y - Y_BED1;
  const s = dN >= 0 && dN <= 1 ? shimmer(f, x - X_CLIFF, dN, 0) : dS >= 0 && dS <= 1 ? shimmer(f, x - X_CLIFF, dS, 1) : undefined;
  if (s) c = s;
  return c;
}

/** La rive est : forêt claire, puis l'herbe ; le chemin aux rangées 10 et 11 ; le lit qui mord un peu sur la rive. */
function eastBank(x: number, y: number): string {
  const col = Math.floor(x / T);
  const row = Math.floor(y / T);
  if (y >= Y_BED0 && y < Y_BED1 && (row < 10 || row > 11) && x - X_BED1 < 1 + Math.round((wave(y, 1.7, 64) + 1) * 1.5)) return bed(X_BED1 - 1, y);
  if (row === 10) return tile('path-14', x, y);
  if (row === 11) return tile('path-11', x, y);
  return tile(col < 31 ? FLOOR4('forest', col, row) : GRASS6(col, row), x, y);
}

/** La matière du sol au point (x, y) du monde, image `f` du miroitement. */
export function groundAt(x: number, y: number, f: number): string {
  if (inBed(x, y)) {
    // le lit sous l'ancienne rivière, contre l'eau coupée : la rangée sèche qui touche l'eau prend l'éclat du miroitement
    if (x >= X_CLIFF) {
      const s = y === Y_BED0 ? shimmer(f, x - X_CLIFF, -1, 0) : y === Y_BED1 - 1 ? shimmer(f, x - X_CLIFF, -1, 1) : undefined;
      if (s) return s;
    }
    return bed(x, y);
  }
  if (x < X_CLIFF) return plateau(x, y);
  if (x < X_BED1) return river(x, y, f);
  return eastBank(x, y);
}

/** Le point (x, y, z) est-il dans l'ombre du terrain ? On remonte le rayon vers la lumière (nord-ouest, en haut). */
function shaded(x: number, y: number, z: number): boolean {
  for (let t = 1; t <= TOP; t++) {
    if (heightAt(Math.round(x - SHADOW.dx * t), Math.round(y - SHADOW.dy * t)) - z >= t) return true;
  }
  return false;
}

export interface Rendered {
  grid: Grid;
  /** 1 : le pixel de l'écran est dans l'ombre portée du terrain. */
  shadow: Uint8Array;
  /** La hauteur du sol vu à chaque pixel (−1 : une face de la paroi). */
  height: Int16Array;
}

let shadowCache: Uint8Array | undefined;

/** Rend le terrain à l'écran (W × H), image `f` du miroitement. */
export function render(f = 0): Rendered {
  const rows: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill('.'));
  const height = new Int16Array(W * H).fill(-2);
  for (let x = 0; x < W; x++) {
    let prev = heightAt(x, 0);
    for (let y = 0; y < H + TOP + 4; y++) {
      const h = heightAt(x, y);
      if (y > 0 && prev > h) {
        // la face tournée vers le sud : de la lèvre (prev) au fond (h)
        for (let z = h + 1; z <= prev; z++) {
          const sy = y - z;
          if (sy < 0 || sy >= H) continue;
          rows[sy][x] = rockFace(x, z - 1, h, TOP);
          height[sy * W + x] = -1;
        }
      }
      const sy = y - h;
      if (sy >= 0 && sy < H) {
        rows[sy][x] = groundAt(x, y, f);
        height[sy * W + x] = h;
      }
      prev = h;
    }
  }
  // les touffes et racines qui pendent de la lèvre sud par-dessus le fond du lit
  for (let x = X_BED0; x < X_CLIFF; x++) {
    if (TOP - bedZ(x) < 8) continue;
    const n = overhang(x);
    const sy0 = yS(x) - TOP; // la crête de la lèvre à l'écran
    for (let j = 1; j <= n; j++) if (sy0 - j >= 0 && height[(sy0 - j) * W + x] !== TOP) rows[sy0 - j][x] = j === n ? 'k' : 'l';
  }
  if (!shadowCache) {
    shadowCache = new Uint8Array(W * H);
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H + TOP + 4; y++) {
        const h = heightAt(x, y);
        const sy = y - h;
        if (sy < 0 || sy >= H || height[sy * W + x] !== h) continue;
        if (shaded(x, y, h)) shadowCache[sy * W + x] = 1;
      }
    }
  }
  return { grid: rows.map((r) => r.join('')), shadow: shadowCache, height };
}

// ---------- ce qui est posé : arbres et Xéros ----------

export interface Placed {
  /** clé de l'image (src/generated/<clé>.png) ou 'xeros' / 'xeros-left'. */
  key: string;
  /** Le pied, au sol, en px du monde. */
  x: number;
  y: number;
  label?: string;
}

const at = (col: number, row: number, dx = 0, dy = 0) => ({ x: col * T + 16 + dx, y: row * T + 16 + dy });

export const TREES: Placed[] = [
  { key: 'big-tree', ...at(1, 5, 4, 6) },
  { key: 'normal-tree', ...at(5, 4, -6, 10) },
  { key: 'big-tree', ...at(9, 5, 0, 8) },
  { key: 'normal-tree', ...at(13, 3, 8, 4) },
  { key: 'normal-tree', ...at(16, 5, -4, 12) },
  { key: 'big-tree', ...at(19, 4, 6, 0) },
  { key: 'normal-tree', ...at(3, 16, 4, 8) },
  { key: 'big-tree', ...at(8, 17, -4, 10) },
  { key: 'normal-tree', ...at(13, 16, 6, 14) },
  { key: 'normal-tree', ...at(17, 19, -2, 4) },
  { key: 'big-tree', ...at(11, 21, 0, 12) },
  { key: 'normal-tree', ...at(20, 16, -6, 10) },
  { key: 'normal-tree', ...at(5, 21, 2, 20) },
  { key: 'normal-tree', ...at(33, 4, 0, 6) },
  { key: 'big-tree', ...at(32, 18, 8, 10) },
];

export const XEROS: Placed[] = [
  { key: 'xeros', ...at(29, 11), label: 'en bas, 0 m' },
  { key: 'xeros', ...at(12, 11), label: 'sur la pente' },
  { key: 'xeros', ...at(1, 11), label: 'en haut, 3 m' },
  { key: 'xeros-left', ...at(27, 17, -8), label: 'au bord de l eau' },
];
