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
// - normal-felled.ts : l'arbre couché d'un seul tenant (`normal-felled-tree`, `-left`), sans sections ni entailles ;
//                      exporte `lyingFrame()` et `lyingFrameLeft()` (dernière image de chaque chute) et `FELLED_TREE`
//                      (sa place, ses collisions, la place du rondin de 500 cm qu'il devient une fois ébranché).
// - normal-fall.ts   : planches `normal-tree-fall` et `normal-tree-fall-left` ; importe les deux `lyingFrame*`.
// - timber.ts        : le rondin (30 cm à 5 m) et la poutre qu'on en tire, dont la bille de 95 cm `normal-felled-log`
//                      et `normal-felled-log-ns` ; normal-logs.ts garde la construction d'origine de la bille, dont
//                      partent encore la bille portée et l'icône (carried.ts, resources.ts).

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
/** Longueur d'une bille de 95 cm : 19 colonnes (la bille portée de normal-logs.ts). */
export const SEC = 19;
/**
 * Colonne de la frame à partir de laquelle le houppier couché passe par-dessus le tronc (avec la frontière festonnée de
 * normal-felled.ts) ; avant, il ne se pose que sur le vide. Ébranché, le tronc laisse un rondin de 500 cm (100 px) à
 * partir du bout scié.
 */
export const CROWN_OVER_X = BUTT_X - 1 + 76;
/** Longueur totale du tronc couché, du bout scié à la pointe (le arbre fait environ 7 m : 140 px, houppier compris). */
export const TREE_LEN = 140;
