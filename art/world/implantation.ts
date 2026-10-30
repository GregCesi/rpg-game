// L'implantation de l'abri à bois : le billot chargé d'une branche à tailler en piquet, la pierre plate qui devient un dé,
// la planchette où la mère a gravé le plan. Fiches : docs/objets/chopping-block-branch.md, flat-stone.md,
// plan-tablet.md. Le piquet lui-même : art/items/stake.ts.
//
// Échelle du jeu (5 cm par pixel, gabarit de docs/STYLE.md section 8), lumière en haut à gauche, contour d'un pixel :
// teinte la plus sombre de la matière en haut et à gauche, OUTLINE (o) en bas et à droite.

import { Canvas, type Grid } from '../lib/canvas';
import type { ImageSource, SpriteSheetSource } from '../lib/types';
import { world } from '../palette';
import { outline } from '../items/lib';
import { sheet } from '../items/carried';
import { choppingBlock } from './house';
import { footingStone } from './building';

const img = (name: string, c: Canvas): ImageSource => ({ kind: 'image', name, palette: world, grid: c.toGrid() });

// ---------- Billot et branche ----------
// Le billot nu (art/world/house.ts), au même pixel que dans ses autres images : rien ne bouge quand on pose la branche.
// La branche (100 cm, Ø 5 cm, matière de la branche sèche, art/items/branch.ts : dessus M, flanc m) est couchée
// est-ouest en travers de la coupe, un peu en arrière du milieu de l'ovale ; ses bouts dépassent du billot de 4 à 5 px
// de chaque côté, en l'air. Une seule rangée de bois (5 cm), comme le piquet (art/items/stake.ts) : à gauche le gros
// bout cassé net (U), à droite le bout plus fin (m). Gabarit : la boîte qui l'englobe, 100 × 55 × 50 cm, 20 × 15,5 :
// dessinée 20 × 15 (son contour du haut sur celui du billot). Son ombre de contact assombrit le bois de bout (T) sous
// elle ; on voit la coupe devant elle et ses deux bouts.

/** Colonnes de la branche (bois, sans contour) dans l'image du billot (le billot occupe x 11 à 21). */
const BRANCH_X0 = 7;
const BRANCH_LEN = 18;
/** Rangée du bois de la branche (une seule : 5 cm), entre son contour du haut et celui du bas. */
const BRANCH_ROW = 15;

function choppingBlockBranch(): Canvas {
  const c = choppingBlock();
  // ombre de contact sur la coupe, juste sous la branche
  for (let x = BRANCH_X0; x < BRANCH_X0 + BRANCH_LEN; x++) {
    if ('Yt'.includes(c.get(x, BRANCH_ROW + 2))) c.set(x, BRANCH_ROW + 2, 'T');
  }
  // la branche seule, contournée à part, puis posée sur le billot : gros bout cassé clair (U) à gauche, une fente (m),
  // le bout fin (m) à droite
  const b = new Canvas(c.w, c.h);
  for (let i = 0; i < BRANCH_LEN; i++) b.set(BRANCH_X0 + i, BRANCH_ROW, i === 0 ? 'U' : 'M');
  for (const i of [5, 6, 7, BRANCH_LEN - 3, BRANCH_LEN - 2, BRANCH_LEN - 1]) b.set(BRANCH_X0 + i, BRANCH_ROW, 'm');
  outline(b, 'N');
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.px[y][x] !== '.') c.set(x, y, b.px[y][x]);
  return c;
}

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
  img('chopping-block-branch', choppingBlockBranch()),
  img('flat-stone', flatStone()),
  img('item-flat-stone', itemFlatStone()),
  heldFlatStone(),
  img('plan-tablet', planTablet()),
];
