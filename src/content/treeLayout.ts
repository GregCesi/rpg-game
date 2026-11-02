// Les décalages d'un arbre (docs/CONCEPTION.md, « Abattre un arbre ») : où se pose sa chute, de chaque côté, où se posent sa
// souche et son arbre couché, où se pose la pièce de bois quand on l'a ébranché. Ils découlent de sa géométrie (`tree` de
// props.json) et de ses dessins : `npm run art` les calcule (art/world/trees.ts) et les écrit dans src/generated/trees.json ;
// props.json ne les écrit jamais. Le jeu et build-art lisent props.json complété par `withTreeLayout`.

/** Les décalages calculés d'un arbre debout (repère : coin bas gauche de son image ; voir `fall`, `at`, `spawns` de HarvestSchema). */
export interface StandingLayout {
  fall: { x: number; foot: number; left: { x: number } };
  /** Coin bas gauche de la souche (`becomes`). */
  at: [number, number];
  /** Coin bas gauche de l'arbre couché (le premier de `spawns`), chute vers la droite. */
  spawns: { type: string; x: number; y: number }[];
}

/** Les décalages calculés de tous les arbres : les arbres debout, et la place de la pièce de bois dans chaque arbre couché. */
export interface TreeLayouts {
  standing: Record<string, StandingLayout>;
  felled: Record<string, { at: [number, number] }>;
}

type Raw = Record<string, Record<string, unknown>>;
type RawHarvest = { fall?: Record<string, unknown>; at?: unknown; spawns?: Record<string, unknown>[] };

/**
 * props.json complété des décalages calculés de ses arbres. Refuse un arbre sans décalages (npm run art n'est pas passé) et un
 * décalage écrit à la main dans props.json (il serait écrasé : on le retire).
 */
export function withTreeLayout(props: Raw, layouts: TreeLayouts): Raw {
  const out: Raw = { ...props };
  const wrong = (key: string, what: string) => {
    throw new Error(`props.json '${key}' : ${what}`);
  };
  for (const [key, p] of Object.entries(props)) {
    const h = p.harvest as RawHarvest | undefined;
    if (h?.fall && !p.tree) wrong(key, "il tombe (harvest.fall) : il lui faut sa géométrie ('tree', TreeSchema) et son dessin (registerTree, art/world/tree-registry.ts)");
    if (p.tree && !h?.fall) wrong(key, "'tree' : la géométrie d'un arbre qui tombe, il lui faut harvest.fall");
    if (p.tree) {
      const l = layouts.standing[key];
      if (!l) wrong(key, 'arbre sans décalages calculés (src/generated/trees.json) : lancer npm run art');
      const f = h?.fall;
      if (!f) wrong(key, "un arbre ('tree') tombe : il lui faut harvest.fall (image, anim, left.image)");
      const left = f!.left as Record<string, unknown> | undefined;
      if (f!.x !== undefined || f!.foot !== undefined || left?.x !== undefined || h!.at !== undefined || h!.spawns?.some((s) => s.x !== undefined || s.y !== undefined)) {
        wrong(key, "fall.x, fall.foot, fall.left.x, at et la place de ce qui naît se calculent (npm run art) : les retirer de props.json");
      }
      const spawns = (h!.spawns ?? []).map((s) => {
        const at = l.spawns.find((x) => x.type === s.type);
        if (!at) wrong(key, `'${s.type}' naît de sa chute, mais n'est pas son arbre couché`);
        return { ...s, x: at!.x, y: at!.y };
      });
      out[key] = { ...p, harvest: { ...h, fall: { ...f, x: l.fall.x, foot: l.fall.foot, left: { ...left, x: l.fall.left.x } }, at: l.at, spawns } };
    }
  }
  for (const [key, l] of Object.entries(layouts.felled)) {
    const p = out[key];
    const h = p?.harvest as RawHarvest | undefined;
    if (!h) continue;
    if (props[key].harvest && (props[key].harvest as RawHarvest).at !== undefined) wrong(key, "l'arbre couché : 'at' (la place de sa pièce de bois) se calcule (npm run art) : le retirer de props.json");
    out[key] = { ...p, harvest: { ...h, at: l.at } };
  }
  return out;
}
