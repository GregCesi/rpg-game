# Xéros — consignes pour les agents de code

Lis `README.md` (architecture et quatre règles) avant toute modification.

- Ne jamais éditer `src/generated/` : modifier `art/` puis `npm run art`.
- Ajouter du contenu (carte, tuile, objet) = éditer `src/content/` ; ne pas coder de contenu en dur dans les scènes.
- Nouveau sprite : l'ajouter dans `art/`, le déclarer dans `art/index.ts`, vérifier l'aperçu avec `npm run art:preview` (images dans `.art-preview/`, à regarder).
- Nouvelle capacité de personnage : un composant attaché à `Actor`, pas une sous-classe.
- Fin de tâche : `npm run build` doit passer sans erreur.
- Langue du code : identifiants en anglais, commentaires et messages d'erreur en français.
