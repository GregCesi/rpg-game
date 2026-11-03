# Pièce de bois (`wood-piece`)

Décidé le 30 octobre 2026 (chantier « pièce de bois ») : tout le bois du monde est **un seul objet**, décrit par des réglages,
et non plus une collection de clés (billes numérotées, bille coin planté depuis chaque bout, demi-billes, quartiers, rondins,
poutres, chacun en est-ouest et en nord-sud). Cette fiche remplace celles de la bille coin planté, de la demi-bille, du quartier,
du rondin et de la poutre. Le contenu est dans `src/content/wood.json` ; voir CONCEPTION, *Le bois*.

## Identité
- Clé : `wood-piece` (props.json), la seule clé de bois. Image dans Tiled : `wood-piece` (la bille du gros, ronde, 1 m,
  est-ouest) ; en jeu, l'image s'assemble d'après les réglages.
- Réglages (GameState, `WoodPieceSchema` de `src/content/types.ts`) : `size`, le diamètre (`big` : 55 cm de bois, le gros arbre et
  le têtard ; `normal` : 30 cm ; `pole` : 12 cm, la perche, depuis le 31 octobre 2026) ; `length` en cm (sur la grille de 20 cm,
  60 cm au moins) ; `shape` (`round`, `half`, `quarter`, `plank` : la planche fendue, même date) ;
  `hewn` (faces finies à la doloire, comptées 3 par face : la poutre à 12) ; `dressed` (la face en cours, dressée sur une partie de
  la longueur : `from`, le bout d'où elle part, `start` ouest ou nord, `end` est ou sud ; `length` en cm ; une passe arrêtée par
  Échap, depuis le 1er novembre 2026) ; `axis` (`ew` est-ouest, `ns` nord-sud) ; `notch` (la coupe
  commencée : `at` cm du bout ouest ou nord, `hits`) ; `wedge` (le coin planté : `end`, le bout, `hits`, les coups de masse) ;
  `point` (le quartier seulement : `down`, pointe en bas, un sur deux dans une rangée de tas ; absent, sa position posé : écorce
  en bas, pointe en l'air) ; `peeled` (le rond écorcé : l'aspect `peeled`, le rondin écorcé de la cabane) ; `age` (neuf par défaut,
  `worn` patiné, `old` vieux : la teinte de son bois mis à nu, ses faces et son bois de bout ; l'écorce garde son brun ; CONCEPTION
  « L'âge du bois »). Le `face` d'avant (le côté de la face debout) a disparu le 31 octobre 2026 (sauvegarde 15).
- Section (wood.json, `section` de chaque aspect, « Les pièces fendues » de CONCEPTION) : la forme vue par le bout (rond, demi-rond,
  quart de rond, rectangle ; les faces dressées en `flats`), où est l'écorce, où est le cœur, sur quoi la pièce repose. Toutes ses
  vues couchées se calculent de là.
- Nom affiché, selon le diamètre et l'aspect (wood.json, `looks`) : bille, demi-bille, quartier, planche (le gros) ; rondin, rondin
  écorcé, poutre (le normal) ; perche. Genre du nom pour les messages : « elle » (bille, demi-bille, poutre), « il » (quartier, rondin).
- Nature : objet du monde (`props.json`), qui se prend quand il n'est pas trop lourd. Sa définition complète (dimensions,
  collision, prise, roulement, pivot, tas) se tire de ses réglages : `src/world/woodPiece.ts`.
- Mains : deux (couchée ; debout, aucune : voir *Debout*).

## Debout (`axis: 'up'`)
Décidé le 30 octobre 2026 (chantier « abri en vraies pièces »). Un chantier montre les vraies pièces posées : le poteau dressé de
l'abri est la pièce de bois elle-même, debout (`wood-piece` avec `axis: 'up'`, réglages gardés par GameState comme les autres), et
non plus un dessin à part. Même assemblage que la couchée (la tête en haut, le milieu répété, le pied en bas ; planche
`wood-normal-up`, parties `<aspect>-start|mid|end`), même teinte et mêmes faces d'un état donné (rond : écorce ; équarri : faces
claires dressées), la tête montrant le bois de bout, ses cernes, vu de dessus. Géométrie : `up` de chaque aspect du normal dans
`wood.json` (largeur `w`, rangées de tête `extra`, parties `start` et `end`, `lift` rangées vides sous le pied : le dé de 15 cm,
`body` : la collision au pied). Taille (règle D étendue, STYLE.md section 8) : largeur = l'épaisseur de la même pièce couchée est-ouest, **8 px** pour
la poutre comme pour le rondin ; hauteur = longueur + la tête (4 px) : poutre de 3 m **8 × 64**, de 1,80 m **8 × 40** (plus les 3
rangées du dé). Debout, la pièce ne se
prend pas, ne roule pas, ne pivote pas, ne se coupe ni ne s'équarrit (`woodDef` : pas de `take`, `roll`, `turn`). Seul le normal se
dresse. Elle ne vient que des places d'un plan (`accepts.wood`) : `lay` de `systems/site.ts`, `uprightOf` de `world/woodPiece.ts`
(diamètre, longueur et faces de la pièce posée ; ni coupe ni coin). Le chantier garde aussi la pièce d'origine (`pieces`).

## Masse
- Calculée (`"mass": "wood"`, `src/content/mass.ts`) : section du bois × longueur × 900 kg/m³ (`density` de wood.json). Section :
  le rond du diamètre ; la moitié pour une demi, le quart pour un quart ; une pièce qu'on équarrit perd à chaque face un quart de ce
  qui sépare son rond du carré de la poutre (20 × 20 cm).
- Pièces courantes : bille du gros de 1 m **214 kg** (ne se porte pas, se roule) ; demi-bille **107 kg** (ni portée, ni roulée) ;
  quartier **53,5 kg** (porté, lentement) ; rondin du normal de 1 m **63,6 kg** (porté, va en tas) ; rondin de 3 m **191 kg**
  (roulé) ; poutre de 3 m **108 kg**, de 1,80 m **64,8 kg** (portée) ; tronc du gros (4 m) **855 kg**, du têtard (2 m) **428 kg**,
  du normal (5,8 m) **369 kg** : ils ne bougent pas, c'est le calcul qui le dit.
- Perche (`pole`, 12 cm) : **10,2 kg** le mètre ; 4 m, 40,7 kg (portée, lentement) ; 6 m, 61 kg. Planche (`plank` : 3 × 25 cm de
  bois, `plank` de wood.json) : **6,75 kg** le mètre ; 2 m, 13,5 kg.
- Seuils de Xéros (`strength.json`) : porté jusqu'à 70 kg, marche normale jusqu'à 25 kg, roulé jusqu'à 300 kg.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Contour compris : longueur L ; diamètre 65 cm (gros), 40 cm (normal) ; demi : la moitié en hauteur ; poutre : 30 × 30 cm
  (20 × 20 de bois). Le quartier, un quart de rond écorce en bas, pointe en l'air, ses deux faces fendues à 45° : 39 cm de large
  (le rayon × √2) sur 27,5 de haut de bois, 49 × 37,5 cm contour compris, soit 20 × 11 px à 1 m est-ouest, 11 × 20 px nord-sud
  (règle D) ; nord-sud, le bout sud montre le triangle de la section, pointe en haut. `validate.ts` vérifie la silhouette de la
  demi-bille, du quartier (pointe en l'air et pointe en bas) et de la poutre, dans les deux sens, à 60 cm, 1 m, 2 m et 3 m (`woodSilhouettes`
  du manifeste, tirées par build-art des pièces assemblées).
- Est-ouest : L/5 px de long, plus une colonne d'ombre (21 px pour 1 m) ; hauteur de l'image selon l'aspect (`ew.h` : 16 pour
  la bille du gros, 10 pour le rondin). Nord-sud (règle D, rotation pure) : largeur selon l'aspect (`ns.w`), hauteur L/5 + `extra`
  px : la silhouette est celle de l'est-ouest inversée (13 × L/5 pour la bille, 11 pour le quartier, 8 pour le normal). La bille de 1 m du gros, étalon du gabarit : 20 × 13 px de silhouette (`dims` de `wood-piece` : 100 × 65 × 65).
- Collision : est-ouest, (L/5 − 1) px de long sur `ew.body.h` ; nord-sud, la même inversée (`ew.body.h` de large, L/5 − 1 de haut, son bas à `ns.bottom`).

## Vues
- Symétrie : deux vues (`views: "symmetric"`, couchée), le quartier aussi (sa section est symétrique : pointe en l'air dans les deux
  sens ; pointe en bas seulement en tas). Règle D (docs/STYLE.md section 8) : nord-sud, l'image et la collision sont celles de l'est-ouest inversées, à toute longueur (la bille de 1 m : 20 × 13 px est-ouest, 13 × 20 nord-sud) ; le bout coupé nord-sud est une bande au sud avec ses cernes. Contrôle : `npm run test:perspective`.
- Au sol : l'image s'assemble à sa longueur en trois parties, bout, milieu répété, bout, prises dans la planche de son diamètre
  (`wood-big`, `wood-normal`, et `-ns`), par les opérations de `src/world/woodShape.ts` (`composeOps`) : le jeu à la volée
  (`src/world/woodTexture.ts`), le dessin pour les images de 1 m (`art/world/wood-pieces.ts`). Jamais retournée.
- Les parties ne sont plus dessinées à la main (31 octobre 2026) : `art/world/wood-section.ts` les calcule de la section, étirée sur
  la longueur. Est-ouest, le travers remplit la collision (`ew.body.h` rangées : la profondeur à l'échelle du pas d'un tas), la
  hauteur ce qui reste de l'image (le flanc tourné vers nous) ; le bout ouest montre la face de coupe, la section écrasée en
  raccourci ; nord-sud, le dessus vu d'en haut et la face de coupe au sud, en raccourci. Lumière en haut à gauche. Les couleurs et
  les textures (écorce et ses sillons, fil des faces fendues et dressées, cernes et cœur des bouts) sont dans
  `art/world/wood-skin.ts`, réglées par le pixel-artist.
- Aspects : rond (4 images de roulement), demi (écorce en bas, face plate claire en l'air), quart (écorce en bas, pointe en l'air ;
  et pointe en bas, `quarter-down-…`), planche (le gros) ; une, deux, trois faces dressées, poutre (le normal : la doloire dresse
  le dessus, puis le sud, le nord, le dessous).
- Recouvrement : la pièce de devant (plus au sud) ou de dessus cache celle de derrière ou de dessous au pixel près ; des
  demi-billes côte à côte montrent leurs faces claires presque continues, l'écorce seulement sur la dernière, devant.
- Encoche : une bande à sa place (un tiers, deux tiers).
- Coin planté : la partie du bout où il est planté est remplacée (coin dans la face de coupe vue, tête qui dépasse au bout caché) ;
  il s'enfonce par paliers (3 images : il sort de 3, 2, 1 px) ; la fente court depuis ce bout sur la part de la longueur déjà
  fendue (étapes faites sur étapes à faire, `wedge.hits` sur `splitHits`) ; à la dernière étape, le bois grand ouvert un instant.
- Portée (`carry`), dans le sens de la marche : de face et de dos, par le bout (`held-wood-<diamètre>-<aspect>`, vue qui ne
  dépend pas de la longueur) ; de profil, la pièce assemblée à sa longueur, sans ombre, son milieu dans les mains.
- Case d'interface : `item-wood-<diamètre>-<aspect>`, et sa longueur écrite en bas de la case (« 1 m »).
- Fantôme : la pièce en transparence là où un clic ou A la posera, dans son sens : seule au sol, contre une pièce identique (le tas qui naît),
  ou à la place d'un tas.
- Invite de coupe : au-dessus de la coupe visée, les deux longueurs (« 3 m | 2,8 m ») ; le mot « couper » près de la case de la main de la cognée.

## Regroupement
Seule, ou en tas si elle se porte (70 kg ou moins), de toute longueur et de tout état. Un tas naît quand on la pose contre une pièce
identique seule au sol, et prend tout d'elle (diamètre, état, longueur, sens) ; il n'accepte que des pièces identiques. Sa forme se
calcule d'après la section (`src/world/woodPile.ts`) : pyramide de 6 pour le rond (même entamé à la doloire), rangées de 3 × 3 pour
la demi-bille et la poutre ; le quartier en triangles : dans chaque rangée, pointe en l'air, pointe en bas, pointe en l'air, à un
demi-pas (proposition à faire juger par Grégoire) ; est-ouest ou nord-sud. L'affichage va couche par couche, de l'arrière vers
l'avant. Exemples :
bille du gros de 1 m (non : 214 kg), rondin de 80 cm à 1 m, quartier jusqu'à 1,20 m (64 kg), demi-bille de 60 cm, poutre jusqu'à
1,80 m.

## Gestes
- Clic court, main vide : la prendre à deux mains si elle pèse 70 kg ou moins (sinon « Trop lourd(e) à porter. Pousse-le (-la) pour le (la)
  faire rouler. ») ; pas pendant une coupe ni avec un coin planté.
- Pousser (mains libres, contre elle) : la pièce ronde roule perpendiculairement à son axe jusqu'à 300 kg ; la poutre (« Elle ne
  roule pas : elle est carrée. »), une pièce à une face dressée, la demi-bille et le quartier (à plat) ne roulent pas.
- Clic maintenu au contact, mains libres : un quart de tour dans le sens des aiguilles d'une montre (est-ouest <-> nord-sud ; le
  quartier reste écorce en bas, pointe en l'air), à toute longueur, s'il y a la place. R en main : de même, elle sera posée
  dans ce sens.
- La portant, un clic (l'un ou l'autre) ou A (Q en QWERTY) : la poser là où le montre son fantôme (seule, contre une pièce identique, ou sur son tas).
- Clic de la main de la cognée, contre son flanc : la coupe s'aimante tous les 20 cm depuis le bout le plus proche de Xéros ; refusée si un
  morceau ferait moins de 60 cm (« Le bout serait trop court. »), sur une pièce de moins de 1,20 m (« Trop court pour être
  recoupé. »), sur une demi ou un quart (« On coupe avant de fendre. »), sur une pièce dressée (« On coupe avant d'équarrir. ») ;
  un clic lance le travail au coup (docs/CONCEPTION.md, « Le travail ») : la coupe se creuse en trois étapes (`cut.hits` de wood.json), le nombre de coups
  découle du diamètre (deux V d'une demi-épaisseur, `buckVolume`) et de la force, chaque coup payé au joule ; deux pièces.
- Clic de la main de la doloire, contre le flanc d'une pièce ronde du normal, à un bout : une passe le long de la pièce, sur le rail, la face
  dressée derrière Xéros (docs/CONCEPTION.md, « L'équarrissage par passes », fiche `broadaxe.md`) ; un pas ou Échap l'arrête, la face entamée
  est gardée et reprise là ; une passe par face, un quart de tour entre deux, la poutre à la quatrième ; le gros : « Trop grosse
  pour une poutre. » ; un travail au coup, payé au joule. Une face entamée : elle ne roule plus (« Il ne roule plus : une face est
  entamée. »), ne va pas en tas, ne se coupe ni ne se fend.
- Clic de la main du coin, à un bout d'une bille ou d'une demi-bille du gros, de toute longueur : il se plante d'un coup, sans geste ; depuis le flanc : « Le coin se plante dans le bout, là où on voit les cernes. » ; le quartier :
  « Trop mince pour le coin. » ; le normal : « Ce bois ne se fend pas : il se coupe et s'équarrit. ». 1 point (`plant` de `costs` : un geste sans matière).
- Clic de la main de la masse, depuis le bout du coin : un clic lance le travail au coup ; 3 étapes par mètre commencé (`splitHits` : 6 pour 2 m ;
  la fente court, le coin s'enfonce), le nombre de coups découlant de la fente (diamètre × longueur) et de la force (une trentaine
  pour une bille de 55 cm sur 1 m), et deux
  morceaux identiques, dans le même sens, côte à côte, dans la position de leur section : deux demi-billes écorce en bas, face en
  l'air ; deux quartiers écorce en bas, pointe en l'air (31 octobre 2026). Deux quartiers sont plus larges que leur demi-bille : si
  leur place est prise (la demi-bille voisine), ils s'écartent ensemble en travers, de part et d'autre, jusqu'à 12 px (`SPLIT` de
  config.ts) ; le coin au sol ; sans coin : « Il faut d'abord un coin. » ; depuis l'autre bout : « Les coups se donnent sur le bout, là où le coin est
  planté. » ; sans place : « Pas la place pour la fendre. ». Chaque coup payé au joule.

## La perche et la planche (chantier « briques », 31 octobre 2026)
- **La perche** (`size: "pole"`, 12 cm de bois, 22 cm contour compris) : un jeune arbre de taillis, écorce lisse et fine ; ronde,
  elle roule, se coupe sur la grille, va en tas (pyramide) ; ne s'équarrit pas (« Trop fine pour une poutre. ») ; ne se dresse pas.
  Depuis le 2 novembre 2026 (maison, étape 2), elle **se fend** comme le gros (le coin, la masse, `split` de wood.json) :
  - **le palançon** (`shape: "half"`, aspect `half`) : la perche fendue en deux, écorce en bas, face fendue en l'air (section
    demi-ronde, 12 × 6 cm de bois) ; 5,1 kg le mètre ; à 1 m, 20 × 5 px est-ouest, comme la perche ; il garnit les travées de la
    maison (`staves-panel`) ; icône `item-wood-pole-half`, porté `held-wood-pole-half` ;
  - **la latte** (`shape: "lath"`, aspect `lath`) : le palançon refendu en planchette de 6 × 3 cm (sa section dans wood.json,
    `wide`, `thick`) ; 1,6 kg le mètre ; à 1 m, 20 × 4 px ; elle se cloue en travers des chevrons ; ne se fend plus (« Trop mince
    pour le coin. ») ; icône `item-wood-pole-lath`, portée `held-wood-pole-lath`.
  Leurs vues couchées, leur coin et leur fente se calculent de leur section ; leurs tas sont en rangées de 3 × 3. Elle fera les chevrons du toit de chaume. Son taillis viendra plus tard ; en attendant, ?dieu (« Pièce de bois »,
  diamètre perche) et la transformation « magique » `pole-from-top` (la flèche d'un arbre normal couché : un tronc de 3,4 m et une
  perche de 3,6 m ; triche notée, le vrai tronc normal garde 30 cm sur 5,8 m).
- **La planche fendue** (`shape: "plank"`, du gros bois) : 3 cm d'épaisseur sur 25 de large (le rayon de la bille, fendu sur le
  fil), longueurs de la grille ; couchée à plat, elle ne roule pas ; ses tas sont en rangées. Fendue au coutre et au maillet dans un
  quartier (`rive-plank` : 5 planches de sa longueur, le cœur et l'aubier en déchet) ou une demi-bille (`rive-plank-half` : 8
  planches) ; geste à venir. Elle fera la porte et les volets.
- **Le bardeau** n'est pas une pièce de bois : 40 cm, moins que la plus courte pièce (60 cm), c'est un objet possédable (`shingle`,
  fiche à part), fendu dans un quartier de 60 cm (`rive-shingle`).
- **Variantes naturelles** : aucune ; le bois a déjà ses réglages (diamètre, longueur, état) ; un arbre donne toujours son diamètre.
- **Métier** : bûcheron (le bois rond), fendeur (demi-bille, quartier, planche, palançon, latte), charpentier (la poutre).

## Origine
Un arbre abattu puis ébranché : son tronc devient une seule pièce ronde de sa longueur utile, posée sur le tronc (le gros grand
4 m, le têtard 2 m, le normal 5,8 m). Puis on la coupe, on la fend, on l'équarrit. Posée dans Tiled (la bille de l'atelier de la
mère), avec des réglages en propriétés (`size`, `length`, `shape`, `axis`, `hewn`) ou ceux de props.json.

## Devenir
Les billes, quartiers et rondins qui se portent vont en tas pour le chauffage, ou se fendent en quartiers ; les rondins du normal deviennent les poteaux de l'abri
(3 m et 1,80 m), équarris au pied du chantier.

## Vérification
- Aperçu : `.art-preview/bois-sections.png` (chaque état : sa section par le bout, puis la pièce est-ouest et nord-sud à côté de
  Xéros), `.art-preview/bois.png` (chaque diamètre et aspect, plusieurs longueurs, roulement, encoche, coin et fente, vues
  portées, icônes, et chaque aspect du normal couché à côté de la même pièce debout), `.art-preview/arbres.png`, `.art-preview/piles.png`, `.art-preview/gabarit.png`.
- Tests : `npm run test:sections` (le recouvrement des tas et des rangées : aucun flanc caché visible ; les positions après la
  coupe ; la règle D), `npm run test:fendage` (dont une bille de 2 m, chaque demi-bille fendue en deux quartiers depuis chaque
  bout, et un tour complet du quartier avec R), `npm run test:equarrissage`, `npm run test:tas`.
- En jeu (`?dieu`, « Pièce de bois ») : poser des pièces de chaque diamètre, longueur, état et sens ; les couper, les rouler, les
  pivoter, les porter, les fendre, les équarrir.
