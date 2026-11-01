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
équilibre 0,6 (un gourdin : le poids part vers le bout), efficacité 0,4 (les rameaux et le bois sec amortissent le coup). Ce qui s'en
calcule (world/strike.ts), à côté de l'épée de bois :

| | Branche | Épée de bois |
| --- | --- | --- |
| Longueur, prise | 125 cm, à 10 cm du gros bout | 90 cm, à 6 cm du pommeau |
| Masse | 2,5 kg | 0,8 kg |
| Équilibre ; efficacité (données) | 0,6 (poids au bout) ; 0,4 (rameaux qui amortissent) | 0,25 (près de la garde) ; 1 (le fil) |
| Portée | 165 cm | 134 cm |
| Précision (calculée) | 0,18, faible | 0,76, bonne |
| Taille : dégâts, durée du coup | 8,2 en 1,21 s | 5,9 en 0,60 s |
| Dégâts par seconde (taille) | 6,8 | 9,8 (× 1,44) |
| Coup d'en haut : dégâts, durée | 12,4 en 1,45 s | 8,9 en 0,72 s |
| Endurance par coup (taille ; en haut) | 1,30 ; 1,63 | 0,62 ; 0,77 |

## Variantes naturelles
Aucune pour l'instant : une seule forme dessinée, une seule taille.

## Regroupement
En tas (`branches` : le compte s'affiche près du tas), lié en fagot (E maintenu sur un tas plein et lié).

## Gestes
- E court : la prendre (au sol, ou la reprendre d'un tas).
- E maintenu : sur un tas de branches plein et lié, nouer le fagot.
- Espace (dans la main active, ou dans l'autre si l'active est vide) : attaquer, dans le vide comme sur une cible. Dans la main
  active avec la hachette dans l'autre, face au billot : la tailler en piquet (c'est la hachette qui sert).
- R : la tourner à la pose. Q : la lâcher devant Xéros (sur un tas de branches si elle s'y range).

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
