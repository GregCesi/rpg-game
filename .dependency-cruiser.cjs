// Les règles d'architecture de Xéros (README.md, CLAUDE.md), vérifiées par dependency-cruiser : `npm run audit`.
// Une règle « error » qui casse doit être corrigée ; « warn » est un signal à regarder (docs/AUDIT.md).
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'pas-de-cycle',
      comment: 'Deux modules qui se dépendent l’un l’autre (directement ou par un détour) : à couper.',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
    {
      name: 'world-sans-phaser',
      comment:
        'src/world/ est le modèle sans Phaser : il se teste en Node, sans navigateur. Exceptions connues, des vues Phaser rangées là (docs/AUDIT.md : à déplacer) : GameMap, les *View, les *Texture, zoneBand.',
      severity: 'error',
      from: { path: '^src/world/', pathNot: ['^src/world/(GameMap|zoneBand)\\.ts$', '^src/world/[a-zA-Z]*(View|Texture)\\.ts$'] },
      to: { path: 'node_modules/phaser', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'content-sans-jeu',
      comment:
        'src/content/ (les données, leurs schémas, leurs vérifications) ne dépend de rien du jeu : ni scène, ni système, ni entité, ni état, ni Phaser.',
      severity: 'error',
      from: { path: '^src/content/' },
      to: { path: ['^src/(scenes|systems|entities|state|input|dieu|build)/', 'node_modules/phaser'] },
    },
    {
      name: 'state-sans-phaser',
      comment: 'GameState (src/state/) est sérialisable et se lit en Node : sans Phaser, sans scène ni système.',
      severity: 'error',
      from: { path: '^src/state/' },
      to: { path: ['node_modules/phaser', '^src/(scenes|systems|entities|input|dieu)/'] },
    },
    {
      name: 'world-ne-remonte-pas',
      comment: 'Le modèle (src/world/) ne dépend pas des systèmes, des scènes ni des entités du jeu (c’est l’inverse).',
      severity: 'error',
      from: { path: '^src/world/' },
      to: { path: '^src/(scenes|systems|entities|input|dieu)/' },
    },
    {
      name: 'le-jeu-ne-lit-pas-art',
      comment: 'Le jeu ne lit jamais art/ (les dessins passent par npm run art et src/generated/) ; seuls des types sont tolérés.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^art/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'le-jeu-ne-lit-pas-tools',
      comment: 'Le jeu ne dépend pas des outils de développement.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^tools/' },
    },
    {
      name: 'le-jeu-ne-lit-pas-tiled',
      comment: 'Le jeu ne lit jamais Tiled : les cartes passent par npm run maps et src/generated/.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^tiled/' },
    },
    {
      name: 'pas-d-orphelin',
      comment: 'Un module que rien n’importe (hors points d’entrée).',
      severity: 'info',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '^tools/', '^art/.*-preview\\.ts$', '^art/proposals/', '^vite\\.config\\.ts$', '^src/main\\.ts$'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^dist/' },
    tsPreCompilationDeps: true,
    parser: 'swc',
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'], extensions: ['.ts', '.js', '.json'] },
  },
};
