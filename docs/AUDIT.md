# Audit du 1er novembre 2026 (branche `audit`)

La pause de vérification voulue par Grégoire : on a créé et corrigé beaucoup de choses en peu de temps, on vérifie que tout tient.
Étape 1 seulement : **l'audit, sans corriger le jeu**. Six points, répartis entre des sous-agents en lecture seule, chaque constat
vérifié dans le code ; les constats « bug visible en jeu » ont été revérifiés à la main. Gravités : **bug** (visible en jeu, ou une doc
qui mènerait à du code faux), **risque** (une copie qui divergera, un test qui passe à vide, une règle qui ne protège rien), **ménage**.

## Les dix constats les plus graves

| # | Constat | Fichier | Gravité |
| --- | --- | --- | --- |
| 1 | Tourner (R) en mode construction un objet dont les vues ne sont pas dessinées (les 30 de `VIEWS_TODO` : coffre, lit, poêle, table…) demande une image `-r1`/`-r3` qui n'existe pas : l'image manquante de Phaser. `viewImage` ne retombe sur une vue dessinée que pour `-r2` | `src/content/views.ts:16-22`, `src/world/build.ts:84` (`viewsOf`) | bug |
| 2 | Maj + V pendant une course : la course tient Maj, `PlayerInput` lit « Maj tenue » comme « palier précédent » : V en courant **ralentit** le temps | `src/input/PlayerInput.ts:92` | bug |
| 3 | La bille poussée ignore la fatigue : fatigué, Xéros marche à 0,5 × la marche mais pousse à 0,6 × la marche (`ROLL.maxFactor`), plus vite qu'il ne marche | `src/systems/roll.ts:77` | bug |
| 4 | La teinte du bouton « vieux » du mode construction est une copie à la main de la palette, déjà divergente (`#9a968d` contre `#9e9182` depuis le vieux réchauffé) | `src/build/panel.ts:12` | bug |
| 5 | CLAUDE.md, la ligne « Nouvelle récolte » ne nomme ni `harvest.work` ni `stages` : une récolte faite en la suivant retombe sur l'ancien chemin (un coup par appui, prix fixe) | `CLAUDE.md` (« Nouvelle récolte ») | bug (doc) |
| 6 | Les prix fixes par coup (0,8 le coup de cognée, 0,4 la hachette, 12 points le poteau, 3 coups par mètre) sont présentés comme actuels dans le README, CONCEPTION et six fiches ; régler `costs.chop` n'a plus d'effet sur l'abattage | `README.md:69,177,182,186`, `docs/CONCEPTION.md`, `docs/objets/{hatchet,rope-coil,wood-piece,broadaxe,stake,normal-tree}.md` | bug (doc) |
| 7 | CONCEPTION « Le temps » garde, en gras, « Deux vitesses à ne jamais confondre » (la vitesse du temps ne fait que l'horloge, 5 m/s) et l'accélération en pause, contredits par la clôture du même chapitre | `docs/CONCEPTION.md` « Le temps » | bug (doc) |
| 8 | Les tests de la cabane, de la grange et de l'étal réécrivent les plans commités `src/content/plans/{cabane,grange,etal}.json`, lus au même moment par d'autres scénarios (monde, intérieur, test-build) ; le garde-fou de 15 min (SIGKILL) peut laisser `essai-de-construction.json` dans le contenu | `tools/test-{cabane,grange,etal,construction}.ts`, `tools/run-scenarios.ts:47` | risque |
| 9 | Les 4 serveurs Vite des scénarios (et le `npm run dev` de Grégoire, par le lien de `node_modules` de la copie figée) partagent le cache `node_modules/.vite` : une ré-optimisation recharge les pages en plein test (d'où les « rejoué une fois ») ; et rien n'empêche deux suites en arrière-plan de se marcher dessus | `tools/lib/playtest.ts:47`, `tools/scenarios-bg.ts:24-41` | risque |
| 10 | Huit objets possédables qui ont une image au sol (branche, lien, piquet, cognée, masse, coin, hachette, doloire) n'ont pas de `dims` : le gabarit ne les contrôle pas (le lien est dessiné 11 × 4 px pour 10 × 3) ; et la règle de l'âge du bois ne voit que la masse : une vingtaine d'objets de bois (meubles, seau, maillet, piquet, billot) y échappent | `src/content/items.json`, `src/content/validate.ts` (`validateAges`, `isWood`) | risque |

## 1. Les outils

- **Installés** en dépendances de développement : `knip` 6.44, `dependency-cruiser` 18.7, et `@swc/core` (dependency-cruiser ne sait
  pas encore lire TypeScript 7, celui du dépôt ; il lit les sources par swc). `npm run audit` lance les deux.
- **knip** (`knip.json` : points d'entrée `src/main.ts` par Vite, `tools/*.ts`, les aperçus et essais de `art/`) :
  **0 fichier inutilisé, 0 dépendance inutilisée** ; **243 exports et 34 types exportés que rien n'importe** (55 dans
  `content/types.ts` : des schémas exportés pour rien ; 12 dans `state/GameState.ts`, 8 dans `world/strike.ts`, 7 dans
  `world/walls.ts`…), **2 doublons d'export** (`art/lib/held.ts` : `GRIP` et ses alias ; `art/world/normal-geometry.ts` : `TREE_H` et
  `FALL_H`).
- **dependency-cruiser** (`.dependency-cruiser.cjs`, les règles d'architecture écrites, chacune avec son commentaire) : **1 496 modules,
  2 642 dépendances, aucun cycle, aucun orphelin**, **2 violations** :
  - `src/content/validate.ts → src/build/catalog.ts` : le contenu dépend du catalogue du mode construction (règle « content/ ne dépend
    de rien du jeu ») — risque ; correction : passer le catalogue en argument de `validateContent` (comme `combatPoses`), ou déplacer la
    vérification du catalogue dans `tools/check.ts`.
  - `src/world/GameMap.ts → src/entities/Npc.ts` : le modèle remonte vers une entité — ménage ; correction : GameMap rend les points des
    PNJ, la scène crée les `Npc`.
- **Constat d'architecture** : la règle « `src/world/` sans Phaser » n'est pas vraie telle quelle : huit vues Phaser vivent dans
  `world/` (`GameMap`, `buildView`, `interiorView`, `jointView`, `wallTexture`, `woodTexture`, `zoneBand`, et `gloom` en type seul).
  La configuration les nomme en exception pour que la règle protège le reste. Correction proposée (ménage) : les déplacer dans un
  dossier `src/view/`, puis retirer l'exception.

## 2. Une seule source par réglage

| Constat | Fichier | Gravité | Correction |
| --- | --- | --- | --- |
| La bille poussée ignore la fatigue (voir n° 3 ci-dessus) | `src/systems/roll.ts:77` | bug | multiplier par `player.stamina.walkFactor()`, ou une fonction de vitesse commune à Player et RollSystem |
| Teinte « vieux » du panneau de construction recopiée à la main (n° 4) | `src/build/panel.ts:12` | bug | lire `woodAges[a]['*']` (le panneau est hors du jeu : la valeur peut passer par le build) |
| Les moments du cadran (5, 8, 18,5, 21,5 h) codés en dur, à côté des repères `daylight` de world.json | `src/world/daylight.ts:32-36` | risque | déduire les moments des repères, ou un champ `moment` dans les repères |
| Le lever et le coucher de l'astre du cadran (6 h, 20 h) codés en dur ; la force du soleil du voile ne s'annule ni à 6 h ni à 20 h | `src/world/clockFace.ts:24` | risque | les tirer des repères `daylight` |
| Cinq crans de vitesse en dur, `SIM_SPEEDS` qui recopie `time.speeds` + 50, le combat qui ramène à 1 au lieu de `time.default` | `src/world/clockFace.ts:109`, `src/systems/simSpeed.ts:4`, `src/scenes/WorldScene.ts:705` | risque | `time.speeds.length`, `[...time.speeds, 50]`, `time.default` |
| Conversions cm → px à la main (`/ 5`, `/ 10`) au lieu de `CM_PER_PX` ou de `placeAt` / `footprintBox` | `src/state/save.ts:208`, `src/systems/site.ts:189,191` | risque | appeler `placeAt`, `CM_PER_PX` |
| Deux hauteurs de la tête de Xéros : 34 px (170 cm) pour les toits, 160 cm pour le mode construction (et 180 cm de passage dans les intérieurs) | `src/systems/roofs.ts:8`, `src/config.ts` (`BUILD.head`, `INTERIOR.headroom`) | risque | une seule taille de Xéros dans config.ts |
| L'ombre portée d'une pièce de bois recopie la couleur `x` de la palette | `src/world/woodTexture.ts:12` | risque | une seule constante (config.ts `SHADOW`, ou la palette par le build) |
| La boîte des pieds (10 × 8) et le point de collision « 3 px au-dessus des pieds » écrits trois fois | `src/scenes/WorldScene.ts:917-922`, `src/systems/exits.ts:7`, `src/systems/interiors.ts:26` | risque | exporter la taille du corps de `Actor`, une constante commune |
| `'wood' in piece ? 2` au lieu de `take.hands` de la pièce de bois | `src/systems/hands.ts:146` | risque | `defOf(WOOD_PIECE, piece.wood).take!.hands` |
| `WoodSystem.cost` garde les prix fixes de la coupe, de la masse et de la doloire (code mort sauf le coin) | `src/systems/wood.ts:429-434` | risque | réduire à `costs.plant` |
| La moitié du prix avec l'aide de la mère, en dur | `src/entities/Stamina.ts:82` | risque | une clé `raiseHelped` de stamina.json |
| Le coup choisi par la clé de l'outil (`tool === 'hatchet'`), un repli de 30 cm pour le diamètre | `src/world/workPlan.ts:42,46` | risque | le coup dans les données (`harvest.work` ou `work` de l'outil) ; une erreur au lieu du repli |
| La poutre dressée recopiée trois fois | `src/systems/site.ts:329`, `src/world/sitePlan.ts:37`, `src/state/save.ts:247` | risque | une fonction `beamPiece(length, axis)` dans woodShape.ts |
| La longueur maximale d'une pièce (7 m) en dur dans ?dieu ; le cran du mode construction affiché ×20 au lieu de `BUILD.grid` ; 1 440 au lieu de `MINUTES_PER_DAY` (4 endroits) ; le 1,4 de la cadence chargée, reste des 100 px/s ; les verrous et fondus (150, 200, 220 ms) en dur ; la portée de l'aide de la mère sur `TILE` ; la lueur des feux (teinte, opacité, `radius / 64`) en dur | `src/dieu/panel.ts:165,175`, `src/build/panel.ts:300`, `src/scenes/WorldScene.ts`, `src/entities/Player.ts:71`, `src/systems/site.ts:358`, `src/world/GameMap.ts:610-618` | ménage | des réglages nommés dans config.ts ou les données |

Propre (vérifié) : les vitesses de déplacement passent toutes par `SPEEDS` (sauf la bille fatiguée) ; les masses par mass.ts ; la
physique des coups n'est calculée que dans strike.ts et swing.ts ; les sorties et les portes utilisent `crossed`. Une quinzaine
d'autres cas mineurs (décalages d'invites, éclats, nuage de poussière) ne sont pas listés.

## 3. Les mécanismes obsolètes

Rien de visible en jeu. Ce qui survit, avec ce qui l'a remplacé :

| Ce qui survit | Remplacé par | Fichier | Gravité | Correction |
| --- | --- | --- | --- | --- |
| Le rocher se récolte encore « un coup par appui » à prix fixe (`hits: 5`, `costs.chop`) ; il donne les anciennes `stone` et `iron-ore`, pas les pierres brutes | le travail au coup ; la chaîne de la pierre | `src/content/props.json` (`rock`), `src/scenes/WorldScene.ts:686-689` | risque | lui donner une matière de travail (taille de la pierre) et les pierres brutes, ou le noter « à venir » |
| « Finir le travail » paie le souffle par `perCost` × le plafond | le souffle au joule (`breathPerJ`) | `src/systems/work.ts:128`, `src/scenes/WorldScene.ts:754` | risque | `planOf` rend aussi le souffle ; `force(ceiling, breath)` |
| Prix morts : `costs.hewPerM`, `costs.maul` ; `harvest.effort` (seul le billot le porte, jamais lu) ; `hew.stroke` (15 cm) ; `costs.whittle` ne sert plus qu'à la hachette sur le rouleau | le travail au coup | `src/content/stamina.json`, `src/content/types.ts:98,425`, `src/content/props.json:32`, `src/content/wood.json`, `src/content/validate.ts:765` | ménage | les retirer (schéma et JSON ensemble), renommer `whittle` |
| `time.json` `work` (minutes des petits gestes), lu nulle part ; `ClockSystem.speed`, réglé seulement par un test | les gestes sans durée ; la vitesse de simulation | `src/content/time.json`, `src/systems/clock.ts:11-12` | ménage | retirer `work` ; documenter `speed` comme réglage de test ou le retirer |
| `useDown()`, plus appelé (« Espace maintenu enchaîne ») ; son commentaire a pris la place de celui de `turnDown` | un appui lance tout le travail | `src/input/PlayerInput.ts:154-157` | ménage | supprimer, remettre le commentaire |
| ~300 lignes de conversions de sauvegarde 2 → 16, qui ne peuvent plus aboutir (pas d'étape 16 → 17 : refus voulu) | le saut du chantier monde | `src/state/save.ts:95-420` | ménage | les supprimer, commencer `upgrade` à 17 |
| `chain` (place d'une pièce dans sa chaîne), écrit et recopié partout, jamais lu | la pièce de bois `wood-piece` | `src/state/GameState.ts:56-61,73` et 6 autres | ménage | cesser de l'écrire, puis le retirer (`SAVE_VERSION` + 1) |
| L'ancienne jauge verticale, encore construite et chargée | `art/ui/stamina-bar.ts` | `art/ui/stamina.ts`, `art/index.ts:19,60`, `art/collection.ts:45` | ménage | la retirer |
| Les essais intégrés (barre d'endurance, modèle du temps, abattage, gestes, interface du temps), `art/world/normal-logs.ts` (n'exporte rien, déclaré) | le jeu | `art/proposals/`, `tools/essai-*.ts`, `art/world/normal-logs.ts` | ménage | archiver (nommés dans CONCEPTION) ou supprimer |
| Commentaires de l'ancien modèle : « Espace maintenu », « relâcher Espace », « x24 », les docblocks de `costs` et de `Harvest` orphelins, `hits` « nombre de coups », « la lame » dans `attack` et `bladeHits` | — | `src/scenes/WorldScene.ts:685,697-700`, `src/systems/work.ts:37`, `src/content/types.ts:55-58,83,1020-1033`, `src/world/strike.ts:158`, `tools/test-clock.ts:2` | ménage | les réécrire |
| Branches `archi/check-et-systemes` (locale et distante) et `worktree-agent-…`, fusionnées ; `maquette` (un commit non repris : la maquette de la chaumière) ; le dossier vide `../rpg-game-combat` | — | git | ménage | supprimer les fusionnées ; `maquette` : à trancher (tag d'archive ?) |

Pas obsolètes (vérifié) : `HitResult`, `effortOf` (rocher, rouleau), `perCost`, les prix encore lus (`plant`, `stake`, `knot`,
`turnPerKg`, `raisePerKg`, `carryPerKgSec`, `pushPerKgSec`, `runPerSec`, `attackBase`, `attackPerKg`, `cutTie`) ; aucun ancien chemin
de pose, aucune touche lue par sa lettre (hors Ctrl+Z/Y et +/−, voulus), aucune animation morte.

## 4. Les objets face aux règles

**Chiffres** : 120 objets (77 du monde, 43 possédables) ; 56 fiches dans `docs/objets/` (51 d'objets) couvrant 76 clés ; **40 objets
sans fiche** (25 du monde, 15 possédables) ; 6 fiches qui contredisent le contenu, 20 sans toutes les rubriques du modèle ; 33 masses
saisies (dont ~6 à revoir), 38 calculées ; listes de validate.ts : `EXCEPTIONS` 1 (justifiée), `VIEWS_TODO` 30 objets / 77 dessins
(2 à retirer en retirant l'objet, 10 raisons périmées), `RAW_WOOD` 1 (justifiée), `CATALOG_EXCLUDED` 0 (1 à ajouter).

| Constat | Fichier | Gravité | Correction |
| --- | --- | --- | --- |
| Tourner un objet de `VIEWS_TODO` en mode construction : image manquante (n° 1) | `src/content/views.ts:16-22` | bug | dessiner d'abord les vues des meubles ; en attendant, `viewsOf` ne propose que les vues dessinées |
| La raison des 10 meubles de `VIEWS_TODO` (« au chantier de la maison ») est périmée : on les pose et les tourne dans les intérieurs aujourd'hui | `src/content/validate.ts` (`VIEWS_TODO`) | bug | les passer en priorité au pixel-artist |
| 15 objets possédables sans image au sol (outils pas en jeu, pierre, minerai, 7 aliments) s'affichent au sol par leur icône de 16 px (80 cm : une pomme d'un mètre) | `src/content/items.json` | bug | ne pas les proposer au sol ni au catalogue sans image |
| Le gabarit ne contrôle pas 8 possédables à image au sol (sans `dims`) ; l'âge du bois n'est vérifié que par la masse (n° 10) | `src/content/items.json`, `src/content/validate.ts` | risque | reporter les `dims` des fiches ; une matière déclarée pour tout objet de bois |
| `normal-felled-tree` : 420 kg saisis (le tronc seul : 369 kg calculés ; les gros couchés n'en ont pas) ; `stake` 1 kg (≈ 1,8 kg à Ø 5 × 100 cm), `mallet` 1,2 kg | `src/content/props.json`, `items.json` | risque | des masses par la matière, la fiche du couché |
| 40 objets sans fiche ; `big-tree` (posé 4 449 fois), sa souche, le billot sans fiche à eux ; `axe.md` (2,5 kg, 90 cm) et les fiches de l'abri (hauteurs) périmées ; 20 fiches sans « Variantes naturelles », « Transformations », « Métier » ; masses écrites « 1.2 kg » | `docs/objets/` | ménage | des fiches de groupe (meubles, végétation), `big-tree.md`, `chopping-block.md`, mises à jour |
| Contenu mort, seulement au catalogue : 7 aliments, `berries`, `iron-ore`, `hoe`, `sickle`, `watering-can`, `fishing-rod`, `sword`, `lantern`, `candle`, `barrel`, `well`, `rock-rubble`, `woodpile` (doublon des tas calculés) | `src/content/` | ménage | décider pour chacun : sa fiche, ou le retirer |
| Doublons au catalogue : les quatre `-ground` des outils à côté de l'outil ; `shed-plate-north` et `-south` identiques ; `sunpatch` (un effet) au catalogue | `src/content/validate.ts` (`CATALOG_EXCLUDED`), `props.json` | ménage | les exclure avec leur raison ; fondre les sablières (`SAVE_VERSION` + 1) |
| La règle des masses de CLAUDE.md (« prend, pose ou roule ») n'est vérifiée que pour « prend ou roule » (`footing-stone`, les meubles posés sans masse) ; CLAUDE.md et `validateMasses` décrivent `"mass": "stone"`, que plus aucun objet n'utilise | `CLAUDE.md`, `src/content/validate.ts` | ménage | aligner la règle et le contrôle ; mettre les textes à jour |

## 5. Les tests

Aucun bug visible ; des tests fragiles ou qui passent à vide. `npm run test:fast` passe (10 tests, 29 s). **≈ 280 pauses fixes** dans 17
scénarios (fendage 32, construction 25, équarrissage 24, cabane 20, temps 18, tas 18, intérieur 18, combat 18…) ; justifiées : les
mesures de durée (2 s d'horloge, 4 s à x5, la passe observée, la mesure d'image du monde).

| Constat | Fichier | Gravité | Correction |
| --- | --- | --- | --- |
| Les plans commités réécrits par les tests, `essai-de-construction.json` laissé par un SIGKILL (n° 8) | `tools/test-{cabane,grange,etal,construction}.ts` | risque | un dossier temporaire donné au serveur Vite par une variable d'environnement |
| Le cache Vite partagé, pas de verrou entre deux suites (n° 9) ; le `node_modules` lié de la copie figée peut ne pas correspondre au commit testé | `tools/lib/playtest.ts:47`, `tools/scenarios-bg.ts` | risque | un `cacheDir` par serveur ; un verrou avec le PID ; comparer `package-lock.json` |
| Changements de carte, `reset-map`, chutes d'arbre, « Finir le travail », rechargements suivis d'une pause fixe au lieu d'attendre l'état (une vingtaine d'endroits) | `tools/test-*.ts` | risque | `toMap(id)`, `until(cond, label)` communs dans playtest.ts, qui lèvent une erreur nommée |
| Boucles bornées qui échouent sans rien dire ; `load()` attend sans borne quand un scénario est lancé seul | `tools/test-*.ts`, `tools/lib/playtest.ts:63-68` | risque | `until` avec message ; une borne de 2 min |
| Assertions à vide ou trop lâches : le bord du monde, la porte fermée, `walked > 0`, les crans du cadran calculés par le test (jamais lus sur le HUD), `ClockSystem.speed` toujours 1 | `tools/test-monde.ts:269-276`, `test-interieur.ts:186-187`, `test-equarrissage.ts:366`, `test-temps.ts:60,73-77,162` | risque | vérifier l'état réel |
| Scénarios qui ne testent pas ce que dit leur en-tête : « reprend tout seul » et « lancé d'un appui » avec Espace tenu tout du long ; « Échap arrête la passe » jamais essayé | `tools/test-temps.ts:264-287`, `test-etapes.ts:42-50`, `test-equarrissage.ts:5-6,181` | risque | un appui puis relâcher ; ajouter Échap sur le rail |
| Non testés : l'horloge N fois plus vite à V = xN, la page rechargée qui repart à x1, l'écriture de la sauvegarde par l'horloge seule, une porte ou une sortie franchie à x20, la force (porter, rouler) non plafonnée | — | risque | les ajouter au scénario du temps et à test-crossing |
| En-têtes et commentaires périmés ; la fatigue codée 0,5 dans test-vitesses ; `mkdtemp` jamais effacé (39 dossiers) ; `test:monde` lance aussi le combat ; rien ne garantit l'accord package.json / `SCENARIOS` / `test:fast` | `tools/test-*.ts`, `test-sketch.ts:71`, `package.json:31` | ménage | les corriger ; une vérification dans check.ts |

La copie figée régénère bien tout (`npm run art` puis `npm run maps`) : rien à corriger, sinon l'écrire dans l'en-tête du script.

**Suite au chantier tests-rapides (3 novembre 2026).** La suite courante (15 scénarios, 4 à la fois) passe en 4 à 5 min selon la charge
de la machine (contre 15 min, puis un blocage, avant) ; les pauses fixes des scénarios courants sont devenues des attentes d'état. Ce qui
reste, à reprendre plus tard :

- **monde attendra** (décision de Grégoire) : c'est lui qui fait la durée de la suite courante (70 à 180 s selon la charge). Il marche
  vraiment de la maison au bord du monde, à x10 ; il irait plus vite à x50 sur les longues lignes droites, mais son approche fine (à 2 px
  près, un appui d'une image) oscillerait : il faudrait conduire la marche au pas de jeu, pas à l'image.
- Les pauses fixes des scénarios lourds (maison, grange, cabane, étal, construction : une pause après chaque pièce posée) restent.
- La mesure (`npm run test:mesure`) ne voit pas les pauses posées dans la page par un `sleep` local : elle les compte dans le temps du
  scénario, pas dans ses pauses. `PLAYTEST_WAITS=1` dit où passe le temps.
- Le nombre de scénarios simultanés n'a pas été mesuré à 6 et 8 : la suite à 4 occupe déjà 5 à 6 cœurs sur 8 (Chromium sans écran, rendu
  logiciel, dix pas de jeu par image).
- Un E pressé pendant le verrou qui suit une action (200 ms, `lock` de `InteractionSystem`) est lu puis ignoré : c'est voulu (l'E qui ferme
  un dialogue n'en rouvre pas un), mais c'est un appui perdu au sens de la règle « un appui n'est jamais perdu » ; à trancher par Grégoire.

## 6. Les process et la documentation

| Constat | Fichier | Gravité | Correction |
| --- | --- | --- | --- |
| « Le temps » : le paragraphe « Deux vitesses à ne jamais confondre », l'accélération en pause, x24, les travaux en minutes, §6 (indicateur hors défaut, V refusé au combat, sommeil à x360), §7 étape 2 (n° 7) | `docs/CONCEPTION.md` | bug | la clôture en tête comme règle, le reste sous « Historique (remplacé) » |
| Les prix fixes par coup présentés comme actuels (n° 6) ; « 3 coups par mètre » au lieu de « 3 étapes » | `CLAUDE.md` (Le bois), `README.md`, `docs/CONCEPTION.md`, 6 fiches | bug | « le travail au coup se paie au joule ; `costs` ne vaut que pour les gestes sans matière » |
| « Nouvelle récolte » sans `harvest.work` ni `stages` (n° 5) ; « Nouvel outil en main » sans ses données de coup (`work`, `strokes`, `phases`) | `CLAUDE.md` | bug | compléter les deux lignes |
| CLAUDE.md : « x1 à x10 » pour la simulation (c'est x50 dans ?dieu) ; le plafond humain de la force absent ; `?debug` absent ; la règle « un scénario attend un état, jamais un délai » absente ; liste des scénarios incomplète (9 sur 18) | `CLAUDE.md` | risque | corriger ; renvoyer à `SCENARIOS` |
| L'équarrissage par passes (« seule Échap », 9 s la face, 12 points), « Endurance » sans bandeau de reprise (jauge verticale, 100 points), les 5 m/s et `PLAYER.walkSpeed` / `carrySpeed` encore cités, `SAVE_VERSION` donnés au présent | `docs/CONCEPTION.md`, `README.md:91,178`, `docs/objets/faggot.md`, `wood-piece.md` | risque | des bandeaux « repris par… », les valeurs d'aujourd'hui |
| Le README ne connaît ni le temps ni le travail (modes `build`, `rail`, `work` absents ; `time.json`, `work.json`, `swing.ts`, `workPlan.ts`, `simSpeed.ts`, `daylight.ts`… absents ; « quatorze scénarios ») ; son paragraphe « Commandes » double COMMANDES en moins bien | `README.md` | risque | une section « Le temps et le travail » ; renvoyer les commandes à COMMANDES |
| COMMANDES : V absent du tableau des modes ; conflit Maj + V pendant la course non noté (n° 2) ; en-tête « au 1er novembre (chantier combat) » | `docs/COMMANDES.md` | risque | ajouter |
| Le modèle de fiche n'a pas de rubrique « Travail » (outil : `work` ; ce qu'on travaille : `harvest.work`, `stages`) ni « Arme » (exigée par CLAUDE.md) | `docs/objets/README.md` | risque | ajouter les deux rubriques |
| « Une seule physique pour les outils et les armes » n'est vrai que pour l'énergie : l'attaque se paie `attackBase + attackPerKg × kg`, le travail au joule | `docs/CONCEPTION.md` « Le combat » | risque | l'écrire comme choix, ou l'ajouter aux « à trancher » |
| Le combat : les passes 1 et 2 (secteur de 120°, zone sur la lame) sans bandeau ; « Le jour et la nuit (à trancher) » déjà tranché ; la feuille de route arrêtée au 29 octobre ; « Façon de travailler » et la liste `?dieu` de CONCEPTION divergent de CLAUDE et du README ; 1,65 m contre 1,60 m la case ; deux rapports anciens (`IMPLEMENTATION-bac-a-sable.md`, `audit-tailles.md`) qui citent des fichiers absents | `docs/CONCEPTION.md`, `docs/` | ménage | historique, renvois, archives |
| CLAUDE.md fait 29 Ko sur 48 lignes (600 caractères par ligne en moyenne ; la ligne 20 en fait 2 359 et traite huit sujets) ; plusieurs lignes doublent le README mot pour mot, d'où les divergences ; le temps n'a pas de ligne à lui | `CLAUDE.md` | ménage | des règles d'une ou deux phrases avec un renvoi ; le détail des fichiers par thème dans le README ou `docs/<thème>.md` |

## Les corrections, en chantiers courts

Dans l'ordre où je les ferais ; chacun sur sa branche, commité, `npm run build`, la suite des scénarios.

1. **Les quatre bugs visibles** (une demi-journée) : `viewImage` retombe sur une vue dessinée (le n° 1, en attendant les dessins) ;
   Maj + V : le sens lu seulement par `e.shiftKey` de V, pas par Maj tenue pour la course (n° 2), et le conflit noté dans COMMANDES ; la
   bille poussée × la fatigue (n° 3), par une fonction de vitesse commune ; la teinte « vieux » tirée de la palette (n° 4). Un test
   chacun (le meuble tourné en mode construction, V en courant, la bille poussée fatigué).
2. **La documentation qui mènerait à du code faux** : CLAUDE.md (« Nouvelle récolte », « Nouvel outil en main », x50, la force
   plafonnée, `?debug`, la règle « attendre l'état », la liste des scénarios) ; « Le temps » de CONCEPTION autour de sa clôture ; les prix
   fixes par coup et « 3 coups par mètre » partout (README, CONCEPTION, fiches) ; le modèle de fiche (rubriques « Travail » et « Arme »).
3. **Les tests sûrs** : les plans des scénarios dans un dossier temporaire ; un `cacheDir` Vite par serveur et un verrou pour la suite
   en arrière-plan ; `toMap`, `until`, une borne à `load()` dans playtest.ts, puis le remplacement des pauses fixes fragiles ; les
   assertions à vide ; les scénarios qui ne testent pas leur en-tête ; les manques (V à xN, rechargement à x1, porte à x20).
4. **Une seule source** : les moments et l'astre du cadran tirés de `daylight` ; `time.speeds` pour les crans, `SIM_SPEEDS`, le
   combat ; `CM_PER_PX` et `placeAt` ; une taille de Xéros ; la couleur d'ombre ; le corps de l'Actor ; `take.hands` ; `beamPiece` ;
   `raiseHelped` ; le coup du travail dans les données ; les réglages nommés (verrous, fondus, lueurs, portée de la mère).
5. **Le ménage des mécanismes obsolètes** : les prix et champs morts (`hewPerM`, `maul`, `effort`, `hew.stroke`, `time.work`,
   `useDown`) ; « Finir le travail » qui paie le souffle au joule ; les conversions de sauvegarde mortes et `chain` (`SAVE_VERSION`) ;
   l'ancienne jauge ; les essais archivés ; les commentaires ; les branches fusionnées.
6. **Les objets** (avec le pixel-artist) : les vues des 10 meubles d'abord ; les `dims` des possédables à image au sol ; une matière
   pour tout objet de bois et la règle de l'âge ; les masses à revoir ; les fiches manquantes (meubles, végétation, `big-tree`,
   `chopping-block`) et périmées ; le contenu mort à garder ou retirer (à trancher avec Grégoire) ; `CATALOG_EXCLUDED`.
7. **L'architecture** : `validate.ts` sans le catalogue du mode construction ; GameMap sans `Npc` ; les vues Phaser de `world/` dans
   `src/view/` (la règle sans exception) ; les exports morts de knip (schémas non exportés) ; puis `npm run audit` dans `npm run check`.
8. **CLAUDE.md découpé** : une règle par ligne, le détail dans le README et des documents par thème ; les sections périmées de
   CONCEPTION en historique ; la feuille de route refaite.

À trancher avec Grégoire : le rocher (travail au coup, ou « à venir ») ; le contenu mort (garder avec une fiche, ou retirer) ; la
branche `maquette` (archive ou suppression) ; le prix d'une attaque (au joule comme le travail, ou à part, voulu) ; la force qui
multiplie aussi porter et rouler sans plafond.

## Normalisation (complément du 2 novembre 2026, sur papier)

La question de Grégoire : chaque objet sait-il faire ce que ses données disent, et le comportement vient-il de ses données, jamais
de son nom ? Le tableau se tire des données : `npm run capacites` (tools/capacites.ts) écrit `docs/CAPACITES.md`. Ses colonnes :
portable (mains), tas (et compteur), outil (pour quel travail), arme, cible, travail (sa matière, ses étapes), bois (se coupe, se fend,
s'équarrit), transformé, vues, fiche, masse, dimensions, âge du bois, métier.

**108 objets** (75 du monde, 31 possédables, 2 diamètres de la pièce de bois ; après le ménage du chantier 5), **99 cases suspectes** :
métier 49, fiche 33, dimensions 8, vues 3, âge 3, outil 2, travail 1.

### Les cases vides suspectes, avec leur correction

| Trou | Objets | Correction proposée |
| --- | --- | --- |
| **Sans fiche** (33) | les arbres et souches (`big-tree`, `big-tree-stump`, `normal-felled-tree`), le rocher et ses éclats, le buisson, le billot (et avec le rouleau), le tas de bois, la chaumière, les meubles (âtre, établis, poêle, lit, paillasse, sac, jarre, caisse, botte de foin, coffre, table, tabouret), les lumières (lanterne, torche, bougie, `sunpatch`), le puits, la sablière de côté, la porte charretière ouverte, la pioche, la pierre, le minerai | des fiches de groupe (meubles, lumières, végétation) qui nomment leurs clés ; `big-tree.md`, `chopping-block.md`, `rock.md`, `pickaxe.md` à part |
| **Sans métier** (49) | tout ce qui n'a pas de `trade` : les arbres, le rocher, les meubles, les lumières, la pierre, le minerai, la pioche, les `-ground` des outils | `trade` pour tout objet fabriqué (CONCEPTION « Les matières ») ; pour le naturel, un `trade` « nature » ou l'absence permise par une règle écrite (le naturel n'a pas de métier) |
| **Image au sol sans dimensions** (8) | branche, lien, piquet, cognée, masse, coin, hachette, doloire | reporter les `dims` des fiches dans items.json (le gabarit les contrôle alors à 2 px près) |
| **Pas d'image au sol** (3) | pierre, minerai de fer, pioche | leur image au sol et leurs vues (pixel-artist), ou un refus de la pose au sol |
| **Bois sans âge** (3) | seau, seau d'eau, maillet (métier menuisier, masse saisie : la règle de l'âge ne voit que la masse) | une matière déclarée pour tout objet de bois (`mass: {matter: "wood"}` ou un champ `matter`), et la règle de l'âge sur la matière |
| **Outil invisible** (1) | la pioche : ses données de coup existent (le rocher au coup), pas sa planche en main `tool-pickaxe` | ses cinq dessins en main (pixel-artist, art/items/held.ts) |
| **Outil sans données de coup** (1) | le coin : il « travaille » au fendage, mais on ne frappe pas avec | rien à changer : la règle doit savoir qu'un outil peut servir sans frapper (`work` exigé seulement pour ce qui frappe) |
| **Récolte à l'outil à prix fixe** (1) | le billot qui porte le rouleau (couper un lien, `cutTie`) | le lien coupé au coup, avec une matière (une corde de 2 cm) ; ou l'écrire comme geste sans matière voulu |

### Les comportements codés pour un nom d'objet

| Où | Ce qui est codé | Correction proposée |
| --- | --- | --- |
| `src/build/catalog.ts:38-56` | la famille du catalogue tirée de la clé par des expressions (`/door\|gable\|board-wall/`, `/tree\|pollard\|bush\|stump/`, `/rock\|stone-chips/`, `/rope\|faggot\|hay\|thatch\|straw/`, `key === 'cottage'`) | une `family` dans props.json et items.json ; validate.ts vérifie qu'elle est une famille du catalogue |
| `src/world/walls.ts:36,618,981` | les éclats des murs sont l'image `stone-chips`, nommée | `wall.chips` de props.json (le bouche-trou de chaque mur) |
| `src/world/interiorView.ts:96`, `src/systems/daylight.ts:27` | la tache de soleil est la texture `sunpatch`, reconnue par son nom | un objet de lumière déclaré (`light.sun` dans props.json), ou une constante de config.ts ; et l'exclure du catalogue (`CATALOG_EXCLUDED`) |
| `src/content/types.ts:87` | les éclats d'impact : trois matières en dur (`wood`, `stone`, `leaves`) | l'impact tiré de matters.json (une matière a sa planche `fx-<matière>`) ; une nouvelle matière ne touche pas au schéma |
| `src/scenes/WorldScene.ts:639-656` | « mains vides » décidé par `kind === 'resource'` | la capacité : ce qui a `work` ou `weapon` frappe, le reste non |
| ~~`art/world/felling.ts`, `art/world/work-stages.ts`, `tools/lib/trees-preview.ts`~~ | ~~les trois arbres décrits en code~~ | fait (contrats, étape c) : leur géométrie est `tree` de props.json, leurs listes se tirent de props.json ; voir « Un nouvel arbre » ci-dessous |
| `src/dieu/panel.ts:359` | « 4 dalles » : un outil de test nommé | acceptable (?dieu) ; ou une liste de fournitures dans les données de ?dieu |

Propre (vérifié) : le moteur ne nomme aucun arbre, aucun outil ni aucune arme ; la pièce de bois est une seule clé (`WOOD_PIECE`),
voulue ; la main nue est `fist`, réservée par validate.ts.

### Le principe proposé

**Les capacités sont déclarées dans les données ; le comportement vient de la capacité, jamais du nom de l'objet.** Une capacité est
un champ de props.json ou d'items.json (`take`, `pile`, `work`, `weapon`, `target`, `harvest`, `swing`, `wall`, `light`, `family`,
`trade`, la matière). Le code lit le champ ; il ne teste jamais une clé ni une partie de clé. validate.ts vérifie la cohérence :

- un objet qui a des données d'arme se manie (une planche `weapon-<clé>`, une famille de combat.json), et une arme a sa fiche avec son tableau ;
- un objet qui a des données de coup (`work`) a sa planche en main `tool-<clé>` et sert à un travail (une récolte, le bois, une transformation) ;
- tout objet qui s'empile a son genre de tas (piles.json, ou le tas calculé du bois) et son compteur (`count`), et l'objet nomme ce genre (`pile`) ;
- tout objet qui se prend a une masse, et tout objet posé au sol a son image au sol et ses `dims` ;
- tout objet de bois (par sa matière, pas par sa masse) a ses trois âges, sauf le bois brut de RAW_WOOD ;
- tout objet fabriqué a son métier ; tout objet a une famille du catalogue et une fiche (la sienne, ou une fiche de groupe qui le nomme) ;
- aucune clé de contenu écrite en dur dans `src/` hors des listes de validate.ts (un test qui cherche les chaînes de clés dans le code).

### Les recettes, une par sorte d'objet (fait : chantier des contrats)

Une seule recette pour toute sorte : **déclarer les données ; demander au pixel-artist les dessins de la liste du contrat ; lancer
`npm run test:contrats`.** Le contrat de chaque sorte (ce que tout membre sait faire, tous ses dessins) est dans
docs/objets/README.md, « Les contrats » ; tools/test-contrats.ts le vérifie sur tous les membres, et sur un membre d'essai fait
seulement de données pour l'arbre, l'outil et l'arme.

- **Un nouvel outil (une nouvelle hache)** : son entrée d'items.json, avec ce qu'il fait (`does` : `fell`, `limbs`, `cut`…) et ses
  données de coup (`work`) ; toute cible de ce genre l'accepte, sans qu'on la touche. Dessins : icône, image au sol et ses vues,
  posture tenue, planche en main (`work.image`, ou `tool-<clé>`).
- **Une nouvelle arme (une nouvelle épée)** : son entrée d'items.json avec `weapon` ; une posture ou une attaque nouvelle, une
  entrée de combat.json. Dessins : un seul, couché vers l'est ; ses traînées se tirent seules.
- **Un nouvel arbre** : ses trois entrées de props.json (debout avec sa géométrie `tree`, sa souche, son arbre couché), le diamètre
  dans wood.json s'il est nouveau. Dessins : l'arbre debout, sa souche, son arbre couché (son houppier), sa matière ; tout le reste
  se tire (étapes des deux côtés, chutes, ébranchage, décalages). Une variante qui ne change que ses données reprend le dessin d'un
  autre (`tree.art`).
- **Une nouvelle matière** : matters.json (ou une roche de rocks.json), ses transformations, sa résistance au coup s'il le faut.
  Dessins : sa rampe, ses éclats `fx-<matière>`.
- **Un nouveau meuble** : son entrée de props.json (dimensions, corps, masse par sa matière, famille `mobilier`, métier, `aged` s'il
  est de bois, `swing` s'il s'ouvre). Dessins : son image et toutes ses vues.
- **Un nouveau bâtiment** : ses pièces (chacune dans le contrat de sa sorte), son plan du bac à sable enregistré par un scénario
  `tools/test-<nom>.ts` qui le bâtit avec le catalogue (son script, son nom dans `SCENARIOS`), un rectangle `Plan` sur la carte.

*Ce qui reste du code pour un arbre, et pourquoi* (étape c) :
- le dessin d'un arbre est du code (art/ dessine en TypeScript) : un nouveau fichier de dessin s'importe en tête de
  art/world/trees.ts (une ligne), comme tout dessin se déclare dans art/index.ts ;
- la chute a deux manières de tirer ce qui tombe (`fall.source` : `body`, `bark`), choisies par les données, gardées pour que les
  images d'aujourd'hui ne changent pas d'un pixel ;
- la planche de contrôle art/collection.ts nomme encore les images des gros (hors jeu, à compléter à la main).

### Ce qui reste à faire avec le pixel-artist ou Grégoire (pas fait : des dessins, des fiches, des métiers)

- **Dessins** (`DRAWINGS_TODO`, `VIEWS_TODO` de validate.ts) : la pioche en main (`tool-pickaxe`) et au sol ; l'image au sol de la
  pierre, du minerai de fer, des sept aliments et ressources, de la houe, de la faucille, de l'arrosoir, de la canne à pêche, de
  l'épée de métal ; les vues des meubles.
- **Fiches** (`FICHE_TODO` de tools/check.ts) : des fiches de groupe (meubles, lumières, végétation), `big-tree.md`, `rock.md`,
  `pickaxe.md`, `chopping-block.md`…
- **Métiers** (`TRADE_TODO` de validate.ts) : le naturel (arbres, rocher, buisson), les meubles, les lumières, les objets anciens.
- **À décider** : les quatre outils sans travail en jeu (houe, faucille, arrosoir, canne à pêche) ; le lien coupé au billot, encore à
  prix fixe ; le tas de bois dessiné à la main (`woodpile`, posé sur la ferme) face aux tas calculés.
