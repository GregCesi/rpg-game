# Foyer, seuil, banc, solin de cloison (`hearth`, `threshold-stone`, `bench`, `narrow-sill-wall`)

Décidé le 2 novembre 2026 (CONCEPTION « La maison de Xéros », « Les pièces de l'étape 2 ») : le foyer au milieu de la salle
commune, le seuil de calcaire sous la porte d'entrée, le banc au sud de la table, le solin des cloisons.

## Identité
- Clés : `hearth` `threshold-stone` `bench` `narrow-sill-wall`.
- Noms affichés : « foyer », « seuil de pierre », « banc », « morceau de solin de cloison » (masculin).
- Nature : objets du monde. Le foyer, meuble au sol (`layer: floor`), son feu animé (`anim: burn`, trois images), sa lueur
  (`light`), sa fumée (`smoke`) ; le seuil, une dalle au sol (`layer: floor`, on marche dessus) ; le banc, un meuble ; le solin de
  cloison, un morceau de mur qui se raccorde (`wall: rough`, quatre tirages : `variants`).
- Âge : le banc est du bois travaillé (`"aged": true`) ; le foyer, le seuil et le solin sont de pierre.

## Masse
Foyer : `{"matter": "stone", "fill": 0.15}` (les pierres en cercle) ; seuil : `stone` 0,95 (calcaire, 120 × 50 × 20 : 274 kg) ;
banc : `wood` 0,15 (36 kg) ; solin : `stone` 0,8.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Foyer : cylindre debout Ø 100 cm, 20 cm de haut (les pierres) : 20 × 14 px, dans une planche de 22 × 20 (les flammes).
- Seuil : boîte 120 × 50 × 20 cm : 24 × 9 px (nord-sud 10 × 16), l'ombre dessous.
- Banc : boîte 200 × 30 × 45 cm : 40 × 12 px (nord-sud 6 × 30), l'ombre dessous.
- Solin de cloison : 160 × 30 × 40 cm, couché (`lying`, règle D) : 32 × 10 px, nord-sud 11 × 32.

## Vues
- Foyer : une (`round`) : le cercle de pierres brutes du jeu, les cendres, le feu (deux bûches croisées, les flammes).
- Seuil, banc : deux (`symmetric`). Le banc : le siège d'une planche épaisse, deux pieds pleins, l'entretoise ; nord-sud, le siège en
  long, le pied de devant échancré.
- Solin : quatre (`four`), chaque tirage les siennes.

## Variantes naturelles
Le solin : quatre tirages (les pierres), comme le solin des murs.

## Regroupement
Seuls ; le solin, en tronçons.

## Gestes
- Le foyer : on y posera le bois (la quête). Le banc : la mère s'y assied (à venir).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Pierres brutes ramassées (foyer, solin) ; une dalle de calcaire (seuil) ; des planches (banc).

## Devenir
Ils restent.

## Transformations
Aucune.

## Métier
Le maçon (`mason`) pour le foyer, le seuil, le solin ; le menuisier (`joiner`) pour le banc.

## Vérification
`.art-preview/maison-pieces.png` (rangée 5).
