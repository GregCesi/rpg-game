import Phaser from 'phaser';

const K = Phaser.Input.Keyboard.KeyCodes;

/**
 * Traduit le clavier en intention : direction, course, et les deux gestes. ZQSD (AZERTY), WASD (QWERTY) et flèches.
 * E (ou Entrée) : les mains (parler, ramasser, prendre, cueillir). Espace : utiliser l'objet en main.
 */
export class PlayerInput {
  private keys: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key[]>;
  private run: Phaser.Input.Keyboard.Key;
  private handKeys: Phaser.Input.Keyboard.Key[];
  private useKey: Phaser.Input.Keyboard.Key;

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
    this.handKeys = add(K.E, K.ENTER);
    this.useKey = kb.addKey(K.SPACE);
  }

  /** Les mains (E ou Entrée) : vrai une seule fois par appui. */
  handsPressed(): boolean {
    // pas de some() : chaque touche doit être lue pour remettre son état "vient d'être pressée" à zéro
    return this.handKeys.map((k) => Phaser.Input.Keyboard.JustDown(k)).includes(true);
  }

  /** Utiliser l'objet en main (Espace) : vrai une seule fois par appui. */
  usePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.useKey);
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
