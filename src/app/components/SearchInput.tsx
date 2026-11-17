import { useTranslation } from 'react-i18next'
import styles from './SearchInput.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  /** El texto escrito aún no se ha aplicado (esperando al debounce) */
  pending: boolean
}

export function SearchInput({ value, onChange, pending }: Props) {
  const { t } = useTranslation()

  return (
    <div className={styles.search} role="search">
      <svg className={styles.icon} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16 16 L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('home.searchPlaceholder')}
        aria-label={t('home.search')}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      {pending && <span className={styles.pending} aria-label={t('home.searching')} role="status" />}
      {value && (
        <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label={t('home.clear')}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
