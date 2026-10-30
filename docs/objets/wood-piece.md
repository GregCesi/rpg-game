# Pièce de bois (`wood-piece`)

Décidé le 30 octobre 2026 (chantier « pièce de bois ») : tout le bois du monde est **un seul objet**, décrit par des réglages,
et non plus une collection de clés (billes numérotées, bille coin planté depuis chaque bout, demi-billes, quartiers, rondins,
poutres, chacun en est-ouest et en nord-sud). Cette fiche remplace celles de la bille coin planté, de la demi-bille, du quartier,
du rondin et de la poutre. Le contenu est dans `src/content/wood.json` ; voir CONCEPTION, *Le bois*.

## Identité
- Clé : `wood-piece` (props.json), la seule clé de bois. Image dans Tiled : `wood-piece` (la bille du gros, ronde, 1 m,
  est-ouest) ; en jeu, l'image s'assemble d'après les réglages.
- Réglages (GameState, `WoodPieceSchema` de `src/content/types.ts`) : `size`, le diamètre (`big` : 55 cm de bois, le gros arbre et
  le têtard ; `normal` : 30 cm) ; `length` en cm (sur la grille de 20 cm, 60 cm au moins) ; `shape` (`round`, `half`, `quarter`) ;
  `hewn` (coups de doloire : une face tous les 3, la poutre à 12) ; `axis` (`ew` est-ouest, `ns` nord-sud) ; `notch` (la coupe
  commencée : `at` cm du bout ouest ou nord, `hits`) ; `wedge` (le coin planté : `end`, le bout, `hits`, les coups de masse).
- Nom affiché, selon le diamètre et l'aspect (wood.json, `looks`) : bille, demi-bille, quartier (le gros) ; rondin, poutre (le
  normal). Genre du nom pour les messages : « elle » (bille, demi-bille, poutre), « il » (quartier, rondin).
- Nature : objet du monde (`props.json`), qui se prend quand il n'est pas trop lourd. Sa définition complète (dimensions,
  collision, prise, roulement, pivot, tas) se tire de ses réglages : `src/world/woodPiece.ts`.
- Mains : deux.

## Masse
- Calculée (`"mass": "wood"`, `src/content/mass.ts`) : section du bois × longueur × 900 kg/m³ (`density` de wood.json). Section :
  le rond du diamètre ; la moitié pour une demi, le quart pour un quart ; une pièce qu'on équarrit perd à chaque face un quart de ce
  qui sépare son rond du carré de la poutre (20 × 20 cm).
- Pièces courantes : bille du gros de 1 m **214 kg** (ne se porte pas, se roule) ; demi-bille **107 kg** (ni portée, ni roulée) ;
  quartier **53,5 kg** (porté, lentement) ; rondin du normal de 1 m **63,6 kg** (porté, va en tas) ; rondin de 3 m **191 kg**
  (roulé) ; poutre de 3 m **108 kg**, de 1,80 m **64,8 kg** (portée) ; tronc du gros (4 m) **855 kg**, du têtard (2 m) **428 kg**,
  du normal (5,8 m) **369 kg** : ils ne bougent pas, c'est le calcul qui le dit.
- Seuils de Xéros (`strength.json`) : porté jusqu'à 70 kg, marche normale jusqu'à 25 kg, roulé jusqu'à 300 kg.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Contour compris : longueur L ; diamètre 65 cm (gros), 40 cm (normal) ; demi : la moitié en hauteur ; quart : la moitié en
  largeur et en hauteur ; poutre : 30 × 30 cm (20 × 20 de bois).
- Est-ouest : L/5 px de long, plus une colonne d'ombre (21 px pour 1 m) ; hauteur de l'image selon l'aspect (`ew.h` : 16 pour
  la bille du gros, 10 pour le rondin). Nord-sud : largeur selon l'aspect (`ns.w` : 14, 9), hauteur `extra` + L/10 px (le dessus
  vu à ½). La bille de 1 m du gros, étalon du gabarit : 20 × 13 px de silhouette (`dims` de `wood-piece` : 100 × 65 × 65).
- Collision : est-ouest, (L/5 − 1) px de long ; nord-sud, L/10 + `extra` px de haut (`body` de chaque aspect, wood.json).

## Vues
- Au sol : l'image s'assemble à sa longueur en trois parties, bout, milieu répété, bout, prises dans la planche de son diamètre
  (`wood-big`, `wood-normal`, et `-ns`), par les opérations de `src/world/woodShape.ts` (`composeOps`) : le jeu à la volée
  (`src/world/woodTexture.ts`), le dessin pour les images de 1 m (`art/world/wood-pieces.ts`). Jamais retournée.
- Aspects : rond (4 images de roulement), demi, quart (le gros) ; une, deux, trois faces dressées, poutre (le normal).
- Encoche : une bande à sa place (un tiers, deux tiers).
- Coin planté : la partie du bout où il est planté est remplacée (coin dans la face de coupe vue, tête qui dépasse au bout caché) ;
  la fente court sur un tiers, deux tiers de la longueur depuis ce bout ; au dernier coup, le bois grand ouvert un instant.
- Portée (`carry`), dans le sens de la marche : de face et de dos, par le bout (`held-wood-<diamètre>-<aspect>`, vue qui ne
  dépend pas de la longueur) ; de profil, la pièce assemblée à sa longueur, sans ombre, son milieu dans les mains.
- Case d'interface : `item-wood-<diamètre>-<aspect>`, et sa longueur écrite en bas de la case (« 1 m »).
- Fantôme : la pièce d'un tas, à sa place.
- Invite de coupe : « Espace » sur la coupe visée et, au-dessus, les deux longueurs (« 3 m | 2,8 m »).

## Regroupement
Seule, ou en tas pour les pièces de **1 m** (pour l'instant) : la bille ronde du gros (`big-logs`), le rondin rond du normal
(`normal-logs`), le quartier (`big-quarters`), chacun 3 au sol, 2 dans les creux, 1 au sommet, est-ouest ou nord-sud.

## Gestes
- E court : la prendre à deux mains si elle pèse 70 kg ou moins (sinon « Trop lourd(e) à porter. Pousse-le (-la) pour le (la)
  faire rouler. ») ; pas pendant une coupe ni avec un coin planté.
- Pousser (mains libres, contre elle) : la pièce ronde roule perpendiculairement à son axe jusqu'à 300 kg ; la poutre (« Elle ne
  roule pas : elle est carrée. »), une pièce à une face dressée, la demi-bille et le quartier (à plat) ne roulent pas.
- R maintenu au contact, mains libres : un quart de tour (est-ouest <-> nord-sud), à toute longueur, s'il y a la place. R en main :
  elle sera posée dans l'autre sens.
- Espace, la cognée, contre son flanc : la coupe s'aimante tous les 20 cm depuis le bout le plus proche de Xéros ; refusée si un
  morceau ferait moins de 60 cm (« Le bout serait trop court. »), sur une pièce de moins de 1,20 m (« Trop court pour être
  recoupé. »), sur une demi ou un quart (« On coupe avant de fendre. »), sur une pièce dressée (« On coupe avant d'équarrir. ») ;
  trois coups, deux pièces. 0,8 point le coup.
- Espace, la doloire, contre le flanc d'une pièce ronde du normal : une face tous les 3 coups, la poutre à 12 ; le gros : « Trop
  grosse pour une poutre. » ; 0,333 point par coup et par mètre.
- Espace, le coin, à un bout d'une bille ou d'une demi-bille du gros (1 m au plus, « Trop longue pour un seul coin. ») : il se
  plante d'un coup, sans geste ; depuis le flanc : « Le coin se plante dans le bout, là où on voit les cernes. » ; le quartier :
  « Trop mince pour le coin. » ; le normal : « Ce bois ne se fend pas : il se coupe et s'équarrit. ». 1 point.
- Espace, la masse, depuis le bout du coin : trois coups (la fente court), et deux morceaux (demi-billes, puis quartiers), le coin
  au sol ; sans coin : « Il faut d'abord un coin. » ; depuis l'autre bout : « Les coups se donnent sur le bout, là où le coin est
  planté. » ; sans place : « Pas la place pour la fendre. ». 0,8 point le coup.

## Origine
Un arbre abattu puis ébranché : son tronc devient une seule pièce ronde de sa longueur utile, posée sur le tronc (le gros grand
4 m, le têtard 2 m, le normal 5,8 m). Puis on la coupe, on la fend, on l'équarrit. Posée dans Tiled (la bille de l'atelier de la
mère), avec des réglages en propriétés (`size`, `length`, `shape`, `axis`, `hewn`) ou ceux de props.json.

## Devenir
Les billes de 1 m vont en tas pour le chauffage, ou se fendent en quartiers ; les rondins du normal deviennent les poteaux de l'abri
(3 m et 1,80 m), équarris au pied du chantier.

## Vérification
- Aperçu : `.art-preview/bois.png` (chaque diamètre et aspect, plusieurs longueurs, roulement, encoche, coin et fente, vues
  portées, icônes), `.art-preview/arbres.png`, `.art-preview/piles.png`, `.art-preview/gabarit.png`.
- Tests : `npm run test:fendage`, `npm run test:equarrissage`.
- En jeu (`?dieu`, « Pièce de bois ») : poser des pièces de chaque diamètre, longueur, état et sens ; les couper, les rouler, les
  pivoter, les porter, les fendre, les équarrir.
