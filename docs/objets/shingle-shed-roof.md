# Pan d'appentis en bardeaux (`shingle-shed-roof`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées ; **le toit de l'atelier et de l'abri à charbon en bardeaux de chêne fendu, gris**) : le toit à une pente de l'abri à
charbon et à bois, à l'est de l'atelier, comme le [grand pan de bardeaux](shingle-roof-large.md) en petit.

## Identité
- Clé : `shingle-shed-roof`.
- Nom affiché : pan d'appentis en bardeaux (masculin).
- Nature : objet du monde (`props.json`), famille `éléments`, pièce de toit (`roof: true`), sans `take` : des bardeaux (le
  [bardeau](shingle.md) du jeu) cloués sur des lattes, trois épaisseurs.
- Mains : aucune.
- Âge : bois travaillé, il prend l'âge du bois (`"aged": true` ; gris au vieux, comme l'atelier).

## Masse
- Par la matière : `{"matter": "wood", "fill": 0.0245}` sur la boîte de ses `dims` (380 × 320 × 232 cm, 28,2 m³) : **622 kg**. La pente
  fait 3,95 m (232 cm de haut sur 320 de profondeur), soit 15,02 m² ; au poids des bardeaux du jeu, 41,5 kg/m² (le calcul est dans la
  fiche du [grand pan de bardeaux](shingle-roof-large.md)) : 623 kg. Lattes non comptées.
- **La part annoncée d'abord, 0,17, donnait 4 t (273 kg/m²) : dix fois trop** ; un dixième, 0,017 (27 kg/m²), serait un bardeau
  sec et léger.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 380 cm le long de l'appentis (est-ouest), 320 cm de la rive basse au haut (nord-sud), 232 cm de haut : **35°** (arc tangente de
  232 ÷ 320 = 35,9° pour la boîte ; le dessous du pan, sans l'épaisseur des bardeaux, monte de 224 cm sur 320 : 35°), la pente que
  donnent les poteaux (140 cm sur les 200 entre les sablières). Le côté bas au sud dans la vue 0 : **poteaux nord de 3 m, poteaux sud de
  1,60 m**, sur des dalles de 12 cm. Posé à **z = 172 cm** : il repose sur la sablière sud (dessus à 2,02 m) et sur la sablière nord
  (3,42 m).
- **35° est en bas de ce qui convient aux bardeaux, honnêtement** (connaissance générale, **non sourcée** : on les pose d'ordinaire à 40°
  et plus, rarement sous 30° ; plus la pente est faible, plus l'eau s'attarde et pourrit le bois). Ce qui irait mieux : un pureau plus
  court (quatre épaisseurs, environ 55 kg/m², le pan vers 800 kg), ou des poteaux nord plus hauts. Gardé à 35° pour l'instant ; à
  revoir si Grégoire le veut plus raide.
- Place sur la parcelle : l'abri en x 1400–1705, y 1600–1955 (cm depuis le coin nord-ouest), à l'est de l'atelier.
- `ground: true` : r0, 76 × (46,4 + 64) = **76 × 110 px** ; r1 et r3, 64 × (46,4 + 76) = **64 × 122 px** (dessinés à ces tailles).
- Ombre portée (`shadow`) : **south 180, north 404** (cm) : le dessus de la rive basse (z 172, plus l'épaisseur des bardeaux) et la haute
  rive (172 + 232).

## Vues
- Quatre (`four`), le pan vu de dessus en trois quarts : les rangs de bardeaux en écailles, la rive basse au sud, la rive haute
  au nord, sur la sablière des poteaux de 3 m. Gris au vieux. Lumière en haut à gauche, pas d'ombre peinte.

## Variantes naturelles
Aucune.

## Regroupement
Seul : un appentis a un seul pan.

## Gestes
- Mode construction : clic gauche le pose, sa rive basse sur la sablière basse, R le tourne (le côté bas), clic droit le retire.
- En jeu : il ne bloque pas (seules les pièces à `body` bloquent ; sa rive basse est à 1,60 m, la taille de Xéros) ; il s'efface
  quand Xéros est dessous (abri ouvert).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Pas encore fabriqué en jeu. Comme le grand pan de bardeaux : les bardeaux du coutre, les lattes (la latte existe, `lath` de wood.json,
pas encore le lattis posé), les clous du forgeron (pas encore au jeu).

## Devenir
Il reste.

## Transformations
Aucune pour l'instant.

## Métier
Le couvreur (`roofer`).

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues au gabarit, Xéros à côté ; ses trois âges.
- `npm run test:forge` (à venir) pose l'abri à charbon et son pan ; `npm run check`.
