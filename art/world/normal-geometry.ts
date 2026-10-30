// L'arbre normal : le contrat de géométrie partagé par tous ses dessins (art/world/normal-*.ts).
//
// Un arbre normal (CONCEPTION, *Abattre un arbre*) : tronc de 30 cm (6 px d'écorce, 8 px contour compris = 40 cm),
// environ 7 m de haut, plus élancé que le gros (art/world/big-tree.ts, big-felled.ts, tronc de 55 cm, 11 px). Mêmes
// règles que le gros, à son échelle : 5 cm par pixel, bille de 95 cm = 19 px de long, lumière en haut à gauche,
// matière `NORMAL_WOOD` de wood.ts. Chaque fichier reprend ces constantes ; aucun n'en redéfinit une.
//
// Fichiers et ce qu'ils s'échangent :
// - normal-tree.ts   : arbre debout (`normal-tree`) et souche (`normal-tree-stump`) ; exporte `treeBody(light)`,
//                      `standingTree()`, `stumpBody()`, `stump()`.
// - normal-felled.ts : pièces du tronc couché, entailles, bouts coupés, billes de la chaîne, à droite et à gauche ;
//                      exporte `lyingFrame()` et `lyingFrameLeft()` (dernière image de chaque chute) et `FELLED_LAYOUT`.
// - normal-fall.ts   : planches `normal-tree-fall` et `normal-tree-fall-left` ; importe les deux `lyingFrame*`.
// - normal-logs.ts   : bille seule `normal-felled-log`, bille nord-sud `normal-felled-log-ns`, et (carried.ts,
//                      resources.ts) la bille portée et l'icône.

import type { Vec } from './big-tree';

/** Nom de la sorte : préfixe de toutes les clés (`normal-tree`, `normal-felled-log`...). */
export const KIND = 'normal';

// ---------- Arbre debout ----------

/** Image de l'arbre debout : 48 x 168, le pied du tronc (centre du bas du tronc) en FOOT, ombre sous le pied. */
export const TREE_W = 48;
export const TREE_H = 168;
export const FOOT: Vec = [24, 161];
/** Tronc nu : 6 colonnes d'écorce (21 à 26), un contour de chaque côté (20 et 27) : 8 px, 40 cm. */
export const TRUNK_X0 = 21;
/** Le houppier (feuillage) occupe les rangées CROWN_TOP à CROWN_BOTTOM de l'arbre debout ; dessous, le tronc est nu. */
export const CROWN_TOP = 3;
export const CROWN_BOTTOM = 100;
/** Une rangée du tronc nu, sous le houppier, dont le profil donne celui du tronc couché. */
export const TRUNK_ROW = 130;

// ---------- Souche ----------

/** Image de la souche : 24 x 24, pied du tronc en STUMP_FOOT. */
export const STUMP_SIZE: Vec = [24, 24];
export const STUMP_FOOT: Vec = [12, 19];
/** Coin haut gauche de la souche dans le repère de l'arbre debout (pied sur pied). */
export const STUMP_AT: Vec = [FOOT[0] - STUMP_FOOT[0], FOOT[1] - STUMP_FOOT[1]];

// ---------- Chute et arbre couché ----------

/** Frame de la chute (même hauteur que l'arbre debout). */
export const FALL_W = 192;
export const FALL_H = TREE_H;
/** Décalage de l'arbre debout dans la frame de la chute à droite (coin haut gauche de l'image de l'arbre). */
export const OFF = 10;
/** Idem à gauche : le miroir du pied. */
export const OFF_L = FALL_W - 1 - OFF - 2 * FOOT[0];
/** Première colonne du tronc couché (bout scié), contre la racine droite de la souche. */
export const BUTT_X = OFF + FOOT[0] + 9;
/** Rangées du tronc couché sans contour : TRUNK_TOP à TRUNK_TOP + 5 ; contour du bas sur TRUNK_BOTTOM. */
export const DIAMETER = 6;
export const TRUNK_TOP = 152;
export const TRUNK_BOTTOM = TRUNK_TOP + DIAMETER;
/** Longueur d'une pièce, donc d'une bille : 19 colonnes (95 cm). */
export const SEC = 19;
/** Pièces du tronc : 4 sections de tronc nu (`normal-felled-section-1..4`) puis le houppier (`normal-felled-crown`, `normal-felled-head`) : 5 billes. */
export const SECTIONS = 4;
export const LOGS = SECTIONS + 1;
/** Première colonne de chaque pièce (la 1re prend le contour du bout scié), puis la fin de la frame. */
export const PIECE_X = [...Array(LOGS).keys()].map((k) => BUTT_X - 1 + k * SEC).concat(FALL_W);
/** Longueur totale du tronc couché, du bout scié à la pointe (le arbre fait environ 7 m : 140 px, houppier compris). */
export const TREE_LEN = 140;
