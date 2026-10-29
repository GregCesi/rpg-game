import Phaser from 'phaser';
import { HUD, UI, VIEW, ZOOM } from '../config';
import { items } from '../content';
import { GameEvent } from '../events';
import { game, SLOTS } from '../state';

const K = Phaser.Input.Keyboard.KeyCodes;
const DIGITS = [K.ONE, K.TWO, K.THREE, K.FOUR, K.FIVE, K.SIX, K.SEVEN, K.EIGHT];
/** Écart entre deux cases (px) et marge sous la barre. */
const GAP = 2;
const BOTTOM = 6;

/**
 * La barre d'objets, au-dessus du monde : 8 cases, la case active est l'objet en main.
 * Touches 1 à 8 et molette pour changer de case. Affiche aussi les messages courts (GameEvent.Notice).
 * Lit GameState ; se redessine sur GameEvent.InventoryChanged. Cachée pendant un dialogue (il prend le bas de l'écran).
 */
export class HudScene extends Phaser.Scene {
  private slots: Phaser.GameObjects.Image[] = [];
  private icons: Phaser.GameObjects.Image[] = [];
  private counts: Phaser.GameObjects.Text[] = [];
  private notice!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Container;

  constructor() {
    super('hud');
  }

  create(): void {
    this.cameras.main.setZoom(ZOOM).centerOn(VIEW.width / 2, VIEW.height / 2);
    const size = this.textures.get('ui-slot').getSourceImage().width;
    const total = SLOTS * size + (SLOTS - 1) * GAP;
    const x0 = Math.round((VIEW.width - total) / 2);
    const y0 = VIEW.height - BOTTOM - size;
    this.bar = this.add.container(0, 0);
    for (let i = 0; i < SLOTS; i++) {
      const x = x0 + i * (size + GAP);
      const slot = this.add.image(x, y0, 'ui-slot').setOrigin(0);
      const icon = this.add.image(x + size / 2, y0 + size / 2, '__DEFAULT').setVisible(false);
      const count = this.add
        .text(x + size - 2, y0 + size - 1, '', { fontFamily: UI.font, fontSize: '9px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
        .setOrigin(1, 1)
        .setResolution(ZOOM);
      this.slots.push(slot);
      this.icons.push(icon);
      this.counts.push(count);
      this.bar.add([slot, icon, count]);
    }
    this.notice = this.add
      .text(VIEW.width / 2, y0 - 6, '', { fontFamily: UI.font, fontSize: '11px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setResolution(ZOOM)
      .setAlpha(0);

    const kb = this.input.keyboard!;
    DIGITS.forEach((code, i) => kb.addKey(code).on('down', () => this.select(i)));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.select((game.active + Math.sign(dy) + SLOTS) % SLOTS);
    });

    this.game.events.on(GameEvent.InventoryChanged, this.redraw, this);
    this.game.events.on(GameEvent.Notice, this.showNotice, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvent.InventoryChanged, this.redraw, this);
      this.game.events.off(GameEvent.Notice, this.showNotice, this);
    });
    this.redraw();
  }

  update(): void {
    const talking = this.scene.isActive('dialogue');
    this.bar.setVisible(!talking);
    if (talking) this.notice.setAlpha(0);
  }

  private select(i: number): void {
    if (this.scene.isActive('dialogue') || i === game.active) return;
    game.active = i;
    this.game.events.emit(GameEvent.InventoryChanged);
  }

  private redraw(): void {
    game.inventory.forEach((slot, i) => {
      this.slots[i].setTexture(i === game.active ? 'ui-slot-active' : 'ui-slot');
      this.icons[i].setVisible(!!slot);
      if (slot) this.icons[i].setTexture(items[slot.item].icon);
      this.counts[i].setText(slot && slot.count > 1 ? String(slot.count) : '');
    });
  }

  private showNotice(text: string): void {
    this.tweens.killTweensOf(this.notice);
    this.notice.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: HUD.noticeMs, duration: 300 });
  }
}
