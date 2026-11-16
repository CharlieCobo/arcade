import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Shell } from '../components/Shell'
import { games } from '../games/registry'
import styles from './Home.module.css'

export function Home() {
  return (
    <Shell>
      <header className={styles.header}>
        <h1>Arcade</h1>
        <p>Tu baúl de minijuegos</p>
      </header>

      <ul className={styles.list}>
        {games.map(({ id, title, description, tags, accent, Icon }) => (
          <li key={id}>
            <Link
              to={`/juegos/${id}`}
              className={styles.card}
              style={{ '--accent': accent } as CSSProperties}
            >
              <div className={styles.thumb}>
                <Icon size={48} />
              </div>
              <div className={styles.body}>
                <div className={styles.title}>{title}</div>
                <div className={styles.desc}>{description}</div>
                <div className={styles.tags}>
                  {tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.soon}>Más juegos próximamente</div>
    </Shell>
  )
}
