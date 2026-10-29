import Phaser from 'phaser';
import { START, ZOOM } from '../config';
import { items, maps, props } from '../content';
import type { Exit, Stance } from '../content/types';
import type { Look } from '../entities/Hold';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { GameEvent } from '../events';
import { findExit } from '../systems/exits';
import { HarvestSystem, type HitResult } from '../systems/harvest';
import { HandsSystem } from '../systems/hands';
import { InteractionSystem } from '../systems/InteractionSystem';
import { canTake, game, heldItem, mapState, removeGroundItem, switchHand, take, type Held } from '../state';
import { GameMap } from '../world/GameMap';
import type { Interactable, PlacedGround } from '../world/GameMap';

/**
 * Ce que fait le monde en ce moment. Une seule valeur à la fois : le joueur ne peut pas
 * marcher pendant un dialogue, ni ouvrir un dialogue pendant qu'il change de carte.
 * `use` : Xéros fait un geste (outil ou mains), il ne marche pas et ne prend pas de sortie.
 */
type Mode = 'play' | 'use' | 'dialogue' | 'transition';

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
  /** Le personnage à qui Xéros parle en ce moment (mode dialogue). */
  private talking?: Npc;
  private mode: Mode = 'play';
  /** Espace ignoré jusque-là : l'appui qui ferme un dialogue ne doit pas lancer un geste. */
  private useLockedUntil = 0;
  private mapId = START.map;
  private spawn = START.spawn;

  constructor() {
    super('world');
  }

  init(data: { mapId?: string; spawn?: string }): void {
    if (data.mapId) this.mapId = data.mapId;
    if (data.spawn) this.spawn = data.spawn;
    this.mode = 'play';
    this.talking = undefined;
  }

  create(): void {
    const def = maps[this.mapId];
    if (!def) throw new Error(`Carte inconnue : ${this.mapId}`);
    const sp = def.spawns[this.spawn];
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
    // les deux mains prises par un seul objet : E ne fait que parler, ou reposer ce qu'on tient
    this.interaction = new InteractionSystem(this, this.player, () =>
      game.both ? talkable : [...this.map.interactables(), ...talkable],
    );
    this.harvest = new HarvestSystem(this, this.map);
    this.handsSystem = new HandsSystem(this, this.map, npcs.map((n) => n.actor.body));
    // ce qu'il portait sur la carte d'avant
    this.handsChanged();

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, this.map.width, this.map.height);
    cam.startFollow(this.player.actor, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.fadeIn(220, 20, 14, 8);

    this.game.events.on(GameEvent.DialogueEnd, this.onDialogueEnd, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(GameEvent.DialogueEnd, this.onDialogueEnd, this));
  }

  update(time: number): void {
    this.player.update(this.mode === 'play');
    if (this.mode === 'play') {
      const exit = findExit(this.player, this.map.def.exits);
      if (exit) this.travel(exit);
    }
    // Espace, Q et Tab toujours lus, comme E : sinon un appui fait pendant un dialogue ressortirait juste après
    const { input } = this.player;
    const use = input.usePressed();
    const drop = input.dropPressed();
    const swap = input.swapPressed();
    const e = this.interaction.update(time, this.mode === 'play');
    this.harvest.updatePrompt(time, this.player, this.player.hold.loaded ? undefined : heldItem(game), this.mode === 'play');
    // ce qu'on tient et qui s'entrepose : sa pièce en transparence, là où elle ira
    this.handsSystem.updatePreview(this.player, this.mode === 'play');
    if (this.mode !== 'play') return;
    if (swap) {
      switchHand(game);
      this.handsChanged();
    }
    if (e.pressed && e.target) this.hands(e.target);
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
      if (!this.handsSystem.takeProp(a.prop)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else if (a.kind === 'pile') {
      if (!this.handsSystem.takeFromPile(a.pile, a.place)) return this.notice('Les mains pleines.');
      this.handsChanged();
    } else {
      this.pickUp(a.ground);
    }
  }

  /** Q, ou E quand on tient à deux mains : pose devant soi ce que tient la main active (en tas s'il s'entrepose), s'il y a la place. */
  private putDown(): void {
    const r = this.handsSystem.putDown(this.player);
    if (r === 'blocked') this.notice('Pas la place ici.');
    if (r === 'done') this.handsChanged();
  }

  /** Les mains ont changé : le HUD se redessine, ce que tient Xéros se voit sur lui. */
  private handsChanged(): void {
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

  /** Espace : le geste avec ce qu'on tient, même dans le vide. Une ressource en main ne fait rien ; chargé, rien non plus. */
  private useHeld(): void {
    if (this.player.hold.loaded) return;
    const tool = heldItem(game);
    if (!tool || items[tool].kind === 'resource') {
      // mains vides devant ce qui demande un outil : on le dit
      const t = this.harvest.target(this.player)?.def.harvest?.tool;
      if (t) this.report({ kind: 'missing', tool: t });
      return;
    }
    // le geste dépend de la cible : de côté sur ce qui est debout, de haut en bas sur ce qui est couché ; dans le vide, de côté
    const gesture = this.harvest.target(this.player)?.def.harvest?.gesture ?? 'use';
    // la cible est cherchée au moment du coup : celle qui est devant Xéros à l'impact
    this.gesture(gesture, tool, () => this.report(this.harvest.hit(this.harvest.target(this.player), tool, this.player.actor.facing)));
  }

  private gesture(gesture: string, item: string | undefined, onImpact: () => void): void {
    this.mode = 'use';
    this.player.tools.swing(gesture, item, onImpact, () => {
      if (this.mode === 'use') this.mode = 'play';
    });
  }

  private report(r: HitResult): void {
    if (r.kind === 'missing') this.game.events.emit(GameEvent.Notice, `Sans ${items[r.tool].name}, rien à faire.`);
    if (r.kind !== 'hit') return;
    if (r.given) this.handsChanged();
    if (r.overflow) this.game.events.emit(GameEvent.Notice, 'Les mains pleines.');
  }

  /** Prend un objet au sol dans une main libre (les deux s'il le demande). */
  private pickUp(g: PlacedGround): void {
    if (!take(game, { item: g.item.item }, items[g.item.item].hands)) return this.notice('Les mains pleines.');
    removeGroundItem(game, this.map.def.id, g.item.id);
    this.map.removeGround(g);
    this.handsChanged();
  }

  /** Fondu au noir, puis la scène redémarre sur la carte d'arrivée. */
  private travel(exit: Exit): void {
    this.mode = 'transition';
    const cam = this.cameras.main;
    cam.fadeOut(200, 20, 14, 8);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapId: exit.to, spawn: exit.spawn });
    });
  }

  private openDialogue(id: string): void {
    this.mode = 'dialogue';
    this.scene.launch('dialogue', { id });
  }

  private onDialogueEnd(): void {
    this.mode = 'play';
    this.talking?.resume();
    this.talking = undefined;
    this.interaction.lock(200);
    this.useLockedUntil = this.time.now + 200;
  }
}
