import type Phaser from 'phaser';
import type { Npc as NpcDef } from '../content/types';
import { Actor, type Facing } from './Actor';

/**
 * Un personnage non joueur immobile = un Actor + ce contrôleur (règle 3 du README).
 * Il reste sur place, bloque le passage aux pieds, se tourne vers Xéros quand celui-ci lui parle,
 * puis reprend sa direction de départ.
 */
export class Npc {
  readonly actor: Actor;
  /** Dialogue lancé quand Xéros lui parle. */
  readonly dialogue: string;
  private readonly home: Facing;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    // la clé du personnage est aussi celle de son sprite
    this.actor = new Actor(scene, def.x, def.y, def.character);
    this.home = def.facing ?? 'down';
    this.dialogue = def.dialogue;
    this.actor.face(this.home);
    // Xéros le contourne : il ne le pousse pas.
    this.actor.body.setImmovable(true);
  }

  /** Se tourne vers un point (la direction dominante). */
  faceToward(x: number, y: number): void {
    const dx = x - this.actor.x;
    const dy = y - this.actor.y;
    this.actor.face(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
  }

  /** Reprend la direction de départ (fin du dialogue). */
  resume(): void {
    this.actor.face(this.home);
  }
}
