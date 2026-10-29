# Chevron de l'abri (`shed-rafter`)

## Identité
- Clé : `shed-rafter`.
- Nom affiché : chevron.
- Nature : objet du monde (`props.json`), sans `take` : pièce de bâtiment posée dans Tiled, étape « les chevrons »,
  cinq fois. Pièce du toit (`roof`) : elle s'efface avec lui.
- Mains : aucune pour l'instant.

## Dimensions (gabarit)
- Bois équarri, section 10 × 10 cm, posé du nord au sud sur les deux sablières est-ouest, dans la pente. Il dépasse de
  20 cm au nord et de 40 cm au sud (l'avant-toit) : 3,80 m de long au sol. Dessous à 2,40 m au nord (sur la sablière
  haute), 2,00 m au sud (sur la basse) ; pente de 40 cm sur 3,20 m.
- Boîte englobante : 10 × 380 × 57,5 cm (10 d'épaisseur + 47,5 de pente sur sa longueur).
- **Pièce qui relie des appuis posés au sol** (`ground`, docs/STYLE.md section 8) : H + D = 11,5 + 76 = **2 × 87,5 px**,
  dessiné 2 × 88. Plus étroit que le plancher de lisibilité : dessiné à sa taille réelle.
- Dans son image, sous lui, la hauteur qui le sépare du sol (vide) ; le bas de l'image est un pixel au sud de son bout
  sud au sol (sa profondeur d'affichage, au-dessus des sablières qu'il couvre).

## Vues
- Posé : une ligne de bois de 2 px qui descend du nord au sud, matière commune (`art/world/wood.ts`), et au bout sud son
  bois de bout (2 × 2). Pas d'ombre portée.
- En main, case d'interface, fantôme, porté : aucun (pas encore).

## Regroupement
Seul ; cinq par abri, tous les 75 cm environ (aux deux bords sur les sablières de côté, et trois entre).

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Posés dans `ferme.tmj` avec l'abri. Plus tard : une perche équarrie (un arbre normal, plus fin) : pas encore construit.

## Devenir
Porte la couverture de chaume. Ne bloque pas le passage. Pièce du toit : quand Xéros est sous le toit (ou caché derrière),
les chevrons qui le touchent et ceux qui touchent le chaume deviennent en partie transparents avec lui (`roof`).

## Vérification
- Aperçu : `.art-preview/woodshed-4.png` (les cinq chevrons sur les sablières).
- En jeu : voir [la couverture](shed-thatch.md#vérification).
