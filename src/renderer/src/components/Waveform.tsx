import { useEffect, useRef } from 'react'

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export function Waveform({
  level,
  active,
  bars = 56,
  height = 72,
  gap = 3,
  className
}: {
  level: number
  active: boolean
  bars?: number
  height?: number
  gap?: number
  className?: string
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const targetRef = useRef<number[]>(new Array(bars).fill(0))
  const shownRef = useRef<number[]>(new Array(bars).fill(0))
  const colorRef = useRef('#e8558f')

  useEffect(() => {
    const target = targetRef.current
    if (target.length !== bars) {
      targetRef.current = new Array(bars).fill(0)
      shownRef.current = new Array(bars).fill(0)
    }
    const buffer = targetRef.current
    buffer.shift()
    buffer.push(active ? Math.max(0.02, Math.min(1, level)) : 0)
  }, [level, active, bars])

  useEffect(() => {
    if (!active) {
      targetRef.current = new Array(bars).fill(0)
    }
  }, [active, bars])

  useEffect(() => {
    const readColor = (): void => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-current')
        .trim()
      colorRef.current = value || '#e8558f'
    }
    readColor()
    const observer = new MutationObserver(readColor)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-accent']
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0

    const draw = (): void => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const n = targetRef.current.length
      const bw = Math.max(1.5, (w - gap * (n - 1)) / n)
      const mid = h / 2
      const shown = shownRef.current
      const target = targetRef.current

      for (let i = 0; i < n; i++) {
        shown[i] += (target[i] - shown[i]) * 0.22
        const value = Math.min(1, shown[i])
        const barHeight = Math.max(2, value * (h - 6))
        const x = i * (bw + gap)
        ctx.globalAlpha = 0.16 + 0.84 * value
        ctx.fillStyle = colorRef.current
        roundRect(ctx, x, mid - barHeight / 2, bw, barHeight, Math.min(bw / 2, 3))
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [gap])

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height }} />
}
