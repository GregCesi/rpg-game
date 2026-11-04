# Chantier « forgeron » : cadrage

Le forgeron du village, en essai. Rien ne change dans le jeu : des planches dans `.art-preview/`, des dessins dans
`art/proposals/`, des outils `tools/essai-forgeron*.ts`.

## 1. Ce que j'ai lu

- `CLAUDE.md`, `docs/STYLE.md` (section 6, les personnages : frame de 32 × 48, pieds à y=45, le portrait fait référence pour les
  couleurs ; section 8, le gabarit : 5 cm par pixel, les personnages à 12 px de large).
- Xéros (`art/characters/xeros.ts`, 12 × 32 px pour 1,60 m) et la mère (`art/characters/mother.ts`), leurs portraits 64 px
  (`art/portraits/`). Leur tête fait à peu près un tiers de leur hauteur : le style du jeu a déjà une grosse tête.
- Les deux essais ratés (`art/proposals/forgeron.ts`, planche `tools/essai-forge-forgeron.ts`, régénérée dans
  `.art-preview/forge-forgeron.png`) :
  - essai 1 : visage rond et doux, cheveux raides en rideau autour d'un visage étroit, aucune carrure : féminin ;
  - essai 2 : 18 × 38 px, tête de 12 px de large sur des épaules de 18 px (rapport 1,5) ; à x1, il se lit comme un Xéros allongé, pas
    comme un colosse. De face, un rectangle d'un seul tenant : les bras ne se détachent pas du torse. Le portrait a des rides et des
    joues creusées : vieux et dur.
- La forge du jeu (plan `forge`, posée à l'entrée ouest du village) et sa visite (`tools/test-forge-visite.ts`), pour la planche du
  forgeron devant l'enclume. Le zoom de départ du jeu est x3 (`ZOOM_STEPS.start` de `src/config.ts`).

## 2. Comment rendre la masse à cette taille

- **La silhouette en V, pas le rectangle.** Ce qui ratait l'essai 2, c'est que la largeur était la même de haut en bas. Ici, les
  épaules débordent de loin (deltoïdes ronds, 24 à 26 px de large d'un bout à l'autre), la taille rentre (16 à 18 px aux hanches), les
  jambes sont solides mais moins larges que le haut. À x1, c'est cette pente qui dit « colosse ».
- **Les bras décollés.** Un pixel ou deux d'air (ou d'ombre du flanc) entre le bras et le torse, du deltoïde au coude, les mains
  posées à l'écart des hanches. Des avant-bras plus larges que le haut du bras, des poings de 3 à 4 px.
- **Le cou de taureau.** Le cou aussi large que la mâchoire, les trapèzes qui descendent en pente du cou aux épaules : la tête semble
  posée sur le torse.
- **La poitrine en tonneau sous le tablier.** La bavette du tablier est plus étroite que la poitrine : les pectoraux débordent de part
  et d'autre, le haut de la poitrine nu au-dessus. Les flancs nus entre le tablier et les bras.
- **La force, pas la graisse.** Pas de ventre, pas de bajoues : les volumes se dessinent par des ombres franches (le creux sous le
  deltoïde, le pli du coude, le bord du pectoral), une lumière en haut à gauche.
- **La grosse tête, lisible.** 14 px de large environ (Xéros : 12), soit un peu plus que les vraies proportions d'un homme de 1,95 m.
  Le visage carré : mâchoire large dont l'angle se voit, menton fort, nez fort, des yeux calmes (un pixel de paupière, pas de
  sourcils froncés), la moustache blonde. Aucune ride, aucune ombre de joue creuse.
- **Les cheveux.** Blond doré chaud, jusqu'aux épaules ou un peu plus, en mèches séparées par des ombres (pas un rideau d'une seule
  couleur), deux ou trois mèches qui tombent sur le front, les pointes qui ondulent sur les épaules ; un reflet clair par mèche.
- **Les couleurs nouvelles.** Le cuir épais du tablier (une rampe de quatre bruns), le blond doré (une rampe de quatre, plus chaude que
  le chaume de l'essai 2), la peau hâlée. Elles sont déclarées dans le dessin d'essai (`art/proposals/forgeron-colosse.ts`) ; elles
  entreront dans `art/palette.ts`, nommées, quand le personnage sera intégré (aucun fichier du jeu ne change dans ce chantier).

## 3. Les écarts au gabarit (voulus, à déclarer à l'intégration)

| Écart | Gabarit | Forgeron | Raison |
|---|---|---|---|
| Hauteur | 1,95 m → 39 px | 39 px | conforme |
| Largeur | personnages à 12 px (60 cm) | 24 à 28 px | sa carrure est le personnage ; les bras écartés comptent |
| Tête | proportions des personnages du jeu | environ 14 × 13 px | lecture du visage et du caractère (comme le têtard : tête stylisée) |
| Frame | 32 × 48 | 32 × 48 si la silhouette tient dans 30 px ; sinon 40 × 48 | voir question 4 |

## 4. Les variantes proposées

Trois corps, trois têtes, trois coiffures, de face (planche `forgeron-variantes.png`) :

- **A, « le chêne »** : le V le plus marqué (épaules les plus larges, taille la plus serrée), bras longs et décollés ; tête carrée ;
  cheveux aux épaules, raie sur le côté, deux mèches sur le front. *Recommandée* : c'est la plus lisible à x1, la force sans la
  lourdeur.
- **B, « le bœuf »** : plus trapu, le tronc le plus épais (le tonneau), le cou le plus large ; tête la plus large ; cheveux plus
  longs, passés les épaules, une mèche qui barre le front.
- **C, « le géant tranquille »** : poitrine haute, bras les plus énormes, la tête la plus grosse ; cheveux rejetés en arrière qui
  ondulent, deux mèches qui retombent devant les oreilles.

## 5. Les questions (chacune avec ma recommandation)

1. **Quelle variante ?** Je recommande **A**. On peut aussi prendre le corps de l'une et la tête ou les cheveux d'une autre.
2. **Cheveux lâchés ou attachés ?** Je recommande **lâchés** comme allure de tous les jours (c'est ce qui le distingue de loin), et les
   cheveux attachés réservés aux gestes de la forge, plus tard.
3. **Rasé avec la moustache, ou la barbe de quelques jours ?** Je recommande **rasé avec la moustache** (ta description) ; la barbe de
   quelques jours est sur la planche des portraits pour comparer.
4. **La frame :** je recommande de **garder 32 × 48** si la variante choisie tient dans 30 px de large ; sinon une frame de 40 × 48 pour
   lui seul (à vérifier à l'intégration : les points d'accroche et les gestes sont calés sur 32 × 48).
5. **Les brassards de cuir :** je recommande **oui, aux deux avant-bras**, sobres (deux pixels de cuir) : ils disent le métier et
   soulignent les avant-bras.
6. **La collision aux pieds** (pour plus tard) : je recommande **14 × 8 px (70 × 40 cm)** au lieu de 10 × 8, pour qu'on ne le
   traverse pas par les épaules.
7. **Son nom :** en as-tu un ? Sinon je proposerai trois noms à la prochaine étape, avec son dialogue d'accueil.

## 6. Les planches

- `.art-preview/forgeron-variantes.png` : A, B et C de face, x4 puis x1, avec Xéros et la mère, et l'essai 2 en x1 pour comparer
  (`npx tsx tools/essai-forgeron.ts`).
- `.art-preview/forgeron-vues.png` : la variante A de face, de profil et de dos, x4 et x2, cheveux lâchés et attachés (même outil).
- `.art-preview/forgeron-portrait.png` : les portraits 64 px des trois variantes, rasé et barbe de quelques jours, avec ceux de
  Xéros et de la mère (`npx tsx tools/essai-forgeron-portrait.ts`).
- `.art-preview/forgeron-forge.png` : la variante A dans la forge du jeu, devant l'enclume, x2 et au zoom de départ (x3)
  (`npx tsx tools/essai-forgeron-forge.ts`).

Pas d'animation : on choisit d'abord le personnage.

## 7. Ce que Grégoire a décidé (4 novembre 2026)

- **Le forgeron** : le corps et les cheveux de C (« le géant »), la tête T1 « le rectangle » (essai 4), le menton M2 « en avant »
  (essai 5), pour le sprite comme pour le portrait (`art/proposals/forgeron-final.ts`, planche `.art-preview/forgeron-final.png`,
  `npx tsx tools/essai-forgeron-final.ts`).
- Les recommandations du §5 sont validées : cheveux lâchés au quotidien, rasé avec la moustache, brassards de cuir aux deux
  avant-bras, frame de 32 × 48, collision de 14 × 8 px aux pieds.
- Pas de nom pour l'instant : les noms viennent en dernier. On l'appelle « le forgeron » (clé `smith` proposée pour le code).

Les essais intermédiaires (`forgeron-colosse.ts`, `forgeron-tetes.ts`, `forgeron-tetes-portraits.ts`) restent dans
`art/proposals/` : le dessin final les assemble.

## 8. Pour le mettre en jeu (propositions, à décider ensemble)

Chaque point est une proposition avec ma recommandation. Rien n'est fait : c'est le prochain chantier.

### 8.1 Ce qui entre dans le jeu

- Le sprite `art/characters/smith.ts` (tiré de `forgeron-final.ts`), déclaré dans `art/index.ts` ; le portrait
  `art/portraits/smith.ts`, image `portrait-smith-64` ; ses couleurs nommées dans `art/palette.ts` (le blond doré, le cuir épais, la
  peau hâlée, la toile sombre).
- Son entrée dans `src/content/characters.json` : `"smith": { "name": "Le forgeron", "portrait": "smith" }`. Le nom affiché changera
  quand il aura un vrai nom.
- Ses écarts au gabarit (§3 : 24 à 28 px de large, la tête stylisée) déclarés dans `docs/STYLE.md`, comme le têtard.
- La collision de 14 × 8 px aux pieds. Aujourd'hui, la boîte des pieds est la même pour tous les acteurs (10 × 8) : il faudra la
  rendre réglable par personnage. *Recommandé* : un champ `body` (largeur, profondeur en px) dans `characters.json`, lu par `Actor`,
  10 × 8 par défaut.

### 8.2 Ses animations

Comme la mère : la gauche est la droite retournée. Le dessin de chaque image passe par le pixel-artist.

1. **Au repos** (`idle-down/up/right/left`) : deux images de respiration, la poitrine qui monte d'un pixel. *Recommandé* : oui, dès le
   départ, c'est le minimum d'un PNJ.
2. **La marche** (`walk-down/up/right/left`) : quatre images par direction, un pas lourd et lent (le corps qui descend d'un pixel au
   contact, les bras qui balancent peu, les cheveux qui suivent avec une image de retard). *Recommandé* : la dessiner tout de suite,
   même si les PNJ ne marchent pas encore : sa journée en aura besoin (8.4), et c'est la meilleure vérification que les trois vues font
   un même personnage.
3. **Le travail à l'enclume** (`work-down`) : debout derrière l'enclume, tourné vers le sud (on voit son visage), la pince et le fer
   rouge dans la main gauche, le marteau dans la droite. Cinq images : le marteau levé haut, au-dessus de l'épaule, l'abattu, le coup
   (une étincelle de deux ou trois pixels sur le fer), le rebond. Le fer rouge garde sa lueur (un ou deux pixels clairs). *Recommandé* :
   ces cinq images, de face seulement, le marteau et la pince dessinés dans le corps (pas d'objet tenu séparé, comme les outils de
   Xéros : il n'en change jamais), à environ un coup par seconde, avec une pause de souffle tous les huit coups.
4. **Plus tard**, pour une forge vivante : souffler le feu (la perche du soufflet, de dos), tremper le fer dans l'auge (de profil, la
   vapeur). *Recommandé* : après le premier passage en jeu.
5. **Parler** : il pose le marteau sur l'enclume et se tourne vers Xéros (son `idle` dans la direction de Xéros, comme la mère), puis
   reprend le travail à la fin du dialogue.

Le moteur : un PNJ n'a aujourd'hui qu'une pose possible, `sit` (`NpcSchema` de `types.ts`, `entities/Npc.ts`). *Recommandé* : ouvrir
`pose` à `work` (l'animation `work-<direction>` de son sprite, jouée en boucle), et arrêter cette pose pendant le dialogue. Pas de
nouveau système : une valeur de plus et deux lignes dans `Npc`.

### 8.3 Sa place dans la forge

- **Derrière l'enclume, tourné vers le sud** (la pose de la planche finale) : on le voit de face depuis la rue en arrivant, l'enclume
  entre lui et Xéros, le feu derrière lui. *Recommandé.*
- Autre place : devant le feu, de dos, à souffler (on ne verrait pas son visage).
- Le placer : un point `Npc` dans le plan `forge` (`npcs` du plan, comme la mère dans sa maison), sans `inside`, puisque la forge est
  un abri ouvert sans intérieur. *Recommandé* plutôt qu'un point dans `village.tmj` : il suit la forge si on la déplace.
- À vérifier : sa collision de 14 × 8 px ne doit pas fermer le passage vers le feu (`npm run test:forge-visite` mène Xéros devant le
  feu). Si oui, le reculer de quelques pixels ou faire passer la visite par l'est de l'enclume.
- La lueur de la forge : aujourd'hui, le feu brûle toujours. Plus tard, il pourrait n'être allumé que pendant les heures de travail du
  forgeron.

### 8.4 Sa journée

Les routines des PNJ ne sont pas encore dans le jeu (CONCEPTION, « Plus tard : les routines des PNJ »). Trois niveaux :

1. **Toujours à l'enclume, au travail**, de jour comme de nuit. Simple, mais faux la nuit.
2. **Selon l'heure, sans marcher** : `work` à l'enclume de 7 h à 12 h et de 13 h à 19 h, `idle` assis sur le billot ou adossé au
   râtelier à midi, absent la nuit (rentré chez lui : son logis est mis de côté). Il apparaît et disparaît hors de la vue de Xéros.
3. **Une vraie journée, à pied** : il arrive le matin par la rue, allume le feu, puise de l'eau au puits, va chercher du charbon à
   l'abri, travaille, mange à midi sur le banc devant la forge, rentre le soir. Il faut la marche (8.2) et un moteur de routines.

*Recommandé* : le niveau 1 pour l'entrée en jeu, puis le niveau 2 dès que le premier moteur de routines existe (il servira aussi à la
mère), avec ses heures dans les données (`characters.json` ou un `schedule` à part, jamais en dur). Le niveau 3 vient avec son logis.

### 8.5 Ses premiers dialogues

Le format : `src/content/dialogues.json` (lignes `speaker`, `expression`, `text` ; deux ou trois choix à la dernière ligne). Son ton :
calme, peu de mots, bienveillant, un peu d'humour tranquille ; il connaît Xéros (le village est petit) et lui parle comme à un garçon
qu'il a vu grandir.

- **Les expressions du portrait** : `neutral` (le portrait final). *Recommandé* : y ajouter `smile` (la moustache qui remonte, les
  yeux plissés), le seul changement de son visage qui compte pour lui.
- **Une seule réplique au début** (le moteur lance toujours le même dialogue pour un PNJ). Trois propositions :
  - A : « Tiens, le petit de la ferme. » / « Fais attention, le fer est chaud. Si tu as besoin d'un outil, tu sais où me trouver. »
  - B : « Bonjour, Xéros. » / « Assieds-toi si tu veux. Le feu, ça se regarde longtemps. »
  - C : « Ta mère va bien ? » / « Dis-lui que sa serpe est prête. Je la lui porterai demain. »
  *Recommandé* : A. Elle dit qui il est (le forgeron), son lien avec Xéros et ce qu'il fera dans le jeu (les outils de fer : il est le
  métier `forgeron` de `trade`).
- **Plus tard**, quand la partie se souviendra des rencontres (un indicateur dans GameState) : la première rencontre (A) puis une
  réplique courte tirée au hasard parmi trois ou quatre (« Le fer n'attend pas. », « Belle journée pour travailler. »). Puis les
  vrais échanges : acheter un outil, apporter du charbon ou de la ferraille, apprendre à forger.
- Pendant le dialogue, il pose le marteau et se tourne vers Xéros (8.2), puis reprend le travail.

### 8.6 Les vérifications à l'intégration

`npm run check` (le personnage, son portrait, son dialogue), `npm run art:preview` (la planche du personnage à côté de Xéros),
`npm run test:forge` et `npm run test:forge-visite` (la forge et son passage), une capture du forgeron au travail dans la forge, au
zoom de départ.

### 8.7 L'ordre proposé

1. Les animations, sur une planche, par le pixel-artist : le repos et le travail à l'enclume, puis la marche.
2. L'entrée en jeu au niveau 1 : le sprite, le portrait, `characters.json`, la collision réglable, la pose `work`, sa place dans le plan
   `forge`, la réplique A.
3. Plus tard : sa journée (niveau 2), les dialogues qui changent, son nom, son logis.
