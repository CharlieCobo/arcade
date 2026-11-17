import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  COLS,
  HIDDEN_ROWS,
  PIECE_COLORS,
  ROWS,
  cellsOf,
  ghostOf,
  type BlocksState,
  type PieceType,
} from '../logic'
import type { Phase } from '../useBlocksGame'
import styles from '../Blocks.module.css'

export type Gesture = 'left' | 'right' | 'soft' | 'hard' | 'rotate'

interface Props {
  stateRef: RefObject<BlocksState>
  phase: Phase
  onGesture: (g: Gesture) => void
  children?: ReactNode
}

/** Bloque con aspecto clásico: color de la pieza y un brillo arriba. */
function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1) {
  const r = size * 0.18
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, r)
  ctx.fill()
  ctx.fillStyle = 'rgb(255 255 255 / 0.22)'
  ctx.beginPath()
  ctx.roundRect(x + size * 0.12, y + size * 0.1, size * 0.76, size * 0.18, r / 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, state: BlocksState, phase: Phase) {
  const cell = w / COLS
  const gap = cell * 0.08
  const size = cell - gap
  const at = (n: number) => n * cell + gap / 2

  ctx.clearRect(0, 0, w, h)

  // Píxeles apagados, como en el Snake
  ctx.fillStyle = 'rgb(255 255 255 / 0.035)'
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.beginPath()
      ctx.roundRect(at(x), at(y), size, size, size * 0.18)
      ctx.fill()
    }
  }

  const over = phase === 'over'
  // Piezas ya colocadas
  for (let y = HIDDEN_ROWS; y < ROWS + HIDDEN_ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const type = state.board[y * COLS + x]
      if (type) drawBlock(ctx, at(x), at(y - HIDDEN_ROWS), size, PIECE_COLORS[type], over ? 0.45 : 1)
    }
  }

  if (phase === 'ready' || over || !state.active) return

  // Sombra: dónde caerá la pieza
  const color = PIECE_COLORS[state.active.type]
  const ghost = ghostOf(state)
  if (ghost) {
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.45
    ctx.lineWidth = Math.max(1, cell * 0.06)
    for (const p of cellsOf(ghost)) {
      if (p.y < HIDDEN_ROWS) continue
      ctx.beginPath()
      ctx.roundRect(at(p.x) + ctx.lineWidth / 2, at(p.y - HIDDEN_ROWS) + ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth, size * 0.18)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // Pieza activa
  for (const p of cellsOf(state.active)) {
    if (p.y >= HIDDEN_ROWS) drawBlock(ctx, at(p.x), at(p.y - HIDDEN_ROWS), size, color)
  }
}

const TAP_MS = 220
const TAP_PX = 10

export function Board({ stateRef, phase, onGesture, children }: Props) {
  const { t } = useTranslation('blocks')
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Tamaño nítido en retina + bucle de dibujo
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return
    let w = 0
    let h = 0
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      w = canvas.clientWidth * dpr
      h = canvas.clientHeight * dpr
      canvas.width = w
      canvas.height = h
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    let raf = 0
    const loop = () => {
      draw(ctx, w, h, stateRef.current, phaseRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [stateRef])

  /**
   * Gestos: tocar = girar · deslizar en horizontal = mover una casilla por cada ancho de casilla
   * · arrastrar hacia abajo = bajar · deslizar rápido hacia abajo = soltar del todo.
   */
  const g = useRef<{ x: number; y: number; sx: number; sy: number; t: number; moved: boolean } | null>(null)
  const cellPx = () => (canvasRef.current?.clientWidth ?? 200) / COLS

  const onPointerDown = (e: React.PointerEvent) => {
    if (phaseRef.current !== 'playing') return
    g.current = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current
    if (!s) return
    const step = cellPx()
    while (e.clientX - s.x >= step) {
      onGesture('right')
      s.x += step
      s.moved = true
    }
    while (s.x - e.clientX >= step) {
      onGesture('left')
      s.x -= step
      s.moved = true
    }
    while (e.clientY - s.y >= step) {
      onGesture('soft')
      s.y += step
      s.moved = true
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = g.current
    g.current = null
    if (!s) return
    const dt = performance.now() - s.t
    const dx = e.clientX - s.sx
    const dy = e.clientY - s.sy
    if (!s.moved && dt < TAP_MS && Math.hypot(dx, dy) < TAP_PX) onGesture('rotate')
    else if (dy > cellPx() * 2 && dy / dt > 0.9 && Math.abs(dy) > Math.abs(dx) * 1.5) onGesture('hard')
  }

  return (
    <div
      ref={wrapRef}
      className={styles.board}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (g.current = null)}
    >
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t('board.label')} />
      {children}
    </div>
  )
}

/** Miniatura de una pieza para la vista previa. */
export function PiecePreview({ type }: { type: PieceType }) {
  const cells = cellsOf({ type, rotation: 0, x: 0, y: 0 })
  const minX = Math.min(...cells.map((c) => c.x))
  const minY = Math.min(...cells.map((c) => c.y))
  const w = Math.max(...cells.map((c) => c.x)) - minX + 1
  const h = Math.max(...cells.map((c) => c.y)) - minY + 1
  return (
    <svg className={styles.preview} viewBox={`0 0 ${w * 10} ${h * 10}`} style={{ aspectRatio: `${w} / ${h}`, width: `${w * 9}px` }} aria-hidden="true">
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={(c.x - minX) * 10 + 0.5} y={(c.y - minY) * 10 + 0.5} width={9} height={9} rx={2} fill={PIECE_COLORS[type]} />
      ))}
    </svg>
  )
}
