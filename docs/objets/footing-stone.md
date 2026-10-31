# Dé de pierre (`footing-stone`)

## Identité
- Clé : `footing-stone`.
- Nom affiché : dé de pierre.
- Nature : objet du monde (`props.json`), sans `take` : une pièce de bâtiment. Il n'est plus posé dans Tiled : il naît quand Xéros
  pose une dalle (`slab`, chantier « pierre », 31 octobre 2026 : elle remplace la pierre plate) sur une place de l'étape « les dés » du plan (`plans.json`, `woodshed`). Il resservira sous
  les poteaux de la cabane.
- Mains : aucune (il ne se prend pas : c'est la dalle qu'on porte).

## Dimensions (gabarit)
- La dalle posée à plat : **45 × 40 cm**, 12 cm d'épaisseur, contour compris (40 × 40 × 15 avec la pierre plate, 30 × 30 avant ; le
  poteau debout fait 8 px de large, l'épaisseur de la poutre couchée, STYLE.md section 8, et tient sur son dé sans déborder).
- Boîte (`box`).
- À l'écran : W = 9 px ; H + D/2 = 2,4 + 4 = 6,4 : **9 × 6 à 9 × 7**, le dessin de la dalle.
- Il isole le poteau de l'humidité du sol : le bois ne pourrit pas par le pied.
- Sous l'abri : quatre dés, aux coins d'un rectangle de 61 px (3,05 m) d'est en ouest et 71 px (3,55 m) du nord au sud,
  d'axe en axe (le rang sud reculé pour la pente de 20° du toit). Dans `plans.json` (`woodshed`, en cm depuis le piquet
  nord-ouest, coin bas gauche de l'image) : (-20, 20), (285, 20), (285, 375), (-20, 375). `validate.ts` vérifie que le poteau
  tient sur son dé.

## Masse
- Pas déplaçable une fois posé : pas de masse. La dalle dont il naît pèse 38,9 kg à sa taille type (de 31,4 à 47,6 kg ; voir la
  [dalle](slab.md)).

## Vues
- Au sol : `footing-stone`, `footing-stone-b` : les dessins de la dalle (`slab`, `slab-b`), calcaire (rampe de rocks.json) ; ombre
  portée `x` dessous, à droite.
- En main, case d'interface, fantôme, porté : aucun (il ne se prend pas encore).
- Sous un poteau : le poteau (8 px de large comme le dé) se dessine par-dessus, son pied sur le dessus du dé ; on voit
  encore les rangées de devant du dessus et la face sud.

## Regroupement
Seul. Quatre par abri, un sous chaque poteau.

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Naît d'une dalle posée sur une place du chantier (E, la dalle portée à deux mains), trouvée sur la berge de la ferme. Le piquet du coin est arraché au même moment.

## Devenir
Reste sous son poteau. Ne bloque pas le passage (seul le poteau bloque) ; il est dessiné à plat sous les personnages
(`layer: floor`), comme ce qui dépasse à peine du sol.

## Variantes naturelles
Les deux formes de la dalle (`footing-stone`, `footing-stone-b`, `natural` de props.json) : le dé est la dalle posée, il garde la
forme et la taille de celle qu'on a apportée (`site.ts`, `lay`). Redessinés le 31 octobre 2026 (chantier « pierre ») : le dessin même
de la dalle.

## Transformations
Aucune.

## Métier
Carrier (la pierre) ; le charpentier le pose.

## Vérification
- Aperçu : `.art-preview/footing-stone.png`, `.art-preview/woodshed-1.png` (les quatre dés en place, d'après le plan), à côté de
  `gabarit.png` (le cube de 50 cm est un peu plus grand).
- En jeu : marcher sur un dé sans être arrêté ; il reste sous les pieds de Xéros.
