import Phaser from 'phaser';
import { START, ZOOM } from '../config';
import { maps } from '../content';
import type { Exit } from '../content/types';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { GameEvent } from '../events';
import { findExit } from '../systems/exits';
import { InteractionSystem } from '../systems/InteractionSystem';
import { GameMap } from '../world/GameMap';
import type { Interactable } from '../world/GameMap';

/**
 * Ce que fait le monde en ce moment. Une seule valeur à la fois : le joueur ne peut pas
 * marcher pendant un dialogue, ni ouvrir un dialogue pendant qu'il change de carte.
 */
type Mode = 'play' | 'dialogue' | 'transition';

/**
 * Une carte avec le joueur dedans. La scène assemble et arbitre : chaque système fait une chose
 * (repérer un objet, trouver une sortie...) et c'est ici qu'on décide quoi en faire selon le mode.
 */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private map!: GameMap;
  private interaction!: InteractionSystem;
  /** Le personnage à qui Xéros parle en ce moment (mode dialogue). */
  private talking?: Npc;
  private mode: Mode = 'play';
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

    this.map = new GameMap(this, def);
    this.physics.world.setBounds(0, 0, this.map.width, this.map.height);

    this.player = new Player(this, sp.x, sp.y);
    if (sp.facing) this.player.actor.face(sp.facing);
    this.physics.add.collider(this.player.actor, this.map.ground);
    this.physics.add.collider(this.player.actor, this.map.obstacles);

    const npcs = def.npcs.map((n) => new Npc(this, n));
    for (const n of npcs) this.physics.add.collider(this.player.actor, n.actor);
    const talkable: Interactable[] = npcs.map((n) => ({
      x: n.actor.x,
      y: n.actor.y - 4, // au centre de la collision des pieds
      top: n.actor.y - n.actor.height,
      dialogue: n.dialogue,
      npc: n,
    }));
    this.interaction = new InteractionSystem(this, this.player, [...this.map.interactables, ...talkable]);

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
    const used = this.interaction.update(time, this.mode === 'play');
    if (used) {
      this.talking = used.npc;
      this.talking?.faceToward(this.player.actor.x, this.player.actor.y);
      this.openDialogue(used.dialogue);
    }
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
  }
}
