import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatCompact } from '@core/lib/formatCompact'
import { useBestScore } from '@core/scores'
import type { Game } from '@games'
import styles from '../pages/Home.module.css'

export function GameCard({ id, accent, Icon, score }: Game) {
  const { t, i18n } = useTranslation([id, 'common'])
  const best = useBestScore(id, undefined, score)
  const format = score?.format ?? formatCompact
  // Valor completo (o el formato propio del juego, p. ej. un tiempo)
  const full = best === null ? '' : score?.format ? score.format(best) : best.toLocaleString(i18n.resolvedLanguage)
  const tags = t('meta.tags', { returnObjects: true })

  return (
    <Link
      to={`/juegos/${id}`}
      className={styles.card}
      style={{ '--accent': accent } as CSSProperties}
    >
      <div className={styles.thumb}>
        <Icon size={48} />
      </div>
      <div className={styles.body}>
        <div className={styles.title}>{t('meta.title')}</div>
        <div className={styles.desc}>{t('meta.description')}</div>
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
          {best !== null && (
            <span
              className={`${styles.tag} ${styles.best}`}
              // El número completo para lectores de pantalla y al mantener pulsado
              title={full}
              aria-label={t('home.best', { ns: 'common', score: full })}
            >
              🏆 {t('home.best', { ns: 'common', score: format(best) })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
