# Chaux vive et chaux éteinte (`quicklime`, `slaked-lime`)

La chaux de la maison de Xéros (CONCEPTION, « La maison de Xéros », « Les pièces de l'étape 2 ») : le calcaire (la pierre commune du
village) cuit au four à chaux vers 900 °C donne la chaux vive ; éteinte à l'eau, elle devient une pâte, la chaux éteinte, qui sert au
badigeon des pans de torchis (`lime-panel`) et, diluée, au lait de chaux.

## Identité
- Clés : `quicklime`, `slaked-lime` ; images au sol `quicklime-ground`, `slaked-lime-ground`.
- Noms affichés : chaux vive, chaux éteinte.
- Nature : objets possédables (`items.json`, `kind: resource`), de la famille `pierre` au catalogue (la chaux vient du calcaire).
- Mains : la chaux vive, deux (`carry`, un tas de mottes porté devant le ventre, comme la motte de terre) ; la chaux éteinte, une
  (`hand`, le seau au poing, comme le seau d'eau).
- Matière : `lime` (matters.json), **la chaux**, une seule matière pour les deux états, 900 kg/m³ (chaux vive en mottes, avec ses
  vides ; la pâte éteinte est plus dense, mais une seule matière suffit tant que la chaux ne sert qu'à badigeonner).

## Masse
- Chaux vive : 35 × 30 × 20 cm × 0,55 (des mottes en tas, avec leurs vides) × 900 kg/m³ = **10,4 kg**.
- Chaux éteinte : le seau (cylindre de Ø 30 cm, 30 cm de haut) rempli aux six dixièmes de pâte × 900 kg/m³ = **11,5 kg** (le seau
  lui-même, 1,5 kg, n'est pas compté, comme pour le seau d'eau qui fait 11,5 kg en tout).
- Les deux se portent sans gêne (Xéros porte 70 kg ; il marche normalement jusqu'à 25 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Chaux vive : boîte de 35 × 30 × 20 cm. À l'écran : 7 × (4 + 3) = **7 × 7**.
- Chaux éteinte : cylindre debout de Ø 30 cm, 30 cm de haut : 6 × (6 + 3) = 6 × 9, l'anse en plus : **6 × 11** (le seau).

## Vues
- Symétrie : ronde pour les deux (`round`, une vue) : un tas de mottes sans devant ni dos, un seau.
- Chaux vive au sol (`quicklime-ground`) : trois mottes cuites, anguleuses (le calcaire cuit garde ses cassures), deux devant, une
  derrière posée sur elles, d'un blanc de cassure (`!`), crème aux faces tournées vers le jour (`+`), les fentes et le pied dans
  l'ombre (`=`, `;`) : la rampe du calcaire de la palette, plus blanche. Contour `~` côté lumière, `o` en bas et à droite.
- Chaux éteinte au sol (`slaked-lime-ground`) : le seau de bois cerclé (`bucket`, art/world/props.ts), la pâte blanche à ras du
  bord, luisante à gauche.
- En main : `held-quicklime` (`carry`, pareille des trois côtés), `held-slaked-lime` (`hand`, le seau au poing : l'anse dans le
  poing de profil, par la tranche de face et de dos). Cases : `item-quicklime` (quatre mottes en tas), `item-slaked-lime` (le seau
  de pâte). Fantôme : leur image.

## Variantes naturelles
Aucune : la chaux vive est un produit du four (le travail du feu), en mottes ; la chaux éteinte, une pâte dans un seau.

## Regroupement
Seules (pas de tas pour l'instant : on n'en fait que pour badigeonner la maison).

## Gestes
E : prendre ; A : poser ; le reste : rien.

## Travail
Aucun.

## Arme
Aucune (elles frappent comme tout objet tenu, l'arme improvisée de leurs dimensions et de leur masse, src/world/heft.ts).

## Origine
- Chaux vive : cuite au four à chaux (le poste `kiln`, à venir), d'une grosse pierre brute de calcaire.
- Chaux éteinte : la chaux vive éteinte dans un seau d'eau.
- Toutes deux s'achètent au maçon.

## Devenir
La chaux éteinte se pose au pinceau sur le torchis (le badigeon : le pan de mur chaulé, `lime-panel`, un geste à venir) ; diluée, le
lait de chaux.

## Transformations
- `burn-lime`, **cuire la chaux** : 1 grosse pierre brute (calcaire, 55,5 kg) → 2 chaux vives (20,8 kg) ; déchet : le gaz du
  calcaire et les cendres, qui partent en fumée par la gueule du four (le calcaire perd près de la moitié de sa masse à la cuisson) ;
  poste : le four à chaux (`kiln`, à venir) ; 24 h ; geste à venir (« Transformer » dans ?dieu).
- `slake-lime`, **éteindre la chaux** : 1 chaux vive + 1 seau d'eau → 1 chaux éteinte (dans le seau) ; déchet : l'eau en trop,
  qui part en vapeur (la chaux bout en s'éteignant) ; poste : au sol ; 30 min ; geste à venir.

## Métier
Maçon (`mason`).

## Vérification
- Aperçu : `briques.png` (les deux objets et leurs deux chaînes), `maison-petites-pieces.png`.
- Outils de test (`?dieu`) : donner la chaux vive, la transformer (« Transformer » : cuire, éteindre).
- En jeu : prendre la chaux vive à deux mains, le seau de chaux éteinte à une main ; les voir portées.
