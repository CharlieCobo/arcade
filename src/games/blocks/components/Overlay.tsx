import { useTranslation } from 'react-i18next'
import { MAX_START_LEVEL, MIN_START_LEVEL } from '../logic'
import type { Phase } from '../useBlocksGame'
import styles from '../Blocks.module.css'

interface Props {
  phase: Phase
  startLevel: number
  score: number
  lines: number
  level: number
  best: number
  isRecord: boolean
  onStartLevelChange: (level: number) => void
  onStart: () => void
  onResume: () => void
  onEndGame: () => void
  onChangeLevel: () => void
}

const LEVELS = Array.from({ length: MAX_START_LEVEL - MIN_START_LEVEL + 1 }, (_, i) => MIN_START_LEVEL + i)

/**
 * Pantallas sobre el tablero. El nivel inicial solo se elige aquí, antes de empezar:
 * la pausa permite continuar o terminar, pero no cambiar la dificultad.
 */
export function Overlay(p: Props) {
  const { t } = useTranslation('blocks')
  if (p.phase === 'playing') return null

  return (
    <div className={styles.overlay}>
      {p.phase === 'ready' && (
        <>
          <h2 className={styles.overlayTitle}>{t('level.label')}</h2>
          <div className={styles.levels} role="group" aria-label={t('level.label')}>
            {LEVELS.map((n) => (
              <button key={n} aria-pressed={p.startLevel === n} onClick={() => p.onStartLevelChange(n)}>
                {n}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{t('level.hint')}</p>
          <button className={styles.primary} onClick={p.onStart}>
            {t('screens.play')}
          </button>
          {p.best > 0 && (
            <p className={styles.hint}>
              🏆 {t('hud.best')}: {p.best}
            </p>
          )}
        </>
      )}

      {p.phase === 'paused' && (
        <>
          <h2 className={styles.overlayTitle}>{t('screens.paused')}</h2>
          <button className={styles.primary} onClick={p.onResume}>
            {t('screens.resume')}
          </button>
          <button className={styles.ghost} onClick={p.onEndGame}>
            {t('screens.endGame')}
          </button>
        </>
      )}

      {p.phase === 'over' && (
        <>
          <h2 className={styles.overlayTitle}>{t('screens.over')}</h2>
          <div className={styles.finalScore}>{t('screens.points', { count: p.score })}</div>
          <p className={styles.hint}>{t('screens.summary', { count: p.lines, level: p.level })}</p>
          {p.isRecord && <div className={styles.record}>🏆 {t('screens.newRecord')}</div>}
          <button className={styles.primary} onClick={p.onStart}>
            {t('screens.playAgain')}
          </button>
          <button className={styles.ghost} onClick={p.onChangeLevel}>
            {t('screens.changeLevel')}
          </button>
        </>
      )}
    </div>
  )
}
