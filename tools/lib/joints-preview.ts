// Aperçu des assemblages (npm run art:preview -> .art-preview/assemblages.png) : chaque assemblage avant (deux pièces qui se
// touchent, chacune son dessin) et après (le dessin commun du moteur : la pièce entière et la marque de l'enture, ou la cheville du
// tenon), à côté de Xéros, agrandi x4. Les pièces et leurs assemblages passent par world/build.ts et world/joints.ts comme en jeu ;
// les images se placent et se marquent selon les mêmes règles que world/buildView.ts et world/jointView.ts.

import type { PNG } from 'pngjs';
import { sources } from '../../art/index';
import type { Grid } from '../../art/lib/canvas';
import { composeWood } from '../../art/world/wood-pieces';
import { world } from '../../art/palette';
import { CM_PER_PX } from '../../src/content/gabarit';
import type { WoodPiece } from '../../src/content/types';
import { boxOf, type BuildPiece } from '../../src/world/build';
import { scarfChains, type JointRef } from '../../src/world/joints';
import { TENON } from '../../src/world/jointView';
import { lookOf, upOf } from '../../src/world/woodShape';
import { Board, grassOf } from './composite-previews';
import stones, { stonePalette } from '../../art/items/stones';
import { runLayout, runPx, wallRuns } from '../../src/world/wallRuns';
import { wallKit } from '../../src/world/walls';

const kit = wallKit((name) => {
  const st = stones.find((x) => x.name === name);
  if (st?.kind !== 'image') throw new Error(`assemblages : pierre ${name} absente`);
  return st.grid;
});

const grid = (name: string): Grid => {
  const s = sources.find((q) => q.name === name);
  if (s?.kind === 'image') return s.grid;
  if (s?.kind === 'spritesheet') return s.animations['idle-down'].frames[0];
  throw new Error(`assemblages : image ${name} absente`);
};
/** La palette d'une image d'art (les marques d'assemblage ont la leur). */
const palOf = (name: string): Record<string, string> => (sources.find((q) => q.name === name) as { palette: Record<string, string> }).palette;
const woodPal = (sources.find((s) => s.name === 'wood-big') as { palette: Record<string, string> }).palette;
const xeros = sources.find((s) => s.name === 'xeros')!;
const xerosPal = xeros.kind === 'spritesheet' ? xeros.palette : world;

/** Une pièce de bois posée, en cm. */
const piece = (id: number, wood: WoodPiece, x: number, y: number, z: number): BuildPiece => ({ id, piece: { wood }, x, y, z, view: 0 });
const beam = (axis: WoodPiece['axis'], length: number): WoodPiece => ({ size: 'normal', length, shape: 'round', hewn: 12, axis });
const sill = (id: number, x: number, y: number, view: number): BuildPiece => ({ id, piece: { prop: 'rough-sill-wall' }, x, y, z: 0, view });

/** Les morceaux de solin d'une scène, en tronçons (world/wallRuns.ts), chacun sa part du dessin. */
function drawWalls(board: Board, pieces: BuildPiece[], ox: number, oy: number): void {
  for (const run of wallRuns(pieces)) {
    const g = kit.run({ kind: run.kind, axis: run.axis, length: runPx(run), start: run.start, end: run.end, seed: run.seed, ...(run.extra ? { extra: run.extra } : {}) });
    const lay = runLayout(run, g[0].length, g.length);
    board.blit(g, stonePalette, lay.x + ox, lay.y - g.length + oy);
  }
}

/** Pose sur la planche l'image d'une pièce (réelle ou entière) et ses marques, comme le jeu : centrée, bas au bord sud − z, le dé sous un poteau. */
function draw(board: Board, p: BuildPiece, ox: number, oy: number, marks: { key: string; x: number; y: number }[] = []): void {
  const w = (p.piece as { wood: WoodPiece }).wood;
  const g = composeWood(w).toGrid();
  const b = boxOf(p);
  const lift = w.axis === 'up' ? upOf(w.size, lookOf(w)).lift : 0;
  const x = Math.round((b.x + b.w / 2) / CM_PER_PX - g[0].length / 2) + ox;
  const y = Math.round((b.y + b.d - b.z) / CM_PER_PX) + lift - g.length + oy;
  board.blit(g, woodPal, x, y);
  for (const m of marks) board.blit(grid(m.key), palOf(m.key), x + m.x, y + m.y);
}

/** Les pièces d'une scène, avant (chacune seule) ou après (les suites entées d'un tenant, marquées ; la cheville du tenon). */
function scene(board: Board, all: BuildPiece[], joints: JointRef[], ox: number, oy: number, after: boolean): void {
  drawWalls(board, all.filter((p) => 'prop' in p.piece), ox, oy);
  // le mi-bois : après, la pièce du dessus est descendue au niveau de l'autre
  const lowered = new Map<number, number>();
  if (after) for (const j of joints.filter((q) => q.type === 'halving' && q.top !== undefined)) {
    const other = all.find((p) => p.id === (j.a === j.top ? j.b : j.a))!;
    lowered.set(j.top!, other.z);
  }
  const pieces = all.filter((p) => 'wood' in p.piece).map((p) => (lowered.has(p.id) ? { ...p, z: lowered.get(p.id)! } : p));
  // de bas en haut (ce qui porte avant ce qui est porté), puis du nord au sud, comme les profondeurs du jeu (depthsOf)
  const sorted = [...pieces].sort((a, b) => a.z - b.z || boxOf(a).y + boxOf(a).d - (boxOf(b).y + boxOf(b).d));
  const chains = after ? scarfChains(pieces, joints) : [];
  const done = new Set<number>();
  for (const p of sorted) {
    if (done.has(p.id)) continue;
    const c = chains.find((q) => q.pieces.includes(p));
    if (c) {
      c.pieces.forEach((q) => done.add(q.id));
      const whole = piece(-1, c.wood, c.box.x, c.box.y, c.box.z);
      const g = composeWood(c.wood).toGrid();
      const key = `joint-scarf-${c.wood.size}-${c.axis}`;
      const m = grid(key);
      const marks = c.cuts.map((cut) => {
        if (c.axis === 'ew') return { key, x: Math.round(cut / CM_PER_PX) - Math.floor(m[0].length / 2), y: g.length - m.length };
        if (c.axis === 'ns') return { key, x: 0, y: Math.round(cut / CM_PER_PX) - Math.floor(m.length / 2) };
        const row = upOf(c.wood.size, lookOf(c.wood)).extra + Math.round((c.wood.length - cut) / CM_PER_PX);
        return { key, x: 0, y: row - Math.floor(m.length / 2) };
      });
      draw(board, whole, ox, oy, marks);
      continue;
    }
    // la cheville d'un tenon et mortaise, sur la face de la pièce couchée au droit du poteau
    const marks: { key: string; x: number; y: number }[] = [];
    if (after && (p.piece as { wood: WoodPiece }).wood.axis !== 'up') {
      for (const j of joints.filter((q) => q.type === 'mortise' && (q.a === p.id || q.b === p.id))) {
        const post = pieces.find((q) => q.id === (j.a === p.id ? j.b : j.a))!;
        const pb = boxOf(post);
        const b = boxOf(p);
        const g = composeWood((p.piece as { wood: WoodPiece }).wood).toGrid();
        const x0 = Math.round((b.x + b.w / 2) / CM_PER_PX - g[0].length / 2);
        marks.push({ key: 'joint-peg', x: Math.round((pb.x + pb.w / 2) / CM_PER_PX) - x0 - 1, y: Math.round(g.length * 0.6) - 1 });
      }
    }
    // un poteau dont la tête entre dans la mortaise d'une pièce couchée : son fût monte de TENON sous elle (jointView.ts)
    const w = (p.piece as { wood: WoodPiece }).wood;
    const head = after && w.axis === 'up' && joints.some((j) => j.type === 'mortise' && (j.a === p.id || j.b === p.id) && pieces.some((q) => q.id !== p.id && (q.id === j.a || q.id === j.b) && q.z === p.z + w.length));
    draw(board, head ? { ...p, piece: { wood: { ...w, length: w.length + TENON } } } : p, ox, oy, marks);
  }
  // le croisement du mi-bois, par-dessus : colonne 0 sur l'image de la nord-sud, rangée 0 sur celle de l'est-ouest (jointView.ts)
  if (after) for (const j of joints.filter((q) => q.type === 'halving')) {
    const two = [j.a, j.b].map((id) => pieces.find((p) => p.id === id)!);
    const ew = two.find((p) => (p.piece as { wood: WoodPiece }).wood.axis === 'ew')!;
    const ns = two.find((p) => (p.piece as { wood: WoodPiece }).wood.axis === 'ns')!;
    const E = boxOf(ew);
    const N = boxOf(ns);
    const mask = (N.y < E.y ? 1 : 0) + (E.x + E.w > N.x + N.w ? 2 : 0) + (N.y + N.d > E.y + E.d ? 4 : 0) + (E.x < N.x ? 8 : 0);
    const key = `joint-halving-normal-beam-${j.top === ns.id ? 'ns' : 'ew'}-${mask}`;
    if (!sources.some((q) => q.name === key)) continue;
    const gn = composeWood((ns.piece as { wood: WoodPiece }).wood).toGrid();
    const ge = composeWood((ew.piece as { wood: WoodPiece }).wood).toGrid();
    const x = Math.round((N.x + N.w / 2) / CM_PER_PX - gn[0].length / 2) + ox;
    const y = Math.round((E.y + E.d - E.z) / CM_PER_PX) - ge.length + oy;
    board.blit(grid(key), palOf(key), x, y);
  }
}

export function jointsPreview(): PNG {
  // les scènes, en cm : deux poteaux debout l'un sur l'autre ; deux poutres est-ouest bout à bout ; deux nord-sud ; un poteau sous
  // une sablière (tenon et mortaise)
  // `later` : les pièces posées seulement après l'assemblage (le poteau d'angle sur le croisement)
  const scenes: { pieces: BuildPiece[]; joints: JointRef[]; w: number; later?: number[] }[] = [
    { pieces: [piece(1, beam('up', 180), 40, 400, 0), piece(2, beam('up', 100), 40, 400, 180)], joints: [{ id: 1, type: 'scarf', a: 1, b: 2 }], w: 120 },
    { pieces: [piece(1, beam('ew', 200), 0, 300, 0), piece(2, beam('ew', 200), 200, 300, 0)], joints: [{ id: 1, type: 'scarf', a: 1, b: 2 }], w: 420 },
    { pieces: [piece(1, beam('ns', 200), 40, 0, 0), piece(2, beam('ns', 200), 40, 200, 0)], joints: [{ id: 1, type: 'scarf', a: 1, b: 2 }], w: 120 },
    { pieces: [piece(1, beam('up', 180), 80, 400, 0), piece(2, beam('ew', 200), 0, 400, 180)], joints: [{ id: 1, type: 'mortise', a: 1, b: 2 }], w: 220 },
    // l'angle d'une maison : un angle de solin, la sablière est-ouest affleurant le nord, la nord-sud l'ouest, posée sur la première ;
    // après, le mi-bois les met à la même hauteur, le poteau d'angle au-dessus
    {
      pieces: [
        sill(1, 0, 230, 0), sill(2, 160, 230, 0), sill(3, 0, 280, 1), sill(4, 0, 440, 1),
        piece(5, beam('ew', 300), 0, 230, 40), piece(6, beam('ns', 300), 0, 230, 70), piece(7, beam('up', 180), 0, 225, 70),
      ],
      joints: [{ id: 1, type: 'halving', a: 5, b: 6, top: 6 }],
      later: [7],
      w: 340,
    },
  ];
  const H = 130;
  const pad = 8;
  const width = scenes.reduce((s, sc) => s + 2 * (sc.w / CM_PER_PX) + 3 * pad, 0) + 24;
  const board = new Board(Math.ceil(width), H, grassOf(sources));
  board.blit(grid('xeros'), xerosPal, 4, H - 48 - 4);
  let x = 24;
  for (const sc of scenes) {
    for (const after of [false, true]) {
      scene(board, after ? sc.pieces : sc.pieces.filter((p) => !sc.later?.includes(p.id)), sc.joints, x, 4, after);
      x += sc.w / CM_PER_PX + pad;
    }
    x += pad;
  }
  return board.toPng();
}
