import { useEffect, useState } from 'react'
import { vibrate } from '../../lib/haptics'
import { useLocalStorage } from '../../lib/useLocalStorage'
import { Board } from './components/Board'
import { PlayerCard } from './components/PlayerCard'
import {
  MAX_PIECES,
  applyMove,
  cpuMove,
  initialState,
  nextToVanish,
  other,
  type Player,
} from './logic'
import styles from './InfiniteTicTacToe.module.css'

type Mode = 'pvp' | 'cpu'
const PLAYERS: Player[] = ['X', 'O']
const CPU_DELAY_MS = 450

export default function InfiniteTicTacToe() {
  const [mode, setMode] = useLocalStorage<Mode>('ittt:mode', 'pvp')
  const [score, setScore] = useLocalStorage<Record<Player, number>>('ittt:score', { X: 0, O: 0 })
  const [starter, setStarter] = useState<Player>('X')
  const [game, setGame] = useState(() => initialState('X'))

  const cpuTurn = mode === 'cpu' && game.turn === 'O' && !game.winner
  const fadingIdx = nextToVanish(game)
  const names: Record<Player, string> = { X: 'Jugador 1', O: mode === 'cpu' ? 'CPU' : 'Jugador 2' }

  const play = (idx: number) => {
    const next = applyMove(game, idx)
    if (!next) return
    setGame(next)
    if (next.winner) {
      const w = next.winner
      setScore((s) => ({ ...s, [w]: s[w] + 1 }))
      vibrate([30, 40, 60])
    } else {
      vibrate(12)
    }
  }

  useEffect(() => {
    if (!cpuTurn) return
    const t = setTimeout(() => {
      const idx = cpuMove(game)
      if (idx !== null) play(idx)
    }, CPU_DELAY_MS)
    return () => clearTimeout(t)
    // play depende de game, que ya está en las dependencias
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, cpuTurn])

  const newRound = () => {
    const s = other(starter) // alterna quién empieza
    setStarter(s)
    setGame(initialState(s))
  }

  const resetAll = () => {
    setStarter('X')
    setGame(initialState('X'))
    setScore({ X: 0, O: 0 })
  }

  const switchMode = (m: Mode) => {
    if (m === mode) return
    setMode(m)
    resetAll()
  }

  return (
    <div className={styles.game}>
      <div className={styles.modes} role="group" aria-label="Modo de juego">
        <button aria-pressed={mode === 'pvp'} onClick={() => switchMode('pvp')}>
          2 jugadores
        </button>
        <button aria-pressed={mode === 'cpu'} onClick={() => switchMode('cpu')}>
          Contra CPU
        </button>
      </div>

      <div className={styles.score}>
        {PLAYERS.map((p) => (
          <PlayerCard
            key={p}
            player={p}
            name={names[p]}
            points={score[p]}
            pieces={game.queues[p].length}
            maxPieces={MAX_PIECES}
            active={game.turn === p && !game.winner}
          />
        ))}
      </div>

      <div className={styles.status} aria-live="polite">
        {game.winner ? (
          <span>
            ¡Gana <span className={styles[`text${game.winner}`]}>{names[game.winner]}</span>! 🎉
          </span>
        ) : cpuTurn ? (
          <span>La CPU está pensando…</span>
        ) : (
          <span>
            Turno de <span className={styles[`text${game.turn}`]}>{names[game.turn]}</span>
          </span>
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
          Nueva ronda
        </button>
        <button className={styles.ghost} onClick={resetAll}>
          Reiniciar marcador
        </button>
      </div>

      <p className={styles.rules}>
        <strong>Reglas:</strong> cada jugador solo puede tener {MAX_PIECES} fichas en el tablero. Al
        colocar la cuarta, desaparece tu ficha más antigua (la que parpadea). Gana quien haga tres en
        raya.
      </p>
    </div>
  )
}
