// Le morceau de solin (chantier « mode construction ») : le mur bas de pierre qui porte une sablière, en deux manières, montées
// par calcul (art/lib/walls.ts, le calcul de l'essai des murs validé par Grégoire : tools/essai-murs.ts) avec les dessins
// mêmes des pierres du jeu :
//   - le morceau de solin brut (`rough-sill-wall`) : pierres brutes serrées, joints de terre d'1 à 2 px, petites et éclats
//     de calage ; sur 40 cm de face, une grosse au plus (rognée par l'assise haute), surtout des moyennes et des petites ;
//   - le morceau de solin taillé (`dressed-sill-wall`) : moellons de 30, 40, 50 cm et boutisses, deux assises de 20 cm,
//     joints décalés.
// 1,60 m de long, 50 cm d'épaisseur, 60 cm de haut dont 40 hors du sol (on ne dessine que ceux-là) : gabarit boîte 160 × 50 ×
// 40 cm, 32 × (8 + 5) = 32 × 13 px (face sud 8, dessus 5 en raccourci), ombre portée en plus.
//
// Quatre vues, couché (règle D, docs/STYLE.md section 8) : r0 le mur est-ouest vu du sud ; r2 le demi-tour (le même mur vu de
// son autre face : un autre tirage, même taille) ; r1 et r3 le mur nord-sud, 13 × 32 : le dessus des pierres vu le long du
// mur sur 24 rangées, le bout du mur (sa face de 40 cm, 13 × 8) en bande au sud, comme le bout coupé de la bille nord-sud.
// Chaque vue est un vrai dessin, éclairé en haut à gauche, pas une rotation de pixels.
//
// Un tirage différent à chaque pose : VARIANTS tirages de chaque vue (graines différentes), que le jeu choisit au hasard.
// Noms : tirage 0 `<clé>`, `<clé>-r1`, `-r2`, `-r3` ; tirage k (1 à 7) `<clé>-s<k>`, `<clé>-s<k>-r1`, `-r2`, `-r3`.

import type { Grid } from '../lib/canvas';
import type { ImageSource } from '../lib/types';
import { dressedWall, roughWall, type WallSize } from '../lib/walls';
import { stonePalette } from '../items/stones';

/** Nombre de tirages de chaque vue (variants de props.json). */
export const VARIANTS = 8;

const LENGTH = 32; // 1,60 m
const FACE = 8; // 40 cm hors du sol
const TOP = 5; // 50 cm d'épaisseur, en raccourci à ½

/** Le mur est-ouest (r0, r2) et le mur nord-sud (r1, r3 : règle D, dimensions inversées). */
const EW: WallSize = { length: LENGTH, face: FACE, top: TOP, axis: 'ew' };
const NS: WallSize = { length: TOP + FACE, face: FACE, top: LENGTH - FACE, axis: 'ns' };

type Build = (seed: number, size: WallSize) => { grid: Grid };

const KINDS: { key: string; build: Build; salt: number }[] = [
  { key: 'rough-sill-wall', build: roughWall, salt: 101 },
  { key: 'dressed-sill-wall', build: dressedWall, salt: 211 },
];

/** Graine de la vue `view` du tirage `k` : toutes différentes (le demi-tour est un autre tirage). */
const seedOf = (salt: number, k: number, view: number) => salt * 1000 + k * 10 + view;

/** Nom de l'image de la vue `view` du tirage `k`. */
export function sillImage(key: string, k: number, view: number): string {
  return `${key}${k ? `-s${k}` : ''}${view ? `-r${view}` : ''}`;
}

/** Le dessin d'une vue d'un tirage (pour les aperçus). */
export function sillGrid(key: string, k: number, view: number): Grid {
  const kind = KINDS.find((x) => x.key === key);
  if (!kind) throw new Error(`sill-walls : solin ${key} inconnu`);
  return kind.build(seedOf(kind.salt, k, view), view % 2 ? NS : EW).grid;
}

export const SILL_KEYS = KINDS.map((k) => k.key);

const sources: ImageSource[] = KINDS.flatMap(({ key }) =>
  Array.from({ length: VARIANTS }, (_, k) => [0, 1, 2, 3].map((view): ImageSource => ({
    kind: 'image',
    name: sillImage(key, k, view),
    palette: stonePalette,
    grid: sillGrid(key, k, view),
  }))).flat(),
);

export default sources;
