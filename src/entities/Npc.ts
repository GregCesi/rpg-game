import type Phaser from 'phaser';
import type { Npc as NpcDef, NpcPose } from '../content/types';
import { Actor, type Facing } from './Actor';

/**
 * Un personnage non joueur immobile = un Actor + ce contrôleur (règle 3 du README).
 * Il reste sur place, bloque le passage aux pieds, se tourne vers Xéros quand celui-ci lui parle,
 * puis reprend sa direction de départ et sa pose.
 */
export class Npc {
  readonly actor: Actor;
  /** Dialogue lancé quand Xéros lui parle. */
  readonly dialogue: string;
  private readonly home: Facing;
  /** Sa pose (`sit` : assis ; `work` : au travail), si son sprite a l'animation `<pose>-<direction>`. */
  private readonly pose?: NpcPose;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    // la clé du personnage est aussi celle de son sprite
    this.actor = new Actor(scene, def.x, def.y, def.character);
    this.home = def.facing ?? 'down';
    this.dialogue = def.dialogue;
    this.pose = def.pose;
    this.actor.face(this.home);
    this.hold();
    // Xéros le contourne : il ne le pousse pas.
    this.actor.body.setImmovable(true);
  }

  /**
   * Se tourne vers un point (la direction dominante) pour parler : assis, il le reste ; sinon il quitte sa pose (le forgeron pose son
   * marteau) et prend `talk-<direction>` si son sprite l'a, son attente sinon.
   */
  faceToward(x: number, y: number): void {
    const dx = x - this.actor.x;
    const dy = y - this.actor.y;
    this.actor.face(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
    if (this.pose === 'sit') this.hold();
    else this.play('talk');
  }

  /** Reprend la direction et la pose de départ (fin du dialogue). */
  resume(): void {
    this.actor.face(this.home);
    this.hold();
  }

  /** Sa pose, à sa direction : `sit-<direction>` (la mère sur le banc), `work-<direction>` (le forgeron à l'enclume). */
  private hold(): void {
    if (this.pose) this.play(this.pose);
  }

  /** Joue l'animation `<nom>-<direction>` de son sprite, s'il l'a ; sinon il garde son attente. */
  private play(name: string): void {
    const key = `${this.actor.skin}-${name}-${this.actor.facing}`;
    if (this.actor.scene.anims.exists(key)) this.actor.play(key);
  }
}
