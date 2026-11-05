# Chantier « hauteurs » : la hauteur physique des pièces de bois

Origine : CADRAGE-coq.md, section 12.16 (branche maison-coq, 89e786c). Règle : une seule physique, réaliste ; la hauteur physique
vient toujours des données, jamais du dessin.

## 1. Le défaut, mesuré

`woodDims` (src/world/woodPiece.ts) ajoute `CONTOUR_CM` (10 cm, un pixel de chaque côté) à la section couchée de la pièce de bois :
une bille du normal (30 cm) compte 40 cm de haut, une poutre (20 cm) 30, une planche (3 cm) 13. Ce `dims.h` sert à :

| Usage | Où | Effet du changement |
|---|---|---|
| empilement du mode construction (ce qui porte quoi, la visée, les encoches) | `sizeOf`, `boxOf`, `supportAt`, `aimAt` (world/build.ts), `judge` (world/joints.ts), systems/build.ts | une pièce posée sur du bois couché descend de 10 cm |
| les dessus qui se marchent, la petite carte, les créatures | ce qui lit `boxOf` ou `def.dims.h` | suivent tout seuls |
| les tas de bois calculés | `woodPlaces` (world/woodPile.ts) : montée d'une couche = pas × (h / d) | voir 2.4 |
| l'arme improvisée | `heft.ts` | la longueur domine : quasi rien |
| le gabarit des dessins | validate.ts (silhouette des pièces de bois), tools/test-poteaux.ts | le dessin garde son contour : voir 2.2 |

La pièce debout (poteau) n'est pas touchée : sa hauteur est déjà sa longueur.

## 2. Ce que je change

### 2.1 Le moteur
- `woodDims` rend la **section vraie en hauteur** (bille 30, poutre 20, demi-bille 15, planche 3…) : plus de `CONTOUR_CM` dans `h`.
- **L'emprise au sol (largeur en travers) garde son contour** dans ce chantier : voir question Q1.
- Rien d'autre à changer dans le moteur : tout lit `boxOf` / `sizeOf`. Les tests rapides le vérifient (test-build, test-contrats).

### 2.2 Le gabarit
Le dessin d'une pièce de bois reste ce qu'il est (contour compris). `woodDrawnDims(piece)` (woodPiece.ts) = les dimensions vraies
plus le contour, pour le seul gabarit (validate.ts, test-poteaux) : la règle « un dessin tient dans ses dims » reste vraie pour tout
le reste. Une phrase dans docs/STYLE.md section 8 : la pièce de bois se dessine à sa section plus son contour ; posées l'une sur
l'autre, deux pièces se recouvrent de 2 px.

### 2.3 Ce qui se voit : le recouvrement de 2 px
Deux rondins posés l'un sur l'autre à leur hauteur vraie : le dessin du dessus recouvre le haut de celui du dessous de 2 px (son
contour du bas et une rangée de bois). Aujourd'hui les deux contours se touchent (un trait sombre de 2 px) ; après, il reste le
seul contour du bas du rondin du dessus (1 px). C'est l'objet de la planche (section 5).

### 2.4 Les tas de bois
La montée d'une couche est le pas au sol × (hauteur / largeur de la section). Je prends la **section vraie des deux côtés** (pas un
mélange vrai / dessiné) :
- **bille, rondin, poutre** : rapport 1 avant comme après, **les tas ne bougent pas** (le tas de billes de la planche est identique) ;
- **demi-bille, quartier, planche, latte** : leurs couches se serrent (demi-bille du gros, la seule qui existe : 0,58 → 0,51 ; planche : la couche
  monte de ses 3 cm, le tas de planches devient plat comme il l'est en vrai). À voir sur `.art-preview/piles.png`.

## 3. Le recalage des cinq plans

Script `tools/recale-hauteurs.ts` (lancé avant le changement du moteur, rangé dans `.poubelle/tools/` après usage). Essai déjà
lancé : les plans « après » sont dans `.art-preview/hauteurs/` ; aucun jour (pièce dont un appui ne la touche plus).

- **forge, grange, étal** : chaque pièce descend sur le nouveau dessus de ce qui la portait. Forge : 9 pièces descendent de 10 cm
  (le toit, les pignons, les poinçons), grange 8, étal 1 (l'auvent). Rien d'autre ne bouge.
- **maison de Xéros** : la descente seule ouvrirait un jour de 10 cm sous la sablière : les poteaux (180) et les remplissages (180)
  sont posés sur la traverse basse (poutre couchée, qui perd 10 cm), les baies de porte (huisseries de 180 sur le seuil de pierre,
  tête de 50) non. **Proposition : le solin passe de 40 à 50 cm** (`rough-sill-wall`, `narrow-sill-wall`) : la traverse basse va de
  50 à 70 au lieu de 40 à 70, et tout ce qui est au-dessus reste à sa hauteur. Le toit (sur la sablière, poutre couchée) descend de
  10 cm. 24 pièces bougent. Le dessin du solin (calculé par walls.ts) monte de 2 px et se dessine bien (planche) ; `SILL_FACE` (8, en dur dans src/world/walls.ts) devient lu dans la hauteur du mur. (Autres voies : la tête
  de baie de 50 à 40 cm, ou des huisseries et des portes de 170 : plus de dessins, Q3.)
- **cabane** : la descente seule casse la cabane : la porte (2 m) et le volet (40 cm) ont été calés sur des rondins de 40.
  **Proposition : la remonter à 30 cm par rondin, 7 assises au lieu de 5**, la même hauteur de murs (2,52 m), le même toit, les mêmes
  pignons et la même faîtière (43 → 54 pièces, 56 encoches). Il faut alors :
  - **la porte** : le linteau tombe à 2,22 m (sur une assise), la porte en fait 2 : **porte de 2,10 m** (`plank-door`, 2 px de plus,
    elle ne sert qu'à la cabane) ;
  - **la fenêtre** : une assise fait 30 cm, le volet 40. **Fenêtre sur deux assises (60 × 60 cm)**, avec soit le volet actuel (60 ×
    40, un jour de 20 cm au-dessus), soit un **volet de cabane de 60 × 60** (nouvel objet : fiche, vues, âges, ouvert et fermé). Le
    volet actuel sert aussi aux 7 fenêtres de la maison : on ne peut pas le changer de taille.
- Les plans enregistrés sont ensuite **réécrits par leurs scénarios de montage** (`PLANS_WRITE=1`), après mise à jour de leurs
  hauteurs attendues (test-cabane.ts, tools/lib/maison-xeros.ts, tools/lib/forge.ts, test-grange.ts, test-etal.ts) ; le plan du
  script et celui du scénario doivent être identiques (contrôle).
- La branche **maison-coq** attend ce chantier : ses plans devront passer par le même script (gardé dans .poubelle/ pour ça).

## 4. Les parties sauvegardées

Les bâtiments posés (les plans semés à la première visite et ce qui est bâti au bac à sable) sont dans `builds` de GameState, avec
leurs anciennes hauteurs. **Recommandation : `SAVE_VERSION` 31 → 32** (message clair, partie neuve, les bâtiments revenus de leurs
plans recalés). Un recalage à la lecture referait la descente ci-dessus sur chaque carte, mais ne saurait pas refaire la cabane ni
élever un solin : il laisserait des bâtiments à demi faux.

## 5. La planche (pixel-artist) : `.art-preview/hauteurs-avant-apres.png`

Avant / après, en x2 et en x4 : la cabane en rondins (proposition 3 : 7 assises, porte 2,10 m, la fenêtre avec les deux volets), les
poutres de la maison de Xéros (un angle : solin, traverse basse, poteau, sablière, entrait, le solin de 50 cm), un tas de billes (et
de demi-billes, qui changent), la forge. Avec Xéros pour l'échelle et la proposition pour que le recouvrement se lise.

### Ce que montre la planche (pixel-artist, `tools/essai-hauteurs.ts`)
- Aucun jour, aucune pièce mal triée dans les plans « après ». Un jour d'un pixel existait déjà sous le pignon de la cabane : il disparaît.
- La fenêtre de la cabane ne se lit qu'en coupe (les assises nord-sud se couvrent en règle D, déjà le cas aujourd'hui) : entre le volet
  actuel (A) et le volet de cabane (B), la différence ne se voit presque qu'en coupe.
- Les bouts sud des murs nord-sud de la cabane font 14 marches de pixel au lieu de 10 (7 assises).
- **Le recouvrement, trois façons** : A brut (il reste le contour du bas du rondin du dessus : les rondins paraissent plats), B une
  ombre douce d'une rangée (la teinte d'ombre translucide) sur le rondin du dessous, juste sous celui du dessus, C la même ombre
  opaque (le mur devient rayé). **Recommandé : B**, calculée par le jeu à l'affichage (jamais peinte) : sous chaque pièce couchée
  posée sur une autre pièce couchée, là où celle du dessous se voit encore (`jointShade`, dans le dessin des pièces posées).
- Dessins proposés : `art/proposals/cabane-hauteurs.ts` (porte de 2,10 m, volet de cabane 60 × 60), `art/proposals/walls-solin-50.ts`.

## 6. Scénarios et tests touchés

- tests rapides : test-build (la cabane, ses intérieurs), test-contrats (`woodDims`), test-poteaux, les tas (test-matiere), validate
  (gabarit, porte-à-faux sur les plans recalés) ;
- scénarios : `test:cabane`, `test:maison`, `test:forge`, `test:grange`, `test:etal` (les plans réécrits), `test:forge-visite`,
  `test:interieur`, `test:construction`, `test:monde` (les plans semés), `test:tas`, `test:poteaux`, `test:contrats` ;
- docs : CONCEPTION (« La maison de Xéros » : solin 0–50, traverse 50–70 ; « La cabane en rondins »), STYLE section 8, les fiches
  `docs/objets/` du solin, de la porte en planches (et du volet de cabane si retenu).

## 7. Fusion

Chantier moteur : fusion d'origin/main, `npm run build`, la suite complète des scénarios (deux à la fois si la machine est chargée)
et `test:contrats` sur le dernier commit, puis fusion dans main et push. Un échec d'avant (les sangliers sous la charge) sera dit,
pas tu.

## 8. Questions

- **Q1. L'emprise** : la largeur en travers garde aussi ses 10 cm de contour (une bille fait 40 cm de large au mode construction).
  Je propose de ne corriger que la hauteur ici : l'emprise déplace tout en x et y (l'affleurement au solin, les croisements de la
  cabane, la grille de 20 cm) ; un chantier « emprises » à part si tu le veux.
- **Q2. La cabane** : 7 assises à la même hauteur de murs (proposé), ou 5 assises et une cabane plus basse (porte et fenêtre à
  refaire quand même) ?
- **Q3. La maison** : le solin à 50 cm (proposé, un seul changement, tout le haut de la maison garde ses hauteurs), ou la tête de baie
  à 40 cm (le toit descend de 10), ou les huisseries et les portes à 170 ?
- **Q4. La porte de la cabane** à 2,10 m (proposé), ou un jour de 10 cm sous le linteau ?
- **Q5. La fenêtre de la cabane** : le volet actuel avec un jour de 20 cm, ou un volet de cabane de 60 × 60 (nouvel objet) ?
- **Q6. Le recouvrement** : A brut, B ombre douce calculée par le jeu (recommandé), ou C ombre franche ?
- **Q7. Les sauvegardes** : `SAVE_VERSION` (proposé) ?
