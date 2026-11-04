# Portes de la maison de Xéros (`cottage-door`, `inner-door`)

Décidé le 2 novembre 2026 (CONCEPTION « La maison de Xéros ») : la porte d'entrée et la porte intérieure, toutes deux de
0,90 × 1,80 m (la porte intérieure passée de 80 à 90 cm le 3 novembre 2026 avec la baie de porte validée par Grégoire,
`art/proposals/baie-porte.ts`), en planches, à la manière de la porte de la cabane (`plank-door`, 1 × 2 m, qui reste celle de la cabane et de la
grange). Dessin de l'essai validé par Grégoire (art/lib/volumes.ts `doorTex`).

## Identité
- Clés : `cottage-door` `cottage-door-open` `inner-door` `inner-door-open`.
- Noms affichés : « porte de la chaumière », « porte intérieure », et « (ouverte) » (féminin).
- Nature : objets du monde, famille `éléments` ; ils s'ouvrent avec E (`swing` : `hinge: side`, `passage`), l'ouvert reprend
  l'image du fermé (comme `plank-door-open`).
- Âge : bois travaillé, `"aged": true`.

## Masse
Par la matière : `{"matter": "wood", "fill": 0.6}` sur 90 × 5 × 180 cm : 44 kg, l'une comme l'autre.

## Dimensions (gabarit, docs/STYLE.md section 8)
90 × 5 × 180 cm, pièces `ground` (elles se posent sur le seuil, entre les deux [huisseries](door-frame.md)). Face : 18 × 38 px ;
de chant : 2 × 54 px.

## Vues
Quatre (`four`) : r0 le dehors (quatre planches debout, leurs joints, les chevilles des traverses, le loquet, le bas mouillé) ; r2
le dedans (les deux traverses et l'écharpe) ; r1, r3 de chant.

## Variantes naturelles
Aucune.

## Regroupement
Seule, dans la baie : sur le seuil (`threshold-stone` à l'entrée, `inner-threshold-stone` dedans), entre deux huisseries
(`door-frame`), sous la [tête de baie](door-head.md).

## Gestes
- E : ouvrir, fermer ; ouverte, on passe (`passage`).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Pas encore fabriquée en jeu : des planches (le gros bois fendu), chevillées.

## Devenir
Elle reste en place.

## Transformations
Aucune.

## Métier
Le menuisier (`joiner`).

## Vérification
`.art-preview/maison-pieces.png` (rangées 3 à 5 : la porte dans ses vues, patinée) ; `.art-preview/baie-porte.png` (la porte
intérieure de 90 dans ses vues et ses âges, montée dans sa travée, fermée et ouverte).
