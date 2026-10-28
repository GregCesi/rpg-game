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

Commandes : ZQSD, WASD ou flèches. Maj pour courir.

## Architecture

```
art/                 sources du pixel art (grilles de caractères + générateurs)
  palette.ts         palette commune
  characters/        personnages (xeros.ts)
  world/             tuiles et objets du décor
tools/build-art.ts   art/ -> PNG + manifeste dans src/generated/ (jamais édité à la main)
src/
  config.ts          constantes de gameplay (taille de tuile, vitesses)
  content/           le contenu du jeu, en JSON : cartes, tuiles, objets
  world/GameMap.ts   construit une carte jouable à partir d'une MapDef
  entities/Actor.ts  le corps d'un personnage (sprite, collision, animations)
  entities/Player.ts Actor + clavier
  input/             lecture du clavier
  scenes/            Boot (chargement) et World (la carte en jeu)
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
- Cartes : couche `ground` (sol) + couche `props` (objets), même taille, une lettre par case. Légendes dans `tiles.json` et `props.json`.
- Clôtures : on écrit `F`, la bonne variante (16 combinaisons) est choisie selon les voisins.
