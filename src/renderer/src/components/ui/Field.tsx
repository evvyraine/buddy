import type { InputHTMLAttributes, ReactNode } from 'react'
import { Field as BaseField } from '@base-ui/react/field'
import { Input as BaseInput } from '@base-ui/react/input'
import { cn } from '../../lib/cn'

export const controlClass =
  'w-full h-9 rounded-[var(--r-md)] border border-line bg-surface px-3 text-[13px] text-ink ' +
  'placeholder:text-faint transition-[border-color,background-color,box-shadow] duration-[var(--dur-quick)] ' +
  '[transition-timing-function:var(--ease-out)] hover:border-line-strong ' +
  'focus:border-accent focus-visible:outline-none disabled:opacity-50'

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return <BaseInput {...props} className={cn(controlClass, className)} />
}

export function Field({
  label,
  description,
  error,
  className,
  children
}: {
  label: string
  description?: ReactNode
  error?: string | null
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <BaseField.Root invalid={Boolean(error)} className={cn('flex flex-col gap-2', className)}>
      <BaseField.Label className="mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
        {label}
      </BaseField.Label>
      {children}
      {error ? (
        <BaseField.Error className="swap text-[12px] text-[var(--err-fg)]">{error}</BaseField.Error>
      ) : description ? (
        <BaseField.Description className="text-[12px] leading-snug text-faint">
          {description}
        </BaseField.Description>
      ) : null}
    </BaseField.Root>
  )
}

/** A Field control with the shared input styling. Use inside <Field>. */
export function FieldInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return <BaseField.Control {...props} className={cn(controlClass, className)} />
}
