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
- Physique : environ 35 ans, un peu plus grande que Xéros (33 px contre 31 dans le jeu), mains de travailleuse. Même famille de couleurs de peau que lui.
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
- **Jeu cosy et lent** : les gestes répétés et les étapes réalistes sont assumés. La progression passe par de meilleurs outils qui raccourcissent les étapes (une scie, plus tard une brouette).

## Feuille de route

Ordre validé pour rendre le projet tenable dans la durée :

1. ~~Dépôt GitHub~~ (fait)
2. ~~`npm run check` : vérification du contenu avec Zod~~ (fait), ~~`WorldScene` découpée en systèmes~~ (fait)
3. ~~Cartes faites avec **Tiled** (format JSON)~~ (fait : chaîne Tiled → jeu en place, ferme et maison migrées sans changement visible ; voir *Cartes avec Tiled* et le README). ~~Discussion d'architecture « étape 2, comment une carte devient jouable »~~ (faite le 28 octobre 2026).
4. Sprites au format JSON d'**Aseprite** (format commun, chargé nativement par Phaser) ; plus tard, lecture des fichiers `.aseprite`.
5. État du jeu (inventaire, progression, sauvegarde) : avancé le 29 octobre 2026 avec la récolte, voir *Boucle de jeu : récolte et inventaire*. La sauvegarde reste à brancher.
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

- **Un seul état de partie, `GameState`**, objet typé et décrit avec Zod. Il contient l'inventaire et les changements du monde, rangés par carte et par identifiant d'objet Tiled (« objet 12 de la ferme : devenu `tree-stump` »). Les cartes décrivent le monde au début de la partie, `GameState` dit ce qui a changé. La sauvegarde consistera à l'écrire. Pas le registry de Phaser : un objet à nous, vérifiable, indépendant du moteur.
- **Ce qui se récolte porte un composant `harvest`** dans `props.json` : `tool` (outil nécessaire, absent = à la main), `hits` (nombre de coups), `fall` (animation de fin), `becomes` (objet qui le remplace), `drops` (objets qui tombent, `min`/`max`). Un seul système `systems/harvest.ts` pour l'arbre, le rocher, les baies, le billot. La repousse (`regrow`) attend que le temps existe.
- **La hache est plantée dans un billot**, près du tas de bois de la maison. Le billot porte `harvest` sans outil, en un coup, devient `chopping-block` et donne la hache, directement dans l'inventaire (`give` sur l'objet lâché) : un seul E.
- **Les objets possédables sont décrits dans `items.json`** : nom, icône `item-<id>`, `stack`, `kind` (`tool`, `resource`...).
- **Un objet tombé reste au sol**, enregistré dans `GameState`, et se ramasse un par un avec E. Pas de ramassage automatique (choix de Grégoire).
- **Deux gestes.** E (ou Entrée) : les mains (parler, ramasser, prendre, cueillir). Espace : utiliser l'objet en main, même dans le vide. Sans le bon outil, un message court l'indique.
- **Barre de 8 cases** en bas de l'écran, touches 1 à 8 et molette ; la case active est l'objet en main. C'est tout l'inventaire pour l'instant.
- **Le coup d'outil se compose** : une animation de geste pour le corps de Xéros, plus un petit sprite par outil posé dans la main image par image. Un nouvel outil = un sprite d'outil, pas une nouvelle animation du corps.

## Abattre un arbre (décidé le 29 octobre 2026)

Principe : ce qui est petit va dans le sac, ce qui est lourd se porte à deux mains. Rien de volumineux ne se range dans l'inventaire.

- **L'arbre tombe du côté opposé à Xéros**, à gauche ou à droite seulement, et laisse sa souche.
- **L'arbre couché est un nouvel objet** qui garde la taille et la forme de l'arbre, à l'horizontale, et bloque le passage sur toute sa longueur. Il est fait d'**un houppier et de 4 ou 5 sections de tronc** posés bout à bout, chacun réagissant pour lui-même.
- **Le houppier**, frappé à la hache, donne des branches ; les feuilles disparaissent avec lui. Il laisse le tronc nu, avec des chicots.
- **Les sections se coupent de haut en bas**, à des encoches dessinées sur le tronc. Xéros se place au-dessus ou en dessous du tronc, face à une encoche ; l'invite apparaît sur l'encoche. Le geste dépend de la cible : de côté sur ce qui est debout, de haut en bas sur ce qui est couché ou posé.
- **Chaque section coupée devient une bille** d'environ 1 m, qui reste au sol et bloque le passage tant qu'on ne la déplace pas.
- Ébrancher et tronçonner se font **dans l'ordre qu'on veut** ; la dernière section garde le houppier tant qu'il n'est pas coupé.
- **Porter** : une seule série d'animations « porter » pour Xéros (bras levés, marche et attente dans les 4 directions), avec l'objet porté posé par-dessus à un point d'accroche, devant lui ou derrière sa tête selon la direction. Xéros marche plus lentement, ne fait rien d'autre, et repose l'objet avec E. Un nouvel objet portable n'a besoin que de son sprite.
- La bûche (`item-log`, 99 par case) contredisait le principe : retirée le 29 octobre 2026, avec l'ancien objet `log` (la bille de l'atelier est maintenant une `felled-log`).
- Pas encore discuté : ce qu'on fait des billes ensuite (fendage sur le billot, tas de bois, brouette).

## Façon de travailler

- Avant un nouveau lieu : plan annoté, validé avant de dessiner.
- Poser les questions avant de foncer quand c'est ambigu ; pas de listes de suggestions non demandées.
- Proposer les outils du marché (Tiled, Aseprite, Zod...) plutôt que tout refaire à la main.
- Travail sur une branche, `npm run build` doit passer, puis push.
