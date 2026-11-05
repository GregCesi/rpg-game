# Chantier « village » : cadrage (5 novembre 2026, essai de nuit)

Branche `village`, worktree `~/Code/rpg-game-village`, partie de `origin/main` (9616dd8). **Rien du jeu ne change** : ce fichier, des
propositions hors jeu (`art/proposals/village-*.ts`, `tools/essai-village*.ts`) et leurs planches dans `.art-preview/`. Les cartes
(`.tmj`) ne sont pas touchées : le plan est une proposition à valider.

Grégoire dormait : chaque décision qu'il n'a pas prise est écrite **comme supposition** (section 9), et toutes les questions sont à
la fin (section 11), chacune avec ma recommandation.

---

## 0. Ce que veut Grégoire (rappel de la demande)

- **Le plan** : on garde la croix (la rue est-ouest, la rue nord-sud, la place ronde au croisement) et on l'habille de ruelles et de
  maisons en second rang, surtout au sud. Un village de 25 à 35 foyers, dense, où tout le monde se connaît. Chaque quart de la place
  est coupé en diagonale en deux huitièmes, chacun avec son bout de place, sauf quand un seul occupant prend tout le quart. Les huit
  étals d'aujourd'hui disparaissent ; le panneau des nouvelles au milieu.
- **Les maisons** : une dizaine, toutes différentes et raccord, chacune pour un foyer du plan ; un village rural, reculé, pas riche :
  la plupart modestes, la pierre taillée et le verre rares, qui disent la richesse. On varie les matières en combinant ce qui existe,
  et les formes (longère, maison-bloc, pignon sur rue, étage, appentis, cour). On réutilise le plus possible et on dit ce qu'il faut
  de neuf.

---

## 1. Ce que j'ai lu (faits)

- **Les cartes** (une case = 32 px = 1,60 m ; 5 cm par pixel) :
  - `village.tmj` (600-800 m × 200-400 m du monde) : la rue est-ouest en y 2080-2176 (cases 65-67, 4,80 m), la rue nord-sud en
    x 3264-3360 (cases 102-104), la **place ronde** de 30,40 m centrée en (3312, 2128) et ses **huit étals** (rectangles `Plan`
    `etal`) ; la **forge** (plan `forge`) sur sa parcelle `smithy` et la **fonderie** réservée ; cinq parcelles `cottage` de 24 × 24 m
    le long de la rue de l'ouest ; quatre parcelles `rich-house` (32 × 41,6 et 28,8 × 41,6 m) le long de la rue du nord ; dix
    parcelles `house` de 19,2 × 12,8 m le long de la rue du sud. 151 arbres, têtards, buissons, rochers.
  - `quartier-sud.tmj` : douze parcelles `house` de plus le long de la rue du sud, puis la cour de la **ferme rivale** (son logis, sa
    grange) en y 2370-3200.
  - `route-de-la-ville.tmj` : la route empierrée, le panneau ; les parcelles `Mairie` et `Taverne` au nord de la route, deux
    réservées au sud.
  - `ferme-du-riche.tmj` : la cour de la ferme du riche au bout de la rue du nord (y 2530-3350), sa grange, la parcelle « Logis du
    riche » ; entre la cour et le village, une bande de 30 m de pré (où le cadrage `maison-coq` pose la maison du coq).
- **Le plan de travail** (`~/Code/rpg-game/.captures/plan-village-2.png`, pas à l'échelle) et **la demande écrite** disent la même
  chose, sauf sur cinq points. **J'ai suivi la demande écrite**, et le note :
  1. le quart nord-ouest : le plan de travail le coupe (ferme du riche + « Cordonnerie ? (ou boutique noble) ») ; la demande le donne
     tout entier à la ferme du riche. Le cordonnier va dans une maison de la rue du sud ;
  2. le quart sud-ouest : « tanneur et tailleuse » sur le plan, « la tailleuse et son mari (équipement d'aventure) » dans la
     demande ;
  3. la guérisseuse : à l'ouest de la rue sur le plan, **hors du village, côté forêt** dans la demande (section 2.3) ;
  4. la corderie et son allée, au sud de la route de l'est sur le plan, absente de la demande : c'est la **parcelle libre « à
     décider »** (question 3) ;
  5. **la maison du coq** : à l'est de la rue du nord sur le plan de travail, à l'ouest dans le cadrage `maison-coq`. Je suis le
     plan de travail (section 2.4, question 2).
- **Une règle du moteur commande tout le découpage** : une pièce posée ne passe pas un bord de zone (CONCEPTION « Le monde »). Le bord
  est du village est à 34,40 m du centre de la place, le bord sud à 93,60 m : un bâtiment ne doit jamais les chevaucher.
- **Ce qui existe pour bâtir** (props.json) : tout le kit de la maison de Xéros (solin, poteaux et traverses en `wood-piece`,
  remplissages en quatre couches `staves`/`wattle`/`daub`/`lime`, fenêtres, jambages, têtes de baie, portes `cottage-door` et
  `inner-door`, seuils, pignons chaulés, chaume en trois couches, faîtage de terre, âtre, hotte, conduit, couronnement) ; la grange
  (bardage, porte charretière, pignons en bardage, grand pan de planches) ; la cabane (rondins, porte et volet en planches) ; les
  couvertures de la forge (`shingle-roof-large`, `tile-roof-large`, `lauze-roof-large`, leurs pans percés, l'appentis de bardeaux
  `shingle-shed-roof`) ; l'étal ; les meubles (lit, paillasse, table, banc, tabourets, coffre, jarre, tonneau, caisse, sac, seau,
  poêle, chandelle, lanterne, établi). **Ce qui n'existe qu'en essai** : le mur de pierre haut (`art/proposals/walls-high.ts`, la
  « petite maison de pierre » non tranchée) ; toute la pierre taillée, les croisées, le vitrail, la lave et l'étage (branche
  `maison-coq`, prêts, en attente d'intégration).

---

## 2. Travail 1 : le plan à l'échelle

Une seule source : **`art/proposals/village-plan-data.ts`** (chaque parcelle, chaque voie, chaque emprise de bâtiment, en px de sa
zone). La planche `.art-preview/village-plan.png` en sort (`npx tsx tools/essai-village-plan.ts`). Je l'ai vérifiée par un calcul :
aucun bâtiment hors de sa parcelle, sur la place, sur une voie, ni à moins d'une case d'un bord de zone.

### 2.1 Les principes

- **La croix et la place restent où elles sont**, avec la forge : rien de ce qui est bâti ne bouge.
- **Les quarts** : chaque quart fait **28,80 × 28,80 m** (18 cases), de la rue jusqu'à une ruelle qui en fait le tour ; la place
  ronde en mord le coin. Un **huitième** est le triangle entre une rue, la ruelle du fond et la diagonale du quart : il touche la
  place par sa pointe, longe sa rue et s'élargit en s'éloignant. Le bâtiment se pose dans le large, son devant sur sa rue ; ce qui se
  vend se met à la pointe, tourné vers la place.
- **Les ruelles** : 3,20 m (2 cases), de terre battue, comme les rues (4,80 m) et la place. **Celles qui longent un bord de zone
  sont posées sur le bord** (la ruelle de l'est sur x 3936-4000 du village, la ruelle du bord sur y 3936-4000) : aucune maison n'est
  coupée par une zone.
- **Les rangs** : au sud, un premier rang de maisons serrées sur la rue, leurs jardins en lanières derrière jusqu'à la ruelle de
  l'ouest ; un second rang au-delà, le long d'une venelle, plus pauvre ; une ruelle est-ouest tous les 25 à 30 m.
- **Les maisons regardent la rue** au premier rang, leur cour sinon. Un plan ne tourne pas encore au jeu : chaque maison est dessinée
  dans le sens de sa parcelle, son faîtage noté.

### 2.2 La place et ses huitièmes

| Quart | Huitième | Qui, quoi | Forme |
| --- | --- | --- | --- |
| **Nord-ouest** | tout le quart | **La ferme du riche** : sa boutique sur la rue de l'ouest (12,80 × 8 m), l'**étal luxueux** sous un auvent à la pointe, tourné vers la place (miel, fromages affinés, épices venues de la ville, cire) ; derrière, une cour et une petite réserve. Un commis de la ferme la tient. | carré de 28,8 m moins la place |
| **Nord-est** | côté rue du nord | **La boutique du bûcheron**, qui vend son bois (il vit dans sa cabane en lisière : ici, il n'a que sa boutique) : le magasin au fond, dans le large du huitième, le chantier de vente le long de la rue (bûches, quartiers, perches, fagots, planches) sous un appentis. | triangle de 28,8 m de côté |
| | côté rue de l'est | **La boutique abandonnée de l'ancien menuisier** (11,20 × 6,40 m) : volets cloués, l'enseigne tombée, le bois vieux, l'herbe haute. Personne n'y vit. | triangle |
| **Sud-est** | côté rue du sud | **La ferme rivale** : une maison simple qui sert de dépôt (8 × 6,40 m) et, tourné vers la place, **un grand étal de légumes** qui ne paie pas de mine (deux travées d'étal, 4,80 m, des cageots à terre devant). Personne n'y dort. | triangle |
| | côté rue de l'est | **La mercière**, sœur du coq, veuve, et sa fille : la boutique au rez-de-chaussée (fils, aiguilles, rubans, boutons), le logis à l'étage (9,60 × 8 m). | triangle |
| **Sud-ouest** | tout le quart | **La tailleuse et son mari, le frère du forgeron** (il travaille le cuir et vend l'équipement d'aventure, avec ce que fait son frère) : un seul grand bâtiment **tout en bois, à étage, sans étal** (14,40 × 9,60 m) ; au rez-de-chaussée la boutique de vêtements et la boutique d'équipement d'aventure (sacs, cordes, lanternes, outres, couteaux, bottes) ; leur logis à l'étage ; une cour derrière. La fille du coq y est apprentie. | carré moins la place |
| **Le milieu** | | **Le panneau des nouvelles** (1,60 × 0,30 m, 2 m de haut : deux poteaux, un tableau de planches, un petit toit de bardeaux), au centre de la place. | pièce nouvelle |

### 2.3 Toutes les parcelles

Coordonnées en px de la zone (x0-x1 × y0-y1) ; dimensions est-ouest × nord-sud. **Maison** : la maison dessinée du travail 2.

**Au sud de la place** (village, puis quartier sud) :

| Parcelle | Zone, place (px) | Dimensions | Qui y vit, ce qu'on y fait | Maison |
| --- | --- | --- | --- | --- |
| `taverne` | village 3360-3936 × 2816-3392 | 28,8 × 28,8 m | **La taverne** : le tavernier, sa femme, leur fils, une servante. Grande, tout en bois, à étage (la salle en bas, deux chambres à louer en haut) ; à l'est, la **cour en terrasse** sous une treille ; derrière, l'écurie des voyageurs. | (à venir) |
| `s1-o1` | village 2880-3264 × 2816-3056 | 19,2 × 12 m | Le potier, sa femme, deux enfants ; son tour et son petit four dans la cour. | |
| `s1-o2` | village 2880-3264 × 3056-3296 | 19,2 × 12 m | **Le vannier**, sa femme, leur fils : paniers, hottes, cageots (ceux de la ferme rivale), claies, ruches de paille. | **h6** |
| passage | village 2688-3264 × 3296-3392 | 28,8 × 4,8 m | Un passage de la rue aux jardins et à la ruelle de l'ouest. | |
| `s1-jardins` | village 2688-2880 × 2816-3296 | 9,6 × 24 m | Les potagers des deux maisons. | |
| `s2-o1` | village 2880-3264 × 3456-3696 | 19,2 × 12 m | **Le tisserand et sa femme**, sans enfants. | **h2** |
| `s2-o2` | village 2880-3264 × 3696-3936 | 19,2 × 12 m | **Les vieux** : l'ancien bouvier de la ferme du riche et sa femme, fileuse. | **h3** |
| `s2-jardins` | village 2688-2880 × 3456-3936 | 9,6 × 24 m | Leurs potagers. | |
| `s2-e1` | village 3360-3936 × 3456-3696 | 28,8 × 12 m | **Le couvreur**, sa femme, leurs six enfants et la grand-mère. | **h1** |
| `s2-e2` | village 3360-3936 × 3696-3936 | 28,8 × 12 m | Le tonnelier et sa femme, âgés, et leur fils qui reprend l'atelier. | |
| `r2-1` | village 2112-2624 × 2816-3104 | 25,6 × 14,4 m | **Deux familles de journaliers** sous un même toit. | **h5** |
| `r2-2` | village 2112-2624 × 3104-3392 | 25,6 × 14,4 m | Une fileuse, veuve, et sa vieille mère. | |
| `r2-3` | village 2112-2624 × 3456-3712 | 25,6 × 12,8 m | Le scieur de long (il travaille avec le bûcheron), sa femme, quatre enfants. | |
| `r2-4` | village 2112-2624 × 3712-3936 | 25,6 × 11,2 m | Le fils du laboureur et sa jeune femme. | |
| `s3-o1` | quartier sud 2880-3264 × 0-240 | 19,2 × 12 m | Une veuve lavandière et ses trois filles ; les draps du village sèchent dans sa cour. | |
| `s3-o2` | quartier sud 2880-3264 × 240-480 | 19,2 × 12 m | Un vieux soldat revenu des guerres, qui vit seul et raconte. | |
| passage | quartier sud 2688-3264 × 480-576 | 28,8 × 4,8 m | Le passage du bout, vers les jardins. | |
| `s3-jardins` | quartier sud 2688-2880 × 0-480 | 9,6 × 24 m | Potagers. | |
| `s3-e1` | quartier sud 3360-3936 × 0-240 | 28,8 × 12 m | La sage-femme et son mari le sabotier, leurs deux grands enfants. | |
| `s3-e2` | quartier sud 3360-3936 × 240-480 | 28,8 × 12 m | **Le berger** du village, seul avec ses chiens, au bout du village, près des prés. | **h4** |

**À l'ouest, la rue de la forge** (village) :

| Parcelle | Place (px) | Dimensions | Qui y vit, ce qu'on y fait | Maison |
| --- | --- | --- | --- | --- |
| `forge` (existe) | 1024-1504 × 1536-2016 | 24 × 24 m | **La forge** (plan `forge`) et la fonderie réservée. Rien ne bouge. | |
| `o-n2` (était `cottage`) | 1568-2048 × 1536-2016 | 24 × 24 m | **Le forgeron**, célibataire, à côté de sa forge. | **h9** |
| `o-n3` (était `cottage`) | 2112-2592 × 1536-2016 | 24 × 24 m | **Le boucher**, sa femme, leur fils (il vend aussi la viande du chasseur) : l'étal et la boutique au rez-de-chaussée sur la rue, le logis au-dessus ; l'échaudoir et le saloir dans la cour. | (à venir) |
| `o-s1` (était `cottage`) | 1024-1504 × 2240-2720 | 24 × 24 m | **Le laboureur**, sa femme, leurs deux filles ; deux bœufs et une vache. À l'entrée du village, au plus près des champs. | **h7** |
| `o-s2` (était `cottage`) | 1568-2048 × 2240-2720 | 24 × 24 m | Le bouvier de la ferme du riche (il mène les bœufs du coq), sa femme, trois enfants. | |
| `o-s3` (était `cottage`) | 2112-2592 × 2240-2720 | 24 × 24 m | La veuve de l'ancien menuisier et leurs deux enfants : la boutique de la place est fermée depuis sa mort. | |

**Au nord** :

| Parcelle | Zone, place (px) | Dimensions | Qui y vit, ce qu'on y fait | Maison |
| --- | --- | --- | --- | --- |
| `aise-o1` | village 2432-3232 × 192-800 | 40 × 30,4 m | **Le meunier**, sa femme, trois enfants, une servante (le moulin est sur la rivière). Maison à étage, cour fermée. | **h8** |
| `aise-o2` | village 2432-3232 × 832-1408 | 40 × 28,8 m | **Le maquignon** (chevaux et bœufs), sa femme, deux fils. Pignon sur rue, à étage ; l'écurie dans la cour. | **h10** |
| `aise-e1` | village 3392-3968 × 832-1408 | 28,8 × 28,8 m | Une troisième maison aisée, réservée (question 6). | |
| `coq-jardin` | village 3392-3968 × 0-800 | 28,8 × 40 m | **Le jardin du coq** : allées, parterres, verger, un bassin ; la clôture de fer forgé le long de la rue. | |
| `coq` | ferme du riche 3392-3968 × 3392-4000 | 28,8 × 30,4 m | **La maison du coq** (le chantier `maison-coq`, 16,40 × 6,80 m), à l'est de la rue, sa façade au sud sur son jardin, à 2 m de la cour de sa ferme. | (`maison-coq`) |

**À l'est** (route de la ville) :

| Parcelle | Place (px) | Dimensions | Qui, quoi |
| --- | --- | --- | --- |
| `sire` (était `Mairie`) | 32-608 × 1568-2048 | 28,8 × 24 m | **Le sire** : le lieu officiel au rez-de-chaussée (la salle où il rend la justice, reçoit les redevances), son logis à l'étage, **son intendant** qui loge chez lui ; les **réserves du village** (grain, sel) dans un grenier à côté ; **le four banal** et **le puits** du village au bord de la route. |
| `a-decider` (était réservée) | 32-608 × 2240-2688 | 28,8 × 22,4 m | **Libre, à décider** (la corderie refusée par Grégoire). |

**Hors du village** :

| Lieu | Zone, place (px) | Pourquoi là |
| --- | --- | --- |
| **La guérisseuse** | bois du sud 1664-2048 × 448-832 (19,2 × 19,2 m) | Elle vit seule ; elle et le chasseur ont une histoire qui n'est pas officielle. Côté forêt, dans la lisière, sur la rive est de la rivière (l'eau, les plantes de la forêt et des berges), à 120 m au sud du chemin : un sentier part du cabanon du chasseur et longe la lisière. À 160 m de la maison de Xéros, 480 m de la place. Personne ne passe devant sa porte par hasard. |
| **Le moulin** | bois du nord 1504-1888 × 2400-2720 | Sur la rive est de la rivière, sa roue dans l'eau, son bief ; 150 m au nord du chemin, par un sentier qui part de la ferme de Xéros. Le meunier n'y dort pas. |
| **La carrière** | ferme 1000-1280 × 1650-1950 | Sur le plateau (5 m plus haut), rive ouest, au nord du chemin creux : la pierre descend par le chemin. |
| **Le four à chaux** | ferme 1600-1800 × 1700-1900 | Rive est, au bord du chemin, en face de la carrière : la pierre de l'autre côté du chemin creux, le bois de la lisière tout autour. |
| **La cabane du bûcheron** | bois du nord 2000-2240 × 3300-3540 | En lisière, près de l'eau : **il y vit** (la cabane en rondins du jeu) ; sur la place, il n'a que sa boutique. |
| **Les étables** | ferme du riche 3104-3424 × 2560-2720 | Dans la cour de la ferme du riche, à côté de la grange ; la ferme rivale de même dans sa cour. |

### 2.4 Ce qui bouge

| Ce qui existe | Ce qu'il devient |
| --- | --- |
| Les **huit étals** de la place (rectangles `Plan`) | **Retirés.** Le panneau des nouvelles au centre. Le plan de l'étal reste au catalogue : la ferme du riche et la ferme rivale en posent un, à leur place. |
| Les quatre parcelles `rich-house` | **Redécoupées** : deux maisons aisées à l'ouest de la rue du nord, une réservée à l'est, le jardin du coq ; les quarts nord de la place mordent sur leur bas. |
| Les dix parcelles `house` du village, les douze du quartier sud | **Remplacées** par le découpage en rangs et en ruelles (seize parcelles d'habitation, des jardins). Le quartier sud, au-delà de 30 m du bord, n'a plus de parcelles : des prés, des jardins, puis la ferme rivale. |
| Les cinq parcelles `cottage` | **Gardées**, chacune avec son foyer : le forgeron, le boucher, le laboureur, le charron, le sergent. |
| La forge, la fonderie | **Gardées** telles quelles. |
| La parcelle `Mairie` | **Gardée** : le sire. |
| La parcelle `Taverne` (route de la ville) | **Retirée** : la taverne descend au sud de la place, côté est de la rue (le plan de travail). |
| Les deux parcelles réservées au sud de la route | L'une devient « à décider », l'autre est **retirée** (pré). |
| La maison du coq (cadrage `maison-coq` : à l'ouest de la rue, dans la bande de la ferme du riche) | **Passée à l'est de la rue**, dans la même bande, le jardin devant elle jusque dans le village (question 2). La parcelle « Logis du riche » de la cour reste. |
| La ferme du riche, la ferme rivale | **Gardées.** Leurs étables dans leurs cours (proposition). |
| Les objets des cartes | **24 arbres, têtards, buissons et rochers** ont leur pied sous une maison ou une ruelle nouvelle (croix rouges de la planche) ; **41** en gardant une case de passage autour des maisons : à retirer à l'intégration. Les autres restent et donnent leurs arbres aux jardins. |
| Les destinations (`parcels.json`) | À l'intégration : `shop` (boutique), `public` (le sire, la taverne), `garden`, `free` ; `house` et `rich-house` restent. |

### 2.5 Les distances (Xéros marche à 2 m/s)

De la place : à la forge, 110 m ; au bout sud (le chemin des jardins), 125 m ; à la maison du coq, 125 m ; au sire, 55 m. Le village
fait environ **230 × 250 m**, jardins compris. De la maison de Xéros à la place : 410 m (3 min 25 s).

### 2.6 Le compte des foyers : 29 (corrigé le 5 novembre)

| Où | Foyers |
| --- | --- |
| La place | la mercière, la tailleuse et le frère du forgeron (2) ; le bûcheron n'y a que sa boutique |
| La rue de la forge | le forgeron, le boucher, le laboureur, le bouvier, la veuve du menuisier (5) |
| Le sud | le tavernier, le potier, le vannier, le tisserand, les vieux, le couvreur, le tonnelier, les deux familles de journaliers, la fileuse, le scieur de long, le jeune couple, la lavandière, le vieux soldat, la sage-femme et le sabotier, le berger (16) |
| Le nord | le coq, le meunier, le maquignon (3) ; une parcelle aisée réservée |
| L'est | le sire (1) |
| Dehors | la guérisseuse, le bûcheron dans sa cabane, le chasseur dans son cabanon (3) |

**29 foyers** (le sire compté avec son intendant), sans la maison de Xéros ni les deux fermes. Pas de charpentier (le fils aîné de la ferme rivale dépanne), pas de cordonnier (les chaussures viennent de la ville), pas de charron (les roues sont importées), pas de milice ni de sergent. **On nomme les gens par leur métier** : Grégoire donnera les noms en dernier, après les personnalités.

---

## 3. Travail 2 : les maisons d'habitation

### 3.1 Les règles que je me suis données

- **La matière dit le rang.** En bas : le torchis brut (sans chaux), le chaume mince, la terre battue, le feu au sol sans conduit. Au
  milieu : le torchis chaulé, le chaume épais, les bardeaux, la cheminée. Plus haut : la pierre brute à la chaux, les tuiles plates,
  l'étage. Tout en haut, rare : la **pierre taillée** (en encadrements et en chaînes d'angle chez le meunier ; en façade entière chez
  le coq seul) et le **verre** (une fenêtre chez le meunier, deux chez le maquignon, les croisées du coq).
- **Le métier se voit de la rue.** Le couvreur a le plus beau chaume ; le charpentier a des croix de Saint-André dans son pignon ; le
  forgeron a des ferrures ; le tisserand une grande baie ; la guérisseuse ses herbes qui sèchent.
- **Rien n'est plus beau que la maison du coq**, et presque toutes sont plus petites que celle de Xéros (80 m²) : seules les deux
  maisons aisées et la longère du laboureur la dépassent.
- **Le bois** est patiné partout (des maisons habitées), vieux chez les vieux et à la boutique abandonnée.

| Maison | Foyer, rang | Forme | Murs | Couverture | Au sol, dans œuvre |
| --- | --- | --- | --- | --- | --- |
| **h1** | le couvreur, 9 personnes ; modeste | longue maison et appentis | pan de bois, torchis chaulé | chaume épais, très soigné | 49 m² |
| **h2** | le tisserand et sa femme ; modeste | maison-bloc | pierre brute à la terre | bardeaux | 33 m² |
| **h3** | les vieux ; pauvres | chaumière et appentis | pan de bois vieux, chaux écaillée | chaume vieux, moussu | 15 m² |
| **h4** | le berger, seul ; pauvre | cabane en appentis | planches debout | bardeaux, une pente | 8 m² |
| **h5** | deux familles de journaliers ; pauvres | maison double | pan de bois, torchis brut | chaume en une couche | 2 × 15 m² |
| **h6** | le charpentier ; pas à plaindre | pignon sur rue | pan de bois chaulé, croix de Saint-André | bardeaux | 46 m² |
| **h7** | le laboureur ; pas à plaindre | longère (logis et étable) | torchis chaulé sur solin haut, étable en pierre brute | chaume | 102 m², dont 51 d'étable |
| **h8** | le meunier ; aisé | maison-bloc à étage, cour fermée | moellons enduits, pierre taillée aux angles et aux baies | laves | 2 × 69 m² |
| **h9** | le forgeron, seul ; artisan aisé | maison-bloc | pierre brute à la chaux | tuiles plates | 48 m² |
| **h10** | le maquignon ; aisé | pignon sur rue à étage en encorbellement | rez de pierre brute, étage en colombage serré | tuiles plates | 83 + 97 m² |
| **h11** | la guérisseuse, seule ; à part | chaumière basse à croupes | perches et torchis brut | chaume à quatre pans | 15 m² |

### 3.2 Les onze maisons

Coordonnées des plans en cm depuis le coin nord-ouest des axes (pan de bois) ou hors œuvre (pierre) ; nord en haut. **P** poteau,
**[F]** fenêtre à volet (60 × 40, appui à 80 : celle de Xéros), **[porte]** porte d'entrée 0,90 × 1,80 m (`cottage-door`), **[p]**
porte intérieure (`inner-door`), **#** mur de pierre, **=** banc, **▭** table.

#### h1. Le couvreur et sa famille (famille nombreuse)

- **Qui** : le couvreur (il refait les toits de chaume du village et des fermes), sa femme, leurs six enfants (de 2 à 15 ans ; l'aîné
  l'aide déjà sur les toits) et la grand-mère. Neuf personnes. Du travail toute la belle saison, rien l'hiver.
- **Pourquoi elle est comme ça** : une longue maison étroite, la seule largeur que la charpente porte sans poteau au milieu ; on l'a
  allongée d'une travée à chaque enfant. **Le toit est le plus beau de la rue** : c'est sa réclame (le chaume épais, peigné, le
  faîtage de terre bien vert, l'égout coupé net). **Pas de cheminée** : un foyer au sol au milieu de la salle, la fumée passe par un
  trou de fumée au faîte ; c'est ce qui la sépare de la maison de Xéros, avec son faîtage le long de la rue. Contre le mur de
  derrière, **un appentis** pour ses bottes de chaume, ses échelles, ses perches et son peigne.
- **Dimensions** : axes 4,80 × 11,20 m (3 travées sur 7), faîtage nord-sud le long de la rue, la façade et la porte à l'ouest, sur
  la rue du sud ; hors œuvre 5,30 × 11,70 m ; l'appentis 2,40 × 8 m à l'est. Chaume à 50° (la portée de 4,80 m le permet), faîte du
  chaume vers 5,60 m.
- **Plan** (la rue à gauche, à l'ouest) :

```
 y : 0 ----P-------P-------P----        N ↑
         | CHAMBRE              |       lit des parents, lit de la grand-mère,
         |  lit      lit  coffre|       coffre, berceau
 y=320 --P--------[p]------P----
         |                      |       SALLE : le foyer au sol au milieu (Ø 1 m),
  [F]    |  ▭ table  = bancs    |---+   la table et deux bancs, la jarre,
 rue     |      ( foyer )       | A |   six paillasses roulées le jour contre
 [porte] |                      | P |   le mur est, le tonneau
  [F]    |  paillasses (6)      | P |   A P P : l'appentis (bottes de chaume,
 y=960 --P----------------------P   |   échelles, perches, peigne)
         | RÉSERVE  sacs, jarres|---+
 y=1120--P-------P-------P----
```

- **Matières** : solin de pierres brutes, ossature patinée, torchis chaulé ; chaume, faîtage de terre ; l'appentis en planches sur
  deux poteaux ; le trou de fumée percé dans le chaume, au faîte.
- **Réutilisé** : tout le kit de la maison de Xéros (solin, poteaux, traverses, sablières, remplissages, fenêtres, jambages, têtes
  de baie, `cottage-door`, `inner-door`, `threshold-stone`, `lime-gable`, chaume, `earth-ridge`) ; `hearth` (le foyer au sol) ;
  `plank-roof` et deux poteaux pour l'appentis ; `bed` ×2, `pallet` ×6, `table`, `bench` ×2, `chest`, `jar`, `barrel`, `sack`,
  `bucket-water`.
- **Nouveau** : `thatch-smoke-hole` (le chaume percé d'un trou de fumée au faîte : une variante du pan) ; `cradle` (le berceau) ;
  `thatch-bundle-stack` (les bottes de chaume rangées sous l'appentis) ; `ladder` (l'échelle du couvreur) ; les pans de chaume et le
  faîtage d'une autre longueur (section 5).
- **Place** : `s2-e1`, côté est de la rue du sud, deuxième tronçon (planche `village-rue.png`).

#### h2. Le tisserand et sa femme (couple sans enfants)

- **Qui** : le tisserand (il tisse la laine et le lin que les femmes du village filent : la fileuse, la vieille de h3), sa femme qui
  dévide et vend la toile. Pas d'enfants, et c'est leur chagrin. Modestes, mais l'argent rentre un peu toute l'année.
- **Pourquoi elle est comme ça** : **la seule maison de pierre brute de la rue**. Le père du tisserand était maçon : il l'a montée
  lui-même, en moellons de calcaire hourdés à la terre, petite et carrée. Un tisserand a besoin de **jour** : la grande baie de
  l'atelier, sur la rue, fermée non de verre (trop cher) mais d'un **châssis de toile huilée**, qui laisse passer une lumière
  laiteuse. Les bardeaux : des murs de pierre portent un toit plus lourd que le chaume, et le chaume brûle.
- **Dimensions** : hors œuvre 6,40 × 7,20 m, murs de 50 cm, 2,40 m de haut ; dans œuvre 5,40 × 6,20 m. Faîtage nord-sud, la façade à
  l'est sur la rue. Bardeaux à 45°, faîte vers 5,60 m.
- **Plan** (la rue à droite, à l'est) :

```
 x : 0  50                        590 640
 y=0  ################################        N ↑
      ## ATELIER                     ##
      ##  dévidoir    MÉTIER À        ##
      ##  paniers     TISSER          [B]  ← baie de 1,20 × 0,80, toile huilée   rue →
      ##  de laine    (1,80 × 1,50)   ##
 y=360##   (pas de cloison)           ##
      ## SALLE-CHAMBRE                [porte]
      ##   lit       ▭ table          ##
      ##   coffre    tabourets        ##
      ##  [âtre contre le pignon sud] ##
 y=720################################
```

- **Matières** : mur de pierre brute haut (les moellons du jeu, à la terre) ; bardeaux ; pignons de pierre ; l'âtre contre le pignon
  sud, son conduit dans le mur et la souche au-dessus du faîte.
- **Réutilisé** : les moellons et pierres brutes du jeu (le mur), `stone-hearth`, `chimney-flue`, `chimney-cap`, `cottage-door`,
  `plank-shutter`, `threshold-stone` ; les bardeaux (`shingle-roof-large`, raccourci) ; `bed`, `chest`, `table`, `stool` ×2, `jar`,
  `bucket-water`, `sack`.
- **Nouveau** : **le mur de pierre brute haut** (l'essai `walls-high.ts`, à trancher) et ses baies (porte, fenêtre, grande baie, avec
  linteau de bois) ; `oiled-cloth-window` (le châssis de toile huilée, 120 × 80) ; `loom` (le métier à tisser, 180 × 150 × 160) ;
  `yarn-winder` (le dévidoir) ; le pignon de pierre ; le pan de bardeaux en 7,20 m.
- **Place** : `s2-o2`, côté ouest de la rue du sud (planche `village-rue.png`).

#### h3. Les vieux (l'ancien bouvier et la fileuse)

- **Qui** : lui, ancien bouvier de la ferme du riche, le dos cassé, ne travaille plus ; elle file au rouet pour le tisserand. Ils
  vivent de peu, de ce que donnent leurs enfants partis et du fil vendu. **Ils ne peuvent plus fendre leur bois** : Xéros pourra le
  leur porter.
- **Pourquoi elle est comme ça** : la plus petite maison du village, une seule pièce, faite il y a cinquante ans et jamais refaite.
  **Le bois est vieux**, gris ; **la chaux s'écaille** et montre le torchis par plaques ; **le chaume est vieux**, gris, moussu, le
  faîtage plein d'herbe et d'une touffe de joubarbe. Un **appentis** de planches au pignon ouest abrite le bois menu. **Un banc**
  contre la façade au soleil : le vieux y passe l'après-midi.
- **Dimensions** : axes 4,80 × 3,20 m (3 travées sur 2), faîtage est-ouest, la porte au sud, le pignon est sur la rue ; hors œuvre
  5,30 × 3,70 m ; l'appentis 1,20 × 3,20 m à l'ouest. Chaume à 50°.
- **Plan** :

```
 x :    -120  0       160      320      480        N ↑
 y=0     +---P--------P---[F]--P--------P
         |BÛ |  lit        coffre       |
         |CHE|  (foyer contre le        |  rue →
         | R |   pignon ouest)  rouet   |
         |   |        ▭ petite table    |
 y=320   +---P--[F]---P--[porte]-P------P
                        = banc dehors, au soleil
```

- **Matières** : ossature vieille, torchis chaulé écaillé, chaume vieux et moussu, appentis en planches vieilles.
- **Réutilisé** : le kit de Xéros (solin, ossature, remplissages, deux fenêtres, la porte), `hearth`, `bed`, `chest`, `stool` ×2,
  `bench` (dehors), `bucket`, `faggot` (dans le bûcher), `plank-roof` (l'appentis).
- **Nouveau** : `lime-panel-flaking` (le remplissage chaulé écaillé : une variante de `lime-panel`) ; `thatch-roof-mossy` (le chaume
  vieux, gris, moussu, l'herbe au faîtage : une variante ; le chaume ne prend pas l'âge du bois) ; `spinning-wheel` (le rouet,
  90 × 40 × 90) ; `small-table` (une petite table de 80 × 60) ; le chaume en 6 m.
- **Place** : `s2-o3`, au bout du tronçon (planche `village-rue.png`).

#### h4. Le berger (quelqu'un qui vit seul)

- **Qui** : le berger du village, la quarantaine, jamais marié. Il garde les moutons de tout le village sur les prés communs, du
  printemps à la Toussaint ; payé en nature. Il parle plus à ses deux chiens qu'aux gens.
- **Pourquoi elle est comme ça** : une **cabane de planches** au bout du village, au bord des prés : il ne fait qu'y dormir. Planches
  debout sur une ossature de poteaux posés sur des dés de pierre, **un toit à une seule pente** (l'appentis de bardeaux du jeu, sur
  sa propre ossature) ; un poêle pour l'hiver, sans cheminée maçonnée (le tuyau sort par le mur). Devant : le **parc à brebis** fait
  de claies tressées, la niche des chiens.
- **Dimensions** : axes 3,20 × 2,40 m ; le haut côté au nord (2,40 m), le bas au sud (1,80 m) ; avec le toit, 3,80 × 3,20 m. La porte
  au sud.
- **Plan** :

```
 y=0   P------------------P      N ↑   (haut côté)
       |  paillasse  coffre |
       |  poêle    tabouret |
 y=240 P---[porte]--[F]----P             (bas côté)
          ░░ parc à brebis (claies) ░░   niche
```

- **Matières** : bardage de planches patiné (celui de la grange, en bas) ; bardeaux ; dés de pierre.
- **Réutilisé** : `shingle-shed-roof` (à sa taille), `footing-stone`, poteaux en `wood-piece`, `plank-door`, `plank-shutter`,
  `pallet`, `chest`, `stool`, `stove` (le poêle).
- **Nouveau** : `board-wall-low` (le pan de bardage bas, 120 × 20 × 200 : celui de la grange fait 3,12 m) ; `hurdle` (la claie
  tressée de parc, 160 × 10 × 90 : la tresse du clayonnage, sans torchis) ; `dog-kennel` (la niche).
- **Place** : `s3-e2`, au bout du village, dans le quartier sud, au bord des prés.

#### h5. Les journaliers (deux familles pauvres)

- **Qui** : à l'ouest, un journalier (il se loue à la journée aux deux fermes), sa femme et leurs trois petits ; à l'est, une veuve
  journalière (elle bine, elle lave, elle glane) et son grand fils. Les plus pauvres du village.
- **Pourquoi elle est comme ça** : **une maison double**, deux logis d'une pièce sous un même toit, séparés par une cloison pleine ;
  chacun sa porte, sa petite fenêtre, son foyer au sol adossé à la cloison (on partage la chaleur). Bâtie par la ferme du riche pour
  ses journaliers, au second rang, derrière la rue. **Le torchis n'est pas chaulé** (la chaux coûte), **le chaume n'a qu'une
  couche**, pas de seuil de pierre.
- **Dimensions** : axes 9,60 × 3,20 m (6 travées sur 2), faîtage est-ouest, les portes au sud ; hors œuvre 10,10 × 3,70 m ; deux
  logis de 4,80 × 3,20 m (15 m² chacun).
- **Plan** :

```
 x : 0      160     320     480     640     800     960     N ↑
 y=0  P------P-------P-------P-------P-------P-------P
      | paillasses  (foyer)  ‖  (foyer)  paillasses  |     ‖ : cloison pleine
      | ▭  coffre    seau    ‖  seau   coffre     ▭  |
 y=320P--[F]--P--[porte]-----P-----[porte]--P--[F]---P
```

- **Matières** : ossature patinée, **torchis brut** (la troisième couche, sans chaux), chaume en une couche (l'étape du chantier
  devenue l'état final), faîtage de terre.
- **Réutilisé** : le kit de Xéros jusqu'au torchis (`staves-*`, `wattle-*`, `daub-panel`, `daub-window-panel`, `daub-jamb`,
  `daub-door-head`), `thatch-roof-half`, `earth-ridge`, `cottage-door` ×2, `hearth` ×2, `pallet` ×5, `chest` ×2, `table`, `stool`,
  `bucket` ×2.
- **Nouveau** : `daub-gable` (le pignon en torchis brut : l'étape d'avant le pignon chaulé) ; les pans en 10,60 m.
- **Place** : `r2-1`, au second rang, au bord de la venelle.

#### h6. Le vannier (pas à plaindre, sans plus) : le pignon sur rue

> **Corrigé le 5 novembre** : il n'y a pas de charpentier au village (le fils aîné de la ferme rivale fait ce travail). La maison reste ; elle est au **vannier** (paniers, hottes, cageots de la ferme rivale, claies, ruches de paille), sa femme, leur fils, sur la parcelle `s1-o2`. L'atelier sur la rue devient l'atelier de vannerie (l'osier trempe dans la cour) ; les croix de Saint-André restent, la maison ayant été bâtie par le père de l'ancien menuisier. Le texte ci-dessous est celui d'avant.

- **Qui** : le charpentier (les charpentes, les portes, les volets, les bardeaux du village ; depuis la mort du menuisier, il fait
  aussi les meubles, mal), sa femme, leur fils apprenti, leur fille.
- **Pourquoi elle est comme ça** : **pignon sur rue**, la maison de l'artisan de bourg, étroite sur la rue, profonde. **L'atelier
  ouvre sur la rue** par une porte à deux battants dans le pignon, sous l'avancée du toit ; le logis derrière. Le charpentier **montre
  son travail** : des **croix de Saint-André** dans les panneaux du pignon sur rue, des bardeaux fendus de sa main.
- **Dimensions** : axes 9,60 × 4,80 m (6 travées sur 3), faîtage est-ouest, le pignon est sur la rue ; hors œuvre 10,10 × 5,30 m, le
  toit débordant de 80 cm sur la rue ; bardeaux à 45°.
- **Plan** (la rue à droite) :

```
 x : 0      160     320     480     640     800     960       N ↑
 y=0  P------P--[F]--P-------P-------P--[F]--P-------P
      | CHAMBRE       | SALLE             | ATELIER        |
      | lit  paillasse| [âtre, mur nord]  | établi         |
      | coffre       [p]  ▭ table  = banc [p] chevalet     [PORTE À DEUX
      |               |                   | bois debout    | BATTANTS]  rue →
 y=480P------P--[F]--P----[porte]--P--[F]--P-------P
```

- **Matières** : solin, ossature patinée, torchis chaulé ; **les panneaux à croix de Saint-André** dans le pignon est ; bardeaux.
- **Réutilisé** : le kit de Xéros, `stone-hearth`, `chimney-hood`, `chimney-flue`, `chimney-cap`, `cottage-door`, `inner-door` ×2,
  `workbench`, `chopping-block`, des `wood-piece` debout contre le mur, `bed`, `pallet`, `chest`, `table`, `bench`, `stool`.
- **Nouveau** : `lime-cross-panel` (le remplissage chaulé à croix de Saint-André : les écharpes posées avant les palançons) ;
  `lime-gable-cross` (le pignon à croix) ; `twin-plank-door` (la porte d'atelier à deux battants, 1,60 × 1,90 m, qui s'ouvre) ;
  `sawhorse` (le chevalet) ; le pan de bardeaux en 11,70 m avec son avancée.
- **Place** : `s2-o1`, à l'angle de la ruelle du milieu et de la rue du sud (planche `village-rue.png`).

#### h7. Le laboureur (pas à plaindre, sans plus) : la longère

- **Qui** : le laboureur, sa femme, leurs deux filles ; il a **deux bœufs et une vache**, une charrue, et loue ses bœufs pour les
  labours (c'est ce qui le fait vivre mieux qu'un journalier). Son fils vient de se marier (le jeune couple de `r2-4`).
- **Pourquoi elle est comme ça** : **la longère** que la conception réservait aux voisins plus aisés : **le logis et l'étable sous
  le même toit**, l'étable à l'est (sa chaleur passe dans la maison l'hiver). Le logis a **une cheminée** dans un refend de pierre ;
  l'étable a **des murs de pierre brute** jusqu'à 1,20 m (les bêtes cognent), sa porte large, et **la gerbière** au pignon est (la
  porte haute par où l'on monte le foin sous le chaume). Façade au sud sur sa cour : **le tas de fumier** devant l'étable, la charrue
  sous l'avant-toit. Dos à la rue : on la voit de la rue par son mur nord et ses deux petites fenêtres.
- **Dimensions** : axes 16 × 6,40 m (10 travées sur 4), faîtage est-ouest ; hors œuvre 16,50 × 6,90 m ; le logis 6,40 m (la chambre
  et la salle), l'étable 8 m, le refend entre les deux ; chaume à 45°.
- **Plan** :

```
 x : 0      160     320     480     640     800  960  1120 1280 1440 1600   N ↑ (la rue)
 y=0  P--[F]--P------P------P--[F]--P------P----P----P----P----P----P
      | CHAMBRE  |  SALLE           # ÉTABLE                          |
      | lit  lit |  [âtre contre    #  ══ mangeoire et râtelier ══     |
      | coffre  [p]  le refend]     #  bœuf    bœuf    vache          [gerbière,
 y=320P          P   ▭ table = banc #                                  | pignon est]
      |          |   jarre tonneau [p] litière            fourche      |
 y=640P--[F]--P------P--[porte]--P-#----P--[PORTE D'ÉTABLE]--P-------P
                     cour : la charrue sous l'avant-toit        fumier
```

- **Matières** : solin haut de pierre brute ; logis en pan de bois chaulé ; étable en pierre brute jusqu'à 1,20 m puis torchis
  chaulé ; le refend de pierre qui porte l'âtre ; chaume, faîtage de terre ; la gerbière dans le pignon est.
- **Réutilisé** : le kit de Xéros ; `stone-hearth`, `chimney-hood`, `chimney-flue`, `chimney-cap` ; `bed` ×2, `chest`, `table`,
  `bench`, `jar`, `barrel` ; `hay-bale`, `bucket-water`, `faggot`.
- **Nouveau** : `manger` (la mangeoire et le râtelier, 240 × 60 × 120) ; `stable-door` (la porte d'étable coupée en deux, 1,40 ×
  1,80 m, le haut s'ouvre seul) ; `dung-heap` (le tas de fumier, 300 × 200 × 80) ; `lime-gable-loft` (le pignon chaulé à
  gerbière) ; `plough` (la charrue, 250 × 70 × 90) ; le mur bas de pierre brute de l'étable ; les pans de chaume en 17,50 m ; les
  bœufs et la vache (des créatures, plus tard).
- **Place** : `o-s1`, au sud de la rue de l'ouest, à l'entrée du village, au plus près des champs.

#### h8. Le meunier (aisé) : la maison-bloc à étage et sa cour

- **Qui** : le meunier, sa femme, leurs trois enfants et une servante. Chacun fait moudre son grain au moulin, et le meunier en garde
  une part : l'homme le plus riche du village après le coq, et le moins aimé.
- **Pourquoi elle est comme ça** : **de la pierre et un étage**, ce qui ne se voit qu'au nord. Des moellons de calcaire montés **à la
  chaux** et **enduits** (un crépi lisse, blanc cassé) ; **les angles et les encadrements des baies en pierre de taille** (les pierres
  d'angle et de tableau du catalogue du coq) ; un toit de **laves** (la lauze du coq). **Une seule fenêtre vitrée**, à la salle, en
  losanges plombés : on la voit de la rue. **La cour fermée** par un mur de pierre et un porche charretier couvert sur la rue du nord :
  de la rue, on ne voit pas le grain ni la charrette.
- **Dimensions** : hors œuvre 12 × 7,60 m, murs de 60 cm ; dans œuvre 10,80 × 6,40 m par niveau. Rez-de-chaussée 2,60 m, étage 2,40 m,
  laves à 45°, faîte vers 8,20 m. Faîtage est-ouest, façade au sud sur la cour (22 × 13 m), le porche à l'est sur la rue.
- **Plan, rez-de-chaussée** :

```
 x : 0  60                  480 520        700 740                1140 1200    N ↑
 y=0  ####################################################################
      ## CUISINE             ##  ESC.  ##  SALLE                      ##
      ## [âtre au pignon O]   ##  ║ ║   ##   [cheminée, mur nord]       ##
      ##  pétrin   ▭ table   [p]  ║ ║  [p]                              ##
      ##  jarres  tonneau     ##  ║ ║   ##    ▭▭ grande table  = bancs  ##
 y=700##----[F]---------------##[PORTE]##--[VITRAIL]------[F]---------##
      ####################################################################
           COUR : le puits, la charrette ; l'écurie en appentis contre le mur nord de la cour ; le PORCHE à l'est sur la rue
```

- **Étage** : trois chambres (les parents au-dessus de la salle, les enfants au-dessus de la cuisine, la servante sur le palier),
  l'escalier droit de bois dans le passage.
- **Matières** : moellons enduits à la chaux ; pierre de taille aux angles et aux baies ; laves ; plancher de solives et de planches ;
  menuiseries patinées.
- **Réutilisé** : du jeu, `stone-hearth`, `chimney-flue`, `chimney-cap`, `cottage-door`, `inner-door`, `plank-shutter`,
  `threshold-stone`, `well`, `table` ×2, `bench` ×2, `bed` ×4, `chest` ×3, `jar`, `barrel`, `sack` ; **du catalogue du coq** (branche
  `maison-coq`, à intégrer avec lui) : `ashlar-quoin`, `ashlar-jamb`, `window-sill`, `window-lintel`, `leaded-glass`, `stone-slate`
  (la lave), `ridge-stone`, `kneading-trough` (le pétrin), les solives et le plancher, **l'étage**.
- **Nouveau** : `rendered-wall` (le mur de moellons enduit : le mur haut, une matière d'enduit) ; `wooden-stair` (l'escalier droit de
  bois, 90 × 300 × 260) ; `porch-gate` (le porche charretier couvert de laves, 3,40 × 1,20 m, ses deux battants) ; `courtyard-wall`
  (le mur de cour en pierre brute à la chaux, 2 m, chaperon de laves) ; `lean-to-stable` (l'écurie en appentis contre le mur de cour) ;
  les pans de laves en 13 m.
- **Place** : `aise-o1`, le quartier aisé, à l'ouest de la rue du nord, la plus au nord (en face du jardin du coq).

#### h9. Le forgeron (célibataire, artisan aisé)

- **Qui** : le forgeron du village (CADRAGE-forge, section 5 : grand, très musclé, les cheveux blonds), célibataire. Un artisan qui
  n'est pas pauvre : tout le village a besoin de lui.
- **Pourquoi elle est comme ça** : on **repart du logis mis de côté** (`art/proposals/forge-logis.ts` : 8 × 6,40 m, la salle et la
  chambre, la cheminée contre le mur nord), mais tout ce qui le rapprochait de la maison de Xéros change :
  - **la pierre** au lieu du pan de bois : un homme du feu ne vit pas sous du torchis à 4 m de sa forge ; des moellons à la chaux,
    rejointoyés clair ;
  - **les tuiles plates** au lieu du chaume (la couverture des métiers du feu ; le tuilier viendra) ;
  - **la cheminée au pignon ouest**, sa souche de pierre montant dehors le long du pignon (on la voit de la rue), au lieu de la hotte
    de torchis dans la salle ;
  - **le fer partout où un forgeron en mettrait** : les pentures de la porte (des ferrures en volutes, sa réclame), la grille de la
    fenêtre sur la rue, l'anneau pour attacher un cheval à ferrer, le grattoir à bottes devant le seuil, la girouette au faîte ;
  - **un seul lit**, grand (2 m), un banc, une chaise : il vit seul, et sa maison est trop rangée.
- **Dimensions** : hors œuvre 8,80 × 7,20 m, murs de 50 cm ; dans œuvre 7,80 × 6,20 m. Murs de 2,60 m, tuiles à 45°, faîte vers
  6,20 m, la souche vers 7,20 m. Faîtage est-ouest, façade au sud sur la rue de l'ouest (comme la forge).
- **Plan** :

```
 x : 0  50                      490 510             830 880      N ↑
 y=0  ##########################################################
      ## [ÂTRE au pignon O,        ‖ CHAMBRE                 ##
      ##  la souche dehors]        ‖  lit (2 m)   coffre       ##
      ##   ▭ table   = banc chaise [p]                        [F]
      ##   tonneau  jarre  seau    ‖  râtelier à habits        ##
 y=670##--[F+grille]--[PORTE à pentures]-‖----[F]--------------##
      ##########################################################
          anneau ○        grattoir ▬                     (la rue au sud)
```

- **Matières** : pierre brute à la chaux ; tuiles plates ; la cloison de la chambre en planches.
- **Réutilisé** : du logis de la forge, le plan et ses meubles ; `stone-hearth`, `chimney-flue`, `chimney-cap`, `inner-door`,
  `plank-shutter`, `threshold-stone`, `tile-roof-large` (raccourci), `bed`, `chest`, `table`, `bench`, `barrel`, `jar`,
  `bucket-water`, `lantern`.
- **Nouveau** : `strap-door` (la porte à pentures de fer forgé, 90 × 180, qui s'ouvre) ; `window-grille` (la grille de fer de la
  fenêtre, 60 × 40) ; `gable-chimney` (la souche maçonnée au pignon, du sol au-dessus du faîte) ; `tether-ring` (l'anneau scellé) ;
  `boot-scraper` (le grattoir) ; `weathervane` (la girouette) ; `plank-partition` (la cloison de planches, 140 × 5 × 240) ; `chair` (une
  chaise) ; le mur de pierre brute haut, à la chaux.
- **Place** : `o-n2`, à côté de la forge, au nord de la rue de l'ouest.

#### h10. Le maquignon (aisé) : le pignon sur rue à étage en encorbellement

- **Qui** : le maquignon, marchand de chevaux et de bœufs, qui court les foires de la ville ; sa femme, leurs deux fils. De l'argent
  qui vient de dehors : il s'habille mieux que le coq, et le coq ne l'aime pas.
- **Pourquoi elle est comme ça** : la maison du marchand de bourg : **pignon sur rue**, **un rez de pierre** (son comptoir, où il
  traite), **un étage de pan de bois en encorbellement** sur la rue (l'étage avance de 40 cm sur des solives en saillie : on gagne de
  la place, et on montre qu'on a de quoi), **le colombage serré** (des poteaux tous les 80 cm : le bois coûte, il en met deux fois
  plus), **deux fenêtres vitrées** au pignon de l'étage, **les tuiles plates**. L'écurie de ses chevaux est dans la cour, derrière.
- **Dimensions** : 12,80 × 8 m hors œuvre au rez ; rez de pierre de 2,60 m (murs de 50 cm), étage de pan de bois de 2,40 m qui avance
  de 40 cm à l'est (sur la rue) et au sud ; tuiles plates à 50°, faîte vers 9,60 m. Faîtage est-ouest, le pignon est sur la rue du
  nord.
- **Plan, rez-de-chaussée** (la rue à droite) :

```
 x : 0  50                    560 600          880 920              1280    N ↑
 y=0  #################################################################
      ## CUISINE             ##  ESC.  ##  COMPTOIR (où il traite)    ##
      ## [âtre au pignon O]   ##  ║ ║   ##   coffre ferré   pupitre   [F]
      ##  ▭ table   = banc   [p]  ║ ║  [p]   deux chaises            [PORTE]  rue →
      ##  jarres tonneau      ##  ║ ║   ##                            [F]
 y=750##----[F]--------------##[porte]##----[F]--------------------##
      #################################################################
           COUR à l'ouest : l'écurie (4 stalles), le fumier, l'abreuvoir
```

- **Étage** : la salle (au-dessus du comptoir, les deux fenêtres vitrées sur la rue, une cheminée), la chambre des parents, celle des
  fils.
- **Matières** : rez de pierre brute à la chaux ; étage de colombage serré chaulé ; tuiles plates.
- **Réutilisé** : le kit de Xéros pour l'étage (remplissages chaulés, plus étroits), `stone-hearth` et conduits, `inner-door`,
  `plank-shutter`, `tile-roof-large` (raccourci), `chest`, `table`, `bench`, `bed` ×3, `barrel`, `jar` ; **du coq** : `leaded-glass`,
  `high-chair`, `writing-desk` (le pupitre), le plancher, l'étage.
- **Nouveau** : `close-stud-panel` (le remplissage étroit, 60 × 15 × 200, entre poteaux à 80 cm) ; `jetty-joist` (la solive en saillie
  qui porte l'encorbellement) ; `wooden-stair` (comme h8) ; `iron-bound-chest` (le coffre ferré) ; `horse-stall` (la stalle
  d'écurie) ; `water-trough` (l'abreuvoir) ; le pan de tuiles en 13,60 m à 50°.
- **Place** : `aise-o2`, le quartier aisé, à l'ouest de la rue du nord, au plus près de la place.

#### h11. La guérisseuse (isolée, côté forêt)

- **Qui** : la guérisseuse, une femme sans âge, seule. Elle soigne, aide la sage-femme quand ça tourne mal, fait les tisanes et les
  onguents ; on vient la voir la nuit, et on s'en méfie le jour.
- **Pourquoi elle est comme ça** : **une chaumière basse à croupes** (un toit de chaume à quatre pans, qui descend jusqu'à 1,40 m du
  sol : de loin, on ne voit qu'un toit), aux murs de **torchis brut sur des poteaux ronds** (des perches de la forêt, pas des bois
  équarris) ; **les herbes sèchent** en bouquets sous l'avant-toit ; **le jardin de simples**, clos d'un **plessis** tressé ; deux
  **ruches** en paille ; la rivière à 10 m. La seule maison du jeu sans pignon.
- **Dimensions** : axes 4,80 × 3,20 m (perches tous les 1,60 m), murs de 1,60 m de haut ; le chaume déborde de 1,20 m tout autour :
  au sol, 7,20 × 5,60 m. Chaume à 50°, faîte vers 4,60 m. La porte au sud, sous l'avant-toit relevé en auvent.
- **Plan** :

```
 x :      0      160     320     480        N ↑
 y=0      o-------o---[F]-o-------o         o : perche ronde
          | lit     étagères (pots)  |
          |   ( foyer, crémaillère   |
          |     et chaudron )        |
          | coffre  ▭ table, mortier |
 y=320    o--[F]--o---[porte]-o------o
      ≈≈ bouquets d'herbes pendus sous l'avant-toit ≈≈
      ░░░ jardin de simples, plessis ░░░    ruches ⌂ ⌂     (la rivière à l'ouest)
```

- **Matières** : perches avec leur écorce (les chevrons de Xéros), clayonnage et torchis brut, chaume épais à croupes.
- **Réutilisé** : le clayonnage et le torchis du kit, `hearth`, `pallet`, `chest`, `table`, `stool`, `jar` ×3, `bucket-water`,
  `candle`.
- **Nouveau** : `thatch-hip-roof` (le chaume à croupes, quatre pans) ; `pole-post` (la perche debout comme poteau, un aspect de la
  perche) ; `pot-hook` et `cauldron` (la crémaillère et le chaudron, prévus aussi pour l'âtre de Xéros) ; `herb-shelf` (l'étagère à
  pots, 120 × 30 × 150) ; `mortar` (le mortier et son pilon) ; `herb-bundles` (les bouquets pendus) ; `plessis` (la clôture tressée
  basse, 160 × 10 × 90) ; `skep` (la ruche en paille, Ø 45 × 55).
- **Place** : `guerisseuse`, dans le bois du sud, en lisière, rive est.

---

## 4. Les planches (pixel-artist, hors jeu)

| Planche | Ce qu'elle montre | Outil |
| --- | --- | --- |
| `.art-preview/village-plan.png` | Le plan entier, à l'échelle, les noms et les foyers ; ce qui bouge ; un zoom sur la place et ses huitièmes ; les lieux hors du village | `npx tsx tools/essai-village-plan.ts` |
| `.art-preview/village-maisons-dehors.png` | Les onze maisons vues de dehors, chacune dans la vue de départ du jeu (palier 3 : 427 × 240 px du monde, environ 21 × 12 m), en x2, Xéros à côté, le foyer écrit dessous | `npx tsx tools/essai-village-maisons.ts` |
| `.art-preview/village-maisons-dedans.png` | Les intérieurs, toit effacé, mur sud coupé, en x2 ; le rez et l'étage côte à côte pour h8 et h10 | idem |
| `.art-preview/village-rue.png` | La rue du sud, deuxième tronçon (24 m) : le charpentier, le tisserand, les vieux à l'ouest, le couvreur à l'est, en x2 | idem |
| `.art-preview/village-pieces-1.png`, `village-pieces-2.png` | Les 52 pièces nouvelles, une par une, toutes leurs vues, en x4, à côté de Xéros (en deux fichiers : une seule planche dépassait 8 000 px) | idem |

---

## 5. Ce qui revient dans toutes les maisons : les pans de toit d'une autre longueur

Le jeu a ses pans à une seule taille (le chaume en 13,80 m, les grands pans de la forge en 9,60 m) ; chaque maison en veut d'autres
(de 3,80 à 17,50 m). C'est le même dessin sur une autre longueur, la question déjà posée à la forge (question 7 de CADRAGE-forge) :
il faudrait **des pans de toit de toute longueur**, comme les morceaux de mur, plutôt qu'une clé par longueur (question 7).

---

## 6. Ce que les maisons demanderont au moteur (plus tard, rien maintenant)

- **Le mur de pierre haut** (h2, h7, h8, h9, h10) : l'essai `walls-high.ts` a dit ce qui manque (la hauteur de face et de dessus
  dans `RunSpec`, les têtes au mur haut, les ouvertures et la reprise au-dessus d'un linteau, la bande nord-sud en projection, la
  vitesse) ; la maison du coq demande le même en pierre taillée.
- **L'étage** (h8, h10, et la mercière, la tailleuse, le boucher, la taverne, le sire) : le cadrage technique du coq (`maison-coq`,
  section 12), à intégrer d'abord.
- **Les pans de toit de toute longueur** (toutes), et **les croupes** (h11).
- **L'encorbellement** (h10) : une pièce posée en avant de ce qui la porte, sur des solives en saillie ; la règle « aucune pièce
  au-dessus du vide » (`overhang.ts`) doit savoir qu'une solive en saillie porte, comme une console.
- **Le foyer au sol et le trou de fumée** (h1, h5, h11) : la fumée qui sort par le chaume.
- **Les fenêtres sans volet** (le vitrail, la toile huilée) : une baie qui éclaire sans volet (CONCEPTION « Les intérieurs » : « pas
  de fenêtre sans volet » aujourd'hui).

---

## 7. Ce que j'ai fait cette nuit, dans l'ordre

1. Le worktree : les dépendances, `src/generated/` copié de `~/Code/rpg-game`, `npm run art` puis `npm run maps`.
2. Les lectures : CLAUDE.md, CONCEPTION (le monde, les bâtiments, les intérieurs, la maison de Xéros), CADRAGE-forge, le cadrage
   `maison-coq`, les cartes et leurs parcelles (rendues en aperçu), le plan de travail.
3. Le plan : `art/proposals/village-plan-data.ts`, vérifié par un calcul (dans les parcelles, hors de la place et des voies, loin des
   bords de zone, les objets à retirer).
4. Les maisons : ce cadrage, l'interface commune `art/proposals/village-types.ts`.
5. Les planches, par le sous-agent pixel-artist (section 8).

---

## 8. Ce que les planches ont montré

### 8.1 La leçon principale : on ne voit que les faces sud

Dans la projection du jeu (x, y − z), **une face tournée vers l'est ou l'ouest n'est qu'une bande vue de dessus** : une porte, une
fenêtre, un pignon tournés vers une rue nord-sud ne se voient jamais en jeu. Or la rue du sud et la rue du nord courent nord-sud, et
j'avais tourné plusieurs façades vers elles. Les deux dessinateurs l'ont vu chacun de son côté et ont fait la même chose : **ils ont
mis au sud ce qui doit se voir** (h2, h6, h10), et laissé à l'est ou à l'ouest ce qui ne compte que dedans. C'est la question 15 :
le plan doit-il, partout, tourner la face qui compte vers le sud ?

### 8.2 Ce qui a changé, maison par maison

| Maison | Changé par rapport à la section 3.2 | Pourquoi |
| --- | --- | --- |
| h1 couvreur | une fenêtre à volet ajoutée au pignon sud (la réserve) ; l'appentis de 1,90 m à 1,40 m de haut | le pignon sud est ce qu'on voit ; l'appentis passe sous l'égout du chaume |
| h2 tisserand | **l'atelier et sa grande baie de toile huilée passent au pignon sud**, l'âtre au pignon nord ; la porte reste sur la rue (invisible du jeu) | la baie est la réclame du tisserand : elle doit se voir |
| h3 vieux | murs de 2,40 m ; chaume en 6 m ; le trou de fumée au pignon ouest, au-dessus du bûcher | |
| h4 berger | un pan d'appentis neuf à 25° (`shingle-shed-roof-low`) au lieu de celui du jeu (35°) ; la cabane de 1,65 m au sud à 2,75 m au nord ; porte de 1,50 m | à 35°, le mur nord montait à 3,50 m ; à 14°, les bardeaux ne tiennent pas l'eau |
| h5 journaliers | deux trous de fumée, un au-dessus de chaque foyer | |
| h6 charpentier | **la porte d'atelier à deux battants passe au mur sud**, à l'angle de la rue ; une croix de Saint-André dans la première travée sud ; le pignon est garde ses croix et l'avancée | dans le pignon est, la porte ne se voyait pas |
| h7 laboureur | l'âtre contre le mur nord de la salle, au ras du refend ; pas de bêtes (des créatures, plus tard) ; la gerbière au pignon est ne se voit pas | la cheminée du jeu est faite pour un mur nord |
| h8 meunier | plancher de l'étage à 2,85 m (comme le coq), faîte à 9,05 m ; le porche dans le mur est de la cour ne se voit que par son toit | 45° sur 7,60 m de large ; la règle des faces sud |
| h9 forgeron | pas de râtelier à habits ; le reste comme prévu | |
| h10 maquignon | **les deux fenêtres vitrées au sud de l'étage**, faîte à 10,25 m ; l'escalier arrive dans la chambre des parents ; l'écurie de la cour bâtie avec la maison (4 stalles) | la règle des faces sud ; 50° sur les 8,40 m de l'étage en encorbellement |
| h11 guérisseuse | murs de 2 m (porte de 1,50 m, on se baisse) ; le chaume relevé d'aplomb au-dessus de la porte et de la fenêtre ; pas de trou de fumée ; la crémaillère sur un trépied ; la petite table de h3 | sinon l'égout cachait la porte et la fenêtre |

### 8.3 La rue (`village-rue.png`)

La rue montée telle que le plan la donne (les quatre maisons à leur place, rendues dans une seule scène) montre ce qui marche et ce
qui ne marche pas :

- **ce qui marche** : les matières disent le rang d'un coup d'œil (les bardeaux du charpentier, la pierre du tisserand, le chaume
  moussu des vieux, le beau chaume du couvreur) ; la rue de 4,80 m est à la bonne échelle ; les potagers en lanières font l'arrière
  d'un village ;
- **ce qui ne marche pas** : on voit **une suite de toits et de pignons sud, pas des façades** (section 8.1) ; à l'ouest, sur des
  parcelles de 8 m, **les trois maisons sont collées** (4 px entre le charpentier et le tisserand) et **le grand toit du tisserand,
  faîtage nord-sud, cache la moitié de la façade du charpentier** : c'est la vraie projection, un toit haut cache ce qui est au nord
  de lui ; à l'est, la parcelle du couvreur est surtout de l'herbe, et rien devant les portes (pas de cour).
- **Ce que j'en tire** (question 15) : au premier rang des rues nord-sud, **des maisons basses, le faîtage est-ouest, le pignon sur
  la rue et la façade au sud**, sur des parcelles de 10 à 12 m le long de la rue, avec une petite cour au sud de chaque maison : on
  verrait alors chaque façade, la cour devant, et le pignon du voisin du sud ne cacherait que son toit. Je n'ai pas refait le plan
  cette nuit : c'est à toi de choisir.

### 8.4 Les pièces nouvelles : 52

31 pour les maisons de bois (dont les pans de chaume percé, moussu, à croupes, d'appentis bas ; les remplissages écaillé et à croix ;
les pignons en torchis, à croix, à gerbière ; la porte à deux battants, la porte d'étable ; le berceau, les bottes de chaume,
l'échelle, le rouet, la petite table, la claie, la niche, la mangeoire, le fumier, la charrue, la perche debout, la crémaillère, le
chaudron, l'étagère à pots, le mortier, les bouquets, le plessis, la ruche, le chevalet), 21 pour les maisons de pierre (la toile
huilée, le métier à tisser, le dévidoir, le mur enduit, l'escalier de bois, le porche, le mur de cour, l'écurie en appentis, la porte à
pentures, la grille, la souche au pignon, l'anneau, le grattoir, la girouette, la cloison de planches, la chaise, le remplissage de
colombage serré, la solive d'encorbellement, le coffre ferré, la stalle, l'abreuvoir). Toutes sont sur `village-pieces.png`, avec
leurs dimensions, leurs vues et le contrôle du gabarit. **Repris du coq sans changement** : la lave et sa faîtière, les pierres
d'angle et de tableau, les encadrements de baie, le vitrail en losanges, le dallage, le plancher, le pétrin, la chaise à haut
dossier, l'écritoire (copiés dans le module de pierre, l'origine écrite en tête de fichier : à réunir quand le coq s'intégrera).

---

## 9. Les suppositions (ce que j'ai décidé sans Grégoire)

1. **La demande écrite l'emporte sur le plan de travail** là où ils diffèrent (section 1) : le quart nord-ouest entier à la ferme du
   riche, la tailleuse et son mari au sud-ouest, la guérisseuse hors du village, la corderie devenue « à décider ».
2. **La maison du coq passe à l'est de la rue du nord**, comme sur le plan de travail, dans la même bande au bas de la ferme du riche
   que le cadrage `maison-coq` ; son jardin descend devant elle jusque dans le village, la clôture de fer le long de la rue.
3. **Les mesures du découpage** : des quarts de 28,80 m, des ruelles de 3,20 m (2 cases), posées sur les bords de zone quand elles en
   longent un ; des parcelles de 8 à 10 m sur la rue au sud (un village dense), de 24 m à l'ouest (les parcelles `cottage` gardées),
   de 30 à 40 m au quartier aisé.
4. **La taverne** à l'est de la rue du sud, juste après le quart sud-est, sur un bloc entier de 28,80 m, la cour en terrasse à l'est
   (le plan de travail) ; elle n'est pas dessinée cette nuit (ce n'est pas une maison d'habitation).
5. **Le sire** reprend la parcelle `Mairie` (au nord de la route, à 55 m de la place), ses réserves dans un grenier à côté ; la
   parcelle « à décider » est celle d'en face, au sud de la route.
6. **La guérisseuse** dans la lisière du bois du sud, rive est, à 120 m au sud du chemin (section 2.3).
7. **Le moulin** sur la rivière dans le bois du nord (ta note du plan de travail) ; **la carrière** sur le plateau et **le four à
   chaux** sur la rive est, de part et d'autre du chemin creux (le plateau borde toute la rive ouest : c'est là qu'est la pierre, et
   le chemin creux est le seul passage) ; **la cabane du bûcheron** en lisière dans le bois du nord, sa famille au village ;
   **les étables** dans les cours des deux fermes.
8. **Les foyers sans maison dessinée** ont des métiers que j'ai proposés pour que le village tienne debout (le potier, le cordonnier,
   la lavandière, le tonnelier, la fileuse, le scieur de long, le jeune couple, le charretier, le vieux soldat, la sage-femme et le
   sabotier, le charron, le sergent du sire) ; les noms sont à toi.
9. **La boutique de la ferme du riche** est tenue par un commis qui n'y dort pas ; **le dépôt de la ferme rivale** n'a personne la
   nuit.
10. **Chaque maison est dessinée dans le sens de sa parcelle** (un plan ne tourne pas encore au jeu), son faîtage et sa porte notés.
11. **Le bois est patiné** dans toutes les maisons habitées, vieux chez les vieux (h3) et à la boutique abandonnée.
12. **La rue de la planche** `village-rue.png` est le deuxième tronçon de la rue du sud (entre la ruelle du milieu et la ruelle du
    bord) : le charpentier, le tisserand, les vieux à l'ouest, le couvreur à l'est.
13. **La onzième maison** : la demande en voulait une dizaine ; j'en ai fait onze, pour avoir deux « pas à plaindre » de formes
    différentes (le pignon sur rue du charpentier, la longère du laboureur), la longère étant la forme que la conception réservait
    à des voisins plus aisés.

---

## 10. Ce qui ne va pas encore

- **Les façades sur les rues nord-sud ne se voient pas** (section 8.1) : la porte du couvreur, du tisserand, le porche du meunier.
  C'est le plan qui est à revoir (question 15), pas les dessins.
- **L'âtre contre un pignon** (h8, h9, h10), vu de côté, se lit mal : la cheminée du jeu tournée montre ses marches et sa hotte, pas
  le feu. Il faudrait une cheminée de pignon dessinée pour cette vue.
- **Les écarts au gabarit** sont tous nommés sur la planche des pièces (un pignon de chant, un pan vu de dos, des pièces qui
  n'emplissent pas leur boîte, des débords de toit, l'escalier vu de côté) : aucun n'est une faute de dessin, mais `validate.ts` les
  refuserait tels quels ; il faudra décider pièce par pièce à l'intégration.
- **Des petits dessins faibles à cette échelle** : la charrue (maigre), le rouet (le bas de la roue caché), la girouette et l'anneau
  (à peine lisibles), le chaume moussu (encore tacheté).
- **Le chaume à croupes de la guérisseuse**, vu du sud, se lit encore comme un bloc carré : les croupes de l'est et de l'ouest se voient mal ; à reprendre.
- **Ce qui n'est montré nulle part** : la façade ouest du couvreur, les pignons est du charpentier et du laboureur (la gerbière, les
  croix), l'intérieur de l'écurie du meunier. Le modèle sait les rendre (une rotation), les planches ne les montrent pas.
- **Les pans de toit à leur longueur** n'existent que dans les maisons, pas comme pièces (question 11) ; le faîtage de terre
  interrompu au trou de fumée non plus.
- **L'ombre sous l'avant-toit** n'assombrit pas le bois vieux (h3) : une teinte de la palette à ajouter.
- **Deux modules pour un même modèle** : le bois et la pierre ont chacun généralisé la maison de Xéros à leur façon
  (`village-maisons-bois-lib.ts`, `village-maisons-pierre-matieres.ts`) ; à l'intégration, une seule source.
- **La taverne, les boutiques, le sire** ne sont pas dessinés : ce ne sont pas des maisons d'habitation (question 13).

---

## 11. Les questions (chacune avec ma recommandation)

**Le plan**

1. **Le découpage** : des quarts de 28,80 m autour de la place, une ruelle qui en fait le tour, des parcelles de 8 à 10 m sur la rue
   du sud et un second rang derrière la ruelle de l'ouest : est-ce la densité que tu veux ? *Recommandé : oui ; on pourra serrer
   encore le second rang si le village paraît vide en jeu.*
2. **La maison du coq** : à l'est de la rue du nord (ton plan de travail, ce que je propose) ou à l'ouest (le cadrage `maison-coq`) ?
   *Recommandé : à l'est*, comme tu l'as dessinée : son jardin descend vers la place, et le quartier aisé est en face, à l'ouest.
3. **La parcelle « à décider »**, au sud de la route : la corderie de ton plan de travail (un cordier, son allée de 60 m où l'on tord
   les cordes ; la corde existe au jeu) ? *Recommandé : la corderie*, avec son foyer, ce qui ferait 32 foyers.
4. **La guérisseuse** : dans la lisière du bois du sud, rive est, à 120 m au sud du chemin (ce que je propose), ou sur le chemin lui-même,
   juste avant le chemin creux, où tout le monde passe devant chez elle ? *Recommandé : la lisière* : on va la voir exprès.
5. **La carrière et le four à chaux** de part et d'autre du chemin creux (le plateau est la seule pierre du monde) ? *Recommandé : oui.*
6. **La troisième maison aisée** (à l'est de la rue du nord, sous le jardin du coq) : pour qui ? Un intendant du sire, un notaire, la
   veuve d'un marchand, le curé si le village a une église ? *Recommandé : la laisser réservée* jusqu'à ce que l'histoire en
   demande une.
7. **Ce qui manque peut-être au village** : une **église** ou une chapelle, un **four banal** (le pain : plus de boulanger depuis que
   les étals disparaissent), un **puits commun**, un **lavoir**. *Recommandé : le four banal et le puits commun, près du sire (ils
   sont à lui, on paie pour cuire) ; l'église, à toi de dire si le monde en a une.*
8. **Le frère du forgeron** (CADRAGE-forge, question 10) devait vendre sur un étal de la place, et les étals disparaissent : il vend
   à la forge, sous l'auvent sur la rue, ou il reprend la boutique abandonnée du menuisier ? *Recommandé : à la forge.*

**Les maisons**

9. **Les onze maisons** : la répartition des foyers, des formes et des matières (section 3.1) te va-t-elle ? Laquelle refaire en
   premier ? *Recommandé : les garder toutes, et retoucher d'après tes remarques sur les planches.*
10. **L'ordre d'intégration** : les maisons de bois et de torchis (h1, h3, h4, h5, h6, h7, h11) ne demandent presque rien au moteur
    (des pans de toit d'une autre longueur, quelques meubles) ; celles de pierre attendent le mur haut, et celles à étage l'étage du
    coq. *Recommandé : intégrer d'abord le coq (l'étage, la pierre taillée), puis les maisons de bois une par une, puis le mur de
    pierre haut et les maisons de pierre.*
11. **Les pans de toit de toute longueur** (section 5) : une pièce de toit qui se pose de la longueur voulue, comme les morceaux de mur,
    plutôt qu'une clé par longueur ? *Recommandé : oui*, c'est le même dessin.
12. **La girouette du forgeron** : un coq de fer (mais le coq du village pourrait s'en vexer…) ou un fer à cheval ? *Recommandé : le
    fer à cheval.*
13. **Les boutiques** (la ferme du riche, le bûcheron, la boutique abandonnée, la mercière, la tailleuse, le dépôt et son étal, le
    boucher, la taverne, le sire) : un chantier par bâtiment, après les maisons ? *Recommandé : oui, la taverne d'abord* (le lieu où
    l'on apprend les nouvelles).
14. **Les noms** des trente et un foyers : à toi, ou je propose une liste dans la tonalité du jeu ? *Recommandé : je propose, tu
    tranches.*
15. **La face qui compte au sud** (section 8.1) : le jeu ne montre que les faces sud. Faut-il, au plan, tourner toutes les maisons
    des rues nord-sud **le pignon sur la rue et la façade au sud** (comme le charpentier et le maquignon), ce qui donne une rue de
    pignons, très village ; ou garder des façades sur la rue qu'on ne voit qu'une fois dedans ? *Recommandé : le pignon sur la rue,
    la façade au sud*, partout où la rue court nord-sud ; je reprendrai le découpage des parcelles du sud dans ce sens (des parcelles
    plus profondes que larges, comme elles le sont déjà).

---

## 12. Les réponses de Grégoire (5 novembre)

« C'est très bien, c'est beau. » **Le plan et les onze maisons sont validés comme base**, à retoucher plus tard.

| Question | Réponse |
| --- | --- |
| 1. Le découpage | oui |
| 2. La maison du coq | à l'est de la rue du nord |
| 3. La parcelle « à décider » | **pas de corderie** : elle reste à décider |
| 4. La guérisseuse | en lisière |
| 5. La carrière et le four à chaux | oui, près du chemin creux |
| 6. La troisième maison aisée | réservée |
| 7. Ce qui manque | **pas d'église** (la religion, proche de la nature, se dégagera plus tard) ; **oui au four banal et au puits près du sire** |
| 8. Le frère du forgeron | il est le mari de la tailleuse (voir plus bas) |
| 9. Les onze maisons | gardées, à retoucher |
| 10. L'ordre | le chantier « hauteurs » (en cours), puis la maison du coq, puis les maisons de bois, puis celles de pierre |
| 11. Les pans de toit de toute longueur | oui |
| 12. La girouette du forgeron | un fer à cheval |
| 13. Les boutiques | oui, la taverne d'abord |
| 14. Les noms | pas de noms pour l'instant : Grégoire les donne en dernier, après les personnalités ; on nomme les gens par leur métier |
| 15. Les façades | **oui** : pignon sur la rue, façade au sud, parcelles de 10 à 12 m avec une petite cour |

**Ce qui était déjà décidé sur les gens du village** (corrigé dans le plan et ce cadrage) :

- **Pas de charpentier officiel** : c'est le fils aîné de la ferme rivale, le dépanneur du village, qui fait ce travail. La maison h6
  passe au **vannier**.
- **Pas de cordonnier** (les chaussures viennent de la ville), **pas de charron** (les roues sont importées) : la parcelle du
  cordonnier disparaît dans le nouveau découpage, celle du charron va au **bouvier de la ferme du riche**.
- **Pas de milice, pas de sergent** : le village est trop isolé. Le sire a **un intendant**, qui loge chez lui (proposé) ; la parcelle
  du sergent va à **la veuve de l'ancien menuisier** et leurs deux enfants (la boutique de la place est fermée depuis sa mort).
- **La tailleuse a pour mari le frère du forgeron**, qui travaille le cuir et vend l'équipement d'aventure avec ce que fait son frère :
  ils tiennent ensemble le grand bâtiment de bois du quart sud-ouest.
- **La mercière est la sœur du coq.** **Le bûcheron vit dans sa cabane** en lisière : sur la place, il n'a que sa boutique. **Le
  boucher vend la viande**, dont celle du chasseur. **La guérisseuse vit seule** ; elle et le chasseur ont une histoire qui n'est pas
  officielle.
- **Le charbon vient d'un village du nord, le métal de la ville.**

**Le découpage du sud, refait selon la question 15** : au premier rang de la rue du sud, des parcelles de **12 m le long de la rue**
(au lieu de 8 à 9,60 m), deux par bloc, avec un **passage de 4,80 m** vers les jardins là où le bloc fait 28,80 m. Les maisons s'y
posent faîtage est-ouest, pignon sur la rue, façade au sud sur une petite cour. Le charpentier, le cordonnier et le charretier
disparaissent du sud ; la lavandière passe au bout sud. **h1 et h2** (faîtage nord-sud aujourd'hui) **tourneront** à leur retouche ;
la rue (`village-rue.png`) est remontée sur ce découpage, les maisons pas encore tournées (le couvreur déborde encore sur la ruelle).
29 foyers.
