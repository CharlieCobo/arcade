import { HashRouter, Route, Routes } from 'react-router'
import { Home } from './pages/Home'
import { GamePage } from './pages/GamePage'
import { NotFound } from './pages/NotFound'
import { ReloadPrompt } from './components/ReloadPrompt'

// HashRouter: funciona en GitHub Pages sin configurar redirecciones 404.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/juegos/:id" element={<GamePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ReloadPrompt />
    </HashRouter>
  )
}
