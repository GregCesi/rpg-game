import Phaser from 'phaser';
import { HUD, UI, VIEW, ZOOM } from '../config';
import { items, props, stamina } from '../content';
import { GameEvent } from '../events';
import { game, type Held } from '../state';
import { defOf } from '../world/woodPiece';

/** Écart entre les deux cases (px) et marge sous les cases. */
const GAP = 4;
const BOTTOM = 10;

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
 * Les deux mains, au-dessus du monde : main gauche (G) et main droite (D), la case active marquée ; une main vide montre
 * une main ouverte. Ce qu'on tient à deux mains s'affiche dans la case droite, la gauche montre alors « deux mains »
 * (`ui-hands-both`), et les deux cases sont marquées.
 * Affiche aussi les messages courts (GameEvent.Notice). Lit GameState ; se redessine sur GameEvent.HandsChanged.
 * Cachée pendant un dialogue (il prend le bas de l'écran).
 */
/** Icône d'un objet possédable, ou celle d'un objet du monde porté (`icon` de son `take`). */
function icon(h: Held): string {
  return 'item' in h ? items[h.item].icon : defOf(h.prop, h.wood).take!.icon;
}

export class HudScene extends Phaser.Scene {
  private slots: Phaser.GameObjects.Image[] = [];
  private icons: Phaser.GameObjects.Image[] = [];
  /** Longueur restante de ce que tient chaque main (le rouleau de corde), en petits signes en bas de la case. */
  private lengths: Phaser.GameObjects.Image[][] = [[], []];
  /** Coin bas droit de chaque case, où s'aligne la longueur. */
  private corners: [number, number][] = [];
  private notice!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Container;
  /** Jauge d'endurance : le cadre et ses images (fond, remplissage rogné), à droite des deux cases. */
  private energy!: Phaser.GameObjects.Container;
  private energyFill!: Phaser.GameObjects.Image;
  private energyX = 0;

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
      this.corners.push([x + size - 1, y0 + size - 1]);
      this.bar.add([slot, icon, text]);
    });
    this.makeEnergy(x0 + 2 * size + GAP, y0 + size);
    this.notice = this.add
      .text(VIEW.width / 2, y0 - 6, '', { fontFamily: UI.font, fontSize: '11px', color: '#f3e6c8', stroke: UI.ink, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setResolution(ZOOM)
      .setAlpha(0);

    this.game.events.on(GameEvent.HandsChanged, this.redraw, this);
    this.game.events.on(GameEvent.Stamina, this.showEnergy, this);
    this.game.events.on(GameEvent.StaminaDenied, this.shakeEnergy, this);
    this.game.events.on(GameEvent.Notice, this.showNotice, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvent.HandsChanged, this.redraw, this);
      this.game.events.off(GameEvent.Stamina, this.showEnergy, this);
      this.game.events.off(GameEvent.StaminaDenied, this.shakeEnergy, this);
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

  /** La jauge d'endurance, à droite des cases, son bas aligné sur le bas des cases (art/ui/stamina.ts : creux de 6 × 36 en (3, 3)). */
  private makeEnergy(x: number, bottom: number): void {
    const frame = this.textures.get('ui-stamina-frame').getSourceImage();
    const inner = { x: 3, y: 3 };
    const back = this.add.image(inner.x, inner.y, 'ui-stamina-back').setOrigin(0);
    this.energyFill = this.add.image(inner.x, inner.y, 'ui-stamina-fill').setOrigin(0);
    const top = this.add.image(0, 0, 'ui-stamina-frame').setOrigin(0);
    this.energy = this.add.container(x + GAP, bottom - frame.height, [back, this.energyFill, top]);
    this.bar.add(this.energy);
    this.energyX = this.energy.x;
    this.showEnergy(game.stamina / stamina.max);
  }

  /** Le remplissage montre la part `fraction` de la jauge (rogné par le haut), rouge sous le seuil de fatigue. */
  private showEnergy(fraction: number): void {
    const h = 36;
    const shown = fraction <= 0 ? 0 : Math.max(1, Math.round(h * fraction));
    this.energyFill.setTexture(fraction < stamina.tired ? 'ui-stamina-fill-low' : 'ui-stamina-fill').setCrop(0, h - shown, 6, shown).setVisible(shown > 0);
  }

  /** Un effort a été refusé : la jauge tremble un instant. */
  private shakeEnergy(): void {
    const x = this.energyX;
    this.tweens.killTweensOf(this.energy);
    this.tweens.add({ targets: this.energy, x: { from: x - 2, to: x + 2 }, duration: 45, yoyo: true, repeat: 3, onComplete: () => (this.energy.x = x) });
  }

  private redraw(): void {
    const shown = game.both ? ['ui-hands-both', icon(game.both)] : game.hands.map((h, i) => (h ? icon(h) : EMPTY[i]));
    shown.forEach((key, i) => {
      this.slots[i].setTexture(game.both || i === game.active ? 'ui-slot-active' : 'ui-slot');
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

  private showNotice(text: string, ms: number = HUD.noticeMs): void {
    this.tweens.killTweensOf(this.notice);
    this.notice.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.notice, alpha: 0, delay: ms, duration: 300 });
  }
}
