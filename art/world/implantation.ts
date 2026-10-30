// L'implantation de l'abri à bois : la pierre plate qui devient un dé, la planchette où la mère a gravé le plan.
// Fiches : docs/objets/flat-stone.md, plan-tablet.md. Le piquet : art/items/stake.ts ; la hachette qui le taille :
// art/items/hatchet.ts.
//
// Échelle du jeu (5 cm par pixel, gabarit de docs/STYLE.md section 8), lumière en haut à gauche, contour d'un pixel :
// teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas et à droite.

import { Canvas, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { outline } from '../items/lib';
import { sheet } from '../items/carried';
import { footingStone } from './building';

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

// ---------- Pierre plate ----------
// Le dessin du dé de pierre (art/world/building.ts) : même pierre, même lumière, 6 × 6 px (30 × 30 × 15 cm), coin
// nord-est émoussé, ombre portée en bas à droite. Posée sur une place du chantier, elle devient ce dé sans changer.

function flatStone(): Canvas {
  return footingStone();
}

/** La pierre sans son ombre portée. */
function stoneBody(): Grid {
  return footingStone().toGrid().map((r) => r.replace(/x/g, '.')).filter((r) => /[^.]/.test(r)).map((r) => r.slice(0, 6));
}

// ---------- Icône de la pierre plate ----------
// En trois quarts, plus grande que sur la carte pour la case : une dalle plus large que haute, le dessus clair (R, la
// lumière à gauche ; r vers l'est), la face sud en z, Z vers la droite et le bas ; un coin émoussé au nord-est, une
// fente sur la face. Pas d'ombre (le jeu l'ajoute au sol).

function itemFlatStone(): Canvas {
  const c = Canvas.from([
    '................',
    '................',
    '................',
    '................',
    '..RRRRRRRRRr....',
    '..RRRRRRRRRRrr..',
    '..RRRRRRRRRrrrr.',
    '..rRRRRRRrrrrrr.',
    '..zzzzzzzzzzzzZ.',
    '..zzzzzzzzzzzzZ.',
    '..zzzZZZzzzzzZZ.',
    '..zzzzzzzzzzZZZ.',
    '................',
    '................',
    '................',
    '................',
  ]);
  return outline(c, 'Z');
}

// ---------- Pierre plate portée ----------
// Portée à deux mains devant le ventre (posture `carry`, CARRY_HANDS de art/characters/xeros.ts). Une pierre carrée
// se voit pareille de tous côtés : de face, sa face sud et son dessus ; de profil, son côté, le même dessin ; de dos,
// le même, que le corps cache (6 px de large derrière un torse de 12). Les mains la tiennent par-dessous : la prise est
// sur sa dernière rangée de pierre.

const STONE_SIZE = 15;
const SC = Math.floor(STONE_SIZE / 2);

function carriedStone(): Grid {
  const body = stoneBody();
  const c = new Canvas(STONE_SIZE, STONE_SIZE);
  c.stamp(body, SC - 3, SC - 4);
  return c.toGrid();
}

const heldFlatStone = (): SpriteSheetSource => {
  const g = carriedStone();
  return sheet('held-flat-stone', STONE_SIZE, world, { down: g, up: g, right: g });
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
  img('flat-stone', flatStone()),
  img('item-flat-stone', itemFlatStone()),
  heldFlatStone(),
  img('plan-tablet', planTablet()),
];
