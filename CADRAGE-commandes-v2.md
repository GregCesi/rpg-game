# Cadrage : commandes v2

Préparation de nuit du 3 au 4 novembre 2026, worktree `~/Code/rpg-game-commandes-v2`, branche `commandes-v2` (partie de `origin/main`,
`d2f4af1`). Rien du jeu n'a changé : seuls ce fichier, une planche (`.art-preview/`), ses dessins (`art/proposals/commandes-touches*.ts`) et
son outil (`tools/essai-commandes.ts`) sont écrits.

Chaque partie sépare **les faits** (ce que fait le code aujourd'hui, vérifié en le lisant), **les options** (avec leur coût) et **mon avis**.
Les questions numérotées pour Grégoire sont à la fin (§ 7).

---

## 1. Ce qui est décidé, et d'où l'on part

### Décidé par Grégoire (3 novembre, après avoir joué)
- La souris ne sert plus qu'au combat : clic gauche = frapper de la main droite, clic droit = de la main gauche, clic maintenu = lancer ;
  Xéros se tourne vers le curseur au moment du coup ; une ressource en main frappe une cible.
- A pose ce qu'on tient, là où le montre le fantôme, devant Xéros ; R tourne.
- Hors combat, la cible est ce qui est devant Xéros (comme avant la refonte), et Xéros regarde où il marche.
- Le signe d'interaction redevient la touche affichée au-dessus de l'objet devant Xéros (`ui-key-e`), à la place des mots près des
  mains ; le contour est abandonné.

### Faits : le code d'aujourd'hui (refonte « commandes » du 3 novembre, fusionnée dans main en `95a9444`)
- **Une seule fonction décide de tout clic** : `clickPlan` (`src/world/clickAction.ts`), pure, lue par le jeu (`WorldScene.act`) et par
  le HUD (`HudScene.showWords`, événement `GameEvent.ClickPlans`). Elle prend les mains, ce qui est visé (`Aimed`, calculé une fois par
  image dans `WorldScene.refreshAim`) et si un plan est connu.
- **La visée passe par un seul point** : `Player.probe()` (`src/entities/Player.ts:106`) appelle `aimProbe` (`src/world/aim.ts`) avec le
  curseur. Tous les systèmes qui cherchent « ce que regarde Xéros » l'appellent (`InteractionSystem`, `hands.ts` aux lignes 351 et 507,
  `harvest.ts`, `transform.ts`, `site.ts`). Sans curseur, `aimProbe` vise déjà devant Xéros, exactement comme l'ancien `probe` (vérifié
  dans `git show 349747a^:src/entities/Player.ts`).
- **Le curseur oriente Xéros à l'arrêt** : `Player.update` appelle `faceCursor()` quand il ne marche pas (`Player.ts:79`), et
  `WorldScene` l'appelle avant chaque action (lignes 612, 696, 802, 967).
- **Le fantôme suit le curseur** : `HandsSystem.layFront` (`hands.ts:582`), ramené à `AIM.reach` (32 px).
- **Les clics passent par le verrou du clavier** (`src/input/keyLatch.ts`, codes `Mouse0`, `Mouse2`) : appuis jamais perdus, durée vraie
  (`pressEnd`, `lastedFor`). `LongPress` (`src/systems/longPress.ts`) est générique : il prend « enfoncé ou non » et la durée vraie ; il
  sert aujourd'hui aux clics mais servirait tel quel à une touche.
- **E** ne fait que `talk`, `swing`, `learn` (`InteractionSystem.isEAction`) ; sa cible est la plus proche des actions E, celle des clics
  la plus proche des autres (`handTarget`) : **deux cibles distinctes** peuvent coexister. L'invite `ui-key-e` est déjà dessinée au-dessus
  de la cible de E (`InteractionSystem.prompt`).
- **A** lâche la main du « dernier clic » (`lastHand`), sinon l'autre ; **R** tourne la même main.
- **Le lancer** (`src/world/throw.ts`, mode `aim` de WorldScene) et **le combat** (`src/systems/combat.ts` : `plan`, `queue` pour
  enchaîner, `aimedAt` sous le curseur jusqu'à `AIM.strike`, 64 px) sont indépendants de `clickPlan` une fois le clic décidé.
- `ui-key-space` (la touche Espace dessinée) n'est plus utilisée nulle part dans `src/` (seulement déclarée dans `art/ui/dialog.ts` et
  montrée dans `art/collection.ts`).
- Les outils (`kind: tool` d'items.json) qui travaillent : la cognée `axe` (2 mains : abattre, ébrancher, couper), la masse `maul`
  (2 mains : fendre), la doloire `broadaxe` (2 mains : équarrir), le coin `splitting-wedge` (1 main : planter), la hachette `hatchet`
  (1 main : tailler), la pioche `pickaxe` (1 main : casser).

---

## 2. Le schéma complet, touche par touche (proposé)

Les touches sont lues par leur place (`KeyboardEvent.code`) ; lettre AZERTY, QWERTY entre parenthèses quand elle diffère. **En gras,
ce qui change** par rapport à `docs/COMMANDES.md`.

### Le clavier

| Touche | Effet | Change ? |
| --- | --- | --- |
| Z Q S D (W A S D), flèches | marcher ; **Xéros regarde où il marche, et garde sa direction à l'arrêt** (plus de rotation vers le curseur) | **oui** |
| Maj maintenu | courir | non |
| Alt maintenu | marcher discrètement | non |
| **E** (ou Entrée), appui court | **agir sans outil sur ce qui est devant** : parler, ouvrir ou fermer, dormir (la paillasse), lire la planchette, **prendre** (un objet, la pièce du dessus d'un tas, un lien, un piquet planté, ce que porte le billot, une récolte à la main), **dans la main droite, puis la gauche si la droite est pleine** ; une place trop lourde : dire ce qui manque et « Maintiens E pour appeler ta mère » ; dans un dialogue, la suite | **oui** (prendre passe des clics à E) |
| **E maintenu** (500 ms, la jauge) | **nouer, dénouer, pivoter une bille, appeler la mère** (les gestes longs du clic maintenu d'une main vide) | **oui** (revient à E, comme avant la refonte, R maintenu en moins) |
| **F** (même place partout) | **travailler avec l'outil en main** sur ce qui est devant : abattre, ébrancher, couper, équarrir (la passe de doloire), planter le coin, fendre, tailler sur le billot, casser à la pioche, couper un lien du rouleau ; **planter le piquet** d'un plan connu (§ 3, conflit 4) ; un pas ou Échap arrête le travail | **nouvelle touche** |
| **A (Q)** | poser ce que tient **la main droite** (sinon la gauche si la droite est vide ; les deux mains : l'objet à deux mains) là où le montre le fantôme, **devant Xéros** : seul, en tas, un lien sous un tas (et, selon la question 3, une place de chantier, le billot) | **oui** (plus de « main du dernier clic ») |
| **Maj + A** | poser ce que tient **la main gauche** | **nouveau** |
| R | tourner ce que poserait A (le fantôme suit) | **oui** (la main de A, plus celle du dernier clic) |
| Échap | arrêter un travail ou une passe ; annuler un lancer qu'on vise | non |
| V | la vitesse du temps | non |
| B | le mode construction (`?construire`) | non |
| molette, +, − | le zoom | non |
| Espace | rien (réservé à l'esquive et au saut) | non |

### La souris (le combat seulement)

| Geste | Effet | Change ? |
| --- | --- | --- |
| clic gauche | frapper avec ce que tient **la main droite** (le poing si elle est vide) ; Xéros se tourne vers le curseur au moment du coup | **oui** (plus de prendre, poser, travailler) |
| clic droit | de même avec la main gauche | **oui** |
| un objet à deux mains | gauche : la taille (coup horizontal) ; droit : le coup d'en haut | non |
| un clic pendant le geste | enchaîne l'attaque suivante | non |
| clic maintenu, main pleine | viser (le repère au sol suit le curseur), relâcher : lancer ; Échap annule | non |
| clic maintenu, main vide | **rien** (les gestes longs passent à E maintenu) | **oui** |
| ce qui est visé par un coup | sous le curseur jusqu'à `AIM.strike` (64 px), sinon dans sa direction : inchangé ; **le curseur ne vise plus rien d'autre** | **oui** |

La souris garde ses usages hors du monde : le mode construction (inchangé, c'est un bac à sable), le panneau `?dieu`, le catalogue, et
dans un dialogue le clic et le survol (question 8).

### Ce qui change par rapport à `docs/COMMANDES.md`, en une liste
1. Prendre : du clic court d'une main vide **à E** (main droite d'abord).
2. Travailler : du clic court de la main de l'outil **à F**.
3. Poser : du clic court d'une ressource (et de A, main du dernier clic) **à A seul** (main droite d'abord, Maj + A la gauche).
4. Les gestes longs : du clic maintenu d'une main vide **à E maintenu**.
5. Planter le piquet : du clic **à F**.
6. Poser sur une place de chantier, sur le billot : du clic **à E ou à A** (question 3).
7. Le curseur n'oriente plus Xéros et ne vise plus rien hors du combat ; le fantôme revient devant Xéros.
8. Les mots près des cases des mains disparaissent ; la touche s'affiche au-dessus de ce qui est devant.
9. Une ressource cliquée ne se pose plus jamais : elle frappe (question 1).

---

## 3. Les conflits, et leur résolution proposée

1. **E et F devant le même objet** (la hachette en main droite, la gauche libre, devant une bille : E la prendrait — si elle se porte —,
   F n'a rien ; la pioche devant une pierre : E prend la pierre, F la casse ; le coin devant une grosse bille : E dit qu'elle est trop
   lourde, F plante le coin). *Résolution* : deux touches distinctes, donc aucun arbitrage caché ; les deux s'affichent (§ 6).
2. **E « prendre » et E maintenu « nouer » sur un tas lié** (et « prendre » / « pivoter » sur une bille). C'est le même conflit que le
   clic court / maintenu d'aujourd'hui, réglé de la même façon : quand un geste long existe sur la cible, E agit **au relâchement**
   (court) ou **au bout du seuil** (long), avec la durée vraie de l'appui (`pressEnd`). *Proposé en plus* : quand aucun geste long
   n'existe, E agit **à l'appui** (plus vif ; `LongPress` n'attend que s'il y a un geste long). Voir question 5.
3. **Maj + A et la course** : Maj est aussi « courir ». En courant, A poserait la main gauche. *Résolution* : on l'accepte (poser en
   courant est rare) ; l'alternative serait une autre touche pour la main gauche (question 4).
4. **Le piquet d'un plan connu** : aujourd'hui son clic le plante, et sans plan il se pose. Si A le plantait, on ne pourrait plus poser un
   piquet par terre une fois un plan connu. *Résolution* : F le plante (c'est un geste de métier, payé `costs.stake`), A le pose
   toujours.
5. **Deux cibles à la fois** : la cible de E et celle de F ne sont pas forcément le même objet (F cherche ce que l'outil travaille,
   `wood.target` et `harvest.target`, avec leur propre portée). *Résolution* : chaque touche s'affiche au-dessus de sa cible ; même
   cible, les deux côte à côte.
6. **Deux outils en main** (la hachette et le coin, une main chacun) devant ce que les deux travaillent : F prend **l'outil de la main
   droite s'il travaille la cible, sinon celui de la gauche**. Aucun cas du contenu actuel ne donne deux travaux sur la même cible, mais
   la règle est écrite pour le jour où.
7. **Un clic de souris pendant un travail** (Xéros abat, un lapin passe) : aujourd'hui le mode `work` ne lit que les pas et Échap.
   *Proposé* : un clic arrête le travail après le coup en cours, comme un pas, sans frapper (question 6).
8. **E les mains pleines devant ce qui se prend** : *proposé* : la touche E ne s'affiche pas (sinon elle serait partout) ; si l'on appuie
   quand même, « Les mains pleines. ». Un refus qui apprend quelque chose (« Trop lourde pour lui (107 kg, il en porte 70) ») garde sa
   touche, mains libres.
9. **F sans rien à travailler** : pas de touche affichée, appui sans effet ni dépense. Un refus d'outil qui s'explique (la cognée sur une
   bille trop grosse : il faut des coins) garde sa touche F et son message, comme `workOf` aujourd'hui.
10. **L'ancien conflit « E et Q posaient tous les deux »** (inventaire du 2 novembre) ne revient pas : E prend, A pose ; seule exception
    possible, poser sur une place de chantier ou sur le billot (question 3).

---

## 4. Ce que je ferai à l'implémentation, et comment

Ordre de travail, un commit par étape (comme les « Commandes 1 à 7 »).

### Étape 1 — la fonction pure des touches (sans Phaser)
- `src/world/clickAction.ts` devient **`src/world/actionPlan.ts`** : `actionPlan(hands, aimed, knowsPlan)` rend
  `{ e: { short, long }, f, a, clicks: { left, right } }`, chaque entrée avec sa sorte et sa cible (E et F peuvent viser deux objets).
  Le principe reste : **une seule fonction, lue par le jeu et par l'affichage**, le comportement tiré des données (`does`, `weapon`,
  `kind`, le piquet d'un plan), jamais d'un nom.
- `clicks` ne garde que `strike`, `punch`, `throw` (et `from` pour l'objet à deux mains) ; `put`, `place`, `rest`, `take`, `work`,
  `plant`, `help-info` et les gestes longs passent à `e`, `f`, `a`.
- `Aimed` reçoit deux cibles (`e` et `f`) au lieu d'une.
- Tests : `tools/test-clics.ts` devient `tools/test-touches.ts` (les 40 vérifications reprises par touche, plus les conflits 1, 4, 6,
  8, 9) ; `tools/test-contrats.ts` (ligne 56) lit `actionPlan`.

### Étape 2 — le clavier
- `src/input/PlayerInput.ts` : `work: ['KeyF']` ; `handsDown()` et `handsLasted()` pour E maintenu (le verrou sait déjà le faire) ;
  Maj + A lu à l'appui de A. `tools/test-input.ts` : F, E maintenu à durée vraie, Maj + A.
- `src/systems/longPress.ts` : inchangé (il sert à E au lieu des clics) ; une seule jauge.

### Étape 3 — la visée devant Xéros
- `Player.probe()` ignore le curseur (`aimProbe(eye, undefined, …)`) ; `Player.update` ne se tourne plus vers le curseur à l'arrêt.
- `HandsSystem.layFront` : le fantôme revient devant Xéros (`frontCorner`, le code d'avant est encore là, sous le `if (c)`).
- `faceCursor()` ne reste qu'au coup et à la visée du lancer (`attack`, `beginThrow`, `updateAim`).
- `AIM.reach` disparaît (seul `AIM.strike` reste, pour les coups) ; `clampTo` de `aim.ts` aussi s'il n'a plus d'appel.

### Étape 4 — WorldScene
- `update` : les clics ne lancent plus que `attack` ou `beginThrow` ; E lit `actionPlan().e` (court à l'appui ou au relâchement, long au
  seuil) ; F lit `.f` ; A et Maj + A lisent `.a` ; R tourne la main de A.
- `lastHand`, `ghostHand`, `clickButton`, `pressKey` simplifiés ou retirés ; `refreshAim` calcule les deux cibles et émet le plan des
  touches (pour l'affichage) au lieu de `ClickPlans`.
- `InteractionSystem` : une seule recherche « devant Xéros » pour E (toutes les actions sans outil), plus de `isEAction` séparé.
- Les messages : « Maintiens le clic pour appeler ta mère. » devient « Maintiens E pour appeler ta mère. » ; les autres textes du jeu ne
  parlent pas de clic (vérifié : seul `systems/build.ts:492`, du mode construction, qui reste).

### Étape 5 — l'affichage
- `HudScene` : `showWords`, `words`, `wordsText` et l'écoute de `ClickPlans` retirés (les cases G et D restent : elles disent la main de
  chaque bouton pour le combat).
- Nouveau `src/systems/keyPrompts.ts` (remplace l'invite de `InteractionSystem`) : la ou les touches au-dessus de leur cible, avec le
  balancement actuel ; la jauge de E maintenu à l'endroit choisi (question 9) ; dessins intégrés **après l'accord de Grégoire** sur la
  planche (§ 6), dans `art/ui/dialog.ts` (`ui-key-f`, `ui-key-a`, la variante de E…), vérifiés par `validate.ts` comme `ui-gauge`.
- `systems/wood.ts` `updatePrompt` (la coupe visée) suit l'outil de F au lieu de celui du dernier clic.

### Étape 6 — la documentation
- `docs/COMMANDES.md` réécrit (schéma, ce qui change, conflits) ; `CLAUDE.md` (8 passages : touches du joueur, poser, lien d'un tas et
  `clickPlan`, travail au coup, pivoter, aide de la mère, combat, inventaire), `README.md` (16 mentions), `docs/CONCEPTION.md` (41),
  39 fiches de `docs/objets/`, les `gesture.keys` de `src/content/transforms.json`, la ligne d'aide de `index.html`.
  `tools/test-docs.ts` vérifie CLAUDE.md, README et COMMANDES.

### Étape 7 — le banc de test et les scénarios (§ 5)

### Ce qui se garde de la refonte du 3 novembre, et ce qui part

| Se garde | Part |
| --- | --- |
| les clics dans le verrou des appuis, jamais perdus, à durée vraie (`keyLatch.ts`, `pressEnd`) | `clickPlan` comme arbitre de tout (remplacé par `actionPlan`, dont les clics ne sont plus qu'une partie) |
| un seul seuil, une seule jauge (`LONG_PRESS`, `LongPress`), désormais pour E | la visée au curseur hors combat, la rotation vers le curseur à l'arrêt, le fantôme qui suit le curseur |
| plus de main active, plus de Tab (SAVE_VERSION 28 inchangée : rien ne change dans GameState) | la « main du dernier clic » pour A et R |
| le lancer physique (`throw.ts`, mode `aim`, `ui-throw-mark`), tout objet frappe (`heft.ts`), chaque clic sa main, l'enchaînement | les mots des clics au HUD (`showWords`, `ClickPlans`) |
| Alt discret, dialogues lus par PlayerInput, Échap qui annule un lancer | le clic maintenu d'une main vide (nouer, pivoter, la mère) |
| la cible d'un coup sous le curseur (`AIM.strike`) | la pose d'une ressource au clic |

**Coût de l'ensemble (étapes 1 à 6)** : de l'ordre d'une journée de travail d'agent, dont 3 à 4 h pour WorldScene et l'affichage. Aucun
changement de GameState, donc pas de `SAVE_VERSION`. Le chantier **touche au moteur** (le clavier, le banc de test) : selon la règle de
fusion, il attend que la suite complète (`npm run test:scenarios:bg:all`) passe sur son dernier commit avant d'aller dans main.

---

## 5. Les scénarios et les tests à adapter

### Faits
- Les scénarios passent presque tous par les aides du banc (`tools/lib/playtest.ts`) : `__do(kinds)` lit `w.plans` (le plan des clics) et
  clique le bouton qui fait la sorte voulue ; `__click`, `__press`, `__release`, `__aim`, `__leave`. Plusieurs scénarios ont en plus
  une petite fonction locale qui traduit un ancien code de touche (`use`, `hands`) en `__do` : `equarrissage`, `fendage`,
  `implantation`, `poteaux`, `tas`.
- Appels relevés (`grep` sur `tools/test-*.ts`) : `combat` (souris, une dizaine de lignes), `noeud` (clic maintenu, 2 endroits), `lapins`
  (`strike` et `take`), `temps` (5 `__click('left')` pour lancer un travail), `etapes` (1), `briques` (1 `put`), `equarrissage` (3),
  `fendage` (3), `implantation` (2), `poteaux` (2), `tas` (2), plus `__leave` dans `cabane`, `etal`, `interieur`.
- `maison`, `monde`, `grange`, `cabane`, `etal`, `construction`, `interieur`, `reset`, `vitesses`, `perspective` ne cliquent pas dans le
  monde (construction au clic du mode construction, E pour les volets et les portes, qui ne change pas).

### Ce que je ferai
1. `playtest.ts` : `__key(code, ms)` (un appui de touche, court ou maintenu en temps vrai, par le même chemin qu'un joueur : un
   `KeyboardEvent` sur la fenêtre) ; `__do(kinds)` lit le plan des touches et appuie **E, F ou A** selon la sorte (même signature, même
   message d'échec qui dit ce que proposent les touches) ; `__click` reste pour le combat ; `__aim` ne sert plus qu'au combat et au
   lancer.
2. Les scénarios : remplacer les sortes disparues des clics (`take`, `put`, `work`, `plant`, `place`, `rest`, `help-info`, gestes longs)
   par les touches ; `temps` et `etapes` : `__click('left')` → `__do('work')` ; `noeud` : clic maintenu → E maintenu ; `lapins` : la
   frappe reste au clic, la prise passe à E ; `combat` : les cas « une ressource sans cible se pose » s'inversent (elle frappe, question 1)
   et `standAt` doit tourner Xéros avant (il ne se tourne plus vers le curseur à l'arrêt) ; `tas` : la ligne 245 visait le fantôme au
   curseur, elle le lit devant Xéros.
3. Les tests rapides : `test-clics` → `test-touches`, `test-contrats`, `test-input`, `test-docs` (§ 4, étapes 1, 2, 6).

### Temps estimé
- Banc (`playtest.ts`) : 1 h.
- Tests rapides : 1 h 30.
- Les 11 scénarios qui cliquent : 3 à 4 h, surtout du temps de passage (chaque scénario se relance seul, 1 à 4 min, et `combat`,
  `equarrissage`, `fendage`, `tas` demanderont sans doute deux ou trois passes chacun).
- La suite complète une fois au moins avant la fusion : une vingtaine de minutes en arrière-plan avec les lourds.
- **Total : une demi-journée**, en plus de l'implémentation.

---

## 6. La touche affichée

### Faits
- `ui-key-e` (11 × 10 px) s'affiche au-dessus de la cible de E (`target.top + 4`, avec un balancement de 2 px), seule ; aucune autre
  touche n'est dessinée (Espace existe mais ne sert plus).
- La jauge du geste long (`ui-gauge`, 14 × 4 px) est aujourd'hui au-dessus de la tête de Xéros (`LONG_PRESS.above`, 35 px).

### Les options quand plusieurs actions sont possibles sur le même objet (E et F devant une bille, la hache en main)
- **(a) Toutes les touches possibles, côte à côte** (E F), à 1 px d'écart. Coût : rien de plus. Le joueur voit tout ; deux touches au plus
  (A ne s'affiche pas au-dessus d'un objet : son signe est le fantôme, question 10).
- **(b) La touche « principale » seule** (F si l'outil travaille, sinon E). Coût : une règle de priorité. Cache une action : on ne
  saurait pas que E prendrait.
- **(c) Une principale et une secondaire plus petite ou plus pâle.** Coût : un deuxième jeu de dessins ; une hiérarchie à décider pour
  chaque paire.
- Pour E maintenu : soit la touche E porte un signe « se maintient aussi » quand un geste long existe (la planche en propose), soit rien
  et le joueur l'apprend par un message la première fois.

### Mon avis
(a) côte à côte, deux touches au plus, chacune au-dessus de sa cible ; la variante de E « se maintient » quand un geste long existe ; la
jauge de E maintenu près de la touche E (elle montre ce qu'on noue, là où on le noue). Le détail suit la planche ci-dessous.

### Les planches

**DESSIN À VALIDER : `.art-preview/commandes-touches.png`** (dessins `art/proposals/commandes-touches.ts`, refaite par
`npx tsx tools/essai-commandes.ts` ; dessinée par le pixel-artist, que j'ai regardée ; rien n'est intégré). Toutes les couleurs viennent
de la palette du dialogue, aucune nouvelle ; toutes les touches ont la facture de `ui-key-e` (11 × 10 px).

| Bande | Ce qu'il faut regarder | Avis (le pixel-artist et moi, d'accord) |
| --- | --- | --- |
| 1. Les touches seules (x6, puis x2 et x3) | E, F, A, Q, et un signe « poser » (une flèche sur une ligne de sol) ; E maintenu de trois façons, chaque étape : (a) la jauge du jeu `ui-gauge` sous la touche, (a2) une jauge à la largeur de la touche, (b) la touche qui se remplit d'or de bas en haut (9 images) | **(b)** : le geste se lit là où le joueur regarde déjà, la jauge au-dessus de la tête de Xéros disparaît ; second choix (a2). Le signe « poser » est juste lisible en x2 |
| 2. E « se maintient aussi » | quatre marques : h1 double bord, h2 trois points sous la touche, h3 une anse, h4 la jauge vide sous la touche | avec (b) : **h2**, les trois points (discrets, lisibles en x2) ; avec (a2) : h4. h1 alourdit, h3 se lit mal en x2 |
| 3. Deux touches | (1) côte à côte, 1 px d'écart ; (2) F principale, E petite ; (3) F principale, E pâle ; (4) empilées | **(1)**, toujours E à gauche et F à droite : aucune des deux n'est secondaire ; la pâle se perd dans le sous-bois, l'empilée monte dans la tête de Xéros |
| 4. Scènes en x2 et x3, sur l'herbe | Xéros devant le coin (objet de 6 × 5 px : la touche flotte à hauteur du genou), un tas de branches, l'arbre (touche au-dessus du houppier, puis à 1,5 m sur le tronc), la porte (de dos), la mère | **l'arbre : à 1,5 m sur le tronc** : au-dessus du houppier de 7 m, la touche sort du cadre aux zooms proches et s'éloigne de ce que Xéros frappe |
| 4. Deux touches en scène | Xéros, la cognée sur l'épaule, devant une bille de 1 m, dans les quatre dispositions | (1) côte à côte. NB : avec la cognée (2 mains), E ne pourrait pas prendre la bille ; le cas réel est un outil à une main (§ 3, conflit 1), la lecture est la même |
| 4. E maintenable en scène | les quatre marques sur un tas lié et sur une bille | h2 (avec b) |
| 4. Le fantôme de pose | Xéros porte une bille, le fantôme devant lui : avec A au-dessus, avec le signe « poser », sans touche | le pixel-artist recommande A au-dessus ; **moi aussi, mais seulement si la lettre est juste en QWERTY** (question 11), sinon sans touche |
| 4. Fond sombre | un coffre sur le plancher, le coin et les deux touches dans le sous-bois, puis au soir sous le voile | les touches restent lisibles ; supposé : la touche est dessinée au-dessus du voile de la pénombre (à vérifier à l'intégration, `DEPTH.prompt`) |

---

## 7. Questions pour Grégoire

Le schéma (§ 2)
1. **Une ressource cliquée sans cible sous le curseur** : la refonte la posait ; la pose passe à A. Elle frappe dans le vide (payée, comme
   une arme : un clic est toujours un coup) **[mon avis]**, ou le clic ne fait rien sans cible ?
2. **F pour travailler**, distinct de E : d'accord ? (L'autre voie, E qui fait tout selon le contexte, ramène le conflit « prendre ou
   couper » devant une bille.)
3. **Poser sur une place de chantier et sur le billot** : par E (le code existe déjà, presque rien à faire), ou par A, le fantôme se
   calant sur la place ou sur le billot (une seule règle « E prend, A pose », 2 à 3 h de plus) **[mon avis : A]** ?
4. **La main gauche** : Maj + A pour la poser **[mon avis]** (en courant, A pose alors la gauche), ou une autre touche ? Et, par
   symétrie, Maj + E pour prendre dans la main gauche (sinon E remplit la droite puis la gauche) **[mon avis : oui, presque gratuit]** ?
5. **E à l'appui** quand aucun geste long n'existe sur la cible, au relâchement sinon **[mon avis]**, ou toujours au relâchement
   (comme les clics d'aujourd'hui) ?
6. **Un clic pendant un travail** : il arrête le travail après le coup en cours, comme un pas, sans frapper **[mon avis]** ; ou il est
   ignoré ; ou il arrête et frappe ?
7. **Le piquet d'un plan connu** : F le plante et A le pose toujours **[mon avis]** ?
8. **La souris hors du monde** : le mode construction garde ses clics, les dialogues gardent clic et survol **[mon avis : oui aux
   deux]** ?

La touche affichée (§ 6 et la planche)
9. **E maintenu** : la touche qui se remplit (b) **[avis]**, ou une jauge sous la touche (a2) ? La jauge au-dessus de la tête de Xéros
   disparaît-elle (oui avec b) ?
10. **Signaler que E se maintient** (nouer, pivoter, appeler la mère) : oui, par les trois points h2 **[avis]** ; ou non, le joueur
    l'apprend en essayant ?
11. **La lettre de la touche « poser »** : A dessiné toujours (faux sur un clavier QWERTY, où c'est Q) ; la lettre selon le clavier
    détecté (`navigator.keyboard.getLayoutMap`, qui marche dans Chrome et Edge, pas dans Firefox ni Safari, A par défaut) **[mon avis]** ;
    ou le signe « poser » neutre ? Et la touche au-dessus du fantôme : oui **[avis]** ou non ?
12. **Deux touches** : côte à côte, E à gauche, F à droite **[avis]** ; ou F seule quand un outil travaille la cible ?
13. **Un grand objet** (l'arbre) : la touche à 1,5 m du sol au plus, sur le tronc **[avis]**, ou au-dessus du houppier ? Le petit coin :
    la touche juste au-dessus (à hauteur du genou de Xéros) convient-elle ?
14. **E les mains pleines devant ce qui se prend** : la touche ne s'affiche pas **[mon avis]**, ou elle s'affiche et l'appui dit « Les
    mains pleines. » ?

L'ordre
15. Je peux faire les étapes 1 à 4, 6 et 7 sans attendre ton accord sur les dessins, puis intégrer les touches à l'étape 5 dès ton accord
    écrit. D'accord ?
