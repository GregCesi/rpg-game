import Phaser from 'phaser';
import { DEBUG, DEPTH, UI, ZOOM_STEPS } from '../config';
import { combat, items, stamina } from '../content';
import { itemMass } from '../content/mass';
import type { Attack, Facing, Weapon } from '../content/types';
import type { Player } from '../entities/Player';
import { combatPoses } from '../generated/combatPoses';
import { game } from '../state';
import type { GameMap, PlacedProp } from '../world/GameMap';
import {
  aimShift,
  attackCost,
  bladeHits,
  damage,
  footprint,
  frameDurations,
  inFront,
  precision,
  reachCm,
  stanceFor,
  strikePath,
  type CombatFrame,
  type Grip,
  type Point,
  type Segment,
  type Silhouette,
} from '../world/strike';
import type { HarvestSystem } from './harvest';

/** Ce qui frappe : une arme possédable (`item`), ou la main nue (`fist`, combat.json `unarmed`). */
export type Striker = { item: string } | { fist: true };

/**
 * Une attaque prête à jouer : laquelle, avec quoi, ses images dans la direction de Xéros et leurs durées, son prix, ses dégâts, sa
 * précision et l'écart tiré pour ce coup.
 */
export interface AttackPlan {
  key: string;
  attack: Attack;
  striker: Striker;
  weapon: Weapon;
  kg: number;
  facing: Facing;
  frames: CombatFrame[];
  durations: number[];
  cost: number;
  damage: number;
  precision: number;
  shift: Point;
  /** Les cibles déjà touchées par ce coup : une cible ne prend qu'un coup par frappe. */
  touched: Set<number>;
}

/** Ce qu'a fait un coup (les tests le lisent, ?debug le montre). */
export interface StrikeLog {
  attack: string;
  /** L'arme (clé d'items.json), ou `fist`. */
  item: string;
  facing: Facing;
  reach: number;
  cost: number;
  damage: number;
  precision: number;
  shift: Point;
  hits: { id: number; type: string; damage: number; step: number }[];
}

/**
 * Le combat (docs/CONCEPTION.md, « Le combat ») : Espace avec une arme en main (la main active, ou l'autre si l'active est vide), ou,
 * la main active vide et l'autre sans arme ni outil, la main nue : le geste complet se joue toujours et se paie, dans le vide comme sur
 * une cible. L'arme est des données (`weapon` d'items.json ; la main nue, `unarmed` de combat.json), l'attaque aussi (combat.json) ;
 * le corps joue le geste de combat de l'attaque (COMBAT_POSES, src/generated/combatPoses.ts) avec l'arme dans la main droite, dans
 * l'angle de chaque image (entities/ToolUse.ts). À chaque image de frappe, la lame dessinée (de la main à la pointe ; le poing : de
 * l'épaule au poing), décalée de l'écart que laisse la précision, balaie depuis l'image d'avant ; une cible (`target` de props.json)
 * devant Xéros dont la silhouette dessinée est recoupée est touchée, une seule fois par coup : arrêt sur image, elle penche et recule,
 * sa matière vole, l'écran tremble sur un gros coup ; avec ?debug, la lame, le balayage, la silhouette touchée et les dégâts. Un
 * deuxième Espace pendant le geste, ou peu après (`combo`), enchaîne l'attaque suivante de la posture. Ne lit pas le clavier.
 */
export class CombatSystem {
  /** Chaque coup porté, dans l'ordre (les tests, ?debug). */
  readonly log: StrikeLog[] = [];
  /** Une attaque est en cours (de la garde à la fin du retour). */
  busy = false;
  /** Où en est l'enchaînement : la place de la dernière attaque dans la suite de sa posture, avec quoi, jusqu'à quand il tient. */
  private chainAt = -1;
  private chainWith?: string;
  private comboUntil = 0;
  /** Espace a été appuyé pendant l'attaque en cours : la suivante partira à sa fin. */
  private queued = false;
  /** La réaction en cours de chaque cible touchée. */
  private readonly reacting = new Map<PlacedProp, Phaser.Tweens.Tween>();
  /** Le tirage de l'écart de chaque coup (la précision) : Math.random en jeu ; un test peut le fixer. */
  rand: () => number = Math.random;
  /** Silhouettes des images des cibles (pixels opaques), par clé d'image. */
  private readonly masks = new Map<string, { w: number; h: number; opaque: Uint8Array }>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    private readonly harvest: HarvestSystem,
  ) {}

  /** La clé de ce qui frappe, pour l'enchaînement et le journal. */
  private static keyOf(s: Striker): string {
    return 'item' in s ? s.item : 'fist';
  }

  /** Ce que tiennent les mains, pour la posture : l'arme à deux mains, ce que tient l'autre main, les mains libres. */
  private grip(s: Striker): Grip {
    const [l, r] = game.hands;
    const free: Grip['free'] = game.both ? 'none' : !l && !r ? 'both' : !r ? 'right' : !l ? 'left' : 'none';
    if (game.both) return { other: 'empty', both: true, free };
    const own = game.hands[game.active];
    const mine = 'item' in s && own && 'item' in own && own.item === s.item ? game.active : 1 - game.active;
    const other = game.hands[1 - mine];
    return { other: !other ? 'empty' : 'item' in other && items[other.item].weapon ? 'weapon' : 'other', both: false, free };
  }

  /** L'attaque que jouerait Espace à `time` avec `s`, vers `facing` : la suivante de l'enchaînement s'il tient, sinon la première. */
  plan(s: Striker, facing: Facing, time: number): AttackPlan {
    const weapon: Weapon = 'item' in s ? items[s.item].weapon! : combat.unarmed;
    const kg = 'item' in s ? itemMass(s.item) : combat.unarmed.mass;
    const chain = stanceFor(combat, weapon.family, this.grip(s)).chain;
    const key0 = CombatSystem.keyOf(s);
    const at = this.chainWith === key0 && this.chainAt >= 0 && time <= this.comboUntil ? (this.chainAt + 1) % chain.length : 0;
    const key = chain[at];
    const attack = combat.attacks[key];
    const frames = combatPoses[attack.gesture][facing];
    const rules = combat.rules;
    return {
      key,
      attack,
      striker: s,
      weapon,
      kg,
      facing,
      frames,
      durations: frameDurations(rules, frames, weapon, kg),
      cost: attackCost(stamina.costs, attack, kg),
      damage: damage(rules, attack, combatPoses[attack.gesture].down, weapon, kg),
      precision: precision(rules, weapon, kg),
      shift: aimShift(rules, weapon, kg, this.rand),
      touched: new Set(),
    };
  }

  /** L'attaque part : elle prend sa place dans l'enchaînement, et sa ligne dans le journal. */
  begin(p: AttackPlan): void {
    const chain = stanceFor(combat, p.weapon.family, this.grip(p.striker)).chain;
    this.chainAt = chain.indexOf(p.key);
    this.chainWith = CombatSystem.keyOf(p.striker);
    this.busy = true;
    this.queued = false;
    this.log.push({
      attack: p.key,
      item: CombatSystem.keyOf(p.striker),
      facing: p.facing,
      reach: reachCm(combat.rules, p.weapon),
      cost: p.cost,
      damage: p.damage,
      precision: p.precision,
      shift: p.shift,
      hits: [],
    });
  }

  /** Espace pendant l'attaque : la suivante partira à sa fin. */
  queue(): void {
    if (this.busy) this.queued = true;
  }

  /** La fin du geste, à `time` : l'enchaînement tient `combo` ms. Rend vrai si Espace a été appuyé pendant le geste (enchaîner tout de suite). */
  end(p: AttackPlan, time: number): boolean {
    this.busy = false;
    this.comboUntil = time + p.attack.combo;
    const q = this.queued;
    this.queued = false;
    return q;
  }

  /**
   * La silhouette dessinée d'une cible : sa boîte dans le monde et ses pixels opaques (l'image posée par son coin bas gauche, comme
   * GameMap ; l'ombre, translucide, n'en fait pas partie).
   */
  silhouette(q: PlacedProp): Silhouette {
    const frame = q.image.frame;
    const key = `${frame.texture.key}#${frame.name}`;
    let m = this.masks.get(key);
    if (!m) {
      const w = frame.cutWidth;
      const h = frame.cutHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const opaque = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) opaque[i] = data[i * 4 + 3] >= 250 ? 1 : 0;
      m = { w, h, opaque };
      this.masks.set(key, m);
    }
    const { w, h, opaque } = m;
    const left = q.x;
    const top = q.y - h;
    return {
      box: { left, top, right: left + w, bottom: q.y },
      covers: (x, y) => {
        const u = x - left;
        const v = y - top;
        return u >= 0 && v >= 0 && u < w && v < h && opaque[v * w + u] === 1;
      },
    };
  }

  /**
   * Une image de frappe du coup `p` (son indice `step`) : la lame balaie depuis l'image d'avant ; chaque cible devant Xéros dont la
   * silhouette est recoupée, pas encore touchée par ce coup, l'est : le ressenti, le journal, ?debug.
   */
  strike(player: Player, p: AttackPlan, step: number): void {
    const feet = { x: player.actor.x, y: player.actor.y };
    const path = strikePath(p.frames, p.facing, feet, p.weapon, p.attack.hand, p.shift).find((s) => s.step === step);
    if (!path) return;
    const reach = reachCm(combat.rules, p.weapon);
    const hit: PlacedProp[] = [];
    const shown: Silhouette[] = [];
    for (const q of this.map.props) {
      if (!q.def.target || !q.image.visible || p.touched.has(q.id)) continue;
      if (!inFront(feet, p.facing, footprint(q.def.dims, q.baseX, q.baseY), reach + 30)) continue;
      const sil = this.silhouette(q);
      if (!path.blades.some((b) => bladeHits(b, sil))) continue;
      p.touched.add(q.id);
      hit.push(q);
      shown.push(sil);
    }
    if (DEBUG) this.showStrike(path.blades, shown);
    if (!hit.length) return;
    const entry = this.log[this.log.length - 1];
    const feel = combat.feel;
    // l'arrêt sur image : le geste se fige, puis la cible réagit
    player.tools.hold(feel.hitStopMs);
    if (p.damage >= feel.shakeFrom) this.scene.cameras.main.shake(feel.shakeMs, feel.shakeIntensity);
    for (const q of hit) {
      entry?.hits.push({ id: q.id, type: q.type, damage: p.damage, step });
      this.scene.time.delayedCall(feel.hitStopMs, () => this.react(q, p.facing));
      if (DEBUG) this.showDamage(q, p.damage);
    }
  }

  /**
   * La cible touchée : elle recule un peu et penche autour de son pied, du côté opposé à Xéros (de face ou de dos : elle recule vers
   * le nord ou le sud et penche un peu d'un côté au hasard), en tremblant, puis revient ; sa matière vole (`fx-<matter>`).
   */
  private react(q: PlacedProp, facing: Facing): void {
    const t = q.def.target!;
    const img = q.image;
    const feel = combat.feel;
    // un coup pendant la réaction d'avant : elle revient d'abord à sa place
    this.reacting.get(q)?.stop();
    img.setOrigin(0.5, 1).setPosition(q.x + img.width / 2, q.y).setAngle(0);
    const side = facing === 'right' ? 1 : facing === 'left' ? -1 : 0;
    const lean = side !== 0 ? side * t.tilt : (Math.random() < 0.5 ? -1 : 1) * t.tilt * 0.5;
    const dx = side * feel.recoilPx;
    const dy = facing === 'down' ? feel.recoilPx : facing === 'up' ? -feel.recoilPx : 0;
    const cx = img.x;
    const restore = () => {
      img.setOrigin(0, 1).setPosition(q.x, q.y).setAngle(0);
      this.reacting.delete(q);
    };
    // v monte de 0 à 1 puis redescend : la cible penche et recule, et tremble d'un pixel tant qu'elle n'est pas revenue
    let n = 0;
    const tween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: feel.reactMs / 2,
      ease: 'Quad.easeOut',
      yoyo: true,
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        const jitter = v > 0.15 ? (n++ % 4 < 2 ? 1 : -1) : 0;
        img.setAngle(lean * v).setPosition(cx + dx * v + jitter, q.y + dy * v);
      },
      onComplete: restore,
      onStop: restore,
    });
    this.reacting.set(q, tween);
    this.harvest.chipsAt(q.x + img.width / 2, q.y - img.height * 0.55, q.y + 1, t.matter, facing);
  }

  /** ?debug : le balayage depuis l'image d'avant (pâle), la lame de cette image de frappe (blanche), la silhouette touchée (rouge). */
  private showStrike(blades: Segment[], touched: Silhouette[]): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.prompt - 2);
    g.lineStyle(1, 0xf3e6c8, 0.35);
    for (const b of blades) g.lineBetween(b.a.x, b.a.y, b.b.x, b.b.y);
    const last = blades[blades.length - 1];
    g.lineStyle(1, 0xffffff, 1).lineBetween(last.a.x, last.a.y, last.b.x, last.b.y);
    g.lineStyle(1, 0xd0402a, 1);
    for (const s of touched) g.strokeRect(s.box.left, s.box.top, s.box.right - s.box.left, s.box.bottom - s.box.top);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: combat.feel.debugMs, onComplete: () => g.destroy() });
  }

  /** ?debug : les dégâts au-dessus de la cible, qui montent et s'effacent. */
  private showDamage(q: PlacedProp, dmg: number): void {
    const text = this.scene.add
      .text(q.x + q.image.width / 2, q.top - 2, String(dmg).replace('.', ','), { fontFamily: UI.font, fontSize: '8px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setResolution(ZOOM_STEPS.max)
      .setDepth(DEPTH.prompt - 1);
    this.scene.tweens.add({ targets: text, y: text.y - 8, alpha: 0, duration: combat.feel.debugMs, ease: 'Quad.easeIn', onComplete: () => text.destroy() });
  }
}
