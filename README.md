# Arcade

Baúl de minijuegos para el móvil, en español, inglés y portugués. PWA hecha con Vite + React + TypeScript: se instala en la pantalla de inicio y funciona sin conexión.

## Juegos

| Juego | Descripción |
| --- | --- |
| **Tres en raya infinito** | Cada jugador solo puede tener 3 fichas. Al colocar la cuarta, desaparece la más antigua. Modo 2 jugadores y contra CPU. |

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm test           # tests de lógica (Vitest)
npm run lint
npm run build      # build de producción + service worker
npm run preview    # sirve el build (para probar la PWA)
```

Para probar en el móvil en la misma red: `npm run dev -- --host`.

## Estructura

```
src/
  games/
    registry.ts                 # listado del baúl
    types.ts
    infinite-tic-tac-toe/
      logic.ts                  # lógica pura, sin React
      logic.test.ts
      InfiniteTicTacToe.tsx     # pantalla del juego
      components/               # Board, PlayerCard
      locales/                  # es, en, pt
      Icon.tsx
  pages/                        # Home (baúl), GamePage, NotFound
  components/                   # Shell, ReloadPrompt (actualizaciones PWA)
  i18n/                         # configuración i18next, idiomas y textos comunes
  lib/                          # haptics, useLocalStorage
  styles/global.css             # tokens de diseño
```

## Idiomas

Disponible en español, inglés y portugués con [react-i18next](https://react.i18next.com/). El idioma se detecta del navegador (`pt-BR` → `pt`), se puede cambiar con el selector ES/EN/PT y se guarda en `localStorage`. Si el idioma del navegador no está soportado, se usa inglés.

- Textos comunes: `src/i18n/locales/{es,en,pt}.json` (namespace `common`).
- Textos de cada juego: `src/games/<id>/locales/{es,en,pt}.json` (namespace `<id>`).
- Las claves están tipadas: una clave que no existe da error al compilar.
- Un test comprueba que todos los idiomas tienen las mismas claves que `es`.

Para añadir un idioma: crea sus JSON, regístralos en `src/i18n/resources.ts` y añádelo a `src/i18n/languages.ts`.

## Añadir un juego

1. Crea `src/games/<id>/` con un componente por defecto y, si tiene reglas, su lógica pura con tests.
2. Añade un icono (`Icon.tsx`) y sus traducciones en `locales/` con `meta.title`, `meta.description` y `meta.tags`.
3. Registra sus locales en `src/i18n/resources.ts` con el namespace `<id>`.
4. Registra el juego en `src/games/registry.ts`. Aparecerá en el baúl y en `#/juegos/<id>`.

## Despliegue

El workflow `.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `main`. Hay que activarlo una vez en **Settings → Pages → Source: GitHub Actions**.

La app usa `HashRouter`, así que no hace falta configurar redirecciones en Pages. Los iconos de la PWA se generan desde `public/logo.svg` con `npm run generate-pwa-assets`.
