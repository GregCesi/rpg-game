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
Quatre (`four`), comme le pan plein. Il sert de pan **nord** (vue r2) : le trou et son solin sont au droit du conduit (x 720 à 820,
y 30 à 110 cm dans le repère de la maison ; dans le dessin du pan, x 104 à 124, y 107 à 123 px : le pan nord posé à x = −40,
y = −65 cm (l'aimant du mode construction le tire de 5 cm au nord), le point (x, y) de la maison en px devient (268 − x, 129 − y),
la relation de la proposition validée de la cheminée, `art/proposals/cheminee-2.ts`, (268 − x, 130 − y) pour le pan à y = −60,
avancée d'un pixel au nord avec lui). Le trou se tire de la souche elle-même (`PAN_STACK` d'art/world/chimney.ts : le conduit jusqu'à
7,50 m, le couronnement au-dessus) : il suit la cheminée si elle change.
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
`.art-preview/maison-pieces.png` (rangée `thatch-roof-pierced`, ses quatre vues), `.art-preview/thatch-roof-pierced.png`,
`.art-preview/cheminee-2.png` (le pan posé par-dessus la souche, comme le jeu, et la maison vue du nord).
