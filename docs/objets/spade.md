# Bêche (`spade`)

## Identité
- Clé : `spade` ; image au sol `spade-ground` et ses vues `-r1`, `-r2`, `-r3`.
- Nom affiché : Bêche.
- Nature : objet possédable (`items.json`, `kind: tool`).
- Mains : deux (sur l'épaule comme la doloire, posture `shoulder`).

## Masse
- Saisie : **2 kg**. Marche normale.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Fer plat à bord droit d'environ 25 × 18 cm ferré au bout d'une pelle de bois, manche droit à poignée en T, 1,10 m : 110 × 20 × 5 cm, couché au sol (`box`).
- À l'écran : 22 × 3 px, dessinée **22 × 5** (la pelle se lit plus large que le manche, dans la tolérance, comme la doloire) ; nord-sud **5 × 22**.

## Vues
- Symétrie : quatre (`four`, couché) : il a une tête et un manche, un bout différent de l'autre. R le tourne d'un quart de tour à la pose.
- Au sol : le manche à poignée en T, la pelle de bois et son fer presque noir au bout.
- En main : `held-spade` (vues `down`, `up`, `right`). Case d'interface : `item-spade`. Fantôme : sa vue au sol, en transparence.

## Variantes naturelles
Aucune : un outil forgé ou tourné, régulier.

## Regroupement
Seul.

## Gestes
- E court : le ramasser ; E dans le vide, Q : le poser à son fantôme ; R : le tourner.
- Espace : rien encore : creuser viendra avec son geste (pas de planche `tool-spade` encore : le geste se jouerait mains vides).

## Origine
Achetée au forgeron (le fer ; la pelle et le manche se font à la maison). En attendant le village : ?dieu le donne.

## Devenir
Il dure : il ne s'use pas encore.

## Transformations
- `dig-clay` : creuser une motte d'argile au bord de l'étang (la terre prise au poste, 18 kg) → motte de terre ; geste à venir.
- `mix-mortar` : gâcher le mortier ; geste à venir.

## Métier
Forgeron (`smith`) ; le terrassier s'en sert.

## Vérification
- Aperçu : `.art-preview/briques.png`, `couches.png` (ses quatre vues), `hands.png`.
- En jeu : ?dieu « Donner », le poser, le tourner (R), le reprendre.
