// Les intérieurs (chantier « intérieurs », CONCEPTION « Les intérieurs »), sans Phaser : un bâtiment posé en mode construction se
// reconnaît à sa porte, et son intérieur se calcule de ses pièces, parce que chacune est connue. Rien n'est dessiné à la main pour
// une maison.
//
// - La pièce : ce qui est clos derrière une porte. On projette au sol (grille de INTERIOR.cell cm) tout ce qui barre le passage à
//   hauteur d'homme (base sous INTERIOR.headroom, dessus au-dessus du sol), plus les linteaux (base sous INTERIOR.lintel), plus chaque
//   porte à sa place fermée ; puis on remplit depuis le dedans de la porte. Si le remplissage atteint le bord de la grille, ce n'est
//   pas une pièce close. La pièce est le rectangle de ce qui a été rempli : son emprise entre les faces intérieures des murs.
// - Les entrées : chaque porte (`swing.passage` de props.json ; ouverte, on passe) et chaque ouverture sans porte (un passage sous un
//   linteau, d'au moins INTERIOR.passage cm). Une zone de passage à travers l'épaisseur du mur, le sens où l'on entre, où l'on
//   arrive dedans et dehors.
// - Ce qu'on montre dedans (`shell`) : les murs nord, est et ouest avec tout ce qui est dans leur bande (la sablière), et ce qui est
//   dans l'emprise sous la tête de Xéros (poteaux, cloisons, foyer, dalles) ; ni les toits, ni ce qui passe au-dessus (faîtière,
//   entraits), ni le mur sud, montré en coupe (`south` : l'emprise de ses pièces, hors des passages).
// - Les fenêtres : ce qui s'ouvre et n'est pas une porte (le volet) ; ouvert, il fait entrer une tache de lumière.

import { FEET, INTERIOR } from '../config';
import { props } from '../content';
import type { Facing } from '../content/types';
import { boxOf, OUTWARD, solidOf, swung, type Box3, type BuildPiece } from './build';
import { CM_PER_PX } from '../content/gabarit';
import { mobility } from '../content';
import { deckField, decksAt, openDecks, storeyHeights, walkable } from './decks';

/** Un rectangle au sol, en cm (coin nord-ouest, largeur est-ouest, profondeur nord-sud). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  d: number;
}

/** Un mur de la pièce. */
export type Side = 'north' | 'east' | 'south' | 'west';

/** Une entrée d'un bâtiment : une porte (son identifiant de pièce posée) ou une ouverture sans porte. */
interface Entrance {
  /** La pièce de porte, s'il y en a une. */
  door?: number;
  /** On passe : la porte est ouverte, ou l'ouverture n'a pas de porte. */
  open: boolean;
  /** Le mur où elle est. */
  side: Side;
  /** Son étendue le long du mur (cm, x pour un mur nord ou sud, y sinon). */
  span: [number, number];
  /** La zone de passage : les pieds de Xéros dedans, tourné vers `facing`, il entre (ou, dedans, tourné à l'opposé, il sort). */
  zone: Rect;
  /** La direction de Xéros qui entre. */
  facing: Facing;
  /** Où arrivent ses pieds, dehors (devant la porte) et dedans (derrière elle), en cm. */
  outside: { x: number; y: number };
  inside: { x: number; y: number };
}

/** Une fenêtre (un volet) : où elle est et si elle est ouverte. */
export interface Window {
  id: number;
  open: boolean;
  side: Side;
  span: [number, number];
}

/** Un bâtiment où l'on entre : sa pièce, ses entrées, ce qu'on en voit dedans. */
export interface Building {
  /** Le coin nord-ouest de la pièce, « x,y » en cm : ce qui nomme l'intérieur (ses meubles y sont rangés). */
  key: string;
  room: Rect;
  /** Ses pièces, une par espace clos (une seule pour une cabane ; la salle, le cagibi, le coin, l'atelier pour la maison de Xéros). */
  rooms: Rect[];
  entrances: Entrance[];
  /** Les pièces posées qu'on voit dedans, à leur place (repère de la carte du dehors). */
  shell: BuildPiece[];
  /** La coupe du mur sud : l'emprise de ses pièces, hors des passages ; et ces pièces (leur matière, leur âge). */
  south: Rect[];
  southPieces: BuildPiece[];
  windows: Window[];
  /**
   * Ses niveaux, s'il en a plus d'un (chantier « maison du coq », CONCEPTION « L'étage ») : le rez-de-chaussée d'abord (les mêmes
   * `shell`, `south`, `southPieces`, `windows` que ci-dessus), puis chaque étage. Un seul niveau (toutes les maisons d'avant) : absent.
   */
  storeys?: Storey[];
}

/** Un niveau d'un bâtiment à étages : son plancher (cm), ses pièces closes, ce qu'on en voit, la coupe de son mur sud, ses fenêtres. */
export interface Storey {
  z: number;
  rooms: Rect[];
  /** L'emprise de ses pièces. */
  room: Rect;
  shell: BuildPiece[];
  south: Rect[];
  southPieces: BuildPiece[];
  windows: Window[];
  /** Les trous de son plancher (la trémie), où l'on voit le niveau d'en dessous : rien pour le rez-de-chaussée. */
  holes: Rect[];
}

const FACING: Record<Side, Facing> = { south: 'up', north: 'down', east: 'left', west: 'right' };

/** La direction opposée : celle de Xéros qui ressort. */
export const BACK: Record<Facing, Facing> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Le mur d'un côté du dehors (vecteur de `OUTWARD`). */
function sideOf(ox: number, oy: number): Side {
  return oy > 0 ? 'south' : oy < 0 ? 'north' : ox > 0 ? 'east' : 'west';
}

/** Une pièce de toit : elle n'est ni un mur ni rien qu'on voit dedans. */
function isRoof(p: BuildPiece): boolean {
  return 'prop' in p.piece && !!props[p.piece.prop]?.roof;
}

/** Ce qui s'ouvre et se ferme, d'une pièce posée. */
function swingOf(p: BuildPiece) {
  return 'prop' in p.piece ? props[p.piece.prop]?.swing : undefined;
}

/** Une porte : ce qui s'ouvre et qu'on passe (`swing.passage`). */
function isDoor(p: BuildPiece): boolean {
  return !!swingOf(p)?.passage;
}

/** La pièce à sa place fermée (une porte ou un volet ouvert revient dans son ouverture), sinon telle quelle. */
function closedOf(p: BuildPiece): BuildPiece {
  const s = swingOf(p);
  if (!s?.open) return p;
  const c = swung(p);
  return c ? { ...c, id: p.id } : p;
}

/** Les emprises de deux rectangles se recouvrent. */
function cross(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
}

/** La grille au sol de la recherche : chaque case dit si elle barre le passage (1) ou porte un linteau (2). */
class Grid {
  readonly cells: Uint8Array;

  constructor(
    readonly x0: number,
    readonly y0: number,
    readonly nx: number,
    readonly ny: number,
  ) {
    this.cells = new Uint8Array(nx * ny);
  }

  mark(r: Rect, bit: number): void {
    const c = INTERIOR.cell;
    const i0 = Math.max(0, Math.floor((r.x - this.x0) / c));
    const j0 = Math.max(0, Math.floor((r.y - this.y0) / c));
    const i1 = Math.min(this.nx, Math.ceil((r.x + r.w - this.x0) / c));
    const j1 = Math.min(this.ny, Math.ceil((r.y + r.d - this.y0) / c));
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) this.cells[j * this.nx + i] |= bit;
  }

  /** La case d'un point (cm), ou -1 hors de la grille. */
  cellAt(x: number, y: number): number {
    const i = Math.floor((x - this.x0) / INTERIOR.cell);
    const j = Math.floor((y - this.y0) / INTERIOR.cell);
    return i < 0 || j < 0 || i >= this.nx || j >= this.ny ? -1 : j * this.nx + i;
  }

  /** Le rectangle (cm) de cases groupées, donné par leurs indices extrêmes. */
  rect(i0: number, j0: number, i1: number, j1: number): Rect {
    const c = INTERIOR.cell;
    return { x: this.x0 + i0 * c, y: this.y0 + j0 * c, w: (i1 - i0 + 1) * c, d: (j1 - j0 + 1) * c };
  }

  /**
   * Le remplissage depuis une case libre : le rectangle (cm) de ce qui a été rempli, ou rien s'il touche le bord de la grille ou
   * dépasse INTERIOR.maxCells (ce n'est pas clos).
   */
  flood(start: number): Rect | undefined {
    if (start < 0 || this.cells[start]) return undefined;
    const seen = new Uint8Array(this.cells.length);
    const stack = [start];
    seen[start] = 1;
    let n = 0;
    let [i0, j0, i1, j1] = [Infinity, Infinity, -Infinity, -Infinity];
    while (stack.length) {
      const k = stack.pop()!;
      const i = k % this.nx;
      const j = (k - i) / this.nx;
      if (i === 0 || j === 0 || i === this.nx - 1 || j === this.ny - 1 || ++n > INTERIOR.maxCells) return undefined;
      i0 = Math.min(i0, i);
      j0 = Math.min(j0, j);
      i1 = Math.max(i1, i);
      j1 = Math.max(j1, j);
      for (const q of [k - 1, k + 1, k - this.nx, k + this.nx]) {
        if (!seen[q] && !this.cells[q]) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    return this.rect(i0, j0, i1, j1);
  }
}

/** La boîte d'une pièce pour la recherche, si elle compte : sa place fermée pour une porte ; rien pour un toit ou ce qui est au sol. */
function searchBox(p: BuildPiece): Box3 | undefined {
  if (isRoof(p)) return undefined;
  const b = boxOf(closedOf(p));
  if (b.z >= INTERIOR.lintel || b.z + b.h <= INTERIOR.floor) return undefined;
  return b;
}

/** La grille de toutes les pièces posées : ce qui barre le passage (1), les linteaux (2), avec deux cases de marge tout autour. */
function gridOf(pieces: readonly BuildPiece[]): Grid | undefined {
  const boxes = pieces.map(searchBox).filter((b): b is Box3 => !!b);
  if (!boxes.length) return undefined;
  const c = INTERIOR.cell;
  const x0 = Math.floor(Math.min(...boxes.map((b) => b.x)) / c) * c - 2 * c;
  const y0 = Math.floor(Math.min(...boxes.map((b) => b.y)) / c) * c - 2 * c;
  const x1 = Math.ceil(Math.max(...boxes.map((b) => b.x + b.w)) / c) * c + 2 * c;
  const y1 = Math.ceil(Math.max(...boxes.map((b) => b.y + b.d)) / c) * c + 2 * c;
  const g = new Grid(x0, y0, (x1 - x0) / c, (y1 - y0) / c);
  for (const b of boxes) g.mark(b, b.z < INTERIOR.headroom ? 1 : 2);
  return g;
}

/** La pièce derrière un passage : on avance depuis `from` vers le dedans (dx, dy) jusqu'à une case libre, puis on remplit. */
function roomBehind(g: Grid, from: { x: number; y: number }, dx: number, dy: number): Rect | undefined {
  for (let t = 0; t <= INTERIOR.search; t += INTERIOR.cell) {
    const k = g.cellAt(from.x + dx * t, from.y + dy * t);
    if (k < 0) return undefined;
    if (!g.cells[k]) return g.flood(k);
  }
  return undefined;
}

/** Une entrée, d'après son passage (`gap`, au sol, dans le mur), le côté du dehors (ox, oy) et la pièce. */
function entranceOf(room: Rect, gap: Rect, ox: number, oy: number, open: boolean, door?: number): Entrance {
  const side = sideOf(ox, oy);
  const ns = side === 'north' || side === 'south';
  const span: [number, number] = ns ? [gap.x, gap.x + gap.w] : [gap.y, gap.y + gap.d];
  const mid = (span[0] + span[1]) / 2;
  const s = ox + oy;
  // à travers le mur : du bord de la pièce (5 cm dedans) à 10 cm au-delà de la face du dehors du passage
  const edge = side === 'south' ? room.y + room.d : side === 'north' ? room.y : side === 'east' ? room.x + room.w : room.x;
  const outer = side === 'south' ? gap.y + gap.d : side === 'north' ? gap.y : side === 'east' ? gap.x + gap.w : gap.x;
  const a = Math.min(edge - s * 5, outer + s * 10);
  const b = Math.max(edge - s * 5, outer + s * 10);
  const zone = ns ? { x: span[0], y: a, w: span[1] - span[0], d: b - a } : { x: a, y: span[0], w: b - a, d: span[1] - span[0] };
  // dehors, ses pieds à 30 cm de la face du mur ; devant un mur sud, son corps (de FEET.gap à FEET.gap + FEET.h au-dessus des pieds,
  // vers le nord) ne doit pas toucher la porte fermée : 10 cm de plus que lui (sinon il était déjà dans la porte, et la traversait)
  const out = outer + s * (side === 'south' ? Math.max(30, (FEET.gap + FEET.h) * CM_PER_PX + 10) : 30);
  const inn = edge - s * 30;
  return {
    ...(door !== undefined ? { door } : {}),
    open,
    side,
    span,
    zone,
    facing: FACING[side],
    outside: ns ? { x: mid, y: out } : { x: out, y: mid },
    inside: ns ? { x: mid, y: inn } : { x: inn, y: mid },
  };
}

/**
 * Les ouvertures sans porte : les cases sous un linteau que rien ne barre à hauteur d'homme, groupées, d'au moins INTERIOR.passage
 * cm le long du mur ; hors de celles qui touchent une porte (sous le linteau d'une porte, de part et d'autre du vantail).
 */
function doorways(g: Grid, doors: readonly Box3[]): Rect[] {
  const c = INTERIOR.cell;
  const seen = new Uint8Array(g.cells.length);
  const out: Rect[] = [];
  for (let k = 0; k < g.cells.length; k++) {
    if (seen[k] || g.cells[k] !== 2) continue;
    const stack = [k];
    seen[k] = 1;
    let [i0, j0, i1, j1] = [Infinity, Infinity, -Infinity, -Infinity];
    while (stack.length) {
      const q = stack.pop()!;
      const i = q % g.nx;
      const j = (q - i) / g.nx;
      i0 = Math.min(i0, i);
      j0 = Math.min(j0, j);
      i1 = Math.max(i1, i);
      j1 = Math.max(j1, j);
      for (const r of [i > 0 ? q - 1 : -1, i < g.nx - 1 ? q + 1 : -1, q - g.nx, q + g.nx]) {
        if (r >= 0 && r < g.cells.length && !seen[r] && g.cells[r] === 2) {
          seen[r] = 1;
          stack.push(r);
        }
      }
    }
    const r = g.rect(i0, j0, i1, j1);
    if (Math.max(r.w, r.d) < INTERIOR.passage) continue;
    const near = { x: r.x - c, y: r.y - c, w: r.w + 2 * c, d: r.d + 2 * c };
    if (doors.some((b) => cross(near, b))) continue;
    out.push(r);
  }
  return out;
}

/** Le mur dans la bande duquel est une pièce posée (à INTERIOR.band cm du bord de la pièce, ou au-delà), ou rien. */
function wallSide(room: Rect, b: Rect): Side | undefined {
  const band = INTERIOR.band;
  if (b.y + b.d <= room.y + band) return 'north';
  if (b.x + b.w <= room.x + band) return 'west';
  if (b.x >= room.x + room.w - band) return 'east';
  if (b.y >= room.y + room.d - band) return 'south';
  return undefined;
}

/** Une pièce du mur sud : au-delà du bord sud de la pièce, ou qui le touche depuis la bande INTERIOR.south (le poteau du mur sud). */
function onSouthWall(room: Rect, b: Rect): boolean {
  const s = room.y + room.d;
  return b.y >= s - 1 || (b.y + b.d >= s - INTERIOR.cell && b.y >= s - INTERIOR.south);
}

/**
 * Les bandes des cloisons est-ouest coupées : entre deux pièces l'une au nord de l'autre (le bas de l'une, le haut de l'autre, à moins
 * de INTERIOR.reach cm), sur leur largeur commune. Tout ce qui y est se coupe avec la cloison.
 */
function cutBands(rooms: readonly Rect[]): Rect[] {
  const out: Rect[] = [];
  for (const a of rooms) {
    for (const c of rooms) {
      const gap = c.y - (a.y + a.d);
      const x0 = Math.max(a.x, c.x);
      const x1 = Math.min(a.x + a.w, c.x + c.w);
      if (gap >= 0 && gap <= INTERIOR.reach && x1 > x0) out.push({ x: x0, y: a.y + a.d, w: x1 - x0, d: gap });
    }
  }
  return out;
}

/** Une pièce est dans la bande d'une cloison : son emprise nord-sud y tient (à INTERIOR.band cm près), et elle la recoupe d'ouest en est. */
function inBand(k: Rect, b: Rect): boolean {
  return b.y >= k.y - INTERIOR.band && b.y + b.d <= k.y + k.d + INTERIOR.band && b.x < k.x + k.w && b.x + b.w > k.x;
}

/** Ce qu'on voit dedans, la coupe du mur sud et les fenêtres d'une pièce, d'après les pièces posées autour d'elle. */
function contents(room: Rect, pieces: readonly BuildPiece[], entrances: readonly Entrance[], rooms: readonly Rect[] = [room]): Pick<Building, 'shell' | 'south' | 'southPieces' | 'windows'> {
  const r = INTERIOR.reach;
  const around = { x: room.x - r, y: room.y - r, w: room.w + 2 * r, d: room.d + 2 * r };
  const shell: BuildPiece[] = [];
  const south: Rect[] = [];
  const southPieces: BuildPiece[] = [];
  const windows: Window[] = [];
  const bands = cutBands(rooms);
  for (const p of pieces) {
    const b = boxOf(p);
    const closed = boxOf(closedOf(p));
    if (isRoof(p) || !cross(around, closed)) continue;
    const s = swingOf(p);
    // un volet : une fenêtre, sur le mur où il est fermé
    if (s && !s.passage) {
      const side = wallSide(room, closed);
      if (side) windows.push({ id: p.id, open: !!s.open, side, span: side === 'north' || side === 'south' ? [closed.x, closed.x + closed.w] : [closed.y, closed.y + closed.d] });
    }
    // au sol (dalles) : seulement dans la pièce
    if (b.z + b.h <= INTERIOR.floor) {
      if (cross(room, b) && !onSouthWall(room, b)) shell.push(p);
      continue;
    }
    if (onSouthWall(room, closed)) {
      // la coupe : ce qui barre le passage à hauteur d'homme, hors des portes (le linteau et le pignon passent au-dessus)
      if (b.z < INTERIOR.headroom && !s?.passage) {
        const x0 = Math.max(b.x, room.x - r);
        const x1 = Math.min(b.x + b.w, room.x + room.w + r);
        if (x1 > x0) {
          south.push({ x: x0, y: b.y, w: x1 - x0, d: b.d });
          southPieces.push(p);
        }
      }
      continue;
    }
    // une cloison est-ouest entre deux pièces : en coupe, comme le mur sud, sinon elle cacherait la pièce au nord ; et tout ce qui est
    // dans sa bande avec elle (la traverse, le solin, les poteaux qu'elle porte : tranchés sous la tête de Xéros ; la sablière et ce qui
    // passe au-dessus : cachés), quelle que soit la forme de chaque pièce. Une cloison nord-sud reste entière, comme les murs de côté.
    const band = s?.passage ? undefined : bands.find((k) => inBand(k, b));
    if (band) {
      if (b.z < INTERIOR.headroom) {
        const x0 = Math.max(b.x, band.x);
        const x1 = Math.min(b.x + b.w, band.x + band.w);
        if (x1 > x0) {
          south.push({ x: x0, y: b.y, w: x1 - x0, d: b.d });
          southPieces.push(p);
        }
      }
      continue;
    }
    // ce qui passe au-dessus de la pièce (faîtière, entraits, poinçons) : seulement ce qui est dans la bande d'un mur ; une marche
    // d'escalier (`stair` de props.json) n'est jamais au-dessus de la pièce, même haute : on y monte
    if (cross(room, b) && b.z >= INTERIOR.headroom && !wallSide(room, b) && !('prop' in p.piece && props[p.piece.prop].stair)) continue;
    shell.push(p);
  }
  // la coupe s'arrête aux passages du mur sud
  const gaps = entrances.filter((e) => e.side === 'south');
  const cut = south.flatMap((q) => gaps.reduce<Rect[]>((list, e) => list.flatMap((s) => minus(s, e.span[0], e.span[1])), [q]));
  return { shell, south: cut, southPieces, windows };
}

/**
 * Le mur du fond de chaque pièce close (règle de Grégoire : il est toujours derrière Xéros et derrière tout ce qui est dans la pièce,
 * dedans comme dehors, pour toute maison) : les pièces posées tout entières au nord de la face intérieure nord d'une pièce, à moins de
 * INTERIOR.reach cm d'elle, sur sa largeur (et ses coins, à INTERIOR.reach près), avec leur plafond de profondeur (px) : juste derrière
 * cette face. Ce qui est dans la pièce a pour profondeur son bord sud, au moins la face : le mur du fond reste derrière, quoi qui le
 * porte (une traverse portée aussi par le solin d'une cloison qui traverse le mur n'hérite plus de son bord sud). Pour `depthsOf`.
 */
export function backCaps(pieces: readonly BuildPiece[], rooms: readonly Rect[]): Map<number, number> {
  const out = new Map<number, number>();
  const r = INTERIOR.reach;
  for (const p of pieces) {
    const b = solidOf(p);
    const s = b.y + b.d;
    for (const q of rooms) {
      if (s > q.y || s < q.y - r || b.x >= q.x + q.w + r || b.x + b.w <= q.x - r) continue;
      const cap = q.y / CM_PER_PX - 0.5;
      out.set(p.id, Math.min(out.get(p.id) ?? Infinity, cap));
    }
  }
  return out;
}

/** Un rectangle sans l'intervalle [a, b[ en x. */
function minus(s: Rect, a: number, b: number): Rect[] {
  if (b <= s.x || a >= s.x + s.w) return [s];
  const out: Rect[] = [];
  if (a > s.x) out.push({ ...s, w: a - s.x });
  if (b < s.x + s.w) out.push({ ...s, x: b, w: s.x + s.w - b });
  return out;
}

/** La clé d'une pièce : son coin nord-ouest. */
const keyOf = (room: Rect) => `${room.x},${room.y}`;

/**
 * Les bâtiments où l'on entre, parmi les pièces posées d'une carte : chaque porte et chaque ouverture sans porte qui mène à une pièce
 * close ; deux entrées de la même pièce font un seul bâtiment.
 */
/**
 * Les bâtiments après qu'une porte ou un volet a tourné (chantier « corrections » : ouvrir une porte ne recalcule plus toute la carte) :
 * seul le bâtiment qui le contient est recalculé, de ses seules pièces (celles de ses alentours, `SWUNG_REACH`) ; les autres restent
 * tels quels. Même résultat que `buildingsOf` sur toute la carte (tools/test-recalcul-pur.ts).
 */
export function swungIn(buildings: readonly Building[], pieces: readonly BuildPiece[], p: BuildPiece): Building[] {
  const pb = boxOf(p);
  const r = SWUNG_REACH;
  const near = (a: Rect, b: Rect) => a.x - r < b.x + b.w && b.x < a.x + a.w + r && a.y - r < b.y + b.d && b.y < a.y + a.d + r;
  return buildings.map((b) => {
    if (!near(b.room, pb)) return b;
    const local = pieces.filter((q) => near(b.room, boxOf(q)));
    return buildingsOf(local).find((x) => x.key === b.key) ?? b;
  });
}

/** Ce qui compte autour d'un bâtiment pour le recalculer seul (cm) : ses murs, ses pignons, son toit qui déborde, ses abords. */
const SWUNG_REACH = 400;

export function buildingsOf(pieces: readonly BuildPiece[]): Building[] {
  const g = gridOf(pieces);
  if (!g) return [];
  // les pièces closes, reliées par les portes intérieures (une porte, ou une ouverture, qui a une pièce close de chaque côté) : une
  // maison à plusieurs pièces est un seul bâtiment, son intérieur est le rectangle qui les englobe (CONCEPTION « La maison de Xéros »)
  const rooms = new Map<string, { room: Rect; entrances: { gap: Rect; ox: number; oy: number; open: boolean; door?: number }[] }>();
  const parent = new Map<string, string>();
  const find = (k: string): string => (parent.get(k) === k || !parent.has(k) ? k : find(parent.get(k)!));
  const roomOf = (room: Rect) => {
    const k = keyOf(room);
    if (!rooms.has(k)) {
      rooms.set(k, { room, entrances: [] });
      parent.set(k, k);
    }
    return rooms.get(k)!;
  };
  const link = (a: Rect, b: Rect) => parent.set(find(keyOf(roomOf(a).room)), find(keyOf(roomOf(b).room)));
  const passage = (gap: Rect, ox: number, oy: number, open: boolean, door?: number) => {
    const mid = { x: gap.x + gap.w / 2, y: gap.y + gap.d / 2 };
    const inside = roomBehind(g, mid, -ox, -oy);
    const beyond = roomBehind(g, mid, ox, oy);
    if (inside && beyond) link(inside, beyond);
    else if (inside) roomOf(inside).entrances.push({ gap, ox, oy, open, door });
    else if (beyond) roomOf(beyond).entrances.push({ gap, ox: -ox, oy: -oy, open, door });
  };
  const doors = pieces.filter(isDoor);
  for (const p of doors) {
    const d = closedOf(p);
    const [ox, oy] = OUTWARD[d.view % 4];
    passage(boxOf(d), ox, oy, !!swingOf(p)?.open, p.id);
  }
  for (const w of doorways(g, doors.map((p) => boxOf(closedOf(p))))) {
    const [ox, oy] = w.w >= w.d ? [0, 1] : [1, 0];
    passage(w, ox, oy, true);
  }
  // un bâtiment par groupe de pièces reliées, s'il a une entrée
  const groups = new Map<string, { rooms: Rect[]; entrances: (typeof rooms extends Map<string, infer V> ? V : never)['entrances'] }>();
  for (const [k, r] of rooms) {
    const root = find(k);
    const gr = groups.get(root) ?? { rooms: [], entrances: [] };
    gr.rooms.push(r.room);
    gr.entrances.push(...r.entrances);
    groups.set(root, gr);
  }
  const out: Building[] = [];
  for (const gr of groups.values()) {
    if (!gr.entrances.length) continue;
    const x0 = Math.min(...gr.rooms.map((r) => r.x));
    const y0 = Math.min(...gr.rooms.map((r) => r.y));
    const room = { x: x0, y: y0, w: Math.max(...gr.rooms.map((r) => r.x + r.w)) - x0, d: Math.max(...gr.rooms.map((r) => r.y + r.d)) - y0 };
    const entrances = gr.entrances.map((e) => entranceOf(room, e.gap, e.ox, e.oy, e.open, e.door));
    const levels = storeysAround(pieces, room);
    if (levels.length < 2) {
      out.push({ key: keyOf(room), room, entrances, rooms: gr.rooms, ...contents(room, pieces, entrances, gr.rooms) });
      continue;
    }
    const storeys = levels.map((_, k) => storeyOf(pieces, levels, k, room, gr.rooms, entrances)).filter((st): st is Storey => !!st);
    const ground = storeys[0];
    // l'emprise de l'intérieur : toutes les pièces de tous les niveaux
    const all = storeys.flatMap((st) => st.rooms);
    const wx = Math.min(...all.map((r) => r.x));
    const wy = Math.min(...all.map((r) => r.y));
    const whole = { x: wx, y: wy, w: Math.max(...all.map((r) => r.x + r.w)) - wx, d: Math.max(...all.map((r) => r.y + r.d)) - wy };
    out.push({ key: keyOf(room), room: whole, entrances, rooms: ground.rooms, shell: ground.shell, south: ground.south, southPieces: ground.southPieces, windows: ground.windows, storeys });
  }
  return out;
}

// --- Les niveaux (chantier « maison du coq », CONCEPTION « L'étage ») ---

/** Les niveaux d'un bâtiment : les hauteurs de ses dessus qui se marchent assez grands pour être un plancher (world/decks.ts). */
function storeysAround(pieces: readonly BuildPiece[], room: Rect): number[] {
  const r = INTERIOR.reach;
  const around = { x: room.x - r, y: room.y - r, w: room.w + 2 * r, d: room.d + 2 * r };
  const decks = openDecks(pieces).filter((k) => cross(around, k));
  return storeyHeights(decks, INTERIOR.storey, mobility.step);
}

/**
 * Ce qui compte pour le niveau `k` (de plancher `levels[k]`, sous le plancher du niveau d'au-dessus) : ce qui monte au moins jusqu'à
 * son plancher (au rez-de-chaussée : tout) et commence sous le plancher d'au-dessus, ramené à la hauteur de ce plancher. Les règles
 * d'un bâtiment d'un seul niveau valent alors telles quelles.
 */
function levelPieces(pieces: readonly BuildPiece[], levels: readonly number[], k: number): BuildPiece[] {
  const z = levels[k];
  const ceiling = levels[k + 1] ?? Infinity;
  return pieces
    .filter((p) => {
      const b = boxOf(p);
      // au-dessus du rez-de-chaussée, aussi les dessus d'où l'on y monte d'un pas (le seuil d'une porte de refend, les hautes marches) :
      // sous son plancher, ils ne sont à aucun autre niveau
      const step = k > 0 && walkable(p) && b.z + b.h < z && b.z + b.h >= z - mobility.step;
      return (k === 0 || b.z + b.h >= z || step) && b.z < ceiling;
    })
    .map((p) => (z ? { ...p, z: p.z - z } : p));
}

/** Le niveau `k` d'un bâtiment : ses pièces closes (au rez-de-chaussée, celles des portes ; au-dessus, celles de ses planchers). */
function storeyOf(pieces: readonly BuildPiece[], levels: readonly number[], k: number, room: Rect, groundRooms: readonly Rect[], entrances: readonly Entrance[]): Storey | undefined {
  const z = levels[k];
  const sel = levelPieces(pieces, levels, k);
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const back = (list: readonly BuildPiece[]) => list.map((p) => byId.get(p.id) ?? p);
  let rooms: Rect[];
  let holes: Rect[] = [];
  if (k === 0) rooms = [...groundRooms];
  else {
    const g = gridOf(sel);
    if (!g) return undefined;
    const r = INTERIOR.reach;
    const around = { x: room.x - r, y: room.y - r, w: room.w + 2 * r, d: room.d + 2 * r };
    // chaque plancher de ce niveau dans l'emprise du bâtiment : la pièce close où il est
    const floors = deckField(pieces).decks.filter((d) => d.top === z && cross(around, d));
    const found = new Map<string, Rect>();
    for (const f of floors) {
      const cx = f.x + f.w / 2;
      const cy = f.y + f.d / 2;
      if ([...found.values()].some((q) => cx >= q.x && cx < q.x + q.w && cy >= q.y && cy < q.y + q.d)) continue;
      const q = g.flood(g.cellAt(cx, cy));
      if (q) found.set(keyOf(q), q);
    }
    rooms = [...found.values()];
    if (!rooms.length) return undefined;
    holes = holesOf(rooms, pieces, z);
  }
  const x0 = Math.min(...rooms.map((q) => q.x));
  const y0 = Math.min(...rooms.map((q) => q.y));
  const span = { x: x0, y: y0, w: Math.max(...rooms.map((q) => q.x + q.w)) - x0, d: Math.max(...rooms.map((q) => q.y + q.d)) - y0 };
  const c = contents(span, sel, k === 0 ? entrances : [], rooms);
  return { z, rooms, room: span, shell: back(c.shell), south: c.south, southPieces: back(c.southPieces), windows: c.windows, holes };
}

/** Les trous du plancher `z` dans ses pièces (la trémie) : les bandes de INTERIOR.holeCell cm qu'aucun dessus de ce niveau ne couvre. */
function holesOf(rooms: readonly Rect[], pieces: readonly BuildPiece[], z: number): Rect[] {
  const f = deckField(pieces);
  const c = INTERIOR.holeCell;
  const out: Rect[] = [];
  for (const q of rooms) {
    for (let y = q.y; y < q.y + q.d; y += c) {
      const dy = Math.min(c, q.y + q.d - y);
      let run: Rect | undefined;
      for (let x = q.x; x < q.x + q.w; x += c) {
        const dx = Math.min(c, q.x + q.w - x);
        const open = !decksAt(f, x + dx / 2, y + dy / 2).some((d) => Math.abs(d.top - z) < 1);
        if (open) {
          if (run) run.w += dx;
          else run = { x, y, w: dx, d: dy };
        } else if (run) {
          out.push(run);
          run = undefined;
        }
      }
      if (run) out.push(run);
    }
  }
  return out;
}

/** Le niveau d'un bâtiment où sont des pieds à la hauteur `z` (cm) : 0 sans étage. */
export function storeyIndex(b: { storeys?: readonly { z: number }[] }, z: number): number {
  const levels = b.storeys?.map((st) => st.z) ?? [0];
  let k = 0;
  for (let i = 1; i < levels.length; i++) if (z >= levels[i] - (levels[i] - levels[i - 1]) / 2) k = i;
  return k;
}

// --- L'identifiant d'un intérieur : la carte du dehors et la clé de sa pièce ---

const ID = /^interieur:([^:]+):(-?\d+),(-?\d+)$/;

/** L'identifiant de carte de l'intérieur d'un bâtiment : `interieur:<carte>:<x>,<y>`. Ses meubles sont rangés sous cet identifiant. */
export function interiorId(host: string, key: string): string {
  return `interieur:${host}:${key}`;
}

/** La carte du dehors et la clé de la pièce d'un identifiant d'intérieur, ou rien pour une carte de Tiled. */
export function parseInteriorId(id: string): { host: string; key: string } | undefined {
  const m = ID.exec(id);
  return m ? { host: m[1], key: `${m[2]},${m[3]}` } : undefined;
}
