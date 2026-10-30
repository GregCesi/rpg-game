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
- Sous l'abri : quatre dés, aux coins d'un rectangle de 61 px (3,05 m) d'est en ouest et 71 px (3,55 m) du nord au sud,
  d'axe en axe (le rang sud reculé pour la pente de 20° du toit). Dans `ferme.tmj` : (607, 70), (668, 70), (607, 141),
  (668, 141), coin bas gauche de l'image de 7 × 7.

## Vues
- Au sol : `footing-stone`, 6 × 6 px, pierre de la palette (`R r z Z`), dessus clair, face sud plus sombre, un coin
  émoussé, jamais un œuf ; ombre portée `x` dessous, à droite.
- En main, case d'interface, fantôme, porté : aucun (il ne se prend pas encore).
- Sous un poteau : le poteau (20 × 20 cm, 4 px) se dessine par-dessus, centré, son pied sur le dessus du dé ; on voit
  encore une colonne de pierre de chaque côté, les rangées de devant du dessus et la face sud.

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
