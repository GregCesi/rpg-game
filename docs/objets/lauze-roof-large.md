# Grand pan de lauzes (`lauze-roof-large`, `lauze-roof-large-pierced`)

**Le 10 novembre 2026 (chantier « maison du coq », réponse 26 de Grégoire)** : ses lauzes sont devenues **notre lave**, la seule lauze du
jeu (plus sombre, moussue, des dalles plus étroites vers le faîte, 3 px à l'égout ; `art/world/coq-lave.ts`, sa fiche : [le toit de
laves](lave-roof.md)). Ses tailles n'ont pas changé.

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées ; le toit de la forge en [bardeaux](shingle-roof-large.md)) : **les trois couvertures restent des pièces du jeu pour
d'autres maisons**, chacune à sa pente ; celle-ci, les lauzes de calcaire, la pierre commune du jeu, à 55°. Le **pan percé** est le
même pan, troué pour un conduit.

## Identité
- Clés : `lauze-roof-large`, `lauze-roof-large-pierced`.
- Nom affiché : grand pan de lauzes ; grand pan de lauzes percé (masculin).
- Nature : objet du monde (`props.json`), famille `éléments`, pièce de toit (`roof: true`, `pitch: south` dans la vue 0), sans
  `take` : des dalles minces de calcaire posées à recouvrement sur la charpente, les plus grandes en bas, les plus petites au faîte.
- Mains : aucune.
- Âge : aucun, c'est de la pierre.

## Masse
- Par la matière : `{"matter": "stone", "fill": 0.045}` sur la boîte de ses `dims` (960 × 340 × 486 cm, 158,6 m³), calcaire
  2 400 kg/m³ : **17,1 t**. La pente fait 5,93 m (486 cm de haut sur 340 de profondeur), soit 56,9 m² de pan : **300 kg/m²**
  (CADRAGE-forge.md, section 0 : « 300 kg/m² et plus », connaissance générale, non sourcée).
- **La part annoncée d'abord, 0,45, donnait 171 t (3 000 kg/m²) : dix fois trop.** 0,045 donne les 300 kg/m² du cadrage.
- C'est **huit fois le grand pan de planches de la grange** (2,2 t) et **neuf fois le pan de bardeaux** (1,9 t) : il faut une charpente
  forte (chevrons serrés, pannes, plus grosses sections). Le jeu ne calcule pas encore ce que porte une pièce : point ouvert.
- Le pan percé : la même part.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 9,60 m le long du faîtage, 3,40 m de la rive basse au faîte, 4,86 m de haut : **55°** (340 × tan 55° = 486). Pourquoi 55° : les lauzes
  se posent raides, pour que l'eau file sur des pierres mal jointes (connaissance générale, **non sourcée**). Son pignon :
  [`board-gable-steep`](board-gable-tall.md). Sur la sablière de la grange (3,42 m), le faîte serait à 8,28 m.
- `ground: true` : r0 et r2, 192 × (97 + 68) = **192 × 165 px** ; r1 et r3, 68 × (97 + 192) = **68 × 289 px**.

## Vues
- Quatre (`four`), le pan vu de dessus en trois quarts : les lauzes grises du calcaire, irrégulières, plus grandes en bas, les
  rangs qui se serrent vers le faîte, le faîtage de pierre. Lumière en haut à gauche, pas d'ombre peinte.
- Le pan percé : le trou et son solin de mortier au droit du conduit, comme le [pan de bardeaux percé](shingle-roof-large.md).

## Variantes naturelles
Aucune pour le pan (les lauzes, une à une, seraient naturelles ; le pan est un seul élément).

## Regroupement
Deux pans font un toit à deux versants.

## Gestes
- Mode construction : clic gauche le pose sur la sablière, R le tourne (le côté bas), clic droit le retire.
- En jeu : il ne bloque pas (posé au-dessus de 2 m).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Pas encore fabriqué en jeu. Les lauzes se lèvent dans un banc de calcaire qui se délite (le carrier, sans métier nouveau) ; la lauze
n'est pas encore un objet.

## Devenir
Il reste.

## Transformations
Aucune pour l'instant.

## Métier
Le couvreur (`roofer`) ; les lauzes, le carrier.

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues, et le pan percé, au gabarit, avec le pignon `board-gable-steep`.
- `npm run check` ; aucun plan ne le pose encore.
