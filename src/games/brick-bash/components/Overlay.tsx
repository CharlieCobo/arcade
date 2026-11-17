import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { POWER_COLORS, POWER_LETTERS, levelDef, type Difficulty, type PowerType } from '../logic'
import type { Phase } from '../useBrickBash'
import styles from '../BrickBash.module.css'

interface Props {
  phase: Phase
  difficulty: Difficulty
  score: number
  level: number
  best: number
  isRecord: boolean
  bonus: number
  onDifficultyChange: (d: Difficulty) => void
  onStart: () => void
  onResume: () => void
  onEndGame: () => void
  onContinue: () => void
  onChangeDifficulty: () => void
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']
const POWERS: PowerType[] = ['expand', 'laser', 'catch', 'slow', 'multi', 'life']
const AUTO_CONTINUE_MS = 2400

export function Overlay(p: Props) {
  const { t } = useTranslation('brick-bash')

  // Entre niveles se sigue solo tras un momento (o al tocar Continuar)
  const { phase, onContinue } = p
  useEffect(() => {
    if (phase !== 'cleared') return
    const timer = setTimeout(onContinue, AUTO_CONTINUE_MS)
    return () => clearTimeout(timer)
  }, [phase, onContinue])

  if (p.phase === 'playing') return null
  const nextName = t(`levels.${levelDef(p.level + 1).key}` as 'levels.warmup')

  return (
    <div className={styles.overlay}>
      {p.phase === 'ready' && (
        <>
          <h2 className={styles.overlayTitle}>{t('difficulty.label')}</h2>
          <div className={styles.segmented} role="group" aria-label={t('difficulty.label')}>
            {DIFFICULTIES.map((d) => (
              <button key={d} aria-pressed={p.difficulty === d} onClick={() => p.onDifficultyChange(d)}>
                {t(`difficulty.${d}`)}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{t(`difficulty.${p.difficulty}Hint`)}</p>
          <button className={styles.primary} onClick={p.onStart}>
            {t('screens.play')}
          </button>
          {p.best > 0 && (
            <p className={styles.hint}>
              🏆 {t('hud.best')}: {p.best}
            </p>
          )}
          <div className={styles.powers} aria-label={t('screens.powersTitle')}>
            {POWERS.map((power) => (
              <span key={power} className={styles.powerChip}>
                <span className={styles.capsule} style={{ background: POWER_COLORS[power] }}>
                  {POWER_LETTERS[power]}
                </span>
                {t(`powers.${power}`)}
              </span>
            ))}
          </div>
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

      {p.phase === 'cleared' && (
        <>
          <h2 className={styles.overlayTitle}>{t('screens.cleared')}</h2>
          {p.bonus > 0 && <div className={styles.bonus}>{t('screens.bonus', { points: p.bonus })}</div>}
          <p className={styles.hint}>{t('screens.next', { level: p.level + 1, name: nextName })}</p>
          <button className={styles.primary} onClick={p.onContinue}>
            {t('screens.continue')}
          </button>
        </>
      )}

      {p.phase === 'over' && (
        <>
          <h2 className={styles.overlayTitle}>{t('screens.over')}</h2>
          <div className={styles.finalScore}>{t('screens.points', { count: p.score })}</div>
          <p className={styles.hint}>{t('screens.reached', { level: p.level })}</p>
          {p.isRecord && <div className={styles.record}>🏆 {t('screens.newRecord')}</div>}
          <button className={styles.primary} onClick={p.onStart}>
            {t('screens.playAgain')}
          </button>
          <button className={styles.ghost} onClick={p.onChangeDifficulty}>
            {t('screens.changeDifficulty')}
          </button>
        </>
      )}
    </div>
  )
}
