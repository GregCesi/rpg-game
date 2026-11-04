# Lapin mort (`dead-rabbit`)

Ce que devient un [lapin](rabbit.md) tué (chantier « lapins », 3 novembre 2026) : la matière se conserve, le lapin devient un objet de
sa masse, là où il meurt.

## Identité
- Clé : `dead-rabbit` (`items.json`).
- Nom affiché : lapin mort.
- Nature : objet possédable (`kind: resource`).
- Mains : une (on le tient par les pattes arrière).
- Âge : non.

## Masse
- Saisie : **1,5 kg** (`mass: 1.5`), celle du lapin vivant (`mass` de la créature, creatures.json ; validate.ts vérifie qu'elles sont
  égales). Sans effet sur la marche.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Couché sur le flanc, étiré : 45 cm de long (pattes arrière tendues), 15 cm de large, 10 cm de haut. Boîte 45 × 15 × 10, couchée
  (`lying`).
- À l'écran : est-ouest **9 × 4 px** (10 cm de haut + 15 cm de dessus en raccourci) ; nord-sud (règle D) **4 × 9 px**.

## Vues
- Symétrie : quatre vues (`views: "four"`, `lying`) : la tête d'un côté, les pattes de l'autre. `dead-rabbit-ground` (la tête à
  l'ouest), `-r1` (au nord), `-r2` (à l'est), `-r3` (au sud).
- Au sol : couché sur le flanc, les pattes tendues, le ventre clair, la queue blanche ; même dessin que la pose `dead` du lapin.
- En main (`held-dead-rabbit`, posture `hand`, vues `down`, `up`, `right`) : pendu par les pattes arrière, la tête en bas, le long de
  la jambe.
- Case d'interface (`item-dead-rabbit`, 16 × 16) : le lapin pendu, lisible en grand.
- Fantôme : l'image au sol en transparence.
- Lancé : son image au sol cachée pendant le vol (comme tout objet lancé).

## Variantes naturelles
Aucune pour l'instant (une seule robe, comme le lapin).

## Regroupement
Seul. Pas de tas (plus tard, peut-être une gibecière ou des lapins liés par les pattes).

## Gestes
- E : le prendre.
- Clic de la main qui le tient : frapper avec, même dans le vide (une arme improvisée très molle).
- Clic maintenu, de la main qui le tient : viser et le lancer.
- R : le tourner avant de le poser. A (Q) : le poser au fantôme.

## Travail
Aucun.

## Arme
Aucune (`weapon` : non) ; tenu, il frappe comme arme improvisée de ses dimensions et de sa masse (world/heft.ts), sans effet notable.

## Origine
Un lapin tué (un coup, un objet lancé) : il tombe là où le lapin meurt, dans GameState comme un objet posé au sol.

## Devenir
À venir : le vendre au boucher, le donner à la mère (le repas), le dépecer (la peau, la viande). Rien de fait : il se garde, se pose,
se lance.

## Transformations
Aucune pour l'instant (le dépeçage viendra).

## Métier
Le chasseur, plus tard ; aujourd'hui `peasant` (le paysan qui tue un lapin près de sa ferme).

## Vérification
- Aperçu : `.art-preview/lapins.png` (propositions), puis `.art-preview/collection.png` et `.art-preview/hands.png`.
- Outils de test (`?dieu`) : le donner en main, le mettre au sol.
- En jeu : tuer un lapin (la force au maximum, une branche) : il devient un lapin mort à sa place ; le prendre, le voir pendu à la main,
  son icône dans la case, le poser, le lancer.
