# Sanglier mort (`dead-boar`)

Ce que devient un [sanglier](boar.md) tué (chantier « sangliers », 4 novembre 2026) : la matière se conserve, le sanglier devient un
objet de sa masse, là où il meurt.

## Identité
- Clé : `dead-boar` (`items.json`).
- Nom affiché : sanglier mort.
- Nature : objet possédable (`kind: resource`).
- Mains : deux.
- Âge : non.

## Masse
- **80 kg** (`mass: 80`), celle du sanglier vivant (validate.ts vérifie qu'elles sont égales). Plus que ce que Xéros porte (70 kg) :
  « Trop lourd pour lui (80 kg, il en porte 70) ».

## Dimensions (gabarit, docs/STYLE.md section 8)
- Couché sur le flanc : 140 cm de long, 80 cm de large (sa hauteur devenue profondeur), 40 cm de haut. Boîte 140 × 80 × 40, couchée
  (`lying`).
- À l'écran : est-ouest **28 × 16 px** ; nord-sud (règle D) **16 × 28 px** ; dessinés 28 × 15 et 15 × 28.

## Vues
- Symétrie : quatre vues (`views: "four"`, `lying`) : `dead-boar-ground` (tête à l'est, la dernière image de sa mort), `-r1` (tête au
  sud), `-r2` (tête à l'ouest), `-r3` (tête au nord), chacune rééclairée en haut à gauche (art/world/boar.ts).
- Au sol : sur le flanc, le ventre clair au nord, la crinière au sud, les pattes courtes et raides en biais, l'œil fermé en haut, le
  groin clair au bout.
- En main, case d'interface : **pas encore dessinés** (`DRAWINGS_TODO` de validate.ts : il ne se porte qu'à la force de ?dieu, et le
  dépeçage viendra dans un autre chantier) ; le jeu le dit s'il est soulevé.
- Fantôme : l'image au sol en transparence.

## Variantes naturelles
Aucune (celles du sanglier viendront avec lui).

## Regroupement
Seul. Pas de tas.

## Gestes
- E : le prendre, s'il en a la force (sinon, trop lourd pour lui).
- R : le tourner avant de le poser ; A (Q) : le poser.

## Travail
Aucun pour l'instant.

## Arme
Aucune (`weapon` : non).

## Origine
Un sanglier tué : après sa bascule sur le flanc, il tombe là où le sanglier meurt (tourné vers l'ouest, la vue `-r2`), dans GameState
comme un objet posé au sol.

## Devenir
Le dépeçage, dans un autre chantier : la viande, la peau, les soies, les défenses, et le déchet nommé (une transformation de
transforms.json ; la masse se conserve).

## Transformations
Aucune pour l'instant.

## Métier
Le chasseur, plus tard ; aujourd'hui `peasant`.

## Vérification
- Aperçu : `.art-preview/sangliers-c-vues.png` (`npx tsx tools/essai-sangliers-c.ts` : ses quatre vues).
- En jeu : tuer un sanglier (`npm run test:sangliers`, la hache) : il bascule et devient un sanglier mort à sa place ; E dit qu'il est
  trop lourd.
