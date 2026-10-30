# Audit des tailles

> **Mise à jour (chantier « largeur », 30 octobre 2026)** : corrigés, marqués **✔ corrigé** plus bas : Xéros et la mère amincis à 12 px (60 cm), la mère à 32 px (160 cm), collision de Xéros 10 × 8 px ; tonneau, caisse, coffre, tabouret, botte de foin, bougie, lanterne redessinés à leur vraie taille ; puits déclaré à 215 cm. Tous sortis d'`EXCEPTIONS` (seul reste `big-pollard`). Non touchés, pour le chantier « maison » : cheminée, tables, murs, portes, `maison.tmj`. Les mesures et verdicts ci-dessous sont ceux de l'audit d'origine.

Rapport de lecture : aucun dessin, aucune dimension de `props.json`, aucune `EXCEPTIONS` n'a été changé. Mesures prises le 30 octobre 2026 sur la branche `realisme` (`npm run art`, `src/generated/manifest.json`, `expectedSize` de `src/content/gabarit.ts`). Image : `.art-preview/audit-tailles.png` (`npm run art:preview`, outil `tools/lib/audit-preview.ts`) : chaque objet hors gabarit à côté de Xéros, à la même échelle, avec en jaune la taille attendue d'après les dimensions déclarées et en cyan celle d'après les dimensions proposées ici.

Conventions : 5 cm par pixel ; « dessiné » = silhouette contour compris (ombre exclue) ; « attendu » = `expectedSize` (de la taille réelle au plancher de lisibilité de 6 px) ; écart = dessiné − attendu, en px, largeur × hauteur ; tolérance 2 px. Verdicts : **conforme**, **à redessiner**, **stylisé, à décider par Grégoire**.

Constat d'ensemble : sur les 68 objets de `props.json`, seuls 9 sont nommés dans `EXCEPTIONS`, et le validateur est satisfait partout. Mais beaucoup de dimensions déclarées ont été **ajustées sur le dessin** (la cheminée « fait » 3,20 m de large, la planche de cuisine 3,10 m, l'établi 3,20 m) : le gabarit est respecté, la plausibilité ne l'est pas. Les dimensions « proposées » ci-dessous sont celles d'un objet paysan médiéval ; là où elles diffèrent des déclarées, l'écart est calculé sur les proposées.

## Les deux sujets connus

### (a) La largeur de Xéros — ✔ corrigé

Décision : option (2), 12 px (60 cm) ; essai `.art-preview/essai-largeur.png` (`npm run art:essai`). Tout ce qui suit décrit l'état avant correction.

- Silhouette de Xéros : 18 × 32 px = **90 × 160 cm** (la mère : 18 × 34 px = 90 × 170 cm). Un adulte fait 45 à 50 cm d'épaule à épaule : la silhouette est environ **1,8 à 2 fois trop large**. Rapport largeur / hauteur : 0,56 (réel : ≈ 0,28-0,30). Le gabarit le prévoit (« les personnages gardent leur largeur stylisée »), c'est un choix, pas une erreur de mesure.
- Collision de Xéros : `body.setSize(14, 8)` (`src/entities/Actor.ts`) = **70 × 40 cm**, centrée : 2 px de sprite dépassent de chaque côté. 70 cm est une largeur de passage vraisemblable (un adulte + bras + vêtements : 55-65 cm) ; c'est la silhouette qui est large, pas la collision.
- Seau (Ø 30 cm) : **6 px**, soit **le tiers** de Xéros (18 px), 43 % de sa collision (14 px). Réel : un seau fait 60 % des épaules. Le seau est donc plus étroit que le corps, et de loin ; il n'a pas à « passer » dans une collision (c'est un obstacle : `body` 6 × 3 px = 30 × 15 cm), mais un trou de 6 px entre deux obstacles ne laisse jamais passer Xéros (14 px) : un seau posé contre un mur à 8 px (40 cm) le bloque, ce qu'un vrai corps de 45-50 cm ferait aussi. Pas de bug de gameplay.
- Jarre (Ø 45 cm) : **9 px**, la moitié de Xéros (réel : ≈ largeur d'épaules, 1 pour 1). Tonneau (Ø 60 cm, dessiné **19 px = 95 cm**) : aussi large que Xéros (18 px) ; réel : 1,3 fois ses épaules. Le tonneau, la caisse (19 px) et le coffre (25 px) paraissent donc « à l'échelle de Xéros » parce qu'ils sont, eux aussi, trop larges (voir les tables) : les deux erreurs se compensent à l'œil, mais pas avec les objets bien dimensionnés (seau, jarre, billot, sac).
- Pistes (à décider) : (1) garder 18 px et le dire (stylisation, comme la tête du têtard) ; (2) amincir Xéros à 12-14 px (60-70 cm, encore généreux) : tous les cadres de ses planches (`xeros`, `mother`, gestes, `held-*`, `hold.json`) sont à reprendre, travail du pixel-artist ; (3) ne rien dessiner et ne corriger que ce qui est le plus choquant (tonneau, caisse, tabouret, coffre trop larges).

### (b) L'intérieur de la chaumière

| | Largeur | Profondeur | Surface |
| --- | --- | --- | --- |
| Extérieur `cottage` (dims 1660 × 780 × 610 cm) | 332 px = 16,6 m = **10,4 cases** | 156 px = 7,8 m = **4,9 cases** (sol) | 129 m², 50,6 cases |
| Longère de CONCEPTION (9 × 4 cases de 1,60 m) | 14,4 m | 6,4 m | 92 m² |
| `maison.tmj`, carte entière (23 × 12 cases de 32 px) | 736 px = **36,8 m** | 384 px = **19,2 m** | 706 m² (5,5 × l'extérieur) |
| `maison.tmj`, sol praticable (colonnes 4 à 21, rangées 3 à 10) | 18 cases = 28,8 m | 8 cases = 12,8 m | 369 m², 144 cases (**2,9 × l'extérieur**) |

- L'image `cottage` mesure 332 × 200 px (hauteur 200 = H 122 + D/2 78) : l'extérieur donne une maison de 16,6 × 7,8 m au sol, déjà **15 % plus longue et 22 % plus profonde** que la longère de CONCEPTION (14,4 × 6,4).
- **L'intérieur n'est pas cohérent avec l'extérieur** : le sol praticable seul fait 1,7 fois la longueur et 1,6 fois la profondeur de l'emprise extérieure (2,9 fois sa surface) ; la carte entière, murs et annexe compris, 2,2 fois sa longueur et 2,5 fois sa profondeur. Un intérieur ne peut pas dépasser l'emprise du bâtiment. Pour être cohérent avec la longère de CONCEPTION (9 × 4 cases) il faudrait un sol d'environ 8 × 3 cases entre les murs, soit une carte d'environ 11 × 7 (au lieu de 23 × 12).
- Les objets intérieurs sont d'ailleurs à des échelles différentes de la carte : la cheminée (3,20 m de large, 4,15 m de haut) et les établis (3,1-3,2 m) ont été dimensionnés pour remplir cette grande salle. Corriger la carte sans corriger ces trois objets laisserait une cheminée qui occupe la moitié d'un mur.
- Murs de `art/interior/house.ts` : face de 64 px = **3,20 m de haut** (réel : 2,0-2,5 m) ; dessus de mur (`wall-top`) de 32 px = 1,60 m d'épaisseur (réel : 0,5-0,6 m, torchis ou pierre) ; porte du fond 26 × 52 px = **1,30 × 2,60 m** (réel : 0,8 × 1,7 m) ; poteaux 6 px = 30 cm ; fenêtres 22 × 18 px = 1,10 × 0,90 m (acceptable) ; ouverture `doorway` 22 px = 1,10 m (acceptable) ; cloison `partition` 10 px = 50 cm (épaisse pour une cloison de planches : 5-10 cm, mais le plancher de lisibilité la permet).
- Décision à prendre : (i) refaire `maison.tmj` à l'échelle de l'extérieur (carte plus petite, murs plus bas), en gardant les objets déclarés ; ou (ii) agrandir l'extérieur (`cottage` à 30-35 m : ce n'est plus une longère paysanne). Recommandation : (i).

## Objets du monde (`props.json`, hors mobilier)

« Décl. » : dimensions déclarées w × d × h en cm. Pour les arbres, la hauteur déclarée est celle de la boîte englobante, pas la taille d'un arbre réel (voir note).

| Objet | Décl. (cm) | Dims réelles proposées (cm) et source | Dessiné | Attendu | Écart | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| big-tree | 270 × 270 × 565 | conserver ; tronc 55 cm | 54 × 140 | 54 × 140 | 0 × 0 | conforme (note arbres) |
| big-pollard (EXC) | 270 × 120 × 370 | conserver ; têtard : houppier taillé à 3,7 m | 54 × 79 | 54 × 86 | 0 × −7 | stylisé, à décider (tête stylisée, choix de Grégoire) |
| big-felled-section-1 à 3, big-felled-log-1 à 4, big-felled-log | 95 × 65 × 65 cyl. | conserver ; bille de chêne de 55 cm de tronc, 95 de long | 19 × 13 | 19 × 14,5 | 0 × −1,5 | conforme (étalon) |
| big-felled-log-ns | 65 × 95 × 65 cyl. | conserver | 13 × 19 | 13 × 17,8 | 0 × +1,2 | conforme (étalon) |
| big-felled-crown | 260 × 120 × 90 | conserver | 52 × 30 | 52 × 30 | 0 × 0 | conforme |
| big-felled-head | 190 × 60 × 75 | conserver | 38 × 20 | 38 × 21 | 0 × −1 | conforme |
| big-tree-stump | 130 × 70 × 40 | conserver ; empattement des racines d'un tronc de 55 | 26 × 15 | 26 × 15 | 0 × 0 | conforme |
| normal-tree | 190 × 190 × 700 | conserver ; tronc 30 cm | 38 × 159 | 38 × 159 | 0 × 0 | conforme (note arbres) |
| normal-felled-section-1 à 4, normal-felled-log-1 à 5, normal-felled-log | 95 × 40 × 40 cyl. | conserver | 19 × 8 | 19 × 8,9 | 0 × −0,9 | conforme |
| normal-felled-log-ns | 40 × 95 × 40 cyl. | conserver | 8 × 15 | 8 × 14,6 | 0 × +0,4 | conforme |
| normal-felled-crown | 425 × 100 × 50 | conserver | 85 × 20 | 85 × 20 | 0 × 0 | conforme |
| normal-felled-head | 230 × 40 × 40 | conserver | 46 × 12 | 46 × 12 | 0 × 0 | conforme |
| normal-tree-stump | 60 × 55 × 40 | conserver | 12 × 14 | 12 × 13,5 | 0 × +0,5 | conforme |
| rock | 130 × 80 × 60 | conserver | 26 × 20 | 26 × 20 | 0 × 0 | conforme |
| bush, bush-berries | 135 × 90 × 55 | conserver (buisson de 1,3 m) | 27 × 20 | 27 × 20 | 0 × 0 | conforme |
| rock-rubble | 135 × 75 × 0 à plat | conserver | 27 × 15 | 27 × 15 | 0 × 0 | conforme |
| bucket | 30 × 30 × 30 cyl. | conserver ; seau de bois cerclé, Ø 30 | 6 × 11 | 6 × 9 | 0 × +2 | conforme (limite de tolérance : l'anse) |
| cottage | 1660 × 780 × 610 | 1440 × 640 × 560 selon CONCEPTION (9 × 4 cases) ; l'extérieur actuel est +15 % | 332 × 200 | 332 × 200 | 0 × 0 | stylisé, à décider (voir sujet b) |
| woodpile | 195 × 60 × 90 | conserver ; tas adossé, 2 m de long | 39 × 24 | 39 × 24 | 0 × 0 | conforme |
| chopping-block | 55 × 55 × 45 cyl. | conserver ; billot Ø 40-55 | 11 × 15 | 11 × 14,5 | 0 × +0,5 | conforme |
| chopping-block-rope | 55 × 55 × 55 cyl. | conserver | 11 × 16 | 11 × 16,5 | 0 × −0,5 | conforme |
| chopping-block-axe | 100 × 55 × 125 | conserver (billot + hache plantée, 80 cm de manche) | 20 × 29 | 20 × 30,5 | 0 × −1,5 | conforme |
| faggot | 130 × 50 × 50 cyl. | 100 × 35 × 35 (fagot de bourrées, 1 m) ; déclaré = gros fagot | 27 × 13 | 26 × 11,2 | +1 × +1,8 | conforme au déclaré ; dims à revoir si on veut un fagot commun (alors 20 × 8 : à redessiner) |
| rope-coil | 30 × 30 × 10 cyl. | conserver | 6 × 5 | 6 × 5 | 0 × 0 | conforme |
| footing-stone | 30 × 30 × 15 | conserver | 6 × 6 | 6 × 6 | 0 × 0 | conforme |
| shed-post-high | 20 × 20 × 300 | conserver ; poteau équarri de 20 cm | 4 × 62 | 4-6 × 62-93 | 0 × 0 | conforme |
| shed-post-low | 20 × 20 × 170 | conserver | 4 × 36 | 4-6 × 36-54 | 0 × 0 | conforme |
| shed-plate-north, shed-plate-south | 325 × 15 × 15 | conserver | 65 × 5 | 65 × 4,5 | 0 × +0,5 | conforme |
| shed-plate-side | 20 × 375 × 145 `ground` | conserver | 4 × 104 | 4-6 × 104-156 | 0 × 0 | conforme |
| shed-rafter | 10 × 445 × 171 `ground` | conserver | 2 × 123 | 2-6 × 123-370 | 0 × −0,2 | conforme |
| shed-roof | 365 × 445 × 165 `ground` | conserver | 73 × 121 | 73 × 122 | 0 × −1 | conforme |
| well (EXC) | 235 × 160 × 250 | 235 × 160 × 215 (margelle Ø 130 h 90, deux montants et chevron) | 47 × 59 | 47 × 59 (proposé) ; 47 × 66 (déclaré) | 0 × 0 (proposé) ; 0 × −7 (déclaré) | conforme si on déclare 215 cm de haut ; sinon stylisé. Dims à corriger, pas le dessin — **✔ corrigé (chantier largeur)** |
| sunpatch | 180 × 150 × 0 à plat | n/a (lumière) | 36 × 30 | 36 × 30 | 0 × 0 | conforme |

Note arbres : `big-tree` (« le gros grand ») est **plus bas** que `normal-tree` (5,65 m contre 7 m) alors que son tronc est presque deux fois plus gros ; et aucun des deux n'approche un vrai arbre (12-20 m). C'est une compression de l'écran (un chêne de 14 m ferait 300 px, soit 80 % de la hauteur de vue de 360 px), pas une erreur de dessin. À décider par Grégoire : arbres stylisés (conforme à leurs boîtes), mais `big-tree` devrait au moins dépasser `normal-tree` (≈ 8 m = 180 px).

## Mobilier intérieur

| Objet | Décl. (cm) | Dims réelles proposées (cm) et source | Dessiné | Attendu (proposé) | Écart | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| fireplace | 320 × 130 × 415 | **200 × 90 × 250** : âtre de ferme 1,5-2 m, manteau à 1,8 m, hotte jusqu'au plafond | 64 × 96 | 40 × 59 | **+24 × +37** | **à redessiner** (3 fois la hauteur de Xéros ; 4,15 m dépasse même les murs de 3,20 m) |
| worktable (« planche de cuisine ») | 310 × 60 × 85 | **200 × 65 × 85** : table à tréteaux 1,8-2,4 m, 65-80 de profondeur | 62 × 23 | 40 × 23,5 | **+22 × −0,5** | **à redessiner** (trop longue, 1,55 fois) |
| workbench (établi) | 320 × 70 × 85 | **200 × 60 × 85** : établi de menuisier 1,5-2 m | 64 × 24 | 40 × 23 | **+24 × +1** | **à redessiner** (trop long, 1,6 fois) |
| stove (poêle) | 80 × 70 × 200 | conserver ; poêle d'argile et conduit | 16 × 47 | 16 × 47 | 0 × 0 | conforme |
| bed (lit de la mère) | 150 × 200 × 80 | conserver ; lit à cadre 140-150 × 190-200, tête de lit | 30 × 36 | 30 × 36 | 0 × 0 | conforme |
| pallet (paillasse) | 200 × 90 × 20 | 190 × 80 × 20 ; conserver (écart 10 cm) | 40 × 13 | 40 × 13 | 0 × 0 | conforme |
| table | 210 × 90 × 78 | conserver ; table de ferme 2 m | 43 × 26 | 42 × 24,6 | +1 × +1,4 | conforme |
| stool (EXC) | 35 × 35 × 45 cyl. | 32 × 32 × 45 (tabouret à trois pieds, assise Ø 30) | 15 × 17 | 7 × 12,5 | **+8 × +4,5** | **à redessiner** (75 cm de large : plus large que la moitié de Xéros) — **✔ corrigé (chantier largeur)** |
| chest (EXC, coffre) | 90 × 50 × 55 | conserver ; coffre de bois ferré 90-100 × 45-50 × 55 | 25 × 20 | 18 × 16 | **+7 × +4** | **à redessiner** (125 cm de large) — **✔ corrigé (chantier largeur)** |
| barrel (EXC, tonneau) | 60 × 60 × 90 cyl. | conserver ; tonneau 60 × 90 | 19 × 23 | 12 × 24 | **+7 × −1** | **à redessiner** (largeur 95 cm : un fût trapu) ; ou stylisé si on le déclare 95 × 95 × 75 (cuve) — **✔ corrigé (chantier largeur)** |
| crate (EXC, caisse) | 60 × 60 × 60 | 60 × 50 × 50 ; caisse de planches (rare au Moyen Âge : coffre ou panier) | 19 × 19 | 12 × 18 | **+7 × +1** | **à redessiner** (95 cm de large) — **✔ corrigé (chantier largeur)** |
| hay-bale (EXC, botte de foin) | 100 × 50 × 40 | 90 × 45 × 35 ; botte de paille liée | 31 × 18 | 20 × 13 | **+11 × +5** | **à redessiner** (155 cm de large : l'écart le plus fort en largeur) — **✔ corrigé (chantier largeur)** |
| sack (sac) | 50 × 40 × 70 | conserver ; sac de grain debout (le sac plein couché : 80 × 40) | 10 × 18 | 10 × 18 | 0 × 0 | conforme |
| jar (jarre) | 45 × 45 × 60 cyl. | conserver ; jarre de stockage Ø 40-50 | 9 × 16 | 9 × 16,5 | 0 × −0,5 | conforme |
| lantern (EXC) | 15 × 15 × 30 cyl. | conserver ; lanterne de corne et de fer 15 × 25 | 10 × 15 | 3-6 × 7,5-15 | **+4 × 0** (au-delà de 6 px) | **à redessiner** (50 cm de large ; la lueur est peut-être dans la silhouette) — **✔ corrigé (chantier largeur)** |
| candle (EXC, bougie) | 8 × 8 × 20 cyl. | conserver ; chandelle de suif, Ø 3 sur un plat de 12 | 13 × 13 | 1,6-6 × 4,8-18 | **+7 × 0** | **à redessiner** (65 cm de large : plat, flamme et reflet) — **✔ corrigé (chantier largeur)** |
| wall-torch (torche) | 15 × 15 × 70 | conserver ; torche de résine 60-70 cm | 8 × 29 | 3-6 × 15,5-31 | +2 × 0 (dans la tolérance) | conforme (limite) |

## Objets en main et au sol (`items.json`)

Toutes les icônes `item-*` sont des **icônes d'interface de 16 × 16 px** (silhouettes de 12-16 × 9-16) : elles n'ont pas d'échelle de monde (16 px = 80 cm serait absurde pour un œuf), donc hors gabarit par nature : **conforme**. Les dimensions réelles servent à qui dessinera leur image au sol ou en main.

| Objet | Dims réelles proposées (cm) | Dessiné (icône / sol / main) | Attendu | Écart | Verdict |
| --- | --- | --- | --- | --- | --- |
| branch | 130 × 10 × 10 (ramure : 130 × 45 au sol) | icône 15 × 16 ; `branch-ground` 27 × 9 ; `held-branch` 8 × 20 | sol : 26 × (2 à 9 selon les rameaux) | +1 × 0 à 7 | conforme (branche ramifiée, stylisée) |
| rope-tie (lien) | 55 × 20 à plat | icône 16 × 14 ; `rope-tie-ground` 11 × 4 ; `held-rope-tie` 4 × 11 | 11 × 4 | 0 × 0 | conforme |
| rope-coil | 30 × 30 × 10 | `rope-coil` 6 × 5 ; `held-rope-coil` 4 × 5 ; icône 16 × 13 | 6 × 5 | 0 × 0 (main : −2 × 0) | conforme (main : stylisé) |
| faggot | 100 × 35 × 35 (voir plus haut) | icône 15 × 11 ; `faggot` 27 × 13 ; `faggot-ns` 10 × 19 ; `held-faggot` 27 × 13 | voir `props` | +1 × +1,8 | conforme au déclaré |
| big-felled-log, normal-felled-log | 95 × 65 et 95 × 40 | icônes 16 × 11 et 14 × 9 ; `held-big-felled-log` 19 × 13 ; `held-normal-felled-log` 19 × 8 | 19 × 14,5 ; 19 × 8,9 | 0 × −1,5 ; 0 × −0,9 | conforme |
| axe (hache) | 90 de manche, fer 15 × 20 | icône 14 × 16 ; `held-axe` 15 × 26 (75 × 130 cm) ; `tool-axe` 24 × 20 (120 × 100 cm, pose `use-down`) | manche 90 cm = 18 px | +6 à +8 px de long | stylisé, à décider (manche d'environ 1,2-1,4 m sur les aperçus `xeros-use-axe.png` : lisible, mais 1,4 fois trop long ; fer de 25 × 35 cm au lieu de 15 × 20) |
| pickaxe, hoe, sickle, watering-can, fishing-rod, sword, wooden-sword | 90 × 25 ; 130 × 15 ; 40 × 15 ; 40 × 20 × 30 ; 200 × 5 ; 90 × 20 ; 80 × 20 | icône seule (16 × 14-16) ; pas d'image en main ni au sol | sans objet | sans objet | conforme (icône) ; dims à reprendre le jour où l'outil se tient |
| stone, iron-ore, straw, wheat, seeds, berries, mushroom, egg, apple, wool | 12-20 ; 10-15 ; gerbe 60 × 10 ; gerbe 80 ; poignée 5 ; poignée 10 ; 6-10 ; 5 × 4 ; 7-8 ; pelote 15 | icône seule | sans objet | sans objet | conforme (icône) |

À noter : `held-big-felled-log` fait 19 px de large = 95 cm, soit **5 fois la largeur de Xéros ou 1 fois sa hauteur** ; c'est la bille de 95 cm vue de bout en bout, portée à l'épaule : correcte au gabarit.

## Chaumière

Voir le sujet (b). Résumé : l'objet `cottage` extérieur (332 × 200 px) est conforme à ses dimensions déclarées (16,6 × 7,8 × 6,1 m) mais 15 % plus longue qu'une longère de CONCEPTION ; l'intérieur (`maison.tmj`, 36,8 × 19,2 m, murs de 3,20 m) est 2,2 à 2,5 fois trop grand. Verdict : **intérieur à refaire** (carte et trois meubles), extérieur **stylisé, à décider**.

## Tuiles qui ont une hauteur

| Tuile | Dimensions déduites du dessin | Dims réelles proposées | Verdict |
| --- | --- | --- | --- |
| `fence-*` (clôture, `art/world/tiles.ts`) | poteau 8 × 22 px (haut. du poteau rangées 7 à 28) = **40 cm de large, 1,10 m de haut** ; lisses de 6 px = **30 cm d'épaisseur** ; un poteau par case (tous les 1,60 m) | poteau 12-15 cm (3 px), lisse 8-10 cm, haut 1,0-1,2 m ; le plancher de lisibilité (6 px = 30 cm) autorise 6 px | stylisé, à décider (poteau et lisses 1,3 à 3 fois trop épais, hauteur juste) |
| `face-up-*`, `face-low-*` (mur du fond, `art/interior/house.ts`) | 64 px = **3,20 m** de haut, poteaux de 6 px = 30 cm, plinthe de 6 px | hauteur 2,2-2,5 m (44-50 px) | à redessiner (si l'intérieur est refait) ; au moins 1,3 fois trop haut |
| `wall-top` | 32 px = 1,60 m d'épaisseur de mur | 50-60 cm (10-12 px) | stylisé, à décider (cohérent avec la grille de cases ; épaisseur trois fois trop forte) |
| `door-up` / `door-low` | 26 × 52 px = **1,30 × 2,60 m** | 80-90 × 170-180 cm (16-18 × 34-36 px) | à redessiner (1,5 fois trop grande ; liée à la hauteur de mur) |
| `doorway` | ouverture 22 px = 1,10 m | 80-100 cm | conforme (limite) |
| `window-up`, `window-south` | 22 × 18 px = 1,10 × 0,90 m ; `window-south` 16 × 16 = 80 × 80 cm | 60-80 × 80-100 cm | conforme (stylisé) |
| `partition-*` | 10 px = 50 cm d'épaisseur, 0 de hauteur dessinée (vue de dessus) | 8-10 cm (2 px) ; plancher 6 px | stylisé, à décider |
| `path-*`, `water-*`, `field`, herbes, sols | à plat, pas de hauteur | sans objet | conforme |

## Personnages

| Objet | Décl. | Dims réelles proposées | Dessiné | Attendu | Écart | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| xeros | hauteur 160 cm (gabarit : 32 px) ; largeur stylisée 90 cm | 160 cm ; épaules 45-50 cm (≈ 10 px) ; collision 70 × 40 cm (14 × 8 px) | 18 × 32 | 10 × 32 (largeur réelle) / 18 (stylisée) | 0 × 0 (hauteur) ; +8 en largeur par rapport au réel | hauteur : conforme ; largeur : stylisé, à décider (sujet a) — **✔ corrigé : 12 × 32 px (60 × 160 cm), collision 10 × 8 px** |
| mother | hauteur 170 cm (34 px) ; largeur 90 cm | 155-160 cm (femme médiévale moyenne, plus petite que Xéros adulte) ; épaules 40 cm | 18 × 34 | 8 × 32 | +10 en largeur ; +2 px de hauteur par rapport à 160 cm | hauteur : stylisé, à décider (170 cm est grand pour l'époque) ; largeur : sujet a — **✔ corrigé : 12 × 32 px (60 × 160 cm), collision 10 × 8 px** ; la mère à 32 px |
| portraits 64 px | n/a | portraits d'interface (`portrait-xeros-64` 58 × 55, `portrait-mother-64` 58 × 56) | n/a | n/a | n/a | conforme (hors échelle de monde) |

## Autres images

- Tas (`pile-branch-*`, `pile-log-*`, `branch-ground`) : cellules de 32 × 13 px, branches de 24-29 px = 1,2-1,45 m : conforme à des branches de 1,3 m ; billes : voir plus haut.
- Effets (`fx-*`, `smoke`) : 4-6 px, effets d'écran : hors gabarit par nature.

## À redessiner, par ordre de gravité

1. **Intérieur de la chaumière** (`maison.tmj` et ses murs/portes) : 2,2 à 2,5 fois trop grand pour son extérieur ; murs de 3,20 m, porte de 2,60 m. Carte à refaire plus petite (pas un sprite).
2. **fireplace** : +24 × +37 px sur les dimensions proposées ; 96 px de haut, trois fois Xéros, 4,15 m sous des murs de 3,20 m. À refaire vers 40 × 59 px.
3. **worktable** (62 → 40 px de large) et **workbench** (64 → 40) : 1,6 fois trop longs ; à refaire ou à recadrer en un seul passage avec la cheminée.
4. **hay-bale** : 31 px de large pour 20 attendus (+11), le plus gros écart en largeur après la cheminée.
5. **barrel**, **crate**, **stool** : 19, 19 et 15 px de large pour 12, 12 et 7 ; le tabouret est 2 fois trop large pour son rôle.
6. **chest** : 25 × 20 pour 18 × 16.
7. **candle** et **lantern** : 13 et 10 px de large (plancher : 6) ; petits objets, peu visibles.
8. Portes et hauteur de mur de l'intérieur (`door-*`, `face-*`) : à reprendre avec le point 1.

Hors liste, « stylisé, à décider » : largeur de Xéros et de la mère (sujet a), tête du têtard, hauteur de la mère, arbres (note), clôture, `wall-top`, `partition-*`, manche de la hache, `cottage` extérieur ; et le puits, dont il suffit de corriger la hauteur déclarée (215 cm) pour qu'il soit conforme sans EXCEPTIONS.
