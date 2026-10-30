# Poteau de l'abri (`shed-post-high`, `shed-post-low`)

Une fiche pour les deux poteaux de l'abri à bois : la même pièce, à deux hauteurs (le toit penche vers le sud, à 20°).

## Identité
- Clés : `shed-post-high` (les deux poteaux du nord, côté haut), `shed-post-low` (les deux du sud, côté bas).
- Noms affichés : poteau (côté haut), poteau (côté bas).
- Nature : objets du monde (`props.json`), sans `take` : pièces de bâtiment posées dans Tiled, étape « les poteaux ».
- Mains : aucune pour l'instant.

## Dimensions (gabarit)
- Bois équarri à la hache, section 20 × 20 cm. Hauteur hors dé : **3,00 m** au nord, **1,70 m** au sud ; il repose sur
  son dé (15 cm), donc sa tête est à 3,15 m et 1,85 m du sol. Contour compris.
- La chute de 1,30 m sur 3,55 m d'entraxe nord-sud (71 px) donne la pente du toit : atan(130 / 355) = 20,1°. D'est en
  ouest, 3,05 m d'axe en axe (61 px) ; 3,25 m hors tout (65 px, de la face ouest du poteau ouest à la face est du poteau
  est).
- Boîte (`box`), debout.
- À l'écran : W = 4 px ; H + D/2 = 60 + 2 = **4 × 62** (haut), 34 + 2 = **4 × 36** (bas).
- Sous lui, dans son image, 3 rangées vides : la hauteur du dé. Le bas de l'image est le bord sud du poteau au sol
  (c'est sa profondeur d'affichage) ; son pied se dessine sur le dessus du dé.
- Dans `ferme.tmj` (coin bas gauche de l'image) : hauts en (608, 68) et (669, 68), images de 4 × 65 ; bas en (608, 139)
  et (669, 139), images de 4 × 39. Chacun centré sur son dé, à un pixel du bord sud du dé.

## Vues
- Debout : `shed-post-high`, `shed-post-low`. Les faces équarries montrent le bois de la matière commune
  (`art/world/wood.ts`) : deux colonnes de bois clair au fil vertical, la gauche (côté lumière) un cran plus claire, avec
  un reste d'écorce par endroits sur l'arête ; le dessus en bois de bout (Y) ; contour N à gauche et en haut, OUTLINE à
  droite et en bas (STYLE.md section 3). Pas d'ombre portée : le dé la porte.
- En main, case d'interface, fantôme, porté : aucun (pas encore).

## Regroupement
Seul ; quatre par abri, aux quatre coins : nord-ouest, nord-est, sud-ouest, sud-est.

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Posés dans `ferme.tmj` avec l'abri. Plus tard : une bille équarrie à la hache sur le billot, portée à deux mains, dressée
sur son dé : pas encore construit.

## Devenir
Porte les sablières. **C'est la seule pièce de l'abri qui bloque le passage** : une collision de 4 × 4 px (20 × 20 cm)
à son pied (`body`).

## Vérification
- Aperçu : `.art-preview/shed-post-high.png`, `shed-post-low.png`, `.art-preview/woodshed-2.png` (les quatre poteaux sur
  leurs dés), avec Xéros à côté : le poteau haut le dépasse d'environ 30 px, le bas d'environ 6 (sa tête à 1,85 m).
- En jeu : se cogner à chaque poteau ; passer entre deux poteaux ; passer derrière un poteau (il cache Xéros) et devant
  (Xéros le cache).
