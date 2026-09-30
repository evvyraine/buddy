import type { ReactElement, ReactNode } from 'react'
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { cn } from '../../lib/cn'

export function TooltipProvider({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <BaseTooltip.Provider delay={350} closeDelay={80}>
      {children}
    </BaseTooltip.Provider>
  )
}

export function Tooltip({
  label,
  side = 'right',
  children
}: {
  label: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactElement
}): React.JSX.Element {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={8} className="z-[80]">
          <BaseTooltip.Popup
            className={cn(
              'mono origin-[var(--transform-origin)] rounded-[var(--r-sm)] border border-line bg-surface',
              'px-2 py-1 text-[11px] whitespace-nowrap text-ink shadow-[0_10px_26px_-14px_rgb(0_0_0/0.45)]',
              'transition-[opacity,transform] duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)]',
              'data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0'
            )}
          >
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
