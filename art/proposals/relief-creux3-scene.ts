// Troisième essai du chemin creux (chantier « relief », hors jeu) : le couloir suit la ligne du chemin d'aujourd'hui, d'est en
// ouest, rangées 65-66 de la zone ferme (tiled/maps/ferme.tmj). Un seul modèle de hauteur, rendu dans la vraie projection du jeu
// (docs/STYLE.md section 8 : un point (x, y) à la hauteur z se voit à l'écran en (x, y − z), 5 cm par pixel).
//
// La scène couvre les cases 0 à 69 et les rangées 50 à 79 de la ferme (une case = 32 px = 1,60 m), en px depuis le coin
// (case 0, rangée 50) :
//   - le plateau à 5 m (100 px) à l'ouest de la case 42 (x < XC) ; la falaise au pied ouest de l'eau, droite ;
//   - la rivière, cases 42 à 46 (XC ≤ x < XR), droite, sans décalage ; la ferme à 0 m à l'est de la case 47 ;
//   - le couloir, 2,50 m de sol qui ondule autour de la ligne des rangées 65-66 (y ≈ 512) :
//       · côté ferme, cases 60 → 47 (XE → XR, 20,8 m) : sol à 0 m entre deux talus plantés qui montent de 0 à 5 m ;
//       · à la rivière, cases 47 → 42 (8 m) : sol à 0 m, l'eau coupée net de part et d'autre, à ciel ouvert sous les feuillages ;
//       · côté plateau, cases 42 → 4,5 (60 m) : le sol monte de 0 à 5 m (8,3 %), les parois baissent de 5 m à 0 ; puis le sentier.
// Chaque colonne se peint du nord au sud ; chaque pixel de l'écran garde le y du monde de ce qu'il montre (`dep`). La face est
// de la falaise et la face ouest du talus de la ferme, verticales, sont montrées en raccourci (une bande de RAKE px pour 5 m).
// Matières : art/proposals/relief-creux.ts (essai 2) et relief-creux3.ts ; planches : tools/essai-relief-creux3.ts.

import tileset from '../world/tiles';
import { shimmer } from './relief-a';
import { bankAt, faceAt, floorAt, hash, lipBrush, strand, T, wave } from './relief-creux';
import { rakedFace } from './relief-creux3';

export { T };
export const COLS = 70;
export const ROWS = 30;
export const ROW0 = 50;
export const W = COLS * T;
export const H = ROWS * T;
export const TOP = 100;
export const OY = TOP;
export const SH = H + OY;
/** La falaise (case 42), la rive est (case 47), l'entrée du couloir (case 60), le haut de la pente (case 4,5). */
export const XC = 42 * T;
export const XR = 47 * T;
export const XE = 60 * T;
export const XT = Math.round(4.5 * T);
/** Largeur de la bande de la face est ou ouest en raccourci, pour 5 m (px). */
export const RAKE = 12;
/** La ligne du chemin d'aujourd'hui : le haut de la rangée 66. */
const Y0 = (66 - ROW0) * T;

/** L'axe du couloir : il ondule de ± 9 px (45 cm) autour de la ligne du chemin. */
export const axisY = (x: number) => Y0 + wave(x, 0.7, 520) * 6 + wave(x, 2.1, 190) * 3;
/** Hauteur du sol du couloir (px) : 0 à l'est de la falaise, puis 8,3 % jusqu'au plateau. */
export const floorZ = (x: number) => (x >= XC ? 0 : Math.max(0, Math.min(TOP, (TOP * (XC - x)) / (XC - XT))));
/** Hauteur des parois (px) : le plateau à l'ouest, rien sur l'eau, les talus de la ferme qui montent de 0 (XE) à 5 m (XR). */
export function wallZ(x: number): number {
  if (x < XC) return TOP;
  if (x < XR) return 0;
  if (x >= XE) return 0;
  const u = (XE - x) / (XE - XR);
  return TOP * (u * u * (3 - 2 * u)) ** 0.85;
}

export const Z = { GRASS: 0, RIVER: 1, PLATEAU: 2, FLOOR: 3, NBANK: 4, SBANK: 5, BERM: 6, PATH: 7, TRAIL: 8, RAKE: 9 } as const;

export interface Terrain {
  h: Int16Array;
  zone: Uint8Array;
  /** −1 au nord de l'axe, 1 au sud. */
  side: Int8Array;
  /** Distance à l'axe, demi-largeur du sol, emprise du talus (px). */
  d: Float32Array;
  hw: Float32Array;
  run: Float32Array;
}

const halfWidth = (x: number, side: number) => 25 + wave(x, side * 2.3 + 1, 260) * 2.5;
export const talusRun = (D: number, x: number, side: number) =>
  D < 0.5 ? 0 : 4 + D * 0.2 + wave(x, side * 1.9 + 0.4, 160) * D * 0.06 + (hash(Math.floor(x / 7), side, 601) < 0.2 ? 3 : 0);
const CREST = 14;
const outerRun = (Hw: number) => Hw * 0.9 + 4;

/** Le modèle de hauteur. `cut` : le bord sud du couloir retiré (ce qu'on voit à travers quand il s'efface, comme un toit). */
export function terrain(cut = false): Terrain {
  const n = W * H;
  const t: Terrain = { h: new Int16Array(n), zone: new Uint8Array(n), side: new Int8Array(n), d: new Float32Array(n), hw: new Float32Array(n), run: new Float32Array(n) };
  for (let x = 0; x < W; x++) {
    const yc = axisY(x);
    const zf = floorZ(x);
    const Hw = wallZ(x);
    const D = Math.max(0, Hw - zf);
    for (let y = 0; y < H; y++) {
      const k = y * W + x;
      const dy = y + 0.5 - yc;
      const d = Math.abs(dy);
      const side = dy < 0 ? -1 : 1;
      let hw = halfWidth(x, side);
      if (x < XC) hw *= Math.max(0.36, Math.min(1, D / 24));
      const run = talusRun(D, x, side);
      t.side[k] = side;
      t.d[k] = d;
      t.hw[k] = hw;
      t.run[k] = run;
      let h = 0;
      let z: number = Z.GRASS;
      if (x < XC && D < 0.5) {
        h = TOP;
        z = d < 8 + wave(x, 0.9, 80) * 1.5 ? Z.TRAIL : Z.PLATEAU;
      } else if (d <= hw && x < XE + 40) {
        h = Math.round(zf);
        z = Z.FLOOR;
      } else if (run > 0 && d < hw + run) {
        const u = (d - hw) / run;
        h = Math.min(TOP, Math.round(zf + D * u ** 1.25));
        z = side < 0 ? Z.NBANK : Z.SBANK;
      } else if (x < XC) {
        h = TOP;
        z = Z.PLATEAU;
      } else if (x < XR) {
        z = Z.RIVER;
      } else {
        const e = d - hw - run;
        const out = outerRun(Hw);
        if (Hw > 0.5 && e < CREST) { h = Math.round(Hw); z = Z.BERM; }
        else if (Hw > 0.5 && e < CREST + out) {
          const u = (e - CREST) / out;
          h = Math.round(Hw * (1 - u) ** 1.3);
          z = h > 0 ? Z.BERM : Z.GRASS;
        }
        if (z === Z.GRASS && x >= XE - 60 && d < 12 + wave(x, 2.2, 90) * 2) z = Z.PATH;
      }
      if (cut && side > 0 && z !== Z.FLOOR && d < hw + D + 30 && x < XE) {
        // le bord sud retiré : le sol du couloir prolongé (seul ce qui est derrière lui compte)
        h = Math.round(zf);
        z = x >= XC && x < XR ? Z.RIVER : Z.GRASS;
      }
      t.h[k] = h;
      t.zone[k] = z;
    }
  }
  return t;
}

const tile = (name: string, x: number, y: number) => tileset.tiles[name][((y % T) + T) % T][((x % T) + T) % T];
const variantOf = (col: number, row: number, n: number) => Math.floor(hash(col, row, 77) * n);
const FLOOR4 = (name: string, col: number, row: number) => { const v = variantOf(col, row, 4); return v ? `${name}${v + 1}` : name; };
const GRASS6 = (col: number, row: number) => { const v = variantOf(col, row, 6); return v ? `grass${v + 1}` : 'grass'; };

function lightAt(t: Terrain, x: number, y: number): number {
  const at = (a: number, b: number) => t.h[Math.max(0, Math.min(H - 1, b)) * W + Math.max(0, Math.min(W - 1, a))];
  const gx = at(x + 2, y) - at(x - 2, y);
  const gy = at(x, y + 2) - at(x, y - 2);
  const g = Math.hypot(gx, gy);
  return g ? (0.75 * gx + 0.66 * gy) / g : 0;
}

/** La matière du sol au point (x, y) du monde. */
function groundAt(t: Terrain, x: number, y: number): string {
  const k = y * W + x;
  const col = Math.floor(x / T);
  const row = Math.floor(y / T);
  const d = t.d[k];
  switch (t.zone[k]) {
    case Z.FLOOR: {
      const edge = t.hw[k] - d;
      // sur la rivière : l'eau coupée net, un liseré mouillé et le miroitement contre elle
      if (x >= XC && x < XR) {
        if (edge < 1) { const s = shimmer(0, x - XC, -1, t.side[k] < 0 ? 0 : 1); if (s) return s; return '$'; }
        if (edge < 3 && hash(Math.floor(x / 3), y, 621) < 0.6) return '$';
        return floorAt(x, y, 30, d);
      }
      // à l'est, le sol clair naît du chemin de la ferme ; à l'ouest, il se fond dans le sentier du plateau
      if (x > XE - 80 + wave(y, 0.4, 23) * 6 + wave(y, 1.9, 9) * 3) return pathAt(x, y);
      const D = TOP - floorZ(x);
      if (x < XC && D < 36 && d > 4 && d > t.hw[k] * (D / 36) + wave(x, 0.8, 21) * 3) {
        return d < 9 ? pathAt(x, y) : tile(FLOOR4('woods', col, row), x, y);
      }
      return floorAt(x, y, edge, d);
    }
    case Z.NBANK: {
      // le talus nord regarde le sud : on le voit de face, comme une paroi
      const Hw = wallZ(x);
      return faceAt(x, Math.max(0, Hw - t.h[k]), Math.max(4, Hw - floorZ(x)));
    }
    case Z.SBANK:
      return bankAt(x, y, (d - t.hw[k]) / Math.max(1, t.run[k]), lightAt(t, x, y));
    case Z.BERM: {
      // les talus de la ferme, plantés : l'herbe de la ferme, plus sombre, mangée de ronces et de jeunes pousses en touffes
      const e = d - t.hw[k] - t.run[k];
      const c = lipBrush(Math.floor(e), x, t.side[k] + 7);
      if (c && e < 8) return c;
      const clump = hash(Math.floor((x + (Math.floor(y / 4) % 2) * 2) / 4), Math.floor(y / 4), 631);
      if (clump < 0.22) {
        const g = hash(x, y, 632);
        const top = hash(Math.floor((x + (Math.floor((y - 1) / 4) % 2) * 2) / 4), Math.floor((y - 1) / 4), 631) >= 0.22;
        return top ? (g < 0.6 ? 'L' : 'j') : g < 0.55 ? 'l' : 'k';
      }
      if (clump > 0.93) return hash(x, y, 633) < 0.5 ? '3' : 'e';
      const g = tile(GRASS6(col, row), x, y);
      return g === 'G' || g === 'y' ? 'g' : g === 'g' ? 'v' : g;
    }
    case Z.TRAIL:
      return pathAt(x, y);
    case Z.PATH:
      return pathAt(x, y);
    case Z.RIVER: {
      if (XR - 1 - x < 2) return XR - 1 - x === 0 ? 'n' : 'q';
      // les deux coupures de l'eau : la dernière rangée contre le couloir s'éclaire, le miroitement y glisse
      const e = d - t.hw[k];
      if (e >= 0 && e < 2) { const s = shimmer(0, x - XC, Math.floor(e), t.side[k] < 0 ? 0 : 1); if (s) return s; }
      if (x - XC < 2) return 'q';
      return tile('water-15', x, y);
    }
    case Z.PLATEAU: {
      const D = TOP - floorZ(x);
      const e = d - t.hw[k] - t.run[k];
      if (D >= 10 && e >= 0) { const c = lipBrush(Math.floor(e), x, t.side[k] + 1); if (c) return c; }
      const dE = XC - 1 - x;
      if (dE >= 0 && dE < 10) { const c = lipBrush(dE, y, 3); if (c) return c; }
      return tile(FLOOR4('woods', col, row), x, y);
    }
    default:
      return tile(GRASS6(col, row), x, y);
  }
}

function pathAt(x: number, y: number): string {
  const n = hash(x, y, 63);
  const half = 12 + wave(x, 2.2, 90) * 2;
  const dd = Math.abs(y + 0.5 - axisY(x));
  if (dd > half) return x < XC ? tile(FLOOR4('woods', Math.floor(x / T), Math.floor(y / T)), x, y) : tile(GRASS6(Math.floor(x / T), Math.floor(y / T)), x, y);
  if (dd > half - 1.5) return 'e';
  return n < 0.65 ? 'u' : n < 0.86 ? 'n' : 'U';
}

export interface Rendered {
  grid: string[][];
  dep: Int32Array;
  zone: Uint8Array;
  shadow: Uint8Array;
  /** La pénombre du couloir sous ce que montre le pixel (0 à 1 : la profondeur des parois rapportée à 5 m). */
  gloom: Float32Array;
}

/** La pénombre du couloir au point du monde : la profondeur des parois, et sous la voûte au-dessus de l'eau, un peu. */
export function gloomAt(t: Terrain, x: number, y: number): number {
  const k = y * W + x;
  const z = t.zone[k];
  if (z !== Z.FLOOR && z !== Z.NBANK && z !== Z.SBANK) return 0;
  if (x >= XC && x < XR) return 0.35;
  return Math.max(0, wallZ(x) - floorZ(x)) / TOP;
}

/** Rend le terrain à l'écran (W × SH). */
export function render(t: Terrain): Rendered {
  const grid: string[][] = Array.from({ length: SH }, () => new Array<string>(W).fill('.'));
  const dep = new Int32Array(W * SH).fill(-1);
  const zone = new Uint8Array(W * SH);
  const gloom = new Float32Array(W * SH);
  for (let x = 0; x < W; x++) {
    let prev = t.h[x];
    for (let y = 0; y < H; y++) {
      const k = y * W + x;
      const h = t.h[k];
      if (y > 0 && prev > h) {
        const kn = k - W;
        const zn = t.zone[kn];
        for (let z = h + 1; z <= prev; z++) {
          const sy = y - z + OY;
          if (sy < 0 || sy >= SH) continue;
          const i = sy * W + x;
          let c: string;
          if (zn === Z.NBANK || zn === Z.PLATEAU) c = faceAt(x, Math.max(0, wallZ(x) - z), Math.max(4, wallZ(x) - floorZ(x)));
          else c = groundAt(t, x, y - 1);
          grid[sy][x] = c;
          dep[i] = y - 1;
          zone[i] = zn;
          gloom[i] = gloomAt(t, x, y - 1);
        }
      }
      const sy = y - h + OY;
      if (sy >= 0 && sy < SH) {
        const i = sy * W + x;
        grid[sy][x] = groundAt(t, x, y);
        dep[i] = y;
        zone[i] = t.zone[k];
        gloom[i] = gloomAt(t, x, y);
      }
      prev = h;
    }
  }
  // les racines qui pendent de la lèvre de la paroi nord (vues de face)
  for (let x = 2; x < XE - 20; x += 2) {
    if (x >= XC && x < XR) continue;
    const n = hash(x, 7, 701);
    const D = wallZ(x) - floorZ(x);
    if (n > 0.4 || D < 12) continue;
    const yl = Math.round(axisY(x) - halfWidth(x, -1) - talusRun(D, x, -1));
    const top = yl - Math.round(wallZ(x)) + OY + 2;
    const len = Math.floor(D * (n < 0.12 ? 0.75 : 0.35) * (0.5 + hash(x, 8, 702) * 0.5));
    for (const [px, py, c] of strand(x, top, len, 700 + x, hash(x, 9, 703) < 0.35).px) {
      if (px < 0 || py < 0 || px >= W || py >= SH) continue;
      if (zone[py * W + px] === Z.NBANK || zone[py * W + px] === Z.PLATEAU && dep[py * W + px] >= yl - 2) grid[py][px] = c;
    }
  }
  // les faces est (falaise) et ouest (bout du talus de la ferme), montrées en raccourci : une bande qui s'élargit vers le pied
  const raked = new Uint8Array(W * SH);
  const rake = (xEdge: number, dir: 1 | -1, lit: boolean) => {
    for (let y = 0; y < H; y++) {
      const top = t.h[y * W + xEdge - (dir > 0 ? 1 : 0)];
      const foot = t.h[y * W + xEdge - (dir > 0 ? 0 : 1)];
      const hgt = top - foot;
      if (hgt < 4) continue;
      const bw = (RAKE * hgt) / TOP;
      for (let z = foot; z <= top; z++) {
        const u = (top - z) / hgt;
        const sy = y - z + OY;
        for (let j = 0; j <= 1; j++) {
          const x = Math.round(xEdge + dir * (bw * u + j * 0.5) - (dir > 0 ? 0 : 1));
          if (sy < 0 || sy >= SH || x < 0 || x >= W) continue;
          const i = sy * W + x;
          if (dep[i] > y) continue;
          grid[sy][x] = rakedFace(u, y, lit);
          dep[i] = y;
          zone[i] = Z.RAKE;
          raked[i] = 1;
        }
      }
      // le lierre qui pend jusque sur l'eau
      if (hash(Math.floor(y / 3), 2, 955) < 0.3) {
        const x = Math.round(xEdge + dir * (bw + 1)) - (dir > 0 ? 0 : 1);
        const len = 2 + Math.floor(hash(y, 3, 956) * 4);
        for (let j = 0; j < len; j++) {
          const sy = y - foot + OY - j;
          if (sy < 0 || sy >= SH || x < 0 || x >= W) continue;
          if (dep[sy * W + x] > y) continue;
          grid[sy][x] = j === 0 ? 'k' : j % 2 ? 'l' : 'L';
          raked[sy * W + x] = 1;
        }
      }
    }
  };
  rake(XC, 1, false);
  rake(XR, -1, true);
  // l'ombre portée du terrain (SHADOW de src/config.ts)
  const shadow = new Uint8Array(W * SH);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const k = y * W + x;
    const h = t.h[k];
    if (h >= TOP) continue;
    const sy = y - h + OY;
    if (sy < 0 || sy >= SH || dep[sy * W + x] !== y || raked[sy * W + x]) continue;
    for (let s = 1; s <= TOP - h; s++) {
      const ax = Math.round(x - 0.25 * s);
      const ay = Math.round(y - 0.1 * s);
      if (ax < 0 || ay < 0) break;
      if (t.h[ay * W + ax] - h >= s) { shadow[sy * W + x] = 1; break; }
    }
  }
  return { grid, dep, zone, shadow, gloom };
}

// ---------- ce qui est posé ----------

export interface Placed {
  key: string;
  x: number;
  y: number;
  z: number;
  /** Penché : le haut de l'image décalé de (lx, ly) px. */
  lx?: number;
  ly?: number;
  /** Fait partie du bord sud ou de la voûte : s'efface quand Xéros est dessous. */
  vault?: boolean;
  /** Pour un capuchon : le bas de l'image descend de tant de px sous le pied soulevé. */
  hang?: number;
}

export const heightOf = (t: Terrain, x: number, y: number) => t.h[Math.max(0, Math.min(H - 1, Math.round(y))) * W + Math.max(0, Math.min(W - 1, Math.round(x)))];
const cell = (col: number, row: number) => ({ x: Math.round(col * T), y: Math.round((row - ROW0) * T) });

/** Arbres, buissons, fougères, capuchons de feuillage. */
export function plants(t: Terrain): Placed[] {
  const out: Placed[] = [];
  const r = (i: number, k: number) => hash(i, k, 801);
  const zoneAt = (x: number, y: number) => t.zone[Math.round(y) * W + Math.round(x)];
  const free = (x: number, y: number) => x > 6 && y > 6 && x < W - 6 && y < H - 4;
  // les lèvres : de part et d'autre, un arbre tous les 34 à 60 px. Au nord il se penche vers le sud, au-dessus du couloir (son
  // houppier descend à l'écran) ; au sud il est droit, son houppier couvre déjà le couloir à l'écran.
  let i = 0;
  for (let x = 30; x < XE - 30; x += 34 + r(i, 0) * 26, i++) {
    if (x > XC - 8 && x < XR + 8) continue;
    for (const side of [-1, 1]) {
      if (r(i, side + 5) < 0.18) continue;
      const D = wallZ(x) - floorZ(x);
      if (x < XC && D < 14) continue;
      const off = halfWidth(x, side) + talusRun(D, x, side) + 2 + r(i, side + 7) * 6;
      const y = Math.round(axisY(x) + side * off);
      if (!free(x, y)) continue;
      const big = r(i, side + 9) < 0.45;
      // côté ferme, sur les talus : de petits arbres et des buissons, les talus étant plus bas
      const onBerm = x >= XR;
      const key = onBerm && wallZ(x) < 50 ? (r(i, side + 3) < 0.5 ? 'bush-berries' : 'bush') : big ? 'big-tree' : 'normal-tree';
      const lean = side < 0 && key.endsWith('tree') ? Math.round(18 + r(i, side + 11) * 10) : 0;
      out.push({ key, x, y, z: heightOf(t, x, y), lx: Math.round((r(i, 12) - 0.5) * 8), ly: lean, vault: side > 0 });
      if (r(i, side + 13) < 0.6) {
        const bx = Math.round(x + (r(i, side + 15) - 0.5) * 20);
        const by = Math.round(axisY(bx) + side * (off - 6));
        const zz = zoneAt(bx, by);
        if (free(bx, by) && (zz === Z.PLATEAU || zz === Z.BERM)) out.push({ key: r(i, side + 17) < 0.3 ? 'bush-berries' : 'bush', x: bx, y: by, z: heightOf(t, bx, by), vault: side > 0 });
      }
    }
  }
  // la falaise : deux arbres au bord, penchés au-dessus de la coupure de l'eau ; la ferme : leurs voisins sur le talus, penchés aussi
  out.push({ key: 'big-tree', x: XC - 18, y: Math.round(axisY(XC) - 62), z: TOP, lx: 22, ly: 16 });
  out.push({ key: 'normal-tree', x: XC - 14, y: Math.round(axisY(XC) + 58), z: TOP, lx: 18, vault: true });
  out.push({ key: 'normal-tree', x: XR + 16, y: Math.round(axisY(XR) - 60), z: heightOf(t, XR + 16, axisY(XR) - 60), lx: -18, ly: 14 });
  out.push({ key: 'big-tree', x: XR + 22, y: Math.round(axisY(XR) + 62), z: heightOf(t, XR + 22, axisY(XR) + 62), lx: -16, vault: true });
  // la forêt du plateau : une grille lâche, plus clairsemée autour de la sortie ; aucun arbre couché
  for (let gy = 16; gy < H; gy += 66) for (let gx = 20; gx < XC - 20; gx += 62) {
    const j = gx * 31 + gy;
    const x = Math.round(gx + (hash(j, 1, 802) - 0.5) * 48 + ((gy / 66) % 2) * 28);
    const y = Math.round(gy + (hash(j, 2, 802) - 0.5) * 50);
    if (!free(x, y) || zoneAt(x, y) !== Z.PLATEAU || Math.abs(y - axisY(x)) < 70 || x > XC - 14) continue;
    const nearExit = x < 640 && Math.abs(y - axisY(x)) < 240;
    if (hash(j, 4, 802) < (nearExit ? 0.78 : 0.2) || out.some((p) => Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 24)) continue;
    const n = hash(j, 3, 802);
    if (n < 0.62) out.push({ key: n < 0.24 ? 'big-tree' : 'normal-tree', x, y, z: TOP });
    else if (n < 0.84) out.push({ key: 'bush', x, y, z: TOP });
    else out.push({ key: 'decal-fern', x, y, z: TOP });
  }
  // fougères et touffes sur les lèvres
  for (let x = 12; x < XE; x += 13) {
    if (x > XC - 6 && x < XR + 6) continue;
    for (const side of [-1, 1]) {
      if (hash(x, side, 803) > 0.3) continue;
      const D = wallZ(x) - floorZ(x);
      if (D < 6) continue;
      const y = Math.round(axisY(x) + side * (halfWidth(x, side) + talusRun(D, x, side) + 4));
      if (free(x, y)) out.push({ key: hash(x, side, 804) < 0.6 ? 'decal-fern' : 'decal-tufts', x, y, z: heightOf(t, x, y), vault: side > 0 });
    }
  }
  // la ferme : les arbres qui bordent le chemin aujourd'hui (ferme.tmj), là où les talus les portent
  for (const [c, rw] of [[54.0, 61.9], [53.9, 69.4], [48.1, 59.5], [47.8, 69.6], [63.5, 61.5], [66.2, 70.5]] as [number, number][]) {
    const p = cell(c, rw);
    out.push({ key: 'normal-tree', ...p, z: heightOf(t, p.x, p.y) });
  }
  // les capuchons : sur la ferme, le rideau de l'entrée, grand et bas, qui déborde largement sur les talus ; puis, au-dessus du
  // couloir, des capuchons accrochés aux lèvres (au sud : ils pendent devant le couloir ; au nord : sur la paroi)
  const hoods: [number, number, number, number, number, number][] = [
    // x du centre, côté, largeur, hauteur, épaisseur de la crête, pend (px)
    [1770, 1, 230, 78, 30, 40], [1700, -1, 180, 62, 22, 18], [1600, 1, 150, 56, 22, 26],
    [1180, 1, 160, 50, 20, 18], [980, -1, 150, 46, 18, 10], [820, 1, 150, 48, 18, 16], [600, -1, 130, 40, 16, 8], [440, 1, 120, 34, 14, 10],
  ];
  hoods.forEach(([cx, side, w, h, body, hang], k) => {
    const D = wallZ(cx) - floorZ(cx);
    const y = Math.round(axisY(cx) + side * (halfWidth(cx, side) + talusRun(D, cx, side) - 2));
    out.push({ key: `hood:${960 + k}:${w}:${h}:${body}`, x: cx, y, z: Math.round(wallZ(cx)), hang, vault: side > 0 });
  });
  // au-dessus de l'eau coupée, à ciel ouvert : deux capuchons qui avancent du haut de la falaise et du bout du talus, au-dessus
  // du couloir (à 5 m : à l'écran, ils passent au-dessus de l'eau du nord), et ferment presque la voûte
  out.push({ key: 'hood:990:120:52:24', x: XC + 46, y: Math.round(axisY(XC + 46)), z: TOP, hang: 14, vault: true });
  out.push({ key: 'hood:991:104:48:22', x: XR - 44, y: Math.round(axisY(XR - 44)), z: TOP, hang: 12, vault: true });
  return out;
}

export interface Pose { key: string; x: number; dy?: number; label: string }

/** Xéros sur l'axe, à x. */
export function xerosAt(t: Terrain, p: Pose): Placed {
  const y = Math.round(axisY(p.x) + (p.dy ?? 0));
  return { key: p.key, x: p.x, y, z: heightOf(t, p.x, y) };
}
