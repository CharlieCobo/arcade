import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Shell } from '../components/Shell'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <Shell>
      <h1>{t('game.notFound')}</h1>
      <Link to="/">{t('game.back')}</Link>
    </Shell>
  )
}
