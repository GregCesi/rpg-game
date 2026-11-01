# Les commandes

L'inventaire de toutes les touches du jeu au 1er novembre 2026 (chantier « combat de base ») : ce qu'elles font selon ce que Xéros
tient et où il est, puis les conflits et incohérences relevés, avec ce qu'il faudra trancher. Rien n'a été refondu : la seule
commande ajoutée par ce chantier est « Espace avec une arme en main attaque ».

Les touches sont lues **par leur place** sur le clavier (`KeyboardEvent.code`, `src/input/PlayerInput.ts`) : la même place sert en
AZERTY et en QWERTY. Dans ce document, une touche est nommée par sa lettre en AZERTY, la lettre QWERTY entre parenthèses quand elle
diffère.

## Où l'on est

Le monde a un mode à la fois (`WorldScene`) :

| Mode | Quand | Ce qui est lu |
| --- | --- | --- |
| **jeu** (`play`) | Xéros marche | tout ce qui suit |
| **geste** (`use`) | un coup d'outil ou une attaque se joue | le zoom ; Espace (gardé : enchaîner l'attaque suivante) ; le reste est lu et jeté |
| **rail** (`rail`) | une passe de doloire le long d'une pièce | Échap ou un pas (arrêter) et le zoom, rien d'autre |
| **travail** (`work`) | un travail qui dure (abattre, récolter, couper, fendre, tailler) : Xéros répète son geste, une jauge au-dessus de lui | Échap ou un pas (arrêter : ce qui est fait reste fait) et le zoom, rien d'autre |
| **dialogue** (`dialogue`) | une ligne de dialogue est ouverte (DialogueScene) | E, Espace, Entrée, clic : la suite ; Z/S (W/S) ou flèches : choisir ; le zoom |
| **passage** (`transition`) | fondu d'une carte à l'autre, aide de la mère | le zoom |
| **construction** (`build`, `?construire`) | le bac à sable | voir plus bas |

Dedans (un intérieur calculé) : les mêmes touches que dehors.

## Le jeu : touche par touche

### Se déplacer
- **Z Q S D (W A S D)** ou **flèches** : marcher. Chargé au-delà de 25 kg, il marche plus lentement ; à deux mains (`carry`), lentement.
- **Maj** (maintenu) : courir (0,2 point du plafond et 5 de souffle par seconde : environ 20 s à plein souffle) ; refusé chargé au-delà de 25 kg, à deux mains, fatigué ou épuisé ; à bout de souffle, Xéros repasse au pas et souffle, la barre clignote, sans message.
- **Pousser** (pas de touche) : marcher contre une bille ronde couchée, les mains libres, 0,3 s : elle roule.
- Marcher dans une sortie, hors du bord d'une zone, par une porte ouverte : changer de carte.

### E (ou Entrée), appui court
Selon ce que vise Xéros (la cible la plus proche devant lui) :

| Ce qu'il vise | Ce que fait E |
| --- | --- |
| un personnage | lui parler |
| la paillasse du cagibi | « Dormir ? » (dialogue à choix) |
| la planchette gravée | apprendre le plan de l'abri |
| un objet à récolter à la main (le billot et sa hache) | le récolter (un geste), mains libres pour ce qui vient dans les mains |
| un objet du monde qui se prend (bille, fagot, rouleau, pièce de bois…) | le prendre (refusé au-delà de 70 kg : « Trop lourde… Pousse-la ») |
| un tas | reprendre la pièce du dessus |
| le lien seul d'un tas | le reprendre |
| un objet par terre | le ramasser |
| le billot, en tenant le rouleau | poser le rouleau dessus (`rest`) ; mains libres, le reprendre (`unload`) |
| un piquet planté (chantier pas né) | le reprendre |
| une place en fantôme d'un chantier, avec la bonne pièce | la poser |
| une place trop lourde d'un chantier | dire ce qui manque, ou « Maintiens E pour appeler ta mère. » |
| une porte, un volet posés (`swing`) | l'ouvrir, le fermer |
| **rien** (ou ce qu'on ne peut pas prendre), en tenant quelque chose | **poser** ce que tient la main active, là où le montre le fantôme (comme Q) |

### E maintenu (une demi-seconde, une jauge au-dessus de la tête)
- Mains libres, devant un tas de branches plein et lié : nouer (il devient un fagot) ; devant un fagot : le dénouer.
- Devant une place de chantier qui demande une poutre trop lourde : appeler la mère (dialogue, fondu, la poutre est dressée).
- Relâché avant la fin : c'est E court.

### Espace
Selon ce que tient Xéros (« ce qui sert » : la main active, sinon l'autre main si l'active est vide) et ce qu'il vise :

| Ce qu'il tient | Ce que fait Espace |
| --- | --- |
| **une arme qui sert** (la branche, l'épée de bois : dans la main active, ou dans l'autre si l'active est vide) | **attaquer** (la taille ; Espace de nouveau pendant le geste ou juste après : le coup d'en haut, puis de nouveau la taille) ; coûte même dans le vide |
| **la main active vide**, l'autre vide ou tenant ce qui n'est ni une arme ni un outil (une pierre…) | **un direct du poing** de la main libre ; Espace de nouveau : l'autre poing (gauche-droite) si les deux sont libres |
| la branche (ou le piquet) dans la main active et la hachette dans l'autre, face au billot | tailler : la branche devient un piquet, le piquet une cheville (c'est la hachette qui sert) |
| un piquet, un plan connu | le planter au tracé (le premier fixe le coin nord-ouest) |
| la cognée, devant un arbre debout | abattre (`use`) : un travail en temps réel (25 min pour un arbre normal, 1 h pour le gros), Xéros frappe jusqu'au bout ; un pas ou Échap l'arrête, repris là où il en était |
| la cognée, sur un arbre couché, un houppier, une pièce de bois | de haut en bas (`chop`), un travail en temps réel : ébrancher, couper sur la grille |
| la hachette ou la cognée, sur le rouleau posé sur le billot | couper un lien de 2 m |
| la doloire, contre le flanc d'une pièce de bois | une passe sur le rail (Xéros longe la pièce tout seul, 8 min par mètre ; Échap ou un pas l'arrête) |
| le coin, contre le bout d'une grosse bille | le planter (sans geste) |
| la masse, sur un coin planté | fendre (`maul`), un travail en temps réel (2 min par étape, trois étapes par mètre commencé), la bille s'ouvre au bout |
| une ressource seule dans la main active (pas une arme), devant ce qui demande un outil | « Sans hache, rien à faire. » (mains vides : le poing, voir plus haut) |
| un outil dans le vide | le geste dans le vide, sans dépense |
| ce qu'on porte à deux mains (`carry`) | rien |

Un refus (mauvais outil, pas la place, épuisé) se dit sans geste ni dépense.

### Q (A en AZERTY)
- Lâcher devant soi ce que tient la main active, là où le montre le fantôme (seul, en tas, ou un lien sous un tas).

### Tab
- Changer de main active. (La main active passe aussi seule sur l'autre quand elle se vide.)

### R
- Appui court, en tenant une pièce, un objet à plusieurs vues : le tourner d'un quart de tour pour la pose (le fantôme suit).
- Maintenu une seconde, mains vides, au contact d'une bille couchée : la faire pivoter d'un quart de tour (jauge).

### Échap
- Sur un rail ou pendant un travail : l'arrêter (ce qui est fait reste fait ; un pas fait de même). Ailleurs : rien.

### V (la vitesse du temps) — en pause
- L'accélération du temps est en pause : tout se joue à x1, V ne fait rien (`accelerate` de time.json). Quand elle reviendra : V, le palier suivant de la vitesse du temps (x1, x6, x24, x60, x360 ; x24 par défaut) ; Maj + V : le précédent ; un message dit
  le palier (« Le temps : x60 »). Elle ne fait avancer que l'horloge (l'heure en haut à droite), jamais la marche ni les gestes.
  Retenue d'une session à l'autre (docs/CONCEPTION.md, « Le temps »).

### Le zoom (dans tous les modes)
- Molette (vers l'avant : plus près), **+** et **−** (lus par leur signe, où qu'ils soient), ou + et − du pavé numérique.

## La construction (`?construire`)

| Touche | Effet |
| --- | --- |
| B | entrer dans le mode, en sortir |
| Z Q S D (W A S D), flèches ; Maj | déplacer la caméra ; plus vite |
| clic gauche | poser ce qu'on a en main, là où le montre le fantôme ; sur une jonction : l'assemblage |
| clic droit ; Maj + clic droit | retirer la pièce visée ; avec tout ce qui repose dessus et lui est assemblé |
| R | tourner la pièce (est-ouest, nord-sud, debout) |
| T, G (Page haut, Page bas) | monter, descendre d'un cran de 20 cm |
| Ctrl+Z ; Ctrl+Y ou Ctrl+Maj+Z | annuler ; refaire (lus par la lettre, comme partout ailleurs sur l'ordinateur) |

Le panneau du catalogue et `?dieu` se manient à la souris.

## Conflits et incohérences

1. **Espace fait trop de choses, et dépend d'une règle cachée sur les mains.** Selon l'objet, Espace coupe, équarrit, plante un
   coin sans geste, frappe à la masse, plante un piquet, taille par l'autre main… et maintenant attaque. « Ce qui sert » est la main
   active, sauf si elle est vide (l'autre sert), sauf si elle tient une ressource et l'autre un outil (l'outil sert). La branche est
   à la fois une ressource qu'on taille et une arme : branche active seule, Espace attaque ; branche active et hachette dans l'autre
   main, Espace taille. **Avant ce chantier, la branche en main devant un arbre disait « Sans hache, rien à faire. » ; maintenant
   elle frappe.**
2. ~~L'arme ne sert que de la main active, les outils de n'importe laquelle.~~ Réglé après le premier essai de Grégoire : une arme
   sert comme un outil (la main active, sinon l'autre si l'active est vide), toujours, dans le vide comme sur une cible. Une épée
   dans la main non active, l'active vide, ne faisait rien de visible : c'est ce qui cachait l'attaque.
3. **E et Q posent tous les deux.** E dans le vide pose ce que tient la main active, exactement comme Q ; mais E près d'une cible
   (un tas, un personnage, un objet à prendre) fait autre chose, si bien qu'on ne sait pas toujours d'avance si E va poser ou prendre.
4. **E maintenu réunit trois gestes sans rapport** : nouer, dénouer, appeler la mère. Le même appui court, devant la même cible,
   reprend une pièce du tas.
5. **R a deux sens selon les mains** : tourner ce qu'on tient (pour la pose), ou, mains vides et maintenu, pivoter une bille au
   sol. En construction, R tourne la pièce en main : le même sens que le premier.
6. **Le nom de la touche « lâcher »** : le code et le README disent « Q », qui est la lettre QWERTY ; en AZERTY c'est **A**, et Q
   y sert à marcher à gauche. Les messages et la documentation devraient nommer la place, pas la lettre.
7. **Les dialogues ne lisent pas les touches comme le reste.** `DialogueScene` écoute E, Espace et Entrée par leur code de touche
   (la lettre E), pas par leur place via `PlayerInput` ; le choix se fait par Z/S (W/S) et les flèches. Un clic fait aussi
   défiler. Sans conséquence aujourd'hui (E est à la même place partout), mais c'est une deuxième lecture du clavier.
8. **Échap ne sert qu'à arrêter un travail ou une passe.** Pas de menu, pas de pause, pas d'annulation d'une attaque ou d'un geste : un coup parti va au bout.
9. **Maj** : courir en jeu, accélérer la caméra et étendre le clic droit en construction. Cohérent, mais à garder en tête.
10. **Deux armes en main** : Espace attaque avec celle de la main active, Tab change d'arme. Rien ne dit à l'écran qu'on est « en
    garde » ; tenir une ou deux branches ne change rien (voulu pour ce chantier).
11. **Un coup dans le vide** : gratuit avec un outil, payé avec une arme (choix de Grégoire, 1er novembre 2026 : c'est le geste qui
    fatigue).
12. **Le poing remplace le message des mains vides** : mains vides devant un arbre, Espace donnait « Sans hache, rien à faire. » ; il
    donne maintenant un coup de poing (deuxième passe du combat, 1er novembre 2026). Un piquet dans l'autre main se plante toujours.

## À trancher

- **Une touche d'attaque à part** (ou le clic gauche) plutôt qu'Espace partagé avec les outils ? Elle réglerait 1, 2 et une partie
  de 10, et laisserait la branche être à la fois ressource et arme sans ambiguïté.
- **E dans le vide qui pose** : le garder (rapide), ou laisser poser à Q seul (E ne ferait que prendre et parler) ?
- **La règle des mains** pour Espace : une seule (toujours la main active, Tab pour choisir), ou la règle actuelle étendue aux armes ?
- **E maintenu** : réserver l'appui long aux gestes sur un tas (nouer, dénouer) et donner un autre chemin à l'aide de la mère ?
- **Échap** : lui donner un rôle général (annuler le geste en cours, puis un menu), ou le garder pour le rail ?
- **Nommer les touches par leur place** dans tous les textes (« lâcher : la touche à droite de Tab »), et faire lire les dialogues
  par `PlayerInput`.
