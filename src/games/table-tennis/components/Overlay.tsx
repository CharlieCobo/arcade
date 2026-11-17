import { useTranslation } from 'react-i18next'
import { TARGETS, type CpuLevel, type Mode, type Side } from '../logic'
import type { Phase } from '../useTableTennis'
import styles from '../TableTennis.module.css'

interface Props {
  phase: Phase
  mode: Mode
  cpuLevel: CpuLevel
  target: number
  score: Record<Side, number>
  winner: Side | null
  bestRally: number
  recordRally: number
  isRecord: boolean
  onModeChange: (m: Mode) => void
  onLevelChange: (l: CpuLevel) => void
  onTargetChange: (n: number) => void
  onStart: () => void
  onResume: () => void
  onEndGame: () => void
  onChangeMode: () => void
}

const LEVELS: CpuLevel[] = ['easy', 'normal', 'hard']

export function Overlay(p: Props) {
  const { t } = useTranslation('table-tennis')
  if (p.phase === 'playing') return null

  const names: Record<Side, string> = {
    bottom: p.mode === 'cpu' ? t('players.you') : t('players.p1'),
    top: p.mode === 'cpu' ? t('players.cpu') : t('players.p2'),
  }

  return (
    <div className={styles.overlay}>
      {p.phase === 'ready' && (
        <>
          <div className={styles.segmented} role="group" aria-label={t('modes.label')}>
            <button aria-pressed={p.mode === 'pvp'} onClick={() => p.onModeChange('pvp')}>
              {t('modes.pvp')}
            </button>
            <button aria-pressed={p.mode === 'cpu'} onClick={() => p.onModeChange('cpu')}>
              {t('modes.cpu')}
            </button>
          </div>

          {p.mode === 'cpu' && (
            <div className={styles.option}>
              <span className={styles.optionLabel}>{t('level.label')}</span>
              <div className={styles.segmented} role="group" aria-label={t('level.label')}>
                {LEVELS.map((l) => (
                  <button key={l} aria-pressed={p.cpuLevel === l} onClick={() => p.onLevelChange(l)}>
                    {t(`level.${l}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.option}>
            <span className={styles.optionLabel}>{t('target.label')}</span>
            <div className={styles.segmented} role="group" aria-label={t('target.label')}>
              {TARGETS.map((n) => (
                <button key={n} aria-pressed={p.target === n} aria-label={t('target.points', { n })} onClick={() => p.onTargetChange(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <p className={styles.hint}>{t(p.mode === 'cpu' ? 'modes.cpuHint' : 'modes.pvpHint')}</p>
          <button className={styles.primary} onClick={p.onStart}>
            {t('screens.play')}
          </button>
          {p.recordRally > 0 && <p className={styles.hint}>{t('screens.record', { n: p.recordRally })}</p>}
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

      {p.phase === 'over' && p.winner && (
        <>
          {p.mode === 'pvp' && (
            // Mensaje girado para el jugador de arriba
            <div className={styles.topMessage}>
              <h2 className={styles.overlayTitle}>{p.winner === 'top' ? t('screens.youWin') : t('screens.youLose')}</h2>
            </div>
          )}
          <h2 className={styles.overlayTitle}>
            {p.mode === 'cpu'
              ? p.winner === 'bottom'
                ? t('screens.youWin')
                : t('screens.youLose')
              : t('screens.win', { name: names[p.winner] })}
          </h2>
          <div className={styles.finalScore}>
            <span style={{ color: 'var(--x)' }}>{p.score.bottom}</span>
            <span className={styles.dash}>–</span>
            <span style={{ color: 'var(--o)' }}>{p.score.top}</span>
          </div>
          <p className={styles.hint}>{t('screens.bestRally', { n: p.bestRally })}</p>
          {p.isRecord && <div className={styles.record}>🏆 {t('screens.newRecord')}</div>}
          <button className={styles.primary} onClick={p.onStart}>
            {t('screens.playAgain')}
          </button>
          <button className={styles.ghost} onClick={p.onChangeMode}>
            {t('screens.changeMode')}
          </button>
        </>
      )}
    </div>
  )
}
