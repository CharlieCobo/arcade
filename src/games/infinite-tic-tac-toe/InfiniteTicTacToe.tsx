import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { Board } from './components/Board'
import { PlayerCard } from './components/PlayerCard'
import { StreakBar } from './components/StreakBar'
import { useTicTacToeScores, type Mode } from './scores'
import {
  MAX_PIECES,
  applyMove,
  cpuMove,
  initialState,
  nextToVanish,
  other,
  type Player,
} from './logic'
import { isRoundInProgress } from './streak'
import styles from './InfiniteTicTacToe.module.css'

const PLAYERS: Player[] = ['X', 'O']
const CPU_DELAY_MS = 450

const NS = 'infinite-tic-tac-toe'

export default function InfiniteTicTacToe() {
  const { t } = useTranslation(NS)
  const [mode, setMode] = useLocalStorage<Mode>('ittt:mode', 'pvp')
  const { wins, addWin, resetWins, streak, bestStreak, recordCpuResult } = useTicTacToeScores(mode)
  const [starter, setStarter] = useState<Player>('X')
  const [game, setGame] = useState(() => initialState('X'))
  const [newBestStreak, setNewBestStreak] = useState(false)

  /** Abandonar una partida empezada contra la CPU rompe la racha. */
  const abandonIfInProgress = () => {
    if (mode === 'cpu' && isRoundInProgress(game)) recordCpuResult('loss')
    setNewBestStreak(false)
  }

  // También si sales de la pantalla o cierras/recargas la app a mitad de partida.
  const latest = useRef({ mode, game, recordCpuResult })
  useEffect(() => {
    latest.current = { mode, game, recordCpuResult }
  })
  useEffect(() => {
    const ref = latest
    const onLeave = () => {
      const { mode, game, recordCpuResult } = ref.current
      if (mode === 'cpu' && isRoundInProgress(game)) {
        recordCpuResult('loss')
        ref.current = { ...ref.current, game: initialState() } // no contarlo dos veces
      }
    }
    window.addEventListener('pagehide', onLeave)
    return () => {
      window.removeEventListener('pagehide', onLeave)
      onLeave()
    }
  }, [])

  const cpuTurn = mode === 'cpu' && game.turn === 'O' && !game.winner
  const fadingIdx = nextToVanish(game)
  const names: Record<Player, string> = {
    X: t('players.p1'),
    O: mode === 'cpu' ? t('players.cpu') : t('players.p2'),
  }

  const play = (idx: number) => {
    const next = applyMove(game, idx)
    if (!next) return
    setGame(next)
    if (next.winner) {
      addWin(next.winner)
      if (mode === 'cpu') setNewBestStreak(recordCpuResult(next.winner === 'X' ? 'win' : 'loss'))
      vibrate([30, 40, 60])
    } else {
      vibrate(12)
    }
  }

  useEffect(() => {
    if (!cpuTurn) return
    const timer = setTimeout(() => {
      const idx = cpuMove(game)
      if (idx !== null) play(idx)
    }, CPU_DELAY_MS)
    return () => clearTimeout(timer)
    // play depende de game, que ya está en las dependencias
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, cpuTurn])

  const newRound = () => {
    abandonIfInProgress()
    const s = other(starter) // alterna quién empieza
    setStarter(s)
    setGame(initialState(s))
  }

  const restart = () => {
    abandonIfInProgress()
    setStarter('X')
    setGame(initialState('X'))
  }

  /** Resetea solo el marcador del modo actual. */
  const resetAll = () => {
    restart()
    resetWins()
  }

  /** Cada modo tiene su propio marcador: cambiar de modo ya no lo borra. */
  const switchMode = (m: Mode) => {
    if (m === mode) return
    setMode(m)
    restart()
  }

  return (
    <div className={styles.game}>
      <div className={styles.modes} role="group" aria-label={t('modes.label')}>
        <button aria-pressed={mode === 'pvp'} onClick={() => switchMode('pvp')}>
          {t('modes.pvp')}
        </button>
        <button aria-pressed={mode === 'cpu'} onClick={() => switchMode('cpu')}>
          {t('modes.cpu')}
        </button>
      </div>

      <div className={styles.score}>
        {PLAYERS.map((p) => (
          <PlayerCard
            key={p}
            player={p}
            name={names[p]}
            points={wins[p]}
            pieces={game.queues[p].length}
            maxPieces={MAX_PIECES}
            active={game.turn === p && !game.winner}
          />
        ))}
      </div>

      {mode === 'cpu' && <StreakBar streak={streak} best={bestStreak} isNewBest={newBestStreak} />}

      <div className={styles.status} aria-live="polite">
        {cpuTurn ? (
          t('status.cpuThinking')
        ) : (
          <Trans
            t={t}
            i18nKey={game.winner ? 'status.win' : 'status.turn'}
            values={{ name: names[game.winner ?? game.turn] }}
            components={{ player: <span className={styles[`text${game.winner ?? game.turn}`]} /> }}
          />
        )}
      </div>

      <Board
        board={game.board}
        fadingIdx={fadingIdx}
        winLine={game.winLine}
        disabled={!!game.winner || cpuTurn}
        onPlay={play}
      />

      <div className={styles.actions}>
        <button className={styles.primary} onClick={newRound}>
          {t('actions.newRound')}
        </button>
        <button className={styles.ghost} onClick={resetAll}>
          {t('actions.resetScore')}
        </button>
      </div>

      <p className={styles.rules}>
        <Trans t={t} i18nKey="rules" values={{ max: MAX_PIECES }} components={{ strong: <strong /> }} />
        {mode === 'cpu' && (
          <>
            <br />
            <Trans t={t} i18nKey="streak.rules" components={{ strong: <strong /> }} />
          </>
        )}
      </p>
    </div>
  )
}
