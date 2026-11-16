import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n/languages'
import styles from './LanguageSwitcher.module.css'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div className={styles.switcher} role="group" aria-label={t('language.label')}>
      {LANGUAGES.map(({ code, short, label }) => (
        <button
          key={code}
          lang={code}
          title={label}
          aria-label={label}
          aria-pressed={current === code}
          onClick={() => void i18n.changeLanguage(code)}
        >
          {short}
        </button>
      ))}
    </div>
  )
}
