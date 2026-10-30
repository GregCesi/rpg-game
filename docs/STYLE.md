# Xéros : guide de style du pixel art

Règles que tout sprite respecte. Un sprite qui en viole une est à reprendre.
Les couleurs vivent dans `art/palette.ts`, la direction artistique dans `docs/CONCEPTION.md` (« conte rustique », tons terreux, un peu ocre).
La référence de qualité est le portrait de Xéros (`portrait-xeros-64`) : tout sprite doit pouvoir être posé à côté sans détonner.

## 1. Perspective et échelle

- Vue de dessus en trois quarts, comme Stardew Valley : on voit le dessus d'un objet et sa face avant (côté sud).
- Les tuiles de sol se voient strictement de dessus. Tout ce qui a une hauteur montre sa face sud : lit, table, coffre, caisse, rocher, clôture, mur.
- Un meuble n'est jamais dessiné en plan. Un lit montre le dessus (couverture, oreiller au nord) et le bois du pied de lit sur sa face sud.
- Échelle : 5 cm par pixel. Xéros fait 32 px de haut (rangées 14 à 45 de sa frame de 32×48, contour compris) pour 1,60 m. Les tailles se calculent avec le gabarit (section 8) ; comparer chaque objet aux étalons avant de le valider.

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
8. Taille conforme au gabarit (section 8) : `npm run check` le vérifie, et l'objet tient à côté des étalons.

## 8. Gabarit

Règle de dimensions et de perspective, tirée des billes (la pièce de bois du gros, ronde, de 1 m : `wood-big-round-100`, `wood-big-round-100-ns` ; les billes de 95 cm d'avant ont établi la règle), qui font référence. Un objet part de ses dimensions réelles en centimètres (`dims` dans `src/content/props.json`) ; sa taille à l'écran en découle. Code : `src/content/gabarit.ts`. Étalons : `.art-preview/gabarit.png`.

**La projection.**

- 5 cm par pixel, sur les trois axes : largeur (est-ouest), profondeur au sol (nord-sud), hauteur.
- Le sol se voit à plat, sans raccourci : une case de 32 px fait 1,60 m sur 1,60 m. L'empreinte d'un objet, ses collisions et l'écart entre deux objets se comptent au sol à 5 cm par pixel (deux billes voisines d'un tas sont à 11 px l'une de l'autre).
- Une face tournée vers le sud se voit en vraie grandeur : largeur × hauteur.
- Un dessus (face horizontale) et une face vue en raccourci (la face est ou ouest, le bout d'une bille est-ouest) se dessinent à la moitié de leur profondeur : coefficient ½.
- Ancrage : le bas de la silhouette est le bord sud de l'objet, posé au sol. L'ombre portée (`x`) est en dessous et ne compte pas dans la taille.
- La face de coupe d'un cylindre couché nord-sud se dessine aplatie, pour qu'on lise l'objet couché : sa hauteur est son diamètre × 7/11 (≈ 0,64, l'ovale de 11 × 7 px des billes).
- Une taille se mesure sur la silhouette : pixels opaques, contour compris, ombre et lueurs exclues. Les dimensions réelles se comptent aussi contour compris : la bille fait 95 cm de long et 65 de diamètre. Tolérance : 2 px.

**Trois exceptions.**

- Plancher de lisibilité : un objet dont la silhouette ferait moins de 6 px de large peut être agrandi, en gardant ses proportions, jusqu'à 6 px de large, pas au-delà (une bougie de Ø 8 cm, 1,6 px à la taille réelle, se dessine jusqu'à 6 px). C'est permis, pas obligé : le poteau de l'abri (15 cm, 3 px) reste à sa taille réelle.
- Les personnages suivent le gabarit en hauteur et ont une largeur de 12 px (60 cm, bras compris : un peu plus que des épaules réelles de 45-50 cm, pour que les bras se lisent) ; leur collision aux pieds fait 10 × 8 px (50 × 40 cm).
- Pièces de bâtiment qui relient des appuis posés au sol (une sablière nord-sud, un chevron, une couverture : `ground: true` dans `dims`) : leur profondeur se voit **à l'échelle du sol, sans raccourci**, hauteur à l'écran H + D au lieu de H + D/2. Les appuis (poteaux) sont posés sur la carte à leur place réelle, à 5 cm par pixel au sol : une pièce raccourcie de moitié ne les rejoindrait pas. `h` est la hauteur de sa boîte englobante (épaisseur plus pente). Une telle pièce garde sous elle, dans son image, la hauteur qui la sépare du sol (vide, hors silhouette) : le bas de l'image est au sol, c'est sa profondeur d'affichage. Projection d'un point au sol (x, y) à la hauteur z : à l'écran (x, y − z).

Vérifications : la bille est-ouest (95 × 65 cm) mesure 19 × 13 px, ses bouts sont des ovales de 5 px de large pour 11 de haut (11 × ½) ; la bille nord-sud mesure 13 × 19 px, le dessus d'écorce fait 10 px entre ses deux ronds (19 × ½ = 9,5), la face de coupe 11 × 7 ; Xéros et la mère font 32 px pour 1,60 m, sur 12 px de large (un personnage n'a pas de dessus visible : sa taille à l'écran est sa hauteur) ; la case fait 32 px pour 1,60 m.

**Les formes de base** (W largeur, D profondeur, H hauteur, L longueur, Ø diamètre, en pixels = centimètres ÷ 5).

| Forme | Largeur à l'écran | Hauteur à l'écran | Exemple |
| --- | --- | --- | --- |
| Boîte | W | H + D/2 (face sud H, dessus D/2) | cube de 50 cm : 10 × (10 + 5) = **10 × 15** |
| Cylindre couché est-ouest | L | Ø × 1,12 (le rond cisaillé par le dessus : √(1 + ¼)) ; bouts en ovales de Ø/2 × Ø | bille de 95 × 65 cm : 19 × 14,5, dessinée **19 × 13** |
| Cylindre couché nord-sud | Ø | Ø × 7/11 + L/2 (face de coupe au sud aplatie, Ø × Ø × 7/11 ; dessus L/2) | la même bille : 13 × (8,3 + 9,5) = 13 × 17,8, dessinée **13 × 19** |
| Cylindre debout | Ø | H + Ø/2 (corps H, dessus en ovale Ø × Ø/2) | billot de Ø 55 cm, 45 cm de haut : 11 × (9 + 5,5) = **11 × 14,5** |
| À plat sur le sol | W | D | éclats de pierre de 135 × 75 cm : **27 × 15** |
| Pièce de bâtiment au sol (`ground`) | W | H + D | toit de planches de l'abri, 365 × 445 × 165 cm : 73 × (33 + 89) = **73 × 122** |

Un objet qui n'est pas une forme de base (arbre, buisson, rocher) prend la boîte qui l'englobe. Un objet qui ne suit pas encore la règle est nommé dans `EXCEPTIONS` (`src/content/validate.ts`) avec sa taille dessinée ; on ne l'y ajoute pas pour un dessin neuf : on dessine à la bonne taille.
