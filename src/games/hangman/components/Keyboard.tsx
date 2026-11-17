import { useTranslation } from 'react-i18next'
import styles from '../Hangman.module.css'

interface Props {
  rows: string[]
  hits: string[]
  misses: string[]
  disabled: boolean
  onLetter: (letter: string) => void
}

export function Keyboard({ rows, hits, misses, disabled, onLetter }: Props) {
  const { t } = useTranslation('hangman')
  return (
    <div className={styles.keyboard} role="group" aria-label={t('keyboard.label')}>
      {rows.map((row) => (
        <div key={row} className={styles.keyRow}>
          {[...row].map((letter) => {
            const hit = hits.includes(letter)
            const miss = misses.includes(letter)
            const state = hit ? t('keyboard.hit') : miss ? t('keyboard.miss') : ''
            return (
              <button
                key={letter}
                type="button"
                className={`${styles.key} ${hit ? styles.keyHit : ''} ${miss ? styles.keyMiss : ''}`}
                disabled={disabled || hit || miss}
                aria-label={[t('keyboard.letter', { letter }), state].filter(Boolean).join(', ')}
                onClick={() => onLetter(letter)}
              >
                {letter}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
