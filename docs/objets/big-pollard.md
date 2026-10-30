# Têtard (`big-pollard`)

Le têtard (une trogne) est le gros arbre des haies : on l'étête régulièrement pour le bois de chauffage, si bien qu'il garde
un tronc court et épais sous une tête touffue. C'est une deuxième pièce debout de la sorte `big` : le même tronc de 55 cm
que le gros grand (`big-tree`, l'arbre de forêt), la même souche, le même bois (des pièces de bois `big`), le même tas.
Seuls l'arbre debout, ses deux chutes et son arbre couché lui sont propres (fiche des arbres couchés : [big-felled-tree](big-felled-tree.md)). Le gros grand, ses pièces et ses billes : `README.md`,
*Deux arbres* et *Abattre un arbre* ; l'arbre normal : [normal-tree](normal-tree.md).

## Identité
- Clés : `big-pollard` (debout), `big-pollard-fall` et `big-pollard-fall-left` (planches de la chute). Toutes aussi clés
  d'image. Couché : `big-pollard-felled-tree` (et `-left`). Il réutilise `big-tree-stump` (souche) ; son bois est la [pièce de bois](wood-piece.md) `big`, genre de tas `big-logs`.
- Nom affiché : têtard.
- Nature : objet du monde (`props.json`), avec un `harvest` (hache).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Tronc de 55 cm : 11 px d'écorce, 13 px (65 cm) contour compris, comme le gros grand.
- Arbre debout : 270 × 120 × 370 cm (boîte), la vraie profondeur de sa tête (celle du houppier couché) : le gabarit attend
  54 × 86 px (74 + 12), il est dessiné **54 × 79 px**. La hauteur est sa longueur couchée (du pied au bout du houppier
  couché : 74 px, 3,70 m). Il est dans `EXCEPTIONS` (validate.ts) : tête stylisée, qui montre peu de dessus, choix de
  Grégoire ; le dessin ne change pas.
- Couché d'un seul tenant (tronc et houppier) ; ébranché, une pièce de bois ronde de **2 m** (sa longueur utile), qui donne deux
  billes de 1 m.

## Masse
- L'arbre debout : pas déplaçable, pas de masse. Son tronc ébranché (2 m) : **428 kg**, il ne bouge pas ; ses billes de 1 m : **214 kg** chacune
  (calculée, volume × 900 kg/m³), donc **trop lourdes à porter** (70 kg) : elles se roulent (300 kg), et se fendent.

## Vues
- Debout : `big-pollard`, 64 × 96, pied du tronc en (33, 89) : le dessin du gros arbre debout d'avant le 30 octobre 2026
  (`treeBody` de art/world/big-tree.ts), sans retouche.
- Chute : `big-pollard-fall` (à droite) et `big-pollard-fall-left` (à gauche, lumière refaite en haut à gauche, pas un miroir),
  126 × 96, animation `fall` de 4 images : l'arbre debout, 10°, 45° (tirées du même `treeBody` pivoté autour de la
  charnière), l'arbre couché lui-même (souche et arbre couché d'un seul tenant, tels que le jeu les pose : pixel pour pixel, vérifié par
  `arbres.png`). Code : art/world/big-pollard.ts (`POLLARD_FALL`), qui partage le
  pivot de la chute du gros grand (art/world/big-felled.ts, `Faller`).
- Couché, entaillé, billes, porté, fantôme : ceux des pièces du gros grand.

## Regroupement
Seul. Les deux pièces couchées forment une chaîne (ordre de `spawns`) ; leurs billes s'entassent avec celles du gros grand
(`big-logs`).

## Gestes
- Espace avec la hache, debout, de côté (`use`) : 4 coups, il tombe du côté opposé à Xéros, laisse sa souche et fait naître
  ses deux pièces : souche `at` [17, -2], section 1 en (45, -6), houppier en (55, 0) ; `fall` : x -14, `foot` 33, à
  gauche x -45.
- Puis comme le gros grand : ébrancher le houppier (branches), couper l'encoche (3 coups), prendre, tourner, poser les billes.

## Origine
Pousse dans la ferme (`ferme.tmj`), parmi les deux autres arbres.

## Devenir
Souche, 2 billes, des branches.

## Vérification
- Aperçu : `.art-preview/arbres.png` (les trois arbres à chaque étape, le têtard au milieu), `.art-preview/collection.png`,
  `.art-preview/gabarit.png`.
- En jeu : `?dieu`, poser un « têtard (big-pollard) » devant Xéros, l'abattre des deux côtés.
