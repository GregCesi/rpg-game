# Quartier (`big-quarter-log`, `big-quarter-log-ns`)

## Identité
- Clés : `big-quarter-log` (est-ouest), `big-quarter-log-ns` (nord-sud). Genre de tas : `big-quarters`.
- Nom affiché : quartier de bille.
- Nature : objet du monde qui se prend (`props.json`, avec `take`). Le nord-sud est la forme tournée (R) du même quartier.
- Mains : deux.

## Masse
- Un quart de la bille : `mass: { "share": 0.25, "of": "big-felled-log" }`, soit environ 51 kg (50,8). Au-dessous de 70 kg : se porte ; au-dessus de 25 kg : marche ralentie, pas de course, l'endurance paie le surplus (0,034 point par kg et par seconde).

## Dimensions (gabarit)
- Un quart de cylindre couché : 95 × 33 × 33 cm (est-ouest) ou 33 × 95 × 33 cm (nord-sud), boîte. À l'écran : 19 × 10 px (est-ouest : 33 / 5 + 33 / 10) ; 7 × 16 px (nord-sud : largeur 33 / 5, hauteur 33 / 5 + 95 / 10).
- Images : est-ouest 19 × 12 px (silhouette en haut à gauche, 2 rangées vides dessous), nord-sud 8 × 18 px (une colonne et 2 rangées vides) ; collisions : 19 × 5 à 2 px du bas (est-ouest : deux quartiers tiennent dans les 10 px de la demi-bille), 6 × 15 à 2 px du bas (nord-sud).
- Section : un quart de disque, une face plate en haut (celle de la demi-bille d'où il vient), une face plate de côté (la fente), le dos arrondi d'écorce.

## Vues
- Au sol (`big-quarter-log`, `big-quarter-log-ns`) : le dessus plat blond, le bout en quart de disque (visible en nord-sud, de face).
- Case d'interface (`item-big-quarter-log`, 16 × 16) : le quartier vu de biais, comme l'icône des billes.
- Porté à deux mains (`held-big-quarter-log`, posture `carry`, vues `down`, `up`, `right` ; la gauche est le miroir) : devant lui, comme une bille, en plus petit.
- Fantôme (tas) : l'image au sol de la place visée.
- Dans un tas : le même dessin à chaque place (comme les billes), pièce du tas `big-quarters`.

## Regroupement
Tas `big-quarters` (`piles.json`) : 3 au sol côte à côte, 2 dans les creux, 1 au sommet (6), est-ouest ou nord-sud (forme `turned`), comme les billes. Les genres ne se mélangent pas.

## Gestes
- E : prendre (mains libres), ou reprendre la pièce la plus haute d'un tas.
- Q (A en AZERTY), ou E à deux mains : poser, en tas.
- R en main : tourner le quartier (est-ouest, nord-sud) ; le fantôme suit.

## Origine
Née d'une demi-bille coin planté, au troisième coup de masse.

## Devenir
Rangé en tas. Plus tard : refendu en bûches sur le billot.

## Vérification
- Aperçu : `.art-preview/fendage.png`, `.art-preview/piles.png` (tas de quartiers).
- En jeu : fendre, prendre un quartier, R, le poser, en empiler six.
