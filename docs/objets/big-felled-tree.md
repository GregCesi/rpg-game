# Gros arbre couché (`big-felled-tree`, `big-pollard-felled-tree`)

Décidé le 30 octobre 2026 (chantier « pièce de bois ») : les deux gros arbres se couchent comme l'arbre normal, **d'un seul
tenant**, tronc et houppier, au lieu de sections à encoches fixes et de billes numérotées. Une fiche pour les deux.

## Identité
- Clés : `big-felled-tree` (le gros grand couché), `big-pollard-felled-tree` (le têtard couché), et leurs images `-left`
  (tombés vers la gauche : dessinées, lumière en haut à gauche, pas retournées). Toutes aussi clés d'image.
- Noms affichés : arbre couché, têtard couché.
- Nature : objets du monde (`props.json`), avec un `harvest` (la cognée, le houppier). Mains : ils ne se prennent pas.

## Masse
Pas déplaçables, pas de masse. Ébranchés, leur tronc est une pièce de bois ronde du gros : 4 m, **855 kg** (le gros grand), 2 m,
**428 kg** (le têtard) ; au-delà des 300 kg que Xéros fait rouler, ils ne bougent pas : c'est le calcul qui le dit.

## Dimensions (gabarit, docs/STYLE.md section 8)
- Le gros grand couché : 500 × 150 × 75 cm (boîte) : **100 × 30 px**. Le têtard couché : 300 × 150 × 75 cm : **60 × 30 px**.
- Tronc de 55 cm (13 px contour compris), exactement la pièce de bois `big` ronde de 400 cm (200 cm) que le jeu assemble ; le
  houppier par-dessus, au bout.
- Collisions : le tronc (celle de la pièce de bois) et le houppier ; point visé : le houppier.

## Vues
- Au sol : la dernière image de la chute (`big-tree-fall`, `big-pollard-fall`, et `-left`), pixel pour pixel, posée avec la
  souche (vérifié par `arbres.png`).
- En main, case d'interface, fantôme : aucun.

## Regroupement
Seul.

## Gestes
- Espace, la cognée, de haut en bas sur le houppier (3 coups) : des branches tombent, et le tronc ébranché devient une seule pièce
  de bois ronde de sa longueur utile, à la place exacte du tronc (`harvest` : `becomes: "wood-piece"`, `wood`, `at`).

## Origine
L'arbre debout abattu (4 coups de cognée), qui tombe du côté opposé à Xéros.

## Devenir
Ébranché : la [pièce de bois](wood-piece.md) qu'on coupe sur la grille de 20 cm (des billes de 1 m), qu'on fend.

## Vérification
- Aperçu : `.art-preview/arbres.png` (debout, chutes, couché, ébranché, coupé à 1 m, billes, tas).
- Test : `npm run test:equarrissage` (le gros grand et le têtard abattus, ébranchés, coupés à 1 m).
