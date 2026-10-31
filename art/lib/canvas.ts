// Outils de dessin pixel art : ils vivent dans src/world/gridCanvas.ts (purs, partagés avec le jeu, qui monte les murs dans le
// navigateur) ; ce fichier les ré-exporte pour tout art/. Une "Grid" est un tableau de lignes de caractères : chaque caractère
// est une couleur de la palette, '.' est transparent.

export * from '../../src/world/gridCanvas';
