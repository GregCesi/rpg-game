import Phaser from 'phaser';
import { gestures, items, props, toolSheet } from '../content';
import { CM_PER_PX } from '../content/gabarit';
import type { Held } from '../state';
import { woodTexture } from '../world/woodTexture';
import type { Pose } from '../content/types';
import type { Actor } from './Actor';
import { weaponFrame, type CombatFrame, type Point } from '../world/strike';

/**
 * Un geste de combat (systems/combat.ts) : `frames`, ses images dans la direction de Xéros (COMBAT_POSES : main, arme, traînée,
 * éclat, frappe) ; `durations`, la durée de chaque image en ms (celle des poses, allongée par l'inertie de l'arme) ; `weapon`, la
 * planche de l'arme (`weapon-<…>`, un dessin en huit angles : l'image de l'angle de chaque image est posée sur la main droite ; absente
 * pour le poing) ; `shift`, l'écart du coup (la précision) : l'arme se voit décalée d'autant pendant les images de frappe ; `onStrike`,
 * appelé à chaque image de frappe (son indice), `onDone` à la fin.
 */
export interface FightOptions {
  frames: CombatFrame[];
  durations: number[];
  weapon?: string;
  /**
   * Un objet tenu sans planche d'arme (l'arme improvisée, world/heft.ts) : son image couchée est-ouest (l'image au sol, l'objet, la
   * pièce de bois) pivote à l'angle de chaque pose, tenue à `grip` cm de son bout ouest.
   */
  held?: Held;
  grip?: number;
  shift: Point;
  /** Les images où le coup compte (`active` du geste, combat.json `sweeps`) : `onStrike` y est appelé, et l'arme y est décalée. */
  active: number[];
  onStrike: (step: number) => void;
  onDone: () => void;
}

/**
 * Composant attaché à un Actor : un geste d'outil (clé de gestures.json : `use` de côté, `chop` de haut en bas),
 * soit l'animation `<geste>-<direction>` du corps, avec l'outil en main posé image par image : l'animation
 * `<geste>-<direction>` de la planche `tool-<objet>` (la gauche = la droite retournée), placée sur la main d'après gestures.json.
 * Sans planche ou sans cette animation pour l'objet tenu, le geste se joue les mains vides.
 * Un nouvel outil = une nouvelle planche, rien à changer ici.
 * Un geste de combat (`fight`, systems/combat.ts) : l'animation `<geste>-<direction>` du corps (la gauche a la sienne), à ses durées,
 * avec l'arme dans la main droite (l'image de l'angle de chaque pose, dans sa planche en huit angles), la traînée et l'éclat des
 * poses ; `hold` fige le geste un instant (l'arrêt sur image à l'impact).
 */
export class ToolUse {
  /** Vrai pendant le geste : le personnage ne marche pas. */
  busy = false;
  private readonly tool: Phaser.GameObjects.Image;
  /** La traînée et l'éclat d'un geste de combat. */
  private readonly smear: Phaser.GameObjects.Image;
  private readonly spark: Phaser.GameObjects.Image;
  /** La main qui tient l'arme, par-dessus le corps, quand l'arme passe derrière lui. */
  private readonly grip: Phaser.GameObjects.Image;
  /** Geste en cours et animation de l'outil (sans la direction), ex. 'chop' et 'tool-axe-chop'. */
  private gesture = 'use';
  private toolAnim?: string;
  /** Le geste de combat en cours. */
  private fightOpts?: FightOptions;
  /** Arrête le geste en cours sans son `onDone` (une passe sur un rail interrompue par Échap) ; absent hors d'un geste. */
  private stop?: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly actor: Actor,
  ) {
    this.tool = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.smear = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.spark = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.grip = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    actor.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => (this.fightOpts ? this.placeFight() : this.place()));
    actor.once(Phaser.GameObjects.Events.DESTROY, () => [this.tool, this.smear, this.spark, this.grip].forEach((o) => o.destroy()));
  }

  /**
   * Joue le geste `gesture` (clé de gestures.json) avec l'objet `item` en main (undefined = mains nues).
   * `onImpact` est appelé à l'image où le coup porte, `onDone` à la fin du geste ; `durations` : la durée de chaque image (ms), un coup
   * de travail (docs/CONCEPTION.md, « Le travail »).
   */
  swing(gesture: string, item: string | undefined, onImpact: () => void, onDone: () => void, durations?: number[]): void {
    const g = gestures[gesture];
    const dir = this.actor.facing === 'left' ? 'right' : this.actor.facing;
    const sheet = item ? toolSheet(item) : '';
    const anim = `${sheet}-${gesture}`;
    this.gesture = gesture;
    this.fightOpts = undefined;
    this.tool.setAngle(0);
    this.toolAnim = item && this.scene.anims.exists(`${anim}-${dir}`) ? anim : undefined;
    this.tool.setVisible(!!this.toolAnim);
    if (this.toolAnim) this.tool.setTexture(sheet);
    // un coup de travail : ses images aux durées de ses cinq temps (world/swing.ts) ; sinon celles du dessin
    const key = `${this.actor.skin}-${gesture}-${this.actor.facing}`;
    const frames = this.scene.anims.get(key)?.frames.length ?? 0;
    this.run(durations && durations.length === frames ? this.timed(key, durations) : key, (step) => step === g.impact && onImpact(), onDone);
    this.place();
  }

  /** Joue un geste de combat (voir FightOptions). */
  fight(gesture: string, o: FightOptions): void {
    this.fightOpts = o;
    this.toolAnim = undefined;
    this.tool.setAngle(0);
    this.tool.setVisible(!!o.weapon && this.scene.textures.exists(o.weapon));
    if (this.tool.visible) this.tool.setTexture(o.weapon!);
    else if (o.held) this.tool.setTexture(this.heldImage(o.held));
    this.run(this.timed(`${this.actor.skin}-${gesture}-${this.actor.facing}`, o.durations), (step) => o.active.includes(step) && o.onStrike(step), o.onDone);
    this.placeFight();
  }

  /** Fige le geste en cours `ms` millisecondes (l'arrêt sur image à l'impact), puis il reprend. */
  hold(ms: number): void {
    if (!this.busy || ms <= 0) return;
    this.actor.anims.pause();
    this.scene.time.delayedCall(ms, () => this.busy && this.actor.anims.resume());
  }

  /**
   * Lance l'animation `key` du corps : `onStep` à chaque nouvelle image (son indice), y compris celles qu'un ralentissement a fait
   * sauter, `onDone` à la fin ; le personnage ne marche pas.
   */
  private run(key: string, onStep: (step: number) => void, onDone: () => void): void {
    this.busy = true;
    this.actor.body.setVelocity(0, 0);
    this.actor.anims.timeScale = 1;
    // chaque image franchie compte, même si un ralentissement en fait sauter (une image de frappe ne se perd jamais)
    let last = 0;
    const reach = (step: number) => {
      for (let k = last + 1; k <= step; k++) onStep(k);
      last = Math.max(last, step);
    };
    const onFrame = (_a: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => reach(frame.index - 1);
    const end = () => {
      this.actor.off(Phaser.Animations.Events.ANIMATION_UPDATE, onFrame);
      this.actor.off(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key, complete);
      this.stop = undefined;
      this.tool.setVisible(false);
      this.smear.setVisible(false);
      this.spark.setVisible(false);
      this.grip.setVisible(false);
      this.fightOpts = undefined;
      this.busy = false;
      this.actor.face(this.actor.facing);
    };
    const complete = () => {
      reach(this.scene.anims.get(key).frames.length - 1);
      end();
      onDone();
    };
    this.stop = end;
    this.actor.on(Phaser.Animations.Events.ANIMATION_UPDATE, onFrame);
    this.actor.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key, complete);
    this.actor.play(key);
  }

  /** Interrompt le geste en cours, là où il en est : ni impact ni `onDone` ; le corps reprend sa pose. Sans geste, rien. */
  cancel(): void {
    this.stop?.();
  }

  /**
   * L'animation du corps `key` jouée à d'autres durées (ms par image) : une copie, créée à la première demande et gardée (une par
   * arme et par attaque : les durées dépendent de l'arme).
   */
  private timed(key: string, durations: number[]): string {
    const timedKey = `${key}@${durations.join('-')}`;
    if (this.scene.anims.exists(timedKey)) return timedKey;
    const base = this.scene.anims.get(key);
    // une image par milliseconde, plus sa durée propre (Phaser ajoute `duration` au temps d'une image)
    this.scene.anims.create({
      key: timedKey,
      frames: base.frames.map((f, i) => ({ key: f.textureKey, frame: f.textureFrame, duration: Math.max(0, (durations[i] ?? 1) - 1) })),
      frameRate: 1000,
      repeat: 0,
    });
    return timedKey;
  }

  /** Pose l'outil sur la main, pour l'image en cours du geste. */
  private place(): void {
    if (!this.busy || !this.tool.visible || !this.toolAnim) return;
    const step = (this.actor.anims.currentFrame?.index ?? 1) - 1;
    const left = this.actor.facing === 'left';
    const dir = left ? 'right' : (this.actor.facing as 'down' | 'up' | 'right');
    const pose: Pose = gestures[this.gesture].poses[dir][step];
    const frame = this.scene.anims.get(`${this.toolAnim}-${dir}`).frames[step].frame;
    this.tool
      .setFrame(frame.name)
      .setFlipX(left)
      // prise du manche au centre de l'image d'outil (arrondie vers le bas), posée sur la main
      .setOrigin(Math.floor(this.tool.width / 2) / this.tool.width, Math.floor(this.tool.height / 2) / this.tool.height)
      .setPosition(this.actor.x + (left ? -pose.dx : pose.dx), this.actor.y + pose.dy)
      // derrière le corps, devant lui, ou devant ce qui est frappé au sud des pieds (`ahead`)
      .setDepth(this.actor.y + (pose.behind ? -0.01 : Math.max(0.01, pose.ahead)));
  }

  /**
   * Pose l'arme, la traînée, l'éclat et la main par-dessus d'un geste de combat pour l'image en cours : l'arme dans l'angle de la
   * pose, sur la main droite (décalée de l'écart du coup pendant la frappe), devant ou derrière le corps (`weapon.behind`) ; derrière,
   * l'ordre est l'arme et sa traînée, le corps, puis la main (`grip`) ; vers la gauche, les images sont retournées et dx opposé (les poses de la gauche
   * sont dessinées dans ce repère).
   */
  private placeFight(): void {
    const o = this.fightOpts;
    if (!this.busy || !o) return;
    const step = (this.actor.anims.currentFrame?.index ?? 1) - 1;
    const f = o.frames[step];
    if (!f) return;
    const left = this.actor.facing === 'left';
    const sx = left ? -1 : 1;
    const shift = o.active.includes(step) ? o.shift : { x: 0, y: 0 };
    const centre = (img: Phaser.GameObjects.Image) => img.setOrigin(Math.floor(img.width / 2) / img.width, Math.floor(img.height / 2) / img.height);
    const y0 = this.actor.y;
    if (o.weapon && this.tool.texture.key === o.weapon && f.weapon) {
      const frame = this.scene.anims.get(`${o.weapon}-angles`).frames[weaponFrame(f.weapon.angle)].frame;
      centre(this.tool.setVisible(true).setFrame(frame.name).setFlipX(left))
        .setPosition(this.actor.x + sx * f.right.dx + shift.x, y0 + f.right.dy + shift.y)
        .setDepth(y0 + (f.weapon.behind ? -0.01 : 0.01));
    } else if (o.held && f.weapon) {
      // l'arme improvisée : son image couchée pivote autour de la main (l'angle de la pose : 0 vers l'est, 90 vers le nord)
      const g = (o.grip ?? 0) / CM_PER_PX / this.tool.width;
      this.tool
        .setVisible(true)
        .setFlipX(left)
        .setOrigin(left ? 1 - g : g, 0.5)
        .setAngle(left ? f.weapon.angle : -f.weapon.angle)
        .setPosition(this.actor.x + sx * f.right.dx + shift.x, y0 + f.right.dy + shift.y)
        .setDepth(y0 + (f.weapon.behind ? -0.01 : 0.01));
    } else this.tool.setVisible(false);
    // la traînée de cette arme, à sa longueur (`fx-smear-<arme>-<suffixe>`)
    const smearKey = f.smear && o.weapon ? `fx-smear-${o.weapon.replace(/^weapon-/, '')}-${f.smear.image}` : undefined;
    if (f.smear && smearKey && this.scene.textures.exists(smearKey)) {
      centre(this.smear.setTexture(smearKey).setVisible(true).setFlipX(left))
        .setPosition(this.actor.x + sx * f.smear.dx + shift.x, y0 + f.smear.dy + shift.y)
        .setDepth(y0 + (f.smear.behind ? -0.02 : 0.02));
    } else this.smear.setVisible(false);
    if (f.spark && this.scene.textures.exists(f.spark.image)) {
      centre(this.spark.setTexture(f.spark.image).setVisible(true).setFlipX(left))
        .setPosition(this.actor.x + sx * f.spark.dx + shift.x, y0 + f.spark.dy + shift.y)
        .setDepth(y0 + 0.03);
    } else this.spark.setVisible(false);
    // l'arme derrière le corps : la main qui la tient, par-dessus le corps (la poignée reste dans la main)
    if (o.weapon && f.grip && this.scene.textures.exists(f.grip.image)) {
      centre(this.grip.setTexture(f.grip.image).setVisible(true).setFlipX(left))
        .setPosition(this.actor.x + sx * f.grip.dx + shift.x, y0 + f.grip.dy + shift.y)
        .setDepth(y0 + 0.02);
    } else this.grip.setVisible(false);
  }

  /** L'image couchée est-ouest de ce qu'on tient : l'image au sol d'un objet possédable (son icône sans elle), l'objet du monde, la pièce de bois. */
  private heldImage(h: Held): string {
    if ('item' in h) return items[h.item].ground ?? items[h.item].icon;
    if (h.wood) return woodTexture(this.scene, { ...h.wood, axis: 'ew' });
    return props[h.prop].image;
  }
}
