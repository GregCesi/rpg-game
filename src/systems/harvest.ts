import Phaser from 'phaser';
import { DEPTH, HARVEST, INTERACT, NOTCH_AIM, TILE } from '../config';
import type { Player } from '../entities/Player';
import { gestures, items, props } from '../content';
import type { Drop, Facing } from '../content/types';

/** Un bout d'une pièce couchée : l'ouest, l'est, le nord ou le sud. */
export type End = 'west' | 'east' | 'north' | 'south';
import { changeObject, changeSpawned, dropItem, game, replaceHeld, setChangeHits, setSpawnedHits, spawnObject, take, type Hand } from '../state';
import { footprint, notchCut, promptTop } from '../world/GameMap';
import type { Box, GameMap, PlacedGround, PlacedProp } from '../world/GameMap';

/**
 * Xéros peut viser l'encoche de cette pièce : collé au tronc (au-dessus ou en dessous), tourné vers lui,
 * et le fer à l'impact (`strike` du geste) à moins d'une demi-section de l'encoche (NOTCH_AIM).
 */
function notchInReach(player: Player, p: PlacedProp): boolean {
  const { actor } = player;
  const b = actor.body;
  const box = p.box;
  if (!box) return false;
  // ce qui doit être aligné sur l'encoche, c'est le fer à l'impact (`strike` de gestures.json, sinon la main à cette image)
  const gesture = gestures[p.def.harvest!.gesture];
  const dir = actor.facing === 'left' ? 'right' : (actor.facing as 'down' | 'up' | 'right');
  const hit = (gesture.strike?.[dir] ?? gesture.poses[dir][gesture.impact].dx) * (actor.facing === 'left' ? -1 : 1);
  const aligned = Math.abs(actor.x + hit - p.aimX) < NOTCH_AIM.align;
  // au-dessus du tronc, tourné vers le bas : le bas de sa collision touche le haut de celle du tronc ; en dessous, l'inverse
  const above = actor.facing === 'down' && Math.abs(box.top - b.bottom) <= NOTCH_AIM.gap;
  const below = actor.facing === 'up' && Math.abs(b.top - box.bottom) <= NOTCH_AIM.gap;
  return aligned && (above || below);
}

/**
 * Le bout de la pièce où se tient Xéros (\`west\`, \`east\`, \`north\`, \`south\`), tourné vers sa face coupée : à l'est ou à l'ouest d'une pièce est-ouest (plus large que
 * profonde, d'après ses \`dims\`), au nord ou au sud d'une pièce nord-sud, face à elle, et à hauteur de sa collision.
 */
export function endOf(player: Player, p: PlacedProp): End | undefined {
  const box = p.box;
  if (!box) return undefined;
  const b = player.actor.body;
  const f = player.actor.facing;
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  if (p.def.dims.w >= p.def.dims.d) {
    if (!(b.bottom > box.top && b.top < box.bottom)) return undefined;
    return f === 'right' && b.center.x < cx ? 'west' : f === 'left' && b.center.x > cx ? 'east' : undefined;
  }
  if (!(b.right > box.left && b.left < box.right)) return undefined;
  return f === 'down' && b.center.y < cy ? 'north' : f === 'up' && b.center.y > cy ? 'south' : undefined;
}

/** Le bout où se tient celui qui frappe, d'après la direction où il regarde (vers la droite : il est à l'ouest). */
const END_OF_FACING: Record<Facing, End> = { right: 'west', left: 'east', down: 'north', up: 'south' };

/**
 * Ce qu'a donné un coup : rien à frapper, mauvais outil (`tool` = l'outil qu'il faut), ou un coup porté.
 * `given` : objets mis directement dans les mains ; `overflow` : mains pas libres, ils sont tombés au sol ;
 * `cut` : l'objet porté qu'on vient de couper (le rouleau) et ce qui en reste (cm), s'il y en avait un ;
 * `released` : l'outil est resté dans l'objet (le coin planté), la main est à libérer ; `refused` : cet outil ne convient pas
 * ou plus, `message` dit pourquoi (`refuse` de harvest).
 */
export type HitResult =
  | { kind: 'none' }
  | { kind: 'missing'; tool: string }
  | { kind: 'refused'; message: string }
  | { kind: 'hit'; done: boolean; given: number; overflow: boolean; cut?: { prop: string; remaining: number }; released?: boolean };

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

  /**
   * Objet récoltable devant Xéros (avec ou sans outil), s'il est à portée : son point visé (l'encoche) ou sa base.
   * Une encoche du tronc couché ne se vise que de près : voir notchInReach. Quand deux objets sont à portée, celui que
   * l'outil `tool` en main récolte l'emporte (la hache vise l'encoche, pas la grosse bille voisine qui la refuserait).
   */
  target(player: Player, tool?: string): PlacedProp | undefined {
    const probe = player.probe(INTERACT.reach);
    let best: PlacedProp | undefined;
    let bestD = INTERACT.radius;
    let bestFits = false;
    for (const p of this.map.props) {
      // une encoche déjà coupée n'est plus une cible
      if (!p.def.harvest || notchCut(p)) continue;
      if (p.def.harvest.notch && !notchInReach(player, p)) continue;
      const d = Phaser.Math.Distance.Between(probe.x, probe.y, p.aimX, p.aimY);
      if (d >= INTERACT.radius) continue;
      const fits = !!tool && p.def.harvest.tool === tool;
      if ((fits && !bestFits) || (fits === bestFits && d < bestD)) {
        best = p;
        bestD = d;
        bestFits = fits;
      }
    }
    return best;
  }

  /**
   * Pourquoi `tool` ne peut pas frapper `prop` en ce moment, dit en français, ou undefined : l'outil que `refuse` de harvest écarte
   * (la hache sur une grosse bille, le coin déjà planté), ou la fente qui n'a pas la place de s'ouvrir au dernier coup.
   * À demander avant le geste : rien n'est joué ni dépensé.
   */
  refusal(prop: PlacedProp, tool: string | undefined, player?: Player): string | undefined {
    const h = prop.def.harvest;
    if (!h || !tool) return undefined;
    if (tool !== h.tool && h.refuse[tool]) return h.refuse[tool];
    if (tool === h.tool && h.convert && this.partner(tool) === undefined) return h.convert.refuse;
    if (tool === h.tool && h.ends && player) {
      const end = endOf(player, prop);
      if (!end || (h.side && h.side !== end)) return h.ends;
    }
    if (tool === h.tool && h.staged && prop.hits >= h.hits - 1 && !this.splitFree(prop)) return 'Pas la place pour la fendre.';
    return undefined;
  }

  /** La main qui tient l'objet taillé : l'autre que celle de l'outil `tool`, si elle tient ce que son `convert` attend (la branche), sinon undefined. */
  private partner(tool: string): Hand | undefined {
    const target = this.map.props.find((p) => p.def.harvest?.convert && p.def.harvest.tool === tool);
    const from = target?.def.harvest?.convert?.from;
    const mine = ([0, 1] as const).find((i) => { const x = game.hands[i]; return !!x && 'item' in x && x.item === tool; });
    if (mine === undefined) return undefined;
    const other = (1 - mine) as Hand;
    const x = game.hands[other];
    return x && 'item' in x && x.item === from ? other : undefined;
  }

  /** Où naissent, au dernier coup, `becomes` et `spawns` d'un objet qui se fend : coin bas gauche de chaque image. */
  private splitSpots(prop: PlacedProp): { type: string; x: number; y: number }[] {
    const h = prop.def.harvest!;
    const [ax, dy] = h.at ?? [0, 0];
    return [
      ...(h.becomes ? [{ type: h.becomes, x: prop.x + ax, y: prop.y + dy }] : []),
      ...h.spawns.map((sp) => ({ type: sp.type, x: prop.x + sp.x, y: prop.y + sp.y })),
    ];
  }

  /** Les morceaux tiendraient à leur place (carte, cases bloquantes, objets) : la collision de l'objet qui se fend ne compte pas. */
  private splitFree(prop: PlacedProp): boolean {
    const own = prop.parts.filter((q): q is Phaser.GameObjects.Zone => q instanceof Phaser.GameObjects.Zone);
    return this.splitSpots(prop).every(({ type, x, y }) => {
      const size = this.scene.textures.getFrame(props[type].image);
      const f = footprint(props[type], size.width, size.height, false);
      if (!f) return true;
      const box: Box = { left: x + f.left, right: x + f.right, top: y - size.height + f.top, bottom: y - size.height + f.bottom };
      return this.map.areaFree(box, [], own);
    });
  }

  /**
   * Après un coup qui a fait naître de nouvelles collisions autour de Xéros (les demi-billes dont l'emprise le déborde) : le
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
    if (h.tool && h.tool !== tool) {
      const message = tool ? h.refuse[tool] : undefined;
      return message ? { kind: 'refused', message } : { kind: 'missing', tool: h.tool };
    }
    if (!h.tool && tool) return { kind: 'none' };
    if (h.convert) return this.whittleHit(prop, tool!, facing);
    if (h.notch) return this.notchHit(prop, facing);
    if (h.staged) return this.stagedHit(prop, facing);
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
   * Un coup de hachette sur le billot : l'objet tenu dans l'autre main (la branche) devient `convert.into` (le piquet), dans la même
   * main ; sans lui, rien ne se passe (la scène a déjà refusé avec le message de `convert.refuse`).
   */
  private whittleHit(prop: PlacedProp, tool: string, facing: Facing): HitResult {
    const h = prop.def.harvest!;
    const slot = this.partner(tool);
    if (slot === undefined) return { kind: 'refused', message: h.convert!.refuse };
    if (h.impact) this.chips(prop, h.impact, facing);
    replaceHeld(game, slot, { item: h.convert!.into });
    return { kind: 'hit', done: true, given: 1, overflow: false };
  }

  /**
   * Un coup sur ce qui se fend (le coin planté dans la bille, frappé à la masse) : la fente s'allonge (image `<image>-n<coups>`, les
   * coups sont notés dans GameState). Au dernier coup l'objet devient `becomes` et `spawns` (les deux moitiés) et lâche ses `drops`
   * (le coin) : voir `finish`.
   */
  private stagedHit(prop: PlacedProp, facing: Facing): HitResult {
    const h = prop.def.harvest!;
    prop.hits++;
    if (prop.spawned) setSpawnedHits(game, this.map.def.id, prop.id, prop.hits);
    else setChangeHits(game, this.map.def.id, prop.id, prop.hits);
    if (h.impact) this.chips(prop, h.impact, facing);
    if (prop.hits < h.hits) {
      prop.image.setTexture(`${prop.def.image}-n${prop.hits}`);
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
   * Ce que lâche un objet récolté, près de (bx, by) : dans les mains si `give` (au sol si elles ne sont pas libres), sinon au sol.
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
  private finish(prop: PlacedProp, facing: Facing): { given: number; overflow: boolean; released: boolean } {
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
    // planté depuis un bout : l'objet qui en naît est celui de ce bout (le coin et la fente partent de là)
    const becomes = h.becomesAt?.[END_OF_FACING[facing]] ?? h.becomes;
    const keep = prop.flip && !!becomes && hasLeft(becomes);
    const x = prop.x + (becomes ? mirror(ax, this.imageWidth(becomes), keep) : ax);
    const y = prop.y + dy;
    const { baseX, baseY } = prop;
    this.map.removeProp(prop);
    const next = becomes ? this.map.placeProp({ id: prop.id, type: becomes, x, y }, { flip: keep, spawned: prop.spawned, chain: prop.chain }) : undefined;
    const change = becomes ? { type: becomes, x, y, ...(keep ? { flip: true } : {}) } : { x, y };
    if (prop.spawned) changeSpawned(game, mapId, prop.id, change);
    else changeObject(game, mapId, prop.id, change);
    // ce qui naît (l'arbre couché) : noté tout de suite, montré à la fin de la chute
    const group = game.nextSpawnId;
    const born = h.spawns.map((sp, index) => {
      // les moitiés d'une bille fendue ne sont pas les pièces d'un tronc : pas de chaîne
      const chain = h.staged ? undefined : { group, index, size: h.spawns.length };
      const f = spawnFlip(sp.type);
      const o = spawnObject(game, mapId, sp.type, prop.x + spawnX(sp.type, sp.x, this.imageWidth(sp.type)), prop.y + sp.y, f, chain);
      return this.map.placeProp(o, { flip: f, spawned: true, chain });
    });
    this.map.refreshTrunk();

    // les objets lâchés entrent dans GameState tout de suite : quitter la carte pendant la chute ne les perd pas
    const { given, overflow, dropped } = this.dropAll(h.drops, baseX, baseY);
    const scatter = () => {
      for (const g of dropped) this.pop(g, baseX, baseY);
    };
    const released = !!h.plant;
    if (h.staged) {
      // la fente s'ouvre un instant (dernière image d'étape), puis les morceaux paraissent et l'outil tombe
      const shown = [next, ...born].filter((p) => p !== undefined);
      for (const p of shown) p.image.setVisible(false);
      const open = this.scene.add.image(prop.x, prop.y, `${prop.def.image}-n${h.hits}`).setOrigin(0, 1).setDepth(prop.y);
      this.scene.time.delayedCall(HARVEST.splitMs, () => {
        for (const p of shown) if (this.map.props.includes(p)) p.image.setVisible(true);
        open.destroy();
        scatter();
      });
      return { given, overflow, released };
    }
    if (!h.fall) {
      scatter();
      return { given, overflow, released };
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
    return { given, overflow, released };
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
