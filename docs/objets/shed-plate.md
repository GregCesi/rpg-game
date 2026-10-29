# Sablières de l'abri (`shed-plate-north`, `shed-plate-south`, `shed-plate-side`)

Une fiche pour les quatre sablières de l'abri à bois : les poutres posées en tête des poteaux, qui portent les chevrons.

## Identité
- Clés : `shed-plate-north` (sablière haute, est-ouest, sur les poteaux du nord), `shed-plate-south` (sablière basse,
  est-ouest, sur les poteaux du sud), `shed-plate-side` (sablière de côté, nord-sud, posée deux fois : à l'ouest et à
  l'est, de la tête d'un poteau haut à celle d'un poteau bas, donc en pente).
- Noms affichés : sablière haute, sablière basse, sablière de côté.
- Nature : objets du monde (`props.json`), sans `take` : pièces de bâtiment posées dans Tiled, étape « les sablières ».
- Mains : aucune pour l'instant (deux, plus tard : pièce longue).

## Dimensions (gabarit)
- Bois équarri, section 15 × 15 cm, à la longueur de l'abri : 3,20 m (d'un bord extérieur de poteau à l'autre).
  Contour compris.
- Est-ouest (`shed-plate-north`, `-south`) : boîte de 320 × 15 × 15 cm : **64 × 4,5 px** (face sud 3 rangées, dessus 1,5),
  dessinée 64 × 5. Dessous de la haute à 2,25 m (45 px), de la basse à 1,85 m (37 px).
- Nord-sud (`shed-plate-side`) : 15 cm de large, 3,20 m de long, de 2,25 m (nord) à 1,85 m (sud) sous la pièce : sa
  boîte englobante fait 15 × 320 × 55 cm (15 d'épaisseur + 40 de pente). **Pièce qui relie des appuis posés au sol** :
  sa profondeur se voit à l'échelle du sol, sans raccourci (`ground` dans `dims`, docs/STYLE.md section 8), sinon elle
  ne rejoindrait pas ses poteaux : H + D = 11 + 64 = **3 × 75 px**.
- Dans son image, sous elle, la hauteur qui la sépare du sol (vide). Le bas de l'image est sa profondeur d'affichage :
  un pixel au sud du pied des poteaux pour la haute (elle couvre leur tête), deux pour la basse (elle passe devant le bout
  des sablières de côté), un pour celles de côté.

## Vues
- Posée : bois équarri de la matière commune (`art/world/wood.ts`), comme les poteaux, fil dans le sens de la poutre.
  Est-ouest : le dessus clair et la face sud ; aux deux bouts, rien (ils sont sur les poteaux). Nord-sud : le dessus,
  une bande de 3 px qui descend du nord au sud, et au bout sud la face de coupe (bois de bout, 3 × 3), comme le bout d'une
  bille. Pas d'ombre portée (elle tombe au sol loin dessous, le jeu ne la peint pas).
- En main, case d'interface, fantôme, porté : aucun (pas encore).

## Regroupement
Seules ; quatre par abri, en cadre sur la tête des poteaux (assemblage à mi-bois aux coins).

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Posées dans `ferme.tmj` avec l'abri. Plus tard : un tronc équarri, porté à deux, posé sur les poteaux : pas encore
construit.

## Devenir
Portent les chevrons. Ne bloquent pas le passage (en hauteur). Xéros passe dessous : la plus basse est à 1,85 m, lui fait
1,60 m.

## Vérification
- Aperçu : `.art-preview/woodshed-3.png` (le cadre des sablières sur les poteaux), à côté de `gabarit.png`.
- En jeu : passer sous la sablière basse en entrant par le sud ; elle passe devant Xéros quand il est dessous.
