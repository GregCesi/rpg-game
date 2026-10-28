// Outils de dessin pixel art. Une "Grid" est un tableau de lignes de caractères :
// chaque caractère est une couleur de la palette, '.' est transparent.

export type Grid = string[];
export type Palette = Record<string, string>; // caractère -> '#rrggbb' ou '#rrggbbaa'

export const EMPTY = '.';

export class Canvas {
  readonly px: string[][];

  constructor(readonly w: number, readonly h: number, fill = EMPTY) {
    this.px = Array.from({ length: h }, () => Array(w).fill(fill));
  }

  static from(grid: Grid): Canvas {
    const c = new Canvas(grid[0]?.length ?? 0, grid.length);
    c.stamp(grid, 0, 0);
    return c;
  }

  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return EMPTY;
    return this.px[y][x];
  }

  /** Si défini, on ne peint que sur les pixels dont la couleur est dans cette liste (ombrage "à l'intérieur"). */
  private only: string | null = null;

  set(x: number, y: number, c: string): this {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    if (this.only !== null && !this.only.includes(this.px[y][x])) return this;
    this.px[y][x] = c;
    return this;
  }

  /** Exécute `draw` en ne peignant que sur les couleurs de `allowed`. */
  within(allowed: string, draw: (c: this) => void): this {
    const prev = this.only;
    this.only = allowed;
    draw(this);
    this.only = prev;
    return this;
  }

  /** Remplit un polygone (points en pixels, testés au centre de chaque pixel). */
  polygon(points: [number, number][], c: string): this {
    const ys = points.map((p) => p[1]);
    const xs = points.map((p) => p[0]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i];
          const [xj, yj] = points[j];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Ligne d'un pixel d'épaisseur (Bresenham). */
  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Copie une grille ; les '.' ne recouvrent rien. */
  stamp(grid: Grid, ox: number, oy: number): this {
    grid.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c !== EMPTY) this.set(ox + x, oy + y, c);
      });
    });
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Remplace une couleur par une autre, uniquement sur les pixels existants. */
  recolor(map: Record<string, string>): this {
    for (const row of this.px) for (let x = 0; x < row.length; x++) row[x] = map[row[x]] ?? row[x];
    return this;
  }

  /** Ajoute un contour : tout pixel vide qui touche un pixel plein devient `c`. */
  outline(c: string, diagonals = false): this {
    const add: [number, number][] = [];
    const dirs = diagonals
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.px[y][x] !== EMPTY) continue;
        if (dirs.some(([dx, dy]) => {
          const n = this.get(x + dx, y + dy);
          return n !== EMPTY && n !== c;
        })) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.px[y][x] = c;
    return this;
  }

  toGrid(): Grid {
    return this.px.map((r) => r.join(''));
  }
}

/** Demi-grille gauche -> grille symétrique complète. */
export function mirror(half: Grid): Grid {
  return half.map((row) => row + [...row].reverse().join(''));
}

export function flipX(grid: Grid): Grid {
  return grid.map((row) => [...row].reverse().join(''));
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) : même graine, même dessin. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
