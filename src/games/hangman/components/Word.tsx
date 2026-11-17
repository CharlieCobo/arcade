import { forwardRef } from 'react'
import type { Slot } from '../logic'
import styles from '../Hangman.module.css'

interface Props {
  slots: Slot[]
  /** Al perder, las letras que faltaban se muestran en rosa */
  lost: boolean
  hits: string[]
  normalize: (ch: string) => string
}

/** La palabra en casillas. Las palabras de una frase se agrupan para no partirse al saltar de línea. */
export const Word = forwardRef<HTMLDivElement, Props>(function Word({ slots, lost, hits, normalize }, ref) {
  const groups: Slot[][] = [[]]
  for (const s of slots) {
    if (s.char === ' ') groups.push([])
    else groups[groups.length - 1]!.push(s)
  }
  // Casillas más pequeñas para palabras largas
  const longest = Math.max(...groups.map((g) => g.length))
  const size = longest > 11 ? styles.small : longest > 8 ? styles.medium : ''

  return (
    <div ref={ref} className={`${styles.word} ${size}`} aria-live="polite">
      {groups.map((g, gi) => (
        <span key={gi} className={styles.wordGroup}>
          {g.map((s, i) =>
            s.isLetter ? (
              <span
                key={i}
                className={`${styles.slot} ${s.revealed ? styles.revealed : ''} ${lost && !hits.includes(normalize(s.char)) ? styles.missed : ''}`}
              >
                {s.revealed ? s.char : ''}
              </span>
            ) : (
              <span key={i} className={styles.sep}>
                {s.char}
              </span>
            ),
          )}
        </span>
      ))}
    </div>
  )
})
