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

---

## 13. La place en détail (essai, 5 novembre ; rien ne change dans le jeu)

Repris du plan validé : les quarts coupés en diagonale, chaque huitième avec son bout de place, le panneau au milieu. Les emprises sont
dans `art/proposals/village-plan-data.ts` (parcelles `no`, `ne-n`, `ne-e`, `se-s`, `se-e`, `so`), les bâtiments dans
`art/proposals/place-nord.ts` et `place-sud.ts` (interface `place-types.ts`), les planches par `npx tsx tools/essai-place.ts`.

### 13.1 La règle qui commande la place : la face sud

Le jeu ne montre que les faces sud (section 8.1), et **un bâtiment haut cache ce qui est juste au nord de lui** (son mur et son toit
montent à l'écran sur le sol qui est derrière). Deux conséquences pour la place :

- **Les quarts nord** (la ferme du riche, le bûcheron, le menuisier) ouvrent au sud, sur la rue de l'ouest ou de l'est : **leur devant
  se voit**, c'est le bon côté de la place.
- **Les quarts sud** (la ferme rivale, la mercière, la tailleuse) ont la rue au nord : une boutique qui ouvrirait sur la rue ne
  montrerait que son dos et son toit. **Je propose qu'ils ouvrent au sud**, sur une cour ou une galerie où l'on entre depuis la rue
  du sud ou la ruelle de l'est, et que **ce qui se vend sur la place soit à la pointe du huitième, dégagé**, assez loin du bâtiment
  pour ne pas être caché (l'étal de légumes). Question 16.

### 13.2 Le quart nord-ouest : la boutique de la ferme du riche

- **Qui** : la ferme du riche y vend ce que les autres n'ont pas ; **le commis** de la ferme tient la boutique, logé avec sa femme dans
  la chambre de derrière. Les jours de marché, la femme du coq passe voir.
- **Les bâtiments** : la **boutique** sur la rue de l'ouest, 11,20 × 8 m hors œuvre, façade au sud ; à la pointe, **l'étal luxueux**,
  4,80 × 4 m, sur le bord de la place ; au fond du quart, **la réserve** (9,60 × 6,40 m) et une cour.
- **Matières, couverture** : la maison de pierre du riche, comme son coq en plus simple : moellons enduits à la chaux, encadrements et
  angles de pierre de taille (les pierres du coq), **laves** ; une fenêtre vitrée sur la rue, la seule de la place.
- **Plan** (la rue au sud) :

```
 x : 0  50                          640 680          1070 1120      N ↑
 y=0  #############################################################
      ## RÉSERVE FRAÎCHE             ## CHAMBRE DU COMMIS        ##
      ##  claies à fromages, jarres  ##  lit, coffre             ##
      ##  de miel, tonnelets         [p]                          ##
 y=360##---------[p]-----------------##-------------------------##
      ## BOUTIQUE : le comptoir de chêne sculpté (2,40 m),        ##
      ##  derrière lui les étagères (pots de miel, cire, épices,   ##
      ##  fromages affinés), le présentoir à gradins devant        ##
 y=750##--[VITRAIL]-------[PORTE]------[F]------------------------##     étal luxueux à la pointe →
      #############################################################
```

- **Ce qu'on vend et comment** : miel et cire (pots de grès, pains de cire, cierges), fromages affinés sur claies, épices de la ville
  en boîtes, pots de confiture, une jarre d'huile ; dans la boutique, sur **le comptoir sculpté** et les **étagères** ; dehors, sur
  **l'étal luxueux** : un **comptoir sculpté** sous un **auvent de toile rayée** aux couleurs du coq (guède et garance), sur deux
  poteaux tournés, un **présentoir à gradins** couvert d'une nappe, les produits en pyramide ; **une enseigne** au pot de miel et au
  coq.
- **Existant** : `table`, `chest`, `bed`, `jar`, `barrel`, `crate`, `sack`, `candle` ; du coq : les pierres de taille, la lave, le
  vitrail ; du module de pierre : le mur enduit.
- **Nouveau** : `luxury-counter` (le comptoir sculpté, 240 × 70 × 95), `striped-awning` (l'auvent de toile rayée, 480 × 300 × 260,
  sur poteaux tournés), `tiered-display` (le présentoir à gradins, 120 × 60 × 100), `shop-shelves` (les étagères de boutique, 200 × 40 ×
  180), `cheese-rack` (la claie à fromages), `honey-pot` (pot de miel, une vue ronde), `wax-cake` (pain de cire), `spice-box`,
  `hanging-sign` (l'enseigne pendue à sa potence, un dessin par métier).

### 13.3 Le huitième nord-est, côté rue du nord : la boutique du bûcheron

- **Qui** : le bûcheron y vend son bois ; **il vit dans sa cabane en lisière** : la boutique n'a pas de logis. Il y vient avec sa
  charrette les jours de vente ; le reste du temps, le bois attend sous l'appentis.
- **Les bâtiments** : le **magasin**, un hangar ouvert au sud, 9,60 × 6,40 m, au fond du huitième (dans le large) ; devant lui, au sud,
  **le chantier de vente** le long de la rue du nord : les tas de bois du jeu, un appentis bas pour les fagots.
- **Matières, couverture** : poteaux et bardage de planches (la grange, en plus petit), ouvert au sud ; **bardeaux** ; bois patiné.
- **Plan** :

```
 x : 0                                   960        N ↑
 y=0  P=====bardage=====P=====bardage=====P
      | planches debout, perches,          |
      | piles de bûches sèches             |
      | le billot, le chevalet, la scie    |
 y=640P - - - - - - (ouvert au sud) - - - - P
         comptoir (une planche sur deux billots)
      CHANTIER : tas de quartiers, de bûches d'1 m, de perches, de fagots ; l'enseigne à la hache
```

- **Ce qu'on vend et comment** : bûches, quartiers, perches, fagots, planches, piquets, bardeaux ; **en tas** (les tas calculés du
  jeu, comptés), **debout contre le bardage** (perches, planches), **en fagots** ; un **comptoir** fait d'une planche sur deux
  billots ; **une enseigne** à la hache et à la bûche.
- **Existant** : les tas de bois du jeu (pièces de bois, quartiers, fagots), `chopping-block`, `faggot`, `board-wall`, `wood-piece` ;
  du module de bois : `sawhorse`, `shingle-shed-roof-low`.
- **Nouveau** : `plank-counter` (le comptoir sur billots, 200 × 50 × 90), `wood-rack` (le râtelier où les perches et les planches
  tiennent debout), `hanging-sign` (motif : la hache).

### 13.4 Le huitième nord-est, côté rue de l'est : la boutique abandonnée de l'ancien menuisier

- **Qui** : personne. Le menuisier est mort ; sa veuve vit avec leurs deux enfants dans la petite maison de la rue de l'ouest (`o-s3`)
  et n'a pas pu reprendre l'atelier. On pourra le reprendre un jour (une quête, une boutique pour Xéros ?).
- **Le bâtiment** : 11,20 × 6,40 m, façade au sud sur la rue de l'est : l'atelier (6,40 m) et le logis (4,80 m). Pan de bois **vieux**,
  torchis chaulé **écaillé**, bardeaux **dont il manque des rangs** ; **les volets cloués** de planches en croix ; **l'enseigne tombée**
  au pied du mur, sa potence vide ; **l'herbe haute** contre le solin.
- **Plan** :

```
 x : 0      160     320     480     640     800     960     1120    N ↑
 y=0  P------P-------P-------P-------P-------P-------P-------P
      | ATELIER : l'établi, une chaise pas finie,  | LOGIS : un châlit vide, |
      | des planches, des outils rouillés,          [p] une table, un coffre   |
      | la poussière                                |                         |
 y=640P--[F cloué]--P--[PORTE à deux battants]--P---P--[F cloué]--P--[porte]-P
         enseigne tombée                herbes hautes
```

- **Existant** : le kit de la maison de Xéros au bois vieux, `workbench`, `table`, `chest`, `bed`, `crate` ; du module de bois :
  `lime-panel-flaking`, `twin-plank-door`, `sawhorse`.
- **Nouveau** : `nailed-shutter` (le volet cloué), `fallen-sign` (l'enseigne tombée) et `sign-bracket` (la potence vide),
  `tall-weeds` (l'herbe haute), `shingle-roof-damaged` (les bardeaux dont il manque des rangs), `unfinished-chair` (la chaise pas finie).

### 13.5 Le huitième sud-est, côté rue du sud : le dépôt et l'étal de la ferme rivale

- **Qui** : la ferme rivale ; **ses filles** tiennent l'étal les jours de marché, son fils aîné (le dépanneur du village) apporte les
  légumes en charrette. Personne n'y dort.
- **Les bâtiments** : à la pointe, sur le bord de la place, **le grand étal de légumes**, 6,40 × 2,40 m, tourné vers la place ; au
  large du huitième, **le dépôt**, une maison simple de 8 × 6,40 m, façade au sud sur la ruelle des quarts, à 5,60 m de l'étal (pour ne
  pas le cacher).
- **Matières, couverture** : le dépôt en pan de bois et torchis chaulé, chaume (comme les maisons modestes) ; l'étal **ne paie pas de
  mine** : des planches brutes sur des tréteaux, un auvent de planches mal jointes sur quatre perches, **sans fond** (on voit les
  légumes de toute la place).
- **Plan** :

```
 ÉTAL (6,40 × 2,40 m), face à la place (nord-ouest)            DÉPÔT (8 × 6,40 m), façade au sud
   ┌ auvent de planches sur 4 perches ┐                          P------P------P------P------P
   │ plateaux sur tréteaux : choux,   │                          | cageots vides, paniers,      |
   │ raves, poireaux, oignons, pommes │                          | sacs de pommes de terre,     |
   │ cageots et paniers à terre devant│                          | la balance, la charrette     |
   └ la balance à plateaux ───────────┘                          P--[F]--P--[PORTE]--P--[F]--P
```

- **Ce qu'on vend et comment** : les légumes de saison en tas sur les plateaux, en **cageots** (du vannier) et en **paniers** posés à
  terre devant, une **balance à plateaux**, une ardoise pour les prix ; pas d'enseigne : tout le monde sait.
- **Existant** : `crate`, `sack`, `barrel`, `bucket-water`, le kit de Xéros pour le dépôt (torchis chaulé, chaume) ; du module de bois :
  les tréteaux-chevalets (`sawhorse`).
- **Nouveau** : `rough-stall` (l'étal de planches sur tréteaux, une travée de 3,20 m), `plank-awning-poles` (l'auvent de planches sur
  perches), `vegetable-crate` (le cageot de légumes, en trois tirages : choux, raves et poireaux, pommes), `vegetable-basket`,
  `scale` (la balance à plateaux), `price-slate`.

### 13.6 Le huitième sud-est, côté rue de l'est : la mercière

- **Qui** : **la mercière, sœur du coq**, veuve d'un marchand de la ville, et sa fille. Elle a de quoi : elle vit de sa boutique et de
  ce que son frère lui laisse. La boutique en bas, **son logis à l'étage**.
- **Le bâtiment** : 9,60 × 8 m hors œuvre, à étage ; rez de pierre enduite (comme la famille du coq), étage de pan de bois chaulé,
  **tuiles plates** ; **façade et porte de boutique au sud** (question 16), sur sa petite cour, où l'on entre par la ruelle de l'est ;
  côté rue, une fenêtre et un volet-comptoir (l'ouvroir) pour les jours de marché.
- **Plan, rez-de-chaussée** :

```
 x : 0  50                             910 960      N ↑ (la rue de l'est)
 y=0  ##########################################
      ## CUISINE, ARRIÈRE-BOUTIQUE ║ escalier   ##
      ##  âtre, table, réserve    ║ de bois     ##
 y=380##-----------[p]-----------------[p]------##
      ## BOUTIQUE : le comptoir, le casier à   ##
      ##  tiroirs (fils, aiguilles, boutons),  ##
      ##  le présentoir à rubans               ##
 y=800##--[F]------[PORTE]--------[F]----------##
            cour de la mercière (vers la ruelle de l'est)
```

- **Étage** : sa chambre et celle de sa fille, une petite salle.
- **Ce qu'on vend et comment** : fils de lin et de laine en écheveaux, aiguilles, épingles, boutons d'os et de corne, rubans, galons,
  dés à coudre, petits pots (pommades) ; sur **un comptoir**, dans **un casier à tiroirs**, sur **un présentoir à rubans** ; **une
  enseigne** à l'aiguille et au fil.
- **Existant** : `chest`, `table`, `bed`, `stool` ; du module de pierre : `rendered-wall`, `wooden-stair`, `close-stud-panel`,
  `chair` ; du coq : le plancher et l'étage.
- **Nouveau** : `haberdashery-cabinet` (le casier à tiroirs, 160 × 45 × 180), `ribbon-rack` (le présentoir à rubans), `shop-counter`
  (le comptoir simple, 200 × 60 × 95), `shop-flap` (l'ouvroir : le volet qui se rabat en comptoir sur la rue, comme le volet d'étal du
  jeu), `hanging-sign` (motif : l'aiguille).

### 13.7 Le quart sud-ouest : la tailleuse et le frère du forgeron

- **Qui** : **la tailleuse** (elle coud et vend les vêtements ; la fille du coq est son apprentie, le jour) et **son mari, le frère du
  forgeron**, qui travaille le cuir (sacs, ceintures, fourreaux, outres, bottes rapiécées) et vend l'équipement d'aventure, avec ce que
  fait son frère (couteaux, haches, pointes, crochets). Leur logis à l'étage. Le charbon de la forge vient d'un village du nord, le
  métal de la ville : c'est lui qui les fait venir.
- **Le bâtiment** : **un seul grand bâtiment tout en bois, à étage, sans étal**, 14,40 × 9,60 m ; **façade au sud** sur sa cour
  (question 16), sous **une galerie de bois** à l'étage qui fait auvent devant les deux boutiques ; on entre dans la cour par un
  portail sur la rue du sud. Ossature de bois, **bardage à clins** (planches horizontales qui se recouvrent : la seule maison de
  planches de la place, et la plus soignée), **bardeaux**, bois patiné.
- **Plan, rez-de-chaussée** :

```
 x : 0                          720 740                         1440    N ↑ (la rue de l'ouest)
 y=0  P========================P=P==========================P
      | ATELIER DE COUTURE      ║ ║ ATELIER DU CUIR            |
      |  table de coupe, coupons║E║  établi de bourrelier, peaux|
      |  rouet, mannequin d'osier║S║  outils, la meule          |
 y=420P----------[p]-----------P C P----------[p]-------------P
      | BOUTIQUE DE VÊTEMENTS   ║ ║ BOUTIQUE D'AVENTURE          |
      |  perches à habits,       ║ ║  râtelier (sacs, outres,     |
      |  comptoir, coupons       ║ ║  cordes, lanternes), le      |
      |                          ║ ║  présentoir à couteaux       |
 y=960P--[F]--[PORTE]--[F]-----P-P--[F]--[PORTE]--[F]-------P
      ══════════ galerie de bois (l'étage, 1,60 m de profondeur), auvent des deux portes ══════════
                  COUR (l'enseigne aux ciseaux, l'enseigne au sac) ; portail sur la rue du sud
```

- **Étage** : la salle et la cuisine, leur chambre, une réserve d'étoffes et de cuirs ; la galerie au sud.
- **Ce qu'on vend et comment** : vêtements (chemises, cottes, chaperons, capes) **pendus à des perches**, étoffes en **coupons** sur
  la table, un **mannequin d'osier** habillé ; sacs, besaces, outres, ceintures, fourreaux, cordes, lanternes sur **un râtelier**,
  couteaux et haches du forgeron sur **un présentoir** de bois ; **deux enseignes** (les ciseaux, le sac).
- **Existant** : `table`, `chest`, `bed`, `bench`, `stool`, `barrel`, `lantern`, `rope-coil`, `grindstone` (la meule de la forge) ;
  du coq : `tailor-table`, `cloth-bolt` ; du module de bois : `spinning-wheel` ; du module de pierre : `wooden-stair`.
- **Nouveau** : `clapboard-wall` (le bardage à clins, sur l'ossature), `timber-gallery` (la galerie de bois à l'étage, ses poteaux, son
  garde-corps), `clothes-rack` (la perche à habits, 200 × 40 × 170, et ses vêtements), `dress-form` (le mannequin d'osier), `gear-rack`
  (le râtelier d'équipement, 200 × 40 × 180), `knife-display` (le présentoir à couteaux et à haches), `saddler-bench` (l'établi du
  cuir), `leather-hides` (les peaux pendues), `yard-gate` (le portail de cour), `hanging-sign` (motifs : les ciseaux, le sac).

### 13.8 Le panneau des nouvelles

- Au centre de la place, 1,60 × 0,30 m, 2,10 m de haut : **deux poteaux** plantés, **un tableau de planches**, **un petit toit de
  bardeaux** à deux pans, des **feuillets** cloués (avis du sire, ventes, objets perdus : plus tard, les quêtes), une **pierre** au pied
  pour monter lire. Bois patiné, vues `symmetric` (on le lit des deux côtés).
- **Nouveau** : `notice-board` (le panneau), `notice-sheet` (un feuillet, à poser).

### 13.9 Les enseignes

Une seule pièce, `hanging-sign` : une potence de fer forgé (du forgeron) et un panneau de bois peint pendu dessous, **un motif par
métier** (des `variants`) : le pot de miel au coq (ferme du riche), la hache (bûcheron), l'aiguille (mercière), les ciseaux (la
tailleuse), le sac (son mari) ; tombée, celle du menuisier (`fallen-sign`, un rabot). Pas d'enseigne à la ferme rivale ni au panneau.

### 13.10 Ce que les dessins ont changé (pixel-artist)

| Bâtiment | Changé | Pourquoi |
| --- | --- | --- |
| Ferme du riche | l'étal décalé de 40 cm vers l'est (x 2968-3064), l'auvent sur **quatre** poteaux tournés, indépendant de la boutique ; murs de 3 m, laves à 45°, faîte à 7,15 m ; la souche à cheval sur le faîte (conduit dévoyé dans le comble) ; l'âtre de la chambre du commis dos au mur nord | l'enseigne pend entre la boutique et l'auvent ; une souche posée au mur nord montait à l'écran comme une colonne dans la cour |
| Les enseignes | la potence fixée sur une face est ou ouest (pignon, poteau d'angle), le bras le long de la façade | une potence perpendiculaire au mur montrerait le panneau de chant (la règle des faces sud) |
| Bûcheron | sablière à 2,80 m, bardeaux à 40° ; l'enseigne au poteau d'angle | |
| Ferme rivale | l'étal et le dépôt à leur place ; le toit du dépôt monte à l'écran jusqu'en y 2483, l'étal finit en y 2448 : il reste visible | la règle 13.1 |
| Mercière | toutes les portes au sud sur sa cour (ouverte à l'est sur la ruelle) ; l'ouvroir au nord, sur la rue, ne se voit que toit effacé ; l'enseigne à l'aiguille sur un poteau planté dans la cour | la question 16 |
| Tailleuse | **la galerie fait 1 m au lieu de 1,60 m**, sans toit ; les portes de 1,80 m ; bardeaux à 40° (faîte à 9,40 m) ; la cour jusqu'en x 3248, le portail dans la palissade est (montré ouvert) ; les deux enseignes dos à dos au poteau du milieu de la galerie | à 1,60 m, le plancher de la galerie cachait les boutiques ; à 45°, le faîte montait à 10,10 m |
| Les cours | une **palissade de planches** (`yard-fence`, pièce ajoutée) | il fallait clore les cours |

42 pièces nouvelles (18 au nord, dont l'enseigne et ses cinq motifs ; 24 au sud), sur `place-pieces.png`. Ce qui reste faible : les petites
marchandises (pots de miel, pains de cire, boîtes d'épices : 4 à 5 px, des taches), le coq de l'enseigne du riche et le rabot de
l'enseigne tombée (illisibles à 14 × 10 px), la chaise pas finie (une échelle), l'herbe haute (des joncs), les carottes (les teintes
du feu), le dedans des abris (le toit cache presque tout ce qu'il couvre : c'est la projection), les cloisons nord-sud du dedans
qui restent pleine hauteur. Les couleurs nouvelles (toile guède et garance, miel, cire, fromage, grès, papier, encre, rouille) sont
à ajouter à `art/palette.ts` si la place entre au jeu.

### 13.11 Les questions de la place (chacune avec ma recommandation)

16. **Les quarts sud ouvrent-ils au sud** (sur une cour ou une galerie, où l'on entre par la rue du sud ou la ruelle de l'est), pour
    qu'on voie leurs boutiques, ou **sur la rue** (comme dans une vraie ville, mais on ne verrait que leur dos et leur toit) ?
    *Recommandé : au sud*, avec un ouvroir ou une fenêtre côté rue ; la place garde son étal de légumes dégagé à la pointe.
17. **L'étal luxueux de la ferme du riche aux couleurs du coq** (une toile rayée guède et garance), seule toile de couleur de la place ?
    *Recommandé : oui*, c'est ce qui le dit luxueux de loin.
18. **La boutique abandonnée du menuisier** : une boutique que Xéros pourra reprendre un jour (une quête), ou un décor ? *Recommandé :
    garder l'idée*, rien à faire maintenant.
19. **Les jours de marché** : les étals ouverts un jour par semaine (la ferme rivale, l'étal luxueux), les boutiques tous les jours ?
    *Recommandé : oui, plus tard*, quand les gens auront leurs horaires.
20. **Les feuillets du panneau** : les quêtes du village viendront-elles de là ? *Recommandé : oui*, avec les avis du sire.
21. **La place est trop grande et trop vide** (ce que montre `place-ensemble.png`) : 30 m de terre battue, les bâtiments repoussés au
    fond des quarts de 28,80 m ; la vue de départ au milieu de la place ne montre que de la terre et le panneau. Deux façons de la
    resserrer : (a) **rapprocher les bâtiments de la place**, leurs façades sur le bord du rond (les quarts plus petits, 20 m) ;
    (b) **réduire la place** à 20 m. *Recommandé : (a)*, la place garde sa taille de marché, et les boutiques la bordent vraiment.
22. **Meubler la place** : un grand arbre au bord (le tilleul ou l'orme de la place, où l'on s'assoit), des bancs, un abreuvoir, et
    les jours de marché des étals volants ? *Recommandé : l'arbre et deux bancs* tout de suite (des objets qui existent presque :
    le gros arbre du jeu, le banc), les étals volants avec les jours de marché (question 19).

### 13.12 Ce que montre la vue d'ensemble (`place-ensemble.png`)

- **Ce qui marche** : on lit une place de village, le rond de terre battue, les quatre quarts bâtis autour, les ruelles qui ferment le
  cadre ; les étals regardent la place (l'auvent rayé du riche, les planches de la ferme rivale) ; les cours palissadées du sud et le
  chantier du bûcheron se lisent.
- **Ce qui ne marche pas** :
  - **le vide** : le centre (la vue 1 n'est que terre), la prairie entre le bûcheron et le menuisier, la cour vide derrière la
    boutique du riche, le dépôt seul dans l'herbe (questions 21 et 22) ;
  - **les hauteurs des quarts sud** : le toit de la tailleuse et sa souche montent à l'écran par-dessus la rue de l'ouest, jusque
    devant la boutique du riche ; la souche de la mercière de même. C'est la vraie projection, mais elle surprend : des souches au mur
    sud (ou à cheval sur le faîte, comme le riche) l'atténueraient.
- **Les arbres** : quatorze retirés (sous un bâtiment, une cour ou une ruelle), cinq gardés autour de la place.
- **À corriger à l'intégration** : les enseignes de la mercière et de la tailleuse ne sont pas dans les `pieces` de leurs bâtiments ;
  quelques vues de pièces hors gabarit, de forme (nommées sur la planche).

---

## 14. La place resserrée (retour de Grégoire, 5 novembre)

« Le style des bâtiments est parfait, mais la place est à refaire. » Ce qui ne va pas, en ses mots : trop de vide, **le centre doit être
rempli, presque étouffant, plein et vivant**, quitte à ajouter des choses un peu inutiles ; les bâtiments **trop espacés et trop
petits** : ils sont serrés tout autour du rond, presque collés ; **toutes les entrées donnent sur le rond** ; la maison de la
tailleuse et de son mari **beaucoup plus grande**, deux boutiques en une avec leurs étalages chargés ; les étals **grands et
chargés** de marchandises qu'on voit, car on doit vraiment pouvoir acheter sur la place ; **chaque bâtiment est à la fois le commerce
et la maison de quelqu'un** (pour les deux fermes et le bûcheron, qui vivent ailleurs, celui qui tient la boutique y loge).

Réponses : 16 voir 14.2 ; 17 oui (l'auvent aux couleurs du coq) ; **18 : la boutique abandonnée est prévue pour la mère**, qui la
rachètera un jour avec l'aide de Xéros pour y ouvrir sa menuiserie ; 19 oui, plus tard ; 20 oui ; **21 : les deux**, rapprocher les
bâtiments et réduire le rond ; **22 oui** : le grand arbre au milieu, ses bancs.

### 14.1 Le nouveau plan (px de la zone village ; centre de la place C = (3312, 2128))

- **Le rond** passe de 30,40 m à **20 m** (rayon 200 px). La terre battue va du rond jusqu'aux façades : la place, c'est le rond et les
  recoins entre lui et les bâtiments.
- **Chaque quart est bâti en équerre autour du rond** : un bâtiment le long de la rue est-ouest, un le long de la rue nord-sud, qui se
  touchent presque à l'angle ; leurs bouts tournés vers le rond, **leurs portes sur le rond**. Les emprises proposées (hors œuvre ;
  le pixel-artist peut les ajuster d'un mètre ou deux pour serrer encore, et dit ses coordonnées finales) :

| Quart | Bâtiment | Emprise (x0-x1 × y0-y1) | Taille | Face vers le rond |
| --- | --- | --- | --- | --- |
| nord-ouest | la boutique de la ferme du riche (au rond) | 3024-3248 × 1744-1928 | 11,2 × 9,2 m, à étage | sud : **se voit** |
| | son logis et sa réserve (le long de la rue de l'ouest) | 2800-3088 × 1936-2064 | 14,4 × 6,4 m, à étage | sud, sur la rue, au bord du rond : se voit |
| nord-est | la boutique du bûcheron (au rond) | 3376-3600 × 1744-1928 | 11,2 × 9,2 m, à étage | sud : se voit |
| | la boutique abandonnée (le long de la rue de l'est) | 3536-3824 × 1936-2064 | 14,4 × 6,4 m | sud, sur la rue, au bord du rond : se voit |
| sud-ouest | la tailleuse et le frère du forgeron, **en équerre** : l'aile des vêtements le long de la rue de l'ouest et l'aile du cuir et des armes le long de la rue du sud, d'un seul tenant | aile ouest 2720-3104 × 2192-2432 ; aile sud 3008-3248 × 2320-2704 | environ 19 × 12 m + 12 × 19 m, à étage | nord et est : **ne se voit pas** (14.2) |
| sud-est | la mercière (le long de la rue de l'est) | 3520-3872 × 2192-2384 | 17,6 × 9,6 m, à étage | nord : ne se voit pas |
| | la ferme rivale (le long de la rue du sud) | 3376-3584 × 2400-2672 | 10,4 × 13,6 m, à étage | nord : ne se voit pas |

- **Le milieu** : **le grand arbre** (un tilleul, le gros arbre du jeu ou plus gros), un **banc rond** autour de son tronc ; **le panneau
  des nouvelles** à côté ; **un abreuvoir** de pierre près de la bouche de la rue du sud (les chevaux du maquignon, les bœufs) ; des
  bancs.
- **Ce qui remplit** (tout ce qui fait un marché vivant, même un peu inutile) : les étals débordants, les auvents, les caisses, les
  tonneaux, les paniers, les sacs, **une charrette** à bras chargée, une **charrette à deux roues** dételée, les enseignes, **du linge**
  qui sèche à une corde entre deux fenêtres d'étage, **des pots de fleurs** aux appuis, des **cageots empilés**, un **seau**, une **échelle**
  contre un mur, des **bottes de paille**, **des poules** plus tard (des créatures), un **chat** plus tard.

### 14.2 Les bâtiments du sud, qui tournent le dos au joueur

Le jeu ne montre que les faces sud, et **un bâtiment cache le sol juste au nord de lui sur la hauteur de son avant-toit** (son toit monte
à l'écran par-dessus). Les trois bâtiments au sud du rond ont leur entrée sur le rond, au nord : on n'en verrait que le toit. Deux
façons de faire vivre leur côté place, **montrées toutes les deux sur la planche** :

- **Solution 1 (recommandée) : l'appentis bas et les étals en avant.** Côté rond, le toit du bâtiment se prolonge en **un appentis
  ouvert, bas** (l'égout à 1,80-2 m, peu pentu), profond de 2,50 à 3 m, qui abrite la porte et les marchandises fragiles ; **devant
  lui, à 2 m au moins de son égout**, sur la terre battue, **les grands étals à ciel ouvert** et les marchandises dehors (caisses,
  tonneaux, paniers, mannequins, râteliers), qui se voient d'en haut. Quand Xéros passe sous l'appentis, son toit s'efface comme celui
  d'un abri ouvert (le jeu le fait déjà : `roofView`), et l'on voit ce qu'il abrite. Ce qui est à moins de 2 m de l'égout est caché :
  on y met ce qui n'a pas besoin d'être vu (le passage, des sacs).
- **Solution 2 : la boutique qui s'ouvre.** Le bâtiment garde sa façade sur le rond, sans appentis ; quand Xéros est devant la porte
  de la boutique, **la pièce de la boutique devient transparente** (toit et mur du nord coupés), comme une fenêtre au volet ouvert le
  fait déjà pour sa pièce (`windowFade`, `windowHole`), et l'on voit les comptoirs et les marchandises dedans. Moins de choses dehors,
  mais le moteur existe presque ; de loin, on ne voit qu'un toit.

### 14.3 Chaque bâtiment : le commerce et le logis

| Bâtiment | Qui y loge | Ce qu'on vend, comment c'est montré |
| --- | --- | --- |
| **La ferme du riche** | le commis et sa femme (à l'étage du logis) | miel, cire, fromages affinés, épices, confitures, huile, laine fine : **l'étal luxueux** sous l'auvent rayé guède et garance, sur le rond devant la boutique, deux comptoirs sculptés en équerre, présentoirs à gradins, claies à fromages, pots en pyramide ; dans la boutique, les étagères |
| **Le bûcheron** | son neveu et sa femme, qui tiennent la boutique (à l'étage) ; le bûcheron vit dans sa cabane | bûches, quartiers, perches, fagots, planches, piquets, bardeaux, **outils du bois** (cognées, coins, scies) : les tas débordent sur le recoin devant la boutique, un râtelier d'outils sous l'avant-toit, le comptoir sur billots, une charrette de bûches |
| **La boutique abandonnée** | personne (prévue pour la mère et sa menuiserie) | rien : les volets cloués, l'enseigne tombée ; quelques planches oubliées, l'herbe |
| **La tailleuse et le frère du forgeron** | eux, à l'étage des deux ailes | **deux boutiques, deux étalages chargés** : côté ouest, **les vêtements et les tissus** (habits pendus à des perches, mannequins d'osier, coupons empilés sur de longues tables, rubans, chapeaux, capes) ; côté sud, **le cuir, les armures, les armes et l'équipement d'aventure** (selles, sacs, besaces, ceintures, bottes, gambisons et cottes de cuir sur mannequins, boucliers ronds au mur, lances et haches au râtelier, couteaux au présentoir, cordes, lanternes, outres) |
| **La mercière** | elle et sa fille, à l'étage | fils, aiguilles, boutons, rubans, galons, dés, petits pots, **et la mercerie de tout le monde** (savon, chandelles, peignes, paniers du vannier) : un étal long devant son appentis, le casier à tiroirs, le présentoir à rubans |
| **La ferme rivale** | sa fille aînée et son mari, qui tiennent la boutique (à l'étage) | **légumes, fruits, œufs, pain de la ferme** : le grand étal de légumes, **deux fois plus long**, cageots et paniers débordants à terre, la balance, l'ardoise, une charrette de choux |

Les marchandises à dessiner, lisibles à la taille du jeu (au moins 6 px pour ce qui doit se reconnaître, en tas et en cageots
plutôt qu'à l'unité) : **légumes** (choux, raves, poireaux, oignons, carottes, citrouilles), **fruits** (pommes, poires, prunes),
**pain** (miches, couronnes), **fromages** (meules, tommes), **œufs** en panier, **bois** (les tas du jeu), **outils**, **tissus** (coupons,
rouleaux), **vêtements**, **cuir** (sacs, selles, bottes), **armes et armures** (épées, haches, lances, boucliers, gambisons), **pots**
(miel, grès), **chandelles**, **savon**.

### 14.4 Ce qu'il faudra pour acheter (un chantier à part, rien maintenant)

Le commerce n'existe pas dans le jeu ; ici, on ne dessine que les marchandises et les comptoirs. Pour acheter, il faudra :
- **la monnaie** : une matière et des pièces (deniers, sous, livres ?), gardées par GameState, une bourse (une case du HUD, ou un objet
  qu'on tient ?) ; la monnaie se gagne (vendre, travailler à la journée, les quêtes du panneau) ;
- **les prix** : un prix par objet (`price` de items.json et props.json, tiré de sa matière et de son travail ? `rocks.json` a déjà un
  prix pour la pierre), les prix de chaque vendeur (le riche plus cher) ;
- **les vendeurs** : des PNJ (characters.json) posés derrière leur comptoir, **leurs horaires** (la boutique ouverte, fermée la nuit ;
  les jours de marché, question 19), leur stock (ce qu'ils ont, ce qui s'épuise, ce qui revient) ;
- **le geste** : E sur un comptoir ou une marchandise de l'étal devant un vendeur présent → un dialogue d'achat (le prix, oui ou non),
  la marchandise dans la main (les deux mains : on ne porte pas plus qu'on ne tient) ; vendre à son tour (le bois de Xéros au
  bûcheron ?) ;
- **les marchandises sont de vrais objets** du monde, posés sur l'étal (le mode construction les pose déjà), pris par le geste
  d'achat : la matière se conserve (un objet acheté quitte l'étal) ;
- **les tests** : un scénario qui achète, la monnaie et la matière conservées.

### 14.5 Les planches à refaire

`.art-preview/place-ensemble.png` (la place à la vraie échelle, puis les vues de départ en x2 : au milieu de la place, devant chaque
boutique ; les solutions 1 et 2 des bâtiments du sud côte à côte), `place-batiments-dehors.png` (chaque bâtiment, en x2, avec Xéros) et
les pièces nouvelles (`place-pieces*.png`). Par le pixel-artist : `place-nord.ts` (la ferme du riche, le bûcheron, la boutique
abandonnée), `place-sud.ts` (la tailleuse et le frère du forgeron, la mercière, la ferme rivale), `place-centre.ts` (le grand arbre,
les bancs, l'abreuvoir, les charrettes, le linge, les pots, tout ce qui remplit), monté par `tools/essai-place.ts`.

### 14.6 Ce que les dessins ont changé (pixel-artist)

**Les emprises finales** (px de la zone village, hors œuvre) :

| Bâtiment | Emprise | Taille | Remarque |
| --- | --- | --- | --- |
| Boutique de la ferme du riche, à étage | 3040-3256 × 1744-1928 | 10,8 × 9,2 m | 80 cm plus étroite : le logis, plus au sud, cachait sa façade |
| Logis-réserve du riche, à étage | 2784-3072 × 1936-2064 | 14,4 × 6,4 m | |
| Étal luxueux | 3088-3224 × 1984-2064 | 6,4 × 4 m | à 2,80 m de la façade ; l'auvent rayé sur six poteaux tournés (6,40 × 3 m) |
| Boutique du bûcheron, à étage | 3368-3584 × 1744-1928 | 10,8 × 9,2 m | trois devantures à volet-tablette, les tas qui débordent jusque sur le rond |
| Boutique abandonnée | 3576-3864 × 1936-2064 | 14,4 × 6,4 m | 2 m plus à l'est : son toit cachait la devanture du bûcheron ; de plain-pied |
| La tailleuse et le frère du forgeron | aile des vêtements 2720-3040 × 2272-2432 ; aile du cuir 3040-3248 × 2320-2704 | 16 × 8 m et 10,4 × 19,2 m | l'aile des vêtements reculée de 4 m, ses étals sur le bord sud de la rue de l'ouest (3,30 m de passage) ; la cour dans l'équerre |
| La mercière | 3536-3872 × 2240-2400 | 16,8 × 8 m | reculée de 2,40 m, son étal long sur le bord de la rue de l'est (2,60 m devant la boutique abandonnée) |
| La ferme rivale | 3376-3568 × 2408-2672 | 9,6 × 13,2 m | à 40 cm de la mercière ; son grand étal en équerre, quatre travées, sur le bord du rond et contre le pignon de la mercière |
| Le panneau | 3234-3266 × 2172-2178 | 1,6 × 0,3 m | au sud-ouest du tilleul (au nord, le houppier le cachait) |

**Ce que les dessins ont appris** :
- **Solution 1** : sur un bâtiment à étage, l'égout est à 5,25 m et cache 5,35 m de sol au nord de son mur ; un appentis bas de 2,80 m tombe tout entier dans cette bande : **il ne se voit jamais du dehors**, seulement quand son toit s'efface au-dessus de Xéros. Les étals doivent commencer **2,55 m au-delà de l'égout de l'appentis** (pas 2 m) ; ils se voient alors bien, et font un front serré tout autour du sud du rond.
- **Une croupe au nord** sur l'aile du cuir et la ferme rivale (le faîtage nord-sud) : un pignon de 9,40 m tourné vers le rond cachait tout le recoin.
- **Solution 2** : de loin, trois toits ; devant la porte, la boutique fondue montre bien les comptoirs, une pièce à la fois. **Recommandation des dessinateurs et la mienne : la solution 1, complétée du fondu de la solution 2 quand on entre** (le fondu ne coûte presque rien : le jeu sait déjà le faire pour une fenêtre).
- **Le centre** : le tilleul (6,50 m de houppier, 7,50 m de haut) et son banc rond au milieu, son ombre ; l'échelle de la cueillette contre le tronc ; l'abreuvoir de pierre à la bouche de la rue du sud ; une charrette à deux roues dételée chargée de bûches au nord-est ; une charrette à bras au sud-ouest ; des tas de tonneaux couchés en pyramide, de la paille, des cageots, des sacs, des bancs, des pots de fleurs, du linge ; les quatre bouches de rue libres sur 4 m, un tour de 3 m autour du banc.
- **Ce qui reste à trancher au montage** : les choses du centre qui chevauchent les étals du sud (le centre a été composé avant que le sud ne recule), le linge et les jardinières dessinés deux fois, les rues de l'ouest et de l'est qui se resserrent à 2,60-3,30 m de passage.

### 14.7 Ce que montre la place resserrée (`place-ensemble.png`)

- **Pleine et vivante, étouffante par endroits** : tout le tour du tilleul est chargé (l'étal rayé du riche, les tas et la charrette
  du bûcheron, les perches à habits et les mannequins de la tailleuse, les râteliers et les boucliers du cuir) ; au sud-est, un amas
  serré de tonneaux, de cageots, de paille autour de l'abreuvoir, de la charrette à bras et du grand étal de légumes.
- **Ce qui reste libre, exprès** : les quatre bouches de rue (4 m) et le tour du banc rond (3 m). Le sud-ouest, entre le panneau et
  l'aile du cuir, est plus clair que le sud-est.
- **Solution 1 contre solution 2** : la solution 1 fait vivre tout le bord sud ; avec la solution 2, la rue de l'ouest et le recoin
  sud-ouest restent presque vides, et Xéros devant une porte est caché sous le toit ; le fondu montre bien la boutique meublée, mais
  seulement quand on est devant la porte.
- **Le montage a déplacé 30 choses du centre et en a retiré 2** (une corde à linge, un banc), parce que le centre avait été composé
  avant que le sud ne recule (la liste est sur `place-batiments-dehors.png`, en orange). On ne garde qu'une série de linge et de
  jardinières (celle des fenêtres d'étage).
- **Ce qui ne va pas encore** : les rues de l'ouest et de l'est n'ont plus qu'environ **2,50 m** de passage entre les façades du nord
  et les étals du sud (question 24) ; l'amas du sud-est, réglé par une règle automatique, gagnerait à être posé à la main ; l'ombre du
  tilleul en damier tramé ; l'échelle dessinée deux fois (le nord et le centre) ; des vues de dos hors gabarit (enseignes, auvent,
  présentoir, échelle, chaise), de forme ; `PLACE_META` de `place-types.ts` périmé (les planches lisent `WHO` et `NOTES`).
- **Le plan** (`village-plan-data.ts`, planche `village-plan.png`) suit la place resserrée : le rond de 20 m, les emprises finales, le
  panneau au sud-ouest du tilleul ; les huitièmes en triangle deviennent des rectangles (le découpage en équerre les remplace).

### 14.8 Les questions de la place resserrée (chacune avec ma recommandation)

23. **La solution 1** (l'appentis et les étals en avant au sud) **complétée du fondu de la solution 2** quand on entre dans une
    boutique ? *Recommandé : oui.*
24. **Les rues de l'ouest et de l'est** n'ont plus que 2,50 m de passage devant les étals du sud : reculer ces étals de 50 cm (3 m de
    passage), ou garder l'étroit, très village ? *Recommandé : reculer de 50 cm*, une charrette doit passer.
25. **Le tilleul** : son ombre tramée et l'échelle de la cueillette contre le tronc te vont ? *Recommandé : oui*, l'ombre à revoir
    au dessin si elle gêne en jeu.
26. **Le commerce** (14.4) : un chantier à part, après les maisons de bois ? *Recommandé : oui*, avec la monnaie, les prix, les
    vendeurs et leurs horaires.

### 14.9 Les réponses de Grégoire (la place validée : « c'est le genre qu'il faudrait »)

- **23 : oui**, la solution 1 au sud (l'appentis bas et les étals en avant), plus la boutique transparente quand Xéros est devant la
  porte (le fondu de la solution 2).
- **24 : oui**, les étals du sud reculent pour laisser 3 m de passage dans les rues de l'ouest et de l'est.
- **25 : oui**, l'ombre du tilleul se reverra en jeu si elle gêne.
- **26 : oui**, le commerce dans un chantier à part, après les maisons de bois.

### 14.10 On entre partout : la vérification des accès (5 novembre)

Calculée, pas estimée : `npx tsx tools/essai-place.ts acces` pose chaque image avec son emprise au sol réelle sur une grille de 5 cm,
cherche le chemin le plus large depuis les quatre rues jusqu'à chaque porte, puis de l'entrée au pied de l'escalier, et mesure les
rues de l'ouest et de l'est colonne par colonne (planches `.art-preview/place-acces.png` et `place-acces-dedans.png` : en rouge ce
qui gêne, en vert les chemins). Solution 1 au sud ; Xéros fait 60 cm, une porte 90 cm.

| Bâtiment | Porte | Chemin depuis le rond (le plus étroit) | Accès au logis | OK ou corrigé |
| --- | --- | --- | --- | --- |
| Boutique du riche | façade sud, sur le rond | 2 m ou plus | escalier au nord-est de la boutique : 1,60 m | OK |
| Logis-réserve du riche | façade sud, bout est, rue de l'ouest | 2 m ou plus | escalier contre le mur est, à côté de l'entrée : 1,60 m | **corrigé** : il n'y avait pas d'escalier vers l'étage ; ajouté, la table et le banc déplacés |
| Boutique du bûcheron | façade sud, entre les devantures | 1,25 m (0,85 m avant) | escalier contre le mur est du magasin : 1,60 m | **corrigé** : pas d'escalier, ajouté ; billot, chevalet et fagots décalés ; un banc du centre retiré, le chemin jusqu'au rond gardé libre |
| Boutique abandonnée, atelier | porte à deux battants, façade sud, rue de l'est | 2 m ou plus | porte de la cloison, logis de plain-pied : 0,85 m | OK (la porte reste barrée d'une planche clouée : voulu) |
| Boutique abandonnée, logis | porte du logis, façade sud | 2 m ou plus | le logis lui-même | **corrigé** : les planches oubliées étaient sur le seuil |
| Tailleuse, vêtements | façade nord, sous l'appentis, sur le rond | 2 m ou plus | escalier dans la boutique, contre le mur est : 1,15 m | **corrigé** : l'escalier était dans la réserve, son pied contre un mur ; déplacé, un portemanteau et un mannequin aussi |
| Tailleuse, cuir et armes | façade nord, sous l'appentis | 2 m ou plus | escalier dans la réserve, par la porte de cloison : 0,75 m | **corrigé** : l'escalier traversait une cloison ; les peaux pendues barraient la porte de cloison |
| Mercière | façade nord, sous l'appentis | 2 m ou plus, par le bout est de son étal | escalier de la cuisine, par la porte de cloison : 0,75 m | OK |
| Ferme rivale | façade nord, sous l'appentis | 2 m ou plus, par la rue du sud à l'ouest de l'étal | escalier de la réserve : 0,85 m | OK |

Les 0,75 m sont les portes de cloison de 80 cm, comptées à un pixel près.

**Les rues** (réponse 24) : **3 m** de passage dans la rue de l'ouest (les perches à habits et le mannequin reculés, ce qui bordait le
logis du riche collé à son mur, l'échelle contre son pignon) ; **3,05 m** dans la rue de l'est (l'étal long de la mercière reculé, et
avec lui **la façade nord de la mercière**, de 2240 à 2252 : 16,80 × 7,40 m ; sans cela, son toit cachait l'étal).

**L'amas du sud-est posé à la main** (`fixed` dans `place-centre.ts` : le montage ne le déplace plus) : un banc tourné vers l'arbre,
deux caisses empilées, le tas de tonneaux couchés, deux piles de cageots, deux tonneaux debout, des sacs, un panier, la paille,
l'abreuvoir et ses deux seaux ; 1 m entre les tonneaux et l'abreuvoir ; les bouches des rues du sud et de l'est, le tour du banc et
1,10 m devant les étals de la ferme rivale restent libres. Le nord-est aussi est posé à la main.

**Une seule échelle** : celle du centre (mieux éclairée, barreaux lisibles) ; celle du nord est retirée de son module.

**Ce qui reste** : les nouveaux escaliers ne percent pas encore le plancher dans la vue de l'étage ; l'échelle gardée penche à 63° ;
le montage déplace encore 12 petites choses du centre hors des zones posées à la main.
