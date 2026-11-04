// ÉTAT VALIDÉ du 4 novembre, figé (art/world/relief.ts) : la scène d'avant les deux corrections. Ne pas modifier.
//
// La scène des dessins définitifs du chemin creux (chantier « relief », hors jeu) : le terrain de l'essai 4 (le même modèle de
// hauteur, art/proposals/relief-creux4-scene.ts, qui reste intact), rendu cette fois avec les MATIÈRES et les OBJETS définitifs
// (art/proposals/relief-final.ts) posés comme le jeu les posera :
//   - le sol du couloir : les tuiles `lane-<mask>` (deux rangées, 14 en haut et 11 en bas), le chemin `path` qui continue d'un
//     côté et de l'autre, `path-lane-w` et `path-lane-e` au raccord ; la bande de 2,5 m qui ondule prend les rangées des tuiles par
//     ses deux bords (le haut de la tuile du haut contre le pied nord, le bas de la tuile du bas contre le pied sud) ;
//   - le dessus des talus plantés : `bank-0..3` ; le talus sud, qui regarde le nord, la même tuile à l'ombre ;
//   - toute face tournée vers le sud (paroi nord, flancs des talus vus du sud) : `relief-face-earth` (au-dessus de l'eau :
//     `relief-face-wet`), lue depuis son pied (la rangée 99), sa lèvre `relief-lip` sur l'arête ;
//   - la face est de la falaise en raccourci : `relief-face-raked` posé en bande à l'écran ;
//   - la coupure de l'eau : `water-cut` puis `shimmer` ;
//   - la voûte : le rideau `lane-curtain`, les avancées `lane-overhang-1..3` et les arbres du jeu, debout (aucun arbre penché).
// Planches : tools/essai-relief-final.ts.

import tileset from '../world/tiles';
import {
  COLS, floorZ, H, heightOf, OY, RAKE, ROW0, SH, T, talusRun, terrain, TOP, W, wallZ, XC, XE, XR, XT, Z, axisY, xerosAt,
  type Placed, type Pose, type Rendered, type Terrain,
} from './relief-creux4-scene';
import { hash, wave } from './relief-a';
import {
  bankTile, curtain, faceEarth, faceWet, FACE_H, lane, lip, LIP_CREST, overhang, pathLane, PROPS, rakedEast, RAKE_H, RAKE_W,
  rotate, shimmer, waterCut,
} from '../world/relief';

export { COLS, H, OY, RAKE, ROW0, SH, T, TOP, W, XC, XE, XR, XT, Z, axisY, floorZ, heightOf, terrain, wallZ, xerosAt };
export type { Placed, Pose, Rendered, Terrain };

// ---------- les dessins, une fois ----------

const BANK = [0, 1, 2, 3].map((k) => bankTile(k));
/** Le talus sud regarde le nord : la même tuile, à l'ombre (chaque teinte d'un cran plus sombre). */
const SHADE: Record<string, string> = { g: 'v', v: 'V', G: 'v', '6': '8', '7': '6', '2': '3', '9': '3', e: '3', m: 'N', L: 'l', j: 'L' };
const BANK_SHADE = BANK.map((b) => { const c = bankTile(0); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const ch = b.get(x, y); c.set(x, y, SHADE[ch] ?? ch); } return c; });
const EARTH = [0, 1, 2].map((k) => faceEarth(k));
const WET = [0, 1].map((k) => faceWet(k));
const LIP = [0, 1].map((k) => lip(k));
const RAKED = [0, 1].map((k) => rakedEast(k));
const CUT_S = waterCut();
const CUT_N = rotate(waterCut(), 2);
const LANES = new Map<string, ReturnType<typeof lane>>();
const laneTile = (m: number, v: number) => { const k = `${m}:${v}`; if (!LANES.has(k)) LANES.set(k, lane(m, v)); return LANES.get(k)!; };
const tile = (name: string, x: number, y: number) => tileset.tiles[name][((y % T) + T) % T][((x % T) + T) % T];
const variantOf = (col: number, row: number, n: number, s = 77) => Math.floor(hash(col, row, s) * n);
const FLOOR4 = (name: string, col: number, row: number) => { const v = variantOf(col, row, 4); return v ? `${name}${v + 1}` : name; };
const GRASS6 = (col: number, row: number) => { const v = variantOf(col, row, 6); return v ? `grass${v + 1}` : 'grass'; };

// ---------- la géométrie de l'essai 4 qui n'est pas exportée ----------

const halfWidth = (x: number, side: number) => 25 + wave(x, side * 2.3 + 1, 260) * 2.5;
const steep = (x: number) => (x < XC ? 0 : x < XR ? 1 : Math.max(0, 1 - (x - XR) / 64));
const crestAt = (x: number) => Math.round(14 - 8 * steep(x));
const outerRunAt = (x: number, Hw: number) => (Hw * 0.9 + 4) * (1 - steep(x)) + Hw * 0.22 * steep(x);

// ---------- les tuiles du couloir et du chemin ----------

/** Les deux rangées du couloir (cases), et la rangée du chemin qui le prolonge (la plus basse des deux). */
const LANE_ROWS = [15, 16];
const PATH_ROW = 16;
const LANE_C0 = 5;
const LANE_C1 = 59;
type Cell = 'lane' | 'path' | 'path-lane-w' | 'path-lane-e' | undefined;
function cellAt(c: number, r: number): Cell {
  if (c >= LANE_C0 && c <= LANE_C1 && LANE_ROWS.includes(r)) return 'lane';
  if (r !== PATH_ROW) return undefined;
  if (c === LANE_C1 + 1) return 'path-lane-w';
  if (c === LANE_C0 - 1) return 'path-lane-e';
  if (c > LANE_C1 + 1 || (c < LANE_C0 - 1 && c >= 0)) return 'path';
  return undefined;
}
/** Le masque d'une case : `lane` et `path` se comptent l'un pour l'autre comme voisins. */
const maskAt = (c: number, r: number) => (cellAt(c, r - 1) ? 1 : 0) | (cellAt(c + 1, r) ? 2 : 0) | (cellAt(c, r + 1) ? 4 : 0) | (cellAt(c - 1, r) ? 8 : 0);
const PATH_LANE = new Map<string, ReturnType<typeof pathLane>>();
function pathLaneTile(m: number, side: 'w' | 'e') {
  const k = `${side}${m}`;
  if (!PATH_LANE.has(k)) PATH_LANE.set(k, pathLane(m, side, tileset.tiles[`path-${m}`]));
  return PATH_LANE.get(k)!;
}

/** Le chemin et ses raccords au point (x, y) du monde, ou undefined hors du chemin. */
function pathTileAt(x: number, y: number): string | undefined {
  const c = Math.floor(x / T);
  const rr = Math.floor(y / T);
  const k = cellAt(c, rr);
  if (k === 'path') return tile(`path-${maskAt(c, rr)}`, x, y);
  if (k === 'path-lane-w' || k === 'path-lane-e') return pathLaneTile(maskAt(c, rr), k === 'path-lane-w' ? 'w' : 'e').get(((x % T) + T) % T, ((y % T) + T) % T);
  return undefined;
}

/**
 * Le sol clair du couloir au point (x, y) : la bande de 2,5 m prend ses rangées par ses deux bords : à `a` px du pied nord, la
 * rangée `a` de la tuile du haut (masque de la rangée 15) ; à `b` px du pied sud, la rangée 63 − `b` (tuile du bas).
 */
function laneAt(t: Terrain, x: number, y: number): string {
  const yc = axisY(x);
  const top = yc - halfWidthAt(t, x, -1);
  const bot = yc + halfWidthAt(t, x, 1);
  const da = Math.floor(y - top);
  const db = Math.floor(bot - y);
  const c = Math.floor(x / T);
  const [rTop, rBot] = LANE_ROWS;
  const half = (bot - top) / 2;
  const [row, r] = da < half ? [Math.min(31, da), rTop] : [Math.max(32, 63 - db) - 32, rBot];
  const v = variantOf(c, r, 4, 79);
  return laneTile(maskAt(c, r), v ? v + 1 : 0).get(((x % T) + T) % T, row);
}
/** La demi-largeur du sol, de chaque côté, au point x (celle du modèle de l'essai 4, réduite sur le plateau comme lui). */
function halfWidthAt(_t: Terrain, x: number, side: number): number {
  const D = Math.max(0, wallZ(x) - floorZ(x));
  let hw = halfWidth(x, side);
  if (x < XC) hw *= Math.max(0.36, Math.min(1, D / 24));
  return hw;
}

// ---------- la matière de chaque point ----------

const bankAt = (x: number, y: number, shade: boolean) => {
  const c = Math.floor(x / T);
  const r = Math.floor(y / T);
  return (shade ? BANK_SHADE : BANK)[variantOf(c, r, 4, 81)].get(((x % T) + T) % T, ((y % T) + T) % T);
};
/** Une face tournée vers le sud au point x, à `up` px au-dessus de son pied : la face lue depuis sa rangée du bas. */
export function faceAt(x: number, up: number, wet: boolean): string {
  const seg = Math.floor(x / 64);
  const set = wet ? WET : EARTH;
  const f = set[variantOf(seg, 0, set.length, wet ? 83 : 85)];
  return f.get(((x % 64) + 64) % 64, Math.max(0, FACE_H - 1 - Math.round(up)));
}

function groundAt(t: Terrain, x: number, y: number): string {
  const k = y * W + x;
  const col = Math.floor(x / T);
  const row = Math.floor(y / T);
  const d = t.d[k];
  const p = pathTileAt(x, y);
  switch (t.zone[k]) {
    case Z.FLOOR:
      if (x >= LANE_C0 * T && x < (LANE_C1 + 1) * T) return laneAt(t, x, y);
      return p ?? (x < XC ? tile(FLOOR4('woods', col, row), x, y) : tile(GRASS6(col, row), x, y));
    case Z.NBANK:
      // le talus nord regarde le sud : une face, lue depuis son pied (le sol du couloir) ; à la bouche, où il n'a que quelques
      // dizaines de cm, une pente douce vue de dessus (la tuile)
      if (wallZ(x) - floorZ(x) < 10) return bankAt(x, y, false);
      return faceAt(x, t.h[k] - floorZ(x), false);
    case Z.SBANK:
      return bankAt(x, y, true);
    case Z.BERM: {
      // le flanc extérieur du talus sud, qui descend vers le sud : on le voit de face, comme une face (lue depuis le sol, 0) ;
      // le dessus et les pentes douces : la tuile
      const kn = Math.max(0, y - 1) * W + x;
      if (t.side[k] > 0 && t.h[kn] - t.h[k] >= 1) return faceAt(x, t.h[k], x >= XC && x < XR);
      return bankAt(x, y, false);
    }
    case Z.TRAIL:
    case Z.PATH:
      return p ?? (x < XC ? tile(FLOOR4('woods', col, row), x, y) : tile(GRASS6(col, row), x, y));
    case Z.RIVER: {
      if (XR - 1 - x < 2) return XR - 1 - x === 0 ? 'n' : 'q';
      // la coupure, contre le pied des flancs extérieurs : le liseré `water-cut`, puis le miroitement (image 1)
      const ef = Math.floor(d - t.hw[k] - t.run[k] - crestAt(x) - outerRunAt(x, TOP));
      const south = t.side[k] > 0;
      if (ef >= 0 && ef < 4) return (south ? CUT_S : CUT_N).get(((x % 32) + 32) % 32, south ? ef : 3 - ef);
      if (ef >= 4 && ef < 7) { const s = shimmer(1).get(((x % 32) + 32) % 32, ef - 4); if (s !== '.') return s; }
      if (x - XC < 2) return 'q';
      return tile('water-15', x, y);
    }
    case Z.PLATEAU:
      return p ?? tile(FLOOR4('woods', col, row), x, y);
    default:
      return p ?? tile(GRASS6(col, row), x, y);
  }
}

/** La pénombre du couloir sous ce que montre le pixel (0 à 1). */
function gloomAt(t: Terrain, x: number, y: number): number {
  const z = t.zone[y * W + x];
  if (z !== Z.FLOOR && z !== Z.NBANK && z !== Z.SBANK) return 0;
  return Math.max(0, wallZ(x) - floorZ(x)) / TOP;
}

/** Rend le terrain à l'écran (W × SH), avec les matières définitives. */
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
        // une face tournée vers le sud : celle du point du nord, de sa hauteur jusqu'à celle-ci
        const kn = k - W;
        const zn = t.zone[kn];
        const over = x >= XC && x < XR && t.side[kn] > 0 && zn === Z.BERM;
        // le pied de la face : le sol du couloir pour la paroi nord, le sol (0) pour le flanc extérieur d'un talus
        const foot = zn === Z.NBANK || zn === Z.PLATEAU ? floorZ(x) : 0;
        for (let z = h + 1; z <= prev; z++) {
          const sy = y - z + OY;
          if (sy < 0 || sy >= SH) continue;
          const i = sy * W + x;
          grid[sy][x] = faceAt(x, z - foot, over);
          dep[i] = y - 1;
          zone[i] = zn === Z.PLATEAU ? Z.NBANK : zn;
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
  // la lèvre sur l'arête de chaque face sud assez haute : la paroi nord et le flanc extérieur du talus sud
  for (let x = 0; x < W; x++) {
    const Hw = wallZ(x);
    const D = Hw - floorZ(x);
    const lipSeg = LIP[variantOf(Math.floor(x / 64), 1, 2, 87)];
    const lx = ((x % 64) + 64) % 64;
    const stamp = (yCrest: number, z: number) => {
      for (let j = 0; j < lipSeg.h; j++) {
        const ch = lipSeg.get(lx, j);
        if (ch === '.') continue;
        const sy = Math.round(yCrest - z + OY + j - LIP_CREST);
        if (sy < 0 || sy >= SH) continue;
        const i = sy * W + x;
        if (dep[i] > yCrest + 1) continue;
        grid[sy][x] = ch;
        if (dep[i] < yCrest) dep[i] = yCrest;
      }
    };
    if (D >= 8) stamp(Math.round(axisY(x) - halfWidthAt(t, x, -1) - talusRun(D, x, -1)), Math.round(Hw));
    if (x >= XC && x < XE - 10 && Hw >= 8) {
      // le flanc extérieur du talus sud : sa lèvre, là où le talus est (le rendu sans bord sud n'en a pas)
      const yc = Math.round(axisY(x) + halfWidthAt(t, x, 1) + talusRun(D, x, 1) + crestAt(x));
      if (t.zone[Math.min(H - 1, yc) * W + x] === Z.BERM) stamp(yc, Math.round(Hw));
    }
  }
  // la face est de la falaise, en raccourci : la bande `relief-face-raked` posée à l'écran (colonnes 0-11 de la lèvre au pied)
  const raked = new Uint8Array(W * SH);
  for (let y = 0; y < H; y++) {
    const top = t.h[y * W + XC - 1];
    const foot = t.h[y * W + XC];
    const hgt = top - foot;
    if (hgt < 4) continue;
    const bw = (RAKE * hgt) / TOP;
    for (let z = foot; z <= top; z++) {
      const u = (top - z) / hgt;
      const sy = y - z + OY;
      const i0 = Math.min(RAKE_W - 1, Math.round(bw * u));
      for (let j = 0; j <= 1; j++) {
        const x = XC + Math.min(RAKE_W - 1, i0 + j);
        if (sy < 0 || sy >= SH || x >= W) continue;
        const i = sy * W + x;
        if (dep[i] > y) continue;
        const tl = RAKED[variantOf(Math.floor(sy / RAKE_H), 2, 2, 89)];
        grid[sy][x] = tl.get(Math.min(RAKE_W - 1, i0 + j), ((sy % RAKE_H) + RAKE_H) % RAKE_H);
        dep[i] = y;
        zone[i] = Z.RAKE;
        raked[i] = 1;
      }
    }
  }
  // le lierre qui déborde sur l'eau (colonnes 12-23 de la bande), là où l'écran montre l'eau au pied de la falaise
  for (let sy = 0; sy < SH; sy++) {
    if (!raked[sy * W + XC + RAKE_W - 1]) continue;
    const tl = RAKED[variantOf(Math.floor(sy / RAKE_H), 2, 2, 89)];
    for (let i = RAKE_W; i < 2 * RAKE_W; i++) {
      const ch = tl.get(i, ((sy % RAKE_H) + RAKE_H) % RAKE_H);
      const x = XC + i;
      if (ch === '.' || zone[sy * W + x] !== Z.RIVER) continue;
      grid[sy][x] = ch;
      raked[sy * W + x] = 1;
    }
  }
  // l'ombre portée du terrain (SHADOW de src/config.ts : 0,25 px à l'est et 0,1 au sud par px de hauteur)
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

/** Les objets définitifs : leur image, et la rangée de l'image posée sur leur point (la crête du talus). */
export const OBJECTS: Record<string, { grid: string[]; root: number }> = {
  'lane-curtain': { grid: curtain().toGrid(), root: PROPS['lane-curtain'].root },
  'lane-overhang-1': { grid: overhang(1).toGrid(), root: PROPS['lane-overhang-1'].root },
  'lane-overhang-2': { grid: overhang(2).toGrid(), root: PROPS['lane-overhang-2'].root },
  'lane-overhang-3': { grid: overhang(3).toGrid(), root: PROPS['lane-overhang-3'].root },
};

const cell = (col: number, row: number) => ({ x: Math.round(col * T), y: Math.round((row - ROW0) * T) });

/**
 * Arbres (debout, ceux du jeu), buissons, fougères, et la voûte : le rideau de la bouche et les avancées. `vault` : posé au sud du
 * couloir (s'efface quand Xéros est dessous).
 */
export function plants(t: Terrain): Placed[] {
  const out: Placed[] = [];
  const r = (i: number, k: number) => hash(i, k, 801);
  const zoneAt = (x: number, y: number) => t.zone[Math.round(y) * W + Math.round(x)];
  const free = (x: number, y: number) => x > 6 && y > 6 && x < W - 6 && y < H - 4;
  // les lèvres : des arbres debout tous les 30 à 52 px, au ras de l'arête (au nord : contre la lèvre ; au sud : sur la crête)
  let i = 0;
  for (let x = 26; x < XE - 30; x += 30 + r(i, 0) * 22, i++) {
    for (const side of [-1, 1]) {
      if (r(i, side + 5) < 0.12) continue;
      const D = wallZ(x) - floorZ(x);
      if (x < XC && D < 14) continue;
      const off = halfWidthAt(t, x, side) + talusRun(D, x, side) + 2 + r(i, side + 7) * 4;
      const y = Math.round(axisY(x) + side * off);
      if (!free(x, y)) continue;
      const big = r(i, side + 9) < 0.5;
      const onBerm = x >= XC;
      const key = onBerm && wallZ(x) < 50 ? (r(i, side + 3) < 0.5 ? 'bush-berries' : 'bush') : big ? 'big-tree' : 'normal-tree';
      out.push({ key, x, y, z: heightOf(t, x, y), vault: side > 0 });
      if (r(i, side + 13) < 0.6) {
        const bx = Math.round(x + (r(i, side + 15) - 0.5) * 20);
        const by = Math.round(axisY(bx) + side * (off - 4));
        const zz = zoneAt(bx, by);
        if (free(bx, by) && (zz === Z.PLATEAU || zz === Z.BERM)) out.push({ key: r(i, side + 17) < 0.3 ? 'bush-berries' : 'bush', x: bx, y: by, z: heightOf(t, bx, by), vault: side > 0 });
      }
    }
  }
  // la forêt du plateau
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
    for (const side of [-1, 1]) {
      if (hash(x, side, 803) > 0.3) continue;
      const D = wallZ(x) - floorZ(x);
      if (D < 6) continue;
      const y = Math.round(axisY(x) + side * (halfWidthAt(t, x, side) + talusRun(D, x, side) + 4));
      if (free(x, y)) out.push({ key: hash(x, side, 804) < 0.6 ? 'decal-fern' : 'decal-tufts', x, y, z: heightOf(t, x, y), vault: side > 0 });
    }
  }
  // la ferme : les arbres qui bordent le chemin aujourd'hui
  for (const [c, rw] of [[54.0, 61.9], [53.9, 69.4], [48.1, 59.5], [47.8, 69.6], [63.5, 61.5], [66.2, 70.5]] as [number, number][]) {
    const p = cell(c, rw);
    out.push({ key: 'normal-tree', ...p, z: heightOf(t, p.x, p.y) });
  }
  // la voûte : le rideau de la bouche (sur le talus sud de l'entrée), puis les avancées, accrochées à la crête d'un talus
  const vault: [string, number, number][] = [
    // objet, x du centre, côté
    ['lane-curtain', 1770, 1],
    ['lane-overhang-2', 1690, -1], ['lane-overhang-1', 1600, 1], ['lane-overhang-3', 1530, -1], ['lane-overhang-3', 1515, 1],
    ['lane-overhang-1', 1440, 1], ['lane-overhang-2', 1370, -1], ['lane-overhang-3', 1300, 1], ['lane-overhang-1', 1210, -1],
    ['lane-overhang-2', 1150, 1], ['lane-overhang-3', 1060, -1], ['lane-overhang-1', 990, 1], ['lane-overhang-2', 900, -1],
    ['lane-overhang-3', 830, 1], ['lane-overhang-1', 740, -1], ['lane-overhang-2', 660, 1], ['lane-overhang-3', 580, -1],
    ['lane-overhang-1', 480, 1], ['lane-overhang-3', 400, -1],
  ];
  for (const [key, cx, side] of vault) {
    const D = wallZ(cx) - floorZ(cx);
    if (cx < XC && D < 20) continue;
    const y = Math.round(axisY(cx) + side * (halfWidthAt(t, cx, side) + talusRun(D, cx, side) + (side > 0 ? crestAt(cx) * 0.3 : 0)));
    out.push({ key, x: cx, y, z: Math.round(heightOf(t, cx, y)), vault: side > 0 });
  }
  return out;
}

export { cellAt, LANE_ROWS, PATH_ROW };
