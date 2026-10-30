import Phaser from 'phaser';

const K = Phaser.Input.Keyboard.KeyCodes;

/**
 * Touches par leur place sur le clavier (KeyboardEvent.code), pas par leur lettre : la même place sert en AZERTY et en QWERTY.
 * Déplacement : ZQSD en AZERTY = WASD en QWERTY, ou les flèches. Lâcher : la touche Q d'un clavier QWERTY,
 * qui est le A d'un AZERTY (à gauche de Z) : sinon elle se confondrait avec le Q de ZQSD.
 */
const CODES = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  hands: ['KeyE', 'Enter', 'NumpadEnter'],
  use: ['Space'],
  drop: ['KeyQ'],
  swap: ['Tab'],
  turn: ['KeyR'],
} as const;

type Action = keyof typeof CODES;

/**
 * Traduit le clavier en intention : direction, course, et les gestes des mains.
 * E (ou Entrée) : prendre dans une main libre, parler, cueillir, ou reposer ce qu'on tient à deux mains.
 * Espace : utiliser ce qu'on tient. Q (A en AZERTY) : lâcher ce que tient la main active. Tab : changer de main active.
 * R : tourner la bille portée (est-ouest, nord-sud).
 */
export class PlayerInput {
  /** Touches enfoncées (codes). */
  private readonly held = new Set<string>();
  /** Actions dont la touche vient d'être pressée, pas encore lues. */
  private readonly pressed = new Set<Action>();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    // Tab et Espace ne doivent pas faire défiler la page ni changer le focus
    kb.addCapture([K.TAB, K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    const onDown = (e: KeyboardEvent) => {
      this.held.add(e.code);
      if (e.repeat) return;
      for (const [action, codes] of Object.entries(CODES)) if ((codes as readonly string[]).includes(e.code)) this.pressed.add(action as Action);
    };
    const onUp = (e: KeyboardEvent) => this.held.delete(e.code);
    // fenêtre quittée : les touches relâchées ailleurs ne reviendront pas
    const onBlur = () => this.held.clear();
    kb.on('keydown', onDown);
    kb.on('keyup', onUp);
    scene.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown', onDown);
      kb.off('keyup', onUp);
      scene.game.events.off(Phaser.Core.Events.BLUR, onBlur);
    });
  }

  /** Les mains (E ou Entrée) : vrai une seule fois par appui. */
  handsPressed(): boolean {
    return this.take('hands');
  }

  /** La touche des mains (E ou Entrée) est enfoncée en ce moment : E maintenu (nouer, dénouer). */
  handsDown(): boolean {
    return CODES.hands.some((c) => this.held.has(c));
  }

  /** Utiliser ce qu'on tient (Espace) : vrai une seule fois par appui. */
  usePressed(): boolean {
    return this.take('use');
  }

  /** Lâcher ce que tient la main active (Q) : vrai une seule fois par appui. */
  dropPressed(): boolean {
    return this.take('drop');
  }

  /** Changer de main active (Tab) : vrai une seule fois par appui. */
  swapPressed(): boolean {
    return this.take('swap');
  }

  /** Tourner la bille portée (R) : vrai une seule fois par appui. */
  turnPressed(): boolean {
    return this.take('turn');
  }

  /** La touche R est enfoncée en ce moment : R maintenu (pivoter une bille couchée). */
  turnDown(): boolean {
    return CODES.turn.some((c) => this.held.has(c));
  }

  read(): { dir: Phaser.Math.Vector2; running: boolean } {
    const down = (a: Action) => (CODES[a].some((c) => this.held.has(c)) ? 1 : 0);
    const dir = new Phaser.Math.Vector2(down('right') - down('left'), down('down') - down('up'));
    return { dir, running: down('run') === 1 };
  }

  private take(a: Action): boolean {
    const p = this.pressed.has(a);
    this.pressed.delete(a);
    return p;
  }
}
