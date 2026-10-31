import { ROOF } from '../config';
import type { Player } from '../entities/Player';
import { CM_PER_PX } from '../content/gabarit';
import { overHead, withAbove } from '../world/build';
import type { GameMap, PlacedProp } from '../world/GameMap';

/** Hauteur de Xéros à l'écran au-dessus de ses pieds (px, 1,60 m et le haut du bol de cheveux) : sa tête. */
const HEAD = 34;

/**
 * Les toits (pièces `roof` de props.json : chevrons, toit de planches). Un toit se dessine par-dessus Xéros quand il est dessous
 * (l'ordre d'affichage suffit : le bas de son image est au sol, au sud de l'avant-toit). Quand Xéros est dessous ou
 * caché derrière, le toit devient en partie transparent (ROOF.alpha), avec toutes les pièces de toit qu'il touche ;
 * dès qu'il en sort, il redevient opaque. Son ombre portée (`shadow`, posée par GameMap) suit son opacité. Le fondu prend ROOF.fadeMs.
 */
export class Roofs {
  constructor(private readonly map: GameMap) {}

  /** À appeler à chaque image, dans tous les modes (le toit suit Xéros même pendant un geste ou un dialogue). */
  update(player: Player, delta: number, builds = true): void {
    this.builds(player, delta, builds);
    const roofs = this.map.props.filter((p) => p.def.roof);
    if (!roofs.length) return;
    const { x, y } = player.actor;
    // les pièces de toit qui cachent Xéros : ses pieds dans la largeur de l'image, au nord de son bas (le sol au sud de
    // l'avant-toit), et assez bas pour que le toit cache au moins sa tête
    const over = roofs.filter((p) => x >= p.x && x <= p.x + p.image.width && y < p.y && y > p.top - HEAD / 2);
    // et toutes celles qu'elles touchent : le toit entraîne ses chevrons
    const faded = new Set(over);
    for (const p of roofs) if (over.some((q) => touches(p, q))) faded.add(p);
    const step = ((1 - ROOF.alpha) * delta) / ROOF.fadeMs;
    for (const p of roofs) {
      const target = faded.has(p) ? ROOF.alpha : 1;
      const a = p.image.alpha;
      p.image.setAlpha(a < target ? Math.min(target, a + step) : Math.max(target, a - step));
      // son ombre portée s'efface avec lui
      p.shadow?.setAlpha(p.image.alpha);
    }
  }

  /**
   * Les pièces posées en mode construction : celles dont la base est au-dessus de la tête de Xéros (BUILD.head) et dont l'emprise au
   * sol couvre ses pieds (à une demi-case près : il est caché un peu avant d'être dessous) s'effacent, avec tout ce qui repose dessus ;
   * les autres redeviennent opaques. Même fondu que les toits. `on` faux (le mode construction) : rien ne s'efface.
   */
  private builds(player: Player, delta: number, on: boolean): void {
    if (!this.map.builds.length) return;
    const pieces = this.map.builds.map((b) => b.piece);
    const fx = player.actor.x * CM_PER_PX;
    const fy = player.actor.y * CM_PER_PX;
    const faded = new Set<number>();
    if (on) for (const p of pieces) if (overHead(p, fx, fy, 80)) for (const q of withAbove(pieces, p.id)) faded.add(q.id);
    const step = ((1 - ROOF.alpha) * delta) / ROOF.fadeMs;
    for (const b of this.map.builds) {
      const target = faded.has(b.piece.id) ? ROOF.alpha : 1;
      const a = b.image.alpha;
      if (a !== target) b.image.setAlpha(a < target ? Math.min(target, a + step) : Math.max(target, a - step));
    }
  }
}

/** Les images des deux pièces se recouvrent. */
function touches(a: PlacedProp, b: PlacedProp): boolean {
  return a.x < b.x + b.image.width && b.x < a.x + a.image.width && a.top < b.y && b.top < a.y;
}
