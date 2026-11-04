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
