import Phaser from 'phaser';
import { ROOF, XEROS_HEIGHT } from '../config';
import type { Player } from '../entities/Player';
import { CM_PER_PX } from '../content/gabarit';
import { setGlowCover, type GameMap, type PlacedBuild, type PlacedProp } from '../world/GameMap';
import type { Building } from '../world/interior';
import { lightCovers, lightShown, roofView } from '../world/roofView';
import { drawInsides, type BuildingInsides } from '../world/buildingFloor';

/** Hauteur de Xéros à l'écran au-dessus de ses pieds (px) : sa tête (`XEROS_HEIGHT`). */
const HEAD = XEROS_HEIGHT / CM_PER_PX;

/**
 * Les toits (pièces `roof` de props.json : chevrons, toit de planches). Un toit se dessine par-dessus Xéros quand il est dessous
 * (l'ordre d'affichage suffit : le bas de son image est au sol, au sud de l'avant-toit). Quand Xéros est dessous ou
 * caché derrière, le toit devient en partie transparent (ROOF.alpha), avec toutes les pièces de toit qu'il touche ;
 * dès qu'il en sort, il redevient opaque. Son ombre portée (`shadow`, posée par GameMap) suit son opacité. Le fondu prend ROOF.fadeMs.
 */
export class Roofs {
  /** La pièce qu'on voit en ce moment par sa fenêtre ouverte (« x,y,w,d » en cm), ou rien. */
  private seen = '';
  /** Les lueurs des pièces posées et les toits qui les couvrent (`lightCovers`), recalculés quand les pièces changent. */
  private covers?: { version: number; map: Map<number, number[]> };
  /** La terre battue et la pénombre des bâtiments vus de dehors (world/buildingFloor.ts), et la version des pièces posées qui les a faites. */
  private insides?: { version: number; objects: BuildingInsides };

  constructor(
    private readonly map: GameMap,
    private readonly scene?: Phaser.Scene,
  ) {}

  /**
   * À appeler à chaque image, dans tous les modes (le toit suit Xéros même pendant un geste ou un dialogue). `buildings` : les bâtiments
   * où l'on entre de la carte du dehors (leur toit ne s'efface pas ; leurs fenêtres ouvertes montrent leur pièce).
   */
  update(player: Player, delta: number, builds = true, buildings: readonly Building[] = []): void {
    this.inside(buildings);
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
    // la lueur d'un feu sous un toit posé depuis Tiled : cachée tant que le toit est opaque
    for (const p of this.map.props) {
      if (!p.glow) continue;
      const over = roofs.filter((r) => p.glow!.x >= r.x && p.glow!.x <= r.x + r.image.width && p.glow!.y >= r.top && p.glow!.y <= r.y);
      setGlowCover(p.glow, lightShown(over.map((r) => r.image.alpha)));
    }
  }

  /**
   * Les pièces posées en mode construction (src/world/roofView.ts) : dehors, le toit d'un bâtiment où l'on entre ne s'efface pas ; celui
   * d'un abri ouvert s'efface quand Xéros est dessous, avec tout ce qui repose dessus ; devant une fenêtre au volet ouvert, tout le
   * bâtiment devient transparent (son toit, ce qui passe en hauteur, ses murs côté sud : `windowFade`). Même fondu que les toits. `on`
   * faux (le mode construction, un intérieur) : rien ne s'efface.
   */
  private builds(player: Player, delta: number, on: boolean, buildings: readonly Building[]): void {
    if (!this.map.builds.length) return;
    const pieces = this.map.builds.map((b) => b.piece);
    const fx = player.actor.x * CM_PER_PX;
    const fy = player.actor.y * CM_PER_PX;
    const view = on ? roofView(pieces, buildings, fx, fy) : { faded: new Set<number>() };
    const faded = view.faded;
    const r = view.reveal?.room;
    this.seen = r ? `${r.x},${r.y},${r.w},${r.d}` : '';
    const step = ((1 - ROOF.alpha) * delta) / ROOF.fadeMs;
    for (const b of this.map.builds) {
      const target = faded.has(b.piece.id) ? ROOF.alpha : 1;
      const a = b.image.alpha;
      if (a !== target) b.image.setAlpha(a < target ? Math.min(target, a + step) : Math.max(target, a - step));
    }
    this.lights();
  }

  /**
   * Les lueurs des pièces posées sous un toit (l'âtre de la maison) : ce qui est caché ne se voit pas, lumière comprise. Cachée sous le
   * toit opaque ; revenue quand il s'efface, devant une fenêtre ouverte comme sous un abri.
   */
  private lights(): void {
    if (this.covers?.version !== this.map.buildsVersion) this.covers = { version: this.map.buildsVersion, map: lightCovers(this.map.builds.map((b) => b.piece)) };
    const byId = new Map(this.map.builds.map((b) => [b.piece.id, b]));
    for (const b of this.map.builds) {
      const glows = (b.parts ?? []).filter((p) => p.light).map((p) => p.obj as Phaser.GameObjects.Image);
      if (!glows.length) continue;
      const roofs = (this.covers.map.get(b.piece.id) ?? []).map((id) => byId.get(id)).filter((r): r is PlacedBuild => !!r);
      const shown = lightShown(roofs.map((r) => r.image.alpha));
      for (const g of glows) setGlowCover(g, shown);
    }
  }

  /** La terre battue et la pénombre des bâtiments, refaites quand une pièce est posée ou retirée. */
  private inside(buildings: readonly Building[]): void {
    if (!this.scene || this.insides?.version === this.map.buildsVersion) return;
    for (const o of this.insides?.objects ?? []) o.destroy();
    this.insides = { version: this.map.buildsVersion, objects: drawInsides(this.scene, buildings) };
  }

  /** La pièce qu'on voit en ce moment par sa fenêtre ouverte (pour les tests de scénario), ou rien. */
  get revealed(): string | undefined {
    return this.seen || undefined;
  }
}

/** Les images des deux pièces se recouvrent. */
function touches(a: PlacedProp, b: PlacedProp): boolean {
  return a.x < b.x + b.image.width && b.x < a.x + a.image.width && a.top < b.y && b.top < a.y;
}
