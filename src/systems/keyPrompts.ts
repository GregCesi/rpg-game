import Phaser from 'phaser';
import { DEPTH, KEY_PROMPT } from '../config';
import { CM_PER_PX } from '../content/gabarit';

/**
 * Où montrer une touche : le milieu de la cible (`x`), le haut de son image (`top`) et son pied au sol (`y`). Un objet plus haut que
 * `KEY_PROMPT.tall` (l'arbre) a sa touche à `KEY_PROMPT.at` du sol, sur le tronc ; sinon juste au-dessus de lui.
 */
export interface PromptSpot {
  x: number;
  y: number;
  top: number;
}

/** Ce que montrent les touches à cette image (world/actionPlan.ts, lu par la scène) ; rien : la touche ne s'affiche pas. */
export interface Prompts {
  /** E : `hold`, un geste long existe (les trois points dessous) ; `fill`, E est maintenu (de 0 à 1 : la touche se remplit d'or). */
  e?: PromptSpot & { hold: boolean; fill?: number };
  f?: PromptSpot;
  /** A (Q en QWERTY) : au-dessus du fantôme, ou de ce sur quoi elle pose. */
  a?: PromptSpot;
}

/** Le bas d'une touche au-dessus de `s` (avant le balancement). */
function anchorY(s: PromptSpot): number {
  const tallPx = KEY_PROMPT.tall / CM_PER_PX;
  if (s.y - s.top > tallPx) return Math.round(s.y - KEY_PROMPT.at / CM_PER_PX);
  return Math.round(s.top + KEY_PROMPT.lift);
}

/**
 * La lettre de la touche « poser » selon le clavier (la touche est lue à sa place, KeyQ : A en AZERTY, Q en QWERTY) :
 * `navigator.keyboard.getLayoutMap` quand le navigateur le connaît (Chrome, Edge), sinon A.
 */
let PUT_KEY: 'ui-key-a' | 'ui-key-q' = 'ui-key-a';
if (typeof navigator !== 'undefined') {
  const kb = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
  kb?.getLayoutMap?.()
    .then((m) => {
      if (m.get('KeyQ')?.toLowerCase() === 'q') PUT_KEY = 'ui-key-q';
    })
    .catch(() => undefined);
}

/**
 * Les touches au-dessus de ce qui est devant Xéros (docs/COMMANDES.md) : E (agir sans outil, prendre), F (travailler avec l'outil),
 * A (poser, au-dessus du fantôme). Crèmes ; E se remplit d'or pendant qu'on la maintient (`ui-key-e-fill`) ; trois points sous E
 * quand elle se maintient aussi (`ui-key-dots`) ; E et F sur la même cible : côte à côte, E à gauche. Balancées comme l'invite
 * d'autrefois. Ne décide rien : la scène dit ce qui se montre.
 */
export class KeyPrompts {
  private readonly e: Phaser.GameObjects.Image;
  private readonly dots: Phaser.GameObjects.Image;
  private readonly f: Phaser.GameObjects.Image;
  private readonly a: Phaser.GameObjects.Image;
  private readonly fill: (string | number)[];

  constructor(scene: Phaser.Scene) {
    const img = (key: string) => scene.add.image(0, 0, key).setOrigin(0, 1).setDepth(DEPTH.prompt).setVisible(false);
    this.e = img('ui-key-e');
    this.f = img('ui-key-f');
    this.a = img(PUT_KEY);
    this.dots = img('ui-key-dots').setOrigin(0, 0);
    this.fill = scene.anims.exists('ui-key-e-fill-fill') ? scene.anims.get('ui-key-e-fill-fill').frames.map((f) => f.frame.name) : [];
  }

  /** À chaque image : `time`, le temps du jeu (le balancement) ; `p`, ce qui se montre. */
  update(time: number, p: Prompts): void {
    const bob = Math.round((Math.sin(time / 220) + 1) / 2) * KEY_PROMPT.bob;
    const w = this.e.width;
    // E et F au même endroit : côte à côte, E à gauche, F à droite
    const pair = !!p.e && !!p.f && Math.abs(p.e.x - p.f.x) < w && Math.abs(anchorY(p.e) - anchorY(p.f)) < this.e.height;
    const left = (x: number, shift: number) => Math.round(x - w / 2 + shift);
    const half = (w + KEY_PROMPT.gap) / 2;
    if (p.e) {
      const y = anchorY(p.e) - bob;
      const x = left(pair ? (p.e.x + p.f!.x) / 2 : p.e.x, pair ? -half : 0);
      if (p.e.fill !== undefined && this.fill.length) {
        const k = Math.min(this.fill.length - 1, Math.floor(p.e.fill * this.fill.length));
        this.e.setTexture('ui-key-e-fill', this.fill[k]);
      } else this.e.setTexture('ui-key-e');
      this.e.setPosition(x, y).setVisible(true);
      this.dots.setPosition(x, y + KEY_PROMPT.dots).setVisible(p.e.hold && p.e.fill === undefined);
    } else {
      this.e.setVisible(false);
      this.dots.setVisible(false);
    }
    if (p.f) {
      const x = left(pair ? (p.e!.x + p.f.x) / 2 : p.f.x, pair ? half : 0);
      const y = (pair ? anchorY(p.e!) : anchorY(p.f)) - bob;
      this.f.setPosition(x, y).setVisible(true);
    } else this.f.setVisible(false);
    if (p.a) {
      if (this.a.texture.key !== PUT_KEY) this.a.setTexture(PUT_KEY);
      this.a.setPosition(left(p.a.x, 0), anchorY(p.a) - bob).setVisible(true);
    } else this.a.setVisible(false);
  }

  /** Tout se cache (un dialogue, un geste, le mode construction). */
  hide(): void {
    for (const i of [this.e, this.dots, this.f, this.a]) i.setVisible(false);
  }
}
