# Xéros

Jeu d'aventure en pixel art, vue de dessus. On suit Xéros, jeune paysan d'un petit village, qui découvre le monde au fil de ses péripéties. Ton médiéval fantastique, terre à terre.

Phaser 3 + TypeScript + Vite. Tuiles 32×32.

## Lancer

```bash
npm install
npm run dev            # http://localhost:5173  (?debug pour voir les collisions)
npm run art            # art/ -> PNG, manifestes et tilesets Tiled (à lancer une fois avant d'ouvrir Tiled)
npm run maps           # cartes Tiled (tiled/maps/*.tmj) -> src/generated/maps.ts
npm run sketch -- <id> # fait naître tiled/maps/<id>.tmj depuis tiled/sketches/<id>.json (grille de lettres)
npm run test           # test de non-régression de l'outil d'esquisse
npm run check          # art, maps, puis vérifie tout le contenu sans lancer le jeu (formats + références croisées)
npm run build          # check, test, puis build web dans dist/
npm run build:single   # un seul fichier HTML autonome dans dist-single/
npm run art:preview    # régénère les sprites + aperçus x4 dans .art-preview/ (planche collection.png, xeros-<geste>-<outil>.png pour chaque geste et chaque outil en main, barre item-bar.png)
```

Les cartes se font dans [Tiled](https://www.mapeditor.org/) : ouvrir `tiled/xeros.tiled-project`. Après une modification d'une carte, relancer `npm run dev` (ou `npm run maps`) pour la voir en jeu.

Commandes : ZQSD, WASD ou flèches. Maj pour courir. E (ou Entrée) : les mains (parler, ramasser, prendre, cueillir). Espace : utiliser l'objet en main. Touches 1 à 8 ou molette : changer d'objet en main. E, Espace ou Entrée font défiler un dialogue.

## Architecture

```
art/                 sources du pixel art (grilles de caractères + générateurs)
  tile-registry.json numéros de tuiles, committé (voir Conventions : ne jamais renuméroter)
  palette.ts         palette commune
  characters/        personnages (xeros.ts)
  portraits/         portraits de dialogue (une animation = une expression)
  ui/                cadre de dialogue, flèche, touche E, cases de la barre d'objets
  items/             icônes 16×16 des objets possédables, outils en main (`tool-<objet>`)
  world/             tuiles et objets du décor extérieur, chaumière
  interior/          tuiles et mobilier de l'intérieur
tiled/               les cartes, faites avec Tiled
  xeros.tiled-project  projet Tiled (généré par build-art, committé) : types d'objets de props.json, Spawn, Exit
  maps/              les cartes (.tmj), éditées dans Tiled
  tilesets/          tilesets (.tsj + PNG) générés par build-art, ignorés par git, jamais édités
  sketch-legend.json légende des esquisses : lettre -> tuiles, terrain ou objet
  sketches/          esquisses (grilles de lettres) de cartes à faire naître ; ignoré par git
tools/build-art.ts   art/ -> PNG + manifestes dans src/generated/, tilesets et projet dans tiled/ (jamais édités à la main)
tools/build-maps.ts  tiled/maps/*.tmj -> src/generated/maps.ts, au format interne (MapSchema) ; lit Tiled, le jeu non
tools/sketch.ts      npm run sketch : esquisse (lettres) -> carte Tiled, à la naissance d'une carte seulement
tools/lib/           registre de tuiles, fichiers Tiled générés, schémas Zod du format Tiled, conversion des esquisses
tools/test-sketch.ts npm run test ; ses fixtures (anciennes cartes à lettres + .tmj figés) sont dans tools/fixtures/sketch/
tools/check.ts       npm run check : vérifie le contenu contre ce que art/ a produit
src/
  config.ts          constantes de gameplay (taille de tuile, vitesses, profondeurs d'affichage)
  events.ts          noms des événements échangés entre scènes
  content/           le contenu du jeu, en JSON : tuiles (propriétés), objets, personnages, dialogues
    types.ts         formats du contenu (schémas Zod = types TypeScript + vérification), dont le format interne des cartes
    validate.ts      vérifications croisées (une sortie vers une carte qui existe, une image dessinée...)
    items.json       objets possédables (inventaire, sol)
    gestures.json    geste d'outil : place de la main et de l'outil à chaque image
  state/             GameState : l'état de la partie (inventaire, changements du monde, objets au sol), en mémoire
  world/GameMap.ts   construit une carte jouable à partir d'une MapData
  systems/           une mécanique du monde par fichier : interactions, sorties, récolte (harvest.ts)...
  entities/Actor.ts  le corps d'un personnage (sprite, collision, animations)
  entities/Player.ts Actor + clavier + ToolUse
  entities/ToolUse.ts composant : le geste d'outil, l'outil posé dans la main image par image
  entities/Npc.ts    Actor + contrôleur immobile : un personnage non joueur qui se tourne vers Xéros quand il lui parle
  input/             lecture du clavier
  scenes/            Boot (chargement), World (la carte en jeu), Hud (barre d'objets, messages courts), Dialogue (par-dessus le monde)
```

### Comment tourne une image du monde

`WorldScene` assemble la carte, le joueur et les systèmes, puis arbitre selon son **mode** (`play`, `use`, `dialogue`, `transition`) : un seul à la fois. Chaque système fait une chose et rend son résultat à la scène (`InteractionSystem` dit quel objet a été utilisé, `findExit` dit quelle sortie est prise) ; c'est la scène qui décide quoi en faire. Une nouvelle mécanique = un fichier dans `systems/` + quelques lignes dans `WorldScene.update`.

Entre scènes, on passe par le bus du jeu avec les noms de `events.ts` (ex. `GameEvent.DialogueEnd`, `GameEvent.InventoryChanged`, `GameEvent.Notice`). À l'intérieur d'une scène, pas d'événements : des appels directs, plus faciles à suivre.

### L'état de la partie

Les cartes décrivent le monde au début de la partie ; `GameState` (`src/state/`, schéma Zod, indépendant de Phaser) dit ce qui a changé : l'inventaire (8 cases, la case active est l'objet en main), les objets de carte changés, rangés par carte et par **identifiant d'objet Tiled** (« objet 12 de la ferme : devenu `tree-stump` »), les objets posés au sol, par carte, et les **objets nés** pendant la partie (les pièces d'un arbre couché), par carte, avec leur identifiant propre ; un objet changé ou né peut être retourné (`flip`, ce qui est tombé vers la gauche). La construction d'une carte (`GameMap`) applique ses changements et repose les objets nés. En mémoire seulement : la sauvegarde consistera à l'écrire. On le modifie par les fonctions de `state/GameState.ts` (`addItem`, `changeObject`, `dropItem`, `spawnObject`, `changeSpawned`...), jamais à la main depuis une scène.

### Les quatre règles

1. **Le contenu est de la donnée.** Une carte (un fichier Tiled), une tuile, un objet, plus tard une quête ou un dialogue : un fichier de données, pas une classe. Le moteur reste petit.
2. **Le pixel art est du texte.** Chaque sprite est une grille de caractères dans `art/`, convertie en PNG au build. On peut remplacer un PNG par un dessin fait à la main sans toucher au jeu : le jeu ne connaît que les clés (`xeros`, `world`, `tree`...).
3. **Composer plutôt qu'hériter.** Un personnage = un `Actor` (le corps) + un contrôleur (clavier, IA de PNJ). Les futures capacités (inventaire, stats, dialogue) seront des composants attachés, pas des sous-classes.
4. **Erreurs lisibles.** Une carte mal saisie ou un sprite de mauvaise taille doit planter avec un message qui dit où (la carte, l'objet, sa position). Les formats sont décrits une fois dans `content/types.ts` (Zod) ; la partie du format Tiled que l'on lit est décrite dans `tools/lib/tiled-schema.ts` et contrôlée par `build-maps` ; les liens entre fichiers sont vérifiés dans `content/validate.ts`, par `npm run check` et au démarrage du jeu (la liste des problèmes s'affiche à l'écran). Nouveau champ ou nouveau lien = on l'ajoute là.

### Conventions

- Animations : `<skin>-<état>-<direction>`, ex. `xeros-walk-left`. Directions : `down`, `up`, `left`, `right`.
- Ordre d'affichage : profondeur = position y des pieds (le joueur passe derrière un arbre). Les profondeurs fixes (sol, pénombre, lueurs, invite) sont dans `DEPTH` (`config.ts`).
- Collisions : toujours au niveau des pieds, jamais sur le sprite entier.
- Cartes : un fichier Tiled `tiled/maps/<id>.tmj` (l'id est le nom du fichier). Un calque de tuiles `ground` (le sol, toutes les cases peintes) et des calques d'objets au nom libre : c'est le **type** de chaque objet qui dit ce que c'est (`Spawn`, `Exit`, ou un objet de `props.json`). Propriétés de la carte : `name` (nom affiché) et `ambient` (pénombre des intérieurs, de 0 à 1). Le jeu de tuiles (`world` ou `interior`) se déduit du `.tsj` que la carte référence : un seul par carte, plus le tileset `props` pour poser les objets. Tuiles retournées, pivotées, intégrées ou redimensionnées : refusées avec un message.
- Nouvelle carte : on **esquisse**, puis on retouche dans Tiled. `tiled/sketches/<id>.json` décrit la carte en lettres (sol et objets, une lettre par case, `spawns` et `exits` en cases : l'ancien format de carte) ; la légende des lettres (lettre de sol -> tuiles ou terrain à raccord automatique, lettre d'objet -> clé de `props.json` et ancrage `center` ou `left`) est dans `tiled/sketch-legend.json`. `npm run sketch -- <id>` écrit `tiled/maps/<id>.tmj` (raccords automatiques, variantes au hasard stables, objets ancrés), puis on ouvre le résultat dans Tiled (`open -a Tiled tiled/xeros.tiled-project tiled/maps/<id>.tmj`). L'outil refuse d'écrire si le `.tmj` existe : l'esquisse ne sert qu'à la naissance, ensuite c'est le `.tmj` qui fait foi (les esquisses ne sont pas committées). Une lettre inconnue donne un message avec la lettre et sa position. `npm run test`, lancé par `npm run build`, repasse les anciennes cartes ferme et maison (fixtures) dans l'outil et exige les mêmes calques, objets, points et sorties que des copies figées de leurs `.tmj`.
- Le sol est peint avec son rendu final (pinceau terrain de Tiled) : le jeu affiche les tuiles telles quelles. Seuls les détails au hasard (touffes, paille…, `decals` de `tiles.json`) sont posés en jeu, de façon stable.
- Objets : type = clé de `props.json` (identifiant anglais en kebab-case : `tree`, `woodpile` ; son champ `name` est le nom affiché, en français), position au pixel (coin bas gauche de l'image : c'est aussi la profondeur d'affichage). Champ `interact` facultatif pour changer le dialogue de cet exemplaire.
- Points d'apparition : un point de type `Spawn`, son **nom** est son identifiant, `facing` facultatif. Position = les pieds du joueur.
- Personnages non joueurs : un point de type `Npc` (position = ses pieds), propriétés `character` (clé de `characters.json`, qui est aussi la clé de son sprite : il lui faut les animations `idle-down/up/left/right`), `dialogue` (clé de `dialogues.json`) et `facing` facultatif (`down` par défaut). Il est immobile, bloque le passage par ses pieds, se tourne vers Xéros pendant le dialogue puis reprend sa direction. `build-maps` le traduit en `npcs` de la carte ; `validate.ts` vérifie le personnage, le dialogue et les animations (message : carte, personnage, position). Pas encore de déplacement ni de journée type : un contrôleur d'IA viendra se brancher sur le même `Actor`.
- Sorties : un rectangle de type `Exit` (`to` = carte, `spawn` = point d'arrivée, `facing` facultatif). On la prend quand les pieds sont dedans, en avançant dans la direction `facing` si elle est donnée. C'est le premier type de zone ; d'autres suivront.
- Les tilesets de `tiled/tilesets/` et le fichier projet sont **générés** par `build-art` : on ne les modifie jamais dans Tiled (ils seraient réécrits). Pour changer une tuile ou un objet : `art/`, `tiles.json` ou `props.json`, puis `npm run art`.
- Numéros de tuiles : `art/tile-registry.json` (committé) donne à chaque tuile sa place, et les `.tmj` stockent ces numéros. Une tuile nouvelle est ajoutée en fin de liste par `npm run art` (committer le fichier) ; une tuile retirée de `art/` laisse un trou et ne peut plus être posée ; ne jamais réordonner. Renommer une tuile = changer son nom dans le registre **et** dans `art/`, à la même position.
- Départ de la partie : `START` dans `config.ts`.
- Raccords automatiques : clôtures, chemins, eau et cloisons (intérieur) sont des **terrains** (`terrains` de `tiles.json`) : une famille de 16 tuiles `<terrain>-<masque>` (masque N=1 E=2 S=4 O=8, un bit à 1 = le voisin est du même terrain). Dans le tileset de Tiled, chacun devient un ensemble Wang de type bord à deux couleurs : le terrain et « autre ». Une arête à 0 voudrait dire « indifférente » pour Tiled : elle n'est jamais utilisée, une arête absente du masque prend la couleur « autre », et les 16 `wangid` sont tous différents (vérifié par `build-art`). Limites connues : la cloison ne se raccorde pas d'elle-même aux murs, on pose la tuile d'accroche à la main ; en bord de carte, c'est le pinceau de Tiled qui choisit la tuile (une arête sans voisin), alors que l'ancien code comptait « hors de la carte » comme du même terrain : vérifier à l'œil les chemins qui sortent de l'écran.
- Objets (`props.json`) : `bodies` pour des collisions de forme libre, `anim` pour un objet animé (feu), `smoke` et `light` pour la fumée et les lueurs. Les collisions restent ici, pas dans Tiled.
- Tuiles (`tiles.json`) : `solid` (bloque le passage), `decals` (nom d'un ensemble de détails au hasard) et `terrains`. Les propriétés `solid` et `decals` apparaissent aussi comme propriétés de tuile dans le tileset de Tiled.
- Interactions : un objet de `props.json` avec `"interact": "<id>"` lance le dialogue `<id>` de `dialogues.json`.
- Objets possédables (`items.json`) : clé en anglais kebab-case, `name` en français, `icon` (`item-<clé>`, 16×16), `kind` (`tool`, `weapon`, `resource`), `stack` (nombre maximal par case). Un objet au sol se ramasse avec E, un par un.
- Récolte : un objet de `props.json` avec un composant `harvest` (`tool` : objet de `items.json` de type `tool`, absent = à la main avec E ; `hits` ; `fall` : planche et animation de fin, dessinée vers la droite, avec son décalage `x`, `y` par rapport à l'objet et `foot`, la colonne du pied : l'objet tombe du côté opposé à Xéros, et vers la gauche le jeu retourne la chute et le remplaçant autour du pied ; `becomes` : objet qui le remplace, à `at` près ; `drops` : `item`, `min`, `max`, et `give` pour le donner directement à l'inventaire au lieu de le lâcher au sol ; `spawns` : objets qui naissent à la fin, posés par rapport à l'objet pour une chute vers la droite et retournés autour du pied vers la gauche ; `gesture` : `use`, de côté, sur ce qui est debout, ou `chop`, de haut en bas, sur ce qui est couché ou posé). `aim` (dans l'objet) : le point visé, l'encoche d'une section de tronc ; Xéros vise ce point et l'invite s'y affiche (« Espace » quand l'outil en main convient). `impact` : matière frappée (`wood`, `stone`, `leaves`), dont les éclats (planche `fx-<matière>`, 4 variantes 8×8) jaillissent à chaque coup. Un seul système pour tout : `systems/harvest.ts`. L'objet tremble à chaque coup ; sans le bon outil, un message court le dit.
- Gestes d'outil : une entrée de `gestures.json` par geste (`use`, `chop`). Le corps joue `<geste>-<direction>` (4 images, la gauche en miroir) ; l'outil en main est l'animation `<geste>-down/up/right` de la planche `tool-<objet>`, prise du manche au centre de chaque image, posée sur la main d'après les poses du geste (`dx`, `dy` depuis les pieds, `behind`, `ahead` : l'outil passe devant ce qui est frappé au sud des pieds ; `impact` = l'image où le coup porte). Le jeu prend les images d'outil par nom d'animation. **Ajouter un outil = ses deux dessins dans `art/items/held.ts`**, qui en tire toutes les poses de tous les gestes ; `validate.ts` exige chaque geste dans chaque planche `tool-*`. Sans planche, le geste se joue mains vides.
- Abattre un arbre : l'arbre (`harvest` de `tree`) tombe du côté opposé à Xéros, laisse sa souche et fait naître l'arbre couché : 3 sections (`felled-section-1..3`) et le houppier (`felled-crown`, la section de tête sous les feuilles), bout à bout, qui bloquent le passage. La dernière image de `tree-fall` est cet assemblage (`art/world/felled.ts`), pour que rien ne saute. Le houppier, frappé de haut en bas, lâche des branches et devient la tête nue (`felled-head`, chicots) ; chaque section et la tête deviennent une bille (`felled-log`, ≈ 1 m), dans l'ordre qu'on veut. Le portage des billes n'est pas encore fait.
- Dialogues : chaque ligne a un `speaker` (clé de `characters.json`), une `expression` et un `text`. Le portrait affiché est `portrait-<portrait>-64` (une seule taille, `PORTRAIT_SIZE` dans `config.ts`) avec l'animation `<expression>`.
- Rendu : le canvas fait VIEW × ZOOM ; les caméras zooment de ZOOM. Le pixel art garde sa taille, le texte reste net.
