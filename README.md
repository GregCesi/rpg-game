# Xéros

Jeu d'aventure en pixel art, vue de dessus. On suit Xéros, jeune paysan d'un petit village, qui découvre le monde au fil de ses péripéties. Ton médiéval fantastique, terre à terre.

Phaser 3 + TypeScript + Vite. Tuiles 32×32.

## Lancer

```bash
npm install
npm run dev            # http://localhost:5173  (?debug pour voir les collisions)
npm run build          # build web dans dist/
npm run build:single   # un seul fichier HTML autonome dans dist-single/
npm run art:preview    # régénère les sprites + aperçus x4 dans .art-preview/
```

Commandes : ZQSD, WASD ou flèches. Maj pour courir. E (ou Espace, Entrée) pour interagir et faire défiler un dialogue. P pendant un dialogue : change la taille du portrait (comparaison 96 / 64 / 64×2).

## Architecture

```
art/                 sources du pixel art (grilles de caractères + générateurs)
  palette.ts         palette commune
  characters/        personnages (xeros.ts)
  portraits/         portraits de dialogue (une animation = une expression)
  ui/                cadre de dialogue, flèche, touche E
  world/             tuiles et objets du décor extérieur, chaumière
  interior/          tuiles et mobilier de l'intérieur
tools/build-art.ts   art/ -> PNG + manifeste dans src/generated/ (jamais édité à la main)
src/
  config.ts          constantes de gameplay (taille de tuile, vitesses)
  content/           le contenu du jeu, en JSON : cartes, tuiles, objets, personnages, dialogues
  world/GameMap.ts   construit une carte jouable à partir d'une MapDef
  entities/Actor.ts  le corps d'un personnage (sprite, collision, animations)
  entities/Player.ts Actor + clavier
  input/             lecture du clavier
  scenes/            Boot (chargement), World (la carte en jeu), Dialogue (par-dessus le monde)
```

### Les quatre règles

1. **Le contenu est de la donnée.** Une carte, une tuile, un objet, plus tard une quête ou un dialogue : un fichier JSON dans `src/content/`, pas une classe. Le moteur reste petit.
2. **Le pixel art est du texte.** Chaque sprite est une grille de caractères dans `art/`, convertie en PNG au build. On peut remplacer un PNG par un dessin fait à la main sans toucher au jeu : le jeu ne connaît que les clés (`xeros`, `world`, `tree`...).
3. **Composer plutôt qu'hériter.** Un personnage = un `Actor` (le corps) + un contrôleur (clavier, IA de PNJ). Les futures capacités (inventaire, stats, dialogue) seront des composants attachés, pas des sous-classes.
4. **Erreurs lisibles.** Une carte mal saisie ou un sprite de mauvaise taille doit planter avec un message qui dit où.

### Conventions

- Animations : `<skin>-<état>-<direction>`, ex. `xeros-walk-left`. Directions : `down`, `up`, `left`, `right`.
- Ordre d'affichage : profondeur = position y des pieds (le joueur passe derrière un arbre).
- Collisions : toujours au niveau des pieds, jamais sur le sprite entier.
- Cartes : couche `ground` (sol) + couche `props` (objets), même taille, une lettre par case. Légendes dans `tiles.json` (une légende par jeu de tuiles : `world`, `interior`) et `props.json`.
- Une carte déclare son jeu de tuiles (`tileset`), sa pénombre (`ambient`, pour les intérieurs), ses points d'apparition (`spawns`) et ses sorties (`exits` : on change de carte en marchant dans la case en regardant dans la direction donnée).
- Départ de la partie : `START` dans `config.ts`.
- Raccords automatiques : clôtures (`F`), chemins (`=`), eau (`~`) et cloisons (`#` en intérieur) choisissent leur variante (16 combinaisons) selon les voisins.
- Objets (`props.json`) : `align: "left"` pour les grands objets ancrés en bas à gauche (maison, meubles larges), `bodies` pour des collisions de forme libre, `anim` pour un objet animé (feu), `smoke` et `light` pour la fumée et les lueurs.
- Interactions : un objet de `props.json` avec `"interact": "<id>"` lance le dialogue `<id>` de `dialogues.json`.
- Dialogues : chaque ligne a un `speaker` (clé de `characters.json`), une `expression` et un `text`. Le portrait affiché est `portrait-<portrait>-<taille>` avec l'animation `<expression>`.
- Rendu : le canvas fait VIEW × ZOOM ; les caméras zooment de ZOOM. Le pixel art garde sa taille, le texte reste net.
