import Phaser from 'phaser';
import { KeyLatch } from './keyLatch';
import type { HandIndex } from '../world/actionPlan';

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
  // E (ou Entrée) : agir sans outil sur ce qui est devant (parler, ouvrir, lire, prendre) ; maintenu, les gestes longs ; dans un
  // dialogue, la suite
  hands: ['KeyE', 'Enter', 'NumpadEnter'],
  // F (même place partout) : travailler avec l'outil en main
  work: ['KeyF'],
  // poser : le A d'un AZERTY (Q en QWERTY)
  drop: ['KeyQ'],
  turn: ['KeyR'],
  // Alt (Option sur Mac) maintenu : marcher discrètement
  sneak: ['AltLeft', 'AltRight'],
  // arrêter un travail ou une passe sur un rail ; annuler un lancer pendant qu'on vise
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

/**
 * Les touches dont Maj change la main (Maj + E prend dans la main gauche, Maj + A pose la main gauche) : avec Maj, l'appui est noté sous
 * un autre code du verrou (`Shift:KeyE`), à l'instant de l'événement (Maj lâchée avant que le jeu lise l'appui ne change rien).
 */
const SHIFTED: ReadonlySet<string> = new Set([...CODES.hands, ...CODES.drop]);
const shifted = (codes: readonly string[]) => codes.map((c) => `Shift:${c}`);

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

/**
 * Les deux boutons de la souris, dans le même verrou que le clavier (un clic n'est jamais perdu, sa durée est la vraie) : le bouton
 * gauche est la main droite, le droit la main gauche (docs/COMMANDES.md). Codes du verrou : `Mouse0` (gauche), `Mouse2` (droit).
 */
export const MOUSE = { left: 'Mouse0', right: 'Mouse2' } as const;

/** Le curseur sur le canevas (coordonnées du jeu, avant la caméra), ou rien tant que la souris n'y est pas passée. */
let CURSOR: { x: number; y: number } | undefined;

/** Le canevas du jeu : les clics d'ailleurs (le panneau ?dieu, le catalogue) ne sont pas des clics du jeu. */
let CANVAS: HTMLCanvasElement | undefined;

/** Le point du jeu (avant la caméra) sous un événement de souris. */
function gamePoint(e: MouseEvent): { x: number; y: number } | undefined {
  const c = CANVAS;
  if (!c) return undefined;
  const r = c.getBoundingClientRect();
  if (!r.width || !r.height) return undefined;
  return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
}

if (typeof window !== 'undefined') {
  // Ctrl+Z, Ctrl+Y (annuler, refaire : lus par leur lettre, plus bas) ne sont pas des appuis de leur touche (Z est KeyW en AZERTY)
  window.addEventListener('keydown', (e) => {
    // Alt (Option sur Mac) : marcher discrètement ; le navigateur n'en fait rien (pas de menu)
    if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();
    const code = e.shiftKey && SHIFTED.has(e.code) ? `Shift:${e.code}` : e.code;
    LATCH.down(code, e.timeStamp, e.repeat || e.ctrlKey || e.metaKey);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();
    LATCH.up(e.code, e.timeStamp);
    if (SHIFTED.has(e.code)) LATCH.up(`Shift:${e.code}`, e.timeStamp);
  });
  window.addEventListener('blur', () => LATCH.clear());
  // la souris : enfoncée sur le canevas, relâchée n'importe où (comme Phaser) ; à l'instant de l'événement
  window.addEventListener('mousedown', (e) => {
    if (!CANVAS || e.target !== CANVAS) return;
    CURSOR = gamePoint(e) ?? CURSOR;
    if (e.button === 0 || e.button === 2) LATCH.down(`Mouse${e.button}`, e.timeStamp);
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0 || e.button === 2) LATCH.up(`Mouse${e.button}`, e.timeStamp);
  });
  window.addEventListener('mousemove', (e) => {
    if (!CANVAS || e.target !== CANVAS) return;
    CURSOR = gamePoint(e) ?? CURSOR;
  });
}

/** Oublie les touches enfoncées : un passage avec fondu (une porte, une sortie) repart à l'arrêt, comme avant les zones. */
export function forgetHeldKeys(): void {
  LATCH.clear();
}

/**
 * Traduit le clavier et la souris en intention (docs/COMMANDES.md) : direction, course, pas discrets (Alt) ; E (ou Entrée) : agir sans
 * outil sur ce qui est devant, prendre (Maj + E : dans la main gauche), maintenu les gestes longs ; F : travailler avec l'outil ; A (Q
 * en QWERTY) : poser (Maj + A : la main gauche) ; R : tourner ce qu'on poserait ; les deux clics, pour le combat (gauche : la main
 * droite ; droit : la main gauche ; courts ou maintenus), le curseur. Échap : arrêter un travail, annuler un lancer. V : la vitesse du
 * temps. Molette, + et − : le zoom. Espace ne fait rien (réservé).
 */
export class PlayerInput {
  /** Le clavier, commun à toutes les scènes (LATCH). */
  private readonly keys = LATCH;
  /** Crans de zoom demandés (molette, + et −), pas encore lus : positif pour s'approcher. */
  private zoom = 0;
  /** Ctrl+Z (annuler) et Ctrl+Y ou Ctrl+Maj+Z (refaire) du mode construction, pas encore lus. */
  private history: 'undo' | 'redo' | undefined;

  constructor(scene: Phaser.Scene) {
    if (CANVAS !== scene.game.canvas) {
      CANVAS = scene.game.canvas;
      // la souris sort du canevas (vers le panneau ?dieu, le catalogue) : plus de curseur, Xéros vise devant lui, comme au clavier seul
      CANVAS.addEventListener('mouseleave', () => (CURSOR = undefined));
    }
    // pas de menu du navigateur au clic droit sur le canevas : c'est la main gauche
    scene.input.mouse?.disableContextMenu();
    const kb = scene.input.keyboard!;
    // Tab et Espace (réservé à l'esquive et au saut, plus tard) ne doivent pas faire défiler la page ni changer le focus
    kb.addCapture([K.TAB, K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT, K.PAGE_UP, K.PAGE_DOWN]);
    // les appuis d'avant cette scène (lus par la précédente, ou pendant un fondu) ne la concernent pas
    for (const codes of Object.values(CODES)) this.keys.take(codes);
    this.keys.take(shifted([...SHIFTED]));
    this.keys.take([MOUSE.left, MOUSE.right]);
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

  /** E (ou Entrée), avec Maj ou non : vrai une seule fois par appui (un dialogue : la suite). */
  handsPressed(): boolean {
    return this.actPressed() !== undefined;
  }

  /** E (ou Entrée) pressé : la main où il prend d'abord (la droite ; avec Maj, la gauche), une fois par appui ; sinon undefined. */
  actPressed(): HandIndex | undefined {
    if (this.take('hands')) return 1;
    return this.keys.take(shifted(CODES.hands)) ? 0 : undefined;
  }

  /** E (ou Entrée) est enfoncé en ce moment (E maintenu), avec Maj ou non. */
  actDown(): boolean {
    return this.keys.isDown([...CODES.hands, ...shifted(CODES.hands)]);
  }

  /** La durée vraie (ms) du dernier appui fini de E (src/input/keyLatch.ts). */
  actLasted(): number | undefined {
    return this.keys.lastedFor([...CODES.hands, ...shifted(CODES.hands)]);
  }

  /** F : travailler avec l'outil en main ; vrai une seule fois par appui. */
  workPressed(): boolean {
    return this.take('work');
  }

  /** Poser (A en AZERTY, Q en QWERTY : la même place) : la main qui pose d'abord (la droite ; avec Maj, la gauche), une fois par appui. */
  putPressed(): HandIndex | undefined {
    if (this.take('drop')) return 1;
    return this.keys.take(shifted(CODES.drop)) ? 0 : undefined;
  }

  /** R : tourner ce qu'on poserait ; vrai une seule fois par appui. */
  turnPressed(): boolean {
    return this.take('turn');
  }

  /** Échap : arrêter le travail ou la passe en cours, annuler un lancer ; vrai une seule fois par appui. */
  stopPressed(): boolean {
    return this.take('stop');
  }

  /** Z (W en QWERTY) ou flèche du haut : vrai une fois par appui (choisir une réponse dans un dialogue). */
  upPressed(): boolean {
    return this.take('up');
  }

  /** S ou flèche du bas : vrai une fois par appui. */
  downPressed(): boolean {
    return this.take('down');
  }

  /** Une flèche ou ZQSD vient d'être pressée (pas maintenue) : interrompt un travail. Lit les quatre, une fois par appui. */
  movePressed(): boolean {
    return [this.take('up'), this.take('down'), this.take('left'), this.take('right')].some(Boolean);
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
  read(): { dir: Phaser.Math.Vector2; running: boolean; sneaking: boolean } {
    const down = (a: Action) => (this.keys.downOrTapped(CODES[a]) ? 1 : 0);
    const dir = new Phaser.Math.Vector2(down('right') - down('left'), down('down') - down('up'));
    const running = down('run') === 1;
    // Alt (Option sur Mac) : marcher discrètement, à pas lents ; il l'emporte sur la course
    const sneaking = this.keys.isDown(CODES.sneak);
    this.keys.forgetTaps();
    return { dir, running: running && !sneaking, sneaking };
  }

  /** Un clic du bouton `button` (gauche : la main droite ; droit : la main gauche) commencé depuis la dernière lecture : une fois par clic. */
  clickPressed(button: 'left' | 'right'): boolean {
    return this.keys.take([MOUSE[button]]);
  }

  /** Le bouton `button` est enfoncé en ce moment (un clic maintenu). */
  clickDown(button: 'left' | 'right'): boolean {
    return this.keys.isDown([MOUSE[button]]);
  }

  /** La durée vraie (ms) du dernier clic fini du bouton `button` (src/input/keyLatch.ts). */
  clickLasted(button: 'left' | 'right'): number | undefined {
    return this.keys.lastedFor([MOUSE[button]]);
  }

  /**
   * Le point du monde sous le curseur, vu par la caméra `cam` à cette image (la caméra suit Xéros : le curseur immobile vise un autre
   * point du monde quand elle bouge) ; undefined tant que la souris n'est pas passée sur le canevas.
   */
  cursor(cam: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } | undefined {
    if (!CURSOR) return undefined;
    const p = cam.getWorldPoint(CURSOR.x, CURSOR.y);
    return { x: p.x, y: p.y };
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
