# Fiches d'objets

Décidé le 29 octobre 2026 (rubrique « Masse » ajoutée le 30 octobre 2026 : tout objet qu'on prend, pose ou roule a une masse ;
le même jour, toutes ses vues : un objet se crée vu de ses quatre côtés, selon sa symétrie ; le 31 octobre 2026, chantier
« briques » : les rubriques « Variantes naturelles », « Transformations » et « Métier », voir CONCEPTION, *Les matières* ; le 2 novembre
2026, chantier 2 de l'audit : les rubriques « Travail », voir CONCEPTION, *Le travail*, et « Arme », voir *Le combat*) : **tout nouvel objet a sa fiche ici avant d'être construit.** Une fiche par objet,
`docs/objets/<clé>.md`, qui remplit le modèle ci-dessous, rubrique par rubrique. Une rubrique sans objet le dit
(« aucune », « pas encore ») plutôt que de disparaître : on voit qu'on y a pensé.

La fiche décrit l'objet tel qu'il doit être ; le contenu (`src/content/`) et les dessins (`art/`) en découlent. Quand
l'objet change, la fiche change d'abord.

Fiches : les matières (chantier « briques », CONCEPTION *Les matières*) : la pierre (chantier « pierre » : la roche, `rocks.json`), [pierres brutes](rough-stone.md) (petite, moyenne, grosse), [dalle](slab.md),
[moellons](rubble-stone.md) (30, 40, 50 cm), [morceaux de solin](sill-wall.md) (brut, taillé : éléments composés du mode construction), les assemblages [enture en trait de Jupiter](scarf-joint.md) [tenon et mortaise](mortise-joint.md) [mi-bois](halving-joint.md) et [encoche](notch-joint.md), la cabane en rondins : [porte en planches](plank-door.md), [pan de toit en planches](plank-roof.md), [pignon en planches](plank-gable.md), [volet en planches](plank-shutter.md), la grange : [pan de bardage](board-wall.md), [porte charretière](cart-door.md), [pignon en bardage](board-gable.md), le grand pan de toit ([pan de toit](plank-roof.md)), l'étal : [fond, côtés, devant](stall-panels.md), [volet d'étal](stall-shutter.md), l'auvent ([pan de toit](plank-roof.md)), [pierre de taille](ashlar.md), [éclats de taille](stone-chips.md), [têtu](stone-hammer.md),
[ciseau de tailleur](stone-chisel.md), [maillet](mallet.md) ; la terre, [motte de terre](clay-clod.md), [torchis](cob.md),
[mortier de terre](earth-mortar.md), [seau](bucket.md), [bêche](spade.md) ; les fibres, [baguette de clayonnage](wattle-rod.md),
[gerbe de paille](straw.md), [botte de chaume](thatch-bundle.md) ; le bois travaillé, la perche et la planche (des réglages de la
[pièce de bois](wood-piece.md)), [bardeau](shingle.md), [cheville](peg.md), [coutre](froe.md). Puis le [têtard](big-pollard.md), les [gros arbres couchés](big-felled-tree.md) ; l'[arbre normal](normal-tree.md) ; la [pièce de bois](wood-piece.md) (bille, demi-bille, quartier, rondin, poutre : un seul objet, des réglages) ; l'implantation : [planchette gravée](plan-tablet.md), [piquet](stake.md), [hachette](hatchet.md), [dalle](slab.md) ; l'équarrissage : [doloire](broadaxe.md) ; la [cognée](axe.md) ; [rouleau de corde](rope-coil.md), [lien](rope-tie.md), [fagot](faggot.md) ; le fendage : [masse de bûcheron](maul.md), [coin de fendage](splitting-wedge.md) ; le combat : [branche](branch.md), [épée de bois](wooden-sword.md), [mannequin d'entraînement](training-dummy.md) ; les pièces de l'abri à bois, dans
l'ordre du chantier : [dé de pierre](footing-stone.md), [poteaux](shed-post.md), [sablières](shed-plate.md),
[chevron](shed-rafter.md), [toit de planches](shed-roof.md) ; la cheminée de pierre de la maison de Xéros : [âtre](stone-hearth.md), [hotte](chimney-hood.md),
[conduit](chimney-flue.md), [couronnement](chimney-cap.md), [pan de chaume percé](thatch-roof-pierced.md). Les pièces d'un même genre (les deux poteaux, les trois
sablières) partagent une fiche, qui nomme toutes leurs clés.

## Modèle

```markdown
# <Nom affiché> (`<clé>`)

## Identité
- Clé : `<clé>` (anglais, kebab-case ; c'est aussi la clé d'image).
- Nom affiché : <nom, en français>.
- Nature : objet possédable (`items.json`) ou objet du monde (`props.json`, avec ou sans `take`).
- Mains : une ou deux (deux s'il est lourd ou long).
- Âge (bois travaillé seulement) : `"aged": true`, il prend l'âge du bois (neuf, patiné, vieux), dessiné avec la rampe `woodAges` ;
  du bois brut qui ne le prend pas va dans `RAW_WOOD` (validate.ts) avec sa raison.

## Masse
- Masse en kg : saisie (`mass` : un nombre), calculée pour la pièce de bois (`"mass": "wood"`, d'après ses réglages :
  section × longueur × 900 kg/m³), calculée par sa matière (`"mass": { "matter": …, "fill": … }` : le volume de ses `dims` × la
  part qu'occupe la matière × sa densité de `matters.json` : pierre selon sa roche (`rocks.json`, calcaire 2 400), terre crue 1 800, torchis 1 750, mortier 1 900, paille
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

## Travail
Le travail au coup (CONCEPTION, *Le travail* : la durée découle des coups, chaque coup se paie au joule).
- Un outil : son `work` dans items.json (`length`, `grip`, `balance`, `edge` : le tranchant, `aim` : combien la précision compte ;
  sa masse est `mass`), le coup qu'il donne (`strokes` de work.json : `use`, `chop`, `maul`, `hew`, `whittle`), ce qui compte pour
  lui (la force ou la précision), et ce qu'il donne pour Xéros (énergie d'un coup, durée d'un coup, `npm run check` pour les durées
  de ses travaux).
- Ce qu'on travaille : sa matière (`harvest.work` de props.json : `fell`, `limbs`, `whittle` ; ou, pour la pièce de bois, son
  diamètre et sa longueur), ses étapes (`hits`) et ses images d'étape (`stages` : la part de matière à laquelle paraît
  `<image>-stage-<n>`, et `<image>-left-stage-<n>` pour un arbre frappé de la gauche), la durée calculée pour Xéros.
- Un geste sans matière (planter, nouer, couper un lien) : son prix fixe dans `costs` de stamina.json. Rien à travailler : « aucun ».

## Arme
Une arme (`weapon` dans items.json : `length`, `grip`, `balance`, `efficiency`, `family`, `image`) : ses réglages et pourquoi, et
**son tableau**, calculé par world/strike.ts, à côté des autres armes (modèle : la fiche [branche](branch.md), « Au combat ») :
longueur et prise, masse, équilibre et efficacité, portée au sol, précision, dégâts et durée de chaque attaque, dégâts par seconde,
endurance par coup. Son dessin : un seul, couché vers l'est (`weapon-<clé>`, tiré en huit angles). Ce qui n'est pas une arme :
« aucune ».

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

# Les contrats, par sorte d'objet

Un membre d'une sorte fait **tout ce que font les autres**, sans que personne ait à y penser : chaque capacité vient d'un champ des
données (docs/AUDIT.md, « Normalisation »), jamais de son nom ; chaque dessin de la liste existe. `npm run test:contrats`
(tools/test-contrats.ts) vérifie chaque contrat sur **tous** les membres de la sorte, puis sur des membres d'essai créés seulement
par des données dans le test (une hache, une épée, un arbre) : s'il fallait du code pour qu'un membre d'essai passe, c'est un trou.
Ce qui manque encore (des dessins, des fiches, des métiers à faire avec le pixel-artist ou Grégoire) est dans `DRAWINGS_TODO`,
`VIEWS_TODO`, `TRADE_TODO` (validate.ts) et `FICHE_TODO` (tools/check.ts), chacun avec sa raison.

**La recette, pour toute sorte** : déclarer les données ; demander au pixel-artist les dessins de la liste du contrat ; lancer
`npm run test:contrats`.

## Objet portable (items.json ; un objet du monde qui a `take`)
- Il **se prend** (ses mains : `hands`, ou `take.hands`), a une **masse** (`mass`, saisie ou par sa matière), ses **dimensions**
  (`dims`), sa **famille** au catalogue (`family`) et son **métier** (`trade`).
- Il **frappe** : son `weapon`, sinon l'arme improvisée de ses dimensions et de sa masse (src/world/heft.ts : portée, lenteur,
  énergie au joule).
- S'il **s'empile** : son genre de tas (`pile`, piles.json), qui le prend et **compte** ses pièces (`count`).
- Dessins : son icône (`icon`, 16 px) ; son **image au sol** (`ground`) et **toutes ses vues** selon sa symétrie (`views`) ; sa
  **posture tenue** (`hold.image`, planche `held-…` : vues `down`, `up`, `right`) ; s'il est de bois (sa masse de bois, ou le
  menuisier, le charpentier), ses trois âges (`aged`, tirés par le build).

## Outil (un objet portable qui a `does`)
- Tout le contrat d'un objet portable.
- Il déclare **les genres de travail qu'il fait** (`does` : `fell`, `limbs`, `whittle`, `break` pour les récoltes ; `cut`, `hew`,
  `plant`, `maul` pour le bois). **Toute cible de ce genre l'accepte**, sans le nommer (src/world/tools.ts) : une nouvelle hache qui
  fait `fell`, `limbs`, `cut` abat tous les arbres, les ébranche et coupe tout le bois.
- Il frappe pour faire (tout sauf planter le coin) : ses **données de coup** (`work` : `length`, `grip`, `balance`, `edge`, `aim`,
  ses `strokes` propres) ; chacun de ses travaux se calcule (un nombre de coups, une durée : `npm run check` les affiche).
- Dessins : en plus, sa **planche en main** (`work.image`, sinon `tool-<clé>` : art/items/held.ts, cinq dessins en zones de matière),
  avec le geste de chacun de ses travaux dans les trois directions.

## Arme (un objet portable qui a `weapon`)
- Tout le contrat d'un objet portable.
- Ses réglages (`weapon` : `length`, `grip`, `balance`, `efficiency`, `family`, `image`) ; sa **famille** de gestes (combat.json) et
  ses attaques : pour chacune, des dégâts, une durée, une portée (world/strike.ts) ; son prix au joule.
- Dessins : **un seul dessin** couché vers l'est (`weapon.image`, tiré en huit angles, animation `angles`) ; ses **traînées**
  `fx-smear-<clé>-…` se tirent seules au build, à sa longueur ; le reste comme un objet portable.

## Pièce de bois (un diamètre de wood.json ; tout le bois du monde est `wood-piece`)
- Un diamètre (`sizes`) et ses aspects (`looks` : rond, écorcé, faces dressées, poutre, demi-bille, quartier…).
- Chaque aspect : ses **dimensions** et sa **masse** calculées ; il **se prend** à deux mains s'il ne dépasse pas ce que porte Xéros,
  sinon il **roule** (s'il est rond) ; il **pivote avec R** (`turn`) ; il **frappe** (l'arme improvisée de sa longueur) ; il **va en
  tas** (le tas se calcule : pyramide, rangées, triangles) **qui compte ses pièces**, s'il se porte.
- Le diamètre **se coupe** sur la grille (`grid`, `min`) ; **se fend** s'il a ses aspects fendus (`split`) ; **s'équarrit** s'il a
  l'aspect poutre (`beam`).
- Dessins : ses planches est-ouest et nord-sud (et debout s'il se dresse), **à trois âges** (tirées par le build) ; l'icône et la
  posture portée de chaque aspect ; les vues couchées se **calculent** de la section (art/world/wood-section.ts), seules les matières
  se dessinent (art/world/wood-skin.ts).

## Arbre (un objet du monde qui a `harvest.fall`)
Voir aussi CLAUDE.md, « Trois arbres, deux sortes ».
- Debout : il **s'abat au coup** (`harvest.work.fell` : son diamètre ; `stages` : ses étapes) avec tout outil qui fait `fell`,
  **des deux côtés** (Xéros se place du côté où il frappe, l'entaille se dessine de ce côté, l'arbre y tombe) ; il devient sa
  **souche** (`becomes`) et fait naître son **arbre couché** (`spawns`).
- Couché : il **s'ébranche au coup** (`harvest.work.limbs`, ses étapes), puis devient **une pièce de bois de sa longueur utile**
  (`becomes: "wood-piece"`, `wood` : diamètre et longueur sur la grille), qui a tout le contrat d'une pièce de bois (se coupe en
  billes, va en tas compté, pivote, s'équarrit…).
- Dessins : l'arbre debout, sa souche, ses étapes d'abattage à droite et à gauche, sa chute à droite et à gauche (deux images de
  raccord, sans saut), son arbre couché (et `-left`), ses étapes d'ébranchage ; sa matière dans art/world/wood.ts. Ce qui se calcule
  et ce qui se dessine : voir CLAUDE.md et docs/AUDIT.md, « Un nouvel arbre ».

## Matière (matters.json ; une roche de rocks.json pour la pierre)
- Sa **densité** (la sienne, ou celle de sa roche) : la masse des objets qui en sont faits (`mass: {matter, fill}`) ; des objets qui
  en sont faits ; ses transformations (transforms.json : la sortie pèse moins que l'entrée) ; sa résistance au coup (`matter` de
  work.json) si elle se travaille.
- Dessins : pour une roche, sa **rampe** dans art/palette.ts ; ses **éclats** `fx-<matière>` si elle est frappée (`impact`, `target`).

## Meuble (un objet du monde de famille `mobilier`)
- Ses **dimensions** réelles, son **corps** (`body`, sauf ce qui est au sol ou trop petit pour barrer le passage), sa **masse** (par sa
  matière de préférence), son **métier**, sa **place au catalogue** ; s'il est de bois, ses **trois âges** (`aged`) ; s'il s'ouvre,
  son autre état (`swing.into`).
- Dessins : son image et **toutes ses vues** selon sa symétrie (`-r1` à `-r3` pour `four`), dès sa création ; la face du dedans s'il
  en a une (`-r2`, CONCEPTION « Les intérieurs »).
