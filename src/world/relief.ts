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
/** Jusqu'où, depuis le bord du sol d'un couloir en gradins, on connaît ce couloir (cm) : la masse en coupe remplit le bas de l'écran. */
const STEPS_REACH = 1000;

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
  /**
   * Les couloirs en gradins (`steps` d'un `Lane`) : à chaque nœud proche d'un tel couloir, son numéro (`idx`, −1 ailleurs), la distance
   * à son axe (`sd`, cm, négative au nord), son sol (`floor`) et la hauteur de ce qui l'entoure avant qu'on le creuse (`around`). Ces
   * trois valeurs varient doucement : interpolées entre les nœuds, puis passées par la règle des gradins, elles donnent des marches
   * droites et des gradins plats au pixel près (la grille seule, de 40 cm, ferait des pentes d'un gradin de 50 cm).
   */
  readonly steps?: { readonly idx: Int16Array; readonly sd: Float32Array; readonly floor: Float32Array; readonly around: Float32Array };
  readonly lanes?: Relief['lanes'];
}

type Steps = { rise: number; tread: number; count: number };

/**
 * La hauteur d'une paroi en gradins à `e` cm du bord du sol (`e` < 0 : sur le sol), pour un sol à `floor` et ce qui l'entoure à
 * `around` : la marche k (de 1 à count) a son pied à (k − 1) × tread et monte à around − (count − k) × rise ; au-delà de la dernière,
 * le dessus. Quand le sol monte, les marches du bas s'enterrent une à une (le sol les recouvre et s'élargit d'autant).
 */
export function stepHeight(st: Steps, e: number, floor: number, around: number): number {
  if (around <= floor) return around;
  if (e < 0) return floor;
  const k = Math.floor(e / st.tread) + 1;
  if (k > st.count) return around;
  return Math.max(floor, around - (st.count - k) * st.rise);
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
  let steps: ReliefField['steps'];
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
    // les couloirs en gradins : la règle des gradins à chaque nœud, et ce qu'il faut pour l'interpoler (`steps` du champ)
    relief.lanes.forEach((ln, li) => {
      const st = ln.steps;
      if (!st) return;
      const n = (cols + 1) * (rows + 1);
      steps ??= { idx: new Int16Array(n).fill(-1), sd: new Float32Array(n), floor: new Float32Array(n), around: new Float32Array(n) };
      // au-delà des gradins, jusqu'à STEPS_REACH : la masse qu'on voit en coupe sous la voûte (son sol, `floor`, y est connu)
      const reach = (ln.width / 2 + Math.max(st.count * st.tread, STEPS_REACH)) / CM_PER_PX + 3 * RELIEF_CELL;
      eachNear(ln.points, reach, cols, rows, (i, near) => {
        const p = lerpPoint(ln.points, near);
        const r = Math.floor(i / (cols + 1));
        const side = r * RELIEF_CELL >= p.y ? 1 : -1;
        const around = data[i];
        steps!.idx[i] = li;
        steps!.sd[i] = side * near.d * CM_PER_PX;
        steps!.floor[i] = p.h;
        steps!.around[i] = around;
        data[i] = stepHeight(st, near.d * CM_PER_PX - ln.width / 2, p.h, around);
      });
    });
    // les couloirs : le sol à sa hauteur, le talus intérieur qui le raccorde à ce qui l'entoure
    for (const ln of relief.lanes) {
      if (ln.steps) continue;
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
  return { base, flat, max, cols, rows, data, ...(steps ? { steps, lanes: relief!.lanes } : {}) };
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

/** Ce qu'est un point d'un couloir en gradins (`stepsAt`). */
export interface StepPlace {
  /** Le couloir (son rang dans `relief.lanes`). */
  lane: number;
  /** Au sud de l'axe (1) ou au nord (−1). */
  side: 1 | -1;
  /** La distance au bord du sol (cm ; négative sur le sol). */
  e: number;
  /** Le sol du couloir et ce qui l'entoure (cm). */
  floor: number;
  around: number;
  /** 0 sur le sol, k sur le gradin k (au pied de la marche k + 1 ; le gradin `count` est le dessus), count + 1 au-delà. */
  k: number;
  /** Les gradins du couloir. */
  steps: Steps;
}

/** Bilinéaire d'un tableau aux nœuds de la grille (sans fermeture : appelée pour chaque pixel peint). */
function lerp4(a: Float32Array, i00: number, W: number, u: number, v: number): number {
  return (a[i00] * (1 - u) + a[i00 + 1] * u) * (1 - v) + (a[i00 + W] * (1 - u) + a[i00 + W + 1] * u) * v;
}

/**
 * Le point (x, y) d'un couloir en gradins, avec ses valeurs interpolées, ou undefined (hors d'un couloir en gradins). Appelée pour
 * chaque pixel du terrain peint : `out`, s'il est donné, est rempli et rendu (aucun objet créé).
 */
export function stepsAt(f: ReliefField, x: number, y: number, out?: StepPlace): StepPlace | undefined {
  const st = f.steps;
  if (!st || !f.lanes) return undefined;
  const fx = Math.max(0, Math.min(f.cols, x / RELIEF_CELL));
  const fy = Math.max(0, Math.min(f.rows, y / RELIEF_CELL));
  const c = Math.min(f.cols - 1, Math.floor(fx));
  const r = Math.min(f.rows - 1, Math.floor(fy));
  const W = f.cols + 1;
  const i00 = r * W + c;
  const li = st.idx[i00];
  if (li < 0 || st.idx[i00 + 1] !== li || st.idx[i00 + W] !== li || st.idx[i00 + W + 1] !== li) return undefined;
  const u = fx - c;
  const v = fy - r;
  const ln = f.lanes[li];
  const steps = ln.steps!;
  const sd = lerp4(st.sd, i00, W, u, v);
  const e = Math.abs(sd) - ln.width / 2;
  const o = out ?? ({} as StepPlace);
  o.lane = li;
  o.side = sd >= 0 ? 1 : -1;
  o.e = e;
  o.floor = lerp4(st.floor, i00, W, u, v);
  o.around = lerp4(st.around, i00, W, u, v);
  o.k = e < 0 ? 0 : Math.min(steps.count + 1, Math.floor(e / steps.tread) + 1);
  o.steps = steps;
  return o;
}

/** Le point de travail de `fieldHeight` (rempli à chaque appel, jamais gardé). */
const SCRATCH = {} as StepPlace;

/** La hauteur d'un champ en (x, y) (cm). */
export function fieldHeight(f: ReliefField, x: number, y: number): number {
  if (f.flat) return f.base;
  const sp = stepsAt(f, x, y, SCRATCH);
  if (sp) return stepHeight(sp.steps, sp.e, sp.floor, sp.around);
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
    // la vraie hauteur, d'un replat à l'autre : la grille arrondit les coins d'une marche sur une case ; on suit encore, sur une case
    // au plus, le sol qui continue de monter (ou de descendre) moins raide
    const goes = (p: number) => (at(p + PROBE) - at(p)) * sign > 0.01;
    for (let k = 0; k < RELIEF_CELL && goes(a - PROBE); k += PROBE) a -= PROBE;
    for (let k = 0; k < RELIEF_CELL && goes(b + PROBE); k += PROBE) b += PROBE;
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

/**
 * Une hauteur dite à un joueur, la vraie, au centimètre (décision de Grégoire : « Trop haute pour lui (1,25 m). », jamais arrondie à
 * l'œil) : « 80 cm » sous 1 m, en mètres au-delà, sans zéro inutile (« 1 m », « 1,2 m », « 1,25 m », « 5 m »).
 */
export function heightText(cm: number): string {
  // au centimètre d'abord : 99,8 cm se dit « 1 m », pas « 100 cm »
  const c = Math.round(cm);
  if (c < 100) return `${c} cm`;
  return `${String(c / 100).replace('.', ',')} m`;
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
