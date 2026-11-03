# Lapin (`rabbit`)

Le lapin de garenne, première créature du jeu (chantier « lapins », 3 novembre 2026 ; CONCEPTION, « Les créatures ») : il vit en
colonie autour d'une garenne près de la ferme, broute à l'aube et au soir, fuit Xéros et se chasse. Ce n'est pas un objet qu'on prend :
vivant, c'est une **créature** (une entrée de `src/content/creatures.json`) ; tué, il devient un objet, le [lapin mort](dead-rabbit.md).

## Identité
- Clé : `rabbit` (clé de la créature dans `creatures.json`, et clé de sa planche de dessins `rabbit`).
- Nom affiché : lapin.
- Nature : créature (moteur commun des créatures : `src/world/creature.ts`, `src/systems/creatures.ts`) ; elle encaisse les coups
  (`target` de la créature : points de vie finis, matière `fur`).
- Mains : ne se prend pas vivant. Mort : le lapin mort, à une main.
- Âge : non (rien de bois).

## Masse
- **1,5 kg** (un lapin de garenne adulte : 1,2 à 2 kg). C'est la masse du lapin mort qu'il devient (la matière se conserve).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Lapin tapi ou broutant : 40 cm du nez à la queue, 15 cm de large, 20 cm de haut (oreilles couchées). Boîte 40 × 15 × 20.
  À l'écran, de profil (est-ouest) : **8 × 6 px** (40 cm ; 20 cm de haut + le dos vu en raccourci). De face ou de dos (nord-sud) :
  **3 × 8 px** (15 cm de large ; 20 cm de haut + 40 cm de long en raccourci, 4 px).
- Dressé aux aguets : assis sur ses pattes arrière, le corps droit, oreilles dressées : **35 cm** de haut (oreilles comprises, 9 cm
  d'oreilles). De profil : environ 5 × 8 px.
- En course : étiré, 50 cm d'un bond : jusqu'à 10 × 5 px.
- **Pas agrandi** (consigne de Grégoire) : c'est 8 px. S'il est illisible en jeu, on le dit ; on ne change pas l'échelle. Le plancher
  de lisibilité (6 px de large) ne s'applique qu'à la vue de face, à 3 px : on la garde à 3 px, la tache claire de la queue (le
  « scut ») et les oreilles suffisent à le reconnaître.
- Collision : aucune (`body` : non). Il ne barre le passage de personne ; lui, il contourne ce qui a un corps.

## Vues
La planche `rabbit` : chaque pose dans trois directions dessinées (`down`, `up`, `right` ; `left` est le miroir de `right`), à la
taille du gabarit, l'ombre portée dessous.
- **Brouter** (`graze`) : tapi, la tête basse dans l'herbe, deux images (la tête qui mâche, une oreille qui bouge).
- **Assis** (`sit`) : tapi, la tête levée, une image ; le repos entre deux sauts.
- **Petits sauts** (`hop`) : trois ou quatre images d'un saut court et lent (les pattes arrière qui poussent, le corps qui s'allonge,
  la retombée).
- **Aux aguets** (`alert`) : dressé sur les pattes arrière, oreilles droites, une ou deux images (les oreilles qui tournent).
- **Course** (`run`) : quatre images d'un galop étiré, la queue blanche bien visible (c'est ce qu'on voit d'un lapin qui fuit).
- **Tambouriner** (`thump`) : tapi, une patte arrière qui frappe le sol, deux images.
- **Mort** (`dead`) : couché sur le flanc, une image ; c'est l'image au sol du lapin mort (`dead-rabbit`).
- Fantôme, case d'interface, porté : non (vivant, il ne se prend pas).

## Variantes naturelles
Une seule robe pour l'instant (gris-brun « agouti », ventre et queue blancs). Plus tard : de petites différences de taille et de teinte
(`natural` des créatures, pas encore).

## Regroupement
En colonie : une **garenne** (un rectangle `Warren` de Tiled, qui dit sa créature et sa population) réunit trois ou quatre
[entrées de garenne](warren-hole.md) (`warren-hole`).

## Gestes
- Il ne se prend pas, ne se pose pas, ne se lance pas vivant.
- Clic de la main qui tient une arme, un outil, une ressource, ou d'une main vide (le poing) : le frapper. Un objet lancé le touche s'il
  passe sur lui, en vol, sous sa hauteur.

## Comportement (`creatures.json`, CONCEPTION « Les créatures »)
- **Trois états** : tranquille (il broute par petits sauts, à quelques dizaines de mètres au plus de sa garenne, et s'arrête souvent) ;
  aux aguets (il se dresse et regarde Xéros ; si Xéros s'arrête ou recule, il se calme et se remet à brouter) ; en fuite (il court en
  zigzag vers l'entrée la plus proche de sa garenne, tambourine, ce qui fait fuir ses voisins, entre au terrier et ressort quelques
  minutes de jeu plus tard).
- **Les distances suivent l'allure de Xéros** (valeurs de départ, à régler en jouant) : marche discrète, aux aguets à 8 m et fuite à
  4 m ; marche, 15 m et 10 m ; course, 25 m et 20 m.
- **Vitesses** : environ 10 m/s en fuite ; les petits sauts du broutage, lents (environ 0,5 m/s en moyenne, pauses comprises).
  Xéros court à 2,5 m/s : il ne rattrape jamais un lapin qui fuit (voulu).
- **Le rythme** : beaucoup dehors à l'aube et au soir, deux ou trois en journée, tous au terrier la nuit (heures dans les données).

## Travail
Aucun.

## Arme
Aucune. C'est une cible : `target` de la créature, **4 points de vie** (valeur de départ), matière `fur` (des touffes de poil,
`fx-fur`). Un coup de poing (1,6) le blesse ; une branche (8,4), l'épée de bois (6) ou une pierre bien lancée le tuent. Les dégâts
viennent de la physique des coups et des lancers (world/strike.ts, world/throw.ts), sans exception pour lui.

## Origine
Né à la garenne : quand il manque des lapins (tués), des naissances remettent la population à niveau au rythme des données.

## Devenir
- Blessé : il fuit au terrier et y reste jusqu'au lendemain pour guérir ; sa vie est gardée dans la partie (GameState).
- Tué : il devient un [lapin mort](dead-rabbit.md) de sa masse, là où il meurt ; il manque à sa garenne jusqu'aux naissances. Aucune
  conséquence (le seigneur ne chasse presque jamais dans cette forêt).

## Transformations
Aucune (vivant).

## Métier
Aucun (une bête sauvage). Le chasseur, plus tard.

## Vérification
- Aperçu : `.art-preview/lapins.png` (les propositions, x6, à côté de Xéros), puis, intégré, `.art-preview/collection.png`.
- Outils de test (`?dieu`) : faire apparaître un lapin près de Xéros, régler la population, voir les distances.
- En jeu : à l'aube près de la garenne, des lapins broutent ; marcher vers eux : l'un se dresse puis fuit en zigzag, tambourine, les
  autres fuient aussi, tous rentrent au terrier ; en marche discrète (Alt), on approche plus près ; avec `?debug`, l'état au-dessus de
  chaque lapin et les deux cercles d'alerte autour de Xéros.
