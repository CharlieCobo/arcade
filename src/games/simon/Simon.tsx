import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { vibrate } from '@core/lib/haptics'
import { useLocalStorage } from '@core/lib/useLocalStorage'
import { PAD_COLORS, PAD_KEYS } from './colors'
import { LIVES, PADS, currentRound, roundsCompleted, type Difficulty, type Mode, type Pad } from './logic'
import { useSimonScores } from './scores'
import { MILESTONE_EVERY, useSimon } from './useSimon'
import styles from './Simon.module.css'

const KEYS: Record<string, Pad> = { q: 0, w: 1, a: 2, s: 3, '1': 0, '2': 1, '3': 2, '4': 3 }
const MODES: Mode[] = ['classic', 'reverse']
const DIFFICULTIES: Difficulty[] = ['relaxed', 'strict']

export default function Simon() {
  const { t } = useTranslation('simon')
  const [storedMode, setMode] = useLocalStorage<Mode>('simon:mode', 'classic')
  const [storedDifficulty, setDifficulty] = useLocalStorage<Difficulty>('simon:difficulty', 'strict')
  const [sound, setSound] = useLocalStorage<boolean>('simon:sound', true)
  const mode = MODES.includes(storedMode) ? storedMode : 'classic'
  const difficulty = DIFFICULTIES.includes(storedDifficulty) ? storedDifficulty : 'strict'
  const { best, submit } = useSimonScores(mode)
  const [result, setResult] = useState<{ rounds: number; isRecord: boolean } | null>(null)

  const simon = useSimon({
    mode,
    difficulty,
    sound,
    onPress: (r) => {
      if (r === 'wrong' || r === 'gameOver') vibrate([60, 40, 60])
      else if (r === 'roundComplete') vibrate([12, 40, 12])
      else if (r === 'correct') vibrate(8)
    },
    onEnd: (s) => {
      const rounds = roundsCompleted(s)
      const { isRecord } = submit(rounds, difficulty)
      setResult({ rounds, isRecord })
      if (isRecord) vibrate([40, 60, 40, 60, 120])
    },
  })
  const { phase, game, lit, message, start, toReady, pressPad } = simon

  const play = () => {
    setResult(null)
    start()
  }

  // Luces de "reposo" girando mientras se eligen las opciones
  const [idle, setIdle] = useState<Pad>(0)
  useEffect(() => {
    if (phase !== 'ready') return
    const order: Pad[] = [0, 1, 3, 2]
    let i = 0
    const id = window.setInterval(() => setIdle(order[++i % 4]!), 420)
    return () => window.clearInterval(id)
  }, [phase])

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const pad = KEYS[e.key.toLowerCase()]
      if (pad === undefined) return
      e.preventDefault()
      pressPad(pad)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const myTurn = phase === 'playing' && game.status === 'input'
  const shownLit = phase === 'ready' ? idle : lit
  const statusText =
    message === 'milestone'
      ? t('status.milestone', { n: roundsCompleted(game) })
      : message === 'yourTurn'
        ? t(mode === 'reverse' ? 'status.reverseTurn' : 'status.yourTurn')
        : message
          ? t(`status.${message}`)
          : ''

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('hud.round')}</span>
          <span key={currentRound(game)} className={`${styles.statValue} ${styles.pulse}`}>
            {phase === 'ready' ? '–' : currentRound(game)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('hud.best')}</span>
          <span className={styles.statValue}>{best}</span>
        </div>
        {difficulty === 'relaxed' ? (
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t('hud.lives')}</span>
            <span className={styles.hearts}>
              {Array.from({ length: LIVES.relaxed }, (_, i) => (
                <span key={i} className={`${styles.heart} ${i < game.lives ? '' : styles.heartEmpty}`} />
              ))}
            </span>
          </div>
        ) : (
          <button
            type="button"
            className={styles.soundBtn}
            onClick={() => setSound(!sound)}
            aria-label={sound ? t('hud.soundOff') : t('hud.soundOn')}
            aria-pressed={sound}
          >
            {sound ? '🔊' : '🔇'}
          </button>
        )}
      </div>

      <div
        className={`${styles.board} ${phase === 'ready' ? styles.idle : ''} ${message === 'wrong' ? styles.wrong : ''} ${myTurn ? styles.turn : ''}`}
        role="group"
        aria-label={t('board.label')}
      >
        {PADS.map((pad) => (
          <button
            key={pad}
            type="button"
            className={`${styles.pad} ${styles[`pad${pad}`]} ${shownLit === pad ? styles.lit : ''}`}
            style={{ '--c': PAD_COLORS[pad] } as CSSProperties}
            aria-label={t('pads.label', { color: t(`pads.${PAD_KEYS[pad]}`) })}
            disabled={!myTurn}
            onPointerDown={(e) => {
              e.preventDefault()
              pressPad(pad)
            }}
            onClick={(e) => {
              if (e.detail === 0) pressPad(pad) // teclado / lector de pantalla
            }}
          />
        ))}
        <div className={styles.hub}>
          {message === 'milestone' && <span key={roundsCompleted(game)} className={styles.burst} aria-hidden="true" />}
          <span key={statusText} className={styles.hubText} aria-live="polite">
            {statusText}
          </span>
          {myTurn && (
            <span className={styles.dots} aria-hidden="true">
              {game.sequence.length <= 12
                ? game.sequence.map((_, i) => <span key={i} className={`${styles.dot} ${i < game.input ? styles.dotOn : ''}`} />)
                : `${game.input}/${game.sequence.length}`}
            </span>
          )}
        </div>
      </div>

      {phase === 'ready' && (
        <div className={styles.panel}>
          <div className={styles.segmented} role="group" aria-label={t('modes.label')}>
            {MODES.map((m) => (
              <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
                {t(`modes.${m}`)}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{t(`modes.${mode}Hint`)}</p>
          <div className={styles.segmented} role="group" aria-label={t('difficulty.label')}>
            {DIFFICULTIES.map((d) => (
              <button key={d} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
                {t(`difficulty.${d}`)}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{t(`difficulty.${difficulty}Hint`)}</p>
          <div className={styles.row}>
            <button className={styles.primary} onClick={play}>
              {t('screens.play')}
            </button>
            {difficulty === 'relaxed' && (
              <button
                type="button"
                className={styles.soundBtn}
                onClick={() => setSound(!sound)}
                aria-label={sound ? t('hud.soundOff') : t('hud.soundOn')}
                aria-pressed={sound}
              >
                {sound ? '🔊' : '🔇'}
              </button>
            )}
          </div>
          <p className={styles.keys}>{t('screens.keys')}</p>
        </div>
      )}

      {phase === 'over' && result && (
        <div className={styles.panel}>
          <h2 className={styles.title}>{t('screens.over')}</h2>
          <p className={styles.hint}>{t('screens.reached', { count: result.rounds })}</p>
          {result.isRecord && <div className={styles.record}>🏆 {t('screens.newRecord')}</div>}
          <div className={styles.row}>
            <button className={styles.primary} onClick={play}>
              {t('screens.playAgain')}
            </button>
            <button className={styles.ghost} onClick={toReady}>
              {t('screens.options')}
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && roundsCompleted(game) > 0 && roundsCompleted(game) % MILESTONE_EVERY === 0 && message === 'milestone' && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ '--i': i, '--c': PAD_COLORS[(i % 4) as Pad] } as CSSProperties} />
          ))}
        </div>
      )}
    </div>
  )
}
