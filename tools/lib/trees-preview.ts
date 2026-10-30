// arbres.png de npm run art:preview : les trois arbres de KINDS à chaque étape, l'un sous l'autre dans cet ordre (le gros
// grand, le têtard, le normal), au même pas (même échelle, même sol). De haut en bas : debout (avec sa souche, et Xéros
// pour l'échelle), la chute à droite (images 2 à 4), la chute à gauche, l'arbre couché d'un seul tenant tel que le jeu le
// pose (souche + arbre couché de `spawns`), à droite puis à gauche ; ébranché (la pièce de bois ronde de sa longueur utile,
// posée par `at`), à droite et à gauche ; coupé à 1 m du bout scié (deux pièces, 100 cm et le reste) ; la bille de 1 m
// est-ouest et nord-sud ; enfin le tas plein de billes de 1 m, est-ouest et nord-sud (calculé, src/world/woodPile.ts).
// Les places se lisent dans props.json (`harvest` de l'arbre debout : `becomes`, `at`, `fall`, `spawns` ; `harvest` de
// l'arbre couché : `at`, `wood`) ; tant que props.json ne connaît pas encore l'arbre couché, la géométrie calculée par le
// dessin (art/world/big-felled.ts, big-pollard.ts, normal-felled.ts) en tient lieu, et tout écart entre les deux est signalé.
// Vérification : la première image de chaque chute doit être, pixel pour pixel, l'arbre debout posé, et la dernière l'arbre
// couché posé par le jeu ; les écarts sont rendus à l'appelant (rien ne doit sauter au moment où la chute laisse la place
// aux objets).

import { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../../art/lib/types';
import type { PileWood, PropDef } from '../../src/content/types';
import { drawOrder, shapeOf } from '../../src/world/pileShape';
import { woodPileDef } from '../../src/world/woodPile';
import { lengthPx } from '../../src/world/woodShape';
import { Board, grassOf } from './composite-previews';
import { FELLED_TREE } from '../../art/world/normal-felled';
import { BIG_FELLED, BIG_TREE_CM } from '../../art/world/big-felled';
import { POLLARD_CM, POLLARD_FELLED } from '../../art/world/big-pollard';
import { composeWood } from '../../art/world/wood-pieces';
import { placeImage } from './composite-previews';

type Vec = [number, number];
/** Géométrie de l'arbre couché tirée du dessin : place de son image (droite) et place de la pièce de bois dans celle-ci. */
interface Geometry { spawn: Vec; at: Vec; size: string; cm: number }

/** Les arbres montrés, dans l'ordre : clé de l'arbre debout, de l'arbre couché, du genre de tas de ses billes, et sa géométrie dessinée. */
export const KINDS: { tree: string; lying: string; logs: PileWood; geometry: Geometry }[] = [
  { tree: 'big-tree', lying: 'big-felled-tree', logs: { size: 'big', shape: 'round', length: 100 }, geometry: { spawn: BIG_FELLED.layout.spawn, at: BIG_FELLED.layout.at, size: 'big', cm: BIG_TREE_CM } },
  { tree: 'big-pollard', lying: 'big-pollard-felled-tree', logs: { size: 'big', shape: 'round', length: 100 }, geometry: { spawn: POLLARD_FELLED.layout.spawn, at: POLLARD_FELLED.layout.at, size: 'big', cm: POLLARD_CM } },
  { tree: 'normal-tree', lying: 'normal-felled-tree', logs: { size: 'normal', shape: 'round', length: 100 }, geometry: { spawn: FELLED_TREE.right.at, at: FELLED_TREE.right.log, size: 'normal', cm: 580 } },
];

interface Placed { grid: Grid; palette: Palette; x: number; y: number }

export interface TreesResult {
  png: PNG | undefined;
  /** Écarts : chutes contre arbre debout et arbre couché posé, props.json contre la géométrie dessinée. */
  problems: string[];
}

export function treesPreview(sources: ArtSource[], props: Record<string, PropDef>): TreesResult {
  const image = (name: string | undefined) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'image' ? s : undefined;
  };
  const sheet = (name: string) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'spritesheet' ? s : undefined;
  };
  /** Planche de chute d'un arbre, d'un côté, d'après son `harvest.fall`. */
  const fallSheet = (key: string, left: boolean) => {
    const f = props[key]?.harvest?.fall;
    return f ? sheet(left ? f.left.image : f.image) : undefined;
  };
  const problems: string[] = [];
  const body = sheet('xeros');
  const xeros = body?.animations['idle-down'].frames[0];
  const woodPalette = image('wood-big-round-100')?.palette;
  const pad = 6;

  /**
   * L'arbre `k` couché d'un côté, dans le repère de l'arbre debout (coin haut gauche de chaque image) : la souche, puis
   * selon `stage` l'arbre couché entier, la pièce de bois ébranchée, ou les deux pièces coupées à 1 m du bout scié.
   */
  const lyingScene = (k: (typeof KINDS)[number], left: boolean, stage: 'whole' | 'trunk' | 'cut'): Placed[] | undefined => {
    const tree = image(props[k.tree]?.image);
    const h = props[k.tree]?.harvest;
    const stump = image(h?.becomes ? props[h.becomes]?.image : undefined);
    const whole = image(left ? `${k.lying}-left` : k.lying);
    if (!tree || !h?.at || !h.fall || !stump || !whole || !woodPalette) return undefined;
    const H = tree.grid.length;
    const sp = h.spawns.find((s) => s.type === k.lying);
    const spawn: Vec = sp ? [sp.x, sp.y] : k.geometry.spawn;
    const lh = props[k.lying]?.harvest;
    const at: Vec = lh?.at ?? k.geometry.at;
    const cm = lh?.wood?.length ?? k.geometry.cm;
    const size = lh?.wood?.size ?? k.geometry.size;
    const W = whole.grid[0].length;
    const x = left ? 2 * h.fall.foot - (spawn[0] + W - 1) : spawn[0];
    const bottom = H + spawn[1];
    const out: Placed[] = [{ grid: stump.grid, palette: stump.palette, x: h.at[0], y: H + h.at[1] - stump.grid.length }];
    if (stage === 'whole') {
      out.push({ grid: whole.grid, palette: whole.palette, x, y: bottom - whole.grid.length });
      return out;
    }
    // la pièce : jamais retournée, posée en miroir dans l'image couchée quand l'arbre est tombé à gauche (harvest.ts, `finish`)
    const n = lengthPx(cm);
    const px = x + (left ? W - at[0] - n : at[0]);
    const py = bottom + at[1];
    // coupée à 1 m du bout scié : à l'ouest (le pied) à droite, à l'est à gauche
    const lengths = stage === 'trunk' ? [cm] : left ? [cm - 100, 100] : [100, cm - 100];
    let cx = px;
    for (const l of lengths) {
      const g = composeWood({ size, shape: 'round', axis: 'ew', length: l }).toGrid();
      out.push({ grid: g, palette: woodPalette, x: cx, y: py - g.length });
      cx += lengthPx(l);
    }
    return out;
  };

  // props.json contre la géométrie dessinée
  for (const k of KINDS) {
    const sp = props[k.tree]?.harvest?.spawns.find((s) => s.type === k.lying);
    const lh = props[k.lying]?.harvest;
    if (!sp) problems.push(`${k.tree} : props.json ne fait pas naître ${k.lying} (dessin : spawns ${JSON.stringify({ type: k.lying, x: k.geometry.spawn[0], y: k.geometry.spawn[1] })})`);
    else if (sp.x !== k.geometry.spawn[0] || sp.y !== k.geometry.spawn[1]) problems.push(`${k.tree} : ${k.lying} né en (${sp.x}, ${sp.y}) dans props.json, en (${k.geometry.spawn}) d'après le dessin`);
    if (!lh?.at) problems.push(`${k.lying} : pas de harvest.at dans props.json (dessin : [${k.geometry.at}])`);
    else if (lh.at[0] !== k.geometry.at[0] || lh.at[1] !== k.geometry.at[1]) problems.push(`${k.lying} : at [${lh.at}] dans props.json, [${k.geometry.at}] d'après le dessin`);
    if (lh?.wood && lh.wood.length !== k.geometry.cm) problems.push(`${k.lying} : pièce de ${lh.wood.length} cm dans props.json, ${k.geometry.cm} cm d'après le dessin`);
  }

  type Cell = { items: Placed[]; w: number; h: number };
  const rows: Cell[][][] = []; // [étape][sorte][cases]
  const step = (cells: (kind: (typeof KINDS)[number]) => Cell[] | undefined) => {
    const r = KINDS.map((k) => cells(k) ?? []);
    if (r.some((c) => c.length)) rows.push(r);
  };
  const single = (src: { grid: Grid; palette: Palette }): Cell => ({ items: [{ ...src, x: 0, y: 0 }], w: src.grid[0].length, h: src.grid.length });
  const frames = (s: SpriteSheetSource, which: number[]): Cell[] => which.map((i) => single({ grid: s.animations.fall.frames[i], palette: s.palette }));
  /** Une case d'images posées, recadrée sur elles. */
  const cellOf = (items: Placed[]): Cell => {
    const minX = Math.min(...items.map((i) => i.x)), minY = Math.min(...items.map((i) => i.y));
    const maxX = Math.max(...items.map((i) => i.x + i.grid[0].length)), maxY = Math.max(...items.map((i) => i.y + i.grid.length));
    return { items: items.map((i) => ({ ...i, x: i.x - minX, y: i.y - minY })), w: maxX - minX, h: maxY - minY };
  };

  // 1. debout : l'arbre, sa souche, Xéros
  step((k) => {
    const t = image(props[k.tree]?.image);
    const becomes = props[k.tree]?.harvest?.becomes;
    const st = becomes ? image(props[becomes]?.image) : undefined;
    if (!t || !st) return undefined;
    return [single(t), single(st), ...(xeros && body ? [single({ grid: xeros, palette: body.palette })] : [])];
  });
  // 2. chute à droite, 3. chute à gauche : 10°, 45°, couchée
  for (const left of [false, true]) {
    step((k) => {
      const s = fallSheet(k.tree, left);
      return s ? frames(s, [1, 2, 3]) : undefined;
    });
  }
  // vérification : première image = arbre debout posé ; dernière = souche et arbre couché posés par le jeu
  for (const k of KINDS) for (const left of [false, true]) {
    const s = fallSheet(k.tree, left);
    const tree = image(props[k.tree]?.image);
    const fx = props[k.tree]?.harvest?.fall;
    if (!s || !tree || !fx) continue;
    const offX = left ? fx.left.x : fx.x;
    const fs = s.animations.fall.frames;
    const W = fs[0][0].length;
    const H = fs[0].length;
    const where = `${k.tree}${left ? ' à gauche' : ''}`;
    const compare = (frame: Grid, items: Placed[], what: string) => {
      const a = new Board(W, H, undefined);
      const b = new Board(W, H, undefined);
      a.blit(frame, s.palette, 0, 0);
      for (const p of items) b.blit(p.grid, p.palette, p.x - offX, p.y - (tree.grid.length - H));
      const diff = a.diff(b);
      if (diff.length) problems.push(`${where} : ${diff.length} pixels diffèrent entre ${what} (premier en (${diff[0][0]}, ${diff[0][1]}))`);
    };
    if (tree.grid.length > H) problems.push(`${where} : l'arbre debout (${tree.grid.length} px) est plus haut que les images de la chute (${H} px)`);
    else compare(fs[0], [{ grid: tree.grid, palette: tree.palette, x: 0, y: 0 }], "la première image de la chute et l'arbre debout posé");
    const placed = lyingScene(k, left, 'whole');
    if (!placed) problems.push(`${where} : arbre couché introuvable (${k.lying}${left ? '-left' : ''})`);
    else compare(fs[fs.length - 1], placed, "la dernière image de la chute et l'arbre couché posé");
  }
  // 4. couché d'un seul tenant, à droite puis à gauche ; 5. ébranché ; 6. coupé à 1 m du bout scié
  for (const stage of ['whole', 'trunk', 'cut'] as const) {
    step((k) => {
      const cells = [false, true].map((left) => lyingScene(k, left, stage)).filter((p): p is Placed[] => !!p).map(cellOf);
      return cells.length ? cells : undefined;
    });
  }
  // 7. la bille de 1 m, est-ouest et nord-sud
  step((k) => {
    const def = woodPileDef(k.logs);
    const ew = placeImage(def.places[def.start], image);
    const ns = def.turned ? placeImage(def.turned.places[def.turned.start], image) : undefined;
    return ew && ns ? [single(ew), single(ns)] : undefined;
  });
  // 8. le tas plein, est-ouest puis nord-sud
  step((k) => {
    const def = woodPileDef(k.logs);
    return [false, true].map((turned): Cell => {
      const shape = shapeOf(def, turned);
      const taken = Object.keys(shape.places);
      return cellOf(drawOrder(shape, taken).map((id) => {
        const q = shape.places[id];
        const src = placeImage(q, image)!;
        return { grid: src.grid, palette: src.palette, x: q.x, y: q.y - src.grid.length };
      }));
    });
  });

  if (!rows.length) return { png: undefined, problems };
  // dimensions : une colonne de cases par rang, chaque rangée prend la hauteur de sa case la plus haute
  const rowW = (cells: Cell[]) => cells.reduce((a, c) => a + c.w + pad, pad);
  const rowH = (cells: Cell[]) => Math.max(0, ...cells.map((c) => c.h)) + 2 * pad;
  const width = Math.max(...rows.flatMap((r) => r.map(rowW)));
  const heights = rows.map((r) => r.map(rowH));
  const total = heights.reduce((a, hs) => a + hs.reduce((x, y) => x + y, 0) + 4, 0);
  const board = new Board(width, total, grassOf(sources));
  let y = 0;
  rows.forEach((r, ri) => {
    r.forEach((cells, ki) => {
      let x = pad;
      const h = heights[ri][ki];
      for (const c of cells) {
        // bas des cases aligné sur le sol de la rangée
        const top = y + h - pad - c.h;
        for (const it of c.items) board.blit(it.grid, it.palette, x + it.x, top + it.y);
        x += c.w + pad;
      }
      y += h;
    });
    for (let X = 0; X < width; X++) board.dot(X, y + 1, [60, 70, 30]);
    y += 4;
  });
  return { png: board.toPng(), problems };
}
