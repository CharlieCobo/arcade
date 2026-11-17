import { useTranslation } from 'react-i18next'
import { MAX_LEVEL, MIN_LEVEL, type Mode } from '../logic'
import type { Phase } from '../useSnakeGame'
import styles from '../Snake.module.css'

interface Props {
  phase: Phase
  mode: Mode
  level: number
  score: number
  best: number
  isRecord: boolean
  onModeChange: (mode: Mode) => void
  onLevelChange: (level: number) => void
  onStart: () => void
  onResume: () => void
  onChangeMode: () => void
}

const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i)

/** Pantallas sobre el tablero: inicio, pausa y fin de partida. */
export function Overlay(props: Props) {
  const { t } = useTranslation('snake')
  const { phase } = props
  if (phase === 'playing') return null

  return (
    <div className={styles.overlay}>
      {phase === 'ready' && <ReadyScreen {...props} />}

      {phase === 'paused' && (
        <>
          <h2 className={styles.overlayTitle}>{t('screens.paused')}</h2>
          <button className={styles.primary} onClick={props.onResume}>
            {t('screens.resume')}
          </button>
          <button className={styles.ghost} onClick={props.onStart}>
            {t('screens.restart')}
          </button>
        </>
      )}

      {(phase === 'over' || phase === 'won') && (
        <>
          <h2 className={styles.overlayTitle}>{t(phase === 'won' ? 'screens.won' : 'screens.over')}</h2>
          <div className={styles.finalScore}>{t('screens.points', { count: props.score })}</div>
          {props.isRecord && <div className={styles.record}>🏆 {t('screens.newRecord')}</div>}
          <button className={styles.primary} onClick={props.onStart}>
            {t('screens.playAgain')}
          </button>
          <button className={styles.ghost} onClick={props.onChangeMode}>
            {t('screens.changeMode')}
          </button>
        </>
      )}
    </div>
  )
}

function ReadyScreen({ mode, level, best, onModeChange, onLevelChange, onStart }: Props) {
  const { t } = useTranslation('snake')

  return (
    <>
      <div className={styles.segmented} role="group" aria-label={t('modes.label')}>
        <button aria-pressed={mode === 'classic'} onClick={() => onModeChange('classic')}>
          {t('modes.classic')}
        </button>
        <button aria-pressed={mode === 'no-walls'} onClick={() => onModeChange('no-walls')}>
          {t('modes.noWalls')}
        </button>
      </div>

      <p className={styles.hint}>{t(mode === 'classic' ? 'modes.classicHint' : 'modes.noWallsHint')}</p>

      {mode === 'classic' && (
        <div className={styles.levels} role="group" aria-label={t('level.label')}>
          {LEVELS.map((n) => (
            <button
              key={n}
              aria-pressed={level === n}
              aria-label={`${t('level.label')} ${n}`}
              onClick={() => onLevelChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <button className={styles.primary} onClick={onStart}>
        {t('screens.play')}
      </button>
      {best > 0 && (
        <div className={styles.hint}>
          🏆 {t('hud.best')}: {best}
        </div>
      )}
    </>
  )
}
