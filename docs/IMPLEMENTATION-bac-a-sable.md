# Le bac à sable : plan d'implémentation

Run de nuit « maquette », 31 octobre 2026. **À relire par Grégoire avant toute ligne de code.** Ce document ne change rien au jeu.

> **État (31 octobre 2026, chantier « mode construction », branche `construction`)** : fait, en mode à part (`?construire`, caméra
> libre, souris) plutôt que dans `?dieu` : le modèle (runs 1 et 2 : `world/build.ts`, `builds` de GameState, `SAVE_VERSION` 13), la
> pose, le rendu relevé, les collisions sous 2 m, l'effacement au-dessus de la tête (run 4, sans l'ombre portée), le plan du bac à
> sable (run 5, dans `src/content/plans/` et non dans `plans.json`), et les deux premiers éléments composés (les morceaux de solin,
> calculés). Les pièces gardent leurs porteurs par calcul, pas dans `on`. Reste : les autres éléments de la chaumière et le rang
> des pièces en pente (run 3), les portes, l'ombre portée des pièces hautes, `PlanPlaceSchema` et le chantier guidé (run 6).
> Voir CONCEPTION, *Le mode construction*.
Il s'appuie sur la maquette de la chaumière (`docs/maison-chaumiere.md`), dont le contrat de géométrie
(`art/proposals/chaumiere-geometry.ts`) et le compositeur (`tools/lib/maison-preview.ts`, fonction `scene`) font déjà, hors du jeu, ce
que le bac à sable fera dedans : poser des pièces en hauteur, dans un sens, et les afficher dans le bon ordre.

## Le besoin

- **Le mode.** En mode dieu, on compose librement une construction avec **tout ce qui existe** : les briques (`items.json`,
  `props.json`, la pièce de bois de tous réglages) et les **éléments composés** (pans, couples, pans de toit, faîtage, cheminée, solin,
  cloison), une fois créés.
- **Les gestes.**
  - Poser **à n'importe quelle hauteur sur la grille de 20 cm**.
  - Tourner : est-ouest, nord-sud, et debout pour ce qui se dresse.
  - Empiler, retirer.
- **Le plan réutilisable.** On enregistre une composition comme **plan** : une maison posée plusieurs fois dans le village, et plus
  tard un **chantier guidé** que Xéros suit pièce par pièce.
- **Le catalogue ne propose que ce qui existe.** Il se lit dans le contenu, comme les listes du panneau `?dieu` aujourd'hui
  (`src/dieu/panel.ts`), et une proposition de `art/proposals/` n'y entre qu'une fois promue dans `art/` et le contenu.

## Le modèle

Une **pièce posée** (`Build`, nom provisoire) :

```ts
// src/state/GameState.ts (schéma Zod), rangée par carte comme les tas et les chantiers
BuildPieceSchema = z.strictObject({
  id: z.number().int().nonnegative(),        // identifiant propre, comme les objets nés
  piece: PieceRefSchema,                      // { prop } | { item } | { wood: WoodPiece } | { element } (élément composé)
  x: z.number(), y: z.number(),               // le coin ouest-nord de sa boîte au sol, en cm, sur la grille de 20
  z: z.number(),                              // la hauteur de sa base, en cm, sur la grille de 20 (0 = au sol)
  view: z.enum(['r0', 'r1', 'r2', 'r3']),     // son sens (r0..r3 de docs/objets/README.md) ; la pièce de bois garde son `axis`
  length: z.number().optional(),              // pour ce qui s'assemble à sa longueur : pièce de bois, solin, pan de toit, faîtage, cloison
  state: z.string().optional(),               // l'état d'un élément (clayonnage, torchis ; rives, milieu)
  natural: NaturalSchema.optional(),          // forme et taille d'une matière naturelle, comme ailleurs
  on: z.array(z.number()).default([]),        // les pièces sur lesquelles elle repose (calculé à la pose, gardé pour défaire)
});
```

- **Sa boîte** (x, y, z, w, d, h) se tire de ce qu'elle est.
  - Un objet : `dims` de props.json ou items.json, largeur et profondeur échangées en r1/r3.
  - Une pièce de bois : `woodDims` (`src/world/woodPiece.ts`).
  - Un élément composé : `box(view, length)`, qui est aujourd'hui `BOXES` du contrat de géométrie et passera dans le contenu.
- **Ce qu'elle porte et sur quoi elle repose** se calculent avec ces boîtes.
  - Une pièce repose sur celles dont le dessus est à sa base (z) et dont l'emprise recoupe la sienne.
  - Elle porte celles qui reposent sur elle.
  - Gardé dans `on` pour retirer sans tout recalculer, et pour refuser de retirer ce qui porte (choix 6).
- **Une composition** est l'ensemble des pièces d'un **chantier libre** : un `Site` sans plan, avec un identifiant et un point d'origine.
  Cela réutilise `sites` de GameState et `removeSite`.

## La pose

- **Le fantôme.** Il suit le point visé, aimanté à la grille de 20 cm (4 px), et **s'accroche sur le dessus de ce qu'il y a dessous**.
  - Sa base prend la plus grande hauteur de dessus parmi les pièces que recoupe son emprise : comme un tas, mais en boîtes.
  - Une pièce de 2 m sur un solin de 40 cm s'y pose à z 40 sans qu'on règle rien.
  - Fantôme et visée : `systems/ghost.ts` (`Ghosts.show`), et le motif de `dropTarget` et `ghostOf` de `systems/hands.ts`.
- **Monter et descendre d'un cran (20 cm).** Deux touches lues par leur place (`PlayerInput.ts`, `KeyboardEvent.code`), par exemple
  PageUp et PageDown, ou Maj+molette (choix 3). Le cran s'ajoute à la hauteur accrochée et revient à zéro quand la visée change de pièce
  dessous.
- **R** tourne dans les trois sens : r0, r1, r2, r3, puis debout (`axis: 'up'`) pour ce qui se dresse.
  - Pour la pièce de bois : `ew`, `ns`, `up`, en reprenant `turnedWood`.
  - Pour un élément composé : ses vues déclarées (`symmetric` : deux, `four` : quatre).
  - R maintenu change d'état (clayonnage ou torchis) : choix 3.
- **E pose, Q annule.** **Retirer** : E maintenu sur une pièce, avec la jauge de `systems/longPress.ts`. La pièce la plus haute
  d'abord, comme `topPieces` de `world/places.ts`.
- **Le catalogue.** Une liste à droite, dans le panneau `?dieu` (HTML hors du canevas, comme aujourd'hui), par familles : pierre,
  terre, fibres, bois, éléments. On choisit, on règle la longueur, l'état et le diamètre, puis on pose en jeu. Aucune pièce n'est
  « portée » : le bac à sable ne passe ni par les mains ni par la force.

## Le rendu

- **Décalage vers le haut.** L'image se pose au coin bas gauche, en (x / 5, (y + d − z) / 5) : la projection (x, y − z) des pièces
  `ground` et de la maquette.
  - Aujourd'hui, une pièce de l'abri en hauteur porte ses rangées vides dans son image ; le bac à sable les remplace par **z**.
  - Pour la pièce de bois debout, c'est ce que fait déjà `lift`, en dur.
- **Profondeur.** Aujourd'hui, profondeur = y du bas de l'image (`README`, Conventions). Le bac à sable garde **y du bord sud** comme
  clé principale, puis **z** pour départager deux pièces au même bord sud : celle du dessus est dessinée après.
  - **Les pièces en pente sont l'exception.** La maquette (`scene`, `tools/lib/maison-preview.ts`) l'a montré : un couple de chevrons a
    son bord sud au pied, devant le mur, et les lattes posées dessus sont plus au nord, mais devant lui. Il faut un **rang** dans la
    définition de l'élément (`layer` : sol, mur, charpente, lattes, couverture), utilisé avant y.
  - `GameMap` gère déjà ce genre d'ordre pour les tas (`drawOrder` de `places.ts`) ; le même calcul servirait ici.
- **Effacer ce qui est au-dessus de Xéros.** On généralise `systems/roofs.ts`.
  - Aujourd'hui, une pièce `roof: true` devient transparente quand les pieds de Xéros sont sous son image (`over`), avec toutes celles
    qu'elle touche (`touches`).
  - Demain, **toute pièce posée dont la base est au-dessus de la tête de Xéros (z ≥ 180 cm) et dont l'emprise au sol le couvre**
    s'efface, et avec elle tout ce qui repose dessus (`on`, à l'envers). Les murs (z 40 à 280) ne s'effacent pas ; la charpente et le
    chaume, si.
  - Pour un intérieur vu de dehors, il faudra peut-être aussi effacer **le mur sud** quand Xéros est dedans : choix 5.
  - L'ombre portée (`world/roofShadow.ts`) se calcule déjà depuis une hauteur : la généraliser à toute pièce en hauteur qui a
    `shadow`.

## Les collisions

- **Ce qui est au sol bloque, ce qui est en hauteur non.** Une pièce bloque si sa base est sous 40 cm (z < 40) et qu'elle a un `body`,
  ou si c'est un élément de mur.
  - Le corps est son emprise au sol, en boîte, comme `footprint` de `GameMap` ; pour un pan, la bande du mur.
  - Les sablières hautes, les chevrons et le chaume ne bloquent pas : on passe dessous (c'est déjà la règle de l'abri : seules les
    pièces à `body` bloquent).
  - Le solin et les pans bloquent ; une porte est un trou dans un mur.
- **Les portes.** Le pan avec porte déclare son passage, avec l'emprise de l'ouverture (un `body` en deux morceaux autour de la
  porte, comme les `bodies` de props.json).

## La sauvegarde

- **Le stockage.** Les pièces vont dans `sites` de chaque carte, sous un chantier libre (`plan` absent ou `"libre"`).
  - **Nouveau champ de GameState = augmenter `SAVE_VERSION`** (11 aujourd'hui, `src/state/save.ts`).
  - Une partie de la version 11 se convertit : aucun chantier libre.
  - Chaque fonction de modification avance `revision` : `addBuildPiece`, `removeBuildPiece`, `saveComposition`.
- **Le contrôle.** `missingContent` (save.ts) contrôle chaque pièce : objet, élément, état. Une pièce disparue du contenu donne un
  message clair et une partie neuve, comme aujourd'hui.

## Le lien avec plans.json et le moteur de places

- **Enregistrer une composition = écrire un plan.** Le format de `plans.json` porte déjà presque tout.
  - Une place a `piece`, `at` (cm depuis le piquet nord-ouest), `orientation` et `on`.
  - Il manque **`z`** (la hauteur de sa base), **`view`** (r0..r3, qui remplacerait `orientation` : `flat`, `ew`, `ns`, `upright`,
    `slope`), **`length`** et **`state`**, à ajouter à `PlanPlaceSchema` (`src/content/types.ts`).
  - Le moteur de places (`world/places.ts`) sert tel quel : `on` donne l'ordre, `placeOpen` la place ouverte, `drawOrder` l'affichage.
- **Les étapes.** Les pièces sont groupées par `layer`, dans l'ordre réel : solin, ossature, remplissage, charpente, couverture,
  ouvertures. On obtient les étapes du chantier guidé **sans les écrire à la main**.
- **Où s'écrit le plan.** Le jeu ne peut pas écrire `src/content/plans.json`. Dans le navigateur, « Enregistrer comme plan » donne le
  JSON à copier (ou le télécharge) ; on le colle dans plans.json, et `validate.ts` le vérifie au prochain `npm run check`.
  - Plus tard, un outil `tools/plan-from-save.ts` pourrait tirer un plan d'une sauvegarde : choix 7.
- **Poser une maison plusieurs fois.** C'est poser un plan d'un coup (`skipStep` répété, de `systems/site.ts`), ou dans Tiled : un
  objet de type `Plan` avec la propriété `plan`, traduit par `build-maps` en pièces posées. Choix 8.
- **Le chantier guidé** reprend `site.ts` : fantôme des places ouvertes, `accepts` et `refusal`, l'aide de la mère pour ce qui dépasse
  la force de Xéros. Un pan accepterait les briques de sa recette une à une : un « pan en cours » qui garde ce qu'il a reçu, comme un
  tas garde ses places (choix 4).

## La place dans ?dieu, ou un mode à part

Je propose **un mode du panneau `?dieu`**, « Bac à sable », qui fait passer `WorldScene` dans un mode `build`, à côté de `play`, `use`,
`dialogue` et `transition`.

- Dans ce mode, Xéros ne porte rien, ne se fatigue pas et ne se heurte qu'aux murs posés au sol. La caméra et le zoom ne changent pas.
- Le panneau montre le catalogue et les réglages.
- Tout passe par des `DieuCommand` (`src/events.ts`) et `WorldScene.dieu`, puis par les fonctions de GameState, comme aujourd'hui.

Un mode à part, sans Xéros, avec une caméra libre (choix 2), serait plus confortable pour une grande maison. Il coûterait une scène de
plus.

## Les risques

1. **L'ordre d'affichage des pièces en pente** (chevrons, lattes, chaume). La règle « y du bas » ne suffit pas, la maquette l'a montré.
   Un rang par élément le règle, mais tout objet futur en pente devra le déclarer.
2. **Le nombre d'images.** Une maison, c'est environ 300 pièces si l'on pose des éléments, des milliers si l'on pose les briques une à
   une (2 800 baguettes). **On ne pose pas de baguettes** dans le bac à sable : la brique la plus fine est l'élément composé, ou la
   pièce de bois. À voir sur un portable : choix 4.
3. **Les éléments d'un bloc pèsent plus d'une tonne.** C'est faux pour le joueur, juste pour le bac à sable. Le chantier guidé devra les
   faire monter par morceaux (le pan de bois, puis le remplissage).
4. **La règle D étendue** (le bois dessiné deux fois plus épais) fait des murs de 8 px. Les emprises de collision doivent rester les
   vraies (20 cm), sinon les portes de 1 m se ferment.
5. **Les vues « par la tranche ».** Un pan ou un pignon vu de côté est une bande de 8 px, presque identique d'un élément à l'autre
   (rendu du dessinateur des murs). C'est juste en projection, mais le joueur ne verra pas une fenêtre dans un pignon. Une maison au
   faîtage nord-sud demandera des vues de face des pignons, qui existent (`pignon` r0).
6. **La sauvegarde grossit** : 300 pièces × 10 champs par carte. C'est acceptable en localStorage, à surveiller.
7. **Les tests sans écran** (`tools/lib/playtest.ts`) devront viser à la hauteur : il faut une commande pour fixer z sans clavier.

## Les choix à faire par Grégoire

1. **Le nom et la place** : un mode « Bac à sable » dans le panneau `?dieu` (mon conseil), ou un mode à part ?
2. **La caméra** : Xéros reste et se promène dans la construction, ou caméra libre sans Xéros ?
3. **Les touches** : PageUp et PageDown pour monter et descendre d'un cran, R pour tourner (et debout), R maintenu pour l'état ? Ou
   la molette avec Maj ?
4. **La brique la plus fine qu'on pose** : l'élément composé (un pan d'un bloc), ou aussi ses pièces (poteau, palançons, baguettes) ?
   Et faut-il des éléments **calculés** à la volée depuis leur recette, comme les tas de bois (pas de dessin par élément, mais un
   dessin par brique et un assemblage), plutôt que dessinés d'un bloc comme dans la maquette ?
5. **L'intérieur** : quand Xéros entre, faut-il aussi effacer le mur sud, ou tout le toit et les murs au-dessus d'un mètre (vue en coupe,
   comme beaucoup de jeux) ?
6. **Retirer une pièce qui en porte d'autres** : refuser (« Elle porte quelque chose. »), ou retirer tout ce qui est dessus ?
7. **Écrire le plan** : copier le JSON depuis le panneau, ou un outil qui le tire d'une sauvegarde ?
8. **Poser une maison dans le village** : dans Tiled (un objet `Plan`, traduit en pièces par `build-maps`), ou en jeu par le panneau ?
9. **`orientation` des plans** : remplacer `flat`, `ew`, `ns`, `upright` et `slope` par `view` (r0..r3) et `z`, et convertir le plan de
   l'abri ?

## Le découpage en runs

1. **Run 1, le modèle.**
   - `BuildPieceSchema` et le chantier libre dans GameState, et `SAVE_VERSION` 12 avec sa conversion.
   - Les fonctions `addBuildPiece` et `removeBuildPiece` ; le calcul des boîtes et de `on` sans Phaser (`src/world/build.ts`).
   - Des tests unitaires en Node (boîtes, hauteur accrochée, porteurs).
2. **Run 2, la pose.**
   - Le mode `build` de WorldScene, le panneau « Bac à sable » (catalogue des briques existantes et de la pièce de bois), le fantôme
     accroché, les crans, R dans les trois sens, retirer.
   - Le rendu décalé de z, et l'ordre par bord sud, z, puis rang.
   - Test sans écran : poser un solin, un poteau dessus, une sablière dessus, retirer.
3. **Run 3, les éléments composés.**
   - Promouvoir les propositions validées : `art/proposals/` vers `art/`, une entrée de contenu par élément, leur fiche, `views`, leurs
     boîtes dans le contenu.
   - Les collisions des murs et des portes.
   - Test : poser la chaumière de la maquette, élément par élément (le même placement que `scene`).
4. **Run 4, les toits et l'intérieur.** Généraliser `roofs.ts` (effacer ce qui est au-dessus de la tête) et l'ombre portée. Test :
   Xéros entre dans la maison, le toit s'efface, il ressort.
5. **Run 5, le plan.**
   - Enregistrer une composition en plan (`z`, `view`, `length` et `state` dans `PlanPlaceSchema`, étapes par rang), et la reposer
     d'un coup.
   - `validate.ts` pour ces champs ; la chaumière devient un plan de `plans.json` (étapes `soon`).
6. **Run 6, plus tard : le chantier guidé** de la chaumière (pans en cours, aide de la mère, gestes des transformations).

## Les tests

- **Node, sans Phaser** (`src/world/build.ts`) : la boîte de chaque sorte de pièce dans chaque vue ; la hauteur accrochée (sur le sol,
  sur un solin, sur deux pièces de hauteurs différentes) ; `on` et le refus de retirer ; l'ordre d'affichage d'un couple et de ses
  lattes.
- **Jeu sans écran** (`tools/lib/playtest.ts`) : `npm run test:bac-a-sable`.
  - Poser, tourner, monter d'un cran, retirer.
  - Recharger la page : tout y est.
  - Enregistrer en plan, effacer, reposer le plan : mêmes pièces aux mêmes places.
- **Aperçu** : `.art-preview/maison-couches.png` reste la référence visuelle. Le run 3 la refait avec les pièces posées en jeu, au
  pixel près.
- **`npm run check`** : les plans écrits par le bac à sable passent `validate.ts`, avec chaque pièce existante, chaque `on` réel et
  chaque `z` sur la grille.

## Ce qui se réutilise

| Besoin | Déjà là |
| --- | --- |
| Poser avec un fantôme, à la place libre | `systems/hands.ts` (`dropTarget`, `ghostOf`, `put`), `systems/ghost.ts` |
| Places, porteurs, ordre, la plus haute à reprendre | `world/places.ts` (`placeOpen`, `topPieces`, `drawOrder`) |
| Un plan posé sur la carte, ses étapes, sa ligne d'état | `world/sitePlan.ts`, `systems/site.ts`, `plans.json` |
| La pièce de bois de tous réglages, debout comprise | `world/woodPiece.ts`, `world/woodShape.ts`, `world/woodTexture.ts` |
| Les dimensions et les vues de tout objet | `dims` et `views` de props.json et items.json, `content/views.ts`, `content/gabarit.ts` |
| Toits qui s'effacent, ombre portée | `systems/roofs.ts`, `world/roofShadow.ts`, `ROOF` et `SHADOW` de config.ts |
| E maintenu et sa jauge | `systems/longPress.ts` |
| Le panneau et ses commandes | `src/dieu/panel.ts`, `DieuCommand` (`src/events.ts`), `WorldScene.dieu` |
| La projection et le placement d'éléments en hauteur | `art/proposals/chaumiere-geometry.ts`, `scene` de `tools/lib/maison-preview.ts` |
| Les recettes des éléments | `tools/lib/chaumiere.ts` (à passer dans le contenu au run 3) |
