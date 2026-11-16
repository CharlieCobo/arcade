/** Vibración corta si el dispositivo la soporta (Android). En iOS no hace nada. */
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Algunos navegadores lanzan si no hay interacción previa: lo ignoramos.
  }
}
