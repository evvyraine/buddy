import type { ReactNode } from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { cn } from '../../lib/cn'

export function Tabs({
  value,
  onValueChange,
  className,
  children
}: {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <BaseTabs.Root
      value={value}
      onValueChange={(next) => onValueChange(next as string)}
      className={cn('flex min-h-0 flex-1 flex-col', className)}
    >
      {children}
    </BaseTabs.Root>
  )
}

export function TabList({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <BaseTabs.List
      className={cn(
        'relative flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line px-4 sm:px-6',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {children}
    </BaseTabs.List>
  )
}

export function Tab({
  value,
  icon,
  children,
  className
}: {
  value: string
  icon: ReactNode
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <BaseTabs.Tab
      value={value}
      className={cn(
        'group relative inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--r-sm)] px-3',
        'text-[13px] font-medium whitespace-nowrap text-muted transition-colors duration-[var(--dur-quick)]',
        '[transition-timing-function:var(--ease-out)] hover:text-ink data-[active]:text-ink',
        className
      )}
    >
      <span className="shrink-0 transition-colors duration-[var(--dur-quick)] group-data-[active]:text-accent-text [&>svg]:block">
        {icon}
      </span>
      {children}
    </BaseTabs.Tab>
  )
}

export function TabIndicator({ className }: { className?: string }): React.JSX.Element {
  return (
    <BaseTabs.Indicator
      className={cn(
        'absolute -bottom-px left-0 h-[2px] rounded-full bg-accent',
        'transition-[translate,width] duration-[var(--dur-medium)] [transition-timing-function:var(--ease-out)]',
        className
      )}
      style={{ width: 'var(--active-tab-width)', translate: 'var(--active-tab-left) 0' }}
    />
  )
}

export function TabPanel({
  value,
  children,
  className
}: {
  value: string
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <BaseTabs.Panel
      value={value}
      className={cn(
        'min-h-0 flex-1 overflow-y-auto outline-none',
        'transition-[opacity,translate] duration-[var(--dur-fast)] [transition-timing-function:var(--ease-out)]',
        'data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0',
        'data-[ending-style]:opacity-0',
        className
      )}
    >
      {children}
    </BaseTabs.Panel>
  )
}
