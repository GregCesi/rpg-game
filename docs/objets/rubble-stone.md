# Moellon (`short-rubble-stone`, `rubble-stone`, `long-rubble-stone`)

Chantier « pierre » (31 octobre 2026) : fiche écrite avant l'essai (`.art-preview/essai-pierre.png`), puis mise au choix de
Grégoire : **le dessin B** (dégrossi, plus plat et plus calme que la pierre brute : on voit le travail du têtu), **trois longueurs**,
un tas par longueur. Le deuxième maillon de la chaîne de la pierre : il vient de la
[grosse pierre brute de carrière](rough-stone.md), dégrossie au têtu, et ses éclats calent les pierres dans le mur.

## Identité
- Clés : `short-rubble-stone` (30 cm), `rubble-stone` (40 cm), `long-rubble-stone` (50 cm) ; images au sol `<clé>-ground`
  (est-ouest) et `<clé>-ground-ns` (nord-sud). Trois clés plutôt qu'un réglage : la longueur se voit, se pèse, et décide du tas
  (« un tas par longueur ») ; une pièce taillée a ses mesures, pas des formes tirées au hasard.
- Noms affichés : moellon de 30 cm, moellon de 40 cm, moellon de 50 cm.
- Nature : objets possédables (`items.json`, `kind: resource`).
- Mains : deux (posture `carry`).
- Roche : celle de la pierre dont il vient, le **calcaire** (`rocks.json`, voir la fiche de la [pierre brute](rough-stone.md)).

## Ce que c'est, et ce que ce n'est pas
Une grosse pierre brute dont on a abattu au têtu les bosses et les angles pour en faire **à peu près** un parallélépipède : faces à
peu près planes mais **bosselées**, traces d'outil, **arêtes cassées**. Ce n'est pas une brique : ni arêtes droites, ni faces lisses,
ni deux pièces pareilles. Dans un mur, les longueurs se mêlent, les hauteurs varient de quelques centimètres, et des joints de terre
épais reçoivent des éclats.

## Masse
Calculée par la roche : `"mass": {"matter": "stone", "fill": 0.85}` (faces bosselées, arêtes cassées : la boîte n'est pas pleine) ×
2 400 kg/m³, puis ± 5 % de taille, au cube.

| Longueur | Dimensions (cm) | Taille type | Plus petit | Plus gros |
| --- | --- | --- | --- | --- |
| 30 cm | 30 × 22 × 20 | **26,9 kg** | 23,1 kg | 31,2 kg |
| 40 cm | 40 × 22 × 20 | **35,9 kg** | 30,8 kg | 41,6 kg |
| 50 cm | 50 × 22 × 20 | **44,9 kg** | 38,5 kg | 52,0 kg |

Toujours porté (70 kg au plus), lentement (au-dessus de 25 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Contour compris : hauteur d'assise **20 cm**, profondeur **22 cm**, longueur **30, 40 ou 50 cm**. Boîte couchée (`lying`).
- À l'écran (W × (H + D/2) = L/5 × (4 + 2,2)) : est-ouest **6 × 6, 8 × 6, 10 × 6** px ; nord-sud (règle D) **6 × 6, 6 × 8,
  6 × 10** px.

## Vues
- Symétrie : `symmetric`, couché : est-ouest et nord-sud ; ses deux bouts se valent. R le tourne d'un quart de tour.
- Au sol : le dessin B : contraste bas (dessus et face voisins, gris crème), faces bosselées en bandes (les lits de la roche),
  arêtes adoucies, un ou deux coins cassés, traces du têtu ; vue nord-sud dessinée, lumière en haut à gauche.
- En main : `held-<clé>` (`carry`, en travers du ventre : l'est-ouest de face et de dos, le bout de profil).
- Case d'interface : `item-<clé>`, les trois longueurs distinctes. Fantôme : sa vue, en transparence.
- Dans un mur : sa face de parement seule, voir l'essai `essai-murs.png` (pas encore en jeu).

## Variantes naturelles
Une forme par longueur, et une **taille qui varie de ± 5 %** (`natural: {forms: 1, vary: 5}`) : dégrossi, il garde de la pierre brute
un peu de sa variété (± 7 % pour elle), moins qu'elle et plus qu'une pièce taillée (la pierre de taille, à ses mesures). La taille est
tirée à la sortie de la taille ou au don, gardée par GameState ; masse au cube.

## Regroupement
**Un tas par longueur, jamais mêlés** (décision de Grégoire) : genres `short-rubble-stones`, `rubble-stones`, `long-rubble-stones`
(`piles.json`) : 3 de front au sol sur 3 de haut (9), une rangée sur deux légèrement décalée, comme au pied d'un chantier. Bloque dès
la première pièce.

## Gestes
- E court : le prendre ; sur un tas, reprendre le plus haut.
- E dans le vide, Q : le poser à son fantôme ; contre un moellon identique seul au sol, un tas naît.
- R : le tourner (est-ouest, nord-sud).
- Espace, E maintenu : rien (le dégrossir et le maçonner sont à venir).

## Origine
- **Dégrossi dans une grosse pierre brute** au têtu : la longueur de 40 cm d'ordinaire, celle de 30 cm quand la pierre casse mal. La
  longueur de 50 cm ne sort pas d'une grosse pierre brute (45 cm au plus avant la taille, et le bilan de masse ne le permet pas) :
  elle vient d'un bloc de carrière plus gros, que Xéros ne porte pas (à venir avec la carrière).
- **Acheté au carrier**, dégrossi à la carrière (les trois longueurs). Pour l'instant : ?dieu le donne.

## Devenir
- Monté au mortier de terre dans le **solin** et la **cheminée** de la chaumière, avec des éclats et de petites pierres pour caler (à
  venir avec le plan de la maison ; voir l'essai `essai-murs.png`).
- Taillé en **pierre de taille** au ciseau et au maillet (`dress-ashlar`, le moellon de 40 cm).

## Transformations
Geste à venir pour toutes (« Transformer » dans ?dieu) ; le déchet, des éclats (`stone-chips`), reste au sol.
- `dress-rubble`, dégrossir un moellon : grosse pierre brute (55,5 kg) → moellon de 40 cm (35,9 kg) ; éclats 19,6 kg, environ un tiers ;
  têtu ; sol ; maçon. Bilan : 41,6 kg au plus contre 44,7 kg au moins.
- `dress-short-rubble`, dégrossir un moellon court : grosse pierre brute → moellon de 30 cm (26,9 kg) ; éclats 28,6 kg ; têtu ; sol ;
  maçon.
- `dress-ashlar`, tailler une pierre de taille : moellon de 40 cm → pierre de taille (40 × 20 × 15 cm, 28,8 kg) ; éclats et poussière
  7,1 kg ; ciseau et maillet ; sol ; maçon.

## Métier
Maçon (`mason`), qui le dégrossit au têtu et le monte ; le carrier le vend déjà dégrossi.

## Vérification
- Aperçu : `npm run art:preview`, puis `briques.png` (groupe 1 : les trois longueurs, leurs deux vues, les chaînes), `piles.png` (un tas
  par longueur), `couches.png` (règle D), `hands.png`.
- Outils de test (`?dieu`) : « Donner » un moellon de chaque longueur, « Transformer » une grosse pierre brute tenue (le moellon en
  main, les éclats au sol), poser deux moellons identiques l'un contre l'autre (un tas naît), R avant de poser.
- `npm run test:briques` : le moellon de 40 cm dégrossi (masse selon sa taille tirée, éclats), puis taillé en pierre de taille, et un
  tas de moellons de 40 cm, un de 50 cm.
