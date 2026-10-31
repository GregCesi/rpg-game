# Moellon (`rubble-stone`)

## Identité
- Clé : `rubble-stone` ; images au sol `rubble-stone-ground` (est-ouest), `rubble-stone-ground-ns` (nord-sud).
- Nom affiché : moellon.
- Nature : objet possédable (`items.json`, `kind: resource`).
- Mains : deux (`carry`).

## Masse
- Calculée : 40 × 20 × 20 cm × 0,85 (faces bosselées, arêtes cassées : la boîte n'est pas pleine) × 2 600 kg/m³ = **35,4 kg**. Porté lentement (au-dessus de 25 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- 40 × 20 × 20 cm, contour compris, sur la grille de 20 cm (une pièce travaillée). Boîte couchée.
- À l'écran : **8 × 6** px est-ouest ; **6 × 8** nord-sud (règle D).

## Vues
- Symétrie : `symmetric`, couché (`lying`) : est-ouest et nord-sud, ses deux bouts se valent. R le tourne d'un quart de tour.
- Au sol : à peu près parallélépipédique, faces bosselées mouchetées, coins rognés, pas lisse.
- En main : `held-rubble-stone` (`carry`, en travers du ventre : l'est-ouest de face et de dos, le bout de profil).
- Case d'interface : `item-rubble-stone`. Fantôme : sa vue, en transparence.

## Variantes naturelles
Aucune : travaillé au têtu, il est régulier à la mesure de ce travail (ses mesures sont celles qu'on vise en dégrossissant ; ses faces restent bosselées).

## Regroupement
En tas : genre `rubble-stones`, rangées de 3 au sol sur 3 de haut (9), comme on les empile au pied du chantier. Bloque dès la première.

## Gestes
- E court : le prendre ; sur un tas, reprendre le plus haut. E dans le vide, Q : le poser à son fantôme. R : le tourner. Espace, E maintenu : rien.

## Origine
Dégrossi dans une grosse pierre brute (ci-dessous). S'achète au carrier.

## Devenir
Il montera le solin et la cheminée de la chaumière, liés au mortier de terre (à venir avec le plan de la maison) ; ou se taille en pierre de taille.

## Transformations
- `dress-rubble` : grosse pierre brute → moellon ; déchet : éclats de pierre, au sol ; outil : têtu ; poste : sol ; geste à venir.
- `dress-ashlar` : moellon → pierre de taille (31,2 kg) ; déchet : éclats et poussière de taille (4,2 kg), au sol ; outils : ciseau et maillet ; poste : sol ; geste à venir.

## Métier
Carrier (`quarryman`), qui dégrossit à la carrière et vend au village.

## Vérification
- Aperçu : `briques.png` (groupe 1 et ses deux chaînes), `piles.png`, `couches.png` (ses deux vues).
- En jeu : ?dieu « Transformer » sur une grosse pierre brute tenue ; en poser deux l'un contre l'autre. `npm run test:briques`.
