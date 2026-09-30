import type { ReactNode } from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'
import { cn } from '../../lib/cn'

export interface MenuAction {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

export function ActionMenu({
  trigger,
  actions,
  label,
  align = 'end'
}: {
  trigger: ReactNode
  actions: MenuAction[]
  label: string
  align?: 'start' | 'end' | 'center'
}): React.JSX.Element {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger
        aria-label={label}
        render={trigger as React.ReactElement}
        className="outline-none"
      />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={6} align={align} className="z-[60]">
          <BaseMenu.Popup
            className={cn(
              'min-w-[190px] origin-[var(--transform-origin)] rounded-[var(--r-lg)] border border-line bg-surface p-1',
              'shadow-[0_18px_44px_-22px_rgb(0_0_0/0.45)]',
              'transition-[opacity,transform] duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)]',
              'data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0'
            )}
          >
            {actions.map((action) => (
              <BaseMenu.Item
                key={action.label}
                disabled={action.disabled}
                onClick={action.onSelect}
                className={cn(
                  'flex cursor-default items-center gap-2.5 rounded-[var(--r-sm)] px-2 py-1.5 text-[13px]',
                  'select-none outline-none data-[highlighted]:bg-accent-soft data-[disabled]:opacity-40',
                  action.danger
                    ? 'text-[var(--err-fg)] data-[highlighted]:bg-[var(--err-bg)]'
                    : 'text-ink'
                )}
              >
                {action.icon ? (
                  <span className="grid shrink-0 place-items-center [&>svg]:block">{action.icon}</span>
                ) : null}
                {action.label}
              </BaseMenu.Item>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  )
}
