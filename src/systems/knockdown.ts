import { FEET, PLAYER } from '../config';
import { combat, health } from '../content';
import type { Facing } from '../content/types';
import type { Player } from '../entities/Player';
import { pixels } from '../world/creature';
import type { GameMap } from '../world/GameMap';
import { wallAt } from '../world/relief';

/** L'image du geste où il est à terre, immobile (la cinquième : planche `xeros-down`), et combien de temps il y reste évanoui avant le fondu. */
const GROUND = 4;
const FAINT_MS = 1200;

/**
 * Xéros renversé par une charge (docs/CONCEPTION.md, « La vie de Xéros ») : le geste validé (planche `xeros-down`,
 * art/characters/xeros-down.ts) dans le sens où il tombe, et la glissade : il part à la vitesse commune du choc (world/charge.ts
 * `goreXeros`) dans le sens de la charge, freiné par son frottement au sol (health.json `knockdown.friction`, μ g), pixel par pixel sans
 * jamais traverser un obstacle (ses pieds, comme quand il marche) ni passer une marche du relief trop haute pour lui ; il se relève à la fin du geste (à terre 1,5 s en tout). Pendant ce
 * temps, ni le clavier ni la marche ne le mènent (`Player.down`) ; son corps ne compte plus pour la physique, il est mené ici.
 */
export class Knockdown {
  private speed = 0;
  private dir = { x: 0, y: 0 };
  private done?: () => void;
  /** L'animation du geste en cours ; évanoui, il reste à terre ; le temps passé à terre, évanoui (ms). */
  private key = '';
  private fainted = false;
  private still = 0;

  constructor(
    private readonly map: GameMap,
    private readonly player: Player,
  ) {}

  get active(): boolean {
    return this.player.down;
  }

  /**
   * La chute : emporté selon `dir` (unitaire) à `speed` m/s ; `done` quand il est relevé. Il tombe toujours à l'opposé de la bête
   * (venue de l'est, il tombe vers l'ouest : il regardait l'est). Évanoui (`fainted`), il ne se relève pas : le geste s'arrête à terre
   * (l'image `GROUND`), et `done` vient après `FAINT_MS`.
   */
  start(dir: { x: number; y: number }, speed: number, done: () => void, fainted = false): void {
    const a = this.player.actor;
    this.player.down = true;
    this.speed = pixels(speed);
    this.dir = dir;
    this.done = done;
    const facing: Facing = Math.abs(dir.x) >= Math.abs(dir.y) ? (dir.x < 0 ? 'right' : 'left') : dir.y < 0 ? 'down' : 'up';
    a.body.setVelocity(0, 0);
    a.body.enable = false;
    a.anims.timeScale = 1;
    a.facing = facing;
    this.key = `xeros-down-${facing}`;
    this.fainted = fainted;
    this.still = 0;
    a.play(this.key);
  }

  /**
   * À chaque image : la glissade, freinée, arrêtée net par ce qui barre ses pieds ; le geste suivi image par image (au temps du jeu) :
   * fini, il se relève ; évanoui, il reste à terre (l'image `GROUND`) `FAINT_MS`, puis la scène l'emmène.
   */
  update(delta: number): void {
    if (!this.player.down) return;
    const a = this.player.actor;
    const frame = a.anims.currentFrame ? a.anims.currentFrame.index - 1 : 0;
    if (this.fainted && frame >= GROUND) {
      if (a.anims.isPlaying) a.anims.pause();
      this.still += delta;
      if (this.still >= FAINT_MS) {
        this.player.down = false;
        const done = this.done;
        this.done = undefined;
        done?.();
        return;
      }
    } else if (!this.fainted && (a.anims.currentAnim?.key !== this.key || !a.anims.isPlaying)) return this.getUp();
    this.slide(delta);
  }

  /** La glissade de cette image : freinée, arrêtée net par ce qui barre ses pieds. */
  private slide(delta: number): void {
    if (this.speed <= 0) return;
    const a = this.player.actor;
    const dt = delta / 1000;
    let budget = this.speed * dt;
    // freiné par le frottement au sol sous la pesanteur (μ g ; la pesanteur de combat.json, la même que pour les lancers)
    this.speed = Math.max(0, this.speed - pixels(health.knockdown.friction * combat.throw.gravity) * dt);
    while (budget > 1e-6) {
      const s = Math.min(1, budget);
      const x = a.x + this.dir.x * s;
      const y = a.y + this.dir.y * s;
      const feet = { left: x - FEET.w / 2, right: x + FEET.w / 2, top: y - FEET.gap - FEET.h, bottom: y - FEET.gap };
      // ce qui barre ses pieds, ou une marche du relief plus haute que ce qu'il monte (world/relief.ts) : il s'arrête net
      if (!this.map.areaFree(feet) || wallAt(this.map.def, x, y, this.player.mobility.def)) {
        this.speed = 0;
        break;
      }
      a.setPosition(x, y);
      budget -= s;
    }
  }

  /** Relevé : il reprend sa planche, son corps compte de nouveau, il regarde où il regardait. */
  private getUp(): void {
    const a = this.player.actor;
    this.player.down = false;
    this.speed = 0;
    a.setTexture(PLAYER.skin);
    a.body.enable = true;
    a.body.reset(a.x, a.y);
    a.face(a.facing);
    const done = this.done;
    this.done = undefined;
    done?.();
  }
}
