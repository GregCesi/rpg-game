# Chantier « maison du coq » : cadrage (4 novembre 2026)

Branche `maison-coq`, worktree `~/Code/rpg-game-coq`, partie de `origin/main` (c264a42). **Rien du jeu ne change** : ce fichier, des
essais hors jeu (`art/proposals/coq-*.ts`, `tools/essai-coq*.ts`) et leurs images dans `.art-preview/`. La construction attendra la
fusion du relief (branche `relief`, `CADRAGE.md` section 12).

Chaque point sépare **les faits** (lus dans le code, les cartes, la conception), **ce que je propose** et, à la fin, **les questions**.

### Le retour de Grégoire (4 novembre, après les premières planches)

« C'est très bien. » **Les recommandations des 18 questions sont validées** (section 8), sauf l'emplacement : la maison va **plus
près du centre, vers le nord, juste avant sa ferme, entre le quartier riche et la ferme du riche, avec la place d'un grand jardin**
(section 1, refaite). Avant d'aller plus loin, **chaque pièce de la maison se valide une par une** : le catalogue des pièces
(section 9, ses planches en section 7). **La lauze se reprend de la forge** (une seule source, section 10). La construction attend
toujours la fusion du relief.

Ce que le catalogue a changé dans la structure (à valider avec lui, section 11) : le plancher porte sur des **muraillères et
des corbeaux** (section 2) ; le toit est **à pannes**, sur les pignons, les refends et **une ferme** au-dessus de la salle ; **la
cloison de pierre de l'étage (question 18) ne peut pas reposer sur le plancher** (question 19).

---

## 0. Ce que veut Grégoire (rappel)

- Le coq est le maître de la ferme du riche, le vrai pouvoir économique du village. Il vit avec sa femme, la vraie maîtresse de
  maison, et leurs quatre enfants : l'aîné, parti à l'armée ; le deuxième, un intellectuel ; le troisième, un fainéant qui veut
  reprendre la ferme ; la fille, un peu plus âgée que Xéros, apprentie tailleuse.
- Une grande maison, plus luxueuse et plus chère que toutes les autres, **en pierres taillées et traitées**, pas en moellons bruts.
- De plus grandes pièces. À l'intérieur, jusqu'à de la tapisserie.
- **Un étage, donc un escalier** : c'est la difficulté du chantier.
- Le réalisme du jeu : 5 cm par pixel, une maison de riche paysan d'un village médiéval rural et reculé, des matériaux vrais, bâtie
  pièce par pièce, avec les pièces existantes partout où elles conviennent.

---

## 1. Où la poser

**Faits** (cartes lues dans `tiled/maps/`, une case = 32 px = 1,60 m) :

- **La ferme du riche** (`ferme-du-riche.tmj`, 600-800 m × 0-200 m du monde) : une grande cour de terre battue d'environ 51 × 41 m au
  sud-est de la zone, au bout de la rue du nord du village. La grange (plan `grange`, 8,80 × 6 m) est posée dans sa partie ouest.
  **La parcelle « Logis du riche »** (`use: farmhouse`) l'attend à l'est de la cour : 17,60 × 14,40 m (px 3424, 2624). Autour : les
  champs labourés entre les haies de têtards.
- **Le quartier riche** (`village.tmj`, la rue du nord, 100 m) : quatre parcelles `rich-house`, deux de chaque côté de la rue,
  32 × 41,6 m et 28,8 × 41,6 m (à l'ouest, px 2592 / 64 et 960 ; à l'est, px 3392). Rien n'y est posé.
- Aucune des deux places ne demande de déplacer quoi que ce soit.

**Les deux emplacements :**

| | A. Dans la cour de sa ferme (parcelle « Logis du riche ») | B. Dans le quartier riche (une des quatre parcelles) |
| --- | --- | --- |
| L'histoire | Le coq tient son pouvoir de sa terre : il vit au milieu de ses granges, de ses gens et de ses bêtes, et le village vient à lui | Il se montre au village, près de la place, parmi les autres familles en vue |
| Le vrai | Un riche laboureur vit sur son exploitation ; sa maison est la tête de la cour, face au portail et à la rue | Une maison de bourg, plutôt d'un marchand ou d'un notaire que d'un paysan |
| La place | 17,60 × 14,40 m : la maison (16,40 × 6,80 m) tient, avec 7 m de cour devant elle au sud | 32 × 41,6 m : la maison, une cour, un jardin clos |
| Ce qu'on voit en arrivant | En remontant la rue du nord, la cour s'ouvre, la grange à gauche, la maison de pierre au fond à droite | Sur la rue, à 60 m de la place |
| Ce qui reste pour la suite | Les quatre parcelles du quartier riche gardent leur destination (d'autres familles en vue, des rivaux du coq) | Une parcelle de moins pour les autres ; la parcelle du logis reste vide |

Ma première recommandation était A, la cour de sa ferme. **Grégoire a choisi autrement** : plus près du centre, vers le nord,
juste avant sa ferme, entre le quartier riche et la ferme du riche, avec la place d'un grand jardin.

### La parcelle proposée : « Maison du coq », au bas de la ferme du riche

**Faits** (`ferme-du-riche.tmj` et `village.tmj`, lus case par case) : la zone du village est juste au sud de celle de la ferme du
riche (`monde.world` : même x, 4 000 px plus bas). La rue du nord du village (cases 101-106, entre les quatre parcelles `rich-house`,
qui commencent à 3,20 m du bord nord du village) monte tout droit dans la zone de la ferme : un chemin de terre battue de trois cases
(102-104, px 3264-3360) qui court du bord sud de la zone (y 4000) jusqu'à la cour de la ferme (dont le bas est à la case 104, px
3328). Entre les deux, **une bande de 33 m de prés et d'herbe, des deux côtés du chemin, que rien n'occupe** : quelques têtards, un gros
arbre, deux normaux et des buissons. Le relief (branche `relief`) ne touche ni à cette zone ni au village : **le sol y est plat**.

```
   ferme-du-riche.tmj, cases 78 à 124 (x) et 100 à 124 (y) ; = le chemin, , le pré, . l'herbe, ~ les champs
   T gros arbre, P têtard, n normal, b buisson ; ┌─┐ la parcelle proposée, ▓ la maison (16,40 × 6,80 m) ; schéma à l'échelle grossière

         x : 80        90        100  104
   y 100     ..........................====   ← le bas de la cour de la ferme (case 104)
   y 106   ┌──────────────────────┐   ===
   y 107   │.....n.....b...P......│   ===T          le jardin du nord : le potager, le verger,
   y 110   │,,,,,,,,,,,,,,,.......P   ===           le gros arbre et les têtards gardés
   y 112   │,,,,,,,,,,,,,,,...T...│   ===
   y 114   │,,▓▓▓▓▓▓▓▓▓▓▓,,.......│   ===
   y 117   │,,▓▓▓▓▓▓▓▓▓▓▓,,.......P   ===           la maison, façade au sud
   y 118   │,,,,,,,,,,,,,,,,......│   ===
   y 120   │,,,,,,,,n,,,,,,,,.....│   ===  ← l'allée vers le chemin
   y 124   └──────────────────────┘   ===  ← bord sud de la zone ; 3,20 m plus loin, les parcelles riches
```

- **La parcelle** (un rectangle `Parcel`, `use: rich-house`, nom « Maison du coq ») : px **x 2560 à 3264, y 3392 à 4000**
  (35,20 × 30,40 m, 1 070 m²), du pré à l'ouest jusqu'au bord du chemin, de la ferme au bord de la zone.
- **La maison** : coin nord-ouest hors œuvre en px **(2624, 3648)**, emprise 328 × 136 px (x 2624 à 2952, y 3648 à 3784), façade
  principale et porte en arc au sud, vers le village. Le gros arbre de la case (95, 112) reste à 4,40 m à l'est du pignon : il
  ombre le jardin, pas le toit.
- **Le jardin** : au nord (12,80 m de profondeur sur toute la largeur), le potager et le verger, avec les têtards et le gros arbre
  qui y sont déjà ; à l'est (15,60 m jusqu'au chemin), l'allée qui mène de la rue à la porte ; au sud (10,80 m jusqu'au bord de la
  zone), le devant de la maison, que l'on voit en remontant la rue du nord.
- **Ce qui gêne** : le normal de la case (88, 120) est à 2,80 m devant la façade, presque devant la porte : il la cacherait. À
  retirer de la carte au moment de poser la maison (question 20).
- **Ce qu'on voit** : en remontant la rue du nord, passé les quatre parcelles riches, la maison de pierre à gauche du chemin, son
  jardin, puis la cour de la ferme au bout ; c'est la dernière maison du village et la tête de la ferme. Elle est à 120 m de la
  place (la parcelle « Logis du riche », dans la cour, en était à 185 m).
- **La parcelle « Logis du riche »** de la cour garde sa destination (`farmhouse`) : un logis de ferme pour plus tard (le maître
  valet, les communs ; question 21).

### La déplacer plus tard

La maison n'est jamais dessinée dans la carte : c'est **un rectangle `Plan` dans le calque `parcelles` de `ferme-du-riche.tmj`**
(propriété `plan` : `maison-coq`, le plan enregistré `src/content/plans/maison-coq.json`). Son coin haut-gauche (`x`, `y` du
rectangle, en px) est **le coin nord-ouest du plan** (`planPieces` de `world/build.ts`, appelé par `world/mapPlans.ts`). La
déplacer, c'est déplacer ce rectangle dans Tiled (et la parcelle avec lui), puis `npm run maps`.

Ce qui doit être **libre** dessous : l'emprise de la maison (16,40 × 6,80 m), plus les débords du toit au nord et au sud (le pied
des laves, 30 cm), plus **1 m tout autour** pour que Xéros puisse bâtir et passer (les échafaudages du maçon plus tard) : aucun
objet de Tiled qui a un corps (arbre, têtard, buisson, rocher, tas `Pile`, objet `Item`), aucune autre parcelle, aucune sortie
`Exit`, aucun PNJ. Et **plat** : une seule hauteur de relief sous toute l'emprise (aucune forme `Relief` du relief ne la coupe ; un
terrain en pente demanderait un soubassement, un autre chantier).

Une chose à savoir : un plan entre dans la partie **à la première visite de la carte** (`seedPlans`, noté dans `seeded`) ; une
sauvegarde qui a déjà visité la ferme du riche garde la maison là où elle a été posée. Déplacer la maison après sa sortie demande
donc soit une partie neuve, soit un nouvel identifiant d'objet Tiled pour le rectangle et le retrait des pièces de l'ancien
(une ligne de `missingContent`, ou `SAVE_VERSION`).

---

## 2. Les dimensions

Elles viennent d'abord du bois que le jeu sait tirer d'un arbre : **un arbre normal donne une pièce de 5,80 m au plus** (CONCEPTION,
« Les bâtiments du village »). Les solives du plancher de l'étage franchissent la maison du nord au sud d'un seul tenant, sans poteau
au milieu des pièces : la largeur dans œuvre est donc de **5,60 m** (5,80 m de solive, 10 cm d'appui dans chaque mur). C'est la
règle des vraies maisons de ce temps : la largeur suit la longueur des bois, la maison s'allonge pour grandir.

- **Hors œuvre** : **16,40 × 6,80 m** (est-ouest × nord-sud), murs de 60 cm. **Dans œuvre** : 15,20 × 5,60 m par niveau.
- **Surface** : environ 85 m² habitables par niveau, 170 m² sur deux niveaux (la maison de Xéros : 80 m² sur un seul).
- **Le mur** : deux parements de pierre de taille, l'intérieur fourré de moellons et de mortier de chaux, comme on bâtissait
  vraiment un mur « en pierre de taille » (le moellon existe déjà dans le jeu : il sert ici de blocage, invisible).
- **Les hauteurs** (cm) :

  | Ce qui est | Hauteur |
  | --- | --- |
  | Sol du rez-de-chaussée (dallage) | 0 |
  | Dessous des solives | 262 |
  | Solives (poutres du normal, 20 × 20) | 262-282 |
  | Plancher de planches (3 cm) : **sol de l'étage** | 285 |
  | Cordon de pierre sur la façade (le niveau de l'étage) | 270-290 |
  | Haut des murs gouttereaux (la sablière sur l'arase) : 2,60 m au-dessus du plancher de l'étage | 545 |
  | Faîtage (toit à 45°, demi-portée 3,40 m, laves de 25 cm) | environ 915 |
  | Souches de cheminée | environ 1 010 |

- **Pourquoi 2,60 m à l'étage** : la croisée (appui à 90 cm, 1,60 m de jour) monte à 2,50 m au-dessus du plancher ; avec
  2,40 m, elle aurait coupé la sablière (relevé par le pixel-artist sur la planche de détail).
- **L'escalier** : 15 marches de 19 cm de haut (2,85 m), 14 girons de 26 cm (3,64 m de long), 1 m de large.
- **Ce qui porte le plancher** (revu pour le catalogue) : les solives ne s'encastrent plus de 10 cm dans les murs (trop peu pour une
  solive de 200 kg chargée) ; elles portent de 20 cm sur deux **muraillères**, des poutres couchées le long des murs nord et sud,
  posées sur des **corbeaux** de pierre (une console tous les 1,60 m, 20 cm dans le mur, 20 cm dehors). La solive fait 5,60 m
  (la portée libre entre muraillères est de 5,20 m), sous les 5,80 m du normal. Le plancher reste à 2,85 m.
- **Ce qui porte le toit** (revu pour le catalogue) : **un toit à pannes**, sans fermes sur les refends. La panne faîtière et deux
  pannes par pan vont d'un pignon à un refend, d'un refend à l'autre. Une travée dépasse 5,80 m : la salle (7,60 m). Elle reçoit
  **une ferme** à x 1300 (au droit de la séparation des chambres de l'étage) : un entrait de 6,60 m fait de deux poutres entées
  (l'enture existe), deux arbalétriers, un poinçon. Les travées font alors 4,60, 2,20, 4,80 et 2,60 m. Sur les pannes, des
  **chevrons** de 10 × 10 tous les 40 cm, et sur eux les lattes qui tiennent les laves.
- **À l'écran** : la maison fait 328 px de large (16,40 m), et du pied de la façade sud au faîte environ 180 px (9,10 m) de plus que son
  emprise. Au zoom de départ (palier 3, 21,3 × 12 m), **elle tient en largeur mais pas en hauteur** : on en voit le bas en arrivant,
  le toit en reculant (au zoom le plus large, 32 × 18 m, elle tient entière). Les planches le montrent avec le cadre de la vue.

---

## 3. Le plan annoté des deux niveaux

Coordonnées en cm depuis le coin nord-ouest hors œuvre, nord en haut. Dans œuvre : x 60 à 1580, y 60 à 620. Deux murs de refend
de pierre (40 cm) découpent la maison en trois : la cuisine à l'ouest, le passage de l'escalier au milieu, la salle à l'est. Ils
montent jusqu'au toit et portent la charpente avec les pignons.

### Rez-de-chaussée (sol à 0)

```
 x : 0   60                     520 560          780 820                                     1580 1640
 y=0  ##################################################################################################   N
      ##                      ##  ##          ##  ##       [cheminée de salle, mur nord]       ##   ↑
 y=60 ##+--------------------+##  ##+--------+##  ##+---------------------------------------+##
      ## |  CUISINE           |##  ##|    |E  |##  ##|  SALLE                                 |##
      ##█|  âtre (pignon O)   |##  ##|    |S  |##  ##|   dressoir      TAPISSERIE (mur nord)  |##
      ##█|  potager  pétrin   [p]  ##|pas-|C  |##  ##|   ========================  chaise   |##
      ## |  table du ménage   |##  ##|sage|A  |##  ##|   banc     grande table     du coq   |##
      ## |  évier [f nord]    |##  ##|    |L  |##  ##|   coffre                             |##
      ## |                    |##  ##|    | ^ |[p] ##|                                      |##
 y=620##+--------[F]---------+##  ##+[PORTE]--+##  ##+-----[F]-----------------[F]-------+##
 y=680##################################################################################################
      [F] demi-croisée (1,00 × 1,40 m, appui à 90 cm, barreaux, volets) ; [f] petite fenêtre ; [PORTE] porte d'entrée en arc,
      1,10 × 2,20 m ; [p] porte intérieure 0,90 × 1,80 m (`inner-door`) ; █ le feu de la cuisine, au pignon ouest ; ^ le pied de
      l'escalier, qui monte vers le nord.
```

- **La salle** (x 820-1580, 7,60 × 5,60 m, **43 m²**, la plus grande pièce du village) : la pièce du coq, où il reçoit, compte et
  commande. Sa **cheminée à hotte de pierre** au mur nord (2,40 m de large), sa **chaise à haut dossier** au bout de la table, près du
  feu ; la **grande table** (deux tables existantes de 2,10 m bout à bout) et ses bancs ; le **dressoir** où brillent les étains ; le
  **coffre** des comptes ; la **tapisserie** au mur nord, derrière la table. Sol de **dalles de calcaire**. Deux fenêtres au sud.
- **La cuisine** (x 60-520, 4,60 × 5,60 m, 26 m²) : le domaine de la femme du coq, la maîtresse de maison. **L'âtre** au pignon
  ouest (`stone-hearth`, la cheminée paysanne où l'on cuisine, sous une hotte de pierre), le **potager** maçonné, le **pétrin**,
  l'**évier de pierre** qui verse dehors par le mur nord, la **table du ménage** où l'on mange les jours ordinaires, les jarres, les
  sacs, le tonneau. Sol de terre battue (on y renverse de l'eau). Une fenêtre au sud, une petite au nord sur l'évier.
- **Le passage** (x 560-780, 2,20 × 5,60 m) : on entre par la porte en arc au sud ; **l'escalier** monte vers le nord le long du
  refend est (x 680-780, premier contremarche à y 514, arrivée à y 150) ; le passage libre (1,20 m) longe l'escalier ; la porte de
  la cuisine à l'ouest (y 300-390), celle de la salle à l'est, au pied de l'escalier (y 525-610). Dallé comme la salle.

### Étage (sol à 2,85 m)

```
 x : 0   60                     520 560          780 820             1300 1315                   1580 1640
 y=0  ##################################################################################################
      ##  (conduit de la cuisine)##  ##        ##  ##      [cheminée de chambre, mur nord]       ##
 y=60 ##+--------------------+##  ##+--------+##  ##+----------------------+-+---------------+##
      ## |  CHAMBRE DES       [p]  ##| palier  [p]  ##| CHAMBRE DU COQ        | | CHAMBRE DE LA |##
 y=150## |  GARÇONS           |##  ##|----+---|##  ##| ET DE SA FEMME        |p| FILLE         |##
      ## |  lit de l'aîné     |##  ##|    |TRÉ|##  ##|  lit à courtines       | |  lit   coffre  |##
      ## |  (fait, vide)      |##  ##|    |MIE|##  ##|  coffres   tenture     | |  table de     |##
      ## |  lit du fainéant   |##  ##|    |   |##  ##|                       | |  tailleuse    |##
 y=430## |  écritoire de      |##  ##|    +===|##  ##|                       | |  étoffes      [F est]
      ## |  l'intellectuel    |##  ##|        |##  ##|                       | |               |##
 y=620##+--------[C]---------+##  ##+--[c]---+##  ##+--------[C]-----------+-+------[C]------+##
      [C] croisée de pierre (1,00 × 1,60 m, meneau et traverse, losanges plombés en haut, volets en bas) ; [c] petit jour au-dessus
      de la porte ; [p] porte intérieure ; === et | au bord de la trémie : le garde-corps ; la cloison x 1300 en pan de bois chaulé
      (les remplissages de la maison de Xéros).
```

- **Le palier** (au-dessus du passage) : on arrive en haut de l'escalier au nord, sur le palier (y 60-150) ; la **trémie** (le trou
  du plancher au-dessus de l'escalier, x 680-780, y 150-430) est bordée d'un **garde-corps** de bois ; le passage le long d'elle
  mène au jour du sud. Une porte à l'ouest, une à l'est, sur le palier. Plus tard, une échelle et une trappe vers le grenier.
- **La chambre du coq et de sa femme** (x 820-1300, 4,80 × 5,60 m, 27 m²) : le **lit à courtines**, deux **coffres** (le linge, la
  dot de la fille), une **tenture** au mur ; **sa cheminée** au mur nord, au-dessus de celle de la salle (les deux conduits dans la
  même souche) : une chambre à feu, le luxe d'un maître.
- **La chambre de la fille** (x 1315-1580, 2,65 × 5,60 m, 15 m²), **derrière celle des parents** (on y passe par leur chambre, comme
  dans les maisons de ce temps, et le père veille) : son lit, son coffre, sa **table de tailleuse** sous la croisée du sud, ses
  coupons d'étoffe, son panier à ouvrage ; une fenêtre de plus au pignon est, pour la lumière de l'aiguille.
- **La chambre des garçons** (x 60-520, 26 m², au-dessus de la cuisine, chauffée par son conduit) : **le lit de l'aîné**, fait et
  vide, son coffre fermé (il est à l'armée) ; **le lit du fainéant**, défait, près du conduit chaud ; **l'écritoire de
  l'intellectuel** sous la croisée, ses quelques livres, sa chandelle.
- **Le grenier** (sous les laves, sol à 5,45 m) : le grain de la ferme, monté par une **lucarne à poulie** au sud. Il se voit dehors
  (la lucarne), il ne se visite pas dans ce chantier (ce serait un deuxième étage).

---

## 4. La pierre, le toit, les fenêtres d'une maison de riche de ce temps-là

- **La pierre** : le calcaire du village (la roche `limestone` de `rocks.json`, la même rampe de couleurs), **taillé en moyen
  appareil** : des blocs dressés sur toutes leurs faces, posés en assises réglées de 30 cm, joints minces au mortier de chaux.
  « Traitée » : la face vue est **layée** (dressée au marteau taillant, de fines stries parallèles) avec une **ciselure** (une bande
  lisse de 2 à 3 cm) le long des arêtes ; les **chaînes d'angle** et les encadrements des baies sont en blocs plus grands, alternés
  en harpe. Un **cordon** mouluré court sur la façade au niveau du plancher. La maison de Xéros a un solin de pierres brutes à la
  terre ; celle-ci est de la pierre d'un maçon payé, du sol au faîte : c'est elle qui coûte.
  - **Le petit appareil** existe déjà : la pierre de taille du jeu (`ashlar`, 40 × 20 × 15 cm, 29 kg, taillée d'un moellon au ciseau,
    `dress-ashlar`). En façade, ses assises de 15 cm (3 px) risquent de se lire comme de la brique, le défaut déjà vu au chantier
    « pierre ». La planche de détail montre les deux, côte à côte (question 3).
- **Le toit** : **des laves**, les lauzes de calcaire posées à sec en rangs serrés, de la même carrière que les murs : le toit le plus
  lourd (de l'ordre de 600 kg/m²) et le plus cher, sur une charpente forte (chevrons du normal tous les 40 cm, deux fermes sur les
  refends, les pignons). Pente de 45° (la même que la maison de Xéros). Faîtage de pierres, **pignons découverts** : les murs de bout
  montent au-dessus du toit, couronnés de dalles en rampant. Une lucarne de pierre au sud pour le grenier. Pas de chaume : c'est le
  toit des pauvres, et la maison de Xéros l'a.
- **Les fenêtres** : de vraies **croisées de pierre** à l'étage (un meneau, une traverse, quatre jours), le signe des maisons riches.
  Les deux jours du haut ont des **vitraux en losanges sertis de plomb** (le verre, rare et cher, c'est le luxe de la maison), ceux du
  bas des **volets intérieurs** de bois. Au rez-de-chaussée, des **demi-croisées** (une traverse) avec des **barreaux de fer** (il y a
  du grain et de l'argent) et des volets. Les fenêtres du nord sont rares et petites (le côté froid).
- **La porte** : en **arc** (plein cintre de claveaux, arêtes chanfreinées), de chêne clouté, avec son heurtoir ; la clef de l'arc
  porte **un coq sculpté** (question 9).
- **Les cheminées** : deux souches de pierre de taille couronnées, l'une au pignon ouest (la cuisine), l'autre dans le mur nord
  (la salle et la chambre). On en voit la fumée.

---

## 5. Les pièces : ce qui existe et ce qui manque

*Premier inventaire, celui des premières planches. Il est remplacé par **le catalogue pièce par pièce de la section 9**, qui fait
foi : les tableaux ci-dessous restent pour l'historique.*

### Réutilisées telles quelles

| Pièce existante | Où elle sert |
| --- | --- |
| `wood-piece` poutre du normal (20 × 20, jusqu'à 5,80 m) | solives du plancher (5,80 m, tous les 50 cm), chevêtre de la trémie, sablières, charpente, entraits |
| `wood-piece` planche (3 × 25 cm) | le plancher de l'étage, posé sur les solives |
| `wood-piece` perche | les lattes sous les laves |
| `rubble-stone` (moellons) | le blocage entre les deux parements du mur (invisible) |
| `ashlar` (pierre de taille) | les appuis et les seuils taillés ; les murs eux-mêmes si le petit appareil est retenu (question 3) |
| `stone-hearth` | l'âtre de la cuisine |
| `chimney-flue`, `chimney-cap` | les conduits et les couronnements des souches |
| `threshold-stone`, `inner-threshold-stone` | les seuils |
| `inner-door` / `inner-door-open` | les cinq portes intérieures |
| `lime-panel`, `lime-inner-jamb`, `door-frame`, `lime-door-head` | la cloison en pan de bois de l'étage (fille / parents) |
| `table` (×3), `bench`, `stool`, `chest` (×4), `bed` (×3), `barrel`, `jar`, `sack`, `crate`, `bucket`, `candle`, `lantern`, `wall-torch` | le mobilier |
| les assemblages (tenon et mortaise, mi-bois, enture) | la charpente, le garde-corps |

### Nouvelles, à dessiner (chacune sa fiche dans `docs/objets/`, ses vues, sa masse, son métier ; par le pixel-artist)

| Pièce nouvelle | Ce que c'est | Métier |
| --- | --- | --- |
| **mur de pierre de taille** (élément `wall`, toute longueur, toute hauteur) | les deux parements en moyen appareil, son dessus, ses têtes, ses angles en harpe, ses ouvertures | maçon, tailleur de pierre |
| **bloc d'appareil** (si le moyen appareil est retenu) | la pierre de taille de 50 × 30 × 30 cm (environ 108 kg) : l'objet qu'on taille et qu'on porte à deux | tailleur de pierre |
| **encadrement de porte en arc** | piédroits et claveaux, chanfreinés | tailleur de pierre |
| **croisée de pierre**, **demi-croisée** | meneau, traverse, appui, linteau ; vitrage en losanges plombés, barreaux | tailleur de pierre, verrier, forgeron |
| **porte de chêne cloutée** (`swing`, `passage`) | 1,10 × 2,20 m, en arc, son état ouvert | menuisier, forgeron |
| **volets de croisée** (`swing`) | les volets intérieurs des jours du bas | menuisier |
| **cordon de pierre** | la moulure de la façade au niveau de l'étage | tailleur de pierre |
| **pan de toit en laves** (en couches : lattes, laves) et **faîtage de pierre** | le toit, `roof: true`, son ombre calculée (`shadow`) | couvreur |
| **pignon découvert** de pierre de taille | le triangle du mur de bout, ses dalles de rampant | maçon |
| **lucarne de pierre** et sa poulie | la lucarne du grenier | maçon, charpentier |
| **cheminée de salle** (hotte de pierre sur corbeaux), **cheminée de chambre** (plus petite) | les deux feux de la salle et de la chambre | maçon |
| **hotte de pierre** de l'âtre de cuisine | la même que la hotte de torchis de Xéros, en pierre | maçon |
| **évier de pierre** | la pierre creusée qui verse dehors | tailleur de pierre |
| **marche de pierre** et **mur d'échiffre** | une marche monolithe (100 × 30 × 19 cm), posée sur la précédente et sur le mur bas qui porte l'escalier | tailleur de pierre |
| **garde-corps** de bois | la rampe de la trémie, à l'étage | menuisier |
| **dalle de sol** de calcaire | le dallage de la salle et du passage | tailleur de pierre |
| **tapisserie** (pendue à une tringle) et **tenture** | la verdure de la salle (2,40 × 1,60 m), la tenture de la chambre | (achetée à la ville) |
| **lit à courtines**, **dressoir** et ses étains, **chaise à haut dossier**, **pétrin**, **écritoire** et ses livres, **table de tailleuse**, **coupons d'étoffe** | le mobilier propre à cette famille | menuisier, (la ville) |

Ce qui ne se dessine pas : l'intérieur de chaque niveau se calcule de ses pièces (CONCEPTION « Les intérieurs »), comme partout.

---

## 6. Ce que l'étage demande au moteur, en plus du relief

Le relief (CADRAGE.md section 12 de la branche `relief`) apprend au jeu **une hauteur par point du sol** : `heightAt(map, x, y)`, tirée
des formes de Tiled, rastérisée en cases de 40 cm ; la règle de pas (`mobility.json` : 50 cm en montant, 1 m en sautant vers le bas,
20 % de pente au plus, ce qui est plus raide comptant comme une marche de toute sa hauteur) ; le dessin soulevé (`y − h/5`, aide
unique `lift.ts`) ; la souris qui retrouve le point vu (`pick`). L'étage s'appuie sur tout cela, et y ajoute quatre choses.

### 6.1 Un plancher porté au-dessus d'une pièce

**Fait** : la hauteur du relief est **une seule valeur par point**. Sous le plancher de l'étage, il y a deux sols au même (x, y) :
la salle à 0, la chambre à 2,85 m. Le relief seul ne peut pas le dire.

**Ce qu'il faut :**
- **Les dessus qui se marchent, tirés des pièces posées** : une capacité en données, `walk: true` dans props.json (la planche du
  plancher, la marche, la dalle de sol, plus tard le palier d'un escalier dehors), lue par une fonction sans Phaser,
  `src/world/decks.ts` : `surfacesAt(pieces, x, y)` (les hauteurs des dessus qui couvrent ce point), d'après la boîte exacte de chaque
  pièce, **jamais rastérisée en cases de 40 cm** : un giron de 26 cm y deviendrait une pente de 73 %, que la règle de pente compterait
  comme une seule marche de 2,85 m, refusée. Les marches restent des marches de 19 cm.
- **La hauteur de Xéros devient un état** : `z` de `Mobility` (en cm), gardé d'un pas à l'autre. Au pas suivant, le sol sous lui
  est **le plus haut dessus qui ne dépasse pas `z + step`** (le terrain du relief compris), à condition qu'il ait la tête libre
  au-dessus (`INTERIOR.headroom`) : sous le plancher on reste en bas, sur la marche on monte d'une marche. Plus bas que `z − drop`,
  c'est la trémie ou le bord de l'escalier : refusé (« Trop haut pour lui (2,9 m). »), sauf le bas de l'escalier, d'où il saute.
- **Les collisions par niveau** : aujourd'hui un corps bloque à toute hauteur (Arcade est plat). Un meuble de l'étage ne doit pas
  barrer la salle, ni le pied de l'escalier la chambre : chaque corps garde sa tranche de hauteur (le `z` et le `h` de sa pièce), et
  un `processCallback` de la collision ne bloque que si cette tranche croise celle de Xéros (`z` à `z + 170`). Les murs de la maison,
  qui montent de fond, bloquent aux deux niveaux sans rien changer.
- **Ce qui est sous l'escalier** : le mur d'échiffre est plein, on ne passe pas dessous (pas de tête basse à calculer).
- **La sauvegarde** garde le `z` de Xéros avec sa position : `SAVE_VERSION` augmente.
- **Le mode construction** pose déjà une pièce sur le plus haut dessus sous son emprise (`world/build.ts`) : une table posée sur le
  plancher est à 2,85 m sans rien changer. Il lui faut **un réglage du niveau affiché** (un bouton du panneau, et une touche), pour
  voir et viser l'étage, et `pick` pour viser à la bonne hauteur.
- **Rien au-dessus du vide** : les corbeaux sortent du mur (20 cm dedans), les muraillères portent sur les corbeaux, les solives
  sur les muraillères, les planches sur les solives, le chevêtre de la trémie sur deux solives, chaque marche sur la précédente et le mur d'échiffre (`overhangs` de `world/overhang.ts`, inchangé).

### 6.2 Un seul niveau affiché à la fois

- **Le niveau où est Xéros** : le plus haut plancher de la maison dont le dessus est au plus à une demi-hauteur d'étage au-dessus de
  ses pieds (`z ≥ plancher − 142 cm`). Il change donc **au milieu de l'escalier**, à la 8ᵉ marche, et pas avant.
- **En bas** : on voit le rez-de-chaussée comme aujourd'hui (les murs coupés à 70 cm, la coupe du mur sud) ; le plancher de l'étage,
  ses solives et tout ce qui est posé dessus sont cachés, **comme les toits** dedans aujourd'hui ; l'escalier monte et sort par le haut
  de la vue.
- **En haut** : on voit l'étage, **soulevé de 57 px** (2,85 m / 5, la projection du relief) : le plancher, ses meubles, ses murs coupés à
  70 cm au-dessus de lui ; le rez-de-chaussée est caché sous le plancher, sauf **par la trémie**, où l'on voit l'escalier descendre
  dans l'ombre jusqu'aux dalles du passage. Le grenier et la charpente restent cachés.
- **Le passage de l'un à l'autre** : un fondu de 250 ms (celui des toits, `ROOF`), les pièces du niveau quitté vers 0, celles du
  niveau atteint vers 1. **Pas de changement de carte, pas d'écran noir** : on marche.
- **La lumière** : chaque fenêtre éclaire sa pièce, à son niveau ; la pénombre se calcule par niveau (les volets ouverts de ce
  niveau).
- **Dehors, rien ne change** : la maison est close, son toit ne s'efface jamais ; une fenêtre du rez-de-chaussée au volet ouvert
  montre sa pièce (`windowFade`) ; celles de l'étage sont trop hautes pour qu'on y voie.

### 6.3 Quand Xéros monte ou descend

- Il **marche** sur les marches, comme sur la pente du couloir creux : chaque marche est un pas de 19 cm, permis par `step`. Aucun
  fondu, aucun clic : il monte en tenant Z (W en QWERTY), à la vitesse de la marche moins ce que la montée lui coûte (une part de la
  marche, comme chargé : `systems/speeds.ts`, jamais une vitesse à part) ; il souffle s'il monte chargé (un prix au mètre de montée
  dans stamina.json).
- **Son image** monte de 3,8 px par marche et **la caméra suit** (`setFollowOffset`, comme le relief) : elle glisse doucement de 57 px
  pendant la montée.
- **Le changement de niveau** se teste **au franchissement** depuis l'image d'avant (`crossed` de `world/crossing.ts`, règle du
  dépôt) : la ligne de la 8ᵉ marche, dans un sens ou dans l'autre. Une machine lente qui fait plusieurs pas par image ne la saute pas.
- **Ce qu'il porte** monte avec lui (Hold suit l'image). Une pièce de 4 m ne passe pas la trémie : arrêtée par ce qui manque à Xéros
  ou par la place (le mur), jamais par une règle d'escalier.
- **En haut**, il arrive sur le palier ; le garde-corps l'empêche de tomber dans la trémie ; sans garde-corps, le bord est une marche
  de 2,85 m vers le bas, refusée par `drop`.
- **La page rechargée** en haut le retrouve en haut (son `z`).

### 6.4 La coupe des intérieurs sur deux niveaux

Aujourd'hui (`world/interior.ts`) : on projette au sol tout ce qui barre le passage entre 30 cm et 1,80 m (`INTERIOR.floor`,
`headroom`), plus les linteaux, et l'on remplit depuis la porte ; les pièces sont les rectangles clos ; le mur sud et les cloisons
est-ouest sont coupés.

**Ce qu'il faut :**
- **Les niveaux d'un bâtiment** : les hauteurs distinctes de ses dessus qui se marchent (ici 0 et 285).
- **La recherche des pièces, par niveau** : la même projection, mais dans la tranche de ce niveau (de `plancher + 30` à
  `plancher + 180`), et le remplissage part de chaque arrivée d'escalier comme d'une porte (une entrée sans porte, interne au bâtiment).
  On trouve les trois pièces du bas, les trois du haut et le palier.
- **La coupe** : le mur sud et les cloisons est-ouest de chaque niveau coupés à 70 cm au-dessus de **son** plancher ; ce qui passe
  au-dessus de la tête de ce niveau (les solives et le plancher du dessus, pour le bas ; la charpente, pour le haut) est caché.
- **La carte de l'intérieur reste une seule** (`interieur:<carte>:<x>,<y>`), avec ses deux niveaux : les meubles posés dedans gardent
  leur `z` dans `builds`, et l'on monte sans changer de carte.
- **Les fenêtres et la lumière par niveau** ; **le mur du fond toujours derrière** (`backCaps`) par niveau.
- **Les PNJ** de la maison sont posés dans Tiled avec leur niveau (une propriété `z` du point `Npc`) : la fille à sa table, à
  l'étage.

### 6.5 Ce qu'il en coûte, et l'ordre

Le gros du travail est en 6.1 (le `z` de Xéros, les dessus marchables, les collisions par tranche) et 6.2 (le niveau affiché).
Tout dépend du relief : `lift.ts`, la règle de pas et `pick`. **Rien ne peut commencer avant sa fusion.** Ensuite, dans l'ordre :

1. les pièces et leurs dessins, une à la fois (fiche, vues, masse, accord de Grégoire) ;
2. le moteur de l'étage, sans dessin : `decks.ts`, le `z` de Mobility, les collisions par tranche, les niveaux de `interior.ts`, le
   niveau affiché, la sauvegarde ; `tools/test-etage.ts` dans `test:fast` (les dessus, le pas, la trémie refusée, le changement de
   niveau au franchissement, les pièces trouvées par niveau) ;
3. la maison bâtie dans le mode construction par un scénario (`npm run test:maison-coq`, comme la cabane, la grange et la maison de
   Xéros), enregistrée comme plan (`src/content/plans/maison-coq.json`), puis posée dans la cour par un rectangle `Plan` ;
4. le scénario de l'étage (`npm run test:etage` : entrer, monter, la chambre de la fille, la page rechargée en haut, redescendre) ;
5. la famille (`characters.json`, leurs dialogues) : un autre chantier.

---

## 7. Les planches (pixel-artist, hors jeu)

Refaire : `npx tsx tools/essai-coq.ts` (les quatre planches de la maison, 16 s) et `npx tsx tools/essai-coq-details.ts` (le détail).
Le modèle en volumes : `art/proposals/coq-maison.ts` ; la pierre, les baies, les tentures : `coq-pierre.ts`, `coq-baies.ts`,
`coq-tentures.ts` (les deux planches partagent les mêmes matières).

| Planche | Ce qu'il faut y regarder |
| --- | --- |
| `.art-preview/coq-dehors.png` (x2) | les trois versions côte à côte, Xéros devant la porte, le liseré du cadre de la vue au zoom de départ : en arrivant, on voit les deux niveaux et le bas du toit, ni le faîte ni les souches ; B et son escalier dehors sous le bolet ; C et sa tourelle à 12,60 m |
| `.art-preview/coq-niveaux.png` (x2) | la version A sans toit : le rez-de-chaussée (cuisine, passage et escalier, salle et sa tapisserie), puis l'étage soulevé de 57 px (garçons, palier et trémie, chambre du coq, chambre de la fille), les légendes des pièces |
| `.art-preview/coq-escalier.png` (x4) | Xéros en bas, sur la 7ᵉ marche (encore le rez-de-chaussée), sur la 8ᵉ (l'étage s'affiche), en haut sur le palier |
| `.art-preview/coq-vue-joueur.png` (x2) | ce que voit le joueur au zoom de départ, au pied de l'escalier puis en haut (la caméra a glissé de 57 px) |
| `.art-preview/coq-pierre-tapisserie.png` (x4) | le moyen appareil proposé, le petit appareil de la pierre de taille du jeu (il se lit comme de la brique), la pierre brute de Xéros ; la croisée et la demi-croisée, volets fermés et ouverts ; la porte en arc et son coq sur la clef ; les laves ; la verdure au coq et la tenture |
| `.art-preview/coq-catalogue-pierre-1.png` (x4) | **le catalogue, la pierre** : les carreaux, la boutisse, la pierre d'angle, la pierre de tableau, le cordon, le corbeau, le bloc biais, la dalle de rampant, les seuils du jeu, la boutisse de refend ; « dans le mur » : un morceau de cinq assises, nu puis une lettre par bloc (le joint à 10 cm en rouge) |
| `.art-preview/coq-catalogue-pierre-2.png` (x4) | la dalle de sol, la planche et la terre battue du jeu ; la lave (« à reprendre de la forge »), la faîtière, le couronnement, le fronton ; **notre pan de laves contre la lauze de la forge** ; la marche et la pierre d'échiffre |
| `.art-preview/coq-catalogue-pierre-3.png` (x4) | les pierres des baies (appui, linteau, meneaux, traverse, claveau, clef au coq, sommier), la clef à 50 cm, **l'arc assemblé**, **la croisée assemblée** |
| `.art-preview/coq-catalogue-pierre-4.png` (x4) | les pierres des cheminées, l'évier, le potager, l'âtre du jeu, **le manteau de la salle assemblé** |
| `.art-preview/coq-catalogue-bois-1.png` (x4) | **la ferme de la salle assemblée**, la solive, la muraillère, le chevêtre, la panne, l'entrait, la sablière (les images du jeu de la poutre), l'arbalétrier, le poinçon, le chevron (nouvel aspect), la latte |
| `.art-preview/coq-catalogue-bois-2.png` (x4) | la potence, **le garde-corps assemblé** et ses pièces, le vitrail, le volet fermé et ouvert, le barreau, la porte en arc fermée et ouverte, dehors et dedans, le linteau intérieur, la porte intérieure du jeu, la poutre de manteau |
| `.art-preview/coq-catalogue-bois-3.png` (x4) | les meubles en quatre vues (les vues du sud validées reprises au pixel près), le lit défait à côté du lit du jeu, la verdure redessinée, la tenture, la tringle, le coupon, les étains |
