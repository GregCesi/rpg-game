import Phaser from 'phaser';
import { DEPTH, HARVEST, INTERACT, TILE } from '../config';
import type { Player } from '../entities/Player';
import { items, props } from '../content';
import type { Drop, Facing, Harvest } from '../content/types';

/** L'outil `tool` fait ce travail : c'est l'outil de la récolte, ou l'un de ses `also` (la hachette sur le rouleau posé). */
export function wields(h: Harvest, tool: string | undefined): boolean {
  return !!tool && (tool === h.tool || tool in h.also);
}

/** Prix d'un coup de `tool` en endurance (clé de `costs`) : celui de son `also`, sinon `effort` (absent : `cutTie` sur ce qui porte une corde, `chop`). */
export function effortOf(h: Harvest, tool: string, bears: boolean): NonNullable<Harvest['effort']> {
  return h.also[tool] ?? h.effort ?? (bears ? 'cutTie' : 'chop');
}

import { changeObject, changeSpawned, dropItem, game, replaceHeld, spawnObject, take, type Hand } from '../state';
import { promptTop } from '../world/GameMap';
import { WOOD_PIECE } from '../world/woodPiece';
import { woodSize } from '../world/woodShape';
import type { WoodPiece } from '../content/types';
import type { GameMap, PlacedGround, PlacedProp } from '../world/GameMap';

/**
 * Ce qu'a donné un coup : rien à frapper, mauvais outil (`tool` = l'outil qu'il faut), ou un coup porté.
 * `given` : objets mis directement dans les mains ; `overflow` : mains pas libres, ils sont tombés au sol ;
 * `cut` : l'objet porté qu'on vient de couper (le rouleau) et ce qui en reste (cm), s'il y en avait un ; `refused` : cet outil ne
 * convient pas, `message` dit pourquoi (`refuse` de harvest).
 */
export type HitResult =
  | { kind: 'none' }
  | { kind: 'missing'; tool: string }
  | { kind: 'refused'; message: string }
  | { kind: 'hit'; done: boolean; given: number; overflow: boolean; cut?: { prop: string; remaining: number } };

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
    const t = active && held ? this.target(player, held) : undefined;
    const ok = !!t && t.image.visible && !!t.def.harvest && wields(t.def.harvest, held);
    this.prompt.setVisible(ok);
    if (!ok) return;
    const bob = Math.round((Math.sin(time / 220) + 1) / 2) * 2;
    this.prompt.setPosition(t.aimX, promptTop(t) + 4 - bob);
  }

  /** Largeur de l'image d'un objet de props.json. */
  private imageWidth(type: string): number {
    return this.scene.textures.get(props[type].image).getSourceImage().width;
  }

  /**
   * Objet récoltable devant Xéros (avec ou sans outil), s'il est à portée : son point visé ou sa base. Quand deux objets sont à
   * portée, celui que l'outil `tool` en main récolte l'emporte.
   */
  target(player: Player, tool?: string): PlacedProp | undefined {
    const probe = player.probe(INTERACT.reach);
    let best: PlacedProp | undefined;
    let bestD = INTERACT.radius;
    let bestFits = false;
    for (const p of this.map.props) {
      if (!p.def.harvest) continue;
      const d = Phaser.Math.Distance.Between(probe.x, probe.y, p.aimX, p.aimY);
      if (d >= INTERACT.radius) continue;
      const fits = wields(p.def.harvest, tool);
      if ((fits && !bestFits) || (fits === bestFits && d < bestD)) {
        best = p;
        bestD = d;
        bestFits = fits;
      }
    }
    return best;
  }

  /**
   * Pourquoi `tool` ne peut pas frapper `prop` en ce moment, dit en français, ou undefined : l'outil que `refuse` de harvest écarte,
   * ou la branche qui manque dans l'autre main. À demander avant le geste : rien n'est joué ni dépensé.
   */
  refusal(prop: PlacedProp, tool: string | undefined): string | undefined {
    const h = prop.def.harvest;
    if (!h || !tool) return undefined;
    if (!wields(h, tool) && h.refuse[tool]) return h.refuse[tool];
    if (tool === h.tool && h.convert && this.partner(tool) === undefined) return h.convert.refuse;
    return undefined;
  }

  /**
   * La main qui tient l'objet taillé : l'autre que celle de l'outil `tool`, si elle tient ce que son `convert` sait tailler (la
   * branche, le piquet), sinon undefined.
   */
  private partner(tool: string): Hand | undefined {
    const target = this.map.props.find((p) => p.def.harvest?.convert && p.def.harvest.tool === tool);
    const from = target?.def.harvest?.convert?.from ?? {};
    const mine = ([0, 1] as const).find((i) => { const x = game.hands[i]; return !!x && 'item' in x && x.item === tool; });
    if (mine === undefined) return undefined;
    const other = (1 - mine) as Hand;
    const x = game.hands[other];
    return x && 'item' in x && from[x.item] ? other : undefined;
  }

  /**
   * Après un coup qui a fait naître de nouvelles collisions autour de Xéros (les demi-billes dont l'emprise le déborde, le
   * morceau d'une pièce nord-sud coupée) : le
   * repousse hors de ce qui le recouvre, du côté où il en sort le plus court, s'il y a la place.
   */
  settle(player: Player): void {
    const b = player.actor.body;
    for (let i = 0; i < 4; i++) {
      const zones = this.map.obstacles.getChildren() as Phaser.GameObjects.Zone[];
      const z = zones.find((q) => b.left < q.x + q.width / 2 - 0.01 && b.right > q.x - q.width / 2 + 0.01 && b.top < q.y + q.height / 2 - 0.01 && b.bottom > q.y - q.height / 2 + 0.01);
      if (!z) return;
      const moves = [
        { dx: z.x - z.width / 2 - b.right, dy: 0 },
        { dx: z.x + z.width / 2 - b.left, dy: 0 },
        { dx: 0, dy: z.y - z.height / 2 - b.bottom },
        { dx: 0, dy: z.y + z.height / 2 - b.top },
      ].sort((m, n) => Math.abs(m.dx + m.dy) - Math.abs(n.dx + n.dy));
      const ok = moves.find((m) => this.map.areaFree({ left: b.left + m.dx, right: b.right + m.dx, top: b.top + m.dy, bottom: b.bottom + m.dy }));
      if (!ok) return;
      b.reset(player.actor.x + ok.dx, player.actor.y + ok.dy);
    }
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
    if (h.tool && !wields(h, tool)) {
      const message = tool ? h.refuse[tool] : undefined;
      return message ? { kind: 'refused', message } : { kind: 'missing', tool: h.tool };
    }
    if (!h.tool && tool) return { kind: 'none' };
    if (h.convert) return this.whittleHit(prop, tool!, facing);
    if (prop.def.bears?.prop) return this.cutBorne(prop, facing);
    prop.hits++;
    if (h.impact) this.chips(prop, h.impact, facing);
    if (prop.hits < h.hits) {
      this.shake(prop);
      return { kind: 'hit', done: false, given: 0, overflow: false };
    }
    return { kind: 'hit', done: true, ...this.finish(prop, facing) };
  }

  /**
   * Un coup de hachette sur le billot : l'objet tenu dans l'autre main (la branche, le piquet) devient ce que dit `convert.from` (le piquet, la cheville), dans la même
   * main ; sans lui, rien ne se passe (la scène a déjà refusé avec le message de `convert.refuse`).
   */
  private whittleHit(prop: PlacedProp, tool: string, facing: Facing): HitResult {
    const h = prop.def.harvest!;
    const slot = this.partner(tool);
    if (slot === undefined) return { kind: 'refused', message: h.convert!.refuse };
    if (h.impact) this.chips(prop, h.impact, facing);
    const was = game.hands[slot] as { item: string };
    replaceHeld(game, slot, { item: h.convert!.from[was.item] });
    return { kind: 'hit', done: true, given: 1, overflow: false };
  }

  /**
   * Un coup sur un objet qui en porte un autre qui a une longueur (le billot et son rouleau) : l'objet porté perd
   * `length.cut`, sa pièce (`length.piece`, le lien) tombe au sol à côté ; vidé, il disparaît et le porteur redevient
   * `bears.empty` (le billot nu). La longueur est notée dans GameState.
   */
  private cutBorne(prop: PlacedProp, facing: Facing): HitResult {
    const { bears, harvest: h } = prop.def;
    const len = props[bears!.prop!].length!;
    const remaining = Math.max(0, (prop.length ?? len.start) - len.cut);
    if (h!.impact) this.chips(prop, h!.impact, facing);
    this.shake(prop);
    const mapId = this.map.def.id;
    const { x, y } = prop;
    let at: PlacedProp = prop;
    if (remaining > 0) {
      prop.length = remaining;
      const change = { type: prop.type, x, y, length: remaining };
      if (prop.spawned) changeSpawned(game, mapId, prop.id, change);
      else changeObject(game, mapId, prop.id, change);
    } else {
      this.map.removeProp(prop);
      at = this.map.placeProp({ id: prop.id, type: bears!.empty, x, y }, { spawned: prop.spawned });
      const change = { type: bears!.empty, x, y };
      if (prop.spawned) changeSpawned(game, mapId, prop.id, change);
      else changeObject(game, mapId, prop.id, change);
    }
    const { dropped } = this.dropAll([{ item: len.piece, min: 1, max: 1, give: false }], at.baseX, at.baseY);
    for (const g of dropped) this.pop(g, at.baseX, at.baseY);
    return { kind: 'hit', done: remaining === 0, given: 0, overflow: false, cut: { prop: bears!.prop!, remaining } };
  }

  /**
   * Ce que lâche un objet récolté, près de (bx, by) : dans les mains si `give` (au sol si elles ne sont pas libres), sinon au sol.
   * Entre dans GameState tout de suite ; les objets au sol sont posés cachés, à montrer avec pop().
   */
  dropAll(drops: Drop[], bx: number, by: number): { given: number; overflow: boolean; dropped: PlacedGround[] } {
    const dropped: PlacedGround[] = [];
    let given = 0;
    let overflow = false;
    for (const d of drops) {
      const n = Phaser.Math.Between(d.min, d.max);
      for (let i = 0; i < n; i++) {
        if (d.give) {
          if (take(game, { item: d.item }, items[d.item].hands)) {
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
    // côté où Xéros se tient : l'inverse de la direction où il regarde
    const [sx, sy] = { right: [-1, 0], left: [1, 0], up: [0, 1], down: [0, -1] }[facing];
    // sur une encoche (tronc couché), les éclats partent de l'encoche ; sinon du côté de Xéros, à hauteur de coup
    const x = prop.def.aim ? prop.aimX : prop.baseX + sx * 7;
    const y = prop.def.aim ? prop.aimY : prop.baseY - 6 + sy * 5;
    this.chipsAt(x, y, prop.y + 1, impact, facing);
  }

  /** Éclats de la matière `impact` qui jaillissent de (x, y), à la profondeur `depth`, vers Xéros (le coup sur une pièce de bois, systems/wood.ts). */
  chipsAt(x: number, y: number, depth: number, impact: string, facing: Facing): void {
    const c = HARVEST.chips;
    const [sx] = { right: [-1, 0], left: [1, 0], up: [0, 1], down: [0, -1] }[facing];
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
      .setDepth(depth);
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
    // un objet qui n'a pas de version dessinée vers la gauche (la bille coin planté) ne se retourne pas
    const hasLeft = (type: string) => this.scene.textures.exists(`${props[type].image}-left`);
    // Xéros à gauche (tourné vers la droite) : chute à droite ; à droite : à gauche ; d'en haut ou d'en bas : au hasard
    const fallLeft = !!h.fall && (facing === 'left' || (facing !== 'right' && Math.random() < 0.5));
    // ce qui naît vers la gauche (l'arbre couché) prend ses images `-left` ; le remplaçant (la souche) ne dépend pas du côté
    const flip = prop.flip !== fallLeft;
    // abscisse (dans le repère de l'objet) d'une image de largeur w décalée de `off`, côté gauche :
    // en miroir autour du pied pour ce qui naît d'une chute vers la gauche, autour de l'objet lui-même s'il était à gauche
    const mirror = (off: number, w: number, flipped = prop.flip) => (flipped ? prop.image.width - off - w : off);
    // la version vers la gauche d'un objet né : celle de la chute, ou celle de l'objet s'il en a une dessinée
    const spawnFlip = (type: string) => flip && (!!h.fall || hasLeft(type));
    const spawnX = (type: string, off: number, w: number) => (fallLeft ? 2 * h.fall!.foot - (off + w - 1) : mirror(off, w, spawnFlip(type)));
    const [ax, dy] = h.at ?? [0, 0];
    const becomes = h.becomes;
    // le tronc ébranché devient une pièce de bois ronde, est-ouest, de sa longueur utile : jamais retournée, mais posée en miroir
    // quand l'arbre est tombé vers la gauche, sur le tronc
    const wood: WoodPiece | undefined = becomes === WOOD_PIECE && h.wood ? { ...h.wood, shape: 'round', axis: 'ew' } : undefined;
    const keep = prop.flip && !!becomes && !wood && hasLeft(becomes);
    // la pièce se reflète par son corps, sans sa colonne d'ombre : son bout scié retombe sur celui du tronc
    const width = !becomes ? 0 : wood ? woodSize(wood.size, 'round', 'ew', wood.length).w - 1 : this.imageWidth(becomes);
    const x = prop.x + (becomes ? mirror(ax, width, keep || (!!wood && prop.flip)) : ax);
    const y = prop.y + dy;
    const { baseX, baseY } = prop;
    this.map.removeProp(prop);
    const next = becomes ? this.map.placeProp({ id: prop.id, type: becomes, x, y }, { flip: keep, spawned: prop.spawned, chain: prop.chain, wood }) : undefined;
    const change = becomes ? { type: becomes, x, y, ...(keep ? { flip: true } : {}), ...(wood ? { wood } : {}) } : { x, y };
    if (prop.spawned) changeSpawned(game, mapId, prop.id, change);
    else changeObject(game, mapId, prop.id, change);
    // ce qui naît (l'arbre couché) : noté tout de suite, montré à la fin de la chute
    const group = game.nextSpawnId;
    const born = h.spawns.map((sp, index) => {
      const chain = { group, index, size: h.spawns.length };
      const f = spawnFlip(sp.type);
      const o = spawnObject(game, mapId, sp.type, prop.x + spawnX(sp.type, sp.x, this.imageWidth(sp.type)), prop.y + sp.y, { flip: f, chain });
      return this.map.placeProp(o, { flip: f, spawned: true, chain });
    });

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
    // vers la gauche : sa propre planche, dessinée (pas de miroir)
    const f = fallLeft ? h.fall.left : h.fall;
    const fall = this.scene.add.sprite(prop.x + f.x, prop.y + f.y, f.image).setOrigin(0, 1).setDepth(prop.y);
    fall.play(`${f.image}-${h.fall.anim}`);
    fall.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      // une pièce a pu être récoltée pendant la chute : on ne montre que ce qui est encore posé
      for (const p of shown) if (this.map.props.includes(p)) p.image.setVisible(true);
      fall.destroy();
      scatter();
    });
    return { given, overflow };
  }

  /** Fait sauter un objet lâché depuis (bx, by) jusqu'à sa place. */
  pop(g: PlacedGround, bx: number, by: number): void {
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
