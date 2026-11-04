# Les commandes

Le schéma des commandes depuis le chantier « commandes v2 » (4 novembre 2026, décidé par Grégoire après avoir joué le premier jet du
3 novembre) : **E** interagit et prend, **F** travaille avec l'outil en main, **A** pose ; **la souris ne sert qu'au combat**. Hors du
combat, la cible est ce qui est devant Xéros, et Xéros regarde où il marche. La touche qui agit s'affiche au-dessus de ce qui est devant
lui (`src/systems/keyPrompts.ts`).

Les touches sont lues **par leur place** sur le clavier (`KeyboardEvent.code`, `src/input/PlayerInput.ts`) : la même place sert en
AZERTY et en QWERTY. Une touche est nommée ici par sa lettre en AZERTY, la lettre QWERTY entre parenthèses quand elle diffère. Touches et
clics passent par le même verrou (`src/input/keyLatch.ts`) : écoutés à l'instant de l'événement, jamais perdus, avec leur durée vraie
(une image longue ne fait pas d'un appui court un appui maintenu). Maj + E et Maj + A sont notés sous leur propre code à l'instant de
l'appui.

**Ce que fera chaque touche et chaque clic** est dit par une seule fonction pure (`src/world/actionPlan.ts`, `actionPlan`), lue par le
jeu et par l'affichage des touches : jamais deux logiques.

## Où l'on est

Le monde a un mode à la fois (`WorldScene`) :

| Mode | Quand | Ce qui est lu |
| --- | --- | --- |
| **jeu** (`play`) | Xéros marche | tout ce qui suit |
| **geste** (`use`) | un coup d'outil ou une attaque se joue | un clic (enchaîner l'attaque suivante) ; le zoom ; le reste est lu et jeté |
| **visée** (`aim`) | un clic maintenu vise un lancer | relâcher : lancer ; Échap : annuler ; le curseur ; le zoom |
| **rail** (`rail`) | une passe de doloire le long d'une pièce | un pas, Échap ou un clic : arrêter après le coup en cours ; V ; le zoom |
| **travail** (`work`) | un travail au coup, lancé de F : Xéros frappe seul jusqu'au résultat, avec ses pauses de souffle | un pas, Échap ou un clic : arrêter après le coup en cours, sans frapper (ce qui est fait reste fait) ; V ; le zoom |
| **dialogue** (`dialogue`) | une ligne de dialogue est ouverte (DialogueScene) | E, Entrée, clic : la suite ; Z/S (W/S), flèches, survol : choisir ; le zoom |
| **passage** (`transition`) | fondu d'une carte à l'autre, aide de la mère | le zoom |
| **construction** (`build`, `?construire`) | le bac à sable | voir plus bas |

Dedans (un intérieur calculé) : les mêmes commandes que dehors.

## Le clavier

| Touche | Effet |
| --- | --- |
| **Z Q S D (W A S D)**, flèches | marcher ; Xéros regarde où il marche et garde sa direction à l'arrêt. Chargé au-delà de 25 kg, plus lentement ; à deux mains (`carry`), lentement |
| **Maj** maintenu | courir (0,2 point du plafond et 5 de souffle par seconde) ; refusé chargé au-delà de 25 kg, à deux mains, fatigué ou épuisé ; à bout de souffle, Xéros repasse au pas et souffle |
| **Alt** (Option sur Mac) maintenu | marcher discrètement, à pas lents : une part de la marche (`PLAYER.sneak`, 0,4 ; `systems/speeds.ts`, réglable dans ?dieu). L'état `sneaking` de Player : les créatures le perçoivent (elles s'alertent et fuient de moins loin, CONCEPTION « Les créatures »). Il l'emporte sur Maj. Le navigateur n'en fait rien |
| **E** (ou Entrée) | agir sans outil sur ce qui est devant : parler, ouvrir ou fermer une porte ou un volet (`swing`), dormir (la paillasse : « Dormir ? »), lire la planchette (apprendre un plan) ; **prendre** (un objet, la pièce du dessus d'un tas, un lien, un piquet planté, le rouleau posé sur le billot, une récolte à la main) dans la main droite, puis la gauche si la droite est pleine ; devant une place trop lourde d'un chantier, dire ce qui manque (« Maintiens E pour appeler ta mère. ») ; dans un dialogue, la suite. Sans geste long sur la cible, E agit à l'appui ; avec, au relâchement |
| **Maj + E** | prendre dans la main gauche (la droite si la gauche est prise) |
| **E maintenu** (500 ms, `LONG_PRESS`) | les gestes longs, les mains vides : nouer un tas lié en fagot, dénouer un fagot, faire pivoter une bille au sol (au contact) ; une main libre suffit pour appeler la mère devant une pièce trop lourde d'un chantier. La touche E se remplit d'or pendant qu'on la tient |
| **F** (même place partout) | travailler avec l'outil en main sur ce qui est devant, lancé d'un appui : la cognée abat, ébranche, coupe le tronc ; la doloire fait une passe sur le rail ; le coin se plante au bout d'une grosse bille ; la masse fend sur un coin planté ; la hachette, sur le billot, taille ce que tient l'autre main (la branche devient un piquet, le piquet une cheville) ou coupe un lien sur le rouleau ; la pioche casse ; **planter le piquet** d'un plan connu sur son tracé. L'outil de la main droite s'il travaille ce qui est devant, sinon celui de la gauche. Un outil qui n'a rien à travailler : F ne fait rien. Un refus (la cognée sur une bille trop grosse) se dit |
| **A (Q)** | poser ce que tient la main droite (si elle est vide, la gauche ; un objet à deux mains, lui) là où le montre le fantôme, devant Xéros : seul, en tas, un lien sous un tas ; devant une place de chantier, y poser la pièce (la place dit son refus) ; devant le billot, y poser le rouleau. Le piquet d'un plan connu aussi : A le pose toujours, F le plante |
| **Maj + A (Q)** | poser ce que tient la main gauche (si elle est vide, la droite) |
| **R** | tourner d'un quart de tour ce que poserait A (Maj tenue : ce que poserait Maj + A) : le fantôme suit |
| **Échap** | arrêter un travail ou une passe de doloire après le coup en cours ; annuler un lancer pendant qu'on vise. Plus tard, un menu |
| **V** | la vitesse du temps, au palier suivant (x1, x2, x5, x10, x20, puis x1) ; lue en jeu, pendant un travail et sur un rail ; une attaque ou un lancer ramène à x1 ; x50 est réservé à ?dieu |
| **B** | le mode construction (`?construire`) |
| molette, **+**, **−** | le zoom, dans tous les modes : un quart de palier par cran, de la vue la plus large (32 × 18 m) à la plus proche (12,8 × 7,2 m) ; la première fois, environ 21 × 12 m ; le cran choisi est retenu (`ZOOM_STEPS` de config.ts) |
| clic sur la **petite carte** (en haut à gauche) | le cran suivant de la petite carte : 65 m autour, 32 m, 100 m, puis retour ; le cran choisi est retenu (`MINIMAP` de config.ts). Ce clic n'est ni une main ni un coup (`src/input/uiClicks.ts`) |
| **Espace** | rien : réservé à l'esquive et au saut, plus tard |

Ctrl n'est jamais une touche du jeu : sur Mac, Ctrl + clic gauche devient un clic droit. Maj + A en courant pose la main gauche : on
l'accepte (poser en courant est rare).

## Les touches affichées

Au-dessus de ce qui est devant Xéros, la touche qui agit (`src/systems/keyPrompts.ts`, dessins `ui-key-*` d'`art/ui/dialog.ts`),
crème, balancée de 2 px :
- **E** au-dessus de ce que E prend ou fait ; avec **trois points** dessous quand E se maintient aussi (nouer, pivoter, la mère) ;
  pendant E maintenu, la touche **se remplit d'or** de bas en haut (`ui-key-e-fill`) ; il n'y a plus de jauge au-dessus de Xéros. Les
  mains pleines devant ce qui se prend : la touche ne s'affiche pas (un appui dit « Les mains pleines. »).
- **F** au-dessus de ce que l'outil travaille (un refus qui s'explique garde sa touche) ; rien quand l'outil n'a rien à travailler.
- **E et F sur la même cible** : côte à côte, E à gauche, F à droite.
- **A** (ou **Q**, selon le clavier détecté par `navigator.keyboard.getLayoutMap` ; A par défaut) au-dessus du fantôme de pose, ou de la
  place de chantier ou du billot où A poserait. Le fantôme ne se montre pas quand F travaille ce qui est devant.
- Un objet plus haut que 2,5 m (l'arbre) a sa touche à 1,5 m du sol, sur le tronc ; un petit objet (le coin), juste au-dessus
  (`KEY_PROMPT` de config.ts).

## La souris : le combat

- **Clic gauche = main droite** (la case D), **clic droit = main gauche** (la case G). Le menu du navigateur est coupé sur le canevas.
- **Clic court** : la main du clic **frappe** avec ce qu'elle tient, toujours, même dans le vide, payé comme un coup : le poing si elle
  est vide, une arme, un outil (l'arme improvisée, `src/world/heft.ts`), une ressource (décision de Grégoire : une ressource cliquée
  sans cible frappe dans le vide). Un objet à deux mains répond aux deux clics : le gauche donne la taille (le coup horizontal), le
  droit le coup d'en haut ; une arme dans chaque main, chaque clic frappe avec sa main. Un clic pendant le geste enchaîne l'attaque
  suivante. Le clic court agit au relâchement (avant le seuil de `LONG_PRESS`).
- **Au moment du coup**, Xéros se tourne vers le curseur, dans la plus proche de ses quatre directions de dessin (`src/world/aim.ts`) ;
  ce qui encaisse un coup se vise sous le curseur jusqu'à `AIM.strike` (64 px), sinon dans sa direction. Le curseur ne vise rien
  d'autre.
- **Clic maintenu**, la main pleine : viser, puis relâcher pour **lancer** (un objet à deux mains : l'un ou l'autre clic). Pendant la
  visée, Xéros ne marche plus et se tourne vers le curseur ; le repère au sol (`ui-throw-mark`) montre où l'objet tombera ; Échap
  annule. Tout se lance, c'est la physique qui dit jusqu'où (docs/CONCEPTION.md, « Le lancer »). Main vide, maintenu : rien.
- **Un clic pendant un travail** (abattre, la passe de doloire) l'arrête après le coup en cours, comme un pas, sans frapper.
- Toute attaque, lancer compris, ramène le temps à x1.

La souris garde ses usages hors du monde : le mode construction (ci-dessous), les dialogues (le clic fait la suite, le survol choisit),
le panneau `?dieu`, le catalogue.

## La construction (`?construire`)

Ses commandes ne changent pas : c'est un bac à sable, la souris y pose et retire les pièces ; R tourne ce qu'on tient, comme en jeu.

| Touche | Effet |
| --- | --- |
| B | entrer dans le mode, en sortir |
| Z Q S D (W A S D), flèches ; Maj | déplacer la caméra ; plus vite |
| clic gauche | poser ce qu'on a en main, là où le montre le fantôme ; sur une jonction : l'assemblage |
| clic droit ; Maj + clic droit | retirer la pièce visée ; avec tout ce qui repose dessus et lui est assemblé |
| R | tourner la pièce (est-ouest, nord-sud, debout) |
| T, G (Page haut, Page bas) | monter, descendre d'un cran de 20 cm |
| Ctrl+Z ou Cmd+Z ; Ctrl+Y, Cmd+Y, Ctrl+Maj+Z ou Cmd+Maj+Z | annuler ; refaire (lus par la lettre, comme partout ailleurs sur l'ordinateur) |

Le panneau du catalogue et `?dieu` se manient à la souris ; leurs clics ne sont pas des clics du jeu (seuls ceux du canevas comptent).

## Les conflits, et ce qui les règle

1. **E et F devant le même objet** (la pioche devant une pierre : E la prend, F la casse). Réglé : deux touches distinctes, aucun
   arbitrage caché ; les deux s'affichent, côte à côte.
2. **E « prendre » et E maintenu « nouer »** sur un tas lié (prendre et pivoter sur une bille). Réglé comme le clic court et maintenu
   d'avant : quand un geste long existe sur la cible, E agit au relâchement (court) ou au bout du seuil (maintenu), à la durée vraie de
   l'appui ; sinon, à l'appui.
3. **Maj + A et la course.** Accepté : en courant, A pose la main gauche.
4. **Le piquet d'un plan connu.** F le plante (un geste de métier, payé `costs.stake`), A le pose toujours.
5. **Deux cibles à la fois** (ce que prend E, ce que travaille F). Chaque touche au-dessus de sa cible ; même cible, côte à côte.
6. **Deux outils en main** devant ce que les deux travaillent : F prend celui de la main droite, sinon celui de la gauche.
7. **Un clic pendant un travail.** Il arrête le travail après le coup en cours, sans frapper.
8. **E les mains pleines devant ce qui se prend.** La touche ne s'affiche pas ; un appui dit « Les mains pleines. ». Un refus qui
   apprend quelque chose (« Trop lourde pour lui (107 kg, il en porte 70) ») garde sa touche, mains libres.
9. **F sans rien à travailler.** Pas de touche, appui sans effet ni dépense ; un refus d'outil qui s'explique garde sa touche F.
10. **E et A posaient tous les deux** (avant le 3 novembre). Réglé : E prend, A pose, y compris sur une place de chantier et sur le
    billot.
11. **La souris faisait tout** (premier jet du 3 novembre : prendre, poser, travailler, nouer au clic ; le curseur orientait Xéros et
    le fantôme le suivait ; un mot par clic au HUD). Réglé : la souris ne sert qu'au combat ; la cible est devant Xéros ; la touche
    s'affiche au-dessus de l'objet.

## À essayer
- Le lancer n'a pas encore de geste du corps (l'objet part de la main sans animation).
