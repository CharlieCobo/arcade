import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { THEMES, setTheme, useTheme } from '@core/theme'
import styles from './ThemePicker.module.css'

/** Botón de paleta que despliega los temas con una muestra de cada uno. */
export function ThemePicker() {
  const { t } = useTranslation()
  const current = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  // Cerrar al tocar fuera o con Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.trigger}
        aria-label={t('theme.label')}
        title={t('theme.label')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="7.5" cy="11" r="1.5" fill="var(--x)" />
          <circle cx="10.5" cy="7" r="1.5" fill="var(--o)" />
          <circle cx="15" cy="7.5" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div id={panelId} className={styles.panel} role="group" aria-label={t('theme.label')}>
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              className={styles.option}
              aria-pressed={current === theme.id}
              onClick={() => {
                setTheme(theme.id)
                setOpen(false)
              }}
              style={{ '--tbg': theme.bg, '--tpanel': theme.panel, '--tx': theme.x, '--to': theme.o } as CSSProperties}
            >
              <span className={styles.swatch} aria-hidden="true">
                <span />
                <span />
              </span>
              <span className={styles.name}>{t(`theme.names.${theme.id}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
