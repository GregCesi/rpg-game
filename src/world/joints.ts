// Les assemblages de charpente du mode construction, sans Phaser (docs/CONCEPTION.md, « Les assemblages ») : bois sur bois, chevillé.
// - L'enture en trait de Jupiter (`scarf`) prolonge une pièce de bois par une autre : même section, même état, même axe (est-ouest,
//   nord-sud, ou debout l'une sur l'autre), bout contre bout. Les pièces entées se dessinent comme une seule pièce de leur longueur
//   totale, la marque de l'enture (son biseau et ses chevilles) à chaque jonction.
// - Le tenon et mortaise (`mortise`) : un poteau debout dont la tête touche le dessous d'une pièce couchée (la sablière), ou dont le
//   pied repose sur une sablière basse ; la cheville se voit sur la face de la pièce couchée, au droit du poteau.
// Chaque pièce reste une pièce à part (poser, retirer, collision, sauvegarde) ; seul le dessin est commun.

import { CM_PER_PX } from '../content/gabarit';
import type { JointType, WoodPiece } from '../content/types';
import { boxOf, type Box3, type BuildPiece } from './build';
import { lookOf } from './woodShape';

/** Un assemblage posé (GameState) : son type et ses deux pièces. */
export interface JointRef {
  id: number;
  type: JointType;
  a: number;
  b: number;
  /** Le mi-bois : la pièce du dessus. */
  top?: number;
}

/** Les noms des assemblages, en français. */
export const JOINT_NAMES: Record<JointType, string> = { scarf: 'enture en trait de Jupiter', mortise: 'tenon et mortaise', halving: 'mi-bois' };

/** Une jonction entre deux pièces qui se touchent : ce qu'elle permet (ou pourquoi pas), et son point à l'écran (px). */
export interface Junction {
  a: BuildPiece;
  b: BuildPiece;
  /** L'assemblage qu'elle permet, ou rien. */
  type?: JointType;
  /** Pourquoi on ne peut pas l'assembler ainsi. */
  why?: string;
  x: number;
  y: number;
}

/** Les réglages de bois d'une pièce posée, si c'en est une. */
export const woodOfPiece = (p: BuildPiece): WoodPiece | undefined => ('wood' in p.piece ? p.piece.wood : undefined);

/** Le contact de deux boîtes : l'axe où elles se touchent (`x`, `y`, `z`) et le rectangle du contact, ou rien. */
function contact(A: Box3, B: Box3): { axis: 'x' | 'y' | 'z' | 'cross'; x0: number; x1: number; y0: number; y1: number; z0: number; z1: number } | undefined {
  const ov = (a0: number, a1: number, b0: number, b1: number) => [Math.max(a0, b0), Math.min(a1, b1)] as const;
  const [x0, x1] = ov(A.x, A.x + A.w, B.x, B.x + B.w);
  const [y0, y1] = ov(A.y, A.y + A.d, B.y, B.y + B.d);
  const [z0, z1] = ov(A.z, A.z + A.h, B.z, B.z + B.h);
  const touchX = A.x + A.w === B.x || B.x + B.w === A.x;
  const touchY = A.y + A.d === B.y || B.y + B.d === A.y;
  const touchZ = A.z + A.h === B.z || B.z + B.h === A.z;
  if (touchX && y1 > y0 && z1 > z0) return { axis: 'x', x0, x1: x0, y0, y1, z0, z1 };
  if (touchY && x1 > x0 && z1 > z0) return { axis: 'y', x0, x1, y0, y1: y0, z0, z1 };
  if (touchZ && x1 > x0 && y1 > y0) return { axis: 'z', x0, x1, y0, y1, z0, z1: z0 };
  // à la même hauteur, l'une dans l'autre : le croisement d'un mi-bois (vu sur son dessus)
  if (x1 > x0 && y1 > y0 && z1 > z0 && A.z === B.z) return { axis: 'cross', x0, x1, y0, y1, z0: z1, z1 };
  return undefined;
}

/**
 * Ce que permet la jonction de deux pièces qui se touchent : une enture (bout à bout, même axe, même section, même état), un tenon et
 * mortaise (un poteau sous une pièce couchée, ou sur une sablière basse), ou pourquoi rien. Rien si elles ne se touchent pas.
 */
export function judge(a: BuildPiece, b: BuildPiece): { type?: JointType; why?: string } | undefined {
  const wa = woodOfPiece(a);
  const wb = woodOfPiece(b);
  const A = boxOf(a);
  const B = boxOf(b);
  const c = contact(A, B);
  if (!c) return undefined;
  if (!wa || !wb) return { why: 'Un assemblage réunit deux pièces de bois.' };
  const up = (w: WoodPiece) => w.axis === 'up';
  // bout à bout sur le même axe : couchées dans leur sens, ou debout l'une sur l'autre (la même emprise)
  const endToEnd =
    (wa.axis === 'ew' && wb.axis === 'ew' && c.axis === 'x' && A.y === B.y && A.z === B.z) ||
    (wa.axis === 'ns' && wb.axis === 'ns' && c.axis === 'y' && A.x === B.x && A.z === B.z) ||
    (up(wa) && up(wb) && c.axis === 'z' && A.x === B.x && A.y === B.y);
  if (endToEnd) {
    if (wa.size !== wb.size || wa.shape !== wb.shape) return { type: 'scarf', why: 'Les deux pièces doivent avoir la même section.' };
    if (lookOf(wa) !== lookOf(wb)) return { type: 'scarf', why: 'Les deux pièces doivent être dans le même état (rondes, équarries…).' };
    return { type: 'scarf' };
  }
  if (up(wa) && up(wb) && c.axis === 'z') return { type: 'scarf', why: "Les deux poteaux doivent être exactement l'un sur l'autre." };
  if (wa.axis === wb.axis && wa.axis !== 'up' && c.axis !== 'z') return { why: 'Les deux pièces doivent se toucher par un bout, alignées sur le même axe.' };
  // un poteau sous une pièce couchée (sa tête dessous), ou sur une sablière basse (son pied dessus)
  if (c.axis === 'z' && up(wa) !== up(wb)) return { type: 'mortise' };
  // deux pièces couchées qui se croisent à angle droit, l'une sur l'autre ou déjà l'une dans l'autre : un mi-bois
  if ((c.axis === 'z' || c.axis === 'cross') && !up(wa) && !up(wb)) {
    if (wa.axis === wb.axis) return { why: 'Le mi-bois croise deux pièces à angle droit.' };
    if (wa.size !== wb.size || wa.shape !== wb.shape) return { type: 'halving', why: 'Les deux pièces doivent avoir la même section.' };
    if (lookOf(wa) !== lookOf(wb)) return { type: 'halving', why: 'Les deux pièces doivent être dans le même état (rondes, équarries…).' };
    if (c.axis === 'z' && A.z !== B.z && Math.abs(A.z - B.z) !== (A.z < B.z ? A.h : B.h)) return { type: 'halving', why: "L'une doit reposer sur l'autre." };
    return { type: 'halving' };
  }
  return { why: 'Il faut un poteau sous une pièce couchée, ou sur une sablière basse.' };
}

/** Le point à l'écran (px) d'une jonction : le milieu de leur contact, vu à sa hauteur (y écran = bord sud du contact − hauteur). */
function junctionPoint(A: Box3, B: Box3): { x: number; y: number } | undefined {
  const c = contact(A, B);
  if (!c) return undefined;
  return { x: (c.x0 + c.x1) / 2 / CM_PER_PX, y: (c.y1 - (c.z0 + c.z1) / 2) / CM_PER_PX };
}

/** Le décalage d'affichage d'une pièce (px : `dx`, `down`), pour viser une jonction là où on la voit (GameMap.offsetOf). */
export type Shift = (p: BuildPiece) => { dx: number; down: number };

/** Le point d'une jonction tel qu'on le voit : celui du calcul, décalé comme la plus haute des deux pièces. */
function seen(a: BuildPiece, b: BuildPiece, pt: { x: number; y: number }, shift?: Shift): { x: number; y: number } {
  if (!shift) return pt;
  const o = shift(b.z > a.z ? b : a);
  return { x: pt.x + o.dx, y: pt.y + o.down };
}

/** Toutes les jonctions entre une pièce de bois et une pièce qui la touche. */
export function junctions(pieces: readonly BuildPiece[], shift?: Shift): Junction[] {
  const out: Junction[] = [];
  for (const a of pieces) {
    if (!('wood' in a.piece)) continue;
    for (const b of pieces) {
      if (a === b || ('wood' in b.piece && b.id < a.id)) continue;
      const j = judge(a, b);
      const pt = j && junctionPoint(boxOf(a), boxOf(b));
      if (j && pt) out.push({ a, b, ...j, ...seen(a, b, pt, shift) });
    }
  }
  return out;
}

/** La jonction la plus proche du point (px du monde), à moins de `reach` px. */
export function junctionAt(pieces: readonly BuildPiece[], px: number, py: number, reach = 8, shift?: Shift): Junction | undefined {
  let best: Junction | undefined;
  let d = reach;
  for (const j of junctions(pieces, shift)) {
    const dd = Math.hypot(j.x - px, j.y - py);
    if (dd <= d) {
      d = dd;
      best = j;
    }
  }
  return best;
}

/** Le point à l'écran d'un assemblage posé (px), ou rien si ses pièces ne se touchent plus. */
export function jointPoint(pieces: readonly BuildPiece[], j: JointRef, shift?: Shift): { x: number; y: number } | undefined {
  const a = pieces.find((p) => p.id === j.a);
  const b = pieces.find((p) => p.id === j.b);
  const pt = a && b ? junctionPoint(boxOf(a), boxOf(b)) : undefined;
  return a && b && pt ? seen(a, b, pt, shift) : undefined;
}

/** Les deux pièces sont-elles déjà assemblées ? */
export const joined = (joints: readonly JointRef[], a: number, b: number) => joints.some((q) => (q.a === a && q.b === b) || (q.a === b && q.b === a));

/** Pourquoi on ne pose pas un assemblage de ce type à cette jonction, ou rien si on peut. */
export function refusal(j: Junction | undefined, type: JointType, joints: readonly JointRef[]): string | undefined {
  const aim = { scarf: 'Vise la jonction de deux pièces de bois bout à bout.', mortise: 'Vise la jonction d’un poteau et d’une pièce couchée.', halving: 'Vise le croisement de deux pièces couchées.' };
  if (!j) return aim[type];
  if (joined(joints, j.a.id, j.b.id)) return 'Elles sont déjà assemblées.';
  if (j.type !== type) {
    const want = {
      scarf: 'Une enture prolonge deux pièces de même section, bout à bout, sur le même axe.',
      mortise: 'Il faut un poteau sous une pièce couchée, ou sur une sablière basse.',
      halving: 'Le mi-bois croise deux pièces couchées de même section, à angle droit, l’une sur l’autre.',
    };
    return want[type];
  }
  return j.why;
}

/** Une suite de pièces entées : leur sens, les pièces dans l'ordre (ouest à est, nord à sud, bas en haut), la pièce entière qu'elles font. */
export interface ScarfChain {
  axis: 'ew' | 'ns' | 'up';
  pieces: BuildPiece[];
  wood: WoodPiece;
  /** La boîte de l'ensemble (cm). */
  box: Box3;
  /** Les jonctions, en cm depuis le début de l'ensemble (ouest, nord, ou pied). */
  cuts: number[];
}

/** Les suites de pièces réunies par des entures (deux pièces au moins), d'après les assemblages posés qui tiennent encore. */
export function scarfChains(pieces: readonly BuildPiece[], joints: readonly JointRef[]): ScarfChain[] {
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const parent = new Map<number, number>();
  const find = (i: number): number => {
    let r = i;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const j of joints) {
    const a = byId.get(j.a);
    const b = byId.get(j.b);
    if (j.type !== 'scarf' || !a || !b || judge(a, b)?.type !== 'scarf' || judge(a, b)?.why) continue;
    for (const i of [j.a, j.b]) if (!parent.has(i)) parent.set(i, i);
    parent.set(find(j.a), find(j.b));
  }
  const groups = new Map<number, BuildPiece[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(byId.get(id)!);
  }
  const out: ScarfChain[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const w0 = woodOfPiece(list[0])!;
    const axis = w0.axis;
    const at = (p: BuildPiece) => (axis === 'ew' ? p.x : axis === 'ns' ? p.y : p.z);
    list.sort((a, b) => at(a) - at(b));
    const boxes = list.map(boxOf);
    const length = list.reduce((s, p) => s + woodOfPiece(p)!.length, 0);
    const { notch: _n, wedge: _w, ...rest } = w0;
    const first = boxes[0];
    const last = boxes[boxes.length - 1];
    const box =
      axis === 'ew' ? { ...first, w: last.x + last.w - first.x } : axis === 'ns' ? { ...first, d: last.y + last.d - first.y } : { ...first, h: last.z + last.h - first.z };
    const cuts = list.slice(1).map((p) => at(p) - at(list[0]));
    out.push({ axis, pieces: list, wood: { ...rest, length }, box, cuts });
  }
  return out;
}

/** Les pièces liées à celle-ci par des assemblages, de proche en proche (elle comprise). */
export function jointGroup(joints: readonly JointRef[], id: number): number[] {
  const seen = new Set([id]);
  const todo = [id];
  while (todo.length) {
    const i = todo.pop()!;
    for (const j of joints) {
      const other = j.a === i ? j.b : j.b === i ? j.a : undefined;
      if (other !== undefined && !seen.has(other)) {
        seen.add(other);
        todo.push(other);
      }
    }
  }
  return [...seen];
}
