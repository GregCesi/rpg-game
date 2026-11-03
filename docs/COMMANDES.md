# Les commandes

Le schéma des commandes depuis le chantier « commandes » (3 novembre 2026) : le clavier fait marcher et sert à ce qui se fait sans les
mains ; la souris vise, et chaque bouton est une main. Premier jet à jouer : Grégoire l'essaie en jeu, on ajuste. L'inventaire d'avant
(Espace pour tout, la main active, Tab, E qui pose, E et R maintenus) et ses conflits sont résolus plus bas.

Les touches sont lues **par leur place** sur le clavier (`KeyboardEvent.code`, `src/input/PlayerInput.ts`) : la même place sert en
AZERTY et en QWERTY. Une touche est nommée ici par sa lettre en AZERTY, la lettre QWERTY entre parenthèses quand elle diffère. Les clics
passent par le même verrou que le clavier (`src/input/keyLatch.ts`) : écoutés à l'instant de l'événement, jamais perdus, avec leur durée
vraie (une image longue ne fait pas d'un clic court un clic maintenu).

## Où l'on est

Le monde a un mode à la fois (`WorldScene`) :

| Mode | Quand | Ce qui est lu |
| --- | --- | --- |
| **jeu** (`play`) | Xéros marche | tout ce qui suit |
| **geste** (`use`) | un coup d'outil ou une attaque se joue | un clic (enchaîner l'attaque suivante) ; le zoom ; le reste est lu et jeté |
| **visée** (`aim`) | un clic maintenu vise un lancer | relâcher : lancer ; Échap : annuler ; le curseur ; le zoom |
| **rail** (`rail`) | une passe de doloire le long d'une pièce | un pas ou Échap : arrêter après le coup en cours ; V ; le zoom |
| **travail** (`work`) | un travail au coup, lancé d'un clic : Xéros frappe seul jusqu'au résultat, avec ses pauses de souffle | un pas ou Échap : arrêter après le coup en cours (ce qui est fait reste fait) ; V ; le zoom |
| **dialogue** (`dialogue`) | une ligne de dialogue est ouverte (DialogueScene) | E, Entrée, clic : la suite ; Z/S (W/S), flèches, survol : choisir ; le zoom |
| **passage** (`transition`) | fondu d'une carte à l'autre, aide de la mère | le zoom |
| **construction** (`build`, `?construire`) | le bac à sable | voir plus bas |

Dedans (un intérieur calculé) : les mêmes commandes que dehors.

## Le clavier

| Touche | Effet |
| --- | --- |
| **Z Q S D (W A S D)**, flèches | marcher. Chargé au-delà de 25 kg, plus lentement ; à deux mains (`carry`), lentement |
| **Maj** maintenu | courir (0,2 point du plafond et 5 de souffle par seconde) ; refusé chargé au-delà de 25 kg, à deux mains, fatigué ou épuisé ; à bout de souffle, Xéros repasse au pas et souffle |
| **Alt** (Option sur Mac) maintenu | marcher discrètement, à pas lents : une part de la marche (`PLAYER.sneak`, 0,4 ; `systems/speeds.ts`, réglable dans ?dieu). L'état `sneaking` de Player : les créatures le perçoivent (elles s'alertent et fuient de moins loin, CONCEPTION « Les créatures »). Il l'emporte sur Maj. Le navigateur n'en fait rien |
| **E** (ou Entrée) | sans les mains : parler, ouvrir ou fermer une porte ou un volet (`swing`), dormir (la paillasse : « Dormir ? »), lire la planchette (apprendre un plan) ; dans un dialogue, la suite. E ne pose rien et ne se maintient pas |
| **A (Q)** | lâcher ce que tient la main du dernier clic, là où le montre le fantôme (seul, en tas, un lien sous un tas) ; si cette main est vide, l'autre |
| **R** | tourner d'un quart de tour ce que tient la main du dernier clic (l'autre si elle est vide), avant de le poser : le fantôme suit |
| **Échap** | arrêter un travail ou une passe de doloire après le coup en cours ; annuler un lancer pendant qu'on vise. Plus tard, un menu |
| **V** | la vitesse du temps, au palier suivant (x1, x2, x5, x10, x20, puis x1) ; lue en jeu, pendant un travail et sur un rail ; une attaque ou un lancer ramène à x1 ; x50 est réservé à ?dieu |
| **B** | le mode construction (`?construire`) |
| molette, **+**, **−** | le zoom, dans tous les modes : un quart de palier par cran, de la vue la plus large (32 × 18 m) à la plus proche (12,8 × 7,2 m) ; la première fois, environ 21 × 12 m ; le cran choisi est retenu (`ZOOM_STEPS` de config.ts) |
| **Espace** | rien : réservé à l'esquive et au saut, plus tard |

Ctrl n'est jamais une touche du jeu : sur Mac, Ctrl + clic gauche devient un clic droit.

## La souris

### Le curseur
- **Il oriente Xéros.** Pendant la marche, Xéros regarde où il va ; à l'arrêt et au moment de toute action, il se tourne vers le
  curseur, dans la plus proche de ses quatre directions de dessin (`src/world/aim.ts`).
- **Il vise.** Ce qui est sous le curseur, s'il est à portée (`AIM.reach` de config.ts, 32 px, 1,6 m) ; plus loin, la cible la plus
  proche dans la direction du curseur, à la distance où Xéros regarde d'habitude. Sans souris (le curseur jamais passé sur le canevas),
  il vise devant lui, comme avant.
- **Le fantôme de pose suit le curseur**, sans sortir de la portée de Xéros ; si la place est prise, il va à la place libre la plus
  proche (`PUT_DOWN`). Il montre ce que tient la main dont le clic poserait (celle du dernier clic d'abord).

### Les boutons
- **Clic gauche = main droite** (la case D), **clic droit = main gauche** (la case G). Le menu du navigateur est coupé sur le canevas.
- Chaque clic est **court** ou **maintenu**, avec un seul seuil (`LONG_PRESS.ms` de config.ts, 500 ms) et une seule jauge au-dessus de
  Xéros (quand le maintien a un sens). Le clic court agit **au relâchement** : un clic gardé trop longtemps sur un arbre ne lance pas
  la cognée. Xéros visant autre chose avant la fin du clic, le clic est abandonné.
- **Ce que fera chaque clic** est dit par une seule fonction pure (`src/world/clickAction.ts`, `clickPlan`), lue par le jeu et par le
  HUD : près de chaque case, un mot discret pour son clic sur ce qui est visé (« prendre », « couper », « poser », « frapper »,
  « prendre · nouer »…).

### Le clic court, selon ce que tient la main du clic

| La main du clic tient | Ce que fait le clic court |
| --- | --- |
| **rien** | prendre ce qui est visé (un objet, la pièce du dessus d'un tas, un lien, un piquet planté, le rouleau posé sur le billot, une récolte à la main) dans cette main ; sur une place trop lourde d'un chantier, dire ce qui manque ; sinon **un coup de poing** de cette main, payé même dans le vide |
| **un outil, devant ce qu'il sait travailler** | le travail, lancé d'un clic : la cognée abat, ébranche, coupe ; la hachette, sur le billot, taille ce que tient l'autre main (la branche devient un piquet, le piquet une cheville) ou coupe un lien sur le rouleau ; la doloire fait une passe sur le rail ; le coin se plante au bout d'une grosse bille ; la masse fend sur un coin planté. Un pas ou Échap arrête |
| **un outil, sans rien à travailler** | frapper avec (l'arme improvisée, `src/world/heft.ts`) |
| **le piquet, un plan connu** | le planter sur le tracé |
| **une arme** (`kind: weapon`) | frapper (la taille) ; un nouveau clic pendant le geste enchaîne le coup d'en haut. Une arme dans chaque main : chaque clic frappe avec sa main |
| **un objet à deux mains** | les deux clics agissent ; en frappe, le gauche donne la taille (le coup horizontal), le droit le coup d'en haut ; devant ce qu'un outil sait travailler, l'un ou l'autre lance le travail |
| **une ressource** (branche, pierre, bûche, pièce de bois, fagot, rouleau…) | c'est la cible qui décide : devant ce qui encaisse un coup (`target` : le mannequin, les lapins), frapper avec ; sinon la poser là où le montre le fantôme (seule, sur un tas compatible, sur une place de chantier, le rouleau sur le billot) |

Décision de Grégoire : on se défend avec une pierre, on se bat avec une épée ; sans ennemi, la pierre se pose. La branche frappe bien
(`weapon`) mais reste une ressource (`kind: resource`). Toute attaque, lancer compris, ramène le temps à x1.

### Le clic maintenu
- **Main vide** : nouer un tas lié en fagot, dénouer un fagot (les deux mains libres), faire pivoter une bille au sol (au contact,
  les deux mains libres), appeler la mère pour une pièce trop lourde d'un chantier. Rien d'autre à maintenir : relâché, rien ne se fait.
- **Main qui tient un objet** : viser, puis relâcher pour **lancer** (un objet à deux mains : l'un ou l'autre clic). Pendant la visée,
  Xéros ne marche plus et se tourne vers le curseur ; le repère au sol (`ui-throw-mark`) montre où l'objet tombera ; Échap annule.
  Tout se lance, c'est la physique qui dit jusqu'où (docs/CONCEPTION.md, « Le lancer »).

## La construction (`?construire`)

Ses commandes ne changent pas ; elles restent cohérentes avec le jeu (le clic gauche pose, comme la main droite pose ce qu'elle tient ;
R tourne ce qu'on tient).

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

## Les conflits d'avant, et ce qui les règle

1. **Espace faisait trop de choses, selon une règle cachée sur les mains.** Réglé : Espace ne fait plus rien ; chaque bouton de la
   souris est une main, et ce que fait son clic dépend de ce que tient cette main (une seule fonction, `clickPlan`). La branche est une
   ressource qui frappe bien : la cible décide.
2. **L'arme ne servait que de la main active.** Réglé : il n'y a plus de main active ; chaque clic frappe avec sa main.
3. **E et Q posaient tous les deux.** Réglé : E ne pose plus ; on pose d'un clic (au fantôme) ou avec A.
4. **E maintenu réunissait trois gestes sans rapport.** Réglé : E ne se maintient plus ; le clic maintenu d'une main vide fait les
   gestes longs (nouer, dénouer, pivoter, appeler la mère), le clic court reprend.
5. **R avait deux sens selon les mains.** Réglé : R tourne ce qu'on tient, seulement ; pivoter une bille au sol est le clic maintenu.
6. **Le nom de la touche « lâcher ».** Réglé dans les textes : A (Q en QWERTY), la même place.
7. **Les dialogues ne lisaient pas les touches comme le reste.** Réglé : DialogueScene lit E, Entrée, les clics et Z/S par PlayerInput.
8. **Échap ne servait qu'à arrêter un travail.** En partie : il annule aussi un lancer qu'on vise ; un menu viendra.
9. **Maj** : courir en jeu, accélérer la caméra et étendre le clic droit en construction. Inchangé, cohérent.
10. **Deux armes en main, rien ne disait laquelle sert.** Réglé : chaque clic sa main, et le mot de chaque clic s'affiche.
11. **Un coup dans le vide** : gratuit avec un outil, payé avec une arme. Changé : un outil sans rien à travailler frappe, et se paie
    comme une arme (le geste qui fatigue).
12. **Le poing remplaçait le message des mains vides.** Gardé : une main vide sans rien à prendre donne un coup de poing.

## À essayer, à trancher après l'essai
- La visée sous le curseur ou dans sa direction : si elle pose un vrai problème en jeu, le repli est l'orientation par Z Q S D et le
  clic qui agit devant Xéros.
- La marche à reculons (regarder le curseur en marchant) : possible avec les dessins existants (jouer `walk-<direction du curseur>` en
  allant dans l'autre sens), mais les jambes avanceraient vers l'avant ; pas faite, à décider.
- Le lancer n'a pas encore de geste du corps (l'objet part de la main sans animation).
