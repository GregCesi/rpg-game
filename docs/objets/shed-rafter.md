# Chevron de l'abri (`shed-rafter`)

## Identité
- Clé : `shed-rafter`.
- Nom affiché : chevron.
- Nature : objet du monde (`props.json`), sans `take` : pièce de bâtiment posée dans Tiled, étape « les chevrons »,
  cinq fois. Pièce du toit (`roof`) : elle s'efface avec lui.
- Mains : aucune pour l'instant.

## Dimensions (gabarit)
- Bois équarri, section 10 × 10 cm, posé du nord au sud sur les deux sablières est-ouest, dans la pente (20,1°). Il
  court sous tout le toit : 4,45 m au sol (89 px), du bord nord au bord sud du toit, soit 35 cm au-delà des poteaux de
  chaque côté. Dessous à 3,30 m sur la sablière haute, 2,00 m sur la basse ; à ses bouts, 3,46 m au nord et 1,85 m au
  sud (le bout de l'avant-toit).
- Boîte englobante : 10 × 445 × 171 cm (de 1,85 m, dessous du bout sud, à 3,56 m, dessus du bout nord).
- **Pièce qui relie des appuis posés au sol** (`ground`, docs/STYLE.md section 8) : H + D = 34,2 + 89 = **2 × 123,2 px**,
  dessiné 2 × 123. Plus étroit que le plancher de lisibilité : dessiné à sa taille réelle.
- Dans son image, sous lui, la hauteur qui le sépare du sol (38 rangées vides) ; le bas de l'image est un pixel au sud de
  son bout sud au sol (sa profondeur d'affichage, au-dessus des sablières qu'il couvre).
- Dans `ferme.tmj` (coin bas gauche de l'image, 2 × 161) : x = 610, 625, 641, 656, 671 ; y = 146. Les deux de rive sont
  sur le côté droit des sablières de côté (leur contour sombre tombe sur celui de la sablière).

## Masse
- Pas encore déplaçable : pas de masse saisie. Ordre de grandeur : chevron de 10 cm d'épaisseur sur 4,45 m, de l'ordre de 40 kg.

## Vues
- Posé : une ligne de bois de 2 px qui descend du nord au sud, matière commune (`art/world/wood.ts`), clair à gauche et
  OUTLINE à droite, et au bout sud son bois de bout (2 × 2, plus sombre que le dessus). Sous le toit fini, on n'en voit
  que ce bout, juste sous la tranche des planches de l'avant-toit. Pas d'ombre portée.
- En main, case d'interface, fantôme, porté : aucun (pas encore).

## Regroupement
Seul ; cinq par abri, tous les 75 à 80 cm (deux de rive sur les sablières de côté, et trois entre).

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Posés dans `ferme.tmj` avec l'abri. Plus tard : une perche équarrie (un arbre normal, plus fin) : pas encore construit.

## Devenir
Porte le toit de planches. Ne bloque pas le passage. Pièce du toit : quand Xéros est sous le toit (ou caché derrière),
les chevrons qui le touchent et ceux qui touchent le toit deviennent en partie transparents avec lui (`roof`).

## Vérification
- Aperçu : `.art-preview/woodshed-4.png` (les cinq chevrons sur les sablières), `woodshed-5.png` (leurs bouts sous
  l'avant-toit).
- En jeu : voir [le toit](shed-roof.md#vérification).
