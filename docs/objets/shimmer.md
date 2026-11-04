# Miroitement (`shimmer`)

Le miroitement magique le long d'une coupure de l'eau, au ras du liseré (`water-cut`) : de courts traits de lumière qui naissent,
s'étirent et s'éteignent en glissant (chantier « relief », 4 novembre 2026). Discret ; sa force se jugera en jeu.

## Identité
- Clé : `shimmer` (`props.json`, type de l'objet dans Tiled), posé en segments bout à bout le long de la coupure.
- Nom affiché : miroitement.
- Nature : objet du monde, à plat, animé (`anim` : `shimmer`, 4 images, 5 par seconde, en boucle, comme la bougie), fixe, sans `take`,
  sans corps.
- Mains : ne se prend pas. Âge : non.

## Masse
- Aucune : c'est de la lumière.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Un segment : 160 cm de long, 15 cm de large ; à plat (`flat`) : **32 × 3 px** à chaque image (les deux bouts et les rangées du haut
  et du bas portent chacun un éclat, pour que la silhouette soit pleine).

## Vues
- Symétrie : deux vues (`symmetric`) : `shimmer` (coupure est-ouest) et `shimmer-ns` (3 × 32, coupure nord-sud). Le dessin est
  symétrique d'un bord à l'autre (la rangée du milieu porte la lumière) : la même vue sert au nord et au sud de l'eau.
- Le dessin : `W` (eau claire) et `a` (le cœur du trait), sur fond transparent ; deux traits par segment, décalés d'une demi-boucle ;
  un fil discret qui ondule entre eux.
- Animation : 4 images (naissant, plein, étiré, éteint), dans la planche `shimmer` (et `shimmer-ns`).

## Variantes naturelles
Aucune.

## Regroupement
En segments bout à bout.

## Gestes
Aucun.

## Travail
Aucun.

## Arme
Aucune.

## Origine
Posé dans la carte de la ferme, le long des deux coupures de la rivière.

## Devenir
Il reste (plus tard, peut-être : il s'éteint quand le sort qui retient l'eau se défait).

## Transformations
Aucune.

## Métier
Aucun.

## Vérification
- Aperçu : `.art-preview/relief-final-1-matieres.png` (les 4 images, x4, et en longueur), `.art-preview/relief-final-4-coupure.png`.
- En jeu : le long de la coupure, de petits éclats glissent sur l'eau ; à juger : trop fort, trop faible.
