import type Phaser from 'phaser';
import { DEPTH, PILE_COUNT } from '../config';
import type { Player } from '../entities/Player';
import type { GameMap, PlacedPile } from '../world/GameMap';

/**
 * Le nombre de pièces d'un tas (genres qui ont `count` dans piles.json : les branches), en tout petits chiffres
 * (`ui-digit-<chiffre>`) en bas à droite du tas, seulement quand les pieds de Xéros en sont tout près (`PILE_COUNT.near`
 * px de l'emprise au sol de ses pièces). Un seul tas à la fois : le plus proche.
 */
export class PileCount {
  private readonly digits: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: GameMap,
  ) {}

  /** À appeler à chaque image ; `active` = false pendant un geste, un dialogue ou un changement de carte. */
  update(player: Player, active: boolean): void {
    const near = active ? this.nearest(player.actor.x, player.actor.y) : undefined;
    const text = near ? String(near.pile.places.length) : '';
    while (this.digits.length < text.length) this.digits.push(this.scene.add.image(0, 0, 'ui-digit-0').setOrigin(0, 1).setDepth(DEPTH.prompt - 2));
    this.digits.forEach((d, i) => d.setVisible(i < text.length));
    if (!near) return;
    // bas à droite du tas : le bord droit de ses images, sous le bas de sa pièce la plus en avant
    const { pile, def } = near;
    const right = pile.x + Math.max(...pile.places.map((id) => def.places[id].x + this.map.textureSize(def.places[id].image).w));
    const bottom = pile.y + Math.max(...pile.places.map((id) => def.places[id].y)) + 2;
    let x = right;
    for (let i = text.length - 1; i >= 0; i--) {
      const d = this.digits[i].setTexture(`ui-digit-${text[i]}`);
      // contours voisins confondus : les chiffres se touchent par leur contour
      x -= d.width - (i < text.length - 1 ? 1 : 0);
      d.setPosition(x, bottom);
    }
  }

  /** Le tas compté le plus proche des pieds (x, y), s'il est tout près. */
  private nearest(x: number, y: number): PlacedPile | undefined {
    let best: PlacedPile | undefined;
    let bestD: number = PILE_COUNT.near;
    for (const p of this.map.piles) {
      if (!p.def.count || !p.pile.places.length) continue;
      const bodies = p.pile.places.flatMap((id) => (p.def.places[id].body ? [p.def.places[id].body!] : []));
      const left = p.pile.x + Math.min(...bodies.map((b) => b.x));
      const right = p.pile.x + Math.max(...bodies.map((b) => b.x + b.w));
      const top = p.pile.y + Math.min(...bodies.map((b) => b.y));
      const bottom = p.pile.y + Math.max(...bodies.map((b) => b.y + b.h));
      // distance des pieds au rectangle (0 dedans)
      const d = Math.hypot(Math.max(left - x, 0, x - right), Math.max(top - y, 0, y - bottom));
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }
}
