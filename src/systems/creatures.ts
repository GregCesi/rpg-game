import Phaser from 'phaser';
import { DEBUG, DEPTH, FEET as FEET_BOX, UI, RENDER, ZOOM_STEPS } from '../config';
import { CM_PER_PX } from '../content/gabarit';
import { creatures, props, strength } from '../content';
import type { CreatureDef, Facing, Gait } from '../content/types';
import type { Player } from '../entities/Player';
import { game, setWarren, warrenOf } from '../state';
import type { GameMap } from '../world/GameMap';
import { crossed } from '../world/crossing';
import { spritesheets } from '../generated/assets';
import { alarm, emerge, hurt, metres, pixels, setXerosFeet, setXerosMass, type Creature, type CreatureEvent, type Point, type Surroundings } from '../world/creature';
import { footprint, type Box } from '../world/strike';
import { death, memberOf, outRange, seedWarren, settle, warrenHoles, wounded, WarrenLife, type WarrenSite } from '../world/warren';

/** Une cible vivante, pour le combat (systems/combat.ts) : son emprise au sol, sa hauteur (m), et ce que lui fait un coup. */
export interface LivingTarget {
  key: string;
  type: string;
  box: Box;
  height: number;
  image: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  /** Sa peau (`target.hide` de creatures.json) : ce qu'elle encaisse de chaque choc (world/strike.ts `throughHide`). */
  hide: number;
  hurt: (damage: number, facing: Facing) => void;
}

/**
 * Les pieds d'une bête au-dessus du bas de sa frame (px) : ce que dit sa planche (`feet`, art/world/boar.ts), sinon 2, comme Xéros
 * (pieds à la rangée 45 d'une frame de 48) et le lapin.
 */
const feetOf = (image: string): number => spritesheets.find((s) => s.key === image)?.feet ?? 2;

/**
 * Ce qu'une charge fait au monde, dit à la scène (systems/creatures.ts ne touche ni à Xéros ni aux objets) : la bête emporte Xéros
 * (`gore` : sa masse, sa vitesse au choc en m/s, sa direction, l'efficacité de ses défenses `tusk`), heurte un obstacle (`impact` : le
 * point, l'énergie), traverse un buisson (`brush` : le point).
 */
export interface ChargeHooks {
  gore: (hit: { kg: number; speed: number; dir: Point; tusk: number }) => void;
  impact: (at: Point, joules: number) => void;
  brush: (at: Point) => void;
}

interface Warren {
  site: WarrenSite;
  def: CreatureDef;
  life: WarrenLife;
}

/** L'allure de Xéros, que perçoivent les bêtes : immobile, discret (Alt), à la marche, à la course. */
export function gaitOf(p: Player): Gait {
  if (p.dir.lengthSq() === 0) return 'still';
  if (p.sneaking) return 'sneak';
  return p.running ? 'run' : 'walk';
}

/**
 * Les créatures de la carte (docs/CONCEPTION.md, « Les créatures ») : les garennes posées dans Tiled (`warrens` de la carte), leur vie
 * menée par le moteur commun sans Phaser (world/creature.ts, world/warren.ts) à chaque pas de jeu, donc aussi en temps accéléré ; ce
 * que la partie en garde (membres, blessés, naissances) s'écrit dans GameState ; chaque bête dessinée par sa planche
 * (`<image>-<pose>-<direction>`). Elles sont des cibles (`targets`) : un coup ou un objet lancé les blesse ou les tue ; tuée, une bête
 * devient l'objet qu'elle devient (`becomes`), posé là où elle meurt. Avec ?debug : l'état de chaque bête au-dessus d'elle ; avec ?debug
 * ou « Distances » de ?dieu, autour de Xéros les deux cercles de son allure (aux aguets, fuite) pour l'espèce de la carte.
 */
export class CreatureSystem {
  private readonly warrens: Warren[] = [];
  private readonly sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private readonly labels = new Map<string, Phaser.GameObjects.Text>();
  private rings?: Phaser.GameObjects.Graphics;
  /** Les cercles d'alerte autour de Xéros : ?debug, ou « Distances » de ?dieu. */
  showRanges = DEBUG;
  rand: () => number = Math.random;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    /**
     * Pose un objet au sol à la place libre la plus proche de (x, y) (systems/hands.ts `layNear`), dans sa vue `view` : ce que devient
     * une bête tuée.
     */
    private readonly drop: (item: string, x: number, y: number, view?: number) => void,
    /** Les éclats de la matière touchée (systems/harvest.ts `chipsAt`). */
    private readonly chips: (x: number, y: number, depth: number, matter: string, facing: Facing) => void,
    /** Le chiffre des dégâts qui s'envole au-dessus de la cible. */
    private readonly float: (x: number, y: number, label: string) => void,
    interior: boolean,
    /** Ce que fait une charge au monde (la scène). */
    private readonly hooks?: ChargeHooks,
  ) {
    const def = map.def;
    setXerosMass(strength.mass);
    setXerosFeet(FEET_BOX);
    if (interior) return;
    for (const g of def.warrens) {
      const cd = creatures[g.creature];
      if (!cd) continue;
      const ids = new Set(warrenHoles(def, g, props).map((o) => o.id));
      // le terrier : ses entrées ; la bauge : le milieu du rectangle
      const holes =
        cd.den === 'wallow'
          ? [{ x: Math.round(g.x + g.w / 2), y: Math.round(g.y + g.h / 2) }]
          : map.props.filter((p) => !p.spawned && ids.has(p.id)).map((p) => ({ x: p.baseX, y: Math.round(p.baseY - p.image.height / 2) }));
      const site: WarrenSite = { id: g.id, kind: g.creature, population: g.population, holes };
      if (!warrenOf(game, def.id, g.id)) setWarren(game, def.id, g.id, seedWarren(site, cd, game.clock));
      const life = new WarrenLife(site, cd);
      life.populate(this.settled(site, cd), game.clock, this.around(holes, undefined, cd));
      this.warrens.push({ site, def: cd, life });
    }
  }

  /** Les bêtes dehors, toutes garennes comprises. */
  all(): Creature[] {
    return this.warrens.flatMap((w) => w.life.out);
  }

  /** La garenne telle que la partie la garde, à l'heure qu'il est (naissances, guérisons écrites dans GameState s'il y en a). */
  private settled(site: WarrenSite, def: CreatureDef) {
    const w = warrenOf(game, this.map.def.id, site.id)!;
    const s = settle(w, site, def, game.clock);
    if (s !== w) setWarren(game, this.map.def.id, site.id, s);
    return s;
  }

  /**
   * Ce qui entoure une bête : Xéros, ce qui barre le passage (une tuile pleine, un corps), ce qui arrête une charge (dur, mou, le bord de
   * la zone : GameMap `groundAt`), les entrées de sa garenne, la distance où elle broute à cette heure.
   */
  private around(holes: Point[], threat: Surroundings['threat'], def?: CreatureDef): Surroundings {
    return {
      threat,
      blocked: (x, y) => !this.map.areaFree({ left: x - 0.5, top: y - 0.5, right: x + 0.5, bottom: y + 0.5 }),
      ground: (x, y) => this.map.groundAt(x, y),
      holes,
      rand: this.rand,
      range: def ? outRange(def, game.clock.minute) : undefined,
    };
  }

  /** Ce qu'un pas d'une bête qui charge fait au monde : la scène en fait le reste (Xéros renversé, l'arbre qui tremble, le buisson). */
  private chargeEvent(w: Warren, e: CreatureEvent): void {
    if (!this.hooks || !w.def.charge) return;
    if (e.kind === 'gore') this.hooks.gore({ kg: w.def.mass, speed: e.speed, dir: e.dir, tusk: w.def.charge.tusk });
    else if (e.kind === 'impact') this.hooks.impact(e.at, e.joules);
    else if (e.kind === 'brush') this.hooks.brush(e.at);
  }

  /** Un pas de jeu de `delta` ms : chaque garenne vit (Xéros perçu si `active`), ses bêtes se dessinent. */
  update(player: Player, delta: number, active: boolean): void {
    const dt = delta / 1000;
    const a = player.actor;
    const threat = active ? { x: a.x, y: a.y, gait: gaitOf(player) } : undefined;
    this.threat = threat;
    for (const w of this.warrens) {
      const state = this.settled(w.site, w.def);
      for (const e of w.life.step(state, game.clock, dt, () => this.around(w.site.holes, threat, w.def), this.rand)) {
        if (e.kind === 'thump') for (const o of this.warrens) alarm(o.life.out, w.def, e.at, w.site.kind, () => this.around(o.site.holes, threat, o.def));
        else this.chargeEvent(w, e);
      }
    }
    this.draw(player);
  }

  /** Les bêtes dehors se dessinent ; celles qui sont rentrées s'effacent ; leur état (?debug) et les cercles de Xéros. */
  private draw(player: Player): void {
    const seen = new Set<string>();
    for (const w of this.warrens)
      for (const c of w.life.out) {
        seen.add(c.id);
        let s = this.sprites.get(c.id);
        if (!s) {
          s = this.scene.add.sprite(c.x, c.y, w.def.image).setOrigin(0.5, 1);
          this.sprites.set(c.id, s);
        }
        // les pieds sont au-dessus du bas de la frame (l'ombre dessous ; ce que dit la planche) : le sprite descend d'autant
        s.setPosition(Math.round(c.x), Math.round(c.y) + feetOf(w.def.image)).setDepth(c.y);
        const anim = `${w.def.image}-${c.pose}-${c.facing}`;
        const was = s.anims.currentAnim?.key;
        const impact = `${w.def.image}-impact-${c.facing}`;
        // sonnée : le choc d'abord (une fois), puis elle titube
        if (c.pose === 'stunned' && was !== anim && was !== impact && this.scene.anims.exists(impact)) {
          s.play(impact);
          s.anims.chain(anim);
        } else if (was !== anim && was !== impact && this.scene.anims.exists(anim)) s.play(anim);
        else if (was === impact && c.pose !== 'stunned' && this.scene.anims.exists(anim)) s.play(anim);
        if (DEBUG) {
          let t = this.labels.get(c.id);
          if (!t) {
            t = this.scene.add.text(0, 0, '', { fontFamily: UI.font, fontSize: '8px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 }).setOrigin(0.5, 1).setResolution(ZOOM_STEPS.max * RENDER);
            this.labels.set(c.id, t);
          }
          t.setText(`${c.mode} ${String(c.hp).replace('.', ',')}`).setPosition(Math.round(c.x), Math.round(c.y) - 10).setDepth(DEPTH.prompt - 2);
        }
      }
    for (const [id, s] of this.sprites)
      if (!seen.has(id)) {
        s.destroy();
        this.sprites.delete(id);
        this.labels.get(id)?.destroy();
        this.labels.delete(id);
      }
    this.rings?.clear();
    if (!this.showRanges || !this.warrens.length) return;
    this.rings ??= this.scene.add.graphics().setDepth(DEPTH.shadow + 0.02);
    const senses = this.warrens[0].def.senses[gaitOf(player)];
    const { x, y } = player.actor;
    this.rings.lineStyle(1, 0xe0c040, 0.8).strokeCircle(x, y, pixels(senses.alert));
    this.rings.lineStyle(1, 0xd0402a, 0.9).strokeCircle(x, y, pixels(senses.near));
  }

  /** Les bêtes dehors comme cibles : un coup (systems/combat.ts) ou un objet lancé les touche. */
  targets(): LivingTarget[] {
    const out: LivingTarget[] = [];
    for (const w of this.warrens)
      for (const c of w.life.out) {
        const s = this.sprites.get(c.id);
        if (!s) continue;
        out.push({
          key: `creature:${c.id}`,
          type: w.site.kind,
          box: bodyBox(w.def, c),
          height: w.def.dims.h / 100,
          image: s,
          x: s.x - s.width / 2,
          y: s.y,
          hide: w.def.target.hide,
          hurt: (damage, facing) => this.hurt(w, c, damage, facing),
        });
      }
    return out;
  }

  /**
   * Un objet lancé passe de `a` à `b` (px au sol, à `z` m de haut) pendant ce pas : la bête dont l'emprise est franchie, en tenant
   * compte de son propre mouvement pendant le même pas (le chemin de l'objet vu depuis la bête, world/crossing.ts), sous sa hauteur.
   */
  flightHit(a: Point, b: Point, z: number): string | undefined {
    for (const w of this.warrens)
      for (const c of w.life.out) {
        if (z > w.def.dims.h / 100) continue;
        const from = c.from ?? c;
        const box = bodyBox(w.def, { x: 0, y: 0, facing: c.facing });
        const rel0 = { x: a.x - from.x, y: a.y - from.y };
        const rel1 = { x: b.x - c.x, y: b.y - c.y };
        if (crossed(rel0, rel1, (x, y) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)) return `creature:${c.id}`;
      }
    return undefined;
  }

  /**
   * Un coup qui porte : blessée, elle réagit (le lapin fuit, le sanglier charge ; la partie garde ses points de vie) ; tuée, elle devient
   * son objet, là où elle meurt (une bête dont la planche a sa mort, `die`, bascule d'abord sur le flanc, dans le sens de son dessin).
   */
  private hurt(w: Warren, c: Creature, damage: number, facing: Facing): void {
    const s = this.sprites.get(c.id);
    this.chips(c.x, c.y - 2, c.y + 1, w.def.target.matter, facing);
    this.float(c.x, c.y - (s?.height ?? 8), String(damage).replace('.', ','));
    const state = this.settled(w.site, w.def);
    if (hurt(c, damage, this.around(w.site.holes, this.threat, w.def), w.def) === 'dead') {
      const d = death(state, c, w.site, w.def, game.clock);
      setWarren(game, this.map.def.id, w.site.id, d.state);
      w.life.remove(c);
      // tournée vers la gauche, elle tombe la tête à l'ouest : la vue au sol `-r2` (un demi-tour de son image)
      const west = c.facing === 'left';
      const die = `${w.def.image}-die-${west ? 'left' : 'right'}`;
      if (s && this.scene.anims.exists(die)) {
        // le sprite reste le temps de sa bascule, puis l'objet prend sa place
        this.sprites.delete(c.id);
        this.labels.get(c.id)?.destroy();
        this.labels.delete(c.id);
        s.play(die);
        s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          s.destroy();
          this.drop(d.remains.item, d.remains.x, d.remains.y, west ? 2 : undefined);
        });
      } else this.drop(d.remains.item, d.remains.x, d.remains.y);
    } else setWarren(game, this.map.def.id, w.site.id, wounded(state, memberOf(c), c.hp, w.def, game.clock));
  }

  /** Xéros tel que les bêtes le perçoivent, au dernier pas (un coup qui blesse une bête qui charge : elle le vise). */
  private threat: Surroundings['threat'];

  // ---------- ?dieu ----------

  /**
   * ?dieu : une bête sort à `dx`, `dy` m de Xéros (3 m à l'est par défaut), de la garenne la plus proche qui a un membre au terrier qui
   * peut sortir ; à une bauge, une bête couchée (ou la plus proche) se lève et vient là, tranquille.
   */
  spawnNear(x: number, y: number, dx = 3, dy = 0): string {
    if (!this.warrens.length) return 'Pas de garenne sur cette carte.';
    for (const w of this.byDistance(x, y)) {
      if (w.def.den === 'wallow') {
        const c = w.life.out.find((b) => b.mode === 'rest') ?? w.life.out[0];
        if (!c) continue;
        Object.assign(c, { x: x + pixels(dx), y: y + pixels(dy), mode: 'calm', pose: 'sit', goal: undefined, hop: undefined, path: undefined, wait: 2, v: 0, from: undefined });
        return `Un ${w.def.name} vient près de Xéros.`;
      }
      const state = this.settled(w.site, w.def);
      const m = state.members.find((m) => !w.life.find(m.n) && (m.heal === undefined || game.clock.day >= m.heal));
      if (!m) continue;
      w.life.out.push(emerge(`${w.site.id}:${m.n}`, w.site.kind, w.def, { x: x + pixels(dx), y: y + pixels(dy) }, m.hp));
      return `Un ${w.def.name} sort près de Xéros.`;
    }
    return 'Toutes les bêtes des garennes de la carte sont dehors.';
  }

  /** ?dieu : la garenne la plus proche compte `n` bêtes vivantes tout de suite, et autant pleine (le temps de la session). */
  setPopulation(x: number, y: number, n: number): string {
    const w = this.nearest(x, y);
    if (!w) return 'Pas de garenne sur cette carte.';
    const state = this.settled(w.site, w.def);
    const members = state.members.slice(0, Math.max(0, n));
    let next = state.next;
    while (members.length < n) members.push({ n: next++, hp: w.def.target.hp });
    w.site.population = n;
    setWarren(game, this.map.def.id, w.site.id, { ...state, members, next });
    return `Garenne : ${n} ${w.def.name}${n > 1 ? 's' : ''}.`;
  }

  /** L'espèce de la carte et ses données (?dieu : voir et régler les distances). */
  species(): CreatureDef | undefined {
    return this.warrens[0]?.def;
  }

  /** Les garennes de la carte, de la plus proche de (x, y) à la plus loin (par leur entrée la plus proche). */
  private byDistance(x: number, y: number): Warren[] {
    const d = (w: Warren) => Math.min(...w.site.holes.map((h) => Math.hypot(h.x - x, h.y - y)));
    return [...this.warrens].sort((a, b) => d(a) - d(b));
  }

  private nearest(x: number, y: number): Warren | undefined {
    return this.byDistance(x, y)[0];
  }

  /**
   * Les bêtes dehors, leur état, la distance de chacune à (x, y) en m (`dist`), et celle d'où elle a perçu Xéros à ce pas (`seenAt` : sa
   * place au début du pas, avant de bouger), et pourquoi elle fuit (`fled`) : les tests de scénario.
   */
  census(x: number, y: number): { id: string; kind: string; mode: string; pose: string; hp: number; x: number; y: number; v: number; dist: number; seenAt: number; fled?: string }[] {
    return this.all().map((c) => {
      const f = c.from ?? c;
      return { id: c.id, kind: c.kind, mode: c.mode, pose: c.pose, hp: c.hp, x: c.x, y: c.y, v: c.v, dist: metres(Math.hypot(c.x - x, c.y - y)), seenAt: metres(Math.hypot(f.x - x, f.y - y)), fled: c.fled };
    });
  }
}

/**
 * L'emprise au sol d'une bête (px), selon son sens : de profil, sa longueur d'est en ouest ; de face ou de dos, du nord au sud (le corps
 * d'un sanglier tourné vers Xéros n'a que sa largeur de travers).
 */
function bodyBox(def: CreatureDef, c: { x: number; y: number; facing: Facing }): Box {
  if (c.facing === 'left' || c.facing === 'right') return footprint(def.dims, c.x, c.y);
  const turned = { ...def.dims, w: def.dims.d, d: def.dims.w };
  return footprint(turned, c.x, c.y + turned.d / 2 / CM_PER_PX);
}
