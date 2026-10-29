// Aperçus composés de npm run art:preview : ce que le jeu assemble à partir de plusieurs images.
// - xeros-<geste>-<outil>.png : chaque geste (use, chop...) du corps avec l'outil posé sur la main, image par image,
//   une rangée par direction (bas, haut, droite, gauche). Les poses viennent de src/content/gestures.json,
//   comme dans le jeu (entities/ToolUse.ts) : l'aperçu montre exactement ce que l'on verra.
// - hands.png : les deux mains comme dans le HUD.
// - piles.png : chaque genre de tas (src/content/piles.json), étape par étape (construction type, puis tous les états
//   possibles s'ils sont peu nombreux), puis sa forme tournée (`turned`, les billes nord-sud), Xéros à l'échelle en tête de rangée, collisions des pièces au sol en liseré :
//   même calcul que GameMap.placePile (pièce = coin bas gauche au point du tas + (x, y), dans l'ordre de drawOrder).
// - gabarit.png : les étalons du gabarit (docs/STYLE.md section 8), posés sur une même ligne de sol, de gauche à droite :
//   Xéros, un cube de 50 cm, la bille est-ouest (felled-log), la bille nord-sud (felled-log-ns), un cylindre debout de
//   50 cm (Ø 50, 50 de haut). Le cube et le cylindre sont tracés d'après les formules de src/content/gabarit.ts. En
//   dessous, les mêmes avec, en liseré jaune, la taille que donne le gabarit. Une règle à gauche : un trait tous les
//   10 px (50 cm), un long tous les 20 px (1 m) ; le quadrillage du fond est celui des cases (32 px, 1,60 m).

import { PNG } from 'pngjs';
import { Canvas, EMPTY } from '../../art/lib/canvas';
import { flipX } from '../../art/lib/canvas';
import type { Grid, Palette } from '../../art/lib/canvas';
import type { ArtSource, SpriteSheetSource } from '../../art/lib/types';
import type { Gesture, PileDef } from '../../src/content/types';
import { CM_PER_PX, RACCOURCI, expectedSize, silhouette } from '../../src/content/gabarit';
import type { Dims } from '../../src/content/gabarit';
import { world } from '../../art/palette';
import { drawOrder, pileBlocks, pileStates, shapeOf } from '../../src/world/pileShape';

const SCALE = 4;

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}

/** Image en pixels du jeu, posée sur l'herbe, agrandie ×SCALE à l'écriture. */
class Board {
  private readonly px: [number, number, number][];

  constructor(
    readonly w: number,
    readonly h: number,
    grass: { grid: Grid; palette: Palette } | undefined,
  ) {
    this.px = Array.from({ length: w * h }, (_, i) => {
      if (!grass) return [120, 133, 68];
      const x = i % w;
      const y = Math.floor(i / w);
      const [r, g, b] = hexToRgba(grass.palette[grass.grid[y % grass.grid.length][x % grass.grid[0].length]]);
      return [r, g, b];
    });
  }

  blit(grid: Grid, palette: Palette, ox: number, oy: number): void {
    grid.forEach((line, y) =>
      [...line].forEach((ch, x) => {
        if (ch === '.') return;
        const X = ox + x;
        const Y = oy + y;
        if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
        const [r, g, b, a8] = hexToRgba(palette[ch]);
        const a = a8 / 255;
        const p = this.px[Y * this.w + X];
        p[0] = Math.round(r * a + p[0] * (1 - a));
        p[1] = Math.round(g * a + p[1] * (1 - a));
        p[2] = Math.round(b * a + p[2] * (1 - a));
      }),
    );
  }

  /** Liseré d'un rectangle [left, right[ × [top, bottom[ (pixels du jeu). */
  outline(left: number, top: number, right: number, bottom: number, rgb: [number, number, number]): void {
    for (let X = left; X < right; X++) for (const Y of [top, bottom - 1]) this.dot(X, Y, rgb);
    for (let Y = top; Y < bottom; Y++) for (const X of [left, right - 1]) this.dot(X, Y, rgb);
  }

  /** Un pixel, en couleur pleine. */
  dot(X: number, Y: number, rgb: [number, number, number]): void {
    if (X >= 0 && Y >= 0 && X < this.w && Y < this.h) this.px[Y * this.w + X] = [...rgb];
  }

  toPng(): PNG {
    const png = new PNG({ width: this.w * SCALE, height: this.h * SCALE });
    for (let Y = 0; Y < png.height; Y++) {
      for (let X = 0; X < png.width; X++) {
        const p = this.px[Math.floor(Y / SCALE) * this.w + Math.floor(X / SCALE)];
        png.data.set([p[0], p[1], p[2], 255], (Y * png.width + X) * 4);
      }
    }
    return png;
  }
}

function grassOf(sources: ArtSource[]): { grid: Grid; palette: Palette } | undefined {
  const world = sources.find((s) => s.kind === 'tileset' && s.name === 'world');
  if (world?.kind !== 'tileset' || !world.tiles.grass) return undefined;
  return { grid: world.tiles.grass, palette: world.palette };
}

/**
 * Le geste `name` du personnage `body` avec la planche d'outil `tool` (animations `<geste>-down/up/right`,
 * prise du manche au centre). Même calcul que ToolUse : main = pieds + (dx, dy) ; à gauche, tout est retourné.
 */
export function gesturePreview(sources: ArtSource[], body: SpriteSheetSource, tool: SpriteSheetSource, name: string, gesture: Gesture): PNG {
  const fw = body.frameW;
  const fh = body.frameH;
  const cw = fw + 24;
  const ch = fh + 24;
  const steps = gesture.poses.down.length;
  const board = new Board(cw * steps, ch * 4, grassOf(sources));
  (['down', 'up', 'right', 'left'] as const).forEach((dir, row) => {
    const left = dir === 'left';
    const src = left ? 'right' : dir;
    const frames = body.animations[`${name}-${dir}`]?.frames ?? [];
    const tools = tool.animations[`${name}-${src}`]?.frames ?? [];
    for (let step = 0; step < steps; step++) {
      const pose = gesture.poses[src][step];
      let tg = tools[step];
      if (!tg || !frames[step]) continue;
      if (left) tg = flipX(tg);
      const bx = step * cw + 12;
      const by = row * ch + 18;
      // prise du manche au centre (arrondie vers le bas) ; retournée, elle passe d'une colonne à gauche
      const gx = Math.floor(tool.frameW / 2) - (left ? 1 : 0);
      const gy = Math.floor(tool.frameH / 2);
      const hx = left ? fw - 1 - (fw / 2 + pose.dx) : fw / 2 + pose.dx;
      const tx = bx + hx - gx;
      const ty = by + fh + pose.dy - gy;
      if (pose.behind) board.blit(tg, tool.palette, tx, ty);
      board.blit(frames[step], body.palette, bx, by);
      if (!pose.behind) board.blit(tg, tool.palette, tx, ty);
    }
  });
  return board.toPng();
}

/** Les deux mains comme dans HudScene : une branche dans la main gauche, une pierre dans la droite, la droite active. */
export function handsPreview(sources: ArtSource[]): PNG | undefined {
  const image = (name: string) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'image' ? s : undefined;
  };
  const slot = image('ui-slot');
  const active = image('ui-slot-active');
  if (!slot || !active) return undefined;
  const size = slot.grid[0].length;
  const gap = 4;
  const icons = ['item-branch', 'item-stone'];
  const board = new Board(2 * size + gap + 16, size + 16, grassOf(sources));
  icons.forEach((key, i) => {
    const x = 8 + i * (size + gap);
    const s = i === 1 ? active : slot;
    board.blit(s.grid, s.palette, x, 8);
    const icon = image(key);
    // icône centrée dans la case, comme dans HudScene
    if (icon) board.blit(icon.grid, icon.palette, x + (size - icon.grid[0].length) / 2, 8 + (size - icon.grid.length) / 2);
  });
  return board.toPng();
}

/**
 * Les tas de chaque genre, étape par étape : pour chaque genre, une rangée « construction type » (les places dans
 * l'ordre de piles.json, une pièce de plus par case), puis, s'il y en a au plus `ALL_STATES`, tous les états possibles
 * (chaque ensemble de places prises où chaque pièce est portée), comme dans le jeu : `drawOrder`, collisions des pièces
 * au sol en liseré rouge quand le tas bloque le passage, grises sinon. Xéros (attente de face) en tête de rangée, pour l'échelle.
 */
const ALL_STATES = 60;

export function pilesPreview(sources: ArtSource[], piles: Record<string, PileDef>): PNG | undefined {
  const image = (name: string) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'image' ? s : undefined;
  };
  const body = sources.find((s) => s.kind === 'spritesheet' && s.name === 'xeros');
  const xeros = body?.kind === 'spritesheet' ? body.animations['idle-down']?.frames[0] : undefined;
  const xw = body?.kind === 'spritesheet' ? body.frameW : 0;
  const xh = body?.kind === 'spritesheet' ? body.frameH : 0;
  const pad = 8;
  const perRow = 8;
  type Row = { def: PileDef; states: string[][]; ext: { left: number; right: number; top: number; bottom: number }; tied?: boolean };
  const rows: Row[] = [];
  // chaque genre, puis sa forme tournée s'il en a une (les billes nord-sud)
  const shapes = Object.values(piles).flatMap((d) => (d.turned ? [d, shapeOf(d, true)] : [d]));
  for (const def of shapes) {
    const places = Object.entries(def.places);
    if (places.some(([, q]) => !image(q.image))) return undefined;
    // étendue de toutes les places autour du point du tas : la même case pour chaque état
    // le lien sous le tas (les branches), s'il est dessiné, compte dans l'étendue
    const tie = def.tie && image(def.tie.image) ? { ...def.tie, grid: image(def.tie.image)!.grid } : undefined;
    const ext = {
      left: Math.min(...places.map(([, q]) => q.x), tie ? tie.x : Infinity),
      right: Math.max(...places.map(([, q]) => q.x + image(q.image)!.grid[0].length), tie ? tie.x + tie.grid[0].length : -Infinity),
      top: Math.min(...places.map(([, q]) => q.y - image(q.image)!.grid.length), tie ? tie.y - tie.grid.length : Infinity),
      bottom: Math.max(...places.map(([, q]) => Math.max(q.y, q.body ? q.body.y + q.body.h : q.y)), tie ? tie.y : -Infinity),
    };
    const keys = places.map(([id]) => id);
    const typical = keys.map((_, i) => keys.slice(0, i + 1));
    for (let i = 0; i < typical.length; i += perRow) rows.push({ def, states: typical.slice(i, i + perRow), ext });
    // lié : le lien seul, puis la construction type sur lui
    if (tie) {
      const tied = [[], ...typical];
      for (let i = 0; i < tied.length; i += perRow) rows.push({ def, states: tied.slice(i, i + perRow), ext, tied: true });
    }
    const all = pileStates(def, ALL_STATES + 1);
    if (all.length <= ALL_STATES) for (let i = 0; i < all.length; i += perRow) rows.push({ def, states: all.slice(i, i + perRow), ext });
  }
  const cellW = Math.max(...rows.map((r) => r.ext.right - r.ext.left)) + pad;
  const rowH = rows.map((r) => Math.max(r.ext.bottom - r.ext.top, xh) + 2 * pad);
  const board = new Board(pad + xw + pad + perRow * cellW, rowH.reduce((a, b) => a + b, 0), undefined);
  let y0 = 0;
  rows.forEach((r, row) => {
    // ligne de base commune : le point du tas (y = 0 du repère des places) et les pieds de Xéros
    const base = y0 + rowH[row] - pad - r.ext.bottom;
    if (xeros && body?.kind === 'spritesheet') board.blit(xeros, body.palette, pad, base + r.ext.bottom - xh);
    r.states.forEach((taken, i) => {
      const px = pad + xw + pad + i * cellW - r.ext.left;
      // le lien passe sous toutes les pièces
      const tieSrc = r.tied && r.def.tie ? image(r.def.tie.image) : undefined;
      if (tieSrc && r.def.tie) board.blit(tieSrc.grid, tieSrc.palette, px + r.def.tie.x, base + r.def.tie.y - tieSrc.grid.length);
      for (const id of drawOrder(r.def, taken)) {
        const q = r.def.places[id];
        const src = image(q.image)!;
        board.blit(src.grid, src.palette, px + q.x, base + q.y - src.grid.length);
      }
      const color: [number, number, number] = pileBlocks(r.def, taken) ? [200, 40, 40] : [150, 150, 150];
      for (const id of taken) {
        const b = r.def.places[id].body;
        if (b) board.outline(px + b.x, base + b.y, px + b.x + b.w, base + b.y + b.h, color);
      }
    });
    y0 += rowH[row];
  });
  return board.toPng();
}

/**
 * Contour d'un étalon tracé : chaque pixel du bord de la silhouette devient contour, `OUTLINE` (o) s'il touche le vide
 * en bas ou à droite, la teinte la plus sombre de la pierre (Z) côté lumière. La silhouette garde sa taille.
 */
function gaugeOutline(c: Canvas): Canvas {
  const edge: [number, number, string][] = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.get(x, y) === EMPTY) continue;
    const shadowSide = c.get(x + 1, y) === EMPTY || c.get(x, y + 1) === EMPTY;
    const litSide = c.get(x - 1, y) === EMPTY || c.get(x, y - 1) === EMPTY;
    if (shadowSide) edge.push([x, y, 'o']);
    else if (litSide) edge.push([x, y, 'Z']);
  }
  for (const [x, y, k] of edge) c.set(x, y, k);
  return c;
}

/** Ombre portée d'un étalon : la silhouette décalée d'un pixel vers la droite, sur deux rangées sous sa base. */
function gaugeShadow(c: Canvas, base: number): Canvas {
  for (let x = 1; x < c.w; x++) for (const y of [base + 1, base + 2]) if (c.get(x - 1, base) !== EMPTY && c.get(x, y) === EMPTY) c.set(x, y, 'x');
  return c;
}

/** Boîte d'après le gabarit (pierre de la palette) : face sud W × H (z), dessus W × D/2 (R) ; ombre dessous. */
function gaugeBox(dims: Dims): Canvas {
  const W = Math.round(dims.w / CM_PER_PX);
  const H = Math.round(dims.h / CM_PER_PX);
  const T = Math.round((dims.d / CM_PER_PX) * RACCOURCI);
  const c = new Canvas(W + 1, T + H + 2);
  c.rect(0, 0, W, T, 'R').rect(0, T, W, H, 'z');
  // la face sud, un cran plus sombre sur son tiers droit
  c.rect(W - Math.round(W / 3), T, Math.round(W / 3), H, 'Z');
  return gaugeShadow(gaugeOutline(c), T + H - 1);
}

/** Cylindre debout d'après le gabarit : corps Ø × H, dessus en ovale Ø × Ø/2 (R), fond arrondi ; ombre dessous. */
function gaugeUpright(dims: Dims): Canvas {
  const D = Math.round(dims.w / CM_PER_PX);
  const H = Math.round(dims.h / CM_PER_PX);
  const ry = ((dims.d / CM_PER_PX) * RACCOURCI) / 2;
  const c = new Canvas(D + 1, Math.ceil(H + 2 * ry) + 2);
  // corps du centre de l'ovale du dessus au centre de l'ovale du fond, l'ovale du fond, puis le dessus
  c.ellipse(D / 2, ry + H, D / 2, ry, 'r').rect(0, Math.round(ry), D, H, 'r');
  c.within('r', (k) => k.rect(D - Math.round(D / 3), 0, Math.round(D / 3), c.h, 'z'));
  c.ellipse(D / 2, ry, D / 2, ry, 'R');
  return gaugeShadow(gaugeOutline(c), Math.ceil(H + 2 * ry) - 1);
}

export function gabaritPreview(sources: ArtSource[]): PNG | undefined {
  const image = (name: string) => {
    const s = sources.find((x) => x.name === name);
    return s?.kind === 'image' ? s : undefined;
  };
  const body = sources.find((s) => s.kind === 'spritesheet' && s.name === 'xeros');
  const ew = image('felled-log');
  const ns = image('felled-log-ns');
  if (body?.kind !== 'spritesheet' || !ew || !ns) return undefined;
  const cube: Dims = { w: 50, d: 50, h: 50, shape: 'box' };
  const upright: Dims = { w: 50, d: 50, h: 50, shape: 'cylinder', axis: 'up' };
  const log: Dims = { w: 95, d: 65, h: 65, shape: 'cylinder', axis: 'ew' };
  const logNS: Dims = { w: 65, d: 95, h: 65, shape: 'cylinder', axis: 'ns' };
  const xerosDims: Dims = { w: 90, d: 30, h: 160, shape: 'flat' }; // une personne : sa hauteur, sans dessus (h = 32 px)
  const gauges: { grid: Grid; palette: Palette; dims: Dims; person?: boolean }[] = [
    { grid: body.animations['idle-down'].frames[0], palette: body.palette, dims: xerosDims, person: true },
    { grid: gaugeBox(cube).toGrid(), palette: world, dims: cube },
    { grid: ew.grid, palette: ew.palette, dims: log },
    { grid: ns.grid, palette: ns.palette, dims: logNS },
    { grid: gaugeUpright(upright).toGrid(), palette: world, dims: upright },
  ];
  const pad = 12;
  const ruler = 10;
  const gap = 10;
  const sils = gauges.map((g) => silhouette(g.grid, g.palette));
  const rowH = Math.max(...sils.map((s) => s.h)) + 2 * pad;
  const width = ruler + pad + sils.reduce((a, s) => a + s.w + gap, 0) + pad;
  const board = new Board(width, 2 * rowH, grassOf(sources));
  // quadrillage des cases (32 px, 1,60 m), à peine marqué
  for (let Y = 0; Y < board.h; Y++) for (let X = 0; X < board.w; X++) if (X % 32 === 0 || Y % 32 === 0) board.dot(X, Y, [104, 116, 58]);
  for (let row = 0; row < 2; row++) {
    const ground = row * rowH + rowH - pad; // première rangée sous la base des silhouettes
    // règle : un trait tous les 50 cm, un long tous les mètres, depuis la ligne de sol
    for (let k = 0; k * 10 <= rowH - 2 * pad + 4; k++) {
      const Y = ground - 1 - k * 10;
      for (let X = 2; X < (k % 2 === 0 ? ruler : ruler - 4); X++) board.dot(X, Y, [235, 225, 190]);
    }
    for (let Y = ground - (rowH - 2 * pad) - 4; Y < ground; Y++) board.dot(2, Y, [235, 225, 190]);
    let x = ruler + pad;
    gauges.forEach((g, i) => {
      const s = sils[i];
      // ancrage : le bas de la silhouette sur la ligne de sol
      const ox = x - s.x;
      const oy = ground - (s.y + s.h);
      board.blit(g.grid, g.palette, ox, oy);
      if (row === 1) {
        const want = g.person ? { w: s.w, h: g.dims.h / CM_PER_PX } : expectedSize(g.dims);
        const w = Math.round(want.w);
        const h = Math.round(want.h);
        // liseré de la taille attendue, centré sur la silhouette, posé sur la même ligne de sol
        const left = x + Math.round((s.w - w) / 2) - 1;
        board.outline(left, ground - h - 1, left + w + 2, ground + 1, [240, 210, 60]);
      }
      x += s.w + gap;
    });
  }
  return board.toPng();
}
