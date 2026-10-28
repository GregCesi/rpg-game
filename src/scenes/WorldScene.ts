import Phaser from 'phaser';
import { INTERACT, START, TILE, ZOOM } from '../config';
import { maps } from '../content';
import type { ExitDef } from '../content/types';
import { Player } from '../entities/Player';
import { GameMap, type Interactable } from '../world/GameMap';

/** Une carte, le joueur dedans, la caméra qui suit, les interactions avec les objets. */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private map!: GameMap;
  private mapId = START.map;
  private spawn = START.spawn;
  private leaving = false;
  private prompt!: Phaser.GameObjects.Image;
  private target?: Interactable;
  private inDialogue = false;
  /** Évite que l'appui qui ferme un dialogue en relance un aussitôt. */
  private interactLockedUntil = 0;

  constructor() {
    super('world');
  }

  init(data: { mapId?: string; spawn?: string }): void {
    if (data.mapId) this.mapId = data.mapId;
    if (data.spawn) this.spawn = data.spawn;
    this.leaving = false;
    this.inDialogue = false;
    this.target = undefined;
  }

  create(): void {
    const def = maps[this.mapId];
    if (!def) throw new Error(`Carte inconnue : ${this.mapId}`);
    this.map = new GameMap(this, def);

    this.physics.world.setBounds(0, 0, this.map.width, this.map.height);
    const sp = def.spawns[this.spawn];
    if (!sp) throw new Error(`Carte ${def.id} : point d'apparition '${this.spawn}' inconnu`);
    this.player = new Player(this, sp.x * TILE + TILE / 2, sp.y * TILE + TILE - 4);
    if (sp.facing) this.player.actor.face(sp.facing);

    this.physics.add.collider(this.player.actor, this.map.ground);
    this.physics.add.collider(this.player.actor, this.map.obstacles);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, this.map.width, this.map.height);
    cam.startFollow(this.player.actor, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.fadeIn(220, 20, 14, 8);

    this.prompt = this.add.image(0, 0, 'ui-key-e').setOrigin(0.5, 1).setDepth(100000).setVisible(false);

    this.game.events.on('dialogue-end', this.onDialogueEnd, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('dialogue-end', this.onDialogueEnd, this));
  }

  update(time: number): void {
    const interact = this.player.input.interactPressed();
    if (this.inDialogue || this.leaving) {
      this.player.update(false);
      return;
    }
    this.player.update();
    const exit = this.exitUnderPlayer();
    if (exit) return this.leave(exit);
    this.updateTarget();
    if (this.target) this.prompt.setPosition(this.target.x, this.target.top + 4 - Math.round((Math.sin(time / 220) + 1) / 2) * 2);
    if (interact && this.target && time >= this.interactLockedUntil) this.openDialogue(this.target.dialogue);
  }

  /** Objet le plus proche devant Xéros, s'il y en a un à portée. */
  private updateTarget(): void {
    const probe = this.player.probe(INTERACT.reach);
    let best: Interactable | undefined;
    let bestD = INTERACT.radius;
    for (const it of this.map.interactables) {
      const d = Phaser.Math.Distance.Between(probe.x, probe.y, it.x, it.y);
      if (d < bestD) {
        best = it;
        bestD = d;
      }
    }
    if (best !== this.target) {
      this.target = best;
      this.prompt.setVisible(!!best);
    }
  }

  /** Sortie dont la case contient les pieds de Xéros, s'il avance dans la bonne direction. */
  private exitUnderPlayer(): ExitDef | undefined {
    const { actor, dir } = this.player;
    if (dir.lengthSq() === 0) return undefined;
    const tx = Math.floor(actor.x / TILE);
    const ty = Math.floor((actor.y - 3) / TILE);
    return this.map.def.exits?.find((e) => e.x === tx && e.y === ty && e.facing === actor.facing);
  }

  private leave(exit: ExitDef): void {
    this.leaving = true;
    this.prompt.setVisible(false);
    this.player.update(false);
    const cam = this.cameras.main;
    cam.fadeOut(200, 20, 14, 8);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapId: exit.to, spawn: exit.spawn });
    });
  }

  private openDialogue(id: string): void {
    this.inDialogue = true;
    this.prompt.setVisible(false);
    this.target = undefined;
    this.scene.launch('dialogue', { id });
  }

  private onDialogueEnd(): void {
    this.inDialogue = false;
    this.interactLockedUntil = this.time.now + 200;
  }
}
