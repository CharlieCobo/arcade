import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { PLAYER_COLORS } from './colors'
import { SIZES, cpuMove, createGame, hCount, other, play, type DotsState, type Level, type Player, type Size } from './logic'
import { useDotsScores, type Mode } from './scores'
import styles from './DotsAndBoxes.module.css'

const LEVELS: Level[] = ['easy', 'normal', 'hard']
const SIZE_KEYS: Size[] = ['small', 'medium', 'large']
const CPU_DELAY_MS = 480
/** Separación entre puntos y margen del dibujo (unidades del SVG) */
const GAP = 100
const PAD = 34

export default function DotsAndBoxes() {
  const { t } = useTranslation('dots-and-boxes')
  const [storedMode, setMode] = useLocalStorage<Mode>('dots:mode', 'cpu')
  const [storedLevel, setLevel] = useLocalStorage<Level>('dots:level', 'normal')
  const [storedSize, setSize] = useLocalStorage<Size>('dots:size', 'small')
  const mode: Mode = storedMode === 'pvp' ? 'pvp' : 'cpu'
  const level = LEVELS.includes(storedLevel) ? storedLevel : 'normal'
  const size = SIZE_KEYS.includes(storedSize) ? storedSize : 'small'
  const scores = useDotsScores(mode, level)

  const [phase, setPhase] = useState<'menu' | 'playing'>('menu')
  const [starter, setStarter] = useState<Player>(1)
  const [game, setGame] = useState<DotsState>(() => createGame(SIZES[size]))
  const [newBest, setNewBest] = useState(false)

  const cpuTurn = phase === 'playing' && mode === 'cpu' && game.turn === 2 && !game.over
  const started = game.lines.some((l) => l !== 0)
  const names: Record<Player, string> = {
    1: mode === 'cpu' ? t('players.you') : t('players.p1'),
    2: mode === 'cpu' ? t('players.cpu') : t('players.p2'),
  }

  const abandon = () => {
    if (mode === 'cpu' && started && !game.over) scores.recordCpu('loss')
    setNewBest(false)
  }

  const startGame = (first: Player) => {
    setStarter(first)
    setGame(createGame(SIZES[size], first))
    setNewBest(false)
    setPhase('playing')
  }

  const draw = (line: number) => {
    const next = play(game, line)
    if (!next) return
    setGame(next)
    if (next.over) {
      if (next.winner) scores.addWin(next.winner)
      if (mode === 'cpu') setNewBest(scores.recordCpu(next.winner === null ? 'draw' : next.winner === 1 ? 'win' : 'loss'))
      vibrate(next.winner === 1 || (mode === 'pvp' && next.winner) ? [40, 60, 40, 60, 120] : [90, 50, 90])
    } else if (next.lastBoxes.length) {
      vibrate([15, 30, 15])
    } else {
      vibrate(8)
    }
  }

  // La CPU juega (y sigue jugando mientras cierre cajas)
  useEffect(() => {
    if (!cpuTurn) return
    const timer = setTimeout(() => {
      const line = cpuMove(game, level)
      if (line !== -1) draw(line)
    }, CPU_DELAY_MS)
    return () => clearTimeout(timer)
    // draw depende de game, que ya está en las dependencias
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuTurn, game, level])

  // Salir a mitad de partida contra la CPU rompe la racha
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
          <div className={styles.option}>
            <span className={styles.optionLabel}>{t('size.label')}</span>
            <div className={styles.segmented} role="group" aria-label={t('size.label')}>
              {SIZE_KEYS.map((k) => (
                <button key={k} aria-pressed={size === k} onClick={() => setSize(k)}>
                  {t(`size.${k}`)}
                </button>
              ))}
            </div>
            <span className={styles.hint}>{t('size.boxes', SIZES[size])}</span>
          </div>
          <button className={styles.primary} onClick={() => startGame(1)}>
            {t('actions.play')}
          </button>
          {mode === 'cpu' && scores.bestStreak > 0 && <p className={styles.hint}>{t('actions.record', { n: scores.bestStreak })}</p>}
        </div>
      </div>
    )
  }

  // ─── Partida ───────────────────────────────────────────────────────────────

  const { cols, rows } = game
  const W = cols * GAP + PAD * 2
  const Hh = rows * GAP + PAD * 2
  const H = hCount(game)
  const total = cols * rows
  const x = (c: number) => PAD + c * GAP
  const y = (r: number) => PAD + r * GAP
  const extraTurn = !game.over && game.lastBoxes.length > 0

  /** Extremos de una línea por su índice. */
  const ends = (i: number) => {
    if (i < H) {
      const r = Math.floor(i / cols)
      const c = i % cols
      return { x1: x(c), y1: y(r), x2: x(c + 1), y2: y(r), label: t('board.hLine', { r: r + 1, c: c + 1, c2: c + 2 }) }
    }
    const k = i - H
    const r = Math.floor(k / (cols + 1))
    const c = k % (cols + 1)
    return { x1: x(c), y1: y(r), x2: x(c), y2: y(r + 1), label: t('board.vLine', { r: r + 1, r2: r + 2, c: c + 1 }) }
  }

  const statusKey = game.over
    ? game.winner === null
      ? 'draw'
      : mode === 'cpu'
        ? game.winner === 1
          ? 'youWin'
          : 'youLose'
        : 'win'
    : cpuTurn
      ? 'thinking'
      : extraTurn
        ? 'again'
        : 'turn'
  const who = game.winner ?? game.turn

  return (
    <div className={styles.game}>
      <div className={styles.score}>
        {([1, 2] as Player[]).map((p) => (
          <div
            key={p}
            className={`${styles.pcard} ${game.turn === p && !game.over ? styles.active : ''}`}
            style={{ '--c': PLAYER_COLORS[p] } as CSSProperties}
          >
            <span className={styles.pname}>{names[p]}</span>
            <span key={game.score[p]} className={styles.pts}>
              {game.score[p]}
            </span>
          </div>
        ))}
      </div>

      {/* Tira y afloja: cajas de cada uno sobre el total */}
      <div className={styles.bar} aria-hidden="true">
        <span style={{ width: `${(game.score[1] / total) * 100}%`, background: PLAYER_COLORS[1] }} />
        <span style={{ flex: 1 }} />
        <span style={{ width: `${(game.score[2] / total) * 100}%`, background: PLAYER_COLORS[2] }} />
      </div>

      {mode === 'cpu' && (
        <div className={`${styles.streak} ${scores.streak > 0 ? styles.hot : ''}`}>
          <span>
            {scores.streak > 0 ? '🔥' : '🧊'} {t('streak.current')} <strong className={styles.streakValue}>{scores.streak}</strong>
          </span>
          {newBest ? <span className={styles.newBest}>🏆 {t('streak.newBest')}</span> : <span className={styles.muted}>{t('streak.best', { count: scores.bestStreak })}</span>}
        </div>
      )}

      <div key={`${statusKey}-${game.lastLine}`} className={`${styles.status} ${extraTurn ? styles.again : ''}`} aria-live="polite">
        {statusKey === 'win' || statusKey === 'turn' || statusKey === 'again' ? (
          <Trans t={t} i18nKey={`status.${statusKey}`} values={{ name: names[who] }} components={{ player: <span style={{ color: PLAYER_COLORS[who] }} /> }} />
        ) : (
          t(`status.${statusKey}`)
        )}
      </div>

      <svg
        className={styles.board}
        viewBox={`0 0 ${W} ${Hh}`}
        style={{ '--ratio': `${W} / ${Hh}`, '--turn': PLAYER_COLORS[game.turn] } as CSSProperties}
        role="group"
        aria-label={t('board.label')}
      >
        {/* Cajas cerradas */}
        {game.boxes.map((owner, b) => {
          if (!owner) return null
          const r = Math.floor(b / cols)
          const c = b % cols
          const fresh = game.lastBoxes.includes(b)
          return (
            <g key={`b${b}`} className={fresh ? styles.freshBox : ''} style={{ transformOrigin: `${x(c) + GAP / 2}px ${y(r) + GAP / 2}px` }}>
              <rect x={x(c) + 6} y={y(r) + 6} width={GAP - 12} height={GAP - 12} rx={10} fill={PLAYER_COLORS[owner]} opacity={0.28} />
              <circle cx={x(c) + GAP / 2} cy={y(r) + GAP / 2} r={9} fill={PLAYER_COLORS[owner]} />
            </g>
          )
        })}

        {/* Líneas: guía tenue si están libres, color del jugador si están trazadas */}
        {game.lines.map((owner, i) => {
          const e = ends(i)
          if (owner) {
            return (
              <line
                key={`l${i}`}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                className={`${styles.line} ${i === game.lastLine ? styles.lastLine : ''}`}
                stroke={PLAYER_COLORS[owner]}
                pathLength={1}
              />
            )
          }
          return <line key={`l${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className={styles.guide} />
        })}

        {/* Zonas táctiles anchas (más fáciles de acertar con el dedo) */}
        {!game.over &&
          !cpuTurn &&
          game.lines.map((owner, i) => {
            if (owner) return null
            const e = ends(i)
            const horizontal = e.y1 === e.y2
            const inset = 18
            return (
              <line
                key={`h${i}`}
                x1={horizontal ? e.x1 + inset : e.x1}
                y1={horizontal ? e.y1 : e.y1 + inset}
                x2={horizontal ? e.x2 - inset : e.x2}
                y2={horizontal ? e.y2 : e.y2 - inset}
                className={styles.hit}
                role="button"
                tabIndex={0}
                aria-label={e.label}
                onClick={() => draw(i)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    draw(i)
                  }
                }}
              />
            )
          })}

        {/* Puntos */}
        {Array.from({ length: (rows + 1) * (cols + 1) }, (_, k) => {
          const r = Math.floor(k / (cols + 1))
          const c = k % (cols + 1)
          return <circle key={`d${k}`} cx={x(c)} cy={y(r)} r={9} className={styles.dot} />
        })}
      </svg>

      <div className={styles.actions}>
        <button
          className={styles.primary}
          onClick={() => {
            abandon()
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

      {game.over && game.winner && (mode === 'pvp' || game.winner === 1) && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} style={{ '--i': i, '--c': PLAYER_COLORS[i % 2 ? 1 : 2] } as CSSProperties} />
          ))}
        </div>
      )}
    </div>
  )
}
