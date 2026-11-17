import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { withAlpha } from '@core/theme'
import { useTranslation } from 'react-i18next'
import type { Direction, SnakeState } from '../logic'
import type { Phase } from '../useSnakeGame'
import styles from '../Snake.module.css'

interface Props {
  stateRef: RefObject<SnakeState>
  phase: Phase
  onSwipe: (dir: Direction) => void
  children?: ReactNode
}

const SWIPE_PX = 22

interface Palette {
  pixel: string
  snake: string
  food: string
  dead: string
}

function readPalette(el: Element): Palette {
  const css = getComputedStyle(el)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return { pixel: withAlpha(v('--text'), 0.045), snake: v('--o'), food: v('--x'), dead: v('--x') }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, r)
  ctx.fill()
}

/** Dibuja el tablero con aspecto de pantalla LCD: cada casilla es un "píxel". */
function draw(ctx: CanvasRenderingContext2D, px: number, state: SnakeState, phase: Phase, palette: Palette, now: number) {
  const { cols, rows } = state.config
  const cell = px / cols
  const gap = cell * 0.12
  const size = cell - gap
  const radius = size * 0.22
  const at = (n: number) => n * cell + gap / 2

  ctx.clearRect(0, 0, px, px)

  // Píxeles apagados de la pantalla
  ctx.fillStyle = palette.pixel
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) roundRect(ctx, at(x), at(y), size, radius)

  // Comida con un pulso suave
  if (state.food) {
    const pulse = phase === 'playing' ? 0.82 + 0.18 * Math.sin(now / 160) : 0.9
    const s = size * pulse
    const offset = (size - s) / 2
    ctx.fillStyle = palette.food
    roundRect(ctx, at(state.food.x) + offset, at(state.food.y) + offset, s, s / 2)
  }

  // Serpiente: la cabeza más brillante y el cuerpo se va apagando hacia la cola
  const dead = phase === 'over'
  const n = state.snake.length
  state.snake.forEach((p, i) => {
    ctx.globalAlpha = i === 0 ? 1 : 0.92 - (i / Math.max(n, 1)) * 0.4
    ctx.fillStyle = dead && i === 0 ? palette.dead : palette.snake
    roundRect(ctx, at(p.x), at(p.y), size, radius)
  })
  ctx.globalAlpha = 1
}

export function Board({ stateRef, phase, onSwipe, children }: Props) {
  const { t } = useTranslation('snake')
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Ajuste a la pantalla (nítido en pantallas retina) + bucle de dibujo
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return

    const palette = readPalette(wrap)
    let px = 0
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      px = wrap.clientWidth * dpr
      canvas.width = canvas.height = px
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let raf = 0
    const loop = (now: number) => {
      draw(ctx, px, stateRef.current, phaseRef.current, palette, now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [stateRef])

  // Gestos: deslizar sobre el tablero. Se puede encadenar sin levantar el dedo.
  const origin = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    origin.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const o = origin.current
    if (!o) return
    const dx = e.clientX - o.x
    const dy = e.clientY - o.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return
    onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
    origin.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerEnd = () => {
    origin.current = null
  }

  return (
    <div
      ref={wrapRef}
      className={styles.board}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t('board.label')} />
      {children}
    </div>
  )
}
