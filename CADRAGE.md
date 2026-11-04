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
