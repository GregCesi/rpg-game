// arbres.png de npm run art:preview : les arbres de props.json (ceux qui tombent, `TREES` de art/world/trees.ts) à chaque étape,
// l'un sous l'autre dans l'ordre du fichier (le gros grand, le têtard, le normal), au même pas (même échelle, même sol). De haut en bas : debout (avec sa souche, et Xéros
// pour l'échelle), la chute à droite (10°, 45°, couché : les images 2 à 4, après les deux du raccord), la chute à gauche, l'arbre couché d'un seul tenant tel que le jeu le
// pose (souche + arbre couché de `spawns`), à droite puis à gauche ; ébranché (la pièce de bois ronde de sa longueur utile,
// posée par `at`), à droite et à gauche ; coupé à 1 m du bout scié (deux pièces, 100 cm et le reste) ; la bille de 1 m
// est-ouest et nord-sud ; enfin le tas plein de billes de 1 m, est-ouest et nord-sud (calculé, src/world/woodPile.ts).
// Les places se lisent dans props.json complété des décalages calculés (`harvest` de l'arbre debout : `becomes`, `at`, `fall`,
// `spawns` ; `harvest` de l'arbre couché : `at`, `wood` ; src/content/treeLayout.ts), posées comme le jeu les pose (`placeLying`).
// Vérification : sous la coupe, la première image de chaque chute (le raccord, art/world/felling.ts) doit être, pixel pour
// pixel, la dernière étape de l'abattage posée (`<arbre>-stage-7`, `<arbre>-left-stage-7` vers la gauche), et la dernière
// image l'arbre couché posé par le jeu ; les écarts sont rendus à l'appelant (rien ne doit sauter au moment où la chute laisse la place
// aux objets).

import { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../../art/lib/types';
import type { PileWood, PropDef } from '../../src/content/types';
import { drawOrder, shapeOf } from '../../src/world/pileShape';
import { woodPileDef } from '../../src/world/woodPile';
import { lengthPx } from '../../src/world/woodShape';
import { Board, grassOf } from './composite-previews';
import { composeWood } from '../../art/world/wood-pieces';
import { placeImage } from './composite-previews';
import { TREES } from '../../art/world/trees';

type Vec = [number, number];

/** Les arbres montrés, dans l'ordre de props.json : clé de l'arbre debout, de l'arbre couché, du genre de tas de ses billes. */
const KINDS: { tree: string; lying: string; logs: PileWood }[] = TREES.map((t) => ({
  tree: t.key,
  lying: t.felled.key,
  logs: { size: t.felled.wood.size, shape: 'round', length: 100 },
}));

export interface Placed { grid: Grid; palette: Palette; x: number; y: number }
type ImageOf = (name: string | undefined) => { grid: Grid; palette: Palette } | undefined;

/**
 * L'arbre debout `tree` couché d'un côté, posé comme le jeu le pose (src/systems/harvest.ts, `finish`), dans le repère de l'arbre
 * debout (coin haut gauche de son image) : la souche (`becomes`, en `at`), puis selon `stage` l'arbre couché entier (ce qui naît,
 * en miroir autour du pied à gauche), la pièce de bois ébranchée (`at` de l'arbre couché), ou les deux pièces coupées à 1 m du
 * bout scié. `woodPalette` : la palette des pièces de bois.
 */
export function placeLying(image: ImageOf, props: Record<string, PropDef>, tree: string, lying: string, left: boolean, stage: 'whole' | 'trunk' | 'cut', woodPalette: Palette): Placed[] | undefined {
  const standing = image(props[tree]?.image);
  const h = props[tree]?.harvest;
  const stump = image(h?.becomes ? props[h.becomes]?.image : undefined);
  const whole = image(left ? `${props[lying]?.image}-left` : props[lying]?.image);
  const lh = props[lying]?.harvest;
  const sp = h?.spawns.find((s) => s.type === lying);
  if (!standing || !h?.at || !h.fall || !stump || !whole || !sp || !lh?.at || !lh.wood) return undefined;
  const H = standing.grid.length;
  const at = lh.at;
  const cm = lh.wood.length;
  const size = lh.wood.size;
  const W = whole.grid[0].length;
  const x = left ? 2 * h.fall.foot - (sp.x + W - 1) : sp.x;
  const bottom = H + sp.y;
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
}

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

  const lyingScene = (k: (typeof KINDS)[number], left: boolean, stage: 'whole' | 'trunk' | 'cut'): Placed[] | undefined =>
    woodPalette ? placeLying(image, props, k.tree, k.lying, left, stage, woodPalette) : undefined;

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
      return s ? frames(s, [2, 3, 4]) : undefined;
    });
  }
  // vérification : première image = dernière étape de l'abattage posée (sous la coupe : le haut a déjà commencé à basculer) ;
  // dernière = souche et arbre couché posés par le jeu
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
    else {
      const last = image(`${k.tree}${left ? '-left' : ''}-stage-7`);
      const t = TREES.find((x) => x.key === k.tree)?.standing;
      if (!last || !t) problems.push(`${where} : dernière étape de l'abattage introuvable`);
      else {
        // sous la coupe (la rangée au-dessus du plancher de l'entaille et dessous), les pixels pleins doivent être les mêmes ;
        // l'ombre du haut, qui suit la penche, n'est pas comparée
        const dy = H - last.grid.length;
        const solid = (q: string | undefined) => q !== undefined && q !== '.' && q !== 'x';
        let n = 0;
        let first: Vec | undefined;
        for (let y = t.floor - 1; y < last.grid.length; y++) for (let x = 0; x < last.grid[0].length; x++) {
          const p = last.grid[y][x];
          const q = fs[0][y + dy]?.[x - offX];
          if ((solid(p) || solid(q)) && p !== q) { n++; first ??= [x - offX, y + dy]; }
        }
        if (n) problems.push(`${where} : ${n} pixels diffèrent sous la coupe entre la première image de la chute et la dernière étape posée (premier en (${first![0]}, ${first![1]}))`);
      }
    }
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
