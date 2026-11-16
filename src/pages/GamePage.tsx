import { Suspense } from 'react'
import { Link, useParams } from 'react-router'
import { Shell } from '../components/Shell'
import { findGame } from '../games/registry'
import { NotFound } from './NotFound'
import styles from './GamePage.module.css'

export function GamePage() {
  const { id } = useParams()
  const game = findGame(id)
  if (!game) return <NotFound />

  const { Component, title } = game
  return (
    <Shell>
      <div className={styles.top}>
        <Link to="/" className={styles.back} aria-label="Volver al baúl">
          ←
        </Link>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <Suspense fallback={<div className={styles.loading}>Cargando…</div>}>
        <Component />
      </Suspense>
    </Shell>
  )
}
