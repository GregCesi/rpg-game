# Dé de pierre (`footing-stone`)

## Identité
- Clé : `footing-stone`.
- Nom affiché : dé de pierre.
- Nature : objet du monde (`props.json`), sans `take` : une pièce de bâtiment, posée dans Tiled. Premier geste du chantier
  de l'abri à bois (`buildings.json`, étape « les dés »). Il resservira sous les poteaux de la cabane.
- Mains : aucune pour l'instant (il ne se prend pas).

## Dimensions (gabarit)
- Pierre plate, à peu près cubique, posée à plat : 30 × 30 cm, 15 cm de haut, contour compris.
- Boîte (`box`).
- À l'écran : W = 6 px ; H + D/2 = 3 + 3 = **6 px** : **6 × 6**, le dessus en 3 rangées, la face sud en 3.
- Il isole le poteau de l'humidité du sol : le bois ne pourrit pas par le pied.

## Vues
- Au sol : `footing-stone`, 6 × 6 px, pierre de la palette (`R r z Z`), dessus clair, face sud plus sombre, un coin
  émoussé, jamais un œuf ; ombre portée `x` dessous, à droite.
- En main, case d'interface, fantôme, porté : aucun (il ne se prend pas encore).
- Sous un poteau : le poteau se dessine par-dessus, son pied sur le fond du dessus du dé ; on voit encore les rangées de
  devant du dessus et la face sud.

## Regroupement
Seul. Quatre par abri, un sous chaque poteau.

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Posé dans `ferme.tmj` avec l'abri. Plus tard, ramassé dans les champs (épierrage) ou au rocher, porté et posé de niveau :
pas encore construit.

## Devenir
Reste sous son poteau. Ne bloque pas le passage (seul le poteau bloque) ; il est dessiné à plat sous les personnages
(`layer: floor`), comme ce qui dépasse à peine du sol.

## Vérification
- Aperçu : `.art-preview/footing-stone.png`, `.art-preview/woodshed-1.png` (les quatre dés en place), à côté de
  `gabarit.png` (le cube de 50 cm est un peu plus grand).
- En jeu : marcher sur un dé sans être arrêté ; il reste sous les pieds de Xéros.
