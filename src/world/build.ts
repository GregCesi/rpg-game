// Le mode construction (le bac à sable), sans Phaser : la boîte de chaque pièce posée, la hauteur où se pose une pièce visée (elle
// s'accroche sur le dessus de ce qu'il y a dessous), ce qu'une pièce porte, l'ordre d'affichage, et le passage d'un groupe de pièces
// à un plan et retour. Tout est en centimètres : l'emprise sur la grille de BUILD.grid (20 cm) ; la hauteur est celle du dessus qui
// porte la pièce (une dalle de 12 cm), plus des crans de la même grille.
//
// Projection (docs/STYLE.md, section 8) : un point au sol (x, y) à la hauteur z se voit à l'écran en (x, y − z), à 5 cm par pixel.
// Une pièce a pour boîte son emprise au sol (x, y : coin nord-ouest ; w, d) et sa hauteur (z : sa base ; h) ; son image a le bas
// au bord sud de son emprise, relevé de z, et elle est centrée sur son emprise en largeur.

import { BUILD } from '../config';
import { items, props, wood as woodContent } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { BuildPlaced, BuildPlan, BuildRef, JointType, WoodPiece } from '../content/types';
import { viewCount } from '../content/views';
import { woodDims } from './woodPiece';
import { lookDef, lookOf, turnedWood } from './woodShape';

/** Une pièce posée en mode construction, telle que GameState la garde : son identifiant propre, et ce que dit `BuildPlaced`. */
export type BuildPiece = BuildPlaced & { id: number };

/** Dimensions d'une pièce dans son sens, en cm : largeur (est-ouest), profondeur (nord-sud), hauteur. */
export interface Size3 {
  w: number;
  d: number;
  h: number;
}

/** Boîte d'une pièce posée, en cm : coin nord-ouest de l'emprise (x, y), base (z), et ses dimensions. */
export interface Box3 extends Size3 {
  x: number;
  y: number;
  z: number;
}

/** Un objet possédable sans `dims` (les baies, l'épée...) : une petite boîte, faute de mieux. */
const ITEM_FALLBACK: Size3 = { w: 20, d: 20, h: 10 };

/** Le cran de la grille le plus proche. */
export const onGrid = (cm: number) => Math.round(cm / BUILD.grid) * BUILD.grid + 0;

/** Ce que nomme une pièce existe encore dans le contenu (objet, objet possédable, diamètre et aspect de bois) ; sinon le dire. */
export function refMissing(ref: BuildRef): string | undefined {
  if ('prop' in ref) return props[ref.prop] ? undefined : `l'objet « ${ref.prop} »`;
  if ('item' in ref) return items[ref.item] ? undefined : `l'objet « ${ref.item} »`;
  const size = woodContent.sizes[ref.wood.size];
  if (!size) return `le bois « ${ref.wood.size} »`;
  const look = size.looks[lookOf(ref.wood)];
  if (!look) return `la forme « ${lookOf(ref.wood)} » du bois « ${ref.wood.size} »`;
  return ref.wood.axis === 'up' && !look.up ? `la forme « ${lookOf(ref.wood)} » du bois « ${ref.wood.size} » debout` : undefined;
}

/** Le nom d'une pièce, en français : celui du contenu, ou celui de l'aspect de la pièce de bois (« poutre », « rondin »). */
export function refName(ref: BuildRef): string {
  if ('prop' in ref) return props[ref.prop].name;
  if ('item' in ref) return items[ref.item].name;
  const look = lookDef(ref.wood.size, lookOf(ref.wood));
  return ref.wood.axis === 'up' && look.up ? look.up.name : look.name;
}

/** Le nombre de vues (de sens) d'une pièce : celles de sa symétrie ; la pièce de bois tourne par son `axis` (une seule vue). */
export function viewsOf(ref: BuildRef): number {
  if ('prop' in ref) return viewCount(props[ref.prop].views);
  if ('item' in ref) return viewCount(items[ref.item].views);
  return 1;
}

/** Dimensions d'une pièce dans son sens : `dims` de l'objet (largeur et profondeur échangées un quart de tour sur deux), ou celles de la pièce de bois. */
export function sizeOf(ref: BuildRef, view = 0): Size3 {
  if ('wood' in ref) {
    const d = woodDims(ref.wood);
    return { w: d.w, d: d.d, h: d.h };
  }
  const dims = 'prop' in ref ? props[ref.prop].dims : items[ref.item].dims;
  const s = dims ? { w: dims.w, d: dims.d, h: dims.h } : ITEM_FALLBACK;
  return view % 2 === 1 && viewsOf(ref) > 1 ? { w: s.d, d: s.w, h: s.h } : s;
}

/** La boîte d'une pièce posée. */
export function boxOf(p: BuildPlaced): Box3 {
  return { x: p.x, y: p.y, z: p.z, ...sizeOf(p.piece, p.view) };
}

/** Les emprises au sol de deux boîtes se recouvrent (le simple contact d'un bord ne compte pas). */
export function overlaps(a: { x: number; y: number; w: number; d: number }, b: { x: number; y: number; w: number; d: number }): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
}

/** Le dessus d'une boîte (cm). */
export const topOf = (b: Box3) => b.z + b.h;

/** La plus grande hauteur de dessus des pièces que recoupe l'emprise (0 : le sol). */
export function supportAt(pieces: readonly BuildPlaced[], foot: { x: number; y: number; w: number; d: number }): number {
  let top = 0;
  for (const p of pieces) {
    const b = boxOf(p);
    if (overlaps(b, foot)) top = Math.max(top, topOf(b));
  }
  return top;
}

/**
 * Où se pose une pièce de dimensions `size` visée au point (cx, cy) de l'écran (en cm, à 5 cm par pixel) : son emprise centrée sur
 * le point, sur la grille, et sa base sur le dessus de ce qu'il y a dessous. Le point visé est vu à la hauteur où la pièce se
 * poserait (y écran = y sol − z) : on essaie chaque hauteur de dessus, de la plus haute à la plus basse, et l'on garde la première
 * qui se tient (la pièce visée à cette hauteur tomberait bien sur un dessus à cette hauteur) ; à défaut, le sol. `step` : les crans
 * ajoutés (monter, descendre), d'une grille chacun, jamais sous le sol.
 */
export function aimAt(pieces: readonly BuildPlaced[], size: Size3, cx: number, cy: number, step = 0): Box3 {
  const tops = [...new Set(pieces.map((p) => topOf(boxOf(p))))].sort((a, b) => b - a);
  const at = (t: number) => magnet(pieces, { x: onGrid(cx - size.w / 2), y: onGrid(cy + t - size.d / 2), w: size.w, d: size.d });
  let base: { x: number; y: number; z: number } | undefined;
  for (const t of tops) {
    const f = at(t);
    if (supportAt(pieces, f) === t) {
      base = { x: f.x, y: f.y, z: t };
      break;
    }
  }
  if (!base) {
    const f = at(0);
    base = { x: f.x, y: f.y, z: supportAt(pieces, f) };
  }
  // posée sur une seule pièce de la même emprise (un poteau sur un poteau, une pierre sur une pierre pareille) : exactement dessus
  if (base.z > 0) {
    const same = pieces.map(boxOf).filter((b) => topOf(b) === base!.z && b.w === size.w && b.d === size.d && overlaps(b, { ...base!, w: size.w, d: size.d }));
    if (same.length === 1) base = { x: same[0].x, y: same[0].y, z: base.z };
  }
  return { ...base, z: Math.max(0, base.z + step * BUILD.grid), ...size };
}

/**
 * L'emprise aimantée aux bords de ses voisines : un bord à moins d'une demi-grille (10 cm) d'un bord d'une pièce proche (bout à bout,
 * ou alignés) s'y colle, en x puis en y. Ce qui n'est pas sur la grille (le morceau de solin, 50 cm d'épaisseur) se joint ainsi
 * exactement, en angle comme en long.
 */
export function magnet<F extends { x: number; y: number; w: number; d: number }>(pieces: readonly BuildPlaced[], f: F): F {
  const reach = BUILD.grid / 2;
  const boxes = pieces.map(boxOf);
  const best = (deltas: number[]) => deltas.filter((d) => Math.abs(d) <= reach).sort((a, b) => Math.abs(a) - Math.abs(b))[0] ?? 0;
  // en x : les pièces à moins d'une grille en y
  const nearY = boxes.filter((o) => o.y < f.y + f.d + BUILD.grid && f.y < o.y + o.d + BUILD.grid);
  const dx = best(nearY.flatMap((o) => [o.x + o.w - f.x, o.x - (f.x + f.w), o.x - f.x, o.x + o.w - (f.x + f.w)]));
  const g = { ...f, x: f.x + dx };
  const nearX = boxes.filter((o) => o.x < g.x + g.w + BUILD.grid && g.x < o.x + o.w + BUILD.grid);
  const dy = best(nearX.flatMap((o) => [o.y + o.d - g.y, o.y - (g.y + g.d), o.y - g.y, o.y + o.d - (g.y + g.d)]));
  return { ...g, y: g.y + dy };
}

/** Les pièces sur lesquelles repose celle-ci : leur dessus est à sa base et leurs emprises se recouvrent. */
export function supportsOf(pieces: readonly BuildPiece[], p: BuildPlaced): BuildPiece[] {
  const b = boxOf(p);
  if (b.z === 0) return [];
  return pieces.filter((q) => q !== p && topOf(boxOf(q)) === b.z && overlaps(boxOf(q), b));
}

/** Les pièces qui reposent directement sur celle-ci. */
export function carriedBy(pieces: readonly BuildPiece[], id: number): BuildPiece[] {
  const p = pieces.find((q) => q.id === id);
  if (!p) return [];
  const b = boxOf(p);
  return pieces.filter((q) => q.id !== id && q.z === topOf(b) && overlaps(boxOf(q), b));
}

/** La pièce et tout ce qui repose dessus, de proche en proche (retirer une pile entière). */
export function withAbove(pieces: readonly BuildPiece[], id: number): BuildPiece[] {
  const out = new Map<number, BuildPiece>();
  const todo = [id];
  while (todo.length) {
    const i = todo.pop()!;
    const p = pieces.find((q) => q.id === i);
    if (!p || out.has(i)) continue;
    out.set(i, p);
    for (const q of carriedBy(pieces, i)) todo.push(q.id);
  }
  return [...out.values()];
}

/**
 * Profondeur d'affichage de chaque pièce (px) : le bord sud de son emprise au sol (comme les pieds d'un personnage), puis la hauteur
 * pour départager deux pièces au même bord sud ; une pièce est toujours dessinée après celles qui la portent (une pierre posée au
 * fond d'une dalle passe devant la dalle).
 */
export function depthsOf(pieces: readonly BuildPiece[]): Map<number, number> {
  const out = new Map<number, number>();
  const sorted = [...pieces].sort((a, b) => a.z - b.z);
  for (const p of sorted) {
    const b = boxOf(p);
    let d = (b.y + b.d) / CM_PER_PX + b.z / 100000;
    for (const s of supportsOf(pieces, p)) d = Math.max(d, (out.get(s.id) ?? 0) + 0.001);
    out.set(p.id, d);
  }
  return out;
}

/** Une pièce bloque Xéros : un objet du monde qui a une collision (ou une pièce de bois), posé sous BUILD.high. */
export function blocks(p: BuildPlaced): boolean {
  if (p.z >= BUILD.high) return false;
  if ('wood' in p.piece) return true;
  if ('item' in p.piece) return false;
  const def = props[p.piece.prop];
  return !!(def.body || def.bodies) && def.layer !== 'floor';
}

/** Une pièce s'efface au-dessus de Xéros : sa base au-dessus de sa tête (BUILD.head) et son emprise, à `margin` cm près, sur ses pieds. */
export function overHead(p: BuildPlaced, feetX: number, feetY: number, margin = 0): boolean {
  const b = boxOf(p);
  return b.z >= BUILD.head && feetX >= b.x - margin && feetX <= b.x + b.w + margin && feetY >= b.y - margin && feetY <= b.y + b.d + margin;
}

/**
 * Le sens suivant d'une pièce (R) : un quart de tour de plus dans sa symétrie ; la pièce de bois couchée passe d'est-ouest à
 * nord-sud, puis debout si son aspect se dresse, puis revient est-ouest.
 */
export function turned(ref: BuildRef, view: number): { ref: BuildRef; view: number } {
  if (!('wood' in ref)) return { ref, view: (view + 1) % viewsOf(ref) };
  const w = ref.wood;
  if (w.axis === 'ew') return { ref: { wood: turnedWood(w) }, view: 0 };
  if (w.axis === 'ns') {
    const look = lookDef(w.size, lookOf(w));
    if (look.up && w.shape === 'round') {
      const { face: _f, ...rest } = w;
      return { ref: { wood: { ...rest, axis: 'up' } }, view: 0 };
    }
    return { ref: { wood: turnedWood(w) }, view: 0 };
  }
  return { ref: { wood: { ...w, axis: 'ew' } as WoodPiece }, view: 0 };
}

/** Le côté du dehors d'une pièce dans sa vue : sud dans la vue 0, puis un quart de tour dans le sens des aiguilles d'une montre. */
const OUTWARD: readonly [number, number][] = [
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
];

/** Un point tourné d'un quart autour de (cx, cy), dans le sens des aiguilles d'une montre à l'écran (`cw`) ou dans l'autre. */
function quarter(x: number, y: number, cx: number, cy: number, cw: boolean): [number, number] {
  const dx = x - cx;
  const dy = y - cy;
  return cw ? [cx - dy, cy + dx] : [cx + dy, cy - dx];
}

/** Le coin nord-ouest d'un rectangle au sol tourné d'un quart autour d'un point. */
function quarterBox(b: { x: number; y: number; w: number; d: number }, cx: number, cy: number, cw: boolean): { x: number; y: number } {
  const a = quarter(b.x, b.y, cx, cy, cw);
  const c = quarter(b.x + b.w, b.y + b.d, cx, cy, cw);
  return { x: Math.min(a[0], c[0]), y: Math.min(a[1], c[1]) };
}

/**
 * Ce qui s'ouvre et se ferme (`swing` de props.json : le volet, le volet d'étal) : sa place dans son autre état, ou rien si la pièce
 * ne bat pas. `side` : le bord gauche de sa face du dehors, vu du dehors, est le gond ; ouvrir, c'est tourner d'un quart vers le
 * dehors autour de lui (la vue suivante), fermer le tour inverse (le gond est le coin de la boîte ouverte qui, refermé puis rouvert,
 * la redonne). `bottom` : le bas de sa face du dehors est le gond ; ouvert, l'objet est contre sa face du dehors, centré, son dessus à
 * la hauteur de la base du fermé ; fermé, le fermé est contre le bord du dedans de l'ouvert, sa base sur le dessus de l'ouvert.
 */
export function swung(p: BuildPlaced): BuildPlaced | undefined {
  if (!('prop' in p.piece)) return undefined;
  const s = props[p.piece.prop].swing;
  if (!s || !props[s.into]) return undefined;
  const into = { prop: s.into };
  const n = viewsOf(p.piece);
  const b = boxOf(p);
  if (s.hinge === 'side') {
    const open = (q: BuildPlaced): BuildPlaced => {
      const qb = boxOf(q);
      const [qx, qy] = OUTWARD[q.view % 4];
      // le gond : au bout gauche de la face du dehors (vu du dehors, la gauche est (−qy, qx))
      const fx = qb.x + qb.w / 2 + (qx * qb.w) / 2;
      const fy = qb.y + qb.d / 2 + (qy * qb.d) / 2;
      const half = qx ? qb.d / 2 : qb.w / 2;
      return { ...q, ...quarterBox(qb, fx - qy * half, fy + qx * half, true), view: (q.view + 1) % n };
    };
    if (!s.open) return { ...open(p), piece: into };
    // fermer : le coin de la boîte ouverte autour duquel elle se referme
    for (const [cx, cy] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.d], [b.x + b.w, b.y + b.d]]) {
      const closed: BuildPlaced = { ...p, piece: into, ...quarterBox(b, cx, cy, false), view: (p.view + n - 1) % n };
      const again = open({ ...closed, piece: p.piece });
      if (again.x === p.x && again.y === p.y) return closed;
    }
    return undefined;
  }
  // `bottom` : rabattu contre la face du dehors (centré le long de la face)
  const [ox, oy] = OUTWARD[p.view % 4];
  const t = sizeOf(into, p.view);
  if (!s.open) {
    const x = ox > 0 ? b.x + b.w : ox < 0 ? b.x - t.w : b.x + Math.round((b.w - t.w) / 2);
    const y = oy > 0 ? b.y + b.d : oy < 0 ? b.y - t.d : b.y + Math.round((b.d - t.d) / 2);
    return { ...p, piece: into, x, y, z: Math.max(0, b.z - t.h) };
  }
  const x = ox > 0 ? b.x - t.w : ox < 0 ? b.x + b.w : b.x + Math.round((b.w - t.w) / 2);
  const y = oy > 0 ? b.y - t.d : oy < 0 ? b.y + b.d : b.y + Math.round((b.d - t.d) / 2);
  return { ...p, piece: into, x, y, z: b.z + b.h };
}

/** Une zone choisie au sol, en cm : coin nord-ouest et dimensions. */
export interface Area {
  x: number;
  y: number;
  w: number;
  d: number;
}

/**
 * Le plan d'un groupe de pièces : celles dont l'emprise recoupe la zone, placées depuis le coin nord-ouest de leur ensemble (sur la
 * grille) et la base de la plus basse ; un tirage d'élément calculé n'est pas gardé (chaque pose en tire un nouveau). Undefined
 * si la zone est vide.
 */
export function planOf(pieces: readonly BuildPiece[], area: Area, name: string, joints: readonly { type: JointType; a: number; b: number; top?: number }[] = []): BuildPlan | undefined {
  const inside = pieces.filter((p) => overlaps(boxOf(p), area));
  if (!inside.length) return undefined;
  const boxes = inside.map(boxOf);
  const ox = Math.min(...boxes.map((b) => b.x));
  const oy = Math.min(...boxes.map((b) => b.y));
  const oz = Math.min(...boxes.map((b) => b.z));
  const w = Math.max(...boxes.map((b) => b.x + b.w)) - ox;
  const d = Math.max(...boxes.map((b) => b.y + b.d)) - oy;
  // de bas en haut, puis du nord au sud : l'ordre où on les reposera
  const order = inside.map((p, i) => ({ p, b: boxes[i] })).sort((a, b) => a.b.z - b.b.z || a.b.y - b.b.y || a.b.x - b.b.x);
  // les assemblages dont les deux pièces sont dans la zone, par le rang de leurs pièces dans le plan
  const rank = new Map(order.map(({ p }, i) => [p.id, i]));
  const kept = joints
    .filter((j) => rank.has(j.a) && rank.has(j.b))
    .map((j) => ({ type: j.type, a: rank.get(j.a)!, b: rank.get(j.b)!, ...(j.top !== undefined ? { top: rank.get(j.top)! } : {}) }));
  return {
    name,
    size: { w, d },
    ...(kept.length ? { joints: kept } : {}),
    pieces: order.map(({ p }) => ({
      piece: structuredClone(p.piece),
      x: p.x - ox,
      y: p.y - oy,
      z: p.z - oz,
      view: p.view,
      ...(p.natural ? { natural: { ...p.natural } } : {}),
    })),
  };
}

/** La boîte englobante d'un plan, posée au sol en (0, 0, 0) : son emprise et la hauteur de son plus haut dessus. */
export function planSize(plan: BuildPlan): Size3 {
  return { w: plan.size.w, d: plan.size.d, h: Math.max(...plan.pieces.map((p) => topOf(boxOf(p)))) };
}

/** Les pièces d'un plan posé avec son coin nord-ouest en (x, y) et sa base à la hauteur z. */
export function planPieces(plan: BuildPlan, at: { x: number; y: number; z: number }): BuildPlaced[] {
  return plan.pieces.map((p) => ({ ...structuredClone(p), x: p.x + at.x, y: p.y + at.y, z: p.z + at.z }));
}

/**
 * Ce qui ne va pas dans un plan du bac à sable (pièces disparues du contenu, sens impossibles), décrit en français. Les positions ne
 * sont pas forcément sur la grille : une pièce aimantée au bord d'une voisine (le solin de 50 cm d'épaisseur) en sort.
 */
export function planProblems(plan: BuildPlan): string[] {
  const out: string[] = [];
  for (const j of plan.joints ?? []) if (!plan.pieces[j.a] || !plan.pieces[j.b] || j.a === j.b) out.push(`assemblage ${j.type} : pièces ${j.a} et ${j.b} introuvables`);
  plan.pieces.forEach((p, i) => {
    const at = `pièce ${i + 1}`;
    const missing = refMissing(p.piece);
    if (missing) return out.push(`${at} : ${missing} n'existe pas`);
    if (p.view >= viewsOf(p.piece)) out.push(`${at} : sens ${p.view}, l'objet n'en a que ${viewsOf(p.piece)}`);
    if ('prop' in p.piece && p.variant !== undefined && p.variant >= (props[p.piece.prop].variants ?? 1)) out.push(`${at} : tirage ${p.variant} inconnu`);
  });
  return out;
}
