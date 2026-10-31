# Tenon et mortaise (`mortise`)

Décidé le 31 octobre 2026 (chantier « assemblages ») : l'assemblage de base de la charpente. Le bout d'une pièce est taillé en tenon
(une languette), qui entre dans une mortaise (un trou rectangulaire) creusée dans l'autre ; une cheville traverse les deux.

## Identité
- Clé : `mortise` (type d'assemblage, `JointTypeSchema`) ; pas un objet de props.json : une jonction entre deux pièces de bois.
- Nom affiché : tenon et mortaise (masculin).
- Nature : un assemblage posé en mode construction (famille « assemblages »), gardé par GameState (`joints` de la carte).
- Mains : aucune.

## Masse
Aucune à part.

## Dimensions (gabarit, docs/STYLE.md section 8)
Le tenon fait le tiers de l'épaisseur du poteau, une main de long ; on ne le voit pas, il est dans la mortaise. Seul le bout de la
cheville se voit : un point de 2 à 3 px.

## Vues
- Un poteau debout dont la **tête touche le dessous d'une pièce couchée** (la sablière), ou dont le **pied repose sur une sablière
  basse**. Rien ne change à la pose des pièces : le poteau touche déjà la sablière (pas de jour) ; la cheville (`joint-peg`, art/world/joints.ts)
  se voit **sur la face de la pièce couchée, au droit du poteau** (`world/jointView.ts`).
- Fantôme : un cercle à la jonction visée, clair si elle va, rouge sinon.

## Variantes naturelles
Aucune.

## Regroupement
Un tenon par jonction ; une sablière sur quatre poteaux en a quatre.

## Gestes (mode construction)
- Clic gauche sur la jonction d'un poteau et d'une pièce couchée, le tenon et mortaise en main : il se pose. Sinon : « Il faut un
  poteau sous une pièce couchée, ou sur une sablière basse. » ; deux pièces couchées qui se croisent : « Le mi-bois, pour des pièces
  qui se croisent, viendra plus tard. ».
- Clic droit sur la jonction : il est retiré. Une pièce assemblée ne se retire pas seule ; Maj + clic droit retire l'ensemble.

## Origine
En mode construction : posé d'un clic, sans fabrication. **Plus tard, en jeu** : tailler le tenon (scie, ciseau), creuser la
mortaise (ciseau et **maillet**, ou bédane), percer le trou de la cheville (**tarière**), enfoncer la **cheville** (`peg`) au maillet ;
un geste par étape.

## Devenir
Il tient tant que le poteau touche la pièce couchée. Retiré, les deux pièces restent posées.

## Transformations
Aucune pour l'instant.

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/assemblages.png` : un poteau sous une sablière, avant et après.
- `npm run test:construction` : le tenon entre le poteau et la sablière, retrouvé au rechargement ; le retrait refusé, puis Maj + clic
  droit retire les deux poteaux et la sablière.
