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
}

/** La manière de mur d'une pièce posée, si c'est un morceau qui se raccorde. */
export function wallOf(p: BuildPiece): WallKind | undefined {
  return 'prop' in p.piece ? props[p.piece.prop]?.wall : undefined;
}

/** Graine stable d'un tronçon : sa manière, son sens, son coin nord-ouest et sa hauteur. */
function seedOf(kind: WallKind, axis: 'ew' | 'ns', b: Box3): number {
  let h = 2166136261;
  for (const n of [kind === 'rough' ? 1 : 2, axis === 'ew' ? 3 : 4, b.x, b.y, b.z]) {
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
 * - un bout vient contre le flanc d'un tronçon perpendiculaire (au bout de celui-ci : l'autre possède l'angle ; au milieu : un T) :
 *   `abut` ;
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
    const k = `${kind}|${axis}|${b.z}|${line}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push({ p, b });
  }
  for (const [k, list] of groups) {
    const [kind, axis] = k.split('|') as [WallKind, 'ew' | 'ns'];
    const along = (b: Box3) => (axis === 'ew' ? b.x : b.y);
    const size = (b: Box3) => (axis === 'ew' ? b.w : b.d);
    list.sort((a, b) => along(a.b) - along(b.b));
    let cur: { p: BuildPiece; b: Box3 }[] = [];
    const flush = () => {
      if (!cur.length) return;
      const first = cur[0].b;
      const last = cur[cur.length - 1].b;
      const box = axis === 'ew' ? { ...first, w: last.x + last.w - first.x } : { ...first, d: last.y + last.d - first.y };
      runs.push({ kind, axis, pieces: cur.map((c) => c.p), box, start: 'head', end: 'head', seed: seedOf(kind, axis, box) });
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
        if (N.x === sq && N.w === R.d) {
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
        // ce bout vient contre le flanc du tronçon nord-sud (à l'ouest du bout ouest, à l'est du bout est)
        const against = e === 'start' ? N.x + N.w === R.x : N.x === R.x + R.w;
        if (against && R.y >= N.y && R.y + R.d <= N.y + N.d) {
          r[e] = 'abut';
          const side = e === 'start' ? 'corner-e' : 'corner-w';
          if (R.y === N.y) n.start = side;
          else if (R.y + R.d === N.y + N.d) n.end = side;
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

/** Le tronçon dessiné : la clé de sa texture (tout ce qui change son dessin). */
export function runKey(r: WallRun): string {
  return ['wall', r.kind, r.axis, r.pieces.length, r.start, r.end, r.seed].join(':');
}

/**
 * Où poser l'image d'un tronçon de `w` × `h` px : centrée sur son emprise en largeur, son bas au bord sud relevé de sa hauteur (comme
 * une pièce seule, world/buildView.ts) ; et la part de l'image de chaque morceau (`crop`, dans le repère de l'image), d'ouest en est
 * (colonnes) ou du nord au sud (rangées), le premier et le dernier allant jusqu'au bord de l'image.
 */
export function runLayout(r: WallRun, w: number, h: number): { x: number; y: number; crops: { x: number; y: number; w: number; h: number }[] } {
  const b = r.box;
  // centrée sur l'emprise ; un nord-sud contre un angle, au ras du bord extérieur du carré (ombre comprise à l'est)
  const x =
    r.align === 'west' ? Math.round(b.x / CM_PER_PX) : r.align === 'east' ? Math.round((b.x + b.w) / CM_PER_PX) - (w - 1) : Math.round((b.x + b.w / 2) / CM_PER_PX - w / 2);
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
