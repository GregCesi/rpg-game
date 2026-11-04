import { TILE } from '../config';
import { CM_PER_PX } from '../content/gabarit';
import type { MapData, Mobility, Relief } from '../content/types';
import terrain from '../generated/terrain.json';

/**
 * Le relief (docs/CONCEPTION.md, « Le relief »), sans Phaser : la hauteur de chaque point d'une carte, tirée des formes du calque
 * `relief` de Tiled (`MapData.relief` : niveaux plats, talus en long, couloirs creusés), et ce qu'un personnage peut franchir d'un point
 * à l'autre selon ses capacités (`Mobility` : monter, sauter, la pente qu'il marche, nager). Le monde ne limite pas : un refus dit ce qui
 * lui manque, à lui (« Trop haute pour lui (5 m). », « Il ne sait pas nager. »).
 *
 * Les hauteurs sont en cm ; les points en px de la carte. Une carte sans relief (un intérieur) est à 0 partout, sans calcul.
 */

/** Le pas de la grille des hauteurs (px) : 40 cm, comme le chemin des créatures ; entre deux nœuds, la hauteur s'interpole. */
export const RELIEF_CELL = 8;
/** Le pas d'échantillonnage d'un trajet (px) pour y chercher une marche. */
const PROBE = 2;
/** Jusqu'où l'on suit une marche raide pour en mesurer la hauteur (px) : 20 m. */
const RUN_REACH = 400;

export interface ReliefField {
  /** Hauteur de fond, partout où aucune forme ne monte ni ne creuse (cm). */
  readonly base: number;
  /** Aucune forme : la hauteur vaut `base` partout. */
  readonly flat: boolean;
  /** Hauteur la plus haute de la carte (cm) : jusqu'où chercher l'image d'un point (`pick`). */
  readonly max: number;
  readonly cols: number;
  readonly rows: number;
  /** Hauteurs aux nœuds de la grille (cm), ligne par ligne : (cols + 1) × (rows + 1). */
  readonly data: Float32Array;
}

const fields = new WeakMap<MapData, ReliefField>();
const deeps = new WeakMap<MapData, Uint8Array>();

/** Les tuiles d'eau profonde du jeu de tuiles (src/generated/terrain.json, écrit par build-art). */
function deepTiles(tileset: string): ReadonlySet<number> {
  return new Set((terrain as Record<string, { deep: number[] }>)[tileset]?.deep ?? []);
}

/** Le champ des hauteurs d'une carte, calculé une fois (gardé tant que la carte existe). */
export function reliefOf(map: MapData): ReliefField {
  let f = fields.get(map);
  if (!f) {
    f = rasterize(map.relief, map.width * TILE, map.height * TILE);
    fields.set(map, f);
  }
  return f;
}

/** Les formes d'un relief, en grille de hauteurs. Exporté pour les tests. */
export function rasterize(relief: Relief | undefined, width: number, height: number): ReliefField {
  const cols = Math.ceil(width / RELIEF_CELL);
  const rows = Math.ceil(height / RELIEF_CELL);
  const base = relief?.base ?? 0;
  const flat = !relief || (relief.levels.length === 0 && relief.ridges.length === 0 && relief.lanes.length === 0);
  const data = new Float32Array(flat ? 0 : (cols + 1) * (rows + 1)).fill(base);
  if (relief && !flat) {
    const W = cols + 1;
    // les niveaux plats : remplissage par lignes (pair-impair), le plus haut l'emporte
    for (const lv of relief.levels) {
      const pts = lv.points;
      for (let r = 0; r <= rows; r++) {
        const y = r * RELIEF_CELL;
        const xs: number[] = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const c0 = Math.max(0, Math.ceil(xs[k] / RELIEF_CELL));
          const c1 = Math.min(cols, Math.floor(xs[k + 1] / RELIEF_CELL));
          for (let c = c0; c <= c1; c++) if (data[r * W + c] < lv.height) data[r * W + c] = lv.height;
        }
      }
    }
    // les talus en long : la crête à sa hauteur, le flanc qui descend à 0
    for (const rg of relief.ridges) {
      const reach = Math.max(...rg.points.map((p) => p.crest / 2 + p.flank)) / CM_PER_PX;
      eachNear(rg.points, reach, cols, rows, (i, near) => {
        const p = lerpPoint(rg.points, near);
        const d = near.d * CM_PER_PX;
        const h = d <= p.crest / 2 ? p.h : p.h * Math.max(0, 1 - (d - p.crest / 2) / p.flank);
        if (data[i] < h) data[i] = h;
      });
    }
    // les couloirs : le sol à sa hauteur, le talus intérieur qui le raccorde à ce qui l'entoure
    for (const ln of relief.lanes) {
      let top = base;
      for (const v of data) if (v > top) top = v;
      const reach = (ln.width / 2 + ln.inner + ln.innerSlope * top) / CM_PER_PX;
      eachNear(ln.points, reach, cols, rows, (i, near) => {
        const floor = lerpPoint(ln.points, near).h;
        const around = data[i];
        if (around <= floor) return;
        const d = near.d * CM_PER_PX;
        if (d <= ln.width / 2) {
          data[i] = floor;
          return;
        }
        const w = ln.inner + ln.innerSlope * (around - floor);
        if (d < ln.width / 2 + w) data[i] = floor + ((d - ln.width / 2) / w) * (around - floor);
      });
    }
  }
  let max = base;
  for (const v of data) if (v > max) max = v;
  return { base, flat, max, cols, rows, data };
}

interface Near {
  /** Le segment le plus proche (son premier sommet). */
  seg: number;
  /** La place sur ce segment, de 0 à 1. */
  t: number;
  /** La distance (px). */
  d: number;
}

/** Le point de la polyligne le plus proche de (x, y). */
export function nearest(pts: readonly { x: number; y: number }[], x: number, y: number): Near {
  let best: Near = { seg: 0, t: 0, d: Infinity };
  for (let s = 0; s + 1 < pts.length; s++) {
    const a = pts[s];
    const b = pts[s + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
    const d = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
    if (d < best.d) best = { seg: s, t, d };
  }
  return best;
}

/** Les valeurs d'un sommet de polyligne, interpolées à la place `near`. */
function lerpPoint<P extends { x: number; y: number }>(pts: readonly P[], near: Near): P {
  const a = pts[near.seg] as unknown as Record<string, number>;
  const b = (pts[near.seg + 1] ?? pts[near.seg]) as unknown as Record<string, number>;
  const out: Record<string, number> = {};
  for (const k of Object.keys(a)) out[k] = a[k] + near.t * (b[k] - a[k]);
  return out as unknown as P;
}

/** Chaque nœud de la grille à moins de `reach` px de la polyligne, avec son point le plus proche. */
function eachNear(pts: readonly { x: number; y: number }[], reach: number, cols: number, rows: number, fn: (i: number, near: Near) => void): void {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const c0 = Math.max(0, Math.floor((Math.min(...xs) - reach) / RELIEF_CELL));
  const c1 = Math.min(cols, Math.ceil((Math.max(...xs) + reach) / RELIEF_CELL));
  const r0 = Math.max(0, Math.floor((Math.min(...ys) - reach) / RELIEF_CELL));
  const r1 = Math.min(rows, Math.ceil((Math.max(...ys) + reach) / RELIEF_CELL));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const near = nearest(pts, c * RELIEF_CELL, r * RELIEF_CELL);
      if (near.d <= reach) fn(r * (cols + 1) + c, near);
    }
  }
}

/** La hauteur du sol en (x, y) (cm), interpolée entre les nœuds de la grille. */
export function heightAt(map: MapData, x: number, y: number): number {
  return fieldHeight(reliefOf(map), x, y);
}

/** La hauteur d'un champ en (x, y) (cm). */
export function fieldHeight(f: ReliefField, x: number, y: number): number {
  if (f.flat) return f.base;
  const fx = Math.max(0, Math.min(f.cols, x / RELIEF_CELL));
  const fy = Math.max(0, Math.min(f.rows, y / RELIEF_CELL));
  const c = Math.min(f.cols - 1, Math.floor(fx));
  const r = Math.min(f.rows - 1, Math.floor(fy));
  const u = fx - c;
  const v = fy - r;
  const W = f.cols + 1;
  const d = f.data;
  const top = d[r * W + c] * (1 - u) + d[r * W + c + 1] * u;
  const bottom = d[(r + 1) * W + c] * (1 - u) + d[(r + 1) * W + c + 1] * u;
  return top * (1 - v) + bottom * v;
}

/** De combien de pixels l'image d'une chose posée en (x, y) monte à l'écran (projection : 5 cm de hauteur = 1 px). */
export function liftAt(map: MapData, x: number, y: number): number {
  return Math.round(heightAt(map, x, y) / CM_PER_PX);
}

/** Le point (x, y) est-il dans l'eau profonde (une tuile `deep`, tiles.json) ? */
export function deepAt(map: MapData, x: number, y: number): boolean {
  let grid = deeps.get(map);
  if (!grid) {
    const deep = deepTiles(map.tileset);
    const g = new Uint8Array(map.width * map.height);
    if (deep.size) map.layers.ground?.forEach((n, i) => (g[i] = deep.has(n) ? 1 : 0));
    deeps.set(map, g);
    grid = g;
  }
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false;
  return grid[ty * map.width + tx] === 1;
}

/** Ce qui empêche un pas : une marche trop haute à monter (`up`) ou à sauter (`down`), ou l'eau pour qui ne nage pas. */
export type StepRefusal = { why: 'up' | 'down'; height: number } | { why: 'swim' };

/**
 * Le passage de `from` à `to` (les pieds) est-il permis à ce personnage ? Sur le trajet, ce qui est plus raide que `slope` compte
 * comme une marche, de toute sa hauteur (suivie au-delà du trajet, jusqu'au bout de la partie raide) : monter plus que `step` est
 * refusé, descendre plus que `drop` aussi ; de `step` à `drop` en descente, il saute. Entrer dans l'eau profonde est refusé à qui ne
 * nage pas (en sortir, jamais). Rend `undefined` si le pas est permis.
 */
export function stepRefusal(map: MapData, from: { x: number; y: number }, to: { x: number; y: number }, mob: Mobility): StepRefusal | undefined {
  // l'eau en dernier : au bord du plateau, c'est la hauteur qui l'arrête (il tomberait de 5 m), pas l'eau en bas
  const swim = !mob.swim && deepAt(map, to.x, to.y) && !deepAt(map, from.x, from.y) ? ({ why: 'swim' } as const) : undefined;
  const f = reliefOf(map);
  if (f.flat) return swim;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return swim;
  const ux = dx / len;
  const uy = dy / len;
  const at = (s: number) => fieldHeight(f, from.x + ux * s, from.y + uy * s);
  const limit = (mob.slope / 100) * PROBE * CM_PER_PX;
  /** La pente du pas qui part de `s` : +1 raide en montant, −1 raide en descendant, 0 marchable. */
  const steep = (s: number) => {
    const d = at(s + PROBE) - at(s);
    return d > limit ? 1 : d < -limit ? -1 : 0;
  };
  for (let s = 0; s < len; s += PROBE) {
    const sign = steep(s);
    if (!sign) continue;
    // la marche : la partie raide dans le même sens, d'un bout à l'autre, en arrière et au-delà du trajet (une crête étroite est
    // une montée puis une descente : deux marches, pas une)
    let a = s;
    while (a > -RUN_REACH && steep(a - PROBE) === sign) a -= PROBE;
    let b = s;
    while (b < RUN_REACH && steep(b + PROBE) === sign) b += PROBE;
    // déjà debout sur la partie raide (une partie d'avant le relief, posé là) : il en redescend toujours, et ne compte en montant
    // que ce qui reste devant lui
    const on = a < 0;
    const rise = at(b + PROBE) - at(on ? 0 : a);
    if (rise > mob.step) return { why: 'up', height: rise };
    if (-rise > mob.drop && !on) return { why: 'down', height: -rise };
    s = Math.max(s, b);
  }
  return swim;
}

/** Une hauteur dite à un joueur, comme on l'estime à l'œil : « 80 cm », « 1,2 m », au-delà de 2 m au demi-mètre (« 2,5 m », « 5 m »). */
export function heightText(cm: number): string {
  // arrondi d'abord : 99,8 cm se dit « 1 m », pas « 100 cm »
  if (Math.round(cm / 10) * 10 < 100) return `${Math.round(cm / 10) * 10} cm`;
  const m = cm < 200 ? Math.round(cm / 10) / 10 : Math.round(cm / 50) / 2;
  return `${String(m).replace('.', ',')} m`;
}

/** Le refus dit par ce qui manque au personnage (docs/CONCEPTION.md, « Le monde ne limite pas »). */
export function refusalText(r: StepRefusal): string {
  return r.why === 'swim' ? 'Il ne sait pas nager.' : `Trop haute pour lui (${heightText(r.height)}).`;
}

/**
 * Le point du monde que montre le point (sx, sy) de l'écran (en px de la carte, sans caméra) : sur la verticale, le point le plus au sud
 * dont l'image (soulevée de sa hauteur) passe là, celui qui est devant. Sur une carte plate, le point lui-même.
 */
export function pick(map: MapData, sx: number, sy: number): { x: number; y: number } {
  const f = reliefOf(map);
  if (f.flat) return { x: sx, y: sy + f.base / CM_PER_PX };
  const top = Math.ceil(f.max / CM_PER_PX);
  for (let y = Math.floor(sy) + top; y >= Math.floor(sy); y--) {
    // au pixel près, puis la fraction : le point dont l'image tombe juste sur sy (sur un sol plat, sy + h / 5 exactement)
    if (y - fieldHeight(f, sx, y) / CM_PER_PX <= sy) return { x: sx, y: Math.max(y, Math.min(y + 1, sy + fieldHeight(f, sx, y) / CM_PER_PX)) };
  }
  return { x: sx, y: sy };
}

/**
 * Le point (x, y) est-il sur une marche que ce personnage ne franchit pas, dans un sens ou dans l'autre (plus raide que `slope`, et
 * plus haute que `step`) ? Pour ce qui cherche son chemin point par point (les créatures, world/creature.ts) : la marche est un mur.
 */
export function wallAt(map: MapData, x: number, y: number, mob: Mobility): boolean {
  const f = reliefOf(map);
  if (f.flat) return false;
  const h = fieldHeight(f, x, y);
  const limit = (mob.slope / 100) * PROBE * CM_PER_PX;
  for (const [dx, dy] of [
    [PROBE, 0],
    [0, PROBE],
  ]) {
    if (Math.abs(fieldHeight(f, x + dx, y + dy) - h) <= limit && Math.abs(fieldHeight(f, x - dx, y - dy) - h) <= limit) continue;
    const r = stepRefusal(map, { x: x - dx * 2, y: y - dy * 2 }, { x: x + dx * 2, y: y + dy * 2 }, { ...mob, drop: mob.step, swim: true });
    if (r) return true;
  }
  return false;
}

/** Sur combien de pixels, depuis l'eau, le flanc planté d'un talus passe à la terre sombre (64 px = 3,2 m, la rive est). */
export const PLANTED_EDGE = 64;

/**
 * La matière d'une face de relief au point (x, y) du sol de la carte (CADRAGE 12.11) : 1 pour le flanc planté (herbe, broussailles),
 * 0 pour la terre sombre (racines, lierre), entre les deux sur les premiers mètres de la rive. Terre sombre : la paroi intérieure d'un
 * couloir, le flanc au-dessus de l'eau, le bord d'un niveau (la falaise). Planté : le flanc extérieur d'un talus sur la terre ferme.
 * Prête pour la correction proposée (le flanc planté, art/proposals/relief-final.ts), À REVOIR AVEC GRÉGOIRE (CADRAGE.md 12.12) : le
 * rendu ne s'en sert pas encore.
 */
export function plantedAt(map: MapData, x: number, y: number): number {
  const relief = map.relief;
  if (!relief || deepAt(map, x, y)) return 0;
  const f = reliefOf(map);
  for (const ln of relief.lanes) {
    const reach = (ln.width / 2 + ln.inner + ln.innerSlope * f.max) / CM_PER_PX;
    if (nearest(ln.points, x, y).d <= reach) return 0;
  }
  let flank = false;
  for (const rg of relief.ridges) {
    const near = nearest(rg.points, x, y);
    const p = lerpPoint(rg.points, near);
    if (near.d * CM_PER_PX <= p.crest / 2 + p.flank) flank = true;
  }
  if (!flank) return 0;
  // la distance à l'eau la plus proche sur la même ligne (de part et d'autre)
  for (let d = TILE / 4; d <= PLANTED_EDGE; d += TILE / 4)
    if (deepAt(map, x - d, y) || deepAt(map, x + d, y)) return d / PLANTED_EDGE;
  return 1;
}
