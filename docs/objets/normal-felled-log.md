# Bille normale (`normal-felled-log`)

## Identité
- Clé : `normal-felled-log` (la bille ordinaire ; les billes d'un tronc couché sont `normal-felled-log-1..5`, voir la
  [fiche de l'arbre normal](normal-tree.md)). Bille tournée nord-sud : `normal-felled-log-ns`. Icône : `item-normal-felled-log`.
  Portée : `held-normal-felled-log`.
- Nom affiché : bille.
- Nature : objet du monde (`props.json`) qui se prend (`take`), comme la bille du gros arbre.
- Mains : deux (longue et lourde) : portée devant lui, il ralentit.

## Dimensions (gabarit)
- 95 cm de long, 40 cm de diamètre contour compris (30 cm de bois), cylindre couché est-ouest (`ew`).
- Est-ouest : L = **19 px** de long, Ø × 1,12 ≈ **9 px** de haut, bouts en ovales de 4 × 8.
- Nord-sud : Ø = **8 px** de large, Ø × 7/11 + L/2 = 5 + 9,5 ≈ **15 px** de haut ; la face de coupe est un ovale de 6 × 4.
- La grosseur d'un bras : le gros arbre donne des billes de 65 cm de diamètre, à fendre en quatre ; celles-ci restent entières.

## Vues
- Au sol : `normal-felled-log`, est-ouest : écorce éclairée en haut, deux sillons en long, face de coupe vers la lumière à
  gauche, écorce enroulée à droite, ombre portée.
- Tournée : `normal-felled-log-ns`, vue par le bout : le dessus d'écorce qui fuit vers le nord, la face de coupe au sud.
- En main (`held-normal-felled-log`, posture `carry`, à deux mains devant lui) : de face et de dos, en longueur ; de profil
  (`right`, `left` en miroir), par le bout.
- Case d'interface : `item-normal-felled-log`, 16 × 16.
- Fantôme : l'image est-ouest ou nord-sud, en transparence, à la place exacte où elle ira.
- Porté : `carry`.

## Regroupement
En tas (`piles.json`, `normal-logs`) : 3 au sol côte à côte, 2 dans les creux, 1 au sommet, 6 au plus ; est-ouest ou nord-sud
(`turned`). Elles ne se mélangent pas avec les billes du gros arbre (`big-logs`). Une bille seule bloque le passage.

## Gestes
- E court : la prendre à deux mains (la plus haute d'un tas, ou la seule) ; la portant, E la pose devant soi (en tas).
- E maintenu : rien. Espace : rien (porté, Xéros n'utilise rien).
- R : la portant, elle tourne entre est-ouest et nord-sud ; le fantôme suit. Q : la pose devant soi (en tas), comme E.

## Origine
Abattage d'un arbre normal : chaque pièce du tronc couché, coupée aux deux bouts, devient une bille.

## Devenir
Tas. Plus tard : coupée à la longueur d'une pièce de charpente.

## Vérification
- Aperçu : `.art-preview/arbres.png`, `.art-preview/piles.png` (le genre `normal-logs`, tous ses états), `.art-preview/gabarit.png`.
- En jeu : voir le rapport de la branche `arbre-normal`.
