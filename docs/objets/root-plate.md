# Galette de racines (`root-plate`) et trou de déracinement (`uprooted-hole`)

L'arbre normal déraciné par la tempête (CONCEPTION « La tempête ») : sa galette de racines arrachée, dressée au pied de l'arbre
couché, et le trou qu'elle laisse dans le sol. L'arbre couché lui-même est l'[arbre couché](normal-tree.md) du jeu
(`normal-felled-tree`) : la galette cache son bout scié. Une fiche pour les deux.

## Identité
- Clés : `root-plate` (la galette), `uprooted-hole` (le trou). Aussi clés d'image.
- Noms affichés : galette de racines, trou.
- Nature : objets du monde (`props.json`), sans récolte pour l'instant.
- Mains : aucune.
- Âge : aucun (ni l'un ni l'autre n'est du bois travaillé).

## Masse
- Galette : la motte de terre et de racines, masse par sa matière (`"mass": { "matter": "earth", "fill": 0.3 }` : le volume de ses
  `dims` à 30 %, terre de matters.json). Bien au-delà de ce que Xéros porte ou roule : elle ne se déplace
  pas. La terre et les racines qu'elle porte sont celles du trou.
- Trou : c'est du sol, pas de masse.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Galette : 150 cm de large racines comprises (la motte seule 110 cm), 30 cm d'épaisseur, 125 cm de haut (Grégoire : à la mesure
  d'un tronc de 30 cm). Dimensions déclarées en cylindre est-ouest, `{w: 110, d: 150, h: 125}` : son profil se dessine comme le
  bout d'une bille (l'ovale de la face et sa tranche, les racines de profil), validé par Grégoire ; vues de 24 × 28 (profils) et
  29-30 × 26-28 px (dessus et face), dans les 2 px du gabarit.
- Trou : 115 × 105 cm, à plat (`flat`, `layer` du sol) : 23 × 21 px.
- Places dans l'arbre déraciné (coins bas gauches, par rapport à celui de l'arbre couché vers l'est) : la galette (-18, +1), le trou
  (-31, -2) (`UPROOTED` de art/world/storm.ts).

## Vues
- Galette : quatre vues (`four`) selon le côté où l'arbre est tombé : `root-plate` (couché vers l'est, la galette à son bout
  ouest, de profil), `-r1` (vers le sud), `-r2` (vers l'ouest, l'autre profil, sa propre lumière), `-r3` (vers le nord, de face :
  ses racines rayonnent, enfouies ou cassées courtes en bas, où elle touche la terre). Des mottes tombées à son pied.
- Trou : rond (`round`), une vue : terre retournée sur le bord, la paroi nord-ouest dans l'ombre, de l'eau de pluie au fond.
- Dessins : `art/world/storm.ts` (pixel-artist), planche `.art-preview/tempete.png`.

## Regroupement
Seuls ; posés ensemble avec l'arbre couché (trou, galette, arbre).

## Gestes
Aucun pour l'instant : la galette ne se travaille pas encore (la couper à la hache, la remettre en terre viendront plus tard).

## Travail
Aucun pour l'instant.

## Arme
Aucune.

## Origine
La tempête : posés dans les cartes (Tiled), sur la ferme et le long du chemin, au bout ouest d'un arbre couché.

## Devenir
Pas encore.

## Vérification
- Aperçu : `.art-preview/tempete.png` (`npx tsx tools/essai-tempete.ts`).
- Test : `tools/test-paysage.ts` (chaque galette au bout d'un arbre couché, son trou à côté ; jamais à moins de 20 m de la maison).
