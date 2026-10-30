// Le moteur de places, sans Phaser : commun aux tas (piles.json) et aux chantiers (plans.json). Un ensemble de places a des
// couches et des dépendances (une place du dessus repose sur d'autres : `on`) ; on dit lesquelles sont ouvertes, lesquelles se
// reprennent (la plus haute), laquelle est visée, dans quel ordre on les dessine, et si une place accepte ce qu'on apporte.
// Un tas l'utilise avec des places qui acceptent un genre (`genre`) ; un chantier avec des places qui acceptent une pièce
// précise (`prop` ou `item`, plus tard des mesures : longueur, section, état), avec un message de refus clair.

/** Rectangle dans le repère de l'ensemble de places. */
export interface PlaceRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Ce que le moteur sait d'une place : sa couche, ses porteuses, où elle se dessine, sa collision au sol, son point visé. */
export interface PlaceBase {
  /** Couche : 0 au sol, 1 posée sur des places de la couche 0... */
  layer: number;
  /** Places qui la portent : elle n'existe que quand elles sont toutes prises. */
  on: readonly string[];
  /** Coin bas gauche de ce qui s'y pose. */
  x: number;
  y: number;
  /** Collision au sol (les places du sol d'un tas : une nouvelle touche une pièce déjà posée) ; absente pour une place de chantier. */
  body?: PlaceRect;
  /** Point visé, au sol (sinon le centre de `body`, ou le milieu des porteuses). */
  aim?: readonly [number, number];
}

/** Un ensemble de places : un genre de tas dans son sens, ou une étape de plan. */
export interface PlaceSet {
  places: Record<string, PlaceBase>;
  /** Ordre d'affichage : `layers` (couche par couche, par défaut) ou `depth` (de l'arrière vers l'avant d'après le point visé). */
  order?: 'layers' | 'depth';
}

/** Ce qu'une place accepte : un genre de tas, ou une pièce précise par sa clé. */
export type Accepts = { genre: string } | { prop: string } | { item: string };

/** Ce qu'on apporte : la clé de l'objet (du monde ou possédable) et, s'il s'entrepose, son genre de tas. */
export interface Offer {
  genre?: string;
  prop?: string;
  item?: string;
}

/** La place accepte-t-elle ce qu'on apporte ? */
export function accepts(rule: Accepts, offer: Offer | undefined): boolean {
  if (!offer) return false;
  if ('genre' in rule) return offer.genre === rule.genre;
  if ('prop' in rule) return offer.prop === rule.prop;
  return offer.item === rule.item;
}

/** Pourquoi la place refuse ce qu'on apporte, dit par `refuse` (« Il faut une pierre plate. »), ou undefined si elle l'accepte. */
export function refusal(rule: Accepts & { refuse: string }, offer: Offer | undefined): string | undefined {
  return accepts(rule, offer) ? undefined : rule.refuse;
}

/**
 * Une place peut recevoir une pièce : elle est libre et toutes celles qui la portent sont prises ; au sol, quand elle a une
 * collision, elle touche (à 1 px près) une pièce déjà posée au sol, pour que le tas grandisse sans trou.
 */
export function placeOpen(set: PlaceSet, taken: readonly string[], id: string): boolean {
  const q = set.places[id];
  if (taken.includes(id) || !q.on.every((o) => taken.includes(o))) return false;
  if (q.layer > 0 || !taken.length || !q.body) return true;
  const b = q.body;
  return taken.some((o) => {
    const c = set.places[o].body;
    return !!c && b.x <= c.x + c.w + 1 && c.x <= b.x + b.w + 1 && b.y <= c.y + c.h + 1 && c.y <= b.y + b.h + 1;
  });
}

/** Les places qui peuvent recevoir une pièce. */
export function openPlaces(set: PlaceSet, taken: readonly string[]): string[] {
  return Object.keys(set.places).filter((id) => placeOpen(set, taken, id));
}

/** Les pièces qu'on peut enlever : rien ne repose dessus. */
export function freePieces(set: PlaceSet, taken: readonly string[]): string[] {
  return taken.filter((id) => !taken.some((o) => set.places[o].on.includes(id)));
}

/** Les pièces qu'on reprend avec E : les plus hautes de celles qu'on peut enlever. */
export function topPieces(set: PlaceSet, taken: readonly string[]): string[] {
  const free = freePieces(set, taken);
  const top = Math.max(...free.map((id) => set.places[id].layer));
  return free.filter((id) => set.places[id].layer === top);
}

/** Point visé d'une place, au sol, dans le repère de l'ensemble (voir `aim` dans types.ts). */
export function placeAim(set: PlaceSet, id: string): [number, number] {
  const p = set.places[id];
  if (p.aim) return [p.aim[0], p.aim[1]];
  if (p.body) return [p.body.x + p.body.w / 2, p.body.y + p.body.h / 2];
  const under = p.on.map((o) => placeAim(set, o));
  return [under.reduce((a, q) => a + q[0], 0) / under.length, under.reduce((a, q) => a + q[1], 0) / under.length];
}

/**
 * La place ouverte dont le point visé est le plus près de `probe` (le point que regarde Xéros), à moins de `limit`, parmi celles
 * que `usable` laisse passer (une place au sol doit être libre). `origin` : le point de l'ensemble dans le repère de la carte.
 */
export function nearestOpenPlace(
  set: PlaceSet,
  taken: readonly string[],
  origin: readonly [number, number],
  probe: { x: number; y: number },
  limit: number,
  usable: (id: string) => boolean = () => true,
): { place: string; d: number } | undefined {
  let best: { place: string; d: number } | undefined;
  let bestD = limit;
  for (const place of openPlaces(set, taken)) {
    const [ax, ay] = placeAim(set, place);
    const d = Math.hypot(origin[0] + ax - probe.x, origin[1] + ay - probe.y);
    if (d >= bestD || !usable(place)) continue;
    best = { place, d };
    bestD = d;
  }
  return best;
}

/**
 * Ordre d'affichage des pièces prises (`order` de l'ensemble). `layers` : couche par couche, du bas vers le haut ; dans une
 * couche, de l'arrière (bas de l'image le plus haut) vers l'avant. `depth` : de l'arrière vers l'avant d'après le point
 * visé au sol, à égalité la couche du bas d'abord : la pièce de devant cache le bas de celle qui repose derrière elle.
 */
export function drawOrder(set: PlaceSet, taken: readonly string[]): string[] {
  const keys = Object.keys(set.places);
  const ground = (id: string) => placeAim(set, id)[1];
  return [...taken].sort((a, b) => {
    const pa = set.places[a];
    const pb = set.places[b];
    const tie = keys.indexOf(a) - keys.indexOf(b);
    if (set.order === 'depth') return ground(a) - ground(b) || pa.layer - pb.layer || tie;
    return pa.layer - pb.layer || pa.y - pb.y || tie;
  });
}

/**
 * Tous les états possibles d'un ensemble de places, en posant et en reprenant des pièces depuis le vide (un sol troué, par
 * exemple, ne s'obtient qu'en reprenant), du plus petit au plus grand.
 */
export function placeStates(set: PlaceSet, limit = 200): string[][] {
  const keys = Object.keys(set.places);
  const norm = (t: readonly string[]) => keys.filter((k) => t.includes(k));
  const seen = new Set<string>(['']);
  const out: string[][] = [];
  let frontier: string[][] = [[]];
  while (frontier.length && out.length < limit) {
    const next: string[][] = [];
    for (const taken of frontier) {
      const moves = [...openPlaces(set, taken).map((id) => [...taken, id]), ...freePieces(set, taken).map((id) => taken.filter((t) => t !== id))];
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
