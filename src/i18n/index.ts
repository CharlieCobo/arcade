import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from './languages'
import { defaultNS, resources } from './resources'

// Las traducciones van en el bundle: así la PWA funciona sin conexión en cualquier idioma.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true, // pt-BR → pt, en-GB → en…
    load: 'languageOnly',
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false }, // React ya escapa
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'arcade:lang',
      caches: ['localStorage'],
    },
  })

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng.split('-')[0] ?? lng
}
syncHtmlLang(i18n.resolvedLanguage ?? FALLBACK_LANGUAGE)
i18n.on('languageChanged', syncHtmlLang)

export default i18n
