# Piquet (`stake`, `planted-stake`)

Une fiche pour le piquet qu'on porte (`stake`, objet possédable) et le piquet planté (`planted-stake`, objet du monde qui le montre en terre).

## Identité
- Clés : `stake` (`items.json`), `planted-stake` (`props.json`).
- Nom affiché : piquet ; piquet planté.
- Nature : `stake` est un objet possédable (`kind: resource`) ; `planted-stake` est un objet du monde sans `take` ni collision : le jeu l'affiche aux coins d'un tracé (GameState, `sites`), il ne se pose pas dans Tiled.
- Mains : une.

## Masse
- **1 kg**, saisie (`mass: 1`) : une branche de 100 cm taillée en pointe, Ø 5 cm. Sans effet sur Xéros.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Bois rond ou équarri de 5 cm de section, 100 cm de long, taillé en pointe à un bout, contour compris.
- Couché (`stake-ground`) : boîte 100 × 5 × 5 cm. À l'écran : W = 20 px ; H + D/2 = 1 + 2,5 = 3,5 px, plancher de lisibilité compris : **20 × 3**.
- Planté (`planted-stake`) : 75 cm hors de terre (25 cm dans le sol), boîte 5 × 5 × 75 cm : W = 1 px (agrandi au plancher : 2 px), hauteur 15 + 2,5 = **2 × 15** à 17 px. Un trait de bois clair, pointe enfoncée dans l'herbe, tête taillée plate.

## Vues
- Symétrie : quatre vues (`views: "four"`, couché, `lying`) : `stake-ground` (la pointe à l'est), `stake-ground-r1` (au sud), `stake-ground-r2` (à l'ouest), `stake-ground-r3` (au nord), chacune dessinée, lumière en haut à gauche ; les vues nord-sud ont les dimensions de l'est-ouest inversées (règle D, docs/STYLE.md section 8). R les fait défiler à la pose.
- Au sol (`stake-ground`) : couché, la pointe d'un côté, le bois d'une branche écorcée (matière `NORMAL_WOOD`, `art/world/wood.ts`), ombre portée dessous. Pas de version `-left`.
- En main (`held-stake`, posture `hand`, vues `down`, `up`, `right`) : tenu au poing, la pointe en bas le long de la jambe ; de profil (`right`), toute sa longueur ; de face et de dos, un trait court.
- Case d'interface : `item-stake`, 16 × 16, le piquet en diagonale, pointe en bas à gauche.
- Planté (`planted-stake`) : debout, la pointe dans le sol, la tête taillée en haut. Le jeu l'affiche aussi en transparence (fantôme) pour les coins du tracé où il reste à en planter.
- Fantôme : `planted-stake` à moitié transparent, aux coins libres du tracé.

## Regroupement
Seul. Ne s'entrepose pas ; quatre piquets tracent l'emprise d'un plan.

## Gestes
- E court : le prendre (au sol) ; sur un piquet planté dont le chantier n'est pas encore né, le reprendre (on change d'emplacement).
- E maintenu : rien.
- Espace, piquet en main, plan connu : le planter, au point que regarde Xéros. Le premier fixe le coin nord-ouest du tracé ; les trois autres coins apparaissent en fantôme et les piquets suivants ne se plantent que là (le coin le plus près à 12 px s'aimante). Sans plan : « Xéros ne sait pas encore quoi tracer. ». Hors d'un coin : « Les piquets se plantent aux coins du tracé. ». Coûte 0,5 point d'endurance (`stake`, stamina.json).
- R : rien. Q : le lâche devant Xéros.

## Origine
Taillé à la [hachette](hatchet.md) : on tient la branche debout d'une main, la pointe appuyée sur le billot (`chopping-block`), la hachette dans l'autre main, face au billot, Espace : un coup (geste `chop`), et la branche devient un piquet, qui reste dans la main qui la tenait. Coûte 0,4 point d'endurance (`whittle`), moins qu'un coup de cognée. Si l'autre main ne tient pas de branche : « Tiens la branche ou le piquet debout sur le billot, de l'autre main. »

## Devenir
Planté, il trace un coin du chantier. Quand le dé de ce coin est posé, le piquet est arraché et retombe au sol à côté, réutilisable.

## Vérification
- Aperçu : `.art-preview/collection.png` (`stake-ground`, `planted-stake`, `item-stake`), `.art-preview/hands.png` (`held-stake`), `.art-preview/woodshed-*.png`, à côté de `gabarit.png`. `npm run check` vérifie 2 × 15 et 20 × 3.
- En jeu : voir la liste de [l'implantation](plan-tablet.md#vérification).
