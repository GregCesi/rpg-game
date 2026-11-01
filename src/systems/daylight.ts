import Phaser from 'phaser';
import { DEPTH } from '../config';
import { game } from '../state';
import { lightAt } from '../world/daylight';

/**
 * La lumière qui suit l'heure, dans la scène (docs/CONCEPTION.md, « Le temps » ; world/daylight.ts) : un voile teinté sur tout ce qu'on
 * voit, à la profondeur des pénombres (celle du sous-bois et celle d'un intérieur s'y ajoutent) ; les lueurs des feux restent
 * par-dessus. Les rais de soleil (l'image `sunpatch` : posés dans Tiled ou par les fenêtres et les portes d'un intérieur) prennent la
 * force du soleil : éteints la nuit.
 */
export class Daylight {
  private readonly veil: Phaser.GameObjects.Rectangle;

  constructor(
    private readonly scene: Phaser.Scene,
    area: { x: number; y: number; w: number; h: number },
  ) {
    this.veil = scene.add.rectangle(area.x, area.y, area.w, area.h, 0x000000, 0).setOrigin(0).setDepth(DEPTH.ambient - 0.5);
  }

  /** À chaque image : la lumière de l'heure de l'horloge. */
  update(): void {
    const l = lightAt(game.clock.minute);
    this.veil.setFillStyle(l.color, l.alpha).setVisible(l.alpha > 0.001);
    for (const o of this.scene.children.list) {
      if (!(o instanceof Phaser.GameObjects.Image) || o.texture.key !== 'sunpatch') continue;
      // l'intensité dessinée du rai, retenue la première fois
      const base = (o.getData('sunAlpha') as number | undefined) ?? (o.setData('sunAlpha', o.alpha), o.alpha);
      o.setAlpha(base * l.sun);
    }
  }
}
