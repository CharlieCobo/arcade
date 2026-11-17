import type { Pad } from './logic'

/**
 * Tonos del Simón original, generados con Web Audio (sin archivos de sonido).
 * El navegador solo deja sonar audio tras una interacción: llamamos a
 * unlockAudio() al pulsar "Jugar".
 */
const PAD_TONES: Record<Pad, number> = { 0: 415.3, 1: 310, 2: 252, 3: 209 }

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

export const playPad = (pad: Pad, ms: number) => tone(PAD_TONES[pad], ms, 'triangle', 0.22)
export const playError = () => tone(92, 650, 'sawtooth', 0.12)
