// Les vues de la pièce de bois, calculées depuis sa section (docs/CONCEPTION.md, « Les pièces fendues ») : la section de chaque
// aspect est décrite dans wood.json (`section` : forme, écorce, cœur, face sur laquelle elle repose, faces dressées), étirée sur la
// longueur, et chaque pixel de chaque vue en est tiré par un rayon. Aucune forme n'est dessinée à la main ; les couleurs et les
// textures sont celles de art/world/wood-skin.ts (le pixel-artist les règle).
//
// La section, en centimètres de bois (sans le contour) : `a` en travers (vers le sud pour une pièce est-ouest), `z` en hauteur
// depuis le sol. Elle est convexe : l'intersection d'un disque (le rond, dont l'arc qui reste est l'écorce) et de demi-plans (les
// faces planes : fendues, dressées, la planche). D'où un calcul exact de ce que voit chaque pixel : le segment de la section sur
// son rayon, et son bout tourné vers nous.
//
// Les dimensions à l'écran restent celles de la règle D (wood.json : `ew.h`, `ns.w`, la collision `body`) ; le calcul les remplit :
// - est-ouest : l'image a `ew.h` rangées : le contour, `B` rangées de bois, le contour, l'ombre (`body.bottom` rangées). Le travers
//   de la section remplit `body.h` rangées : la profondeur est à l'échelle du sol, celle de l'écart entre deux pièces d'un tas
//   (`body.h` + 1 : le pas), si bien que la pièce de devant cache exactement le flanc de celle de derrière ; la hauteur remplit ce
//   qui reste des `B` rangées (le flanc tourné vers nous). Le bout ouest se voit en raccourci : dans chaque rangée, un point se
//   décale vers l'est de RACCOURCI × sa profondeur vers l'œil le long du rayon, comptée depuis le milieu de la section dans cette
//   rangée : la face de coupe du bout ouest, du côté de la lumière, est la section écrasée (un ovale pour le rond) ; à l'est,
//   l'écorce s'y arrondit ; les deux bouts sont symétriques, quelle que soit la forme, et rien n'est cisaillé ;
// - nord-sud (règle D : la même pièce tournée d'un quart de tour, le sud passé à l'ouest) : `ns.w` colonnes, le contour, les mêmes
//   `B` colonnes de bois en travers, le contour, l'ombre ; le dessus vu d'en haut, et au sud la face de coupe, la section elle-même
//   en raccourci (RACCOURCI × sa hauteur) ; au nord, le bout lointain prend le profil du dessus de la section.
// La lumière vient d'en haut à gauche : du nord et d'en haut en est-ouest, de l'ouest et d'en haut en nord-sud.

import { Canvas, EMPTY } from '../lib/canvas';
import { despeckle, shadedOutline } from './big-tree';
import { SKINS, type Skin } from './wood-skin';
import { CM_PER_PX, RACCOURCI } from '../../src/content/gabarit';
import type { WoodLook, WoodPiece, WoodSection } from '../../src/content/types';
import { WOOD, lookDef, sizeOf } from '../../src/world/woodShape';

/** Un point de la section : (a en travers, z en hauteur), en cm. */
type V = [number, number];
type FaceKind = 'split' | 'hewn' | 'plank';
/** Une face plane : n · P ≤ d (n unitaire, vers l'extérieur). */
interface Plane { n: V; d: number; kind: FaceKind }

/** La section d'une pièce, prête au calcul. */
export interface SectionGeom {
  disk?: { c: V; r: number };
  planes: Plane[];
  /** Le cœur : le centre des cernes du bout. */
  heart: V;
  /** Le rayon des cernes (le rayon de la bille d'origine). */
  rings: number;
  /** L'arc du disque est de l'écorce. */
  bark: boolean;
  /** Le rond entier (bille, rondin, perche) : sa face de coupe porte la fente qui tourne quand il roule. */
  round: boolean;
  amin: number;
  amax: number;
  zmax: number;
}

const dot = (p: V, q: V) => p[0] * q[0] + p[1] * q[1];
const S2 = Math.SQRT1_2;

/** La section d'un aspect (wood.json, `section`), le quartier pointe en l'air ou en bas (`point`). */
export function sectionGeom(size: string, look: WoodLook, point?: WoodPiece['point']): SectionGeom {
  const sec: WoodSection = lookDef(size, look).section;
  const R = sizeOf(size).diameter / 2;
  const faces: FaceKind = sec.faces ?? 'hewn';
  let disk: SectionGeom['disk'];
  let planes: Plane[] = [];
  let heart: V = [0, R];
  if (sec.shape === 'round') {
    disk = { c: [0, R], r: R };
    const b = WOOD.hew.beam / 2;
    const FLAT: Record<string, Plane> = {
      top: { n: [0, 1], d: R + b, kind: faces },
      south: { n: [1, 0], d: b, kind: faces },
      north: { n: [-1, 0], d: b, kind: faces },
      bottom: { n: [0, -1], d: -(R - b), kind: faces },
    };
    planes = (sec.flats ?? []).map((f) => FLAT[f]);
  } else if (sec.shape === 'half') {
    if (sec.rests !== 'bark') throw new Error(`wood-section : la demi-bille repose sur son écorce (${size} ${look})`);
    // l'écorce en bas, la face plate en l'air, le cœur au milieu de la face
    disk = { c: [0, R], r: R };
    planes = [{ n: [0, 1], d: R, kind: faces }];
  } else if (sec.shape === 'quarter') {
    if (sec.rests !== 'bark') throw new Error(`wood-section : le quartier repose sur son écorce (${size} ${look})`);
    if (point === 'down') {
      // pointe en bas, l'écorce en l'air (un sur deux dans une rangée de tas)
      disk = { c: [0, 0], r: R };
      planes = [{ n: [S2, -S2], d: 0, kind: faces }, { n: [-S2, -S2], d: 0, kind: faces }];
      heart = [0, 0];
    } else {
      // l'écorce en bas, la pointe (l'angle du cœur) en l'air, les deux faces fendues à 45° de part et d'autre
      disk = { c: [0, R], r: R };
      planes = [{ n: [S2, S2], d: R * S2, kind: faces }, { n: [-S2, S2], d: R * S2, kind: faces }];
    }
  } else {
    const w = WOOD.plank.wide / 2;
    const t = WOOD.plank.thick;
    planes = [
      { n: [0, 1], d: t, kind: 'plank' },
      { n: [1, 0], d: w, kind: 'plank' },
      { n: [-1, 0], d: w, kind: 'plank' },
      { n: [0, -1], d: 0, kind: 'plank' },
    ];
    heart = [0, -4 * R];
  }
  const geom: SectionGeom = { disk, planes, heart, rings: R, bark: sec.bark === 'arc', round: sec.shape === 'round' && !sec.flats?.length, amin: 0, amax: 0, zmax: 0 };
  // posée sur le sol : le point le plus bas à z = 0
  const pts = samples(geom);
  const zmin = Math.min(...pts.map((p) => p[1]));
  if (Math.abs(zmin) > 1e-9) shift(geom, zmin);
  const all = samples(geom);
  geom.amin = Math.min(...all.map((p) => p[0]));
  geom.amax = Math.max(...all.map((p) => p[0]));
  geom.zmax = Math.max(...all.map((p) => p[1]));
  return geom;
}

/** Descend la section de `dz` cm. */
function shift(g: SectionGeom, dz: number) {
  if (g.disk) g.disk.c = [g.disk.c[0], g.disk.c[1] - dz];
  g.planes = g.planes.map((p) => ({ ...p, d: p.d - p.n[1] * dz }));
  g.heart = [g.heart[0], g.heart[1] - dz];
}

/** Le point est-il dans la section ? */
export function inside(g: SectionGeom, p: V): boolean {
  if (g.disk && (p[0] - g.disk.c[0]) ** 2 + (p[1] - g.disk.c[1]) ** 2 > g.disk.r ** 2 + 1e-9) return false;
  return g.planes.every((q) => dot(q.n, p) <= q.d + 1e-9);
}

/** Des points de la section, tous les quarts de centimètre. */
function samples(g: SectionGeom): V[] {
  const R = g.rings * 2 + WOOD.plank.wide;
  const out: V[] = [];
  for (let a = -R; a <= R; a += 0.25) for (let z = -R; z <= 2 * R; z += 0.25) if (inside(g, [a, z])) out.push([a, z]);
  return out;
}

/** Ce que coupe un rayon P0 + t·dir dans la section : [tin, tout], et ce qui le borne vers nous (`out` : -1 le disque, sinon la face). */
function chord(g: SectionGeom, P0: V, dir: V): { tin: number; tout: number; out: number } | undefined {
  let tin = -Infinity;
  let tout = Infinity;
  let out = -2;
  if (g.disk) {
    const m: V = [P0[0] - g.disk.c[0], P0[1] - g.disk.c[1]];
    const b = dot(m, dir);
    const c = dot(m, m) - g.disk.r ** 2;
    const disc = b * b - c;
    if (disc < 0) return undefined;
    const r = Math.sqrt(disc);
    tin = -b - r;
    tout = -b + r;
    out = -1;
  }
  g.planes.forEach((q, i) => {
    const nd = dot(q.n, dir);
    const np = dot(q.n, P0);
    if (Math.abs(nd) < 1e-12) {
      if (np > q.d + 1e-9) tin = Infinity;
      return;
    }
    const t = (q.d - np) / nd;
    if (nd > 0) {
      if (t < tout) { tout = t; out = i; }
    } else if (t > tin) tin = t;
  });
  return tin <= tout ? { tin, tout, out } : undefined;
}

/** La normale de la surface en P, sur le bord `out` (-1 le disque). */
function normalAt(g: SectionGeom, P: V, out: number): V {
  if (out >= 0) return g.planes[out].n;
  const d: V = [P[0] - g.disk!.c[0], P[1] - g.disk!.c[1]];
  const l = Math.hypot(d[0], d[1]) || 1;
  return [d[0] / l, d[1] / l];
}

/** Le bord le plus proche de P : -1 le disque, sinon la face. */
function nearestEdge(g: SectionGeom, P: V): number {
  let best = Infinity;
  let which = -1;
  if (g.disk) best = Math.abs(Math.hypot(P[0] - g.disk.c[0], P[1] - g.disk.c[1]) - g.disk.r);
  g.planes.forEach((q, i) => {
    const d = Math.abs(q.d - dot(q.n, P));
    if (d < best) { best = d; which = i; }
  });
  return which;
}

/** Lumière en haut à gauche, dans la section : du nord et d'en haut en est-ouest, de l'ouest et d'en haut en nord-sud. */
const LIGHT: Record<'ew' | 'ns', V> = { ew: [-0.75, 0.66], ns: [0.75, 0.66] };

/** Le rôle de chaque pixel d'une vue : `b` écorce, `s` face fendue, `h` dressée, `p` planche, `e` bois de bout, `.` vide. */
const ROLE: Record<FaceKind, string> = { split: 's', hewn: 'h', plank: 'p' };

/** Une vue calculée : l'image, le rôle de chaque pixel, et où tombe à l'écran un point de la pièce. */
export interface LyingView {
  c: Canvas;
  roles: string[][];
  /** Normale (en z) de la surface vue à chaque pixel : la part tournée vers le haut ; NaN hors de la pièce et sur le bois de bout. */
  up: number[][];
  /** Où tombe à l'écran (colonne, rangée, en pixels) le point (a, z) de la section à `along` px du bout de départ. */
  project(a: number, z: number, along: number): [number, number];
  /** La longueur de la pièce le long de son axe, en pixels, sans la part que prend le bout en raccourci. */
  lin: number;
  geom: SectionGeom;
}

/** La fente de la face de coupe d'un rond : angle à l'image 0 (vers le haut à gauche), un quart de tour par image. */
const CRACK0 = (-3 * Math.PI) / 4;

/** Ce qu'on fait de chaque pixel trouvé, avant la matière des faces planes (qui demande toute la colonne ou la rangée). */
interface Hit { role: string; P: V; out: number; along: number; light: number; up: number }

/**
 * La vue couchée d'une pièce de l'aspect `look` de `size`, dans le sens `axis`, de `total` px le long de la pièce (est-ouest :
 * la largeur de l'image ; nord-sud : sa hauteur), à l'image `k` du roulement ; le quartier `point` en bas s'il le faut.
 */
export function lyingView(size: string, look: WoodLook, axis: 'ew' | 'ns', total: number, k = 0, point?: WoodPiece['point']): LyingView {
  const g = sectionGeom(size, look, point);
  const def = lookDef(size, look);
  const skin = SKINS[size];
  if (!skin) throw new Error(`wood-section : pas de matière pour le diamètre « ${size} » (wood-skin.ts)`);
  const B = def.ew.h - def.ew.body.bottom - 2;
  const Wa = g.amax - g.amin;
  const cz = RACCOURCI / CM_PER_PX;
  const rings = sizeOf(size).diameter / CM_PER_PX >= 7;
  const hits = new Map<string, Hit>();
  let W: number;
  let H: number;
  let project: LyingView['project'];
  let lin: number;
  if (axis === 'ew') {
    W = total;
    H = def.ew.h;
    const n = total - 1;
    // le travers à l'échelle du sol (le pas d'un tas), la hauteur dans ce qui reste
    const sd = Math.min(def.ew.body.h, B) / Wa;
    const pts = samples(g);
    const ext = (sz: number) => {
      const ps = pts.map(([a, z]) => sd * a - sz * z);
      return { min: Math.min(...ps), span: Math.max(...ps) - Math.min(...ps) };
    };
    let sz = 0;
    if (ext(0).span < B) {
      let lo = 0;
      let hi = 4;
      for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (ext(m).span < B) lo = m; else hi = m; }
      sz = (lo + hi) / 2;
    }
    const { min: pmin, span } = ext(sz);
    const norm = Math.hypot(sz, sd);
    const dir: V = [sz / norm, sd / norm];
    // la profondeur vers l'œil le long du rayon (q, au milieu de la corde de la rangée) décale le point vers l'est : le bout ouest se
    // voit, la face de coupe écrasée en raccourci, et les deux bouts sont symétriques quelle que soit la forme (pas de cisaillement)
    const rowP = (i: number) => pmin + ((i + 0.5) * span) / B;
    const P0of = (p: number): V => [(p * sd) / (sd * sd + sz * sz), (-p * sz) / (sd * sd + sz * sz)];
    const chords = [...Array(B).keys()].map((i) => chord(g, P0of(rowP(i)), dir));
    const half = Math.max(...chords.map((c) => (c ? (c.tout - c.tin) / 2 : 0)));
    const Lin = n - 2 - 2 * cz * half;
    lin = Lin;
    const midOf = (p: number) => {
      const c = chord(g, P0of(p), dir);
      return c ? (c.tin + c.tout) / 2 : 0;
    };
    project = (a, z, along) => {
      const p = sd * a - sz * z;
      return [1 + along + cz * (dot([a, z], dir) - midOf(p) + half), 1 + ((p - pmin) * B) / span];
    };
    for (let i = 0; i < B; i++) {
      // le point du rayon où q = 0 : le long du rayon, t = q
      const P0 = P0of(rowP(i));
      const ch = chords[i];
      if (!ch) continue;
      const mid = (ch.tin + ch.tout) / 2;
      for (let X = 1; X <= n - 2; X++) {
        const tA = mid - half + (X - 0.5) / cz;
        const tB = mid - half + (X - 0.5 - Lin) / cz;
        const tv = Math.min(ch.tout, tA);
        if (tv < Math.max(ch.tin, tB)) continue;
        const P: V = [P0[0] + tv * dir[0], P0[1] + tv * dir[1]];
        const along = X + 0.5 - 1 - cz * (tv - mid + half);
        if (tA < ch.tout) hits.set(`${X},${1 + i}`, { role: 'e', P, out: -2, along, light: 1, up: NaN });
        else {
          const N = normalAt(g, P, ch.out);
          hits.set(`${X},${1 + i}`, { role: ch.out < 0 ? 'b' : ROLE[g.planes[ch.out].kind], P, out: ch.out, along, light: dot(N, LIGHT.ew), up: N[1] });
        }
      }
    }
  } else {
    H = total;
    const n = total - 2;
    W = def.ns.w;
    const sx = B / Wa;
    const es = cz * g.zmax;
    const Lin = n - 2 - es;
    lin = Lin;
    project = (a, z, along) => [1 + (g.amax - a) * sx, 1 + es + along - cz * z];
    for (let j = 0; j < B; j++) {
      const a = g.amax - (j + 0.5) / sx;
      const ch = chord(g, [a, 0], [0, 1]);
      if (!ch) continue;
      for (let Y = 1; Y <= n - 2; Y++) {
        const yc = Y + 0.5;
        const zA = (1 + es - yc) / cz;
        const zB = (Lin + 1 + es - yc) / cz;
        const zv = Math.min(ch.tout, zB);
        if (zv < Math.max(ch.tin, zA)) continue;
        const P: V = [a, zv];
        const along = yc - 1 - es + cz * zv;
        if (zB < ch.tout) hits.set(`${1 + j},${Y}`, { role: 'e', P, out: -2, along, light: 1, up: NaN });
        else {
          const N = normalAt(g, P, ch.out);
          hits.set(`${1 + j},${Y}`, { role: ch.out < 0 ? 'b' : ROLE[g.planes[ch.out].kind], P, out: ch.out, along, light: dot(N, LIGHT.ns), up: N[1] });
        }
      }
    }
  }
  const c = new Canvas(W, H);
  const roles = [...Array(H)].map(() => [...Array(W)].map(() => EMPTY));
  const up = [...Array(H)].map(() => [...Array(W)].map(() => NaN));
  const at = (X: number, Y: number) => hits.get(`${X},${Y}`);
  // les faces planes : en travers, de leur bord côté lumière (le haut en est-ouest, l'ouest en nord-sud), rang par rang
  const across = new Map<string, { i: number; count: number }>();
  const runs = axis === 'ew' ? W : H;
  for (let u = 0; u < runs; u++) {
    let run: string[] = [];
    let last = -3;
    const flush = () => { run.forEach((key, i) => across.set(key, { i, count: run.length })); run = []; };
    const len = axis === 'ew' ? H : W;
    for (let v = 0; v < len; v++) {
      const [X, Y] = axis === 'ew' ? [u, v] : [v, u];
      const h = at(X, Y);
      const plane = h && h.role !== 'b' && h.role !== 'e' ? h.out : -3;
      if (plane !== last) flush();
      if (plane >= 0) run.push(`${X},${Y}`);
      last = plane;
    }
    flush();
  }
  for (const [key, h] of hits) {
    const [X, Y] = key.split(',').map(Number);
    roles[Y][X] = h.role;
    up[Y][X] = h.up;
    c.set(X, Y, paint(g, skin, h, across.get(key), axis, k, rings));
  }
  // le bord d'un bout coupé, là où l'arc d'écorce le borde : cerclé d'écorce
  for (const [key, h] of hits) {
    if (h.role !== 'e' || !g.bark) continue;
    const [X, Y] = key.split(',').map(Number);
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !at(X + dx, Y + dy));
    if (edge && nearestEdge(g, h.P) === -1) c.set(X, Y, endTone(g, skin, h, axis, k, rings, true));
  }
  // le rond écorcé (pas d'écorce pour cercler son bout) : l'arête entre le bois de bout et le corps, un cran plus sombre, pour que le
  // bout se détache du cylindre de même bois
  if (!g.bark && g.round) {
    const DARK: Record<string, string> = { '^': '%', '*': '%', '%': '&', '&': '&' };
    const edge: [number, number][] = [];
    for (const [key, h] of hits) {
      if (h.role !== 'e') continue;
      const [X, Y] = key.split(',').map(Number);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(X + dx, Y + dy)?.role === 'b')) edge.push([X, Y]);
    }
    for (const [X, Y] of edge) c.set(X, Y, DARK[c.get(X, Y)] ?? c.get(X, Y));
  }
  // le bois travaillé (^ * %), l'écorce (N, la perche S A B) et le contour gardent leurs pixels seuls ; le creux & et les sillons non
  despeckle(c, 'K^*%NSAB');
  shadedOutline(c);
  if (axis === 'ew') {
    const S = def.ew.body.bottom;
    const n = total - 1;
    // l'ombre au sol : des rangées pleines sous le corps, la dernière plus courte (pleine s'il n'y en a qu'une)
    for (let r = 0; r < S; r++) {
      const short = S > 1 && r === S - 1;
      for (let X = short ? 4 : 2; X <= (short ? n - 2 : n - 1); X++) if (c.get(X, B + 2 + r) === EMPTY) c.set(X, B + 2 + r, 'x');
    }
  } else nsGroundShadow(c, Math.max(1, def.ns.w - B - 2) as 1 | 2);
  return { c, roles, up, project, lin, geom: g };
}

/** Le bois de bout au point P : cernes autour du cœur, la fente du rond qui tourne quand il roule, le bord d'écorce. */
function endTone(g: SectionGeom, skin: Skin, h: Hit, axis: 'ew' | 'ns', k: number, rings: boolean, rim = false): string {
  const R = g.rings;
  const da = (h.P[0] - g.heart[0]) / R;
  const dz = (h.P[1] - g.heart[1]) / R;
  // à l'écran : est-ouest, le bout ouest (la hauteur vers la droite, le travers vers le bas) ; nord-sud, le bout sud
  const [u, v] = axis === 'ew' ? [dz, da] : [-da, -dz];
  if (rim) return skin.end(u, v, true, rings);
  if (g.round) {
    const th = CRACK0 + (k * Math.PI) / 2;
    const r = Math.hypot(u, v);
    let d = Math.atan2(v, u) - th;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (r >= 0.3 && r <= 0.95 && Math.abs(d) < 0.3) return '%';
  }
  return skin.end(u, v, false, rings);
}

/** La matière d'un pixel trouvé. */
function paint(g: SectionGeom, skin: Skin, h: Hit, across: { i: number; count: number } | undefined, axis: 'ew' | 'ns', k: number, rings: boolean): string {
  if (h.role === 'e') return endTone(g, skin, h, axis, k, rings);
  if (h.role === 'b') {
    const N = normalAt(g, h.P, -1);
    // l'anneau d'écorce : de son bord côté lumière (le nord en est-ouest, l'ouest en nord-sud), par-dessus, vers l'autre
    const phi = axis === 'ew' ? Math.atan2(N[1], -N[0]) : Math.atan2(N[1], N[0]);
    const ring = Math.floor(((((phi / (2 * Math.PI)) % 1) + 1) % 1) * skin.ringSize);
    const s = Math.min(0.999, Math.max(0, (1 - h.light) / 2));
    // le rond écorcé (`bark: 'none'`) : le même anneau, en bois mis à nu
    if (!g.bark) return skin.peeled(Math.floor(h.along), ring, s, k);
    return skin.bark(Math.floor(h.along), ring, s, k);
  }
  const kind = g.planes[h.out].kind;
  return skin.face(kind, { along: Math.floor(h.along), across: across?.i ?? 0, count: across?.count ?? 1, light: h.light });
}

/**
 * Ombre au sol d'une pièce nord-sud : sous son bout sud et le long de son flanc est, le corps décalé d'un pixel à droite et de deux
 * vers le bas ; `wide` 2 : une seconde colonne, plus courte.
 */
function nsGroundShadow(c: Canvas, wide: 1 | 2) {
  const body = Canvas.from(c.toGrid());
  const shifts: [number, number][] = wide === 1 ? [[1, 2]] : [[1, 2], [2, 3]];
  for (let Y = 0; Y < c.h; Y++) for (let X = 0; X < c.w; X++) {
    if (c.get(X, Y) !== EMPTY) continue;
    if (shifts.some(([dx, dy]) => { const q = body.get(X - dx, Y - dy); return q !== EMPTY && q !== 'x'; })) c.set(X, Y, 'x');
  }
}

/**
 * La section elle-même, vue par son bout : `px` pixels par centimètre (le contour en plus), le travers vers la droite (le sud de
 * l'est-ouest à gauche, comme le bout sud d'un nord-sud), la hauteur vers le haut. Bois de bout, cernes, cœur, écorce ; les faces
 * planes en bord de bois frais. Pour bois-sections.png et les vues portées par le bout.
 */
export function endView(size: string, look: WoodLook, px: number, point?: WoodPiece['point']): Canvas {
  const g = sectionGeom(size, look, point);
  const skin = SKINS[size];
  const W = Math.ceil((g.amax - g.amin) * px) + 2;
  const H = Math.ceil(g.zmax * px) + 2;
  const c = new Canvas(W, H);
  const pts = new Map<string, V>();
  for (let Y = 1; Y < H - 1; Y++) for (let X = 1; X < W - 1; X++) {
    const P: V = [g.amax - (X - 1 + 0.5) / px, g.zmax - (Y - 1 + 0.5) / px];
    if (inside(g, P)) pts.set(`${X},${Y}`, P);
  }
  const rings = sizeOf(size).diameter * px >= 7;
  for (const [key, P] of pts) {
    const [X, Y] = key.split(',').map(Number);
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !pts.has(`${X + dx},${Y + dy}`));
    const bark = edge && g.bark && nearestEdge(g, P) === -1;
    const h: Hit = { role: 'e', P, out: -2, along: 0, light: 1, up: NaN };
    c.set(X, Y, endTone(g, skin, h, 'ns', 0, rings, bark));
  }
  return shadedOutline(c);
}
