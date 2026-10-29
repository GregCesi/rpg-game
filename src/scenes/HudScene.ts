import Phaser from 'phaser';
import { HUD, UI, VIEW, ZOOM } from '../config';
import { items, props } from '../content';
import { GameEvent } from '../events';
import { game, type Held } from '../state';

/** Écart entre les deux cases (px) et marge sous les cases. */
const GAP = 4;
const BOTTOM = 10;
/** Côté de l'image dans une case : un objet du monde porté (la bille) est réduit pour y tenir. */
const ICON_MAX = 22;

/**
 * Les deux mains, au-dessus du monde : main gauche (G) et main droite (D), la case active marquée.
 * Ce qu'on tient à deux mains s'affiche à cheval sur les deux cases, toutes deux marquées.
 * Affiche aussi les messages courts (GameEvent.Notice). Lit GameState ; se redessine sur GameEvent.HandsChanged.
 * Cachée pendant un dialogue (il prend le bas de l'écran).
 */
export class HudScene extends Phaser.Scene {
  private slots: Phaser.GameObjects.Image[] = [];
  private icons: Phaser.GameObjects.Image[] = [];
  /** Ce qu'on tient à deux mains, entre les deux cases. */
  private bothIcon!: Phaser.GameObjects.Image;
  private notice!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Container;

  constructor() {
    super('hud');
  }

  create(): void {
    this.cameras.main.setZoom(ZOOM).centerOn(VIEW.width / 2, VIEW.height / 2);
    const size = this.textures.get('ui-slot').getSourceImage().width;
    const x0 = Math.round((VIEW.width - (2 * size + GAP)) / 2);
    const y0 = VIEW.height - BOTTOM - size;
    this.bar = this.add.container(0, 0);
    const label = { fontFamily: UI.font, fontSize: '8px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 };
    ['G', 'D'].forEach((name, i) => {
      const x = x0 + i * (size + GAP);
      const slot = this.add.image(x, y0, 'ui-slot').setOrigin(0);
      const icon = this.add.image(x + size / 2, y0 + size / 2, '__DEFAULT').setVisible(false);
      const text = this.add.text(x + size / 2, y0 + size + 1, name, label).setOrigin(0.5, 0).setResolution(ZOOM);
      this.slots.push(slot);
      this.icons.push(icon);
      this.bar.add([slot, icon, text]);
    });
    this.bothIcon = this.add.image(x0 + size + GAP / 2, y0 + size / 2, '__DEFAULT').setVisible(false);
    this.bar.add(this.bothIcon);
    this.notice = this.add
      .text(VIEW.width / 2, y0 - 6, '', { fontFamily: UI.font, fontSize: '11px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setResolution(ZOOM)
      .setAlpha(0);

    this.game.events.on(GameEvent.HandsChanged, this.redraw, this);
    this.game.events.on(GameEvent.Notice, this.showNotice, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvent.HandsChanged, this.redraw, this);
      this.game.events.off(GameEvent.Notice, this.showNotice, this);
    });
    this.redraw();
  }

  update(): void {
    const talking = this.scene.isActive('dialogue');
    this.bar.setVisible(!talking);
    if (talking) this.notice.setAlpha(0);
  }

  private redraw(): void {
    game.hands.forEach((h, i) => {
      this.slots[i].setTexture(game.both || i === game.active ? 'ui-slot-active' : 'ui-slot');
      this.show(this.icons[i], h);
    });
    this.show(this.bothIcon, game.both);
  }

  /** Icône d'un objet possédable, ou image réduite d'un objet du monde porté. */
  private show(image: Phaser.GameObjects.Image, h: Held | null): void {
    image.setVisible(!!h);
    if (!h) return;
    if ('item' in h) image.setTexture(items[h.item].icon).setScale(1);
    else {
      image.setTexture(h.flip ? `${props[h.prop].image}-left` : props[h.prop].image);
      image.setScale(Math.min(1, ICON_MAX / image.width, ICON_MAX / image.height));
    }
  }

  private showNotice(text: string): void {
    this.tweens.killTweensOf(this.notice);
    this.notice.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: HUD.noticeMs, duration: 300 });
  }
}
