import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebouncedValue } from '@core/lib/useDebouncedValue'
import { GameCard } from '../components/GameCard'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { SearchInput } from '../components/SearchInput'
import { Shell } from '../components/Shell'
import { ThemePicker } from '../components/ThemePicker'
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
      {/* Cabecera fija: el buscador queda a mano aunque se haga scroll */}
      <div className={styles.top}>
        <header className={styles.header}>
          <div>
            <h1>{t('home.title')}</h1>
            <p>{t('home.subtitle')}</p>
          </div>
          <div className={styles.tools}>
            <ThemePicker />
            <LanguageSwitcher />
          </div>
        </header>

        <SearchInput value={query} onChange={setQuery} pending={pending} />
      </div>

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
