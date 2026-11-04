// ESSAI (chantier « maison du coq », hors jeu) : les baies de pierre de la maison du coq, dans le modèle en volumes
// (art/lib/volumes.ts) : la croisée de l'étage, la demi-croisée du rez-de-chaussée, la porte d'entrée en arc avec le coq sculpté
// sur la clef. Planche : npx tsx tools/essai-coq-details.ts (.art-preview/coq-pierre-tapisserie.png).
//
// Deux morceaux par baie, pour qu'une face de mur les reçoive où qu'elle soit :
//   - `withBays(tex, bays)` : la matière d'une face de mur (le parement de coq-pierre.ts) percée de ses baies (transparente dans
//     le jour, pour qu'on voie ce qui est en retrait), avec leur encadrement : piédroits harpés en blocs de 30 cm, linteau ou arc
//     de claveaux, chanfrein d'un pixel le long du jour (à l'ombre à gauche et dessous, au soleil à droite) ;
//   - `crossWindow`, `archDoor` : les volumes en retrait (l'appui, le meneau, la traverse, les vitraux, les volets, les barreaux,
//     la porte de chêne, le seuil), en px du jeu, à poser devant la face percée.
// Coordonnées : x vers l'est, y vers le sud, z vers le haut ; la face sud du mur est en y = `face` ; s, t sur la face depuis son
// coin bas-gauche.

import { box, hash, part, type Quad, type Tex } from '../lib/volumes';
import { COURSE } from './coq-pierre';

/** Une baie dans une face : le jour de s0 à s1 (exclu), de t0 à t1 ; `arch` : plein cintre (t1 est le haut de l'arc). */
export interface Bay { s0: number; s1: number; t0: number; t1: number; arch?: boolean; seed?: number }

/** Le plein cintre : rayon (la demi-largeur), naissance de l'arc. */
const archOf = (b: Bay) => { const r = (b.s1 - b.s0) / 2; return { r, cx: b.s0 + r, spring: b.t1 - r }; };

/** Le jour de la baie (le pixel (s, t) est-il dans le vide ?). */
export function inBay(b: Bay, s: number, t: number): boolean {
  if (s < b.s0 || s >= b.s1 || t < b.t0 || t >= b.t1) return false;
  if (!b.arch) return true;
  const { cx, spring, r } = archOf(b);
  return t < spring || Math.hypot(s - cx, t - spring) < r;
}

/** Largeur d'un piédroit à l'assise `k` : en harpe, 35 et 20 cm. */
const jamb = (k: number, seed: number) => ((k + seed) % 2 === 0 ? 7 : 4);

/**
 * L'encadrement d'une baie au pixel (i, j) de la face : un signe, ou undefined hors de l'encadrement. Les blocs y sont plus
 * clairs que le parement (mieux dressés), ciselés en haut et à gauche, joints de chaux.
 */
function frame(b: Bay, i: number, j: number): string | undefined {
  const seed = b.seed ?? 0;
  const k = Math.floor(j / COURSE), jj = j - k * COURSE;
  if (b.arch) {
    const { cx, spring, r } = archOf(b);
    const dx = i + 0.5 - cx, dz = j + 0.5 - spring, R = Math.hypot(dx, dz);
    // la clef : un bloc plus haut que les claveaux, où est sculpté le coq
    const KEY_W = 5, KEY_T = r + 7;
    if (dz >= 0 && Math.abs(dx) < KEY_W && R >= r - 0.5 && dz < KEY_T + 2) return keystone(Math.floor(dx + KEY_W), Math.floor(dz - (r - 1)), KEY_W * 2, KEY_T + 3 - r);
    if (dz >= 0 && R >= r && R < r + 6) {
      // les claveaux : 9 rayons ; le joint, un pixel le long du rayon
      const a = Math.atan2(dz, dx), n = 11, step = Math.PI / n, f = a / step, idx = Math.floor(f);
      const near = Math.min(f - idx, idx + 1 - f) * step * R;
      if (near < 0.55 && R > r + 0.4) return ';';
      if (R < r + 1) return dx < 0 ? ';' : '+'; // le chanfrein de l'intrados
      if (R >= r + 5) return '+'; // l'extrados ciselé
      return hash(seed, idx, 3) < 0.4 ? '+' : 'θ';
    }
    if (dz >= 0) return undefined;
  } else if (j >= b.t1 && j < b.t1 + COURSE && i >= b.s0 - 5 && i < b.s1 + 5) {
    // le linteau d'un seul bloc, chanfrein dessous, ciselure en haut
    if (j === b.t1) return ';';
    if (j === b.t1 + COURSE - 1 || i === b.s0 - 5) return '!';
    if (i === b.s1 + 4) return ';';
    return 'θ';
  }
  if (j < b.t0 || j >= b.t1) return undefined;
  // les piédroits en harpe
  const wl = jamb(k, seed), wr = jamb(k + 1, seed);
  const L = i >= b.s0 - wl && i < b.s0, R = i >= b.s1 && i < b.s1 + wr;
  if (!L && !R) return undefined;
  if (jj === 0) return ';';
  if (L && i === b.s0 - 1) return ';'; // chanfrein, tourné vers l'est : à l'ombre
  if (R && i === b.s1) return '+'; // chanfrein, tourné vers l'ouest : au soleil
  if (L && i === b.s0 - wl) return ';'; // le joint avec le parement
  if (R && i === b.s1 + wr - 1) return ';';
  if (jj === COURSE - 1 || (R && i === b.s1 + 1)) return '!';
  return 'θ';
}

/**
 * La clef de l'arc, le coq sculpté en relief (8 × 6 px, tourné vers l'ouest) : le relief clair au soleil en haut et à gauche,
 * son ombre en bas et à droite, sur la face de la clef. (x, y) : depuis le coin bas-gauche de la clef, w × h.
 */
const COQ_RELIEF = [
  '...!....',
  '..!+...!',
  '.++!..!+',
  '..+++!+.',
  '..++++..',
  '...+.+..',
];
function keystone(x: number, y: number, w: number, h: number): string {
  if (x <= 0 || x >= w - 1) return ';';
  if (y >= h - 1) return '!';
  if (y <= 0) return ';';
  const gx = x - 1, gy = h - 3 - y;
  const ch = COQ_RELIEF[gy]?.[gx];
  if (ch && ch !== '.') return ch;
  // le fond de la clef, refouillé autour du coq : un ton plus bas, pour qu'il sorte
  return gx >= 0 && gx < 8 && gy >= 0 && gy < 6 ? ';' : 'θ';
}

/** La matière d'une face percée de ses baies, avec leurs encadrements (les autres faces : la matière telle quelle). */
export function withBays(tex: Tex, bays: Bay[]): Tex {
  return (s, t, c) => {
    if (c.face !== 'S' && c.face !== 'N') return tex(s, t, c);
    const i = Math.floor(s), j = Math.floor(t);
    for (const b of bays) if (inBay(b, i + 0.5, j + 0.5)) return null;
    for (const b of bays) { const f = frame(b, i, j); if (f) return f; }
    return tex(s, t, c);
  };
}

// =====================================================================================================================
// Les volumes en retrait
// =====================================================================================================================

const STONE = part('baie', 3, '~', 'full');
const SILL = part('appui', 4, '~', 'full');
const IRON = part('fer', 6, '_', 'none');
const GLASS = part('vitrail', 1, '`', 'none');
const WOOD = part('volet', 1, '&', 'none');
const DOOR = part('porte', 1, '&', 'none');

/** Les losanges plombés d'un jour de `w` × `h` (s, t depuis le coin bas-gauche du jour) : plomb, verre, un reflet en biais. */
function leaded(w: number, h: number, s: number, t: number): string {
  const i = Math.floor(s), j = Math.floor(t);
  if (i === 0 || j === 0 || i === w - 1 || j === h - 1) return '`';
  if ((i + j) % 4 === 0 || (((i - j) % 4) + 4) % 4 === 0) return '`';
  // le reflet du ciel : une bande en biais, du haut à gauche
  const d = i + (h - 1 - j);
  return d >= 3 && d <= 6 ? '<' : '>';
}

/** Un volet de planches fermé (planches debout de 15 cm, joints, deux pentures de fer). */
function shutter(w: number, h: number, s: number, t: number): string {
  const i = Math.floor(s), j = Math.floor(t);
  if (j === 3 || j === h - 4) return i < w - 1 ? (i === 0 ? '-' : '_') : '@';
  if (i % 3 === 2) return '@';
  return i % 3 === 0 ? '^' : j < 2 ? '%' : '*';
}

export interface WindowOpts {
  /** Le bord ouest du jour (x), la face sud du mur (y), le haut de l'appui (z) : le bas du jour. */
  x: number; face: number; z: number;
  /** Le jour : largeur et hauteur (px). */
  w: number; h: number;
  /** `cross` : meneau et traverse ; `half` : traverse seule et barreaux. */
  kind: 'cross' | 'half';
  /** Hauteur du jour du bas (sous la traverse). */
  low: number;
  /** Les volets du bas ouverts (le dedans dans la pénombre) ou fermés. */
  open: boolean;
}

/** Retrait du vitrage et des volets dans l'embrasure : 15 cm. */
const RECESS = 3;

/** La croisée ou la demi-croisée : l'appui saillant, le meneau, la traverse, les vitraux en haut, les volets en bas, les barreaux. */
export function crossWindow(o: WindowOpts): Quad[] {
  const { x, face: y, z, w, h, low } = o, back = y - RECESS;
  const q: Quad[] = [];
  // l'appui : un bloc de 10 cm d'épais, saillant de 5 cm, qui déborde de 10 cm de chaque côté
  q.push(...box(x - 2, x + w + 2, back, y + 1, z - 2, z, SILL, (_s, t, c) => (c.face === 'top' ? (Math.floor(t) === Math.round(c.h) - 1 ? '!' : '+') : Math.floor(t) === 0 ? ';' : '=')));
  const mx = o.kind === 'cross' ? x + Math.floor((w - 3) / 2) : -1;
  const lights: [number, number][] = o.kind === 'cross' ? [[x, mx], [mx + 3, x + w]] : [[x, x + w]];
  const plane = (x0: number, x1: number, z0: number, z1: number, upper: boolean): Quad[] => {
    const lw = x1 - x0, lh = z1 - z0;
    const tex: Tex = (s, t) => (upper ? leaded(lw, lh, s, t) : o.open ? (t > lh - 3 ? '@' : 'o') : shutter(lw, lh, s, t));
    return box(x0, x1, back - 1, back, z0, z1, upper ? GLASS : WOOD, tex);
  };
  for (const [a, b] of lights) {
    q.push(...plane(a, b, z + low + 3, z + h, true));
    q.push(...plane(a, b, z, z + low, false));
  }
  // la traverse et le meneau : de la pierre de l'encadrement, de toute l'épaisseur de l'embrasure, chanfreinés
  const stoneTex: Tex = (s, t, c) => {
    if (c.face === 'top') return '+';
    const i = Math.floor(s), j = Math.floor(t);
    if (c.w > c.h) return j === Math.round(c.h) - 1 ? '!' : j === 0 ? ';' : 'θ';
    return i === 0 ? '!' : i === Math.round(c.w) - 1 ? ';' : 'θ';
  };
  q.push(...box(x, x + w, back, y, z + low, z + low + 3, STONE, stoneTex));
  if (mx >= 0) q.push(...box(mx, mx + 3, back, y, z, z + h, STONE, stoneTex));
  // les barreaux de fer de la demi-croisée : debout tous les 20 cm, scellés dans l'appui et le linteau, devant le vitrage
  if (o.kind === 'half') {
    const ironTex: Tex = (_s, _t, c) => (c.face === 'top' ? '-' : '_');
    for (let bx = x + 3; bx < x + w - 1; bx += 4) q.push(...box(bx, bx + 1, back + 1, back + 2, z, z + h, IRON, ironTex));
    q.push(...box(x, x + w, back + 1, back + 2, z + Math.floor(low / 2), z + Math.floor(low / 2) + 1, IRON, (_s, _t, c) => (c.face === 'top' ? '-' : '_')));
  }
  return q;
}

export interface DoorOpts {
  /** Le bord ouest du jour (x), la face sud du mur (y) ; largeur et hauteur du jour sous la clef (px). */
  x: number; face: number; w: number; h: number;
}

/** Retrait de la porte dans l'embrasure : 20 cm. */
const DOOR_RECESS = 4;

/**
 * La porte de chêne cloutée, en arc, et son seuil : des planches debout de 20 cm, deux pentures de fer, des clous en rangs sur
 * les traverses du dos, le heurtoir (un anneau de fer) à hauteur de main, le bas mouillé.
 */
export function archDoor(o: DoorOpts): Quad[] {
  const { x, face: y, w, h } = o, back = y - DOOR_RECESS, r = w / 2;
  const bay: Bay = { s0: 0, s1: w, t0: 0, t1: h, arch: true };
  const tex: Tex = (s, t) => {
    const i = Math.floor(s), j = Math.floor(t);
    if (!inBay(bay, i + 0.5, j + 0.5)) return null;
    // le heurtoir : un anneau de fer de 15 cm, au milieu, à 1,10 m
    const ky = 21, kx = Math.floor(w / 2) - 1;
    const ring = ['._.', '_._', '-_.'];
    if (i >= kx && i < kx + 3 && j <= ky && j > ky - 3) { const c = ring[ky - j][i - kx]; if (c !== '.') return c; }
    // les pentures : deux bandes de fer qui partent des gonds (à l'ouest) jusqu'aux deux tiers de la porte
    if ((j === 6 || j === h - r - 2) && i < Math.floor(w * 0.7)) return i === 0 ? '-' : '_';
    if (i % 4 === 3) return '@';
    // les clous : des rangs, un clou par planche, tous les 40 cm
    if (j % 8 === 2 && i % 4 === 1 && j < h - 4) return '@';
    if (j < 2) return i % 4 === 0 ? '%' : '&';
    return i % 4 === 0 ? '^' : '*';
  };
  return [
    ...box(x, x + w, back - 1, back, 0, h, DOOR, tex),
    // le seuil : une dalle de calcaire au fond de l'embrasure, son arête au soleil
    ...box(x - 1, x + w + 1, back, y + 1, 0, 1, SILL, (_s, t, c) => (c.face === 'top' ? (Math.floor(t) === Math.round(c.h) - 1 ? '!' : '+') : '=')),
  ];
}
