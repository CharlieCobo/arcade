import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './ReloadPrompt.module.css'

/** Avisa cuando la app ya funciona sin conexión o cuando hay una versión nueva. */
export function ReloadPrompt() {
  const { t } = useTranslation()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // El aviso de "sin conexión" es informativo: se oculta solo para no tapar el juego.
  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 3500)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div className={styles.toast} role="status">
      <span className={styles.msg}>
        {needRefresh ? t('pwa.updateAvailable') : t('pwa.offlineReady')}
      </span>
      {needRefresh && (
        <button className={styles.btn} onClick={() => updateServiceWorker(true)}>
          {t('pwa.update')}
        </button>
      )}
      <button className={styles.ghost} onClick={close}>
        {t('pwa.close')}
      </button>
    </div>
  )
}
