import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import {
  CONFIGS,
  chord,
  createGame,
  distanceFromOrigin,
  formatTime,
  minesLeft,
  reveal,
  toggleFlag,
  toRC,
  type Difficulty,
  type MinesState,
} from './logic'
import { useMinesScores } from './scores'
import styles from './Minesweeper.module.css'

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']
const LONG_PRESS_MS = 380
const MOVE_TOLERANCE = 10

/** Colores de los números con la paleta de la app. */
const NUMBER_COLORS = ['', '#4cc9f0', '#5ad65a', '#ff5d8f', '#a35cf0', '#f59a3a', '#3b6ff0', '#eef0ff', '#8b8fb8']

/** Segundos desde `start` (solo se usa en manejadores de eventos y efectos). */
const secondsSince = (start: number | null) => (start === null ? 0 : (performance.now() - start) / 1000)

export default function Minesweeper() {
  const { t } = useTranslation('minesweeper')
  const [stored, setDifficulty] = useLocalStorage<Difficulty>('mines:difficulty', 'easy')
  const difficulty = DIFFICULTIES.includes(stored) ? stored : 'easy'
  const [flagMode, setFlagMode] = useState(false)
  const [game, setGame] = useState<MinesState>(() => createGame(difficulty))
  const [pressing, setPressing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<{ isRecord: boolean } | null>(null)
  const { bestTime, submit } = useMinesScores(difficulty)
  const startedAt = useRef<number | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const over = game.status === 'won' || game.status === 'lost'

  const newGame = (d: Difficulty = difficulty) => {
    setGame(createGame(d))
    setElapsed(0)
    setResult(null)
    startedAt.current = null
  }

  const changeDifficulty = (d: Difficulty) => {
    setDifficulty(d)
    newGame(d)
  }

  // Cronómetro: empieza con el primer toque y se para al terminar
  useEffect(() => {
    if (game.status !== 'playing') return
    startedAt.current ??= performance.now()
    const id = window.setInterval(() => setElapsed(secondsSince(startedAt.current)), 250)
    return () => window.clearInterval(id)
  }, [game.status])

  /** Aplica una jugada: vibración, fin de partida y récord. */
  const apply = (next: MinesState) => {
    if (next === game) return
    setGame(next)
    if (next.status === game.status) return
    if (next.status === 'won' || next.status === 'lost') {
      const seconds = secondsSince(startedAt.current)
      setElapsed(seconds)
      const record = submit(next.status === 'won', Math.round(seconds))
      setResult({ isRecord: record?.isRecord ?? false })
      if (next.status === 'won') vibrate(record?.isRecord ? [40, 60, 40, 60, 120] : [30, 40, 60])
      else {
        vibrate([120, 60, 200])
        boardRef.current?.animate(
          [{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,2px)' }, { transform: 'translate(5px,-2px)' }, { transform: 'translate(-3px,1px)' }, { transform: 'translate(0,0)' }],
          { duration: 380, easing: 'ease-out' },
        )
      }
    }
  }

  const tap = (i: number) => {
    const cell = game.cells[i]
    if (!cell || over) return
    if (cell.revealed) return apply(chord(game, i))
    if (flagMode) {
      vibrate(15)
      return apply(toggleFlag(game, i))
    }
    vibrate(6)
    apply(reveal(game, i))
  }

  const flag = (i: number) => {
    if (over || game.cells[i]?.revealed) return
    vibrate(25)
    apply(toggleFlag(game, i))
  }

  // Pulsación larga = bandera (y clic derecho en ordenador)
  const press = useRef<{ i: number; x: number; y: number; timer: number; fired: boolean } | null>(null)
  const cellIndex = (e: PointerEvent) => Number((e.target as HTMLElement).closest('[data-i]')?.getAttribute('data-i') ?? -1)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (over || e.button !== 0) return
    const i = cellIndex(e)
    if (i < 0) return
    setPressing(true)
    const timer = window.setTimeout(() => {
      if (press.current) press.current.fired = true
      flag(i)
    }, LONG_PRESS_MS)
    press.current = { i, x: e.clientX, y: e.clientY, timer, fired: false }
  }
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    setPressing(false)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE) cancelPress()
  }
  const onPointerUp = () => {
    const p = press.current
    cancelPress()
    if (p && !p.fired) tap(p.i)
  }

  const face = game.status === 'won' ? '😎' : game.status === 'lost' ? '😵' : pressing ? '😮' : '🙂'
  const { cols, rows } = CONFIGS[difficulty]

  const cellLabel = (i: number) => {
    const c = game.cells[i]!
    const { r, c: col } = toRC(game, i)
    const pos = t('cell.position', { r: r + 1, c: col + 1 })
    if (c.flagged && !c.revealed) return `${t('cell.flag')}, ${pos}`
    if (!c.revealed) return `${t('cell.hidden')}, ${pos}`
    if (c.mine) return `${t('cell.mine')}, ${pos}`
    return `${c.adjacent ? t('cell.near', { count: c.adjacent }) : t('cell.empty')}, ${pos}`
  }

  return (
    <div className={styles.game}>
      <div className={styles.segmented} role="group" aria-label={t('difficulty.label')}>
        {DIFFICULTIES.map((d) => (
          <button key={d} aria-pressed={difficulty === d} onClick={() => changeDifficulty(d)}>
            {t(`difficulty.${d}`)}
          </button>
        ))}
      </div>

      <div className={styles.hud}>
        <div className={styles.counter} aria-label={`${t('hud.mines')}: ${minesLeft(game)}`}>
          <span aria-hidden="true">💣</span> {minesLeft(game)}
        </div>
        <button type="button" className={styles.face} onClick={() => newGame()} aria-label={t('hud.restart')}>
          <span key={face}>{face}</span>
        </button>
        <div className={styles.counter} aria-label={`${t('hud.time')}: ${formatTime(elapsed)}`}>
          <span aria-hidden="true">⏱</span> {formatTime(elapsed)}
        </div>
      </div>

      <div
        ref={boardRef}
        className={`${styles.board} ${game.status === 'lost' ? styles.lost : ''} ${game.status === 'won' ? styles.won : ''}`}
        style={{ '--cols': cols, '--rows': rows } as CSSProperties}
        role="grid"
        aria-label={t('board.label')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => {
          e.preventDefault()
          const i = Number((e.target as HTMLElement).closest('[data-i]')?.getAttribute('data-i') ?? -1)
          if (i >= 0) flag(i)
        }}
      >
        {game.cells.map((c, i) => {
          const fresh = c.revealed && c.revealedStep === game.step
          const delay = fresh ? Math.min(distanceFromOrigin(game, i), 14) * (c.mine ? 70 : 22) : 0
          return (
            <button
              key={i}
              type="button"
              data-i={i}
              className={[
                styles.cell,
                c.revealed ? styles.open : '',
                fresh ? styles.fresh : '',
                c.mine && c.revealed ? styles.mine : '',
                i === game.exploded ? styles.exploded : '',
                c.flagged && !c.revealed ? styles.flagged : '',
                over && c.flagged && !c.mine ? styles.wrongFlag : '',
              ].join(' ')}
              style={{ '--d': `${delay}ms`, color: c.revealed && !c.mine ? NUMBER_COLORS[c.adjacent] : undefined } as CSSProperties}
              aria-label={cellLabel(i)}
              // Teclado: Enter / espacio descubren (sin pulsación larga)
              onClick={(e) => e.detail === 0 && tap(i)}
            >
              {c.revealed ? (c.mine ? '💣' : c.adjacent || '') : c.flagged ? '🚩' : ''}
            </button>
          )
        })}
      </div>

      {over ? (
        <div className={`${styles.result} ${game.status === 'won' ? styles.resultWon : styles.resultLost}`} role="status">
          <strong className={styles.resultTitle}>{t(game.status === 'won' ? 'status.won' : 'status.lost')}</strong>
          {game.status === 'won' && <span>{t('status.time', { time: formatTime(elapsed) })}</span>}
          {result?.isRecord && <span className={styles.record}>🏆 {t('status.newRecord')}</span>}
          <button className={styles.primary} onClick={() => newGame()}>
            {t('hud.restart')}
          </button>
        </div>
      ) : (
        <div className={styles.tools}>
          <button type="button" className={`${styles.flagToggle} ${flagMode ? styles.flagOn : ''}`} aria-pressed={flagMode} onClick={() => setFlagMode((f) => !f)}>
            🚩 {t('tools.flagMode')}
          </button>
          {bestTime !== null && <span className={styles.best}>{t('status.record', { time: formatTime(bestTime) })}</span>}
        </div>
      )}

      <p className={styles.hint}>{game.status === 'ready' ? t('tools.firstTap') : t('tools.flagHint')}</p>

      {game.status === 'won' && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} style={{ '--i': i, '--c': NUMBER_COLORS[(i % 6) + 1] } as CSSProperties} />
          ))}
        </div>
      )}
    </div>
  )
}
