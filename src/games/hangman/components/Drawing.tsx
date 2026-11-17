import { useTranslation } from 'react-i18next'
import type { Status } from '../logic'
import styles from '../Hangman.module.css'

/** Los 10 trazos del dibujo, en orden: horca (4) y figura (6). */
const PARTS: { kind: 'gallows' | 'figure'; el: 'path' | 'circle'; d?: string; c?: [number, number, number] }[] = [
  { kind: 'gallows', el: 'path', d: 'M20 186 H118' },
  { kind: 'gallows', el: 'path', d: 'M48 186 V18' },
  { kind: 'gallows', el: 'path', d: 'M48 18 H132' },
  { kind: 'gallows', el: 'path', d: 'M132 18 V42' },
  { kind: 'figure', el: 'circle', c: [132, 58, 16] },
  { kind: 'figure', el: 'path', d: 'M132 74 V126' },
  { kind: 'figure', el: 'path', d: 'M132 90 L110 112' },
  { kind: 'figure', el: 'path', d: 'M132 90 L154 112' },
  { kind: 'figure', el: 'path', d: 'M132 126 L114 158' },
  { kind: 'figure', el: 'path', d: 'M132 126 L150 158' },
]

interface Props {
  stages: number
  status: Status
}

/** Cada trazo nuevo se dibuja con una animación de "rotulador". */
export function Drawing({ stages, status }: Props) {
  const { t } = useTranslation('hangman')
  const figureClass = status === 'lost' ? styles.lost : status === 'won' ? styles.saved : ''

  return (
    <svg className={styles.drawing} viewBox="0 0 200 200" role="img" aria-label={t('drawing', { n: stages })}>
      {/* Guía tenue de todo el dibujo, para intuir lo que falta */}
      <g className={styles.ghost}>
        {PARTS.map((p, i) =>
          p.el === 'circle' ? <circle key={i} cx={p.c![0]} cy={p.c![1]} r={p.c![2]} /> : <path key={i} d={p.d} />,
        )}
      </g>
      {PARTS.slice(0, stages).map((p, i) => {
        const cls = `${styles.stroke} ${p.kind === 'gallows' ? styles.gallows : `${styles.figure} ${figureClass}`}`
        return p.el === 'circle' ? (
          <circle key={i} className={cls} cx={p.c![0]} cy={p.c![1]} r={p.c![2]} pathLength={1} />
        ) : (
          <path key={i} className={cls} d={p.d} pathLength={1} />
        )
      })}
    </svg>
  )
}
