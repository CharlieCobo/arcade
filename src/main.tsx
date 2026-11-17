import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
// Fuentes de los temas (solo el subconjunto latino; se descargan al usarse)
import '@fontsource/vt323/latin-400.css'
import '@fontsource/fredoka/latin-400.css'
import '@fontsource/fredoka/latin-600.css'
import '@fontsource/fredoka/latin-700.css'
import '@fontsource/chakra-petch/latin-400.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import '@core/styles/global.css'
import './app/i18n'
import { App } from './app/App'
import { requestPersistentStorage } from '@core/scores'
import { applyTheme, getTheme } from '@core/theme'

requestPersistentStorage()
applyTheme(getTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
