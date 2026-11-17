import { useEffect, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { DPad, useRepeatPress, type DPadDirection } from '@core/ui'
import { Board, PiecePreview, type Gesture } from './components/Board'
import { Overlay } from './components/Overlay'
import { MIN_START_LEVEL, clampStartLevel, hardDrop, move, rotate, softDrop, type BlocksState } from './logic'
import { useBlocksScores } from './scores'
import { useBlocksGame } from './useBlocksGame'
import styles from './Blocks.module.css'

/** Repetición al mantener pulsado (como en las consolas): mover y bajar. */
const MOVE_REPEAT = { delay: 170, interval: 55 }
const SOFT_REPEAT = { delay: 90, interval: 45 }

type Action = (s: BlocksState) => BlocksState
const ACTIONS: Record<Gesture, Action> = {
  left: (s) => move(s, -1),
  right: (s) => move(s, 1),
  soft: softDrop,
  hard: (s) => hardDrop(s),
  rotate: (s) => rotate(s, 1),
}

export default function Blocks() {
  const { t } = useTranslation('blocks')
  const [storedLevel, setStartLevel] = useLocalStorage<number>('blocks:startLevel', MIN_START_LEVEL)
  const startLevel = clampStartLevel(storedLevel)
  const { best, submit } = useBlocksScores()
  const [isRecord, setIsRecord] = useState(false)
  const [flash, setFlash] = useState(0)
  const [levelUp, setLevelUp] = useState<number | null>(null)

  const game = useBlocksGame(startLevel, {
    onLock: (cleared) => {
      if (cleared > 0) {
        setFlash((n) => n + 1)
        vibrate(cleared === 4 ? [30, 30, 30, 30, 60] : [20, 30, 20])
      } else {
        vibrate(6)
      }
    },
    onLevelUp: (level) => setLevelUp(level),
    onEnd: (state) => {
      const result = submit(state.score)
      setIsRecord(result.isRecord)
      vibrate(result.isRecord ? [40, 60, 40, 60, 120] : [90, 50, 90])
    },
  })
  const { phase, hud, act, start, pause, resume, toReady, endGame } = game

  // El aviso de subida de nivel desaparece solo
  useEffect(() => {
    if (levelUp === null) return
    const timer = setTimeout(() => setLevelUp(null), 1400)
    return () => clearTimeout(timer)
  }, [levelUp])

  const play = () => {
    setIsRecord(false)
    setLevelUp(null)
    start()
  }

  const primaryAction = () => {
    if (phase === 'playing') pause()
    else if (phase === 'paused') resume()
    else play()
  }

  const doGesture = (g: Gesture) => act(ACTIONS[g])

  const fromDPad: Record<DPadDirection, Gesture> = { left: 'left', right: 'right', down: 'soft', up: 'hard' }

  // Botones A (girar) y B (girar al revés)
  const ab = useRepeatPress()
  const abDown = (dir: 1 | -1) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    ab.start(() => act((s) => rotate(s, dir)))
  }

  // Teclado (ordenador)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const map: Record<string, Action> = {
        ArrowLeft: ACTIONS.left,
        ArrowRight: ACTIONS.right,
        ArrowDown: ACTIONS.soft,
        ArrowUp: ACTIONS.rotate,
        x: ACTIONS.rotate,
        z: (s) => rotate(s, -1),
        ' ': ACTIONS.hard,
      }
      if (k === 'Escape' || k === 'p') {
        e.preventDefault()
        primaryAction()
      } else if (k === 'Enter' && phase !== 'playing') {
        if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return
        e.preventDefault()
        primaryAction()
      } else if (map[k] && phase === 'playing') {
        e.preventDefault()
        act(map[k])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={styles.game}>
      <div className={styles.play}>
        <Board stateRef={game.stateRef} phase={phase} onGesture={doGesture}>
          {flash > 0 && <div key={flash} className={styles.flash} aria-hidden="true" />}
          {levelUp !== null && phase === 'playing' && (
            <div key={levelUp} className={styles.levelUp} role="status">
              {t('levelUp', { level: levelUp })}
            </div>
          )}
          <Overlay
            phase={phase}
            startLevel={startLevel}
            score={hud.score}
            lines={hud.lines}
            level={hud.level}
            best={best}
            isRecord={isRecord}
            onStartLevelChange={setStartLevel}
            onStart={play}
            onResume={resume}
            onEndGame={endGame}
            onChangeLevel={toReady}
          />
        </Board>

        <aside className={styles.side}>
          <div className={styles.panel}>
            <span className={styles.label}>{t('hud.next')}</span>
            <div className={styles.nextList}>
              {hud.next.slice(0, 3).map((type, i) => (
                <PiecePreview key={`${i}-${type}`} type={type} />
              ))}
            </div>
          </div>
          <div className={styles.panel}>
            <span className={styles.label}>{t('hud.score')}</span>
            <span className={styles.value}>{hud.score}</span>
          </div>
          <div className={styles.panel}>
            <span className={styles.label}>{t('hud.level')}</span>
            <span key={hud.level} className={`${styles.value} ${styles.pulse}`}>
              {hud.level}
            </span>
          </div>
          <div className={styles.panel}>
            <span className={styles.label}>{t('hud.lines')}</span>
            <span className={styles.value}>{hud.lines}</span>
          </div>
        </aside>
      </div>

      <div className={styles.controls}>
        <DPad
          onPress={(dir) => doGesture(fromDPad[dir])}
          repeat={{ left: MOVE_REPEAT, right: MOVE_REPEAT, down: SOFT_REPEAT }}
          labels={{
            group: t('controls.group'),
            up: t('controls.up'),
            down: t('controls.down'),
            left: t('controls.left'),
            right: t('controls.right'),
          }}
          center={{
            icon: phase === 'playing' ? 'pause' : 'play',
            label: phase === 'playing' ? t('controls.pause') : phase === 'paused' ? t('controls.resume') : t('screens.play'),
            onPress: primaryAction,
          }}
        />
        <div className={styles.ab}>
          <button
            type="button"
            className={`${styles.abBtn} ${styles.b}`}
            aria-label={t('controls.rotateCcw')}
            onPointerDown={abDown(-1)}
            onPointerUp={ab.stop}
            onPointerCancel={ab.stop}
            onClick={(e) => e.detail === 0 && act((s) => rotate(s, -1))}
          >
            <RotateIcon dir={-1} />
          </button>
          <button
            type="button"
            className={`${styles.abBtn} ${styles.a}`}
            aria-label={t('controls.rotateCw')}
            onPointerDown={abDown(1)}
            onPointerUp={ab.stop}
            onPointerCancel={ab.stop}
            onClick={(e) => e.detail === 0 && act((s) => rotate(s, 1))}
          >
            <RotateIcon dir={1} />
          </button>
        </div>
      </div>
    </div>
  )
}

function RotateIcon({ dir }: { dir: 1 | -1 }) {
  return (
    <svg viewBox="0 0 24 24" width="44%" height="44%" style={{ transform: dir === -1 ? 'scaleX(-1)' : undefined }} aria-hidden="true">
      <path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M19.5 3.5v5h-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
