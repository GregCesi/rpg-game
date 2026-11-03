# Entrée de garenne (`warren-hole`)

Un trou de terrier de lapins, au bord d'un champ ou dans un talus (chantier « lapins », 3 novembre 2026 ; CONCEPTION, « Les
créatures ») : c'est là qu'un lapin qui fuit disparaît, et d'où il ressort.

## Identité
- Clé : `warren-hole` (`props.json` ; c'est aussi le type de l'objet dans Tiled).
- Nom affiché : entrée de garenne.
- Nature : objet du monde, fixe, sans `take`, sans corps (on marche dessus). Une capacité en données : `burrow` (c'est une entrée de
  terrier : une créature y entre et en sort).
- Mains : ne se prend pas.
- Âge : non.

## Masse
- Aucune : un trou dans la terre ne se déplace pas (`mass` non requise : pas de `take`).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Le trou : 15 cm de diamètre, en biais dans la pente ; devant, la terre sortie du terrier en éventail, 50 × 40 cm.
- À plat au sol (`shape: flat`) : 50 × 40 cm, **10 × 8 px**. Le trou noir : 3 × 2 px.

## Vues
- Symétrie : ronde (`views: "round"`) : la terre éboulée autour du trou se lit de tous les côtés pareil à cette taille.
- Au sol : le trou sombre, la terre claire tassée et grattée autour, quelques crottes, des herbes rases broutées.
- En main, porté, case d'interface : non.
- Fantôme : en mode construction, son image en transparence.

## Variantes naturelles
Une seule forme pour l'instant. Plus tard : deux formes (`natural`, `-b`), pour que les trois ou quatre entrées d'une garenne ne se
ressemblent pas.

## Regroupement
Une **garenne** (rectangle `Warren` de Tiled : `creature`, `population`) réunit les entrées posées dans son rectangle.

## Gestes
Aucun (le clic qui frappe ne le touche pas : ce n'est pas une cible).

## Travail
Aucun (plus tard, peut-être : boucher un terrier, poser un collet).

## Arme
Aucune.

## Origine
Creusé par les lapins. Posé dans la carte Tiled de la ferme.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Aucun (`trade` : non, une chose naturelle).

## Vérification
- Aperçu : `.art-preview/lapins.png` (propositions), puis `.art-preview/collection.png`.
- Outils de test : ?dieu, « Poser ».
- En jeu : la garenne au nord-est de la maison ; un lapin qui fuit y court et disparaît dans le trou.
