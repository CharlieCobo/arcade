import { useTranslation } from 'react-i18next'
import { GameCard } from '../components/GameCard'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Shell } from '../components/Shell'
import { games } from '../games/registry'
import styles from './Home.module.css'

export function Home() {
  const { t } = useTranslation()

  return (
    <Shell>
      <header className={styles.header}>
        <div>
          <h1>{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <ul className={styles.list}>
        {games.map((game) => (
          <li key={game.id}>
            <GameCard {...game} />
          </li>
        ))}
      </ul>

      <div className={styles.soon}>{t('home.comingSoon')}</div>
    </Shell>
  )
}
