# Xéros — conception

Ce qui a été décidé sur le jeu lui-même : univers, personnages, lieux, direction artistique, et ce qui vient ensuite.
La technique (architecture, conventions) est dans `README.md` et `CLAUDE.md`.

## Le jeu

- Jeu d'aventure très long, médiéval fantastique, ton terre à terre.
- On commence adolescent dans une petite ferme isolée près d'un village. Les premières tâches sont la vie quotidienne du garçon à la ferme, puis il découvre le monde petit à petit.
- Vue de dessus façon Stardew Valley, tuiles 32×32, Phaser dans le navigateur.
- Viendront plus tard : artisanat, combat (commencé : voir *Le combat*), inventaire, quêtes.
- Projet perso, pour le plaisir.

## Xéros

- 14 ans, fils de paysan.
- Physique : taille normale, maigre mais sec et taillé par le travail, visage qui commence à devenir anguleux.
- Yeux bruns, rêveurs, un regard de jeune héros. Air un tout petit peu fatigué.
- Peau très blanche de nature, hâlée par le soleil.
- Cheveux brun foncé, une vraie coupe au bol, côtés rasés à 3-6 mm.
- Tenue de pauvre : tunique de lin beige.
- Caractère : serviable, naïf, courageux, réservé.
- Portrait de dialogue en 64 px (choisi face au 96). Une seule expression pour l'instant (`neutral`), les autres viendront en déclinaison.

## La mère

- Xéros vit seul avec elle : pas de père, pas de frère ni sœur.
- Elle travaille à la ferme commune d'un paysan plus riche, cuisine, et sculpte le bois (son atelier est dans la maison).
- Physique : environ 35 ans, de la taille de Xéros dans le jeu (32 px de haut et 12 de large, contour compris : 1,60 m sur 60 cm), mains de travailleuse. Même famille de couleurs de peau que lui.
- Tenue : foulard de lin noué sur des cheveux châtain foncé, robe de laine bleu-gris délavé (teinture à la guède), tablier écru, manches retroussées.
- Portrait de dialogue en 64 px (`portrait-mother-64`), expression `neutral` ; la taille 96 et l'entrée dans `characters.json` viendront avec ses dialogues.

## La maison

Chaumière en longueur, colombages et torchis, toit de chaume. Confortable mais rudimentaire. Volontairement très vide pour l'instant : on la meublera plus tard.

Plan intérieur (validé) :

| Gauche | Milieu | Droite (séparée par une cloison) |
| --- | --- | --- |
| Réserve | Cuisine : cheminée avec feu, planche de cuisine | Atelier de bois de la mère |
| Couloir | Pièce commune | Petit poêle entre les deux pièces |
| Cagibi de Xéros | (pièce commune) | Lit de la mère |

- Entre la réserve et la cuisine, une porte de derrière vers le jardin.
- Les pièces communiquent par des passages sans porte.
- Le cagibi est le premier « inventaire » et le point de sauvegarde.
- La partie commence au réveil de Xéros dans son cagibi ; il doit pouvoir sortir.

Extérieur :

- La maison est dans le coin en haut à droite du carrefour.
- Derrière : un potager clôturé, et le tas de bois contre la cheminée.
- Cheminée et fenêtres cohérentes entre l'intérieur et l'extérieur.

## Direction artistique

- Direction B, « conte rustique » : tons terreux, légèrement ocrés.
- Intérieurs dans une pénombre chaude, feux qui vacillent, rais de soleil par les fenêtres sud.
- Sol varié avec des détails posés au hasard, pour casser la répétition.
- **Échelle réaliste partout** (décidé le 29 octobre 2026) : environ 5 cm par pixel, une case d'environ 1,65 m. Une maison a la même taille dedans et dehors ; une longère paysanne tient sur environ 9 × 4 cases.
- **Gabarit** (décidé le 29 octobre 2026) : une règle de dimensions et de perspective pour tous les objets, tirée des billes (`docs/STYLE.md`, section 8). Dimensions réelles contour compris, taille réelle pour tous les objets, plancher de lisibilité à 6 px de large, personnages de 12 px de large (60 cm, bras compris) ; la face de coupe d'un cylindre couché nord-sud était aplatie (× 7/11) pour qu'on le lise couché (remplacé le 30 octobre 2026 par la règle D, voir *La perspective*). Pour l'arbre, sa longueur couchée (5,65 m) fait foi.
- **Jeu cosy et lent** : les gestes répétés et les étapes réalistes sont assumés. La progression passe par de meilleurs outils qui raccourcissent les étapes (une scie, plus tard une brouette).

## Feuille de route

Ordre validé pour rendre le projet tenable dans la durée :

1. ~~Dépôt GitHub~~ (fait)
2. ~~`npm run check` : vérification du contenu avec Zod~~ (fait), ~~`WorldScene` découpée en systèmes~~ (fait)
3. ~~Cartes faites avec **Tiled** (format JSON)~~ (fait : chaîne Tiled → jeu en place, ferme et maison migrées sans changement visible ; voir *Cartes avec Tiled* et le README). ~~Discussion d'architecture « étape 2, comment une carte devient jouable »~~ (faite le 28 octobre 2026).
4. Sprites au format JSON d'**Aseprite** (format commun, chargé nativement par Phaser) ; plus tard, lecture des fichiers `.aseprite`.
5. État du jeu (inventaire, progression, sauvegarde) : avancé le 29 octobre 2026 avec la récolte, voir *Boucle de jeu : récolte et inventaire*. ~~La sauvegarde reste à brancher~~ : sauvegarde automatique branchée le 29 octobre 2026, voir *Sauvegarde et outils de test*.
6. ~~Discussion d'architecture « étape 3, la boucle de jeu »~~ (faite le 29 octobre 2026, sur la récolte ; passée avant l'étape 4).

## Cartes avec Tiled (décidé le 28 octobre 2026)

- **Tiled est un format source**, comme `art/`. Un outil de build traduit les cartes (`.tmj`) et les tilesets (`.tsj`) vers le format de carte du jeu ; le jeu ne lit jamais Tiled. Motif : le loader de Phaser ne lit pas les tilesets partagés, et les erreurs doivent rester lisibles.
- **Le sol est peint avec son rendu final** (pinceau terrain de Tiled). Le jeu affiche les tuiles telles quelles ; seuls les détails au hasard restent calculés en jeu. Les numéros de tuiles ne changent jamais d'une génération à l'autre.
- **Les objets sont un calque d'objets libres.** Chaque objet a un type (une entrée de `props.json`, qui reste le catalogue), une position au pixel et ses propriétés propres.
- **Points d'apparition et sorties.** Un point d'apparition est un point de type `Spawn` (son nom est son identifiant, plus `facing`). Une sortie est un rectangle de type `Exit` (`to`, `spawn`, `facing` facultatif). Ce rectangle est le premier type de zone ; d'autres suivront (`Trigger`).
- **Une nouvelle carte naît d'une esquisse** (grille de lettres, `npm run sketch -- <id>`) puis vit en `.tmj` : l'outil refuse d'écrire sur une carte existante, le `.tmj` fait foi (ajouté le 28 octobre 2026).
- **Les tilesets sont générés par `build-art`** et jamais modifiés dans Tiled. Les collisions restent dans `props.json`, et `tiles.json` devient un catalogue de propriétés par tuile et par terrain.

## Le monde (décidé le 1er novembre 2026, chantier « monde »)

Le but, décidé par Grégoire : **une grande carte à l'échelle vraie** (1 case = 1,60 m), où l'on marche pour de vrai, avec un village
petit et dense. **On bâtit le monde avant ses bâtiments** : le terrain, les chemins, la rivière, la forêt, les champs et les parcelles
d'abord ; les bâtiments se posent quand leurs pièces existent.

- **Le macro** : à l'ouest, la forêt, de plus en plus dense et sombre en s'enfonçant : c'est par là que le monde devient magique, vers le
  druide (le passage sera raconté plus tard par Grégoire). À l'est, le sérieux : la route officielle, empierrée, vers la ville et le
  château. Entre les deux, la ferme de Xéros, le chemin de terre, le village.
- **Le plan** (1 000 × 800 m, d'ouest en est ; aperçu `.art-preview/monde.png`) :
  - la **forêt**, de 0 à 300 m : la forêt profonde (`deepwoods`) à l'ouest, le sous-bois (`woods`), puis la lisière (`forest`), avec des
    clairières ; gros arbres et arbres normaux, tous abattables comme à la ferme ; la pénombre monte vers l'ouest (`gloom` de
    `src/content/world.json`, calculée au mètre du monde : elle ne change pas d'un coup au bord d'une zone) ;
  - la **rivière**, nord-sud, 8 m (5 cases), à 270 m, dans la forêt : la lisière est sur sa rive est ; le **pont de bois** la franchit
    sur le chemin, qui continue à l'ouest en sentier dans la forêt ;
  - la **ferme de Xéros**, 100 × 80 m, de 300 à 400 m : la chaumière, le tas de bois, l'étang, le potager clos, le champ clos (l'ancienne
    ferme, gardée telle quelle), un petit champ de plus à l'est ; le **cabanon du chasseur** (la cabane en rondins) à la lisière, juste
    au sud ;
  - le **chemin de terre**, 250 m, de la ferme au village, entre les prés ;
  - le **village en croix latine** autour de la **place ronde** (30 m, terre battue `yard`) et de ses **huit étals** : à l'ouest les abords
    (100 m, 3 parcelles de maison de chaque côté de la rue), au nord le quartier riche (100 m, 4 grandes parcelles), au sud le quartier
    résidentiel (180 m, une vingtaine de petites parcelles serrées, semblables), à l'est les parcelles officielles (80 m : la mairie, la taverne, deux
    réservées) ; les rues sont de terre battue, 3 cases (4,80 m) ;
  - la **route de la ville**, à l'est : 6,40 m, empierrée et bordée (`road`), jusqu'au bord du monde ; un **panneau** « vers la ville » ;
    on ne la franchit pas encore (le bord du monde arrête Xéros) ;
  - au-delà du quartier riche, au nord, **la ferme du riche** : sa cour au bout de la rue du nord, sa grange, son logis (une parcelle),
    ses champs labourés entre des haies de têtards et de buissons (320 × 190 m) ; au-delà du quartier résidentiel, au sud, **la ferme
    rivale**, faite de même ;
  - ailleurs, des prés (herbe et prairie de fauche), des bosquets, des friches.
- **Vingt zones de 200 × 200 m** (125 × 125 cases), chacune une carte Tiled (`tiled/maps/<zone>.tmj`) au nom qui dit ce qu'elle est,
  assemblées dans un monde Tiled, **`tiled/maps/monde.world`** (dans Tiled : Monde > Charger un monde ; on les voit alors côte à côte).
  Du nord au sud, d'ouest en est :

  | | 0-200 m | 200-400 m | 400-600 m | 600-800 m | 800-1 000 m |
  | --- | --- | --- | --- | --- | --- |
  | 0-200 m | `foret-profonde-nord` | `bois-du-nord` | `pres-du-nord` | `ferme-du-riche` | `champs-du-riche` |
  | 200-400 m | `foret-profonde` | `ferme` | `chemin` | `village` | `route-de-la-ville` |
  | 400-600 m | `foret-profonde-sud` | `bois-du-sud` | `pres-du-sud` | `quartier-sud` | `pres-de-l-est` |
  | 600-800 m | `foret-des-ronces` | `bois-de-la-riviere` | `friches` | `ferme-rivale` | `champs-rivaux` |

- **Passer d'une zone à l'autre** : Xéros qui marche hors du bord arrive dans la voisine, ses pieds au même point du monde, **sans
  fondu** : la scène redémarre sur la voisine (15 à 25 ms mesurés), la vue reprend sa place, la marche continue (les touches tenues sont
  gardées). Pour que cela ne se voie pas, **la bande des voisines** est dessinée par-delà chaque bord ouvert (21 cases à l'est et à
  l'ouest, 12 au nord et au sud : la moitié de la vue au zoom le plus éloigné) : leur sol, leurs détails, leurs objets tels que la partie
  les a laissés, leurs pièces posées ; rien n'y bloque ni ne s'y prend. La caméra ne montre donc jamais le vide près d'un bord ouvert. Au
  bord du monde (rien de l'autre côté), Xéros s'arrête. La sauvegarde, déjà rangée par carte, suit : la position est notée dans la zone
  où il est. Ce qui ne passe pas un bord : une bille qu'on roule, un tas, une pièce posée en mode construction (chacun reste dans sa zone).
- **La ferme** (`ferme.tmj`) est devenue la zone de la ferme : l'ancienne carte (32 × 22 cases) y est posée telle quelle, objets et
  identifiants compris (les sorties vers la chaumière, les dalles de l'étang), décalée de 78 × 43 cases. Xéros se réveille toujours dans
  son cagibi. Une partie d'avant le monde est refusée proprement (`SAVE_VERSION` 17).
- **Les parcelles** : un rectangle de type `Parcel` dans Tiled, sa destination (`use`, `src/content/parcels.json` : maison des abords,
  maison du quartier, maison de riche, mairie, taverne, réservée, logis de ferme) et son nom ; invisible en jeu, montrée en mode
  construction et avec `?debug` (sa couleur, son nom, sa taille en mètres). Les maisons s'y bâtiront quand leurs pièces existeront.
- **Les bâtiments posés depuis leurs plans** : un rectangle de type `Plan` dans Tiled (`plan` : un plan de `src/content/plans/`, `age`
  facultatif) ; à la première visite de la zone (ou dès qu'on la voit d'une voisine), ses pièces entrent dans la partie comme si on
  l'avait posé en mode construction : on entre dans la cabane, on ouvre les volets d'étal, le mode construction les retire. Posés : la
  cabane (le chasseur), les huit étals de la place, une grange dans chacune des deux grandes fermes.
- **La naissance** : `tools/monde-esquisses.ts` dessine tout le monde en un seul plan (lettres et objets placés au pixel : arbres par
  tirage de Poisson, plus serrés vers l'ouest, haies le long des champs), le découpe en une esquisse par zone, et agrandit la ferme ;
  chaque zone est née par `npm run sketch`. Depuis, **les .tmj font foi** : on retouche dans Tiled.
- **Vérification** : `npm run test:monde` (du cagibi à la place, puis au panneau, à travers les zones ; le bord du monde ; la page
  rechargée ; la mesure des passages et d'une image dans la forêt profonde) ; aperçu `.art-preview/monde.png` (`npm run art:monde`).
  Mesuré le 1er novembre 2026, dans la forêt profonde (la zone la plus chargée : 1 790 objets, 9 739 affichés avec la bande des
  voisines) : la logique du jeu prend 0,13 ms par image ; l'image entière 21 ms en moyenne (pire 25 ms) dans Chromium sans écran, dont
  le rendu est logiciel (pas de carte graphique) : sur un vrai navigateur, ce chiffre est un plafond, pas une mesure.
- **Choix faits sans Grégoire** (à revoir) : la rivière coule dans la forêt (la lisière sur sa rive est), si bien que le pont est sur
  le chemin qui part de la ferme vers l'ouest, en sentier dans la forêt ; les huit étals regardent tous le sud (un plan ne tourne pas
  encore) ; la place et les cours en terre battue ; 4 rangées de zones (800 m au lieu de 710 : des prés et des friches en plus au sud) ;
  le panneau posé vieux, avec une pierre de calage au pied (le gabarit de ses vues de côté) ; la pénombre du sous-bois est une couleur
  posée sur tout (Xéros compris), comme celle des intérieurs ; le pont en tuiles, pas en objet.
- **Tranché depuis** (clôture du *Temps*) : Xéros marche à 2 m/s et court à 2,5 m/s (`PLAYER.walk`, `PLAYER.run`, en m/s, une seule
  source, réglables dans ?dieu). Ce qu'on en disait alors : la vitesse de marche. Xéros marche à 100 px/s, soit 5 m/s : un kilomètre en 3 min 20 s (2 min en
  courant). « Un kilomètre en 13 minutes », la marche d'un homme (1,3 m/s), voudrait 26 px/s (`PLAYER.walkSpeed`, config.ts) : un seul
  réglage, mais il change tout le jeu ; il n'est pas changé.

## Boucle de jeu : récolte et inventaire (décidé le 29 octobre 2026)

Première boucle : Xéros prend la hache sur le billot, abat un arbre, ramasse les bûches.

- **Un seul état de partie, `GameState`**, objet typé et décrit avec Zod. Il contient l'inventaire et les changements du monde, rangés par carte et par identifiant d'objet Tiled (« objet 12 de la ferme : devenu `big-tree-stump` »). Les cartes décrivent le monde au début de la partie, `GameState` dit ce qui a changé. La sauvegarde l'écrit tel quel (voir *Sauvegarde et outils de test*). Pas le registry de Phaser : un objet à nous, vérifiable, indépendant du moteur.
- **Ce qui se récolte porte un composant `harvest`** dans `props.json` : `tool` (outil nécessaire, absent = à la main), `hits` (nombre de coups ; depuis *Le travail*, les étapes d'un travail au coup, dont la matière est `work`), `fall` (animation de fin), `becomes` (objet qui le remplace), `drops` (objets qui tombent, `min`/`max`). Un seul système `systems/harvest.ts` pour l'arbre, le rocher, les baies, le billot. La repousse (`regrow`) attend que le temps existe.
- **La hache est plantée dans un billot**, près du tas de bois de la maison. Le billot porte `harvest` sans outil, en un coup, devient `chopping-block` et donne la hache, directement dans les mains (`give` sur l'objet lâché) : un seul E, les deux mains libres.
- **Les objets possédables sont décrits dans `items.json`** : nom, icône `item-<id>`, `kind` (`tool`, `resource`...), `hands` (mains qu'il demande ; `stack` retiré avec la barre, le 29 octobre 2026 : une main tient un objet).
- **Un objet tombé reste au sol**, enregistré dans `GameState`, et se ramasse un par un avec E. Pas de ramassage automatique (choix de Grégoire).
- **Deux gestes.** E (ou Entrée) : les mains (parler, ramasser, prendre, cueillir). Espace : utiliser l'objet en main, même dans le vide. Sans le bon outil, un message court l'indique ; les mains prises, « Les mains pleines. ».
- ~~Barre de 8 cases~~, remplacée le 29 octobre 2026 par **deux mains** (voir ci-dessous).
- **Deux mains** (décidé le 29 octobre 2026). Xéros a une main gauche et une main droite, chacune tient un objet. Un objet lourd ou long prend les deux mains : la bille, la hache de bûcheron. Pas de besace pour l'instant : les mains sont tout l'inventaire.
  - Touches : **E** prend dans une main libre, ou repose devant soi ce qu'on tient à deux mains ; **Q** lâche l'objet de la main active devant soi ; **Tab** change de main active ; **Espace** utilise ce qu'on tient.
  - Les touches se lisent par leur place sur le clavier : **lâcher est la touche à la place du Q d'un QWERTY, soit A sur AZERTY** (confirmé le 29 octobre 2026), pour ne pas croiser le Q de ZQSD.
  - Un objet lâché reste au sol, enregistré dans `GameState`.
  - À l'écran : deux cases (main gauche, main droite) et la marque de la main active.
- **Le coup d'outil se compose** : une animation de geste pour le corps de Xéros, plus un petit sprite par outil posé dans la main image par image. Un nouvel outil = un sprite d'outil, pas une nouvelle animation du corps.

## Abattre un arbre (décidé le 29 octobre 2026)

Repris le 30 octobre 2026 par *Le bois* : les trois arbres se couchent d'un seul tenant, et le tronc ébranché devient une seule pièce de bois de sa longueur utile, qu'on coupe sur la grille de 20 cm ; plus de sections à encoches fixes ni de billes numérotées, et les billes font 1 m.

Principe : ce qui est petit va dans le sac, ce qui est lourd se porte à deux mains. Rien de volumineux ne se range dans l'inventaire.

- **L'arbre tombe du côté opposé à Xéros**, à gauche ou à droite seulement, et laisse sa souche. Repris le 2 novembre 2026 (voir
  *Le travail*, § 10) : il tombe **du côté où Xéros frappe**, celui de l'entaille de direction.
- **L'arbre couché est un nouvel objet** qui garde la taille et la forme de l'arbre, à l'horizontale, et bloque le passage sur toute sa longueur. Il est fait d'**un houppier et de 2, 4 ou 5 sections de tronc** (selon l'arbre) posés bout à bout, chacun réagissant pour lui-même.
- **Le houppier**, frappé à la hache, donne des branches ; les feuilles disparaissent avec lui. Il laisse le tronc nu, avec des chicots.
- **Les sections se coupent de haut en bas**, à des encoches dessinées sur le tronc. Xéros se place au-dessus ou en dessous du tronc, face à une encoche ; l'invite apparaît sur l'encoche. Le geste dépend de la cible : de côté sur ce qui est debout, de haut en bas sur ce qui est couché ou posé.
- **Chaque section coupée devient une bille** d'environ 1 m, qui reste au sol et bloque le passage tant qu'on ne la déplace pas.
- Ébrancher et tronçonner se font **dans l'ordre qu'on veut** ; la dernière section garde le houppier tant qu'il n'est pas coupé.
- **Porter** : une seule série d'animations « porter » pour Xéros (bras tendus, mains jointes devant le ventre, marche et attente dans les 4 directions), avec l'objet porté posé par-dessus à un point d'accroche, devant lui ou derrière sa tête selon la direction. Xéros marche plus lentement, ne fait rien d'autre, et repose l'objet avec E. Un nouvel objet portable n'a besoin que de son sprite.
- La bûche (`item-log`, 99 par case) contredisait le principe : retirée le 29 octobre 2026, avec l'ancien objet `log` (la bille de l'atelier est maintenant une `big-felled-log`).
- **Il y a trois arbres, de deux sortes** (deux arbres décidés le 29 octobre 2026, l'arbre normal le 30 octobre 2026, le têtard le 30 octobre 2026) :
  - le **gros grand** (`big-tree`), l'arbre de forêt : tronc de 55 cm (65 cm contour compris), 5,65 m, couché en 4 sections (4 billes) sous son houppier ;
  - le **têtard** (`big-pollard`), une trogne, l'arbre des haies, coupé régulièrement pour le bois de chauffage : le même tronc de 55 cm, court et épais, tête touffue ; couché, 2 sections (2 billes) et son houppier, sa longueur couchée égale à sa hauteur debout (environ 3,7 m). Il est de la même sorte que le gros grand : mêmes pièces couchées, même souche, mêmes billes, même tas ;
  - le **normal** (`normal-tree`), fin, pour la charpente : tronc de 30 cm (40 cm contour compris), environ 7 m de haut, élancé, billes de 95 cm sur 30 cm (40 contour compris), de la grosseur d'un bras, qui restent entières.

  Les billes des gros (95 cm) se fendent en quatre sur place (voir *Fendre*) ; plus tard, les quartiers se refendront en bûches sur le billot. Tous se coupent de la même façon : ils tombent du côté opposé à Xéros (depuis le 2 novembre 2026 : du côté où il frappe), s'ébranchent, se tronçonnent aux encoches, et leurs billes se portent, se tournent et s'empilent, chacune en tas de sa propre sorte (les billes des deux gros vont ensemble, celles du normal à part). Chaque pièce porte le nom de sa sorte en tête de clé (`big-tree`, `big-pollard`, `normal-tree`, `big-felled-log`, `normal-felled-log`...). Depuis l'équarrissage (30 octobre 2026), l'arbre normal ne se tronçonne plus aux encoches : ébranché, il devient un rondin de 5 m qu'on coupe où l'on veut (voir *Bois d'œuvre*).
- Pas encore discuté : la brouette. Le tas : voir *Les tas*.

## Les tas (décidé le 29 octobre 2026, repris le même jour, puis le 30 octobre 2026, « tas »)

Repris le 30 octobre 2026 (chantier « tas ») : depuis la pièce de bois, on tirait des pièces de toutes longueurs et de plusieurs états,
mais seules celles de 1 m s'empilaient, et beaucoup d'objets n'avaient ni fantôme ni pose à côté. En jouant, ça cassait le geste de
base : ranger ce qu'on vient de faire.

- **Tout se pose, avec son fantôme.** Tout ce qu'on porte (pièce de bois de toute longueur et de tout état, pierre plate, piquet,
  branche, corde, outils, fagot...) se pose avec E dans le vide (ou Q), là où le montre un fantôme en transparence : où il va tomber,
  dans quel sens (R le tourne avant de poser). Si la place juste devant Xéros est prise, il se pose à côté, à la place libre la plus
  proche ; sans aucune place, « Pas la place ici. ». Un seul chemin de pose pour tout (`systems/hands.ts`). Le fantôme ne se montre
  pas quand E vise autre chose (E agirait alors sur la cible).
- **La règle de la première pièce.** Un tas naît quand on pose une pièce contre une pièce identique déjà seule au sol, ou s'agrandit
  quand on la pose sur un tas commencé. Il prend tout de sa première pièce : diamètre, état, longueur, sens (et elle reste à sa place
  exacte). On n'y ajoute que des pièces identiques ; une autre pièce visée sur le tas est posée à côté, avec son fantôme, sans
  message d'erreur. Une pièce posée seule reste une pièce (elle se coupe, se fend, roule, pivote) : seule la deuxième fait le tas.
- **Des formes calculées, pas écrites.** La forme d'un tas de bois se calcule à partir de la section de sa pièce, pour toute
  longueur (`src/world/woodPile.ts`) : une section ronde (bille, rondin, même entamé à la doloire) fait une pyramide (3 au sol, 2
  dans les creux, 1 au sommet) ; les sections plates ou carrées (demi-bille, poutre) font des rangées droites de 3 de large sur 3 de
  haut ; les quartiers des rangées de triangles (voir *Les pièces fendues*, 31 octobre 2026 : avant, tête-bêche). Au
  sol, les pièces sont côte à côte à la largeur de leur collision ; une couche monte de la hauteur de la section (√3/2 dans les creux
  d'une pyramide), **comptée depuis la pièce porteuse de devant** : toutes les pièces s'emboîtent avec le même pas, rondes ou non,
  dans les deux sens. En est-ouest, le demi-pas en arrière d'un creux fait déjà monter la pièce à l'écran : il fait partie de la
  montée. (Corrigé le 31 octobre 2026 en jouant : il était compté en plus, et la 4e bille d'un tas de 3 rondins flottait au-dessus
  de celle du centre ; Grégoire : « Le bas de la quatrième bûche doit arriver au quart de la bûche du centre du tas de 3. » C'est
  ce que donne le pas commun, et `npm run test:perspective` le vérifie.) Le dessin du tas s'assemble pour toute longueur, comme les pièces.
- **Ce qui va en tas : ce qui se porte.** Seule une pièce de 70 kg ou moins (ce que porte Xéros, `carry` de strength.json, sans le
  multiplicateur de ?dieu) va en tas ; une pièce plus lourde se pose seule, ou se roule. **Pourquoi** : un tas se construit en
  portant ses pièces une à une, et on le défait de même ; une pièce que Xéros ne soulève pas ne monte pas sur un tas, et ne s'en
  reprendrait pas. Le fendage rend la grosse bille empilable (quartiers de 53,5 kg à 1 m) ; une pièce plus courte se porte aussi
  (le rondin de 1 m, 63,6 kg ; la demi-bille de 60 cm, 64 kg).
- **Ce qui reste écrit à la main** (`piles.json`) : ce qui ne se calcule pas, parce que chaque place a son propre dessin ou que la
  pièce n'est pas du bois : les branches (10 places tête-bêche dessinées une à une, leur lien et leur compte), les fagots (6 places,
  nord-sud avec R). Les anciens tas de billes, de rondins et de quartiers de 1 m sont des tas calculés (sauvegarde : `SAVE_VERSION` 8,
  convertie ; les quartiers passent de la pyramide aux rangées).
- Le reste ne change pas : reprendre (E, mains libres) enlève la pièce la plus haute, la place visée dépend de l'endroit où se tient
  Xéros (le creux au centre, le sol à côté), un tas bloque le passage dès sa première pièce (les branches à 3), le lien et le nœud
  des fagots sont les mêmes.

Ce qui suit est la décision du 29 octobre 2026, gardée pour mémoire (les tas de 1 m écrits à la main y sont remplacés par ce qui
précède) :

- **On construit un tas pièce par pièce, comme en vrai.** Un tas a des places, décrites en données : leur position, leur couche, et les places qui les portent (une place du dessus n'existe que quand celles qui la portent sont prises). Chaque place a sa pièce ; le tas s'affiche couche par couche, du bas vers le haut, sauf les billes, affichées de l'arrière vers l'avant : la bille de devant se voit entière et ne cache de celle de derrière que ce qu'elle cacherait vraiment (précisé le 29 octobre 2026). Une bille a la même longueur (19 px, 95 cm, celle de la pièce du tronc) et le même diamètre (13 px contour compris, 65 cm, dont 11 px d'écorce) dans les deux sens ; au sol, deux billes voisines sont à 11 px l'une de l'autre.
- **Poser** : la place visée dépend de l'endroit où se tient Xéros le long du tas. Au centre entre deux pièces posées, la pièce monte dans le creux ; décalé, elle va au sol à côté. Une prévisualisation en transparence montre la pièce à la place exacte où elle ira, et suit Xéros. **Reprendre** (E, mains libres) enlève la pièce la plus haute accessible.
- **Billes** : toutes parallèles, dans le sens où elles reposent après la coupe. 3 au sol côte à côte, 2 dessus dans les creux, 1 au sommet : 6. Le tas plein ressemble à un petit tas de bois.
- **Branches** : toutes parallèles, posées tête-bêche (le gros bout alterne d'un côté et de l'autre), côte à côte puis par couches. Dimensions réalistes : une branche fait 1 à 1,5 m. Le tas plein a à peu près le volume d'une bille : c'est la future matière d'un fagot.
- **Une bille peut être tournée** (décidé le 29 octobre 2026). R (lu par sa place sur le clavier) tourne la bille portée entre est-ouest et nord-sud ; le fantôme suit. La première bille d'un tas fixe le sens du tas ; les suivantes s'y alignent d'elles-mêmes. Un tas nord-sud se construit face à lui : Xéros se tient au sud et se déplace d'est en ouest pour choisir le sol ou le creux ; on y voit le triangle des faces coupées.
- **Les genres ne se mélangent pas.** Un tas de branches bloque le passage à partir de 3 pièces, un tas de billes toujours. Pas de recul de Xéros : sans place, « Pas la place ici. ». Les branches tombées d'une récolte restent éparpillées.

## La corde et le fagot (décidé le 29 octobre 2026)

- **Une fiche par objet, avant de le construire** (`docs/objets/`) : identité, dimensions réelles, toutes ses vues, regroupement, gestes, origine, devenir, vérification.
- **Le rouleau de corde** (chanvre, Ø 30 × 10 cm, une main) porte sa longueur restante, 10 m au départ, gardée par la partie. Il ne se range pas en tas. On le trouve dans la réserve de la maison ; plus tard il s'achètera ou se fabriquera.
- **Couper un lien** : on pose le rouleau sur le billot (E, rouleau en main, face au billot), puis Espace avec la hachette (l'outil naturel, 0,4 point d'endurance, ajouté le 30 octobre 2026) ou la cognée (0,5 point). Toujours
  vrai : couper un lien est un geste sans matière, au prix fixe de `costs` (`whittle`, `cutTie`). Un lien de 2 m tombe au sol, le rouleau perd 2 m ; vide, il disparaît. On peut reprendre le rouleau posé sur le billot (E, mains libres).
- **Le lien** (2 m, une main) se pose par terre, où il commence un tas de branches sur lui, ou sous un tas de branches qui n'en a pas, qu'il ceinture par-dessous. Il reste visible sous le tas.
- **Nouer et dénouer** : E maintenu environ une demi-seconde, mains libres, une jauge au-dessus de Xéros. E court garde son rôle (une branche, le fagot entier). Un tas de 10 branches lié se noue en fagot, à sa place ; sinon « Il faut un lien. » ou « Pas assez de branches. ». Un fagot seul se dénoue en un tas de 10 branches avec son lien ; dans un tas de fagots, « Un seul fagot à la fois. ».
- **Le fagot** (130 × Ø 50 cm, deux mains) ralentit comme la bille ; il se pose seul ou en tas, même forme que les billes (6 au plus), et se tourne avec R.
- **Le nombre de branches** d'un tas s'affiche en tout petit en bas à droite du tas, seulement quand Xéros est tout près.

## Construire (décidé le 29 octobre 2026)

- **On apprend à bâtir comme en vrai**, en trois bâtiments, chacun ajoutant une technique au précédent :
  1. **Un abri à bois ouvert** : des dés de pierre, des poteaux de bois équarri, des sablières, des chevrons et un toit de
     planches à une seule pente (appentis à environ 20°), sans mur. On y range le bois au sec.
  2. **Une cabane fermée** : la même charpente, plus des murs de clayonnage (branches tressées entre des piquets) enduits de
     torchis, et une porte.
  3. **La maison** : un solin de pierre sous les murs, une longère d'environ 9 × 4 cases, des fenêtres, une cheminée.
- **Méthode : un jeu de pièces.** Chaque pièce (dé, poteau, sablière, chevron, couverture...) est un objet du catalogue,
  avec sa fiche (`docs/objets/`) et ses dimensions réelles, dessiné selon le gabarit et comparé aux étalons. Un bâtiment
  s'assemble dans Tiled, pièce par pièce, **dans l'ordre réel du chantier** (les dés, les poteaux, les sablières, les
  chevrons, la couverture) ; l'ordre est noté en données (le plan, `src/content/plans.json`) et l'aperçu montre le bâtiment
  monter, étape par étape.
- **Une pièce posée sur la carte se voit à sa place réelle.** Les pièces sont posées sur le sol à leur emprise exacte
  (5 cm par pixel) ; une pièce en hauteur (sablière, chevron, toit) garde sous elle, dans son image, la hauteur qui la
  sépare du sol, pour que l'ordre d'affichage reste celui de son pied. Une pièce qui relie des appuis posés au sol (une
  sablière nord-sud, un chevron, la couverture) se voit avec sa profondeur au sol, sans raccourci, pour rejoindre ses
  poteaux (gabarit, `ground`).
- **On passe sous un toit.** Seuls les poteaux bloquent le passage ; Xéros entre sous l'abri. Le toit (chevrons, planches)
  se dessine au-dessus de lui et devient en partie transparent quand il est dessous ou caché derrière. On peut entasser
  sous un abri comme ailleurs.
- **L'abri repris** (30 octobre 2026) : toit de planches posées dans le sens de la pente, avec un avant-toit visible, appentis
  à environ 20° (poteaux de 3 m au nord, 1,70 m au sud, puis 1,80 m depuis *Le bois* : la grille de 20 cm, pente de 18,7°), poteaux de 20 × 20 cm ; l'ombre portée du toit est calculée par le
  jeu (sa projection au sol, décalée selon la lumière), sous les poteaux et sous Xéros, et s'efface avec le toit.
- **Chantier en cours : l'abri à bois seulement, et seulement ses fondations** (décidé le 30 octobre 2026, « implantation »).
  L'abri n'est plus posé tout construit dans la ferme : Xéros le bâtit, comme en vrai, en commençant par apprendre le plan,
  tracer l'emprise au sol avec des piquets, puis poser les dés de pierre. Les poteaux, sablières, chevrons et toit
  viendront dans d'autres chantiers ; celui-ci prépare le moteur qui les portera.
- **Le plan.** Une planchette de bois où la mère, qui sculpte, a gravé le plan de l'abri (`plan-tablet`), posée sur une table
  de sa chambre (`maison.tmj`). E dessus : « Xéros connaît maintenant le plan de l'abri à bois. » ; la planchette reste en place.
  Les plans connus sont dans GameState (`knownPlans`). Un plan est un fichier de contenu (`src/content/plans.json`), en
  centimètres : son emprise (305 × 355 cm entre les axes des coins), ses quatre coins, le piquet qui le trace, puis ses étapes
  dans l'ordre réel (dés, poteaux, sablières, chevrons, toit). Chaque étape a ses places ; chaque place dit sa pièce, sa
  position (le coin bas gauche de l'image depuis le piquet nord-ouest, reprise de l'abri d'avant), son orientation, la place
  sur laquelle elle repose, et la pièce qu'elle accepte. Seule l'étape des dés est jouable ; les autres sont déclarées et
  marquées « à venir » (`soon`) : `validate.ts` vérifiera leurs pièces quand elles seront ouvertes. L'orientation est fixe
  pour l'instant : le côté haut du toit au nord, l'abri n'est dessiné que dans ce sens. **Un nouveau bâtiment = un plan
  dans `plans.json`, sans code nouveau.**
- **Le piquet** (`stake`, fiche `docs/objets/stake.md`), corrigé le 30 octobre 2026 : en vrai, on ne frappe pas une branche couchée à la
  cognée. On tient la branche debout d'une main, la pointe appuyée sur le billot, et on taille la pointe avec **la hachette**
  (`hatchet`, fiche `docs/objets/hatchet.md` : fer d'environ 12 × 8 cm, manche de 40 cm, 1 kg, une main, trouvée dans la réserve de la
  maison avec la masse et le coin ; la cognée, à deux mains, ne change pas) dans l'autre. Face au billot, Espace : un coup (le geste
  `chop`, sans nouvelle pose) et la branche devient un piquet taillé en pointe, environ 100 × 5 × 5 cm, 1 kg, qui reste dans la main
  qui la tenait. Le coup coûte 0,4 point (`whittle`), la moitié d'un coup de cognée (repris par *Le travail* : tailler est un travail
  au coup, `work.whittle` du billot, la pointe à enlever, payé au joule ; environ 58 coups de hachette, une demi-minute). Si l'autre main ne tient pas une branche : « Tiens la
  branche debout sur le billot, de l'autre main. » Planter un piquet coûte 0,5 point d'endurance.
- **Tracer.** Piquet en main, plan connu, Espace sur le sol : le piquet se plante. Sans plan connu : « Xéros ne sait pas encore
  quoi tracer. » Le premier piquet fixe le coin nord-ouest de l'emprise ; les trois autres coins apparaissent en fantôme, et
  les piquets suivants ne se plantent que là (un coin à moins de 12 px du point visé aimante le piquet ; ailleurs : « Les
  piquets se plantent aux coins du tracé. »). E sur un piquet planté, tant que le chantier n'est pas né : on le reprend, ce qui
  permet de changer d'emplacement. Au quatrième piquet, le chantier naît si toute l'emprise est libre (pas d'objet, d'eau, de
  mur, de tas ni d'objet au sol ; Xéros lui-même ne compte pas) ; sinon « Il y a quelque chose dans le passage. » et le
  quatrième piquet reste en main.
- **Les dés de pierre.** La pierre plate (`flat-stone`, fiche `docs/objets/flat-stone.md`) fait environ 40 × 40 × 15 cm (30 × 30 jusqu'au 31 octobre 2026 ; 40 pour que le poteau debout de 8 px tienne sur le dé sans déborder, pas 45 : 79 kg, trop pour Xéros). Sa
  masse est calculée avec une densité de pierre de 2 600 kg/m³ (`STONE_DENSITY`, `src/content/mass.ts`, à côté de celle du bois) :
  62 kg, portée à deux mains, lentement (au-dessus de 25 kg : pas de course). La ferme a un étang : les pierres sont sur sa berge
  (six, posées dans Tiled : quatre pour l'abri, deux de marge), pas dans un pierrier. Une pierre posée sur une place du chantier
  devient un dé (`footing-stone`).
- **Le chantier.** On voit en fantôme seulement les places de l'étape en cours : les quatre dés, aux coins. Pierre en main, E sur
  une place : le dé est posé, et le piquet de ce coin est arraché et retombe au sol à côté, réutilisable. Autre chose en main :
  « Il faut une pierre plate. » Près du chantier, une petite ligne d'état : « Abri à bois : dés, 2 sur 4 ». Les quatre dés
  posés : « Abri à bois : poteaux, 0 sur 4 », et les poteaux apparaissent en fantôme. Le chantier (plan, position du piquet nord-ouest, coins plantés, pièces posées) est dans GameState
  (`sites` de la carte) : il se retrouve après un rechargement ; `SAVE_VERSION` 5, les parties de la version 4 sont converties
  (aucun plan connu, aucun chantier).
- **Un moteur de places commun** (`src/world/places.ts`, sans Phaser). Les tas et les chantiers partagent le même mécanisme :
  des places avec des couches et des dépendances (une place du dessus repose sur d'autres), celles qui sont ouvertes, la plus
  haute qu'on reprend, la place visée la plus proche, l'ordre d'affichage, le fantôme (`systems/ghost.ts`), et ce que la place
  accepte (`accepts`, `refusal`, `world/offer.ts`). Un tas l'utilise avec des places qui acceptent un genre ; un chantier avec
  des places qui acceptent une pièce précise, par sa clé d'objet (et plus tard des mesures : longueur, section, état), avec
  un message de refus clair. La mécanique du chantier est dans `src/systems/site.ts`, la géométrie du plan sur la carte dans
  `src/world/sitePlan.ts`.
- **Les poteaux** (décidé le 30 octobre 2026, « poteaux »). Deuxième étape de l'abri : quatre poutres équarries de 20 × 20 cm
  dressées sur les dés, deux de **3 m** au nord (108 kg), deux de **1,80 m** au sud (65 kg). Une place de chantier peut demander
  une poutre (`accepts.wood` de `plans.json` : section et longueur exacte) et vérifie les réglages de la pièce de bois en main :
  « Ce n'est pas une poutre. » (autre chose qu'une pièce de bois ronde), « Il faut l'équarrir d'abord. » (moins de quatre faces),
  « Il faut une poutre de 3 m. » ou « de 1,80 m. » (longueur différente) ; la pièce reste en main, rien ne se dépense. Le poteau
  dressé est la pièce de bois elle-même, debout (voir *Un chantier montre ses vraies pièces* plus bas), exactement où était son
  fantôme ; le chantier garde dans `pieces` (GameState) la pièce de bois d'origine de chaque poteau (longueur, diamètre d'arbre,
  faces), ce qui lui permettra plus tard de savoir d'où vient le bois ; `SAVE_VERSION` 9, les chantiers de la version 8 n'ont aucune
  pièce d'origine.
  - **Le poteau bas** (1,80 m, 65 kg) se porte à deux mains : face à sa place, E, et la poutre est dressée sur le dé. Dresser
    coûte de l'endurance, proportionnellement à la masse de la poutre (`raisePerKg`, 0,06 point par kg : 3,9 points pour 1,80 m).
  - **Le poteau haut** (3 m, 108 kg) ne se porte pas (Xéros porte 70 kg) : on équarrit la poutre sur place, couchée au pied du dé
    (un de ses bouts à moins d'une case, 32 px, de la place), puis, face à la place, **E maintenu** (même jauge que nouer) : la
    question « Appeler ta mère pour la dresser ? ». Sans poutre qui convienne au pied du dé (rondin, mauvaise longueur, trop
    loin) : « Il faut d'abord une poutre de 3 m au pied du dé. » ; E court dit la même chose, ou « Maintiens E pour appeler ta
    mère. » quand la poutre est là. Oui : fondu au noir, « Ta mère vient t'aider. », et au retour la poutre couchée a disparu, le
    poteau est debout sur le dé ; Xéros paie **la moitié** de l'effort qu'il aurait fait seul (3,2 points). La mère n'est pas
    montrée : elle vient et repart pendant que l'écran est noir.
  - **La règle de l'aide est générale** : toute place dont la poutre pèse plus que ce que Xéros porte (`strength.json`, × la force
    des outils de test) accepte l'aide de la même façon, sans code propre au poteau ; elle resservira pour les sablières. Pour une
    place qui n'a pas de dé dessous, le message « au pied du dé » sera à dire autrement.
  - Quatre poteaux posés : « Abri à bois : sablières, 0 sur 4 » et les fantômes des sablières paraissent (étape encore « à venir »).
  - `?dieu` : « Donner » ou « Poser » une pièce de bois, aspect « poutre », de la longueur voulue (au pas de 20 cm) ; « Sauter l'étape
    du chantier » remplit d'un coup l'étape en cours (les poteaux avec leur pièce d'origine). `npm run test:poteaux`.
- **Un chantier montre ses vraies pièces** (décidé le 30 octobre 2026, « abri en vraies pièces »). Ce qu'on pose est ce qu'on voit :
  une place remplie dessine la pièce enregistrée dans GameState, dans le sens que demande le plan, à la position du plan, et le
  fantôme d'une place montre la pièce attendue dans le même dessin, en transparence. Plus de dessin propre à l'abri pour ce qui est
  une pièce de bois : les anciens `shed-post-high` et `shed-post-low` (faits avant la pièce de bois, d'une autre couleur et d'un
  autre bois) sont retirés de `props.json` et de `art/` (leurs numéros restent réservés dans `art/tile-registry.json`).
  - **La pièce de bois debout** (`axis: 'up'`, `up` de chaque aspect du normal dans `wood.json`) : le même assemblage que la
    couchée (pied, milieu répété, tête), la même teinte et les mêmes faces d'un état donné (rond : l'écorce ; équarri : les faces
    claires dressées), la tête montrant le bois de bout avec ses cernes, vu de dessus. Largeur = l'épaisseur de la même pièce couchée est-ouest
    (**règle D étendue**, 31 octobre 2026 : 8 px pour la poutre comme pour le rondin ; la section réelle, 4 px, ne se reconnaissait pas),
    hauteur = longueur + la tête de 4 px (une poutre de 3 m : 8 × 64 px ; de 1,80 m : 8 × 40), et sous son pied les 3 rangées vides du dé
    (de 40 × 40 × 15 cm, 8 × 7 px : le poteau tient dessus sans déborder). Debout, elle ne se prend, ne roule, ne pivote, ne se coupe ni ne s'équarrit : elle porte.
    Seul le normal se dresse (le gros bois n'a pas de `up`).
  - **Le plan dit la pièce** : une place qui demande une poutre (`accepts.wood`) a pour `piece` `wood-piece` et pour `orientation`
    `upright` ; l'emprise au sol est sa section. `validate.ts` le vérifie.
  - **Ce qui reste dessiné à part, en fantôme jusqu'à son chantier** : les dés restent la pierre plate posée (dessinée comme la
    pierre plate). Les étapes « à venir » portent une `note` dans `plans.json` : les **sablières** seront des poutres couchées en
    hauteur, posées sur la tête des poteaux ; les **chevrons** des perches ; le **toit** des planches ou des bardeaux. En attendant,
    elles gardent leurs dessins (`shed-plate-*`, `shed-rafter`, `shed-roof`) en fantôme.
  - **Sauvegarde** : `SAVE_VERSION` 10. Un poteau d'une partie plus ancienne (dessiné `shed-post-…`) devient la pièce de bois debout de
    sa pièce d'origine ; s'il n'en a pas gardé, la conversion la complète avec la poutre que le plan demande à sa place.
- **Ce qui viendra** : la mère qui marche jusqu'au chantier, se voit, aide et repart (pour l'instant elle n'apparaît pas : fondu
  seulement) ; un geste de Xéros pour dresser (il n'a pas d'animation propre) ; les sablières, les chevrons, le toit de planches ;
  d'autres orientations ; le pierrier, s'il n'y a pas d'étang ; tourner un plan ; défaire un chantier.

### Le mode construction (décidé le 31 octobre 2026, chantier « mode construction »)

Grégoire veut construire la maison et voir chaque objet en place sans passer par la fabrication. Le **mode construction** est un
bac à sable : on prend n'importe quel objet qui existe dans un catalogue et on le pose où l'on veut, y compris en hauteur, sur
d'autres pièces. Ni force, ni aide de la mère, ni ordre de chantier. Plan d'origine : `docs/IMPLEMENTATION-bac-a-sable.md`.

- **Un mode à part**, pas le panneau `?dieu` : `?construire` dans l'adresse ouvre le catalogue (à gauche du jeu) et lance le jeu en
  mode construction ; **B** entre et sort (même place en AZERTY et en QWERTY, libre). Sans `?construire`, le mode n'existe pas.
- **Caméra libre** : ZQSD ou les flèches la déplacent (Maj : plus vite), zoom comme en jeu (molette, + et −). Xéros est figé.
- **À la souris** : le fantôme suit la souris ; clic gauche pose ; clic droit retire. Le clavier règle : **R** tourne (est-ouest,
  nord-sud, puis debout pour la pièce de bois qui se dresse ; les quatre vues d'un objet) ; **T** et **G** (ou Page haut, Page bas)
  montent et descendent d'un cran de 20 cm ; **Ctrl+Z**, **Ctrl+Y** (ou Ctrl+Maj+Z) annulent et refont (pendant la séance).
- **Le catalogue ne propose que ce qui existe** : chaque objet de `props.json` et `items.json`, et la pièce de bois en une vignette
  par diamètre et par état de `wood.json` (bille, demi-bille, quartier, planche, perche, rondin, rondin à 1, 2, 3 faces, poutre,
  poteau ; la longueur sur la grille de 20 cm et le sens se règlent à part), rangés par famille (éléments, bois, pierre, terre, fibres, outils,
  mobilier, chantier, nature, divers : tirée du contenu, `src/build/catalog.ts`), avec une recherche. Une matière naturelle se
  règle (forme, taille), au hasard par défaut.
- **La pose libre en hauteur** (`src/world/build.ts`, sans Phaser) : l'emprise au sol sur la grille de 20 cm ; la pièce
  **s'accroche sur le dessus de ce qu'il y a dessous** (le plus haut dessus que recoupe son emprise : une sablière sur la tête
  d'un poteau, une pierre sur une autre) ; le point visé est vu à la hauteur où la pièce se poserait, si bien que viser la tête d'un
  poteau pose dessus. La hauteur suit ce qui porte (une dalle de 12 cm : un poteau dessus est à 12 cm), plus les crans.
  Une pose qui entrerait dans une autre pièce, hors de la carte ou sur Xéros est refusée (fantôme pâle, message).
- **L'image** : bas au bord sud de l'emprise relevé de la hauteur (y écran = y sol − z), centrée sur l'emprise ; profondeur =
  bord sud, puis hauteur, et toujours après ce qui la porte.
- **Retirer** une pièce qui en porte d'autres est refusé (« Elle porte quelque chose ») ; **Maj + clic droit** retire la pièce et
  tout ce qui repose dessus. Ce qu'une pièce porte se calcule de ses boîtes, rien n'est gardé à part.
- **Le monde garde ce qu'on a posé** : `builds` de chaque carte dans GameState (objet, réglages, position, hauteur, sens, forme,
  tirage), `SAVE_VERSION` 13 (une partie plus ancienne n'a aucune pièce posée). En jeu, une pièce qui a une collision et posée sous
  2 m bloque Xéros (son emprise en vraie grandeur) ; au-dessus, non. Ce dont la base est au-dessus de sa tête (1,60 m) et qui le
  couvre **s'efface** quand il passe dessous, avec ce qui repose dessus (`systems/roofs.ts` généralisé) ; pas en mode construction.
- **Les plans du bac à sable** : « Choisir une zone » (glisser à la souris), puis « Enregistrer comme plan » avec un nom : en
  développement, le serveur Vite écrit `src/content/plans/<nom>.json` (pièces, réglages, positions depuis le coin nord-ouest et la
  base de la plus basse) ; le plan arrive au catalogue sans recharger (onglet « Plans ») et se pose d'un coup, accroché comme une
  pièce. `npm run check` vérifie que tout ce qu'il nomme existe. Sans serveur (jeu construit), le plan ne vaut que pour la séance.
  Ce ne sont pas les plans de chantier guidé de `plans.json`.
- **Les éléments composés** : un élément calculé (`variants` de props.json) a plusieurs tirages produits par `npm run art`, et le
  mode en tire un au hasard à chaque pose. Premiers éléments : les [morceaux de solin](objets/sill-wall.md) brut et taillé (1,60 m,
  40 cm visibles, 50 cm d'épaisseur), montés par l'algorithme de l'essai des murs (`art/lib/walls.ts`), 8 tirages × 4 vues.
- **Le solin se raccorde** (retour de Grégoire, même jour : posés côte à côte, les morceaux restaient séparés) : des morceaux de
  même manière (`wall` de props.json), à la même hauteur, alignés et jointifs, forment un **tronçon** dessiné d'un seul tenant par
  l'algorithme des murs : pierres et assises traversent les jonctions, contour aux deux vrais bouts seulement. Le tirage d'un
  tronçon se tire de sa position (le même mur à chaque chargement). Deux tronçons à angle droit forment un **angle**, toujours tenu
  par le tronçon est-ouest **quel que soit l'ordre de pose** (repris le même jour, chantier « assemblages ») : si c'est le morceau
  nord-sud qui couvre le carré d'angle au sol, l'est-ouest dessine quand même le carré (`extra` de `run`) et le nord-sud s'arrête
  contre lui ; le nord-sud a son image calée au ras du bord extérieur ; un tronçon qui
  s'arrête (à une porte) montre une **tête** finie (pierres d'about, chaînage du taillé). Poser ou retirer un morceau recalcule les
  tronçons. Chaque morceau reste une pièce à part (poser, retirer, collision, sauvegarde) et montre sa part du dessin du tronçon.
  Les bords d'une pièce s'**aimantent** à ceux de ses voisines à moins de 10 cm (le solin, 50 cm d'épaisseur, sort de la grille de
  20 : il se joint ainsi exactement en angle). Détection : `world/wallRuns.ts` ; dessin : `world/walls.ts`.
- **Le dessus du taillé vu en long** (nord-sud, même reprise) montre des moellons de longueurs mêlées en deux files, joints décalés,
  boutisses qui traversent le mur, et non plus deux longs traits parallèles.
- **Choix : le dessin d'un tronçon se calcule dans le jeu, à la pose**, et non d'avance par longueur et par forme (trop de
  combinaisons : longueurs, bouts, angles, graines). L'algorithme des murs est devenu du code pur de `src/` (`src/world/walls.ts`,
  outils de grille `src/world/gridCanvas.ts`, que `art/` ré-exporte) ; les dessins des pierres lui arrivent en données, écrites par
  `npm run art` (`src/generated/wallStones.ts`) : le jeu ne lit toujours pas `art/`. Un tronçon de 8 morceaux se calcule en
  moins de 30 ms. Les morceaux seuls de props.json (8 tirages × 4 vues) restent pour le catalogue et le fantôme.
- **Choix faits sans Grégoire** (à revoir) : la touche B ; T et G pour les crans ; Maj + clic droit pour retirer une pile ;
  l'historique d'annulation ne survit pas au rechargement ; une pièce posée n'a pas de taille naturelle visible (sa taille ne
  change que sa masse, comme en jeu) ; un objet possédable sans `dims` prend une boîte de 20 × 20 × 10 cm ; un plan ne garde pas le
  tirage d'un solin ; la dalle, sans collision dans `props.json`, ne bloque pas ; 8 tirages par solin, produits au build plutôt
  que calculés dans le navigateur (le jeu ne lit pas `art/`).
- **Ce qui viendra** : la harpe visible sur le dessus des angles taillés et une grosse pierre d'angle franche pour le brut (le
  dessus du carré est aujourd'hui celui du mur nord-sud) ; les autres éléments composés (pans, couples, pans de toit,
  faîtage, cheminée, cloison) et leur rang d'affichage pour ce qui est en pente ; les portes dans les collisions ; poser un plan
  depuis Tiled ; le chantier guidé tiré d'un plan du bac à sable.

### Les assemblages (décidé le 31 octobre 2026, chantier « assemblages »)

En mode construction, deux poteaux posés bout à bout restaient deux pièces séparées, avec un trait à la jonction, et rien ne disait
comment elles tenaient. Au Moyen Âge, le charpentier assemble **le bois avec du bois**, sans vis : des pièces taillées pour
s'emboîter, traversées de chevilles enfoncées au maillet.

- **Un assemblage est une jonction**, pas un objet : son type et ses deux pièces, gardés par GameState (`joints` de chaque carte,
  `SAVE_VERSION` 14 : une partie plus ancienne n'en a aucun). Famille « assemblages » du catalogue : on le prend, puis on clique sur
  la **jonction** de deux pièces ; un cercle clair (elles vont ensemble) ou rouge à la jonction visée, et la raison écrite dans le
  catalogue ; au clic refusé, le message dit pourquoi.
- **L'enture en trait de Jupiter** ([fiche](objets/scarf-joint.md)) : prolonge une pièce par une autre, bout à bout ; deux pièces
  de bois de même section et de même état, alignées sur le même axe (est-ouest, nord-sud, ou debout l'une sur l'autre), qui se
  touchent par un bout. Les pièces entées se dessinent comme **une seule pièce de leur longueur totale**, sans contour à la jonction,
  avec la marque de l'enture (le biseau en Z, 2 ou 3 chevilles) sur la face visible.
- **Le tenon et mortaise** ([fiche](objets/mortise-joint.md)) : un poteau debout dont la tête touche le dessous d'une pièce couchée,
  ou dont le pied repose sur une sablière basse ; la cheville se voit sur la face de la pièce couchée, au droit du poteau.
- **Le mi-bois** ([fiche](objets/halving-joint.md), ajouté le même jour, à la demande de Grégoire, pour les angles) : deux pièces
  couchées de même section qui se croisent à angle droit, à la même hauteur, au bout de l'une ou des deux (un angle) ou au milieu (une
  croix), chacune entaillée de la moitié de son épaisseur. On pose la seconde sur la première, puis le mi-bois au croisement : elle
  descend dans l'autre. Le croisement se dessine d'un seul tenant (la pièce du dessus entaillée posée dans l'autre, la cheville au
  centre) ; le poteau d'angle se dresse au-dessus. Retirer le mi-bois fait remonter la pièce du dessus, refusé tant qu'une pièce
  repose sur le croisement.
- **Une pièce couchée posée sur le solin** s'accroche sur son dessus (40 cm) et **affleure sa face extérieure** : le côté opposé au
  reste du mur (le centre des morceaux qui se touchent, de proche en proche) ; un mur seul et droit n'a pas de dehors, la pièce garde sa place
  (`alignOnWall`, world/wallRuns.ts).
- **Même principe que le solin continu** : chaque pièce reste une pièce (pose, retrait, collision, sauvegarde), le dessin est commun
  (`world/joints.ts` sans Phaser, `world/jointView.ts`).
- **Retirer** une pièce assemblée est refusé (« Retire d'abord l'assemblage… ») ; un clic droit sur la jonction retire
  l'assemblage seul ; **Maj + clic droit** retire la pièce, tout ce qui lui est assemblé (de proche en proche) et ce qui repose dessus.
  Annuler et refaire les suivent ; un plan du bac à sable garde les assemblages de sa zone.
- **Pas de fabrication** en mode construction. En jeu, plus tard : les **chevilles** (`peg`, déjà au jeu), une **tarière** pour les
  trous, le **maillet** (`mallet`, déjà au jeu), le ciseau à bois et la scie pour tailler, et un geste par étape (fiches).
- **L'encoche** ([fiche](objets/notch-joint.md), chantier « cabane ») : deux rondins ronds croisés à angle droit, le second posé sur le
  premier ; il s'enfonce de la moitié de son diamètre. Comme le mi-bois, une image du croisement par-dessus les deux rondins.
- **L'enture retouchée** (même jour) : la pièce entière d'un seul tenant, seulement un trait fin et discret (un cran plus sombre que le
  bois) et les têtes rondes des chevilles.
- **À venir** : l'**embrèvement** (une pièce en diagonale, la jambe de force ou le chevron, dont le bout s'emboîte en biais dans une autre),
  la queue d'aronde, l'enfourchement (le chevron sur le faîtage), et le chevillage visible des pans de bois.
- **Choix faits sans Grégoire** : les marques et les chevilles sont posées par-dessus le dessin de la pièce entière (pas un dessin
  par longueur) ; une enture ne se pose qu'entre deux pièces dont les emprises sont exactement bout à bout (l'aimant des bords y
  aide) ; deux pièces de même section mais d'états différents (une ronde, une poutre) ne s'entent pas ; la marque debout n'existe
  que pour le normal (seul il se dresse).

### La cabane en rondins (décidé le 31 octobre 2026, chantier « cabane »)

**Règle de vérification de Grégoire : un bâtiment est validé quand on réussit à le bâtir dans le mode construction, par un scénario,
uniquement avec les pièces du catalogue, puis à l'enregistrer comme plan.** Une pièce qui manque se crée en respectant sa chaîne
(d'où elle vient, de quoi elle est faite, sa fiche, le pixel-artist pour le dessin) ; une pièce trop particulière se demande à
Grégoire.

- **La cabane de bûcheron** (`npm run test:cabane`, plan `src/content/plans/cabane.json`, aperçu `.art-preview/cabane.png`) : 3,40 ×
  4 m au sol entre les faces des murs ; quatre dalles aux angles ; cinq assises de rondins du normal (30 cm de bois ; écorcés et le
  bois patiné depuis « L'âge du bois »), est-ouest puis
  nord-sud, croisés aux angles par une **encoche** ([fiche](objets/notch-joint.md)), 20 cm de dépassement, puis une sixième
  assise est-ouest (le linteau) ; une porte d'un mètre au sud (les rondins des cinq premières assises recoupés de part et d'autre :
  des pièces de bois de 1,40 m) et la **porte en planches** ([fiche](objets/plank-door.md)) ; une fenêtre de 60 cm à l'est (le
  rondin de la troisième assise recoupé) ; les pignons en rondins (un rondin de 1,80 m sur chaque mur de bout) ; la faîtière (un
  rondin nord-sud encoché dans les pignons, à 1,80 m du bord ouest : le milieu exact, 1,70 m, n'est pas sur la grille) ; les deux
  **pans de toit en planches** ([fiche](objets/plank-roof.md)) posés sur le rondin de rive. 38 pièces, 42 assemblages (avant la
  finition ci-dessous).
- **Ce qui a manqué et a été créé** : l'encoche (assemblage, règle, dessin du croisement) ; la porte en planches et le pan de toit en
  planches (objets, fiches, dessins). **Ce qui existait** : le rondin recoupé (une pièce de bois de toute longueur sur la grille),
  les rondins de pignon et la faîtière (des rondins).
- **Le moteur, pour la cabane** : un pan de toit (`pitch` de props.json, le côté de sa rive basse) se pose sur ce qui porte sa rive
  basse et ne se heurte pas à ce qui est sous sa pente ; une pièce de toit ne porte rien (la visée l'ignore). La visée prend le
  plus haut dessus sous l'emprise : la porte se pose donc avant le linteau qui passe au-dessus d'elle (l'ordre réel du montage).
- **Finition, avec les réponses de Grégoire** (même jour, chantier « bâtiments ») : les **pignons fermés en planches fendues**
  ([fiche](objets/plank-gable.md) ; pas de rondins en biais pour l'instant) : un pentagone de planches debout de 2,60 × 0,60 m sur le
  dernier rondin de chaque mur de bout, entre les murs nord-sud (hors des bandes de rive des pans) ; la faîtière posée sur leurs
  sommets, son dessus au faîte des pans ; un **volet en planches** à la fenêtre ([fiche](objets/plank-shutter.md)), qui **s'ouvre et
  se ferme en jeu avec E** ; un **seuil en dalles** sous la porte (deux dalles, la porte posée dessus : son haut touche le linteau) ;
  le toit reste en planches, les bardeaux attendront la latte. 41 pièces, 40 assemblages.
- **Ce qui s'ouvre et se ferme** (`swing` de props.json) : un objet a deux états, deux clés qui se nomment (`into`), dont une est
  l'ouverte (`open`) ; `hinge` dit où il tourne : `side`, le bord gauche de sa face du dehors vu du dehors (ouvert, un quart de tour vers
  le dehors : la vue suivante), `bottom`, le bas de sa face du dehors (rabattu : le volet d'étal). En jeu, E sur une pièce posée en mode
  construction qui bat (`GameMap.interactables`, action `swing`) : `swung` (world/build.ts) calcule son autre état, GameState le note
  dans `builds` (même identifiant), la carte la redessine ; refusé si, ouvert, il bloquerait Xéros. `validate.ts` vérifie les deux
  états (l'un nomme l'autre, un seul ouvert, même gond et mêmes vues ; un battant de côté garde ses dimensions).
- **À trancher par Grégoire** : la porte qui s'ouvre (le même `swing`, mais elle a une collision : il faudra la retirer du passage
  ouverte) ; un toit de bardeaux (le bardeau existe, mais pas de lattes pour le porter).

### Les bâtiments du village (décidé le 31 octobre 2026, chantier « bâtiments »)

Même règle que la cabane : chaque bâtiment est bâti par un scénario dans le mode construction, avec les seules pièces du catalogue, et
enregistré comme plan. Une pièce qui manque est créée avec sa chaîne (fiche, vues, masse, origine, métier, dessin du pixel-artist).

- **La grange** (`npm run test:grange`, plan `src/content/plans/grange.json`, aperçu `.art-preview/grange.png` ; le bois vieux, gris,
  depuis « L'âge du bois ») : 8,80 × 6 m,
  faîtage est-ouest. Dix dalles, dix poteaux (poutres du normal de 3 m dressées : quatre au nord, quatre au sud, un au milieu de chaque
  mur de bout ; travées de 2,40 m, celle du milieu du mur sud pour la porte) ; les sablières des quatre murs sur la tête des poteaux
  (tenon et mortaise), **entées en trait de Jupiter** (un arbre normal ne donne que 5,80 m : 3 m + 5,80 m sur les longs murs, 3 + 3 m
  sur les murs de bout) et croisées **à mi-bois** aux angles ; deux entraits (3 + 3 m entés) à mi-bois sur les sablières ; deux
  poinçons (poutres de 2,20 m) sur les entraits, le faîtage (enté) sur les poinçons et les pignons. Le **bardage** : dix-huit
  [pans de bardage](objets/board-wall.md) de 1,20 m (planches debout et couvre-joints, sur des lisses chevillées à la face du dehors
  des poteaux), deux par travée ; la [porte charretière](objets/cart-door.md) à deux battants (2,40 m : une charrette passe) ; deux
  [pignons en bardage](objets/board-gable.md) ; le toit, deux [grands pans de toit en planches](objets/plank-roof.md) de 9,60 × 3,40 m,
  2,60 m de pente (37°), le faîte à 6 m pour le foin, sans étage. 59 pièces, 29 assemblages.
- **Ce qui a manqué et a été créé pour la grange** : le pan de bardage, la porte charretière, le pignon en bardage, le grand pan de toit (dessinés
  par le pixel-artist dans `art/world/barn.ts` ; le pan de toit, en grand, par les fonctions du pan de la cabane sorties dans
  `art/lib/plank-roof.ts`, la cabane inchangée au pixel près). **Ce qui existait** : les poutres (dressées, couchées), les dalles,
  l'enture, le tenon et mortaise, le mi-bois.
- **Choix faits sans Grégoire** : le bardage en brun vieilli (en bois frais, il se confondait avec les poteaux équarris : **retiré** par
  « L'âge du bois », ci-dessous, une seule teinte par âge pour toutes les pièces) ; les pans de
  bardage ont 20 cm d'épaisseur (lisses comprises), contre la face du dehors des poteaux : l'aimant des bords décalait un pan mince de
  10 cm d'un pan à l'autre ; l'entrait posé à mi-bois sur la sablière (un entrait sur la sablière haussait le pan nord, qui se pose sur
  le plus haut dessus de sa rive) ; une sablière de bout au ras du dedans des poteaux à l'est (au ras du dehors, elle s'aimantait au
  bord des dalles, qui débordent de 5 cm, et passait sous le bardage).
- **L'étal de la place** (`npm run test:etal`, plan `src/content/plans/etal.json`, aperçu `.art-preview/etal.png` ; le bois patiné) : 2,40 × 1,60 m,
  la face des clients au sud ; quatre dalles, quatre poteaux (poutres de 2,40 m derrière, 1,80 m devant), une sablière sur chaque rang
  (tenon et mortaise) ; un [fond, deux côtés et un devant bas](objets/stall-panels.md) en bardage (le même que la grange, sorti dans
  `art/lib/board-wall.ts`) ; le [volet d'étal](objets/stall-shutter.md) posé fermé sur le rebord du devant (1 m), qui **se rabat en
  comptoir avec E** en jeu (`swing`, gond `bottom`) ; un [auvent en planches](objets/plank-roof.md) de 2,80 × 2,20 m en pente vers les
  clients, sur la sablière de devant, 40 cm au-delà des poteaux. 16 pièces, 4 assemblages. Le comptoir en planches de la demande est
  le volet rabattu : le même objet, ouvert le jour, fermé la nuit.
- **Les huit boutiques** : un étal par métier, le même plan, ce qui change de l'un à l'autre (à décider avec Grégoire, rien n'est
  fait) : l'**enseigne** (une planchette peinte pendue à la sablière de devant : le pain, le couteau, le poisson…) ; ce qui est **sur
  le comptoir** (des objets du jeu, posés : miches et paniers pour le boulanger ; poissons sur un lit de paille, un seau d'eau pour le
  poissonnier ; légumes en paniers et en cagettes, à terre devant aussi, pour le maraîcher) ; ce qui est **sous l'auvent** (une barre
  à crochets pour le boucher, ses pièces de viande pendues ; une perche pour les étoffes du drapier) ; ce qui est **dedans** (le billot
  de découpe du boucher, des étagères pour le potier ou l'épicier) ; le **comptoir** lui-même (en pente vers les clients et lavé à
  grande eau pour le poissonnier, double pour le maraîcher) ; la **largeur** (deux travées pour un étal plus riche). Il faudra d'abord
  les marchandises (chacune un objet, sa fiche, sa chaîne) : c'est le gros du travail, l'étal est commun.
- **La petite maison de pierre : un essai, pas encore bâtie** (`npx tsx tools/essai-maison.ts`, `.art-preview/essai-maison.png`, hors
  jeu ; `art/proposals/walls-high.ts`, une copie de l'algorithme des murs augmentée, jamais chargée par le jeu). Le mur plein de
  2,40 m ne peut pas suivre la règle du solin : couché (règle D), son tronçon nord-sud ferait 53 px de large. Vu d'en haut, un mur haut
  nord-sud est une bande mince (son dessus, 10 px) et sa tête au bout. Avant d'en faire un élément du jeu, l'essai montre, en taillé
  (moellons hourdés) et en brut : le mur plein de 3,20 m, la porte (2 m et 1,80 m) et son linteau (le rondin à deux faces de 1,40 m,
  dessiné par le jeu), la fenêtre de 60 × 80 cm (allège, linteau d'un mètre, maçonnerie reprise au-dessus), l'angle (dessus raccourci
  ou en vraie grandeur), la maison entière sans toit à côté de Xéros, la souche de cheminée. Proposition : le taillé ; le dessus en
  vraie grandeur (10 rangées, la règle des pièces de bâtiment, raccord exact à l'angle) ; une dalle de couronnement sur la souche.
  **À trancher par Grégoire** avant l'intégration (questions dans le rapport du chantier). Ce qui manque au moteur : la hauteur de face
  et du dessus dans `RunSpec`, les têtes au mur haut, les ouvertures (et la reprise au-dessus d'un linteau), la bande nord-sud en
  projection (x, y − z) dans `wallRuns.ts`, des longueurs de morceau plus courtes que 1,60 m pour placer les baies, et la vitesse (1 s
  pour 3,20 m de brut, contre 30 ms pour un tronçon de solin).
- **Le moteur, appris en route** : la visée prend le plus haut dessus qui se tient sous l'emprise ; viser une pièce près d'une pièce
  plus haute (un poteau au nord d'un poteau dressé, un pan sous une sablière) peut la poser dessus : le scénario pose du nord au sud,
  vise 4 cm au nord du milieu, et pose le bardage avant les poinçons et les pignons.

### L'âge du bois (décidé le 31 octobre 2026, chantier « âge du bois »)

Grégoire : « Pourquoi les poutres sont hyper claires mais le bois autour est beaucoup plus foncé ? » Chaque pièce avait sa teinte :
les poutres en bois fraîchement taillé jaune clair, le bardage en « brun vieilli » pour qu'on le distingue, la porte jaune vif, les
pans de toit gris. Un même bâtiment mélangeait du bois neuf et du bois de vingt ans.

- **Une seule matière bois, un réglage d'âge** partagé par toutes les pièces de bois travaillé : **neuf** (blond chaud), **patiné**
  (brun doux), **vieux** (gris-brun argenté : réchauffé le même jour, Grégoire trouvait le premier gris « un peu abusé », il
  faisait pierre ou béton). Une rampe par âge dans la palette (`woodAges`, `art/palette.ts`), sur les mêmes signes : le
  bois travaillé se dessine avec eux, et une image à un autre âge est **la même grille** peinte de la rampe de cet âge
  (`art/world/wood.ts`, `WOOD_AGES` ; `art/lib/ages.ts` tire au build `<image>-worn` et `<image>-old` de chaque image neuve).
- **Ce qui distingue les pièces entre elles, c'est la forme et la texture** (fil du bois, joints, couvre-joints, ombres, contours),
  **jamais la teinte**. La teinte propre au bardage est retirée.
- **Ce qui prend l'âge** : la pièce de bois (poutre, rondin, rondin écorcé, planche, poteau… : `age` de ses réglages, gardé par
  GameState comme les autres), et les objets de bois marqués `aged` dans props.json et items.json (porte, volet, pignons, bardage,
  pans de toit, auvent, étal, l'abri à bois, le bardeau, la cheville), et les marques d'assemblage. Seul le bois mis à nu vieillit :
  **l'écorce** des rondins non écorcés garde son brun (M m N K), harmonisé avec les rampes. Un objet de bois qui ne prend pas l'âge
  est du bois brut (`RAW_WOOD` de validate.ts, avec sa raison : la baguette de clayonnage verte).
- **Le rondin écorcé** : un état du rondin (`peeled` des réglages, l'aspect `peeled` du normal dans wood.json, section sans écorce),
  pas une nouvelle clé : rond, il roule, se dresse, s'encoche comme le rond ; ses vues se calculent de sa section. Il fait la cabane.
- **Mode construction** : l'âge se règle en haut du catalogue (trois boutons NEUF, PATINÉ, VIEUX, chacun de la teinte de son bois ;
  les vignettes du bois le montrent, pièce de bois comprise : ses icônes ont aussi leurs trois âges) ; toute
  pièce posée qui le prend le reçoit. **Un plan fixe l'âge de toutes ses pièces** (`age` du plan : « Enregistrer comme plan » l'écrit
  quand tout son bois a le même âge, et ses pièces ne le répètent pas). **On choisit l'âge d'un plan au catalogue** (retour de
  Grégoire, même jour) : prendre un plan met les boutons sur son âge enregistré, puis l'âge choisi s'applique à tout son bois à la pose
  (la grange se pose neuve, patinée ou vieille). Deux pièces d'âges différents ne
  s'entent pas (entées, elles ne font plus qu'une).
- **Les bâtiments** : la cabane patinée, en rondins écorcés (`plans/cabane.json`) ; la grange vieille, grise (`plans/grange.json`) ;
  l'étal patiné (`plans/etal.json`). Aperçus : `.art-preview/bois-ages.png`, chaque pièce de bois dans les trois âges, côte à côte (très haute : pour chercher une pièce) ;
  `.art-preview/bois-ages-court.png` (`npm run test:cabane`, moins de 1 500 px de haut, x6), en trois colonnes NEUF, PATINÉ, VIEUX : poutre,
  planche, rondin écorcé et rondin avec écorce à côté de Xéros ; bardage, porte, pan de toit ; la cabane entière.
- **Vérification** : validate.ts refuse un objet de bois (matière bois) qui n'est pas `aged` (hors RAW_WOOD), et toute image d'un
  objet `aged`, toute planche de la pièce de bois, qui n'a pas ses trois âges.
- **À venir : le vieillissement avec le temps**, quand l'horloge existera : une pièce posée au monde passera de neuve à patinée puis
  à vieille (pluie et soleil), sans changer de dessin, en changeant son `age`. En attendant, le bois du jeu (abattu, coupé, fendu,
  équarri) naît neuf, et seuls le mode construction et ses plans règlent l'âge.
- **Choix faits sans Grégoire** (à revoir) : l'âge ne change que l'image posée, pas celle qu'on tient (les vues portées et les
  icônes restent neuves) ; le bois des arbres (souches, troncs couchés, entailles) prend la rampe du neuf ; le meuble et l'outil (table,
  coffre, manches) gardent leurs teintes : ils ne sont pas des pièces de bâtiment ; l'abri à bois du chantier guidé prend l'âge au
  catalogue, mais son chantier en jeu le pose neuf ; écorcer un rondin en jeu (la plane) viendra avec son geste.

### Les intérieurs (décidé le 1er novembre 2026, chantier « intérieurs »)

Le but, décidé par Grégoire : un joueur qui bâtit une maison comme il veut peut y entrer, et l'intérieur est cohérent avec ce qu'il a
construit. **Pas de dessin à la main pour chaque maison : l'intérieur se calcule des pièces posées**, parce que chacune est connue.
La chaumière (`maison.tmj`) reste telle quelle jusqu'à la nouvelle chaumière.

- **Les portes s'ouvrent** (`swing` de props.json, `passage` : une porte) : la porte en planches pivote d'un quart vers le dehors sur
  son gond, comme le volet (`plank-door`, `plank-door-open`) ; la porte charretière ouvre ses deux battants (gond `double`,
  `cart-door-open`, dessinée par le pixel-artist à partir de la porte fermée ; ouverte, elle ne bloque pas). E devant la porte.
- **Le bâtiment se reconnaît à sa porte** (`world/interior.ts`, sans Phaser) : tout ce qui barre le passage à hauteur d'homme est
  projeté au sol (grille de 5 cm), avec les linteaux et chaque porte à sa place fermée ; on remplit depuis le dedans de la porte. Si
  le remplissage reste clos, c'est une pièce : son rectangle est l'emprise **entre les faces intérieures des murs** (la cabane
  2,60 × 3,20 m, la grange 8,80 × 6 m). Une **ouverture sans porte** est un passage d'au moins 60 cm sous un linteau (base entre
  1,80 m et 2,40 m) ; sans linteau, la pièce n'est pas close : on n'y entre pas (un appentis ouvert reste dehors).
- **Entrer, sortir** (`systems/interiors.ts`) : Xéros qui marche dans le passage d'une porte ouverte, tourné vers le dedans, passe à
  la vue intérieure par le même fondu qu'une sortie de Tiled ; dedans, le même passage, tourné vers le dehors, le ramène devant la
  porte. Porte fermée : elle barre le passage, E l'ouvre d'abord.
- **La vue intérieure** (`world/interiorMap.ts`, `world/interiorView.ts`) est une carte calculée à l'entrée (`interieur:<carte>:<x>,<y>`,
  le coin nord-ouest de la pièce), la même pour le même bâtiment, à la même échelle et au même zoom que dehors : le sol de terre
  battue dans la pièce, le vide autour ; **les pièces posées du bâtiment elles-mêmes**, à leur place et à leur âge : le mur du fond
  montre sa face du dedans (les rondins de la cabane ; le bardage vu du dedans, ses lisses et les poteaux de la grange, `-r2`), les
  murs est et ouest se voient par leur tranche, les poteaux, cloisons, dalles, foyer posés dans l'emprise sont à leur place ; ni les
  toits, ni ce qui passe au-dessus de la tête (faîtière, entraits, poinçons). **Le mur sud est en coupe** : le dessus tranché au ras du
  sol, de la teinte moyenne de ses pièces (son âge suit), avec ses passages ; il barre le passage. Changer le bâtiment en mode
  construction change son intérieur.
- **La lumière** : la pénombre de la chaumière (0,22) quand un volet est ouvert, plus sombre (0,36) quand tous sont fermés ; une tache
  de lumière (l'image du rai de soleil) dans chaque porte ouverte et sous chaque volet ouvert, tournée vers le dedans. **E de dedans
  ouvre et ferme le volet** (la pièce est à la carte du dehors : GameState la change là-bas, la vue suit).
- **Les meubles** : le mode construction marche dans la vue intérieure (pas dans les murs : « Hors de la pièce. » ; les pièces du
  bâtiment ne s'y retirent pas). Ce qu'on y pose appartient au bâtiment : `builds` de la carte `interieur:…` dans GameState, pas au plan.
  Remettre la carte du dehors à zéro efface aussi ses intérieurs.
- **Vérification** : `npm run test:interieur` (la cabane, puis la grange, posées par leur plan : porte fermée on ne passe pas, E
  l'ouvre, on entre, la pièce a la taille du plan, le volet éclaire, un tabouret posé dedans, on ressort devant la porte, on rentre,
  le tabouret est là) ; aperçu `.art-preview/interieurs.png`, chaque bâtiment dehors puis dedans, à côté de Xéros. `tools/test-build.ts`
  vérifie le modèle sans navigateur (porte, ouverture sous le linteau, pièce non close sans linteau).
- **Choix faits sans Grégoire** (à revoir) : la vue garde le nord en haut (une porte sur un autre mur reste où elle est, la vue ne
  tourne pas) ; la pièce est le rectangle de ce qui est clos (une maison en L serait vue comme son rectangle) ; les meubles sont rangés
  sous le coin nord-ouest de la pièce : agrandir le bâtiment vers l'ouest ou le nord fait un nouvel intérieur, vide ; la coupe du mur sud
  est calculée (une teinte, pas un dessin) ; les battants ouverts de la porte charretière ne bloquent pas ; les murs de plus de 80 cm
  d'épaisseur ne sont pas tous montrés ; pas de fenêtre sans volet (une baie nue n'éclaire pas encore) ; la porte n'est pas fermée de
  dedans.

## Poids et force (décidé le 30 octobre 2026)

Repris par *Le bois* (30 octobre 2026) : la masse se calcule d'après les réglages de la pièce de bois ; à 1 m, la bille du gros pèse 214 kg et celle du normal 63,6 kg.

Chaque objet a une masse, Xéros a une force, et ce qui est trop lourd à porter se roule.

Repris par *Le travail* (§ 4 bis et § 10) : la force d'un coup (`swing` de strength.json) plafonne au plafond humain (`humanMax`) ;
porter et rouler plafonneront de même (décidé le 2 novembre 2026, en cours : chantier 4 de l'audit). La vitesse de la bille poussée
est une part de la marche (`pushSpeed`, systems/speeds.ts), fatigue comprise.

- **Masses** (`src/content/mass.ts`). Tout objet qu'on prend, pose ou roule a une masse en kg (`validate.ts` l'exige). Saisie pour les
  objets simples (hache 2,5 kg, branche 2,5 kg, lien 0,2 kg, rouleau de corde 1 kg les 10 m, au prorata de sa longueur). **Calculée
  pour le bois** : volume du tronc tiré des `dims` (le diamètre est celui des dimensions moins le contour d'un pixel de chaque côté :
  65 cm contour compris = 55 cm de bois) × une seule densité, 900 kg/m³ de bois vert. **Calculée pour la pierre** (30 octobre 2026) : le volume de la boîte de ses `dims` × 2 600 kg/m³ (`STONE_DENSITY`, à côté de la densité du bois), soit 62 kg pour la pierre plate de 40 × 40 × 15 cm (35 kg à 30 × 30). Ce qui donne **203 kg** pour une bille du gros
  arbre (95 cm × Ø 55) et **60 kg** pour une bille de l'arbre normal (95 cm × Ø 30) ; avec des billes d'un mètre pile, on trouverait
  214 et 64 kg : l'ordre de grandeur est le bon. Le fagot pèse la somme de ses dix branches et de son lien (25,2 kg).
- **Force** (`src/content/strength.json`, composant `Strength` du joueur). Il **porte jusqu'à 70 kg** (les deux mains ensemble), **marche
  normalement jusqu'à 25 kg** (au-delà : pas de course, et une marche qui ralentit progressivement jusqu'à la moitié de la vitesse
  normale à 70 kg), **fait rouler jusqu'à 300 kg**. Plus tard la force progressera : seuls ces chiffres changeront. E court sur plus
  de 70 kg : « Trop lourde à porter. Pousse-la pour la faire rouler. »
- **Roulement** (`src/systems/roll.ts`, constantes `ROLL` de `config.ts`). Une bille couchée roule seulement perpendiculairement à son
  axe (est-ouest : vers le nord ou le sud ; nord-sud : vers l'est ou l'ouest). Pousser = marcher contre elle, face à elle, les deux
  mains libres ; après 0,3 s de poussée continue elle avance au pixel, Xéros collé à elle, et s'arrête dès qu'il s'arrête (de l'herbe :
  pas d'élan). Vitesse : marche × (1 − masse / 300), bornée entre 0,15 et 0,6 fois la marche. Elle a son propre corps de collision et
  bute sur tout ce qui bloque. Au-delà de 300 kg, rien ne bouge : c'est le calcul qui le décide (un tronc entier abattu dépasse le
  seuil, c'est voulu). L'écorce tourne exactement de la distance parcourue (un tour = π × diamètre, 4 images).
- **Pourquoi les grosses billes ne vont plus en tas** : à 203 kg elles ne se portent plus, et un tas se construit en portant. Elles se
  roulent jusqu'à leur place ; le fendage (en quatre sur place, des quartiers de 50 kg qui se portent, voir *Fendre*) les
  rend empilables. Les billes de l'arbre normal (60 kg) se portent et s'empilent comme avant. Un tas de grosses billes déjà
  posé reste, mais on n'en reprend plus.
- **Pivoter une bille au sol** (`src/systems/turnLog.ts`, `turn` de props.json, `TURN_PRESS` de config.ts). Mains vides, au contact d'une bille couchée de n'importe quel côté, R maintenu une seconde (la jauge de l'appui long, la même que pour nouer) la fait pivoter d'un quart de tour (est-ouest <-> nord-sud) autour du centre de sa collision. Avant, la nouvelle emprise doit être libre (carte, objets, tas, personnages) ; Xéros, que le bout de la bille toucherait, est repoussé d'autant s'il y a la place ; sinon « Pas la place pour la tourner. » et rien ne bouge. Un petit nuage (la fumée du jeu, teintée de terre) se lève au pivot. Le coût en endurance est proportionnel à la masse (0,03 point par kg : 6 points pour une bille du gros arbre, 1,8 pour une du normal). R en main (tourner la bille portée) ne change pas.
- Une sauvegarde où Xéros tient plus qu'il ne porte (d'avant les masses) : l'objet est posé au sol devant lui au chargement.

## Endurance (décidé le 30 octobre 2026)

Repris par *Le temps* (1er novembre 2026 : sa clôture et son § 3) et *Le travail* : l'endurance a trois niveaux (souffle, plafond du
jour, maximum : 100 au départ, jusqu'à 200 en s'entraînant), une barre horizontale à trois teintes en bas à droite (`art/ui/stamina-bar.ts`)
et non plus la jauge verticale ; fatigué, Xéros marche à la moitié de la marche (`tiredWalk` 0,5) ; le travail au coup se paie au
joule (`work` de stamina.json), `costs` ne vaut plus que pour les gestes sans matière. Ce qui suit est la première décision.

La fatigue de la journée, comme l'énergie de Stardew Valley. Le souffle (l'essoufflement d'une course ou d'une charge, qui se reprend en quelques secondes) viendra plus tard comme **deuxième jauge**, à côté de celle-ci : l'endurance baisse tout le jour et ne remonte qu'en dormant.

- **La jauge** : 100 points au maximum (`src/content/stamina.json`, composant `entities/Stamina.ts`, mécanique `src/systems/effort.ts`). Elle est dans GameState (`stamina`) et se sauvegarde avec la partie ; à l'écran, une jauge verticale à droite des deux cases des mains (`art/ui/stamina.ts`), rouge sous le seuil de fatigue, qui tremble quand un effort est refusé.
- **Ce qui coûte** (tout est dans `stamina.json`, rien en dur) : un coup d'outil (hache sur l'arbre debout, le houppier, une encoche, la coupe d'un lien sur le billot, tailler un piquet à la hachette (0,4 point), planter un piquet de tracé (0,5 point), nouer et dénouer, pivoter une bille (par kg), planter le coin et frapper à la masse (voir *Fendre*), et par seconde : marcher en portant au-delà de 25 kg (par kg de trop), pousser une bille (par kg), courir (0,2 point par seconde depuis le 30 octobre 2026 ; c'était 1). **Marcher ne coûte rien**, ni à vide ni chargé en dessous de 25 kg. Un coup dans le vide ou sans le bon outil ne coûte rien.
- **Fatigué** (sous 15 %) : pas de course, marche à 85 % de la normale. **Épuisé** (0) : toute action qui coûte est refusée, une fois, par « Xéros est épuisé. Il faut dormir. » (la jauge tremble) ; il peut toujours marcher, mais ne soulève plus ce qui le ferait porter au-delà de 25 kg. Les coûts se règlent avec la force : le fardeau est compté au-delà du seuil de marche de `strength.json`, donc une force plus grande coûte moins.
- **Dormir** : E sur la paillasse du cagibi (`pallet`, dialogue `pallet-sleep`) propose « Dormir ? » (premier dialogue à choix : `choices` d'une ligne, `action: "sleep"`). Oui : fondu au noir, jauge pleine, un jour de plus, réveil dans le cagibi, partie sauvegardée, « Jour 2 » à l'écran.
- **Compteur de jours** : `day` de GameState (jour 1 au départ, +1 à chaque nuit). Pas encore d'horloge ; il servira au temps et aux saisons.
- **Sauvegarde** : `SAVE_VERSION` 5 ; une partie de la version 2 est convertie à la lecture (jauge pleine, jour 1), une partie de la version 3 aussi (le fendage ne fait qu'ajouter des champs facultatifs), une partie de la version 4 aussi (les chantiers : aucun plan connu, aucun chantier), sans repartir à neuf.
- **Outils de test** (`?dieu`) : un champ pour régler l'endurance, une case « endurance infinie » ; pour l'implantation : apprendre un plan, mettre quatre piquets ou quatre pierres plates au sol devant Xéros, effacer les chantiers de la carte.

## Le temps (décidé le 1er novembre 2026, chantier « temps »)

**La règle : la clôture du chantier** (décidé par Grégoire après l'essai du travail au coup, même jour ; complétée le 2 novembre 2026,
chantier 1 de l'audit). Elle fait foi : ce qui la contredit plus bas (les paragraphes de conception d'avant, l'ancien § 6, l'ancienne
étape 2 du découpage) est rangé sous *Historique (remplacé)*, à la fin du chapitre. Le travail lui-même : *Le travail*, plus bas.
- **Une seule vitesse : la vitesse du temps du joueur est la vitesse de simulation.** V passe au palier suivant (x1, x2, x5, x10, x20,
  puis de nouveau x1 : en boucle ; `speeds` de time.json, x1 au départ) ; seul V existe, Maj tenue ou non (la touche qui revenait au
  palier d'avant est retirée : pendant une course, V accélère aussi) ; un indicateur sous le cadran la montre toujours, x1 compris (des
  crans et le chiffre) ; elle accélère tout le jeu, marche, gestes et horloge, par pas de jeu de taille normale (systems/simSpeed.ts),
  jamais par un pas plus grand ; une attaque ramène à x1 ; x50 reste réservé à ?dieu pour les tests ; rien n'est gardé au
  rechargement (x1). La distinction d'avant (vitesse du temps / vitesse de simulation) tombe : il n'y a plus qu'une vitesse.
- **Pas de saut d'horloge pour un travail** : un travail dure ses coups et ses pauses de souffle (*Le travail*), l'horloge avance
  d'autant ; seuls ?dieu « Finir le travail » et « Transformer » l'avancent d'un coup.
- **L'interface du temps** : le cadran rond en haut à droite (l'essai, piste A) : « Jour 3 / 14:20 » et un médaillon où le soleil puis
  la lune passent sur une colline, au ciel du moment (aube, jour, crépuscule, nuit) ; les mains et la barre d'endurance passent en bas à
  droite.
- **La lumière suit l'heure** (l'étape 6) : un voile teinté posé sur le monde (`daylight` de world.json : des repères dans la journée,
  interpolés), à la profondeur des pénombres du sous-bois et des intérieurs, qui s'y ajoutent ; les lueurs des feux restent
  par-dessus ; les rais de soleil des fenêtres et des portes suivent la force du soleil (éteints la nuit).
- **Les vitesses de Xéros** : marche 2 m/s, course 2,5 m/s (9 km/h), fatigué 1 m/s (`tiredWalk` 0,5) ; une seule source
  (`PLAYER.walk`, `PLAYER.run`), dont dérivent la marche chargée, la marche fatiguée et la bille poussée.
- **Ce qui reste de la conception d'avant** : une horloge unique de 24 h (à x1, une journée dure 24 h réelles) ; l'endurance en trois
  niveaux (souffle, plafond du jour, maximum) et le sommeil, chiffrés au § 3 ; essoufflé, l'effort attend sans message (la barre
  clignote, Xéros souffle) ; pas d'effondrement forcé la nuit : la veille se paie au réveil.

### 1. Ce qui dépend du temps aujourd'hui

L'inventaire du début du chantier, gardé pour mémoire : depuis, la jauge de 100 est devenue l'endurance en trois niveaux (§ 3), les
vitesses sont en m/s (la clôture), `SAVE_VERSION` a monté, et les pauses fixes des scénarios se remplacent par des attentes d'état.

| Système | Fichier | Ce qui dépend du temps |
| --- | --- | --- |
| Endurance | `entities/Stamina.ts`, `systems/effort.ts`, `content/stamina.json` | une jauge de 100 ; prix ponctuels (coups, nœuds, pivot, dresser) ; prix par seconde jouée : courir 0,2/s, porter au-delà de 25 kg 0,034/kg/s, pousser une bille 0,014/kg/s (`drain(perSec, delta)`) |
| Sommeil, jours | `state/GameState.ts` (`sleep` : jauge pleine, `day` + 1), dialogue `pallet-sleep`, `WorldScene` (fondu, « Jour n ») | un compteur de jours, sans heure ; dormir ne prend pas de temps |
| Course | `entities/Player.ts`, `effort.ts` | vitesses en px/s (marche 100, course 165, porter 55) ; la course se paie par seconde |
| Physique | Phaser Arcade (`main.ts`) | pas fixe de 1/60 s, plusieurs par image quand le jeu rame |
| Gestes | `entities/ToolUse.ts`, `gestures.json`, `COMBAT_POSES` | cadence des animations (images/s) ou durées par image (combat) ; une image sautée est quand même jouée (ToolUse) |
| Combat | `systems/combat.ts`, `combat.json` | durées des poses × inertie, fenêtre d'enchaînement (`combo`, ms), arrêt sur image, réactions |
| Rail de la doloire | `systems/rail.ts` | avance de `speed × delta` (px/ms) ; un coup par geste, au rythme du geste |
| Bille qui roule | `systems/roll.ts`, `ROLL` | 300 ms de poussée avant de rouler ; vitesse en px/s, avance pixel par pixel |
| Appuis longs | `systems/longPress.ts`, `turnLog.ts` | E maintenu 500 ms, R maintenu 1 000 ms |
| Effets | `harvest.ts` (tremblement, chute, éclats), `roofs.ts` (fondu 250 ms), lueurs et fumées (`GameMap`), HUD (messages 1,8 s / 7 s) | durées d'affichage |
| Transformations | `transforms.json`, `systems/transform.ts` | aucune durée (« Transformer » est instantané ; les gestes réels ont la durée de leurs coups) |
| Âge du bois | `art/palette.ts` `woodAges`, `world/build.ts` | un réglage (neuf, patiné, vieux), pas une horloge |
| Animaux | — | aucun |
| Sauvegarde | `state/save.ts` (`SAVE_VERSION` 17), `systems/autosave.ts` | `savedAt` (date réelle) ; écrite à chaque changement |
| Tests | `tools/lib/playtest.ts`, `tools/test-*.ts`, `tools/run-scenarios.ts` | 222 pauses fixes (`sleep`, `waitForTimeout`) dans les scénarios ; un garde-fou de 15 min par scénario |

### 2. Horloge ou simulation, système par système

Repris par la clôture : il n'y a plus qu'une vitesse (l'horloge et la simulation vont du même pas, x1 à x20 en jeu) et les travaux
n'ont plus de durée en minutes (*Le travail* : ils durent leurs coups) ; la ligne « Travaux » ci-dessous est remplacée.

L'**horloge** compte les heures de jeu (elle avance à la vitesse du temps, et du temps de travail pendant un geste) ; la
**simulation** compte les secondes jouées (elle avance à la vitesse de simulation, x1 en jeu).

| Système | Vit sur | Ce qui change | Ce que voit le joueur |
| --- | --- | --- | --- |
| Souffle | simulation | nouveau : il se vide à chaque effort (3 × son prix ; courir 5/s) et revient de 12 points/s, 0,8 s après le dernier effort | la teinte vive de la barre qui baisse et remonte en quelques secondes ; essoufflé, l'effort attend |
| Plafond du jour | horloge (par les efforts) | c'est la jauge d'aujourd'hui : chaque effort la baisse de son prix d'aujourd'hui (le budget d'une journée ne change pas) | la teinte du milieu qui descend au fil de la journée |
| Maximum | horloge (la nuit) | nouveau : monte la nuit si la journée a entamé le plafond d'au moins 40 % | la barre qui s'allonge, jour après jour |
| Sommeil | horloge | dormir avance l'horloge jusqu'au lever (6 h, ou coucher + 8 h) ; le plafond revient selon la fatigue de la veille et le sommeil pris | « Jour n, 6 h » au réveil ; un coucher tardif fait se lever tard |
| Jour | horloge | `day` devient l'horloge (jour et minute) | l'heure à l'écran |
| Travaux (récolte, coupe, fendage, équarrissage, tailler, transformer) | les deux | le geste garde sa durée (simulation) ; l'horloge avance de la durée réaliste du travail, en données (`minutes` de chaque récolte, coupe, transformation) | abattre un chêne : quelques secondes de gestes, une heure passe |
| Marche, course, porter | simulation | rien | rien |
| Gestes, combat, rail, bille, appuis longs, effets | simulation | ils suivent la vitesse de simulation par pas fixes (voir plus bas) | rien à x1 |
| Âge du bois | — (plus tard : horloge, en années) | rien pour l'instant | rien |
| Animaux (le lapin) | simulation pour bouger ; horloge pour leurs heures (sortir à l'aube) | à leur création | — |
| PNJ (la mère) | horloge, plus tard | routines remises à plus tard | — |

**La simulation suit sans sauter d'étape** : la physique (marche, collisions) fait déjà des pas fixes ; les **gestes** jouent chaque
image franchie (ToolUse, corrigé au combat) ; le **rail de la doloire** avance de `speed × delta` mais ne déclenche ses coups qu'au rythme
du geste (aucune étape sautée ; à vitesse de simulation, il faudra le passer en pas fixes pour que Xéros ne dépasse pas la fin de la
passe d'un coup) ; la **bille qui roule** avance pixel par pixel en vérifiant chaque pixel (déjà sûr) ; les **animaux** se déplaceront
par la physique (pas fixes) et décideront par pas fixes, jamais par `delta` agrandi. Règle à écrire dans CLAUDE.md : tout ce qui avance
hors de la physique avance par pas fixes de la simulation (une boucle `while (acc >= step)`), jamais d'un `delta` multiplié.

### 3. L'endurance chiffrée

Fait ainsi (stamina.json), avec trois reprises : la marche fatiguée est à la moitié de la marche (`tiredWalk` 0,5, 1 m/s ; plus bas,
« 85 % » est l'ancien chiffre) ; le travail au coup se paie au joule (`work` de stamina.json : `ceilingPerJ`, `breathPerJ` ; *Le
travail*), et `costs` ne vaut plus que pour les gestes sans matière ; la barre est horizontale, en bas à droite.

Le modèle proposé (à mettre dans stamina.json, à la place de `max`, `tired`, `tiredWalk`) :

```json
{
  "max": {"start": 100, "cap": 200, "gain": 2, "trainFrom": 0.4},
  "breath": {"regenPerSec": 12, "regenDelayMs": 800, "perCost": 3, "perSec": {"run": 5, "carryPerKg": 0.1, "pushPerKg": 0.05}},
  "tired": 0.15, "tiredWalk": 0.85,
  "sleep": {"hours": 8, "exhaustedPenalty": 0.4, "missingHourPenalty": 5, "nightFrom": 22, "nightAwakePerHour": 0.5},
  "costs": {"…": "les prix d'aujourd'hui, en points du plafond"}
}
```

- Un effort coûte son prix au plafond (comme aujourd'hui) et 3 fois son prix au souffle ; le souffle ne dépasse jamais le plafond.
- Épuisé (plafond à 0) : comme aujourd'hui, les efforts sont refusés. Essoufflé (souffle à 0) : l'effort attend que le souffle revienne
  (quelques secondes), sans message d'épuisement.
- Au réveil : plafond = maximum − 0,4 × (ce qui manquait sous 15 % du maximum au coucher, le seuil « fatigué ») − 5 par heure de
  sommeil manquante sous 8 h. Se coucher fatigué ne coûte rien ; seul le vrai épuisement se paie.
- Le maximum monte la nuit de 2 × (1 − maximum / 200) si la journée a entamé le plafond d'au moins 40 % du maximum.

Journée type (maximum 100) :

| Heure | Ce que fait Xéros | Plafond | Souffle au plus bas |
| --- | --- | --- | --- |
| 6 h | réveil | 100 | 100 |
| 7 h | puiser l'eau, bois du feu | 97 | 82,5 |
| 8 h | abattre un arbre normal, l'ébrancher | 82 | 20,5 |
| 10 h | couper en billes, porter | 72 | 39,6 |
| 12 h | équarrir une poutre de 3 m | 60 | 24 |
| 13 h | repas | 60 | 60 |
| 15 h | fendre deux billes | 52 | 18,2 |
| 16 h | mettre en tas | 46 | 27,6 |
| 17 h | course (20 min), mannequin (30 coups d'épée) | 17 | 1,7 |
| 21 h | soirée, petits travaux | 15 | 13,5 |
| 22 h | coucher | 15 | 15 |

Fatigué vers 21 h (sous 15) : la course s'arrête, la marche ralentit — la journée invite à se coucher.

Trois jours d'entraînement (la même journée, coucher 22 h, lever 6 h) :

| Jour | Maximum au réveil | Plafond au réveil | Plafond au coucher | Maximum le lendemain |
| --- | --- | --- | --- | --- |
| 1 | 100 | 100 | 15 | 101 |
| 2 | 101 | 101 | 16 | 102 |
| 3 | 102 | 102 | 17 | 103 |

Une semaine pareille mène vers 107, un mois vers 130 (le gain diminue en approchant de 200). Se coucher fatigué ne coûte rien ; se
coucher épuisé (plafond à 0) coûte 6 points le lendemain.

**Coucher à l'aube** : couché à 6 h au lieu de 22 h, le plafond de 15 descend à 11 en veillant (0,5 par heure de veille de nuit) ;
levé à 14 h (8 h de sommeil), plafond 98,4 au lieu de 100, et la demi-journée est perdue. **Nuit courte** (coucher 2 h, lever 6 h :
4 h de sommeil) : plafond 80 au réveil (81 si la journée a entraîné : le maximum est monté de 1 ; de même, 99,4 pour le coucher à
l'aube). **La vraie nuit blanche** (aucun sommeil, Xéros continue le lendemain) : à 6 h, le plafond est
à 11 (15 usé par 8 h de veille) et le souffle ne dépasse jamais ce plafond ; il est fatigué (sous 15 % du maximum) : pas de course, la
marche à 85 % ; il lui reste 11 points de travail avant l'épuisement (à peu près une heure d'abattage), puis plus rien de ce qui coûte
jusqu'au sommeil ; il marche, parle, prend ce qui est léger ; le maximum ne monte pas (il faut une nuit). La nuit suivante, le malus de
l'épuisement s'ajoute à celui des heures manquantes.

### 4. Le jour et la nuit (tranché : la lumière suit l'heure, faite ; le reste plus tard)

- **Tout de suite, proposé** : l'horloge et son affichage ; le sommeil qui avance l'horloge ; le lever et le malus de veille ; la vitesse
  du temps par paliers. **La lumière qui suit l'heure** (une teinte du monde par heure : aube, jour, crépuscule, nuit, les feux et les
  lanternes qui comptent la nuit) : proposée en deuxième temps, une fois l'horloge jouée, parce qu'elle touche tout l'affichage (la
  pénombre des intérieurs et du sous-bois, `gloom`, les lueurs).
- **Plus tard** : les routines des PNJ (la mère à l'atelier le matin, à la ferme du riche l'après-midi), les heures des animaux, les
  boutiques du village et leurs horaires, la météo, les saisons (le compteur de jours y mène).

### 5. Les tests

Proposé, en partie fait : ni `?simu`, ni `SCENARIOS_X1` n'existent ; un scénario attend un état, jamais un délai (`__until`,
`__restart` de tools/lib/playtest.ts, CLAUDE.md) ; le remplacement des pauses fixes est le chantier 3 de l'audit.

- **Vitesse de simulation dans `tools/lib/playtest.ts`** : x10 par défaut (`?simu=10`, lu par `main.ts` seulement avec `?debug` ou
  en test) ; une fonction `capture()` la remet à x1 (ou met la simulation en pause) le temps d'une capture d'écran, pour que l'image soit
  celle du jeu.
- **Un scénario à x1 avant chaque fusion** (`SCENARIOS_X1`, par défaut `monde` : le plus long en marche réelle et le plus sensible aux
  défauts de vitesse réelle), dans `test:scenarios:bg`.
- **Les pauses fixes à remplacer par des attentes d'état** : 222 dans les scénarios (fendage 28, construction 25, équarrissage 23,
  cabane 20, intérieurs 19, combat 19, tas 18, étal 15, poteaux 14, implantation 14, grange 12, monde 9, briques 5). Les remplacer par
  des attentes sur l'état du jeu (le mode, le geste fini, la carte, un objet né), comme pour monde, intérieurs et combat : elles
  suivent la simulation accélérée ; une pause fixe, elle, dure toujours autant et annule le gain.
- **La copie figée régénère ses fichiers** (`tools/scenarios-bg.ts`) : aujourd'hui elle recopie `src/generated/` du dossier de travail
  s'il manque, ce qui a caché à la fusion du combat qu'un dossier neuf ne savait plus produire ses fichiers. Proposé : effacer
  `src/generated/` de la copie et le régénérer (`npm run maps`, `npm run art`, l'ordre dont un dossier neuf a besoin), si bien que la
  suite vérifie aussi qu'un dossier neuf se construit.
- **Le gain estimé** : la suite fait 350 s (4 à la fois) ; la marche et les gestes représentent à peu près les deux tiers du temps de
  chaque scénario, le reste est le démarrage et les pauses. À x10, avec les pauses remplacées : **environ 2 min** (le démarrage des
  navigateurs et des serveurs reste) ; sans remplacer les pauses, à peine 30 % de gain.

### 6. L'heure, la vitesse, la touche

Remplacé par la clôture (en tête du chapitre) : le cadran en haut à droite, la vitesse toujours montrée, V seul en boucle, une attaque
qui ramène à x1, le sommeil par la paillasse. L'ancien texte est dans l'historique.

### 7. La sauvegarde et le découpage

- **Sauvegarde** : `SAVE_VERSION` 18 ; `day` devient `clock` (`{ day, minute }`), `stamina` devient `{ breath, ceiling, max }` ;
  `timeSpeed` (le palier) est gardé hors de la partie (`localStorage`, comme le zoom). Une partie de la version 17 est convertie à la
  lecture : `clock = { day, minute: 6 × 60 }`, `ceiling = stamina`, `breath = stamina`, `max = 100`.
- **Le découpage**, chaque étape testable et commitée seule :
  1. *L'horloge* : `clock` dans GameState, `systems/clock.ts` (avance à la vitesse du temps), l'affichage de l'heure, la touche V et les
     paliers, la conversion de sauvegarde ; test : l'heure avance au bon rythme à chaque palier.
  2. *(Remplacée par le travail au coup : voir* Le travail *; l'ancien texte est dans l'historique.)*
  3. *L'endurance en trois niveaux* : souffle, plafond, maximum ; la barre à trois teintes (le pixel-artist) ; test : la journée type
     simulée (`essai-temps.ts`) donne les mêmes chiffres en jeu.
  4. *Le sommeil et la veille* : le lever, le malus, le maximum qui monte ; test : nuit blanche, nuit courte, trois jours d'entraînement.
  5. *La vitesse de simulation* (`?debug`, playtest x10) et le remplacement des pauses fixes, scénario par scénario ; la copie figée
     qui régénère ; test : la suite plus courte, un scénario à x1.
  6. *La lumière qui suit l'heure* (si Grégoire la veut tout de suite).

### Historique (remplacé)

Ce qui suit a été décidé puis remplacé ; gardé pour comprendre d'où vient le code, **ne fait plus foi**. La règle est la clôture, en
tête du chapitre ; le travail, *Le travail*. Remplacé : la vitesse du temps qui ne fait que l'horloge (et « Deux vitesses à ne jamais
confondre »), l'accélération en pause, x24 par défaut, les travaux en minutes, la marche à 5 m/s, le § 6 d'origine (la vitesse
affichée hors défaut, Maj + V, V refusé au combat, le sommeil à x360) et l'étape 2 du découpage.

**Décidé par Grégoire** : une horloge unique de 24 h ; à x1, une journée dure 24 h réelles ; une vitesse du temps par paliers, réglée
par le joueur (à essayer : x1, x6, **x24 par défaut** — une journée en une heure —, x60, x360 pour attendre et dormir) ; une échelle de
temps propre à chaque être (un facteur, 1 par défaut, inutilisé pour l'instant : plus tard, ralentir la perception sera un pouvoir) ;
l'endurance en trois niveaux (souffle, plafond du jour, maximum), une barre à trois teintes ; pas d'effondrement forcé la nuit : la
veille se paie au réveil. **Choisi par défaut** (Grégoire peut le contredire) : un travail garde la durée de son geste en jeu, et
l'horloge avance pendant ce geste de la durée réaliste du travail (abattre un chêne ≈ 1 h de jeu, fendre une bille quelques minutes),
en données pour chaque action et chaque transformation ; la vitesse revient d'elle-même à x1 quand un combat commence (coup donné ou
reçu) ou qu'une créature hostile remarque Xéros (aucune n'existe encore ; le lapin à venir fuit).

**Deux vitesses à ne jamais confondre.** La **vitesse du temps** (celle du joueur) ne fait avancer que l'horloge : Xéros marche
toujours à 5 m/s (100 px/s), les gestes gardent leur durée. La **vitesse de simulation** accélère tout (gestes, marche, animaux) et est
réservée aux tests et au débogage (`?debug`) : elle fait plusieurs pas de simulation de taille normale par image, comme la physique de
Phaser quand le jeu rame (pas fixe de 1/60 s, plusieurs par image), et n'agrandit jamais les pas. L'inventaire des franchissements est
fait (commit « Franchissement », `world/crossing.ts`) ; ce qui n'est pas dans la physique doit suivre cette vitesse sans sauter
d'étape : vérifié au § 2, système par système.

**Validé par Grégoire** (même jour), avec ces réponses : la lumière qui suit l'heure en deuxième temps (étape 6) ; essoufflé, l'effort
attend sans message d'épuisement, mais la barre clignote et Xéros souffle (une petite animation) ; x24 par défaut, x6 en repli ; la barre
horizontale qui s'allonge avec le maximum, la teinte « revient » en torchis ; une durée réaliste fixe par travail, en minutes de jeu,
dans les données. Et deux corrections : le malus du réveil commence au seuil « fatigué » (15 % du maximum) — la journée type, qui finit
à 15, ne coûte rien le lendemain : seul le vrai épuisement se paie ; la vraie nuit blanche (aucun sommeil) est décrite au § 3. La
course (5 de souffle par seconde, sans retour pendant l'effort : environ 20 s, 165 m) est gardée pour l'essai, en données, jugée en jeu.
Cette section a d'abord été l'étape 1 du chantier (la conception, sans code). Les chiffres viennent de `tools/essai-temps.ts` (un modèle en petit, le
même qu'on mettra dans stamina.json), l'aperçu est `.art-preview/temps-endurance.png` (la courbe de la journée type ; dessous, la barre
à trois teintes à 6 h, 7 h 30, 16 h 30, 22 h et au réveil du 3e jour).

**L'accélération en pause, les travaux en temps réel** (décidé par Grégoire après l'essai des étapes 1 à 4, même jour ; remplacé
depuis par la clôture, en tête du chapitre, pour la vitesse du temps, puis par *Le travail* pour les travaux). On met
l'accélération du temps en pause et on joue tout à **x1**, pour calibrer le jeu petit à petit avant de décider comment la vitesse doit
marcher :
- **La vitesse du temps est verrouillée à x1** : V et les paliers sont éteints (`accelerate: false` dans `time.json` ; le code reste) ;
  l'heure s'affiche, sans indicateur de vitesse. La vitesse de simulation des tests ne change pas (un test peut encore faire aller le
  temps plus vite, `ClockSystem.speed`, pour voir un long travail avancer).
- **Plus de saut de l'horloge.** Un travail (abattre, ébrancher, récolter, couper, fendre, équarrir, tailler) se lance d'un appui, puis
  Xéros répète son geste pendant toute sa durée réaliste (les `minutes` des données), en temps réel : abattre un arbre normal prend
  25 minutes réelles. Le nombre de coups découle de la durée et du rythme du geste ; les étapes des données (`hits` : l'arbre qui
  tremble, la coupe qui se creuse, la fente qui s'allonge) tombent à intervalles égaux, chacune sur un coup ; le résultat arrive à la
  fin (`systems/work.ts` ; la passe de doloire, sur son rail, dure `minutesPerM` par mètre de face). Une jauge au-dessus de Xéros montre
  où il en est. **Bouger ou Échap interrompt**, et ce qui est fait reste fait : la part faite d'un travail est gardée dans GameState
  (`work` de la carte, par objet ; la face entamée, `dressed`), sauvegarde comprise, et le travail repris continue de là. L'endurance se
  paie au fil du travail, coup par coup (le prix du travail entier est celui de ses étapes d'avant : 4 × 0,8 pour un arbre normal) ; à
  bout de souffle, le travail attend que Xéros reprenne son souffle puis continue.
- Les petits gestes (nouer, planter un piquet, pivoter une bille, poser une pièce, dresser une poutre) ne durent que leur geste : leurs
  minutes (`work` de time.json) attendent. Le coin se plante toujours d'un coup. Les transformations n'ont pas encore de geste : ?dieu
  « Transformer » les applique, et avance l'horloge de leur durée, comme « Finir le travail ».
- **?dieu « Finir le travail »** termine d'un coup le travail en cours (ou la passe de doloire), comme s'il avait duré son temps :
  l'horloge avance de ce qui manquait, l'endurance en paie le reste (sans attendre son souffle), le résultat tombe.
- Rien d'autre : pas de nouveau modèle d'endurance pour l'instant. Ce qui suit (la conception d'avant, la vitesse par paliers) reste la
  référence pour le jour où l'accélération reviendra.

**L'ancien § 6, l'heure, la vitesse, la touche** :

- **L'heure** s'affiche en haut à droite de l'écran, petite, dans le style des chiffres du HUD (`ui-digit-*`) : « Jour 3 · 14:20 », et
  la vitesse à côté quand elle n'est pas celle par défaut (« x60 »). Le HUD des mains et la barre d'endurance restent en bas.
- **La touche** : **V** (« vitesse »), à la même place en AZERTY et en QWERTY, libre aujourd'hui (docs/COMMANDES.md : ni le jeu ni la
  construction ne l'utilisent), lue par sa place : V passe au palier suivant, Maj + V au précédent ; un message court dit le palier
  (« Le temps : x60 »). Refusée pendant un combat ou si une créature hostile le voit (la vitesse revient à x1).
- **Dormir** passe par la paillasse (« Dormir ? ») : le sommeil se joue à x360 (quelques secondes de fondu), comme aujourd'hui.

**L'ancienne étape 2 du découpage** :

  2. *La durée des travaux* : `minutes` dans les récoltes, coupes, fendages, transformations ; l'horloge avance pendant le geste ;
     test : abattre un arbre normal avance l'horloge de sa durée.

## Le travail (décidé le 1er novembre 2026, chantier « temps » ; validé par Grégoire avec trois réponses : la loi du volume, deux points de calage, la cognée à 1,8 kg)

**Pourquoi.** Joué à x1, un travail de durée fixe ne va pas : Xéros tape une fois par seconde et rien ne change jusqu'au résultat,
« on dirait que c'est statistique » (Grégoire). **La durée doit découler des coups, pas l'inverse.** Un travail est une quantité de
matière à enlever ou à vaincre ; chaque coup en enlève une part, selon l'énergie du coup, le tranchant, la dureté du bois et la
précision ; chaque coup coûte du souffle et du plafond ; à bout de souffle, Xéros s'arrête et souffle, puis reprend. La durée totale,
ce sont les coups et les pauses, elle se calcule toute seule : quand Xéros deviendra plus fort, il abattra plus vite sans qu'on touche
aux données. Les `minutes` actuelles deviennent une **cible de calibrage**, plus une durée imposée. Les chiffres ci-dessous viennent de
`tools/essai-travail.ts` (le modèle en petit, qui importe la physique du combat) ; l'essai visuel est `.art-preview/essai-abattage.png`
et `.art-preview/essai-abattage.html` (le geste à vitesse réelle).

### 1. Ce que dit le réel

- **Rythme de frappe soutenable** : le Compendium of Physical Activities (code « chopping wood », hache de 1,25 kg) donne 19 coups par
  minute à effort modéré (5 MET), 35 à effort vigoureux (8 MET), 51 à effort extrême (17,5 MET). Un rythme tenu longtemps est donc
  entre 20 et 35 coups par minute, 1,7 à 3 s par coup, déplacements compris.
- **Abattre à la hache** : le guide de la hache du Service des forêts américain (USDA, *An Ax to Grind*) place l'entaille de direction
  entre le tiers et la moitié du diamètre. Aucune mesure sérieuse du nombre de coups pour un arbre donné n'a été trouvée ; les
  repères : en compétition, un bloc debout de 25 cm d'un bois tendre tombe en 26 s (record féminin Stihl Timbersports) et un bloc de
  pin blanc de 35,5 cm en 22 s (Guinness), avec des haches de course affûtées comme des rasoirs ; un débutant parle d'« une bonne
  heure » pour un arbre moyen. Estimation retenue, en volume de bois (qui croît comme le cube du diamètre) : **30 cm, environ 10 min
  pour un bûcheron entraîné, 15 pour un adulte, 25 pour un adolescent ; 55 cm, cinq à six fois plus** (1 à 2 h 30).
- **Équarrir** : *Mortise & Tenon Magazine* mesure 1,19 m² de face équarrie par personne et par heure, à un rythme posé (un poteau
  de 8 × 8 pouces sur 12 pieds en 3 h) ; des praticiens disent 15 à 30 min par pied de poutre (20 à 30 min en moyenne). Notre poutre
  de 3 m, 20 × 20 (2,4 m² de faces) : **environ 2 h pour un adulte posé**.
- **Fendre** : rien de mesuré ; des forums parlent d'une bille de chêne de 1 m de diamètre réduite en bûches en un quart d'heure, et
  d'une grosse bille ouverte en quelques coups de masse lourde. Estimation : **une bille de 55 cm sur 1 m ouverte en deux en 15 à 40
  coups, une à deux minutes**.
- **Masse des outils** : la hache d'abattage américaine de Gränsfors Bruk, tête de 1,4 kg (3 lb), manche de 79 cm, 1,6 kg en tout ; sa
  grande hache à fendre, 2,4 kg, 70 cm ; la hache de forêt scandinave, tête de 0,9 kg, 65 cm. La masse de bûcheron courante pèse 3 à
  5 kg ; la doloire, 2 à 3,5 kg (modèles courants, pas de source unique trouvée). **Nos outils** : cognée 1,8 kg (une hache de ferme ;
  décidé : le geste lourd vient de l'animation, pas d'une masse fausse), hachette 1 kg, masse 4 kg, doloire 3 kg (items.json).
- **Marche et course** : la marche d'un adulte est d'environ 1,3 à 1,4 m/s (méta-analyse de Bohannon et Andrews, 2011) ; on passe à la
  course vers 2 m/s ; un petit trot (jogging) va de 2,5 à 3,1 m/s ; en portant, la vitesse la plus économe reste vers 1,3 m/s jusqu'au
  quart du poids du corps (Bastien et coll., 2005), plus lente au-delà (1 à 1,1 m/s).

Sources : [Compendium of Physical Activities](https://pacompendium.com/occupation/) ;
[USDA, An Ax to Grind](https://www.fs.usda.gov/t-d/pubs/htmlpubs/htm99232823/page04.htm) ;
[Guinness, standing block chop](https://www.guinnessworldrecords.com/world-records/67841-fastest-wood-cutting-standing-block-chop) ;
[Stihl Timbersports, record féminin](https://930kmpt.com/ixp/990/p/lauren-the-lumberjill-champ/) ;
[Mortise & Tenon, The Efficiency of Hewing](https://mortiseandtenonmag.com/blogs/blog/the-efficiency-of-hewing) ;
[Permies, Hand hewing beams](https://permies.com/t/58723/Hand-hewing-beams) ;
[Press Herald, un équarrisseur professionnel](https://www.pressherald.com/?p=7385688) ;
[Gränsfors Bruk, American Felling Axe](https://www.oldausable.com/american-felling-axe) ;
[Gränsfors Bruk, Large Splitting Axe](https://www.knivesandtools.com/en/pt/-gransfors-bruk-large-splitting-axe-442-XX-51350.htm) ;
[Bohannon et Andrews, Normal walking speed](https://pubmed.ncbi.nlm.nih.gov/21820535/) ;
[Bastien et coll., marche chargée](https://springerlink.bibliotecabuap.elogim.com/content/pdf/10.1007/s00421-004-1286-z.pdf) ;
[Hearth.com, fendre de gros chênes](https://hearth.com/talk/threads/help-with-splitting-big-oak-logs.33104).
Ces chiffres sont des ordres de grandeur : la plupart viennent de praticiens, pas de mesures ; le jeu se calibre ensuite à l'œil.

### 2. Le modèle

**Un coup** (la même physique que le combat, `world/strike.ts`) :
- L'outil a une **inertie** autour des mains, I = masse qui frappe × L² (`inertia` : la masse × ⅔ × l'équilibre, L la longueur devant
  les mains).
- Le corps applique un **couple** τ (la force de Xéros) sur l'**angle de frappe** θ du geste : l'outil arrive à la vitesse angulaire
  ω = min(√(2 τ θ / I), ω_max), où ω_max est la vitesse du bras ; **son énergie** E = ½ I ω². Un outil lourd prend toute la force (E =
  τ θ) mais part lentement ; un outil léger plafonne à la vitesse du bras (la hachette ne frappe jamais fort).
- **Sa durée** : cinq temps. *Armer*, *temps en haut* et *dégager* s'allongent avec I / τ (une cognée se lève lourdement, un homme fort
  la lève plus vite) ; *abattre* = 2 θ / ω (l'outil accélère) ; *impact*, fixe.
- **Sa précision** p : celle de l'arme (`precision` : 1 / (1 + I / contrôle)), le contrôle grandissant avec la force, × l'**adresse**.

**Ce qu'enlève un coup** : E × qualité × tranchant / (résistance de la matière × dureté du bois), où qualité = 1 − `aim` × (1 − p) :
`aim` dit combien la précision compte pour cet outil. La résistance : l'énergie pour enlever 1 cm³ en travers du fil (`cut`, 10,8 J/cm³,
calé pour que Xéros abatte l'arbre normal en 25 min), 1 cm³ le long d'une face marquée (`hew`, 4,3 J/cm³ : le bois se lève par
éclats ; calé sur l'équarrisseur professionnel), 1 m² de fente au coin (`split`, 2 200 J/m², frottement du coin compris).

**La matière de chaque travail** (calculée de ses dimensions, en données) :
- abattre : deux encoches en V (l'entaille de direction, 0,4 D de profondeur ; le trait d'abattage, 0,5 D), ≈ 0,18 D³ (30 cm :
  5 000 cm³ ; 55 cm : 30 700 cm³) ;
- ébrancher : chaque branche tranchée en V, ≈ 0,6 d³ par branche (nombre et diamètre des branches dans props.json) ;
- couper une pièce couchée : deux V d'une demi-épaisseur, un de chaque côté, ≈ 0,21 D³ ;
- fendre : la surface de la fente (diamètre × longueur) ;
- équarrir : le cercle moins le carré de la poutre, sur la longueur (passe par passe : chaque face, un quart) ;
- tailler un piquet : le cylindre moins le cône de la pointe.

**L'endurance d'un coup** : le plafond perd E × `ceilingPerJ`, le souffle E × `breathPerJ` (un coup de cognée de Xéros : 0,013 point
du plafond, 2,9 de souffle). Pendant un travail le souffle ne revient pas (chaque coup est un effort) ; vide, Xéros s'arrête et souffle
(l'animation existe) jusqu'à `resume` (90 %) de son plafond, puis reprend tout seul : une pause d'environ 8 s toutes les 30 coups pour
Xéros. Le prix de la journée type reste le même ordre (abattre et ébrancher l'arbre normal : 14,8 points ; la conception du temps en
comptait 15).

### 3. Chaque outil, ce qui compte

| Outil | Ce qui compte | Pourquoi | `aim` |
| --- | --- | --- | --- |
| **cognée** (abattre, ébrancher, couper) | la force | lourde du bout : toute l'énergie du corps ; un coup un peu à côté de l'entaille enlève encore beaucoup | 0,3 |
| **masse** (sur le coin) | la force | elle ne coupe pas : elle enfonce le coin (tranchant 0,5) ; le coin est là, viser compte peu | 0,2 |
| **hachette** (tailler, ébrancher les petites branches) | entre les deux | légère : la vitesse du bras la limite, la force compte peu ; elle se place bien | 0,5 |
| **doloire** (équarrir) | la précision | un coup court, peu de force ; un coup imprécis enlève peu, et plus tard laissera une face moins nette | 0,8 |

### 4. Les paramètres, en données

- **strength.json**, `swing` : la force de Xéros pour un geste, `torque` (N·m, 50 aujourd'hui), `omegaMax` (rad/s, 25), `skill` (0,8).
  Un Xéros plus fort = un `torque` plus grand ; rien d'autre ne change (?dieu « force » multiplie le couple).
- **items.json**, `work` de chaque outil (comme `weapon`) : `length`, `grip`, `balance` (l'inertie, comme une arme), `edge`, `aim` ; la
  masse est déjà `mass`.
- **work.json** (fait ainsi à l'implémentation, plutôt que dans gestures.json et wood.json) : `strokes`, chaque coup (`use`, `chop`,
  `maul`, `hew`, `whittle`) avec le geste du corps qui le joue, son `angle` (rad) et ses temps hors frappe (`arm`, `armK`, `hold`,
  `holdK`, `impact`, `free`, `freeK`) ; `matter`, la résistance (`cut` 10,8 J/cm³, `hew` 4,3 J/cm³, `split` 2 200 J/m²) ; `references`,
  l'adulte et le bûcheron fort ; `calibration`, les deux points de calage, tenus à 10 % près (validate.ts). La dureté viendra par
  essence (une seule aujourd'hui).
- **gestures.json**, `phases` : le temps de chaque image d'un geste de travail (armer, en haut, abattre, impact, dégager) ; les durées
  des images en découlent (`frameMs` de world/swing.ts).
- **props.json**, `harvest.work` : la matière du travail (`fell` : le diamètre ; `limbs` : le nombre et le diamètre des branches ;
  `whittle` : la pointe), et ses étapes visibles. Les `minutes` des récoltes et du bois disparaissent : **deux points de calage
  seulement** (décidé par Grégoire), l'arbre normal à la cognée en 25 min pour Xéros et la poutre de 3 m en 2 h pour le bûcheron fort
  (work.json, `calibration`) ; toutes les autres durées sont calculées, affichées par `npm run check`, jamais imposées.
- **stamina.json**, `work` : `ceilingPerJ`, `breathPerJ`, `resume`.
- **validate.ts** calcule, pour Xéros d'aujourd'hui, la durée de chaque travail et l'affiche à côté de sa cible (`npm run check`), sans
  refuser : c'est un tableau de bord du calibrage.

### 4 bis. La force reste humaine (décidé par Grégoire après l'essai)

La force réglée dans ?dieu (« force ») multiplie le couple de Xéros, **jusqu'au plafond d'un humain** : `humanMax` de strength.json
(130 N·m, un homme très fort, ×2,6 la force de Xéros). Au-delà, plus rien ne change. **La force surhumaine qui lève ce plafond viendra
plus tard, avec les superpouvoirs.** Les chiffres, pour l'arbre normal à la cognée (le couple multiplié, sans le plafond, pour garder la
mesure ; le maximum d'endurance pris à 100 pour tous) :

| Force | Couple (N·m) | Énergie du coup (J) | Vitesse angulaire (rad/s) | Durée d'un coup (s) | Coups | Pauses | Durée totale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ×1 (Xéros) | 50 | 90 | 14,6 | 1,64 | 784 | 25 | 24 min 54 |
| ×1,5 (l'adulte) | 75 | 135 | 17,9 | 1,40 | 509 | 25 | 15 min 18 |
| ×2,2 (le bûcheron fort) | 110 | 198 | 21,7 | 1,23 | 338 | 24 | 10 min 18 |
| **×2,6 (le plafond humain)** | **130** | **234** | **23,6** | **1,18** | **283** | **23** | **8 min 42** |
| ×3 (au-delà : refusé) | 150 | 264 | 25,0 (le bras) | 1,14 | 248 | 24 | 8 min 00 |
| ×5 (refusé) | 250 | 264 | 25,0 | 1,06 | 240 | 23 | 7 min 24 |
| ×10 (refusé) | 500 | 264 | 25,0 | 0,99 | 230 | 22 | 6 min 54 |

Dès ×2,9, la vitesse du bras plafonne l'énergie (264 J) : seule la levée de l'outil raccourcit encore. Le plafond humain s'arrête un peu
avant.

### 5. Le tableau

Pour trois forces : Xéros aujourd'hui (couple 50 N·m, adresse 0,8, maximum 100), un adulte (75, 0,9, 140), un bûcheron fort (110,
1, 180). « Pauses » : les arrêts pour souffler, et la durée d'un arrêt. La cible : les `minutes` d'aujourd'hui.

#### Un coup, par outil et par force

| Outil (coup) | Force | Inertie (kg·m²) | Vitesse du tranchant (m/s) | Énergie (J) | Précision | Armer · haut · abattre · impact · dégager (ms) | Durée du coup (s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hache (use) | Xéros (aujourd’hui) | 0,84 | 11,0 | 90 | 0,21 | 553 · 221 · 246 · 120 · 503 | 1,64 |
| hache (use) | un adulte | 0,84 | 13,4 | 135 | 0,31 | 469 · 188 · 201 · 120 · 419 | 1,40 |
| hache (use) | un bûcheron fort | 0,84 | 16,2 | 198 | 0,44 | 415 · 166 · 166 · 120 · 365 | 1,23 |
| hachette (use) | Xéros (aujourd’hui) | 0,12 | 9,5 | 38 | 0,57 | 336 · 134 · 144 · 120 · 286 | 1,02 |
| hachette (use) | un adulte | 0,12 | 10,3 | 44 | 0,71 | 324 · 130 · 133 · 120 · 274 | 0,98 |
| hachette (use) | un bûcheron fort | 0,12 | 11,4 | 54 | 0,85 | 316 · 127 · 120 · 120 · 266 | 0,95 |
| masse de bûcheron (maul) | Xéros (aujourd’hui) | 2,30 | 7,5 | 100 | 0,09 | 1041 · 426 · 429 · 150 · 991 | 3,04 |
| masse de bûcheron (maul) | un adulte | 2,30 | 9,1 | 150 | 0,15 | 811 · 334 · 351 · 150 · 761 | 2,41 |
| masse de bûcheron (maul) | un bûcheron fort | 2,30 | 11,1 | 220 | 0,22 | 664 · 276 · 289 · 150 · 614 | 1,99 |
| doloire (hew) | Xéros (aujourd’hui) | 0,65 | 5,9 | 45 | 0,25 | 395 · 115 · 153 · 100 · 345 | 1,11 |
| doloire (hew) | un adulte | 0,65 | 7,2 | 67 | 0,37 | 330 · 93 · 125 · 100 · 280 | 0,93 |
| doloire (hew) | un bûcheron fort | 0,65 | 8,7 | 99 | 0,50 | 289 · 80 · 103 · 100 · 239 | 0,81 |

#### Chaque travail, pour trois forces

| Travail | Outil | Force | Coups | Durée d’un coup (s) | Pauses (durée) | Durée totale | Plafond dépensé | Cible (min) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| abattre un arbre normal (30 cm) | hache | Xéros (aujourd’hui) | 784 | 1,64 | 25 (8 s) | 24 min 56 | 9,9 | 25 pour Xéros (calage) |
| abattre un arbre normal (30 cm) | hache | un adulte | 502 | 1,40 | 17 (11 s) | 14 min 53 | 9,5 | 25 pour Xéros (calage) |
| abattre un arbre normal (30 cm) | hache | un bûcheron fort | 327 | 1,23 | 12 (14 s) | 9 min 35 | 9,1 | 25 pour Xéros (calage) |
| abattre un arbre normal (30 cm) | hachette | Xéros (aujourd’hui) | 1822 | 1,02 | 24 (8 s) | 34 min 19 | 9,6 | — |
| abattre un arbre normal (30 cm) | hachette | un adulte | 1435 | 0,98 | 16 (11 s) | 26 min 29 | 8,8 | — |
| abattre un arbre normal (30 cm) | hachette | un bûcheron fort | 1077 | 0,95 | 11 (14 s) | 19 min 40 | 8,2 | — |
| abattre le gros arbre (55 cm) | hache | Xéros (aujourd’hui) | 4829 | 1,64 | 155 (8 s) | 2 h 34 | 60,8 | — |
| abattre le gros arbre (55 cm) | hache | un adulte | 3094 | 1,40 | 106 (11 s) | 1 h 32 | 58,5 | — |
| abattre le gros arbre (55 cm) | hache | un bûcheron fort | 2014 | 1,23 | 80 (14 s) | 1 h 00 | 55,8 | — |
| ébrancher l’arbre normal (12 branches de 7 cm) | hache | Xéros (aujourd’hui) | 368 | 1,68 | 12 (8 s) | 11 min 58 | 4,9 | — |
| ébrancher l’arbre normal (12 branches de 7 cm) | hache | un adulte | 236 | 1,43 | 8 (11 s) | 7 min 08 | 4,7 | — |
| ébrancher l’arbre normal (12 branches de 7 cm) | hache | un bûcheron fort | 154 | 1,27 | 6 (14 s) | 4 min 41 | 4,5 | — |
| ébrancher l’arbre normal (12 branches de 7 cm) | hachette | Xéros (aujourd’hui) | 903 | 1,06 | 12 (8 s) | 17 min 36 | 4,8 | — |
| ébrancher l’arbre normal (12 branches de 7 cm) | hachette | un adulte | 712 | 1,02 | 7 (11 s) | 13 min 24 | 4,4 | — |
| ébrancher l’arbre normal (12 branches de 7 cm) | hachette | un bûcheron fort | 534 | 0,99 | 5 (14 s) | 9 min 58 | 4,0 | — |
| ébrancher le gros arbre (16 branches de 10 cm) | hache | Xéros (aujourd’hui) | 1431 | 1,68 | 49 (8 s) | 46 min 52 | 19,0 | — |
| ébrancher le gros arbre (16 branches de 10 cm) | hache | un adulte | 917 | 1,43 | 33 (11 s) | 28 min 06 | 18,3 | — |
| ébrancher le gros arbre (16 branches de 10 cm) | hache | un bûcheron fort | 597 | 1,27 | 24 (14 s) | 18 min 20 | 17,5 | — |
| couper un rondin de 30 cm | hache | Xéros (aujourd’hui) | 855 | 1,68 | 29 (8 s) | 27 min 58 | 11,4 | — |
| couper un rondin de 30 cm | hache | un adulte | 548 | 1,43 | 20 (11 s) | 16 min 51 | 10,9 | — |
| couper un rondin de 30 cm | hache | un bûcheron fort | 357 | 1,27 | 14 (14 s) | 10 min 52 | 10,4 | — |
| couper une bille de 55 cm | hache | Xéros (aujourd’hui) | 5269 | 1,68 | 181 (8 s) | 2 h 53 | 70,1 | — |
| couper une bille de 55 cm | hache | un adulte | 3376 | 1,43 | 124 (11 s) | 1 h 44 | 67,4 | — |
| couper une bille de 55 cm | hache | un bûcheron fort | 2197 | 1,27 | 91 (14 s) | 1 h 08 | 64,3 | — |
| fendre une bille de 55 cm × 1 m | masse de bûcheron | Xéros (aujourd’hui) | 30 | 3,04 | 0 (8 s) | 1 min 31 | 0,4 | — |
| fendre une bille de 55 cm × 1 m | masse de bûcheron | un adulte | 20 | 2,41 | 0 (11 s) | 48 s | 0,4 | — |
| fendre une bille de 55 cm × 1 m | masse de bûcheron | un bûcheron fort | 14 | 1,99 | 0 (14 s) | 28 s | 0,4 | — |
| équarrir une poutre de 3 m (rondin de 30 cm → 20 × 20) | doloire | Xéros (aujourd’hui) | 21877 | 1,11 | 352 (8 s) | 7 h 33 | 137,8 | 120 pour le bûcheron fort (calage) |
| équarrir une poutre de 3 m (rondin de 30 cm → 20 × 20) | doloire | un adulte | 11859 | 0,93 | 204 (11 s) | 3 h 42 | 112,1 | 120 pour le bûcheron fort (calage) |
| équarrir une poutre de 3 m (rondin de 30 cm → 20 × 20) | doloire | un bûcheron fort | 6631 | 0,81 | 129 (14 s) | 2 h 00 | 91,9 | 120 pour le bûcheron fort (calage) |
| tailler un piquet (branche de 5 cm, pointe de 12 cm) | hachette | Xéros (aujourd’hui) | 58 | 0,59 | 0 (8 s) | 34 s | 0,3 | — |
| tailler un piquet (branche de 5 cm, pointe de 12 cm) | hachette | un adulte | 46 | 0,56 | 0 (11 s) | 26 s | 0,3 | — |
| tailler un piquet (branche de 5 cm, pointe de 12 cm) | hachette | un bûcheron fort | 34 | 0,53 | 0 (14 s) | 18 s | 0,3 | — |
| tailler un piquet (branche de 5 cm, pointe de 12 cm) | hache | Xéros (aujourd’hui) | 24 | 1,68 | 0 (8 s) | 40 s | 0,3 | — |
| tailler un piquet (branche de 5 cm, pointe de 12 cm) | hache | un adulte | 15 | 1,43 | 0 (11 s) | 21 s | 0,3 | — |
| tailler un piquet (branche de 5 cm, pointe de 12 cm) | hache | un bûcheron fort | 10 | 1,27 | 0 (14 s) | 13 s | 0,3 | — |

Points de calage (work.json) : abattre l'arbre normal à la cognée, Xéros, 25 min ; équarrir une poutre de 3 m, le bûcheron fort (1,19 m² de face par heure), 120 min.

Ce qu'on lit : l'arbre normal tombe en 25 min pour Xéros (le calage), 15 pour un adulte, 10 pour un bûcheron fort ; à la hachette, deux
fois plus de coups, plus rapides : un peu plus long. Le gros arbre, 2 h 30 pour Xéros : le volume croît comme le cube du diamètre
(décidé : on garde la loi du volume ; **la scie passe-partout viendra plus tard, l'outil des gros bois**). Couper une bille de 55 cm à la
cognée, près de 3 h. Fendre est rapide (1 min 30) ; tailler un piquet, une demi-minute. L'équarrissage, calé sur le professionnel
mesuré (1,19 m² de face par heure : 2 h pour le bûcheron fort), demande 3 h 40 à un adulte et 7 h 30 à Xéros, plus que son plafond
d'une journée (138 points) : une poutre de 3 m lui prend deux jours.

### 6. Ce qu'on voit avancer

Les étapes se déclenchent à une part de la matière enlevée, en données (`stages` de `harvest`), chacune un dessin (pixel-artist) :
- **abattre** : l'entaille de direction en trois étapes (un tiers, deux tiers, finie : 0 à 45 % de la matière), le trait d'abattage
  d'en face (45 à 90 %), le **craquement** (90 % : la charnière, des éclats, un bruit), l'arbre qui **penche** (95 % : deux images, de
  plus en plus), puis la chute (100 %). Les copeaux s'accumulent au pied d'étape en étape.
- **ébrancher** : les branches tombent une à une (une par part de la matière, le houppier s'allège à chaque branche).
- **couper une pièce couchée** : l'encoche se creuse en trois étapes (l'encoche d'aujourd'hui), la pièce s'ouvre au bout.
- **fendre** : le coin s'enfonce, la fente court en trois étapes par mètre (ce qu'on voit aujourd'hui), puis la pièce s'ouvre.
- **équarrir** : la face qui avance sous le fer (aujourd'hui) ; plus tard, sa netteté selon la précision des coups.
- **tailler** : la pointe qui s'affine (deux étapes).

Fait ainsi pour l'arbre debout (chantier 1 de l'audit, 2 novembre 2026) : l'entaille se dessine du côté où frappe Xéros, avec des étapes
dessinées pour la gauche (`<arbre>-left-stage-<n>`, art/world/work-stages.ts, sans retournement) ; et deux images de raccord, en tête
des planches de chute (art/world/felling.ts), passent de l'arbre qui penche à sa chute sans saut.

### 7. Les commandes

**Corrigé par Grégoire après l'essai** : un seul appui sur Espace lance tout le travail, comme la doloire : Xéros se place, choisit son
côté, un appui, puis il travaille seul jusqu'au résultat, avec ses pauses de souffle. Bouger ou Échap arrête (le coup en cours
s'achève) ; ce qui est fait reste fait (la matière enlevée, gardée par objet dans GameState). La
jauge au-dessus de Xéros montre la part enlevée. ?dieu « Finir le travail » reste : il fait tous les coups d'un coup (horloge,
endurance, pauses comprises).

### 8. La marche et la course

Repris par la clôture du *Temps* : marche 2 m/s, course 2,5 m/s, fatigué 1 m/s ; `PLAYER.walk` et `PLAYER.run` (config.ts, en m/s)
sont la seule source (systems/speeds.ts), réglables dans ?dieu « Vitesses » et retenus dans le navigateur. Le texte d'alors :

Aujourd'hui Xéros marche à 5 m/s (100 px/s à 5 cm par pixel) et court à 8,25 m/s (165 px/s) : trois à quatre fois le réel (marche
1,3 à 1,4 m/s, petit trot 2,5 à 3,1, en portant lourd 1 à 1,1). Proposé : un réglage dans le panneau ?dieu, « Vitesses » : marche,
course, marche chargée (en m/s, converties en px/s), appliquées tout de suite et gardées dans le navigateur (comme le zoom), sans
toucher aux valeurs par défaut ; Grégoire calibre en jeu, puis on écrit ses valeurs dans config.ts (`PLAYER`).

### 9. Le découpage

1. **La physique du coup** : `world/swing.ts` (sans Phaser), qui reprend `inertia` et `precision` de `world/strike.ts` ; les champs de
   strength.json, items.json, gestures.json ; test rapide : le tableau « Un coup » ci-dessus, retrouvé.
2. **La matière** : les champs de wood.json, props.json, stamina.json ; `minutes` devient `target` ; validate.ts affiche la durée
   calculée contre la cible ; test rapide : le tableau « Chaque travail », retrouvé.
3. **Le geste lourd** : les cinq temps du coup de cognée (`use`, `chop`) et de la masse (`maul`), dessinés par le pixel-artist d'après
   l'essai validé, leurs durées tirées de `swing` ; test : la durée d'un coup en jeu égale celle du modèle.
4. **Les commandes et le travail par coups** : `systems/work.ts` refait (Espace un coup, maintenu enchaîne, relâcher ou bouger arrête,
   pauses de souffle automatiques ; repris par le § 7 : un appui lance tout le travail, un pas ou Échap arrête), la part enlevée gardée ; scénario : un arbre abattu coup par coup, interrompu, repris après
   rechargement.
5. **Les étapes visibles** : l'entaille, le craquement, l'arbre qui penche, les branches qui tombent, la pointe ; dessins par le
   pixel-artist ; aperçu et scénario.
6. **Les vitesses dans ?dieu** : le réglage, gardé dans le navigateur ; test.

**La sauvegarde** : `work` de chaque carte garde aujourd'hui des minutes faites ; il gardera la **part de matière enlevée** (de 0 à 1,
`{ work, done }`) : SAVE_VERSION 22, et une partie d'avant convertit ses minutes en part (minutes / la cible). Les étapes se déduisent
de la part (rien d'autre à garder) ; les encoches et les coins plantés restent dans les réglages de la pièce de bois.

### 10. Décidé par Grégoire le 2 novembre 2026 (audit)

Tranché pendant l'audit (docs/AUDIT.md, « À trancher ») ; **en cours de réalisation** (chantier 4 de l'audit) :
- **Le rocher se travaille au coup**, comme le reste : la pioche, un travail où compte surtout la force ; aujourd'hui encore une
  récolte à l'ancienne (5 coups au prix fixe de `chop`).
- **Le prix d'une attaque au joule, comme le travail** : une seule physique pour les outils et les armes (l'énergie, et son prix) ;
  aujourd'hui encore `attackBase` + `attackPerKg` × la masse de l'arme (*Le combat*).
- **Porter et rouler plafonnent aussi la force**, au même modèle réaliste que la frappe (`humanMax`, § 4 bis) ; aujourd'hui ?dieu
  « force » multiplie `carry`, `walk` et `roll` sans plafond. La force surhumaine lèvera tous les plafonds, plus tard.

**Déjà fait** (chantier 1 de l'audit) :
- **L'arbre tombe du côté où Xéros frappe** : au lancement, Xéros se place lui-même de ce côté, le fer sur l'entaille (`FELL.reach` de
  config.ts) ; l'entaille se dessine de ce côté, avec des étapes dessinées pour la gauche ; le côté est gardé avec le travail en cours
  (`side` de `work` dans GameState), si bien qu'un travail repris tombe du même côté.
- **Deux images de raccord** entre l'arbre qui penche (la dernière étape) et sa chute, en tête des planches de chute.

## Le combat (décidé le 1er novembre 2026, chantier « combat de base »)

Une base juste, pas complète : deux armes (la branche, l'[épée de bois](objets/wooden-sword.md)), une cible qui encaisse (le
[mannequin d'entraînement](objets/training-dummy.md)), et une architecture où ajouter une arme donne ses animations tout de suite.
Les touches : [docs/COMMANDES.md](COMMANDES.md).

- **Le corps et l'arme sont séparés** (décidé avec Grégoire). Le corps a un répertoire de gestes, dans les quatre directions, qui ne
  savent pas ce que Xéros tient : pour ce chantier, la **taille** (coup de côté) et le **coup d'en haut** (vertical). Ce sont les
  gestes `use` et `chop` des outils (gestures.json), qui disent à chaque image où est la main et dans quel angle part ce qu'elle tient :
  aucun corps n'a été redessiné. Plus tard, des gestes propres au combat (à une main, d'estoc) s'ajouteront au même répertoire.
- **Une arme est des données et un dessin.** `weapon` d'un objet de items.json : sa longueur, sa prise (où la main la tient), sa
  famille de gestes, sa planche ; sa masse et ses mains sont celles de l'objet. Le dessin est **un seul**, couché vers l'est, tiré en
  huit angles par `art/lib/weapon.ts` (rotation, puis éclairage en haut à gauche ; le pixel-artist reprend les diagonales s'il le
  faut) ; à chaque image du geste, le jeu pose sur la main l'angle de la pose (`weaponFrame`, entities/ToolUse.ts). La branche :
  125 cm, tenue à 10 cm du gros bout, 2,5 kg ; l'épée de bois : 90 cm, tenue à 6 cm du pommeau, 0,8 kg. **Rééquilibrées** (même
  jour, après le premier essai de Grégoire : la branche frappait six fois plus fort que l'épée et portait plus loin, personne ne
  l'aurait prise) : chaque arme a aussi un **équilibre** (`balance`, où est son centre de masse devant la main : la branche, un
  gourdin lourd du bout, 0,6 ; l'épée, près de la garde, 0,25) et une **efficacité** (`efficiency`, la part de l'énergie qui fait
  des dégâts : les rameaux de la branche amortissent, 0,4 ; le fil de l'épée concentre le coup, 1). Le tableau des deux armes est
  dans leurs fiches ([branche](objets/branch.md), [épée de bois](objets/wooden-sword.md)) : l'épée fait environ 1,5 fois les dégâts
  par seconde de la branche, pour moins d'endurance.
- **Tout se calcule** (`src/world/strike.ts`, sans Phaser ; les règles dans `src/content/combat.json`) :
  - la **portée** : le bras (50 cm) plus l'arme devant la main : 165 cm pour la branche, 134 cm pour l'épée ;
  - la **zone de coup**, au sol, depuis les pieds vers où regarde Xéros, de la longueur de la portée : un secteur de 120° pour la
    taille, une bande de 30 cm pour le coup d'en haut ; une cible est touchée si son emprise au sol (`dims`) y entre ;
  - le **temps** : chaque attaque dit combien durent l'armé, le coup et la récupération ; une arme lourde et longue (son moment
    d'inertie autour de la main, m L² × 2/3 × l'équilibre) les allonge : un coup de branche dure 1,2 s, un coup d'épée 0,6 s ;
  - la **précision** : 1 / (1 + I / `controlRef`) : 0,18 pour la branche, 0,76 pour l'épée (calculée, montrée, pas encore jouée :
    elle servira aux coups visés et à la parade) ;
  - les **dégâts** : l'énergie de l'arme au coup (½ I ω², la vitesse venant de l'angle que parcourt la pointe pendant le coup) ×
    un facteur × l'efficacité de l'arme : 8,2 à la taille avec la branche, 5,9 avec l'épée ; le coup d'en haut frappe plus fort et
    coûte plus ;
  - le **prix en endurance** : `attackBase` + `attackPerKg` × la masse de l'arme (stamina.json), × le prix de l'attaque : 1,3 point
    pour la branche, 0,6 pour l'épée (décidé le 2 novembre 2026 : il se paiera au joule, comme le travail ; en cours, *Le travail*
    § 10). **Un coup dans le vide coûte aussi** (choix de Grégoire : c'est le geste qui fatigue) ; épuisé,
    rien ne part.
- **Une attaque est des données** (combat.json, `attacks`) : son geste, ses trois temps, la fenêtre d'enchaînement, l'angle que
  parcourt la pointe, sa puissance, son prix, sa zone. **Une famille** (`families`, la seule aujourd'hui : `swing`, ce qu'on balance)
  a des **postures**, chacune avec ce que tiennent les mains (`when` : l'autre main vide, une arme, n'importe quoi ; l'arme à deux
  mains) et sa suite d'attaques ; la première posture qui convient sert. Aujourd'hui une seule posture, qui convient à tout : **tenir
  une ou deux branches ne change rien**.
- **Espace avec une arme en main attaque, toujours** : la main active, ou l'autre si l'active est vide (comme un outil) ; le geste
  complet (armer, frapper, revenir) se joue et se paie dans le vide comme sur une cible : on s'entraîne dans le vide, le mannequin
  sert à voir les dégâts et les réactions. Un deuxième Espace pendant le geste, ou juste après, **enchaîne** l'attaque
  suivante de la posture (la taille, puis le coup d'en haut, puis de nouveau la taille). C'est la seule commande changée ; la branche
  active et la hachette dans l'autre main taillent toujours, comme avant.
- **Une cible** : `target` d'un objet de props.json : ses points de vie (le mannequin : infinis), sa matière (ce qui vole : `fx-straw`,
  des brins de paille), de combien elle penche. Touchée, elle tremble, recule d'un pixel et penche autour de son pied du côté opposé
  à Xéros, puis revient ; sa matière vole. Des points de vie finis attendent que la partie garde les blessures (validate.ts les
  refuse en attendant).
- **Avec `?debug`** : les dégâts chiffrés au-dessus de la cible et la zone de coup dessinée au sol, un instant.
- **Le mannequin** : un poteau planté (une perche de 2 m), une botte de chaume liée dessus avec un lien ; la transformation
  `raise-training-dummy` (à venir), et il se pose en mode construction. L'épée de bois : taillée dans une planche fendue par le
  menuisier, `carve-wooden-sword` (à venir).
- **Vérifier** : `npm run test:combat` (le mannequin frappé à la branche puis à l'épée dans les quatre directions ; à 28 px la branche
  touche et l'épée manque ; dégâts et prix du calcul ; l'enchaînement ; le coup dans le vide ; épuisé ; une ou deux branches ; la
  hachette qui taille) ; `.art-preview/combat.png` (Xéros armé, au coup et au retour de chaque geste avec chaque arme, dans les quatre
  directions, puis chaque arme dans ses huit angles).

### Deuxième passe : les gestes de combat et la zone de coup (1er novembre 2026)

Grégoire : « On n'a pas l'impression qu'il manie l'épée. » Les gestes des outils (la cognée à deux mains jointes) sont remplacés, pour
le combat, par de vrais gestes d'une main, essayés d'abord hors du jeu (`tools/essai-gestes.ts`, `.art-preview/essai-gestes.png` et
`essai-gestes.html`, l'aperçu animé à vitesse réelle), corrigés, puis intégrés. Ce qui précède sur la zone au sol et les trois temps
des attaques est remplacé par ceci.

- **Les gestes de combat** (`art/characters/xeros-combat.ts`, animations de la planche `xeros`) : la **taille** (garde, armer, deux
  images de frappe avec une traînée claire en arc, suite, retour : l'épée passe au-dessus de la tête et s'abat devant), le **coup
  vertical** (au-dessus de la tête, abattu devant, traînée droite, tenue pointe basse, retour), les **directs** du poing droit et du
  gauche (garde poings levés, armer court, le bras tendu et un petit éclat, retour). Les quatre directions ont chacune leurs poses
  (vers la gauche, l'épée reste dans la main droite, au fond : pas un miroir). Les poses sont des données (`COMBAT_POSES` : par image,
  sa durée, les mains, les épaules, l'angle de l'arme, la traînée, l'éclat, les images de frappe), que `build-art` écrit dans
  `src/generated/combatPoses.ts` : **la seule source** des durées (la taille dure 530 ms garde comprise à l'épée) et de la place de
  ce qui frappe. Une arme lourde les allonge (son inertie, au-delà de `inertiaRef`) : la branche met 1,2 s ; l'épée et le poing
  gardent la durée de leurs poses.
- **La main nue est une arme en données** (`unarmed` de combat.json : le bras de 60 cm, 2 kg qui frappent, famille `fists`). Espace,
  la main active vide et l'autre sans arme ni outil (rien, une pierre…), frappe du poing de la main libre ; un deuxième Espace enchaîne
  le direct de l'autre poing (gauche-droite) si les deux mains sont libres. Postures de la famille `fists` : selon les mains libres
  (`when.free`).
- **La zone de coup suit ce qui frappe** (`world/strike.ts`) : à chaque image de frappe, la lame est le segment dessiné, de la main à
  la pointe (le poing : de l'épaule au poing), à l'endroit exact où l'arme est dessinée ; entre l'image d'avant et celle-ci, la surface
  balayée compte (des lames intermédiaires, tous les pixels). Une cible est touchée si ce balayage recoupe **sa silhouette dessinée**
  (les pixels opaques de son image, le corps entier) et qu'elle est devant Xéros, à portée ; **une seule fois par coup**, même si les
  deux images de frappe la traversent. On ne touche jamais sans toucher : `test:combat` vérifie qu'au bord calculé le coup porte et que
  2 px plus loin il ne porte pas, dans les quatre directions.
- **La précision joue** : à chaque coup, un écart tiré au hasard dans un disque de `missPx` × (1 − précision)² déplace toute la lame
  (et l'arme dessinée pendant la frappe, pour qu'on le voie) : moins de 2 px pour l'épée, jusqu'à 13 px pour la branche. Au bord de sa
  portée, la branche touche le mannequin 70 % du temps, l'épée 100 % (1 000 coups simulés).
- **La vitesse et les dégâts viennent des poses** : la vitesse est le chemin de la pointe (du poing) pendant les images de frappe, sur
  leur durée ; les dégâts, l'énergie de la masse qui frappe (½ m v², m = 2/3 × équilibre × masse) × `damagePerJoule` × l'efficacité de
  l'arme × la puissance de l'attaque. Le tableau des armes est dans leurs fiches ([branche](objets/branch.md),
  [épée de bois](objets/wooden-sword.md)) : la branche 8,5 par coup en 1,2 s, l'épée 6 en 0,53 s (1,6 fois les dégâts par seconde, pour
  moins d'endurance), le poing 1,6 en 0,34 s (la durée de ses poses : seul ce qui dépasse 0,4 kg·m² d'inertie ralentit,
  la branche).
- **Le ressenti** (`feel` de combat.json, tout réglable) : un arrêt sur image de 50 ms à l'impact (le geste se fige), puis la cible
  recule et penche, sa matière vole ; l'écran tremble à partir de 8 de dégâts.
- **Avec `?debug`** : à chaque image de frappe, la lame (blanche), le balayage depuis l'image d'avant (pâle), la silhouette touchée
  (cadre rouge) et le chiffre des dégâts.

### Troisième passe : la zone de coup au sol (1er novembre 2026)

Grégoire, en jeu, avec ?debug : les coups touchaient surtout autour de la tête, pas devant Xéros, et la fin du mouvement ne comptait
pas. La cause : la zone suivait la lame dessinée, et l'écran mêle profondeur et hauteur (y − z, règle D) ; une lame levée au-dessus de
la tête est dessinée là où serait ce qui est devant Xéros vers le nord. Diagnostic par une **carte de touche** (`npm run art:touche`,
`.art-preview/carte-touche.png` : vue du dessus, Xéros au centre, cases de 10 cm sur ± 2 m, une couleur par image active ; la carte
d'avant la correction est gardée dans `carte-touche-avant.png`). Ce qui précède sur la lame dessinée et la silhouette est remplacé par
ceci.

- **La zone de coup se calcule dans le monde, au sol** (`sweeps` de combat.json, `world/strike.ts`) ; la lame dessinée ne sert plus
  qu'à l'image. Pour chaque geste : `hand`, la main tendue (la portée = `hand` + l'arme devant la main) ; `width`, la largeur de ce qui
  frappe ; par image, l'angle de l'arme par rapport au regard de Xéros (+ sa droite, − sa gauche), la part de la portée atteinte et la
  hauteur de la pointe ; `active`, les images où l'arme a de l'élan : la frappe et le début de la suite (jamais la garde, l'armer, le
  retour). La taille balaie un arc devant lui, de sa droite (75°) à sa gauche (−70°) ; le coup vertical, une bande de 30 cm droit
  devant ; le direct, un court trait à la longueur du bras. La zone d'une image active est ce que balaie l'arme depuis l'image d'avant ;
  une cible y est touchée si son emprise au sol y entre, quelle que soit sa hauteur, et jamais derrière Xéros ni à côté de lui (à plus
  de 80° de son regard) : au-dessus de lui à l'écran n'est pas devant lui dans le monde.
- **La précision** tire à chaque coup un écart (même formule), en travers (il tourne la zone) et en long (il allonge ou raccourcit la
  portée) ; l'arme dessinée en est décalée d'autant. Au bord de leur portée : branche 58 %, épée 100 %.
- **La vitesse** est celle de la pointe dans l'espace (au sol et en hauteur : un coup d'en haut tombe), à l'image active la plus
  rapide ; les dégâts en suivent (le coup d'en haut, plus lent, a une puissance de 1,7).
- **Le mannequin annonce ses dégâts** : à chaque coup reçu, le chiffre s'envole au-dessus de lui et s'efface, sans ?debug ; un coup
  que l'écart seul a fait manquer affiche « raté ». Avec ?debug, la zone de chaque image active est dessinée au sol, en rouge.

**Ce qui vient ensuite** (rien de fait) :
- **Les postures** : deux mains (une arme longue, plus lente et plus forte), le **bouclier** dans l'autre main (parer, une posture
  `when.other: shield` et une matière de plus), **deux armes** (une attaque de chaque main) : de nouvelles entrées de `stances`, sans
  toucher au moteur ; le corps aura ses gestes à une main.
- **Les attaques spéciales**, débloquées par **les idées de la nuit** (Xéros qui rêve d'un coup et le sait au réveil) : un champ de
  l'attaque qui la tient fermée tant que l'idée n'est pas venue.
- **Les lapins** : les premières cibles qui bougent et meurent ; leurs points de vie finis, gardés par la partie (GameState).
- **La vie de Xéros** : une jauge à côté de l'endurance, ce qui le blesse, se soigner, dormir.
- Les commandes à trancher : voir [docs/COMMANDES.md](COMMANDES.md), « À trancher ».

## Fendre (décidé le 30 octobre 2026)

Repris par *Le travail* (1er novembre 2026) : fendre est un travail au coup, lancé d'un appui. Les « 3 coups par mètre » sont devenus
**3 étapes par mètre commencé** (`splitHits`, `split.hits` de wood.json : la fente qui s'allonge, le coin qui s'enfonce) ; le nombre de
coups découle de la matière (la fente, diamètre × longueur, `split` de work.json) et de la force : une bille de 55 cm sur 1 m s'ouvre
en une trentaine de coups de masse pour Xéros (1 min 30). Chaque coup se paie au joule ; planter le coin reste un geste sans matière,
au prix fixe de `plant` (1 point). Les prix par coup ci-dessous (0,8 le coup de masse, 10,2 points la bille en quatre) sont ceux d'alors.

Repris le 30 octobre 2026 (« tas ») : **toute longueur se fend**, toujours avec un seul coin planté dans le bout. Il faut **3 coups de
masse par mètre**, arrondis au mètre au-dessus (3 pour 1 m, 6 pour 2 m, 9 pour 2,4 m) ; « Trop longue pour un seul coin. »
disparaît. À chaque coup, la fente s'allonge sur les morceaux du milieu, du bout du coin jusqu'à l'autre bout, et **le coin
s'enfonce** un peu (trois profondeurs dessinées : il sort de 3, 2, puis 1 px du bout) ; au dernier coup, le bois s'ouvre. Pourquoi un
seul coin : c'est le bois de bout qui s'ouvre le long des fibres, et la fente court d'elle-même sur la longueur à force de coups ; il
faut seulement plus de coups pour une pièce plus longue. **Le quartier** : repris par *Les pièces fendues* (31 octobre 2026) : il
repose écorce en bas, pointe (l'angle du cœur) en l'air, et sort du fendage ainsi, les deux d'une demi-bille identiques, côte à côte ;
R le tourne d'est-ouest en nord-sud sans rien changer d'autre. (Le même jour, plus tôt : les deux quartiers naissaient faces debout
opposées, puis identiques, couchés sur une face fendue, l'autre debout d'un côté, `face` ; cette position est abandonnée.)

Repris par *Le bois* (30 octobre 2026) : la bille, la demi-bille et le quartier sont des formes de la pièce de bois du gros, le coin planté un de ses réglages (son bout et ses coups) ; à 1 m, 107 kg la demi-bille, 53,5 kg le quartier.

Une grosse bille pèse 203 kg : on ne la soulève pas. Alors on la fend **là où elle est couchée**, comme en vrai : un coin de fer planté dans le fil, des coups de masse dessus, et le bois s'ouvre. En deux, puis chaque moitié en deux : quatre quartiers d'environ 51 kg qui, eux, se portent.

- **Pourquoi sur place.** Il n'y a rien à soulever ni à rouler : la bille est trop lourde pour l'un comme pour l'autre dans l'état actuel de Xéros, et elle reste où elle est. Le geste ne demande que de la place autour (les morceaux sont plus larges que la bille couchée, voir plus bas). On ne cherche pas le billot : il servira plus tard à refendre un quartier en bûches, debout.
- **Deux outils**, trouvés dans la réserve de la maison, à côté du rouleau de corde. **La masse de bûcheron** : tête de fer de 15 × 8 × 8 cm, manche de 80 cm, 4 kg, deux mains. **Le coin de fendage** : fer de 20 × 7 × 4 cm, 2 kg, une main ; il n'y en a qu'un dans le jeu pour l'instant, ce qui oblige à finir une fente avant d'en commencer une autre.
- **Pourquoi dans le bout** (corrigé le 30 octobre 2026). Le coin ne se plante pas dans l'écorce, mais dans le **bois de bout**, la face coupée où l'on voit les cernes, comme on fendait les longues pièces couchées. Planté sur le flanc, le coup pousserait la bille de côté et l'écorce l'amortirait ; planté dans le bout, le coup pousse dans le sens de la longueur, la bille ne roule pas, et le bois s'ouvre le long de ses fibres. La bille reste couchée.
- **Planter** : Xéros se place à un bout de la bille, face à la coupe : à l'est ou à l'ouest d'une bille est-ouest, au nord ou au sud d'une bille nord-sud. Le coin en main, Espace : il se plante au milieu de la face coupée du bout où se tient Xéros, la pointe dans le sens de la fente, d'un coup, sans geste ; il y reste, visible, et la main est libre. **Le bout choisi est gardé avec la pièce** (c'est son type : `big-wedged-log` depuis l'ouest, `-east` depuis l'est, `big-wedged-log-ns` depuis le sud, `-ns-north` depuis le nord, et de même pour la demi-bille) : la fente part de ce bout, et les coups ne se donnent que depuis lui. Depuis l'est ou le nord, la face coupée est cachée à l'écran : on voit la tête du coin dépasser au bord de la bille et la fente courir sur le dessus. Depuis le flanc, rien ne se plante : « Le coin se plante dans le bout, là où on voit les cernes. » **Frapper** : la masse en main, depuis ce même bout, Espace : un coup de masse (geste vertical à deux mains, nouvelle pose de Xéros, comme la hache sur une encoche mais plus lourd). La fente part de la face coupée et s'allonge sur la longueur à chaque coup, jusqu'à l'autre bout. Une demi-bille se fend de la même façon : le coin dans le bout, au milieu de la face plate. **Trois coups par fente** (chiffre du contenu : `hits` du `harvest`) : le coin s'enfonce, la fente dessinée s'allonge à chaque coup, et le troisième ouvre le bois un instant avant que les morceaux paraissent. Les coups sont gardés dans la partie : quitter la carte entre deux coups ne perd pas la fente.
- **Au dernier coup**, la bille devient **deux demi-billes** couchées côte à côte, à la place exacte de la bille (centrées sur elle), face plate vers le haut ; le coin tombe au sol à côté, à ramasser. Une demi-bille (environ 101 kg) ne se porte pas et ne roule pas, la face plate l'en empêche. On la fend de la même façon (coin, trois coups) : **deux quartiers** (environ 51 kg), qui se portent à deux mains, lentement (au-dessus de 25 kg : pas de course, endurance par kg de trop).
- **Les messages.** Masse sans coin : « Il faut d'abord un coin. » Hache sur une grosse bille, une demi-bille ou un coin planté : « Trop grosse pour la hache. Il faut le coin et la masse. » Sans la place d'ouvrir le bois au dernier coup : « Pas la place pour la fendre. » (rien n'est joué, rien n'est payé). Les billes de l'arbre normal ne se fendent pas : ce sont des rondins de la grosseur d'un bras, la hache les tronçonne déjà.
- **Endurance.** Planter le coin coûte 1 point, un coup de masse 0,8 point. Une grosse bille fendue en quatre (un coin planté sur la bille, deux sur les moitiés, soit trois fois, et neuf coups de masse) coûte 10,2 points, un dixième de la jauge du jour (`stamina.json`).
- **Les morceaux débordent de la bille** : deux demi-billes à plat sont plus larges qu'une bille couchée. Si Xéros se tient là, les demi-billes le repoussent ; si un obstacle gêne leur place, la fente ne s'ouvre pas.
- **Les tas de quartiers.** Un quartier s'empile avec le système des tas, en est-ouest ou nord-sud, R tournant le quartier en main comme une bille ; le genre ne se mélange pas avec les billes. Repris par *Les tas* (30 octobre 2026 : tas calculés) et *Les pièces fendues* (31 octobre 2026 : rangées de triangles).
- **Ce qui viendra** : fendre debout, sur le billot, ce qui se dresse : d'abord le quartier (refendu en bûches) ; la grosse bille elle-même ne se fendra debout que lorsque Xéros sera assez fort pour la redresser (203 kg aujourd'hui) ; refendre un quartier en bûches sur le billot, debout (la hache, ou le coin et la masse) ; les bardeaux du toit des bâtiments, qui se fendent dans une bille de chêne comme ici (même `harvest`, autres `becomes`) ; retirer un coin planté sans frapper ; un deuxième coin, ou un coin qu'on forge.

## Bois d'œuvre (décidé le 30 octobre 2026, « équarrissage »)

Repris le 30 octobre 2026 par *Le bois* (une seule pièce de bois, la grille de 20 cm, les poteaux bas à 1,80 m) : ce qui suit
garde la décision de l'équarrissage, les nombres à jour sont là-bas. Repris ensuite par *L'équarrissage par passes* et *Le travail*
(1er novembre 2026) : couper, ébrancher et équarrir sont des travaux au coup, payés au joule ; les « 3 coups » et les prix par coup
ci-dessous (0,8 point le coup de cognée, 12 points le poteau) sont ceux d'alors. Les poteaux de l'abri (2 de 3 m au nord, 2 de 1,80 m au sud,
section de 20 × 20 cm) viennent de l'arbre normal. Au Moyen Âge, les
charpentes se faisaient avec des arbres jeunes de 25 à 35 cm, équarris à la hache, pas sciés, mis en œuvre verts : c'est ce que
fait Xéros. Le gros arbre ne change pas : il reste le bois de chauffage (billes, fendage).

- **Un tronc qu'on coupe où l'on veut.** L'arbre normal couché est un seul objet, tronc et houppier (`normal-felled-tree`) ; le
  houppier coupé (3 coups de cognée, des branches), le tronc ébranché devient **une seule pièce ronde de 5,8 m** (sa longueur utile :
  la partie du tronc qui garde ses 30 cm, avant que la cime s'amincisse), à la place exacte du tronc. 5,8 m donnent un poteau de
  3 m, un de 1,80 m et une bille de 1 m, sans chute.
- **Le rondin** est une pièce de bois (voir *Le bois*) : sa longueur est gardée par la partie, sa masse calculée (63,6 kg le
  mètre) : porté jusqu'à 70 kg (1 m sur la grille), roulé jusqu'à 300 kg (4,6 m), sinon il ne bouge pas (le tronc entier, 369 kg).
- **Couper à la longueur.** La cognée en main, contre le flanc, Espace : l'encoche se fait sur la grille de 20 cm, mesurée depuis le
  bout le plus proche de Xéros, jamais un morceau de moins de 60 cm ; la coupe visée s'affiche avec les deux longueurs (« 3 m |
  2,8 m »). Trois coups (un tiers, deux tiers, coupé), et deux pièces. Une seule coupe à la fois ; une pièce entaillée ne roule
  pas, ne se porte pas, ne pivote pas avant la fin de la coupe.
- **Rouler jusqu'au chantier.** Le rondin de 3 m (191 kg) se roule, lentement ; l'écorce tourne avec la distance, à toute longueur.
- **Équarrir sur place, à la doloire** (`broadaxe`, hache à équarrir : lame large et plate de 25 cm, manche coudé de 60 cm, 3 kg,
  deux mains, dans la réserve de la maison ; fiche `docs/objets/broadaxe.md`). Repris le 1er novembre 2026 par *L'équarrissage par
  passes* (une passe le long du rondin par face, au lieu de coups sur place) ; à l'origine : contre le flanc d'un rondin couché,
  Espace : un coup (le geste `chop`) ; 3 coups dressent une face, 4 faces font la poutre (la pièce de bois équarrie, fiche
  `docs/objets/wood-piece.md`) : 20 × 20 cm de bois, sa longueur, 108 kg pour 3 m, 64,8 kg pour 1,80 m. Le dessin change à chaque face finie : rond, une face,
  deux, trois, poutre. Une face dressée, le rondin ne roule plus ; la poutre non plus (« Elle ne roule pas : elle est carrée. »).
  On ne coupe plus un rondin entamé à la doloire : on coupe d'abord, on équarrit ensuite. Refusé sur une grosse bille (« Trop
  grosse pour une poutre. ») ou un rondin de moins de 20 cm de bois. Endurance : **12 points** pour un poteau de 3 m, 7,2 pour
  1,80 m (gardé par les passes : 1 point par mètre de face) ; la coupe : 0,8 point par coup de cognée.
- **Pourquoi au pied du chantier.** Une poutre de 3 m pèse 108 kg : elle ne se porte pas et ne roule pas. Le rondin, lui, roule :
  on le roule jusqu'au chantier et on l'équarrit là où il servira. Celle de 1,80 m (65 kg) se porte, lentement.
- **Sauvegarde** : `SAVE_VERSION` 6 ; une partie de la version 5 est convertie (les sections, le houppier, la tête et les billes
  numérotées de l'arbre normal deviennent des rondins de 95 cm à la même place).
- **Outils de test** (`?dieu`) : poser une pièce de bois de réglages choisis (voir *Le bois*) ; donner la doloire.
- **Ce qui viendra** : la pose des poteaux sur les dés, avec l'aide de la mère (une poutre de 108 kg ne se dresse pas seul) ; les
  sablières et les chevrons, tirés de la même façon ; une scie, plus tard, qui raccourcira les étapes.

## L'équarrissage par passes (décidé le 1er novembre 2026, « doloire en passe »)

Repris par *Le travail* (1er novembre 2026, même jour) : la passe est un travail au coup. Chaque coup lève ce que permet son énergie
(`hew` de work.json, la doloire et la force de Xéros) et la face avance d'autant, non plus de `hew.stroke` cm ; chaque coup se paie au
joule (`work` de stamina.json), non plus `hewPerM` par mètre ; **un pas ou Échap** arrête la passe après le coup en cours. Une face de
3 m demande à Xéros bien plus de 9 s (la poutre de 3 m entière, environ 7 h 30 de coups et de pauses, *Le travail* § 5), et bien
plus de 12 points (138 points du plafond : deux jours). Ce qui suit garde la décision d'alors : les chiffres « Échap, seule commande »,
« 15 cm par coup », « 9 s », « 12 points » sont remplacés.

Équarrir par douze coups sur place ne ressemblait pas au métier. En vrai, le charpentier avance le long du rondin en donnant des
coups courts vers le bas, sur le flanc, et la face se dresse derrière lui à mesure qu'il avance. Xéros fait de même.

- **Une passe par face.** La doloire en main, Xéros se met contre le flanc du rondin couché, à un bout (au plus 40 cm du bout,
  `HEW_PASS.reach` de config.ts) ; ailleurs : « Mets-toi à un bout de la pièce pour commencer la face. ». Espace lance la passe :
  il longe le rondin tout seul, sur un rail, au pas, en frappant en rythme (le geste `chop` de la doloire), des copeaux tombent à
  chaque coup, et la face devient claire et plate derrière lui, au fil de sa position (dressée jusqu'au fer, ronde au-delà).
- **Échap, seule commande pendant la passe.** Elle l'arrête là où il est (« Arrêté : la face reprendra là. ») : la partie déjà
  dressée le reste, la pièce garde la longueur dressée de sa face en cours (`dressed` de la pièce de bois : le bout d'où elle part,
  sa longueur en cm), et une nouvelle passe reprend là, dans le même sens (ailleurs : « Reprends la face là où tu l'as laissée. »).
  Une face entamée, le rondin ne roule plus (« Il ne roule plus : une face est entamée. »), ne va pas en tas, ne se coupe ni ne se
  fend ; il se porte, s'il n'est pas trop lourd, et garde sa face entamée.
- **Quatre passes**, une par face, dans l'ordre déjà choisi : le dessus, puis le sud, le nord et le dessous. Au bout d'une passe, la
  face est finie (« Une face dressée (1 sur 4). »), et le rondin est retourné d'un quart de tour sur son axe, par une courte
  animation automatique (il se soulève, la face suivante vient en haut, il retombe en s'écrasant un peu : `HEW_PASS.hop`,
  `turnMs`). Xéros est alors à l'autre bout : la passe suivante part de là, au retour. La quatrième donne la poutre (« Poutre
  équarrie : 3 m. »).
- **Durée et endurance proportionnelles à la longueur**, règles du contenu : Xéros avance de `hew.stroke` cm (15) à chaque coup
  (wood.json ; un coup dure le geste `chop`, 0,44 s : une face de 3 m prend 9 s environ) ; chaque coup paie ce qu'il vient de
  dresser, `hewPerM` (stamina.json) par mètre de face : 1 point, soit toujours **12 points** pour un poteau de 3 m (12 % de la
  jauge), 7,2 pour 1,80 m. À zéro, la passe s'arrête après le coup refusé (« Xéros est épuisé. Il faut dormir. »), la face entamée
  gardée.
- **Le rail** (`src/systems/rail.ts`) est un mécanisme général : une ligne droite pour les pieds de Xéros, un geste répété avec un
  outil, un pas par geste, ce que fait chaque coup, la fin (au bout, Échap, coup refusé). Le travail lui est donné par celui qui le
  lance (ici la doloire, `hewPass` de `systems/wood.ts`, qui juge aussi qu'il y a la place de longer la pièce : « Pas la place de
  longer la pièce. ») ; le rabot et la scie de long s'en serviront.
- **La face entamée se calcule** comme le reste (*Les pièces fendues*) : la pièce s'assemble avec les parties de son aspect, puis,
  sur la bande déjà dressée (du bout `from` jusqu'à `length` cm de lui), on l'efface et on pose les parties de l'aspect suivant
  (rond -> une face -> deux -> trois -> poutre), elles aussi calculées depuis leur section (`dressedBand`, `composeOps` de
  `woodShape.ts`). Les aspects ronds et dressés d'un diamètre ont donc la même géométrie à l'écran (validate.ts le vérifie).
- **Dans GameState**, `hewn` compte toujours les faces finies par trois (`perFace`, l'unité des anciens coups, que gardent les plans
  et les parties) ; `dressed` est la face en cours. Sauvegarde 16 : les coups d'une face commencée à l'ancienne deviennent cette part
  de la longueur, dressée depuis le bout ouest ou nord.
- **Vérification** : `npm run test:equarrissage` (refus au milieu, passe lancée au bout, sourde aux autres touches, arrêtée par
  Échap à la position du fer, reprise, quatre passes, 12 points pour 3 m) ; aperçu `.art-preview/equarrissage.png` (Xéros à trois
  moments de la passe, la première face depuis l'ouest et la deuxième au retour depuis l'est).

## Le bois (décidé le 30 octobre 2026, « pièce de bois »)

La coupe libre de l'arbre normal plaisait, mais en jouant elle posait trois problèmes : des erreurs de quelques centimètres, des
bouts inutiles de 30 cm, et des dessins et des tas pour chaque longueur. Et le bois était une collection de clés séparées (billes
numérotées, bille coin planté depuis chaque bout, nord-sud, demi-billes, quartiers, rondins, poutres) qui aurait explosé avec des
longueurs libres et le fendage. On garde la coupe libre et on change la façon de décrire le bois.

- **Une seule pièce de bois** (`wood-piece`, fiche `docs/objets/wood-piece.md`). Elle est décrite par des réglages, pas par une clé :
  son **diamètre** (celui de l'arbre d'origine : gros 55 cm, normal 30 cm), sa **longueur** en cm, sa **forme** (ronde, demi, quart),
  ses **faces dressées** à la doloire (0 à 4 ; 4 : la poutre), son **sens** (est-ouest, nord-sud), et s'il y en a, son **encoche** en
  cours (place, coups) et son **coin planté** (bout, coups). GameState garde ces réglages pour chaque pièce posée ou tenue ; Tiled
  peut les donner en propriétés.
- **Les règles sont du contenu** (`src/content/wood.json`) ; depuis *Le travail*, les « coups » ci-dessous sont des étapes, le nombre de
  coups découlant de la matière et de la force : la densité (900 kg/m³), la grille, la plus courte pièce, la coupe (la
  cognée, 3 coups), l'équarrissage (la doloire, une passe par face, un coup tous les 15 cm, 4 faces, poutre de 20 cm), le fendage (le coin, la masse, 3 coups
  par mètre commencé, un seul coin dans le bout, à toute longueur), et par diamètre ce qu'on a le droit de faire : **seul le gros se fend** (la bille en
  deux demi-billes, la demi-bille en deux quartiers) ; **on n'équarrit qu'une pièce ronde**, et seulement le normal (« Trop grosse
  pour une poutre. ») ; une demi ou un quart ne s'équarrit pas ; on coupe avant de fendre et avant d'équarrir.
- **La masse se calcule** à partir des réglages (section × longueur × densité ; la demi, la moitié ; le quart, le quart ; une face
  dressée retire un quart de l'écart au carré de la poutre), et en découlent porter, rouler, pivoter : bille du gros de 1 m 214 kg,
  demi-bille 107 kg, quartier 53,5 kg, rondin de 1 m 63,6 kg, de 3 m 191 kg, poutre de 3 m 108 kg, de 1,80 m 64,8 kg.
- **Les dessins se font une fois par diamètre et par aspect** (rond, demi, quart, une à trois faces, poutre) : bout, milieu,
  bout, en est-ouest et nord-sud, et la longueur s'assemble ; l'encoche, le coin planté (une partie de bout pour chaque bout), la fente
  (qui court sur les morceaux du milieu, rognée à la part fendue) et le bois ouvert du dernier coup s'assemblent de même, comme le
  roulement (4 images) et la rotation. Portée, la pièce se tient dans le sens de la marche : de face et de dos, vue par le bout
  (une vue qui ne dépend pas de la longueur, la plus lisible) ; de profil, assemblée à sa longueur. Contrat :
  `src/world/woodShape.ts` ; dessins : `art/world/wood-pieces.ts`.
- **La grille de 20 cm.** La coupe à la cognée s'aimante tous les 20 cm, mesurés depuis le bout le plus proche de Xéros : la perche
  marquée du charpentier. **20 et pas 25** : 20 cm, c'est 4 px pile (5 cm par pixel), 8 graduations par case de 1,60 m ; 25 cm
  tomberait entre deux pixels. La ligne au-dessus de la coupe visée donne les deux longueurs (« 3 m | 2,6 m »).
- **Aucune pièce de moins de 60 cm.** Une coupe qui laisserait un bout plus court est refusée (« Le bout serait trop court. ») :
  plus de bouts inutiles. Les billes de chauffage passent de 95 cm à **1 m**.
- **Les trois arbres dans le même système.** Gros grand, têtard et normal se comportent pareil : abattu, couché d'un seul tenant,
  puis le houppier coupé, le tronc ébranché devient une seule pièce ronde de sa **longueur utile** (le gros grand 4 m, 855 kg ; le
  têtard 2 m, 428 kg ; le normal 5,8 m, 369 kg), qui se coupe où l'on veut sur la grille. Le têtard a le diamètre du gros : ses
  pièces sont des pièces « gros », sans rien de particulier. Un tronc entier ne bouge pas : c'est le calcul qui le dit (le tronc du
  gros pèse 855 kg et non 1,2 t : sa longueur utile s'arrête sous le houppier) ; il roulera plus tard, avec plus de force ou un outil.
- **Les tas** acceptent toute pièce qui se porte, de toute longueur et de tout état (voir *Les tas*, repris le 30 octobre 2026).
- **L'abri suit la grille** : poteaux de 3 m au nord, **1,80 m** au sud (pente de 18,7°, 1,95 m sous la sablière basse).
- **Sauvegarde** : `SAVE_VERSION` 7 ; une partie de la version 6 est convertie : toutes les anciennes clés de bois deviennent des
  pièces de bois équivalentes au même endroit (95 cm deviennent 1 m, les longueurs des rondins sont ramenées sur la grille, les
  coins plantés et leurs coups sont gardés) ; les encoches en cours sont perdues, comme les branches d'un houppier du gros pas encore
  ébranché.
- **Outils de test** (`?dieu`, « Pièce de bois ») : poser ou donner une pièce en choisissant le diamètre, la longueur (sur la grille,
  de 60 cm à 7 m), l'état (rond, demi, quart, une à trois faces, poutre) et le sens.
- **Nouveau bois = un diamètre ou un aspect dans le contenu** (wood.json, et ses dessins), **pas une nouvelle clé**.
- **Ce qui vient** : refendre le quartier en bûches
  sur le billot ; rouler un tronc entier avec plus de force ou un outil ; la scie.

## Les pièces fendues (décidé le 31 octobre 2026, « avant l'âge du bois »)

Grégoire a regardé les tas en jeu et dans piles.png : « Les tas de quarts sont catastrophiques, ça n'a aucun sens. » Deux causes. Le
**recouvrement** : quand des pièces se touchent dans la profondeur, celle de devant doit cacher le flanc de celle de derrière ; or
chaque pièce était dessinée entière, si bien qu'on voyait le flanc foncé (l'écorce) de chacune, une alternance de bandes claires et
foncées. La **forme** : chaque vue de chaque pièce avait été dessinée à la main, à part, sans forme commune ; personne ne savait plus
quel côté était en bas, surtout pour le quartier.

- **Les positions** (Grégoire). La demi-bille repose écorce en bas, face plate claire en l'air, au sol comme en tas. Le quartier
  repose écorce en bas, pointe (l'angle du cœur) en l'air, juste après la coupe et posé seul. En tas, les quartiers alternent pointe
  en haut et pointe en bas et s'emboîtent comme des triangles dans une rangée, à un demi-pas (proposition à faire juger par Grégoire
  sur piles.png). Le quartier n'a plus de côté de face debout (`face` disparaît, sauvegarde 15) ; `point: 'down'` ne sert qu'en tas.
- **La section, dans le contenu.** Chaque état de la pièce de bois est décrit par sa section, vue par le bout (wood.json, `section`
  de chaque aspect) : rond (bille, rondin, perche), demi-rond (demi-bille), quart de rond (quartier), rectangle (planche), et le rond
  aux faces dressées jusqu'au carré (rondin à 1, 2, 3 faces, poutre : la doloire dresse le dessus, le sud, le nord, puis le
  dessous) ; où est l'écorce, où est le cœur, sur quelle face la pièce repose.
- **Les vues se calculent** (`art/world/wood-section.ts`) : la section étirée sur la longueur, un rayon par pixel. La vue par le
  bout montre la section elle-même (cernes, cœur, écorce), la vue de côté le dessus et le flanc ; lumière en haut à gauche. Les
  dimensions à l'écran restent celles de la règle D : le calcul les remplit, il ne les change pas. **Le travers remplit la
  collision** : la profondeur d'une pièce à l'écran est celle du pas d'un tas (la collision et un pixel), si bien que la pièce de
  devant cache exactement le flanc de celle de derrière ; la hauteur occupe le reste de l'image. Le bout ouest (est-ouest) et le
  bout sud (nord-sud) montrent la face de coupe, la section écrasée en raccourci ; les deux bouts sont symétriques.
- **Le pixel-artist ne dessine plus les formes** : il règle une fois les couleurs et les textures (`art/world/wood-skin.ts` :
  écorce et ses sillons, fil du bois des faces fendues et dressées, planche, cernes et cœur des bouts). La face fendue de la
  demi-bille garde le rendu que Grégoire aime.
- **Recouvrement partout** : dans un tas et pour des pièces posées côte à côte, ce qui est devant (plus au sud) ou plus haut cache
  ce qui est derrière, au pixel près. Un tas de bois s'affiche couche par couche, de l'arrière vers l'avant (de l'ouest vers l'est
  en nord-sud). Le pas d'un tas reste celui corrigé le même jour (la 4e bille d'un tas de 3 couvre le quart haut de celle du centre).
- **Le fendage suit** : une bille couchée donne deux demi-billes écorce en bas, face en l'air, côte à côte ; une demi-bille deux
  quartiers écorce en bas, pointe en l'air, côte à côte. Deux quartiers sont plus larges que leur demi-bille (78 cm pour 55) : si la
  demi-bille voisine occupe leur place, ils s'écartent ensemble en travers, de part et d'autre, jusqu'à 12 px (`SPLIT` de
  config.ts), sinon « Pas la place pour la fendre. ». Sans cela, deux demi-billes nées côte à côte (107 kg, ni portées ni
  roulées) ne se fendraient jamais.
- **Le quartier** : section de 39 × 27,5 cm de bois (49 × 37,5 contour compris), 20 × 11 px à 1 m est-ouest, 11 × 20 nord-sud ; sa
  collision a 9 px de profondeur (un peu plus que ses 39 cm, pour que la vue reste de dessus et montre ses deux faces fendues : la
  face nord éclairée, la sud dans l'ombre).
- **Contrôle** : `.art-preview/bois-sections.png` (chaque état : sa section par le bout, puis la pièce est-ouest et nord-sud à côté de
  Xéros) ; `.art-preview/piles.png` (pour la bille, la demi-bille, le quartier, la poutre : un tas qui grandit pièce par pièce,
  est-ouest puis nord-sud, et trois pièces posées côte à côte dans la profondeur) ; `npm run test:sections` (le recouvrement, les
  positions après la coupe, la règle D).
- **Encore à la main** : la pièce debout (le poteau, `wood-normal-up`), les encoches de la cognée (bandes dessinées), les vues
  portées par le bout autres que le quartier, et les icônes.

## La perspective (décidé le 30 octobre 2026, « perspective »)

- **Règle D, rotation pure, pour tout ce qui est couché** : une pièce tournée d'un quart de tour garde exactement sa taille ; l'image
  nord-sud a les dimensions de l'image est-ouest inversées, sa collision l'emprise inversée ; un tas nord-sud monte de la même
  hauteur par couche que l'est-ouest. L'est-ouest garde sa taille (cylindre couché : épaisseur Ø × 1,1). Triche assumée, préférée
  à l'œil : une pièce tournée doit rester la même pièce ; la règle stricte la faisait plus courte ou plus fine en nord-sud. Trois
  essais l'ont tranché (docs/STYLE.md section 8). Les objets debout gardent le gabarit, une vue dessinée par côté.
- **Toutes les faces** : chaque objet est créé avec toutes ses vues, vu de ses quatre côtés, selon sa symétrie déclarée (rond : une,
  symétrique : deux, quatre). C'est long, mais c'est ce qui garde chaque objet logique. Les objets d'avant qui n'ont pas toutes
  leurs vues sont listés (`VIEWS_TODO`, validate.ts) : les meubles se feront au chantier de la maison, les objets fixés du monde
  quand on voudra les poser tournés dans Tiled.
- R tourne à la pose tout ce qui a plusieurs vues (un quart de tour dans le sens des aiguilles d'une montre) : la pièce de bois, le
  fagot, la branche, le piquet, le lien, les outils.

## Les matières (décidé le 31 octobre 2026, chantier « briques »)

On arrête de bâtir l'abri pas à pas : la construction marche. Le but devient de **composer les maisons du village**, en commençant
par refaire la chaumière de Xéros (longère paysanne : solin de pierre, ossature en colombages, remplissage en clayonnage et
torchis, toit de chaume, porte et volets en planches, cheminée). Il faut d'abord les briques : les matières et les pièces de base,
de la plus naturelle à la plus travaillée, chacune servant de base à la suivante (fiches : `docs/objets/README.md`).

- **Le naturel est irrégulier, le travaillé est régulier à la mesure du travail.** Une matière naturelle (pierre brute, pierre plate,
  motte de terre) a une ou deux formes dessinées (`<image>` et `<image>-b`) et une taille qui varie un peu autour de sa taille type
  (± 7 %, `natural` de props.json ou items.json), tirées à l'apparition et gardées par la partie (`natural` de GameState ; un objet
  de Tiled tire les siennes de son identifiant, toujours les mêmes). Sa masse suit le cube de sa taille ; son image ne change pas
  (moins d'un pixel). Pas de pierre naturelle lisse. Un tas range des pièces semblables : une pierre reprise d'un tas a la forme
  dessinée à sa place et la taille type. Ce qui est travaillé (moellon, pierre de taille, torchis, botte, baguette, bardeau,
  cheville, planche) n'a qu'une forme et ses mesures, sur la grille de 20 cm pour les pièces taillées.
- **Les masses viennent de la matière** (`src/content/matters.json`) : pierre 2 600, terre crue 1 800, torchis 1 750, mortier
  1 900, paille tassée 100, bois vert 900 (le même que wood.json), eau 1 000 kg/m³. `"mass": {"matter": …, "fill": …}` : le volume
  des `dims` × la part qu'occupe la matière (0,52 pour une pierre brute, à peu près un ellipsoïde ; 0,85 pour le moellon bosselé ;
  1 pour ce qui est taillé ou moulé) × sa densité. La pierre plate pèse ainsi 50 kg (62 kg tant qu'elle était une boîte pleine).
- **Tailler retire de la matière.** Chaque transformation déclare ce qui entre, ce qui sort (plus petit, plus léger : masse
  recalculée) et le déchet. **Choix** : les éclats de pierre restent au sol (`stone-chips`, ils serviront de blocage dans le
  solin) ; les copeaux, rameaux et chutes de bois disparaissent (ils partent au feu) ; l'eau en trop s'égoutte. `validate.ts` vérifie
  que la sortie, à sa plus grande taille, pèse au plus l'entrée à sa plus petite.
- **Les transformations sont des données** (`src/content/transforms.json`) : pour chacune, les entrées (un objet, une pièce de
  bois par ses réglages, ou de la matière prise au poste : l'eau de l'étang, l'argile de la berge), les sorties, le déchet, les
  outils, le poste (sol, billot, établi, bord de l'étang, chevalet de fendeur), le métier, et le geste : réel (fendre, équarrir,
  tailler un piquet, tailler une cheville) ou « à venir ». `validate.ts` vérifie que tout ce qui y figure existe.
- **La transformation « magique »** en attendant les gestes : dans `?dieu`, « Transformer » applique d'un coup une transformation à
  ce que Xéros tient ou vise (`systems/transform.ts`) : les entrées se cherchent dans ses mains, puis au sol près de lui ; le poste
  et les outils ne sont pas vérifiés (c'est le geste qui les demandera) ; ce qui sort va dans la main libérée s'il y tient, sinon
  au sol à côté. Il manque une entrée : « Il manque : … », et rien ne change.
- **Tout s'achète, mais tout peut se faire.** Chaque objet dit son métier (`trade`) et qui le vendrait au village : le carrier (pierre
  brute, moellon, pierre plate), le maçon (pierre de taille, mortier), le terrassier (motte, torchis), le chaumier (botte de
  chaume), le bûcheron (branche, baguette, piquet), le charpentier (poutre, cheville), le fendeur (planche, bardeau), le menuisier
  (maillet, seau), le forgeron (les outils de fer), le paysan (la paille, puiser l'eau).
- **Les briques, dans l'ordre** :
  1. *La pierre* (solin, cheminée) : pierre brute petite et grosse (ramassée), moellon (la grosse dégrossie au têtu), pierre de
     taille (le moellon dressé au ciseau et au maillet), pierre plate devenue naturelle (le plan de l'abri accepte toute pierre
     plate ; le dé garde sa forme), éclats de taille ; outils : têtu, ciseau de tailleur, maillet.
  2. *La terre* (solin, remplissage) : motte de terre (creusée à la bêche au bord de l'étang), mortier de terre (une gâchée au sol),
     torchis (même unité que la terre) ; la bêche ; le seau, qui se prend et a deux états, vide et plein.
  3. *Les fibres* (remplissage, toit) : baguette de clayonnage (parée dans une branche en attendant un taillis de noisetiers), gerbe
     de paille longue (l'ancien objet `straw`, mis au protocole), botte de chaume (trois gerbes peignées).
  4. *Le bois travaillé* (charpente, ouvertures) : la perche (un nouveau diamètre de la pièce de bois, 12 cm), la planche fendue (une
     nouvelle forme de la pièce de bois, 3 × 25 cm, fendue au coutre dans un quartier ou une demi-bille), le bardeau, la cheville
     (taillée dans un piquet sur le billot, le geste du piquet) ; le coutre.
- **Ce qui manque pour la chaumière** (à décider avec Grégoire) : les **pans de mur** (le solin de moellons au mortier, les
  colombages de poutres chevillées, le clayonnage de baguettes entre des palançons, le torchis), le **toit** (les chevrons de perches,
  les lattes, le chaume en rangs), la **porte et les volets** (planches et traverses, les gonds du forgeron), la **cheminée** (pierre
  de taille et moellons, le manteau), et le **bac à sable** où composer une maison pièce par pièce ; puis le plan de la maison, les
  vrais gestes (dégrossir, tailler, creuser, puiser, mêler, peigner, fendre au coutre), le taillis de noisetiers et le jeune arbre
  de taillis (la perche), la carrière et le village qui vend.

### La pierre, un objet à la fois (décidé le 31 octobre 2026, chantier « pierre »)

Le chantier « briques » a fait une vingtaine d'objets d'un coup, et la maquette de la maison, dessinée d'un bloc, montrait une pierre
qui ressemblait à de la brique, sans chaîne visible d'un objet à l'autre. On recommence par la pierre, **un objet à la fois, qui
vient visiblement du précédent, validé par Grégoire avant le suivant** : d'abord la fiche, puis des propositions de dessin
côte à côte (`art/proposals/`, jamais chargé par le jeu ; `.art-preview/essai-pierre.png`), puis seulement l'intégration.

- **La pierre commune du village est un calcaire gris clair, presque blanc**, la moins chère, tirée d'une carrière toute proche.
  D'autres pierres, d'autres couleurs viendront plus tard.
- **La roche est un réglage de la pierre** : nom, couleur (une rampe de 4 à 5 tons dans `art/palette.ts`), densité (calcaire :
  2 400 kg/m³), dureté à la taille, prix relatif. Une nouvelle couleur de pierre = une nouvelle roche, pas un nouvel objet.
- Premiers maillons : la [pierre brute de carrière](objets/rough-stone.md) (moyenne et grosse), puis le [moellon](objets/rubble-stone.md)
  (trois longueurs, faces bosselées), avec un muret d'essai monté par calcul pour juger qu'il se lit comme un mur de moellons.
- **Choix de Grégoire sur l'essai** (même jour) : la pierre brute prend le dessin C (« cassures et taches »), en **trois tailles**
  (petite, ~15 cm et 4,5 kg, d'une main ; moyenne 26 × 22 × 19 ; grosse 45 × 34 × 27), deux formes par taille ; **casser** une grosse
  pierre au têtu donne des moyennes, une petite et des éclats (geste à venir, bilan de masse juste). Le moellon prend le dessin B
  (dégrossi, plus plat et plus calme que la pierre brute : on voit le travail du têtu), 30, 40 et 50 cm. **Un tas par taille et par
  longueur, jamais mêlés.** **La dalle** (`slab`, ~45 × 40 × 12 cm) : le calcaire se casse en plaques ; forme naturelle plate de la
  pierre brute, elle remplace la pierre plate et sert de dé à l'abri. **La roche entre dans le contenu** (`src/content/rocks.json`) :
  toutes les masses de pierre se recalculent au calcaire (2 400 kg/m³ au lieu de 2 600). Intégré ; un second essai, sans intégration,
  monte deux murs de 1,60 × 0,80 m avec ces dessins (`tools/essai-murs.ts`, `.art-preview/essai-murs.png`) : un mur brut de pierres
  brutes posées sur leur face la plus plate, un mur taillé de moellons en assises.

## Sauvegarde et outils de test (décidé le 29 octobre 2026)

- **La partie se sauvegarde toute seule.** `GameState` est écrit dans le navigateur à chaque changement (objet pris, posé, coupé, tas modifié, changement de carte), avec la carte et la position de Xéros. Au lancement, la partie reprend là où elle était. Pas de bouton « sauvegarder » pour l'instant.
- **Le format porte un numéro de version et se lit par un schéma Zod.** Une sauvegarde abîmée ou d'une autre version ne plante pas le jeu : un message clair le dit, et une partie neuve commence.
- **Une position dans une zone de sortie ne s'enregistre pas telle quelle** (précisé le 29 octobre 2026) : au rechargement, Xéros reprend au point d'arrivée de cette sortie, et ne change pas de carte tout seul.
- **`?reset` dans l'adresse** efface la sauvegarde et repart du réveil dans le cagibi.
- **`?dieu` dans l'adresse** ouvre des outils de test (dont la force de Xéros, un multiplicateur de tous ses seuils, et la masse qu'il porte), à côté du jeu, hors du canevas : donner un objet en main, poser un objet du monde ou un tas devant Xéros, aller sur une carte, remettre une carte ou toute la partie à zéro (cette dernière à confirmer dans le panneau : « Vraiment ? », puis un second clic). « Aller sur une carte » mène à son premier point d'apparition. Sans `?dieu`, ils n'existent pas : le joueur ne les voit jamais.
- **Plus tard, la sauvegarde du joueur au cagibi** (Xéros se couche, la partie est gardée) reposera sur le même mécanisme : même format, même lecture.

## Façon de travailler

- Avant un nouveau lieu : plan annoté, validé avant de dessiner.
- Poser les questions avant de foncer quand c'est ambigu ; pas de listes de suggestions non demandées.
- Proposer les outils du marché (Tiled, Aseprite, Zod...) plutôt que tout refaire à la main.
- Travail sur une branche, `npm run build` doit passer, puis push.
