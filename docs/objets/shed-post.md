# Poteau de l'abri (`shed-post-high`, `shed-post-low`)

Une fiche pour les deux poteaux de l'abri à bois : la même pièce, à deux hauteurs (le toit penche vers le sud).

## Identité
- Clés : `shed-post-high` (les deux poteaux du nord, côté haut), `shed-post-low` (les deux du sud, côté bas).
- Noms affichés : poteau (côté haut), poteau (côté bas).
- Nature : objets du monde (`props.json`), sans `take` : pièces de bâtiment posées dans Tiled, étape « les poteaux ».
- Mains : aucune pour l'instant.

## Dimensions (gabarit)
- Bois équarri à la hache, section 15 × 15 cm. Hauteur hors dé : **2,10 m** au nord, **1,70 m** au sud ; il repose sur
  son dé (15 cm), donc son sommet est à 2,25 m et 1,85 m du sol. Contour compris.
- Boîte (`box`), debout.
- À l'écran : W = 3 px ; H + D/2 = 42 + 1,5 = **3 × 43,5** (haut), 34 + 1,5 = **3 × 35,5** (bas). Dessinés 3 × 44 et 3 × 36.
  Plus étroit que le plancher de lisibilité (6 px) : dessiné à sa taille réelle, 3 px, sans l'agrandir.
- Sous lui, dans son image, 3 rangées vides : la hauteur du dé. Le bas de l'image est le bord sud du poteau au sol
  (c'est sa profondeur d'affichage) ; son pied se dessine sur le dé.

## Vues
- Debout : `shed-post-high`, `shed-post-low`. Les faces équarries montrent le bois de la matière commune
  (`art/world/wood.ts`) : le bois clair des faces de coupe, fil vertical, un reste d'écorce par endroits sur une arête ;
  côté lumière à gauche, ombre à droite, contour selon STYLE.md section 3. Pas d'ombre portée : le dé la porte.
- En main, case d'interface, fantôme, porté : aucun (pas encore).

## Regroupement
Seul ; quatre par abri, aux quatre coins, sur 3,2 m × 3,2 m (deux cases) : nord-ouest, nord-est, sud-ouest, sud-est.

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Posés dans `ferme.tmj` avec l'abri. Plus tard : une bille équarrie à la hache sur le billot, portée à deux mains, dressée
sur son dé : pas encore construit.

## Devenir
Porte les sablières. **C'est la seule pièce de l'abri qui bloque le passage** : une collision de 3 × 3 px (15 × 15 cm)
à son pied (`body`).

## Vérification
- Aperçu : `.art-preview/shed-post-high.png`, `shed-post-low.png`, `.art-preview/woodshed-2.png` (les quatre poteaux sur
  leurs dés), avec Xéros à côté : le poteau haut le dépasse d'environ 10 px, le bas d'environ 4.
- En jeu : se cogner à chaque poteau ; passer entre deux poteaux ; passer derrière un poteau (il cache Xéros) et devant
  (Xéros le cache).
