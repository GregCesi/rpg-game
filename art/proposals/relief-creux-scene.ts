// La scène du chemin creux (chantier « relief », essai hors jeu) : un seul modèle de hauteur, rendu dans la vraie projection du jeu
// (docs/STYLE.md section 8 : un point au sol (x, y) à la hauteur z se voit à l'écran en (x, y − z), 5 cm par pixel).
//
// Le terrain, en px du monde (1 px = 5 cm), 1 100 × 1 300 px (55 × 65 m) :
//   - la ferme à l'est, à 0 m ; la rivière de 8 m (160 px) qui coule nord-sud ; à l'ouest, le plateau à 5 m (100 px), bordé par la
//     falaise le long de la rive ouest ;
//   - LE TRACÉ : la rivière est coupée net sur 3 m (le lit sec, Y_FACE à Y_DRY1) et reprend décalée de 7 m vers l'ouest. Le pied
//     de la falaise fait donc, à la coupure, un redan : le plateau au nord du passage avance de 7 m vers l'est (un promontoire), et
//     sa face sud, tournée vers la ferme, se voit en vraie grandeur (5 m = 100 px). La bouche s'ouvre dans cette face ; le couloir
//     monte vers le nord en ondulant, puis tourne vers l'ouest quand il n'a plus que 1,30 m de fond, et sort sur le plateau.
//     Pourquoi : un couloir nord-sud montre son sol clair entre ses deux parois (vues de dessus, sur leur emprise) ; un couloir
//     est-ouest de 2,50 m dans 5 m serait caché par la lèvre sud, soulevée de 100 px, sur toute sa largeur tant qu'il a plus de
//     2,50 m de fond (on ne voit que sa paroi nord) ;
//   - le couloir : 2,50 m de sol (50 px, ± 3), ses talus de terre de part et d'autre, 60 m de long (1 200 px) de 0 à 5 m (8,3 %).
// Chaque colonne se peint du nord au sud : le sol d'un point se pose à y − h ; quand le sol descend vers le sud, la face tournée
// vers le sud (vraie grandeur) remplit l'écart ; ce qui est plus au sud recouvre ce qui est derrière. Chaque pixel de l'écran
// garde le y du monde de ce qu'il montre (`dep`) : les arbres et Xéros s'y glissent devant ou derrière, au pixel près.
// Les matières : art/proposals/relief-creux.ts ; la planche : tools/essai-relief-creux.ts. Hors jeu.

import tileset from '../world/tiles';
import { DRY_BED, shimmer, wetFoot } from './relief-a';
import { bankAt, faceAt, floorAt, hash, lipBrush, strand, T, wave } from './relief-creux';

export const W = 1100;
export const H = 1300;
/** Hauteur du plateau, en px (5 m). */
export const TOP = 100;
/** Décalage de l'écran : le plateau du bord nord, soulevé de 100 px, reste dans l'image. */
export const OY = TOP;
export const SH = H + OY;
const RIVER = 160;
/** Pied de la falaise (bord ouest de l'eau) au sud du passage, et au nord (le promontoire). */
export const X_SOUTH = 620;
export const X_NORTH = 760;
/** La face sud du promontoire (la bouche), et la reprise de la rivière au sud : le lit sec entre les deux (3 m). */
export const Y_FACE = 1100;
export const Y_DRY1 = 1160;
/** Longueur du couloir (60 m) : le sol monte de 0 à la face à 5 m au bout. */
export const L = 1200;

/** L'axe du chemin, du lit sec vers la sortie sur le plateau, puis le sentier du plateau. Le point 1 est la bouche (s = 0). */
const AXIS: [number, number][] = [
  [690, 1160], [690, 1100], [682, 1040], [692, 980], [702, 920], [694, 860], [676, 800], [668, 740], [674, 680], [684, 620],
  [676, 560], [660, 500], [652, 440], [658, 380], [650, 330], [626, 290], [590, 262], [544, 246], [490, 238], [430, 236],
  [370, 240], [310, 236], [250, 230], [180, 232], [100, 236], [0, 240],
];
const CUM: number[] = [];
{
  let s = -Math.hypot(AXIS[1][0] - AXIS[0][0], AXIS[1][1] - AXIS[0][1]);
  CUM.push(s);
  for (let i = 1; i < AXIS.length; i++) {
    s += Math.hypot(AXIS[i][0] - AXIS[i - 1][0], AXIS[i][1] - AXIS[i - 1][1]);
    CUM.push(s);
  }
}

/** Le point de l'axe à l'abscisse curviligne s, et la direction de l'axe (unitaire). */
export function axisAt(s: number): { x: number; y: number; tx: number; ty: number } {
  let i = 1;
  while (i < AXIS.length - 1 && CUM[i] < s) i++;
  const [ax, ay] = AXIS[i - 1];
  const [bx, by] = AXIS[i];
  const len = CUM[i] - CUM[i - 1];
  const u = Math.max(0, Math.min(1, (s - CUM[i - 1]) / len));
  return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, tx: (bx - ax) / len, ty: (by - ay) / len };
}

/** Hauteur du sol du couloir à s (px). */
export const floorZ = (s: number) => Math.max(0, Math.min(TOP, (TOP * s) / L));

export interface Variant {
  key: string;
  label: string;
  /** L'emprise au sol d'un talus (px) pour une paroi de D px de haut. */
  run: (D: number, s: number, side: number) => number;
  /** Les arbres de la lèvre se penchent de tant de px (en haut du houppier) vers le passage. */
  lean: number;
  /** Masses de feuillage qui pendent au-dessus du passage, et le rideau de la bouche. */
  vault: number;
  /** Pénombre du couloir au plus profond (opacité de GLOOM.color, src/config.ts). */
  gloom: number;
}

const talus = (k: number) => (D: number, s: number, side: number) =>
  D < 0.5 ? 0 : Math.max(2, 3 + D * k + wave(s, side * 1.9 + 0.4, 160) * D * 0.06 + (hash(Math.floor(s / 7), side, 601) < 0.2 ? 3 : 0));

export const VARIANTS: Variant[] = [
  { key: 'v1', label: 'V1 - talus de terre, voute ouverte', run: talus(0.2), lean: 12, vault: 0, gloom: 0.36 },
  { key: 'v2', label: 'V2 - talus de terre, voute presque fermee', run: talus(0.2), lean: 40, vault: 1, gloom: 0.5 },
  { key: 'v3', label: 'V3 - parois a pic noyees, voute fermee', run: (D) => (D < 0.5 ? 0 : 2 + D * 0.03), lean: 46, vault: 1.3, gloom: 0.6 },
];

/** Zones du terrain. */
export const Z = { GRASS: 0, RIVER: 1, DRY: 2, PLATEAU: 3, FLOOR: 4, BANK: 5, PATH: 6, TRAIL: 7 } as const;

const faceY = (x: number) => Y_FACE + Math.round(wave(x, 0.3, 140) * 2);
const cliffWob = (y: number, k: number) => Math.round(wave(y, k, 180) * 1.5);
/** Le point est-il sur le plateau (avant d'y creuser le couloir) ? */
export function onPlateau(x: number, y: number): boolean {
  if (x < X_SOUTH + cliffWob(y, 0.2)) return true;
  return y < faceY(x) && x < X_NORTH + cliffWob(y, 1.4);
}

export interface Terrain {
  variant: Variant;
  h: Int16Array;
  zone: Uint8Array;
  /** Abscisse curviligne du point de l'axe le plus proche, distance à l'axe, et côté (−1 : à gauche en montant, 1 : à droite). */
  s: Float32Array;
  d: Float32Array;
  side: Int8Array;
  /** Demi-largeur du sol et emprise du talus au point (px). */
  hw: Float32Array;
  run: Float32Array;
}

const halfWidth = (s: number, side: number) => 25 + wave(s, side * 2.3 + 1, 220) * 2.5;

/** Le modèle de hauteur d'une variante. */
export function terrain(variant: Variant): Terrain {
  const n = W * H;
  const t: Terrain = {
    variant, h: new Int16Array(n), zone: new Uint8Array(n), s: new Float32Array(n).fill(NaN), d: new Float32Array(n).fill(1e9),
    side: new Int8Array(n), hw: new Float32Array(n), run: new Float32Array(n),
  };
  const M = 70;
  for (let i = 1; i < AXIS.length; i++) {
    const [ax, ay] = AXIS[i - 1];
    const [bx, by] = AXIS[i];
    const len = CUM[i] - CUM[i - 1];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - M));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + M));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - M));
    const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + M));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - ax;
      const py = y + 0.5 - ay;
      const u = Math.max(0, Math.min(1, (px * (bx - ax) + py * (by - ay)) / (len * len)));
      const dx = px - (bx - ax) * u;
      const dy = py - (by - ay) * u;
      const dd = Math.hypot(dx, dy);
      const k = y * W + x;
      if (dd < t.d[k]) {
        t.d[k] = dd;
        t.s[k] = CUM[i - 1] + u * len;
        // à gauche en montant (vers l'ouest quand l'axe va au nord) : −1
        t.side[k] = (bx - ax) * dy - (by - ay) * dx < 0 ? -1 : 1;
      }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (!onPlateau(x, y)) {
      t.h[k] = 0;
      const northRiver = x >= X_NORTH && x < X_NORTH + RIVER && y < Y_FACE;
      const southRiver = x >= X_SOUTH && x < X_SOUTH + RIVER && y >= Y_DRY1;
      const dry = y >= Y_FACE - 4 && y < Y_DRY1 && x < X_NORTH + RIVER;
      t.zone[k] = northRiver || southRiver ? Z.RIVER : dry ? Z.DRY : Z.GRASS;
      if (t.zone[k] !== Z.RIVER && x >= X_NORTH + RIVER - 30 && Math.abs(y - 1130 - wave(x, 0.6, 200) * 3) < 11 + wave(x, 2.2, 90) * 2) t.zone[k] = Z.PATH;
      if (t.zone[k] === Z.DRY && t.d[k] < halfWidth(0, t.side[k]) - 2 + (wave(y, 1.3, 64) + 1) * 2 && t.s[k] > -40) t.zone[k] = Z.FLOOR;
      continue;
    }
    const s = t.s[k];
    const d = t.d[k];
    t.h[k] = TOP;
    t.zone[k] = Z.PLATEAU;
    if (Number.isNaN(s)) continue;
    const side = t.side[k];
    const zf = floorZ(s);
    const D = TOP - zf;
    // au bout, le couloir se resserre en sentier (il n'y a plus de paroi à tenir)
    const hw = halfWidth(s, side) * Math.max(0.36, Math.min(1, D / 24));
    const run = variant.run(D, s, side);
    t.hw[k] = hw;
    t.run[k] = run;
    if (D < 0.5) {
      if (d < 8 + wave(s, 0.9, 80) * 1.5) t.zone[k] = Z.TRAIL;
      continue;
    }
    if (d <= hw) {
      t.h[k] = Math.round(zf);
      t.zone[k] = Z.FLOOR;
    } else if (d < hw + run) {
      const u = (d - hw) / run;
      t.h[k] = Math.min(TOP, Math.round(zf + D * u ** 1.25));
      t.zone[k] = Z.BANK;
    }
  }
  return t;
}

const tile = (name: string, x: number, y: number) => tileset.tiles[name][((y % T) + T) % T][((x % T) + T) % T];
const variantOf = (col: number, row: number, n: number) => Math.floor(hash(col, row, 77) * n);
const FLOOR4 = (name: string, col: number, row: number) => { const v = variantOf(col, row, 4); return v ? `${name}${v + 1}` : name; };
const GRASS6 = (col: number, row: number) => { const v = variantOf(col, row, 6); return v ? `grass${v + 1}` : 'grass'; };

/** La lumière d'un talus au point : 1 s'il regarde le nord-ouest (au jour), −1 le sud-est. */
function lightAt(t: Terrain, x: number, y: number): number {
  const at = (a: number, b: number) => t.h[Math.max(0, Math.min(H - 1, b)) * W + Math.max(0, Math.min(W - 1, a))];
  const gx = at(x + 2, y) - at(x - 2, y);
  const gy = at(x, y + 2) - at(x, y - 2);
  const g = Math.hypot(gx, gy);
  if (!g) return 0;
  return (0.75 * gx + 0.66 * gy) / g;
}

/** La matière du sol au point (x, y) du monde. */
function groundAt(t: Terrain, x: number, y: number): string {
  const k = y * W + x;
  const col = Math.floor(x / T);
  const row = Math.floor(y / T);
  switch (t.zone[k]) {
    case Z.FLOOR: {
      const edge = t.hw[k] ? t.hw[k] - t.d[k] : 30;
      if (t.h[k] === 0 && y >= Y_FACE) {
        // devant la bouche : le sol clair s'épanouit sur le lit sec, mêlé de ses galets
        if (y - Y_FACE > 5 + wave(x, 1.7, 40) * 3 + wave(x, 0.2, 13) * 1.5) return DRY_BED[variantOf(col, row, 4)].get(((x % T) + T) % T, ((y % T) + T) % T);
      }
      // au bout, le sol clair se mêle au sol de la forêt, puis n'est plus que le sentier
      const D = TOP - floorZ(t.s[k]);
      if (D < 24 && t.d[k] > 6 && hash(Math.floor(x / 2), Math.floor(y / 2), 612) > D / 24) return tile(FLOOR4('woods', col, row), x, y);
      return floorAt(x, y, edge, t.d[k]);
    }
    case Z.BANK: {
      const u = (t.d[k] - t.hw[k]) / t.run[k];
      return bankAt(x, y, u, lightAt(t, x, y));
    }
    case Z.TRAIL: {
      const n = hash(x, y, 62);
      if (t.d[k] > 6) return 'e';
      return n < 0.6 ? 'u' : n < 0.85 ? 'n' : 'U';
    }
    case Z.PLATEAU: {
      // les broussailles de la lèvre : au bord du couloir (là où il est assez creux), et au bord de la falaise
      const s = t.s[k];
      if (!Number.isNaN(s) && TOP - floorZ(s) >= 10) {
        const dl = t.d[k] - t.hw[k] - t.run[k];
        if (dl >= 0) { const c = lipBrush(Math.floor(dl), Math.floor(s), t.side[k] + 1); if (c) return c; }
      }
      const dE = (y < faceY(x) ? X_NORTH : X_SOUTH) - 1 - x;
      if (dE >= 0 && dE < 10 && !onPlateau(x + dE + 1, y) && onPlateau(x + dE, y)) { const c = lipBrush(dE, y, 3); if (c) return c; }
      const dS = faceY(x) - 1 - y;
      if (x >= X_SOUTH && dS >= 0 && dS < 10) { const c = lipBrush(dS, x, 5); if (c) return c; }
      return tile(FLOOR4('woods', col, row), x, y);
    }
    case Z.RIVER: {
      const west = x < X_NORTH + RIVER && y < Y_FACE ? X_NORTH : X_SOUTH;
      const east = west + RIVER;
      if (east - 1 - x < 2) return east - 1 - x === 0 ? 'n' : 'q';
      const foot = wetFoot(x - west, y);
      let c = foot ?? tile('water-15', x, y);
      // les coupures : la dernière rangée d'eau au nord du lit sec, la première au sud
      const dN = Y_FACE - 1 - y;
      const dS = y - Y_DRY1;
      const sh = west === X_NORTH && dN >= 0 && dN <= 1 ? shimmer(0, x - west, dN, 0) : west === X_SOUTH && dS >= 0 && dS <= 1 ? shimmer(0, x - west, dS, 1) : undefined;
      if (sh) c = sh;
      return c;
    }
    case Z.DRY: {
      if (y === Y_FACE && x >= X_NORTH) { const sh = shimmer(0, x - X_NORTH, -1, 0); if (sh) return sh; }
      if (y === Y_DRY1 - 1 && x >= X_SOUTH && x < X_SOUTH + RIVER) { const sh = shimmer(0, x - X_SOUTH, -1, 1); if (sh) return sh; }
      return DRY_BED[variantOf(col, row, 4)].get(((x % T) + T) % T, ((y % T) + T) % T);
    }
    case Z.PATH: {
      const n = hash(x, y, 63);
      const half = 11 + wave(x, 2.2, 90) * 2;
      if (Math.abs(y - 1130 - wave(x, 0.6, 200) * 3) > half - 1.5) return 'e';
      // sur le lit sec, la trace se fait plaques
      if (x < X_NORTH + RIVER && hash(Math.floor(x / 4), Math.floor(y / 3), 64) < 0.35) return DRY_BED[variantOf(col, row, 4)].get(((x % T) + T) % T, ((y % T) + T) % T);
      return n < 0.7 ? 'u' : n < 0.88 ? 'n' : 'U';
    }
    default:
      return tile(GRASS6(col, row), x, y);
  }
}

export interface Rendered {
  grid: string[][];
  /** Le y du monde de ce que montre chaque pixel de l'écran (−1 : rien). */
  dep: Int32Array;
  /** La zone de ce que montre le pixel ; 8 : une face tournée vers le sud de la falaise (la bouche). */
  zone: Uint8Array;
  /** 1 : le pixel est dans l'ombre portée du terrain. */
  shadow: Uint8Array;
  /** La profondeur du couloir (px) sous ce que montre le pixel, pour sa pénombre ; 0 hors du couloir. */
  depth: Float32Array;
}

export const FACE = 8;

/**
 * La profondeur du couloir (px) au point k du monde, pour sa pénombre : 0 hors du couloir et devant la bouche ; elle s'installe
 * dès le premier mètre du couloir (on entre dans l'ombre).
 */
export function depthAt(t: Terrain, k: number): number {
  const s = t.s[k];
  if (Number.isNaN(s) || s <= 0 || (t.zone[k] !== Z.FLOOR && t.zone[k] !== Z.BANK)) return 0;
  return (TOP - floorZ(s)) * Math.min(1, 0.35 + s / 16);
}

/** Rend le terrain à l'écran (W × SH). */
export function render(t: Terrain): Rendered {
  const grid: string[][] = Array.from({ length: SH }, () => new Array<string>(W).fill('.'));
  const dep = new Int32Array(W * SH).fill(-1);
  const zone = new Uint8Array(W * SH);
  const depth = new Float32Array(W * SH);
  const corridorDepth = (k: number) => depthAt(t, k);
  for (let x = 0; x < W; x++) {
    let prev = t.h[x];
    for (let y = 0; y < H; y++) {
      const k = y * W + x;
      const h = t.h[k];
      if (y > 0 && prev > h) {
        const kn = k - W;
        const zn = t.zone[kn];
        const drop = prev - h;
        for (let z = h + 1; z <= prev; z++) {
          const sy = y - z + OY;
          if (sy < 0 || sy >= SH) continue;
          const i = sy * W + x;
          const fromTop = prev - z;
          let c: string;
          // une vraie paroi tournée vers le sud ; une petite marche (le sol qui monte, un talus en biais) prolonge le sol du dessus
          if (zn === Z.PLATEAU || drop >= 8) c = faceAt(x, fromTop, drop);
          else c = groundAt(t, x, y - 1);
          grid[sy][x] = c;
          dep[i] = y - 1;
          zone[i] = zn === Z.PLATEAU ? FACE : Z.BANK;
          depth[i] = zn === Z.PLATEAU ? 0 : corridorDepth(kn);
        }
      }
      const sy = y - h + OY;
      if (sy >= 0 && sy < SH) {
        const i = sy * W + x;
        grid[sy][x] = groundAt(t, x, y);
        dep[i] = y;
        zone[i] = t.zone[k];
        depth[i] = corridorDepth(k);
      }
      prev = h;
    }
  }
  // les racines qui pendent des lèvres : sur la face de la bouche (verticales), et sur les talus (dans le sens de la pente)
  for (const st of roots(t)) for (const [x, y, c] of st.px) {
    if (x < 0 || y < 0 || x >= W || y >= SH) continue;
    const z = zone[y * W + x];
    if (z === FACE || z === Z.BANK) grid[y][x] = c;
  }
  // l'ombre portée du terrain (SHADOW de src/config.ts : un point à z px tombe 0,25 z à l'est et 0,1 z au sud)
  const shadow = new Uint8Array(W * SH);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const k = y * W + x;
    const h = t.h[k];
    if (h >= TOP) continue;
    const sy = y - h + OY;
    if (sy < 0 || sy >= SH || dep[sy * W + x] !== y) continue;
    for (let s = 1; s <= TOP - h; s++) {
      const ax = Math.round(x - 0.25 * s);
      const ay = Math.round(y - 0.1 * s);
      if (ax < 0 || ay < 0) break;
      if (t.h[ay * W + ax] - h >= s) { shadow[sy * W + x] = 1; break; }
    }
  }
  return { grid, dep, zone, shadow, depth };
}

/** Les racines et le lierre qui pendent : de la lèvre de la face de la bouche, et le long des talus du couloir. */
function roots(t: Terrain) {
  const out: ReturnType<typeof strand>[] = [];
  // la face sud du promontoire : racines verticales, à l'écran, de la lèvre vers le pied
  for (let x = X_SOUTH + 2; x < X_NORTH - 1; x += 2) {
    const n = hash(x, 7, 701);
    if (n > 0.42) continue;
    const top = faceY(x) - TOP + OY + 2;
    const len = 6 + Math.floor(hash(x, 8, 702) * (n < 0.12 ? 60 : 28));
    out.push(strand(x, top, len, 700 + x, hash(x, 9, 703) < 0.3));
  }
  // les talus : une racine tous les quelques px de lèvre, qui descend la pente (à l'écran : vers l'axe, et un peu vers le bas)
  if (t.variant.run(TOP, 0, 1) > 6) {
    for (let s = 4; s < L - 80; s += 3) {
      for (const side of [-1, 1]) {
        if (hash(Math.floor(s), side, 704) > 0.45) continue;
        const a = axisAt(s);
        const nx = -a.ty * side; // la normale vers le côté
        const ny = a.tx * side;
        const D = TOP - floorZ(s);
        const hw = halfWidth(s, side);
        const run = t.variant.run(D, s, side);
        const lx = Math.round(a.x + nx * (hw + run - 1));
        const ly = Math.round(a.y + ny * (hw + run - 1));
        if (lx < 0 || ly < 0 || lx >= W || ly >= H) continue;
        const sy = ly - t.h[ly * W + lx] + OY;
        const len = Math.floor(run * (0.4 + hash(Math.floor(s), side, 705) * 0.6));
        // dans le sens de la pente, vu de dessus : vers l'axe (en x), et vers le bas de l'écran à mesure qu'on descend
        const dx = -Math.sign(nx) || 0;
        out.push(strand(lx, sy, len, 710 + Math.floor(s) * 3 + side, hash(Math.floor(s), side, 706) < 0.25, dx, Math.abs(nx) > 0.7 ? 0 : 1));
      }
    }
  } else {
    // à pic : les racines pendent à la verticale, collées à la paroi, sur l'écran une ligne vers le bas depuis la lèvre
    for (let s = 4; s < L - 80; s += 3) {
      for (const side of [-1, 1]) {
        if (hash(Math.floor(s), side, 707) > 0.5) continue;
        const a = axisAt(s);
        const nx = -a.ty * side;
        const ny = a.tx * side;
        const D = TOP - floorZ(s);
        const hw = halfWidth(s, side);
        const lx = Math.round(a.x + nx * (hw + 1));
        const ly = Math.round(a.y + ny * (hw + 1));
        if (lx < 0 || ly < 0 || lx >= W || ly >= H) continue;
        const sy = ly - TOP + OY + 1;
        out.push(strand(lx - Math.sign(nx), sy, Math.floor(D * (0.3 + hash(Math.floor(s), side, 708) * 0.6)), 720 + Math.floor(s) * 3 + side, hash(Math.floor(s), side, 709) < 0.3));
      }
    }
  }
  return out;
}

// ---------- ce qui est posé : arbres, buissons, feuillages, Xéros ----------

export interface Placed {
  /** clé de l'image (src/generated/<clé>.png), 'xeros-<pose>', ou 'mass:<graine>:<w>:<h>' (une masse de feuillage). */
  key: string;
  /** Le pied, au sol, en px du monde, et sa hauteur (px). */
  x: number;
  y: number;
  z: number;
  /** Penché de tant de px (en haut de l'image) vers l'est (+) ou l'ouest (−). */
  lean?: number;
  /** Fait partie de la voûte du passage : devient transparent quand Xéros est dessous. */
  vault?: boolean;
  /** Pour une masse : le bas de l'image est à tant de px sous le pied soulevé (elle pend). */
  hang?: number;
  /** Pour une masse : son centre au-dessus du sol, en plan (pour l'ombre de la voûte sur le passage). */
  shade?: [number, number, number];
}

/** La hauteur du sol (px) au point du monde (pour poser une chose). */
export const heightOf = (t: Terrain, x: number, y: number) => t.h[Math.max(0, Math.min(H - 1, Math.round(y))) * W + Math.max(0, Math.min(W - 1, Math.round(x)))];

/** Les arbres, buissons et fougères du plateau et de la ferme ; les arbres de la lèvre se penchent vers le passage. */
export function plants(t: Terrain): Placed[] {
  const v = t.variant;
  const out: Placed[] = [];
  const clear = (x: number, y: number, m: number, gap = 4) => {
    if (x < 8 || y < 8 || x >= W - 8 || y >= H - 4) return false;
    for (const [dx, dy] of [[0, 0], [-m, 0], [m, 0], [0, -m / 2], [0, m / 2]]) {
      const k = Math.round(y + dy) * W + Math.round(x + dx);
      if (k < 0 || k >= W * H) return false;
      if (t.zone[k] !== Z.PLATEAU) return false;
      if (!Number.isNaN(t.s[k]) && t.d[k] < t.hw[k] + t.run[k] + gap && TOP - floorZ(t.s[k]) > 0) return false;
    }
    return true;
  };
  const r = (i: number, k: number) => hash(i, k, 801);
  // la lèvre du couloir : de part et d'autre, un arbre tous les 45 à 75 px, penché vers le passage
  let i = 0;
  for (let s = 18; s < L - 40; s += (v.vault ? 36 : 45) + r(i, 0) * 28, i++) {
    for (const side of [-1, 1]) {
      if (r(i, side + 5) < 0.2) continue;
      const a = axisAt(s + (side > 0 ? 20 : 0));
      const nx = -a.ty * side;
      const ny = a.tx * side;
      const D = TOP - floorZ(s);
      const off = halfWidth(s, side) + v.run(D, s, side) + 2 + r(i, side + 7) * 6;
      const x = Math.round(a.x + nx * off);
      const y = Math.round(a.y + ny * off);
      if (!clear(x, y, 1, 0)) continue;
      const big = r(i, side + 9) < 0.45;
      const lean = Math.round(-Math.sign(nx || 0.001) * v.lean * (Math.abs(nx) > 0.5 ? 1 : 0.3) * (0.7 + r(i, side + 11) * 0.6));
      out.push({ key: big ? 'big-tree' : 'normal-tree', x, y, z: TOP, lean, vault: true });
      // un buisson au pied, côté passage, une fois sur deux
      if (r(i, side + 13) < 0.55) {
        const bx = Math.round(a.x + nx * (off - 8) + (r(i, side + 15) - 0.5) * 16);
        const by = Math.round(a.y + ny * (off - 8) + 6);
        if (clear(bx, by, 2)) out.push({ key: r(i, side + 17) < 0.3 ? 'bush-berries' : 'bush', x: bx, y: by, z: TOP });
      }
    }
  }
  // la forêt du plateau : une grille lâche, sans arbre couché (la tempête ne l'a pas touchée)
  for (let gy = 20; gy < H; gy += 64) for (let gx = 16; gx < W; gx += 60) {
    const j = gx * 31 + gy;
    const x = Math.round(gx + (hash(j, 1, 802) - 0.5) * 50 + ((gy / 58) % 2) * 26);
    const y = Math.round(gy + (hash(j, 2, 802) - 0.5) * 54);
    if (hash(j, 4, 802) < 0.25) continue;
    if (!clear(x, y, 18) || out.some((p) => Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 24)) continue;
    const n = hash(j, 3, 802);
    if (n < 0.65) out.push({ key: n < 0.25 ? 'big-tree' : 'normal-tree', x, y, z: TOP });
    else if (n < 0.85) out.push({ key: 'bush', x, y, z: TOP });
    else out.push({ key: n < 0.92 ? 'decal-fern' : 'decal-moss', x, y, z: TOP });
  }
  // fougères et touffes au bord des lèvres
  for (let s = 10; s < L - 60; s += 11) {
    for (const side of [-1, 1]) {
      if (hash(Math.floor(s), side, 803) > 0.3) continue;
      const a = axisAt(s);
      const nx = -a.ty * side;
      const ny = a.tx * side;
      const off = halfWidth(s, side) + v.run(TOP - floorZ(s), s, side) + 4;
      const x = Math.round(a.x + nx * off);
      const y = Math.round(a.y + ny * off);
      if (heightOf(t, x, y) === TOP) out.push({ key: hash(Math.floor(s), side, 804) < 0.6 ? 'decal-fern' : 'decal-tufts', x, y, z: TOP });
    }
  }
  // la ferme : quelques arbres, loin de la rive
  for (const [x, y] of [[1010, 960], [1060, 1250], [980, 1225]] as [number, number][]) out.push({ key: 'normal-tree', x, y, z: 0 });
  out.push({ key: 'bush', x: 1040, y: 1060, z: 0 });
  // le promontoire : deux arbres au bord de la bouche, penchés l'un vers l'autre
  out.push({ key: 'big-tree', x: 638, y: 1084, z: TOP, lean: Math.round(v.lean * 1.2), vault: true });
  out.push({ key: 'normal-tree', x: 742, y: 1078, z: TOP, lean: -Math.round(v.lean * 1.1), vault: true });
  return out;
}

/** Le rideau de la bouche : les masses de feuillage qui pendent de la lèvre de la face, en arche. */
export function vault(t: Terrain): Placed[] {
  const v = t.variant;
  if (!v.vault) return [];
  const out: Placed[] = [];
  // le rideau de la bouche : des masses qui pendent de la lèvre de la face, plus bas sur les côtés, en arche
  const mouth: [number, number, number, number][] = [
    // x du centre, largeur, hauteur, pend de (px sous la lèvre)
    [650, 50, 52, 46], [732, 46, 50, 42], [690, 60, 30, 12], [668, 34, 34, 26], [712, 34, 32, 24], [690, 40, 22, 4],
  ];
  mouth.forEach(([cx, w, h, hang], k) => {
    out.push({ key: `mass:${900 + k}:${w}:${Math.round(h * v.vault)}`, x: cx, y: Y_FACE + 1, z: TOP, hang: Math.round(hang * Math.min(1, v.vault)), vault: true, shade: [cx, Y_FACE - 40, w * 0.9] });
  });
  // au-dessus du couloir, la voûte est faite des arbres de la lèvre, penchés (plants) : pas de masse posée en l'air
  return out;
}

export interface Pose { key: string; s: number; dx?: number; label: string }

/** Xéros, posé sur l'axe à l'abscisse s (px), un peu de côté (dx). */
export function xerosAt(t: Terrain, p: Pose): Placed {
  const a = axisAt(p.s);
  const x = Math.round(a.x + (p.dx ?? 0));
  const y = Math.round(a.y);
  return { key: p.key, x, y, z: heightOf(t, x, y) };
}

