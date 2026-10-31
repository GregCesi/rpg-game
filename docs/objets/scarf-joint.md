# Enture en trait de Jupiter (`scarf`)

Décidée le 31 octobre 2026 (chantier « assemblages ») : au Moyen Âge, le charpentier prolonge une pièce par une autre sans clou ni
vis, en taillant leurs bouts pour qu'ils s'emboîtent et en les traversant de chevilles enfoncées au maillet. Le trait de Jupiter
est l'enture la plus sûre : deux biseaux en Z, une clé au milieu qui serre le tout, deux ou trois chevilles.

## Identité
- Clé : `scarf` (type d'assemblage, `JointTypeSchema` de src/content/types.ts) ; ce n'est pas un objet de props.json : une
  **jonction** entre deux pièces de bois (`wood-piece`).
- Nom affiché : enture en trait de Jupiter (féminin).
- Nature : un assemblage posé en mode construction (famille « assemblages » du catalogue), gardé par GameState (`joints` de la
  carte : type, les deux pièces).
- Mains : aucune (il ne se porte pas).

## Masse
Aucune à part : celle des deux pièces (et des chevilles, quelques dizaines de grammes, négligées).

## Dimensions (gabarit, docs/STYLE.md section 8)
Celles des deux pièces mises bout à bout : la longueur totale, la section commune. Les bouts taillés se recouvrent sur environ trois
fois la hauteur de la pièce (60 cm pour la poutre de 20 cm) : à l'écran, la marque fait une douzaine de pixels de long.

## Vues
- Les deux pièces se dessinent comme **une seule pièce de bois de leur longueur totale** (l'assemblage de la pièce de bois sait faire
  toute longueur : `woodTexture`), sans contour ni tête de bois à la jonction ; chaque pièce montre sa part (`world/jointView.ts`).
- Par-dessus, à la jonction, la marque : le biseau en Z et sa clé, les points des chevilles (2 ou 3), sur la face visible. Images
  `joint-scarf-<diamètre>-<sens>` (`big`, `normal`, `pole` ; `ew`, `ns` ; et `joint-scarf-normal-up` debout), dessinées par le
  pixel-artist (art/world/joints.ts).
- Fantôme : en mode construction, un cercle à la jonction visée, clair si les pièces vont ensemble, rouge sinon (et la raison dans le
  catalogue).

## Variantes naturelles
Aucune : un ouvrage de charpentier, régulier.

## Regroupement
Une enture réunit deux pièces ; plusieurs entures font une suite (une sablière de 8 m en trois pièces).

## Gestes (mode construction)
- Clic gauche sur la jonction de deux pièces de bois, l'enture en main : elle se pose si les deux pièces ont **la même section et le
  même état** (rondes, équarries…), **alignées sur le même axe** (est-ouest, nord-sud, ou debout l'une sur l'autre), et **se touchent
  par un bout**. Sinon un message dit pourquoi : « Les deux pièces doivent avoir la même section. », « … dans le même état… »,
  « … se toucher par un bout, alignées sur le même axe. », « Elles sont déjà assemblées. ».
- Clic droit sur la jonction : l'enture est retirée, les pièces restent.
- Une pièce entée ne se retire pas seule (« Retire d'abord l'assemblage… ») ; Maj + clic droit retire tout l'ensemble.

## Origine
En mode construction : posée d'un clic, sans fabrication. **Plus tard, en jeu** : il faudra tailler les deux bouts (la scie, le
ciseau à bois, le maillet), percer les trous des chevilles (une **tarière**), avoir les **chevilles** (`peg`, déjà au jeu : la
hachette sur le billot en tire d'un piquet) et les enfoncer au **maillet** (`mallet`) ; un geste par trou et par cheville, et un
métier de charpentier.

## Devenir
Elle tient tant que les deux pièces restent bout à bout. Retirée, les deux pièces redeviennent deux pièces.

## Transformations
Aucune pour l'instant (la taille des bouts viendra avec les gestes de charpente).

## Métier
Le charpentier (`carpenter`).

## Vérification
- `.art-preview/assemblages.png` : avant et après chaque assemblage, à côté de Xéros.
- `npm run test:construction` : deux poteaux debout l'un sur l'autre entés font un seul dessin, sans tête entre eux ; une enture
  refusée entre une poutre et une perche ; rechargé, tout est là.
