import Phaser from 'phaser';
import { DEBUG, DEPTH, UI, ZOOM_STEPS } from '../config';
import { combat, items, props, stamina } from '../content';
import { itemMass } from '../content/mass';
import type { Attack, Facing, SweepDef, Weapon } from '../content/types';
import type { Player } from '../entities/Player';
import { combatPoses } from '../generated/combatPoses';
import { game } from '../state';
import type { GameMap } from '../world/GameMap';
import { boxOf } from '../world/build';
import { CM_PER_PX } from '../content/gabarit';
import type { Target as TargetDef } from '../content/types';
import {
  aimShift,
  attackCost,
  strikeEnergy,
  damage,
  directionOf,
  footprint,
  frameDurations,
  NO_SHIFT,
  precision,
  reachCm,
  stanceFor,
  sweepAt,
  zoneHits,
  type CombatFrame,
  type Grip,
  type Box,
  type Point,
  type Segment,
  type Shift,
} from '../world/strike';
import type { HarvestSystem } from './harvest';

/**
 * Une cible sur la carte, quelle que soit la façon dont elle a été posée : un objet de la carte (Tiled, ?dieu, né pendant la partie :
 * `map.props`) ou une pièce posée en mode construction (le catalogue, un plan, la sauvegarde : `map.builds`). `key` : unique sur la
 * carte ; `box` : son emprise au sol (px) ; `image` : ce qui réagit ; `x`, `y` : le coin bas gauche de son image au repos.
 */
interface Target {
  key: string;
  type: string;
  def: TargetDef;
  box: Box;
  image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  x: number;
  y: number;
}

/** Ce qui frappe : une arme possédable (`item`), ou la main nue (`fist`, combat.json `unarmed`). */
export type Striker = { item: string } | { fist: true };

/**
 * Une attaque prête à jouer : laquelle, avec quoi, ses images dans la direction de Xéros et leurs durées, où elle frappe au sol
 * (`sweep`), son prix, ses dégâts, sa précision et l'écart tiré pour ce coup (au sol, et à l'écran pour l'arme dessinée).
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
  sweep: SweepDef;
  /** Son énergie, en joules (strike.ts `strikeEnergy`). */
  joules: number;
  /** Son prix au plafond et au souffle (au joule, comme le travail). */
  cost: { ceiling: number; breath: number };
  damage: number;
  precision: number;
  shift: Shift;
  drawShift: Point;
  /** Les cibles déjà touchées par ce coup : une cible ne prend qu'un coup par frappe. */
  touched: Set<string>;
  /** Les cibles que la zone aurait touchées sans l'écart, et que l'écart a fait manquer : « raté » à la fin du coup. */
  missed: Map<string, Target>;
}

/** Ce qu'a fait un coup (les tests le lisent). */
export interface StrikeLog {
  attack: string;
  /** L'arme (clé d'items.json), ou `fist`. */
  item: string;
  facing: Facing;
  reach: number;
  /** Son prix au plafond du jour (au joule). */
  cost: number;
  /** Son énergie, en joules. */
  joules: number;
  damage: number;
  precision: number;
  shift: Shift;
  hits: { key: string; type: string; damage: number; step: number }[];
  misses: string[];
}

/**
 * Le combat (docs/CONCEPTION.md, « Le combat ») : Espace avec une arme en main (la main active, ou l'autre si l'active est vide), ou,
 * la main active vide et l'autre sans arme ni outil, la main nue : le geste complet se joue toujours et se paie, dans le vide comme sur
 * une cible. L'arme est des données (`weapon` d'items.json ; la main nue, `unarmed` de combat.json), l'attaque et son geste aussi
 * (combat.json : `attacks`, `sweeps`) ; le corps joue le geste (COMBAT_POSES) avec l'arme dessinée dans la main droite
 * (entities/ToolUse.ts). La zone de coup est calculée au sol, dans le monde (world/strike.ts) : à chaque image active, ce que l'arme
 * balaie devant Xéros depuis l'image d'avant, décalé de l'écart que laisse la précision ; une cible (`target` de props.json) dont
 * l'emprise au sol y entre est touchée, une seule fois par coup : arrêt sur image, elle penche et recule, sa matière vole, l'écran
 * tremble sur un gros coup, et le chiffre des dégâts s'envole au-dessus d'elle ; une cible que l'écart a fait manquer affiche
 * « raté ». Avec ?debug, la zone de chaque image active, au sol, en rouge. Un deuxième Espace pendant le geste, ou peu après
 * (`combo`), enchaîne l'attaque suivante de la posture. Ne lit pas le clavier.
 */
export class CombatSystem {
  /** Chaque coup porté, dans l'ordre (les tests). */
  readonly log: StrikeLog[] = [];
  /** Une attaque est en cours (de la garde à la fin du retour). */
  busy = false;
  /** Le tirage de l'écart de chaque coup (la précision) : Math.random en jeu ; un test peut le fixer. */
  rand: () => number = Math.random;
  /** Où en est l'enchaînement : la place de la dernière attaque dans la suite de sa posture, avec quoi, jusqu'à quand il tient. */
  private chainAt = -1;
  private chainWith?: string;
  private comboUntil = 0;
  /** Espace a été appuyé pendant l'attaque en cours : la suivante partira à sa fin. */
  private queued = false;
  /** La réaction en cours de chaque cible touchée. */
  private readonly reacting = new Map<string, Phaser.Tweens.Tween>();
  /** Où est l'image de chaque cible au repos (avant sa réaction en cours) : elle y revient. */
  private readonly rest = new Map<string, { x: number; y: number }>();

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
    const sweep = combat.sweeps[attack.gesture];
    const rules = combat.rules;
    const shift = aimShift(rules, weapon, kg, this.rand);
    // l'écart se voit : l'arme dessinée est décalée d'autant pendant les images actives (en travers vers sa droite, en long devant)
    const ahead = directionOf(facing, 0);
    const right = directionOf(facing, 90);
    const drawShift = { x: Math.round(right.x * shift.side + ahead.x * shift.far), y: Math.round(right.y * shift.side + ahead.y * shift.far) };
    return {
      key,
      attack,
      striker: s,
      weapon,
      kg,
      facing,
      frames,
      durations: frameDurations(rules, frames, weapon, kg),
      sweep,
      joules: strikeEnergy(rules, attack, sweep, combatPoses[attack.gesture].down, weapon, kg),
      cost: attackCost(stamina.work, strikeEnergy(rules, attack, sweep, combatPoses[attack.gesture].down, weapon, kg)),
      damage: damage(rules, attack, sweep, combatPoses[attack.gesture].down, weapon, kg),
      precision: precision(rules, weapon, kg),
      shift,
      drawShift,
      touched: new Set(),
      missed: new Map(),
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
      reach: reachCm(p.sweep, p.weapon),
      cost: p.cost.ceiling,
      joules: p.joules,
      damage: p.damage,
      precision: p.precision,
      shift: p.shift,
      hits: [],
      misses: [],
    });
  }

  /** Espace pendant l'attaque : la suivante partira à sa fin. */
  queue(): void {
    if (this.busy) this.queued = true;
  }

  /**
   * La fin du geste, à `time` : les cibles que l'écart a fait manquer affichent « raté » ; l'enchaînement tient `combo` ms. Rend vrai si
   * Espace a été appuyé pendant le geste (enchaîner tout de suite).
   */
  end(p: AttackPlan, time: number): boolean {
    for (const [key, q] of p.missed) {
      if (p.touched.has(key)) continue;
      this.log[this.log.length - 1]?.misses.push(key);
      this.float(q, 'raté');
    }
    this.busy = false;
    this.comboUntil = time + p.attack.combo;
    const q = this.queued;
    this.queued = false;
    return q;
  }

  /**
   * Les cibles de la carte : les objets de la carte et les pièces posées en mode construction qui portent un `target` (props.json),
   * visibles. Une cible posée par le catalogue, un plan ou la sauvegarde compte comme une posée dans Tiled ou par ?dieu.
   */
  targets(): Target[] {
    const out: Target[] = [];
    for (const q of this.map.props) {
      if (!q.def.target || !q.image.visible) continue;
      out.push({ key: `prop:${q.id}`, type: q.type, def: q.def.target, box: footprint(q.def.dims, q.baseX, q.baseY), image: q.image, x: q.x, y: q.y });
    }
    for (const b of this.map.builds) {
      const ref = b.piece.piece;
      if (!('prop' in ref) || !b.image.visible) continue;
      const def = props[ref.prop];
      if (!def?.target) continue;
      const c = boxOf(b.piece);
      const box = { left: c.x / CM_PER_PX, top: c.y / CM_PER_PX, right: (c.x + c.w) / CM_PER_PX, bottom: (c.y + c.d) / CM_PER_PX };
      out.push({ key: `build:${b.piece.id}`, type: ref.prop, def: def.target, box, image: b.image, x: b.image.x, y: b.image.y });
    }
    return out;
  }

  /**
   * Une image du coup `p` (son indice `step`) : si elle est active, la zone qu'elle balaie au sol ; chaque cible dont l'emprise y
   * entre, pas encore touchée par ce coup, l'est : le ressenti, le chiffre des dégâts, le journal ; une cible que l'écart seul fait
   * manquer est notée pour « raté ».
   */
  strike(player: Player, p: AttackPlan, step: number): void {
    if (!p.sweep.active.includes(step)) return;
    const feet = { x: player.actor.x, y: player.actor.y };
    const hit: Target[] = [];
    for (const q of this.targets()) {
      if (p.touched.has(q.key)) continue;
      if (zoneHits(p.sweep, p.weapon, p.facing, feet, step, q.box, p.shift)) {
        p.touched.add(q.key);
        p.missed.delete(q.key);
        hit.push(q);
      } else if (zoneHits(p.sweep, p.weapon, p.facing, feet, step, q.box, NO_SHIFT)) p.missed.set(q.key, q);
    }
    if (DEBUG) this.showZone(sweepAt(p.sweep, p.weapon, p.facing, feet, step, p.shift), p.sweep.width);
    if (!hit.length) return;
    const entry = this.log[this.log.length - 1];
    const feel = combat.feel;
    // l'arrêt sur image : le geste se fige, puis la cible réagit
    player.tools.hold(feel.hitStopMs);
    if (p.damage >= feel.shakeFrom) this.scene.cameras.main.shake(feel.shakeMs, feel.shakeIntensity);
    for (const q of hit) {
      entry?.hits.push({ key: q.key, type: q.type, damage: p.damage, step });
      this.scene.time.delayedCall(feel.hitStopMs, () => this.react(q, p.facing));
      this.float(q, String(p.damage).replace('.', ','));
    }
  }

  /**
   * La cible touchée : elle recule un peu et penche autour de son pied, du côté opposé à Xéros (de face ou de dos : elle recule vers
   * le nord ou le sud et penche un peu d'un côté au hasard), en tremblant, puis revient ; sa matière vole (`fx-<matter>`).
   */
  private react(q: Target, facing: Facing): void {
    const t = q.def;
    const img = q.image;
    const feel = combat.feel;
    // un coup pendant la réaction d'avant : elle revient d'abord à sa place
    this.reacting.get(q.key)?.stop();
    const home = this.rest.get(q.key) ?? { x: q.x, y: q.y };
    this.rest.set(q.key, home);
    img.setOrigin(0.5, 1).setPosition(home.x + img.width / 2, home.y).setAngle(0);
    const side = facing === 'right' ? 1 : facing === 'left' ? -1 : 0;
    const lean = side !== 0 ? side * t.tilt : (Math.random() < 0.5 ? -1 : 1) * t.tilt * 0.5;
    const dx = side * feel.recoilPx;
    const dy = facing === 'down' ? feel.recoilPx : facing === 'up' ? -feel.recoilPx : 0;
    const cx = img.x;
    const restore = () => {
      img.setOrigin(0, 1).setPosition(home.x, home.y).setAngle(0);
      this.reacting.delete(q.key);
      this.rest.delete(q.key);
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
        img.setAngle(lean * v).setPosition(cx + dx * v + jitter, home.y + dy * v);
      },
      onComplete: restore,
      onStop: restore,
    });
    this.reacting.set(q.key, tween);
    this.harvest.chipsAt(home.x + img.width / 2, home.y - img.height * 0.55, home.y + 1, t.matter, facing);
  }

  /** ?debug : la zone de coup d'une image active, au sol : ce que balaie l'arme (ses lames, de la largeur de ce qui frappe), en rouge. */
  private showZone(blades: Segment[], width: number): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.shadow + 0.01);
    g.lineStyle(Math.max(1, width / 5), 0xd0402a, 0.35);
    for (const b of blades) g.lineBetween(b.a.x, b.a.y, b.b.x, b.b.y);
    const tips = blades.map((b) => b.b);
    g.lineStyle(1, 0xd0402a, 1).strokePoints([blades[0].a, ...tips, blades[0].a], true);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: combat.feel.debugMs, onComplete: () => g.destroy() });
  }

  /** Le chiffre des dégâts (ou « raté ») s'envole au-dessus de la cible et s'efface. */
  private float(q: Target, label: string): void {
    const home = this.rest.get(q.key) ?? { x: q.x, y: q.y };
    const text = this.scene.add
      .text(home.x + q.image.width / 2, home.y - q.image.height - 2, label, { fontFamily: UI.font, fontSize: '8px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setResolution(ZOOM_STEPS.max)
      .setDepth(DEPTH.prompt - 1);
    this.scene.tweens.add({ targets: text, y: text.y - 10, alpha: 0, duration: combat.feel.floatMs, ease: 'Quad.easeIn', onComplete: () => text.destroy() });
  }
}
