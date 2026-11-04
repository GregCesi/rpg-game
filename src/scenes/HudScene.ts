import Phaser from 'phaser';
import { HUD, STAMINA_BAR, UI, VIEW, UI_ZOOM } from '../config';
import { items, props, stamina } from '../content';
import type { StaminaLevels } from '../entities/Stamina';
import { GameEvent, type PlayerCell } from '../events';
import { game, type Held } from '../state';
import { defOf } from '../world/woodPiece';
import { stateImage } from '../world/pileShape';
import { clockLabel } from '../world/clock';
import { clockFace } from '../world/clockFace';
import { simSpeed } from '../systems/simSpeed';
import { Minimap } from '../systems/minimap';
import type { ClickPlan } from '../world/clickAction';

/** Écart entre les deux cases (px), marge sous les cases, et au bord droit de l'écran. */
const GAP = 4;
const BOTTOM = 10;
const MARGIN = 4;
/** La hauteur de la ligne des mots des clics, au-dessus des cases (px). */
const WORDS = 9;

/**
 * Signes (images `ui-digit-<signe>`) de la longueur restante d'un objet tenu, en mètres : « 8 m » donne 8 puis m,
 * « 1,5 m » donne 1, virgule, 5 puis m.
 */
function lengthGlyphs(cm: number): string[] {
  const digits = String(Math.round(cm) / 100).split('').map((c) => (c === '.' ? 'comma' : c));
  return [...digits, 'm'];
}

/** Ce que montre une main vide : une main ouverte, gauche ou droite. */
const EMPTY = ['ui-hand-left', 'ui-hand-right'];

/**
 * Les deux mains, au-dessus du monde : main gauche (G, le clic droit) et main droite (D, le clic gauche) ; une main vide montre
 * une main ouverte. Ce qu'on tient à deux mains s'affiche dans la case droite, la gauche montre alors « deux mains »
 * (`ui-hands-both`), et les deux cases sont marquées.
 * Affiche aussi les messages courts (GameEvent.Notice). Lit GameState ; se redessine sur GameEvent.HandsChanged.
 * Cachée pendant un dialogue (il prend le bas de l'écran).
 */
/** Icône d'un objet possédable, ou celle d'un objet du monde porté (`icon` de son `take`). */
function icon(h: Held): string {
  if ('item' in h) return items[h.item].icon;
  // un objet à plusieurs états (le fagot et son nombre de branches) : son icône suit l'état
  return stateImage(defOf(h.prop, h.wood).take!.icon, h.prop, h.bundle);
}

export class HudScene extends Phaser.Scene {
  private slots: Phaser.GameObjects.Image[] = [];
  private icons: Phaser.GameObjects.Image[] = [];
  /** Longueur restante de ce que tient chaque main (le rouleau de corde), en petits signes en bas de la case. */
  private lengths: Phaser.GameObjects.Image[][] = [[], []];
  /** Coin bas droit de chaque case, où s'aligne la longueur. */
  private corners: [number, number][] = [];
  private notice!: Phaser.GameObjects.Text;
  /** Près de chaque case, le mot de ce que ferait son clic sur ce qui est visé (G : le clic droit, D : le clic gauche). */
  private words: Phaser.GameObjects.Text[] = [];
  /** Ce que disent les mots (lu par les tests de scénario). */
  wordsText: [string, string] = ['', ''];
  private bar!: Phaser.GameObjects.Container;
  /** Barre d'endurance, au-dessus des deux cases : le cadre, puis dans le creux le perdu, le « revient » et le souffle. */
  private energy!: Phaser.GameObjects.Container;
  private energyParts!: Record<'mid' | 'right' | 'lost' | 'backEdge' | 'back' | 'breathEdge' | 'breath', Phaser.GameObjects.TileSprite>;
  /** Bord droit de la barre (elle s'allonge vers la gauche avec le maximum, au-dessus des mains). */
  private energyRight = 0;
  private energyX = 0;
  /** Le clignotement de la part « revient », pendant que Xéros est essoufflé. */
  private blink?: Phaser.Tweens.Tween;

  constructor() {
    super('hud');
  }

  /** Le cadran du temps, en haut à droite (world/clockFace.ts) : ses images, redessinées quand l'heure ou la vitesse change. */
  private face!: Phaser.GameObjects.Container;
  private faceKey = '';
  /** Ce que dit le cadran (« Jour 3 · 14:20  x1 » : l'heure et la vitesse, toujours) : lu par les tests de scénario. */
  clockText = '';
  /** La petite carte, en haut à gauche (systems/minimap.ts). */
  private minimap!: Minimap;
  /** Ce que montre la petite carte (la case de Xéros, son sens, le cran) : lu par les tests de scénario. */
  get minimapText(): string {
    return this.minimap.view.visible ? this.minimap.text : '';
  }

  create(data: { notice?: string } = {}): void {
    this.cameras.main.setZoom(UI_ZOOM).centerOn(VIEW.width / 2, VIEW.height / 2);
    const size = this.textures.get('ui-slot').getSourceImage().width;
    // les deux mains et la barre d'endurance en bas à droite ; la journée se surveille en haut à droite (le cadran)
    const x0 = VIEW.width - MARGIN - (2 * size + GAP);
    const y0 = VIEW.height - BOTTOM - size;
    this.bar = this.add.container(0, 0);
    const label = { fontFamily: UI.font, fontSize: '8px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 };
    ['G', 'D'].forEach((name, i) => {
      const x = x0 + i * (size + GAP);
      const slot = this.add.image(x, y0, 'ui-slot').setOrigin(0);
      const icon = this.add.image(x + size / 2, y0 + size / 2, EMPTY[i]);
      const text = this.add.text(x + size / 2, y0 + size + 1, name, label).setOrigin(0.5, 0).setResolution(UI_ZOOM);
      this.slots.push(slot);
      this.icons.push(icon);
      this.corners.push([x + size - 1, y0 + size - 1]);
      // G : à gauche de sa case, au milieu ; D : au-dessus de la sienne, calé à droite (les deux mots ne se touchent jamais)
      const style = { ...label, fontSize: '7px', color: '#e8dab8', strokeThickness: 2 };
      const word = (i === 0 ? this.add.text(x - 3, y0 + size / 2, '', style).setOrigin(1, 0.5) : this.add.text(x + size, y0 - 1, '', style).setOrigin(1, 1)).setResolution(UI_ZOOM);
      this.words.push(word);
      this.bar.add([slot, icon, text, word]);
    });
    this.makeEnergy(VIEW.width - MARGIN, y0 - WORDS - STAMINA_BAR.gap);
    // le cadran du temps, en haut à droite (docs/CONCEPTION.md, « Le temps »)
    this.face = this.add.container(0, 0);
    this.bar.add(this.face);
    this.notice = this.add
      .text(VIEW.width / 2, y0 - WORDS - STAMINA_BAR.gap - STAMINA_BAR.height - 4, '', { fontFamily: UI.font, fontSize: '11px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setResolution(UI_ZOOM)
      .setAlpha(0);

    // la petite carte, en haut à gauche (docs/CONCEPTION.md, « La petite carte »)
    this.minimap = new Minimap(this);
    this.game.events.on(GameEvent.PlayerCell, this.onCell, this);
    this.game.events.on(GameEvent.HandsChanged, this.redraw, this);
    this.game.events.on(GameEvent.ClickPlans, this.showWords, this);
    this.game.events.on(GameEvent.Stamina, this.showEnergy, this);
    this.game.events.on(GameEvent.StaminaDenied, this.shakeEnergy, this);
    this.game.events.on(GameEvent.Notice, this.showNotice, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvent.PlayerCell, this.onCell, this);
      this.game.events.off(GameEvent.HandsChanged, this.redraw, this);
      this.game.events.off(GameEvent.ClickPlans, this.showWords, this);
      this.game.events.off(GameEvent.Stamina, this.showEnergy, this);
      this.game.events.off(GameEvent.StaminaDenied, this.shakeEnergy, this);
      this.game.events.off(GameEvent.Notice, this.showNotice, this);
    });
    this.redraw();
    if (data.notice) this.showNotice(data.notice, HUD.longNoticeMs);
  }

  update(time: number): void {
    this.drawFace();
    const talking = this.scene.isActive('dialogue');
    // cachée pendant un dialogue, comme le reste
    this.minimap.update(time, talking);
    this.bar.setVisible(!talking);
    if (talking) this.notice.setAlpha(0);
  }

  /**
   * La barre d'endurance (docs/CONCEPTION.md, « Le temps »), son bord droit en `right`, son bas en `bottom` : pièces de art/ui/stamina-bar.ts,
   * posées selon son contrat (le creux en (3, 3), 1 px pour 2 points ; elle s'allonge avec le maximum).
   */
  private makeEnergy(right: number, bottom: number): void {
    const { inner, end, height } = STAMINA_BAR;
    const tile = (x: number, y: number, h: number, key: string) => this.add.tileSprite(x, y, 1, h, key).setOrigin(0);
    const left = this.add.image(0, 0, 'ui-bar-left').setOrigin(0);
    this.energyParts = {
      mid: tile(end, 0, height, 'ui-bar-mid'),
      right: tile(end, 0, height, 'ui-bar-right'),
      lost: tile(inner, inner, 4, 'ui-bar-lost'),
      backEdge: tile(inner, inner, 4, 'ui-bar-back-edge'),
      back: tile(inner, inner, 4, 'ui-bar-back'),
      breathEdge: tile(inner, inner, 4, 'ui-bar-breath-edge'),
      breath: tile(inner, inner, 4, 'ui-bar-breath'),
    };
    this.energyParts.right.setSize(end, height);
    const p = this.energyParts;
    this.energy = this.add.container(0, bottom - height, [left, p.mid, p.right, p.lost, p.backEdge, p.back, p.breathEdge, p.breath]);
    this.energyRight = right;
    this.bar.add(this.energy);
    this.showEnergy({ ...game.stamina, winded: false });
  }

  /**
   * La barre montre les trois niveaux : le souffle (vert, rouge quand Xéros est fatigué), ce qui « revient » jusqu'au plafond du jour
   * (le torchis), le perdu jusqu'au maximum (hachuré). Essoufflé, la part qui revient clignote.
   */
  private showEnergy(e: StaminaLevels): void {
    const { pxPerPoint, inner, end } = STAMINA_BAR;
    const px = (v: number) => (v <= 0 ? 0 : Math.max(1, Math.round(v * pxPerPoint)));
    const iw = Math.max(1, Math.round(e.max * pxPerPoint));
    const pc = Math.min(px(e.ceiling), iw);
    const pb = Math.min(px(e.breath), pc);
    const p = this.energyParts;
    p.mid.setSize(iw, STAMINA_BAR.height);
    p.right.setX(end + iw);
    p.lost.setSize(iw, 4);
    // une part : sa colonne de bord, puis le reste répété
    const part = (edge: Phaser.GameObjects.TileSprite, body: Phaser.GameObjects.TileSprite, from: number, width: number) => {
      edge.setVisible(width > 0).setX(inner + from).setSize(1, 4);
      body.setVisible(width > 1).setX(inner + from + 1).setSize(Math.max(1, width - 1), 4);
    };
    part(p.backEdge, p.back, pb, pc - pb);
    const low = e.ceiling < stamina.tired * e.max;
    p.breathEdge.setTexture(low ? 'ui-bar-breath-low-edge' : 'ui-bar-breath-edge');
    p.breath.setTexture(low ? 'ui-bar-breath-low' : 'ui-bar-breath');
    part(p.breathEdge, p.breath, 0, pb);
    this.energyX = Math.round(this.energyRight - (iw + 2 * end));
    if (!this.tweens.isTweening(this.energy)) this.energy.x = this.energyX;
    // essoufflé : ce qui revient clignote (il attend son souffle) ; sinon la barre est franche
    if (e.winded && !this.blink) {
      this.blink = this.tweens.add({ targets: [p.backEdge, p.back], alpha: STAMINA_BAR.blinkAlpha, duration: STAMINA_BAR.blinkMs, yoyo: true, repeat: -1 });
    } else if (!e.winded && this.blink) {
      this.blink.stop();
      this.blink = undefined;
      p.backEdge.setAlpha(1);
      p.back.setAlpha(1);
    }
  }

  /** Un effort a été refusé (épuisé) : la barre tremble un instant. */
  private shakeEnergy(): void {
    const x = this.energyX;
    this.tweens.killTweensOf(this.energy);
    this.tweens.add({ targets: this.energy, x: { from: x - 2, to: x + 2 }, duration: 45, yoyo: true, repeat: 3, onComplete: () => (this.energy.x = x) });
  }

  private redraw(): void {
    const shown = game.both ? ['ui-hands-both', icon(game.both)] : game.hands.map((h, i) => (h ? icon(h) : EMPTY[i]));
    shown.forEach((key, i) => {
      // à deux mains, les deux cases sont marquées (il n'y a plus de main active : chaque clic dit sa main)
      this.slots[i].setTexture(game.both ? 'ui-slot-active' : 'ui-slot');
      this.icons[i].setTexture(key);
      // ce qu'on tient à deux mains s'affiche dans la case droite
      const h = game.both ? (i === 1 ? game.both : null) : game.hands[i];
      // la longueur de ce qu'on tient : ce qui reste du rouleau, ou celle de la pièce de bois
      const p = h && 'prop' in h ? h : undefined;
      const def = p ? props[p.prop] : undefined;
      const length = p?.wood ? p.wood.length : def?.length ? (p!.length ?? def.length.start) : undefined;
      this.showLength(i, length);
    });
  }

  /**
   * Le mot de chaque clic (world/clickAction.ts, la même fonction que le jeu) : à gauche de la case G, celui du clic droit ; au-dessus de
   * la case D, celui du clic gauche. Le clic court d'abord ; le geste long d'une main vide s'y ajoute (« prendre · nouer ») ; « lancer », qui vaut
   * pour tout ce qu'on tient, ne s'écrit pas. Rien hors du jeu (un geste, un dialogue).
   */
  private showWords(plans?: { left: ClickPlan; right: ClickPlan }): void {
    const word = (p: ClickPlan | undefined) => {
      if (!p) return '';
      const long = p.long.kind !== 'none' && p.long.kind !== 'throw' ? p.long.label : '';
      return [p.short.label, long].filter(Boolean).join(' · ');
    };
    const next: [string, string] = [word(plans?.right), word(plans?.left)];
    next.forEach((t, i) => {
      if (t === this.wordsText[i]) return;
      this.words[i].setText(t);
    });
    this.wordsText = next;
  }

  /** Écrit la longueur `cm` (ou rien) en bas à droite de la case `i`, comme le nombre de pièces d'un tas. */
  private showLength(i: number, cm: number | undefined): void {
    for (const g of this.lengths[i]) g.destroy();
    this.lengths[i] = [];
    if (cm === undefined) return;
    const glyphs = lengthGlyphs(cm);
    let [x] = this.corners[i];
    const bottom = this.corners[i][1];
    for (let k = glyphs.length - 1; k >= 0; k--) {
      const g = this.add.image(0, 0, `ui-digit-${glyphs[k]}`).setOrigin(0, 1);
      // contours voisins confondus ; un pixel d'écart avant le m, comme une espace
      x -= g.width - (k < glyphs.length - 1 ? (glyphs[k + 1] === 'm' ? -1 : 1) : 0);
      g.setPosition(x, bottom);
      this.lengths[i].push(g);
      this.bar.add(g);
    }
  }

  private onCell(cell: PlayerCell | undefined): void {
    this.minimap.setCell(cell);
  }

  /** Le cadran : redessiné seulement quand ce qu'il montre change (la minute, le jour, la vitesse). */
  private drawFace(): void {
    const c = game.clock;
    const speed = simSpeed();
    const key = `${c.day}:${Math.floor(c.minute)}:${speed}`;
    if (key === this.faceKey) return;
    this.faceKey = key;
    this.clockText = `${clockLabel(c)}  x${speed}`;
    this.face.removeAll(true);
    const width = (k: string) => this.textures.get(k).getSourceImage().width;
    for (const p of clockFace(c, speed, VIEW.width, width)) {
      const img = p.repeat ? this.add.tileSprite(p.x, p.y, p.repeat, this.textures.get(p.key).getSourceImage().height, p.key) : this.add.image(p.x, p.y, p.key);
      this.face.add(img.setOrigin(0));
    }
  }

  private showNotice(text: string, ms: number = HUD.noticeMs): void {
    this.tweens.killTweensOf(this.notice);
    this.notice.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: ms, duration: 300 });
  }
}
