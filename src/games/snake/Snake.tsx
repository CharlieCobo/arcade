import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { Board } from './components/Board'
import { DPad } from './components/DPad'
import { Overlay } from './components/Overlay'
import { DEFAULT_LEVEL, clampLevel, type Direction, type Mode } from './logic'
import { useSnakeScores } from './scores'
import { useSnakeGame } from './useSnakeGame'
import styles from './Snake.module.css'

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

export default function Snake() {
  const { t } = useTranslation('snake')
  const [mode, setMode] = useLocalStorage<Mode>('snake:mode', 'classic')
  const [storedLevel, setLevel] = useLocalStorage<number>('snake:level', DEFAULT_LEVEL)
  const level = clampLevel(storedLevel)
  const { best, submit } = useSnakeScores(mode)
  const [isRecord, setIsRecord] = useState(false)

  const game = useSnakeGame({
    mode,
    level,
    onEnd: (score) => {
      const result = submit(score)
      setIsRecord(result.isRecord)
      vibrate(result.isRecord ? [40, 60, 40, 60, 120] : [90, 50, 90])
    },
  })
  const { phase, score, start, pause, resume, toReady, changeDirection } = game

  const steer = (dir: Direction) => {
    if (changeDirection(dir)) vibrate(8)
  }

  const play = () => {
    setIsRecord(false)
    start()
  }

  /** Botón central del D-pad / espacio: empieza, pausa o continúa según el momento. */
  const primaryAction = () => {
    if (phase === 'playing') pause()
    else if (phase === 'paused') resume()
    else play()
  }

  // Teclado (ordenador)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (dir) {
        e.preventDefault()
        steer(dir)
      } else if (e.key === ' ' || e.key === 'Enter') {
        if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return // ya lo gestiona el botón
        e.preventDefault()
        primaryAction()
      } else if (e.key === 'Escape' || e.key === 'p') {
        pause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('hud.score')}</span>
          <span className={styles.statValue}>{score}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('hud.best')}</span>
          <span className={styles.statValue}>{Math.max(best, phase === 'playing' ? score : 0)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{mode === 'classic' ? t('level.label') : t('modes.label')}</span>
          <span className={styles.statValue}>{mode === 'classic' ? level : '∞'}</span>
        </div>
      </div>

      <Board stateRef={game.stateRef} phase={phase} onSwipe={steer}>
        <Overlay
          phase={phase}
          mode={mode}
          level={level}
          score={score}
          best={best}
          isRecord={isRecord}
          onModeChange={setMode}
          onLevelChange={setLevel}
          onStart={play}
          onResume={resume}
          onChangeMode={toReady}
        />
      </Board>

      <DPad
        onDirection={steer}
        onCenter={primaryAction}
        centerIcon={phase === 'playing' ? 'pause' : 'play'}
        centerLabel={phase === 'playing' ? t('hud.pause') : phase === 'paused' ? t('hud.resume') : t('screens.play')}
      />
    </div>
  )
}
