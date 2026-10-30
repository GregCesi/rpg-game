import Phaser from 'phaser';
import { HUD, START, TURN_PRESS, ZOOM } from '../config';
import { items, maps, props } from '../content';
import { heldMass, itemMass, propMass } from '../content/mass';
import type { DialogueAction, Exit, Facing, Stance } from '../content/types';
import type { Look } from '../entities/Hold';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { GameEvent, type DieuCommand } from '../events';
import { AutoSave } from '../systems/autosave';
import { EffortSystem } from '../systems/effort';
import { findExit } from '../systems/exits';
import { HarvestSystem, type HitResult } from '../systems/harvest';
import { HandsSystem } from '../systems/hands';
import { InteractionSystem } from '../systems/InteractionSystem';
import { KnotSystem } from '../systems/knot';
import { LongPress } from '../systems/longPress';
import { PileCount } from '../systems/pileCount';
import { Roofs } from '../systems/roofs';
import { RollSystem } from '../systems/roll';
import { TurnSystem } from '../systems/turnLog';
import { carriedMass, heavyNotice } from '../systems/weight';
import {
  canTake,
  clearHeld,
  clearSave,
  emptyHands,
  game,
  heldItem,
  mapState,
  newGame,
  release,
  removeGroundItem,
  replaceState,
  resetMap,
  sleep,
  switchHand,
  take,
  type Held,
} from '../state';
import { GameMap } from '../world/GameMap';
import type { Interactable, PlacedGround } from '../world/GameMap';

/**
 * Ce que fait le monde en ce moment. Une seule valeur à la fois : le joueur ne peut pas
 * marcher pendant un dialogue, ni ouvrir un dialogue pendant qu'il change de carte.
 * `use` : Xéros fait un geste (outil ou mains), il ne marche pas et ne prend pas de sortie.
 */
type Mode = 'play' | 'use' | 'dialogue' | 'transition';

/** Ce que reçoit la scène à son lancement : la carte, et le point d'apparition ou la position exacte (`at`, sauvegarde). */
export type WorldStart = { mapId: string; spawn?: string; at?: { x: number; y: number; facing: Facing }; wake?: boolean };

/** Comment un objet tenu se voit sur Xéros : son `hold` (items.json, ou `take` de props.json), sinon son icône à la main. */
function holdOf(h: Held): { stance: Stance; look: Look } {
  if ('prop' in h) {
    const t = props[h.prop].take!;
    return { stance: t.hold.stance, look: { image: t.hold.image, icon: t.icon } };
  }
  const it = items[h.item];
  const stance = it.hold?.stance ?? (it.hands === 2 ? 'carry' : 'hand');
  return { stance, look: { image: it.hold?.image, icon: it.icon } };
}

/** Une longueur en centimètres, dite en mètres : « 8 m », « 1,5 m ». */
function metres(cm: number): string {
  return `${String(Math.round(cm) / 100).replace('.', ',')} m`;
}

/**
 * Une carte avec le joueur dedans. La scène assemble et arbitre : chaque système fait une chose
 * (repérer un objet, trouver une sortie...) et c'est ici qu'on décide quoi en faire selon le mode.
 */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private map!: GameMap;
  private interaction!: InteractionSystem;
  private harvest!: HarvestSystem;
  private handsSystem!: HandsSystem;
  private knots!: KnotSystem;
  private press!: LongPress;
  private pileCount!: PileCount;
  private roofs!: Roofs;
  private roll!: RollSystem;
  private effort!: EffortSystem;
  private turns!: TurnSystem;
  /** R maintenu : pivoter une bille couchée. */
  private turnPress!: LongPress;
  /** Champ « force » des outils de test (?dieu) : garde sa valeur d'une carte à l'autre. */
  private force = 1;
  /** Case « endurance infinie » des outils de test (?dieu) : garde sa valeur d'une carte à l'autre. */
  private infinite = false;
  private autosave!: AutoSave;
  /** Le personnage à qui Xéros parle en ce moment (mode dialogue). */
  private talking?: Npc;
  private mode: Mode = 'play';
  /** Espace ignoré jusque-là : l'appui qui ferme un dialogue ne doit pas lancer un geste. */
  private useLockedUntil = 0;
  private mapId = START.map;
  private spawn = START.spawn;
  /** Position exacte où reprendre (sauvegarde) ; sinon le point d'apparition. */
  private at?: WorldStart['at'];
  /** On arrive d'une nuit de sommeil : le jour est dit à l'écran. */
  private wake = false;

  constructor() {
    super('world');
  }

  init(data: Partial<WorldStart>): void {
    if (data.mapId) this.mapId = data.mapId;
    if (data.spawn) this.spawn = data.spawn;
    this.at = data.at;
    this.wake = !!data.wake;
    this.mode = 'play';
    this.talking = undefined;
  }

  create(): void {
    const def = maps[this.mapId];
    if (!def) throw new Error(`Carte inconnue : ${this.mapId}`);
    const sp = this.at ?? def.spawns[this.spawn];
    if (!sp) throw new Error(`Carte ${def.id} : point d'apparition '${this.spawn}' inconnu`);

    // la carte telle que la partie l'a laissée : objets récoltés, objets au sol
    this.map = new GameMap(this, def, mapState(game, def.id));
    this.physics.world.setBounds(0, 0, this.map.width, this.map.height);

    this.player = new Player(this, sp.x, sp.y);
    if (sp.facing) this.player.actor.face(sp.facing);
    this.physics.add.collider(this.player.actor, this.map.floor);
    this.physics.add.collider(this.player.actor, this.map.obstacles);

    const npcs = def.npcs.map((n) => new Npc(this, n));
    for (const n of npcs) this.physics.add.collider(this.player.actor, n.actor);
    const talkable: Interactable[] = npcs.map((n) => ({
      x: n.actor.x,
      y: n.actor.y - 4, // au centre de la collision des pieds
      top: n.actor.y - n.actor.height,
      action: { kind: 'talk', dialogue: n.dialogue, npc: n },
    }));
    // les deux mains prises par un seul objet : E ne fait que parler, ou reposer ce qu'on tient ; un objet du monde dans
    // la main active (le rouleau) peut se poser sur ce qui l'accepte (le billot)
    this.interaction = new InteractionSystem(this, this.player, () => {
      if (game.both) return talkable;
      const h = game.hands[game.active];
      return [...this.map.interactables(h && 'prop' in h ? h.prop : undefined), ...talkable];
    });
    this.harvest = new HarvestSystem(this, this.map);
    this.handsSystem = new HandsSystem(this, this.map, npcs.map((n) => n.actor.body));
    this.knots = new KnotSystem(this.map, this.handsSystem);
    this.press = new LongPress(this);
    this.pileCount = new PileCount(this, this.map);
    this.roofs = new Roofs(this.map);
    this.effort = new EffortSystem((t) => this.notice(t), () => this.game.events.emit(GameEvent.StaminaDenied));
    this.roll = new RollSystem(this.map, npcs.map((n) => n.actor.body), (t) => this.notice(t), () => this.effort.exhausted());
    this.turns = new TurnSystem(this.map, this.roll, npcs.map((n) => n.actor.body), this);
    this.turnPress = new LongPress(this, TURN_PRESS.ms);
    this.player.strength.multiplier = this.force;
    this.player.stamina.infinite = this.infinite;
    this.player.stamina.onChange = () => this.game.events.emit(GameEvent.Stamina, this.player.stamina.fraction);
    this.dropHeavy();
    // ce qu'il portait sur la carte d'avant
    this.handsChanged();
    this.game.events.emit(GameEvent.Stamina, this.player.stamina.fraction);
    if (this.wake) this.game.events.emit(GameEvent.Notice, `Jour ${game.day}`, HUD.longNoticeMs / 2);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, this.map.width, this.map.height);
    cam.startFollow(this.player.actor, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.fadeIn(220, 20, 14, 8);

    // la partie est écrite à l'arrivée sur la carte, puis à chaque changement, et quand la page se cache ou se ferme
    this.autosave = new AutoSave(def, this.player);
    this.autosave.update(true);
    const saveNow = () => {
      this.roll.flush();
      this.player.stamina.flush();
      this.autosave.update(true);
    };
    const saveIfHidden = () => document.visibilityState === 'hidden' && saveNow();
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', saveIfHidden);

    this.game.events.on(GameEvent.DialogueEnd, this.onDialogueEnd, this);
    this.game.events.on(GameEvent.Dieu, this.dieu, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvent.DialogueEnd, this.onDialogueEnd, this);
      this.game.events.off(GameEvent.Dieu, this.dieu, this);
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', saveIfHidden);
    });
  }

  update(time: number, delta: number): void {
    // ce qui a changé à l'image d'avant (un coup porté, un objet posé...) est écrit maintenant
    this.autosave.update();
    this.player.update(this.mode === 'play');
    // courir et porter puisent dans l'endurance
    this.effort.update(this.player, delta, this.mode === 'play');
    // pousser une bille : après le clavier, il reprend la main sur la vitesse et la posture de Xéros
    this.roll.update(this.player, delta, this.mode === 'play');
    // le toit sous lequel (ou derrière lequel) est Xéros s'efface, dans tous les modes
    this.roofs.update(this.player, delta);
    if (this.mode === 'play') {
      const exit = findExit(this.player, this.map.def.exits);
      if (exit) this.travel(exit);
    }
    // Espace, Q, Tab et R toujours lus, comme E : sinon un appui fait pendant un dialogue ressortirait juste après
    const { input } = this.player;
    const use = input.usePressed();
    const drop = input.dropPressed();
    const swap = input.swapPressed();
    const turn = input.turnPressed();
    const e = this.interaction.update(time, this.mode === 'play');
    this.harvest.updatePrompt(time, this.player, this.player.hold.loaded ? undefined : this.usable(), this.mode === 'play');
    // ce qu'on tient et qui s'entrepose : sa pièce en transparence, là où elle ira
    this.handsSystem.updatePreview(this.player, this.mode === 'play');
    this.pileCount.update(this.player, this.mode === 'play');
    if (this.mode !== 'play') {
      this.turnPress.cancel();
      return this.press.cancel();
    }
    if (swap) {
      switchHand(game);
      this.handsChanged();
    }
    // R maintenu, mains vides, au contact d'une bille couchée : elle pivote d'un quart de tour (jauge comme pour nouer)
    const turnTarget = this.turns.target(this.player);
    const turned = this.turnPress.update(time, input.turnDown(), turnTarget, this.player);
    if (turned?.kind === 'long') this.turnLog(turned.target);
    if (this.turnPress.pending) return;
    if (turn && turnTarget) return this.turnPress.begin(turnTarget, time);
    // R : la bille portée tourne ; le fantôme suit à l'image suivante
    if (turn) this.handsSystem.turn();
    // E devant ce qui se noue ou se dénoue : l'appui attend, court (reprendre) ou maintenu (nouer, dénouer)
    const press = this.press.update(time, input.handsDown(), e.target, this.player);
    if (press?.kind === 'short') this.hands(press.target);
    else if (press?.kind === 'long') this.knot(press.target);
    else if (this.press.pending) return;
    else if (e.pressed && e.target && this.knots.holds(e.target.action)) this.press.begin(e.target, time);
    else if (e.pressed && e.target) this.hands(e.target);
    // E dans le vide (ou devant ce qu'on ne peut pas prendre) : reposer ce qu'on tient à deux mains
    else if (e.pressed && game.both) this.putDown();
    else if (drop) this.putDown();
    else if (use && time >= this.useLockedUntil) this.useHeld();
  }

  /** E devant une cible : parler, récolter à la main, prendre un objet du monde, reprendre d'un tas, ramasser. */
  private hands(target: Interactable): void {
    const a = target.action;
    if (a.kind === 'talk') {
      this.talking = a.npc;
      this.talking?.faceToward(this.player.actor.x, this.player.actor.y);
      this.openDialogue(a.dialogue);
    } else if (a.kind === 'harvest') {
      // ce qui va directement dans les mains (la hache du billot) : il faut les mains libres avant le geste
      const gives = a.prop.def.harvest!.drops.filter((d) => d.give);
      if (gives.some((d) => !canTake(game, items[d.item].hands))) return this.notice('Les mains pleines.');
      this.gesture(a.prop.def.harvest!.gesture, undefined, () => this.report(this.harvest.hit(a.prop, undefined, this.player.actor.facing)));
    } else if (a.kind === 'take') {
      const kg = propMass(a.prop.type, a.prop.length);
      if (!this.player.strength.canCarry(kg)) return this.notice(heavyNotice(a.prop.def, kg, this.player.strength));
      if (!this.canLift(kg)) return this.effort.exhausted();
      if (!this.handsSystem.takeProp(a.prop)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'pile') {
      const piece = a.pile.def.piece;
      const kg = 'item' in piece ? itemMass(piece.item) : propMass(piece.prop);
      if (!this.player.strength.canCarry(kg)) return this.notice(heavyNotice('prop' in piece ? props[piece.prop] : undefined, kg, this.player.strength));
      if (!this.canLift(kg)) return this.effort.exhausted();
      if (!this.handsSystem.takeFromPile(a.pile, a.place)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'tie') {
      if (!this.handsSystem.takeTie(a.pile)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'rest') {
      if (this.handsSystem.rest(a.prop)) this.handsChanged();
    } else if (a.kind === 'unload') {
      if (!this.handsSystem.unload(a.prop)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'pickup') {
      this.pickUp(a.ground);
    }
  }

  /** R maintenu jusqu'au bout devant une bille : elle pivote (si elle a la place), et cela coûte de l'endurance selon sa masse. */
  private turnLog(target: Interactable): void {
    const a = target.action;
    if (a.kind !== 'turn') return;
    if (this.player.stamina.empty) return this.effort.exhausted();
    const kg = this.turns.mass(a.prop);
    const why = this.turns.act(this.player, a.prop);
    if (why) return this.notice(why);
    this.player.stamina.spend(this.player.stamina.turnCost(kg));
  }

  /** E maintenu devant un tas ou un fagot : nouer ou dénouer ; sinon, ce qui manque se dit. */
  private knot(target: Interactable): void {
    if (this.player.stamina.empty) return this.effort.exhausted();
    const why = this.knots.act(target.action);
    if (why) this.notice(why);
    else this.player.stamina.spend(this.player.stamina.costs.knot);
  }

  /** Q, ou E quand on tient à deux mains : pose devant soi ce que tient la main active (en tas s'il s'entrepose), s'il y a la place. */
  private putDown(): void {
    const r = this.handsSystem.putDown(this.player);
    if (r === 'blocked') this.notice('Pas la place ici.');
    if (r === 'done') this.handsChanged();
  }

  /** Une sauvegarde où Xéros tient plus qu'il ne porte (d'avant les masses) : le plus lourd est posé au sol devant lui, la partie continue. */
  private dropHeavy(): void {
    const slots = (): { slot: 'both' | 0 | 1; held: Held }[] =>
      [{ slot: 'both' as const, held: game.both }, { slot: 0 as const, held: game.hands[0] }, { slot: 1 as const, held: game.hands[1] }].filter(
        (s): s is { slot: 'both' | 0 | 1; held: Held } => !!s.held,
      );
    while (carriedMass(game) > this.player.strength.carry + 1e-9) {
      const heaviest = slots().sort((a, b) => heldMass(b.held) - heldMass(a.held))[0];
      this.handsSystem.layDown(this.player, heaviest.held);
      clearHeld(game, heaviest.slot);
      this.notice('Trop lourd à porter : posé devant toi.');
    }
  }

  /** Les mains ont changé : le HUD se redessine, ce que tient Xéros se voit sur lui. */
  private handsChanged(): void {
    this.player.strength.load = carriedMass(game);
    const [l, r] = game.hands;
    if (game.both) {
      const { stance, look } = holdOf(game.both);
      // à deux mains, la posture est `shoulder` ou `carry` (validate.ts)
      this.player.hold.set({ both: look, stance: stance as 'shoulder' | 'carry' });
    } else this.player.hold.set({ left: l ? holdOf(l).look : undefined, right: r ? holdOf(r).look : undefined });
    this.game.events.emit(GameEvent.HandsChanged);
  }

  private notice(text: string): void {
    this.game.events.emit(GameEvent.Notice, text);
  }

  /**
   * L'objet possédable que l'Espace utilise : celui de la main active, sinon celui de l'autre main (le coin pris dans la main
   * qui n'est pas la main active ne doit pas rester sans effet) ; rien à deux mains pour un objet du monde porté.
   */
  private usable(): string | undefined {
    const own = heldItem(game);
    if (own || game.both || game.hands[game.active]) return own;
    const other = game.hands[1 - game.active];
    return other && 'item' in other ? other.item : undefined;
  }

  /** Espace : le geste avec ce qu'on tient, même dans le vide. Une ressource en main ne fait rien ; chargé, rien non plus. */
  private useHeld(): void {
    if (this.player.hold.loaded) return;
    const tool = this.usable();
    if (!tool || items[tool].kind === 'resource') {
      // mains vides devant ce qui demande un outil : on le dit
      const t = this.harvest.target(this.player)?.def.harvest?.tool;
      if (t) this.report({ kind: 'missing', tool: t });
      return;
    }
    // le geste dépend de la cible : de côté sur ce qui est debout, de haut en bas sur ce qui est couché ; dans le vide, de côté
    const target = this.harvest.target(this.player, tool);
    const h = target?.def.harvest;
    const gesture = h?.gesture ?? 'use';
    // un outil que la cible écarte (la hache sur une grosse bille) ou une fente sans la place de s'ouvrir : on le dit, sans geste ni dépense
    const why = target && this.harvest.refusal(target, tool);
    if (why) return this.notice(why);
    // un outil qu'on plante (le coin) ne se joue pas dans le vide : sans cible à portée, on le dit
    if (!target && tool && Object.values(props).some((p) => p.harvest?.plant && p.harvest.tool === tool)) return this.notice('Rien où le planter : colle-toi à une grosse bille couchée.');
    // un coup qui porte coûte de l'endurance (le lien du billot un peu moins qu'un arbre) ; dans le vide ou sans le bon outil, rien
    const costs = this.player.stamina.costs;
    if (h?.tool === tool && !this.effort.afford(this.player, costs[h.effort ?? (target!.def.bears ? 'cutTie' : 'chop')])) return;
    const impact = () => {
      this.report(this.harvest.hit(this.harvest.target(this.player, tool), tool, this.player.actor.facing));
      // les morceaux d'une bille fendue débordent de sa place : Xéros est repoussé s'ils le recouvrent
      this.harvest.settle(this.player);
    };
    // le coin se plante d'un coup, sans geste ; sinon la cible est cherchée au moment du coup : celle qui est devant Xéros à l'impact
    if (h?.plant && h.tool === tool) return impact();
    this.gesture(gesture, tool, impact);
  }

  private gesture(gesture: string, item: string | undefined, onImpact: () => void): void {
    this.mode = 'use';
    this.player.tools.swing(gesture, item, onImpact, () => {
      if (this.mode === 'use') this.mode = 'play';
    });
  }

  private report(r: HitResult): void {
    if (r.kind === 'missing') this.game.events.emit(GameEvent.Notice, `Sans ${items[r.tool].name}, rien à faire.`);
    if (r.kind === 'refused') this.notice(r.message);
    if (r.kind !== 'hit') return;
    // l'outil est resté dans l'objet (le coin planté) : la main est libre
    if (r.released) {
      release(game);
      this.handsChanged();
    }
    if (r.given) this.handsChanged();
    if (r.overflow) this.game.events.emit(GameEvent.Notice, 'Les mains pleines.');
    // ce qui reste de ce qu'on vient de couper (le rouleau sur le billot)
    if (r.cut) {
      const name = props[r.cut.prop].name;
      const label = name[0].toUpperCase() + name.slice(1);
      this.notice(r.cut.remaining > 0 ? `${label} : ${metres(r.cut.remaining)} restants.` : `${label} : vide.`);
    }
  }

  /** Épuisé, Xéros ne prend pas ce qui l'obligerait à porter au-delà de ce qu'il porte sans peine : porter coûte à chaque pas. */
  private canLift(kg: number): boolean {
    const s = this.player.strength;
    return !this.player.stamina.empty || s.load + kg <= s.walk + 1e-9;
  }

  /** Prend un objet au sol dans une main libre (les deux s'il le demande). */
  private pickUp(g: PlacedGround): void {
    if (!this.player.strength.canCarry(itemMass(g.item.item))) return this.notice('Trop lourd à porter.');
    if (!this.canLift(itemMass(g.item.item))) return this.effort.exhausted();
    if (!take(game, { item: g.item.item }, items[g.item.item].hands)) return this.notice('Les mains pleines.');
    removeGroundItem(game, this.map.def.id, g.item.id);
    this.map.removeGround(g);
    this.handsChanged();
  }

  /** Une sortie est prise : la carte d'arrivée, à son point d'apparition. */
  private travel(exit: Exit): void {
    this.fadeTo({ mapId: exit.to, spawn: exit.spawn });
  }

  /** Fondu au noir, puis la scène redémarre sur `start`. */
  private fadeTo(start: WorldStart, ms = 200): void {
    this.mode = 'transition';
    this.player.stamina.flush();
    const cam = this.cameras.main;
    cam.fadeOut(ms, 20, 14, 8);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart(start));
  }

  /**
   * Outils de test (?dieu, GameEvent.Dieu) : tout passe par GameState, donc tout est sauvegardé comme le reste. Hors du
   * mode `play` (geste, dialogue, changement de carte), la commande est refusée.
   */
  private dieu(cmd: DieuCommand): void {
    if (this.mode !== 'play') return this.notice('Pas pendant un geste ou un dialogue.');
    const mapId = this.map.def.id;
    const { x, y, facing } = this.player.actor;
    switch (cmd.kind) {
      case 'give': {
        const h = cmd.held;
        if (heldMass(h) > this.player.strength.carry) return this.notice(heavyNotice('prop' in h ? props[h.prop] : undefined, heldMass(h), this.player.strength));
        emptyHands(game);
        take(game, h, 'item' in h ? items[h.item].hands : props[h.prop].take!.hands);
        this.handsChanged();
        break;
      }
      case 'prop':
        if (!this.handsSystem.placeInFront(this.player, cmd.prop, cmd.length)) this.notice('Pas la place ici.');
        break;
      case 'pile': {
        const n = this.handsSystem.pileInFront(this.player, cmd.pile, cmd.count, cmd.turned, cmd.tie);
        if (n < 0) this.notice('Pas la place ici.');
        else if (n < cmd.count) this.notice(`Place pour ${n} seulement.`);
        break;
      }
      case 'force':
        this.force = cmd.multiplier;
        this.player.strength.multiplier = cmd.multiplier;
        break;
      case 'stamina':
        this.player.stamina.reset(cmd.value);
        break;
      case 'stamina-infinite':
        this.infinite = cmd.on;
        this.player.stamina.infinite = cmd.on;
        break;
      case 'map':
        this.fadeTo({ mapId: cmd.map, spawn: Object.keys(maps[cmd.map].spawns)[0] });
        break;
      case 'reset-map':
        resetMap(game, mapId);
        this.fadeTo({ mapId, at: { x, y, facing } });
        break;
      case 'reset-game':
        clearSave();
        replaceState(game, newGame());
        this.fadeTo({ mapId: START.map, spawn: START.spawn });
        break;
    }
  }

  private openDialogue(id: string): void {
    this.mode = 'dialogue';
    this.scene.launch('dialogue', { id });
  }

  /** « Dormir ? » -> Oui : fondu au noir, jauge pleine, un jour de plus, réveil dans le cagibi (la partie s'écrit à l'arrivée). */
  private sleepNow(): void {
    this.talking = undefined;
    this.player.stamina.flush();
    sleep(game);
    this.fadeTo({ mapId: START.map, spawn: START.spawn, wake: true }, 1400);
  }

  private onDialogueEnd(action?: DialogueAction): void {
    this.mode = 'play';
    if (action === 'sleep') return this.sleepNow();
    this.talking?.resume();
    this.talking = undefined;
    this.interaction.lock(200);
    this.useLockedUntil = this.time.now + 200;
  }
}
