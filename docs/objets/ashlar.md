# Pierre de taille (`ashlar`)

## Identité
- Clé : `ashlar` ; images au sol `ashlar-ground`, `ashlar-ground-ns`.
- Nom affiché : pierre de taille.
- Nature : objet possédable (`items.json`, `kind: resource`).
- Mains : deux (`carry`).

## Masse
- Calculée : 40 × 20 × 15 cm, pleine (`fill` 1), × 2 600 kg/m³ = **31,2 kg**, moins que le moellon d'où elle sort (35,4 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- 40 × 20 × 15 cm : la longueur et la largeur sur la grille de 20 cm, l'assise de 15 cm (le moellon a perdu ses bosses et 5 cm de lit en dressant ses faces).
- À l'écran : **8 × 5** est-ouest, **5 × 8** nord-sud (règle D).

## Vues
- Symétrie : `symmetric`, couchée. R la tourne.
- Au sol : faces planes, arêtes vives, fines traces de layage sur la face sud, dessus en pierre fraîche (teinte `1` de la palette du dessin, plus claire). Elle se distingue du moellon au premier coup d'œil.
- En main : `held-ashlar` (`carry`). Case : `item-ashlar`. Fantôme : sa vue.

## Variantes naturelles
Aucune : parfaitement régulière, c'est tout le travail du tailleur.

## Regroupement
En tas : genre `ashlars`, rangées de 3 sur 3 (9). Bloque dès la première.

## Gestes
Ceux du moellon : E prendre, poser à son fantôme, R tourner.

## Origine
Taillée dans un moellon, au ciseau et au maillet. S'achète au maçon.

## Devenir
Les chaînes d'angle, le jambage et le manteau de la cheminée (à venir avec le plan de la maison).

## Transformations
- `dress-ashlar` : moellon → pierre de taille ; déchet : éclats et poussière de taille (4,2 kg), au sol ; outils : ciseau de tailleur, maillet ; poste : sol ; geste à venir.

## Métier
Maçon (`mason`), le tailleur de pierre du village.

## Vérification
- Aperçu : `briques.png`, `piles.png`, `couches.png`.
- En jeu : ?dieu « Transformer » (`dress-ashlar`) sur un moellon tenu. `npm run test:briques`.
