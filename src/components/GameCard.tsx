import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { GameDefinition } from '../games/types'
import styles from '../pages/Home.module.css'

export function GameCard({ id, accent, Icon }: GameDefinition) {
  const { t } = useTranslation(id)
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
        </div>
      </div>
    </Link>
  )
}
