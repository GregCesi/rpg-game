# Grand pan de tuiles plates (`tile-roof-large`, `tile-roof-large-pierced`)

Décidé le 4 novembre 2026 (chantier « forge », `CADRAGE-forge.md` ; décisions de Grégoire : l'atelier de la forge, version A, la
charpente de la grange ouverte au sud, en bois vieux, sur la première parcelle au nord de la rue, à l'entrée ouest du village ; ses
pièces validées ; le toit de la forge en [bardeaux](shingle-roof-large.md)) : **les trois couvertures restent des pièces du jeu pour
d'autres maisons**, chacune à sa pente ; celle-ci, les tuiles plates de terre cuite, à 45°. Le **pan percé** est le même pan, troué
pour un conduit.

## Identité
- Clés : `tile-roof-large`, `tile-roof-large-pierced`.
- Nom affiché : grand pan de tuiles plates ; grand pan de tuiles plates percé (masculin).
- Nature : objet du monde (`props.json`), famille `éléments`, pièce de toit (`roof: true`, `pitch: south` dans la vue 0), sans
  `take` : des tuiles plates de terre cuite accrochées par leur ergot à des lattes, à recouvrement.
- Mains : aucune.
- Âge : aucun (terre cuite ; les lattes ne se voient pas).

## Masse
- Par la matière : `{"matter": "terracotta", "fill": 0.0153}` sur la boîte de ses `dims` (960 × 340 × 340 cm, 111 m³), terre cuite
  1 900 kg/m³ : **3,2 t**, soit **70 kg/m²** sur 46,2 m² de pan (pente de 4,81 m sur 9,60 m), le poids d'une couverture de tuiles plates
  (CADRAGE-forge.md, section 0 : environ 70 kg/m², connaissance générale, non sourcée).
- **La part annoncée d'abord, 0,153, donnait 32 t (700 kg/m²) : dix fois trop.** 0,0153 est la part qui donne les 70 kg/m² du
  cadrage.
- Le pan percé : la même part.

## Dimensions (gabarit, docs/STYLE.md section 8)
- 9,60 m le long du faîtage, 3,40 m de la rive basse au faîte, 3,40 m de haut : **45°**, la pente d'une tuile plate (connaissance
  générale, **non sourcée** : moins, l'eau remonte entre les tuiles). Sur la charpente de la grange relevée, avec les pignons
  [`board-gable-tall`](board-gable-tall.md), comme le pan de bardeaux.
- `ground: true` : r0 et r2, **192 × 136 px** ; r1 et r3, **68 × 260 px** (comme le grand pan de bardeaux).

## Vues
- Quatre (`four`), le pan vu de dessus en trois quarts : les rangs de tuiles plates brun-rouge, leurs bouts arrondis ou droits, les
  joints décalés d'un rang à l'autre, la rive basse, le faîte (les faîtières de terre cuite : dessinées avec le pan). Lumière en haut à
  gauche, pas d'ombre peinte.
- Le pan percé : le trou et son solin de mortier au droit du conduit, comme le [pan de bardeaux percé](shingle-roof-large.md) ; sa
  place se fixera avec le plan qui l'emploiera.

## Variantes naturelles
Aucune : des tuiles moulées.

## Regroupement
Deux pans font un toit à deux versants.

## Gestes
- Mode construction : clic gauche le pose sur la sablière, R le tourne (le côté bas), clic droit le retire.
- En jeu : il ne bloque pas (posé au-dessus de 2 m) ; il s'efface selon le bâtiment (abri ouvert : quand Xéros est dessous).

## Travail
Aucun.

## Arme
Aucune.

## Origine
Pas encore fabriqué en jeu. **Il faudra un tuilier** (de l'argile, un four à tuiles), pas encore au jeu, ou des tuiles achetées à la
ville ; la tuile n'est pas encore un objet ; les lattes (la latte existe, `lath` de wood.json, mais pas le lattis posé).

## Devenir
Il reste ; une tuile cassée se remplace (pas encore au jeu).

## Transformations
Aucune pour l'instant.

## Métier
Le couvreur (`roofer`).

## Vérification
- `.art-preview/forge-pieces.png` : ses quatre vues, et le pan percé, au gabarit.
- `npm run check` ; aucun plan ne le pose encore.
