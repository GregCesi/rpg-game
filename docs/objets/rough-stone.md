# Pierres brutes (`rough-stone`, `big-rough-stone`)

Deux tailles types de la même matière : la petite pierre brute et la grosse. Une fiche pour les deux (même genre d'objet).

## Identité
- Clés : `rough-stone` (petite), `big-rough-stone` (grosse) ; images au sol `rough-stone-ground`, `big-rough-stone-ground` et leur seconde forme `-b`.
- Noms affichés : pierre brute, grosse pierre brute.
- Nature : objets possédables (`items.json`, `kind: resource`).
- Mains : deux (portées devant le ventre, `carry`) : une pierre de 15 kg se tient à deux mains, même si elle est petite.

## Masse
- Calculée par la matière (`"mass": {"matter": "stone", "fill": 0.52}`) : la boîte de ses `dims` × 0,52 (une pierre brute occupe à peu près l'ellipsoïde de sa boîte, π/6) × 2 600 kg/m³.
- Petite : 26 × 22 × 19 cm → **14,7 kg** à sa taille type, de 11,8 à 18 kg selon sa taille tirée. Marche normale.
- Grosse : 45 × 34 × 27 cm → **55,9 kg**, de 44,9 à 68,4 kg : toujours portée (70 kg), lentement (au-dessus de 25 kg). La taille type a été fixée pour que même la plus grosse se porte (validate.ts le vérifie).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Boîte englobante (`box`), contour compris : 26 × 22 × 19 cm et 45 × 34 × 27 cm.
- À l'écran : petite 5,2 × 6 px (plancher de lisibilité jusqu'à 6 × 6,9), dessinée **6 × 6** et **5 × 7** (forme b) ; grosse **9 × 9** (les deux formes).

## Vues
- Symétrie : ronde (`views: "round"`) : une pierre brute n'a ni devant ni bout ; ses deux formes jouent le rôle de ses côtés. R ne la tourne pas.
- Au sol : `<image>` et `<image>-b`, à facettes, dessus clair, face sud sombre, un éclat ; jamais lisse ni en œuf ; ombre portée au sud-est.
- En main : `held-rough-stone`, `held-big-rough-stone` (posture `carry`, vues `down`, `up`, `right`).
- Case d'interface : `item-rough-stone`, `item-big-rough-stone`.
- Fantôme : l'image de sa forme, en transparence, là où elle ira.
- Dans un tas : les deux formes alternées.

## Variantes naturelles
- Deux formes dessinées ; taille type ± 7 % (`natural: {forms: 2, vary: 7}`), tirées à l'apparition (donnée par ?dieu, sortie d'une transformation), gardées par GameState (`natural` de ce qu'on tient et de ce qui est au sol). Masse au cube de la taille. L'image ne change pas avec la taille (± 7 % de 45 cm, moins d'un pixel).
- Reprise d'un tas, une pierre a la forme dessinée à sa place et la taille type : le tas range des pierres semblables.

## Regroupement
En tas : genres `rough-stones` et `big-rough-stones` (`piles.json`) : pyramide de 6 (3 au sol côte à côte, 2 dans les creux, 1 au sommet), formes alternées. Le tas de petites pierres bloque à partir de 3, celui des grosses dès la première.

## Gestes
- E court : la ramasser (à deux mains) ; sur un tas, reprendre la plus haute.
- E dans le vide, Q : la poser devant soi, à son fantôme ; contre une pierre identique seule au sol, un tas naît.
- E maintenu, Espace, R : rien.

## Origine
Ramassée dans les champs (l'épierrage des labours) ou sur la rive de l'étang. Pas encore posée sur une carte : ?dieu la donne ou la met au sol.

## Devenir
La grosse se dégrossit au têtu en moellon. La petite sert au blocage du solin (entre les moellons, avec le mortier) : à venir avec le plan de la maison.

## Transformations
- `dress-rubble`, dégrossir un moellon : grosse pierre brute → moellon (35,4 kg) ; déchet : éclats de pierre (≈ 20 kg à la taille type), qui restent au sol (`stone-chips`) ; outil : têtu ; poste : sol ; geste à venir.

## Métier
Carrier (`quarryman`) : il tire et vend la pierre au village. Tout paysan en ramasse.

## Vérification
- Aperçu : `.art-preview/briques.png` (groupe 1), `piles.png` (les tas), `collection.png`.
- En jeu : ?dieu « Donner » une grosse pierre brute (la masse portée varie d'une fois à l'autre), « Au sol », la reprendre, en poser deux l'une contre l'autre (tas), « Transformer » : dégrossir un moellon. `npm run test:briques`.
