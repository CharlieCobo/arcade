import { describe, expect, it } from 'vitest'
import { KEYBOARDS, WORDS, CATEGORIES } from './words'
import {
  DRAWING_STAGES,
  MAX_ERRORS,
  canHint,
  createGame,
  errorsOf,
  guess,
  hint,
  isTried,
  lettersOf,
  livesLeft,
  normalizeLetter,
  pickWord,
  slots,
  stagesShown,
  validateSecret,
} from './logic'

const play = (word: string, letters: string, maxErrors = 6) =>
  [...letters].reduce((s, l) => guess(s, l), createGame(word, { maxErrors }))

describe('normalización de letras', () => {
  it('ignora tildes, diéresis y la cedilla', () => {
    expect(normalizeLetter('á')).toBe('A')
    expect(normalizeLetter('Ü')).toBe('U')
    expect(normalizeLetter('ç')).toBe('C')
    expect(normalizeLetter('Ã')).toBe('A')
  })

  it('pero la Ñ es una letra propia', () => {
    expect(normalizeLetter('ñ')).toBe('Ñ')
    expect(normalizeLetter('Ñ')).not.toBe('N')
  })
})

describe('adivinar', () => {
  it('acertar una letra la descubre en todas sus posiciones, con o sin tilde', () => {
    const s = play('Camaleón', 'O')
    expect(s.hits).toEqual(['O'])
    expect(slots(s).filter((c) => c.revealed).map((c) => c.char)).toEqual(['Ó'])
    const a = play('Camaleón', 'A')
    expect(slots(a).filter((c) => c.revealed)).toHaveLength(2)
  })

  it('fallar suma un error', () => {
    const s = play('GATO', 'Z')
    expect(s.misses).toEqual(['Z'])
    expect(livesLeft(s)).toBe(5)
  })

  it('repetir una letra no cuenta dos veces', () => {
    const s = play('GATO', 'ZZGG')
    expect(s.misses).toEqual(['Z'])
    expect(s.hits).toEqual(['G'])
    expect(isTried(s, 'g')).toBe(true)
  })

  it('la N no descubre la Ñ (ni al revés)', () => {
    const s = play('PIÑA', 'N')
    expect(s.misses).toEqual(['N'])
    expect(play('PIÑA', 'Ñ').hits).toEqual(['Ñ'])
  })

  it('los espacios y guiones se ven desde el principio', () => {
    const s = createGame('GUARDA-CHUVA')
    expect(slots(s).find((c) => c.char === '-')?.revealed).toBe(true)
    expect(lettersOf('OSO PANDA')).toEqual(new Set(['O', 'S', 'P', 'A', 'N', 'D']))
  })

  it('se gana al descubrir todas las letras', () => {
    expect(play('GATO', 'GATO').status).toBe('won')
  })

  it('se pierde al llegar al máximo de fallos, y se revela la palabra', () => {
    const s = play('GATO', 'ZXQW', 4)
    expect(s.status).toBe('lost')
    expect(slots(s).every((c) => c.revealed)).toBe(true)
    expect(guess(s, 'G')).toBe(s) // ya no se puede jugar
  })

  it('ignora lo que no es una letra', () => {
    const s = createGame('GATO')
    expect(guess(s, '3')).toBe(s)
    expect(guess(s, ' ')).toBe(s)
  })
})

describe('pista', () => {
  it('revela una letra a cambio de un fallo, solo una vez', () => {
    const s0 = createGame('GATO')
    const s = hint(s0, () => 0)
    expect(s.hits).toHaveLength(1)
    expect(errorsOf(s)).toBe(1)
    expect(canHint(s)).toBe(false)
    expect(hint(s)).toBe(s)
  })

  it('no se puede pedir si te dejaría sin intentos', () => {
    const s = play('GATO', 'ZXC', 4) // queda 1 intento
    expect(canHint(s)).toBe(false)
  })

  it('si la pista completa la palabra, se gana', () => {
    expect(hint(play('GATO', 'GAT'), () => 0).status).toBe('won')
  })
})

describe('dibujo', () => {
  it('Fácil empieza vacío, Normal con la horca y Difícil más avanzado', () => {
    expect(stagesShown(createGame('X', { maxErrors: MAX_ERRORS.easy }))).toBe(0)
    expect(stagesShown(createGame('X', { maxErrors: MAX_ERRORS.normal }))).toBe(4)
    expect(stagesShown(createGame('X', { maxErrors: MAX_ERRORS.hard }))).toBe(6)
  })

  it('al perder, el dibujo está completo en cualquier dificultad', () => {
    for (const max of Object.values(MAX_ERRORS)) {
      const s = play('GATO', 'ZXQWERYUIP'.slice(0, max), max)
      expect(s.status).toBe('lost')
      expect(stagesShown(s)).toBe(DRAWING_STAGES)
    }
  })
})

describe('palabra secreta (contra un amigo)', () => {
  it('acepta palabras con tildes, espacios y guiones', () => {
    expect(validateSecret('Pão de queijo')).toBeNull()
    expect(validateSecret('guarda-chuva')).toBeNull()
  })

  it('rechaza lo demasiado corto, largo o con símbolos', () => {
    expect(validateSecret('a')).toBe('tooShort')
    expect(validateSecret('')).toBe('tooShort')
    expect(validateSecret('x'.repeat(30))).toBe('tooLong')
    expect(validateSecret('hola123')).toBe('invalidChars')
    expect(validateSecret('-hola')).toBe('invalidChars')
  })
})

describe('listas de palabras', () => {
  it('cada idioma tiene todas las categorías con palabras válidas y sin repetir', () => {
    for (const [lng, lists] of Object.entries(WORDS)) {
      for (const cat of CATEGORIES) {
        const words = lists[cat]
        expect(words.length, `${lng}/${cat}`).toBeGreaterThanOrEqual(20)
        expect(new Set(words).size, `${lng}/${cat} duplicadas`).toBe(words.length)
        for (const w of words) expect(validateSecret(w), `${lng}: ${w}`).toBeNull()
      }
    }
  })

  it('todas las letras de las palabras se pueden escribir con el teclado del idioma', () => {
    for (const [lng, lists] of Object.entries(WORDS)) {
      const keys = new Set(KEYBOARDS[lng as keyof typeof KEYBOARDS].join(''))
      for (const w of Object.values(lists).flat()) {
        for (const l of lettersOf(w)) expect(keys.has(l), `${lng}: ${w} (${l})`).toBe(true)
      }
    }
  })

  it('no repite palabras usadas hace poco', () => {
    expect(pickWord(['A', 'B', 'C'], ['A', 'B'], () => 0.99)).toBe('C')
    expect(pickWord(['A'], ['A'], () => 0)).toBe('A') // si no queda otra, repite
  })
})
