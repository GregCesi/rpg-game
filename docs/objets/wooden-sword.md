# Épée de bois (`wooden-sword`)

L'épée d'exercice : une lame de bois plate, une garde et une poignée taillées dans la même planche. Première arme de Xéros avec la
branche (CONCEPTION, « Le combat »).

## Identité
- Clé : `wooden-sword` (`items.json`).
- Nom affiché : épée de bois.
- Nature : objet possédable (`kind: weapon`), avec un composant `weapon` (voir Gestes).
- Mains : une.
- Âge : bois travaillé, `"aged": true` : ses images au sol ont leurs trois âges (neuf, patiné, vieux), dessinées dans la rampe `woodAges`.

## Masse
- Calculée par sa matière : `{"matter": "wood", "fill": 0.65}` sur sa boîte de 80 × 5 × 2,5 cm (la lame s'amincit vers la pointe et
  les bords, la poignée est ronde), soit **0,6 kg**. Sans effet sur la marche.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 80 cm de long, contour compris : poignée et pommeau 15 cm, garde 3 cm (10 cm de large), lame 62 cm, 5 cm de large, 2,5 cm d'épaisseur.
- Couchée (`wooden-sword-ground`) : boîte 80 × 5 × 2,5 cm, à plat. À l'écran : **16 × 1 px**, au plancher de lisibilité (2 à 3 px
  de haut, la garde un peu plus large).
- En arme (planche `weapon-wooden-sword`) : 80 cm = 16 px du pommeau à la pointe, la main à 12 cm du pommeau (2 px derrière la
  main, 14 px devant).

## Vues
- Symétrie : quatre vues (`views: "four"`, `lying`) : `wooden-sword-ground` (la pointe à l'est), `-r1` (au sud), `-r2` (à l'ouest),
  `-r3` (au nord) ; les vues nord-sud ont les dimensions de l'est-ouest inversées (règle D).
- Au sol : couchée à plat, la lame claire, la garde et la poignée plus sombres, ombre dessous.
- En main (`held-wooden-sword`, posture `hand`, vues `down`, `up`, `right`) : tenue au poing, la pointe en bas le long de la jambe.
- En attaque (`weapon-wooden-sword`) : un seul dessin, la pointe à l'est, tiré en huit angles (art/lib/weapon.ts), les diagonales
  reprises à la main ; le geste choisit l'angle à chaque image.
- Case d'interface : `item-wooden-sword` (16 × 16, déjà dessinée).
- Fantôme : son image au sol en transparence, là où E ou Q la poserait.

## Variantes naturelles
Aucune : taillée, régulière.

## Regroupement
Seule. Ne s'entrepose pas.

## Gestes
- E court : la prendre (au sol).
- E maintenu : rien.
- Espace, dans la main active : attaquer (CONCEPTION, « Le combat ») ; un deuxième Espace pendant la récupération enchaîne le coup
  suivant (la taille, puis le coup d'en haut). Coûte de l'endurance selon sa masse, même dans le vide.
- R : la tourne à la pose. Q : la lâche devant Xéros.

## Origine
Taillée dans une planche fendue (la pièce de bois `big`, forme `plank`, 1 m) par le menuisier, à l'établi, à la hachette :
transformation `carve-wooden-sword`, geste à venir. En attendant : ?dieu, « Donner » ou « Transformer ».

## Devenir
Elle sert à s'entraîner. Plus tard, elle s'use et se casse peut-être (pas encore).

## Transformations
- `carve-wooden-sword` : une planche fendue de 1 m (6,8 kg) -> l'épée de bois (0,6 kg) ; déchet : copeaux et chutes, qui partent au
  feu. Outil : la hachette. Poste : l'établi. Geste : à venir.

## Métier
Le menuisier (`joiner`).

## Vérification
- Aperçu : `.art-preview/combat.png` (Xéros à trois moments de chaque geste avec l'épée, et l'épée dans ses huit angles),
  `.art-preview/collection.png`, `.art-preview/bois-ages.png`.
- Outils de test : ?dieu, « Donner » l'épée de bois.
- En jeu : `npm run test:combat` ; à la main, l'épée en main active devant le mannequin, Espace dans les quatre directions : le
  mannequin tremble et penche, de la paille vole ; avec `?debug`, les dégâts au-dessus de lui et la zone de coup dessinée.
