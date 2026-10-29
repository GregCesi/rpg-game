// La forme d'un tas, sans Phaser : quelles places existent, lesquelles se prennent ou se libèrent, où on les vise,
// dans quel ordre on les dessine. Utilisé par le jeu (GameMap, systems/hands.ts) et par l'aperçu (npm run art:preview).
import type { PileDef } from '../content/types';

/** La forme du tas dans son sens : celle du genre, ou, tourné, celle de `turned` (ses places, son départ, son ordre). */
export function shapeOf(def: PileDef, turned: boolean): PileDef {
  return turned && def.turned ? { ...def, ...def.turned, turned: undefined } : def;
}

/**
 * Une place peut recevoir une pièce : elle est libre et toutes celles qui la portent sont prises ; au sol, elle touche
 * (à 1 px près) une pièce déjà posée au sol, pour que le tas grandisse sans trou.
 */
export function placeOpen(def: PileDef, taken: readonly string[], id: string): boolean {
  const q = def.places[id];
  if (taken.includes(id) || !q.on.every((o) => taken.includes(o))) return false;
  if (q.layer > 0 || !taken.length) return true;
  const b = q.body!;
  return taken.some((o) => {
    const c = def.places[o].body;
    return !!c && b.x <= c.x + c.w + 1 && c.x <= b.x + b.w + 1 && b.y <= c.y + c.h + 1 && c.y <= b.y + b.h + 1;
  });
}

/** Les places qui peuvent recevoir une pièce. */
export function openPlaces(def: PileDef, taken: readonly string[]): string[] {
  return Object.keys(def.places).filter((id) => placeOpen(def, taken, id));
}

/** Les pièces qu'on peut enlever : rien ne repose dessus. */
export function freePieces(def: PileDef, taken: readonly string[]): string[] {
  return taken.filter((id) => !taken.some((o) => def.places[o].on.includes(id)));
}

/** Les pièces qu'on reprend avec E : les plus hautes de celles qu'on peut enlever. */
export function topPieces(def: PileDef, taken: readonly string[]): string[] {
  const free = freePieces(def, taken);
  const top = Math.max(...free.map((id) => def.places[id].layer));
  return free.filter((id) => def.places[id].layer === top);
}

/** Point visé d'une place, au sol, dans le repère du tas (voir `aim` dans types.ts). */
export function placeAim(def: PileDef, id: string): [number, number] {
  const p = def.places[id];
  if (p.aim) return p.aim;
  if (p.body) return [p.body.x + p.body.w / 2, p.body.y + p.body.h / 2];
  const under = p.on.map((o) => placeAim(def, o));
  return [under.reduce((a, q) => a + q[0], 0) / under.length, under.reduce((a, q) => a + q[1], 0) / under.length];
}

/**
 * Ordre d'affichage des pièces prises (`order` du genre). `layers` : couche par couche, du bas vers le haut ; dans une
 * couche, de l'arrière (bas de l'image le plus haut) vers l'avant. `depth` : de l'arrière vers l'avant d'après le point
 * visé au sol, à égalité la couche du bas d'abord : la pièce de devant cache le bas de celle qui repose derrière elle.
 */
export function drawOrder(def: PileDef, taken: readonly string[]): string[] {
  const keys = Object.keys(def.places);
  const ground = (id: string) => placeAim(def, id)[1];
  return [...taken].sort((a, b) => {
    const pa = def.places[a];
    const pb = def.places[b];
    const tie = keys.indexOf(a) - keys.indexOf(b);
    if (def.order === 'depth') return ground(a) - ground(b) || pa.layer - pb.layer || tie;
    return pa.layer - pb.layer || pa.y - pb.y || tie;
  });
}

/** Le tas bloque le passage : il a au moins `blockFrom` pièces. */
export function pileBlocks(def: PileDef, taken: readonly string[]): boolean {
  return taken.length >= def.blockFrom;
}

/**
 * Tous les états possibles d'un tas, en posant et en reprenant des pièces depuis le tas vide (un sol troué, par
 * exemple, ne s'obtient qu'en reprenant), du plus petit au plus grand.
 */
export function pileStates(def: PileDef, limit = 200): string[][] {
  const keys = Object.keys(def.places);
  const norm = (t: readonly string[]) => keys.filter((k) => t.includes(k));
  const seen = new Set<string>(['']);
  const out: string[][] = [];
  let frontier: string[][] = [[]];
  while (frontier.length && out.length < limit) {
    const next: string[][] = [];
    for (const taken of frontier) {
      const moves = [...openPlaces(def, taken).map((id) => [...taken, id]), ...freePieces(def, taken).map((id) => taken.filter((t) => t !== id))];
      for (const m of moves) {
        const t = norm(m);
        const key = t.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(t);
        next.push(t);
      }
    }
    frontier = next;
  }
  return out.sort((a, b) => a.length - b.length).slice(0, limit);
}
