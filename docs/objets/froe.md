# Coutre (`froe`)

## Identité
- Clé : `froe` ; image au sol `froe-ground` et ses vues `-r1`, `-r2`, `-r3`.
- Nom affiché : Coutre.
- Nature : objet possédable (`items.json`, `kind: tool`).
- Mains : une (`hand`), l'autre tient le maillet.

## Masse
- Saisie : **1.5 kg**. Marche normale.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Lame droite d'environ 30 cm, épaisse au dos, manche de bois de 35 cm emmanché perpendiculairement dans l'œil d'un bout ; couché, la lame est-ouest, le manche vers le nord : 32 × 35 × 4 cm, couché au sol (`box`).
- À l'écran : environ 6 × 4 px ; nord-sud l'inverse.

## Vues
- Symétrie : quatre (`four`, couché) : il a une tête et un manche, un bout différent de l'autre. R le tourne d'un quart de tour à la pose.
- Au sol : la lame et son manche en équerre.
- En main : `held-froe` (vues `down`, `up`, `right`). Case d'interface : `item-froe`. Fantôme : sa vue au sol, en transparence.

## Variantes naturelles
Aucune : un outil forgé ou tourné, régulier.

## Regroupement
Seul.

## Gestes
- E court : le ramasser ; E dans le vide, Q : le poser à son fantôme ; R : le tourner.
- Espace : rien encore : fendre au coutre viendra avec son geste (le coutre posé sur le bois de bout, le maillet sur son dos, puis le manche en levier) (pas de planche `tool-froe` encore : le geste se jouerait mains vides).

## Origine
Acheté au forgeron. En attendant le village : ?dieu le donne.

## Devenir
Il dure : il ne s'use pas encore.

## Transformations
- `rive-plank` : quartier → planches ; `rive-plank-half` : demi-bille → planches ; `rive-shingle` : quartier court → bardeaux ; outils : coutre et maillet ; poste : chevalet de fendeur ; geste à venir.

## Métier
Forgeron (`smith`) ; le fendeur s'en sert.

## Vérification
- Aperçu : `.art-preview/briques.png`, `couches.png` (ses quatre vues), `hands.png`.
- En jeu : ?dieu « Donner », le poser, le tourner (R), le reprendre.
