import { Select as BaseSelect } from '@base-ui/react/select'
import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react'
import { cn } from '../../lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export function Select({
  value,
  onValueChange,
  options,
  className,
  disabled
}: {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  className?: string
  disabled?: boolean
}): React.JSX.Element {
  return (
    <BaseSelect.Root
      items={options}
      value={value}
      onValueChange={(next) => onValueChange(next as string)}
      disabled={disabled}
    >
      <BaseSelect.Trigger
        className={cn(
          'group flex h-9 w-full items-center gap-2 rounded-[var(--r-md)] border border-line bg-surface px-3',
          'text-left text-[13px] text-ink transition-[border-color,background-color] duration-[var(--dur-quick)]',
          '[transition-timing-function:var(--ease-out)] hover:border-line-strong',
          'focus-visible:border-accent data-[popup-open]:border-accent data-[disabled]:opacity-50',
          className
        )}
      >
        <BaseSelect.Value className="min-w-0 flex-1 truncate" />
        <BaseSelect.Icon className="shrink-0 text-faint transition-transform duration-[var(--dur-quick)] group-data-[popup-open]:rotate-180">
          <RiArrowDownSLine size={16} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50">
          <BaseSelect.Popup
            className={cn(
              'max-h-[min(320px,var(--available-height))] min-w-[var(--anchor-width)] origin-[var(--transform-origin)]',
              'overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface p-1',
              'shadow-[0_18px_44px_-22px_rgb(0_0_0/0.45)]',
              'transition-[opacity,transform] duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)]',
              'data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0'
            )}
          >
            <BaseSelect.List className="max-h-[inherit] overflow-y-auto overscroll-contain py-0.5">
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex cursor-default items-center gap-2 rounded-[var(--r-sm)] py-1.5 pr-2 pl-8',
                    'text-[13px] text-ink select-none outline-none',
                    'data-[highlighted]:bg-accent-soft data-[selected]:font-medium'
                  )}
                >
                  <BaseSelect.ItemIndicator className="absolute left-2.5 grid place-items-center text-accent-text">
                    <RiCheckLine size={14} />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className="min-w-0 truncate">{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}
