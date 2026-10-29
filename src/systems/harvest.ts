import Phaser from 'phaser';
import { DEPTH, HARVEST, INTERACT, TILE } from '../config';
import type { Player } from '../entities/Player';
import { items, props } from '../content';
import type { Drop, Facing } from '../content/types';
import { addItem, changeObject, changeSpawned, dropItem, game, setSpawnedHits, spawnObject } from '../state';
import { notchCut, promptTop } from '../world/GameMap';
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
  /** Invite « Espace » sur ce que l'outil en main peut frapper. */
  private readonly prompt: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
  ) {
    this.prompt = scene.add.image(0, 0, 'ui-key-space').setOrigin(0.5, 1).setDepth(DEPTH.prompt).setVisible(false);
  }

  /**
   * À appeler à chaque image : montre l'invite « Espace » sur la cible devant Xéros (sur l'encoche visée s'il y en a une)
   * quand l'objet en main est l'outil qu'elle demande. `active` = false pendant un geste, un dialogue ou un changement de carte.
   */
  updatePrompt(time: number, player: Player, held: string | undefined, active: boolean): void {
    const t = active && held ? this.target(player) : undefined;
    const ok = !!t && t.image.visible && t.def.harvest?.tool === held;
    this.prompt.setVisible(ok);
    if (!ok) return;
    const bob = Math.round((Math.sin(time / 220) + 1) / 2) * 2;
    this.prompt.setPosition(t.aimX, promptTop(t) + 4 - bob);
  }

  /** Largeur de l'image d'un objet de props.json. */
  private imageWidth(type: string): number {
    return this.scene.textures.get(props[type].image).getSourceImage().width;
  }

  /** Objet récoltable devant Xéros (avec ou sans outil), s'il est à portée : son point visé (l'encoche) ou sa base. */
  target(player: Player): PlacedProp | undefined {
    const probe = player.probe(INTERACT.reach);
    let best: PlacedProp | undefined;
    let bestD = INTERACT.radius;
    for (const p of this.map.props) {
      // une encoche déjà coupée n'est plus une cible
      if (!p.def.harvest || notchCut(p)) continue;
      const d = Phaser.Math.Distance.Between(probe.x, probe.y, p.aimX, p.aimY);
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
   * `facing` : la direction de celui qui frappe ; l'objet tombe de l'autre côté.
   */
  hit(prop: PlacedProp | undefined, tool: string | undefined, facing: Facing): HitResult {
    const h = prop?.def.harvest;
    // l'objet a pu être récolté entre le début du geste et le coup
    if (!prop || !h || !this.map.props.includes(prop)) return { kind: 'none' };
    if (h.tool && h.tool !== tool) return { kind: 'missing', tool: h.tool };
    if (!h.tool && tool) return { kind: 'none' };
    if (h.notch) return this.notchHit(prop, facing);
    prop.hits++;
    if (h.impact) this.chips(prop, h.impact, facing);
    if (prop.hits < h.hits) {
      this.shake(prop);
      return { kind: 'hit', done: false, given: 0, overflow: false };
    }
    return { kind: 'hit', done: true, ...this.finish(prop, facing) };
  }

  /**
   * Un coup dans l'encoche d'une pièce de tronc couché : l'entaille se creuse (une image par profondeur, notée dans GameState).
   * Au dernier coup l'encoche est coupée : ses `drops` tombent, et chaque morceau de la chaîne séparé aux deux bouts
   * devient sa bille, à la même place. La pièce ne bouge pas : pas de tremblement, seule l'entaille change.
   */
  private notchHit(prop: PlacedProp, facing: Facing): HitResult {
    const h = prop.def.harvest!;
    if (notchCut(prop)) return { kind: 'none' };
    prop.hits++;
    if (prop.spawned) setSpawnedHits(game, this.map.def.id, prop.id, prop.hits);
    if (h.impact) this.chips(prop, h.impact, facing);
    if (prop.hits < h.hits) {
      this.map.refreshTrunk();
      return { kind: 'hit', done: false, given: 0, overflow: false };
    }
    const { given, overflow, dropped } = this.dropAll(h.drops, prop.aimX, prop.aimY);
    for (const g of dropped) this.pop(g, prop.aimX, prop.aimY);
    if (prop.chain) this.separate(prop.chain.group);
    this.map.refreshTrunk();
    return { kind: 'hit', done: true, given, overflow };
  }

  /** Chaque pièce de la chaîne dont l'encoche est coupée et qui est séparée à gauche devient sa bille, à la même place. */
  private separate(group: number): void {
    for (const p of this.map.props.filter((q) => q.chain?.group === group)) {
      const h = p.def.harvest;
      if (!h?.becomes || !notchCut(p) || !this.map.separatedLeft(p)) continue;
      const [ax, dy] = h.at ?? [0, 0];
      const w = this.imageWidth(h.becomes);
      // retournée, la pièce se lit de droite à gauche : le décalage se retourne dans son image
      const x = p.x + (p.flip ? p.image.width - ax - w : ax);
      const y = p.y + dy;
      this.map.removeProp(p);
      this.map.placeProp({ id: p.id, type: h.becomes, x, y }, { flip: p.flip, spawned: p.spawned, chain: p.chain });
      const change = { type: h.becomes, x, y, ...(p.flip ? { flip: true } : {}) };
      if (p.spawned) changeSpawned(game, this.map.def.id, p.id, change);
      else changeObject(game, this.map.def.id, p.id, change);
    }
  }

  /**
   * Ce que lâche un objet récolté, près de (bx, by) : dans l'inventaire si `give` (au sol si plein), sinon au sol.
   * Entre dans GameState tout de suite ; les objets au sol sont posés cachés, à montrer avec pop().
   */
  private dropAll(drops: Drop[], bx: number, by: number): { given: number; overflow: boolean; dropped: PlacedGround[] } {
    const dropped: PlacedGround[] = [];
    let given = 0;
    let overflow = false;
    for (const d of drops) {
      const n = Phaser.Math.Between(d.min, d.max);
      for (let i = 0; i < n; i++) {
        if (d.give) {
          if (addItem(game, d.item, items[d.item])) {
            given++;
            continue;
          }
          overflow = true;
        }
        const [gx, gy] = this.freeSpot(bx, by);
        const g = this.map.placeGround(dropItem(game, this.map.def.id, d.item, gx, gy));
        g.image.setVisible(false);
        dropped.push(g);
      }
    }
    return { given, overflow, dropped };
  }

  /**
   * Éclats de la matière frappée : ils jaillissent du côté de Xéros, vers lui et vers le haut, puis retombent.
   * Une variante au hasard (image de la planche `fx-<matière>`) pour chacun.
   */
  private chips(prop: PlacedProp, impact: string, facing: Facing): void {
    const c = HARVEST.chips;
    // côté où Xéros se tient : l'inverse de la direction où il regarde
    const [sx, sy] = { right: [-1, 0], left: [1, 0], up: [0, 1], down: [0, -1] }[facing];
    // sur une encoche (tronc couché), les éclats partent de l'encoche ; sinon du côté de Xéros, à hauteur de coup
    const x = prop.def.aim ? prop.aimX : prop.baseX + sx * 7;
    const y = prop.def.aim ? prop.aimY : prop.baseY - 6 + sy * 5;
    // éventail ouvert vers Xéros et vers le haut (angles de Phaser : 0 = droite, -90 = haut)
    const toward = sx !== 0 ? (sx > 0 ? -45 : -135) : -90;
    const texture = `fx-${impact}`;
    const emitter = this.scene.add
      .particles(x, y, texture, {
        frame: this.scene.textures.get(texture).getFrameNames(),
        angle: { min: toward - 40, max: toward + 40 },
        speed: { min: c.speed[0], max: c.speed[1] },
        gravityY: c.gravity,
        lifespan: c.lifespan,
        alpha: { start: 1, end: 0.6 },
        emitting: false,
      })
      .setDepth(prop.y + 1);
    emitter.explode(c.count);
    this.scene.time.delayedCall(c.lifespan + 50, () => emitter.destroy());
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
  private finish(prop: PlacedProp, facing: Facing): { given: number; overflow: boolean } {
    const h = prop.def.harvest!;
    const mapId = this.map.def.id;
    // Xéros à gauche (tourné vers la droite) : chute à droite ; à droite : à gauche ; d'en haut ou d'en bas : au hasard
    const fallLeft = !!h.fall && (facing === 'left' || (facing !== 'right' && Math.random() < 0.5));
    // ce qui le remplace et ce qui naît est retourné si la chute part à gauche, ou si l'objet l'était déjà
    const flip = prop.flip !== fallLeft;
    // abscisse (dans le repère de l'objet) d'une image de largeur w décalée de `off`, une fois retournée :
    // autour du pied pour une chute vers la gauche, autour de l'objet lui-même s'il était retourné
    const place = (off: number, w: number) =>
      fallLeft ? 2 * h.fall!.foot - (off + w - 1) : prop.flip ? prop.image.width - off - w : off;
    const [ax, dy] = h.at ?? [0, 0];
    const x = prop.x + (h.becomes ? place(ax, this.imageWidth(h.becomes)) : ax);
    const y = prop.y + dy;
    const { baseX, baseY } = prop;
    this.map.removeProp(prop);
    const next = h.becomes ? this.map.placeProp({ id: prop.id, type: h.becomes, x, y }, { flip, spawned: prop.spawned, chain: prop.chain }) : undefined;
    const change = h.becomes ? { type: h.becomes, x, y, ...(flip ? { flip } : {}) } : { x, y };
    if (prop.spawned) changeSpawned(game, mapId, prop.id, change);
    else changeObject(game, mapId, prop.id, change);
    // ce qui naît (l'arbre couché) : noté tout de suite, montré à la fin de la chute
    const group = game.nextSpawnId;
    const born = h.spawns.map((sp, index) => {
      const chain = { group, index, size: h.spawns.length };
      const o = spawnObject(game, mapId, sp.type, prop.x + place(sp.x, this.imageWidth(sp.type)), prop.y + sp.y, flip, chain);
      return this.map.placeProp(o, { flip, spawned: true, chain });
    });
    this.map.refreshTrunk();

    // les objets lâchés entrent dans GameState tout de suite : quitter la carte pendant la chute ne les perd pas
    const { given, overflow, dropped } = this.dropAll(h.drops, baseX, baseY);
    const scatter = () => {
      for (const g of dropped) this.pop(g, baseX, baseY);
    };
    if (!h.fall) {
      scatter();
      return { given, overflow };
    }
    // la chute se joue à la place de l'objet ; le remplaçant (la souche) et l'arbre couché n'apparaissent qu'à la fin
    const shown = [next, ...born].filter((p) => p !== undefined);
    for (const p of shown) p.image.setVisible(false);
    const fall = this.scene.add.sprite(0, 0, h.fall.image).setOrigin(0, 1).setFlipX(fallLeft).setDepth(prop.y);
    fall.setPosition(prop.x + place(h.fall.x, fall.width), prop.y + h.fall.y);
    fall.play(`${h.fall.image}-${h.fall.anim}`);
    fall.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      // une pièce a pu être récoltée pendant la chute : on ne montre que ce qui est encore posé
      for (const p of shown) if (this.map.props.includes(p)) p.image.setVisible(true);
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
