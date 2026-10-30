# Demi-bille (`big-half-log`, `big-half-log-ns`) et demi-bille coin planté (`big-wedged-half-log`, `-ns`)

## Identité
- Clés : `big-half-log` (est-ouest), `big-half-log-ns` (nord-sud) ; avec le coin : `big-wedged-half-log`, `big-wedged-half-log-ns`, et leurs étapes `-n1`, `-n2`, `-n3`.
- Nom affiché : demi-bille, demi-bille (coin planté).
- Nature : objets du monde (`props.json`), sans `take` ni `roll`. Une demi-bille ne se porte pas (environ 101 kg) et ne roule pas (la face plate).
- Mains : sans objet.

## Masse
- Demi-bille : la moitié de la bille, `mass: { "share": 0.5, "of": "big-felled-log" }`, soit environ 101,5 kg (> 70 kg : ne se porte pas).

## Dimensions (gabarit)
- Un demi-cylindre couché, face plate vers le haut : boîte 95 × 65 × 33 cm (est-ouest) ou 65 × 95 × 33 cm (nord-sud). Silhouette à l'écran : 19 × 13 px (largeur 19, hauteur 33 / 5 + 65 / 10 = 13,1) ; nord-sud 13 × 16 px (largeur 13, hauteur 33 / 5 + 95 / 10 = 16,1).
- Images : est-ouest 19 × 16 px (silhouette en haut à gauche, 3 rangées vides dessous), nord-sud 14 × 18 px (silhouette en haut à gauche, une colonne et 2 rangées vides) ; collisions : 19 × 10 à 3 px du bas (est-ouest), 12 × 15 à 2 px du bas (nord-sud).
- Deux demi-billes naissent côte à côte à la place de la bille : l'une au nord, l'autre au sud (bille est-ouest, décalées de 5 px au sud et 5 px au nord de l'image de la bille), ou l'une à l'ouest, l'autre à l'est (bille nord-sud, ±6 px). Leurs collisions se touchent.

## Vues
- Au sol : le dessus plat blond (bois frais, fibres dans le sens de la longueur), les bords arrondis d'écorce sur le côté sud (est-ouest) ou le bout coupé en demi-lune tourné vers le sud (nord-sud).
- Coin planté : mêmes quatre images que la bille (`<clé>`, `-n1`, `-n2`, `-n3`) : le coin sur la face plate, au milieu, dans le sens de la longueur ; la fente sur la face plate.
- Pas de vue en main, pas de fantôme, pas de tas.

## Regroupement
Seule.

## Gestes
- Espace avec le coin : il se plante (comme sur la bille), la main est libérée.
- Espace avec la masse, coin planté : un coup ; trois coups pour fendre en deux quartiers (`big-quarter-log`).
- Espace avec la hache : « Trop grosse pour la hache. Il faut le coin et la masse. »

## Origine
Née de la bille fendue (`big-wedged-log`) au troisième coup de masse.

## Devenir
Fendue à son tour (coin, trois coups) : deux quartiers côte à côte à sa place, et le coin tombe à côté.

## Vérification
- Aperçu : `.art-preview/fendage.png`.
- En jeu : fendre une bille, constater qu'on ne peut pas prendre une demi-bille, fendre chaque moitié.
