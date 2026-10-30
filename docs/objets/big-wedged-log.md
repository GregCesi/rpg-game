# Bille coin planté (`big-wedged-log`, `big-wedged-log-ns`)

La grosse bille (95 × Ø 55 cm, 203 kg) dans laquelle on a planté le coin, puis qu'on frappe à la masse. Elle sert aussi pour la demi-bille (`big-wedged-half-log`, `-ns`, voir `big-half-log.md`), dont les images suivent les mêmes règles.

## Identité
- Clés : `big-wedged-log` (est-ouest), `big-wedged-log-ns` (nord-sud). Étapes : `<clé>-n1`, `<clé>-n2`, `<clé>-n3`.
- Nom affiché : bille fendue (coin planté).
- Nature : objet du monde (`props.json`), sans `take` ni `roll` : une bille coin planté ne se porte pas et ne roule pas.
- Mains : sans objet.

## Masse
- 203 kg comme la bille dont elle vient (`mass: wood`, elle ne se prend pas : sans effet).

## Dimensions (gabarit)
- Comme la bille : 95 × 65 × 65 cm, cylindre `ew` (19 × 13 px de silhouette) ; nord-sud : 65 × 95 × 65 cm, cylindre `ns` (13 × 19 px). Le coin dépasse d'au plus 2 px au-dessus de la silhouette (tolérance du gabarit : 2 px).
- Images de 19 × 16 px (est-ouest : silhouette en haut à gauche, 3 rangées vides dessous, comme `big-felled-log-1`) et de 14 × 21 px (nord-sud : comme `big-felled-log-ns`), éventuellement plus hautes de 2 px pour le coin ; le bas de l'image et son coin gauche restent ceux de la bille, pour que rien ne bouge au remplacement.
- Collision identique à la bille : 19 × 10, 3 px sous le bas (est-ouest) ; 12 × 17, 2 px (nord-sud).

## Vues
Quatre images par sens, de la même taille, qui se suivent :
- `<clé>` : le coin planté sur le dessus, au milieu, dans le sens de la longueur (fer sombre, 1 à 2 px de haut, la tête plate visible) ; pas de fente.
- `<clé>-n1` : après un coup, une fente courte sort du coin, le coin s'est enfoncé d'un demi-pixel.
- `<clé>-n2` : après deux coups, la fente a gagné la moitié de la longueur, le coin est presque enfoncé.
- `<clé>-n3` : après trois coups, la fente traverse toute la longueur et le bois commence à s'ouvrir (image montrée une fraction de seconde avant les deux demi-billes).
Chaque image est éclairée en haut à gauche, dans la matière de `wood.ts` (`BIG_WOOD`), avec les fibres de la bille ordinaire. Il n'y a pas de version « vers la gauche » : une bille qu'on plante perd son sens de chute.

## Regroupement
Seule. Ne s'entrepose pas.

## Gestes
- Espace avec la masse : un coup (Xéros au contact, tourné vers elle, d'où il veut) ; trois coups pour fendre.
- Espace avec la hache : « Trop grosse pour la hache. Il faut le coin et la masse. »
- Espace avec le coin : « Le coin est déjà planté. »
- E : rien.

## Origine
Une grosse bille (`big-felled-log`, `-1` à `-4`, `-ns`) sur laquelle on plante le coin. Les billes de l'arbre normal ne se fendent pas.

## Devenir
Au troisième coup : deux demi-billes (`big-half-log`, `big-half-log-ns`) côte à côte à la place de la bille, et le coin tombe au sol à côté.

## Vérification
- Aperçu : `.art-preview/fendage.png` (la bille, le coin, les trois fentes, les demi-billes).
- En jeu : planter, frapper trois fois ; quitter la carte entre deux coups : la fente est restée.
