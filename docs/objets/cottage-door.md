# Portes de la maison de Xéros (`cottage-door`, `inner-door`)

Décidé le 2 novembre 2026 (CONCEPTION « La maison de Xéros ») : la porte d'entrée de 0,90 × 1,80 m et la porte intérieure de
0,80 × 1,80 m, en planches, à la manière de la porte de la cabane (`plank-door`, 1 × 2 m, qui reste celle de la cabane et de la
grange). Dessin de l'essai validé par Grégoire (art/lib/volumes.ts `doorTex`).

## Identité
- Clés : `cottage-door` `cottage-door-open` `inner-door` `inner-door-open`.
- Noms affichés : « porte de la chaumière », « porte intérieure », et « (ouverte) » (féminin).
- Nature : objets du monde, famille `éléments` ; ils s'ouvrent avec E (`swing` : `hinge: side`, `passage`), l'ouvert reprend
  l'image du fermé (comme `plank-door-open`).
- Âge : bois travaillé, `"aged": true`.

## Masse
Par la matière : `{"matter": "wood", "fill": 0.6}` sur 90 × 5 × 180 cm : 44 kg (80 cm : 39 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
90 × 5 × 180 cm et 80 × 5 × 180 cm, pièces `ground` (elles se posent dans la baie entre les deux jambages). Face : 18 × 38 et
16 × 38 px ; de chant : 2 × 54 et 2 × 52 px.

## Vues
Quatre (`four`) : r0 le dehors (quatre planches debout, leurs joints, les chevilles des traverses, le loquet, le bas mouillé) ; r2
le dedans (les deux traverses et l'écharpe) ; r1, r3 de chant.

## Variantes naturelles
Aucune.

## Regroupement
Seule, dans la baie, entre `*-jamb` (entrée) ou `*-inner-jamb` (intérieure).

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
`.art-preview/maison-pieces.png` (rangées 3 à 5 : la porte dans ses vues, montée dans sa travée, patinée).
