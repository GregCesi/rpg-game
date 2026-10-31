# Éclats de taille (`stone-chips`)

## Identité
- Clé : `stone-chips`. Nom affiché : éclats de taille.
- Nature : objet du monde (`props.json`), posé à plat sous les personnages (`layer: floor`), sans `take`.
- Mains : ne se prend pas (pour l'instant).

## Masse
Pas de masse déclarée : il ne se prend pas. Ce qu'il représente se calcule (l'entrée moins la sortie de la transformation qui le laisse : environ 20 kg pour un moellon, 4 kg pour une pierre de taille).

## Dimensions (gabarit, docs/STYLE.md section 8)
- 40 × 30 cm, à plat (`flat`) : **8 × 6** px.

## Vues
- Symétrie : ronde (un semis n'a pas de sens). Au sol : éclats anguleux et poussière de pierre, sans ombre portée.

## Variantes naturelles
Aucune pour l'instant (un seul dessin).

## Regroupement
Seul.

## Gestes
Aucun : on marche dessus.

## Origine
Le déchet de la taille : chaque transformation de pierre (`dress-rubble`, `dress-ashlar`) en laisse un au sol, à côté de Xéros. **Choix** : les éclats de pierre restent au sol (ils serviront de blocage dans le solin, plus tard à la pelle) ; les copeaux et les rameaux du bois, eux, disparaissent (ils partent au feu).

## Devenir
Plus tard : ramassés à la pelle pour le blocage du solin. Pour l'instant, ils restent.

## Transformations
Déchet de `dress-rubble` et `dress-ashlar`.

## Métier
Celui de la taille (carrier, maçon).

## Vérification
- Aperçu : `briques.png` (déchet des chaînes de la pierre).
- En jeu : ?dieu « Transformer » sur une grosse pierre brute : les éclats paraissent au sol. `npm run test:briques`.
