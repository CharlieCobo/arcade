import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebouncedValue } from '@core/lib/useDebouncedValue'
import { GameCard } from '../components/GameCard'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { SearchInput } from '../components/SearchInput'
import { Shell } from '../components/Shell'
import { matchesQuery } from '../lib/search'
import { games } from '@games'
import styles from './Home.module.css'

/** Espera desde la última tecla antes de filtrar. */
export const SEARCH_DEBOUNCE_MS = 3000

export function Home() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  // Borrar la búsqueda se aplica al momento; escribir espera al debounce
  const applied = query === '' ? '' : debounced
  const pending = query.trim() !== applied.trim()

  // Se filtra por el nombre en el idioma actual
  const visible = games.filter((g) => matchesQuery(t('meta.title', { ns: g.id }), applied))
  const filtering = applied.trim() !== ''

  return (
    <Shell>
      <header className={styles.header}>
        <div>
          <h1>{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <SearchInput value={query} onChange={setQuery} pending={pending} />

      {visible.length > 0 ? (
        <ul className={styles.list}>
          {visible.map((game) => (
            <li key={game.id}>
              <GameCard {...game} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty} role="status">
          {t('home.noResults', { query: applied.trim() })}
        </p>
      )}

      {!filtering && <div className={styles.soon}>{t('home.comingSoon')}</div>}
    </Shell>
  )
}
