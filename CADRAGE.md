# Chantier « relief » : cadrage (préparation de nuit, 4 novembre 2026)

Branche `relief`, worktree `~/Code/rpg-game-relief`. Rien du jeu n'a changé : seuls des essais (`art/proposals/relief-*.ts`,
`tools/essai-relief-*.ts`), leurs images dans `.art-preview/` et ce fichier.

Chaque point sépare **les faits** (lus dans le code et les cartes), **les options** (avec leur coût) et **mon avis**.

---

## 0. Ce qui est décidé (Grégoire, 2 et 3 novembre), rappel

- Tout l'ouest de la rivière est un plateau 3 m plus haut que la ferme, sur les 800 m du monde ; la forêt de l'ouest est dessus, intacte.
- Une falaise borde le plateau le long de la rive ouest. Elle arrête Xéros par ce qui lui manque : « Trop haute pour lui (3 m). »
  Monter ou descendre une hauteur est une capacité du personnage, en données (une escalade la relèvera plus tard sans code).
- La rivière arrête Xéros parce qu'il ne sait pas nager : « Il ne sait pas nager. » (capacité du personnage). Sauter, couler : plus tard.
- Le pont disparaît. À sa place, un ancien lit de rivière à sec, est-ouest, qui coupe la falaise et monte en pente douce : le seul passage.
  La rivière s'interrompt de part et d'autre et reprend « comme par magie » ; un léger miroitement aux deux coupures.
- Pas de son.

---

## 1. Où est la hauteur, et comment le jeu la connaît

**Faits.**
- Le jeu est plat : une carte est un calque de tuiles `ground` (une tuile `solid` bloque : l'eau, la clôture, `src/content/tiles.json`)
  et des objets ; `GameMap.areaFree` (le seul test « cette place est-elle libre ? », utilisé par les poses, le roulement, les lapins,
  la fente, le chantier) ne connaît que les tuiles pleines et les collisions d'objets.
- Ce qui varie au mètre du monde se calcule déjà ainsi : la pénombre (`gloom` de `world.json`, `world/gloom.ts`).
- La rivière n'est pas droite : son bord ouest change de colonne d'une case tous les 7 à 37 rangs (tableau du point 5).

**Options.**
- **H1, dans Tiled** : un calque d'objets `relief` dans chacune des quatre zones de la colonne 200-400 m : des polygones `Level`
  (`height` en cm) qui suivent la rive ouest case par case, et un rectangle `Slope` (le lit sec : `from`, `to` en cm, `toward`
  `west`). Les zones entièrement hautes (les quatre de la forêt profonde) ont une propriété de carte `height` (300). `build-maps` les
  lit et les écrit dans `MapData.relief` ; le jeu ne lit jamais Tiled. On voit et on retouche la falaise dans Tiled, comme le reste.
  Coût : build-maps et sa validation (un polygone fermé, des hauteurs en cm, une pente dans une seule direction), un schéma Zod, un
  outil jetable qui trace les polygones depuis la rive une seule fois (ensuite, les .tmj font foi).
- **H2, dans les données** (`relief` de `world.json`, au mètre du monde, comme `gloom`) : une ligne de falaise et une pente. Coût plus
  faible, mais la falaise doit suivre la rive case par case : on recopierait la rivière dans un second fichier, qui divergerait du .tmj
  à la première retouche de la rivière dans Tiled.

**Ce que le jeu en tire (le même pour H1 et H2)** : `src/world/relief.ts`, sans Phaser.
- `heightAt(map, x, y)` (cm) : le niveau du polygone qui contient le point, ou la pente interpolée (continue, linéaire) ;
- les pieds de Xéros, d'un PNJ, d'une bête : `heightAt` de leur point de pieds, à chaque pas ;
- un objet posé : `heightAt` de son ancrage (rien à garder dans GameState : la hauteur se recalcule) ;
- un objet lancé : sa hauteur absolue (point 3).

**Avis** : H1. C'est la règle du dépôt (« une carte = un fichier Tiled »), et la falaise reste collée à la rivière parce qu'elles sont
dans le même fichier.

---

## 2. La capacité de Xéros : monter, descendre, nager

**Faits.** Les seuils de Xéros sont des données (`strength.json`, composant `entities/Strength.ts`) ; une capacité de personnage est un
composant attaché à `Actor`. L'eau bloque aujourd'hui parce que sa tuile est `solid`, sans un mot.

**Ce que je ferai.**
- Nouveau fichier `src/content/mobility.json` et composant `entities/Mobility.ts` (attaché à `Actor`) : `step`, la hauteur que Xéros
  monte ou descend d'un pas (**50 cm** proposés, question 3), et `swim` (`false`). ?dieu « force » n'y touche pas (ce n'est pas de la
  force) ; un réglage ?dieu « Escalade » change `step` en mémoire, pour tester une falaise franchie.
- Les créatures ont la même chose dans leur entrée de `creatures.json` (`mobility` : le lapin `step` 30 cm, `swim` false) : elles ne
  passent que par la pente, sans règle écrite pour elles.
- L'eau : la tuile prend `deep: true` au lieu de `solid` (`tiles.json`). Elle ne bloque plus par elle-même : elle bloque Xéros parce
  que `swim` est faux, et les objets parce qu'on ne pose rien dans l'eau profonde (`areaFree` la compte comme pleine pour une pose).
  Le jour où il saura nager, rien d'autre à changer. L'étang devient de l'eau profonde comme la rivière (même message).
- Le blocage : à la création de la scène, `GameMap` pose des bords de collision (des corps statiques, comme les obstacles) le long de
  chaque marche plus haute que `step` du joueur, et autour de l'eau profonde s'il ne nage pas ; refaits si `step` change. La pente n'a
  pas de marche (sa hauteur varie de 0,5 cm par pixel), on y marche librement.
- Le message : quand Xéros pousse contre un tel bord (il marche vers lui et ne bouge pas), le HUD dit « Trop haute pour lui (3 m). »
  (la hauteur de la marche à cet endroit, arrondie : « 2,4 m » sur le flanc du lit à mi-pente) ou « Il ne sait pas nager. », par
  l'événement `Notice` qui existe, une fois par appui, pas en boucle.
- Les lapins : leur chemin (A* sur cases de 40 cm, `world/creature.ts`) refuse une case dont la hauteur diffère de plus que leur
  `step`, et l'eau profonde s'ils ne nagent pas.

**Coût** : moyen. Un composant, un fichier de données, `GameMap` (les bords), `creature.ts` (le test de case), aucun nouvel affichage
(`Notice`). `validate.ts` vérifie `mobility.json` et `mobility` de chaque créature.

---

## 3. Ce que la hauteur change ailleurs

| Domaine | Faits | Ce que je ferai |
| --- | --- | --- |
| Collisions au bord | l'eau bloque déjà, sans message | les bords de marche et d'eau profonde (point 2) ; un objet posé doit tenir sur un seul niveau ou sur la pente (une marche sous son emprise = place prise, le fantôme le montre) |
| Le lancer | `throw.ts` lâche à 1,6 m et tombe à z = 0 ; un obstacle arrête l'objet, qui tombe devant | hauteurs absolues : le lâcher à `heightAt(Xéros)` + 1,6 m ; l'objet tombe quand sa hauteur passe sous `heightAt` du point survolé ; s'il rencontre une face plus haute que lui, il s'arrête et tombe à son pied, du côté du lanceur ; l'angle se calcule pour la différence de hauteur (`angleFor` avec h = hauteur du lâcher − hauteur du point visé) : lancée du plateau, une pierre va plus loin ; vers le plateau, moins loin, ou contre la paroi. Une cible est touchée si l'objet passe sous `heightAt(cible)` + `dims.h` |
| L'eau | `layNear` pose un objet tombé dans l'eau à la place libre la plus proche (une des deux rives) | inchangé dans ce chantier (question 6) |
| Créatures | aucune garenne près de la rivière (la plus proche à 84 cases, 134 m, sur la ferme) | le test de case par `mobility` ; elles ne montent que par la pente ; rien à déplacer |
| Passer d'une zone à l'autre | `world/zones.ts` : même point du monde | rien pour la logique (la hauteur se recalcule du point). En dessin A, la bande des voisines soulève aussi ce qui est haut (point 4) |
| Objets et garennes près de la rivière | aucun objet de la tempête, aucune branche, aucun tas, aucune parcelle, aucun plan à moins de 20 cases de la rive (vérifié dans les quatre cartes ; la cabane du chasseur est à la case 65) ; des arbres, des buissons et quatre rochers sur les deux rives | rien ne bouge (en dessin B, ce qui serait sur la bande de roche : à vérifier carte par carte) ; le lit sec ne recouvre aucun objet (rangées 63-68 : chemin, eau et sol de forêt seulement) |
| L'abattage au bord | un arbre tombe du côté où Xéros frappe, sans regarder où | un arbre du bord du plateau peut tomber par-dessus la falaise : question 7 |
| Le roulement | une bille roule jusqu'à un obstacle | une marche plus haute que la bille l'arrête, comme un obstacle ; la chute du haut de la falaise : plus tard (question 7) |
| Le mode construction | pièces posées au sol | posées à la hauteur du sol de leur coin ; une pièce à cheval sur une marche est refusée comme une place prise |
| Sauvegarde | `SAVE_VERSION` 29 ; rien de la hauteur n'est gardé | **pas de changement de format** : la hauteur se recalcule des cartes. Une partie où Xéros était sur le pont le retrouve dans le lit sec, au fond à 0 m, libre |
| Tests | aucun test ne passe le pont (test-monde va vers l'est, puis saute dans la forêt profonde par ?dieu) | `tools/test-relief.ts` (test:fast : `heightAt`, les bords, la pente, les messages, le lancer vers le haut et vers le bas, le chemin d'un lapin) ; le scénario `npm run test:relief` (de la ferme au plateau par le lit sec, refus à la falaise et à l'eau avec leur message, passage dans la zone du nord sur le plateau, page rechargée sur la pente) ; test-paysage vérifie déjà la forêt de 0 à 300 m intacte |
| Documentation | CONCEPTION « Le monde » parle du pont | CONCEPTION « Le relief » (nouvelle section), « Le monde » corrigé, CLAUDE.md une ligne, README une règle |

---

## 4. Comment la hauteur se dessine : deux façons

**Faits.** Vue de dessus en trois quarts : un dessus se voit à plat, une face tournée vers le sud en vraie grandeur (3 m = 60 px),
une face est ou ouest en raccourci. L'ordre d'affichage est le y des pieds (`setDepth(y)`), le sol à −1. 52 appels posent une image dans
le monde, dans 17 fichiers ; 3 fichiers convertissent la souris en point du monde (`PlayerInput`, `systems/build`, `gloom`).

### A, le plateau soulevé (la vraie projection)

Tout ce qui est à une hauteur z se dessine z / 5 cm plus haut (3 m = 60 px) : le sol du plateau, ses arbres, Xéros quand il y est,
un objet posé, le fond du lit à sa hauteur, colonne par colonne. Ce qui en découle tout seul :
- la face est de la falaise est vue par la tranche : un bord, pas une face ; à chaque pas de la rive (la rivière se décale d'une case),
  une face sud de 1 case × 60 px apparaît d'elle-même ;
- la paroi nord du lit regarde le sud : une face de 60 px à l'entrée, qui décroît à 0 en haut de la pente ;
- la paroi sud regarde le nord : cachée ; le bord du plateau sud, soulevé, recouvre le sud du fond du lit (1,9 case à l'entrée, rien en
  haut) : d'où la largeur de 6 cases proposée (on en voit 4 à l'entrée) ;
- Xéros monte la pente en montant à l'écran ; contre la paroi sud du lit, il passe derrière la lèvre du plateau.

Ce qu'il faut au jeu :
- `world/relief.ts` : `lift(x, y)` (px), et l'inverse pour la souris (le point le plus au sud qui tombe sous le curseur) ;
- `GameMap` : un calque de sol par niveau, décalé ; la pente dessinée en bandes d'un pixel (une texture faite au chargement) ; les
  faces sud et les lèvres nord en images à profondeur (comme un mur), calculées des hauteurs, leur matière dessinée par le
  pixel-artist (comme les murs de `world/walls.ts`) ;
- chaque image posée dans le monde passe par `lift` (les 17 fichiers : acteurs à chaque image, objets, tas, pièces posées, fantôme,
  invites, outil, jauge, souffle, marque du lancer, éclats, bande des voisines, ?debug) ; un test (comme `test-keys`) refuse une image
  posée sans lui ;
- la caméra suit l'image soulevée ; ses bornes s'étendent de 60 px au nord ; au bord sud du monde, la face du plateau se dessine ;
- l'ombre de la falaise sur l'eau : calculée comme celle des toits (`roofShadow`) ou peinte dans la lèvre (question 4).

Coût : **gros, et c'est un chantier moteur** (fusion seulement après la suite complète des scénarios sur le dernier commit). Risque :
chaque dessin futur doit passer par `lift`. Gain : la vérité, calculée ; tout relief futur (le monde magique de l'ouest, des collines)
se fait par les données seules.

### B, la falaise peinte (à la manière des falaises de Stardew Valley)

Rien n'est décalé : le plateau, ses arbres, Xéros sur le plateau sont à leur place au sol. La hauteur n'existe que dans les règles ;
elle se peint par des tuiles :
- la face est : une bande de roche d'une case, côté plateau, non marchable (la face en raccourci) ;
- la paroi nord du lit : une face de roche en vraie grandeur (60 px, deux rangées à l'entrée, qui décroît en remontant), non marchable ;
- la paroi sud : une crête d'une case au plus ;
- le fond du lit : une tuile « lit sec », la pente lue par des marques (galets en marches, traînées).

Ce qu'il faut au jeu : des tuiles (pixel-artist), leurs règles de pose dans la légende (`connects`, comme l'eau et le chemin), les corps
des points 2 et 3 ; aucun changement de rendu.

Coût : **moyen**, surtout du dessin (les bords, les coins à chaque pas de la rive, la paroi à plusieurs hauteurs). Le
pixel-artist de la planche B compte : la paroi nord à **18 hauteurs** (une par colonne, de 3 à 60 px, soit 27 tuiles, ou 3 textures et
18 masques si le jeu compose), une crête sud qui s'amincit (4 à 18 tuiles), la face est (3 ou 4 variantes et 2 bouts), le lit sec
(4 fonds, 2 passages tassés, 4 « ancien lit », 2 à 4 barres de galets, 6 bords), l'eau à l'ombre de la falaise et les coupures
(environ 20 tuiles animées). Limites : on ne voit
pas Xéros monter ; la paroi prend des cases au sol (deux rangées de face à l'entrée du lit) ; un objet qui tombe du plateau ne se voit
pas tomber de 3 m ; la falaise est un dessin, pas un calcul (le contraire de la règle « calculée, jamais peinte » des ombres de toit).

### Avis

La logique (points 1 à 3) est **la même pour A et B** : je la ferai d'abord, dans les deux cas, et elle se teste seule. Pour le dessin,
voir l'avis du point 7, après les planches.

---

## 5. Où exactement

**La ligne de la falaise** : le bord ouest de l'eau, rangée par rangée, tel qu'il est dans les quatre cartes (lu par
`tools/essai-relief-monde.ts`). Une case = 1,60 m ; « case 42 » = 200 + 42 × 1,6 = 267,2 m du monde.

| Zone | Rangées : case du pied de la falaise (m du monde) |
| --- | --- |
| `bois-du-nord` (0-200 m) | 0-1 : 43 (268,8) · 2-9 : 44 · 10-19 : 45 · 20-52 : 46 (273,6) · 53-62 : 45 · 63-70 : 44 · 71-77 : 43 · 78-85 : 42 · 86-95 : 41 · 96-124 : 40 (264,0) |
| `ferme` (200-400 m) | 0-8 : 40 · 9-20 : 41 · 21-33 : 42 · 34-55 : 43 · 56-82 : 42 (267,2, lit sec compris) · 83-90 : 41 · 91-100 : 40 · 101-112 : 39 · 113-124 : 38 (260,8) |
| `bois-du-sud` (400-600 m) | 0-10 : 38 · 11-22 : 39 · 23-30 : 40 · 31-37 : 41 · 38-45 : 42 · 46-52 : 43 · 53-62 : 44 · 63-99 : 45 (272,0) · 100-110 : 44 · 111-120 : 43 · 121-124 : 42 |
| `bois-de-la-riviere` (600-800 m) | 0-7 : 42 · 8-38 : 41 · 39-51 : 42 · 52-62 : 43 · 63-74 : 44 · 75-102 : 45 · 103-113 : 44 · 114-122 : 43 · 123-124 : 42 |

Les raccords aux bords des zones tombent juste (la rivière est continue d'une zone à l'autre). La colonne 0-200 m (les quatre zones de
la forêt profonde) est tout entière sur le plateau. Aux bords nord et sud du monde, le plateau s'arrête avec le monde.

**Le lit sec** (zone `ferme`) :
- sur la ligne du chemin (rangées 65-66, où est le pont), **6 cases de large : rangées 63 à 68** (9,60 m, de 300,8 à 310,4 m du monde) ;
- son fond est à 0 m de la rive est (case 47) au pied de la falaise (case 42), puis **monte de 3 m sur 30 m (10 %)**, de la case 42 à
  la case 23 (de 267,2 à 236,8 m du monde) ; au-delà, le sentier continue sur le plateau (rangées 65-66) ;
- le chemin de terre y entre et le suit (une bande plus tassée au milieu du fond).

**Ce qui disparaît** : le pont (14 tuiles, rangées 65-66, cases 41-47) ; l'eau des rangées 63-64 et 67-68 (cases 42-46), devenue le
fond du lit ; **aucun arbre** : rien n'est planté dans les rangées 63-68 entre les cases 23 et 47 ; les plus proches (rangées 62 et 69)
restent sur le plateau, au bord des parois, et un rocher (case 37, rangée 62) au bord de la paroi nord. Les dessins du pont restent dans
`art/` et leurs numéros dans le registre (on ne supprime jamais une entrée) ; je les retire de la légende des esquisses.

**Les coupures de l'eau** : au bord nord du lit (entre les rangées 62 et 63) et au bord sud (entre 68 et 69), sur les 5 cases de la
rivière (42-46). Le miroitement : un objet plat animé posé dans Tiled à chaque coupure (comme le rai de lumière `sunpatch`, avec une
`anim` comme la bougie), dessiné par le pixel-artist.

**Comment je changerai les cartes** : un outil jetable (`tools/relief-cartes.ts`, supprimé après) qui, dans `ferme.tmj` seulement,
remplace le pont et l'eau du lit par la tuile du lit sec, pose les deux miroitements, et dans les quatre zones de la rivière pose les
polygones `Level` et le `Slope` ; puis les .tmj font foi. Aucune autre carte ne change.

---

## 6. Les dessins à faire, dans l'ordre (tous par le pixel-artist, chacun validé par toi avant intégration)

1. **La tuile « lit sec »** (le fond : sable, galets, terre tassée ; 4 variantes, sans contour) et son raccord avec le chemin.
2. **Le miroitement** des coupures (4 images, un objet plat animé, `views: round`, ses `dims`, sa fiche).
3. Selon la façon retenue :
   - **A** : la matière de la roche des faces calculées (la face sud de la falaise et des parois : une texture qui s'étire à toute
     hauteur, ses arêtes, comme les pierres des murs), la lèvre du plateau (la crête vue de dessus), le pied mouillé ;
   - **B** : les tuiles de falaise (le bord est droit, les coins rentrants et sortants à chaque pas de la rive, les raccords avec l'eau
     et avec le lit), la paroi nord du lit à ses hauteurs, la crête de la paroi sud.
4. La fiche de chaque nouvel objet (`docs/objets/`), le miroitement d'abord.

L'ordre du chantier : la logique (points 1 à 3, testée seule, sans dessin) ; la carte (le lit, les polygones) ; le dessin retenu, après
ton accord ; le scénario ; la documentation.

---

## 7. Les planches

| Planche | Ce qu'il faut regarder |
| --- | --- |
| `.art-preview/relief-a.png` (la scène seule : `relief-a-scene.png`, à l'échelle 1) | **A, le plateau soulevé.** La scène x2, le détail x4 de l'entrée du lit, le miroitement x8 (4 images, coupure nord et sud). Regarder : la paroi nord du lit (couches de calcaire, 60 px à l'entrée, 0 en haut), Xéros soulevé de 0, 30 et 60 px, la lèvre du plateau sud qui surplombe le lit, et surtout **le bord est de la falaise** : vu par la tranche, il ne se lit que par une lèvre de roche de 2 à 4 px, le pied mouillé et **l'ombre portée sur l'eau, calculée comme celle des toits** (15 px vers l'est pour 3 m). Refaire : `npx tsx tools/essai-relief-a.ts` |
| `.art-preview/relief-b.png` | **B, la falaise peinte.** La même scène, le même détail, le même miroitement. Regarder : la face est en bande de roche de 30 px (le dessinateur lui-même la trouve plus « muret gris » que falaise), la paroi nord en trapèze peint, les barres de galets qui disent la pente, Xéros au même niveau partout. Refaire : `npx tsx tools/essai-relief-b.ts` |
| `.art-preview/relief-monde.png` | **La vue d'ensemble.** Les colonnes 0-600 m du monde (une case = 4 px) : le plateau teinté, la falaise en rouge le long de la rive ouest, zone par zone, le lit sec en sable sur la ligne du chemin, les coupures en bleu clair ; à droite, le lit sec dans la zone de la ferme (une case = 16 px), la pente de 3 m à 0 m, le pont barré. Refaire : `npx tsx tools/essai-relief-monde.ts` (après `npm run maps`) |

**Ce que j'en tire (avis).**
- **A se lit mieux là où la hauteur compte pour le joueur** : dans le lit sec, on voit Xéros monter, la paroi décroître, le plateau
  surplomber. La vraie projection fait le travail toute seule, et l'ombre calculée tient le bord est.
- **Le point faible de A est le bord est le long de la rivière** : sans l'ombre, ce n'est qu'un trait gris ; et comme le sol du plateau
  est le même que celui de la rive, la hauteur ne se voit qu'au bord. D'où une variante, **A+** : la face est montrée en raccourci à ½
  (30 px), comme le bout d'une bille est-ouest dans le gabarit, dessinée sur la première bande de l'eau (calculée, pas une tuile).
  C'est une triche du même ordre que la règle D ; elle se teste sur une planche en une heure (question 2).
- **B est sûr et moins cher, mais se lit comme un décor** : la face est ressemble à un muret, la paroi nord à une plaque posée, et on ne
  voit pas qu'on monte.
- **Ma recommandation : A** (ou A+), la logique d'abord. Je la recommande parce qu'elle est la règle du jeu (calculé, jamais peint),
  qu'elle servira à tout relief futur sans dessin nouveau, et que la planche montre qu'elle fonctionne là où on passe. Son prix est un
  chantier moteur (le point 4) : à fusionner seulement après la suite complète des scénarios.
- Communs aux deux : le lit sec (une tuile, 4 variantes, ses bords) et le miroitement (4 images). Dans les deux planches, le miroitement
  est discret (quelques éclats sur une lame d'eau) : il se lit « magique » surtout animé ; à juger en jeu.

**Défauts relevés sur les planches** (à reprendre avec le pixel-artist si la façon est retenue) : en A, la trace du chemin dans le lit
est pointillée de près, le raccord lit/sous-bois en haut de la pente fait des dents de scie, l'eau au pied se voit peu sous l'ombre ;
en B, le coin net où la paroi nord rejoint la face est, le fond du lit uniforme, quelques points très sombres dans l'eau à l'ombre.

---

## 8. Questions pour Grégoire

1. **La façon de dessiner** : A (le plateau soulevé, vraie projection, chantier moteur), ou B (la falaise peinte, en tuiles, sans toucher
   au rendu) ? Mon avis : A.
2. Si A : le bord est de la falaise tel quel (lèvre + ombre calculée, `relief-a.png`), ou **A+** (la face est montrée en raccourci à ½,
   30 px, sur l'eau, comme le bout d'une bille) ? Je peux faire la planche A+ avant de commencer.
3. **La marche de Xéros** (`step` de `mobility.json`) : 50 cm qu'il monte et descend sans y penser ? Au-delà, refus avec la hauteur
   (« Trop haute pour lui (3 m). »). Faut-il un autre seuil pour descendre (sauter de 1 m, par exemple) ?
4. **L'ombre de la falaise** : calculée par le jeu comme celle des toits (ce que montre la planche A ; elle tourne avec le soleil ?
   aujourd'hui l'ombre des toits est fixe), ou peinte une fois pour toutes ?
5. **Le lit sec** : 6 cases de large (9,60 m, rangées 63-68) et une pente de 10 % (3 m sur 30 m, de la case 42 à la case 23) ?
   Plus large ou plus douce (6 % : 50 m) ?
6. **Un objet qui tombe dans la rivière** (lancé, lâché du haut de la falaise) : comme aujourd'hui, posé sur la rive la plus proche ;
   ou perdu au fond (la matière se conserve : il reste dans GameState, inatteignable tant qu'il ne nage pas) ? Mon avis : comme
   aujourd'hui dans ce chantier, le fond de l'eau avec la nage.
7. **Ce qui tombe par-dessus la falaise** : un arbre du bord du plateau abattu vers l'est, une bille roulée jusqu'au bord. Mon avis pour
   ce chantier : l'arbre couché reste au niveau de son pied et dépasse au-dessus du vide (sa collision seulement là où il touche le
   sol) ; la bille s'arrête au bord comme contre un obstacle ; la vraie chute plus tard (listée comme limite « en attente d'un dessin ou
   d'une mécanique »).
8. **L'eau ne bloque plus par elle-même** (`deep` au lieu de `solid`, le refus vient de `swim`) : d'accord pour l'étang aussi
   (« Il ne sait pas nager. » au bord de l'étang) ?
9. **Le miroitement** : un objet plat animé posé dans Tiled à chaque coupure (proposé), ou des tuiles d'eau animées ? Et sa force :
   discret comme sur les planches, ou plus marqué ?
10. **Le chemin dans le lit sec** : une trace tassée qui le suit jusqu'en haut (planches A et B), ou le lit nu, le chemin reprenant en
    sentier sur le plateau ?
11. **La hauteur dans Tiled** (H1 : polygones `Level` et rectangle `Slope` dans un calque `relief`) plutôt que dans `world.json` (H2) ?
    Mon avis : H1.

---

## 9. Deuxième essai : le chemin creux (4 novembre, après les planches A et B)

Grégoire a vu A et B : aucune ne convient. Le choix A/B et les 11 questions de la section 8 restent en suspens. Cet essai cherche
d'abord **à quoi ressemble le passage** ; la technique viendra ensuite. Référence : `~/Code/rpg-game/.captures/chemin-creux-reference.png`
(un chemin de terre claire qui s'enfonce dans une masse de verdure, une bouche sombre au fond sous les arbres).

### 9.1 Ce que Grégoire veut (rappel)

- Le passage est un **chemin creux** : un couloir encaissé dans le plateau, « comme si un ver de terre avait creusé un trou », de 2 à 3 m
  de large (deux personnes s'y croisent à peine), qui ondule un peu.
- Le plateau, ou au moins les parois du chemin, monte à 5 ou 6 m.
- Parois de terre très foncée, racines, mousse, broussailles, irrégulières ; sol du passage clair, presque blanc (terre tassée, cailloux).
- Ouvert en haut, mais on croit entrer dans un tunnel : la végétation du plateau se penche et se referme presque ; vue de la ferme,
  l'entrée est une bouche sombre sous les feuillages. Ces feuillages deviennent transparents quand Xéros passe dessous, comme un toit.
- Une pénombre de sous-bois dans le couloir.
- La rivière est coupée net par le passage et reprend de l'autre côté ; le miroitement reste une proposition.
- La forêt du plateau n'a rien subi de la tempête.

### 9.2 Faits

- **L'écran au zoom de départ** (`ZOOM_STEPS.start` = 3, `src/config.ts`) : 427 × 240 px du monde, 21,3 × 12 m. À 5 cm par pixel,
  une face tournée vers le sud de **5 m fait 100 px, 42 % de la hauteur de l'écran** ; de 6 m, 120 px, la moitié. Au zoom le plus large
  (32 × 18 m, 360 px de haut), 28 % et 33 %.
- **La forêt du plateau est déjà intacte** : aucun objet de la tempête à l'ouest de la rivière, dans aucune des huit zones de la
  colonne 0-400 m (seulement `big-tree`, `normal-tree`, `bush`, `rock`, lus dans les `.tmj`). Rien à retirer.
- **La place du couloir** (zone `ferme`) : la trouée du chemin d'aujourd'hui, rangées 63 à 69 (≈ 10 m), est vide d'arbres de la case 0
  à la case 42 ; les arbres les plus proches sont aux rangées 62,8-62,9 et 69,3-69,9 (`big-tree` 9,7 / 24,3, `normal-tree` 13,8,
  rocher 37,0 au nord ; une rangée d'arbres au sud). Un couloir de 2,5 m (≈ 1,6 case) y tient, avec environ 4 m de chaque côté
  entre ses bords et ces arbres : c'est la place des lèvres, des broussailles et des branches qui se penchent.
- **La longueur** : de la falaise (case 42, 267,2 m du monde) au bord ouest de la zone (case 0, 200 m), il y a 67 m. Un couloir de
  **60 m** (jusqu'à la case ≈ 4,5) reste dans la zone `ferme` ; au-delà de 67 m, il passerait dans `foret-profonde` et franchirait un
  bord de zone en montée (la bande des voisines, `world/zoneBand.ts`, devrait alors montrer la pente : plus cher).
- **L'ombre portée** du plateau (même calcul que les toits, `SHADOW` de `src/config.ts` : 0,25 × z vers l'est, 0,1 × z vers le sud) :
  pour 5 m, 25 px sur l'eau (1,25 m, un sixième de la rivière de 8 m) et 10 px vers le sud ; pour 6 m, 30 px et 12 px.
- **La géométrie d'un couloir est-ouest** dans la projection du jeu : la lèvre sud du plateau, soulevée de 100 px (5 m), recouvre
  entièrement le fond d'un couloir de 2,5 m (50 px) : seule la paroi nord (face au sud, vraie grandeur) se voit. La bouche d'un couloir
  qui entre vers l'ouest dans une falaise tournée vers l'est est vue en raccourci. Un tronçon orienté nord-sud montre au contraire son
  sol clair entre deux parois en raccourci.

### 9.3 Options

**La hauteur.**
- **H5 : tout le plateau à 5 m** (ma proposition). La falaise le long de la rivière passe de 3 à 5 m : son refus devient « Trop haute pour
  lui (5 m). » ; son ombre sur l'eau passe de 15 à 25 px ; au bord sud du monde, une face de 100 px ; la caméra s'étend de 100 px au nord
  dans la façon A. Rien d'autre ne change par rapport au cadrage (le lancer, les créatures et la sauvegarde suivent la hauteur, quelle
  qu'elle soit). Pente : 5 m sur 60 m, 8,3 %.
- **H6 : tout le plateau à 6 m.** La moitié de l'écran pour une face au sud ; 6 m sur 60 m, 10 % (la pente du premier cadrage).
- **H3+talus : le plateau reste à 3 m, des talus de 2 à 3 m bordent le chemin** (le vrai chemin creux du bocage : le chemin s'enfonce
  et la terre rejetée fait un talus planté de haies). La falaise de la rivière reste à 3 m et rien ne change ailleurs ; mais il faut une
  deuxième sorte de hauteur (un talus en long, des deux côtés du couloir), et les parois atteignent 5-6 m seulement près de l'entrée.

**La longueur.** 60 m (proposée : dans la seule zone `ferme`, pente de 8 à 10 %). Plus long : franchit le bord de la zone (voir 9.2).

**Le tracé.** Voir les planches (9.4) : la difficulté d'un couloir est-ouest (9.2, dernier point) décide de la forme.

**Les feuillages qui se referment.** Une seule mécanique du jeu existe déjà pour « devenir transparent quand Xéros est dessous » :
le toit d'un abri ouvert (`src/world/roofView.ts`, `src/systems/roofs.ts`, `ROOF` de `src/config.ts`). Le couvert du chemin creux
serait une pièce de ce genre (un objet à `roof`, ou un calque de feuillage marqué de la même façon) : à décider à l'étape technique.

**La pénombre.** Faits : la pénombre du sous-bois ne dépend aujourd'hui que de l'abscisse du monde (`gloom` de
`src/content/world.json` : 0,34 à 0 m, 0,15 à 200 m, 0,05 à 280 m, 0 à 300 m). Sur la ligne du couloir (207 à 267 m), elle vaut déjà
0,14 à 0,07 : à peine visible. Une pénombre propre au couloir demande une petite extension : une pénombre par rectangle (un objet
Tiled, comme `Parcel`) ou tirée de la profondeur du creux (la hauteur des parois au-dessus du sol du chemin). Avis : la seconde,
qui vient du relief lui-même et suivra n'importe quel autre creux.

### 9.4 Les planches du chemin creux (pixel-artist ; refaire : `npx tsx tools/essai-relief-creux.ts`)

Dessins : `art/proposals/relief-creux.ts` (sol clair, talus et paroi de terre, racines, lierre, mousse, broussailles de lèvre, masses de
feuillage), `art/proposals/relief-creux-scene.ts` (un seul modèle de hauteur, quatre cadrages, trois variantes). Arbres, buissons et
Xéros sont ceux du jeu. Hauteur 5 m, couloir de 60 m, 2,5 m de sol, pente 8,3 %, vraie partout. Chaque vue est cadrée sur l'écran de
départ (427 × 240 px), montrée x2, avec un détail x4 autour de Xéros.

**Le tracé dessiné (fait, et c'est un choix à valider).** Pour que la bouche et le sol se voient (9.2, dernier point), le pixel-artist
a tourné le couloir **nord-sud** :
- la rivière est coupée sur 3 m (le lit sec, sur la ligne du chemin d'aujourd'hui) et **reprend décalée de 7 m vers l'ouest** au sud
  de la coupure ; au nord, le plateau avance en promontoire, dont la face sud (5 m, 100 px en vraie grandeur) regarde la ferme ;
- **la bouche s'ouvre dans cette face, tournée vers le sud** ; le couloir monte vers le nord en ondulant, **le long de la rivière**,
  séparé d'elle par une bande de plateau de quelques mètres ; puis, dans son dernier quart (1,3 m de fond), il tourne vers l'ouest et
  sort sur le sentier du plateau.
Ce que ce tracé change par rapport au cadrage : la rive ouest n'est plus droite à la coupure (décalage de 7 m), et le sentier du plateau
ne part plus de la falaise sur la ligne du pont mais ≈ 50 m plus au nord.

| Planche | Ce qu'il faut regarder |
| --- | --- |
| `.art-preview/relief-creux-1-ensemble.png` | La scène de 55 × 65 m (V2, x1), les cadres des trois vues, et à droite le plan des hauteurs (falaise en rouge, cotes 0 à 5 m). La rivière coupée et décalée, le couloir clair qui serpente sous les arbres le long de l'eau, sa sortie dans le sentier. |
| `.art-preview/relief-creux-2-entree.png` | Xéros sur le lit sec devant la bouche. La face de terre sombre de 100 px (racines, mousse, frange d'herbe), le sol clair qui monte dans l'entaille et s'assombrit ; en V2 et V3, le rideau de feuillage en arche au-dessus de la bouche. |
| `.art-preview/relief-creux-3-couloir.png` | Xéros à mi-pente (sol à 2,5 m, parois de 2,5 m). Les talus de chaque côté, les arbres de la lèvre penchés au-dessus, et les feuillages au-dessus de lui transparents (alpha 0,35, comme `ROOF`), la pénombre plus forte sous la voûte. |
| `.art-preview/relief-creux-4-sortie.png` | Xéros sort à 5 m : le dernier tronçon est-ouest (sa paroi nord basse, face au sud), le sol clair qui rejoint le sentier brun. |

**Les variantes** (côte à côte sur chaque planche) :
- **V1** : talus de terre, arbres peu penchés, pénombre 0,36. Le sol se lit très bien, mais c'est un ravin à ciel ouvert, pas un tunnel.
- **V2** : mêmes talus, arbres très penchés (40 px), rideau en arche à la bouche, pénombre 0,5.
- **V3** : parois presque à pic noyées dans la pénombre (0,6), voûte plus fermée. La bouche la plus sombre, la plus proche de la photo ;
  mais les parois ne se lisent plus et Xéros devient terne sous le voile.

**Mon avis.** V2, comme le pixel-artist. C'est la seule où l'on croit au tunnel sans perdre Xéros. Ce qui ne va pas encore, vu sur
les planches :
- vue 2 : la bouche se lit comme une entaille dans un mur de terre plus que comme « une bouche sombre sous les feuillages » ; le rideau
  est trop petit et fait des boules rondes. Il faudrait que les feuillages débordent largement la face, plus bas, avec des lianes ;
- vue 3 : sous la voûte, le voile transparent et la pénombre ensemble rendent la scène grise et Xéros terne, même en V2 ;
- vue 4 : la forêt du plateau, posée en grille lâche, est dense et gêne la lecture de la sortie ; le sol clair finit net contre le
  sentier brun ;
- la falaise le long de la rivière (5 m, tournée vers l'est) n'a toujours aucune largeur à l'écran : lèvre de broussailles, pied
  mouillé, ombre de 25 px. Même point faible que la planche A ;
- les arbres penchés sont des images du jeu cisaillées : il faudra les dessiner vraiment. Et dans le jeu, un arbre ne s'efface pas
  comme un toit aujourd'hui (voir 9.3).

### 9.5 Questions pour Grégoire (chemin creux)

12. **Le tracé** : le couloir nord-sud le long de la rivière, avec la rivière décalée de 7 m à la coupure (planche 1) ? Ou un couloir
    est-ouest sur la ligne du chemin d'aujourd'hui, en acceptant que la lèvre sud et ses feuillages (transparents quand Xéros est
    dessous) cachent le sol, et qu'on voie surtout la paroi nord ?
13. **La hauteur** : H5 (tout le plateau à 5 m, ma proposition), H6, ou H3 + talus de 2 à 3 m le long du chemin (la falaise de la
    rivière reste à 3 m) ? (9.3)
14. **La longueur** : 60 m (tout dans la zone `ferme`, 8,3 % à 5 m) ?
15. **La variante** : V1, V2 ou V3 ? Et pour la suivante : un rideau de feuillage plus grand et plus bas à la bouche ?
16. **Sous la voûte** : les feuillages transparents à 0,35 comme un toit, ou plus effacés encore (Xéros terne en V2 et V3) ?
17. **La pénombre du couloir** : tirée de la profondeur du creux (mon avis), ou un rectangle posé dans Tiled ? (9.3)
18. **La largeur du lit sec** : 3 m comme dessiné (la largeur du chemin), ou plus large ?
19. **La falaise de la rivière** : on la laisse presque invisible (lèvre et ombre), ou on la montre (rideaux de lierre qui pendent sur
    l'eau, face en raccourci comme A+) ?

---

## 10. Troisième essai : le chemin creux d'est en ouest (4 novembre)

Grégoire, sur l'essai 2 : « c'est magnifique, mais pas dans le bon sens ». Le principe est gardé, le tracé change. La question 12 est
tranchée : **est-ouest**, et le sol caché par le bord sud est accepté (il sert l'idée du tunnel). Gardés de l'essai 2 : le plateau
à 5 m, les talus de terre très sombre, le sol clair, l'ondulation, les arbres penchés. Le choix A/B et les questions 1 à 11 et 13 à 19
qui ne sont pas tranchées ici restent en suspens.

### 10.1 Le tracé et les valeurs (dessinés)

Sur la ligne du chemin d'aujourd'hui (zone `ferme`, rangées 65-66, l'ancien pont), une case = 1,6 m :

| Tronçon | Cases | Longueur | Sol | Parois |
| --- | --- | --- | --- | --- |
| Côté ferme | 60 → 47 | 20,8 m | 0 m (le niveau de la ferme) | deux talus plantés qui montent de 0 à 5 m (courbe douce) ; crête de 0,7 m, pente extérieure de 4,7 m pour 5 m |
| La rivière | 47 → 42 | 8 m | 0 m | aucune : ciel ouvert, l'eau s'arrête net de chaque côté du couloir |
| Côté plateau | 42 → 4,5 | 60 m | monte de 0 à 5 m (8,3 %) | de 5 m à 0 |

- **Longueur totale 88,8 m** ; tout tient dans la zone `ferme` (le bord ouest est à la case 0).
- **Largeur du sol 2,5 m** (à 12 cm près), l'axe ondule de ± 45 cm ; sur le dernier mètre de montée, il se resserre en sentier (0,9 m).
- Talus intérieurs : emprise au sol de 0,2 m + 0,2 × la hauteur (≈ 1,2 m pour 5 m).
- **La rivière reste droite**, sans décalage ni avancée.
- **Quand Xéros est dans le couloir**, le bord sud et ses feuillages s'effacent comme un toit : il en reste **0,2** (au lieu de 0,35 en essai 2).
- **Pénombre** : 0,3 au plus profond (la couleur de la pénombre du sous-bois), 0,18 au-dessus de l'eau. Ombre du rideau d'entrée : 0,42
  de plus sur le sol, 0,14 sous les autres feuillages en surplomb ; jamais sur Xéros.
- **La falaise le long de la rivière** : sa face est montrée en raccourci, une bande sombre de 12 px pour 5 m, et du lierre qui pend sur l'eau.

**À la coupure, ciel ouvert** (choix du pixel-artist, que je partage) : des parois de 5 m sur l'eau feraient une digue, et l'eau qui
s'arrête « comme par magie » ne se verrait plus. À ciel ouvert, le sol clair et les deux bords d'eau se voient. Le tunnel tient par les
arbres des deux rives, penchés, et par deux avancées de feuillage au-dessus du couloir.

### 10.2 Les planches (pixel-artist ; refaire : `npx tsx tools/essai-relief-creux3.ts`, 9 s)

Dessins : `art/proposals/relief-creux3.ts` (le rideau de feuillage de la bouche, la face en raccourci), `art/proposals/relief-creux3-scene.ts`
(un seul modèle de hauteur, cases 0 à 69, rangées 50 à 79) ; les matières de l'essai 2 (`relief-creux.ts`) sans changement. Une seule
variante ; chaque vue est cadrée sur l'écran de départ (427 × 240 px), x2, avec un détail x4.

| Planche | Ce qu'il faut regarder |
| --- | --- |
| `.art-preview/relief-creux3-1-ensemble.png` | Toute la scène à x1 avec les cadres des quatre vues, et dessous le plan des hauteurs (courbes tous les mètres, cotes du sol et des parois). De loin : la paroi nord sombre et les feuillages, le sol caché par le bord sud ; sur l'eau, le sol visible ; la falaise en bande sombre le long de la rive ouest. |
| `.art-preview/relief-creux3-2-entree.png` | Xéros sur le chemin de la ferme (case 62), face à l'entrée (case 60). Les talus plantés qui montent, le grand rideau (230 px de large, crête irrégulière, lianes) qui déborde sur les deux talus, la bouche sombre dessous. |
| `.art-preview/relief-creux3-3-avant.png` | Xéros case 50 (talus de 4,4 m) : le bord sud s'est effacé, on le voit net sur le sol clair. |
| `.art-preview/relief-creux3-4-coupure.png` | Xéros au milieu de la rivière, sur le sol sec : l'eau coupée net des deux côtés (liseré, miroitement), la falaise en raccourci avec son lierre, le bout du talus de la ferme, les feuillages qui ferment la voûte au-dessus de l'eau. |
| `.art-preview/relief-creux3-5-sortie.png` | Xéros case 7,4 (sol à 4,6 m) : le sol clair qui se fond dans le sentier, la forêt plus claire autour de la sortie. |

**Mon avis.** C'est le bon tracé, et les trois corrections demandées sont faites : une bouche sous un vrai rideau, Xéros net sous la
voûte, la falaise visible. Défauts vus sur les planches :
- **entrée** : les buissons du talus sud cachent une partie de la bouche, on ne voit le sol sombre qu'entre les lianes ; le sol clair
  ne « s'enfonce » pas encore assez visiblement dans le noir ; la crête du rideau reste un peu horizontale, en étagère ;
- **dans le couloir** : là où le bord sud s'efface, il ne reste qu'un aplat gris-vert uniforme, sur tout le tronçon visible et pas
  seulement autour de Xéros ; la pente extérieure sud du talus de la ferme est une grande surface aux touffes répétées ;
- **dessins provisoires** : les arbres penchés sont encore des arbres du jeu déformés ; le miroitement n'a qu'une image ; quelques pixels
  isolés dans le rideau ; les courbes du talus de la ferme, sur le plan, se lisent mal.

### 10.3 Ce que ce tracé demande au jeu (pour l'étape technique)

1. **Des hauteurs positives hors du plateau** : les talus de la ferme (de 0 à 5 m, avec leur pente extérieure). La hauteur n'est donc
   plus « plateau ou ferme » : c'est une hauteur par endroit (polygones ou courbes), ce qui penche vers H1 (calque `relief` de Tiled),
   avec des formes en pente et pas seulement des niveaux plats.
2. **Un sol de couloir en pente** (le `Slope` du cadrage), long de 60 m, dans un couloir de 2,5 m qui ondule.
3. **Le bord sud qui s'efface comme un toit** quand Xéros est dans le couloir, par tronçon, ses feuillages compris : le mécanisme des
   toits (`src/world/roofView.ts`, `src/systems/roofs.ts`) étendu au terrain et aux feuillages, avec un alpha de 0,2.
4. **Les faces est et ouest dessinées en raccourci** (la falaise de la rivière, 12 px pour 5 m) avec le lierre qui pend sur l'eau.
5. **La coupure de l'eau** : pas d'eau sur la largeur du couloir, une tuile de bord et un miroitement aux deux bords.
6. **La pénombre tirée de la profondeur du creux**, plus l'ombre des feuillages en surplomb, jamais sur Xéros.
7. **Des dessins nouveaux** (pixel-artist) : arbres penchés, rideau de la bouche, avancées de feuillage, talus, sol clair, miroitement animé.
8. **Les cartes** : le chemin de la ferme et les arbres qui le bordent (`ferme.tmj`, rangées ≈ 62 et ≈ 69, cases 47-60) sont posés sur
   les talus. À vérifier : les deux branches de la tempête (cases 68-70, rangées 60-61) sont hors du tracé ; le plan de la cabane
   (case 65, rangée 72) aussi.
9. **Les capacités** du cadrage (sections 2 et 3) ne changent pas, à la hauteur près : « Trop haute pour lui (5 m). » le long de la
   falaise et sur les flancs extérieurs des talus si on les veut infranchissables.

### 10.4 Questions pour Grégoire (essai 3)

20. **Les valeurs** : 21 m de talus côté ferme, 8 m sur l'eau, 60 m de montée (8,3 %), 2,5 m de large, 89 m en tout ?
21. **La coupure à ciel ouvert** (planche 4), ou des parois de 5 m qui continuent au-dessus de l'eau ?
22. **Les talus de la ferme** : Xéros peut-il monter sur leur pente extérieure (4,7 m pour 5 m, à peu près 45°) ? Ma proposition : non,
    comme la falaise (« Trop haute pour lui »), pour que le seul passage reste le couloir.
23. **L'effacement** : tout le tronçon visible du bord sud (planche 3), ou seulement autour de Xéros ?
24. **L'entrée** : enlever les buissons du talus sud devant la bouche, et faire descendre le sol clair plus loin dans le noir ?

---

## 11. Quatrième essai : le tunnel continu au-dessus de la rivière (4 novembre)

Correction de Grégoire : **le chemin creux ne passe jamais dans l'eau.** Sur les 8 m de la rivière (cases 47 → 42), le couloir
continue exactement la partie côté ferme : mêmes talus de 5 m, mêmes parois, même voûte, même sol à 0 m, sans tronçon à ciel
ouvert. Le tunnel a un début (case 60, sur la ferme) et une fin (case ≈ 4,5, sur le plateau), et il est continu de bout en bout. La
rivière, droite, s'arrête contre les flancs extérieurs des talus. La question 21 (le ciel ouvert) est tranchée : non.

**Ce qui a changé dans le modèle** (pixel-artist ; `art/proposals/relief-creux4-scene.ts`, refaire : `npx tsx tools/essai-relief-creux4.ts`) :
- sur l'eau, les talus font 5 m des deux côtés, avec la même paroi et le même talus intérieur que sur la ferme ; deux avancées de feuillage
  au-dessus du couloir remplacent celles de l'essai 3 ;
- les flancs extérieurs sont plus raides sur l'eau (crête de 30 cm, pente de 1,1 m pour 5 m) que sur la ferme (crête de 70 cm, 4,7 m
  pour 5 m), pour que l'eau vienne contre eux ; le passage de l'un à l'autre se fait sur les 3 premiers mètres de la rive est ;
- à la case 42, les talus rejoignent la falaise du plateau à la même hauteur et dans la même forme, sans couture ; ailleurs la falaise garde
  sa face en raccourci (12 px pour 5 m) et son lierre ;
- l'eau s'arrête là où le flanc extérieur arrive à 0 : un liseré mouillé, puis deux rangées de miroitement, au nord comme au sud ;
- le bord sud s'efface sur la largeur de l'écran autour de Xéros (au lieu de tronçons fixes).
Les valeurs ne changent pas : 20,8 m côté ferme, 8 m sur la rivière, 60 m de montée (8,3 %), 88,8 m en tout, 2,5 m de sol, effacement 0,2,
pénombre 0,3.

| Planche | Ce qu'il faut regarder |
| --- | --- |
| `.art-preview/relief-creux4-1-ensemble.png` | Le couloir continu de la case 60 à la case 4,5 : la paroi nord et la voûte passent la rivière sans interruption, l'eau bute contre les flancs au nord et au sud. Dessous, le plan des hauteurs coté. |
| `.art-preview/relief-creux4-4-coupure.png` | Xéros case 44,5, au-dessus du lit de la rivière, dans le couloir : le bord sud effacé, aucune eau dans le couloir ; le détail du bas montre la coupure sud (le pied du flanc dans l'eau, le liseré, le miroitement). |

**Défauts vus :**
- la coupure nord ne se voit pas quand Xéros est au milieu : le talus de 5 m (100 px) la cache, comme le bord sud cache le sol ; seule
  l'eau au-delà paraît en haut de l'écran. Les deux coupures ne tiennent pas ensemble dans les 240 px de l'écran. C'est la projection, pas
  le dessin : la coupure nord se voit de loin, en arrivant ;
- la coupure sud n'occupe qu'une bande d'environ 30 px en bas de l'écran ;
- le flanc sud au-dessus de l'eau est rendu par de l'herbe étirée en traînées verticales : il lui faut une vraie matière de flanc planté
  (terre sombre, racines, pied mouillé) ;
- de l'essai 3 : le motif de touffes répété sur les talus de la ferme, l'aplat gris-vert dans la zone effacée, les arbres penchés cisaillés,
  le miroitement à une seule image.

**Ce que le jeu devra savoir faire** : comme en 10.3, avec en plus des talus qui portent leur hauteur au-dessus de l'eau (l'eau
s'arrête à leur pied : la coupure suit le pied du flanc, pas une ligne droite), et sans tronçon à ciel ouvert.

**Question 25.** Le flanc sud au-dessus de l'eau : une matière de flanc planté (terre sombre, racines, lierre jusqu'à l'eau), comme la
falaise ? C'est le dessin qui manque le plus sur la planche de la coupure.

---

## 12. Cadrage technique de l'implémentation (4 novembre)

Grégoire a validé l'essai 4 (« parfait, on peut implémenter ») et répondu à toutes les questions 1 à 25 ; ses réponses font foi et ne
sont pas reprises ici. `origin/main` (la petite carte, maison-2) est déjà fusionné dans `relief` (c7d5a6d). Le seul conflit était
CADRAGE.md, que la petite carte avait aussi créé : celui du relief est gardé, celui de la petite carte reste dans l'historique
(b99f4c1). Les faits ci-dessous sont lus dans ce code fusionné.

### 12.1 Faits qui décident de la technique

- **Le rendu.** Tout dépend de `DEPTH` (`src/config.ts:48` : sol −1, décors −0,9, plancher −0,8, ombres −0,7, voile 90 000) et de la
  règle « profondeur = y des pieds ». Le sol est **un seul calque de tuiles** (`GameMap.ts:358`). Il n'existe pas d'aide commune pour la
  profondeur : une soixantaine d'endroits, dans environ 25 fichiers, posent une image au sol avec leur propre `setDepth(y)`. Seules les
  pièces bâties portent déjà une hauteur à l'écran (`buildLook` de `world/buildView.ts:76` : `y − z`).
- **Xéros** est un `Arcade.Sprite` (`entities/Actor.ts`) dont le corps ne couvre que les pieds (10 × 8 px). Le décaler à l'écran
  déplacerait aussi le corps, et des dizaines de lectures de `actor.x/y` le prennent pour ses pieds dans le monde.
- **La souris** ne devient un point du monde qu'à deux endroits : `cursor()` de `input/PlayerInput.ts:263`, d'où tout le reste découle
  (`player.cursor`, `aimProbe`, la visée du lancer, le fantôme de pose), et le mode construction (`systems/build.ts:96`, `:203`).
- **Les toits.** `systems/roofs.ts` fait passer un toit à `ROOF.alpha` (0,35) en 250 ms. Un effacement par région existe déjà :
  `splitRoofs` double l'image, masque l'original hors d'un rectangle et fait passer la copie dans le rectangle (`windowHole` de
  `world/roofView.ts`). Le rectangle est fixe, posé autour d'une pièce. Ombre fixe : `roofShadow` (un parallélogramme, `SHADOW`).
- **La pénombre** (`world/gloom.ts`) et le jour (`systems/daylight.ts`) sont des voiles au-dessus de tout, Xéros compris.
- **Les déplacements.** Xéros entre en collision avec les tuiles `solid` (l'eau et la clôture, `tiles.json`) et avec les obstacles
  (`WorldScene.ts:312`). `areaFree` (`GameMap.ts:446`) est le seul test de place libre (poses, roulement, lapins, lancer, arrivée).
  Rien ne connaît une hauteur ni « d'où l'on vient ».
- **Les lapins** cherchent leur chemin en A* sur des cases de 40 cm (`world/creature.ts:128`), dont la case seule est testée
  (`blocked(x, y)` = `!areaFree`, `systems/creatures.ts:98`).
- **Le lancer** (`world/throw.ts`) lâche à 1,6 m et retombe à z = 0. Il s'arrête à ce qui n'est pas libre, donc aujourd'hui à l'eau
  (`WorldScene.ts:770`). Ce qui retombe dans l'eau est posé à côté (`layNear`, `hands.ts:444`).
- **Les cartes.** `tools/build-maps.ts` lit les objets de tous les calques sans regarder leur nom, et **refuse les polygones**
  (`:226`). `MapSchema` (`types.ts:1673`) n'a pas de champ de hauteur. Une carte d'intérieur passe aussi par `GameMap`, sans hauteur.
- **La rivière** dans la zone `ferme` occupe les cases 38 à 47. Le pont est aux cases 41-47, rangées 65-66. L'étang est dans la ferme,
  31 tuiles, cases 79-86, rangées 45-49.
- **Le tracé est libre** : sur l'emprise du couloir et de ses talus (cases 4 à 60, rangées ≈ 60 à 71), il n'y a que des arbres et des
  buissons de la forêt et un rocher (case 37). Les branches de la tempête (cases 67,9 et 70,2, rangées 60-61) et le plan de la cabane
  (case 65, rangée 72) sont à l'est de l'entrée (case 60) : **rien à déplacer**. Les arbres qui bordent le chemin côté ferme (cases
  47,8 à 54, rangées ≈ 59,5-62 et 69,5) se retrouvent sur les talus et y restent.
- **Aucun test** ne passe le pont ni ne parle de la rivière (`tools/test-*.ts`). `SAVE_VERSION` = 30.

### 12.2 La hauteur : `src/world/relief.ts` (sans Phaser) et le calque `relief` de Tiled

- **Dans Tiled**, un calque d'objets `relief` dans les cartes qui ont du relief, avec trois sortes de formes (en cm) :
  - `Level` (polygone, `height`) : un niveau plat, ici le plateau à 500, son bord est collé à la rive ouest case par case ;
  - `Ridge` (polyligne, `heights` sommet par sommet, `crest`, `flank`) : un talus en long, dont la crête suit la polyligne à la hauteur
    interpolée et dont le flanc extérieur descend à 0 sur `flank` (470 sur la ferme, 110 au-dessus de l'eau, par sommet) ;
  - `Lane` (polyligne, `heights` sommet par sommet, `width` 250, `inner`) : le couloir creusé dans ce qu'il traverse ; son sol est à la
    hauteur interpolée le long de l'axe (0 sur la ferme et sur l'eau, puis 0 → 500 sur 60 m), son talus intérieur (20 + 0,2 × h cm)
    raccorde le sol à ce qui l'entoure.
  - Une zone entièrement haute (les quatre de la forêt profonde) a une propriété de carte `height` (500), la hauteur de fond.
- **Composition** : la hauteur d'un point = le plus haut des `Level` et `Ridge` qui le couvrent (ou la hauteur de fond), puis le
  `Lane` creuse (le plus bas des deux). Une seule fonction, déterministe, testée.
- **`build-maps`** accepte les polygones et polylignes du seul calque `relief`, vérifie chaque forme (fermée, hauteurs en cm, propriétés
  connues) et l'écrit dans `MapData.relief` (`ReliefSchema` dans `types.ts`, `validate.ts` : un `Level` sur l'eau est refusé, sauf
  sous un `Ridge`). Le jeu ne lit jamais Tiled.
- **`relief.ts`** rastérise les formes d'une carte une fois, à son chargement, en cases de 40 cm (≈ 250 000 cases pour une zone,
  avec un cache par carte), et donne :
  - `heightAt(map, x, y)` (cm, interpolé) ;
  - `liftAt(map, x, y)` (px à l'écran = hauteur / 5) ;
  - `step(map, from, to, mobility)` : le passage d'un point à l'autre est permis, ou refusé (`up`, `down`, `swim`) avec sa hauteur ;
  - `pick(map, sx, sy)` : le point du monde vu sous un point de l'écran (12.5).
  - Une carte sans relief (un intérieur) a partout une hauteur de 0, sans coût.

### 12.3 Monter, descendre, nager : `mobility.json` et `entities/Mobility.ts`

- **`src/content/mobility.json`** (`MobilitySchema`) : `step` 50 (monter et descendre sans y penser), `drop` 100 (sauter pour
  descendre), `slope` (la pente qu'il monte en marchant, question A), `swim` false. Composant `Mobility` attaché à `Player`, comme
  `Strength`. ?dieu : une case « escalade » qui lève `step` et `drop` (comme la force surhumaine, pour vérifier que seul le personnage
  limite).
- **La règle**, dans `step()` : sur le trajet, ce qui est plus raide que `slope` compte comme une marche, de sa hauteur totale (on suit
  la partie raide jusqu'au bout). Une marche qui monte de plus que `step` est refusée ; une marche qui descend de plus que `drop` est
  refusée ; de 50 cm à 1 m en descente, c'est un saut, permis. Le couloir (8,3 %) se marche ; la falaise et les flancs (≈ 100 %)
  font 5 m.
- **L'eau** : la tuile d'eau perd `solid` et prend `deep` (`tiles.json`, `TerrainDefSchema`, `build-art.ts`). Elle ne bloque plus par
  elle-même : `step()` refuse d'y entrer quand `swim` est faux. Une pose reste refusée dans l'eau profonde (`areaFree`).
- **Où la règle s'applique** : à chaque pas de la physique (`worldstep` d'Arcade), du point des pieds d'avant au point d'après. Un
  pas refusé ramène Xéros au dernier point permis et le laisse glisser le long de l'obstacle (l'autre axe), comme une collision. C'est
  le principe du franchissement (`crossing.ts` : on teste depuis le pas d'avant, jamais à la position de l'instant). Plusieurs pas de
  physique par image restent donc justes sur une machine lente.
- **Les phrases** : « Trop haute pour lui (5 m). » (la hauteur de la marche, arrondie : « 1,2 m ») et « Il ne sait pas nager. »,
  par `Notice`, une fois par appui, construites comme `heavyNotice` (`systems/weight.ts`).
- **Les lapins** : `mobility` dans leur entrée de `creatures.json` (`step` 30, `drop` 60, `slope` comme Xéros, `swim` false).
  `Surroundings` prend `passes(from, to)` ; l'A* et `advance()` testent le passage d'une case à l'autre, pas la case seule. Aucune
  garenne n'est près du couloir ; rien à déplacer.
- **Les autres actions** :
  - **Le lancer** : lâché à `heightAt(Xéros)` + 1,6 m. L'objet retombe quand il passe sous le sol survolé, et il s'arrête au pied
    d'une face plus haute que lui. Il passe au-dessus de l'eau (l'eau n'arrête plus le vol) et, s'il y retombe, il est posé sur la rive
    la plus proche (`layNear`, inchangé). `angleFor` reçoit la différence de hauteur. Une cible est touchée au-dessus de son sol.
  - **Le roulement** : une bille s'arrête au bord d'une marche plus haute que `step` (« la bille s'arrête au bord »).
  - **L'arbre** abattu par-dessus le bord reste au niveau de son pied (son image est soulevée de la hauteur du pied, sa collision ne se
    pose que là où il touche ce sol).
  - **Une pose** (et une pièce en mode construction) est refusée à cheval sur une marche ou dans l'eau profonde, et posée à la
    hauteur du sol de son ancrage. Le message dit la marche.
  - **Les sorties de zone** : la hauteur se recalcule au point d'arrivée (les zones sont continues, rien à faire).
- **La vraie chute** (de l'arbre, de la bille, de Xéros dans l'eau) : listée comme limite en attente (CONCEPTION).

### 12.4 Le rendu en projection A

Tout ce qui est à une hauteur h se dessine h / 5 px plus haut. **Rien ne bouge dans le monde** : `x/y` restent les pieds, seule
l'image monte.

- **Une aide unique**, `src/world/lift.ts` : `lift(obj, map)` règle l'origine d'affichage (`displayOriginY` + la hauteur en px) au lieu
  de `y`. Le point du monde, la profondeur et le corps restent justes. Pour `Actor`, le décalage du corps (`body.offset`) compense,
  recalculé à chaque image dans `Actor.preUpdate`, là où la profondeur l'est déjà. Les endroits qui posent une image au sol l'appellent :
  - `GameMap` : objets, objets au sol, tas, pièces bâties (avec `buildLook`, qui ajoute le sol à leur `z`), fumée, lueurs ;
  - les acteurs, `Hold`, `ToolUse`, `Breath`, `WorkBar`, les invites (`InteractionSystem`) ;
  - les créatures ;
  - les systèmes `harvest`, `wood`, `combat`, `site`, `ghost`, `hands`, `build`, `longPress`, `pileCount`, `parcels`, `turnLog` ;
  - le vol du lancer (`WorldScene` : déjà `y − z`, avec z devenu absolu) ;
  - `zoneBand`, `interiorView`, `buildingFloor`, `jointView`.
  La liste exacte vient d'un `grep` de `setDepth(` et de `add.image(` / `add.sprite(`. `tools/test-keys.ts` gagne une règle : pas de
  `setDepth(` d'une image du monde hors de `lift.ts` et de ses appelants connus.
- **La caméra** suit l'image (`setFollowOffset(0, −lift)` à chaque image). Ses bornes s'étendent de 100 px au nord (`zones.cameraBounds`).
- **Le sol** :
  - les cases à 0 m restent dans le calque de tuiles d'aujourd'hui ;
  - **un second calque** porte les cases du plateau plat (500), posé 100 px plus haut ; chaque case est vide dans l'un des deux ;
  - **le terrain qui varie** (le bord de la falaise, le couloir, les talus) est rendu par `world/terrainView.ts` dans des textures par
    morceaux de 512 px, construites au chargement de la carte et seulement là où la hauteur varie. Les colonnes sont peintes du nord au
    sud à `y − h/5` (la méthode de la planche A) et les faces sud remplissent les trous ;
  - ce terrain est découpé en bandes de 2 rangées du monde, chacune à la profondeur de son bord sud (la méthode des `sideSlices` des
    murs). Ainsi la paroi nord passe derrière Xéros, et le bord sud du couloir devant lui, comme sur les planches.
- **Les faces** :
  - les faces sud en vraie grandeur (la paroi nord du couloir, les flancs) ;
  - les faces est et ouest en raccourci (12 px pour 5 m : la falaise, avec la lèvre et le lierre qui pend sur l'eau, et les flancs
    au-dessus de l'eau) ;
  - leurs matières viennent des dessins du pixel-artist, collées le long des bords que donne `relief.ts`.
- **L'ombre** de la falaise et des talus est calculée comme celle des toits (`SHADOW`, fixe : 25 px vers l'est et 10 px vers le sud
  pour 5 m), dessinée en `DEPTH.shadow` sur le terrain plus bas.
- **L'effacement sous la voûte** : quand les pieds de Xéros sont dans un `Lane` dont le bord sud le cache, les bandes du terrain au sud
  de lui et les feuillages qui le surplombent passent à 0,2, dans un rectangle de la largeur de l'écran autour de lui (la méthode
  `windowHole` et `splitRoofs` des toits, avec un rectangle qui suit Xéros au lieu d'un rectangle fixe). Les objets du talus sud dans ce
  rectangle (arbres, rideau, avancées) passent entiers à 0,2. Code : `world/roofView.ts` (le rectangle), `systems/roofs.ts` (le fondu),
  `ROOF.lane` (0,2) dans `config.ts`.
- **La pénombre du couloir** se tire de la profondeur du creux (0,3 × profondeur / 5 m), plus l'ombre des feuillages qui le
  surplombent. Elle est **cuite dans le terrain** (les bandes du sol et des parois), jamais un voile au-dessus : Xéros reste net.
- **Les coupures** : `ferme.tmj` ne porte plus d'eau sous les talus ; les tuiles de bord de l'eau suivent le pied du flanc ; un objet
  plat `water-cut` (liseré mouillé) et un objet plat animé `shimmer` (4 images) sont posés dans Tiled le long de chaque coupure.
- **La bande des zones voisines** (`zoneBand.ts`) prend le même rendu (le plateau d'une voisine apparaît soulevé). La petite carte ne
  change pas (le plateau a sa couleur de tuile) : à dire si tu la veux ombrée.
- **La souris** : `pick(map, sx, sy)` cherche, sur la verticale de l'écran, le point du monde le plus au sud dont l'image passe là
  (y − h/5 = sy). C'est le premier visible, celui qui est devant. On l'applique dans `cursor()` (`PlayerInput.ts`) et dans les deux
  conversions du mode construction : tout le reste suit.

### 12.5 Les cartes (étape 3)

Un outil jetable, `tools/relief-cartes.ts`, rangé ensuite dans `.poubelle/tools/relief-cartes.ts`. Les .tmj font foi après lui.
- Dans les quatre zones de la rivière (`bois-du-nord`, `ferme`, `bois-du-sud`, `bois-de-la-riviere`), il pose un calque `relief` avec
  un `Level` à 500 tracé depuis le bord ouest de l'eau, case par case. Les quatre zones de la forêt profonde reçoivent `height` 500.
- Dans `ferme.tmj` :
  - le `Lane` (cases 60 → 4,5, sur l'axe des rangées 65-66, qui ondule de ± 45 cm) et les deux `Ridge` (nord et sud, cases 60 → 42) ;
  - le pont remplacé par le sol clair ; l'eau sous les talus remplacée par de la terre, les tuiles de bord de l'eau recalculées par le
    même calcul de bords que l'esquisse ;
  - les objets des coupures et le rideau de la bouche ;
  - le sol clair (tuiles `lane-floor`) sur tout le couloir, raccordé au chemin de terre aux deux bouts.
  Les dessins du pont restent dans `art/`, leurs numéros dans le registre ; ses lettres sortent de `sketch-legend.json`.

### 12.6 Les dessins (étape 5, après ton accord, par le pixel-artist)

Ceux que tu as listés : matière des talus plantés (tuiles autoassemblées, sans motif répété), flanc au-dessus de l'eau, face de la
falaise en raccourci et sa lèvre, sol clair en variantes et son raccord au chemin, rideau de la bouche et avancées de feuillage, arbres
penchés, liseré, miroitement en 4 images. Chacun a sa fiche dans `docs/objets/`. Planches x2 et x4 avec Xéros, dans le vrai jeu dès
que le rendu de l'étape 4 marche (une capture en jeu vaut mieux qu'un essai hors jeu). En attendant, l'étape 4 se fait avec les
matières provisoires des essais, qui ne s'intègrent pas.

### 12.7 Les tests

- **`tools/test-relief.ts`** (dans `test:fast`), sans navigateur :
  - `heightAt` sur les formes (niveau, talus, couloir, composition) et sur les vraies cartes : 0 sur la ferme, 500 sur le plateau,
    le profil du couloir de bout en bout, jamais d'eau sous le sol du couloir ;
  - `step` : 50 cm passent, 1 m se saute en descente et pas en montée, 1,2 m est refusé, 5 m aussi, l'eau est refusée sans nage ;
    le couloir passe de bout en bout ; le flanc est refusé depuis la ferme ;
  - `pick`, l'inverse de la projection ;
  - le lancer vers le haut et vers le bas, au-dessus de l'eau ;
  - le chemin d'un lapin, qui ne prend que le couloir ;
  - une pose à cheval sur une marche, refusée.
- **`npm run test:relief`**, un scénario dans le vrai jeu, depuis une partie neuve, ajouté à `SCENARIOS` :
  - de la ferme au plateau par le couloir, puis le retour ;
  - le refus au pied de la falaise et sur les flancs des talus, avec « Trop haute pour lui (5 m). » ;
  - le refus au bord de la rivière et de l'étang, avec « Il ne sait pas nager. » ;
  - la marche de 50 cm, le saut de 1 m, le refus au-delà (sur des marches du couloir ou un `Level` d'essai) ;
  - aucune tuile d'eau sous Xéros de tout le couloir.
- **`test:contrats`** : à l'escalade maximale (?dieu), la falaise se monte (seul le personnage limite) ; à la sienne, le refus dit
  « pour lui ».
- Gardés à jour : `test-paysage` (la forêt du plateau intacte, aussi en hauteur), `test-roofs` (le fondu du couloir), `test-minimap`,
  `test-monde`.

### 12.8 L'ordre et les arrêts

1. Ce cadrage, puis l'attente de ta réponse. **C'est le seul arrêt avant les dessins.**
2. La logique sans dessin : `relief.ts`, `mobility.json`, `Mobility`, la règle de pas, la nage, les phrases, les lapins, le lancer, le
   roulement et les poses, puis `test-relief` (des cartes d'essai dans le test).
3. Les cartes, par l'outil jetable.
4. Le rendu A avec les matières provisoires : soulèvement, sol en deux calques, terrain par morceaux, faces, ombres, effacement,
   pénombre, coupures, souris, caméra, bande des zones.
5. Les dessins (planches en jeu, notification, « DESSIN À VALIDER », attente de ton accord) ; puis leur intégration.
6. Les scénarios et les contrats.
7. La documentation : CONCEPTION « Le relief » (le chemin creux, les capacités, la vraie chute en limite), « Le monde » corrigé (le
   pont), CLAUDE.md (une ligne), README, COMMANDES si ?dieu change.
8. `SAVE_VERSION` : je charge une sauvegarde d'avant, avec Xéros sur l'ancien pont. S'il s'y retrouve libre dans le couloir, rien ne
   change ; sinon, je passe à 31.
9. La fusion : `origin/main` fusionné à nouveau, `npm run build`, la suite complète des scénarios, `test:contrats` sur le dernier
   commit, puis la fusion dans main et le push.

**Le coût et le risque** : c'est le plus gros chantier du moteur depuis le mode construction. Le risque est dans l'étape 4 : le
soulèvement touche tous les endroits qui posent une image, et la suite complète des scénarios dira si l'un a été oublié. Les étapes 2
et 3 ne changent rien à l'écran.

### 12.9 Questions qui restent ouvertes

A. **La pente de marche** (`slope` de `mobility.json`). Sans elle, un défaut : à l'entrée côté ferme, les talus ne font que quelques
   dizaines de centimètres, Xéros y monte en un pas, puis il suit la crête (≈ 24 % sur 21 m) jusqu'au plateau, par-dessus le couloir.
   Ma proposition : `slope` 20 %. Le couloir (8,3 %) se marche ; ce qui est plus raide compte comme une marche, de toute sa hauteur
   (« Trop haute pour lui (2,3 m). » à mi-crête). Une alternative est une crête trop étroite pour lui (30 cm), mais ce serait une
   règle de forme, pas une capacité.
B. **Les arbres penchés** : un arbre est un objet complet (abattre des deux côtés, chute, ébranchage, tout dessiné) ; un arbre penché
   serait une troisième sorte, avec tous ses dessins. Ma proposition : la voûte se fait avec les avancées de feuillage et le rideau
   (des dessins du terrain du couloir, pas des objets) et les arbres ordinaires sur les lèvres ; un arbre penché qu'on abat viendrait
   plus tard (une limite listée, « en attente d'un dessin »). Sinon : de vrais arbres penchés abattables dans ce chantier (beaucoup de
   dessins de plus).
C. **Le rideau et les avancées** : des dessins du terrain du couloir, placés par `relief.ts` le long du `Lane` (ma proposition, ils ne
   se coupent pas), ou des objets posés dans Tiled, qui auraient alors un jour une récolte ?

### 12.10 Réponses de Grégoire (4 novembre)

- A : oui, `slope` 20 % dans `mobility.json`, une capacité de Xéros ; ce qui est plus raide compte comme une marche de toute sa hauteur.
- B : oui, la voûte avec le rideau, les avancées et les arbres ordinaires au bord des talus ; l'arbre penché abattable est une limite
  listée. **Condition** : la voûte doit se refermer au-dessus du couloir autant que sur l'essai 4 ; sinon, le dire, et les arbres
  penchés reviennent dans le chantier.
- C : le rideau et les avancées sont **des objets dans Tiled**, posés automatiquement le long du tracé par l'outil jetable. Leur
  récolte n'est pas pour ce chantier (limite listée), mais leurs données doivent la permettre plus tard.

### 12.11 Accord de Grégoire sur les dessins définitifs (4 novembre)

Les planches `relief-final-1` à `6` sont validées, avec deux corrections, passées par le pixel-artist sur une planche à part
(`relief-final-7-corrections.png`, avant et après) :
1. **Côté ferme (cases 47 à 60), le flanc extérieur des talus redevient un talus planté**, comme à l'essai 4 (herbe, broussailles,
   végétation sur une pente). La terre sombre, avec ses racines et son lierre, reste pour les parois intérieures du couloir, le flanc
   au-dessus de l'eau et la falaise. Le passage d'une matière à l'autre se fait sur les premiers mètres de la rive est, comme le
   changement de pente.
2. **Le sol du couloir reste clair, presque blanc, aussi dans la pénombre** ; la pénombre du reste ne change pas.

Les vues tournées (`-r1` à `-r3`) du rideau et des avancées ne servent pas : le couloir est est-ouest. Elles vont dans `VIEWS_TODO`
avec cette raison.

Après l'accord sur la planche des corrections : intégrer tous les dessins, refaire les captures en jeu (`relief-jeu-*.png`), puis la
fusion prévue ; le récapitulatif donne le temps de chargement d'une zone avec relief comparé à main.

### 12.12 Les deux corrections : à revoir avec Grégoire (4 novembre)

Grégoire hésite : il trouve la version d'avant presque mieux, et on reverra ça en détail plus tard. **Ce sont les dessins d'avant
(`relief-final-1` à `6`) qui sont intégrés**, sans les deux corrections. Les corrections restent dans `art/proposals/` : le flanc
planté côté ferme (`relief-face-planted*`), le sol éclairci et `FLOOR_GLOOM` (le sol ne reçoit que 20 % de la pénombre), dans
`art/proposals/relief-final.ts` et sa scène ; planche `relief-final-7-corrections.png` ; côté jeu, la règle de matière est prête
(`plantedAt` de `src/world/relief.ts`, testée, pas encore utilisée par le rendu). **À revoir avec Grégoire.**

---

## 13. L'intérieur du tunnel : un trou rond en gradins dans la terre (4 novembre, plans seulement)

**Le relief est déjà dans main** (fusion ce4e6d2) avec ses dessins d'avant ; **cette forme sera un chantier à part**. Cette section
ne contient que des plans en aplats (`.art-preview/relief-plans.png`) : aucun dessin définitif, **rien ne change dans le jeu**, et le
moteur (les hauteurs, la marche, le saut, la nage, les refus) reste tel quel. Les plans précédents sont gardés : les deuxièmes, le
trou rond aux parois lisses, « presque parfaits » pour Grégoire (13.6, `art/proposals/relief-plans-v2.png`) ; les premiers, la mauvaise
forme à deux talus (13.7, `art/proposals/relief-plans-v1.png`).

### 13.0 Les plans en gradins validés, deux corrections (4 novembre)

**Grégoire valide les plans en gradins.** Réponses : **37**, oui, 4 marches de 1,25 m ; **38**, oui, de petits arbres et des buissons
sur les gradins, les grands sur le dessus, abattables plus tard ; **39**, oui, un chantier à part. **Deux corrections**, qui priment
sur ce qui suit (13.1 à 13.4 et la planche `relief-plans.png` les montrent encore à l'ancienne) :

- **Les arbres sont droits**, pas penchés au-dessus du chemin. **Ce sont les étages d'arbres, les uns au-dessus des autres, qui
  referment le cercle** : chaque rangée pousse droit sur son gradin, et sa couronne monte devant la marche et le gradin du dessus.
- **Chaque gradin n'a que la place d'un tronc** : une seule rangée d'arbres par gradin, alignée le long du chemin. **La profondeur
  des gradins passe de 1 m à 50 cm** : 1 m laissait la place de deux rangées, 50 cm ne porte qu'un tronc (15 à 20 cm) et ses
  racines au bord de la marche. Le trou s'ouvre alors sur **5,5 m** en haut (2,5 m de chemin et 1,5 m de gradins de chaque côté), le
  diamètre du cercle des deuxièmes plans ; le cercle qui passe par les bords du chemin et le bord du dessus a son centre à 3,1 m
  au-dessus du chemin et son haut à 6,4 m, que les couronnes du gradin 3 et du dessus atteignent sans se pencher. À l'écran
  (côté ferme), les gradins nord tombent aux lignes −50 / −60 (gradin 1), −85 / −95 (gradin 2) et −120 / −130 (gradin 3) depuis les
  pieds : **les trois gradins nord entrent dans l'écran**, la marche 4 et le dessus sont juste au-dessus.

**Les essais de dessins** (pixel-artist, hors jeu, rien ne change dans le jeu) : les matières une par une en x4 avec Xéros (le dessus
du gradin, la contremarche de 1,25 m avec racines et lierre, la terre en coupe, le sol clair du chemin, les petits arbres des
gradins et les buissons, droits, dans leurs vues) ; les scènes du joueur en x2 au zoom de départ (côté ferme, au-dessus de la
rivière, à la bouche est) ; la vue d'ensemble du tunnel de la ferme au plateau, vue de dehors ; la bouche est vue depuis la ferme.
Planches `.art-preview/relief-gradins-*.png` (`npx tsx tools/essai-relief-gradins.ts`).

**Les essais (4 novembre, pixel-artist, à valider)** : `.art-preview/relief-gradins-1-matieres.png` (les matières en x4, les plantes
dans leurs vues : noisetier, jeune frêne et églantier ronds, une vue ; le buisson long symétrique, deux vues), `relief-gradins-2-scenes.png`
(côté ferme, au-dessus de la rivière, à la bouche est, en x2 au zoom de départ), `relief-gradins-3-ensemble.png` (le tunnel vu de
dehors), `relief-gradins-4-bouche.png` (le fer à cheval vu depuis la ferme) ; refaire : `npx tsx tools/essai-relief-gradins.ts`
(art/proposals/relief-gradins.ts, relief-gradins-scene.ts). Les 50 cm se lisent à l'écran : un gradin fait 10 px, une marche 25 px.

40. **Vers le plateau**, le chemin monte de 0 à 5 m et le trou s'aplatit : sur la planche, les quatre marches rapetissent ensemble
    (trois rangées d'arbres jusqu'au bout), mais sous 1 m une marche devient franchissable et Xéros pourrait sortir du trou par les
    côtés. *Autre façon* : les marches du bas s'enterrent une à une (une rangée d'arbres de moins à chaque fois). *Recommandation :
    s'enterrer une à une*, le chemin reste le seul passage.
41. **La vue d'ensemble** : vus de dehors, les grands arbres du dessus sud cachent les gradins ; deux sur trois sont retirés sur la
    planche pour voir dedans. Dans le jeu, en garder autant que sur le dessus nord ? *Recommandation : oui*, le joueur voit le dedans
    par la transparence du sud quand il y est.

### 13.1 La forme : ce que j'ai compris (les gradins)

Tout ce qui avait été compris du trou rond tient toujours : **une masse de terre au dessus plat, à 5 m au-dessus du chemin, dans
laquelle on a creusé un trou rond** ; le chemin plat et clair au fond (2,5 m) ; la rivière qui s'arrête contre les deux faces de la
masse et n'entre jamais dans le trou ; la bouche est ouverte dans une face de terre, la bouche ouest à fleur du plateau. **Une seule
chose change, les parois.**

- **Les parois ne sont pas lisses : elles descendent en demi-escalier.** Du dessus de la terre jusqu'au chemin, une suite de
  **gradins** : une marche de terre (la contremarche, une face presque droite), un replat (le gradin), une marche, un replat, et ainsi
  jusqu'au chemin. Les deux parois, au nord et au sud, sont pareilles.
- **Chaque gradin est planté.** Il n'y a pas seulement des arbres en haut, sur le dessus : **à chaque niveau**, sur chaque replat,
  des deux côtés, de petits arbres et des buissons ; sur le dessus, les grands arbres.
- **Tous ces arbres se penchent au-dessus du chemin**, ceux du bas comme ceux du haut. **Les racines et le lierre pendent d'un
  gradin à l'autre** : du bord de chaque replat, ils couvrent la marche qui descend au replat du dessous.
- **Le cercle, c'est l'ensemble.** Sa moitié basse est la terre en gradins (les nez des marches s'alignent sur sa courbe) ; sa
  moitié haute, ce sont les houppiers penchés de tous les étages, qui se rejoignent au-dessus du chemin. **Ce sont les gradins et
  leur végétation qui referment le cercle** (réponse de Grégoire à la question 36) : il n'y a plus de lèvres de terre lisses, et le
  ciel ne passe qu'entre les feuilles.

**Ma proposition de mesures** (à régler au dessin, question 37) : **4 marches de 1,25 m** de chaque côté, donc **3 gradins plantés
et le dessus**, 4 niveaux d'arbres. Une marche de 1,25 m arrive à la poitrine de Xéros (1,70 m) : c'est plus que son saut (1 m),
il ne monte pas sur les gradins, le chemin reste un chemin. Chaque gradin a **1 m de profondeur** : la place d'une rangée de
petits arbres (tronc de 15 à 20 cm, 3 à 4 m de haut : noisetier, jeune frêne) et de buissons. En haut, le trou s'ouvre sur 8,5 m
(2,5 m de chemin et 3 m de gradins de chaque côté). Le cercle qui passe par les bords du chemin et par le bord du dessus a 8,7 m de
diamètre (centre à 4,15 m au-dessus du chemin) : les houppiers le ferment vers 8,5 m de haut, ce qu'atteignent les grands arbres du
dessus, penchés.

**Ce que cela change, et ce que cela ne change pas.** Le moteur ne change pas : une hauteur par point, comme le plateau (chaque
gradin est un replat à sa hauteur, chaque marche une marche trop haute pour Xéros, et le refus déjà écrit le dit : « Trop haute pour
lui »). **Les formes de la carte** changent : de chaque côté du chemin (`Lane`), trois bandes plates à 1,25, 2,5 et 3,75 m, puis le
dessus à 5 m (des `Level`), au lieu des deux talus d'aujourd'hui. **Les dessins** sont neufs : les marches de terre, le lierre et les
racines qui les couvrent, les petits arbres penchés des gradins (pixel-artist, dans le chantier à part).

### 13.2 La coupe nord-sud, côté ferme (la première image de la planche)

De gros aplats : le ciel, la masse de terre, les 4 marches et les 3 gradins de chaque côté avec leurs arbres à chaque niveau, le
lierre et les racines qui pendent d'un gradin à l'autre, le chemin clair au fond, Xéros debout au milieu à l'échelle. Les cotes : les
hauteurs (1,25 / 2,50 / 3,75 / 5 m), la profondeur d'un gradin (1 m), le chemin (2,5 m), l'ouverture du haut (8,5 m). Le cercle en
pointillé : en bas il suit les nez des marches, en haut il passe dans les houppiers.

### 13.3 La même coupe au-dessus de la rivière

La même coupe, les mêmes gradins. De chaque côté, au moins 6 m de dessus plat au-delà du bord du trou (question 33, validée), puis
une face de terre qui descend dans l'eau. **L'eau est dehors**, contre la terre, au niveau du chemin, jamais dans le trou.

### 13.4 Ce que voit le joueur

Le jeu montre tout depuis le sud, à 45° (un point à y cm au sud de Xéros et h cm de haut se dessine (y − h) / 5 px sous ses pieds).
**Côté ferme**, du haut de l'écran vers le bas (les pieds de Xéros à la ligne 130 de 240) :

- **la paroi nord, étage par étage** : la marche 1 (du chemin à 1,25 m), le gradin 1 et ses arbres, la marche 2, le gradin 2 et ses
  arbres, puis le début de la marche 3, coupée par le haut de l'écran. Les arbres du gradin 1 se voient en entier, ceux du gradin 2
  par leur tronc et le bas de leur houppier. **Le gradin 3 et le dessus nord ne se voient pas du tout** (relevé en traçant : leurs
  houppiers penchés restent au-dessus du haut de l'écran ; il faudrait les pencher jusqu'au-dessus de Xéros pour qu'ils
  l'effleurent) ;
- **le chemin clair et Xéros** ;
- devant lui, **la masse sud tranchée au niveau du chemin** : de la terre en coupe jusqu'au bas de l'écran, comme le mur sud d'une
  maison coupé au ras du sol ;
- **ce qui devient transparent** (réponse 34, validée), en fantôme par-dessus : les gradins sud (leurs bords tombent entre 15 px
  au-dessus des pieds et les pieds), leurs arbres penchés vers le nord (houppiers jusque vers 80 px au-dessus des pieds) et **les
  grands arbres du dessus sud, qui traversent tout l'écran** en fantôme : leur pied est à la hauteur des pieds de Xéros, leur houppier
  au-dessus du haut de l'écran.

Au-dessus de la rivière, c'est la même image : la masse est assez large pour que l'eau reste hors de l'écran.

**À la bouche est**, Xéros qui vient de la ferme entre dans la face de terre : à sa droite la ferme en pleine lumière ; la transparence
commence dès que la masse sud passe devant lui (elle s'arrête à la face), et la lumière du dehors entre sur les premiers mètres
(environ 3,5 m). **Le jeu voit la face est par la tranche** (il regarde depuis le sud) : le fer à cheval en gradins ne se voit pas
dans l'écran, il n'est qu'un trait. La planche le montre à côté, vu de face depuis la ferme : la face de terre, les gradins et leurs
arbres de part et d'autre, le chemin qui entre.

### 13.5 Réponses de Grégoire et questions

**Validées** (4 novembre) : 32, le dessus de la masse côté ferme est un sol où l'on marche, rejoint par une pente plantée depuis la
ferme ; 33, au moins 6 m de masse de chaque côté du trou au-dessus de la rivière ; 34, la masse sud tranchée au niveau du chemin, ce
qui la surmonte en fantôme ; 35, la version 7 reprise avec la nouvelle forme. **36** : ce sont les gradins et leur végétation qui
referment le cercle (13.1). La forme ronde (31) est corrigée par les gradins.

37. **Les gradins** : 4 marches de 1,25 m et des gradins de 1 m (3 gradins plantés et le dessus), comme sur la planche ? *Recommandation :
    oui* : chaque marche est trop haute pour Xéros, le chemin reste le seul passage, et chaque gradin a la place d'une rangée d'arbres.
    *Autre possibilité* : 5 marches de 1 m, que Xéros franchit d'un saut (il pourrait sortir du trou par les gradins).
38. **Les arbres des gradins** : de petits arbres (noisetier, jeune frêne, 3 à 4 m) et des buissons sur les gradins, les grands arbres
    seulement sur le dessus ? *Recommandation : oui*, un gradin de 1 m ne porte pas un grand arbre. Ces arbres des gradins sont-ils
    abattables comme les autres (les données de `props.json`, sans code) ? *Recommandation : oui, plus tard* (le monde ne limite pas),
    dans le chantier de la forme.
39. **La suite** : si la planche est la bonne, un chantier à part pour cette forme (les formes de la carte, puis les dessins du
    pixel-artist : marches, lierre, racines, arbres penchés, et la transparence de la masse sud) ? *Recommandation : oui.*

**La planche** `.art-preview/relief-plans.png` (pixel-artist, en aplats ; refaire : `npx tsx tools/essai-relief-plans.ts`), dans
l'ordre : 1, la coupe côté ferme ; 2, la coupe au-dessus de la rivière ; 3, ce que voit le joueur, côté ferme et à la bouche est, avec
ce qui devient transparent.

### 13.6 Les deuxièmes plans : le trou rond aux parois lisses (« presque parfaits »)

Gardés tels qu'ils étaient (planche `art/proposals/relief-plans-v2.png`, refaire : `npx tsx tools/essai-relief-plans-v2.ts`). Ils
avaient la bonne forme d'ensemble, mais des parois lisses et des arbres seulement sur le bord ; les questions 32 à 36 y ont reçu leur
réponse (13.5).

#### 13.6.1 La forme : ce que j'ai compris

Le chemin creux n'est pas un couloir entre deux collines. **C'est un trou rond creusé dans une masse de terre.**

- On part d'une **masse de terre** dont le dessus est plat : c'est le sol du pays autour, à 5 m au-dessus du chemin. À l'ouest, c'est
  le plateau lui-même. Côté ferme et au-dessus de la rivière, c'est une langue de ce même terrain qui s'avance jusqu'à la ferme. Vu de
  dedans comme vu de dessus, **on ne voit pas deux collines, on voit un sol plat dans lequel on a creusé une tranchée ronde.**
- Dans cette masse, **un cercle**. **Le haut du cercle est enlevé** : c'est une fente ouverte vers le ciel, plus étroite que le tube.
  **Le bas du cercle est aplati** : c'est le chemin, le sol clair, 2,5 m de large. Entre les deux, **les parois suivent le cercle** :
  elles s'écartent d'abord en montant, puis se courbent vers l'intérieur et reviennent en partie au-dessus du chemin, comme les bords
  d'un tube.
- **La voûte, ce sont ces bords** : les lèvres de terre qui surplombent le chemin, avec les racines, le lierre et les herbes qui en
  pendent. Ce n'est plus un feuillage posé au-dessus de deux collines.
- **Les arbres poussent sur le bord du cercle**, dans la terre autour de la fente, et se penchent au-dessus du trou.
- **Au-dessus de la rivière**, la masse de terre passe d'une rive à l'autre comme une digue pleine. L'eau arrive contre ses deux
  faces, au nord et au sud, et s'y arrête (la décision de la section 11) : elle n'entre jamais dans le cercle. Le chemin, au fond du
  cercle, est au niveau de l'eau.
- **Les deux bouches** : à l'est, côté ferme, la masse s'arrête par une face de terre où s'ouvre le trou, un fer à cheval (le cercle
  sans son haut) ; on y entre comme dans un tronc creux. À l'ouest, le chemin monte (8,3 %) : le trou devient de moins en moins
  profond et le chemin sort à fleur du plateau.

**Une proportion pour les plans** (à régler au dessin) : un cercle de 5,50 m de diamètre, le chemin de 2,5 m en bas, le dessus de la
masse à 5 m au-dessus du chemin. Le tube est large de 5,50 m à mi-hauteur, et la fente du haut fait environ 2 m.

**Ce que la géométrie impose** (relevé en traçant la planche) : avec un chemin de 2,5 m au fond et 5 m de profondeur, le cercle est
**presque entier**. Le dessus n'en retire qu'une vingtaine de centimètres, et les lèvres de terre ne reviennent que d'environ 20 cm
au-dessus des bords du chemin. Pour que la terre elle-même se referme davantage, il faudrait un trou plus profond ou un chemin plus
étroit, ce que le moteur ne permet pas sans changer la carte et la marche. **Ce sont donc les racines, le lierre et les herbes qui
pendent des lèvres qui ferment la fente** et font la voûte, comme le dit Grégoire ; la planche les montre pendant sur le premier tiers
du trou (question 36).

**Ce que cela change, et ce que cela ne change pas.** Le moteur ne change pas : il connaît une hauteur par point, et l'on ne marche
que sur le chemin, comme aujourd'hui. Le creux du tube sous les lèvres ne se marche pas (c'est une paroi), il ne fait que se voir. **Les
formes de la carte**, elles, changent : les deux talus (`Ridge`, crête et flanc qui redescend) deviennent un dessus plat à 5 m (un
`Level`, comme le plateau) qui s'avance jusqu'à la ferme, et le chemin (`Lane`) y est creusé. Le dessus de la masse devient un sol où
l'on pourrait marcher, monté par sa pente côté ferme (question 32).

#### 13.6.2 La coupe nord-sud, côté ferme (la première image de la planche)

De gros aplats : la terre (la masse et ses parois), le ciel (la fente), le chemin clair au fond, Xéros debout au milieu à l'échelle
(1,70 m : il tient trois fois dans la hauteur du trou), l'herbe sur le dessus plat de chaque côté, les arbres sur le bord de la fente,
penchés au-dessus, les racines qui pendent des lèvres. Le cercle entier en pointillé, pour voir ce qui a été enlevé en haut.

#### 13.6.3 La même coupe au-dessus de la rivière

La même masse et le même trou. De chaque côté, à quelques mètres, la masse s'arrête par une face de terre qui descend dans l'eau.
L'eau est **dehors**, contre ces faces, au niveau du chemin, jamais dans le cercle.

#### 13.6.4 La vue de dessus, de la ferme au plateau

Le nord en haut. La ferme à droite (est), le plateau à gauche (ouest). La masse de terre (le dessus plat, herbe) d'un seul tenant du
plateau jusqu'à la ferme, la rivière qui la traverse du nord au sud et s'arrête contre ses deux faces. Dans la masse, la fente
ouverte et le chemin au fond, d'un bout à l'autre. Les deux bouches : le fer à cheval dans la face est, sur la ferme ; la sortie à fleur
du plateau, à l'ouest. Les arbres le long des deux bords de la fente.

#### 13.6.5 Ce que voit le joueur

Le jeu montre tout depuis le sud, à 45° : ce qui est haut se dessine plus haut à l'écran. **Dans le trou, le dessus de la masse au sud
du chemin (avec sa lèvre et ses arbres) passe devant Xéros et le cache tout entier.** Il faut donc le rendre transparent, comme un
toit, autour de Xéros. Ce qu'on voit alors, du haut de l'écran vers le bas :

- le dessus de la masse au nord (l'herbe, le pied des arbres), puis **la lèvre nord** et ses racines qui pendent ;
- **la paroi nord**, qui descend en se creusant jusqu'au chemin (c'est la seule paroi qui se voit, elle regarde vers nous) ;
- **le chemin clair et Xéros** ;
- devant lui, **la masse sud, tranchée au niveau du chemin** : de la terre en coupe jusqu'au bas de l'écran, comme le mur sud
  d'une maison tranché au ras du sol ; **par-dessus, en fantôme, ce qui a été rendu transparent** (la lèvre sud, ses racines, les arbres
  du bord sud).

Au-dessus de la rivière, c'est **la même image** : la masse sud est assez large pour que l'eau reste hors de l'écran ; on ne voit
qu'elle, de la terre, comme côté ferme. **Il n'y a plus rien qui ressemble à un pont** : sous Xéros, il n'y a que la terre en coupe.

**À la bouche est**, Xéros qui vient de la ferme entre dans la face de terre : à sa droite la ferme, en pleine lumière ; à sa gauche le
trou, où la transparence commence dès que la masse sud passe devant lui. La lumière du dehors entre par la bouche sur les premiers
mètres.

**Ce qui se voit au-delà**, quand Xéros est dedans : le dehors est loin. Au nord, au-delà de la lèvre, le dessus de la masse et ses
arbres (ils sont du tunnel : c'est son bord) ; au sud, la terre en coupe remplit le bas de l'écran. La ferme et la rivière ne
paraissent qu'aux bouches. Le voile du dehors des premiers plans n'est plus nécessaire.

#### 13.6.6 Questions pour Grégoire (la forme ronde)

31. **La forme** : est-ce bien elle (le trou rond dans une masse plate, la fente en haut, le chemin plat au fond, les lèvres qui
    reviennent au-dessus du chemin, les arbres sur le bord) ? *Si oui*, je refais les écrans en vraie vue de jeu sur cette forme, puis
    les dessins (pixel-artist).
32. **Le dessus de la masse**, côté ferme : un sol où l'on marche, rejoint par une pente plantée depuis la ferme (au nord et au sud de
    la bouche), ou une butte qu'on ne monte pas ? *Recommandation : un sol où l'on marche* : le monde ne limite pas, et c'est le
    plateau qui continue.
33. **La largeur de la masse** au-dessus de la rivière, de chaque côté du trou : au moins 6 m, pour que l'eau reste hors de l'écran
    quand Xéros est dedans ? *Recommandation : oui.*
34. **Ce qui devient transparent** : la masse sud tranchée au niveau du chemin, sa lèvre et ses arbres en fantôme (comme le mur sud
    et le toit d'une maison) ? *Recommandation : oui.*
35. **La version 7** (le flanc planté, le sol éclairci) : laissée de côté, reprise avec la nouvelle forme ? *Recommandation : oui.*
36. **Les lèvres** : la terre ne revient qu'à peine au-dessus du chemin (le cercle est presque entier, 13.1). On garde le cercle et ce
    sont les racines et la végétation qui ferment la fente, ou on veut des lèvres de terre plus marquées (un trou plus étroit en haut
    qu'un cercle, comme une goutte renversée) ? *Recommandation : le cercle, fermé par ce qui pend* : c'est la forme décrite, et la
    végétation se dessine sans toucher au chemin.

**La planche** `art/proposals/relief-plans-v2.png` (pixel-artist, en aplats ; refaire : `npx tsx tools/essai-relief-plans-v2.ts`), dans
l'ordre : 1, la coupe côté ferme ; 2, la coupe au-dessus de la rivière ; 3, la vue de dessus entière ; 4, ce que voit le joueur, côté
ferme, au-dessus de la rivière, à la bouche est, avec ce qui devient transparent.

### 13.7 Les premiers plans, non validés (la mauvaise forme : deux talus)

*Gardés pour l'historique. Grégoire n'a pas validé ces plans : la forme de départ était fausse (deux talus en pente sur un sol plat).
Les questions 26 à 30 qu'ils posaient sont remplacées par les questions 31 à 35. Planche : `art/proposals/relief-plans-v1.png`
(refaire : `npx tsx tools/essai-relief-plans-v1.ts`).*

#### 13.7.1 Ce que j'ai compris

Entrer dans le chemin creux doit faire le même effet que se glisser dans un tronc creux : **une fois dedans, Xéros est dans la terre**,
pas au-dessus d'elle. Autour de lui, il n'y a que le tunnel : la paroi de terre et ses racines derrière lui, le sol clair sous ses
pieds, l'épaisseur du talus devant lui, la voûte de feuillage au-dessus. Ce qui le cacherait (le talus sud) devient transparent ou se
coupe, mais reste **de la matière du tunnel** : on ne doit pas, en l'enlevant, découvrir le monde
du dehors juste sous ses pieds. Aujourd'hui, au-dessus de la rivière, l'écran se lit de haut en bas « paroi, sol clair, face de terre
verticale, eau » : c'est exactement l'image d'un pont, le sol clair faisant le tablier.

**Pourquoi c'est la projection, pas le dessin.** Le jeu montre tout depuis le sud, à 45° (une hauteur h se dessine h / 5 px plus haut).
Le talus sud a 5 m : sa crête se dessine 100 px plus haut que son pied et passe devant Xéros, qui en est caché de la tête aux pieds
(c'est pourquoi il s'efface). Mais la **face extérieure** de ce talus, qui regarde le sud, se voit en vraie grandeur **sous** le sol du
couloir à l'écran, puis le dehors au-delà de son pied : sur la ferme, les champs ; sur la rivière, l'eau, 77 px sous les pieds de Xéros.

#### 13.7.2 Les deux coupes nord-sud (cm, le sol du couloir à 0, Xéros au milieu)

Les profils sont ceux du jeu (`Lane` et `Ridge` de `ferme.tmj`, section 10.1) : sol de 250, talus intérieurs de 120 au sol pour 500,
crête, flanc extérieur.

| | Talus nord, du dehors au couloir | Couloir | Talus sud, du couloir au dehors | Au-delà |
| --- | --- | --- | --- | --- |
| **Côté ferme** (case 52) | champs à 0 ; flanc de 470 ; crête de 70 à 500 ; paroi de 120 | sol de 250 à 0 | paroi de 120 ; crête de 70 à 500 ; flanc de 470 | champs à 0, à 7,85 m de Xéros |
| **Sur la rivière** (case 44,5) | eau ; flanc de 110 ; crête de 30 à 500 ; paroi de 120 | sol de 250 à 0 | paroi de 120 ; crête de 30 à 500 ; flanc de 110 | eau, à 3,85 m de Xéros |

La voûte : les avancées de feuillage partent des crêtes, vers 4,50 à 5,50 m, et couvrent le couloir ; des arbres ordinaires sur les
crêtes. **L'œil du joueur** : des rayons parallèles qui descendent vers le nord à 45°. Un point est vu si son rayon ne traverse pas de
terre avant lui. Sur les deux coupes, le rayon des pieds de Xéros comme celui de sa tête (1,70 m) entre dans le talus sud : **Xéros est
caché par le talus sud**. La paroi nord ne se voit qu'**au-dessus de 1,05 m** : le rayon qui rase l'arête de la crête sud la
touche à cette hauteur, et en dessous le talus sud la cache aussi (relevé par le pixel-artist en traçant la planche).

**Où chaque chose tombe à l'écran** (px, comptés depuis les pieds de Xéros, vers le bas positif ; l'écran fait 240 px de haut, ses
pieds vers 130) :

| | Côté ferme | Sur la rivière |
| --- | --- | --- |
| Crête nord (le haut de la paroi nord) | −149 à −163 (hors de l'écran) | −149 à −155 (hors de l'écran) |
| Paroi nord, sa face | −51 à −149 : tout le haut de l'écran (de −25 à −51, son pied est caché par le talus sud) | la même |
| Sol du couloir | −25 à +25 | la même |
| Xéros | 0 à −34 | la même |
| Crête sud | −51 à −37 | −51 à −45 |
| Avancées de la voûte | la sud de −106 à −34, la nord de −172 à −96 : sur la paroi nord, **au-dessus de la tête de Xéros**, jamais sur lui | la même |
| Face extérieure du talus sud | −37 à +157 (jusqu'au bas de l'écran) | −45 à +77 |
| Le dehors au sud | au-delà de +157 (hors de l'écran) | **l'eau, à partir de +77** : les 33 px du bas de l'écran |

#### 13.7.3 Ce que le joueur voit aujourd'hui

- **Côté ferme** : la paroi nord en haut, le sol clair et Xéros, puis, dans la largeur de l'écran, le talus sud effacé à 0,2 : un aplat
  vert-brun où transparaissent la face extérieure et le sol. Ni dehors, ni dedans.
- **Sur la rivière** : la paroi nord, le sol clair, la face extérieure du talus sud (terre et lierre) et l'eau en bas : le pont.
- Dans les deux cas, au-delà des crêtes, la forêt au nord et les champs ou l'eau au sud restent en pleine lumière : le dehors entre dans
  le tunnel.

#### 13.7.4 Comment le jeu montre l'intérieur d'une maison, et ce que le tunnel peut en prendre

**Faits** (CONCEPTION « Les intérieurs », `world/interiorMap.ts`, `world/interiorView.ts`, `systems/roofs.ts`) :
- **Une maison où l'on entre** : on passe la porte, un fondu, et l'on est **dans une carte calculée** (`interieur:<carte>:<x>,<y>`), au
  même zoom : la terre battue dans la pièce, **le vide autour** (le dehors n'est ni assombri ni montré : il n'existe plus), le mur du fond
  par sa face du dedans, les murs de côté par leur tranche, **le mur sud en coupe**, tranché au ras du sol, de la teinte de ses pièces ;
  ni les toits ni ce qui passe au-dessus de la tête.
- **Dehors**, le toit d'un bâtiment où l'on entre ne s'efface jamais ; celui d'un abri ouvert s'efface quand Xéros est dessous, et le
  dehors reste alors tel quel autour de lui. Devant une fenêtre au volet ouvert, la pièce seule devient transparente.

**Le tunnel peut se montrer de la même façon**, pièce pour pièce : la paroi nord est le mur du fond (sa face du dedans se voit déjà) ;
**le talus sud est le mur sud, en coupe** ; la voûte est le toit (à une différence près : à l'écran, elle ne couvre pas Xéros, et peut rester pleine, 13.5) ; le
dehors est le vide. Deux différences empêchent de copier la
maison telle quelle : le tunnel fait 88,8 m et **n'a pas de porte** (on y entre en marchant, en montant même, sans fondu de carte, avec les
lapins, les objets lancés, la petite carte qui continuent) ; et **il est ouvert aux deux bouts** (on doit voir la lumière de la sortie).
La vue doit donc changer **sur place**, dans la même carte, au franchissement de l'entrée (`crossed`, règle du dépôt), comme le fondu
d'un toit.

**Le dehors doit-il être caché ou assombri ?** **Assombri, presque jusqu'au noir, jamais montré en pleine lumière** : c'est lui qui
fait « pont », et c'est son absence qui fait « trou », comme le vide autour d'une pièce. Pas tout à fait le vide, parce que le tunnel est
ouvert : vers ses deux bouts, le voile s'éclaircit et l'on voit la lumière du dehors par la bouche. Ce qui est assombri ne se vise pas
(la souris ne prend que ce qui est dans le tunnel), comme ce qui est caché dans une maison.

#### 13.7.5 Trois façons de faire (chacune son schéma d'écran sur la planche)

**1. La coupe, comme la maison.** Dedans, le talus sud se montre **tranché au ras du sol** du couloir : son emprise (de la paroi à son
pied extérieur : 6,60 m côté ferme, 2,60 m sur l'eau) se dessine à plat, en **coupe de terre** (terre sombre, racines et cailloux
tranchés, la teinte de la matière du talus, et un liseré d'herbe au pied extérieur, là où le flanc planté est tranché ; le bord
qui touche le couloir est le pied de la paroi, de la terre nue). Ses arbres et ses broussailles sont cachés comme ce qui passe
au-dessus de la tête. **La voûte reste pleine** : à l'écran, ses avancées tombent sur la paroi nord, au-dessus de la tête de Xéros,
jamais sur lui (tableau 13.2) ; rien n'oblige à l'effacer, et c'est elle qui ferme le haut du trou. Elle ne passerait en fantôme que
là où elle couvrirait Xéros (une avancée plus basse, une pente). Au-delà du pied des deux talus, **le voile du dehors** : la
couleur de la terre profonde, à 0,85, qui s'éclaircit sur les 3 premiers mètres à chaque bouche. À l'écran : en haut la paroi nord (racines, terre, lierre), au milieu le sol clair et Xéros, en bas
une bande de terre en coupe (de +25 à +157 côté ferme, dont 85 px dans l'écran : tout le bas ; 52 px sur l'eau, puis le
liseré), puis, sur l'eau seulement, l'obscurité.
L'eau ne se voit plus.
*Ce qu'il demande au jeu* : l'état « dans le tunnel » (le `hidden` de `systems/laneFade.ts`, testé au franchissement de la bouche, avec
son fondu) ; une seconde version des bandes du talus sud dans `world/terrainView.ts` (la coupe, peinte à hauteur 0), échangée par fondu ;
le voile du dehors, une texture qui couvre l'écran avec un trou à la forme du tunnel (la méthode `windowHole` et `splitRoofs` des toits,
avec une forme tirée des `Lane` au lieu d'un rectangle) ; la souris limitée au tunnel (`pick`) ; un dessin, **la coupe de terre**
(pixel-artist) ; des tests dans `test-relief` (dedans, le voile est là, le dehors ne se vise pas ; dehors, rien ne change).

**2. Le tube transparent.** Rien n'est coupé : le talus sud et la voûte restent entiers mais passent à 0,25 au-dessus de Xéros, comme un
toit ; seule la **face extérieure** du talus sud disparaît, et le dehors est voilé comme en 1. À l'écran : la paroi nord, puis le sol et
Xéros vus à travers un voile de terre et de feuillage, puis l'obscurité. On se sent sous quelque chose, mais Xéros paraît enterré et le
sol se brouille : c'est l'aplat gris-vert déjà reproché à l'essai 3. *Ce qu'il demande* : le voile du dehors et le masque de la face
extérieure ; aucun dessin nouveau.

**3. Le voile seul.** Le rendu d'aujourd'hui, plus le voile du dehors, sans coupe : au-dessus de l'eau, la face extérieure du talus
reste, assombrie, et l'eau devient noire. À l'écran : paroi, sol, une face sombre, du noir. Le pont devient un pont de nuit. *Ce qu'il
demande* : le voile seul ; c'est le moins de travail, et le moins sûr.

**Ma recommandation : la façon 1.** C'est la règle déjà apprise au joueur par les maisons (le mur sud en coupe, le dehors qui
n'est plus là), elle met de la terre des deux côtés de Xéros sur tout l'écran, et elle ne laisse jamais voir l'eau sous lui. Elle demande un seul dessin, la
coupe de terre, et le voile, qui sert aussi à la sortie (la lumière au bout).

#### 13.7.6 Questions pour Grégoire (intérieur du tunnel)

26. **La façon** : 1 (la coupe, comme la maison), 2 (le tube transparent) ou 3 (le voile seul) ? *Recommandation : 1.*
27. **Le dehors** : assombri à 0,85 vers la couleur de la terre profonde, éclairci aux deux bouches, ou le vide comme dans une maison
    (noir, sans lumière au bout) ? *Recommandation : assombri, avec la lumière aux bouches.*
28. **Les arbres et les broussailles du talus sud**, dedans : cachés avec le dehors (comme ce qui passe au-dessus de la tête dans une
    maison), ou en fantôme ? *Recommandation : cachés.* **La voûte** (le rideau, les avancées) : pleine au-dessus de la tête de Xéros
    (elle ne le couvre pas à l'écran), au lieu du fantôme d'aujourd'hui et de la planche ? *Recommandation : pleine* ; c'est le plafond
    du trou.
29. **La coupe** : au ras du sol, comme le mur sud d'une maison, ou à 70 cm au-dessus du sol du couloir, comme les murs de la maison du
    coq ? *Recommandation : au ras du sol* : 70 cm de talus en plus cacheraient les pieds de Xéros.
30. **La version 7** (le flanc planté côté ferme, le sol éclairci) : on la laisse de côté jusqu'à ce que l'intérieur soit décidé, puis on
    la reprend avec lui ? *Recommandation : oui* ; la coupe de la façon 1 change ce que l'on voit du flanc, et le sol clair se juge dans le noir
    du voile.

**La planche** `art/proposals/relief-plans-v1.png` (pixel-artist, en aplats ; refaire : `npx tsx tools/essai-relief-plans-v1.ts`) :
1. les deux coupes nord-sud à l'échelle (côté ferme, sur la rivière), Xéros dedans, les rayons de l'œil à 45° (numérotés : les
   pieds et la tête cachés, le haut de la paroi nord, le rayon qui rase la crête sud, l'eau vue sous Xéros), la voûte, l'eau ;
2. pour chacune, l'écran d'aujourd'hui (ce qui est opaque, effacé, au-delà des parois) ;
3. pour chacune, l'écran des façons 1, 2 et 3, avec la même légende de couleurs : terre pleine, terre en coupe, sol du couloir, Xéros,
   fantôme, voile du dehors, eau, feuillage de la voûte, champs ; sous la façon 1, un encart vu d'en haut (le voile qui s'éclaircit
   sur 3 m à chaque bouche) ;
4. la maison pour comparer : dehors (le toit opaque), dedans (le mur du fond, la terre battue, le mur sud en coupe, le vide), et la
   correspondance avec le tunnel.
Sur les écrans, la voûte est encore en fantôme, comme aujourd'hui ; la question 28 propose de la garder pleine.
