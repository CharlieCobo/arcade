import { useTranslation } from 'react-i18next'
import type { Direction } from '../logic'
import styles from '../Snake.module.css'

interface Props {
  onDirection: (dir: Direction) => void
  /** Botón central: pausa / continúa / empieza */
  onCenter: () => void
  centerLabel: string
  centerIcon: 'play' | 'pause'
}

const ROTATION: Record<Direction, number> = { up: 0, right: 90, down: 180, left: 270 }
const DIRECTIONS: Direction[] = ['up', 'left', 'right', 'down']

function Arrow({ dir }: { dir: Direction }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" style={{ transform: `rotate(${ROTATION[dir]}deg)` }} aria-hidden="true">
      <path d="M12 6 L19 15 L5 15 Z" fill="currentColor" />
    </svg>
  )
}

function CenterIcon({ icon }: { icon: Props['centerIcon'] }) {
  return icon === 'pause' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5 L19 12 L8 19 Z" fill="currentColor" />
    </svg>
  )
}

/**
 * Cruceta tipo Nokia. Responde en pointerdown (al tocar, no al soltar)
 * para que no haya retraso entre el dedo y la serpiente.
 */
export function DPad({ onDirection, onCenter, centerLabel, centerIcon }: Props) {
  const { t } = useTranslation('snake')

  return (
    <div className={styles.dpad} role="group" aria-label={t('dpad.label')}>
      {DIRECTIONS.map((dir) => (
        <button
          key={dir}
          type="button"
          className={`${styles.dpadBtn} ${styles[dir]}`}
          aria-label={t(`dpad.${dir}`)}
          onPointerDown={(e) => {
            e.preventDefault()
            onDirection(dir)
          }}
          // Teclado / lectores de pantalla: Enter y espacio disparan click, no pointerdown
          onClick={(e) => {
            if (e.detail === 0) onDirection(dir)
          }}
        >
          <Arrow dir={dir} />
        </button>
      ))}
      <button type="button" className={`${styles.dpadBtn} ${styles.center}`} aria-label={centerLabel} onClick={onCenter}>
        <CenterIcon icon={centerIcon} />
      </button>
    </div>
  )
}
