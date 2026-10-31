# La chaumière de Xéros : maquette

Run de nuit « maquette », 31 octobre 2026. **Rien ici ne change le jeu.** C'est une proposition, à relire par Grégoire : la maison
couche par couche, ses éléments composés et leurs recettes, sa nomenclature, l'état de chaque brique et deux plans intérieurs.

Ce qui l'accompagne :

- **Images** (`npm run art:preview`, ou `npm run maquette -- --images`), en x4, sur la grille des cases, avec Xéros :
  - `.art-preview/maison-couches.png` : la maison qui monte, de gauche à droite (solin, ossature, remplissage, charpente, chaume,
    ouvertures et cheminée), puis finie ;
  - `.art-preview/maison-plans.png` : les deux plans intérieurs, vus de dessus, à la même échelle ;
  - `.art-preview/maison-elements.png` : chaque élément composé seul, dans toutes ses vues, avec sa recette dessous.
- **Chiffres** : `npm run maquette` imprime les couches, les recettes, la nomenclature, les arbres, les pierres et les heures
  (`tools/maquette.ts`). Tous les nombres de ce document en viennent ; si une cote change, on relance plutôt que de recompter.
- **Code de la maquette** (outils, pas jeu) :
  - `art/proposals/chaumiere-geometry.ts` : le contrat de géométrie (cotes, projection, boîtes, vues) ;
  - `art/proposals/murs.ts` et `art/proposals/toit.ts` : les dessins proposés, faits par le pixel-artist. Ils ne sont pas dans
    `art/index.ts` : le jeu ne les charge pas ;
  - `tools/lib/chaumiere.ts` : la maison en données, les recettes, la nomenclature et les heures ;
  - `tools/lib/chaumiere-plans.ts` : les deux plans ;
  - `tools/lib/maison-preview.ts` : les trois images ;
  - `tools/preview-proposals.ts` : l'aperçu d'un module de propositions seul.

Toutes les cotes sont en cm, sur la grille de 20 cm. Le repère de la maison : x vers l'est, y vers le sud, z vers le haut, depuis le
coin nord-ouest du solin, au niveau du sol extérieur.

## Ce qui ne colle pas avec la maison d'aujourd'hui

- La chaumière dessinée (`cottage`) fait 16,60 × 7,80 m au sol, avec un porche ; `maison.tmj` fait 23 × 12 cases (36,80 × 19,20 m).
  La longère réelle fait **14,40 × 6,40 m** dehors, soit **13,60 × 5,60 m** dedans : 8,5 × 3,5 cases. L'intérieur actuel est 2,5 fois
  trop grand dans chaque sens.
- Le plan validé (CONCEPTION, « La maison ») range six zones en trois colonnes de trois. Dans 5,60 m de profondeur, on ne place pas
  trois pièces l'une derrière l'autre : la longère se vit en enfilade, d'un pignon à l'autre.
- L'âtre déclaré (`fireplace`) fait 3,20 m de large et 4,15 m de haut. L'audit des tailles proposait déjà 2 m × 2,50 m ; la cheminée de
  la maquette fait 2 m de large, avec un âtre de 1,20 m.

## La maison couche par couche

### 1. Le solin

- **Emprise et volume.**
  - Emprise extérieure : **1440 × 640**.
  - Épaisseur **60** ; hauteur **80**, dont **40 enterrés** (la fondation, dans une rigole) et **40 hors sol**. Cela fait **4 assises
    de 20**.
- **Composition.** Deux parements de **moellons** (40 × 20 × 20, posés en long), et au milieu **20 cm de blocage** : les éclats de
  taille noyés dans le **mortier de terre**.
  - Le moellon bosselé n'occupe que 85 % de sa boîte : le reste de chaque assise est du mortier.
  - Le blocage est fait de 60 % d'éclats et de 40 % de mortier.
- **Pourquoi 60 cm.**
  - La sablière (20) se pose au milieu, avec 20 cm de pierre de chaque côté : tout tombe sur la grille.
  - L'écart entre les axes des sablières tombe alors à **5,80 m**, la longueur utile de l'arbre normal. Chaque entrait est donc d'un
    seul tenant.
  - Avec 40 cm, la sablière serait à 10 cm du bord (hors grille), et l'entrait demanderait 6 m de bois, que l'arbre normal ne donne
    pas.
- **Les portes.** Sous chaque porte, le solin est abaissé de deux assises sur 1,60 m. On y pose un **seuil de 12 pierres de taille**,
  à z 20, au niveau du sol intérieur : pas de marche à l'intérieur, une marche de 20 cm dehors.
- **Le solin entier.** 39,20 m sur son axe. Il demande **752 moellons**, **9,4 t d'éclats** et **255 gâchées de mortier de terre**
  (environ 4,2 m³), et une rigole de **9,4 m³** dont la terre sert au sol.
- **À l'intérieur.** Le solin forme une banquette de 20 cm au-dessus du sol, le long des murs : on y pose les pots.

### 2. L'ossature (le pan de bois)

- **Bois.** Des poutres de 20 × 20 équarries à la doloire, tirées de l'arbre normal (geste réel).
- **Sablières basses.** Posées sur le milieu du solin (z 40 à 60). Leurs faces extérieures forment un rectangle de 1400 × 600 ; leurs
  axes, de 1380 × 580.
  - Aucune pièce ne dépasse 5,80 m. Les sablières longues sont faites de pièces de 4,20, 4,20, 4,20 et 2 m, **enturées sur 20 cm au
    droit d'un poteau** (deux chevilles par enture) et assemblées à mi-bois aux angles.
  - Une sablière basse s'arrête aux portes : la porte s'ouvre sur le seuil de pierre (`plates` dans `tools/lib/chaumiere.ts`).
- **Poteaux.** 20 × 20, de **2 m** (z 60 à 260), **tous les 2 m** sur les murs longs (6 travées de 2 m et une de 1,80 m), et sur les
  pignons à 1,80, 2,20 et 1,80 m.
  - La travée du milieu des pignons (2,20 m d'axe, 2 m de vide) reçoit la cheminée au pignon est.
  - Cela fait **20 poteaux**, un par travée, partagés avec la travée voisine.
- **Sablières hautes.** z 260 à 280, mêmes pièces que les basses.
- **Hauteur sous sablière.** **2,40 m** au-dessus du sol intérieur, qui est à z 20.
- **Décharges.** Une poutre en diagonale dans chacune des 8 **travées d'angle**, du haut du poteau d'angle au pied du poteau voisin :
  **2,80 m** dans une travée de 2 m, **2,60 m** dans une de 1,80 m.
- **Huisseries.** Une porte a un poteau d'huisserie (2,40 m, depuis le seuil) et un linteau (1,20 m). Une fenêtre a un montant (2 m),
  un appui et un linteau (1 m chacun).
- **Pourquoi des travées de 2 m.**
  - C'est l'écartement courant des colombages paysans à grands panneaux remplis de clayonnage.
  - Le vide de 1,80 m se tresse avec les baguettes de 2 m du jeu, sans les couper.
  - Le vide de 2 m de haut est exactement la longueur d'un palançon.

### 3. Le remplissage

- **Palançons.** Des lattes fendues de **4 × 6 cm**, verticales, **tous les 30 cm**, de sablière à sablière (2 m), entrées dans une
  rainure : **6 par panneau** de 1,80 m.
- **Clayonnage.** Des **baguettes** de Ø 2,5 cm tressées à l'horizontale entre les palançons, dessus puis dessous : un rang tous les
  2,5 cm, **80 baguettes par panneau**.
- **Torchis.** Il enrobe le tout des deux côtés, à fleur du bois, sur **20 cm** d'épaisseur. Il remplit 90 % du vide, le reste étant
  le bois du clayonnage : **81 mottes de torchis par panneau** de 1,80 × 2 m.
- **Pignons.**
  - Le triangle au-dessus de la sablière haute fait 5,80 m de base et 3,60 m de haut, bordé par le couple de rive.
  - À l'ouest, un **poinçon** de 3,60 m et **deux potelets** de 2,40 m le tiennent ; le remplissage est le même que celui des murs.
  - À l'est, le conduit de la cheminée prend le milieu, sans poinçon.
- **Les murs en tout.** Environ 103 m² de clayonnage et de torchis, cloisons comprises : **180 palançons**, environ **2 300
  baguettes** et **2 314 mottes de torchis** (32 t).

### 4. La charpente

- **Pente : 50°.** Le chaume demande au moins 45° pour que l'eau file ; une pente plus forte dure plus longtemps. Cela donne **3,60 m
  de haut** pour 3 m de demi-largeur. La croisée des chevrons est à z 640, la pointe du chaume à z 720.
- **Entraits.** **6 poutres de 5,80 m**, posées sur les sablières hautes au droit des poteaux intérieurs (tous les 2 m). Elles tiennent
  les murs contre la poussée du toit, et c'est sous elles que s'appuient les cloisons.
- **Couples de chevrons.** Deux **perches de Ø 12 cm et 5,60 m** croisées en haut, **tous les 60 cm** : **24 couples**.
  - Les pieds sont chevillés sur la sablière et dépassent le mur de 40 cm pour porter l'avant-toit.
  - Chaque couple de l'intérieur a un **entrait retroussé** (une perche de 2,40 m à z 520).
  - C'est la charpente du chaume paysan : légère, sans panne, faite de bois de taillis.
- **Faîtage.** Une perche couchée dans la croisée, de bout en bout : 14,80 m en trois perches (5,60, 5,60 et 4 m) enturées.
- **Lattes.** Les **baguettes** de 2 m liées sur les chevrons **tous les 40 cm** le long de la pente : 14 rangs par versant, 9 baguettes
  par rang.
  - Une baguette couvre trois intervalles de 60 cm, plus 20 cm de recouvrement.
  - Elles sont liées par des **harts** (des verges de noisetier tordues).
- **Bois de la charpente.** **48 chevrons** de 5,60 m, **22 entraits retroussés**, **6 entraits**.

### 5. La couverture

- **Le chaume.** **40 cm** de **bottes de chaume** (1,20 m × Ø 30, 8,5 kg) posées le gros bout en bas, en rangs de 40 cm de pureau qui
  se recouvrent.
  - Chaque rang est serré par une **tringle** (une baguette), liée aux lattes à chaque chevron par une hart.
  - L'avant-toit descend à **z 220** (2 m au-dessus du sol intérieur) et dépasse le mur de 60 cm ; le chaume déborde les pignons de 20 cm
    au-delà du solin (toit de x −20 à 1460, 14,80 m de long).
  - Surface : **167 m²** sur deux versants de 5,65 m de pente ; masse : **6,7 t** (40 kg/m², ce que pèse un chaume de paille posé).
  - Il faut **790 bottes**, soit **2 370 gerbes** peignées.
- **Le faîtage de chaume** est celui des chaumières normandes.
  - Un boudin de paille (2 gerbes de front) couvert de **terre** sur 40 × 30 cm, lissée, où l'on plante des **iris** : leurs racines
    tiennent la terre.
  - 14,80 m demandent **167 mottes de terre** et une quinzaine de touffes d'iris.

### 6. Les ouvertures

- **La porte d'entrée.**
  - Ouverture de **100 × 180**, au sud, dans la travée x 830 à 1030 pour le plan A. Son bord ouest est à la face du poteau ; le
    poteau d'huisserie, à l'est ; le seuil, en pierre de taille.
  - Le vantail est fait de **4 planches fendues** de 25 × 180 cm, de **2 traverses** et d'une **écharpe** (planches recoupées à 1 m et
    1,40 m), chevillées (12 chevilles).
  - Il tourne sur **2 pentures et leurs gonds**, et se ferme par un **loquet de bois**.
- **La porte de derrière.** Pareille, au nord, vers le jardin et le tas de bois (CONCEPTION la prévoyait).
- **Les fenêtres.**
  - Deux jours de **80 × 60**, au sud (le seul côté qui a du soleil), appui à 1 m du sol intérieur.
  - Pas de vitre : un **volet de 4 planches** de 80 cm sur 2 traverses de 1 m, 8 chevilles, 2 pentures.
  - La nuit et l'hiver, le volet fermé ; le jour, ouvert, rabattu sur le torchis.

### 7. La cheminée

Plan A : contre le pignon est, l'âtre ouvert vers l'ouest dans la salle. Elle prend la place de la travée du milieu du pignon et monte
jusqu'à **z 760** (environ 70 cm au-dessus de la pointe du chaume).

- **Fondation.** 200 × 120 × 60, en moellons.
- **Âtre.** Ouverture de **120 × 140**, 60 de profondeur.
  - Deux **jambages** de 40 et un **contre-cœur**, parementés en **pierre de taille** (75 pierres, une face de 4,5 m²) ; c'est la
    pierre qui voit le feu.
  - La sole est en **6 pierres plates**, dont deux devant l'âtre (la pierre de foyer).
- **Manteau.** Une **poutre de 2 m** à z 160 à 180, assez haut pour qu'on cuisine debout et que la fumée ne tombe pas.
- **Hotte.** En moellons, de z 180 à 300 ; elle se resserre de 200 × 120 à 80 × 80.
- **Conduit.** 80 × 80 dehors et 40 × 40 dedans, en moellons, jusqu'à z 760, sous une **dalle de couronnement** (une pierre plate).
- **Total.** Environ 7,4 m³ de maçonnerie : **294 moellons**, 75 pierres de taille, 7 pierres plates, **115 gâchées** et une poutre ;
  **16,8 t**.

### 8. Le sol

- **Terre battue** à z 20, sur 13,20 × 5,20 m (68,6 m²) entre les faces intérieures du solin.
- **20 cm** : d'abord la terre de la rigole (10,4 m³), étalée, puis **421 mottes d'argile**, mouillées (43 seaux) et damées.

### L'ordre réel du chantier

L'image suit l'ordre demandé : solin, ossature, remplissage, charpente, chaume, puis ouvertures et cheminée. Sur un vrai chantier, il
diffère sur quatre points :

1. La **cheminée** monte avec le solin et la charpente, avant la couverture. On ne fait pas passer un conduit dans un chaume déjà posé.
2. La **charpente** se lève **avant le remplissage**. Le pan de bois, la charpente et le chaume viennent d'abord ; le torchis vient
   ensuite, à l'abri de la pluie.
3. Les **huisseries** sont posées avec l'ossature. Les vantaux et les volets viennent à la fin.
4. Le **sol** se fait en dernier.

## Les éléments composés à créer

Un élément composé est une portion de maison faite de briques, qui se pose d'un bloc dans le bac à sable. Chacun a ses vues, selon sa
symétrie (r0 : posé sur le mur sud ; r1 à r3 : un quart de tour de plus à chaque fois ; `symmetric` : r0 et r1). Leurs dessins
(proposition) sont dans `maison-elements.png`.

- **Ce qu'est un pan.** Un pan est une **travée d'axe de poteau à axe de poteau**, dessinée avec ses deux poteaux. Sa recette compte un
  poteau : deux demis, partagés avec les voisins.
- **Les sablières n'entrent pas dans la recette des pans.** Les vraies sablières courent sur deux travées ou plus (pièces de 4,20 m
  enturées) : la nomenclature les compte à part.
- **Ce que « d'un bloc » veut dire.** Un pan fini pèse **1,1 à 1,3 t**, surtout son torchis. En vrai, on assemble le pan de bois à
  plat sur l'aire, on le lève (environ 250 kg, à plusieurs ou avec la mère), puis on le remplit en place. Le bloc est une commodité du
  bac à sable ; le chantier guidé, plus tard, le fera monter étape par étape.

| Élément (clé) | Taille réelle (cm) | Masse | Recette (pour un élément) | Poste | Métier |
| --- | --- | --- | --- | --- | --- |
| morceau de solin, 2 m (`solin`) | 200 × 60 × 80, dont 40 hors sol ; assemblé à toute longueur sur la grille | 2,4 t | 40 moellons, 499 kg d'éclats, 14 gâchées de mortier | sur place, dans la rigole | maçon (pierres du carrier) |
| pan plein, 2 m (`pan-plein`, aussi 1,80 et 2,20 m ; états clayonnage et torchis) | 200 × 20 × 240 | 1,3 t | 1 poteau de 2 m (deux demis), 6 palançons, 80 baguettes, 81 mottes de torchis, 2 chevilles | aire de montage, levé, rempli en place | charpentier, puis terrassier |
| pan d'angle, 2 m (`pan-angle`, aussi 1,80 m ; poteau d'angle à gauche ou à droite) | 200 × 20 × 240 | 1,2 t | 1 poteau de 2 m, 1 décharge de 2,80 m, 6 palançons, 69 baguettes, 69 mottes de torchis, 4 chevilles | idem | charpentier, puis terrassier |
| pan avec fenêtre (`pan-fenetre`) | 200 × 20 × 240, jour de 80 × 60 | 1,1 t | 1 poteau et 1 montant de 2 m, appui et linteau de 1 m ; volet : 4 planches de 0,80 m, 2 de 1 m, 2 pentures ; 4 palançons, 54 baguettes, 54 mottes de torchis, 16 chevilles | idem ; le volet à l'établi | charpentier, menuisier, forgeron |
| pan avec porte (`pan-porte`) | 200 × 20 × 280, porte de 100 × 180 | 1,2 t | 1 poteau de 2 m, huisserie de 2,40 m, linteau de 1,20 m ; porte : 4 planches de 1,80 m, 2 de 1 m, 1 de 1,40 m, 2 pentures, 1 loquet ; seuil de 12 pierres de taille ; 3 palançons, 36 baguettes, 36 mottes de torchis, 18 chevilles | idem ; la porte à l'établi | charpentier, menuisier, maçon |
| pan de pignon (`pignon`) | triangle de 580 de base, 360 de haut, 20 d'épaisseur | 3,3 t | poinçon de 3,60 m, 2 potelets de 2,40 m, 15 palançons, 197 baguettes, 200 mottes de torchis, 6 chevilles | en place, sur la sablière haute | charpentier, puis terrassier |
| cloison, 2 m (`cloison`) | 200 × 20 × 260 | 1,7 t | sole de 2 m, 8 palançons, 107 baguettes, 108 mottes de torchis, 2 chevilles | en place, sous l'entrait | terrassier |
| couple de chevrons (`couple`) | 680 de pied en pied, 448 de haut, perches de Ø 12 | 139 kg | 2 perches de 5,60 m, 1 perche de 2,40 m (entrait retroussé), 5 chevilles | à plat au sol, levé sur les sablières | charpentier |
| pan de toit, 2 m sur un versant (`pan-de-toit` ; états rives et milieu) | 200 de long, 565 de pente, 40 de chaume | 534 kg | 54 bottes de chaume, 60 baguettes (30 lattes, 30 tringles), 90 harts | sur le toit, à l'échelle | chaumier |
| faîtage de terre, 2 m (`faitage`) | 200 × 40 × 30 | 394 kg | 4 gerbes, 23 mottes de terre, 4 seaux d'eau, 2 touffes d'iris | sur le toit | chaumier |
| cheminée (`cheminee` ; états entière et sur le toit) | 200 × 120 × 760, âtre de 120 × 60 × 140 | 16,8 t | 294 moellons, 75 pierres de taille, 7 pierres plates, 115 gâchées, 1 poutre de 2 m | en place, sur sa fondation | maçon |

## La nomenclature (plan A, cloisons comprises)

Pour toute la maison :

| Brique | Nombre | Masse | État |
| --- | --- | --- | --- |
| grosse pierre brute (une par moellon, une par pierre de taille) | 1 145 | 63,9 t | geste réel (porter), source à venir |
| moellon | 1 046 | 37 t | geste à venir (dégrossir au têtu) |
| pierre de taille (seuils et âtre) | 99 | 3,1 t | geste à venir (ciseau, maillet) |
| pierre plate (sole, couronnement) | 7 | 0,35 t | geste réel |
| éclats de taille (blocage) | 9,4 t | 9,4 t | geste à venir (déchet de la taille : 23,9 t faites, il en reste) |
| gâchée de mortier de terre | 370 | 11,6 t | geste à venir |
| motte de torchis | 2 314 | 32,4 t | geste à venir |
| motte de terre (en tout, mortier, torchis, sol et faîtage compris) | 3 644 | 52,5 t | geste à venir (creuser) |
| seau d'eau (en tout) | 1 213 | | geste à venir (puiser) |
| botte de chaume | 790 | 6,7 t | geste à venir (peigner) |
| gerbe de paille (en tout : bottes, torchis, faîtage) | 3 168 | 11,9 t | sans geste : la moisson |
| baguette de clayonnage (murs, lattes, tringles) | 2 827 | 2,5 t | geste à venir (parer) ; la vraie source, le taillis, manque |
| palançon | 180 | 0,8 t | **manque** |
| hart | 1 500 | 0,4 t | **manque** |
| cheville | 304 | 48 kg | geste réel (piquet, puis cheville) |
| poutre 20 × 20 de 5,80 m (entraits) | 6 | 1,3 t | geste réel |
| poutre 20 × 20 de 4,80 / 4,60 / 4,20 m (sablières) | 1 / 1 / 13 | 2,3 t | geste réel |
| poutre 20 × 20 de 3,60 / 3,40 m (poinçon, sole) | 1 / 1 | 0,25 t | geste réel |
| poutre 20 × 20 de 2,80 / 2,60 m (décharges, sole) | 2 / 7 | 0,86 t | geste réel |
| poutre 20 × 20 de 2,40 / 2,20 m (huisseries, potelets, soles) | 7 / 1 | 0,68 t | geste réel |
| poutre 20 × 20 de 2 m (poteaux, montants, sablières, manteau) | 31 | 2,2 t | geste réel |
| poutre 20 × 20 de 1,40 / 1,20 / 1 m (sole, linteaux, appuis) | 1 / 3 / 4 | 0,32 t | geste réel |
| perche Ø 12 de 5,60 m (chevrons, faîtage) | 50 | 2,9 t | geste à venir ; la flèche n'en donne que 3,60 m : manque le taillis |
| perche Ø 12 de 4 m et de 2,40 m (faîtage, entraits retroussés) | 1 et 22 | 0,58 t | geste à venir |
| planche 3 × 25 (1,80 / 1,40 / 1 / 0,80 m) | 8 / 2 / 8 / 8 | 0,21 t | geste à venir (fendre au coutre) |
| penture et son gond | 8 | 16 kg | **manque** (forgeron) |
| loquet de bois | 2 | 0,6 kg | **manque** |
| touffe d'iris | 15 | 15 kg | **manque** (facultatif) |

**Masse posée : environ 125 t**, dont 82 t de pierre et de terre pour les murs et le solin.

### Ce que ça représente

- **Arbres.**
  - **46 arbres normaux**, en troncs de 5,80 m, coupés au plus juste : 47 m de chutes, qui iront au feu.
  - **3 gros arbres**, pour **20 quartiers de 2 m** : 22 planches à recouper et 180 palançons.
  - **62 perches de taillis** de 6 m.
  - Environ **2 800 baguettes** et **1 500 harts**. Tirées des houppiers (3 ou 4 branches par arbre), il faudrait abattre une forêt :
    **c'est le taillis de noisetiers qui rend la maison possible.**
  - **304 piquets**, pour autant de chevilles, donc 304 branches.
- **Pierres.**
  - **1 145 grosses pierres brutes** (64 t), qui donnent 1 046 moellons et 99 pierres de taille.
  - La taille laisse **24 t d'éclats** ; le blocage n'en prend que 9,4.
  - 7 pierres plates.
- **Terre.** **3 644 mottes** (52 t) et **1 213 seaux** d'eau : 772 foulées de torchis et 370 gâchées de mortier.
- **Paille.** **3 168 gerbes** (12 t), la paille d'une grande moisson. **Il faut l'acheter** : le jeu n'a pas de champ de blé à
  moissonner.
- **Journées d'un homme seul**, à 9 h par jour.
  - **Environ 3 550 h, soit 394 journées**, plus d'un an à 25 jours par mois.
  - La **pose seule**, si toutes les briques sont achetées (moellons, poutres, perches, bottes, mottes), demande **environ 1 130 h,
    soit 126 journées**.
  - Le reste, c'est chercher et transformer la matière : porter et dégrossir les pierres (environ 860 h), équarrir (220 h), peigner le
    chaume (237 h), fouler le torchis (193 h).
  - Les taux sont des ordres de grandeur (`RATES` de `tools/lib/chaumiere.ts`, à corriger), et `npm run maquette` donne le détail.
  - Au Moyen Âge, une maison pareille se montait en quelques semaines avec l'entraide du village. Pour le jeu, c'est un argument : le
    village qui vend et qui aide.

### Plan B : ce qui change

Les deux plans coûtent presque la même chose : même façade, deux pignons pleins au lieu d'un, d'autres cloisons. Le plan B demande en
plus un poinçon et un pan plein au pignon est, et un chevêtre de 1,20 m (le conduit au faîtage coupe un couple). Il a d'autres soles de
cloison. **Total : 3 550 h, 394 journées** ; mêmes arbres, mêmes pierres.

## L'état de chaque brique

**Existent avec un vrai geste** :
- la grosse pierre brute (prendre, porter) ;
- la pierre plate (posée sur la berge) ;
- la poutre de 20 × 20 à toute longueur jusqu'à 5,80 m (abattre, couper sur la grille, équarrir à la doloire) ;
- la cheville (le piquet taillé au billot, puis la cheville, `whittle-peg`) ;
- le lien de corde ;
- et pour le fendage, la demi-bille et le quartier (le coin et la masse).

**Existent, geste à venir** (`"gesture": "soon"` dans `transforms.json`, appliqué d'un coup par « Transformer » dans ?dieu) :
- le moellon (`dress-rubble`), la pierre de taille (`dress-ashlar`), les éclats ;
- la motte de terre (`dig-clay`), le seau d'eau (`fill-bucket`), le mortier de terre (`mix-mortar`), le torchis (`mix-cob`) ;
- la botte de chaume (`comb-thatch`), la baguette (`trim-rod`) ;
- la planche (`rive-plank`) ;
- la perche (`pole-from-top`, mais 3,60 m au plus : la charpente demande 5,60 m) ;
- la gerbe de paille, qui n'a aucun geste : il n'y a ni champ ni moisson.

**Manquent** (dans l'ordre de la chaîne, de la matière à l'objet fini) :
1. le **jeune arbre de taillis** (la source : perches longues, baguettes, harts) ;
2. la **hart** ;
3. le **palançon** ;
4. la **dame**, pour damer le sol ;
5. l'**échelle**, sans laquelle on ne lève ni ne couvre un toit ;
6. la **tarière**, pour percer les trous des chevilles ;
7. le **bédane**, pour creuser les mortaises ;
8. la **truelle** ;
9. la **batte** et l'**aiguille de chaumier** ;
10. la **penture et son gond** ;
11. le **loquet de bois** ;
12. l'**iris**.

Brouillons de fiche ci-dessous. Chacun ira dans `docs/objets/<clé>.md` au modèle complet avant d'être construit.

### Les prochains objets à créer (brouillons de fiche)

1. **Jeune arbre de taillis** (`coppice-stool`, objet du monde, ne se prend pas).
   - Une cépée de noisetier (ou de châtaignier) recépée tous les 7 ans : une souche basse d'où montent 8 à 15 brins.
   - Dimensions : 250 × 250 × 650, une seule vue (`round`).
   - Masse : aucune (il ne se déplace pas).
   - Récolte (`harvest`, la hachette ou la cognée) : des **perches** de Ø 12 et 5,60 à 6 m (le diamètre `pole` de `wood.json`, une
     longueur nouvelle), des **baguettes** de 2 m, des verges pour les harts. Il repousse (attend le temps du jeu).
   - Métier : bûcheron. C'est la brique qui débloque la charpente et le clayonnage : ce sera un **lieu** (un taillis près du village)
     plus qu'un objet.
2. **Hart** (`withy`, possédable, une main).
   - Une verge de noisetier de 150 × Ø 1,5, tordue sur elle-même pour devenir souple, et nouée en lien : elle lie les lattes aux
     chevrons, les tringles du chaume.
   - Masse : bois vert, environ 0,25 kg. Vues `four`, `lying` ; en tas.
   - Origine : le taillis, puis tordre (geste à venir).
   - Métier : bûcheron. Le lien de corde ferait le travail, mais il en faut 1 500 : la corde reste pour les fagots.
3. **Palançon** (`lath`, possédable, une main).
   - Une latte fendue de 200 × 6 × 4 (chêne ou châtaignier), aux bouts amincis pour entrer dans la rainure des sablières.
   - Masse : 200 × 6 × 4 × 900 kg/m³, soit **4,3 kg**. Vues `four`, `lying` ; en tas de rangées (comme la planche).
   - Origine : fendu au coutre et au maillet dans un **quartier de 2 m**, 12 par quartier (transformation « fendre des palançons »,
     poste : chevalet de fendeur).
   - Métier : fendeur. Peut-être une forme de la pièce de bois (`shape: "lath"`) plutôt qu'une clé : à décider.
4. **Dame** (`tamper`, outil, deux mains).
   - Un billot de Ø 25 × 40 et un manche de 120.
   - Masse **8 kg**. Origine : une bille de l'arbre normal et une branche, chevillées. Métier : charpentier.
   - Geste : Espace sur le sol meuble, pour le damer (le sol de terre battue, plus tard les chemins).
5. **Échelle** (`ladder`, objet du monde à prendre, deux mains).
   - Deux montants de perche de 400 et 10 barreaux de 40, chevillés : 400 × 50 × 8.
   - Masse environ **20 kg**. Posée contre un mur, elle donne accès en hauteur (le bac à sable n'en a pas besoin ; un chantier guidé,
     si).
   - Métier : charpentier.
6. **Tarière** (`auger`, outil). Une mèche de fer de 40 en cuiller, une poignée de bois en T de 40. Masse **1,5 kg**. Métier :
   forgeron. Pour les trous des chevilles (304) et les rainures des palançons.
7. **Bédane** (`mortise-chisel`, outil). Un ciseau de fer de 30 × 3 × 2. **0,4 kg**. Avec le maillet (existe) : les mortaises.
   Métier : forgeron.
8. **Truelle** (`trowel`, outil). Une lame de 25 × 12, un manche. **0,5 kg**. Pour le mortier ; le torchis se pose à la main. Métier :
   forgeron.
9. **Batte et aiguille de chaumier** (`thatch-beater`, `thatch-needle`, outils). La batte : une palette de bois de 40 × 20 × 4 à
   manche, rainurée, pour taper les bottes en place, **1,2 kg**, menuisier. L'aiguille : une broche de 70 cm, pour passer les harts,
   **0,5 kg**, forgeron.
10. **Penture et gond** (`strap-hinge`, possédable). La penture : une bande de fer de 50 × 5 × 0,8 clouée sur le vantail ; le gond, un
    piton de 15 planté dans le poteau. **2 kg** la paire. Métier : forgeron. **Autre choix** : la porte à pivot (un tourillon taillé
    dans le montant du vantail, tournant dans un trou du seuil et du linteau), sans fer.
11. **Loquet de bois** (`latch`, possédable). Une clenche de 30 × 5 × 3 et son mentonnet. **0,3 kg**. Taillé par la mère, la
    menuisière de la maison.
12. **Iris** (`iris`, plante, possédable). Une touffe de 30 × 30 × 50, **1 kg**, arrachée au bord de l'étang. Facultatif : le faîtage
    tient sans, moins longtemps.

Il manque aussi trois **gestes**, plus que des objets :
- dresser une poutre en hauteur avec la mère : la règle de l'aide existe (`help` de `systems/site.ts`) ;
- tresser, enduire et couvrir : chacun une transformation sur une place ;
- **la moisson**, d'où vient la paille.

## Deux plans intérieurs

L'intérieur fait **13,60 × 5,60 m**. Les deux plans gardent les mêmes travées et les mêmes entraits ; les cloisons s'appuient sous
les entraits (x 430 et 830). Les meubles sont à leurs dimensions réelles : la table, le lit et la paillasse de `props.json`, l'établi et
la planche de cuisine à 2 m (l'audit des tailles). Voir `maison-plans.png`.

### Plan A : la salle au pignon (trois pièces en enfilade)

- **Salle commune et cuisine** (x 840 à 1400, 31 m²) : l'âtre au pignon est, la planche de cuisine au nord près du feu, la table et
  ses bancs au milieu, sous la fenêtre sud, le lit de la mère au sud-est contre l'âtre, un coffre. La porte d'entrée y ouvre.
- **Atelier de la mère** (x 440 à 820, 21 m²) : l'établi sous la fenêtre sud, le billot, le bois à sculpter et les outils au nord.
  Passage d'un mètre vers la salle.
- **Réserve** (nord-ouest, 12 m²) : tonneau, jarres, sacs, étagère, la corde, la masse et le coin. La porte de derrière mène au jardin
  et au tas de bois.
- **Cagibi de Xéros** (sud-ouest, 5 m²) : sa paillasse, son coffre ; il dort et sauvegarde là. Le passage (3 m²) le relie à la
  réserve et à l'atelier.
- **Raisons.**
  - C'est la disposition la plus courante d'une longère.
  - Le conduit sort par la pointe du pignon, sans traverser le chaume.
  - La mère dort à la place la plus chaude.
  - Les copeaux sont loin du feu.
  - Xéros a un coin à lui, contre les outils.
  - Le début de la partie (le réveil au cagibi, la réserve et ses outils, la planchette sur la table) se retrouve tel quel.

### Plan B : la salle au milieu (l'âtre au cœur de la maison)

- **Salle commune et cuisine** (x 40 à 700, 37 m²) : l'âtre au milieu de la maison, ouvert vers l'ouest, la planche de cuisine,
  la table, le lit de la mère au sud-ouest. L'**alcôve de Xéros** au nord-ouest, fermée d'un rideau, et son coffre : il dort et
  sauvegarde là. La porte d'entrée, à l'ouest de la façade.
- Derrière la cheminée, une cloison à deux passages ; puis, à l'est, l'**atelier** (sud, 16 m², au chaud contre le dos de l'âtre,
  avec la lumière du sud) et la **réserve** (nord, 15 m², au frais, la porte du jardin).
- **Raisons.**
  - Toute la vie se tient dans la pièce chaude, comme dans la plupart des maisons paysannes.
  - Le conduit sort au faîtage, là où le chaume craint le moins le feu.
  - Le dos de la cheminée chauffe l'atelier : c'est ce que faisait le poêle du plan validé, qu'aucun des deux plans ne garde (il
    vient du nord-est de l'Europe, peu probable dans une chaumière).
  - Les deux pignons sont pleins.
- **Ce que ce plan coûte** : la façade de `maison-couches.png` est celle du plan A. Avec le plan B, la porte passe à l'ouest et la
  cheminée sort au milieu du toit.

## Mes choix (là où la demande ne tranchait pas)

1. **Solin de 60 cm d'épaisseur**, pour la grille et pour l'entrait d'un seul arbre (voir plus haut). 40 cm hors sol, 40 enterrés.
2. **Travées de 2 m** sur les murs longs (la dernière de 1,80 m), **1,80, 2,20 et 1,80 m** aux pignons.
3. **Hauteur sous sablière de 2,40 m**, et un **toit à 50°** ; l'avant-toit à 2 m au-dessus du sol intérieur.
4. **Charpente à couples de perches** tous les 60 cm, avec entraits retroussés, sans panne ; entraits de 5,80 m tous les 2 m.
5. **Lattes et tringles en baguettes** (la baguette de 2 m existe), liées de harts (qui manquent).
6. **Faîtage de terre planté d'iris**, à la normande.
7. **Une porte de derrière** au nord, que CONCEPTION prévoyait (plan validé : « une porte de derrière vers le jardin »).
8. **Fenêtres au sud seulement**, 80 × 60, sans vitre, à volet.
9. **Seuils en pierre de taille** sur le solin abaissé, plutôt qu'une sablière basse continue sous la porte (pas de seuil haut à
   enjamber).
10. **Cheminée en pierre** comme demandé, avec un manteau en bois, comme les âtres paysans (la poutre au-dessus du feu, assez haut).
11. **Pas de grenier ni de plancher** : la maison est ouverte jusqu'au chaume, comme la demande le laissait entendre. Un grenier
    (solives, plancher, échelle) serait un chantier de plus.
12. **Dessin des éléments** :
    - même projection que l'abri (x, y − z), pièces `ground` (gabarit H + D), pour que tout s'assemble à sa place réelle ;
    - le bois dessiné à l'épaisseur de la pièce de bois du jeu (8 px pour 20 cm : règle D étendue), donc des murs de 8 px ;
    - les poteaux et sablières tirés de `composeWood`, les vraies pièces, en bois équarri frais ; les planches en bois grisé.
13. **Les propositions ne sont pas dans le jeu** : `art/proposals/` n'est pas déclaré dans `art/index.ts`. C'est un écart voulu à
    la règle « un nouveau sprite se déclare dans art/index.ts », pour que ce run ne change pas le jeu.

## Les choix à faire par Grégoire

1. **Le plan intérieur** : A (salle au pignon, trois pièces en enfilade) ou B (salle au milieu, l'âtre au cœur) ?
2. **L'emprise** : garder 14,40 × 6,40 m (9 × 4 cases) avec un solin de 60, ou 14,40 × 6 m avec un solin de 40 ? À 6 m de large, il
   faudrait aussi un arbre plus haut pour l'entrait (6 m).
3. **La source des perches et des baguettes** : un **taillis** (un lieu, des cépées qui repoussent), ou des arbres normaux plus
   jeunes ? Sans l'un ou l'autre, la charpente et le clayonnage ne se font pas.
4. **Le fer** : des pentures et des gonds (le forgeron, le village), ou des portes à pivot sans fer ?
5. **Acheter ou faire** : 394 journées seul, 126 si on achète les briques. Quelles briques Xéros fait-il lui-même, lesquelles
   achète-t-il au village (la paille, au moins, faute de champ) ? Et l'entraide (la corvée du village pour le levage et le chaume) ?
6. **Le bois des colombages** : jaune (bois équarri frais, la vraie pièce du jeu), ou grisé comme l'abri (rampe S A B Q) ? Le
   dessinateur des murs signale que c'est à juger sur la maquette complète.
7. **La cheville** : une par piquet aujourd'hui (`whittle-peg`). Quatre chevilles de 25 cm dans un piquet d'un mètre serait plus juste.
8. **Le palançon** : un nouvel objet (`lath`), ou une nouvelle forme de la pièce de bois (`shape: "lath"`, comme la planche) ?
9. **Les éléments composés** : les garder comme dessins d'un bloc (un pan = une image), ou les composer à la volée à partir des
   pièces, comme les tas de bois ? Voir le plan du bac à sable, choix 4.
10. **Le grenier** : la maison reste-t-elle ouverte jusqu'au chaume ?
