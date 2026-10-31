# Seau (`bucket`, `bucket-water`)

Deux états du même seau : vide et plein. Une fiche pour les deux.

## Identité
- Clés : `bucket` (vide), `bucket-water` (plein d'eau).
- Noms affichés : seau, seau d'eau.
- Nature : objets du monde qu'on prend (`props.json`, `take`). Jusqu'au 31 octobre 2026, le seau de la ferme ne se prenait pas (E disait « Le seau de la traite... ») : il se prend maintenant, et le dialogue est retiré.
- Mains : une (l'anse au poing, bras pendant, posture `hand`).

## Masse
- Saisie : seau vide **1,5 kg** (douves de bois cerclées) ; plein **11,5 kg** (le seau et 10 litres d'eau : rempli aux trois quarts d'environ 14 litres).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Cylindre debout, Ø 30 × 30 cm. À l'écran : 6 × 9 (le dessin a 2 rangées d'anse de plus).

## Vues
- Symétrie : ronde. `bucket` : on voit le dedans, vide (`KKKNmo`) ; `bucket-water` : l'eau sous le bord, un reflet.
- En main : `held-bucket`, `held-bucket-water` (`hand`). Cases : `item-bucket`, `item-bucket-water`. Fantôme : son image.

## Variantes naturelles
Aucune : fait par le menuisier.

## Regroupement
Seul.

## Gestes
- E court : le prendre (une main) ; E dans le vide, Q : le poser à son fantôme.
- Puiser (Espace au bord de l'étang) : à venir.

## Origine
Le seau de la traite, dans la cour de la ferme (`ferme.tmj`).

## Devenir
Il ne s'use pas ; plein, il se vide dans le mortier ou le torchis et revient vide.

## Transformations
- `fill-bucket` : seau vide + l'eau de l'étang (10 kg) → seau d'eau ; poste : bord de l'étang ; geste à venir.
- `mix-mortar`, `mix-cob` : le seau d'eau y entre, le seau vide en sort.

## Métier
Menuisier (`joiner`, le tonnelier du village) ; puiser, c'est le paysan.

## Vérification
- Aperçu : `briques.png` (groupe 2), `hands.png`.
- En jeu : à la ferme, E sur le seau ; ?dieu « Transformer » (`fill-bucket`) : il devient plein. `npm run test:briques` (le seau d'eau vidé dans le torchis).
