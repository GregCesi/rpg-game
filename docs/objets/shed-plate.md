# Sablières de l'abri (`shed-plate-north`, `shed-plate-south`, `shed-plate-side`)

Une fiche pour les quatre sablières de l'abri à bois : les poutres posées en tête des poteaux, qui portent les chevrons.

## Identité
- Clés : `shed-plate-north` (sablière haute, est-ouest, sur les poteaux du nord), `shed-plate-south` (sablière basse,
  est-ouest, sur les poteaux du sud), `shed-plate-side` (sablière de côté, nord-sud, posée deux fois : à l'ouest et à
  l'est, de la tête d'un poteau haut à celle d'un poteau bas, donc en pente, à 20°).
- Noms affichés : sablière haute, sablière basse, sablière de côté.
- Nature : objets du monde (`props.json`), sans `take` : pièces de bâtiment, places de l'étape « les sablières » du plan `woodshed` (`plans.json`, étape « à venir »).
- Mains : aucune pour l'instant (deux, plus tard : pièce longue).

## Dimensions (gabarit)
- Bois équarri. Contour compris.
- Est-ouest (`shed-plate-north`, `-south`) : section 15 × 15 cm, 3,25 m de long (d'une face extérieure de poteau à
  l'autre) : boîte de 325 × 15 × 15 cm, **65 × 4,5 px** (face sud 3 rangées, dessus 1,5), dessinée 65 × 5. Dessous de la
  haute à 3,15 m (63 px), de la basse à 1,85 m (37 px) ; dessus à 3,30 m et 2,00 m. Au sol, chacune est à fleur de la
  face sud de ses poteaux (haute : rangées 65 à 67 de la carte ; basse : 136 à 138).
- Nord-sud (`shed-plate-side`) : 20 cm de large (la largeur du poteau, qu'elle couvre exactement : à 15 cm, le contour du
  poteau dépassait à côté du sien et faisait une barre sombre), 15 cm d'épaisseur, 3,75 m de long au sol (des faces nord
  des poteaux hauts aux faces sud des poteaux bas), de 3,15 m (nord) à 1,85 m (sud) sous la pièce : sa boîte englobante
  fait 20 × 375 × 145 cm (15 d'épaisseur + 130 de chute). **Pièce qui relie des appuis posés au sol** : sa profondeur se
  voit à l'échelle du sol, sans raccourci (`ground` dans `dims`, docs/STYLE.md section 8), sinon elle ne rejoindrait pas
  ses poteaux : H + D = 29 + 75 = **4 × 104 px**.
- Dans son image, sous elle, la hauteur qui la sépare du sol (vide). Le bas de l'image est sa profondeur d'affichage :
  un pixel au sud du pied des poteaux pour la haute (elle couvre leur tête) et pour celles de côté, deux pour la basse
  (elle passe devant le bout des sablières de côté).
- Dans `plans.json` (en cm depuis le piquet nord-ouest : −10 cm, 10 cm au nord ; −10, 365 pour les côtés ; −10, 370 au sud ; ancien emplacement dans `ferme.tmj`, coin bas gauche de l'image) : haute en (608, 69), image de 65 × 69 (64 rangées vides) ; basse en
  (608, 141), 65 × 44 (39 rangées vides) ; de côté en (608, 140) et (669, 140), 4 × 142 (38 rangées vides).

## Masse
- Pas encore déplaçable : pas de masse saisie. Ordre de grandeur : sablière de 325 × 15 × 15 cm, environ 66 kg.

## Vues
- Posée : bois équarri de la matière commune (`art/world/wood.ts`), comme les poteaux, fil dans le sens de la poutre.
  Est-ouest : le dessus clair et la face sud ; aux deux bouts, rien (ils sont sur les poteaux). Nord-sud : le dessus,
  une bande de 4 px (deux colonnes de bois entre les contours) qui descend du nord au sud, et au bout sud la face de
  coupe (bois de bout, plus sombre que le dessus). Pas d'ombre portée (elle tombe au sol loin dessous, le jeu ne la
  peint pas).
- En main, case d'interface, fantôme, porté : aucun (pas encore).

## Regroupement
Seules ; quatre par abri, en cadre sur la tête des poteaux (assemblage à mi-bois aux coins).

## Gestes
- E court, E maintenu, Espace, R, Q : rien.

## Origine
Places du plan `woodshed` (étape « à venir »). Plus tard : un tronc équarri, porté à deux, posé sur les poteaux : pas encore
construit.

## Devenir
Portent les chevrons. Ne bloquent pas le passage (en hauteur). Xéros passe dessous : la plus basse est à 1,85 m, lui fait
1,60 m.

## Vérification
- Aperçu : `.art-preview/woodshed-3.png` (le cadre des sablières sur les poteaux), à côté de `gabarit.png`.
- En jeu : passer sous la sablière basse en entrant par le sud ; elle passe devant Xéros quand il est dessous.
