import Phaser from 'phaser';
import { TILE } from '../config';
import { maps } from '../content';
import { Player } from '../entities/Player';
import { GameMap } from '../world/GameMap';

/** Une carte, le joueur dedans, la caméra qui suit. */
export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private mapId = 'ferme';

  constructor() {
    super('world');
  }

  init(data: { mapId?: string }): void {
    if (data.mapId) this.mapId = data.mapId;
  }

  create(): void {
    const def = maps[this.mapId];
    if (!def) throw new Error(`Carte inconnue : ${this.mapId}`);
    const map = new GameMap(this, def);

    this.physics.world.setBounds(0, 0, map.width, map.height);
    const sx = def.spawn.x * TILE + TILE / 2;
    const sy = def.spawn.y * TILE + TILE - 2;
    this.player = new Player(this, sx, sy);

    this.physics.add.collider(this.player.actor, map.ground);
    this.physics.add.collider(this.player.actor, map.obstacles);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.width, map.height);
    cam.startFollow(this.player.actor, true, 0.15, 0.15);
    cam.setRoundPixels(true);
  }

  update(): void {
    this.player.update();
  }
}
