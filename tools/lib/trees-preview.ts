// arbres.png de npm run art:preview : les deux arbres côte à côte à chaque étape, le gros au-dessus du normal, au même
// pas (même échelle, même sol). De haut en bas : debout (avec sa souche, et Xéros pour l'échelle), la chute à droite
// (images 2 à 4), la chute à gauche, l'arbre couché tel que le jeu le pose (souche + pièces de `spawns`, d'après props.json),
// l'entaille de la section 2 (rien, 1 coup, 2 coups, coupée, et sa voisine), les billes du tronc (1 à n) et la bille
// ordinaire est-ouest et nord-sud, enfin le tas plein de billes, est-ouest et nord-sud.
// Vérification : la dernière image de chaque chute doit être, pixel pour pixel, l'arbre couché posé par le jeu ; les
// écarts sont rendus à l'appelant (rien ne doit sauter au moment où la chute laisse la place aux objets).

import { PNG } from 'pngjs';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../../art/lib/types';
import type { PileDef, PropDef } from '../../src/content/types';
import { drawOrder, shapeOf } from '../../src/world/pileShape';
import { Board, grassOf } from './composite-previews';

/** Les deux sortes : préfixe des clés, clé du genre de tas. */
export const KINDS = [
  { prefix: 'big', logs: 'big-logs' },
  { prefix: 'normal', logs: 'normal-logs' },
] as const;

interface Placed { grid: Grid; palette: Palette; x: number; y: number }

/** Un arbre couché, posé comme le jeu le fait : la souche puis les pièces, coin haut gauche de chacune dans le repère de l'arbre debout. */
function lying(sources: ArtSource[], props: Record<string, PropDef>, prefix: string, left: boolean): Placed[] | undefined {
  const image = (name: string) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'image' ? s : undefined;
  };
  const tree = props[`${prefix}-tree`];
  const img = image(tree?.image);
  const h = tree?.harvest;
  if (!tree || !img || !h?.at || !h.becomes) return undefined;
  const H = img.grid.length;
  const foot = h.fall!.foot;
  const out: Placed[] = [];
  // la souche ne dépend pas du côté ; une pièce couchée vers la gauche prend l'image `-left`, posée en miroir autour du
  // pied (x' = 2 × pied − (x + largeur − 1))
  const put = (type: string, x: number, y: number, mirrored: boolean) => {
    const p = props[type];
    const src = image(mirrored ? `${p.image}-left` : p.image);
    if (!src) return;
    const X = mirrored ? 2 * foot - (x + src.grid[0].length - 1) : x;
    out.push({ grid: src.grid, palette: src.palette, x: X, y: H + y - src.grid.length });
  };
  put(h.becomes, h.at[0], h.at[1], false);
  for (const s of h.spawns) put(s.type, s.x, s.y, left);
  return out;
}

export interface TreesResult {
  png: PNG | undefined;
  /** Écarts entre la dernière image de la chute et l'arbre couché posé par le jeu : une ligne par sorte et par côté. */
  problems: string[];
}

export function treesPreview(sources: ArtSource[], props: Record<string, PropDef>, piles: Record<string, PileDef>): TreesResult {
  const image = (name: string) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'image' ? s : undefined;
  };
  const sheet = (name: string) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'spritesheet' ? s : undefined;
  };
  const problems: string[] = [];
  const body = sheet('xeros');
  const xeros = body?.animations['idle-down'].frames[0];
  const pad = 6;

  type Cell = { items: Placed[]; w: number; h: number };
  // une rangée de cases par sorte ; chaque case : des images posées dans un repère local, bas aligné
  const rows: Cell[][][] = []; // [étape][sorte][cases]
  const step = (cells: (kind: (typeof KINDS)[number]) => Cell[] | undefined) => {
    const r = KINDS.map((k) => cells(k));
    if (r.every((c) => c && c.length)) rows.push(r as Cell[][]);
  };
  const single = (src: { grid: Grid; palette: Palette }): Cell => ({ items: [{ ...src, x: 0, y: 0 }], w: src.grid[0].length, h: src.grid.length });
  const frames = (s: SpriteSheetSource, which: number[]): Cell[] => which.map((i) => single({ grid: s.animations.fall.frames[i], palette: s.palette }));

  // 1. debout : l'arbre, sa souche, Xéros
  step((k) => {
    const t = image(`${k.prefix}-tree`);
    const st = image(`${k.prefix}-tree-stump`);
    if (!t || !st) return undefined;
    return [single(t), single(st), ...(xeros && body ? [single({ grid: xeros, palette: body.palette })] : [])];
  });
  // 2. chute à droite, 3. chute à gauche : 10°, 45°, couchée
  for (const side of ['', '-left']) {
    step((k) => {
      const s = sheet(`${k.prefix}-tree-fall${side}`);
      return s ? frames(s, [1, 2, 3]) : undefined;
    });
  }
  // 4. arbre couché posé par le jeu, à droite puis à gauche ; en même temps, vérification contre la dernière image
  for (const left of [false, true]) {
    step((k) => {
      const placed = lying(sources, props, k.prefix, left);
      const s = sheet(`${k.prefix}-tree-fall${left ? '-left' : ''}`);
      const tree = image(`${k.prefix}-tree`);
      if (!placed || !s || !tree) return undefined;
      const last = s.animations.fall.frames[s.animations.fall.frames.length - 1];
      const fx = props[`${k.prefix}-tree`].harvest!.fall!;
      // frame posée dans le repère de l'arbre : décalage x de la planche
      const offX = left ? fx.left.x : fx.x;
      const W = last[0].length;
      const H = last.length;
      const a = new Board(W, H, undefined);
      const b = new Board(W, H, undefined);
      a.blit(last, s.palette, 0, 0);
      for (const p of placed) b.blit(p.grid, p.palette, p.x - offX, p.y - (tree.grid.length - H));
      const diff = a.diff(b);
      if (diff.length) problems.push(`${k.prefix}${left ? ' à gauche' : ''} : ${diff.length} pixels diffèrent entre la dernière image de la chute et l'arbre posé (premier en (${diff[0][0]}, ${diff[0][1]}))`);
      return [{ items: placed.map((p) => ({ ...p, x: p.x - offX, y: p.y - (tree.grid.length - H) })), w: W, h: H }];
    });
  }
  // 5. l'entaille de la section 2 et sa voisine
  step((k) => {
    const names = [`${k.prefix}-felled-section-2`, `${k.prefix}-felled-section-2-n1`, `${k.prefix}-felled-section-2-n2`, `${k.prefix}-felled-section-2-cut-right`, `${k.prefix}-felled-section-3-cut-left`];
    const imgs = names.map(image);
    return imgs.every((i) => i) ? (imgs as ImageSource[]).map(single) : undefined;
  });
  // 6. les billes du tronc, puis la bille ordinaire (est-ouest, nord-sud)
  step((k) => {
    const logs: ImageSource[] = [];
    for (let i = 1; image(`${k.prefix}-felled-log-${i}`); i++) logs.push(image(`${k.prefix}-felled-log-${i}`)!);
    const plain = [image(`${k.prefix}-felled-log`), image(`${k.prefix}-felled-log-ns`)];
    return plain.every((i) => i) && logs.length ? [...logs, ...(plain as ImageSource[])].map(single) : undefined;
  });
  // 7. le tas plein, est-ouest puis nord-sud
  step((k) => {
    const def = piles[k.logs];
    if (!def) return undefined;
    return [false, true].map((turned): Cell => {
      const shape = shapeOf(def, turned);
      const taken = Object.keys(shape.places);
      const items = drawOrder(shape, taken).map((id) => {
        const q = shape.places[id];
        const src = image(q.image)!;
        return { grid: src.grid, palette: src.palette, x: q.x, y: q.y - src.grid.length };
      });
      const x0 = Math.min(...items.map((i) => i.x));
      const y0 = Math.min(...items.map((i) => i.y));
      const x1 = Math.max(...items.map((i) => i.x + i.grid[0].length));
      const y1 = Math.max(...items.map((i) => i.y + i.grid.length));
      return { items: items.map((i) => ({ ...i, x: i.x - x0, y: i.y - y0 })), w: x1 - x0, h: y1 - y0 };
    });
  });

  if (!rows.length) return { png: undefined, problems };
  // dimensions : une colonne de cases par rang, chaque rangée prend la hauteur de sa case la plus haute
  const rowW = (cells: Cell[]) => cells.reduce((a, c) => a + c.w + pad, pad);
  const rowH = (cells: Cell[]) => Math.max(...cells.map((c) => c.h)) + 2 * pad;
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
