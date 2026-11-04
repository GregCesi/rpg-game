# Cadrage : les sangliers

Essai du 4 novembre 2026, branche `sangliers`, worktree `~/Code/rpg-game-sangliers`, parti de `origin/main` (c264a42). **Rien du jeu
n'a changé.** Seuls des essais sont écrits : ce cadrage, `tools/essai-sangliers-chiffres.ts` (les chiffres, tirés du vrai moteur), et
les planches du pixel-artist (`art/proposals/sanglier*.ts`, `tools/essai-sangliers.ts`, `tools/essai-sangliers-carte.ts`).

Pour refaire les chiffres : `npx tsx tools/essai-sangliers-chiffres.ts`. Pour refaire les planches : `npx tsx tools/essai-sangliers.ts`
et `npx tsx tools/essai-sangliers-carte.ts` (après `npm run art` et `npm run art:monde`).

Les sources des valeurs réelles : la vitesse de pointe la plus citée est **40 km/h** (de 30 à 50 selon les sources), soit **11 m/s** ;
le mâle adulte pèse 100 à 110 kg en moyenne en France (OFB), la laie 60 à 80 ; 55 à 110 cm au garrot, 90 à 200 cm de long (tête et
corps), la tête fait un tiers de la longueur. On prend un adulte de **80 kg**, au milieu de la fourchette donnée par Grégoire.

---

## 1. Où et combien

Le monde a quatre zones de forêt profonde, à l'ouest (de 0 à 200 m d'est en ouest) : `foret-profonde-nord`, `foret-profonde`,
`foret-profonde-sud`, `foret-des-ronces`. Le sol `deepwoods` en couvre la moitié ouest (de 0 à 105 m environ) ; la moitié est est du
sous-bois (`woods`). Chacune a de 1 600 à 1 700 arbres (un tronc tous les 4,9 m en moyenne), une centaine de buissons et 15 à 30
rochers. La chaumière est à (360, 284) m du monde ; le sentier qui part du pont s'arrête vers 190 m, dans le sous-bois de
`foret-profonde`.

**Proposé** : une **bauge** par zone profonde, dans le sol `deepwoods`, à 40-50 m du bord ouest du monde ; 8 sangliers en tout.

| Zone | Bauge (m du monde) | Sangliers |
| --- | --- | --- |
| `foret-profonde-nord` | (45, 90) | 2 |
| `foret-profonde` | (40, 300) | 1 (la zone du sentier : la moins dangereuse) |
| `foret-profonde-sud` | (50, 500) | 2 |
| `foret-des-ronces` | (45, 700) | 3 (la plus dense, la plus dangereuse) |

C'est beaucoup plus que dans la réalité (2 à 10 sangliers au km² ; ici 8 sur 8 ha de forêt profonde, soit environ 100 au km²),
comme les lapins : le monde est resserré.

**Le jour et la nuit.** Le sanglier vit la nuit. Le jour, il dort à la bauge, couché dans le fourré, **visible** (pas au terrier
comme le lapin) ; la nuit, il erre et fouille la terre jusqu'à 60 m de sa bauge, ce qui le garde dans la forêt profonde et son
sous-bois. Proposé (`schedule`, la même forme que le lapin : la part des bêtes debout) : de 7 h à 19 h, 10 % debout (un sanglier
qui fouille près de la bauge en plein jour, de temps en temps) ; de 19 h à 7 h, toutes debout. Le territoire de nuit le plus proche
de la chaumière en est à 260 m (`foret-profonde`) : **il ne vient jamais à la ferme**.

Couché à la bauge, il dort : ses distances de perception sont **divisées par deux** (`asleep`). Un Xéros qui passe à 10 m d'une bauge
en plein jour ne réveille rien ; s'il marche dessus, il se fait charger.

Comme le lapin, la bête reste dans sa zone : une charge s'arrête au bord de la zone, et Xéros qui passe dans la zone voisine lui
échappe (c'est le moteur actuel : chaque zone mène ses bêtes).

## 2. Ses états

Le moteur des lapins (`world/creature.ts`) a trois états (tranquille, aux aguets, en fuite) et deux mouvements (rentrer, tambouriner).
Le sanglier garde les deux premiers et remplace la fuite par la charge :

| État | Ce qu'il fait | Ce qui le fait sortir de l'état |
| --- | --- | --- |
| **couché** (`rest`) | dort à la bauge | l'heure (il se lève) ; Xéros dans sa distance d'alerte (la moitié de la normale) → aux aguets |
| **tranquille** (`calm`) | marche au pas et fouille autour de sa bauge (1,2 m/s, pauses) | Xéros dans sa distance d'alerte → aux aguets ; l'heure → il rentre se coucher |
| **aux aguets** (`alert`) | s'arrête, tourné vers Xéros, la hure levée | Xéros dans sa distance de charge, **et la ligne libre** → l'annonce ; Xéros immobile, qui s'éloigne ou sort de sa vue pendant 6 s → tranquille |
| **l'annonce** (`tell`) | tête basse, il gratte le sol, il souffle : 0,6 s | toujours → la charge (vers où est Xéros à la fin de l'annonce) |
| **la charge** (`charge`) | en ligne droite, il accélère jusqu'à 11 m/s | il touche Xéros → il continue, freine ; il touche un obstacle → choc ; il a parcouru sa longueur → il freine |
| **le freinage** (`brake`) | il ralentit (9 m/s²), se retourne | arrêté → aux aguets (il recharge s'il voit encore Xéros, après 1,5 s de souffle) |
| **sonné** (`stunned`) | il titube sur place | le temps passé → aux aguets (recharge s'il voit Xéros, sinon tranquille) |
| **mort** | il devient l'objet `dead-boar` | — |

Blessé par un coup ou un objet lancé, il ne fuit pas : il charge aussitôt (sauf sonné : voir la question 7).

## 3. Les valeurs proposées

Tout dans `creatures.json`, rien en dur (le lapin pour comparer) :

| | Sanglier | Lapin |
| --- | --- | --- |
| Masse, dimensions | 80 kg ; 140 × 40 × 80 cm (long, large, garrot) | 1,5 kg ; 40 × 15 × 20 |
| Taille à l'écran | de profil 28 × 20 px, de face et de dos 8 × 30 px (le dos vu du dessus) | 8 × 6, 3 × 8 |
| Aux aguets / réagit (m), immobile | 4 / 2 | 3 / 1,5 |
| discret (Alt) | 7 / 4 | 4,5 / 2,5 |
| marche | 12 / 8 | 7 / 4,5 |
| course | 16 / 11 | 9 / 7 |
| couché à la bauge | la moitié | — |
| Se calme après | 6 s sans que Xéros approche | 4 s |
| Marche, fouille | 1,2 m/s, à 60 m de la bauge la nuit, 10 m le jour | sauts à 1,2 m/s, à 12 m de l'entrée |
| Annonce | 0,6 s | — |
| Charge | accélère à 8 m/s² (11 m/s atteints en 1,4 s, sur 7,6 m), plafond 11 m/s | fuit à 10 m/s |
| Longueur de charge | jusqu'à l'endroit où était Xéros, plus 4 m, puis il freine à 9 m/s² (6,7 m depuis 11 m/s) ; au plus 25 m | — |
| Souffle entre deux charges | 1,5 s | — |
| Sonné | 5 s pour un choc de pleine charge, au prorata de l'énergie ; pas sonné sous 1 500 J (6 m/s) | — |
| Vie | 30 points | 4 |

La vue du jeu au zoom de départ fait 10,7 m de part et d'autre de Xéros (6 m vers le haut et le bas) : à la marche, le sanglier
le voit à 12 m, au bord de l'écran ou juste au-delà ; il charge à 8 m, dans l'écran. En marche discrète, on passe à 5 m de lui ;
immobile, on peut le laisser venir à 2 m.

**Le temps pour s'écarter** (essai-chiffres) : l'annonce (0,6 s) puis la course : 9 m en 1,5 s, 12 m en 1,8 s. Xéros, qui court à
2,5 m/s, s'écarte de 3,8 m à 4,4 m pendant ce temps : plus qu'il n'en faut (la bête fait 40 cm de large, Xéros 50). **On évite une
charge qu'on voit venir** ; on se fait prendre quand on ne la voit pas (le sanglier derrière, hors de l'écran, à la course) ou quand
on n'a pas la place de s'écarter (entre deux troncs).

## 4. Les chocs, dans la physique existante

La physique d'aujourd'hui (world/strike.ts) : un choc a une énergie (½ m v²), qui fait des dégâts par une seule règle,
`impactDamage` : l'énergie × `damagePerJoule` (0,103) × l'efficacité de ce qui frappe. Tout ce qui suit passe par elle.

### Contre Xéros

Le sanglier et Xéros font un choc mou : la bête emporte Xéros. Ce qui se perd dans le choc est ½ μ v², μ la masse réduite
(m₁ m₂ / (m₁ + m₂)) ; Xéros repart à la vitesse commune, glisse et roule au sol (frottement 0,7), sans jamais traverser un obstacle
(comme les bêtes : chaque pas suivi pixel par pixel), et reste à terre 1,5 s. Il lâche ce qu'il tient (à ses pieds : la matière se
conserve). L'efficacité de la charge (`tusk`, 0,15) est la part du choc qui blesse : le reste renverse.

| Sanglier | Énergie de la charge | Perdue dans le choc (Xéros 70 kg) | Xéros emporté à | Au sol | Dégâts (vie 100) |
| --- | --- | --- | --- | --- | --- |
| 50 kg | 3 025 J | 1 765 J | 4,6 m/s | 1,5 m | 27 : **4 charges** |
| **80 kg** | 4 840 J | 2 259 J | 5,9 m/s | 2,5 m | 35 : **3 charges** |
| 100 kg | 6 050 J | 2 491 J | 6,5 m/s | 3,0 m | 39 : **3 charges** |

Une charge prise avant la pleine vitesse blesse moins (l'énergie suit v²) : à 6 m/s, 10 points. Il faut donc la **vie de Xéros**,
qui n'existe pas encore (« ce qui vient ensuite » dans *Le combat*) : voir la question 1. Et sa masse (70 kg), une donnée nouvelle
(`strength.json`, à côté de ce qu'il porte).

### Contre un arbre (ou tout ce qui a un corps)

L'obstacle ne bouge pas : toute l'énergie de la charge reste dans la bête (4 840 J à pleine vitesse). Le crâne et l'écu du sanglier
sont faits pour les chocs : il est **sonné, pas blessé** (proposé), pendant une durée proportionnelle à l'énergie du choc (5 s à pleine
charge ; pas sonné sous 1 500 J : il s'arrête et se retourne). L'arbre tremble (le tremblement d'un coup de hache) et lâche quelques
feuilles. Ce qui arrête une charge : tout ce qui a un corps (`areaFree` de GameMap) : les troncs (le gros : 90 × 50 cm de collision ;
le normal : 50 × 30), les souches, les rochers, les murs, un tas de bois. Le buisson : voir la question 5.

**Dans la vraie forêt profonde** (essai-chiffres, 4 000 charges tirées au hasard dans `foret-profonde`) : une charge de 10 m rencontre
un tronc une fois sur deux (49 %), à 4,5 m en moyenne ; de 15 m, 64 % ; de 20 m, 73 %. La forêt protège. C'est pourquoi je propose que
le sanglier ne charge que **sur une ligne libre jusqu'à Xéros** (il ne fonce pas dans un arbre qu'il voit) ; l'arbre qui l'arrête est
alors celui **derrière Xéros**, quand Xéros s'écarte. Le jeu est celui du torero : se mettre devant un gros tronc, attendre la
charge, s'écarter au dernier moment. C'est là qu'on peut frapper.

### Les coups de Xéros sur le sanglier

Proposé : la peau épaisse et l'écu (le cartilage du garrot) **encaissent 120 J à chaque choc** (`hide`) ; un tranchant les coupe
d'autant (`edge` de l'outil, de 0 à 1 : la hache et la doloire 1, la pioche 0,6 ; les autres 0). Les dégâts sont ceux de l'énergie
qui passe : `impactDamage(max(0, J − hide × (1 − edge)), efficacité)`. C'est la seule règle nouvelle des coups, et elle vaut pour
toute cible qui aurait une peau (le lapin : 0).

À la force de Xéros (couple 50 N·m), contre un sanglier de 30 points (essai-chiffres, le vrai moteur) :

| Ce qu'il tient | Énergie, taille / coup d'en haut | Dégâts au sanglier | Coups pour le tuer | Le même coup sur un lapin |
| --- | --- | --- | --- | --- |
| le poing | 16 J | 0 | jamais | 1,6 |
| la branche | 130 / 142 J | 0,6 / 1,4 | 22 coups d'en haut | 8,4 |
| l'épée de bois | 58 / 64 J | 0 | jamais | 6 |
| la petite pierre (4,5 kg), tenue / lancée | 18 J / 185 J | 0 / 3,4 | 9 lancers | 9,5 lancée |
| la pierre brute (14,6 kg), lancée de 2,8 m | 347 J | 11,7 | 3 lancers | |
| la masse de bûcheron (4 kg) | 90 / 153 J | 1,5 / 4,8 | 7 coups d'en haut | |
| **la hache** (1,8 kg) | 90 / 153 J | 4,6 / **7,9** | **4 coups d'en haut** (0,7 s chacun) | 4,6 |
| la hache, au plafond humain (?dieu) | 123 / 209 J | 6,3 / 10,8 | 3 | |

Ce qui en sort, sans une règle écrite pour une arme : **avec la branche ou la pierre, c'est presque impossible** ; **à la hache,
quatre coups d'en haut**. Sonné cinq secondes, le sanglier en prend deux ou trois si Xéros est déjà près de l'arbre : il faut deux
charges ratées pour le tuer. Ce que la physique permet aussi : lâcher une grosse pierre de 55 kg sur une bête sonnée (983 J, 45
points, en un coup) ou lancer un moellon de 36 kg à 1,6 m (678 J, 29 points). C'est vrai, et lourd à porter jusque-là ; à garder
(question 6).

Un coup qui frappe une bête **qui charge** : sa vitesse s'ajouterait à celle de l'arme (la vitesse relative). Proposé : pas dans ce
chantier (question 8). C'est le principe de l'**épieu** à arrêt, l'arme de la chasse au sanglier, à faire plus tard.

## 5. Ce qu'on réutilise, ce qui est nouveau

**Réutilisé tel quel** : la perception par l'allure (`perceive`, `senses`, `gaitOf`) ; l'état aux aguets et son calme ; l'errance
(la marche vers une place, les pauses), la population, les naissances, la guérison, ce que garde GameState (`warrens`, `settle`,
`death`) ; la marche pixel par pixel contre les obstacles (`advance`, `clear`) et le chemin A* (`findPath`) pour rentrer à la bauge ;
la bête comme cible (`targets`, `flightHit` pour les lancers) ; ce que devient la bête morte (`becomes`, posé là où elle meurt) ;
?debug (l'état, les cercles) et ?dieu « Créatures » ; la règle des dégâts (`impactDamage`).

**Nouveau, en données** (creatures.json, `CreatureSchema`) :
- `reaction` : `"flee"` (le lapin) ou `"charge"` (le sanglier) ; les distances `senses.<allure>.flee` deviennent `near` (le seuil
  où la bête réagit, quelle que soit sa réaction) ;
- `charge` : `tell` (0,6 s), `accel` (8 m/s²), `speed` (11 m/s), `past` (4 m), `max` (25 m), `brake` (9 m/s²), `breath` (1,5 s),
  `tusk` (0,15) ;
- `stun` : `from` (1 500 J), `perJ` (5 s / 4 840 J) ;
- `target.hide` (120 J) ;
- `den` : `"burrow"` (le lapin : invisible au terrier) ou `"bed"` (le sanglier : couché, visible, `asleep` 0,5) ;
- le gîte : le rectangle `Warren` de Tiled sert aussi pour la bauge (il dit `creature` et `population`) ; ses entrées deviennent
  la bauge, un objet `boar-bed` de props.json (un creux de feuilles et de terre, à plat, sans corps), à `burrow`.

**Nouveau, en code** (moteur commun, sans une ligne pour l'espèce) : les états `rest`, `tell`, `charge`, `brake`, `stunned` dans
`world/creature.ts` ; le choc de la charge (`world/charge.ts`, sans Phaser : la ligne libre, l'accélération, le choc mou contre
Xéros, l'obstacle, la durée sonnée) ; la peau dans `impactDamage` (et `edge` lu sur l'outil) ; **la vie de Xéros** (un composant
`Health` attaché à `Actor`, une jauge du HUD, GameState `health`, `SAVE_VERSION`) et Xéros renversé (un état de Player, un geste
`fall` / `get-up` dessiné par le pixel-artist) ; le test du moteur (`tools/test-sangliers.ts` dans test:fast) et un scénario
`npm run test:sangliers` (Xéros évite une charge, le sanglier s'assomme sur un tronc, Xéros le tue à la hache ; une charge prise
le renverse et le blesse ; marche discrète à 5 m sans réveil).

## 6. Mort : ce qu'il devient

Tué, il devient l'objet **`dead-boar`** (items.json, « sanglier mort », 80 kg, la masse de la bête : `validate.ts` le vérifie déjà
pour le lapin), posé là où il tombe, couché sur le flanc, avec ses vues au sol. Il pèse plus que ce que Xéros porte (70 kg) : « Trop
lourd pour lui (80 kg, il en porte 70) », la règle du monde qui ne limite pas. À la force de ?dieu, il se porte (à deux mains, sur
l'épaule). Plus tard : le traîner, le dépecer (une transformation de transforms.json : la viande, la peau, les soies, les défenses,
et le déchet nommé, les viscères ; la masse se conserve). Il manque à sa bauge jusqu'aux naissances (proposé : une toutes les 72 h,
le sanglier est plus rare que le lapin).

## 7. Les planches à regarder

La liste, et ce qu'il faut regarder sur chacune, est dans le récapitulatif du chantier (dans la conversation) :
`.art-preview/sangliers.png`, `.art-preview/sangliers-scene.png`, `.art-preview/sangliers-carte.png`.

## 8. Questions (chacune avec ma recommandation)

1. **La vie de Xéros**, qu'il faut créer : à zéro, que se passe-t-il ? *Recommandé* : il s'évanouit ; il se réveille dans son cagibi le
   lendemain matin (la mère l'a trouvé, une ligne de dialogue) ; ce qu'il tenait reste là où il est tombé ; sa vie remonte en dormant
   (la moitié par nuit) ; vie 100, une barre au HUD à côté de l'endurance. Pas de mort définitive.
2. **La masse du sanglier** : un seul sanglier de 80 kg pour commencer, ou deux bêtes dès maintenant ? *Recommandé* : un seul
   (80 kg), puis le solitaire (100 kg, plus agressif) et la laie avec ses marcassins (60 kg, elle ne charge que pour ses petits), en
   données seulement, plus tard.
3. **La ligne libre** : il ne charge que si rien ne barre la ligne jusqu'à Xéros (sinon il reste aux aguets, ou se déplace pour
   trouver la ligne) ? *Recommandé* : oui. Sans elle, une charge sur deux finit dans un tronc à 4 m, à demi-vitesse, et la forêt
   devient sans danger.
4. **La ligne droite** : visée une fois, à la fin de l'annonce, vers où est Xéros, et jamais corrigée ? *Recommandé* : oui, c'est ce qui
   rend l'esquive possible et lisible ; une correction de quelques degrés par seconde pourra venir avec le solitaire.
5. **Le buisson** : il a un corps aujourd'hui (le lapin le contourne). Arrête-t-il la charge ? *Recommandé* : la charge le traverse en
   le secouant (un buisson n'arrête pas 80 kg à 11 m/s), sans ralentir ; tout le reste de ce qui a un corps l'arrête. C'est une
   donnée de l'objet (`soft` dans props.json), pas une règle pour le sanglier.
6. **La peau** (120 J par choc, coupée par le tranchant) : d'accord avec cette règle et ses conséquences (hache 4 coups, branche 22,
   grosse pierre de 55 kg lâchée : un coup) ? *Recommandé* : oui ; c'est la seule nouveauté des coups, et elle vaut pour toute cible.
7. **Frappé pendant qu'il est sonné** : le coup le réveille-t-il ? *Recommandé* : non, il reste sonné jusqu'au bout (la fenêtre reste
   la fenêtre) ; à la fin, il charge aussitôt s'il est blessé.
8. **Frapper une bête qui charge** (sa vitesse s'ajoute à celle de l'arme) : maintenant ou avec l'épieu ? *Recommandé* : plus tard,
   avec l'épieu ; pour ce chantier, un coup sur une bête qui charge compte comme sur une bête arrêtée, et Xéros est renversé quand
   même s'il est sur la ligne.
9. **Où et combien** (1 à 3 bêtes par zone profonde, 8 en tout, dans le sol `deepwoods` ; la nuit à 60 m de la bauge, jamais à la
   ferme) : d'accord ? *Recommandé* : oui ; qu'ils viennent la nuit retourner les champs est une belle idée pour plus tard.
10. **Le jour** : couché à la bauge, visible, perceptions divisées par deux, 10 % debout ? *Recommandé* : oui.
11. **Xéros renversé** : à terre 1,5 s, il lâche ce qu'il tient, il glisse de 2,5 m. *Recommandé* : oui ; il faut le geste de Xéros
    qui tombe et se relève (pixel-artist), qui n'est pas sur ces planches.
12. **Les distances de perception** (aux aguets 12 m et charge 8 m à la marche ; 7 et 4 en marche discrète ; 16 et 11 à la course) ?
    *Recommandé* : celles-là pour commencer, réglables dans ?dieu comme celles du lapin.
13. **Le découpage** : *Recommandé*, trois chantiers : (a) la vie de Xéros et Xéros renversé (le HUD, la sauvegarde, le geste) ; (b)
    le sanglier (moteur, données, dessins validés, la bauge dans les quatre cartes, tests) ; (c) le sanglier mort qu'on dépèce.
