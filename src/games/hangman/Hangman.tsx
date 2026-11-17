import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, type Language } from '@core/i18n/languages'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { Drawing } from './components/Drawing'
import { Keyboard } from './components/Keyboard'
import { SecretForm } from './components/SecretForm'
import { Word } from './components/Word'
import {
  MAX_ERRORS,
  canHint,
  createGame,
  guess,
  hint,
  isLetter,
  livesLeft,
  normalizeLetter,
  pickWord,
  slots,
  stagesShown,
  type Difficulty,
  type HangmanState,
} from './logic'
import { useHangmanScores } from './scores'
import { CATEGORIES, KEYBOARDS, WORDS, type Category } from './words'
import styles from './Hangman.module.css'

type Mode = 'solo' | 'friend'
type Phase = 'menu' | 'secret' | 'handoff' | 'playing'
type CategoryChoice = Category | 'any'

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']
const RECENT = 15

export default function Hangman() {
  const { t, i18n } = useTranslation('hangman')
  const [mode, setMode] = useLocalStorage<Mode>('hangman:mode', 'solo')
  const [storedDifficulty, setDifficulty] = useLocalStorage<Difficulty>('hangman:difficulty', 'normal')
  const [storedCategory, setCategory] = useLocalStorage<CategoryChoice>('hangman:category', 'any')
  const difficulty = DIFFICULTIES.includes(storedDifficulty) ? storedDifficulty : 'normal'
  const category: CategoryChoice = storedCategory === 'any' || CATEGORIES.includes(storedCategory) ? storedCategory : 'any'

  const { streak, bestStreak, recordSolo, recordFriend } = useHangmanScores()
  const [phase, setPhase] = useState<Phase>('menu')
  const [game, setGame] = useState<HangmanState | null>(null)
  /** Idioma de la ronda: el teclado y la palabra no cambian si cambias de idioma a mitad */
  const [roundLang, setRoundLang] = useState<Language>('es')
  const [result, setResult] = useState<{ streak: number; isRecord: boolean } | null>(null)
  const recent = useRef<string[]>([])
  const pendingSecret = useRef<{ word: string; clue: string } | null>(null)
  const wordRef = useRef<HTMLDivElement>(null)

  const currentLang = (): Language => {
    const l = i18n.resolvedLanguage
    return LANGUAGES.some((x) => x.code === l) ? (l as Language) : 'en'
  }

  const startSolo = () => {
    const lang = currentLang()
    const cat = category === 'any' ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]! : category
    const word = pickWord(WORDS[lang][cat], recent.current)
    recent.current = [word, ...recent.current].slice(0, RECENT)
    setRoundLang(lang)
    setGame(createGame(word, { maxErrors: MAX_ERRORS[difficulty], category: cat }))
    setResult(null)
    setPhase('playing')
  }

  const startFriend = () => {
    const secret = pendingSecret.current
    if (!secret) return
    setRoundLang(currentLang())
    setGame(createGame(secret.word, { maxErrors: MAX_ERRORS[difficulty], clue: secret.clue }))
    pendingSecret.current = null
    setResult(null)
    setPhase('playing')
  }

  const play = () => (mode === 'solo' ? startSolo() : setPhase('secret'))

  /** Aplica una jugada y gestiona fin de ronda, vibración y temblor. */
  const apply = (next: HangmanState) => {
    if (!game || next === game) return
    const failed = next.misses.length > game.misses.length
    setGame(next)
    if (failed) {
      vibrate(30)
      wordRef.current?.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
        { duration: 300, easing: 'ease-out' },
      )
    } else {
      vibrate(8)
    }
    if (next.status !== 'playing') {
      const won = next.status === 'won'
      vibrate(won ? [40, 60, 40, 60, 120] : [120, 60, 120])
      if (mode === 'solo') setResult(recordSolo(won, difficulty))
      else recordFriend(won)
    }
  }

  const onLetter = (letter: string) => game && apply(guess(game, letter))
  const onHint = () => game && apply(hint(game))

  // Teclado físico (ordenador)
  useEffect(() => {
    if (phase !== 'playing' || !game || game.status !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 || !isLetter(e.key)) return
      const letter = normalizeLetter(e.key)
      if (!KEYBOARDS[roundLang].join('').includes(letter)) return
      e.preventDefault()
      apply(guess(game, letter))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ─── Pantallas ─────────────────────────────────────────────────────────────

  if (phase === 'secret') {
    return (
      <div className={styles.game}>
        <SecretForm
          onBack={() => setPhase('menu')}
          onSubmit={(word, clue) => {
            pendingSecret.current = { word, clue }
            setPhase('handoff')
          }}
        />
      </div>
    )
  }

  if (phase === 'handoff') {
    return (
      <div className={styles.game}>
        <div className={styles.panel}>
          <div className={styles.handoffIcon} aria-hidden="true">
            📱
          </div>
          <h2 className={styles.panelTitle}>{t('handoff.title')}</h2>
          <p className={styles.hint}>{t('handoff.text')}</p>
          <button className={styles.primary} onClick={startFriend}>
            {t('handoff.ready')}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'menu' || !game) {
    return (
      <div className={styles.game}>
        <div className={styles.panel}>
          <div className={styles.segmented} role="group" aria-label={t('modes.label')}>
            <button aria-pressed={mode === 'solo'} onClick={() => setMode('solo')}>
              {t('modes.solo')}
            </button>
            <button aria-pressed={mode === 'friend'} onClick={() => setMode('friend')}>
              {t('modes.friend')}
            </button>
          </div>
          <p className={styles.hint}>{t(mode === 'solo' ? 'modes.soloHint' : 'modes.friendHint')}</p>

          <div className={styles.option}>
            <span className={styles.optionLabel}>{t('difficulty.label')}</span>
            <div className={styles.segmented} role="group" aria-label={t('difficulty.label')}>
              {DIFFICULTIES.map((d) => (
                <button key={d} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
                  {t(`difficulty.${d}`)}
                </button>
              ))}
            </div>
            <span className={styles.hint}>{t('difficulty.tries', { count: MAX_ERRORS[difficulty] })}</span>
          </div>

          {mode === 'solo' && (
            <div className={styles.option}>
              <span className={styles.optionLabel}>{t('categories.label')}</span>
              <div className={styles.chips} role="group" aria-label={t('categories.label')}>
                {(['any', ...CATEGORIES] as CategoryChoice[]).map((c) => (
                  <button key={c} className={styles.chip} aria-pressed={category === c} onClick={() => setCategory(c)}>
                    {t(`categories.${c}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className={styles.primary} onClick={play}>
            {t('play')}
          </button>
          {mode === 'solo' && bestStreak > 0 && <p className={styles.hint}>{t('result.record', { n: bestStreak })}</p>}
        </div>
      </div>
    )
  }

  // ─── Partida ───────────────────────────────────────────────────────────────

  const over = game.status !== 'playing'
  const lives = livesLeft(game)
  const info = game.category ? t('hud.category', { name: t(`categories.${game.category as Category}`) }) : game.clue ? t('hud.clue', { clue: game.clue }) : null

  return (
    <div className={styles.game}>
      <div className={styles.topBar}>
        {info ? <span className={styles.info}>{info}</span> : <span />}
        <span className={`${styles.lives} ${lives <= 2 && !over ? styles.livesLow : ''}`} aria-label={`${t('hud.lives')}: ${lives}`}>
          <span className={styles.heart} />
          {lives}/{game.maxErrors}
        </span>
      </div>

      <Drawing stages={stagesShown(game)} status={game.status} />

      <Word ref={wordRef} slots={slots(game)} lost={game.status === 'lost'} hits={game.hits} normalize={normalizeLetter} />

      {over ? (
        <div className={`${styles.result} ${game.status === 'won' ? styles.resultWon : styles.resultLost}`}>
          <h2 className={styles.resultTitle}>{t(game.status === 'won' ? 'result.won' : 'result.lost')}</h2>
          {game.status === 'lost' && (
            <p className={styles.hint}>
              {t('result.word')} <strong className={styles.reveal}>{game.word}</strong>
            </p>
          )}
          {mode === 'solo' && result && (
            <p className={styles.streak}>
              🔥 {t('result.streak', { n: result.streak })}
              {result.isRecord && <span className={styles.newRecord}> · {t('result.newRecord')}</span>}
            </p>
          )}
          <div className={styles.resultActions}>
            <button className={styles.primary} onClick={play}>
              {t('result.next')}
            </button>
            <button className={styles.ghost} onClick={() => setPhase('menu')}>
              {t('result.menu')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.actions}>
            {mode === 'solo' && <span className={styles.streakSmall}>🔥 {streak}</span>}
            <button className={styles.hintBtn} onClick={onHint} disabled={!canHint(game)} title={t('hud.hintCost')} aria-label={`${t('hud.hint')}: ${t('hud.hintCost')}`}>
              💡 {t('hud.hint')}
            </button>
          </div>
          <Keyboard rows={KEYBOARDS[roundLang]} hits={game.hits} misses={game.misses} disabled={over} onLetter={onLetter} />
        </>
      )}
    </div>
  )
}
