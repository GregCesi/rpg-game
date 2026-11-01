import Phaser from 'phaser';
import { COMBAT, DEBUG, DEPTH, UI, ZOOM_STEPS } from '../config';
import { combat, gestures, items, stamina } from '../content';
import { itemMass } from '../content/mass';
import type { Attack, Facing, Weapon } from '../content/types';
import type { Player } from '../entities/Player';
import type { SwingOptions } from '../entities/ToolUse';
import { game } from '../state';
import type { GameMap, PlacedProp } from '../world/GameMap';
import { attackCost, damage, precision, footprint, frameDurations, hitsBox, reachCm, stanceFor, timing, zonePolygon, type Grip } from '../world/strike';
import type { HarvestSystem } from './harvest';

/** Une attaque prête à jouer : laquelle, avec quelle arme, son prix, et ce que reçoit le geste (planche de l'arme, durées). */
export interface AttackPlan {
  key: string;
  attack: Attack;
  item: string;
  weapon: Weapon;
  kg: number;
  cost: number;
  swing: SwingOptions;
}

/** Ce qu'a fait un coup (les tests le lisent, ?debug le montre) : l'attaque, l'arme, la portée (cm), le prix, les dégâts, ce qu'il a touché. */
export interface StrikeLog {
  attack: string;
  item: string;
  facing: Facing;
  reach: number;
  cost: number;
  damage: number;
  /** Précision de l'arme (0 à 1) : calculée, montrée, pas encore jouée. */
  precision: number;
  hits: { id: number; type: string; damage: number }[];
}

/**
 * Le combat (docs/CONCEPTION.md, « Le combat ») : Espace avec une arme en main (la main active, ou l'autre si l'active est vide), dans
 * le vide comme sur une cible : le geste complet se joue toujours et se paie. L'arme est des données (`weapon` de
 * items.json), l'attaque aussi (combat.json) ; le corps joue le geste de l'attaque (gestures.json, qui ne sait pas ce que tient
 * Xéros) avec l'arme posée sur la main dans l'angle de chaque image (entities/ToolUse.ts). Tout se calcule dans world/strike.ts :
 * la posture qui sert, les durées, la portée, les dégâts, le prix, la zone. À l'impact, ce qui porte un `target` (props.json) et
 * que la zone touche réagit : il tremble, recule un peu et penche, sa matière vole ; avec ?debug, les dégâts s'écrivent au-dessus
 * et la zone se dessine. Un deuxième Espace pendant le geste, ou peu après (`combo` de l'attaque), enchaîne l'attaque suivante de
 * la posture. Ne lit pas le clavier : la scène dit quand.
 */
export class CombatSystem {
  /** Chaque coup porté, dans l'ordre (les tests, ?debug). */
  readonly log: StrikeLog[] = [];
  /** Une attaque est en cours (du premier temps à la fin de la récupération). */
  busy = false;
  /** Où en est l'enchaînement : la place de la dernière attaque dans la suite de sa posture, avec quelle arme, jusqu'à quand il tient. */
  private chainAt = -1;
  private chainItem?: string;
  private comboUntil = 0;
  /** Espace a été appuyé pendant l'attaque en cours : la suivante partira à sa fin. */
  private queued = false;
  /** La réaction en cours de chaque cible touchée. */
  private readonly reacting = new Map<PlacedProp, Phaser.Tweens.Tween>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
    private readonly harvest: HarvestSystem,
  ) {}

  /** Ce que tiennent les mains, pour la posture : l'arme `item` à deux mains, ou ce que tient la main qui ne la tient pas. */
  private grip(item: string): Grip {
    if (game.both) return { other: 'empty', both: true };
    const own = game.hands[game.active];
    const mine = own && 'item' in own && own.item === item ? game.active : 1 - game.active;
    const other = game.hands[1 - mine];
    if (!other) return { other: 'empty', both: false };
    return { other: 'item' in other && items[other.item].weapon ? 'weapon' : 'other', both: false };
  }

  /** L'attaque que jouerait Espace à `time` avec l'arme `item` : la suivante de l'enchaînement s'il tient, sinon la première. */
  plan(item: string, time: number): AttackPlan {
    const weapon = items[item].weapon!;
    const chain = stanceFor(combat, weapon.family, this.grip(item)).chain;
    const at = this.chainItem === item && this.chainAt >= 0 && time <= this.comboUntil ? (this.chainAt + 1) % chain.length : 0;
    const key = chain[at];
    const attack = combat.attacks[key];
    const kg = itemMass(item);
    const frames = gestures[attack.gesture].poses.right.length;
    return {
      key,
      attack,
      item,
      weapon,
      kg,
      cost: attackCost(stamina.costs, attack, kg),
      swing: { weapon: weapon.image, durations: frameDurations(frames, gestures[attack.gesture].impact, timing(combat.rules, attack, weapon, kg)) },
    };
  }

  /** L'attaque part : elle prend sa place dans l'enchaînement. */
  begin(p: AttackPlan): void {
    const chain = stanceFor(combat, p.weapon.family, this.grip(p.item)).chain;
    this.chainAt = chain.indexOf(p.key);
    this.chainItem = p.item;
    this.busy = true;
    this.queued = false;
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

  /** Interrompt l'enchaînement (changement de carte, de mains) : la prochaine attaque repart de la première. */
  reset(): void {
    this.busy = false;
    this.queued = false;
    this.chainAt = -1;
  }

  /** L'impact : la zone de coup au sol, ce qu'elle touche, leurs réactions ; noté dans `log`. */
  impact(player: Player, p: AttackPlan): StrikeLog {
    const { x, y, facing } = player.actor;
    const reach = reachCm(combat.rules, p.weapon);
    const zone = zonePolygon(p.attack.zone, { x, y }, facing, reach);
    const dmg = damage(combat.rules, p.attack, p.weapon, p.kg);
    const hits = this.map.props.filter((q) => q.def.target && q.image.visible && hitsBox(zone, footprint(q.def.dims, q.baseX, q.baseY)));
    for (const q of hits) {
      this.react(q, facing);
      if (DEBUG) this.showDamage(q, dmg);
    }
    if (DEBUG) this.showZone(zone);
    const entry: StrikeLog = { attack: p.key, item: p.item, facing, reach, cost: p.cost, damage: dmg, precision: precision(combat.rules, p.weapon, p.kg), hits: hits.map((q) => ({ id: q.id, type: q.type, damage: dmg })) };
    this.log.push(entry);
    return entry;
  }

  /**
   * La cible touchée : elle recule un peu et penche autour de son pied, du côté opposé à Xéros (de face ou de dos : elle recule vers
   * le nord ou le sud et penche un peu d'un côté au hasard), en tremblant, puis revient ; sa matière vole (`fx-<matter>`).
   */
  private react(q: PlacedProp, facing: Facing): void {
    const t = q.def.target!;
    const img = q.image;
    // un coup pendant la réaction d'avant : elle revient d'abord à sa place
    this.reacting.get(q)?.stop();
    img.setOrigin(0.5, 1).setPosition(q.x + img.width / 2, q.y).setAngle(0);
    const side = facing === 'right' ? 1 : facing === 'left' ? -1 : 0;
    const lean = side !== 0 ? side * t.tilt : (Math.random() < 0.5 ? -1 : 1) * t.tilt * 0.5;
    const dx = side * COMBAT.recoilPx;
    const dy = facing === 'down' ? COMBAT.recoilPx : facing === 'up' ? -COMBAT.recoilPx : 0;
    const cx = img.x;
    const restore = () => {
      img.setOrigin(0, 1).setPosition(q.x, q.y).setAngle(0);
      this.reacting.delete(q);
    };
    // v monte de 0 à 1 puis redescend : la cible penche et recule, et tremble d'un pixel tant qu'elle n'est pas revenue
    let step = 0;
    const tween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: COMBAT.reactMs / 2,
      ease: 'Quad.easeOut',
      yoyo: true,
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        const jitter = v > 0.15 ? (step++ % 4 < 2 ? COMBAT.shakePx : -COMBAT.shakePx) : 0;
        img.setAngle(lean * v).setPosition(cx + dx * v + jitter, q.y + dy * v);
      },
      onComplete: restore,
      onStop: restore,
    });
    this.reacting.set(q, tween);
    this.harvest.chipsAt(q.x + img.width / 2, q.y - img.height * 0.55, q.y + 1, t.matter, facing);
  }

  /** ?debug : les dégâts au-dessus de la cible, qui montent et s'effacent. */
  private showDamage(q: PlacedProp, dmg: number): void {
    const text = this.scene.add
      .text(q.x + q.image.width / 2, q.top - 2, String(dmg).replace('.', ','), { fontFamily: UI.font, fontSize: '8px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setResolution(ZOOM_STEPS.max)
      .setDepth(DEPTH.prompt - 1);
    this.scene.tweens.add({ targets: text, y: text.y - 8, alpha: 0, duration: COMBAT.debugMs, ease: 'Quad.easeIn', onComplete: () => text.destroy() });
  }

  /** ?debug : la zone de coup, au sol, un instant. */
  private showZone(zone: { x: number; y: number }[]): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.prompt - 2);
    g.fillStyle(0xf3e6c8, 0.25).lineStyle(1, 0xf3e6c8, 0.8);
    g.fillPoints(zone, true).strokePoints(zone, true);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: COMBAT.debugMs, onComplete: () => g.destroy() });
  }
}
