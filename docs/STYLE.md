# Xéros : guide de style du pixel art

Règles que tout sprite respecte. Un sprite qui en viole une est à reprendre.
Les couleurs vivent dans `art/palette.ts`, la direction artistique dans `docs/CONCEPTION.md` (« conte rustique », tons terreux, un peu ocre).
La référence de qualité est le portrait de Xéros (`portrait-xeros-64`) : tout sprite doit pouvoir être posé à côté sans détonner.

## 1. Perspective et échelle

- Vue de dessus en trois quarts, comme Stardew Valley : on voit le dessus d'un objet et sa face avant (côté sud).
- Les tuiles de sol se voient strictement de dessus. Tout ce qui a une hauteur montre sa face sud : lit, table, coffre, caisse, rocher, clôture, mur.
- Un meuble n'est jamais dessiné en plan. Un lit montre le dessus (couverture, oreiller au nord) et le bois du pied de lit sur sa face sud.
- Échelle : Xéros fait 31 px de haut (de y=14 à y=45 dans sa frame de 32×48) pour 1,60 m, soit environ 5 cm par pixel. Un lit de 50 cm de haut a une face sud d'une dizaine de pixels. Comparer chaque objet à Xéros avant de le valider.

## 2. Lumière

- Une seule source, en haut à gauche (nord-ouest). Le haut et la gauche d'un volume sont éclairés, le bas et la droite sont dans l'ombre.
- Les objets et personnages posent au sol une ombre portée avec la couleur translucide `x`, sous leur base, légèrement décalée vers la droite.
- Les lueurs des feux et la pénombre des intérieurs sont gérées par le jeu. Elles ne se peignent pas dans le sprite.

## 3. Contour

- Objets et personnages : contour extérieur d'un pixel. En bas et à droite, il prend `OUTLINE` (brun chaud). En haut et à gauche, côté lumière, il prend la teinte la plus sombre de la matière. Jamais de noir.
- Pas de contour intérieur : les détails internes (planches, plis, mèches) se tracent avec la teinte d'ombre de la matière.
- Tuiles de sol : aucun contour. Le bord d'un chemin ou d'une rive se fait par un changement de couleur, sans trait.

## 4. Couleurs

- Uniquement les couleurs de `art/palette.ts`, ou d'une palette de sprite qui en dérive. Une couleur nouvelle s'ajoute à la palette avec un commentaire, jamais en dur dans un sprite.
- Chaque matière a sa rampe de trois ou quatre teintes, de la plus claire à la plus sombre : bois `M m N K`, pierre `R r z Z`, feuillage `j L l k`, chaume `Y t T P`, torchis `d D E`. Un volume se modèle avec sa propre rampe.
- Les ombres glissent vers le brun-violet, les lumières vers le jaune, comme le dit la palette.
- Pas de dégradé lisse. Le tramage sert à une texture (terre, paille), jamais à modeler un volume.

## 5. Formes

- La silhouette d'abord : remplie d'une seule couleur, l'objet doit encore se reconnaître.
- Ombrage par grappes d'au moins trois pixels. Pas de pixel isolé, sauf un détail voulu (un reflet, une fleur).
- Les éléments naturels ne sont jamais symétriques. Un arbre a un feuillage en trois à cinq masses éclairées en haut à gauche, un tronc qui s'évase au pied et touche le sol par son ombre. Un rocher a des facettes : dessus clair, face sud plus sombre, sans forme d'œuf.
- Deux objets différents ont deux silhouettes différentes. Le lit de la mère et la paillasse de Xéros ne doivent pas se confondre.

## 6. Personnages

- Frame de 32×48, pieds à y=45, ombre portée dessous.
- Mêmes couleurs que le portrait pour les cheveux, la peau et la tunique : le portrait fait référence.
- De profil, on voit un œil, le nez, l'oreille et la nuque rasée sous le bol. Le bras côté spectateur est visible. La hauteur et la carrure restent celles de la vue de face.
- Toutes les frames d'une animation gardent la même tête, à la même hauteur, sauf le rebond voulu de la marche.
- À l'échelle du jeu (environ 5 cm par pixel), un détail de moins de 3 cm n'existe pas. Les côtés rasés de Xéros se dessinent en couleur de peau ; seul le bol de cheveux se voit, et il s'arrête net au-dessus des oreilles.

## 7. Vérification sur l'aperçu

Après `npm run art:preview`, ouvrir `.art-preview/<clé>.png` et, à côté, `.art-preview/xeros.png` et un sprite de la même scène. Cocher chaque point :

1. Trois quarts : la face sud est visible si l'objet a une hauteur.
2. Échelle juste par rapport à Xéros.
3. Lumière en haut à gauche, ombre portée présente.
4. Contour conforme à la section 3.
5. Couleurs prises dans la palette.
6. Silhouette reconnaissable en aplat, distincte des objets voisins.
7. Aucun pixel isolé non voulu.
