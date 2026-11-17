# Baulix

Baúl de minijuegos para el móvil, en español, inglés y portugués. PWA hecha con Vite + React + TypeScript: se instala en la pantalla de inicio y funciona sin conexión.

## Juegos

| Juego | Descripción |
| --- | --- |
| **Tres en raya infinito** | Cada jugador solo puede tener 3 fichas. Al colocar la cuarta, desaparece la más antigua. Modo 2 jugadores y contra CPU, con **racha invicto** contra la CPU (abandonar una partida empezada la rompe). |
| **Snake** | El clásico de los móviles de antes, con D-pad, gestos y teclado. Modo **Clásico** (las paredes matan, niveles 1–9: más nivel, más puntos) y **Sin paredes** (atraviesas los bordes y la velocidad sube sola). Récord por modo. |
| **Bloques** | Encaja piezas y completa líneas en un tablero de 9×18, con bloques redondeados en la paleta de la app. Eliges el nivel inicial (1–15) antes de empezar y sube solo cada 10 líneas. Rotación SRS, haz de luz que marca dónde caerá la pieza, vista previa de 3 piezas, cruceta + botones A/B, gestos y teclado. |
| **Brick Bash** | Rompe ladrillos con la bola. Dificultad Fácil/Normal/Difícil (vidas, velocidad, ancho de pala y frecuencia de power-ups), 8 niveles que se repiten más rápido, 6 power-ups (ensanchar, láser, imán, lento, multibola, vida), ladrillos duros y de metal, combos, estela y partículas. Récord por dificultad. |
| **Tenis de mesa** | En vertical: 2 jugadores en el mismo móvil (cada uno controla su mitad, multitáctil) o contra la CPU (Fácil/Normal/Difícil). Partidos a 5, 7 u 11. Récord: el rally más largo. |
| **Ahorcado** | Adivina la palabra letra a letra. Modo solo (palabras propias en ES/EN/PT por categoría: animales, comida, países, objetos) o contra un amigo (uno escribe la palabra en secreto). Fácil/Normal/Difícil (10/6/4 fallos), pista que cuesta un intento, dibujo animado. Récord: mejor racha en solo. |
| **Sigue la luz** | Memoriza y repite la secuencia de cuatro luces redondas (rosa, cian, lima y violeta), cada una con su nota de un acorde de Do mayor (Web Audio). Modo Clásico o Al revés; Relajado (3 vidas) o Estricto (al primer fallo, se acaba). Se acelera según avanza, con celebración cada 5 rondas. Récord por modo. |
| **4 en raya** | Suelta fichas y conecta cuatro: 2 jugadores en el mismo móvil o contra la CPU (minimax con poda alfa-beta; Fácil/Normal/Difícil). Caída animada con rebote, línea ganadora iluminada. Récord: mejor racha invicto contra la CPU por dificultad. |
| **Buscaminas** | Descubre las casillas sin pisar minas. Tableros en vertical (9×9, 10×14, 12×18), primer toque siempre seguro, pulsación larga o modo bandera, abrir alrededor de un número, apertura en cascada y carita clásica. Récord: mejor tiempo por dificultad. |
| **Timbiriche** | Une puntos para cerrar cajas; cerrar una caja da otro turno. Tableros 4×4, 5×6 y 6×8, 2 jugadores o contra la CPU (Fácil, Normal, Difícil, que sacrifica las cadenas más cortas). Récord: racha invicto contra la CPU por dificultad. |

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

## Arquitectura

```
src/
  app/          # shell de la app: rutas, portada, i18n, aviso de actualización
  core/         # lo compartido: tipos de juego, store de puntos, utilidades, estilos
    game.ts       # contrato GameManifest + defineGame()
    scores/       # store de puntos (zustand + persist)
    ui/           # componentes compartidos por los juegos (DPad con auto-repetición)
    i18n/  lib/  styles/
  games/
    index.ts      # registro del baúl
    <id>/         # un módulo por juego
      index.ts      # manifiesto: defineGame({ id, accent, Icon, Component, locales })
      meta.ts       # GAME_ID
      logic.ts      # lógica pura + logic.test.ts
      scores.ts     # puntos del juego sobre el store compartido
      components/  locales/  *.module.css
```

**Reglas de dependencias** (las comprueba ESLint):

- `app` puede usar `core` y `games`.
- Un juego solo puede importar de `@core`: nunca de otro juego ni de `@app`, ni salir de su carpeta con rutas relativas.
- `core` no depende de nadie.

### Sistema de puntos

Un único store de [zustand](https://zustand.docs.pmnd.rs/) guarda los puntos de todos los juegos, persistido en `localStorage` con versión y migraciones (`arcade:scores`). Cada juego tiene:

- `best`: récord por modo de juego.
- `counters`: contadores libres (p. ej. victorias por modo y jugador).
- `history`: últimas 20 partidas.

Los juegos usan `useGameScores(GAME_ID)`, cuyas acciones ya llevan el id del juego, y la portada muestra el récord con `useBestScore(id)`. Para récords donde gana el número más bajo (tiempos), se pasa `{ lowerIsBetter: true }` y el manifiesto puede declarar `score: { lowerIsBetter, format }` para que el baúl lo muestre bien. El almacenamiento es un adaptador (`core/scores/storage.ts`): pasar a IndexedDB es cambiar ese archivo.

## Temas

Seis temas que se eligen con el botón de paleta del listado y se guardan en el navegador: **Baulix** (el de la casa, por defecto), **Retro** (paleta de cuatro colores de los PC de los 80, fuente de píxeles y líneas de CRT), **Claro**, **Kawaii** (pasteles y letra redondita), **Neón** (rosa y cian eléctricos con rejilla) y **Bosque**.

Cada tema redefine las variables CSS de `global.css` sobre `<html data-theme>`. `--x` y `--o` son los colores de los jugadores en todos los juegos; lo que se pinta en canvas o SVG lee el tema activo con `readThemeColors()` de `@core/theme`.

## Idiomas

Disponible en español, inglés y portugués con [react-i18next](https://react.i18next.com/). El idioma se detecta del navegador (`pt-BR` → `pt`), se puede cambiar con el selector ES/EN/PT y se guarda en `localStorage`. Si el idioma del navegador no está soportado, se usa inglés.

- Textos comunes: `src/app/i18n/locales/{es,en,pt}.json` (namespace `common`).
- Textos de cada juego: `src/games/<id>/locales/{es,en,pt}.json` (namespace `<id>`, registrado automáticamente).
- Las claves están tipadas: una clave que no existe da error al compilar.
- Un test comprueba que todos los idiomas tienen las mismas claves que `es`.

Para añadir un idioma: añádelo a `src/core/i18n/languages.ts` y crea sus JSON. TypeScript te avisará de los que falten.

## Añadir un juego

1. Crea `src/games/<id>/` con su `meta.ts` (`GAME_ID`), su lógica pura con tests, sus componentes, estilos y `locales/{es,en,pt}.json` (con `meta.title`, `meta.description` y `meta.tags`).
2. Exporta el manifiesto desde `index.ts` con `defineGame({...})`.
3. Añádelo a la lista de `src/games/index.ts`. La ruta `#/juegos/<id>`, la tarjeta del baúl y el namespace de traducciones se configuran solos.

## Despliegue

El workflow `.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `main`: https://charliecobo.github.io/baulix/ (la ruta sale del nombre del repo). Hay que activarlo una vez en **Settings → Pages → Source: GitHub Actions**.

La app usa `HashRouter`, así que no hace falta configurar redirecciones en Pages. Los iconos de la PWA se generan desde `public/logo.svg` con `npm run generate-pwa-assets`.
