import { useTranslation } from 'react-i18next'
import styles from '../InfiniteTicTacToe.module.css'

interface Props {
  streak: number
  best: number
  isNewBest: boolean
}

/** Racha invicto contra la CPU. */
export function StreakBar({ streak, best, isNewBest }: Props) {
  const { t } = useTranslation('infinite-tic-tac-toe')

  return (
    <div className={`${styles.streak} ${streak > 0 ? styles.hot : ''}`}>
      <div className={styles.streakCurrent}>
        <span aria-hidden="true">{streak > 0 ? '🔥' : '🧊'}</span>
        <span>{t('streak.current')}</span>
        <strong key={streak} className={styles.streakValue}>
          {streak}
        </strong>
      </div>
      {isNewBest ? (
        <span className={styles.newBest}>🏆 {t('streak.newBest')}</span>
      ) : (
        <span className={styles.streakBest}>{t('streak.best', { count: best })}</span>
      )}
    </div>
  )
}
