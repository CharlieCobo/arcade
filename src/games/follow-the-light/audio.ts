import type { Pad } from './logic'

/**
 * Tonos de las cuatro luces, generados con Web Audio (sin archivos de sonido).
 * El navegador solo deja sonar audio tras una interacción: llamamos a
 * unlockAudio() al pulsar "Jugar".
 */
/** Arpegio de Do mayor (do, mi, sol, do agudo): suena bien en cualquier orden. */
const PAD_TONES: Record<Pad, number> = { 0: 261.63, 1: 329.63, 2: 392, 3: 523.25 }

let ctx: AudioContext | null = null

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null // sin audio disponible: el juego funciona igual
  }
}

function tone(freq: number, ms: number, type: OscillatorType, volume: number) {
  if (!ctx) return
  try {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    // Envolvente suave para que no "chasquee" al empezar y acabar
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + 0.015)
    gain.gain.setValueAtTime(volume, t + ms / 1000 - 0.04)
    gain.gain.linearRampToValueAtTime(0, t + ms / 1000)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + ms / 1000 + 0.02)
  } catch {
    // ignorar errores de audio
  }
}

export const playPad = (pad: Pad, ms: number) => tone(PAD_TONES[pad], ms, 'sine', 0.26)
export const playError = () => tone(92, 650, 'sawtooth', 0.12)
