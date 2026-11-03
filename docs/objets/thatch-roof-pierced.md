# Pan de chaume percé (`thatch-roof-pierced`)

Décidé le 3 novembre 2026 (retouche de Grégoire, CONCEPTION « La maison de Xéros ») : le pan de chaume plein du versant nord, percé
pour le [conduit](chimney-flue.md) de la cheminée de pierre. La même pièce que le [pan de chaume](thatch-roof.md), un trou en plus.

## Identité
- Clé : `thatch-roof-pierced`.
- Nom affiché : « pan de chaume percé » (masculin).
- Nature : objet du monde, famille `éléments`, pièce de toit (`roof: true`, `pitch: south`, `shadow` : 268 et 658 cm, comme le pan
  plein) ; `layers` : le chevronnage, le demi couvert, lui ; `over` : il recouvre le demi couvert (`thatch-roof-half`).
- Âge : aucun (le chaume plein ne montre pas de bois).

## Masse
`{"matter": "straw", "fill": 0.12}`, comme le pan plein (le trou de 1 × 0,5 m ne compte pas sur 13,80 × 5,50 m) : environ 2,9 t.

## Dimensions (gabarit, docs/STYLE.md section 8)
Celles du pan plein : 1380 × 390 × 445 cm, `ground` : 276 × 168 px (de côté 78 × 365).

## Vues
Quatre (`four`), comme le pan plein. Il sert de pan **nord** (vue r2) : le trou et son solin sont au droit du conduit (x 730 à 830,
y 30 à 80 dans le repère de la maison, tools/lib/maison-xeros.ts ; dans le dessin du pan, x 102 à 122, y 112 à 122 px).
- Vu du sud (r2) : le pan nord à 45° se voit par la tranche ; rien du trou ne paraît.
- Vu du nord (r0) et de côté (r1, r3) : le chaume est percé, bordé d'un solin de mortier de chaux de 10 cm (clair à l'ouest, plus
  sombre au sud et à l'est). Le pan est affiché d'une pièce, par son bord sud, par-dessus le conduit : tout ce que le conduit cache
  dans la vue est laissé vide (le trou, et derrière lui la bande qu'il couvre jusqu'au faîte), pour que le conduit posé reste vu
  au-dessus du chaume. Sans conduit posé, cette bande se voit vide : la pièce ne sert qu'avec lui.

## Variantes naturelles
Aucune.

## Regroupement
Un pan par versant.

## Gestes
Mode construction : posé sur le demi couvert du pan nord, qu'il remplace (tools/lib/maison-xeros.ts : x −40, y −60, z 280, vue 2).

## Travail
Aucun pour l'instant.

## Arme
Aucune.

## Origine
La botte de chaume (`thatch-bundle`) ; le solin, du mortier de chaux.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Le chaumier (`thatcher`).

## Vérification
`.art-preview/maison-pieces.png` (rangée `thatch-roof-pierced`, ses quatre vues), `.art-preview/thatch-roof-pierced.png`.
