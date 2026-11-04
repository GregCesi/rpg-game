# Cadrage : la petite carte du HUD

Préparation de nuit (4 novembre 2026), branche `petite-carte`, worktree `~/Code/rpg-game-carte`. Rien du jeu n'a changé. Seuls des
essais ont été écrits : `art/proposals/petite-carte.ts` (le calcul), `art/proposals/petite-carte-cadre.ts` (le cadre et le point,
pixel-artist), `tools/essai-petite-carte.ts` et `tools/essai-petite-carte-cadre.ts`. Pour refaire les planches :
`npx tsx tools/essai-petite-carte.ts` et `npx tsx tools/essai-petite-carte-cadre.ts`, après `npm run art` et `npm run maps`.

Dans ce document, **Fait** = ce que le code ou une mesure établit, **Options** = les choix possibles, **Avis** = ma recommandation.

---

## 0. Les planches à regarder

| Planche | Ce qu'il faut regarder | Mon avis |
| --- | --- | --- |
| `.art-preview/petite-carte-lieux.png` | La petite carte calculée depuis les vraies cartes, à trois endroits (devant la maison, sur le chemin, sur la place), en trois tailles A, B et C (voir point 3). La planche est agrandie ×2 : un pixel du canevas y fait 2 × 2. | Les chemins, l'étang, la rivière, le toit de chaume, la place ronde et les huit étals se lisent. Les prés (`meadow`) se distinguent de l'herbe rase. Les arbres isolés sont des points discrets. |
| `.art-preview/petite-carte-hud-a.png`, `-hud-b.png`, `-hud-c.png` | Une vue du jeu à l'échelle de l'écran (1 280 × 720, palier de zoom de départ), avec le cadran, les mains, l'endurance, et la petite carte en haut à gauche dans chaque taille. | **C**. A est fine mais ses pixels sont plus petits que ceux du reste du HUD. B mange un tiers de la hauteur. |
| `.art-preview/petite-carte-options.png` | En haut : les arbres debout seuls, ou avec en plus les arbres couchés, chicots, souches et tas. En bas : Xéros dans la maison, avec le toit gardé (1) ou enlevé (2). | Arbres debout seuls. Dedans : (1). |
| `.art-preview/petite-carte-couleurs.png` | Les couleurs tirées des tuiles, famille par famille, selon deux règles (la moyenne ramenée à la palette, ou la teinte la plus fréquente), et celles de trois toits. | La moyenne. |
| `.art-preview/petite-carte-cadre.png` (DESSIN À VALIDER) | Le cadre de bois aux trois tailles (×4 et ×2), à côté du cadran de l'heure et de Xéros. Le point de Xéros dans ses quatre sens, sur sept fonds. | Bon pour moi. Points douteux ci-dessous. |
| `.art-preview/petite-carte-cadre-detail.png` (DESSIN À VALIDER) | Le cadre de 63 px du HUD à ×10, pixel par pixel. | — |

**Ce que le pixel-artist a fait** (fait) :
- un anneau de 6 px du HUD, contre 4 pour le cadran ;
- la même matière que le cadran : l'écorce `M m N K`, contour `o` ;
- des douelles cintrées séparées par des joints `K`, dont le nombre se tire du rayon : 12, 16 ou 24 selon la taille ;
- un fil discret sur chaque douelle ;
- un repère du nord : une flèche ▼ de parchemin en haut, pointée vers la carte ;
- le point de Xéros : 7 × 7 px du HUD, un corps rond de parchemin `a` ombré `d`, avec contour, qui s'allonge en pointe du côté où il regarde.

**Ses doutes** (fait) :
1. sur la forêt profonde (`5`), le contour du point disparaît ;
2. le biseau éclairé (`M` sur `m`) se voit peu ;
3. le contour fait des marches de 2 px aux 45° ;
4. le fil du bois est presque invisible à ×2.

---

## 1. Le calcul

### 1.1 D'où viennent les couleurs

**Fait.** Le sol est fait de 114 tuiles du jeu `world`, rangées en douze familles par leur nom :
- un numéro de raccord : `path-0` à `path-15` donnent `path` ;
- un numéro de variante : `grass2` donne `grass`, `field-ns2` donne `field` ;
- `bridge-*` donne `bridge`, `flowers` donne `grass`.

Une tuile à raccord (`path-7`) est du chemin bordé d'herbe sur les côtés sans voisin (`art/world/tiles.ts`, masque N/E/S/O). Elle se lit donc comme sa famille.

**Fait.** L'essai compare deux règles, calculées depuis les dessins, sans aucune donnée nouvelle :
- **la teinte la plus fréquente** dans les tuiles de la famille. Elle marche partout sauf pour la route empierrée : faite de pierres de cinq teintes, elle sort de la couleur de ses joints (`:`, presque noir) ;
- **la teinte moyenne ramenée à la plus proche de la palette** (pour une famille à raccords, seule la tuile pleine `-15` compte). Résultat : herbe `g`, prairie `s`, champ `e`, chemin `u`, eau `w`, terre battue `I`, route `E`, pont `E`, lisière `0`, sous-bois `2`, forêt profonde `4`, clôture `0`.

Les toits passent par la même règle, appliquée à l'image de la pièce à son âge : chaume `t`, auvent d'étal et toit de planches dans le bois patiné.

**Options.**
- **A. Calculée depuis les dessins**, par `npm run art`, dans `src/generated/minimap.json` (famille → couleur, clé d'image → couleur). Zéro donnée à tenir. Une tuile redessinée change sa couleur toute seule. Le jeu ne lit jamais de pixels.
- **B. Écrite dans les données** : un signe de palette par famille dans `tiles.json` (`map`), vérifié par `validate.ts`. Chaque couleur est maîtrisée, mais c'est une deuxième source à côté du dessin.
- **C. A, avec une correction possible** par famille dans `tiles.json`, seulement là où le calcul déçoit.

**Avis.** A, avec la moyenne. C seulement si une couleur te déplaît sur la planche.

### 1.2 Ce qu'on y voit

**Fait** (essai) :
- **le sol** : une couleur par case ;
- **les arbres debout** : un point `k` à la case de leur pied. Ce sont les objets dont la définition a une géométrie d'arbre (`tree` de props.json : `big-tree`, `big-pollard`, `normal-tree`). Un arbre abattu devient une souche, qui n'a pas `tree`, et son point disparaît de lui-même ;
- **les bâtiments** : chaque pièce posée colore les cases dont le centre tombe dans son emprise au sol, de la plus basse à la plus haute. Le toit, posé en dernier, donne au bâtiment sa couleur et sa forme : la maison est un rectangle de chaume de 9 × 5 cases, les étals des points de planches, la cabane un petit rectangle de bois patiné. Un abri ouvert, un mur en chantier ou une pièce du mode construction suivent la même règle. Tout vient des capacités en données (`tree`, `roof`, `dims`), aucune clé n'est écrite en dur.

**Fait.** Les branches au sol, les buissons, les rochers et les bêtes ne sont pas montrés. Les arbres couchés, chicots, souches et tas sont montrés en option seulement (`petite-carte-options.png`, en haut à droite) : de petites marques brun sombre, peu lisibles à cette échelle.

### 1.3 Quand elle se calcule

**Fait.** Un module `src/world/minimap.ts`, sans Phaser, tient la grille du monde : 625 × 500 cases, une couleur par case, dans un `Uint32Array` de 1,25 Mo. Mesures (Node) :

| Opération | Durée |
| --- | --- |
| La grille entière, les 20 zones, images lues comprises | 50 à 90 ms |
| Une zone repeinte (15 625 cases, ses arbres, ses pièces) | 1,3 ms |
| La fenêtre de 125 cases tirée de la grille | 0,07 ms |

**Plan :**
1. **Au lancement** (la première `WorldScene.create`) : la grille entière, depuis les cartes **et** la partie, c'est-à-dire pour chaque zone les objets changés (`changes`), nés (`spawned`) et posés (`builds`) de GameState. Les plans de Tiled pas encore posés (zone jamais vue) se tirent de leur plan, comme dans l'essai, sans écrire dans GameState : on ne pose rien en regardant la carte.
2. **Quand la partie change** : `revision` de GameState avance à chaque changement, mais aussi pour l'endurance, donc très souvent. La petite carte regarde `revision` au plus deux fois par seconde. Si elle a bougé, elle repeint la zone où est Xéros (1,3 ms) et celles dont `seedMap` vient de poser des plans. Cela couvre un arbre abattu, un bâtiment posé, un tas, les arbres de la tempête (déjà dans les cartes) et ce que le mode construction ajoute ou retire.
3. **À chaque image** : rien, sauf si la case de Xéros, son sens ou la grille ont changé. Dans ce cas, on tire la fenêtre ronde dans une `CanvasTexture` de Phaser (cases × cases), puis on rafraîchit la texture : un envoi de 62 Ko au plus. Le coût reste sous 0,3 ms, une fois par case traversée (toutes les 0,8 s en marchant), une fois par image au plus à ×20.

**Options pour le point 2.**
- **A. Comme ci-dessus** : la zone courante, au plus deux fois par seconde.
- **B. Un compteur de révision par carte** dans GameState (`mapRevision[id]`), avancé par chaque fonction qui touche une carte. Plus juste, mais il touche à GameState, donc au moteur, et attend la suite complète des scénarios avant toute fusion.

**Avis.** A : c'est moins de 1 % d'une image, et le moteur reste intact.

### 1.4 Comment elle traverse les zones

**Fait.** La grille est celle du monde : chaque zone y est peinte à sa place (`world` de la carte, tiré de `monde.world`). La fenêtre se tire autour de la case du monde où est Xéros, que ses pieds soient dans une zone ou dans sa voisine. Il n'y a donc **aucune couture**. Sur les planches, la fenêtre de 125 cases devant la maison déborde sur la zone voisine de l'ouest (la rivière), sans raccord visible. Au-delà du bord du monde, la fenêtre montre un aplat sombre (`#2c292d`, l'humus `5`), si bien qu'on voit le bord.

---

## 2. Dans un bâtiment

**Fait.** Un intérieur est une carte calculée (`interieur:<carte>:<x>,<y>`) dans le même repère que le dehors, décalé (`host` et `shift` de `InteriorMap`, `world/interiorMap.ts`). La position de Xéros au dehors se retrouve donc exactement : sa position dedans plus le décalage.

**Options** (planche des options, en bas) :
1. **La carte du dehors, toit gardé**, le point de Xéros sur le toit de sa maison, à sa place réelle. On sait où l'on est dans le monde.
2. **Le toit enlevé, les murs dessous.** Les murs (20 à 50 cm) tombent entre les centres des cases : la maison disparaît. À 1,60 m la case, un plan de pièces ne se lit pas (la maison fait 9 × 5 cases).
3. **La carte cachée** dedans.

**Avis.** 1. C'est aussi le plus simple : rien de plus à calculer.

---

## 3. Place et taille dans le HUD

**Fait.**
- Le HUD est dessiné sur 640 × 360 px et agrandi ×2 : un pixel du HUD fait 2 × 2 px du canevas de 1 280 × 720.
- En haut à droite, le cadran (marge de 4 px). En bas à droite, les mains et la barre d'endurance. Les messages s'affichent en bas au milieu, le dialogue en bas.
- Le coin haut gauche est libre. Les panneaux du mode construction et de ?dieu sont en HTML, hors du canevas.

**Options** (les planches `-hud-a`, `-hud-b`, `-hud-c`) :

| | Cases | Portée | Pixel d'une case | Fenêtre à l'écran | Cadre (px du HUD) | Avis |
| --- | --- | --- | --- | --- | --- | --- |
| **A** | 125 | 100 m autour | 1 px du canevas (la moitié d'un pixel du HUD) | 125 px (17 % de la hauteur) | 75 | fine, mais ses pixels sont deux fois plus petits que tous ceux du jeu |
| **B** | 125 | 100 m | 2 × 2 px (un pixel du HUD, comme le reste) | 250 px (35 %) | 137 | trop grande, elle cache le coin du monde |
| **C** | 81 | 65 m | 2 × 2 px | 162 px (22 %) | 93 | **recommandée** : même grain que le HUD, taille raisonnable |

Dans les trois cas : en (4, 4) px du HUD, la même marge que le cadran, qui reste en face, à droite. Pas de gêne pour les mains ni l'endurance, qui sont en bas à droite.

**Avis.** C. Si tu tiens aux 100 m, A est l'autre choix. Avec `RENDER = 2` (le canevas en double définition, en attente de ta décision), A passe d'elle-même à 2 × 2 px par case, au même grain que C.

---

## 4. La carte entière (M), plus tard : ce qu'il faudra, sans le faire

**Fait.** La grille du monde de la petite carte est déjà toute la carte : 625 × 500 cases, soit 625 × 500 px à un pixel par case. La carte entière ne demandera donc aucun nouveau calcul de couleurs.

Il faudra :
1. un mode de WorldScene (ou une scène par-dessus), ouvert par M et par un bouton sur la petite carte, l'horloge arrêtée comme pendant un dialogue ;
2. la grille affichée en entier ;
3. le point de Xéros ;
4. peut-être les noms des zones (`name` des cartes), refusés pour la petite carte ;
5. plus tard, peut-être le « déjà vu » (un brouillard sur les cases jamais approchées, gardé dans GameState : nouveau champ, `SAVE_VERSION`).

Le bouton : un clic sur la petite carte. Il faudra que ce clic ne soit ni une main ni un coup (`clickPlan`) : une zone du HUD qui prend le clic avant le monde.

Je prépare seulement le terrain : la grille est exposée par `minimap.ts` comme une fonction du monde, pas une fenêtre figée.

---

## 5. Ce que je ferai à l'implémentation, et comment

Dans l'ordre, après tes réponses :

1. **Fiche et documentation** :
   - CONCEPTION, nouvelle section « La petite carte » : ce qui est décidé et tes réponses ;
   - README, architecture : `world/minimap.ts`, `systems/minimap.ts` ;
   - CLAUDE.md, une consigne d'une ligne ;
   - `docs/COMMANDES.md` n'a rien à recevoir tant que M n'existe pas.
2. **Les couleurs** : `tools/build-art.ts` (ou un petit `tools/build-minimap.ts` appelé par `npm run art`) écrit `src/generated/minimap.json` : la couleur de chaque famille de tuiles (moyenne ramenée à la palette), et celle de chaque image de pièce qui peut être posée (`roof`, les pièces des plans, à ses trois âges si `aged`). La couleur des pièces de bois se tire de leurs réglages (écorce ou bois travaillé à son âge).
3. **Le calcul sans Phaser** : `src/world/minimap.ts`. Il reprend `art/proposals/petite-carte.ts` (familles, grille du monde, `paintZone`, `minimapWindow`), avec en entrée `maps`, GameState (`changes`, `spawned`, `builds`), les plans de Tiled pas encore posés et `minimap.json`. Les arbres viennent de `tree`, les bâtiments des boîtes de `world/build.ts` (`boxOf`). Aucune clé de contenu en dur (`test-keys`). Les constantes vont dans `MINIMAP` de config.ts : taille en cases, pixels par case, marge, cadence de mise à jour, couleur du hors-monde.
4. **Le dessin** : après ton accord, `art/proposals/petite-carte-cadre.ts` passe dans `art/ui/minimap.ts`, déclaré dans `art/index.ts`, avec ses images : `ui-minimap-frame`, à la taille choisie, et `ui-minimap-dot-<sens>`. Je lance `npm run art`.
5. **Le jeu** : `src/systems/minimap.ts` tient la `CanvasTexture`, repeint la zone quand `revision` bouge (au plus deux fois par seconde) et tire la fenêtre quand Xéros change de case ou de sens. HudScene pose la carte, le cadre et le point en haut à gauche, les cache pendant un dialogue comme le reste (`bar`), et lit la position de Xéros. Dedans, la position passe par `shift` de l'intérieur. La position et le sens passent par un événement de `events.ts` (`GameEvent.PlayerCell`), émis par WorldScene quand la case ou le sens change, pour que le HUD ne lise jamais la scène du monde.
6. **Les tests** :
   - `tools/test-minimap.ts`, dans test:fast, sans navigateur : chaque famille de tuiles a sa couleur, prise dans la palette ; aucune couture (la fenêtre à cheval sur deux zones égale la grille du monde) ; un arbre abattu perd son point ; un plan posé colore son emprise du toit ; le hors-monde ; la position dedans tombe sur le bâtiment ;
   - un regard en scénario : `test:monde` lit la case de Xéros sur la carte après un passage de zone (un `minimapText` lu par le scénario, comme `clockText`).
7. **Aperçu** : `npm run art:preview` écrit `.art-preview/petite-carte.png`, les trois lieux, depuis le vrai module.
8. **Fin de chantier** : commit, `npm run build`, récapitulatif, `npm run test:scenarios:bg`. Le chantier ne touche pas au moteur (ni physique, ni sauvegarde, ni clavier, ni temps) : il se fusionne après `npm run build` et `npm run test:monde`.

**Fichiers touchés** :

| Nouveaux | Modifiés |
| --- | --- |
| `src/world/minimap.ts` | `src/scenes/HudScene.ts` |
| `src/systems/minimap.ts` | `src/scenes/WorldScene.ts` (émettre la case et le sens) |
| `art/ui/minimap.ts` | `src/events.ts` |
| `tools/test-minimap.ts` | `src/config.ts` (`MINIMAP`) |
| | `tools/build-art.ts` (ou `package.json` si un outil à part) |
| | `art/index.ts` |
| | `tools/test-monde.ts` |
| | `docs/CONCEPTION.md`, `README.md`, `CLAUDE.md` |

Aucun changement de GameState, donc pas de `SAVE_VERSION`.

**Ce que coûtent les options** (en travail) :

| Choix | Coût |
| --- | --- |
| Couleurs A (calculées) | ~80 lignes dans l'outil de build |
| Couleurs B | 12 lignes de données, et leur vérification |
| Couleurs C | A, plus ~10 lignes |
| Taille A, B ou C | le même code : une constante, et le cadre tiré à sa taille |
| Arbres couchés, souches, tas en plus | ~30 lignes, et une capacité à nommer en données (aujourd'hui, l'essai les liste par leur clé, ce qui est interdit dans `src/`) |
| Dedans (1) | rien de plus |
| Dedans (3) | 2 lignes |
| Compteur par carte (point 1.3, option B) | ~40 lignes dans GameState, et la suite complète avant la fusion |

---

## 6. Questions pour Grégoire

1. **La taille** : A (125 cases, 1 px par case, 100 m), B (125 cases, 2 × 2 px) ou C (81 cases, 2 × 2 px, 65 m) ? Je recommande C (planches `petite-carte-hud-*.png`).
2. **Les couleurs** : calculées depuis les dessins, par la moyenne ramenée à la palette (recommandé), ou écrites à la main par famille dans `tiles.json` ? Une couleur de `petite-carte-couleurs.png` te déplaît-elle ? La route et le pont sortent tous deux en `E`, la lisière et la clôture en `0`.
3. **Ce qu'on y voit en plus** : arbres debout seuls (recommandé), ou aussi les arbres couchés, chicots, souches et tas (`petite-carte-options.png`, en haut) ? Les buissons ?
4. **Dedans** : la carte du dehors, toit gardé, Xéros à sa place réelle (recommandé), ou la carte cachée ?
5. **Le cadre et le point** (DESSIN À VALIDER, `petite-carte-cadre.png`) :
   - bons pour toi ?
   - garde-t-on le repère du nord (la flèche) et le fil du bois ?
   - faut-il éclaircir le biseau (avec `^`, hors de la rampe du cadran) ?
6. **Le point sur la forêt profonde** : son contour s'y perd. Lui ajoute-t-on un liseré clair, ou est-ce acceptable puisque la forêt profonde est loin des chemins ?
7. **Les arbres** : un point d'une case par arbre suffit-il (discret sur l'herbe), ou veux-tu le houppier (2 × 2 cases pour le gros arbre) ?
8. **Le bord du monde** : un aplat sombre au-delà (recommandé, on voit qu'il n'y a plus rien), ou la couleur du cadre ?
9. **La mise à jour** : la zone courante repeinte au plus deux fois par seconde (recommandé, sans toucher au moteur), ou un compteur de révision par carte dans GameState (plus juste, touche au moteur) ?
