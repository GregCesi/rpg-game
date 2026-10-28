import Phaser from 'phaser';
import { INTERACT, TILE, ZOOM } from '../config';
import { maps } from '../content';
import { Player } from '../entities/Player';
import { GameMap, type Interactable } from '../world/GameMap';

/** Une carte, le joueur dedans, la caméra qui suit, les interactions avec les objets. */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private map!: GameMap;
  private mapId = 'ferme';
  private prompt!: Phaser.GameObjects.Image;
  private target?: Interactable;
  private inDialogue = false;
  /** Évite que l'appui qui ferme un dialogue en relance un aussitôt. */
  private interactLockedUntil = 0;

  constructor() {
    super('world');
  }

  init(data: { mapId?: string }): void {
    if (data.mapId) this.mapId = data.mapId;
  }

  create(): void {
    const def = maps[this.mapId];
    if (!def) throw new Error(`Carte inconnue : ${this.mapId}`);
    this.map = new GameMap(this, def);

    this.physics.world.setBounds(0, 0, this.map.width, this.map.height);
    const sx = def.spawn.x * TILE + TILE / 2;
    const sy = def.spawn.y * TILE + TILE - 2;
    this.player = new Player(this, sx, sy);

    this.physics.add.collider(this.player.actor, this.map.ground);
    this.physics.add.collider(this.player.actor, this.map.obstacles);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, this.map.width, this.map.height);
    cam.startFollow(this.player.actor, true, 0.15, 0.15);
    cam.setRoundPixels(true);

    this.prompt = this.add.image(0, 0, 'ui-key-e').setOrigin(0.5, 1).setDepth(100000).setVisible(false);

    this.game.events.on('dialogue-end', this.onDialogueEnd, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('dialogue-end', this.onDialogueEnd, this));
  }

  update(time: number): void {
    const interact = this.player.input.interactPressed();
    if (this.inDialogue) {
      this.player.update(false);
      return;
    }
    this.player.update();
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
