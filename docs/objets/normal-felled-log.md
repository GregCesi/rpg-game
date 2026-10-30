# Rondin (`normal-felled-log`)

Repris le 30 octobre 2026 (équarrissage) : la bille de l'arbre normal n'est plus qu'un rondin court. Le rondin a une longueur
quelconque, de 30 cm au tronc entier (5 m) ; la bille de 95 cm en est un cas, et tout ce qui marchait avec elle marche encore.

## Identité
- Clé : `normal-felled-log` (couché est-ouest), `normal-felled-log-ns` (couché nord-sud). Icône : `item-normal-felled-log`.
  Porté : `held-normal-felled-log`. Les anciennes billes numérotées d'un tronc couché (`normal-felled-log-1..5`) n'existent plus.
- Nom affiché : rondin (masculin, `gender: "m"` : « Trop lourd, il ne bouge pas. »).
- Nature : objet du monde (`props.json`) qui se prend (`take`) quand il n'est pas trop lourd ; bois d'œuvre (`timber`) : sa
  longueur est gardée par la partie.
- Mains : deux.

## Masse
- Calculée à sa longueur (`"mass": "wood"`, `timber`) : section du bois (Ø 30 cm, 40 contour compris) × longueur × 900 kg/m³,
  soit **63,6 kg par mètre** : 19 kg à 30 cm, **60 kg** à 95 cm (la bille), 108 kg à 1,70 m, **191 kg** à 3 m, **318 kg** à 5 m.
- Porté jusqu'à 70 kg (1,10 m) ; roulé jusqu'à 300 kg (4,70 m) ; au-delà (le tronc entier de 5 m), il ne bouge pas : il faut le
  couper d'abord.
- Qu'on l'équarrisse, il perd du bois à chaque face finie (un quart de l'écart entre son rond et le carré de la poutre).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Longueur L quelconque (contour compris), 40 cm de diamètre contour compris (30 cm de bois), cylindre couché.
- Est-ouest : L/5 px de long (+ 1 colonne d'ombre), 8 px de corps et 2 d'ombre : 19 × 8 pour la bille de 95 cm (`dims` 95 × 40 × 40,
  c'est elle que vérifie le gabarit).
- Nord-sud : 8 px de large (+ 1 d'ombre), 17 px de haut à 95 cm, 1 px de plus tous les 10 cm (le dessus vu à ½).
- Collision : est-ouest, (L/5 − 1) × 6 px ; nord-sud, 6 × (L/10 + 3) px (`timberBody`, `src/world/timberShape.ts`).

## Vues
- Au sol : l'image s'assemble à sa longueur en trois parties, bout, milieu répété, bout (`normal-timber` est-ouest,
  `normal-timber-ns` nord-sud, `art/world/timber.ts` ; le jeu l'assemble à la volée, `src/world/timberTexture.ts`) : écorce
  éclairée en haut, sillons en long, face de coupe vers la lumière à gauche (nord-sud : au sud), ombre portée. Jamais retourné.
- Entaillé : la bande d'encoche à sa place (un tiers, deux tiers de profondeur), au décimètre où l'on coupe.
- Équarri en partie : une, deux, trois faces dressées, claires et lisses (voir la [poutre](normal-beam.md)).
- En roulant : 4 images par partie, l'écorce tourne exactement de la distance (un tour = π × 30 cm).
- En main (`held-normal-felled-log`, `carry`) : le même dessin à toute longueur portable (30 cm à 1,10 m).
- Case d'interface : `item-normal-felled-log`, sa longueur écrite en bas de la case (« 0,95 m »).
- Fantôme : seulement pour la bille de 95 cm, qui va en tas.
- Invite de coupe : « Espace » sur la coupe visée et, au-dessus, les deux longueurs qu'elle donnerait (« 2,9 m | 2,4 m »).

## Regroupement
Seul ; en tas (`normal-logs`) seulement la bille de 95 cm ronde (sans face dressée) : 3 au sol, 2 dans les creux, 1 au sommet.

## Gestes
- E court : le prendre à deux mains s'il pèse 70 kg ou moins (sinon « Trop lourd à porter. Pousse-le pour le faire rouler. ») ;
  pas pendant une coupe (« Finis d'abord la coupe. »).
- Pousser (marcher contre lui, mains libres) : il roule perpendiculairement à son axe, s'il pèse 300 kg ou moins, s'il est rond
  (« Il ne roule plus : une face est dressée. ») et pas entaillé.
- R maintenu au contact, mains libres : il pivote d'un quart de tour (est-ouest <-> nord-sud), à toute longueur, s'il a la place.
  R en main : il sera posé dans l'autre sens.
- Espace, la cognée en main, contre son flanc (au nord ou au sud d'un rondin est-ouest, à l'est ou à l'ouest d'un rondin
  nord-sud) : l'encoche se fait là où tombe le fer, arrondie à 10 cm, jamais à moins de 30 cm d'un bout ; deux coups de plus au
  même endroit (le fer retombe dans l'encoche commencée s'il en est à 30 cm) et il devient deux rondins. Ailleurs : « Finis
  d'abord l'entaille commencée. » ; trop court : « Trop court pour être recoupé. » ; déjà équarri : « On coupe le rondin avant
  de l'équarrir. ». Un coup coûte 0,8 point (`chop`).
- Espace, la doloire en main, contre son flanc : un coup dresse sa face (voir la [poutre](normal-beam.md)).

## Origine
L'arbre normal abattu, ébranché : son tronc devient un seul rondin de 5 m, à la place exacte du tronc couché. Puis on le coupe.

## Devenir
Coupé à la longueur d'une pièce (le poteau de l'abri : 3 m au nord, 1,70 m au sud), roulé jusqu'au chantier, équarri sur place en
poutre. Les billes de 95 cm vont en tas, pour le chauffage.

## Vérification
- Aperçu : `.art-preview/timber.png` (rondins de 30 cm à 5 m, encoches, roulement, nord-sud), `.art-preview/arbres.png`,
  `.art-preview/piles.png` (le genre `normal-logs`), `.art-preview/gabarit.png`.
- Test : `npm run test:equarrissage`.
- En jeu : abattre un arbre normal, couper le houppier, voir le rondin de 5 m ; la cognée contre son flanc, lire les deux
  longueurs, couper à 3 m ; rouler le rondin de 3 m ; prendre une bille de 95 cm et la mettre en tas.
