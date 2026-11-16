import type { Board as BoardState, WinLine } from '../logic'
import styles from '../InfiniteTicTacToe.module.css'

interface Props {
  board: BoardState
  fadingIdx: number | null
  winLine: WinLine | null
  disabled: boolean
  onPlay: (idx: number) => void
}

export function Board({ board, fadingIdx, winLine, disabled, onPlay }: Props) {
  return (
    <div className={styles.board} role="grid" aria-label="Tablero">
      {board.map((value, i) => {
        const classes = [
          styles.cell,
          value ? styles[value] : '',
          i === fadingIdx ? styles.fading : '',
          winLine?.includes(i) ? styles.win : '',
        ].join(' ')

        return (
          <button
            key={i}
            className={classes}
            onClick={() => onPlay(i)}
            disabled={disabled || value !== null}
            aria-label={`Casilla ${i + 1}${value ? `, ${value}` : ''}${i === fadingIdx ? ', desaparecerá' : ''}`}
          >
            {value && (
              <span key={value} className={styles.piece}>
                {value}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
