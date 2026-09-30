import { useEffect } from 'react'
import { Toast as BaseToast } from '@base-ui/react/toast'
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiInformationLine
} from '@remixicon/react'
import type { ToastKind } from '../../../../shared/types'
import { cn } from '../../lib/cn'

const TONE: Record<ToastKind, { bg: string; fg: string; icon: React.JSX.Element }> = {
  success: { bg: 'var(--ok-bg)', fg: 'var(--ok-fg)', icon: <RiCheckboxCircleLine size={16} /> },
  info: { bg: 'var(--info-bg)', fg: 'var(--info-fg)', icon: <RiInformationLine size={16} /> },
  warning: { bg: 'var(--warn-bg)', fg: 'var(--warn-fg)', icon: <RiAlertLine size={16} /> },
  error: { bg: 'var(--err-bg)', fg: 'var(--err-fg)', icon: <RiErrorWarningLine size={16} /> }
}

function ToastList(): React.JSX.Element {
  const { toasts } = BaseToast.useToastManager()
  return (
    <>
      {toasts.map((toast) => {
        const kind = (toast.type as ToastKind) ?? 'info'
        const tone = TONE[kind] ?? TONE.info
        return (
          <BaseToast.Root
            key={toast.id}
            toast={toast}
            className={cn(
              'origin-bottom transition-[opacity,transform] duration-[var(--dur-fast)]',
              '[transition-timing-function:var(--ease-out)]',
              'data-[starting-style]:translate-y-3 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0',
              'data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0'
            )}
          >
            <BaseToast.Content className="flex items-start gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-3 shadow-[0_16px_40px_-20px_rgb(0_0_0/0.4)]">
              <span
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full [&>svg]:block"
                style={{ background: tone.bg, color: tone.fg }}
              >
                {tone.icon}
              </span>
              <div className="min-w-0 flex-1">
                <BaseToast.Title className="text-[13px] font-medium text-ink" />
                <BaseToast.Description className="mt-0.5 block text-[12px] leading-snug text-muted" />
              </div>
              <BaseToast.Close
                aria-label="Dismiss"
                className="-mt-1 -mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-faint transition-colors hover:bg-sunken hover:text-ink [&>svg]:block"
              >
                <RiCloseLine size={14} />
              </BaseToast.Close>
            </BaseToast.Content>
          </BaseToast.Root>
        )
      })}
    </>
  )
}

function ToastBridge(): null {
  const manager = BaseToast.useToastManager()
  useEffect(() => {
    return window.buddy.events.onToast((toast) => {
      manager.add({
        id: toast.id,
        title: toast.title,
        description: toast.body,
        type: toast.kind,
        timeout: 4200
      })
    })
  }, [manager])
  return null
}

export function Toaster(): React.JSX.Element {
  return (
    <BaseToast.Provider>
      <BaseToast.Portal>
        <BaseToast.Viewport className="fixed right-4 bottom-4 z-[90] flex w-[min(360px,calc(100vw-2rem))] flex-col-reverse gap-2.5 max-md:right-3 max-md:bottom-20 max-md:left-3 max-md:w-auto">
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
      <ToastBridge />
    </BaseToast.Provider>
  )
}
