# Chantier « maison du coq » : cadrage (4 novembre 2026)

Branche `maison-coq`, worktree `~/Code/rpg-game-coq`, partie de `origin/main` (c264a42). **Rien du jeu ne change** : ce fichier, des
essais hors jeu (`art/proposals/coq-*.ts`, `tools/essai-coq*.ts`) et leurs images dans `.art-preview/`. La construction attendra la
fusion du relief (branche `relief`, `CADRAGE.md` section 12).

Chaque point sépare **les faits** (lus dans le code, les cartes, la conception), **ce que je propose** et, à la fin, **les questions**.

### Le retour de Grégoire (4 novembre, après les premières planches)

« C'est très bien. » **Les recommandations des 18 questions sont validées** (section 8), sauf l'emplacement : la maison va **plus
près du centre, vers le nord, juste avant sa ferme, entre le quartier riche et la ferme du riche, avec la place d'un grand jardin**
(section 1, refaite). Avant d'aller plus loin, **chaque pièce de la maison se valide une par une** : le catalogue des pièces
(section 9, ses planches en section 7). **La lauze se reprend de la forge** (une seule source, section 10 ; renversé ensuite par
la réponse 26 : c'est la nôtre qui reste). La construction attend toujours la fusion du relief.

Ce que le catalogue a changé dans la structure (à valider avec lui, section 11) : le plancher porte sur des **muraillères et
des corbeaux** (section 2) ; le toit est **à pannes**, sur les pignons, les refends et **une ferme** au-dessus de la salle ; **la
cloison de pierre de l'étage (question 18) ne peut pas reposer sur le plancher** (question 19).

### Le deuxième retour de Grégoire (4 novembre, après le catalogue)

« C'est ce que je voulais. » Il regardera les planches en détail plus tard. **Les recommandations des questions 19 à 25 et 27
sont validées** : la cloison de l'étage en pan de bois chaulé, le normal devant la façade retiré de la carte, la parcelle
« Logis du riche » gardée pour un futur logis de ferme, l'aide de la mère jusqu'à environ 140 kg puis un engin de levage dans un
chantier plus tard, les murs bâtis par morceaux qui consomment leurs blocs, les carreaux de 50, 70 et 90 cm, la clef au coq de
50 cm, les dimensions corrigées. **Question 26, autrement que ma recommandation : notre lave, plus sombre et moussue, devient la
seule lauze du jeu** ; celle de la forge sera remplacée par la nôtre quand la maison s'intégrera. La forge elle-même est couverte
de bardeaux : rien ne change pour elle (section 10). Les réponses sont notées sous chaque question (section 11). **La maison est
prête ; sa construction attend la fusion du relief.**

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
  lourd (de l'ordre de 600 kg/m²) et le plus cher, sur une charpente forte (des pannes sur les pignons et les refends, une ferme
  au-dessus de la salle, des chevrons tous les 40 cm : section 2, revue pour le catalogue). Pente de 45° (la même que la maison de Xéros). Faîtage de pierres, **pignons découverts** : les murs de bout
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
| `.art-preview/coq-catalogue-pierre-2.png` (x4) | la dalle de sol, la planche et la terre battue du jeu ; la lave (la seule lauze du jeu, réponse 26), la faîtière, le couronnement, le fronton ; **notre pan de laves contre la lauze de la forge** ; la marche et la pierre d'échiffre |
| `.art-preview/coq-catalogue-pierre-3.png` (x4) | les pierres des baies (appui, linteau, meneaux, traverse, claveau, clef au coq, sommier), la clef à 50 cm, **l'arc assemblé**, **la croisée assemblée** |
| `.art-preview/coq-catalogue-pierre-4.png` (x4) | les pierres des cheminées, l'évier, le potager, l'âtre du jeu, **le manteau de la salle assemblé** |
| `.art-preview/coq-catalogue-bois-1.png` (x4) | **la ferme de la salle assemblée**, la solive, la muraillère, le chevêtre, la panne, l'entrait, la sablière (les images du jeu de la poutre), l'arbalétrier, le poinçon, le chevron (nouvel aspect), la latte |
| `.art-preview/coq-catalogue-bois-2.png` (x4) | la potence, **le garde-corps assemblé** et ses pièces, le vitrail, le volet fermé et ouvert, le barreau, la porte en arc fermée et ouverte, dehors et dedans, le linteau intérieur, la porte intérieure du jeu, la poutre de manteau |
| `.art-preview/coq-catalogue-bois-3.png` (x4) | les meubles en quatre vues (les vues du sud validées reprises au pixel près), le lit défait à côté du lit du jeu, la verdure redessinée, la tenture, la tringle, le coupon, les étains |

---

## 8. Questions pour Grégoire

**Réponses du 4 novembre** : les dix-huit recommandations sont prises, sauf la 1 (l'emplacement : la parcelle « Maison du coq »,
section 1). Les questions ouvertes par le catalogue sont **19 à 27, en section 11**. La réponse 18 (la cloison de pierre) est
remplacée par la réponse 19 : une cloison de pan de bois chaulé, qu'aucun plancher n'a de mal à porter.

Chacune avec ma recommandation ; une réponse « oui » prend la recommandation.

1. **L'emplacement** : dans la cour de sa ferme, sur la parcelle « Logis du riche » (A), ou sur une parcelle du quartier riche (B) ?
   *Recommandation : A, la cour de sa ferme* (section 1).
2. **La version** : A (le logis de pierre, l'escalier dedans), B (l'escalier dehors et son palier couvert), C (en L, avec une tour
   d'escalier à vis) ? *Recommandation : A.* B met l'escalier dehors, donc deux entrées à deux hauteurs et le relief dehors en plus de
   l'étage dedans ; C demande un escalier à vis, qui tourne sur lui-même et se lit mal vu de dessus, et fait de lui un seigneur plus
   qu'un paysan.
3. **L'appareil des murs** : le moyen appareil (assises de 30 cm, un bloc nouveau de 50 × 30 × 30 cm, 108 kg, qu'on porte à deux ou
   avec l'aide de la mère), ou le petit appareil de la pierre de taille qui existe (`ashlar`, assises de 15 cm, 29 kg) ?
   *Recommandation : le moyen appareil* (il se lit comme de la pierre de riche ; le petit appareil, à 3 px par assise, tire vers la
   brique : à juger sur `coq-pierre-tapisserie.png`). La pierre de taille existante sert alors aux appuis, aux seuils et aux marches.
4. **« Traitées »** : la face layée et ciselée, la pierre nue (ma lecture), ou un badigeon de chaux sur la pierre ? *Recommandation : la
   pierre nue, layée et ciselée* : c'est la pierre elle-même qu'on montre quand on a payé le tailleur.
5. **Le toit** : des laves de calcaire (la même carrière que les murs, le plus lourd, le plus cher), de la tuile plate (une tuilerie
   qui n'existe pas encore au monde), ou du chaume ? *Recommandation : les laves.*
6. **Les fenêtres** : des croisées de pierre à l'étage avec des vitraux en losanges plombés dans les jours du haut, ou seulement des
   volets (du papier huilé, de la toile cirée) ? *Recommandation : les vitraux en haut, les volets en bas* ; le verre est le luxe qui
   se voit de la cour.
7. **L'escalier** : de pierre, marche par marche sur un mur d'échiffre plein (ce que montrent les planches), ou de bois (une volée
   droite de chêne, ses limons, un placard dessous) ? *Recommandation : la pierre* : la maison est de pierre du sol au faîte, chaque
   marche est une pièce posée sur la précédente (bâtie pièce par pièce), et rien n'est à calculer dessous.
8. **Les chambres de l'étage** : la fille derrière ses parents, en enfilade (on traverse leur chambre pour aller chez elle), ou un
   couloir le long du mur nord qui la dessert (la chambre du coq rétrécit d'un mètre) ? *Recommandation : l'enfilade* (le vrai de ce
   temps, et le père qui veille dit qui il est).
9. **Le coq** : un coq sculpté sur la clef de l'arc de la porte, et un coq dans la verdure de la salle, l'emblème de la famille ? Et
   une girouette en coq sur le faîte ? *Recommandation : oui à la clef et à la verdure, non à la girouette* (au village, la girouette est
   celle du clocher).
10. **La tapisserie** : une verdure de laine (feuillages, un coq) dans la salle et une tenture plus simple dans la chambre (ce que montre
    la planche), ou une seule, dans la salle ? *Recommandation : les deux*, la verdure seule dans la salle, la tenture dans la chambre.
11. **Les sols** : des dalles de calcaire dans la salle et le passage, la terre battue dans la cuisine, des planches à l'étage ?
    *Recommandation : oui.* Le dallage est une pièce posée (la dalle de sol, `walk: true`) ; la terre battue de la cuisine est celle
    des intérieurs calculés.
12. **Le niveau affiché** : il change au milieu de l'escalier (la 8ᵉ marche), par un fondu de 250 ms, sans changer de carte (ma
    proposition), ou à la dernière marche, ou par un fondu au noir comme une porte ? *Recommandation : au milieu, sans noir* : on monte en
    marchant, et c'est le moment où la tête de Xéros passe le plancher.
13. **Le grenier et la cave** : le grenier (sous les laves, le grain, la lucarne à poulie) se voit dehors mais ne se visite pas dans ce
    chantier ; pas de cave. *Recommandation : oui*, un deuxième étage et un sous-sol viendront avec le même moteur, plus tard.
14. **Le mode construction** : un bouton « niveau » dans le panneau (et une touche) pour voir et viser l'étage pendant qu'on bâtit ?
    *Recommandation : oui*, sinon on ne pose rien sur le plancher une fois les murs montés.
15. **Les gens de maison** : une servante qui dort dans la cuisine, des valets à la grange ? Pas demandé ; le plan leur laisse la
    place (une paillasse près de l'âtre). *Recommandation : plus tard, avec la famille* (un autre chantier).
16. **L'ordre** : la maison attend la fusion du relief ; avant, les pièces une à une (fiche, dessins, accord), en commençant par le
    mur de pierre de taille et ses baies. *Recommandation : oui*, le mur haut de pierre est aussi ce qui manque à la petite maison de
    pierre de l'essai « bâtiments ».
17. **Xéros dans la trémie** (`coq-escalier.png`, 8ᵉ marche) : quand l'étage s'affiche, le bord du plancher lui cache les jambes. On
    garde le rendu exact (on voit qu'il sort du trou), ou on le dessine par-dessus le plancher jusqu'à ce qu'il soit en haut ?
    *Recommandation : le rendu exact*, c'est ce qu'on verrait, et cela dure deux pas.
18. **La cloison de l'étage** (fille / parents) : en pan de bois chaulé (les remplissages de la maison de Xéros, réutilisés, mais un
    trait de 3 px vu d'en haut), ou en pierre de 40 cm comme les refends ? *Recommandation : la pierre*, qui se lit et va avec la
    maison ; la chambre de la fille perd 25 cm.

---

## 9. Le catalogue des pièces (version A, une par une)

La maison ne marche que si chacune de ses pièces existe. Voici toutes celles de la version A, avec les réponses aux 18 questions
(moyen appareil, pierre nue layée et ciselée, laves, vitraux en haut, escalier de pierre, enfilade, coq sur la clef et dans la
verdure, deux tentures). **Une seule source** : `art/proposals/coq-catalogue-data.ts` (clé, dimensions, matière, part pleine, vues,
pièce du jeu reprise, combien). Les planches et ce tableau en sortent. Les dessins sont du pixel-artist (section 7).

- **La masse** : le volume de la boîte × la densité × la part pleine, comme `src/content/mass.ts` (calcaire 2 400 kg/m³, bois vert
  900, fer 7 870, celui que la forge ajoute). « À deux, ou plus » : au-dessus des 70 kg que Xéros porte seul (`carry` de
  strength.json). La plupart des pierres de taille sont dans ce cas (question 22).
- **Les vues** : R0, la vue du sud ; R1 à R3, un quart de tour de plus à chaque fois, dans le sens des aiguilles d'une montre
  (docs/STYLE.md). `symmetric` : R2 = R0 et R3 = R1, deux dessins. Les quatre vues de chaque pièce sont sur les planches.
- **Le gabarit** : la silhouette de chaque vue mesurée contre `expectedSize` de ses dimensions (`src/content/gabarit.ts`, 2 px de
  tolérance). Les vues nord-sud des pièces de bois couchées sont jugées par la règle D, comme au jeu.
- **Refaire** : `npx tsx tools/essai-coq-catalogue-pierre.ts`, `npx tsx tools/essai-coq-catalogue-bois.ts`, puis
  `npx tsx tools/essai-coq-catalogue-table.ts`, qui écrit ce tableau.

#### La pierre de taille (assises de 30 cm)

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **carreau de 40** `ashlar-block-40` | 40 × 20 × 30 | 58 kg | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | environ 700 |
| **carreau de 60** `ashlar-block-60` | 60 × 20 × 30 | 86 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | environ 1 200 |
| **carreau de 80** `ashlar-block-80` | 80 × 20 × 30 | 115 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | environ 500 |
| **boutisse** `ashlar-header` | 30 × 60 × 30 | 130 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | environ 350 |
| **pierre d'angle** `ashlar-quoin` | 60 × 40 × 30 | 173 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 72 (4 angles × 18 assises) |
| **pierre de tableau** `ashlar-jamb` | 40 × 60 × 30 | 173 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | environ 90 |
| **cordon** `ashlar-string-course` | 60 × 30 × 20 | 82 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 78 (46 m de façade) |
| **corbeau** `ashlar-corbel` | 30 × 40 × 30 | 69 kg | calcaire | R0 R1 R2 R3 | OK | nouvelle | 22 |
| **bloc biais** `ashlar-slope-block` | 60 × 20 × 30 | 65 kg | calcaire | R0 R1 R2 R3 | HORS TOLÉRANCE (R3 : 4 × 9 px pour 4 × 12) | nouvelle | environ 80 |
| **dalle de rampant** `gable-coping` | 60 × 70 × 15 | 151 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 36 (4 rampants de 4,80 m) |
| **seuil de pierre** `threshold-stone` | 120 × 50 × 20 | 274 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | existe : `threshold-stone` | 1 |
| **seuil intérieur** `inner-threshold-stone` | 120 × 30 × 20 | 164 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | existe : `inner-threshold-stone` | 5 |

#### Les sols

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **dalle de sol** `floor-flagstone` | 60 × 40 × 8 | 46 kg | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | environ 230 (55 m²) |
| **planche de plancher** `wood-piece:big:plank` | 400 × 25 × 3 | 27 kg | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | HORS TOLÉRANCE (R0 : 80 × 6 px pour 80 × 3 ; R1 : 6 × 80 px pour 5 × 41) | existe : `wood-piece (gros, planche)` | environ 85 (8 rangs de 22 planches de 4 m) |
| **terre battue (rappel)** `packed-earth` | — | — | terre | une (ronde) | OK | existe : `le sol calculé des intérieurs (world/buildingFloor.ts)` | la cuisine (26 m²) |

#### La charpente et le plancher

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **solive** `wood-piece:normal:beam-560` | 560 × 20 × 20 | 202 kg (à deux, ou plus) | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre)` | 30 (tous les 50 cm) |
| **muraillère** `wood-piece:normal:beam-wallplate` | 480 × 20 × 20 | 173 kg (à deux, ou plus) | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre)` | 8 (deux files, les pièces entées) |
| **chevêtre** `wood-piece:normal:beam-120` | 120 × 20 × 20 | 43 kg | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre)` | 2 |
| **panne** `wood-piece:normal:beam-purlin` | 500 × 20 × 20 | 180 kg (à deux, ou plus) | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre)` | 15 (faîtière et deux pannes par pan, 5 travées) |
| **entrait (une moitié)** `wood-piece:normal:beam-tie` | 360 × 20 × 20 | 130 kg (à deux, ou plus) | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre)` | 2 (entées) |
| **arbalétrier** `wood-piece:normal:beam-principal` | 20 × 340 × 340 | 173 kg (à deux, ou plus) | bois (chêne) | R0 R1 R2 R3 | HORS TOLÉRANCE (R1 : 71 × 75 px pour 68 × 72 ; R2 : 4 × 6 px pour 4 × 136 ; R3 : 71 × 75 px pour 68 × 72) | existe : `wood-piece (normal, poutre)` | 2 |
| **poinçon** `wood-piece:normal:beam-kingpost` | 20 × 20 × 340 | 122 kg (à deux, ou plus) | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre, debout)` | 1 |
| **sablière** `wood-piece:normal:beam-plate` | 560 × 20 × 20 | 202 kg (à deux, ou plus) | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre)` | 6 |
| **chevron** `wood-piece:normal:rafter` | 10 × 340 × 340 | 43 kg | bois (chêne) | R0 R1 R2 R3 | HORS TOLÉRANCE (R2 : 2 × 3 px pour 2 × 136) | nouvel aspect du bois (`wood.json`) | 82 (tous les 40 cm, deux pans) |
| **latte** `wood-piece:pole:lath` | 400 × 6 × 3 | 6,5 kg | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | HORS TOLÉRANCE (R0 : 80 × 4 px pour 80 × 1) | existe : `wood-piece (perche, latte)` | environ 120 (un rang par rang de laves) |

#### Le toit

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **lave** `stone-slate` | 40 × 50 × 4 | 15 kg | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle : **la seule lauze du jeu** (remplace celle de la forge) | environ 5 000 (170 m², 3 épaisseurs) |
| **faîtière de pierre** `ridge-stone` | 40 × 60 × 20 | 58 kg | calcaire | R0 R1 (R2 = R0, R3 = R1) | HORS TOLÉRANCE (R0 : 8 × 7 px pour 8 × 10) | nouvelle | 41 (16,40 m de faîte) |
| **couronnement** `chimney-cap` | 140 × 100 × 10 | 279 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | existe : `chimney-cap` | 2 |
| **fronton de lucarne** `dormer-pediment` | 120 × 30 × 70 | 302 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | HORS TOLÉRANCE (R1 : 6 × 21 px pour 6 × 26 ; R3 : 6 × 21 px pour 6 × 26) | nouvelle | 1 |
| **potence à poulie** `hoist-beam` | 20 × 100 × 20 | 32 kg | bois (chêne) | R0 R1 R2 R3 | OK | nouvelle | 1 |

#### L'escalier et la trémie

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **marche de pierre** `stone-step` | 100 × 30 × 19 | 137 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 14 |
| **pierre d'échiffre** `stair-stringer-block` | 60 × 20 × 30 | 69 kg | calcaire | R0 R1 R2 R3 | OK | nouvelle | environ 20 |
| **poteau de garde-corps** `wood-piece:normal:post` | 10 × 10 × 100 | 9,0 kg | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK | nouvel aspect du bois (`wood.json`) | 4 |
| **main courante** `wood-piece:normal:rail` | 280 × 10 × 10 | 25 kg | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | nouvel aspect du bois (`wood.json`) | 2 (280 et 100 cm) |
| **balustre** `wood-piece:pole:lath-baluster` | 6 × 3 × 80 | 1,3 kg | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK | existe : `wood-piece (perche, latte, debout)` | 24 (tous les 15 cm) |

#### Les baies (croisée, demi-croisée, porte)

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **appui de baie** `window-sill` | 125 × 30 × 15 | 135 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 11 |
| **linteau de baie** `window-lintel` | 145 × 30 × 30 | 313 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 12 |
| **meneau du bas** `mullion-low` | 15 × 20 × 90 | 65 kg | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | 6 |
| **meneau du haut** `mullion-high` | 15 × 20 × 55 | 40 kg | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | 6 |
| **traverse** `transom` | 105 × 20 × 15 | 76 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | 11 |
| **vitrail en losanges** `leaded-glass` | 45 × 3 × 55 | 4,0 kg | verre et plomb | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | 12 (croisées) + 5 (impostes des demi-croisées, 105 × 45) |
| **volet de croisée** `casement-shutter` | 45 × 3 × 90 | 9,8 kg | bois (chêne) | R0 R1 R2 R3 | OK | nouvelle | 22 |
| **barreau de fer** `window-bar` | 3 × 3 × 90 | 4,5 kg | fer | une (ronde) | OK | nouvelle | 20 (4 par demi-croisée) |
| **claveau de l'arc** `door-voussoir` | 30 × 60 × 30 | 105 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 8 |
| **clef au coq** `door-keystone` | 30 × 60 × 35 | 124 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 1 |
| **sommier de l'arc** `door-springer` | 40 × 60 × 30 | 164 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 2 |
| **porte de chêne en arc** `oak-arch-door` | 110 × 8 × 220 | 162 kg (à deux, ou plus) | bois (chêne) | R0 R1 R2 R3 | HORS TOLÉRANCE (R1 : 2 × 60 px pour 2 × 66 ; R3 : 2 × 60 px pour 2 × 66 ; R0 : 2 × 60 px pour 2 × 66 ; R2 : 2 × 60 px pour 2 × 66) | nouvelle | 1 (et son état ouvert) |

#### Les refends et la cloison

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **boutisse de refend** `ashlar-header-40` | 30 × 40 × 30 | 86 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | environ 200 |
| **linteau de porte intérieure** `wood-piece:normal:beam-inner-lintel` | 130 × 20 × 20 | 47 kg | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre)` | 10 (deux par porte) |
| **porte intérieure** `inner-door` | 90 × 5 × 180 | 44 kg | bois (chêne) | R0 R1 R2 R3 | OK | existe : `inner-door` | 5 |

#### Les cheminées

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **jambage de cheminée** `fireplace-jamb` | 40 × 50 × 110 | 528 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 2 (la salle) |
| **console de hotte** `fireplace-console` | 40 × 60 × 30 | 121 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | HORS TOLÉRANCE (R0 : 8 × 9 px pour 8 × 12) | nouvelle | 2 (la salle) |
| **claveau de manteau** `mantel-voussoir` | 30 × 40 × 40 | 104 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 8 (la salle, 2,40 m) |
| **contrecœur** `fireback` | 120 × 10 × 100 | 288 kg (à deux, ou plus) | calcaire | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | 3 |
| **jambage de cheminée de chambre** `small-fireplace-jamb` | 30 × 40 × 100 | 288 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 2 |
| **linteau de cheminée de chambre** `small-fireplace-lintel` | 160 × 30 × 30 | 346 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 1 |
| **poutre de manteau** `wood-piece:normal:beam-mantel` | 260 × 20 × 20 | 94 kg (à deux, ou plus) | bois (chêne) | R0 R1 (R2 = R0, R3 = R1) | OK (R1 par la règle D) | existe : `wood-piece (normal, poutre)` | 1 (la cuisine) |
| **âtre** `stone-hearth` | 220 × 110 × 150 | 3 659 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | existe : `stone-hearth` | 1 (la cuisine) |
| **évier de pierre** `stone-sink` | 80 × 50 × 15 | 101 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 1 (la cuisine) |
| **dalle de potager** `stove-slab` | 120 × 60 × 12 | 176 kg (à deux, ou plus) | calcaire | R0 R1 R2 R3 | OK | nouvelle | 1 (la cuisine) |

#### Les meubles nouveaux et les tentures

| Pièce | Dimensions (cm) | Masse | Matière | Vues | Gabarit | Au jeu | Combien |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **lit à courtines** `canopy-bed` | 160 × 210 × 200 | 121 kg (à deux, ou plus) | bois (chêne) | R0 R1 R2 R3 | OK | nouvelle | 1 |
| **dressoir** `dresser` | 100 × 45 × 180 | 73 kg (à deux, ou plus) | bois (chêne) | R0 R1 R2 R3 | HORS TOLÉRANCE (R0 : 22 × 43 px pour 20 × 41) | nouvelle | 1 |
| **chaise à haut dossier** `high-chair` | 55 × 50 × 130 | 26 kg | bois (chêne) | R0 R1 R2 R3 | HORS TOLÉRANCE (R2 : 10 × 27 px pour 11 × 31) | nouvelle | 1 |
| **pétrin** `kneading-trough` | 150 × 60 × 80 | 78 kg (à deux, ou plus) | bois (chêne) | R0 R1 R2 R3 | OK | nouvelle | 1 |
| **écritoire** `writing-desk` | 90 × 60 × 75 | 29 kg | bois (chêne) | R0 R1 R2 R3 | HORS TOLÉRANCE (R3 : 12 × 27 px pour 12 × 24) | nouvelle | 1 |
| **table de tailleuse** `tailor-table` | 140 × 70 × 75 | 33 kg | bois (chêne) | R0 R1 R2 R3 | OK | nouvelle | 1 |
| **coupon d'étoffe** `cloth-bolt` | 40 × 30 × 10 | 2,0 kg | laine, étoffe ou étain | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | quelques-uns |
| **étains (plat, pichet)** `pewter` | 30 × 30 × 25 | 2,0 kg | laine, étoffe ou étain | une (ronde) | OK | nouvelle | 6 |
| **lit défait (état)** `bed:unmade` | 150 × 200 × 80 | 65 kg | bois (chêne) | R0 R1 R2 R3 | HORS TOLÉRANCE (R2 : 31 × 30 px pour 30 × 36) | existe : `bed` | 1 (le fainéant) |
| **verdure au coq** `verdure-tapestry` | 240 × 5 × 160 | 8,0 kg | laine, étoffe ou étain | R0 R1 R2 R3 | OK | nouvelle | 1 (la salle) |
| **tenture** `wall-hanging` | 160 × 5 × 120 | 3,0 kg | laine, étoffe ou étain | R0 R1 R2 R3 | OK | nouvelle | 1 (la chambre) |
| **tringle de fer** `hanging-rod` | 260 × 6 × 8 | 2,9 kg | fer | R0 R1 (R2 = R0, R3 = R1) | OK | nouvelle | 2 |

*72 pièces ; 226 vues mesurées, 20 hors tolérance (± 2 px, `TOLERANCE` de src/content/gabarit.ts).*


### Les écarts au gabarit, un par un

Aucun n'est une faute de dessin. Ce sont tous des pièces qui ne remplissent pas leur boîte, ou des images du jeu :

| Pièce, vue | Pourquoi |
| --- | --- |
| bloc biais R3, faîtière R0, fronton R1 et R3, console de hotte R0 | la pièce n'est pas une boîte : la pente à 45°, le V du faîte, le triangle, la gorge ne remplissent pas le haut de la boîte |
| planche de plancher R0 et R1 (image du jeu) | la pièce de bois du jeu a 6 px de haut pour 3 cm ; la boîte en voudrait 3 |
| latte R0 et R1 (image du jeu) | la latte de 3 cm fait 4 px au jeu, pas 1 |
| arbalétrier R1 et R3 (71 × 75 pour 68 × 72) | une poutre de 20 cm posée à 45° déborde sa boîte de 340 cm : la boîte juste serait 355 × 355 (à corriger dans les données) |
| arbalétrier et chevron R2 | posés à 45°, vus par leur tranche : c'est la projection |
| poinçon R0 | debout, la règle D debout (la largeur de la poutre couchée) |
| porte en arc R1, R3, ouverte R0, R2 | le plein cintre n'a pas toute sa hauteur sur toute sa largeur |
| dressoir R0 (validé) | la corniche déborde de 2,5 cm de chaque côté ; la vue validée est gardée |
| chaise R2, lit défait R2 | vus du nord, le dossier ou le chevet cachent le siège ou le lit : la boîte surestime |
| écritoire R3 | le pupitre et les livres montent à 92 cm : la hauteur juste est 90, pas 75 (à corriger dans les données) |

### Ce que le catalogue a appris

- **Le mur se fait de peu de pièces** : trois carreaux, une boutisse, la pierre d'angle, la pierre de tableau. On le voit sur la
  planche « dans le mur » (`coq-catalogue-pierre-1.png`, une lettre par bloc). Il faut environ **2 800 blocs et 430 t de pierre**
  (l'ordre de grandeur : 500 m² de parement, 5,6 blocs au m²). Le toit pèse environ 100 t de laves.
- **Les longueurs 40, 60 et 80 avec une boutisse de 30 de face** : une recherche complète du pixel-artist le montre, aucun
  morceau de cinq assises avec chaîne d'angle et tableau ne garde tous ses joints à 15 cm d'écart. Il reste un joint à 10 cm
  (en rouge sur la planche). Le parement validé (`ashlarWall`) tire, lui, des blocs de 50 à 90 cm. Il faut accorder les deux
  (question 24).
- **La pierre d'angle et la pierre de tableau** d'une assise sur deux ne sont pas la même pierre tournée : à cause de leurs deux
  faces vues, il faut la retourner lit pour lit (en miroir). Une pièce, quatre vues, posée tantôt dans un sens, tantôt dans l'autre.
- **La clef au coq de 30 cm** ne laisse que 4 px de face : le coq y fait 4 × 4 px, à peine lisible. Le coq validé fait 8 × 6 px, sur
  une clef d'environ 50 cm. La planche montre les deux (question 25).
- **Le sommier de l'arc** porte les dix premiers degrés de l'arc. Les claveaux remplissent alors 0,73 de leur boîte, au lieu de
  0,81 : 95 kg chacun, au lieu de 105.
- **Le balustre** : la latte existe au jeu, mais pas debout. Le pixel-artist l'a dessinée debout, 2 × 17 px : c'est une vue de plus
  à ajouter à la latte.
- **Les meubles** : les six vues du sud validées sont reprises au pixel près, et leurs trois autres vues sont dessinées. Pour
  l'instant, leurs modèles existent en double (`coq-maison.ts` n'exporte que leurs images) : à réunir à l'intégration.
- **Le lit défait** reprend la palette du lit du jeu, dont le bois est dans la rampe de l'écorce, pas dans les signes du bois
  patiné. C'est l'écart déjà présent au jeu, à reprendre avec le lit.
- **La verdure** est redessinée selon les remarques : des feuilles en lobes et en pointes, le coq sur un médaillon cerné d'ocre.

### Ce qui ne va pas encore

- La clef au coq de 30 cm est illisible (question 25). Les sommiers se distinguent mal des pierres de tableau, et les tableaux
  de l'arc se lisent comme des boîtes empilées.
- Les plus petites pièces (le carreau vu de côté, 4 px ; les meneaux, 3 px ; le barreau, 2 px ; les étains, 6 × 8 px) montrent
  peu de leur matière : c'est l'échelle.
- Le volet ouvert et la porte ouverte sont la pièce fermée tournée d'un quart, comme `inner-door-open` au jeu. Ils ne sont pas
  montrés posés dans leur baie.
- La potence à poulie : sa corde ne pend que de 5 cm, pour tenir dans la boîte de 20 × 100 × 20. Une vraie corde qui pend
  demande une boîte plus haute.

---

## 10. Les lauzes : une seule source, la nôtre

La session de la forge (branche `forge`, commit `e77165c`, `art/proposals/forge-toits.ts`) rendait alors les trois couvertures
(tuiles, bardeaux, lauzes) utilisables au jeu. Je recommandais de prendre sa lauze telle quelle. **Grégoire a choisi la nôtre
(réponse 26)** : notre lave, plus sombre et moussue, devient **la seule lauze du jeu**. Quand la maison s'intégrera, la lauze de
la forge sera remplacée par la nôtre : une seule source, celle de ce chantier. La forge elle-même est couverte de **bardeaux** :
rien ne change pour elle.

**Ce qui est au jeu depuis la fusion de la forge** (`origin/main`, 0694dc8) : la couverture `slates` de `art/world/forge-roofs.ts`
(la rampe du calcaire, rangs de 6 px à l'égout à 3 au faîte, lichens, lauzes de faîtage à cheval), à 55° et non plus à 37° comme
dans l'essai e77165c comparé ci-dessous ; deux pièces la portent, `lauze-roof-large` et `lauze-roof-large-pierced` (props.json,
fiche `docs/objets/lauze-roof-large.md`). **Aucun plan ne les pose** : les remplacer ne change aucun bâtiment du monde. À
l'intégration, `slatesTex` et les lauzes de faîtage prennent nos matières (pixel-artist), et les deux pièces gardent leur clé.

`coq-catalogue-pierre-2.png` met côte à côte notre pan à 45°, la lauze de l'essai de la forge sur le même pan à 45° et un
morceau du toit de l'atelier de cet essai, à 37°.

Ce qui diffère :

| | Notre lave (`laves`, `lavesRidge` de coq-pierre.ts) | La lauze de la forge (`roofQuads('slates')`) |
| --- | --- | --- |
| Couleurs | quatre signes propres, plus gris et plus sombres que le calcaire (#a8a194 à #463d3e) | la rampe du calcaire du monde (`! + = ; ~`), claire, crème |
| Largeur des dalles | 35 à 80 cm à l'égout, 35 % plus étroites vers le faîte ; coins arrondis | 25 à 50 cm, la même partout |
| Pureau | 25 cm à l'égout, 15 cm au faîte, le long de la pente | environ 21 cm à l'égout, 11 cm au faîte |
| Lecture d'un rang | le chant, son arête au soleil, le dos, le creux sous le rang du dessus | la tranche au jour, l'ombre portée |
| Pente | 45° | 37° (la charpente de la grange) |
| Épaisseur à l'égout | 3 px, des laves empilées | 2,5 px, d'un seul ton |
| Mousse, lichen | mousse verte en plaques, dans les creux | lichen jaune et vert sur 4 % des dalles |
| Faîtage | faîtières taillées en bâtière de 40 cm | grosses lauzes posées à cheval |
| Masse | environ 600 kg/m² (trois épaisseurs) | « 300 kg/m² et plus » |

**À l'œil**, la nôtre est plus sombre, plus moussue, à grandes dalles. Celle de la forge est plus claire, plus petite, plus
régulière. **À l'intégration**, la lauze du jeu prend de la nôtre : les quatre signes et leurs couleurs, la largeur des dalles qui
diminue vers le faîte, le pureau, la mousse dans les creux, l'épaisseur à l'égout, la faîtière de pierre taillée et la masse au
mètre carré (environ 600 kg/m², sur laquelle se calcule la charpente). La pente reste celle de chaque toit (45° ici, 55° pour les
pans de la forge) : la lauze se dessine sur toute pente, comme la forge l'a fait.

---

## 11. Les questions ouvertes par le catalogue

19. **La cloison de pierre de l'étage** (question 18, validée) : un mur de pierre de 40 cm entre la chambre du coq et celle de sa
    fille pèse environ 14 t. Il ne peut pas reposer sur le plancher de bois : rien au-dessus du vide, et un plancher ne porte pas un
    mur. Trois façons de faire :
    a. **un refend de fond** : le mur descend jusqu'au sol, à x 1300. La salle passe de 43 à 27 m² (4,80 × 5,60 m), et un **cabinet**
       de 13 m² naît sous la chambre de la fille (le coffre des comptes du coq). La grande table de 4,20 m y tient sans marge ;
    b. **une cloison de pan de bois chaulé** sous la ferme de la salle : légère, posée sur une solive doublée, faite des pièces qui
       existent déjà (`lime-panel`, `door-frame`). La salle garde ses 43 m². Il faudra dessiner sa coupe pour qu'elle se lise ;
    c. **une cloison de planches** (des planches debout entre deux poteaux) : la plus légère, la moins riche.
    *Recommandation : b.* « De plus grandes pièces » était la demande, et la salle de 43 m² est ce qui la tient. La ferme qui est
    au-dessus porte le toit, et la cloison n'a rien d'autre à porter. Le défaut de lecture (le trait de 3 px) se règle au dessin : une
    lisse chaulée plus large au-dessus de la coupe.
    **Réponse : b, validée.** La cloison de x 1300 est en pan de bois chaulé ; la salle garde ses 43 m².
20. **Le normal devant la façade** (case 88, 120 de la ferme du riche) : on le retire de la carte quand on pose la maison, ou on
    décale la maison ? *Recommandation : le retirer* (c'est un objet de Tiled ; la maison reste où elle est le mieux vue).
    **Réponse : validée.** Le normal de la case (88, 120) sera retiré de la carte quand on posera la maison.
21. **La parcelle « Logis du riche »** de la cour : elle garde sa destination de logis de ferme (le maître valet, les communs) ?
    *Recommandation : oui, telle quelle.*
    **Réponse : validée.** Elle reste pour un futur logis de ferme.
22. **Lever les pierres** : presque tous les blocs dépassent les 70 kg de Xéros (le carreau de 60 pèse 86 kg, le linteau de baie
    313 kg, le jambage de la cheminée 528 kg). Comme pour les poutres, l'aide de la mère (clic maintenu) jusqu'à environ 140 kg, et
    plus tard **une chèvre** (un engin de levage à treuil, et la louve qui tient le bloc) pour le reste ? *Recommandation : oui.* La
    chèvre est un autre chantier, et le monde ne limite pas : le refus dira ce qui manque à Xéros.
    **Réponse : validée.** L'aide de la mère jusqu'à environ 140 kg ; un engin de levage dans un chantier plus tard.
23. **Poser le mur** : bloc par bloc (2 800 poses), ou par **morceau de mur de pierre de taille** (un élément `wall` de toute
    longueur, comme le solin taillé, qui consomme ses blocs et les dessine depuis `walls.json`), avec les pièces de forme (angle,
    tableau, appui, linteau, cordon, claveaux, marches) posées une à une ? *Recommandation : le morceau de mur*, avec les pièces de
    forme une à une. Les blocs restent de vrais objets : on les taille, on les porte, le mur les prend.
    **Réponse : validée.** Les murs se bâtissent par morceaux qui consomment leurs blocs ; les pièces de forme se posent une à une.
24. **Les longueurs des carreaux** : 40, 60, 80 avec une boutisse de 30 de face (un joint reste à 10 cm), ou **50, 70, 90** avec une
    boutisse de 40 de face (les longueurs du parement validé) ? *Recommandation : 50, 70, 90 et une boutisse de 40.* Le parement
    validé n'en est pas changé, et les joints tiennent. Les masses passent à 72, 101, 130 et 173 kg.
    **Réponse : validée.** Carreaux de 50, 70 et 90 cm, boutisse de 40 de face. Le catalogue (dessins et tableau) est encore en 40,
    60 et 80 : il passera aux nouvelles longueurs avec les dessins de l'intégration (pixel-artist).
25. **La clef au coq** : 30 cm de large (le coq à 4 × 4 px, illisible) ou **50 × 60 × 50 cm** (le coq validé, 8 × 6 px, environ 300 kg) ?
    *Recommandation : 50 cm*, celle de la planche validée.
    **Réponse : validée.** La clef au coq fait 50 × 60 × 50 cm ; elle aussi passera dans les données à l'intégration.
26. **La lauze** : on prend celle de la forge telle qu'elle sera, et la maison du coq ne garde que sa pente et sa faîtière ; ou on
    propose à la forge de rapprocher sa lauze de la nôtre (plus grande, plus sombre, de la mousse plutôt que du lichen) ? *Recommandation :
    prendre celle de la forge telle quelle.* Une seule source, et c'est la forge qui la met au jeu. La faîtière de pierre de ce
    catalogue lui est proposée.
    **Réponse : notre lave**, plus sombre et moussue, devient la seule lauze du jeu ; elle remplacera celle de la forge à
    l'intégration de la maison. La forge est en bardeaux : rien ne change pour elle (section 10). Le tableau et la planche le
    disent déjà (« la seule lauze »).
27. **Les dimensions à corriger** (relevées par les dessins) : l'arbalétrier et le chevron en boîte de 355 × 355 et 347 × 347 (et
    non 340), l'écritoire à 90 cm de haut (et non 75), les claveaux à 0,73 de plein. *Recommandation : oui*, à l'intégration de
    chaque pièce.
    **Réponse : validée**, à l'intégration de chaque pièce.

---

## 12. Le cadrage technique : l'étage sur le relief de main (4 novembre)

`origin/main` (9616dd8 : relief, sangliers, vie de Xéros) est fusionné dans `maison-coq`, sans conflit. Cette section remplace la
section 6, écrite avant que le relief existe, partout où elles diffèrent.

### 12.1 Ce que main donne, et ce qui manque (faits, lus dans le code)

| Ce qui existe | Où | Ce qui manque pour l'étage |
| --- | --- | --- |
| La hauteur du sol est **une fonction du point** (`heightAt`, grille de 40 cm) ; Xéros n'a pas de hauteur à lui | `world/relief.ts` | deux sols au même (x, y) : la salle à 0, la chambre à 2,85 m |
| Chaque pas de la physique est jugé depuis le pas d'avant (`worldstep`, `stepRefusal`, la glissade, le refus dit une fois) | `systems/footing.ts` | le pas sur une marche posée (19 cm), le bord de la trémie |
| Tout ce qui est affiché monte de la hauteur **du sol sous lui** (`LiftPass`) ; **inactif dans un intérieur** (carte plate) | `systems/lift.ts` | Xéros et ce qui est posé à l'étage montent de **leur** hauteur |
| La caméra suit l'image soulevée : `setFollowOffset` posé **une fois**, à l'arrivée | `WorldScene.create` | le décalage suit Xéros à chaque image (57 px dans l'escalier) |
| Un intérieur est **une carte à part** (`interieur:<carte>:<x>,<y>`), plate ; on y voit ce qui est sous la tête (`INTERIOR.headroom`, 190 cm), le mur sud en coupe | `world/interior.ts`, `interiorMap.ts` | un intérieur à deux niveaux, chacun avec ses pièces, sa coupe, ses fenêtres |
| Une pièce posée bloque à **toute hauteur** si elle est sous `BUILD.high` (2 m), sinon **jamais** | `blocks` de `world/build.ts`, `placeBuild` de `GameMap.ts` | un lit de l'étage bloque à l'étage, pas dans la salle dessous |
| Ce qui est au sol, né ou en tas n'a que `x`, `y` | `GameState.ts` (`GroundItemSchema`, `Spawned`, piles) | la hache posée sur le plancher reste sur le plancher |
| Le mode construction pose sur **le plus haut dessus** sous l'emprise (`aimAt`, `supportAt`), vise par `pick` | `world/build.ts`, `systems/build.ts` | viser l'étage une fois les murs montés : un niveau affiché |
| Un mur (`wall` de props.json) est un morceau **de toute longueur et de hauteur fixe** (le solin : 40 cm), dessiné par `world/walls.ts` | `walls.json`, `wallRuns.ts` | le mur de pierre de taille, en assises de 30 cm |

### 12.2 Les dessus qui se marchent : `src/world/decks.ts` (nouveau, sans Phaser)

- **Une capacité en données** : `walk: true` dans props.json (la dalle de sol `floor-flagstone`, la marche `stone-step`) et dans
  l'aspect planche de `wood.json` (le plancher). Rien d'autre ne devient marchable : une bille couchée bloque comme aujourd'hui.
- `decksOf(pieces)` : le dessus de chaque pièce `walk`, sa **boîte exacte** (x, y, w, d en cm, et son haut `z + h`), jamais
  rastérisée : un giron de 26 cm reste une marche de 19 cm, pas une pente de 73 %. Indexé par cases de 1,60 m pour aller vite (85
  planches, 230 dalles, 15 marches).
- `floorAt(decks, terrain, x, y, z, mob)` : **le sol sous les pieds**, le plus haut dessus qui couvre ce point **sans dépasser
  `z + step`** et qui a la tête libre au-dessus de lui (aucun autre dessus entre lui et lui + `INTERIOR.headroom`) ; sinon le terrain
  (`heightAt`, 0 dans un intérieur). Sous le plancher on reste en bas, sur la 3ᵉ marche on monte d'une marche.
- `deckRefusal(from, to, z, …)` : le pas d'un point à l'autre change de sol ; **plus haut que `step`**, refusé (« Trop haute pour lui
  (… ) ») ; **plus bas que `drop`**, refusé (« Trop haut pour lui (2,9 m). », le bord de la trémie sans garde-corps) ; entre les deux, il
  saute (il descend de côté depuis la 4ᵉ marche). Les mêmes textes que le relief (`refusalText`), le même `Mobility`.
- **Là où il n'y a aucun dessus** (tout le dehors d'aujourd'hui), rien ne change : la règle du relief seule, à l'identique.

### 12.3 La hauteur propre de Xéros : `z`

- `z` (cm) devient un **état de Xéros**, à côté de ses pieds : un champ du composant `Mobility` (la capacité reste dans `def`).
- **À chaque pas de la physique** (`Footing`, `worldstep`, déjà là) : `z` devient `floorAt` du nouveau point, depuis le `z` du pas
  d'avant ; un pas refusé le ramène et le fait glisser, comme contre le relief. Dehors sans dessus, `z = heightAt`.
- **Le changement de niveau ne peut pas être sauté** (la règle « au franchissement » du dépôt) : `z` est suivi pas de physique par
  pas de physique, et le niveau affiché se lit de `z` ; une machine lente qui fait trois pas par image passe quand même par chaque
  marche. `test-etage` le vérifie à 1, 3 et 8 pas par image.
- **Une pose** (arrivée par une porte, rechargement, ?dieu, test : `PLACED` de footing.ts) prend le `z` donné (la sauvegarde) et se
  recale sur le dessus le plus proche de ce `z` ; sans `z` donné, le sol le plus bas.
- **L'affichage** : `LiftPass` devient actif dans un intérieur qui a des dessus, et un objet peut porter sa hauteur
  (`setData('z', cm)`) : Xéros, ce qu'il tient (Hold suit l'image), ce qui est posé à l'étage. Sans `z`, la hauteur du sol sous lui,
  comme aujourd'hui. Les pièces posées en mode construction ont déjà leur `z` dans leur image (`buildLook`) : inchangées.
- **La caméra** : son décalage suit l'image de Xéros à chaque image, adouci (la même douceur que le suivi, 0,15) : elle glisse de
  57 px pendant la montée. Le dehors en profite : sur le chemin creux, la caméra suivra désormais la pente (aujourd'hui, figée à la
  hauteur d'arrivée).

### 12.4 Les meubles et les murs ne bloquent qu'à leur niveau

- Chaque corps d'une pièce posée garde **sa tranche** : de son `z` à `z + h` (sa boîte de `solidOf`). `blocks` perd sa coupure à 2 m
  (`BUILD.high`) : il ne dit plus que **si** la pièce a un corps (un `body` de props.json, une pièce de bois, pas un dessus `walk`).
- La collision de Xéros avec les obstacles passe par un `processCallback` d'Arcade : elle ne bloque que si la tranche de la pièce
  croise celle de Xéros (`z` à `z + XEROS_HEIGHT`). Le lit de l'étage, à 285, ne barre pas la salle ; la pierre d'échiffre, de 0 à
  266, ne barre pas l'étage ; un mur qui monte de fond barre les deux.
- **Les dessus ne sont jamais des obstacles** : la marche, la dalle et la planche se franchissent par la règle du pas (12.2), jamais
  par un corps (sinon Xéros sur la 7ᵉ marche serait arrêté par la 8ᵉ).
- **Ce qui ne change pas dehors** : une pièce posée sous 2 m bloquait déjà, et Xéros y est au sol, sa tranche les croise toujours ;
  une pièce posée au-dessus de 2 m (un linteau, une sablière) ne croise sa tranche que si Xéros monte à sa hauteur. Les objets de
  Tiled (arbres, rochers) n'ont pas de tranche : ils bloquent à toute hauteur, comme aujourd'hui. Les créatures gardent leur règle (au
  sol). `test:contrats`, `test:maison`, `test:interieur` et `test:portes` le gardent.

### 12.5 Ce qu'on pose à l'étage reste à l'étage

Le monde ne limite pas : poser la hache sur le plancher, y lâcher un fagot, y faire un tas, tout cela doit marcher. Un champ `z`
**optionnel** (cm, absent = au sol) sur ce qui est au sol (`GroundItemSchema`), ce qui est né (`Spawned`) et les tas (`piles`) ; `put`,
`dropTarget` et `ghostOf` (systems/hands.ts) posent sur le dessus sous la place visée, au plus `step` au-dessus de Xéros (une table
reste une table : on y pose comme aujourd'hui) ; l'image monte de son `z` (12.3), et ce qui est posé en haut ne se prend que d'en
haut (la portée compte la hauteur). Le lancer retombe sur le plus haut dessus qu'il croise (la règle du relief, en hauteurs absolues).
Champs optionnels : **une ancienne sauvegarde se lit telle quelle**, `SAVE_VERSION` ne monte pas pour eux.

### 12.6 Un seul niveau affiché à la fois, et le fondu

- **Les niveaux d'un bâtiment** (`storeysOf` de world/interior.ts) : les hauteurs de ses dessus qui couvrent au moins 4 m², deux
  hauteurs à moins de `step` l'une de l'autre n'en font qu'une (la dalle de 8 cm et la terre battue de la cuisine : le rez-de-chaussée,
  à 0) ; les marches, trop petites, ne sont pas des niveaux. Ici : 0 et 285.
- **Le niveau de Xéros** : le plus haut niveau dont le plancher est au plus à une demi-hauteur au-dessus de ses pieds
  (`z ≥ plancher − (plancher − niveau d'en dessous) / 2`, soit 142,5 cm) : il change **sur la 8ᵉ marche** (`z` = 152), dans les deux sens.
- **Ce qu'un niveau montre** (règle générale, pour tout bâtiment à étages) : une pièce posée est du niveau `k` si son haut est au moins à
  son plancher et sa base sous le plancher du niveau `k + 1` ; dans ce niveau, la règle d'aujourd'hui (ce qui passe au-dessus de la
  tête est caché, sauf dans la bande des murs) vaut à partir de son plancher. En bas : le mur jusqu'à l'arase du rez-de-chaussée, les
  meubles, l'escalier jusqu'à la 10ᵉ marche, les corbeaux et les muraillères contre le mur ; cachés : les solives, les planches, l'étage.
  En haut : les planches et tout ce qui est dessus, les murs de l'étage, la sablière ; cachés : le rez-de-chaussée, la charpente au-dessus
  de la tête, le grenier. Un bâtiment d'un seul niveau (toutes les maisons d'aujourd'hui) : exactement la règle d'aujourd'hui.
- **Par la trémie** (en haut) : le rez-de-chaussée est montré **dans le trou du plancher seulement** : un masque de géométrie Phaser,
  partagé, découpé dans l'image du trou au niveau des planches (le contour des dessus du niveau, moins là où il n'y en a pas), et voilé
  de la pénombre (`INTERIOR.shade`) : on voit l'escalier descendre dans l'ombre jusqu'aux dalles du passage. La terre battue de la carte
  de l'intérieur, plate, se voit dans le trou à sa vraie place (57 px plus bas que le plancher) : c'est la projection exacte.
- **Le fondu** : un système nouveau, `src/systems/storeys.ts` (appelé par `WorldScene.update` dans un intérieur à étages) : au
  changement de niveau, les pièces du niveau quitté vont vers 0 et celles du niveau atteint vers 1 en `ROOF.fadeMs` (250 ms), le masque
  de la trémie avec elles ; **pas de changement de carte, pas d'écran noir, aucun verrou** : Xéros continue de marcher pendant le fondu.
  Xéros sur la 8ᵉ marche, l'étage affiché, a les jambes cachées par le bord du plancher (réponse 17 : le rendu exact).
- **La lumière par niveau** : chaque niveau a ses fenêtres, ses taches de lumière (`lightsOf`) et sa pénombre (`ambientOf` de ses
  volets ouverts) ; au changement de niveau, la pénombre glisse vers celle du niveau atteint, dans le même fondu.
- **Dehors, rien ne change** : la maison est close, son toit ne s'efface jamais (`roofView`) ; une fenêtre du rez-de-chaussée au volet
  ouvert montre sa pièce (`windowFade`) ; celles de l'étage ne montrent rien (trop hautes : la règle de `windowRoom` ne prend que les
  fenêtres dont l'appui est sous `ROOF.window`).

### 12.7 La coupe des intérieurs sur deux niveaux

- **La recherche des pièces, par niveau** (`gridOf`, `buildingsOf`) : la même projection, dans la tranche du niveau (de plancher + 30
  à plancher + `INTERIOR.lintel`, au lieu de 30 à 240) ; au-dessus du rez-de-chaussée, le remplissage ne passe que sur les dessus de ce
  niveau (le trou de la trémie n'est pas une pièce) et part de **l'arrivée de chaque escalier** : un dessus du niveau qui touche un dessus
  plus bas d'au plus `step` (la dernière marche). On trouve la cuisine, le passage, la salle ; le palier, la chambre des garçons, celle
  du coq, celle de la fille. Les portes intérieures de l'étage les relient comme en bas, et l'escalier relie le palier au passage : **un
  seul bâtiment**, une seule carte d'intérieur.
- **La coupe** : le mur sud et les cloisons est-ouest de chaque niveau, de son plancher à plancher + `INTERIOR.headroom`, en coupe
  (`south`, `southPieces` par niveau) ; le mur du fond toujours derrière (`backCaps`, par niveau : les faces nord des pièces de ce
  niveau).
- **La carte de l'intérieur** (`interiorOf`) : une seule, l'emprise de toutes les pièces de tous les niveaux ; `InteriorMap` gagne
  `storeys` (par niveau : son plancher, ses pièces, `shell`, `south`, `southPieces`, `windows`, `lights`, `ambient`) ; les champs
  d'aujourd'hui restent ceux du rez-de-chaussée, pour que tout ce qui les lit marche sans changer. Les meubles posés dedans gardent leur
  `z` dans `builds` de la carte de l'intérieur ; les sorties restent celles des portes du rez-de-chaussée.
- **Les PNJ à l'étage** (la fille à sa table) viendront avec la famille, un autre chantier : rien n'est posé ici ; le point `Npc`
  recevra alors une propriété `z`.

### 12.8 Le mode construction : le niveau

- **Un réglage du niveau affiché** : un bouton « Niveau » du panneau (`src/build/panel.ts`, ▲ ▼ et le niveau en clair : « Rez-de-
  chaussée », « Étage 1 », « Tout ») et la touche **N** (lue par sa place, `KeyN`), en boucle : tout, puis chaque niveau des bâtiments
  sous la caméra. Libre en mode construction (on y voit d'en haut, sans Xéros).
- **Ce qu'il fait** : au niveau `k`, les pièces au-dessus du niveau sont en fantôme très clair (`BUILD.refused`) ou cachées, la règle de
  12.6 ; **la visée** (`aimAt`, `supportAt`) ne prend que les dessus jusqu'au plancher de ce niveau + sa hauteur sous plafond : une table
  posée « à l'étage » tombe sur le plancher, pas sur le toit ; `pick` vise à la hauteur de ce niveau (le point vu, soulevé de 57 px).
- **Ce qui ne change pas** : T et G montent et descendent d'un cran, R tourne, les plans s'enregistrent et se posent d'un coup ; le
  niveau n'est pas gardé dans la sauvegarde (comme la caméra du mode construction).

### 12.9 Monter : la vitesse et le souffle

- **La vitesse** : sur un pas qui monte d'une marche, la marche × `climb` (une part de la marche, `PLAYER.climb` de config.ts, 0,75
  proposé), dans `systems/speeds.ts` : jamais une vitesse à part ; en descendant, la marche. Le relief n'est pas touché (ses pentes de
  20 % au plus se marchent à pleine allure, comme décidé au chantier « relief »).
- **Le souffle** : monter chargé coûte, au mètre de montée et au kilo porté (`breath.perSec` ne convient pas : c'est la hauteur qui
  coûte, pas le temps) : `breath.climbPerKgM` de stamina.json (une valeur proposée : un sac de 30 kg en haut de l'escalier, 2,85 m,
  coûte environ 15 de souffle sur 100). À vide, rien : on ne compte pas l'effort de porter son corps, nulle part dans le jeu.

### 12.10 La sauvegarde

- `Where` (save.ts) gagne `z` (optionnel) : la page rechargée en haut le retrouve en haut ; absent, le sol le plus bas.
- Les `z` de ce qui est posé (12.5) : optionnels.
- `missingContent` : rien de nouveau (la maison est un plan de Tiled, `seedPlans`, déjà contrôlé).
- **`SAVE_VERSION` ne monte pas**, sauf si l'exécution trouve un format que l'ancien ne lit plus (je le dirai au récapitulatif).

### 12.11 Les étapes et les fichiers touchés

1. **Le moteur de l'étage, testé seul, sans dessin** (sur des pièces d'essai : une dalle, une planche, une marche qui existent en
   données avec un dessin provisoire hors jeu, ou des pièces existantes marquées `walk` dans le seul banc de test) :
   - nouveaux : `src/world/decks.ts`, `src/systems/storeys.ts`, `tools/test-etage.ts` (dans `test:fast`) ;
   - touchés : `src/entities/Mobility.ts` (`z`), `src/systems/footing.ts` (le pas sur les dessus, `z`), `src/systems/lift.ts`
     (actif dans un intérieur à étages, la hauteur propre), `src/world/build.ts` (`blocks` sans `BUILD.high`, la tranche, `aimAt`
     borné au niveau), `src/world/GameMap.ts` (le `processCallback` des obstacles, la tranche de chaque zone), `src/world/interior.ts`
     (`storeysOf`, la recherche et la coupe par niveau), `src/world/interiorMap.ts` (`storeys`), `src/world/interiorView.ts` (la coupe
     par niveau), `src/systems/interiors.ts`, `src/scenes/WorldScene.ts` (la caméra, l'appel de `storeys.ts`), `src/systems/hands.ts`
     (poser sur un dessus), `src/world/throw.ts`, `src/state/GameState.ts` (les `z` optionnels), `src/state/save.ts` et
     `src/systems/autosave.ts` (`Where.z`), `src/systems/speeds.ts`, `src/config.ts` (`PLAYER.climb`, `INTERIOR.storey`),
     `src/content/types.ts` (`walk`, `climbPerKgM`), `src/content/stamina.json`, `src/systems/build.ts` et `src/build/panel.ts` (le
     niveau, N), `src/content/validate.ts` (un `walk` a une boîte pleine et pas de `body`).
2. **Les dessins d'intégration** (pixel-artist), planche `.art-preview/coq-integration-*.png`, puis **DESSIN À VALIDER** et l'attente :
   le mur de pierre de taille (`wall: "ashlar"`, ses pierres dans walls.json, les carreaux de 50, 70 et 90 cm, la boutisse de 40), la
   clef au coq de 50 × 60 × 50 cm, la lave seule lauze (`slatesTex` et la faîtière de la forge remplacés, une seule source), la cloison
   de l'étage en pan de bois chaulé (sa lisse lisible vue d'en haut), les vues `-r2` des faces du dedans qui manquent, et le reste du
   catalogue mis aux nouvelles dimensions (réponse 27). Pendant l'attente : les fiches, les données sans image, la documentation.
3. **Après l'accord** : l'intégration (`art/`, `art/index.ts`, `props.json`, `wood.json`, `walls.json`), `npm run art`, les fiches de
   `docs/objets/` ; le plan bâti dans le mode construction par un scénario, `npm run test:maison-coq` (sa liste de montage dans
   `tools/lib/maison-coq.ts`, comme la maison de Xéros), enregistré `src/content/plans/maison-coq.json` ; posé dans
   `tiled/maps/ferme-du-riche.tmj` (le rectangle `Plan` et la parcelle `Parcel` « Maison du coq », section 1 ; le normal de la case
   (88, 120) retiré), `npm run maps`.
4. **Le scénario `npm run test:etage`** (partie neuve) : entrer par la porte en arc, monter l'escalier (le niveau change à la 8ᵉ marche,
   pas avant), le palier, la chambre du coq, la chambre de la fille ; recharger la page en haut (`__restart`, il est toujours en haut,
   l'étage affiché) ; redescendre, ressortir. Dans `SCENARIOS` de `tools/run-scenarios.ts`, `test:maison-coq` dans `HEAVY`.
5. **Les contrats** (`test:contrats`) : à la force et à l'escalade maximales, tout se monte ; à sa force, la trémie sans garde-corps
   refusée « pour lui » ; ce qui est posé à l'étage y reste (la matière se conserve, rechargée).
6. **La documentation** : CONCEPTION « L'étage » (le moteur) et « La maison du coq », ses limites (le grenier qui ne se visite pas, pas
   de cave, ni gens de maison ni famille, Xéros ne bâtit pas lui-même la maison : pas de chantier `plans.json`, la chèvre plus tard) ;
   CLAUDE.md, README, docs/COMMANDES.md (N en mode construction).
7. **La fusion** : `origin/main` de nouveau, `npm run build`, la suite complète des scénarios et `test:contrats` sur le dernier commit
   (un chantier moteur), puis main.

### 12.12 Les tests prévus

- **`tools/test-etage.ts`** (sans navigateur, dans `test:fast`) : `floorAt` (sous le plancher on reste en bas ; sur la marche on monte
  de 19 cm ; la tête libre) ; `deckRefusal` (une marche de 60 cm refusée, la trémie sans garde-corps refusée « Trop haut pour lui
  (2,9 m). », le saut de côté depuis la 4ᵉ marche permis) ; le changement de niveau à la 8ᵉ marche à 1, 3 et 8 pas de physique par
  image ; la tranche (le lit de l'étage ne bloque pas la salle, la pierre d'échiffre pas l'étage, le mur les deux) ; `storeysOf` (0 et
  285, la dalle de 8 cm fondue au rez-de-chaussée, les marches qui n'en sont pas) ; les pièces trouvées par niveau sur le plan
  `maison-coq` (3 en bas, 4 en haut, un seul bâtiment) ; la coupe par niveau ; ce que montre chaque niveau ; une maison d'un niveau
  (maison-xeros, cabane, grange, forge) **identique à aujourd'hui** (shell, south, rooms comparés).
- **Les scénarios qui gardent le reste** : `test:maison`, `test:interieur`, `test:portes`, `test:relief`, `test:construction`, `test:forge-
  visite` (la tranche et la caméra ne doivent rien y changer), et la suite complète avant la fusion.
- **`test:etage`** et **`test:maison-coq`** (12.11) ; un aperçu `.art-preview/coq-etage-jeu-*.png` pris dans le vrai jeu (au pied de
  l'escalier, sur la 7ᵉ et la 8ᵉ marche, en haut, par la trémie).

### 12.13 Les questions qui restent ouvertes

28. **La hauteur des murs de l'étage** : en assises réglées de 30 cm au-dessus du cordon (270-290), l'arase tombe à 530 (8 assises), pas à
    525 ni 545 ; avec la sablière de 20 cm, **le haut des murs passe de 545 à 550 cm** (le faîtage d'environ 915 à 920). On prend 550, ou
    on garde 545 avec une demi-assise de 15 cm sous la sablière ? *Recommandation : 550*, des assises toutes égales ; 5 cm ne changent ni
    la croisée ni le toit.
29. **Le morceau de mur de pierre de taille** : **une assise** de 30 cm de toute longueur par morceau (environ 250 poses pour la
    maison, les joints décalés d'une assise à l'autre par le dessin, le mur de chaque niveau fait des siennes), ou un morceau de la
    hauteur d'un niveau (une quarantaine de poses, mais un dessin de 2,70 m qui doit savoir où sont les baies) ? *Recommandation : une
    assise*, comme le solin : le dessin reste celui d'une rangée de blocs, et le niveau d'un morceau est sans ambiguïté.
30. **Le dallage** : dalle par dalle (environ 230 poses, de vraies pièces, comme le plancher planche par planche), ou un morceau de
    dallage de toute surface qui consomme ses dalles, comme le mur ? *Recommandation : dalle par dalle* : rien de nouveau dans le moteur,
    et chaque dalle reste un objet qu'on taille, porte et pose ; le scénario de montage est plus long, il va dans les scénarios lourds.

### 12.14 Les réponses de Grégoire (4 novembre) : la section 12 est validée

- **28 : oui**, les murs de l'étage montent à **550 cm**, en assises toutes égales de 30 cm (l'arase à 530, la sablière de 20 cm).
- **29 : oui**, **un pan de mur = une assise de 30 cm**, de toute longueur.
- **30 : non au dalle par dalle.** Par cohérence avec la réponse 23, **le dallage se pose par pans qui consomment leurs dalles** (un pan
  de dallage = une rangée de dalles de 40 cm, de toute longueur, comme le mur). La dalle seule reste posable une à une, pour les
  retouches.

### 12.15 Les dessins d'intégration (pixel-artist, hors jeu) : à valider

Le moteur de l'étage est fait et testé seul, sans dessin (commits « Étage, moteur (1) » et « (2) », `tools/test-etage.ts` dans
`test:fast`, CONCEPTION « L'étage »). La parcelle « Maison du coq » est posée dans `ferme-du-riche.tmj`, le normal de la case
(88, 120) retiré (réponse 20). Rien d'autre ne s'intègre avant l'accord de Grégoire sur ces planches (refaire :
`npx tsx tools/essai-coq-integration.ts`) :

| Planche | Ce qu'il faut y regarder |
| --- | --- |
| `.art-preview/coq-integration-mur.png` (x4) | les pierres du mur une à une (carreaux de 50, 70, 90, boutisse de 40, pierre d'angle, de tableau, recoupée ; trois tons), les mêmes comme objets qu'on porte, **le pan d'une assise** (pair, impair, R1, R2 nue et enduite, l'arase), le refend, **le mur de 9 assises** avec un angle et une demi-croisée (joints à 15 cm au moins d'une assise à l'autre) |
| `.art-preview/coq-integration-sol.png` (x3) | la dalle seule (les retouches), **le pan de dallage** (une rangée de 40 cm de toute longueur, joints décalés par la parité de la rangée), la salle dallée (189 dalles, 8,2 t) |
| `.art-preview/coq-integration-baies.png` (x4) | **la clef au coq de 50 cm**, le claveau à 0,73, l'arc remonté avec elle, les dimensions corrigées (arbalétrier, chevron, écritoire) |
| `.art-preview/coq-integration-lave.png` (x2) | **la lave, seule lauze du jeu** : `lauze-roof-large` à 55° avant et après, ses quatre vues, notre pan à 45° |
| `.art-preview/coq-integration-cloison.png` (x3) | **la cloison de l'étage en pan de bois chaulé**, de face, posée, et sa coupe vue de l'étage (la lisse chaulée de 25 cm, la porte qui se lit) |

Ce que l'intégration ajoutera : les pierres du mur en données (comme celles du solin) et le pan `ashlar-wall` (`wall: "ashlar"`, 60 cm,
et `ashlar-wall-40` pour les refends), dessiné par `world/walls.ts` ; le pan de dallage `flagstone-row` (`walk: true`) ; les carreaux,
la boutisse, la clef ; la texture de la lave à la place de `slatesTex` (les quatre signes `lave` dans `art/palette.ts`) ; la lisse
chaulée `lime-rail` et le remplissage bas `lime-panel-low`.

Deux choix, sur les planches :

31. **La face du dedans du mur** (R2 du pan, ce qu'on voit dans la maison) : la pierre nue (les mêmes joints, d'autres tons) ou un
    **enduit de chaux** ? *Recommandation : l'enduit*, comme dans les maisons de ce temps (une pierre de taille se montre dehors ; dedans,
    on enduit et on chaule, c'est plus clair et plus chaud), et la salle reste lisible avec sa tapisserie.
32. **La coupe de la cloison chaulée** : sa lisse est à 1,95-2,10 m, au-dessus de la coupe d'une cloison (1,90 m). La cloison est
    nord-sud : elle se voit entière, comme un mur de côté, sans coupe. Rien à changer au moteur. *Recommandation : la garder entière*,
    comme sur la planche « posée ».
