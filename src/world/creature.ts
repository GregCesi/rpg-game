// Une créature, sans Phaser (docs/CONCEPTION.md, « Les créatures ») : le moteur commun à toutes les bêtes, réglé par leurs données
// (creatures.json) ; aucune règle écrite pour une espèce. Ce qu'elle perçoit de Xéros (la distance et son allure : immobile, discret,
// à la marche, à la course), ses trois états (tranquille, aux aguets, en fuite) et deux mouvements de plus (rentrer au terrier sans
// peur, tambouriner à l'entrée), sa destination (brouter autour de sa garenne par petits sauts, fuir vers l'entrée la plus proche en
// zigzag), l'évitement des obstacles (rien de ce qui a un corps n'est jamais traversé : chaque pas est vérifié pixel par pixel), et
// l'entrée au terrier au franchissement (world/crossing.ts). La garenne (world/warren.ts) décide qui sort et qui rentre ; le jeu
// (systems/creatures.ts) avance chaque bête par pas de jeu de taille normale, donc aussi en temps accéléré.

import { CM_PER_PX } from '../content/gabarit';
import type { CreatureDef, Facing, Gait } from '../content/types';
import { crossed } from './crossing';

export type Point = { x: number; y: number };

/**
 * Ce que fait la bête : `calm` (tranquille, elle broute), `alert` (aux aguets, dressée, elle regarde Xéros), `flee` (en fuite vers
 * l'entrée la plus proche), `home` (elle rentre au terrier sans peur : le soir, ou parce que la garenne veut moins de bêtes dehors),
 * `thump` (à l'entrée, elle tambourine avant d'entrer), `burrow` (au terrier : invisible, la garenne la fera ressortir).
 */
export type Mode = 'calm' | 'alert' | 'flee' | 'home' | 'thump' | 'burrow';

/** La pose dessinée (animation `<image>-<pose>-<direction>`). */
export type Pose = 'graze' | 'sit' | 'hop' | 'alert' | 'run' | 'thump';

/** Une bête vivante sur la carte. Positions en px du monde (5 cm par px) : ses pieds. */
export interface Creature {
  id: string;
  kind: string;
  x: number;
  y: number;
  facing: Facing;
  mode: Mode;
  pose: Pose;
  hp: number;
  /** Les pieds à la fin du pas d'avant : le franchissement de l'entrée se teste sur le chemin parcouru. */
  from?: Point;
  /** Où elle broute ; combien de temps encore elle y reste (s). */
  goal?: Point;
  stayLeft: number;
  /** Le saut en cours : où il retombe. */
  hop?: Point;
  /** Pause entre deux sauts, ou durée restante du tambour (s). */
  wait: number;
  /** Aux aguets : depuis combien de secondes Xéros est immobile ou s'éloigne ; sa distance au pas d'avant (m). */
  calmFor: number;
  lastDist?: number;
  /** L'entrée visée (fuite, retour) et le chemin pour y aller (px), sans obstacle. */
  hole?: Point;
  path?: Point[];
  /** Le zigzag de la fuite : de quel côté elle s'écarte, combien de px avant de changer. */
  zig: { side: 1 | -1; left: number };
  /** Pourquoi elle fuit : Xéros trop près (`seen`), le tambour d'une voisine (`alarm`), un coup (`hurt`). */
  fled?: 'seen' | 'alarm' | 'hurt';
  /** Au terrier : combien de secondes avant de pouvoir ressortir. */
  den: number;
}

/** Ce qui entoure la bête : Xéros (s'il est sur la carte), ce qui barre le passage, les entrées de sa garenne, le hasard. */
export interface Surroundings {
  threat?: { x: number; y: number; gait: Gait };
  /** Le point (px) est-il dans un obstacle (une tuile pleine, un corps) ? */
  blocked: (x: number, y: number) => boolean;
  holes: Point[];
  rand: () => number;
}

/** Ce qu'un pas a fait d'important : un tambour à l'entrée (les voisines fuient), une entrée au terrier. */
export type CreatureEvent = { kind: 'thump'; at: Point } | { kind: 'enter' };

export const metres = (px: number): number => (px * CM_PER_PX) / 100;
export const pixels = (m: number): number => (m * 100) / CM_PER_PX;
export const between = (rand: () => number, [a, b]: [number, number]): number => a + (b - a) * rand();
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Une bête qui sort du terrier à l'entrée `at`, tranquille. */
export function emerge(id: string, kind: string, def: CreatureDef, at: Point, hp = def.target.hp): Creature {
  return { id, kind, x: at.x, y: at.y, facing: 'down', mode: 'calm', pose: 'sit', hp, stayLeft: 0, wait: 0, calmFor: 0, zig: { side: 1, left: 0 }, den: 0 };
}

/** La direction dessinée la plus proche d'un mouvement. */
export function facingOf(dx: number, dy: number, was: Facing): Facing {
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return was;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

/** Ce que la bête perçoit de Xéros : `flee`, `alert` ou rien, selon la distance et les distances de son allure (`senses`). */
export function perceive(def: CreatureDef, c: Point, threat: Surroundings['threat']): 'flee' | 'alert' | undefined {
  if (!threat) return undefined;
  const d = metres(dist(c, threat));
  const s = def.senses[threat.gait];
  return d < s.flee ? 'flee' : d < s.alert ? 'alert' : undefined;
}

/** Le segment de `a` à `b` est-il libre, pixel par pixel ? */
export function clear(a: Point, b: Point, blocked: Surroundings['blocked']): boolean {
  const n = Math.max(1, Math.ceil(dist(a, b)));
  for (let i = 1; i <= n; i++) if (blocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
  return true;
}

/**
 * Avancer de `(dx, dy)` sans jamais entrer dans un obstacle : le chemin est suivi pixel par pixel, la bête s'arrête au dernier point
 * libre. Rend la part du chemin faite (0 à 1).
 */
function advance(c: Creature, dx: number, dy: number, blocked: Surroundings['blocked']): number {
  const len = Math.hypot(dx, dy);
  if (len === 0) return 1;
  const n = Math.max(1, Math.ceil(len));
  let done = 0;
  for (let i = 1; i <= n; i++) {
    if (blocked(c.x + (dx * i) / n, c.y + (dy * i) / n)) break;
    done = i;
  }
  c.x += (dx * done) / n;
  c.y += (dy * done) / n;
  if (done > 0) c.facing = facingOf(dx, dy, c.facing);
  return done / n;
}

/** Taille d'une case du chemin (px) : 40 cm, la longueur d'un lapin ; une case est libre si son centre et ses bords le sont. */
const CELL = 8;

/**
 * Un chemin sans obstacle de `a` à `b` (px) : A* sur des cases de CELL px (huit voisines, sans couper un coin), dans un cadre autour des
 * deux points ; puis tiré au plus court (on saute les points qu'une ligne libre permet de sauter). Rend les points à suivre, `b`
 * compris, ou rien si aucun chemin.
 */
export function findPath(a: Point, b: Point, blocked: Surroundings['blocked'], margin = 24): Point[] | undefined {
  const x0 = Math.floor(Math.min(a.x, b.x) / CELL) - margin;
  const y0 = Math.floor(Math.min(a.y, b.y) / CELL) - margin;
  const w = Math.floor(Math.max(a.x, b.x) / CELL) + margin - x0 + 1;
  const h = Math.floor(Math.max(a.y, b.y) / CELL) + margin - y0 + 1;
  const cellOf = (p: Point) => (Math.floor(p.y / CELL) - y0) * w + (Math.floor(p.x / CELL) - x0);
  const start = cellOf(a);
  const goal = cellOf(b);
  const center = (i: number): Point => ({ x: (x0 + (i % w)) * CELL + CELL / 2, y: (y0 + Math.floor(i / w)) * CELL + CELL / 2 });
  const free = new Map<number, boolean>();
  const isFree = (i: number): boolean => {
    if (i === start || i === goal) return true;
    let f = free.get(i);
    if (f === undefined) {
      const p = center(i);
      const r = CELL / 2 - 1;
      f = !blocked(p.x, p.y) && !blocked(p.x - r, p.y) && !blocked(p.x + r, p.y) && !blocked(p.x, p.y - r) && !blocked(p.x, p.y + r);
      free.set(i, f);
    }
    return f;
  };
  const g = new Map<number, number>([[start, 0]]);
  const came = new Map<number, number>();
  const open: { i: number; f: number }[] = [{ i: start, f: 0 }];
  const done = new Set<number>();
  const gx = goal % w;
  const gy = Math.floor(goal / w);
  const hEst = (i: number) => Math.hypot((i % w) - gx, Math.floor(i / w) - gy);
  while (open.length) {
    let k = 0;
    for (let j = 1; j < open.length; j++) if (open[j].f < open[k].f) k = j;
    const { i } = open.splice(k, 1)[0];
    if (i === goal) break;
    if (done.has(i)) continue;
    done.add(i);
    const cx = i % w;
    const cy = Math.floor(i / w);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (!isFree(n)) continue;
        // en diagonale, sans couper un coin
        if (dx && dy && (!isFree(cy * w + nx) || !isFree(ny * w + cx))) continue;
        const cost = (g.get(i) ?? 0) + (dx && dy ? Math.SQRT2 : 1);
        if (cost < (g.get(n) ?? Infinity)) {
          g.set(n, cost);
          came.set(n, i);
          open.push({ i: n, f: cost + hEst(n) });
        }
      }
  }
  if (!came.has(goal) && start !== goal) return undefined;
  const cells: Point[] = [];
  for (let i = goal; i !== start; i = came.get(i)!) cells.unshift(center(i));
  cells.pop();
  const pts = [...cells, b];
  // tiré au plus court : de chaque point, le plus loin qu'une ligne libre atteint
  const out: Point[] = [];
  let at = a;
  let k = 0;
  while (k < pts.length) {
    let far = k;
    for (let j = pts.length - 1; j > k; j--)
      if (clear(at, pts[j], blocked)) {
        far = j;
        break;
      }
    out.push(pts[far]);
    at = pts[far];
    k = far + 1;
  }
  return out;
}

/** L'entrée la plus proche de la bête. */
export const nearest = (c: Point, holes: Point[]): Point | undefined => holes.reduce<Point | undefined>((m, h) => (!m || dist(c, h) < dist(c, m) ? h : m), undefined);

/** Partir vers l'entrée la plus proche : en fuite (`flee`), ou sans peur (`home`). */
function headHome(c: Creature, s: Surroundings, mode: 'flee' | 'home'): void {
  c.mode = mode;
  c.hop = undefined;
  c.wait = 0;
  c.hole = nearest(c, s.holes);
  c.path = c.hole ? findPath(c, c.hole, s.blocked) ?? [c.hole] : undefined;
  c.zig = { side: s.rand() < 0.5 ? 1 : -1, left: 0 };
}

/** Fuir (Xéros trop près, un tambour, un coup) : vers l'entrée la plus proche, en zigzag. */
export function startFlee(c: Creature, s: Surroundings, why: NonNullable<Creature['fled']> = 'seen'): void {
  if (c.mode === 'flee' || c.mode === 'thump' || c.mode === 'burrow') return;
  headHome(c, s, 'flee');
  c.fled = why;
}

/** Rentrer au terrier sans peur (la garenne veut moins de bêtes dehors). */
export function sendHome(c: Creature, s: Surroundings): void {
  if (c.mode !== 'calm') return;
  headHome(c, s, 'home');
}

/**
 * Suivre le chemin vers l'entrée à `speed` px/s pendant `dt` s, en zigzag si `zig` (l'écart d'`angle`° de part et d'autre, changé tous
 * les `every` px) ; rend vrai si l'entrée est franchie (à `reach` px près) pendant ce pas.
 */
function run(c: Creature, s: Surroundings, speed: number, dt: number, reach: number, zig?: { every: number; angle: number }): boolean {
  if (!c.hole) return true;
  const hole = c.hole;
  let budget = speed * dt;
  const inHole = (x: number, y: number) => Math.hypot(x - hole.x, y - hole.y) <= reach;
  if (inHole(c.x, c.y)) return true;
  for (let guard = 0; budget > 1e-6 && guard < 8; guard++) {
    const target = c.path?.[0] ?? hole;
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5) {
      if (!c.path?.length) return inHole(c.x, c.y);
      c.path.shift();
      continue;
    }
    const step = Math.min(budget, d);
    let ux = dx / d;
    let uy = dy / d;
    // le zigzag : seulement loin du but, et seulement s'il ne mène pas dans un obstacle
    if (zig && zig.angle > 0 && d > zig.every) {
      if (c.zig.left <= 0) {
        c.zig.side = c.zig.side === 1 ? -1 : 1;
        c.zig.left = zig.every;
      }
      const t = (c.zig.side * zig.angle * Math.PI) / 180;
      const zx = ux * Math.cos(t) - uy * Math.sin(t);
      const zy = ux * Math.sin(t) + uy * Math.cos(t);
      const probe = { x: c.x + zx * Math.max(step, 4), y: c.y + zy * Math.max(step, 4) };
      if (clear(c, probe, s.blocked) && clear(probe, target, s.blocked)) {
        ux = zx;
        uy = zy;
      }
      c.zig.left -= step;
    }
    const before = { x: c.x, y: c.y };
    const part = advance(c, ux * step, uy * step, s.blocked);
    if (crossed(before, c, inHole)) return true;
    budget -= step;
    if (part < 1) {
      // barré (un objet posé depuis) : un nouveau chemin
      c.path = findPath(c, hole, s.blocked) ?? [hole];
      if (part === 0) break;
    }
  }
  return inHole(c.x, c.y);
}

/** Une place où brouter : à `range` m au plus d'une entrée tirée au hasard (sans entrée : autour de `c`), libre. */
export function grazeSpot(def: CreatureDef, c: Point, s: Surroundings): Point | undefined {
  for (let k = 0; k < 12; k++) {
    const h = s.holes[Math.floor(s.rand() * s.holes.length)] ?? c;
    const r = pixels(def.graze.range) * Math.sqrt(s.rand());
    const t = s.rand() * 2 * Math.PI;
    const p = { x: h.x + Math.cos(t) * r, y: h.y + Math.sin(t) * r };
    if (!s.blocked(p.x, p.y)) return p;
  }
  return undefined;
}

/** Près de sa place (px) : elle y broute. */
const AT_SPOT = pixels(0.3);

/** Brouter : de petits sauts lents vers une place, des pauses, puis brouter sur place un moment, et chercher une autre place. */
function graze(def: CreatureDef, c: Creature, s: Surroundings, dt: number): void {
  if (c.hop) {
    c.pose = 'hop';
    const dx = c.hop.x - c.x;
    const dy = c.hop.y - c.y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, pixels(def.graze.hop.speed) * dt);
    const part = d > 0 ? advance(c, (dx / d) * step, (dy / d) * step, s.blocked) : 1;
    if (step >= d - 1e-6 || part < 1) {
      c.hop = undefined;
      c.wait = between(s.rand, def.graze.pause);
      if (part < 1) c.goal = undefined;
    }
    return;
  }
  const near = !!c.goal && dist(c, c.goal) < AT_SPOT;
  if (near) c.stayLeft -= dt;
  if (c.wait > 0) {
    c.wait -= dt;
    c.pose = near || !c.goal ? 'graze' : 'sit';
    return;
  }
  if (!c.goal || (near && c.stayLeft <= 0)) {
    c.goal = grazeSpot(def, c, s);
    c.stayLeft = between(s.rand, def.graze.stay);
    if (!c.goal) {
      c.wait = between(s.rand, def.graze.pause);
      return;
    }
  }
  // un saut vers la place, un peu de travers ; sur place, de temps en temps un petit saut au hasard, sinon brouter
  const far = dist(c, c.goal);
  let t: number;
  let len = pixels(between(s.rand, def.graze.hop.length));
  if (far >= AT_SPOT) {
    t = Math.atan2(c.goal.y - c.y, c.goal.x - c.x) + (s.rand() - 0.5) * 0.8;
    len = Math.min(len, far);
  } else if (s.rand() < 0.3) t = s.rand() * 2 * Math.PI;
  else {
    c.wait = between(s.rand, def.graze.pause);
    return;
  }
  c.hop = { x: c.x + Math.cos(t) * len, y: c.y + Math.sin(t) * len };
}

/**
 * Un pas de jeu de `dt` s : perception, état, mouvement. Rend ce qui s'est passé d'important (le tambour, l'entrée au terrier) ; la
 * garenne et le jeu en font le reste (les voisines qui fuient, la bête qui disparaît).
 */
export function step(c: Creature, def: CreatureDef, s: Surroundings, dt: number): CreatureEvent[] {
  const events: CreatureEvent[] = [];
  c.from = { x: c.x, y: c.y };
  if (c.mode === 'burrow') {
    c.den -= dt;
    return events;
  }
  // ce qu'elle perçoit de Xéros (en fuite, elle court déjà)
  if (c.mode === 'calm' || c.mode === 'alert' || c.mode === 'home') {
    const seen = perceive(def, c, s.threat);
    const d = s.threat ? metres(dist(c, s.threat)) : Infinity;
    if (seen === 'flee') startFlee(c, s);
    else if (seen === 'alert' && c.mode !== 'alert') {
      c.mode = 'alert';
      c.hop = undefined;
      c.calmFor = 0;
      c.lastDist = d;
    } else if (c.mode === 'alert') {
      // elle se calme si Xéros s'arrête, s'éloigne ou sort de sa vue ; Xéros qui approche remet le compte à zéro
      const away = !seen || s.threat!.gait === 'still' || d >= (c.lastDist ?? d);
      c.calmFor = away ? c.calmFor + dt : 0;
      c.lastDist = d;
      if (c.calmFor >= def.calm) {
        c.mode = 'calm';
        c.wait = between(s.rand, def.graze.pause);
      }
    }
  }
  switch (c.mode) {
    case 'alert':
      c.pose = 'alert';
      if (s.threat) c.facing = facingOf(s.threat.x - c.x, s.threat.y - c.y, c.facing);
      break;
    case 'calm':
      graze(def, c, s, dt);
      break;
    case 'flee':
      c.pose = 'run';
      if (run(c, s, pixels(def.flee.speed), dt, pixels(def.burrow.reach), { every: pixels(def.flee.zigzag.every), angle: def.flee.zigzag.angle })) {
        c.mode = 'thump';
        c.wait = def.thump.ms / 1000;
        c.pose = 'thump';
        events.push({ kind: 'thump', at: { x: c.x, y: c.y } });
      }
      break;
    case 'home':
      c.pose = 'hop';
      if (run(c, s, pixels(def.graze.hop.speed), dt, pixels(def.burrow.reach))) {
        c.mode = 'burrow';
        events.push({ kind: 'enter' });
      }
      break;
    case 'thump':
      c.pose = 'thump';
      c.wait -= dt;
      if (c.wait <= 0) {
        c.mode = 'burrow';
        events.push({ kind: 'enter' });
      }
      break;
  }
  return events;
}

/** Un coup qui porte : les points de vie perdus ; morte (`dead`), ou blessée : elle fuit. */
export function hurt(c: Creature, damage: number, s: Surroundings): 'dead' | 'wounded' {
  c.hp = Math.max(0, Math.round((c.hp - damage) * 10) / 10);
  if (c.hp <= 0) return 'dead';
  startFlee(c, s, 'hurt');
  return 'wounded';
}

/** Les bêtes de l'espèce à moins de `thump.radius` m d'un tambour fuient aussi (l'alerte partagée). */
export function alarm(all: Creature[], def: CreatureDef, at: Point, kind: string, around: (c: Creature) => Surroundings): void {
  for (const o of all) if (o.kind === kind && o.mode !== 'burrow' && metres(dist(o, at)) <= def.thump.radius) startFlee(o, around(o), 'alarm');
}
