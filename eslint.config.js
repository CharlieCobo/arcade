import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * Capas de la arquitectura:
 *   app   → puede usar core y games
 *   games → cada juego es un módulo aislado: solo puede usar @core
 *   core  → no depende de nadie
 */
const noApp = { group: ['@app', '@app/*'], message: 'Solo app puede importar de @app.' }
const noGames = {
  group: ['@games', '@games/*'],
  message: 'Un juego no puede depender de otro juego. Lo compartido va en @core.',
}

/** Prohíbe salir de la carpeta del juego con rutas relativas (usa @core en su lugar). */
const gameDepthRule = (depth) => ({
  files: [`src/games/*/${'*/'.repeat(depth)}*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          noApp,
          noGames,
          {
            regex: `^(\\.\\./){${depth + 1},}`,
            message: 'No salgas del módulo del juego con rutas relativas: usa @core.',
          },
        ],
      },
    ],
  },
})

export default tseslint.config(
  { ignores: ['dist', 'dev-dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { ...noApp, message: 'core no puede depender de app.' },
            { ...noGames, message: 'core no puede depender de los juegos.' },
            { regex: '^(\\.\\./)+(app|games)(/|$)', message: 'core no puede depender de app ni de games.' },
          ],
        },
      ],
    },
  },
  gameDepthRule(0),
  gameDepthRule(1),
  gameDepthRule(2),
)
