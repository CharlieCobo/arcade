export const LANGUAGES = [
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'pt', label: 'Português', short: 'PT' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']

export const SUPPORTED_LANGUAGES = LANGUAGES.map((l) => l.code)
export const FALLBACK_LANGUAGE: Language = 'en'
