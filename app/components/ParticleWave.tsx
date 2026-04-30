'use client'
import { useEffect, useRef } from 'react'

/**
 * Faithful recreation of SR7 tp-particlewave WebGL canvas animation.
 * Template canvas: 1254×891px, z-index 2, transparent background
 * Small cream-coloured dots flowing in sinusoidal wave rows.
 */
export default function ParticleWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // SR7 particlewave visual parameters
    const ROWS       = 22     // wave rows
    const COLS       = 60     // particles per row
    const BASE_R     = 1.1    // dot radius px
    const BASE_ALPHA = 0.18   // peak opacity
    const WAVE_AMP   = 28     // sine amplitude px
    const WAVE_FREQ  = 0.012  // spatial frequency
    const FLOW_SPEED = 0.008  // animation speed
    const ROW_PHASE  = 0.55   // phase shift between rows
    const Y_SPREAD   = 0.72   // rows fill this fraction of canvas height

    const getRowY = (H: number) => {
      const s = H * (1 - Y_SPREAD) / 2
      const e = H - s
      return Array.from({ length: ROWS }, (_, i) => s + (e - s) * i / (ROWS - 1))
    }

    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      const rowY = getRowY(H)
      const dx   = W / (COLS - 1)

      for (let r = 0; r < ROWS; r++) {
        const baseY = rowY[r]
        const phase = r * ROW_PHASE
        // depth: rows near vertical centre brighter
        const depth = 0.35 + 0.65 * Math.sin(Math.PI * r / (ROWS - 1))

        for (let c = 0; c < COLS; c++) {
          const x = c * dx
          const y = baseY + Math.sin(x * WAVE_FREQ + t + phase) * WAVE_AMP
          const a = BASE_ALPHA * depth *
                    (0.5 + 0.5 * Math.sin(x * WAVE_FREQ * 0.6 - t * 1.4 + phase))

          ctx.beginPath()
          ctx.arc(x, y, BASE_R, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(239,215,202,${Math.max(0.015, a)})`
          ctx.fill()
        }
      }

      t += FLOW_SPEED
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    />
  )
}
