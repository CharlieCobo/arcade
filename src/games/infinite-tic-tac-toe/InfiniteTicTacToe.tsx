import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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

const NS = 'infinite-tic-tac-toe'

export default function InfiniteTicTacToe() {
  const { t } = useTranslation(NS)
  const [mode, setMode] = useLocalStorage<Mode>('ittt:mode', 'pvp')
  const [score, setScore] = useLocalStorage<Record<Player, number>>('ittt:score', { X: 0, O: 0 })
  const [starter, setStarter] = useState<Player>('X')
  const [game, setGame] = useState(() => initialState('X'))

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
      const w = next.winner
      setScore((s) => ({ ...s, [w]: s[w] + 1 }))
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
            points={score[p]}
            pieces={game.queues[p].length}
            maxPieces={MAX_PIECES}
            active={game.turn === p && !game.winner}
          />
        ))}
      </div>

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
      </p>
    </div>
  )
}
