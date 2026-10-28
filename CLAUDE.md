# Xéros — consignes pour les agents de code

Lis `README.md` (architecture et quatre règles) avant toute modification, et `docs/CONCEPTION.md` (univers, personnages, lieux, feuille de route) avant tout travail sur le contenu.

- Ne jamais éditer `src/generated/` ni `tiled/tilesets/` : modifier `art/` ou `src/content/`, puis `npm run art`.
- Ajouter du contenu (propriétés de tuile, objet, personnage, dialogue) = éditer `src/content/` (une tuile se dessine d'abord dans `art/`) ; ne pas coder de contenu en dur dans les scènes.
- Une carte = un fichier Tiled `tiled/maps/<id>.tmj`, traduit par `npm run maps` (le jeu ne lit jamais Tiled). Règles de pose (calque `ground`, types `Spawn`, `Exit`, objets) dans le README.
- Nouvelle carte : esquisse (`tiled/sketches/<id>.json`, lettres), `npm run sketch -- <id>`, puis retouches dans Tiled. Une carte existante ne se refait jamais depuis l'esquisse : le `.tmj` fait foi. Nouvelle lettre = `tiled/sketch-legend.json`.
- Les numéros de tuiles vivent dans `art/tile-registry.json` (committé) : `npm run art` ajoute les nouvelles tuiles en fin de liste ; ne jamais réordonner ni supprimer une entrée, car les .tmj stockent ces numéros.
- Nouvel objet posable : une entrée de `src/content/props.json` ; sa clé (anglais, kebab-case, reprend la clé d'image) est le type de l'objet dans Tiled, `name` est le nom affiché en français.
- Nouveau sprite : l'ajouter dans `art/`, le déclarer dans `art/index.ts`, vérifier l'aperçu avec `npm run art:preview` (images dans `.art-preview/`, à regarder).
- Nouvelle capacité de personnage : un composant attaché à `Actor`, pas une sous-classe.
- Nouveau champ de contenu : le déclarer dans `src/content/types.ts` (schéma Zod) ; nouveau lien entre fichiers : le vérifier dans `src/content/validate.ts`.
- Nouvelle mécanique du monde : un fichier dans `src/systems/`, appelé depuis `WorldScene.update` selon le mode. Événements entre scènes : constantes de `src/events.ts`.
- Fin de tâche : `npm run build` doit passer sans erreur (il lance `npm run check`).
- Langue du code : identifiants en anglais, commentaires et messages d'erreur en français.
