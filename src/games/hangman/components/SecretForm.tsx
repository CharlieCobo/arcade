import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_SECRET_LENGTH, validateSecret, type SecretError } from '../logic'
import styles from '../Hangman.module.css'

interface Props {
  onSubmit: (word: string, clue: string) => void
  onBack: () => void
}

/** Modo contra un amigo: quien pone la palabra la escribe aquí, oculta por defecto. */
export function SecretForm({ onSubmit, onBack }: Props) {
  const { t } = useTranslation('hangman')
  const [word, setWord] = useState('')
  const [clue, setClue] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<SecretError | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const problem = validateSecret(word)
    setError(problem)
    if (!problem) onSubmit(word.trim(), clue.trim())
  }

  return (
    <form className={styles.panel} onSubmit={submit} noValidate>
      <h2 className={styles.panelTitle}>{t('secret.title')}</h2>
      <div className={styles.field}>
        <input
          className={styles.input}
          type={visible ? 'text' : 'password'}
          value={word}
          maxLength={MAX_SECRET_LENGTH + 4}
          onChange={(e) => {
            setWord(e.target.value)
            if (error) setError(null)
          }}
          placeholder={t('secret.placeholder')}
          aria-label={t('secret.title')}
          aria-invalid={error !== null}
          aria-describedby={error ? 'secret-error' : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
        />
        <button type="button" className={styles.eye} onClick={() => setVisible((v) => !v)} aria-label={visible ? t('secret.hide') : t('secret.show')}>
          {visible ? '🙈' : '👁️'}
        </button>
      </div>
      {error && (
        <p id="secret-error" className={styles.error} role="alert">
          {t(`secret.${error}`)}
        </p>
      )}
      <label className={styles.label}>
        {t('secret.clue')}
        <input
          className={styles.input}
          value={clue}
          maxLength={40}
          onChange={(e) => setClue(e.target.value)}
          placeholder={t('secret.cluePlaceholder')}
          autoComplete="off"
        />
      </label>
      <button type="submit" className={styles.primary}>
        {t('secret.continue')}
      </button>
      <button type="button" className={styles.ghost} onClick={onBack}>
        {t('secret.back')}
      </button>
    </form>
  )
}
