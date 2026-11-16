import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './ReloadPrompt.module.css'

/** Avisa cuando la app ya funciona sin conexión o cuando hay una versión nueva. */
export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // El aviso de "sin conexión" es informativo: se oculta solo para no tapar el juego.
  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 3500)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div className={styles.toast} role="status">
      <span className={styles.msg}>
        {needRefresh ? 'Hay una versión nueva disponible.' : 'Listo para jugar sin conexión.'}
      </span>
      {needRefresh && (
        <button className={styles.btn} onClick={() => updateServiceWorker(true)}>
          Actualizar
        </button>
      )}
      <button className={styles.ghost} onClick={close}>
        Cerrar
      </button>
    </div>
  )
}
