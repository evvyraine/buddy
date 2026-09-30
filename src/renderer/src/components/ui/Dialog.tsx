import type { ReactNode } from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { Button } from './primitives'
import { cn } from '../../lib/cn'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element {
  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className={cn(
            'fixed inset-0 z-40 bg-[rgb(12_10_9/0.42)] backdrop-blur-[2px]',
            'transition-opacity duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)]',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0'
          )}
        />
        <BaseDialog.Viewport className="fixed inset-0 z-50 grid place-items-center p-4">
          <BaseDialog.Popup
            className={cn(
              'w-full max-w-[420px] origin-[var(--transform-origin)] rounded-[var(--r-xl)] border border-line bg-surface p-6',
              'shadow-[0_24px_60px_-24px_rgb(0_0_0/0.5)]',
              'transition-[opacity,transform] duration-[var(--dur-fast)] [transition-timing-function:var(--ease-out)]',
              'data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0'
            )}
          >
            <BaseDialog.Title className="font-mono text-[15px] font-medium tracking-tight text-ink">
              {title}
            </BaseDialog.Title>
            {description ? (
              <BaseDialog.Description className="mt-2 text-[13px] leading-relaxed text-muted">
                {description}
              </BaseDialog.Description>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" autoFocus onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button variant={tone === 'danger' ? 'secondary' : 'primary'} className={tone === 'danger' ? '!text-[var(--err-fg)]' : ''} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}
