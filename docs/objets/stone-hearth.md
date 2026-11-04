# Âtre (`stone-hearth`)

Décidé le 3 novembre 2026 (retouche de Grégoire, CONCEPTION « La maison de Xéros ») : une cheminée de pierre adossée au mur nord de
la salle commune remplace le foyer central (`hearth`) ; refaite le même jour en **cheminée paysanne où l'on cuisine**, à ses vraies
dimensions (proposition validée par Grégoire : `art/proposals/cheminee-2.ts`, `tools/essai-cheminee.ts`,
`.art-preview/cheminee-2.png`), avec sa retouche : « la hotte descendue à 1,50 m, posée sur le manteau, sans vide derrière ».
L'âtre en est la maçonnerie basse, d'un seul tenant. Les autres pièces : le manteau (la pièce de bois `wood-piece`, poutre de
20 × 20 cm, 2,20 m est-ouest), la [hotte](chimney-hood.md), le [conduit](chimney-flue.md), le [couronnement](chimney-cap.md), le
[pan de chaume percé](thatch-roof-pierced.md).

## Identité
- Clé : `stone-hearth`.
- Nom affiché : « âtre » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier` (comme le foyer) ; son feu animé (`anim: burn`, trois images) ; sa lueur
  (`light`, au milieu du feu : x 22, y 38 de l'image, rayon 160, un peu plus que les 150 de l'âtre d'avant pour une ouverture
  plus large, choisi faute de source) ; pas de `smoke` : la fumée sort par le couronnement.
- Mains : aucune, il ne se prend pas.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.42}` : la boîte de 2,20 × 1,10 × 1,50 m (3,63 m³) ; la pierre : deux jambages de 30 × 110 × 150
(0,99 m³), le contrecœur de 160 × 20 × 150 (0,48 m³), la sole en dalles (0,04 m³), soit 1,51 m³ : 3,7 t de calcaire (2 400 kg/m³).
Il ne se déplace pas.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 220 (est-ouest) × 110 (nord-sud) × 150 cm de haut, contour compris ; boîte. Place dans la maison (cm, en axes) : x 660–880,
  y 30–140 (contre la face intérieure du solin nord), centré sur x = 770 (la place de la maison rebâtie en mode construction,
  sur la grille de 20 cm : 10 cm plus à l'ouest que la proposition).
- Dedans : le contrecœur de moellons, 20 cm, noirci ; deux jambages de moellons de 30 cm, l'angle du devant en pierre de taille ;
  **l'ouverture de 1,60 m de large, 1,50 m de haut, 0,90 m de profond** ; la sole en dalles au ras du sol, la cendre.
- Sources : la proposition validée, d'après le rapport (`~/Code/rpg-game-rapport/RAPPORT.md`, point 12 : une cheminée paysanne
  ouvre de 1,5 à 2,5 m de large, 0,6 à 1 m de profond, 1,4 à 1,8 m sous le manteau, « on entre presque dessous » ; ces fourchettes
  sont de connaissance générale, **non sourcées** dans le rapport ; pour comparer, l'hôtel Jacques Cœur, 2,57 m de large et 1,66 m
  sous le manteau, Viollet-le-Duc, « Cheminée »). Les valeurs exactes (1,60, 1,50, 0,90, jambages de 30, contrecœur de 20) sont
  **choisies faute de source** dans ces fourchettes.
- `ground: true` : la cheminée est faite de pièces posées les unes sur les autres, de profondeurs différentes (le manteau de 30 cm au
  devant, la hotte de 80 derrière lui, le conduit sur la hotte) ; le jeu les pose en (x, y − z), leur profondeur à l'échelle du
  sol : elles tombent au pixel près. Taille à l'écran : 44 × (30 + 22) = **44 × 52 px** ; de côté **22 × 74**.
- Le manteau (z 150–170, y 110–140) et la hotte (z 150–250, y 30–110) se posent dessus côte à côte : le mode construction pose une
  pièce sur le plus haut dessus que recoupe son emprise, et leurs emprises ne se recoupent pas.

## Vues
Quatre (`four`, il a un devant), chacune une planche à l'animation `burn` (le feu ne se voit que de face : r1 à r3 ont trois fois la
même image).
- r0 (de face, 44 × 52) : les jambages, leur angle en pierre de taille, le contrecœur noirci (plus fort au milieu et en haut), le
  dedans des jambages noirci vers le fond, le feu (deux chenets de fer à 90 cm l'un de l'autre, trois bûches de 1,10 m en écorce,
  les flammes jusqu'à 70 cm, qui vacillent), la cendre et ses braises sur la sole ; sur le dessus, l'arase des jambages et l'avaloir
  noirci (le manteau et la hotte posés dessus le couvrent).
- r1, r3 (de côté, 22 × 74) : le flanc d'un jambage, son angle de pierre de taille au devant.
- r2 (de dos, 44 × 52) : le dos du contrecœur et des jambages, en moellons.
- Fantôme : la vue de face en transparence (mode construction).

## La cuisine : les places prévues (rien de dessiné)
- **La crémaillère** : une barre de fer scellée dans le bas de la hotte, au milieu de l'ouverture (x = 780) ; son crochet réglable
  entre 40 et 110 cm au-dessus de la sole, pour pendre le chaudron sur le feu.
- **Les landiers** : deux, à 1 m l'un de l'autre, de part et d'autre du feu, pour porter la broche (ils remplaceront les chenets du
  dessin quand ils seront des objets).
- **Le potager** : un fourneau maçonné à côté de l'âtre (la place seulement, contre le mur nord, à l'est ou à l'ouest de lui).
Rien de cela n'existe encore en données (ni objet, ni poste « âtre » dans transforms.json) : RAPPORT.md point 12.

## Variantes naturelles
Aucune : de la pierre montée, régulière à la mesure du maçon.

## Regroupement
Seul.

## Gestes
- Mode construction : posé au sol, contre le solin nord de la salle (x 660, y 30).
- E : rien encore (on y mettra le bois, comme au foyer).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Bâti par le maçon : moellons de calcaire et mortier de chaux, pierre de taille aux angles des jambages, dalles pour la sole.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Le maçon (`mason`).

## Vérification
- `.art-preview/cheminee-2.png` (`npx tsx tools/essai-cheminee.ts`) : ses trois images et ses vues r1 à r3 au gabarit, Xéros à côté ;
  la cheminée montée de face (le dessous du manteau à 1,50 m, le haut de la hotte à 2,50 m), de côté, le détail x4 ; la maison du
  sud et du nord.
- `.art-preview/stone-hearth.png`, `npm run check`.
- Collisions (`bodies`, posé depuis Tiled) : le contrecœur et les deux jambages, pas l'ouverture. Posé en mode construction, le jeu
  fait de toute son emprise un obstacle (`blocks`, src/world/build.ts).
- En jeu : poser l'âtre en mode construction, le manteau et la hotte dessus (z = 150), regarder qu'ils tombent juste ; le soir, la
  lueur.
