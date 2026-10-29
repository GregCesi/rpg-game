import { ROOF } from '../config';
import type { Player } from '../entities/Player';
import type { GameMap, PlacedProp } from '../world/GameMap';

/** Hauteur de Xéros à l'écran au-dessus de ses pieds (px, 1,60 m et le haut du bol de cheveux) : sa tête. */
const HEAD = 34;

/**
 * Les toits (pièces `roof` de props.json : chevrons, chaume). Un toit se dessine par-dessus Xéros quand il est dessous
 * (l'ordre d'affichage suffit : le bas de son image est au sol, au sud de l'avant-toit). Quand Xéros est dessous ou
 * caché derrière, le toit devient en partie transparent (ROOF.alpha), avec toutes les pièces de toit qu'il touche ;
 * dès qu'il en sort, il redevient opaque. Le fondu prend ROOF.fadeMs.
 */
export class Roofs {
  constructor(private readonly map: GameMap) {}

  /** À appeler à chaque image, dans tous les modes (le toit suit Xéros même pendant un geste ou un dialogue). */
  update(player: Player, delta: number): void {
    const roofs = this.map.props.filter((p) => p.def.roof);
    if (!roofs.length) return;
    const { x, y } = player.actor;
    // les pièces de toit qui cachent Xéros : ses pieds dans la largeur de l'image, au nord de son bas (le sol au sud de
    // l'avant-toit), et assez bas pour que le toit cache au moins sa tête
    const over = roofs.filter((p) => x >= p.x && x <= p.x + p.image.width && y < p.y && y > p.top - HEAD / 2);
    // et toutes celles qu'elles touchent : le chaume entraîne ses chevrons
    const faded = new Set(over);
    for (const p of roofs) if (over.some((q) => touches(p, q))) faded.add(p);
    const step = ((1 - ROOF.alpha) * delta) / ROOF.fadeMs;
    for (const p of roofs) {
      const target = faded.has(p) ? ROOF.alpha : 1;
      const a = p.image.alpha;
      p.image.setAlpha(a < target ? Math.min(target, a + step) : Math.max(target, a - step));
    }
  }
}

/** Les images des deux pièces se recouvrent. */
function touches(a: PlacedProp, b: PlacedProp): boolean {
  return a.x < b.x + b.image.width && b.x < a.x + a.image.width && a.top < b.y && b.top < a.y;
}
