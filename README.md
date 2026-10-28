# Xéros

Jeu d'aventure en pixel art, vue de dessus. On suit Xéros, jeune paysan d'un petit village, qui découvre le monde au fil de ses péripéties. Ton médiéval fantastique, terre à terre.

Phaser 3 + TypeScript + Vite. Tuiles 32×32.

## Lancer

```bash
npm install
npm run dev            # http://localhost:5173  (?debug pour voir les collisions)
npm run art            # art/ -> PNG, manifestes et tilesets Tiled (à lancer une fois avant d'ouvrir Tiled)
npm run maps           # cartes Tiled (tiled/maps/*.tmj) -> src/generated/maps.ts
npm run check          # art, maps, puis vérifie tout le contenu sans lancer le jeu (formats + références croisées)
npm run build          # check, puis build web dans dist/
npm run build:single   # un seul fichier HTML autonome dans dist-single/
npm run art:preview    # régénère les sprites + aperçus x4 dans .art-preview/
```

Les cartes se font dans [Tiled](https://www.mapeditor.org/) : ouvrir `tiled/xeros.tiled-project`. Après une modification d'une carte, relancer `npm run dev` (ou `npm run maps`) pour la voir en jeu.

Commandes : ZQSD, WASD ou flèches. Maj pour courir. E (ou Espace, Entrée) pour interagir et faire défiler un dialogue. P pendant un dialogue : change la taille du portrait (comparaison 96 / 64 / 64×2).

## Architecture

```
art/                 sources du pixel art (grilles de caractères + générateurs)
  tile-registry.json numéros de tuiles, committé (voir Conventions : ne jamais renuméroter)
  palette.ts         palette commune
  characters/        personnages (xeros.ts)
  portraits/         portraits de dialogue (une animation = une expression)
  ui/                cadre de dialogue, flèche, touche E
  world/             tuiles et objets du décor extérieur, chaumière
  interior/          tuiles et mobilier de l'intérieur
tiled/               les cartes, faites avec Tiled
  xeros.tiled-project  projet Tiled (généré par build-art, committé) : types d'objets de props.json, Spawn, Exit
  maps/              les cartes (.tmj), éditées dans Tiled
  tilesets/          tilesets (.tsj + PNG) générés par build-art, ignorés par git, jamais édités
tools/build-art.ts   art/ -> PNG + manifestes dans src/generated/, tilesets et projet dans tiled/ (jamais édités à la main)
tools/build-maps.ts  tiled/maps/*.tmj -> src/generated/maps.ts, au format interne (MapSchema) ; lit Tiled, le jeu non
tools/lib/           registre de tuiles, fichiers Tiled générés, schémas Zod du format Tiled
tools/check.ts       npm run check : vérifie le contenu contre ce que art/ a produit
src/
  config.ts          constantes de gameplay (taille de tuile, vitesses, profondeurs d'affichage)
  events.ts          noms des événements échangés entre scènes
  content/           le contenu du jeu, en JSON : tuiles (propriétés), objets, personnages, dialogues
    types.ts         formats du contenu (schémas Zod = types TypeScript + vérification), dont le format interne des cartes
    validate.ts      vérifications croisées (une sortie vers une carte qui existe, une image dessinée...)
  world/GameMap.ts   construit une carte jouable à partir d'une MapData
  systems/           une mécanique du monde par fichier : interactions, sorties...
  entities/Actor.ts  le corps d'un personnage (sprite, collision, animations)
  entities/Player.ts Actor + clavier
  input/             lecture du clavier
  scenes/            Boot (chargement), World (la carte en jeu), Dialogue (par-dessus le monde)
```

### Comment tourne une image du monde

`WorldScene` assemble la carte, le joueur et les systèmes, puis arbitre selon son **mode** (`play`, `dialogue`, `transition`) : un seul à la fois. Chaque système fait une chose et rend son résultat à la scène (`InteractionSystem` dit quel objet a été utilisé, `findExit` dit quelle sortie est prise) ; c'est la scène qui décide quoi en faire. Une nouvelle mécanique = un fichier dans `systems/` + quelques lignes dans `WorldScene.update`.

Entre scènes, on passe par le bus du jeu avec les noms de `events.ts` (ex. `GameEvent.DialogueEnd`). À l'intérieur d'une scène, pas d'événements : des appels directs, plus faciles à suivre.

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
- Le sol est peint avec son rendu final (pinceau terrain de Tiled) : le jeu affiche les tuiles telles quelles. Seuls les détails au hasard (touffes, paille…, `decals` de `tiles.json`) sont posés en jeu, de façon stable.
- Objets : type = clé de `props.json`, position au pixel (coin bas gauche de l'image : c'est aussi la profondeur d'affichage). Champ `interact` facultatif pour changer le dialogue de cet exemplaire.
- Points d'apparition : un point de type `Spawn`, son **nom** est son identifiant, `facing` facultatif. Position = les pieds du joueur.
- Sorties : un rectangle de type `Exit` (`to` = carte, `spawn` = point d'arrivée, `facing` facultatif). On la prend quand les pieds sont dedans, en avançant dans la direction `facing` si elle est donnée. C'est le premier type de zone ; d'autres suivront.
- Les tilesets de `tiled/tilesets/` et le fichier projet sont **générés** par `build-art` : on ne les modifie jamais dans Tiled (ils seraient réécrits). Pour changer une tuile ou un objet : `art/`, `tiles.json` ou `props.json`, puis `npm run art`.
- Numéros de tuiles : `art/tile-registry.json` (committé) donne à chaque tuile sa place, et les `.tmj` stockent ces numéros. Une tuile nouvelle est ajoutée en fin de liste par `npm run art` (committer le fichier) ; une tuile retirée de `art/` laisse un trou et ne peut plus être posée ; ne jamais réordonner. Renommer une tuile = changer son nom dans le registre **et** dans `art/`, à la même position.
- Départ de la partie : `START` dans `config.ts`.
- Raccords automatiques : clôtures, chemins, eau et cloisons (intérieur) sont des **terrains** (`terrains` de `tiles.json`) : une famille de 16 tuiles `<terrain>-<masque>` (masque N=1 E=2 S=4 O=8, un bit à 1 = le voisin est du même terrain). Dans le tileset de Tiled, chacun devient un ensemble Wang de type bord à deux couleurs : le terrain et « autre ». Une arête à 0 voudrait dire « indifférente » pour Tiled : elle n'est jamais utilisée, une arête absente du masque prend la couleur « autre », et les 16 `wangid` sont tous différents (vérifié par `build-art`). Limite connue : la cloison ne se raccorde pas d'elle-même aux murs, on pose la tuile d'accroche à la main.
- Objets (`props.json`) : `bodies` pour des collisions de forme libre, `anim` pour un objet animé (feu), `smoke` et `light` pour la fumée et les lueurs. Les collisions restent ici, pas dans Tiled.
- Tuiles (`tiles.json`) : `solid` (bloque le passage), `decals` (nom d'un ensemble de détails au hasard) et `terrains`. Les propriétés `solid` et `decals` apparaissent aussi comme propriétés de tuile dans le tileset de Tiled.
- Interactions : un objet de `props.json` avec `"interact": "<id>"` lance le dialogue `<id>` de `dialogues.json`.
- Dialogues : chaque ligne a un `speaker` (clé de `characters.json`), une `expression` et un `text`. Le portrait affiché est `portrait-<portrait>-<taille>` avec l'animation `<expression>`.
- Rendu : le canvas fait VIEW × ZOOM ; les caméras zooment de ZOOM. Le pixel art garde sa taille, le texte reste net.
