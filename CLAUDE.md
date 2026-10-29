# Xéros — consignes pour les agents de code

Lis `README.md` (architecture et quatre règles) avant toute modification, et `docs/CONCEPTION.md` (univers, personnages, lieux, feuille de route) avant tout travail sur le contenu.

- Ne jamais éditer `src/generated/` ni `tiled/tilesets/` : modifier `art/` ou `src/content/`, puis `npm run art`.
- Ajouter du contenu (propriétés de tuile, objet, personnage, dialogue) = éditer `src/content/` (une tuile se dessine d'abord dans `art/`) ; ne pas coder de contenu en dur dans les scènes.
- Une carte = un fichier Tiled `tiled/maps/<id>.tmj`, traduit par `npm run maps` (le jeu ne lit jamais Tiled). Règles de pose (calque `ground`, types `Spawn`, `Exit`, `Npc`, objets) dans le README.
- Nouvelle carte : esquisse (`tiled/sketches/<id>.json`, lettres), `npm run sketch -- <id>`, puis retouches dans Tiled. Une carte existante ne se refait jamais depuis l'esquisse : le `.tmj` fait foi. Nouvelle lettre = `tiled/sketch-legend.json`.
- Les numéros de tuiles vivent dans `art/tile-registry.json` (committé) : `npm run art` ajoute les nouvelles tuiles en fin de liste ; ne jamais réordonner ni supprimer une entrée, car les .tmj stockent ces numéros.
- Nouvel objet posable : une entrée de `src/content/props.json` ; sa clé (anglais, kebab-case, reprend la clé d'image) est le type de l'objet dans Tiled, `name` est le nom affiché en français.
- Tout dessin (nouveau sprite ou retouche dans `art/`) passe par le sous-agent `pixel-artist` (`.claude/agents/pixel-artist.md`, sur Opus), qui applique `docs/STYLE.md`.
- Nouveau sprite : l'ajouter dans `art/`, le déclarer dans `art/index.ts`, vérifier l'aperçu avec `npm run art:preview` (images dans `.art-preview/`, à regarder).
- Nouvelle capacité de personnage : un composant attaché à `Actor`, pas une sous-classe.
- Nouveau personnage parlant : une entrée de `src/content/characters.json` (clé = clé du sprite ; portrait 64 px seulement, `portrait-<nom>-64`), puis, pour le poser sur une carte, un point Tiled de type `Npc` (`character`, `dialogue`, `facing`) ; ne pas coder de PNJ dans les scènes.
- Nouveau champ de contenu : le déclarer dans `src/content/types.ts` (schéma Zod) ; nouveau lien entre fichiers : le vérifier dans `src/content/validate.ts`.
- Nouvelle mécanique du monde : un fichier dans `src/systems/`, appelé depuis `WorldScene.update` selon le mode. Événements entre scènes : constantes de `src/events.ts`.
- Ce qui change pendant la partie (les deux mains, objet récolté, objet pris ou posé, objet au sol) vit dans `GameState` (`src/state/`), rangé par carte et par identifiant d'objet Tiled ; ne pas le garder dans une scène ni dans le registry de Phaser.
- Nouvel objet possédable : une entrée de `src/content/items.json` (icône `item-<clé>`, `hands` : 2 s'il est lourd ou long). Pas de barre ni de besace : l'inventaire, ce sont les deux mains de `GameState` (`hands`, `both`, `active`), changées par `take`, `release`, `switchHand`.
- Nouvel objet du monde qu'on prend : un composant `take` dans `props.json` (`hands`, `icon`, `hold`), pas de code. Prendre, poser, lâcher : `src/systems/hands.ts`.
- Tout objet tenu se voit sur Xéros (composant `Hold`) : son `hold` (`stance` : `hand`, `shoulder` ou `carry` ; `image` : planche `held-<…>` de `art/items/carried.ts`, vues `down`, `up`, `right`, dessinée par le pixel-artist) ; les points d'accroche par posture et par image sont dans `src/content/hold.json`, tirés des constantes `HAND_POINTS`, `SHOULDER_POINTS`, `CARRY_HANDS` de `art/characters/xeros.ts`. Nouvelle posture = ses animations `<posture>-idle/walk-*` et son entrée dans `hold.json`.
- Touches du joueur : lues par leur place (`KeyboardEvent.code`, `src/input/PlayerInput.ts`), jamais par leur lettre : ZQSD en AZERTY = WASD en QWERTY ; lâcher (Q en QWERTY) est le A d'un AZERTY.
- Nouvelle récolte : un composant `harvest` dans `props.json`, pas de code (ce qui naît d'une récolte : `spawns` ; le geste : `gesture`).
- Nouveau geste : une entrée de `src/content/gestures.json`, les animations `<geste>-<direction>` du corps dans `art/characters/xeros.ts` et le geste ajouté à `heldToolSheet` (`art/items/held.ts`) ; le jeu choisit les images d'outil par nom d'animation, jamais par indice.
- Nouvel outil en main, à l'échelle (5 cm par pixel, prise au centre d'images de TOOL_SIZE = 48 px) : cinq dessins en zones de matière et leur table `materials`, déclarés dans `art/items/held.ts` (convention dans l'en-tête de `art/lib/held.ts`). Règle : coup horizontal (`use`), on voit la face de l'outil, de profil (`diag`, `upright`, référence `docs/references/hache-vue-de-cote.png`) ; coup vertical (`chop`), on le voit par la tranche (`flat`, `flatDiag`, `flatEnd`, référence `docs/references/hache-vue-de-dessus.png`). La planche `tool-<objet>` en est tirée pour toutes les poses de `src/content/gestures.json` (champ `base` : le dessin de chaque pose), puis éclairée en haut à gauche par `art/lib/light.ts` ; ne pas toucher aux gestes du corps.
- Fin de tâche : `npm run build` doit passer sans erreur (il lance `npm run check`).
- Langue du code : identifiants en anglais, commentaires et messages d'erreur en français.
