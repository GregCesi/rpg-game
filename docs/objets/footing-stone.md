# Dé de pierre (`footing-stone`)

## Identité
- Clé : `footing-stone`.
- Nom affiché : dé de pierre.
- Nature : objet du monde (`props.json`), sans `take` : une pièce de bâtiment. Il n'est plus posé dans Tiled : il naît quand Xéros
  pose une pierre plate (`flat-stone`) sur une place de l'étape « les dés » du plan (`plans.json`, `woodshed`). Il resservira sous
  les poteaux de la cabane.
- Mains : aucune (il ne se prend pas : c'est la pierre plate qu'on porte).

## Dimensions (gabarit)
- Pierre plate, à peu près cubique, posée à plat : **40 × 40 cm**, 15 cm de haut, contour compris (30 × 30 jusqu'au 31 octobre 2026 : le poteau debout fait maintenant 8 px de large, l'épaisseur de la poutre couchée, STYLE.md section 8, et doit tenir sur son dé sans déborder ; 45 cm auraient donné 79 kg, plus que Xéros ne porte).
- Boîte (`box`).
- À l'écran : W = 8 px ; H + D/2 = 3 + 4 = **7 px** : **8 × 7**, le dessus en 4 rangées, la face sud en 3.
- Il isole le poteau de l'humidité du sol : le bois ne pourrit pas par le pied.
- Sous l'abri : quatre dés, aux coins d'un rectangle de 61 px (3,05 m) d'est en ouest et 71 px (3,55 m) du nord au sud,
  d'axe en axe (le rang sud reculé pour la pente de 20° du toit). Dans `plans.json` (`woodshed`, en cm depuis le piquet
  nord-ouest, coin bas gauche de l'image) : (-20, 20), (285, 20), (285, 375), (-20, 375). `validate.ts` vérifie que le poteau
  tient sur son dé.

## Masse
- Pas déplaçable une fois posé : pas de masse. La pierre plate dont il naît pèse 62,4 kg (40 × 40 × 15 cm × 2 600 kg/m³ :
  [pierre plate](flat-stone.md)).

## Vues
- Au sol : `footing-stone`, 8 × 7 px, pierre de la palette (`R r z Z`), dessus clair, face sud plus sombre, un coin
  émoussé, jamais un œuf ; ombre portée `x` dessous, à droite.
- En main, case d'interface, fantôme, porté : aucun (il ne se prend pas encore).
- Sous un poteau : le poteau (8 px de large comme le dé) se dessine par-dessus, son pied sur le dessus du dé ; on voit
  encore les rangées de devant du dessus et la face sud.

## Regroupement
Seul. Quatre par abri, un sous chaque poteau.

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Naît d'une pierre plate posée sur une place du chantier (E, la pierre portée à deux mains), la pierre trouvée sur la berge de la
ferme. Le piquet du coin est arraché au même moment.

## Devenir
Reste sous son poteau. Ne bloque pas le passage (seul le poteau bloque) ; il est dessiné à plat sous les personnages
(`layer: floor`), comme ce qui dépasse à peine du sol.

## Vérification
- Aperçu : `.art-preview/footing-stone.png`, `.art-preview/woodshed-1.png` (les quatre dés en place, d'après le plan), à côté de
  `gabarit.png` (le cube de 50 cm est un peu plus grand).
- En jeu : marcher sur un dé sans être arrêté ; il reste sous les pieds de Xéros.
