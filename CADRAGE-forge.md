# Chantier « forge » : cadrage

Premier bâtiment du village, essayé en images avant d'être bâti. **Rien ne change dans le jeu** : ce chantier ne produit que ce
cadrage et des planches (`art/proposals/forge*.ts`, `tools/essai-forge*.ts`, images dans `.art-preview/forge-*.png`).

Unités : centimètres, nord en haut ; 5 cm par pixel ; une case = 32 px = 1,60 m. Les coordonnées de carte sont en pixels Tiled
(5 cm) ; les coordonnées du monde, en mètres depuis le coin nord-ouest du monde.

---

## 0. Retour de Grégoire sur l'essai 1 (4 novembre 2026), et l'essai 2

**Validé** : l'emplacement A (la première parcelle des abords au nord de la rue), la taille de l'atelier (la charpente de la grange,
9,60 × 6,80 m, ouverte au sud), ses pièces, son intérieur (version A, `forge-interieur.png`).

**L'atelier seul** : pas de logis pour le forgeron pour l'instant. Sur la parcelle restent l'atelier, l'abri à charbon et à bois, la
place réservée de la fonderie et **le puits**, que je garde : l'auge se vide et se remplit tous les jours, et une forge sans eau à
portée de main n'est pas réaliste (le puits du village est à 100 m). Les sections 2 et 3 décrivent encore le logis tel qu'il était
proposé.

**Le logis est mis de côté pour un autre emplacement.** Grégoire le trouve bien, mais trop proche de la maison de Xéros : il servira
ailleurs. Son plan (section 2 : 8 × 6,40 m, une salle et une chambre, la cheminée de la maison de Xéros, le chaume en 9 m) et ses
images restent dans `art/proposals/` : `art/proposals/forge-logis.ts`, et l'essai 1 dans l'historique de la branche (commit
`20f49a9`, `forge-dehors.png` et `forge-interieur.png` de cet essai).

**Le toit de l'atelier** : les planches sombres sont refusées. Elles se lisent comme de la tôle, et ce serait du bois juste au-dessus
d'un feu de forge. Ce qui est réaliste pour un atelier de forgeron :

| Couverture | Pour | Contre | Ce qu'il faut au jeu |
| --- | --- | --- | --- |
| **Tuiles plates de terre cuite** (recommandé) | ne brûlent pas : c'est la couverture des métiers du feu (forges, fours, boulangeries), souvent imposée par les villes à la fin du Moyen Âge pour cette raison (connaissance générale, **non sourcée**) ; brun-rouge chaud, elle se lit tout de suite comme un toit, et distingue la forge du chaume et des planches des autres bâtiments | il faut un **tuilier** (de l'argile, un four à tuiles), un métier de plus au village ou acheté à la ville ; une tuile plate veut une pente d'environ 45° (la grange est à 37°) ; environ 70 kg/m² | le pan de tuiles (`tile-roof-large`, et son pan percé pour les conduits), la tuile (objet, matière terre cuite), plus tard le tuilier |
| **Bardeaux de chêne fendu** | la chaîne existe déjà en partie (le bardeau, la coutre, le chêne) ; ils sont de la couleur du bois, assez clairs, avec un dessin d'écailles, pas de tôle ; légers | du bois au-dessus du feu : les escarbilles du conduit, même si le conduit dépasse le faîte ; il faut d'abord **les lattes**, qui n'existent pas encore | le pan de bardeaux (`shingle-roof-large`), les lattes |
| **Lauzes de calcaire** (troisième idée, sur la planche) | ne brûlent pas ; c'est **la pierre commune du jeu** (le calcaire), taillée par le carrier, sans métier nouveau | très lourdes (300 kg/m² et plus) : il faut une charpente bien plus forte que celle de la grange ; elles sont propres à certains pays de causses, et grisent le bâtiment | le pan de lauzes, la lauze ; une charpente renforcée |

**Ma recommandation : les tuiles plates.** C'est le plus réaliste pour un atelier où l'on fait du feu toute la journée, et c'est le
plus lisible à l'écran. Pour l'essai 2, la charpente de la grange garde ses 37°. Le jour où on la bâtit, il faudra choisir : la
relever à 45° (des poinçons plus longs, le faîte vers 6,80 m) ou garder 37° avec plus de recouvrement (question 13).

**Le forgeron est à refaire** : il faisait un peu féminin et avait de grosses joues. Il faut un beau gosse, très masculin : une
mâchoire carrée et marquée, des joues creuses, un cou épais, des épaules et des bras nettement plus larges que ceux de Xéros, et des
muscles qui se voient sous le tablier de cuir, sans rien dessous. Il garde ses cheveux longs et blonds. Il faut refaire les trois
variantes (lâchés, attachés, barbe courte) et le portrait.

**Les planches de l'essai 2** : `.art-preview/forge-dehors.png` (l'atelier seul sur la rue, en x2 avec Xéros, dans chacune des
couvertures, tuiles d'abord) et `.art-preview/forge-forgeron.png`.

---

## 1. L'emplacement

### Ce qu'il y a sur les cartes

- **La maison de Xéros** : le rectangle `Plan` `maison-xeros` de `ferme.tmj`, (3080, 1520), 277 × 150 px ; son milieu est au
  point du monde **(360,9 m ; 279,8 m)**.
- **Le chemin** : deux rangées de terre (`path`, rangées 65 et 66 des zones), tout droit d'ouest en est, de la ferme à travers
  toute la zone `chemin`, jusqu'à la colonne 31 de la zone `village` (**649,6 m**). Là, il devient la rue de terre battue
  (`yard`, rangées 65 à 67), qui mène à la place.
- **La place** : le rond de terre battue des colonnes 93 à 113 de `village.tmj`, milieu vers **(765,6 m ; 306,4 m)**, avec ses huit
  étals.
- **Les abords** : six parcelles `Parcel` « maison des abords » (`use: cottage`) de 480 × 480 px (**24 × 24 m**), trois au nord
  de la rue, trois au sud. Les deux premières en venant de l'ouest sont en x 1024–1504 de `village.tmj` :
  - **nord-ouest** : y 1536–2016, soit les colonnes 32 à 46 et les rangées 48 à 62 ; **aucun objet dedans** (les arbres les plus
    proches, un arbre normal et un têtard, sont à 3 et 6 m à l'ouest de sa limite) ; prairie et herbe ;
  - **sud-ouest** : y 2240–2720 ; **quatre arbres dedans** (deux gros arbres, un normal, un têtard), qu'il faudrait abattre.
- Entre le bord sud de la parcelle nord-ouest et la rue, une rangée d'herbe (3,20 m).

### Deux emplacements possibles

| | **A. La première parcelle, au nord de la rue** (recommandé) | **B. Dans le pré, avant la rue** |
| --- | --- | --- |
| Où | parcelle nord-ouest des abords, `village.tmj` x 1024–1504, y 1536–2016 (colonnes 32–46, rangées 48–62) | au nord du chemin, juste avant qu'il devienne la rue : `village.tmj` x 300–1000, y 1500–2016 (colonnes 9–31, rangées 47–62), un rectangle `Parcel` à créer |
| Milieu, dans le monde | (663,2 m ; 288,8 m) | (632,5 m ; 290 m) |
| Jusqu'à la maison de Xéros | **302 m** (2 min 30 s à pied, à 2 m/s) | **272 m** (2 min 15 s) |
| Jusqu'à la place | **104 m** (50 s) | **134 m** (1 min 05 s) |
| Ce qu'on voit en arrivant du chemin | la première maison, du côté gauche de la rue, au moment où le chemin devient rue | le premier bâtiment, encore dans les prés, au coude où le chemin devient rue, comme une porte du village |
| Ce qu'il faut changer | rien sur la carte, sauf poser le rectangle `Plan` dans la parcelle | abattre ou déplacer six ou sept arbres (`normal-tree` en (318, 1714), (612, 1712), (723, 1818), (888, 1842), `big-tree` en (647, 1546) et (811, 1993), un têtard), tracer une parcelle hors de la grille des abords, prendre une partie du pré de fauche |
| Pour | dans le village, sur la grille des parcelles déjà prévues ; la parcelle est vide ; 24 × 24 m suffisent pour l'atelier, le logis, la cour, l'abri à charbon et la place de la fonderie | à l'écart des maisons, comme beaucoup de forges (le feu, le bruit) ; on n'est pas tenu par les 24 m de la parcelle |
| Contre | la forge est entre deux maisons à venir (celle d'à côté à 3 m de la limite est) | il faut toucher au paysage né de la tempête et des esquisses ; le premier bâtiment n'est pas dans le village |

**Recommandation : A.** Les deux sont bien plus près du village que de chez Xéros (104 m contre 302 m). A ne touche à rien de ce
qui existe, est déjà réservé aux maisons des abords, et met la forge à l'entrée même de la rue. La grande forge ouverte au sud
regarde la rue, et comme le jeu montre les faces sud, c'est son feu qu'on voit en passant.

---

## 2. Le bâtiment

### Ce qu'est une forge de village (le réel)

Une forge rurale est un **atelier ouvert sur la rue** ou sur une cour, sombre au fond, parce que le forgeron juge la chaleur du fer à
sa couleur. Le foyer est une **forge maçonnée** à hauteur de hanche, avec une **hotte** et un **conduit**. Un **grand soufflet** de
cuir à deux vents est pendu à côté et se manœuvre par une perche. L'**enclume** est sur un **billot** de chêne enterré, à un pas et
demi du feu. L'**auge** d'eau est sous la main pour tremper le fer. Il y a aussi l'**établi** et son **étau**, les **pinces** et
les **marteaux** au râtelier, la **meule**, les **barres de fer**, la **ferraille** à refondre au feu de forge, le **charbon de bois**
au sec, et du bois. Le logis est à part, et le feu loin du chaume. Ces usages sont de connaissance générale, **non sourcés**. Les
mesures ci-dessous sont **choisies** dans les fourchettes courantes.

### Ce que je recommande (version A, « la cour »)

Sur la parcelle de 24 × 24 m (coordonnées en cm depuis son coin nord-ouest), deux bâtiments séparés par une cour :

- **L'atelier**, au sud, sur la rue : **la charpente de la grange**, reprise telle quelle. C'est le plan `grange.json` : 9,60 ×
  6,80 m au sol, axes des poteaux 8,40 × 5,60 m, trois travées de 2,80 m sur deux, poteaux de 3 m sur dalles, sablières, entraits,
  poinçons, faîtage, deux grands pans de toit en planches, faîte à 6 m. Ce qui change :
  - **le mur sud est ouvert** sur ses trois travées : ni bardage ni porte charretière. C'est un **abri ouvert**, et le jeu efface
    son toit quand Xéros entre dessous. On passe de la rue à l'enclume sans fondu ;
  - le bardage reste à l'ouest (contre le vent dominant, celui de la tempête), au nord et à l'est ;
  - **le bois vieux**, gris : une forge de vingt ans ;
  - le pan nord est **percé** pour le conduit de la forge et celui du four.
  - Place sur la parcelle : x 300–1260, y 1500–2180. Il reste 2,20 m de cour de devant jusqu'à la limite sud, plus 3,20 m d'herbe
    jusqu'à la rue.
- **Le logis**, au nord, derrière une cour de 5 m : **une maison de Xéros raccourcie**, faite des mêmes pièces : solin, pan de bois,
  remplissage chaulé, chaume, pignons chaulés. Axes **8,00 × 6,40 m** (cinq travées de 1,60 m sur quatre), environ **42 m²**
  dedans (la maison de Xéros en a 80).
  - Place sur la parcelle : x 300–1100 (axes), y 250–890.
  - Deux pièces : **la salle** (x 0–480, 4,80 × 6,40 m) et **la chambre** (x 480–800, 3,20 × 6,40 m), séparées par une cloison à
    porte intérieure.
  - Dans la salle : la cheminée de la maison de Xéros (âtre, manteau, hotte, conduit, couronnement), contre le mur nord ; la
    table et le banc ; deux tabourets ; la jarre, le tonneau, le seau d'eau ; un coffre.
  - Dans la chambre : le lit (2 m, pour un homme de 1,90 m), un coffre, une caisse.
  - La porte d'entrée est au sud, sur la cour. Fenêtres : deux au sud, une au nord, une à l'est.
- **La cour** (x 300–1260, y 920–1500, terre battue) : **le puits** (le puits du jeu, `well`). L'auge s'emplit à 6 m.
- **L'abri à charbon et à bois**, à l'est de l'atelier : **l'abri à bois du jeu** (`plans.json`, 3,05 × 3,55 m, appentis de
  planches), en x 1400–1705, y 1600–1955. On y range les sacs de charbon et le bois du four.
- **La place de la fonderie**, réservée et vide pour l'instant : x 1500–2300, y 250–1000 (8 × 7,5 m), au nord-est, à 4 m du logis.
  Le vent d'ouest emporte sa fumée loin du chaume (voir la section 4).

### Le plan annoté (version A)

```
parcelle 24 × 24 m (cm depuis son coin nord-ouest), nord en haut
 x: 0      300                      1100  1260  1500                   2300  2400
y=0 +----------------------------------------------------------------------+
    |                                                                      |
 250|      P----P----[F]P----P----P----P            .  .  .  .  .  .  .  . |
    |      |  SALLE             | CHAMBRE|         .  PLACE DE LA      .   |
    |      | [âtre+hotte] table |  lit   [F]        .  FONDERIE        .   |
    |      |  banc      tonneau [p]      |          .  (réservée)      .   |
    |      |  jarre  tabourets  | coffre |          .  8 × 7,5 m       .   |
 890|      P--[F]--P--[porte]---P--[F]---P            .  .  .  .  .  .  .  . |
    |                                                                      |
    |            COUR (terre battue)        (puits)                        |
    |                                                                      |
1500|      +=====bardage nord===========================+                   |
    |      |[soufflet] [FORGE ][auge]  [FOUR]    établi|  +--abri à----+   |
    |      |[ N-S    ] [hotte ]                  +étau |  | charbon    |   |
    |      | râtelier                            barres|  | et bois    |   |
    |      | coffre à      (enclume)              meule|  +------------+   |
    |      | charbon        sur billot      ferraille  |                   |
2180|      P - - - - - - - P - - - - - - - P - - - - - P   (ouvert au sud)   |
    |               cour de devant (terre battue)                          |
2400+----------------------------------------------------------------------+
                         herbe 3,20 m, puis LA RUE (vers la place, à l'est)
```

Dans l'atelier (coordonnées du plan de la grange : x 0–960, y 0–680 ; poteaux en x 40, 320, 600, 880, y 40, 320, 600) :

| Pièce | Place (x, y, cm) | Dimensions (l × p × h) | Pourquoi là |
| --- | --- | --- | --- |
| **Forge maçonnée** | x 160–380, y 45–155, contre le bardage nord | 220 × 110 × 80 (table) ; contrecœur et joues jusqu'à 160 | sa face de feu regarde le sud : la rue la voit ; la même emprise que l'âtre de la maison, pour poser dessus la **hotte** (220 × 80, à 1,60 m) et le **conduit** du jeu |
| **Soufflet** double, sur son bâti | x 45–145, y 60–240, contre le bardage ouest, nord-sud | 75 × 180, dessus à 110 ; perche de 2,50 m | sa buse entre dans la joue ouest de la forge ; la perche passe au-dessus et revient au devant de la forge, à la main du forgeron |
| **Auge** de pierre | x 395–515, y 70–120 | 120 × 50 × 50 | à droite du feu, sous la main |
| **Enclume** sur son **billot** | milieu x 270, y 300 | enclume 70 × 20 × 30 sur un billot Ø 60 × 55 : dessus à 85 | un pas et demi du feu ; le forgeron tourne sur lui-même |
| **Râtelier** à pinces et marteaux | x 45–60, y 270–390, sur le bardage ouest | 15 × 120 × 100 | entre le soufflet et le coffre à charbon, à portée de l'enclume |
| **Coffre à charbon** | x 45–145, y 410–510 | 100 × 100 × 70 | la réserve du jour, près du feu ; le gros stock est dans l'abri |
| **Four** | x 560–700, y 45–185, contre le bardage nord | 140 × 140 × 130, voûté, bouche au sud | dans la travée du milieu, loin de l'établi ; son petit conduit perce le pan nord (voir la question 4) |
| **Établi** et **étau** | x 850–920, y 120–440, contre le bardage est, nord-sud | l'établi du jeu, 320 × 70 × 85 ; l'étau dessus, au bout sud | la lumière du sud tombe sur l'étau |
| **Râtelier à barres** | x 880–920, y 460–620, contre le bardage est | 40 × 160 × 120 | les barres de fer debout, triées par épaisseur |
| **Meule** à aiguiser | milieu x 760, y 520 | Ø 80 sur un bâti de 100 × 50 × 90 | près de l'ouverture, pour la lumière |
| **Ferraille** | x 780–860, y 560–620 | une caisse du jeu, pleine | à refondre au feu de forge, ou à vendre |

Le passage reste libre : 2 m entre l'enclume et le four, 1,60 m devant la forge, toute la largeur du devant ouverte.

### Les trois versions vues de dehors (planche `forge-dehors.png`)

- **A, « la cour »** (recommandée) : décrite ci-dessus. L'atelier ouvert au sud sur la rue, le logis derrière, une cour entre les
  deux.
- **B, « en long »** : l'atelier et le logis côte à côte, face à la rue, sous deux toits. L'atelier (la charpente de la grange,
  ouverte au sud) est à l'ouest, côté chemin ; le logis à l'est. Entre les deux, un **mur de pierre mitoyen** coupe-feu, contre
  lequel s'adosse la forge. Façade de 18,50 m.
- **C, « l'appentis »** : le logis seul face à la rue, et un **appentis ouvert** (poteaux, pan de planches à une pente)
  accolé à son pignon ouest. La forge est adossée au pignon, qui est **maçonné en pierre** sur ce côté. C'est la forge la plus
  petite : environ 6 × 4 m sous l'appentis.

Pourquoi A : le feu est à 5 m du chaume, alors que B et C l'adossent au logis. A a la plus grande forge, et elle réutilise toute
la grange. La cour sert aussi à la fonderie à venir. Mais B est la plus belle façade sur la rue, et C la plus simple et la plus
paysanne.

---

## 3. Les pièces

### Ce qui existe et se réutilise

| Où | Pièces existantes |
| --- | --- |
| Atelier (le plan `grange.json`) | `slab` (dalles), `wood-piece` (poteaux de 3 m dressés, sablières, entraits, poinçons, faîtage ; entures, tenons et mortaises, mi-bois), `board-wall` (bardage), `board-gable` (pignons), `plank-roof-large` (le pan sud), bois `old` |
| Feu de la forge | `chimney-hood` (la hotte de la maison de Xéros, 220 × 80 × 100), `chimney-flue` (conduit, tronçons d'1 m), `chimney-cap` (couronnement) |
| Mobilier de l'atelier | `workbench` (établi), `chopping-block` (billot, sous l'enclume : mais Ø 55 × 45, un peu bas, voir les pièces nouvelles), `crate` (caisse de ferraille), `bucket-water`, `barrel`, `sack` |
| Logis (la maison de Xéros) | `rough-sill-wall`, `narrow-sill-wall`, `threshold-stone`, `inner-threshold-stone`, poteaux, traverses et sablières en `wood-piece`, `staves-*`, `wattle-*`, `daub-*`, `lime-*` (remplissages, jambages, têtes de baie, fenêtres), `door-frame`, `cottage-door`, `inner-door`, `plank-shutter`, `lime-gable`, `lime-gable-smoke`, `stone-hearth`, la poutre du manteau, `chimney-hood`, `chimney-flue`, `chimney-cap` |
| Meubles du logis | `table`, `bench`, `stool`, `bed`, `chest`, `jar`, `barrel`, `bucket-water`, `crate`, `lantern`, `candle` |
| Cour, abords | `well` (puits), le plan de l'abri à bois (`plans.json`), `hay-bale` (pour un cheval qu'on ferre), `Pile` de pièces de bois |
| Matières, métiers | `iron-ore` (minerai de fer, déjà un objet), `clay-clod` (motte de terre : les moules), `rough-stone`, `rubble-stone` ; le métier `smith` (forgeron) existe déjà dans les fiches des outils de fer |

### Ce qui est nouveau (à dessiner, chacun avec sa fiche)

| Pièce | Clé proposée | Sorte | Dimensions | Remarque |
| --- | --- | --- | --- | --- |
| Forge maçonnée | `forge-hearth` | meuble (pierre) | 220 × 110 × 160 (table à 80) | moellons, dessus en terre battue et charbon, le creuset du feu, la tuyère dans la joue ouest ; son feu animé et sa lueur, comme l'âtre ; vues `four` |
| Soufflet de forge | `forge-bellows` | meuble (bois, cuir) | 75 × 180 × 110 | deux planches en poire, le cuir plissé, la buse de fer, le bâti, la perche ; un geste plus tard ; vues `four` |
| Enclume | `anvil` | objet du monde (fer) | 70 × 20 × 30 | table, bigorne, pied ; environ 80 kg : Xéros ne la porte pas, le forgeron oui ; vues `symmetric` |
| Billot d'enclume | `anvil-block` | meuble (bois) | Ø 60 × 55 | un tronçon du gros ; ou le `chopping-block` haussé (question 6) |
| Auge | `quench-trough` | meuble (pierre) | 120 × 50 × 50 | un bloc de calcaire creusé, l'eau noire ; vues `symmetric` |
| Étau | `vise` | sur l'établi | 20 × 30 × 40 | un étau à pied (la jambe jusqu'au sol, en fer) |
| Râtelier à outils | `tool-rack` | meuble (bois) | 15 × 120 × 100 | pinces et marteaux pendus ; vues `four` |
| Pinces, marteaux | `tongs`, `smith-hammer`, `sledge` | outils (`items.json`) | pinces 50 cm, marteau 1 kg, masse de frappe 5 kg | leurs dessins couchés, leurs icônes ; plus tard en main |
| Râtelier à barres | `bar-rack` | meuble (bois, fer) | 40 × 160 × 120 | les barres debout ; vues `four` |
| Barre de fer | `iron-bar` | objet (`items.json`), matière `iron` | 120 × 3 × 3 cm | 8,5 kg ; un tas compté plus tard |
| Ferraille | `scrap-iron` | objet, matière `iron` | un tas, ou la caisse pleine (`crate` en `variants`) | |
| Charbon de bois | `charcoal-sack`, matière `charcoal` | objet, matière | sac de 50 × 40 × 70, 20 kg | densité apparente de 200 à 250 kg/m³ |
| Coffre à charbon | `charcoal-bin` | meuble (bois) | 100 × 100 × 70 | planches, le charbon à ras ; vues `four` |
| Four | `forge-oven` | meuble (pierre, terre) | 140 × 140 × 130 | voûte de terre sur un socle de pierre, bouche au sud, sa porte de tôle ; son conduit (le `chimney-flue` du jeu ?) |
| Meule | `grindstone` | meuble | Ø 80, bâti 100 × 50 × 90 | grès, auge d'eau dessous, manivelle |
| Pan de toit percé | `plank-roof-large-pierced` | élément | celui du jeu | comme `thatch-roof-pierced` : le trou à la place du conduit |
| Chaume court | `thatch-roof` en 9 m, `earth-ridge` en 9 m | éléments | 900 de long au lieu de 1 380 | **les mêmes dessins**, autre longueur : `variants` ou une longueur posée (question 7) |
| Le forgeron | sprite et `portrait-<nom>-64` | personnage | 1,90 m : 38 px de haut, 16 px de large | grand, très musclé, cheveux longs blonds, tête carrée, grosse mâchoire, tablier de cuir sur le torse nu, braies, bottes |

Pas d'étal : c'est le frère qui vend. Quand on fera les huit boutiques, un des étals de la place pourra être celui du frère
(clous, fers, outils), avec les objets de la forge.

---

## 4. Plus tard : fondre et mouler

Ce n'est pas pour maintenant. Il faut seulement réserver la place et ne rien poser dessus.

- **Ce que le réel permet** : au village, le fer **ne se fond pas**. Il faudrait un haut fourneau, qui n'est pas d'un village reculé.
  On le **réduit** : le minerai (`iron-ore`) et le charbon brûlent ensemble dans un **bas fourneau**, et le fer en sort en **loupe**
  spongieuse qu'on forge à chaud pour en chasser la scorie. Ce qui **se fond et se moule**, c'est le **bronze**, le **cuivre**,
  l'**étain** et le **plomb** (chaudrons, cloches, boucles, poids), au **creuset**.
- **Ce qu'il faut réserver** : la place de la fonderie (8 × 7,5 m au nord-est de la parcelle, à 4 m au moins du logis, sous le
  vent), avec plus tard :
  - le **bas fourneau** : une cheminée de terre crue sur un socle de pierre, 1,20 à 1,50 m de haut, 30 cm de vide dedans, sa
    tuyère et **son soufflet** (un second soufflet, ou celui de la forge porté là), une fosse devant pour la scorie ;
  - l'**aire de grillage** du minerai (un feu à plat) et le **tas de minerai** ;
  - le **four à creuset** : une fosse maçonnée de 50 à 60 cm, son couvercle, ses creusets de terre ;
  - la **fosse de coulée**, creusée dans le sol, où l'on enterre les grands moules dans le sable ;
  - un **banc à mouler** et la terre à moules (argile, sable, crottin : la `clay-clod` existe) ;
  - le **ferrier**, un tas de scories derrière ;
  - un **appentis** au-dessus de tout cela, ouvert, en planches, assez haut pour les flammes (poteaux de 3 m, comme l'atelier).
- **Ce qu'il faudra au contenu** : les matières `iron` (7 870 kg/m³), `charcoal`, `slag`, `bronze`, `copper`, `tin` ; les objets
  loupe, creuset, moule, lingot ; les transformations « réduire le minerai » (poste : le bas fourneau), « cingler la loupe »
  (poste : la forge), « fondre et couler » (poste : le four à creuset). Et le charbon : la meule de charbonnier, dans la forêt,
  est un métier à part (le charbonnier), d'où vient le charbon de la forge.
- **Le four de l'atelier** n'est pas ce four-là. Je le propose comme **four à chauffer** les grandes pièces et à recuire (question 4).

---

## 5. Le forgeron

Grand (1,90 m, **38 px** contre 32 pour Xéros), très musclé (**16 px** de large au lieu de 12 : les épaules et les bras), longs
cheveux blonds tombant sur les épaules, attachés ou non, tête très carrée, grosse mâchoire, barbe rasée ou courte (question 9).
Torse et bras nus sous un **tablier de cuir** qui va de la poitrine aux genoux, attaché au cou et dans le dos. Braies de laine
brune, bottes ou chausses de cuir. Les avant-bras marqués de petites brûlures (au plus un pixel). Planche : de face et de profil, x4,
à côté de Xéros.

---

## 6. Les planches

Toutes par le sous-agent pixel-artist, hors jeu (`art/proposals/forge*.ts`, `tools/essai-forge*.ts`) :

1. `.art-preview/forge-dehors.png` : les trois versions sur la rue, chacune dans la vue de départ du jeu (palier 3 : 427 × 240 px
   du monde, environ 21 × 12 m), en x2, Xéros dans la rue ;
2. `.art-preview/forge-interieur.png` : la version A, toits effacés, en x2 (l'atelier et le logis) ;
   `.art-preview/forge-detail.png` : la forge, l'enclume et le soufflet, en x4 ;
3. `.art-preview/forge-forgeron.png` : le forgeron, de face et de profil, en x4, à côté de Xéros ;
4. `.art-preview/forge-ensemble.png` : la maison de Xéros, le chemin, la forge, l'entrée du village et la place.

---

## 7. Les questions (chacune avec ma recommandation)

1. **L'emplacement** : A (la première parcelle au nord de la rue) ou B (dans le pré, avant la rue) ? *Recommandé : A.*
2. **La disposition** : A « la cour » (logis derrière), B « en long » (côte à côte sur la rue) ou C « l'appentis » (contre le
   pignon du logis) ? *Recommandé : A.*
3. **L'atelier reprend la charpente de la grange** (9,60 × 6,80 m, faîte à 6 m, bois vieux), ouvert au sud : d'accord, ou un
   atelier plus petit, à faire (par exemple 6,40 × 4,80 m, avec une charpente nouvelle) ? *Recommandé : la grange, qui ne demande
   aucune pièce de charpente nouvelle.*
4. **« Le four »** : que voulais-tu dire ? (a) un **four à chauffer et à recuire** dans l'atelier, maçonné, voûté (ce que je
   dessine) ; (b) le **four à pain** du logis ; (c) le **bas fourneau** de la fonderie, déjà maintenant ? *Recommandé : (a), et le
   bas fourneau plus tard, à sa place réservée.*
5. **Le toit de l'atelier** : en planches (les pans de la grange, existants) ou en bardeaux (moins de prise au feu, mais il faut
   d'abord les lattes) ? *Recommandé : planches maintenant, bardeaux quand les lattes porteront.*
6. **Le billot de l'enclume** : une pièce nouvelle (Ø 60 × 55, enterrée de 20 cm), ou le billot du jeu (Ø 55 × 45, un peu bas pour
   un homme de 1,90 m) ? *Recommandé : la pièce nouvelle, taillée dans le gros.*
7. **Le toit du logis** : du chaume comme chez Xéros (les mêmes dessins, en 9 m au lieu de 13,80 m), malgré la forge à 5 m ? Ou des
   bardeaux ? *Recommandé : le chaume (la cour de 5 m et le conduit qui dépasse le faîte de la forge), bardeaux plus tard.*
8. **Le puits** dans la cour, ou l'eau prise au puits du village ? *Recommandé : un puits à lui (le `well` du jeu) : une forge use
   beaucoup d'eau.*
9. **Le forgeron** : son nom ; barbe ou rasé ; cheveux lâchés ou attachés en queue pour le travail ? *Recommandé : rasé, cheveux
   attachés à la nuque pour le travail (sur la planche : les deux), et c'est à toi de choisir son nom.*
10. **Son frère, le vendeur** : un étal de la place (clous, fers, outils), plus tard avec les huit boutiques ? Les fiches des outils
    de fer disent aujourd'hui « acheté au forgeron » : ce sera « acheté au frère du forgeron ». *Recommandé : oui aux deux.*
11. **Ferrer les chevaux** : un **travail à ferrer** (le bâti où l'on attache le cheval) devant l'atelier, sur la cour de devant ?
    Ce n'est pas demandé. *Recommandé : la place seulement, le jour où il y aura des chevaux.*
12. **La suite** : après ton choix, on bâtit d'abord **les pièces nouvelles** une par une (fiche, dessin, contrat), puis le plan par
    un scénario dans le mode construction (`npm run test:forge`), puis le rectangle `Plan` sur la carte. *Recommandé : dans cet
    ordre.*
13. **La pente du toit de tuiles** : relever la charpente de la grange à 45° (poinçons plus longs, faîte vers 6,80 m) ou garder 37°
    avec plus de recouvrement ? *Recommandé : 45°, la pente juste pour la tuile plate.*
