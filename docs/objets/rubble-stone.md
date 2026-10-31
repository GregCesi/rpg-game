# Moellon (`rubble-stone`)

Récrite le 31 octobre 2026 (chantier « pierre »), à la place de la fiche du chantier « briques ». Le deuxième maillon de la
chaîne de la pierre : il vient de la [grosse pierre brute de carrière](rough-stone.md), dégrossie au têtu, et ses éclats calent
les pierres dans le mur.

**État** : la fiche est en avance sur le jeu. Les dessins se choisissent d'abord sur l'essai (`.art-preview/essai-pierre.png`,
propositions A, B, C, avec un muret d'essai pour chacune) ; rien n'est encore changé dans `items.json`, `piles.json` ni les
dessins du jeu. Ce que l'intégration changera est listé à la fin (« À intégrer »).

## Identité
- Clé : `rubble-stone`, inchangée ; images au sol `rubble-stone-ground` (est-ouest) et `rubble-stone-ground-ns` (nord-sud), puis
  `-b` et `-c` pour ses deux autres formes.
- Nom affiché : moellon.
- Nature : objet possédable (`items.json`, `kind: resource`).
- Mains : deux (posture `carry`).
- Roche : celle de la pierre dont il vient, le **calcaire** (`limestone` ; la roche est décrite dans la fiche de la
  [pierre brute](rough-stone.md)).

## Ce que c'est, et ce que ce n'est pas
Une grosse pierre brute dont on a abattu au têtu les bosses et les angles pour en faire **à peu près** un parallélépipède : faces
à peu près planes mais **bosselées**, traces d'outil, **arêtes cassées**, une face de parement un peu meilleure que les autres
(celle qu'on met au dehors du mur). Ce n'est pas une brique : ni arêtes droites, ni faces lisses, ni mesures égales d'une pièce à
l'autre. Dans un mur, les moellons ont des longueurs différentes, des hauteurs qui varient de quelques centimètres, et des joints
de terre épais où l'on cale des éclats.

## Masse
- Calculée par la roche : `"mass": {"matter": "stone", "fill": 0.85}` (faces bosselées, arêtes cassées : la boîte n'est pas
  pleine), densité du calcaire, 2 400 kg/m³.
- Les trois formes, à leur taille type (puis ± 5 %, au cube) :
  - 30 × 22 × 20 cm : **26,9 kg** (23,1 à 31,2) ;
  - 40 × 22 × 20 cm : **35,9 kg** (30,8 à 41,6) ;
  - 50 × 22 × 20 cm : **44,9 kg** (38,5 à 52,0).
- Toujours porté (70 kg au plus), lentement (au-dessus de 25 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Contour compris : hauteur d'assise **20 cm**, profondeur **22 cm** (de 20 à 25 dans un vrai mur : 22 pour toutes les formes,
  pour que le muret ait une épaisseur réglée), longueur **30, 40 ou 50 cm** selon la forme. Boîte couchée.
- À l'écran (boîte : W × (H + D/2) = L/5 × (4 + 2,2)) : est-ouest **6 × 6, 8 × 6, 10 × 6** px ; nord-sud (règle D, dimensions
  inversées) **6 × 6, 6 × 8, 6 × 10** px.
- Dans un mur : sa face de parement, longueur × hauteur d'assise, **6 × 4, 8 × 4, 10 × 4** px, joint compris (voir « Dans un
  mur »).

## Vues
- Symétrie : `symmetric`, couché (`lying`) : est-ouest et nord-sud ; ses deux bouts se valent (dégrossi, il n'a ni tête ni pied).
  R le tourne d'un quart de tour.
- Au sol : chaque forme dans ses deux vues. Dessus clair, face sud moyenne, bout est sombre ; arêtes ébréchées, bosses, traces de
  têtu, cassures fraîches blanches aux arêtes ; vue nord-sud dessinée (pas une rotation de pixels), lumière en haut à gauche.
- En main : `held-rubble-stone` (`carry`, en travers du ventre : l'est-ouest de face et de dos, le bout de profil), une par forme
  si la longueur se voit (à décider sur le dessin choisi).
- Case d'interface : `item-rubble-stone`. Fantôme : sa vue, en transparence.
- **Dans un mur** : sa face de parement seule (face sud), et le dessus pour l'assise haute ; voir ci-dessous.

## Dans un mur
Le muret d'essai (1,60 m de long, 60 cm de haut, 25 cm d'épaisseur) est **monté par calcul** à partir des moellons dessinés
(`tools/essai-pierre.ts`) : trois assises de 20 cm ; dans chaque assise, des longueurs mêlées (30, 40, 50 cm) tirées à graine
fixe ; joints verticaux décalés d'une assise à l'autre (recouvrement d'au moins 10 cm, jamais deux joints l'un sur l'autre) ;
**joints de mortier de terre épais** (2 à 3 cm en vrai) ; éclats calés dans les vides ; le dessus de l'assise haute visible. Un
joint de 2 à 3 cm fait moins d'un pixel à 5 cm par pixel : la façon de le rendre est notée dans l'essai et dans le rapport. Le
mur doit se lire comme un mur de moellons, pas de briques. C'est le même calcul qui servira au solin et à la cheminée de la
chaumière.

## Variantes naturelles
- **Trois formes** (30, 40 et 50 cm de long), une **taille qui varie de ± 5 %** autour de chacune. Décision de Grégoire : le
  moellon n'est que dégrossi, il garde de la pierre brute sa variété ; il est moins régulier qu'une pièce taillée (la pierre de
  taille, une forme et ses mesures) et plus qu'une pierre brute (± 7 %). C'est un écart voulu à « le travaillé est régulier »
  (CONCEPTION, *Les matières*).
- La forme et la taille sont tirées à la sortie de la taille (ou à l'achat) et gardées par GameState.

## Regroupement
**En tas, en rangées irrégulières** (genre `rubble-stones`), comme on les empile au pied du chantier : 3 de front au sol sur 3 de
haut (9), calés à l'ouest, si bien que leurs bouts à l'est ne s'alignent pas (les longueurs diffèrent) ; une rangée sur deux
légèrement décalée. Bloque dès la première pièce.
- **À décider** : chaque moellon garde sa forme dans le tas (comme la pièce de bois garde ses réglages), au lieu de prendre la
  forme dessinée à sa place comme la pierre brute : sa longueur compte pour le mur. Cela demande des places dont l'image vient de
  la pièce posée (comme les tas de bois calculés de `world/woodPile.ts`).

## Gestes
- E court : le prendre ; sur un tas, reprendre le plus haut.
- E dans le vide, Q : le poser à son fantôme.
- R : le tourner (est-ouest, nord-sud).
- Espace, E maintenu : rien (le dégrossir et le maçonner sont à venir).

## Origine
- **Dégrossi dans une grosse pierre brute** au têtu (transformation `dress-rubble`), au sol ou à la carrière : la forme de 40 cm
  d'ordinaire, celle de 30 cm quand la pierre casse mal. La forme de 50 cm ne sort pas d'une grosse pierre brute (45 cm de long au
  plus avant la taille) : elle vient d'un bloc de carrière plus gros, que Xéros ne porte pas (à venir avec la carrière).
- **Acheté au carrier**, qui dégrossit à la carrière et vend au village (les trois formes).

## Devenir
- Monté au mortier de terre dans le **solin** et la **cheminée** de la chaumière (à venir avec le plan de la maison), avec des
  éclats pour caler.
- Taillé en **pierre de taille** au ciseau et au maillet (`dress-ashlar`), pour les angles et le manteau de la cheminée (la
  pierre de taille sera reprise à son tour, dans la même chaîne).

## Transformations
- `dress-rubble`, dégrossir un moellon : entrée la grosse pierre brute (44,7 à 68,0 kg) ; sortie un moellon de 40 cm (35,9 kg ;
  30 cm, 26,9 kg, si la pierre casse mal) ; déchet : **éclats de pierre**, environ un tiers de la masse de la pierre (19,6 kg pour
  la forme de 40 cm à la taille type), qui **restent au sol** (`stone-chips`) et servent à caler ; outil : têtu ; poste : sol ;
  métier : maçon ; **geste à venir** (« Transformer » dans ?dieu). Coups : ceux du geste × la dureté de la roche (1, le
  calcaire). Bilan de masse : le moellon de 40 cm à sa plus grande taille (41,6 kg) pèse moins que la grosse pierre à sa plus
  petite (44,7 kg), comme le veut `validate.ts` ; la forme de 50 cm (52,0 kg au plus) ne peut pas en sortir, d'où son origine à
  part.
- `dress-ashlar`, tailler une pierre de taille : moellon → pierre de taille ; déchet : éclats et poussière, au sol ; outils :
  ciseau et maillet ; poste : sol ; métier : maçon ; geste à venir. Mesures à reprendre avec la fiche de la pierre de taille.

## Métier
Maçon (`mason`), qui le dégrossit au têtu et le monte. Le carrier le vend déjà dégrossi, sorti de la carrière. (La fiche du
chantier « briques » disait carrier pour les deux.)

## Vérification
- Aperçu de l'essai : `npx tsx tools/essai-pierre.ts`, puis `.art-preview/essai-pierre.png` : pour A, B et C, la grosse pierre
  brute, le moellon dans ses trois formes (est-ouest et nord-sud), ses éclats, et le muret d'essai, à côté de Xéros, sur la grille.
- Après intégration : `briques.png` (ses vues et la chaîne), `piles.png` (le tas), `couches.png` (ses deux vues, règle D) ;
  `npm run check`.
- Outils de test (`?dieu`) : « Transformer » sur une grosse pierre brute tenue (le moellon en main, les éclats au sol) ; en poser
  deux l'un contre l'autre (un tas naît) ; R avant de poser. `npm run test:briques`.

## À intégrer (quand Grégoire aura choisi)
1. `dims` : 40 × 20 × 20 → 22 cm de profondeur ; la longueur suit la forme. `natural` ne connaît que 1 ou 2 formes de mêmes
   mesures : il faudra des formes qui ont chacune leur longueur (`forms: [30, 40, 50]` ou une table), la masse suivant la forme
   puis la taille tirée ; `types.ts`, `world/natural.ts`, `mass.ts`, et `SAVE_VERSION` si le format de `natural` change.
2. `trade` : `quarryman` → `mason` ; métier de `dress-rubble` dans `transforms.json` de même.
3. La roche et sa densité (voir la fiche de la pierre brute).
4. Les dessins de la proposition choisie (six vues au sol, la vue portée, l'icône), les places du tas, puis le calcul du muret
   réutilisé pour le solin.
