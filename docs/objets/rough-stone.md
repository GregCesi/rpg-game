# Pierre brute de carrière (`rough-stone`, `big-rough-stone`)

Récrite le 31 octobre 2026 (chantier « pierre »), à la place de la fiche du chantier « briques ». Deux tailles de la même pierre :
la moyenne et la grosse. Une fiche pour les deux (même objet, deux tailles). C'est le premier maillon de la chaîne de la pierre :
le moellon en vient, et la fiche du [moellon](rubble-stone.md) part de celle-ci.

**État** : la fiche est en avance sur le jeu. Les dessins se choisissent d'abord sur l'essai (`.art-preview/essai-pierre.png`,
propositions A, B, C, `art/proposals/`) ; rien n'est encore changé dans `items.json`, `piles.json` ni les dessins du jeu. Ce que
l'intégration changera est listé à la fin (« À intégrer »).

## Identité
- Clés : `rough-stone` (moyenne), `big-rough-stone` (grosse), inchangées (les renommer changerait le format de la sauvegarde) ;
  images au sol `rough-stone-ground`, `big-rough-stone-ground` et leur seconde forme `-b`.
- Noms affichés : pierre brute, grosse pierre brute.
- Nature : objets possédables (`items.json`, `kind: resource`).
- Mains : deux, toutes les deux (portées devant le ventre, posture `carry`) : une pierre anguleuse de 15 kg se tient à deux mains,
  même moyenne.
- Roche : **le calcaire** (`limestone`), la pierre commune du village (voir « La roche » plus bas).

## La roche
Décision de Grégoire : la pierre commune du village est un **calcaire gris clair, presque blanc**, la moins chère, tirée d'une
carrière toute proche. D'autres pierres, d'autres couleurs viendront plus tard. **La roche est un réglage de la pierre, pas un
objet** : une nouvelle couleur de pierre = une nouvelle roche, jamais une nouvelle clé.
- Une roche a un nom, une couleur (une rampe de 4 à 5 tons dans `art/palette.ts`), une densité, une dureté à la taille et un prix
  relatif.
- Le calcaire : rampe `! + = ; ~` d'`art/palette.ts` (cassure fraîche `#f3eedf`, au soleil `#ddd3bb`, patiné `#bdb29c`, à l'ombre
  `#958a84`, fissure `#675a5a` : la lumière glisse vers le crème, l'ombre vers le brun-violet) ; **2 400 kg/m³** ; dureté **1** (la référence : elle multiplie le nombre de coups d'outil pour tailler ;
  un granit vaudra 3) ; prix **1** (la référence, la moins chère).
- Pour l'essai, la roche vit côté dessin (`art/proposals/roches.ts`), avec sa rampe. Dans le jeu, elle deviendra un fichier de
  contenu, `src/content/rocks.json` (`"limestone": {"name": "calcaire", "ramp": [...], "density": 2400, "hardness": 1,
  "price": 1}`), et chaque pierre portera `"rock": "limestone"` (le calcaire par défaut). Elle n'est pas entrée dans
  `matters.json` maintenant : la pierre y pèse 2 600 kg/m³, et la passer à 2 400 changerait la masse de toutes les pierres du jeu,
  ce que ce chantier ne fait pas.

## Masse
- Calculée par la roche : `"mass": {"matter": "stone", "fill": 0.56}`, densité celle de la roche. Le volume de la boîte de ses
  `dims` × **0,56** × 2 400 kg/m³. 0,56 au lieu de 0,52 (l'ellipsoïde de la boîte, la pierre ramassée aux champs) : un bloc de
  carrière est anguleux, cassé à plans, il remplit mieux sa boîte qu'un galet.
- Moyenne : 26 × 22 × 19 cm → **14,6 kg** à sa taille type, de 11,9 à 17,9 kg selon sa taille tirée (± 7 %, au cube). Marche
  normale (moins de 25 kg).
- Grosse : 45 × 34 × 27 cm → **55,5 kg**, de 44,7 à 68,0 kg : toujours portée (70 kg au plus), lentement (au-dessus de 25 kg).
  `validate.ts` vérifie que même la plus grosse se porte.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Boîte englobante (`box`), contour compris, largeur × profondeur × hauteur : moyenne 26 × 22 × 19 cm, grosse 45 × 34 × 27 cm.
- À l'écran (boîte : W × (H + D/2)) : moyenne 5,2 × (3,8 + 2,2) = 5,2 × 6 px ; le plancher de lisibilité (6 px de large au plus)
  permet **6 × 6 à 6 × 7**. Grosse 9 × (5,4 + 3,4) = **9 × 9** px. Une forme b peut se coucher autrement (plus large que
  profonde, ou l'inverse), dans les 2 px de tolérance.
- À 6 px de large, la moyenne a une trentaine de pixels : c'est la silhouette et deux ou trois plans qui la font lire, pas le
  détail.

## Vues
- Symétrie : ronde (`views: "round"`) : une pierre brute n'a ni devant ni bout ; ses deux formes tiennent lieu de côtés. R ne la
  tourne pas.
- Au sol : `<image>` et `<image>-b`. Bloc anguleux, cassé, **jamais lisse, jamais en œuf** ; quelques faces plus planes, là où la
  roche s'ouvre selon ses lits ; arêtes vives ; fissures plus sombres ; **cassures fraîches plus blanches** que les faces
  patinées. Dessus clair, face sud moyenne, flanc est sombre (lumière en haut à gauche) ; contour selon STYLE.md section 3 ;
  ombre portée `x` au sud-est.
- En main : `held-rough-stone`, `held-big-rough-stone` (posture `carry`, vues `down`, `up`, `right`), redessinées dans le parti
  pris choisi.
- Case d'interface : `item-rough-stone`, `item-big-rough-stone` (16 × 16), de même.
- Fantôme : l'image de sa forme, en transparence, là où elle ira.
- Dans un pierrier : les deux formes mêlées, voir « Regroupement ».

## Variantes naturelles
- Deux formes dessinées par taille, deux cassures différentes (la forme b n'est pas la forme a retournée) ; taille type ± 7 %
  (`natural: {forms: 2, vary: 7}`), tirées à l'apparition (achetée, sortie de carrière, donnée par ?dieu), gardées par GameState
  (`natural` de ce qu'on tient et de ce qui est au sol). Masse au cube de la taille. L'image ne change pas avec la taille (± 7 % de
  45 cm : moins d'un pixel).
- Reprise d'un pierrier, une pierre a la forme dessinée à sa place et la taille type : le tas range des pierres semblables.

## Regroupement
**Le pierrier**, un tas irrégulier : genres `rough-stones` (moyennes) et `big-rough-stones` (grosses) de `piles.json`. 7 places
au lieu de la pyramide régulière de 6 : 4 au sol, pas toutes alignées (l'une un peu en avant, l'autre en arrière), 2 calées dans
les creux, 1 au sommet, décalée ; les formes a et b mêlées, sans alternance régulière. Le tas des moyennes bloque à partir de 3,
celui des grosses dès la première.
- **À décider** : un vrai pierrier de carrière mêle moyennes et grosses. La règle des tas (« un tas n'accepte que des pièces
  identiques ») fait un pierrier par taille. L'essai montre un pierrier mêlé, pour juger à l'œil ; le mêler en jeu demanderait de
  faire accepter au genre deux objets.

## Gestes
- E court : la prendre (à deux mains) ; sur un pierrier, reprendre la plus haute.
- E dans le vide, Q : la poser devant soi, à son fantôme ; contre une pierre identique seule au sol, un pierrier naît.
- E maintenu, Espace, R : rien.

## Origine
- **La carrière**, toute proche du village (pas encore de carte). On l'achète au carrier : le calcaire est la pierre la moins
  chère (prix 1).
- Plus tard : l'extraire soi-même, au pic, aux coins et au levier, en ouvrant la roche selon ses lits (geste et carte à venir).
- Pour l'instant : ?dieu la donne ou la met au sol.

## Devenir
- **Moellon** : la grosse, dégrossie au têtu (la suite de la chaîne, [moellon](rubble-stone.md)).
- **Dé** (`footing-stone`) : une grosse dressée en pierre d'appui. **À revoir** : le dé fait 40 × 40 cm et la grosse pierre n'a
  que 34 cm de profondeur (36 à sa taille la plus forte) ; il faudra soit un dé plus petit, soit un bloc de carrière plus gros.
- **Éclats** : la moyenne, cassée au têtu, donne du blocage (des cales pour le mur).

## Transformations
- `dress-rubble`, dégrossir un moellon : grosse pierre brute → moellon (la forme de 40 cm d'ordinaire, 35,9 kg ; celle de 30 cm
  quand la pierre casse mal) ; déchet : **éclats de pierre**, environ un tiers de la masse (19,6 kg pour le moellon de 40 cm),
  qui **restent au sol** (`stone-chips`) et calent les pierres dans le mur ; outil : têtu ; poste : sol ; métier : maçon ;
  **geste à venir** (« Transformer » dans ?dieu). Nombre de coups : celui du geste × la dureté de la roche (1 pour le calcaire).
- `dress-footing`, dresser un dé (à créer) : grosse pierre brute → dé ; déchet : éclats ; têtu ; sol ; geste à venir ; mesures à
  revoir (voir « Devenir »).
- `break-stone`, casser en blocage (à créer) : pierre brute moyenne → éclats ; têtu ; sol ; geste à venir.

## Métier
Carrier (`quarryman`) : il tire la pierre de la carrière et la vend au village. Tout paysan peut en extraire, plus tard.

## Vérification
- Aperçu de l'essai : `npx tsx tools/essai-pierre.ts`, puis `.art-preview/essai-pierre.png` : pour A, B et C, les deux tailles
  et leurs deux formes, avec mesures et masse, à côté de Xéros, sur la grille, et un pierrier.
- Après intégration : `npm run art:preview`, `briques.png` (toutes ses vues et formes à côté de Xéros), `piles.png` (le
  pierrier), `gabarit.png` (les étalons) ; `npm run check` (gabarit à 2 px, masse portable).
- Outils de test (`?dieu`) : « Donner » une grosse pierre brute (la masse portée varie d'une fois à l'autre), « Au sol », la
  reprendre, en poser deux l'une contre l'autre (un pierrier naît), « Transformer » : dégrossir un moellon. `npm run test:briques`.

## À intégrer (quand Grégoire aura choisi)
1. La roche : `src/content/rocks.json` (schéma Zod dans `types.ts`, lien vérifié dans `validate.ts`), `rock` sur chaque pierre ;
   `mass.ts` prend la densité de la roche ; les masses des autres pierres (pierre plate, pierre de taille) suivent ou gardent 2 600,
   à décider.
2. `fill` : 0,52 → 0,56 (masses 14,7 → 14,6 kg et 55,9 → 55,5 kg).
3. Les dessins de la proposition choisie, dans `art/items/stones.ts`, avec la vue portée et l'icône ; les places du pierrier dans
   `piles.json`.
4. Pas de changement de clé, donc pas de `SAVE_VERSION` pour la pierre brute seule.
