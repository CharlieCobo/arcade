import { Link } from 'react-router'
import { Shell } from '../components/Shell'

export function NotFound() {
  return (
    <Shell>
      <h1>Juego no encontrado</h1>
      <Link to="/">Volver al baúl</Link>
    </Shell>
  )
}
