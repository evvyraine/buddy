import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { cn } from '../../lib/cn'

export function Switch({
  checked,
  onChange,
  label,
  className
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
}): React.JSX.Element {
  return (
    <BaseSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className={cn(
        'group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line bg-sunken',
        'transition-[background-color,border-color] duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)]',
        'hover:border-line-strong data-[checked]:border-transparent data-[checked]:bg-accent-fill',
        className
      )}
    >
      <BaseSwitch.Thumb
        className={cn(
          'block h-[18px] w-[18px] translate-x-[3px] rounded-full border border-line bg-surface',
          'transition-[translate,background-color,border-color] duration-[var(--dur-medium)]',
          '[transition-timing-function:var(--ease-spring)]',
          'group-data-[checked]:translate-x-[23px] group-data-[checked]:border-transparent group-data-[checked]:bg-accent-contrast'
        )}
      />
    </BaseSwitch.Root>
  )
}
