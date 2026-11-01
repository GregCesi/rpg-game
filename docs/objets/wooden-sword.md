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
- Calculée par sa matière : `{"matter": "wood", "fill": 0.79}` sur sa boîte de 90 × 5 × 2,5 cm (la lame s'amincit vers la pointe et
  les bords, la poignée est ronde ; un bois dense), soit **0,8 kg**. Sans effet sur la marche.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 90 cm de long, contour compris (repris le 1er novembre 2026 au rééquilibrage, 80 cm avant) : poignée et pommeau 15 cm, garde 3 cm
  (10 à 15 cm de large), lame 72 cm, 5 cm de large, 2,5 cm d'épaisseur.
- Couchée (`wooden-sword-ground`) : boîte 90 × 5 × 2,5 cm, à plat. À l'écran : **18 × 1 px**, au plancher de lisibilité (2 à 3 px
  de haut, la garde un peu plus large).
- En arme (planche `weapon-wooden-sword`) : 90 cm = 18 px du pommeau à la pointe, la main à 6 cm du pommeau (1 px derrière la
  main, 17 px devant).

## Vues
- Symétrie : quatre vues (`views: "four"`, `lying`) : `wooden-sword-ground` (la pointe à l'est), `-r1` (au sud), `-r2` (à l'ouest),
  `-r3` (au nord) ; les vues nord-sud ont les dimensions de l'est-ouest inversées (règle D).
- Au sol : couchée à plat, la lame claire, la garde et la poignée plus sombres, ombre dessous.
- En main (`held-wooden-sword`, posture `hand`, vues `down`, `up`, `right`) : tenue au poing, la pointe en bas le long de la jambe.
- En attaque (`weapon-wooden-sword`) : un seul dessin, la pointe à l'est, tiré en huit angles (art/lib/weapon.ts), les diagonales
  reprises à la main ; le geste choisit l'angle à chaque image.
- Case d'interface : `item-wooden-sword` (16 × 16, déjà dessinée).
- Fantôme : son image au sol en transparence, là où E ou Q la poserait.

## Au combat
Arme de la famille `swing` (combat.json). Ses réglages (`weapon` d'items.json) : longueur 90 cm, prise à 6 cm, équilibre 0,25 (le
centre de masse près de la garde : elle se contrôle), efficacité 1 (le coup porte sur le fil). Ce qui s'en calcule
(world/strike.ts), à côté de la branche :

| | Branche | Épée de bois | Poing (main nue) |
| --- | --- | --- | --- |
| Longueur, prise | 125 cm, à 10 cm du gros bout | 90 cm, à 6 cm du pommeau | le bras, 60 cm |
| Masse | 2,5 kg | 0,8 kg | 2 kg (poing et avant-bras lancés) |
| Équilibre ; efficacité (données) | 0,6 (poids au bout) ; 0,58 (rameaux qui amortissent) | 0,25 (près de la garde) ; 1 (le fil) | 0,75 ; 1 |
| Portée nominale (bras + arme) | 165 cm | 134 cm | 60 cm |
| Le mannequin touché jusqu'à (lame dessinée, taille) | 29 à 39 px des pieds selon la direction | 23 à 33 px | — |
| Précision (calculée) ; écart d'un coup | 0,18, faible ; jusqu'à 13 px | 0,76, bonne ; moins de 2 px | 0,45 ; jusqu'à 6 px |
| Coups au but au bord de sa portée (1 000 coups simulés) | 70 % | 100 % | — |
| Taille (direct) : dégâts, durée du coup | 8,5 en 1,20 s | 6,0 en 0,53 s | 1,2 en 0,40 s |
| Dégâts par seconde | 7,1 | 11,3 (× 1,59) | 3,0 |
| Coup d'en haut : dégâts, durée | 11,6 en 1,36 s | 8,5 en 0,60 s | — |
| Endurance par coup (taille ; en haut) | 1,30 ; 1,63 | 0,62 ; 0,77 | 0,33 |

Les durées sont la somme des images du geste (garde comprise), allongée par l'inertie de l'arme ; la vitesse du coup vient du chemin
de la pointe dans les poses ; tout se recalcule (world/strike.ts) quand une pose ou un réglage change.

## Variantes naturelles
Aucune : taillée, régulière.

## Regroupement
Seule. Ne s'entrepose pas.

## Gestes
- E court : la prendre (au sol).
- E maintenu : rien.
- Espace (dans la main active, ou dans l'autre si l'active est vide) : attaquer, dans le vide comme sur une cible (CONCEPTION, « Le combat ») ; un deuxième Espace pendant la récupération enchaîne le coup
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
