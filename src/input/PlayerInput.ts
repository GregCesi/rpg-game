import Phaser from 'phaser';
import { KeyLatch } from './keyLatch';

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
  // arrêter une passe sur un rail (la doloire le long d'une pièce)
  stop: ['Escape'],
  // mode construction (?construire) : B entre et sort ; T et G (ou Page haut, Page bas) montent et descendent d'un cran. Ces trois
  // lettres sont à la même place en AZERTY et en QWERTY, et ne servent à rien d'autre.
  build: ['KeyB'],
  // la vitesse du temps (docs/CONCEPTION.md, « Le temps ») : V, à la même place en AZERTY et en QWERTY ; Maj + V pour ralentir
  speed: ['KeyV'],
  raise: ['KeyT', 'PageUp'],
  lower: ['KeyG', 'PageDown'],
} as const;

type Action = keyof typeof CODES;

/** Zoom au pavé numérique (les + et − du clavier principal sont lus par leur signe). */
const ZOOM_IN = ['NumpadAdd'];
const ZOOM_OUT = ['NumpadSubtract'];

/**
 * Le clavier (src/input/keyLatch.ts), gardé d'une scène à l'autre : Xéros qui passe le bord d'une zone (la scène redémarre sur la
 * voisine, systems/zones.ts) continue de marcher tant que la touche reste enfoncée. Appuis et relâchements sont écoutés sur la fenêtre
 * même, à l'instant de l'événement : aucun ne se perd, ni pendant un redémarrage, ni entre deux images, ni pendant une image longue ;
 * chaque appui est gardé jusqu'à ce que le jeu le lise. La fenêtre quittée les oublie toutes.
 */
const LATCH = new KeyLatch();
if (typeof window !== 'undefined') {
  // Ctrl+Z, Ctrl+Y (annuler, refaire : lus par leur lettre, plus bas) ne sont pas des appuis de leur touche (Z est KeyW en AZERTY)
  window.addEventListener('keydown', (e) => LATCH.down(e.code, e.timeStamp, e.repeat || e.ctrlKey || e.metaKey));
  window.addEventListener('keyup', (e) => LATCH.up(e.code, e.timeStamp));
  window.addEventListener('blur', () => LATCH.clear());
}

/**
 * Traduit le clavier en intention : direction, course, et les gestes des mains.
 * E (ou Entrée) : prendre dans une main libre, parler, cueillir, ou reposer ce qu'on tient à deux mains.
 * Espace : utiliser ce qu'on tient. Q (A en AZERTY) : lâcher ce que tient la main active. Tab : changer de main active.
 * R : tourner la bille portée (est-ouest, nord-sud). Échap : arrêter une passe sur un rail. Molette, + et − : le zoom.
 */
/** Oublie les touches enfoncées : un passage avec fondu (une porte, une sortie) repart à l'arrêt, comme avant les zones. */
export function forgetHeldKeys(): void {
  LATCH.clear();
}

export class PlayerInput {
  /** Le clavier, commun à toutes les scènes (LATCH). */
  private readonly keys = LATCH;
  /** Crans de zoom demandés (molette, + et −), pas encore lus : positif pour s'approcher. */
  private zoom = 0;
  /** Ctrl+Z (annuler) et Ctrl+Y ou Ctrl+Maj+Z (refaire) du mode construction, pas encore lus. */
  private history: 'undo' | 'redo' | undefined;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    // Tab et Espace ne doivent pas faire défiler la page ni changer le focus
    kb.addCapture([K.TAB, K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT, K.PAGE_UP, K.PAGE_DOWN]);
    // les appuis d'avant cette scène (lus par la précédente, ou pendant un fondu) ne la concernent pas
    for (const codes of Object.values(CODES)) this.keys.take(codes);
    const onDown = (e: KeyboardEvent) => {
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
    };
    // fenêtre quittée : les touches relâchées ailleurs ne reviendront pas
    const onBlur = () => this.keys.clear();
    // la molette : vers l'avant, on s'approche
    const onWheel = (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy) this.zoom += dy < 0 ? 1 : -1;
    };
    kb.on('keydown', onDown);
    scene.input.on('wheel', onWheel);
    scene.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown', onDown);
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
    return this.keys.isDown(CODES.hands);
  }

  /** La durée (ms) du dernier appui d'E fini : la vraie, pas le temps que le jeu a mis à le lire (systems/longPress.ts). */
  handsLasted(): number | undefined {
    return this.keys.lastedFor(CODES.hands);
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

  /** Échap : arrêter la passe en cours ; vrai une seule fois par appui. */
  stopPressed(): boolean {
    return this.take('stop');
  }

  /** Une flèche ou ZQSD vient d'être pressée (pas maintenue) : interrompt un travail. Lit les quatre, une fois par appui. */
  movePressed(): boolean {
    return [this.take('up'), this.take('down'), this.take('left'), this.take('right')].some(Boolean);
  }

  /** La touche R est enfoncée en ce moment : R maintenu (pivoter une bille couchée). */
  turnDown(): boolean {
    return this.keys.isDown(CODES.turn);
  }

  /** La durée (ms) du dernier appui de R fini. */
  turnLasted(): number | undefined {
    return this.keys.lastedFor(CODES.turn);
  }

  /** V : la vitesse du temps, au palier suivant (en boucle) ; vrai une fois par appui, Maj tenue ou non (pendant une course). */
  speedPressed(): boolean {
    return this.take('speed');
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
    return this.keys.isDown(CODES.run);
  }

  /**
   * La direction et la course de cette image : les touches enfoncées, et celles pressées puis relâchées depuis l'image d'avant (la
   * plus brève des pressions déplace d'une image).
   */
  read(): { dir: Phaser.Math.Vector2; running: boolean } {
    const down = (a: Action) => (this.keys.downOrTapped(CODES[a]) ? 1 : 0);
    const dir = new Phaser.Math.Vector2(down('right') - down('left'), down('down') - down('up'));
    const running = down('run') === 1;
    this.keys.forgetTaps();
    return { dir, running };
  }

  /** Le zoom demandé depuis la dernière lecture : +1 (s'approcher), -1 (s'éloigner) ou 0. */
  zoomPressed(): 1 | -1 | 0 {
    const z = Math.sign(this.zoom) as 1 | -1 | 0;
    this.zoom = 0;
    return z;
  }

  private take(a: Action): boolean {
    return this.keys.take(CODES[a]);
  }
}
