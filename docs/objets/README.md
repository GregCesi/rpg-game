# Fiches d'objets

Décidé le 29 octobre 2026 (rubrique « Masse » ajoutée le 30 octobre 2026 : tout objet qu'on prend, pose ou roule a une masse ;
le même jour, toutes ses vues : un objet se crée vu de ses quatre côtés, selon sa symétrie ; le 31 octobre 2026, chantier
« briques » : les rubriques « Variantes naturelles », « Transformations » et « Métier », voir CONCEPTION, *Les matières*) : **tout nouvel objet a sa fiche ici avant d'être construit.** Une fiche par objet,
`docs/objets/<clé>.md`, qui remplit le modèle ci-dessous, rubrique par rubrique. Une rubrique sans objet le dit
(« aucune », « pas encore ») plutôt que de disparaître : on voit qu'on y a pensé.

La fiche décrit l'objet tel qu'il doit être ; le contenu (`src/content/`) et les dessins (`art/`) en découlent. Quand
l'objet change, la fiche change d'abord.

Fiches : les matières (chantier « briques », CONCEPTION *Les matières*) : la pierre, [pierres brutes](rough-stone.md),
[moellon](rubble-stone.md), [pierre de taille](ashlar.md), [éclats de taille](stone-chips.md), [têtu](stone-hammer.md),
[ciseau de tailleur](stone-chisel.md), [maillet](mallet.md) ; la terre, [motte de terre](clay-clod.md), [torchis](cob.md),
[mortier de terre](earth-mortar.md), [seau](bucket.md), [bêche](spade.md) ; les fibres, [baguette de clayonnage](wattle-rod.md),
[gerbe de paille](straw.md), [botte de chaume](thatch-bundle.md) ; le bois travaillé, la perche et la planche (des réglages de la
[pièce de bois](wood-piece.md)), [bardeau](shingle.md), [cheville](peg.md), [coutre](froe.md). Puis le [têtard](big-pollard.md), les [gros arbres couchés](big-felled-tree.md) ; l'[arbre normal](normal-tree.md) ; la [pièce de bois](wood-piece.md) (bille, demi-bille, quartier, rondin, poutre : un seul objet, des réglages) ; l'implantation : [planchette gravée](plan-tablet.md), [piquet](stake.md), [hachette](hatchet.md), [pierre plate](flat-stone.md) ; l'équarrissage : [doloire](broadaxe.md) ; la [cognée](axe.md) ; [rouleau de corde](rope-coil.md), [lien](rope-tie.md), [fagot](faggot.md) ; le fendage : [masse de bûcheron](maul.md), [coin de fendage](splitting-wedge.md) ; les pièces de l'abri à bois, dans
l'ordre du chantier : [dé de pierre](footing-stone.md), [poteaux](shed-post.md), [sablières](shed-plate.md),
[chevron](shed-rafter.md), [toit de planches](shed-roof.md). Les pièces d'un même genre (les deux poteaux, les trois
sablières) partagent une fiche, qui nomme toutes leurs clés.

## Modèle

```markdown
# <Nom affiché> (`<clé>`)

## Identité
- Clé : `<clé>` (anglais, kebab-case ; c'est aussi la clé d'image).
- Nom affiché : <nom, en français>.
- Nature : objet possédable (`items.json`) ou objet du monde (`props.json`, avec ou sans `take`).
- Mains : une ou deux (deux s'il est lourd ou long).

## Masse
- Masse en kg : saisie (`mass` : un nombre), calculée pour la pièce de bois (`"mass": "wood"`, d'après ses réglages :
  section × longueur × 900 kg/m³), calculée par sa matière (`"mass": { "matter": …, "fill": … }` : le volume de ses `dims` × la
  part qu'occupe la matière × sa densité de `matters.json` : pierre 2 600, terre crue 1 800, torchis 1 750, mortier 1 900, paille
  tassée 100, bois vert 900 kg/m³), ou somme de ses parties (fagot). Ce que cela fait à Xéros : porté (jusqu'à 70 kg), marche normale (jusqu'à
  25 kg), roulé (jusqu'à 300 kg). Un objet pas encore déplaçable le dit.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Dimensions réelles, contour compris : largeur, profondeur, hauteur (ou longueur, diamètre), en cm.
- Forme et sens : boîte, cylindre (`ew`, `ns`, `up`), à plat.
- Taille à l'écran qui en découle (calcul du gabarit), en px.

## Vues
Chaque vue : son image, sa taille, ce qu'on y voit.
- Symétrie (`views` dans props.json ou items.json) et ses vues au sol, toutes dessinées dès la création : par défaut **quatre**
  (nord, est, sud, ouest : `four`, images `<image>`, `<image>-r1`, `-r2`, `-r3`, chacune un quart de tour de plus dans le sens
  des aiguilles d'une montre), sauf symétrie déclarée : **rond** (`round`, une vue, pareil de tous côtés : seau, tonneau,
  billot), **symétrique** (`symmetric`, deux vues, est-ouest `<image>` et nord-sud `<image>-ns` : une table, une caisse).
  **Quatre** vaut aussi pour un objet qui a un devant et un dos (coffre, lit) ou un bout différent de l'autre (outil, branche).
  Couché (`lying`) : chaque vue nord-sud a les dimensions de l'est-ouest inversées (règle D, docs/STYLE.md section 8) ; debout :
  chaque vue suit le gabarit de ses dimensions vues de ce côté.
- Au sol (posé seul).
- En main, dans les 4 directions (bas, haut, droite ; la gauche est le miroir de la droite).
- Case d'interface (icône 16×16 des mains).
- Fantôme (prévisualisation en transparence de l'endroit où il ira).
- Porté (posture : `hand`, `shoulder`, `carry`).
- Autres vues propres à l'objet (dans un tas, posé sur un autre objet...).

## Variantes naturelles
Le naturel est irrégulier, le travaillé est régulier à la mesure du travail. Une matière naturelle (`natural` : `forms`, `vary`) :
ses formes dessinées (1 ou 2 ; la seconde, `<image>-b`, et ses vues), sa taille type et de combien elle varie (± `vary` %, tirée à
l'apparition, gardée par GameState ; sa masse au cube), ce que montre un tas. Un objet travaillé : « aucune », et pourquoi il est
régulier (à quel point le travail l'a rendu tel).

## Regroupement
Seul, en tas (genre de `piles.json`, forme, maximum), ou quantité mesurée (ce qui est mesuré, son unité, où c'est gardé).

## Gestes
- E court :
- E maintenu :
- Espace :
- R :
- (et Q, lâcher, s'il fait autre chose que d'habitude)

## Origine
Trouvé (où), acheté, récolté (sur quoi), fabriqué (comment). Ce qui n'est pas encore construit le dit.

## Devenir
Ce qu'il devient, ce qu'on en tire, comment il disparaît.

## Transformations
Chaque transformation où il entre ou d'où il sort (`transforms.json`) : ses entrées, sa sortie, le déchet (ce qu'on retire, sa
masse, s'il reste au sol ou disparaît), l'outil, le poste (sol, billot, établi, bord de l'étang, chevalet), et le geste (réel :
les touches ; ou « à venir », appliqué d'un coup par « Transformer » dans ?dieu). Tailler retire de la matière : la sortie pèse
moins que l'entrée (validate.ts).

## Métier
Qui le fait (`trade` : carrier, maçon, terrassier, chaumier, bûcheron, charpentier, fendeur, menuisier, forgeron, paysan) et qui le
vendrait au village. Tout s'achète, mais tout peut se faire.

## Vérification
- Aperçu : les images à regarder dans `.art-preview/` (`npm run art:preview`), à côté des étalons (`gabarit.png`) ; une matière :
  `briques.png` (toutes ses vues et formes à côté de Xéros, ses chaînes de transformation).
- Outils de test (`?dieu`) : le donner, le poser, le mettre au sol, le transformer.
- En jeu : la liste des gestes à faire et de ce qu'on doit voir.
```
