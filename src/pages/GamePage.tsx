import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Shell } from '../components/Shell'
import { findGame } from '../games/registry'
import type { GameDefinition } from '../games/types'
import { NotFound } from './NotFound'
import styles from './GamePage.module.css'

export function GamePage() {
  const { id } = useParams()
  const game = findGame(id)
  return game ? <GameView game={game} /> : <NotFound />
}

function GameView({ game: { id, Component } }: { game: GameDefinition }) {
  const { t } = useTranslation(['common', id])

  return (
    <Shell>
      <div className={styles.top}>
        <Link to="/" className={styles.back} aria-label={t('game.back')}>
          ←
        </Link>
        <h1 className={styles.title}>{t('meta.title', { ns: id })}</h1>
        <LanguageSwitcher />
      </div>
      <Suspense fallback={<div className={styles.loading}>{t('game.loading')}</div>}>
        <Component />
      </Suspense>
    </Shell>
  )
}
