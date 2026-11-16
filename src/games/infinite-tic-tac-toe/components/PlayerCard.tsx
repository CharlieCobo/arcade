import { useTranslation } from 'react-i18next'
import type { Player } from '../logic'
import styles from '../InfiniteTicTacToe.module.css'

interface Props {
  player: Player
  name: string
  points: number
  pieces: number
  maxPieces: number
  active: boolean
}

export function PlayerCard({ player, name, points, pieces, maxPieces, active }: Props) {
  const { t } = useTranslation('infinite-tic-tac-toe')

  return (
    <div className={`${styles.pcard} ${styles[player]} ${active ? styles.active : ''}`}>
      <div className={styles.pcardTop}>
        <span className={styles.mark}>{player}</span>
        <span className={styles.pts}>{points}</span>
      </div>
      <div className={styles.name}>{name}</div>
      <div className={styles.dots} aria-label={t('players.pieces', { count: pieces, max: maxPieces })}>
        {Array.from({ length: maxPieces }, (_, i) => (
          <div
            key={i}
            className={[
              styles.dot,
              i < pieces ? styles.filled : '',
              pieces === maxPieces && i === 0 ? styles.old : '',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  )
}
