# Avancées de feuillage (`lane-overhang-1`, `lane-overhang-2`, `lane-overhang-3`)

Les masses de feuillage et de lianes qui se penchent au-dessus du chemin creux depuis la crête d'un talus (chantier « relief », 4
novembre 2026). Avec le rideau de la bouche (`lane-curtain`) et les arbres ordinaires du jeu, debout, au bord des talus, elles
referment la voûte du couloir (aucun arbre penché). Trois formes, une fiche.

## Identité
- Clés : `lane-overhang-1`, `lane-overhang-2`, `lane-overhang-3` (`props.json`, types des objets dans Tiled).
- Nom affiché : avancée de feuillage.
- Nature : objets du monde, fixes, sans `take`, sans corps. Posées sur la crête sud, elles font partie du bord sud : elles s'effacent
  quand Xéros est dessous (il en reste 0,2) ; posées sur la crête nord, elles couvrent la paroi nord et ne s'effacent pas.
- Mains : ne se prennent pas.
- Âge : non.

## Masse
- Aucune requise (pas de `take`). Pour mémoire (la coupe, plus tard) : environ 2 kg par m² de feuillage, de 25 à 40 kg chacune.

## Dimensions (gabarit, docs/STYLE.md section 8)
Boîtes (`box`) : W × (H + D/2), contour compris.
- `lane-overhang-1` : 800 × 140 × 230 cm, **160 × 60 px** : une langue longue et plate, lourde à l'est.
- `lane-overhang-2` : 640 × 120 × 270 cm, **128 × 66 px** : une masse haute et bombée à la crête déchirée, une branche morte qui en
  sort.
- `lane-overhang-3` : 520 × 100 × 190 cm, **104 × 48 px** : petite, dissymétrique, un rideau de lianes serré.
- Pose : le point Tiled sur la crête du talus ; la rangée `root` de l'image (30, 30, 24) se pose sur ce point, à la hauteur de la
  crête ; le feuillage au-dessus, les lianes au-dessous.

## Vues
- Au sol (posé) : chacune son image, son contour (`o` en bas et à droite, `k` côté lumière), lumière en haut à gauche.
- Symétrie : une vue chacune, pour un couloir est-ouest. **Manque** : les vues tournées (`-r1` à `-r3`), à dessiner avant
  l'intégration, ou `VIEWS_TODO` avec cette raison.
- En main, porté, case d'interface : non. Fantôme : leur image en transparence.
- L'ombre : calculée par le jeu, jamais peinte.

## Variantes naturelles
Trois formes, trois silhouettes (elles ne se confondent ni entre elles ni avec le rideau) ; la carte les alterne le long du couloir.

## Regroupement
Seules.

## Gestes
Aucun pour l'instant. **Limite listée** : couper le feuillage viendra plus tard ; les données devront le permettre (un `harvest` au
coup, sa matière, ses étapes, ce qui naît : branches, lianes).

## Travail
Aucun pour l'instant (la coupe, plus tard, au coup).

## Arme
Aucune.

## Origine
Naturelles : posées dans la carte de la ferme, le long du chemin creux, sur la crête des talus (côté ferme, rivière et plateau).

## Devenir
Elles restent. Plus tard : coupées, elles donnent des branches et des lianes.

## Transformations
Aucune.

## Métier
Aucun.

## Vérification
- Aperçu : `.art-preview/relief-final-1-matieres.png` (seules), `.art-preview/relief-final-3-couloir.png`,
  `.art-preview/relief-final-6-voute.png` (la voûte comparée à l'essai 4).
- En jeu : le long du couloir, la voûte se referme ; sous elle, Xéros reste visible (le bord sud s'efface).
