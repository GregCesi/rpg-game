import Phaser from 'phaser';
import { DEPTH, FEET } from '../config';
import { CM_PER_PX } from '../content/gabarit';
import type { MapData } from '../content/types';
import type { Actor } from '../entities/Actor';
import { hasRelief, worldHeight } from '../world/terrainView';
import { drawnStep } from './simSpeed';

/**
 * Le soulèvement (chantier « relief », projection A) : tout ce qui est posé à une hauteur h s'affiche h / 5 cm plus haut, sans que rien
 * ne bouge dans le monde. Une seule règle, appliquée après chaque image (`postupdate`) à tout ce qui est affiché : l'origine d'affichage
 * monte de la hauteur du sol sous l'objet ; `x/y`, la profondeur et les corps restent ceux du monde (pour un personnage, le corps des
 * pieds est recalé d'autant). Le point d'ancrage : le milieu de l'objet, à la profondeur (le y de ses pieds) ; pour ce qui est au sol
 * (profondeur négative) ou au-dessus de tout (lueurs, invites), son bas. Ne sont pas soulevés : le terrain (déjà en projection), ce
 * qui porte sa hauteur (un objet en vol, le repère du lancer : `noLift`), les voiles (pénombre, jour), les calques de tuiles.
 * Un objet de la bande d'une voisine (`liftMap` : sa carte et son décalage) prend la hauteur de sa carte.
 */
export class LiftPass {
  private readonly applied = new WeakMap<Phaser.GameObjects.GameObject, { x: number; y: number; lift: number; base: number; off?: number }>();
  private readonly onPost = () => this.update();
  readonly active: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly def: MapData,
    neighbors: boolean,
  ) {
    this.active = hasRelief(def) || neighbors;
    if (!this.active) return;
    scene.events.on('postupdate', this.onPost);
    scene.events.once('shutdown', () => scene.events.off('postupdate', this.onPost));
  }

  /** La hauteur (px d'écran) du sol au point (x, y) de la carte. */
  liftAt(x: number, y: number): number {
    return Math.round(worldHeight(this.def, x, y) / CM_PER_PX);
  }

  /**
   * Après chaque pas de jeu. Au pas qui sera dessiné, tout ce qui est affiché ; aux autres (une image lente fait plusieurs pas,
   * world/timeStep.ts), seuls les corps qui bougent (le corps des pieds d'un personnage est recalé : la physique en dépend) ; une image
   * fixe n'a besoin de son soulèvement qu'au moment d'être dessinée.
   */
  update(): void {
    if (drawnStep()) for (const obj of this.scene.children.list) this.lift(obj);
    else for (const body of this.scene.physics.world.bodies.entries) if (body.gameObject) this.lift(body.gameObject);
  }

  private lift(obj: Phaser.GameObjects.GameObject): void {
    if (obj instanceof Phaser.Tilemaps.TilemapLayer || obj instanceof Phaser.GameObjects.Zone || obj.getData?.('noLift')) return;
    const o = obj as Phaser.GameObjects.Image;
    if (typeof o.displayOriginY !== 'number' || typeof o.depth !== 'number' || typeof o.setDisplayOrigin !== 'function') return;
    const d = o.depth;
    if (d >= DEPTH.ambient && d !== DEPTH.light && d < DEPTH.prompt) return;
    let st = this.applied.get(obj);
    // l'origine sans le soulèvement ; si elle a été changée par ailleurs (une autre image, setOrigin), elle devient la base
    const base = st && o.displayOriginY === st.base + st.lift ? st.base : o.displayOriginY;
    const w = o.displayWidth ?? 0;
    const h = o.height || 1;
    const ax = o.x + (0.5 - (o.originX ?? 0.5)) * w;
    const body = (obj as Actor).body as Phaser.Physics.Arcade.Body | undefined;
    const dynamic = body instanceof Phaser.Physics.Arcade.Body ? body : undefined;
    // un personnage se tient sur le point de ses pieds (`FEET.point` au-dessus du bas, celui que teste systems/footing.ts) : au bord
    // d'une marche, son image monte quand ce point la franchit, pas quand le bas de l'image la touche
    const ay = (d >= 0 && d < DEPTH.ambient ? d : o.y + (h - base) * (o.scaleY ?? 1)) - (dynamic ? FEET.point : 0);
    if (st && st.x === ax && st.y === ay && o.displayOriginY === st.base + st.lift) return;
    const band = obj.getData?.('liftMap') as { def: MapData; dx: number; dy: number } | undefined;
    const lift = band ? Math.round(worldHeight(band.def, ax - band.dx, ay - band.dy) / CM_PER_PX) : this.liftAt(ax, ay);
    const off = dynamic ? (st?.off ?? dynamic.offset.y - (st?.lift ?? 0)) : undefined;
    const next = { x: ax, y: ay, lift, base, off };
    st = next;
    this.applied.set(obj, st);
    o.setDisplayOrigin(o.displayOriginX, base + lift);
    if (dynamic && off !== undefined) dynamic.setOffset(dynamic.offset.x, off + lift);
  }
}
