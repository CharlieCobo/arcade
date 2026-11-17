import type { ReactNode } from 'react'
import styles from './Shell.module.css'

export function Shell({ children }: { children: ReactNode }) {
  return <main className={styles.shell}>{children}</main>
}
