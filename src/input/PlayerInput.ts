import Phaser from 'phaser';

const K = Phaser.Input.Keyboard.KeyCodes;

/** Traduit le clavier en intention : direction, course, interaction. ZQSD (AZERTY), WASD (QWERTY) et flèches. */
export class PlayerInput {
  private keys: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key[]>;
  private run: Phaser.Input.Keyboard.Key;
  private interactKeys: Phaser.Input.Keyboard.Key[];

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const add = (...codes: number[]) => codes.map((c) => kb.addKey(c));
    this.keys = {
      up: add(K.Z, K.W, K.UP),
      down: add(K.S, K.DOWN),
      left: add(K.Q, K.A, K.LEFT),
      right: add(K.D, K.RIGHT),
    };
    this.run = kb.addKey(K.SHIFT);
    this.interactKeys = add(K.E, K.SPACE, K.ENTER);
  }

  /** Vrai une seule fois par appui (E, Espace ou Entrée). */
  interactPressed(): boolean {
    // pas de some() : chaque touche doit être lue pour remettre son état "vient d'être pressée" à zéro
    return this.interactKeys.map((k) => Phaser.Input.Keyboard.JustDown(k)).includes(true);
  }

  read(): { dir: Phaser.Math.Vector2; running: boolean } {
    const down = (k: Phaser.Input.Keyboard.Key[]) => (k.some((key) => key.isDown) ? 1 : 0);
    const dir = new Phaser.Math.Vector2(
      down(this.keys.right) - down(this.keys.left),
      down(this.keys.down) - down(this.keys.up),
    );
    return { dir, running: this.run.isDown };
  }
}
