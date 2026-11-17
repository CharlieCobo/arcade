import type { PointerEvent } from 'react'
import { useRepeatPress, type RepeatConfig } from './useRepeatPress'
import styles from './DPad.module.css'

export type DPadDirection = 'up' | 'down' | 'left' | 'right'

interface Props {
  onPress: (dir: DPadDirection) => void
  /** Textos accesibles (los traduce cada juego) */
  labels: Record<DPadDirection, string> & { group: string }
  /** Direcciones que se repiten al mantener pulsado (p. ej. mover piezas) */
  repeat?: Partial<Record<DPadDirection, RepeatConfig>>
  /** Botón central opcional (pausa / jugar) */
  center?: { icon: 'play' | 'pause'; label: string; onPress: () => void }
}

const ROTATION: Record<DPadDirection, number> = { up: 0, right: 90, down: 180, left: 270 }
const ORDER: DPadDirection[] = ['up', 'left', 'right', 'down']

function Arrow({ dir }: { dir: DPadDirection }) {
  return (
    <svg className={styles.arrow} viewBox="0 0 24 24" style={{ transform: `rotate(${ROTATION[dir]}deg)` }} aria-hidden="true">
      <path d="M12 5 L20 16 L4 16 Z" fill="currentColor" />
    </svg>
  )
}

function CenterIcon({ icon }: { icon: 'play' | 'pause' }) {
  return (
    <svg className={styles.centerIcon} viewBox="0 0 24 24" aria-hidden="true">
      {icon === 'pause' ? (
        <>
          <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
          <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
        </>
      ) : (
        <path d="M8 5 L19 12 L8 19 Z" fill="currentColor" />
      )}
    </svg>
  )
}

/**
 * Cruceta tipo consola. Responde en pointerdown (sin esperar a soltar)
 * y opcionalmente repite al mantener pulsado.
 */
export function DPad({ onPress, labels, repeat, center }: Props) {
  const press = useRepeatPress()

  const down = (dir: DPadDirection) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId) // seguir recibiendo eventos aunque el dedo se desplace
    } catch {
      // Algunos navegadores no lo permiten: la pulsación funciona igual
    }
    press.start(() => onPress(dir), repeat?.[dir])
  }

  return (
    <div className={styles.dpad} role="group" aria-label={labels.group}>
      {ORDER.map((dir) => (
        <button
          key={dir}
          type="button"
          className={`${styles.btn} ${styles[dir]}`}
          aria-label={labels[dir]}
          onPointerDown={down(dir)}
          onPointerUp={press.stop}
          onPointerCancel={press.stop}
          onLostPointerCapture={press.stop}
          onContextMenu={(e) => e.preventDefault()}
          // Teclado / lectores de pantalla: Enter y espacio disparan click, no pointerdown
          onClick={(e) => {
            if (e.detail === 0) onPress(dir)
          }}
        >
          <Arrow dir={dir} />
        </button>
      ))}
      {center && (
        <button type="button" className={`${styles.btn} ${styles.center}`} aria-label={center.label} onClick={center.onPress}>
          <CenterIcon icon={center.icon} />
        </button>
      )}
    </div>
  )
}
