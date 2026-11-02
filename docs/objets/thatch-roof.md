# Pan de chaume et faîtage de terre (`thatch-roof-frame`, `thatch-roof-half`, `thatch-roof`, `earth-ridge`)

Décidé le 2 novembre 2026 (CONCEPTION « La maison de Xéros ») : le toit de la chaumière, un pan par versant (comme le grand pan de
la grange), en trois étapes qui se recouvrent, et le faîtage de terre où l'herbe prend. Le dessin de l'essai validé par Grégoire.

## Identité
- Clés : `thatch-roof-frame` `thatch-roof-half` `thatch-roof` `earth-ridge`.
- Noms affichés : « chevronnage et lattis », « pan de chaume à demi couvert », « pan de chaume », « faîtage de terre » (masculin).
- Nature : objets du monde, famille `éléments`, pièces de toit (`roof: true` : ils s'effacent quand Xéros est dessous), `pitch:
  south` pour les pans. `layers` et `over` : le demi couvert recouvre le chevronnage, le plein le demi couvert.
- Âge : chevrons (perches avec leur écorce) et lattes (bois fendu) : `"aged": true` pour le chevronnage et le demi couvert ; le pan
  plein et le faîtage n'en montrent pas.

## Masse
Chevronnage : `wood`, fill 0,008 (environ 1,9 t de perches et de lattes sur la boîte) ; chaume : `straw` (paille tassée, 100 kg/m³),
0,06 (demi) et 0,12 (plein : 40 cm de chaume sur 13,80 × 5,50 m, environ 3 t) ; faîtage : `earth` 0,7.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Le pan, sur 13,80 m (12,80 entre les pignons, 50 cm de débord de chaque côté), à 45°, l'égout à 70 cm au-delà de l'axe du mur :
  pièce `ground`. Plein : 1380 × 390 × 445 cm (276 × 168 px ; de côté 78 × 365) ; son ombre portée calculée par le jeu
  (`shadow` : 268 cm à l'égout, 658 au faîte, la hauteur de l'essai). Chevronnage et demi couvert : 1380 × 410 × 380 cm (276 × 158
  px ; les chevrons croisés dépassent le faîte de 15 cm vers le nord).
- Le faîtage : 1385 × 50 × 35 cm (un bourrelet de 60 cm d'assise et 37 de haut, arrondi : la boîte qui suit son dessin au gabarit
  `ground`, 277 × 15 px, en long 12 × 284).

## Vues
- Les pans : quatre (`four`) : r0 le pan sud (sa rive basse au sud), r2 le pan nord vu du sud (à 45°, vu par la tranche : quelques
  rangées, puis le vide jusqu'au bord sud de son emprise, comme le grand pan de la grange), r1, r3 de côté.
- Chevronnage : les perches tous les 40 cm, croisées au faîte, les lattes tous les 30 cm. Demi couvert : une couche de chaume au bas
  du pan. Plein : les rangs de chaume, l'égout effiloché, les rives, coupé d'aplomb au faîte (sous le faîtage).
- Faîtage : deux vues (`symmetric`), est-ouest et nord-sud.

## Variantes naturelles
Aucune.

## Regroupement
Un pan par versant ; le faîtage d'un seul tenant sur le faîte.

## Gestes
Mode construction : posés sur les sablières (le pan), sur le faîte (le faîtage).

## Travail
Aucun pour l'instant.

## Arme
Aucune.

## Origine
Chevrons : des perches (`pole`) ; lattes : la perche fendue (`pole` `lath`) ; chaume : la botte de chaume (`thatch-bundle`) ;
faîtage : la terre gâchée.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Chevronnage : le charpentier (`carpenter`) ; chaume : le chaumier (`thatcher`) ; faîtage : le terrassier (`digger`).

## Vérification
`.art-preview/maison-pieces.png` (rangées 7 à 9).
