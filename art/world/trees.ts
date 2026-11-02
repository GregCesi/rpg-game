// Les arbres qui s'abattent : tout ce qui se tire, pour chacun, de ses données et de ses dessins (docs/CONCEPTION.md, « Abattre
// un arbre »). Les arbres sont les objets de props.json qui tombent (`harvest.fall`) ; chacun a sa géométrie (`tree` de
// props.json) et son dessin, enregistré par sa clé d'image (art/world/tree-registry.ts). On en tire, sans rien de propre à une
// sorte ni à un arbre :
// - ses étapes d'abattage, à droite et à gauche (`<image>-stage-<n>`, `<image>-left-stage-<n>`, art/world/felling.ts) ;
// - ses deux chutes (`fall.image`, `fall.left.image`, art/world/tree-fall.ts) ;
// - son arbre couché d'un seul tenant (`<image couchée>`, `-left`) et ses étapes d'ébranchage (art/world/work-stages.ts) ;
// - ses décalages pour le jeu (`treeLayouts`, écrits par npm run art dans src/generated/trees.json : src/content/treeLayout.ts).

import propsJson from '../../src/content/props.json';
import { TreeSchema, type TreeDef } from '../../src/content/types';
import type { StandingLayout, TreeLayouts } from '../../src/content/treeLayout';
import type { ArtSource, ImageSource, SpriteSheetSource } from '../lib/types';
import type { Canvas } from '../lib/canvas';
import { world } from '../palette';
import { fellingStage, standingOf, type Standing } from './felling';
import { fallLayout, fallSheets } from './tree-fall';
import { fellingGroups, limbingGroups, type Felled } from './work-stages';
import { treeArt, type LyingArt, type TreeArt } from './tree-registry';
// les dessins des arbres, une sorte par fichier : chacun enregistre ses arbres (`registerTree`)
import './big-felled';
import './big-pollard';
import './normal-felled';

interface RawHarvest {
  stages?: number[];
  fall?: { image: string; left: { image: string } };
  becomes?: string;
  spawns?: { type: string }[];
  work?: { limbs?: { count: number } };
  wood?: { size: string; length: number };
}
type RawProp = { image: string; tree?: unknown; harvest?: RawHarvest };

/** Un arbre qui s'abat, tout ce qu'on en tire. */
export interface Tree {
  /** Clé de l'arbre debout dans props.json, et son image. */
  key: string;
  image: string;
  def: TreeDef;
  art: TreeArt;
  standing: Standing;
  /** Nombre d'étapes de l'abattage (`stages` de son harvest). */
  stages: number;
  fall: { right: string; left: string };
  /** Sa souche (`becomes`) et son arbre couché (ce qui naît de sa chute). */
  stump: string;
  felled: { key: string; image: string; limbs: number; shares: number[]; wood: { size: string; length: number } };
  lying: LyingArt;
}

const props = propsJson as unknown as Record<string, RawProp>;

/** Les arbres de props.json, dans l'ordre du fichier. */
function treesOf(): Tree[] {
  const out: Tree[] = [];
  for (const [key, p] of Object.entries(props)) {
    const h = p.harvest;
    if (!h?.fall) continue;
    const where = `arbres : props.json '${key}'`;
    if (!p.tree) throw new Error(`${where} tombe (harvest.fall) : il lui faut sa géométrie ('tree')`);
    const r = TreeSchema.safeParse(p.tree);
    if (!r.success) throw new Error(`${where} : 'tree' ne respecte pas son format : ${r.error.message}`);
    const def = r.data;
    if (!h.becomes) throw new Error(`${where} : sa souche ('becomes') manque`);
    if (h.spawns?.length !== 1) throw new Error(`${where} : un arbre couché, et un seul, naît de sa chute ('spawns')`);
    const fk = h.spawns[0].type;
    const f = props[fk];
    const fh = f?.harvest;
    if (!f || !fh?.work?.limbs || !fh.stages || !fh.wood) throw new Error(`${where} : son arbre couché '${fk}' doit s'ébrancher (work.limbs, stages) en une pièce de bois (wood)`);
    const art = treeArt(def.art ?? p.image);
    const standing = standingOf(key, def, art.body);
    out.push({
      key,
      image: p.image,
      def,
      art,
      standing,
      stages: h.stages?.length ?? 0,
      fall: { right: h.fall.image, left: h.fall.left.image },
      stump: h.becomes,
      felled: { key: fk, image: f.image, limbs: fh.work.limbs.count, shares: fh.stages, wood: fh.wood },
      lying: art.lying(fh.wood.length, fk),
    });
  }
  return out;
}

export const TREES: Tree[] = treesOf();

/** L'arbre couché de `t`, pour l'ébranchage. */
const felledOf = (t: Tree): Felled => ({ key: t.felled.image, lying: t.lying.limbing, limbs: t.felled.limbs, shares: t.felled.shares });

/** Les étapes, par objet et par vue, dans l'ordre : pour la planche de contrôle (art/world/work-stages-preview.ts). */
export const STAGE_GROUPS: { base: string; stages: ImageSource[] }[] = [
  ...TREES.flatMap((t) => fellingGroups(t.standing, t.stages)),
  ...TREES.flatMap((t) => limbingGroups(felledOf(t))),
];

/** Les chutes de chaque arbre. */
export const FALLS: SpriteSheetSource[] = TREES.flatMap((t) => fallSheets(t.standing, t.def, t.art, t.lying, t.fall));

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

/** Les arbres couchés d'un seul tenant (`<clé>`, `<clé>-left`). */
const LYING: ImageSource[] = TREES.flatMap((t) => [img(t.felled.image, t.lying.right), img(`${t.felled.image}-left`, t.lying.left)]);

/** Les décalages de chaque arbre, pour props.json (src/content/treeLayout.ts). */
export function treeLayouts(): TreeLayouts {
  const standing: Record<string, StandingLayout> = {};
  const felled: TreeLayouts['felled'] = {};
  for (const t of TREES) {
    const H = t.standing.h;
    const stump = t.art.stump();
    const at: [number, number] = [t.def.foot[0] - t.art.stumpFoot[0], t.def.foot[1] - t.art.stumpFoot[1] + stump.h - H];
    const box = t.lying.box;
    standing[t.key] = {
      fall: fallLayout(t.def, t.lying),
      at,
      spawns: [{ type: t.felled.key, x: box.x - t.lying.off, y: box.y + box.h - t.lying.h }],
    };
    felled[t.felled.key] = { at: t.lying.woodAt };
  }
  return { standing, felled };
}

/** L'image debout d'un arbre qui reprend le dessin d'un autre (`tree.art`) : l'étape 0 de son abattage, sous sa clé. */
const BORROWED: ImageSource[] = TREES.filter((t) => t.def.art && t.def.art !== t.image).map((t) => img(t.image, fellingStage(t.standing, 0)));

const sources: ArtSource[] = [...STAGE_GROUPS.flatMap((g) => g.stages), ...FALLS, ...LYING, ...BORROWED];
export default sources;
