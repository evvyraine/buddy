import type { CSSProperties } from 'react'
import markSvg from '../assets/brand/logo-mark.svg?raw'
import { cn } from '../lib/cn'

/** The buddy face alone, monochrome and inheriting `color`. */
const FACE_ASPECT = 1102 / 424
const BRAND_PINK = '#e34c80'
const BRAND_INK = '#0e0d0c'

export function LogoMark({
  className,
  style
}: {
  className?: string
  style?: CSSProperties
}): React.JSX.Element {
  return (
    <span
      className={cn('inline-flex [&>svg]:block [&>svg]:h-full [&>svg]:w-full', className)}
      style={style}
      dangerouslySetInnerHTML={{ __html: markSvg }}
    />
  )
}

/** Square app-badge: the mark on the brand pink plate. Used in the title bar. */
export function Logo({
  size = 22,
  className
}: {
  size?: number
  className?: string
}): React.JSX.Element {
  const faceWidth = size * 0.62
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        background: BRAND_PINK
      }}
    >
      <LogoMark style={{ width: faceWidth, height: faceWidth / FACE_ASPECT, color: BRAND_INK }} />
    </span>
  )
}

/** The full pill lock-up from the brand artwork. */
export function LogoPill({
  height = 40,
  className
}: {
  height?: number
  className?: string
}): React.JSX.Element {
  const faceHeight = height * 0.34
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center', className)}
      style={{
        height,
        paddingInline: height * 0.42,
        borderRadius: 9999,
        background: BRAND_PINK
      }}
    >
      <LogoMark
        style={{ height: faceHeight, width: faceHeight * FACE_ASPECT, color: BRAND_INK }}
      />
    </span>
  )
}
