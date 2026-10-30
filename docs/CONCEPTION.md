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
- Physique : environ 35 ans, un peu plus grande que Xéros (34 px contre 32 dans le jeu, contour compris : 1,70 m contre 1,60 m), mains de travailleuse. Même famille de couleurs de peau que lui.
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
- **Gabarit** (décidé le 29 octobre 2026) : une règle de dimensions et de perspective pour tous les objets, tirée des billes (`docs/STYLE.md`, section 8). Dimensions réelles contour compris, taille réelle pour tous les objets, plancher de lisibilité à 6 px de large, largeur stylisée des personnages ; la face de coupe d'un cylindre couché nord-sud est aplatie (× 7/11) pour qu'on le lise couché. Pour l'arbre, sa longueur couchée (5,65 m) fait foi.
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

Principe : ce qui est petit va dans le sac, ce qui est lourd se porte à deux mains. Rien de volumineux ne se range dans l'inventaire.

- **L'arbre tombe du côté opposé à Xéros**, à gauche ou à droite seulement, et laisse sa souche.
- **L'arbre couché est un nouvel objet** qui garde la taille et la forme de l'arbre, à l'horizontale, et bloque le passage sur toute sa longueur. Il est fait d'**un houppier et de 4 ou 5 sections de tronc** posés bout à bout, chacun réagissant pour lui-même.
- **Le houppier**, frappé à la hache, donne des branches ; les feuilles disparaissent avec lui. Il laisse le tronc nu, avec des chicots.
- **Les sections se coupent de haut en bas**, à des encoches dessinées sur le tronc. Xéros se place au-dessus ou en dessous du tronc, face à une encoche ; l'invite apparaît sur l'encoche. Le geste dépend de la cible : de côté sur ce qui est debout, de haut en bas sur ce qui est couché ou posé.
- **Chaque section coupée devient une bille** d'environ 1 m, qui reste au sol et bloque le passage tant qu'on ne la déplace pas.
- Ébrancher et tronçonner se font **dans l'ordre qu'on veut** ; la dernière section garde le houppier tant qu'il n'est pas coupé.
- **Porter** : une seule série d'animations « porter » pour Xéros (bras tendus, mains jointes devant le ventre, marche et attente dans les 4 directions), avec l'objet porté posé par-dessus à un point d'accroche, devant lui ou derrière sa tête selon la direction. Xéros marche plus lentement, ne fait rien d'autre, et repose l'objet avec E. Un nouvel objet portable n'a besoin que de son sprite.
- La bûche (`item-log`, 99 par case) contredisait le principe : retirée le 29 octobre 2026, avec l'ancien objet `log` (la bille de l'atelier est maintenant une `big-felled-log`).
- **Il y a deux arbres** (décidé le 29 octobre 2026 ; l'arbre normal décidé le 30 octobre 2026). Le **gros** : tronc de 55 cm (65 cm contour compris), billes de 95 cm, à fendre plus tard en quatre sur le billot (posée debout, un coup en deux, un second en quatre). Le **normal** : tronc de 30 cm (40 cm contour compris), environ 7 m de haut, plus élancé, billes de 95 cm sur 30 cm (40 contour compris), de la grosseur d'un bras, qui restent entières. Les deux se coupent de la même façon : ils tombent du côté opposé à Xéros, s'ébranchent, se tronçonnent aux encoches, et leurs billes se portent, se tournent et s'empilent, chacune en tas de son propre genre (les genres ne se mélangent pas). Chaque pièce de l'un et de l'autre porte le nom de sa sorte en tête de clé (`big-tree`, `normal-tree`, `big-felled-log`, `normal-felled-log`...). Plus tard, l'arbre normal se coupera aussi à la longueur d'une pièce de charpente : pas dans ce chantier.
- Pas encore discuté : la brouette. Le tas : voir *Les tas*.

## Les tas (décidé le 29 octobre 2026, repris le même jour)

- **On construit un tas pièce par pièce, comme en vrai.** Un tas a des places, décrites en données : leur position, leur couche, et les places qui les portent (une place du dessus n'existe que quand celles qui la portent sont prises). Chaque place a sa pièce ; le tas s'affiche couche par couche, du bas vers le haut, sauf les billes, affichées de l'arrière vers l'avant : la bille de devant se voit entière et ne cache de celle de derrière que ce qu'elle cacherait vraiment (précisé le 29 octobre 2026). Une bille a la même longueur (19 px, 95 cm, celle de la pièce du tronc) et le même diamètre (13 px contour compris, 65 cm, dont 11 px d'écorce) dans les deux sens ; au sol, deux billes voisines sont à 11 px l'une de l'autre.
- **Poser** : la place visée dépend de l'endroit où se tient Xéros le long du tas. Au centre entre deux pièces posées, la pièce monte dans le creux ; décalé, elle va au sol à côté. Une prévisualisation en transparence montre la pièce à la place exacte où elle ira, et suit Xéros. **Reprendre** (E, mains libres) enlève la pièce la plus haute accessible.
- **Billes** : toutes parallèles, dans le sens où elles reposent après la coupe. 3 au sol côte à côte, 2 dessus dans les creux, 1 au sommet : 6. Le tas plein ressemble à un petit tas de bois.
- **Branches** : toutes parallèles, posées tête-bêche (le gros bout alterne d'un côté et de l'autre), côte à côte puis par couches. Dimensions réalistes : une branche fait 1 à 1,5 m. Le tas plein a à peu près le volume d'une bille : c'est la future matière d'un fagot.
- **Une bille peut être tournée** (décidé le 29 octobre 2026). R (lu par sa place sur le clavier) tourne la bille portée entre est-ouest et nord-sud ; le fantôme suit. La première bille d'un tas fixe le sens du tas ; les suivantes s'y alignent d'elles-mêmes. Un tas nord-sud se construit face à lui : Xéros se tient au sud et se déplace d'est en ouest pour choisir le sol ou le creux ; on y voit le triangle des faces coupées.
- **Les genres ne se mélangent pas.** Un tas de branches bloque le passage à partir de 3 pièces, un tas de billes toujours. Pas de recul de Xéros : sans place, « Pas la place ici. ». Les branches tombées d'une récolte restent éparpillées.

## La corde et le fagot (décidé le 29 octobre 2026)

- **Une fiche par objet, avant de le construire** (`docs/objets/`) : identité, dimensions réelles, toutes ses vues, regroupement, gestes, origine, devenir, vérification.
- **Le rouleau de corde** (chanvre, Ø 30 × 10 cm, une main) porte sa longueur restante, 10 m au départ, gardée par la partie. Il ne se range pas en tas. On le trouve dans la réserve de la maison ; plus tard il s'achètera ou se fabriquera.
- **Couper un lien** : on pose le rouleau sur le billot (E, rouleau en main, face au billot), puis Espace avec la hache. Un lien de 2 m tombe au sol, le rouleau perd 2 m ; vide, il disparaît. On peut reprendre le rouleau posé sur le billot (E, mains libres).
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
  chevrons, la couverture) ; l'ordre est noté en données (`src/content/buildings.json`) et l'aperçu montre le bâtiment
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
  à environ 20° (poteaux de 3 m au nord, 1,70 m au sud), poteaux de 20 × 20 cm ; l'ombre portée du toit est calculée par le
  jeu (sa projection au sol, décalée selon la lumière), sous les poteaux et sous Xéros, et s'efface avec le toit.
- **Chantier en cours : l'abri à bois seulement**, posé tout construit dans la ferme, à côté du tas de bois, sur environ
  2 × 2 cases (3,2 m sur 3,2 m). Construire soi-même (porter les pièces, les poser dans l'ordre) n'est pas encore construit.

## Sauvegarde et outils de test (décidé le 29 octobre 2026)

- **La partie se sauvegarde toute seule.** `GameState` est écrit dans le navigateur à chaque changement (objet pris, posé, coupé, tas modifié, changement de carte), avec la carte et la position de Xéros. Au lancement, la partie reprend là où elle était. Pas de bouton « sauvegarder » pour l'instant.
- **Le format porte un numéro de version et se lit par un schéma Zod.** Une sauvegarde abîmée ou d'une autre version ne plante pas le jeu : un message clair le dit, et une partie neuve commence.
- **Une position dans une zone de sortie ne s'enregistre pas telle quelle** (précisé le 29 octobre 2026) : au rechargement, Xéros reprend au point d'arrivée de cette sortie, et ne change pas de carte tout seul.
- **`?reset` dans l'adresse** efface la sauvegarde et repart du réveil dans le cagibi.
- **`?dieu` dans l'adresse** ouvre des outils de test, à côté du jeu, hors du canevas : donner un objet en main, poser un objet du monde ou un tas devant Xéros, aller sur une carte, remettre une carte ou toute la partie à zéro (cette dernière à confirmer dans le panneau : « Vraiment ? », puis un second clic). « Aller sur une carte » mène à son premier point d'apparition. Sans `?dieu`, ils n'existent pas : le joueur ne les voit jamais.
- **Plus tard, la sauvegarde du joueur au cagibi** (Xéros se couche, la partie est gardée) reposera sur le même mécanisme : même format, même lecture.

## Façon de travailler

- Avant un nouveau lieu : plan annoté, validé avant de dessiner.
- Poser les questions avant de foncer quand c'est ambigu ; pas de listes de suggestions non demandées.
- Proposer les outils du marché (Tiled, Aseprite, Zod...) plutôt que tout refaire à la main.
- Travail sur une branche, `npm run build` doit passer, puis push.
