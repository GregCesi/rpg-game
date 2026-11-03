// Ce qu'on voit des toits des pièces posées, dehors (retouche de Grégoire, CONCEPTION « La maison de Xéros »), sans Phaser (testé par
// tools/test-roofs.ts) :
// - le toit d'un bâtiment où l'on entre (une maison, une cabane : il a un intérieur) ne s'efface jamais dehors : on n'est « dedans »
//   que dans son intérieur, une carte à part ;
// - le toit d'un abri ouvert (sans intérieur) s'efface quand Xéros est dessous, ses pieds sous son emprise (sans marge : il ne
//   s'efface plus quand Xéros approche), avec tout ce qui repose dessus ;
// - devant une fenêtre au volet ouvert, dehors, on voit l'intérieur de cette pièce-là seulement : le toit s'ouvre au-dessus d'elle
//   (`reveal`, en cm), le reste de la maison garde son toit ;
// - ce qui est caché ne se voit pas, lumière comprise (chantier « correctifs ») : la lueur d'un feu posé sous un toit (l'âtre) suit
//   l'opacité de ce toit (`lightCovers`) : cachée sous le toit opaque, revenue quand il s'efface ou s'ouvre au-dessus de sa pièce.

import { ROOF } from '../config';
import { props } from '../content';
import { boxOf, overHead, withAbove, type BuildPiece } from './build';
import type { Building, Rect, Window } from './interior';

export interface RoofView {
  /** Les pièces qui s'effacent (l'abri ouvert sous lequel est Xéros). */
  faded: Set<number>;
  /** La pièce dont on voit l'intérieur par sa fenêtre ouverte (cm), et le bâtiment dont le toit s'y ouvre. */
  reveal?: { room: Rect; building: Building };
}

/** Deux rectangles se recouvrent (cm). */
const cross = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;

/** La pièce posée fait partie d'un bâtiment où l'on entre : son emprise touche sa pièce, à la largeur des murs près. */
function enclosed(p: BuildPiece, buildings: readonly Building[]): boolean {
  const m = ROOF.wall;
  const box = boxOf(p);
  return buildings.some((b) => cross(box, { x: b.room.x - m, y: b.room.y - m, w: b.room.w + 2 * m, d: b.room.d + 2 * m }));
}

/**
 * La pièce d'un bâtiment dont on voit l'intérieur, Xéros dehors (ses pieds en cm) devant une de ses fenêtres au volet ouvert : à moins
 * de `ROOF.window.front` cm de la face du mur, dans la largeur de la fenêtre (à `ROOF.window.side` près). La pièce est celle qui touche
 * ce mur à la fenêtre.
 */
export function windowRoom(b: Building, fx: number, fy: number): Rect | undefined {
  const { front, side } = ROOF.window;
  const r = b.room;
  const w = ROOF.wall;
  for (const win of b.windows) {
    if (!win.open) continue;
    const [s0, s1] = win.span;
    const mid = (s0 + s1) / 2;
    const along = win.side === 'north' || win.side === 'south' ? fx : fy;
    if (along < s0 - side || along > s1 + side) continue;
    const ok =
      win.side === 'south' ? fy > r.y + r.d + w && fy < r.y + r.d + w + front
      : win.side === 'north' ? fy < r.y - w && fy > r.y - w - front
      : win.side === 'east' ? fx > r.x + r.w + w && fx < r.x + r.w + w + front
      : fx < r.x - w && fx > r.x - w - front;
    if (!ok) continue;
    // la pièce de la fenêtre : de celles qui la contiennent dans leur largeur, la plus proche de ce mur (les pièces d'une maison ne
    // s'arrêtent pas toutes au même endroit : la salle va jusqu'au seuil)
    const ns = win.side === 'north' || win.side === 'south';
    const room = b.rooms
      .filter((q) => (ns ? mid >= q.x && mid <= q.x + q.w : mid >= q.y && mid <= q.y + q.d))
      .sort((p, q) => edge(q, win.side) - edge(p, win.side))[0];
    if (room) return room;
  }
  return undefined;
}

/** Combien une pièce va loin vers un mur (plus grand : plus près de lui). */
function edge(q: Rect, side: Window['side']): number {
  return side === 'south' ? q.y + q.d : side === 'north' ? -q.y : side === 'east' ? q.x + q.w : -q.x;
}

/** Ce que montrent les toits des pièces posées, Xéros dehors, ses pieds en (fx, fy) cm. */
export function roofView(pieces: readonly BuildPiece[], buildings: readonly Building[], fx: number, fy: number): RoofView {
  const faded = new Set<number>();
  for (const p of pieces) {
    if (enclosed(p, buildings) || !overHead(p, fx, fy, 0)) continue;
    for (const q of withAbove(pieces, p.id)) faded.add(q.id);
  }
  for (const b of buildings) {
    const room = windowRoom(b, fx, fy);
    if (room) return { faded, reveal: { room, building: b } };
  }
  return { faded };
}

/** Une pièce de toit (`roof` de props.json). */
const isRoof = (p: BuildPiece) => 'prop' in p.piece && !!props[p.piece.prop]?.roof;

/**
 * Les pièces qui portent une lueur (`light` de props.json) et les toits qui les couvrent : les pièces de toit dont l'emprise recoupe la
 * leur et qui passent au-dessus d'elles (leur base au-dessus du haut de la pièce). Une lueur sans toit au-dessus n'y est pas.
 */
export function lightCovers(pieces: readonly BuildPiece[]): Map<number, number[]> {
  const roofs = pieces.filter(isRoof);
  const out = new Map<number, number[]>();
  for (const p of pieces) {
    if (!('prop' in p.piece) || !props[p.piece.prop]?.light) continue;
    const b = boxOf(p);
    const over = roofs.filter((r) => {
      const rb = boxOf(r);
      return cross(rb, b) && rb.z >= b.z + b.h;
    });
    if (over.length) out.set(p.id, over.map((r) => r.id));
  }
  return out;
}

/**
 * La part visible d'une lueur sous ses toits (0 à 1), d'après l'opacité de chacun (1 : opaque, `ROOF.alpha` : effacé) : le plus opaque
 * l'emporte ; effacé, la lueur se voit en entier.
 */
export function lightShown(opacities: readonly number[]): number {
  if (!opacities.length) return 1;
  const most = Math.max(...opacities);
  return Math.min(1, Math.max(0, (1 - most) / (1 - ROOF.alpha)));
}
