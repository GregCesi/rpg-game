# Mannequin d'entraînement (`training-dummy`)

Un poteau planté, une botte de chaume liée dessus avec de la corde : de quoi frapper sans rien casser (CONCEPTION, « Le combat »).

## Identité
- Clé : `training-dummy` (`props.json`).
- Nom affiché : mannequin d'entraînement.
- Nature : objet du monde, fixe (planté), sans `take`. Composant `target` : il encaisse les coups.
- Mains : ne se prend pas.
- Âge : non. Ses pièces sont du bois brut (la perche, avec son écorce) et de la paille : rien de bois travaillé.

## Masse
- Saisie, **29 kg** : la somme de ses trois pièces (la perche de 2 m, 20,4 kg ; la botte de chaume, 8,5 kg ; le lien, 0,2 kg).
  Il ne se déplace pas : la masse sert au bilan de sa transformation (validate.ts : la sortie ne pèse pas plus que l'entrée).

## Dimensions (gabarit, docs/STYLE.md section 8)
- Debout : 1,70 m hors de terre (la perche de 2 m, 30 cm dans le sol), Ø 30 cm à la botte (la perche fait Ø 12 cm).
- La botte de chaume (120 × Ø 30 cm) est liée debout contre le haut de la perche, de 50 cm à 1,70 m, par deux tours de lien.
- Boîte : cylindre debout 30 × 30 × 170 cm. À l'écran : **6 × 37 px**.
- Collision : la perche seule au pied (4 × 3 px).

## Vues
- Symétrie : ronde (`views: "round"`) : une seule vue, pareille de tous côtés (le nœud du lien se voit d'un côté, sans importance).
- Au sol : la perche écorcée qui sort de l'herbe, la botte serrée par deux liens, les épis en haut ; ombre portée.
- En main : ne se prend pas.
- Fantôme : en mode construction, son image en transparence là où il ira.
- Sous un coup (le jeu, pas un dessin) : il tremble, recule d'un pixel et penche de quelques degrés autour de son pied, du côté opposé
  à Xéros, puis revient ; des brins de paille volent (`fx-straw`).

## Variantes naturelles
Aucune : un assemblage fait de main d'homme.

## Regroupement
Seul.

## Gestes
- E court, E maintenu, R, Q : rien.
- Espace avec une arme : le frapper. Il ne casse jamais (`target.hp: "infinite"`).

## Origine
Dressé par le paysan : la perche plantée à la bêche, la botte liée dessus. Transformation `raise-training-dummy`, geste à venir. En
attendant : ?dieu, « Poser » ou « Transformer », ou le mode construction (`?construire`), où il est au catalogue.

## Devenir
Il reste planté. Plus tard, la paille s'use et se remplace (pas encore).

## Transformations
- `raise-training-dummy` : une perche de 2 m, une botte de chaume et un lien -> le mannequin (rien ne se perd). Outil : la bêche.
  Poste : au sol. Geste : à venir.

## Métier
Le paysan (`peasant`).

## Vérification
- Aperçu : `.art-preview/collection.png`, `.art-preview/combat.png`, à côté de `gabarit.png`.
- Outils de test : ?dieu, « Poser » le mannequin ; `?construire` : le poser du catalogue.
- En jeu : `npm run test:combat` ; à la main, une branche ou l'épée de bois en main active devant lui, Espace : il tremble et
  penche, la paille vole ; avec `?debug`, les dégâts au-dessus de lui.
