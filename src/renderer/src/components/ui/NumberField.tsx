import { NumberField as BaseNumberField } from '@base-ui/react/number-field'
import { RiAddLine, RiSubtractLine } from '@remixicon/react'
import { cn } from '../../lib/cn'

export function NumberField({
  value,
  onChange,
  suffix,
  min,
  max,
  step = 1
}: {
  value: number
  onChange: (value: number) => void
  suffix?: string
  min?: number
  max?: number
  step?: number
}): React.JSX.Element {
  return (
    <BaseNumberField.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(next) => {
        if (typeof next === 'number') onChange(next)
      }}
      className="flex items-center gap-2"
    >
      <BaseNumberField.Group
        className={cn(
          'flex h-9 items-center overflow-hidden rounded-[var(--r-md)] border border-line bg-surface',
          'transition-colors duration-[var(--dur-quick)] focus-within:border-accent'
        )}
      >
        <BaseNumberField.Decrement
          aria-label="Decrease"
          className="grid h-full w-8 shrink-0 place-items-center text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40 [&>svg]:block"
        >
          <RiSubtractLine size={14} />
        </BaseNumberField.Decrement>
        <BaseNumberField.Input className="w-[68px] shrink-0 bg-transparent text-center font-mono text-[12.5px] text-ink outline-none" />
        <BaseNumberField.Increment
          aria-label="Increase"
          className="grid h-full w-8 shrink-0 place-items-center text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40 [&>svg]:block"
        >
          <RiAddLine size={14} />
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
      {suffix ? <span className="mono text-[11.5px] whitespace-nowrap text-faint">{suffix}</span> : null}
    </BaseNumberField.Root>
  )
}
