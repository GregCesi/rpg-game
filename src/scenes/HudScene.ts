import Phaser from 'phaser';
import { HUD, UI, VIEW, ZOOM } from '../config';
import { items, props } from '../content';
import { GameEvent } from '../events';
import { game, type Held } from '../state';

/** Écart entre les deux cases (px) et marge sous les cases. */
const GAP = 4;
const BOTTOM = 10;

/** Ce que montre une main vide : une main ouverte, gauche ou droite. */
const EMPTY = ['ui-hand-left', 'ui-hand-right'];

/**
 * Les deux mains, au-dessus du monde : main gauche (G) et main droite (D), la case active marquée ; une main vide montre
 * une main ouverte. Ce qu'on tient à deux mains s'affiche dans la case droite, la gauche montre alors « deux mains »
 * (`ui-hands-both`), et les deux cases sont marquées.
 * Affiche aussi les messages courts (GameEvent.Notice). Lit GameState ; se redessine sur GameEvent.HandsChanged.
 * Cachée pendant un dialogue (il prend le bas de l'écran).
 */
/** Icône d'un objet possédable, ou celle d'un objet du monde porté (`icon` de son `take`). */
function icon(h: Held): string {
  return 'item' in h ? items[h.item].icon : props[h.prop].take!.icon;
}

export class HudScene extends Phaser.Scene {
  private slots: Phaser.GameObjects.Image[] = [];
  private icons: Phaser.GameObjects.Image[] = [];
  private notice!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Container;

  constructor() {
    super('hud');
  }

  /** `notice` : message à afficher dès le lancement, plus longtemps qu'un message court (sauvegarde refusée). */
  create(data: { notice?: string } = {}): void {
    this.cameras.main.setZoom(ZOOM).centerOn(VIEW.width / 2, VIEW.height / 2);
    const size = this.textures.get('ui-slot').getSourceImage().width;
    const x0 = Math.round((VIEW.width - (2 * size + GAP)) / 2);
    const y0 = VIEW.height - BOTTOM - size;
    this.bar = this.add.container(0, 0);
    const label = { fontFamily: UI.font, fontSize: '8px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 };
    ['G', 'D'].forEach((name, i) => {
      const x = x0 + i * (size + GAP);
      const slot = this.add.image(x, y0, 'ui-slot').setOrigin(0);
      const icon = this.add.image(x + size / 2, y0 + size / 2, EMPTY[i]);
      const text = this.add.text(x + size / 2, y0 + size + 1, name, label).setOrigin(0.5, 0).setResolution(ZOOM);
      this.slots.push(slot);
      this.icons.push(icon);
      this.bar.add([slot, icon, text]);
    });
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
    if (data.notice) this.showNotice(data.notice, HUD.longNoticeMs);
  }

  update(): void {
    const talking = this.scene.isActive('dialogue');
    this.bar.setVisible(!talking);
    if (talking) this.notice.setAlpha(0);
  }

  private redraw(): void {
    const shown = game.both ? ['ui-hands-both', icon(game.both)] : game.hands.map((h, i) => (h ? icon(h) : EMPTY[i]));
    shown.forEach((key, i) => {
      this.slots[i].setTexture(game.both || i === game.active ? 'ui-slot-active' : 'ui-slot');
      this.icons[i].setTexture(key);
    });
  }

  private showNotice(text: string, ms: number = HUD.noticeMs): void {
    this.tweens.killTweensOf(this.notice);
    this.notice.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: ms, duration: 300 });
  }
}
