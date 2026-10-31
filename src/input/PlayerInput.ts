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
  // mode construction (?construire) : B entre et sort ; T et G (ou Page haut, Page bas) montent et descendent d'un cran. Ces trois
  // lettres sont à la même place en AZERTY et en QWERTY, et ne servent à rien d'autre.
  build: ['KeyB'],
  raise: ['KeyT', 'PageUp'],
  lower: ['KeyG', 'PageDown'],
} as const;

type Action = keyof typeof CODES;

/** Zoom au pavé numérique (les + et − du clavier principal sont lus par leur signe). */
const ZOOM_IN = ['NumpadAdd'];
const ZOOM_OUT = ['NumpadSubtract'];

/**
 * Traduit le clavier en intention : direction, course, et les gestes des mains.
 * E (ou Entrée) : prendre dans une main libre, parler, cueillir, ou reposer ce qu'on tient à deux mains.
 * Espace : utiliser ce qu'on tient. Q (A en AZERTY) : lâcher ce que tient la main active. Tab : changer de main active.
 * R : tourner la bille portée (est-ouest, nord-sud). Molette, + et − : le zoom.
 */
export class PlayerInput {
  /** Touches enfoncées (codes). */
  private readonly held = new Set<string>();
  /** Actions dont la touche vient d'être pressée, pas encore lues. */
  private readonly pressed = new Set<Action>();
  /** Crans de zoom demandés (molette, + et −), pas encore lus : positif pour s'approcher. */
  private zoom = 0;
  /** Ctrl+Z (annuler) et Ctrl+Y ou Ctrl+Maj+Z (refaire) du mode construction, pas encore lus. */
  private history: 'undo' | 'redo' | undefined;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    // Tab et Espace ne doivent pas faire défiler la page ni changer le focus
    kb.addCapture([K.TAB, K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT, K.PAGE_UP, K.PAGE_DOWN]);
    const onDown = (e: KeyboardEvent) => {
      this.held.add(e.code);
      // + et − : lus par leur signe (ils ne sont pas à la même place en AZERTY et en QWERTY), ou sur le pavé numérique ; maintenus, ils répètent
      if (ZOOM_IN.includes(e.code) || e.key === '+' || e.key === '=') this.zoom++;
      if (ZOOM_OUT.includes(e.code) || e.key === '-') this.zoom--;
      // annuler, refaire : lus par la lettre (Ctrl+Z est un raccourci de lettre, au même endroit que partout ailleurs) ; maintenus, ils répètent
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' || k === 'y') {
          this.history = k === 'y' || e.shiftKey ? 'redo' : 'undo';
          e.preventDefault();
        }
        return;
      }
      if (e.repeat) return;
      for (const [action, codes] of Object.entries(CODES)) if ((codes as readonly string[]).includes(e.code)) this.pressed.add(action as Action);
    };
    const onUp = (e: KeyboardEvent) => this.held.delete(e.code);
    // fenêtre quittée : les touches relâchées ailleurs ne reviendront pas
    const onBlur = () => this.held.clear();
    // la molette : vers l'avant, on s'approche
    const onWheel = (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy) this.zoom += dy < 0 ? 1 : -1;
    };
    kb.on('keydown', onDown);
    kb.on('keyup', onUp);
    scene.input.on('wheel', onWheel);
    scene.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown', onDown);
      kb.off('keyup', onUp);
      scene.input.off('wheel', onWheel);
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

  /** B : entrer dans le mode construction ou en sortir (?construire) ; vrai une seule fois par appui. */
  buildPressed(): boolean {
    return this.take('build');
  }

  /** Mode construction : monter (+1) ou descendre (-1) d'un cran, ou rien (0) ; une fois par appui. */
  stepPressed(): 1 | -1 | 0 {
    const up = this.take('raise');
    const down = this.take('lower');
    return up === down ? 0 : up ? 1 : -1;
  }

  /** Mode construction : Ctrl+Z (annuler) ou Ctrl+Y (refaire) demandé depuis la dernière lecture. */
  historyPressed(): 'undo' | 'redo' | undefined {
    const h = this.history;
    this.history = undefined;
    return h;
  }

  /** Maj est enfoncée (courir ; en mode construction, la caméra va plus vite et le clic droit retire aussi ce qui repose dessus). */
  shiftDown(): boolean {
    return CODES.run.some((c) => this.held.has(c));
  }

  read(): { dir: Phaser.Math.Vector2; running: boolean } {
    const down = (a: Action) => (CODES[a].some((c) => this.held.has(c)) ? 1 : 0);
    const dir = new Phaser.Math.Vector2(down('right') - down('left'), down('down') - down('up'));
    return { dir, running: down('run') === 1 };
  }

  /** Le zoom demandé depuis la dernière lecture : +1 (s'approcher), -1 (s'éloigner) ou 0. */
  zoomPressed(): 1 | -1 | 0 {
    const z = Math.sign(this.zoom) as 1 | -1 | 0;
    this.zoom = 0;
    return z;
  }

  private take(a: Action): boolean {
    const p = this.pressed.has(a);
    this.pressed.delete(a);
    return p;
  }
}
