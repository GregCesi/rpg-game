import Phaser from 'phaser';
import { START, ZOOM } from '../config';
import { items, maps } from '../content';
import type { Exit } from '../content/types';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { GameEvent } from '../events';
import { findExit } from '../systems/exits';
import { HarvestSystem, type HitResult } from '../systems/harvest';
import { InteractionSystem } from '../systems/InteractionSystem';
import { addItem, game, held, mapState, removeGroundItem } from '../state';
import { GameMap } from '../world/GameMap';
import type { Interactable, PlacedGround } from '../world/GameMap';

/**
 * Ce que fait le monde en ce moment. Une seule valeur à la fois : le joueur ne peut pas
 * marcher pendant un dialogue, ni ouvrir un dialogue pendant qu'il change de carte.
 * `use` : Xéros fait un geste (outil ou mains), il ne marche pas et ne prend pas de sortie.
 */
type Mode = 'play' | 'use' | 'dialogue' | 'transition';

/**
 * Une carte avec le joueur dedans. La scène assemble et arbitre : chaque système fait une chose
 * (repérer un objet, trouver une sortie...) et c'est ici qu'on décide quoi en faire selon le mode.
 */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private map!: GameMap;
  private interaction!: InteractionSystem;
  private harvest!: HarvestSystem;
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
    this.interaction = new InteractionSystem(this, this.player, () => [...this.map.interactables(), ...talkable]);
    this.harvest = new HarvestSystem(this, this.map);

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
    // Espace toujours lu, comme E : sinon un appui fait pendant un dialogue ressortirait juste après
    const use = this.player.input.usePressed();
    const used = this.interaction.update(time, this.mode === 'play');
    if (this.mode !== 'play') return;
    if (used) this.hands(used);
    else if (use && time >= this.useLockedUntil) this.useHeld();
  }

  /** E devant une cible : parler, récolter à la main, ramasser. */
  private hands(target: Interactable): void {
    const a = target.action;
    if (a.kind === 'talk') {
      this.talking = a.npc;
      this.talking?.faceToward(this.player.actor.x, this.player.actor.y);
      this.openDialogue(a.dialogue);
    } else if (a.kind === 'harvest') {
      this.gesture(undefined, () => this.report(this.harvest.hit(a.prop, undefined)));
    } else {
      this.pickUp(a.ground);
    }
  }

  /** Espace : le geste avec l'objet en main, même dans le vide. Une ressource en main ne fait rien. */
  private useHeld(): void {
    const slot = held(game);
    if (!slot || items[slot.item].kind === 'resource') {
      // mains vides devant ce qui demande un outil : on le dit
      const t = this.harvest.target(this.player)?.def.harvest?.tool;
      if (t) this.report({ kind: 'missing', tool: t });
      return;
    }
    const tool = slot.item;
    // la cible est cherchée au moment du coup : celle qui est devant Xéros à l'impact
    this.gesture(tool, () => this.report(this.harvest.hit(this.harvest.target(this.player), tool)));
  }

  private gesture(item: string | undefined, onImpact: () => void): void {
    this.mode = 'use';
    this.player.tools.swing(item, onImpact, () => {
      if (this.mode === 'use') this.mode = 'play';
    });
  }

  private report(r: HitResult): void {
    if (r.kind === 'missing') this.game.events.emit(GameEvent.Notice, `Sans ${items[r.tool].name}, rien à faire.`);
  }

  /** Ramasse un objet au sol, un seul, s'il reste de la place. */
  private pickUp(g: PlacedGround): void {
    const def = items[g.item.item];
    if (!addItem(game, g.item.item, def)) {
      this.game.events.emit(GameEvent.Notice, 'Plus de place.');
      return;
    }
    removeGroundItem(game, this.map.def.id, g.item.id);
    this.map.removeGround(g);
    this.game.events.emit(GameEvent.InventoryChanged);
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
