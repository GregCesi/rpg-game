# Maillet (`mallet`)

## Identité
- Clé : `mallet` ; image au sol `mallet-ground` et ses vues `-r1`, `-r2`, `-r3`.
- Nom affiché : Maillet.
- Nature : objet possédable (`items.json`, `kind: tool`).
- Mains : une (`hand`), l'autre tient le ciseau ou le coutre.

## Masse
- Saisie : **1.2 kg**. Marche normale.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Tête de bois de 25 × Ø 12 cm, manche de 30 cm : 40 × 25 × 12 cm, couché au sol (`box`).
- À l'écran : **8 × 5** ; nord-sud **5 × 8**.

## Vues
- Symétrie : quatre (`four`, couché) : il a une tête et un manche, un bout différent de l'autre. R le tourne d'un quart de tour à la pose.
- Au sol : la tête de bois en travers, le manche.
- En main : `held-mallet` (vues `down`, `up`, `right`). Case d'interface : `item-mallet`. Fantôme : sa vue au sol, en transparence.

## Variantes naturelles
Aucune : un outil forgé ou tourné, régulier.

## Regroupement
Seul.

## Gestes
- E court : le ramasser ; E dans le vide, Q : le poser à son fantôme ; R : le tourner.
- Espace : rien encore : frapper le ciseau ou le coutre viendra avec leurs gestes (pas de planche `tool-mallet` encore : le geste se jouerait mains vides).

## Origine
Tourné dans une bille de bois dur ; acheté au menuisier, ou fait par la mère, qui sculpte. En attendant le village : ?dieu le donne.

## Devenir
Il dure : il ne s'use pas encore.

## Transformations
- `dress-ashlar` : avec le ciseau ; geste à venir.
- `rive-plank`, `rive-plank-half`, `rive-shingle` : il frappe le dos du coutre ; geste à venir.

## Métier
Menuisier (`joiner`).

## Vérification
- Aperçu : `.art-preview/briques.png`, `couches.png` (ses quatre vues), `hands.png`.
- En jeu : ?dieu « Donner », le poser, le tourner (R), le reprendre.
