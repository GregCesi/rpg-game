// Les roches (chantier « pierre », côté dessin seulement) : une roche est un réglage de la pierre, pas un objet. Une nouvelle
// couleur de pierre = une nouvelle roche (nom, rampe de couleurs, densité, dureté, prix), jamais une nouvelle clé d'objet.
// Les propositions de dessin (art/proposals/pierre-*.ts) prennent leurs couleurs dans la rampe de leur roche. Rien ici n'est
// chargé par le jeu ; à l'intégration, ce réglage deviendra src/content/rocks.json (docs/objets/rough-stone.md, « La roche »).

export interface Rock {
  key: string;
  /** Nom affiché, en français. */
  name: string;
  /** Clés de art/palette.ts (world), de la plus claire à la plus sombre. */
  ramp: string[];
  /** kg/m³. */
  density: number;
  /** Multiplie le nombre de coups d'outil pour tailler (1 = la référence ; un granit vaudrait 3). */
  hardness: number;
  /** Prix relatif (1 = la référence, la moins chère). */
  price: number;
}

/** Calcaire de la carrière : la pierre commune du village, gris clair presque blanc. */
export const limestone: Rock = {
  key: 'limestone',
  name: 'calcaire',
  ramp: ['!', '+', '=', ';', '~'], // cassure fraîche, au soleil, patiné, à l'ombre, fissure
  density: 2400,
  hardness: 1,
  price: 1,
};
