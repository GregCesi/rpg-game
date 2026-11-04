# Rideau de feuillage (`lane-curtain`)

Le grand rideau de feuillage et de lianes qui pend au-dessus de la bouche du chemin creux, côté ferme (chantier « relief », 4
novembre 2026 ; CADRAGE.md du chantier). Vu de la ferme, il fait de l'entrée une bouche sombre ; il
déborde largement sur les deux talus.

## Identité
- Clé : `lane-curtain` (`props.json` ; c'est aussi le type de l'objet dans Tiled).
- Nom affiché : rideau de feuillage.
- Nature : objet du monde, fixe, sans `take`, sans corps (il pend en l'air : on passe dessous). Fait partie de la voûte du couloir :
  quand Xéros est dessous, il s'efface comme un toit (il reste 0,2), avec le bord sud.
- Mains : ne se prend pas.
- Âge : non (feuillage vivant).

## Masse
- Aucune requise (pas de `take`). Pour mémoire, le jour où on le coupera : du feuillage et des lianes vertes, environ 2 kg par m² de
  rideau, soit de l'ordre de 80 kg pour ses 11,5 × 3,4 m ; la matière (feuillage vert) sera à déclarer dans `matters.json`.

## Dimensions (gabarit, docs/STYLE.md section 8)
- La boîte qui l'englobe : 1 150 cm de large (est-ouest), 160 cm de profondeur (nord-sud : l'épaisseur de la masse), 340 cm de haut
  (de la crête du feuillage au bout de la plus longue liane).
- Forme : boîte (`box`).
- À l'écran : 230 × (68 + 16) = **230 × 84 px** (dessiné 230 × 84, contour compris).
- Pose : son point Tiled est sur la crête du talus sud de l'entrée ; la rangée 62 de l'image (`root`) se pose sur ce point, à la
  hauteur de la crête (projection A : h/5 cm plus haut) ; le feuillage au-dessus couvre la bouche à l'écran, les lianes au-dessous
  pendent dans le couloir (cachées par le talus sud quand on le voit de loin).

## Vues
- Au sol (posé) : `lane-curtain`, une masse basse à la crête cassée (jamais en étagère, jamais en boules), plus haute à l'ouest (le
  côté du couloir), effilochée à l'est ; feuillage en petites grappes éclairées en haut à gauche ; lianes de longueurs très inégales,
  plusieurs jusqu'au bas. Contour `o` en bas et à droite, `k` côté lumière.
- Symétrie : une seule vue dessinée, pour un couloir est-ouest. **Manque** : les vues tournées (`-r1` à `-r3`), qui ne servent pas tant que le couloir est est-ouest :
  `VIEWS_TODO` (validate.ts), avec cette raison (décision de Grégoire, 4 novembre).
- En main, porté, case d'interface : non.
- Fantôme : en mode construction, son image en transparence.
- L'ombre : aucune peinte ; le jeu la calcule (fixe, comme celle des toits) et assombrit la bouche dessous.

## Variantes naturelles
Une seule forme (il n'y en a qu'un, à la bouche). Les avancées (`lane-overhang-1..3`) donnent la variété le long du couloir.

## Regroupement
Seul.

## Gestes
Aucun pour l'instant. **Limite listée** : couper le feuillage (le dégager, en récolter des branches et des lianes) viendra plus tard ;
les données devront le permettre (un `harvest` à la serpe ou à la hachette, au coup : `work` en quantité de feuillage, ses `stages`,
ce qui naît : branches, lianes).

## Travail
Aucun pour l'instant (voir Gestes : la coupe du feuillage, plus tard, au coup, comme toute récolte).

## Arme
Aucune.

## Origine
Naturel : posé dans la carte de la ferme, à l'entrée du chemin creux.

## Devenir
Il reste. Plus tard : coupé, il laisse la bouche ouverte et donne des branches et des lianes.

## Transformations
Aucune.

## Métier
Aucun (une chose naturelle).

## Vérification
- Aperçu : `.art-preview/relief-final-1-matieres.png` (seul, x1 et x2, sa rangée d'enracinement en rouge),
  `.art-preview/relief-final-2-entree.png` (posé à la bouche), `.art-preview/relief-final-6-voute.png` (la voûte).
- En jeu : depuis la ferme, la bouche est sombre sous le rideau ; Xéros passe dessous, le rideau s'efface autour de lui.
