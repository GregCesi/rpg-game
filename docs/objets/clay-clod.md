# Motte de terre (`clay-clod`)

## Identité
- Clé : `clay-clod` ; images au sol `clay-clod-ground`, `clay-clod-ground-b`.
- Nom affiché : motte de terre.
- Nature : objet possédable (`items.json`, `kind: resource`) : une motte d'argile grasse tranchée à la bêche.
- Mains : deux (`carry`) : 14 kg de terre mouillée se portent serrés contre soi.

## Masse
- Calculée par la matière : 20 × 20 × 20 cm × 1 800 kg/m³ (terre crue, `matters.json`) = **14,4 kg** à sa taille type, de 11,6 à 17,6 kg. Marche normale.

## Dimensions (gabarit, docs/STYLE.md section 8)
- L'unité de terre : ~20 × 20 × 20 cm, une boîte.
- À l'écran : 4 × 6 px, agrandie au plancher de lisibilité : **6 × 9** (forme a), **6 × 8** (forme b, couchée).

## Vues
- Symétrie : ronde (une motte n'a pas de sens ; ses deux formes jouent ses côtés). R ne la tourne pas.
- Au sol : forme a debout, le haut arraché, une arête claire du coup de bêche, la face tranchée mate ; forme b couchée, la face tranchée en biais dessus avec un luisant. Teinte ocre (rampe de la terre `U u n e`).
- En main : `held-clay-clod` (`carry`). Case : `item-clay-clod`. Fantôme : sa forme, en transparence.

## Variantes naturelles
Deux formes, ± 7 % (`natural: {forms: 2, vary: 7}`) : la bêche ne tranche jamais deux fois la même motte.

## Regroupement
En tas : genre `clay-clods`, pyramide de 6, formes alternées ; bloque à 3.

## Gestes
E prendre, poser à son fantôme (un tas naît contre une motte seule) ; Espace, R, E maintenu : rien.

## Origine
Creusée à la bêche au bord de l'étang (l'argile de la berge), geste à venir : ?dieu « Transformer » (`dig-clay`) la fait naître.

## Devenir
Mêlée en torchis (avec la paille et l'eau) ou gâchée en mortier (avec l'eau) ; plus tard, le remplissage des murs, le solin.

## Transformations
- `dig-clay` : la terre prise au poste (18 kg) → motte de terre ; outil : bêche ; poste : bord de l'étang ; geste à venir.
- `mix-mortar` : 2 mottes + un seau d'eau → une gâchée de mortier + le seau vide ; déchet : eau en trop et terre restée au seau (elle s'égoutte) ; outil : bêche ; poste : sol ; geste à venir.
- `mix-cob` : 3 mottes + une gerbe de paille + un seau d'eau → 3 mottes de torchis + le seau vide ; déchet : eau et paille en trop (restent dans la fosse) ; poste : sol ; geste à venir.

## Métier
Terrassier (`digger`).

## Vérification
- Aperçu : `briques.png` (groupe 2), `piles.png`.
- En jeu : ?dieu « Au sol » trois mottes, « Transformer ». `npm run test:briques`.
