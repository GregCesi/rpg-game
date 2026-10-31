# Ciseau de tailleur (`stone-chisel`)

## Identité
- Clé : `stone-chisel` ; image au sol `stone-chisel-ground` et ses vues `-r1`, `-r2`, `-r3`.
- Nom affiché : Ciseau de tailleur.
- Nature : objet possédable (`items.json`, `kind: tool`).
- Mains : une (`hand`), l'autre tient le maillet.

## Masse
- Saisie : **0.5 kg**. Marche normale.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Barre de fer de 25 cm, tranchant plat : 25 × 4 × 3 cm, couché au sol (`box`).
- À l'écran : 5 × 1 px, agrandi au plancher de lisibilité : **6 × 3** ; nord-sud **3 × 6**.

## Vues
- Symétrie : quatre (`four`, couché) : il a une tête et un manche, un bout différent de l'autre. R le tourne d'un quart de tour à la pose.
- Au sol : une barre de fer, la tête un peu écrasée par les coups de maillet, le tranchant plat.
- En main : `held-stone-chisel` (vues `down`, `up`, `right`). Case d'interface : `item-stone-chisel`. Fantôme : sa vue au sol, en transparence.

## Variantes naturelles
Aucune : un outil forgé ou tourné, régulier.

## Regroupement
Seul.

## Gestes
- E court : le ramasser ; E dans le vide, Q : le poser à son fantôme ; R : le tourner.
- Espace : rien encore : tailler au ciseau viendra avec son geste (le maillet dans l'autre main) (pas de planche `tool-stone-chisel` encore : le geste se jouerait mains vides).

## Origine
Acheté au forgeron. En attendant le village : ?dieu le donne.

## Devenir
Il dure : il ne s'use pas encore.

## Transformations
- `dress-ashlar` : moellon → pierre de taille ; outils : ciseau et maillet ; geste à venir.

## Métier
Forgeron (`smith`) ; le maçon s'en sert.

## Vérification
- Aperçu : `.art-preview/briques.png`, `couches.png` (ses quatre vues), `hands.png`.
- En jeu : ?dieu « Donner », le poser, le tourner (R), le reprendre.
