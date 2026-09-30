import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Toggle } from '@base-ui/react/toggle'
import { cn } from '../../lib/cn'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  label
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
  label?: string
}): React.JSX.Element {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(values) => {
        const next = values[0]
        if (next !== undefined) onChange(next as T)
      }}
      className={cn(
        'inline-flex shrink-0 items-center rounded-[var(--r-md)] border border-line bg-sunken p-0.5',
        className
      )}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className={cn(
            'relative inline-flex h-7 items-center rounded-[var(--r-sm)] border border-transparent px-3',
            'text-[12px] font-medium text-muted transition-[background-color,color,border-color]',
            'duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)] hover:text-ink',
            'data-[pressed]:border-line data-[pressed]:bg-surface data-[pressed]:text-ink',
            'data-[pressed]:shadow-[0_1px_2px_rgb(0_0_0/0.05)]'
          )}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
