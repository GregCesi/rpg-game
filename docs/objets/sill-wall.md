# Morceaux de solin (`rough-sill-wall`, `dressed-sill-wall`)

Décidés le 31 octobre 2026 (chantier « mode construction ») : les deux premiers **éléments composés** du bac à sable, tirés de
l'essai des murs que Grégoire a validé (`tools/essai-murs.ts`, `.art-preview/essai-murs.png` : le mur brut à 96 % de pierre et le
mur taillé). Un morceau de solin est le pied de pierre d'un mur de maison, sur lequel repose la sablière basse du pan de bois. Ils
sont **calculés, pas dessinés à part** : chaque image est montée par l'algorithme des murs (`art/lib/walls.ts`, commun à l'essai),
avec les dessins mêmes des pierres du jeu (`art/items/stones.ts`). Les deux clés partagent cette fiche.

## Identité
- Clés : `rough-sill-wall` (brut : pierres brutes de carrière), `dressed-sill-wall` (taillé : moellons de 30, 40, 50 cm et
  boutisses) ; objets du monde (`props.json`), sans `take`.
- Noms affichés : morceau de solin brut, morceau de solin taillé (masculin).
- Nature : élément composé, posé en mode construction (famille « éléments » du catalogue). Pas encore de chantier qui le monte
  pierre à pierre.
- Mains : aucune, il ne se porte pas.

## Masse
- Par la matière : `{"matter": "stone", "fill": 0.8}` (brut : des joints de terre) et `0.9` (taillé : des joints fins), sur la boîte
  de ses `dims` (les 40 cm visibles) : environ **614 kg** (brut) et **691 kg** (taillé) ; avec les 20 cm enterrés, environ 920 et
  1 040 kg. Ni porté, ni roulé : il se pose en mode construction seulement.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 1,60 m de long, 50 cm d'épaisseur, environ 60 cm de haut, dont **40 cm visibles** (20 cm enterrés, non dessinés) :
  `dims` 160 × 50 × 40 cm, boîte.
- À l'écran, est-ouest : W = 32 px ; H + D/2 = 8 + 5 = **32 × 13** px (5 rangées de dessus, 8 de face), ombre portée en plus.
- Nord-sud (règle D) : **13 × 32** px.
- Collision : l'emprise au sol en vraie grandeur, 32 × 10 px (`body`), tournée en mode construction (le moteur prend l'emprise
  de la boîte dans son sens).

## Vues
- Quatre (`views: "four"`), couché au sens de la règle D (`lying: true` : `validate.ts` vérifie les silhouettes inversées).
  - r0 : le mur est-ouest, sa face sud ; derrière l'assise haute, le dessus des rangs de pierres.
  - r2 : le demi-tour, le même mur vu de l'autre face : un autre tirage, même taille.
  - r1, r3 : le mur nord-sud, 24 rangées de dessus vu le long du mur, puis le bout du mur en bande au sud (13 × 8 : la face du mur
    calculée sur 13 px, qui servira aux angles). Le taillé : deux files de moellons couchés en long, joints décalés.
- **Tirages** : `variants: 8` (props.json). Le tirage 0 est `<clé>`, `<clé>-r1`… ; le tirage k (1 à 7) est `<clé>-s<k>`,
  `<clé>-s<k>-r1`… Chaque vue de chaque tirage a sa graine. Le mode construction en tire un au hasard **à chaque pose**, gardé par
  GameState (`variant` de la pièce posée) ; un plan du bac à sable ne garde pas le tirage : chaque pose du plan en tire de nouveaux.
- Au sol : ses quatre vues. En main, case d'interface, porté : aucun (il ne se prend pas). Fantôme : sa vue en transparence en mode
  construction.

## Variantes naturelles
Le brut : la pierre est naturelle (formes et tailles des pierres brutes, une grosse au plus sur 8 px de face, rognée par l'assise
haute ; moyennes, petites, morceaux rognés et éclats de calage ; joints de terre de 1 à 2 px). Le taillé : régulier à la mesure du
travail du maçon (deux assises de 20 cm, joints décalés d'au moins 10 cm ; une boutisse traverse le mur). Les deux varient par
leurs 8 tirages.

## Regroupement
Seul. Plusieurs morceaux bout à bout font un solin ; un plan du bac à sable les garde ensemble.

## Gestes
- En mode construction : clic gauche le pose (le fantôme s'accroche sur ce qu'il y a dessous), R le tourne (r0 à r3), clic droit
  le retire.
- En jeu : il bloque le passage (posé sous 2 m), comme un mur. E, Espace, Q : rien.

## Origine
Pas encore construit en jeu : posé en mode construction. Plus tard, monté par le maçon (ou Xéros) pierre à pierre, avec le mortier
de terre, au chantier de la maison.

## Devenir
Il reste où on le pose. Il porte la sablière basse du pan de bois (en mode construction, une pièce posée dessus prend son dessus,
40 cm).

## Transformations
Aucune pour l'instant (le montage pierre à pierre viendra avec le chantier guidé).

## Métier
Le maçon (`trade: "mason"`).

## Vérification
- Aperçu : `.art-preview/solins.png` (`npx tsx tools/essai-murs.ts` : les deux solins, 8 tirages × r0 à r3, Xéros au bout de chaque
  rangée), `.art-preview/rough-sill-wall*.png`, `dressed-sill-wall*.png` (`npm run art:preview`).
- `npm run check` : chaque vue de chaque tirage à la règle D.
- En jeu (`?construire`) : famille « éléments », le poser, le tourner, poser une poutre dessus (elle prend 40 cm), le retirer ;
  `npm run test:construction` en pose un et vérifie qu'il garde son tirage au rechargement.
- Reste à faire : un **angle** (une pièce en L avec une pierre d'angle qui coiffe les deux bras, quatre dessins, `bodies` à deux
  rectangles) et un **bout** (le côté d'une porte : pierres plus droites en chaîne, `end` dans `WallSize` de `art/lib/walls.ts`).
