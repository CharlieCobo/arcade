# Arcade

Baúl de minijuegos para el móvil. PWA hecha con Vite + React + TypeScript: se instala en la pantalla de inicio y funciona sin conexión.

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
      Icon.tsx
  pages/                        # Home (baúl), GamePage, NotFound
  components/                   # Shell, ReloadPrompt (actualizaciones PWA)
  lib/                          # haptics, useLocalStorage
  styles/global.css             # tokens de diseño
```

## Añadir un juego

1. Crea `src/games/<id>/` con un componente por defecto y, si tiene reglas, su lógica pura con tests.
2. Añade un icono (`Icon.tsx`).
3. Registra el juego en `src/games/registry.ts`. Aparecerá en el baúl y en `#/juegos/<id>`.

## Despliegue

El workflow `.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `main`. Hay que activarlo una vez en **Settings → Pages → Source: GitHub Actions**.

La app usa `HashRouter`, así que no hace falta configurar redirecciones en Pages. Los iconos de la PWA se generan desde `public/logo.svg` con `npm run generate-pwa-assets`.
