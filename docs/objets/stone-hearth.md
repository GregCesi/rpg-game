# Âtre (`stone-hearth`)

Décidé le 3 novembre 2026 (retouche de Grégoire, CONCEPTION « La maison de Xéros ») : une cheminée de pierre adossée au mur nord de
la salle commune remplace le foyer central (`hearth`). L'âtre en est la maçonnerie basse, d'un seul tenant. La matière et le feu sont
ceux de l'essai validé (`art/proposals/cheminee.ts`, `.art-preview/essai-cheminee.png` dans le worktree de l'essai). Les autres
pièces : [hotte](chimney-hood.md), [conduit](chimney-flue.md), [couronnement](chimney-cap.md), [pan de chaume percé](thatch-roof-pierced.md) ;
le manteau est une poutre (la pièce de bois `wood-piece`, 2,20 m est-ouest).

## Identité
- Clé : `stone-hearth`.
- Nom affiché : « âtre » (masculin).
- Nature : objet du monde (`props.json`), famille `mobilier` (comme le foyer) ; son feu animé (`anim: burn`, trois images) ; sa lueur
  (`light`, rayon 150, plus présente que celle du foyer, 110) ; pas de `smoke` : la fumée sort par le couronnement.
- Mains : aucune, il ne se prend pas.
- Âge : aucun, c'est de la pierre.

## Masse
`{"matter": "stone", "fill": 0.5}` : la boîte de 2,00 × 0,80 × 1,20 m (1,92 m³), moins l'ouverture (1,40 × 0,60 × 1,10 m, environ la
moitié) : 2,3 t de calcaire (2 400 kg/m³). Il ne se déplace pas.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 200 (est-ouest) × 80 (nord-sud) × 120 cm de haut, contour compris ; boîte.
- `ground: true` : la cheminée est faite de pièces posées les unes sur les autres, de profondeurs différentes (la hotte de 50 cm sur
  l'âtre de 80, le manteau de 30 au devant) ; le jeu les pose en (x, y − z), leur profondeur à l'échelle du sol : sans cela, la hotte
  ne tomberait pas sur l'âtre au pixel près (3 px d'écart). Taille à l'écran : 40 × (24 + 16) = **40 × 40 px** ; de côté **16 × 64**.
- Dedans : le dos et le contrecœur, 20 cm ; deux jambages de pierre de taille de 30 cm ; l'ouverture de 1,40 m de large, 60 de
  profond, 1,10 m sous le linteau de pierre (10 cm, 30 de profond, au devant).

## Vues
Quatre (`four`, il a un devant), chacune une planche à l'animation `burn` (le feu ne se voit que de face : r1 à r3 ont trois fois la
même image).
- r0 (de face, 40 × 40) : les jambages en blocs dressés, le linteau, le contrecœur noirci, le feu (deux chenets de fer, trois bûches
  en écorce, les flammes qui vacillent), la cendre et ses braises, la dalle de l'âtre au devant ; sur le dessus, l'avaloir noirci
  (la hotte posée dessus le couvre).
- r1, r3 (de côté, 16 × 64) : le flanc d'un jambage et du dos, l'avaloir vu d'en haut.
- r2 (de dos, 40 × 40) : le dos en moellons, ses angles en pierre de taille.
- Fantôme : la vue de face en transparence (mode construction).

## Variantes naturelles
Aucune : de la pierre taillée et montée, régulière à la mesure du maçon.

## Regroupement
Seul.

## Gestes
- Mode construction : posé au sol, contre le solin nord de la salle (tools/lib/maison-xeros.ts, x 680, y 30).
- E : rien encore (on y mettra le bois, comme au foyer).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Bâti par le maçon : moellons de calcaire et mortier de chaux, pierre de taille pour les jambages et le linteau, une dalle au devant.

## Devenir
Il reste.

## Transformations
Aucune.

## Métier
Le maçon (`mason`).

## Vérification
- `.art-preview/maison-pieces.png` (avant-dernière rangée : ses trois images, ses vues r1 à r3 ; dernière rangée : la cheminée montée),
  `.art-preview/stone-hearth.png`.
- Collisions (`bodies`, posé depuis Tiled) : le dos et les deux jambages, pas l'ouverture. Posé en mode construction, le jeu fait de
  toute son emprise un obstacle (`blocks`, src/world/build.ts).
- En jeu : poser l'âtre en mode construction, la hotte dessus (z = 120), regarder qu'elle tombe juste ; le soir, la lueur.
