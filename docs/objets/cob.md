# Motte de torchis (`cob`)

## Identité
- Clé : `cob` ; image au sol `cob-ground`.
- Nom affiché : motte de torchis.
- Nature : objet possédable (`items.json`, `kind: resource`) : terre, paille hachée et eau mêlées, pétries en pâton.
- Mains : deux (`carry`).

## Masse
- Calculée : 20 × 20 × 20 cm × 1 750 kg/m³ (torchis frais) = **14 kg**.

## Dimensions (gabarit, docs/STYLE.md section 8)
- La même unité que la terre, 20 × 20 × 20 cm. À l'écran : **6 × 9** (plancher de lisibilité).

## Vues
- Symétrie : ronde. Au sol : pâton aux coins arrondis, plus clair (rampe du torchis `d D E`), des brins de paille en grappes.
- En main : `held-cob` (`carry`). Case : `item-cob`. Fantôme : son image.

## Variantes naturelles
Aucune : pétri à la main à la mesure de l'unité, une seule forme.

## Regroupement
En tas : genre `cob-clods`, deux rangées de 3 (6), comme des pâtons alignés ; bloque à 3.

## Gestes
E prendre, poser ; le reste : rien.

## Origine
Mêlé au sol, dans la fosse à torchis, en foulant la terre avec la paille et l'eau.

## Devenir
Le remplissage des pans de mur (sur le clayonnage), à venir avec le plan de la maison.

## Transformations
- `mix-cob` : 3 mottes de terre + 1 gerbe de paille + 1 seau d'eau → 3 mottes de torchis + le seau vide ; déchet : eau et paille en trop (≈ 15 kg, restent dans la fosse pour la gâchée suivante) ; poste : sol ; geste à venir.

## Métier
Terrassier (`digger`).

## Vérification
- Aperçu : `briques.png`, `piles.png`. En jeu : `npm run test:briques`.
