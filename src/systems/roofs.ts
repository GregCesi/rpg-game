import Phaser from 'phaser';
import { INTERIOR, ROOF, XEROS_HEIGHT } from '../config';
import type { Player } from '../entities/Player';
import { CM_PER_PX } from '../content/gabarit';
import { boxOf } from '../world/build';
import type { GameMap, PlacedBuild, PlacedProp } from '../world/GameMap';
import { props } from '../content';
import type { Building, Rect } from '../world/interior';
import { roofView } from '../world/roofView';

/** Hauteur de Xéros à l'écran au-dessus de ses pieds (px) : sa tête (`XEROS_HEIGHT`). */
const HEAD = XEROS_HEIGHT / CM_PER_PX;

/**
 * Les toits (pièces `roof` de props.json : chevrons, toit de planches). Un toit se dessine par-dessus Xéros quand il est dessous
 * (l'ordre d'affichage suffit : le bas de son image est au sol, au sud de l'avant-toit). Quand Xéros est dessous ou
 * caché derrière, le toit devient en partie transparent (ROOF.alpha), avec toutes les pièces de toit qu'il touche ;
 * dès qu'il en sort, il redevient opaque. Son ombre portée (`shadow`, posée par GameMap) suit son opacité. Le fondu prend ROOF.fadeMs.
 */
export class Roofs {
  /** Le trou du toit au-dessus de la pièce qu'on voit par sa fenêtre ouverte (un masque inversé), et la pièce qu'il découvre. */
  private hole?: { g: Phaser.GameObjects.Graphics; mask: Phaser.Display.Masks.GeometryMask; key: string };
  /** Les pièces posées que le trou masque en ce moment. */
  private masked: PlacedBuild[] = [];

  constructor(
    private readonly map: GameMap,
    private readonly scene?: Phaser.Scene,
  ) {}

  /**
   * À appeler à chaque image, dans tous les modes (le toit suit Xéros même pendant un geste ou un dialogue). `buildings` : les bâtiments
   * où l'on entre de la carte du dehors (leur toit ne s'efface pas ; leurs fenêtres ouvertes montrent leur pièce).
   */
  update(player: Player, delta: number, builds = true, buildings: readonly Building[] = []): void {
    this.builds(player, delta, builds, buildings);
    const roofs = this.map.props.filter((p) => p.def.roof);
    if (!roofs.length) return;
    const { x, y } = player.actor;
    // les pièces de toit qui cachent Xéros : ses pieds dans la largeur de l'image, au nord de son bas (le sol au sud de
    // l'avant-toit), et assez bas pour que le toit cache au moins sa tête
    const over = roofs.filter((p) => x >= p.x && x <= p.x + p.image.width && y < p.y && y > p.top - HEAD / 2);
    // et toutes celles qu'elles touchent : le toit entraîne ses chevrons
    const faded = new Set(over);
    for (const p of roofs) if (over.some((q) => touches(p, q))) faded.add(p);
    const step = ((1 - ROOF.alpha) * delta) / ROOF.fadeMs;
    for (const p of roofs) {
      const target = faded.has(p) ? ROOF.alpha : 1;
      const a = p.image.alpha;
      p.image.setAlpha(a < target ? Math.min(target, a + step) : Math.max(target, a - step));
      // son ombre portée s'efface avec lui
      p.shadow?.setAlpha(p.image.alpha);
    }
  }

  /**
   * Les pièces posées en mode construction (src/world/roofView.ts) : dehors, le toit d'un bâtiment où l'on entre ne s'efface pas ; celui
   * d'un abri ouvert s'efface quand Xéros est dessous, avec tout ce qui repose dessus ; devant une fenêtre au volet ouvert, le toit de
   * la maison s'ouvre au-dessus de cette pièce seulement. Même fondu que les toits. `on` faux (le mode construction, un intérieur) : rien
   * ne s'efface.
   */
  private builds(player: Player, delta: number, on: boolean, buildings: readonly Building[]): void {
    if (!this.map.builds.length) return;
    const pieces = this.map.builds.map((b) => b.piece);
    const fx = player.actor.x * CM_PER_PX;
    const fy = player.actor.y * CM_PER_PX;
    const view = on ? roofView(pieces, buildings, fx, fy) : { faded: new Set<number>() };
    const faded = view.faded;
    this.reveal(view.reveal);
    const step = ((1 - ROOF.alpha) * delta) / ROOF.fadeMs;
    for (const b of this.map.builds) {
      const target = faded.has(b.piece.id) ? ROOF.alpha : 1;
      const a = b.image.alpha;
      if (a !== target) b.image.setAlpha(a < target ? Math.min(target, a + step) : Math.max(target, a - step));
    }
  }

  /** La pièce qu'on voit par sa fenêtre ouverte (ou plus rien) : le toit de son bâtiment s'ouvre au-dessus d'elle, le reste le garde. */
  private reveal(r: { room: Rect; building: Building } | undefined): void {
    const key = r ? `${r.room.x},${r.room.y},${r.room.w},${r.room.d}` : '';
    if ((this.hole?.key ?? '') === key || !this.scene) return;
    const roofs = this.map.builds.filter((b) => 'prop' in b.piece.piece && props[b.piece.piece.prop]?.roof);
    for (const b of this.masked) b.image.clearMask();
    this.masked = [];
    if (!r) {
      if (this.hole) this.hole.key = '';
      return;
    }
    this.hole ??= (() => {
      const g = this.scene!.make.graphics({}, false);
      const mask = g.createGeometryMask().setInvertAlpha(true);
      return { g, mask, key: '' };
    })();
    const h = holeOf(r.room);
    this.hole.g.clear().fillStyle(0xffffff).fillRect(h.x, h.y, h.w, h.h);
    this.hole.key = key;
    const room = r.building.room;
    const inside = (b: (typeof roofs)[number]) => {
      const box = boxOf(b.piece);
      return box.x < room.x + room.w + ROOF.wall && box.x + box.w > room.x - ROOF.wall && box.y < room.y + room.d + ROOF.wall && box.y + box.d > room.y - ROOF.wall;
    };
    // le toit du bâtiment, et le mur sud de la pièce (vu de trois quarts, il en cacherait le sol) : coupé dans le trou, comme dans la vue
    // intérieure ; sa base reste, sous le bord du trou
    const q = r.room;
    const south = this.map.builds.filter((b) => {
      const box = boxOf(b.piece);
      return box.z < INTERIOR.headroom && box.z + box.h > INTERIOR.floor && box.y >= q.y + q.d - ROOF.wall && box.y < q.y + q.d + ROOF.wall && box.x < q.x + q.w && box.x + box.w > q.x;
    });
    // et ce qui passe au-dessus de la pièce (faîtière, entraits, pignons), comme la vue intérieure le cache
    const above = this.map.builds.filter((b) => {
      const box = boxOf(b.piece);
      return box.z >= INTERIOR.headroom && box.x < q.x + q.w + ROOF.wall && box.x + box.w > q.x - ROOF.wall && box.y < q.y + q.d + ROOF.wall && box.y + box.d > q.y - ROOF.wall;
    });
    this.masked = [...new Set([...roofs.filter(inside), ...south, ...above])];
    for (const b of this.masked) b.image.setMask(this.hole.mask);
  }

  /** La pièce découverte en ce moment (pour les tests de scénario), ou rien. */
  get revealed(): string | undefined {
    return this.hole?.key || undefined;
  }
}

/** La pièce découverte par sa fenêtre ouverte : un trou dans le toit de son bâtiment, du haut de ses murs au sol (px). */
function holeOf(room: Rect): { x: number; y: number; w: number; h: number } {
  return { x: room.x / CM_PER_PX, y: (room.y - ROOF.reveal) / CM_PER_PX, w: room.w / CM_PER_PX, h: (room.d + ROOF.reveal) / CM_PER_PX };
}

/** Les images des deux pièces se recouvrent. */
function touches(a: PlacedProp, b: PlacedProp): boolean {
  return a.x < b.x + b.image.width && b.x < a.x + a.image.width && a.top < b.y && b.top < a.y;
}
