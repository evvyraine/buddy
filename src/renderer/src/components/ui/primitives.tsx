import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent-fill text-accent-contrast border border-transparent hover:brightness-[1.08] disabled:opacity-45',
  secondary:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-elevated disabled:opacity-45',
  ghost: 'bg-transparent text-muted border border-transparent hover:bg-sunken hover:text-ink',
  danger:
    'bg-transparent text-[var(--err-fg)] border border-line hover:border-[color-mix(in_oklab,var(--err-fg)_45%,var(--line))] hover:bg-[var(--err-bg)]'
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-[var(--r-sm)]',
  md: 'h-9 px-3.5 text-[13px] gap-2 rounded-[var(--r-md)]'
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  trailing?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  trailing,
  className,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
        'transition-[background-color,border-color,color,scale,filter] duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)]',
        'active:scale-[0.96] disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {icon ? <span className="grid shrink-0 place-items-center [&>svg]:block">{icon}</span> : null}
      {children}
      {trailing ? (
        <span className="grid shrink-0 place-items-center [&>svg]:block">{trailing}</span>
      ) : null}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }): React.JSX.Element {
  return (
    <button
      {...props}
      aria-label={label}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-md)] border border-transparent text-muted',
        'transition-[background-color,color,scale] duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)]',
        'hover:bg-sunken hover:text-ink active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100',
        '[&>svg]:block',
        className
      )}
    >
      {children}
    </button>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }): React.JSX.Element {
  return (
    <kbd
      className={cn(
        'mono inline-flex h-6 min-w-6 items-center justify-center rounded-[5px] border border-line bg-sunken',
        'px-1.5 text-[11px] leading-none whitespace-nowrap text-muted',
        className
      )}
    >
      {children}
    </kbd>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'quiet'
  className?: string
}): React.JSX.Element {
  const tones = {
    neutral: 'border-line bg-surface text-muted',
    accent: 'border-transparent bg-accent-soft text-accent-text',
    quiet: 'border-transparent bg-sunken text-faint'
  }
  return (
    <span
      className={cn(
        'mono inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] leading-none',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function SectionLabel({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className={cn('mono text-[10.5px] tracking-[0.16em] text-faint uppercase', className)}>
      {children}
    </div>
  )
}

export function Card({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className={cn('rounded-[var(--r-lg)] border border-line bg-surface', className)}>{children}</div>
  )
}
