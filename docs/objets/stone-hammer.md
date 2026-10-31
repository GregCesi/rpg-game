# Têtu (`stone-hammer`)

## Identité
- Clé : `stone-hammer` ; image au sol `stone-hammer-ground` et ses vues `-r1`, `-r2`, `-r3`.
- Nom affiché : Têtu.
- Nature : objet possédable (`items.json`, `kind: tool`).
- Mains : une (tenu au poing, posture `hand`).

## Masse
- Saisie : **2 kg**. Marche normale.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Tête de fer à deux pans carrés d'environ 18 cm, manche de 35 cm : 40 × 15 × 6 cm, couché au sol (`box`).
- À l'écran : 8 × 2,7 px, dessiné **8 × 4** (la tête en travers prend deux rangées, dans la tolérance) ; nord-sud **4 × 8**.

## Vues
- Symétrie : quatre (`four`, couché) : il a une tête et un manche, un bout différent de l'autre. R le tourne d'un quart de tour à la pose.
- Au sol : le manche de bois, la tête grise à pans carrés en travers d'un bout.
- En main : `held-stone-hammer` (vues `down`, `up`, `right`). Case d'interface : `item-stone-hammer`. Fantôme : sa vue au sol, en transparence.

## Variantes naturelles
Aucune : un outil forgé ou tourné, régulier.

## Regroupement
Seul.

## Gestes
- E court : le ramasser ; E dans le vide, Q : le poser à son fantôme ; R : le tourner.
- Espace : rien encore : dégrossir au têtu viendra avec son geste (pas de planche `tool-stone-hammer` encore : le geste se jouerait mains vides).

## Origine
Acheté au forgeron. En attendant le village : ?dieu le donne.

## Devenir
Il dure : il ne s'use pas encore.

## Transformations
- `dress-rubble` : grosse pierre brute → moellon ; outil : le têtu ; geste à venir.

## Métier
Forgeron (`smith`) ; le carrier et le maçon s'en servent.

## Vérification
- Aperçu : `.art-preview/briques.png`, `couches.png` (ses quatre vues), `hands.png`.
- En jeu : ?dieu « Donner », le poser, le tourner (R), le reprendre.
