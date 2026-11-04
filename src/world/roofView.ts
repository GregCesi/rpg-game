// Ce qu'on voit des toits des pièces posées, dehors (retouche de Grégoire, CONCEPTION « La maison de Xéros »), sans Phaser (testé par
// tools/test-roofs.ts) :
// - le toit d'un bâtiment où l'on entre (une maison, une cabane : il a un intérieur) ne s'efface jamais dehors : on n'est « dedans »
//   que dans son intérieur, une carte à part ;
// - le toit d'un abri ouvert (sans intérieur) s'efface quand Xéros est dessous, ses pieds sous son emprise (sans marge : il ne
//   s'efface plus quand Xéros approche), avec tout ce qui repose dessus ;
// - devant une fenêtre au volet ouvert, dehors, on voit l'intérieur de la pièce de cette fenêtre (chantier « maison-2 », Grégoire) :
//   elle seule devient transparente (ROOF.alpha, avec le fondu des toits) : le toit au-dessus d'elle (les pans, dans `windowHole`),
//   ce qui passe en hauteur et son mur sud ; ce qui sort au-dessus du toit (le conduit et sa souche) et les pignons restent opaques
//   (`windowFade`) ;
// - ce qui est caché ne se voit pas, lumière comprise (chantier « correctifs ») : la lueur d'un feu posé sous un toit (l'âtre) suit
//   l'opacité de ce toit (`lightCovers`) : cachée sous le toit opaque, revenue quand il s'efface ou s'ouvre au-dessus de sa pièce.

import { INTERIOR, ROOF } from '../config';
import { CM_PER_PX } from '../content/gabarit';
import { props } from '../content';
import { boxOf, overHead, withAbove, type BuildPiece } from './build';
import type { Building, Rect, Window } from './interior';

export interface RoofView {
  /** Les pièces qui s'effacent (l'abri ouvert sous lequel est Xéros ; le bâtiment devant la fenêtre ouverte duquel il est). */
  faded: Set<number>;
  /** La pièce dont on voit l'intérieur par sa fenêtre ouverte (cm), son bâtiment, et les pans de toit transparents au-dessus d'elle seule. */
  reveal?: { room: Rect; building: Building; roofs: number[] };
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

/**
 * Les pans du même toit que les pans effacés : de proche en proche, les pièces de toit dont l'emprise touche celle d'un pan déjà pris
 * (à 1 cm près), hors des bâtiments où l'on entre.
 */
function roofOf(pieces: readonly BuildPiece[], faded: ReadonlySet<number>): number[] {
  const roofs = pieces.filter(isRoof);
  const out = new Set(roofs.filter((p) => faded.has(p.id)).map((p) => p.id));
  const todo = [...out];
  while (todo.length) {
    const id = todo.pop();
    const a = boxOf(roofs.find((p) => p.id === id)!);
    for (const q of roofs) {
      if (out.has(q.id)) continue;
      const b = boxOf(q);
      if (a.x <= b.x + b.w + 1 && b.x <= a.x + a.w + 1 && a.y <= b.y + b.d + 1 && b.y <= a.y + a.d + 1) (out.add(q.id), todo.push(q.id));
    }
  }
  return [...out];
}

/** Ce que montrent les toits des pièces posées, Xéros dehors, ses pieds en (fx, fy) cm. */
export function roofView(pieces: readonly BuildPiece[], buildings: readonly Building[], fx: number, fy: number): RoofView {
  const faded = new Set<number>();
  for (const p of pieces) {
    if (enclosed(p, buildings) || !overHead(p, fx, fy, 0)) continue;
    for (const q of withAbove(pieces, p.id)) faded.add(q.id);
  }
  // tout le toit de l'abri, pas le seul pan au-dessus de sa tête (chantier « forge ») : sous le pan nord d'un toit à deux pans, le pan
  // sud, plus près de l'œil, cacherait Xéros et ce qu'il regarde ; les pans qui se touchent font un même toit
  for (const id of roofOf(pieces, faded)) for (const q of withAbove(pieces, id)) faded.add(q.id);
  for (const b of buildings) {
    const room = windowRoom(b, fx, fy);
    if (!room) continue;
    const fade = windowFade(pieces, b, room);
    for (const id of fade.whole) faded.add(id);
    return { faded, reveal: { room, building: b, roofs: fade.roofs } };
  }
  return { faded };
}

/** La hauteur des murs au-dessus d'une pièce qu'on voit à l'écran par sa fenêtre (cm) : la sablière et ce qui pend dessous. */
export const WALLS_SEEN = 300;

/**
 * La part de l'écran où l'on voit une pièce par sa fenêtre ouverte (px) : sa largeur, de ses murs au-dessus d'elle (`WALLS_SEEN`)
 * jusqu'à son mur sud et l'avant-toit devant lui. Les pans de toit, qui couvrent toute la maison, n'y deviennent transparents que là.
 */
export function windowHole(room: Rect): { x: number; y: number; w: number; h: number } {
  const S = CM_PER_PX;
  return { x: room.x / S, y: (room.y - WALLS_SEEN) / S, w: room.w / S, h: (room.d + WALLS_SEEN + ROOF.eaves) / S };
}

/**
 * Ce qui devient transparent devant une fenêtre ouverte (Grégoire, chantier « maison-2 » : la seule pièce vue par la fenêtre, pas
 * toute la maison) : `roofs`, les pans du toit du bâtiment qui la couvrent (transparents dans `windowHole` seulement, le reste du pan
 * reste opaque : systems/roofs.ts) ; `whole`, les pièces qui recoupent la pièce, au-dessus de la tête (sablières, entraits, faîtage)
 * ou dans son mur sud (qui cacherait son sol vu de trois quarts). Restent opaques : ce qui sort au-dessus du toit (le conduit et sa
 * souche) et les pignons (les murs de bout au-dessus de la sablière).
 */
export function windowFade(pieces: readonly BuildPiece[], b: Building, room: Rect): { whole: number[]; roofs: number[] } {
  const r = room;
  const w = ROOF.wall;
  // ses murs, à l'épaisseur que la vue de dedans leur donne (INTERIOR.reach)
  const t = INTERIOR.reach;
  const near = { x: r.x - w, y: r.y - w, w: r.w + 2 * w, d: r.d + w + t };
  const e = ROOF.eaves;
  const house = { x: b.room.x - e, y: b.room.y - e, w: b.room.w + 2 * e, d: b.room.d + 2 * e };
  const roofs = pieces.filter((p) => isRoof(p) && cross(boxOf(p), house) && cross(boxOf(p), near));
  const top = Math.max(0, ...roofs.map((p) => boxOf(p).z));
  const ridge = Math.max(0, ...roofs.map((p) => boxOf(p).z + boxOf(p).h));
  // ce qui sort au-dessus du toit (la souche), et toute la colonne au-dessus de la tête qui la porte (le conduit)
  const stacks = pieces.filter((p) => !isRoof(p) && boxOf(p).z + boxOf(p).h > ridge).map(boxOf);
  const whole: number[] = [];
  for (const p of pieces) {
    const box = boxOf(p);
    if (isRoof(p) || !cross(box, near)) continue;
    if (box.z >= INTERIOR.headroom && stacks.some((q) => cross(q, box))) continue;
    // les pignons : au-dessus de la sablière, sur un mur de bout du bâtiment
    if (box.z >= top && box.z > INTERIOR.headroom && (box.x + box.w <= b.room.x + w || box.x >= b.room.x + b.room.w - w)) continue;
    if (box.z >= INTERIOR.headroom) whole.push(p.id);
    // le mur sud de la pièce (le solin et le seuil, au ras du sol, restent : ils ne cachent rien)
    else if (box.y + box.d > r.y + r.d - w && box.y < r.y + r.d + t && box.z + box.h > INTERIOR.floor) whole.push(p.id);
  }
  return { whole, roofs: roofs.map((p) => p.id) };
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
