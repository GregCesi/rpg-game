import Phaser from 'phaser';
import { PORTRAIT_MODES, UI, VIEW, ZOOM } from '../config';
import { characters, dialogues } from '../content';
import type { DialogueLine } from '../content/types';

const K = Phaser.Input.Keyboard.KeyCodes;
const BORDER = 8;

/**
 * Boîte de dialogue lancée par-dessus le monde. Portrait du personnage au-dessus du cadre, à gauche,
 * nom à côté, texte qui s'écrit lettre par lettre. E / Espace / Entrée / clic : finir la ligne, puis passer à la suivante.
 * Émet 'dialogue-end' sur le bus du jeu quand il se ferme.
 */
export class DialogueScene extends Phaser.Scene {
  /** Mode de portrait courant, gardé d'un dialogue à l'autre (touche P). */
  private static portraitMode = 0;

  private lines: DialogueLine[] = [];
  private index = 0;
  private full = '';
  private shown = 0;
  private typing?: Phaser.Time.TimerEvent;

  private box!: Phaser.GameObjects.NineSlice;
  private text!: Phaser.GameObjects.Text;
  private next!: Phaser.GameObjects.Image;
  private portraitPanel!: Phaser.GameObjects.NineSlice;
  private portrait!: Phaser.GameObjects.Sprite;
  private namePlate!: Phaser.GameObjects.NineSlice;
  private nameText!: Phaser.GameObjects.Text;
  private sizeHint!: Phaser.GameObjects.Text;

  constructor() {
    super('dialogue');
  }

  create(data: { id: string }): void {
    const def = dialogues[data.id];
    if (!def) throw new Error(`Dialogue inconnu : ${data.id}`);
    this.lines = def.lines;
    this.index = 0;

    this.cameras.main.setZoom(ZOOM).centerOn(VIEW.width / 2, VIEW.height / 2);

    const bw = VIEW.width - 24;
    const bh = 78;
    const bx = 12;
    const by = VIEW.height - 10 - bh;
    this.box = this.add.nineslice(bx, by, 'ui-box', undefined, bw, bh, BORDER, BORDER, BORDER, BORDER).setOrigin(0);

    this.text = this.label(bx + 16, by + 17, 12, UI.ink).setWordWrapWidth(bw - 40).setLineSpacing(3);
    this.next = this.add.image(bx + bw - 18, by + bh - 14, 'ui-next').setVisible(false);
    this.tweens.add({ targets: this.next, y: '+=2', duration: 400, yoyo: true, repeat: -1 });

    this.portraitPanel = this.add.nineslice(0, 0, 'ui-box', undefined, 32, 32, BORDER, BORDER, BORDER, BORDER).setOrigin(0, 1);
    this.portrait = this.add.sprite(0, 0, '__DEFAULT').setOrigin(0.5, 1);
    this.namePlate = this.add.nineslice(0, 0, 'ui-box', undefined, 32, 22, BORDER, BORDER, BORDER, BORDER).setOrigin(0, 1);
    this.nameText = this.label(0, 0, 11, UI.ink).setOrigin(0, 0.5);
    this.sizeHint = this.label(bx + bw - 14, by + 9, 8, UI.inkSoft).setOrigin(1, 0);

    const kb = this.input.keyboard!;
    for (const code of [K.E, K.SPACE, K.ENTER]) kb.addKey(code).on('down', () => this.advance());
    this.input.on('pointerdown', () => this.advance());
    kb.addKey(K.P).on('down', () => {
      DialogueScene.portraitMode = (DialogueScene.portraitMode + 1) % PORTRAIT_MODES.length;
      this.showSpeaker(this.lines[this.index]);
    });

    this.showLine();
    // entrée en douceur
    const all = [this.box, this.text, this.portraitPanel, this.portrait, this.namePlate, this.nameText, this.sizeHint];
    this.tweens.add({ targets: all, alpha: { from: 0, to: 1 }, y: { from: (o: { y: number }) => o.y + 6, to: (o: { y: number }) => o.y }, duration: 140, ease: 'Quad.Out' });
  }

  private label(x: number, y: number, size: number, color: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, '', { fontFamily: UI.font, fontSize: `${size}px`, color }).setResolution(ZOOM);
  }

  private showLine(): void {
    const line = this.lines[this.index];
    this.showSpeaker(line);
    // Le retour à la ligne est calculé sur le texte complet : les mots ne sautent pas pendant l'écriture.
    this.full = this.text.getWrappedText(line.text).join('\n');
    this.shown = 0;
    this.text.setText('');
    this.next.setVisible(false);
    this.typing?.remove();
    this.typing = this.time.addEvent({
      delay: 1000 / UI.typeSpeed,
      loop: true,
      callback: () => {
        this.shown++;
        this.text.setText(this.full.slice(0, this.shown));
        if (this.shown >= this.full.length) this.finishLine();
      },
    });
  }

  private finishLine(): void {
    this.typing?.remove();
    this.typing = undefined;
    this.shown = this.full.length;
    this.text.setText(this.full);
    this.next.setVisible(true);
  }

  private advance(): void {
    if (this.typing) return this.finishLine();
    this.index++;
    if (this.index < this.lines.length) return this.showLine();
    this.game.events.emit('dialogue-end');
    this.scene.stop();
  }

  /** Portrait (au-dessus du cadre, à gauche) et plaque du nom. */
  private showSpeaker(line: DialogueLine): void {
    const who = characters[line.speaker];
    if (!who) throw new Error(`Personnage inconnu dans un dialogue : ${line.speaker}`);
    const { size, scale } = PORTRAIT_MODES[DialogueScene.portraitMode];
    const key = `portrait-${who.portrait}-${size}`;
    const anim = `${key}-${line.expression}`;
    if (!this.anims.exists(anim)) throw new Error(`Expression '${line.expression}' absente du portrait ${key}`);

    const pad = 6;
    const inner = size * scale;
    const panelW = inner + pad * 2;
    const panelH = inner + pad;
    const px = this.box.x + 10;
    const bottom = this.box.y + 10; // le portrait mord un peu sur le haut du cadre, devant lui
    this.portraitPanel.setPosition(px, bottom).setSize(panelW, panelH);
    this.portrait.play(anim).setScale(scale).setPosition(px + panelW / 2, bottom - 3);

    this.nameText.setText(who.name);
    const plateW = Math.ceil(this.nameText.width) + 20;
    this.namePlate.setPosition(px + panelW + 4, this.box.y + 6).setSize(plateW, 22);
    this.nameText.setPosition(this.namePlate.x + 10, this.namePlate.y - 11);

    this.sizeHint.setText(`P : portrait ${size} px${scale > 1 ? ` ×${scale}` : ''}`);
  }
}
