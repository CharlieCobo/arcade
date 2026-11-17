import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { BOARD_COLOR, DISC_COLORS } from './colors'
import { COLS, ROWS, cpuMove, createGame, drop, dropRow, idx, isOver, other, type FourState, type Level, type Player } from './logic'
import { useFourScores, type Mode } from './scores'
import styles from './FourInARow.module.css'

const LEVELS: Level[] = ['easy', 'normal', 'hard']
/** Espera antes de que juegue la CPU: deja ver la caída de tu ficha */
const CPU_DELAY_MS = 600

export default function FourInARow() {
  const { t } = useTranslation('four-in-a-row')
  const [storedMode, setMode] = useLocalStorage<Mode>('four:mode', 'cpu')
  const [storedLevel, setLevel] = useLocalStorage<Level>('four:level', 'normal')
  const mode: Mode = storedMode === 'pvp' ? 'pvp' : 'cpu'
  const level = LEVELS.includes(storedLevel) ? storedLevel : 'normal'
  const scores = useFourScores(mode, level)

  const [phase, setPhase] = useState<'menu' | 'playing'>('menu')
  const [starter, setStarter] = useState<Player>(1)
  const [game, setGame] = useState<FourState>(() => createGame(1))
  const [newBest, setNewBest] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  const cpuTurn = phase === 'playing' && mode === 'cpu' && game.turn === 2 && !isOver(game)
  const over = isOver(game)
  const names: Record<Player, string> = {
    1: mode === 'cpu' ? t('players.you') : t('players.p1'),
    2: mode === 'cpu' ? t('players.cpu') : t('players.p2'),
  }

  /** Abandonar una partida empezada contra la CPU cuenta como derrota para la racha. */
  const abandon = () => {
    if (mode === 'cpu' && game.moves > 0 && !over) scores.recordCpu('loss')
    setNewBest(false)
  }

  const startGame = (first: Player) => {
    setStarter(first)
    setGame(createGame(first))
    setNewBest(false)
    setPhase('playing')
  }

  const play = (col: number) => {
    const next = drop(game, col)
    if (!next) return
    setGame(next)
    if (next.winner) {
      scores.addWin(next.winner)
      if (mode === 'cpu') setNewBest(scores.recordCpu(next.winner === 1 ? 'win' : 'loss'))
      vibrate(next.winner === 1 || mode === 'pvp' ? [40, 60, 40, 60, 120] : [90, 50, 90])
    } else if (next.draw) {
      if (mode === 'cpu') scores.recordCpu('draw')
      vibrate([30, 30, 30])
    } else {
      vibrate(10)
    }
  }

  // Turno de la CPU
  useEffect(() => {
    if (!cpuTurn) return
    const timer = setTimeout(() => {
      const col = cpuMove(game, level)
      if (col !== -1) play(col)
    }, CPU_DELAY_MS)
    return () => clearTimeout(timer)
    // play depende de game, que ya está en las dependencias
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuTurn, game, level])

  // Si sales a mitad de partida contra la CPU, también se rompe la racha
  const latest = useRef({ abandon })
  useEffect(() => {
    latest.current = { abandon }
  })
  useEffect(() => {
    const ref = latest
    const onLeave = () => ref.current.abandon()
    window.addEventListener('pagehide', onLeave)
    return () => {
      window.removeEventListener('pagehide', onLeave)
      onLeave()
    }
  }, [])

  // Teclado: 1 a 7
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (phase !== 'playing' || cpuTurn || over || !Number.isInteger(n) || n < 1 || n > COLS) return
      e.preventDefault()
      play(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ─── Menú ──────────────────────────────────────────────────────────────────

  if (phase === 'menu') {
    return (
      <div className={styles.game}>
        <div className={styles.panel}>
          <div className={styles.segmented} role="group" aria-label={t('modes.label')}>
            <button aria-pressed={mode === 'pvp'} onClick={() => setMode('pvp')}>
              {t('modes.pvp')}
            </button>
            <button aria-pressed={mode === 'cpu'} onClick={() => setMode('cpu')}>
              {t('modes.cpu')}
            </button>
          </div>
          <p className={styles.hint}>{t(mode === 'cpu' ? 'modes.cpuHint' : 'modes.pvpHint')}</p>
          {mode === 'cpu' && (
            <div className={styles.option}>
              <span className={styles.optionLabel}>{t('level.label')}</span>
              <div className={styles.segmented} role="group" aria-label={t('level.label')}>
                {LEVELS.map((l) => (
                  <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>
                    {t(`level.${l}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className={styles.primary} onClick={() => startGame(1)}>
            {t('actions.play')}
          </button>
          {mode === 'cpu' && scores.bestStreak > 0 && <p className={styles.hint}>{t('actions.record', { n: scores.bestStreak })}</p>}
          <p className={styles.keys}>{t('actions.keys')}</p>
        </div>
      </div>
    )
  }

  // ─── Partida ───────────────────────────────────────────────────────────────

  const winSet = new Set(game.winLine ?? [])
  const status = cpuTurn
    ? t('status.thinking')
    : game.draw
      ? t('status.draw')
      : game.winner && mode === 'cpu'
        ? t(game.winner === 1 ? 'status.youWin' : 'status.youLose')
        : null

  return (
    <div className={styles.game}>
      <div className={styles.score}>
        {([1, 2] as Player[]).map((p) => (
          <div
            key={p}
            className={`${styles.pcard} ${game.turn === p && !over ? styles.active : ''}`}
            style={{ '--c': DISC_COLORS[p] } as CSSProperties}
          >
            <span className={styles.disc} />
            <span className={styles.pname}>{names[p]}</span>
            <span className={styles.pts}>{scores.wins[p]}</span>
          </div>
        ))}
      </div>

      {mode === 'cpu' && (
        <div className={`${styles.streak} ${scores.streak > 0 ? styles.hot : ''}`}>
          <span>
            {scores.streak > 0 ? '🔥' : '🧊'} {t('streak.current')} <strong key={scores.streak} className={styles.streakValue}>{scores.streak}</strong>
          </span>
          {newBest ? <span className={styles.newBest}>🏆 {t('streak.newBest')}</span> : <span className={styles.muted}>{t('streak.best', { count: scores.bestStreak })}</span>}
        </div>
      )}

      <div className={styles.status} aria-live="polite">
        {status ?? (
          <Trans
            t={t}
            i18nKey={game.winner ? 'status.win' : mode === 'cpu' ? 'status.yourTurn' : 'status.turn'}
            values={{ name: names[game.winner ?? game.turn] }}
            components={{ player: <span style={{ color: DISC_COLORS[game.winner ?? game.turn] }} /> }}
          />
        )}
      </div>

      <div
        ref={boardRef}
        className={`${styles.board} ${over ? styles.over : ''}`}
        style={{ '--board': BOARD_COLOR, '--turn': DISC_COLORS[game.turn] } as CSSProperties}
        role="group"
        aria-label={t('board.label')}
      >
        {Array.from({ length: COLS }, (_, col) => {
          const full = dropRow(game.board, col) === -1
          return (
            <button
              key={col}
              type="button"
              className={styles.column}
              disabled={over || cpuTurn || full}
              onClick={() => play(col)}
              aria-label={`${t('board.column', { n: col + 1 })}${full ? `, ${t('board.full')}` : ''}`}
            >
              {Array.from({ length: ROWS }, (_, row) => {
                const p = game.board[idx(row, col)] ?? 0
                const i = idx(row, col)
                return (
                  <span key={row} className={styles.hole}>
                    {p !== 0 && (
                      <span
                        className={`${styles.piece} ${winSet.has(i) ? styles.win : ''} ${over && !winSet.has(i) ? styles.dim : ''}`}
                        style={{ '--c': DISC_COLORS[p], '--row': row } as CSSProperties}
                      />
                    )}
                  </span>
                )
              })}
            </button>
          )
        })}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.primary}
          onClick={() => {
            abandon()
            // Alterna quién empieza; en 2 jugadores empieza quien perdió
            startGame(game.winner && mode === 'pvp' ? other(game.winner) : other(starter))
          }}
        >
          {t('actions.newGame')}
        </button>
        <button
          className={styles.ghost}
          onClick={() => {
            abandon()
            setPhase('menu')
          }}
        >
          {t('actions.menu')}
        </button>
      </div>

      {mode === 'cpu' && <p className={styles.rules}>{t('streak.rules')}</p>}

      {game.winner && (mode === 'pvp' || game.winner === 1) && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} style={{ '--i': i, '--c': i % 2 ? DISC_COLORS[1] : DISC_COLORS[2] } as CSSProperties} />
          ))}
        </div>
      )}
    </div>
  )
}
