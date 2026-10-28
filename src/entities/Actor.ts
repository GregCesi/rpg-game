import Phaser from 'phaser';

export type Facing = 'down' | 'up' | 'left' | 'right';

/**
 * Le corps d'un personnage : sprite, collision aux pieds, orientation, animations.
 * Il ne décide rien : un contrôleur (clavier pour le joueur, IA pour un PNJ) lui dit où aller.
 */
export class Actor extends Phaser.Physics.Arcade.Sprite {
  facing: Facing = 'down';
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly skin: string) {
    super(scene, x, y, skin);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Origine aux pieds : y est la position au sol, utilisée pour l'ordre d'affichage.
    this.setOrigin(0.5, 1);
    // Collision limitée aux pieds, comme dans Stardew : on peut passer "derrière" un arbre.
    this.body.setSize(14, 8);
    this.body.setOffset((this.width - 14) / 2, this.height - 10);
    this.body.setCollideWorldBounds(true);
    this.play(this.animKey('idle'));
  }

  /** dir : direction voulue (pas forcément normalisée). speed en px/s. */
  move(dir: Phaser.Math.Vector2, speed: number, baseSpeed = speed): void {
    if (dir.lengthSq() === 0) {
      this.body.setVelocity(0, 0);
      this.play(this.animKey('idle'), true);
      return;
    }
    const v = dir.clone().normalize().scale(speed);
    this.body.setVelocity(v.x, v.y);
    this.facing = this.pickFacing(dir);
    this.anims.timeScale = speed / baseSpeed;
    this.play(this.animKey('walk'), true);
  }

  /** Tourne le personnage sans le déplacer. */
  face(facing: Facing): void {
    this.facing = facing;
    this.play(this.animKey('idle'), true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.setDepth(this.y);
  }

  private animKey(state: 'idle' | 'walk'): string {
    return `${this.skin}-${state}-${this.facing}`;
  }

  /** En diagonale, on garde l'orientation actuelle si elle reste valable : évite le clignotement. */
  private pickFacing(dir: Phaser.Math.Vector2): Facing {
    const h: Facing | null = dir.x < 0 ? 'left' : dir.x > 0 ? 'right' : null;
    const v: Facing | null = dir.y < 0 ? 'up' : dir.y > 0 ? 'down' : null;
    if (h && v) return this.facing === h || this.facing === v ? this.facing : h;
    return (h ?? v)!;
  }
}
