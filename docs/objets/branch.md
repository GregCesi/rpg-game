# Branche (`branch`)

La branche sèche, tombée d'un houppier : du bois à tailler, à lier en fagot, et la première arme de Xéros (CONCEPTION, « Le combat »).
Fiche écrite le 1er novembre 2026 (chantier « combat »), après coup : la branche existait avant le protocole des fiches.

## Identité
- Clé : `branch` (`items.json`).
- Nom affiché : branche.
- Nature : objet possédable (`kind: resource`), avec un composant `weapon` (voir Au combat).
- Mains : une.
- Âge : non (du bois brut, avec son écorce ; elle n'est pas `aged`).

## Masse
- Saisie : **2,5 kg** (`mass: 2.5`). Sans effet sur la marche. Dix branches et un lien font un fagot de 25,2 kg.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Environ 125 cm de long, Ø 10 cm au gros bout, une tige qui s'amincit et quelques rameaux.
- Au sol (`branch-ground`) : 27 × 9 px de silhouette (le même dessin que dans le tas). Pas de `dims` dans items.json : son image
  au sol n'est pas contrôlée au gabarit (un objet ancien).

## Vues
- Symétrie : quatre vues (`views: "four"`, `lying`) : `branch-ground` et ses vues `-r1` à `-r3`.
- Au sol, dans le tas de branches (`piles.json`, genre `branches`), en main (`held-branch`, posture `hand`), case d'interface
  (`item-branch`) : le même dessin commun, `art/items/branch.ts`.
- En attaque (`weapon-branch`) : un seul dessin, la pointe à l'est, tiré en huit angles (art/lib/weapon.ts).

## Au combat
Arme de la famille `swing` (combat.json). Ses réglages (`weapon` d'items.json) : longueur 125 cm, prise à 10 cm du gros bout,
équilibre 0,6 (un gourdin : le poids part vers le bout), efficacité 0,63 (les rameaux et le bois sec amortissent le coup). Ce qui s'en
calcule (world/strike.ts), à côté de l'épée de bois :

| | Branche | Épée de bois | Poing (main nue) |
| --- | --- | --- | --- |
| Longueur, prise | 125 cm, à 10 cm du gros bout | 90 cm, à 6 cm du pommeau | le bras, 60 cm |
| Masse | 2,5 kg | 0,8 kg | 2 kg (poing et avant-bras lancés) |
| Équilibre ; efficacité (données) | 0,6 (poids au bout) ; 0,63 (rameaux qui amortissent) | 0,25 (près de la garde) ; 1 (le fil) | 0,75 ; 1 |
| Portée (main tendue + arme), au sol | 165 cm | 134 cm | 60 cm |
| Le mannequin touché jusqu'à (droit devant, taille, son bord) | 1,70 à 1,75 m des pieds | 1,40 à 1,45 m | — |
| Précision (calculée) ; écart d'un coup | 0,18, faible ; jusqu'à 13 px | 0,76, bonne ; moins de 2 px | 0,45 ; jusqu'à 6 px |
| Coups au but au bord de sa portée (1 000 coups simulés) | 58 % | 100 % | — |
| Taille (direct) : dégâts, durée du coup | 8,4 en 1,20 s | 6,0 en 0,53 s | 1,6 en 0,34 s |
| Dégâts par seconde | 7,0 | 11,3 (× 1,61) | 4,7 |
| Coup d'en haut : dégâts, durée | 9,2 en 1,36 s | 6,6 en 0,60 s | — |
| Endurance par coup (taille ; en haut) | 1,30 ; 1,63 | 0,62 ; 0,77 | 0,33 |

La zone de coup se calcule au sol (combat.json, `sweeps` ; carte : `.art-preview/carte-touche.png`). Les durées sont la somme des
images du geste (garde comprise), allongée par l'inertie d'une arme lourde (au-delà de 0,4 kg·m² : la branche ; ni l'épée ni le
poing ne ralentissent) ; la vitesse du coup est celle de la pointe, dans l'espace, à l'image active la plus rapide ; tout se recalcule
(world/strike.ts) quand un réglage change.

## Variantes naturelles
Aucune pour l'instant : une seule forme dessinée, une seule taille.

## Regroupement
En tas (`branches` : le compte s'affiche près du tas), lié en fagot (E maintenu sur un tas plein et lié).

## Gestes
- E : la prendre (au sol, ou la reprendre d'un tas).
- E maintenu, mains libres : sur un tas de branches plein et lié, nouer le fagot.
- Clic de la main qui la tient : frapper avec, même dans le vide (une ressource frappe comme le reste). Tenue d'une main, la
  hachette dans l'autre, face au billot : F la taille en piquet.
- R : la tourner à la pose. A (Q en QWERTY) : la poser à son fantôme, devant Xéros (sur un tas de branches si elle s'y range).

## Origine
Elle tombe du houppier d'un arbre couché (trois coups de cognée de haut en bas).

## Devenir
Taillée en piquet (la hachette sur le billot), parée en baguette de clayonnage, liée en fagot ; une arme d'entraînement.

## Transformations
- `whittle-stake` : la branche devient un piquet (la hachette sur le billot, geste réel).
- `trim-rod` : parée en baguette de clayonnage.

## Métier
Le bûcheron (`woodcutter`).

## Vérification
- Aperçu : `.art-preview/combat.png` (Xéros à trois moments de chaque geste avec la branche, et la branche dans ses huit angles),
  `.art-preview/piles.png`.
- En jeu : `npm run test:combat`.
