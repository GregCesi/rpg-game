# Pierre brute de carrière (`small-rough-stone`, `rough-stone`, `big-rough-stone`)

Chantier « pierre » (31 octobre 2026) : fiche écrite avant l'essai (`.art-preview/essai-pierre.png`, propositions A, B, C), puis
mise au choix de Grégoire : **le dessin C** (« cassures et taches »), **trois tailles**, un tas par taille. Une fiche pour les trois
(même objet, trois tailles). C'est le premier maillon de la chaîne de la pierre : la [dalle](slab.md) en est la forme plate, le
[moellon](rubble-stone.md) en vient.

## Identité
- Clés : `small-rough-stone` (petite), `rough-stone` (moyenne), `big-rough-stone` (grosse) ; images au sol `<clé>-ground` et leur
  seconde forme `<clé>-ground-b`.
- Noms affichés : petite pierre brute, pierre brute, grosse pierre brute.
- Nature : objets possédables (`items.json`, `kind: resource`).
- Mains : **une** pour la petite (tenue dans la main, posture `hand`) ; **deux** pour la moyenne et la grosse (portées devant le
  ventre, posture `carry`).
- Roche : **le calcaire** (`limestone`, voir « La roche »).

## La roche
Décision de Grégoire : la pierre commune du village est un **calcaire gris clair, presque blanc**, la moins chère, tirée d'une
carrière toute proche. D'autres pierres, d'autres couleurs viendront plus tard. **La roche est un réglage de la pierre, pas un
objet** : une nouvelle couleur de pierre = une nouvelle roche, jamais une nouvelle clé.
- `src/content/rocks.json` : `limestone`, « calcaire », gris clair presque blanc, rampe `! + = ; ~` d'`art/palette.ts` (cassure
  fraîche `#f3eedf`, au soleil `#ddd3bb`, patiné `#bdb29c`, à l'ombre `#958a84`, fissure `#675a5a` : la lumière glisse vers le crème,
  l'ombre vers le brun-violet), **2 400 kg/m³**, dureté **1** (la référence : elle multipliera le nombre de coups d'outil pour
  tailler ; un granit vaudra 3), prix **1** (la référence, la moins chère).
- `matters.json` : la matière `stone` n'a plus de densité à elle mais sa roche commune (`"rock": "limestone"`) ; une pierre d'une
  autre roche le dira dans sa masse (`"mass": {"matter": "stone", "fill": …, "rock": "…"}`). `mass.ts` (`matterDensity`) prend la
  densité de la roche ; `validate.ts` vérifie les liens, `npm run check` que la rampe est dans la palette.
- Toutes les pierres du jeu pèsent désormais au calcaire (2 600 kg/m³ avant).

## Masse
Calculée par la roche : `"mass": {"matter": "stone", "fill": 0.56}` : le volume de la boîte de ses `dims` × **0,56** (un bloc de
carrière anguleux, cassé à plans, remplit mieux sa boîte qu'un galet : 0,52 avant) × 2 400 kg/m³. Puis ± 7 % de taille, au cube.

| Taille | Dimensions (cm) | Taille type | Plus petite | Plus grosse | Pour Xéros |
| --- | --- | --- | --- | --- | --- |
| Petite | 17 × 15 × 13 | **4,5 kg** | 3,6 kg | 5,5 kg | d'une main, marche normale |
| Moyenne | 26 × 22 × 19 | **14,6 kg** | 11,8 kg | 17,9 kg | à deux mains, marche normale |
| Grosse | 45 × 34 × 27 | **55,5 kg** | 44,7 kg | 68,0 kg | à deux mains, lentement (au-dessus de 25 kg) |

`validate.ts` vérifie que même la plus grosse se porte (70 kg).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Boîte englobante (`box`), contour compris, largeur × profondeur × hauteur (tableau ci-dessus).
- À l'écran (boîte : W × (H + D/2)) : petite 3,4 × 4,1 px, agrandie par le plancher de lisibilité (6 px de large au plus) à
  **environ 5 × 5** ; moyenne 5,2 × 6 → **6 × 6 à 7 × 6** ; grosse **9 × 9 à 10 × 8**. Chaque forme dans les 2 px.

## Vues
- Symétrie : ronde (`views: "round"`) : une pierre brute n'a ni devant ni bout ; ses deux formes tiennent lieu de côtés. R ne la
  tourne pas.
- Au sol : `<clé>-ground` et `<clé>-ground-b`, le dessin C : silhouettes cabossées (une marche, un creux, une bosse : jamais un
  polygone net ni un œuf) ; du blanc de cassure fraîche seulement là où un morceau a sauté, à côté d'une encoche du contour ;
  fissures sombres ; taches de patine grise ou ocre sur la face ; contraste moyen (dessus `+`, face `=`, flanc est `;`) ; ombre
  portée au sud-est.
- En main : `held-small-rough-stone` (posture `hand`, dans la main), `held-rough-stone`, `held-big-rough-stone` (posture `carry`) ;
  vues `down`, `up`, `right`.
- Case d'interface : `item-<clé>` (16 × 16).
- Fantôme : l'image de sa forme, en transparence, là où elle ira.
- Dans un pierrier : les deux formes mêlées.

## Variantes naturelles
Deux formes dessinées par taille, deux cassures différentes (la forme b n'est pas la forme a retournée) ; taille type ± 7 %
(`natural: {forms: 2, vary: 7}`), tirées à l'apparition (donnée par ?dieu, sortie d'une transformation), gardées par GameState
(`natural` de ce qu'on tient et de ce qui est au sol). Masse au cube de la taille ; l'image ne change pas. Reprise d'un pierrier,
une pierre a la forme dessinée à sa place et la taille type.

## Regroupement
**Un pierrier par taille, jamais mêlées** (décision de Grégoire) : genres `small-rough-stones`, `rough-stones`, `big-rough-stones`
(`piles.json`) ; un tas n'accepte que des pièces identiques, donc la même taille. 7 places : 4 au sol pas toutes alignées, 2 dans les
creux, 1 au sommet, décalée ; formes a et b mêlées. Les tas de petites et de moyennes bloquent à partir de 3 pierres, celui des
grosses dès la première.

## Gestes
- E court : la prendre (la petite dans une main libre, les autres à deux mains) ; sur un pierrier, reprendre la plus haute.
- E dans le vide, Q : la poser devant soi, à son fantôme ; contre une pierre identique seule au sol, un pierrier naît.
- E maintenu, Espace, R : rien.

## Origine
- **La carrière**, toute proche du village (pas encore de carte) : achetée au carrier, la moins chère des pierres. Plus tard,
  extraite soi-même au pic, aux coins et au levier, en ouvrant la roche selon ses lits.
- Les moyennes et les petites viennent aussi de la casse d'une plus grosse (ci-dessous).
- Pour l'instant : ?dieu la donne ou la met au sol.

## Devenir
- La grosse : **moellon** (dégrossie au têtu), ou cassée en moyennes et en petite.
- La moyenne : cassée en petites.
- La petite : le blocage du mur, pour caler les pierres (à venir avec le plan de la maison ; l'essai `essai-murs.png` la montre dans
  le mur brut).

## Transformations
Toutes au têtu, au sol, **geste à venir** (« Transformer » dans ?dieu) ; le déchet, des **éclats de pierre** (`stone-chips`), reste au
sol. Les masses ci-dessous sont à la taille type ; le bilan de `validate.ts` (la sortie à sa plus grande taille ne pèse pas plus que
l'entrée à sa plus petite) est juste pour chacune.
- `break-big-stone`, casser une grosse pierre : grosse (55,5 kg) → **2 moyennes + 1 petite** (33,7 kg) ; éclats 21,8 kg ; carrier.
  Bilan : 41,3 kg au plus contre 44,7 kg au moins.
- `break-stone`, casser une pierre : moyenne (14,6 kg) → **2 petites** (8,9 kg) ; éclats 5,7 kg ; carrier. Bilan : 10,9 contre
  11,8 kg.
- `dress-rubble`, dégrossir un moellon : grosse → **moellon de 40 cm** (35,9 kg) ; éclats 19,6 kg ; maçon. Bilan : 41,6 contre
  44,7 kg.
- `dress-short-rubble`, dégrossir un moellon court : grosse → **moellon de 30 cm** (26,9 kg), quand la pierre casse mal ; éclats
  28,6 kg ; maçon.

## Métier
Carrier (`quarryman`) : il tire la pierre de la carrière, la casse et la vend au village.

## Vérification
- Aperçu : `npm run art:preview`, puis `.art-preview/briques.png` (groupe 1 : les trois tailles et leurs formes à côté de Xéros, les
  chaînes de casse et de taille), `piles.png` (les trois pierriers), `hands.png` (les vues tenues), `gabarit.png`.
- Outils de test (`?dieu`) : « Donner » une pierre de chaque taille (la masse portée varie d'une fois à l'autre), « Au sol », la
  reprendre, en poser deux identiques l'une contre l'autre (un pierrier naît), « Transformer » : casser une grosse pierre,
  dégrossir un moellon.
- `npm run test:briques` : la grosse pierre dégrossie (masse, éclats), cassée en deux moyennes et une petite, et un tas par taille.
