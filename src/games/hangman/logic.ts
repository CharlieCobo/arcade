/**
 * Lógica pura del ahorcado. Sin React.
 * Las letras se comparan sin tildes (A descubre Á, À, Ã, Â; C descubre Ç),
 * salvo la Ñ, que en español es una letra distinta de la N.
 */

export type Status = 'playing' | 'won' | 'lost'
export type Difficulty = 'easy' | 'normal' | 'hard'
export type Rng = () => number

export interface HangmanState {
  /** Palabra tal como se muestra (mayúsculas, con tildes) */
  word: string
  category: string | null
  /** Pista escrita por quien puso la palabra (modo contra un amigo) */
  clue: string | null
  maxErrors: number
  /** Letras normalizadas acertadas y falladas, en orden */
  hits: string[]
  misses: string[]
  /** La pista de letra cuesta un fallo; solo una por palabra */
  hintUsed: boolean
  status: Status
}

/** Fallos permitidos por dificultad. El dibujo tiene 10 trazos. */
export const MAX_ERRORS: Record<Difficulty, number> = { easy: 10, normal: 6, hard: 4 }
export const DRAWING_STAGES = 10
export const MIN_SECRET_LETTERS = 2
export const MAX_SECRET_LENGTH = 24

/** Normaliza una letra para comparar: mayúscula y sin tildes, pero la Ñ se conserva. */
export function normalizeLetter(ch: string): string {
  const up = ch.toLocaleUpperCase('es')
  if (up === 'Ñ') return 'Ñ'
  return up.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export const isLetter = (ch: string) => /\p{L}/u.test(ch)

/** Letras distintas (normalizadas) que hay que adivinar. */
export function lettersOf(word: string): Set<string> {
  return new Set([...word].filter(isLetter).map(normalizeLetter))
}

export function createGame(
  word: string,
  opts: { maxErrors?: number; category?: string | null; clue?: string | null } = {},
): HangmanState {
  return {
    word: word.trim().toLocaleUpperCase('es'),
    category: opts.category ?? null,
    clue: opts.clue?.trim() || null,
    maxErrors: opts.maxErrors ?? MAX_ERRORS.normal,
    hits: [],
    misses: [],
    hintUsed: false,
    status: 'playing',
  }
}

export const errorsOf = (s: Pick<HangmanState, 'misses' | 'hintUsed'>) => s.misses.length + (s.hintUsed ? 1 : 0)

/** Intentos que quedan. */
export const livesLeft = (s: HangmanState) => s.maxErrors - errorsOf(s)

function withStatus(s: HangmanState): HangmanState {
  if (errorsOf(s) >= s.maxErrors) return { ...s, status: 'lost' }
  const pending = [...lettersOf(s.word)].some((l) => !s.hits.includes(l))
  return pending ? s : { ...s, status: 'won' }
}

/** ¿Esa letra ya se ha probado? */
export const isTried = (s: HangmanState, letter: string) => {
  const l = normalizeLetter(letter)
  return s.hits.includes(l) || s.misses.includes(l)
}

export function guess(s: HangmanState, letter: string): HangmanState {
  if (s.status !== 'playing' || !isLetter(letter) || letter.length !== 1) return s
  const l = normalizeLetter(letter)
  if (isTried(s, l)) return s
  const next = lettersOf(s.word).has(l) ? { ...s, hits: [...s.hits, l] } : { ...s, misses: [...s.misses, l] }
  return withStatus(next)
}

/** ¿Se puede pedir pista? Una por palabra y nunca si te deja sin intentos. */
export const canHint = (s: HangmanState) => s.status === 'playing' && !s.hintUsed && livesLeft(s) > 1

/** Revela una letra al azar a cambio de un fallo. */
export function hint(s: HangmanState, rng: Rng = Math.random): HangmanState {
  if (!canHint(s)) return s
  const hidden = [...lettersOf(s.word)].filter((l) => !s.hits.includes(l))
  if (hidden.length === 0) return s
  const letter = hidden[Math.floor(rng() * hidden.length)]!
  return withStatus({ ...s, hits: [...s.hits, letter], hintUsed: true })
}

export interface Slot {
  char: string
  /** Letra (true) o separador como espacio o guion (false) */
  isLetter: boolean
  revealed: boolean
}

/** La palabra casilla a casilla, para pintarla. Al terminar se revela entera. */
export function slots(s: HangmanState): Slot[] {
  return [...s.word].map((char) => {
    const letter = isLetter(char)
    return {
      char,
      isLetter: letter,
      revealed: !letter || s.status !== 'playing' || s.hits.includes(normalizeLetter(char)),
    }
  })
}

/**
 * Cuántos trazos del dibujo se ven: con menos intentos, el dibujo empieza
 * más avanzado (Normal arranca con la horca hecha; Difícil, con cabeza y cuerpo).
 */
export const stagesShown = (s: Pick<HangmanState, 'maxErrors' | 'misses' | 'hintUsed'>) =>
  Math.min(DRAWING_STAGES, Math.max(0, DRAWING_STAGES - s.maxErrors) + errorsOf(s))

export type SecretError = 'tooShort' | 'tooLong' | 'invalidChars'

/** Valida la palabra secreta del modo contra un amigo. */
export function validateSecret(input: string): SecretError | null {
  const word = input.trim()
  if (word.length > MAX_SECRET_LENGTH) return 'tooLong'
  if (!/^[\p{L}][\p{L} -]*$/u.test(word) && word.length > 0) return 'invalidChars'
  if ([...word].filter(isLetter).length < MIN_SECRET_LETTERS) return 'tooShort'
  return null
}

/** Elige una palabra evitando las usadas hace poco. */
export function pickWord(pool: string[], recent: string[], rng: Rng = Math.random): string {
  const fresh = pool.filter((w) => !recent.includes(w))
  const from = fresh.length > 0 ? fresh : pool
  return from[Math.floor(rng() * from.length)]!
}
