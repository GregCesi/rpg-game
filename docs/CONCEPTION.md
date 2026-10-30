# Xéros — conception

Ce qui a été décidé sur le jeu lui-même : univers, personnages, lieux, direction artistique, et ce qui vient ensuite.
La technique (architecture, conventions) est dans `README.md` et `CLAUDE.md`.

## Le jeu

- Jeu d'aventure très long, médiéval fantastique, ton terre à terre.
- On commence adolescent dans une petite ferme isolée près d'un village. Les premières tâches sont la vie quotidienne du garçon à la ferme, puis il découvre le monde petit à petit.
- Vue de dessus façon Stardew Valley, tuiles 32×32, Phaser dans le navigateur.
- Viendront plus tard : artisanat, combat, inventaire, quêtes.
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

## Boucle de jeu : récolte et inventaire (décidé le 29 octobre 2026)

Première boucle : Xéros prend la hache sur le billot, abat un arbre, ramasse les bûches.

- **Un seul état de partie, `GameState`**, objet typé et décrit avec Zod. Il contient l'inventaire et les changements du monde, rangés par carte et par identifiant d'objet Tiled (« objet 12 de la ferme : devenu `big-tree-stump` »). Les cartes décrivent le monde au début de la partie, `GameState` dit ce qui a changé. La sauvegarde l'écrit tel quel (voir *Sauvegarde et outils de test*). Pas le registry de Phaser : un objet à nous, vérifiable, indépendant du moteur.
- **Ce qui se récolte porte un composant `harvest`** dans `props.json` : `tool` (outil nécessaire, absent = à la main), `hits` (nombre de coups), `fall` (animation de fin), `becomes` (objet qui le remplace), `drops` (objets qui tombent, `min`/`max`). Un seul système `systems/harvest.ts` pour l'arbre, le rocher, les baies, le billot. La repousse (`regrow`) attend que le temps existe.
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

- **L'arbre tombe du côté opposé à Xéros**, à gauche ou à droite seulement, et laisse sa souche.
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

  Les billes des gros (95 cm) se fendent en quatre sur place (voir *Fendre*) ; plus tard, les quartiers se refendront en bûches sur le billot. Tous se coupent de la même façon : ils tombent du côté opposé à Xéros, s'ébranchent, se tronçonnent aux encoches, et leurs billes se portent, se tournent et s'empilent, chacune en tas de sa propre sorte (les billes des deux gros vont ensemble, celles du normal à part). Chaque pièce porte le nom de sa sorte en tête de clé (`big-tree`, `big-pollard`, `normal-tree`, `big-felled-log`, `normal-felled-log`...). Depuis l'équarrissage (30 octobre 2026), l'arbre normal ne se tronçonne plus aux encoches : ébranché, il devient un rondin de 5 m qu'on coupe où l'on veut (voir *Bois d'œuvre*).
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
  dans les creux, 1 au sommet) ; les sections plates ou carrées (demi-bille, quartier, poutre) font des rangées droites de 3 de large
  sur 3 de haut, les quartiers tête-bêche (la face fendue debout d'un côté, puis de l'autre, comme un vrai tas de bois fendu). Au
  sol, les pièces sont côte à côte à la largeur de leur collision ; une couche monte de la hauteur de la section (√3/2 dans les creux
  d'une pyramide). Le dessin du tas s'assemble pour toute longueur, comme les pièces.
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
- **Couper un lien** : on pose le rouleau sur le billot (E, rouleau en main, face au billot), puis Espace avec la hachette (l'outil naturel, 0,4 point d'endurance, ajouté le 30 octobre 2026) ou la cognée (0,5 point). Un lien de 2 m tombe au sol, le rouleau perd 2 m ; vide, il disparaît. On peut reprendre le rouleau posé sur le billot (E, mains libres).
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
  qui la tenait. Le coup coûte 0,4 point (`whittle`), la moitié d'un coup de cognée. Si l'autre main ne tient pas une branche : « Tiens la
  branche debout sur le billot, de l'autre main. » Planter un piquet coûte 0,5 point d'endurance.
- **Tracer.** Piquet en main, plan connu, Espace sur le sol : le piquet se plante. Sans plan connu : « Xéros ne sait pas encore
  quoi tracer. » Le premier piquet fixe le coin nord-ouest de l'emprise ; les trois autres coins apparaissent en fantôme, et
  les piquets suivants ne se plantent que là (un coin à moins de 12 px du point visé aimante le piquet ; ailleurs : « Les
  piquets se plantent aux coins du tracé. »). E sur un piquet planté, tant que le chantier n'est pas né : on le reprend, ce qui
  permet de changer d'emplacement. Au quatrième piquet, le chantier naît si toute l'emprise est libre (pas d'objet, d'eau, de
  mur, de tas ni d'objet au sol ; Xéros lui-même ne compte pas) ; sinon « Il y a quelque chose dans le passage. » et le
  quatrième piquet reste en main.
- **Les dés de pierre.** La pierre plate (`flat-stone`, fiche `docs/objets/flat-stone.md`) fait environ 30 × 30 × 15 cm. Sa
  masse est calculée avec une densité de pierre de 2 600 kg/m³ (`STONE_DENSITY`, `src/content/mass.ts`, à côté de celle du bois) :
  35 kg, portée à deux mains, lentement (au-dessus de 25 kg : pas de course). La ferme a un étang : les pierres sont sur sa berge
  (six, posées dans Tiled : quatre pour l'abri, deux de marge), pas dans un pierrier. Une pierre posée sur une place du chantier
  devient un dé (`footing-stone`).
- **Le chantier.** On voit en fantôme seulement les places de l'étape en cours : les quatre dés, aux coins. Pierre en main, E sur
  une place : le dé est posé, et le piquet de ce coin est arraché et retombe au sol à côté, réutilisable. Autre chose en main :
  « Il faut une pierre plate. » Près du chantier, une petite ligne d'état : « Abri à bois : dés, 2 sur 4 ». Les quatre dés
  posés : « Abri à bois : poteaux, 0 sur 4 », et les poteaux apparaissent en fantôme, même si on ne peut pas encore les poser (« Cette
  étape viendra plus tard. »). Le chantier (plan, position du piquet nord-ouest, coins plantés, pièces posées) est dans GameState
  (`sites` de la carte) : il se retrouve après un rechargement ; `SAVE_VERSION` 5, les parties de la version 4 sont converties
  (aucun plan connu, aucun chantier).
- **Un moteur de places commun** (`src/world/places.ts`, sans Phaser). Les tas et les chantiers partagent le même mécanisme :
  des places avec des couches et des dépendances (une place du dessus repose sur d'autres), celles qui sont ouvertes, la plus
  haute qu'on reprend, la place visée la plus proche, l'ordre d'affichage, le fantôme (`systems/ghost.ts`), et ce que la place
  accepte (`accepts`, `refusal`, `world/offer.ts`). Un tas l'utilise avec des places qui acceptent un genre ; un chantier avec
  des places qui acceptent une pièce précise, par sa clé d'objet (et plus tard des mesures : longueur, section, état), avec
  un message de refus clair. La mécanique du chantier est dans `src/systems/site.ts`, la géométrie du plan sur la carte dans
  `src/world/sitePlan.ts`.
- **Ce qui viendra** : les poteaux (le bois est équarri depuis le 30 octobre 2026, voir *Bois d'œuvre* ; restent mesurer et tenir debout), les sablières, les chevrons, le toit de planches ;
  d'autres orientations ; le pierrier, s'il n'y a pas d'étang ; tourner un plan ; défaire un chantier.

## Poids et force (décidé le 30 octobre 2026)

Repris par *Le bois* (30 octobre 2026) : la masse se calcule d'après les réglages de la pièce de bois ; à 1 m, la bille du gros pèse 214 kg et celle du normal 63,6 kg.

Chaque objet a une masse, Xéros a une force, et ce qui est trop lourd à porter se roule.

- **Masses** (`src/content/mass.ts`). Tout objet qu'on prend, pose ou roule a une masse en kg (`validate.ts` l'exige). Saisie pour les
  objets simples (hache 2,5 kg, branche 2,5 kg, lien 0,2 kg, rouleau de corde 1 kg les 10 m, au prorata de sa longueur). **Calculée
  pour le bois** : volume du tronc tiré des `dims` (le diamètre est celui des dimensions moins le contour d'un pixel de chaque côté :
  65 cm contour compris = 55 cm de bois) × une seule densité, 900 kg/m³ de bois vert. **Calculée pour la pierre** (30 octobre 2026) : le volume de la boîte de ses `dims` × 2 600 kg/m³ (`STONE_DENSITY`, à côté de la densité du bois), soit 35 kg pour la pierre plate de 30 × 30 × 15 cm. Ce qui donne **203 kg** pour une bille du gros
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

La fatigue de la journée, comme l'énergie de Stardew Valley. Le souffle (l'essoufflement d'une course ou d'une charge, qui se reprend en quelques secondes) viendra plus tard comme **deuxième jauge**, à côté de celle-ci : l'endurance baisse tout le jour et ne remonte qu'en dormant.

- **La jauge** : 100 points au maximum (`src/content/stamina.json`, composant `entities/Stamina.ts`, mécanique `src/systems/effort.ts`). Elle est dans GameState (`stamina`) et se sauvegarde avec la partie ; à l'écran, une jauge verticale à droite des deux cases des mains (`art/ui/stamina.ts`), rouge sous le seuil de fatigue, qui tremble quand un effort est refusé.
- **Ce qui coûte** (tout est dans `stamina.json`, rien en dur) : un coup d'outil (hache sur l'arbre debout, le houppier, une encoche, la coupe d'un lien sur le billot, tailler un piquet à la hachette (0,4 point), planter un piquet de tracé (0,5 point), nouer et dénouer, pivoter une bille (par kg), planter le coin et frapper à la masse (voir *Fendre*), et par seconde : marcher en portant au-delà de 25 kg (par kg de trop), pousser une bille (par kg), courir (0,2 point par seconde depuis le 30 octobre 2026 ; c'était 1). **Marcher ne coûte rien**, ni à vide ni chargé en dessous de 25 kg. Un coup dans le vide ou sans le bon outil ne coûte rien.
- **Fatigué** (sous 15 %) : pas de course, marche à 85 % de la normale. **Épuisé** (0) : toute action qui coûte est refusée, une fois, par « Xéros est épuisé. Il faut dormir. » (la jauge tremble) ; il peut toujours marcher, mais ne soulève plus ce qui le ferait porter au-delà de 25 kg. Les coûts se règlent avec la force : le fardeau est compté au-delà du seuil de marche de `strength.json`, donc une force plus grande coûte moins.
- **Dormir** : E sur la paillasse du cagibi (`pallet`, dialogue `pallet-sleep`) propose « Dormir ? » (premier dialogue à choix : `choices` d'une ligne, `action: "sleep"`). Oui : fondu au noir, jauge pleine, un jour de plus, réveil dans le cagibi, partie sauvegardée, « Jour 2 » à l'écran.
- **Compteur de jours** : `day` de GameState (jour 1 au départ, +1 à chaque nuit). Pas encore d'horloge ; il servira au temps et aux saisons.
- **Sauvegarde** : `SAVE_VERSION` 5 ; une partie de la version 2 est convertie à la lecture (jauge pleine, jour 1), une partie de la version 3 aussi (le fendage ne fait qu'ajouter des champs facultatifs), une partie de la version 4 aussi (les chantiers : aucun plan connu, aucun chantier), sans repartir à neuf.
- **Outils de test** (`?dieu`) : un champ pour régler l'endurance, une case « endurance infinie » ; pour l'implantation : apprendre un plan, mettre quatre piquets ou quatre pierres plates au sol devant Xéros, effacer les chantiers de la carte.

## Fendre (décidé le 30 octobre 2026)

Repris le 30 octobre 2026 (« tas ») : **toute longueur se fend**, toujours avec un seul coin planté dans le bout. Il faut **3 coups de
masse par mètre**, arrondis au mètre au-dessus (3 pour 1 m, 6 pour 2 m, 9 pour 2,4 m) ; « Trop longue pour un seul coin. »
disparaît. À chaque coup, la fente s'allonge sur les morceaux du milieu, du bout du coin jusqu'à l'autre bout, et **le coin
s'enfonce** un peu (trois profondeurs dessinées : il sort de 3, 2, puis 1 px du bout) ; au dernier coup, le bois s'ouvre. Pourquoi un
seul coin : c'est le bois de bout qui s'ouvre le long des fibres, et la fente court d'elle-même sur la longueur à force de coups ; il
faut seulement plus de coups pour une pièce plus longue. **Le quartier** est un quart de rond couché sur une de ses faces fendues,
l'autre face debout d'un côté, l'écorce qui descend en arrondi de l'autre : la pièce garde le côté de sa face debout (`face` : nord ou
sud est-ouest, est ou ouest nord-sud) ; R (ou le pivot au sol) le tourne d'un quart de tour dans le sens des aiguilles d'une montre,
la face suit (nord, est, sud, ouest). Les deux quartiers d'une demi-bille naissent côte à côte faces debout opposées, tournées l'une
vers l'autre : ils reforment la demi-bille. Section : 27,5 × 27,5 cm (le rayon de la bille), 37,5 cm contour compris comme toutes les
pièces (gabarit), soit environ 20 × 11 px à 1 m est-ouest et 8 × 18 px nord-sud ; la même épaisseur dans les deux sens. Nord-sud, la
face coupée au sud (la part de tarte, claire, ses cernes, le cœur du côté de la face debout) fait lire la pièce couchée et non debout.

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
- **Les tas de quartiers.** Un quartier s'empile avec le système des tas : genre `big-quarters`, six places (trois au sol côte à côte, deux dans les creux, une au sommet), en est-ouest ou nord-sud, R tournant le quartier en main comme une bille. Le genre ne se mélange pas avec les billes. Les demi-billes ne s'empilent pas.
- **Ce qui viendra** : fendre debout, sur le billot, ce qui se dresse : d'abord le quartier (refendu en bûches) ; la grosse bille elle-même ne se fendra debout que lorsque Xéros sera assez fort pour la redresser (203 kg aujourd'hui) ; refendre un quartier en bûches sur le billot, debout (la hache, ou le coin et la masse) ; les bardeaux du toit des bâtiments, qui se fendent dans une bille de chêne comme ici (même `harvest`, autres `becomes`) ; retirer un coin planté sans frapper ; un deuxième coin, ou un coin qu'on forge.

## Bois d'œuvre (décidé le 30 octobre 2026, « équarrissage »)

Repris le 30 octobre 2026 par *Le bois* (une seule pièce de bois, la grille de 20 cm, les poteaux bas à 1,80 m) : ce qui suit
garde la décision de l'équarrissage, les nombres à jour sont là-bas. Les poteaux de l'abri (2 de 3 m au nord, 2 de 1,80 m au sud,
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
  deux mains, dans la réserve de la maison ; fiche `docs/objets/broadaxe.md`). Contre le flanc d'un rondin couché, Espace : un
  coup (le geste `chop`) ; 3 coups dressent une face, 4 faces font la poutre (la pièce de bois équarrie, fiche
  `docs/objets/wood-piece.md`) : 20 × 20 cm de bois, sa longueur, 108 kg pour 3 m, 64,8 kg pour 1,80 m. Le dessin change à chaque face finie : rond, une face,
  deux, trois, poutre. Une face dressée, le rondin ne roule plus ; la poutre non plus (« Elle ne roule pas : elle est carrée. »).
  On ne coupe plus un rondin entamé à la doloire : on coupe d'abord, on équarrit ensuite. Refusé sur une grosse bille (« Trop
  grosse pour une poutre. ») ou un rondin de moins de 20 cm de bois. Endurance : 0,333 point par coup et par mètre, soit
  **12 points** pour un poteau de 3 m (12 coups), 7,2 pour 1,80 m ; la coupe : 0,8 point par coup de cognée.
- **Pourquoi au pied du chantier.** Une poutre de 3 m pèse 108 kg : elle ne se porte pas et ne roule pas. Le rondin, lui, roule :
  on le roule jusqu'au chantier et on l'équarrit là où il servira. Celle de 1,80 m (65 kg) se porte, lentement.
- **Sauvegarde** : `SAVE_VERSION` 6 ; une partie de la version 5 est convertie (les sections, le houppier, la tête et les billes
  numérotées de l'arbre normal deviennent des rondins de 95 cm à la même place).
- **Outils de test** (`?dieu`) : poser une pièce de bois de réglages choisis (voir *Le bois*) ; donner la doloire.
- **Ce qui viendra** : la pose des poteaux sur les dés, avec l'aide de la mère (une poutre de 108 kg ne se dresse pas seul) ; les
  sablières et les chevrons, tirés de la même façon ; une scie, plus tard, qui raccourcira les étapes.

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
- **Les règles sont du contenu** (`src/content/wood.json`) : la densité (900 kg/m³), la grille, la plus courte pièce, la coupe (la
  cognée, 3 coups), l'équarrissage (la doloire, 3 coups par face, 4 faces, poutre de 20 cm), le fendage (le coin, la masse, 3 coups
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
