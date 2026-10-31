// L'implantation de l'abri à bois : la dalle de calcaire qui devient un dé, la planchette où la mère a gravé le plan.
// Fiches : docs/objets/slab.md, plan-tablet.md. Le piquet : art/items/stake.ts ; la hachette qui le taille :
// art/items/hatchet.ts.
//
// Échelle du jeu (5 cm par pixel, gabarit de docs/STYLE.md section 8), lumière en haut à gauche, contour d'un pixel :
// teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas et à droite.

import { Canvas, EMPTY, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { sheet } from '../items/carried';

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

// ---------- Dalle ----------
// Le calcaire de la carrière se casse en plaques : la dalle est une forme naturelle plate de la pierre brute, 45 × 40 × 12 cm.
// Gabarit : W 9 ; H + D/2 = 2,4 + 4 : silhouette 9 × 7 px. Même roche et même manière que la pierre brute (manière C,
// art/items/stones.ts : rampe du calcaire `! + = ; ~`, taches de patine grise `R` et ocre `D`, blanc seulement là où la pierre
// a sauté, fissure `~`), mais une plaque : le dessus large et plat sur cinq rangées (le contour du haut, quatre rangées de `+`),
// le flanc est en raccourci d'un pixel (`;`), la tranche sud mince (une rangée, `=` et `;`) et cassée, puis le contour du bas.
// Contour dessiné à la main : `~` en haut et à gauche, OUTLINE en bas et à droite ; il marche là où la plaque a cassé.
// Deux formes (`slab`, `slab-b`). Posée sous un poteau, elle devient le dé (`footing-stone`, `footing-stone-b`,
// art/world/building.ts) sans changer : le dessus garde au moins 8 px de large pour le pied du poteau.

const SLAB: Record<'a' | 'b', Grid> = {
  // A : le coin nord-ouest parti en biais, le bord ouest cassé frais (blanc sur le dessus et la tranche), une fissure en biais
  // sur le dessus, une tache de patine grise au nord-est, la tranche ébréchée au sud-est
  a: [
    '..~~~~~o.',
    '.~+;+RR;o',
    '~!++;+R;o',
    '~!+++;+;o',
    '~++++++;o',
    '~!==;=;o.',
    '.ooooooo.',
  ],
  // B : le coin nord-est cassé, un creux au bord nord d'où part une fissure, du lichen ocre au sud-ouest du dessus, le bout est
  // de la tranche parti frais (blanc)
  b: [
    '.~~~~.~o.',
    '~++++;+;o',
    '~+++;++;o',
    '~+R++++;o',
    '~DD+++!;o',
    '~=D=;!!o.',
    '.ooooooo.',
  ],
};

/** La dalle sans ombre portée (silhouette 9 × 7), forme A ou B. */
export function slabBody(form: 'a' | 'b' = 'a'): Grid {
  const g = SLAB[form];
  g.forEach((r, i) => { if (r.length !== 9) throw new Error(`implantation : dalle ${form}, rangée ${i} de ${r.length} au lieu de 9`); });
  return g;
}

/** La dalle posée, ombre portée comprise (la silhouette décalée d'un pixel vers le sud-est), dans une image de 10 × 8. */
export function slab(form: 'a' | 'b' = 'a'): Canvas {
  const g = slabBody(form);
  const c = new Canvas(10, 8).stamp(g, 0, 0);
  for (let y = 1; y < c.h; y++) for (let x = 1; x < c.w; x++) {
    if (c.get(x, y) === EMPTY && (g[y - 1]?.[x - 1] ?? EMPTY) !== EMPTY) c.set(x, y, 'x');
  }
  return c;
}

// ---------- Icône de la dalle ----------
// Plus grande que sur la carte pour la case : la même plaque, plus large que haute ; le dessus clair et plat, une fissure, la
// patine grise et le lichen ocre, le bord ouest cassé frais, la tranche mince au sud. Pas d'ombre (le jeu l'ajoute au sol).

function itemSlab(): Canvas {
  const g: Grid = [
    '...~~~~~~~o..',
    '.~~++++++RR;o',
    '~!+++~+++RR;o',
    '~!++++~+++R;o',
    '~!+++++~+++;o',
    '~++++++++++;o',
    '~+DD+++++++;o',
    '~=DD==;==;;o.',
    '.oooooooooo..',
  ];
  g.forEach((r, i) => { if (r.length !== g[0].length) throw new Error(`implantation : icône de la dalle, rangée ${i}`); });
  const c = new Canvas(16, 16);
  c.stamp(g, Math.floor((16 - g[0].length) / 2), 16 - 3 - g.length);
  return c;
}

// ---------- Dalle portée ----------
// Portée à deux mains devant le ventre (posture `carry`, CARRY_HANDS de art/characters/xeros.ts). Une plaque presque carrée
// se voit à peu près pareille de tous côtés : de face, sa tranche et son dessus ; de profil, le même dessin ; de dos, le même,
// que le corps cache en partie. Les mains la tiennent par-dessous : la prise est sur sa dernière rangée.

const STONE_SIZE = 15;
const SC = Math.floor(STONE_SIZE / 2);

function carriedSlab(): Grid {
  const body = slabBody('a');
  const c = new Canvas(STONE_SIZE, STONE_SIZE);
  c.stamp(body, SC - Math.floor(body[0].length / 2), SC + 2 - body.length);
  return c.toGrid();
}

const heldSlab = (): SpriteSheetSource => {
  const g = carriedSlab();
  return sheet('held-slab', STONE_SIZE, world, { down: g, up: g, right: g });
};

// ---------- Planchette gravée ----------
// Planchette de 30 × 20 cm, 2 cm d'épaisseur, posée sur la table de la mère (table, art/world/farm.ts : dessus en bois
// M, arête Y). Bois de tilleul clair et frais (Y t, le bois équarri neuf de la palette) pour se détacher du plateau ;
// sur le dessus, deux rangées : les traits gravés au couteau (T, une grappe de quatre : à cette taille, le plan se
// devine), le bord est à l'ombre (t). Le contour du bas fait la tranche. Silhouette 6 × 4 (gabarit 6 × 2,4 : deux
// rangées de dessus pour qu'on lise la gravure). Image 7 × 20 : l'ombre portée sur le plateau, à sa droite, et sous
// elle 16 rangées vides, la hauteur de la table (78 cm) ; le bas de l'image est le sol au bord sud de la table.

const TABLE_ROWS = 16;

function planTablet(): Canvas {
  const top: Grid = [
    '.NNNN..',
    'NYTTto.',
    'NTTYtox',
    '.oooox.',
  ];
  const c = new Canvas(7, top.length + TABLE_ROWS);
  c.stamp(top, 0, 0);
  return c;
}

export default [
  img('slab', slab('a')),
  img('slab-b', slab('b')),
  img('item-slab', itemSlab()),
  heldSlab(),
  img('plan-tablet', planTablet()),
];
