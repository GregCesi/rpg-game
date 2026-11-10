// Les tronçons de mur du mode construction, sans Phaser : des morceaux qui se raccordent (`wall` de props.json, le morceau de
// solin) de même manière, à la même hauteur, alignés et jointifs, forment un tronçon dessiné d'un seul tenant (world/walls.ts,
// `run`) ; deux tronçons qui se rencontrent à angle droit forment un angle ; un tronçon qui s'arrête montre une tête de mur. Chaque
// morceau reste une pièce à part (poser, retirer, collision, sauvegarde) : seul le dessin est commun. Le tirage d'un tronçon se tire
// de sa position : le même mur à chaque chargement.

import { props } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { RunEnd, WallKind } from './walls';
import { boxOf, type Box3, type BuildPiece } from './build';

/** Un tronçon : sa manière, son sens, ses morceaux d'ouest en est (ou du nord au sud), sa boîte, ses deux bouts, sa graine. */
export interface WallRun {
  kind: WallKind;
  axis: 'ew' | 'ns';
  /** L'épaisseur du mur (cm) : 50 pour le solin, 30 pour celui des cloisons ; elle fait les rangées de son dessus. */
  thick: number;
  pieces: BuildPiece[];
  box: Box3;
  start: RunEnd;
  end: RunEnd;
  seed: number;
  /**
   * Un tronçon nord-sud qui vient contre un carré d'angle : son image se cale au ras du bord extérieur de l'angle (`west` : sur le
   * bord ouest du carré, `east` : sur son bord est) pour que ses files de pierres prolongent celles du carré ; sinon centrée.
   */
  align?: 'west' | 'east';
  /**
   * Pixels ajoutés ou ôtés au dessin à chaque bout, le long du tronçon (`extra` de RunSpec) : l'angle est toujours tenu par le
   * tronçon est-ouest ; quand c'est le morceau nord-sud qui couvre le carré d'angle au sol, l'est-ouest dessine ce carré (+ son
   * épaisseur) et le nord-sud ne le dessine pas (− l'épaisseur). Le dessin d'un angle ne dépend donc pas de l'ordre de pose.
   */
  extra?: { start?: number; end?: number };
  /**
   * La vue de ses morceaux (la pierre de taille de la maison du coq : un mur est-ouest vu par sa face du dehors, vue 0, ou du dedans,
   * vue 2, enduite ; un nord-sud, vue 1 ou 3) ; pour le solin, 0 ou 1.
   */
  view: number;
}

/** Les manières de mur de la maison du coq (world/ashlarWalls.ts) : leur face du dedans diffère de celle du dehors. */
export const COQ_WALLS: ReadonlySet<WallKind> = new Set(['coursed', 'string', 'flagstone']);

/** La manière de mur d'une pièce posée, si c'est un morceau qui se raccorde. */
export function wallOf(p: BuildPiece): WallKind | undefined {
  return 'prop' in p.piece ? props[p.piece.prop]?.wall : undefined;
}

/** Graine stable d'un tronçon : sa manière, son sens, son coin nord-ouest et sa hauteur. */
function seedOf(kind: WallKind, axis: 'ew' | 'ns', b: Box3): number {
  let h = 2166136261;
  for (const n of [{ rough: 1, dressed: 2, coursed: 5, string: 6, flagstone: 7 }[kind], axis === 'ew' ? 3 : 4, b.x, b.y, b.z]) {
    h ^= n & 0xffff;
    h = Math.imul(h, 16777619);
    h ^= n >>> 16;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000003;
}

/**
 * Les tronçons des pièces posées : les morceaux de même manière, de même hauteur et de même sens (est-ouest : vues 0 et 2 ; nord-sud :
 * 1 et 3), sur la même ligne, bout à bout ; puis leurs bouts, d'après les tronçons perpendiculaires qu'ils touchent :
 * - un tronçon perpendiculaire part du carré d'angle d'un bout (sa largeur est l'épaisseur du mur, il touche le flanc nord ou sud,
 *   est ou ouest de ce carré) : ce bout possède l'angle (`corner-<côté où part l'autre>`), l'autre bout vient contre (`abut`) ;
 * - un bout d'est-ouest vient contre le flanc d'un nord-sud, au carré d'un bout de celui-ci (le nord-sud couvre le carré au sol) :
 *   l'angle reste à l'est-ouest, qui dessine le carré en plus (`extra`), le nord-sud vient contre (`abut`, `extra` négatif) ;
 * - un bout vient contre le flanc d'un tronçon perpendiculaire ailleurs (un T) : `abut` ;
 * - sinon, une tête de mur (`head`).
 */
export function wallRuns(pieces: readonly BuildPiece[]): WallRun[] {
  const runs: WallRun[] = [];
  const groups = new Map<string, { p: BuildPiece; b: Box3 }[]>();
  for (const p of pieces) {
    const kind = wallOf(p);
    if (!kind) continue;
    const b = boxOf(p);
    const axis = p.view % 2 ? 'ns' : 'ew';
    const line = axis === 'ew' ? b.y : b.x;
    // un tronçon ne mêle pas deux épaisseurs (le solin des murs, celui des cloisons)
    const k = `${kind}|${axis}|${b.z}|${line}|${axis === 'ew' ? b.d : b.w}|${COQ_WALLS.has(kind) ? p.view % 4 : p.view % 2}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push({ p, b });
  }
  for (const [k, list] of groups) {
    const [kind, axis, , , thick, view] = k.split('|') as [WallKind, 'ew' | 'ns', string, string, string, string];
    const along = (b: Box3) => (axis === 'ew' ? b.x : b.y);
    const size = (b: Box3) => (axis === 'ew' ? b.w : b.d);
    list.sort((a, b) => along(a.b) - along(b.b));
    let cur: { p: BuildPiece; b: Box3 }[] = [];
    const flush = () => {
      if (!cur.length) return;
      const first = cur[0].b;
      const last = cur[cur.length - 1].b;
      const box = axis === 'ew' ? { ...first, w: last.x + last.w - first.x } : { ...first, d: last.y + last.d - first.y };
      runs.push({ kind, axis, thick: Number(thick), pieces: cur.map((c) => c.p), box, start: 'head', end: 'head', seed: seedOf(kind, axis, box), view: Number(view) });
      cur = [];
    };
    for (const c of list) {
      const prev = cur[cur.length - 1];
      if (prev && along(prev.b) + size(prev.b) !== along(c.b)) flush();
      cur.push(c);
    }
    flush();
  }
  // les bouts : chaque tronçon est-ouest contre chaque tronçon nord-sud de même manière et de même hauteur
  for (const r of runs.filter((q) => q.axis === 'ew')) {
    for (const n of runs.filter((q) => q.axis === 'ns' && q.kind === r.kind && q.box.z === r.box.z)) {
      const R = r.box;
      const N = n.box;
      for (const e of ['start', 'end'] as const) {
        // le carré d'angle de ce bout : la largeur du tronçon nord-sud est l'épaisseur du mur
        const sq = e === 'start' ? R.x : R.x + R.w - N.w;
        // la pierre de taille : un pignon de 60 cm contre un mur de 40 à l'étage fait encore un angle
        if (N.x === sq && (N.w === R.d || COQ_WALLS.has(r.kind))) {
          if (N.y + N.d === R.y) {
            r[e] = 'corner-n';
            n.end = 'abut';
            n.align = e === 'start' ? 'west' : 'east';
          } else if (N.y === R.y + R.d) {
            r[e] = 'corner-s';
            n.start = 'abut';
            n.align = e === 'start' ? 'west' : 'east';
          }
        }
        // ce bout vient contre le flanc du tronçon nord-sud, au carré d'un de ses bouts : le nord-sud couvre le carré au sol, mais
        // l'angle reste à l'est-ouest (il dessine le carré en plus, le nord-sud le dessine en moins) ; ailleurs le long du flanc : un T
        const against = e === 'start' ? N.x + N.w === R.x : N.x === R.x + R.w;
        if (against && R.y >= N.y && R.y + R.d <= N.y + N.d) {
          const atNorth = R.y === N.y;
          const atSouth = R.y + R.d === N.y + N.d;
          if (atNorth || atSouth) {
            r[e] = atNorth ? 'corner-s' : 'corner-n';
            r.extra = { ...r.extra, [e]: Math.round(N.w / CM_PER_PX) };
            const ne = atNorth ? 'start' : 'end';
            n[ne] = 'abut';
            n.extra = { ...n.extra, [ne]: -Math.round(R.d / CM_PER_PX) };
            n.align = e === 'start' ? 'west' : 'east';
          } else r[e] = 'abut';
        }
      }
      // un T : le tronçon nord-sud vient contre le flanc nord ou sud du tronçon est-ouest, ailleurs qu'à un carré d'angle
      const inside = N.x >= R.x && N.x + N.w <= R.x + R.w;
      if (inside && N.y + N.d === R.y && n.end === 'head') n.end = 'abut';
      if (inside && N.y === R.y + R.d && n.start === 'head') n.start = 'abut';
    }
  }
  return runs;
}

/** La longueur d'un tronçon (px) : celle de ses morceaux, de toute longueur, bout à bout. */
export function runPx(r: WallRun): number {
  return Math.round((r.axis === 'ew' ? r.box.w : r.box.d) / CM_PER_PX);
}

/** Le tronçon dessiné : la clé de sa texture (tout ce qui change son dessin). */
export function runKey(r: WallRun): string {
  // la pierre de taille : ses joints sont ancrés au monde (sa place) et à la parité de son assise (sa hauteur)
  const at = COQ_WALLS.has(r.kind) ? [r.view, r.box.x, r.box.y, r.box.z] : [];
  return ['wall', r.kind, r.axis, r.thick, runPx(r), r.start, r.end, r.extra?.start ?? 0, r.extra?.end ?? 0, r.seed, ...at].join(':');
}

/**
 * Où poser l'image d'un tronçon de `w` × `h` px : centrée sur son emprise en largeur, son bas au bord sud relevé de sa hauteur (comme
 * une pièce seule, world/buildView.ts) ; et la part de l'image de chaque morceau (`crop`, dans le repère de l'image), d'ouest en est
 * (colonnes) ou du nord au sud (rangées), le premier et le dernier allant jusqu'au bord de l'image.
 */
export function runLayout(r: WallRun, w: number, h: number): { x: number; y: number; crops: { x: number; y: number; w: number; h: number }[] } {
  // la boîte dessinée : celle du tronçon, allongée ou raccourcie de ses `extra` le long du tronçon
  const es = (r.extra?.start ?? 0) * CM_PER_PX;
  const ee = (r.extra?.end ?? 0) * CM_PER_PX;
  const b = r.axis === 'ew' ? { ...r.box, x: r.box.x - es, w: r.box.w + es + ee } : { ...r.box, y: r.box.y - es, d: r.box.d + es + ee };
  // centrée sur l'emprise ; un nord-sud contre un angle, au ras du bord extérieur du carré (ombre comprise à l'est)
  const x =
    r.align === 'west' ? Math.round(r.box.x / CM_PER_PX) : r.align === 'east' ? Math.round((r.box.x + r.box.w) / CM_PER_PX) - (w - 1) : Math.round((b.x + b.w / 2) / CM_PER_PX - w / 2);
  const y = Math.round((b.y + b.d - b.z) / CM_PER_PX);
  const top = y - h;
  const n = r.pieces.length;
  const crops = r.pieces.map((p, i) => {
    const pb = boxOf(p);
    if (r.axis === 'ew') {
      const x0 = i === 0 ? 0 : Math.round(pb.x / CM_PER_PX) - x;
      const x1 = i === n - 1 ? w : Math.round((pb.x + pb.w) / CM_PER_PX) - x;
      return { x: x0, y: 0, w: x1 - x0, h };
    }
    const y0 = i === 0 ? 0 : Math.round((pb.y - b.z) / CM_PER_PX) - top;
    const y1 = i === n - 1 ? h : Math.round((pb.y + pb.d - b.z) / CM_PER_PX) - top;
    return { x: 0, y: y0, w, h: y1 - y0 };
  });
  return { x, y, crops };
}

/**
 * Une pièce couchée posée sur un mur (le solin) s'aligne sur sa face extérieure : la sablière basse affleure le parement du dehors.
 * Le dehors est le côté opposé au reste du mur (le centre des morceaux qui se touchent, de proche en proche) ; un mur seul et droit n'a pas de
 * dehors : la pièce garde sa place. Seulement une pièce parallèle au mur, plus mince que lui, posée au-dessus de son dessus.
 */
export function alignOnWall<B extends Box3>(pieces: readonly BuildPiece[], box: B): B {
  const ew = box.w >= box.d;
  const walls = pieces.filter((p) => wallOf(p));
  const under = walls.find((p) => {
    const b = boxOf(p);
    const parallel = (p.view % 2 === 0) === ew;
    const thinner = ew ? box.d < b.d : box.w < b.w;
    return parallel && thinner && b.z + b.h <= box.z && box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.d && b.y < box.y + box.d;
  });
  if (!under) return box;
  const W = boxOf(under);
  // le mur dont il fait partie : les morceaux qui se touchent (bout à bout, en angle), de proche en proche
  const boxes = walls.map(boxOf);
  const touch = (a: Box3, b: Box3) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.d && b.y <= a.y + a.d && a.z === b.z;
  const near = [boxes[walls.indexOf(under)]];
  for (let i = 0; i < near.length; i++) for (const b of boxes) if (!near.includes(b) && touch(near[i], b)) near.push(b);
  const cx = near.reduce((s, b) => s + b.x + b.w / 2, 0) / near.length;
  const cy = near.reduce((s, b) => s + b.y + b.d / 2, 0) / near.length;
  if (ew) {
    const mid = W.y + W.d / 2;
    if (Math.abs(cy - mid) < W.d / 2) return box;
    return { ...box, y: cy > mid ? W.y : W.y + W.d - box.d };
  }
  const mid = W.x + W.w / 2;
  if (Math.abs(cx - mid) < W.w / 2) return box;
  return { ...box, x: cx > mid ? W.x : W.x + W.w - box.w };
}
