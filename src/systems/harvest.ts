import Phaser from 'phaser';
import { HARVEST, INTERACT, TILE } from '../config';
import type { Player } from '../entities/Player';
import { items } from '../content';
import { addItem, changeObject, dropItem, game } from '../state';
import type { GameMap, PlacedGround, PlacedProp } from '../world/GameMap';

/**
 * Ce qu'a donné un coup : rien à frapper, mauvais outil (`tool` = l'outil qu'il faut), ou un coup porté.
 * `given` : objets mis directement dans l'inventaire ; `overflow` : inventaire plein, ils sont tombés au sol.
 */
export type HitResult =
  | { kind: 'none' }
  | { kind: 'missing'; tool: string }
  | { kind: 'hit'; done: boolean; given: number; overflow: boolean };

/**
 * La récolte, pour tout ce qui porte un composant `harvest` dans props.json (arbre, rocher, baies, billot).
 * À chaque coup l'objet tremble ; au dernier, il joue sa chute s'il en a une, devient `becomes`
 * et lâche ses `drops` autour de lui. Les changements sont notés dans GameState.
 * Ne lit pas le clavier : la scène dit quand un coup part et avec quoi.
 */
export class HarvestSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
  ) {}

  /** Objet récoltable devant Xéros (avec ou sans outil), s'il est à portée. */
  target(player: Player): PlacedProp | undefined {
    const probe = player.probe(INTERACT.reach);
    let best: PlacedProp | undefined;
    let bestD = INTERACT.radius;
    for (const p of this.map.props) {
      if (!p.def.harvest) continue;
      const d = Phaser.Math.Distance.Between(probe.x, probe.y, p.baseX, p.baseY);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  /**
   * Un coup porté à `prop` avec l'objet `tool` en main (undefined = à mains nues).
   * Un objet qui se récolte à la main ignore les outils ; un objet qui demande un outil refuse les autres.
   */
  hit(prop: PlacedProp | undefined, tool: string | undefined): HitResult {
    const h = prop?.def.harvest;
    // l'objet a pu être récolté entre le début du geste et le coup
    if (!prop || !h || !this.map.props.includes(prop)) return { kind: 'none' };
    if (h.tool && h.tool !== tool) return { kind: 'missing', tool: h.tool };
    if (!h.tool && tool) return { kind: 'none' };
    prop.hits++;
    if (prop.hits < h.hits) {
      this.shake(prop);
      return { kind: 'hit', done: false, given: 0, overflow: false };
    }
    return { kind: 'hit', done: true, ...this.finish(prop) };
  }

  private shake(prop: PlacedProp): void {
    const img = prop.image;
    this.scene.tweens.killTweensOf(img);
    img.x = prop.x;
    this.scene.tweens.add({
      targets: img,
      x: prop.x + 1,
      duration: HARVEST.shakeMs / 4,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        img.x = prop.x;
      },
    });
  }

  /** Dernier coup : chute éventuelle, remplacement, objets lâchés. */
  private finish(prop: PlacedProp): { given: number; overflow: boolean } {
    const h = prop.def.harvest!;
    const [dx, dy] = h.at ?? [0, 0];
    const x = prop.x + dx;
    const y = prop.y + dy;
    const { baseX, baseY } = prop;
    this.map.removeProp(prop);
    const next = h.becomes ? this.map.placeProp({ id: prop.id, type: h.becomes, x, y }) : undefined;
    changeObject(game, this.map.def.id, prop.id, h.becomes ? { type: h.becomes, x, y } : { x, y });

    // les objets lâchés entrent dans GameState tout de suite : quitter la carte pendant la chute ne les perd pas
    const dropped: PlacedGround[] = [];
    let given = 0;
    let overflow = false;
    for (const d of h.drops) {
      const n = Phaser.Math.Between(d.min, d.max);
      for (let i = 0; i < n; i++) {
        if (d.give) {
          if (addItem(game, d.item, items[d.item])) {
            given++;
            continue;
          }
          overflow = true;
        }
        const [gx, gy] = this.freeSpot(baseX, baseY);
        dropped.push(this.map.placeGround(dropItem(game, this.map.def.id, d.item, gx, gy)));
      }
    }
    for (const g of dropped) g.image.setVisible(false);
    const scatter = () => {
      for (const g of dropped) this.pop(g, baseX, baseY);
    };
    if (!h.fall) {
      scatter();
      return { given, overflow };
    }
    // la chute se joue à la place de l'objet ; le remplaçant (la souche) n'apparaît qu'à la fin
    next?.image.setVisible(false);
    const fall = this.scene.add
      .sprite(prop.x + h.fall.x, prop.y + h.fall.y, h.fall.image)
      .setOrigin(0, 1)
      .setDepth(prop.y);
    fall.play(`${h.fall.image}-${h.fall.anim}`);
    fall.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      next?.image.setVisible(true);
      fall.destroy();
      scatter();
    });
    return { given, overflow };
  }

  /** Fait sauter un objet lâché depuis (bx, by) jusqu'à sa place. */
  private pop(g: PlacedGround, bx: number, by: number): void {
    const { x, y } = g.item;
    // ramassé avant d'avoir été montré : rien à faire
    if (!this.map.ground.includes(g)) return;
    g.image.setPosition(bx, by).setVisible(true);
    this.scene.tweens.add({ targets: g.image, x, duration: HARVEST.dropMs });
    // petit saut : monte puis retombe à sa place
    this.scene.tweens.add({ targets: g.image, y, duration: HARVEST.dropMs, ease: (t: number) => t - Math.sin(t * Math.PI) * 1.2 });
  }

  /** Un point autour de (bx, by) : dans la carte, hors des cases bloquantes et des collisions, à l'écart des autres objets au sol. */
  private freeSpot(bx: number, by: number): [number, number] {
    const { width, height, floor, obstacles, ground } = this.map;
    const zones = obstacles.getChildren() as Phaser.GameObjects.Zone[];
    const free = (x: number, y: number) =>
      x >= 8 &&
      y >= 8 &&
      x <= width - 8 &&
      y <= height - 4 &&
      !floor.getTileAt(Math.floor(x / TILE), Math.floor(y / TILE))?.collides &&
      !zones.some((z) => Math.abs(x - z.x) < z.width / 2 + 3 && Math.abs(y - z.y) < z.height / 2 + 3) &&
      ground.every((g) => Phaser.Math.Distance.Between(x, y, g.item.x, g.item.y) >= HARVEST.dropSpacing);
    const [r0, r1] = HARVEST.dropRadius;
    for (let tries = 0; tries < 40; tries++) {
      const a = Math.random() * Math.PI * 2;
      // de plus en plus loin si la place manque
      const r = r0 + Math.random() * (r1 - r0) + tries / 2;
      const x = Math.round(bx + Math.cos(a) * r);
      const y = Math.round(by + Math.sin(a) * r * 0.7);
      if (free(x, y)) return [x, y];
    }
    return [Math.round(bx), Math.round(by) + r0];
  }
}
